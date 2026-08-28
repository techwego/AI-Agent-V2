import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { Mic, Sparkles, Volume2, Loader2, Brain, Search, Radio } from 'lucide-react';

const VoiceOrb = ({ state = 'IDLE', onClick }) => {
  const mountRef = useRef(null);
  const stateRef = useRef(state);
  
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const isListening = state === 'LISTENING';
  const isSpeaking = state === 'INTRODUCING' || state === 'SPEAKING';
  const isProcessing = state === 'PROCESSING' || state === 'RETRIEVING' || state === 'GENERATING';

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 280;
    const height = container.clientHeight || 280;

    // 1. Scene & Camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 0, 5.0);

    // 2. High Performance WebGL Renderer
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true, 
      alpha: true, 
      powerPreference: 'high-performance' 
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.3;
    container.appendChild(renderer.domElement);

    // 3. Studio Lighting Rig
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.1);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0x60a5fa, 2.5);
    keyLight.position.set(3, 4, 3);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xa855f7, 2.0);
    fillLight.position.set(-3, -2, 2);
    scene.add(fillLight);

    const pointLight = new THREE.PointLight(0x38bdf8, 3.5, 8);
    pointLight.position.set(0, 2, 2);
    scene.add(pointLight);

    // 4. Core Holographic Glass Sphere (Optimized GPU Geometry)
    const sphereRadius = 1.35;
    const sphereGeo = new THREE.SphereGeometry(sphereRadius, 48, 48);

    const sphereMat = new THREE.MeshPhysicalMaterial({
      color: 0x1d4ed8,
      emissive: 0x1e40af,
      emissiveIntensity: 0.3,
      roughness: 0.1,
      metalness: 0.15,
      clearcoat: 1.0,
      clearcoatRoughness: 0.05,
      transmission: 0.55,
      ior: 1.45,
      thickness: 1.5,
      reflectivity: 0.95,
      transparent: true,
      opacity: 0.92
    });

    const orbMesh = new THREE.Mesh(sphereGeo, sphereMat);
    scene.add(orbMesh);

    // 5. Outer Iridescent Fresnel Shell
    const outerGeo = new THREE.SphereGeometry(sphereRadius * 1.04, 36, 36);
    const outerMat = new THREE.MeshStandardMaterial({
      color: 0x60a5fa,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.2,
      roughness: 0.2,
      metalness: 0.3,
      transparent: true,
      opacity: 0.35,
      wireframe: true
    });
    const outerShell = new THREE.Mesh(outerGeo, outerMat);
    scene.add(outerShell);

    // 6. Glowing Energy Core Sphere
    const coreGeo = new THREE.SphereGeometry(0.72, 24, 24);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0x93c5fd,
      transparent: true,
      opacity: 0.75,
      wireframe: false
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    scene.add(coreMesh);

    // 7. Surrounding 3D Floating Particle Halo (100 particles for high FPS)
    const particleCount = 90;
    const particleGeo = new THREE.BufferGeometry();
    const particlePos = new Float32Array(particleCount * 3);
    const particleColors = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      const radius = sphereRadius + 0.25 + Math.random() * 0.55;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos((Math.random() * 2) - 1);

      particlePos[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      particlePos[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      particlePos[i * 3 + 2] = radius * Math.cos(phi);

      particleColors[i * 3] = 0.35 + Math.random() * 0.4;     // R
      particleColors[i * 3 + 1] = 0.65 + Math.random() * 0.35; // G
      particleColors[i * 3 + 2] = 0.98;                        // B
    }

    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePos, 3));
    particleGeo.setAttribute('color', new THREE.BufferAttribute(particleColors, 3));

    const particleMat = new THREE.PointsMaterial({
      size: 0.05,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending
    });

    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // 8. 3D Equatorial Acoustic Wave Rings
    const ringGeo1 = new THREE.TorusGeometry(1.65, 0.018, 16, 64);
    const ringMat1 = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending
    });
    const ringMesh1 = new THREE.Mesh(ringGeo1, ringMat1);
    ringMesh1.rotation.x = Math.PI / 2.6;
    scene.add(ringMesh1);

    const ringGeo2 = new THREE.TorusGeometry(1.78, 0.012, 16, 64);
    const ringMat2 = new THREE.MeshBasicMaterial({
      color: 0x818cf8,
      transparent: true,
      opacity: 0.3,
      blending: THREE.AdditiveBlending
    });
    const ringMesh2 = new THREE.Mesh(ringGeo2, ringMat2);
    ringMesh2.rotation.x = -Math.PI / 2.8;
    scene.add(ringMesh2);

    // 9. Ultra-Smooth 60FPS GPU Animation Loop
    let clock = new THREE.Clock();
    let animId;

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();
      const curState = stateRef.current;

      const isListen = curState === 'LISTENING';
      const isSpeak = curState === 'INTRODUCING' || curState === 'SPEAKING';
      const isProc = curState === 'PROCESSING' || curState === 'RETRIEVING' || curState === 'GENERATING';

      // State dynamic color lerping
      let targetColor = new THREE.Color(0x1d4ed8);
      let targetEmissive = new THREE.Color(0x1e40af);
      let targetCore = new THREE.Color(0x93c5fd);

      if (isListen) {
        targetColor = new THREE.Color(0x0284c7);
        targetEmissive = new THREE.Color(0x0369a1);
        targetCore = new THREE.Color(0x38bdf8);
      } else if (isSpeak) {
        targetColor = new THREE.Color(0x4338ca);
        targetEmissive = new THREE.Color(0x3730a3);
        targetCore = new THREE.Color(0xc084fc);
      } else if (isProc) {
        targetColor = new THREE.Color(0xd97706);
        targetEmissive = new THREE.Color(0x92400e);
        targetCore = new THREE.Color(0xfde047);
      }

      sphereMat.color.lerp(targetColor, 0.1);
      sphereMat.emissive.lerp(targetEmissive, 0.1);
      coreMat.color.lerp(targetCore, 0.1);
      outerMat.emissive.lerp(targetCore, 0.1);

      // GPU Transform Pulse & Wave motion (ZERO CPU vertex loops)
      let pulseScale = 1.0;
      if (isListen) {
        pulseScale = 1.0 + Math.sin(elapsedTime * 8.0) * 0.06;
      } else if (isSpeak) {
        pulseScale = 1.0 + Math.sin(elapsedTime * 6.0) * 0.05 + Math.cos(elapsedTime * 10.0) * 0.03;
      } else if (isProc) {
        pulseScale = 1.0 + Math.sin(elapsedTime * 10.0) * 0.04;
      } else {
        pulseScale = 1.0 + Math.sin(elapsedTime * 2.0) * 0.02;
      }

      orbMesh.scale.setScalar(pulseScale);
      outerShell.scale.setScalar(pulseScale * 1.04);
      coreMesh.scale.setScalar(pulseScale * (isProc ? 0.9 : 0.8));

      // Gentle floating levitation
      const levitation = Math.sin(elapsedTime * 1.8) * 0.08;
      orbMesh.position.y = levitation;
      outerShell.position.y = levitation;
      coreMesh.position.y = levitation;

      // Rotations
      orbMesh.rotation.y = elapsedTime * 0.4;
      outerShell.rotation.y = -elapsedTime * 0.3;
      outerShell.rotation.x = Math.sin(elapsedTime * 0.5) * 0.2;
      
      particles.rotation.y = elapsedTime * (isProc ? 1.2 : 0.3);
      particles.rotation.x = Math.cos(elapsedTime * 0.4) * 0.15;
      particles.position.y = levitation;

      // Wave Rings animation
      ringMesh1.rotation.z += isListen || isSpeak ? 0.025 : 0.008;
      ringMesh1.scale.setScalar(pulseScale);
      ringMesh1.position.y = levitation;

      ringMesh2.rotation.z -= isListen || isSpeak ? 0.02 : 0.006;
      ringMesh2.scale.setScalar(pulseScale * 1.05);
      ringMesh2.position.y = levitation;

      // Orbiting light for dynamic specular sheen
      pointLight.position.x = Math.sin(elapsedTime * 1.2) * 2.5;
      pointLight.position.y = Math.cos(elapsedTime * 1.2) * 2.5;

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || 280;
      const h = container.clientHeight || 280;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animId);
      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
      sphereGeo.dispose();
      sphereMat.dispose();
      outerGeo.dispose();
      outerMat.dispose();
      coreGeo.dispose();
      coreMat.dispose();
      particleGeo.dispose();
      particleMat.dispose();
      ringGeo1.dispose();
      ringMat1.dispose();
      ringGeo2.dispose();
      ringMat2.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div className="relative flex flex-col items-center justify-center select-none py-1">
      
      {/* Dynamic Sound Wave Acoustic Rings (Listening / Speaking) */}
      {isListening && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-60 h-60 sm:w-72 sm:h-72 rounded-full border-2 border-blue-400/40 animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite]" />
          <div className="absolute w-64 h-64 sm:w-80 sm:h-80 rounded-full border border-sky-400/30 animate-[pulse_1.5s_ease-out_infinite]" />
        </div>
      )}

      {isSpeaking && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-60 h-60 sm:w-72 sm:h-72 rounded-full border-2 border-indigo-400/40 animate-[ping_1.8s_cubic-bezier(0,0,0.2,1)_infinite]" />
          <div className="absolute w-64 h-64 sm:w-80 sm:h-80 rounded-full border border-purple-400/30 animate-[pulse_1.4s_ease-out_infinite]" />
        </div>
      )}

      {/* Main Interactive 3D Sphere Canvas Container */}
      <div 
        onClick={onClick}
        className="relative group cursor-pointer active:scale-95 transition-transform duration-300 flex items-center justify-center"
        role="button"
        tabIndex={0}
        aria-label="Activate voice assistant"
      >
        {/* Soft Ambient Ground Aura Glow */}
        <div className={`absolute -inset-3 rounded-full blur-2xl transition-all duration-700 pointer-events-none ${
          isListening 
            ? 'bg-blue-500/40 scale-110' 
            : isSpeaking 
              ? 'bg-indigo-500/40 scale-110' 
              : isProcessing 
                ? 'bg-amber-500/35 scale-105' 
                : 'bg-blue-400/25 group-hover:bg-blue-500/35 group-hover:scale-105'
        }`} />

        {/* 3D WebGL Canvas Mount (Hardware Accelerated 60FPS) */}
        <div 
          ref={mountRef} 
          className="w-52 h-52 sm:w-60 sm:h-60 relative z-10 flex items-center justify-center pointer-events-none"
        />

        {/* Floating Center Frosted Glass Mic Glyphs */}
        <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
          <div className={`p-3.5 rounded-2xl backdrop-blur-md border shadow-md transition-all duration-300 ${
            isListening 
              ? 'bg-red-500/20 border-red-400/50 scale-110 ring-4 ring-red-500/20' 
              : isSpeaking 
                ? 'bg-purple-500/20 border-purple-400/50 scale-105 ring-4 ring-purple-500/20' 
                : isProcessing 
                  ? 'bg-amber-500/20 border-amber-400/50' 
                  : 'bg-white/30 border-white/60 group-hover:bg-white/45 group-hover:scale-110 group-hover:shadow-lg'
          }`}>
            {isProcessing ? (
              <Loader2 size={22} className="animate-spin text-amber-200 drop-shadow-md" />
            ) : isSpeaking ? (
              <Volume2 size={22} className="text-white drop-shadow-md animate-pulse" />
            ) : (
              <Mic size={22} className={`text-white drop-shadow-md ${isListening ? 'animate-pulse text-red-200' : ''}`} />
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default VoiceOrb;
