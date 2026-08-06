import os
if os.environ.get("RAILWAY_ENVIRONMENT"):
    os.environ["OMP_NUM_THREADS"] = "1"
    os.environ["ONNXRUNTIME_NUM_THREADS"] = "1"
    os.environ["TOKENIZERS_PARALLELISM"] = "false"

from fastapi import FastAPI, UploadFile, File, HTTPException, BackgroundTasks, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
import shutil
from pydantic import BaseModel
try:
    from backend.rag.engine import LibraryRAG
except ImportError:
    from rag.engine import LibraryRAG
import uvicorn
import sys
import time
import psutil
import threading
from typing import Optional
from sqlalchemy import text
from sqlalchemy.orm import Session

from backend.config import Config
from backend.database.db import init_db, SessionLocal, get_db
from backend.database.models import User, RoleEnum
from backend.auth.auth_service import hash_password
from backend.auth.auth_routes import router as auth_router
from backend.api.admin_routes import router as admin_router
from backend.api.upload_routes import router as upload_router
from backend.auth.auth_middleware import require_auth, require_admin

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATA_DIR = Config.DATA_DIR
CHROMA_DIR = Config.PERSIST_DIR

rag = LibraryRAG(data_dir=DATA_DIR, persist_dir=CHROMA_DIR)

# Expose RAG to other modules if needed
rag_engine = rag

def create_default_users():
    db = SessionLocal()
    try:
        admin = db.query(User).filter(User.username == "admin").first()
        if not admin:
            db.add(User(username="admin", hashed_password=hash_password("admin123"), role=RoleEnum.admin))
            
        user = db.query(User).filter(User.username == "user").first()
        if not user:
            db.add(User(username="user", hashed_password=hash_password("user123"), role=RoleEnum.user))
            
        db.commit()
    finally:
        db.close()

# Initialize DB schema
init_db()
create_default_users()

# Include routers
app.include_router(auth_router)
app.include_router(admin_router)
app.include_router(upload_router)

def init_rag_bg():
    def watchdog():
        time.sleep(1800)
        if not rag.ready and getattr(rag, "state", None) != "ERROR":
            print("[WATCHDOG] Initialization timeout (1800s) exceeded!")
            if hasattr(rag, "state"):
                rag.state = "ERROR"
                
    threading.Thread(target=watchdog, daemon=True).start()
    
    try:
        print("Starting background RAG initialization...")
        rag.initialize()
        print("Background RAG initialization complete.")
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
    return {
        "status": "ready" if rag.ready else "initializing",
        "state": getattr(rag, "state", "UNKNOWN"),
        "uptime": round(time.time() - START_TIME, 2),
    }

@app.get('/api/admin/system-status')
def get_system_status(db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    try:
        db.execute(text('SELECT 1'))
        db_status = 'online'
    except Exception:
        db_status = 'offline'

    try:
        if rag_engine.ready and hasattr(rag_engine, 'collection'):
            chunks_count = rag_engine.collection.count()
            vector_status = 'online'
        else:
            chunks_count = 0
            vector_status = 'offline'
    except Exception:
        chunks_count = 0
        vector_status = 'offline'

    rag_state = getattr(rag_engine, 'state', 'UNKNOWN')
    uptime_seconds = int(time.time() - START_TIME)
    
    mem = psutil.virtual_memory()
    ram_mb = round(mem.used / (1024 * 1024), 2)
    
    return {
        "database": {"status": db_status, "label": "SQLite Database"},
        "vector_db": {"status": vector_status, "label": "ChromaDB", "chunks": chunks_count},
        "rag_engine": {"status": rag_state, "label": "RAG Engine"},
        "voice_api": {"status": "online", "label": "Voice API"},
        "uptime_seconds": uptime_seconds,
        "ram_mb": ram_mb
    }

@app.get("/diagnostics")
def diagnostics():
    mem = psutil.virtual_memory()
    return {
        "current_ram_mb": round(mem.used / (1024 * 1024), 2),
        "active_requests": ACTIVE_REQUESTS,
    }

class SearchRequest(BaseModel):
    query: str

@app.post("/api/search")
async def search_books(request: SearchRequest, current_user: User = Depends(require_auth)):
    if not rag.ready:
        raise HTTPException(status_code=503, detail="RAG not ready")
    
    vector_results = rag._vector_search(request.query, top_k=20)
    bm25_results = rag._bm25_search(request.query, top_k=20)
    combined = rag._reciprocal_rank_fusion(vector_results, bm25_results)
    
    top_chunks = combined[:10]
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

class ChatRequest(BaseModel):
    message: str
    test: Optional[str] = None
    history: list[dict] = []

@app.post("/api/chat")
async def chat(request: ChatRequest):
    print(f"\n[BACKEND] POST /api/chat received from user")
    
    if not rag.ready:
        state_val = getattr(rag, "state", "INITIALIZING")
        return JSONResponse(status_code=503, content={"status": "initializing", "state": state_val})
    
    def generate():
        for chunk in rag.query_stream(request.message, history=request.history):
            yield chunk

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
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(temp_audio_path):
            os.remove(temp_audio_path)

import edge_tts
import uuid

class TTSRequest(BaseModel):
    text: str

@app.post("/api/tts")
async def generate_tts(request: TTSRequest, background_tasks: BackgroundTasks):
    if not request.text:
        raise HTTPException(status_code=400, detail="No text provided")
        
    temp_filename = f"temp_tts_{uuid.uuid4().hex}.mp3"
    temp_path = os.path.join(tempfile.gettempdir(), temp_filename)
    
    try:
        communicate = edge_tts.Communicate(request.text, "en-US-AriaNeural")
        await communicate.save(temp_path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
        
    def cleanup():
        try:
            if os.path.exists(temp_path):
                os.remove(temp_path)
        except:
            pass
            
    background_tasks.add_task(cleanup)
    # Return file and ensure it is cleaned up afterwards
    return FileResponse(temp_path, media_type="audio/mpeg", background=background_tasks)

frontend_dist = os.path.join(BASE_DIR, "frontend", "dist")
if os.path.isdir(frontend_dist):
    # Serve static assets (JS, CSS, images) from the dist/assets folder
    assets_dir = os.path.join(frontend_dist, "assets")
    if os.path.isdir(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="static_assets")

    # Catch-all: serve index.html for any non-API route (React SPA routing)
    @app.get("/{full_path:path}")
    async def serve_react(full_path: str):
        # If requesting a specific file extension (js, css, map, etc.) that doesn't exist, return 404
        # This prevents serving index.html for stale cached asset requests after a new build
        if full_path and '.' in full_path.split('/')[-1]:
            file_path = os.path.join(frontend_dist, full_path)
            if os.path.isfile(file_path):
                return FileResponse(file_path)
            # Stale asset request — return 404 so browser knows to reload
            raise HTTPException(status_code=404, detail="Asset not found")
        
        # For all other routes, serve index.html with no-cache headers
        # This ensures the browser always gets the latest index.html pointing to the latest JS/CSS bundles
        index_path = os.path.join(frontend_dist, "index.html")
        return FileResponse(
            index_path, 
            headers={
                "Cache-Control": "no-cache, no-store, must-revalidate",
                "Pragma": "no-cache",
                "Expires": "0"
            }
        )
else:
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

