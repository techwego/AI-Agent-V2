import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { login } from '../api/client';
import { 
  Lock, User, ArrowRight, BookOpen, Shield, GraduationCap, 
  BookMarked, MapPin, Search, KeyRound, Sparkles, ExternalLink
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
    { icon: BookMarked, label: 'Smart Book Finder', color: 'text-blue-600' },
    { icon: MapPin, label: 'Shelf Navigator', color: 'text-indigo-600' },
    { icon: Search, label: 'Instant Catalog Search', color: 'text-sky-600' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between relative overflow-x-hidden font-sans selection:bg-blue-100 selection:text-blue-900">
      
      {/* 3D Premium Enterprise Background */}
      <AnimatedBackground />

      {/* Glitter & Sparkle Floating Ambient Overlays */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        {/* Glitter Star 1 */}
        <div className="absolute top-[12%] left-[18%] animate-pulse duration-1000 text-amber-400 opacity-60">
          <Sparkles size={20} />
        </div>
        {/* Glitter Star 2 */}
        <div className="absolute top-[22%] right-[16%] animate-bounce duration-700 text-blue-400 opacity-70">
          <Sparkles size={16} />
        </div>
        {/* Glitter Star 3 */}
        <div className="absolute bottom-[28%] left-[12%] animate-pulse duration-1000 text-indigo-400 opacity-50">
          <Sparkles size={24} />
        </div>
        {/* Glitter Star 4 */}
        <div className="absolute bottom-[20%] right-[20%] animate-bounce duration-1000 text-amber-300 opacity-60">
          <Sparkles size={18} />
        </div>
        {/* Glitter Star 5 */}
        <div className="absolute top-[48%] left-[8%] animate-pulse duration-700 text-sky-400 opacity-50">
          <Sparkles size={14} />
        </div>
        {/* Glitter Star 6 */}
        <div className="absolute top-[42%] right-[10%] animate-pulse duration-1000 text-violet-400 opacity-60">
          <Sparkles size={22} />
        </div>
      </div>

      {/* Centered Top Header — University Name */}
      <header className="relative z-10 w-full py-4 sm:py-5">
        <div className="flex items-center justify-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 flex items-center justify-center shadow-lg shadow-blue-600/25 text-white ring-2 ring-white shrink-0">
            <GraduationCap size={22} />
          </div>
          <div className="text-center">
            <h1 className="text-base sm:text-lg font-extrabold text-slate-900 leading-tight tracking-tight flex items-center justify-center gap-2">
              <span>Anna University</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 font-semibold align-middle">
                CENTRAL LIBRARY
              </span>
            </h1>
            <p className="text-[11px] text-slate-500 font-medium">Digital Knowledge & Campus Intelligence Hub</p>
          </div>
        </div>
      </header>

      {/* Main Container — Perfectly Centered */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-2 sm:py-4 max-w-lg mx-auto w-full">
        
        {/* Welcome Title with Sparkle Accent */}
        <div className="text-center mb-4 sm:mb-5">
          <div className="inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-blue-50 via-indigo-50 to-white border border-blue-100 text-blue-600 mb-2.5 shadow-lg shadow-blue-500/10 ring-4 ring-blue-50/50 relative group">
            <BookOpen size={24} className="group-hover:scale-110 transition-transform" />
            <Sparkles size={13} className="absolute -top-1 -right-1 text-amber-500 animate-spin" />
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center justify-center gap-1.5">
            <span>Welcome to Library AI</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
            Sign in to access 3D navigation & voice research assistant
          </p>
        </div>

        {/* Enterprise Glassmorphic Login Card */}
        <div className="w-full bg-white/95 backdrop-blur-2xl rounded-3xl border border-slate-200/90 shadow-2xl shadow-blue-900/10 p-6 sm:p-8 transition-all relative overflow-hidden">
          
          {/* Decorative top accent line with glitter shimmer */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 via-indigo-500 to-violet-500 rounded-t-3xl" />

          {/* Role Switcher — Centered Tabs */}
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

          {/* Centered Username & Password Input Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex flex-col">
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5 font-mono text-center sm:text-left">
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

            <div className="flex flex-col">
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5 font-mono text-center sm:text-left">
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
              className="w-full mt-3 py-3 px-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg shadow-blue-600/25 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] disabled:opacity-50"
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

        {/* Feature Highlights */}
        <div className="w-full mt-4 px-1">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-2.5 w-full">
            {featurePills.map((f, i) => (
              <div 
                key={i} 
                className="flex sm:flex-col items-center justify-start sm:justify-center text-left sm:text-center px-3 sm:px-2 py-2 sm:py-3 bg-white/90 backdrop-blur-md rounded-2xl border border-slate-200/90 shadow-xs w-full min-h-[44px] sm:min-h-[76px] gap-2.5 sm:gap-1"
              >
                <f.icon size={17} className={`${f.color} sm:mb-1 shrink-0`} />
                <span className="text-xs sm:text-[11px] font-bold text-slate-800 leading-snug px-0.5">{f.label}</span>
              </div>
            ))}
          </div>
        </div>

      </main>

      {/* Footer — Powered by Techwego official link */}
      <footer className="relative z-10 w-full text-center py-3.5 text-[11px] text-slate-500 font-medium font-mono flex items-center justify-center gap-1.5">
        <span>POWERED BY</span>
        <a 
          href="https://techwego.com/" 
          target="_blank" 
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 font-extrabold hover:underline transition-colors"
        >
          <span>TECHWEGO</span>
          <ExternalLink size={10} className="text-blue-500" />
        </a>
        <span className="text-slate-300">·</span>
        <span className="text-slate-400">AI INNOVATION & LIBRARY INTELLIGENCE SYSTEMS</span>
      </footer>

    </div>
  );
};

export default LoginPage;
