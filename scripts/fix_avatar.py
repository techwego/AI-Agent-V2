with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update .avatar-view css to float in the center
content = content.replace(
    '.avatar-view { display: flex; flex-direction: column; align-items: center; justify-content: center; flex-shrink: 0; gap: 32px; padding: 40px 20px; }',
    '.avatar-view { display: flex; flex-direction: column; align-items: center; justify-content: center; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 1; pointer-events: none; gap: 32px; width: 100%; padding: 20px; }'
)
# Re-add pointer events to the interactive parts
content = content.replace(
    '.center-mic-container { display: flex; align-items: center; gap: 16px; justify-content: center; width: 100%; max-width: 680px; }',
    '.center-mic-container { display: flex; align-items: center; gap: 16px; justify-content: center; width: 100%; max-width: 680px; pointer-events: auto; }'
)
content = content.replace(
    '.chat-input-wrapper { display: flex; width: 100%; max-width: 680px; gap: 12px; margin-top: 24px; }',
    '.chat-input-wrapper { display: flex; width: 100%; max-width: 680px; gap: 12px; margin-top: 24px; pointer-events: auto; }'
)

# 2. Make .conv relative so the absolute avatar is bound to it.
content = content.replace(
    '<section class="conv" id="conv" style="display: flex; flex-direction: column;">',
    '<section class="conv" id="conv" style="display: flex; flex-direction: column; position: relative;">'
)

# 3. Make sure .thread and .welcome sit ABOVE the avatar
content = content.replace(
    '.thread.show { display: flex; }',
    '.thread.show { display: flex; position: relative; z-index: 10; pointer-events: none; padding-bottom: 250px; }'
)
content = content.replace(
    '.q-bubble { background: linear-gradient',
    '.q-bubble { pointer-events: auto; backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); background: linear-gradient'
)
content = content.replace(
    '.a-body { flex: 1; min-width: 0; background: var(--raised);',
    '.a-body { flex: 1; min-width: 0; background: rgba(13,17,27,0.7); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); pointer-events: auto;'
)
content = content.replace(
    '.welcome{flex:1;display:flex;flex-direction:column;justify-content:center}',
    '.welcome{flex:1;display:flex;flex-direction:column;justify-content:center; position: relative; z-index: 10; pointer-events: none;}'
)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)
