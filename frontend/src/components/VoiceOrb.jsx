import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { Mic, Loader2, Sparkles } from 'lucide-react';

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
    camera.position.set(0, 0, 5.2);

    // 2. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    container.appendChild(renderer.domElement);

    // 3. Lighting (Vibrant Blue Specular Lighting)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.95);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0x60a5fa, 2.5); // Sky Blue
    keyLight.position.set(3, 4, 3);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x818cf8, 2.0); // Indigo
    fillLight.position.set(-3, -2, 2);
    scene.add(fillLight);

    const rimLight = new THREE.PointLight(0x38bdf8, 3.5, 10); // Cyan rim
    rimLight.position.set(0, 3, -2);
    scene.add(rimLight);

    const innerLight = new THREE.PointLight(0x3b82f6, 3.0, 6);
    scene.add(innerLight);

    // 4. Main 3D Sphere Geometry with High Subdivision for Smooth Audio Waves
    const sphereRadius = 1.45;
    const sphereGeo = new THREE.IcosahedronGeometry(sphereRadius, 32);
    const originalPositions = Float32Array.from(sphereGeo.attributes.position.array);

    // Custom Glassy Vibrant Royal Blue Material
    const sphereMat = new THREE.MeshPhysicalMaterial({
      color: 0x2563eb,
      emissive: 0x1d4ed8,
      emissiveIntensity: 0.30,
      roughness: 0.12,
      metalness: 0.15,
      clearcoat: 1.0,
      clearcoatRoughness: 0.08,
      transmission: 0.50,
      ior: 1.52,
      thickness: 1.3,
      reflectivity: 0.95,
      wireframe: false,
    });

    const orbMesh = new THREE.Mesh(sphereGeo, sphereMat);
    scene.add(orbMesh);

    // 5. Inner Core Energy Node (Data Library Core)
    const innerGeo = new THREE.SphereGeometry(0.85, 24, 24);
    const innerMat = new THREE.MeshBasicMaterial({
      color: 0x60a5fa,
      transparent: true,
      opacity: 0.65,
      wireframe: true
    });
    const innerMesh = new THREE.Mesh(innerGeo, innerMat);
    scene.add(innerMesh);

    // 6. Surrounding 3D Orbiting Knowledge Particles Halo
    const particleCount = 150;
    const particleGeo = new THREE.BufferGeometry();
    const particlePos = new Float32Array(particleCount * 3);
    const particleColors = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      const radius = sphereRadius + 0.35 + Math.random() * 0.45;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos((Math.random() * 2) - 1);

      particlePos[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      particlePos[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      particlePos[i * 3 + 2] = radius * Math.cos(phi);

      // Gradient color (Sky Blue to Indigo)
      particleColors[i * 3] = 0.2 + Math.random() * 0.3;     // R
      particleColors[i * 3 + 1] = 0.6 + Math.random() * 0.4; // G
      particleColors[i * 3 + 2] = 0.98;                      // B
    }

    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePos, 3));
    particleGeo.setAttribute('color', new THREE.BufferAttribute(particleColors, 3));

    const particleMat = new THREE.PointsMaterial({
      size: 0.045,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending
    });

    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // 7. Multi-Ring Orbital Spheres (Digital Data Node Rings)
    const ringGroup = new THREE.Group();

    // Ring 1 (Equatorial Cyan Ring)
    const ring1Geo = new THREE.RingGeometry(1.65, 1.72, 64);
    const ring1Mat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending
    });
    const ring1 = new THREE.Mesh(ring1Geo, ring1Mat);
    ring1.rotation.x = Math.PI / 2.3;
    ringGroup.add(ring1);

    // Ring 2 (Polar Indigo Ring)
    const ring2Geo = new THREE.RingGeometry(1.78, 1.83, 64);
    const ring2Mat = new THREE.MeshBasicMaterial({
      color: 0x818cf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending
    });
    const ring2 = new THREE.Mesh(ring2Geo, ring2Mat);
    ring2.rotation.y = Math.PI / 3;
    ring2.rotation.x = Math.PI / 6;
    ringGroup.add(ring2);

    scene.add(ringGroup);

    // 8. Animation Loop
    let clock = new THREE.Clock();
    let animId;
    let isPaused = false;

    const animate = () => {
      if (isPaused) return;
      animId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();
      const curState = stateRef.current;

      const isListen = curState === 'LISTENING';
      const isSpeak = curState === 'INTRODUCING' || curState === 'SPEAKING';
      const isProc = curState === 'PROCESSING' || curState === 'RETRIEVING' || curState === 'GENERATING';

      // State-specific dynamic colors & wave parameters
      let speed = 1.2;
      let amplitude = 0.08;
      let targetColor = new THREE.Color(0x2563eb);
      let targetEmissive = new THREE.Color(0x1d4ed8);
      let targetCoreColor = new THREE.Color(0x60a5fa);

      if (isListen) {
        speed = 3.4;
        amplitude = 0.19;
        targetColor = new THREE.Color(0x0284c7);
        targetEmissive = new THREE.Color(0x0369a1);
        targetCoreColor = new THREE.Color(0x38bdf8);
      } else if (isSpeak) {
        speed = 3.0;
        amplitude = 0.17;
        targetColor = new THREE.Color(0x4f46e5);
        targetEmissive = new THREE.Color(0x4338ca);
        targetCoreColor = new THREE.Color(0xa855f7);
      } else if (isProc) {
        speed = 4.2;
        amplitude = 0.11;
        targetColor = new THREE.Color(0xd97706);
        targetEmissive = new THREE.Color(0xb45309);
        targetCoreColor = new THREE.Color(0xfbbf24);
      }

      // Smooth color transitions
      sphereMat.color.lerp(targetColor, 0.08);
      sphereMat.emissive.lerp(targetEmissive, 0.08);
      innerMat.color.lerp(targetCoreColor, 0.08);
      ring1Mat.color.lerp(targetCoreColor, 0.08);

      // Vertex Displacements (Dynamic 3D Soundwaves)
      const positions = sphereGeo.attributes.position.array;
      for (let i = 0; i < positions.length; i += 3) {
        const ox = originalPositions[i];
        const oy = originalPositions[i + 1];
        const oz = originalPositions[i + 2];

        // 3D Harmonic Noise displacement
        const u = ox * 2.0 + elapsedTime * speed;
        const v = oy * 2.0 + elapsedTime * speed * 0.8;
        const w = oz * 2.0 + elapsedTime * speed * 1.2;

        const wave = Math.sin(u) * Math.cos(v) * Math.sin(w);
        const displacement = 1.0 + wave * amplitude;

        positions[i] = ox * displacement;
        positions[i + 1] = oy * displacement;
        positions[i + 2] = oz * displacement;
      }
      sphereGeo.attributes.position.needsUpdate = true;
      sphereGeo.computeVertexNormals();

      // Sphere Rotations & Floating
      orbMesh.rotation.y = elapsedTime * 0.35;
      orbMesh.rotation.x = Math.sin(elapsedTime * 0.5) * 0.1;
      orbMesh.position.y = Math.sin(elapsedTime * 1.5) * 0.06;

      // Inner Core Counter-Rotation
      innerMesh.rotation.y = -elapsedTime * 0.5;
      innerMesh.rotation.z = Math.cos(elapsedTime * 0.6) * 0.15;
      innerMesh.position.y = orbMesh.position.y;

      // Orbiting Particles Animation
      particles.rotation.y = elapsedTime * 0.25 * (isProc ? 2.5 : 1.0);
      particles.rotation.x = Math.sin(elapsedTime * 0.3) * 0.15;

      // Multi-Ring Gyroscopic Orbit Animation
      ring1.rotation.z += (isListen || isSpeak) ? 0.02 : 0.008;
      ring2.rotation.y += (isProc) ? 0.025 : 0.006;
      ring2.rotation.z += 0.004;

      if (isListen || isSpeak) {
        ring1.scale.setScalar(1.0 + Math.sin(elapsedTime * 4.0) * 0.12);
        ring2.scale.setScalar(1.0 + Math.cos(elapsedTime * 3.5) * 0.10);
      } else {
        ring1.scale.setScalar(1.0);
        ring2.scale.setScalar(1.0);
      }

      // Orbit specular point light
      rimLight.position.x = Math.sin(elapsedTime * 0.8) * 3;
      rimLight.position.y = Math.cos(elapsedTime * 0.8) * 3;

      renderer.render(scene, camera);
    };

    animate();

    // 9. Visibility Change Listener (Pause loop when tab is hidden)
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

    // 10. Resize Handling
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
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      cancelAnimationFrame(animId);
      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
      sphereGeo.dispose();
      sphereMat.dispose();
      innerGeo.dispose();
      innerMat.dispose();
      particleGeo.dispose();
      particleMat.dispose();
      ring1Geo.dispose();
      ring1Mat.dispose();
      ring2Geo.dispose();
      ring2Mat.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div className="relative flex flex-col items-center justify-center select-none py-2">
      
      {/* Dynamic Sound Wave Acoustic Rings (Listening / Speaking) */}
      {isListening && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-64 h-64 sm:w-72 sm:h-72 rounded-full border-2 border-blue-400/40 animate-[pulse-ring_2s_cubic-bezier(0.2,0.8,0.2,1)_infinite]" />
          <div className="absolute w-72 h-72 sm:w-80 sm:h-80 rounded-full border border-sky-400/25 animate-[pulse-ring_2s_cubic-bezier(0.2,0.8,0.2,1)_infinite_0.6s]" />
        </div>
      )}

      {isSpeaking && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-64 h-64 sm:w-72 sm:h-72 rounded-full border-2 border-indigo-400/40 animate-[pulse-ring_1.8s_ease-out_infinite]" />
          <div className="absolute w-72 h-72 sm:w-80 sm:h-80 rounded-full border border-purple-400/25 animate-[pulse-ring_1.8s_ease-out_infinite_0.5s]" />
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
        {/* Soft Ambient Ground Reflection / Shadow */}
        <div className={`absolute -inset-4 rounded-full blur-2xl transition-all duration-700 pointer-events-none ${
          isListening 
            ? 'bg-blue-500/40 scale-115' 
            : isSpeaking 
              ? 'bg-indigo-500/40 scale-115' 
              : isProcessing 
                ? 'bg-amber-500/35 scale-110' 
                : 'bg-blue-400/20 group-hover:bg-blue-500/35 group-hover:scale-105'
        }`} />

        {/* 3D WebGL Canvas Mount */}
        <div 
          ref={mountRef} 
          className="w-56 h-56 sm:w-64 sm:h-64 relative z-10 flex items-center justify-center pointer-events-none"
        />

        {/* Floating Center Frosted Glass Mic Glyphs */}
        <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
          <div className="p-3.5 rounded-full bg-white/30 backdrop-blur-md border border-white/60 shadow-md group-hover:bg-white/45 group-hover:scale-110 transition-all duration-300">
            {isProcessing ? (
              <Loader2 size={24} className="animate-spin text-white drop-shadow-md" />
            ) : (
              <Mic size={24} className={`text-white drop-shadow-md ${isListening ? 'animate-pulse text-blue-100' : ''}`} />
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default VoiceOrb;
