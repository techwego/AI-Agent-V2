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
    this.transcriptionReceived = false;
    this.SILENCE_THRESHOLD = 4;
    this.SPEECH_THRESHOLD = 8;
    this.FFT_SIZE = 512;
    this.transcriptionCallback = null;
    this.errorCallback = null;
    this.volumeCallback = null;
    this.interimCallback = null;
    this.silenceTimeoutCallback = null;
  }

  isHallucination(text) {
    if (!text) return true;
    const normalized = text.toLowerCase().replace(/[^\w\s]/g, '').trim();
    return !normalized || [
      'thank you', 'thanks', 'thank you very much', 'thank you so much',
      'thank you for watching', 'thanks for watching', 'subtitles by',
      'you', 'bye', 'goodbye', 'please subscribe', 'mbc', 'sous-titres',
      'watching', 'the end'
    ].includes(normalized);
  }

  onTranscription(callback) {
    this.transcriptionCallback = callback;
  }

  onInterimTranscription(callback) {
    this.interimCallback = callback;
  }

  onSilenceTimeout(callback) {
    this.silenceTimeoutCallback = callback;
  }

  onError(cb) { this.errorCallback = cb; }
  onVolumeChange(cb) { this.volumeCallback = cb; }
  isListening() { return this.listening; }

  async startListening() {
    if (this.listening) return;
    this.transcriptionReceived = false;
    this.audioChunks = [];
    this.hasSpoken = false;

    try {
      // 1. Acquire standard mic stream with native sample rate (NO sampleRate: 16000 constraint)
      if (!this.stream || !this.stream.active || !this.stream.getAudioTracks().some(t => t.readyState === 'live')) {
        if (this.stream) {
          try { this.stream.getTracks().forEach(t => t.stop()); } catch(e){}
        }
        this.stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });
        this.microphone = null;
      }

      const track = this.stream.getAudioTracks()[0];
      console.log('[STT] Mic ready:', track.label, '| state:', track.readyState);

      // 2. AudioContext for VAD Volume Metering ONLY
      if (!this.audioContext || this.audioContext.state === 'closed') {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.analyser = null;
        this.microphone = null;
      }
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      if (!this.analyser) {
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = this.FFT_SIZE;
        this.analyser.smoothingTimeConstant = 0.3;
      }

      if (!this.microphone) {
        this.microphone = this.audioContext.createMediaStreamSource(this.stream);
        const silentSink = this.audioContext.createGain();
        silentSink.gain.value = 0;
        this.microphone.connect(this.analyser);
        this.analyser.connect(silentSink);
        silentSink.connect(this.audioContext.destination);
      }

      this.listening = true;

      // 3. MediaRecorder records directly from the real hardware stream
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : (MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : undefined);

      this.mediaRecorder = new MediaRecorder(this.stream, mimeType ? { mimeType } : {});
      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          this.audioChunks.push(e.data);
        }
      };

      this.mediaRecorder.onstop = async () => {
        if (this.transcriptionReceived) return;

        const blob = new Blob(this.audioChunks, { type: mimeType || 'audio/webm' });
        console.log(`[STT] MediaRecorder stopped. Size: ${blob.size} bytes, hasSpoken: ${this.hasSpoken}, chunks: ${this.audioChunks.length}`);

        if (blob.size >= 500) {
          await this.sendForTranscription(blob);
        } else {
          console.log(`[STT] Recording too small (${blob.size} bytes), skipping`);
          if (this.errorCallback) {
            this.errorCallback("I didn't catch that. Please speak again.");
          }
        }
      };

      this.mediaRecorder.start(100);
      this.startSilenceDetection();

      // Max recording duration: 15s
      this.maxListeningTimer = setTimeout(() => {
        if (this.listening) this.stopListening();
      }, 15000);

    } catch (err) {
      console.error('Microphone access error:', err);
      if (this.errorCallback) this.errorCallback('Could not access microphone. Please check permissions.');
    }
  }

  startSilenceDetection() {
    if (!this.analyser) return;
    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    let silenceStart = Date.now();
    let initialSilenceStart = Date.now();
    let sampleCounter = 0;

    this.checkSilenceInterval = setInterval(() => {
      if (!this.analyser) return;
      this.analyser.getByteFrequencyData(dataArray);
      let maxVol = 0;
      for (let i = 0; i < dataArray.length; i++) {
        if (dataArray[i] > maxVol) maxVol = dataArray[i];
      }
      if (this.volumeCallback) this.volumeCallback(maxVol);

      sampleCounter++;
      if (sampleCounter % 10 === 0 && maxVol > 0) {
        console.log(`[STT] Live mic level: ${maxVol}`);
      }

      if (maxVol > this.SPEECH_THRESHOLD) {
        this.hasSpoken = true;
        silenceStart = Date.now();
      } else {
        const now = Date.now();
        // Stop recording after 2.5s of silence once the user has spoken
        if (this.hasSpoken && (now - silenceStart > 2500)) {
          this.stopListening();
        }
        // Stop recording after 7s if no speech was ever detected
        else if (!this.hasSpoken && (now - initialSilenceStart > 7000)) {
          this.stopListening();
          if (this.silenceTimeoutCallback) {
            this.silenceTimeoutCallback();
          }
        }
      }
    }, 100);
  }

  stopListening() {
    if (!this.listening) return;
    this.listening = false;

    if (this.checkSilenceInterval) {
      clearInterval(this.checkSilenceInterval);
      this.checkSilenceInterval = null;
    }
    if (this.maxListeningTimer) {
      clearTimeout(this.maxListeningTimer);
      this.maxListeningTimer = null;
    }

    if (this.volumeCallback) this.volumeCallback(0);

    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try { this.mediaRecorder.stop(); } catch(e){}
    }
  }

  forceReset() {
    this.stopListening();
    this.audioChunks = [];
    this.hasSpoken = false;
    this.transcriptionReceived = false;
  }

  async sendForTranscription(blob) {
    try {
      const formData = new FormData();
      formData.append('audio', blob, 'recording.webm');
      const token = localStorage.getItem('token') || '';

      const API_ROOT = import.meta.env.VITE_API_URL
        ? (import.meta.env.VITE_API_URL.endsWith('/api') ? import.meta.env.VITE_API_URL : `${import.meta.env.VITE_API_URL}/api`)
        : '/api';

      const response = await fetch(`${API_ROOT}/transcribe`, {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Transcription failed: ${response.status}`);
      }

      const data = await response.json();
      const text = (data.text || '').trim();
      if (text) {
        this.transcriptionReceived = true;
        console.log('[STT] Transcribed successfully:', text);
        if (this.transcriptionCallback) {
          this.transcriptionCallback(text);
        }
      } else {
        console.log('[STT] No transcription received');
        if (this.errorCallback) {
          this.errorCallback("I didn't catch that. Please speak again.");
        }
      }
    } catch (err) {
      console.error('Transcription API error:', err);
      if (this.errorCallback) {
        this.errorCallback('Failed to transcribe audio. Please try speaking again.');
      }
    }
  }
}

export default new SpeechRecognitionManager();
