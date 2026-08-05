class SpeechSynthesisManager {
  constructor() {
    this.synth = window.speechSynthesis;
    this.voices = [];
    this.selectedVoice = null;
    this.speaking = false;
    this.resumeInterval = null;

    if (this.synth) {
      // Load voices when they are ready
      if (this.synth.onvoiceschanged !== undefined) {
        this.synth.onvoiceschanged = () => {
          this.loadVoices();
        };
      }
      this.loadVoices(); // Initial load if already available
    }
  }

  loadVoices() {
    this.voices = this.synth.getVoices();
    this.selectBestVoice();
  }

  selectBestVoice() {
    if (!this.voices.length) return;

    // Priority: Google UK English Female > Google en-US female > Samantha > Zira > en-US female > en-US > default
    const findVoice = (condition) => this.voices.find(condition);

    this.selectedVoice = 
      findVoice(v => v.name === 'Google UK English Female') ||
      findVoice(v => v.name.includes('Google') && v.lang === 'en-US' && v.name.toLowerCase().includes('female')) ||
      findVoice(v => v.name === 'Samantha') ||
      findVoice(v => v.name === 'Microsoft Zira - English (United States)') ||
      findVoice(v => v.lang === 'en-US' && v.name.toLowerCase().includes('female')) ||
      findVoice(v => v.lang === 'en-US') ||
      this.voices[0];
  }

  stripMarkdown(text) {
    if (!text) return '';
    return text
      .replace(/\*\*/g, '')
      .replace(/_/g, '')
      .replace(/#/g, '')
      .replace(/<ROUTE_TO:[^>]+>/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Strip markdown links, keep text
      .trim();
  }

  speak(text, onEnd) {
    if (!this.synth) {
      console.error('Speech synthesis not supported in this browser.');
      if (onEnd) onEnd();
      return;
    }

    this.cancel();

    const cleanText = this.stripMarkdown(text);
    if (!cleanText) {
      if (onEnd) onEnd();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(cleanText);
    if (this.selectedVoice) {
      utterance.voice = this.selectedVoice;
    }
    
    utterance.rate = 1.1;
    utterance.pitch = 1.0;

    utterance.onstart = () => {
      this.speaking = true;
      // Handle Chrome bug where long speech pauses after 15s
      this.resumeInterval = setInterval(() => {
        if (this.synth.speaking && !this.synth.paused) {
          this.synth.resume();
        }
      }, 14000);
    };

    utterance.onend = () => {
      this.cleanup();
      if (onEnd) onEnd();
    };

    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event.error);
      this.cleanup();
      if (onEnd) onEnd();
    };

    this.synth.speak(utterance);
  }

  cancel() {
    if (this.synth && this.speaking) {
      this.synth.cancel();
      this.cleanup();
    }
  }

  cleanup() {
    this.speaking = false;
    if (this.resumeInterval) {
      clearInterval(this.resumeInterval);
      this.resumeInterval = null;
    }
  }

  isSpeaking() {
    return this.speaking || (this.synth && this.synth.speaking);
  }
}

const instance = new SpeechSynthesisManager();
export default instance;
