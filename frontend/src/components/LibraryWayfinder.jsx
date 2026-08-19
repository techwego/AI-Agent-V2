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
  for(let i=0; i<config.floors; i++) floorHeights.push(i * 6.4);

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

  return { nodes, floorHeights, COLS_X, rowZOffsets };
}

function generateDirections(path, nodes) {
  const steps = [];
  let prevType = null;
  for (let i = 0; i < path.length; i++) {
    const n = nodes[path[i]];
    if (!n) continue;
    
    if (n.type === 'entrance') { steps.push('Enter through the Entrance.'); }
    else if (n.type === 'rack' && i === path.length - 1) { steps.push(`Arrive at ${n.label}, Floor ${n.floor}.`); }
    else if (n.type === 'stairs') {
      if (prevType !== 'stairs') steps.push(`Take the stairs to Floor ${n.floor}.`);
    }
    else if (n.type === 'corridor') {
      if (prevType !== 'corridor') steps.push('Walk through the aisle.');
    }
    prevType = n.type;
  }
  return steps;
}

function createWoodMaterial() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#6b4423';
  ctx.fillRect(0, 0, 512, 512);
  ctx.fillStyle = '#59381d';
  for (let i = 0; i < 500; i++) {
    const y = Math.random() * 512;
    const h = Math.random() * 3 + 1;
    ctx.beginPath();
    for(let x = 0; x <= 512; x += 10) {
      const yy = y + Math.sin(x * 0.05 + y) * 5;
      if (x === 0) ctx.moveTo(x, yy);
      else ctx.lineTo(x, yy);
    }
    ctx.lineWidth = h;
    ctx.strokeStyle = `rgba(0,0,0,${Math.random() * 0.1})`;
    ctx.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  return new THREE.MeshStandardMaterial({
    map: texture,
    color: 0x6b4423,
    roughness: 0.65,
    metalness: 0.05,
    bumpMap: texture,
    bumpScale: 0.02
  });
}

function createTileMaterial() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#dbe0e6';
  ctx.fillRect(0, 0, 1024, 1024);
  for(let i=0; i<10000; i++) {
    const x = Math.random() * 1024;
    const y = Math.random() * 1024;
    const r = Math.random() * 3 + 1;
    ctx.fillStyle = Math.random() > 0.5 ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.5)';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = '#a9b0ba';
  ctx.lineWidth = 4;
  const tileSize = 256;
  for(let x=0; x<=1024; x+=tileSize) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 1024); ctx.stroke();
  }
  for(let y=0; y<=1024; y+=tileSize) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(1024, y); ctx.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(10, 10);
  return new THREE.MeshStandardMaterial({
    map: texture,
    roughness: 0.22,
    metalness: 0.04
  });
}

function createSignSprite(label) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#111a2e';
  ctx.beginPath();
  ctx.roundRect(0, 0, 512, 128, 16);
  ctx.fill();
  ctx.strokeStyle = '#f2a93b';
  ctx.lineWidth = 8;
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 64px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, 256, 64);
  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.35), material);
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

const LibraryWayfinder = forwardRef(({ routeTo, routeFrom = 'entrance', onRackClick, onRouteComplete, activeFloor = 'both', overrideConfig }, ref) => {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const minimapCameraRef = useRef(null);
  const clockRef = useRef(new THREE.Clock());
  const orbitRef = useRef({ theta: Math.PI * 0.28, phi: 1.02, radius: 46, target: new THREE.Vector3(0, 4, 0), minPhi: 0.15, maxPhi: 1.55, minR: 4, maxR: 100 });
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
    } else {
      fetch('/api/admin/architecture', { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } })
        .then(res => res.json())
        .then(data => {
           setConfig(data);
           setGraphData(buildDynamicGraph(data));
        })
        .catch(err => console.error("Failed to fetch layout config", err));
    }
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

    let endNode = destCode;
    if (destCode.toUpperCase().startsWith('STAIRS')) {
      const floorMatch = destCode.match(/\d+/);
      const floorNum = floorMatch ? parseInt(floorMatch[0], 10) : 1;
      const allStairs = Object.keys(nodes).filter(k => k.startsWith('stairs') && nodes[k].floor === floorNum && !k.endsWith('_dest'));
      if (allStairs.length > 0) endNode = allStairs[0];
    } else {
      endNode = 'r' + destCode;
      if (!nodes[endNode]) {
         const matchingNode = Object.keys(nodes).find(k => nodes[k].type === 'rack' && 
            (nodes[k].label.toUpperCase() === destCode.toUpperCase() || 
             nodes[k].label.toUpperCase() === 'RACK ' + destCode.toUpperCase() || 
             (nodes[k].code && nodes[k].code.toUpperCase() === destCode.toUpperCase())));
         if (matchingNode) endNode = matchingNode;
      }
    }
    
    if (!nodes[endNode]) {
      console.warn('[LibraryWayfinder] Destination node not found:', endNode, 'from requested:', destCode);
      return;
    }

    let resolvedFrom = fromId;
    if (!nodes[resolvedFrom]) {
      let entranceKey = null;
      if (resolvedFrom.startsWith('stairs')) {
          const floorMatch = resolvedFrom.match(/\d+/);
          const floorNum = floorMatch ? parseInt(floorMatch[0], 10) : 1;
          const allStairs = Object.keys(nodes).filter(k => k.startsWith('stairs') && nodes[k].floor === floorNum && !k.endsWith('_dest'));
          if (allStairs.length > 0) entranceKey = allStairs[0];
          else entranceKey = Object.keys(nodes).find(k => k.type === 'entrance');
      } else {
          entranceKey = Object.keys(nodes).find(k => k.type === 'entrance');
      }
      if (entranceKey) resolvedFrom = entranceKey;
      else return; 
    }

    console.log('[LibraryWayfinder] drawRoute -> resolvedFrom:', resolvedFrom, 'endNode:', endNode);

    const result = dijkstra(nodes, resolvedFrom, endNode);
    console.log('[LibraryWayfinder] dijkstra result:', result);
    if (!result) return;

    const steps = generateDirections(result.path, nodes);
    setDirections(steps);
    setRouteInfo({ destination: destCode, distance: Math.round(result.distance), steps: steps.length, floor: nodes[endNode] ? nodes[endNode].floor : 1 });

    const nodePos = (id) => {
      const n = nodes[id];
      return new THREE.Vector3(n.x, n.y + 0.03, n.z);
    };

    const pts = result.path.map(nodePos);
    if (pts.length === 1) {
       pts.push(pts[0].clone().add(new THREE.Vector3(0, 0.1, 0))); // Prevent curve crash for single-node paths
    }
    const curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.15);
    routeCurveRef.current = curve;

    const totalLen = curve.getLength();
    
    // Thicker, brighter route tube
    const tubeGeo = new THREE.TubeGeometry(curve, Math.max(64, result.path.length * 12), 0.18, 12, false);
    const tubeMat = new THREE.MeshBasicMaterial({ color: 0xf2a93b, transparent: true, opacity: 0.92 });
    const routeTube = new THREE.Mesh(tubeGeo, tubeMat);
    routeTube.geometry.setDrawRange(0, 0);
    scene.add(routeTube);
    routeObjsRef.current.tube = routeTube;

    // Outer glow tube for visibility
    const glowGeo = new THREE.TubeGeometry(curve, Math.max(64, result.path.length * 12), 0.38, 12, false);
    const glowMat = new THREE.MeshBasicMaterial({ color: 0xf2a93b, transparent: true, opacity: 0.18 });
    const glowTube = new THREE.Mesh(glowGeo, glowMat);
    glowTube.geometry.setDrawRange(0, 0);
    scene.add(glowTube);
    routeObjsRef.current.glow = glowTube;

    // Comet
    const cometGroup = new THREE.Group();
    const headMat = new THREE.MeshBasicMaterial({ color: 0xfff2d8 });
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.35, 16, 16), headMat);
    cometGroup.add(head);
    const trail = [];
    for (let i = 1; i <= 8; i++) {
      const m = new THREE.Mesh(
        new THREE.SphereGeometry(0.28 - i * 0.028, 12, 12),
        new THREE.MeshBasicMaterial({ color: 0xf2a93b, transparent: true, opacity: 0.6 - i * 0.065 })
      );
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
      if (destMesh) {
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
    const duration = Math.min(6, result.path.length * 0.4);
    
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
      
      // Animate path drawing and comet
      const t = Math.min(1, bT / duration);
      const maxCount = tubeGeo.index ? tubeGeo.index.count : tubeGeo.attributes.position.count;
      const drawCount = Math.floor(maxCount * t);
      routeTube.geometry.setDrawRange(0, drawCount);
      glowTube.geometry.setDrawRange(0, drawCount);
      
      const p = curve.getPointAt(t);
      cometGroup.position.copy(p);
      trailPts.unshift(p.clone());
      if (trailPts.length > 60) trailPts.pop();
      trail.forEach((m, i) => {
        const idx = Math.min(trailPts.length - 1, (i + 1) * 4);
        if (trailPts[idx]) m.position.copy(trailPts[idx]).sub(p);
      });

      // Camera fly-to animation
      const fly = flyToRef.current;
      if (fly && fly.progress < 1) {
        fly.progress = Math.min(1, fly.progress + 0.012);
        const ease = 1 - Math.pow(1 - fly.progress, 3); // ease-out cubic
        if (orbitRef.current && orbitRef.current.target) {
            orbitRef.current.target.lerp(fly.target, ease * 0.04);
            orbitRef.current.radius += (fly.radius - orbitRef.current.radius) * ease * 0.04;
        }
      } else if (orbitRef.current && orbitRef.current.target) {
        // Gentle follow after fly-to completes
        orbitRef.current.target.lerp(p, 0.015);
      }
      updateCamera();
      
      routeObjsRef.current.animId = requestAnimationFrame(animate);
    }
    animate();
    
    if (onRouteComplete) onRouteComplete(destCode, steps);
  }, [clearRoute, onRouteComplete]);

  useEffect(() => {
    if (!mountRef.current || !config || !graphData) return;
    const container = mountRef.current;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    // Disabled shadow map for massive performance boost on lower-end devices
    renderer.shadowMap.enabled = false;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;
    container.appendChild(renderer.domElement);
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0e1a);
    scene.fog = new THREE.FogExp2(0x0a0e1a, 0.008);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 500);
    cameraRef.current = camera;
    
    const minimapCamera = new THREE.OrthographicCamera(-20, 20, 20, -20, 1, 100);
    minimapCamera.position.set(0, 60, 0);
    minimapCamera.lookAt(0, 0, 0);
    minimapCameraRef.current = minimapCamera;

    scene.add(new THREE.AmbientLight(0x8892b0, 0.6));
    const sun = new THREE.DirectionalLight(0xfff2d8, 0.7);
    sun.position.set(30, 50, 20);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -35; sun.shadow.camera.right = 35;
    sun.shadow.camera.top = 35; sun.shadow.camera.bottom = -35;
    sun.shadow.camera.far = 120;
    scene.add(sun);
    
    const hemi = new THREE.HemisphereLight(0x87ceeb, 0x362a1f, 0.3);
    scene.add(hemi);

    const rackGroups = { 1: new THREE.Group(), 2: new THREE.Group() };
    rackGroupsRef.current = rackGroups;
    scene.add(rackGroups[1], rackGroups[2]);

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
        
        const ceilGeo = new THREE.PlaneGeometry(slabWidth, slabDepth);
        const ceilMat = new THREE.MeshBasicMaterial({ color: 0x1a2030, transparent: true, opacity: 0.4, side: THREE.DoubleSide });
        const ceil = new THREE.Mesh(ceilGeo, ceilMat);
        ceil.rotation.x = Math.PI / 2;
        ceil.position.set(0, fy + 4.0, 0);
        rackGroupsRef.current[f+1].add(ceil);
        
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
                const diffuserMat = new THREE.MeshBasicMaterial({ color: 0xfffaed, emissive: 0xfffaed, emissiveIntensity: 1.5 });
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
               
               const backGeo = new THREE.BoxGeometry(3.3, 2.5, 0.04);
               const backPanel = new THREE.Mesh(backGeo, woodMat.clone());
               backPanel.position.set(0, 1.25, -0.53);
               rackGroup.add(backPanel);

               const panelGeo = new THREE.BoxGeometry(0.06, 2.5, 1.1);
               const leftPanel = new THREE.Mesh(panelGeo, woodMat);
               leftPanel.position.set(-1.62, 1.25, 0);
               const rightPanel = new THREE.Mesh(panelGeo, woodMat);
               rightPanel.position.set(1.62, 1.25, 0);
               rackGroup.add(leftPanel);
               rackGroup.add(rightPanel);
               
               const shelfGeo = new THREE.BoxGeometry(3.3, 0.04, 1.1);
               const shelves = new THREE.Group();
               for(let s=0; s<4; s++) {
                 const shelf = new THREE.Mesh(shelfGeo, woodMat);
                 shelf.position.y = 0.4 + s * 0.6;
                 shelves.add(shelf);
               }
               rackGroup.add(shelves);

               const bookGeo = new THREE.BoxGeometry(1, 1, 1);
               const instMesh = new THREE.InstancedMesh(bookGeo, new THREE.MeshStandardMaterial({ roughness: 0.8 }), 120);
               let bookIdx = 0;
               const matrix = new THREE.Matrix4();
               const q = new THREE.Quaternion();
               for(let s=0; s<4; s++) {
                 let bx = -1.5;
                 const sy = 0.4 + s * 0.6 + 0.02;
                 while(bx < 1.5 && bookIdx < 120) {
                   const thickness = 0.04 + Math.random() * 0.03;
                   const height = 0.20 + Math.random() * 0.14;
                   const depth = 0.5 + Math.random() * 0.4;
                   let rotZ = 0;
                   if (Math.random() < 0.08) rotZ = (Math.random() > 0.5 ? 1 : -1) * 0.2;
                   q.setFromAxisAngle(new THREE.Vector3(0, 0, 1), rotZ);
                   matrix.compose(new THREE.Vector3(bx + thickness/2, sy + height/2, 0), q, new THREE.Vector3(thickness, height, depth));
                   instMesh.setMatrixAt(bookIdx, matrix);
                   instMesh.setColorAt(bookIdx, bookColors[Math.floor(Math.random() * bookColors.length)]);
                   bx += thickness + 0.005;
                   bookIdx++;
                 }
               }
               instMesh.count = bookIdx;
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

    const topFloorY = floorHeights.length > 0 ? floorHeights[floorHeights.length - 1] : 0;
    const envelopeHeight = topFloorY + 6;
    // Removed expensive transmission (which forces multi-pass rendering) for a huge performance boost
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x9fd7ff, transparent: true, opacity: 0.15, side: THREE.DoubleSide, roughness: 0.1, metalness: 0.8 });
    
    const wGeo = new THREE.BoxGeometry(slabWidth + 2, envelopeHeight, 0.1);
    const frontWall = new THREE.Mesh(wGeo, glassMat);
    frontWall.position.set(0, envelopeHeight/2 - 0.5, slabDepth/2 + 1);
    scene.add(frontWall);
    const backWall = new THREE.Mesh(wGeo, glassMat);
    backWall.position.set(0, envelopeHeight/2 - 0.5, -(slabDepth/2 + 1));
    scene.add(backWall);
    const sideGeo = new THREE.BoxGeometry(0.1, envelopeHeight, slabDepth + 2);
    const leftWall = new THREE.Mesh(sideGeo, glassMat);
    leftWall.position.set(-(slabWidth/2 + 1), envelopeHeight/2 - 0.5, 0);
    scene.add(leftWall);
    const rightWall = new THREE.Mesh(sideGeo, glassMat);
    rightWall.position.set(slabWidth/2 + 1, envelopeHeight/2 - 0.5, 0);
    scene.add(rightWall);

    const frameMat = new THREE.LineBasicMaterial({ color: 0x888888 });
    const addFrame = (mesh, geo) => {
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo), frameMat);
      edges.position.copy(mesh.position);
      scene.add(edges);
    };
    addFrame(frontWall, wGeo); addFrame(backWall, wGeo); addFrame(leftWall, sideGeo); addFrame(rightWall, sideGeo);

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
      if (Math.abs(e.clientX - drag.startX) > 4 || Math.abs(e.clientY - drag.startY) > 4) return;
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

    return () => {
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
    if (routeTo) {
      let normalizedTo = routeTo.toUpperCase().replace(/[\s_]+/g, '');
      const toMatch = normalizedTo.match(/^(?:RACK|R)?([A-Z][0-9]+)$/);
      if (toMatch) {
        normalizedTo = toMatch[1];
      }
      let normalizedFrom = 'entrance';
      if (routeFrom) {
         const f = String(routeFrom).toLowerCase();
         const floorMatch = f.match(/floor\s*(\d+)/) || f.match(/stairs(\d+)/);
         if (floorMatch) normalizedFrom = 'stairs' + floorMatch[1];
         else if (f === 'entrance') normalizedFrom = 'entrance';
         else {
            let rackMatch = f.match(/r?([a-d])\s*(\d)/);
            if (rackMatch) {
               normalizedFrom = 'r' + rackMatch[1].toUpperCase() + rackMatch[2];
            } else {
               normalizedFrom = String(routeFrom);
            }
         }
      }
      drawRoute(normalizedTo, normalizedFrom);
    }
  }, [routeTo, routeFrom, drawRoute]);

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
