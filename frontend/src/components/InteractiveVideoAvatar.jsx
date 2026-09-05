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
        if (isMounted) { setStreamError(true); setIsWebRTCConnected(false); }
      }
    };
    connectWebRTCStream();
    return () => { isMounted = false; if (videoEl) videoEl.srcObject = null; };
  }, [webrtcStreamUrl, streamError]);

  return (
    <div className="relative flex flex-col items-center justify-center select-none py-1">

      {/* ═══ Outer Atmospheric Ripple Waves ═══ */}
      {isListening && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
          <div className="w-56 h-56 sm:w-72 sm:h-72 rounded-full border-2 border-cyan-400/40 animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite]" />
          <div className="absolute w-64 h-64 sm:w-80 sm:h-80 rounded-full border border-cyan-300/25 animate-[ping_2.5s_cubic-bezier(0,0,0.2,1)_infinite_0.4s]" />
          <div className="absolute w-72 h-72 sm:w-96 sm:h-96 rounded-full border border-sky-200/15 animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite_0.8s]" />
        </div>
      )}

      {isSpeaking && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
          <div className="w-56 h-56 sm:w-72 sm:h-72 rounded-full border-2 border-violet-400/35 animate-[pulse_1.6s_ease-in-out_infinite]" />
          <div className="absolute w-64 h-64 sm:w-80 sm:h-80 rounded-full border border-purple-300/20 animate-[pulse_2s_ease-in-out_infinite_0.3s]" />
        </div>
      )}

      {isProcessing && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
          <div className="w-60 h-60 sm:w-76 sm:h-76 rounded-full border border-dashed border-amber-400/35 animate-[spin_6s_linear_infinite]" />
          <div className="absolute w-52 h-52 sm:w-68 sm:h-68 rounded-full border border-dashed border-amber-300/20 animate-[spin_10s_linear_infinite_reverse]" />
        </div>
      )}

      {/* ═══ Main Interactive Orb Container ═══ */}
      <div 
        onClick={onClick}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick?.(); } }}
        className="relative group cursor-pointer active:scale-[0.96] transition-transform duration-200 flex flex-col items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/60 rounded-full"
        role="button"
        tabIndex={0}
        aria-label={isListening ? 'Stop listening' : isSpeaking ? 'Interrupt speech' : 'Activate voice assistant'}
      >
        {/* Ambient Glow Halo */}
        <div className={`absolute -inset-6 sm:-inset-8 rounded-full blur-3xl transition-all duration-700 pointer-events-none ${
          isListening 
            ? 'bg-gradient-to-br from-cyan-500/45 via-teal-400/35 to-blue-500/30 scale-125' 
            : isSpeaking 
              ? 'bg-gradient-to-br from-violet-500/45 via-purple-400/35 to-indigo-500/30 scale-[1.2]' 
              : isProcessing 
                ? 'bg-gradient-to-br from-amber-500/40 via-orange-400/30 to-yellow-400/25 scale-[1.15]' 
                : 'bg-gradient-to-br from-blue-500/25 via-indigo-400/15 to-sky-400/20 group-hover:from-blue-500/40 group-hover:to-indigo-500/35 group-hover:scale-110'
        }`} />

        {/* 3D Orb Frame */}
        <div className={`relative w-52 h-52 sm:w-64 sm:h-64 rounded-full flex items-center justify-center transition-all duration-500 ${
          isListening 
            ? 'shadow-[0_0_60px_8px_rgba(6,182,212,0.3)] ring-2 ring-cyan-400/30' 
            : isSpeaking 
              ? 'shadow-[0_0_60px_8px_rgba(139,92,246,0.3)] ring-2 ring-violet-400/30' 
              : isProcessing 
                ? 'shadow-[0_0_50px_6px_rgba(245,158,11,0.25)] ring-2 ring-amber-400/25' 
                : 'shadow-[0_0_40px_4px_rgba(59,130,246,0.15)] group-hover:shadow-[0_0_60px_8px_rgba(59,130,246,0.3)] ring-1 ring-white/10 group-hover:ring-blue-400/30'
        }`}>

          {/* Three.js 3D WebGL Orb */}
          <div className="w-full h-full rounded-full overflow-hidden relative z-10">
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

        {/* Status Badge (Outside Pod — Never Clipped) */}
        <div className="relative -mt-3 z-30 transition-all duration-300 group-hover:scale-105">
          {isListening ? (
            <div className="flex items-center gap-1.5 px-5 py-2 rounded-full bg-gradient-to-r from-red-500 to-rose-600 text-white text-xs font-bold shadow-lg shadow-red-500/30 border border-white/30 animate-pulse">
              <Radio size={13} className="animate-spin" />
              <span className="tracking-wider">Listening…</span>
            </div>
          ) : isProcessing ? (
            <div className="flex items-center gap-1.5 px-5 py-2 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold shadow-lg shadow-amber-500/30 border border-white/30">
              <Loader2 size={13} className="animate-spin" />
              <span className="tracking-wider">Thinking…</span>
            </div>
          ) : isSpeaking ? (
            <div className="flex items-center gap-1.5 px-5 py-2 rounded-full bg-gradient-to-r from-violet-600 to-purple-600 text-white text-xs font-bold shadow-lg shadow-violet-500/30 border border-white/30">
              <Volume2 size={13} className="animate-bounce" />
              <span className="tracking-wider">Speaking…</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-5 py-2 rounded-full bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-white text-xs font-bold shadow-lg shadow-blue-600/30 border border-white/30 group-hover:from-blue-700 group-hover:to-violet-700 group-hover:shadow-blue-500/40">
              <Mic size={13} />
              <span className="tracking-wider">Tap to Speak</span>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default InteractiveVideoAvatar;
