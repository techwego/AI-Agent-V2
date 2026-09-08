import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import AnimatedBackground from './AnimatedBackground';
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
  X,
  Megaphone,
  HeartHandshake
} from 'lucide-react';

const AdminLayout = () => {
  const { logoutUser, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logoutUser();
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Guest Visits', path: '/admin/guests', icon: HeartHandshake },
    { name: 'Campus Circulars', path: '/admin/circulars', icon: Megaphone },
    { name: 'Architecture', path: '/admin/architecture', icon: Layers },
    { name: 'Books Management', path: '/admin/books', icon: BookOpen },
    { name: 'Upload Dataset', path: '/admin/upload', icon: UploadCloud },
    { name: 'User Directory', path: '/admin/users', icon: Users },
    { name: 'Analytics', path: '/admin/analytics', icon: BarChart3 },
    { name: 'System Logs', path: '/admin/logs', icon: ScrollText },
    { name: 'Settings', path: '/admin/settings', icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-transparent text-slate-100 overflow-hidden font-sans relative selection:bg-blue-600/30 selection:text-white">

      {/* Mobile Top Header */}
      <div className="lg:hidden flex items-center justify-between px-4 py-3 bg-slate-900/90 backdrop-blur-xl border-b border-slate-700/80 z-30 absolute top-0 left-0 right-0 h-14 shadow-sm">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shrink-0 shadow-md shadow-blue-500/20">
            <GraduationCap size={18} />
          </div>
          <div className="truncate">
            <h1 className="text-xs sm:text-sm font-extrabold text-white leading-tight truncate">Admin Portal</h1>
            <p className="text-[9px] text-slate-400 font-semibold truncate">Library Intelligence</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => navigate('/assistant')}
            className="p-1.5 text-slate-300 hover:text-blue-300 bg-slate-800/90 hover:bg-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all active:scale-95 border border-slate-700"
            title="Open Assistant"
          >
            <ArrowUpRight size={14} />
            <span className="hidden sm:inline text-[11px]">User View</span>
          </button>
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
            className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-200 transition-all active:scale-95 border border-slate-700"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>
      
      {/* Mobile drawer backdrop overlay */}
      {isMobileMenuOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-slate-950/60 z-40 backdrop-blur-sm transition-opacity animate-fade-in-scale" 
          onClick={() => setIsMobileMenuOpen(false)} 
        />
      )}

      {/* Sidebar (Glassmorphic with smooth hover physics) */}
      <aside className={`w-64 bg-slate-900/90 backdrop-blur-2xl border-r border-slate-700/80 flex flex-col z-50 shrink-0 select-none transition-transform duration-300 ease-in-out fixed lg:relative h-full shadow-2xl lg:shadow-none ${
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      }`}>
        
        {/* Sidebar Brand Header */}
        <div className="h-16 px-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/25 ring-1 ring-white/20">
              <GraduationCap size={20} />
            </div>
            <div>
              <h1 className="text-sm font-extrabold text-white leading-tight tracking-tight">Admin Portal</h1>
              <p className="text-[10px] text-slate-400 font-semibold">Library Intelligence</p>
            </div>
          </div>
          <button 
            onClick={() => setIsMobileMenuOpen(false)}
            className="lg:hidden p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 active:scale-95"
          >
            <X size={16} />
          </button>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-1 custom-scrollbar">
          <div className="px-3 pb-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">
            Management & Data
          </div>
          
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              onClick={() => setIsMobileMenuOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 active:scale-[0.98] ${
                  isActive 
                    ? 'bg-gradient-to-r from-blue-600/30 to-indigo-600/30 text-blue-300 shadow-xs border border-blue-500/40 font-bold translate-x-1' 
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/70 hover:translate-x-0.5'
                }`
              }
            >
              <item.icon size={17} className="shrink-0" />
              <span className="truncate">{item.name}</span>
            </NavLink>
          ))}
        </nav>

        {/* User Card & Logout */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/50 backdrop-blur-sm">
          <div className="flex items-center justify-between p-2 rounded-xl bg-slate-850/90 border border-slate-700/80 mb-2 shadow-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-blue-950/80 border border-blue-800/60 text-blue-300 font-bold text-xs flex items-center justify-center shrink-0">
                {user?.username?.slice(0, 2).toUpperCase() || 'AD'}
              </div>
              <div className="truncate">
                <p className="text-xs font-bold text-slate-200 truncate">{user?.username || 'Administrator'}</p>
                <p className="text-[10px] text-slate-400 font-mono">Super Admin</p>
              </div>
            </div>
            <button 
              onClick={() => navigate('/assistant')}
              title="Open User Assistant"
              className="p-1.5 text-slate-400 hover:text-blue-400 rounded-lg hover:bg-slate-800 transition-all active:scale-95"
            >
              <ArrowUpRight size={14} />
            </button>
          </div>

          <button 
            onClick={handleLogout}
            className="flex items-center justify-center gap-2 w-full py-2 px-3 rounded-xl text-xs font-semibold text-slate-400 hover:text-red-400 hover:bg-red-950/50 border border-transparent hover:border-red-800/50 transition-all active:scale-95"
          >
            <LogOut size={14} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Admin View Area with smooth route page entrance transition */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative z-10 pt-14 lg:pt-0">
        <div 
          key={location.pathname}
          className="flex-1 overflow-y-auto p-3 sm:p-5 lg:p-7 custom-scrollbar animate-page-enter"
        >
          <Outlet />
        </div>
      </main>

    </div>
  );
};

export default AdminLayout;
