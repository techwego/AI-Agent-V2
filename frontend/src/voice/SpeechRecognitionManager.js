class SpeechRecognitionManager {
  constructor() {
    this.mediaRecorder = null;
    this.audioContext = null;
    this.analyser = null;
    this.microphone = null;
    this.stream = null;
    
    this.listening = false;
    this.audioChunks = [];
    
    this.silenceTimer = null;
    this.maxSilenceTimer = null;
    this.checkSilenceInterval = null;
    
    this.hasSpoken = false;
    this.SILENCE_THRESHOLD = 15; // out of 255
    this.FFT_SIZE = 512;
    
    // Callbacks
    this.transcriptionCallback = null;
    this.errorCallback = null;
    this.volumeCallback = null;
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

  isListening() {
    return this.listening;
  }

  async startListening() {
    if (this.listening) return;

    try {
      if (!this.stream) {
        this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }
      
      // Setup Web Audio API for VAD (Voice Activity Detection)
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = this.FFT_SIZE;
      this.microphone = this.audioContext.createMediaStreamSource(this.stream);
      this.microphone.connect(this.analyser);

      // Setup MediaRecorder
      this.audioChunks = [];
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
        ? 'audio/webm;codecs=opus' 
        : MediaRecorder.isTypeSupported('audio/webm') 
          ? 'audio/webm' 
          : undefined;
      this.mediaRecorder = new MediaRecorder(this.stream, mimeType ? { mimeType } : {});
      
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = async () => {
        if (this.audioChunks.length > 0) {
          const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
          await this.sendForTranscription(audioBlob);
        }
      };

      this.mediaRecorder.start(100); // collect data every 100ms
      this.listening = true;
      this.hasSpoken = false;

      this.startSilenceDetection();
      
    } catch (err) {
      console.error('Error starting microphone:', err);
      if (this.errorCallback) {
        this.errorCallback('Could not access microphone. Please check permissions.');
      }
    }
  }

  startSilenceDetection() {
    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    let silenceStart = Date.now();
    let initialSilenceStart = Date.now();

    this.checkSilenceInterval = setInterval(() => {
      this.analyser.getByteFrequencyData(dataArray);
      
      // Calculate max volume
      let maxVolume = 0;
      for (let i = 0; i < dataArray.length; i++) {
        if (dataArray[i] > maxVolume) {
          maxVolume = dataArray[i];
        }
      }

      // Notify volume
      if (this.volumeCallback) {
        this.volumeCallback(maxVolume);
      }

      if (maxVolume > this.SILENCE_THRESHOLD) {
        this.hasSpoken = true;
        silenceStart = Date.now(); // Reset silence timer
      } else {
        const now = Date.now();
        // Check for end of speech
        if (this.hasSpoken && (now - silenceStart > 500)) {
          this.stopListening();
        } 
        // Check for complete silence (no speech at all)
        else if (!this.hasSpoken && (now - initialSilenceStart > 5000)) {
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

    // Stop recording
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }

    // Stop audio context (we keep stream alive for instant reuse)
    // if (this.audioContext && this.audioContext.state !== 'closed') {
    //   this.audioContext.close();
    // }

    // Stop tracks to release microphone hardware - REMOVED TO FIX DELAY
    // if (this.stream) {
    //   this.stream.getTracks().forEach(track => track.stop());
    // }

    // Reset volume
    if (this.volumeCallback) {
      this.volumeCallback(0);
    }
  }

  async sendForTranscription(blob) {
    try {
      const formData = new FormData();
      formData.append('audio', blob, 'recording.webm');

      const token = localStorage.getItem('token') || '';
      
      const response = await fetch('/api/transcribe', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Transcription failed with status ${response.status}`);
      }

      const data = await response.json();
      
      if (this.transcriptionCallback) {
        this.transcriptionCallback(data.text || '');
      }
      
    } catch (err) {
      console.error('Transcription API error:', err);
      if (this.errorCallback) {
        this.errorCallback('Failed to transcribe audio. Please try again.');
      }
    }
  }
}

const instance = new SpeechRecognitionManager();
export default instance;
