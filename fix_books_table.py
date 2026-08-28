import re
f=open('frontend/src/pages/admin/Books.jsx', 'r', encoding='utf-8')
c=f.read()
f.close()

c = c.replace('<th className="px-6 py-3.5 font-bold text-slate-600 uppercase tracking-wider">Department</th>', '<th className="px-6 py-3.5 font-bold text-slate-600 uppercase tracking-wider hidden md:table-cell">Department</th>')
c = c.replace('<th className="px-6 py-3.5 font-bold text-slate-600 uppercase tracking-wider">Availability</th>', '<th className="px-6 py-3.5 font-bold text-slate-600 uppercase tracking-wider hidden sm:table-cell">Availability</th>')

c = re.sub(r'(<td className="px-6 py-4">)(\s*<div className="h-3.5 bg-slate-200 rounded w-24" />\s*</td>)', r'<td className="px-6 py-4 hidden md:table-cell">\2', c)
c = re.sub(r'(<td className="px-6 py-4">)(\s*<div className="h-3.5 bg-slate-200 rounded w-12" />\s*</td>)', r'<td className="px-6 py-4 hidden sm:table-cell">\2', c)

c = c.replace('<td className="px-6 py-3.5 text-slate-500">', '<td className="px-6 py-3.5 text-slate-500 hidden md:table-cell">')
c = c.replace('''<td className="px-6 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-700">''', '''<td className="px-6 py-3.5 hidden sm:table-cell">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-700">''')

f=open('frontend/src/pages/admin/Books.jsx', 'w', encoding='utf-8')
f.write(c)
f.close()
