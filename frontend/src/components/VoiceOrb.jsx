import React from 'react';
import { Mic } from 'lucide-react';

const VoiceOrb = ({ state = 'IDLE', onClick }) => {
  const isListening = state === 'LISTENING';
  const isSpeaking = state === 'INTRODUCING' || state === 'SPEAKING';
  const isProcessing = state === 'PROCESSING' || state === 'RETRIEVING' || state === 'GENERATING';

  let filterClass = '';
  if (isListening) filterClass = 'listening-filter';
  else if (isSpeaking) filterClass = 'speaking-filter';

  return (
    <div className="avatar-view">
      <div 
        className={`glass-orb-container ${state === 'IDLE' ? 'animate-[breathe_4s_ease-in-out_infinite]' : ''}`} 
        onClick={onClick}
      >
        <div className="glass-orb"></div>
        <img 
          src="https://cdn.dribbble.com/userupload/23131588/file/original-7170a735f9fbc50004dc5ece58421c06.gif" 
          alt="Orb Base" 
          className={`exact-orb-img ${filterClass}`}
        />
        <div className="orb-mic">
          <Mic size={32} className={isListening ? 'text-red-400 animate-pulse' : 'text-white'} />
        </div>
        
        {isListening && (
          <>
            <div className="absolute inset-0 rounded-full border-2 border-teal-400/50 animate-[pulse-ring_2s_cubic-bezier(0.215,0.61,0.355,1)_infinite]"></div>
            <div className="absolute inset-0 rounded-full border-2 border-teal-400/30 animate-[pulse-ring_2s_cubic-bezier(0.215,0.61,0.355,1)_infinite_0.5s]"></div>
            <div className="absolute inset-0 rounded-full border-2 border-teal-400/10 animate-[pulse-ring_2s_cubic-bezier(0.215,0.61,0.355,1)_infinite_1s]"></div>
          </>
        )}

        {isSpeaking && (
          <>
            <div className="absolute inset-0 rounded-full border-2 border-purple-400/40 animate-[pulse-ring_1.5s_cubic-bezier(0.215,0.61,0.355,1)_infinite]"></div>
            <div className="absolute inset-0 rounded-full border-2 border-purple-400/20 animate-[pulse-ring_1.5s_cubic-bezier(0.215,0.61,0.355,1)_infinite_0.4s]"></div>
          </>
        )}

        {isProcessing && (
          <>
            <div className="absolute inset-[-10px] rounded-full border-2 border-dashed border-blue-400/50 animate-[spin-slow_4s_linear_infinite]"></div>
            <div className="absolute top-1/2 left-1/2 w-3 h-3 bg-blue-400 rounded-full shadow-[0_0_10px_rgba(74,140,255,0.8)] animate-[orbit_2s_linear_infinite] origin-center -ml-1.5 -mt-1.5"></div>
          </>
        )}
      </div>
    </div>
  );
};

export default VoiceOrb;
