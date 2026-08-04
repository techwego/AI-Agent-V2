from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import datetime, timedelta

from backend.database.db import get_db
from backend.database.models import User, Book, Department, Upload, AdminLog, LoginHistory, ConversationHistory
from backend.auth.auth_middleware import require_admin
from pydantic import BaseModel

router = APIRouter(prefix="/api/admin", tags=["admin"])

# --- Pydantic Models ---
class BookCreate(BaseModel):
    title: str
    author: str
    department: Optional[str] = None
    rack: Optional[str] = None
    floor: Optional[str] = None
    copies: int = 1
    available: int = 1
    isbn: Optional[str] = None

class DepartmentCreate(BaseModel):
    name: str
    hod: Optional[str] = None
    building: Optional[str] = None
    floor: Optional[str] = None

# --- Books CRUD ---
@router.get("/books")
def list_books(skip: int = 0, limit: int = 100, search: Optional[str] = None, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    query = db.query(Book)
    if search:
        query = query.filter(Book.title.ilike(f"%{search}%") | Book.author.ilike(f"%{search}%"))
    books = query.offset(skip).limit(limit).all()
    return books

@router.post("/books")
def create_book(book: BookCreate, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    new_book = Book(**book.model_dump())
    db.add(new_book)
    db.add(AdminLog(admin_id=current_user.id, action="CREATE_BOOK", details=f"Book: {book.title}"))
    db.commit()
    return {"message": "Book created", "book_id": new_book.id}

@router.put("/books/{book_id}")
def update_book(book_id: int, book_data: BookCreate, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    book = db.query(Book).filter(Book.id == book_id).first()
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    for key, value in book_data.model_dump().items():
        setattr(book, key, value)
    db.add(AdminLog(admin_id=current_user.id, action="UPDATE_BOOK", details=f"Book ID: {book_id}"))
    db.commit()
    return {"message": "Book updated"}

@router.delete("/books/{book_id}")
def delete_book(book_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    book = db.query(Book).filter(Book.id == book_id).first()
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    db.delete(book)
    db.add(AdminLog(admin_id=current_user.id, action="DELETE_BOOK", details=f"Book ID: {book_id}"))
    db.commit()
    return {"message": "Book deleted"}

# --- Departments CRUD ---
@router.get("/departments")
def list_departments(db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    return db.query(Department).all()

@router.post("/departments")
def create_department(dept: DepartmentCreate, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    new_dept = Department(**dept.model_dump())
    db.add(new_dept)
    db.add(AdminLog(admin_id=current_user.id, action="CREATE_DEPARTMENT", details=f"Department: {dept.name}"))
    db.commit()
    return {"message": "Department created", "dept_id": new_dept.id}

# --- Users Management ---
@router.get("/users")
def list_users(db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    return db.query(User).all()

@router.put("/users/{user_id}/block")
def block_user(user_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_active = False
    db.add(AdminLog(admin_id=current_user.id, action="BLOCK_USER", details=f"User ID: {user_id}"))
    db.commit()
    return {"message": "User blocked"}

@router.get("/users/{user_id}/login-history")
def user_login_history(user_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    return db.query(LoginHistory).filter(LoginHistory.user_id == user_id).order_by(LoginHistory.created_at.desc()).limit(50).all()

# --- Analytics ---
@router.get("/analytics")
def get_analytics(db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    total_books = db.query(func.count(Book.id)).scalar()
    total_users = db.query(func.count(User.id)).scalar()
    total_departments = db.query(func.count(Department.id)).scalar()
    
    today = datetime.utcnow().date()
    today_queries = db.query(func.count(ConversationHistory.id)).filter(func.date(ConversationHistory.created_at) == today).scalar()
    
    return {
        "total_books": total_books,
        "total_users": total_users,
        "total_departments": total_departments,
        "today_queries": today_queries
    }

@router.get("/logs")
def get_admin_logs(db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    return db.query(AdminLog).order_by(AdminLog.created_at.desc()).limit(100).all()
