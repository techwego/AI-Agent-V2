import React, { useRef, useEffect, useState } from 'react';
import { Mic, Loader2, Volume2, Radio } from 'lucide-react';
import useAvatarAudioStream from '../voice/useAvatarAudioStream';
import ThreeAvatarCanvas from './ThreeAvatarCanvas';

const InteractiveVideoAvatar = ({ 
  state = 'IDLE', 
  onClick,
  webrtcStreamUrl = null,
  avatarProfile = 'Sam · AI Digital Human'
}) => {
  const videoRef = useRef(null);
  const [streamError, setStreamError] = useState(false);
  const [isWebRTCConnected, setIsWebRTCConnected] = useState(false);

  const isListening = state === 'LISTENING';
  const isSpeaking = state === 'INTRODUCING' || state === 'SPEAKING';
  const isProcessing = state === 'PROCESSING' || state === 'RETRIEVING' || state === 'GENERATING';

  // Audio-driven lip-sync viseme & micro-movement extractor
  const { isLipSyncing, viseme, currentWord } = useAvatarAudioStream({ state });

  // WebRTC Stream Consumer (Simli / HeyGen / Tavus / D-ID video stream layer)
  useEffect(() => {
    if (!webrtcStreamUrl || streamError) {
      setIsWebRTCConnected(false);
      return;
    }

    let isMounted = true;
    const videoEl = videoRef.current;

    const connectWebRTCStream = async () => {
      try {
        if (videoEl && webrtcStreamUrl instanceof MediaStream) {
          videoEl.srcObject = webrtcStreamUrl;
          await videoEl.play();
          if (isMounted) setIsWebRTCConnected(true);
        }
      } catch (err) {
        console.warn('[VideoAvatar] WebRTC stream fallback active:', err);
        if (isMounted) {
          setStreamError(true);
          setIsWebRTCConnected(false);
        }
      }
    };

    connectWebRTCStream();

    return () => {
      isMounted = false;
      if (videoEl) {
        videoEl.srcObject = null;
      }
    };
  }, [webrtcStreamUrl, streamError]);

  return (
    <div className="relative flex flex-col items-center justify-center select-none py-1">
      
      {/* ========================================================================= */}
      {/* 1. DYNAMIC AUDIO-REACTIVE 3D ACOUSTIC RIPPLE WAVES */}
      {/* ========================================================================= */}
      {isListening && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-56 h-56 sm:w-72 sm:h-72 rounded-full border-2 border-cyan-400/50 animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite]" />
          <div className="absolute w-64 h-64 sm:w-80 sm:h-80 rounded-full border border-blue-400/30 animate-[ping_2.5s_cubic-bezier(0,0,0.2,1)_infinite_0.4s]" />
          <div className="absolute w-72 h-72 sm:w-96 sm:h-96 rounded-full border border-sky-300/20 animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite_0.8s]" />
        </div>
      )}

      {isSpeaking && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-56 h-56 sm:w-72 sm:h-72 rounded-full border-2 border-indigo-400/40 animate-[pulse_1.6s_ease-in-out_infinite]" />
          <div className="absolute w-68 h-68 sm:w-88 sm:h-88 rounded-full border border-purple-400/25 animate-[pulse_2s_ease-in-out_infinite_0.3s]" />
        </div>
      )}

      {isProcessing && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-60 h-60 sm:w-76 sm:h-76 rounded-full border border-dashed border-amber-400/40 animate-[spin_8s_linear_infinite]" />
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. MAIN 3D AVATAR & INTERACTIVE ORB CONTAINER */}
      {/* ========================================================================= */}
      <div 
        onClick={onClick}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick?.(); } }}
        className="relative group cursor-pointer active:scale-95 transition-all duration-300 flex flex-col items-center justify-center focus:outline-none"
        role="button"
        tabIndex={0}
        aria-label={isListening ? 'Stop listening' : isSpeaking ? 'Interrupt speech' : 'Activate voice assistant'}
      >
        {/* Ambient Glow Backlight */}
        <div className={`absolute -inset-4 sm:-inset-6 rounded-full blur-3xl transition-all duration-700 pointer-events-none ${
          isListening 
            ? 'bg-gradient-to-tr from-cyan-500/40 via-blue-500/35 to-teal-400/30 scale-125' 
            : isSpeaking 
              ? 'bg-gradient-to-tr from-indigo-500/40 via-purple-500/35 to-violet-400/30 scale-120' 
              : isProcessing 
                ? 'bg-gradient-to-tr from-amber-500/35 via-orange-500/30 to-yellow-400/25 scale-115' 
                : 'bg-gradient-to-tr from-blue-500/20 via-indigo-500/15 to-sky-400/20 group-hover:from-blue-500/35 group-hover:to-indigo-500/30 group-hover:scale-110'
        }`} />

        {/* 3D Glassmorphic Outer Pod */}
        <div className={`relative w-48 h-48 sm:w-60 sm:h-60 rounded-full flex items-center justify-center transition-all duration-500 backdrop-blur-xl border ${
          isListening 
            ? 'bg-gradient-to-b from-cyan-950/40 to-slate-900/60 border-cyan-300/80 shadow-2xl shadow-cyan-500/25 ring-4 ring-cyan-400/20' 
            : isSpeaking 
              ? 'bg-gradient-to-b from-indigo-950/40 to-slate-900/60 border-indigo-300/80 shadow-2xl shadow-indigo-500/25 ring-4 ring-indigo-400/20' 
              : isProcessing 
                ? 'bg-gradient-to-b from-amber-950/40 to-slate-900/60 border-amber-300/80 shadow-2xl shadow-amber-500/25 ring-4 ring-amber-400/20' 
                : 'bg-gradient-to-b from-slate-900/50 to-slate-950/70 border-slate-700/80 shadow-xl shadow-blue-900/20 group-hover:border-blue-400 group-hover:shadow-2xl group-hover:shadow-blue-500/30'
        }`}>
          
          {/* Specular Inner Glass Highlights */}
          <div className="absolute inset-1 rounded-full border border-white/20 pointer-events-none z-20" />
          <div className="absolute top-1 left-6 right-6 h-10 rounded-full bg-gradient-to-b from-white/30 to-transparent pointer-events-none z-20" />

          {/* WebRTC Video Stream Player (Simli / HeyGen / Tavus) OR Three.js 3D Digital Human */}
          <div className="w-full h-full rounded-full overflow-hidden flex items-center justify-center relative z-10">
            {isWebRTCConnected ? (
              <video 
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover rounded-full"
              />
            ) : (
              <ThreeAvatarCanvas
                state={state}
                viseme={viseme}
                isSpeaking={isSpeaking}
                isListening={isListening}
                isProcessing={isProcessing}
              />
            )}
          </div>

        </div>

        {/* Real-Time Status Interactive Control Badge (Positioned Outside Pod - Never Clipped) */}
        <div className="relative -mt-3.5 z-30 transition-all duration-300 group-hover:scale-105">
          {isListening ? (
            <div className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-gradient-to-r from-red-500 to-rose-600 text-white text-xs font-bold shadow-lg shadow-red-500/30 border border-white/40 animate-pulse">
              <Radio size={13} className="animate-spin text-white" />
              <span className="tracking-wide">Listening...</span>
            </div>
          ) : isProcessing ? (
            <div className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold shadow-lg shadow-amber-500/30 border border-white/40">
              <Loader2 size={13} className="animate-spin text-white" />
              <span className="tracking-wide">Thinking...</span>
            </div>
          ) : isSpeaking ? (
            <div className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-bold shadow-lg shadow-indigo-500/30 border border-white/40">
              <Volume2 size={13} className="animate-bounce text-white" />
              <span className="tracking-wide">Speaking...</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-white text-xs font-bold shadow-lg shadow-blue-600/30 border border-white/40 group-hover:from-blue-700 group-hover:to-violet-700">
              <Mic size={13} className="text-white" />
              <span className="tracking-wide">Tap to Speak</span>
            </div>
          )}
        </div>

      </div>

    </div>
  );
};

export default InteractiveVideoAvatar;
