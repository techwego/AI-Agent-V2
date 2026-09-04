import React from 'react';
import { Volume2, Loader2, Sparkles, Mic } from 'lucide-react';

const StatusIndicator = ({ state = 'IDLE' }) => {
  return (
    <div className="flex flex-col items-center justify-center h-9 select-none">
      
      {state === 'IDLE' && (
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900/80 backdrop-blur-md border border-slate-700/80 text-xs font-semibold text-slate-300 shadow-lg shadow-black/20 transition-all animate-[fadeInScale_0.2s_ease-out]">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-beacon-green" />
          <span>Tap the orb to speak</span>
        </div>
      )}

      {state === 'INTRODUCING' && (
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-950/80 backdrop-blur-md border border-indigo-500/40 text-xs font-bold text-indigo-300 shadow-lg shadow-indigo-950/40 transition-all animate-[fadeInScale_0.2s_ease-out]">
          <Volume2 size={13} className="text-indigo-400 animate-pulse" />
          <span>Sam is introducing...</span>
        </div>
      )}

      {state === 'LISTENING' && (
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-sky-950/90 backdrop-blur-md border border-sky-400/50 text-xs font-bold text-sky-300 shadow-lg shadow-sky-950/50 transition-all animate-[fadeInScale_0.2s_ease-out]">
          <div className="flex items-center gap-0.5 h-3">
            <span className="w-1 h-2 bg-sky-400 rounded-full animate-[bounce_0.5s_infinite]" />
            <span className="w-1 h-3.5 bg-sky-300 rounded-full animate-[bounce_0.6s_infinite_0.1s]" />
            <span className="w-1 h-2.5 bg-sky-400 rounded-full animate-[bounce_0.4s_infinite_0.2s]" />
          </div>
          <span>Listening...</span>
        </div>
      )}

      {(state === 'PROCESSING' || state === 'RETRIEVING' || state === 'GENERATING') && (
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-950/80 backdrop-blur-md border border-amber-500/40 text-xs font-bold text-amber-300 shadow-lg shadow-amber-950/40 transition-all animate-[fadeInScale_0.2s_ease-out]">
          <Loader2 size={13} className="animate-spin text-amber-400 shrink-0" />
          <span>Thinking & Querying...</span>
        </div>
      )}

      {state === 'SPEAKING' && (
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-950/90 backdrop-blur-md border border-indigo-400/50 text-xs font-bold text-indigo-300 shadow-lg shadow-indigo-950/40 transition-all animate-[fadeInScale_0.2s_ease-out]">
          <div className="flex items-center gap-0.5 h-3">
            <span className="w-1 h-2 bg-indigo-400 rounded-full animate-[bounce_0.6s_infinite]" />
            <span className="w-1 h-3 bg-indigo-300 rounded-full animate-[bounce_0.5s_infinite_0.15s]" />
            <span className="w-1 h-1.5 bg-indigo-400 rounded-full animate-[bounce_0.7s_infinite_0.3s]" />
          </div>
          <span>Sam is speaking</span>
        </div>
      )}

    </div>
  );
};

export default StatusIndicator;
