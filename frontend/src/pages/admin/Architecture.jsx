import React, { useState, useEffect } from 'react';
import { Layers, Save, RefreshCw, Plus, Trash2, MapPin, Tag, LayoutTemplate, Sparkles, CheckCircle2 } from 'lucide-react';
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

  // POI Form state
  const [poiType, setPoiType] = useState('entrance');
  const [poiFloor, setPoiFloor] = useState(1);
  const [poiAnchor, setPoiAnchor] = useState('A1');
  const [poiOffset, setPoiOffset] = useState('left');
  const [poiConnectsTo, setPoiConnectsTo] = useState(2);

  // Custom Rack Form state
  const [customRackCode, setCustomRackCode] = useState('A1');
  const [customRackName, setCustomRackName] = useState('');
  const [editMode, setEditMode] = useState(false);

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
      if(!data.pois) data.pois = [];
      if(!data.custom_racks) data.custom_racks = {};
      if(!data.custom_layout) data.custom_layout = {};
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

  const handleAddPoi = () => {
    const newPoi = {
      type: poiType,
      floor: parseInt(poiFloor),
      anchorRack: poiAnchor,
      offset: poiOffset
    };
    if (poiType === 'stairs') {
       newPoi.connectsToFloor = parseInt(poiConnectsTo);
    }
    setConfig({ ...config, pois: [...config.pois, newPoi] });
  };

  const handleRemovePoi = (index) => {
    const newPois = [...config.pois];
    newPois.splice(index, 1);
    setConfig({ ...config, pois: newPois });
  };

  const handleAddCustomRack = () => {
    if (!customRackName.trim() || !customRackCode.trim()) return;
    setConfig({
      ...config,
      custom_racks: {
        ...config.custom_racks,
        [customRackCode.toUpperCase()]: customRackName.trim()
      }
    });
    setCustomRackName('');
  };

  const handleRemoveCustomRack = (code) => {
    const newCustomRacks = { ...config.custom_racks };
    delete newCustomRacks[code];
    setConfig({ ...config, custom_racks: newCustomRacks });
  };

  const handleMapRackClick = (code) => {
    if (!editMode) return;
    const currentName = config.custom_racks[code] || '';
    const newName = window.prompt(`Enter custom name for Rack ${code}:\n(Leave blank to reset to default)`, currentName);
    if (newName !== null) {
      if (newName.trim() === '') {
        handleRemoveCustomRack(code);
      } else {
        setConfig(prev => ({
          ...prev,
          custom_racks: {
            ...prev.custom_racks,
            [code]: newName.trim()
          }
        }));
      }
    }
  };

  const generatedRacks = [];
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let codeIndex = 0;
  for(let f=0; f<config.floors; f++) {
    for(let r=0; r<config.rows_per_floor; r++) {
      const rowLetter = alphabet[codeIndex % alphabet.length];
      codeIndex++;
      for(let c=0; c<config.cols_per_row; c++) {
        generatedRacks.push(rowLetter + (c+1));
      }
    }
  }

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
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
            <Layers className="text-blue-400" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Enterprise Architecture</h1>
            <p className="text-sm text-gray-400">Configure Library Floor Plans, Racks & Wayfinding POIs</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {message && (
            <span className={`text-sm px-3 py-1.5 rounded-xl border flex items-center gap-1.5 ${message.includes('success') ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300' : 'bg-red-500/20 border-red-500/30 text-red-300'}`}>
              <CheckCircle2 size={15} /> {message}
            </span>
          )}

          {/* OPEN 2D FULLSCREEN EDITOR BUTTON */}
          <button
            onClick={() => setShow2DEditor(true)}
            className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-[0_0_20px_rgba(59,130,246,0.4)] hover:shadow-[0_0_25px_rgba(59,130,246,0.6)] transition-all flex items-center gap-2 border border-blue-400/40 active:scale-95"
          >
            <LayoutTemplate size={16} /> 📐 Edit in 2D Fullscreen Mode
          </button>

          <button onClick={fetchConfig} className="px-4 py-2 text-gray-400 bg-gray-900/50 hover:bg-gray-800 hover:text-white rounded-xl transition-colors text-xs font-medium border border-gray-700 flex items-center gap-2">
            <RefreshCw size={14} /> Discard Changes
          </button>
          
          <button onClick={() => handleSave()} disabled={saving} className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-all font-semibold text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/30">
            <Save size={15} /> {saving ? 'Saving...' : 'Save & Apply 3D Map'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6 flex-1 min-h-0">
        
        {/* Left Col: Config */}
        <div className="col-span-1 flex flex-col gap-6 overflow-y-auto pr-2 custom-scrollbar pb-10">
          
          {/* Quick 2D Banner */}
          <div className="bg-gradient-to-br from-blue-900/40 via-indigo-900/20 to-purple-900/40 rounded-2xl border border-blue-500/30 p-5 space-y-2 shadow-lg">
            <div className="flex items-center gap-2 text-blue-300 font-bold text-sm">
              <Sparkles size={16} className="text-amber-400" />
              <span>Interactive 2D Floor Plan Editor</span>
            </div>
            <p className="text-xs text-gray-300 leading-relaxed">
              Drag & drop racks, entrances, and stairs on a visual 2D millimeter-accurate grid to customize your library floor plan.
            </p>
            <button
              onClick={() => setShow2DEditor(true)}
              className="w-full mt-2 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
            >
              <LayoutTemplate size={15} /> Open 2D Floor Plan Editor
            </button>
          </div>

          <div className="glass rounded-2xl border border-gray-800 p-6 space-y-4">
            <h2 className="text-lg font-semibold text-white mb-4">Base Grid Configuration</h2>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-400 flex justify-between">
                <span>Floors</span> <span className="text-blue-400">{config.floors}</span>
              </label>
              <input type="range" min="1" max="10" value={config.floors} onChange={e => setConfig({...config, floors: parseInt(e.target.value)})} className="w-full accent-blue-500" />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-400 flex justify-between">
                <span>Rows per Floor</span> <span className="text-blue-400">{config.rows_per_floor}</span>
              </label>
              <input type="range" min="1" max="10" value={config.rows_per_floor} onChange={e => setConfig({...config, rows_per_floor: parseInt(e.target.value)})} className="w-full accent-blue-500" />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-400 flex justify-between">
                <span>Columns per Row</span> <span className="text-blue-400">{config.cols_per_row}</span>
              </label>
              <input type="range" min="1" max="20" value={config.cols_per_row} onChange={e => setConfig({...config, cols_per_row: parseInt(e.target.value)})} className="w-full accent-blue-500" />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-400 flex justify-between">
                <span>Shelves per Rack</span> <span className="text-blue-400">{config.shelves_per_rack}</span>
              </label>
              <input type="range" min="1" max="8" value={config.shelves_per_rack} onChange={e => setConfig({...config, shelves_per_rack: parseInt(e.target.value)})} className="w-full accent-blue-500" />
            </div>
          </div>

          <div className="glass rounded-2xl border border-gray-800 p-6 space-y-4">
             <h2 className="text-lg font-semibold text-white mb-4">Rack Labels</h2>
             <p className="text-xs text-gray-400 mb-2">Assign custom names to racks (e.g. Science Fiction). This will be displayed on the map.</p>
             
             <div className="space-y-3 bg-gray-900/50 p-4 rounded-xl border border-gray-700">
                <div className="flex gap-2">
                  <select value={customRackCode} onChange={e => setCustomRackCode(e.target.value)} className="bg-gray-800 border border-gray-600 text-white text-sm rounded-lg flex-1 p-2">
                    {generatedRacks.map(rack => <option key={rack} value={rack}>Rack {rack}</option>)}
                  </select>
                </div>
                <div className="flex gap-2">
                  <input type="text" placeholder="Custom Name (e.g. Sci-Fi)" value={customRackName} onChange={e => setCustomRackName(e.target.value)} className="bg-gray-800 border border-gray-600 text-white text-sm rounded-lg flex-1 p-2" />
                </div>
                <button onClick={handleAddCustomRack} className="w-full bg-gray-800 hover:bg-gray-700 text-white border border-gray-600 rounded-lg py-2 text-sm flex items-center justify-center gap-2">
                  <Plus size={16} /> Assign Name
                </button>
             </div>

             <div className="space-y-2 mt-4">
                {Object.entries(config.custom_racks).map(([code, name]) => (
                  <div key={code} className="flex items-center justify-between bg-gray-900/50 p-3 rounded-lg border border-gray-800">
                    <div className="flex items-center gap-3">
                      <Tag size={16} className="text-blue-400" />
                      <div className="text-sm">
                        <p className="text-white font-medium">{name}</p>
                        <p className="text-gray-400 text-xs">Rack {code}</p>
                      </div>
                    </div>
                    <button onClick={() => handleRemoveCustomRack(code)} className="text-red-400 hover:text-red-300 p-1">
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
                {Object.keys(config.custom_racks).length === 0 && <p className="text-xs text-gray-500 italic text-center">No custom labels.</p>}
             </div>
          </div>

          <div className="glass rounded-2xl border border-gray-800 p-6 space-y-4">
             <h2 className="text-lg font-semibold text-white mb-4">Points of Interest</h2>
             
             <div className="space-y-3 bg-gray-900/50 p-4 rounded-xl border border-gray-700">
                <div className="flex gap-2">
                  <select value={poiType} onChange={e => setPoiType(e.target.value)} className="bg-gray-800 border border-gray-600 text-white text-sm rounded-lg flex-1 p-2">
                    <option value="entrance">Entrance</option>
                    <option value="stairs">Stairs</option>
                  </select>
                  <select value={poiFloor} onChange={e => setPoiFloor(e.target.value)} className="bg-gray-800 border border-gray-600 text-white text-sm rounded-lg flex-1 p-2">
                    {[...Array(config.floors)].map((_, i) => <option key={i} value={i+1}>Floor {i+1}</option>)}
                  </select>
                </div>

                <div className="flex gap-2">
                  <input type="text" placeholder="Anchor Rack (e.g. A1)" value={poiAnchor} onChange={e => setPoiAnchor(e.target.value)} className="bg-gray-800 border border-gray-600 text-white text-sm rounded-lg flex-1 p-2 uppercase" />
                  <select value={poiOffset} onChange={e => setPoiOffset(e.target.value)} className="bg-gray-800 border border-gray-600 text-white text-sm rounded-lg flex-1 p-2">
                    <option value="left">Left</option>
                    <option value="right">Right</option>
                    <option value="front">Front</option>
                    <option value="back">Back</option>
                  </select>
                </div>

                {poiType === 'stairs' && (
                  <div className="flex gap-2 items-center">
                    <span className="text-sm text-gray-400">Connects to:</span>
                    <select value={poiConnectsTo} onChange={e => setPoiConnectsTo(e.target.value)} className="bg-gray-800 border border-gray-600 text-white text-sm rounded-lg flex-1 p-2">
                      {[...Array(config.floors)].map((_, i) => <option key={i} value={i+1}>Floor {i+1}</option>)}
                    </select>
                  </div>
                )}

                <button onClick={handleAddPoi} className="w-full bg-gray-800 hover:bg-gray-700 text-white border border-gray-600 rounded-lg py-2 text-sm flex items-center justify-center gap-2">
                  <Plus size={16} /> Add POI
                </button>
             </div>

             <div className="space-y-2 mt-4">
                {config.pois.map((poi, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-gray-900/50 p-3 rounded-lg border border-gray-800">
                    <div className="flex items-center gap-3">
                      <MapPin size={16} className={poi.type === 'entrance' ? 'text-red-400' : 'text-orange-400'} />
                      <div className="text-sm">
                        <p className="text-white font-medium capitalize">{poi.type} (Floor {poi.floor})</p>
                        <p className="text-gray-400 text-xs">{poi.offset} of {poi.anchorRack}</p>
                      </div>
                    </div>
                    <button onClick={() => handleRemovePoi(idx)} className="text-red-400 hover:text-red-300 p-1">
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
                {config.pois.length === 0 && <p className="text-xs text-gray-500 italic text-center">No custom POIs added.</p>}
             </div>
          </div>
        </div>

        {/* Right Col: Live 3D Map Preview */}
        <div className="col-span-2 glass rounded-2xl border border-gray-800 overflow-hidden relative shadow-inner">
           <div className="absolute top-4 left-4 z-10 flex items-center gap-3">
             <div className="bg-gray-950/80 backdrop-blur border border-gray-800 text-white text-xs px-3 py-1.5 rounded-lg font-medium shadow-lg flex items-center gap-2">
               <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div> Live 3D Architecture Preview
             </div>
             <button 
                onClick={() => setShow2DEditor(true)}
                className="text-xs px-3 py-1.5 rounded-lg font-bold shadow-lg flex items-center gap-1.5 transition-all bg-blue-600/90 hover:bg-blue-500 text-white border border-blue-400/50 shadow-blue-500/20"
              >
                <LayoutTemplate size={13} /> 2D Visual Editor
             </button>
             <button 
                onClick={() => setEditMode(!editMode)}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium shadow-lg flex items-center gap-2 transition-colors border ${editMode ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-gray-950/80 backdrop-blur border-gray-800 text-gray-400 hover:text-white'}`}
              >
                {editMode ? 'Disable Click-to-Edit' : 'Enable 3D Click-to-Edit'}
             </button>
           </div>
           
           <div className="h-full w-full bg-[#05080f]">
              <LibraryWayfinder key={mapKey} routeFrom={null} routeTo={null} onRackClick={handleMapRackClick} overrideConfig={config} />
           </div>
        </div>

      </div>
    </div>
  );
};

export default Architecture;


