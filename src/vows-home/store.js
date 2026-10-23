/**
 * RSVP data layer for Open House (Vows No. 02) — the ONLY module the
 * rest of the app talks to. Mock backend: seeded wishes from config.json
 * plus the visitor's own entries in localStorage. Same contract as
 * projects/vows/BACKEND.md, so a real backend is a drop-in swap of
 * this file.
 *
 * Note: `word` is a leftover from the earlier bilingual-letter concept;
 * Open House never sends it, but the field is kept so the DB schema in
 * projects/vows/db/schema.sql stays valid unchanged.
 */

const KEY = 'vows-home-rsvp-v1';
let seeds = [];

export function initStore(seedWishes = []) {
  seeds = seedWishes.map((w, i) => ({
    id: `seed-${i}`,
    name: w.name,
    word: w.word || '',
    side: w.side,
    attending: w.attending !== false,
    plusOnes: w.plusOnes || 0,
    country: (w.country || '').toUpperCase().slice(0, 3),
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
 * @param {{name: string, word: string, side: string, attending: boolean,
 *          plusOnes: number, country: string, message: string}} entry
 */
export async function submitRsvp(entry) {
  const stored = {
    id: `local-${Date.now()}`,
    name: entry.name.trim().slice(0, 60),
    word: (entry.word || '').trim().slice(0, 24),
    side: entry.side === 'bride' ? 'bride' : 'groom',
    attending: !!entry.attending,
    plusOnes: Math.max(0, Math.min(4, entry.plusOnes | 0)),
    country: (entry.country || '').trim().toUpperCase().slice(0, 3),
    message: (entry.message || '').trim().slice(0, 280),
    createdAt: new Date().toISOString(),
    mine: true
  };
  const entries = readLocal();
  entries.push(stored);
  writeLocal(entries);
  return stored;
}

/** newest own entries first, then seeds */
export async function getMessages() {
  const own = readLocal().filter((e) => e.message).reverse();
  return [...own, ...seeds.filter((s) => s.message)];
}

/** The visitor's most recent RSVP, if any */
export async function getOwnRsvp() {
  const own = readLocal();
  return own.length ? own[own.length - 1] : null;
}

export async function getStats() {
  const all = [...seeds, ...readLocal()];
  const attending = all.filter((e) => e.attending);
  return {
    parties: attending.length,
    guests: attending.reduce((sum, e) => sum + 1 + (e.plusOnes || 0), 0)
  };
}
