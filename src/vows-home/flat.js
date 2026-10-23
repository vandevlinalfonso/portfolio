/**
 * Open House — the flat. One wide canvas world (hallway → living room →
 * kitchen/dining), horizontally pannable. Twelve objects hold memories;
 * a corkboard holds the practical details; a guestbook takes RSVPs whose
 * wishes hang as frames on the gallery wall; a ring box on the bookshelf
 * unlocks after enough memories. Sugar & Omi live here (dogs.js).
 *
 * Engineering notes (see SPEC.md):
 *  - pan vs tap disambiguation: a pointer that moved < 8px is a tap
 *  - all mutable discovery state lives in instance fields, hit-tests in
 *    world coordinates (screen x + camera)
 *  - DPR setTransform pattern; draw in CSS px
 */

import { Dogs } from './dogs.js';

const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const ease = (t) => t * t * (3 - 2 * t);

const FOUND_KEY = 'vows-home-memories-v1';
const REVEAL_KEY = 'vows-home-reveal-v1';

/** layout: world-x as fraction of worldW, y as fraction of viewport h */
const SPOTS = {
  keybowl: { fx: 0.085, fy: 0.625, r: 46 },
  leashes: { fx: 0.148, fy: 0.46, r: 46 },
  journals: { fx: 0.272, fy: 0.75, r: 42 },
  phone: { fx: 0.318, fy: 0.765, r: 44 },
  sketch: { fx: 0.478, fy: 0.3, r: 46 },
  radio: { fx: 0.522, fy: 0.395, r: 46 },
  watch: { fx: 0.5495, fy: 0.4, r: 32 },
  snowglobe: { fx: 0.5495, fy: 0.3, r: 36 },
  brother: { fx: 0.5235, fy: 0.5, r: 36 },
  blueprints: { fx: 0.594, fy: 0.7, r: 46 },
  flashcards: { fx: 0.665, fy: 0.42, r: 52 },
  crates: { fx: 0.948, fy: 0.74, r: 56 },
  // specials
  corkboard: { fx: 0.19, fy: 0.37, r: 56 },
  ringbox: { fx: 0.5495, fy: 0.515, r: 38 },
  guestbook: { fx: 0.873, fy: 0.645, r: 56 },
  wishbook: { fx: 0.293, fy: 0.475, r: 48 }
};

export class Flat {
  /**
   * @param {object} cfg config.json
   * @param {object} hooks { onMemory, onDetails, onGuestbook, onRingbox,
   *                         onFrame, onDog, onFound, onPan }
   */
  constructor(cfg, hooks) {
    this.cfg = cfg;
    this.hooks = hooks;
    this.alive = true;
    this.stage = document.getElementById('flat');
    this.canvas = document.getElementById('flat-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

    this.memories = cfg.memories;
    this.byId = Object.fromEntries(cfg.memories.map((mm) => [mm.id, mm]));
    try {
      this.found = new Set(JSON.parse(localStorage.getItem(FOUND_KEY) || '[]'));
    } catch { this.found = new Set(); }
    this.revealSeen = false;
    try { this.revealSeen = localStorage.getItem(REVEAL_KEY) === '1'; } catch { /* fine */ }

    this.frames = [];           // gallery wall: { wish, fx, fy, fw, fh, tilt, pop }
    this.pointer = { x: 0, y: 0, active: false, down: false };
    this.hasPanned = false;
    this.snow = Array.from({ length: 26 }, () => ({
      x: Math.random(), y: Math.random(), v: 0.01 + Math.random() * 0.012, ph: Math.random() * 7
    }));

    this.resize();
    // start in the hallway, looking at the living room edge
    this.cam = 0;
    this.camT = 0;
    this.dogs = new Dogs({
      worldW: () => this.worldW,
      floorY: () => this.floorY(),
      size: () => Math.min(innerWidth, innerHeight) * 0.034,
      hotspots: () => this.memories.map((mm) => {
        const s = SPOTS[mm.id];
        return { id: mm.id, wx: s.fx * this.worldW, wy: s.fy * innerHeight, found: this.found.has(mm.id) };
      }),
      fridgeX: () => SPOTS.flashcards.fx * this.worldW,
      lines: cfg.dogLines
    });

    this.bindInput();
    window.addEventListener('resize', this._onResize = () => this.resize());
    this.start = performance.now();
    this.last = this.start;
    this._loop = this.loop.bind(this);
    requestAnimationFrame(this._loop);
  }

  /* ---------- geometry ---------- */

  resize() {
    const w = innerWidth;
    this.worldW = Math.max(2300, w * (w < 700 ? 4.2 : 3));
    if (this.cam !== undefined) {
      this.cam = clamp(this.cam, 0, this.worldW - w);
      this.camT = clamp(this.camT, 0, this.worldW - w);
    }
  }

  floorY() { return innerHeight * 0.84; }

  wx(id) { return SPOTS[id].fx * this.worldW; }
  wy(id) { return SPOTS[id].fy * innerHeight; }

  /** screen position of a hotspot (test handle) */
  screenPos(id) {
    return { x: this.wx(id) - this.cam, y: this.wy(id) };
  }

  panTo(fx, instant = false) {
    this.camT = clamp(fx * this.worldW - innerWidth / 2, 0, this.worldW - innerWidth);
    if (instant) this.cam = this.camT;
  }

  /**
   * Quick-nav: glide the camera to a hotspot (or a raw fraction), light a
   * beacon on it for a few seconds, and resolve once the camera settles.
   * @param {string|number} target SPOTS id or worldW fraction
   * @returns {Promise<void>}
   */
  flyTo(target) {
    const fx = typeof target === 'number' ? target : SPOTS[target].fx;
    if (typeof target === 'string' && !this.reduced) {
      this.beacon = target;
      this.beaconUntil = performance.now() + 3200;
    }
    this.panTo(fx, this.reduced);
    return new Promise((resolve) => {
      if (this.reduced) { resolve(); return; }
      this._flySettle = resolve;
    });
  }

  get gate() { return this.cfg.reveal.gate || 6; }
  get unlocked() { return this.found.size >= this.gate; }

  /* ---------- input ---------- */

  bindInput() {
    const c = this.stage;
    let drag = null;

    c.addEventListener('pointerdown', (e) => {
      if (e.target.closest('button, a, input, textarea, select, label')) return;
      drag = { x0: e.clientX, y0: e.clientY, cam0: this.camT, moved: false };
      c.setPointerCapture(e.pointerId);
    });
    c.addEventListener('pointermove', (e) => {
      this.pointer.x = e.clientX;
      this.pointer.y = e.clientY;
      this.pointer.active = true;
      // hovering UI chrome (quick-nav etc.) must not trigger edge panning
      this.pointer.ui = !!e.target.closest('button, a, nav');
      if (!drag) return;
      const dx = e.clientX - drag.x0;
      if (Math.abs(dx) > 8 || Math.abs(e.clientY - drag.y0) > 8) drag.moved = true;
      if (drag.moved) {
        this.camT = clamp(drag.cam0 - dx, 0, this.worldW - innerWidth);
        this.hasPanned = true;
        this.hooks.onPan?.();
      }
    });
    const up = (e) => {
      if (!drag) return;
      const wasTap = !drag.moved;
      drag = null;
      try { c.releasePointerCapture(e.pointerId); } catch { /* released */ }
      if (wasTap) this.tap(e.clientX, e.clientY);
    };
    c.addEventListener('pointerup', up);
    c.addEventListener('pointercancel', () => { drag = null; });

    c.addEventListener('wheel', (e) => {
      const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      this.camT = clamp(this.camT + d * 1.2, 0, this.worldW - innerWidth);
      this.hasPanned = true;
      this.hooks.onPan?.();
      e.preventDefault();
    }, { passive: false });

    window.addEventListener('keydown', this._onKey = (e) => {
      if (e.key === 'ArrowRight') { this.camT = clamp(this.camT + innerWidth * 0.4, 0, this.worldW - innerWidth); this.hasPanned = true; this.hooks.onPan?.(); }
      if (e.key === 'ArrowLeft') { this.camT = clamp(this.camT - innerWidth * 0.4, 0, this.worldW - innerWidth); this.hasPanned = true; this.hooks.onPan?.(); }
    });
  }

  tap(sx, sy) {
    const wxp = sx + this.cam, wyp = sy;
    // 1) gallery frames
    for (const f of this.frames) {
      if (Math.abs(wxp - f.fx) < f.fw / 2 + 8 && Math.abs(wyp - f.fy) < f.fh / 2 + 8) {
        this.hooks.onFrame?.(f.wish, sx, sy);
        return;
      }
    }
    // 2) hotspots
    const hitSpot = (id) => {
      const s = SPOTS[id];
      return Math.hypot(wxp - s.fx * this.worldW, wyp - s.fy * innerHeight) < Math.max(44, s.r);
    };
    if (hitSpot('ringbox')) {
      if (this.unlocked) {
        this.dogs.releaseGuard();
        this.hooks.onRingbox?.();
      } else {
        this.dogs.guardTo(this.wx('ringbox') - 60);
        this.hooks.onDog?.(this.cfg.reveal.guard, this.screenPos('ringbox').x, this.wy('ringbox') - 30);
      }
      return;
    }
    if (hitSpot('corkboard')) { this.hooks.onDetails?.(); return; }
    if (hitSpot('guestbook')) { this.hooks.onGuestbook?.(); return; }
    if (hitSpot('wishbook')) { this.hooks.onWishbook?.(); return; }
    for (const mm of this.memories) {
      if (hitSpot(mm.id)) {
        const fresh = !this.found.has(mm.id);
        if (fresh) {
          this.found.add(mm.id);
          try { localStorage.setItem(FOUND_KEY, JSON.stringify([...this.found])); } catch { /* fine */ }
          this.hooks.onFound?.(this.found.size, mm.id);
        }
        this.hooks.onMemory?.(mm, sx, sy, fresh);
        return;
      }
    }
    // 3) dogs
    const dogHit = this.dogs.hit(wxp, wyp);
    if (dogHit) this.hooks.onDog?.(dogHit.text, dogHit.x - this.cam, dogHit.y);
  }

  /* ---------- gallery wall ---------- */

  setFrames(wishes) {
    const W = this.worldW, h = innerHeight;
    const cx = 0.293 * W, cy = 0.295 * h;
    const cols = 4;
    this.frames = wishes.slice(0, 12).map((wish, i) => {
      const col = i % cols, row = Math.floor(i / cols);
      const jx = Math.sin(i * 12.9898) * 14;
      const jy = Math.cos(i * 78.233) * 8;
      const big = i % 3 === 0;
      const fw = (big ? 0.072 : 0.058) * Math.min(W * 0.33, 1900) * 0.32 + 52;
      return {
        wish,
        fx: cx + (col - (cols - 1) / 2) * (fw + 26) + jx,
        fy: cy + (row - 1) * (fw * 0.74 + 22) + jy,
        fw,
        fh: fw * 0.78,
        tilt: Math.sin(i * 4.7) * 0.04,
        pop: 0
      };
    });
  }

  addFrame(wish) {
    const W = this.worldW, h = innerHeight;
    const i = this.frames.length;
    const fw = 64;
    this.frames.push({
      wish,
      fx: 0.293 * W + Math.sin(i * 5.1) * W * 0.045,
      fy: 0.295 * h + Math.cos(i * 3.3) * h * 0.11,
      fw,
      fh: fw * 0.78,
      tilt: (Math.random() - 0.5) * 0.08,
      pop: 1
    });
  }

  reveal() {
    this.revealSeen = true;
    try { localStorage.setItem(REVEAL_KEY, '1'); } catch { /* fine */ }
  }

  /* ---------- frame loop ---------- */

  loop() {
    if (!this.alive) return;
    requestAnimationFrame(this._loop);
    const now = performance.now();
    const dt = Math.min(64, now - this.last);
    this.last = now;

    // edge-hover pan (desktop) — suspended over UI chrome and during flyTo
    if (this.pointer.active && !this.pointer.ui && !this._flySettle &&
        matchMedia('(hover: hover)').matches && !this.reduced) {
      const edge = 64;
      if (this.pointer.x < edge) this.camT = clamp(this.camT - dt * 0.32 * (1 - this.pointer.x / edge), 0, this.worldW - innerWidth);
      else if (this.pointer.x > innerWidth - edge) this.camT = clamp(this.camT + dt * 0.32 * (1 - (innerWidth - this.pointer.x) / edge), 0, this.worldW - innerWidth);
    }
    this.cam += (this.camT - this.cam) * 0.1;
    if (this._flySettle && Math.abs(this.camT - this.cam) < 4) {
      const settle = this._flySettle;
      this._flySettle = null;
      settle();
    }

    this.dogs.update(dt, now, this.pointer.x + this.cam, this.pointer.active);

    const w = innerWidth, h = innerHeight;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    if (this.canvas.width !== Math.round(w * dpr)) {
      this.canvas.width = Math.round(w * dpr);
      this.canvas.height = Math.round(h * dpr);
    }
    const ctx = this.ctx;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const t = (now - this.start) / 1000;

    this.draw(ctx, w, h, t);

    // hover cursor
    if (this.pointer.active) {
      const wxp = this.pointer.x + this.cam, wyp = this.pointer.y;
      const hotIds = [...this.memories.map((mm) => mm.id), 'corkboard', 'ringbox', 'guestbook', 'wishbook'];
      let hot = hotIds.some((id) => {
        const s = SPOTS[id];
        return Math.hypot(wxp - s.fx * this.worldW, wyp - s.fy * h) < Math.max(44, s.r);
      });
      if (!hot) hot = this.frames.some((f) => Math.abs(wxp - f.fx) < f.fw / 2 + 8 && Math.abs(wyp - f.fy) < f.fh / 2 + 8);
      if (!hot) hot = this.dogs.hover(wxp, wyp);
      this.stage.style.cursor = hot ? 'pointer' : 'grab';
    }
  }

  /* ---------- drawing ---------- */

  draw(ctx, w, h, t) {
    const cam = this.cam;
    const W = this.worldW;
    const fy = this.floorY();
    const X = (fx) => fx * W - cam;       // world fraction → screen x
    const vis = (fx, pad = 400) => {      // cheap culling
      const sx = X(fx);
      return sx > -pad && sx < w + pad;
    };

    /* --- walls, floor, light --- */
    const wall = ctx.createLinearGradient(0, 0, 0, h);
    wall.addColorStop(0, '#f3e9d4');
    wall.addColorStop(0.62, '#ead9bc');
    wall.addColorStop(0.621, '#dfcaa8');
    wall.addColorStop(1, '#d6bf9a');
    ctx.fillStyle = wall;
    ctx.fillRect(0, 0, w, h);
    // picture rail + wainscot line
    ctx.fillStyle = 'rgba(122, 92, 68, 0.25)';
    ctx.fillRect(0, h * 0.1, w, 2);
    ctx.fillRect(0, h * 0.62, w, 3);
    // floor
    const floor = ctx.createLinearGradient(0, fy, 0, h);
    floor.addColorStop(0, '#c2a075');
    floor.addColorStop(1, '#a07f56');
    ctx.fillStyle = floor;
    ctx.fillRect(0, fy, w, h - fy);
    ctx.fillStyle = 'rgba(90, 60, 36, 0.3)';
    ctx.fillRect(0, fy, w, 3);
    // floorboard seams scroll with the world
    ctx.strokeStyle = 'rgba(90, 66, 44, 0.18)';
    ctx.lineWidth = 1;
    const seam = 140;
    for (let x = -((cam % seam)); x < w; x += seam) {
      ctx.beginPath();
      ctx.moveTo(x, fy);
      ctx.lineTo(x - 30, h);
      ctx.stroke();
    }
    // golden hour pools
    for (const lf of [0.42, 0.76]) {
      if (!vis(lf, 700)) continue;
      const lx = X(lf);
      const pool = ctx.createRadialGradient(lx, h * 0.5, 0, lx, h * 0.5, h * 0.85);
      pool.addColorStop(0, 'rgba(255, 214, 150, 0.22)');
      pool.addColorStop(1, 'rgba(255, 214, 150, 0)');
      ctx.fillStyle = pool;
      ctx.fillRect(lx - h, 0, h * 2, h);
    }

    /* --- room dividers: slim wall returns, ceiling to floor --- */
    for (const df of [0.215, 0.625]) {
      if (!vis(df)) continue;
      const dx = X(df);
      ctx.fillStyle = 'rgba(214, 191, 154, 0.9)';
      ctx.fillRect(dx - 9, 0, 18, fy);
      ctx.fillStyle = 'rgba(122, 92, 68, 0.3)';
      ctx.fillRect(dx - 9, 0, 2.5, fy);
      ctx.fillRect(dx + 6.5, 0, 2.5, fy);
    }

    this.drawHallway(ctx, X, w, h, fy, t);
    this.drawLiving(ctx, X, w, h, fy, t, cam);
    this.drawKitchen(ctx, X, w, h, fy, t);

    /* --- dogs --- */
    this.dogs.draw(ctx, cam, t);

    /* --- hotspot glows --- */
    for (const mm of this.memories) {
      const s = SPOTS[mm.id];
      if (!vis(s.fx, 200)) continue;
      const sx = X(s.fx), sy = s.fy * h;
      if (this.found.has(mm.id)) {
        // a small terracotta heart, quietly satisfied
        ctx.fillStyle = 'rgba(194, 96, 79, 0.85)';
        ctx.save();
        ctx.translate(sx, sy - Math.max(30, s.r * 0.8) - 12);
        ctx.scale(0.62, 0.62);
        ctx.beginPath();
        ctx.moveTo(0, 4);
        ctx.bezierCurveTo(-9, -6, -2, -12, 0, -6);
        ctx.bezierCurveTo(2, -12, 9, -6, 0, 4);
        ctx.fill();
        ctx.restore();
      } else if (!this.reduced) {
        const near = this.pointer.active &&
          Math.hypot(this.pointer.x - sx, this.pointer.y - sy) < 130;
        const a = (near ? 0.4 : 0.16) + 0.08 * Math.sin(t * 2.2 + s.fx * 40);
        const halo = ctx.createRadialGradient(sx, sy, 0, sx, sy, s.r * 1.5);
        halo.addColorStop(0, `rgba(255, 214, 140, ${a})`);
        halo.addColorStop(1, 'rgba(255, 214, 140, 0)');
        ctx.fillStyle = halo;
        ctx.fillRect(sx - s.r * 2, sy - s.r * 2, s.r * 4, s.r * 4);
        // tiny twinkle
        const tw = 0.5 + 0.5 * Math.sin(t * 3 + s.fx * 90);
        ctx.strokeStyle = `rgba(255, 240, 200, ${0.5 * tw + (near ? 0.4 : 0)})`;
        ctx.lineWidth = 1.4;
        const star = 4 + tw * 2.4;
        ctx.beginPath();
        ctx.moveTo(sx - star, sy);
        ctx.lineTo(sx + star, sy);
        ctx.moveTo(sx, sy - star);
        ctx.lineTo(sx, sy + star);
        ctx.stroke();
      }
    }

    /* --- quick-nav beacon: a louder pulse on the target hotspot --- */
    if (this.beacon && performance.now() < this.beaconUntil) {
      const s = SPOTS[this.beacon];
      const sx = X(s.fx), sy = s.fy * h;
      const k = 0.5 + 0.5 * Math.sin(t * 5);
      const br = s.r * (1.6 + k * 0.5);
      const halo = ctx.createRadialGradient(sx, sy, 0, sx, sy, br);
      halo.addColorStop(0, `rgba(255, 214, 140, ${0.45 + k * 0.25})`);
      halo.addColorStop(1, 'rgba(255, 214, 140, 0)');
      ctx.fillStyle = halo;
      ctx.fillRect(sx - br, sy - br, br * 2, br * 2);
      ctx.strokeStyle = `rgba(194, 96, 79, ${0.7 - k * 0.4})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(sx, sy, s.r * (1 + k * 0.7), 0, TAU);
      ctx.stroke();
    } else {
      this.beacon = null;
    }

    // soft vignette
    const vig = ctx.createRadialGradient(w / 2, h / 2, h * 0.5, w / 2, h / 2, h * 1.1);
    vig.addColorStop(0, 'rgba(70, 46, 24, 0)');
    vig.addColorStop(1, 'rgba(70, 46, 24, 0.18)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, w, h);
  }

  /* ---------- hallway ---------- */

  drawHallway(ctx, X, w, h, fy, t) {
    // the front door, seen from inside
    if (X(0.035) > -300) {
      const dx = X(0.035), dw = Math.min(w, h) * 0.21, dh = dw * 2.1;
      ctx.fillStyle = '#8a6a48';
      ctx.fillRect(dx - dw / 2 - 9, fy - dh - 9, dw + 18, dh + 9);
      ctx.fillStyle = '#a87c52';
      ctx.fillRect(dx - dw / 2, fy - dh, dw, dh);
      ctx.strokeStyle = 'rgba(74, 50, 32, 0.5)';
      ctx.lineWidth = 2;
      ctx.strokeRect(dx - dw * 0.36, fy - dh * 0.92, dw * 0.72, dh * 0.36);
      ctx.strokeRect(dx - dw * 0.36, fy - dh * 0.5, dw * 0.72, dh * 0.4);
      ctx.fillStyle = '#e0b66a';
      ctx.beginPath();
      ctx.arc(dx + dw * 0.34, fy - dh * 0.48, 5, 0, TAU);
      ctx.fill();
      // mat inside
      ctx.fillStyle = '#b05c48';
      ctx.beginPath();
      ctx.moveTo(dx - dw * 0.56, fy + 8);
      ctx.lineTo(dx + dw * 0.56, fy + 8);
      ctx.lineTo(dx + dw * 0.64, fy + 26);
      ctx.lineTo(dx - dw * 0.64, fy + 26);
      ctx.closePath();
      ctx.fill();
    }
    // console table + key bowl (memory: keybowl)
    if (X(0.085) > -300) {
      const cx = X(0.085), cw = Math.min(w, h) * 0.17, cy = h * 0.66;
      ctx.fillStyle = '#7a5c44';
      ctx.fillRect(cx - cw / 2, cy, cw, 7);
      ctx.fillRect(cx - cw / 2 + 6, cy + 7, 7, fy - cy - 7);
      ctx.fillRect(cx + cw / 2 - 13, cy + 7, 7, fy - cy - 7);
      // bowl with keys + lanyard spilling out
      ctx.fillStyle = '#c2604f';
      ctx.beginPath();
      ctx.arc(cx, cy - 4, cw * 0.16, 0, Math.PI);
      ctx.fill();
      ctx.strokeStyle = '#e0b66a';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.arc(cx - 6, cy - 10, 4, 0, TAU);
      ctx.moveTo(cx + 2, cy - 8);
      ctx.lineTo(cx + 8, cy - 14);
      ctx.stroke();
      // lanyard ribbon hanging over the edge
      ctx.strokeStyle = '#5a6892';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(cx + cw * 0.13, cy - 6);
      ctx.quadraticCurveTo(cx + cw * 0.22, cy + 14, cx + cw * 0.17, cy + 34);
      ctx.stroke();
      ctx.fillStyle = '#fdf6e8';
      ctx.fillRect(cx + cw * 0.12, cy + 34, 14, 18);
      // mirror above
      ctx.strokeStyle = '#caa86a';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.ellipse(cx, h * 0.42, cw * 0.3, cw * 0.4, 0, 0, TAU);
      ctx.stroke();
      ctx.fillStyle = 'rgba(220, 230, 240, 0.35)';
      ctx.fill();
    }
    // dog beds
    if (X(0.118) > -300) {
      const bx = X(0.118);
      for (const [off, col] of [[-26, '#d8b794'], [30, '#9aa4b8']]) {
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.ellipse(bx + off, fy - 6, 34, 12, 0, 0, TAU);
        ctx.fill();
        ctx.fillStyle = 'rgba(70, 46, 24, 0.25)';
        ctx.beginPath();
        ctx.ellipse(bx + off, fy - 8, 24, 7, 0, 0, TAU);
        ctx.fill();
      }
    }
    // coat hooks + leashes (memory: leashes)
    if (X(0.148) > -300) {
      const hx = X(0.148), hy = h * 0.4;
      ctx.fillStyle = '#7a5c44';
      ctx.fillRect(hx - 52, hy - 8, 104, 8);
      for (const off of [-36, 0, 36]) {
        ctx.fillStyle = '#caa86a';
        ctx.beginPath();
        ctx.arc(hx + off, hy + 4, 4, 0, TAU);
        ctx.fill();
      }
      // two leashes
      for (const [off, col] of [[0, '#c2604f'], [36, '#5a6892']]) {
        ctx.strokeStyle = col;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(hx + off, hy + 6);
        ctx.quadraticCurveTo(hx + off - 10, hy + 60, hx + off + 4 + Math.sin(t + off) * 2, hy + 110);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(hx + off + 4, hy + 116, 7, 0, TAU);
        ctx.stroke();
      }
      // a winter coat on the first hook (kept clear of the corkboard)
      ctx.fillStyle = '#6a7a8c';
      ctx.beginPath();
      ctx.moveTo(hx - 52, hy + 8);
      ctx.lineTo(hx - 24, hy + 8);
      ctx.lineTo(hx - 18, hy + 120);
      ctx.lineTo(hx - 58, hy + 120);
      ctx.closePath();
      ctx.fill();
    }
    // corkboard (details) + pinned name tag (memory: nametag)
    if (X(0.19) > -300) {
      const bx = X(0.19), by = h * 0.37, bw = Math.min(w, h) * 0.165, bh = bw * 0.74;
      ctx.fillStyle = '#caa86a';
      ctx.fillRect(bx - bw / 2 - 6, by - bh / 2 - 6, bw + 12, bh + 12);
      ctx.fillStyle = '#c8a06a';
      ctx.fillRect(bx - bw / 2, by - bh / 2, bw, bh);
      ctx.fillStyle = 'rgba(150, 110, 60, 0.4)';
      ctx.fillRect(bx - bw / 2, by - bh / 2, bw, bh);
      // save-the-date card
      ctx.save();
      ctx.translate(bx - bw * 0.22, by - bh * 0.18);
      ctx.rotate(-0.04);
      ctx.fillStyle = '#fdf6e8';
      ctx.fillRect(-bw * 0.21, -bh * 0.24, bw * 0.42, bh * 0.46);
      ctx.fillStyle = '#c2604f';
      ctx.font = `700 ${Math.max(8, bw * 0.052)}px Georgia, serif`;
      ctx.textAlign = 'center';
      ctx.fillText('SAVE', 0, -bh * 0.1);
      ctx.fillText('THE DATE', 0, -bh * 0.02);
      ctx.fillStyle = '#3d342b';
      ctx.font = `italic ${Math.max(8, bw * 0.055)}px Caveat, cursive`;
      ctx.fillText('08 · 05 · 2027', 0, bh * 0.1);
      ctx.restore();
      // mini map card
      ctx.save();
      ctx.translate(bx + bw * 0.22, by - bh * 0.16);
      ctx.rotate(0.05);
      ctx.fillStyle = '#fdf6e8';
      ctx.fillRect(-bw * 0.17, -bh * 0.2, bw * 0.34, bh * 0.38);
      ctx.strokeStyle = '#8ca0be';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-bw * 0.12, bh * 0.14);
      ctx.quadraticCurveTo(0, -bh * 0.05, bw * 0.1, -bh * 0.16);
      ctx.stroke();
      ctx.fillStyle = '#c2604f';
      ctx.beginPath();
      ctx.arc(bw * 0.04, -bh * 0.04, 3.5, 0, TAU);
      ctx.fill();
      ctx.restore();
      // pins
      for (const [px2, py2] of [[bx - bw * 0.22, by - bh * 0.4], [bx + bw * 0.22, by - bh * 0.34]]) {
        ctx.fillStyle = '#c2604f';
        ctx.beginPath();
        ctx.arc(px2, py2, 3.4, 0, TAU);
        ctx.fill();
      }
      ctx.textAlign = 'left';
    }
  }

  /* ---------- living room ---------- */

  drawLiving(ctx, X, w, h, fy, t, cam) {
    // gallery wall (wish frames)
    for (const f of this.frames) {
      const sx = f.fx - cam;
      if (sx < -150 || sx > w + 150) continue;
      f.pop = Math.max(0, f.pop - 0.02);
      const k = 1 + ease(f.pop) * 0.25;
      const hover = this.pointer.active &&
        Math.abs(this.pointer.x - sx) < f.fw / 2 + 8 && Math.abs(this.pointer.y - f.fy) < f.fh / 2 + 8;
      ctx.save();
      ctx.translate(sx, f.fy - (hover ? 4 : 0));
      ctx.rotate(f.tilt + (f.pop > 0 ? Math.sin(f.pop * 18) * 0.06 * f.pop : 0));
      ctx.scale(k, k);
      ctx.shadowColor = 'rgba(70, 46, 24, 0.35)';
      ctx.shadowBlur = hover ? 14 : 8;
      ctx.shadowOffsetY = 5;
      ctx.fillStyle = f.wish.mine ? '#c2604f' : '#7a5c44';
      ctx.fillRect(-f.fw / 2, -f.fh / 2, f.fw, f.fh);
      ctx.shadowColor = 'transparent';
      ctx.fillStyle = '#fdf6e8';
      ctx.fillRect(-f.fw / 2 + 5, -f.fh / 2 + 5, f.fw - 10, f.fh - 10);
      ctx.fillStyle = '#3d342b';
      ctx.font = `600 ${Math.max(9, f.fw * 0.14)}px Caveat, cursive`;
      ctx.textAlign = 'center';
      const nm = f.wish.name.length > 14 ? f.wish.name.slice(0, 13) + '…' : f.wish.name;
      ctx.fillText(nm, 0, 0);
      // ruled "wish" lines
      ctx.strokeStyle = 'rgba(122, 96, 70, 0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-f.fw * 0.3, f.fh * 0.14);
      ctx.lineTo(f.fw * 0.3, f.fh * 0.14);
      ctx.moveTo(-f.fw * 0.3, f.fh * 0.24);
      ctx.lineTo(f.fw * 0.16, f.fh * 0.24);
      ctx.stroke();
      // country stamp
      if (f.wish.country) {
        ctx.strokeStyle = 'rgba(194, 96, 79, 0.7)';
        ctx.setLineDash([2, 2]);
        ctx.beginPath();
        ctx.arc(f.fw * 0.3, -f.fh * 0.24, f.fw * 0.1, 0, TAU);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(194, 96, 79, 0.85)';
        ctx.font = `600 ${Math.max(6, f.fw * 0.09)}px Georgia, serif`;
        ctx.fillText(f.wish.country, f.fw * 0.3, -f.fh * 0.21);
      }
      ctx.textAlign = 'left';
      ctx.restore();
    }
    // a swinging paper tag under the wall — opens the unabridged guest book
    if (this.frames.length && X(0.293) > -400 && X(0.293) < w + 400) {
      const tx = X(0.293), ty = h * 0.475;
      const sway = this.reduced ? 0 : Math.sin(t * 1.3) * 0.05;
      // nail + string
      ctx.fillStyle = '#8a7a66';
      ctx.beginPath();
      ctx.arc(tx, ty - 30, 3, 0, TAU);
      ctx.fill();
      ctx.save();
      ctx.translate(tx, ty - 30);
      ctx.rotate(sway);
      ctx.strokeStyle = 'rgba(122, 92, 68, 0.7)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, 16);
      ctx.stroke();
      // the tag
      ctx.translate(0, 16);
      ctx.rotate(sway * 0.6);
      const tw = 132, th = 30;
      ctx.shadowColor = 'rgba(70, 46, 24, 0.3)';
      ctx.shadowBlur = 6;
      ctx.shadowOffsetY = 3;
      ctx.fillStyle = '#fffdf6';
      ctx.beginPath();
      ctx.moveTo(-tw / 2 + 10, 0);
      ctx.lineTo(tw / 2, 0);
      ctx.lineTo(tw / 2, th);
      ctx.lineTo(-tw / 2 + 10, th);
      ctx.lineTo(-tw / 2, th / 2);
      ctx.closePath();
      ctx.fill();
      ctx.shadowColor = 'transparent';
      ctx.strokeStyle = 'rgba(185, 138, 71, 0.55)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = '#c2604f';
      ctx.beginPath();
      ctx.arc(-tw / 2 + 12, th / 2, 2.5, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#3d342b';
      ctx.font = '600 15px Caveat, cursive';
      ctx.textAlign = 'center';
      ctx.fillText('read all the wishes', 7, th / 2 + 5);
      ctx.textAlign = 'left';
      ctx.restore();
    }

    // sofa
    if (X(0.3) > -400 && X(0.3) < w + 400) {
      const sx = X(0.3), sw = Math.min(w, h) * 0.34, sy = fy - Math.min(w, h) * 0.13;
      ctx.fillStyle = '#b3674f';
      ctx.beginPath();
      ctx.roundRect(sx - sw / 2, sy, sw, fy - sy - 6, 12);
      ctx.fill();
      ctx.fillStyle = '#c2755c';
      ctx.beginPath();
      ctx.roundRect(sx - sw / 2 - 16, sy - 14, 22, fy - sy + 8, 8);
      ctx.roundRect(sx + sw / 2 - 6, sy - 14, 22, fy - sy + 8, 8);
      ctx.fill();
      // cushions
      ctx.fillStyle = '#e0b66a';
      ctx.beginPath();
      ctx.roundRect(sx - sw * 0.36, sy - 4, sw * 0.3, 14, 6);
      ctx.fill();
      ctx.fillStyle = '#8a9b77';
      ctx.beginPath();
      ctx.roundRect(sx + sw * 0.08, sy - 4, sw * 0.3, 14, 6);
      ctx.fill();
      // throw blanket
      ctx.fillStyle = 'rgba(244, 226, 198, 0.85)';
      ctx.beginPath();
      ctx.moveTo(sx + sw * 0.3, sy);
      ctx.lineTo(sx + sw * 0.5, sy);
      ctx.lineTo(sx + sw * 0.46, fy - 8);
      ctx.lineTo(sx + sw * 0.34, fy - 8);
      ctx.closePath();
      ctx.fill();
    }
    // coffee table in front of the sofa: journals (memory) + notebook (memory)
    if (X(0.295) > -400 && X(0.295) < w + 400) {
      const cx = X(0.295), cw = Math.min(w, h) * 0.22, cy = h * 0.775;
      ctx.fillStyle = '#7a5c44';
      ctx.fillRect(cx - cw / 2, cy, cw, 6);
      ctx.fillRect(cx - cw / 2 + 8, cy + 6, 6, fy - cy - 6);
      ctx.fillRect(cx + cw / 2 - 14, cy + 6, 6, fy - cy - 6);
      // journals stack (left, memory)
      const jx = X(0.272);
      for (let i = 0; i < 4; i++) {
        ctx.fillStyle = ['#a8503f', '#5a6892', '#8a9b77', '#caa86a'][i];
        ctx.fillRect(jx - 26 + (i % 2) * 4, cy - 9 - i * 8, 52, 8);
      }
      ctx.strokeStyle = 'rgba(60, 40, 24, 0.6)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(jx - 2, cy - 42);
      ctx.lineTo(jx - 2, cy);
      ctx.stroke(); // the rubber band
      // the phone (right, memory) — propped against a coaster, screen aglow
      const nx = X(0.318);
      ctx.save();
      ctx.translate(nx, cy - 4);
      ctx.rotate(-0.18);
      ctx.fillStyle = '#2c2824';
      ctx.beginPath();
      ctx.roundRect(-13, -42, 26, 46, 5);
      ctx.fill();
      const scr = ctx.createLinearGradient(0, -38, 0, 0);
      scr.addColorStop(0, '#fbe9c8');
      scr.addColorStop(1, '#e8c188');
      ctx.fillStyle = scr;
      ctx.beginPath();
      ctx.roundRect(-10, -38, 20, 38, 3);
      ctx.fill();
      // two tiny chat bubbles on screen
      ctx.fillStyle = '#5a6892';
      ctx.beginPath();
      ctx.roundRect(-7, -32, 11, 6, 3);
      ctx.fill();
      ctx.fillStyle = '#c2604f';
      ctx.beginPath();
      ctx.roundRect(-4, -22, 11, 6, 3);
      ctx.fill();
      ctx.restore();
      // soft glow rising from the screen
      if (!this.reduced) {
        const pg = ctx.createRadialGradient(nx, cy - 26, 0, nx, cy - 26, 34);
        pg.addColorStop(0, `rgba(255, 226, 168, ${0.18 + 0.08 * Math.sin(t * 2.4)})`);
        pg.addColorStop(1, 'rgba(255, 226, 168, 0)');
        ctx.fillStyle = pg;
        ctx.fillRect(nx - 34, cy - 60, 68, 68);
      }
    }
    // window with winter dusk outside (parallax) + the moon
    if (X(0.42) > -500 && X(0.42) < w + 500) {
      this.drawWindow(ctx, X(0.42), h, Math.min(w, h) * 0.21, t, cam, true);
    }
    // framed kampung sketch (memory: sketch)
    if (X(0.472) > -300) {
      const sx = X(0.472), sy = h * 0.3, fw2 = Math.min(w, h) * 0.115;
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(-0.015);
      ctx.fillStyle = '#7a5c44';
      ctx.fillRect(-fw2 / 2 - 6, -fw2 * 0.38 - 6, fw2 + 12, fw2 * 0.76 + 12);
      ctx.fillStyle = '#f6eedc';
      ctx.fillRect(-fw2 / 2, -fw2 * 0.38, fw2, fw2 * 0.76);
      // pencil kampung: roof + palm
      ctx.strokeStyle = 'rgba(90, 70, 50, 0.8)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(-fw2 * 0.3, fw2 * 0.18);
      ctx.lineTo(-fw2 * 0.3, -fw2 * 0.02);
      ctx.quadraticCurveTo(-fw2 * 0.1, -fw2 * 0.26, fw2 * 0.1, -fw2 * 0.02);
      ctx.lineTo(fw2 * 0.1, fw2 * 0.18);
      ctx.moveTo(fw2 * 0.22, fw2 * 0.18);
      ctx.quadraticCurveTo(fw2 * 0.3, -fw2 * 0.1, fw2 * 0.26, -fw2 * 0.2);
      ctx.stroke();
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(fw2 * 0.26, -fw2 * 0.2);
        ctx.quadraticCurveTo(fw2 * (0.3 + i * 0.04), -fw2 * 0.26, fw2 * (0.34 + i * 0.05), -fw2 * (0.16 + i * 0.02));
        ctx.stroke();
      }
      ctx.restore();
    }
    // bookshelf: radio, snow globe, brother photo, ring box
    if (X(0.536) > -500 && X(0.536) < w + 500) {
      const bx = X(0.536), bw = Math.min(w, h) * 0.21, topY = h * 0.24, botY = fy;
      ctx.fillStyle = '#7a5c44';
      ctx.fillRect(bx - bw / 2, topY, 8, botY - topY);
      ctx.fillRect(bx + bw / 2 - 8, topY, 8, botY - topY);
      for (const sy of [0.27, 0.355, 0.47, 0.6, 0.72]) {
        ctx.fillRect(bx - bw / 2, h * sy + h * 0.06, bw, 6);
      }
      ctx.fillRect(bx - bw / 2, topY - 6, bw, 6);
      // books on a few shelves
      const bookRows = [[0.27, 7], [0.6, 9]];
      for (const [ry, n] of bookRows) {
        for (let i = 0; i < n; i++) {
          ctx.fillStyle = ['#a8503f', '#5a6892', '#8a9b77', '#caa86a', '#b3674f'][i % 5];
          const bh2 = h * 0.052 + (i % 3) * 4;
          ctx.fillRect(bx - bw / 2 + 12 + i * (bw - 30) / n, h * ry + h * 0.06 - bh2, (bw - 36) / n - 3, bh2);
        }
      }
      // snow globe (memory) — seated on the top shelf
      const gx = X(0.5495), gy2 = h * 0.328;
      ctx.fillStyle = 'rgba(210, 226, 240, 0.55)';
      ctx.beginPath();
      ctx.arc(gx, gy2 - 16, 14, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = 'rgba(122, 92, 68, 0.6)';
      ctx.lineWidth = 1.4;
      ctx.stroke();
      ctx.fillStyle = '#7a5c44';
      ctx.fillRect(gx - 10, gy2 - 4, 20, 6);
      ctx.fillStyle = '#8a92a8';
      ctx.beginPath();
      ctx.moveTo(gx - 7, gy2 - 12);
      ctx.lineTo(gx, gy2 - 22);
      ctx.lineTo(gx + 7, gy2 - 12);
      ctx.closePath();
      ctx.fill();
      // his father's wristwatch (memory) — second shelf, on a little stand
      const wx2 = X(0.5495), wy3 = h * 0.415;
      ctx.fillStyle = '#7a5c44';
      ctx.fillRect(wx2 - 9, wy3 - 8, 18, 8); // stand
      // strap draped over the stand
      ctx.strokeStyle = '#5a4634';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(wx2 - 7, wy3 - 8);
      ctx.quadraticCurveTo(wx2 - 12, wy3 - 26, wx2, wy3 - 30);
      ctx.quadraticCurveTo(wx2 + 12, wy3 - 26, wx2 + 7, wy3 - 8);
      ctx.stroke();
      // the face, gold-rimmed, still ticking
      ctx.fillStyle = '#fdf6e8';
      ctx.beginPath();
      ctx.arc(wx2, wy3 - 28, 9, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = '#e0b66a';
      ctx.lineWidth = 2.4;
      ctx.stroke();
      ctx.strokeStyle = '#3d342b';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(wx2, wy3 - 28);
      ctx.lineTo(wx2, wy3 - 34);
      ctx.moveTo(wx2, wy3 - 28);
      ctx.lineTo(wx2 + 4, wy3 - 26);
      ctx.stroke();
      if (!this.reduced) {
        // the second hand, faithfully going around
        const sa = (t % 60) / 60 * TAU - Math.PI / 2;
        ctx.strokeStyle = '#c2604f';
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        ctx.moveTo(wx2, wy3 - 28);
        ctx.lineTo(wx2 + Math.cos(sa) * 6.5, wy3 - 28 + Math.sin(sa) * 6.5);
        ctx.stroke();
      }
      // radio (memory) — seated on the second shelf, dial glowing
      const rx = X(0.522), ry2 = h * 0.411;
      ctx.fillStyle = '#4a4038';
      ctx.beginPath();
      ctx.roundRect(rx - 30, ry2 - 24, 60, 28, 4);
      ctx.fill();
      ctx.fillStyle = `rgba(255, 206, 130, ${0.55 + 0.3 * Math.sin(t * 1.6)})`;
      ctx.fillRect(rx - 20, ry2 - 16, 40, 7);
      ctx.fillStyle = '#221e1c';
      ctx.fillRect(rx - 20 + (0.5 + 0.5 * Math.sin(t * 0.4)) * 36, ry2 - 18, 2, 11);
      ctx.strokeStyle = '#4a4038';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(rx + 26, ry2 - 24);
      ctx.lineTo(rx + 36, ry2 - 44);
      ctx.stroke();
      // brother photo (memory) — seated on the third shelf
      const px2 = X(0.5235), py2 = h * 0.502;
      ctx.save();
      ctx.translate(px2, py2);
      ctx.rotate(0.03);
      ctx.fillStyle = '#caa86a';
      ctx.fillRect(-20, -26, 40, 50);
      ctx.fillStyle = '#fdf6e8';
      ctx.fillRect(-15, -21, 30, 36);
      // two small silhouettes, one taller in front
      ctx.fillStyle = '#8a6a52';
      ctx.beginPath();
      ctx.arc(-4, -8, 5, 0, TAU);
      ctx.fill();
      ctx.fillRect(-8, -4, 8, 14);
      ctx.beginPath();
      ctx.arc(7, -4, 3.6, 0, TAU);
      ctx.fill();
      ctx.fillRect(4, -1, 6, 11);
      ctx.restore();
      // THE RING BOX — third shelf right
      const kx = X(0.5495), ky = h * 0.528;
      const unlocked = this.unlocked;
      if (unlocked && !this.reduced) {
        const a = 0.3 + 0.2 * Math.sin(t * 2.6);
        const halo = ctx.createRadialGradient(kx, ky - 10, 0, kx, ky - 10, 60);
        halo.addColorStop(0, `rgba(255, 214, 140, ${a + 0.25})`);
        halo.addColorStop(1, 'rgba(255, 214, 140, 0)');
        ctx.fillStyle = halo;
        ctx.fillRect(kx - 70, ky - 80, 140, 140);
      }
      ctx.fillStyle = unlocked ? '#c2604f' : '#9a4f40';
      ctx.beginPath();
      ctx.roundRect(kx - 14, ky - 14, 28, 16, 3);
      ctx.fill();
      // lid: cracked open once unlocked, fully open after the reveal
      const lidA = this.revealSeen ? -1.2 : unlocked ? -0.35 - Math.sin(t * 2.6) * 0.06 : 0;
      ctx.save();
      ctx.translate(kx - 14, ky - 14);
      ctx.rotate(lidA);
      ctx.fillStyle = unlocked ? '#d4775f' : '#a85a48';
      ctx.beginPath();
      ctx.roundRect(0, -10, 28, 10, 3);
      ctx.fill();
      ctx.restore();
      if (this.revealSeen) {
        ctx.strokeStyle = '#e0b66a';
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.arc(kx, ky - 18, 6, 0, TAU);
        ctx.stroke();
        const tw = 0.5 + 0.5 * Math.sin(t * 5);
        ctx.fillStyle = `rgba(255, 240, 200, ${tw})`;
        ctx.beginPath();
        ctx.arc(kx + 5, ky - 23, 1.8, 0, TAU);
        ctx.fill();
      }
    }
    // blueprints in the corner (memory): a leather tube + two paper rolls
    if (X(0.594) > -300) {
      const tx = X(0.594);
      ctx.save();
      ctx.translate(tx, fy);
      ctx.rotate(-0.14);
      ctx.fillStyle = '#9a7a4e';
      ctx.beginPath();
      ctx.roundRect(-15, -h * 0.18, 30, h * 0.18, 5);
      ctx.fill();
      ctx.fillStyle = '#7a5c44';
      ctx.fillRect(-15, -h * 0.125, 30, 10); // strap band
      ctx.fillStyle = '#fdf6e8';
      ctx.beginPath();
      ctx.roundRect(-10, -h * 0.225, 20, h * 0.06, 8);
      ctx.fill();
      ctx.strokeStyle = '#5a6892';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(-6, -h * 0.205);
      ctx.lineTo(6, -h * 0.185);
      ctx.moveTo(-6, -h * 0.19);
      ctx.lineTo(4, -h * 0.175);
      ctx.stroke();
      ctx.restore();
      // a second roll leaning the other way
      ctx.save();
      ctx.translate(tx + 22, fy);
      ctx.rotate(0.1);
      ctx.fillStyle = '#f1e6cc';
      ctx.beginPath();
      ctx.roundRect(-7, -h * 0.15, 14, h * 0.15, 6);
      ctx.fill();
      ctx.strokeStyle = 'rgba(90, 104, 146, 0.5)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(0, -h * 0.15, 6, 0, TAU);
      ctx.stroke();
      ctx.restore();
      // floor lamp beside it
      const lx = tx + Math.min(w, h) * 0.06;
      ctx.strokeStyle = '#4a4038';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(lx, fy);
      ctx.lineTo(lx, h * 0.38);
      ctx.stroke();
      ctx.fillStyle = '#e8c188';
      ctx.beginPath();
      ctx.moveTo(lx - 26, h * 0.38);
      ctx.lineTo(lx + 26, h * 0.38);
      ctx.lineTo(lx + 16, h * 0.3);
      ctx.lineTo(lx - 16, h * 0.3);
      ctx.closePath();
      ctx.fill();
      const lampGlow = ctx.createRadialGradient(lx, h * 0.42, 0, lx, h * 0.42, h * 0.3);
      lampGlow.addColorStop(0, 'rgba(255, 214, 140, 0.3)');
      lampGlow.addColorStop(1, 'rgba(255, 214, 140, 0)');
      ctx.fillStyle = lampGlow;
      ctx.fillRect(lx - h * 0.3, h * 0.12, h * 0.6, h * 0.6);
    }
    // plants flanking the living room
    for (const pf of [0.225, 0.455]) {
      if (X(pf) > -200 && X(pf) < w + 200) this.drawPlant(ctx, X(pf), fy, Math.min(w, h) * 0.05, t);
    }
  }

  /* ---------- kitchen / dining ---------- */

  drawKitchen(ctx, X, w, h, fy, t) {
    // fridge with flashcard magnets (memory: flashcards)
    if (X(0.665) > -400 && X(0.665) < w + 400) {
      const fx2 = X(0.665), fw2 = Math.min(w, h) * 0.16, ftop = h * 0.24;
      ctx.fillStyle = '#e8e2d4';
      ctx.beginPath();
      ctx.roundRect(fx2 - fw2 / 2, ftop, fw2, fy - ftop, 8);
      ctx.fill();
      ctx.strokeStyle = 'rgba(122, 110, 96, 0.4)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(fx2 - fw2 / 2, h * 0.44);
      ctx.lineTo(fx2 + fw2 / 2, h * 0.44);
      ctx.stroke();
      ctx.fillStyle = '#b8b0a0';
      ctx.fillRect(fx2 + fw2 / 2 - 14, h * 0.34, 5, h * 0.07);
      ctx.fillRect(fx2 + fw2 / 2 - 14, h * 0.48, 5, h * 0.1);
      // flashcard magnets
      const cards = [['der', '#c2604f'], ['die', '#5a6892'], ['das', '#8a9b77'], ['Haus', '#caa86a'], ['rumah', '#c2604f']];
      cards.forEach(([word, col], i) => {
        const mx = fx2 - fw2 * 0.3 + (i % 2) * fw2 * 0.34;
        const my = h * 0.3 + Math.floor(i / 2) * h * 0.062;
        ctx.save();
        ctx.translate(mx, my);
        ctx.rotate(Math.sin(i * 5.3) * 0.1);
        ctx.fillStyle = '#fdf6e8';
        ctx.fillRect(-22, -11, 44, 22);
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.arc(14, -7, 3, 0, TAU);
        ctx.fill();
        ctx.fillStyle = '#3d342b';
        ctx.font = '600 11px Georgia, serif';
        ctx.textAlign = 'center';
        ctx.fillText(word, 0, 4);
        ctx.restore();
      });
      // a child-style drawing of two dogs, also magneted
      ctx.save();
      ctx.translate(fx2, h * 0.52);
      ctx.rotate(0.05);
      ctx.fillStyle = '#fdf6e8';
      ctx.fillRect(-26, -18, 52, 36);
      ctx.strokeStyle = '#caa86a';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.ellipse(-10, 2, 8, 5, 0, 0, TAU);
      ctx.stroke();
      ctx.strokeStyle = '#3d342b';
      ctx.beginPath();
      ctx.ellipse(10, 2, 8, 5, 0, 0, TAU);
      ctx.stroke();
      ctx.restore();
      ctx.textAlign = 'left';
    }
    // counter + sink + kitchen window
    if (X(0.755) > -500 && X(0.755) < w + 500) {
      const cx = X(0.755), cw = Math.min(w, h) * 0.3;
      this.drawWindow(ctx, cx, h, Math.min(w, h) * 0.13, t, this.cam, false);
      const cy = h * 0.66;
      ctx.fillStyle = '#8a9b77';
      ctx.fillRect(cx - cw / 2, cy, cw, fy - cy);
      ctx.fillStyle = '#d6c8aa';
      ctx.fillRect(cx - cw / 2 - 6, cy - 8, cw + 12, 10);
      // sink + tap
      ctx.fillStyle = '#b8b0a0';
      ctx.fillRect(cx - 26, cy - 6, 52, 6);
      ctx.strokeStyle = '#8a92a0';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(cx, cy - 8);
      ctx.lineTo(cx, cy - 26);
      ctx.lineTo(cx + 14, cy - 26);
      ctx.stroke();
      // kettle
      ctx.fillStyle = '#c2604f';
      ctx.beginPath();
      ctx.roundRect(cx + cw * 0.28, cy - 26, 26, 18, 4);
      ctx.fill();
      // steam
      if (!this.reduced) {
        ctx.strokeStyle = 'rgba(255, 250, 240, 0.5)';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(cx + cw * 0.28 + 13, cy - 30);
        ctx.quadraticCurveTo(cx + cw * 0.28 + 8 + Math.sin(t * 2) * 5, cy - 46, cx + cw * 0.28 + 14, cy - 60);
        ctx.stroke();
      }
      // cabinet doors
      ctx.strokeStyle = 'rgba(60, 70, 50, 0.4)';
      ctx.lineWidth = 2;
      for (let i = 1; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(cx - cw / 2 + (cw / 4) * i, cy + 8);
        ctx.lineTo(cx - cw / 2 + (cw / 4) * i, fy - 6);
        ctx.stroke();
      }
    }
    // wall calendar with the date circled (decor — the corkboard is the interactive)
    if (X(0.818) > -300) {
      const wx2 = X(0.818), wy2 = h * 0.33, cw2 = Math.min(w, h) * 0.085;
      ctx.fillStyle = '#fdf6e8';
      ctx.fillRect(wx2 - cw2 / 2, wy2 - cw2 * 0.65, cw2, cw2 * 1.3);
      ctx.fillStyle = '#c2604f';
      ctx.fillRect(wx2 - cw2 / 2, wy2 - cw2 * 0.65, cw2, cw2 * 0.3);
      ctx.fillStyle = '#fdf6e8';
      ctx.font = `700 ${Math.max(8, cw2 * 0.16)}px Georgia, serif`;
      ctx.textAlign = 'center';
      ctx.fillText('MAI', wx2, wy2 - cw2 * 0.43);
      ctx.strokeStyle = 'rgba(122, 96, 70, 0.35)';
      ctx.lineWidth = 1;
      for (let r = 0; r < 4; r++) {
        for (let cc = 0; cc < 5; cc++) {
          ctx.strokeRect(wx2 - cw2 * 0.4 + cc * cw2 * 0.16, wy2 - cw2 * 0.24 + r * cw2 * 0.18, cw2 * 0.14, cw2 * 0.15);
        }
      }
      ctx.strokeStyle = '#c2604f';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(wx2 - cw2 * 0.01, wy2 + 0.12 * cw2, cw2 * 0.11, cw2 * 0.11, 0, 0, TAU);
      ctx.stroke();
      ctx.textAlign = 'left';
    }
    // dining table with the guestbook (special: guestbook)
    if (X(0.873) > -500 && X(0.873) < w + 500) {
      const dx = X(0.873), dw2 = Math.min(w, h) * 0.27, dy2 = h * 0.685;
      // chairs behind
      for (const off of [-dw2 * 0.32, dw2 * 0.32]) {
        ctx.strokeStyle = '#7a5c44';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(dx + off - 16, fy);
        ctx.lineTo(dx + off - 16, dy2 - 36);
        ctx.lineTo(dx + off + 16, dy2 - 36);
        ctx.lineTo(dx + off + 16, fy);
        ctx.stroke();
      }
      ctx.fillStyle = '#8a6a48';
      ctx.fillRect(dx - dw2 / 2, dy2, dw2, 9);
      ctx.fillRect(dx - dw2 / 2 + 12, dy2 + 9, 8, fy - dy2 - 9);
      ctx.fillRect(dx + dw2 / 2 - 20, dy2 + 9, 8, fy - dy2 - 9);
      // the guestbook, open, with a pen and a small "sign us" tent card
      ctx.save();
      ctx.translate(dx, dy2 - 6);
      ctx.shadowColor = 'rgba(70, 46, 24, 0.3)';
      ctx.shadowBlur = 8;
      ctx.shadowOffsetY = 3;
      ctx.fillStyle = '#fdf6e8';
      ctx.beginPath();
      ctx.moveTo(-44, -10);
      ctx.quadraticCurveTo(0, -18, 44, -10);
      ctx.lineTo(44, 8);
      ctx.quadraticCurveTo(0, 0, -44, 8);
      ctx.closePath();
      ctx.fill();
      ctx.shadowColor = 'transparent';
      ctx.strokeStyle = 'rgba(122, 96, 70, 0.55)';
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, -14);
      ctx.lineTo(0, 4);
      ctx.stroke();
      // handwriting squiggles on the left page
      ctx.strokeStyle = 'rgba(90, 104, 146, 0.5)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(-36, -8 + i * 5);
        ctx.quadraticCurveTo(-20, -10 + i * 5, -6, -7 + i * 5);
        ctx.stroke();
      }
      // pen
      ctx.strokeStyle = '#3d342b';
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(8, -2);
      ctx.lineTo(34, -8);
      ctx.stroke();
      ctx.restore();
      // tent card
      ctx.save();
      ctx.translate(dx + dw2 * 0.32, dy2 - 16);
      ctx.fillStyle = '#c2604f';
      ctx.beginPath();
      ctx.moveTo(-22, 10);
      ctx.lineTo(0, -12);
      ctx.lineTo(22, 10);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#fdf6e8';
      ctx.font = '600 9px Caveat, cursive';
      ctx.textAlign = 'center';
      ctx.fillText('sign us!', 0, 5);
      ctx.restore();
      ctx.textAlign = 'left';
      // a vase
      ctx.fillStyle = '#5a6892';
      ctx.beginPath();
      ctx.moveTo(dx - dw2 * 0.34, dy2);
      ctx.quadraticCurveTo(dx - dw2 * 0.34 - 10, dy2 - 18, dx - dw2 * 0.34, dy2 - 30);
      ctx.quadraticCurveTo(dx - dw2 * 0.34 + 10, dy2 - 18, dx - dw2 * 0.34, dy2);
      ctx.fill();
      ctx.strokeStyle = '#c2604f';
      ctx.lineWidth = 2;
      for (const a of [-0.4, 0, 0.4]) {
        ctx.beginPath();
        ctx.moveTo(dx - dw2 * 0.34, dy2 - 28);
        ctx.quadraticCurveTo(dx - dw2 * 0.34 + a * 20, dy2 - 44, dx - dw2 * 0.34 + a * 30, dy2 - 54);
        ctx.stroke();
      }
    }
    // the dogs' travel crates (memory: crates)
    if (X(0.948) > -400) {
      const cx = X(0.948), cs = Math.min(w, h) * 0.125;
      for (const [off, lift, kk] of [[-cs * 0.56, 0, 1], [cs * 0.56, -3, 0.92]]) {
        const cw2 = cs * kk, ch2 = cs * 0.84 * kk;
        const cyTop = fy - ch2 + lift;
        ctx.fillStyle = '#b8a888';
        ctx.beginPath();
        ctx.roundRect(cx + off - cw2 / 2, cyTop, cw2, ch2, 8);
        ctx.fill();
        // domed top
        ctx.beginPath();
        ctx.arc(cx + off, cyTop + 4, cw2 * 0.42, Math.PI, 0);
        ctx.fill();
        // wire door
        ctx.fillStyle = 'rgba(50, 36, 22, 0.55)';
        ctx.beginPath();
        ctx.roundRect(cx + off - cw2 * 0.3, cyTop + ch2 * 0.26, cw2 * 0.6, ch2 * 0.62, 6);
        ctx.fill();
        ctx.strokeStyle = 'rgba(200, 184, 150, 0.8)';
        ctx.lineWidth = 2;
        for (let i = 1; i < 4; i++) {
          ctx.beginPath();
          ctx.moveTo(cx + off - cw2 * 0.3 + (cw2 * 0.6 / 4) * i, cyTop + ch2 * 0.26);
          ctx.lineTo(cx + off - cw2 * 0.3 + (cw2 * 0.6 / 4) * i, cyTop + ch2 * 0.88);
          ctx.stroke();
        }
        ctx.beginPath();
        ctx.moveTo(cx + off - cw2 * 0.3, cyTop + ch2 * 0.56);
        ctx.lineTo(cx + off + cw2 * 0.3, cyTop + ch2 * 0.56);
        ctx.stroke();
        // airline sticker
        ctx.save();
        ctx.translate(cx + off - cw2 * 0.2, cyTop + ch2 * 0.12);
        ctx.rotate(-0.06);
        ctx.fillStyle = '#5a6892';
        ctx.fillRect(0, 0, cw2 * 0.46, ch2 * 0.14);
        ctx.fillStyle = '#fdf6e8';
        ctx.font = `700 ${Math.max(7, cs * 0.075)}px Georgia, serif`;
        ctx.fillText('CGK→CGN', 3, ch2 * 0.105);
        ctx.restore();
      }
      // hanging plant above
      this.drawHangingPlant(ctx, cx, h * 0.1, Math.min(w, h) * 0.04, t);
    }
  }

  /* ---------- shared bits ---------- */

  drawWindow(ctx, sx, h, halfW, t, cam, withMoon) {
    const top = h * 0.18, bot = h * 0.6;
    // outside: winter dusk, parallaxed
    ctx.save();
    ctx.beginPath();
    ctx.rect(sx - halfW, top, halfW * 2, bot - top);
    ctx.clip();
    const sky = ctx.createLinearGradient(0, top, 0, bot);
    sky.addColorStop(0, '#2c3550');
    sky.addColorStop(1, '#8c7a92');
    ctx.fillStyle = sky;
    ctx.fillRect(sx - halfW, top, halfW * 2, bot - top);
    const par = cam * 0.22;
    // distant roofs
    ctx.fillStyle = 'rgba(40, 46, 70, 0.9)';
    for (let i = -2; i < 8; i++) {
      const rx = sx - halfW + ((i * 90 - par) % (halfW * 2 + 180) + halfW * 2 + 180) % (halfW * 2 + 180) - 90;
      ctx.beginPath();
      ctx.moveTo(rx, bot);
      ctx.lineTo(rx, bot - 40 - (i % 3) * 14);
      ctx.lineTo(rx + 34, bot - 64 - (i % 3) * 14);
      ctx.lineTo(rx + 68, bot - 40 - (i % 3) * 14);
      ctx.lineTo(rx + 68, bot);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 206, 130, 0.65)';
      ctx.fillRect(rx + 26, bot - 34 - (i % 3) * 14, 7, 9);
      ctx.fillStyle = 'rgba(40, 46, 70, 0.9)';
    }
    if (withMoon) {
      const mx = sx + halfW * 0.45, my = top + (bot - top) * 0.26, mr = halfW * 0.13;
      ctx.fillStyle = '#ece0c2';
      ctx.beginPath();
      ctx.arc(mx, my, mr, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#39405e';
      ctx.beginPath();
      ctx.arc(mx + mr * 0.42, my - mr * 0.18, mr * 0.85, 0, TAU);
      ctx.fill();
    }
    // snow
    if (!this.reduced) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      for (const f of this.snow) {
        const fyp = ((f.y + t * f.v) % 1);
        ctx.beginPath();
        ctx.arc(sx - halfW + f.x * halfW * 2 + Math.sin(t + f.ph) * 6, top + fyp * (bot - top), 1.4, 0, TAU);
        ctx.fill();
      }
    }
    ctx.restore();
    // frame + glazing bars + sill
    ctx.strokeStyle = '#f6eedc';
    ctx.lineWidth = 8;
    ctx.strokeRect(sx - halfW, top, halfW * 2, bot - top);
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(sx, top);
    ctx.lineTo(sx, bot);
    ctx.moveTo(sx - halfW, (top + bot) / 2);
    ctx.lineTo(sx + halfW, (top + bot) / 2);
    ctx.stroke();
    ctx.fillStyle = '#e8dcc0';
    ctx.fillRect(sx - halfW - 10, bot, halfW * 2 + 20, 8);
    // tiny cactus on the sill
    ctx.fillStyle = '#c2604f';
    ctx.fillRect(sx + halfW * 0.6, bot - 14, 14, 14);
    ctx.fillStyle = '#8a9b77';
    ctx.beginPath();
    ctx.ellipse(sx + halfW * 0.6 + 7, bot - 20, 6, 9, 0, 0, TAU);
    ctx.fill();
  }

  drawPlant(ctx, sx, fy, s, t) {
    ctx.fillStyle = '#b05c48';
    ctx.beginPath();
    ctx.moveTo(sx - s * 0.6, fy - s * 0.9);
    ctx.lineTo(sx + s * 0.6, fy - s * 0.9);
    ctx.lineTo(sx + s * 0.45, fy);
    ctx.lineTo(sx - s * 0.45, fy);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#6e7a56';
    ctx.lineWidth = s * 0.12;
    ctx.lineCap = 'round';
    for (let i = 0; i < 5; i++) {
      const a = -0.5 + i * 0.25;
      const sway = this.reduced ? 0 : Math.sin(t * 0.8 + i) * 0.04;
      ctx.beginPath();
      ctx.moveTo(sx, fy - s * 0.9);
      ctx.quadraticCurveTo(
        sx + Math.sin(a + sway) * s * 1.2, fy - s * 2.2,
        sx + Math.sin(a + sway) * s * 2.2, fy - s * (2.6 + (i % 2) * 0.5)
      );
      ctx.stroke();
    }
  }

  drawHangingPlant(ctx, sx, top, s, t) {
    ctx.strokeStyle = 'rgba(122, 92, 68, 0.6)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(sx, top);
    ctx.lineTo(sx, top + s * 1.6);
    ctx.stroke();
    ctx.fillStyle = '#7a5c44';
    ctx.beginPath();
    ctx.arc(sx, top + s * 2, s * 0.7, 0, Math.PI);
    ctx.fill();
    ctx.strokeStyle = '#6e7a56';
    ctx.lineWidth = s * 0.14;
    for (const a of [-0.7, -0.2, 0.3, 0.8]) {
      const sway = this.reduced ? 0 : Math.sin(t + a * 4) * 0.06;
      ctx.beginPath();
      ctx.moveTo(sx + a * s * 0.5, top + s * 2.1);
      ctx.quadraticCurveTo(
        sx + (a + sway) * s * 1.4, top + s * 3.2,
        sx + (a + sway) * s * 1.1, top + s * 4.2
      );
      ctx.stroke();
    }
  }

  dispose() {
    this.alive = false;
    window.removeEventListener('resize', this._onResize);
    window.removeEventListener('keydown', this._onKey);
  }
}
