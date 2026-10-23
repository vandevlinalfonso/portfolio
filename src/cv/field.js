import Theme from '../theme/index.js';

/**
 * Ambient secure-channel field — the calm layer behind the dossier.
 *
 * A faint dot lattice with a travelling scan wave, a slow data-drift and a
 * cursor halo. Pure 2D canvas (no WebGL context) and deliberately low-contrast
 * so it never competes with the record for legibility. Idle-animated so the
 * page is never fully static, per the house rule.
 */
export default class Field {
  constructor(host, quality) {
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'cv-field';
    this.ctx = this.canvas.getContext('2d');
    host.appendChild(this.canvas);

    this.quality = quality;
    this.dpr = Math.min(window.devicePixelRatio || 1, quality.isMobile ? 1.5 : 2);
    this.gap = quality.isMobile ? 46 : 38;
    this.smooth = { x: window.innerWidth / 2, y: window.innerHeight / 2 };

    this.resize();
  }

  update(dt, time, pointer) {
    const ctx = this.ctx;
    const w = window.innerWidth;
    const h = window.innerHeight;

    this.smooth.x += (pointer.x - this.smooth.x) * 0.06;
    this.smooth.y += (pointer.y - this.smooth.y) * 0.06;

    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const fieldR = Math.min(w, h) * 0.5;
    const mx = this.smooth.x;
    const my = this.smooth.y;
    const scan = ((time * 0.05) % 1) * (h + 200) - 100; // travelling scan line (px)

    for (let y = 0; y < h + this.gap; y += this.gap) {
      for (let x = 0; x < w + this.gap; x += this.gap) {
        const dx = x - mx;
        const dy = y - my;
        const dist = Math.hypot(dx, dy);
        const near = Math.max(0, 1 - dist / fieldR);

        // gentle drift so dots breathe
        const wob = Math.sin(time * 0.6 + x * 0.02 + y * 0.015) * 0.5 + 0.5;
        const scanHit = Math.max(0, 1 - Math.abs(y - scan) / 60);

        const base = 0.05 + wob * 0.05;
        let a = base + near * 0.28 + scanHit * 0.18;
        let r = 0.9 + near * 1.1 + scanHit * 0.6;

        if (near > 0.62 || scanHit > 0.5) {
          ctx.fillStyle = Theme.accentRgba((a * 0.9).toFixed(3));
        } else {
          ctx.fillStyle = `rgba(232, 230, 225, ${a.toFixed(3)})`;
        }
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // cursor halo
    const grad = ctx.createRadialGradient(mx, my, 0, mx, my, fieldR * 0.6);
    grad.addColorStop(0, Theme.accentRgba(0.05));
    grad.addColorStop(1, Theme.accentRgba(0));
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }

  resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.canvas.width = w * this.dpr;
    this.canvas.height = h * this.dpr;
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
  }

  dispose() {
    this.canvas.remove();
  }
}
