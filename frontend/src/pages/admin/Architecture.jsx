import React, { useState, useEffect } from 'react';
import { Layers, Save, RefreshCw, Plus, Trash2, MapPin, Tag } from 'lucide-react';
import LibraryWayfinder from '../../components/LibraryWayfinder';

const Architecture = () => {
  const [config, setConfig] = useState({
    floors: 2,
    rows_per_floor: 2,
    cols_per_row: 6,
    shelves_per_rack: 4,
    pois: [],
    custom_racks: {}
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

  // Custom Rack Form state
  const [customRackCode, setCustomRackCode] = useState('A1');
  const [customRackName, setCustomRackName] = useState('');

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
        if(!data.custom_racks) data.custom_racks = {};
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
    <div className="p-8 h-full flex flex-col gap-6 overflow-hidden">
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
            <Layers className="text-blue-400" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Enterprise Architecture</h1>
            <p className="text-sm text-gray-400">Configure Grid & Points of Interest</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {message && (
            <span className={`text-sm px-3 py-1 rounded-full ${message.includes('success') ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
              {message}
            </span>
          )}
          <button onClick={fetchConfig} className="px-4 py-2 text-gray-400 bg-gray-900/50 hover:bg-gray-800 hover:text-white rounded-lg transition-colors text-sm border border-gray-700 flex items-center gap-2">
            <RefreshCw size={16} /> Discard Changes
          </button>
          <button onClick={handleSave} disabled={saving} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium text-sm flex items-center gap-2">
            <Save size={16} /> Save & Apply Map
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6 flex-1 min-h-0">
        
        {/* Left Col: Config */}
        <div className="col-span-1 flex flex-col gap-6 overflow-y-auto pr-2 custom-scrollbar pb-10">
          
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
           <div className="absolute top-4 left-4 z-10 bg-gray-950/80 backdrop-blur border border-gray-800 text-white text-xs px-3 py-1.5 rounded-lg font-medium shadow-lg flex items-center gap-2">
             <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div> Live Architecture Preview
           </div>
           
           <div className="h-full w-full bg-[#05080f]">
              <LibraryWayfinder key={mapKey} routeFrom={null} routeTo={null} onRackClick={handleMapRackClick} />
           </div>
        </div>

      </div>
    </div>
  );
};

export default Architecture;

