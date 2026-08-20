import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  X, Save, RotateCw, Trash2, Plus, Move, ZoomIn, ZoomOut, Maximize2, 
  Grid, MapPin, Layers, DoorOpen, ArrowUpDown, Undo2, Check, AlertCircle, Sparkles, PlusCircle, MinusCircle
} from 'lucide-react';

const SNAP_STEP = 1.0; // Snap to 1 meter increments
const RACK_WIDTH_M = 3.3;
const RACK_DEPTH_M = 1.1;

export default function FloorPlanEditor2D({ initialConfig, onSave, onClose }) {
  // Deep clone initial config
  const [config, setConfig] = useState(() => {
    const cfg = JSON.parse(JSON.stringify(initialConfig || {}));
    if (!cfg.floors || cfg.floors < 1) cfg.floors = 2;
    if (!cfg.rows_per_floor || cfg.rows_per_floor < 1) cfg.rows_per_floor = 1;
    if (!cfg.cols_per_row || cfg.cols_per_row < 1) cfg.cols_per_row = 1;
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
      z: startZ - 5,
      rotation: 0
    });

    // Default stairs on each floor
    for (let f = 1; f <= cfg.floors; f++) {
      pois.push({
        id: `stairs_f${f}`,
        type: 'stairs',
        floor: f,
        name: `Staircase Floor ${f}`,
        x: (cfg.cols_per_row * colSpacing) / 2 + 3,
        z: 0,
        connectsToFloor: f < cfg.floors ? f + 1 : f - 1,
        rotation: 0
      });
    }

    return { racks, pois };
  }

  // Convert meters (world) to screen pixels
  const worldToScreen = useCallback((wx, wz) => {
    return {
      x: pan.x + wx * zoom,
      y: pan.y + wz * zoom
    };
  }, [pan, zoom]);

  // Convert screen pixels to meters (world)
  const screenToWorld = useCallback((sx, sy) => {
    return {
      x: (sx - pan.x) / zoom,
      z: (sy - pan.y) / zoom
    };
  }, [pan, zoom]);

  // Snap coordinate to grid
  const applySnap = (val) => {
    if (!snapToGrid) return Math.round(val * 10) / 10;
    return Math.round(val / SNAP_STEP) * SNAP_STEP;
  };

  // Mouse wheel zoom
  const handleWheel = (e) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;
    const newZoom = Math.min(60, Math.max(8, zoom * zoomFactor));
    
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      const newPanX = mouseX - (mouseX - pan.x) * (newZoom / zoom);
      const newPanY = mouseY - (mouseY - pan.y) * (newZoom / zoom);
      
      setZoom(newZoom);
      setPan({ x: newPanX, y: newPanY });
    }
  };

  // Pointer Down (start pan or drag)
  const handlePointerDown = (e) => {
    if (e.target === containerRef.current || e.target.tagName === 'svg' || e.target.id === 'canvas-bg') {
      setIsPanning(true);
      panStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
      setSelectedId(null);
    }
  };

  // Pointer Move
  const handlePointerMove = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const curWorld = screenToWorld(e.clientX - rect.left, e.clientY - rect.top);
    setMousePos({ x: Math.round(curWorld.x * 10) / 10, z: Math.round(curWorld.z * 10) / 10 });

    if (isPanning) {
      setPan({
        x: e.clientX - panStartRef.current.x,
        y: e.clientY - panStartRef.current.y
      });
      return;
    }

    if (draggingId) {
      const newX = applySnap(curWorld.x - dragOffset.x);
      const newZ = applySnap(curWorld.z - dragOffset.z);

      setConfig(prev => {
        const next = { ...prev };
        const layout = { ...next.custom_layout };

        if (selectedType === 'rack' && layout.racks[draggingId]) {
          layout.racks = {
            ...layout.racks,
            [draggingId]: {
              ...layout.racks[draggingId],
              x: newX,
              z: newZ
            }
          };
        } else if (selectedType === 'poi') {
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
  };

  // Pointer Up
  const handlePointerUp = () => {
    setIsPanning(false);
    setDraggingId(null);
  };

  // Start dragging an item
  const startDragItem = (e, id, type, itemX, itemZ) => {
    e.stopPropagation();
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const curWorld = screenToWorld(e.clientX - rect.left, e.clientY - rect.top);

    setSelectedId(id);
    setSelectedType(type);
    setDraggingId(id);
    setDragOffset({ x: curWorld.x - itemX, z: curWorld.z - itemZ });
  };

  // Add Floor
  const handleAddNewFloor = () => {
    const nextFloorNum = config.floors + 1;
    setConfig(prev => ({
      ...prev,
      floors: nextFloorNum
    }));
    setActiveFloor(nextFloorNum);
    setSelectedId(null);
  };

  // Delete Active Floor
  const handleDeleteActiveFloor = () => {
    if (config.floors <= 1) {
      alert('You must have at least 1 floor.');
      return;
    }
    if (window.confirm(`Delete Floor ${activeFloor} and all its racks/POIs?`)) {
      setConfig(prev => {
        const nextRacks = { ...prev.custom_layout.racks };
        Object.keys(nextRacks).forEach(k => {
          if (nextRacks[k].floor === activeFloor) {
            delete nextRacks[k];
          } else if (nextRacks[k].floor > activeFloor) {
            nextRacks[k].floor -= 1;
          }
        });

        const nextPois = (prev.custom_layout.pois || []).filter(p => p.floor !== activeFloor).map(p => {
          if (p.floor > activeFloor) {
            return { ...p, floor: p.floor - 1 };
          }
          return p;
        });

        return {
          ...prev,
          floors: prev.floors - 1,
          custom_layout: {
            ...prev.custom_layout,
            racks: nextRacks,
            pois: nextPois
          }
        };
      });
      setActiveFloor(Math.max(1, activeFloor - 1));
      setSelectedId(null);
    }
  };

  // Open Add Rack Dialog
  const openAddRackModal = () => {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const existingCodes = Object.keys(config.custom_layout?.racks || {});
    let candidate = 'A1';
    for (let i = 0; i < alphabet.length; i++) {
      for (let num = 1; num <= 20; num++) {
        const c = alphabet[i] + num;
        if (!existingCodes.includes(c)) {
          candidate = c;
          break;
        }
      }
      if (candidate !== 'A1' || !existingCodes.includes('A1')) break;
    }
    setNewRackCode(candidate);
    setNewRackName(`Rack ${candidate}`);
    setAddModalType('rack');
  };

  // Confirm Add Rack
  const handleConfirmAddRack = () => {
    const code = newRackCode.trim().toUpperCase() || 'R1';
    const name = newRackName.trim() || `Rack ${code}`;
    const newRack = {
      code,
      name,
      floor: activeFloor,
      x: applySnap(mousePos.x || 0),
      z: applySnap(mousePos.z || 0),
      rotation: 0
    };

    setConfig(prev => ({
      ...prev,
      custom_racks: {
        ...(prev.custom_racks || {}),
        [code]: name
      },
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
  const openAddEntranceModal = () => {
    setNewPoiName(`Entrance Floor ${activeFloor}`);
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
      x: applySnap(mousePos.x || 0),
      z: applySnap(mousePos.z || -6),
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
  const openAddStairsModal = () => {
    setNewPoiName(`Staircase Floor ${activeFloor}`);
    setNewStairsDest(activeFloor < config.floors ? activeFloor + 1 : Math.max(1, activeFloor - 1));
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
      x: applySnap(mousePos.x || 8),
      z: applySnap(mousePos.z || 0),
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
    Object.values(config.custom_layout.racks || {}).forEach(r => {
      if (r.name) {
        custom_racks[r.code] = r.name;
      }
    });

    const finalConfig = {
      ...config,
      custom_racks
    };

    onSave(finalConfig);
  };

  // Filter items for current floor
  const floorRacks = Object.values(config.custom_layout?.racks || {}).filter(r => r.floor === activeFloor);
  const floorPois = (config.custom_layout?.pois || []).filter(p => p.floor === activeFloor);
  const selectedItem = selectedType === 'rack' 
    ? config.custom_layout?.racks?.[selectedId] 
    : (config.custom_layout?.pois || []).find(p => p.id === selectedId);

  // Dynamic Slab bounds calculation based on floor elements or rows/cols
  const rackXs = floorRacks.map(r => Math.abs(r.x));
  const rackZs = floorRacks.map(r => Math.abs(r.z));
  const maxX = rackXs.length > 0 ? Math.max(...rackXs) : (config.cols_per_row * 5.2) / 2;
  const maxZ = rackZs.length > 0 ? Math.max(...rackZs) : (config.rows_per_floor * 9.4) / 2;
  const slabWidth = Math.max(22, (maxX * 2) + 10);
  const slabDepth = Math.max(18, (maxZ * 2) + 10);

  const slabTopLeft = worldToScreen(-slabWidth / 2, -slabDepth / 2);
  const slabBottomRight = worldToScreen(slabWidth / 2, slabDepth / 2);

  return (
    <div className="fixed inset-0 z-50 bg-[#060912] text-white flex flex-col select-none overflow-hidden font-sans">
      
      {/* ADD ELEMENT MODAL DIALOG */}
      {addModalType && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0c1222] border border-white/20 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                {addModalType === 'rack' && <><Plus className="text-blue-400" size={18} /> Add Custom Rack (Floor {activeFloor})</>}
                {addModalType === 'entrance' && <><DoorOpen className="text-emerald-400" size={18} /> Add Entrance (Floor {activeFloor})</>}
                {addModalType === 'stairs' && <><ArrowUpDown className="text-amber-400" size={18} /> Add Staircase (Floor {activeFloor})</>}
              </h3>
              <button onClick={() => setAddModalType(null)} className="text-gray-400 hover:text-white p-1 rounded-lg">
                <X size={18} />
              </button>
            </div>

            {addModalType === 'rack' && (
              <div className="space-y-3.5">
                <div>
                  <label className="text-xs font-semibold text-gray-400 block mb-1">Rack Code (e.g. A1, B4, C6, Z1)</label>
                  <input
                    type="text"
                    value={newRackCode}
                    onChange={(e) => setNewRackCode(e.target.value.toUpperCase())}
                    placeholder="e.g. A1"
                    className="w-full bg-black/40 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono uppercase focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-400 block mb-1">Rack Name / Category (e.g. Science Fiction, Physics)</label>
                  <input
                    type="text"
                    value={newRackName}
                    onChange={(e) => setNewRackName(e.target.value)}
                    placeholder="e.g. Science Fiction"
                    className="w-full bg-black/40 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            )}

            {addModalType === 'entrance' && (
              <div className="space-y-3.5">
                <div>
                  <label className="text-xs font-semibold text-gray-400 block mb-1">Entrance Name</label>
                  <input
                    type="text"
                    value={newPoiName}
                    onChange={(e) => setNewPoiName(e.target.value)}
                    placeholder="e.g. Main Entrance, North Door"
                    className="w-full bg-black/40 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            )}

            {addModalType === 'stairs' && (
              <div className="space-y-3.5">
                <div>
                  <label className="text-xs font-semibold text-gray-400 block mb-1">Staircase Name</label>
                  <input
                    type="text"
                    value={newPoiName}
                    onChange={(e) => setNewPoiName(e.target.value)}
                    placeholder="e.g. Main Staircase"
                    className="w-full bg-black/40 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-400 block mb-1">Connects to Floor Level</label>
                  <select
                    value={newStairsDest}
                    onChange={(e) => setNewStairsDest(e.target.value)}
                    className="w-full bg-black/40 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
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
                className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl text-xs font-semibold border border-white/10"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (addModalType === 'rack') handleConfirmAddRack();
                  else if (addModalType === 'entrance') handleConfirmAddEntrance();
                  else if (addModalType === 'stairs') handleConfirmAddStairs();
                }}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-500/30"
              >
                Add to Floor Plan
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* TOP BAR */}
      <div className="h-16 px-6 bg-[#0c1222]/90 backdrop-blur-md border-b border-white/10 flex items-center justify-between z-20 shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-blue-500/20 border border-blue-500/30">
            <Layers className="text-blue-400" size={18} />
            <span className="text-sm font-bold tracking-wide text-blue-200">2D Floor Plan Architect</span>
          </div>

          {/* Floor Switcher Tabs & Floor Management */}
          <div className="flex items-center bg-black/40 p-1 rounded-xl border border-white/10 gap-1">
            {[...Array(config.floors)].map((_, i) => (
              <button
                key={i}
                onClick={() => { setActiveFloor(i + 1); setSelectedId(null); }}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeFloor === i + 1 
                    ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.5)]' 
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                Floor {i + 1}
              </button>
            ))}

            {/* Add New Floor Button */}
            <button
              onClick={handleAddNewFloor}
              className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/20 border border-emerald-500/30 flex items-center gap-1 transition-all"
              title="Add New Empty Floor Level"
            >
              <PlusCircle size={14} /> Add Floor
            </button>

            {/* Delete Active Floor Button */}
            {config.floors > 1 && (
              <button
                onClick={handleDeleteActiveFloor}
                className="px-2 py-1.5 rounded-lg text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-500/20 transition-all"
                title={`Delete Floor ${activeFloor}`}
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>

          <span className="text-xs text-gray-400 bg-white/5 px-2.5 py-1 rounded-lg border border-white/5">
            {floorRacks.length} Racks · {floorPois.length} POIs on Floor {activeFloor}
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSnapToGrid(!snapToGrid)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all ${
              snapToGrid 
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' 
                : 'bg-white/5 border-white/10 text-gray-400'
            }`}
          >
            <Grid size={14} /> Snap (1m)
          </button>

          <button
            onClick={handleAutoArrange}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 flex items-center gap-1.5 transition-all"
            title="Auto-Arrange Racks in Clean Grid"
          >
            <Sparkles size={14} className="text-amber-400" /> Auto-Grid
          </button>

          <div className="h-6 w-px bg-white/10 mx-1" />

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl text-xs font-semibold text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-all flex items-center gap-1.5"
          >
            <X size={14} /> Discard & Exit
          </button>

          <button
            onClick={handleSaveAndReturn}
            className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-500 hover:to-blue-500 shadow-[0_0_20px_rgba(16,185,129,0.35)] hover:shadow-[0_0_25px_rgba(16,185,129,0.5)] transition-all flex items-center gap-2 active:scale-95"
          >
            <Save size={15} /> Save & Return to 3D
          </button>
        </div>
      </div>

      {/* WORKSPACE AREA */}
      <div className="flex-1 relative flex overflow-hidden">
        
        {/* LEFT TOOLBAR PALETTE */}
        <div className="absolute top-4 left-4 z-20 flex flex-col gap-2.5 bg-[#0c1222]/90 backdrop-blur-md p-3 rounded-2xl border border-white/10 shadow-2xl w-44">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1">Add to Floor {activeFloor}</span>
          
          <button
            onClick={openAddRackModal}
            className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold bg-blue-600/30 hover:bg-blue-600/50 text-blue-200 border border-blue-500/40 transition-all shadow-sm active:scale-95"
          >
            <Plus size={15} /> ➕ Add Rack
          </button>

          <button
            onClick={openAddEntranceModal}
            className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-200 border border-emerald-500/40 transition-all shadow-sm active:scale-95"
          >
            <DoorOpen size={15} /> 🚪 Add Entrance
          </button>

          <button
            onClick={openAddStairsModal}
            className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold bg-amber-600/30 hover:bg-amber-600/50 text-amber-200 border border-amber-500/40 transition-all shadow-sm active:scale-95"
          >
            <ArrowUpDown size={15} /> 🪜 Add Stairs
          </button>

          <div className="h-px bg-white/10 my-1" />

          {/* Zoom controls */}
          <div className="flex items-center justify-between px-1">
            <button onClick={() => setZoom(z => Math.max(8, z * 0.85))} className="p-1.5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white" title="Zoom Out">
              <ZoomOut size={16} />
            </button>
            <span className="text-[11px] font-mono text-gray-400">{Math.round(zoom)}px/m</span>
            <button onClick={() => setZoom(z => Math.min(60, z * 1.15))} className="p-1.5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white" title="Zoom In">
              <ZoomIn size={16} />
            </button>
          </div>
        </div>

        {/* BOTTOM LEFT COORDINATES HUD */}
        <div className="absolute bottom-4 left-4 z-20 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-[11px] font-mono text-gray-300 shadow-lg pointer-events-none flex items-center gap-3">
          <span>X: <strong className="text-blue-400">{mousePos.x}m</strong></span>
          <span>Z: <strong className="text-purple-400">{mousePos.z}m</strong></span>
          <span className="text-gray-500">| Drag items to position · Click empty area to pan</span>
        </div>

        {/* 2D CANVAS VIEWPORT */}
        <div
          ref={containerRef}
          id="canvas-bg"
          onWheel={handleWheel}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className="flex-1 w-full h-full relative cursor-grab active:cursor-grabbing bg-[#080d1a]"
          style={{ touchAction: 'none' }}
        >
          {/* SVG GRID & BACKGROUND */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            <defs>
              <pattern id="grid-1m" width={zoom * SNAP_STEP} height={zoom * SNAP_STEP} patternUnits="userSpaceOnUse" patternTransform={`translate(${pan.x % (zoom * SNAP_STEP)}, ${pan.y % (zoom * SNAP_STEP)})`}>
                <path d={`M ${zoom * SNAP_STEP} 0 L 0 0 0 ${zoom * SNAP_STEP}`} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
              </pattern>
              <pattern id="grid-5m" width={zoom * 5} height={zoom * 5} patternUnits="userSpaceOnUse" patternTransform={`translate(${pan.x % (zoom * 5)}, ${pan.y % (zoom * 5)})`}>
                <rect width={zoom * 5} height={zoom * 5} fill="url(#grid-1m)" />
                <path d={`M ${zoom * 5} 0 L 0 0 0 ${zoom * 5}`} fill="none" stroke="rgba(59,130,246,0.18)" strokeWidth="1.5" />
              </pattern>
            </defs>

            {/* Grid Fill */}
            <rect width="100%" height="100%" fill="url(#grid-5m)" />

            {/* Coordinate Axis Origin (0,0) */}
            <line x1={pan.x} y1="0" x2={pan.x} y2="100%" stroke="rgba(59,130,246,0.4)" strokeWidth="2" strokeDasharray="4 4" />
            <line x1="0" y1={pan.y} x2="100%" y2={pan.y} stroke="rgba(168,85,247,0.4)" strokeWidth="2" strokeDasharray="4 4" />

            {/* Building Slab Boundary Outline */}
            <rect
              x={slabTopLeft.x}
              y={slabTopLeft.y}
              width={slabBottomRight.x - slabTopLeft.x}
              height={slabBottomRight.y - slabTopLeft.y}
              fill="rgba(255,255,255,0.015)"
              stroke="rgba(255,255,255,0.2)"
              strokeWidth="2"
              rx="12"
              strokeDasharray="6 4"
            />
            <text x={slabTopLeft.x + 12} y={slabTopLeft.y + 24} fill="rgba(255,255,255,0.3)" fontSize="12" fontWeight="bold">
              FLOOR {activeFloor} BOUNDARY ({Math.round(slabWidth)}m x {Math.round(slabDepth)}m)
            </text>
          </svg>

          {/* EMPTY FLOOR GUIDE BANNER */}
          {floorRacks.length === 0 && floorPois.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center p-6">
              <div className="bg-black/60 backdrop-blur-md border border-white/10 rounded-2xl p-6 max-w-sm space-y-2">
                <Layers size={36} className="text-blue-400 mx-auto opacity-70" />
                <h4 className="font-bold text-white text-base">Floor {activeFloor} is Empty</h4>
                <p className="text-xs text-gray-400">
                  Use the left toolbar to add custom <strong>Racks</strong>, <strong>Entrances</strong>, or <strong>Stairs</strong> to this level.
                </p>
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
                className={`absolute rounded-lg flex flex-col items-center justify-center cursor-move transition-shadow px-1 ${
                  isSelected 
                    ? 'bg-gradient-to-br from-amber-600/95 to-amber-800/95 border-2 border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.6)] text-white' 
                    : 'bg-[#18233a]/90 hover:bg-[#203050]/90 border border-blue-400/40 text-blue-100 shadow-md hover:shadow-blue-500/20'
                }`}
              >
                <div className="flex items-center gap-1">
                  <span className="font-extrabold text-xs tracking-wider">Rack {rack.code}</span>
                </div>
                {displayName && displayName !== `Rack ${rack.code}` && (
                  <span className="text-[10px] text-amber-300 font-semibold truncate max-w-[95%] text-center">
                    {displayName}
                  </span>
                )}
                
                {/* Coordinates Indicator */}
                <span className="text-[8px] text-white/50 font-mono mt-0.5">
                  ({rack.x}, {rack.z})
                </span>
              </div>
            );
          })}

          {/* POIs ON CURRENT FLOOR (ENTRANCES & STAIRS) */}
          {floorPois.map(poi => {
            const pos = worldToScreen(poi.x, poi.z);
            const isSelected = selectedId === poi.id && selectedType === 'poi';
            const isDragging = draggingId === poi.id;
            const isEntrance = poi.type === 'entrance';

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
                className={`absolute px-3 py-2 rounded-2xl flex items-center gap-2 cursor-move border transition-all ${
                  isEntrance 
                    ? isSelected 
                      ? 'bg-emerald-600 text-white border-white shadow-[0_0_20px_rgba(16,185,129,0.7)]' 
                      : 'bg-emerald-900/80 hover:bg-emerald-800 text-emerald-200 border-emerald-500/40 shadow-lg'
                    : isSelected 
                      ? 'bg-amber-600 text-white border-white shadow-[0_0_20px_rgba(245,158,11,0.7)]' 
                      : 'bg-amber-950/80 hover:bg-amber-900 text-amber-200 border-amber-500/40 shadow-lg'
                }`}
              >
                {isEntrance ? <DoorOpen size={16} className="text-emerald-300" /> : <ArrowUpDown size={16} className="text-amber-300" />}
                <div className="flex flex-col">
                  <span className="font-bold text-xs uppercase tracking-wide">{poi.name || poi.type}</span>
                  {!isEntrance && poi.connectsToFloor && (
                    <span className="text-[9px] text-white/70 font-mono">→ Floor {poi.connectsToFloor}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* RIGHT PROPERTIES SIDEBAR */}
        {selectedItem && (
          <div className="w-80 bg-[#0c1222]/95 backdrop-blur-md border-l border-white/10 p-5 flex flex-col justify-between z-30 shrink-0 shadow-2xl animate-in slide-in-from-right duration-200">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  {selectedType === 'rack' ? <Layers size={18} className="text-blue-400" /> : <MapPin size={18} className="text-purple-400" />}
                  <h3 className="font-bold text-sm text-white capitalize">
                    {selectedType === 'rack' ? `Rack ${selectedItem.code}` : selectedItem.name}
                  </h3>
                </div>
                <button onClick={() => setSelectedId(null)} className="p-1 text-gray-400 hover:text-white rounded-lg">
                  <X size={16} />
                </button>
              </div>

              {/* Edit Properties */}
              {selectedType === 'rack' ? (
                <div className="space-y-3.5">
                  <div>
                    <label className="text-xs font-semibold text-gray-400 block mb-1">Rack Code</label>
                    <input
                      type="text"
                      value={selectedItem.code}
                      onChange={(e) => {
                        const newCode = e.target.value.toUpperCase();
                        if (!newCode) return;
                        setConfig(prev => {
                          const next = { ...prev };
                          const nextRacks = { ...next.custom_layout.racks };
                          const item = nextRacks[selectedId];
                          delete nextRacks[selectedId];
                          nextRacks[newCode] = { ...item, code: newCode };
                          next.custom_layout.racks = nextRacks;
                          if (next.custom_racks) {
                            const curName = next.custom_racks[selectedId] || item.name;
                            delete next.custom_racks[selectedId];
                            next.custom_racks[newCode] = curName;
                          }
                          return next;
                        });
                        setSelectedId(newCode);
                      }}
                      className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2 text-sm text-white font-mono uppercase focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-400 block mb-1">Custom Rack Name / Category</label>
                    <input
                      type="text"
                      placeholder="e.g. Science Fiction, Reference, History"
                      value={selectedItem.name || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setConfig(prev => ({
                          ...prev,
                          custom_racks: {
                            ...(prev.custom_racks || {}),
                            [selectedId]: val
                          },
                          custom_layout: {
                            ...prev.custom_layout,
                            racks: {
                              ...prev.custom_layout.racks,
                              [selectedId]: {
                                ...prev.custom_layout.racks[selectedId],
                                name: val
                              }
                            }
                          }
                        }));
                      }}
                      className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  {/* Floor */}
                  <div>
                    <label className="text-xs font-semibold text-gray-400 block mb-1">Floor Level</label>
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
                      className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                    >
                      {[...Array(config.floors)].map((_, i) => (
                        <option key={i} value={i + 1}>Floor {i + 1}</option>
                      ))}
                    </select>
                  </div>

                  {/* Exact Coordinates */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-semibold text-gray-400 block mb-1">X Pos (meters)</label>
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
                        className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-400 block mb-1">Z Pos (meters)</label>
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
                        className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                /* POI Properties */
                <div className="space-y-3.5">
                  <div>
                    <label className="text-xs font-semibold text-gray-400 block mb-1">POI Name</label>
                    <input
                      type="text"
                      value={selectedItem.name || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setConfig(prev => ({
                          ...prev,
                          custom_layout: {
                            ...prev.custom_layout,
                            pois: prev.custom_layout.pois.map(p => p.id === selectedId ? { ...p, name: val } : p)
                          }
                        }));
                      }}
                      className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  {selectedItem.type === 'stairs' && (
                    <div>
                      <label className="text-xs font-semibold text-gray-400 block mb-1">Connects to Floor</label>
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
                        className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
                      >
                        {[...Array(config.floors)].map((_, i) => (
                          <option key={i} value={i + 1}>Floor {i + 1}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-semibold text-gray-400 block mb-1">X Pos (meters)</label>
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
                        className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-purple-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-400 block mb-1">Z Pos (meters)</label>
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
                        className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-purple-500"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="flex gap-2 pt-4 border-t border-white/10">
              <button
                onClick={() => handleRotate(selectedId, selectedType)}
                className="flex-1 py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-gray-200 border border-white/10 flex items-center justify-center gap-1.5 transition-all"
              >
                <RotateCw size={14} /> Rotate 90°
              </button>
              <button
                onClick={() => handleDelete(selectedId, selectedType)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-red-600/20 hover:bg-red-600/40 text-red-300 border border-red-500/30 flex items-center justify-center gap-1.5 transition-all"
                title="Delete Item"
              >
                <Trash2 size={14} /> Delete
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
