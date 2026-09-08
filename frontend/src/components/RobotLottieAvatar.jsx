import React, { useEffect, useRef } from 'react';
import lottie from 'lottie-web';
import robotAnimationData from '../assets/robot_avatar.json';

const RobotLottieAvatar = ({ 
  speed = 1.0, 
  className = "w-[220px] h-[220px]",
  style = {} 
}) => {
  const containerRef = useRef(null);
  const animRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Initialize native SVG Lottie animation
    animRef.current = lottie.loadAnimation({
      container: containerRef.current,
      renderer: 'svg',
      loop: true,
      autoplay: true,
      animationData: robotAnimationData,
      rendererSettings: {
        preserveAspectRatio: 'xMidYMid meet',
        progressiveLoad: true,
        hideOnTransparent: true
      }
    });

    animRef.current.setSpeed(speed);

    return () => {
      if (animRef.current) {
        animRef.current.destroy();
        animRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (animRef.current) {
      animRef.current.setSpeed(speed);
    }
  }, [speed]);

  return (
    <div 
      ref={containerRef} 
      className={`flex items-center justify-center pointer-events-none select-none ${className}`}
      style={style}
    />
  );
};

export default RobotLottieAvatar;
