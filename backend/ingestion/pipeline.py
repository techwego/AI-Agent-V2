import os
import json
import logging
from typing import List, Dict, Any
from backend.database.db import SessionLocal
from backend.database.models import Upload, Book, EmbeddingRecord
from backend.ingestion.parser import parse_document
from backend.rag.engine import RAGEngine
import chromadb
from fastembed import TextEmbedding

logger = logging.getLogger(__name__)

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
        chunks = parse_document(file_path)
        if not chunks:
            raise Exception("No data could be extracted from the file.")
            
        upload.message = f"Found {len(chunks)} records. Normalizing..."
        db.commit()
        
        # 2. Normalize and insert books
        books_to_embed = []
        for chunk in chunks:
            if isinstance(chunk, str):
                # If parser returns strings (chunks of text)
                books_to_embed.append({"text": chunk, "metadata": {"source": upload.filename}})
            elif isinstance(chunk, dict):
                # Structured data (Excel/CSV)
                mapped = map_fields(chunk)
                new_book = Book(**mapped)
                db.add(new_book)
                db.flush() # get ID
                
                text_rep = f"Title: {new_book.title}\nAuthor: {new_book.author}\nLocation: {new_book.rack}\nCopies: {new_book.copies}"
                books_to_embed.append({
                    "id": f"book_{new_book.id}",
                    "text": text_rep,
                    "metadata": {
                        "title": new_book.title,
                        "author": new_book.author,
                        "rack": new_book.rack or "",
                        "book_id": new_book.id
                    }
                })
        
        db.commit()
        
        # 5. Generate embeddings and Upsert
        upload.message = "Generating embeddings..."
        db.commit()
        
        embedding_model = TextEmbedding("BAAI/bge-small-en-v1.5")
        texts = [b["text"] for b in books_to_embed]
        embeddings = list(embedding_model.embed(texts))
        
        chroma_client = chromadb.PersistentClient(path="./chroma_db")
        collection = chroma_client.get_or_create_collection(name="library_data_v2")
        
        ids = [b.get("id", f"upload_{upload_id}_{i}") for i, b in enumerate(books_to_embed)]
        metadatas = [b.get("metadata", {}) for b in books_to_embed]
        
        # Convert embedding arrays to lists for ChromaDB
        embeddings_list = [e.tolist() for e in embeddings]
        
        collection.upsert(
            documents=texts,
            embeddings=embeddings_list,
            metadatas=metadatas,
            ids=ids
        )
        
        # Log embedding record
        db.add(EmbeddingRecord(upload_id=upload_id, chunk_count=len(texts), status="success"))
        
        # 8. Update upload status
        upload.status = "completed"
        upload.message = "Successfully ingested and indexed."
        db.commit()
        
        # 9. Reload RAG index
        from backend.api.main import rag_engine
        rag_engine.reload_index()
        
    except Exception as e:
        logger.exception("Pipeline failed")
        upload.status = "failed"
        upload.message = str(e)
        db.commit()
    finally:
        db.close()
