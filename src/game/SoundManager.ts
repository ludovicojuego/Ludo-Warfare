
class SoundManager {
  private audioCtx: AudioContext | null = null;

  private init() {
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  playDiceRoll() {
    this.init();
    if (!this.audioCtx) return;

    const bufferSize = this.audioCtx.sampleRate * 0.05;
    const buffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.audioCtx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1000 + Math.random() * 2000, this.audioCtx.currentTime);

    const gainNode = this.audioCtx.createGain();
    gainNode.gain.setValueAtTime(0.05, this.audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.05);

    noise.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.audioCtx.destination);

    noise.start();
  }

  playDiceLand() {
    this.init();
    if (!this.audioCtx) return;

    // Low frequency thud
    const oscillator = this.audioCtx.createOscillator();
    const gainNode = this.audioCtx.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(150, this.audioCtx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(40, this.audioCtx.currentTime + 0.2);

    gainNode.gain.setValueAtTime(0.3, this.audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.2);

    oscillator.connect(gainNode);
    gainNode.connect(this.audioCtx.destination);

    oscillator.start();
    oscillator.stop(this.audioCtx.currentTime + 0.2);

    // High frequency click
    const click = this.audioCtx.createOscillator();
    const clickGain = this.audioCtx.createGain();
    click.type = 'square';
    click.frequency.setValueAtTime(800, this.audioCtx.currentTime);
    clickGain.gain.setValueAtTime(0.05, this.audioCtx.currentTime);
    clickGain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.05);
    click.connect(clickGain);
    clickGain.connect(this.audioCtx.destination);
    click.start();
    click.stop(this.audioCtx.currentTime + 0.05);
  }

  playCapture() {
    this.init();
    if (!this.audioCtx) return;

    // Sword clash / Hit sound
    const osc1 = this.audioCtx.createOscillator();
    const osc2 = this.audioCtx.createOscillator();
    const gainNode = this.audioCtx.createGain();

    osc1.type = 'square';
    osc1.frequency.setValueAtTime(400, this.audioCtx.currentTime);
    osc1.frequency.exponentialRampToValueAtTime(100, this.audioCtx.currentTime + 0.3);

    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(200, this.audioCtx.currentTime);
    osc2.frequency.exponentialRampToValueAtTime(50, this.audioCtx.currentTime + 0.3);

    gainNode.gain.setValueAtTime(0.2, this.audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.3);

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(this.audioCtx.destination);

    osc1.start();
    osc2.start();
    osc1.stop(this.audioCtx.currentTime + 0.3);
    osc2.stop(this.audioCtx.currentTime + 0.3);
  }

  playMove() {
    this.init();
    if (!this.audioCtx) return;

    // Subtle "step" sound
    const osc = this.audioCtx.createOscillator();
    const gainNode = this.audioCtx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(120, this.audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(60, this.audioCtx.currentTime + 0.05);

    gainNode.gain.setValueAtTime(0.1, this.audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.05);

    osc.connect(gainNode);
    gainNode.connect(this.audioCtx.destination);

    osc.start();
    osc.stop(this.audioCtx.currentTime + 0.05);
  }

  playGunshot() {
    this.init();
    if (!this.audioCtx) return;

    const bufferSize = this.audioCtx.sampleRate * 0.1;
    const buffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.audioCtx.createBufferSource();
    noise.buffer = buffer;

    const gainNode = this.audioCtx.createGain();
    gainNode.gain.setValueAtTime(0.2, this.audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.1);

    noise.connect(gainNode);
    gainNode.connect(this.audioCtx.destination);
    noise.start();
  }

  playTickle() {
    this.init();
    if (!this.audioCtx) return;

    // High pitched giggling sound
    const osc = this.audioCtx.createOscillator();
    const gainNode = this.audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, this.audioCtx.currentTime);
    for (let i = 0; i < 5; i++) {
      osc.frequency.exponentialRampToValueAtTime(1200, this.audioCtx.currentTime + i * 0.1 + 0.05);
      osc.frequency.exponentialRampToValueAtTime(800, this.audioCtx.currentTime + i * 0.1 + 0.1);
    }

    gainNode.gain.setValueAtTime(0.1, this.audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.5);

    osc.connect(gainNode);
    gainNode.connect(this.audioCtx.destination);
    osc.start();
    osc.stop(this.audioCtx.currentTime + 0.5);
  }

  playExplosion() {
    this.init();
    if (!this.audioCtx) return;

    const bufferSize = this.audioCtx.sampleRate * 0.5;
    const buffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.audioCtx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(400, this.audioCtx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(40, this.audioCtx.currentTime + 0.5);

    const gainNode = this.audioCtx.createGain();
    gainNode.gain.setValueAtTime(0.4, this.audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.5);

    noise.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.audioCtx.destination);
    noise.start();
  }

  playLaser() {
    this.init();
    if (!this.audioCtx) return;

    const osc = this.audioCtx.createOscillator();
    const gainNode = this.audioCtx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(880, this.audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(220, this.audioCtx.currentTime + 0.2);

    gainNode.gain.setValueAtTime(0.1, this.audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.2);

    osc.connect(gainNode);
    gainNode.connect(this.audioCtx.destination);
    osc.start();
    osc.stop(this.audioCtx.currentTime + 0.2);
  }

  playKick() {
    this.init();
    if (!this.audioCtx) return;

    const osc = this.audioCtx.createOscillator();
    const gainNode = this.audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(100, this.audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(20, this.audioCtx.currentTime + 0.1);

    gainNode.gain.setValueAtTime(0.5, this.audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.1);

    osc.connect(gainNode);
    gainNode.connect(this.audioCtx.destination);
    osc.start();
    osc.stop(this.audioCtx.currentTime + 0.1);
  }

  playSix() {
    this.init();
    if (!this.audioCtx) return;

    // A celebratory "ding-ding" sound
    const now = this.audioCtx.currentTime;
    
    [523.25, 659.25, 783.99].forEach((freq, i) => {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.1);
      
      gain.gain.setValueAtTime(0, now + i * 0.1);
      gain.gain.linearRampToValueAtTime(0.1, now + i * 0.1 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.1 + 0.2);
      
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      
      osc.start(now + i * 0.1);
      osc.stop(now + i * 0.1 + 0.2);
    });
  }
}

export const sounds = new SoundManager();
