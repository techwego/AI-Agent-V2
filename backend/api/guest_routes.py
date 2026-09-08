import os
import uuid
import shutil
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import Optional

from backend.database.db import get_db
from backend.database.models import User, GuestVisit, LibraryConfig
from backend.auth.auth_middleware import require_admin

router = APIRouter(tags=["guests"])

GUEST_IMAGES_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "frontend", "public", "guest_images")

def ensure_guest_images_dir():
    os.makedirs(GUEST_IMAGES_DIR, exist_ok=True)

# ── Public Endpoint: Fetch active guests for Login Page ──
@router.get("/api/guests/active")
def get_active_guests(db: Session = Depends(get_db)):
    config = db.query(LibraryConfig).first()
    show_cards = config.show_guest_cards if config else False
    
    if not show_cards:
        return {"show_guest_cards": False, "guests": []}
    
    guests = db.query(GuestVisit).filter(GuestVisit.is_active == True).order_by(GuestVisit.created_at.desc()).all()
    return {
        "show_guest_cards": True,
        "guests": [
            {
                "id": g.id,
                "name": g.name,
                "about": g.about,
                "greeting_message": g.greeting_message,
                "image_url": f"/guest_images/{g.image_filename}" if g.image_filename else None,
                "created_at": g.created_at
            }
            for g in guests
        ]
    }

# ── Public Endpoint: Get single guest by ID ──
@router.get("/api/guests/{guest_id}")
def get_guest(guest_id: int, db: Session = Depends(get_db)):
    guest = db.query(GuestVisit).filter(GuestVisit.id == guest_id).first()
    if not guest:
        raise HTTPException(status_code=404, detail="Guest not found")
    return {
        "id": guest.id,
        "name": guest.name,
        "about": guest.about,
        "greeting_message": guest.greeting_message,
        "image_url": f"/guest_images/{guest.image_filename}" if guest.image_filename else None
    }

# ── Admin: List all guests ──
@router.get("/api/admin/guests")
def list_all_guests(db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    guests = db.query(GuestVisit).order_by(GuestVisit.created_at.desc()).all()
    return [
        {
            "id": g.id,
            "name": g.name,
            "about": g.about,
            "greeting_message": g.greeting_message,
            "image_url": f"/guest_images/{g.image_filename}" if g.image_filename else None,
            "is_active": g.is_active,
            "created_at": g.created_at
        }
        for g in guests
    ]

# ── Admin: Create guest ──
@router.post("/api/admin/guests")
async def create_guest(
    name: str = Form(...),
    about: Optional[str] = Form(None),
    greeting_message: Optional[str] = Form(None),
    image: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    ensure_guest_images_dir()
    
    image_filename = None
    if image and image.filename:
        ext = os.path.splitext(image.filename)[1] or ".png"
        image_filename = f"guest_{uuid.uuid4().hex[:12]}{ext}"
        dest = os.path.join(GUEST_IMAGES_DIR, image_filename)
        with open(dest, "wb") as f:
            shutil.copyfileobj(image.file, f)
    
    guest = GuestVisit(
        name=name,
        about=about,
        greeting_message=greeting_message,
        image_filename=image_filename,
        is_active=True,
        created_by=current_user.id
    )
    db.add(guest)
    db.commit()
    db.refresh(guest)
    
    return {"message": "Guest created successfully", "id": guest.id}

# ── Admin: Update guest ──
@router.put("/api/admin/guests/{guest_id}")
async def update_guest(
    guest_id: int,
    name: str = Form(...),
    about: Optional[str] = Form(None),
    greeting_message: Optional[str] = Form(None),
    is_active: Optional[str] = Form(None),
    image: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    guest = db.query(GuestVisit).filter(GuestVisit.id == guest_id).first()
    if not guest:
        raise HTTPException(status_code=404, detail="Guest not found")
    
    ensure_guest_images_dir()
    
    guest.name = name
    guest.about = about
    guest.greeting_message = greeting_message
    
    if is_active is not None:
        guest.is_active = is_active.lower() in ("true", "1", "yes")
    
    if image and image.filename:
        # Delete old image if exists
        if guest.image_filename:
            old_path = os.path.join(GUEST_IMAGES_DIR, guest.image_filename)
            if os.path.exists(old_path):
                os.remove(old_path)
        
        ext = os.path.splitext(image.filename)[1] or ".png"
        image_filename = f"guest_{uuid.uuid4().hex[:12]}{ext}"
        dest = os.path.join(GUEST_IMAGES_DIR, image_filename)
        with open(dest, "wb") as f:
            shutil.copyfileobj(image.file, f)
        guest.image_filename = image_filename
    
    db.commit()
    return {"message": "Guest updated successfully"}

# ── Admin: Delete guest ──
@router.delete("/api/admin/guests/{guest_id}")
def delete_guest(guest_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    guest = db.query(GuestVisit).filter(GuestVisit.id == guest_id).first()
    if not guest:
        raise HTTPException(status_code=404, detail="Guest not found")
    
    # Delete image file
    if guest.image_filename:
        img_path = os.path.join(GUEST_IMAGES_DIR, guest.image_filename)
        if os.path.exists(img_path):
            os.remove(img_path)
    
    db.delete(guest)
    db.commit()
    return {"message": "Guest deleted successfully"}

# ── Admin: Toggle individual guest active status ──
@router.post("/api/admin/guests/{guest_id}/toggle")
def toggle_guest_active(guest_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    guest = db.query(GuestVisit).filter(GuestVisit.id == guest_id).first()
    if not guest:
        raise HTTPException(status_code=404, detail="Guest not found")
    
    guest.is_active = not guest.is_active
    db.commit()
    return {
        "id": guest.id,
        "is_active": guest.is_active,
        "message": f"Guest profile for '{guest.name}' is now {'active' if guest.is_active else 'disabled'}."
    }

# ── Admin: Duplicate guest profile (creates copy in disabled mode) ──
@router.post("/api/admin/guests/{guest_id}/duplicate")
def duplicate_guest(guest_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    original = db.query(GuestVisit).filter(GuestVisit.id == guest_id).first()
    if not original:
        raise HTTPException(status_code=404, detail="Guest not found")
    
    ensure_guest_images_dir()
    
    new_image_filename = None
    if original.image_filename:
        old_path = os.path.join(GUEST_IMAGES_DIR, original.image_filename)
        if os.path.exists(old_path):
            ext = os.path.splitext(original.image_filename)[1] or ".png"
            new_image_filename = f"guest_{uuid.uuid4().hex[:12]}{ext}"
            new_path = os.path.join(GUEST_IMAGES_DIR, new_image_filename)
            shutil.copyfile(old_path, new_path)
    
    new_guest = GuestVisit(
        name=f"{original.name} (Copy)",
        about=original.about,
        greeting_message=original.greeting_message,
        image_filename=new_image_filename,
        is_active=False,  # Created in disabled mode as requested
        created_by=current_user.id
    )
    db.add(new_guest)
    db.commit()
    db.refresh(new_guest)
    
    return {
        "message": f"Duplicated guest profile '{new_guest.name}' in disabled mode.",
        "id": new_guest.id,
        "guest": {
            "id": new_guest.id,
            "name": new_guest.name,
            "about": new_guest.about,
            "greeting_message": new_guest.greeting_message,
            "image_url": f"/guest_images/{new_guest.image_filename}" if new_guest.image_filename else None,
            "is_active": new_guest.is_active,
            "created_at": new_guest.created_at
        }
    }

# ── Admin: Toggle guest cards visibility ──
@router.post("/api/admin/guests/toggle-cards")
def toggle_guest_cards(db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    config = db.query(LibraryConfig).first()
    if not config:
        config = LibraryConfig()
        db.add(config)
        db.commit()
        db.refresh(config)
    
    config.show_guest_cards = not config.show_guest_cards
    db.commit()
    return {"show_guest_cards": config.show_guest_cards, "message": f"Guest cards {'enabled' if config.show_guest_cards else 'disabled'} on login page."}

