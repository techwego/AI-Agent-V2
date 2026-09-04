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
    this.SILENCE_THRESHOLD = 15;
    this.FFT_SIZE = 512;
    this.transcriptionCallback = null;
    this.errorCallback = null;
    this.volumeCallback = null;
    this.nativeRecognition = null;

    this.initNativeRecognition();
  }

  initNativeRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      try {
        this.nativeRecognition = new SpeechRecognition();
        this.nativeRecognition.continuous = false;
        this.nativeRecognition.interimResults = true;
        this.nativeRecognition.lang = 'en-US';

        this.nativeRecognition.onresult = (event) => {
          let interimText = '';
          let finalText = '';

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalText += event.results[i][0].transcript;
            } else {
              interimText += event.results[i][0].transcript;
            }
          }

          if (finalText.trim()) {
            this.transcriptionReceived = true;
            this.audioChunks = []; // Skip server upload since native transcribed it
            if (this.transcriptionCallback) {
              this.transcriptionCallback(finalText.trim());
            }
          } else if (interimText.trim() && this.interimCallback) {
            this.interimCallback(interimText.trim());
          }
        };

        this.nativeRecognition.onerror = (event) => {
          // Native recognition failed, MediaRecorder fallback will handle transcription seamlessly
          console.warn('Native speech recognition note:', event.error);
        };
      } catch (e) {
        this.nativeRecognition = null;
      }
    }
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

    try {
      if (!this.stream || !this.stream.active) {
        this.stream = await navigator.mediaDevices.getUserMedia({ 
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } 
        });
      }
      
      if (!this.audioContext || this.audioContext.state === 'closed') {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = this.FFT_SIZE;
        this.microphone = this.audioContext.createMediaStreamSource(this.stream);
        this.microphone.connect(this.analyser);
      } else if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      this.listening = true;
      this.hasSpoken = false;

      // 1. Start parallel MediaRecorder for reliable Whisper backend fallback
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
        ? 'audio/webm;codecs=opus' 
        : (MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : undefined);
      
      this.mediaRecorder = new MediaRecorder(this.stream, mimeType ? { mimeType } : {});
      this.mediaRecorder.ondataavailable = (e) => { 
        if (e.data && e.data.size > 0) this.audioChunks.push(e.data); 
      };
      this.mediaRecorder.onstop = async () => {
        // If native recognition didn't already transcribe, send audio to backend
        if (!this.transcriptionReceived && this.audioChunks.length > 0 && this.hasSpoken) {
          const blob = new Blob(this.audioChunks, { type: mimeType || 'audio/webm' });
          await this.sendForTranscription(blob);
        }
      };
      this.mediaRecorder.start(100);

      // 2. Start native Web Speech API in parallel for instant 0-latency results
      if (this.nativeRecognition) {
        try { 
          this.nativeRecognition.start(); 
        } catch(e) {
          // If already running or permission issue, fallback to MediaRecorder handles it
        }
      }

      this.startSilenceDetection();
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

    this.checkSilenceInterval = setInterval(() => {
      if (!this.analyser) return;
      this.analyser.getByteFrequencyData(dataArray);
      let maxVol = 0;
      for (let i = 0; i < dataArray.length; i++) { 
        if (dataArray[i] > maxVol) maxVol = dataArray[i]; 
      }
      if (this.volumeCallback) this.volumeCallback(maxVol);

      if (maxVol > this.SILENCE_THRESHOLD) {
        this.hasSpoken = true;
        silenceStart = Date.now();
      } else {
        const now = Date.now();
        // End of speech detected after 2000ms silence
        if (this.hasSpoken && (now - silenceStart > 2000)) {
          this.stopListening();
        } 
        // Complete silence for 5s timeout
        else if (!this.hasSpoken && (now - initialSilenceStart > 5000)) {
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

    // Don't suspend audioContext — we reuse it for the continuous conversational loop

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
      if (text && this.transcriptionCallback) {
        this.transcriptionCallback(text);
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
