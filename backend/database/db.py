import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./library.db")

engine = create_engine(
    DATABASE_URL, connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    Base.metadata.create_all(bind=engine)
    # Ensure custom_layout column exists in library_config table for existing SQLite databases
    if DATABASE_URL.startswith("sqlite"):
        try:
            with engine.connect() as conn:
                from sqlalchemy import text
                res = conn.execute(text("PRAGMA table_info(library_config)")).fetchall()
                col_names = [r[1] for r in res]
                if col_names and "custom_layout" not in col_names:
                    conn.execute(text("ALTER TABLE library_config ADD COLUMN custom_layout JSON DEFAULT '{}'"))
                
                # Global Settings migrations
                if col_names and "library_name" not in col_names:
                    conn.execute(text("ALTER TABLE library_config ADD COLUMN library_name VARCHAR DEFAULT 'University Library'"))
                if col_names and "opening_hours" not in col_names:
                    conn.execute(text("ALTER TABLE library_config ADD COLUMN opening_hours VARCHAR DEFAULT 'Mon-Fri: 8AM-8PM, Sat-Sun: 10AM-4PM'"))
                if col_names and "library_policies" not in col_names:
                    conn.execute(text("ALTER TABLE library_config ADD COLUMN library_policies VARCHAR DEFAULT 'Students can borrow up to 3 books for 14 days.'"))
                if col_names and "voice_preset" not in col_names:
                    conn.execute(text("ALTER TABLE library_config ADD COLUMN voice_preset VARCHAR DEFAULT 'en-US-AriaNeural'"))
                
                # Ensure books.isbn index is non-unique to support empty/multiple duplicate values
                try:
                    conn.execute(text("DROP INDEX IF EXISTS ix_books_isbn"))
                    conn.execute(text("CREATE INDEX IF NOT EXISTS ix_books_isbn ON books (isbn)"))
                    conn.execute(text("UPDATE books SET isbn = NULL WHERE isbn = ''"))
                except Exception:
                    pass
                    
                conn.commit()
        except Exception as e:
            print(f"DB Migration Note: {e}")
