import React, { useState, useEffect } from 'react';
import { Layers, Save, RefreshCw, LayoutTemplate, CheckCircle2, Sliders, Box, Info, Sparkles } from 'lucide-react';
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
      setMapKey(prev => prev + 1);
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
      setMessage('✅ Library architecture & 3D Map updated successfully!');
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

  // When sliders change, regenerate matrix layout so 3D map & 2D editor immediately reflect new rows/cols/floors
  const handleMatrixSliderChange = (field, value) => {
    const val = parseInt(value, 10);
    const updated = {
      ...config,
      [field]: val
    };

    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const racks = {};
    const pois = [];
    const colSpacing = 5.2;
    const rowSpacing = 9.4;
    let rackCodeIndex = 0;

    const startX = -((updated.cols_per_row - 1) * colSpacing) / 2;
    const startZ = updated.rows_per_floor === 1 ? 0 : -((updated.rows_per_floor - 1) * rowSpacing) / 2;

    for (let f = 1; f <= updated.floors; f++) {
      for (let r = 0; r < updated.rows_per_floor; r++) {
        const rz = startZ + (r * rowSpacing);
        const rowLetter = alphabet[rackCodeIndex % alphabet.length];
        rackCodeIndex++;

        for (let c = 0; c < updated.cols_per_row; c++) {
          const cx = startX + (c * colSpacing);
          const code = rowLetter + (c + 1);
          const customName = updated.custom_racks && updated.custom_racks[code] ? updated.custom_racks[code] : `Rack ${code}`;
          racks[code] = {
            code,
            name: customName,
            floor: f,
            x: Math.round(cx * 10) / 10,
            z: Math.round(rz * 10) / 10,
            rotation: 0
          };
        }
      }
    }

    pois.push({
      id: 'entrance_0',
      type: 'entrance',
      floor: 1,
      name: 'Main Entrance',
      x: 0,
      z: -((updated.rows_per_floor * rowSpacing) / 2) - 4,
      rotation: 0
    });

    if (updated.floors > 1) {
      for (let f = 1; f < updated.floors; f++) {
        pois.push({
          id: `stairs_${f}`,
          type: 'stairs',
          floor: f,
          name: `Stairs to Floor ${f + 1}`,
          x: ((updated.cols_per_row * colSpacing) / 2) + 3,
          z: 0,
          connectsToFloor: f + 1,
          rotation: 0
        });
      }
    }

    updated.custom_layout = { racks, pois };
    updated.pois = pois;
    setConfig(updated);
    setMapKey(prev => prev + 1);
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
      
      {/* Top Header Bar */}
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
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md shadow-blue-600/20 transition-all flex items-center gap-2 active:scale-95"
          >
            <LayoutTemplate size={15} />
            <span>2D Floor Plan Drag & Drop Editor</span>
          </button>

          <button 
            onClick={fetchConfig} 
            className="px-3.5 py-2.5 text-slate-700 bg-white hover:bg-slate-50 rounded-xl text-xs font-semibold border border-slate-200 shadow-sm transition-colors flex items-center gap-1.5"
          >
            <RefreshCw size={13} />
            <span>Reset</span>
          </button>
          
          <button 
            onClick={() => handleSave()} 
            disabled={saving} 
            className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
          >
            <Save size={14} />
            <span>{saving ? 'Saving...' : '💾 Save & Apply to 3D Map'}</span>
          </button>
        </div>
      </div>

      {message && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-2xl flex items-center gap-2 shadow-sm animate-[fadeIn_0.2s_ease-out]">
          <CheckCircle2 size={16} className="text-emerald-600" />
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
                  {config.custom_layout?.racks ? 'Custom Blueprint (Live)' : 'Standard Matrix'}
                </span>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-3.5 flex items-start gap-2.5 text-xs text-blue-800 leading-relaxed">
              <Info size={16} className="text-blue-600 shrink-0 mt-0.5" />
              <span>
                To drag racks, entrances, or stairs to match real library floor blueprints, open the <strong>"2D Floor Plan Drag & Drop Editor"</strong>.
              </span>
            </div>
          </div>

          {/* Grid Parameters Card with Live Slider Sync */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-xs uppercase tracking-wider">
                <Sliders size={16} className="text-indigo-600" />
                <span>Base Matrix Setup</span>
              </div>
              <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                Live 3D Sync
              </span>
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
                onChange={e => handleMatrixSliderChange('floors', e.target.value)} 
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
                onChange={e => handleMatrixSliderChange('rows_per_floor', e.target.value)} 
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
                onChange={e => handleMatrixSliderChange('cols_per_row', e.target.value)} 
                className="w-full accent-blue-600 cursor-pointer" 
              />
            </div>

            <button
              onClick={() => handleSave()}
              disabled={saving}
              className="w-full py-2.5 mt-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-600/20 transition-all flex items-center justify-center gap-2"
            >
              <Save size={14} />
              <span>{saving ? 'Saving Changes...' : 'Save Matrix to Database'}</span>
            </button>
          </div>

        </div>

        {/* Right 2 Columns: Live 3D Viewport Preview */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm flex flex-col min-h-[440px]">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <Sparkles size={14} className="text-blue-600" /> Live 3D Viewport Preview
            </span>
            <span className="text-[11px] font-semibold text-slate-400">Interactive Three.js Render</span>
          </div>
          <div className="flex-1 relative bg-slate-100">
            <LibraryWayfinder 
              key={mapKey} 
              overrideConfig={config}
              routeFrom="entrance" 
              routeTo={null} 
              activeFloor="both" 
            />
          </div>
        </div>

      </div>

      {/* 2D Floor Plan Modal Editor */}
      {show2DEditor && (
        <FloorPlanEditor2D
          isOpen={show2DEditor}
          initialConfig={config}
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
