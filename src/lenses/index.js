import { LENSES, DEFAULT_ID, ACTIVE_KEY, UNLOCK_KEY } from './registry.js';

/**
 * ADDING A LENS (e.g. a future career pivot):
 *
 *   1. Create its 3D scene in src/scenes/<Name>Scene.js implementing the
 *      shared scene interface (see src/scenes/index.js for the method list;
 *      LoomScene is the reference implementation). If the scene is a
 *      per-pixel ray march, give it a static renderProfile like LoomScene's
 *      so it caps its internal resolution instead of janking.
 *   2. Register the scene under a key in src/scenes/index.js.
 *   3. Create src/lenses/<name>.js — a config with { id, label, codename,
 *      scene: '<key>', theme, site, palette, copy, ... } (copy either
 *      existing lens). `theme` + `site` are what every other page reads:
 *      accent colors and identity strings (see src/theme/index.js).
 *   4. Add it to LENSES in src/lenses/registry.js.
 *   5. To make it the new landing page, change DEFAULT_ID in registry.js —
 *      that one line is the only switch. Everything else (easter-egg
 *      codenames, copy injection, site-wide colors, the pre-paint boot
 *      script, persistence) picks it up automatically.
 */

// Copy keys whose values contain intentional markup
const HTML_KEYS = new Set(['heroTitle', 'heroMeta', 'contactLink', 'fallbackBody']);

class LensManager {
  constructor() {
    this.lenses = new Map();
    LENSES.forEach((lens) => this.lenses.set(lens.id, lens));

    this.unlocked = new Set([DEFAULT_ID]);
    this.loadUnlocked();

    this.activeId = this.resolveActive();
  }

  /** Re-read persisted state (another tab may have switched lenses). */
  refresh() {
    this.loadUnlocked();
    this.activeId = this.resolveActive();
    return this.activeId;
  }

  loadUnlocked() {
    try {
      const raw = localStorage.getItem(UNLOCK_KEY);
      if (raw) JSON.parse(raw).forEach((id) => this.unlocked.add(id));
    } catch (error) {
      // storage unavailable — only the default lens is unlocked
    }
    // Any lens not flagged locked is always available
    this.lenses.forEach((lens) => {
      if (!lens.locked) this.unlocked.add(lens.id);
    });
  }

  saveUnlocked() {
    try {
      localStorage.setItem(UNLOCK_KEY, JSON.stringify(Array.from(this.unlocked)));
    } catch (error) {
      // storage unavailable — unlock is session-only
    }
  }

  resolveActive() {
    let stored = null;
    try {
      stored = localStorage.getItem(ACTIVE_KEY);
    } catch (error) {
      stored = null;
    }
    if (stored && this.lenses.has(stored) && this.unlocked.has(stored)) {
      return stored;
    }
    return DEFAULT_ID;
  }

  get active() {
    return this.lenses.get(this.activeId);
  }

  get(id) {
    return this.lenses.get(id);
  }

  list() {
    return Array.from(this.lenses.values());
  }

  isUnlocked(id) {
    return this.unlocked.has(id);
  }

  unlock(id) {
    if (!this.lenses.has(id) || this.unlocked.has(id)) return false;
    this.unlocked.add(id);
    this.saveUnlocked();
    return true;
  }

  /** Look up a lens id by typed codename (case-insensitive). */
  matchCodename(buffer) {
    const lower = buffer.toLowerCase();
    for (const lens of this.lenses.values()) {
      if (lens.codename && lower.endsWith(lens.codename)) return lens.id;
    }
    return null;
  }

  /** Persist the chosen lens so it survives reloads. */
  setActive(id) {
    if (!this.lenses.has(id)) return;
    this.activeId = id;
    try {
      localStorage.setItem(ACTIVE_KEY, id);
    } catch (error) {
      // storage unavailable — choice is session-only
    }
  }

  /**
   * Inject a lens's copy into every [data-lens-copy] element in the DOM.
   * @param {object} [lens] - defaults to the active lens
   */
  applyCopy(lens = this.active) {
    const copy = lens.copy || {};
    document.querySelectorAll('[data-lens-copy]').forEach((el) => {
      const key = el.dataset.lensCopy;
      if (!(key in copy)) return;
      if (HTML_KEYS.has(key)) {
        el.innerHTML = copy[key];
      } else {
        el.textContent = copy[key];
      }
    });
  }
}

export default new LensManager();
