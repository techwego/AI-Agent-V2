import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, Building2, MapPin, RefreshCw } from 'lucide-react';
import { getDepartments, createDepartment, updateDepartment, deleteDepartment } from '../../api/client';
import { useToast } from '../../components/Toast';

export default function Departments() {
  const { showToast } = useToast();
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const [formData, setFormData] = useState({ name: '', hod: '', building: '', floor: '' });
  
  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    try {
      setLoading(true);
      const res = await getDepartments();
      setDepartments(res.data || []);
    } catch (err) {
      console.error('Failed to fetch departments:', err);
      showToast('Failed to fetch departments', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      if (editingDept) {
        await updateDepartment(editingDept.id, formData);
        showToast('Department updated successfully', 'success');
      } else {
        await createDepartment(formData);
        showToast('Department created successfully', 'success');
      }
      setIsModalOpen(false);
      setEditingDept(null);
      setFormData({ name: '', hod: '', building: '', floor: '' });
      fetchDepartments();
    } catch (err) {
      console.error('Failed to save department:', err);
      showToast(err.response?.data?.detail || 'Failed to save department', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this department?')) {
      try {
        await deleteDepartment(id);
        showToast('Department deleted', 'success');
        fetchDepartments();
      } catch (err) {
        console.error('Failed to delete department:', err);
        showToast('Failed to delete department', 'error');
      }
    }
  };

  const openModal = (dept = null) => {
    if (dept) {
      setEditingDept(dept);
      setFormData({ name: dept.name, hod: dept.hod, building: dept.building, floor: dept.floor });
    } else {
      setEditingDept(null);
      setFormData({ name: '', hod: '', building: '', floor: '' });
    }
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Building2 className="text-blue-600" /> Academic Departments
          </h1>
          <p className="text-xs text-slate-500 mt-1">Manage university department affiliations, HOD contacts, and building allocations.</p>
        </div>
        <button
          onClick={() => openModal()}
          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-md shadow-blue-600/20 transition-all active:scale-95"
        >
          <Plus size={15} /> Add Department
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((n) => (
            <div key={n} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm animate-pulse space-y-3">
              <div className="h-5 bg-slate-200 rounded w-2/3" />
              <div className="h-3.5 bg-slate-100 rounded w-1/2" />
              <div className="h-3.5 bg-slate-100 rounded w-1/3" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {departments.map((dept) => (
            <div key={dept.id} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm hover:shadow-md hover:border-blue-200 transition-all flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-base font-bold text-slate-900">{dept.name}</h3>
                  <div className="flex items-center gap-1">
                    <button onClick={() => openModal(dept)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                      <Edit2 size={14} />
                    </button>
                    <button onClick={() => handleDelete(dept.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                
                <div className="space-y-2 text-xs font-medium text-slate-600">
                  <p><span className="text-slate-400 font-semibold">Head of Dept:</span> <strong className="text-slate-800 font-semibold">{dept.hod}</strong></p>
                  <p className="flex items-center gap-1.5"><Building2 size={14} className="text-blue-500" /> {dept.building}</p>
                  <p className="flex items-center gap-1.5"><MapPin size={14} className="text-indigo-500" /> Floor {dept.floor}</p>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100 text-[10px] text-slate-400">
                Created: {new Date(dept.created_at || Date.now()).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md p-6 sm:p-8 shadow-2xl animate-[fadeIn_0.2s_ease-out]">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-slate-900">{editingDept ? 'Edit Department' : 'Add New Department'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4 text-xs font-medium">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Department Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none"
                  placeholder="e.g. Computer Science and Engineering"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Head of Department (HOD) *</label>
                <input
                  type="text"
                  required
                  value={formData.hod}
                  onChange={(e) => setFormData({...formData, hod: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none"
                  placeholder="Dr. S. Ramanathan"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Building Block</label>
                  <input
                    type="text"
                    required
                    value={formData.building}
                    onChange={(e) => setFormData({...formData, building: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none"
                    placeholder="Science Block"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Floor</label>
                  <input
                    type="text"
                    required
                    value={formData.floor}
                    onChange={(e) => setFormData({...formData, floor: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none"
                    placeholder="Floor 2"
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-md shadow-blue-600/20 transition-all"
                >
                  {saving ? 'Saving...' : (editingDept ? 'Update Department' : 'Create Department')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
