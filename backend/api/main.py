import os
if os.environ.get("RAILWAY_ENVIRONMENT"):
    os.environ["OMP_NUM_THREADS"] = "1"
    os.environ["ONNXRUNTIME_NUM_THREADS"] = "1"
    os.environ["TOKENIZERS_PARALLELISM"] = "false"

from fastapi import FastAPI, UploadFile, File, HTTPException, BackgroundTasks
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
import shutil
from pydantic import BaseModel
try:
    from backend.rag.engine import LibraryRAG
except ImportError:
    from rag.engine import LibraryRAG
import uvicorn

app = FastAPI()

import time
import psutil

START_TIME = time.time()
ACTIVE_REQUESTS = 0
try:
    from backend.config import Config
except ImportError:
    from config import Config

import os
# Calculate project root dynamically
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Data and Index directory path
DATA_DIR = Config.DATA_DIR
CHROMA_DIR = Config.PERSIST_DIR

# Initialize RAG engine
rag = LibraryRAG(data_dir=DATA_DIR, persist_dir=CHROMA_DIR)

import threading

# Initialize RAG in background so it doesn't block FastAPI startup or cause 504 timeouts
def init_rag_bg():
    def watchdog():
        time.sleep(1800)
        if not rag.ready and getattr(rag, "state", None) != "ERROR":
            print("[WATCHDOG] Initialization timeout (1800s) exceeded!")
            if hasattr(rag, "state"):
                rag.state = "ERROR" # Note: in real code this would be the Enum
                
    threading.Thread(target=watchdog, daemon=True).start()
    
    try:
        print("Starting background RAG initialization...")
        rag.initialize()
        print("Background RAG initialization complete.")
        
        print("\n" + "="*30)
        print("Groq Configuration")
        print("="*30)
        print(f"Model        : {Config.GROQ_MODEL}")
        print(f"API Key      : {'Loaded' if Config.GROQ_API_KEY else 'No'}")
        print(f"SDK          : Latest")
        print(f"Status       : Ready")
        print("="*30 + "\n")
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"Background RAG init failed: {e}")
        if hasattr(rag, "state"):
            rag.state = "ERROR"

threading.Thread(target=init_rag_bg, daemon=True).start()

START_TIME = time.time()
ACTIVE_REQUESTS = 0

@app.middleware("http")
async def track_active_requests(request, call_next):
    global ACTIVE_REQUESTS
    ACTIVE_REQUESTS += 1
    response = await call_next(request)
    ACTIVE_REQUESTS -= 1
    return response

@app.get("/health")
def health_check():
    mem = psutil.virtual_memory()
    avg_latency = round(Config.total_latency / Config.total_requests, 3) if Config.total_requests > 0 else 0.0
    return {
        "status": "ready" if rag.ready else "initializing",
        "state": getattr(rag, "state", "UNKNOWN"),
        "startup_time": getattr(rag, "diagnostics", {}).get("startup_time", 0),
        "documents": getattr(rag, "diagnostics", {}).get("total_chunks", 0), # Mocked to chunks for now
        "chunks": getattr(rag, "diagnostics", {}).get("total_chunks", 0),
        "embeddings": getattr(rag, "diagnostics", {}).get("total_chunks", 0),
        "embedding_model": Config.EMBEDDING_MODEL,
        "retrieval": "Hybrid",
        "vector_db": "ChromaDB",
        "reranker": "disabled",
        "memory_mb": round(mem.used / (1024 * 1024), 2),
        "uptime": round(time.time() - START_TIME, 2),
        "groq_model": Config.GROQ_MODEL,
        "groq_status": "Ready" if Config.api_connectivity else "Error",
        "last_successful_request": Config.last_successful_request,
        "api_connectivity": Config.api_connectivity,
        "average_response_latency": avg_latency
    }

@app.get("/diagnostics")
def diagnostics():
    mem = psutil.virtual_memory()
    return {
        "current_ram_mb": round(mem.used / (1024 * 1024), 2),
        "peak_ram_mb": round(mem.used / (1024 * 1024), 2),
        "active_requests": ACTIVE_REQUESTS,
        "chroma_status": "ready" if rag.collection else "uninitialized",
        "bm25_status": "ready" if rag.bm25_index else "uninitialized",
        "groq_status": "ready" if getattr(rag, "llm_engine", None) else "uninitialized",
        "current_rag_state": getattr(rag, "state", "UNKNOWN"),
        "average_latency": 0.0,
        "cache_hit_rate": 0.0
    }

from typing import Optional

class DebugRetrieveRequest(BaseModel):
    query: str

@app.post("/api/debug/retrieve")
async def debug_retrieve(request: DebugRetrieveRequest):
    if not rag.ready:
        raise HTTPException(status_code=503, detail="RAG not ready")
    
    # Do hybrid search directly and limit to 5
    vector_results = rag._vector_search(request.query, top_k=10)
    bm25_results = rag._bm25_search(request.query, top_k=10)
    combined = rag._reciprocal_rank_fusion(vector_results, bm25_results)
    
    top_chunks = combined[:5]
    
    # Format output
    output = []
    for c in top_chunks:
        output.append({
            "id": c.get("id"),
            "score": c.get("rerank_score", 0),
            "metadata": c.get("metadata", {}),
            "text": c.get("text", "")
        })
        
    return {
        "count": len(output),
        "chunks": output
    }

class DebugGeminiRequest(BaseModel):
    prompt: str

@app.post("/api/debug/gemini")
async def debug_gemini(request: DebugGeminiRequest):
    if not rag.llm_engine:
        raise HTTPException(status_code=503, detail="LLM engine not ready")
        
    def gen():
        for chunk in rag.llm_engine.generate_stream(request.prompt):
            yield chunk
            
    return StreamingResponse(gen(), media_type="text/plain")

class ChatRequest(BaseModel):
    message: str
    test: Optional[str] = None

@app.post("/api/chat")
async def chat(request: ChatRequest):
    print(f"\n[BACKEND] POST /api/chat received")
    print(f"[BACKEND] Transcript: '{request.message}' | Test Mode: {request.test}")
    
    if request.test == "backend_loop":
        async def generate_test():
            yield "Hello, backend is working."
        return StreamingResponse(generate_test(), media_type="text/plain")
        
    if not rag.ready:
        print(f"[BACKEND] RAG not ready yet. Returning 503.")
        state_val = getattr(rag, "state", "INITIALIZING")
        return JSONResponse(
            status_code=503, 
            content={"status": "initializing", "state": state_val}
        )
    
    def generate():
        print(f"[BACKEND] Starting stream for: '{request.message}'")
        
        if request.test == "gemini_only":
            print("[BACKEND] Running in Gemini Only mode")
            for chunk in rag.llm_engine.generate_stream(request.message):
                yield chunk
            return
            
        if request.test == "rag_only":
            print("[BACKEND] Running in RAG Only mode")
            vector = rag._vector_search(request.message, top_k=3)
            for idx, item in enumerate(vector):
                yield f"[Document {idx+1}]: {item['text'][:100]}...\n\n"
            return

        # Normal full pipeline
        for chunk in rag.query_stream(request.message):
            print(f"[BACKEND] Yielding chunk: {repr(chunk)}")
            yield chunk
        print(f"[BACKEND] Request completed")

    return StreamingResponse(generate(), media_type="text/plain")

import tempfile
from groq import Groq

@app.post("/api/transcribe")
async def transcribe_audio(audio: UploadFile = File(...)):
    if not Config.GROQ_API_KEY:
        raise HTTPException(status_code=500, detail="Groq API key not configured")
    
    with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as temp_audio:
        shutil.copyfileobj(audio.file, temp_audio)
        temp_audio_path = temp_audio.name

    try:
        client = Groq(api_key=Config.GROQ_API_KEY)
        with open(temp_audio_path, "rb") as file:
            transcription = client.audio.transcriptions.create(
                file=(audio.filename, file.read()),
                model="whisper-large-v3-turbo",
                response_format="json",
            )
        return {"text": transcription.text}
    except Exception as e:
        print(f"[ERROR] Transcription failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(temp_audio_path):
            os.remove(temp_audio_path)


def process_upload_task(upload_id: int):
    import subprocess
    try:
        print(f'[UPLOAD] Processing task {upload_id}')
        # We will replace index_books.py with the new ingestion logic later.
        # For now, just run index_books.py
        result = subprocess.run([sys.executable, "index_books.py"], cwd=BASE_DIR, capture_output=True, text=True)
        if result.returncode == 0:
            database.update_document_status(upload_id, "Success", "Indexed successfully")
            rag_engine.reload_index()
            print(f'[UPLOAD] Task {upload_id} Success')
        else:
            database.update_document_status(upload_id, "Failed", result.stderr[-200:] if result.stderr else "Failed without error trace")
            print(f'[UPLOAD] Task {upload_id} Failed: {result.stderr}')
    except Exception as e:
        database.update_document_status(upload_id, "Failed", str(e))
        print(f'[UPLOAD] Task {upload_id} Exception: {e}')

@app.post("/api/upload")
async def upload_file(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")
    
    file_path = os.path.join(DATA_DIR, file.filename)
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {e}")
        
    doc_ext = file.filename.split('.')[-1].lower() if '.' in file.filename else "unknown"
    upload_id = database.upsert_document(file.filename, doc_ext, "Processing", "", "File saved, indexing...")
    background_tasks.add_task(process_upload_task, upload_id)
    
    return JSONResponse(content={"message": f"Successfully uploaded {file.filename}", "upload_id": upload_id})

@app.get("/api/uploads")
def get_uploads():
    return database.get_all_documents()

@app.get("/api/dashboard_stats")
def get_dashboard_stats():
    return database.get_dashboard_metrics()



@app.get("/")
def read_index():
    return FileResponse(os.path.join(BASE_DIR, "index.html"))

@app.get("/{file_name}")
def read_static(file_name: str):
    file_path = os.path.join(BASE_DIR, file_name)
    if os.path.isfile(file_path):
        return FileResponse(file_path)
    return FileResponse(os.path.join(BASE_DIR, "index.html"))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
