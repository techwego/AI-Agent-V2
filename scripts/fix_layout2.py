with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Remove the bad wrapper div I added
content = content.replace(
    '<div id="dynamic-content" style="overflow-y: auto; display: flex; flex-direction: column;">',
    ''
)
# Remove its closing tag (the last </div> before </section>)
# It looks like:
#         </div>
#       </section>
content = content.replace(
    '        </div>\n      </section>',
    '      </section>'
)

# Also ensure .conv does not have any weird fixed heights
# We just need to make sure the chat bubbles stack correctly below avatar-view.

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)
