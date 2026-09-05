import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

const AnimatedBackground = () => {
  const mountRef = useRef(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // ─── Preferences ───────────────────────────────────────────
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const motionScale = prefersReducedMotion ? 0.05 : 1.0;

    // ─── 1. Scene & Camera ─────────────────────────────────────
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      55,
      window.innerWidth / window.innerHeight,
      0.1,
      1200
    );
    camera.position.set(0, 0, 280);

    // ─── 2. Renderer ───────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'low-power',
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    container.appendChild(renderer.domElement);

    // ─── 3. Lighting ───────────────────────────────────────────
    const ambientLight = new THREE.AmbientLight(0xf0f4ff, 0.65);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0xe0ecff, 0xf8fafc, 0.35);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.45);
    dirLight.position.set(80, 120, 60);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 512;
    dirLight.shadow.mapSize.height = 512;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 500;
    dirLight.shadow.camera.left = -200;
    dirLight.shadow.camera.right = 200;
    dirLight.shadow.camera.top = 200;
    dirLight.shadow.camera.bottom = -200;
    dirLight.shadow.radius = 8;
    scene.add(dirLight);

    // Subtle rim light from the left for depth
    const rimLight = new THREE.DirectionalLight(0xc7d2fe, 0.2);
    rimLight.position.set(-60, 40, 80);
    scene.add(rimLight);

    // ─── 4. Main Scene Group (for parallax rotation) ──────────
    const sceneGroup = new THREE.Group();
    scene.add(sceneGroup);

    // ─── 5. Solid Low-Poly Books ──────────────────────────────
    const bookColors = [
      { cover: 0x1e3a5f, spine: 0x60a5fa }, // Navy + light blue
      { cover: 0x3730a3, spine: 0xa5b4fc }, // Indigo + lavender
      { cover: 0x78350f, spine: 0xfbbf24 }, // Brown + amber
      { cover: 0x7f1d1d, spine: 0xfca5a5 }, // Burgundy + rose
      { cover: 0x14532d, spine: 0x6ee7b7 }, // Forest + mint
      { cover: 0x334155, spine: 0x94a3b8 }, // Slate + light slate
      { cover: 0x1e40af, spine: 0x93c5fd }, // Royal blue + sky
    ];

    const bookCount = 12;
    const booksGroup = new THREE.Group();
    const bookMaterials = []; // track for cleanup

    for (let i = 0; i < bookCount; i++) {
      const palette = bookColors[i % bookColors.length];

      const w = 8 + Math.random() * 6;    // width (slightly smaller)
      const h = 12 + Math.random() * 8;   // height
      const d = 2 + Math.random() * 2.5;  // depth (thickness)

      const bookGeo = new THREE.BoxGeometry(w, h, d);

      // Multi-material: 6 faces of a box → [+x, -x, +y, -y, +z, -z]
      // Spine = +x face (index 0), Cover = all others
      const coverMat = new THREE.MeshStandardMaterial({
        color: palette.cover,
        roughness: 0.85,
        metalness: 0.02,
        transparent: true,
        opacity: 0.35,
      });
      const spineMat = new THREE.MeshStandardMaterial({
        color: palette.spine,
        roughness: 0.6,
        metalness: 0.05,
        transparent: true,
        opacity: 0.45,
      });
      const materials = [spineMat, coverMat, coverMat, coverMat, coverMat, coverMat];
      bookMaterials.push(coverMat, spineMat);

      const book = new THREE.Mesh(bookGeo, materials);
      book.castShadow = true;
      book.receiveShadow = true;

      // Distribute in a wide field — pushed further back
      book.position.set(
        (Math.random() - 0.5) * 550,
        (Math.random() - 0.5) * 380,
        -80 + (Math.random() - 0.5) * 160
      );
      book.rotation.set(
        (Math.random() - 0.5) * 0.3,
        Math.random() * Math.PI * 2,
        (Math.random() - 0.5) * 0.2
      );

      book.userData = {
        floatSpeed: (0.1 + Math.random() * 0.18) * motionScale,
        floatAmplitude: 2.5 + Math.random() * 3,
        floatOffset: Math.random() * Math.PI * 2,
        rotSpeedY: (0.002 + Math.random() * 0.003) * motionScale,
        rotSpeedX: (0.0005 + Math.random() * 0.001) * motionScale,
        baseY: book.position.y,
      };

      booksGroup.add(book);
    }
    sceneGroup.add(booksGroup);

    // ─── 6. Translucent Paper Sheets ──────────────────────────
    const paperCount = 6;
    const papersGroup = new THREE.Group();
    const paperMaterials = [];

    for (let i = 0; i < paperCount; i++) {
      const pw = 6 + Math.random() * 5;
      const ph = 8 + Math.random() * 6;
      const paperGeo = new THREE.PlaneGeometry(pw, ph);
      const paperMat = new THREE.MeshStandardMaterial({
        color: 0xfefefe,
        roughness: 0.9,
        metalness: 0.0,
        transparent: true,
        opacity: 0.25 + Math.random() * 0.15,
        side: THREE.DoubleSide,
      });
      paperMaterials.push(paperMat);

      const paper = new THREE.Mesh(paperGeo, paperMat);
      paper.castShadow = true;

      paper.position.set(
        (Math.random() - 0.5) * 420,
        (Math.random() - 0.5) * 300,
        (Math.random() - 0.5) * 160
      );
      paper.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI * 0.5
      );

      paper.userData = {
        tumbleX: (0.002 + Math.random() * 0.004) * motionScale,
        tumbleY: (0.003 + Math.random() * 0.005) * motionScale,
        tumbleZ: (0.001 + Math.random() * 0.003) * motionScale,
        floatSpeed: (0.1 + Math.random() * 0.15) * motionScale,
        floatAmplitude: 2 + Math.random() * 3,
        floatOffset: Math.random() * Math.PI * 2,
        baseY: paper.position.y,
      };

      papersGroup.add(paper);
    }
    sceneGroup.add(papersGroup);

    // ─── 7. Geometric Wireframe Accents ───────────────────────
    const accentCount = 4;
    const accentsGroup = new THREE.Group();
    const accentMaterials = [];

    for (let i = 0; i < accentCount; i++) {
      const geo = i % 2 === 0
        ? new THREE.IcosahedronGeometry(6 + Math.random() * 5, 1)
        : new THREE.OctahedronGeometry(5 + Math.random() * 4, 0);

      const mat = new THREE.MeshBasicMaterial({
        color: new THREE.Color().setHSL(0.6 + Math.random() * 0.08, 0.35, 0.65),
        wireframe: true,
        transparent: true,
        opacity: 0.12 + Math.random() * 0.06,
      });
      accentMaterials.push(mat);

      const accent = new THREE.Mesh(geo, mat);
      accent.position.set(
        (Math.random() - 0.5) * 450,
        (Math.random() - 0.5) * 320,
        -60 + (Math.random() - 0.5) * 100
      );

      accent.userData = {
        rotX: (0.002 + Math.random() * 0.003) * motionScale,
        rotY: (0.003 + Math.random() * 0.004) * motionScale,
      };

      accentsGroup.add(accent);
    }
    sceneGroup.add(accentsGroup);

    // ─── 8. Ambient Dust Motes ────────────────────────────────
    const dustCount = 200;
    const dustPositions = new Float32Array(dustCount * 3);
    const dustSpeeds = [];

    for (let i = 0; i < dustCount; i++) {
      dustPositions[i * 3] = (Math.random() - 0.5) * 600;
      dustPositions[i * 3 + 1] = (Math.random() - 0.5) * 450;
      dustPositions[i * 3 + 2] = (Math.random() - 0.5) * 300;
      dustSpeeds.push(0.02 + Math.random() * 0.04);
    }

    const dustGeo = new THREE.BufferGeometry();
    dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));

    const dustMat = new THREE.PointsMaterial({
      color: 0xc7d2fe,
      size: 1.5,
      transparent: true,
      opacity: 0.3,
      sizeAttenuation: true,
    });

    const dustMotes = new THREE.Points(dustGeo, dustMat);
    sceneGroup.add(dustMotes);

    // ─── 9. Ground Shadow Plane ───────────────────────────────
    const groundGeo = new THREE.PlaneGeometry(600, 600);
    const groundMat = new THREE.ShadowMaterial({ opacity: 0.06 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -200;
    ground.receiveShadow = true;
    sceneGroup.add(ground);

    // ─── 10. Mouse Parallax ───────────────────────────────────
    let mouseX = 0;
    let mouseY = 0;
    let targetRotX = 0;
    let targetRotY = 0;

    const handleMouseMove = (e) => {
      if (prefersReducedMotion) return;
      mouseX = ((e.clientX / window.innerWidth) - 0.5) * 2;  // -1 to 1
      mouseY = ((e.clientY / window.innerHeight) - 0.5) * 2; // -1 to 1
    };
    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    // ─── 11. Animation Loop ───────────────────────────────────
    let animationFrameId;
    let isPaused = false;
    const clock = new THREE.Clock();

    const animate = () => {
      if (isPaused) return;
      animationFrameId = requestAnimationFrame(animate);

      const elapsed = clock.getElapsedTime();

      // Smooth parallax rotation on the entire scene group
      targetRotY += (mouseX * 0.015 - targetRotY) * 0.04;
      targetRotX += (mouseY * -0.01 - targetRotX) * 0.04;
      sceneGroup.rotation.y = targetRotY;
      sceneGroup.rotation.x = targetRotX;

      // Animate books
      booksGroup.children.forEach((book) => {
        const ud = book.userData;
        book.position.y = ud.baseY + Math.sin(elapsed * ud.floatSpeed + ud.floatOffset) * ud.floatAmplitude;
        book.rotation.y += ud.rotSpeedY;
        book.rotation.x += ud.rotSpeedX;
      });

      // Animate paper sheets
      papersGroup.children.forEach((paper) => {
        const ud = paper.userData;
        paper.position.y = ud.baseY + Math.sin(elapsed * ud.floatSpeed + ud.floatOffset) * ud.floatAmplitude;
        paper.rotation.x += ud.tumbleX;
        paper.rotation.y += ud.tumbleY;
        paper.rotation.z += ud.tumbleZ;
      });

      // Animate geometric accents
      accentsGroup.children.forEach((accent) => {
        accent.rotation.x += accent.userData.rotX;
        accent.rotation.y += accent.userData.rotY;
      });

      // Animate dust motes (slow upward drift)
      const posAttr = dustGeo.attributes.position;
      const posArray = posAttr.array;
      for (let i = 0; i < dustCount; i++) {
        posArray[i * 3 + 1] += dustSpeeds[i] * motionScale;
        // Wrap around when above bounds
        if (posArray[i * 3 + 1] > 230) {
          posArray[i * 3 + 1] = -230;
        }
      }
      posAttr.needsUpdate = true;

      renderer.render(scene, camera);
    };

    animate();

    // ─── 12. Visibility Change (pause when tab hidden) ────────
    const handleVisibilityChange = () => {
      if (document.hidden) {
        isPaused = true;
        cancelAnimationFrame(animationFrameId);
      } else {
        if (isPaused) {
          isPaused = false;
          clock.start();
          animate();
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // ─── 13. Resize Handler ───────────────────────────────────
    const handleResize = () => {
      if (!container) return;
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    // ─── 14. Cleanup ──────────────────────────────────────────
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      cancelAnimationFrame(animationFrameId);
      isPaused = true;

      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }

      // Dispose books
      booksGroup.children.forEach((mesh) => {
        mesh.geometry.dispose();
      });
      bookMaterials.forEach((m) => m.dispose());

      // Dispose papers
      papersGroup.children.forEach((mesh) => {
        mesh.geometry.dispose();
      });
      paperMaterials.forEach((m) => m.dispose());

      // Dispose accents
      accentsGroup.children.forEach((mesh) => {
        mesh.geometry.dispose();
      });
      accentMaterials.forEach((m) => m.dispose());

      // Dispose dust
      dustGeo.dispose();
      dustMat.dispose();

      // Dispose ground
      groundGeo.dispose();
      groundMat.dispose();

      renderer.dispose();
    };
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 bg-gradient-to-br from-slate-50 via-white to-blue-50/50">
      {/* 3D Premium Library Scene Canvas */}
      <div ref={mountRef} className="absolute inset-0 opacity-75" />

      {/* Ambient Perspective Library Aisle Grid */}
      <div className="absolute inset-0 aisle-grid-bg opacity-40" />

      {/* Soft Luminous Atmospheric Glow Spots */}
      <div className="absolute top-[-10%] left-[15%] w-[650px] h-[650px] rounded-full bg-blue-300/15 blur-[130px] transform-gpu pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[10%] w-[550px] h-[550px] rounded-full bg-indigo-200/20 blur-[130px] transform-gpu pointer-events-none" />
      <div className="absolute top-[40%] right-[25%] w-[400px] h-[400px] rounded-full bg-sky-200/15 blur-[110px] transform-gpu pointer-events-none" />
    </div>
  );
};

export default AnimatedBackground;
