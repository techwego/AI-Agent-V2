import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  X, Save, RotateCw, Trash2, Plus, Move, ZoomIn, ZoomOut, Maximize2, 
  Grid, MapPin, Layers, DoorOpen, ArrowUpDown, Undo2, Check, AlertCircle, Sparkles, PlusCircle, CheckCircle2
} from 'lucide-react';

const SNAP_STEP = 1.0; // Snap to 1 meter increments
const RACK_WIDTH_M = 3.3;
const RACK_DEPTH_M = 1.1;

export default function FloorPlanEditor2D({ initialConfig, config: propConfig, onSave, onClose }) {
  // Deep clone initial config
  const [config, setConfig] = useState(() => {
    const src = initialConfig || propConfig || {};
    const cfg = JSON.parse(JSON.stringify(src));
    if (!cfg.floors || cfg.floors < 1) cfg.floors = 2;
    if (!cfg.rows_per_floor || cfg.rows_per_floor < 1) cfg.rows_per_floor = 2;
    if (!cfg.cols_per_row || cfg.cols_per_row < 1) cfg.cols_per_row = 6;
    if (!cfg.custom_racks) cfg.custom_racks = {};
    if (!cfg.pois) cfg.pois = [];

    // Initialize custom_layout if not present
    if (!cfg.custom_layout || !cfg.custom_layout.racks || Object.keys(cfg.custom_layout.racks).length === 0) {
      cfg.custom_layout = generateDefaultLayout(cfg);
    }
    return cfg;
  });

  const [activeFloor, setActiveFloor] = useState(1);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedType, setSelectedType] = useState(null); // 'rack' | 'poi'
  
  // Custom Add Dialog Modal state
  const [addModalType, setAddModalType] = useState(null); // 'rack' | 'entrance' | 'stairs' | null
  const [newRackCode, setNewRackCode] = useState('');
  const [newRackName, setNewRackName] = useState('');
  const [newPoiName, setNewPoiName] = useState('');
  const [newStairsDest, setNewStairsDest] = useState(2);
  const [spawnCoord, setSpawnCoord] = useState({ x: 0, z: 0 });

  // Sidebar live name change save state
  const [sidebarSaved, setSidebarSaved] = useState(false);
  const [tempRackName, setTempRackName] = useState('');
  const [tempRackCode, setTempRackCode] = useState('');

  // Pan & Zoom
  const [zoom, setZoom] = useState(18); // Pixels per meter (1m = 18px default)
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0 });

  // Dragging elements
  const [draggingId, setDraggingId] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, z: 0 });
  const [mousePos, setMousePos] = useState({ x: 0, z: 0 });
  
  const containerRef = useRef(null);

  // Center pan on mount
  useEffect(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setPan({ x: rect.width / 2, y: rect.height / 2 });
    }
  }, []);

  // When selected rack changes, initialize temp rack inputs
  useEffect(() => {
    setSidebarSaved(false);
    if (selectedType === 'rack' && selectedId && config.custom_layout?.racks?.[selectedId]) {
      const r = config.custom_layout.racks[selectedId];
      setTempRackName(r.name || config.custom_racks?.[selectedId] || `Rack ${r.code}`);
      setTempRackCode(r.code);
    } else if (selectedType === 'poi' && selectedId) {
      const p = (config.custom_layout?.pois || []).find(x => x.id === selectedId);
      if (p) {
        setTempRackName(p.name || p.type);
      }
    }
  }, [selectedId, selectedType, config.custom_layout]);

  // Helper to generate default layout from standard rows x cols
  function generateDefaultLayout(cfg) {
    const racks = {};
    const pois = [];
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let rackCodeIndex = 0;
    const colSpacing = 5.2;
    const rowSpacing = 9.4;

    const startX = -((cfg.cols_per_row - 1) * colSpacing) / 2;
    const startZ = cfg.rows_per_floor === 1 ? 0 : -((cfg.rows_per_floor - 1) * rowSpacing) / 2;

    for (let f = 1; f <= cfg.floors; f++) {
      for (let r = 0; r < cfg.rows_per_floor; r++) {
        const rz = startZ + (r * rowSpacing);
        const rowLetter = alphabet[rackCodeIndex % alphabet.length];
        rackCodeIndex++;

        for (let c = 0; c < cfg.cols_per_row; c++) {
          const cx = startX + (c * colSpacing);
          const code = rowLetter + (c + 1);
          const customName = cfg.custom_racks && cfg.custom_racks[code] ? cfg.custom_racks[code] : `Rack ${code}`;
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

    // Default entrance on floor 1
    pois.push({
      id: 'entrance_0',
      type: 'entrance',
      floor: 1,
      name: 'Main Entrance',
      x: 0,
      z: -((cfg.rows_per_floor * rowSpacing) / 2) - 4,
      rotation: 0
    });

    // Default stairs if multi-floor
    if (cfg.floors > 1) {
      for (let f = 1; f < cfg.floors; f++) {
        pois.push({
          id: `stairs_${f}`,
          type: 'stairs',
          floor: f,
          name: `Stairs to Floor ${f + 1}`,
          x: ((cfg.cols_per_row * colSpacing) / 2) + 3,
          z: 0,
          connectsToFloor: f + 1,
          rotation: 0
        });
      }
    }

    return { racks, pois };
  }

  // Coordinate Conversion Helpers
  const screenToWorld = useCallback((screenX, screenY) => {
    const x = (screenX - pan.x) / zoom;
    const z = (screenY - pan.y) / zoom;
    return {
      x: Math.round(x * 10) / 10,
      z: Math.round(z * 10) / 10
    };
  }, [pan, zoom]);

  const worldToScreen = useCallback((worldX, worldZ) => {
    return {
      x: (worldX * zoom) + pan.x,
      y: (worldZ * zoom) + pan.y
    };
  }, [pan, zoom]);

  const applySnap = useCallback((val) => {
    if (!snapToGrid) return Math.round(val * 10) / 10;
    return Math.round(val / SNAP_STEP) * SNAP_STEP;
  }, [snapToGrid]);

  // Pan and Zoom Wheel Handler
  const handleWheel = (e) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    const newZoom = Math.min(Math.max(zoom * zoomFactor, 8), 60);

    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      // Adjust pan to zoom into mouse point
      setPan(prev => ({
        x: mouseX - (mouseX - prev.x) * (newZoom / zoom),
        y: mouseY - (mouseY - prev.y) * (newZoom / zoom)
      }));
    }
    setZoom(newZoom);
  };

  // Pointer Down (Pan vs Select)
  const handlePointerDown = (e) => {
    if (e.target.id === 'canvas-bg' || e.target.tagName === 'svg') {
      setIsPanning(true);
      panStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
      setSelectedId(null);
    }
  };

  const handlePointerMove = (e) => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const coords = screenToWorld(e.clientX - rect.left, e.clientY - rect.top);
      setMousePos(coords);
    }

    if (isPanning) {
      setPan({
        x: e.clientX - panStartRef.current.x,
        y: e.clientY - panStartRef.current.y
      });
    } else if (draggingId) {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const mouseWorld = screenToWorld(e.clientX - rect.left, e.clientY - rect.top);
        const newX = applySnap(mouseWorld.x - dragOffset.x);
        const newZ = applySnap(mouseWorld.z - dragOffset.z);

        setConfig(prev => {
          const next = { ...prev };
          const layout = { ...next.custom_layout };
          
          if (selectedType === 'rack' && layout.racks && layout.racks[draggingId]) {
            layout.racks[draggingId] = {
              ...layout.racks[draggingId],
              x: newX,
              z: newZ
            };
          } else if (selectedType === 'poi' && layout.pois) {
            layout.pois = layout.pois.map(p => {
              if (p.id === draggingId) {
                return { ...p, x: newX, z: newZ };
              }
              return p;
            });
          }
          next.custom_layout = layout;
          return next;
        });
      }
    }
  };

  const handlePointerUp = () => {
    setIsPanning(false);
    setDraggingId(null);
  };

  // Start Dragging Item
  const startDragItem = (e, id, type, curX, curZ) => {
    e.stopPropagation();
    setSelectedId(id);
    setSelectedType(type);
    setDraggingId(id);

    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const mouseWorld = screenToWorld(e.clientX - rect.left, e.clientY - rect.top);
      setDragOffset({
        x: mouseWorld.x - curX,
        z: mouseWorld.z - curZ
      });
    }
  };

  // Add New Floor
  const handleAddNewFloor = () => {
    const newFloorNum = config.floors + 1;
    setConfig(prev => ({
      ...prev,
      floors: newFloorNum
    }));
    setActiveFloor(newFloorNum);
  };

  // Delete Floor
  const handleDeleteActiveFloor = () => {
    if (config.floors <= 1) return;
    if (window.confirm(`Are you sure you want to delete Floor ${activeFloor}? All racks and elements on this floor will be permanently removed.`)) {
      const floorToDelete = activeFloor;
      
      setConfig(prev => {
        const next = { ...prev };
        const layout = { ...next.custom_layout };
        
        // Remove racks on this floor and shift down floors above
        const nextRacks = {};
        Object.values(layout.racks || {}).forEach(r => {
          if (r.floor !== floorToDelete) {
            const adjustedFloor = r.floor > floorToDelete ? r.floor - 1 : r.floor;
            nextRacks[r.code] = { ...r, floor: adjustedFloor };
          }
        });

        // Remove POIs on this floor and shift down floors above
        const nextPois = (layout.pois || []).filter(p => p.floor !== floorToDelete).map(p => {
          const adjustedFloor = p.floor > floorToDelete ? p.floor - 1 : p.floor;
          return { ...p, floor: adjustedFloor };
        });

        next.floors = Math.max(1, next.floors - 1);
        next.custom_layout = {
          racks: nextRacks,
          pois: nextPois
        };
        return next;
      });

      setActiveFloor(Math.max(1, activeFloor - 1));
      setSelectedId(null);
    }
  };

  // Open Add Rack Dialog
  const openAddRackModal = (customCoord = null) => {
    // Generate next available letter code
    const existingCodes = Object.keys(config.custom_layout?.racks || {});
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let suggestedCode = 'A1';
    for (let char of alphabet) {
      for (let num = 1; num <= 20; num++) {
        const c = `${char}${num}`;
        if (!existingCodes.includes(c)) {
          suggestedCode = c;
          break;
        }
      }
      if (suggestedCode !== 'A1') break;
    }

    setNewRackCode(suggestedCode);
    setNewRackName(`Rack ${suggestedCode}`);
    setSpawnCoord(customCoord || { x: mousePos.x || 0, z: mousePos.z || 0 });
    setAddModalType('rack');
  };

  // Confirm Add Rack
  const handleConfirmAddRack = () => {
    const code = newRackCode.trim().toUpperCase();
    if (!code) return;

    const newRack = {
      code,
      name: newRackName.trim() || `Rack ${code}`,
      floor: activeFloor,
      x: applySnap(spawnCoord.x || 0),
      z: applySnap(spawnCoord.z || 0),
      rotation: 0
    };

    setConfig(prev => ({
      ...prev,
      custom_layout: {
        ...(prev.custom_layout || {}),
        racks: {
          ...(prev.custom_layout?.racks || {}),
          [code]: newRack
        }
      }
    }));
    setSelectedId(code);
    setSelectedType('rack');
    setAddModalType(null);
  };

  // Open Add Entrance Dialog
  const openAddEntranceModal = (customCoord = null) => {
    setNewPoiName(`Entrance Floor ${activeFloor}`);
    setSpawnCoord(customCoord || { x: mousePos.x || 0, z: mousePos.z || -6 });
    setAddModalType('entrance');
  };

  // Confirm Add Entrance
  const handleConfirmAddEntrance = () => {
    const name = newPoiName.trim() || `Entrance Floor ${activeFloor}`;
    const newPoi = {
      id: `entrance_${Date.now()}`,
      type: 'entrance',
      floor: activeFloor,
      name,
      x: applySnap(spawnCoord.x || 0),
      z: applySnap(spawnCoord.z || -6),
      rotation: 0
    };

    setConfig(prev => ({
      ...prev,
      custom_layout: {
        ...(prev.custom_layout || {}),
        pois: [...(prev.custom_layout?.pois || []), newPoi]
      }
    }));
    setSelectedId(newPoi.id);
    setSelectedType('poi');
    setAddModalType(null);
  };

  // Open Add Stairs Dialog
  const openAddStairsModal = (customCoord = null) => {
    setNewPoiName(`Staircase Floor ${activeFloor}`);
    setNewStairsDest(activeFloor < config.floors ? activeFloor + 1 : Math.max(1, activeFloor - 1));
    setSpawnCoord(customCoord || { x: mousePos.x || 8, z: mousePos.z || 0 });
    setAddModalType('stairs');
  };

  // Confirm Add Stairs
  const handleConfirmAddStairs = () => {
    const name = newPoiName.trim() || `Staircase Floor ${activeFloor}`;
    const newPoi = {
      id: `stairs_${Date.now()}`,
      type: 'stairs',
      floor: activeFloor,
      name,
      x: applySnap(spawnCoord.x || 8),
      z: applySnap(spawnCoord.z || 0),
      connectsToFloor: parseInt(newStairsDest, 10),
      rotation: 0
    };

    setConfig(prev => ({
      ...prev,
      custom_layout: {
        ...(prev.custom_layout || {}),
        pois: [...(prev.custom_layout?.pois || []), newPoi]
      }
    }));
    setSelectedId(newPoi.id);
    setSelectedType('poi');
    setAddModalType(null);
  };

  // Save Rack Name and Code from Sidebar
  const handleSaveSidebarProperties = () => {
    if (selectedType === 'rack' && selectedId) {
      const cleanCode = tempRackCode.trim().toUpperCase() || selectedId;
      const cleanName = tempRackName.trim() || `Rack ${cleanCode}`;

      setConfig(prev => {
        const next = { ...prev };
        const nextRacks = { ...next.custom_layout.racks };
        const item = nextRacks[selectedId] || { floor: activeFloor, x: 0, z: 0, rotation: 0 };
        
        if (cleanCode !== selectedId) {
          delete nextRacks[selectedId];
        }
        
        nextRacks[cleanCode] = {
          ...item,
          code: cleanCode,
          name: cleanName
        };

        const nextCustomRacks = { ...(next.custom_racks || {}) };
        if (cleanCode !== selectedId) {
          delete nextCustomRacks[selectedId];
        }
        nextCustomRacks[cleanCode] = cleanName;

        next.custom_layout = {
          ...next.custom_layout,
          racks: nextRacks
        };
        next.custom_racks = nextCustomRacks;
        return next;
      });

      setSelectedId(cleanCode);
      setSidebarSaved(true);
      setTimeout(() => setSidebarSaved(false), 2500);
    } else if (selectedType === 'poi' && selectedId) {
      const cleanName = tempRackName.trim() || 'POI';
      setConfig(prev => ({
        ...prev,
        custom_layout: {
          ...prev.custom_layout,
          pois: (prev.custom_layout.pois || []).map(p => p.id === selectedId ? { ...p, name: cleanName } : p)
        }
      }));
      setSidebarSaved(true);
      setTimeout(() => setSidebarSaved(false), 2500);
    }
  };

  // Rotate selected item
  const handleRotate = (id, type) => {
    setConfig(prev => {
      const next = { ...prev };
      const layout = { ...next.custom_layout };
      if (type === 'rack' && layout.racks[id]) {
        const curRot = layout.racks[id].rotation || 0;
        layout.racks[id] = { ...layout.racks[id], rotation: (curRot + 90) % 360 };
      } else if (type === 'poi') {
        layout.pois = layout.pois.map(p => {
          if (p.id === id) {
            return { ...p, rotation: ((p.rotation || 0) + 90) % 360 };
          }
          return p;
        });
      }
      next.custom_layout = layout;
      return next;
    });
  };

  // Delete selected item
  const handleDelete = (id, type) => {
    setConfig(prev => {
      const next = { ...prev };
      const layout = { ...next.custom_layout };
      if (type === 'rack') {
        const nextRacks = { ...layout.racks };
        delete nextRacks[id];
        layout.racks = nextRacks;
        if (next.custom_racks) {
          const nextCustom = { ...next.custom_racks };
          delete nextCustom[id];
          next.custom_racks = nextCustom;
        }
      } else if (type === 'poi') {
        layout.pois = (layout.pois || []).filter(p => p.id !== id);
      }
      next.custom_layout = layout;
      return next;
    });
    setSelectedId(null);
  };

  // Auto-arrange to default grid
  const handleAutoArrange = () => {
    if (window.confirm('Reset this layout to a clean mathematical grid arrangement?')) {
      const defLayout = generateDefaultLayout(config);
      setConfig(prev => ({
        ...prev,
        custom_layout: defLayout
      }));
      setSelectedId(null);
    }
  };

  // Save changes and return
  const handleSaveAndReturn = () => {
    const custom_racks = { ...(config.custom_racks || {}) };
    Object.values(config.custom_layout?.racks || {}).forEach(r => {
      if (r.name) {
        custom_racks[r.code] = r.name;
      }
    });

    const pois = (config.custom_layout?.pois || []).map(p => ({ ...p }));

    const finalConfig = {
      ...config,
      custom_racks,
      pois
    };

    onSave(finalConfig);
  };

  // Filter items for current floor
  const floorRacks = Object.values(config.custom_layout?.racks || {}).filter(r => r.floor === activeFloor);
  const floorPois = (config.custom_layout?.pois || []).filter(p => p.floor === activeFloor);
  const selectedItem = selectedType === 'rack' 
    ? config.custom_layout?.racks?.[selectedId] 
    : (config.custom_layout?.pois || []).find(p => p.id === selectedId);

  // Dynamic Slab bounds calculation
  const rackXs = floorRacks.map(r => Math.abs(r.x));
  const rackZs = floorRacks.map(r => Math.abs(r.z));
  const maxX = rackXs.length > 0 ? Math.max(...rackXs) : (config.cols_per_row * 5.2) / 2;
  const maxZ = rackZs.length > 0 ? Math.max(...rackZs) : (config.rows_per_floor * 9.4) / 2;
  const slabWidth = Math.max(22, (maxX * 2) + 10);
  const slabDepth = Math.max(18, (maxZ * 2) + 10);

  const slabTopLeft = worldToScreen(-slabWidth / 2, -slabDepth / 2);
  const slabBottomRight = worldToScreen(slabWidth / 2, slabDepth / 2);

  return (
    <div className="fixed inset-0 z-50 bg-slate-100 text-slate-900 flex flex-col select-none overflow-hidden font-sans">
      
      {/* ADD ELEMENT MODAL DIALOG */}
      {addModalType && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4 animate-[fadeIn_0.15s_ease-out]">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                {addModalType === 'rack' && <><Plus className="text-blue-600" size={16} /> Add Custom Rack (Floor {activeFloor})</>}
                {addModalType === 'entrance' && <><DoorOpen className="text-emerald-600" size={16} /> Add Entrance (Floor {activeFloor})</>}
                {addModalType === 'stairs' && <><ArrowUpDown className="text-amber-600" size={16} /> Add Staircase (Floor {activeFloor})</>}
              </h3>
              <button onClick={() => setAddModalType(null)} className="text-slate-400 hover:text-slate-700 p-1 rounded-lg">
                <X size={16} />
              </button>
            </div>

            {addModalType === 'rack' && (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Rack Code (e.g. A1, B4, C6, Z1)</label>
                  <input
                    type="text"
                    value={newRackCode}
                    onChange={(e) => setNewRackCode(e.target.value.toUpperCase())}
                    placeholder="e.g. A1"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-mono uppercase focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Rack Name / Shelf Category</label>
                  <input
                    type="text"
                    value={newRackName}
                    onChange={(e) => setNewRackName(e.target.value)}
                    placeholder="e.g. Computer Architecture"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>
            )}

            {addModalType === 'entrance' && (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Entrance Name</label>
                  <input
                    type="text"
                    value={newPoiName}
                    onChange={(e) => setNewPoiName(e.target.value)}
                    placeholder="e.g. Main Entrance, North Door"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  />
                </div>
              </div>
            )}

            {addModalType === 'stairs' && (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Staircase Name</label>
                  <input
                    type="text"
                    value={newPoiName}
                    onChange={(e) => setNewPoiName(e.target.value)}
                    placeholder="e.g. Central Staircase"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-100"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Connects to Floor Level</label>
                  <select
                    value={newStairsDest}
                    onChange={(e) => setNewStairsDest(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-semibold focus:bg-white focus:outline-none focus:border-amber-600"
                  >
                    {[...Array(config.floors)].map((_, i) => (
                      <option key={i} value={i + 1}>Floor {i + 1}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setAddModalType(null)}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (addModalType === 'rack') handleConfirmAddRack();
                  else if (addModalType === 'entrance') handleConfirmAddEntrance();
                  else if (addModalType === 'stairs') handleConfirmAddStairs();
                }}
                className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-600/20"
              >
                Add to Blueprint
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* TOP HEADER BAR */}
      <div className="h-16 px-6 bg-white border-b border-slate-200 flex items-center justify-between z-20 shrink-0 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-700">
            <Layers size={16} className="text-blue-600" />
            <span className="text-xs font-bold tracking-wide">2D Floor Plan Blueprint Editor</span>
          </div>

          {/* Floor Switcher Tabs & Floor Management */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 gap-1">
            {[...Array(config.floors)].map((_, i) => (
              <button
                key={i}
                onClick={() => { setActiveFloor(i + 1); setSelectedId(null); }}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  activeFloor === i + 1 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Floor {i + 1}
              </button>
            ))}

            <button
              onClick={handleAddNewFloor}
              className="px-2.5 py-1 rounded-lg text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 flex items-center gap-1 transition-all"
              title="Add New Empty Floor Level"
            >
              <PlusCircle size={13} /> Add Floor
            </button>

            {config.floors > 1 && (
              <button
                onClick={handleDeleteActiveFloor}
                className="px-2 py-1 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50 transition-all"
                title={`Delete Floor ${activeFloor}`}
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>

          {/* Quick Add Actions */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => openAddRackModal()}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 flex items-center gap-1 transition-all"
            >
              <Plus size={13} /> + Rack
            </button>

            <button
              onClick={() => openAddEntranceModal()}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 flex items-center gap-1 transition-all"
            >
              <DoorOpen size={13} /> + Entrance
            </button>

            <button
              onClick={() => openAddStairsModal()}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 flex items-center gap-1 transition-all"
            >
              <ArrowUpDown size={13} /> + Stairs
            </button>
          </div>

          <span className="text-[11px] text-slate-500 font-medium bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
            {floorRacks.length} Racks · {floorPois.length} POIs
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setSnapToGrid(!snapToGrid)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all ${
              snapToGrid 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700 shadow-sm' 
                : 'bg-white border-slate-200 text-slate-500 hover:text-slate-800'
            }`}
          >
            <Grid size={13} /> Snap (1m)
          </button>

          <button
            onClick={handleAutoArrange}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 flex items-center gap-1.5 shadow-sm transition-all"
            title="Auto-Arrange Racks in Clean Grid"
          >
            <Sparkles size={13} className="text-amber-500" /> Auto-Grid
          </button>

          <div className="h-5 w-px bg-slate-200 mx-1" />

          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 transition-all flex items-center gap-1"
          >
            <X size={13} /> Discard
          </button>

          <button
            onClick={handleSaveAndReturn}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-600/20 transition-all flex items-center gap-1.5 active:scale-95"
          >
            <Save size={14} /> Save & Return to 3D
          </button>
        </div>
      </div>

      {/* WORKSPACE AREA */}
      <div className="flex-1 relative flex overflow-hidden">
        
        {/* LEFT TOOLBAR PALETTE */}
        <div className="absolute top-4 left-4 z-20 flex flex-col gap-2 bg-white/95 backdrop-blur-md p-3 rounded-2xl border border-slate-200 shadow-lg w-44">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">Floor {activeFloor} Palette</span>
          
          <button
            onClick={() => openAddRackModal()}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition-all shadow-sm active:scale-95"
          >
            <Plus size={14} /> + Add Rack
          </button>

          <button
            onClick={() => openAddEntranceModal()}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-all shadow-sm active:scale-95"
          >
            <DoorOpen size={14} /> + Entrance
          </button>

          <button
            onClick={() => openAddStairsModal()}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 transition-all shadow-sm active:scale-95"
          >
            <ArrowUpDown size={14} /> + Stairs
          </button>

          <div className="h-px bg-slate-100 my-1" />

          {/* Zoom controls */}
          <div className="flex items-center justify-between px-1">
            <button onClick={() => setZoom(z => Math.max(8, z * 0.85))} className="p-1 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800" title="Zoom Out">
              <ZoomOut size={15} />
            </button>
            <span className="text-[10px] font-mono text-slate-500 font-semibold">{Math.round(zoom)}px/m</span>
            <button onClick={() => setZoom(z => Math.min(60, z * 1.15))} className="p-1 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800" title="Zoom In">
              <ZoomIn size={15} />
            </button>
          </div>
        </div>

        {/* BOTTOM LEFT COORDINATES HUD */}
        <div className="absolute bottom-4 left-4 z-20 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-200 text-[11px] font-mono text-slate-600 shadow-sm pointer-events-none flex items-center gap-3">
          <span>X: <strong className="text-blue-600">{mousePos.x}m</strong></span>
          <span>Z: <strong className="text-indigo-600">{mousePos.z}m</strong></span>
          <span className="text-slate-400 font-sans text-[10px]">| Drag to move · Pan with background drag</span>
        </div>

        {/* 2D CANVAS VIEWPORT */}
        <div
          ref={containerRef}
          id="canvas-bg"
          onWheel={handleWheel}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className="flex-1 w-full h-full relative cursor-grab active:cursor-grabbing bg-slate-100"
          style={{ touchAction: 'none' }}
        >
          {/* SVG GRID & BACKGROUND */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            <defs>
              <pattern id="grid-1m" width={zoom * SNAP_STEP} height={zoom * SNAP_STEP} patternUnits="userSpaceOnUse" patternTransform={`translate(${pan.x % (zoom * SNAP_STEP)}, ${pan.y % (zoom * SNAP_STEP)})`}>
                <path d={`M ${zoom * SNAP_STEP} 0 L 0 0 0 ${zoom * SNAP_STEP}`} fill="none" stroke="rgba(148, 163, 184, 0.2)" strokeWidth="1" />
              </pattern>
              <pattern id="grid-5m" width={zoom * 5} height={zoom * 5} patternUnits="userSpaceOnUse" patternTransform={`translate(${pan.x % (zoom * 5)}, ${pan.y % (zoom * 5)})`}>
                <rect width={zoom * 5} height={zoom * 5} fill="url(#grid-1m)" />
                <path d={`M ${zoom * 5} 0 L 0 0 0 ${zoom * 5}`} fill="none" stroke="rgba(59, 130, 246, 0.3)" strokeWidth="1.5" />
              </pattern>
            </defs>

            {/* Grid Fill */}
            <rect width="100%" height="100%" fill="url(#grid-5m)" />

            {/* Axis Lines (0,0) */}
            <line x1={pan.x} y1="0" x2={pan.x} y2="100%" stroke="rgba(59, 130, 246, 0.4)" strokeWidth="1.5" strokeDasharray="4 4" />
            <line x1="0" y1={pan.y} x2="100%" y2={pan.y} stroke="rgba(99, 102, 241, 0.4)" strokeWidth="1.5" strokeDasharray="4 4" />

            {/* Building Slab Boundary Outline */}
            <rect
              x={slabTopLeft.x}
              y={slabTopLeft.y}
              width={slabBottomRight.x - slabTopLeft.x}
              height={slabBottomRight.y - slabTopLeft.y}
              fill="rgba(255, 255, 255, 0.6)"
              stroke="#94a3b8"
              strokeWidth="2"
              rx="16"
              strokeDasharray="6 4"
            />
            <text x={slabTopLeft.x + 12} y={slabTopLeft.y + 24} fill="#64748b" fontSize="11" fontWeight="bold">
              FLOOR {activeFloor} BLUEPRINT ({Math.round(slabWidth)}m x {Math.round(slabDepth)}m)
            </text>
          </svg>

          {/* EMPTY FLOOR HELPER */}
          {floorRacks.length === 0 && floorPois.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center p-6">
              <div className="bg-white border border-slate-200 rounded-3xl p-8 max-w-md space-y-4 shadow-xl pointer-events-auto animate-[fadeIn_0.2s_ease-out]">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center mx-auto text-blue-600">
                  <Layers size={24} />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-base">Floor {activeFloor} is Empty</h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Click an action below to place the first rack or waypoint on this floor:
                  </p>
                </div>

                <div className="flex flex-col gap-2 pt-2">
                  <button
                    onClick={() => openAddRackModal({ x: 0, z: 0 })}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-blue-600/20 flex items-center justify-center gap-2"
                  >
                    <Plus size={15} /> Add First Rack
                  </button>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => openAddEntranceModal({ x: 0, z: -6 })}
                      className="py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5"
                    >
                      <DoorOpen size={14} /> Add Entrance
                    </button>
                    <button
                      onClick={() => openAddStairsModal({ x: 8, z: 0 })}
                      className="py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5"
                    >
                      <ArrowUpDown size={14} /> Add Stairs
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* RACKS ON CURRENT FLOOR */}
          {floorRacks.map(rack => {
            const pos = worldToScreen(rack.x, rack.z);
            const isSelected = selectedId === rack.code && selectedType === 'rack';
            const isDragging = draggingId === rack.code;

            const isRotated = (rack.rotation || 0) === 90 || (rack.rotation || 0) === 270;
            const widthPx = (isRotated ? RACK_DEPTH_M : RACK_WIDTH_M) * zoom;
            const depthPx = (isRotated ? RACK_WIDTH_M : RACK_DEPTH_M) * zoom;

            const displayName = rack.name || config.custom_racks?.[rack.code] || `Rack ${rack.code}`;

            return (
              <div
                key={rack.code}
                onPointerDown={(e) => startDragItem(e, rack.code, 'rack', rack.x, rack.z)}
                style={{
                  left: `${pos.x}px`,
                  top: `${pos.y}px`,
                  width: `${widthPx}px`,
                  height: `${depthPx}px`,
                  transform: 'translate(-50%, -50%)',
                  zIndex: isSelected || isDragging ? 30 : 10
                }}
                className={`absolute rounded-xl transition-all flex flex-col items-center justify-center text-center p-1 cursor-move select-none shadow-sm ${
                  isSelected 
                    ? 'bg-blue-50 border-2 border-blue-600 ring-4 ring-blue-500/20 shadow-lg shadow-blue-500/20' 
                    : 'bg-white border border-slate-300 hover:border-blue-400 hover:shadow-md'
                }`}
              >
                <span className="font-mono font-bold text-xs text-blue-700 tracking-tight leading-none">{rack.code}</span>
                <span className="text-[9px] text-slate-500 font-medium truncate max-w-full leading-tight mt-0.5">{displayName}</span>
              </div>
            );
          })}

          {/* POIS ON CURRENT FLOOR */}
          {floorPois.map(poi => {
            const pos = worldToScreen(poi.x, poi.z);
            const isSelected = selectedId === poi.id && selectedType === 'poi';
            const isDragging = draggingId === poi.id;

            return (
              <div
                key={poi.id}
                onPointerDown={(e) => startDragItem(e, poi.id, 'poi', poi.x, poi.z)}
                style={{
                  left: `${pos.x}px`,
                  top: `${pos.y}px`,
                  transform: 'translate(-50%, -50%)',
                  zIndex: isSelected || isDragging ? 30 : 15
                }}
                className={`absolute px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-move select-none shadow-sm ${
                  poi.type === 'entrance' 
                    ? isSelected ? 'bg-emerald-50 border-2 border-emerald-600 ring-4 ring-emerald-500/20 shadow-md text-emerald-900' : 'bg-emerald-50 border border-emerald-300 text-emerald-800'
                    : isSelected ? 'bg-amber-50 border-2 border-amber-600 ring-4 ring-amber-500/20 shadow-md text-amber-900' : 'bg-amber-50 border border-amber-300 text-amber-800'
                }`}
              >
                {poi.type === 'entrance' ? <DoorOpen size={14} className="text-emerald-600 shrink-0" /> : <ArrowUpDown size={14} className="text-amber-600 shrink-0" />}
                <span className="text-[10px] font-bold whitespace-nowrap">{poi.name || poi.type}</span>
              </div>
            );
          })}

        </div>

        {/* RIGHT SIDEBAR PROPERTY INSPECTOR */}
        {selectedItem && (
          <div className="absolute top-4 right-4 z-20 w-72 bg-white/95 backdrop-blur-md p-5 rounded-3xl border border-slate-200 shadow-xl space-y-4 animate-[fadeIn_0.15s_ease-out]">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                {selectedType === 'rack' ? <><Layers size={14} className="text-blue-600" /> Rack Inspector</> : <><MapPin size={14} className="text-purple-600" /> Waypoint Inspector</>}
              </span>
              <button onClick={() => setSelectedId(null)} className="text-slate-400 hover:text-slate-700">
                <X size={15} />
              </button>
            </div>

            <div className="space-y-3 text-xs font-medium">
              {selectedType === 'rack' ? (
                <div className="space-y-3">
                  <div>
                    <label className="text-slate-600 block mb-1 font-semibold">Rack Code ID</label>
                    <input
                      type="text"
                      value={tempRackCode}
                      onChange={(e) => setTempRackCode(e.target.value.toUpperCase())}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono font-bold uppercase focus:bg-white focus:outline-none focus:border-blue-600"
                    />
                  </div>

                  <div>
                    <label className="text-slate-600 block mb-1 font-semibold">Rack Shelf Name</label>
                    <input
                      type="text"
                      value={tempRackName}
                      onChange={(e) => setTempRackName(e.target.value)}
                      placeholder="e.g. Artificial Intelligence"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600"
                    />
                  </div>

                  {/* SAVE BUTTON FOR RACK NAME & CODE */}
                  <button
                    onClick={handleSaveSidebarProperties}
                    className={`w-full py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm ${
                      sidebarSaved 
                        ? 'bg-emerald-600 text-white' 
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                  >
                    {sidebarSaved ? (
                      <><CheckCircle2 size={14} /> Saved!</>
                    ) : (
                      <><Save size={14} /> Apply Details</>
                    )}
                  </button>

                  <div>
                    <label className="text-slate-600 block mb-1 font-semibold">Floor Level</label>
                    <select
                      value={selectedItem.floor}
                      onChange={(e) => {
                        const f = parseInt(e.target.value, 10);
                        setConfig(prev => ({
                          ...prev,
                          custom_layout: {
                            ...prev.custom_layout,
                            racks: {
                              ...prev.custom_layout.racks,
                              [selectedId]: {
                                ...prev.custom_layout.racks[selectedId],
                                floor: f
                              }
                            }
                          }
                        }));
                      }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-semibold focus:bg-white focus:outline-none focus:border-blue-600"
                    >
                      {[...Array(config.floors)].map((_, i) => (
                        <option key={i} value={i + 1}>Floor {i + 1}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-slate-500 block mb-1">X Pos (m)</label>
                      <input
                        type="number"
                        step="0.5"
                        value={selectedItem.x}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          setConfig(prev => ({
                            ...prev,
                            custom_layout: {
                              ...prev.custom_layout,
                              racks: {
                                ...prev.custom_layout.racks,
                                [selectedId]: { ...prev.custom_layout.racks[selectedId], x: val }
                              }
                            }
                          }));
                        }}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-900 font-mono focus:bg-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-slate-500 block mb-1">Z Pos (m)</label>
                      <input
                        type="number"
                        step="0.5"
                        value={selectedItem.z}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          setConfig(prev => ({
                            ...prev,
                            custom_layout: {
                              ...prev.custom_layout,
                              racks: {
                                ...prev.custom_layout.racks,
                                [selectedId]: { ...prev.custom_layout.racks[selectedId], z: val }
                              }
                            }
                          }));
                        }}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-900 font-mono focus:bg-white focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="text-slate-600 block mb-1 font-semibold">POI Label</label>
                    <input
                      type="text"
                      value={tempRackName}
                      onChange={(e) => setTempRackName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-purple-600"
                    />
                  </div>

                  <button
                    onClick={handleSaveSidebarProperties}
                    className={`w-full py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm ${
                      sidebarSaved 
                        ? 'bg-emerald-600 text-white' 
                        : 'bg-purple-600 hover:bg-purple-700 text-white'
                    }`}
                  >
                    {sidebarSaved ? (
                      <><CheckCircle2 size={14} /> Saved!</>
                    ) : (
                      <><Save size={14} /> Apply Details</>
                    )}
                  </button>

                  {selectedItem.type === 'stairs' && (
                    <div>
                      <label className="text-slate-600 block mb-1 font-semibold">Connects to Floor</label>
                      <select
                        value={selectedItem.connectsToFloor || 1}
                        onChange={(e) => {
                          const f = parseInt(e.target.value, 10);
                          setConfig(prev => ({
                            ...prev,
                            custom_layout: {
                              ...prev.custom_layout,
                              pois: prev.custom_layout.pois.map(p => p.id === selectedId ? { ...p, connectsToFloor: f } : p)
                            }
                          }));
                        }}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-semibold focus:bg-white focus:outline-none focus:border-purple-600"
                      >
                        {[...Array(config.floors)].map((_, i) => (
                          <option key={i} value={i + 1}>Floor {i + 1}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-slate-500 block mb-1">X Pos (m)</label>
                      <input
                        type="number"
                        step="0.5"
                        value={selectedItem.x}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          setConfig(prev => ({
                            ...prev,
                            custom_layout: {
                              ...prev.custom_layout,
                              pois: prev.custom_layout.pois.map(p => p.id === selectedId ? { ...p, x: val } : p)
                            }
                          }));
                        }}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-900 font-mono focus:bg-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-slate-500 block mb-1">Z Pos (m)</label>
                      <input
                        type="number"
                        step="0.5"
                        value={selectedItem.z}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          setConfig(prev => ({
                            ...prev,
                            custom_layout: {
                              ...prev.custom_layout,
                              pois: prev.custom_layout.pois.map(p => p.id === selectedId ? { ...p, z: val } : p)
                            }
                          }));
                        }}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-900 font-mono focus:bg-white focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="flex gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => handleRotate(selectedId, selectedType)}
                className="flex-1 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center gap-1 transition-all"
              >
                <RotateCw size={13} /> Rotate 90°
              </button>
              <button
                onClick={() => handleDelete(selectedId, selectedType)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 flex items-center justify-center gap-1 transition-all"
                title="Delete Item"
              >
                <Trash2 size={13} /> Delete
              </button>
            </div>
          </div>
        )}

        {/* Persistent Floating Bottom Save Action Bar */}
        <div className="absolute bottom-6 right-6 z-30 flex items-center gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-2xl text-xs font-bold text-slate-700 bg-white/95 hover:bg-slate-100 border border-slate-200 shadow-xl backdrop-blur-md transition-all active:scale-95 flex items-center gap-1.5"
          >
            <X size={15} /> <span>Discard</span>
          </button>
          <button
            onClick={handleSaveAndReturn}
            className="px-6 py-3 rounded-2xl text-xs font-extrabold text-white bg-gradient-to-r from-emerald-600 via-teal-600 to-blue-600 hover:from-emerald-700 hover:to-blue-700 shadow-2xl shadow-emerald-600/30 ring-4 ring-emerald-500/20 transition-all active:scale-95 flex items-center gap-2"
          >
            <Save size={16} /> <span>💾 Save Blueprint & Apply to 3D Map</span>
          </button>
        </div>

      </div>
    </div>
  );
}
