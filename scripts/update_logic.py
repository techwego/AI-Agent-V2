with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update ask() to use renderAnswer instead of askQuery
ask_old = """function ask(kind){
let promptText = "";
if (kind === 'book') promptText = "Can you find a book about computer science and guide me there?";
else if (kind === 'hours') promptText = "What are the library's opening hours this week?";
else if (kind === 'where') promptText = "Where is the reference section?";
else promptText = "Tell me about " + kind;

askQuery(promptText);
}"""
ask_new = """function ask(kind){
if ('speechSynthesis' in window) window.speechSynthesis.cancel();
currentScenario=kind;
renderAnswer(kind);
}"""
content = content.replace(ask_old, ask_new)

# 2. Add 'wish' to renderAnswer
content = content.replace(
    "if(kind==='book'||kind==='where'||kind==='entrance'||kind==='stacks'){",
    "if(kind==='book'||kind==='where'||kind==='entrance'||kind==='stacks'||kind==='wish'){"
)

# 3. Add 'wish' assignment
content = content.replace(
    "const d=(kind==='book'||kind==='entrance'||kind==='stacks')?t.book:t.where;",
    "const d=(kind==='book'||kind==='entrance'||kind==='stacks')?t.book:(kind==='wish'?t.wish:t.where);"
)

# 4. Set currentDest for wish
content = content.replace(
    "currentDest=(kind==='book')?'B2':(kind==='where')?'R2':(kind==='entrance')?'KE':'KU';",
    "currentDest=(kind==='book')?'B2':(kind==='where')?'R2':(kind==='entrance')?'KE':(kind==='wish')?'S2':'KU';"
)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)
