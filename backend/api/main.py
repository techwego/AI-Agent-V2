import os
import sys
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

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
from backend.database.models import User, RoleEnum, ConversationHistory
from backend.auth.auth_service import hash_password
from backend.auth.auth_routes import router as auth_router
from backend.api.admin_routes import router as admin_router
from backend.api.upload_routes import router as upload_router
from backend.api.book_routes import router as book_router
from backend.api.analytics_routes import router as analytics_router
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
app.include_router(book_router)
app.include_router(analytics_router)

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
    
    results = rag.search_catalog(request.query, limit=15)
    return {
        "count": len(results),
        "chunks": results
    }

class ChatRequest(BaseModel):
    message: str
    test: Optional[str] = None
    history: list[dict] = []

@app.post("/api/chat")
async def chat(request: ChatRequest):
    print(f"\n[BACKEND] POST /api/chat received from user: '{request.message}'")
    
    if not rag.ready:
        # Wait up to 3s if system is currently finishing startup
        for _ in range(15):
            if rag.ready:
                break
            time.sleep(0.2)
            
    if not rag.ready:
        state_val = getattr(rag, "state", "INITIALIZING")
        def stream_init():
            yield f"I am currently finishing setting up the library catalog ({state_val}). Please try your question again in a few seconds."
        return StreamingResponse(stream_init(), media_type="text/plain")
    
    def generate():
        full_response = ""
        for chunk in rag.query_stream(request.message, history=request.history):
            full_response += chunk
            yield chunk
            
        # After streaming is complete, save to DB in background
        try:
            db = SessionLocal()
            # If user auth is added to chat, use their ID. Defaulting to None for anonymous.
            # Assuming 'test' user logic or similar if needed. For now, user_id=None
            history_record = ConversationHistory(
                user_id=None,
                query=request.message,
                response=full_response
            )
            db.add(history_record)
            db.commit()
            db.close()
        except Exception as e:
            print(f"Failed to log conversation: {e}")

    return StreamingResponse(generate(), media_type="text/plain")

import tempfile
import re
from groq import Groq

HALLUCINATED_PHRASES = {
    'thank you', 'thank you.', 'thank you!', 'thanks', 'thanks.', 'thanks!',
    'thank you very much', 'thank you very much.', 'thank you so much',
    'thank you for watching', 'thank you for watching.', 'thanks for watching',
    'thanks for watching.', 'subtitles by', 'you', 'bye', 'bye.', 'bye!',
    'please subscribe', 'subscribe', 'goodbye', 'goodbye.', 'mbc',
    'sous-titres', 'amara.org'
}

def is_stt_hallucination(text: str) -> bool:
    if not text:
        return True
    cleaned = text.strip()
    normalized = re.sub(r'[^\w\s]', '', cleaned).strip().lower()
    if not normalized or normalized in HALLUCINATED_PHRASES:
        return True
    parts = [p.strip() for p in re.split(r'[.!?]+', cleaned) if p.strip()]
    if parts and all(re.sub(r'[^\w\s]', '', p).strip().lower() in HALLUCINATED_PHRASES for p in parts):
        return True
    return False

@app.post("/api/transcribe")
async def transcribe_audio(audio: UploadFile = File(...)):
    if not Config.GROQ_API_KEY:
        raise HTTPException(status_code=500, detail="Groq API key not configured")
    
    with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as temp_audio:
        shutil.copyfileobj(audio.file, temp_audio)
        temp_audio_path = temp_audio.name

    try:
        # Only discard files smaller than 300 bytes (which indicates completely empty WebM headers with zero frames)
        file_size = os.path.getsize(temp_audio_path)
        if file_size < 300:
            print(f"[STT] Discarded empty audio container ({file_size} bytes)")
            return {"text": ""}

        client = Groq(api_key=Config.GROQ_API_KEY)
        with open(temp_audio_path, "rb") as file:
            transcription = client.audio.transcriptions.create(
                file=(audio.filename or "recording.webm", file.read()),
                model="whisper-large-v3-turbo",
                language="en",
                temperature=0.0,
                prompt="Harry Potter, Machine Learning, Python, Database, Algorithms, Engineering, Rack C6, Floor 1, Floor 2, Central Library.",
                response_format="json",
            )
        
        raw_text = transcription.text.strip() if transcription and transcription.text else ""
        if is_stt_hallucination(raw_text):
            print(f"[STT] Filtered Whisper silence hallucination: '{raw_text}'")
            return {"text": ""}

        print(f"[STT] Whisper transcribed: '{raw_text}'")
        return {"text": raw_text}
    except Exception as e:
        print(f"[STT] Transcription error: {e}")
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
    # Fetch the selected voice from the database
    voice = "en-US-AriaNeural"
    try:
        db_gen = get_db()
        db = next(db_gen)
        from backend.database.models import LibraryConfig
        config = db.query(LibraryConfig).first()
        if config and config.voice_preset:
            voice = config.voice_preset
    except Exception as e:
        print(f"Failed to fetch voice preset: {e}")
        
    temp_filename = f"temp_tts_{uuid.uuid4().hex}.mp3"
    temp_filepath = os.path.join(tempfile.gettempdir(), temp_filename)
    
    tts_generated = False
    # 1. Try Edge TTS with a 3.0s strict timeout
    try:
        communicate = edge_tts.Communicate(request.text, voice)
        await asyncio.wait_for(communicate.save(temp_filepath), timeout=3.0)
        tts_generated = True
    except Exception as e:
        print(f"[TTS] Edge-TTS timeout or error ({e}), trying gTTS fallback...")

    # 2. Fallback to gTTS if Edge TTS failed
    if not tts_generated:
        try:
            from gtts import gTTS
            tts = gTTS(text=request.text, lang='en')
            tts.save(temp_filepath)
            tts_generated = True
            print("[TTS] gTTS fallback generated successfully.")
        except Exception as e:
            print(f"[TTS] gTTS error: {e}")

    if not tts_generated or not os.path.exists(temp_filepath):
        raise HTTPException(status_code=503, detail="TTS service temporarily unavailable, fallback to browser synthesis")
        
    def cleanup():
        try:
            if os.path.exists(temp_filepath):
                os.remove(temp_filepath)
        except:
            pass
            
    background_tasks.add_task(cleanup)
    # Return file and ensure it is cleaned up afterwards
    return FileResponse(temp_filepath, media_type="audio/mpeg", background=background_tasks)

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

