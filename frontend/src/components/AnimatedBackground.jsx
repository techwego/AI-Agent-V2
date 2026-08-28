import React from 'react';

const AnimatedBackground = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {/* Larger, more visible grid pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#cbd5e1_1px,transparent_1px),linear-gradient(to_bottom,#cbd5e1_1px,transparent_1px)] bg-[size:5rem_5rem] [mask-image:radial-gradient(ellipse_80%_70%_at_50%_40%,#000_60%,transparent_100%)] opacity-25" />
      
      {/* Soft ambient tinted bloom */}
      <div className="absolute top-[-8%] left-[40%] w-[500px] h-[500px] rounded-full bg-gradient-to-br from-blue-300/8 to-indigo-300/5 blur-3xl transform-gpu" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[400px] h-[400px] rounded-full bg-gradient-to-tr from-sky-300/6 to-blue-400/4 blur-3xl transform-gpu" />
    </div>
  );
};

export default AnimatedBackground;
