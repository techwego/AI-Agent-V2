from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import datetime, timedelta

from backend.database.db import get_db
from backend.database.models import User, Book, Department, Upload, AdminLog, LoginHistory, ConversationHistory, LibraryConfig
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

# Books CRUD moved to book_routes.py


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

@router.put("/departments/{dept_id}")
def update_department(dept_id: int, dept_data: DepartmentCreate, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    dept = db.query(Department).filter(Department.id == dept_id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")
    for key, value in dept_data.model_dump().items():
        setattr(dept, key, value)
    db.add(AdminLog(admin_id=current_user.id, action="UPDATE_DEPARTMENT", details=f"Department ID: {dept_id}"))
    db.commit()
    return {"message": "Department updated"}

@router.delete("/departments/{dept_id}")
def delete_department(dept_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    dept = db.query(Department).filter(Department.id == dept_id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")
    db.delete(dept)
    db.add(AdminLog(admin_id=current_user.id, action="DELETE_DEPARTMENT", details=f"Department ID: {dept_id}"))
    db.commit()
    return {"message": "Department deleted"}

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

@router.put("/users/{user_id}/unblock")
def unblock_user(user_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_active = True
    db.add(AdminLog(admin_id=current_user.id, action="UNBLOCK_USER", details=f"User ID: {user_id}"))
    db.commit()
    return {"message": "User unblocked"}

@router.delete("/users/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    if current_user.id == user_id:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    db.delete(user)
    db.add(AdminLog(admin_id=current_user.id, action="DELETE_USER", details=f"User ID: {user_id}"))
    db.commit()
    return {"message": "User deleted"}

# Analytics and Logs moved to analytics_routes.py

# --- Library Architecture Configuration ---
class LibraryConfigUpdate(BaseModel):
    floors: int
    rows_per_floor: int
    cols_per_row: int
    shelves_per_rack: int
    pois: list = []
    custom_racks: dict = {}
    custom_layout: dict = {}

@router.get("/architecture")
def get_architecture(db: Session = Depends(get_db)):
    config = db.query(LibraryConfig).first()
    if not config:
        config = LibraryConfig(floors=2, rows_per_floor=2, cols_per_row=6, shelves_per_rack=4, pois=[], custom_racks={}, custom_layout={})
        db.add(config)
        db.commit()
        db.refresh(config)
    return config

@router.post("/architecture")
def update_architecture(config_update: LibraryConfigUpdate, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    config = db.query(LibraryConfig).first()
    if not config:
        config = LibraryConfig()
        db.add(config)
    
    config.floors = config_update.floors
    config.rows_per_floor = config_update.rows_per_floor
    config.cols_per_row = config_update.cols_per_row
    config.shelves_per_rack = config_update.shelves_per_rack
    config.pois = config_update.pois
    config.custom_racks = config_update.custom_racks
    config.custom_layout = config_update.custom_layout
    
    # Log the action
    admin_log = AdminLog(admin_id=current_user.id, action="Update Architecture", details=f"Floors: {config.floors}, Rows: {config.rows_per_floor}, Cols: {config.cols_per_row}")

    db.add(admin_log)
    
    db.commit()
    db.refresh(config)
    return {"message": "Library architecture updated successfully", "config": config}

