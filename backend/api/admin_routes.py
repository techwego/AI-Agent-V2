from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
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

# --- Library Architecture & System Profile Configuration ---
class LibraryConfigUpdate(BaseModel):
    floors: int
    rows_per_floor: int
    cols_per_row: int
    shelves_per_rack: int
    pois: list = []
    custom_racks: dict = {}
    custom_layout: dict = {}
    
    # Global settings
    college_name: Optional[str] = None
    library_name: Optional[str] = None
    agent_name: Optional[str] = None
    greeting_message: Optional[str] = None
    opening_hours: Optional[str] = None
    library_policies: Optional[str] = None
    additional_details: Optional[str] = None
    voice_preset: Optional[str] = None

def ingest_system_profile_into_rag(config: LibraryConfig):
    """Embeds library & campus profile, agent identity, operating hours, and policies into ChromaDB."""
    try:
        from backend.api.main import rag_engine
        if not rag_engine or not hasattr(rag_engine, "collection"):
            return
            
        docs = [
            f"Official Profile: {config.college_name or 'Anna University'} - {config.library_name or 'Central Library'}. Executive AI Assistant Name: {config.agent_name or 'Sam'}. Greeting: {config.greeting_message or 'How can I assist you today?'}.",
            f"Operating Hours & Timings for {config.library_name or 'the Library'} ({config.college_name or 'the College'}): {config.opening_hours or 'Mon-Fri: 8:00 AM - 8:00 PM'}.",
            f"Borrowing Rules, Policies & Guidelines for {config.library_name or 'the Library'}: {config.library_policies or 'Students can borrow up to 3 books for 14 days.'}.",
            f"Campus & Library Facilities, Wi-Fi & Additional Details: {config.additional_details or 'Wi-Fi is available across all reading halls.'}."
        ]
        metadatas = [
            {"source": "System Configuration", "section": "College & Library Identity", "document_type": "profile"},
            {"source": "System Configuration", "section": "Operating Hours & Timings", "document_type": "timings"},
            {"source": "System Configuration", "section": "Library Rules & Policies", "document_type": "policies"},
            {"source": "System Configuration", "section": "Facilities & Additional Details", "document_type": "facilities"}
        ]
        ids = [
            "system_profile_identity",
            "system_profile_timings",
            "system_profile_policies",
            "system_profile_facilities"
        ]
        
        embedder = getattr(rag_engine, 'embed_model', None) or getattr(rag_engine, 'embedding_model', None)
        if embedder is None:
            from fastembed import TextEmbedding
            embedder = TextEmbedding("BAAI/bge-small-en-v1.5", threads=1)
        
        embeddings = list(embedder.embed(docs))
        embeddings = [e.tolist() for e in embeddings]
        
        if rag_engine.collection is not None:
            rag_engine.collection.upsert(
                documents=docs,
                embeddings=embeddings,
                metadatas=metadatas,
                ids=ids
            )
            print(f"[RAG INGEST] Successfully updated ChromaDB vector embeddings for {config.library_name} profile.")
    except Exception as e:
        print(f"[RAG INGEST ERROR] Failed to embed library profile: {e}")

@router.get("/architecture")
def get_architecture(db: Session = Depends(get_db)):
    config = db.query(LibraryConfig).first()
    if not config:
        config = LibraryConfig(
            floors=2, 
            rows_per_floor=2, 
            cols_per_row=6, 
            shelves_per_rack=4, 
            pois=[], 
            custom_racks={}, 
            custom_layout={},
            college_name="Anna University",
            library_name="Anna University Central Library",
            agent_name="Sam",
            greeting_message="How can I assist you today?",
            opening_hours="Mon-Fri: 8:00 AM - 8:00 PM, Sat: 9:00 AM - 5:00 PM",
            library_policies="Students can borrow up to 3 books for 14 days.",
            additional_details="Wi-Fi is available throughout the library. Quiet reading rooms are located on Floor 2.",
            voice_preset="en-IN-Pallavi"
        )
        db.add(config)
        db.commit()
        db.refresh(config)
    return config

@router.post("/architecture")
def update_architecture(config_update: LibraryConfigUpdate, background_tasks: BackgroundTasks, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
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
    
    if config_update.college_name is not None:
        config.college_name = config_update.college_name
    if config_update.library_name is not None:
        config.library_name = config_update.library_name
    if config_update.agent_name is not None:
        config.agent_name = config_update.agent_name
    if config_update.greeting_message is not None:
        config.greeting_message = config_update.greeting_message
    if config_update.opening_hours is not None:
        config.opening_hours = config_update.opening_hours
    if config_update.library_policies is not None:
        config.library_policies = config_update.library_policies
    if config_update.additional_details is not None:
        config.additional_details = config_update.additional_details
    if config_update.voice_preset is not None:
        config.voice_preset = config_update.voice_preset
    
    # Log the action
    admin_log = AdminLog(admin_id=current_user.id, action="Update System Settings", details=f"Library: {config.library_name}, Agent: {config.agent_name}, Floors: {config.floors}")
    db.add(admin_log)
    
    db.commit()
    db.refresh(config)
    
    # Update Vector Embedding in ChromaDB in background
    background_tasks.add_task(ingest_system_profile_into_rag, config)
    
    return {"message": "Library architecture and profile updated successfully", "config": config}

