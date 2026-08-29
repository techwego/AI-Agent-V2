import React, { useEffect, useRef, useMemo } from 'react';
import * as THREE from 'three';

/* ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
 *  AI Voice Orb ΓÇö Plasma Energy Sphere
 *
 *  A living, breathing plasma sphere with:
 *    ΓÇó Custom GLSL vertex shader with 3-octave simplex noise deformation
 *    ΓÇó Iridescent chromatic fragment shader with Fresnel glow
 *    ΓÇó Transparent glass refraction outer mantle
 *    ΓÇó Spinning icosahedron energy nucleus
 *    ΓÇó Triple tilted orbit rings with glow
 *    ΓÇó 6 orbiting sentinel light motes
 *    ΓÇó Stardust particle field
 *    ΓÇó State-reactive everything ΓÇö color, amplitude, speed
 *    ΓÇó NO mic icon ΓÇö the sphere IS the interface
 * ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ */

const VERT = `
  uniform float uTime;
  uniform float uAmp;
  uniform float uFreq;
  varying vec3 vNorm;
  varying vec3 vPos;
  varying float vDisp;

  vec3 mod289(vec3 x){return x-floor(x*(1./289.))*289.;}
  vec4 mod289(vec4 x){return x-floor(x*(1./289.))*289.;}
  vec4 permute(vec4 x){return mod289(((x*34.)+1.)*x);}
  vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-.85373472095314*r;}

  float snoise(vec3 v){
    const vec2 C=vec2(1./6.,1./3.);
    const vec4 D=vec4(0.,.5,1.,2.);
    vec3 i=floor(v+dot(v,C.yyy));
    vec3 x0=v-i+dot(i,C.xxx);
    vec3 g=step(x0.yzx,x0.xyz);
    vec3 l=1.-g;
    vec3 i1=min(g.xyz,l.zxy);
    vec3 i2=max(g.xyz,l.zxy);
    vec3 x1=x0-i1+C.xxx;
    vec3 x2=x0-i2+C.yyy;
    vec3 x3=x0-D.yyy;
    i=mod289(i);
    vec4 p=permute(permute(permute(
      i.z+vec4(0.,i1.z,i2.z,1.))
      +i.y+vec4(0.,i1.y,i2.y,1.))
      +i.x+vec4(0.,i1.x,i2.x,1.));
    float n_=.142857142857;
    vec3 ns=n_*D.wyz-D.xzx;
    vec4 j=p-49.*floor(p*ns.z*ns.z);
    vec4 x_=floor(j*ns.z);
    vec4 y_=floor(j-7.*x_);
    vec4 x=x_*ns.x+ns.yyyy;
    vec4 y=y_*ns.x+ns.yyyy;
    vec4 h=1.-abs(x)-abs(y);
    vec4 b0=vec4(x.xy,y.xy);
    vec4 b1=vec4(x.zw,y.zw);
    vec4 s0=floor(b0)*2.+1.;
    vec4 s1=floor(b1)*2.+1.;
    vec4 sh=-step(h,vec4(0.));
    vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;
    vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
    vec3 p0=vec3(a0.xy,h.x);
    vec3 p1=vec3(a0.zw,h.y);
    vec3 p2=vec3(a1.xy,h.z);
    vec3 p3=vec3(a1.zw,h.w);
    vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
    p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
    vec4 m=max(.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.);
    m=m*m;
    return 42.*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
  }

  void main(){
    vNorm=normal;
    vPos=position;
    // 3-octave fractal noise for organic plasma surface
    float n1=snoise(position*uFreq+uTime*0.5)*uAmp;
    float n2=snoise(position*uFreq*2.1+uTime*0.8)*uAmp*0.4;
    float n3=snoise(position*uFreq*4.3+uTime*1.2)*uAmp*0.15;
    float d=n1+n2+n3;
    vDisp=d;
    vec3 p=position+normal*d;
    gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);
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

  void main(){
    vec3 vDir=normalize(cameraPosition-vPos);
    float fresnel=pow(1.-max(dot(vDir,vNorm),0.),3.0);

    // Tri-color iridescent blend driven by displacement + position
    float t1=sin(vPos.y*3.5+uTime*0.7)*0.5+0.5;
    float t2=cos(vPos.x*2.8+uTime*0.4)*0.5+0.5;
    float t3=sin(vDisp*8.0+uTime)*0.5+0.5;
    vec3 c=mix(uC1,uC2,t1);
    c=mix(c,uC3,t2*0.5);
    // Bright displacement highlights
    c+=uC3*t3*0.3;
    // Fresnel rim glow
    c+=fresnel*uC3*1.5;
    // Brighten active deformation areas
    c+=abs(vDisp)*uC2*3.0;

    float alpha=0.88-fresnel*0.1;
    gl_FragColor=vec4(c,alpha);
  }
`;

const VoiceOrb = ({ state = 'IDLE', onClick }) => {
  const mountRef = useRef(null);
  const stateRef = useRef(state);
  const uRef = useRef(null);

  useEffect(() => { stateRef.current = state; }, [state]);

  const palettes = useMemo(() => ({
    IDLE:        { c1:[0.11,0.30,0.85], c2:[0.25,0.55,1.00], c3:[0.60,0.80,1.00], amp:0.06, freq:1.6, speed:1 },
    LISTENING:   { c1:[0.00,0.68,0.90], c2:[0.10,0.88,1.00], c3:[0.50,1.00,1.00], amp:0.22, freq:2.5, speed:2.5 },
    INTRODUCING: { c1:[0.40,0.15,0.90], c2:[0.65,0.35,1.00], c3:[0.85,0.60,1.00], amp:0.16, freq:2.0, speed:2 },
    SPEAKING:    { c1:[0.40,0.15,0.90], c2:[0.65,0.35,1.00], c3:[0.85,0.60,1.00], amp:0.16, freq:2.0, speed:2 },
    PROCESSING:  { c1:[0.85,0.50,0.00], c2:[0.95,0.70,0.10], c3:[1.00,0.88,0.35], amp:0.12, freq:3.2, speed:3 },
    RETRIEVING:  { c1:[0.85,0.50,0.00], c2:[0.95,0.70,0.10], c3:[1.00,0.88,0.35], amp:0.12, freq:3.2, speed:3 },
    GENERATING:  { c1:[0.65,0.25,0.92], c2:[0.82,0.48,1.00], c3:[0.95,0.78,1.00], amp:0.14, freq:2.6, speed:2.2 },
  }), []);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    const W = el.clientWidth || 260;
    const H = el.clientHeight || 260;

    const scene = new THREE.Scene();
    const cam = new THREE.PerspectiveCamera(40, W / H, 0.1, 100);
    cam.position.set(0, 0, 5.4);

    const ren = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    ren.setSize(W, H);
    ren.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    ren.toneMapping = THREE.ACESFilmicToneMapping;
    ren.toneMappingExposure = 1.5;
    el.appendChild(ren.domElement);

    // Lighting
    scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const kl = new THREE.DirectionalLight(0x93c5fd, 2.5); kl.position.set(4, 5, 3); scene.add(kl);
    const fl = new THREE.DirectionalLight(0xc084fc, 1.8); fl.position.set(-3, -3, 2); scene.add(fl);
    const ol = new THREE.PointLight(0x60a5fa, 4, 12); scene.add(ol);
    const ol2 = new THREE.PointLight(0xa78bfa, 3, 10); scene.add(ol2);

    // ΓöÇΓöÇ L1: GLSL Plasma Core ΓöÇΓöÇ
    const R = 1.25;
    const cGeo = new THREE.SphereGeometry(R, 80, 80);
    const u = {
      uTime: { value: 0 }, uAmp: { value: 0.06 }, uFreq: { value: 1.6 },
      uC1: { value: new THREE.Vector3(0.11, 0.30, 0.85) },
      uC2: { value: new THREE.Vector3(0.25, 0.55, 1.00) },
      uC3: { value: new THREE.Vector3(0.60, 0.80, 1.00) },
    };
    uRef.current = u;
    const cMat = new THREE.ShaderMaterial({ uniforms: u, vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false, side: THREE.DoubleSide });
    const core = new THREE.Mesh(cGeo, cMat);
    scene.add(core);

    // ΓöÇΓöÇ L2: Glass mantle ΓöÇΓöÇ
    const sGeo = new THREE.SphereGeometry(R * 1.12, 48, 48);
    const sMat = new THREE.MeshPhysicalMaterial({
      color: 0x3b82f6, emissive: 0x1e3a8a, emissiveIntensity: 0.12,
      roughness: 0.03, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.01,
      transmission: 0.88, ior: 1.52, thickness: 0.5,
      transparent: true, opacity: 0.35, envMapIntensity: 2
    });
    const shell = new THREE.Mesh(sGeo, sMat);
    scene.add(shell);

    // ΓöÇΓöÇ L3: Spinning icosahedron nucleus ΓöÇΓöÇ
    const nGeo = new THREE.IcosahedronGeometry(0.38, 2);
    const nMat = new THREE.MeshBasicMaterial({ color: 0x93c5fd, transparent: true, opacity: 0.55, wireframe: true });
    const nucleus = new THREE.Mesh(nGeo, nMat);
    scene.add(nucleus);

    // ΓöÇΓöÇ L4: Triple orbit rings ΓöÇΓöÇ
    const rings = [];
    [
      { r: 1.65, t: 0.016, c: 0x38bdf8, tx: Math.PI * 0.40, ty: 0 },
      { r: 1.78, t: 0.010, c: 0x818cf8, tx: -Math.PI * 0.30, ty: Math.PI * 0.18 },
      { r: 1.52, t: 0.013, c: 0xa78bfa, tx: Math.PI * 0.55, ty: Math.PI * 0.38 },
    ].forEach((cfg, i) => {
      const g = new THREE.TorusGeometry(cfg.r, cfg.t, 16, 100);
      const m = new THREE.MeshBasicMaterial({ color: cfg.c, transparent: true, opacity: 0.30, blending: THREE.AdditiveBlending });
      const mesh = new THREE.Mesh(g, m);
      mesh.rotation.x = cfg.tx; mesh.rotation.y = cfg.ty;
      scene.add(mesh);
      rings.push({ mesh, g, m, spd: 0.35 + i * 0.15 });
    });

    // ΓöÇΓöÇ L5: Sentinel motes ΓöÇΓöÇ
    const motes = [];
    for (let i = 0; i < 8; i++) {
      const mg = new THREE.SphereGeometry(0.035 + Math.random() * 0.025, 8, 8);
      const mm = new THREE.MeshBasicMaterial({ color: 0xbfdbfe, transparent: true, opacity: 0.85 });
      const mesh = new THREE.Mesh(mg, mm);
      scene.add(mesh);
      motes.push({ mesh, g: mg, m: mm, orb: R + 0.3 + Math.random() * 0.4, spd: 0.5 + Math.random() * 0.9, ph: Math.random() * Math.PI * 2, tilt: (Math.random() - 0.5) * 1.2 });
    }

    // ΓöÇΓöÇ L6: Stardust ΓöÇΓöÇ
    const dN = 70;
    const dGeo = new THREE.BufferGeometry();
    const dP = new Float32Array(dN * 3);
    for (let i = 0; i < dN; i++) {
      const r2 = R + 0.6 + Math.random() * 0.9;
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(Math.random() * 2 - 1);
      dP[i*3] = r2 * Math.sin(ph) * Math.cos(th);
      dP[i*3+1] = r2 * Math.sin(ph) * Math.sin(th);
      dP[i*3+2] = r2 * Math.cos(ph);
    }
    dGeo.setAttribute('position', new THREE.BufferAttribute(dP, 3));
    const dMat = new THREE.PointsMaterial({ size: 0.04, color: 0xbfdbfe, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending });
    const dust = new THREE.Points(dGeo, dMat);
    scene.add(dust);

    // ΓöÇΓöÇ Animation ΓöÇΓöÇ
    const clk = new THREE.Clock();
    let anim;
    const lv3 = (c, t, s) => { c.x += (t[0] - c.x) * s; c.y += (t[1] - c.y) * s; c.z += (t[2] - c.z) * s; };

    const loop = () => {
      anim = requestAnimationFrame(loop);
      const t = clk.getElapsedTime();
      const st = stateRef.current;
      const p = palettes[st] || palettes.IDLE;

      const isActive = st === 'LISTENING' || st === 'INTRODUCING' || st === 'SPEAKING';
      const isProc = st === 'PROCESSING' || st === 'RETRIEVING' || st === 'GENERATING';

      // Smooth uniform lerping
      lv3(u.uC1.value, p.c1, 0.05);
      lv3(u.uC2.value, p.c2, 0.05);
      lv3(u.uC3.value, p.c3, 0.05);
      u.uAmp.value += (p.amp - u.uAmp.value) * 0.06;
      u.uFreq.value += (p.freq - u.uFreq.value) * 0.06;
      u.uTime.value = t * p.speed;

      // Levitation
      const lev = Math.sin(t * 1.4) * 0.12;
      const breathe = 1 + Math.sin(t * (isActive ? 5 : 1.6)) * (isActive ? 0.06 : 0.02);

      core.position.y = lev;
      core.rotation.y = t * 0.3;
      core.scale.setScalar(breathe);

      shell.position.y = lev;
      shell.rotation.y = -t * 0.15;
      shell.scale.setScalar(breathe * 1.12);
      sMat.emissiveIntensity = 0.12 + Math.sin(t * 3) * 0.06;

      nucleus.position.y = lev;
      nucleus.rotation.x = t * 1.5;
      nucleus.rotation.z = t * 1.1;
      const nPulse = 0.55 + Math.sin(t * 5) * 0.2;
      nucleus.scale.setScalar(nPulse);
      nMat.opacity = 0.3 + Math.sin(t * 4) * 0.2;

      // Rings
      rings.forEach((r, i) => {
        r.mesh.rotation.z += (isActive ? 0.035 : 0.008) * r.spd * (i % 2 === 0 ? 1 : -1);
        r.mesh.scale.setScalar(breathe);
        r.mesh.position.y = lev;
        r.m.opacity = isActive ? 0.55 : isProc ? 0.42 : 0.25;
      });

      // Motes
      motes.forEach(m => {
        const a = t * m.spd + m.ph;
        m.mesh.position.set(
          Math.cos(a) * m.orb,
          Math.sin(a) * m.orb * 0.5 + lev,
          Math.sin(a + m.tilt) * m.orb * 0.35
        );
        m.mesh.scale.setScalar(0.7 + Math.sin(t * 3 + m.ph) * 0.5);
        m.m.opacity = 0.5 + Math.sin(t * 4 + m.ph) * 0.4;
      });

      dust.rotation.y = t * (isProc ? 0.6 : 0.12);
      dust.position.y = lev;

      ol.position.set(Math.sin(t * 0.9) * 3.2, Math.cos(t * 0.7) * 2.8, Math.cos(t) * 2);
      ol2.position.set(-Math.cos(t * 0.8) * 2.5, Math.sin(t * 1.1) * 2, Math.sin(t * 0.6) * 3);

      ren.render(scene, cam);
    };
    loop();

    const onResize = () => {
      if (!el) return;
      const nw = el.clientWidth || 260, nh = el.clientHeight || 260;
      cam.aspect = nw / nh;
      cam.updateProjectionMatrix();
      ren.setSize(nw, nh);
    };
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(anim);
      if (el && ren.domElement) el.removeChild(ren.domElement);
      [cGeo, cMat, sGeo, sMat, nGeo, nMat, dGeo, dMat].forEach(d => d.dispose());
      rings.forEach(r => { r.g.dispose(); r.m.dispose(); });
      motes.forEach(m => { m.g.dispose(); m.m.dispose(); });
      ren.dispose();
    };
  }, []);

  const isListening  = state === 'LISTENING';
  const isSpeaking   = state === 'INTRODUCING' || state === 'SPEAKING';
  const isProcessing = state === 'PROCESSING' || state === 'RETRIEVING' || state === 'GENERATING';

  return (
    <div className="relative flex flex-col items-center justify-center select-none">
      {/* CSS ripple halos for active states */}
      {(isListening || isSpeaking) && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className={`w-56 h-56 sm:w-64 sm:h-64 rounded-full border-2 animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite] ${
            isListening ? 'border-cyan-400/25' : 'border-violet-400/25'
          }`} />
          <div className={`absolute w-64 h-64 sm:w-72 sm:h-72 rounded-full border animate-[ping_2.6s_cubic-bezier(0,0,0.2,1)_infinite_0.3s] ${
            isListening ? 'border-sky-300/15' : 'border-purple-300/15'
          }`} />
        </div>
      )}

      <div
        onClick={onClick}
        className="relative group cursor-pointer active:scale-[0.96] transition-transform duration-200 flex items-center justify-center"
        role="button" tabIndex={0} aria-label="Activate voice assistant"
      >
        {/* Ambient glow */}
        <div className={`absolute -inset-5 rounded-full blur-3xl transition-all duration-700 pointer-events-none ${
          isListening   ? 'bg-cyan-400/30 scale-[1.15]' :
          isSpeaking    ? 'bg-violet-500/30 scale-[1.15]' :
          isProcessing  ? 'bg-amber-400/25 scale-110' :
                          'bg-blue-400/15 group-hover:bg-blue-500/25 group-hover:scale-110'
        }`} />

        {/* 3D Canvas */}
        <div ref={mountRef} className="w-56 h-56 sm:w-64 sm:h-64 relative z-10 pointer-events-none" />
      </div>
    </div>
  );
};

export default VoiceOrb;
