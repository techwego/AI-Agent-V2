with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update .custom-nav to wrap
content = content.replace(
    '.custom-nav { display: flex; gap: 12px; padding: 12px 32px; background: rgba(0,0,0,0.15); border-bottom: 1px solid var(--line-2); overflow-x: auto; white-space: nowrap; scrollbar-width: none; }',
    '.custom-nav { display: flex; flex-wrap: wrap; justify-content: center; gap: 12px; padding: 12px 32px; background: rgba(0,0,0,0.15); border-bottom: 1px solid var(--line-2); scrollbar-width: none; }'
)
# Ensure mobile custom-nav overrides are correct
content = content.replace(
    '.custom-nav { padding: 12px 20px; }',
    '.custom-nav { padding: 12px 20px; flex-wrap: wrap; justify-content: center; }'
)

# 2. Update Mobile CSS for .work, .conv, .ctx
content = content.replace(
    '.ctx { display: none; } /* Hide map on very small screens or make it a tab */',
    '.ctx { display: flex; flex: 1; border-left: none; border-top: 1px solid var(--line-2); min-height: 350px; background: rgba(0,0,0,0.4); } /* Show map vertically split */'
)
# Make .work display as column flex
content = content.replace(
    '.work { \n      display: flex;\n      flex-direction: column;\n      overflow-y: auto;\n      background: var(--bg);\n    }',
    '.work { \n      display: flex;\n      flex-direction: column;\n      background: var(--bg);\n      flex: 1;\n    }'
)
content = content.replace(
    '.conv { padding: 20px; padding-bottom: 40px; }',
    '.conv { padding: 20px; padding-bottom: 40px; flex: 1; min-height: 400px; position: relative; }'
)
content = content.replace(
    '@media (min-height: 800px) {\n      .ctx { display: flex; border-left: none; border-top: 1px solid var(--line-2); min-height: 400px; }\n    }',
    '/* min-height logic removed, ctx is always shown stacked on mobile now */'
)

# 3. Add Science Annex nodes and edges
nodes_old = "KE:{x:3.0,y:5.8,kiosk:true}, KR:{x:0.15,y:3.0,kiosk:true}, KU:{x:5.75,y:1.0,kiosk:true}"
nodes_new = "KE:{x:3.0,y:5.8,kiosk:true}, KR:{x:0.15,y:3.0,kiosk:true}, KU:{x:5.75,y:1.0,kiosk:true}, \n  // New Science Annex building\n  S0:{x:7.5,y:5.4}, S1:{x:7.5,y:4}, S2:{x:7.5,y:2.5}, KX:{x:8.5,y:1.5,kiosk:true}"
content = content.replace(nodes_old, nodes_new)

edges_old = "['KE','A0'],['KE','B0'],['KR','L2'],['KU','R4']"
edges_new = "['KE','A0'],['KE','B0'],['KR','L2'],['KU','R4'],\n  ['R0','S0'],['R1','S1'],['R2','S2'],['S0','S1'],['S1','S2'],['KX','S2']"
content = content.replace(edges_old, edges_new)

# 4. Add "wish" dictionary items
t_en_old = 'book:{q:"Where can I find Introduction to Algorithms?",'
t_en_new = 'wish:{q:"Take me to the new Science Annex", intro:"The Science Annex is located in the east wing. I\'ve computed the route from your current kiosk.", loc:"East Wing · Science Annex"}, \n    book:{q:"Where can I find Introduction to Algorithms?",'
content = content.replace(t_en_old, t_en_new)

t_ta_old = 'book:{q:"Introduction to Algorithms எங்கே கிடைக்கும்?",'
t_ta_new = 'wish:{q:"புதிய அறிவியல் வளாகத்திற்கு வழி காட்டு", intro:"அறிவியல் வளாகம் கிழக்கு திசையில் உள்ளது. இங்கிருந்து வழியை கணக்கிட்டுள்ளேன்.", loc:"கிழக்கு திசை · அறிவியல் வளாகம்"}, \n    book:{q:"Introduction to Algorithms எங்கே கிடைக்கும்?",'
content = content.replace(t_ta_old, t_ta_new)

# Update English Welcome examples to include wish path
welcome_old = '''<div class="ex" onclick="ask('research')">
                <div class="ex-ic o"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg></div>
                <div class="ex-txt"><b data-t="ex3t">Search e-resources for research</b><span data-t="ex3s">“Recent papers on solid-state batteries.”</span></div>
                <div class="ex-arrow"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg></div>
              </div>'''
welcome_new = welcome_old + '''\n              <div class="ex" onclick="ask('wish')">
                <div class="ex-ic" style="color: #00E676;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg></div>
                <div class="ex-txt"><b data-t="ex4t">Find a new building</b><span data-t="ex4s">“Take me to the new Science Annex.”</span></div>
                <div class="ex-arrow"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg></div>
              </div>'''
content = content.replace(welcome_old, welcome_new)

# Add Tamil ex4 translation
t_en_old2 = 'ex3t:"Search e-resources for research", ex3s:"“Recent papers on solid-state batteries.”",'
t_en_new2 = 'ex3t:"Search e-resources for research", ex3s:"“Recent papers on solid-state batteries.”",\n    ex4t:"Find a new building", ex4s:"“Take me to the new Science Annex.”",'
content = content.replace(t_en_old2, t_en_new2)

t_ta_old2 = 'ex3t:"ஆராய்ச்சிக்கு மின்-வளங்கள் தேடு", ex3s:"“solid-state batteries சமீபத்திய ஆய்வுகள்.”",'
t_ta_new2 = 'ex3t:"ஆராய்ச்சிக்கு மின்-வளங்கள் தேடு", ex3s:"“solid-state batteries சமீபத்திய ஆய்வுகள்.”",\n    ex4t:"புதிய கட்டிடத்திற்கு செல்", ex4s:"“புதிய அறிவியல் வளாகத்திற்கு வழி காட்டு.”",'
content = content.replace(t_ta_old2, t_ta_new2)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)
