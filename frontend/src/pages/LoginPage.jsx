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
    { icon: Mic, label: 'Voice AI Research', desc: 'Zero-latency conversational intelligence', color: 'text-sky-400' },
    { icon: Compass, label: '3D Shelf Wayfinder', desc: 'Real-time spatial rack navigation', color: 'text-amber-400' },
    { icon: Zap, label: 'Groq RAG Engine', desc: 'Multi-tier instant collection retrieval', color: 'text-emerald-400' },
  ];

  return (
    <div className="min-h-screen bg-[#0a192f] text-slate-100 flex flex-col justify-between relative overflow-x-hidden font-sans selection:bg-sky-500/30 selection:text-sky-200">
      
      {/* 3D Knowledge Constellation Background */}
      <AnimatedBackground />

      {/* Top Navbar */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-sky-500 via-indigo-600 to-violet-600 flex items-center justify-center shadow-lg shadow-sky-500/25 text-white ring-1 ring-white/20 shrink-0">
            <GraduationCap size={22} />
          </div>
          <div>
            <h1 className="text-sm sm:text-base font-extrabold text-white leading-tight tracking-tight flex items-center gap-2">
              Anna University
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-sky-500/10 text-sky-400 border border-sky-500/20 font-normal">
                CENTRAL LIBRARY
              </span>
            </h1>
            <p className="text-[11px] text-slate-400 font-medium">Digital Knowledge & Campus Intelligence Hub</p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs font-bold text-emerald-400 bg-emerald-950/50 px-3.5 py-1.5 rounded-full border border-emerald-500/30 shadow-lg shadow-emerald-950/40 backdrop-blur-md">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-beacon-green" />
          <span>System Online · Groq RAG Active</span>
        </div>
      </header>

      {/* Main Container */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-4 sm:py-6 max-w-xl mx-auto w-full">
        
        {/* Modernized Digital Library Card */}
        <div className="w-full glass-card-dark rounded-3xl border border-sky-500/20 shadow-2xl p-6 sm:p-8 transition-all relative overflow-hidden">
          
          {/* Card Accent Top Banner / Microchip Header */}
          <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-700/60">
            <div className="flex items-center gap-2">
              <div className="w-6 h-5 rounded bg-gradient-to-tr from-amber-500/80 to-amber-300/90 border border-amber-300/40 flex items-center justify-center shadow-sm">
                <div className="w-3 h-2 border border-amber-800/40 rounded-sm" />
              </div>
              <span className="text-[10px] font-mono tracking-widest text-slate-400 uppercase">
                DIGITAL ARCHIVAL PASS · 2026
              </span>
            </div>
            <div className="flex items-center gap-1 text-slate-500">
              <QrCode size={16} className="text-slate-400" />
              <span className="text-[10px] font-mono">ID: AU-LIB-AI</span>
            </div>
          </div>

          {/* Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-500/15 to-indigo-500/20 border border-sky-400/30 text-sky-400 mb-3 shadow-lg shadow-sky-500/10 ring-4 ring-sky-500/10">
              <BookOpen size={26} />
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              Welcome to Library AI
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 font-medium">
              Authenticate your account to access 3D navigation & voice research
            </p>
          </div>

          {/* Role Switcher */}
          <div className="flex p-1 bg-slate-900/80 backdrop-blur-md rounded-2xl mb-5 border border-slate-700/60 shadow-inner">
            <button
              type="button"
              onClick={() => setRole('user')}
              className={`flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 flex items-center justify-center gap-2 ${
                role === 'user'
                  ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-lg shadow-sky-500/25 border border-sky-400/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
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
                  ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-600/25 border border-indigo-400/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Shield size={15} />
              <span>Admin Portal</span>
            </button>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="mb-4 p-3.5 bg-red-950/60 border border-red-500/40 text-red-300 text-xs rounded-xl flex items-center gap-2.5 animate-[fadeInScale_0.2s_ease-out]">
              <div className="w-2 h-2 bg-red-400 rounded-full shrink-0 ring-2 ring-red-400/30 animate-pulse" />
              <span className="font-semibold">{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5 font-mono">
                Username / Student ID
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-amber-400 transition-colors">
                  <User size={16} />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="block w-full pl-10 pr-4 py-3 bg-slate-900/90 border border-slate-700/80 rounded-xl text-white text-xs sm:text-sm placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition-all font-medium"
                  placeholder="e.g. student or admin"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5 font-mono">
                Security Password
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-amber-400 transition-colors">
                  <Lock size={16} />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-4 py-3 bg-slate-900/90 border border-slate-700/80 rounded-xl text-white text-xs sm:text-sm placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition-all font-medium"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-sky-500 via-indigo-600 to-violet-600 hover:from-sky-400 hover:to-violet-500 text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg shadow-sky-500/25 transition-all duration-200 flex items-center justify-center gap-2 interactive-button active:scale-[0.98] disabled:opacity-50 border border-white/20"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <KeyRound size={16} />
                  <span>Authenticate & Enter Library</span>
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
                className="flex flex-col items-center justify-center text-center px-2 py-3.5 bg-slate-900/60 backdrop-blur-md rounded-2xl border border-slate-800 shadow-md w-full min-h-[90px] interactive-card"
              >
                <f.icon size={20} className={`${f.color} mb-2`} />
                <span className="text-[11px] font-bold text-slate-200 leading-snug w-full px-1">{f.label}</span>
              </div>
            ))}
          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full text-center py-3 text-[11px] text-slate-500 font-medium font-mono">
        POWERED BY <strong className="text-slate-300">TECHWEGO</strong> · ADVANCED LIBRARY INTELLIGENCE SYSTEM
      </footer>

    </div>
  );
};

export default LoginPage;
