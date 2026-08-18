import React, { useEffect, useRef, useCallback, useState, useImperativeHandle, forwardRef } from 'react';
import * as THREE from 'three';

/* ============================================================
   DYNAMIC WAYFINDING GRAPH DATA
   ============================================================ */

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
      if(config.cols_per_row > 1) {
          addEdge('entrance_0', 'aisle_f1_r0_c' + Math.floor(config.cols_per_row/2));
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


/* ============================================================
   LABEL SPRITES
   ============================================================ */
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

/* ============================================================
   REACT COMPONENT
   ============================================================ */
const LibraryWayfinder = forwardRef(({ routeTo, routeFrom = 'entrance', onRackClick, onRouteComplete, activeFloor = 'both', overrideConfig }, ref) => {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const clockRef = useRef(new THREE.Clock());
  const orbitRef = useRef({ theta: Math.PI * 0.28, phi: 1.02, radius: 46, target: new THREE.Vector3(0, 4, 0), minPhi: 0.15, maxPhi: 1.55, minR: 4, maxR: 100 });
  const rackMeshByCodeRef = useRef({});
  const rackGroupsRef = useRef({});
  const routeObjsRef = useRef({ tube: null, comet: null, ring: null, glow: null, beacon: null, beaconAnim: null, animId: null });
  const lastRouteRef = useRef(null);
  const dragRef = useRef({ dragging: false, panning: false, lastX: 0, lastY: 0 });
  const flyToRef = useRef(null);
  const reqIdRef = useRef(null);

  const [directions, setDirections] = useState(null);
  const [routeInfo, setRouteInfo] = useState(null);
  const [config, setConfig] = useState(null);
  const [graphData, setGraphData] = useState(null);

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


  // Expose methods to parent via ref
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

  const handleFloorChange = useCallback((floor) => {
    const rg = rackGroupsRef.current;
    if (!rg[1] || !rg[2]) return;
    const setOpacity = (group, op) => {
      group.traverse(o => {
        if (o.isMesh) {
          o.material.transparent = op < 1;
          o.material.opacity = op;
        }
      });
    };
    rg[1].visible = true;
    rg[2].visible = true;
    setOpacity(rg[1], floor === '2' ? 0.12 : 1);
    setOpacity(rg[2], floor === '1' ? 0.12 : 1);
  }, []);

  // Clear route
  const clearRoute = useCallback(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    const ro = routeObjsRef.current;
    [ro.tube, ro.comet, ro.ring, ro.glow, ro.beacon].forEach(o => { if (o) scene.remove(o); });
    ro.tube = null; ro.comet = null; ro.ring = null; ro.glow = null; ro.beacon = null;
    if (ro.animId) cancelAnimationFrame(ro.animId);
    if (ro.beaconAnim) cancelAnimationFrame(ro.beaconAnim);
    ro.beaconAnim = null;
    Object.values(rackMeshByCodeRef.current).forEach(g => {
      if (g.children[0]) {
        g.children[0].material.emissive.setHex(0x000000);
        g.children[0].material.emissiveIntensity = 0;
      }
    });
    setDirections(null);
    setRouteInfo(null);
  }, []);

  // Draw route
  const drawRoute = useCallback((destCode, fromId = 'entrance') => {
    const scene = sceneRef.current;
    const clock = clockRef.current;
    if (!scene || !graphData || !graphData.nodes) return;
    const nodes = graphData.nodes;

    clearRoute();

    const endNode = 'r' + destCode;
    if (!nodes[endNode]) return;

    // Resolve fromId: 'entrance' may actually be 'entrance_0', 'entrance_1', etc.
    let resolvedFrom = fromId;
    if (!nodes[resolvedFrom]) {
      // Try matching by prefix or by type
      const entranceKey = Object.keys(nodes).find(k => k.startsWith(resolvedFrom) || (resolvedFrom === 'entrance' && nodes[k].type === 'entrance'));
      if (entranceKey) resolvedFrom = entranceKey;
      else return; // no valid start node
    }

    const result = dijkstra(nodes, resolvedFrom, endNode);
    if (!result) return;

    const steps = generateDirections(result.path);
    setDirections(steps);
    setRouteInfo({ destination: destCode, distance: Math.round(result.distance), steps: steps.length, floor: nodes[endNode] ? nodes[endNode].floor : 1 });

    const nodePos = (id) => {
      const n = nodes[id];
      return new THREE.Vector3(n.x, n.y + 0.9, n.z);
    };

    const pts = result.path.map(nodePos);
    const curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.15);
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

    // Highlight destination rack with strong emissive
    if (rackMeshByCodeRef.current[destCode]) {
      const destMesh = rackMeshByCodeRef.current[destCode].children[0];
      destMesh.material.emissive.setHex(0xe2665f);
      destMesh.material.emissiveIntensity = 0.8;
    }

    // Pulsing beacon column on destination rack
    const destNode = nodes[endNode];
    const beaconGroup = new THREE.Group();
    beaconGroup.position.set(destNode.x, destNode.y - 0.15, destNode.z);
    // Vertical light pillar
    const pillarGeo = new THREE.CylinderGeometry(0.08, 0.08, 5, 16);
    const pillarMat = new THREE.MeshBasicMaterial({ color: 0xe2665f, transparent: true, opacity: 0.4 });
    const pillar = new THREE.Mesh(pillarGeo, pillarMat);
    pillar.position.y = 2.5;
    beaconGroup.add(pillar);
    // Ground ring
    for (let i = 0; i < 2; i++) {
      const ringGeo = new THREE.RingGeometry(0.8 + i * 0.6, 1.0 + i * 0.6, 32);
      const ringMat = new THREE.MeshBasicMaterial({ color: 0xe2665f, transparent: true, opacity: 0.35, side: THREE.DoubleSide });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.05;
      ring.userData.baseScale = 1;
      ring.userData.idx = i;
      beaconGroup.add(ring);
    }
    // Diamond marker on top
    const diamondGeo = new THREE.OctahedronGeometry(0.35, 0);
    const diamondMat = new THREE.MeshBasicMaterial({ color: 0xff6655, transparent: true, opacity: 0.85 });
    const diamond = new THREE.Mesh(diamondGeo, diamondMat);
    diamond.position.y = 5.2;
    beaconGroup.add(diamond);
    scene.add(beaconGroup);
    routeObjsRef.current.beacon = beaconGroup;

    // Beacon pulse animation
    const beaconClock = clock;
    const beaconStartT = beaconClock.getElapsedTime();
    function animateBeacon() {
      const bT = beaconClock.getElapsedTime() - beaconStartT;
      // Pulse rings
      beaconGroup.children.forEach(child => {
        if (child.geometry && child.geometry.type === 'RingGeometry') {
          const phase = (bT + child.userData.idx * 0.5) % 1.8;
          const s = 1 + phase * 0.6;
          child.scale.set(s, s, s);
          child.material.opacity = Math.max(0, 0.35 * (1 - phase / 1.8));
        }
      });
      // Rotate diamond
      diamond.rotation.y = bT * 1.5;
      diamond.position.y = 5.2 + Math.sin(bT * 2) * 0.3;
      // Pulse pillar
      pillarMat.opacity = 0.25 + Math.sin(bT * 3) * 0.15;
      routeObjsRef.current.beaconAnim = requestAnimationFrame(animateBeacon);
    }
    animateBeacon();

    // Camera fly-to: smoothly zoom and orbit to frame the route
    const endPos = new THREE.Vector3(destNode.x, destNode.y + 2, destNode.z);
    const midIdx = Math.floor(pts.length / 2);
    const midPt = pts[midIdx] || endPos;
    const routeCenter = new THREE.Vector3().addVectors(midPt, endPos).multiplyScalar(0.5);
    const routeSpan = Math.max(8, new THREE.Vector3().subVectors(pts[0], endPos).length());
    const targetRadius = Math.min(50, Math.max(12, routeSpan * 1.6));
    flyToRef.current = { target: routeCenter, radius: targetRadius, progress: 0 };

    const totalLen = curve.getLength();
    const speed = 9;
    const duration = Math.max(1.8, totalLen / speed);
    const trailPts = [];
    const startT = clock.getElapsedTime();

    function animate() {
      const t = Math.min(1, (clock.getElapsedTime() - startT) / duration);
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

      // Smooth camera fly-to during animation
      const fly = flyToRef.current;
      if (fly && fly.progress < 1) {
        fly.progress = Math.min(1, fly.progress + 0.012);
        const ease = 1 - Math.pow(1 - fly.progress, 3); // ease-out cubic
        orbitRef.current.target.lerp(fly.target, ease * 0.04);
        orbitRef.current.radius += (fly.radius - orbitRef.current.radius) * ease * 0.04;
      } else {
        // Gentle follow after fly-to completes
        orbitRef.current.target.lerp(p, 0.015);
      }
      updateCamera();

      if (t < 1) {
        routeObjsRef.current.animId = requestAnimationFrame(animate);
      } else {
        spawnArrivalRing(p);
        // Final zoom to destination
        flyToRef.current = { target: endPos, radius: Math.max(12, targetRadius * 0.6), progress: 0 };
        if (onRouteComplete) onRouteComplete(destCode, steps);
      }
    }
    animate();
  }, [clearRoute, updateCamera, onRouteComplete]);

  const spawnArrivalRing = useCallback((pos) => {
    const scene = sceneRef.current;
    const clock = clockRef.current;
    if (!scene) return;

    const ringGroup = new THREE.Group();
    ringGroup.position.copy(pos);
    scene.add(ringGroup);
    routeObjsRef.current.ring = ringGroup;

    const rings = [];
    for (let i = 0; i < 3; i++) {
      const geo = new THREE.RingGeometry(0.2, 0.32, 32);
      const mat = new THREE.MeshBasicMaterial({ color: 0xe2665f, transparent: true, opacity: 0.9, side: THREE.DoubleSide });
      const ring = new THREE.Mesh(geo, mat);
      ring.rotation.x = -Math.PI / 2;
      ring.userData.delay = i * 0.35;
      ringGroup.add(ring);
      rings.push(ring);
    }
    const start = clock.getElapsedTime();
    function pulse() {
      const el = clock.getElapsedTime() - start;
      rings.forEach(r => {
        const t = ((el - r.userData.delay) % 1.4);
        if (t >= 0) {
          const s = 1 + t * 3.2;
          r.scale.set(s, s, s);
          r.material.opacity = Math.max(0, 0.9 * (1 - t / 1.4));
        }
      });
      if (el < 4.2) { requestAnimationFrame(pulse); }
      else { scene.remove(ringGroup); }
    }
    pulse();
  }, []);

  // Initialize scene
  useEffect(() => {
    if (!mountRef.current || !config || !graphData) return;
    const container = mountRef.current;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;
    container.appendChild(renderer.domElement);
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.borderRadius = 'inherit';

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0e1a);
    scene.fog = new THREE.FogExp2(0x0a0e1a, 0.0105);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 400);
    cameraRef.current = camera;

    // Lighting
    scene.add(new THREE.AmbientLight(0x8892b0, 0.55));
    const sun = new THREE.DirectionalLight(0xfff2d8, 0.9);
    sun.position.set(30, 50, 20);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -35; sun.shadow.camera.right = 35;
    sun.shadow.camera.top = 35; sun.shadow.camera.bottom = -35;
    sun.shadow.camera.far = 120;
    scene.add(sun);
    const rim = new THREE.DirectionalLight(0x3fa796, 0.35);
    rim.position.set(-25, 20, -25);
    scene.add(rim);
    // Build graph
    // (Nodes are already generated in graphData)
    // Rack groups
    const rackGroups = { 1: new THREE.Group(), 2: new THREE.Group() };
    rackGroupsRef.current = rackGroups;
    scene.add(rackGroups[1], rackGroups[2]);

    const { nodes, floorHeights, COLS_X, rowZOffsets } = graphData;
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

    // Floor groups (one per floor)
    rackGroupsRef.current = {};
    for(let f=0; f<config.floors; f++) {
        const floorGroup = new THREE.Group();
        scene.add(floorGroup);
        rackGroupsRef.current[f+1] = floorGroup;
    }

    // ── Floor Slabs with Grid Overlays ──
    const slabWidth = Math.max(41, (config.cols_per_row * 5.2) + 12);
    const slabDepth = Math.max(28.5, (config.rows_per_floor * 9.4) + 10);
    for(let f=0; f<config.floors; f++) {
        const fy = floorHeights[f];
        // Solid slab
        const slabGeo = new THREE.BoxGeometry(slabWidth, 0.4, slabDepth);
        const slabMat = new THREE.MeshPhongMaterial({ color: f === 0 ? 0x131c30 : 0x121b2c, shininess: 15 });
        const slab = new THREE.Mesh(slabGeo, slabMat);
        slab.position.set(0, fy - 0.25, 0);
        slab.receiveShadow = true;
        rackGroupsRef.current[f+1].add(slab);
        // Grid overlay
        const grid = new THREE.GridHelper(slabWidth - 1, 20, 0x24314d, 0x1a2338);
        grid.position.set(0, fy - 0.02, 0);
        rackGroupsRef.current[f+1].add(grid);
        // Floor label plate
        const floorLabel = makeLabel('FLOOR ' + (f+1), { bg: '#111a2e', fg: '#f2a93b', scale: 1.3 });
        floorLabel.position.set(-(slabWidth/2) + 2, fy + 2.2, -(slabDepth/2) + 0.5);
        rackGroupsRef.current[f+1].add(floorLabel);
    }

    // ── Build Racks (Prototype Style: grouped body + shelf lines + colored labels) ──
    let rackCodeIndex = 0;
    const floorColors = [0xa9743f, 0x3f8f94, 0x7f5f9f, 0x5f7f3f, 0x9f3f5f, 0x3f5f9f, 0x9f7f3f, 0x5f3f9f, 0x3f9f5f, 0x9f5f3f];
    const labelBgColors = ['#f2a93b', '#5fd6c9', '#c49bff', '#a8d65f', '#ff7f9f', '#7fb5ff', '#ffc46b', '#b87fff', '#6bffb8', '#ffb87f'];

    for(let f=0; f<config.floors; f++) {
        const fy = floorHeights[f];
        const bodyColor = floorColors[f % floorColors.length];
        const labelBg = labelBgColors[f % labelBgColors.length];

        for(let r=0; r<config.rows_per_floor; r++) {
            const rz = rowZOffsets[r];
            const rowLetter = alphabet[rackCodeIndex % alphabet.length];
            rackCodeIndex++;

            for(let c=0; c<config.cols_per_row; c++) {
               const cx = COLS_X[c];
               const code = rowLetter + (c+1);

               // Rack group (body + shelves + label)
               const rackGroup = new THREE.Group();
               rackGroup.position.set(cx, fy, rz);
               rackGroup.userData = { rackCode: code, floor: f+1, baseColor: bodyColor };

               // Body
               const bodyGeo = new THREE.BoxGeometry(3.3, 2.5, 1.1);
               const bodyMat = new THREE.MeshPhongMaterial({ color: bodyColor, shininess: 25 });
               const body = new THREE.Mesh(bodyGeo, bodyMat);
               body.position.y = 1.25;
               body.castShadow = true;
               body.receiveShadow = true;
               rackGroup.add(body);

               // Shelf lines
               const shelfEdgeMat = new THREE.LineBasicMaterial({ color: 0x1a120a, transparent: true, opacity: 0.35 });
               for(let s=1; s<4; s++) {
                   const shelfGeo = new THREE.EdgesGeometry(new THREE.PlaneGeometry(3.15, 1.0));
                   const shelf = new THREE.LineSegments(shelfGeo, shelfEdgeMat);
                   shelf.rotation.x = Math.PI / 2;
                   shelf.position.set(0, s * 0.6, 0);
                   rackGroup.add(shelf);
               }

               // Label
               const customName = config.custom_racks && config.custom_racks[code] ? config.custom_racks[code] : code;
               const lblScale = customName.length > 5 ? 0.6 : 0.9;
               const lbl = makeLabel(customName, { bg: labelBg, fg: '#151109', scale: lblScale });
               lbl.position.set(0, 3.05, 0);
               rackGroup.add(lbl);

               rackMeshByCodeRef.current[code] = rackGroup;
               rackGroupsRef.current[f+1].add(rackGroup);
            }
        }
    }

    // ── Glass Envelope (once, outside rack loop) ──
    const topFloorY = floorHeights.length > 0 ? floorHeights[floorHeights.length - 1] : 0;
    const envelopeHeight = topFloorY + 6;
    const shellMat = new THREE.MeshPhongMaterial({ color: 0x9fd7ff, transparent: true, opacity: 0.045, side: THREE.DoubleSide, shininess: 80 });
    const shellGeo = new THREE.BoxGeometry(slabWidth + 2, envelopeHeight, slabDepth + 2);
    const shell = new THREE.Mesh(shellGeo, shellMat);
    shell.position.set(0, envelopeHeight / 2 - 0.5, 0);
    scene.add(shell);
    const shellEdges = new THREE.LineSegments(new THREE.EdgesGeometry(shellGeo), new THREE.LineBasicMaterial({ color: 0x3a4a70, transparent: true, opacity: 0.5 }));
    shellEdges.position.copy(shell.position);
    scene.add(shellEdges);

    // ── Render POIs (Entrance Pins & Staircases) ──
    if (graphData && graphData.nodes) {
       Object.keys(graphData.nodes).forEach(k => {
           const n = graphData.nodes[k];

           if (n.type === 'entrance') {
               // Emissive pin with label (prototype style)
               const pinGroup = new THREE.Group();
               const cone = new THREE.Mesh(
                 new THREE.ConeGeometry(0.45, 1.1, 16),
                 new THREE.MeshPhongMaterial({ color: 0x5fe3a0, emissive: 0x5fe3a0, emissiveIntensity: 0.35 })
               );
               cone.position.y = 0.55;
               pinGroup.add(cone);
               const pinLabel = makeLabel('ENTRANCE', { bg: '#111a2e', fg: '#eae6da', scale: 0.65 });
               pinLabel.position.y = 1.5;
               pinGroup.add(pinLabel);
               pinGroup.position.set(n.x, n.y, n.z);
               scene.add(pinGroup);

           } else if (n.type === 'stairs' && !k.endsWith('_dest')) {
               // Stepped staircase geometry (prototype style)
               const stairGroup = new THREE.Group();
               const stairMat = new THREE.MeshPhongMaterial({ color: 0x6b7590, shininess: 40 });
               const stepCount = 8;
               const totalStairHeight = 6.4; // height per floor
               for(let s=0; s<stepCount; s++) {
                   const step = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.22, 0.9), stairMat);
                   step.position.set(0, (s+1) * (totalStairHeight / stepCount), -2.6 + s * 0.72);
                   step.castShadow = true;
                   stairGroup.add(step);
               }
               stairGroup.position.set(n.x, n.y, n.z);
               scene.add(stairGroup);
               // Staircase label
               const stairLabel = makeLabel('STAIRS', { bg: '#111a2e', fg: '#eae6da', scale: 0.6 });
               stairLabel.position.set(n.x, n.y + totalStairHeight + 1, n.z);
               scene.add(stairLabel);
           }
       });
    }

    // Camera orbit controls
    const canvas = renderer.domElement;
    const drag = dragRef.current;

    const onPointerDown = (e) => {
      // Right-click or middle-click = pan mode
      if (e.button === 2 || e.button === 1) {
        drag.panning = true;
      } else {
        drag.dragging = true;
      }
      drag.startX = e.clientX; drag.startY = e.clientY;
      drag.lastX = e.clientX; drag.lastY = e.clientY;
      canvas.setPointerCapture(e.pointerId);
    };
    const onPointerUp = () => { drag.dragging = false; drag.panning = false; };
    const onPointerMove = (e) => {
      if (!drag.dragging && !drag.panning) return;
      const dx = e.clientX - drag.lastX, dy = e.clientY - drag.lastY;
      drag.lastX = e.clientX; drag.lastY = e.clientY;
      const orbit = orbitRef.current;
      if (drag.panning) {
        // Pan: shift the orbit target along the camera plane
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
        // Orbit
        orbit.theta -= dx * 0.0055;
        orbit.phi = Math.min(orbit.maxPhi, Math.max(orbit.minPhi, orbit.phi - dy * 0.0045));
      }
      updateCamera();
    };
    const onWheel = (e) => {
      e.preventDefault();
      const orbit = orbitRef.current;
      // Zoom speed scales with distance for smooth close-up zoom
      const zoomSpeed = Math.max(0.005, orbit.radius * 0.0008);
      orbit.radius = Math.min(orbit.maxR, Math.max(orbit.minR, orbit.radius + e.deltaY * zoomSpeed));
      updateCamera();
    };
    const onContextMenu = (e) => e.preventDefault();

    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    canvas.addEventListener('contextmenu', onContextMenu);

    // Rack click
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const onClick = (e) => {
      if (Math.abs(e.clientX - drag.startX) > 4 || Math.abs(e.clientY - drag.startY) > 4) return;
      const rect = container.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const objs = [];
      Object.values(rackMeshByCodeRef.current).forEach(g => objs.push(g.children[0]));
      const hits = raycaster.intersectObjects(objs);
      if (hits.length) {
        const code = hits[0].object.parent.userData.rackCode;
        if (onRackClick) onRackClick(code);
      }
    };
    canvas.addEventListener('click', onClick);

    // Resize
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

    // Render loop with smooth fly-to
    function loop() {
      reqIdRef.current = requestAnimationFrame(loop);
      // Continuous fly-to interpolation (post-route arrival zoom)
      const fly = flyToRef.current;
      if (fly && fly.progress < 1) {
        fly.progress = Math.min(1, fly.progress + 0.015);
        const ease = 1 - Math.pow(1 - fly.progress, 3);
        orbitRef.current.target.lerp(fly.target, ease * 0.06);
        orbitRef.current.radius += (fly.radius - orbitRef.current.radius) * ease * 0.06;
        updateCamera();
      }
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
  }, [updateCamera, onRackClick, config, graphData]);

  // Handle routeTo prop changes
  useEffect(() => {
    if (routeTo) {
      // Normalize the rack code (handle both "C3" and "C 3" and "c3", as well as "Rack_C3" or "RACK C3")
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

  // Handle floor changes
  useEffect(() => {
    handleFloorChange(activeFloor);
  }, [activeFloor, handleFloorChange]);

  return (
    <div
      ref={mountRef}
      className="w-full h-full rounded-xl overflow-hidden"
      style={{ touchAction: 'none', cursor: 'grab', minHeight: '300px' }}
    />
  );
});

LibraryWayfinder.displayName = 'LibraryWayfinder';
export default LibraryWayfinder;
