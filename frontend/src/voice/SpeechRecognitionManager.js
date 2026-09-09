/**
 * SpeechRecognitionManager — v7.8.0
 * 
 * Restored to the proven v6.0.0 architecture that WORKS on Realtek mics:
 *   1. Pure MediaRecorder(stream) — NO Web Speech API (causes WASAPI contention)
 *   2. Always send audio to Whisper — let the SERVER decide if it's speech
 *   3. Passive AnalyserNode for VAD volume display only (no gating)
 *   4. Simple silence detection: stop recording after speech ends
 */
class SpeechRecognitionManager {
  constructor() {
    this.mediaRecorder = null;
    this.audioContext = null;
    this.analyser = null;
    this.microphone = null;
    this.stream = null;

    this.listening = false;
    this.audioChunks = [];

    this.checkSilenceInterval = null;
    this.maxListeningTimer = null;

    this.hasSpoken = false;
    this.speechFrames = 0;
    this.SILENCE_THRESHOLD = 8.0; // Distinguishes real voice from background noise & fan hum
    this.PAUSE_SILENCE_DURATION = 650; // 650ms natural pause for ultra-responsive turnaround
    this.MAX_SILENCE_TIMEOUT = 5000; // 5 seconds of initial idle silence
    this.FFT_SIZE = 512;

    // Callbacks
    this.transcriptionCallback = null;
    this.errorCallback = null;
    this.volumeCallback = null;
    this.silenceTimeoutCallback = null;
    this.interimCallback = null;
    this.speechDetectedCallback = null;
    this.speechEndedCallback = null;
    this.currentAbortController = null;
  }

  onTranscription(cb) { this.transcriptionCallback = cb; }
  onError(cb) { this.errorCallback = cb; }
  onVolumeChange(cb) { this.volumeCallback = cb; }
  onSilenceTimeout(cb) { this.silenceTimeoutCallback = cb; }
  onInterimTranscription(cb) { this.interimCallback = cb; }
  onSpeechDetected(cb) { this.speechDetectedCallback = cb; }
  onSpeechEnded(cb) { this.speechEndedCallback = cb; }
  isListening() { return this.listening; }

  async preWarmMic() {
    try {
      if (!this.stream || !this.stream.active || !this.stream.getAudioTracks().some(t => t.readyState === 'live')) {
        this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }
      if (!this.audioContext || this.audioContext.state === 'closed') {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = this.FFT_SIZE;
        this.microphone = this.audioContext.createMediaStreamSource(this.stream);
        this.microphone.connect(this.analyser);
      }
    } catch (e) {
      // Permission not yet granted, will prompt on first click
    }
  }

  async startListening() {
    if (this.listening) return;

    this.audioChunks = [];
    this.hasSpoken = false;
    this.speechFrames = 0;

    try {
      // Reuse existing stream if still active, otherwise get new one
      if (!this.stream || !this.stream.active || !this.stream.getAudioTracks().some(t => t.readyState === 'live')) {
        if (this.stream) {
          try { this.stream.getTracks().forEach(t => t.stop()); } catch(e){}
        }
        this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }

      const track = this.stream.getAudioTracks()[0];
      console.log('[STT] Mic ready:', track?.label, '| state:', track?.readyState);

      // Setup Web Audio API for VAD visualization
      if (!this.audioContext || this.audioContext.state === 'closed') {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = this.FFT_SIZE;
        this.microphone = this.audioContext.createMediaStreamSource(this.stream);
        this.microphone.connect(this.analyser);
      } else if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      // Setup MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : undefined;

      this.mediaRecorder = new MediaRecorder(this.stream, mimeType ? { mimeType } : {});

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = async () => {
        // Send to Whisper ONLY if real speech was confirmed and audio contains sufficient data
        if (this.audioChunks.length > 0 && this.hasSpoken) {
          const audioBlob = new Blob(this.audioChunks, { type: mimeType || 'audio/webm' });
          if (audioBlob.size >= 3500) {
            console.log(`[STT] MediaRecorder stopped. Size: ${audioBlob.size} bytes, hasSpoken: ${this.hasSpoken}, chunks: ${this.audioChunks.length}`);
            await this.sendForTranscription(audioBlob);
            return;
          }
        }
        
        console.log(`[STT] MediaRecorder stopped. No speech detected or audio below threshold. Dropped.`);
        if (this.silenceTimeoutCallback) {
          this.silenceTimeoutCallback();
        }
      };

      this.mediaRecorder.start(100); // collect data every 100ms
      this.listening = true;

      this.startSilenceDetection();

      // Safety timeout: 15 seconds max listening
      this.maxListeningTimer = setTimeout(() => {
        if (this.listening) {
          console.warn('[STT] Safety timeout: 15s max listening reached');
          this.stopListening();
        }
      }, 15000);

    } catch (err) {
      console.error('[STT] Microphone access error:', err);
      if (this.errorCallback) {
        this.errorCallback('Could not access microphone. Please check permissions.');
      }
    }
  }

  startSilenceDetection() {
    if (!this.analyser) return;
    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    let silenceStart = Date.now();
    let initialSilenceStart = Date.now();

    this.checkSilenceInterval = setInterval(() => {
      if (!this.analyser || !this.listening) return;
      this.analyser.getByteFrequencyData(dataArray);

      // Calculate max volume
      let maxVolume = 0;
      for (let i = 0; i < dataArray.length; i++) {
        if (dataArray[i] > maxVolume) {
          maxVolume = dataArray[i];
        }
      }

      // Notify volume for orb animation
      if (this.volumeCallback) {
        this.volumeCallback(maxVolume);
      }

      if (maxVolume > this.SILENCE_THRESHOLD) {
        this.speechFrames += 1;
        // Require at least 2 consecutive speech frames (200ms) to confirm genuine speech
        if (this.speechFrames >= 2) {
          if (!this.hasSpoken) {
            this.hasSpoken = true;
            if (this.speechDetectedCallback) {
              this.speechDetectedCallback();
            }
          }
          silenceStart = Date.now(); // Reset silence timer
        }
      } else {
        this.speechFrames = Math.max(0, this.speechFrames - 1);
        const now = Date.now();
        // End of speech: 650ms natural conversational pause after real speech
        if (this.hasSpoken && (now - silenceStart > this.PAUSE_SILENCE_DURATION)) {
          if (this.speechEndedCallback) {
            this.speechEndedCallback();
          }
          this.stopListening();
        }
        // Complete silence: 5 seconds with no speech at all
        else if (!this.hasSpoken && (now - initialSilenceStart > this.MAX_SILENCE_TIMEOUT)) {
          this.stopListening();
        }
      }
    }, 100);
  }

  stopListening() {
    if (!this.listening) return;
    this.listening = false;

    // Clear intervals and timers
    if (this.checkSilenceInterval) {
      clearInterval(this.checkSilenceInterval);
      this.checkSilenceInterval = null;
    }
    if (this.maxListeningTimer) {
      clearTimeout(this.maxListeningTimer);
      this.maxListeningTimer = null;
    }

    // Stop recording
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try { this.mediaRecorder.stop(); } catch(e){}
    }

    // Suspend audio context (keep stream alive for instant reuse — v6.0.0 approach)
    if (this.audioContext && this.audioContext.state === 'running') {
      this.audioContext.suspend();
    }

    // Reset volume
    if (this.volumeCallback) {
      this.volumeCallback(0);
    }
  }

  cancelTranscription() {
    if (this.currentAbortController) {
      try { this.currentAbortController.abort(); } catch(e){}
      this.currentAbortController = null;
    }
  }

  forceReset() {
    this.cancelTranscription();
    this.stopListening();
    this.audioChunks = [];
    this.hasSpoken = false;
  }

  async sendForTranscription(blob) {
    try {
      this.cancelTranscription();
      this.currentAbortController = new AbortController();

      if (this.speechEndedCallback) {
        this.speechEndedCallback();
      }

      const formData = new FormData();
      formData.append('audio', blob, 'recording.webm');

      const token = localStorage.getItem('token') || '';

      const API_ROOT = import.meta.env.VITE_API_URL
        ? (import.meta.env.VITE_API_URL.endsWith('/api') ? import.meta.env.VITE_API_URL : `${import.meta.env.VITE_API_URL}/api`)
        : '/api';

      const response = await fetch(`${API_ROOT}/transcribe`, {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        body: formData,
        signal: this.currentAbortController.signal
      });

      this.currentAbortController = null;

      if (!response.ok) {
        throw new Error(`Transcription failed: ${response.status}`);
      }

      const data = await response.json();
      const text = (data.text || '').trim();
      console.log('[STT] Transcribed text:', JSON.stringify(text));

      // Pass result to callback — let VoiceAssistant handle empty text
      if (this.transcriptionCallback) {
        this.transcriptionCallback(text);
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        console.log('[STT] Transcription request aborted.');
        return;
      }
      console.error('[STT] Transcription API error:', err);
      if (this.errorCallback) {
        this.errorCallback('Failed to transcribe audio. Please try speaking again.');
      }
    }
  }
}

const instance = new SpeechRecognitionManager();
export default instance;
