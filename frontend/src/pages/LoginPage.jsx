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
          
          {/* Ambient Stardust & Glowing Constellation Particles */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute top-[12%] left-[8%] text-amber-400 opacity-80 animate-pulse duration-1000">
              <Sparkles size={20} />
            </div>
            <div className="absolute top-[35%] right-[10%] text-blue-400 opacity-70 animate-bounce duration-1000">
              <Sparkles size={16} />
            </div>
            <div className="absolute bottom-[25%] left-[12%] text-indigo-400 opacity-75 animate-pulse duration-700">
              <Sparkles size={22} />
            </div>
            <div className="absolute bottom-[10%] right-[14%] text-cyan-400 opacity-60 animate-bounce duration-1000">
              <Sparkles size={18} />
            </div>
            {/* Glowing 3D Radial Aura */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-tr from-blue-400/20 via-indigo-400/15 to-purple-400/20 rounded-full blur-3xl pointer-events-none" />
          </div>

          {/* Top Brand Header (Centered as Requested) */}
          <div className="relative z-10 flex flex-col items-center text-center mb-2">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 flex items-center justify-center shadow-xl shadow-blue-600/30 text-white ring-4 ring-white shrink-0 transform hover:scale-105 hover:rotate-3 transition-all duration-300 mb-2.5">
              <GraduationCap size={28} />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight tracking-tight">
              Anna University Central Library
            </h1>
            <div className="flex items-center justify-center gap-2 mt-2 flex-wrap">
              <span className="text-[10px] font-mono px-3 py-1 rounded-full bg-blue-100/90 text-blue-800 font-bold border border-blue-200/80 shadow-xs flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-ping" />
                NEXT-GEN CAMPUS INTELLIGENCE
              </span>
              <span className="text-[10px] font-mono px-3 py-1 rounded-full bg-indigo-100/90 text-indigo-800 font-bold border border-indigo-200/80 shadow-xs flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse" />
                VOICE AI & 3D WAYFINDING
              </span>
            </div>
          </div>

          {/* Center Infographic: 3D Connected Architecture Mesh with Laser Energy Streams */}
          <div className="relative z-10 my-4 sm:my-6 flex flex-col items-center justify-center min-h-[260px]">
            
            {/* SVG Constellation & Animated Laser Paths */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-0" viewBox="0 0 400 240" preserveAspectRatio="none">
              <defs>
                <linearGradient id="laserBlue" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity="0.3" />
                </linearGradient>
                <linearGradient id="laserCyan" x1="0%" y1="100%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.3" />
                </linearGradient>
                <linearGradient id="laserPurple" x1="100%" y1="100%" x2="0%" y2="0%">
                  <stop offset="0%" stopColor="#a855f7" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity="0.3" />
                </linearGradient>
                <filter id="glowLaser" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="2" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Glowing Constellation Connection Lines */}
              <path d="M 80,45 Q 140,75 200,90" stroke="url(#laserBlue)" strokeWidth="2" fill="none" strokeDasharray="6 4" className="animate-pulse" />
              <path d="M 320,45 Q 260,75 200,90" stroke="url(#laserBlue)" strokeWidth="2" fill="none" strokeDasharray="6 4" className="animate-pulse" />
              <path d="M 80,195 Q 140,145 200,120" stroke="url(#laserCyan)" strokeWidth="2" fill="none" strokeDasharray="6 4" className="animate-pulse" />
              <path d="M 320,195 Q 260,145 200,120" stroke="url(#laserPurple)" strokeWidth="2" fill="none" strokeDasharray="6 4" className="animate-pulse" />

              {/* Animated Floating Stardust Photons along paths */}
              <circle cx="140" cy="68" r="3" fill="#60a5fa" filter="url(#glowLaser)" className="animate-ping" />
              <circle cx="260" cy="68" r="3" fill="#818cf8" filter="url(#glowLaser)" className="animate-ping" />
              <circle cx="140" cy="158" r="3" fill="#22d3ee" filter="url(#glowLaser)" className="animate-ping" />
              <circle cx="260" cy="158" r="3" fill="#c084fc" filter="url(#glowLaser)" className="animate-ping" />
            </svg>

            {/* Central Intelligence Core Hub */}
            <div className="relative flex flex-col items-center justify-center my-3 z-20">
              {/* Outer 3D Orbital Energy Rings */}
              <div className="absolute w-36 h-36 rounded-full border border-blue-400/30 animate-spin duration-3000 pointer-events-none" />
              <div className="absolute w-28 h-28 rounded-full border-2 border-indigo-400/40 animate-ping opacity-25 pointer-events-none" />
              
              {/* Center Core Glassmorphic Hub */}
              <div className="relative group cursor-pointer">
                <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 flex flex-col items-center justify-center text-white shadow-2xl shadow-blue-600/50 ring-4 ring-white transform group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
                  <Cpu size={28} className="animate-pulse" />
                  <span className="text-[9px] font-mono font-black tracking-widest mt-0.5 text-blue-100">AI CORE</span>
                </div>
                {/* Active Live Dot */}
                <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center shadow-md">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                </div>
              </div>
            </div>

            {/* Surrounding 4 Upgraded Feature Cards */}
            <div className="w-full flex flex-col justify-between gap-4 pointer-events-none z-30">
              
              {/* Top Row Cards */}
              <div className="flex justify-between items-center w-full gap-2 sm:gap-4">
                
                {/* 1. Catalog RAG Search */}
                <div className="pointer-events-auto flex-1 max-w-[48%] bg-white/95 backdrop-blur-xl p-3 rounded-2xl border border-slate-200/90 shadow-md shadow-blue-900/5 flex items-center gap-3 transform hover:-translate-y-1.5 hover:scale-[1.02] hover:shadow-xl hover:border-blue-400 transition-all duration-300 cursor-default group">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100/80 text-blue-600 flex items-center justify-center shrink-0 shadow-xs group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <BookMarked size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-bold text-slate-800 truncate block">Catalog RAG</span>
                      <span className="text-[8px] font-mono font-bold px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 border border-blue-200/60 shrink-0">
                        24.8k
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium block truncate">Hybrid BM25 + Vector</span>
                  </div>
                </div>

                {/* 2. Real-Time Voice AI */}
                <div className="pointer-events-auto flex-1 max-w-[48%] bg-white/95 backdrop-blur-xl p-3 rounded-2xl border border-slate-200/90 shadow-md shadow-blue-900/5 flex items-center gap-3 transform hover:-translate-y-1.5 hover:scale-[1.02] hover:shadow-xl hover:border-indigo-400 transition-all duration-300 cursor-default group">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-50 to-indigo-100/80 text-indigo-600 flex items-center justify-center shrink-0 shadow-xs group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                    <Mic size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-bold text-slate-800 truncate block">Voice AI</span>
                      <span className="text-[8px] font-mono font-bold px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 border border-indigo-200/60 shrink-0">
                        &lt;120ms
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium block truncate">Whisper & Neural TTS</span>
                  </div>
                </div>

              </div>

              {/* Bottom Row Cards */}
              <div className="flex justify-between items-center w-full gap-2 sm:gap-4">
                
                {/* 3. 3D Shelf Wayfinder */}
                <div className="pointer-events-auto flex-1 max-w-[48%] bg-white/95 backdrop-blur-xl p-3 rounded-2xl border border-slate-200/90 shadow-md shadow-blue-900/5 flex items-center gap-3 transform hover:-translate-y-1.5 hover:scale-[1.02] hover:shadow-xl hover:border-cyan-400 transition-all duration-300 cursor-default group">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-50 to-cyan-100/80 text-cyan-600 flex items-center justify-center shrink-0 shadow-xs group-hover:bg-cyan-600 group-hover:text-white transition-colors">
                    <Compass size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-bold text-slate-800 truncate block">3D Wayfinder</span>
                      <span className="text-[8px] font-mono font-bold px-1.5 py-0.2 rounded bg-cyan-50 text-cyan-700 border border-cyan-200/60 shrink-0">
                        360°
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium block truncate">Floor & Shelf Route</span>
                  </div>
                </div>

                {/* 4. Campus Circulars */}
                <div className="pointer-events-auto flex-1 max-w-[48%] bg-white/95 backdrop-blur-xl p-3 rounded-2xl border border-slate-200/90 shadow-md shadow-blue-900/5 flex items-center gap-3 transform hover:-translate-y-1.5 hover:scale-[1.02] hover:shadow-xl hover:border-purple-400 transition-all duration-300 cursor-default group">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-50 to-purple-100/80 text-purple-600 flex items-center justify-center shrink-0 shadow-xs group-hover:bg-purple-600 group-hover:text-white transition-colors">
                    <Megaphone size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-bold text-slate-800 truncate block">Campus Notice</span>
                      <span className="text-[8px] font-mono font-bold px-1.5 py-0.2 rounded bg-purple-50 text-purple-700 border border-purple-200/60 shrink-0">
                        24H LIVE
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium block truncate">Events & Auto-Purge</span>
                  </div>
                </div>

              </div>

            </div>

          </div>

          {/* Bottom Trust & Origin Badge (With Precise Make In India Lion & Accurate India Map SVGs) */}
          <div className="relative z-10 pt-3 border-t border-blue-200/60">
            <div className="bg-white/95 backdrop-blur-md px-4 py-3 rounded-2xl border border-slate-200/90 shadow-md shadow-blue-900/5 flex items-center justify-between gap-3">
              
              {/* Left: Make In India Stylized Lion Icon */}
              <div className="flex items-center gap-3">
                <div className="w-12 h-9 flex items-center justify-center shrink-0">
                  <svg viewBox="0 0 100 60" className="w-12 h-8 text-slate-900 fill-current" preserveAspectRatio="xMidYMid meet">
                    {/* Make in India Mechanical Lion Silhouette */}
                    <path d="M 52,18 C 50,14 45,10 40,11 C 36,9 31,10 27,13 C 23,11 18,13 15,17 C 12,15 8,18 7,22 C 5,26 6,31 9,34 C 7,37 8,42 11,44 C 14,47 19,46 22,48 C 24,51 28,52 32,50 C 35,52 40,51 43,48 C 47,48 51,45 53,41 C 56,41 59,38 60,34 C 62,30 61,25 58,22 C 58,19 55,18 52,18 Z" opacity="0.95" />
                    <path d="M 50,20 Q 56,16 62,18 Q 66,20 68,24 Q 69,27 66,29 Q 62,31 58,30 Q 54,32 50,30 Z" />
                    <circle cx="60" cy="22" r="1.5" fill="#fff" />
                    <path d="M 25,28 Q 15,30 10,36 Q 6,42 12,44 Q 20,44 26,40 Q 34,42 42,38 Z" />
                    <path d="M 46,38 L 48,54 L 54,54 L 51,42 Z" />
                    <path d="M 38,40 L 40,52 L 44,52 L 42,42 Z" opacity="0.8" />
                    <path d="M 16,38 Q 14,44 12,54 L 18,54 Q 21,46 23,40 Z" />
                    <path d="M 22,38 L 24,52 L 28,52 L 27,42 Z" opacity="0.75" />
                    <path d="M 10,36 Q 4,32 5,24 Q 6,20 10,22 Q 8,26 12,32 Z" />
                    {/* Mechanical Cog Cutouts in Mane */}
                    <circle cx="34" cy="26" r="3.5" fill="#fff" opacity="0.9" />
                    <circle cx="34" cy="26" r="1.5" fill="#0f172a" />
                    <circle cx="44" cy="28" r="2.5" fill="#fff" opacity="0.9" />
                    <circle cx="44" cy="28" r="1" fill="#0f172a" />
                    <circle cx="24" cy="32" r="2.5" fill="#fff" opacity="0.9" />
                    <circle cx="24" cy="32" r="1" fill="#0f172a" />
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

              {/* Right: Accurate India Map Tricolor Silhouette with Ashoka Chakra */}
              <div className="shrink-0 flex items-center justify-center pl-2">
                <svg viewBox="0 0 100 120" className="w-8 h-10 drop-shadow-sm" preserveAspectRatio="xMidYMid meet">
                  <defs>
                    <linearGradient id="indiaMapTricolor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#FF9933" />
                      <stop offset="38%" stopColor="#FF9933" />
                      <stop offset="46%" stopColor="#FFFFFF" />
                      <stop offset="54%" stopColor="#FFFFFF" />
                      <stop offset="62%" stopColor="#138808" />
                      <stop offset="100%" stopColor="#138808" />
                    </linearGradient>
                    <filter id="mapGlow" x="-10%" y="-10%" width="120%" height="120%">
                      <feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="#0f172a" floodOpacity="0.15"/>
                    </filter>
                  </defs>
                  
                  {/* Detailed Geographic Outline of India */}
                  <path 
                    d="M 46,6 
                       C 48,4 52,4 54,7 
                       C 56,11 60,13 58,18 
                       C 57,22 62,25 65,24 
                       C 70,23 75,25 78,22 
                       C 82,20 88,23 92,26 
                       C 96,29 94,34 90,36 
                       C 85,38 82,34 77,36 
                       C 73,38 72,42 68,44 
                       C 65,46 64,50 66,54 
                       C 68,58 66,63 64,68 
                       C 61,74 58,80 55,87 
                       C 52,94 50,102 48,110 
                       C 47,114 45,114 44,110 
                       C 42,102 38,92 35,84 
                       C 32,76 28,70 24,64 
                       C 20,58 18,52 14,48 
                       C 8,46 4,42 6,36 
                       C 8,30 14,32 18,35 
                       C 22,37 25,34 26,28 
                       C 27,22 32,18 36,16 
                       C 40,14 44,9 46,6 Z" 
                    fill="url(#indiaMapTricolor)" 
                    stroke="#64748b" 
                    strokeWidth="0.8"
                    filter="url(#mapGlow)"
                  />
                  
                  {/* Ashoka Chakra in Center */}
                  <g transform="translate(47, 52)">
                    <circle cx="0" cy="0" r="4.5" fill="none" stroke="#000080" strokeWidth="0.8" />
                    <circle cx="0" cy="0" r="1.2" fill="#000080" />
                    <line x1="0" y1="-4.2" x2="0" y2="4.2" stroke="#000080" strokeWidth="0.5" />
                    <line x1="-4.2" y1="0" x2="4.2" y2="0" stroke="#000080" strokeWidth="0.5" />
                    <line x1="-3" y1="-3" x2="3" y2="3" stroke="#000080" strokeWidth="0.5" />
                    <line x1="3" y1="-3" x2="-3" y2="3" stroke="#000080" strokeWidth="0.5" />
                  </g>
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
