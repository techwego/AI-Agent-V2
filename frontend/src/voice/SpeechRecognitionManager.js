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
    this.SILENCE_THRESHOLD = 5;
    this.SPEECH_THRESHOLD = 8;
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
      // ── 1. Always get a FRESH mic stream every turn ──
      // This avoids stale/ended tracks from previous sessions
      if (this.stream) {
        this.stream.getTracks().forEach(t => t.stop());
        this.stream = null;
      }
      // Tear down old audio graph nodes that reference the old stream
      if (this.microphone) {
        try { this.microphone.disconnect(); } catch(e){}
        this.microphone = null;
      }

      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: false,   // false: let Whisper hear the raw voice
          autoGainControl: true,
          sampleRate: 16000
        }
      });

      // Verify we got a live track
      const track = this.stream.getAudioTracks()[0];
      if (!track || track.readyState !== 'live') {
        throw new Error('Mic track is not live');
      }
      console.log('[STT] Mic track acquired:', track.label, 'state:', track.readyState, 'enabled:', track.enabled);

      // ── 2. AudioContext for VAD analysis ONLY (not for recording) ──
      if (!this.audioContext || this.audioContext.state === 'closed') {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = this.FFT_SIZE;
      this.analyser.smoothingTimeConstant = 0.3;

      this.microphone = this.audioContext.createMediaStreamSource(this.stream);
      this.microphone.connect(this.analyser);

      // Connect analyser to a silent gain node → destination
      // This forces Chrome to actively pull audio frames through the pipeline
      const silentGain = this.audioContext.createGain();
      silentGain.gain.value = 0;
      this.analyser.connect(silentGain);
      silentGain.connect(this.audioContext.destination);

      this.listening = true;
      this.hasSpoken = false;

      // ── 3. MediaRecorder records directly from raw hardware mic stream ──
      // NO MediaStreamAudioDestinationNode — that's what was causing silent recordings
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : (MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : undefined);

      this.mediaRecorder = new MediaRecorder(this.stream, mimeType ? { mimeType } : {});
      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) this.audioChunks.push(e.data);
      };
      this.mediaRecorder.onstop = async () => {
        if (this.transcriptionReceived) return;

        const blob = new Blob(this.audioChunks, { type: mimeType || 'audio/webm' });
        console.log(`[STT] MediaRecorder stopped. Size: ${blob.size}, hasSpoken: ${this.hasSpoken}, chunks: ${this.audioChunks.length}`);

        // Always send to Whisper if we have actual data (> 300 bytes of WebM headers).
        // Let the backend hallucination filter handle silent audio — don't block here.
        if (blob.size > 300) {
          await this.sendForTranscription(blob);
        } else {
          console.log(`[STT] Suppressed empty container (${blob.size} bytes)`);
          if (this.errorCallback) {
            this.errorCallback("I didn't catch that. Please speak again.");
          }
        }
      };
      this.mediaRecorder.start(100);

      // ── 4. Start native Web Speech API in parallel for instant results ──
      if (this.nativeRecognition) {
        try {
          this.nativeRecognition.start();
        } catch(e) {
          // Already running or permission issue — MediaRecorder fallback handles it
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
