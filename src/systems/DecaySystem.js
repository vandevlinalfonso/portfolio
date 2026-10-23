import AppState from '../state/AppState.js';

/**
 * Manages decay progression during idle time
 */
export default class DecaySystem {
  constructor() {
    // Per second of idle time — fast enough that an idling visitor
    // watches the telemetry tick upward
    this.decayRate = 0.003;
    this.lastDecayTime = Date.now();
  }

  /**
   * Update decay based on idle time
   * @param {number} deltaTime - Time since last frame in seconds
   */
  update(deltaTime) {
    // Only decay during idle time
    if (AppState.idleTime > 0) {
      const decayAmount = this.decayRate * deltaTime;
      AppState.incrementDecay(decayAmount);
    }
  }

  /**
   * Force decay increment
   * @param {number} amount
   */
  forceDecay(amount) {
    AppState.incrementDecay(amount);
  }

  /**
   * Get current decay level
   * @returns {number}
   */
  getDecayLevel() {
    return AppState.getDecayLevel();
  }

  /**
   * Reset decay to initial state
   */
  reset() {
    AppState.decayLevel = 0.3;
  }
}
