import React from 'react';
import { useAuth } from '../../auth/AuthContext';
import { User } from 'lucide-react';

const Profile = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gray-950 p-8 flex justify-center items-start">
      <div className="glass-card rounded-2xl border border-gray-800 p-8 w-full max-w-md mt-10">
        <div className="flex flex-col items-center mb-8">
          <div className="w-24 h-24 rounded-full bg-blue-900 flex items-center justify-center mb-4">
            <User size={48} className="text-blue-400" />
          </div>
          <h2 className="text-2xl font-bold text-white">{user?.username || 'User Profile'}</h2>
          <span className="px-3 py-1 bg-gray-800 rounded-full text-xs text-gray-400 mt-2 uppercase tracking-wide">
            {user?.role || 'User'}
          </span>
        </div>

        <div className="space-y-4 border-t border-gray-800 pt-6">
          <h3 className="text-lg font-medium text-white mb-4">Change Password</h3>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Current Password</label>
            <input type="password" placeholder="••••••••" className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500" />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">New Password</label>
            <input type="password" placeholder="••••••••" className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500" />
          </div>
          <button className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors mt-2">
            Update Password
          </button>
        </div>
      </div>
    </div>
  );
};

export default Profile;
