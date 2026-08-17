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
        
        if count == 0 and self.collection:
            print("SQLite: Populating from ChromaDB...")
            results = self.collection.get(include=["metadatas"])
            if results and results["metadatas"]:
                for i, meta in enumerate(results["metadatas"]):
                    chroma_id = results["ids"][i] if "ids" in results and results["ids"] else str(i)
                    title = meta.get("title", "")
                    author = meta.get("author", "")
                    subject = meta.get("subject", "")
                    call_number = meta.get("call_number", "")
                    location = meta.get("location", "")
                    copies = meta.get("copies", "")
                    
                    norm_title = str(title).lower().strip()
                    norm_author = str(author).lower().strip()
                    
                    cursor.execute('''
                        INSERT INTO book_index (id, title, author, subject, call_number, location, copies, normalized_title, normalized_author, chroma_id)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ''', (str(i), str(title), str(author), str(subject), str(call_number), str(location), str(copies), norm_title, norm_author, chroma_id))
                self.sqlite_conn.commit()
                print(f"SQLite: Populated {len(results['metadatas'])} records.")

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
        if not hasattr(self, 'sqlite_conn') or not self.sqlite_conn:
            return []
            
        cursor = self.sqlite_conn.cursor()
        query_norm = query.lower().strip()
        words = query_norm.split()
        
        if not words:
            return []
        
        if field == "author":
            conditions = " AND ".join(["normalized_author LIKE ?"] * len(words))
            params = tuple(f'%{w}%' for w in words)
            cursor.execute(f"SELECT title, author, subject, call_number, location, copies FROM book_index WHERE {conditions}", params)
        elif field == "location":
            cursor.execute("SELECT title, author, subject, call_number, location, copies FROM book_index WHERE location LIKE ?", (f'%{query_norm}%',))
        elif field == "call_number":
            cursor.execute("SELECT title, author, subject, call_number, location, copies FROM book_index WHERE call_number LIKE ?", (f'%{query_norm}%',))
        elif field == "title":
            conditions = " AND ".join(["normalized_title LIKE ?"] * len(words))
            params = tuple(f'%{w}%' for w in words)
            cursor.execute(f"SELECT title, author, subject, call_number, location, copies FROM book_index WHERE {conditions}", params)
        else:
            return []
            
        rows = cursor.fetchall()
        results = []
        for row in rows:
            text = f"Title: {row[0]}\nAuthor: {row[1]}\nSubject: {row[2]}\nCall Number: {row[3]}\nRack: {row[4]}\nAvailable Copies: {row[5]}"
            results.append({
                "text": text,
                "metadata": {
                    "title": row[0],
                    "author": row[1],
                    "subject": row[2],
                    "call_number": row[3],
                    "location": row[4],
                    "copies": row[5]
                },
                "score": 1.0
            })
        return results

    def _validate_record(self, query: str, record: dict) -> bool:
        title = record.get("metadata", {}).get("title", "")
        if not title:
            import re
            m = re.search(r'Title:\s*(.*)', record.get("text", ""))
            if m:
                title = m.group(1)
                
        if not title:
            return True
            
        import re
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
        import re
        
        # Normalize concatenated or spaced IDs (e.g., 'com9842' or 'com 3' -> 'com-9842', 'com-3')
        query = re.sub(r'\b([a-z]{3})\s*(\d{1,4})\b', r'\1-\2', query, flags=re.IGNORECASE)
        
        if not history:
            return query
            
        # Check if current query is likely a follow-up
        lower_query = " " + query.lower() + " "
        follow_up_keywords = [" it ", " this ", " that ", " these ", " those ", " copies ", " copy ", " author ", " he ", " she ", " his ", " her ", " they ", " them ", " where ", " which ", " how many "]
        
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
            metadata_results = []
            
            if "books by" in lower_query or "author" in lower_query or "written by" in lower_query:
                author_name = user_input.lower().replace("author", "").replace("written by", "").replace("books by", "").replace("?", "").strip()
                if author_name:
                    print(f"Intent Router: Author search detected for '{author_name}'")
                    metadata_results = self._metadata_lookup(author_name, field="author")
            elif "rack" in lower_query or "where is" in lower_query:
                import re
                rack_match = re.search(r'rack\s+([a-z0-9\-]+)', lower_query)
                if rack_match:
                    print(f"Intent Router: Location search detected for '{rack_match.group(1)}'")
                    metadata_results = self._metadata_lookup(rack_match.group(1), field="location")
            elif "book id" in lower_query or "call number" in lower_query:
                import re
                id_match = re.search(r'(?:book id|call number)\s+([a-z0-9\-]+)', lower_query)
                if id_match:
                    print(f"Intent Router: Call number search detected for '{id_match.group(1)}'")
                    metadata_results = self._metadata_lookup(id_match.group(1), field="call_number")
            else:
                # Fallback to exact title search before RAG
                title_results = self._metadata_lookup(user_input, field="title")
                if title_results:
                    print(f"Intent Router: Exact title match found for '{user_input}'")
                    metadata_results = title_results
            
            if metadata_results:
                top_chunks = metadata_results[:15]
                print(f"Intent Router: Routed to metadata lookup, found {len(top_chunks)} exact results.")
            else:
                print("Vector search...")
                vector_hits = self._vector_search(expanded_query, top_k=200)

                print("BM25 search...")
                bm25_hits = self._bm25_search(expanded_query, top_k=200)

                merged = self._reciprocal_rank_fusion(vector_hits, bm25_hits)
                print(f"RRF results count: {len(merged)}")
                
                # Filter with Record Validator
                valid_chunks = []
                for chunk in merged[:100]:
                    if self._validate_record(user_input, chunk):
                        valid_chunks.append(chunk)
                
                top_chunks = self._rerank(user_input, valid_chunks, top_k=15)
                
            print(f"Final retrieved chunks: {len(top_chunks)}")

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
            if len(context) > 120000:
                context = context[:120000] + "\n...[CONTENT TRUNCATED DUE TO SIZE LIMITS]..."

            system_prompt = (
                "You are Sam, a virtual library assistant for the University Library. "
                "You MUST answer ONLY from the retrieved context records below. Never guess or invent metadata. "
                "If the user asks about a book and the retrieved records do not match, say 'I could not find an exact match for that book.' "
                "However, if the user is simply answering your previous question about their location (e.g. 'I am on Floor 1'), acknowledge it naturally and tell them you are showing the path based on the conversation history. Do not say you can't find a book in this case. "
                "Never combine the author of one book with the title of another. "
                "If there are multiple books or versions with the same title, you MUST list them and specify their differing authors or racks. "
                "When providing book details, always quote the EXACT Title, Author, Rack, and Copies from the records. "
                "Answer the user naturally and directly. DO NOT mention file names, document names, source files, page numbers, or book record numbers in your response. Just provide the answer. "
                "Adopt a professional, calm, friendly, confident, and efficient female persona. "
                "Use clear, neutral Indian English or international English. "
                "Keep it concise but natural — provide a smooth, fluid answer in one to three sentences. "
                "CRITICAL: The user is speaking through a speech-to-text engine. If their spoken words are slightly different from a book title in the context, gracefully assume they meant the book in the context. DO NOT point out the typo. "
                "CRITICAL: If the user asks for a path, route, or directions to a specific book, or if you provide the location of a book, you MUST first ask the user for their current location if it is not known (e.g. 'Where are you currently located? At the entrance, or on a specific floor?'). YOU ABSOLUTELY MUST NOT output any routing tags in this step. Stop generating text after asking the question. "
                "CRITICAL: Once the user provides their location (e.g. 'I am at the entrance', 'Floor 1', 'Floor 2'), you MUST append a routing tag to the VERY END of your answer. The tag format is `<ROUTE_FROM:A_TO:B>`, where A is their location node (use 'entrance' for entrance, 'stairs1' for floor 1, 'stairs2' for floor 2) and B is the exact Rack ID found in the database. For example: `<ROUTE_FROM:entrance_TO:A1>` or `<ROUTE_FROM:stairs1_TO:C6>`. Do not output templates or unknown tags."

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
            for chunk in self.llm_engine.generate_stream(prompt):
                if first_token:
                    print("First streamed token received.")
                    first_token = False
                yield chunk
            print("Streaming completed.")
            
        except Exception as e:
            import traceback
            tb = traceback.format_exc()
            print(f"Pipeline exception: {e}\n{tb}")
            if False: # Hardcoded to prevent tracebacks in UI
                yield f"Error: {e}\n\nTraceback:\n{tb}"
            else:
                yield "I encountered an error while processing your question. Please try again."
