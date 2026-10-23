/**
 * Tone — the plate's voice. Procedural WebAudio, no samples.
 *
 *   drive   the transducer tone at the real drive frequency; quiet off
 *           resonance, blooming as the plate starts to answer — the ear
 *           finds a mode before the eye does
 *   ring    a faintly detuned partner that beats against the drive only
 *           while the plate is singing
 *   hiss    band-passed noise that scales with how much sand is airborne
 *   clack   a tumbler falling: thump + noise snap + inharmonic ping
 *
 * Starts on a user gesture; mute persists.
 */

const MUTE_KEY = 'resonance-muted-v1';

export default class Tone {
  constructor() {
    this.ctx = null;
    try {
      this.muted = localStorage.getItem(MUTE_KEY) === '1';
    } catch (error) {
      this.muted = false;
    }
  }

  start() {
    if (this.ctx) {
      this.ctx.resume?.();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    this.ctx = ctx;

    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.9;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.ratio.value = 4;
    this.master.connect(comp).connect(ctx.destination);

    const tone = ctx.createBiquadFilter();
    tone.type = 'lowpass';
    tone.frequency.value = 2400;
    tone.connect(this.master);

    this.drive = ctx.createOscillator();
    this.drive.type = 'sine';
    this.driveGain = ctx.createGain();
    this.driveGain.gain.value = 0;
    this.drive.connect(this.driveGain).connect(tone);

    this.sub = ctx.createOscillator();
    this.sub.type = 'triangle';
    this.subGain = ctx.createGain();
    this.subGain.gain.value = 0;
    this.sub.connect(this.subGain).connect(tone);

    this.ring = ctx.createOscillator();
    this.ring.type = 'sine';
    this.ringGain = ctx.createGain();
    this.ringGain.gain.value = 0;
    this.ring.connect(this.ringGain).connect(tone);

    const noise = ctx.createBufferSource();
    const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const ch = buf.getChannelData(0);
    for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1;
    noise.buffer = buf;
    noise.loop = true;
    this.noiseBuf = buf;
    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = 3800;
    band.Q.value = 0.7;
    this.hissGain = ctx.createGain();
    this.hissGain.gain.value = 0;
    noise.connect(band).connect(this.hissGain).connect(this.master);

    [this.drive, this.sub, this.ring, noise].forEach((node) => node.start());
  }

  /**
   * @param {number} hz - drive frequency
   * @param {number} response - 0..1, how hard the plate is answering
   * @param {number} airborne - 0..1, fraction of the plate throwing sand
   */
  set(hz, response, airborne) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const k = 0.05;
    this.drive.frequency.setTargetAtTime(hz, t, 0.02);
    this.sub.frequency.setTargetAtTime(hz / 2, t, 0.02);
    this.ring.frequency.setTargetAtTime(hz * 1.0021, t, 0.02);
    // perceived loudness falls with pitch; lean on the sub up high
    const tilt = Math.min(1, 220 / hz);
    this.driveGain.gain.setTargetAtTime(0.018 + response * 0.13, t, k);
    this.subGain.gain.setTargetAtTime((0.01 + response * 0.05) * (0.5 + tilt), t, k);
    this.ringGain.gain.setTargetAtTime(response * response * 0.08, t, k);
    this.hissGain.gain.setTargetAtTime(Math.min(1, airborne * 1.6) * 0.05, t, 0.08);
  }

  silence() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    [this.driveGain, this.subGain, this.ringGain, this.hissGain].forEach((g) => g.gain.setTargetAtTime(0, t, 0.12));
  }

  clack(big = false) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;

    const thump = ctx.createOscillator();
    thump.frequency.setValueAtTime(big ? 120 : 160, t);
    thump.frequency.exponentialRampToValueAtTime(48, t + 0.18);
    const tg = ctx.createGain();
    tg.gain.setValueAtTime(0.5, t);
    tg.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
    thump.connect(tg).connect(this.master);
    thump.start(t);
    thump.stop(t + 0.3);

    const snap = ctx.createBufferSource();
    snap.buffer = this.noiseBuf;
    const sf = ctx.createBiquadFilter();
    sf.type = 'highpass';
    sf.frequency.value = 1800;
    const sg = ctx.createGain();
    sg.gain.setValueAtTime(0.28, t);
    sg.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
    snap.connect(sf).connect(sg).connect(this.master);
    snap.start(t, Math.random());
    snap.stop(t + 0.08);

    // inharmonic partials of a small steel bar
    [1, 2.76, 5.4].forEach((ratio, i) => {
      const o = ctx.createOscillator();
      o.frequency.value = (big ? 660 : 880) * ratio;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.06 / (i + 1), t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0005, t + (big ? 2.4 : 1.1) / (i + 1));
      o.connect(g).connect(this.master);
      o.start(t);
      o.stop(t + 2.5);
    });
  }

  /** The vault door: a slow open fifth swelling out of the plate tone. */
  open() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    [110, 165, 220, 330.5].forEach((f, i) => {
      const o = ctx.createOscillator();
      o.type = i % 2 ? 'triangle' : 'sine';
      o.frequency.value = f;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.07 / (1 + i * 0.4), t + 1.6 + i * 0.2);
      g.gain.exponentialRampToValueAtTime(0.0005, t + 7);
      o.connect(g).connect(this.master);
      o.start(t);
      o.stop(t + 7.2);
    });
  }

  setMuted(muted) {
    this.muted = muted;
    try {
      localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
    } catch (error) {
      // session-only
    }
    if (this.ctx) this.master.gain.setTargetAtTime(muted ? 0 : 0.9, this.ctx.currentTime, 0.1);
  }

  suspend() {
    this.ctx?.suspend?.();
  }

  resume() {
    this.ctx?.resume?.();
  }
}
