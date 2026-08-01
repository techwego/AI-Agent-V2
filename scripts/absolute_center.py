with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update .conv to have position: relative and height: 100%
content = content.replace(
    '.conv { padding: 32px; overflow-y: auto; display: flex; flex-direction: column; scrollbar-width: thin; scrollbar-color: var(--faint) transparent; }',
    '.conv { padding: 32px; overflow-y: auto; display: flex; flex-direction: column; scrollbar-width: thin; scrollbar-color: var(--faint) transparent; position: relative; height: 100%; }'
)

# 2. Update .avatar-view to absolute positioning to lock it to the center of .conv forever
content = content.replace(
    '.avatar-view { display: flex; flex-direction: column; align-items: center; justify-content: center; flex: 1; gap: 32px; padding: 40px 20px; }',
    '.avatar-view { position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; z-index: 0; pointer-events: none; gap: 24px; }\n  .avatar-container, .center-mic-container { pointer-events: auto; }'
)

# 3. Update .thread to ensure it scrolls over the avatar (z-index 10) and has pointer-events: none for the empty space
content = content.replace(
    '.thread{display:none;flex-direction:column;gap:18px;margin-bottom:30px}',
    '.thread{display:none;flex-direction:column;gap:18px;margin-bottom:30px; position: relative; z-index: 10; flex: 1; pointer-events: none;}\n  .thread > * { pointer-events: auto; }'
)

# 4. Update .chat-input-wrapper to ensure it sits above the avatar layer
content = content.replace(
    '.chat-input-wrapper { display: flex; width: 100%; max-width: 680px; gap: 12px; margin: 24px auto 0 auto; pointer-events: auto; }',
    '.chat-input-wrapper { display: flex; width: 100%; max-width: 680px; gap: 12px; margin: 24px auto 0 auto; pointer-events: auto; position: relative; z-index: 10; }'
)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)
