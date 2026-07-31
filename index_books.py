import os
import sys
import hashlib
import time
import pickle
import chromadb
import pandas as pd
from fastembed import TextEmbedding
from rank_bm25 import BM25Okapi

# Set paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
CHROMA_DIR = os.path.join(BASE_DIR, "chroma_db")
os.environ["OPENAI_API_KEY"] = "dummy_key_for_local_db_generation"

sys.path.append(os.path.join(BASE_DIR, "backend"))
from backend.config import Config
from backend.rag.engine import DocumentReader, TokenChunker

def format_book_chunk(row):
    """Format a single CSV row into a dense semantic block."""
    title = str(row.get('Title', '')).strip()
    author = str(row.get('Author', '')).strip()
    subject = str(row.get('Subject', '')).strip()
    call_num = str(row.get('Call Number', '')).strip()
    location = str(row.get('Location', '')).strip()
    copies = str(row.get('Copies', '1')).strip()
    
    text = f"Title: {title}\n"
    if author and author != 'nan': text += f"Author: {author}\n"
    if subject and subject != 'nan': text += f"Category: {subject}\n"
    if call_num and call_num != 'nan': text += f"Call Number: {call_num}\n"
    if location and location != 'nan': text += f"Location: {location}\n"
    if copies and copies != 'nan': text += f"Available Copies: {copies}\n"
    
    meta = {
        "title": title,
        "author": author,
        "category": subject,
        "call_number": call_num,
        "location": location,
        "copies": copies,
        "document_type": "csv",
        "section": "book_record"
    }
    return text, meta

def main():
    print(f"Data directory: {DATA_DIR}")
    print(f"Chroma directory: {CHROMA_DIR}")
    
    chroma_client = chromadb.PersistentClient(path=CHROMA_DIR)
    collection = chroma_client.get_or_create_collection(
        "library_data_v2",
        metadata={"hnsw:space": "cosine"},
    )
    
    existing_ids = set(collection.get(include=[])["ids"])
    print(f"Existing chunks in DB: {len(existing_ids)}")
    
    embed_model = TextEmbedding(Config.EMBEDDING_MODEL, threads=1)
    chunker = TokenChunker(target_tokens=512, overlap_tokens=80)
    
    new_texts = []
    new_metas = []
    new_ids = []
    
    for filename in sorted(os.listdir(DATA_DIR)):
        if filename.startswith("~$") or "temp" in filename:
            continue
            
        filepath = os.path.join(DATA_DIR, filename)
        if not os.path.isfile(filepath):
            continue
            
        print(f"Processing: {filename}")
        
        if filename.endswith(".csv"):
            try:
                df = pd.read_csv(filepath)
                for idx, row in df.iterrows():
                    text, meta = format_book_chunk(row)
                    # Unique ID based on hash of text
                    content_hash = hashlib.md5(text.encode()).hexdigest()[:16]
                    doc_id = f"book_{idx}_{content_hash}"
                    
                    if doc_id not in existing_ids:
                        new_texts.append(text)
                        new_metas.append(meta)
                        new_ids.append(doc_id)
            except Exception as e:
                print(f"Failed to process CSV {filename}: {e}")
        else:
            # Process PDFs, DOCX, TXT
            try:
                doc_pages = DocumentReader.read(filepath)
                for page_data in doc_pages:
                    chunks = chunker.chunk(page_data["text"], page_data["metadata"])
                    for i, chunk in enumerate(chunks):
                        content_hash = hashlib.md5(chunk["text"].encode()).hexdigest()[:16]
                        doc_id = f"doc_{filename}_{i}_{content_hash}"
                        
                        if doc_id not in existing_ids:
                            meta = {}
                            for k, v in chunk["metadata"].items():
                                if v is not None:
                                    meta[k] = str(v) if not isinstance(v, (int, float, bool)) else v
                            new_texts.append(chunk["text"])
                            new_metas.append(meta)
                            new_ids.append(doc_id)
            except Exception as e:
                print(f"Failed to process {filename}: {e}")
                
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
