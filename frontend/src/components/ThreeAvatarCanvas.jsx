import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

/**
 * ThreeAvatarCanvas — Enterprise 3D WebGL Digital Human Avatar (Sam)
 * 
 * Features:
 * - Full WebGL PBR Rendering with ACES Filmic Tone Mapping and multi-point studio lighting
 * - Anatomically proportioned 3D Digital Human head, face, eyes, hair, and executive suit
 * - Real-time 3D cursor gaze tracking with smooth spring damping
 * - Realistic 3D eyelids with procedural blinking and micro-saccades
 * - Dynamic 3D mouth, jaw, and lip-sync kinematics driven by audio amplitude and speech visemes
 * - Natural 60 FPS breathing kinematics and executive head-tilt gestures
 * - Holographic gyroscopic orbital ring aura with state-reactive ambient lighting
 */
const ThreeAvatarCanvas = ({
  state = 'IDLE',
  viseme = { mouthOpen: 0, mouthWide: 0.5, isBlinking: false },
  isSpeaking = false,
  isListening = false,
  isProcessing = false
}) => {
  const containerRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const animFrameRef = useRef(null);
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });

  // References to animated 3D parts
  const avatarRigRef = useRef({
    headGroup: null,
    neckGroup: null,
    torsoGroup: null,
    leftEye: null,
    rightEye: null,
    leftEyelidUpper: null,
    rightEyelidUpper: null,
    leftEyelidLower: null,
    rightEyelidLower: null,
    jawGroup: null,
    lowerLip: null,
    upperLip: null,
    mouthInterior: null,
    eyebrowLeft: null,
    eyebrowRight: null,
    haloRing: null,
    particles: null,
    stateLight: null,
    keyLight: null,
    fillLight: null,
    rimLight: null
  });

  // Track mouse coordinates across window for smooth head & eye gaze tracking
  useEffect(() => {
    const handleMouseMove = (e) => {
      const { innerWidth, innerHeight } = window;
      mouseRef.current.targetX = (e.clientX / innerWidth) * 2 - 1;
      mouseRef.current.targetY = -(e.clientY / innerHeight) * 2 + 1;
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Initialize Three.js Scene
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 320;
    const height = container.clientHeight || 320;

    // 1. Scene Setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // 2. Camera Setup
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 0.35, 3.4);
    camera.lookAt(0, 0.15, 0);

    // 3. WebGL Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.replaceChildren(renderer.domElement);
    rendererRef.current = renderer;

    // 4. Lighting Rig
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambientLight);

    // Key Light (Warm executive studio light)
    const keyLight = new THREE.DirectionalLight(0xfff4e6, 2.8);
    keyLight.position.set(2.5, 3.5, 3.0);
    keyLight.castShadow = true;
    scene.add(keyLight);

    // Fill Light (Cool sapphire blue fill)
    const fillLight = new THREE.DirectionalLight(0x60a5fa, 1.8);
    fillLight.position.set(-2.5, 1.5, 2.5);
    scene.add(fillLight);

    // Rim / Hair Light (Vivid cyan-indigo highlight from behind)
    const rimLight = new THREE.SpotLight(0x818cf8, 4.5, 12, Math.PI / 4, 0.4);
    rimLight.position.set(0, 3.5, -2.5);
    rimLight.lookAt(0, 0.5, 0);
    scene.add(rimLight);

    // State Reactive Under-glow Light
    const stateLight = new THREE.PointLight(0x2563eb, 2.5, 8);
    stateLight.position.set(0, -1.2, 1.2);
    scene.add(stateLight);

    // 5. Materials Setup (PBR Shaders)
    const skinMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xf5d0b5,
      roughness: 0.45,
      metalness: 0.02,
      clearcoat: 0.25,
      clearcoatRoughness: 0.35,
      sheen: 0.35,
      sheenColor: new THREE.Color(0xffe4d6)
    });

    const skinShadowMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xdfab8a,
      roughness: 0.55,
      metalness: 0.02
    });

    const lipsMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xd9777f,
      roughness: 0.35,
      clearcoat: 0.4,
      clearcoatRoughness: 0.2
    });

    const suitMaterial = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.7,
      metalness: 0.1
    });

    const shirtMaterial = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.4,
      metalness: 0.05
    });

    const tieMaterial = new THREE.MeshStandardMaterial({
      color: 0x2563eb,
      roughness: 0.3,
      metalness: 0.15
    });

    const badgeMaterial = new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      metalness: 0.85,
      roughness: 0.2
    });

    const hairMaterial = new THREE.MeshStandardMaterial({
      color: 0x271e1b,
      roughness: 0.6,
      metalness: 0.1
    });

    const eyeWhiteMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.1,
      metalness: 0.0
    });

    const irisMaterial = new THREE.MeshStandardMaterial({
      color: 0x1e40af,
      roughness: 0.2,
      metalness: 0.1
    });

    const pupilMaterial = new THREE.MeshBasicMaterial({
      color: 0x050505
    });

    const mouthInsideMaterial = new THREE.MeshBasicMaterial({
      color: 0x3f1d24
    });

    const teethMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.2
    });

    // 6. Build Avatar Hierarchy
    const avatarRoot = new THREE.Group();
    avatarRoot.position.set(0, -0.65, 0);
    scene.add(avatarRoot);

    // --- Torso & Suit ---
    const torsoGroup = new THREE.Group();
    avatarRoot.add(torsoGroup);

    // Blazer Chest
    const chestGeo = new THREE.CylinderGeometry(0.75, 0.85, 1.1, 32);
    const chestMesh = new THREE.Mesh(chestGeo, suitMaterial);
    chestMesh.position.set(0, 0.2, 0);
    chestMesh.scale.set(1.0, 1.0, 0.55);
    torsoGroup.add(chestMesh);

    // Shoulders
    const leftShoulder = new THREE.Mesh(new THREE.SphereGeometry(0.35, 24, 24), suitMaterial);
    leftShoulder.position.set(-0.72, 0.55, 0);
    leftShoulder.scale.set(1.1, 0.9, 0.8);
    torsoGroup.add(leftShoulder);

    const rightShoulder = new THREE.Mesh(new THREE.SphereGeometry(0.35, 24, 24), suitMaterial);
    rightShoulder.position.set(0.72, 0.55, 0);
    rightShoulder.scale.set(1.1, 0.9, 0.8);
    torsoGroup.add(rightShoulder);

    // Shirt V-Neck & Collar
    const shirtVGeo = new THREE.BufferGeometry();
    const shirtVertices = new Float32Array([
      0, 0.25, 0.32,
      -0.22, 0.85, 0.25,
      0.22, 0.85, 0.25
    ]);
    shirtVGeo.setAttribute('position', new THREE.BufferAttribute(shirtVertices, 3));
    shirtVGeo.computeVertexNormals();
    const shirtVMesh = new THREE.Mesh(shirtVGeo, shirtMaterial);
    torsoGroup.add(shirtVMesh);

    // Executive Tie
    const tieGeo = new THREE.BoxGeometry(0.09, 0.65, 0.03);
    const tieMesh = new THREE.Mesh(tieGeo, tieMaterial);
    tieMesh.position.set(0, 0.45, 0.32);
    torsoGroup.add(tieMesh);

    // Suit Lapels
    const lapelGeo = new THREE.BoxGeometry(0.12, 0.7, 0.04);
    const leftLapel = new THREE.Mesh(lapelGeo, suitMaterial);
    leftLapel.position.set(-0.25, 0.45, 0.3);
    leftLapel.rotation.z = -0.22;
    torsoGroup.add(leftLapel);

    const rightLapel = new THREE.Mesh(lapelGeo, suitMaterial);
    rightLapel.position.set(0.25, 0.45, 0.3);
    rightLapel.rotation.z = 0.22;
    torsoGroup.add(rightLapel);

    // University Lapel Badge
    const badgeGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.015, 24);
    const badgeMesh = new THREE.Mesh(badgeGeo, badgeMaterial);
    badgeMesh.position.set(-0.35, 0.55, 0.33);
    badgeMesh.rotation.x = Math.PI / 2;
    torsoGroup.add(badgeMesh);

    // --- Neck & Head Group ---
    const neckGroup = new THREE.Group();
    neckGroup.position.set(0, 0.8, 0);
    avatarRoot.add(neckGroup);

    const neckGeo = new THREE.CylinderGeometry(0.2, 0.24, 0.45, 32);
    const neckMesh = new THREE.Mesh(neckGeo, skinShadowMaterial);
    neckMesh.position.set(0, 0.08, -0.02);
    neckGroup.add(neckMesh);

    const headGroup = new THREE.Group();
    headGroup.position.set(0, 0.38, 0);
    neckGroup.add(headGroup);

    // Cranium / Face Base
    const headGeo = new THREE.SphereGeometry(0.48, 32, 32);
    headGeo.scale(0.85, 1.12, 0.95);
    const headMesh = new THREE.Mesh(headGeo, skinMaterial);
    headMesh.position.set(0, 0.05, 0);
    headGroup.add(headMesh);

    // Cheeks & Jaw Structure
    const jawBaseGeo = new THREE.SphereGeometry(0.38, 24, 24);
    jawBaseGeo.scale(0.82, 0.9, 0.9);
    const jawBaseMesh = new THREE.Mesh(jawBaseGeo, skinMaterial);
    jawBaseMesh.position.set(0, -0.2, 0.05);
    headGroup.add(jawBaseMesh);

    // Sculpted Nose
    const noseBridgeGeo = new THREE.ConeGeometry(0.065, 0.24, 16);
    const noseMesh = new THREE.Mesh(noseBridgeGeo, skinMaterial);
    noseMesh.position.set(0, 0.04, 0.46);
    noseMesh.rotation.x = -0.18;
    headGroup.add(noseMesh);

    const noseTipGeo = new THREE.SphereGeometry(0.045, 16, 16);
    const noseTipMesh = new THREE.Mesh(noseTipGeo, skinMaterial);
    noseTipMesh.position.set(0, -0.04, 0.48);
    headGroup.add(noseTipMesh);

    // --- Ears ---
    const earGeo = new THREE.SphereGeometry(0.12, 16, 16);
    earGeo.scale(0.4, 0.9, 0.5);
    const leftEar = new THREE.Mesh(earGeo, skinMaterial);
    leftEar.position.set(-0.43, 0.05, -0.05);
    leftEar.rotation.y = 0.2;
    headGroup.add(leftEar);

    const rightEar = new THREE.Mesh(earGeo, skinMaterial);
    rightEar.position.set(0.43, 0.05, -0.05);
    rightEar.rotation.y = -0.2;
    headGroup.add(rightEar);

    // --- 3D Eyes with Gaze & Eyelids ---
    const createEyeRig = (isLeft) => {
      const eyeGroup = new THREE.Group();
      const xPos = isLeft ? -0.165 : 0.165;
      eyeGroup.position.set(xPos, 0.12, 0.38);

      // Eyeball
      const eyeBallGeo = new THREE.SphereGeometry(0.08, 24, 24);
      const eyeBall = new THREE.Mesh(eyeBallGeo, eyeWhiteMaterial);
      eyeGroup.add(eyeBall);

      // Iris & Pupil (Pupil look forward along +Z)
      const irisGeo = new THREE.CylinderGeometry(0.042, 0.042, 0.02, 24);
      const iris = new THREE.Mesh(irisGeo, irisMaterial);
      iris.position.set(0, 0, 0.075);
      iris.rotation.x = Math.PI / 2;
      eyeGroup.add(iris);

      const pupilGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.022, 24);
      const pupil = new THREE.Mesh(pupilGeo, pupilMaterial);
      pupil.position.set(0, 0, 0.077);
      pupil.rotation.x = Math.PI / 2;
      eyeGroup.add(pupil);

      // Specular highlight gleam
      const gleamGeo = new THREE.SphereGeometry(0.008, 12, 12);
      const gleamMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const gleam = new THREE.Mesh(gleamGeo, gleamMat);
      gleam.position.set(0.015, 0.015, 0.086);
      eyeGroup.add(gleam);

      // Eyelids
      const eyelidUpperGeo = new THREE.SphereGeometry(0.086, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2);
      const eyelidUpper = new THREE.Mesh(eyelidUpperGeo, skinMaterial);
      eyelidUpper.rotation.x = -Math.PI / 2.4;
      eyeGroup.add(eyelidUpper);

      const eyelidLowerGeo = new THREE.SphereGeometry(0.084, 24, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
      const eyelidLower = new THREE.Mesh(eyelidLowerGeo, skinMaterial);
      eyelidLower.rotation.x = Math.PI / 2.6;
      eyeGroup.add(eyelidLower);

      headGroup.add(eyeGroup);
      return { eyeGroup, eyelidUpper, eyelidLower };
    };

    const leftEyeRig = createEyeRig(true);
    const rightEyeRig = createEyeRig(false);

    // --- Eyebrows ---
    const createEyebrow = (isLeft) => {
      const browGeo = new THREE.BoxGeometry(0.14, 0.028, 0.035);
      const browMesh = new THREE.Mesh(browGeo, hairMaterial);
      const xPos = isLeft ? -0.17 : 0.17;
      browMesh.position.set(xPos, 0.235, 0.42);
      browMesh.rotation.z = isLeft ? 0.08 : -0.08;
      headGroup.add(browMesh);
      return browMesh;
    };

    const eyebrowLeft = createEyebrow(true);
    const eyebrowRight = createEyebrow(false);

    // --- 3D Articulated Mouth, Lips & Jaw Rig ---
    const jawGroup = new THREE.Group();
    jawGroup.position.set(0, -0.18, 0.32);
    headGroup.add(jawGroup);

    // Oral Cavity interior
    const mouthInteriorGeo = new THREE.BoxGeometry(0.18, 0.09, 0.12);
    const mouthInterior = new THREE.Mesh(mouthInteriorGeo, mouthInsideMaterial);
    mouthInterior.position.set(0, 0, -0.04);
    mouthInterior.scale.set(0.01, 0.01, 0.01);
    jawGroup.add(mouthInterior);

    // Upper Lip
    const upperLipGeo = new THREE.CylinderGeometry(0.018, 0.028, 0.16, 16);
    upperLipGeo.rotateZ(Math.PI / 2);
    const upperLip = new THREE.Mesh(upperLipGeo, lipsMaterial);
    upperLip.position.set(0, 0.035, 0.12);
    headGroup.add(upperLip);

    // Upper Teeth
    const teethUpperGeo = new THREE.BoxGeometry(0.12, 0.02, 0.02);
    const upperTeeth = new THREE.Mesh(teethUpperGeo, teethMaterial);
    upperTeeth.position.set(0, 0.02, 0.1);
    headGroup.add(upperTeeth);

    // Lower Lip
    const lowerLipGeo = new THREE.CylinderGeometry(0.022, 0.022, 0.15, 16);
    lowerLipGeo.rotateZ(Math.PI / 2);
    const lowerLip = new THREE.Mesh(lowerLipGeo, lipsMaterial);
    lowerLip.position.set(0, -0.025, 0.12);
    jawGroup.add(lowerLip);

    // Lower Teeth
    const teethLowerGeo = new THREE.BoxGeometry(0.11, 0.02, 0.02);
    const lowerTeeth = new THREE.Mesh(teethLowerGeo, teethMaterial);
    lowerTeeth.position.set(0, -0.01, 0.1);
    jawGroup.add(lowerTeeth);

    // Chin Point
    const chinGeo = new THREE.SphereGeometry(0.08, 16, 16);
    chinGeo.scale(1.0, 0.8, 0.9);
    const chinMesh = new THREE.Mesh(chinGeo, skinMaterial);
    chinMesh.position.set(0, -0.09, 0.1);
    jawGroup.add(chinMesh);

    // --- Executive Styled Hair Volume ---
    const hairCapGeo = new THREE.SphereGeometry(0.51, 32, 32, 0, Math.PI * 2, 0, Math.PI / 1.8);
    hairCapGeo.scale(0.88, 1.1, 0.96);
    const hairCap = new THREE.Mesh(hairCapGeo, hairMaterial);
    hairCap.position.set(0, 0.1, -0.03);
    headGroup.add(hairCap);

    // Hair Quiff / Parting volume
    const quiffGeo = new THREE.CylinderGeometry(0.18, 0.32, 0.45, 16);
    quiffGeo.rotateZ(Math.PI / 3);
    const quiffMesh = new THREE.Mesh(quiffGeo, hairMaterial);
    quiffMesh.position.set(-0.06, 0.48, 0.18);
    quiffMesh.scale.set(1.1, 0.5, 0.9);
    headGroup.add(quiffMesh);

    // Sideburns
    const sideburnGeo = new THREE.BoxGeometry(0.05, 0.18, 0.08);
    const leftSideburn = new THREE.Mesh(sideburnGeo, hairMaterial);
    leftSideburn.position.set(-0.41, 0.08, 0.08);
    headGroup.add(leftSideburn);

    const rightSideburn = new THREE.Mesh(sideburnGeo, hairMaterial);
    rightSideburn.position.set(0.41, 0.08, 0.08);
    headGroup.add(rightSideburn);

    // --- 7. Holographic Gyroscopic Aura & Particles ---
    const haloGeo = new THREE.TorusGeometry(1.2, 0.012, 16, 64);
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0x60a5fa,
      transparent: true,
      opacity: 0.45,
      wireframe: true
    });
    const haloRing = new THREE.Mesh(haloGeo, haloMat);
    haloRing.rotation.x = Math.PI / 2.2;
    haloRing.position.set(0, 0.35, 0);
    scene.add(haloRing);

    // Floating Data Particles
    const particleCount = 48;
    const particleGeo = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i += 3) {
      const angle = (i / particleCount) * Math.PI * 2;
      const radius = 1.1 + Math.random() * 0.4;
      particlePositions[i] = Math.cos(angle) * radius;
      particlePositions[i + 1] = (Math.random() - 0.5) * 1.6 + 0.3;
      particlePositions[i + 2] = Math.sin(angle) * radius * 0.6;
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0x93c5fd,
      size: 0.035,
      transparent: true,
      opacity: 0.75
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // Store references to the rig
    avatarRigRef.current = {
      headGroup,
      neckGroup,
      torsoGroup,
      leftEye: leftEyeRig.eyeGroup,
      rightEye: rightEyeRig.eyeGroup,
      leftEyelidUpper: leftEyeRig.eyelidUpper,
      rightEyelidUpper: rightEyeRig.eyelidUpper,
      leftEyelidLower: leftEyeRig.eyelidLower,
      rightEyelidLower: rightEyeRig.eyelidLower,
      jawGroup,
      lowerLip,
      upperLip,
      mouthInterior,
      eyebrowLeft,
      eyebrowRight,
      haloRing,
      particles,
      stateLight,
      keyLight,
      fillLight,
      rimLight
    };

    // Resize Handler
    const handleResize = () => {
      if (!container || !renderer) return;
      const newW = container.clientWidth || 320;
      const newH = container.clientHeight || 320;
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      renderer.dispose();
      scene.clear();
    };
  }, []);

  // Update Dynamic Lighting & State Aura
  useEffect(() => {
    const { stateLight, haloRing, rimLight } = avatarRigRef.current;
    if (!stateLight) return;

    if (isListening) {
      stateLight.color.setHex(0x06b6d4); // Cyan
      stateLight.intensity = 3.2;
      if (haloRing) haloRing.material.color.setHex(0x22d3ee);
      if (rimLight) rimLight.color.setHex(0x38bdf8);
    } else if (isProcessing) {
      stateLight.color.setHex(0xf59e0b); // Amber Gold
      stateLight.intensity = 3.6;
      if (haloRing) haloRing.material.color.setHex(0xfbbf24);
      if (rimLight) rimLight.color.setHex(0xfcd34d);
    } else if (isSpeaking) {
      stateLight.color.setHex(0x8b5cf6); // Electric Violet-Blue
      stateLight.intensity = 3.8;
      if (haloRing) haloRing.material.color.setHex(0xa78bfa);
      if (rimLight) rimLight.color.setHex(0xc084fc);
    } else {
      stateLight.color.setHex(0x2563eb); // Sapphire Blue
      stateLight.intensity = 2.2;
      if (haloRing) haloRing.material.color.setHex(0x60a5fa);
      if (rimLight) rimLight.color.setHex(0x818cf8);
    }
  }, [state, isListening, isProcessing, isSpeaking]);

  // 60 FPS Animation & Kinematics Loop
  useEffect(() => {
    let clock = new THREE.Clock();
    let blinkTimer = 0;
    let nextBlinkTime = 3.5;
    let isBlinkingNow = false;
    let blinkProgress = 0;

    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const time = clock.getElapsedTime();

      const rig = avatarRigRef.current;
      if (!rig.headGroup || !rendererRef.current || !sceneRef.current) return;

      // 1. Mouse Smooth Interpolation (Gaze tracking)
      const mouse = mouseRef.current;
      mouse.x += (mouse.targetX - mouse.x) * 0.06;
      mouse.y += (mouse.targetY - mouse.y) * 0.06;

      // 2. Head & Neck Kinematics (Attentive tracking with human limits)
      const targetHeadYaw = THREE.MathUtils.clamp(mouse.x * 0.28, -0.35, 0.35);
      const targetHeadPitch = THREE.MathUtils.clamp(-mouse.y * 0.18, -0.22, 0.22);
      const targetHeadRoll = targetHeadYaw * -0.15;

      // Breathing motion
      const breathingSway = Math.sin(time * 1.8) * 0.015;
      const chestRise = Math.sin(time * 1.8) * 0.02;

      if (rig.torsoGroup) {
        rig.torsoGroup.position.y = chestRise;
        rig.torsoGroup.rotation.x = THREE.MathUtils.lerp(rig.torsoGroup.rotation.x, targetHeadPitch * 0.2, 0.05);
      }

      // Listening attentiveness tilt
      const listeningNod = isListening ? 0.06 : 0.0;
      const speakingMicroTilt = isSpeaking ? Math.sin(time * 6.0) * 0.02 : 0.0;

      rig.headGroup.rotation.y = THREE.MathUtils.lerp(rig.headGroup.rotation.y, targetHeadYaw, 0.08);
      rig.headGroup.rotation.x = THREE.MathUtils.lerp(rig.headGroup.rotation.x, targetHeadPitch + listeningNod + speakingMicroTilt, 0.08);
      rig.headGroup.rotation.z = THREE.MathUtils.lerp(rig.headGroup.rotation.z, targetHeadRoll, 0.08);
      rig.headGroup.position.y = 0.38 + breathingSway;

      // 3. Eye Gaze Tracking & Micro-saccades
      const saccadeX = (Math.sin(time * 8.5) > 0.95 ? (Math.sin(time * 25) * 0.03) : 0);
      const saccadeY = (Math.cos(time * 7.2) > 0.95 ? (Math.cos(time * 22) * 0.02) : 0);

      const eyeTargetYaw = THREE.MathUtils.clamp(mouse.x * 0.45 + saccadeX, -0.5, 0.5);
      const eyeTargetPitch = THREE.MathUtils.clamp(-mouse.y * 0.35 + saccadeY, -0.38, 0.38);

      if (rig.leftEye && rig.rightEye) {
        rig.leftEye.rotation.y = THREE.MathUtils.lerp(rig.leftEye.rotation.y, eyeTargetYaw, 0.15);
        rig.leftEye.rotation.x = THREE.MathUtils.lerp(rig.leftEye.rotation.x, eyeTargetPitch, 0.15);
        rig.rightEye.rotation.y = THREE.MathUtils.lerp(rig.rightEye.rotation.y, eyeTargetYaw, 0.15);
        rig.rightEye.rotation.x = THREE.MathUtils.lerp(rig.rightEye.rotation.x, eyeTargetPitch, 0.15);
      }

      // 4. Procedural Blinking
      blinkTimer += delta;
      if (blinkTimer >= nextBlinkTime && !isBlinkingNow) {
        isBlinkingNow = true;
        blinkProgress = 0;
        blinkTimer = 0;
        nextBlinkTime = 2.8 + Math.random() * 4.0; // Next blink in 2.8s - 6.8s
      }

      if (isBlinkingNow) {
        blinkProgress += delta * 9.0; // Fast 110ms blink cycle
        let blinkWeight = 0;
        if (blinkProgress < 0.5) {
          blinkWeight = blinkProgress * 2.0; // Closing
        } else if (blinkProgress < 1.0) {
          blinkWeight = (1.0 - blinkProgress) * 2.0; // Opening
        } else {
          isBlinkingNow = false;
          blinkWeight = 0;
        }

        // Apply to 3D Eyelids
        const upperEyelidAngle = -Math.PI / 2.4 + (blinkWeight * 0.68);
        const lowerEyelidAngle = Math.PI / 2.6 - (blinkWeight * 0.45);
        if (rig.leftEyelidUpper && rig.rightEyelidUpper) {
          rig.leftEyelidUpper.rotation.x = upperEyelidAngle;
          rig.rightEyelidUpper.rotation.x = upperEyelidAngle;
          rig.leftEyelidLower.rotation.x = lowerEyelidAngle;
          rig.rightEyelidLower.rotation.x = lowerEyelidAngle;
        }
      }

      // 5. Eyebrows (Dynamic Curiosity & Speaking Animation)
      const browCuriosity = isListening ? 0.025 : 0.0;
      const browEmphasis = isSpeaking ? (Math.sin(time * 4.5) * 0.015 + 0.01) : 0.0;
      if (rig.eyebrowLeft && rig.eyebrowRight) {
        rig.eyebrowLeft.position.y = 0.235 + browCuriosity + browEmphasis;
        rig.eyebrowRight.position.y = 0.235 + browCuriosity + browEmphasis;
      }

      // 6. Real-Time 3D Lip-Sync & Jaw Dynamics
      const targetMouthOpen = isSpeaking ? Math.max(0.02, viseme.mouthOpen * 0.85) : 0.0;
      const targetMouthWide = isSpeaking ? (viseme.mouthWide || 0.5) : 0.5;

      if (rig.jawGroup && rig.lowerLip && rig.upperLip) {
        // Jaw downward pivot
        rig.jawGroup.position.y = THREE.MathUtils.lerp(rig.jawGroup.position.y, -0.18 - (targetMouthOpen * 0.09), 0.25);
        rig.jawGroup.rotation.x = THREE.MathUtils.lerp(rig.jawGroup.rotation.x, targetMouthOpen * 0.22, 0.25);

        // Lower lip stretch
        rig.lowerLip.scale.x = THREE.MathUtils.lerp(rig.lowerLip.scale.x, 0.8 + (targetMouthWide * 0.4), 0.2);
        rig.upperLip.scale.x = THREE.MathUtils.lerp(rig.upperLip.scale.x, 0.8 + (targetMouthWide * 0.4), 0.2);
        rig.upperLip.position.y = THREE.MathUtils.lerp(rig.upperLip.position.y, 0.035 + (targetMouthOpen * 0.025), 0.2);

        // Mouth interior expansion
        if (rig.mouthInterior) {
          const mScale = Math.max(0.01, targetMouthOpen * 1.1);
          rig.mouthInterior.scale.set(1.0, mScale, 1.0);
        }
      }

      // 7. Holographic Gyroscopic Aura Rotation
      if (rig.haloRing) {
        rig.haloRing.rotation.z = time * 0.35;
        rig.haloRing.rotation.y = Math.sin(time * 0.5) * 0.2;
      }
      if (rig.particles) {
        rig.particles.rotation.y = time * 0.15;
      }

      // Render Frame
      const renderer = rendererRef.current;
      const scene = sceneRef.current;
      if (renderer && scene) {
        const camera = scene.children.find(c => c.isCamera) || new THREE.PerspectiveCamera(40, 1, 0.1, 100);
        renderer.render(scene, camera);
      }
    };

    animate();

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isSpeaking, isListening, isProcessing, viseme]);

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full relative cursor-pointer select-none overflow-hidden rounded-full flex items-center justify-center"
      style={{ touchAction: 'none' }}
    />
  );
};

export default ThreeAvatarCanvas;
