import React, { useState, useEffect } from 'react';
import { Trash2, Clock, ShieldOff, Shield, Plus, X } from 'lucide-react';
import api, { getUsers, deleteUser, register } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { useToast } from '../../components/Toast';

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ username: '', email: '', password: '', role: 'user' });
  const { user: currentUser } = useAuth();
  const { showToast } = useToast();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await getUsers();
      setUsers(res.data || []);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleBlock = async (user) => {
    if (user.id === currentUser?.id) return;
    
    try {
      if (user.is_active) {
        await api.put(`/admin/users/${user.id}/block`);
        showToast(`User ${user.username} blocked`, 'success');
      } else {
        await api.put(`/admin/users/${user.id}/unblock`);
        showToast(`User ${user.username} unblocked`, 'success');
      }
      fetchUsers();
    } catch (err) {
      console.error('Failed to toggle block status:', err);
      showToast('Failed to change user status', 'error');
    }
  };

  const handleDelete = async (user) => {
    if (user.id === currentUser?.id) return;

    if (window.confirm(`Are you sure you want to delete user ${user.username}?`)) {
      try {
        await deleteUser(user.id);
        showToast(`User ${user.username} deleted`, 'success');
        fetchUsers();
      } catch (err) {
        console.error('Failed to delete user:', err);
        showToast('Failed to delete user', 'error');
      }
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      await register(formData);
      showToast('User created successfully', 'success');
      setIsModalOpen(false);
      setFormData({ username: '', email: '', password: '', role: 'user' });
      fetchUsers();
    } catch (err) {
      console.error('Failed to create user:', err);
      showToast(err.response?.data?.detail || 'Failed to create user', 'error');
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white">Users</h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors shadow-lg shadow-blue-500/20"
        >
          <Plus size={20} /> Add User
        </button>
      </div>

      <div className="bg-gray-800/80 backdrop-blur border border-gray-700 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-900/50 border-b border-gray-700">
                <th className="p-4 text-sm font-semibold text-gray-300">Username</th>
                <th className="p-4 text-sm font-semibold text-gray-300">Email</th>
                <th className="p-4 text-sm font-semibold text-gray-300">Role</th>
                <th className="p-4 text-sm font-semibold text-gray-300">Status</th>
                <th className="p-4 text-sm font-semibold text-gray-300">Last Login</th>
                <th className="p-4 text-sm font-semibold text-gray-300 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/50">
              {loading ? (
                [1, 2, 3, 4, 5].map(n => (
                  <tr key={n} className="animate-pulse">
                    <td className="p-4"><div className="h-4 bg-gray-700 rounded w-32"></div></td>
                    <td className="p-4"><div className="h-4 bg-gray-700 rounded w-48"></div></td>
                    <td className="p-4"><div className="h-6 bg-gray-700 rounded-full w-20"></div></td>
                    <td className="p-4"><div className="h-6 bg-gray-700 rounded-full w-20"></div></td>
                    <td className="p-4"><div className="h-4 bg-gray-700 rounded w-24"></div></td>
                    <td className="p-4"><div className="h-8 bg-gray-700 rounded w-24 ml-auto"></div></td>
                  </tr>
                ))
              ) : (
                users.map(user => (
                  <tr key={user.id} className="hover:bg-gray-700/20 transition-colors">
                    <td className="p-4 text-white font-medium">{user.username}</td>
                    <td className="p-4 text-gray-300">{user.email || '-'}</td>
                    <td className="p-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        user.role === 'admin' 
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        user.is_active 
                          ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                          : 'bg-red-500/20 text-red-400 border border-red-500/30'
                      }`}>
                        {user.is_active ? 'Active' : 'Blocked'}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-gray-400">
                      <div className="flex items-center gap-1">
                        <Clock size={14} />
                        {user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}
                      </div>
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <button
                        onClick={() => handleToggleBlock(user)}
                        disabled={user.id === currentUser?.id}
                        className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                          user.id === currentUser?.id
                            ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                            : user.is_active
                              ? 'bg-amber-600 hover:bg-amber-700 text-white'
                              : 'bg-green-600 hover:bg-green-700 text-white'
                        }`}
                        title={user.is_active ? 'Block user' : 'Unblock user'}
                      >
                        {user.is_active ? <><ShieldOff size={14} /> Block</> : <><Shield size={14} /> Unblock</>}
                      </button>
                      
                      <button
                        onClick={() => handleDelete(user)}
                        disabled={user.id === currentUser?.id}
                        className={`inline-flex items-center justify-center p-2 rounded-lg transition-colors ${
                          user.id === currentUser?.id
                            ? 'text-gray-600 cursor-not-allowed'
                            : 'text-gray-400 hover:text-red-400 hover:bg-red-400/10'
                        }`}
                        title="Delete user"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white">Create New User</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Username</label>
                <input
                  type="text"
                  required
                  value={formData.username}
                  onChange={(e) => setFormData({...formData, username: e.target.value})}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Email (Optional)</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Password</label>
                <input
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Role</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({...formData, role: e.target.value})}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              
              <div className="flex justify-end gap-3 mt-8">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-gray-300 hover:bg-gray-800 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-lg"
                >
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
