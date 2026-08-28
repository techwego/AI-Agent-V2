import React, { useEffect, useRef, useMemo } from 'react';
import * as THREE from 'three';

/* ─────────────────────────────────────────────────────────────────────────────
 *  AI Voice Orb — Living Aurora Nebula Sphere
 *
 *  A multi-layered 3D energy sphere with:
 *    • GLSL vertex-shader distortion that "breathes" in real-time
 *    • Dual-shell aurora refraction glass
 *    • Orbiting sentinel light motes
 *    • Triple gyroscopic orbit rings
 *    • State-reactive color morphing (no mic icon — the orb itself IS the UI)
 * ────────────────────────────────────────────────────────────────────────── */

// ─── Custom GLSL Vertex Shader for organic surface displacement ──────────
const DISTORT_VERT = `
  uniform float uTime;
  uniform float uAmplitude;
  uniform float uFrequency;
  varying vec3 vNormal;
  varying vec3 vPosition;

  // Simplex-like noise for organic ripple
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

  float snoise(vec3 v) {
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod289(i);
    vec4 p = permute(permute(permute(
        i.z + vec4(0.0, i1.z, i2.z, 1.0))
      + i.y + vec4(0.0, i1.y, i2.y, 1.0))
      + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    vec4 s0 = floor(b0) * 2.0 + 1.0;
    vec4 s1 = floor(b1) * 2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
  }

  void main() {
    vNormal = normal;
    vPosition = position;
    float noise = snoise(position * uFrequency + uTime * 0.6);
    vec3 newPos = position + normal * noise * uAmplitude;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(newPos, 1.0);
  }
`;

// ─── Custom GLSL Fragment Shader for iridescent aurora color ─────────────
const DISTORT_FRAG = `
  uniform float uTime;
  uniform vec3 uColor1;
  uniform vec3 uColor2;
  uniform vec3 uColor3;
  varying vec3 vNormal;
  varying vec3 vPosition;

  void main() {
    // Fresnel for rim-light glow
    vec3 viewDir = normalize(cameraPosition - vPosition);
    float fresnel = pow(1.0 - max(dot(viewDir, vNormal), 0.0), 2.5);

    // Tri-color aurora gradient driven by position + time
    float t1 = sin(vPosition.y * 3.0 + uTime * 0.8) * 0.5 + 0.5;
    float t2 = cos(vPosition.x * 2.5 + uTime * 0.5) * 0.5 + 0.5;
    vec3 col = mix(uColor1, uColor2, t1);
    col = mix(col, uColor3, t2 * 0.4);

    // Add bright fresnel rim
    col += fresnel * uColor3 * 1.2;

    gl_FragColor = vec4(col, 0.92 - fresnel * 0.15);
  }
`;

const VoiceOrb = ({ state = 'IDLE', onClick }) => {
  const mountRef = useRef(null);
  const stateRef = useRef(state);
  const uniformsRef = useRef(null);

  useEffect(() => { stateRef.current = state; }, [state]);

  // Color palettes per state (lerped smoothly)
  const palettes = useMemo(() => ({
    IDLE:        { c1: [0.11, 0.31, 0.85], c2: [0.22, 0.53, 0.98], c3: [0.58, 0.78, 1.00] },
    LISTENING:   { c1: [0.00, 0.72, 0.88], c2: [0.00, 0.90, 0.95], c3: [0.40, 1.00, 1.00] },
    INTRODUCING: { c1: [0.35, 0.18, 0.85], c2: [0.62, 0.32, 0.98], c3: [0.82, 0.55, 1.00] },
    SPEAKING:    { c1: [0.35, 0.18, 0.85], c2: [0.62, 0.32, 0.98], c3: [0.82, 0.55, 1.00] },
    PROCESSING:  { c1: [0.85, 0.55, 0.04], c2: [0.95, 0.72, 0.15], c3: [1.00, 0.90, 0.40] },
    RETRIEVING:  { c1: [0.85, 0.55, 0.04], c2: [0.95, 0.72, 0.15], c3: [1.00, 0.90, 0.40] },
    GENERATING:  { c1: [0.70, 0.30, 0.90], c2: [0.85, 0.50, 1.00], c3: [0.95, 0.80, 1.00] },
  }), []);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const w = container.clientWidth || 260;
    const h = container.clientHeight || 260;

    // ─── Scene ───────────────────────────────────────────────────────
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, w / h, 0.1, 100);
    camera.position.set(0, 0, 5.2);

    const renderer = new THREE.WebGLRenderer({
      antialias: true, alpha: true, powerPreference: 'high-performance'
    });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.4;
    container.appendChild(renderer.domElement);

    // ─── Lighting ────────────────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    const keyLight = new THREE.DirectionalLight(0x93c5fd, 2.2);
    keyLight.position.set(4, 5, 3);
    scene.add(keyLight);
    const fillLight = new THREE.DirectionalLight(0xc084fc, 1.5);
    fillLight.position.set(-3, -3, 2);
    scene.add(fillLight);

    // Orbiting specular highlight
    const orbitLight = new THREE.PointLight(0x60a5fa, 4, 10);
    scene.add(orbitLight);

    // ─── Layer 1: GLSL Distorted Aurora Core (the hero) ──────────────
    const R = 1.3;
    const coreGeo = new THREE.SphereGeometry(R, 64, 64);
    const uniforms = {
      uTime:      { value: 0 },
      uAmplitude: { value: 0.08 },
      uFrequency: { value: 1.8 },
      uColor1:    { value: new THREE.Vector3(0.11, 0.31, 0.85) },
      uColor2:    { value: new THREE.Vector3(0.22, 0.53, 0.98) },
      uColor3:    { value: new THREE.Vector3(0.58, 0.78, 1.00) },
    };
    uniformsRef.current = uniforms;

    const coreMat = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: DISTORT_VERT,
      fragmentShader: DISTORT_FRAG,
      transparent: true,
      depthWrite: false,
    });
    const core = new THREE.Mesh(coreGeo, coreMat);
    scene.add(core);

    // ─── Layer 2: Glass refraction outer shell ───────────────────────
    const shellGeo = new THREE.SphereGeometry(R * 1.08, 48, 48);
    const shellMat = new THREE.MeshPhysicalMaterial({
      color: 0x3b82f6,
      emissive: 0x1e40af,
      emissiveIntensity: 0.15,
      roughness: 0.05,
      metalness: 0.0,
      clearcoat: 1.0,
      clearcoatRoughness: 0.02,
      transmission: 0.85,
      ior: 1.5,
      thickness: 0.6,
      transparent: true,
      opacity: 0.45,
      envMapIntensity: 1.5,
    });
    const shell = new THREE.Mesh(shellGeo, shellMat);
    scene.add(shell);

    // ─── Layer 3: Inner luminous energy nucleus ──────────────────────
    const nucleusGeo = new THREE.IcosahedronGeometry(0.45, 3);
    const nucleusMat = new THREE.MeshBasicMaterial({
      color: 0x93c5fd,
      transparent: true,
      opacity: 0.6,
    });
    const nucleus = new THREE.Mesh(nucleusGeo, nucleusMat);
    scene.add(nucleus);

    // ─── Layer 4: Triple gyroscopic orbit rings ──────────────────────
    const rings = [];
    const ringConfigs = [
      { radius: 1.72, tube: 0.014, color: 0x38bdf8, tiltX: Math.PI * 0.38, tiltY: 0 },
      { radius: 1.82, tube: 0.010, color: 0x818cf8, tiltX: -Math.PI * 0.28, tiltY: Math.PI * 0.15 },
      { radius: 1.58, tube: 0.012, color: 0xa78bfa, tiltX: Math.PI * 0.50, tiltY: Math.PI * 0.35 },
    ];
    ringConfigs.forEach(cfg => {
      const geo = new THREE.TorusGeometry(cfg.radius, cfg.tube, 16, 80);
      const mat = new THREE.MeshBasicMaterial({
        color: cfg.color,
        transparent: true,
        opacity: 0.35,
        blending: THREE.AdditiveBlending,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.rotation.x = cfg.tiltX;
      mesh.rotation.y = cfg.tiltY;
      scene.add(mesh);
      rings.push({ mesh, geo, mat, speed: 0.4 + Math.random() * 0.3 });
    });

    // ─── Layer 5: Sentinel light motes (tiny glowing spheres orbiting) ──
    const moteCount = 6;
    const motes = [];
    for (let i = 0; i < moteCount; i++) {
      const mGeo = new THREE.SphereGeometry(0.04, 8, 8);
      const mMat = new THREE.MeshBasicMaterial({
        color: 0x93c5fd,
        transparent: true,
        opacity: 0.9,
      });
      const mMesh = new THREE.Mesh(mGeo, mMat);
      scene.add(mMesh);
      motes.push({
        mesh: mMesh, geo: mGeo, mat: mMat,
        orbit: R + 0.35 + Math.random() * 0.3,
        speed: 0.6 + Math.random() * 0.8,
        phase: Math.random() * Math.PI * 2,
        tilt: (Math.random() - 0.5) * Math.PI * 0.6,
      });
    }

    // ─── Layer 6: Sparse dust-field particles ────────────────────────
    const dustCount = 60;
    const dustGeo = new THREE.BufferGeometry();
    const dustPos = new Float32Array(dustCount * 3);
    for (let i = 0; i < dustCount; i++) {
      const r = R + 0.5 + Math.random() * 0.8;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      dustPos[i*3]   = r * Math.sin(phi) * Math.cos(theta);
      dustPos[i*3+1] = r * Math.sin(phi) * Math.sin(theta);
      dustPos[i*3+2] = r * Math.cos(phi);
    }
    dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
    const dustMat = new THREE.PointsMaterial({
      size: 0.035, color: 0xbfdbfe,
      transparent: true, opacity: 0.6,
      blending: THREE.AdditiveBlending,
    });
    const dust = new THREE.Points(dustGeo, dustMat);
    scene.add(dust);

    // ─── Animation Loop ──────────────────────────────────────────────
    const clock = new THREE.Clock();
    let animId;

    const lerpV3 = (cur, tgt, t) => {
      cur.x += (tgt[0] - cur.x) * t;
      cur.y += (tgt[1] - cur.y) * t;
      cur.z += (tgt[2] - cur.z) * t;
    };

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();
      const st = stateRef.current;
      const pal = palettes[st] || palettes.IDLE;

      const isActive = st === 'LISTENING' || st === 'INTRODUCING' || st === 'SPEAKING';
      const isProc   = st === 'PROCESSING' || st === 'RETRIEVING' || st === 'GENERATING';

      // ── Smooth color morphing ──
      lerpV3(uniforms.uColor1.value, pal.c1, 0.06);
      lerpV3(uniforms.uColor2.value, pal.c2, 0.06);
      lerpV3(uniforms.uColor3.value, pal.c3, 0.06);
      uniforms.uTime.value = t;

      // ── Amplitude reacts to state ──
      let targetAmp = 0.06;
      let targetFreq = 1.8;
      if (st === 'LISTENING') { targetAmp = 0.18; targetFreq = 2.8; }
      else if (st === 'SPEAKING' || st === 'INTRODUCING') { targetAmp = 0.14; targetFreq = 2.2; }
      else if (isProc) { targetAmp = 0.10; targetFreq = 3.5; }
      uniforms.uAmplitude.value += (targetAmp - uniforms.uAmplitude.value) * 0.08;
      uniforms.uFrequency.value += (targetFreq - uniforms.uFrequency.value) * 0.08;

      // ── Levitation & breathing ──
      const lev = Math.sin(t * 1.5) * 0.1;
      const breathe = 1.0 + Math.sin(t * (isActive ? 5.0 : 1.8)) * (isActive ? 0.05 : 0.02);

      core.position.y = lev;
      core.rotation.y = t * 0.35;
      core.scale.setScalar(breathe);

      shell.position.y = lev;
      shell.rotation.y = -t * 0.2;
      shell.scale.setScalar(breathe * 1.08);
      shellMat.emissiveIntensity = 0.15 + Math.sin(t * 3) * 0.08;

      nucleus.position.y = lev;
      nucleus.rotation.x = t * 1.2;
      nucleus.rotation.z = t * 0.9;
      nucleus.scale.setScalar(breathe * (0.6 + Math.sin(t * 4) * 0.15));

      // ── Gyroscopic rings ──
      rings.forEach((r, i) => {
        r.mesh.rotation.z += (isActive ? 0.03 : 0.01) * r.speed * (i % 2 === 0 ? 1 : -1);
        r.mesh.scale.setScalar(breathe);
        r.mesh.position.y = lev;
        r.mat.opacity = isActive ? 0.55 : isProc ? 0.45 : 0.30;
      });

      // ── Sentinel motes orbiting ──
      motes.forEach(m => {
        const angle = t * m.speed + m.phase;
        m.mesh.position.x = Math.cos(angle) * m.orbit;
        m.mesh.position.y = Math.sin(angle) * m.orbit * 0.6 + lev;
        m.mesh.position.z = Math.sin(angle + m.tilt) * m.orbit * 0.4;
        m.mesh.scale.setScalar(0.8 + Math.sin(t * 3 + m.phase) * 0.4);
        m.mat.opacity = 0.6 + Math.sin(t * 4 + m.phase) * 0.35;
      });

      // ── Dust field rotation ──
      dust.rotation.y = t * (isProc ? 0.8 : 0.15);
      dust.rotation.x = Math.sin(t * 0.3) * 0.1;
      dust.position.y = lev;

      // ── Orbiting specular light ──
      orbitLight.position.set(
        Math.sin(t * 1.0) * 3,
        Math.cos(t * 0.8) * 2.5,
        Math.cos(t * 1.0) * 2
      );

      renderer.render(scene, camera);
    };
    animate();

    // ─── Resize handling ─────────────────────────────────────────────
    const onResize = () => {
      if (!container) return;
      const nw = container.clientWidth || 260;
      const nh = container.clientHeight || 260;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    };
    window.addEventListener('resize', onResize);

    // ─── Cleanup ─────────────────────────────────────────────────────
    return () => {
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(animId);
      if (container && renderer.domElement) container.removeChild(renderer.domElement);
      [coreGeo, coreMat, shellGeo, shellMat, nucleusGeo, nucleusMat, dustGeo, dustMat]
        .forEach(d => d.dispose());
      rings.forEach(r => { r.geo.dispose(); r.mat.dispose(); });
      motes.forEach(m => { m.geo.dispose(); m.mat.dispose(); });
      renderer.dispose();
    };
  }, []);

  const isListening  = state === 'LISTENING';
  const isSpeaking   = state === 'INTRODUCING' || state === 'SPEAKING';
  const isProcessing = state === 'PROCESSING' || state === 'RETRIEVING' || state === 'GENERATING';

  return (
    <div className="relative flex flex-col items-center justify-center select-none py-1">

      {/* Expanding ripple halos for active states */}
      {isListening && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-56 h-56 sm:w-68 sm:h-68 rounded-full border-2 border-cyan-400/30 animate-[ping_2.2s_cubic-bezier(0,0,0.2,1)_infinite]" />
          <div className="absolute w-64 h-64 sm:w-76 sm:h-76 rounded-full border border-sky-300/20 animate-[ping_2.8s_cubic-bezier(0,0,0.2,1)_infinite_0.4s]" />
        </div>
      )}
      {isSpeaking && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-56 h-56 sm:w-68 sm:h-68 rounded-full border-2 border-purple-400/30 animate-[ping_1.8s_cubic-bezier(0,0,0.2,1)_infinite]" />
          <div className="absolute w-64 h-64 sm:w-76 sm:h-76 rounded-full border border-violet-300/20 animate-[ping_2.4s_cubic-bezier(0,0,0.2,1)_infinite_0.3s]" />
        </div>
      )}

      {/* Clickable container */}
      <div
        onClick={onClick}
        className="relative group cursor-pointer active:scale-[0.96] transition-transform duration-200 flex items-center justify-center"
        role="button"
        tabIndex={0}
        aria-label="Activate voice assistant"
      >
        {/* Ambient glow backdrop */}
        <div className={`absolute -inset-4 rounded-full blur-3xl transition-all duration-700 pointer-events-none ${
          isListening
            ? 'bg-cyan-400/35 scale-115'
            : isSpeaking
              ? 'bg-violet-500/35 scale-115'
              : isProcessing
                ? 'bg-amber-400/30 scale-110'
                : 'bg-blue-400/20 group-hover:bg-blue-500/30 group-hover:scale-110'
        }`} />

        {/* 3D WebGL Canvas — the orb is the entire interactive element */}
        <div
          ref={mountRef}
          className="w-52 h-52 sm:w-60 sm:h-60 relative z-10 pointer-events-none"
        />
      </div>
    </div>
  );
};

export default VoiceOrb;
