from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

from backend.database.db import get_db
from backend.database.models import User, Book, AdminLog
from backend.auth.auth_middleware import require_admin

router = APIRouter(prefix="/api/admin/books", tags=["books"])

class BookCreate(BaseModel):
    title: str
    author: str
    department: Optional[str] = None
    rack: Optional[str] = None
    floor: Optional[str] = None
    copies: int = 1
    available: int = 1
    isbn: Optional[str] = None
    description: Optional[str] = None

class BookUpdate(BaseModel):
    title: Optional[str] = None
    author: Optional[str] = None
    department: Optional[str] = None
    rack: Optional[str] = None
    floor: Optional[str] = None
    copies: Optional[int] = None
    available: Optional[int] = None
    isbn: Optional[str] = None
    description: Optional[str] = None

@router.get("")
def list_books(
    db: Session = Depends(get_db), 
    current_user: User = Depends(require_admin),
    skip: int = Query(0, ge=0),
    limit: int = Query(10000, ge=1),
    search: Optional[str] = None
):
    query = db.query(Book)
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                Book.title.ilike(search_term),
                Book.author.ilike(search_term),
                Book.isbn.ilike(search_term)
            )
        )
    
    books = query.order_by(Book.id.desc()).offset(skip).limit(limit).all()
    return books

@router.post("")
def create_book(
    book_in: BookCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    def sanitize(v):
        if isinstance(v, str):
            v_str = v.strip()
            return v_str if v_str else None
        return v

    new_book = Book(
        title=book_in.title.strip(),
        author=book_in.author.strip(),
        department=sanitize(book_in.department),
        rack=sanitize(book_in.rack).upper() if sanitize(book_in.rack) else None,
        floor=sanitize(book_in.floor),
        copies=book_in.copies if book_in.copies is not None else 1,
        available=book_in.available if book_in.available is not None else (book_in.copies if book_in.copies is not None else 1),
        isbn=sanitize(book_in.isbn),
        description=sanitize(book_in.description)
    )
    db.add(new_book)
    db.commit()
    db.refresh(new_book)
    
    db.add(AdminLog(
        admin_id=current_user.id, 
        action="CREATE_BOOK", 
        details=f"Created Book ID: {new_book.id}, Title: {new_book.title}"
    ))
    db.commit()
    
    # Trigger RAG Engine rebuild
    try:
        from backend.api.main import rag_engine
        rag_engine._build_or_load_sqlite_index()
    except Exception as e:
        print(f"Failed to update RAG engine for book: {e}")

    return {"message": "Book created successfully", "book": new_book}

@router.put("/{book_id}")
def update_book(
    book_id: int,
    book_in: BookUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    book = db.query(Book).filter(Book.id == book_id).first()
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    
    update_data = book_in.dict(exclude_unset=True)
    for key, value in update_data.items():
        if isinstance(value, str):
            v_str = value.strip()
            value = v_str if v_str else None
            if key == "rack" and value:
                value = value.upper()
        setattr(book, key, value)
        
    # Sibling copy synchronization: propagate rack, floor, and department to all sibling copies of same title & author
    if ("rack" in update_data or "floor" in update_data or "department" in update_data) and book.title:
        siblings = db.query(Book).filter(
            Book.title == book.title,
            Book.author == book.author,
            Book.id != book.id
        ).all()
        for sib in siblings:
            if "rack" in update_data:
                sib.rack = book.rack
            if "floor" in update_data:
                sib.floor = book.floor
            if "department" in update_data:
                sib.department = book.department
        
    db.commit()
    db.refresh(book)
    
    db.add(AdminLog(
        admin_id=current_user.id, 
        action="UPDATE_BOOK", 
        details=f"Updated Book ID: {book.id}, Title: {book.title}, Rack: {book.rack}"
    ))
    db.commit()
    
    # Trigger RAG Engine rebuild and ChromaDB update
    try:
        from backend.api.main import rag_engine
        if rag_engine:
            if rag_engine.collection is not None and book.title:
                total_c = db.query(Book).filter(Book.title == book.title, Book.author == book.author).count() or 1
                book_text = (
                    f"Title: {book.title}\n"
                    f"Author: {book.author}\n"
                    f"Rack: {book.rack or 'N/A'}\n"
                    f"Floor: {book.floor or '1'}\n"
                    f"Available Copies: {book.available or 1}\n"
                    f"Total Copies: {total_c}\n"
                )
                if book.department: book_text += f"Subject / Department: {book.department}\n"
                if book.isbn: book_text += f"ISBN / Call Number: {book.isbn}\n"
                if book.description: book_text += f"Description: {book.description}\n"
                
                embedder = getattr(rag_engine, 'embed_model', None) or getattr(rag_engine, 'embedding_model', None)
                if embedder is None:
                    from fastembed import TextEmbedding
                    embedder = TextEmbedding("BAAI/bge-small-en-v1.5", threads=1)
                emb = list(embedder.embed([book_text]))[0].tolist()
                rag_engine.collection.upsert(
                    documents=[book_text],
                    embeddings=[emb],
                    metadatas=[{
                        "source": "Library Books Catalog",
                        "title": book.title,
                        "author": book.author or "",
                        "rack": book.rack or "",
                        "location": book.rack or "",
                        "floor": book.floor or "1",
                        "copies": total_c,
                        "available": book.available or 1,
                        "document_type": "book"
                    }],
                    ids=[f"book_{book.id}"]
                )
            rag_engine._build_or_load_sqlite_index()
    except Exception as e:
        print(f"Failed to update RAG engine for book update: {e}")

    return {"message": "Book updated successfully", "book": book}

@router.delete("/{book_id}")
def delete_book(
    book_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    book = db.query(Book).filter(Book.id == book_id).first()
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
        
    title = book.title
    db.delete(book)
    
    db.add(AdminLog(
        admin_id=current_user.id, 
        action="DELETE_BOOK", 
        details=f"Deleted Book ID: {book_id}, Title: {title}"
    ))
    db.commit()
    
    # Trigger RAG Engine rebuild
    try:
        from backend.api.main import rag_engine
        rag_engine._build_or_load_sqlite_index()
    except Exception as e:
        print(f"Failed to update RAG engine for book deletion: {e}")

    return {"message": f"Book '{title}' deleted successfully"}
