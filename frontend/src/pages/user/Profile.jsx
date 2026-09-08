import React from 'react';
import { useAuth } from '../../auth/AuthContext';
import { User, ArrowLeft, KeyRound, ShieldCheck, GraduationCap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AnimatedBackground from '../../components/AnimatedBackground';

const Profile = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-transparent text-slate-900 p-4 sm:p-8 flex flex-col items-center justify-start relative overflow-hidden font-sans selection:bg-blue-100 selection:text-blue-900">

      <div className="w-full max-w-md mb-4 flex items-center justify-between relative z-10">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white/90 backdrop-blur-md px-3.5 py-2 rounded-xl border border-slate-200 shadow-xs transition-all active:scale-95"
        >
          <ArrowLeft size={14} /> Back
        </button>
      </div>

      <div className="bg-white/90 backdrop-blur-2xl rounded-3xl border border-slate-200/80 p-6 sm:p-8 w-full max-w-md shadow-2xl shadow-blue-900/5 relative z-10 animate-page-enter">
        <div className="flex flex-col items-center mb-6">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 flex items-center justify-center mb-3 shadow-lg shadow-blue-500/10 ring-4 ring-blue-50/50 text-blue-600">
            <User size={36} />
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">{user?.username || 'User Profile'}</h2>
          <span className="px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-[10px] font-bold mt-1.5 uppercase tracking-wider font-mono">
            {user?.role || 'Student / User'}
          </span>
        </div>

        <div className="space-y-4 border-t border-slate-100 pt-6">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-2 font-mono">
            <KeyRound size={15} className="text-blue-600" />
            <span>Account Security</span>
          </h3>
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 font-mono">Current Password</label>
            <input 
              type="password" 
              placeholder="••••••••" 
              className="w-full bg-slate-50/80 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-semibold focus:bg-white focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none transition-all" 
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 font-mono">New Password</label>
            <input 
              type="password" 
              placeholder="••••••••" 
              className="w-full bg-slate-50/80 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-semibold focus:bg-white focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none transition-all" 
            />
          </div>
          <button className="w-full py-2.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 active:scale-[0.98] text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-600/25 transition-all mt-2 interactive-button">
            Update Password
          </button>
        </div>
      </div>
    </div>
  );
};

export default Profile;
