# Library Virtual Assistant (Speech-to-Speech RAG System)

An enterprise-grade, speech-enabled conversational AI for library management. This system allows users to interact with a library catalog (10,000+ records), policies, and research guides entirely via voice.

## 🚀 Tech Stack

### Frontend (Client-Side)
* **HTML/CSS/JS (Vanilla)**: A lightweight, ultra-fast user interface.
* **Speech-to-Text (STT)**: HTML5 `MediaRecorder` API combined with the Web Audio API (`AnalyserNode`) to automatically detect when a user starts and stops speaking.
* **Text-to-Speech (TTS)**: Browser native Web Speech API (`speechSynthesis`) configured with natural-sounding female voices.

### Backend (Server-Side)
* **FastAPI (Python)**: High-performance asynchronous backend server.
* **Groq SDK**: Connects to Groq's specialized inference hardware for blazing-fast AI execution.

### Artificial Intelligence & RAG
* **LLM (Language Model)**: `llama-3.1-8b-instant` (via Groq API)
* **Transcription (STT)**: `whisper-large-v3-turbo` (via Groq API) - Used to transcribe user voice blobs robustly.
* **Vector Database**: ChromaDB (Persistent Local Storage)
* **Dense Embedding Model**: `BAAI/bge-small-en-v1.5` (via `fastembed` for fast CPU execution)
* **Sparse Keyword Search**: BM25 (Pre-tokenized and cached locally)
* **Cross-Encoder Reranker**: `Xenova/ms-marco-MiniLM-L-6-v2` (via `fastembed`)

---

## 🏗️ Architecture Workflow

### 1. Data Ingestion (One-Time Setup)
The data ingestion pipeline handles massive datasets (tested up to 10,000+ items).
1. `index_books.py` reads `book_catalog.csv`, `.xlsx`, `.docx`, and `.txt` files.
2. It parses and maps the data into highly structured semantic "chunks" (e.g., combining Title, Author, Call Number, and Location).
3. The chunks are embedded using the dense model and stored into **ChromaDB**.
4. A **BM25** index is simultaneously generated, tokenized, and serialized to disk (`bm25_cache.pkl`).

### 2. Voice Interaction (Runtime)
1. **User Speaks**: The user clicks the microphone button. The browser begins recording using `MediaRecorder`.
2. **Silence Detection**: The Web Audio API continually monitors volume. Once the user stops speaking for 1.5 seconds, it stops the recording automatically.
3. **Transcription**: The recorded `.webm` audio chunk is sent to the backend `/api/transcribe` endpoint, which pushes it to Groq's Whisper API and returns exact text.
4. **Processing**: The text is pushed to `/api/chat`.

### 3. Retrieval-Augmented Generation (RAG)
1. **Hybrid Search**: The backend searches the query against ChromaDB (Semantic) and BM25 (Keyword). 
2. **Reciprocal Rank Fusion (RRF)**: It merges the results, taking the Top 20 best hits.
3. **Reranking**: The `TextCrossEncoder` aggressively reranks the top 20 hits against the user's exact query, keeping only the Top 5 most relevant documents.
4. **Generation**: The Top 5 documents are formatted as structured context and sent to the `llama-3.1-8b-instant` model alongside the system prompt.
5. **Streaming**: The LLM streams its answer back to the frontend, which is then spoken aloud by the browser's TTS engine.

---

## 🛠️ Installation & Setup

1. **Install Dependencies**:
```bash
pip install -r requirements.txt
```

2. **Environment Variables**:
Create a `.env` file in the root directory:
```env
GROQ_API_KEY=your_groq_api_key_here
```

3. **Ingest the Catalog (First Run Only)**:
Run the indexer to process all 10,000+ books into the vector database.
```bash
python index_books.py
```

4. **Start the Server**:
Run the FastAPI backend.
```bash
uvicorn backend.api.main:app --host 127.0.0.1 --port 8000
```

5. **Access the Application**:
Open your browser and navigate to `http://127.0.0.1:8000`.
