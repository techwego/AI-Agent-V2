with open('old_index.html', 'r', encoding='utf-16le') as f:
    content = f.read()

with open('old_index_utf8.html', 'w', encoding='utf-8') as f:
    f.write(content)
