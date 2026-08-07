import os
import sys
import csv
import time
import chromadb
from chromadb.utils import embedding_functions

# Add project root to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

def load_books():
    books = []
    # Make sure we read from the right path relative to project root
    csv_path = os.path.join(os.path.dirname(__file__), '..', 'data', 'book_catalog.csv')
    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            books.append(row)
    return books

def run_benchmark():
    print("Initializing benchmark...")
    
    # Load data
    all_books = load_books()
    
    # Sample books
    # 1-indexed positions in prompt: 1, 100, 1000, 5000, 8000, 9600, 10000
    indices = [0, 99, 999, 4999, 7999, 9599, 9999]
    sample_books = [all_books[i] for i in indices]
    
    # Init Chroma
    # Init Chroma - use fastembed directly since chromadb wrapper may not exist
    db_path = os.path.join(os.path.dirname(__file__), '..', 'chroma_db')
    chroma_client = chromadb.PersistentClient(path=db_path)
    
    from fastembed import TextEmbedding
    embed_model = TextEmbedding("BAAI/bge-small-en-v1.5")
    
    collection = chroma_client.get_collection(name="library_data_v2")
    
    # Metrics
    title_top1 = 0
    title_top3 = 0
    title_top5 = 0
    author_top1 = 0
    rack_top1 = 0
    partial_top1 = 0
    
    total_latency = 0.0
    queries_made = 0
    
    for book in sample_books:
        title = book['Title']
        author = book['Author']
        rack = book['Location']
        
        # 1. Title search
        start_time = time.time()
        title_emb = list(embed_model.embed([title]))[0].tolist()
        res_title = collection.query(query_embeddings=[title_emb], n_results=5)
        total_latency += (time.time() - start_time)
        queries_made += 1
        
        titles_retrieved = [m.get('title', '') for m in res_title['metadatas'][0]] if res_title['metadatas'] else []
        if titles_retrieved and title == titles_retrieved[0]:
            title_top1 += 1
        if title in titles_retrieved[:3]:
            title_top3 += 1
        if title in titles_retrieved[:5]:
            title_top5 += 1
            
        # 2. Author search
        start_time = time.time()
        author_emb = list(embed_model.embed([author]))[0].tolist()
        res_author = collection.query(query_embeddings=[author_emb], n_results=5)
        total_latency += (time.time() - start_time)
        queries_made += 1
        
        authors_retrieved = [m.get('author', '') for m in res_author['metadatas'][0]] if res_author['metadatas'] else []
        if authors_retrieved and author == authors_retrieved[0]:
            author_top1 += 1
            
        # 3. Rack search
        start_time = time.time()
        rack_emb = list(embed_model.embed([rack]))[0].tolist()
        res_rack = collection.query(query_embeddings=[rack_emb], n_results=5)
        total_latency += (time.time() - start_time)
        queries_made += 1
        
        racks_retrieved = [m.get('location', '') for m in res_rack['metadatas'][0]] if res_rack['metadatas'] else []
        if racks_retrieved and rack == racks_retrieved[0]:
            rack_top1 += 1
            
        # 4. Partial title search
        words = title.split()
        partial_title = " ".join(words[:min(3, len(words))])
        start_time = time.time()
        partial_emb = list(embed_model.embed([partial_title]))[0].tolist()
        res_partial = collection.query(query_embeddings=[partial_emb], n_results=5)
        total_latency += (time.time() - start_time)
        queries_made += 1
        
        partial_titles_retrieved = [m.get('title', '') for m in res_partial['metadatas'][0]] if res_partial['metadatas'] else []
        if partial_titles_retrieved and title == partial_titles_retrieved[0]:
            partial_top1 += 1
            
    num_books = len(sample_books)
    avg_latency = (total_latency / queries_made) * 1000  # in ms
    
    print("\n========================================")
    print("RETRIEVAL BENCHMARK RESULTS")
    print("========================================")
    print(f"Books Tested: {num_books}")
    print(f"Title Search Top-1: {title_top1/num_books*100:.1f}% ({title_top1}/{num_books})")
    print(f"Title Search Top-3: {title_top3/num_books*100:.1f}% ({title_top3}/{num_books})")
    print(f"Author Search Top-1: {author_top1/num_books*100:.1f}% ({author_top1}/{num_books})")
    print(f"Rack Search Top-1: {rack_top1/num_books*100:.1f}% ({rack_top1}/{num_books})")
    print(f"Avg Latency: {avg_latency:.0f}ms")
    print("========================================")

if __name__ == "__main__":
    run_benchmark()
