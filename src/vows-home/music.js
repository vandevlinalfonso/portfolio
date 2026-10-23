/**
 * Open House — the music in the flat.
 *
 * Two modes, chosen by config:
 *  - "file":    the couple's own song (config.music.src, looped), routed
 *               through a WebAudio gain so it can fade and duck.
 *  - "ambient": no asset needed — a procedural "home ambience": soft
 *               felt-piano plucks on a warm pentatonic over a faint
 *               vinyl-crackle bed. The GitHub-Pages-friendly default.
 *  - "off":     no audio, the control hides.
 *
 * Rules: nothing plays before a user gesture (the doorbell click is the
 * natural one); mute persists across visits; overlays duck the level.
 */

const MUTE_KEY = 'vows-home-muted-v1';

// A minor pentatonic around the small octave — warm, unhurried
const SCALE = [220.0, 261.63, 293.66, 329.63, 392.0, 440.0, 523.25];

export class Music {
  constructor(cfg = {}) {
    this.src = cfg.src || '';
    this.title = cfg.title || '';
    this.barkSrc = cfg.barkSrc || '';
    this.mode = cfg.mode || (this.src ? 'file' : 'ambient');
    this.started = false;
    this.running = false;
    this.ducked = false;
    this.ctx = null;
    this.master = null;
    this.media = null;
    this.barkBuf = null;       // decoded real bark, when barkSrc is set
    this._barkLoading = false;
    this._pluckTimer = 0;
    try {
      this.muted = localStorage.getItem(MUTE_KEY) === '1';
    } catch { this.muted = false; }
    // prefetch the bark bytes right away (no AudioContext needed for the
    // network part) so the very first doorbell answer can use the real bark
    this._barkBytes = null;
    if (this.barkSrc) {
      fetch(this.barkSrc)
        .then((r) => {
          if (!r.ok) throw new Error('no bark file');
          return r.arrayBuffer();
        })
        .then((bytes) => { this._barkBytes = bytes; })
        .catch(() => { this.barkSrc = ''; /* stay on the synth woof */ });
    }
  }

  get enabled() { return this.mode !== 'off'; }
  get playing() { return this.started && !this.muted; }

  /** target master level for the current mode/duck state */
  level() {
    const base = this.mode === 'file' ? 0.55 : 0.4;
    return this.ducked ? base * 0.35 : base;
  }

  /** call from a user gesture (the doorbell). Safe to call twice. */
  start() {
    if (!this.enabled || this.started) return;
    this.started = true;
    if (!this.muted) this._spinUp();
  }

  toggle() {
    this.setMuted(!this.muted);
  }

  setMuted(muted) {
    this.muted = muted;
    try { localStorage.setItem(MUTE_KEY, muted ? '1' : '0'); } catch { /* fine */ }
    if (!this.enabled || !this.started) return;
    if (muted) {
      this._ramp(0, 0.5);
      if (this.media) setTimeout(() => { if (this.muted) this.media.pause(); }, 600);
    } else {
      this._spinUp();
    }
  }

  setDucked(ducked) {
    this.ducked = ducked;
    if (this.running && !this.muted) this._ramp(this.level(), 0.6);
  }

  /* ---------- internals ---------- */

  _spinUp() {
    if (!this._init()) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();
    if (this.media && this.media.paused) {
      this.media.play().catch(() => { /* blocked — the toggle can retry */ });
    }
    this._ramp(this.level(), 1.6);
  }

  _ramp(value, seconds) {
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime;
    const g = this.master.gain;
    g.cancelScheduledValues(t);
    g.setValueAtTime(g.value, t);
    g.linearRampToValueAtTime(value, t + seconds);
  }

  _init() {
    if (this.running) return true;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return false;
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0;
    this.master.connect(this.ctx.destination);
    if (this.mode === 'file') this._startFile();
    else this._startAmbient();
    this.running = true;
    this._loadBark(); // give the bark decode a head start before the first woof
    return true;
  }

  _startFile() {
    this.media = new Audio(this.src);
    this.media.loop = true;
    this.media.preload = 'auto';
    // placeholder-friendly: if the song file isn't there (yet), fall back
    // to the procedural ambience so the invitation never goes silent
    this.media.addEventListener('error', () => {
      if (this.mode !== 'file') return;
      this.mode = 'ambient';
      this.media = null;
      if (this.running) this._startAmbient();
    }, { once: true });
    const node = this.ctx.createMediaElementSource(this.media);
    node.connect(this.master);
    this.media.play().catch(() => { /* will retry on unmute */ });
  }

  _startAmbient() {
    const ctx = this.ctx;

    // a gentle echo so the plucks hang in the room
    const delay = ctx.createDelay(1);
    delay.delayTime.value = 0.34;
    const feedback = ctx.createGain();
    feedback.gain.value = 0.28;
    const wet = ctx.createGain();
    wet.gain.value = 0.25;
    delay.connect(feedback);
    feedback.connect(delay);
    delay.connect(wet);
    wet.connect(this.master);
    this._delay = delay;

    // vinyl-crackle bed: looped filtered noise, barely there
    const len = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      // sparse pops over a faint hiss
      data[i] = (Math.random() * 2 - 1) * 0.06 +
        (Math.random() < 0.0004 ? (Math.random() * 2 - 1) * 0.6 : 0);
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buf;
    noise.loop = true;
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.value = 4200;
    noiseFilter.Q.value = 0.4;
    const noiseGain = ctx.createGain();
    noiseGain.gain.value = 0.05;
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.master);
    noise.start();

    // felt-piano plucks, scheduled at an unhurried pace
    const pluck = () => {
      if (!this.running) return;
      const root = SCALE[Math.floor(Math.random() * SCALE.length)];
      this._note(root);
      // sometimes a soft third voice a beat later
      if (Math.random() < 0.35) {
        const harm = SCALE[Math.floor(Math.random() * SCALE.length)];
        setTimeout(() => { if (this.running) this._note(harm * 0.5, 0.5); }, 360 + Math.random() * 300);
      }
      this._pluckTimer = setTimeout(pluck, 1600 + Math.random() * 2600);
    };
    this._pluckTimer = setTimeout(pluck, 500);
  }

  _note(freq, vel = 1) {
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(0.16 * vel, t + 0.012);
    env.gain.exponentialRampToValueAtTime(0.0001, t + 2.4);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1100;
    // two slightly detuned voices = the felt softness
    for (const det of [0, 2.4]) {
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = freq + det;
      osc.connect(env);
      osc.start(t);
      osc.stop(t + 2.6);
    }
    env.connect(filter);
    filter.connect(this.master);
    if (this._delay) filter.connect(this._delay);
  }

  /* ---------- sound effects (share the context, skip the master fade) ---------- */

  /** decode the prefetched bark recording, if one is configured */
  _loadBark() {
    if (!this._barkBytes || this.barkBuf || this._barkLoading || !this.ctx) return;
    this._barkLoading = true;
    this.ctx.decodeAudioData(this._barkBytes)
      .then((decoded) => { this.barkBuf = decoded; })
      .catch(() => { this.barkSrc = ''; /* stay on the synth woof */ });
  }

  /**
   * One cute bark; big = the deep WOOF, small = the yip.
   * Plays the real recording (config music.barkSrc) when available —
   * pitch-shifted per size with a little random detune so four in a row
   * never sound identical — and falls back to the synthesized woof.
   */
  woof(big = true) {
    if (this.muted || !this.enabled) return;
    if (!this.ctx) { if (!this._init()) return; }
    const ctx = this.ctx;
    if (ctx.state === 'suspended') ctx.resume();
    this._loadBark();
    const t = ctx.currentTime;
    if (this.barkBuf) {
      const srcNode = ctx.createBufferSource();
      srcNode.buffer = this.barkBuf;
      srcNode.playbackRate.value =
        (big ? 0.92 : 1.18) * (1 + (Math.random() - 0.5) * 0.06);
      const g = ctx.createGain();
      g.gain.value = big ? 0.85 : 0.6;
      srcNode.connect(g);
      g.connect(ctx.destination);
      srcNode.start(t);
      return;
    }
    const out = ctx.createGain();
    out.gain.setValueAtTime(0, t);
    out.gain.linearRampToValueAtTime(big ? 0.42 : 0.28, t + 0.015);
    out.gain.exponentialRampToValueAtTime(0.001, t + (big ? 0.24 : 0.17));
    const filt = ctx.createBiquadFilter();
    filt.type = 'bandpass';
    filt.frequency.value = big ? 740 : 1080;
    filt.Q.value = 1.1;
    filt.connect(out);
    out.connect(ctx.destination);
    // two voices: the body of the bark + a brighter formant on top
    for (const [type, f0, f1, g] of [
      ['sawtooth', big ? 470 : 660, big ? 150 : 240, 1],
      ['square', big ? 235 : 330, big ? 88 : 138, 0.5]
    ]) {
      const osc = ctx.createOscillator();
      osc.type = type;
      osc.frequency.setValueAtTime(f0, t);
      osc.frequency.exponentialRampToValueAtTime(f1, t + 0.09);
      const vg = ctx.createGain();
      vg.gain.value = g;
      osc.connect(vg);
      vg.connect(filt);
      osc.start(t);
      osc.stop(t + 0.3);
    }
  }

  /** the door answer: four barks timed to the speech bubbles in door.js */
  woofs() {
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    [0, 1, 2, 3].forEach((i) => {
      setTimeout(() => this.woof(i % 2 === 0), i * (reduced ? 60 : 260));
    });
  }

  dispose() {
    clearTimeout(this._pluckTimer);
    this.running = false;
    this.media?.pause();
    this.ctx?.close();
  }
}
