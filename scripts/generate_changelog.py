import csv
import json
import os
import sys

# Structured Project Update Log Entries from yesterday to current
updates = [
    {
        "Date": "2026-08-27",
        "Time": "11:24 IST",
        "Commit_ID": "aec26e8",
        "Version": "v6.0.1",
        "Module": "Voice Pipeline, STT/TTS",
        "What_Changed": "Fixed voice synthesis initialization and error handlers in Edge/Chromium.",
        "What_Fixed": "TTS engine failing on page load without user interaction.",
        "New_Features": "Web Speech API fallback engine with resilient audio synthesis.",
        "Backend_Changes": "None",
        "Workflow_Changes": "Speech manager waits for onvoiceschanged before triggering greeting.",
        "Testing_Completed": "Audio playback verified in Edge & Chrome.",
        "Status": "Completed & Pushed",
        "Pending_Work": "None"
    },
    {
        "Date": "2026-08-27",
        "Time": "11:42 IST",
        "Commit_ID": "beff0c0",
        "Version": "v6.0.3",
        "Module": "RAG Engine, Book Database",
        "What_Changed": "Replaced static caching with real-time live database synchronization on all RAG queries.",
        "What_Fixed": "Out-of-sync rack locations and newly added books not resolving in vector search.",
        "New_Features": "Live DB fallback vector matching.",
        "Backend_Changes": "Updated /api/chat query processor to query SQLAlchemy books table directly.",
        "Workflow_Changes": "Book searches now query both live database and vector index.",
        "Testing_Completed": "FastAPI test suite passed 100%.",
        "Status": "Completed & Pushed",
        "Pending_Work": "None"
    },
    {
        "Date": "2026-08-27",
        "Time": "12:15 IST",
        "Commit_ID": "d46f031",
        "Version": "v6.0.5",
        "Module": "AI Chat, Wayfinder Routing",
        "What_Changed": "Eliminated hallucinated rack routes on general conversation questions.",
        "What_Fixed": "AI returning accidental map routes when users asked non-location questions.",
        "New_Features": "Explicit location query intent detector.",
        "Backend_Changes": "Strict JSON schema validation on tool calls in Groq engine.",
        "Workflow_Changes": "Map route only triggered when explicit book title or rack code is requested.",
        "Testing_Completed": "Verified 20+ general and navigational query prompts.",
        "Status": "Completed & Pushed",
        "Pending_Work": "None"
    },
    {
        "Date": "2026-08-27",
        "Time": "12:58 IST",
        "Commit_ID": "769ed38",
        "Version": "v6.0.7",
        "Module": "Admin Book Catalog",
        "What_Changed": "Handled unique constraint checks and available copies editing.",
        "What_Fixed": "ISBN unique constraint error when updating existing book metadata.",
        "New_Features": "Available copies live counter & quick edit modal.",
        "Backend_Changes": "Updated PUT /api/admin/books/{id} to exclude current book ID from ISBN uniqueness check.",
        "Workflow_Changes": "Admins can edit book titles, authors, and rack assignments without ISBN collision.",
        "Testing_Completed": "Admin CRUD tested with multiple duplicate ISBN scenarios.",
        "Status": "Completed & Pushed",
        "Pending_Work": "None"
    },
    {
        "Date": "2026-08-27",
        "Time": "18:14 IST",
        "Commit_ID": "e3f43ba",
        "Version": "v7.0.0",
        "Module": "Global Theme, 3D Wayfinder, 2D Floor Plan Editor, Netlify",
        "What_Changed": "Complete enterprise light theme migration (white & light blue), 2D drag-and-drop blueprint editor, separate Voice/Chat state isolation.",
        "What_Fixed": "Dark theme contrast issues; voice transcripts cluttering text chat; lack of visual floor plan customizer.",
        "New_Features": "FloorPlanEditor2D component with 1m grid snapping, 3D multi-floor wayfinder with Catmull-Rom route tubes, Netlify deployment configuration.",
        "Backend_Changes": "Added custom_layout column to LibraryConfig model and admin architecture endpoint.",
        "Workflow_Changes": "Voice Mode and Chat Mode operate on independent message state arrays.",
        "Testing_Completed": "Full frontend Vite build verified; 3D Three.js rendering confirmed.",
        "Status": "Completed & Pushed",
        "Pending_Work": "None"
    },
    {
        "Date": "2026-08-28",
        "Time": "10:24 IST",
        "Commit_ID": "007c43d",
        "Version": "v7.1.0",
        "Module": "Admin Voice Settings, TTS Synthesis",
        "What_Changed": "Synchronized admin-selected voice across entire session; added Indian female voice catalog; live audio preview.",
        "What_Fixed": "Greeting played in default male voice before selected voice was applied.",
        "New_Features": "Curated Indian female voice catalog (Neerja, Swara, Heera, Priya, Kavya), international voices, and system voice scanner.",
        "Backend_Changes": "voice_preset persisted in LibraryConfig model.",
        "Workflow_Changes": "VoiceAssistant fetches architecture voice config on mount before triggering initial greeting.",
        "Testing_Completed": "Tested audio sample preview and cross-browser speech synthesis.",
        "Status": "Completed & Pushed",
        "Pending_Work": "None"
    },
    {
        "Date": "2026-08-28",
        "Time": "11:21 IST",
        "Commit_ID": "19b15bc",
        "Version": "v7.2.0",
        "Module": "UI Design, Voice Orb, Navigation & Auth",
        "What_Changed": "Enterprise-level UI overhaul with gradient buttons, glassmorphic nav bar, shimmer login page, and plasma GLSL orb.",
        "What_Fixed": "Plain flat buttons in wayfinder and navbar; mic icon overlay on 3D voice sphere.",
        "New_Features": "3-octave fractal GLSL simplex noise plasma orb, shimmer submit buttons, gradient chat bubbles, glassmorphic profile pill.",
        "Backend_Changes": "None",
        "Workflow_Changes": "The 3D sphere deforms organically with real-time sound amplitude without needing any 2D mic icons.",
        "Testing_Completed": "Vite production build succeeded in 10.75s with 0 errors.",
        "Status": "Completed & Pushed",
        "Pending_Work": "None"
    },
    {
        "Date": "2026-08-28",
        "Time": "11:36 IST",
        "Commit_ID": "1dd987a",
        "Version": "v7.3.0",
        "Module": "Animation Engine, Visual Equalizers",
        "What_Changed": "Comprehensive dynamic animation overhaul with interactive constellation mesh background and live equalizer soundwaves.",
        "What_Fixed": "Static look and feel; added rich floating motion physics and active sound visualizer bars.",
        "New_Features": "AnimatedBackground constellation canvas, live audio soundwave bars for Listening / Speaking states, button specular shimmer sweeps.",
        "Backend_Changes": "None",
        "Workflow_Changes": "Interactive hover physics applied to all cards and buttons across the portal.",
        "Testing_Completed": "Vite build passed in 9.92s.",
        "Status": "Completed & Pushed",
        "Pending_Work": "None"
    },
    {
        "Date": "2026-08-28",
        "Time": "12:00 IST",
        "Commit_ID": "06109a3",
        "Version": "v7.4.0",
        "Module": "2D/3D Architecture Synchronization",
        "What_Changed": "Synchronized 2D blueprint editor with 3D map viewport; restored prominent floating save buttons; live matrix slider updates.",
        "What_Fixed": "3D map falling back to synthetic grid instead of custom 2D layout; missing save button on small viewports; slider changes not reflecting in 3D preview.",
        "New_Features": "Persistent floating [Save Blueprint & Apply to 3D Map] action bar, live 3D matrix regeneration on slider move, dynamic 3D slab scaling.",
        "Backend_Changes": "None",
        "Workflow_Changes": "Any change made in 2D blueprint or slider matrix immediately updates 3D map coordinates in real time.",
        "Testing_Completed": "Vite build passed in 7.27s; Dijkstra pathfinding verified through custom 2D layouts.",
        "Status": "Completed & Pushed",
        "Pending_Work": "None"
    }
]

# Write to CSV
csv_path = os.path.join(os.path.dirname(__file__), "..", "PROJECT_UPDATE_LOG.csv")
with open(csv_path, mode="w", newline="", encoding="utf-8") as f:
    writer = csv.DictWriter(f, fieldnames=list(updates[0].keys()))
    writer.writeheader()
    writer.writerows(updates)
print(f"Generated {csv_path}")

# Write to Markdown
md_path = os.path.join(os.path.dirname(__file__), "..", "PROJECT_UPDATE_LOG.md")
with open(md_path, mode="w", encoding="utf-8") as f:
    f.write("# 📋 Project Git Push & Version Update Tracking Log\n\n")
    f.write("> Comprehensive project changelog tracking all commits, version releases, architecture updates, and UI/UX improvements.\n\n")
    f.write("| Date | Time (IST) | Commit ID | Version | Project / Module | What Was Changed | What Was Fixed | Status |\n")
    f.write("|---|---|---|---|---|---|---|---|\n")
    for u in updates:
        f.write(f"| **{u['Date']}** | {u['Time']} | `{u['Commit_ID']}` | **{u['Version']}** | {u['Module']} | {u['What_Changed']} | {u['What_Fixed']} | {u['Status']} |\n")
    
    f.write("\n\n---\n\n## 📝 Detailed Version Release Notes\n\n")
    for u in reversed(updates):
        f.write(f"### 🚀 Release {u['Version']} ({u['Date']} · {u['Time']})\n")
        f.write(f"- **Git Push ID / Commit ID:** `{u['Commit_ID']}`\n")
        f.write(f"- **Project / Module:** {u['Module']}\n")
        f.write(f"- **What was changed:** {u['What_Changed']}\n")
        f.write(f"- **What was fixed:** {u['What_Fixed']}\n")
        f.write(f"- **New features added:** {u['New_Features']}\n")
        f.write(f"- **Database / API / Backend changes:** {u['Backend_Changes']}\n")
        f.write(f"- **Important workflow or logic changes:** {u['Workflow_Changes']}\n")
        f.write(f"- **Testing completed:** {u['Testing_Completed']}\n")
        f.write(f"- **Current status:** {u['Status']}\n")
        f.write(f"- **Any known issues or pending work:** {u['Pending_Work']}\n\n---\n\n")
print(f"Generated {md_path}")

# Try writing Excel if openpyxl is available, else fallback cleanly
try:
    import openpyxl
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Update Tracking Log"
    ws.append(list(updates[0].keys()))
    for u in updates:
        ws.append(list(u.values()))
    xlsx_path = os.path.join(os.path.dirname(__file__), "..", "PROJECT_UPDATE_LOG.xlsx")
    wb.save(xlsx_path)
    print(f"Generated {xlsx_path}")
except ImportError:
    pass
