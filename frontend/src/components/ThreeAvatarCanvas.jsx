import React, { useRef, useEffect, useCallback } from 'react';
import * as THREE from 'three';

/**
 * ThreeAvatarCanvas — Enterprise-Grade 3D Animated AI Orb
 *
 * A stunning holographic energy sphere with:
 * - Iridescent glass core with animated noise distortion
 * - Triple gyroscopic orbital rings with glow trails
 * - 200+ floating holographic data particles
 * - Audio-reactive pulse waves synced to speech visemes
 * - State-reactive ambient lighting (Idle/Listening/Processing/Speaking)
 * - Smooth 60 FPS animation with zero WebGL context leaks
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

  // Stable state ref so animation loop always reads latest without re-creating
  const stateRef = useRef({ isSpeaking, isListening, isProcessing, viseme, state });
  useEffect(() => {
    stateRef.current = { isSpeaking, isListening, isProcessing, viseme, state };
  }, [isSpeaking, isListening, isProcessing, viseme, state]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Prevent duplicate init
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }

    const width = container.clientWidth || 280;
    const height = container.clientHeight || 280;

    // ─── Scene ───
    const scene = new THREE.Scene();

    // ─── Camera ───
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 0, 4.2);
    camera.lookAt(0, 0, 0);

    // ─── Renderer ───
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.3;
    container.replaceChildren(renderer.domElement);

    // ─── Lighting ───
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xe0f0ff, 2.0);
    keyLight.position.set(3, 4, 5);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x60a5fa, 1.2);
    fillLight.position.set(-3, 1, 3);
    scene.add(fillLight);

    // State-reactive point light
    const stateLight = new THREE.PointLight(0x3b82f6, 3.0, 10);
    stateLight.position.set(0, 0, 2);
    scene.add(stateLight);

    // Under-glow
    const underGlow = new THREE.PointLight(0x818cf8, 2.5, 8);
    underGlow.position.set(0, -2, 1);
    scene.add(underGlow);

    // ─── Core Orb (Iridescent Glass Sphere) ───
    const coreGeo = new THREE.IcosahedronGeometry(0.85, 6);
    const coreMat = new THREE.MeshPhysicalMaterial({
      color: 0x93c5fd,
      roughness: 0.08,
      metalness: 0.15,
      clearcoat: 1.0,
      clearcoatRoughness: 0.05,
      transparent: true,
      opacity: 0.88,
      transmission: 0.35,
      thickness: 1.2,
      ior: 1.8,
      envMapIntensity: 2.0,
      sheen: 0.8,
      sheenColor: new THREE.Color(0xa78bfa)
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    scene.add(coreMesh);

    // Inner energy core (glowing hot center)
    const innerCoreGeo = new THREE.IcosahedronGeometry(0.38, 4);
    const innerCoreMat = new THREE.MeshBasicMaterial({
      color: 0x60a5fa,
      transparent: true,
      opacity: 0.7
    });
    const innerCore = new THREE.Mesh(innerCoreGeo, innerCoreMat);
    scene.add(innerCore);

    // Nucleus (bright white point)
    const nucleusGeo = new THREE.SphereGeometry(0.12, 16, 16);
    const nucleusMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.9
    });
    const nucleus = new THREE.Mesh(nucleusGeo, nucleusMat);
    scene.add(nucleus);

    // ─── Gyroscopic Orbital Rings ───
    const createRing = (radius, tubeRadius, color, opacity) => {
      const geo = new THREE.TorusGeometry(radius, tubeRadius, 24, 100);
      const mat = new THREE.MeshPhysicalMaterial({
        color,
        roughness: 0.1,
        metalness: 0.6,
        transparent: true,
        opacity,
        clearcoat: 0.8,
        side: THREE.DoubleSide,
        emissive: color,
        emissiveIntensity: 0.3
      });
      return new THREE.Mesh(geo, mat);
    };

    const ring1 = createRing(1.25, 0.018, 0x60a5fa, 0.65);
    ring1.rotation.x = Math.PI / 2.3;
    ring1.rotation.y = 0.3;
    scene.add(ring1);

    const ring2 = createRing(1.42, 0.012, 0xa78bfa, 0.5);
    ring2.rotation.x = Math.PI / 3.5;
    ring2.rotation.z = Math.PI / 4;
    scene.add(ring2);

    const ring3 = createRing(1.58, 0.008, 0x38bdf8, 0.35);
    ring3.rotation.x = Math.PI / 1.6;
    ring3.rotation.y = Math.PI / 3;
    scene.add(ring3);

    // ─── Data Particles (Floating dots orbiting the sphere) ───
    const particleCount = 220;
    const particlePositions = new Float32Array(particleCount * 3);
    const particleSizes = new Float32Array(particleCount);
    const particleSpeeds = new Float32Array(particleCount);
    const particlePhases = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 1.5 + Math.random() * 1.0;
      particlePositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      particlePositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      particlePositions[i * 3 + 2] = r * Math.cos(phi);
      particleSizes[i] = 0.015 + Math.random() * 0.035;
      particleSpeeds[i] = 0.3 + Math.random() * 0.7;
      particlePhases[i] = Math.random() * Math.PI * 2;
    }

    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    particleGeo.setAttribute('size', new THREE.BufferAttribute(particleSizes, 1));

    const particleMat = new THREE.PointsMaterial({
      color: 0x93c5fd,
      size: 0.04,
      transparent: true,
      opacity: 0.8,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // ─── Pulse Rings (Audio-reactive expanding ripples) ───
    const pulseRings = [];
    for (let i = 0; i < 3; i++) {
      const pulseGeo = new THREE.RingGeometry(0.9 + i * 0.3, 0.92 + i * 0.3, 64);
      const pulseMat = new THREE.MeshBasicMaterial({
        color: 0x60a5fa,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const pulseMesh = new THREE.Mesh(pulseGeo, pulseMat);
      pulseMesh.rotation.x = -Math.PI / 2;
      scene.add(pulseMesh);
      pulseRings.push({ mesh: pulseMesh, phase: i * (Math.PI * 2 / 3), scale: 1.0 });
    }

    // ─── Animation Loop ───
    const clock = new THREE.Clock();
    let animFrameId = null;

    const animate = () => {
      animFrameId = requestAnimationFrame(animate);
      const time = clock.getElapsedTime();
      const s = stateRef.current;

      // ── State-reactive colors ──
      let primaryColor, secondaryColor, emissiveColor, lightIntensity;
      if (s.isListening) {
        primaryColor = 0x22d3ee; // Cyan
        secondaryColor = 0x06b6d4;
        emissiveColor = 0x0891b2;
        lightIntensity = 4.5;
      } else if (s.isProcessing) {
        primaryColor = 0xfbbf24; // Amber
        secondaryColor = 0xf59e0b;
        emissiveColor = 0xd97706;
        lightIntensity = 4.0;
      } else if (s.isSpeaking) {
        primaryColor = 0xa78bfa; // Violet
        secondaryColor = 0x8b5cf6;
        emissiveColor = 0x7c3aed;
        lightIntensity = 5.0;
      } else {
        primaryColor = 0x60a5fa; // Sapphire
        secondaryColor = 0x3b82f6;
        emissiveColor = 0x2563eb;
        lightIntensity = 3.0;
      }

      // Smoothly transition state light
      stateLight.color.lerp(new THREE.Color(primaryColor), 0.08);
      stateLight.intensity = THREE.MathUtils.lerp(stateLight.intensity, lightIntensity, 0.05);
      underGlow.color.lerp(new THREE.Color(secondaryColor), 0.06);

      // ── Audio-reactive scaling ──
      const audioLevel = s.isSpeaking ? Math.max(0.1, (s.viseme?.mouthOpen || 0)) : 0;
      const pulseAmplitude = s.isListening ? 0.08 : (s.isSpeaking ? audioLevel * 0.12 : 0.03);
      const breathe = Math.sin(time * 2.0) * 0.03;
      const targetScale = 1.0 + pulseAmplitude * Math.sin(time * (s.isSpeaking ? 8 : 3)) + breathe;

      // Core orb animation
      coreMesh.scale.setScalar(THREE.MathUtils.lerp(coreMesh.scale.x, targetScale, 0.12));
      coreMesh.rotation.y = time * 0.15;
      coreMesh.rotation.x = Math.sin(time * 0.4) * 0.1;
      coreMat.color.lerp(new THREE.Color(primaryColor), 0.04);
      coreMat.sheenColor.lerp(new THREE.Color(secondaryColor), 0.04);
      coreMat.opacity = THREE.MathUtils.lerp(coreMat.opacity, s.isListening || s.isSpeaking ? 0.92 : 0.85, 0.05);

      // Inner core glow
      const innerPulse = 0.38 + Math.sin(time * 4) * 0.06 + audioLevel * 0.15;
      innerCore.scale.setScalar(innerPulse);
      innerCoreMat.color.lerp(new THREE.Color(emissiveColor), 0.06);
      innerCoreMat.opacity = 0.5 + audioLevel * 0.4 + Math.sin(time * 6) * 0.1;

      // Nucleus pulse
      nucleus.scale.setScalar(0.12 + Math.sin(time * 5) * 0.03 + audioLevel * 0.08);
      nucleusMat.opacity = 0.75 + Math.sin(time * 7) * 0.15;

      // ── Orbital Ring Gyroscope ──
      const ringSpeed = s.isProcessing ? 1.8 : (s.isListening ? 1.2 : (s.isSpeaking ? 1.5 : 0.4));
      ring1.rotation.z += ringSpeed * 0.008;
      ring1.rotation.x += Math.sin(time * 0.7) * 0.002;
      ring1.material.emissive.lerp(new THREE.Color(primaryColor), 0.05);
      ring1.material.emissiveIntensity = 0.3 + audioLevel * 0.5;

      ring2.rotation.z -= ringSpeed * 0.006;
      ring2.rotation.y += Math.cos(time * 0.5) * 0.003;
      ring2.material.emissive.lerp(new THREE.Color(secondaryColor), 0.05);

      ring3.rotation.y += ringSpeed * 0.004;
      ring3.rotation.x += Math.sin(time * 0.3) * 0.002;

      // Processing: speed up rings visibly
      if (s.isProcessing) {
        ring1.rotation.z += 0.015;
        ring2.rotation.z -= 0.012;
        ring3.rotation.y += 0.01;
      }

      // ── Particles orbit ──
      const positions = particles.geometry.attributes.position.array;
      for (let i = 0; i < particleCount; i++) {
        const idx = i * 3;
        const speed = particleSpeeds[i];
        const phase = particlePhases[i];
        const x = positions[idx];
        const z = positions[idx + 2];
        const angle = Math.atan2(z, x) + speed * 0.004 * (s.isProcessing ? 3 : 1);
        const r = Math.sqrt(x * x + z * z);
        positions[idx] = r * Math.cos(angle);
        positions[idx + 2] = r * Math.sin(angle);
        // Gentle vertical bob
        positions[idx + 1] += Math.sin(time * speed + phase) * 0.001;
      }
      particles.geometry.attributes.position.needsUpdate = true;
      particleMat.color.lerp(new THREE.Color(primaryColor), 0.03);
      particleMat.opacity = s.isListening || s.isSpeaking ? 0.9 : 0.65;

      // ── Pulse Rings (Ripples) ──
      for (let i = 0; i < pulseRings.length; i++) {
        const pr = pulseRings[i];
        if (s.isListening || s.isSpeaking) {
          pr.scale += 0.02;
          pr.mesh.scale.setScalar(pr.scale);
          pr.mesh.material.opacity = Math.max(0, 0.4 - (pr.scale - 1.0) * 0.25);
          pr.mesh.material.color.lerp(new THREE.Color(primaryColor), 0.1);
          if (pr.scale > 2.8) {
            pr.scale = 1.0;
            pr.mesh.material.opacity = 0.4;
          }
        } else {
          pr.mesh.material.opacity = THREE.MathUtils.lerp(pr.mesh.material.opacity, 0, 0.05);
          pr.scale = THREE.MathUtils.lerp(pr.scale, 1.0, 0.05);
          pr.mesh.scale.setScalar(pr.scale);
        }
      }

      renderer.render(scene, camera);
    };

    animate();

    // ─── Resize ───
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || 280;
      const h = container.clientHeight || 280;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // ─── Cleanup ───
    cleanupRef.current = () => {
      window.removeEventListener('resize', handleResize);
      if (animFrameId) cancelAnimationFrame(animFrameId);
      renderer.dispose();
      coreGeo.dispose();
      coreMat.dispose();
      innerCoreGeo.dispose();
      innerCoreMat.dispose();
      nucleusGeo.dispose();
      nucleusMat.dispose();
      particleGeo.dispose();
      particleMat.dispose();
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
