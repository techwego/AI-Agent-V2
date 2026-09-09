class SpeechSynthesisManager {
  constructor() {
    this.audioElement = null;
    this.speaking = false;
    this.queue = [];
    this.isProcessingQueue = false;
    this.onAllFinished = null;
    this.voices = [];
    this.selectedVoiceName = localStorage.getItem('preferred_voice') || 'en-IN-Pallavi';
    this.activeUtterances = new Set();
    
    this.initVoices();
    this.lipSyncListeners = new Set();
    this.onStartSpeakingCallback = null;
  }

  onStartSpeaking(callback) {
    this.onStartSpeakingCallback = callback;
  }

  subscribeLipSync(callback) {
    this.lipSyncListeners.add(callback);
    return () => this.lipSyncListeners.delete(callback);
  }

  emitLipSyncEvent(event) {
    this.lipSyncListeners.forEach(cb => {
      try { cb(event); } catch (e) { console.error('LipSync listener error:', e); }
    });
  }

  initVoices() {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    const loadVoices = () => {
      try {
        const available = window.speechSynthesis.getVoices();
        if (available && available.length > 0) {
          // STRICT ENGLISH WHITELIST: Never allow non-English voices (ta-IN, hi-IN, etc.) to pollute synthesis
          this.voices = available.filter(v => v.lang && v.lang.toLowerCase().startsWith('en'));
        }
      } catch (e) {
        console.warn('Voice loading error:', e);
      }
    };

    loadVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
    // Eager polling on startup to ensure voices are ready before first user click
    [50, 150, 350, 700, 1500].forEach(delay => {
      setTimeout(loadVoices, delay);
    });
  }

  setVoice(voicePresetOrName) {
    if (!voicePresetOrName) return;
    this.selectedVoiceName = voicePresetOrName;
    try {
      localStorage.setItem('preferred_voice', voicePresetOrName);
      localStorage.setItem('cached_voice_preset', voicePresetOrName);
    } catch (e) {
      console.warn('LocalStorage error saving voice:', e);
    }
  }

  getVoice() {
    const saved = localStorage.getItem('cached_voice_preset') || localStorage.getItem('preferred_voice');
    if (saved) {
      this.selectedVoiceName = saved;
    }
    return this.selectedVoiceName || 'en-IN-Pallavi';
  }

  preWarm() {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
      this.initVoices();
    } catch (e) {}
  }

  expandHonorifics(text) {
    if (!text) return '';
    return text
      // Common titles with trailing dot
      .replace(/\bDr\./gi, 'Doctor')
      .replace(/\bMr\./gi, 'Mister')
      .replace(/\bMrs\./gi, 'Missus')
      .replace(/\bMs\./gi, 'Miss')
      .replace(/\bProf\./gi, 'Professor')
      .replace(/\bEr\./gi, 'Engineer')
      // Common titles without dot followed by space and name
      .replace(/\bDr\s+/gi, 'Doctor ')
      .replace(/\bMr\s+/gi, 'Mister ')
      .replace(/\bMrs\s+/gi, 'Missus ')
      .replace(/\bMs\s+/gi, 'Miss ')
      .replace(/\bProf\s+/gi, 'Professor ')
      .replace(/\bEr\s+/gi, 'Engineer ')
      // Common acronyms for smooth natural speech
      .replace(/\bOPAC\b/gi, 'O-Pack')
      .replace(/\bRFID\b/gi, 'R-F-I-D');
  }

  stripMarkdown(text) {
    if (!text) return '';
    let cleaned = text
      .replace(/\*\*/g, '')
      .replace(/_/g, '')
      .replace(/#/g, '')
      .replace(/<ROUTE_TO:[^>]+>/gi, '')
      .replace(/<ROUTE_[^>]+>/gi, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/[^\x00-\x7F]/g, ' ') // Strip non-ASCII / non-Latin characters to prevent regional language leakage
      .trim();
    return this.expandHonorifics(cleaned);
  }

  isMale(v) {
    if (!v) return false;
    const name = (v.name || '').toLowerCase();
    const uri = (v.voiceURI || '').toLowerCase();
    const maleKeywords = [
      'male', 'david', 'ravi', 'prabhat', 'george', 'guy', 'ryan', 'stefan', 
      'richard', 'oliver', 'james', 'connor', 'mitchell', 'russell', 'sean', 
      'benjamin', 'mark', 'michael', 'paul', 'tom', 'alex', 'daniel', 'fred', 'brian'
    ];
    return maleKeywords.some(m => name.includes(m) || uri.includes(m));
  }

  isFemale(v) {
    if (!v) return false;
    const name = (v.name || '').toLowerCase();
    const femaleKeywords = [
      'female', 'woman', 'girl', 'pallavi', 'neerja', 'swara', 'heera', 'priya', 
      'kavya', 'zira', 'jenny', 'aria', 'sonia', 'libby', 'natasha', 'ava', 
      'emma', 'samantha', 'victoria', 'karen', 'moira', 'tessa', 'google us english'
    ];
    return femaleKeywords.some(f => name.includes(f)) || !this.isMale(v);
  }

  findBestMatchingVoice() {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
    
    let allVoices = [];
    try {
      allVoices = window.speechSynthesis.getVoices() || [];
    } catch (e) {}

    if (!allVoices || allVoices.length === 0) {
      allVoices = this.voices || [];
    }
    if (!allVoices || allVoices.length === 0) return null;

    // STRICT ENGLISH ONLY: Exclude non-English TTS voices
    const voices = allVoices.filter(v => v.lang && v.lang.toLowerCase().startsWith('en'));
    if (voices.length === 0) return allVoices[0] || null;

    let preset = (this.getVoice() || '').trim();
    // Sanitize non-English regional language names to pallavi
    if (/[\u0B80-\u0BFF]/.test(preset) || preset.toLowerCase().includes('tamil') || preset.toLowerCase().includes('hindi')) {
      preset = 'pallavi';
    } else {
      preset = preset.toLowerCase();
    }

    // 1. Exact Name or VoiceURI Match
    const exact = voices.find(v => v.name.toLowerCase() === preset || v.voiceURI.toLowerCase() === preset);
    if (exact) return exact;

    // 2. Keyword Matches for Indian Female Admin Presets
    if (preset.includes('pallavi')) {
      const match = voices.find(v => v.name.toLowerCase().includes('pallavi')) ||
                    voices.find(v => (v.lang.toLowerCase().includes('en-in') || v.lang.toLowerCase().includes('en_in')) && !this.isMale(v) && this.isFemale(v));
      if (match) return match;
    }

    if (preset.includes('neerja')) {
      const match = voices.find(v => v.name.toLowerCase().includes('neerja')) ||
                    voices.find(v => (v.lang.toLowerCase().includes('en-in') || v.lang.toLowerCase().includes('en_in')) && !this.isMale(v) && this.isFemale(v));
      if (match) return match;
    }

    if (preset.includes('swara')) {
      const match = voices.find(v => v.name.toLowerCase().includes('swara')) ||
                    voices.find(v => (v.lang.toLowerCase().includes('en-in') || v.lang.toLowerCase().includes('en_in')) && !this.isMale(v) && this.isFemale(v));
      if (match) return match;
    }

    if (preset.includes('heera')) {
      const match = voices.find(v => v.name.toLowerCase().includes('heera')) ||
                    voices.find(v => (v.lang.toLowerCase().includes('en-in') || v.lang.toLowerCase().includes('en_in')) && !this.isMale(v) && this.isFemale(v));
      if (match) return match;
    }

    if (preset.includes('kavya') || preset.includes('priya')) {
      const match = voices.find(v => v.name.toLowerCase().includes('kavya') || v.name.toLowerCase().includes('priya')) ||
                    voices.find(v => (v.lang.toLowerCase().includes('en-in') || v.lang.toLowerCase().includes('en_in')) && !this.isMale(v) && this.isFemale(v));
      if (match) return match;
    }

    if (preset.includes('aria')) {
      const match = voices.find(v => v.name.toLowerCase().includes('aria') && !this.isMale(v));
      if (match) return match;
    }

    if (preset.includes('jenny')) {
      const match = voices.find(v => v.name.toLowerCase().includes('jenny') && !this.isMale(v));
      if (match) return match;
    }

    if (preset.includes('sonia')) {
      const match = voices.find(v => v.name.toLowerCase().includes('sonia') && !this.isMale(v));
      if (match) return match;
    }

    if (preset.includes('libby')) {
      const match = voices.find(v => v.name.toLowerCase().includes('libby') && !this.isMale(v));
      if (match) return match;
    }

    if (preset.includes('natasha')) {
      const match = voices.find(v => v.name.toLowerCase().includes('natasha') && !this.isMale(v));
      if (match) return match;
    }

    // 3. Indian English Female Regional Fallback (Strictly Reject Male e.g. Ravi)
    if (preset.includes('en-in') || preset.includes('india') || preset.includes('indian') || preset.includes('pallavi')) {
      const inFemale = voices.find(v => 
        (v.lang.toLowerCase().includes('en-in') || v.lang.toLowerCase().includes('en_in')) &&
        !this.isMale(v) &&
        (v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('woman') || v.name.toLowerCase().includes('heera') || v.name.toLowerCase().includes('pallavi') || v.name.toLowerCase().includes('neerja'))
      );
      if (inFemale) return inFemale;
    }

    // 4. US / UK English Regional Female Fallbacks
    if (preset.includes('en-gb') || preset.includes('uk')) {
      const ukVoice = voices.find(v => v.lang.toLowerCase().includes('en-gb') && !this.isMale(v));
      if (ukVoice) return ukVoice;
    }

    // 5. Pleasant Female English Voice Default (Natural / Neural / Samantha / Zira / Jenny / Aria)
    const pleasantFemale = voices.find(v => 
      v.lang.startsWith('en') && 
      !this.isMale(v) &&
      (v.name.includes('Natural') || v.name.includes('Neural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Zira') || v.name.includes('Ava') || v.name.includes('Jenny') || v.name.includes('Aria') || v.name.includes('Neerja') || v.name.includes('Heera'))
    );
    if (pleasantFemale) return pleasantFemale;

    const anyFemale = voices.find(v => v.lang.startsWith('en') && !this.isMale(v));
    if (anyFemale) return anyFemale;

    // Fallback strictly to English
    return voices.find(v => v.lang.startsWith('en')) || voices[0];
  }

  speakWithWebSpeech(cleanText, onEnd, isRetry = false) {
    if (!('speechSynthesis' in window)) {
      this.speaking = false;
      if (onEnd) onEnd();
      return;
    }

    try {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.rate = 1.08; // Natural, fluent conversational tempo (eliminates sluggish drag)
      utterance.pitch = 1.0; // Warm, natural authentic tone

      if (!isRetry) {
        const selectedVoice = this.findBestMatchingVoice();
        if (selectedVoice && selectedVoice.lang && selectedVoice.lang.toLowerCase().startsWith('en')) {
          utterance.voice = selectedVoice;
          utterance.lang = selectedVoice.lang;
        } else {
          utterance.lang = 'en-US';
        }
      } else {
        // Direct local offline voice fallback to guarantee speech playback
        utterance.voice = null;
        utterance.lang = 'en-US';
      }

      // Retain reference to prevent Chromium garbage collection of active utterance
      this.activeUtterances.add(utterance);

      let isFinished = false;
      const finish = () => {
        this.activeUtterances.delete(utterance);
        if (!isFinished) {
          isFinished = true;
          this.emitLipSyncEvent({ type: 'stop', text: cleanText });
          if (onEnd) onEnd();
        }
      };

      utterance.onstart = () => {
        this.emitLipSyncEvent({ type: 'start', text: cleanText });
        if (this.onStartSpeakingCallback) {
          try { this.onStartSpeakingCallback(); } catch (e) {}
        }
      };

      utterance.onboundary = (event) => {
        const charIndex = event.charIndex || 0;
        const word = cleanText.substring(charIndex).split(/\s+/)[0] || '';
        this.emitLipSyncEvent({
          type: 'boundary',
          charIndex,
          word,
          charLength: event.charLength || word.length,
          elapsedTime: event.elapsedTime || 0
        });
      };

      utterance.onend = finish;
      utterance.onerror = (e) => {
        this.activeUtterances.delete(utterance);
        if (e.error !== 'interrupted' && e.error !== 'canceled') {
          console.warn('Web Speech note:', e.error);
          // Auto-recover on synthesis-failed or network failure
          if (!isRetry && (e.error === 'synthesis-failed' || e.error === 'network' || e.error === 'audio-busy')) {
            console.log('[TTS] Auto-recovering with local device speech synthesizer...');
            try {
              window.speechSynthesis.cancel();
              this.speakWithWebSpeech(cleanText, onEnd, true);
              return;
            } catch (err) {
              console.warn('[TTS] Fallback error:', err);
            }
          }
        }
        finish();
      };

      this.speaking = true;
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.error('Web Speech exception:', err);
      this.emitLipSyncEvent({ type: 'stop', text: cleanText });
      if (onEnd) onEnd();
    }
  }

  enqueue(sentence) {
    const clean = this.stripMarkdown(sentence);
    if (!clean) return;
    this.queue.push(clean);
    if (!this.isProcessingQueue) {
      this.processQueue();
    }
  }

  async processQueue() {
    if (this.queue.length === 0) {
      this.isProcessingQueue = false;
      this.speaking = false;
      this.emitLipSyncEvent({ type: 'stop' });
      if (this.onAllFinished) {
        const cb = this.onAllFinished;
        this.onAllFinished = null;
        cb();
      }
      return;
    }

    this.isProcessingQueue = true;
    this.speaking = true;
    const nextSentence = this.queue.shift();

    this.speakWithWebSpeech(nextSentence, () => {
      this.processQueue();
    });
  }

  speak(text, onEnd) {
    this.cancel();
    this.onAllFinished = onEnd;

    const cleanText = this.stripMarkdown(text);
    if (!cleanText) {
      if (onEnd) onEnd();
      return;
    }

    const sentences = cleanText.match(/[^.!?\n]+[.!?\n]+|[^.!?\n]+$/g) || [cleanText];
    for (const s of sentences) {
      const trimmed = s.trim();
      if (trimmed) {
        this.queue.push(trimmed);
      }
    }

    this.processQueue();
  }

  cancel() {
    this.queue = [];
    this.isProcessingQueue = false;
    this.speaking = false;
    this.onAllFinished = null;
    this.activeUtterances.clear();
    this.emitLipSyncEvent({ type: 'stop' });

    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.currentTime = 0;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  cleanup() {
    this.cancel();
  }

  isSpeaking() {
    return this.speaking || (('speechSynthesis' in window) && window.speechSynthesis.speaking);
  }

  startStream() {
    this.cancel();
  }

  endStream(onEnd) {
    this.onAllFinished = onEnd;
    if (this.queue.length === 0 && !this.isProcessingQueue) {
      if (this.onAllFinished) {
        const cb = this.onAllFinished;
        this.onAllFinished = null;
        cb();
      }
    }
  }
}

const ttsManager = new SpeechSynthesisManager();
export default ttsManager;
