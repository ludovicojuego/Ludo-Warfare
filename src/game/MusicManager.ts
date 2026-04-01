
class MusicManager {
  private audioCtx: AudioContext | null = null;
  private isPlaying: boolean = false;
  private intensity: number = 0; // 0 to 1
  private nextNoteTime: number = 0;
  private scheduleAheadTime: number = 0.1;
  private lookahead: number = 25.0;
  private timerID: number | null = null;
  private tempo: number = 120;
  private currentBeat: number = 0;

  private masterGain: GainNode | null = null;
  private drumGain: GainNode | null = null;
  private synthGain: GainNode | null = null;

  private init() {
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.audioCtx.createGain();
      this.masterGain.gain.setValueAtTime(0.3, this.audioCtx.currentTime);
      this.masterGain.connect(this.audioCtx.destination);

      this.drumGain = this.audioCtx.createGain();
      this.drumGain.connect(this.masterGain);

      this.synthGain = this.audioCtx.createGain();
      this.synthGain.connect(this.masterGain);
    }
  }

  start() {
    this.init();
    if (this.isPlaying) return;
    this.isPlaying = true;
    this.nextNoteTime = this.audioCtx!.currentTime;
    this.scheduler();
  }

  stop() {
    this.isPlaying = false;
    if (this.timerID) {
      clearTimeout(this.timerID);
    }
  }

  setIntensity(level: number) {
    this.intensity = Math.max(0, Math.min(1, level));
    if (this.masterGain) {
      // Slightly increase overall volume with intensity
      this.masterGain.gain.setTargetAtTime(0.3 + this.intensity * 0.2, this.audioCtx!.currentTime, 0.1);
    }
  }

  private scheduler() {
    while (this.nextNoteTime < this.audioCtx!.currentTime + this.scheduleAheadTime) {
      this.scheduleNote(this.currentBeat, this.nextNoteTime);
      this.nextNote();
    }
    this.timerID = window.setTimeout(() => this.scheduler(), this.lookahead);
  }

  private nextNote() {
    const secondsPerBeat = 60.0 / this.tempo / 2; // 8th notes
    this.nextNoteTime += secondsPerBeat;
    this.currentBeat = (this.currentBeat + 1) % 16;
  }

  private scheduleNote(beat: number, time: number) {
    // Kick drum on 1, 5, 9, 13
    if (beat % 4 === 0) {
      this.playKick(time);
    }

    // Snare/Clap on 5, 13 (more intense)
    if ((beat === 4 || beat === 12) && this.intensity > 0.3) {
      this.playSnare(time);
    }

    // Hi-hat on every 8th note if intensity is high
    if (this.intensity > 0.6) {
      this.playHiHat(time);
    }

    // Bass line
    const bassNotes = [55, 55, 62, 55, 58, 55, 62, 65]; // G1, G1, D2, G1, Bb1, G1, D2, F2
    if (beat % 2 === 0) {
      const noteIdx = (beat / 2) % bassNotes.length;
      this.playBass(bassNotes[noteIdx], time);
    }

    // Epic Brass-like lead if intensity is very high
    if (this.intensity > 0.8 && beat % 4 === 0) {
      const leadNotes = [110, 110, 130, 146]; // G2, G2, Bb2, C3
      const noteIdx = (beat / 4) % leadNotes.length;
      this.playLead(leadNotes[noteIdx], time);
    }
  }

  private playKick(time: number) {
    const osc = this.audioCtx!.createOscillator();
    const gain = this.audioCtx!.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, time);
    osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.5);

    gain.gain.setValueAtTime(0.5, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.5);

    osc.connect(gain);
    gain.connect(this.drumGain!);

    osc.start(time);
    osc.stop(time + 0.5);
  }

  private playSnare(time: number) {
    const bufferSize = this.audioCtx!.sampleRate * 0.1;
    const buffer = this.audioCtx!.createBuffer(1, bufferSize, this.audioCtx!.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.audioCtx!.createBufferSource();
    noise.buffer = buffer;

    const filter = this.audioCtx!.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(1000, time);

    const gain = this.audioCtx!.createGain();
    gain.gain.setValueAtTime(0.2 * this.intensity, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.1);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.drumGain!);

    noise.start(time);
  }

  private playHiHat(time: number) {
    const osc = this.audioCtx!.createOscillator();
    const gain = this.audioCtx!.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(10000, time);

    gain.gain.setValueAtTime(0.05 * this.intensity, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.05);

    osc.connect(gain);
    gain.connect(this.drumGain!);

    osc.start(time);
    osc.stop(time + 0.05);
  }

  private playBass(freq: number, time: number) {
    const osc = this.audioCtx!.createOscillator();
    const gain = this.audioCtx!.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, time);

    const filter = this.audioCtx!.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(200 + this.intensity * 800, time);

    gain.gain.setValueAtTime(0.15, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.4);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.synthGain!);

    osc.start(time);
    osc.stop(time + 0.4);
  }

  private playLead(freq: number, time: number) {
    const osc = this.audioCtx!.createOscillator();
    const gain = this.audioCtx!.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, time);
    
    // Detune for "epic" feel
    const osc2 = this.audioCtx!.createOscillator();
    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(freq * 1.01, time);

    const filter = this.audioCtx!.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1000, time);

    gain.gain.setValueAtTime(0.1 * this.intensity, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 1.0);

    osc.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this.synthGain!);

    osc.start(time);
    osc2.start(time);
    osc.stop(time + 1.0);
    osc2.stop(time + 1.0);
  }
}

export const music = new MusicManager();
