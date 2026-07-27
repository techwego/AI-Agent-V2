import os
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from rag_engine import LibraryRAG
import uvicorn

app = FastAPI()

# Data and Index directory path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data")
CHROMA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "chroma_db")

# Initialize RAG engine
rag = LibraryRAG(data_dir=DATA_DIR, persist_dir=CHROMA_DIR)

# Try to initialize at startup
try:
    rag.initialize()
except Exception as e:
    print(f"Warning: RAG initialization failed during startup: {e}. (Did you set GEMINI_API_KEY?)")

class ChatRequest(BaseModel):
    message: str

class ChatResponse(BaseModel):
    response: str

@app.post("/api/chat", response_model=ChatResponse)
def chat(request: ChatRequest):
    if not rag.qa_chain:
        try:
            rag.initialize()
        except Exception as e:
            return ChatResponse(response=f"Error initializing RAG: {e}")
    
    answer = rag.query(request.message)
    return ChatResponse(response=answer)

# Mount the static files (like logo.png)
app.mount("/assets", StaticFiles(directory=os.path.join(BASE_DIR, "assets")), name="assets")

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
