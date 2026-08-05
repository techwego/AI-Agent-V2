import React from 'react';

const STATE_CONFIG = {
  IDLE: { text: 'Tap the orb to speak', color: 'bg-blue-400', glow: 'shadow-[0_0_10px_rgba(74,140,255,0.6)]' },
  INTRODUCING: { text: 'Introducing...', color: 'bg-purple-400', glow: 'shadow-[0_0_10px_rgba(157,124,255,0.6)]' },
  LISTENING: { text: 'Listening...', color: 'bg-teal-400', glow: 'shadow-[0_0_10px_rgba(45,212,191,0.6)]' },
  PROCESSING: { text: 'Understanding...', color: 'bg-amber-400', glow: 'shadow-[0_0_10px_rgba(251,191,36,0.6)]' },
  RETRIEVING: { text: 'Searching Knowledge Base...', color: 'bg-amber-400', glow: 'shadow-[0_0_10px_rgba(251,191,36,0.6)]' },
  GENERATING: { text: 'Generating Response...', color: 'bg-amber-400', glow: 'shadow-[0_0_10px_rgba(251,191,36,0.6)]' },
  SPEAKING: { text: 'Speaking...', color: 'bg-purple-400', glow: 'shadow-[0_0_10px_rgba(157,124,255,0.6)]' },
};

const StatusIndicator = ({ state = 'IDLE' }) => {
  const config = STATE_CONFIG[state] || STATE_CONFIG.IDLE;

  return (
    <div className="flex items-center justify-center space-x-3 h-8 overflow-hidden relative w-full">
      <div className={`w-2 h-2 rounded-full ${config.color} ${config.glow} transition-colors duration-500 animate-pulse`}></div>
      <div className="relative h-full flex items-center justify-center w-64">
        <span 
          key={state}
          className="absolute text-gray-300 text-sm font-medium tracking-wide animate-[slide-up-fade_0.3s_ease-out]"
          style={{ textShadow: `0 0 10px ${config.color.replace('bg-', '')}` }}
        >
          {config.text}
        </span>
      </div>
    </div>
  );
};

export default StatusIndicator;
