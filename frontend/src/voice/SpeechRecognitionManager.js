class SpeechRecognitionManager {
  constructor() {
    this.mediaRecorder = null;
    this.audioContext = null;
    this.analyser = null;
    this.microphone = null;
    this.stream = null;
    this.nativeRecognition = null;
    this.listening = false;
    this.audioChunks = [];
    this.checkSilenceInterval = null;
    this.maxListeningTimer = null;
    this.hasSpoken = false;
    this.transcriptionReceived = false;
    this.latestInterimText = '';
    this.FFT_SIZE = 512;
    this.transcriptionCallback = null;
    this.errorCallback = null;
    this.volumeCallback = null;
    this.interimCallback = null;
    this.silenceTimeoutCallback = null;

    this.initNativeRecognition();
  }

  // --- Whisper / WebSpeech hallucination filter ---
  isHallucination(text) {
    if (!text) return true;
    const normalized = text.toLowerCase().replace(/[^\w\s]/g, '').trim();
    return !normalized || normalized.length < 2 || [
      'thank you', 'thanks', 'thank you very much', 'thank you so much',
      'thank you for watching', 'thanks for watching', 'subtitles by',
      'you', 'bye', 'goodbye', 'please subscribe', 'subscribe', 'mbc',
      'sous-titres', 'watching', 'the end', 'amara.org', 'thank you.',
      'thank you very much.', 'thank you so much.', 'thanks.'
    ].includes(normalized);
  }

  initNativeRecognition() {
    if (typeof window === 'undefined') return;
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
            console.log('[STT] Native WebSpeech recognized final:', finalText.trim());
            this.transcriptionReceived = true;
            this.latestInterimText = '';
            this.audioChunks = [];
            const result = finalText.trim();
            this.stopListening();
            if (this.transcriptionCallback) {
              this.transcriptionCallback(result);
            }
          } else if (interimText.trim() && !this.isHallucination(interimText)) {
            this.latestInterimText = interimText.trim();
            this.hasSpoken = true;
            if (this.interimCallback) {
              this.interimCallback(this.latestInterimText);
            }
          }
        };

        this.nativeRecognition.onerror = (event) => {
          if (event.error !== 'no-speech' && event.error !== 'aborted') {
            console.warn('[STT] Native recognition note:', event.error);
          }
        };
      } catch (e) {
        console.warn('[STT] Native recognition init error:', e);
        this.nativeRecognition = null;
      }
    }
  }

  onTranscription(cb) { this.transcriptionCallback = cb; }
  onInterimTranscription(cb) { this.interimCallback = cb; }
  onSilenceTimeout(cb) { this.silenceTimeoutCallback = cb; }
  onError(cb) { this.errorCallback = cb; }
  onVolumeChange(cb) { this.volumeCallback = cb; }
  isListening() { return this.listening; }

  async startListening() {
    if (this.listening) return;
    this.transcriptionReceived = false;
    this.latestInterimText = '';
    this.audioChunks = [];
    this.hasSpoken = false;

    try {
      // 1. Acquire microphone with native hardware AGC and acoustic processing
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

      // 2. Direct MediaRecorder on hardware stream (100% reliable bytes, no WebAudio starvation)
      let mimeType = '';
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/webm')) {
        mimeType = 'audio/webm';
      }

      this.mediaRecorder = new MediaRecorder(this.stream, mimeType ? { mimeType } : {});
      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          this.audioChunks.push(e.data);
        }
      };

      this.mediaRecorder.onstop = async () => {
        if (this.transcriptionReceived) return;

        if (this.audioChunks.length === 0) {
          if (this.silenceTimeoutCallback) this.silenceTimeoutCallback();
          return;
        }

        const blob = new Blob(this.audioChunks, { type: mimeType || 'audio/webm' });
        console.log(`[STT] MediaRecorder stopped. Size: ${blob.size} bytes, hasSpoken: ${this.hasSpoken}, chunks: ${this.audioChunks.length}`);

        if (blob.size >= 1000) {
          await this.sendForTranscription(blob);
        } else {
          console.log(`[STT] Buffer below speech threshold (${blob.size} bytes), aborting upload`);
          if (this.silenceTimeoutCallback) {
            this.silenceTimeoutCallback();
          }
        }
      };

      this.mediaRecorder.start(100);
      this.listening = true;

      // 3. Web Audio analyser strictly for passive VAD (Voice Activity Detection) & Visualizer
      if (!this.audioContext || this.audioContext.state === 'closed') {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (this.audioContext.state === 'suspended') {
        try { await this.audioContext.resume(); } catch(e){}
      }

      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = this.FFT_SIZE;
      this.analyser.smoothingTimeConstant = 0.3;

      this.microphone = this.audioContext.createMediaStreamSource(this.stream);
      this.microphone.connect(this.analyser);

      // 4. Start Native Web Speech API in parallel
      if (this.nativeRecognition) {
        try {
          this.nativeRecognition.start();
          console.log('[STT] Native WebSpeech started');
        } catch (e) {
          // Fallback to MediaRecorder + Whisper
        }
      }

      this.startSilenceDetection();

      // Max listening safety window: 15s
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
      let sum = 0;
      let maxVol = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
        if (dataArray[i] > maxVol) maxVol = dataArray[i];
      }
      const avgVol = sum / dataArray.length;
      if (this.volumeCallback) this.volumeCallback(maxVol);

      // VAD Speech Activity: either peak volume > 10 or average frequency energy > 3
      if (maxVol > 10 || avgVol > 3) {
        this.hasSpoken = true;
        silenceStart = Date.now();
      } else {
        const now = Date.now();
        // End of speech: 1.8s silence after user spoke
        if (this.hasSpoken && (now - silenceStart > 1800)) {
          this.stopListening();
        }
        // No speech at all for 7s → silence timeout
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

    // If native recognition captured interim text before stop was called, use it immediately
    if (!this.transcriptionReceived && this.latestInterimText && !this.isHallucination(this.latestInterimText)) {
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
      if (text && !this.isHallucination(text)) {
        this.transcriptionReceived = true;
        console.log('[STT] Whisper transcribed successfully:', text);
        if (this.transcriptionCallback) {
          this.transcriptionCallback(text);
        }
      } else {
        console.log('[STT] Empty or silence hallucination filtered out:', text);
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
