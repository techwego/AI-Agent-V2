import React, { useRef, useEffect, useState, useMemo } from 'react';
import { Mic, Loader2, Volume2, Radio, Video, Sparkles } from 'lucide-react';
import useAvatarAudioStream from '../voice/useAvatarAudioStream';

const InteractiveVideoAvatar = ({ 
  state = 'IDLE', 
  onClick,
  webrtcStreamUrl = null,
  avatarProfile = 'Sam · AI Digital Human'
}) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
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

  // High-Definition Neural 3D Digital Human Avatar Canvas Renderer
  useEffect(() => {
    if (isWebRTCConnected) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId;
    let t = 0;

    const render = () => {
      t += 0.03;
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      // 1. Soft Studio Ambient Gradient Backdrop
      const bgGrad = ctx.createRadialGradient(w / 2, h / 2 - 20, 30, w / 2, h / 2, w / 2);
      if (isListening) {
        bgGrad.addColorStop(0, '#e0f2fe');
        bgGrad.addColorStop(1, '#bae6fd');
      } else if (isSpeaking) {
        bgGrad.addColorStop(0, '#ede9fe');
        bgGrad.addColorStop(1, '#ddd6fe');
      } else if (isProcessing) {
        bgGrad.addColorStop(0, '#fef3c7');
        bgGrad.addColorStop(1, '#fde68a');
      } else {
        bgGrad.addColorStop(0, '#f8fafc');
        bgGrad.addColorStop(1, '#e2e8f0');
      }
      ctx.fillStyle = bgGrad;
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, w / 2 - 4, 0, Math.PI * 2);
      ctx.fill();

      // Breathing & idle micro-sway kinematics
      const breathing = Math.sin(t * 1.5) * 2;
      const headTilt = Math.sin(t * 0.8) * 1.5;
      const eyeBlink = viseme.isBlinking ? 0.08 : 1.0;
      const mouthOpenAmount = Math.max(0.04, isSpeaking ? viseme.mouthOpen * 16 : 1);
      const mouthWidthAmount = isSpeaking ? (viseme.mouthWide || 0.5) * 14 : 10;

      ctx.save();
      ctx.translate(w / 2 + headTilt * 0.3, h / 2 + 10 + breathing);

      // 2. Corporate Attire / Shoulders (Anna University AI Assistant)
      ctx.fillStyle = '#1e293b'; // Navy corporate blazer
      ctx.beginPath();
      ctx.ellipse(0, 85, 76, 45, 0, 0, Math.PI * 2);
      ctx.fill();

      // Shirt Collar & Blue Tie / Scarf Accent
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(-18, 52);
      ctx.lineTo(18, 52);
      ctx.lineTo(0, 82);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#2563eb'; // Brand Royal Blue Tie/Badge
      ctx.beginPath();
      ctx.moveTo(-6, 56);
      ctx.lineTo(6, 56);
      ctx.lineTo(9, 78);
      ctx.lineTo(0, 86);
      ctx.lineTo(-9, 78);
      ctx.closePath();
      ctx.fill();

      // 3. Neck & Shadow
      ctx.fillStyle = '#f1c29e';
      ctx.fillRect(-14, 30, 28, 26);
      ctx.fillStyle = 'rgba(0,0,0,0.08)';
      ctx.beginPath();
      ctx.ellipse(0, 34, 15, 6, 0, 0, Math.PI * 2);
      ctx.fill();

      // 4. Photorealistic Head & Skin Tone
      ctx.fillStyle = '#fad5b8';
      ctx.beginPath();
      ctx.ellipse(0, -6, 44, 52, 0, 0, Math.PI * 2);
      ctx.fill();

      // Soft Cheek Blush / Warm Lighting
      const blushGrad = ctx.createRadialGradient(-20, 2, 2, -20, 2, 14);
      blushGrad.addColorStop(0, 'rgba(244, 63, 94, 0.15)');
      blushGrad.addColorStop(1, 'rgba(244, 63, 94, 0)');
      ctx.fillStyle = blushGrad;
      ctx.beginPath();
      ctx.arc(-20, 2, 14, 0, Math.PI * 2);
      ctx.fill();

      const blushGradR = ctx.createRadialGradient(20, 2, 2, 20, 2, 14);
      blushGradR.addColorStop(0, 'rgba(244, 63, 94, 0.15)');
      blushGradR.addColorStop(1, 'rgba(244, 63, 94, 0)');
      ctx.fillStyle = blushGradR;
      ctx.beginPath();
      ctx.arc(20, 2, 14, 0, Math.PI * 2);
      ctx.fill();

      // 5. Professional Hairstyling (Modern Clean Volume)
      ctx.fillStyle = '#2c1810'; // Rich Espresso Brown
      ctx.beginPath();
      ctx.arc(0, -22, 47, Math.PI * 0.85, Math.PI * 2.15);
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(-45, -10);
      ctx.quadraticCurveTo(-48, 25, -34, 45);
      ctx.quadraticCurveTo(-38, 10, -42, -10);
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(45, -10);
      ctx.quadraticCurveTo(48, 25, 34, 45);
      ctx.quadraticCurveTo(38, 10, 42, -10);
      ctx.fill();

      // Modern Side Parting / Hair Swoop
      ctx.beginPath();
      ctx.moveTo(-44, -20);
      ctx.quadraticCurveTo(0, -44, 44, -18);
      ctx.quadraticCurveTo(15, -30, -35, -15);
      ctx.fill();

      // 6. Natural Expressive Eyes (with Blinking and Micro-Gaze Saccades)
      const gazeX = Math.sin(t * 0.4) * 1.5;
      const eyeY = -8;

      // Left Eye
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(-16, eyeY, 8, 5 * eyeBlink, 0, 0, Math.PI * 2);
      ctx.fill();

      if (eyeBlink > 0.3) {
        // Iris (Deep Hazel Brown with Specular Light)
        ctx.fillStyle = '#451a03';
        ctx.beginPath();
        ctx.arc(-16 + gazeX, eyeY, 3.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(-16 + gazeX, eyeY, 2.2, 0, Math.PI * 2);
        ctx.fill();
        // Catchlight Specular Reflections
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(-17 + gazeX, eyeY - 1.5, 1.2, 0, Math.PI * 2);
        ctx.fill();
      }

      // Right Eye
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(16, eyeY, 8, 5 * eyeBlink, 0, 0, Math.PI * 2);
      ctx.fill();

      if (eyeBlink > 0.3) {
        ctx.fillStyle = '#451a03';
        ctx.beginPath();
        ctx.arc(16 + gazeX, eyeY, 3.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(16 + gazeX, eyeY, 2.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(15 + gazeX, eyeY - 1.5, 1.2, 0, Math.PI * 2);
        ctx.fill();
      }

      // Eyebrows
      ctx.strokeStyle = '#2c1810';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.arc(-16, -17 + (isListening ? -1.5 : 0), 10, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(16, -17 + (isListening ? -1.5 : 0), 10, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();

      // 7. Refined Nose Bridge & Tip
      ctx.strokeStyle = 'rgba(180, 83, 9, 0.28)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(0, -6);
      ctx.lineTo(0, 8);
      ctx.lineTo(3.5, 11);
      ctx.stroke();

      // 8. Audio-Driven Real-Time Lip-Sync Mouth Rendering
      ctx.fillStyle = '#be123c'; // Rose Red Lip Base
      ctx.strokeStyle = '#881337';
      ctx.lineWidth = 1.2;

      const mouthY = 22;
      ctx.beginPath();
      // Outer Lips
      ctx.ellipse(0, mouthY, mouthWidthAmount, mouthOpenAmount + 3.5, 0, 0, Math.PI * 2);
      ctx.fill();

      if (isSpeaking && mouthOpenAmount > 3) {
        // Inner Mouth Cavity
        ctx.fillStyle = '#4c0519';
        ctx.beginPath();
        ctx.ellipse(0, mouthY + 0.5, mouthWidthAmount * 0.75, mouthOpenAmount * 0.75, 0, 0, Math.PI * 2);
        ctx.fill();

        // Upper Teeth
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-mouthWidthAmount * 0.45, mouthY - mouthOpenAmount * 0.5, mouthWidthAmount * 0.9, 2.8);
      } else {
        // Gentle Natural Smile Curve
        ctx.strokeStyle = '#881337';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.arc(0, mouthY - 4, 11, Math.PI * 0.2, Math.PI * 0.8);
        ctx.stroke();
      }

      ctx.restore();
      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [isWebRTCConnected, isListening, isSpeaking, isProcessing, viseme]);

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
            ? 'bg-gradient-to-b from-cyan-50/70 to-blue-50/50 border-cyan-300/80 shadow-2xl shadow-cyan-500/20 ring-4 ring-cyan-400/20' 
            : isSpeaking 
              ? 'bg-gradient-to-b from-indigo-50/70 to-purple-50/50 border-indigo-300/80 shadow-2xl shadow-indigo-500/20 ring-4 ring-indigo-400/20' 
              : isProcessing 
                ? 'bg-gradient-to-b from-amber-50/70 to-orange-50/50 border-amber-300/80 shadow-2xl shadow-amber-500/20 ring-4 ring-amber-400/20' 
                : 'bg-gradient-to-b from-white/90 to-blue-50/40 border-slate-200/90 shadow-xl shadow-blue-900/10 group-hover:border-blue-300 group-hover:shadow-2xl group-hover:shadow-blue-500/20'
        }`}>
          
          {/* Specular Inner Glass Highlights */}
          <div className="absolute inset-1 rounded-full border border-white/70 pointer-events-none z-20" />
          <div className="absolute top-1 left-6 right-6 h-10 rounded-full bg-gradient-to-b from-white/70 to-transparent pointer-events-none z-20" />

          {/* WebRTC Video Stream Player (Simli / HeyGen / Tavus) OR Neural 3D Digital Human Canvas */}
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
              <canvas
                ref={canvasRef}
                width={240}
                height={240}
                className="w-full h-full object-cover rounded-full pointer-events-none"
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

