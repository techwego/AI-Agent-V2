"""
Generate the production ChromaDB using the new RAG pipeline.
Rebuilds from scratch with:
- BAAI/bge-small-en-v1.5 embeddings
- Token-aware chunking (512 tokens, 80 overlap)
- Rich metadata (source, page, section, document_type)
"""

import os
import sys
import shutil
import chromadb

# Set a dummy API key so LLM client isn't created during DB generation
os.environ["GROQ_API_KEY"] = "dummy_key_for_local_db_generation"
os.environ["OPENAI_API_KEY"] = "dummy_key_for_local_db_generation"

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
CHROMA_DIR = os.path.join(BASE_DIR, "chroma_db")

# Add backend to path so we can import rag_engine
sys.path.append(os.path.join(BASE_DIR, "backend"))
from backend.rag.engine import LibraryRAG

print(f"Data directory: {DATA_DIR}")
print(f"Chroma directory: {CHROMA_DIR}")

def main():
    # Ingest into ChromaDB
    rag = LibraryRAG(data_dir=DATA_DIR, persist_dir=CHROMA_DIR)
    
    # Initialize chroma client and clear existing collection if needed
    chroma_client = chromadb.PersistentClient(path=CHROMA_DIR)
    try:
        chroma_client.delete_collection("library_data_v2")
        print("Cleared old collection.")
    except Exception as e:
        print(f"Collection reset note: {e}")

    print("Building production database...")
    print("  Embedding model: BAAI/bge-small-en-v1.5")
    print("  Chunking: 512 tokens, 80 overlap, sentence-aware")
    print()

    rag = LibraryRAG(data_dir=DATA_DIR, persist_dir=CHROMA_DIR)
    rag.initialize()

    print()
    print("=" * 50)
    print("Database built successfully!")
    print(f"Total chunks: {rag.collection.count()}")
    print(f"BM25 index: {len(rag.bm25_doc_map)} documents")
    print("=" * 50)

if __name__ == "__main__":
    main()
