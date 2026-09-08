import os
import io
import time
import shutil
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, BackgroundTasks
from sqlalchemy.orm import Session

from backend.database.db import get_db, SessionLocal
from backend.database.models import User, Circular, AdminLog
from backend.auth.auth_middleware import require_admin
from backend.rag.engine import TokenChunker, DocumentReader

router = APIRouter(prefix="/api", tags=["circulars"])

CIRCULAR_UPLOAD_DIR = "./uploads/circulars"
os.makedirs(CIRCULAR_UPLOAD_DIR, exist_ok=True)

def purge_expired_circulars_internal(db: Session):
    """Marks expired circulars as inactive and removes their embeddings if expired."""
    now = datetime.utcnow()
    expired = db.query(Circular).filter(
        Circular.is_active == True,
        Circular.expires_at <= now
    ).all()
    
    if expired:
        for c in expired:
            c.is_active = False
            print(f"[CIRCULAR PURGE] Circular '{c.title}' (ID {c.id}) expired and deactivated.")
        db.commit()
    return len(expired)

def ingest_circular_into_rag(circular_id: int, title: str, content: str, category: str, event_date: str, expires_at: datetime):
    """Chunks and embeds the circular into the ChromaDB vector store."""
    try:
        from backend.api.main import rag_engine
        if not rag_engine or not hasattr(rag_engine, "collection"):
            return
            
        chunker = TokenChunker(target_tokens=300, overlap_tokens=40)
        chunks = chunker.chunk(content, {
            "source": f"Circular: {title}",
            "section": f"College {category} Announcement",
            "document_type": "circular",
            "category": category,
            "event_date": event_date or "Today",
            "circular_id": str(circular_id),
            "expires_at": expires_at.isoformat()
        })
        
        if not chunks:
            chunks = [{
                "text": f"College {category} Circular: {title}. Details: {content}",
                "token_count": len(content.split()),
                "metadata": {
                    "source": f"Circular: {title}",
                    "section": f"College {category} Announcement",
                    "document_type": "circular",
                    "category": category,
                    "event_date": event_date or "Today",
                    "circular_id": str(circular_id),
                    "expires_at": expires_at.isoformat()
                }
            }]
            
        texts = [c["text"] for c in chunks]
        metadatas = [c["metadata"] for c in chunks]
        ids = [f"circular_{circular_id}_chunk_{i}" for i in range(len(chunks))]
        
        # FastEmbed embeddings
        embedder = getattr(rag_engine, 'embed_model', None) or getattr(rag_engine, 'embedding_model', None)
        if embedder is None:
            from fastembed import TextEmbedding
            embedder = TextEmbedding("BAAI/bge-small-en-v1.5", threads=1)
            
        embeddings = list(embedder.embed(texts))
        embeddings = [e.tolist() for e in embeddings]
        
        if rag_engine.collection is not None:
            rag_engine.collection.upsert(
                documents=texts,
                embeddings=embeddings,
                metadatas=metadatas,
                ids=ids
            )
            print(f"[RAG INGEST] Successfully indexed {len(chunks)} chunks for circular '{title}'")
    except Exception as e:
        print(f"[RAG INGEST ERROR] Failed to embed circular: {e}")

@router.post("/admin/circulars/upload")
async def upload_circular(
    background_tasks: BackgroundTasks,
    title: str = Form(...),
    content: Optional[str] = Form(None),
    category: str = Form("General"), # Leave, Event, Exam, Notice, Holiday, General
    event_date: Optional[str] = Form(None),
    expire_hours: int = Form(24),
    custom_expiry_date: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    extracted_text = content or ""
    saved_filename = None
    
    # Process uploaded file if provided
    if file and file.filename:
        saved_filename = file.filename
        file_path = os.path.join(CIRCULAR_UPLOAD_DIR, f"{int(time.time())}_{file.filename}")
        file_bytes = await file.read()
        with open(file_path, "wb") as f:
            f.write(file_bytes)
            
        # Extract text from file
        try:
            pages = DocumentReader.read(file_path)
            file_text = "\n\n".join([p["text"] for p in pages if p.get("text")])
            if file_text.strip():
                extracted_text = f"{extracted_text}\n\n{file_text}".strip()
        except Exception as e:
            print(f"File text extraction warning: {e}")
            
    if not extracted_text.strip():
        raise HTTPException(status_code=400, detail="Circular content or a readable document file is required.")
        
    now = datetime.utcnow()
    
    # Check if custom expiry date is provided
    expires_at = None
    if custom_expiry_date and custom_expiry_date.strip():
        try:
            # Try parsing ISO or datetime-local string (YYYY-MM-DDTHH:MM or YYYY-MM-DD)
            clean_date_str = custom_expiry_date.strip().replace("Z", "")
            if "T" in clean_date_str:
                expires_at = datetime.fromisoformat(clean_date_str)
            else:
                expires_at = datetime.strptime(clean_date_str, "%Y-%m-%d") + timedelta(hours=23, minutes=59)
        except Exception as ex:
            print(f"Warning: Failed to parse custom_expiry_date '{custom_expiry_date}': {ex}")
            expires_at = now + timedelta(hours=max(1, expire_hours))
    
    if not expires_at:
        expires_at = now + timedelta(hours=max(1, expire_hours))
    
    new_circular = Circular(
        title=title.strip(),
        content=extracted_text.strip(),
        category=category.strip(),
        event_date=event_date.strip() if event_date else datetime.now().strftime("%Y-%m-%d"),
        source_filename=saved_filename,
        uploaded_by=current_user.id,
        created_at=now,
        expires_at=expires_at,
        is_active=True
    )
    db.add(new_circular)
    db.commit()
    db.refresh(new_circular)
    
    db.add(AdminLog(
        admin_id=current_user.id,
        action="UPLOAD_CIRCULAR",
        details=f"Circular ID: {new_circular.id}, Title: {title}, Category: {category}, Expires: {expires_at.isoformat()}"
    ))
    db.commit()
    
    # Background ingestion into ChromaDB
    background_tasks.add_task(
        ingest_circular_into_rag,
        new_circular.id,
        new_circular.title,
        new_circular.content,
        new_circular.category,
        new_circular.event_date,
        new_circular.expires_at
    )
    
    return {
        "message": "Campus circular uploaded and indexed successfully! Will auto-expire after 24 hours.",
        "circular_id": new_circular.id,
        "title": new_circular.title,
        "category": new_circular.category,
        "expires_at": new_circular.expires_at.isoformat()
    }

@router.get("/admin/circulars")
def list_admin_circulars(db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    purge_expired_circulars_internal(db)
    circulars = db.query(Circular).order_by(Circular.created_at.desc()).all()
    
    now = datetime.utcnow()
    results = []
    for c in circulars:
        is_still_active = c.is_active and c.expires_at > now
        remaining_seconds = max(0, int((c.expires_at - now).total_seconds()))
        hours_left = round(remaining_seconds / 3600, 1)
        
        results.append({
            "id": c.id,
            "title": c.title,
            "content": c.content,
            "category": c.category,
            "event_date": c.event_date,
            "source_filename": c.source_filename,
            "created_at": c.created_at.isoformat(),
            "expires_at": c.expires_at.isoformat(),
            "is_active": is_still_active,
            "hours_left": hours_left,
            "status": "Active" if is_still_active else "Expired"
        })
    return results

@router.delete("/admin/circulars/{circular_id}")
def delete_circular(circular_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    circ = db.query(Circular).filter(Circular.id == circular_id).first()
    if not circ:
        raise HTTPException(status_code=404, detail="Circular not found")
        
    db.delete(circ)
    db.commit()
    
    # Remove from ChromaDB
    try:
        from backend.api.main import rag_engine
        if rag_engine and hasattr(rag_engine, "collection"):
            rag_engine.collection.delete(where={"circular_id": str(circular_id)})
    except Exception as e:
        print(f"Warning: Failed to delete circular chunks from Chroma: {e}")
        
    return {"message": "Circular deleted successfully"}

@router.post("/admin/circulars/purge-expired")
def purge_expired_endpoint(db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    count = purge_expired_circulars_internal(db)
    return {"message": f"Purged {count} expired circulars"}

@router.get("/circulars/active")
def get_active_circulars_for_students(db: Session = Depends(get_db)):
    """Public endpoint for students & Voice Assistant to fetch today's active announcements."""
    purge_expired_circulars_internal(db)
    now = datetime.utcnow()
    active_circulars = db.query(Circular).filter(
        Circular.is_active == True,
        Circular.expires_at > now
    ).order_by(Circular.created_at.desc()).all()
    
    return [
        {
            "id": c.id,
            "title": c.title,
            "content": c.content,
            "category": c.category,
            "event_date": c.event_date,
            "created_at": c.created_at.isoformat(),
            "expires_at": c.expires_at.isoformat()
        }
        for c in active_circulars
    ]
