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
                    conn.commit()
        except Exception as e:
            print(f"DB Migration Note: {e}")
