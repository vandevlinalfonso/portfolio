/**
 * Resonance copy per lens. A future lens without an entry gets `default`
 * (still correct, just neutral), so adding a lens never breaks the game.
 */
const COPY = {
  default: {
    eyebrow: 'Range · Exercise 01',
    kicker: 'Acoustic lock',
    lede:
      'Seven keys are cut into this plate as figures of sand. The lock hears ' +
      'them, it does not see them. Tune the drive until the steel sings, ' +
      'move the transducer until the sand draws the key, and hold the note.',
    openTitle: 'The vault is open.',
    openBody: 'Seven figures, drawn by nothing but a frequency and where you struck it.'
  },
  devsecops: {
    kicker: 'Acoustic key verification',
    lede:
      'Seven keys are cut into this plate as figures of sand. The vault ' +
      'verifies them the only way it knows: by ear. Tune the drive until the ' +
      'steel sings, move the transducer until the sand draws the key, and ' +
      'hold the note.',
    openTitle: 'Access verified.',
    openBody: 'Seven keys, each proven by physics rather than a password. Nothing trusted that was not measured.'
  },
  breach: {
    kicker: 'Acoustic side channel',
    lede:
      'This vault leaks its combination as sound. Seven keys, each a figure ' +
      'of sand on a singing steel plate. Find the frequency, find where to ' +
      'strike it, and hold the note until the tumbler falls.',
    openTitle: 'The vault is open.',
    openBody: 'It never told you the combination. It only resonated. That was enough.'
  }
};

export function copyFor(lens) {
  return { ...COPY.default, ...(COPY[lens.id] || {}) };
}
