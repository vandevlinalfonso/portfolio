import AppState from '../state/AppState.js';

// Drone root frequencies per section: the tone sinks as the visitor
// descends through the case file, resolving back at contact
const DRONE_FREQS = { 0: 55.0, 1: 49.0, 2: 41.2, 3: 36.7, 4: 55.0 };

/**
 * Procedural WebAudio sound design — no audio files required.
 * Everything is synthesized: per-Act ambient drone, hover ticks,
 * and the biopsy click/squelch.
 *
 * Muted by default; enabled via the on-screen sound toggle.
 */
export default class AudioManager {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = true;
    this.drone = null;
    this.currentSection = 0;
  }

  /**
   * Create/resume the audio context (must follow a user gesture)
   */
  async enable() {
    if (!this.ctx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;

      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0;
      this.master.connect(this.ctx.destination);
    }

    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
  }

  /**
   * Toggle mute. Unmuting lazily creates the context and drone.
   * @param {boolean} muted
   */
  async setMuted(muted) {
    this.muted = muted;
    AppState.setAudioEnabled(!muted);

    if (muted) {
      if (this.ctx && this.master) {
        const t = this.ctx.currentTime;
        this.master.gain.cancelScheduledValues(t);
        this.master.gain.setValueAtTime(this.master.gain.value, t);
        this.master.gain.linearRampToValueAtTime(0, t + 0.4);
      }
      return;
    }

    await this.enable();
    if (!this.ctx) return;

    if (!this.drone) this.startDrone();

    const t = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(t);
    this.master.gain.setValueAtTime(this.master.gain.value, t);
    this.master.gain.linearRampToValueAtTime(0.6, t + 0.8);
  }

  /**
   * Low ambient drone: detuned saw + sub sine through a slowly
   * breathing lowpass filter.
   */
  startDrone() {
    const ctx = this.ctx;
    const freq = DRONE_FREQS[this.currentSection] || 55;

    const oscA = ctx.createOscillator();
    oscA.type = 'sawtooth';
    oscA.frequency.value = freq;
    oscA.detune.value = 4;

    const oscB = ctx.createOscillator();
    oscB.type = 'sine';
    oscB.frequency.value = freq / 2;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 220;
    filter.Q.value = 0.8;

    const gain = ctx.createGain();
    gain.gain.value = 0.12;

    // Slow LFO breathing on the filter cutoff
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.07;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 60;
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);

    oscA.connect(filter);
    oscB.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);

    oscA.start();
    oscB.start();
    lfo.start();

    this.drone = { oscA, oscB, filter, gain, lfo };
  }

  /**
   * Retune the drone when the section changes
   * @param {number} sectionIndex
   */
  setSection(sectionIndex) {
    this.currentSection = sectionIndex;
    if (!this.drone || !this.ctx) return;

    const freq = DRONE_FREQS[sectionIndex] || 55;
    const t = this.ctx.currentTime;
    this.drone.oscA.frequency.exponentialRampToValueAtTime(freq, t + 2.5);
    this.drone.oscB.frequency.exponentialRampToValueAtTime(freq / 2, t + 2.5);
  }

  get ready() {
    return !!this.ctx && !this.muted;
  }

  /**
   * Feed scroll velocity: fast scrubbing opens the drone's filter,
   * making the ambience swell with movement.
   * Throttled internally — safe to call every frame.
   * @param {number} velocity - normalized 0..1
   */
  setScrollVelocity(velocity) {
    if (!this.drone || !this.ctx || this.muted) return;

    const now = performance.now();
    if (this._lastVelocityUpdate && now - this._lastVelocityUpdate < 120) return;
    this._lastVelocityUpdate = now;

    const cutoff = 220 + Math.min(1, velocity) * 700;
    this.drone.filter.frequency.setTargetAtTime(cutoff, this.ctx.currentTime, 0.25);
  }

  /**
   * Static burst for act-transition glitches
   */
  glitchBurst() {
    if (!this.ready) return;

    const ctx = this.ctx;
    const t = ctx.currentTime;

    const length = Math.floor(ctx.sampleRate * 0.12);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / length) * (Math.random() > 0.7 ? 1 : 0.2);
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 1800;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.07, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    noise.start(t);
  }

  /**
   * Short high tick on hover
   */
  hoverTick() {
    if (!this.ready) return;

    const ctx = this.ctx;
    const t = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 1400;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.05, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);

    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t);
    osc.stop(t + 0.08);
  }

  /**
   * Biopsy interaction: low thud + filtered noise squelch
   */
  click() {
    if (!this.ready) return;

    const ctx = this.ctx;
    const t = ctx.currentTime;

    // Thud
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(160, t);
    osc.frequency.exponentialRampToValueAtTime(50, t + 0.22);

    const oscGain = ctx.createGain();
    oscGain.gain.setValueAtTime(0.35, t);
    oscGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);

    osc.connect(oscGain);
    oscGain.connect(this.master);
    osc.start(t);
    osc.stop(t + 0.3);

    // Squelch
    const length = Math.floor(ctx.sampleRate * 0.15);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.value = 700;
    noiseFilter.Q.value = 1.2;

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.12, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.master);
    noise.start(t);
  }

  /**
   * Check if audio is enabled
   * @returns {boolean}
   */
  isEnabled() {
    return this.ready;
  }
}
