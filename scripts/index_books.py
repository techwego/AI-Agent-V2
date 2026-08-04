import os
import sys
import hashlib
import time
import pickle
import json
import chromadb
import pandas as pd
from fastembed import TextEmbedding
from rank_bm25 import BM25Okapi

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(PROJECT_ROOT)

from backend.config import Config
BASE_DIR = PROJECT_ROOT
DATA_DIR = Config.DATA_DIR
CHROMA_DIR = Config.PERSIST_DIR
os.environ["OPENAI_API_KEY"] = "dummy_key_for_local_db_generation"

from backend.rag.engine import TokenChunker
from backend.ingestion.parser import parse_file
import backend.database as database

def compute_sha256(filepath):
    sha256_hash = hashlib.sha256()
    with open(filepath, "rb") as f:
        for byte_block in iter(lambda: f.read(4096), b""):
            sha256_hash.update(byte_block)
    return sha256_hash.hexdigest()

def main():
    print(f"Data directory: {DATA_DIR}")
    
    # Initialize DB schema if not exists
    database.init_db()
    
    chroma_client = chromadb.PersistentClient(path=CHROMA_DIR)
    collection = chroma_client.get_or_create_collection(
        "library_data_v2",
        metadata={"hnsw:space": "cosine"},
    )
    
    embed_model = TextEmbedding(Config.EMBEDDING_MODEL, threads=1)
    
    new_texts = []
    new_metas = []
    new_ids = []
    
    doc_chunk_map = {} # document_id -> list of chunk_ids
    
    for filename in sorted(os.listdir(DATA_DIR)):
        if filename.startswith("~$") or "temp" in filename or filename.endswith("_parsed.json"):
            continue
            
        filepath = os.path.join(DATA_DIR, filename)
        if not os.path.isfile(filepath):
            continue
            
        print(f"Processing: {filename}")
        file_hash = compute_sha256(filepath)
        
        # Check database for existing document with same hash
        doc_record = database.get_document_by_filename(filename)
        if doc_record and doc_record.get('sha256_hash') == file_hash and doc_record.get('status') == 'Success':
            print(f"  -> Skipping {filename}, unchanged.")
            continue
            
        # File is new or changed.
        doc_ext = filename.split('.')[-1].lower() if '.' in filename else "unknown"
        doc_id = database.upsert_document(filename, doc_ext, "Processing", file_hash, "Parsing...")
        
        # If it's an update, delete old chunks from Chroma and the DB
        if doc_record:
            old_chunks = database.get_document_chunks(doc_id)
            if old_chunks:
                print(f"  -> Deleting {len(old_chunks)} old chunks for {filename} from ChromaDB")
                collection.delete(ids=old_chunks)
            database.clear_document_chunks(doc_id)
            
        # Parse into normalized chunks
        try:
            chunks = parse_file(filepath)
            
            # Further chunking for large text blocks if necessary
            chunker = TokenChunker(target_tokens=512, overlap_tokens=80)
            final_chunks = []
            
            for i, chunk in enumerate(chunks):
                text = chunk["text"]
                meta = chunk["metadata"]
                
                # If text is too long (mostly for PDFs/TXT), token chunk it
                if len(text.split()) > 400:
                    sub_chunks = chunker.chunk(text, meta)
                    for j, sub in enumerate(sub_chunks):
                        final_chunks.append({
                            "id": f"doc_{doc_id}_{i}_{j}",
                            "text": sub["text"],
                            "metadata": sub["metadata"]
                        })
                else:
                    final_chunks.append({
                        "id": f"doc_{doc_id}_{i}",
                        "text": text,
                        "metadata": meta
                    })
                    
            print(f"  -> Generated {len(final_chunks)} chunks.")
            
            # Save the parsed chunks to a JSON file as per user requirement
            json_out_path = os.path.join(DATA_DIR, f"{filename}_parsed.json")
            try:
                with open(json_out_path, "w", encoding="utf-8") as f:
                    json.dump(final_chunks, f, indent=2)
                print(f"  -> Saved parsed JSON to {json_out_path}")
            except Exception as e:
                print(f"  -> Warning: failed to save JSON: {e}")
            
            doc_chunk_map[doc_id] = []
            for c in final_chunks:
                new_texts.append(c["text"])
                new_metas.append(c["metadata"])
                new_ids.append(c["id"])
                doc_chunk_map[doc_id].append(c["id"])
                
        except Exception as e:
            print(f"Failed to process {filename}: {e}")
            database.upsert_document(filename, doc_ext, "Failed", file_hash, str(e))
            continue
            
    total_new = len(new_texts)
    print(f"New chunks to embed: {total_new}")
    
    if total_new > 0:
        print("Starting batch embedding...")
        embed_batch_size = 64
        embeddings = []
        
        for i in range(0, total_new, embed_batch_size):
            batch_texts = new_texts[i:i+embed_batch_size]
            batch_embs = list(embed_model.embed(batch_texts, batch_size=16))
            embeddings.extend([emb.tolist() for emb in batch_embs])
            print(f"  Embedded {len(embeddings)}/{total_new} chunks...", flush=True)

        print("Adding chunks to ChromaDB collection...", flush=True)
        batch_size = 500
        for i in range(0, total_new, batch_size):
            end = min(i + batch_size, total_new)
            collection.add(
                ids=new_ids[i:end],
                embeddings=embeddings[i:end],
                documents=new_texts[i:end],
                metadatas=new_metas[i:end],
            )
            print(f"  Stored batch {i//batch_size + 1}/{(total_new-1)//batch_size + 1}", flush=True)
            
        # Save chunks to DB and update document status
        for doc_id, c_ids in doc_chunk_map.items():
            database.save_document_chunks(doc_id, c_ids)
            database.update_document_status(doc_id, "Success", "Indexed successfully")
            
    print("Rebuilding BM25 cache...")
    all_results = collection.get(include=["documents", "metadatas"])
    all_ids = all_results["ids"]
    all_docs = all_results["documents"]
    all_metas = all_results["metadatas"]
    
    tokenized = [doc.lower().split() for doc in all_docs]
    bm25_index = BM25Okapi(tokenized)
    bm25_doc_map = [
        {"id": id_, "text": doc, "metadata": meta}
        for id_, doc, meta in zip(all_ids, all_docs, all_metas)
    ]
    
    cache_path = os.path.join(CHROMA_DIR, "bm25_cache.pkl")
    with open(cache_path, "wb") as f:
        pickle.dump({
            "count": len(all_ids),
            "index": bm25_index,
            "doc_map": bm25_doc_map
        }, f)
        
    print(f"Successfully cached BM25 index with {len(all_ids)} chunks.")
    print("Indexing complete! The database is ready for production.")

if __name__ == "__main__":
    main()
