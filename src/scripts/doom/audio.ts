/* All SFX are synthesized — no audio files. The AudioContext is created from
   the trapdoor click's user gesture, so autoplay policy is satisfied. */
export class Sfx {
  private ctx: AudioContext;
  private master: GainNode;
  private noiseBuffer: AudioBuffer;
  muted = false;

  constructor() {
    this.ctx = new AudioContext();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.4;
    this.master.connect(this.ctx.destination);

    const len = this.ctx.sampleRate * 0.5;
    this.noiseBuffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  }

  resume(): void {
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    this.master.gain.setTargetAtTime(this.muted ? 0 : 0.4, this.ctx.currentTime, 0.01);
    return this.muted;
  }

  private noise(duration: number, gainVal: number, filterFreq: number, type: BiquadFilterType) {
    const t = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = filterFreq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gainVal, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + duration);
    src.connect(filter).connect(g).connect(this.master);
    src.start(t);
    src.stop(t + duration);
  }

  private sweep(
    type: OscillatorType,
    from: number,
    to: number,
    duration: number,
    gainVal: number
  ) {
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(from, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(to, 1), t + duration);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gainVal, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.connect(g).connect(this.master);
    osc.start(t);
    osc.stop(t + duration);
  }

  shoot(): void {
    this.sweep('square', 240, 36, 0.16, 0.28);
    this.noise(0.12, 0.3, 1800, 'lowpass');
  }

  dryFire(): void {
    this.noise(0.05, 0.12, 2400, 'highpass');
  }

  hit(): void {
    this.noise(0.08, 0.25, 900, 'bandpass');
    this.sweep('triangle', 140, 70, 0.09, 0.18);
  }

  enemyDeath(): void {
    this.sweep('sawtooth', 180, 24, 0.45, 0.3);
    this.noise(0.3, 0.2, 500, 'lowpass');
  }

  growl(): void {
    const t = this.ctx.currentTime;
    for (const f of [64, 67]) {
      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(f, t);
      osc.frequency.linearRampToValueAtTime(f * 0.8, t + 0.5);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.001, t);
      g.gain.exponentialRampToValueAtTime(0.16, t + 0.08);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 420;
      osc.connect(filter).connect(g).connect(this.master);
      osc.start(t);
      osc.stop(t + 0.6);
    }
  }

  doorOpen(): void {
    const t = this.ctx.currentTime;
    for (const f of [320, 481]) {
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, t);
      osc.frequency.exponentialRampToValueAtTime(f * 2, t + 1.0);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.001, t);
      g.gain.exponentialRampToValueAtTime(0.1, t + 0.15);
      g.gain.exponentialRampToValueAtTime(0.001, t + 1.1);
      osc.connect(g).connect(this.master);
      osc.start(t);
      osc.stop(t + 1.2);
    }
    this.noise(0.8, 0.06, 3000, 'highpass');
  }

  playerHurt(): void {
    this.sweep('square', 90, 45, 0.22, 0.24);
    this.noise(0.15, 0.2, 700, 'lowpass');
  }

  close(): void {
    void this.ctx.close();
  }
}
