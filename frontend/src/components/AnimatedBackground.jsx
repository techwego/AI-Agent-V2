import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

/**
 * AnimatedBackground — Elite Obsidian Cyber-Dark Intelligence Canvas
 * Features:
 * - Deep Space Obsidian Gradient with Atmospheric Nebula Auroras
 * - 3D Perspective Wireframe Horizon Grid & Floating Refractive Dark Crystals
 * - Uncluttered, High-Precision Constellation Mesh with Bioluminescent Drift
 * - Elegant Single Rotating Orbital Radar Ring with Glowing Celestial Beacon
 * - Flowing Cyan/Indigo Laser Energy Conduits & Traveling Photons
 * - Smooth Parallax Physics with Cubic Damping
 */
const AnimatedBackground = () => {
  const threeMountRef = useRef(null);
  const canvasRef = useRef(null);

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. THREE.JS 3D WEBGL PERSPECTIVE SCENE (DARK HORIZON)
  // ─────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const container = threeMountRef.current;
    if (!container) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const motionScale = prefersReducedMotion ? 0.05 : 1.0;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x060913, 0.0018);

    const camera = new THREE.PerspectiveCamera(
      50,
      window.innerWidth / window.innerHeight,
      0.1,
      1500
    );
    camera.position.set(0, 20, 290);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    container.appendChild(renderer.domElement);

    // Deep Cosmic Ambient & Accent Lights
    const ambientLight = new THREE.AmbientLight(0x1e293b, 1.2);
    scene.add(ambientLight);

    const pointLight1 = new THREE.PointLight(0x3b82f6, 3.0, 700);
    pointLight1.position.set(140, 160, 100);
    scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0x8b5cf6, 2.5, 600);
    pointLight2.position.set(-160, -90, 80);
    scene.add(pointLight2);

    const sceneGroup = new THREE.Group();
    scene.add(sceneGroup);

    // Dark Perspective Ground Grids
    const gridSize = 1500;
    const gridDivisions = 40;
    const gridHelper = new THREE.GridHelper(gridSize, gridDivisions, 0x334155, 0x1e293b);
    gridHelper.position.y = -110;
    gridHelper.position.z = -130;
    gridHelper.material.transparent = true;
    gridHelper.material.opacity = 0.35;
    sceneGroup.add(gridHelper);

    const fineGridHelper = new THREE.GridHelper(gridSize, gridDivisions * 2, 0x1d4ed8, 0x0f172a);
    fineGridHelper.position.y = -110.5;
    fineGridHelper.position.z = -130;
    fineGridHelper.material.transparent = true;
    fineGridHelper.material.opacity = 0.12;
    sceneGroup.add(fineGridHelper);

    // ─────────────────────────────────────────────────────────────────────────
    // 3D ARCHITECTURAL WIREFRAME LIBRARY SCENE (Racks Mounted in Perspective Rows)
    // ─────────────────────────────────────────────────────────────────────────
    const libraryGroup = new THREE.Group();
    sceneGroup.add(libraryGroup);

    // Wireframe Materials (Subtle cyan / indigo glowing lines at 18-24% opacity)
    const rackLineMat = new THREE.LineBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.24,
      blending: THREE.AdditiveBlending
    });

    const shelfDividerMat = new THREE.LineBasicMaterial({
      color: 0x818cf8,
      transparent: true,
      opacity: 0.18,
      blending: THREE.AdditiveBlending
    });

    const bookWireframeMat = new THREE.LineBasicMaterial({
      color: 0x0ea5e9,
      transparent: true,
      opacity: 0.15,
      blending: THREE.AdditiveBlending
    });

    const aisleGuideMat = new THREE.LineBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.16,
      blending: THREE.AdditiveBlending
    });

    const aisleBeaconMat = new THREE.PointsMaterial({
      color: 0x38bdf8,
      size: 4.0,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending
    });

    const createLibraryRack = (x, y, z, width = 45, height = 75, depth = 16, tiers = 4) => {
      const rack = new THREE.Group();
      rack.position.set(x, y, z);

      // 1. Outer Frame Wireframe
      const outerGeo = new THREE.BoxGeometry(width, height, depth);
      const outerEdges = new THREE.EdgesGeometry(outerGeo);
      const outerLine = new THREE.LineSegments(outerEdges, rackLineMat);
      rack.add(outerLine);

      // 2. Horizontal Shelf Dividers
      const tierHeight = height / (tiers + 1);
      for (let t = 1; t <= tiers; t++) {
        const shelfY = -height / 2 + t * tierHeight;
        const shelfGeo = new THREE.BoxGeometry(width * 0.98, 1.2, depth * 0.96);
        const shelfEdges = new THREE.EdgesGeometry(shelfGeo);
        const shelfLine = new THREE.LineSegments(shelfEdges, shelfDividerMat);
        shelfLine.position.y = shelfY;
        rack.add(shelfLine);

        // 3. Subtle Book Block Clusters on Shelves
        const bookClusterCount = 3;
        for (let b = 0; b < bookClusterCount; b++) {
          const bWidth = (width * 0.25) + ((b * 3) % 4);
          const bHeight = tierHeight * 0.7 + ((b % 2) * 2);
          const bDepth = depth * 0.75;
          const bX = -width / 2 + 6 + b * (width / bookClusterCount);
          const bY = shelfY + bHeight / 2 + 0.6;

          const bookGeo = new THREE.BoxGeometry(bWidth, bHeight, bDepth);
          const bookEdges = new THREE.EdgesGeometry(bookGeo);
          const bookLine = new THREE.LineSegments(bookEdges, bookWireframeMat);
          bookLine.position.set(bX, bY, 0);
          rack.add(bookLine);
        }
      }

      // 4. Vertical Central & Side Post Dividers
      [-width * 0.25, 0, width * 0.25].forEach((vx) => {
        const vertDivGeo = new THREE.BoxGeometry(1.2, height * 0.96, depth * 0.94);
        const vertDivEdges = new THREE.EdgesGeometry(vertDivGeo);
        const vertDivLine = new THREE.LineSegments(vertDivEdges, shelfDividerMat);
        vertDivLine.position.x = vx;
        rack.add(vertDivLine);
      });

      return rack;
    };

    // ── Place Library Racks in Parallel Perspective Rows (Left, Right & Receding Center Stacks) ──
    const aisleBeacons = [];
    const rackZPositions = [120, 40, -40, -120, -200, -280];

    // Left Aisle Corridor Racks (Double Row)
    rackZPositions.forEach((rz, idx) => {
      const scaleFactor = 1.0 - (idx * 0.07);
      const rack1 = createLibraryRack(-145, -50 + (idx * 5), rz, 48 * scaleFactor, 82 * scaleFactor, 18 * scaleFactor, 4);
      rack1.rotation.y = 0.20; // Angled along perspective aisle
      libraryGroup.add(rack1);

      const rack2 = createLibraryRack(-210, -45 + (idx * 5), rz - 15, 46 * scaleFactor, 85 * scaleFactor, 18 * scaleFactor, 4);
      rack2.rotation.y = 0.20;
      libraryGroup.add(rack2);

      // Aisle Floor Beacon point
      aisleBeacons.push(-110, -108, rz);
    });

    // Right Aisle Corridor Racks (Double Row)
    rackZPositions.forEach((rz, idx) => {
      const scaleFactor = 1.0 - (idx * 0.07);
      const rack1 = createLibraryRack(145, -50 + (idx * 5), rz, 48 * scaleFactor, 82 * scaleFactor, 18 * scaleFactor, 4);
      rack1.rotation.y = -0.20; // Angled along perspective aisle
      libraryGroup.add(rack1);

      const rack2 = createLibraryRack(210, -45 + (idx * 5), rz - 15, 46 * scaleFactor, 85 * scaleFactor, 18 * scaleFactor, 4);
      rack2.rotation.y = -0.20;
      libraryGroup.add(rack2);

      // Aisle Floor Beacon point
      aisleBeacons.push(110, -108, rz);
    });

    // Background High-Level Stacks (Deep Horizon Receding Rows)
    [-110, -55, 0, 55, 110].forEach((rx) => {
      const backRack = createLibraryRack(rx, 15, -340, 44, 72, 16, 4);
      libraryGroup.add(backRack);
    });

    // Perspective Aisle Guide Lines along the floor
    const aisleLinePoints = [
      new THREE.Vector3(-110, -109, 140),
      new THREE.Vector3(-110, -109, -320),
      new THREE.Vector3(110, -109, 140),
      new THREE.Vector3(110, -109, -320),
      new THREE.Vector3(-175, -109, 140),
      new THREE.Vector3(-175, -109, -320),
      new THREE.Vector3(175, -109, 140),
      new THREE.Vector3(175, -109, -320)
    ];
    const aisleLineGeo = new THREE.BufferGeometry().setFromPoints(aisleLinePoints);
    const aisleSegments = new THREE.LineSegments(aisleLineGeo, aisleGuideMat);
    libraryGroup.add(aisleSegments);

    // Aisle Beacon Particles
    const beaconGeo = new THREE.BufferGeometry();
    beaconGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(aisleBeacons), 3));
    const beaconPoints = new THREE.Points(beaconGeo, aisleBeaconMat);
    libraryGroup.add(beaconPoints);

    // Floating Translucent Refractive Crystals (Complementary Ambient Accents)
    const crystalCount = 4;
    const crystalsGroup = new THREE.Group();
    const crystalMaterials = [];

    for (let i = 0; i < crystalCount; i++) {
      const geo = i % 2 === 0
        ? new THREE.OctahedronGeometry(6 + Math.random() * 4, 0)
        : new THREE.IcosahedronGeometry(7 + Math.random() * 4, 0);

      const mat = new THREE.MeshPhysicalMaterial({
        color: i % 2 === 0 ? 0x38bdf8 : 0x818cf8,
        roughness: 0.15,
        metalness: 0.3,
        transmission: 0.8,
        transparent: true,
        opacity: 0.22,
        clearcoat: 1.0,
        wireframe: false
      });
      crystalMaterials.push(mat);

      const crystal = new THREE.Mesh(geo, mat);
      crystal.position.set(
        (Math.random() - 0.5) * 450,
        (Math.random() - 0.5) * 260,
        -50 + (Math.random() - 0.5) * 120
      );

      crystal.userData = {
        rotX: (0.002 + Math.random() * 0.003) * motionScale,
        rotY: (0.002 + Math.random() * 0.003) * motionScale,
        floatSpeed: (0.15 + Math.random() * 0.15) * motionScale,
        floatAmplitude: 4 + Math.random() * 4,
        floatOffset: Math.random() * Math.PI * 2,
        baseY: crystal.position.y
      };

      crystalsGroup.add(crystal);
    }
    sceneGroup.add(crystalsGroup);

    // Deep cosmic dust motes
    const dustCount = 80;
    const dustPositions = new Float32Array(dustCount * 3);
    const dustSpeeds = [];

    for (let i = 0; i < dustCount; i++) {
      dustPositions[i * 3] = (Math.random() - 0.5) * 800;
      dustPositions[i * 3 + 1] = (Math.random() - 0.5) * 550;
      dustPositions[i * 3 + 2] = (Math.random() - 0.5) * 350;
      dustSpeeds.push(0.02 + Math.random() * 0.04);
    }

    const dustGeo = new THREE.BufferGeometry();
    dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
    const dustMat = new THREE.PointsMaterial({
      color: 0x60a5fa,
      size: 1.6,
      transparent: true,
      opacity: 0.4,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending
    });
    const dustMotes = new THREE.Points(dustGeo, dustMat);
    sceneGroup.add(dustMotes);

    // Fluid Mouse Parallax
    let mouseX = 0;
    let mouseY = 0;
    let targetRotX = 0;
    let targetRotY = 0;

    const handleMouseMove = (e) => {
      if (prefersReducedMotion) return;
      mouseX = ((e.clientX / window.innerWidth) - 0.5) * 2;
      mouseY = ((e.clientY / window.innerHeight) - 0.5) * 2;
    };
    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    let animId;
    let isPaused = false;
    const clock = new THREE.Clock();

    const animate = () => {
      if (isPaused) return;
      animId = requestAnimationFrame(animate);

      const elapsed = clock.getElapsedTime();

      targetRotY += (mouseX * 0.010 - targetRotY) * 0.04;
      targetRotX += (mouseY * -0.006 - targetRotX) * 0.04;
      sceneGroup.rotation.y = targetRotY;
      sceneGroup.rotation.x = targetRotX;

      crystalsGroup.children.forEach((crystal) => {
        const ud = crystal.userData;
        crystal.position.y = ud.baseY + Math.sin(elapsed * ud.floatSpeed + ud.floatOffset) * ud.floatAmplitude;
        crystal.rotation.x += ud.rotX;
        crystal.rotation.y += ud.rotY;
      });

      const dustPosArr = dustGeo.attributes.position.array;
      for (let i = 0; i < dustCount; i++) {
        dustPosArr[i * 3 + 1] += dustSpeeds[i] * motionScale;
        if (dustPosArr[i * 3 + 1] > 260) {
          dustPosArr[i * 3 + 1] = -260;
        }
      }
      dustGeo.attributes.position.needsUpdate = true;

      renderer.render(scene, camera);
    };

    animate();

    const handleVisibilityChange = () => {
      if (document.hidden) {
        isPaused = true;
        cancelAnimationFrame(animId);
      } else {
        if (isPaused) {
          isPaused = false;
          clock.start();
          animate();
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const handleResize = () => {
      if (!container) return;
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      cancelAnimationFrame(animId);
      isPaused = true;

      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
      crystalsGroup.children.forEach((mesh) => mesh.geometry.dispose());
      crystalMaterials.forEach((m) => m.dispose());
      dustGeo.dispose();
      dustMat.dispose();
      gridHelper.geometry.dispose();
      fineGridHelper.geometry.dispose();
      renderer.dispose();
    };
  }, []);

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. UNCLUTTERED 2D CONSTELLATION & ORBITAL RADAR MESH CANVAS
  // ─────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId;

    const mouse = {
      x: -2000,
      y: -2000,
      targetX: -2000,
      targetY: -2000,
      radius: 130,
      isHovered: false
    };

    let width = 0;
    let height = 0;
    let nodes = [];
    let radarAngle = 0;
    let time = 0;

    // Clean laser energy conduits
    let conduitRays = [];

    const init = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      width = w;
      height = h;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Clean spatial seeding — fewer, well-spaced nodes (no clutter)
      nodes = [];
      const cols = Math.max(5, Math.floor(w / 190));
      const rows = Math.max(4, Math.floor(h / 190));
      const cellW = w / cols;
      const cellH = h / rows;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const anchorX = c * cellW + cellW * (0.25 + Math.random() * 0.5);
          const anchorY = r * cellH + cellH * (0.25 + Math.random() * 0.5);

          const colorPalette = [
            '59, 130, 246',  // Electric Blue
            '99, 102, 241',  // Neon Indigo
            '6, 182, 212',   // Cyber Cyan
            '168, 85, 247',  // Neon Violet
          ];

          nodes.push({
            x: anchorX,
            y: anchorY,
            anchorX,
            anchorY,
            offsetX: 0,
            offsetY: 0,
            speedX: 0.0003 + Math.random() * 0.0004,
            speedY: 0.0003 + Math.random() * 0.0004,
            ampX: 12 + Math.random() * 16,
            ampY: 10 + Math.random() * 14,
            phaseX: Math.random() * Math.PI * 2,
            phaseY: Math.random() * Math.PI * 2,
            radius: 2.0 + Math.random() * 1.5,
            color: colorPalette[Math.floor(Math.random() * colorPalette.length)],
            alpha: 0.45 + Math.random() * 0.35
          });
        }
      }

      // Elegant conduit beams
      conduitRays = [
        {
          origin: { x: 0.35, y: 0.28 },
          targets: [
            { x: 0.18, y: 0.18, color: '59, 130, 246', photons: [{ progress: 0.1 }, { progress: 0.6 }] },
            { x: 0.52, y: 0.20, color: '6, 182, 212', photons: [{ progress: 0.3 }, { progress: 0.8 }] },
          ]
        },
        {
          origin: { x: 0.68, y: 0.65 },
          targets: [
            { x: 0.82, y: 0.50, color: '168, 85, 247', photons: [{ progress: 0.2 }, { progress: 0.7 }] },
            { x: 0.55, y: 0.80, color: '99, 102, 241', photons: [{ progress: 0.4 }, { progress: 0.9 }] },
          ]
        }
      ];
    };

    const handleMouseMove = (e) => {
      mouse.targetX = e.clientX;
      mouse.targetY = e.clientY;
      mouse.isHovered = true;
    };

    const handleMouseLeave = () => {
      mouse.targetX = -2000;
      mouse.targetY = -2000;
      mouse.isHovered = false;
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mouseleave', handleMouseLeave, { passive: true });
    window.addEventListener('resize', init);

    init();

    const animate = () => {
      ctx.clearRect(0, 0, width, height);
      time += 16.6;
      radarAngle += 0.0028;

      mouse.x += (mouse.targetX - mouse.x) * 0.08;
      mouse.y += (mouse.targetY - mouse.y) * 0.08;

      // ─── 1. DRAW SINGLE SUBTLE ORBITAL RADAR RING ───
      const cx = width * 0.32;
      const cy = height * 0.26;
      const maxR = Math.min(180, width * 0.25);

      ctx.save();
      // Soft central halo
      const centerGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR * 0.7);
      centerGlow.addColorStop(0, 'rgba(59, 130, 246, 0.12)');
      centerGlow.addColorStop(0.6, 'rgba(99, 102, 241, 0.03)');
      centerGlow.addColorStop(1, 'rgba(59, 130, 246, 0)');
      ctx.beginPath();
      ctx.arc(cx, cy, maxR * 0.7, 0, Math.PI * 2);
      ctx.fillStyle = centerGlow;
      ctx.fill();

      // Inner Accent Ring
      ctx.beginPath();
      ctx.arc(cx, cy, maxR * 0.35, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.28)';
      ctx.lineWidth = 1.0;
      ctx.stroke();

      // Middle Dashed Rotating Ring
      ctx.beginPath();
      ctx.arc(cx, cy, maxR * 0.65, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(99, 102, 241, 0.22)';
      ctx.lineWidth = 1.1;
      ctx.setLineDash([5, 6]);
      ctx.lineDashOffset = -radarAngle * 30;
      ctx.stroke();

      // Outer Fine Ring
      ctx.beginPath();
      ctx.arc(cx, cy, maxR * 0.95, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.12)';
      ctx.setLineDash([]);
      ctx.lineWidth = 0.8;
      ctx.stroke();

      // Orbital Orbiting Beacon Dot
      const orbitAngle = radarAngle * 0.9;
      const bx = cx + Math.cos(orbitAngle) * (maxR * 0.65);
      const by = cy + Math.sin(orbitAngle) * (maxR * 0.65);
      ctx.beginPath();
      ctx.arc(bx, by, 3, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(129, 140, 248, 0.85)';
      ctx.fill();
      ctx.restore();

      // ─── 2. UPDATE NODES WITH LISSAJOUS DRIFT ───
      nodes.forEach(node => {
        const targetHarmonicX = node.anchorX + Math.sin(time * node.speedX + node.phaseX) * node.ampX;
        const targetHarmonicY = node.anchorY + Math.cos(time * node.speedY + node.phaseY) * node.ampY;

        const dx = node.x - mouse.x;
        const dy = node.y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < mouse.radius && mouse.isHovered) {
          const force = (1 - dist / mouse.radius) * 14;
          const angle = Math.atan2(dy, dx);
          node.offsetX += Math.cos(angle) * force * 0.15;
          node.offsetY += Math.sin(angle) * force * 0.15;
        }

        node.offsetX *= 0.92;
        node.offsetY *= 0.92;

        node.x = targetHarmonicX + node.offsetX;
        node.y = targetHarmonicY + node.offsetY;
      });

      // ─── 3. DRAW CLEAN PROXIMITY CONSTELLATION LINES ───
      const maxLinkDistance = Math.min(135, Math.max(100, width / 14));
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < maxLinkDistance) {
            const ratio = 1 - dist / maxLinkDistance;
            const lineOpacity = Math.pow(ratio, 1.5) * 0.22;

            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.strokeStyle = `rgba(99, 102, 241, ${lineOpacity})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      }

      // ─── 4. DRAW GLOWING CONSTELLATION NODES ───
      nodes.forEach(node => {
        // Soft Glow
        const grad = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, node.radius * 2.6);
        grad.addColorStop(0, `rgba(${node.color}, ${node.alpha * 0.65})`);
        grad.addColorStop(1, `rgba(${node.color}, 0)`);
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius * 2.6, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        // Crisp Center Dot
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${node.color}, ${node.alpha})`;
        ctx.fill();
      });

      // ─── 5. DRAW LASER CONDUIT PULSES ───
      conduitRays.forEach(system => {
        const ox = width * system.origin.x;
        const oy = height * system.origin.y;

        system.targets.forEach(tgt => {
          const tx = width * tgt.x;
          const ty = height * tgt.y;

          ctx.beginPath();
          ctx.moveTo(ox, oy);
          ctx.lineTo(tx, ty);
          ctx.strokeStyle = `rgba(${tgt.color}, 0.10)`;
          ctx.lineWidth = 0.9;
          ctx.setLineDash([4, 4]);
          ctx.stroke();
          ctx.setLineDash([]);

          tgt.photons.forEach(photon => {
            photon.progress += 0.0035;
            if (photon.progress > 1) photon.progress = 0;

            const px = ox + (tx - ox) * photon.progress;
            const py = oy + (ty - oy) * photon.progress;

            const pGrad = ctx.createRadialGradient(px, py, 0, px, py, 5);
            pGrad.addColorStop(0, `rgba(${tgt.color}, 0.95)`);
            pGrad.addColorStop(0.5, `rgba(${tgt.color}, 0.3)`);
            pGrad.addColorStop(1, `rgba(${tgt.color}, 0)`);

            ctx.beginPath();
            ctx.arc(px, py, 5, 0, Math.PI * 2);
            ctx.fillStyle = pGrad;
            ctx.fill();

            ctx.beginPath();
            ctx.arc(px, py, 1.6, 0, Math.PI * 2);
            ctx.fillStyle = '#ffffff';
            ctx.fill();
          });
        });
      });

      animId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('resize', init);
    };
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0 select-none bg-gradient-to-b from-[#050811] via-[#070c1a] to-[#04060d]">
      {/* 3D WebGL Horizon Layer */}
      <div ref={threeMountRef} className="absolute inset-0 opacity-75 pointer-events-none" />

      {/* Atmospheric Nebula Volumetric Glow Spots */}
      <div className="absolute top-[-10%] left-[10%] w-[700px] h-[700px] rounded-full bg-blue-600/10 blur-[160px] transform-gpu pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[10%] w-[650px] h-[650px] rounded-full bg-indigo-600/10 blur-[160px] transform-gpu pointer-events-none" />
      <div className="absolute top-[35%] right-[15%] w-[450px] h-[450px] rounded-full bg-purple-600/8 blur-[140px] transform-gpu pointer-events-none" />
      <div className="absolute bottom-[25%] left-[12%] w-[400px] h-[400px] rounded-full bg-cyan-500/8 blur-[130px] transform-gpu pointer-events-none" />

      {/* Uncluttered 2D Constellation & Radar Canvas Layer */}
      <canvas 
        ref={canvasRef} 
        className="absolute inset-0 w-full h-full pointer-events-none opacity-85"
      />
    </div>
  );
};

export default AnimatedBackground;
