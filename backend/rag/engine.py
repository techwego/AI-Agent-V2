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
        rows_per_chunk = 25
        current_rows = []
        
        with open(filepath, mode="r", encoding="utf-8", errors="ignore") as f:
            reader = csv.DictReader(f)
            for row in reader:
                formatted_parts = [f"{k}: {v}" for k, v in row.items() if v]
                current_rows.append(" | ".join(formatted_parts))
                if len(current_rows) >= rows_per_chunk:
                    text_block = "\n".join(current_rows)
                    results.append({"text": text_block, "metadata": {**base_meta, "section": "Catalog"}})
                    current_rows = []
                    
        if current_rows:
            text_block = "\n".join(current_rows)
            results.append({"text": text_block, "metadata": {**base_meta, "section": "Catalog"}})
            
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
            chroma_client = chromadb.PersistentClient(path=self.persist_dir)
            self.collection = chroma_client.get_or_create_collection(
                "library_data_v2",
                metadata={"hnsw:space": "cosine"},
            )

            if self.collection.count() == 0:
                print("ChromaDB is empty. Please run index_books.py first.")
                raise ValueError("ChromaDB is empty.")

            chunk_count = self.collection.count()
            self.diagnostics["total_chunks"] = chunk_count
            self.diagnostics["db_time"] = round(time.time() - t_db, 3)
                
            print(f"ChromaDB loaded: {chunk_count} chunks")

            # Build BM25 index from ChromaDB contents
            self.state = RAGState.BUILDING_INDEX
            t_bm25 = time.time()
            self._build_or_load_bm25_index()
            self.diagnostics["bm25_time"] = round(time.time() - t_bm25, 3)

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
        self._build_or_load_bm25_index()
        print("RAG reload complete.", flush=True)

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

    def _expand_query(self, query: str) -> str:
        """Simple internal query expansion to catch common synonyms."""
        q = query.lower()
        expanded = [q]
        if "python" in q: expanded.extend(["python programming", "python language", "python guide"])
        if "ai" in q or "artificial intelligence" in q: expanded.extend(["artificial intelligence", "machine learning", "ML"])
        if "policy" in q or "rules" in q: expanded.extend(["guidelines", "regulations", "policies"])
        # Fuzzy intent hints
        if "where" in q: expanded.append("rack shelf location")
        return " ".join(expanded)

    def query_stream(self, user_input: str):
        if not self.ready or not self.llm_engine:
            yield "I am still setting up. Please try again in a moment."
            return
        
        print("\n[STATE] -> RETRIEVING")
        print(f"\nTranscript:\n{user_input}")
        
        try:
            t_embed = time.time()
            expanded_query = self._expand_query(user_input)
            print(f"Expanded Query: {expanded_query}")
            
            print("Vector search...")
            vector_hits = self._vector_search(expanded_query, top_k=50)
            print(f"Vector search executed successfully. Number of vector results: {len(vector_hits)}")

            print("BM25 search...")
            bm25_hits = self._bm25_search(expanded_query, top_k=50)
            print(f"BM25 results count: {len(bm25_hits)}")

            # 2. Merge with RRF and return top chunks directly (OOM fix: bypassing heavy cross encoder)
            merged = self._reciprocal_rank_fusion(vector_hits, bm25_hits)
            print(f"RRF results count: {len(merged)}")
            
            # Pass top chunks directly to LLM
            top_chunks = self._rerank(user_input, merged[:100], top_k=5)
            print(f"Final retrieved chunks: {len(top_chunks)}")

            context_blocks = []
            for i, chunk in enumerate(top_chunks):
                meta = chunk.get("metadata", {})
                
                # Check if it's a structural book record or a text chunk
                if meta.get("section") == "book_record":
                    # For books, the chunk text is already perfectly formatted with all metadata
                    context_blocks.append(f"[Book Record {i+1}]\n{chunk['text']}")
                else:
                    source = meta.get("source", "Library Database")
                    section = meta.get("section", "")
                    sec_str = f" - Section: {section}" if section else ""
                    context_blocks.append(f"[Source: {source}{sec_str}]\n{chunk['text']}")
            context = "\n\n".join(context_blocks)
            
            # HARD LIMIT: Ensure context doesn't exceed ~16000 characters to stay within reasonable limits
            if len(context) > 16000:
                context = context[:16000] + "\n...[CONTENT TRUNCATED DUE TO SIZE LIMITS]..."

            system_prompt = (
                "You are Sam, a virtual library assistant for the University Library. "
                "Use ONLY the provided context documents to answer the user's question. "
                "When citing information, mention the source document name and page if available. "
                "If you don't know the answer from the context, say you don't know. Do not guess. "
                "Adopt a professional, calm, friendly, confident, and efficient female persona. "
                "Use clear, neutral Indian English or international English. "
                "Keep it concise but natural — provide a smooth, fluid answer in one to three sentences. "
                "Answer naturally with a warm, helpful tone."
            )

            prompt = f"{system_prompt}\n\nCONTEXT:\n{context}\n\nUSER QUESTION:\n{user_input}\n\nANSWER:"
            
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
