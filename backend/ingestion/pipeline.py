import os
import json
import logging
import re
from typing import List, Dict, Any
from backend.database.db import SessionLocal
from backend.database.models import Upload, Book, EmbeddingRecord
from backend.ingestion.parser import parse_file
from backend.rag.engine import LibraryRAG
import chromadb
from fastembed import TextEmbedding

logger = logging.getLogger(__name__)

def normalize_text(text: str) -> str:
    """Normalize text by removing special chars, extra spaces, lowercasing."""
    if not text:
        return ""
    text = re.sub(r'[,\.\(\)\[\]\{\}]', ' ', text)
    text = re.sub(r'\s+', ' ', text)
    return text.strip().lower()

def build_rich_text(record: dict) -> str:
    """Build a rich vertical text block from a parsed record for high-quality embeddings."""
    lines = []
    meta = record.get("metadata", {})
    text = record.get("text", "")
    
    # Try to extract structured fields from metadata
    title = meta.get("title") or meta.get("book name") or meta.get("book_name") or ""
    author = meta.get("author") or ""
    subject = meta.get("subject") or ""
    call_number = meta.get("call_number") or meta.get("call number") or ""
    location = meta.get("location") or meta.get("rack") or ""
    copies = meta.get("copies") or meta.get("available") or ""
    
    if title:
        lines.append(f"Title: {title}")
    if author:
        lines.append(f"Author: {author}")
    if subject:
        lines.append(f"Subject: {subject}")
    if call_number:
        lines.append(f"Call Number: {call_number}")
    if location:
        lines.append(f"Rack: {location}")
    if copies:
        lines.append(f"Available Copies: {copies}")
    
    # Add normalized keywords for better search
    if title:
        lines.append(f"Keywords: {normalize_text(title)}")
    
    # If we built structured lines, use them; otherwise fall back to original text
    if lines:
        return "\n".join(lines)
    return text

def map_fields(record: Dict[str, Any]) -> Dict[str, Any]:
    mapped = {}
    keys = {k.lower().strip(): k for k in record.keys()}
    
    # Title mapping
    title_keys = ["title", "book name", "book_name", "name"]
    for tk in title_keys:
        if tk in keys:
            mapped["title"] = str(record[keys[tk]])
            break
            
    # Author mapping
    author_keys = ["author", "writer", "authors"]
    for ak in author_keys:
        if ak in keys:
            mapped["author"] = str(record[keys[ak]])
            break
            
    # Rack/Location mapping
    rack_keys = ["rack", "location", "shelf", "rack no", "rack_no"]
    for rk in rack_keys:
        if rk in keys:
            mapped["rack"] = str(record[keys[rk]])
            break
            
    # Copies mapping
    copies_keys = ["copies", "qty", "quantity", "available"]
    for ck in copies_keys:
        if ck in keys:
            try:
                mapped["copies"] = int(record[keys[ck]])
                mapped["available"] = mapped["copies"]
            except:
                pass
            break
            
    # Fallbacks
    mapped.setdefault("title", "Unknown Title")
    mapped.setdefault("author", "Unknown Author")
    mapped.setdefault("copies", 1)
    mapped.setdefault("available", 1)
    
    return mapped

def run_pipeline(upload_id: int):
    db = SessionLocal()
    upload = db.query(Upload).filter(Upload.id == upload_id).first()
    if not upload:
        db.close()
        return

    try:
        upload.status = "processing"
        upload.message = "Parsing document..."
        db.commit()

        file_path = os.path.join("./uploads", upload.filename)
        
        # 1. Parse file
        chunks = parse_file(file_path)
        if not chunks:
            raise Exception("No data could be extracted from the file.")
            
        upload.message = f"Found {len(chunks)} records. Normalizing..."
        db.commit()
        
        # 2. Normalize, validate, and build rich text for each record
        books_to_embed = []
        
        from backend.rag.engine import TokenChunker
        chunker = TokenChunker(target_tokens=256, overlap_tokens=40)
        
        for chunk in chunks:
            if isinstance(chunk, str):
                sub_chunks = chunker.chunk(chunk, {"source": upload.filename})
                for sc in sub_chunks:
                    books_to_embed.append(sc)
            elif isinstance(chunk, dict):
                text_content = chunk.get("text", "")
                metadata = chunk.get("metadata", {})
                
                # Map fields for SQL database (Book records)
                mapped = map_fields(metadata)
                
                # Insert into SQL if it has a real title (structured data)
                if mapped.get("title") != "Unknown Title":
                    new_book = Book(**mapped)
                    db.add(new_book)
                    db.flush()
                    metadata["book_id"] = new_book.id
                    
                    # Build rich text block for high-quality embedding
                    rich_text = build_rich_text(chunk)
                    
                    # Inject all fields into metadata for ChromaDB filtering
                    enriched_meta = {**metadata}
                    for k, v in metadata.items():
                        val = str(v).strip() if v else ""
                        if val:
                            enriched_meta[str(k).lower().replace(" ", "_")] = val
                    
                    # Add normalized fields for SQLite fuzzy matching
                    if mapped.get("title"):
                        enriched_meta["normalized_title"] = normalize_text(mapped["title"])
                    if mapped.get("author"):
                        enriched_meta["normalized_author"] = normalize_text(mapped["author"])
                    
                    enriched_meta["section"] = "Catalog"
                    
                    books_to_embed.append({
                        "id": f"upload_{upload_id}_{len(books_to_embed)}",
                        "text": rich_text,
                        "metadata": enriched_meta
                    })
                else:
                    # For unstructured documents (PDFs, TXT), break into smaller chunks
                    sub_chunks = chunker.chunk(text_content, metadata)
                    for sc in sub_chunks:
                        books_to_embed.append({
                            "id": f"upload_{upload_id}_{len(books_to_embed)}",
                            "text": sc["text"],
                            "metadata": sc["metadata"]
                        })
        
        db.commit()
        
        # 3. Save to JSON file
        upload.message = "Converting and saving to JSON..."
        db.commit()
        json_path = os.path.join("./uploads", f"{upload.filename}.parsed.json")
        try:
            with open(json_path, 'w', encoding='utf-8') as jf:
                json.dump(books_to_embed, jf, indent=4)
        except Exception as je:
            logger.warning(f"Could not save JSON file: {je}")
        
        # 4. Generate embeddings and upsert in batches
        upload.message = "Generating embeddings..."
        db.commit()
        
        from backend.api.main import rag_engine
        embedding_model = TextEmbedding("BAAI/bge-small-en-v1.5")
        
        collection = rag_engine.collection
        
        BATCH_SIZE = 250
        total_chunks = len(books_to_embed)
        
        for i in range(0, total_chunks, BATCH_SIZE):
            batch = books_to_embed[i:i + BATCH_SIZE]
            batch_texts = [b["text"] for b in batch]
            batch_ids = [b.get("id", f"upload_{upload_id}_{i+j}") for j, b in enumerate(batch)]
            batch_metadatas = [b.get("metadata", {}) for b in batch]
            
            batch_embeddings = list(embedding_model.embed(batch_texts))
            batch_embeddings_list = [e.tolist() for e in batch_embeddings]
            
            collection.upsert(
                documents=batch_texts,
                embeddings=batch_embeddings_list,
                metadatas=batch_metadatas,
                ids=batch_ids
            )
            
            upload.message = f"Embedded {min(i + BATCH_SIZE, total_chunks)} of {total_chunks} chunks..."
            db.commit()
        
        # Log embedding record
        db.add(EmbeddingRecord(upload_id=upload_id, chunk_count=total_chunks, status="success"))
        
        # 5. Rebuild BM25 and SQLite indexes with the new data
        upload.message = "Rebuilding search indexes..."
        db.commit()
        
        upload.status = "completed"
        upload.message = "Successfully ingested and indexed."
        db.commit()
        
        # 6. Reload RAG index (rebuilds BM25 + SQLite)
        from backend.api.main import rag_engine
        rag_engine.reload_index()
        
    except Exception as e:
        logger.exception("Pipeline failed")
        upload.status = "failed"
        upload.message = str(e)
        db.commit()
    finally:
        db.close()
