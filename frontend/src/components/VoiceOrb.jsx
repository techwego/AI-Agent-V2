import React, { useEffect, useRef, useMemo } from 'react';
import * as THREE from 'three';

/* ─────────────────────────────────────────────────────────────────────────────
 *  Enterprise AI Voice Orb
 *  High-performance WebGL plasma core with acoustic pulse ripples,
 *  chromatic iridescence, and reactive state transitions.
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
    
    // Smooth, efficient multi-wave harmonic deformation (replaces heavy simplex noise)
    float wave1 = sin(position.x * uFreq + uTime * 1.2) * cos(position.y * uFreq + uTime * 0.8);
    float wave2 = sin(position.z * uFreq * 1.5 + uTime * 1.6) * 0.5;
    float wave3 = cos(position.y * uFreq * 2.0 + position.x * 1.5 + uTime * 2.0) * 0.25;
    
    float d = (wave1 + wave2 + wave3) * uAmp;
    vDisp = d;
    
    vec3 p = position + normal * d;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

const FRAG = `
  uniform float uTime;
  uniform vec3 uC1;
  uniform vec3 uC2;
  uniform vec3 uC3;
  uniform float uAmp;
  varying vec3 vNorm;
  varying vec3 vPos;
  varying float vDisp;

  void main() {
    vec3 vDir = normalize(cameraPosition - vPos);
    float fresnel = pow(1.0 - max(dot(vDir, vNorm), 0.0), 2.5);

    // Dynamic color gradient driven by vertical position & deformation
    float t1 = sin(vPos.y * 3.0 + uTime * 0.8) * 0.5 + 0.5;
    float t2 = cos(vPos.x * 2.5 + uTime * 0.6) * 0.5 + 0.5;
    
    vec3 col = mix(uC1, uC2, t1);
    col = mix(col, uC3, t2 * 0.4);
    
    // Electric Fresnel rim highlight
    col += uC3 * fresnel * 1.6;
    
    // Core radiance
    col += abs(vDisp) * uC2 * 3.5;
    
    float alpha = 0.92 - fresnel * 0.08;
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

  const palettes = useMemo(() => ({
    IDLE:        { c1:[0.12,0.35,0.92], c2:[0.30,0.60,1.00], c3:[0.65,0.85,1.00], amp:0.04, freq:1.4, speed:1.0, scale:1.0 },
    LISTENING:   { c1:[0.00,0.72,0.95], c2:[0.15,0.90,1.00], c3:[0.55,1.00,1.00], amp:0.18, freq:2.2, speed:2.4, scale:1.12 },
    INTRODUCING: { c1:[0.45,0.18,0.95], c2:[0.70,0.40,1.00], c3:[0.90,0.65,1.00], amp:0.14, freq:1.8, speed:1.8, scale:1.08 },
    SPEAKING:    { c1:[0.45,0.18,0.95], c2:[0.70,0.40,1.00], c3:[0.90,0.65,1.00], amp:0.15, freq:1.9, speed:2.0, scale:1.10 },
    PROCESSING:  { c1:[0.90,0.55,0.05], c2:[1.00,0.75,0.15], c3:[1.00,0.90,0.40], amp:0.10, freq:2.8, speed:2.8, scale:1.05 },
    RETRIEVING:  { c1:[0.90,0.55,0.05], c2:[1.00,0.75,0.15], c3:[1.00,0.90,0.40], amp:0.10, freq:2.8, speed:2.8, scale:1.05 },
    GENERATING:  { c1:[0.70,0.28,0.95], c2:[0.85,0.52,1.00], c3:[0.98,0.82,1.00], amp:0.12, freq:2.4, speed:2.2, scale:1.06 },
  }), []);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    const W = el.clientWidth || 240;
    const H = el.clientHeight || 240;

    const scene = new THREE.Scene();
    const cam = new THREE.PerspectiveCamera(40, W / H, 0.1, 50);
    cam.position.set(0, 0, 4.8);

    const ren = new THREE.WebGLRenderer({ 
      antialias: true, 
      alpha: true, 
      powerPreference: 'high-performance' 
    });
    ren.setSize(W, H);
    ren.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    el.appendChild(ren.domElement);

    // ── L1: Glowing Plasma Core ──
    const R = 1.15;
    const cGeo = new THREE.SphereGeometry(R, 48, 48);
    const u = {
      uTime: { value: 0 }, 
      uAmp: { value: 0.04 }, 
      uFreq: { value: 1.4 },
      uC1: { value: new THREE.Vector3(0.12, 0.35, 0.92) },
      uC2: { value: new THREE.Vector3(0.30, 0.60, 1.00) },
      uC3: { value: new THREE.Vector3(0.65, 0.85, 1.00) },
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

    // ── L2: Glowing Nucleus Ring ──
    const ringGeo = new THREE.TorusGeometry(R * 1.25, 0.018, 16, 64);
    const ringMat = new THREE.MeshBasicMaterial({ 
      color: 0x60a5fa, 
      transparent: true, 
      opacity: 0.45, 
      blending: THREE.AdditiveBlending 
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI * 0.35;
    scene.add(ring);

    const ring2Geo = new THREE.TorusGeometry(R * 1.35, 0.012, 16, 64);
    const ring2Mat = new THREE.MeshBasicMaterial({ 
      color: 0x818cf8, 
      transparent: true, 
      opacity: 0.35, 
      blending: THREE.AdditiveBlending 
    });
    const ring2 = new THREE.Mesh(ring2Geo, ring2Mat);
    ring2.rotation.x = -Math.PI * 0.28;
    ring2.rotation.y = Math.PI * 0.15;
    scene.add(ring2);

    // ── L3: Orbiting Light Particles ──
    const dN = 36;
    const dGeo = new THREE.BufferGeometry();
    const dP = new Float32Array(dN * 3);
    for (let i = 0; i < dN; i++) {
      const r2 = R + 0.35 + Math.random() * 0.5;
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(Math.random() * 2 - 1);
      dP[i*3] = r2 * Math.sin(ph) * Math.cos(th);
      dP[i*3+1] = r2 * Math.sin(ph) * Math.sin(th);
      dP[i*3+2] = r2 * Math.cos(ph);
    }
    dGeo.setAttribute('position', new THREE.BufferAttribute(dP, 3));
    const dMat = new THREE.PointsMaterial({ 
      size: 0.045, 
      color: 0x93c5fd, 
      transparent: true, 
      opacity: 0.65, 
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

      // Update uniforms
      u.uTime.value += dt * p.speed;
      u.uAmp.value += (p.amp - u.uAmp.value) * 0.1;
      u.uFreq.value += (p.freq - u.uFreq.value) * 0.1;

      lerpVec3(u.uC1.value, p.c1, 0.08);
      lerpVec3(u.uC2.value, p.c2, 0.08);
      lerpVec3(u.uC3.value, p.c3, 0.08);

      // Smooth breathing scale
      const targetScale = p.scale + Math.sin(u.uTime.value * 2.0) * 0.02;
      currentScale += (targetScale - currentScale) * 0.08;
      core.scale.setScalar(currentScale);

      // Rotations
      core.rotation.y += dt * 0.4 * p.speed;
      ring.rotation.z += dt * 0.35 * p.speed;
      ring2.rotation.z -= dt * 0.28 * p.speed;
      dust.rotation.y += dt * 0.15;

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
      {/* Enterprise Multi-Layer Glow Aura */}
      <div className={`absolute w-56 h-56 rounded-full blur-2xl transition-all duration-700 pointer-events-none ${
        state === 'LISTENING' 
          ? 'bg-cyan-500/25 scale-110 animate-pulse' 
          : state === 'SPEAKING' || state === 'INTRODUCING'
            ? 'bg-indigo-500/25 scale-110 animate-pulse'
            : state === 'PROCESSING' || state === 'RETRIEVING' || state === 'GENERATING'
              ? 'bg-amber-500/20 scale-105'
              : 'bg-blue-500/15 group-hover:bg-blue-500/25 group-hover:scale-105'
      }`} />
      
      {/* Acoustic Concentric Pulse Wave */}
      {(state === 'LISTENING' || state === 'SPEAKING') && (
        <div className="absolute inset-0 rounded-full border border-blue-400/40 animate-ping pointer-events-none" />
      )}

      {/* WebGL Canvas Mount */}
      <div 
        ref={mountRef} 
        className="w-56 h-56 sm:w-64 sm:h-64 relative z-10 transition-transform duration-300 group-hover:scale-105 group-active:scale-95" 
      />
    </div>
  );
};

export default VoiceOrb;
