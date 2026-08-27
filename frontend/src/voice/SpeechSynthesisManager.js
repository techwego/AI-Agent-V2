class SpeechSynthesisManager {
  constructor() {
    this.audioElement = null;
    this.speaking = false;
    this.queue = [];
    this.isProcessingQueue = false;
    this.onAllFinished = null;
  }

  stripMarkdown(text) {
    if (!text) return '';
    return text
      .replace(/\*\*/g, '')
      .replace(/_/g, '')
      .replace(/#/g, '')
      .replace(/<ROUTE_TO:[^>]+>/gi, '')
      .replace(/<ROUTE_[^>]+>/gi, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Strip markdown links, keep text
      .trim();
  }

  speakWithWebSpeech(cleanText, onEnd) {
    if (!('speechSynthesis' in window)) {
      console.warn('Web Speech API is not supported in this browser.');
      this.speaking = false;
      if (onEnd) onEnd();
      return;
    }

    try {
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.rate = 1.05; // Slightly brisk, natural tempo
      utterance.pitch = 1.0;

      // Select a natural high quality English voice
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(v => 
        (v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Neural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Zira') || v.name.includes('Ava') || v.name.includes('Jenny')))
      ) || voices.find(v => v.lang.startsWith('en')) || voices[0];

      if (preferredVoice) {
        utterance.voice = preferredVoice;
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

    // Use Web Speech for instant, zero-latency sentence-by-sentence speaking
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

    // Split text into natural sentences (. ! ? or newlines)
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
