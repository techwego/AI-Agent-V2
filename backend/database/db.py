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
    # Ensure all required columns exist in SQLite database
    if DATABASE_URL.startswith("sqlite"):
        try:
            with engine.connect() as conn:
                from sqlalchemy import text
                
                # Check library_config table
                res = conn.execute(text("PRAGMA table_info(library_config)")).fetchall()
                col_names = [r[1] for r in res]
                if col_names:
                    if "custom_racks" not in col_names:
                        conn.execute(text("ALTER TABLE library_config ADD COLUMN custom_racks JSON DEFAULT '{}'"))
                    if "custom_layout" not in col_names:
                        conn.execute(text("ALTER TABLE library_config ADD COLUMN custom_layout JSON DEFAULT '{}'"))
                    if "pois" not in col_names:
                        conn.execute(text("ALTER TABLE library_config ADD COLUMN pois JSON DEFAULT '[]'"))
                    if "college_name" not in col_names:
                        conn.execute(text("ALTER TABLE library_config ADD COLUMN college_name VARCHAR DEFAULT 'Anna University'"))
                    if "library_name" not in col_names:
                        conn.execute(text("ALTER TABLE library_config ADD COLUMN library_name VARCHAR DEFAULT 'Anna University Central Library'"))
                    if "agent_name" not in col_names:
                        conn.execute(text("ALTER TABLE library_config ADD COLUMN agent_name VARCHAR DEFAULT 'Sam'"))
                    if "greeting_message" not in col_names:
                        conn.execute(text("ALTER TABLE library_config ADD COLUMN greeting_message VARCHAR DEFAULT 'How can I assist you today?'"))
                    if "opening_hours" not in col_names:
                        conn.execute(text("ALTER TABLE library_config ADD COLUMN opening_hours VARCHAR DEFAULT 'Mon-Fri: 8:00 AM - 8:00 PM, Sat: 9:00 AM - 5:00 PM'"))
                    if "library_policies" not in col_names:
                        conn.execute(text("ALTER TABLE library_config ADD COLUMN library_policies VARCHAR DEFAULT 'Students can borrow up to 3 books for 14 days.'"))
                    if "additional_details" not in col_names:
                        conn.execute(text("ALTER TABLE library_config ADD COLUMN additional_details TEXT DEFAULT 'Wi-Fi is available throughout the library. Quiet reading rooms are located on Floor 2.'"))
                    if "voice_preset" not in col_names:
                        conn.execute(text("ALTER TABLE library_config ADD COLUMN voice_preset VARCHAR DEFAULT 'en-IN-Pallavi'"))
                    if "show_guest_cards" not in col_names:
                        conn.execute(text("ALTER TABLE library_config ADD COLUMN show_guest_cards BOOLEAN DEFAULT 0"))
                
                # Check circulars table
                c_res = conn.execute(text("PRAGMA table_info(circulars)")).fetchall()
                c_col_names = [r[1] for r in c_res]
                if c_col_names:
                    if "event_date" not in c_col_names:
                        conn.execute(text("ALTER TABLE circulars ADD COLUMN event_date VARCHAR"))
                    if "category" not in c_col_names:
                        conn.execute(text("ALTER TABLE circulars ADD COLUMN category VARCHAR DEFAULT 'General'"))
                    if "expires_at" not in c_col_names:
                        conn.execute(text("ALTER TABLE circulars ADD COLUMN expires_at DATETIME"))
                    if "is_active" not in c_col_names:
                        conn.execute(text("ALTER TABLE circulars ADD COLUMN is_active BOOLEAN DEFAULT 1"))
                
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

