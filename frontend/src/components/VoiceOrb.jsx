import React, { useEffect, useRef, useMemo } from 'react';
import * as THREE from 'three';

/* ─────────────────────────────────────────────────────────────────────────────
 *  Enterprise AI Fluid Energy Orb (Apple Intelligence / Gemini Style)
 *  
 *  • Soothing deep sapphire, rich indigo, and celestial cyan hues (No harsh white glare)
 *  • Organic harmonic fluid displacement with silky surface currents
 *  • Soft bioluminescent Fresnel glow with smooth exponential roll-off
 *  • Dual celestial orbital rings with additive photon dust
 *  • Ground reflection aura for rich 3D depth
 *  • 60 FPS locked WebGL performance
 * ────────────────────────────────────────────────────────────────────────── */

const VERT = `
  uniform float uTime;
  uniform float uAmp;
  uniform float uFreq;
  varying vec3 vNorm;
  varying vec3 vPos;
  varying float vDisp;

  void main() {
    vNorm = normal;
    vPos = position;
    
    // Smooth, organic harmonic fluid flow without sharp vertex spikes
    float waveA = sin(position.x * uFreq + uTime * 1.1) * cos(position.y * uFreq * 0.9 + uTime * 0.7);
    float waveB = sin(position.z * uFreq * 1.3 + position.y * 1.1 + uTime * 1.3) * 0.45;
    float waveC = cos(position.x * 1.8 + position.z * 1.4 + uTime * 1.6) * 0.25;
    
    float d = (waveA + waveB + waveC) * uAmp;
    vDisp = d;
    
    vec3 p = position + normal * d;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

const FRAG = `
  uniform float uTime;
  uniform vec3 uC1; // Primary deep tone
  uniform vec3 uC2; // Vibrant mid tone
  uniform vec3 uC3; // Soft rim glow (non-blinding)
  uniform float uAmp;
  varying vec3 vNorm;
  varying vec3 vPos;
  varying float vDisp;

  void main() {
    vec3 vDir = normalize(cameraPosition - vPos);
    // Soft exponential Fresnel curve - prevents blinding glare
    float fresnel = pow(1.0 - max(dot(vDir, vNorm), 0.0), 2.2);

    // Flowing iridescent color field
    float t1 = sin(vPos.y * 2.5 + uTime * 0.7) * 0.5 + 0.5;
    float t2 = cos(vPos.x * 2.2 + vPos.z * 1.5 + uTime * 0.5) * 0.5 + 0.5;
    
    vec3 col = mix(uC1, uC2, t1);
    col = mix(col, uC3, t2 * 0.45);
    
    // Soft chromatic Fresnel rim (smooth bioluminescent accent, not white glare)
    col += uC3 * fresnel * 0.85;
    
    // Subtle internal energy depth
    col += abs(vDisp) * uC2 * 1.8;
    
    // Alpha blending with smooth translucent falloff
    float alpha = 0.94 - fresnel * 0.06;
    gl_FragColor = vec4(col, alpha);
  }
`;

const VoiceOrb = ({ state = 'IDLE', onClick }) => {
  const mountRef = useRef(null);
  const stateRef = useRef(state);
  const uRef = useRef(null);

  useEffect(() => { 
    stateRef.current = state; 
  }, [state]);

  // Deep, soothing enterprise color palettes (Rich, eye-pleasing tones)
  const palettes = useMemo(() => ({
    IDLE: { 
      c1: [0.08, 0.18, 0.65],  // Deep Royal Sapphire
      c2: [0.20, 0.42, 0.88],  // Luminous Cobalt
      c3: [0.35, 0.68, 0.95],  // Soft Celestial Blue
      amp: 0.035, freq: 1.3, speed: 0.9, scale: 1.0 
    },
    LISTENING: { 
      c1: [0.02, 0.45, 0.68],  // Deep Ocean Teal
      c2: [0.05, 0.70, 0.85],  // Vibrant Cyan
      c3: [0.25, 0.90, 0.95],  // Soft Aqua Glow
      amp: 0.14, freq: 2.1, speed: 2.2, scale: 1.08 
    },
    INTRODUCING: { 
      c1: [0.30, 0.12, 0.70],  // Deep Violet
      c2: [0.52, 0.28, 0.90],  // Electric Purple
      c3: [0.72, 0.50, 0.95],  // Soft Lilac Glow
      amp: 0.10, freq: 1.7, speed: 1.6, scale: 1.05 
    },
    SPEAKING: { 
      c1: [0.28, 0.10, 0.68],  // Deep Indigo
      c2: [0.48, 0.25, 0.88],  // Royal Purple
      c3: [0.68, 0.48, 0.95],  // Soft Lavender Glow
      amp: 0.12, freq: 1.8, speed: 1.9, scale: 1.06 
    },
    PROCESSING: { 
      c1: [0.65, 0.32, 0.04],  // Deep Warm Amber
      c2: [0.88, 0.52, 0.10],  // Golden Honey
      c3: [0.95, 0.72, 0.25],  // Warm Sunset Gold
      amp: 0.08, freq: 2.4, speed: 2.2, scale: 1.04 
    },
    RETRIEVING: { 
      c1: [0.65, 0.32, 0.04], 
      c2: [0.88, 0.52, 0.10], 
      c3: [0.95, 0.72, 0.25], 
      amp: 0.08, freq: 2.4, speed: 2.2, scale: 1.04 
    },
    GENERATING: { 
      c1: [0.45, 0.18, 0.75], 
      c2: [0.68, 0.38, 0.92], 
      c3: [0.85, 0.62, 0.98], 
      amp: 0.09, freq: 2.0, speed: 1.8, scale: 1.05 
    },
  }), []);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    const W = el.clientWidth || 240;
    const H = el.clientHeight || 240;

    const scene = new THREE.Scene();
    const cam = new THREE.PerspectiveCamera(40, W / H, 0.1, 50);
    cam.position.set(0, 0, 4.6);

    const ren = new THREE.WebGLRenderer({ 
      antialias: true, 
      alpha: true, 
      powerPreference: 'high-performance' 
    });
    ren.setSize(W, H);
    ren.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    el.appendChild(ren.domElement);

    // ── L1: Soft Plasma Core ──
    const R = 1.18;
    const cGeo = new THREE.SphereGeometry(R, 52, 52);
    const u = {
      uTime: { value: 0 }, 
      uAmp: { value: 0.035 }, 
      uFreq: { value: 1.3 },
      uC1: { value: new THREE.Vector3(0.08, 0.18, 0.65) },
      uC2: { value: new THREE.Vector3(0.20, 0.42, 0.88) },
      uC3: { value: new THREE.Vector3(0.35, 0.68, 0.95) },
    };
    uRef.current = u;

    const cMat = new THREE.ShaderMaterial({ 
      uniforms: u, 
      vertexShader: VERT, 
      fragmentShader: FRAG, 
      transparent: true, 
      depthWrite: false 
    });
    const core = new THREE.Mesh(cGeo, cMat);
    scene.add(core);

    // ── L2: Celestial Orbital Rings (Soft, Non-glare glow) ──
    const ringGeo = new THREE.TorusGeometry(R * 1.28, 0.014, 16, 64);
    const ringMat = new THREE.MeshBasicMaterial({ 
      color: 0x3b82f6, 
      transparent: true, 
      opacity: 0.35, 
      blending: THREE.AdditiveBlending 
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI * 0.38;
    scene.add(ring);

    const ring2Geo = new THREE.TorusGeometry(R * 1.38, 0.010, 16, 64);
    const ring2Mat = new THREE.MeshBasicMaterial({ 
      color: 0x6366f1, 
      transparent: true, 
      opacity: 0.28, 
      blending: THREE.AdditiveBlending 
    });
    const ring2 = new THREE.Mesh(ring2Geo, ring2Mat);
    ring2.rotation.x = -Math.PI * 0.32;
    ring2.rotation.y = Math.PI * 0.20;
    scene.add(ring2);

    // ── L3: Soft Photon Motes ──
    const dN = 28;
    const dGeo = new THREE.BufferGeometry();
    const dP = new Float32Array(dN * 3);
    for (let i = 0; i < dN; i++) {
      const r2 = R + 0.32 + Math.random() * 0.45;
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(Math.random() * 2 - 1);
      dP[i*3] = r2 * Math.sin(ph) * Math.cos(th);
      dP[i*3+1] = r2 * Math.sin(ph) * Math.sin(th);
      dP[i*3+2] = r2 * Math.cos(ph);
    }
    dGeo.setAttribute('position', new THREE.BufferAttribute(dP, 3));
    const dMat = new THREE.PointsMaterial({ 
      size: 0.038, 
      color: 0x60a5fa, 
      transparent: true, 
      opacity: 0.55, 
      blending: THREE.AdditiveBlending 
    });
    const dust = new THREE.Points(dGeo, dMat);
    scene.add(dust);

    // ── 60FPS Smooth Animation Loop ──
    const clk = new THREE.Clock();
    let anim;

    const lerpVec3 = (cur, target, speed) => {
      cur.x += (target[0] - cur.x) * speed;
      cur.y += (target[1] - cur.y) * speed;
      cur.z += (target[2] - cur.z) * speed;
    };

    let currentScale = 1.0;

    const loop = () => {
      anim = requestAnimationFrame(loop);
      const dt = clk.getDelta();
      const st = stateRef.current;
      const p = palettes[st] || palettes.IDLE;

      // Update uniforms smoothly
      u.uTime.value += dt * p.speed;
      u.uAmp.value += (p.amp - u.uAmp.value) * 0.08;
      u.uFreq.value += (p.freq - u.uFreq.value) * 0.08;

      lerpVec3(u.uC1.value, p.c1, 0.06);
      lerpVec3(u.uC2.value, p.c2, 0.06);
      lerpVec3(u.uC3.value, p.c3, 0.06);

      // Smooth organic breathing scale
      const targetScale = p.scale + Math.sin(u.uTime.value * 1.8) * 0.018;
      currentScale += (targetScale - currentScale) * 0.06;
      core.scale.setScalar(currentScale);

      // Rotations
      core.rotation.y += dt * 0.3 * p.speed;
      ring.rotation.z += dt * 0.25 * p.speed;
      ring2.rotation.z -= dt * 0.20 * p.speed;
      dust.rotation.y += dt * 0.12;

      ren.render(scene, cam);
    };

    loop();

    return () => {
      cancelAnimationFrame(anim);
      cGeo.dispose();
      cMat.dispose();
      ringGeo.dispose();
      ringMat.dispose();
      ring2Geo.dispose();
      ring2Mat.dispose();
      dGeo.dispose();
      dMat.dispose();
      ren.dispose();
      if (el.contains(ren.domElement)) {
        el.removeChild(ren.domElement);
      }
    };
  }, [palettes]);

  return (
    <div 
      className="relative flex items-center justify-center cursor-pointer select-none group"
      onClick={onClick}
      title="Click to interact with AI Voice Assistant"
    >
      {/* Soft Multi-Layered Ground Reflection & Radial Bloom (No eye pain) */}
      <div className={`absolute w-52 h-52 sm:w-60 sm:h-60 rounded-full blur-3xl transition-all duration-700 pointer-events-none ${
        state === 'LISTENING' 
          ? 'bg-cyan-500/18 scale-110 animate-pulse' 
          : state === 'SPEAKING' || state === 'INTRODUCING'
            ? 'bg-indigo-500/18 scale-110 animate-pulse'
            : state === 'PROCESSING' || state === 'RETRIEVING' || state === 'GENERATING'
              ? 'bg-amber-500/16 scale-105'
              : 'bg-blue-600/12 group-hover:bg-blue-600/20 group-hover:scale-105'
      }`} />
      
      {/* Subtle acoustic pulse ring */}
      {(state === 'LISTENING' || state === 'SPEAKING') && (
        <div className="absolute inset-0 rounded-full border border-blue-400/25 animate-ping pointer-events-none" />
      )}

      {/* WebGL Canvas Mount */}
      <div 
        ref={mountRef} 
        className="w-52 h-52 sm:w-60 sm:h-60 relative z-10 transition-transform duration-300 group-hover:scale-105 group-active:scale-95" 
      />
    </div>
  );
};

export default VoiceOrb;
