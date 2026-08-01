import os
import psutil
import time

def print_mem(stage):
    process = psutil.Process(os.getpid())
    mem_info = process.memory_info()
    mem_mb = mem_info.rss / 1024 / 1024
    print(f"[{stage}] RAM Usage: {mem_mb:.1f} MB")

print_mem("Start")

from fastembed import TextEmbedding
print_mem("Import fastembed")

# Load BGE Small
t0 = time.time()
embed_model = TextEmbedding(model_name="BAAI/bge-small-en-v1.5")
print_mem(f"Loaded BGE with fastembed in {time.time()-t0:.2f}s")

# Embed something
t0 = time.time()
vectors = list(embed_model.embed(["Where is the Python book?", "Hello world"]))
print_mem(f"Embedded 2 queries in {time.time()-t0:.2f}s")
