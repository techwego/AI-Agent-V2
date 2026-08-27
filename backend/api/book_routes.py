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
    new_book = Book(
        title=book_in.title,
        author=book_in.author,
        department=book_in.department,
        rack=book_in.rack,
        floor=book_in.floor,
        copies=book_in.copies,
        available=book_in.available,
        isbn=book_in.isbn,
        description=book_in.description
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
        setattr(book, key, value)
        
    db.commit()
    db.refresh(book)
    
    db.add(AdminLog(
        admin_id=current_user.id, 
        action="UPDATE_BOOK", 
        details=f"Updated Book ID: {book.id}, Title: {book.title}"
    ))
    db.commit()
    
    # Trigger RAG Engine rebuild
    try:
        from backend.api.main import rag_engine
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
