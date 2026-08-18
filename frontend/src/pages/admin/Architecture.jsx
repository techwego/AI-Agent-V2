import React, { useState, useEffect } from 'react';
import { Layers, Save, RefreshCw, Plus, Trash2, MapPin } from 'lucide-react';
import LibraryWayfinder from '../../components/LibraryWayfinder';

const Architecture = () => {
  const [config, setConfig] = useState({
    floors: 2,
    rows_per_floor: 2,
    cols_per_row: 6,
    shelves_per_rack: 4,
    pois: []
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  // POI Form state
  const [poiType, setPoiType] = useState('entrance');
  const [poiFloor, setPoiFloor] = useState(1);
  const [poiAnchor, setPoiAnchor] = useState('A1');
  const [poiOffset, setPoiOffset] = useState('left');
  const [poiConnectsTo, setPoiConnectsTo] = useState(2);

  // We use this to force Wayfinder to re-render and re-fetch from API
  const [mapKey, setMapKey] = useState(0);

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
        if(!data.pois) data.pois = [];
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
        setMessage('Architecture configured successfully. Map is live.');
        setMapKey(prev => prev + 1); // trigger map reload
      } else {
        setMessage('Failed to save configuration.');
      }
    } catch (error) {
      setMessage('Error saving configuration.');
    } finally {
      setSaving(false);
    }
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

  if (loading) return <div className="p-8 text-gray-400">Loading Enterprise Layout...</div>;

  return (
    <div className="fixed inset-0 w-full h-full bg-[#05080f] overflow-hidden">
      
      {/* Background 3D Map */}
      <div className="absolute inset-0 z-0">
        <LibraryWayfinder key={mapKey} routeFrom={null} routeTo={null} />
      </div>

      {/* Floating Top Bar */}
      <div className="absolute top-4 left-4 right-4 z-10 flex items-start justify-between pointer-events-none">
        <div className="wayfinder-glass px-5 py-3 pointer-events-auto flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
            <Layers className="text-blue-400" size={18} />
          </div>
          <div>
            <div className="wayfinder-eyebrow mb-1">Enterprise Configuration</div>
            <h1 className="text-base font-bold text-white tracking-tight">Library Architecture</h1>
          </div>
        </div>

        <div className="wayfinder-glass px-3 py-2 pointer-events-auto flex items-center gap-3">
          {message && (
            <span className={`text-xs px-2 py-1 rounded-md font-medium ${message.includes('success') ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
              {message}
            </span>
          )}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/30 text-xs border border-white/5 shadow-inner mr-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div> Live Preview
          </div>
          <button onClick={fetchConfig} className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors border border-transparent hover:border-white/10" title="Discard Changes">
            <RefreshCw size={16} />
          </button>
          <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium text-xs flex items-center gap-2 shadow-lg">
            <Save size={14} /> Apply Map
          </button>
        </div>
      </div>

      {/* Floating Config Panel */}
      <div className="absolute left-4 top-24 bottom-4 w-[340px] flex flex-col gap-4 pointer-events-none z-10">
        
        <div className="wayfinder-glass p-5 space-y-4 pointer-events-auto overflow-y-auto custom-scrollbar flex-1">
          <div className="wayfinder-eyebrow border-b border-gray-700/50 pb-2 mb-4">Grid Setup</div>
          
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-400 flex justify-between">
              <span>Floors</span> <span className="text-blue-400">{config.floors}</span>
            </label>
            <input type="range" min="1" max="10" value={config.floors} onChange={e => setConfig({...config, floors: parseInt(e.target.value)})} className="w-full accent-blue-500 h-1" />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-400 flex justify-between">
              <span>Rows per Floor</span> <span className="text-blue-400">{config.rows_per_floor}</span>
            </label>
            <input type="range" min="1" max="10" value={config.rows_per_floor} onChange={e => setConfig({...config, rows_per_floor: parseInt(e.target.value)})} className="w-full accent-blue-500 h-1" />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-400 flex justify-between">
              <span>Columns per Row</span> <span className="text-blue-400">{config.cols_per_row}</span>
            </label>
            <input type="range" min="1" max="20" value={config.cols_per_row} onChange={e => setConfig({...config, cols_per_row: parseInt(e.target.value)})} className="w-full accent-blue-500 h-1" />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-400 flex justify-between">
              <span>Shelves per Rack</span> <span className="text-blue-400">{config.shelves_per_rack}</span>
            </label>
            <input type="range" min="1" max="8" value={config.shelves_per_rack} onChange={e => setConfig({...config, shelves_per_rack: parseInt(e.target.value)})} className="w-full accent-blue-500 h-1" />
          </div>

          <div className="wayfinder-eyebrow border-b border-gray-700/50 pb-2 mt-6 mb-4">Points of Interest</div>
          
          <div className="space-y-2 bg-[#0a0e1a]/50 p-3 rounded-xl border border-gray-700/50">
            <div className="flex gap-2">
              <select value={poiType} onChange={e => setPoiType(e.target.value)} className="bg-[#111a2e] border border-[#24314d] text-white text-xs rounded-lg flex-1 p-2 outline-none focus:border-blue-500 transition-colors">
                <option value="entrance">Entrance</option>
                <option value="stairs">Stairs</option>
              </select>
              <select value={poiFloor} onChange={e => setPoiFloor(e.target.value)} className="bg-[#111a2e] border border-[#24314d] text-white text-xs rounded-lg flex-1 p-2 outline-none focus:border-blue-500 transition-colors">
                {[...Array(config.floors)].map((_, i) => <option key={i} value={i+1}>Floor {i+1}</option>)}
              </select>
            </div>

            <div className="flex gap-2">
              <input type="text" placeholder="Anchor (e.g. A1)" value={poiAnchor} onChange={e => setPoiAnchor(e.target.value)} className="bg-[#111a2e] border border-[#24314d] text-white text-xs rounded-lg w-1/2 p-2 uppercase outline-none focus:border-blue-500 transition-colors" />
              <select value={poiOffset} onChange={e => setPoiOffset(e.target.value)} className="bg-[#111a2e] border border-[#24314d] text-white text-xs rounded-lg w-1/2 p-2 outline-none focus:border-blue-500 transition-colors">
                <option value="left">Left</option>
                <option value="right">Right</option>
                <option value="front">Front</option>
                <option value="back">Back</option>
              </select>
            </div>

            {poiType === 'stairs' && (
              <div className="flex gap-2 items-center px-1">
                <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Connects to:</span>
                <select value={poiConnectsTo} onChange={e => setPoiConnectsTo(e.target.value)} className="bg-[#111a2e] border border-[#24314d] text-white text-xs rounded-lg flex-1 p-1.5 outline-none focus:border-blue-500 transition-colors">
                  {[...Array(config.floors)].map((_, i) => <option key={i} value={i+1}>Floor {i+1}</option>)}
                </select>
              </div>
            )}

            <button onClick={handleAddPoi} className="w-full bg-[#24314d] hover:bg-blue-600 text-white rounded-lg py-2 mt-1 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors">
              <Plus size={14} /> Add Marker
            </button>
          </div>

          <div className="space-y-1.5 mt-4">
            {config.pois.map((poi, idx) => (
              <div key={idx} className="flex items-center justify-between bg-[#0a0e1a]/40 p-2.5 rounded-lg border border-[#24314d]/50 group hover:border-[#24314d] transition-colors">
                <div className="flex items-center gap-2.5">
                  <div className={`p-1.5 rounded-md ${poi.type === 'entrance' ? 'bg-red-500/10 text-red-400' : 'bg-orange-500/10 text-orange-400'}`}>
                    <MapPin size={14} />
                  </div>
                  <div>
                    <p className="text-gray-200 text-xs font-medium capitalize leading-none mb-1">{poi.type} <span className="text-gray-500">· Fl {poi.floor}</span></p>
                    <p className="text-gray-500 text-[10px] uppercase tracking-wider">{poi.offset} of {poi.anchorRack}</p>
                  </div>
                </div>
                <button onClick={() => handleRemovePoi(idx)} className="text-gray-600 hover:text-red-400 p-1 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            {config.pois.length === 0 && <p className="text-xs text-gray-600 italic text-center py-2">No markers placed.</p>}
          </div>
        </div>
      </div>

    </div>
  );
};

export default Architecture;
