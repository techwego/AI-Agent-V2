import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

const AnimatedBackground = () => {
  const mountRef = useRef(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 200;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    container.appendChild(renderer.domElement);

    const particleCount = 400;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const velocities = [];

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 600;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 600;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 400;
      
      velocities.push({
        x: (Math.random() - 0.5) * 0.2,
        y: (Math.random() - 0.5) * 0.2,
        z: (Math.random() - 0.5) * 0.2
      });
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: 0x3b82f6, // Blue-500
      size: 2.5,
      transparent: true,
      opacity: 0.6,
      blending: THREE.NormalBlending,
      sizeAttenuation: true
    });

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);

    const shapes = new THREE.Group();
    const bgMaterials = [
      new THREE.MeshBasicMaterial({ color: 0x818cf8, wireframe: true, transparent: true, opacity: 0.1 }),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, wireframe: true, transparent: true, opacity: 0.1 })
    ];
    
    for (let i = 0; i < 5; i++) {
      const geo = i % 2 === 0 ? new THREE.IcosahedronGeometry(20 + Math.random() * 20, 1) : new THREE.OctahedronGeometry(25 + Math.random() * 15, 1);
      const mesh = new THREE.Mesh(geo, bgMaterials[i % 2]);
      mesh.position.set(
        (Math.random() - 0.5) * 300,
        (Math.random() - 0.5) * 300,
        (Math.random() - 0.5) * 150 - 50
      );
      mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
      mesh.userData = {
        rx: (Math.random() - 0.5) * 0.005,
        ry: (Math.random() - 0.5) * 0.005,
        rz: (Math.random() - 0.5) * 0.005
      };
      shapes.add(mesh);
    }
    scene.add(shapes);

    let animationFrameId;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      const posAttr = geometry.attributes.position;
      for (let i = 0; i < particleCount; i++) {
        posAttr.array[i * 3] += velocities[i].x;
        posAttr.array[i * 3 + 1] += velocities[i].y;
        posAttr.array[i * 3 + 2] += velocities[i].z;

        if (posAttr.array[i * 3] > 300) posAttr.array[i * 3] = -300;
        if (posAttr.array[i * 3] < -300) posAttr.array[i * 3] = 300;
        if (posAttr.array[i * 3 + 1] > 300) posAttr.array[i * 3 + 1] = -300;
        if (posAttr.array[i * 3 + 1] < -300) posAttr.array[i * 3 + 1] = 300;
        if (posAttr.array[i * 3 + 2] > 200) posAttr.array[i * 3 + 2] = -200;
        if (posAttr.array[i * 3 + 2] < -200) posAttr.array[i * 3 + 2] = 200;
      }
      posAttr.needsUpdate = true;
      
      particles.rotation.y += 0.0005;
      particles.rotation.x += 0.0002;

      shapes.children.forEach(mesh => {
        mesh.rotation.x += mesh.userData.rx;
        mesh.rotation.y += mesh.userData.ry;
        mesh.rotation.z += mesh.userData.rz;
      });

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
      geometry.dispose();
      material.dispose();
      bgMaterials.forEach(m => m.dispose());
      shapes.children.forEach(m => m.geometry.dispose());
      renderer.dispose();
    };
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 bg-slate-50">
      <div ref={mountRef} className="absolute inset-0 opacity-60 mix-blend-multiply" />
      <div className="absolute inset-0 bg-gradient-to-b from-blue-100/30 via-transparent to-white/60" />
      <div className="absolute top-[-10%] left-[20%] w-[600px] h-[600px] rounded-full bg-blue-300/20 blur-[100px] transform-gpu" />
      <div className="absolute bottom-[-10%] right-[10%] w-[500px] h-[500px] rounded-full bg-indigo-300/20 blur-[100px] transform-gpu" />
    </div>
  );
};

export default AnimatedBackground;
