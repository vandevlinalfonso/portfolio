import { modalWeights, familyWeights, sampleAmplitude, figureMatch, peak, familyLabel, M, modeFreq } from './src/resonance/plate.js';
import { KEYS } from './src/resonance/keys.js';

/**
 * Resonance key designer (pure Node, no browser).
 *
 *   node resonance-keys.mjs                 audit every key in src/resonance/keys.js
 *   node resonance-keys.mjs search 41 0.6   rank drive points for family f=41, width 0.6
 *
 * audit: prints each key's figure (ASCII), its "basin" (% of drive points on
 * a 25×25 grid whose figure matches ≥ the key's threshold at the right
 * note — the size of the region a player is searching for), and whether a
 * center drive can solve it. Aim for basins of ~15% early, ~2–5% late.
 *
 * search: for a family, ranks drive points by modal balance (every mode in
 * the family carries energy → an intricate figure) × peak amplitude, and
 * reports each candidate's basin.
 */

const N = 30;
const G = 25;

function basin(f, width, target, threshold) {
  let hit = 0;
  for (let i = 0; i < G; i++) {
    for (let j = 0; j < G; j++) {
      const cur = sampleAmplitude(modalWeights(f, i / (G - 1), j / (G - 1), width), N);
      if (figureMatch(cur, target) >= threshold) hit++;
    }
  }
  return (hit / (G * G)) * 100;
}

function ascii(amp) {
  const pk = peak(amp);
  let out = '';
  for (let j = N - 1; j >= 0; j -= 2) {
    let row = '    ';
    for (let i = 0; i < N; i++) {
      const a = amp[j * N + i] / pk;
      row += a < 0.1 ? '#' : a < 0.25 ? '.' : ' ';
    }
    out += row + '\n';
  }
  return out;
}

if (process.argv[2] === 'search') {
  const f = Number(process.argv[3]);
  const width = Number(process.argv[4] || 0.5);
  const modes = [];
  for (let m = 0; m < M; m++) for (let n = 0; n < M; n++) if (modeFreq(m, n) === f && m + n > 0) modes.push([m, n]);
  if (!modes.length) throw new Error(`no modes ring at f=${f}`);
  const rows = [];
  const S = 20;
  for (let a = 0; a <= S; a++) {
    for (let b = 0; b <= a; b++) {
      const pu = (a / S) * 0.5, pv = (b / S) * 0.5; // one symmetry wedge of the square
      const e = modes.map(([m, n]) => (Math.cos(m * Math.PI * pu) * Math.cos(n * Math.PI * pv)) ** 2);
      const total = e.reduce((x, y) => x + y, 0);
      if (total < 0.3) continue;
      let H = 0;
      for (const x of e) { const q = x / total; if (q > 1e-6) H -= q * Math.log(q); }
      H = modes.length > 1 ? H / Math.log(modes.length) : 1;
      const target = sampleAmplitude(familyWeights(f, pu, pv), N);
      rows.push({ pu, pv, balance: H, peak: peak(target), target });
    }
  }
  rows.sort((x, y) => y.balance * y.peak - x.balance * x.peak);
  console.log(`f=${f} ${familyLabel(f)}  width ${width}`);
  for (const r of rows.slice(0, 10)) {
    console.log(`  drive (${r.pu.toFixed(3)}, ${r.pv.toFixed(3)})  balance ${r.balance.toFixed(2)}  peak ${r.peak.toFixed(2)}  basin ${basin(f, width, r.target, 0.88).toFixed(1)}%`);
  }
} else {
  KEYS.forEach((key, i) => {
    const target = sampleAmplitude(familyWeights(key.f, key.drive[0], key.drive[1]), N);
    const center = figureMatch(sampleAmplitude(modalWeights(key.f, 0.5, 0.5, key.width), N), target);
    console.log(`0${i + 1} ${key.name}  f=${key.f} ${familyLabel(key.f)}  drive (${key.drive})  width ${key.width}`);
    console.log(`   basin ${basin(key.f, key.width, target, key.match).toFixed(1)}%  center-drive match ${center.toFixed(2)}${key.locked ? '  (drive locked)' : ''}`);
    console.log(ascii(target));
  });
}
