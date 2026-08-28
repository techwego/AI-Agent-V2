import re
f=open('frontend/src/pages/VoiceAssistant.jsx', 'r', encoding='utf-8')
c=f.read()
f.close()

c = c.replace('<div className="max-w-7xl mx-auto flex items-center justify-between gap-4">', '<div className="max-w-7xl mx-auto flex flex-wrap md:flex-nowrap items-center justify-between gap-3">', 1)
# Make text responsive too
c = c.replace('<h1 className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight truncate">', '<h1 className="text-xs sm:text-base font-extrabold text-slate-900 tracking-tight truncate max-w-[150px] sm:max-w-none">', 1)

f=open('frontend/src/pages/VoiceAssistant.jsx', 'w', encoding='utf-8')
f.write(c)
f.close()
