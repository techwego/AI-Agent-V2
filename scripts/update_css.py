import re

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Premium Glassmorphism and Responsive CSS Overhaul
new_css = '''<style>
  :root {
    --bg: #05070a;
    --panel: rgba(13, 17, 27, 0.7);
    --raised: rgba(255, 255, 255, 0.03);
    --raised-2: rgba(255, 255, 255, 0.06);
    --line: rgba(255, 255, 255, 0.08);
    --line-2: rgba(255, 255, 255, 0.04);
    --ink: #F0F4F8;
    --muted: #9BA4B5;
    --faint: #5A6276;
    --blue: #4A8CFF;
    --purple: #9D7CFF;
    --orange: #FF8547;
    --blue-d: rgba(74, 140, 255, 0.15);
    --purple-d: rgba(157, 124, 255, 0.15);
    --orange-d: rgba(255, 133, 71, 0.15);
    --ease: cubic-bezier(0.22, 0.61, 0.36, 1);
    --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
    --mono: 'JetBrains Mono', ui-monospace, monospace;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { height: 100%; width: 100%; overflow: hidden; }
  body {
    font-family: 'Inter', 'Noto Sans Tamil', system-ui, sans-serif;
    background: radial-gradient(circle at 15% 50%, rgba(74, 140, 255, 0.08), transparent 25%),
                radial-gradient(circle at 85% 30%, rgba(157, 124, 255, 0.08), transparent 25%),
                var(--bg);
    color: var(--ink);
    -webkit-font-smoothing: antialiased;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2vh;
  }
  body[data-lang="ta"] { font-family: 'Noto Sans Tamil', 'Inter', system-ui, sans-serif; }
  .display { font-family: 'Sora', 'Noto Sans Tamil', system-ui, sans-serif; }
  .mono { font-family: var(--mono); }

  .app {
    width: min(1280px, 100%);
    height: min(840px, 100%);
    background: var(--panel);
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
    border: 1px solid var(--line);
    border-radius: 32px;
    box-shadow: 0 40px 120px -20px rgba(0, 0, 0, 0.8), inset 0 1px 0 rgba(255, 255, 255, 0.05);
    display: grid;
    grid-template-columns: 72px 1fr;
    overflow: hidden;
  }

  .rail {
    border-right: 1px solid var(--line-2);
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 24px 0;
    gap: 12px;
    background: rgba(0,0,0,0.2);
    overflow-y: auto;
    scrollbar-width: none;
  }
  .rail::-webkit-scrollbar { display: none; }
  .rail-logo { width: 40px; height: 40px; border-radius: 12px; background: linear-gradient(135deg, var(--blue), var(--purple)); display: flex; align-items: center; justify-content: center; color: #fff; margin-bottom: 16px; flex-shrink: 0; box-shadow: 0 8px 24px -8px var(--purple); }
  .rail-logo svg { width: 22px; height: 22px; }
  .rail-btn { width: 44px; height: 44px; border-radius: 12px; border: none; background: none; cursor: pointer; color: var(--faint); display: flex; align-items: center; justify-content: center; transition: 0.3s var(--ease); }
  .rail-btn svg { width: 22px; height: 22px; }
  .rail-btn:hover { color: var(--ink); background: var(--raised); transform: scale(1.05); }
  .rail-btn.active { color: var(--blue); background: var(--blue-d); box-shadow: inset 0 0 0 1px rgba(74,140,255,0.2); }
  .rail-sp { flex: 1; }

  .main { display: flex; flex-direction: column; min-width: 0; min-height: 0; }
  .topbar { display: flex; align-items: center; justify-content: space-between; padding: 20px 32px; border-bottom: 1px solid var(--line-2); flex-shrink: 0; background: rgba(0,0,0,0.1); }
  .camp { display: flex; align-items: center; gap: 14px; }
  .camp-ic { width: 40px; height: 40px; border-radius: 12px; background: linear-gradient(135deg, var(--raised), rgba(255,255,255,0.01)); border: 1px solid var(--line); display: flex; align-items: center; justify-content: center; color: var(--purple); box-shadow: inset 0 1px 0 rgba(255,255,255,0.05); }
  .camp-ic svg { width: 20px; height: 20px; }
  .camp-name { font-size: 16px; font-weight: 600; letter-spacing: -0.01em; line-height: 1.2; color: #fff; }
  .camp-sub { font-size: 12px; color: var(--muted); margin-top: 2px; }
  .camp-name .chev { color: var(--faint); margin-left: 6px; font-size: 12px; }
  
  .tb-right { display: flex; align-items: center; gap: 16px; }
  .live { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--muted); font-weight: 500; padding: 8px 14px; background: var(--raised); border: 1px solid var(--line); border-radius: 999px; }
  .live-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--blue); position: relative; }
  .live-dot::after { content: ""; position: absolute; inset: 0; border-radius: 50%; background: var(--blue); animation: ping 2.2s var(--ease-out) infinite; }
  @keyframes ping { 0% { transform: scale(1); opacity: 0.6; } 70%, 100% { transform: scale(3.5); opacity: 0; } }
  
  .lang { display: flex; background: var(--raised); border-radius: 999px; padding: 4px; position: relative; border: 1px solid var(--line); box-shadow: inset 0 2px 4px rgba(0,0,0,0.2); }
  .lang-glider { position: absolute; top: 4px; left: 4px; height: calc(100% - 8px); background: linear-gradient(135deg, var(--blue), #66A3FF); border-radius: 999px; transition: transform 0.4s var(--ease), width 0.4s var(--ease); box-shadow: 0 4px 12px -4px var(--blue); }
  .lang-btn { position: relative; z-index: 2; border: none; background: none; cursor: pointer; font-family: inherit; font-size: 13px; font-weight: 600; color: var(--muted); padding: 7px 18px; border-radius: 999px; transition: color 0.3s; }
  .lang-btn.active { color: #fff; }

  /* Navigation overrides for responsive layout */
  .custom-nav { display: flex; gap: 12px; padding: 12px 32px; background: rgba(0,0,0,0.15); border-bottom: 1px solid var(--line-2); overflow-x: auto; white-space: nowrap; scrollbar-width: none; }
  .custom-nav::-webkit-scrollbar { display: none; }
  .custom-nav a { color: var(--muted); text-decoration: none; font-weight: 500; font-size: 14px; padding: 8px 16px; border-radius: 999px; background: var(--raised); border: 1px solid transparent; transition: all 0.2s; }
  .custom-nav a:hover { color: var(--ink); background: var(--raised-2); border-color: var(--line); transform: translateY(-1px); }

  .work { flex: 1; display: grid; grid-template-columns: 1fr 480px; min-height: 0; background: linear-gradient(180deg, transparent, rgba(0,0,0,0.2)); }
  .conv { padding: 32px; overflow-y: auto; display: flex; flex-direction: column; scrollbar-width: thin; scrollbar-color: var(--faint) transparent; }
  .conv::-webkit-scrollbar { width: 6px; }
  .conv::-webkit-scrollbar-thumb { background: var(--faint); border-radius: 10px; }
  .ctx { border-left: 1px solid var(--line-2); background: rgba(0,0,0,0.25); display: flex; flex-direction: column; min-height: 0; }

  .welcome{flex:1;display:flex;flex-direction:column;justify-content:center}
  .eyebrow{display:inline-flex;align-items:center;gap:8px;font-size:12px;font-weight:600;color:var(--purple);background:var(--purple-d);padding:7px 13px;border-radius:999px;align-self:flex-start;margin-bottom:22px;border:1px solid rgba(139,108,255,.2)}
  .eyebrow svg{width:14px;height:14px}
  .welcome h1{font-size:40px;font-weight:600;letter-spacing:-.03em;line-height:1.05}
  .welcome h1 .accent{color:var(--purple)}
  .welcome p{margin-top:16px;font-size:16px;color:var(--muted);max-width:42ch;line-height:1.55}
  .examples{margin-top:34px;display:flex;flex-direction:column;gap:10px;max-width:480px}
  .ex-label{font-size:11px;font-weight:600;color:var(--faint);text-transform:uppercase;letter-spacing:.08em;margin-bottom:2px}
  .ex{display:flex;align-items:center;gap:13px;padding:15px 16px;background:var(--raised);border:1px solid var(--line);border-radius:14px;cursor:pointer;transition:.25s var(--ease);text-align:left}
  .ex:hover{border-color:var(--purple);transform:translateY(-2px);background:var(--raised-2)}
  .ex-ic{width:34px;height:34px;border-radius:10px;background:var(--bg);border:1px solid var(--line);display:flex;align-items:center;justify-content:center;flex-shrink:0}
  .ex-ic svg{width:17px;height:17px}
  .ex-ic.b{color:var(--blue)}.ex-ic.p{color:var(--purple)}.ex-ic.o{color:var(--orange)}
  .ex-txt b{display:block;font-size:14.5px;font-weight:600;letter-spacing:-.01em}
  .ex-txt span{font-size:12.5px;color:var(--muted)}
  .ex-arrow{margin-left:auto;color:var(--faint);transition:.25s var(--ease)}
  .ex:hover .ex-arrow{color:var(--purple);transform:translateX(3px)}
  .ex-arrow svg{width:17px;height:17px}


  .thread { display: none; flex-direction: column; gap: 24px; padding-bottom: 40px; }
  .thread.show { display: flex; }
  .q-row { display: flex; justify-content: flex-end; }
  .q-bubble { background: linear-gradient(135deg, var(--blue), #5A9DFF); color: #fff; border-radius: 20px 20px 4px 20px; padding: 16px 22px; font-size: 15.5px; font-weight: 500; max-width: 85%; box-shadow: 0 12px 32px -12px var(--blue); line-height: 1.5; }
  .a-row { display: flex; gap: 16px; }
  .a-av { width: 42px; height: 42px; border-radius: 14px; background: linear-gradient(135deg, var(--purple-d), rgba(157, 124, 255, 0.05)); border: 1px solid rgba(157,124,255,0.3); display: flex; align-items: center; justify-content: center; color: var(--purple); flex-shrink: 0; box-shadow: 0 8px 24px -8px var(--purple-d); }
  .a-av svg { width: 22px; height: 22px; }
  .a-body { flex: 1; min-width: 0; background: var(--raised); border: 1px solid var(--line); border-radius: 4px 20px 20px 20px; padding: 20px; box-shadow: 0 12px 40px -20px rgba(0,0,0,0.5); }
  .a-text { font-size: 16px; line-height: 1.7; color: var(--ink); }
  .a-text b { font-weight: 600; color: #fff; }

  .book { margin-top: 16px; display: flex; gap: 18px; background: rgba(0,0,0,0.2); border: 1px solid var(--line); border-radius: 16px; padding: 18px; transition: all 0.3s var(--ease); cursor: pointer; }
  .book:hover { transform: translateY(-4px) scale(1.01); border-color: var(--purple); background: var(--raised-2); box-shadow: 0 16px 32px -16px rgba(157,124,255,0.2); }
  .spine { width: 60px; flex-shrink: 0; border-radius: 8px; background: linear-gradient(to right, var(--raised), var(--bg)); border: 1px solid var(--line); position: relative; overflow: hidden; display: flex; align-items: flex-end; padding: 12px 8px; min-height: 96px; box-shadow: inset 4px 0 10px rgba(0,0,0,0.5); }
  .spine::before { content: ""; position: absolute; left: 0; top: 0; bottom: 0; width: 6px; background: linear-gradient(to bottom, var(--purple), var(--blue)); }
  .spine .sp-call { font-size: 9px; color: var(--muted); writing-mode: vertical-rl; transform: rotate(180deg); letter-spacing: 0.05em; font-weight: 600; }
  .book-info { flex: 1; min-width: 0; display: flex; flex-direction: column; justify-content: center; }
  .book-title { font-size: 17px; font-weight: 600; letter-spacing: -0.01em; line-height: 1.3; color: #fff; }
  .book-auth { font-size: 14px; color: var(--muted); margin-top: 6px; }
  .avail { display: flex; align-items: center; gap: 10px; margin-top: 14px; }
  .avail-dots { display: flex; gap: 5px; }
  .avail-dots i { width: 10px; height: 10px; border-radius: 50%; background: var(--blue); box-shadow: 0 0 10px var(--blue); }
  .avail-dots i.off { background: none; border: 1.5px solid var(--faint); box-shadow: none; }
  .avail-txt { font-size: 13px; font-weight: 600; color: var(--blue); }

  .ctx-head { padding: 20px 24px; border-bottom: 1px solid var(--line-2); display: flex; align-items: center; justify-content: space-between; flex-shrink: 0; background: rgba(0,0,0,0.1); }
  .ctx-title { font-size: 14px; font-weight: 600; color: var(--ink); display: flex; align-items: center; gap: 10px; }
  .ctx-title svg { width: 18px; height: 18px; color: var(--purple); }
  .ctx-floor { font-family: var(--mono); font-size: 12px; font-weight: 600; color: #fff; background: var(--purple-d); border: 1px solid rgba(157,124,255,0.3); padding: 6px 12px; border-radius: 8px; box-shadow: 0 4px 12px -4px var(--purple); }
  .ctx-body { flex: 1; padding: 24px; display: flex; flex-direction: column; min-height: 0; position: relative; }

  /* Map Container */
  .plan { flex: 1; position: relative; border-radius: 20px; background: rgba(0,0,0,0.4); border: 1px solid var(--line); overflow: hidden; min-height: 0; perspective: 1200px; box-shadow: inset 0 0 40px rgba(0,0,0,0.5); }
  .cam { width: 100%; height: 100%; transform-style: preserve-3d; will-change: transform; transition: transform 0.4s var(--ease-out); }
  .plan:not(.touch) .cam { animation: sway 14s ease-in-out infinite; }
  @keyframes sway { 0%, 100% { transform: rotateX(5deg) rotateY(-5deg) scale(1.05); } 50% { transform: rotateX(8deg) rotateY(5deg) scale(1.05); } }
  .plan svg { width: 100%; height: 100%; display: block; overflow: visible; }
  
  .dock { display: flex; align-items: center; gap: 20px; padding: 20px 32px; border-top: 1px solid var(--line-2); background: rgba(0,0,0,0.3); flex-shrink: 0; }
  
  /* Glowing Orb Avatar */
  .avatar-view { display: flex; flex-direction: column; align-items: center; justify-content: center; flex: 1; gap: 32px; padding: 40px 20px; }
  .avatar-container { width: 220px; height: 220px; border-radius: 50%; position: relative; display: flex; align-items: center; justify-content: center; }
  .avatar-img { width: 100%; height: 100%; border-radius: 50%; object-fit: cover; border: 4px solid var(--raised-2); position: relative; z-index: 2; box-shadow: 0 20px 50px rgba(0,0,0,0.6); transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1); }
  #three-avatar-container { width: 100%; height: 100%; position: absolute; top: 0; left: 0; z-index: 3; }
  
  .app.busy .avatar-img { animation: talk-bounce 0.5s infinite alternate ease-in-out; border-color: var(--purple); }
  @keyframes talk-bounce { 0% { transform: scale(1) translateY(0); } 100% { transform: scale(1.06) translateY(-6px); } }
  
  .avatar-glow { position: absolute; inset: -20px; border-radius: 50%; background: radial-gradient(circle, var(--purple), transparent 70%); opacity: 0; filter: blur(20px); z-index: 1; transition: opacity 0.4s; }
  .app.busy .avatar-glow { animation: pulse-glow 1s infinite alternate ease-in-out; }
  @keyframes pulse-glow { 0% { opacity: 0.2; transform: scale(0.9); } 100% { opacity: 0.7; transform: scale(1.15); } }
  
  /* Input & Mic Container */
  .center-mic-container { display: flex; align-items: center; gap: 16px; justify-content: center; width: 100%; max-width: 680px; }
  .orb-btn { position: relative; width: 100px; height: 100px; flex-shrink: 0; cursor: pointer; border: none; background: none; padding: 0; transition: transform 0.2s; }
  .orb-btn:active { transform: scale(0.95); }
  .orb-btn::after { content: ""; position: absolute; inset: -8px; border-radius: 50%; box-shadow: 0 0 32px -4px rgba(139,108,255,0.6); animation: orbglow 4s ease-in-out infinite; pointer-events: none; }
  @keyframes orbglow { 0%, 100% { box-shadow: 0 0 32px -4px rgba(139,108,255,0.4); } 50% { box-shadow: 0 0 48px 8px rgba(139,108,255,0.8); } }
  .app.busy .orb-btn::after { animation-duration: 1s; box-shadow: 0 0 48px 4px rgba(255,133,71,0.8); }
  .orb-btn canvas { width: 100%; height: 100%; display: block; position: relative; z-index: 2; border-radius: 50%; }
  .orb-mic { position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%); z-index: 3; color: #fff; pointer-events: none; display: flex; }
  .orb-mic svg { width: 24px; height: 24px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5)); }
  
  /* Chat Input Modernized */
  .chat-input-wrapper { display: flex; width: 100%; max-width: 680px; gap: 12px; margin-top: 24px; }
  .chat-input-field { flex: 1; padding: 18px 24px; border-radius: 16px; border: 1px solid var(--line); background: rgba(0,0,0,0.3); color: var(--ink); font-family: inherit; font-size: 16px; outline: none; transition: all 0.3s; box-shadow: inset 0 2px 6px rgba(0,0,0,0.2); }
  .chat-input-field:focus { border-color: var(--purple); background: rgba(0,0,0,0.5); box-shadow: inset 0 2px 6px rgba(0,0,0,0.2), 0 0 0 4px rgba(157,124,255,0.1); }
  .chat-send-btn { padding: 0 28px; border-radius: 16px; border: none; background: linear-gradient(135deg, var(--blue), var(--purple)); color: #fff; cursor: pointer; font-weight: 600; font-size: 16px; transition: all 0.3s; box-shadow: 0 8px 24px -8px var(--purple); display: flex; align-items: center; justify-content: center; }
  .chat-send-btn:hover { transform: translateY(-2px); box-shadow: 0 12px 32px -8px var(--purple); filter: brightness(1.1); }
  .chat-send-btn:active { transform: translateY(0) scale(0.98); }

  /* Mobile Responsiveness Overhaul */
  @media (max-width: 1024px) {
    body { padding: 0; background: var(--bg); }
    .app { 
      border-radius: 0; 
      height: 100dvh; 
      width: 100vw; 
      border: none;
      display: flex;
      flex-direction: column-reverse; /* Sidebar moves to bottom */
      box-shadow: none;
    }
    .rail {
      flex-direction: row;
      width: 100%;
      height: auto;
      padding: 12px 20px;
      justify-content: space-between;
      border-right: none;
      border-top: 1px solid var(--line-2);
      background: rgba(13, 17, 27, 0.95);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      padding-bottom: calc(12px + env(safe-area-inset-bottom));
      z-index: 50;
    }
    .rail-logo { display: none; }
    .rail-sp { display: none; }
    .work { 
      display: flex;
      flex-direction: column;
      overflow-y: auto;
      background: var(--bg);
    }
    .topbar { padding: 16px 20px; padding-top: calc(16px + env(safe-area-inset-top)); }
    .camp-name { font-size: 15px; }
    .camp-sub { font-size: 11px; }
    .tb-right { gap: 12px; }
    .live { display: none; } /* Hide listening ready on mobile to save space */
    .ctx { display: none; } /* Hide map on very small screens or make it a tab */
    .conv { padding: 20px; padding-bottom: 40px; }
    .custom-nav { padding: 12px 20px; }
    
    .avatar-container { width: 160px; height: 160px; }
    .orb-btn { width: 80px; height: 80px; }
    .chat-input-wrapper { flex-direction: column; gap: 10px; }
    .chat-send-btn { padding: 16px; }
    
    /* Reveal map if in a specific state or keep it below conversation */
    @media (min-height: 800px) {
      .ctx { display: flex; border-left: none; border-top: 1px solid var(--line-2); min-height: 400px; }
    }
  }

  /* Modals */
  .modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); display: none; align-items: center; justify-content: center; z-index: 100; }
  .modal-overlay.show { display: flex; animation: fadeIn 0.3s ease-out; }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  .modal { background: var(--bg); border: 1px solid var(--line); border-radius: 24px; padding: 32px; width: 90%; max-width: 420px; box-shadow: 0 24px 80px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.05); display: flex; flex-direction: column; gap: 16px; transform: scale(0.95); animation: scaleUp 0.3s cubic-bezier(0.16,1,0.3,1) forwards; }
  @keyframes scaleUp { to { transform: scale(1); } }
  .modal h2 { font-size: 24px; margin-bottom: 8px; color: #fff; letter-spacing: -0.02em; }
  .modal input { background: rgba(0,0,0,0.2); border: 1px solid var(--line); color: var(--ink); padding: 16px 20px; border-radius: 14px; font-size: 15px; outline: none; transition: 0.2s; box-shadow: inset 0 2px 4px rgba(0,0,0,0.1); }
  .modal input:focus { border-color: var(--blue); background: rgba(74,140,255,0.05); }
  .modal button { background: linear-gradient(135deg, var(--blue), var(--purple)); color: #fff; border: none; padding: 16px; border-radius: 14px; font-weight: 600; font-size: 15px; cursor: pointer; transition: 0.2s; box-shadow: 0 8px 24px -8px var(--purple); }
  .modal button:hover { filter: brightness(1.1); transform: translateY(-2px); }
  .close-modal { position: absolute; top: 24px; right: 24px; cursor: pointer; color: var(--muted); background: var(--raised); border: 1px solid var(--line); width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 18px; transition: 0.2s; }
  .close-modal:hover { color: #fff; background: var(--raised-2); transform: rotate(90deg); }
  .file-drop { border: 2px dashed var(--line); border-radius: 16px; padding: 40px 20px; text-align: center; color: var(--muted); cursor: pointer; transition: 0.3s; background: rgba(0,0,0,0.2); }
  .file-drop:hover { border-color: var(--blue); color: var(--blue); background: rgba(74,140,255,0.05); }
  
  .toast{position:fixed;left:50%;bottom:34px;transform:translate(-50%,160%);background:#fff;color:#0B0E16;border-radius:14px;padding:14px 18px;display:flex;align-items:center;gap:12px;font-size:14px;font-weight:500;box-shadow:0 24px 50px -16px rgba(0,0,0,.7);z-index:150;max-width:440px;transition:transform .55s var(--ease-out)}
  .toast.show{transform:translate(-50%,0)}
  .toast .td{width:32px;height:32px;border-radius:9px;background:var(--orange);display:flex;align-items:center;justify-content:center;flex-shrink:0;color:#fff}
  .toast .td svg{width:17px;height:17px}
  
  .book-meta{margin-top:14px;display:flex;gap:22px;flex-wrap:wrap}
  .bm{display:flex;flex-direction:column;gap:3px}
  .bm .l{font-size:10.5px;color:var(--faint);text-transform:uppercase;letter-spacing:.06em;font-weight:600}
  .bm .v{font-size:13px;font-weight:600}
  .bm .v.mono{font-size:12.5px;letter-spacing:-.02em}

  .source{margin-top:14px;display:inline-flex;align-items:center;gap:10px;background:var(--raised);border:1px solid var(--line);border-radius:12px;padding:11px 14px;cursor:pointer;transition:.25s}
  .source:hover{border-color:var(--blue)}
  .source-ic{width:30px;height:30px;border-radius:8px;background:var(--blue-d);color:var(--blue);display:flex;align-items:center;justify-content:center;flex-shrink:0}
  .source-ic svg{width:15px;height:15px}
  .source-t b{display:block;font-size:13px;font-weight:600}
  .source-t span{font-size:11.5px;color:var(--muted)}
</style>'''

# Apply the regex replacement to `<style>...</style>`
content = re.sub(r'<style>.*?</style>', new_css, content, flags=re.DOTALL)

# 2. Fix the inline styles for the main UI sections in HTML
# Navigation row
content = content.replace(
    '<div style="display: flex; gap: 20px; padding: 12px 24px; background: var(--raised); border-bottom: 1px solid var(--line-2);">',
    '<div class="custom-nav">'
)
# Avatar view and inputs
content = content.replace(
    '<div style="display: flex; width: 100%; max-width: 600px; gap: 10px; margin-top: 20px;">',
    '<div class="chat-input-wrapper">'
)
content = content.replace(
    '<input type="text" id="chatInput" placeholder="Ask Athenaeum about the library..." style="flex: 1; padding: 14px 18px; border-radius: 12px; border: 1px solid var(--line); background: var(--bg); color: var(--ink); font-family: inherit; font-size: 15px; outline: none;" onfocus="this.style.borderColor=\'var(--purple)\'" onblur="this.style.borderColor=\'var(--line)\'" onkeypress="if(event.key===\'Enter\') askCustom()">',
    '<input type="text" id="chatInput" class="chat-input-field" placeholder="Ask Athenaeum about the library..." onkeypress="if(event.key===\'Enter\') askCustom()">'
)
content = content.replace(
    '<button onclick="askCustom()" style="padding: 14px 24px; border-radius: 12px; border: none; background: var(--blue); color: #fff; cursor: pointer; font-weight: 600; transition: 0.2s;" onmouseover="this.style.background=\'var(--purple)\'" onmouseout="this.style.background=\'var(--blue)\'">Send</button>',
    '<button class="chat-send-btn" onclick="askCustom()">Send</button>'
)

# Remove any lingering closing div from the replacement if it breaks, but the structure was:
# <div style="display: flex..."> <input> <button> </button> </div>
# Which I partially replaced. Wait, `</div>` is un-touched so it matches nicely.

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)
