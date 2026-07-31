# Changelog

All notable changes to this project will be documented in this file.

## [v1.0.0] - 2026-07-31
### Added & Improved
- **Enterprise RAG Pipeline for 10,000+ Records:** 
  - Separated the database ingestion process from the runtime server via `index_books.py`. The server now boots in under 1.5 seconds by reading a persistent ChromaDB store and BM25 cache.
  - Integrated `BAAI/bge-small-en-v1.5` for dense vector search and BM25 for sparse keyword search.
  - Added a highly accurate Cross-Encoder reranker (`Xenova/ms-marco-MiniLM-L-6-v2`) to filter the top 20 hybrid search results down to the most relevant top 5.
- **Robust Speech-To-Text (STT):**
  - Completely removed the browser's native `webkitSpeechRecognition` to eliminate flaky "network" errors.
  - Implemented the HTML5 `MediaRecorder` API combined with the Web Audio API (`AnalyserNode`) for **automatic silence detection**.
  - Audio is now sent directly to the FastAPI backend and transcribed using Groq's blazing-fast `whisper-large-v3-turbo` model.
- **Backend Architecture:**
  - Standardized the FastAPI endpoints (`/api/chat`, `/api/transcribe`).
  - LLM integration utilizes `llama-3.1-8b-instant` via Groq for ultra-low latency conversational responses.

### Status
- **Stable**. This version successfully ingests, embeds, and queries over 10,000 book records and provides near-instantaneous voice dictation and conversational replies.
