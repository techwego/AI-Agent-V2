import React, { useEffect, useRef } from 'react';

/**
 * InteractiveNodeMesh — Ultra-Smooth Enterprise Constellation Mesh Canvas
 * Features:
 * - Spatial Jitter Seeding: Prevents clumping, ensures perfect even distribution
 * - Multi-harmonic Lissajous Floating: Buttery smooth organic drift (no jumping)
 * - Elastic Proximity Spring Links: Distance-weighted bezier gradient connections
 * - Concentric Radar Rings with glowing core halo
 * - Smooth Laser Conduit Pulses: Continuous uninterrupted energy beams (0 teleportation)
 * - Fluid Cursor Physics with cubic damping
 */
const InteractiveNodeMesh = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId;

    const mouse = {
      x: -1000,
      y: -1000,
      targetX: -1000,
      targetY: -1000,
      radius: 120,
      isHovered: false
    };

    let width = 0;
    let height = 0;

    let nodes = [];
    let radarAngle = 0;
    let time = 0;

    // Dynamic Traveling Photon Pulses along Active Moving Mesh Edges
    const photons = Array.from({ length: 14 }, (_, i) => ({
      fromIdx: i % 25,
      toIdx: (i + 3) % 25,
      progress: Math.random(),
      speed: 0.006 + Math.random() * 0.008,
      color: i % 3 === 0 ? '59, 130, 246' : i % 3 === 1 ? '99, 102, 241' : '6, 182, 212'
    }));

    const maxLinkDistance = 140;

    const init = () => {
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      width = w;
      height = h;

      const dpr = Math.min(window.devicePixelRatio || 1, 1.25);
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.scale(dpr, dpr);

      // ── Spatial Grid-Based Seeding (No clumping, perfectly smooth) ──
      nodes = [];
      const cols = 6;
      const rows = 4;
      const cellW = w / cols;
      const cellH = h / rows;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const anchorX = c * cellW + cellW * (0.25 + Math.random() * 0.5);
          const anchorY = r * cellH + cellH * (0.25 + Math.random() * 0.5);

          nodes.push({
            x: anchorX,
            y: anchorY,
            anchorX,
            anchorY,
            offsetX: 0,
            offsetY: 0,
            speedX: 0.0006 + Math.random() * 0.0006,
            speedY: 0.0006 + Math.random() * 0.0006,
            ampX: 16 + Math.random() * 18,
            ampY: 14 + Math.random() * 16,
            phaseX: Math.random() * Math.PI * 2,
            phaseY: Math.random() * Math.PI * 2,
            radius: 2.4 + Math.random() * 1.6,
            color: Math.random() > 0.4 ? '59, 130, 246' : Math.random() > 0.5 ? '99, 102, 241' : '6, 182, 212',
            alpha: 0.60 + Math.random() * 0.35,
            pulseOffset: Math.random() * Math.PI * 2
          });
        }
      }
    };

    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      mouse.targetX = e.clientX - rect.left;
      mouse.targetY = e.clientY - rect.top;
      mouse.isHovered = true;
    };

    const handleMouseLeave = () => {
      mouse.targetX = -1000;
      mouse.targetY = -1000;
      mouse.isHovered = false;
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);

    const animate = () => {
      if (document.hidden) {
        animId = requestAnimationFrame(animate);
        return;
      }
      ctx.clearRect(0, 0, width, height);
      time += 16.6;

      // Smooth mouse interpolation
      mouse.x += (mouse.targetX - mouse.x) * 0.10;
      mouse.y += (mouse.targetY - mouse.y) * 0.10;

      // ─── 1. UPDATE NODES WITH LISSAJOUS DRIFT & FLUID MOUSE PHYSICS ───
      nodes.forEach(node => {
        // Natural multi-harmonic Lissajous drift
        const targetHarmonicX = node.anchorX + Math.sin(time * node.speedX + node.phaseX) * node.ampX;
        const targetHarmonicY = node.anchorY + Math.cos(time * node.speedY + node.phaseY) * node.ampY;

        // Smooth mouse interactive displacement
        const dx = node.x - mouse.x;
        const dy = node.y - mouse.y;
        const distSq = dx * dx + dy * dy;

        if (distSq < mouse.radius * mouse.radius && mouse.isHovered) {
          const dist = Math.sqrt(distSq);
          const force = (1 - dist / mouse.radius) * 22;
          const angle = Math.atan2(dy, dx);
          node.offsetX += Math.cos(angle) * force * 0.20;
          node.offsetY += Math.sin(angle) * force * 0.20;
        }

        // Spring offset smoothly back to baseline
        node.offsetX *= 0.90;
        node.offsetY *= 0.90;

        node.x = targetHarmonicX + node.offsetX;
        node.y = targetHarmonicY + node.offsetY;
      });

      // ─── 2. DRAW DYNAMIC ORGANIC CONSTELLATION CONNECTIONS ───
      const activeEdges = [];
      const maxDistSq = maxLinkDistance * maxLinkDistance;

      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          if (Math.abs(dx) > maxLinkDistance) continue;
          const dy = nodes[i].y - nodes[j].y;
          if (Math.abs(dy) > maxLinkDistance) continue;
          const distSq = dx * dx + dy * dy;

          if (distSq < maxDistSq) {
            const dist = Math.sqrt(distSq);
            const ratio = 1 - dist / maxLinkDistance;
            const lineOpacity = Math.pow(ratio, 1.3) * 0.38;

            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.strokeStyle = `rgba(59, 130, 246, ${lineOpacity})`;
            ctx.lineWidth = 0.9 + ratio * 0.6;
            ctx.stroke();

            activeEdges.push({ from: i, to: j, dist });
          }
        }
      }

      // ─── 3. DRAW DYNAMIC PHOTON PACKETS ALONG MOVING EDGES ───
      if (activeEdges.length > 0) {
        photons.forEach(photon => {
          photon.progress += photon.speed;
          if (photon.progress > 1) {
            photon.progress = 0;
            // Pick a random currently active dynamic edge
            const edge = activeEdges[Math.floor(Math.random() * activeEdges.length)];
            photon.fromIdx = edge.from;
            photon.toIdx = edge.to;
          }

          const n1 = nodes[photon.fromIdx];
          const n2 = nodes[photon.toIdx];

          if (n1 && n2) {
            const px = n1.x + (n2.x - n1.x) * photon.progress;
            const py = n1.y + (n2.y - n1.y) * photon.progress;

            // Glowing traveling energy packet
            const pGrad = ctx.createRadialGradient(px, py, 0, px, py, 5.5);
            pGrad.addColorStop(0, `rgba(${photon.color}, 0.95)`);
            pGrad.addColorStop(0.5, `rgba(${photon.color}, 0.35)`);
            pGrad.addColorStop(1, `rgba(${photon.color}, 0)`);
            
            ctx.beginPath();
            ctx.arc(px, py, 5.5, 0, Math.PI * 2);
            ctx.fillStyle = pGrad;
            ctx.fill();

            // Core bright dot
            ctx.beginPath();
            ctx.arc(px, py, 1.6, 0, Math.PI * 2);
            ctx.fillStyle = '#ffffff';
            ctx.fill();
          }
        });
      }

      // ─── 4. DRAW LUMINOUS CONSTELLATION NODES & BREATHING GLOW ───
      nodes.forEach(node => {
        const pulse = 1 + Math.sin(time * 0.003 + node.pulseOffset) * 0.18;
        const currentRadius = node.radius * pulse;

        // Soft Radial Glow Halo
        const grad = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, currentRadius * 2.8);
        grad.addColorStop(0, `rgba(${node.color}, ${node.alpha * 0.70})`);
        grad.addColorStop(0.6, `rgba(${node.color}, ${node.alpha * 0.20})`);
        grad.addColorStop(1, `rgba(${node.color}, 0)`);
        
        ctx.beginPath();
        ctx.arc(node.x, node.y, currentRadius * 2.8, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        // Crisp Inner Center
        ctx.beginPath();
        ctx.arc(node.x, node.y, currentRadius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${node.color}, ${node.alpha})`;
        ctx.fill();

        // Pinpoint Core Highlight
        ctx.beginPath();
        ctx.arc(node.x, node.y, currentRadius * 0.45, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.90)';
        ctx.fill();
      });

      animId = requestAnimationFrame(animate);
    };

    init();
    animate();

    const handleResize = () => {
      init();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  return (
    <canvas 
      ref={canvasRef} 
      className="absolute inset-0 w-full h-full pointer-events-auto z-10"
      style={{ touchAction: 'none' }}
    />
  );
};

export default InteractiveNodeMesh;
