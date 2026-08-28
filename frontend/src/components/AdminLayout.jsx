import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { 
  LayoutDashboard, 
  BookOpen, 
  UploadCloud, 
  Building2, 
  Users, 
  BarChart3, 
  ScrollText, 
  Settings, 
  LogOut,
  Layers,
  GraduationCap,
  Sparkles,
  ArrowUpRight,
  Menu,
  X
} from 'lucide-react';

const AdminLayout = () => {
  const { logoutUser, user } = useAuth();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logoutUser();
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Architecture', path: '/admin/architecture', icon: Layers },
    { name: 'Books Management', path: '/admin/books', icon: BookOpen },
    { name: 'Upload Dataset', path: '/admin/upload', icon: UploadCloud },
    { name: 'Departments', path: '/admin/departments', icon: Building2 },
    { name: 'User Directory', path: '/admin/users', icon: Users },
    { name: 'Analytics', path: '/admin/analytics', icon: BarChart3 },
    { name: 'System Logs', path: '/admin/logs', icon: ScrollText },
    { name: 'Settings', path: '/admin/settings', icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden font-sans relative">
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

      
      {/* Sidebar */}
      <aside className={`w-64 bg-white border-r border-slate-200 flex flex-col z-50 shrink-0 select-none transition-transform duration-300 absolute md:relative h-full ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}>
        
        {/* Sidebar Brand Header */}
        <div className="h-16 px-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <GraduationCap size={20} />
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-900 leading-tight">Admin Portal</h1>
              <p className="text-[10px] text-slate-500 font-medium">Library Intelligence</p>
            </div>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          <div className="px-3 pb-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Management & Data
          </div>
          
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              onClick={() => setIsMobileMenuOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive 
                    ? 'bg-blue-50 text-blue-700 shadow-sm border border-blue-100' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`
              }
            >
              <item.icon size={17} className="shrink-0" />
              <span className="truncate">{item.name}</span>
            </NavLink>
          ))}
        </nav>

        {/* User Card & Logout */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/60">
          <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200/80 mb-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center shrink-0">
                {user?.username?.slice(0, 2).toUpperCase() || 'AD'}
              </div>
              <div className="truncate">
                <p className="text-xs font-semibold text-slate-800 truncate">{user?.username || 'Administrator'}</p>
                <p className="text-[10px] text-slate-400">Super Admin</p>
              </div>
            </div>
            <button 
              onClick={() => navigate('/assistant')}
              title="Open User Assistant"
              className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
            >
              <ArrowUpRight size={14} />
            </button>
          </div>

          <button 
            onClick={handleLogout}
            className="flex items-center justify-center gap-2 w-full py-2 px-3 rounded-xl text-xs font-semibold text-slate-600 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-100 transition-all"
          >
            <LogOut size={14} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Admin View Area */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-50 pt-16 md:pt-0">
        <div className="flex-1 overflow-y-auto p-6 sm:p-8">
          <Outlet />
        </div>
      </main>

    </div>
  );
};

export default AdminLayout;
