import React, { useEffect, useRef } from 'react';

/* ─────────────────────────────────────────────────────────────────────────────
 *  Enterprise Matte Acoustic Voice Sphere (OpenAI / Gemini / Apple Style)
 *
 *  • Zero harsh glare: Matte gradient surface with smooth diffused studio lighting
 *  • Harmonic acoustic sound wave pulse rings (Responsive to Listening & Speaking)
 *  • Sleek floating center acoustic equalizer waveform
 *  • Smooth fluid breathing animation with zero CPU/GPU overhead
 * ────────────────────────────────────────────────────────────────────────── */

const VoiceOrb = ({ state = 'IDLE', onClick }) => {
  const isListening = state === 'LISTENING';
  const isSpeaking = state === 'SPEAKING' || state === 'INTRODUCING';
  const isThinking = state === 'PROCESSING' || state === 'RETRIEVING' || state === 'GENERATING';

  return (
    <div 
      className="relative flex items-center justify-center cursor-pointer select-none group py-4"
      onClick={onClick}
      title="Click to interact with AI Voice Assistant"
    >
      {/* ── Layer 1: Ambient Matte Drop Shadow (Provides rich physical depth without glare) ── */}
      <div className={`absolute w-44 h-44 sm:w-52 sm:h-52 rounded-full transition-all duration-700 pointer-events-none ${
        isListening
          ? 'bg-sky-500/15 shadow-[0_20px_50px_rgba(14,165,233,0.25)] scale-110'
          : isSpeaking
            ? 'bg-indigo-500/15 shadow-[0_20px_50px_rgba(99,102,241,0.25)] scale-110'
            : isThinking
              ? 'bg-amber-500/15 shadow-[0_20px_50px_rgba(245,158,11,0.20)] scale-105'
              : 'bg-blue-600/10 shadow-[0_15px_40px_rgba(37,99,235,0.15)] group-hover:scale-105 group-hover:shadow-[0_20px_50px_rgba(37,99,235,0.22)]'
      }`} />

      {/* ── Layer 2: Harmonic Acoustic Soundwave Ripple Rings (Active in Listening/Speaking) ── */}
      {isListening && (
        <>
          <div className="absolute w-52 h-52 sm:w-60 sm:h-60 rounded-full border border-sky-400/30 animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite] pointer-events-none" />
          <div className="absolute w-60 h-60 sm:w-72 sm:h-72 rounded-full border border-sky-400/20 animate-[ping_2.5s_cubic-bezier(0,0,0.2,1)_infinite_0.4s] pointer-events-none" />
        </>
      )}

      {isSpeaking && (
        <>
          <div className="absolute w-52 h-52 sm:w-60 sm:h-60 rounded-full border border-indigo-400/30 animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite] pointer-events-none" />
          <div className="absolute w-60 h-60 sm:w-72 sm:h-72 rounded-full border border-indigo-400/20 animate-[ping_2.5s_cubic-bezier(0,0,0.2,1)_infinite_0.5s] pointer-events-none" />
        </>
      )}

      {/* ── Layer 3: Main Matte Sphere with Sophisticated Multi-Stop Gradients (Zero Blinding White) ── */}
      <div 
        className={`w-40 h-40 sm:w-48 sm:h-48 rounded-full relative z-10 flex items-center justify-center transition-all duration-500 ease-out transform-gpu group-hover:scale-105 group-active:scale-95 shadow-xl ${
          isListening
            ? 'bg-gradient-to-tr from-cyan-600 via-sky-500 to-blue-600 shadow-sky-600/30 ring-4 ring-sky-200/60 animate-pulse-soft'
            : isSpeaking
              ? 'bg-gradient-to-tr from-violet-700 via-indigo-600 to-blue-600 shadow-indigo-600/30 ring-4 ring-indigo-200/60 animate-pulse-soft'
              : isThinking
                ? 'bg-gradient-to-tr from-amber-600 via-orange-500 to-amber-500 shadow-amber-600/30 ring-4 ring-amber-200/60 animate-pulse-soft'
                : 'bg-gradient-to-tr from-blue-700 via-indigo-600 to-blue-500 shadow-blue-700/25 ring-4 ring-blue-100/80'
        }`}
      >
        {/* Subtle Matte Inner Shadow for 3D Convex Curvature */}
        <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_35%_25%,rgba(255,255,255,0.18)_0%,transparent_60%)] pointer-events-none" />
        <div className="absolute inset-0 rounded-full shadow-[inset_0_-8px_16px_rgba(0,0,0,0.30)] pointer-events-none" />
        <div className="absolute inset-0 rounded-full shadow-[inset_0_2px_4px_rgba(255,255,255,0.25)] pointer-events-none" />

        {/* ── Layer 4: Center Acoustic Waveform Visualization ── */}
        <div className="relative z-20 flex items-center gap-1.5 h-12 select-none">
          {isListening ? (
            /* Active Listening Waveform */
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-4 bg-white/90 rounded-full animate-[bounce_0.6s_infinite_0.1s]" />
              <span className="w-1.5 h-8 bg-white rounded-full animate-[bounce_0.5s_infinite_0.2s]" />
              <span className="w-1.5 h-10 bg-white rounded-full animate-[bounce_0.7s_infinite]" />
              <span className="w-1.5 h-7 bg-white rounded-full animate-[bounce_0.55s_infinite_0.15s]" />
              <span className="w-1.5 h-4 bg-white/90 rounded-full animate-[bounce_0.6s_infinite_0.3s]" />
            </div>
          ) : isSpeaking ? (
            /* Active Voice Speaking Waveform */
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-5 bg-white/90 rounded-full animate-[bounce_0.5s_infinite]" />
              <span className="w-1.5 h-9 bg-white rounded-full animate-[bounce_0.6s_infinite_0.15s]" />
              <span className="w-1.5 h-11 bg-white rounded-full animate-[bounce_0.45s_infinite_0.25s]" />
              <span className="w-1.5 h-8 bg-white rounded-full animate-[bounce_0.65s_infinite_0.1s]" />
              <span className="w-1.5 h-5 bg-white/90 rounded-full animate-[bounce_0.5s_infinite_0.35s]" />
            </div>
          ) : isThinking ? (
            /* Thinking / Processing Spinner */
            <div className="w-8 h-8 rounded-full border-2 border-white/30 border-t-white animate-spin" />
          ) : (
            /* Elegant Idle Breathing Sound Dot Pattern */
            <div className="flex items-center gap-1.5 opacity-85 group-hover:opacity-100 transition-opacity">
              <span className="w-2 h-2 rounded-full bg-white/75" />
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
              <span className="w-2 h-2 rounded-full bg-white/75" />
            </div>
          )}
        </div>

      </div>

    </div>
  );
};

export default VoiceOrb;
