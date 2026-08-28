class SpeechSynthesisManager {
  constructor() {
    this.audioElement = null;
    this.speaking = false;
    this.queue = [];
    this.isProcessingQueue = false;
    this.onAllFinished = null;
    this.voices = [];
    this.selectedVoiceName = localStorage.getItem('preferred_voice') || 'en-IN-Neerja';
    
    this.initVoices();
  }

  initVoices() {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    const loadVoices = () => {
      const available = window.speechSynthesis.getVoices();
      if (available && available.length > 0) {
        this.voices = available;
      }
    };

    loadVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }

  setVoice(voicePresetOrName) {
    if (!voicePresetOrName) return;
    this.selectedVoiceName = voicePresetOrName;
    try {
      localStorage.setItem('preferred_voice', voicePresetOrName);
    } catch (e) {
      console.warn('LocalStorage error saving voice:', e);
    }
  }

  getVoice() {
    const saved = localStorage.getItem('preferred_voice');
    if (saved) {
      this.selectedVoiceName = saved;
    }
    return this.selectedVoiceName;
  }

  stripMarkdown(text) {
    if (!text) return '';
    return text
      .replace(/\*\*/g, '')
      .replace(/_/g, '')
      .replace(/#/g, '')
      .replace(/<ROUTE_TO:[^>]+>/gi, '')
      .replace(/<ROUTE_[^>]+>/gi, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .trim();
  }

  findBestMatchingVoice() {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
    
    let voices = window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) {
      voices = this.voices;
    }
    if (!voices || voices.length === 0) return null;

    const preset = this.getVoice().toLowerCase();

    // 1. Direct exact name or URI match
    const exact = voices.find(v => v.name.toLowerCase() === preset || v.voiceURI.toLowerCase() === preset);
    if (exact) return exact;

    // 2. Indian Female Voice Priority Matching
    if (preset.includes('neerja') || preset.includes('in-neerja')) {
      const neerja = voices.find(v => v.name.toLowerCase().includes('neerja'));
      if (neerja) return neerja;
    }
    if (preset.includes('swara') || preset.includes('in-swara')) {
      const swara = voices.find(v => v.name.toLowerCase().includes('swara'));
      if (swara) return swara;
    }
    if (preset.includes('heera') || preset.includes('in-heera')) {
      const heera = voices.find(v => v.name.toLowerCase().includes('heera'));
      if (heera) return heera;
    }
    if (preset.includes('priya') || preset.includes('in-priya') || preset.includes('kavya')) {
      const match = voices.find(v => v.name.toLowerCase().includes('priya') || v.name.toLowerCase().includes('kavya'));
      if (match) return match;
    }

    // If any Indian voice requested (en-IN or india)
    if (preset.includes('en-in') || preset.includes('india') || preset.includes('indian')) {
      // First try any en-IN female / natural voice
      const inFemale = voices.find(v => 
        (v.lang.toLowerCase().includes('en-in') || v.lang.toLowerCase().includes('en_in')) &&
        (v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('woman') || v.name.toLowerCase().includes('neerja') || v.name.toLowerCase().includes('heera') || v.name.toLowerCase().includes('swara') || v.name.toLowerCase().includes('google') || v.name.toLowerCase().includes('natural'))
      );
      if (inFemale) return inFemale;

      // Any en-IN voice
      const anyIn = voices.find(v => v.lang.toLowerCase().includes('en-in') || v.lang.toLowerCase().includes('en_in'));
      if (anyIn) return anyIn;
    }

    // 3. Aria / Jenny / Sonia / Libby / Natasha / Samantha matches
    if (preset.includes('aria')) {
      const aria = voices.find(v => v.name.toLowerCase().includes('aria'));
      if (aria) return aria;
    }
    if (preset.includes('jenny')) {
      const jenny = voices.find(v => v.name.toLowerCase().includes('jenny'));
      if (jenny) return jenny;
    }
    if (preset.includes('sonia')) {
      const sonia = voices.find(v => v.name.toLowerCase().includes('sonia'));
      if (sonia) return sonia;
    }
    if (preset.includes('libby')) {
      const libby = voices.find(v => v.name.toLowerCase().includes('libby'));
      if (libby) return libby;
    }

    // 4. Fallback: High-Quality Female English Voice (NEVER default to male David)
    const pleasantFemale = voices.find(v => 
      v.lang.startsWith('en') && 
      (v.name.includes('Natural') || v.name.includes('Neural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Zira') || v.name.includes('Ava') || v.name.includes('Jenny') || v.name.includes('Aria') || v.name.includes('Neerja') || v.name.includes('Heera')) &&
      !v.name.toLowerCase().includes('male') && !v.name.toLowerCase().includes('david') && !v.name.toLowerCase().includes('guy') && !v.name.toLowerCase().includes('george')
    );
    if (pleasantFemale) return pleasantFemale;

    // Any English voice with female indicator
    const anyFemale = voices.find(v => v.lang.startsWith('en') && (v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('zira')));
    if (anyFemale) return anyFemale;

    return voices.find(v => v.lang.startsWith('en')) || voices[0];
  }

  speakWithWebSpeech(cleanText, onEnd) {
    if (!('speechSynthesis' in window)) {
      console.warn('Web Speech API is not supported in this browser.');
      this.speaking = false;
      if (onEnd) onEnd();
      return;
    }

    try {
      // Cancel previous utterance cleanly
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.rate = 1.0; // Clear, pleasant tempo
      utterance.pitch = 1.05; // Slightly elevated warm pitch for friendly assistant tone

      const selectedVoice = this.findBestMatchingVoice();
      if (selectedVoice) {
        utterance.voice = selectedVoice;
        utterance.lang = selectedVoice.lang || 'en-IN';
      }

      utterance.onend = () => {
        if (onEnd) onEnd();
      };

      utterance.onerror = (e) => {
        console.warn('Web Speech error:', e);
        if (onEnd) onEnd();
      };

      this.speaking = true;
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.error('Web Speech exception:', err);
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
}

const instance = new SpeechSynthesisManager();
export default instance;
