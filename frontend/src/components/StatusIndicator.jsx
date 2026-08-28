import React, { useState, useEffect } from 'react';
import { Mic, Volume2, Search, Brain, Sparkles, Loader2 } from 'lucide-react';

const StatusIndicator = ({ state = 'IDLE' }) => {
  const [retrievalStep, setRetrievalStep] = useState(0);

  // Rotate thought steps during retrieval/processing to keep users engaged
  useEffect(() => {
    let interval;
    if (state === 'PROCESSING' || state === 'RETRIEVING' || state === 'GENERATING') {
      interval = setInterval(() => {
        setRetrievalStep(prev => (prev + 1) % 3);
      }, 1200);
    } else {
      setRetrievalStep(0);
    }
    return () => clearInterval(interval);
  }, [state]);

  const thoughtPhases = [
    { text: 'Searching library catalog & map index...', icon: Search, color: 'text-amber-600' },
    { text: 'Analyzing shelf availability & routes...', icon: Brain, color: 'text-indigo-600' },
    { text: 'Synthesizing voice response...', icon: Sparkles, color: 'text-blue-600' }
  ];

  return (
    <div className="flex flex-col items-center justify-center h-10 select-none">
      
      {state === 'IDLE' && (
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-slate-100/90 border border-slate-200 text-xs font-semibold text-slate-600 shadow-sm transition-all animate-[fadeIn_0.2s_ease-out]">
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          <span>Tap the orb to speak</span>
        </div>
      )}

      {state === 'INTRODUCING' && (
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-50 border border-purple-200 text-xs font-bold text-purple-700 shadow-sm transition-all animate-[fadeIn_0.2s_ease-out]">
          <Volume2 size={13} className="text-purple-600 animate-pulse" />
          <span>Greeting...</span>
        </div>
      )}

      {state === 'LISTENING' && (
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-sky-50 border border-sky-300 text-xs font-bold text-sky-700 shadow-md shadow-sky-500/10 transition-all animate-[fadeIn_0.2s_ease-out]">
          {/* Animated sound bars */}
          <div className="flex items-center gap-0.5 h-3">
            <span className="w-1 h-2 bg-sky-500 rounded-full animate-[bounce_0.5s_infinite]" />
            <span className="w-1 h-3.5 bg-sky-600 rounded-full animate-[bounce_0.6s_infinite_0.1s]" />
            <span className="w-1 h-2.5 bg-sky-500 rounded-full animate-[bounce_0.4s_infinite_0.2s]" />
          </div>
          <span>Listening to your question...</span>
        </div>
      )}

      {(state === 'PROCESSING' || state === 'RETRIEVING' || state === 'GENERATING') && (
        <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-amber-50/90 border border-amber-200 text-xs font-bold text-amber-900 shadow-sm transition-all animate-[fadeIn_0.2s_ease-out]">
          <Loader2 size={13} className="animate-spin text-amber-600 shrink-0" />
          <span className="truncate max-w-[260px] sm:max-w-xs transition-all">
            {thoughtPhases[retrievalStep].text}
          </span>
        </div>
      )}

      {state === 'SPEAKING' && (
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 border border-indigo-200 text-xs font-bold text-indigo-700 shadow-sm transition-all animate-[fadeIn_0.2s_ease-out]">
          <div className="flex items-center gap-0.5 h-3">
            <span className="w-1 h-2 bg-indigo-500 rounded-full animate-[bounce_0.6s_infinite]" />
            <span className="w-1 h-3 bg-indigo-600 rounded-full animate-[bounce_0.5s_infinite_0.15s]" />
            <span className="w-1 h-1.5 bg-indigo-500 rounded-full animate-[bounce_0.7s_infinite_0.3s]" />
          </div>
          <span>Sam is speaking</span>
        </div>
      )}

    </div>
  );
};

export default StatusIndicator;
