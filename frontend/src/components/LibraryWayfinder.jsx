import React, { useEffect, useRef, useCallback, useState, useImperativeHandle, forwardRef } from 'react';
import * as THREE from 'three';

/* ============================================================
   WAYFINDING GRAPH DATA
   ============================================================ */
const FLOOR1_Y = 0;
const FLOOR2_Y = 6.4;
const COLS_X = [-13, -7.8, -2.6, 2.6, 7.8, 13];

function buildGraph() {
  const nodes = {};
  function addNode(id, x, y, z, label) {
    nodes[id] = { x, y: y + 0.15, z, label: label || id, edges: [] };
  }
  function addEdge(a, b, w) {
    const wt = w ?? Math.hypot(nodes[a].x - nodes[b].x, nodes[a].y - nodes[b].y, nodes[a].z - nodes[b].z);
    nodes[a].edges.push({ to: b, w: wt });
    nodes[b].edges.push({ to: a, w: wt });
  }

  addNode('entrance', 0, FLOOR1_Y, -13.2, 'Entrance');
  addNode('stairs1', 13, FLOOR1_Y, 0, 'Staircase · Floor 1');
  addNode('stairs2', 13, FLOOR2_Y, 0, 'Staircase · Floor 2');

  COLS_X.forEach((x, i) => {
    addNode('cs1_' + i, x, FLOOR1_Y, -3, 'Aisle F1 col' + i);
    addNode('cn1_' + i, x, FLOOR1_Y, 3, 'Aisle F1 col' + i);
    addNode('cs2_' + i, x, FLOOR2_Y, -3, 'Aisle F2 col' + i);
    addNode('cn2_' + i, x, FLOOR2_Y, 3, 'Aisle F2 col' + i);
    addNode('rA' + (i + 1), x, FLOOR1_Y, -4.7, 'Rack A' + (i + 1));
    addNode('rB' + (i + 1), x, FLOOR1_Y, 4.7, 'Rack B' + (i + 1));
    addNode('rC' + (i + 1), x, FLOOR2_Y, -4.7, 'Rack C' + (i + 1));
    addNode('rD' + (i + 1), x, FLOOR2_Y, 4.7, 'Rack D' + (i + 1));
  });

  for (let i = 0; i < COLS_X.length; i++) {
    addEdge('rA' + (i + 1), 'cs1_' + i);
    addEdge('rB' + (i + 1), 'cn1_' + i);
    addEdge('rC' + (i + 1), 'cs2_' + i);
    addEdge('rD' + (i + 1), 'cn2_' + i);
    addEdge('cs1_' + i, 'cn1_' + i);
    addEdge('cs2_' + i, 'cn2_' + i);
    if (i > 0) {
      addEdge('cs1_' + (i - 1), 'cs1_' + i);
      addEdge('cn1_' + (i - 1), 'cn1_' + i);
      addEdge('cs2_' + (i - 1), 'cs2_' + i);
      addEdge('cn2_' + (i - 1), 'cn2_' + i);
    }
  }
  addEdge('entrance', 'cs1_2');
  addEdge('entrance', 'cs1_3');
  addEdge('stairs1', 'cs1_5');
  addEdge('stairs1', 'cn1_5');
  addEdge('stairs2', 'cs2_5');
  addEdge('stairs2', 'cn2_5');
  addEdge('stairs1', 'stairs2', 9);

  return nodes;
}

function dijkstra(nodes, start, end) {
  const dist_ = {}, prev = {}, visited = new Set();
  Object.keys(nodes).forEach(k => dist_[k] = Infinity);
  dist_[start] = 0;
  const pq = [[0, start]];
  while (pq.length) {
    pq.sort((a, b) => a[0] - b[0]);
    const [d, u] = pq.shift();
    if (visited.has(u)) continue;
    visited.add(u);
    if (u === end) break;
    nodes[u].edges.forEach(({ to, w }) => {
      const nd = d + w;
      if (nd < dist_[to]) { dist_[to] = nd; prev[to] = u; pq.push([nd, to]); }
    });
  }
  if (dist_[end] === Infinity) return null;
  const path = [end]; let cur = end;
  while (cur !== start) { cur = prev[cur]; path.unshift(cur); }
  return { path, distance: dist_[end] };
}

function classify(id) {
  if (id === 'entrance') return { type: 'entrance' };
  if (id === 'stairs1') return { type: 'stairs', floor: 1 };
  if (id === 'stairs2') return { type: 'stairs', floor: 2 };
  const m = id.match(/^r([ABCD])(\d)$/);
  if (m) return { type: 'rack', code: m[1] + m[2] };
  return { type: 'corridor' };
}

function generateDirections(path) {
  const steps = [];
  let prevType = null;
  for (let i = 0; i < path.length; i++) {
    const cl = classify(path[i]);
    if (cl.type === 'entrance') { steps.push('Enter through the main Entrance.'); }
    else if (cl.type === 'rack' && i === path.length - 1) { steps.push(`Arrive at Rack ${cl.code}, Floor ${cl.code >= 'C' ? 2 : 1}.`); }
    else if (cl.type === 'stairs') {
      if (prevType !== 'stairs') steps.push(`Take the staircase ${cl.floor === 2 ? 'up to Floor 2' : 'down to Floor 1'}.`);
    }
    else if (cl.type === 'corridor') {
      if (prevType !== 'corridor') steps.push('Walk through the aisle.');
    }
    prevType = cl.type;
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
const LibraryWayfinder = forwardRef(({ routeTo, routeFrom = 'entrance', onRackClick, onRouteComplete, activeFloor = 'both' }, ref) => {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const clockRef = useRef(new THREE.Clock());
  const orbitRef = useRef({ theta: Math.PI * 0.28, phi: 1.02, radius: 46, target: new THREE.Vector3(0, 4, 0), minPhi: 0.35, maxPhi: 1.45, minR: 14, maxR: 80 });
  const rackMeshByCodeRef = useRef({});
  const rackGroupsRef = useRef({});
  const nodesRef = useRef(null);
  const routeObjsRef = useRef({ tube: null, comet: null, ring: null, animId: null });
  const lastRouteRef = useRef(null);
  const dragRef = useRef({ dragging: false, lastX: 0, lastY: 0 });
  const reqIdRef = useRef(null);

  const [directions, setDirections] = useState(null);
  const [routeInfo, setRouteInfo] = useState(null);

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
    const ro = routeObjsRef.current;
    if (!scene) return;
    [ro.tube, ro.comet, ro.ring].forEach(o => { if (o) scene.remove(o); });
    ro.tube = null; ro.comet = null; ro.ring = null;
    if (ro.animId) cancelAnimationFrame(ro.animId);
    Object.values(rackMeshByCodeRef.current).forEach(g => {
      if (g.children[0]) {
        g.children[0].material.emissive.setHex(0x000000);
      }
    });
    setDirections(null);
    setRouteInfo(null);
  }, []);

  // Draw route
  const drawRoute = useCallback((destCode, fromId = 'entrance') => {
    const scene = sceneRef.current;
    const nodes = nodesRef.current;
    const clock = clockRef.current;
    if (!scene || !nodes) return;

    clearRoute();

    const endNode = 'r' + destCode;
    if (!nodes[endNode]) return;

    const result = dijkstra(nodes, fromId, endNode);
    if (!result) return;

    const steps = generateDirections(result.path);
    setDirections(steps);
    setRouteInfo({ destination: destCode, distance: Math.round(result.distance), steps: steps.length, floor: destCode >= 'C' ? 2 : 1 });

    const nodePos = (id) => {
      const n = nodes[id];
      return new THREE.Vector3(n.x, n.y + 0.9, n.z);
    };

    const pts = result.path.map(nodePos);
    const curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.15);
    const tubeGeo = new THREE.TubeGeometry(curve, Math.max(64, result.path.length * 12), 0.09, 8, false);
    const tubeMat = new THREE.MeshBasicMaterial({ color: 0xf2a93b, transparent: true, opacity: 0.85 });
    const routeTube = new THREE.Mesh(tubeGeo, tubeMat);
    routeTube.geometry.setDrawRange(0, 0);
    scene.add(routeTube);
    routeObjsRef.current.tube = routeTube;

    // Comet
    const cometGroup = new THREE.Group();
    const headMat = new THREE.MeshBasicMaterial({ color: 0xfff2d8 });
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 16), headMat);
    cometGroup.add(head);
    const trail = [];
    for (let i = 1; i <= 6; i++) {
      const m = new THREE.Mesh(
        new THREE.SphereGeometry(0.22 - i * 0.025, 12, 12),
        new THREE.MeshBasicMaterial({ color: 0xf2a93b, transparent: true, opacity: 0.55 - i * 0.08 })
      );
      cometGroup.add(m);
      trail.push(m);
    }
    scene.add(cometGroup);
    routeObjsRef.current.comet = cometGroup;

    // Highlight destination rack
    if (rackMeshByCodeRef.current[destCode]) {
      rackMeshByCodeRef.current[destCode].children[0].material.emissive.setHex(0xe2665f);
      rackMeshByCodeRef.current[destCode].children[0].material.emissiveIntensity = 0.6;
    }

    const totalLen = curve.getLength();
    const speed = 9;
    const duration = Math.max(1.8, totalLen / speed);
    const trailPts = [];
    const startT = clock.getElapsedTime();

    function animate() {
      const t = Math.min(1, (clock.getElapsedTime() - startT) / duration);
      const drawCount = Math.floor(tubeGeo.index.count * t);
      routeTube.geometry.setDrawRange(0, drawCount);
      const p = curve.getPointAt(t);
      cometGroup.position.copy(p);
      trailPts.unshift(p.clone());
      if (trailPts.length > 60) trailPts.pop();
      trail.forEach((m, i) => {
        const idx = Math.min(trailPts.length - 1, (i + 1) * 4);
        if (trailPts[idx]) m.position.copy(trailPts[idx]).sub(p);
      });
      // Gentle camera follow
      orbitRef.current.target.lerp(p, 0.02);
      updateCamera();

      if (t < 1) {
        routeObjsRef.current.animId = requestAnimationFrame(animate);
      } else {
        spawnArrivalRing(p);
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
    if (!mountRef.current) return;
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
    nodesRef.current = buildGraph();

    // Rack groups
    const rackGroups = { 1: new THREE.Group(), 2: new THREE.Group() };
    rackGroupsRef.current = rackGroups;
    scene.add(rackGroups[1], rackGroups[2]);

    // Glass envelope
    const shellMat = new THREE.MeshPhongMaterial({ color: 0x9fd7ff, transparent: true, opacity: 0.045, side: THREE.DoubleSide, shininess: 80 });
    const shellGeo = new THREE.BoxGeometry(43, 10.6, 30.5);
    const shell = new THREE.Mesh(shellGeo, shellMat);
    shell.position.set(0, FLOOR2_Y / 2 + 2, 0);
    scene.add(shell);
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(shellGeo), new THREE.LineBasicMaterial({ color: 0x3a4a70, transparent: true, opacity: 0.5 }));
    edges.position.copy(shell.position);
    scene.add(edges);

    // Floor slabs
    function buildFloorSlab(y, colorHex) {
      const geo = new THREE.BoxGeometry(41, 0.4, 28.5);
      const mat = new THREE.MeshPhongMaterial({ color: colorHex, shininess: 15 });
      const slab = new THREE.Mesh(geo, mat);
      slab.position.set(0, y - 0.25, 0);
      slab.receiveShadow = true;
      scene.add(slab);
      const grid = new THREE.GridHelper(40, 20, 0x24314d, 0x1a2338);
      grid.position.set(0, y - 0.02, 0);
      scene.add(grid);
    }
    buildFloorSlab(FLOOR1_Y, 0x131c30);
    buildFloorSlab(FLOOR2_Y, 0x121b2c);

    // Floor labels
    function addFloorLabel(text, y) {
      const s = makeLabel(text, { bg: '#111a2e', fg: '#f2a93b', scale: 1.3 });
      s.position.set(-18.5, y + 2.2, -13.6);
      scene.add(s);
    }
    addFloorLabel('FLOOR 1', FLOOR1_Y);
    addFloorLabel('FLOOR 2', FLOOR2_Y);

    // Build racks
    function buildRack(code, x, z, y, floorNum) {
      const group = new THREE.Group();
      const bodyColor = floorNum === 1 ? 0xa9743f : 0x3f8f94;
      const geo = new THREE.BoxGeometry(3.3, 2.5, 1.1);
      const mat = new THREE.MeshPhongMaterial({ color: bodyColor, shininess: 25 });
      const body = new THREE.Mesh(geo, mat);
      body.position.y = 1.25;
      body.castShadow = true; body.receiveShadow = true;
      group.add(body);
      // Shelf lines
      const edgeMat = new THREE.LineBasicMaterial({ color: 0x1a120a, transparent: true, opacity: 0.35 });
      for (let i = 1; i < 4; i++) {
        const shelfGeo = new THREE.EdgesGeometry(new THREE.PlaneGeometry(3.15, 1.0));
        const shelf = new THREE.LineSegments(shelfGeo, edgeMat);
        shelf.rotation.x = Math.PI / 2;
        shelf.position.set(0, i * 0.6, 0);
        group.add(shelf);
      }
      const label = makeLabel(code, { bg: floorNum === 1 ? '#f2a93b' : '#5fd6c9', fg: '#151109', scale: 0.9 });
      label.position.set(0, 3.05, 0);
      group.add(label);
      group.position.set(x, y, z);
      group.userData = { rackCode: code, floor: floorNum, baseColor: bodyColor };
      rackGroups[floorNum].add(group);
      rackMeshByCodeRef.current[code] = group;
      return group;
    }

    COLS_X.forEach((x, i) => {
      buildRack('A' + (i + 1), x, -6, FLOOR1_Y, 1);
      buildRack('B' + (i + 1), x, 6, FLOOR1_Y, 1);
      buildRack('C' + (i + 1), x, -6, FLOOR2_Y, 2);
      buildRack('D' + (i + 1), x, 6, FLOOR2_Y, 2);
    });

    // Entrance pin
    const pinGroup = new THREE.Group();
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.45, 1.1, 16), new THREE.MeshPhongMaterial({ color: 0x5fe3a0, emissive: 0x5fe3a0, emissiveIntensity: 0.35 }));
    cone.position.y = 0.55;
    pinGroup.add(cone);
    const pinLabel = makeLabel('ENTRANCE', { bg: '#111a2e', fg: '#eae6da', scale: 0.65 });
    pinLabel.position.y = 1.5;
    pinGroup.add(pinLabel);
    pinGroup.position.set(0, FLOOR1_Y, -13.2);
    scene.add(pinGroup);

    // Staircase
    const stairMat = new THREE.MeshPhongMaterial({ color: 0x6b7590, shininess: 40 });
    for (let i = 0; i < 8; i++) {
      const step = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.22, 0.9), stairMat);
      step.position.set(13, FLOOR1_Y + (i + 1) * (FLOOR2_Y / 8), -2.6 + i * 0.72);
      step.castShadow = true;
      scene.add(step);
    }

    // Camera orbit controls
    const canvas = renderer.domElement;
    const drag = dragRef.current;

    const onPointerDown = (e) => {
      drag.dragging = true; drag.lastX = e.clientX; drag.lastY = e.clientY;
      canvas.setPointerCapture(e.pointerId);
    };
    const onPointerUp = () => { drag.dragging = false; };
    const onPointerMove = (e) => {
      if (!drag.dragging) return;
      const dx = e.clientX - drag.lastX, dy = e.clientY - drag.lastY;
      drag.lastX = e.clientX; drag.lastY = e.clientY;
      const orbit = orbitRef.current;
      orbit.theta -= dx * 0.0055;
      orbit.phi = Math.min(orbit.maxPhi, Math.max(orbit.minPhi, orbit.phi - dy * 0.0045));
      updateCamera();
    };
    const onWheel = (e) => {
      e.preventDefault();
      const orbit = orbitRef.current;
      orbit.radius = Math.min(orbit.maxR, Math.max(orbit.minR, orbit.radius + e.deltaY * 0.03));
      updateCamera();
    };

    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('wheel', onWheel, { passive: false });

    // Rack click
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const onClick = (e) => {
      if (Math.abs(e.clientX - drag.lastX) > 4 || Math.abs(e.clientY - drag.lastY) > 4) return;
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

    // Render loop
    function loop() {
      reqIdRef.current = requestAnimationFrame(loop);
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
      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [updateCamera, onRackClick]);

  // Handle routeTo prop changes
  useEffect(() => {
    if (routeTo) {
      // Normalize the rack code (handle both "C3" and "C 3" and "c3")
      const normalizedTo = routeTo.toUpperCase().replace(/\s+/g, '');
      let normalizedFrom = 'entrance';
      if (routeFrom) {
         const f = String(routeFrom).toLowerCase();
         if (f.includes('floor 1') || f === 'stairs1') normalizedFrom = 'stairs1';
         else if (f.includes('floor 2') || f === 'stairs2') normalizedFrom = 'stairs2';
         else if (f === 'entrance') normalizedFrom = 'entrance';
         else normalizedFrom = f; // fallback
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
