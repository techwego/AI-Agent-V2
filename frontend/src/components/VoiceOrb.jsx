import React, { useEffect, useRef, useMemo } from 'react';
import * as THREE from 'three';

/* ─────────────────────────────────────────────────────────────────────────────
 *  Enterprise 3D AI Voice Orb
 *
 *  Deep, muted, rich color palette — NO harsh white highlights.
 *  Smooth harmonic vertex waves on a matte-finish sphere.
 *  Orbital ring and soft dust field for spatial depth.
 *  Runs at locked 60 FPS with minimal draw calls.
 * ────────────────────────────────────────────────────────────────────────── */

const VERT = `
  uniform float uTime;
  uniform float uAmp;
  uniform float uFreq;
  varying vec3 vNorm;
  varying vec3 vPos;
  varying float vDisp;

  void main() {
    vNorm = normalize(normalMatrix * normal);
    vPos = position;

    float w1 = sin(position.x * uFreq + uTime * 0.9) * cos(position.y * uFreq * 0.8 + uTime * 0.6);
    float w2 = sin(position.z * uFreq * 1.2 + position.y + uTime * 1.1) * 0.4;
    float w3 = cos(position.x * 1.6 + position.z * 1.3 + uTime * 1.4) * 0.2;
    float d = (w1 + w2 + w3) * uAmp;
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
  varying vec3 vNorm;
  varying vec3 vPos;
  varying float vDisp;

  void main() {
    vec3 viewDir = normalize(cameraPosition - vPos);
    // Very soft Fresnel — falls off quickly, no blinding rim
    float fresnel = pow(1.0 - max(dot(viewDir, vNorm), 0.0), 3.5) * 0.45;

    // Slow-flowing gradient across the surface
    float g1 = sin(vPos.y * 2.0 + uTime * 0.5) * 0.5 + 0.5;
    float g2 = cos(vPos.x * 1.8 + vPos.z + uTime * 0.35) * 0.5 + 0.5;

    vec3 col = mix(uC1, uC2, g1);
    col = mix(col, uC3, g2 * 0.3);

    // Soft tinted rim glow (NOT white — uses uC3 which is a muted accent)
    col += uC3 * fresnel;

    // Subtle inner energy from displacement
    col += abs(vDisp) * uC2 * 1.2;

    gl_FragColor = vec4(col, 0.96);
  }
`;

const VoiceOrb = ({ state = 'IDLE', onClick }) => {
  const mountRef = useRef(null);
  const stateRef = useRef(state);

  useEffect(() => { stateRef.current = state; }, [state]);

  /* Deep muted palettes — NO white or near-white values anywhere */
  const palettes = useMemo(() => ({
    IDLE:        { c1:[0.06,0.10,0.38], c2:[0.12,0.28,0.62], c3:[0.22,0.44,0.72], amp:0.028, freq:1.2, speed:0.7  },
    LISTENING:   { c1:[0.04,0.28,0.42], c2:[0.06,0.48,0.60], c3:[0.15,0.62,0.72], amp:0.12, freq:2.0, speed:2.0  },
    INTRODUCING: { c1:[0.22,0.08,0.48], c2:[0.38,0.18,0.65], c3:[0.50,0.32,0.72], amp:0.08, freq:1.6, speed:1.5  },
    SPEAKING:    { c1:[0.20,0.06,0.45], c2:[0.35,0.16,0.62], c3:[0.48,0.30,0.70], amp:0.10, freq:1.7, speed:1.7  },
    PROCESSING:  { c1:[0.48,0.22,0.02], c2:[0.62,0.38,0.06], c3:[0.72,0.52,0.15], amp:0.06, freq:2.2, speed:2.0  },
    RETRIEVING:  { c1:[0.48,0.22,0.02], c2:[0.62,0.38,0.06], c3:[0.72,0.52,0.15], amp:0.06, freq:2.2, speed:2.0  },
    GENERATING:  { c1:[0.32,0.12,0.52], c2:[0.48,0.26,0.68], c3:[0.58,0.40,0.75], amp:0.07, freq:1.8, speed:1.6  },
  }), []);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    const S = Math.min(el.clientWidth, el.clientHeight) || 200;
    const scene = new THREE.Scene();
    const cam = new THREE.PerspectiveCamera(38, 1, 0.1, 50);
    cam.position.set(0, 0, 4.4);

    const ren = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    ren.setSize(S, S);
    ren.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    el.appendChild(ren.domElement);

    const R = 1.15;

    // Core sphere
    const geo = new THREE.SphereGeometry(R, 48, 48);
    const u = {
      uTime: { value: 0 },
      uAmp:  { value: 0.028 },
      uFreq: { value: 1.2 },
      uC1:   { value: new THREE.Vector3(0.06, 0.10, 0.38) },
      uC2:   { value: new THREE.Vector3(0.12, 0.28, 0.62) },
      uC3:   { value: new THREE.Vector3(0.22, 0.44, 0.72) },
    };
    const mat = new THREE.ShaderMaterial({
      uniforms: u, vertexShader: VERT, fragmentShader: FRAG,
      transparent: true, depthWrite: false,
    });
    const core = new THREE.Mesh(geo, mat);
    scene.add(core);

    // Orbital ring
    const rGeo = new THREE.TorusGeometry(R * 1.32, 0.012, 12, 48);
    const rMat = new THREE.MeshBasicMaterial({ color: 0x3b82f6, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending });
    const ring = new THREE.Mesh(rGeo, rMat);
    ring.rotation.x = Math.PI * 0.42;
    scene.add(ring);

    // Dust
    const dN = 22;
    const dGeo = new THREE.BufferGeometry();
    const dP = new Float32Array(dN * 3);
    for (let i = 0; i < dN; i++) {
      const r2 = R + 0.3 + Math.random() * 0.4;
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(Math.random() * 2 - 1);
      dP[i*3]   = r2 * Math.sin(ph) * Math.cos(th);
      dP[i*3+1] = r2 * Math.sin(ph) * Math.sin(th);
      dP[i*3+2] = r2 * Math.cos(ph);
    }
    dGeo.setAttribute('position', new THREE.BufferAttribute(dP, 3));
    const dMat = new THREE.PointsMaterial({ size: 0.032, color: 0x475569, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending });
    const dust = new THREE.Points(dGeo, dMat);
    scene.add(dust);

    const clk = new THREE.Clock();
    let anim;
    let curScale = 1.0;

    const lv = (c, t, s) => { c.x += (t[0]-c.x)*s; c.y += (t[1]-c.y)*s; c.z += (t[2]-c.z)*s; };

    const loop = () => {
      anim = requestAnimationFrame(loop);
      const dt = clk.getDelta();
      const p = palettes[stateRef.current] || palettes.IDLE;

      u.uTime.value += dt * p.speed;
      u.uAmp.value  += (p.amp  - u.uAmp.value)  * 0.08;
      u.uFreq.value += (p.freq - u.uFreq.value) * 0.08;
      lv(u.uC1.value, p.c1, 0.05);
      lv(u.uC2.value, p.c2, 0.05);
      lv(u.uC3.value, p.c3, 0.05);

      const tgt = (p.amp > 0.05 ? 1.06 : 1.0) + Math.sin(u.uTime.value * 1.5) * 0.012;
      curScale += (tgt - curScale) * 0.05;
      core.scale.setScalar(curScale);

      core.rotation.y += dt * 0.25 * p.speed;
      ring.rotation.z += dt * 0.2 * p.speed;
      dust.rotation.y += dt * 0.1;

      ren.render(scene, cam);
    };
    loop();

    return () => {
      cancelAnimationFrame(anim);
      geo.dispose(); mat.dispose();
      rGeo.dispose(); rMat.dispose();
      dGeo.dispose(); dMat.dispose();
      ren.dispose();
      if (el.contains(ren.domElement)) el.removeChild(ren.domElement);
    };
  }, [palettes]);

  const isListening = state === 'LISTENING';
  const isSpeaking  = state === 'SPEAKING' || state === 'INTRODUCING';
  const isThinking  = state === 'PROCESSING' || state === 'RETRIEVING' || state === 'GENERATING';

  return (
    <div className="relative flex items-center justify-center cursor-pointer select-none group" onClick={onClick}>
      {/* Ambient shadow — never white, always a muted tint */}
      <div className={`absolute w-48 h-48 rounded-full blur-3xl pointer-events-none transition-all duration-500 ${
        isListening  ? 'bg-sky-600/12 scale-110' :
        isSpeaking   ? 'bg-indigo-600/12 scale-110' :
        isThinking   ? 'bg-amber-600/10 scale-105' :
                       'bg-blue-700/8 group-hover:bg-blue-700/14 group-hover:scale-105'
      }`} />

      {/* Acoustic pulse ring */}
      {(isListening || isSpeaking) && (
        <div className={`absolute w-52 h-52 rounded-full border pointer-events-none animate-[ping_2.5s_cubic-bezier(0,0,0.2,1)_infinite] ${
          isListening ? 'border-sky-500/20' : 'border-indigo-500/20'
        }`} />
      )}

      {/* 3D WebGL mount */}
      <div ref={mountRef} className="w-44 h-44 sm:w-52 sm:h-52 relative z-10 transition-transform duration-300 group-hover:scale-[1.04] group-active:scale-95" />
    </div>
  );
};

export default VoiceOrb;
