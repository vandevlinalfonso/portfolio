/**
 * RSVP data layer — the ONLY module the rest of the app talks to.
 *
 * V1 ships with a mock backend: seeded wishes from config.json plus
 * the visitor's own entries persisted in localStorage. Every function
 * is async and returns plain objects, so swapping in a real backend
 * later is a drop-in replacement of this file — see
 * projects/vows/BACKEND.md for the full migration guide.
 */

const KEY = 'vows-rsvp-v1';
let seeds = [];

export function initStore(seedWishes = []) {
  seeds = seedWishes.map((w, i) => ({
    id: `seed-${i}`,
    name: w.name,
    side: w.side,
    attending: w.attending !== false,
    plusOnes: w.plusOnes || 0,
    message: w.message || '',
    mine: false
  }));
}

function readLocal() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]');
  } catch {
    return [];
  }
}

function writeLocal(entries) {
  try {
    localStorage.setItem(KEY, JSON.stringify(entries));
  } catch { /* private mode — entry just won't persist */ }
}

/**
 * @param {{name: string, side: string, attending: boolean, plusOnes: number, message: string}} entry
 * @returns {Promise<object>} the stored entry
 */
export async function submitRsvp(entry) {
  const stored = {
    id: `local-${Date.now()}`,
    name: entry.name.trim().slice(0, 60),
    side: entry.side === 'bride' ? 'bride' : 'groom',
    attending: !!entry.attending,
    plusOnes: Math.max(0, Math.min(4, entry.plusOnes | 0)),
    message: (entry.message || '').trim().slice(0, 280),
    createdAt: new Date().toISOString(),
    mine: true
  };
  const entries = readLocal();
  entries.push(stored);
  writeLocal(entries);
  return stored;
}

/** @returns {Promise<object[]>} newest own entries first, then seeds */
export async function getMessages() {
  const own = readLocal().filter((e) => e.message).reverse();
  return [...own, ...seeds.filter((s) => s.message)];
}

/** The visitor's most recent RSVP, if any (so reloads still greet them) */
export async function getOwnRsvp() {
  const own = readLocal();
  return own.length ? own[own.length - 1] : null;
}

/** @returns {Promise<{guests: number, parties: number}>} */
export async function getStats() {
  const all = [...seeds, ...readLocal()];
  const attending = all.filter((e) => e.attending);
  return {
    parties: attending.length,
    guests: attending.reduce((sum, e) => sum + 1 + (e.plusOnes || 0), 0)
  };
}
