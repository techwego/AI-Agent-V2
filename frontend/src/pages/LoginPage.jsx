import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { login } from '../api/client';
import { Lock, User, ArrowRight } from 'lucide-react';
import AnimatedBackground from '../components/AnimatedBackground';

const LoginPage = () => {
  const { isAuthenticated, isAdmin, loginUser } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState('user');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  if (isAuthenticated) {
    return <Navigate to={isAdmin ? "/admin/dashboard" : "/voice"} />;
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
        navigate('/voice');
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleMouseMove = (e) => {
    const { clientX, clientY } = e;
    const { innerWidth, innerHeight } = window;
    const x = (clientX / innerWidth - 0.5) * 20;
    const y = (clientY / innerHeight - 0.5) * -20;
    setMousePos({ x, y });
  };

  return (
    <div 
      className="min-h-screen bg-transparent flex items-center justify-center relative overflow-hidden"
      onMouseMove={handleMouseMove}
    >
      <AnimatedBackground />

      <div 
        className="glass-card w-full max-w-md p-8 rounded-2xl z-10 relative transition-transform duration-200 ease-out animate-[fadeIn_0.8s_ease-out]"
        style={{ transform: `perspective(1000px) rotateY(${mousePos.x}deg) rotateX(${mousePos.y}deg)` }}
      >
        <div className="text-center mb-8 animate-[slide-up-fade_0.6s_ease-out]">
          <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">
            Library <span className="text-gradient">AI</span>
          </h1>
          <p className="text-gray-400 text-sm">Welcome back! Please enter your details.</p>
        </div>

        <div className="flex bg-gray-900/60 p-1.5 rounded-xl mb-8 backdrop-blur-md border border-white/5">
          <button
            type="button"
            onClick={() => setRole('user')}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all duration-300 ${
              role === 'user' 
                ? 'bg-blue-600/80 text-white shadow-[0_0_15px_rgba(74,140,255,0.4)]' 
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            User
          </button>
          <button
            type="button"
            onClick={() => setRole('admin')}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all duration-300 ${
              role === 'admin' 
                ? 'bg-purple-600/80 text-white shadow-[0_0_15px_rgba(157,124,255,0.4)]' 
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            Admin
          </button>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm p-3 rounded-xl mb-6 flex items-center gap-2 animate-[slide-up-fade_0.3s_ease-out]">
            <span className="w-1.5 h-1.5 bg-red-400 rounded-full animate-pulse"></span>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="group">
            <label className="block text-sm font-medium text-gray-300 mb-2 transition-colors group-focus-within:text-blue-400">
              Username
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none transition-colors group-focus-within:text-blue-400">
                <User className="h-5 w-5 text-gray-500 group-focus-within:text-blue-400 transition-colors" />
              </div>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="block w-full pl-11 pr-4 py-3 border border-white/10 rounded-xl bg-gray-900/40 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 focus:bg-gray-900/60 transition-all backdrop-blur-sm shadow-inner"
                placeholder="Enter your username"
              />
            </div>
          </div>

          <div className="group">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-300 transition-colors group-focus-within:text-blue-400">
                Password
              </label>
              <a href="#" className="text-xs text-blue-400/80 hover:text-blue-300 transition-colors">Forgot password?</a>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-500 group-focus-within:text-blue-400 transition-colors" />
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full pl-11 pr-4 py-3 border border-white/10 rounded-xl bg-gray-900/40 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 focus:bg-gray-900/60 transition-all backdrop-blur-sm shadow-inner"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center items-center py-3.5 px-4 border border-transparent rounded-xl shadow-lg text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500/80 focus:ring-offset-gray-900 transition-all disabled:opacity-50 relative overflow-hidden group/btn"
          >
            {/* Shimmer effect overlay */}
            <div className="absolute inset-0 -translate-x-full group-hover/btn:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12"></div>
            
            {loading ? (
              <span className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
            ) : (
              <span className="flex items-center gap-2 relative z-10">
                Sign in <ArrowRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
              </span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
