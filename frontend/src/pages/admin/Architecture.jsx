import React, { useState, useEffect } from 'react';
import { Layers, Save, RefreshCw } from 'lucide-react';

const Architecture = () => {
  const [config, setConfig] = useState({
    floors: 2,
    rows_per_floor: 2,
    cols_per_row: 6,
    shelves_per_rack: 4
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/architecture', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setConfig(data);
      }
    } catch (error) {
      console.error('Failed to fetch architecture config:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      const response = await fetch('/api/admin/architecture', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}` 
        },
        body: JSON.stringify(config)
      });
      
      if (response.ok) {
        setMessage('Architecture configured successfully. The 3D Map will now auto-generate this layout!');
      } else {
        setMessage('Failed to save configuration.');
      }
    } catch (error) {
      setMessage('Error saving configuration.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-gray-500">Loading architecture...</div>;

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
          <Layers className="text-indigo-600" size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Library Architecture</h1>
          <p className="text-sm text-gray-500">Configure the physical layout. The 3D Map and AI will dynamically adapt to these settings.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 space-y-6">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Number of Floors</label>
              <input 
                type="number" 
                min="1" max="10"
                value={config.floors}
                onChange={e => setConfig({...config, floors: parseInt(e.target.value) || 1})}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <p className="text-xs text-gray-500">Total floors in the library building.</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Rows per Floor</label>
              <input 
                type="number" 
                min="1" max="10"
                value={config.rows_per_floor}
                onChange={e => setConfig({...config, rows_per_floor: parseInt(e.target.value) || 1})}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <p className="text-xs text-gray-500">Number of rack rows (e.g. 2 means Row A and Row B).</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Columns per Row</label>
              <input 
                type="number" 
                min="1" max="20"
                value={config.cols_per_row}
                onChange={e => setConfig({...config, cols_per_row: parseInt(e.target.value) || 1})}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <p className="text-xs text-gray-500">Number of racks in each row (e.g. 6 means A1 to A6).</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Shelves per Rack</label>
              <input 
                type="number" 
                min="1" max="8"
                value={config.shelves_per_rack}
                onChange={e => setConfig({...config, shelves_per_rack: parseInt(e.target.value) || 1})}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <p className="text-xs text-gray-500">Number of shelves inside each individual rack.</p>
            </div>
          </div>

          {message && (
            <div className={`p-4 rounded-lg text-sm ${message.includes('success') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
              {message}
            </div>
          )}

          <div className="pt-4 border-t border-gray-100 flex justify-end gap-3">
            <button 
              onClick={fetchConfig}
              className="px-4 py-2 text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-lg flex items-center gap-2 transition-colors font-medium text-sm"
            >
              <RefreshCw size={16} /> Reset
            </button>
            <button 
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center gap-2 transition-colors font-medium text-sm disabled:opacity-50"
            >
              <Save size={16} /> {saving ? 'Saving...' : 'Save & Generate Map'}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Architecture;
