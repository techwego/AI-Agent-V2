"""
Production-Grade Library RAG Engine
====================================
- Embedding: BAAI/bge-small-en-v1.5
- Chunking: Token-aware (512 tokens, 80 overlap, sentence-boundary)
- Metadata: source, page, section, document_type
- Retrieval: Hybrid (Vector + BM25) with Reciprocal Rank Fusion
- Reranking: cross-encoder/ms-marco-MiniLM-L-6-v2 (top 20 → top 3)
- LLM: Gemini 2.5 Flash with structured provenance prompts
- Streaming: Token-by-token via google-genai SDK
"""

import os
import re
import time
import hashlib
import chromadb
import tiktoken
from fastembed import TextEmbedding
from rank_bm25 import BM25Okapi
from google import genai
from backend.config import Config

# ---------------------------------------------------------------------------
# Token-Aware Sentence Chunker
# ---------------------------------------------------------------------------

class TokenChunker:
    """Splits text into overlapping chunks of ~target_tokens, never mid-sentence."""

    def __init__(self, target_tokens: int = 512, overlap_tokens: int = 80):
        self.target_tokens = target_tokens
        self.overlap_tokens = overlap_tokens
        self.enc = tiktoken.get_encoding("cl100k_base")

    def _split_sentences(self, text: str) -> list[str]:
        """Split text into sentences, handling abbreviations and decimals."""
        # Protect common abbreviations
        text = re.sub(r'\b(Dr|Mr|Mrs|Ms|Prof|Sr|Jr|etc|vs|Fig|Vol|No)\.',
                      r'\1<DOT>', text)
        # Protect decimals (e.g., 3.14)
        text = re.sub(r'(\d)\.([\d])', r'\1<DOT>\2', text)

        # Split on sentence boundaries
        parts = re.split(r'(?<=[.?!])\s+', text)

        # Restore dots
        return [p.replace('<DOT>', '.') for p in parts if p.strip()]

    def _count_tokens(self, text: str) -> int:
        return len(self.enc.encode(text, disallowed_special=()))

    def chunk(self, text: str, metadata_base: dict | None = None) -> list[dict]:
        """
        Returns list of {"text": ..., "metadata": {...}, "token_count": int}
        """
        sentences = self._split_sentences(text)
        if not sentences:
            return []

        chunks = []
        current_sentences: list[str] = []
        current_tokens = 0

        for sent in sentences:
            sent_tokens = self._count_tokens(sent)

            # If a single sentence exceeds target, it becomes its own chunk
            if sent_tokens > self.target_tokens:
                if current_sentences:
                    chunk_text = " ".join(current_sentences)
                    chunks.append({
                        "text": chunk_text,
                        "token_count": current_tokens,
                        "metadata": dict(metadata_base or {}),
                    })
                    current_sentences = []
                    current_tokens = 0
                chunks.append({
                    "text": sent,
                    "token_count": sent_tokens,
                    "metadata": dict(metadata_base or {}),
                })
                continue

            # Would adding this sentence exceed the target?
            if current_tokens + sent_tokens > self.target_tokens and current_sentences:
                chunk_text = " ".join(current_sentences)
                chunks.append({
                    "text": chunk_text,
                    "token_count": current_tokens,
                    "metadata": dict(metadata_base or {}),
                })

                # Overlap: keep trailing sentences up to overlap_tokens
                overlap_sents: list[str] = []
                overlap_tok = 0
                for s in reversed(current_sentences):
                    s_tok = self._count_tokens(s)
                    if overlap_tok + s_tok > self.overlap_tokens:
                        break
                    overlap_sents.insert(0, s)
                    overlap_tok += s_tok

                current_sentences = overlap_sents
                current_tokens = overlap_tok

            current_sentences.append(sent)
            current_tokens += sent_tokens

        # Flush remaining
        if current_sentences:
            chunk_text = " ".join(current_sentences)
            chunks.append({
                "text": chunk_text,
                "token_count": current_tokens,
                "metadata": dict(metadata_base or {}),
            })

        return chunks


# ---------------------------------------------------------------------------
# Document Reader with Rich Metadata
# ---------------------------------------------------------------------------

class DocumentReader:
    """Reads files and extracts text with page/section metadata."""

    @staticmethod
    def read(filepath: str) -> list[dict]:
        """
        Returns list of {"text": str, "metadata": dict} where metadata includes
        source, page, section, document_type.
        """
        ext = os.path.splitext(filepath)[1].lower()
        filename = os.path.basename(filepath)
        base_meta = {
            "source": filename,
            "document_type": ext.lstrip("."),
        }

        try:
            if ext == ".pdf":
                return DocumentReader._read_pdf(filepath, base_meta)
            elif ext == ".docx":
                return DocumentReader._read_docx(filepath, base_meta)
            elif ext in (".xls", ".xlsx"):
                return DocumentReader._read_excel(filepath, base_meta)
            elif ext == ".csv":
                return DocumentReader._read_csv(filepath, base_meta)
            else:
                return DocumentReader._read_text(filepath, base_meta)
        except Exception as e:
            print(f"  Error reading {filepath}: {e}")
            return []

    @staticmethod
    def _read_pdf(filepath: str, base_meta: dict) -> list[dict]:
        import pypdf
        reader = pypdf.PdfReader(filepath)
        pages = []
        for i, page in enumerate(reader.pages):
            text = page.extract_text() or ""
            if text.strip():
                meta = {**base_meta, "page": i + 1}
                pages.append({"text": text, "metadata": meta})
        return pages

    @staticmethod
    def _read_docx(filepath: str, base_meta: dict) -> list[dict]:
        import docx2txt
        text = docx2txt.process(filepath)
        if not text or not text.strip():
            return []
        # Try to detect sections by heading-like lines
        sections = DocumentReader._detect_sections(text)
        result = []
        for section_name, section_text in sections:
            meta = {**base_meta, "section": section_name}
            result.append({"text": section_text, "metadata": meta})
        return result if result else [{"text": text, "metadata": {**base_meta, "section": "full"}}]

    @staticmethod
    def _read_csv(filepath: str, base_meta: dict) -> list[dict]:
        import csv
        results = []
        
        with open(filepath, mode="r", encoding="utf-8", errors="ignore") as f:
            reader = csv.DictReader(f)
            for row in reader:
                lines = []
                meta = {**base_meta, "section": "Catalog"}
                
                # Extract and map standard fields
                title = row.get("Book Name") or row.get("Title") or row.get("Book_Name")
                author = row.get("Author")
                rack = row.get("Rack") or row.get("Location")
                shelf = row.get("Shelf")
                copies = row.get("Copies") or row.get("Available")
                
                if title: lines.append(f"Title: {title}")
                if author: lines.append(f"Author: {author}")
                if rack: lines.append(f"Rack: {rack}")
                if shelf: lines.append(f"Shelf: {shelf}")
                if copies: lines.append(f"Available Copies: {copies}")
                
                # Add all valid fields to metadata for ChromaDB filtering
                for k, v in row.items():
                    val = str(v).strip() if v else ""
                    if val:
                        meta[str(k).lower().replace(" ", "_")] = val
                        # Add any non-standard fields to text block as well
                        if k not in ["Book Name", "Title", "Book_Name", "Author", "Rack", "Location", "Shelf", "Copies", "Available"]:
                            lines.append(f"{k}: {val}")
                            
                text_block = "\n".join(lines)
                if text_block.strip():
                    results.append({"text": text_block, "metadata": meta})
                    
        return results

    @staticmethod
    def _read_excel(filepath: str, base_meta: dict) -> list[dict]:
        import pandas as pd
        df = pd.read_excel(filepath)
        text = df.to_string()
        if not text.strip():
            return []
        return [{"text": text, "metadata": {**base_meta, "section": "spreadsheet"}}]

    @staticmethod
    def _read_text(filepath: str, base_meta: dict) -> list[dict]:
        with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
            text = f.read()
        if not text.strip():
            return []
        sections = DocumentReader._detect_sections(text)
        result = []
        for section_name, section_text in sections:
            meta = {**base_meta, "section": section_name}
            result.append({"text": section_text, "metadata": meta})
        return result if result else [{"text": text, "metadata": {**base_meta, "section": "full"}}]

    @staticmethod
    def _detect_sections(text: str) -> list[tuple[str, str]]:
        """
        Detect section headings (lines in ALL CAPS, or lines starting with #,
        or short lines followed by longer content).
        Returns [(section_name, section_text), ...]
        """
        lines = text.split("\n")
        sections = []
        current_heading = "introduction"
        current_lines = []

        for line in lines:
            stripped = line.strip()
            # Detect heading patterns
            is_heading = False
            if stripped and len(stripped) < 100:
                if stripped.startswith("#"):
                    is_heading = True
                    stripped = stripped.lstrip("#").strip()
                elif stripped.isupper() and len(stripped) > 3:
                    is_heading = True
                elif re.match(r'^(?:Chapter|Section|Part|CHAPTER|SECTION)\s+\d', stripped):
                    is_heading = True

            if is_heading and current_lines:
                section_text = "\n".join(current_lines)
                if section_text.strip():
                    sections.append((current_heading, section_text))
                current_heading = stripped[:80]
                current_lines = []
            else:
                current_lines.append(line)

        # Flush remaining
        if current_lines:
            section_text = "\n".join(current_lines)
            if section_text.strip():
                sections.append((current_heading, section_text))

        return sections


# ---------------------------------------------------------------------------
# Production RAG Engine
# ---------------------------------------------------------------------------

import enum
import pickle

class RAGState(str, enum.Enum):
    INITIALIZING = "INITIALIZING"
    LOADING_MODELS = "LOADING_MODELS"
    LOADING_DATABASE = "LOADING_DATABASE"
    BUILDING_INDEX = "BUILDING_INDEX"
    READY = "READY"
    ERROR = "ERROR"

class LibraryRAG:
    """
    Production-grade Retrieval-Augmented Generation engine.
    Pipeline: Embed → Hybrid Search (Vector+BM25) → Rerank → Gemini Stream
    """

    def __init__(self, data_dir: str = Config.DATA_DIR, persist_dir: str = Config.PERSIST_DIR):
        self.data_dir = data_dir
        self.persist_dir = persist_dir
        self.chunker = TokenChunker(target_tokens=1000, overlap_tokens=80)

        self.state = RAGState.INITIALIZING
        self.diagnostics = {
            "startup_time": 0,
            "models_time": 0,
            "db_time": 0,
            "bm25_time": 0,
            "total_chunks": 0,
            "memory_mb": 0,
            "status_message": "Starting initialization..."
        }

        # Models are loaded in initialize() (background thread) to prevent blocking server boot
        self.embed_model = None
        self.reranker = None
        
        # State
        self.llm_engine = None
        self.collection = None
        self.bm25_index = None
        self.bm25_doc_map: list[dict] = []

    @property
    def ready(self) -> bool:
        return self.state == RAGState.READY

    def initialize(self):
        """Load ChromaDB, build BM25 index, connect to Groq."""
        try:
            startup_t0 = time.time()
            api_key = Config.GROQ_API_KEY
            
            # Load ML Models in background to prevent Uvicorn boot crash
            self.state = RAGState.LOADING_MODELS
            t_mod = time.time()
            if Config.DEBUG_MODE:
                print(f"Loading embedding model: {Config.EMBEDDING_MODEL} (fastembed ONNX)")
            
            self.embed_model = TextEmbedding(Config.EMBEDDING_MODEL, threads=1)
            self.diagnostics["models_time"] = round(time.time() - t_mod, 3)
            
            # ChromaDB
            self.state = RAGState.LOADING_DATABASE
            t_db = time.time()
            self.chroma_client = chromadb.PersistentClient(path=self.persist_dir)
            self.collection = self.chroma_client.get_or_create_collection(
                "library_data_v2",
                metadata={"hnsw:space": "cosine"},
            )

            if self.collection.count() == 0:
                print("ChromaDB is empty. Waiting for admin data upload.")
                chunk_count = 0
            else:
                chunk_count = self.collection.count()

            self.diagnostics["total_chunks"] = chunk_count
            self.diagnostics["db_time"] = round(time.time() - t_db, 3)
                
            print(f"ChromaDB loaded: {chunk_count} chunks")

            # Build BM25 index from ChromaDB contents
            self.state = RAGState.BUILDING_INDEX
            t_bm25 = time.time()
            self._build_or_load_bm25_index()
            self.diagnostics["bm25_time"] = round(time.time() - t_bm25, 3)

            self._build_or_load_sqlite_index()

            if api_key and api_key != "dummy_key_for_local_db_generation":
                from backend.llm.groq_engine import GroqEngine
                self.llm_engine = GroqEngine()
                
                # Execute warm-up request
                self._warmup_pipeline()
                
                self.state = RAGState.READY
                self.diagnostics["startup_time"] = round(time.time() - startup_t0, 3)
                
                print("\n=========================")
                print("STARTUP REPORT")
                print("=========================")
                print(f"Embedding Model : {self.diagnostics['models_time']} s")
                print(f"ChromaDB        : {self.diagnostics['db_time']} s")
                print(f"BM25            : {self.diagnostics['bm25_time']} s")
                print(f"Chunks          : {chunk_count}")
                print(f"Total           : {self.diagnostics['startup_time']} s")
                print(f"Status          : {self.state.value}")
                print("=========================\n")
            else:
                print("DB generation mode complete (offline).")
                self.state = RAGState.READY
                self.diagnostics["startup_time"] = round(time.time() - startup_t0, 3)
                
        except Exception as e:
            self.state = RAGState.ERROR
            self.diagnostics["status_message"] = f"Initialization failed: {e}"
            print(f"[ERROR] RAG Initialization Failed: {e}")

    # ------------------------------------------------------------------

    def _build_or_load_sqlite_index(self):
        import sqlite3
        db_path = os.path.join(self.persist_dir, "book_index.db")
        self.sqlite_conn = sqlite3.connect(db_path, check_same_thread=False)
        cursor = self.sqlite_conn.cursor()
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS book_index (
                id TEXT PRIMARY KEY,
                title TEXT,
                author TEXT,
                subject TEXT,
                call_number TEXT,
                location TEXT,
                copies TEXT,
                normalized_title TEXT,
                normalized_author TEXT,
                chroma_id TEXT
            )
        ''')
        
        cursor.execute("SELECT COUNT(*) FROM book_index")
        count = cursor.fetchone()[0]
        
        if self.collection:
            print("SQLite: Syncing index from ChromaDB & Library DB...")
            results = self.collection.get(include=["metadatas"])
            if results and results["metadatas"]:
                chroma_rows = []
                for i, meta in enumerate(results["metadatas"]):
                    chroma_id = results["ids"][i] if "ids" in results and results["ids"] else str(i)
                    title = meta.get("title") or meta.get("book_name") or ""
                    author = meta.get("author") or ""
                    subject = meta.get("subject") or ""
                    call_number = meta.get("call_number") or ""
                    location = meta.get("location") or meta.get("rack") or meta.get("shelf") or ""
                    copies = meta.get("copies") or meta.get("available") or ""
                    
                    norm_title = str(title).lower().strip()
                    norm_author = str(author).lower().strip()
                    chroma_rows.append((str(i), str(title), str(author), str(subject), str(call_number), str(location), str(copies), norm_title, norm_author, chroma_id))
                
                if chroma_rows:
                    cursor.executemany('''
                        INSERT OR REPLACE INTO book_index (id, title, author, subject, call_number, location, copies, normalized_title, normalized_author, chroma_id)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ''', chroma_rows)
        
        # Also sync from SQLite library.db books table if available
        try:
            lib_db_path = os.path.join(self.data_dir, "..", "database", "library.db")
            if not os.path.exists(lib_db_path):
                lib_db_path = "library.db"
            if os.path.exists(lib_db_path):
                lib_conn = sqlite3.connect(lib_db_path)
                lib_cursor = lib_conn.cursor()
                lib_books = lib_cursor.execute("SELECT id, title, author, rack, copies, available FROM books").fetchall()
                lib_rows = []
                for b_id, b_title, b_author, b_rack, b_copies, b_avail in lib_books:
                    if b_title:
                        n_title = str(b_title).lower().strip()
                        n_author = str(b_author or "").lower().strip()
                        rack_str = str(b_rack or "").replace("Rack ", "").strip()
                        c_str = str(b_avail if b_avail is not None else (b_copies or ""))
                        lib_rows.append((f"lib_{b_id}", str(b_title), str(b_author or ""), "", "", rack_str, c_str, n_title, n_author, f"lib_{b_id}"))
                
                if lib_rows:
                    cursor.executemany('''
                        INSERT OR REPLACE INTO book_index (id, title, author, subject, call_number, location, copies, normalized_title, normalized_author, chroma_id)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ''', lib_rows)
                lib_conn.close()
                print(f"SQLite: Fast-synced {len(lib_books)} books from library.db")
        except Exception as ex:
            print(f"SQLite index sync warning: {ex}")
            
        self.sqlite_conn.commit()

    def _rebuild_sqlite_index(self):
        """Drops and recreates the SQLite index from ChromaDB."""
        if not hasattr(self, 'sqlite_conn') or not self.sqlite_conn:
            import sqlite3
            db_path = os.path.join(self.persist_dir, "book_index.db")
            self.sqlite_conn = sqlite3.connect(db_path, check_same_thread=False)
        
        cursor = self.sqlite_conn.cursor()
        cursor.execute("DROP TABLE IF EXISTS book_index")
        self.sqlite_conn.commit()
        
        # Now call the original builder to recreate it
        self._build_or_load_sqlite_index()

    def _metadata_lookup(self, query: str, field: str = None) -> list[dict]:
        try:
            from backend.database.db import SessionLocal
            from backend.database.models import Book
            from sqlalchemy import or_
            db = SessionLocal()
            query_norm = query.lower().strip()
            stopwords = {"where", "is", "are", "the", "a", "an", "in", "of", "for", "to", "on", "at", "by", "book", "books", "find", "search", "get", "tell", "me", "about", "show", "path", "locate", "available", "copies", "rack", "written", "author", "do", "you", "have", "can", "i", "please", "we"}
            words = [w for w in query_norm.split() if w not in stopwords and len(w) > 1]
            
            if not words and not query_norm:
                db.close()
                return []
                
            matched_books = []
            seen_ids = set()
            
            if field == "author":
                q = db.query(Book)
                for w in (words if words else [query_norm]):
                    q = q.filter(Book.author.ilike(f"%{w}%"))
                matched_books = q.limit(10).all()
            elif field == "location":
                matched_books = db.query(Book).filter(Book.rack.ilike(f"%{query_norm}%")).limit(10).all()
            elif field == "call_number":
                matched_books = db.query(Book).filter(Book.isbn.ilike(f"%{query_norm}%")).limit(10).all()
            elif field == "title":
                # 1. Exact or substring full title match
                if query_norm:
                    for b in db.query(Book).filter(Book.title.ilike(f"%{query_norm}%")).limit(10).all():
                        if b.id not in seen_ids:
                            seen_ids.add(b.id)
                            matched_books.append(b)
                # 2. All keywords match title
                if words and not matched_books:
                    q = db.query(Book)
                    for w in words:
                        q = q.filter(Book.title.ilike(f"%{w}%"))
                    for b in q.limit(10).all():
                        if b.id not in seen_ids:
                            seen_ids.add(b.id)
                            matched_books.append(b)
                # 3. Any keyword matches title or author
                if words and not matched_books:
                    for w in words:
                        if len(w) >= 3:
                            for b in db.query(Book).filter(or_(Book.title.ilike(f"%{w}%"), Book.author.ilike(f"%{w}%"))).limit(5).all():
                                if b.id not in seen_ids:
                                    seen_ids.add(b.id)
                                    matched_books.append(b)
            else:
                # General search across title, author, and rack
                if query_norm:
                    for b in db.query(Book).filter(or_(Book.title.ilike(f"%{query_norm}%"), Book.author.ilike(f"%{query_norm}%"), Book.rack.ilike(f"%{query_norm}%"))).limit(10).all():
                        if b.id not in seen_ids:
                            seen_ids.add(b.id)
                            matched_books.append(b)
                if words and not matched_books:
                    q = db.query(Book)
                    for w in words:
                        q = q.filter(or_(Book.title.ilike(f"%{w}%"), Book.author.ilike(f"%{w}%"), Book.rack.ilike(f"%{w}%")))
                    for b in q.limit(10).all():
                        if b.id not in seen_ids:
                            seen_ids.add(b.id)
                            matched_books.append(b)
                
            results = []
            for b in matched_books:
                title, author, subject, call_num, loc, floor, copies, avail, desc = (
                    b.title, b.author, b.department, b.isbn, b.rack, b.floor, b.copies, b.available, b.description
                )
                total_copies = copies if copies is not None else 1
                avail_copies = avail if avail is not None else total_copies
                text_content = f"Title: {title}\nAuthor: {author}\n"
                if subject: text_content += f"Subject / Department: {subject}\n"
                if call_num: text_content += f"ISBN / Call Number: {call_num}\n"
                if loc: text_content += f"Rack: {loc}\n"
                if floor: text_content += f"Floor: {floor}\n"
                text_content += f"Available Copies: {avail_copies}\n"
                text_content += f"Total Copies: {total_copies}\n"
                if desc: text_content += f"Description: {desc}\n"
                
                results.append({
                    "text": text_content,
                    "metadata": {
                        "title": title,
                        "author": author,
                        "location": loc or "",
                        "rack": loc or "",
                        "floor": floor or "1",
                        "copies": total_copies,
                        "available": avail_copies,
                        "source": "live_database"
                    },
                    "score": 0.98
                })
                
            db.close()
            return results
        except Exception as e:
            print(f"SQL lookup failed: {e}")
            return []

    def _validate_record(self, query: str, record: dict) -> bool:
        title = record.get("metadata", {}).get("title", "")
        if not title:
            m = re.search(r'Title:\s*(.*)', record.get("text", ""))
            if m:
                title = m.group(1)
                
        if not title:
            return True
            
        query_words = set(re.findall(r'\w+', query.lower()))
        title_words = set(re.findall(r'\w+', title.lower()))
        
        if not query_words or not title_words:
            return True
            
        overlap = len(query_words.intersection(title_words))
        ratio = max(overlap / len(query_words), overlap / len(title_words))
        
        if ratio < 0.3:
            print(f"Validator: Rejected record '{title}' (overlap ratio: {ratio:.2f})")
            return False
            
        return True

    def search_catalog(self, query: str, limit: int = 15) -> list[dict]:
        """
        Enterprise-grade catalog search:
        1. Exact/Substring Title & Author SQL search on book_index
        2. Rack/Location search
        3. Hybrid Vector + BM25 search with relevance thresholding
        4. Deduplication and normalized score scaling (0.0 to 1.0)
        """
        if not query or not query.strip():
            return []

        raw_q = query.strip()
        clean_q = re.sub(r'[^\w\s]', ' ', raw_q).strip()
        lower_q = clean_q.lower()
        stopwords = {"the", "a", "an", "is", "in", "of", "for", "to", "on", "at", "by", "book", "books"}
        words = [w for w in lower_q.split() if len(w) > 1 and w not in stopwords]
        if not words:
            words = [w for w in lower_q.split() if len(w) > 0]

        results = []
        seen_keys = set()

        try:
            from backend.database.db import SessionLocal
            from backend.database.models import Book
            db = SessionLocal()
            
            all_sql = []
            
            # Exact Title
            exact_matches = db.query(Book).filter(Book.title.ilike(f"{raw_q}")).all()
            for b in exact_matches:
                all_sql.append((b, 1.0, "Exact Match"))
                
            # Multi-word Title
            if words:
                multi_query = db.query(Book)
                for w in words:
                    multi_query = multi_query.filter(Book.title.ilike(f"%{w}%"))
                for b in multi_query.all():
                    if b.id not in [x[0].id for x in all_sql]:
                        all_sql.append((b, 0.95, "Title Match"))
                        
            # Author
            if words:
                author_query = db.query(Book)
                for w in words:
                    author_query = author_query.filter(Book.author.ilike(f"%{w}%"))
                for b in author_query.all():
                    if b.id not in [x[0].id for x in all_sql]:
                        all_sql.append((b, 0.90, "Author Match"))
                        
            # Rack
            rack_matches = db.query(Book).filter(Book.rack.ilike(f"%{raw_q}%")).all()
            for b in rack_matches:
                if b.id not in [x[0].id for x in all_sql]:
                    all_sql.append((b, 0.88, "Rack Match"))

            for b, score, match_type in all_sql:
                title, author, subject, call_num, loc, copies = b.title, b.author, b.department, b.isbn, b.rack, b.copies
                # Format into chunks for RAG
                text_content = f"Title: {title}\nAuthor: {author}\n"
                if subject: text_content += f"Subject: {subject}\n"
                if call_num: text_content += f"Call Number: {call_num}\n"
                if loc: text_content += f"Rack: {loc}\n"
                if copies: text_content += f"Available Copies: {copies}\n"
                
                key = f"{title}_{author}"
                if key not in seen_keys:
                    seen_keys.add(key)
                    results.append({
                        "text": text_content,
                        "metadata": {
                            "title": title,
                            "author": author,
                            "location": loc,
                            "copies": copies,
                            "source": "live_db"
                        },
                        "score": score
                    })
            db.close()
        except Exception as e:
            print(f"SQL search failed: {e}")

        # If direct SQL metadata search found relevant results, return them! (No noise)
        if results:
            return results[:limit]

        # E. Hybrid Vector + BM25 search fallback if no direct SQL match
        vector_hits = self._vector_search(query, top_k=20)
        bm25_hits = self._bm25_search(query, top_k=20)
        combined = self._reciprocal_rank_fusion(vector_hits, bm25_hits)

        for c in combined[:20]:
            meta = c.get("metadata", {})
            title = meta.get("title") or meta.get("Title") or ""
            author = meta.get("author") or meta.get("Author") or ""
            key = f"{str(title).lower()}_{str(author).lower()}"
            if key in seen_keys:
                continue

            if self._validate_record(query, c):
                seen_keys.add(key)
                raw_score = c.get("rerank_score", 0.5)
                norm_score = max(0.70, min(0.92, raw_score * 35))
                results.append({
                    "id": key,
                    "score": round(norm_score, 2),
                    "match_type": "Semantic Match",
                    "text": c.get("text", ""),
                    "metadata": {
                        "title": title if title else "Library Document",
                        "author": author,
                        "subject": meta.get("subject", ""),
                        "location": meta.get("location") or meta.get("rack") or "",
                        "rack": meta.get("location") or meta.get("rack") or "",
                        "copies": meta.get("copies", ""),
                        "source": "Library Catalog"
                    }
                })

        return results[:limit]

    # ------------------------------------------------------------------
    # BM25 Index
    # ------------------------------------------------------------------

    def _build_or_load_bm25_index(self):
        """Load the pre-built BM25 index from cache."""
        t0 = time.time()
        cache_path = os.path.join(self.persist_dir, "bm25_cache.pkl")
        
        if not os.path.exists(cache_path):
            print("BM25: Cache missing. Please run index_books.py")
            return
            
        try:
            with open(cache_path, "rb") as f:
                cache_data = pickle.load(f)
            self.bm25_index = cache_data["index"]
            self.bm25_doc_map = cache_data["doc_map"]
            total = cache_data.get("count", len(self.bm25_doc_map))
            print(f"BM25: Loading index from cache ({total} docs)...")
        except Exception as e:
            print(f"BM25: Cache load failed: {e}")

        elapsed = time.time() - t0
        print(f"BM25 index loaded in {elapsed:.1f}s")

    def reload_index(self):
        """Reload the Chroma collection and BM25 index after live ingestion."""
        print("Reloading RAG indices...", flush=True)
        self.collection = self.chroma_client.get_or_create_collection(
            "library_data_v2",
            metadata={"hnsw:space": "cosine"},
        )
        self.rebuild_bm25_index()
        self._rebuild_sqlite_index()
        print("RAG reload complete.", flush=True)

    def rebuild_bm25_index(self):
        """Rebuilds the BM25 index from scratch using all documents in ChromaDB."""
        print("BM25: Rebuilding index from ChromaDB...")
        try:
            results = self.collection.get(include=["documents", "metadatas"])
            if not results or not results["documents"]:
                print("BM25: No documents found to index.")
                return

            doc_map = []
            corpus = []
            
            for doc, meta in zip(results["documents"], results["metadatas"]):
                doc_map.append({"text": doc, "metadata": meta})
                corpus.append(doc.lower().split())

            self.bm25_index = BM25Okapi(corpus)
            self.bm25_doc_map = doc_map
            
            cache_data = {
                "index": self.bm25_index,
                "doc_map": self.bm25_doc_map,
                "count": len(self.bm25_doc_map)
            }
            
            cache_path = os.path.join(self.persist_dir, "bm25_cache.pkl")
            with open(cache_path, "wb") as f:
                pickle.dump(cache_data, f)
                
            print(f"BM25: Rebuild complete. Cached {len(self.bm25_doc_map)} docs.")
        except Exception as e:
            print(f"BM25: Failed to rebuild index: {e}")

    def _warmup_pipeline(self):
        """Execute a dummy request to ensure models are loaded into RAM."""
        try:
            print("Warming up pipeline...")
            # Run vector search
            self._vector_search("library", top_k=1)
            # Run LLM (Wait for just the first chunk)
            for _ in self.llm_engine.generate_stream("Say 'OK'"):
                break
            print("Warmup complete.")
        except Exception as e:
            print(f"Warmup warning: {e}")

    # ------------------------------------------------------------------
    # Hybrid Search + Reranking
    # ------------------------------------------------------------------

    def _vector_search(self, query: str, top_k: int = 20) -> list[dict]:
        """Retrieve top_k chunks via vector similarity."""
        query_embedding = list(self.embed_model.embed([query]))[0].tolist()
        results = self.collection.query(
            query_embeddings=[query_embedding],
            n_results=top_k,
            include=["documents", "metadatas", "distances"],
        )

        hits = []
        if results and results["documents"]:
            for doc, meta, dist in zip(
                results["documents"][0],
                results["metadatas"][0],
                results["distances"][0],
            ):
                hits.append({
                    "text": doc,
                    "metadata": meta,
                    "score": 1 - dist,  # cosine distance → similarity
                })
        return hits

    def _bm25_search(self, query: str, top_k: int = 20) -> list[dict]:
        """Retrieve top_k chunks via BM25 keyword search."""
        if not self.bm25_index:
            return []

        tokenized_query = query.lower().split()
        scores = self.bm25_index.get_scores(tokenized_query)

        # Get top_k indices
        top_indices = sorted(
            range(len(scores)), key=lambda i: scores[i], reverse=True
        )[:top_k]

        hits = []
        for idx in top_indices:
            if scores[idx] > 0:
                entry = self.bm25_doc_map[idx]
                hits.append({
                    "text": entry["text"],
                    "metadata": entry["metadata"],
                    "score": float(scores[idx]),
                })
        return hits

    def _reciprocal_rank_fusion(
        self,
        vector_hits: list[dict],
        bm25_hits: list[dict],
        k: int = 60,
    ) -> list[dict]:
        """
        Merge two ranked lists using Reciprocal Rank Fusion.
        RRF score = Σ 1/(k + rank)
        """
        doc_scores: dict[str, float] = {}
        doc_map: dict[str, dict] = {}

        for rank, hit in enumerate(vector_hits):
            key = hashlib.md5(hit["text"].encode()).hexdigest()
            doc_scores[key] = doc_scores.get(key, 0) + 1.0 / (k + rank + 1)
            doc_map[key] = hit

        for rank, hit in enumerate(bm25_hits):
            key = hashlib.md5(hit["text"].encode()).hexdigest()
            doc_scores[key] = doc_scores.get(key, 0) + 1.0 / (k + rank + 1)
            if key not in doc_map:
                doc_map[key] = hit

        # Sort by RRF score descending
        sorted_keys = sorted(doc_scores, key=doc_scores.get, reverse=True)
        merged = []
        for key in sorted_keys:
            entry = doc_map[key]
            entry["rrf_score"] = doc_scores[key]
            merged.append(entry)

        return merged

    def _rerank(self, query: str, candidates: list[dict], top_k: int = 5) -> list[dict]:
        """Placeholder for reranker if re-enabled. Currently just returns top_k from RRF."""
        return candidates[:top_k]

    # ------------------------------------------------------------------
    # Query Pipeline
    # ------------------------------------------------------------------

    def _expand_query(self, query: str, history: list[dict] = None) -> str:
        # Fast query expansion without LLM latency
        # Normalize concatenated or spaced IDs (e.g., 'com9842' or 'com 3' -> 'com-9842', 'com-3')
        query = re.sub(r'\b([a-z]{3})\s*(\d{1,4})\b', r'\1-\2', query, flags=re.IGNORECASE)
        
        if not history:
            return query
            
        # Check if current query is a general library/count question (NOT a follow up on a single book)
        lower_query = " " + query.lower() + " "
        general_patterns = ["how many books", "total books", "all books", "collection size", "number of books", "books do we have", "books we have", "books available in library", "books in the library"]
        if any(p in lower_query for p in general_patterns):
            return query
            
        # Check if current query is likely a follow-up about the PREVIOUS specific book
        follow_up_keywords = [" it ", " this book ", " that book ", " these books ", " those books ", " its author ", " author of it ", " where is it ", " how to get there ", " path to it ", " take me there "]
        is_follow_up = any(kw in lower_query for kw in follow_up_keywords)
        
        expanded = query
        if is_follow_up:
            current_book = ""
            current_author = ""
            current_rack = ""
            current_copies = ""
            
            for msg in reversed(history):
                if msg["role"] == "assistant":
                    # Simple heuristic extraction of the current book being discussed
                    match1 = re.search(r'The (.*?) book is', msg['content'], re.IGNORECASE)
                    match2 = re.search(r'book titled "(.*?)"', msg['content'], re.IGNORECASE)
                    match3 = re.search(r'book "(.*?)"', msg['content'], re.IGNORECASE)
                    match4 = re.search(r'author of the book "(.*?)"', msg['content'], re.IGNORECASE)
                    if match1: current_book = match1.group(1)
                    elif match2: current_book = match2.group(1)
                    elif match3: current_book = match3.group(1)
                    elif match4: current_book = match4.group(1)
                    
                    author_match = re.search(r'author is ([^,\.]+)', msg['content'], re.IGNORECASE)
                    if author_match: current_author = author_match.group(1)
                    
                    rack_match = re.search(r'<ROUTE_TO:(.*?)>', msg['content'])
                    if not rack_match:
                        rack_match = re.search(r'Rack ([A-Z0-9\-]+)', msg['content'], re.IGNORECASE)
                    if rack_match: current_rack = rack_match.group(1)
                    
                    copies_match = re.search(r'(\d+) (?:available )?copies', msg['content'], re.IGNORECASE)
                    if copies_match: current_copies = copies_match.group(1)
                    
                    if current_book:
                        break
            
            if current_book:
                print(f"Conversation Memory: Detected current book '{current_book}'")
                context_parts = []
                if current_author: context_parts.append(f"Author: {current_author}")
                if current_rack: context_parts.append(f"Rack: {current_rack}")
                if current_copies: context_parts.append(f"Copies: {current_copies}")
                expanded = f"{current_book} {' '.join(context_parts)} {query}"
            else:
                recent_context = []
                for msg in history[-2:]:
                    if "Hello! I'm your AI Library Assistant" not in msg['content']:
                        recent_context.append(msg['content'])
                expanded = " ".join(recent_context) + " " + query
            
        # Add 'rack shelf location' if they ask 'where'
        if "where" in query.lower():
            expanded += " rack shelf location"
            
        return expanded

    def query_stream(self, user_input: str, history: list[dict] = None):
        if not self.ready or not self.llm_engine:
            yield "I am still setting up. Please try again in a moment."
            return
        
        print("\n[STATE] -> RETRIEVING")
        print(f"\nTranscript:\n{user_input}")
        
        try:
            t_embed = time.time()
            expanded_query = self._expand_query(user_input, history)
            print(f"Expanded Query: {expanded_query}")
            
            # --- INTENT ROUTER ---
            lower_query = expanded_query.lower()
            clean_input = re.sub(r'[^\w\s]', ' ', user_input).strip()
            metadata_results = []
            
            # 1. Author search
            if "books by" in lower_query or "author" in lower_query or "written by" in lower_query:
                author_name = user_input.lower().replace("author", "").replace("written by", "").replace("books by", "").replace("?", "").strip()
                if author_name:
                    print(f"Intent Router: Author search detected for '{author_name}'")
                    metadata_results = self._metadata_lookup(author_name, field="author")
            
            # 2. Location search
            elif "rack" in lower_query or "where is" in lower_query:
                rack_match = re.search(r'rack\s+([a-z0-9\-]+)', lower_query)
                if rack_match:
                    print(f"Intent Router: Location search detected for '{rack_match.group(1)}'")
                    metadata_results = self._metadata_lookup(rack_match.group(1), field="location")
            
            # 3. Call number / ID
            elif "book id" in lower_query or "call number" in lower_query:
                id_match = re.search(r'(?:book id|call number)\s+([a-z0-9\-]+)', lower_query)
                if id_match:
                    print(f"Intent Router: Call number search detected for '{id_match.group(1)}'")
                    metadata_results = self._metadata_lookup(id_match.group(1), field="call_number")
            
            # 4. Direct title / book lookup (e.g. "Harry Potter", "Goodnight Moon", "Python programming")
            if not metadata_results and clean_input:
                # Strip conversational fluff to isolate title
                potential_title = re.sub(r'^(?:where\s+is|where\s+are|where|do\s+you\s+have|we\s+have|is\s+there|find|search|get|book|the)\s+', '', clean_input, flags=re.IGNORECASE).strip()
                potential_title = re.sub(r'\s+book$', '', potential_title, flags=re.IGNORECASE).strip()
                
                title_results = self._metadata_lookup(potential_title if potential_title else clean_input, field="title")
                if title_results:
                    print(f"Intent Router: Direct title match found for '{potential_title}' ({len(title_results)} records)")
                    metadata_results = title_results
                elif clean_input != potential_title:
                    fallback_title_results = self._metadata_lookup(clean_input, field="title")
                    if fallback_title_results:
                        print(f"Intent Router: Raw title match found for '{clean_input}'")
                        metadata_results = fallback_title_results

            # If no direct match yet, try searching for any mentioned title in conversation history
            if not metadata_results and history:
                for h_msg in reversed(history[-3:]):
                    c_text = h_msg.get('content', '')
                    t_match = re.search(r'["\']([^"\']+)["\']', c_text)
                    if t_match:
                        hist_title_results = self._metadata_lookup(t_match.group(1), field="title")
                        if hist_title_results:
                            print(f"Intent Router: Resolved title from history: '{t_match.group(1)}'")
                            metadata_results = hist_title_results
                            break

            if metadata_results:
                top_chunks = metadata_results[:10]
                print(f"Intent Router: Fast-path metadata lookup retrieved {len(top_chunks)} records in {time.time() - t_embed:.3f}s")
            else:
                print("Vector search (fallback)...")
                vector_hits = self._vector_search(expanded_query, top_k=25)

                print("BM25 search (fallback)...")
                bm25_hits = self._bm25_search(expanded_query, top_k=25)

                merged = self._reciprocal_rank_fusion(vector_hits, bm25_hits)
                print(f"RRF results count: {len(merged)}")
                
                # Filter with Record Validator (relaxed for speed)
                valid_chunks = []
                for chunk in merged[:15]:
                    if self._validate_record(user_input, chunk):
                        valid_chunks.append(chunk)
                
                top_chunks = valid_chunks[:5] if valid_chunks else merged[:5]

            # GUARANTEE REAL-TIME SYNC: Re-query the live database for any retrieved book chunks to ensure updated Rack/Copies
            try:
                from backend.database.db import SessionLocal
                from backend.database.models import Book
                db_sync = SessionLocal()
                for chunk in top_chunks:
                    c_meta = chunk.get("metadata", {})
                    b_title = c_meta.get("title")
                    if not b_title:
                        m_title = re.search(r'Title:\s*(.+)', chunk.get("text", ""))
                        if m_title:
                            b_title = m_title.group(1).strip()
                    
                    if b_title:
                        live_book = db_sync.query(Book).filter(Book.title.ilike(f"%{b_title}%")).first()
                        if live_book:
                            total_c = live_book.copies if live_book.copies is not None else 1
                            avail_c = live_book.available if live_book.available is not None else total_c
                            live_rack = live_book.rack or ""
                            chunk["text"] = (
                                f"Title: {live_book.title}\n"
                                f"Author: {live_book.author}\n"
                                f"Rack: {live_rack}\n"
                                f"Floor: {live_book.floor or '1'}\n"
                                f"Available Copies: {avail_c}\n"
                                f"Total Copies: {total_c}\n"
                            )
                            if live_book.department: chunk["text"] += f"Subject / Department: {live_book.department}\n"
                            if live_book.isbn: chunk["text"] += f"Call Number / ISBN: {live_book.isbn}\n"
                            if live_book.description: chunk["text"] += f"Description: {live_book.description}\n"
                            chunk["metadata"]["rack"] = live_rack
                            chunk["metadata"]["location"] = live_rack
                            chunk["metadata"]["copies"] = total_c
                            chunk["metadata"]["available"] = avail_c
                            chunk["metadata"]["floor"] = live_book.floor or "1"
                            chunk["metadata"]["source"] = "live_database_synced"
                db_sync.close()
            except Exception as e:
                print(f"Warning: Live database resync failed: {e}")
                
            print(f"Final retrieved chunks: {len(top_chunks)} in {time.time() - t_embed:.3f}s")

            # Fetch Global Library Settings & Collection Statistics
            library_name = "the University Library"
            opening_hours = ""
            library_policies = ""
            total_books_count = 0
            total_physical_copies = 0
            try:
                from backend.database.db import SessionLocal
                from backend.database.models import LibraryConfig, Book
                from sqlalchemy import func
                db = SessionLocal()
                config = db.query(LibraryConfig).first()
                if config:
                    library_name = config.library_name or "the University Library"
                    opening_hours = config.opening_hours or ""
                    library_policies = config.library_policies or ""
                total_books_count = db.query(Book).count()
                total_physical_copies = db.query(func.sum(Book.copies)).scalar() or total_books_count
                db.close()
            except Exception as e:
                print(f"Failed to load LibraryConfig/Stats for prompt: {e}")

            # If user is asking a general collection/count question, provide collection summary as context
            clean_lower = clean_input.lower()
            general_count_phrases = ["how many books", "total books", "all books", "collection size", "number of books", "books do we have", "books we have", "books available in library", "books in the library"]
            if any(p in clean_lower for p in general_count_phrases):
                context_blocks = [f"Library Collection Summary: {library_name} currently has {total_books_count} unique book titles with a total of {total_physical_copies} physical copies available across all sections and floors."]
                context = "\n\n".join(context_blocks)
            else:
                context_blocks = []
                for chunk in top_chunks:
                    meta = chunk.get("metadata", {})
                    source = meta.get("source", "Library Database")
                    section = meta.get("section", "")
                    sec_str = f" - Section: {section}" if section else ""
                    context_blocks.append(f"[Source: {source}{sec_str}]\n{chunk['text']}")
                    
                if not context_blocks:
                    context_blocks.append("No relevant information found in the library catalog.")
                    
                context = "\n\n".join(context_blocks)
            
            # HARD LIMIT: Ensure context doesn't exceed limits to stay within reasonable limits
            if len(context) > 12000:
                context = context[:12000] + "\n...[CONTENT TRUNCATED DUE TO SIZE LIMITS]..."

            system_prompt = (
                f"You are Sam, a virtual library assistant for {library_name}. "
                f"Library Opening Hours: {opening_hours}. "
                f"Library Policies & Rules: {library_policies}. "
                f"Total Library Collection: {total_books_count} unique book titles ({total_physical_copies} total physical copies). "
                "You MUST answer ONLY from the retrieved context records below. Never guess or invent metadata. "
                "If the user asks about general library rules, hours, or how many books the library has, answer directly and accurately based on the Policies & Collection stats above. DO NOT mention a single specific book or rack unless the user asked for one. "
                "If the user asks about a book and the retrieved records are completely unrelated, say 'I could not find an exact match for that book.' "
                "However, if the user is simply answering your previous question about their location (e.g. 'I am on Floor 1'), acknowledge it naturally and tell them you are showing the path based on the conversation history. Do not say you can't find a book in this case. "
                "CRITICAL: The user is speaking through a speech-to-text engine. You MUST be extremely forgiving of typos! If their words sound even slightly similar to a book in the context (e.g. 'good night moon look' -> 'Goodnight Moon', 'harry port' -> 'Harry Potter'), you MUST assume it is a match and answer using the context. DO NOT say you couldn't find a match if there is a similar sounding book. "
                "Never combine the author of one book with the title of another. "
                "If there are multiple books or versions with the same title, you MUST list them and specify their differing authors or racks. "
                "When providing book details, always quote the EXACT Title, Author, Rack, and Copies from the records. "
                "Answer the user naturally and directly. DO NOT mention file names, document names, source files, page numbers, or book record numbers in your response. Just provide the answer. "
                "Adopt a professional, calm, friendly, confident, and efficient female persona. "
                "Use clear, neutral Indian English or international English. "
                "INTENT RULES:\n"
                "1. GENERAL LIBRARY INTENT: If the user asks general questions about the library (e.g. 'how many books do we have', 'how many books are there', 'total books', 'library hours', 'rules', 'policies'): Answer naturally with the total count or policies. NEVER output any `<ROUTE_...>` tags. The map must stay closed.\n"
                "2. BOOK INFO INTENT: If the user is asking about a specific book (availability, author, title, number of copies, description, etc.), respond with the relevant book details in the chat. Do NOT ask for their location. Do NOT output any `<ROUTE_...>` tags. The map will stay closed.\n"
                "3. PATH / LOCATION INTENT: If the user is asking where a specific book/rack physically is, or asking for directions/route/path (e.g. 'where is this book', 'where is it kept', 'show me the path', 'take me to it', 'how do I get there', 'route me to rack B2', 'path from floor 1 to floor 2'):\n"
                "   a) If their current location is UNKNOWN in this conversation, ask: 'Where are you currently located? At the entrance, or near a specific rack or floor?'. Do NOT output a `<ROUTE_...>` tag yet.\n"
                "   b) If their current location is KNOWN (or stated in the message), respond with guidance and ALWAYS append the routing tag at the VERY END: `<ROUTE_FROM:start_TO:destination>`. Examples: `<ROUTE_FROM:entrance_TO:B2>`, `<ROUTE_FROM:entrance_TO:F1>`, `<ROUTE_FROM:stairs1_TO:stairs2>`.\n"
                "4. CONVERSATION CONTEXT: If the user previously asked about a book and then asks 'where is it kept' or 'show me the path', resolve 'it' to the last book discussed. Do not ask them to repeat the book name.\n"

            )

            history_text = ""
            if history:
                history_text = "CONVERSATION HISTORY:\n"
                for m in history:
                    role = "User" if m["role"] == "user" else "Assistant"
                    history_text += f"{role}: {m['content']}\n"
                history_text += "\n"

            prompt = f"{system_prompt}\n\nCONTEXT:\n{context}\n\n{history_text}USER QUESTION:\n{user_input}\n\nANSWER:"
            
            print("\n[STATE] -> GENERATING")
            print(f"Prompt preview (first 500 characters):\n{prompt[:500]}...")
            print(f"Prompt token count (approx): {len(prompt) // 4}")

            print("Groq request started...")
            first_token = True
            full_output = ""
            for chunk in self.llm_engine.generate_stream(prompt):
                if first_token:
                    print("First streamed token received.")
                    first_token = False
                full_output += chunk
                yield chunk
            print("Streaming completed.")
            
            # Helper: Path/Location intent check
            lower_input = user_input.lower().strip()
            
            # If this is a general library/count question or policy question, NEVER inject a route tag
            is_general_question = any(p in lower_input for p in ["how many books", "total books", "all books", "collection size", "number of books", "books do we have", "books we have", "hours", "timings", "rules", "policies", "who are you"])
            
            path_intent_patterns = [
                r'\bwhere\s+(?:is|are)\s+(?!the\s+library|we|our)\b',
                r'\bwhere\s+.*(?:kept|located|placed|shelved)\b',
                r'\bshow\s+me\s+(?:the\s+)?path\b',
                r'\bshow\s+me\s+(?:the\s+)?(?:way|route|direction)',
                r'\btake\s+me\s+(?:to|there)\b',
                r'\bhow\s+do\s+i\s+get\s+there\b',
                r'\bhow\s+to\s+reach\b',
                r'\broute\s+(?:to|me)\b',
                r'\bdirection(?:s)?\s+to\b',
                r'\bnavigate\s+(?:to|me)\b',
                r'\blocate\s+(?:this|the)\s+book\b',
                r'\bfind\s+(?:this|the)\s+book\b',
                r'\bpath\s+from\b',
                r'\bpath\s+to\b',
                r'\bfloor\s*\d+\s*(?:to|towards)\s*floor\s*\d+\b',
                r'^(?:floor\s*\d+|entrance|first\s+floor|second\s+floor|third\s+floor)$'
            ]
            is_path_intent = not is_general_question and any(re.search(p, lower_input) for p in path_intent_patterns)
            
            # Check if the user is answering a location question (e.g. "I am on floor 1", "near C4", "at entrance")
            is_answering_location = False
            if not is_general_question and history:
                last_asst_msg = next((m.get("content", "").lower() for m in reversed(history) if m.get("role") == "assistant"), "")
                if "where are you" in last_asst_msg or "currently located" in last_asst_msg:
                    # Only treat as location answer if they actually mention a location
                    if re.search(r'\b(?:entrance|floor\s*\d+|rack\s*[a-z0-9\-]+|stairs\s*\d+|near|at|by|from)\b', lower_input):
                        is_answering_location = True
            
            if (is_path_intent or is_answering_location) and not is_general_question:
                # Only inject route tag if missing and location prompt is NOT being asked
                if not re.search(r'<ROUTE_', full_output, re.IGNORECASE) and "where are you" not in full_output.lower() and "currently located" not in full_output.lower():
                    user_loc = None
                    
                    # 1. Extract rack location from current input
                    rack_loc_m = re.search(r'(?:at|from|near|by)\s+(?:rack|shelf)\s*([a-z0-9\-]+)', lower_input)
                    if rack_loc_m:
                        user_loc = rack_loc_m.group(1).upper()
                    
                    # 2. Extract floor/entrance from current input
                    if not user_loc:
                        floor_m = re.search(r'(?:from\s+)?floor\s*(\d+)', lower_input)
                        if floor_m and "to floor" not in lower_input[:floor_m.start()]: 
                            user_loc = f"stairs{floor_m.group(1)}"
                        elif "first floor" in lower_input: 
                            user_loc = "stairs1"
                        elif "second floor" in lower_input: 
                            user_loc = "stairs2"
                        elif "third floor" in lower_input: 
                            user_loc = "stairs3"
                        elif "entrance" in lower_input: 
                            user_loc = "entrance"
                            
                    # 3. Extract from history
                    if not user_loc and history:
                        for msg in reversed(history):
                            if msg.get("role") == "user":
                                past_input = msg.get("content", "").lower()
                                past_rack = re.search(r'(?:at|from|near|by)\s+(?:rack|shelf)\s*([a-z0-9\-]+)', past_input)
                                if past_rack:
                                    user_loc = past_rack.group(1).upper()
                                    break
                                past_floor = re.search(r'floor\s*(\d+)', past_input)
                                if past_floor:
                                    user_loc = f"stairs{past_floor.group(1)}"
                                    break
                                elif "first floor" in past_input:
                                    user_loc = "stairs1"
                                    break
                                elif "second floor" in past_input:
                                    user_loc = "stairs2"
                                    break
                                elif "entrance" in past_input:
                                    user_loc = "entrance"
                                    break
                    
                    if user_loc:
                        # Extract destination rack
                        dest_rack = ""
                        # 1. From current LLM output
                        rm = re.search(r'(?:Rack|Shelf)\s*([A-Z0-9\-]+)', full_output, re.IGNORECASE)
                        if rm:
                            dest_rack = rm.group(1).upper()
                        
                        # 2. From user query directly
                        if not dest_rack:
                            um = re.search(r'(?:to|at|rack)\s+([A-Z][0-9]+)', user_input, re.IGNORECASE)
                            if not um: um = re.search(r'\b([A-Z][0-9]+)\b', user_input, re.IGNORECASE)
                            if um:
                                dest_rack = um.group(1).upper()

                        # 3. From retrieved top chunks metadata
                        if not dest_rack and top_chunks:
                            for chk in top_chunks:
                                meta = chk.get("metadata", {})
                                rk = meta.get("rack") or meta.get("location")
                                if rk:
                                    rk_str = str(rk).strip()
                                    loc_m = re.search(r'([A-Z0-9\-]+)', rk_str)
                                    if loc_m:
                                        dest_rack = loc_m.group(1).upper()
                                        break
                        
                        # 4. From conversation history
                        if not dest_rack and history:
                            for msg in reversed(history):
                                past_text = msg.get("content", "")
                                hm = re.search(r'<ROUTE_[^>]+_TO:([^>]+)>', past_text)
                                if not hm: hm = re.search(r'\*\*Rack:\*\*\s*([A-Z0-9\-]+)', past_text, re.IGNORECASE)
                                if not hm: hm = re.search(r'(?:Rack|to)\s+([A-Z0-9\-]+)', past_text, re.IGNORECASE)
                                if hm:
                                    dest_rack = hm.group(1).upper()
                                    break

                        # 5. Floor-to-floor
                        dest_floor_m = re.search(r'(?:to|towards)\s+floor\s*(\d+)', lower_input)
                        if dest_floor_m:
                            dest_rack = f"stairs{dest_floor_m.group(1)}"

                        if dest_rack:
                            print(f"Injecting programmatic route tag: <ROUTE_FROM:{user_loc}_TO:{dest_rack}>")
                            yield f" <ROUTE_FROM:{user_loc}_TO:{dest_rack}>"
                    else:
                        print("User location unknown. Forcing LLM to ask.")
                        yield " Where are you currently located? (e.g. Entrance, Floor 1, or a specific Rack)"
            
        except Exception as e:
            import traceback
            tb = traceback.format_exc()
            print(f"Pipeline exception: {e}\n{tb}")
            if False: # Hardcoded to prevent tracebacks in UI
                yield f"Error: {e}\n\nTraceback:\n{tb}"
            else:
                yield "I encountered an error while processing your question. Please try again."
