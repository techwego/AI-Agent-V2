import React, { useEffect, useRef } from 'react';

const Waveform = ({ analyserRef, isActive, type = 'mic' }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    let animationFrameId;
    const numBars = 32;
    let barWidth = canvas.width / numBars;
    let heights = new Array(numBars).fill(2); // Initial low heights

    const handleResize = () => {
      // Just visually responsive, internal resolution is fixed for simple scaling
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = 60;
      barWidth = canvas.width / numBars;
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      let dataArray = null;
      if (isActive && analyserRef?.current) {
        dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);
      }

      // Create gradient based on type
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      if (type === 'mic') {
        gradient.addColorStop(0, '#4A8CFF');
        gradient.addColorStop(1, '#3b82f6');
      } else {
        gradient.addColorStop(0, '#9D7CFF');
        gradient.addColorStop(1, '#8b5cf6');
      }
      ctx.fillStyle = gradient;

      for (let i = 0; i < numBars; i++) {
        let targetHeight = 2; // minimum height
        
        if (dataArray) {
          // Map frequency data to our fewer bars (grouping bins)
          const binSize = Math.floor(dataArray.length / numBars);
          let sum = 0;
          for (let j = 0; j < binSize; j++) {
            sum += dataArray[i * binSize + j];
          }
          const average = sum / binSize;
          targetHeight = Math.max(2, (average / 255) * canvas.height * 0.9);
        }

        // Lerp for smooth animation
        heights[i] = heights[i] + (targetHeight - heights[i]) * 0.15;
        
        const x = i * barWidth;
        const h = heights[i];
        const y = (canvas.height - h) / 2; // center vertically
        
        // Draw rounded bar
        const r = Math.min(barWidth * 0.4, h / 2);
        ctx.beginPath();
        ctx.roundRect(x + barWidth * 0.1, y, barWidth * 0.8, h, r);
        ctx.fill();
      }
      
      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, [analyserRef, isActive, type]);

  return (
    <canvas 
      ref={canvasRef} 
      className="w-full h-[60px]"
      style={{ willChange: 'transform' }}
    />
  );
};

export default Waveform;
