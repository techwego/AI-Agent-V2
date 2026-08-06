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
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Strip markdown links, keep text
      .trim();
  }

  async speak(text, onEnd) {
    this.cancel();

    const cleanText = this.stripMarkdown(text);
    if (!cleanText) {
      if (onEnd) onEnd();
      return;
    }

    try {
      this.speaking = true;
      const token = localStorage.getItem('token') || '';
      
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ text: cleanText })
      });

      if (!response.ok) {
        throw new Error('Failed to fetch TTS audio');
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
        console.error("Audio playback error", e);
        URL.revokeObjectURL(url);
        this.cleanup();
        if (onEnd) onEnd();
      };
      
      await this.audioElement.play();
    } catch (err) {
      console.error(err);
      this.cleanup();
      if (onEnd) onEnd();
    }
  }

  cancel() {
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.currentTime = 0;
    }
    this.cleanup();
  }

  cleanup() {
    this.speaking = false;
  }

  isSpeaking() {
    return this.speaking || (this.audioElement && !this.audioElement.paused);
  }
}

const instance = new SpeechSynthesisManager();
export default instance;
