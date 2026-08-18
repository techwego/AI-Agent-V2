import os
from typing import Optional
from dotenv import load_dotenv

load_dotenv()

def _parse_bool(val: str, default: bool = False) -> bool:
    if not val:
        return default
    return val.lower() in ("true", "1", "yes")

class Config:
    # API Keys
    GROQ_API_KEY: str = os.environ.get("GROQ_API_KEY", "")
    
    # Models
    GROQ_MODEL: str = os.environ.get("GROQ_MODEL", "llama3-8b-8192")
    EMBEDDING_MODEL: str = os.environ.get("EMBEDDING_MODEL", "BAAI/bge-small-en-v1.5")
    RERANKER_MODEL: str = os.environ.get("RERANKER_MODEL", "Xenova/ms-marco-MiniLM-L-6-v2")
    
    # Retrieval Settings
    TOP_K: int = int(os.environ.get("TOP_K", "30"))
    RERANK_TOP_K: int = int(os.environ.get("RERANK_TOP_K", "12"))
    CHUNK_SIZE: int = int(os.environ.get("CHUNK_SIZE", "250"))
    CHUNK_OVERLAP: int = int(os.environ.get("CHUNK_OVERLAP", "50"))
    
    # System Settings
    DEBUG_MODE: bool = _parse_bool(os.environ.get("DEBUG_MODE", "False"))
    DATA_DIR: str = os.environ.get("DATA_DIR", "./data")
    PERSIST_DIR: str = os.environ.get("PERSIST_DIR", "./chroma_db")

    # LLM Health Metrics
    last_successful_request = None
    total_requests = 0
    total_latency = 0.0
    api_connectivity = True

    @classmethod
    def record_llm_success(cls, duration: float):
        import time
        cls.last_successful_request = time.time()
        cls.total_requests += 1
        cls.total_latency += duration
        cls.api_connectivity = True
        
    @classmethod
    def record_llm_error(cls):
        cls.api_connectivity = False

    @classmethod
    def is_valid(cls) -> bool:
        return bool(cls.GROQ_API_KEY)
