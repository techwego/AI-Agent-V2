# 📋 Project Git Push & Version Update Tracking Log

> Comprehensive project changelog tracking all commits, version releases, architecture updates, and UI/UX improvements.

| Date | Time (IST) | Commit ID | Version | Project / Module | What Was Changed | What Was Fixed | Status |
|---|---|---|---|---|---|---|---|
| **2026-08-27** | 11:24 IST | `aec26e8` | **v6.0.1** | Voice Pipeline, STT/TTS | Fixed voice synthesis initialization and error handlers in Edge/Chromium. | TTS engine failing on page load without user interaction. | Completed & Pushed |
| **2026-08-27** | 11:42 IST | `beff0c0` | **v6.0.3** | RAG Engine, Book Database | Replaced static caching with real-time live database synchronization on all RAG queries. | Out-of-sync rack locations and newly added books not resolving in vector search. | Completed & Pushed |
| **2026-08-27** | 12:15 IST | `d46f031` | **v6.0.5** | AI Chat, Wayfinder Routing | Eliminated hallucinated rack routes on general conversation questions. | AI returning accidental map routes when users asked non-location questions. | Completed & Pushed |
| **2026-08-27** | 12:58 IST | `769ed38` | **v6.0.7** | Admin Book Catalog | Handled unique constraint checks and available copies editing. | ISBN unique constraint error when updating existing book metadata. | Completed & Pushed |
| **2026-08-27** | 18:14 IST | `e3f43ba` | **v7.0.0** | Global Theme, 3D Wayfinder, 2D Floor Plan Editor, Netlify | Complete enterprise light theme migration (white & light blue), 2D drag-and-drop blueprint editor, separate Voice/Chat state isolation. | Dark theme contrast issues; voice transcripts cluttering text chat; lack of visual floor plan customizer. | Completed & Pushed |
| **2026-08-28** | 10:24 IST | `007c43d` | **v7.1.0** | Admin Voice Settings, TTS Synthesis | Synchronized admin-selected voice across entire session; added Indian female voice catalog; live audio preview. | Greeting played in default male voice before selected voice was applied. | Completed & Pushed |
| **2026-08-28** | 11:21 IST | `19b15bc` | **v7.2.0** | UI Design, Voice Orb, Navigation & Auth | Enterprise-level UI overhaul with gradient buttons, glassmorphic nav bar, shimmer login page, and plasma GLSL orb. | Plain flat buttons in wayfinder and navbar; mic icon overlay on 3D voice sphere. | Completed & Pushed |
| **2026-08-28** | 11:36 IST | `1dd987a` | **v7.3.0** | Animation Engine, Visual Equalizers | Comprehensive dynamic animation overhaul with interactive constellation mesh background and live equalizer soundwaves. | Static look and feel; added rich floating motion physics and active sound visualizer bars. | Completed & Pushed |
| **2026-08-28** | 12:00 IST | `06109a3` | **v7.4.0** | 2D/3D Architecture Synchronization | Synchronized 2D blueprint editor with 3D map viewport; restored prominent floating save buttons; live matrix slider updates. | 3D map falling back to synthetic grid instead of custom 2D layout; missing save button on small viewports; slider changes not reflecting in 3D preview. | Completed & Pushed |


---

## 📝 Detailed Version Release Notes

### 🚀 Release v7.4.0 (2026-08-28 · 12:00 IST)
- **Git Push ID / Commit ID:** `06109a3`
- **Project / Module:** 2D/3D Architecture Synchronization
- **What was changed:** Synchronized 2D blueprint editor with 3D map viewport; restored prominent floating save buttons; live matrix slider updates.
- **What was fixed:** 3D map falling back to synthetic grid instead of custom 2D layout; missing save button on small viewports; slider changes not reflecting in 3D preview.
- **New features added:** Persistent floating [Save Blueprint & Apply to 3D Map] action bar, live 3D matrix regeneration on slider move, dynamic 3D slab scaling.
- **Database / API / Backend changes:** None
- **Important workflow or logic changes:** Any change made in 2D blueprint or slider matrix immediately updates 3D map coordinates in real time.
- **Testing completed:** Vite build passed in 7.27s; Dijkstra pathfinding verified through custom 2D layouts.
- **Current status:** Completed & Pushed
- **Any known issues or pending work:** None

---

### 🚀 Release v7.3.0 (2026-08-28 · 11:36 IST)
- **Git Push ID / Commit ID:** `1dd987a`
- **Project / Module:** Animation Engine, Visual Equalizers
- **What was changed:** Comprehensive dynamic animation overhaul with interactive constellation mesh background and live equalizer soundwaves.
- **What was fixed:** Static look and feel; added rich floating motion physics and active sound visualizer bars.
- **New features added:** AnimatedBackground constellation canvas, live audio soundwave bars for Listening / Speaking states, button specular shimmer sweeps.
- **Database / API / Backend changes:** None
- **Important workflow or logic changes:** Interactive hover physics applied to all cards and buttons across the portal.
- **Testing completed:** Vite build passed in 9.92s.
- **Current status:** Completed & Pushed
- **Any known issues or pending work:** None

---

### 🚀 Release v7.2.0 (2026-08-28 · 11:21 IST)
- **Git Push ID / Commit ID:** `19b15bc`
- **Project / Module:** UI Design, Voice Orb, Navigation & Auth
- **What was changed:** Enterprise-level UI overhaul with gradient buttons, glassmorphic nav bar, shimmer login page, and plasma GLSL orb.
- **What was fixed:** Plain flat buttons in wayfinder and navbar; mic icon overlay on 3D voice sphere.
- **New features added:** 3-octave fractal GLSL simplex noise plasma orb, shimmer submit buttons, gradient chat bubbles, glassmorphic profile pill.
- **Database / API / Backend changes:** None
- **Important workflow or logic changes:** The 3D sphere deforms organically with real-time sound amplitude without needing any 2D mic icons.
- **Testing completed:** Vite production build succeeded in 10.75s with 0 errors.
- **Current status:** Completed & Pushed
- **Any known issues or pending work:** None

---

### 🚀 Release v7.1.0 (2026-08-28 · 10:24 IST)
- **Git Push ID / Commit ID:** `007c43d`
- **Project / Module:** Admin Voice Settings, TTS Synthesis
- **What was changed:** Synchronized admin-selected voice across entire session; added Indian female voice catalog; live audio preview.
- **What was fixed:** Greeting played in default male voice before selected voice was applied.
- **New features added:** Curated Indian female voice catalog (Neerja, Swara, Heera, Priya, Kavya), international voices, and system voice scanner.
- **Database / API / Backend changes:** voice_preset persisted in LibraryConfig model.
- **Important workflow or logic changes:** VoiceAssistant fetches architecture voice config on mount before triggering initial greeting.
- **Testing completed:** Tested audio sample preview and cross-browser speech synthesis.
- **Current status:** Completed & Pushed
- **Any known issues or pending work:** None

---

### 🚀 Release v7.0.0 (2026-08-27 · 18:14 IST)
- **Git Push ID / Commit ID:** `e3f43ba`
- **Project / Module:** Global Theme, 3D Wayfinder, 2D Floor Plan Editor, Netlify
- **What was changed:** Complete enterprise light theme migration (white & light blue), 2D drag-and-drop blueprint editor, separate Voice/Chat state isolation.
- **What was fixed:** Dark theme contrast issues; voice transcripts cluttering text chat; lack of visual floor plan customizer.
- **New features added:** FloorPlanEditor2D component with 1m grid snapping, 3D multi-floor wayfinder with Catmull-Rom route tubes, Netlify deployment configuration.
- **Database / API / Backend changes:** Added custom_layout column to LibraryConfig model and admin architecture endpoint.
- **Important workflow or logic changes:** Voice Mode and Chat Mode operate on independent message state arrays.
- **Testing completed:** Full frontend Vite build verified; 3D Three.js rendering confirmed.
- **Current status:** Completed & Pushed
- **Any known issues or pending work:** None

---

### 🚀 Release v6.0.7 (2026-08-27 · 12:58 IST)
- **Git Push ID / Commit ID:** `769ed38`
- **Project / Module:** Admin Book Catalog
- **What was changed:** Handled unique constraint checks and available copies editing.
- **What was fixed:** ISBN unique constraint error when updating existing book metadata.
- **New features added:** Available copies live counter & quick edit modal.
- **Database / API / Backend changes:** Updated PUT /api/admin/books/{id} to exclude current book ID from ISBN uniqueness check.
- **Important workflow or logic changes:** Admins can edit book titles, authors, and rack assignments without ISBN collision.
- **Testing completed:** Admin CRUD tested with multiple duplicate ISBN scenarios.
- **Current status:** Completed & Pushed
- **Any known issues or pending work:** None

---

### 🚀 Release v6.0.5 (2026-08-27 · 12:15 IST)
- **Git Push ID / Commit ID:** `d46f031`
- **Project / Module:** AI Chat, Wayfinder Routing
- **What was changed:** Eliminated hallucinated rack routes on general conversation questions.
- **What was fixed:** AI returning accidental map routes when users asked non-location questions.
- **New features added:** Explicit location query intent detector.
- **Database / API / Backend changes:** Strict JSON schema validation on tool calls in Groq engine.
- **Important workflow or logic changes:** Map route only triggered when explicit book title or rack code is requested.
- **Testing completed:** Verified 20+ general and navigational query prompts.
- **Current status:** Completed & Pushed
- **Any known issues or pending work:** None

---

### 🚀 Release v6.0.3 (2026-08-27 · 11:42 IST)
- **Git Push ID / Commit ID:** `beff0c0`
- **Project / Module:** RAG Engine, Book Database
- **What was changed:** Replaced static caching with real-time live database synchronization on all RAG queries.
- **What was fixed:** Out-of-sync rack locations and newly added books not resolving in vector search.
- **New features added:** Live DB fallback vector matching.
- **Database / API / Backend changes:** Updated /api/chat query processor to query SQLAlchemy books table directly.
- **Important workflow or logic changes:** Book searches now query both live database and vector index.
- **Testing completed:** FastAPI test suite passed 100%.
- **Current status:** Completed & Pushed
- **Any known issues or pending work:** None

---

### 🚀 Release v6.0.1 (2026-08-27 · 11:24 IST)
- **Git Push ID / Commit ID:** `aec26e8`
- **Project / Module:** Voice Pipeline, STT/TTS
- **What was changed:** Fixed voice synthesis initialization and error handlers in Edge/Chromium.
- **What was fixed:** TTS engine failing on page load without user interaction.
- **New features added:** Web Speech API fallback engine with resilient audio synthesis.
- **Database / API / Backend changes:** None
- **Important workflow or logic changes:** Speech manager waits for onvoiceschanged before triggering greeting.
- **Testing completed:** Audio playback verified in Edge & Chrome.
- **Current status:** Completed & Pushed
- **Any known issues or pending work:** None

---

