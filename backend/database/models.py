import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, Enum, DateTime, Text, JSON, ForeignKey
from .db import Base

class RoleEnum(enum.Enum):
    user = "user"
    admin = "admin"

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True, nullable=True)
    hashed_password = Column(String)
    role = Column(Enum(RoleEnum), default=RoleEnum.user)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_login = Column(DateTime, nullable=True)

class Book(Base):
    __tablename__ = "books"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    author = Column(String, index=True)
    department = Column(String, index=True, nullable=True)
    rack = Column(String, nullable=True)
    floor = Column(String, nullable=True)
    copies = Column(Integer, default=1)
    available = Column(Integer, default=1)
    isbn = Column(String, unique=True, index=True, nullable=True)
    keywords_json = Column(JSON, nullable=True)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Department(Base):
    __tablename__ = "departments"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    hod = Column(String, nullable=True)
    building = Column(String, nullable=True)
    floor = Column(String, nullable=True)
    programs = Column(JSON, nullable=True)
    location = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class Upload(Base):
    __tablename__ = "uploads"
    
    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String)
    file_type = Column(String)
    status = Column(String) # pending, processing, completed, failed
    message = Column(Text, nullable=True)
    sha256_hash = Column(String, nullable=True)
    uploaded_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class EmbeddingRecord(Base):
    __tablename__ = "embedding_records"
    
    id = Column(Integer, primary_key=True, index=True)
    upload_id = Column(Integer, ForeignKey("uploads.id"))
    chunk_count = Column(Integer, default=0)
    status = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

class ConversationHistory(Base):
    __tablename__ = "conversation_history"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    query = Column(Text)
    response = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

class AdminLog(Base):
    __tablename__ = "admin_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    admin_id = Column(Integer, ForeignKey("users.id"))
    action = Column(String)
    details = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class VoiceSession(Base):
    __tablename__ = "voice_sessions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    started_at = Column(DateTime, default=datetime.utcnow)
    ended_at = Column(DateTime, nullable=True)
    query_count = Column(Integer, default=0)

class LoginHistory(Base):
    __tablename__ = "login_history"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    ip_address = Column(String, nullable=True)
    success = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class LibraryConfig(Base):
    __tablename__ = "library_config"
    
    id = Column(Integer, primary_key=True, index=True)
    floors = Column(Integer, default=2)
    rows_per_floor = Column(Integer, default=2) # e.g. A and B on floor 1
    cols_per_row = Column(Integer, default=6) # e.g. 1 to 6
    shelves_per_rack = Column(Integer, default=4)
    pois = Column(JSON, default=list)
    custom_racks = Column(JSON, default=dict)
    custom_layout = Column(JSON, default=dict)
    
    # Global Settings
    library_name = Column(String, default="University Library")
    opening_hours = Column(String, default="Mon-Fri: 8AM-8PM, Sat-Sun: 10AM-4PM")
    library_policies = Column(String, default="Students can borrow up to 3 books for 14 days.")
    voice_preset = Column(String, default="en-US-AriaNeural")
    
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
