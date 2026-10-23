/**
 * Custom forensic-reticle cursor.
 * A precise dot tracks the pointer 1:1; a ring trails behind and
 * expands over interactive elements (body.is-hover). Self-driving: it runs
 * its own rAF loop only while the ring is catching up, so pages never need
 * to tick it. Disabled on touch / coarse-pointer devices.
 */
const HOVER = 'a, button, [role=tab], input, select, textarea, label, [data-cursor]';
// Text fields keep the native I-beam (see base.css); the reticle steps aside.
const TEXT_FIELD =
  'textarea, input:not([type=range]):not([type=checkbox]):not([type=radio])' +
  ':not([type=button]):not([type=submit]):not([type=reset]):not([type=color]):not([type=file])';

export default class Cursor {
  constructor() {
    this.dot = document.getElementById('cursor-dot');
    this.ring = document.getElementById('cursor-ring');
    this.enabled =
      window.matchMedia('(pointer: fine)').matches && this.dot && this.ring;

    if (!this.enabled) return;

    const body = document.body;
    body.classList.add('has-custom-cursor', 'cursor-away');

    this.x = window.innerWidth / 2;
    this.y = window.innerHeight / 2;
    this.ringX = this.x;
    this.ringY = this.y;
    this.raf = 0;
    this.placed = false;

    this._tick = () => {
      const dx = this.x - this.ringX;
      const dy = this.y - this.ringY;
      if (Math.abs(dx) < 0.1 && Math.abs(dy) < 0.1) {
        this.ringX = this.x;
        this.ringY = this.y;
        this.raf = 0;
      } else {
        this.ringX += dx * 0.16;
        this.ringY += dy * 0.16;
        this.raf = requestAnimationFrame(this._tick);
      }
      this.ring.style.transform = `translate(${this.ringX}px, ${this.ringY}px)`;
    };

    this._onMove = (event) => {
      this.x = event.clientX;
      this.y = event.clientY;
      if (!this.placed) {
        this.placed = true;
        this.ringX = this.x;
        this.ringY = this.y;
      }
      this.dot.style.transform = `translate(${this.x}px, ${this.y}px)`;
      body.classList.remove('cursor-away');
      if (!this.raf) this.raf = requestAnimationFrame(this._tick);
    };

    this._onOver = (event) => {
      const el = event.target.closest?.(HOVER);
      body.classList.toggle('is-hover', !!el);
      body.classList.toggle('cursor-text', !!el?.matches(TEXT_FIELD));
    };

    this._onOut = (event) => {
      if (!event.relatedTarget) body.classList.add('cursor-away');
    };

    window.addEventListener('mousemove', this._onMove, { passive: true });
    document.addEventListener('pointerover', this._onOver);
    document.addEventListener('pointerout', this._onOut);
  }

  dispose() {
    if (!this.enabled) return;
    cancelAnimationFrame(this.raf);
    window.removeEventListener('mousemove', this._onMove);
    document.removeEventListener('pointerover', this._onOver);
    document.removeEventListener('pointerout', this._onOut);
    document.body.classList.remove('has-custom-cursor', 'cursor-away', 'cursor-text', 'is-hover');
  }
}
