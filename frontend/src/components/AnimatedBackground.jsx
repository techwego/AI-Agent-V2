import React, { useEffect, useRef } from 'react';

const AnimatedBackground = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    let nodes = [];
    let animationFrameId;
    let width = window.innerWidth;
    let height = window.innerHeight;
    let mouse = { x: width / 2, y: height / 2, radius: 150 };

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    };

    const handleMouseMove = (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };

    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', handleMouseMove);
    resize();

    class Node {
      constructor() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.vx = (Math.random() - 0.5) * 0.4;
        this.vy = (Math.random() - 0.5) * 0.4;
        this.size = Math.random() * 2 + 1;
        this.color = Math.random() > 0.5 ? 'rgba(59, 130, 246, ' : 'rgba(147, 51, 234, ';
        this.baseAlpha = Math.random() * 0.25 + 0.15;
      }

      update() {
        this.x += this.vx;
        this.y += this.vy;

        if (this.x < 0 || this.x > width) this.vx *= -1;
        if (this.y < 0 || this.y > height) this.vy *= -1;

        // Subtle mouse repulsion
        const dx = mouse.x - this.x;
        const dy = mouse.y - this.y;
        const dist = Math.hypot(dx, dy);
        if (dist < mouse.radius) {
          const force = (mouse.radius - dist) / mouse.radius;
          this.x -= (dx / dist) * force * 1.2;
          this.y -= (dy / dist) * force * 1.2;
        }
      }

      draw() {
        ctx.fillStyle = this.color + this.baseAlpha + ')';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const init = () => {
      nodes = [];
      const nodeCount = Math.min(Math.floor((width * height) / 22000), 55);
      for (let i = 0; i < nodeCount; i++) {
        nodes.push(new Node());
      }
    };

    const animate = () => {
      ctx.clearRect(0, 0, width, height);

      // Draw subtle connecting lines
      for (let i = 0; i < nodes.length; i++) {
        nodes[i].update();
        nodes[i].draw();

        for (let j = i + 1; j < nodes.length; j++) {
          const dist = Math.hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y);
          if (dist < 110) {
            const alpha = (1 - dist / 110) * 0.08;
            ctx.strokeStyle = `rgba(99, 102, 241, ${alpha})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.stroke();
          }
        }
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    init();
    animate();

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-gradient-to-b from-slate-50 via-white to-blue-50/20">
      
      {/* Subtle Geometric Dot Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:3.5rem_3.5rem] [mask-image:radial-gradient(ellipse_75%_65%_at_50%_40%,#000_65%,transparent_100%)] opacity-60" />

      {/* Floating Luminous Gradient Blobs */}
      <div 
        className="absolute top-[-8%] left-[-6%] w-[38vw] h-[38vw] rounded-full filter blur-[110px] opacity-25"
        style={{ 
          background: 'radial-gradient(circle, #60a5fa 0%, #a855f7 50%, transparent 70%)',
          animation: 'orb-ambient-drift-1 18s ease-in-out infinite' 
        }}
      />
      <div 
        className="absolute bottom-[-10%] right-[-6%] w-[45vw] h-[45vw] rounded-full filter blur-[130px] opacity-20"
        style={{ 
          background: 'radial-gradient(circle, #818cf8 0%, #38bdf8 50%, transparent 70%)',
          animation: 'orb-ambient-drift-2 22s ease-in-out infinite' 
        }}
      />
      <div 
        className="absolute top-[35%] right-[15%] w-[25vw] h-[25vw] rounded-full filter blur-[100px] opacity-15"
        style={{ 
          background: 'radial-gradient(circle, #c084fc 0%, transparent 70%)',
          animation: 'orb-ambient-drift-1 15s ease-in-out infinite reverse' 
        }}
      />
      
      {/* Interactive Constellation Canvas */}
      <canvas 
        ref={canvasRef} 
        className="absolute inset-0" 
      />
    </div>
  );
};

export default AnimatedBackground;
