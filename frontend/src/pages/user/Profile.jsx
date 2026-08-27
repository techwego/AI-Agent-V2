import React from 'react';
import { useAuth } from '../../auth/AuthContext';
import { User, ArrowLeft, KeyRound, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Profile = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 p-6 sm:p-10 flex flex-col items-center justify-start">
      <div className="w-full max-w-md mb-4 flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm transition-all"
        >
          <ArrowLeft size={14} /> Back
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 p-8 w-full max-w-md shadow-sm">
        <div className="flex flex-col items-center mb-6">
          <div className="w-20 h-20 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center mb-3 shadow-inner text-blue-600">
            <User size={36} />
          </div>
          <h2 className="text-xl font-bold text-slate-900">{user?.username || 'User Profile'}</h2>
          <span className="px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-[10px] font-bold mt-1.5 uppercase tracking-wider">
            {user?.role || 'Student / User'}
          </span>
        </div>

        <div className="space-y-4 border-t border-slate-100 pt-6">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-2">
            <KeyRound size={15} className="text-blue-600" />
            <span>Account Security</span>
          </h3>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Current Password</label>
            <input type="password" placeholder="••••••••" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">New Password</label>
            <input type="password" placeholder="••••••••" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none" />
          </div>
          <button className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-semibold rounded-xl shadow-md shadow-blue-600/20 transition-all mt-2">
            Update Password
          </button>
        </div>
      </div>
    </div>
  );
};

export default Profile;
