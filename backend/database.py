import sqlite3
import os
import json
from typing import List, Dict, Optional

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads.db")

def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    # Documents table acts as the source of truth for all files
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS documents (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            filename TEXT UNIQUE NOT NULL,
            document_type TEXT NOT NULL,
            status TEXT NOT NULL,
            sha256_hash TEXT,
            message TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Chunks table links a document to its ChromaDB vector IDs
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS chunks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            document_id INTEGER NOT NULL,
            chroma_id TEXT NOT NULL,
            FOREIGN KEY (document_id) REFERENCES documents (id) ON DELETE CASCADE
        )
    ''')
    conn.commit()
    conn.close()

def upsert_document(filename: str, doc_type: str, status: str, sha256_hash: str = "", message: str = "") -> int:
    """Insert or update a document record."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute('SELECT id FROM documents WHERE filename = ?', (filename,))
    row = cursor.fetchone()
    
    if row:
        doc_id = row[0]
        cursor.execute('''
            UPDATE documents 
            SET status = ?, sha256_hash = ?, message = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        ''', (status, sha256_hash, message, doc_id))
    else:
        cursor.execute('''
            INSERT INTO documents (filename, document_type, status, sha256_hash, message)
            VALUES (?, ?, ?, ?, ?)
        ''', (filename, doc_type, status, sha256_hash, message))
        doc_id = cursor.lastrowid
        
    conn.commit()
    conn.close()
    return doc_id

def get_document_by_filename(filename: str) -> Optional[Dict]:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM documents WHERE filename = ?', (filename,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None

def update_document_status(doc_id: int, status: str, message: str = ""):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('''
        UPDATE documents
        SET status = ?, message = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    ''', (status, message, doc_id))
    conn.commit()
    conn.close()

def clear_document_chunks(document_id: int):
    """Remove all chunk references for a document before re-indexing."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('DELETE FROM chunks WHERE document_id = ?', (document_id,))
    conn.commit()
    conn.close()

def save_document_chunks(document_id: int, chroma_ids: List[str]):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    for cid in chroma_ids:
        cursor.execute('INSERT INTO chunks (document_id, chroma_id) VALUES (?, ?)', (document_id, cid))
    conn.commit()
    conn.close()

def get_document_chunks(document_id: int) -> List[str]:
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('SELECT chroma_id FROM chunks WHERE document_id = ?', (document_id,))
    rows = cursor.fetchall()
    conn.close()
    return [row[0] for row in rows]

def get_all_documents() -> List[Dict]:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM documents ORDER BY updated_at DESC')
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

def get_dashboard_metrics() -> Dict:
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('SELECT COUNT(*) FROM documents')
    total_docs = cursor.fetchone()[0]
    cursor.execute('SELECT COUNT(*) FROM chunks')
    total_chunks = cursor.fetchone()[0]
    conn.close()
    return {
        "total_documents": total_docs,
        "total_chunks": total_chunks
    }
