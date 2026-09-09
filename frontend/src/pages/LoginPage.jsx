import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { login, getArchitecture, getActiveGuests, guestLogin, studentQuickAccess } from '../api/client';
import { 
  Lock, User, ArrowRight, BookOpen, Shield, GraduationCap, 
  BookMarked, MapPin, Search, KeyRound, Sparkles, ExternalLink,
  Mic, Compass, Megaphone, Cpu, Radio, ShieldCheck, Eye, EyeOff,
  LogIn, HeartHandshake, Volume2
} from 'lucide-react';
import InteractiveNodeMesh from '../components/InteractiveNodeMesh';
import PlasmaVoiceCore from '../components/PlasmaVoiceCore';

const LoginPage = () => {
  const { isAuthenticated, isAdmin, loginUser } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState('admin');
  const [username, setUsername] = useState('');
  const [agentName, setAgentName] = useState(() => localStorage.getItem('cached_agent_name') || 'LibGenie');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [studentLoading, setStudentLoading] = useState(false);
  const [libraryName, setLibraryName] = useState(() => localStorage.getItem('cached_library_name') || 'Anna University Central Library');
  const [showGuestCards, setShowGuestCards] = useState(false);
  const [guests, setGuests] = useState([]);
  const [guestLoadingId, setGuestLoadingId] = useState(null);
  const guestScrollRef = useRef(null);
  const [isHoveringGuests, setIsHoveringGuests] = useState(false);

  // Auto-scrolling horizontal guest cards
  useEffect(() => {
    if (!showGuestCards || guests.length <= 1) return;
    
    let animId;
    const speed = 0.55; // Smooth horizontal pixels per frame

    const step = () => {
      if (guestScrollRef.current && !isHoveringGuests) {
        const el = guestScrollRef.current;
        const maxScroll = el.scrollWidth - el.clientWidth;
        
        if (maxScroll > 5) {
          el.scrollLeft += speed;
          if (el.scrollLeft >= maxScroll - 1) {
            el.scrollLeft = 0; // Seamless loop back to beginning
          }
        }
      }
      animId = requestAnimationFrame(step);
    };

    animId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animId);
  }, [showGuestCards, guests.length, isHoveringGuests]);

  // Plasma Voice Core Interactive State: 'WAITING' | 'LISTENING' | 'THINKING' | 'SPEAKING'
  const [plasmaState, setPlasmaState] = useState('WAITING');
  const plasmaTimerRef = useRef(null);

  useEffect(() => {
    getArchitecture().then(res => {
      if (res?.data?.library_name) {
        setLibraryName(res.data.library_name);
        localStorage.setItem('cached_library_name', res.data.library_name);
      }
      if (res?.data?.agent_name) {
        setAgentName(res.data.agent_name);
        localStorage.setItem('cached_agent_name', res.data.agent_name);
      }
    }).catch(() => {});

    // Fetch active guest cards
    getActiveGuests().then(res => {
      if (res.data?.show_guest_cards && res.data.guests?.length > 0) {
        setShowGuestCards(true);
        setGuests(res.data.guests);
      } else {
        setShowGuestCards(false);
        setGuests([]);
      }
    }).catch(() => {});
  }, []);

  const handleStudentQuickAccess = async () => {
    setStudentLoading(true);
    setError('');
    try {
      const res = await studentQuickAccess();
      const { access_token, user } = res.data;
      loginUser(access_token, user);
      navigate('/assistant');
    } catch (err) {
      console.warn('Student quick access fallback:', err);
      try {
        const res = await login({ username: 'student', password: 'password', role: 'user' });
        const { access_token, user } = res.data;
        loginUser(access_token, user);
        navigate('/assistant');
      } catch (fallbackErr) {
        navigate('/assistant');
      }
    } finally {
      setStudentLoading(false);
    }
  };

  const handleGuestCardClick = async (guest) => {
    setGuestLoadingId(guest.id);
    try {
      const res = await guestLogin(guest.id);
      const { access_token, user } = res.data;
      loginUser(access_token, user);
      navigate(`/assistant?guest_id=${guest.id}`);
    } catch (err) {
      console.error('Guest login failed:', err);
      // Fallback: still navigate to assistant with guest_id
      navigate(`/assistant?guest_id=${guest.id}`);
    } finally {
      setGuestLoadingId(null);
    }
  };

  const handlePlasmaClick = () => {
    if (plasmaTimerRef.current) clearTimeout(plasmaTimerRef.current);

    if (plasmaState === 'WAITING') {
      // Transition: Waiting -> Listening
      setPlasmaState('LISTENING');

      // Auto cycle: Listening (2.5s) -> Thinking (1.8s) -> Speaking (3s) -> Waiting
      plasmaTimerRef.current = setTimeout(() => {
        setPlasmaState('THINKING');

        plasmaTimerRef.current = setTimeout(() => {
          setPlasmaState('SPEAKING');

          plasmaTimerRef.current = setTimeout(() => {
            setPlasmaState('WAITING');
          }, 3200);
        }, 1800);
      }, 2500);
    } else {
      setPlasmaState('WAITING');
    }
  };

  useEffect(() => {
    return () => {
      if (plasmaTimerRef.current) clearTimeout(plasmaTimerRef.current);
    };
  }, []);

  if (isAuthenticated) {
    return <Navigate to={isAdmin ? "/admin/dashboard" : "/assistant"} />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    setLoading(true);
    try {
      const res = await login({ username, password, role: 'admin' });
      const { access_token, user } = res.data;
      loginUser(access_token, user);
      if (user.role === 'admin') {
        navigate('/admin/dashboard');
      } else {
        navigate('/assistant');
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid administrator credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full text-slate-100 flex flex-col justify-between items-center relative overflow-x-hidden font-sans selection:bg-blue-600/30 selection:text-white px-3 py-2.5 sm:px-6 sm:py-3.5 bg-transparent">

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* MAIN CARDS CONTAINER (Page-Filling Responsive Proportions)             */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <div className="w-full max-w-2xl lg:max-w-3xl flex-1 flex flex-col justify-between gap-2.5 sm:gap-3.5 relative z-10 animate-fade-in-scale min-h-0">

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* SECTION 1 (TOP BLOCK: ~48-50% HEIGHT) — Visual AI Core & Features   */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        <section className="w-full flex-1 bg-slate-900/85 backdrop-blur-2xl rounded-[1.5rem] sm:rounded-[2rem] border border-slate-700/60 shadow-2xl shadow-indigo-950/40 p-4 sm:p-6 relative overflow-hidden flex flex-col justify-between min-h-0">
          
          {/* Subtle Ambient Radial Glow */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-tr from-blue-600/20 via-indigo-600/15 to-purple-600/20 rounded-full blur-3xl pointer-events-none" />
          </div>

          {/* ── LibGenie Modern Brand Header (78-80% Width, Centered, No Indicator Dot) ── */}
          <div className="relative z-10 flex flex-col items-center justify-center text-center shrink-0 pt-0.5 pb-0.5 w-full">
            <div className="w-[78%] sm:w-[80%] max-w-xl flex items-center justify-center gap-4 px-6 py-2.5 rounded-full bg-slate-900/85 border border-purple-500/40 shadow-[0_4px_30px_rgba(168,85,247,0.35)] backdrop-blur-xl group hover:border-purple-400 transition-all duration-300">
              <img 
                src="/libgenie_avatar.png" 
                alt="LibGenie Mascot" 
                className="h-10 sm:h-12 w-auto object-contain drop-shadow-[0_0_15px_rgba(168,85,247,0.9)] group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 select-none shrink-0"
              />
              <div className="flex flex-col items-center sm:items-start justify-center text-center sm:text-left">
                <span className="text-2xl sm:text-3xl font-black tracking-tight bg-gradient-to-r from-blue-400 via-indigo-200 to-fuchsia-400 bg-clip-text text-transparent drop-shadow-[0_2px_10px_rgba(168,85,247,0.4)] leading-none">
                  LibGenie
                </span>
                <span className="text-[9px] sm:text-[10px] tracking-[0.25em] uppercase font-extrabold text-indigo-300/90 mt-1">
                  AI Library Assistant
                </span>
              </div>
            </div>
          </div>

          {/* ── Center AI Node Mesh & Orbiting Feature Capsules ── */}
          <div className="relative z-10 my-auto flex-1 flex items-center justify-center min-h-0 py-2">
            
            {/* Interactive Spring Physics Neural Mesh Canvas */}
            <InteractiveNodeMesh />

            {/* Central Electric Plasma Voice Core Hub */}
            <div className="absolute z-20 flex flex-col items-center justify-center animate-float">
              <PlasmaVoiceCore 
                state={plasmaState}
                onClick={handlePlasmaClick}
                size={170}
                showBadge={true}
              />
            </div>

            {/* 4 Orbiting Satellite Feature Capsules */}
            <div className="w-full grid grid-cols-2 gap-x-3 sm:gap-x-10 gap-y-10 sm:gap-y-16 z-30 pointer-events-none">
              
              {/* Top-Left: Catalog RAG */}
              <div className="flex justify-start">
                <div 
                  className="pointer-events-auto bg-slate-850/95 backdrop-blur-md px-3 sm:px-3.5 py-1.5 rounded-full border border-slate-700/80 shadow-lg hover:border-blue-400 flex items-center gap-2 transform hover:-translate-y-1 hover:scale-[1.04] transition-all duration-300 cursor-default group animate-float"
                  style={{ animationDelay: '0s' }}
                >
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-600/30">
                    <BookOpen size={12} />
                  </div>
                  <span className="text-[11px] sm:text-xs font-bold text-slate-200 tracking-tight whitespace-nowrap pr-1">
                    Catalog RAG Search
                  </span>
                </div>
              </div>

              {/* Top-Right: Voice AI */}
              <div className="flex justify-end">
                <div 
                  className="pointer-events-auto bg-slate-850/95 backdrop-blur-md px-3 sm:px-3.5 py-1.5 rounded-full border border-slate-700/80 shadow-lg hover:border-indigo-400 flex items-center gap-2 transform hover:-translate-y-1 hover:scale-[1.04] transition-all duration-300 cursor-default group animate-float"
                  style={{ animationDelay: '1.2s' }}
                >
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-indigo-600/30">
                    <Mic size={12} />
                  </div>
                  <span className="text-[11px] sm:text-xs font-bold text-slate-200 tracking-tight whitespace-nowrap pr-1">
                    Real-Time Voice AI
                  </span>
                </div>
              </div>

              {/* Bottom-Left: 3D Wayfinder */}
              <div className="flex justify-start">
                <div 
                  className="pointer-events-auto bg-slate-850/95 backdrop-blur-md px-3 sm:px-3.5 py-1.5 rounded-full border border-slate-700/80 shadow-lg hover:border-cyan-400 flex items-center gap-2 transform hover:-translate-y-1 hover:scale-[1.04] transition-all duration-300 cursor-default group animate-float"
                  style={{ animationDelay: '0.6s' }}
                >
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-500 to-cyan-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-cyan-600/30">
                    <Compass size={12} />
                  </div>
                  <span className="text-[11px] sm:text-xs font-bold text-slate-200 tracking-tight whitespace-nowrap pr-1">
                    3D Shelf Wayfinder
                  </span>
                </div>
              </div>

              {/* Bottom-Right: Campus Notice */}
              <div className="flex justify-end">
                <div 
                  className="pointer-events-auto bg-slate-850/95 backdrop-blur-md px-3 sm:px-3.5 py-1.5 rounded-full border border-slate-700/80 shadow-lg hover:border-purple-400 flex items-center gap-2 transform hover:-translate-y-1 hover:scale-[1.04] transition-all duration-300 cursor-default group animate-float"
                  style={{ animationDelay: '1.8s' }}
                >
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-purple-600/30">
                    <Megaphone size={12} />
                  </div>
                  <span className="text-[11px] sm:text-xs font-bold text-slate-200 tracking-tight whitespace-nowrap pr-1">
                    Campus Notice Engine
                  </span>
                </div>
              </div>

            </div>

          </div>

        </section>


        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* SECTION 2 — Split Sign-In: Student Quick Access (Left) + Admin (Right)*/}
        {/* ─────────────────────────────────────────────────────────────────── */}
        <section className="w-full bg-slate-900/85 backdrop-blur-2xl rounded-[1.5rem] sm:rounded-[2rem] border border-slate-700/60 shadow-2xl shadow-blue-950/50 p-4 sm:p-6 relative overflow-hidden flex flex-col justify-center shrink-0">
          
          {/* Ambient Glow */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-tr from-indigo-600/15 via-blue-600/10 to-violet-600/15 rounded-full blur-3xl pointer-events-none" />
          </div>

          <div className="w-full relative z-10 grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 items-stretch">
            
            {/* ── LEFT COLUMN: Student Instant Access ── */}
            <div className="flex flex-col justify-between p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-blue-950/50 via-slate-900/80 to-indigo-950/40 border border-blue-500/30 shadow-lg hover:border-blue-400/60 transition-all duration-300 relative overflow-hidden group">
              
              {/* Subtle background glow */}
              <div className="absolute -top-12 -left-12 w-36 h-36 bg-blue-500/20 rounded-full blur-2xl pointer-events-none group-hover:scale-125 transition-transform duration-500" />
              
              <div>
                {/* Header Tag */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-blue-500/15 border border-blue-500/40 text-blue-300 text-[11px] font-bold">
                    <GraduationCap size={13} className="text-cyan-400" />
                    <span>Student Access</span>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                </div>

                {/* Animated Logo + Title */}
                <div className="flex items-center gap-3.5 my-2">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl p-1 bg-gradient-to-tr from-blue-500 via-indigo-500 to-cyan-400 shadow-lg shadow-blue-500/30 shrink-0 group-hover:scale-105 group-hover:rotate-3 transition-all duration-300">
                    <div className="w-full h-full rounded-[12px] bg-slate-950 flex items-center justify-center overflow-hidden p-1">
                      <img 
                        src="/libgenie_avatar.png" 
                        alt="LibGenie Animated Mascot" 
                        className="w-full h-full object-contain drop-shadow-[0_0_8px_rgba(59,130,246,0.8)] animate-pulse"
                      />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-black text-white tracking-tight flex items-center gap-1.5">
                      <span>If you are a student</span>
                      <Sparkles size={14} className="text-yellow-400" />
                    </h3>
                    <p className="text-[11px] sm:text-xs text-indigo-200 font-medium mt-0.5">
                      Direct access without login credentials
                    </p>
                  </div>
                </div>

                <p className="text-[11px] sm:text-xs text-slate-300/90 leading-relaxed mt-2 mb-3">
                  Click below to instantly launch the <strong>AI Voice Assistant</strong>, <strong>3D Shelf Wayfinder</strong>, and catalog search.
                </p>
              </div>

              {/* Instant Access Button */}
              <div>
                <button
                  type="button"
                  onClick={handleStudentQuickAccess}
                  disabled={studentLoading}
                  className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 via-cyan-600 to-indigo-600 hover:from-blue-500 hover:to-cyan-500 text-white font-black text-xs sm:text-sm rounded-xl shadow-xl shadow-blue-600/30 hover:shadow-cyan-500/40 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] disabled:opacity-50 touch-manipulation group"
                >
                  {studentLoading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <GraduationCap size={16} className="group-hover:rotate-12 transition-transform" />
                      <span>Click Here to Enter (Student)</span>
                      <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
                <div className="mt-2 text-center text-[10px] text-slate-400 font-medium">
                  ✨ Instant Campus Access for Students
                </div>
              </div>

            </div>

            {/* ── RIGHT COLUMN: Admin Sign In ── */}
            <div className="flex flex-col justify-between p-4 sm:p-5 rounded-2xl bg-slate-950/60 border border-slate-700/80 shadow-lg relative overflow-hidden">
              
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-indigo-500/15 border border-indigo-500/40 text-indigo-300 text-[11px] font-bold">
                    <ShieldCheck size={13} className="text-indigo-400" />
                    <span>Administrator Sign In</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">Admin Portal</span>
                </div>

                <h3 className="text-sm sm:text-base font-black text-white tracking-tight mt-1 mb-0.5">
                  Admin Authentication
                </h3>
                <p className="text-[10px] sm:text-[11px] text-slate-400 font-medium mb-3">
                  Manage 3D layouts, circulars & settings
                </p>

                {/* Alerts */}
                {error && (
                  <div className="mb-2 p-2 bg-red-950/70 border border-red-800/80 rounded-xl text-red-200 text-xs font-semibold flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-400 shrink-0" />
                    <span className="truncate">{error}</span>
                  </div>
                )}

                {/* Auth Form */}
                <form onSubmit={handleSubmit} className="space-y-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-0.5">
                      Admin Username
                    </label>
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="block w-full px-3 py-2 bg-slate-900/90 border border-slate-700/80 rounded-xl text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 font-medium"
                      placeholder="Enter admin username"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-0.5">
                      Admin Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="block w-full px-3 py-2 pr-9 bg-slate-900/90 border border-slate-700/80 rounded-xl text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 font-medium"
                        placeholder="Enter admin password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors p-0.5 cursor-pointer"
                      >
                        {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full mt-2 py-2.5 px-4 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/30 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] disabled:opacity-50 touch-manipulation"
                  >
                    {loading ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <Lock size={14} />
                        <span>Sign In as Admin</span>
                      </div>
                    )}
                  </button>
                </form>
              </div>

              <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono text-slate-500">
                <span>Protected Admin Area</span>
                <span className="flex items-center gap-1 text-emerald-400">
                  <ShieldCheck size={11} /> 256-Bit SSL
                </span>
              </div>

            </div>

          </div>

        </section>

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* SECTION 3 (GUEST VISITS & VIP CARDS BLOCK: Rendered when enabled)   */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        {showGuestCards && guests.length > 0 && (
          <section className="w-full bg-slate-900/90 backdrop-blur-2xl rounded-[1.5rem] sm:rounded-[2rem] border border-pink-500/40 shadow-2xl shadow-pink-950/40 p-4 sm:p-6 relative overflow-hidden flex flex-col shrink-0 animate-fade-in-scale">
            
            {/* Header */}
            <div className="flex items-center justify-between mb-3 shrink-0 pb-2.5 border-b border-slate-800/80">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-2xl bg-gradient-to-tr from-pink-500 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-pink-500/30 shrink-0">
                  <HeartHandshake size={17} />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-white tracking-tight flex items-center gap-2">
                    <span>Distinguished Guest Access</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-pink-400 animate-ping" />
                  </h3>
                </div>
              </div>
            </div>

            {/* Guest Cards Single Horizontal Auto-Scrolling Row */}
            <div 
              ref={guestScrollRef}
              onMouseEnter={() => setIsHoveringGuests(true)}
              onMouseLeave={() => setIsHoveringGuests(false)}
              onTouchStart={() => setIsHoveringGuests(true)}
              onTouchEnd={() => setIsHoveringGuests(false)}
              className="flex flex-row items-stretch gap-3 sm:gap-4 overflow-x-auto pb-1.5 pt-0.5 custom-scrollbar snap-x snap-mandatory flex-nowrap scroll-smooth"
            >
              {guests.map((guest) => (
                <div
                  key={guest.id}
                  onClick={() => handleGuestCardClick(guest)}
                  className={`group relative p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-slate-850 via-slate-900 to-slate-950 hover:from-slate-800 hover:to-slate-900 border border-slate-700/80 hover:border-pink-500/60 transition-all duration-300 shadow-xl hover:shadow-pink-500/20 cursor-pointer flex items-center gap-3.5 sm:gap-4 active:scale-[0.98] snap-start shrink-0 ${
                    guests.length <= 2 ? 'flex-1 min-w-[260px]' : 'w-[280px] sm:w-[320px]'
                  }`}
                >
                  {/* High-Definition Guest Portrait Photo */}
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl p-1 bg-gradient-to-tr from-pink-500 via-purple-500 to-indigo-500 shadow-lg shadow-pink-500/25 shrink-0 group-hover:scale-105 group-hover:rotate-1 transition-all duration-300">
                    <div className="w-full h-full rounded-[14px] overflow-hidden bg-slate-950 flex items-center justify-center">
                      {guest.image_url ? (
                        <img 
                          src={guest.image_url} 
                          alt={guest.name} 
                          className="w-full h-full object-cover object-top brightness-105 contrast-105 select-none" 
                          style={{ imageRendering: 'auto' }}
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-tr from-indigo-900 to-slate-900 flex items-center justify-center text-white font-black text-xl">
                          {guest.name.charAt(0)}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Guest Information & Greeting Action */}
                  <div className="flex-1 flex flex-col justify-between min-w-0 h-full py-0.5">
                    <div>
                      <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-pink-500/15 border border-pink-500/30 text-pink-300 text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider mb-1">
                        <span>VIP Dignitary</span>
                      </div>
                      <h4 className="text-sm sm:text-base font-black text-white group-hover:text-pink-200 transition-colors truncate">
                        {guest.name}
                      </h4>
                      {guest.about && (
                        <p className="text-[11px] sm:text-xs text-indigo-200 font-semibold truncate mt-0.5">
                          {guest.about}
                        </p>
                      )}
                    </div>

                    {/* Bottom CTA Bar */}
                    <div className="mt-2 pt-1.5 border-t border-slate-800/80 flex items-center justify-end">
                      <div className="px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-xl bg-pink-600/30 group-hover:bg-pink-600 text-pink-200 group-hover:text-white text-[11px] sm:text-xs font-bold transition-all shadow-md group-hover:shadow-pink-600/30 flex items-center gap-1.5 shrink-0">
                        <span>{guestLoadingId === guest.id ? 'Entering...' : 'Tap to Enter'}</span>
                        <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* SECTION 3 (DOCKED CLOSE TO FOOTER) — Trust & Make in India Badge     */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <section className="w-full max-w-2xl lg:max-w-3xl z-10 mt-2 mb-1 shrink-0">
        <div className="bg-slate-900/85 backdrop-blur-xl px-4 py-1.5 sm:py-2 rounded-2xl border border-slate-700/60 shadow-lg flex items-center justify-between gap-3">
          
          {/* Make in India Lion Logo */}
          <div className="w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center shrink-0 bg-white/10 rounded-lg p-0.5">
            <img 
              src="/lion_logo.png" 
              alt="Make in India Lion" 
              className="w-full h-full object-contain brightness-125 contrast-125"
            />
          </div>

          {/* Text Information */}
          <div className="flex flex-col items-start min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-extrabold text-slate-200 tracking-tight">
                Proudly Built by <a href="https://techwego.in/" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 font-bold transition-colors">Techwego</a>
              </span>
              <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-amber-950/80 text-amber-300 border border-amber-800/60 uppercase">
                CHENNAI
              </span>
              <span className="text-red-400 text-xs">❤️</span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium tracking-tight truncate">
              Engineered with Passion for World-Class Education
            </p>
          </div>

          {/* India Map Tricolor Logo */}
          <div className="w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center shrink-0 bg-white/10 rounded-lg p-0.5">
            <img 
              src="/india_map.jpg" 
              alt="India Map Tricolor" 
              className="w-full h-full object-contain brightness-110"
            />
          </div>

        </div>
      </section>

      {/* ═══ MINIMAL GLOBAL FOOTER (PINNED AT BASE) ═══ */}
      <footer className="relative z-10 w-full text-center py-1 text-[10px] sm:text-[11px] text-slate-500 font-medium font-mono flex items-center justify-center gap-1.5 shrink-0">
        <span>POWERED BY</span>
        <a 
          href="https://techwego.in/" 
          target="_blank" 
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 font-extrabold hover:underline transition-colors"
        >
          <span>Techwego</span>
          <ExternalLink size={10} className="text-blue-400" />
        </a>
        <span className="text-slate-700">·</span>
        <span className="text-slate-500">ADVANCED AI & LIBRARY INTELLIGENCE SYSTEMS</span>
      </footer>

    </div>
  );
};

export default LoginPage;
