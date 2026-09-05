import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

/**
 * AnimatedBackground — Enterprise Clean 3D Mesh & Constellation Background
 * Replaces heavy 3D floating books with a sophisticated, lightweight enterprise
 * ambient particle mesh, soft volumetric glow spheres, and subtle depth parallax.
 */
const AnimatedBackground = () => {
  const mountRef = useRef(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // ─── Preferences ───────────────────────────────────────────
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const motionScale = prefersReducedMotion ? 0.05 : 1.0;

    // ─── 1. Scene & Camera ─────────────────────────────────────
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      55,
      window.innerWidth / window.innerHeight,
      0.1,
      1200
    );
    camera.position.set(0, 0, 260);

    // ─── 2. Renderer ───────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'low-power',
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    container.appendChild(renderer.domElement);

    // ─── 3. Lighting ───────────────────────────────────────────
    const ambientLight = new THREE.AmbientLight(0xf0f6ff, 0.9);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
    dirLight.position.set(80, 120, 60);
    scene.add(dirLight);

    const sceneGroup = new THREE.Group();
    scene.add(sceneGroup);

    // ─── 4. Luminous Constellation Nodes & Mesh Connections ───
    const nodeCount = 55;
    const nodePositions = new Float32Array(nodeCount * 3);
    const nodeSpeeds = [];

    for (let i = 0; i < nodeCount; i++) {
      nodePositions[i * 3] = (Math.random() - 0.5) * 550;
      nodePositions[i * 3 + 1] = (Math.random() - 0.5) * 350;
      nodePositions[i * 3 + 2] = (Math.random() - 0.5) * 200 - 30;
      nodeSpeeds.push({
        vx: (Math.random() - 0.5) * 0.15 * motionScale,
        vy: (Math.random() - 0.5) * 0.15 * motionScale,
        vz: (Math.random() - 0.5) * 0.08 * motionScale,
        baseY: nodePositions[i * 3 + 1],
        phase: Math.random() * Math.PI * 2
      });
    }

    const nodeGeo = new THREE.BufferGeometry();
    nodeGeo.setAttribute('position', new THREE.BufferAttribute(nodePositions, 3));

    const nodeMat = new THREE.PointsMaterial({
      color: 0x3b82f6,
      size: 3.5,
      transparent: true,
      opacity: 0.65,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending
    });

    const nodePoints = new THREE.Points(nodeGeo, nodeMat);
    sceneGroup.add(nodePoints);

    // ─── 5. Soft Floating Ambient Energy Crystals ─────────────
    const crystalCount = 6;
    const crystalsGroup = new THREE.Group();
    const crystalMaterials = [];

    for (let i = 0; i < crystalCount; i++) {
      const geo = i % 2 === 0
        ? new THREE.OctahedronGeometry(6 + Math.random() * 4, 0)
        : new THREE.IcosahedronGeometry(7 + Math.random() * 5, 0);

      const mat = new THREE.MeshPhysicalMaterial({
        color: i % 2 === 0 ? 0x60a5fa : 0xa78bfa,
        roughness: 0.1,
        metalness: 0.1,
        transmission: 0.85,
        transparent: true,
        opacity: 0.22,
        clearcoat: 1.0,
        wireframe: false
      });
      crystalMaterials.push(mat);

      const crystal = new THREE.Mesh(geo, mat);
      crystal.position.set(
        (Math.random() - 0.5) * 480,
        (Math.random() - 0.5) * 280,
        -60 + (Math.random() - 0.5) * 120
      );

      crystal.userData = {
        rotX: (0.003 + Math.random() * 0.004) * motionScale,
        rotY: (0.004 + Math.random() * 0.005) * motionScale,
        floatSpeed: (0.2 + Math.random() * 0.2) * motionScale,
        floatAmplitude: 4 + Math.random() * 4,
        floatOffset: Math.random() * Math.PI * 2,
        baseY: crystal.position.y
      };

      crystalsGroup.add(crystal);
    }
    sceneGroup.add(crystalsGroup);

    // ─── 6. Ambient Light Motes ────────────────────────────────
    const dustCount = 140;
    const dustPositions = new Float32Array(dustCount * 3);
    const dustSpeeds = [];

    for (let i = 0; i < dustCount; i++) {
      dustPositions[i * 3] = (Math.random() - 0.5) * 600;
      dustPositions[i * 3 + 1] = (Math.random() - 0.5) * 450;
      dustPositions[i * 3 + 2] = (Math.random() - 0.5) * 300;
      dustSpeeds.push(0.03 + Math.random() * 0.05);
    }

    const dustGeo = new THREE.BufferGeometry();
    dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));

    const dustMat = new THREE.PointsMaterial({
      color: 0x93c5fd,
      size: 1.8,
      transparent: true,
      opacity: 0.45,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending
    });

    const dustMotes = new THREE.Points(dustGeo, dustMat);
    sceneGroup.add(dustMotes);

    // ─── 7. Mouse Parallax ───────────────────────────────────
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

    // ─── 8. Animation Loop ───────────────────────────────────
    let animationFrameId;
    let isPaused = false;
    const clock = new THREE.Clock();

    const animate = () => {
      if (isPaused) return;
      animationFrameId = requestAnimationFrame(animate);

      const elapsed = clock.getElapsedTime();

      // Parallax smoothing
      targetRotY += (mouseX * 0.012 - targetRotY) * 0.04;
      targetRotX += (mouseY * -0.008 - targetRotX) * 0.04;
      sceneGroup.rotation.y = targetRotY;
      sceneGroup.rotation.x = targetRotX;

      // Animate floating crystals
      crystalsGroup.children.forEach((crystal) => {
        const ud = crystal.userData;
        crystal.position.y = ud.baseY + Math.sin(elapsed * ud.floatSpeed + ud.floatOffset) * ud.floatAmplitude;
        crystal.rotation.x += ud.rotX;
        crystal.rotation.y += ud.rotY;
      });

      // Animate dust motes drift
      const posAttr = dustGeo.attributes.position;
      const posArray = posAttr.array;
      for (let i = 0; i < dustCount; i++) {
        posArray[i * 3 + 1] += dustSpeeds[i] * motionScale;
        if (posArray[i * 3 + 1] > 230) {
          posArray[i * 3 + 1] = -230;
        }
      }
      posAttr.needsUpdate = true;

      // Animate nodes
      const nodeAttr = nodeGeo.attributes.position;
      const nodeArr = nodeAttr.array;
      for (let i = 0; i < nodeCount; i++) {
        const s = nodeSpeeds[i];
        nodeArr[i * 3 + 1] = s.baseY + Math.sin(elapsed * 0.4 + s.phase) * 6.0;
      }
      nodeAttr.needsUpdate = true;

      renderer.render(scene, camera);
    };

    animate();

    const handleVisibilityChange = () => {
      if (document.hidden) {
        isPaused = true;
        cancelAnimationFrame(animationFrameId);
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
      cancelAnimationFrame(animationFrameId);
      isPaused = true;

      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }

      crystalsGroup.children.forEach((mesh) => mesh.geometry.dispose());
      crystalMaterials.forEach((m) => m.dispose());
      nodeGeo.dispose();
      nodeMat.dispose();
      dustGeo.dispose();
      dustMat.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 bg-gradient-to-br from-slate-50 via-white to-blue-50/50">
      {/* 3D Scene Canvas */}
      <div ref={mountRef} className="absolute inset-0 opacity-75" />

      {/* Ambient Perspective Grid */}
      <div className="absolute inset-0 aisle-grid-bg opacity-35" />

      {/* Soft Luminous Atmospheric Glow Spots */}
      <div className="absolute top-[-10%] left-[15%] w-[650px] h-[650px] rounded-full bg-blue-300/15 blur-[130px] transform-gpu pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[10%] w-[550px] h-[550px] rounded-full bg-indigo-200/20 blur-[130px] transform-gpu pointer-events-none" />
      <div className="absolute top-[40%] right-[25%] w-[400px] h-[400px] rounded-full bg-sky-200/15 blur-[110px] transform-gpu pointer-events-none" />
    </div>
  );
};

export default AnimatedBackground;
