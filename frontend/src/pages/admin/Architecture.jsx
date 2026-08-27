import React, { useState, useEffect } from 'react';
import { Layers, Save, RefreshCw, LayoutTemplate, CheckCircle2, Sliders, Box, Info } from 'lucide-react';
import LibraryWayfinder from '../../components/LibraryWayfinder';
import FloorPlanEditor2D from '../../components/admin/FloorPlanEditor2D';
import { getArchitecture, updateArchitecture } from '../../api/client';

const Architecture = () => {
  const [config, setConfig] = useState({
    floors: 2,
    rows_per_floor: 2,
    cols_per_row: 6,
    shelves_per_rack: 4,
    pois: [],
    custom_racks: {},
    custom_layout: {}
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [show2DEditor, setShow2DEditor] = useState(false);
  const [mapKey, setMapKey] = useState(0);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const response = await getArchitecture();
      const data = response.data;
      if (!data.pois) data.pois = [];
      if (!data.custom_racks) data.custom_racks = {};
      if (!data.custom_layout) data.custom_layout = {};
      setConfig(data);
    } catch (error) {
      console.error('Failed to fetch architecture config:', error);
      if (error.response && error.response.status === 401) {
        setMessage('Session expired. Please log in again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (overrideCfg = null) => {
    const cfgToSave = overrideCfg || config;
    setSaving(true);
    setMessage('');
    try {
      const response = await updateArchitecture(cfgToSave);
      const resData = response.data;
      setMessage('Architecture configured successfully. 3D Map updated.');
      if (resData.config) {
        setConfig(resData.config);
      }
      setMapKey(prev => prev + 1);
    } catch (error) {
      console.error('Failed to save architecture config:', error);
      setMessage(error.response?.data?.detail || 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const rackCount = config.custom_layout?.racks 
    ? Object.keys(config.custom_layout.racks).length 
    : (config.floors * config.rows_per_floor * config.cols_per_row);
    
  const poiCount = config.custom_layout?.pois 
    ? config.custom_layout.pois.length 
    : (config.pois ? config.pois.length : 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-6 h-6 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto h-full flex flex-col pb-10">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Layers className="text-blue-600" /> 3D Spatial Wayfinder Architect
          </h1>
          <p className="text-xs text-slate-500 mt-1">Configure physical coordinates, multi-tier floors, and shelf matrices for 3D navigation.</p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button 
            onClick={() => setShow2DEditor(true)}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md shadow-blue-600/20 transition-all flex items-center gap-1.5 active:scale-95"
          >
            <LayoutTemplate size={14} />
            <span>2D Floor Plan Drag & Drop Editor</span>
          </button>

          <button 
            onClick={fetchConfig} 
            className="px-3.5 py-2 text-slate-700 bg-white hover:bg-slate-50 rounded-xl text-xs font-semibold border border-slate-200 shadow-sm transition-colors flex items-center gap-1.5"
          >
            <RefreshCw size={13} />
            <span>Reset</span>
          </button>
          
          <button 
            onClick={() => handleSave()} 
            disabled={saving} 
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-emerald-600/20 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
          >
            <Save size={13} />
            <span>{saving ? 'Saving...' : 'Apply to 3D Map'}</span>
          </button>
        </div>
      </div>

      {message && (
        <div className="p-3 bg-blue-50 border border-blue-200 text-blue-800 text-xs font-semibold rounded-2xl flex items-center gap-2">
          <CheckCircle2 size={16} className="text-blue-600" />
          <span>{message}</span>
        </div>
      )}

      {/* Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
        
        {/* Left Column: Spatial Summary & Parameters */}
        <div className="space-y-6 overflow-y-auto pr-1">
          
          {/* Spatial Overview Card */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-sm">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-xs uppercase tracking-wider">
              <Box size={16} className="text-blue-600" />
              <span>Spatial Layout Overview</span>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-100">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-0.5">Total Floors</span>
                <span className="text-xl font-bold text-blue-600">{config.floors}</span>
              </div>
              <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-100">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-0.5">Active Racks</span>
                <span className="text-xl font-bold text-emerald-600">{rackCount}</span>
              </div>
              <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-100">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-0.5">Wayfinding POIs</span>
                <span className="text-xl font-bold text-amber-600">{poiCount}</span>
              </div>
              <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-100">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-0.5">Coordinate Mode</span>
                <span className="text-xs font-bold text-indigo-600 mt-1 block">
                  {config.custom_layout?.racks ? 'Custom 2D Drag' : 'Standard Matrix'}
                </span>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-3.5 flex items-start gap-2.5 text-xs text-blue-800 leading-relaxed">
              <Info size={16} className="text-blue-600 shrink-0 mt-0.5" />
              <span>
                To drag book racks, entrances, or stairs to match real library floor blueprints, open the <strong>"2D Floor Plan Drag & Drop Editor"</strong>.
              </span>
            </div>
          </div>

          {/* Grid Parameters Card */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-sm">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-xs uppercase tracking-wider mb-2">
              <Sliders size={16} className="text-indigo-600" />
              <span>Base Matrix Setup</span>
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-600 flex justify-between">
                <span>Floors</span> <span className="text-blue-600 font-bold">{config.floors}</span>
              </label>
              <input 
                type="range" 
                min="1" 
                max="5" 
                value={config.floors} 
                onChange={e => setConfig({...config, floors: parseInt(e.target.value)})} 
                className="w-full accent-blue-600 cursor-pointer" 
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-600 flex justify-between">
                <span>Rows per Floor</span> <span className="text-blue-600 font-bold">{config.rows_per_floor}</span>
              </label>
              <input 
                type="range" 
                min="1" 
                max="8" 
                value={config.rows_per_floor} 
                onChange={e => setConfig({...config, rows_per_floor: parseInt(e.target.value)})} 
                className="w-full accent-blue-600 cursor-pointer" 
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-600 flex justify-between">
                <span>Columns per Row</span> <span className="text-blue-600 font-bold">{config.cols_per_row}</span>
              </label>
              <input 
                type="range" 
                min="1" 
                max="12" 
                value={config.cols_per_row} 
                onChange={e => setConfig({...config, cols_per_row: parseInt(e.target.value)})} 
                className="w-full accent-blue-600 cursor-pointer" 
              />
            </div>
          </div>

        </div>

        {/* Right 2 Columns: Live 3D Viewport Preview */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm flex flex-col min-h-[400px]">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">Live 3D Viewport Preview</span>
            <span className="text-[11px] font-medium text-slate-400">Interactive Three.js Render</span>
          </div>
          <div className="flex-1 relative bg-slate-100">
            <LibraryWayfinder key={mapKey} routeFrom="entrance" routeTo={null} activeFloor="both" />
          </div>
        </div>

      </div>

      {/* 2D Floor Plan Modal Editor */}
      {show2DEditor && (
        <FloorPlanEditor2D
          isOpen={show2DEditor}
          config={config}
          onClose={() => setShow2DEditor(false)}
          onSave={async (newConfig) => {
            setConfig(newConfig);
            setShow2DEditor(false);
            await handleSave(newConfig);
          }}
        />
      )}

    </div>
  );
};

export default Architecture;
