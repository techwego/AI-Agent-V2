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
    this.SILENCE_THRESHOLD = 8;
    this.FFT_SIZE = 512;
    this.transcriptionCallback = null;
    this.errorCallback = null;
    this.volumeCallback = null;
    this.silenceTimeoutCallback = null;
    this.interimCallback = null;
    this.nativeRecognition = null;

    this.initNativeRecognition();
  }

  initNativeRecognition() {
    if (typeof window === 'undefined') return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      try {
        this.nativeRecognition = new SpeechRecognition();
        this.nativeRecognition.continuous = false;
        this.nativeRecognition.interimResults = false;
        this.nativeRecognition.lang = 'en-US';

        this.nativeRecognition.onresult = (event) => {
          if (event.results && event.results[0] && event.results[0][0]) {
            const text = event.results[0][0].transcript;
            if (text && text.trim()) {
              console.log('[STT] Native WebSpeech recognized:', text.trim());
              this.transcriptionReceived = true;
              this.audioChunks = [];
              this.stopListening();
              if (this.transcriptionCallback) {
                this.transcriptionCallback(text.trim());
              }
            }
          }
        };

        this.nativeRecognition.onerror = (event) => {
          console.warn('[STT] Native speech recognition fallback:', event.error);
        };
      } catch (e) {
        this.nativeRecognition = null;
      }
    }
  }

  onTranscription(cb) { this.transcriptionCallback = cb; }
  onError(cb) { this.errorCallback = cb; }
  onVolumeChange(cb) { this.volumeCallback = cb; }
  onSilenceTimeout(cb) { this.silenceTimeoutCallback = cb; }
  onInterimTranscription(cb) { this.interimCallback = cb; }
  isListening() { return this.listening; }

  async startListening() {
    if (this.listening) return;
    this.transcriptionReceived = false;
    this.audioChunks = [];
    this.hasSpoken = false;

    try {
      if (!this.stream || !this.stream.active || !this.stream.getAudioTracks().some(t => t.readyState === 'live')) {
        if (this.stream) {
          try { this.stream.getTracks().forEach(t => t.stop()); } catch(e){}
        }
        this.stream = await navigator.mediaDevices.getUserMedia({ 
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } 
        });
        this.microphone = null;
      }
      
      const track = this.stream.getAudioTracks()[0];
      console.log('[STT] Mic ready:', track.label, '| state:', track.readyState);

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

      this.listening = true;

      // 1. Parallel MediaRecorder for server-side Whisper transcription
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
        ? 'audio/webm;codecs=opus' 
        : (MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : undefined);
      
      this.mediaRecorder = new MediaRecorder(this.stream, mimeType ? { mimeType } : {});
      this.mediaRecorder.ondataavailable = (e) => { 
        if (e.data && e.data.size > 0) this.audioChunks.push(e.data); 
      };
      
      this.mediaRecorder.onstop = async () => {
        if (!this.transcriptionReceived && this.audioChunks.length > 0) {
          const blob = new Blob(this.audioChunks, { type: mimeType || 'audio/webm' });
          console.log(`[STT] MediaRecorder stopped. Size: ${blob.size} bytes, chunks: ${this.audioChunks.length}`);
          await this.sendForTranscription(blob);
        } else if (!this.transcriptionReceived && this.audioChunks.length === 0) {
          if (this.silenceTimeoutCallback) {
            this.silenceTimeoutCallback();
          }
        }
      };
      
      this.mediaRecorder.start(100);

      // 2. Parallel Native Web Speech API for 0-latency instant results
      if (this.nativeRecognition) {
        try { 
          this.nativeRecognition.start(); 
          console.log('[STT] Native WebSpeech started');
        } catch(e) {
          // MediaRecorder fallback handles it
        }
      }

      this.startSilenceDetection();
      
      this.maxListeningTimer = setTimeout(() => { 
        if (this.listening) this.stopListening(); 
      }, 15000);

    } catch (err) {
      console.error('[STT] Microphone access error:', err);
      if (this.errorCallback) this.errorCallback('Could not access microphone. Please check permissions.');
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
      let maxVol = 0;
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) { 
        sum += dataArray[i];
        if (dataArray[i] > maxVol) maxVol = dataArray[i]; 
      }
      const avgVol = sum / dataArray.length;

      if (this.volumeCallback) this.volumeCallback(maxVol);

      if (maxVol > this.SILENCE_THRESHOLD || avgVol > 2) {
        this.hasSpoken = true;
        silenceStart = Date.now();
      } else {
        const now = Date.now();
        // End of speech detected after 1.2s silence
        if (this.hasSpoken && (now - silenceStart > 1200)) {
          this.stopListening();
        } 
        // Complete silence for 7s timeout
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
    
    if (this.nativeRecognition) {
      try { this.nativeRecognition.stop(); } catch(e){}
    }

    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try { this.mediaRecorder.stop(); } catch(e){}
    }

    if (this.volumeCallback) this.volumeCallback(0);
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
      console.log('[STT] Transcribe response:', text);

      if (text && !this.transcriptionReceived) {
        this.transcriptionReceived = true;
        if (this.transcriptionCallback) {
          this.transcriptionCallback(text);
        }
      } else if (!text && !this.transcriptionReceived) {
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

export default new SpeechRecognitionManager();
