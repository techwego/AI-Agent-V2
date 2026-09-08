import React, { useRef, useEffect, useState } from 'react';
import PlasmaVoiceCore from './PlasmaVoiceCore';

const InteractiveVideoAvatar = ({ 
  state = 'IDLE', 
  onClick,
  webrtcStreamUrl = null,
  avatarProfile = 'Sam · AI Digital Human',
  size = 280
}) => {
  const videoRef = useRef(null);
  const [streamError, setStreamError] = useState(false);
  const [isWebRTCConnected, setIsWebRTCConnected] = useState(false);

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

  if (isWebRTCConnected) {
    return (
      <div 
        onClick={onClick}
        className="relative flex flex-col items-center justify-center cursor-pointer select-none py-2 group"
      >
        <div className="w-64 h-64 sm:w-80 sm:h-80 rounded-full overflow-hidden border-2 border-blue-500/40 shadow-2xl">
          <video 
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover rounded-full"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col items-center justify-center select-none py-1">
      <PlasmaVoiceCore 
        state={state}
        onClick={onClick}
        size={size}
        showBadge={true}
      />
    </div>
  );
};

export default InteractiveVideoAvatar;

