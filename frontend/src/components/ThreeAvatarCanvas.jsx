import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

/**
 * ThreeAvatarCanvas — Enterprise Clean 3D Holographic AI Voice Orb
 * 
 * Design:
 * - Ultra-clear crystalline glass sphere with PBR transmission & clearcoat
 * - Luminous internal plasma nucleus (reactive to voice states & speech volume)
 * - Dual precision metallic orbital gyroscopic rings with subtle emissive highlights
 * - Elegant, sparse floating ambient photon motes
 * - Smooth 60 FPS breathing & speech amplitude scaling
 */
const ThreeAvatarCanvas = ({
  state = 'IDLE',
  viseme = { mouthOpen: 0, mouthWide: 0.5, isBlinking: false },
  isSpeaking = false,
  isListening = false,
  isProcessing = false
}) => {
  const containerRef = useRef(null);
  const cleanupRef = useRef(null);

  const stateRef = useRef({ isSpeaking, isListening, isProcessing, viseme, state });
  useEffect(() => {
    stateRef.current = { isSpeaking, isListening, isProcessing, viseme, state };
  }, [isSpeaking, isListening, isProcessing, viseme, state]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }

    const width = container.clientWidth || 280;
    const height = container.clientHeight || 280;

    // 1. Scene & Camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    camera.position.set(0, 0, 3.8);
    camera.lookAt(0, 0, 0);

    // 2. WebGL Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    container.replaceChildren(renderer.domElement);

    // 3. Studio Lighting Rig
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xfff6ea, 2.5);
    keyLight.position.set(3, 4, 4);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x60a5fa, 1.4);
    fillLight.position.set(-3, 1, 3);
    scene.add(fillLight);

    const stateLight = new THREE.PointLight(0x2563eb, 3.5, 8);
    stateLight.position.set(0, 0, 1.8);
    scene.add(stateLight);

    // 4. Primary Crystal Glass Sphere
    const coreGeo = new THREE.SphereGeometry(0.88, 64, 64);
    const coreMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      roughness: 0.04,
      metalness: 0.05,
      clearcoat: 1.0,
      clearcoatRoughness: 0.05,
      transparent: true,
      opacity: 0.85,
      transmission: 0.55,
      thickness: 1.0,
      ior: 1.6,
      sheen: 0.9,
      sheenColor: new THREE.Color(0x93c5fd)
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    scene.add(coreMesh);

    // 5. Internal Plasma Core (Luminous glow center)
    const plasmaGeo = new THREE.SphereGeometry(0.48, 32, 32);
    const plasmaMat = new THREE.MeshBasicMaterial({
      color: 0x3b82f6,
      transparent: true,
      opacity: 0.85
    });
    const plasmaMesh = new THREE.Mesh(plasmaGeo, plasmaMat);
    scene.add(plasmaMesh);

    // Inner bright hot nucleus
    const nucleusGeo = new THREE.SphereGeometry(0.18, 24, 24);
    const nucleusMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.95
    });
    const nucleusMesh = new THREE.Mesh(nucleusGeo, nucleusMat);
    scene.add(nucleusMesh);

    // 6. Dual Precision Gyroscopic Rings
    const ringMat1 = new THREE.MeshStandardMaterial({
      color: 0x93c5fd,
      roughness: 0.2,
      metalness: 0.85,
      transparent: true,
      opacity: 0.75,
      emissive: 0x2563eb,
      emissiveIntensity: 0.25
    });
    const ringGeo1 = new THREE.TorusGeometry(1.22, 0.012, 24, 100);
    const ring1 = new THREE.Mesh(ringGeo1, ringMat1);
    ring1.rotation.x = Math.PI / 2.5;
    ring1.rotation.y = 0.2;
    scene.add(ring1);

    const ringMat2 = new THREE.MeshStandardMaterial({
      color: 0xc4b5fd,
      roughness: 0.2,
      metalness: 0.85,
      transparent: true,
      opacity: 0.65,
      emissive: 0x7c3aed,
      emissiveIntensity: 0.2
    });
    const ringGeo2 = new THREE.TorusGeometry(1.36, 0.009, 24, 100);
    const ring2 = new THREE.Mesh(ringGeo2, ringMat2);
    ring2.rotation.x = Math.PI / 3.8;
    ring2.rotation.z = Math.PI / 4;
    scene.add(ring2);

    // 7. Ambient Photon Motes
    const photonCount = 60;
    const photonPositions = new Float32Array(photonCount * 3);
    const photonSpeeds = [];

    for (let i = 0; i < photonCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = 1.25 + Math.random() * 0.6;
      const y = (Math.random() - 0.5) * 1.4;
      photonPositions[i * 3] = r * Math.cos(angle);
      photonPositions[i * 3 + 1] = y;
      photonPositions[i * 3 + 2] = r * Math.sin(angle);
      photonSpeeds.push({
        radius: r,
        speed: 0.3 + Math.random() * 0.6,
        phase: Math.random() * Math.PI * 2
      });
    }

    const photonGeo = new THREE.BufferGeometry();
    photonGeo.setAttribute('position', new THREE.BufferAttribute(photonPositions, 3));
    const photonMat = new THREE.PointsMaterial({
      color: 0xbfdbfe,
      size: 0.035,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const photons = new THREE.Points(photonGeo, photonMat);
    scene.add(photons);

    // 8. Animation Loop
    const clock = new THREE.Clock();
    let animFrameId = null;

    const animate = () => {
      animFrameId = requestAnimationFrame(animate);
      const time = clock.getElapsedTime();
      const s = stateRef.current;

      // State Colors
      let coreColor, ringColor, lightColor, intensity;
      if (s.isListening) {
        coreColor = 0x06b6d4; // Cyan
        ringColor = 0x22d3ee;
        lightColor = 0x0891b2;
        intensity = 4.2;
      } else if (s.isProcessing) {
        coreColor = 0xf59e0b; // Amber
        ringColor = 0xfbbf24;
        lightColor = 0xd97706;
        intensity = 4.0;
      } else if (s.isSpeaking) {
        coreColor = 0x8b5cf6; // Violet
        ringColor = 0xa78bfa;
        lightColor = 0x7c3aed;
        intensity = 4.8;
      } else {
        coreColor = 0x2563eb; // Sapphire Blue
        ringColor = 0x60a5fa;
        lightColor = 0x1d4ed8;
        intensity = 2.8;
      }

      // Smooth light updates
      stateLight.color.lerp(new THREE.Color(coreColor), 0.08);
      stateLight.intensity = THREE.MathUtils.lerp(stateLight.intensity, intensity, 0.06);

      // Smooth plasma updates
      plasmaMat.color.lerp(new THREE.Color(coreColor), 0.08);
      ringMat1.emissive.lerp(new THREE.Color(coreColor), 0.08);
      ringMat2.emissive.lerp(new THREE.Color(ringColor), 0.08);
      photonMat.color.lerp(new THREE.Color(ringColor), 0.08);

      // Organic audio reactivity
      const audioAmp = s.isSpeaking ? Math.max(0.05, (s.viseme?.mouthOpen || 0) * 0.45) : 0;
      const breathe = Math.sin(time * 2.0) * 0.025;
      const targetCoreScale = 1.0 + breathe + audioAmp;

      coreMesh.scale.setScalar(THREE.MathUtils.lerp(coreMesh.scale.x, targetCoreScale, 0.15));
      coreMesh.rotation.y = time * 0.12;

      // Plasma pulse
      const plasmaScale = 0.48 + Math.sin(time * 3.5) * 0.03 + audioAmp * 0.2;
      plasmaMesh.scale.setScalar(plasmaScale);
      nucleusMesh.scale.setScalar(0.18 + Math.sin(time * 5.0) * 0.02 + audioAmp * 0.1);

      // Gyroscopic Ring Kinematics
      const ringSpeed = s.isProcessing ? 2.5 : (s.isListening ? 1.4 : (s.isSpeaking ? 1.6 : 0.6));
      ring1.rotation.z += ringSpeed * 0.006;
      ring1.rotation.x = Math.PI / 2.5 + Math.sin(time * 0.8) * 0.08;

      ring2.rotation.z -= ringSpeed * 0.005;
      ring2.rotation.y = Math.sin(time * 0.6) * 0.12;

      // Photon motes orbit
      const positions = photons.geometry.attributes.position.array;
      for (let i = 0; i < photonCount; i++) {
        const idx = i * 3;
        const sp = photonSpeeds[i];
        const angle = time * sp.speed * 0.4 + sp.phase;
        positions[idx] = sp.radius * Math.cos(angle);
        positions[idx + 2] = sp.radius * Math.sin(angle);
        positions[idx + 1] += Math.sin(time * 1.5 + sp.phase) * 0.0015;
      }
      photons.geometry.attributes.position.needsUpdate = true;

      renderer.render(scene, camera);
    };

    animate();

    // Resize
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || 280;
      const h = container.clientHeight || 280;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    cleanupRef.current = () => {
      window.removeEventListener('resize', handleResize);
      if (animFrameId) cancelAnimationFrame(animFrameId);
      renderer.dispose();
      coreGeo.dispose();
      coreMat.dispose();
      plasmaGeo.dispose();
      plasmaMat.dispose();
      nucleusGeo.dispose();
      nucleusMat.dispose();
      ringGeo1.dispose();
      ringMat1.dispose();
      ringGeo2.dispose();
      ringMat2.dispose();
      photonGeo.dispose();
      photonMat.dispose();
      scene.clear();
    };

    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
      style={{ touchAction: 'none' }}
    />
  );
};

export default ThreeAvatarCanvas;
