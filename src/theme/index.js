import LensManager from '../lenses/index.js';
import { ACTIVE_KEY } from '../lenses/registry.js';
import { themeVars, hexToRgb } from './tokens.js';

/**
 * Site-wide theme: makes every page follow the active lens.
 *
 * Importing this module (every page entry does, right after base.css)
 * paints the active lens's tokens onto <html>, fills identity templates,
 * keeps tabs in sync and arms the codename easter egg. Nothing per-page
 * needs to know which lenses exist.
 *
 *   CSS      → var(--accent), rgba(var(--accent-rgb), a), var(--accent-ink)
 *              html[data-lens="<id>"] for rare per-lens overrides
 *   Canvas   → Theme.accentRgba(a)          (read per frame: cheap)
 *   GLSL     → Theme.accentVec3() + Theme.onChange() to refresh a uniform
 *   Copy     → <el data-lens-tpl="{file} · Annex">  ({title} {file} {home})
 *
 * The pre-paint script vite.config.js injects into each page's <head>
 * reads CACHE_KEY, so a returning visitor never sees the wrong accent
 * flash before this module runs.
 */

const CACHE_KEY = 'aob-theme';

class Theme {
  constructor() {
    this.listeners = new Set();
    // Pages with lens-bound WebGL scenes (Home) replace this with a reload
    this.switchHandler = (id) => this.switchLive(id);

    this.apply(LensManager.active);
    this.watchOtherTabs();
    this.listenForCodenames();
  }

  get lens() {
    return LensManager.active;
  }

  apply(lens) {
    const root = document.documentElement;
    const vars = themeVars(lens);
    Object.entries(vars).forEach(([key, value]) => root.style.setProperty(key, value));
    root.dataset.lens = lens.id;

    this.rgb = hexToRgb(lens.theme.accent);
    this.fillTemplates(lens);

    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ id: lens.id, vars }));
    } catch (error) {
      // storage unavailable — the boot script falls back to the default lens
    }

    this.listeners.forEach((fn) => fn(lens));
  }

  fillTemplates(lens) {
    const site = lens.site || {};
    document.querySelectorAll('[data-lens-tpl]').forEach((el) => {
      el.textContent = el.dataset.lensTpl.replace(/\{(\w+)\}/g, (m, key) => site[key] ?? m);
    });
  }

  accentRgba(alpha = 1) {
    return `rgba(${this.rgb[0]}, ${this.rgb[1]}, ${this.rgb[2]}, ${alpha})`;
  }

  /** Accent as 0..1 floats, ready for a vec3 uniform. */
  accentVec3() {
    return this.rgb.map((c) => c / 255);
  }

  /** @returns {() => void} unsubscribe */
  onChange(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  /** Route codename / cross-tab switches (Home reloads into its new scene). */
  setSwitchHandler(fn) {
    this.switchHandler = fn;
  }

  /** In-place switch for pages without lens-bound scenes. */
  switchLive(id) {
    LensManager.setActive(id);
    const lens = LensManager.active;

    const veil = document.createElement('div');
    veil.className = 'lens-veil';
    veil.textContent = `Reconfiguring lens · ${lens.label}`;
    document.body.appendChild(veil);
    requestAnimationFrame(() => veil.classList.add('on'));
    setTimeout(() => {
      this.apply(lens);
      veil.classList.remove('on');
      setTimeout(() => veil.remove(), 500);
    }, 420);
  }

  watchOtherTabs() {
    window.addEventListener('storage', (event) => {
      if (event.key !== ACTIVE_KEY) return;
      const before = LensManager.activeId;
      if (LensManager.refresh() !== before) this.switchHandler(LensManager.activeId, { remote: true });
    });
  }

  /** Type a lens codename anywhere ("breach", "harden") to switch. */
  listenForCodenames() {
    let buffer = '';
    window.addEventListener('keydown', (event) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.target.closest?.('input, textarea, [contenteditable]')) return;
      if (event.key.length !== 1 || !/[a-z]/i.test(event.key)) return;

      buffer = (buffer + event.key.toLowerCase()).slice(-12);
      const id = LensManager.matchCodename(buffer);
      if (!id || id === LensManager.activeId) return;

      buffer = '';
      LensManager.unlock(id);
      this.switchHandler(id, { remote: false });
    });
  }
}

export default new Theme();
