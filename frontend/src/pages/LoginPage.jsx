import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { login } from '../api/client';
import { Lock, User, ArrowRight, BookOpen, Sparkles, Shield, GraduationCap, CheckCircle2, Mic, Map, Zap } from 'lucide-react';

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
      setError(err.response?.data?.detail || 'Invalid username or password. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 flex flex-col justify-between relative overflow-hidden">
      
      {/* Crisp mesh background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-50 pointer-events-none" />
      
      {/* Gradient accent orbs */}
      <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-gradient-to-br from-blue-400/15 to-indigo-500/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-15%] left-[-8%] w-[400px] h-[400px] rounded-full bg-gradient-to-tr from-violet-400/10 to-purple-500/8 blur-3xl pointer-events-none" />

      {/* Top Navbar */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 flex items-center justify-center shadow-lg shadow-blue-600/25 text-white ring-2 ring-white">
            <GraduationCap size={22} />
          </div>
          <div>
            <h1 className="text-base font-extrabold text-slate-900 leading-tight tracking-tight">Anna University</h1>
            <p className="text-xs text-slate-500 font-semibold">Central Library · Campus Intelligence</p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-50 px-3.5 py-2 rounded-2xl border border-emerald-200/80 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>System Online · Groq RAG Active</span>
        </div>
      </header>

      {/* Main Login Card */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          
          {/* Card */}
          <div className="bg-white/90 backdrop-blur-xl rounded-3xl border border-slate-200/60 shadow-2xl shadow-slate-300/30 p-8 sm:p-10 transition-all">
            
            {/* Header */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100/80 text-blue-600 mb-5 shadow-lg shadow-blue-500/10 ring-4 ring-blue-50">
                <BookOpen size={28} />
              </div>
              <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Welcome to Library AI</h2>
              <p className="text-sm text-slate-500 mt-2 font-medium">Sign in to access 3D navigation & voice research assistant</p>
            </div>

            {/* Role Switcher — Gradient Active */}
            <div className="flex p-1 bg-slate-100/80 backdrop-blur-sm rounded-2xl mb-7 border border-slate-200/60 shadow-sm">
              <button
                type="button"
                onClick={() => setRole('user')}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 flex items-center justify-center gap-2 ${
                  role === 'user'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/25'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-white/60'
                }`}
              >
                <User size={16} />
                Student / User
              </button>
              <button
                type="button"
                onClick={() => setRole('admin')}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 flex items-center justify-center gap-2 ${
                  role === 'admin'
                    ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-600/25'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-white/60'
                }`}
              >
                <Shield size={16} />
                Admin Portal
              </button>
            </div>

            {/* Error Alert */}
            {error && (
              <div className="mb-6 p-4 bg-gradient-to-r from-red-50 to-rose-50 border border-red-200/80 text-red-700 text-sm rounded-2xl flex items-center gap-3 animate-[fadeIn_0.2s_ease-out] shadow-sm">
                <div className="w-2.5 h-2.5 bg-red-500 rounded-full shrink-0 ring-4 ring-red-500/10" />
                <span className="font-semibold text-xs sm:text-sm">{error}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Username
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors">
                    <User size={17} />
                  </div>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="block w-full pl-11 pr-4 py-3.5 bg-slate-50/80 border border-slate-200/80 rounded-2xl text-slate-900 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 focus:bg-white focus:shadow-lg focus:shadow-blue-500/5 transition-all duration-200 font-semibold"
                    placeholder="e.g. student or admin"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Password
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors">
                    <Lock size={17} />
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-11 pr-4 py-3.5 bg-slate-50/80 border border-slate-200/80 rounded-2xl text-slate-900 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 focus:bg-white focus:shadow-lg focus:shadow-blue-500/5 transition-all duration-200 font-semibold"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div className="pt-1">
                <button
                  type="submit"
                  disabled={loading}
                  className="group w-full py-4 px-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-700 hover:via-indigo-700 hover:to-violet-700 active:scale-[0.98] text-white font-bold text-sm rounded-2xl shadow-xl shadow-blue-600/30 hover:shadow-2xl hover:shadow-blue-700/30 transition-all duration-200 flex items-center justify-center gap-2.5 disabled:opacity-50 relative overflow-hidden"
                >
                  {/* Shimmer effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                  
                  {loading ? (
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Sign in to Dashboard</span>
                      <ArrowRight size={17} className="group-hover:translate-x-1 transition-transform duration-200" />
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Feature badges */}
            <div className="mt-7 pt-6 border-t border-slate-100/80 flex items-center justify-center gap-3 sm:gap-5 flex-wrap">
              <span className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
                <Mic size={12} className="text-blue-600" /> Speech-to-Speech
              </span>
              <span className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
                <Map size={12} className="text-indigo-600" /> 3D Wayfinder
              </span>
              <span className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
                <Zap size={12} className="text-amber-500" /> Groq AI
              </span>
            </div>

          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-5 text-center text-xs text-slate-400 font-medium">
        Powered by <strong className="font-bold text-slate-600 hover:text-blue-600 transition-colors">TechWeGo</strong> · Enterprise AI Solutions
      </footer>
    </div>
  );
};

export default LoginPage;
