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
          // Allow English (en-*), Tamil (ta-*), and installed system voices
          this.voices = available;
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
      .replace(/[\u0000-\u0008\u000B-\u001F\u007F-\u009F]/g, ' ') // Preserve Tamil \u0B80-\u0BFF and English characters cleanly
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
      'benjamin', 'mark', 'michael', 'paul', 'tom', 'alex', 'daniel', 'fred', 'brian', 'valluvar', 'kumar'
    ];
    return maleKeywords.some(m => name.includes(m) || uri.includes(m));
  }

  isFemale(v) {
    if (!v) return false;
    const name = (v.name || '').toLowerCase();
    const femaleKeywords = [
      'female', 'woman', 'girl', 'pallavi', 'neerja', 'swara', 'heera', 'priya', 
      'kavya', 'zira', 'jenny', 'aria', 'sonia', 'libby', 'natasha', 'ava', 
      'emma', 'samantha', 'victoria', 'karen', 'moira', 'tessa', 'google us english', 'saranya'
    ];
    return femaleKeywords.some(f => name.includes(f)) || !this.isMale(v);
  }

  isTamilText(text) {
    return /[\u0B80-\u0BFF]/.test(text || '');
  }

  findBestMatchingVoice(cleanText = '') {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
    
    let allVoices = [];
    try {
      allVoices = window.speechSynthesis.getVoices() || [];
    } catch (e) {}

    if (!allVoices || allVoices.length === 0) {
      allVoices = this.voices || [];
    }
    if (!allVoices || allVoices.length === 0) return null;

    let preset = (this.getVoice() || '').trim().toLowerCase();
    const isTamil = this.isTamilText(cleanText);

    // CASE A: Text is in Tamil script (\u0B80-\u0BFF)
    if (isTamil) {
      const tamilVoices = allVoices.filter(v => v.lang && v.lang.toLowerCase().startsWith('ta'));
      if (preset.includes('valluvar')) {
        const m = tamilVoices.find(v => v.name.toLowerCase().includes('valluvar'));
        if (m) return m;
      }
      if (preset.includes('saranya')) {
        const m = tamilVoices.find(v => v.name.toLowerCase().includes('saranya'));
        if (m) return m;
      }
      if (preset.includes('kumar')) {
        const m = tamilVoices.find(v => v.name.toLowerCase().includes('kumar'));
        if (m) return m;
      }
      if (preset.includes('anbu')) {
        const m = tamilVoices.find(v => v.name.toLowerCase().includes('anbu'));
        if (m) return m;
      }
      if (preset.includes('pallavi')) {
        const m = tamilVoices.find(v => v.name.toLowerCase().includes('pallavi'));
        if (m) return m;
      }
      if (preset.includes('google')) {
        const m = tamilVoices.find(v => v.name.toLowerCase().includes('google'));
        if (m) return m;
      }
      if (tamilVoices.length > 0) return tamilVoices[0];
    }

    // CASE B: Text is in English (or other Latin script)
    // Only use English voices to prevent Windows/Chromium SAPI 'synthesis-failed' rejection
    const englishVoices = allVoices.filter(v => v.lang && v.lang.toLowerCase().startsWith('en'));
    const searchPool = englishVoices.length > 0 ? englishVoices : allVoices;

    // 1. Direct Exact Match on English voices
    const exact = searchPool.find(v => (v.name && v.name.toLowerCase() === preset) || (v.voiceURI && v.voiceURI.toLowerCase() === preset));
    if (exact && !this.isMale(exact)) return exact;

    // 2. Specific Preferred Natural English Voices
    if (preset.includes('zira')) {
      const match = searchPool.find(v => v.name.toLowerCase().includes('zira') && !this.isMale(v));
      if (match) return match;
    }

    if (preset.includes('google') || preset.includes('chrome')) {
      const match = searchPool.find(v => v.name.toLowerCase().includes('google') && !this.isMale(v)) ||
                    searchPool.find(v => v.name.toLowerCase().includes('google'));
      if (match) return match;
    }

    if (preset.includes('neerja')) {
      const match = searchPool.find(v => v.name.toLowerCase().includes('neerja') && !this.isMale(v)) ||
                    searchPool.find(v => (v.lang.toLowerCase().includes('en-in') || v.lang.toLowerCase().includes('en_in')) && !this.isMale(v) && this.isFemale(v));
      if (match) return match;
    }

    if (preset.includes('heera')) {
      const match = searchPool.find(v => v.name.toLowerCase().includes('heera') && !this.isMale(v)) ||
                    searchPool.find(v => (v.lang.toLowerCase().includes('en-in') || v.lang.toLowerCase().includes('en_in')) && !this.isMale(v) && this.isFemale(v));
      if (match) return match;
    }

    if (preset.includes('pallavi')) {
      const match = searchPool.find(v => v.name.toLowerCase().includes('pallavi') && !this.isMale(v)) ||
                    searchPool.find(v => (v.lang.toLowerCase().includes('en-in') || v.lang.toLowerCase().includes('en_in')) && !this.isMale(v) && this.isFemale(v));
      if (match) return match;
    }

    if (preset.includes('swara')) {
      const match = searchPool.find(v => v.name.toLowerCase().includes('swara') && !this.isMale(v)) ||
                    searchPool.find(v => (v.lang.toLowerCase().includes('en-in') || v.lang.toLowerCase().includes('en_in')) && !this.isMale(v) && this.isFemale(v));
      if (match) return match;
    }

    if (preset.includes('kavya') || preset.includes('priya')) {
      const match = searchPool.find(v => (v.name.toLowerCase().includes('kavya') || v.name.toLowerCase().includes('priya')) && !this.isMale(v)) ||
                    searchPool.find(v => (v.lang.toLowerCase().includes('en-in') || v.lang.toLowerCase().includes('en_in')) && !this.isMale(v) && this.isFemale(v));
      if (match) return match;
    }

    if (preset.includes('jenny')) {
      const match = searchPool.find(v => v.name.toLowerCase().includes('jenny') && !this.isMale(v));
      if (match) return match;
    }

    if (preset.includes('aria')) {
      const match = searchPool.find(v => v.name.toLowerCase().includes('aria') && !this.isMale(v));
      if (match) return match;
    }

    if (preset.includes('sonia')) {
      const match = searchPool.find(v => v.name.toLowerCase().includes('sonia') && !this.isMale(v));
      if (match) return match;
    }

    if (preset.includes('libby')) {
      const match = searchPool.find(v => v.name.toLowerCase().includes('libby') && !this.isMale(v));
      if (match) return match;
    }

    if (preset.includes('natasha')) {
      const match = searchPool.find(v => v.name.toLowerCase().includes('natasha') && !this.isMale(v));
      if (match) return match;
    }

    // 3. Indian English Female Regional Fallback
    const inFemale = searchPool.find(v => 
      (v.lang.toLowerCase().includes('en-in') || v.lang.toLowerCase().includes('en_in')) &&
      !this.isMale(v) &&
      (v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('woman') || v.name.toLowerCase().includes('heera') || v.name.toLowerCase().includes('pallavi') || v.name.toLowerCase().includes('neerja') || v.name.includes('Natural') || v.name.includes('Neural'))
    );
    if (inFemale) return inFemale;

    // 4. Guaranteed Crisp Natural Female Fallback (Never Male Microsoft David)
    const pleasantFemale = searchPool.find(v => 
      !this.isMale(v) &&
      (v.name.includes('Natural') || v.name.includes('Neural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Zira') || v.name.includes('Ava') || v.name.includes('Jenny') || v.name.includes('Aria') || v.name.includes('Neerja') || v.name.includes('Heera'))
    );
    if (pleasantFemale) return pleasantFemale;

    const anyFemale = searchPool.find(v => !this.isMale(v));
    if (anyFemale) return anyFemale;

    return searchPool[0] || allVoices[0];
  }

  speakWithWebSpeech(cleanText, onEnd) {
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
      utterance.rate = 1.05; // Natural, fluent conversational tempo
      utterance.pitch = 1.0; // Warm, natural authentic tone

      const selectedVoice = this.findBestMatchingVoice(cleanText);
      if (selectedVoice) {
        utterance.voice = selectedVoice;
        utterance.lang = selectedVoice.lang || (this.isTamilText(cleanText) ? 'ta-IN' : 'en-US');
      } else {
        utterance.lang = this.isTamilText(cleanText) ? 'ta-IN' : 'en-US';
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
