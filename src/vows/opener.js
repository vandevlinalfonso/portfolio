/**
 * The Red Thread opener.
 *
 * A full-screen night canvas in the film's painterly style: two distant
 * silhouettes stand on a dark hill, joined by a sagging, glowing red
 * thread — the fate motif. Drag either figure along the thread; it
 * tightens, brightens and sheds sparks. When they meet: an embrace,
 * the thread coils into a burning seal, and the screen ignites into
 * the film.
 *
 * Coaching: a bead of light travels the thread every few seconds, the
 * figures take turns leaning toward each other, and a hint names the
 * gesture. A tap-to-open fallback appears after a while (immediately
 * with prefers-reduced-motion).
 */

const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const ease = (t) => t * t * (3 - 2 * t);

export default class Opener {
  constructor(cfg, onOpen) {
    this.onOpen = onOpen;
    this.opened = false;
    this.touched = false;
    this.canvas = document.getElementById('thread-canvas');
    this.ctx = this.canvas.getContext('2d');

    const hint = document.getElementById('seal-hint');
    hint.textContent = (cfg.opener && cfg.opener.hint)
      || `Two lives, one thread: pull ${cfg.couple.groom.name} and ${cfg.couple.bride.name} together`;

    // world state: figure x positions as fractions of width
    this.fig = {
      groom: { x: 0.16, lean: 0 },
      bride: { x: 0.84, lean: 0 }
    };
    this.drag = null;       // { key, startX, baseX }
    this.auto = false;      // tap-to-open glide
    this.state = 'idle';    // idle | met | done
    this.metT = 0;
    this.sparks = [];
    this.stars = Array.from({ length: 80 }, (_, i) => ({
      x: Math.random(), y: Math.random() * 0.62, s: 0.6 + Math.random() * 1.8, ph: i * 1.7
    }));
    this.start = performance.now();
    this.lastSpark = 0;

    this.bindPointer();

    const tap = document.getElementById('tap-open');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    setTimeout(() => { if (!this.opened) tap.classList.add('show'); }, reduced ? 400 : 8000);
    tap.addEventListener('click', () => { if (!this.opened) { this.stopCoaching(); this.auto = true; } });

    window.__opener = this; // handle for tests
    this._loop = this.loop.bind(this);
    requestAnimationFrame(this._loop);
  }

  /* ---------- geometry ---------- */

  metrics() {
    const w = innerWidth, h = innerHeight;
    return { w, h, gy: h * 0.78, s: Math.min(w, h) * 0.085 };
  }

  /** screen-space figure anchor + hit radius (also used by Playwright) */
  figureAt(key) {
    const m = this.metrics();
    return { x: this.fig[key].x * m.w, y: m.gy - m.s * 0.9, r: m.s * 1.9 };
  }

  handOf(key, m) {
    const f = this.fig[key];
    const dir = key === 'groom' ? 1 : -1;
    return { x: f.x * m.w + dir * m.s * 0.66, y: m.gy - m.s * 1.04 };
  }

  /* ---------- input ---------- */

  bindPointer() {
    const c = this.canvas;
    c.addEventListener('pointerdown', (e) => {
      if (this.state !== 'idle' || this.auto) return;
      for (const key of ['groom', 'bride']) {
        const f = this.figureAt(key);
        if (Math.hypot(e.clientX - f.x, e.clientY - f.y) < f.r) {
          this.drag = { key, startX: e.clientX, baseX: this.fig[key].x };
          this.stopCoaching();
          c.setPointerCapture(e.pointerId);
          c.style.cursor = 'grabbing';
          return;
        }
      }
    });

    c.addEventListener('pointermove', (e) => {
      if (this.state !== 'idle') return;
      if (!this.drag) {
        const hot = ['groom', 'bride'].some((k) => {
          const f = this.figureAt(k);
          return Math.hypot(e.clientX - f.x, e.clientY - f.y) < f.r;
        });
        c.style.cursor = hot ? 'grab' : '';
        return;
      }
      const { key, startX, baseX } = this.drag;
      this.fig[key].x = clamp(baseX + (e.clientX - startX) / innerWidth, 0.07, 0.93);
    });

    const release = (e) => {
      if (!this.drag) return;
      try { c.releasePointerCapture(e.pointerId); } catch { /* released */ }
      this.drag = null;
      c.style.cursor = '';
    };
    c.addEventListener('pointerup', release);
    c.addEventListener('pointercancel', release);
  }

  stopCoaching() {
    if (this.touched) return;
    this.touched = true;
    document.getElementById('seal-hint')?.classList.add('off');
  }

  /* ---------- the meeting ---------- */

  meet() {
    if (this.state !== 'idle') return;
    this.state = 'met';
    this.metT = performance.now();
    this.stopCoaching();
    document.getElementById('tap-open')?.classList.remove('show');
    const m = this.metrics();
    const cx = (this.fig.groom.x + this.fig.bride.x) / 2 * m.w;
    for (let i = 0; i < 60; i++) {
      const a = Math.random() * TAU;
      const sp = 1 + Math.random() * 3.4;
      this.sparks.push({
        x: cx, y: m.gy - m.s * 1.05,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 1.6,
        life: 1, decay: 0.008 + Math.random() * 0.014, r: 1 + Math.random() * 2
      });
    }
  }

  /* ---------- drawing ---------- */

  drawSoul(ctx, x, gy, s, { dress = false, dir = 1, lean = 0, armT = 1 } = {}) {
    ctx.save();
    ctx.translate(x, gy);
    ctx.rotate(lean * 0.1 * dir);
    ctx.lineCap = 'round';
    // ground shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.ellipse(0, 4, s * 0.6, s * 0.13, 0, 0, TAU);
    ctx.fill();
    // body
    ctx.strokeStyle = dress ? '#8d6f5a' : '#c79f6e';
    ctx.lineWidth = 2.2;
    ctx.fillStyle = dress ? '#f4e9d8' : '#454c5c';
    ctx.beginPath();
    if (dress) {
      ctx.moveTo(-s * 0.16, -s * 1.3);
      ctx.lineTo(s * 0.16, -s * 1.3);
      ctx.lineTo(s * 0.5, 0);
      ctx.lineTo(-s * 0.5, 0);
    } else {
      ctx.moveTo(-s * 0.28, -s * 1.3);
      ctx.lineTo(s * 0.28, -s * 1.3);
      ctx.lineTo(s * 0.22, 0);
      ctx.lineTo(-s * 0.22, 0);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    if (!dress) {
      ctx.beginPath();
      ctx.moveTo(-s * 0.1, 0); ctx.lineTo(-s * 0.1, s * 0.06);
      ctx.moveTo(s * 0.1, 0); ctx.lineTo(s * 0.1, s * 0.06);
      ctx.stroke();
    }
    // the thread arm, reaching toward the other
    ctx.strokeStyle = '#f3d4ba';
    ctx.lineWidth = s * 0.11;
    ctx.beginPath();
    ctx.moveTo(dir * s * 0.16, -s * 1.16);
    ctx.quadraticCurveTo(dir * s * 0.46, -s * (1.16 - 0.1 * armT), dir * s * 0.66, -s * (1.3 - 0.26 * armT));
    ctx.stroke();
    // head
    ctx.fillStyle = '#f6d7bf';
    ctx.strokeStyle = '#5d4435';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(0, -s * 1.68, s * 0.38, 0, TAU);
    ctx.fill();
    ctx.stroke();
    if (dress) {
      // a long fall of hair
      ctx.fillStyle = 'rgba(84, 57, 31, 0.92)';
      ctx.beginPath();
      ctx.moveTo(-dir * s * 0.3, -s * 1.95);
      ctx.quadraticCurveTo(-dir * s * 0.62, -s * 1.3, -dir * s * 0.42, -s * 0.72);
      ctx.quadraticCurveTo(-dir * s * 0.22, -s * 1.1, -dir * s * 0.16, -s * 1.5);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  threadPath(m) {
    const g = this.handOf('groom', m);
    const b = this.handOf('bride', m);
    const gap = Math.abs(b.x - g.x);
    const maxGap = m.w * 0.72;
    const tension = clamp(1 - gap / maxGap, 0, 1);
    const t = (performance.now() - this.start) / 1000;
    const sag = clamp(gap * 0.3, 14, m.h * 0.24) * (1 - tension * 0.85)
      * (1 + Math.sin(t * 0.9) * 0.06);
    return { g, b, gap, tension, cp: { x: (g.x + b.x) / 2, y: Math.max(g.y, b.y) + sag } };
  }

  pointOn(tp, u) {
    const k = 1 - u;
    return {
      x: k * k * tp.g.x + 2 * k * u * tp.cp.x + u * u * tp.b.x,
      y: k * k * tp.g.y + 2 * k * u * tp.cp.y + u * u * tp.b.y
    };
  }

  loop() {
    if (this.opened === 'done' || !this.canvas.isConnected) return;
    requestAnimationFrame(this._loop);

    const m = this.metrics();
    const { w, h, gy, s } = m;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    if (this.canvas.width !== Math.round(w * dpr)) {
      this.canvas.width = Math.round(w * dpr);
      this.canvas.height = Math.round(h * dpr);
    }
    const ctx = this.ctx;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const t = (performance.now() - this.start) / 1000;

    // ----- sky
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#13101f');
    sky.addColorStop(0.72, '#33233c');
    sky.addColorStop(1, '#46293f');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);
    for (const st of this.stars) {
      const tw = 0.3 + 0.7 * Math.abs(Math.sin(t * 1.1 + st.ph));
      ctx.fillStyle = `rgba(244, 222, 178, ${0.75 * tw})`;
      ctx.beginPath();
      ctx.arc(st.x * w, st.y * h, st.s, 0, TAU);
      ctx.fill();
    }
    // hills
    ctx.fillStyle = 'rgba(16, 11, 22, 0.55)';
    ctx.beginPath();
    ctx.moveTo(0, h);
    ctx.quadraticCurveTo(w * 0.3, gy - h * 0.06, w * 0.62, gy + h * 0.02);
    ctx.quadraticCurveTo(w * 0.85, gy + h * 0.06, w, gy);
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#100b16';
    ctx.beginPath();
    ctx.moveTo(0, h);
    ctx.lineTo(0, gy + 4);
    ctx.quadraticCurveTo(w * 0.5, gy - 8, w, gy + 6);
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();

    // ----- state machine
    if (this.state === 'idle') {
      // coach: figures take turns leaning toward each other
      if (!this.touched) {
        const turn = Math.floor(t / 2.6) % 2;
        this.fig.groom.lean += (((turn === 0 && (t % 2.6) < 1.2) ? 1 : 0) - this.fig.groom.lean) * 0.06;
        this.fig.bride.lean += (((turn === 1 && (t % 2.6) < 1.2) ? -1 : 0) - this.fig.bride.lean) * 0.06;
      } else {
        this.fig.groom.lean *= 0.92;
        this.fig.bride.lean *= 0.92;
      }
      if (this.auto) {
        // tap-to-open: the thread reels them in
        this.fig.groom.x += (0.5 - this.fig.groom.x) * 0.055;
        this.fig.bride.x += (0.5 - this.fig.bride.x) * 0.055;
      } else if (this.drag) {
        // magnet: the far one drifts in once the thread is short
        const other = this.drag.key === 'groom' ? 'bride' : 'groom';
        const gapF = Math.abs(this.fig.bride.x - this.fig.groom.x);
        const pull = Math.max(0, 1 - gapF / 0.34);
        const dir2 = this.fig[this.drag.key].x > this.fig[other].x ? 1 : -1;
        this.fig[other].x = clamp(this.fig[other].x + pull * 0.004 * dir2, 0.07, 0.93);
        this.fig[other].lean = pull * (other === 'groom' ? 1 : -1);
      }
      const gapPx = Math.abs(this.fig.bride.x - this.fig.groom.x) * w;
      if (gapPx < s * 1.55) this.meet();
    }

    let met = 0; // 0..1 through the meeting timeline
    if (this.state === 'met') {
      met = clamp((performance.now() - this.metT) / 2300, 0, 1);
      const glide = ease(clamp(met / 0.3, 0, 1));
      const targetG = 0.5 - (s * 0.62) / w;
      const targetB = 0.5 + (s * 0.62) / w;
      this.fig.groom.x += (targetG - this.fig.groom.x) * glide * 0.4;
      this.fig.bride.x += (targetB - this.fig.bride.x) * glide * 0.4;
      this.fig.groom.lean = glide * 0.9;
      this.fig.bride.lean = -glide * 0.9;
      if (met >= 0.82 && !this.opened) {
        this.opened = true;
        this.onOpen();
        setTimeout(() => { this.opened = 'done'; }, 1600);
      }
    }

    // ----- the thread
    const tp = this.threadPath(m);
    const glowA = 0.35 + tp.tension * 0.65;
    if (met < 0.55) {
      ctx.save();
      ctx.globalAlpha = 1 - ease(clamp((met - 0.3) / 0.25, 0, 1));
      ctx.shadowColor = 'rgba(236, 96, 84, 0.9)';
      ctx.shadowBlur = 10 + tp.tension * 26;
      ctx.strokeStyle = `rgba(224, 92, 82, ${glowA})`;
      ctx.lineWidth = 2.2 + tp.tension * 1.4;
      ctx.beginPath();
      ctx.moveTo(tp.g.x, tp.g.y);
      ctx.quadraticCurveTo(tp.cp.x, tp.cp.y, tp.b.x, tp.b.y);
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = `rgba(255, 178, 158, ${0.5 + tp.tension * 0.5})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(tp.g.x, tp.g.y);
      ctx.quadraticCurveTo(tp.cp.x, tp.cp.y, tp.b.x, tp.b.y);
      ctx.stroke();
      ctx.restore();

      // coach bead riding the thread
      if (!this.touched && this.state === 'idle') {
        const u = (t % 3) / 3;
        const pos = this.pointOn(tp, this.fig.groom.x < this.fig.bride.x ? u : 1 - u);
        const halo = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, 26);
        halo.addColorStop(0, 'rgba(255, 196, 160, 0.85)');
        halo.addColorStop(1, 'rgba(255, 196, 160, 0)');
        ctx.fillStyle = halo;
        ctx.fillRect(pos.x - 26, pos.y - 26, 52, 52);
        ctx.fillStyle = '#ffe6cf';
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 3, 0, TAU);
        ctx.fill();
      }

      // tension sparks shedding off the thread
      if (tp.tension > 0.25 && performance.now() - this.lastSpark > 90 - tp.tension * 60) {
        this.lastSpark = performance.now();
        const pos = this.pointOn(tp, 0.2 + Math.random() * 0.6);
        this.sparks.push({
          x: pos.x, y: pos.y,
          vx: (Math.random() - 0.5) * 0.8, vy: -0.4 - Math.random() * 0.8,
          life: 1, decay: 0.018 + Math.random() * 0.02, r: 0.8 + Math.random() * 1.4
        });
      }
    }

    // ----- sparks
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const sp = this.sparks[i];
      sp.x += sp.vx; sp.y += sp.vy; sp.vy += 0.012;
      sp.life -= sp.decay;
      if (sp.life <= 0) { this.sparks.splice(i, 1); continue; }
      ctx.fillStyle = `rgba(255, ${Math.round(150 + sp.life * 80)}, 120, ${sp.life * 0.9})`;
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, sp.r, 0, TAU);
      ctx.fill();
    }

    // ----- figures
    const armT = this.state === 'met' ? 1 - ease(clamp(met / 0.4, 0, 1)) : 1;
    this.drawSoul(ctx, this.fig.groom.x * w, gy, s, { dir: 1, lean: this.fig.groom.lean, armT });
    this.drawSoul(ctx, this.fig.bride.x * w, gy, s, { dress: true, dir: -1, lean: this.fig.bride.lean, armT });

    // ----- the meeting: heart, coiling seal, flare
    if (this.state === 'met') {
      const cx = (this.fig.groom.x + this.fig.bride.x) / 2 * w;
      const hy = gy - s * 2.5;
      const bloom = ease(clamp((met - 0.18) / 0.3, 0, 1));
      if (bloom > 0.01) {
        const beat = 1 + Math.sin(t * 5.2) * 0.08;
        ctx.save();
        ctx.translate(cx, hy);
        ctx.scale(bloom * beat, bloom * beat);
        ctx.shadowColor = 'rgba(236, 96, 84, 0.9)';
        ctx.shadowBlur = 30;
        ctx.fillStyle = '#d96a5c';
        const hs = s * 0.42;
        ctx.beginPath();
        ctx.moveTo(0, hs * 0.9);
        ctx.bezierCurveTo(-hs * 1.4, -hs * 0.3, -hs * 0.5, -hs * 1.2, 0, -hs * 0.35);
        ctx.bezierCurveTo(hs * 0.5, -hs * 1.2, hs * 1.4, -hs * 0.3, 0, hs * 0.9);
        ctx.fill();
        ctx.restore();
        // the snapped thread coiling around the heart
        ctx.strokeStyle = `rgba(255, 150, 130, ${0.8 * (1 - met)})`;
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        for (let a = 0; a < TAU * 2.4; a += 0.12) {
          const rr = s * (1.4 - (a / (TAU * 2.4)) * 0.9) * (1 - bloom * 0.4);
          const px = cx + Math.cos(a + t * 2.4) * rr;
          const py = hy + Math.sin(a + t * 2.4) * rr * 0.7;
          a === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        ctx.stroke();
        // gold rays
        ctx.strokeStyle = `rgba(238, 196, 130, ${0.5 * bloom})`;
        ctx.lineWidth = 1.4;
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * TAU + t * 0.5;
          ctx.beginPath();
          ctx.moveTo(cx + Math.cos(a) * s * 1.1, hy + Math.sin(a) * s * 1.1);
          ctx.lineTo(cx + Math.cos(a) * s * 1.5, hy + Math.sin(a) * s * 1.5);
          ctx.stroke();
        }
      }
      // ignition flare
      const flare = ease(clamp((met - 0.6) / 0.4, 0, 1));
      if (flare > 0.01) {
        const fr = flare * Math.hypot(w, h) * 0.8;
        const fg = ctx.createRadialGradient(cx, hy, 0, cx, hy, Math.max(1, fr));
        fg.addColorStop(0, `rgba(255, 243, 218, ${flare})`);
        fg.addColorStop(0.65, `rgba(255, 226, 188, ${flare * 0.85})`);
        fg.addColorStop(1, 'rgba(255, 226, 188, 0)');
        ctx.fillStyle = fg;
        ctx.fillRect(0, 0, w, h);
      }
    }

    // vignette to match the film
    const vig = ctx.createRadialGradient(w / 2, h / 2, h * 0.42, w / 2, h / 2, h * 0.95);
    vig.addColorStop(0, 'rgba(10, 6, 4, 0)');
    vig.addColorStop(1, 'rgba(10, 6, 4, 0.3)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, w, h);
  }
}
