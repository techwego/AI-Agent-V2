# backend/database/__init__.py
from .db import engine, SessionLocal, get_db, init_db
from .models import Base
