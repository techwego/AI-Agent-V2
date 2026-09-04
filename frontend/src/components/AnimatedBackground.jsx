import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

const AnimatedBackground = () => {
  const mountRef = useRef(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // 1. Scene & Camera Setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 240;

    // 2. High-Efficiency WebGL Renderer
    const renderer = new THREE.WebGLRenderer({ 
      alpha: true, 
      antialias: true, 
      powerPreference: 'low-power' 
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    container.appendChild(renderer.domElement);

    // 3. Constellation Nodes & Particle Field (Digital Library Mesh)
    const nodeCount = 160;
    const nodeGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(nodeCount * 3);
    const velocities = [];

    for (let i = 0; i < nodeCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 550;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 450;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 300;

      velocities.push({
        x: (Math.random() - 0.5) * (prefersReducedMotion ? 0.02 : 0.15),
        y: (Math.random() - 0.5) * (prefersReducedMotion ? 0.02 : 0.15),
        z: (Math.random() - 0.5) * (prefersReducedMotion ? 0.02 : 0.15)
      });
    }

    nodeGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const nodeMaterial = new THREE.PointsMaterial({
      color: 0x3b82f6, // Vibrant Blue
      size: 2.8,
      transparent: true,
      opacity: 0.65,
      sizeAttenuation: true
    });

    const nodes = new THREE.Points(nodeGeometry, nodeMaterial);
    scene.add(nodes);

    // 4. Dynamic Connecting Light Strands (Network Graph Lines)
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0x6366f1, // Royal Indigo
      transparent: true,
      opacity: 0.14,
    });

    const maxConnections = 250;
    const linePositions = new Float32Array(maxConnections * 6);
    const lineGeometry = new THREE.BufferGeometry();
    lineGeometry.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
    const lineMesh = new THREE.LineSegments(lineGeometry, lineMaterial);
    scene.add(lineMesh);

    // 5. Floating 3D Wireframe Book Volumes & Academic Crystals
    const floatingGroup = new THREE.Group();
    const wireMaterials = [
      new THREE.MeshBasicMaterial({ color: 0x2563eb, wireframe: true, transparent: true, opacity: 0.22 }), // Royal Blue
      new THREE.MeshBasicMaterial({ color: 0x4f46e5, wireframe: true, transparent: true, opacity: 0.18 }), // Indigo
      new THREE.MeshBasicMaterial({ color: 0x0284c7, wireframe: true, transparent: true, opacity: 0.20 }), // Sky/Cyan
    ];

    // Helper: Create stylized wireframe 3D Book
    const createBookMesh = (w, h, d, mat) => {
      const geo = new THREE.BoxGeometry(w, h, d, 2, 2, 2);
      return new THREE.Mesh(geo, mat);
    };

    for (let i = 0; i < 9; i++) {
      let mesh;
      const mat = wireMaterials[i % 3];
      if (i % 2 === 0) {
        // 3D Book Volume
        mesh = createBookMesh(18 + Math.random() * 8, 24 + Math.random() * 8, 5 + Math.random() * 4, mat);
      } else {
        // Academic Crystal / Knowledge Polyhedron
        const geo = i % 3 === 0 ? new THREE.OctahedronGeometry(15 + Math.random() * 6, 1) : new THREE.IcosahedronGeometry(12 + Math.random() * 6, 1);
        mesh = new THREE.Mesh(geo, mat);
      }

      mesh.position.set(
        (Math.random() - 0.5) * 420,
        (Math.random() - 0.5) * 320,
        (Math.random() - 0.5) * 200 - 40
      );
      mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      mesh.userData = {
        rx: (Math.random() - 0.5) * (prefersReducedMotion ? 0.001 : 0.004),
        ry: (Math.random() - 0.5) * (prefersReducedMotion ? 0.001 : 0.005),
        rz: (Math.random() - 0.5) * (prefersReducedMotion ? 0.001 : 0.003),
        initY: mesh.position.y,
        floatSpeed: 0.001 + Math.random() * 0.002
      };
      floatingGroup.add(mesh);
    }
    scene.add(floatingGroup);

    // 6. Interactive Mouse Parallax
    let mouseX = 0;
    let mouseY = 0;
    let targetX = 0;
    let targetY = 0;

    const handleMouseMove = (e) => {
      if (prefersReducedMotion) return;
      mouseX = (e.clientX - window.innerWidth / 2) * 0.035;
      mouseY = (e.clientY - window.innerHeight / 2) * 0.035;
    };
    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    // 7. Animation Loop with Tab Visibility Performance Guard
    let animationFrameId;
    let isPaused = false;
    let clock = new THREE.Clock();

    const animate = () => {
      if (isPaused) return;
      animationFrameId = requestAnimationFrame(animate);

      const elapsedTime = clock.getElapsedTime();

      // Smooth camera parallax
      targetX += (mouseX - targetX) * 0.05;
      targetY += (mouseY - targetY) * 0.05;
      camera.position.x = targetX;
      camera.position.y = -targetY;
      camera.lookAt(scene.position);

      // Update particle node positions
      const posAttr = nodeGeometry.attributes.position;
      const posArray = posAttr.array;

      for (let i = 0; i < nodeCount; i++) {
        posArray[i * 3] += velocities[i].x;
        posArray[i * 3 + 1] += velocities[i].y;
        posArray[i * 3 + 2] += velocities[i].z;

        if (posArray[i * 3] > 280) posArray[i * 3] = -280;
        if (posArray[i * 3] < -280) posArray[i * 3] = 280;
        if (posArray[i * 3 + 1] > 220) posArray[i * 3 + 1] = -220;
        if (posArray[i * 3 + 1] < -220) posArray[i * 3 + 1] = 220;
        if (posArray[i * 3 + 2] > 150) posArray[i * 3 + 2] = -150;
        if (posArray[i * 3 + 2] < -150) posArray[i * 3 + 2] = 150;
      }
      posAttr.needsUpdate = true;

      // Update light strand network connections
      let lineIndex = 0;
      const linePosArray = lineGeometry.attributes.position.array;
      const connectionDistance = 65;

      for (let i = 0; i < nodeCount && lineIndex < maxConnections * 6; i++) {
        for (let j = i + 1; j < nodeCount && lineIndex < maxConnections * 6; j++) {
          const dx = posArray[i * 3] - posArray[j * 3];
          const dy = posArray[i * 3 + 1] - posArray[j * 3 + 1];
          const dz = posArray[i * 3 + 2] - posArray[j * 3 + 2];
          const distSq = dx * dx + dy * dy + dz * dz;

          if (distSq < connectionDistance * connectionDistance) {
            linePosArray[lineIndex++] = posArray[i * 3];
            linePosArray[lineIndex++] = posArray[i * 3 + 1];
            linePosArray[lineIndex++] = posArray[i * 3 + 2];

            linePosArray[lineIndex++] = posArray[j * 3];
            linePosArray[lineIndex++] = posArray[j * 3 + 1];
            linePosArray[lineIndex++] = posArray[j * 3 + 2];
          }
        }
      }

      for (let k = lineIndex; k < maxConnections * 6; k++) {
        linePosArray[k] = 0;
      }
      lineGeometry.attributes.position.needsUpdate = true;

      // Rotate and float geometric books
      floatingGroup.children.forEach(mesh => {
        mesh.rotation.x += mesh.userData.rx;
        mesh.rotation.y += mesh.userData.ry;
        mesh.rotation.z += mesh.userData.rz;
        mesh.position.y = mesh.userData.initY + Math.sin(elapsedTime * 0.8 + mesh.position.x) * 5;
      });

      nodes.rotation.y = elapsedTime * 0.015;

      renderer.render(scene, camera);
    };

    animate();

    // 8. Visibility Change Listener (Pause loop when tab is hidden to save CPU/GPU)
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

    // 9. Resize Listener
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
      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
      nodeGeometry.dispose();
      nodeMaterial.dispose();
      lineGeometry.dispose();
      lineMaterial.dispose();
      wireMaterials.forEach(m => m.dispose());
      floatingGroup.children.forEach(m => m.geometry.dispose());
      renderer.dispose();
    };
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 bg-gradient-to-br from-slate-50 via-white to-blue-50/50">
      {/* 3D Wireframe Books & Node Canvas */}
      <div ref={mountRef} className="absolute inset-0 opacity-70" />
      
      {/* Ambient Perspective Library Aisle Grid */}
      <div className="absolute inset-0 aisle-grid-bg opacity-50" />
      
      {/* Soft Luminous Atmospheric Glow Spots */}
      <div className="absolute top-[-10%] left-[15%] w-[650px] h-[650px] rounded-full bg-blue-300/20 blur-[120px] transform-gpu pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[10%] w-[550px] h-[550px] rounded-full bg-indigo-200/25 blur-[120px] transform-gpu pointer-events-none" />
      <div className="absolute top-[40%] right-[25%] w-[400px] h-[400px] rounded-full bg-sky-200/20 blur-[100px] transform-gpu pointer-events-none" />
    </div>
  );
};

export default AnimatedBackground;
