import '@fontsource/space-grotesk/300.css';
import '@fontsource/space-grotesk/500.css';
import '@fontsource/space-grotesk/700.css';
import './styles/base.css';
import './theme/index.js';

import Cursor from './ui/Cursor.js';
import { quality, isWebGLAvailable } from './utils/Quality.js';

import Embers from './lab/Embers.js';
import Ink from './lab/Ink.js';
import Lattice from './lab/Lattice.js';
import Blackhole from './lab/Blackhole.js';
import Ferrofluid from './lab/Ferrofluid.js';

const EXPERIMENTS = [
  { id: 'embers', label: '01 · Embers', Cls: Embers, hint: 'Move to scatter the embers: they remember the words' },
  { id: 'ink', label: '02 · Ink', Cls: Ink, hint: 'Drag luminous ink through black water: click for a pulse' },
  { id: 'lattice', label: '03 · Lattice', Cls: Lattice, hint: 'The wall bends around your cursor: scroll to change the phrase' },
  { id: 'blackhole', label: '04 · Blackhole', Cls: Blackhole, hint: 'Move to orbit it: scroll to dive toward the disk, click to feed it' },
  { id: 'ferrofluid', label: '05 · Ferrofluid', Cls: Ferrofluid, hint: 'Your cursor is the magnet: the chrome fluid spikes toward it. Reach the right edge for the field deck' }
];

class LabApp {
  constructor() {
    this.host = document.getElementById('stage');
    this.hintEl = document.getElementById('lab-hint');
    this.current = null;
    this.index = -1;
    this.pointer = { x: innerWidth / 2, y: innerHeight / 2, px: innerWidth / 2, py: innerHeight / 2, down: false };
    this.lastTime = performance.now();

    new Cursor();
    this.buildTabs();
    this.bindInput();
    this.select(0);

    requestAnimationFrame(this.loop.bind(this));
  }

  buildTabs() {
    const host = document.getElementById('lab-tabs');
    this.tabs = EXPERIMENTS.map((ex, i) => {
      const b = document.createElement('button');
      b.textContent = ex.label;
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-selected', 'false');
      b.tabIndex = -1;
      b.addEventListener('click', () => this.select(i));
      host.appendChild(b);
      return b;
    });
  }

  bindInput() {
    const set = (x, y) => {
      this.pointer.x = x;
      this.pointer.y = y;
    };
    window.addEventListener('mousemove', (e) => set(e.clientX, e.clientY), { passive: true });
    window.addEventListener('mousedown', () => { this.pointer.down = true; });
    window.addEventListener('mouseup', () => { this.pointer.down = false; });
    window.addEventListener('touchstart', (e) => {
      this.pointer.down = true;
      set(e.touches[0].clientX, e.touches[0].clientY);
      this.pointer.px = this.pointer.x;
      this.pointer.py = this.pointer.y;
    }, { passive: true });
    window.addEventListener('touchmove', (e) => set(e.touches[0].clientX, e.touches[0].clientY), { passive: true });
    window.addEventListener('touchend', () => { this.pointer.down = false; });

    // A quick horizontal flick switches experiments; slower drags stay with
    // the experiment (Ink paints on drag)
    let swipe = null;
    this.host.addEventListener('touchstart', (e) => {
      const t = e.touches[0];
      swipe = e.touches.length === 1 ? { x: t.clientX, y: t.clientY, at: performance.now() } : null;
    }, { passive: true });
    this.host.addEventListener('touchend', (e) => {
      if (!swipe) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - swipe.x;
      const dy = t.clientY - swipe.y;
      const quick = performance.now() - swipe.at < 450;
      swipe = null;
      if (quick && Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.5) this.step(dx < 0 ? 1 : -1);
    }, { passive: true });

    window.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      if (e.target.closest?.('input, select, textarea, [contenteditable]')) return;
      this.step(e.key === 'ArrowRight' ? 1 : -1);
      if (this.tabs.includes(document.activeElement)) this.tabs[this.index].focus({ preventScroll: true });
    });

    window.addEventListener('resize', () => {
      this.current?.resize(innerWidth, innerHeight);
    });

    window.addEventListener('wheel', (e) => {
      this.current?.wheel?.(e.deltaY);
    }, { passive: true });

    window.addEventListener('click', (e) => {
      // Ignore clicks on the UI
      if (e.target.closest('#lab-tabs, .frame-nav, .ferro-deck, button, a, input, select, textarea, label')) return;
      this.current?.click?.(e.clientX, e.clientY);
    });
  }

  step(dir) {
    this.select((this.index + dir + EXPERIMENTS.length) % EXPERIMENTS.length);
  }

  /** Center the tab in the strip when it scrolls (phones). */
  revealTab(tab) {
    const strip = tab.parentElement;
    if (strip.scrollWidth <= strip.clientWidth) return;
    const s = strip.getBoundingClientRect();
    const r = tab.getBoundingClientRect();
    strip.scrollTo({
      left: strip.scrollLeft + r.left - s.left - (s.width - r.width) / 2,
      behavior: quality.reducedMotion ? 'auto' : 'smooth'
    });
  }

  select(i) {
    if (i === this.index) return;
    this.index = i;
    this.tabs.forEach((t, j) => {
      const on = j === i;
      t.classList.toggle('active', on);
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
    });
    this.revealTab(this.tabs[i]);

    if (this.current) {
      this.current.dispose();
      this.current = null;
    }
    this.host.innerHTML = '';

    const ex = EXPERIMENTS[i];
    this.hintEl.textContent = ex.hint;
    this.current = new ex.Cls(this.host, quality);
  }

  loop(now) {
    requestAnimationFrame(this.loop.bind(this));
    const dt = Math.min(0.05, (now - this.lastTime) / 1000);
    this.lastTime = now;

    if (this.current) this.current.update(dt, now / 1000, this.pointer);

    this.pointer.px = this.pointer.x;
    this.pointer.py = this.pointer.y;
  }
}

function init() {
  if (!isWebGLAvailable()) {
    document.getElementById('webgl-fallback')?.classList.add('visible');
    return;
  }
  new LabApp();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
