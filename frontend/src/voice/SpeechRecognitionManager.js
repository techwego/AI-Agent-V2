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
    this.SILENCE_THRESHOLD = 15;
    this.FFT_SIZE = 512;
    this.transcriptionCallback = null;
    this.errorCallback = null;
    this.volumeCallback = null;
    this.nativeRecognition = null;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      this.nativeRecognition = new SpeechRecognition();
      this.nativeRecognition.continuous = false;
      this.nativeRecognition.interimResults = false;
      this.nativeRecognition.lang = 'en-US';
      this.nativeRecognition.onresult = (event) => {
        const text = event.results[0][0].transcript;
        if (this.transcriptionCallback) this.transcriptionCallback(text);
      };
      this.nativeRecognition.onerror = (event) => {
        if (event.error !== 'no-speech' && event.error !== 'aborted') {
          console.error('Native speech error:', event.error);
        }
      };
    }
  }

  onTranscription(cb) { this.transcriptionCallback = cb; }
  onError(cb) { this.errorCallback = cb; }
  onVolumeChange(cb) { this.volumeCallback = cb; }
  isListening() { return this.listening; }

  async startListening() {
    if (this.listening) return;
    try {
      if (!this.stream) this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!this.audioContext) {
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

      if (this.nativeRecognition) {
        try { this.nativeRecognition.start(); } catch(e){}
      } else {
        this.audioChunks = [];
        const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : undefined;
        this.mediaRecorder = new MediaRecorder(this.stream, mimeType ? { mimeType } : {});
        this.mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) this.audioChunks.push(e.data); };
        this.mediaRecorder.onstop = async () => {
          if (this.audioChunks.length > 0) {
            await this.sendForTranscription(new Blob(this.audioChunks, { type: 'audio/webm' }));
          }
        };
        this.mediaRecorder.start(100);
      }
      this.startSilenceDetection();
      this.maxListeningTimer = setTimeout(() => { if (this.listening) this.stopListening(); }, 15000);
    } catch (err) {
      if (this.errorCallback) this.errorCallback('Could not access microphone.');
    }
  }

  startSilenceDetection() {
    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    let silenceStart = Date.now();
    let initialSilenceStart = Date.now();
    this.checkSilenceInterval = setInterval(() => {
      this.analyser.getByteFrequencyData(dataArray);
      let maxVol = 0;
      for (let i = 0; i < dataArray.length; i++) { if (dataArray[i] > maxVol) maxVol = dataArray[i]; }
      if (this.volumeCallback) this.volumeCallback(maxVol);

      if (maxVol > this.SILENCE_THRESHOLD) {
        this.hasSpoken = true;
        silenceStart = Date.now();
      } else {
        const now = Date.now();
        if (this.hasSpoken && (now - silenceStart > 600)) {
          this.stopListening();
        } else if (!this.hasSpoken && (now - initialSilenceStart > 5000)) {
          this.stopListening();
        }
      }
    }, 100);
  }

  stopListening() {
    if (!this.listening) return;
    this.listening = false;
    if (this.checkSilenceInterval) clearInterval(this.checkSilenceInterval);
    if (this.maxListeningTimer) clearTimeout(this.maxListeningTimer);
    if (this.nativeRecognition) try { this.nativeRecognition.stop(); } catch(e){}
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') this.mediaRecorder.stop();
    if (this.audioContext && this.audioContext.state === 'running') this.audioContext.suspend();
    if (this.volumeCallback) this.volumeCallback(0);
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
      const response = await fetch('/api/transcribe', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token') || ''}` },
        body: formData
      });
      if (!response.ok) throw new Error('Transcription failed');
      const data = await response.json();
      if (this.transcriptionCallback) this.transcriptionCallback(data.text || '');
    } catch (err) {
      if (this.errorCallback) this.errorCallback('Failed to transcribe audio.');
    }
  }
}
export default new SpeechRecognitionManager();
