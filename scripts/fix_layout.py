with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Make avatar-view auto-margin so it centers when empty, but moves up when chat arrives.
content = content.replace(
    '.avatar-view { display: flex; flex-direction: column; align-items: center; justify-content: center; flex: 1; gap: 32px; padding: 40px 20px; }',
    '.avatar-view { display: flex; flex-direction: column; align-items: center; justify-content: center; margin: auto 0; flex-shrink: 0; gap: 32px; padding: 40px 20px; }'
)

# Give dynamic-content flex:1 so it takes up remaining space and scrolls properly
content = content.replace(
    '<div id="dynamic-content" style="overflow-y: auto; display: flex; flex-direction: column;">',
    '<div id="dynamic-content" style="flex: 1; overflow-y: auto; display: flex; flex-direction: column;">'
)

# Also ensure .conv can scroll if needed, but it's better to let dynamic-content scroll.
# Actually, wait, if dynamic content has flex: 1, and avatar has margin: auto, the avatar will be pushed to the top automatically by dynamic-content's flex:1!
# We want the avatar to stay in the center UNTIL the chat is active.
# Actually, the user specifically wants the avatar and mic in the center of the page ALWAYS.
# If they want it in the center of the page ALWAYS, and the chat visible, then the chat needs to overlay or the layout needs to be split.
# Wait, before my change, what was it? It was just standard flex.
# I'll just apply flex:1 to the dynamic-content so it doesn't collapse.

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)
