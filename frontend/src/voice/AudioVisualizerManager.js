class AudioVisualizerManager {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.analyser = null;
    this.animationId = null;
    this.type = 'mic'; // 'mic' or 'speech'
    
    this.simulatedValue = 0;
    this.simulatedTarget = 0;
    
    this.bars = 32;
    this.smoothedData = new Array(32).fill(0);
  }

  attachMicAnalyser(analyserNode) {
    this.analyser = analyserNode;
  }

  startVisualization(canvas, type = 'mic') {
    if (!canvas) return;
    
    this.stopVisualization();
    
    this.canvas = canvas;
    this.ctx = this.canvas.getContext('2d');
    this.type = type;
    
    // Ensure canvas dimensions match display size
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;

    this.draw();
  }

  stopVisualization() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    
    if (this.ctx && this.canvas) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
    
    this.smoothedData.fill(0);
  }

  getFrequencyData() {
    if (this.type === 'mic' && this.analyser) {
      const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
      this.analyser.getByteFrequencyData(dataArray);
      return dataArray;
    }
    return new Uint8Array(0);
  }

  draw() {
    if (!this.ctx || !this.canvas) return;

    this.animationId = requestAnimationFrame(() => this.draw());

    const width = this.canvas.width;
    const height = this.canvas.height;
    
    this.ctx.clearRect(0, 0, width, height);

    let data = [];

    if (this.type === 'mic') {
      const freqData = this.getFrequencyData();
      if (freqData.length > 0) {
        // Downsample freqData to match number of bars
        const step = Math.floor(freqData.length / this.bars);
        for (let i = 0; i < this.bars; i++) {
          let sum = 0;
          for (let j = 0; j < step; j++) {
            sum += freqData[i * step + j] || 0;
          }
          data.push(sum / step);
        }
      } else {
        data = new Array(this.bars).fill(0);
      }
    } else if (this.type === 'speech') {
      // Simulate speech visualization
      // Update target randomly to simulate voice activity
      if (Math.random() > 0.8) {
        this.simulatedTarget = Math.random() * 255;
      } else if (Math.random() > 0.9) {
        this.simulatedTarget = 0;
      }
      
      // Interpolate towards target
      this.simulatedValue += (this.simulatedTarget - this.simulatedValue) * 0.2;
      
      // Generate bars based on the simulated value
      for (let i = 0; i < this.bars; i++) {
        // Create a wave effect
        const wave = Math.sin(Date.now() / 200 + i * 0.2) * 0.5 + 0.5;
        data.push(this.simulatedValue * wave);
      }
    }

    // Smooth data (lerp)
    for (let i = 0; i < this.bars; i++) {
      const target = data[i] || 0;
      this.smoothedData[i] += (target - this.smoothedData[i]) * 0.3;
    }

    const barWidth = (width / this.bars) * 0.8;
    const spacing = (width / this.bars) * 0.2;

    for (let i = 0; i < this.bars; i++) {
      const value = this.smoothedData[i];
      const percent = value / 255;
      const barHeight = Math.max(percent * height, 2); // Minimum 2px height
      
      const x = i * (barWidth + spacing) + spacing / 2;
      const y = (height - barHeight) / 2; // Center vertically

      // Create gradient
      const gradient = this.ctx.createLinearGradient(0, y, 0, y + barHeight);
      
      if (this.type === 'mic') {
        // Blue gradient for mic
        gradient.addColorStop(0, '#3b82f6'); // blue-500
        gradient.addColorStop(1, '#93c5fd'); // blue-300
      } else {
        // Purple gradient for speech
        gradient.addColorStop(0, '#a855f7'); // purple-500
        gradient.addColorStop(1, '#d8b4fe'); // purple-300
      }

      this.ctx.fillStyle = gradient;
      
      // Draw rounded rectangle
      this.ctx.beginPath();
      this.ctx.roundRect(x, y, barWidth, barHeight, barWidth / 2);
      this.ctx.fill();
    }
  }
}

const instance = new AudioVisualizerManager();
export default instance;
