with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Inject missing CSS
css_to_add = """
  .papers{margin-top:14px;display:flex;flex-direction:column;gap:9px}
  .paper{display:flex;align-items:center;gap:13px;background:var(--raised);border:1px solid var(--line);border-radius:13px;padding:13px 15px;transition:.25s var(--ease)}
  .paper:hover{border-color:var(--purple);transform:translateX(3px)}
  .paper-n{font-family:var(--mono);font-size:12px;color:var(--faint);font-weight:600}
  .paper-b{flex:1;min-width:0}
  .paper-t{font-size:13.5px;font-weight:600;line-height:1.3;color:#fff;}
  .paper-m{font-size:11.5px;color:var(--muted);margin-top:3px}
  .badge{font-size:10.5px;font-weight:600;padding:5px 9px;border-radius:7px;background:var(--blue-d);color:var(--blue);white-space:nowrap}
  .back-btn{display:inline-flex;align-items:center;gap:7px;font-family:inherit;font-size:13px;font-weight:600;color:var(--muted);background:rgba(0,0,0,0.5);border:1px solid var(--line);border-radius:10px;padding:9px 14px;cursor:pointer;margin-bottom:20px;align-self:flex-start;transition:.25s; backdrop-filter:blur(10px); pointer-events:auto;}
  .back-btn:hover{color:var(--ink);border-color:var(--purple)}
  .back-btn svg{width:15px;height:15px}
"""
content = content.replace('</style>', css_to_add + '\n</style>')

# 2. Add 'back' to English translation
content = content.replace(
    'stops:"waypoints",',
    'stops:"waypoints", back:"Back to conversation",'
)
# 3. Add 'back' to Tamil translation
content = content.replace(
    'stops:"வழிகள்",',
    'stops:"வழிகள்", back:"உரையாடலுக்கு திரும்பு",'
)

# 4. Restore the empty welcome div
empty_welcome = '''          <div class="welcome" id="welcome">
          </div>'''
full_welcome = '''          <div class="welcome" id="welcome">
            <div class="eyebrow"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a10 10 0 1 0 10 10H12V2z"/><path d="M12 12 2.1 7.1"/><path d="M12 12l9.9 4.9"/></svg><span data-t="eyebrow">AI library concierge</span></div>
            <h1><span data-t="h1a">Ask the library.</span><br><span class="accent" data-t="h1b">Out loud.</span></h1>
            <p data-t="sub">Find any book and get walked to the exact shelf, get grounded answers about the campus, and search your e-resources — by voice, in English or Tamil.</p>
            <div class="examples">
              <div class="ex-label" data-t="trylabel">Try asking</div>
              <div class="ex" onclick="ask('book')">
                <div class="ex-ic b"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg></div>
                <div class="ex-txt"><b data-t="ex1t">Find a book and guide me there</b><span data-t="ex1s">“Where can I find Introduction to Algorithms?”</span></div>
                <div class="ex-arrow"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg></div>
              </div>
              <div class="ex" onclick="ask('hours')">
                <div class="ex-ic p"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div>
                <div class="ex-txt"><b data-t="ex2t">Ask about campus & services</b><span data-t="ex2s">“Can I borrow a laptop for the weekend?”</span></div>
                <div class="ex-arrow"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg></div>
              </div>
              <div class="ex" onclick="ask('research')">
                <div class="ex-ic o"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg></div>
                <div class="ex-txt"><b data-t="ex3t">Search e-resources for research</b><span data-t="ex3s">“Recent papers on solid-state batteries.”</span></div>
                <div class="ex-arrow"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg></div>
              </div>
            </div>
          </div>'''
content = content.replace(empty_welcome, full_welcome)

# Double check if t.back replacement missed
if 'back:"Back to conversation"' not in content:
    content = content.replace('stops:"waypoints",', 'stops:"waypoints", back:"Back to conversation",')
if 'back:"உரையாடலுக்கு திரும்பு"' not in content:
    content = content.replace('stops:"பழிகள்",', 'stops:"பழிகள்", back:"உரையாடலுக்கு திரும்பு",') # assuming stops exists
    
with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)
