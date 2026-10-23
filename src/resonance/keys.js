/**
 * The seven tumblers. Each key is a resonant family `f` (m² + n²) struck
 * from a drive point, so its figure is exactly what the plate draws there.
 * Drive points were chosen by search (balanced modal energy, a strong
 * peak, and a findable match region): `node resonance-keys.mjs` audits
 * these, `node resonance-keys.mjs search <f> <width>` proposes new ones.
 *
 *   width  resonance width: narrower = the note must be held more exactly
 *   locked drive pinned to the center bolt (tuning-only keys)
 *   match  figure correlation required to set the tumbler
 */
export const KEYS = [
  {
    id: 'diamond', name: 'Diamond', f: 4, drive: [0.5, 0.5], width: 0.9, locked: true, match: 0.9,
    hint: 'Tune until the plate blooms. Listen: it gets louder before the sand moves.'
  },
  {
    id: 'lantern', name: 'Lantern', f: 20, drive: [0.5, 0.5], width: 0.8, locked: true, match: 0.9,
    hint: 'Higher. Sweep slowly; a resonance is only a few hertz wide.'
  },
  {
    id: 'crossing', name: 'Crossing', f: 13, drive: [0, 0], width: 0.7, locked: false, match: 0.9,
    hint: 'Some modes have a node under the center bolt and cannot be struck from there. Move the drive.'
  },
  {
    id: 'rose', name: 'Rose', f: 41, drive: [0.2, 0], width: 0.6, locked: false, match: 0.9,
    hint: 'Two modes share this note. Where you strike decides how they mix.'
  },
  {
    id: 'weave', name: 'Weave', f: 25, drive: [0.225, 0], width: 0.5, locked: false, match: 0.88,
    hint: 'Four modes ring at once. Walk the drive along an edge.'
  },
  {
    id: 'cathedral', name: 'Cathedral', f: 50, drive: [0.15, 0.15], width: 0.45, locked: false, match: 0.88,
    hint: 'Three modes, one of them symmetric. Stay off the edges.'
  },
  {
    id: 'master', name: 'Master', f: 65, drive: [0.275, 0], width: 0.35, locked: false, match: 0.86,
    hint: 'The master key. Four modes, a narrow note. Hold it.'
  }
];

// Progress + best run ({ solved, best }); the Range index reads it too
export const SAVE_KEY = 'resonance-v1';

// Physical scale: the audible drive frequency for a plate frequency unit
export const HZ_PER_UNIT = 22;

// How long the figure must be held, in seconds, to set a tumbler
export const HOLD_TIME = 1.8;

// Minimum tuning (Lorentzian response of the key's family) to count as on-note
export const TUNE_MIN = 0.6;
