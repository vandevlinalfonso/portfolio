import LensManager from '../lenses/index.js';

const STORAGE_KEY = 'aob-state-v1';

/**
 * Central application state
 * Tracks decay level, visited wounds, session time, and persistent changes.
 * Persisted to localStorage so returning visitors find the apple more decayed.
 */
class AppState {
  constructor() {
    this.decayLevel = 0.3; // Initial decay: 0 = pristine, 1 = fully rotted
    this.visitedWounds = new Set();
    this.idleTime = 0;
    this.lastInteractionTime = Date.now();
    this.currentAct = 1;
    this.isTransitioning = false;
    this.audioEnabled = false;
    
    // Session tracking
    this.sessionStartTime = Date.now();
    this.totalIdleDecay = 0;
    
    // Wound modifications
    this.woundStates = new Map();

    this.load();
  }

  /**
   * Increment global decay level
   * @param {number} amount - Amount to increase decay (0-1)
   */
  incrementDecay(amount) {
    this.decayLevel = Math.min(1, this.decayLevel + amount);
    this.totalIdleDecay += amount;
  }

  /**
   * Mark a wound as visited and store its modified state
   * @param {string} woundId
   * @param {object} state - Modified visual state
   */
  markWoundVisited(woundId, state = {}) {
    this.visitedWounds.add(woundId);
    this.woundStates.set(woundId, {
      visitTime: Date.now(),
      ...state
    });
    this.save();
  }

  /**
   * Check if a wound has been visited
   * @param {string} woundId
   * @returns {boolean}
   */
  hasVisitedWound(woundId) {
    return this.visitedWounds.has(woundId);
  }

  /**
   * Get the modified state of a wound
   * @param {string} woundId
   * @returns {object|null}
   */
  getWoundState(woundId) {
    return this.woundStates.get(woundId) || null;
  }

  /**
   * Get current decay level
   * @returns {number}
   */
  getDecayLevel() {
    return this.decayLevel;
  }

  /**
   * Update idle time tracking
   * @param {number} deltaTime - Time since last frame in seconds
   */
  updateIdleTime(deltaTime) {
    const now = Date.now();
    const timeSinceInteraction = now - this.lastInteractionTime;
    
    // After 5 seconds of no interaction, start accumulating idle time
    if (timeSinceInteraction > 5000) {
      this.idleTime += deltaTime;
    } else {
      this.idleTime = 0;
    }
  }

  /**
   * Reset interaction timer
   */
  recordInteraction() {
    this.lastInteractionTime = Date.now();
    this.idleTime = 0;
  }

  /**
   * Get session duration in seconds
   * @returns {number}
   */
  getSessionDuration() {
    return (Date.now() - this.sessionStartTime) / 1000;
  }

  /**
   * Set current act
   * @param {number} actNumber
   */
  setCurrentAct(actNumber) {
    this.currentAct = actNumber;
  }

  /**
   * Toggle audio
   * @param {boolean} enabled
   */
  setAudioEnabled(enabled) {
    this.audioEnabled = enabled;
  }

  /**
   * Export state for persistence
   * @returns {object}
   */
  export() {
    return {
      decayLevel: this.decayLevel,
      visitedWounds: Array.from(this.visitedWounds),
      woundStates: Array.from(this.woundStates.entries()),
      totalIdleDecay: this.totalIdleDecay,
      savedAt: Date.now()
    };
  }

  /**
   * Import state from storage
   * @param {object} data
   */
  import(data) {
    if (data.decayLevel !== undefined) {
      let level = data.decayLevel;

      // In lenses where the scalar rots (Breach), the specimen degrades in
      // real time while nobody is examining it (~1.2%/day). Lenses where the
      // scalar only grows with engagement (DevSecOps) skip this.
      if (data.savedAt && LensManager.active.persistScalar.decayWhileAway) {
        const hoursAway = Math.max(0, (Date.now() - data.savedAt) / 3.6e6);
        this.decayedWhileAway = Math.min(0.15, hoursAway * 0.0005);
        level += this.decayedWhileAway;
      }

      // Never fully rots away, never regresses below its starting point
      this.decayLevel = Math.min(0.85, Math.max(0.3, level));
    }
    if (data.visitedWounds) this.visitedWounds = new Set(data.visitedWounds);
    if (data.woundStates) this.woundStates = new Map(data.woundStates);
    if (data.totalIdleDecay) this.totalIdleDecay = data.totalIdleDecay;
  }

  /**
   * Persist state to localStorage
   */
  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.export()));
    } catch (error) {
      // Storage unavailable (private mode, etc.) — state stays in memory
    }
  }

  /**
   * Restore state from localStorage
   */
  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) this.import(JSON.parse(raw));
    } catch (error) {
      // Corrupt or unavailable storage — start fresh
    }
  }
}

// Export singleton instance
export default new AppState();
