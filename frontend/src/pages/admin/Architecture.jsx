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

  // We use this to force Wayfinder to re-render and re-fetch from API
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
      setMapKey(prev => prev + 1); // trigger map reload
    } catch (error) {
      console.error('Failed to save configuration:', error);
      if (error.response && error.response.status === 401) {
        setMessage('Session expired. Please log in again.');
      } else {
        setMessage(error.response?.data?.detail || 'Error saving configuration.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSaveFrom2D = async (newConfig) => {
    setConfig(newConfig);
    setShow2DEditor(false);
    await handleSave(newConfig);
  };

  const rackCount = config.custom_layout?.racks 
    ? Object.keys(config.custom_layout.racks).length 
    : (config.floors * config.rows_per_floor * config.cols_per_row);
    
  const poiCount = config.custom_layout?.pois 
    ? config.custom_layout.pois.length 
    : (config.pois?.length || config.floors + 1);

  if (loading) return <div className="p-8 text-gray-400">Loading Enterprise Layout...</div>;

  return (
    <div className="p-8 h-full flex flex-col gap-6 overflow-hidden relative">
      {/* FULLSCREEN 2D FLOOR PLAN EDITOR MODAL */}
      {show2DEditor && (
        <FloorPlanEditor2D
          initialConfig={config}
          onSave={handleSaveFrom2D}
          onClose={() => setShow2DEditor(false)}
        />
      )}

      {/* HEADER SECTION */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center border border-blue-500/30 shadow-lg shadow-blue-500/10">
            <Layers className="text-blue-400" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Library Architecture</h1>
            <p className="text-sm text-gray-400">Design custom 2D floor plans with live 3D wayfinding synchronization</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {message && (
            <span className={`text-xs font-semibold px-3 py-1.5 rounded-xl border flex items-center gap-1.5 ${message.includes('success') ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300' : 'bg-red-500/20 border-red-500/30 text-red-300'}`}>
              <CheckCircle2 size={14} /> {message}
            </span>
          )}

          {/* SINGLE CONSOLIDATED 2D VISUAL EDITOR BUTTON */}
          <button
            onClick={() => setShow2DEditor(true)}
            className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:via-indigo-500 hover:to-purple-500 shadow-[0_0_25px_rgba(79,70,229,0.45)] hover:shadow-[0_0_35px_rgba(79,70,229,0.7)] transition-all flex items-center gap-2 border border-indigo-400/40 active:scale-95"
          >
            <LayoutTemplate size={16} className="text-indigo-200" />
            <span>📐 Edit Floor Plan in 2D Mode</span>
          </button>

          <button 
            onClick={fetchConfig} 
            className="px-4 py-2 text-gray-400 bg-gray-900/50 hover:bg-gray-800 hover:text-white rounded-xl transition-colors text-xs font-medium border border-gray-700 flex items-center gap-2"
          >
            <RefreshCw size={14} /> Discard Changes
          </button>
          
          <button 
            onClick={() => handleSave()} 
            disabled={saving} 
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-all font-semibold text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/30 active:scale-95 disabled:opacity-50"
          >
            <Save size={15} /> {saving ? 'Saving...' : 'Save & Apply Map'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6 flex-1 min-h-0">
        
        {/* Left Column: Grid Parameters & Spatial Summary */}
        <div className="col-span-1 flex flex-col gap-6 overflow-y-auto pr-2 custom-scrollbar pb-10">
          
          {/* Spatial Architecture Summary Card */}
          <div className="glass rounded-2xl border border-white/10 p-6 space-y-4 shadow-xl">
            <div className="flex items-center gap-2 text-white font-bold text-base">
              <Box size={18} className="text-blue-400" />
              <h2>Spatial Layout Overview</h2>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/5 rounded-xl p-3.5 border border-white/5">
                <span className="text-xs text-gray-400 block mb-1">Total Floors</span>
                <span className="text-xl font-bold text-blue-400">{config.floors}</span>
              </div>
              <div className="bg-white/5 rounded-xl p-3.5 border border-white/5">
                <span className="text-xs text-gray-400 block mb-1">Configured Racks</span>
                <span className="text-xl font-bold text-emerald-400">{rackCount}</span>
              </div>
              <div className="bg-white/5 rounded-xl p-3.5 border border-white/5">
                <span className="text-xs text-gray-400 block mb-1">Wayfinding POIs</span>
                <span className="text-xl font-bold text-amber-400">{poiCount}</span>
              </div>
              <div className="bg-white/5 rounded-xl p-3.5 border border-white/5">
                <span className="text-xs text-gray-400 block mb-1">Custom Coordinates</span>
                <span className="text-sm font-bold text-purple-400 mt-1 block">
                  {config.custom_layout?.racks ? 'Active (2D)' : 'Standard Grid'}
                </span>
              </div>
            </div>

            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-blue-200/90 leading-relaxed">
              <Info size={16} className="text-blue-400 shrink-0 mt-0.5" />
              <span>
                To drag racks, entrances, or staircases to custom physical positions or rename racks, click <strong>"Edit Floor Plan in 2D Mode"</strong> above.
              </span>
            </div>
          </div>

          {/* Base Grid Configuration Card */}
          <div className="glass rounded-2xl border border-white/10 p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-white font-bold text-base">
                <Sliders size={18} className="text-indigo-400" />
                <h2>Base Grid Setup</h2>
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-400 flex justify-between">
                <span>Floors</span> <span className="text-blue-400 font-bold">{config.floors}</span>
              </label>
              <input 
                type="range" 
                min="1" 
                max="10" 
                value={config.floors} 
                onChange={e => setConfig({...config, floors: parseInt(e.target.value)})} 
                className="w-full accent-blue-500 cursor-pointer" 
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-400 flex justify-between">
                <span>Rows per Floor</span> <span className="text-blue-400 font-bold">{config.rows_per_floor}</span>
              </label>
              <input 
                type="range" 
                min="1" 
                max="10" 
                value={config.rows_per_floor} 
                onChange={e => setConfig({...config, rows_per_floor: parseInt(e.target.value)})} 
                className="w-full accent-blue-500 cursor-pointer" 
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-400 flex justify-between">
                <span>Columns per Row</span> <span className="text-blue-400 font-bold">{config.cols_per_row}</span>
              </label>
              <input 
                type="range" 
                min="1" 
                max="20" 
                value={config.cols_per_row} 
                onChange={e => setConfig({...config, cols_per_row: parseInt(e.target.value)})} 
                className="w-full accent-blue-500 cursor-pointer" 
              />
            </div>

            <button
              onClick={() => {
                const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
                let rackCodeIndex = 0;
                const colSpacing = 5.2;
                const rowSpacing = 9.4;
                const startX = -((config.cols_per_row - 1) * colSpacing) / 2;
                const startZ = config.rows_per_floor === 1 ? 0 : -((config.rows_per_floor - 1) * rowSpacing) / 2;
                
                const newRacks = {};
                const newPois = [];

                for (let f = 1; f <= config.floors; f++) {
                  for (let r = 0; r < config.rows_per_floor; r++) {
                    const rz = startZ + (r * rowSpacing);
                    const rowLetter = alphabet[rackCodeIndex % alphabet.length];
                    rackCodeIndex++;
                    for (let c = 0; c < config.cols_per_row; c++) {
                      const cx = startX + (c * colSpacing);
                      const code = rowLetter + (c + 1);
                      newRacks[code] = {
                        code,
                        name: `Rack ${code}`,
                        floor: f,
                        x: Math.round(cx * 10) / 10,
                        z: Math.round(rz * 10) / 10,
                        rotation: 0
                      };
                    }
                  }
                  newPois.push({
                    id: `stairs_f${f}`,
                    type: 'stairs',
                    floor: f,
                    name: `Stairs Floor ${f}`,
                    x: Math.round(((config.cols_per_row * colSpacing) / 2 + 3) * 10) / 10,
                    z: 0,
                    connectsToFloor: f < config.floors ? f + 1 : f - 1,
                    rotation: 0
                  });
                }
                newPois.push({
                  id: 'entrance_0',
                  type: 'entrance',
                  floor: 1,
                  name: 'Main Entrance',
                  x: 0,
                  z: Math.round((startZ - 5) * 10) / 10,
                  rotation: 0
                });

                const regenerated = {
                  ...config,
                  custom_layout: { racks: newRacks, pois: newPois }
                };
                setConfig(regenerated);
                handleSave(regenerated);
              }}
              className="w-full mt-2 py-2.5 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-500/30 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-95"
            >
              <RefreshCw size={13} /> Apply & Regenerate Grid ({config.rows_per_floor}x{config.cols_per_row})
            </button>
          </div>

        </div>

        {/* Right Column: Immersive Full-Height Live 3D Map Preview */}
        <div className="col-span-2 glass rounded-2xl border border-white/10 overflow-hidden relative shadow-2xl">
           <div className="absolute top-4 left-4 z-10 flex items-center gap-3">
             <div className="bg-gray-950/85 backdrop-blur-md border border-white/15 text-white text-xs px-3.5 py-2 rounded-xl font-semibold shadow-lg flex items-center gap-2">
               <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></div> Live 3D Architecture View
             </div>
           </div>
           
           <div className="h-full w-full bg-[#05080f]">
              <LibraryWayfinder key={mapKey} routeFrom={null} routeTo={null} overrideConfig={config} />
           </div>
        </div>

      </div>
    </div>
  );
};

export default Architecture;
