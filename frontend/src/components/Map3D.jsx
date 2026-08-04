import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

const Map3D = ({ routeTo }) => {
  const mountRef = useRef(null);

  useEffect(() => {
    if (!mountRef.current) return;

    // Basic Three.js setup
    const scene = new THREE.Scene();
    // Use dark theme background
    scene.background = new THREE.Color(0x0f172a); // gray-900ish

    const camera = new THREE.PerspectiveCamera(60, mountRef.current.clientWidth / mountRef.current.clientHeight, 0.1, 1000);
    camera.position.set(0, 15, 20);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    mountRef.current.appendChild(renderer.domElement);

    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(10, 20, 10);
    scene.add(dirLight);

    // Floor
    const floorGeo = new THREE.PlaneGeometry(30, 20);
    const floorMat = new THREE.MeshStandardMaterial({ 
      color: 0x1e293b, 
      roughness: 0.8,
      metalness: 0.2
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);

    // Racks
    const racks = [];
    const rackGeo = new THREE.BoxGeometry(2, 4, 8);
    const rackMat = new THREE.MeshStandardMaterial({ color: 0x3b82f6 });

    // Create a simple library layout
    const positions = [
      { x: -10, z: -4, id: 'A' }, { x: -6, z: -4, id: 'B' }, { x: -2, z: -4, id: 'C' },
      { x: 2, z: -4, id: 'D' }, { x: 6, z: -4, id: 'E' }, { x: 10, z: -4, id: 'F' }
    ];

    positions.forEach(pos => {
      const rack = new THREE.Mesh(rackGeo, rackMat);
      rack.position.set(pos.x, 2, pos.z);
      rack.userData = { id: pos.id };
      scene.add(rack);
      racks.push(rack);
    });

    // Path / Route indicator
    let routeLine = null;

    const drawRoute = (targetId) => {
      if (routeLine) {
        scene.remove(routeLine);
        routeLine = null;
      }
      
      const targetRack = racks.find(r => r.userData.id === targetId);
      if (!targetRack) return;

      // Reset colors
      racks.forEach(r => r.material.color.setHex(0x3b82f6));
      // Highlight target
      targetRack.material.color.setHex(0x10b981); // Emerald

      const points = [];
      // Start near camera/entrance
      points.push(new THREE.Vector3(0, 0.5, 8));
      // Move to center aisle
      points.push(new THREE.Vector3(0, 0.5, 0));
      // Move to rack X
      points.push(new THREE.Vector3(targetRack.position.x, 0.5, 0));
      // Move to rack front
      points.push(new THREE.Vector3(targetRack.position.x, 0.5, targetRack.position.z + 5));

      const pathGeo = new THREE.BufferGeometry().setFromPoints(points);
      const pathMat = new THREE.LineBasicMaterial({ 
        color: 0xf59e0b, // Amber
        linewidth: 4 
      });

      routeLine = new THREE.Line(pathGeo, pathMat);
      scene.add(routeLine);
    };

    if (routeTo) {
      drawRoute(routeTo);
    }

    // Animation loop
    let reqId;
    const animate = () => {
      reqId = requestAnimationFrame(animate);
      
      // Slowly rotate camera around the center if idle, or just render
      renderer.render(scene, camera);
    };
    animate();

    // Resize handler
    const handleResize = () => {
      if (!mountRef.current) return;
      camera.aspect = mountRef.current.clientWidth / mountRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(reqId);
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [routeTo]);

  return <div ref={mountRef} className="w-full h-full rounded-xl overflow-hidden shadow-lg border border-gray-800" />;
};

export default Map3D;
