class SpeechSynthesisManager {
  constructor() {
    this.audioElement = null;
    this.speaking = false;
  }

  stripMarkdown(text) {
    if (!text) return '';
    return text
      .replace(/\*\*/g, '')
      .replace(/_/g, '')
      .replace(/#/g, '')
      .replace(/<ROUTE_TO:[^>]+>/g, '')
      .replace(/<ROUTE_[^>]+>/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Strip markdown links, keep text
      .trim();
  }

  speakWithWebSpeech(cleanText, onEnd) {
    if (!('speechSynthesis' in window)) {
      console.warn('Web Speech API is not supported in this browser.');
      this.cleanup();
      if (onEnd) onEnd();
      return;
    }

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      // Try to pick a natural English voice
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(v => 
        (v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Neural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Zira') || v.name.includes('Ava')))
      ) || voices.find(v => v.lang.startsWith('en')) || voices[0];

      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      utterance.onend = () => {
        this.cleanup();
        if (onEnd) onEnd();
      };

      utterance.onerror = (e) => {
        console.warn('Web Speech error:', e);
        this.cleanup();
        if (onEnd) onEnd();
      };

      this.speaking = true;
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.error('Web Speech exception:', err);
      this.cleanup();
      if (onEnd) onEnd();
    }
  }

  async speak(text, onEnd) {
    this.cancel();

    const cleanText = this.stripMarkdown(text);
    if (!cleanText) {
      if (onEnd) onEnd();
      return;
    }

    this.speaking = true;
    const token = localStorage.getItem('token') || '';

    // Attempt backend TTS with a strict 4-second timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ text: cleanText }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`TTS API failed with status ${response.status}`);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      this.audioElement = new Audio(url);

      this.audioElement.onended = () => {
        URL.revokeObjectURL(url);
        this.cleanup();
        if (onEnd) onEnd();
      };

      this.audioElement.onerror = (e) => {
        console.warn("Audio playback error, falling back to Web Speech", e);
        URL.revokeObjectURL(url);
        this.cleanup();
        this.speakWithWebSpeech(cleanText, onEnd);
      };

      await this.audioElement.play();
    } catch (err) {
      clearTimeout(timeoutId);
      console.warn("Backend TTS failed or timed out. Falling back to browser Web Speech API.", err.message);
      // Seamless browser TTS fallback
      this.speakWithWebSpeech(cleanText, onEnd);
    }
  }

  cancel() {
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.currentTime = 0;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    this.cleanup();
  }

  cleanup() {
    this.speaking = false;
  }

  isSpeaking() {
    return this.speaking || (this.audioElement && !this.audioElement.paused) || (('speechSynthesis' in window) && window.speechSynthesis.speaking);
  }
}

const instance = new SpeechSynthesisManager();
export default instance;
