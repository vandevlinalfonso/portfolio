import '@fontsource/space-grotesk/300.css';
import '@fontsource/space-grotesk/500.css';
import '@fontsource/space-grotesk/700.css';
import './styles/base.css';
import Theme from './theme/index.js';

import Cursor from './ui/Cursor.js';
import LensManager from './lenses/index.js';
import { quality, isWebGLAvailable } from './utils/Quality.js';
import Stage from './resonance/stage.js';
import Tone from './resonance/tone.js';
import { KEYS, HZ_PER_UNIT, HOLD_TIME, TUNE_MIN, SAVE_KEY } from './resonance/keys.js';
import { copyFor } from './resonance/copy.js';
import { drawGlyph } from './resonance/glyph.js';
import {
  modalWeights, familyWeights, sampleAmplitude, figureMatch, peak, familyLabel, resonance, M, F_MIN, F_MAX
} from './resonance/plate.js';

/**
 * Resonance — a vault that opens to sound.
 *
 * Orchestrator: attract loop → vault run (seven keys) or free studio.
 * Every frame the drive (frequency + transducer point) becomes modal
 * weights (plate.js); the GPU turns them into a field and moves the sand
 * (sand.js); the CPU samples the same field on a coarse grid to judge the
 * figure against the key, drive the audio, and fill the spectral trace.
 */

const GRID = 30;
const DRIVE_GAIN = 5;         // amplitude → plate acceleration (g): a resonance throws ~10 g
const STUDIO_WIDTH = 0.55;
const TRACE_BINS = 640;
const ATTRACT = [
  { f: 4, drive: [0.5, 0.5] }, { f: 20, drive: [0.5, 0.5] }, { f: 25, drive: [0.02, 0.03] },
  { f: 13, drive: [0.1, 0.08] }, { f: 50, drive: [0.15, 0.15] }, { f: 41, drive: [0.2, 0.02] },
  { f: 65, drive: [0.02, 0.02] }, { f: 34, drive: [0.3, 0.12] }
];

const $ = (id) => document.getElementById(id);
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const fmtTime = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

class Resonance {
  constructor() {
    this.stage = new Stage($('stage'), quality);
    this.tone = new Tone();
    this.cursor = new Cursor();

    this.mode = 'attract';          // attract | vault | studio | open
    this.f = 4;
    this.fGoal = 4;
    this.drive = { u: 0.5, v: 0.5 };
    this.driveGoal = { u: 0.5, v: 0.5 };
    this.keyIndex = 0;
    this.hold = 0;
    this.lockGlow = 0;
    this.setting = 0;               // seconds left in a tumbler-set beat
    this.scatter = 0;
    this.elapsed = 0;
    this.fullRun = false;
    this.attractIndex = 0;
    this.attractClock = 0;
    this.trace = new Float32Array(TRACE_BINS);
    this.weights = new Float32Array(M * M * 2);
    this.cur = new Float32Array(GRID * GRID);
    this.readouts = { match: 0, tune: 0, peak: 0, airborne: 0 };
    this.parallax = { x: 0, y: 0 };
    this.save = this.load();

    this.buildRing();
    this.bindUI();
    this.bindInput();
    this.applyLens(Theme.lens);
    Theme.onChange((lens) => this.applyLens(lens));

    this.frame();
    window.addEventListener('resize', () => {
      this.stage.resize(innerWidth, innerHeight);
      this.frame();
    });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.tone.suspend();
      else if (this.mode !== 'attract') this.tone.resume();
    });

    this.last = performance.now();
    requestAnimationFrame((t) => this.loop(t));
    window.__resonance = this; // test handle
  }

  /* ---------------- persistence ---------------- */

  load() {
    try {
      return { solved: 0, best: null, ...JSON.parse(localStorage.getItem(SAVE_KEY) || '{}') };
    } catch (error) {
      return { solved: 0, best: null };
    }
  }

  persist() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.save));
    } catch (error) {
      // session-only progress
    }
  }

  /* ---------------- lens ---------------- */

  applyLens(lens) {
    this.copy = copyFor(lens);
    this.accent = Theme.rgb;
    this.stage.setAccent(Theme.accentVec3());
    $('rz-eyebrow').textContent = this.copy.eyebrow;
    $('rz-kicker').textContent = this.copy.kicker;
    $('rz-lede').textContent = this.copy.lede;
    this.refreshRing();
    if (this.mode === 'vault') this.showKey();
  }

  /* ---------------- UI ---------------- */

  buildRing() {
    const host = $('rz-ring');
    this.ringSlots = KEYS.map((key, i) => {
      const slot = document.createElement('div');
      slot.className = 'rz-slot';
      slot.innerHTML = `<canvas width="72" height="72"></canvas><span>0${i + 1}</span>`;
      host.appendChild(slot);
      return slot;
    });
  }

  refreshRing() {
    this.ringSlots.forEach((slot, i) => {
      const done = this.mode === 'vault' || this.mode === 'open' ? i < this.keyIndex : i < this.save.solved;
      slot.classList.toggle('done', done);
      slot.classList.toggle('current', this.mode === 'vault' && i === this.keyIndex);
      drawGlyph(slot.querySelector('canvas'), KEYS[i], this.accent, { dim: !done });
    });
  }

  bindUI() {
    $('rz-begin').addEventListener('click', () => this.startVault(0));
    $('rz-continue').addEventListener('click', () => this.startVault(this.save.solved));
    $('rz-studio').addEventListener('click', () => this.startStudio());
    $('rz-exit').addEventListener('click', () => this.toAttract());
    $('rz-scatter').addEventListener('click', () => { this.scatter = 0.6; });
    $('rz-again').addEventListener('click', () => this.startVault(0));
    $('rz-open-studio').addEventListener('click', () => this.startStudio());

    const sound = $('rz-sound');
    const paint = () => {
      sound.textContent = this.tone.muted ? 'Sound: Off' : 'Sound: On';
      sound.classList.toggle('on', !this.tone.muted);
    };
    sound.addEventListener('click', () => { this.tone.setMuted(!this.tone.muted); paint(); });
    paint();

    this.refreshIntro();
  }

  refreshIntro() {
    const cont = $('rz-continue');
    const resumable = this.save.solved > 0 && this.save.solved < KEYS.length;
    cont.hidden = !resumable;
    if (resumable) cont.textContent = `Continue · Key 0${this.save.solved + 1}`;
    const notes = ['Sound on · headphones recommended'];
    if (this.save.best) notes.push(`Best run ${fmtTime(this.save.best)}`);
    $('rz-note').textContent = notes.join(' · ');
  }

  setMode(mode) {
    // leaving mid tumbler-set must not let its pending beat fire later
    if (mode !== this.mode) this.setting = 0;
    this.mode = mode;
    document.body.dataset.mode = mode;
    this.refreshRing();
    this.frame();
  }

  /** Step the plate aside for the intro; center it for play. */
  frame() {
    const portrait = innerWidth / innerHeight < 0.9;
    if (this.mode === 'attract') {
      if (portrait) this.stage.setFraming(0, 0.2, 0.86);
      else this.stage.setFraming(innerWidth > 1100 ? 0.2 : 0.15, 0, 0.9);
    } else if (portrait) {
      this.stage.setFraming(0, 0.02, 0.96);
    } else {
      this.stage.setFraming(0, 0, 1);
    }
  }

  toAttract() {
    this.tone.silence();
    this.setMode('attract');
    this.refreshIntro();
    $('rz-open').hidden = true;
  }

  startVault(index) {
    this.tone.start();
    this.keyIndex = index;
    this.fullRun = index === 0;
    this.elapsed = 0;
    this.setting = 0;
    this.hold = 0;
    $('rz-open').hidden = true;
    this.setMode('vault');
    this.showKey();
    this.scatter = 0.5;
    this.status('');
  }

  startStudio() {
    this.tone.start();
    $('rz-open').hidden = true;
    document.body.classList.remove('drive-locked');
    this.setMode('studio');
    this.trace.fill(0);
    this.status('Free play · every figure is real');
  }

  showKey() {
    const key = KEYS[this.keyIndex];
    if (!key) return;
    $('rk-index').textContent = `Key 0${this.keyIndex + 1} / 0${KEYS.length}`;
    $('rk-name').textContent = key.name;
    $('rk-hint').textContent = key.hint;
    drawGlyph($('rk-canvas'), key, this.accent);
    this.target = sampleAmplitude(familyWeights(key.f, key.drive[0], key.drive[1]), GRID);
    this.trace.fill(0);
    if (key.locked) this.driveGoal = { u: 0.5, v: 0.5 };
    document.body.classList.toggle('drive-locked', !!key.locked);
    this.refreshRing();
  }

  status(text, flash = false) {
    const el = $('rz-status');
    el.textContent = text;
    el.classList.toggle('flash', flash);
  }

  /* ---------------- input ---------------- */

  bindInput() {
    const rail = $('rr-canvas');
    const onUi = (e) => e.target.closest('button, a, #rz-intro, #rz-open, #rz-key');
    let drag = null;

    window.addEventListener('pointerdown', (e) => {
      if (this.mode !== 'vault' && this.mode !== 'studio') return;
      if (e.target === rail) {
        const rect = rail.getBoundingClientRect();
        this.fGoal = this.railToF((e.clientX - rect.left) / rect.width);
        drag = { type: 'rail', x: e.clientX, f: this.fGoal, top: rect.top };
        rail.setPointerCapture?.(e.pointerId);
        return;
      }
      if (onUi(e)) return;
      const uv = this.stage.pick(e.clientX, e.clientY);
      if (!uv) return;
      if (this.mode === 'vault' && KEYS[this.keyIndex]?.locked) {
        this.status('The drive is bolted to the center for this key · tune instead', true);
        return;
      }
      drag = { type: 'drive' };
      this.driveGoal = uv;
    });

    window.addEventListener('pointermove', (e) => {
      this.parallax.x = (e.clientX / innerWidth - 0.5) * 2;
      this.parallax.y = (e.clientY / innerHeight - 0.5) * 2;
      if (!drag) return;
      if (drag.type === 'rail') {
        // drag up, away from the rail, for a finer vernier
        const lift = Math.max(0, drag.top - e.clientY);
        const fine = 1 / (1 + lift / 45);
        const rect = rail.getBoundingClientRect();
        const perPx = (F_MAX - F_MIN) / rect.width;
        this.fGoal = this.clampF(this.fGoal + (e.clientX - drag.x) * perPx * fine);
        drag.x = e.clientX;
      } else {
        const uv = this.stage.pick(e.clientX, e.clientY, true);
        if (uv) this.driveGoal = uv;
      }
    });

    const end = () => { drag = null; };
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);

    window.addEventListener('wheel', (e) => {
      if (this.mode !== 'vault' && this.mode !== 'studio') return;
      e.preventDefault();
      const step = e.shiftKey ? 0.0006 : 0.0028;
      const d = Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
      this.fGoal = this.clampF(this.fGoal - d * step);
    }, { passive: false });

    window.addEventListener('keydown', (e) => {
      if (this.mode !== 'vault' && this.mode !== 'studio') return;
      const step = e.shiftKey ? 0.01 : 0.06;
      if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { this.fGoal = this.clampF(this.fGoal + step); e.preventDefault(); }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { this.fGoal = this.clampF(this.fGoal - step); e.preventDefault(); }
      if (e.key === 'Escape') this.toAttract();
    });
  }

  clampF(f) {
    return Math.min(F_MAX, Math.max(F_MIN, f));
  }

  railToF(t) {
    return this.clampF(F_MIN + clamp01(t) * (F_MAX - F_MIN));
  }

  /* ---------------- simulation + rules ---------------- */

  attract(dt) {
    this.attractClock += dt;
    const beat = ATTRACT[this.attractIndex];
    if (this.attractClock > 6.5) {
      this.attractClock = 0;
      this.attractIndex = (this.attractIndex + 1) % ATTRACT.length;
      this.scatter = 0.35;
    }
    // glide to the next figure with a slight wander, like a hand on a dial
    const wander = Math.sin(this.attractClock * 0.7) * 0.05;
    this.fGoal = beat.f + wander;
    this.driveGoal = { u: beat.drive[0], v: beat.drive[1] };
  }

  width() {
    if (this.mode === 'vault') return KEYS[this.keyIndex]?.width ?? STUDIO_WIDTH;
    return this.mode === 'attract' ? 0.7 : STUDIO_WIDTH;
  }

  judge(dt) {
    const key = KEYS[this.keyIndex];
    if (!key || this.setting > 0) return;
    const match = figureMatch(this.cur, this.target);
    const tune = resonance(this.f, key.f, key.width);
    this.readouts.match = match;
    this.readouts.tune = tune;

    const singing = this.readouts.peak > 0.9;
    const onKey = match >= key.match && tune >= TUNE_MIN && singing;
    this.hold = clamp01(this.hold + (onKey ? dt / HOLD_TIME : -dt / (HOLD_TIME * 0.6)));

    if (onKey) this.status(this.hold > 0.5 ? 'Hold it…' : 'That is the key · hold the note');
    else if (!singing) this.status('The plate is quiet · find a resonance');
    else if (tune < TUNE_MIN && match >= key.match - 0.05) this.status('Close · fine-tune the note');
    else this.status('');

    if (this.hold >= 1) this.setTumbler();
  }

  setTumbler() {
    const key = KEYS[this.keyIndex];
    this.setting = 2.3;
    this.hold = 0;
    this.tone.clack(this.keyIndex === KEYS.length - 1);
    this.stage.glitch(0.45);
    this.status(`Tumbler ${this.keyIndex + 1} set · ${key.name}`, true);
    this.keyIndex += 1;
    this.save.solved = Math.max(this.save.solved, this.keyIndex);
    this.persist();
    this.refreshRing();
    this.ringSlots[this.keyIndex - 1]?.classList.add('just');
  }

  afterSet() {
    if (this.keyIndex >= KEYS.length) {
      this.openVault();
      return;
    }
    this.scatter = 0.55;
    this.showKey();
    this.status('');
  }

  openVault() {
    this.setMode('open');
    this.tone.open();
    this.tone.silence();
    const time = this.elapsed;
    if (this.fullRun && (!this.save.best || time < this.save.best)) this.save.best = time;
    this.save.solved = 0;
    this.persist();

    $('ro-title').textContent = this.copy.openTitle;
    $('ro-body').textContent = this.copy.openBody;
    $('ro-time').textContent = this.fullRun ? `Run ${fmtTime(time)}${this.save.best ? ` · Best ${fmtTime(this.save.best)}` : ''}` : `Resumed run · ${fmtTime(time)}`;

    // The vault holds a codename: the lens this visitor does not have yet
    const locked = LensManager.list().find((lens) => !LensManager.isUnlocked(lens.id));
    const other = locked || LensManager.list().find((lens) => lens.id !== LensManager.activeId);
    const codeEl = $('ro-code');
    const switchBtn = $('ro-switch');
    if (other) {
      LensManager.unlock(other.id);
      codeEl.innerHTML = `Recovered codename <b>${other.codename.toUpperCase()}</b> · type it on any page`;
      switchBtn.hidden = false;
      switchBtn.textContent = `Switch to ${other.label}`;
      switchBtn.onclick = () => Theme.switchLive(other.id);
    } else {
      codeEl.textContent = '';
      switchBtn.hidden = true;
    }
    $('rz-open').hidden = false;
  }

  loop(now) {
    requestAnimationFrame((t) => this.loop(t));
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    const time = now / 1000;
    if (document.hidden) return;

    if (this.mode === 'attract' || this.mode === 'open') this.attract(dt);
    if (this.mode === 'vault' && this.setting <= 0) this.elapsed += dt;

    // the dial and the puck have a little mass
    this.f += (this.fGoal - this.f) * Math.min(1, dt * 12);
    this.drive.u += (this.driveGoal.u - this.drive.u) * Math.min(1, dt * 16);
    this.drive.v += (this.driveGoal.v - this.drive.v) * Math.min(1, dt * 16);

    modalWeights(this.f, this.drive.u, this.drive.v, this.width(), this.weights);
    this.stage.sand.setWeights(this.weights);
    sampleAmplitude(this.weights, GRID, this.cur);
    const pk = peak(this.cur);
    this.readouts.peak = pk;
    let loud = 0;
    for (let i = 0; i < this.cur.length; i++) if (this.cur[i] * DRIVE_GAIN > 1) loud++;
    this.readouts.airborne = loud / this.cur.length;

    if (this.mode === 'vault') this.judge(dt);

    if (this.setting > 0) {
      this.setting -= dt;
      if (this.setting <= 0 && this.mode === 'vault') this.afterSet();
    }
    const holdSand = this.setting > 0.5 ? 1 : 0;
    this.lockGlow += ((this.setting > 0 ? 1 : this.hold * 0.35) - this.lockGlow) * Math.min(1, dt * 5);

    // fixed 120 Hz sim steps: the hop physics wants a stable dt
    this.simAcc = (this.simAcc || 0) + dt;
    let steps = 0;
    while (this.simAcc >= 1 / 120 && steps < 4) {
      this.stage.sand.step(1 / 120, time + steps * 0.0083, {
        drive: DRIVE_GAIN,
        hold: holdSand,
        scatter: this.scatter > 0 ? 1.1 : 0
      });
      this.simAcc -= 1 / 120;
      steps++;
    }
    this.scatter = Math.max(0, this.scatter - dt);

    if (!quality.reducedMotion) {
      this.stage.parallax.x += (this.parallax.x - this.stage.parallax.x) * Math.min(1, dt * 2);
      this.stage.parallax.y += (this.parallax.y - this.stage.parallax.y) * Math.min(1, dt * 2);
    }
    this.stage.render(dt, time, {
      peak: Math.max(pk, 0.6),
      drive: this.drive,
      driveOn: this.mode === 'vault' || this.mode === 'studio' ? 1 : 0.35,
      lock: this.lockGlow
    });

    if (this.mode === 'vault' || this.mode === 'studio') this.updateHud(dt);
  }

  updateHud() {
    const hz = this.f * HZ_PER_UNIT;
    const response = clamp01((this.readouts.peak - 0.25) / 1.6);
    this.tone.set(hz, response, this.readouts.airborne);

    const bin = Math.round(((this.f - F_MIN) / (F_MAX - F_MIN)) * (TRACE_BINS - 1));
    for (let b = Math.max(0, bin - 1); b <= Math.min(TRACE_BINS - 1, bin + 1); b++) {
      this.trace[b] = Math.max(this.trace[b], response);
    }

    $('rr-hz').textContent = `${hz.toFixed(1)} Hz`;
    const nearest = Math.round(this.f);
    const onMode = Math.abs(this.f - nearest) < 0.3 && familyLabel(nearest) && response > 0.25;
    $('rr-mode').textContent = onMode ? `Mode ${familyLabel(nearest)}` : 'Between modes';
    $('t-plate').textContent = response > 0.45 ? 'SINGING' : response > 0.15 ? 'HUMMING' : 'QUIET';
    $('t-plate').classList.toggle('live', response > 0.45);

    if (this.mode === 'vault') {
      $('rk-match').textContent = `${Math.round(clamp01(this.readouts.match) * 100)}%`;
      $('rk-tune').textContent = `${Math.round(this.readouts.tune * 100)}%`;
      const ring = $('rk-progress');
      ring.style.strokeDashoffset = String(1 - this.hold);
      $('t-key').textContent = `${String(Math.min(this.keyIndex + 1, KEYS.length)).padStart(2, '0')}/${String(KEYS.length).padStart(2, '0')}`;
      $('t-time').textContent = fmtTime(this.elapsed);
    }
    this.drawRail();
  }

  drawRail() {
    const c = $('rr-canvas');
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const w = c.clientWidth, h = c.clientHeight;
    if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) {
      c.width = Math.round(w * dpr);
      c.height = Math.round(h * dpr);
    }
    const ctx = c.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const base = h - 18;
    const x = (f) => ((f - F_MIN) / (F_MAX - F_MIN)) * w;

    ctx.strokeStyle = 'rgba(232, 230, 225, 0.14)';
    ctx.beginPath();
    ctx.moveTo(0, base + 0.5);
    ctx.lineTo(w, base + 0.5);
    ctx.stroke();

    ctx.fillStyle = 'rgba(232, 230, 225, 0.32)';
    ctx.font = `9px ${getComputedStyle(document.body).getPropertyValue('--mono') || 'monospace'}`;
    ctx.textAlign = 'center';
    for (let f = 5; f <= F_MAX; f += 5) {
      const big = f % 10 === 0;
      ctx.fillRect(Math.round(x(f)), base + 2, 1, big ? 6 : 3);
      if (big) ctx.fillText(`${Math.round(f * HZ_PER_UNIT)}`, x(f), h - 1);
    }

    // studio shows where the modes live; the vault makes you find them
    if (this.mode === 'studio') {
      ctx.fillStyle = Theme.accentRgba(0.5);
      for (let f = 1; f <= F_MAX; f++) {
        if (!familyLabel(f)) continue;
        ctx.fillRect(Math.round(x(f)) - 1, base - 3, 2, 2);
      }
    }

    // spectral memory: every response you have heard stays on the rail
    ctx.beginPath();
    ctx.moveTo(0, base);
    for (let b = 0; b < TRACE_BINS; b++) {
      ctx.lineTo((b / (TRACE_BINS - 1)) * w, base - this.trace[b] * (base - 6));
    }
    ctx.lineTo(w, base);
    ctx.closePath();
    ctx.fillStyle = Theme.accentRgba(0.16);
    ctx.fill();
    ctx.strokeStyle = Theme.accentRgba(0.55);
    ctx.stroke();

    const nx = x(this.f);
    ctx.fillStyle = Theme.accentRgba(1);
    ctx.fillRect(Math.round(nx) - 0.5, 0, 1.5, base);
    ctx.beginPath();
    ctx.moveTo(nx - 5, base + 7);
    ctx.lineTo(nx + 5, base + 7);
    ctx.lineTo(nx, base + 1);
    ctx.closePath();
    ctx.fill();
  }
}

function init() {
  if (!isWebGLAvailable()) {
    document.getElementById('webgl-fallback')?.classList.add('visible');
    return;
  }
  document.body.dataset.mode = 'attract';
  new Resonance();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
