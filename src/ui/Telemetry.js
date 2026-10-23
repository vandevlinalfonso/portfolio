import AppState from '../state/AppState.js';
import LensManager from '../lenses/index.js';

/**
 * Live forensic telemetry HUD.
 * Surfaces the otherwise-invisible simulation state: decay percentage,
 * session clock, wounds examined, and specimen status. Goes DEGRADING
 * when the visitor idles and the decay system is actively running.
 */
export default class Telemetry {
  constructor() {
    this.root = document.getElementById('telemetry');
    this.decayEl = document.getElementById('t-decay');
    this.sessionEl = document.getElementById('t-session');
    this.woundsEl = document.getElementById('t-wounds');
    this.statusEl = document.getElementById('t-status');

    this.accum = 0;
    this.flashUntil = 0;
    this.flashText = '';
    this.scalar = LensManager.active.persistScalar;
  }

  /**
   * Temporarily override the status line (e.g. after a tab-away penalty)
   * @param {string} text
   * @param {number} seconds
   */
  flash(text, seconds = 4) {
    this.flashText = text;
    this.flashUntil = performance.now() + seconds * 1000;
  }

  update(deltaTime) {
    if (!this.root) return;

    this.accum += deltaTime;
    if (this.accum < 0.25) return;
    this.accum = 0;

    const decay = AppState.getDecayLevel();
    if (this.decayEl) {
      this.decayEl.textContent = `${(decay * 100).toFixed(1)}%`;
      // Only lenses where a high scalar is *bad* flag critical
      this.decayEl.classList.toggle('critical', !this.scalar.inverse && decay > 0.55);
    }

    if (this.sessionEl) {
      const s = Math.floor(AppState.getSessionDuration());
      const mm = String(Math.floor(s / 60)).padStart(2, '0');
      const ss = String(s % 60).padStart(2, '0');
      this.sessionEl.textContent = `${mm}:${ss}`;
    }

    if (this.woundsEl) {
      const total = AppState.totalWounds || '··';
      this.woundsEl.textContent = `${AppState.visitedWounds.size}/${total}`;
    }

    if (this.statusEl) {
      if (performance.now() < this.flashUntil) {
        this.statusEl.textContent = this.flashText;
        this.statusEl.className = 'degrading';
      } else if (AppState.idleTime > 3) {
        this.statusEl.textContent = this.scalar.statusActive;
        this.statusEl.className = 'degrading';
      } else {
        this.statusEl.textContent = this.scalar.statusStable;
        this.statusEl.className = '';
      }
    }
  }
}
