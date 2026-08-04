import os
import shutil
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks
from sqlalchemy.orm import Session

from backend.database.db import get_db
from backend.database.models import User, Upload, AdminLog
from backend.auth.auth_middleware import require_admin
import hashlib

router = APIRouter(prefix="/api/admin", tags=["uploads"])

UPLOAD_DIR = "./uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

def process_upload_task(upload_id: int):
    # Background task to run ingestion pipeline
    # Will be implemented later or use pipeline module
    from backend.ingestion.pipeline import run_pipeline
    run_pipeline(upload_id)

@router.post("/upload")
def upload_file(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...), 
    db: Session = Depends(get_db), 
    current_user: User = Depends(require_admin)
):
    file_content = file.file.read()
    sha256_hash = hashlib.sha256(file_content).hexdigest()
    
    # Check if already uploaded
    existing = db.query(Upload).filter(Upload.sha256_hash == sha256_hash).first()
    if existing:
        raise HTTPException(status_code=400, detail="File already uploaded")
        
    file_path = os.path.join(UPLOAD_DIR, file.filename)
    with open(file_path, "wb") as f:
        f.write(file_content)
        
    new_upload = Upload(
        filename=file.filename,
        file_type=file.content_type or "unknown",
        status="pending",
        message="File uploaded, waiting for processing",
        sha256_hash=sha256_hash,
        uploaded_by=current_user.id
    )
    db.add(new_upload)
    db.commit()
    db.refresh(new_upload)
    
    db.add(AdminLog(admin_id=current_user.id, action="UPLOAD_FILE", details=f"Upload ID: {new_upload.id}, File: {file.filename}"))
    db.commit()
    
    background_tasks.add_task(process_upload_task, new_upload.id)
    
    return {"message": "File uploaded successfully", "upload_id": new_upload.id}

@router.get("/uploads")
def list_uploads(db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    return db.query(Upload).order_by(Upload.created_at.desc()).all()

@router.post("/uploads/reset-stuck")
def reset_stuck_uploads(db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    stuck = db.query(Upload).filter(Upload.status == "processing").all()
    for u in stuck:
        u.status = "pending"
        u.message = "Reset from stuck state"
    db.commit()
    return {"message": f"Reset {len(stuck)} stuck uploads"}

@router.delete("/uploads/{upload_id}")
def delete_upload(upload_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    upload = db.query(Upload).filter(Upload.id == upload_id).first()
    if not upload:
        raise HTTPException(status_code=404, detail="Upload not found")
        
    file_path = os.path.join(UPLOAD_DIR, upload.filename)
    if os.path.exists(file_path):
        os.remove(file_path)
        
    db.delete(upload)
    db.add(AdminLog(admin_id=current_user.id, action="DELETE_UPLOAD", details=f"Upload ID: {upload_id}"))
    db.commit()
    return {"message": "Upload deleted"}
