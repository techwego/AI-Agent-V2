import re
f=open('frontend/src/pages/admin/Users.jsx', 'r', encoding='utf-8')
c=f.read()
f.close()

c = c.replace('<th className="px-6 py-3.5 font-bold text-slate-600 uppercase tracking-wider">Email Address</th>', '<th className="px-6 py-3.5 font-bold text-slate-600 uppercase tracking-wider hidden md:table-cell">Email Address</th>')
c = c.replace('<th className="px-6 py-3.5 font-bold text-slate-600 uppercase tracking-wider">Last Login</th>', '<th className="px-6 py-3.5 font-bold text-slate-600 uppercase tracking-wider hidden lg:table-cell">Last Login</th>')
c = c.replace('<th className="px-6 py-3.5 font-bold text-slate-600 uppercase tracking-wider">Role</th>', '<th className="px-6 py-3.5 font-bold text-slate-600 uppercase tracking-wider hidden sm:table-cell">Role</th>')

# Tbody
c = c.replace('<td className="px-6 py-4 text-slate-600">{u.email || \'—\'}</td>', '<td className="px-6 py-4 text-slate-600 hidden md:table-cell">{u.email || \'—\'}</td>')

role_td = '''<td className="px-6 py-4 hidden sm:table-cell">
                      <span className={`inline-flex px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md border ${'''
c = re.sub(r'<td className="px-6 py-4">\s*<span className={`inline-flex px-2.5 py-0.5 text-\[10px\] font-bold uppercase tracking-wider rounded-md border \${', role_td, c)

last_login = '''<td className="px-6 py-4 text-slate-500 hidden lg:table-cell">
                      <div className="flex items-center gap-1.5">'''
c = re.sub(r'<td className="px-6 py-4 text-slate-500">\s*<div className="flex items-center gap-1.5">', last_login, c)


f=open('frontend/src/pages/admin/Users.jsx', 'w', encoding='utf-8')
f.write(c)
f.close()
