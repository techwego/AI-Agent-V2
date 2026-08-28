import re

with open('frontend/src/components/AdminLayout.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add useState and Menu icon
content = content.replace("import React from 'react';", "import React, { useState } from 'react';")
content = content.replace("ArrowUpRight", "ArrowUpRight,\n  Menu,\n  X")

# Add state
content = content.replace("const navigate = useNavigate();", "const navigate = useNavigate();\n  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);")

# Change wrapper layout
content = content.replace('<div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden font-sans">', '''<div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden font-sans relative">
      {/* Mobile Menu Button & Header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-white border-b border-slate-200 z-30 absolute top-0 left-0 right-0 h-16">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white">
            <GraduationCap size={16} />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-900 leading-tight">Admin Portal</h1>
          </div>
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 bg-slate-100 rounded-lg text-slate-700">
          {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>
      
      {/* Mobile overlay */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 bg-slate-900/50 z-40 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
      )}
''')

# Update aside className
content = re.sub(
    r'<aside className="w-64 bg-white border-r border-slate-200 flex flex-col z-20 shrink-0 select-none">',
    r'<aside className={`w-64 bg-white border-r border-slate-200 flex flex-col z-50 shrink-0 select-none transition-transform duration-300 absolute md:relative h-full ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}>',
    content
)

# Update main padding for mobile header
content = re.sub(
    r'<main className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-50">',
    r'<main className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-50 pt-16 md:pt-0">',
    content
)

# Close sidebar when clicking links
content = content.replace('to={item.path}', 'to={item.path}\n              onClick={() => setIsMobileMenuOpen(false)}')

with open('frontend/src/components/AdminLayout.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
