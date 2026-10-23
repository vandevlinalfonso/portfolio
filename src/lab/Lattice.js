import Theme from '../theme/index.js';

/**
 * Lattice — a kinetic typography wall.
 *
 * A grid of repeated words rendered on 2D canvas. Each cell is rotated,
 * scaled and brightened by a magnetic field around the cursor, with a
 * slow travelling wave underneath so the wall never sits still.
 * Scroll (or swipe) changes the phrase. The words and the hot color come
 * from the active lens.
 */

const FALLBACK_WORDS = ['SIGNAL', 'PULSE', 'STATIC'];

export default class Lattice {
  constructor(host, quality) {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
    host.appendChild(this.canvas);

    this.dpr = Math.min(devicePixelRatio || 1, quality.isMobile ? 1.5 : 2);
    this.phrases = Theme.lens.site?.words || FALLBACK_WORDS;
    this.phraseIndex = 0;
    this.morph = 1; // 0..1 transition into current phrase
    this.smooth = { x: innerWidth / 2, y: innerHeight / 2 };
    this.wheelAccum = 0;

    this.offTheme = Theme.onChange((lens) => {
      this.phrases = lens.site?.words || FALLBACK_WORDS;
      this.phraseIndex %= this.phrases.length;
      this.morph = 0;
    });

    this.resize(innerWidth, innerHeight);
  }

  wheel(deltaY) {
    this.wheelAccum += deltaY;
    if (Math.abs(this.wheelAccum) > 140) {
      const dir = Math.sign(this.wheelAccum);
      this.wheelAccum = 0;
      this.phraseIndex = (this.phraseIndex + dir + this.phrases.length) % this.phrases.length;
      this.morph = 0;
    }
  }

  click() {
    this.phraseIndex = (this.phraseIndex + 1) % this.phrases.length;
    this.morph = 0;
  }

  layout() {
    const word = this.phrases[this.phraseIndex];
    // Cell sized so the word tiles comfortably
    this.fontSize = Math.max(20, Math.min(innerWidth, innerHeight) / 13);
    this.ctx.font = `700 ${this.fontSize}px 'Space Grotesk', sans-serif`;
    const wordW = this.ctx.measureText(word).width;
    this.cellW = wordW + this.fontSize * 0.9;
    this.cellH = this.fontSize * 1.55;
    this.cols = Math.ceil(innerWidth / this.cellW) + 2;
    this.rows = Math.ceil(innerHeight / this.cellH) + 2;
  }

  update(dt, time, pointer) {
    const ctx = this.ctx;
    const w = innerWidth;
    const h = innerHeight;

    this.smooth.x += (pointer.x - this.smooth.x) * 0.08;
    this.smooth.y += (pointer.y - this.smooth.y) * 0.08;
    this.morph = Math.min(1, this.morph + dt * 1.6);

    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.fillStyle = '#070708';
    ctx.fillRect(0, 0, w, h);

    const word = this.phrases[this.phraseIndex];
    ctx.font = `700 ${this.fontSize}px 'Space Grotesk', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const fieldR = Math.min(w, h) * 0.42;
    const mx = this.smooth.x;
    const my = this.smooth.y;

    for (let r = -1; r < this.rows; r++) {
      for (let c = -1; c < this.cols; c++) {
        // Brick offset every other row
        const ox = (r % 2 === 0 ? 0 : this.cellW * 0.5);
        const x = c * this.cellW + this.cellW / 2 + ox;
        const y = r * this.cellH + this.cellH / 2;

        const dx = x - mx;
        const dy = y - my;
        const dist = Math.hypot(dx, dy);
        const force = Math.max(0, 1 - dist / fieldR);
        const eased = force * force * (3 - 2 * force);

        // Travelling wave so the wall breathes even when idle
        const wave = Math.sin(time * 0.8 + x * 0.004 + y * 0.006) * 0.5 + 0.5;

        // Phrase morph: rows cascade in
        const rowDelay = (r + 1) / (this.rows + 1);
        const reveal = Math.max(0, Math.min(1, this.morph * 2.2 - rowDelay));

        const angle = Math.atan2(dy, dx);
        const rot = eased * 0.5 * Math.sin(angle * 2 + time * 0.6) + (wave - 0.5) * 0.06;
        const scale = (0.86 + wave * 0.07 + eased * 0.45) * (0.6 + reveal * 0.4);
        const push = eased * 26;

        ctx.save();
        ctx.translate(x + Math.cos(angle) * push, y + Math.sin(angle) * push);
        ctx.rotate(rot);
        ctx.scale(scale, scale);

        if (eased > 0.55) {
          ctx.fillStyle = Theme.accentRgba(0.5 + eased * 0.5);
        } else {
          const l = 0.1 + wave * 0.1 + eased * 0.55;
          ctx.fillStyle = `rgba(232, 230, 225, ${(l * reveal).toFixed(3)})`;
        }

        ctx.fillText(word, 0, 0);
        ctx.restore();
      }
    }

    // Cursor halo
    const grad = ctx.createRadialGradient(mx, my, 0, mx, my, fieldR * 0.5);
    grad.addColorStop(0, Theme.accentRgba(0.08));
    grad.addColorStop(1, Theme.accentRgba(0));
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }

  resize(w, h) {
    this.canvas.width = w * this.dpr;
    this.canvas.height = h * this.dpr;
    this.layout();
  }

  dispose() {
    this.offTheme();
    this.canvas.remove();
  }
}
