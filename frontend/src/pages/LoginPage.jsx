import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { login } from '../api/client';
import { 
  Lock, User, ArrowRight, BookOpen, Sparkles, Shield, GraduationCap, 
  Mic, Compass, Zap, KeyRound, CheckCircle2, QrCode
} from 'lucide-react';
import AnimatedBackground from '../components/AnimatedBackground';

const LoginPage = () => {
  const { isAuthenticated, isAdmin, loginUser } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState('user');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) {
    return <Navigate to={isAdmin ? "/admin/dashboard" : "/assistant"} />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await login({ username, password, role });
      const { access_token, user } = res.data;
      loginUser(access_token, user);
      if (user.role === 'admin') {
        navigate('/admin/dashboard');
      } else {
        navigate('/assistant');
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid credentials. Please verify your student or admin account.');
    } finally {
      setLoading(false);
    }
  };

  const featurePills = [
    { icon: Mic, label: 'Voice AI Research', desc: 'Zero-latency speech assistant', color: 'text-blue-600' },
    { icon: Compass, label: '3D Campus Wayfinder', desc: 'Interactive visual shelf navigation', color: 'text-indigo-600' },
    { icon: Zap, label: 'Groq RAG Intelligence', desc: 'Instant catalog and author lookup', color: 'text-sky-600' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between relative overflow-x-hidden font-sans selection:bg-blue-100 selection:text-blue-900">
      
      {/* 3D Knowledge Constellation Background */}
      <AnimatedBackground />

      {/* Top Navbar */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 flex items-center justify-center shadow-md shadow-blue-600/25 text-white ring-2 ring-white shrink-0">
            <GraduationCap size={22} />
          </div>
          <div>
            <h1 className="text-sm sm:text-base font-extrabold text-slate-900 leading-tight tracking-tight flex items-center gap-2">
              Anna University
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 font-semibold">
                CENTRAL LIBRARY
              </span>
            </h1>
            <p className="text-[11px] text-slate-500 font-medium">Digital Knowledge & Campus Intelligence Hub</p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-50/90 px-3.5 py-1.5 rounded-full border border-emerald-200 shadow-sm backdrop-blur-md">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-beacon-green" />
          <span>System Online · Groq RAG Active</span>
        </div>
      </header>

      {/* Main Container */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-4 sm:py-6 max-w-xl mx-auto w-full">
        
        {/* Enterprise White Glassmorphic Digital Library Card */}
        <div className="w-full bg-white/95 backdrop-blur-xl rounded-3xl border border-slate-200/90 shadow-2xl shadow-blue-600/5 p-6 sm:p-8 transition-all relative overflow-hidden">
          
          {/* Card Accent Top Banner / Microchip Header */}
          <div className="flex items-center justify-between pb-3.5 mb-5 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-6 h-5 rounded bg-gradient-to-tr from-amber-400 to-amber-200 border border-amber-300 flex items-center justify-center shadow-xs">
                <div className="w-3 h-2 border border-amber-700/30 rounded-xs" />
              </div>
              <span className="text-[10px] font-mono tracking-widest text-slate-400 uppercase font-semibold">
                DIGITAL ARCHIVAL PASS · 2026
              </span>
            </div>
            <div className="flex items-center gap-1 text-slate-400">
              <QrCode size={16} className="text-slate-500" />
              <span className="text-[10px] font-mono">ID: AU-LIB-AI</span>
            </div>
          </div>

          {/* Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 text-blue-600 mb-3 shadow-md shadow-blue-500/10 ring-4 ring-blue-50/50">
              <BookOpen size={26} />
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Welcome to Library AI
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
              Sign in to access 3D navigation & voice research assistant
            </p>
          </div>

          {/* Role Switcher */}
          <div className="flex p-1 bg-slate-100/90 backdrop-blur-sm rounded-2xl mb-5 border border-slate-200/70 shadow-xs">
            <button
              type="button"
              onClick={() => setRole('user')}
              className={`flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 flex items-center justify-center gap-2 ${
                role === 'user'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/25'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-white/60'
              }`}
            >
              <User size={15} />
              <span>Student / Scholar</span>
            </button>
            <button
              type="button"
              onClick={() => setRole('admin')}
              className={`flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 flex items-center justify-center gap-2 ${
                role === 'admin'
                  ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-600/25'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-white/60'
              }`}
            >
              <Shield size={15} />
              <span>Admin Portal</span>
            </button>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200/80 text-red-700 text-xs rounded-xl flex items-center gap-2.5 animate-[fadeInScale_0.2s_ease-out]">
              <div className="w-2 h-2 bg-red-500 rounded-full shrink-0 ring-2 ring-red-500/20" />
              <span className="font-semibold">{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5 font-mono">
                Username / Student ID
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors">
                  <User size={16} />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="block w-full pl-10 pr-4 py-3 bg-slate-50/80 border border-slate-200 rounded-xl text-slate-900 text-xs sm:text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 focus:bg-white transition-all font-semibold"
                  placeholder="e.g. student or admin"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5 font-mono">
                Password
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors">
                  <Lock size={16} />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-4 py-3 bg-slate-50/80 border border-slate-200 rounded-xl text-slate-900 text-xs sm:text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 focus:bg-white transition-all font-semibold"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg shadow-blue-600/25 transition-all duration-200 flex items-center justify-center gap-2 interactive-button active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <KeyRound size={16} />
                  <span>Sign in to Dashboard</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

        </div>

        {/* Feature Highlights on portrait viewports */}
        <div className="w-full mt-4 sm:mt-5 px-1">
          <div className="grid grid-cols-3 gap-3 w-full">
            {featurePills.map((f, i) => (
              <div 
                key={i} 
                className="flex flex-col items-center justify-center text-center px-2 py-3.5 bg-white/85 backdrop-blur-md rounded-2xl border border-slate-200/90 shadow-sm w-full min-h-[90px] interactive-card"
              >
                <f.icon size={20} className={`${f.color} mb-2`} />
                <span className="text-[11px] font-bold text-slate-800 leading-snug w-full px-1">{f.label}</span>
              </div>
            ))}
          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full text-center py-3 text-[11px] text-slate-400 font-medium font-mono">
        POWERED BY <strong className="text-slate-600 font-extrabold">TECHWEGO</strong> · ADVANCED LIBRARY INTELLIGENCE SYSTEM
      </footer>

    </div>
  );
};

export default LoginPage;
