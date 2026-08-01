import os
import psutil
import time

def print_mem(stage):
    process = psutil.Process(os.getpid())
    mem_info = process.memory_info()
    mem_mb = mem_info.rss / 1024 / 1024
    print(f"[{stage}] RAM Usage: {mem_mb:.1f} MB")

print_mem("Start")

from backend.rag_engine import LibraryRAG
print_mem("Import RAG Engine")

# Instantiate LibraryRAG (loads models)
t0 = time.time()
rag = LibraryRAG(data_dir="./data", persist_dir="./backend/chroma_db")
print_mem(f"Instantiated LibraryRAG (loaded models) in {time.time()-t0:.2f}s")

# Initialize LibraryRAG (loads ChromaDB, BM25)
t0 = time.time()
rag.initialize()
print_mem(f"Initialized LibraryRAG in {time.time()-t0:.2f}s")

# Run query
print("Running query: 'Where is the Python book?'")
t0 = time.time()
for chunk in rag.query_stream("Where is the Python book?"):
    pass
print_mem(f"Finished query in {time.time()-t0:.2f}s")

print("Running 10 queries...")
for i in range(10):
    for chunk in rag.query_stream(f"query {i}"):
        pass
print_mem("Finished 10 queries")
