# Athenaeum Voice Concierge (Sam) 🎙️📚

A complete, end-to-end Voice AI Library Assistant that helps students navigate the library, search for books, and ask questions about library services. Powered by **Retrieval-Augmented Generation (RAG)**, **Gemini Flash**, and **Web Speech API**, this project provides a dynamic, professional, and entirely voice-driven interactive experience.

---

## 🌟 Key Features

1. **Professional Voice AI (Sam):** A carefully tuned, conversational virtual receptionist that responds instantly and accurately, strictly providing the information requested without unnecessary filler.
2. **Retrieval-Augmented Generation (RAG):** The AI answers are grounded entirely in your custom documents. It won't hallucinate information outside of the provided library database.
3. **Real-time Librarian Upload:** A hidden admin panel allows librarians to upload new PDFs, Word documents, or text files directly from the web interface, instantly training the AI on new material.
4. **Instant Voice Interaction:** Optimized Web Speech API integration that cuts out microphone latency, triggering the LLM the millisecond you finish speaking.
5. **Dynamic 3D User Interface:** Glassmorphic UI featuring a live-rendered Three.js interactive orb that reacts to voice input and application states.
6. **Smart Map Routing:** An A* algorithm that dynamically draws routes on an isometric floor plan based on the user's queries.

---

## 🏗️ System Architecture

- **Frontend:** Pure HTML/CSS/JavaScript. Uses Web Speech API for STT (Speech-to-Text) and TTS (Text-to-Speech). `Three.js` is used for 3D animations.
- **Backend:** `FastAPI` (Python). Serves static files and provides the `/api/chat` and `/api/upload` endpoints.
- **AI Engine:** `LangChain` orchestration, utilizing `Google Generative AI` (Gemini Flash) for extremely fast inference.
- **Vector Database:** `ChromaDB` (local, persistent storage) used to store and retrieve document embeddings (`all-MiniLM-L6-v2`).

---

## 🚀 Prerequisites

Before you begin, ensure you have the following installed:
- **Python 3.9+**
- **pip** (Python package installer)
- A **Google Gemini API Key**
- **Google Chrome** (Highly recommended for the best Web Speech API compatibility)

---

## 🛠️ Installation & Setup

1. **Navigate to the project directory:**
   ```bash
   cd speech-to-speech-main
   ```

2. **Install Python Dependencies:**
   ```bash
   pip install fastapi uvicorn langchain langchain-huggingface langchain-google-genai chromadb pypdf docx2txt sentence-transformers unstructured python-multipart
   ```

3. **Set your API Key:**
   Open `run_local.bat` in a text editor and ensure your Gemini API key is correctly set:
   ```bat
   set GEMINI_API_KEY=your_api_key_here
   ```

4. **Add Initial Data (Optional):**
   Place any initial PDFs, `.txt`, or `.docx` files in the `data/` folder before the first run so the RAG engine can build the vector database.

---

## 🏃 Running the Application

1. **Start the server:**
   Simply double-click the `run_local.bat` script, or run it from the terminal:
   ```bash
   .\run_local.bat
   ```
2. **Access the Web App:**
   Open Google Chrome and navigate to:
   ```
   http://localhost:8000
   ```
3. **Interact:**
   Click the glowing orb to initiate Sam. Speak your queries (e.g., *"Where is the Python book?"*).

---

## 📂 File Structure

```text
speech-to-speech-main/
│
├── index.html               # Main Frontend interface (UI, TTS, STT, 3D Orb, Routing)
├── app.js                   # Client-side helper scripts
├── run_local.bat            # Windows startup script (sets ENV vars and launches Uvicorn)
│
├── data/                    # Directory for initial PDF/Word/TXT documents
│
├── backend/
│   ├── main.py              # FastAPI application and routing
│   ├── rag_engine.py        # LangChain logic, ChromaDB management, and LLM Persona definitions
│   └── chroma_db/           # Persistent local vector database (auto-generated)
```

---

## 🌐 API Endpoints

- `POST /api/chat`
  - **Payload:** `{"message": "User query string"}`
  - **Response:** `{"response": "AI's generated answer based on RAG context"}`

- `POST /api/upload`
  - **Payload:** `multipart/form-data` (File upload)
  - **Response:** Stores file in `data/` and triggers real-time ChromaDB ingestion.

---

## 🎛️ Customizing the AI Persona

The AI's personality, tone, and behavior rules are centrally managed in the backend prompt.

To modify the AI Persona:
1. Open `backend/rag_engine.py`.
2. Locate the `system_prompt` variable.
3. Edit the instructions, restrictions, or examples to suit your specific use case.
4. Restart the backend server.

### Voice Customization
The frontend dynamically searches for the best professional female voice available on the user's operating system. This logic is located in `index.html` inside the `speakText()` function. The default speaking rate is tuned to `1.2` for an optimal brisk conversational speed on Windows.

---

## 🔐 Librarian Access (Hidden Feature)

To upload documents to the AI's brain directly from the browser:
1. Click **"User Login"** on the top navigation bar.
2. Enter the default credentials:
   - **Username:** `admin`
   - **Password:** `admin`
3. Upload a PDF or Word document. The AI will learn it instantly without requiring a server restart.

---

## 🔧 Troubleshooting

- **The AI isn't speaking or hearing me:** Ensure you are using Google Chrome and have granted Microphone permissions to `localhost`.
- **The voice sounds slow or robotic:** Refresh the browser. Ensure your Windows OS has English language packs installed.
- **500 Internal Server Error:** Check the terminal running the backend. This usually indicates an invalid or expired Gemini API key in `run_local.bat`.
- **RAG Engine is not initialized:** Ensure the `data/` folder exists and contains at least one readable document, or use the Librarian upload panel to add one.
