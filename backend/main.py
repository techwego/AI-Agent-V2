import os
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
import shutil
from pydantic import BaseModel
try:
    from backend.rag_engine import LibraryRAG
except ImportError:
    from rag_engine import LibraryRAG
import uvicorn

app = FastAPI()

# Data and Index directory path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data")
CHROMA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "chroma_db")

# Initialize RAG engine
rag = LibraryRAG(data_dir=DATA_DIR, persist_dir=CHROMA_DIR)


import threading

# Initialize RAG in background so it doesn't block FastAPI startup or cause 504 timeouts
def init_rag_bg():
    try:
        print("Starting background RAG initialization...")
        rag.initialize()
        print("Background RAG initialization complete.")
    except Exception as e:
        print(f"Background RAG init failed: {e}")

threading.Thread(target=init_rag_bg, daemon=True).start()

class ChatRequest(BaseModel):
    message: str

class ChatResponse(BaseModel):
    response: str

@app.post("/api/chat", response_model=ChatResponse)
def chat(request: ChatRequest):
    if not rag.qa_chain:
        return ChatResponse(response="I am currently organizing the massive library archives you uploaded. Please give me about one minute to finish reading them, and then ask your question again!")
    
    answer = rag.query(request.message)
    return ChatResponse(response=answer)

@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")
    
    # Save the file to the data directory
    file_path = os.path.join(DATA_DIR, file.filename)
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {e}")
        
    # Ingest into RAG
    if not rag.vector_store:
        try:
            rag.initialize()
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to init RAG: {e}")
            
    success = rag.ingest_file(file_path)
    if success:
        return JSONResponse(content={"message": f"Successfully uploaded and ingested {file.filename}"})
    else:
        raise HTTPException(status_code=500, detail="File saved but failed to ingest into AI database.")




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
