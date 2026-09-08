import React, { useEffect, useRef, useState } from 'react';
import { Mic, Volume2, Cpu, Loader2, Sparkles, Radio } from 'lucide-react';

/**
 * PlasmaVoiceCore Component
 * Renders an electric glowing plasma orb with coronal energy ripples and neon microphone.
 *
 * Supported States:
 * - 'WAITING' (or 'IDLE'): Calm, organic circulating electric blue/cyan plasma rim, breathing pulse, neon mic.
 * - 'LISTENING': High-energy reactive soundwave ripples, glowing cyan core, concentric shockwaves.
 * - 'THINKING': Fast vortex rotational swirl of indigo/cyan plasma streaks, pulsating halo.
 * - 'SPEAKING': Rhythmic acoustic frequency oscillations synchronized with voice audio playback.
 */
const PlasmaVoiceCore = ({
  state = 'WAITING',
  onStateChange,
  onClick,
  size = 200,
  interactive = true,
  showBadge = true,
  badgeText,
  className = ''
}) => {
  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);
  const [isHovered, setIsHovered] = useState(false);

  // Normalize state name for robust matching
  const normalizedState = (state || 'WAITING').toUpperCase();
  const isWaiting = normalizedState === 'WAITING' || normalizedState === 'IDLE';
  const isListening = normalizedState === 'LISTENING';
  const isThinking = normalizedState === 'THINKING' || normalizedState === 'PROCESSING' || normalizedState === 'RETRIEVING' || normalizedState === 'GENERATING';
  const isSpeaking = normalizedState === 'SPEAKING' || normalizedState === 'INTRODUCING';

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = size * 2);
    let height = (canvas.height = size * 2);
    let centerX = width / 2;
    let centerY = height / 2;
    let radius = (size * 0.78);

    let angle = 0;
    let time = 0;

    const render = () => {
      time += isThinking ? 0.045 : isListening ? 0.035 : isSpeaking ? 0.03 : 0.018;
      angle += isThinking ? 0.06 : isListening ? 0.025 : 0.012;

      ctx.clearRect(0, 0, width, height);

      // ─────────────────────────────────────────────────────────────
      // 1. Concentric Shockwave Pulses (Active in Listening & Speaking)
      // ─────────────────────────────────────────────────────────────
      if (isListening || isSpeaking) {
        const pulseCount = 3;
        for (let p = 0; p < pulseCount; p++) {
          const pPhase = (time * 1.5 + (p * Math.PI * 2) / pulseCount) % (Math.PI * 2);
          const pProgress = pPhase / (Math.PI * 2);
          const pRadius = radius + pProgress * (size * 0.28);
          const pAlpha = Math.max(0, (1 - pProgress) * (isListening ? 0.35 : 0.25));

          ctx.beginPath();
          ctx.arc(centerX, centerY, pRadius, 0, Math.PI * 2);
          ctx.strokeStyle = isListening
            ? `rgba(56, 189, 248, ${pAlpha})`
            : `rgba(168, 85, 247, ${pAlpha})`;
          ctx.lineWidth = 2.5 * (1 - pProgress * 0.5);
          ctx.stroke();
        }
      }

      // ─────────────────────────────────────────────────────────────
      // 2. Multi-Harmonic Organic Plasma Corona Rim
      // ─────────────────────────────────────────────────────────────
      const points = 180;
      const layers = [
        {
          color: isThinking ? 'rgba(99, 102, 241, ' : isListening ? 'rgba(56, 189, 248, ' : isSpeaking ? 'rgba(168, 85, 247, ' : 'rgba(59, 130, 246, ',
          blur: 14,
          lineWidth: 5.5,
          speedMult: 1.0,
          noiseScale: isListening ? 14 : isThinking ? 18 : isSpeaking ? 12 : 8,
          alpha: 0.85
        },
        {
          color: 'rgba(56, 189, 248, ',
          blur: 8,
          lineWidth: 3.5,
          speedMult: -1.3,
          noiseScale: isListening ? 10 : isThinking ? 14 : 6,
          alpha: 0.95
        },
        {
          color: 'rgba(255, 255, 255, ',
          blur: 4,
          lineWidth: 1.8,
          speedMult: 0.8,
          noiseScale: isListening ? 6 : 4,
          alpha: 0.75
        }
      ];

      layers.forEach((layer) => {
        ctx.save();
        ctx.shadowBlur = layer.blur;
        ctx.shadowColor = layer.color + '0.9)';
        ctx.strokeStyle = layer.color + layer.alpha + ')';
        ctx.lineWidth = layer.lineWidth;
        ctx.beginPath();

        for (let i = 0; i <= points; i++) {
          const theta = (i / points) * Math.PI * 2;
          
          // Organic fluid wave harmonics
          const wave1 = Math.sin(theta * 3 + time * layer.speedMult * 2.2);
          const wave2 = Math.cos(theta * 5 - time * layer.speedMult * 1.8);
          const wave3 = Math.sin(theta * 8 + time * 3.5);
          const wave4 = isListening 
            ? Math.sin(theta * 14 + time * 6.0) * 0.6 
            : isThinking 
            ? Math.cos(theta * 10 + angle * 4.0) * 0.5 
            : 0;

          const totalNoise = (wave1 * 0.45 + wave2 * 0.35 + wave3 * 0.2 + wave4) * layer.noiseScale;
          const r = radius + totalNoise;

          const x = centerX + Math.cos(theta + angle) * r;
          const y = centerY + Math.sin(theta + angle) * r;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }

        ctx.closePath();
        ctx.stroke();
        ctx.restore();
      });

      // ─────────────────────────────────────────────────────────────
      // 3. Electric Plasma Sparks / Photons Orbiting Along the Ring
      // ─────────────────────────────────────────────────────────────
      const sparkCount = isThinking ? 16 : isListening ? 12 : isSpeaking ? 10 : 6;
      for (let s = 0; s < sparkCount; s++) {
        const sTheta = angle * (isThinking ? 3.0 : 1.5) + (s * (Math.PI * 2)) / sparkCount;
        const sDist = radius + Math.sin(time * 3 + s) * (isListening ? 9 : 5);
        const sx = centerX + Math.cos(sTheta) * sDist;
        const sy = centerY + Math.sin(sTheta) * sDist;
        const sSize = (1.5 + Math.sin(time * 4 + s) * 1.0) * (isListening ? 1.4 : 1.0);

        ctx.save();
        ctx.shadowBlur = 10;
        ctx.shadowColor = 'rgba(56, 189, 248, 1)';
        ctx.fillStyle = s % 2 === 0 ? '#38bdf8' : '#ffffff';
        ctx.beginPath();
        ctx.arc(sx, sy, sSize, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [size, isWaiting, isListening, isThinking, isSpeaking]);

  // Badge Status & Styling
  const getBadgeInfo = () => {
    if (badgeText) return { label: badgeText, color: 'text-blue-300 border-blue-800/80 bg-blue-950/80', icon: Sparkles };
    if (isListening) return { label: 'Listening... Speak now', color: 'text-cyan-200 border-cyan-500/80 bg-cyan-950/90 ring-2 ring-cyan-400/40 animate-pulse', icon: Radio };
    if (isThinking) return { label: 'Thinking & Searching...', color: 'text-amber-200 border-amber-500/80 bg-amber-950/90 ring-2 ring-amber-400/40 animate-pulse', icon: Cpu };
    if (isSpeaking) return { label: 'Speaking...', color: 'text-purple-200 border-purple-500/80 bg-purple-950/90 ring-2 ring-purple-400/40', icon: Volume2 };
    return { label: 'Tap to Speak', color: 'text-blue-300 border-slate-700/80 bg-slate-900/90', icon: Mic };
  };

  const badgeInfo = getBadgeInfo();
  const BadgeIcon = badgeInfo.icon || Mic;

  return (
    <div 
      className={`relative flex flex-col items-center justify-center select-none ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Playful Interactive Frosted Glass Speech Bubble (Matching Reference Art) */}
      <div 
        className={`transition-all duration-500 transform mb-2 pointer-events-none z-30 ${
          isHovered || isListening || isSpeaking || isThinking
            ? 'opacity-100 translate-y-0 scale-100'
            : 'opacity-90 -translate-y-0.5 scale-95'
        }`}
      >
        <div className="relative px-3.5 py-1.5 rounded-2xl bg-gradient-to-r from-purple-950/80 via-indigo-950/85 to-blue-950/80 border border-purple-500/40 shadow-[0_4px_20px_rgba(168,85,247,0.35)] backdrop-blur-xl flex items-center gap-2">
          {/* Audio Soundwave Equalizer */}
          <div className="flex items-center gap-0.5 h-3.5">
            <span className="w-0.5 h-2 bg-gradient-to-t from-fuchsia-500 to-pink-300 rounded-full animate-pulse [animation-delay:-0.4s]" />
            <span className="w-0.5 h-3.5 bg-gradient-to-t from-cyan-400 to-blue-300 rounded-full animate-pulse [animation-delay:-0.2s]" />
            <span className="w-0.5 h-2.5 bg-gradient-to-t from-fuchsia-400 to-indigo-300 rounded-full animate-pulse [animation-delay:-0.3s]" />
            <span className="w-0.5 h-1.5 bg-gradient-to-t from-pink-400 to-cyan-300 rounded-full animate-pulse" />
          </div>

          <span className="text-[11px] sm:text-xs font-semibold text-purple-100 tracking-tight whitespace-nowrap">
            {isListening ? "I'm listening! Speak now... 🎙️" : isThinking ? "Thinking & searching catalog... ⚡" : isSpeaking ? "Speaking response... 🔊" : "Tap orb to speak with LibGenie 🎙️"}
          </span>

          {/* Speech Bubble Tail Arrow */}
          <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-indigo-950/90 border-r border-b border-purple-500/40 transform rotate-45" />
        </div>
      </div>

      {/* Outer Clickable Orb Sphere Container */}
      <div 
        onClick={onClick}
        style={{ width: `${size}px`, height: `${size}px` }}
        className={`relative flex items-center justify-center rounded-full transition-transform duration-300 ${
          interactive ? 'cursor-pointer active:scale-95' : ''
        } ${isHovered && interactive ? 'scale-[1.06]' : 'scale-100'}`}
      >
        {/* Deep Atmospheric Backlight Radial Halo */}
        <div 
          className={`absolute inset-0 rounded-full transition-all duration-500 pointer-events-none blur-2xl ${
            isListening
              ? 'bg-cyan-500/40 scale-130'
              : isThinking
              ? 'bg-indigo-600/40 scale-125 animate-pulse'
              : isSpeaking
              ? 'bg-fuchsia-600/40 scale-130'
              : 'bg-gradient-to-tr from-purple-600/30 to-blue-600/30 scale-115'
          }`}
        />

        {/* Real-Time HTML5 Canvas Plasma Corona */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none z-10"
        />

        {/* Central Deep Space Obsidian Core Sphere */}
        <div 
          style={{ width: `${size * 0.76}px`, height: `${size * 0.76}px` }}
          className="relative z-20 rounded-full bg-gradient-to-br from-[#060c1e] via-[#09112a] to-[#040714] border border-purple-500/40 flex items-center justify-center shadow-[inset_0_4px_25px_rgba(0,0,0,0.9),0_0_30px_rgba(168,85,247,0.3)] overflow-hidden group"
        >
          {/* Internal Volumetric Glass Sheen */}
          <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/15 to-transparent rounded-t-full pointer-events-none" />
          
          {/* Subtle Internal Rotating Energy Core */}
          <div 
            className={`absolute inset-2 rounded-full opacity-40 transition-all duration-700 pointer-events-none ${
              isThinking 
                ? 'bg-gradient-to-tr from-indigo-500 via-cyan-400 to-purple-600 animate-spin-slow' 
                : isListening 
                ? 'bg-gradient-to-tr from-cyan-400 to-blue-600 animate-pulse' 
                : isSpeaking 
                ? 'bg-gradient-to-tr from-fuchsia-500 to-indigo-600 animate-pulse' 
                : 'bg-gradient-to-tr from-purple-600/50 via-indigo-600/50 to-blue-600/50'
            }`}
          />

          {/* Glowing Center Animated LibGenie Character Mascot */}
          <div className="relative z-30 flex items-center justify-center">
            {isThinking ? (
              <div className="relative flex items-center justify-center">
                <img 
                  src="/libgenie_avatar.png"
                  alt="LibGenie AI"
                  style={{ width: `${size * 0.52}px`, height: `${size * 0.52}px` }}
                  className="object-contain drop-shadow-[0_0_25px_rgba(99,102,241,1)] animate-pulse"
                />
                <Loader2 
                  size={size * 0.65} 
                  className="absolute text-indigo-400/80 animate-spin pointer-events-none" 
                />
              </div>
            ) : (
              <div className="relative flex flex-col items-center justify-center">
                <img 
                  src="/libgenie_avatar.png"
                  alt="LibGenie AI"
                  style={{ width: `${size * 0.52}px`, height: `${size * 0.52}px` }}
                  className={`object-contain transition-all duration-300 select-none ${
                    isListening
                      ? 'drop-shadow-[0_0_28px_rgba(56,189,248,1)] scale-110 animate-bounce-subtle'
                      : isSpeaking
                      ? 'drop-shadow-[0_0_28px_rgba(217,70,239,1)] scale-110'
                      : 'drop-shadow-[0_0_20px_rgba(168,85,247,0.85)] hover:scale-110 hover:-translate-y-1'
                  }`}
                />

                {/* Acoustic Soundwave Reactive Bars (Visible in Listening & Speaking) */}
                {(isListening || isSpeaking) && (
                  <div className="absolute -bottom-2.5 flex items-center gap-1 pointer-events-none">
                    <span className="w-1 h-3.5 bg-gradient-to-t from-fuchsia-500 to-pink-300 rounded-full animate-pulse [animation-delay:-0.3s]" />
                    <span className="w-1 h-5 bg-gradient-to-t from-cyan-400 to-blue-300 rounded-full animate-pulse [animation-delay:-0.15s]" />
                    <span className="w-1 h-3 bg-gradient-to-t from-fuchsia-400 to-cyan-300 rounded-full animate-pulse" />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sleek Floating Glass State Badge */}
      {showBadge && (
        <div 
          onClick={onClick}
          className={`mt-2.5 px-4 py-1.5 rounded-full border shadow-lg backdrop-blur-xl flex items-center gap-2 text-xs font-bold font-mono transition-all duration-300 z-30 ${
            badgeInfo.color
          } ${interactive ? 'cursor-pointer hover:scale-105 active:scale-95' : ''}`}
        >
          <BadgeIcon size={13} className={isListening ? 'animate-pulse' : ''} />
          <span>{badgeInfo.label}</span>
        </div>
      )}
    </div>
  );
};

export default PlasmaVoiceCore;
