import React, { useEffect, useRef, useCallback, useState, useImperativeHandle, forwardRef } from 'react';
import * as THREE from 'three';

function dijkstra(nodes, startId, endId) {
  const dist = {};
  const prev = {};
  const visited = new Set();
  const pq = [];
  Object.keys(nodes).forEach(id => { dist[id] = Infinity; prev[id] = null; });
  dist[startId] = 0;
  pq.push({ id: startId, d: 0 });
  while (pq.length > 0) {
    pq.sort((a, b) => a.d - b.d);
    const { id: u } = pq.shift();
    if (visited.has(u)) continue;
    visited.add(u);
    if (u === endId) break;
    for (const edge of (nodes[u].edges || [])) {
      const alt = dist[u] + edge.w;
      if (alt < dist[edge.to]) {
        dist[edge.to] = alt;
        prev[edge.to] = u;
        pq.push({ id: edge.to, d: alt });
      }
    }
  }
  if (dist[endId] === Infinity) return null;
  const path = [];
  let cur = endId;
  while (cur) { path.unshift(cur); cur = prev[cur]; }
  return { path, distance: dist[endId] };
}

function buildDynamicGraph(config) {
  const nodes = {};
  function addNode(id, x, y, z, label, type, floor, code) {
    nodes[id] = { x, y: y + 0.15, z, label: label || id, type, floor, code, edges: [] };
  }
  function addEdge(a, b, w) {
    if(!nodes[a] || !nodes[b]) return;
    const wt = w ?? Math.hypot(nodes[a].x - nodes[b].x, nodes[a].y - nodes[b].y, nodes[a].z - nodes[b].z);
    nodes[a].edges.push({ to: b, w: wt });
    nodes[b].edges.push({ to: a, w: wt });
  }

  const floorHeights = [];
  const numFloors = config.floors || 2;
  for(let i=0; i<numFloors; i++) floorHeights.push(i * 6.4);

  const hasCustomLayout = config && config.custom_layout && config.custom_layout.racks && Object.keys(config.custom_layout.racks).length > 0;

  if (hasCustomLayout) {
    const customRacks = config.custom_layout.racks;
    const customPois = config.custom_layout.pois || [];

    // 1. Add all custom rack nodes & aisle nodes
    Object.values(customRacks).forEach(r => {
      const f = r.floor || 1;
      const fy = floorHeights[f - 1] || 0;
      const rackId = 'r' + r.code;
      const aisleId = 'aisle_r_' + r.code;
      const customName = r.name || (config.custom_racks && config.custom_racks[r.code] ? config.custom_racks[r.code] : 'Rack ' + r.code);

      addNode(rackId, r.x, fy, r.z, customName, 'rack', f, r.code);

      // Place aisle waypoint offset by 1.8m
      const isRotated = (r.rotation || 0) === 90 || (r.rotation || 0) === 270;
      const aisleX = isRotated ? (r.x < 0 ? r.x + 1.8 : r.x - 1.8) : r.x;
      const aisleZ = isRotated ? r.z : (r.z < 0 ? r.z + 1.8 : r.z - 1.8);

      addNode(aisleId, aisleX, fy, aisleZ, 'Aisle ' + r.code, 'corridor', f);
      addEdge(rackId, aisleId);
    });

    // 2. Build a collision-free navigable grid for aisles to prevent crossing through racks
    for (let f = 1; f <= numFloors; f++) {
      const GRID_SIZE = 0.5;
      const gridNodes = {};
      const MIN_X = -25, MAX_X = 25;
      const MIN_Z = -25, MAX_Z = 25;
      
      for (let x = MIN_X; x <= MAX_X; x += GRID_SIZE) {
        for (let z = MIN_Z; z <= MAX_Z; z += GRID_SIZE) {
           let inRack = false;
           for (const r of Object.values(customRacks).filter(r => (r.floor || 1) === f)) {
              const dx = x - r.x;
              const dz = z - r.z;
              const w = ((r.rotation === 90 || r.rotation === 270) ? 1.1 : 3.3) / 2 + 0.5;
              const d = ((r.rotation === 90 || r.rotation === 270) ? 3.3 : 1.1) / 2 + 0.5;
              if (Math.abs(dx) < w && Math.abs(dz) < d) {
                 inRack = true;
                 break;
              }
           }
           if (!inRack) {
              const id = `g_${f}_${Math.round(x*10)}_${Math.round(z*10)}`;
              addNode(id, x, floorHeights[f-1], z, 'walkway', 'grid', f);
              gridNodes[`${Math.round(x*10)},${Math.round(z*10)}`] = id;
           }
        }
      }
      
      // Connect adjacent grid nodes
      for (let x = MIN_X; x <= MAX_X; x += GRID_SIZE) {
        for (let z = MIN_Z; z <= MAX_Z; z += GRID_SIZE) {
           const id = gridNodes[`${Math.round(x*10)},${Math.round(z*10)}`];
           if (id) {
             const right = gridNodes[`${Math.round((x+GRID_SIZE)*10)},${Math.round(z*10)}`];
             const down = gridNodes[`${Math.round(x*10)},${Math.round((z+GRID_SIZE)*10)}`];
             if (right) addEdge(id, right, GRID_SIZE);
             if (down) addEdge(id, down, GRID_SIZE);
           }
        }
      }

      // Connect each rack's aisle node to the nearest safe grid node
      const floorAisles = Object.keys(nodes).filter(k => nodes[k].floor === f && nodes[k].type === 'corridor');
      floorAisles.forEach(aId => {
         let minDist = Infinity;
         let nearestGrid = null;
         for (const gId of Object.values(gridNodes)) {
            const d = Math.hypot(nodes[gId].x - nodes[aId].x, nodes[gId].z - nodes[aId].z);
            if (d < minDist) { minDist = d; nearestGrid = gId; }
         }
         if (nearestGrid) addEdge(aId, nearestGrid, minDist);
      });
    }

    // 3. Add POIs (entrances, stairs)
    customPois.forEach((poi, idx) => {
      const f = poi.floor || 1;
      const fy = floorHeights[f - 1] || 0;
      const poiId = poi.id || (poi.type + '_' + idx);
      const poiLabel = poi.name || (poi.type === 'entrance' ? 'Entrance' : 'Stairs Floor ' + f);

      addNode(poiId, poi.x, fy, poi.z, poiLabel, poi.type, f);

      // Connect POI to the closest safe navmesh grid node on this floor
      const floorGrids = Object.keys(nodes).filter(k => nodes[k].floor === f && nodes[k].type === 'grid');
      let closestGrid = null;
      let minD = Infinity;
      floorGrids.forEach(gId => {
        const d = Math.hypot(nodes[gId].x - poi.x, nodes[gId].z - poi.z);
        if (d < minD) { minD = d; closestGrid = gId; }
      });
      if (closestGrid) addEdge(poiId, closestGrid, minD);

      // Stairs floor connection
      if (poi.type === 'stairs' && poi.connectsToFloor) {
        const destF = poi.connectsToFloor;
        const destY = floorHeights[destF - 1] || 0;
        const destId = poiId + '_dest';
        addNode(destId, poi.x, destY, poi.z, 'Stairs Floor ' + destF, 'stairs', destF);
        addEdge(poiId, destId, 9);

        const destGrids = Object.keys(nodes).filter(k => nodes[k].floor === destF && nodes[k].type === 'grid');
        let closestDestGrid = null;
        let minDestD = Infinity;
        destGrids.forEach(gId => {
          const d = Math.hypot(nodes[gId].x - poi.x, nodes[gId].z - poi.z);
          if (d < minDestD) { minDestD = d; closestDestGrid = gId; }
        });
        if (closestDestGrid) addEdge(destId, closestDestGrid, minDestD);
      }
    });

    return { nodes, floorHeights, COLS_X: [], rowZOffsets: [], isCustom: true };
  }

  // Standard Mathematical Grid Fallback
  const COLS_X = [];
  const colSpacing = 5.2;
  const startX = -((config.cols_per_row - 1) * colSpacing) / 2;
  for(let c=0; c<config.cols_per_row; c++) COLS_X.push(startX + (c * colSpacing));

  const rowZOffsets = [];
  const rowSpacing = 9.4;
  if(config.rows_per_floor === 1) {
      rowZOffsets.push(0);
  } else {
      const startZ = -((config.rows_per_floor - 1) * rowSpacing) / 2;
      for(let r=0; r<config.rows_per_floor; r++) {
          rowZOffsets.push(startZ + (r * rowSpacing));
      }
  }

  const generatedRacks = {};
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let rackCodeIndex = 0;

  for(let f=0; f<config.floors; f++) {
      const fy = floorHeights[f];
      
      for(let r=0; r<config.rows_per_floor; r++) {
          const rz = rowZOffsets[r];
          const rowLetter = alphabet[rackCodeIndex % alphabet.length];
          rackCodeIndex++;
          
          for(let c=0; c<config.cols_per_row; c++) {
              const cx = COLS_X[c];
              const rackId = 'r' + rowLetter + (c+1);
              const aisleId = 'aisle_f' + (f+1) + '_r' + r + '_c' + c;
              
              const code = rowLetter + (c+1);
              const customName = config.custom_racks && config.custom_racks[code] ? config.custom_racks[code] : 'Rack ' + code;
              
              addNode(rackId, cx, fy, rz, customName, 'rack', f+1, code);
              
              const aisleZ = rz < 0 ? rz + 1.7 : rz - 1.7;
              addNode(aisleId, cx, fy, aisleZ, 'Aisle', 'corridor', f+1);
              
              generatedRacks[rowLetter + (c+1)] = { x: cx, y: fy, z: rz, aisleId };
              
              addEdge(rackId, aisleId);
              
              if(c > 0) {
                 addEdge(aisleId, 'aisle_f' + (f+1) + '_r' + r + '_c' + (c-1));
              }
              if(r > 0) {
                 addEdge(aisleId, 'aisle_f' + (f+1) + '_r' + (r-1) + '_c' + c);
              }
          }
      }
  }

  if (config.pois && Array.isArray(config.pois) && config.pois.length > 0) {
      config.pois.forEach((poi, index) => {
          const anchor = generatedRacks[poi.anchorRack];
          if (!anchor) return;

          let px = anchor.x;
          let pz = anchor.z;
          
          if (poi.offset === 'left') px -= 3;
          if (poi.offset === 'right') px += 3;
          if (poi.offset === 'front') pz = pz < 0 ? pz + 3 : pz - 3;
          if (poi.offset === 'back') pz = pz < 0 ? pz - 3 : pz + 3;

          const poiId = poi.type + '_' + index;
          addNode(poiId, px, anchor.y, pz, poi.type === 'entrance' ? 'Entrance' : 'Stairs Floor ' + poi.floor, poi.type, poi.floor);
          
          addEdge(poiId, anchor.aisleId);

          if (poi.type === 'stairs' && poi.connectsToFloor) {
              const destY = floorHeights[poi.connectsToFloor - 1];
              const destId = poiId + '_dest';
              addNode(destId, px, destY, pz, 'Stairs Floor ' + poi.connectsToFloor, 'stairs', poi.connectsToFloor);
              addEdge(poiId, destId, 9);
              
              const destFloorAisles = Object.keys(nodes).filter(k => nodes[k].floor === poi.connectsToFloor && nodes[k].type === 'corridor');
              let closestAisle = null;
              let minD = 999999;
              destFloorAisles.forEach(aId => {
                  const d = Math.hypot(nodes[aId].x - px, nodes[aId].z - pz);
                  if (d < minD) { minD = d; closestAisle = aId; }
              });
              if (closestAisle) addEdge(destId, closestAisle);
          }
      });
  } else {
      addNode('entrance_0', 0, 0, -13.2, 'Entrance', 'entrance', 1);
      if (config.cols_per_row > 0) {
          addEdge('entrance_0', 'aisle_f1_r0_c' + Math.floor((config.cols_per_row - 1) / 2));
      }
      for(let f=0; f<config.floors; f++) {
          const sid = 'stairs_def_' + f;
          addNode(sid, COLS_X[COLS_X.length-1] + 3, floorHeights[f], 0, 'Staircase Floor ' + (f+1), 'stairs', f+1);
          if (f > 0) addEdge('stairs_def_' + (f-1), sid, 9);
          
          const aisleKeys = Object.keys(nodes).filter(k => nodes[k].floor === (f+1) && nodes[k].type === 'corridor');
          if (aisleKeys.length > 0) addEdge(sid, aisleKeys[aisleKeys.length-1]);
      }
  }

  return { nodes, floorHeights, COLS_X, rowZOffsets, isCustom: false };
}

function generateDirections(path, nodes) {
  const steps = [];
  let prevDir = null; 
  
  if (!path || path.length === 0) return steps;
  
  const startNode = nodes[path[0]];
  const endNode = nodes[path[path.length - 1]];
  
  let startLabel = startNode.label || 'your location';
  if (startNode.type === 'stairs') startLabel = `Stairs on Floor ${startNode.floor}`;
  if (startNode.type === 'entrance') startLabel = `the Entrance`;
  
  steps.push(`Start from ${startLabel}.`);
  
  let currentDistance = 0;
  
  for (let i = 1; i < path.length; i++) {
    const p1 = nodes[path[i-1]];
    const p2 = nodes[path[i]];
    if (!p1 || !p2) continue;

    if (p1.floor !== p2.floor) {
       if (currentDistance > 1) {
           steps.push(`Walk straight.`);
           currentDistance = 0;
       }
       steps.push(`Take the stairs to Floor ${p2.floor}.`);
       prevDir = null;
       continue;
    }
    
    const dx = p2.x - p1.x;
    const dz = p2.z - p1.z;
    const dist = Math.hypot(dx, dz);
    
    if (dist < 0.1) continue;
    
    const dir = { x: dx / dist, z: dz / dist };
    
    if (prevDir) {
       const dot = prevDir.x * dir.x + prevDir.z * dir.z;
       const det = prevDir.x * dir.z - prevDir.z * dir.x;
       
       let turn = null;
       if (det > 0.3) turn = "Turn right.";
       else if (det < -0.3) turn = "Turn left.";
       else if (dot < -0.5) turn = "Turn around.";
       
       if (turn) {
           steps.push(turn);
           currentDistance = 0;
       }
    } else {
       steps.push("Head straight.");
    }
    
    currentDistance += dist;
    prevDir = dir;
  }
  
  if (currentDistance > 2) {
      steps.push("Continue straight.");
  }
  
  if (endNode && endNode.type === 'rack') {
     steps.push(`Arrive at ${endNode.label}, Floor ${endNode.floor}.`);
  } else if (endNode) {
     steps.push(`Arrive at destination.`);
  }
  
  const collapsed = [];
  for (let s of steps) {
      if (collapsed.length > 0) {
          const last = collapsed[collapsed.length - 1];
          if ((last.includes("straight") && s.includes("straight")) || (last === s)) {
              continue;
          }
      }
      collapsed.push(s);
  }
  
  return collapsed;
}

let _cachedWoodMat = null;
function createWoodMaterial() {
  if (_cachedWoodMat) return _cachedWoodMat;
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#6b4423';
  ctx.fillRect(0, 0, 128, 128);
  ctx.fillStyle = '#59381d';
  for (let i = 0; i < 40; i++) {
    const y = Math.random() * 128;
    const h = Math.random() * 2 + 1;
    ctx.fillRect(0, y, 128, h);
  }
  const texture = new THREE.CanvasTexture(canvas);
  _cachedWoodMat = new THREE.MeshStandardMaterial({
    map: texture,
    color: 0x6b4423,
    roughness: 0.65,
    metalness: 0.05
  });
  return _cachedWoodMat;
}

let _cachedTileMat = null;
function createTileMaterial() {
  if (_cachedTileMat) return _cachedTileMat;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#dbe0e6';
  ctx.fillRect(0, 0, 256, 256);
  ctx.strokeStyle = '#a9b0ba';
  ctx.lineWidth = 2;
  const tileSize = 64;
  for(let x=0; x<=256; x+=tileSize) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 256); ctx.stroke();
  }
  for(let y=0; y<=256; y+=tileSize) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(256, y); ctx.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 4);
  _cachedTileMat = new THREE.MeshStandardMaterial({
    map: texture,
    roughness: 0.22,
    metalness: 0.04
  });
  return _cachedTileMat;
}

function createSignSprite(label) {
  const str = String(label || 'Rack');
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.roundRect(0, 0, 512, 128, 16);
  ctx.fill();
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 6;
  ctx.stroke();
  ctx.fillStyle = '#ffffff';

  let fontSize = 48;
  if (str.length > 20) fontSize = 28;
  else if (str.length > 12) fontSize = 36;
  ctx.font = `bold ${fontSize}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(str, 256, 64);

  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.45), material);
  return mesh;
}

function makeLabel(text, opts = {}) {
  const { bg = '#f2a93b', fg = '#181104', scale = 1 } = opts;
  const c = document.createElement('canvas');
  const ctx = c.getContext('2d');
  const font = '700 46px Inter, sans-serif';
  ctx.font = font;
  const pad = 20;
  const w = Math.ceil(ctx.measureText(text).width) + pad * 2;
  const h = 64 + pad * 0.4;
  c.width = w; c.height = h;
  ctx.font = font;
  ctx.fillStyle = bg;
  const r = 16;
  ctx.beginPath();
  ctx.moveTo(r, 0); ctx.arcTo(w, 0, w, h, r); ctx.arcTo(w, h, 0, h, r); ctx.arcTo(0, h, 0, 0, r); ctx.arcTo(0, 0, w, 0, r);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = fg;
  ctx.textBaseline = 'middle';
  ctx.fillText(text, pad, h / 2 + 2);
  const tex = new THREE.CanvasTexture(c);
  tex.minFilter = THREE.LinearFilter;
  const mat = new THREE.SpriteMaterial({ map: tex, depthTest: true, transparent: true });
  const sprite = new THREE.Sprite(mat);
  const aspect = w / h;
  sprite.scale.set(1.5 * aspect * scale, 1.5 * scale, 1);
  return sprite;
}

const LibraryWayfinder = forwardRef(({ routeTo, routeFrom = 'entrance', onRackClick, onRouteComplete, onConfigLoaded, activeFloor = 'both', overrideConfig }, ref) => {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const minimapCameraRef = useRef(null);
  const clockRef = useRef(new THREE.Clock());
  const orbitRef = useRef({ theta: Math.PI * 0.28, phi: 1.02, radius: 46, target: new THREE.Vector3(0, 4, 0), minPhi: 0.15, maxPhi: 1.55, minR: 2, maxR: 100 });
  const rackMeshByCodeRef = useRef({});
  const rackGroupsRef = useRef({});
  const routeObjsRef = useRef({ ribbon: null, beacon: null, animId: null, userMarker: null });
  const dragRef = useRef({ dragging: false, panning: false, lastX: 0, lastY: 0, startX: 0, startY: 0, yaw: 0, pitch: 0 });
  const flyToRef = useRef(null);
  const reqIdRef = useRef(null);

  const [directions, setDirections] = useState(null);
  const [routeInfo, setRouteInfo] = useState(null);
  const [config, setConfig] = useState(null);
  const [graphData, setGraphData] = useState(null);
  const [sceneReady, setSceneReady] = useState(false);
  
  const [cameraMode, setCameraMode] = useState('orbit');
  const cameraModeRef = useRef('orbit');
  const walkProgressRef = useRef(0);
  const routeCurveRef = useRef(null);

  const handleSetCameraMode = useCallback((m) => {
     cameraModeRef.current = m;
     setCameraMode(m);
     if (m === 'walk') {
        walkProgressRef.current = 0;
        dragRef.current.yaw = 0;
        dragRef.current.pitch = 0;
        if (routeCurveRef.current) {
          const pt = routeCurveRef.current.getPointAt(0);
          cameraRef.current.position.copy(pt);
        }
     } else {
        if (cameraRef.current) {
            orbitRef.current.target.copy(cameraRef.current.position);
            orbitRef.current.radius = 15;
            flyToRef.current = null;
        }
     }
  }, []);

  useEffect(() => {
    if (overrideConfig) {
      setConfig(overrideConfig);
      setGraphData(buildDynamicGraph(overrideConfig));
      if (onConfigLoaded) onConfigLoaded(overrideConfig);
    } else {
      fetch('/api/admin/architecture', { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } })
        .then(res => res.json())
        .then(data => {
           setConfig(data);
           setGraphData(buildDynamicGraph(data));
           if (onConfigLoaded) onConfigLoaded(data);
        })
        .catch(err => console.error("Failed to fetch layout config", err));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overrideConfig]);

  useImperativeHandle(ref, () => ({
    getDirections: () => directions,
    getRouteInfo: () => routeInfo,
    setFloor: (floor) => handleFloorChange(floor),
    resetView: () => {
      const orbit = orbitRef.current;
      orbit.theta = Math.PI * 0.28;
      orbit.phi = 1.02;
      orbit.radius = 46;
      orbit.target.set(0, 4, 0);
      updateCamera();
    }
  }));

  const updateCamera = useCallback(() => {
    const orbit = orbitRef.current;
    const camera = cameraRef.current;
    if (!camera) return;
    const sp = orbit.radius * Math.sin(orbit.phi);
    camera.position.set(
      orbit.target.x + sp * Math.sin(orbit.theta),
      orbit.target.y + orbit.radius * Math.cos(orbit.phi),
      orbit.target.z + sp * Math.cos(orbit.theta)
    );
    camera.lookAt(orbit.target);
  }, []);

  const handleFloorChange = useCallback((floorStr) => {
    const targetFloor = parseInt(floorStr, 10);
    const rg = rackGroupsRef.current;
    
    const setOpacity = (group, op) => {
      group.traverse(o => {
        if (o.isMesh) {
          o.material.transparent = op < 1;
          o.material.opacity = op;
        }
      });
    };
    
    Object.keys(rg).forEach(fKey => {
      const fNum = parseInt(fKey, 10);
      const group = rg[fKey];
      if (group) {
        group.visible = true;
        // If a specific floor is selected, fade out all others. If 'both'/all, make all visible.
        setOpacity(group, (isNaN(targetFloor) || fNum === targetFloor) ? 1 : 0.12);
      }
    });
  }, []);

  const clearRoute = useCallback(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    const ro = routeObjsRef.current;
    if (ro.ribbon) scene.remove(ro.ribbon);
    if (ro.tube) scene.remove(ro.tube);
    if (ro.glow) scene.remove(ro.glow);
    if (ro.comet) scene.remove(ro.comet);
    if (ro.beacon) scene.remove(ro.beacon);
    ro.ribbon = null;
    ro.tube = null;
    ro.glow = null;
    ro.comet = null;
    ro.beacon = null;
    if (ro.animId) cancelAnimationFrame(ro.animId);
    ro.animId = null;
    routeCurveRef.current = null;
    walkProgressRef.current = 0;
    
    Object.values(rackMeshByCodeRef.current).forEach(g => {
      if (g.children[0]) {
        g.children[0].material.emissive.setHex(0x000000);
        g.children[0].material.emissiveIntensity = 0;
      }
    });
    setDirections(null);
    setRouteInfo(null);
  }, []);

  const drawRoute = useCallback((destCode, fromId = 'entrance') => {
    const scene = sceneRef.current;
    const clock = clockRef.current;
    if (!scene || !graphData || !graphData.nodes) return;
    const nodes = graphData.nodes;

    clearRoute();

    const resolveNodeId = (code) => {
      if (!code) return null;
      let raw = String(code).trim().replace(/['"]/g, '');
      let clean = raw.toUpperCase().replace(/^RACK[\s-_]*/i, '').replace(/^R(?=[A-Z0-9])/i, '');
      
      // 1. Check entrance
      if (raw.toLowerCase().includes('entrance') || clean.includes('ENTRANCE')) {
        const ent = Object.keys(nodes).find(k => nodes[k].type === 'entrance');
        if (ent) return ent;
      }
      
      // 2. Check floor / stairs
      if (raw.toUpperCase().includes('STAIR') || raw.toUpperCase().includes('FLOOR')) {
        const floorMatch = raw.match(/\d+/);
        const floorNum = floorMatch ? parseInt(floorMatch[0], 10) : 1;
        const allStairs = Object.keys(nodes).filter(k => nodes[k].type === 'stairs' && nodes[k].floor === floorNum);
        if (allStairs.length > 0) return allStairs[0];
        const floorCorridors = Object.keys(nodes).filter(k => nodes[k].floor === floorNum);
        if (floorCorridors.length > 0) return floorCorridors[0];
      }
      
      // 3. Direct key matches
      if (nodes[raw]) return raw;
      if (nodes['r' + raw.toUpperCase()]) return 'r' + raw.toUpperCase();
      if (nodes['r' + clean]) return 'r' + clean;
      if (nodes[clean]) return clean;
      
      // 4. Match by rack code or label
      const matchingNode = Object.keys(nodes).find(k => {
        const n = nodes[k];
        if (n.type !== 'rack') return false;
        const labelUpper = (n.label || '').toUpperCase();
        const codeUpper = (n.code || '').toUpperCase();
        return codeUpper === clean || 
               codeUpper === raw.toUpperCase() ||
               labelUpper === clean || 
               labelUpper === raw.toUpperCase() ||
               labelUpper.includes(clean) ||
               labelUpper.includes(raw.toUpperCase());
      });
      
      if (matchingNode) return matchingNode;
      return null;
    };

    let endNode = resolveNodeId(destCode);
    if (!endNode || !nodes[endNode]) {
      const cand = Object.keys(nodes).find(k => k.toLowerCase().includes(String(destCode).toLowerCase()) || (nodes[k].label && nodes[k].label.toLowerCase().includes(String(destCode).toLowerCase())));
      endNode = cand || Object.keys(nodes).find(k => nodes[k].type === 'rack') || Object.keys(nodes)[0];
    }

    let resolvedFrom = resolveNodeId(fromId);
    if (!resolvedFrom || !nodes[resolvedFrom]) {
      const ent = Object.keys(nodes).find(k => nodes[k].type === 'entrance');
      resolvedFrom = ent || Object.keys(nodes)[0];
    }

    if (!endNode || !resolvedFrom || !nodes[endNode] || !nodes[resolvedFrom]) {
      console.warn('[LibraryWayfinder] Could not resolve route endpoints:', { fromId, destCode, resolvedFrom, endNode });
      return;
    }

    let result = dijkstra(nodes, resolvedFrom, endNode);
    if (!result || !result.path || result.path.length === 0) {
      console.warn('[LibraryWayfinder] Dijkstra path not found, using direct fallback path between', resolvedFrom, 'and', endNode);
      const dist = Math.hypot(nodes[resolvedFrom].x - nodes[endNode].x, nodes[resolvedFrom].y - nodes[endNode].y, nodes[resolvedFrom].z - nodes[endNode].z);
      result = { path: [resolvedFrom, endNode], distance: dist };
    }

    const steps = generateDirections(result.path, nodes);
    setDirections(steps);
    setRouteInfo({ destination: destCode, distance: Math.round(result.distance), steps: steps.length, floor: nodes[endNode] ? nodes[endNode].floor : 1 });

    const pts = result.path.map((id, index) => {
      const n = nodes[id];
      // Keep path in empty space: if this is the final node and it's a rack, pull the point 80% towards the previous aisle node
      if (index === result.path.length - 1 && n.type === 'rack' && index > 0) {
        const prevN = nodes[result.path[index - 1]];
        return new THREE.Vector3(
           n.x * 0.15 + prevN.x * 0.85,
           n.y + 0.9,
           n.z * 0.15 + prevN.z * 0.85
        );
      }
      return new THREE.Vector3(n.x, n.y + 0.9, n.z);
    });
    if (pts.length === 1) {
       pts.push(pts[0].clone().add(new THREE.Vector3(0, 0.1, 0))); // Prevent curve crash for single-node paths
    }
    
    // Insert points every 0.8 meters to force the CatmullRomCurve to stay strictly on the straight grid lines
    const densePts = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const p1 = pts[i];
      const p2 = pts[i+1];
      const dist = p1.distanceTo(p2);
      const segments = Math.max(2, Math.ceil(dist / 0.8));
      for (let j = 0; j < segments; j++) {
        densePts.push(p1.clone().lerp(p2, j / segments));
      }
    }
    densePts.push(pts[pts.length - 1]);
    
    const curve = new THREE.CatmullRomCurve3(densePts, false, 'catmullrom', 0.05); // low tension for tight corners
    routeCurveRef.current = curve;

    const totalLen = curve.getLength();
    
    // Lightweight, highly visible route tube
    const tubeGeo = new THREE.TubeGeometry(curve, Math.min(96, Math.max(32, result.path.length * 8)), 0.16, 6, false);
    const tubeMat = new THREE.MeshBasicMaterial({ color: 0xf2a93b, transparent: true, opacity: 0.92, depthTest: false });
    const routeTube = new THREE.Mesh(tubeGeo, tubeMat);
    routeTube.geometry.setDrawRange(0, Infinity);
    routeTube.renderOrder = 999;
    scene.add(routeTube);
    routeObjsRef.current.tube = routeTube;

    // Outer glow tube for visibility
    const glowGeo = new THREE.TubeGeometry(curve, Math.min(96, Math.max(32, result.path.length * 8)), 0.32, 6, false);
    const glowMat = new THREE.MeshBasicMaterial({ color: 0xf2a93b, transparent: true, opacity: 0.18, depthTest: false });
    const glowTube = new THREE.Mesh(glowGeo, glowMat);
    glowTube.geometry.setDrawRange(0, Infinity);
    glowTube.renderOrder = 998;
    scene.add(glowTube);
    routeObjsRef.current.glow = glowTube;

    // Comet (optimized to 4 trailing spheres)
    const cometGroup = new THREE.Group();
    const headMat = new THREE.MeshBasicMaterial({ color: 0xffffff, depthTest: false }); // small white ball
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.32, 16, 16), headMat);
    head.renderOrder = 1000;
    cometGroup.add(head);
    const trail = [];
    for (let i = 1; i <= 4; i++) {
      const m = new THREE.Mesh(
        new THREE.SphereGeometry(0.26 - i * 0.04, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 - i * 0.1, depthTest: false })
      );
      m.renderOrder = 1000 - i;
      cometGroup.add(m);
      trail.push(m);
    }
    scene.add(cometGroup);
    routeObjsRef.current.comet = cometGroup;
    const trailPts = [];

    const destNode = nodes[endNode];
    const physicalCode = destNode.code || destCode;
    const displayName = destNode.label && destNode.label !== ('Rack ' + destNode.code) ? destNode.label : `Rack ${destCode}`;
    const beaconGroup = new THREE.Group();
    beaconGroup.position.set(destNode.x, destNode.y - 0.15, destNode.z);
    
    const pillarGeo = new THREE.CylinderGeometry(0.08, 0.08, 5, 16);
    const pillarMat = new THREE.MeshBasicMaterial({ color: 0xe2665f, transparent: true, opacity: 0.4 });
    const pillar = new THREE.Mesh(pillarGeo, pillarMat);
    pillar.position.y = 2.5;
    beaconGroup.add(pillar);
    
    for (let i = 0; i < 2; i++) {
      const ringGeo = new THREE.RingGeometry(0.8 + i * 0.6, 1.0 + i * 0.6, 32);
      const ringMat = new THREE.MeshBasicMaterial({ color: 0xe2665f, transparent: true, opacity: 0.35, side: THREE.DoubleSide });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.05;
      ring.userData.idx = i;
      beaconGroup.add(ring);
    }
    
    const diamondGeo = new THREE.OctahedronGeometry(0.35, 0);
    const diamondMat = new THREE.MeshBasicMaterial({ color: 0xff6655, transparent: true, opacity: 0.85 });
    const diamond = new THREE.Mesh(diamondGeo, diamondMat);
    diamond.position.y = 5.2;
    beaconGroup.add(diamond);
    
    const billboardCanvas = document.createElement('canvas');
    billboardCanvas.width = 256;
    billboardCanvas.height = 64;
    const ctx = billboardCanvas.getContext('2d');
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.beginPath(); ctx.roundRect(0,0,256,64, 8); ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${displayName} · ${Math.round(result.distance)}m`, 128, 32);
    
    const tex = new THREE.CanvasTexture(billboardCanvas);
    const mat = new THREE.SpriteMaterial({ map: tex, depthTest: false });
    const billboard = new THREE.Sprite(mat);
    billboard.scale.set(3, 0.75, 1);
    billboard.position.y = 6.0;
    beaconGroup.add(billboard);
    
    scene.add(beaconGroup);
    routeObjsRef.current.beacon = beaconGroup;

    if (rackMeshByCodeRef.current[physicalCode]) {
      const destMesh = rackMeshByCodeRef.current[physicalCode].children[0];
      if (destMesh && destMesh.material) {
        destMesh.material = destMesh.material.clone();
        destMesh.material.emissive.setHex(0xe2665f);
        destMesh.material.emissiveIntensity = 0.8;
      }
    }

    const endPos = new THREE.Vector3(destNode.x, destNode.y + 2, destNode.z);
    const midIdx = Math.floor(pts.length / 2);
    const midPt = pts[midIdx] || endPos;
    const routeCenter = new THREE.Vector3().addVectors(midPt, endPos).multiplyScalar(0.5);
    const routeSpan = Math.max(8, new THREE.Vector3().subVectors(pts[0], endPos).length());
    const targetRadius = Math.min(50, Math.max(12, routeSpan * 1.6));
    flyToRef.current = { target: routeCenter, radius: targetRadius, progress: 0 };
    
    const startT = clock.getElapsedTime();
    const speed = 9;
    const duration = Math.max(1.8, totalLen / speed);
    
    function animate() {
      const bT = clock.getElapsedTime() - startT;
      // Pulse beacon rings
      beaconGroup.children.forEach(child => {
        if (child.geometry && child.geometry.type === 'RingGeometry') {
          const phase = (bT + child.userData.idx * 0.5) % 1.8;
          const s = 1 + phase * 0.6;
          child.scale.set(s, s, s);
          child.material.opacity = Math.max(0, 0.35 * (1 - phase / 1.8));
        }
      });
      diamond.rotation.y = bT * 1.5;
      diamond.position.y = 5.2 + Math.sin(bT * 2) * 0.3;
      pillarMat.opacity = 0.25 + Math.sin(bT * 3) * 0.15;
      
      // Route tube is now drawn entirely at once to guarantee visibility
      const cometT = Math.min(1, bT / duration);
      if (cometT >= 1) {
          cometGroup.visible = false;
      } else {
          cometGroup.visible = true;
          const p = curve.getPointAt(cometT);
          cometGroup.position.copy(p);
          trailPts.unshift(p.clone());
          if (trailPts.length > 60) trailPts.pop();
          trail.forEach((m, i) => {
            const idx = Math.min(trailPts.length - 1, (i + 1) * 4);
            if (trailPts[idx]) m.position.copy(trailPts[idx]).sub(p);
          });
      }

      // Camera fly-to animation (only in orbit mode)
      if (cameraModeRef.current !== 'walk') {
        const fly = flyToRef.current;
        if (fly && fly.progress < 1) {
          fly.progress = Math.min(1, fly.progress + 0.012);
          const ease = 1 - Math.pow(1 - fly.progress, 3); // ease-out cubic
          if (orbitRef.current && orbitRef.current.target) {
              orbitRef.current.target.lerp(fly.target, ease * 0.04);
              orbitRef.current.radius += (fly.radius - orbitRef.current.radius) * ease * 0.04;
          }
        } else if (orbitRef.current && orbitRef.current.target) {
          orbitRef.current.target.lerp(p, 0.015);
        }
        updateCamera();
      }
      
      routeObjsRef.current.animId = requestAnimationFrame(animate);
    }
    animate();
    
    // Automatically start the virtual walkthrough!
    setTimeout(() => {
      handleSetCameraMode('walk');
    }, 400); // Small delay to let the map zoom slightly before diving in
    
    if (onRouteComplete) onRouteComplete(destCode, steps);
  }, [clearRoute, onRouteComplete, graphData, handleSetCameraMode]);

  useEffect(() => {
    if (!mountRef.current || !config || !graphData) return;
    const container = mountRef.current;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.shadowMap.enabled = false;
    rendererRef.current = renderer;
    container.appendChild(renderer.domElement);
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0e1a);
    scene.fog = new THREE.FogExp2(0x0a0e1a, 0.008);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.05, 500);
    cameraRef.current = camera;
    
    const minimapCamera = new THREE.OrthographicCamera(-20, 20, 20, -20, 1, 100);
    minimapCamera.position.set(0, 60, 0);
    minimapCamera.lookAt(0, 0, 0);
    minimapCameraRef.current = minimapCamera;

    scene.add(new THREE.AmbientLight(0x8892b0, 0.8));
    const sun = new THREE.DirectionalLight(0xfff2d8, 0.8);
    sun.position.set(30, 50, 20);
    scene.add(sun);
    
    const hemi = new THREE.HemisphereLight(0x87ceeb, 0x362a1f, 0.3);
    scene.add(hemi);

    const { floorHeights, COLS_X, rowZOffsets } = graphData;

    rackGroupsRef.current = {};
    for(let f=0; f<config.floors; f++) {
        const floorGroup = new THREE.Group();
        scene.add(floorGroup);
        rackGroupsRef.current[f+1] = floorGroup;
    }

    const slabWidth = Math.max(41, (config.cols_per_row * 5.2) + 12);
    const slabDepth = Math.max(28.5, (config.rows_per_floor * 9.4) + 10);
    
    const tileMat = createTileMaterial();
    tileMat.map.repeat.set(slabWidth / 10, slabDepth / 10);
    
    for(let f=0; f<config.floors; f++) {
        const fy = floorHeights[f];
        
        const slabGeo = new THREE.BoxGeometry(slabWidth, 0.4, slabDepth);
        const slab = new THREE.Mesh(slabGeo, tileMat);
        slab.position.set(0, fy - 0.25, 0);
        slab.receiveShadow = true;
        rackGroupsRef.current[f+1].add(slab);
        
        const floorLabel = makeLabel('FLOOR ' + (f+1), { bg: '#111a2e', fg: '#f2a93b', scale: 1.3 });
        floorLabel.position.set(-(slabWidth/2) + 2, fy + 2.2, -(slabDepth/2) + 0.5);
        rackGroupsRef.current[f+1].add(floorLabel);
        
        // Ceiling mesh removed to improve WebGL alpha-sorting performance
        
        for(let r=0; r<config.rows_per_floor; r++) {
            const rz = rowZOffsets[r];
            const aisleZ = rz - 1.7;
            for(let c=0; c<config.cols_per_row; c+=2) {
                const cx = COLS_X[c];
                const fixtureGroup = new THREE.Group();
                fixtureGroup.position.set(cx, fy + 4.0, aisleZ);
                const housingGeo = new THREE.BoxGeometry(0.3, 0.08, 2.0);
                const housingMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
                const housing = new THREE.Mesh(housingGeo, housingMat);
                fixtureGroup.add(housing);
                const diffuserGeo = new THREE.PlaneGeometry(0.26, 1.96);
                const diffuserMat = new THREE.MeshBasicMaterial({ color: 0xfffaed });
                const diffuser = new THREE.Mesh(diffuserGeo, diffuserMat);
                diffuser.rotation.x = Math.PI / 2;
                diffuser.position.y = -0.045;
                fixtureGroup.add(diffuser);
                // Removed expensive PointLight for performance, relying on emissive diffuser and ambient light
                rackGroupsRef.current[f+1].add(fixtureGroup);
            }
        }
        
        const pGeo = new THREE.CylinderGeometry(0.25, 0.25, 6.4);
        const pMat = new THREE.MeshStandardMaterial({ color: 0x3a3d45, roughness: 0.9 });
        const px = slabWidth / 2 - 1;
        const pz = slabDepth / 2 - 1;
        const corners = [ [px, pz], [-px, pz], [px, -pz], [-px, -pz] ];
        corners.forEach(pos => {
          const p = new THREE.Mesh(pGeo, pMat);
          p.position.set(pos[0], fy + 3.2, pos[1]);
          p.castShadow = true;
          p.receiveShadow = true;
          rackGroupsRef.current[f+1].add(p);
        });
    }

    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let rackCodeIndex = 0;
    const woodMat = createWoodMaterial();
    const bookColors = [0x8b263e, 0x1e3d59, 0x17b978, 0xd78232, 0x3a3d40, 0x4a2f1d, 0x9a8c73].map(c => new THREE.Color(c));
    const sharedBackGeo = new THREE.BoxGeometry(3.3, 2.5, 0.04);
    const sharedPanelGeo = new THREE.BoxGeometry(0.06, 2.5, 1.1);
    const sharedShelfGeo = new THREE.BoxGeometry(3.3, 0.04, 1.1);
    const sharedBookGeo = new THREE.BoxGeometry(1, 1, 1);
    const sharedBookMat = new THREE.MeshStandardMaterial({ roughness: 0.8 });

    if (graphData.isCustom && config.custom_layout && config.custom_layout.racks) {
        Object.values(config.custom_layout.racks).forEach(r => {
            const f = r.floor || 1;
            const fy = floorHeights[f - 1] || 0;
            const code = r.code;
            const customName = r.name || (config.custom_racks && config.custom_racks[code] ? config.custom_racks[code] : 'Rack ' + code);

            const rackGroup = new THREE.Group();
            
            const backPanel = new THREE.Mesh(sharedBackGeo, woodMat.clone());
            backPanel.position.set(0, 1.25, -0.53);
            rackGroup.add(backPanel);

            const leftPanel = new THREE.Mesh(sharedPanelGeo, woodMat);
            leftPanel.position.set(-1.62, 1.25, 0);
            const rightPanel = new THREE.Mesh(sharedPanelGeo, woodMat);
            rightPanel.position.set(1.62, 1.25, 0);
            rackGroup.add(leftPanel);
            rackGroup.add(rightPanel);
            
            const shelves = new THREE.Group();
            for(let s=0; s<4; s++) {
              const shelf = new THREE.Mesh(sharedShelfGeo, woodMat);
              shelf.position.y = 0.4 + s * 0.6;
              shelves.add(shelf);
            }
            rackGroup.add(shelves);

            const instMesh = new THREE.InstancedMesh(sharedBookGeo, sharedBookMat, 60);
            let bookIdx = 0;
            const matrix = new THREE.Matrix4();
            const q = new THREE.Quaternion();
            for(let s=0; s<4; s++) {
              let bx = -1.4;
              const sy = 0.4 + s * 0.6 + 0.02;
              while(bx < 1.4 && bookIdx < 60) {
                const thickness = 0.08 + Math.random() * 0.04;
                const height = 0.22 + Math.random() * 0.12;
                const depth = 0.6 + Math.random() * 0.3;
                let rotZ = 0;
                if (Math.random() < 0.06) rotZ = (Math.random() > 0.5 ? 1 : -1) * 0.15;
                q.setFromAxisAngle(new THREE.Vector3(0, 0, 1), rotZ);
                matrix.compose(new THREE.Vector3(bx + thickness/2, sy + height/2, 0), q, new THREE.Vector3(thickness, height, depth));
                instMesh.setMatrixAt(bookIdx, matrix);
                instMesh.setColorAt(bookIdx, bookColors[bookIdx % bookColors.length]);
                bx += thickness + 0.01;
                bookIdx++;
              }
            }
            instMesh.count = bookIdx;
            instMesh.instanceMatrix.needsUpdate = true;
            if (instMesh.instanceColor) instMesh.instanceColor.needsUpdate = true;
            rackGroup.add(instMesh);

            const sign = createSignSprite(customName);
            sign.position.set(0, 2.8, 0);
            rackGroup.add(sign);

            rackGroup.position.set(r.x, fy, r.z);
            if (r.rotation) {
              rackGroup.rotation.y = (r.rotation * Math.PI) / 180;
            }
            rackGroup.userData = { rackCode: code, floor: f };
            rackMeshByCodeRef.current[code] = rackGroup;
            if (rackGroupsRef.current[f]) {
              rackGroupsRef.current[f].add(rackGroup);
            }
        });
    } else {
        for(let f=0; f<config.floors; f++) {
            const fy = floorHeights[f];
            for(let r=0; r<config.rows_per_floor; r++) {
                const rz = rowZOffsets[r];
                const rowLetter = alphabet[rackCodeIndex % alphabet.length];
                rackCodeIndex++;

                for(let c=0; c<config.cols_per_row; c++) {
                   const cx = COLS_X[c];
                   const code = rowLetter + (c+1);
                   const customName = config.custom_racks && config.custom_racks[code] ? config.custom_racks[code] : code;

                   const rackGroup = new THREE.Group();
                   
                   const backPanel = new THREE.Mesh(sharedBackGeo, woodMat.clone());
                   backPanel.position.set(0, 1.25, -0.53);
                   rackGroup.add(backPanel);

                   const leftPanel = new THREE.Mesh(sharedPanelGeo, woodMat);
                   leftPanel.position.set(-1.62, 1.25, 0);
                   const rightPanel = new THREE.Mesh(sharedPanelGeo, woodMat);
                   rightPanel.position.set(1.62, 1.25, 0);
                   rackGroup.add(leftPanel);
                   rackGroup.add(rightPanel);
                   
                   const shelves = new THREE.Group();
                   for(let s=0; s<4; s++) {
                     const shelf = new THREE.Mesh(sharedShelfGeo, woodMat);
                     shelf.position.y = 0.4 + s * 0.6;
                     shelves.add(shelf);
                   }
                   rackGroup.add(shelves);

                   const instMesh = new THREE.InstancedMesh(sharedBookGeo, sharedBookMat, 60);
                   let bookIdx = 0;
                   const matrix = new THREE.Matrix4();
                   const q = new THREE.Quaternion();
                   for(let s=0; s<4; s++) {
                     let bx = -1.4;
                     const sy = 0.4 + s * 0.6 + 0.02;
                     while(bx < 1.4 && bookIdx < 60) {
                       const thickness = 0.08 + Math.random() * 0.04;
                       const height = 0.22 + Math.random() * 0.12;
                       const depth = 0.6 + Math.random() * 0.3;
                       let rotZ = 0;
                       if (Math.random() < 0.06) rotZ = (Math.random() > 0.5 ? 1 : -1) * 0.15;
                       q.setFromAxisAngle(new THREE.Vector3(0, 0, 1), rotZ);
                       matrix.compose(new THREE.Vector3(bx + thickness/2, sy + height/2, 0), q, new THREE.Vector3(thickness, height, depth));
                       instMesh.setMatrixAt(bookIdx, matrix);
                       instMesh.setColorAt(bookIdx, bookColors[bookIdx % bookColors.length]);
                       bx += thickness + 0.01;
                       bookIdx++;
                     }
                   }
                   instMesh.count = bookIdx;
                   instMesh.instanceMatrix.needsUpdate = true;
                   if (instMesh.instanceColor) instMesh.instanceColor.needsUpdate = true;
                   rackGroup.add(instMesh);

                   const sign = createSignSprite(customName);
                   sign.position.set(0, 2.8, 0);
                   rackGroup.add(sign);

                   rackGroup.position.set(cx, fy, rz);
                   rackGroup.userData = { rackCode: code, floor: f+1 };
                   rackMeshByCodeRef.current[code] = rackGroup;
                   rackGroupsRef.current[f+1].add(rackGroup);
                }
            }
        }
    }

    // Removed outer glass walls and transmission meshes for huge performance boost

    if (graphData && graphData.nodes) {
       Object.keys(graphData.nodes).forEach(k => {
           const n = graphData.nodes[k];
           if (n.type === 'entrance') {
               const pinGroup = new THREE.Group();
               const cone = new THREE.Mesh(
                 new THREE.ConeGeometry(0.45, 1.1, 16),
                 new THREE.MeshStandardMaterial({ color: 0x5fe3a0, emissive: 0x5fe3a0, emissiveIntensity: 0.35, roughness: 0.2 })
               );
               cone.position.y = 0.55;
               pinGroup.add(cone);
               const pinLabel = makeLabel('ENTRANCE', { bg: '#111a2e', fg: '#eae6da', scale: 0.65 });
               pinLabel.position.y = 1.5;
               pinGroup.add(pinLabel);
               pinGroup.position.set(n.x, n.y, n.z);
               scene.add(pinGroup);
           } else if (n.type === 'stairs' && !k.endsWith('_dest')) {
               const stairGroup = new THREE.Group();
               const stairMat = new THREE.MeshStandardMaterial({ color: 0x6b7590, roughness: 0.6 });
               const stepCount = 8;
               const totalStairHeight = 6.4;
               for(let s=0; s<stepCount; s++) {
                   const step = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.22, 0.9), stairMat);
                   step.position.set(0, (s+1) * (totalStairHeight / stepCount), -2.6 + s * 0.72);
                   step.castShadow = true;
                   stairGroup.add(step);
               }
               stairGroup.position.set(n.x, n.y, n.z);
               scene.add(stairGroup);
               const stairLabel = makeLabel('STAIRS', { bg: '#111a2e', fg: '#eae6da', scale: 0.6 });
               stairLabel.position.set(n.x, n.y + totalStairHeight + 1, n.z);
               scene.add(stairLabel);
           }
       });
    }

    const markerGeo = new THREE.ConeGeometry(0.5, 1.5, 8);
    markerGeo.rotateX(Math.PI / 2);
    const markerMat = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    const userMarker = new THREE.Mesh(markerGeo, markerMat);
    userMarker.visible = false;
    scene.add(userMarker);
    routeObjsRef.current.userMarker = userMarker;

    const canvas = renderer.domElement;
    const drag = dragRef.current;

    const onPointerDown = (e) => {
      if (e.button === 2 || e.button === 1) drag.panning = true;
      else drag.dragging = true;
      drag.startX = e.clientX; drag.startY = e.clientY;
      drag.lastX = e.clientX; drag.lastY = e.clientY;
      canvas.setPointerCapture(e.pointerId);
    };
    const onPointerUp = () => { drag.dragging = false; drag.panning = false; };
    const onPointerMove = (e) => {
      if (!drag.dragging && !drag.panning) return;
      const dx = e.clientX - drag.lastX, dy = e.clientY - drag.lastY;
      drag.lastX = e.clientX; drag.lastY = e.clientY;
      
      if (cameraModeRef.current === 'walk') {
         drag.yaw = (drag.yaw || 0) - dx * 0.005;
         drag.pitch = Math.max(-Math.PI/2, Math.min(Math.PI/2, (drag.pitch || 0) - dy * 0.005));
      } else {
         const orbit = orbitRef.current;
         if (drag.panning) {
           const cam = cameraRef.current;
           if (!cam) return;
           const panSpeed = orbit.radius * 0.003;
           const right = new THREE.Vector3();
           const up = new THREE.Vector3();
           cam.getWorldDirection(up);
           right.crossVectors(cam.up, up).normalize();
           up.crossVectors(right, up).normalize();
           orbit.target.addScaledVector(right, dx * panSpeed);
           orbit.target.addScaledVector(up, -dy * panSpeed);
         } else {
           orbit.theta -= dx * 0.0055;
           orbit.phi = Math.min(orbit.maxPhi, Math.max(orbit.minPhi, orbit.phi - dy * 0.0045));
         }
         updateCamera();
      }
    };
    const onWheel = (e) => {
      e.preventDefault();
      if (cameraModeRef.current !== 'walk') {
        const orbit = orbitRef.current;
        const zoomSpeed = Math.max(0.005, orbit.radius * 0.0008);
        orbit.radius = Math.min(orbit.maxR, Math.max(orbit.minR, orbit.radius + e.deltaY * zoomSpeed));
        updateCamera();
      }
    };
    const onContextMenu = (e) => e.preventDefault();

    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    canvas.addEventListener('contextmenu', onContextMenu);

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const onClick = (e) => {
      if (Math.abs(e.clientX - drag.startX) > 15 || Math.abs(e.clientY - drag.startY) > 15) return;
      if (cameraModeRef.current === 'walk') return;
      const rect = container.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const objs = [];
      Object.values(rackMeshByCodeRef.current).forEach(g => {
        if(g.children[0]) objs.push(g.children[0]);
      });
      const hits = raycaster.intersectObjects(objs);
      if (hits.length) {
        const code = hits[0].object.parent.userData.rackCode;
        if (onRackClick) onRackClick(code);
      }
    };
    canvas.addEventListener('click', onClick);

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);
    handleResize();
    updateCamera();

    function loop() {
      reqIdRef.current = requestAnimationFrame(loop);
      const scene = sceneRef.current;
      const camera = cameraRef.current;
      const minimapCamera = minimapCameraRef.current;
      if (!scene || !camera || !renderer) return;

      const dt = clockRef.current.getDelta();
      
      if (routeObjsRef.current.ribbon) {
        routeObjsRef.current.ribbon.material.uniforms.uTime.value += dt;
      }
      
      if (cameraModeRef.current === 'walk' && routeCurveRef.current) {
          const curve = routeCurveRef.current;
          walkProgressRef.current += 0.003;
          let t = walkProgressRef.current;
          if (t >= 1) {
             walkProgressRef.current = 1;
             handleSetCameraMode('orbit');
             t = 1;
          }
          const pt = curve.getPointAt(t);
          const lookPt = curve.getPointAt(Math.min(1, t + 0.03));
          
          camera.position.set(pt.x, pt.y + 1.65, pt.z);
          camera.lookAt(lookPt.x, lookPt.y + 1.65, lookPt.z);
          
          if (dragRef.current.yaw || dragRef.current.pitch) {
             const euler = new THREE.Euler(0, 0, 0, 'YXZ');
             euler.setFromQuaternion(camera.quaternion);
             euler.y += dragRef.current.yaw || 0;
             euler.x += dragRef.current.pitch || 0;
             camera.quaternion.setFromEuler(euler);
          }
          
          if (routeObjsRef.current.userMarker) {
             routeObjsRef.current.userMarker.position.copy(pt);
             routeObjsRef.current.userMarker.lookAt(lookPt);
             routeObjsRef.current.userMarker.visible = true;
          }
      } else {
          const fly = flyToRef.current;
          if (fly && fly.progress < 1) {
            fly.progress = Math.min(1, fly.progress + 0.015);
            const ease = 1 - Math.pow(1 - fly.progress, 3);
            orbitRef.current.target.lerp(fly.target, ease * 0.06);
            orbitRef.current.radius += (fly.radius - orbitRef.current.radius) * ease * 0.06;
            updateCamera();
          }
          if (routeObjsRef.current.userMarker) {
             routeObjsRef.current.userMarker.visible = false;
          }
      }
      
      minimapCamera.position.x = camera.position.x;
      minimapCamera.position.z = camera.position.z;

      renderer.setViewport(0, 0, container.clientWidth, container.clientHeight);
      renderer.setScissorTest(false);
      renderer.render(scene, camera);
    }
    loop();
    setSceneReady(true);

    return () => {
      setSceneReady(false);
      cancelAnimationFrame(reqIdRef.current);
      resizeObserver.disconnect();
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('click', onClick);
      canvas.removeEventListener('contextmenu', onContextMenu);
      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [updateCamera, onRackClick, config, graphData, handleSetCameraMode]);

  useEffect(() => {
    if (!sceneReady || !graphData || !graphData.nodes) return;
    if (routeTo) {
      drawRoute(String(routeTo), routeFrom ? String(routeFrom) : 'entrance');
    } else {
      clearRoute();
    }
  }, [sceneReady, routeTo, routeFrom, drawRoute, graphData, clearRoute]);

  useEffect(() => {
    handleFloorChange(activeFloor);
  }, [activeFloor, handleFloorChange]);

  return (
    <div className="w-full h-full rounded-xl overflow-hidden relative" style={{ touchAction: 'none', minHeight: '300px' }}>
      <div ref={mountRef} className="w-full h-full" style={{ cursor: cameraMode === 'walk' ? 'crosshair' : 'grab' }} />
      
      {routeInfo && (
        <div className="absolute top-3 left-3 z-20">
          <button
            onClick={() => handleSetCameraMode(cameraMode === 'orbit' ? 'walk' : 'orbit')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-black/60 backdrop-blur-md border border-white/15 text-white hover:bg-white/10 transition-all shadow-lg"
          >
            {cameraMode === 'orbit' ? '🚶 Walk Through' : '🔭 Overview'}
          </button>
        </div>
      )}
      
      {routeInfo && (
        <div className="absolute bottom-3 left-3 z-20 bg-black/60 backdrop-blur-md border border-white/10 rounded-xl px-3 py-2 text-xs text-gray-200 shadow-lg">
          <div className="font-bold text-amber-400">📍 Rack {routeInfo.destination}</div>
          <div className="text-gray-400 mt-0.5">~{routeInfo.distance}m · Floor {routeInfo.floor}</div>
        </div>
      )}
    </div>
  );
});

LibraryWayfinder.displayName = 'LibraryWayfinder';
export default LibraryWayfinder;
