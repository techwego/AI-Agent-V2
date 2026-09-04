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
    this.SPEECH_THRESHOLD = 22;
    this.FFT_SIZE = 512;
    this.transcriptionCallback = null;
    this.errorCallback = null;
    this.volumeCallback = null;
    this.nativeRecognition = null;
    this.latestInterimText = '';

    this.initNativeRecognition();
  }

  isHallucination(text) {
    if (!text) return true;
    const normalized = text.toLowerCase().replace(/[^\w\s]/g, '').trim();
    return !normalized || [
      'thank you', 'thanks', 'thank you very much', 'thank you so much',
      'thank you for watching', 'thanks for watching', 'subtitles by',
      'you', 'bye', 'goodbye', 'please subscribe', 'mbc', 'sous-titres'
    ].includes(normalized);
  }

  initNativeRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      try {
        this.nativeRecognition = new SpeechRecognition();
        this.nativeRecognition.continuous = true;
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

          if (finalText.trim() && !this.isHallucination(finalText)) {
            this.transcriptionReceived = true;
            this.latestInterimText = '';
            this.audioChunks = []; // Skip server upload since native transcribed it
            if (this.transcriptionCallback) {
              this.transcriptionCallback(finalText.trim());
            }
          } else if (interimText.trim() && !this.isHallucination(interimText)) {
            this.latestInterimText = interimText.trim();
            if (this.interimCallback) {
              this.interimCallback(this.latestInterimText);
            }
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
    this.latestInterimText = '';
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

        // Boost microphone gain by 2.0x so audio to Whisper is sufficiently amplified & uncorrupted
        this.gainNode = this.audioContext.createGain();
        this.gainNode.gain.value = 2.0;

        this.destination = this.audioContext.createMediaStreamDestination();

        this.microphone.connect(this.gainNode);
        this.gainNode.connect(this.analyser);
        this.gainNode.connect(this.destination);
      } else if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      this.listening = true;
      this.hasSpoken = false;

      // 1. Start parallel MediaRecorder using amplified destination stream for reliable Whisper backend fallback
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
        ? 'audio/webm;codecs=opus' 
        : (MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : undefined);
      
      const recordingStream = (this.destination && this.destination.stream) ? this.destination.stream : this.stream;
      this.mediaRecorder = new MediaRecorder(recordingStream, mimeType ? { mimeType } : {});
      this.mediaRecorder.ondataavailable = (e) => { 
        if (e.data && e.data.size > 0) this.audioChunks.push(e.data); 
      };
      this.mediaRecorder.onstop = async () => {
        // Only send to Whisper if speech was actually detected and audio is not empty/silent
        if (!this.transcriptionReceived && this.audioChunks.length > 0) {
          const blob = new Blob(this.audioChunks, { type: mimeType || 'audio/webm' });
          if (this.hasSpoken && blob.size >= 3500) {
            await this.sendForTranscription(blob);
          } else {
            console.log(`[STT] Silence/empty frame suppressed (size: ${blob.size}, hasSpoken: ${this.hasSpoken})`);
            if (this.errorCallback) {
              this.errorCallback("I didn't catch that. Please speak again.");
            }
          }
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
      }, 20000);

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

      if (maxVol > this.SPEECH_THRESHOLD) {
        this.hasSpoken = true;
        silenceStart = Date.now();
      } else {
        const now = Date.now();
        // End of speech detected after 2500ms silence
        if (this.hasSpoken && (now - silenceStart > 2500)) {
          this.stopListening();
        } 
        // Complete silence for 8s timeout
        else if (!this.hasSpoken && (now - initialSilenceStart > 8000)) {
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

    // If native speech recognition provided interim text, but hadn't finalized before stop was triggered:
    if (!this.transcriptionReceived && this.latestInterimText && this.latestInterimText.trim() && !this.isHallucination(this.latestInterimText)) {
      const captured = this.latestInterimText.trim();
      this.transcriptionReceived = true;
      this.latestInterimText = '';
      this.audioChunks = [];

      if (this.nativeRecognition) {
        try { this.nativeRecognition.stop(); } catch(e){}
      }
      if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
        try { this.mediaRecorder.stop(); } catch(e){}
      }

      if (this.transcriptionCallback) {
        this.transcriptionCallback(captured);
      }
      return;
    }

    if (this.nativeRecognition) {
      try { this.nativeRecognition.stop(); } catch(e){}
    }

    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try { this.mediaRecorder.stop(); } catch(e){}
    }
  }

  forceReset() {
    this.latestInterimText = '';
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
      if (text && !this.isHallucination(text) && this.transcriptionCallback) {
        this.transcriptionCallback(text);
      } else {
        console.log('[STT] Empty or hallucinated transcription filtered out:', text);
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
