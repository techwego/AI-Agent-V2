import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, Building, MapPin } from 'lucide-react';
import { getDepartments, createDepartment, updateDepartment, deleteDepartment } from '../../api/client';

export default function Departments() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
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
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingDept) {
        await updateDepartment(editingDept.id, formData);
      } else {
        await createDepartment(formData);
      }
      setIsModalOpen(false);
      setEditingDept(null);
      setFormData({ name: '', hod: '', building: '', floor: '' });
      fetchDepartments();
    } catch (err) {
      console.error('Failed to save department:', err);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this department?')) {
      try {
        await deleteDepartment(id);
        fetchDepartments();
      } catch (err) {
        console.error('Failed to delete department:', err);
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
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white">Departments</h1>
        <button
          onClick={() => openModal()}
          className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <Plus size={20} /> Add Department
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((n) => (
            <div key={n} className="bg-gray-800/50 backdrop-blur border border-gray-700 rounded-xl p-6 animate-pulse">
              <div className="h-6 bg-gray-700 rounded w-2/3 mb-4"></div>
              <div className="h-4 bg-gray-700 rounded w-1/2 mb-2"></div>
              <div className="h-4 bg-gray-700 rounded w-1/3"></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {departments.map((dept) => (
            <div key={dept.id} className="bg-gray-800/80 backdrop-blur border border-gray-700 rounded-xl p-6 hover:border-purple-500/50 transition-colors">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-semibold text-white">{dept.name}</h3>
                <div className="flex gap-2">
                  <button onClick={() => openModal(dept)} className="p-1 text-gray-400 hover:text-purple-400 transition-colors">
                    <Edit2 size={18} />
                  </button>
                  <button onClick={() => handleDelete(dept.id)} className="p-1 text-gray-400 hover:text-red-400 transition-colors">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
              
              <div className="space-y-2 text-sm text-gray-300">
                <p><span className="text-gray-500">HOD:</span> {dept.hod}</p>
                <p className="flex items-center gap-2"><Building size={14} className="text-purple-400" /> {dept.building}</p>
                <p className="flex items-center gap-2"><MapPin size={14} className="text-purple-400" /> Floor {dept.floor}</p>
                <p className="text-xs text-gray-500 mt-4">Created: {new Date(dept.created_at).toLocaleDateString()}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white">{editingDept ? 'Edit Department' : 'Add Department'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">HOD</label>
                <input
                  type="text"
                  required
                  value={formData.hod}
                  onChange={(e) => setFormData({...formData, hod: e.target.value})}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Building</label>
                  <input
                    type="text"
                    required
                    value={formData.building}
                    onChange={(e) => setFormData({...formData, building: e.target.value})}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Floor</label>
                  <input
                    type="text"
                    required
                    value={formData.floor}
                    onChange={(e) => setFormData({...formData, floor: e.target.value})}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-gray-300 hover:bg-gray-800 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                >
                  {editingDept ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
