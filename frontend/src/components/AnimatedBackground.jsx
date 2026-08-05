import React, { useEffect, useRef } from 'react';

const AnimatedBackground = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    let particles = [];
    let animationFrameId;
    let width = window.innerWidth;
    let height = window.innerHeight;

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    };

    window.addEventListener('resize', resize);
    resize();

    class Particle {
      constructor() {
        this.reset();
        this.z = Math.random() * 1000;
      }
      
      reset() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.z = 1000;
        this.size = Math.random() * 3 + 1;
        this.opacity = Math.random() * 0.8 + 0.2;
      }

      update() {
        this.z -= 2;
        if (this.z <= 0) {
          this.reset();
        }
      }

      draw() {
        const perspective = 300 / (300 + this.z);
        const px = (this.x - width/2) * perspective + width/2;
        const py = (this.y - height/2) * perspective + height/2;
        const pSize = this.size * perspective * 2;
        
        ctx.fillStyle = `rgba(157, 124, 255, ${this.opacity * perspective})`;
        ctx.beginPath();
        ctx.arc(px, py, pSize, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const init = () => {
      particles = [];
      for (let i = 0; i < 150; i++) {
        particles.push(new Particle());
      }
    };

    const animate = () => {
      ctx.clearRect(0, 0, width, height);
      particles.forEach(p => {
        p.update();
        p.draw();
      });
      animationFrameId = requestAnimationFrame(animate);
    };

    init();
    animate();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-[#05070a]">
      {/* Gradient Blobs */}
      <div 
        className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] rounded-full mix-blend-screen filter blur-[100px] opacity-30 animate-[blob-move-1_20s_ease-in-out_infinite]"
        style={{ background: 'radial-gradient(circle, #4A8CFF, transparent 70%)', willChange: 'transform' }}
      />
      <div 
        className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full mix-blend-screen filter blur-[120px] opacity-20 animate-[blob-move-2_25s_ease-in-out_infinite]"
        style={{ background: 'radial-gradient(circle, #9D7CFF, transparent 70%)', willChange: 'transform' }}
      />
      <div 
        className="absolute top-[20%] left-[60%] w-[30vw] h-[30vw] rounded-full mix-blend-screen filter blur-[90px] opacity-20 animate-[blob-move-3_18s_ease-in-out_infinite]"
        style={{ background: 'radial-gradient(circle, #FF8547, transparent 70%)', willChange: 'transform' }}
      />
      
      {/* Particles Canvas */}
      <canvas 
        ref={canvasRef} 
        className="absolute inset-0" 
        style={{ willChange: 'transform, opacity' }} 
      />
    </div>
  );
};

export default AnimatedBackground;
