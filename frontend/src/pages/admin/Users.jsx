import React, { useState, useEffect } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { getUsers, createUser, blockUser, deleteUser } from '../../api/client';
import { useToast } from '../../components/Toast';
import { Users as UsersIcon, Plus, Shield, ShieldOff, Trash2, X, Clock, CheckCircle2, AlertCircle } from 'lucide-react';

export default function Users() {
  const { user: currentUser } = useAuth();
  const { showToast } = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ username: '', password: '', email: '', role: 'user' });

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
      showToast('Failed to fetch users', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      await createUser(formData);
      showToast('User created successfully', 'success');
      setIsModalOpen(false);
      setFormData({ username: '', password: '', email: '', role: 'user' });
      fetchUsers();
    } catch (err) {
      console.error('Failed to create user:', err);
      showToast(err.response?.data?.detail || 'Failed to create user', 'error');
    }
  };

  const handleToggleBlock = async (targetUser) => {
    try {
      const willBlock = targetUser.is_active;
      await blockUser(targetUser.id, willBlock);
      showToast(willBlock ? 'User blocked successfully' : 'User unblocked successfully', 'success');
      fetchUsers();
    } catch (err) {
      console.error('Failed to update user status:', err);
      showToast(err.response?.data?.detail || 'Failed to update user status', 'error');
    }
  };

  const handleDelete = async (targetUser) => {
    if (window.confirm(`Are you sure you want to permanently delete user "${targetUser.username}"?`)) {
      try {
        await deleteUser(targetUser.id);
        showToast('User deleted successfully', 'success');
        fetchUsers();
      } catch (err) {
        console.error('Failed to delete user:', err);
        showToast(err.response?.data?.detail || 'Failed to delete user', 'error');
      }
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 max-w-7xl mx-auto h-full flex flex-col pb-4">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <UsersIcon className="text-blue-600 shrink-0" size={22} /> 
            <span>User Directory</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">Manage student accounts, admin credentials, and access control.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3.5 py-2 rounded-xl shadow-md shadow-blue-600/20 transition-all active:scale-95 self-start sm:self-auto whitespace-nowrap"
        >
          <Plus size={15} /> <span>Add New User</span>
        </button>
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex-1 flex flex-col min-h-0">
        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10 text-slate-600">
              <tr>
                <th className="px-3 sm:px-5 py-3 font-bold uppercase tracking-wider">Username</th>
                <th className="px-3 sm:px-4 py-3 font-bold uppercase tracking-wider hidden md:table-cell">Email</th>
                <th className="px-3 sm:px-4 py-3 font-bold uppercase tracking-wider hidden sm:table-cell">Role</th>
                <th className="px-3 sm:px-4 py-3 font-bold uppercase tracking-wider">Status</th>
                <th className="px-3 sm:px-4 py-3 font-bold uppercase tracking-wider hidden lg:table-cell">Last Login</th>
                <th className="px-3 sm:px-4 py-3 font-bold uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {loading ? (
                [1, 2, 3, 4, 5].map(n => (
                  <tr key={n} className="animate-pulse">
                    <td className="px-3 sm:px-5 py-3.5"><div className="h-3.5 bg-slate-200 rounded w-24 sm:w-28" /></td>
                    <td className="px-3 sm:px-4 py-3.5 hidden md:table-cell"><div className="h-3.5 bg-slate-100 rounded w-32" /></td>
                    <td className="px-3 sm:px-4 py-3.5 hidden sm:table-cell"><div className="h-4 bg-slate-100 rounded-full w-14" /></td>
                    <td className="px-3 sm:px-4 py-3.5"><div className="h-4 bg-slate-100 rounded-full w-14" /></td>
                    <td className="px-3 sm:px-4 py-3.5 hidden lg:table-cell"><div className="h-3.5 bg-slate-100 rounded w-16" /></td>
                    <td className="px-3 sm:px-4 py-3.5 text-right"><div className="h-5 bg-slate-100 rounded w-16 ml-auto" /></td>
                  </tr>
                ))
              ) : (
                users.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-3 sm:px-5 py-3 text-slate-900 font-bold">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-[10px] shrink-0">
                          {u.username.slice(0, 2).toUpperCase()}
                        </div>
                        <span className="truncate max-w-[120px] sm:max-w-none">{u.username}</span>
                      </div>
                    </td>
                    <td className="px-3 sm:px-4 py-3 text-slate-600 hidden md:table-cell truncate max-w-[160px]">{u.email || '—'}</td>
                    <td className="px-3 sm:px-4 py-3 hidden sm:table-cell whitespace-nowrap">
                      <span className={`inline-flex px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md border ${
                        u.role === 'admin' 
                          ? 'bg-purple-50 text-purple-700 border-purple-200'
                          : 'bg-blue-50 text-blue-700 border-blue-200'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-3 sm:px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] sm:text-[11px] font-semibold rounded-full border ${
                        u.is_active 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                          : 'bg-red-50 text-red-700 border-red-200'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${u.is_active ? 'bg-emerald-500' : 'bg-red-500'}`} />
                        {u.is_active ? 'Active' : 'Blocked'}
                      </span>
                    </td>
                    <td className="px-3 sm:px-4 py-3 text-slate-500 hidden lg:table-cell whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-[11px]">
                        <Clock size={12} className="text-slate-400" />
                        {u.last_login ? new Date(u.last_login).toLocaleDateString() : 'Never'}
                      </div>
                    </td>
                    <td className="px-3 sm:px-4 py-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleToggleBlock(u)}
                          disabled={u.id === currentUser?.id}
                          className={`inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold rounded-lg transition-colors border ${
                            u.id === currentUser?.id
                              ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-50'
                              : u.is_active
                                ? 'bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200'
                                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                          }`}
                          title={u.is_active ? "Block account" : "Unblock account"}
                        >
                          {u.is_active ? <ShieldOff size={12} /> : <Shield size={12} />}
                          <span className="hidden sm:inline">{u.is_active ? 'Block' : 'Unblock'}</span>
                        </button>
                        
                        <button
                          onClick={() => handleDelete(u)}
                          disabled={u.id === currentUser?.id}
                          className={`p-1.5 rounded-lg transition-colors ${
                            u.id === currentUser?.id
                              ? 'text-slate-300 cursor-not-allowed opacity-50'
                              : 'text-slate-400 hover:text-red-600 hover:bg-red-50'
                          }`}
                          title="Delete User"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md p-5 sm:p-7 shadow-2xl animate-[fadeIn_0.2s_ease-out]">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-base sm:text-lg font-bold text-slate-900">Create New User</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-700 p-1">
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleCreateUser} className="space-y-3.5 text-xs font-medium">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Username *</label>
                <input
                  type="text"
                  required
                  value={formData.username}
                  onChange={(e) => setFormData({...formData, username: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none"
                  placeholder="e.g. john_doe"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Email Address</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none"
                  placeholder="student@annauniv.edu"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Password *</label>
                <input
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none"
                  placeholder="••••••••"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Role</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({...formData, role: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none font-semibold"
                >
                  <option value="user">Student / Faculty (User)</option>
                  <option value="admin">Administrator (Admin)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-md shadow-blue-600/20 transition-all"
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
