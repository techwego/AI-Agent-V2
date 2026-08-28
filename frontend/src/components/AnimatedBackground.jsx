import React from 'react';

const AnimatedBackground = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {/* Crisp subtle grid mesh */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:3.5rem_3.5rem] [mask-image:radial-gradient(ellipse_75%_60%_at_50%_40%,#000_65%,transparent_100%)] opacity-35" />
      
      {/* Smooth GPU ambient light orbs with gentle CSS breathing animation */}
      <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-blue-400/10 via-indigo-400/8 to-violet-400/5 blur-3xl transform-gpu animate-pulse-soft" />
      <div className="absolute bottom-[-15%] right-[-5%] w-[450px] h-[450px] rounded-full bg-gradient-to-tr from-sky-400/8 to-blue-500/5 blur-3xl transform-gpu" />
    </div>
  );
};

export default AnimatedBackground;
