import React from 'react';

const STATE_CONFIG = {
  IDLE: { text: 'Tap the orb to speak', color: 'bg-blue-500', glow: 'shadow-[0_0_10px_rgba(37,99,235,0.4)]' },
  INTRODUCING: { text: 'Introducing...', color: 'bg-purple-500', glow: 'shadow-[0_0_10px_rgba(124,58,237,0.4)]' },
  LISTENING: { text: 'Listening...', color: 'bg-teal-500', glow: 'shadow-[0_0_10px_rgba(20,184,166,0.4)]' },
  PROCESSING: { text: 'Understanding...', color: 'bg-amber-500', glow: 'shadow-[0_0_10px_rgba(245,158,11,0.4)]' },
  RETRIEVING: { text: 'Searching Knowledge Base...', color: 'bg-amber-500', glow: 'shadow-[0_0_10px_rgba(245,158,11,0.4)]' },
  GENERATING: { text: 'Generating Response...', color: 'bg-amber-500', glow: 'shadow-[0_0_10px_rgba(245,158,11,0.4)]' },
  SPEAKING: { text: 'Speaking...', color: 'bg-purple-500', glow: 'shadow-[0_0_10px_rgba(124,58,237,0.4)]' },
};

const StatusIndicator = ({ state = 'IDLE' }) => {
  const config = STATE_CONFIG[state] || STATE_CONFIG.IDLE;

  return (
    <div className="flex items-center justify-center space-x-3 h-8 overflow-hidden relative w-full">
      <div className={`w-2 h-2 rounded-full ${config.color} ${config.glow} transition-colors duration-500 animate-pulse`}></div>
      <div className="relative h-full flex items-center justify-center w-64">
        <span 
          key={state}
          className="absolute text-gray-600 text-sm font-medium tracking-wide animate-[slide-up-fade_0.3s_ease-out]"
        >
          {config.text}
        </span>
      </div>
    </div>
  );
};

export default StatusIndicator;
