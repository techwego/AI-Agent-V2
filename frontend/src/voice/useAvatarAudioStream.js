import { useState, useEffect, useRef, useCallback } from 'react';
import ttsManager from './SpeechSynthesisManager';

// Viseme mapping for phonemes/letters
const VOWEL_VISEMES = {
  a: { mouthOpen: 0.85, mouthWide: 0.6 },
  e: { mouthOpen: 0.6, mouthWide: 0.85 },
  i: { mouthOpen: 0.45, mouthWide: 0.95 },
  o: { mouthOpen: 0.95, mouthWide: 0.35 },
  u: { mouthOpen: 0.75, mouthWide: 0.25 },
  m: { mouthOpen: 0.05, mouthWide: 0.4 },
  p: { mouthOpen: 0.05, mouthWide: 0.4 },
  b: { mouthOpen: 0.05, mouthWide: 0.4 },
  f: { mouthOpen: 0.25, mouthWide: 0.6 },
  v: { mouthOpen: 0.25, mouthWide: 0.6 },
  s: { mouthOpen: 0.3, mouthWide: 0.7 },
  t: { mouthOpen: 0.35, mouthWide: 0.65 },
  r: { mouthOpen: 0.5, mouthWide: 0.4 },
  l: { mouthOpen: 0.6, mouthWide: 0.6 },
};

/**
 * Custom hook connecting the TTS Audio Stream to the Video Avatar Lip-Sync Engine
 */
export function useAvatarAudioStream({ state = 'IDLE', onLipSyncUpdate } = {}) {
  const [isLipSyncing, setIsLipSyncing] = useState(false);
  const [viseme, setViseme] = useState({ mouthOpen: 0, mouthWide: 0.5, isBlinking: false });
  const [currentWord, setCurrentWord] = useState('');
  const [streamActive, setStreamActive] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('idle'); // 'idle' | 'connecting' | 'connected' | 'fallback'

  const targetMouthRef = useRef({ mouthOpen: 0, mouthWide: 0.5 });
  const currentMouthRef = useRef({ mouthOpen: 0, mouthWide: 0.5 });
  const animFrameRef = useRef(null);
  const blinkTimerRef = useRef(null);
  const isSpeaking = state === 'SPEAKING' || state === 'INTRODUCING';

  // Smooth animation interpolation loop for organic lip micro-movements
  useEffect(() => {
    let isMounted = true;

    const loop = () => {
      if (!isMounted) return;

      const curr = currentMouthRef.current;
      const target = targetMouthRef.current;

      // Smooth lerp
      curr.mouthOpen += (target.mouthOpen - curr.mouthOpen) * 0.35;
      curr.mouthWide += (target.mouthWide - curr.mouthWide) * 0.35;

      setViseme(prev => ({
        mouthOpen: curr.mouthOpen,
        mouthWide: curr.mouthWide,
        isBlinking: prev.isBlinking
      }));

      if (onLipSyncUpdate) {
        onLipSyncUpdate(curr);
      }

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      isMounted = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [onLipSyncUpdate]);

  // Natural spontaneous eye blinking loop for idle & conversational realism
  useEffect(() => {
    let isMounted = true;

    const scheduleNextBlink = () => {
      const delay = 2500 + Math.random() * 4000; // Blink every 2.5 - 6.5s
      blinkTimerRef.current = setTimeout(() => {
        if (!isMounted) return;
        setViseme(prev => ({ ...prev, isBlinking: true }));
        
        // Blink duration ~150ms
        setTimeout(() => {
          if (!isMounted) return;
          setViseme(prev => ({ ...prev, isBlinking: false }));
          scheduleNextBlink();
        }, 160);
      }, delay);
    };

    scheduleNextBlink();

    return () => {
      isMounted = false;
      if (blinkTimerRef.current) clearTimeout(blinkTimerRef.current);
    };
  }, []);

  // Listen to TTS boundary events from SpeechSynthesisManager
  useEffect(() => {
    let wordDecayTimeout = null;

    const unsubscribe = ttsManager.subscribeLipSync((event) => {
      if (event.type === 'start') {
        setIsLipSyncing(true);
        setConnectionStatus('connected');
      } else if (event.type === 'stop') {
        setIsLipSyncing(false);
        targetMouthRef.current = { mouthOpen: 0, mouthWide: 0.5 };
        setCurrentWord('');
      } else if (event.type === 'boundary') {
        const word = (event.word || '').toLowerCase().trim();
        setCurrentWord(word);

        // Find primary vowel or dominant consonant in current word
        let dominantChar = 'e';
        for (const char of word) {
          if (VOWEL_VISEMES[char]) {
            dominantChar = char;
            break;
          }
        }

        const targetShape = VOWEL_VISEMES[dominantChar] || { mouthOpen: 0.5, mouthWide: 0.6 };
        targetMouthRef.current = targetShape;

        if (wordDecayTimeout) clearTimeout(wordDecayTimeout);
        wordDecayTimeout = setTimeout(() => {
          targetMouthRef.current = { mouthOpen: 0.1, mouthWide: 0.5 };
        }, 140);
      }
    });

    return () => {
      unsubscribe();
      if (wordDecayTimeout) clearTimeout(wordDecayTimeout);
    };
  }, []);

  // Reset mouth when conversation state changes away from speaking
  useEffect(() => {
    if (!isSpeaking) {
      targetMouthRef.current = { mouthOpen: 0, mouthWide: 0.5 };
      setIsLipSyncing(false);
    }
  }, [isSpeaking]);

  return {
    isLipSyncing,
    viseme,
    currentWord,
    connectionStatus,
    streamActive,
    setStreamActive
  };
}

export default useAvatarAudioStream;
