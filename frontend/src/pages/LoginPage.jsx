import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { login } from '../api/client';
import { 
  Lock, User, ArrowRight, BookOpen, Shield, GraduationCap, 
  BookMarked, MapPin, Search, KeyRound, Sparkles, ExternalLink,
  Mic, Compass, Megaphone, Cpu, Radio, ShieldCheck, Layers, Award, CheckCircle2
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

  return (
    <div className="min-h-screen w-full bg-slate-50 text-slate-900 flex flex-col justify-between items-center relative overflow-x-hidden font-sans selection:bg-blue-100 selection:text-blue-900 p-3 sm:p-6 lg:p-8">
      
      {/* 3D Animated Background */}
      <AnimatedBackground />

      {/* Floating Shimmering Glitter Stars & Bokeh Sparkles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[8%] left-[12%] text-amber-400 opacity-70 animate-pulse duration-1000">
          <Sparkles size={24} />
        </div>
        <div className="absolute top-[18%] right-[14%] text-blue-400 opacity-80 animate-bounce duration-700">
          <Sparkles size={18} />
        </div>
        <div className="absolute bottom-[22%] left-[10%] text-indigo-400 opacity-65 animate-pulse duration-1000">
          <Sparkles size={26} />
        </div>
        <div className="absolute bottom-[14%] right-[16%] text-amber-300 opacity-75 animate-bounce duration-1000">
          <Sparkles size={22} />
        </div>
        <div className="absolute top-[48%] left-[5%] text-sky-400 opacity-60 animate-pulse duration-700">
          <Sparkles size={16} />
        </div>
        <div className="absolute top-[52%] right-[6%] text-violet-400 opacity-70 animate-pulse duration-1000">
          <Sparkles size={22} />
        </div>
      </div>

      {/* Main Unified Split Enclosure Card (Responsive: 2-Col on Desktop, Stack on Mobile/Vertical) */}
      <main className="relative z-10 my-auto w-full max-w-6xl bg-white/95 backdrop-blur-3xl rounded-[2rem] sm:rounded-[2.5rem] border border-blue-200/90 shadow-2xl shadow-blue-950/10 overflow-hidden grid grid-cols-1 lg:grid-cols-12 transition-all">
        
        {/* ========================================================================= */}
        {/* LEFT PANEL: Architecture & Features Visual Infographic (7 Cols on desktop) */}
        {/* ========================================================================= */}
        <div className="lg:col-span-7 bg-gradient-to-br from-blue-50/90 via-indigo-50/50 to-sky-50/70 p-6 sm:p-8 lg:p-10 flex flex-col justify-between relative border-b lg:border-b-0 lg:border-r border-blue-100/90 overflow-hidden">
          
          {/* Subtle Ambient Radial Glow inside Left Panel */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-blue-400/15 rounded-full blur-3xl pointer-events-none" />

          {/* Top Brand Header */}
          <div className="relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 flex items-center justify-center shadow-lg shadow-blue-600/30 text-white ring-4 ring-white shrink-0 transform hover:scale-105 transition-transform">
                <GraduationCap size={26} />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 leading-tight tracking-tight">
                  Anna University Central Library
                </h1>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-blue-100/80 text-blue-800 font-bold border border-blue-200/70">
                    NEXT-GEN CAMPUS INTELLIGENCE
                  </span>
                  <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-indigo-100/80 text-indigo-800 font-bold border border-indigo-200/70">
                    VOICE AI & 3D WAYFINDING
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Center Infographic: Node Architecture Map with Floating Physics */}
          <div className="relative z-10 my-8 sm:my-10 flex flex-col items-center justify-center min-h-[220px]">
            
            {/* SVG Constellation Connection Lines */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-35">
              <line x1="25%" y1="20%" x2="50%" y2="50%" stroke="#3b82f6" strokeWidth="2" strokeDasharray="5 5" className="animate-pulse" />
              <line x1="75%" y1="20%" x2="50%" y2="50%" stroke="#6366f1" strokeWidth="2" strokeDasharray="5 5" className="animate-pulse" />
              <line x1="25%" y1="80%" x2="50%" y2="50%" stroke="#06b6d4" strokeWidth="2" strokeDasharray="5 5" className="animate-pulse" />
              <line x1="75%" y1="80%" x2="50%" y2="50%" stroke="#8b5cf6" strokeWidth="2" strokeDasharray="5 5" className="animate-pulse" />
            </svg>

            {/* Central Intelligence Core Node */}
            <div className="relative flex flex-col items-center justify-center my-4 z-20">
              {/* Outer Energy Pulse Rings */}
              <div className="absolute w-36 h-36 rounded-full border-2 border-blue-400/30 animate-ping opacity-30 pointer-events-none" />
              <div className="absolute w-28 h-28 rounded-full border border-indigo-400/50 animate-pulse pointer-events-none" />
              
              {/* Center Core Hub */}
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 flex flex-col items-center justify-center text-white shadow-xl shadow-blue-600/40 ring-4 ring-white transform hover:scale-110 transition-all cursor-pointer">
                <Cpu size={28} className="animate-spin duration-3000" />
                <span className="text-[9px] font-mono font-bold tracking-wider mt-0.5">AI CORE</span>
              </div>
            </div>

            {/* Surrounding 4 Feature Pill Nodes */}
            <div className="w-full flex flex-col justify-between gap-6 pointer-events-none z-30">
              
              {/* Top Row Nodes */}
              <div className="flex justify-between items-center w-full gap-2">
                <div className="pointer-events-auto bg-white/95 backdrop-blur-md px-3 sm:px-4 py-2 rounded-2xl border border-slate-200/90 shadow-md shadow-blue-900/5 flex items-center gap-2.5 transform hover:-translate-y-1 hover:shadow-lg hover:border-blue-300 transition-all cursor-default">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 shadow-xs">
                    <BookMarked size={16} />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-800 block leading-tight">Catalog RAG Search</span>
                    <span className="text-[10px] text-slate-400 font-medium">Instant Live Availability</span>
                  </div>
                </div>

                <div className="pointer-events-auto bg-white/95 backdrop-blur-md px-3 sm:px-4 py-2 rounded-2xl border border-slate-200/90 shadow-md shadow-blue-900/5 flex items-center gap-2.5 transform hover:-translate-y-1 hover:shadow-lg hover:border-indigo-300 transition-all cursor-default">
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 shadow-xs">
                    <Mic size={16} />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-800 block leading-tight">Real-Time Voice AI</span>
                    <span className="text-[10px] text-slate-400 font-medium">Whisper & Neural TTS</span>
                  </div>
                </div>
              </div>

              {/* Bottom Row Nodes */}
              <div className="flex justify-between items-center w-full gap-2">
                <div className="pointer-events-auto bg-white/95 backdrop-blur-md px-3 sm:px-4 py-2 rounded-2xl border border-slate-200/90 shadow-md shadow-blue-900/5 flex items-center gap-2.5 transform hover:-translate-y-1 hover:shadow-lg hover:border-cyan-300 transition-all cursor-default">
                  <div className="w-8 h-8 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center shrink-0 shadow-xs">
                    <Compass size={16} />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-800 block leading-tight">3D Shelf Wayfinder</span>
                    <span className="text-[10px] text-slate-400 font-medium">360° Multi-Floor Nav</span>
                  </div>
                </div>

                <div className="pointer-events-auto bg-white/95 backdrop-blur-md px-3 sm:px-4 py-2 rounded-2xl border border-slate-200/90 shadow-md shadow-blue-900/5 flex items-center gap-2.5 transform hover:-translate-y-1 hover:shadow-lg hover:border-purple-300 transition-all cursor-default">
                  <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 shadow-xs">
                    <Megaphone size={16} />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-800 block leading-tight">Campus Circulars</span>
                    <span className="text-[10px] text-slate-400 font-medium">24h Live Notices & Leave</span>
                  </div>
                </div>
              </div>

            </div>

          </div>

          {/* Bottom Trust & Origin Badge (Matching Reference Design) */}
          <div className="relative z-10 pt-4 border-t border-blue-200/60">
            <div className="bg-white/95 backdrop-blur-md px-4 py-3 rounded-2xl border border-slate-200/90 shadow-md shadow-blue-900/5 flex items-center justify-between gap-3">
              
              {/* Left: Make In India Stylized Lion Icon */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-8 flex items-center justify-center shrink-0">
                  <svg viewBox="0 0 100 60" className="w-10 h-7 text-slate-900 fill-current">
                    {/* Make in India Lion silhouette */}
                    <path d="M10,35 Q15,25 25,28 Q30,15 45,18 Q55,10 65,15 Q75,12 85,20 Q95,25 90,35 Q85,45 75,42 Q65,48 55,44 Q45,50 35,46 Q25,48 15,42 Z" opacity="0.9" />
                    <circle cx="82" cy="22" r="2" fill="#fff" />
                    <path d="M15,42 L12,55 L18,55 L22,46 M35,46 L33,56 L39,56 L43,48 M65,44 L63,56 L69,56 L73,45 M85,38 L88,52 L94,52 L91,40" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" />
                    <path d="M28,28 Q35,22 45,26 M50,22 Q60,18 70,24 M35,35 Q45,30 55,36" stroke="#fff" strokeWidth="1.2" fill="none" opacity="0.6" />
                  </svg>
                </div>

                {/* Middle Text: Proudly Built by Techwego */}
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs sm:text-[13px] font-extrabold text-slate-900 tracking-tight">
                      Proudly Built by <a href="https://techwego.com/" target="_blank" rel="noopener noreferrer" className="hover:text-blue-600 transition-colors">Techwego</a>
                    </span>
                    <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200/80 uppercase flex items-center gap-1">
                      CHENNAI <span>🇮🇳</span>
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium tracking-tight">
                    Engineered with Passion for World-Class Education & Research
                  </p>
                </div>
              </div>

              {/* Right: India Map Tricolor Silhouette */}
              <div className="shrink-0 flex items-center justify-center pl-2">
                <svg viewBox="0 0 40 48" className="w-7 h-9 drop-shadow-xs">
                  {/* Stylized India map outline with saffron, white, green tricolor bands */}
                  <defs>
                    <linearGradient id="indiaTricolor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ff9933" />
                      <stop offset="45%" stopColor="#ffffff" />
                      <stop offset="55%" stopColor="#ffffff" />
                      <stop offset="100%" stopColor="#138808" />
                    </linearGradient>
                  </defs>
                  <path 
                    d="M18,2 Q22,4 24,8 Q28,10 26,14 Q32,16 34,22 Q38,26 32,30 Q30,34 26,36 Q22,44 20,46 Q18,44 14,36 Q10,34 8,30 Q2,26 6,22 Q8,16 14,14 Q12,10 16,8 Z" 
                    fill="url(#indiaTricolor)" 
                    stroke="#cbd5e1" 
                    strokeWidth="1" 
                  />
                  {/* Ashoka Chakra navy dot */}
                  <circle cx="20" cy="24" r="2.2" fill="#000080" />
                </svg>
              </div>

            </div>
          </div>

        </div>

        {/* ========================================================================= */}
        {/* RIGHT PANEL: Enterprise Sign-In Console Form (5 Cols on desktop) */}
        {/* ========================================================================= */}
        <div className="lg:col-span-5 p-6 sm:p-8 lg:p-10 flex flex-col justify-center bg-white/95 relative">
          
          {/* Header */}
          <div className="mb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/80 text-blue-700 text-xs font-bold mb-3 font-mono">
              <ShieldCheck size={14} className="text-blue-600" />
              <span>APPLIANCE CONSOLE · SIGN IN</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Sign In
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
              Access 3D wayfinding, book inventory & voice research assistant
            </p>
          </div>

          {/* Role Switcher */}
          <div className="flex p-1 bg-slate-100/90 backdrop-blur-sm rounded-2xl mb-5 border border-slate-200/70 shadow-xs">
            <button
              type="button"
              onClick={() => setRole('user')}
              className={`flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer ${
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
              className={`flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer ${
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

          {/* Sign In Form */}
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
                  className="block w-full pl-10 pr-4 py-3 bg-slate-50/90 border border-slate-200 rounded-xl text-slate-900 text-xs sm:text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 focus:bg-white transition-all font-semibold"
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
                  className="block w-full pl-10 pr-4 py-3 bg-slate-50/90 border border-slate-200 rounded-xl text-slate-900 text-xs sm:text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 focus:bg-white transition-all font-semibold"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-3 py-3.5 px-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-600/25 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <KeyRound size={16} />
                  <span>Sign In</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Quick Helper Credentials */}
          <div className="mt-4 text-center">
            <span className="text-[11px] font-mono text-slate-400">
              Default access: <strong className="text-slate-600">student</strong> / <strong className="text-slate-600">admin</strong>
            </span>
          </div>

          {/* Security SSL & Techwego Badge */}
          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-center gap-2 text-[11px] font-mono text-slate-400">
            <ShieldCheck size={14} className="text-emerald-500" />
            <span>256-Bit SSL & JWT Encrypted Connection</span>
          </div>

        </div>

      </main>

      {/* Global Page Footer */}
      <footer className="relative z-10 w-full text-center py-2 text-[11px] text-slate-500 font-medium font-mono flex items-center justify-center gap-1.5">
        <span>POWERED BY</span>
        <a 
          href="https://techwego.com/" 
          target="_blank" 
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 font-extrabold hover:underline transition-colors"
        >
          <span>Techwego</span>
          <ExternalLink size={10} className="text-blue-500" />
        </a>
        <span className="text-slate-300">·</span>
        <span className="text-slate-400">ADVANCED AI & LIBRARY INTELLIGENCE SYSTEMS</span>
      </footer>

    </div>
  );
};

export default LoginPage;
