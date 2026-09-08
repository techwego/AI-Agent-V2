# 📚 LibGenie: Next-Generation Campus Intelligence & AI Library Assistant

LibGenie is a cutting-edge, voice-first AI assistant designed to transform the academic library experience. Built with ultra-low latency semantic search, real-time voice synthesis, and 3D spatial wayfinding, LibGenie modernizes how students interact with institutional knowledge.

---

## 🎙️ 1. Real-Time Conversational Voice AI
- **Natural Language Interaction:** Students can speak to LibGenie just like a human librarian. No rigid commands required.
- **Ultra-Fast Processing:** Powered by the Groq Llama-3.3-70B engine and Whisper STT for sub-second response times.
- **Dual TTS Engine:** Features high-quality, emotionally intelligent voices (like *Microsoft Pallavi Natural*), with intelligent failovers (Edge-TTS to local browser synthesis) to ensure 100% uptime.
- **LipSync & Interactive UI:** The central Plasma Voice Core visually pulses and syncs with the AI's speech, creating an engaging, physical-feeling presence.

## 🧠 2. Semantic Catalog Search (RAG Engine)
- **Beyond Keywords:** Powered by a ChromaDB vector database, students can describe concepts (e.g., *"I need a beginner book on neural networks"*) rather than needing exact titles or ISBNs.
- **Live Inventory Tracking:** Instantly checks real-time database availability and calculates exactly how many copies remain on the shelf.
- **Context-Aware Memory:** Remembers the flow of conversation so students can ask follow-up questions seamlessly.

## 🧭 3. 3D Spatial Wayfinding
- **Visual Shelf Navigation:** Instead of just giving a rack number, LibGenie renders an interactive 3D map of the library.
- **Step-by-Step Directions:** Visually highlights the exact floor, row, and shelf where the requested book is located, dramatically reducing time spent wandering aisles.

## 📊 4. Enterprise Analytics & Procurement Intelligence
- **Missing Book Demands:** The system passively tracks exactly what books students are asking for that *aren't* in the catalog, providing librarians with a direct blueprint for future procurement.
- **Custom Telemetry:** A beautiful, chart-driven dashboard tracks daily voice queries, user activity, and catalog usage.
- **Data Governance:** Admins have full control over data retention, including custom date/time filters and automated 30-day log cleanup options to maintain database hygiene.
- **One-Click Exports:** Export missing demand reports and analytics directly to beautifully formatted Excel or CSV sheets.

## ⚙️ 5. Ultimate Institutional Customization
- **Dynamic Persona Settings:** The library can fully rebrand the AI. Change the name (e.g., from *Sam* to *Muthazhagi*), the library's name, and the default greeting message instantly from the admin dashboard.
- **Voice Preferences:** Select from curated Indian English (and global) natural voices to match the cultural context of your campus.
- **Dynamic Knowledge Injection:** The AI automatically understands your specific library hours, borrowing policies, and Wi-Fi rules without needing custom code.

## 📢 6. Campus Notice Engine
- **Digital Circulars:** Broadcast university notices, holiday alerts, and event schedules directly through the LibGenie interface.
- **Categorized Updates:** Supports distinct tags for Exams, Holidays, Events, and General Notices.

## 🔒 7. Secure & Scalable Architecture
- **Enterprise Grade Security:** Features encrypted admin/student authentication, secure role-based access, and SSL compatibility.
- **High-Performance Architecture:** Built on FastAPI, React, and SQLite/PostgreSQL, designed to handle thousands of concurrent queries during peak exam seasons without crashing.
- **Resource Efficient:** Employs hybrid processing to minimize API costs while maximizing response speed.

---

*Engineered with passion for world-class education. Built by Techwego.*
