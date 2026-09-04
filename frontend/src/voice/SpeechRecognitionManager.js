class SpeechRecognitionManager {
  constructor() {
    this.mediaRecorder = null;
    this.audioContext = null;
    this.analyser = null;
    this.microphone = null;
    this.stream = null;
    
    this.listening = false;
    this.audioChunks = [];
    
    this.maxListeningTimer = null;
    this.checkSilenceInterval = null;
    
    this.hasSpoken = false;
    this.SILENCE_THRESHOLD = 10;
    this.FFT_SIZE = 512;
    
    // Callbacks
    this.transcriptionCallback = null;
    this.errorCallback = null;
    this.volumeCallback = null;
    this.silenceTimeoutCallback = null;
    this.interimCallback = null;
  }

  onTranscription(callback) {
    this.transcriptionCallback = callback;
  }

  onError(callback) {
    this.errorCallback = callback;
  }

  onVolumeChange(callback) {
    this.volumeCallback = callback;
  }

  onSilenceTimeout(callback) {
    this.silenceTimeoutCallback = callback;
  }

  onInterimTranscription(callback) {
    this.interimCallback = callback;
  }

  isListening() {
    return this.listening;
  }

  async startListening() {
    if (this.listening) return;

    try {
      // 1. Acquire standard microphone stream (identical to v6.0.0)
      if (!this.stream || !this.stream.active || !this.stream.getAudioTracks().some(t => t.readyState === 'live')) {
        if (this.stream) {
          try { this.stream.getTracks().forEach(t => t.stop()); } catch(e){}
        }
        this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        this.microphone = null;
      }

      const track = this.stream.getAudioTracks()[0];
      console.log('[STT] Mic ready:', track.label, '| state:', track.readyState);

      // 2. Setup Web Audio API for VAD & 3D Orb soundwave animation
      if (!this.audioContext || this.audioContext.state === 'closed') {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (this.audioContext.state === 'suspended') {
        try { await this.audioContext.resume(); } catch(e){}
      }

      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = this.FFT_SIZE;
      this.microphone = this.audioContext.createMediaStreamSource(this.stream);
      this.microphone.connect(this.analyser);

      // 3. Setup MediaRecorder directly on microphone stream
      this.audioChunks = [];
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
        ? 'audio/webm;codecs=opus' 
        : (MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : undefined);
      
      this.mediaRecorder = new MediaRecorder(this.stream, mimeType ? { mimeType } : {});
      
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = async () => {
        if (this.audioChunks.length > 0) {
          const audioBlob = new Blob(this.audioChunks, { type: mimeType || 'audio/webm' });
          console.log(`[STT] MediaRecorder stopped. Size: ${audioBlob.size} bytes, chunks: ${this.audioChunks.length}`);
          await this.sendForTranscription(audioBlob);
        } else {
          if (this.silenceTimeoutCallback) {
            this.silenceTimeoutCallback();
          }
        }
      };

      this.mediaRecorder.start(100);
      this.listening = true;
      this.hasSpoken = false;

      this.startSilenceDetection();
      
      // Safety timeout: 15s max listening
      this.maxListeningTimer = setTimeout(() => {
        if (this.listening) {
          console.warn('[STT] Safety timeout: auto stopping listening');
          this.stopListening();
        }
      }, 15000);

    } catch (err) {
      console.error('[STT] Error starting microphone:', err);
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
      if (!this.analyser) return;
      this.analyser.getByteFrequencyData(dataArray);
      
      // Calculate peak volume & average energy
      let maxVolume = 0;
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
        if (dataArray[i] > maxVolume) {
          maxVolume = dataArray[i];
        }
      }
      const avgVolume = sum / dataArray.length;

      // Notify volume for orb visualizer
      if (this.volumeCallback) {
        this.volumeCallback(maxVolume);
      }

      if (maxVolume > this.SILENCE_THRESHOLD || avgVolume > 3) {
        this.hasSpoken = true;
        silenceStart = Date.now();
      } else {
        const now = Date.now();
        // End of speech: 1.5s silence after user spoke
        if (this.hasSpoken && (now - silenceStart > 1500)) {
          this.stopListening();
        } 
        // Complete silence for 7s
        else if (!this.hasSpoken && (now - initialSilenceStart > 7000)) {
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
      this.mediaRecorder.stop();
    }

    // Reset volume
    if (this.volumeCallback) {
      this.volumeCallback(0);
    }
  }

  forceReset() {
    this.stopListening();
    this.audioChunks = [];
    this.hasSpoken = false;
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
        throw new Error(`Transcription failed with status ${response.status}`);
      }

      const data = await response.json();
      const text = (data.text || '').trim();
      
      console.log('[STT] Transcribed text:', text);

      if (text && text.length > 0) {
        if (this.transcriptionCallback) {
          this.transcriptionCallback(text);
        }
      } else {
        if (this.silenceTimeoutCallback) {
          this.silenceTimeoutCallback();
        }
      }
      
    } catch (err) {
      console.error('[STT] Transcription API error:', err);
      if (this.errorCallback) {
        this.errorCallback('Failed to transcribe audio. Please try speaking again.');
      }
    }
  }
}

const instance = new SpeechRecognitionManager();
export default instance;
