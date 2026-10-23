/**
 * The plate — a free square Chladni plate, solved as a driven, damped
 * superposition of its eigenmodes. Pure math, shared by the GPU field
 * pass (via the weights it uploads) and the CPU key/match logic.
 *
 * Mode shapes use the classic cosine (Ritz) basis of a free square plate,
 *   φ_mn(u, v) = cos(mπu) · cos(nπv),        u, v ∈ [0, 1]
 * with eigenfrequencies ∝ m² + n² — so families like (0,5)(5,0)(3,4)(4,3)
 * are exactly degenerate and ring together.
 *
 * A point transducer at p drives every mode in proportion to its shape at
 * p (a mode with a node under the driver cannot be excited), and each mode
 * answers with a Lorentzian resonance:
 *   W_mn = φ_mn(p) · 1 / (1 + (2·(f − f_mn)/width)²)
 * Modes ring in phase: the lightly damped (standing-wave) limit. With a
 * complex response, off-resonant tails ring in quadrature and the nodal
 * lines break into isolated points; real plates are near-standing. The
 * weights stay [re, im] pairs so a phase model can return without touching
 * the GPU. The steady-state amplitude is |Σ W_mn φ_mn(u, v)|. Sand is thrown
 * wherever that amplitude out-accelerates gravity and comes to rest on the
 * nodal lines — the figure is never drawn, it falls out of the sum.
 */

export const M = 9; // modes m, n ∈ 0..8
export const MODE_COUNT = M * M;
export const F_MIN = 1.5;
export const F_MAX = 82;

const PI = Math.PI;

export function modeFreq(m, n) {
  return m * m + n * n;
}

/** Lorentzian response of a mode at fk to a drive at f: 1 on resonance. */
export function resonance(f, fk, width) {
  const d = (2 * (f - fk)) / width;
  return 1 / (1 + d * d);
}

/**
 * Complex modal weights for a drive frequency / point / resonance width.
 * @param {Float32Array} [out] - length 2 * MODE_COUNT, [re, im] per mode
 */
export function modalWeights(f, pu, pv, width, out = new Float32Array(MODE_COUNT * 2)) {
  for (let m = 0; m < M; m++) {
    const cu = Math.cos(m * PI * pu);
    for (let n = 0; n < M; n++) {
      const k = (m * M + n) * 2;
      if (m === 0 && n === 0) { out[k] = out[k + 1] = 0; continue; }
      const c = cu * Math.cos(n * PI * pv);
      out[k] = c * resonance(f, modeFreq(m, n), width);
      out[k + 1] = 0;
    }
  }
  return out;
}

/** Resonant-family weights: every mode at exactly f (a key's figure). */
export function familyWeights(f, pu, pv, out = new Float32Array(MODE_COUNT * 2)) {
  out.fill(0);
  for (let m = 0; m < M; m++) {
    for (let n = 0; n < M; n++) {
      if (modeFreq(m, n) !== f || (m === 0 && n === 0)) continue;
      out[(m * M + n) * 2] = Math.cos(m * PI * pu) * Math.cos(n * PI * pv);
    }
  }
  return out;
}

/**
 * Sample |A| on an N×N grid (cell centers). Only modes with non-negligible
 * weight are summed, so this is cheap enough to run every frame at N≈36.
 */
export function sampleAmplitude(weights, N, out = new Float32Array(N * N)) {
  const active = [];
  for (let k = 0; k < MODE_COUNT; k++) {
    const re = weights[k * 2], im = weights[k * 2 + 1];
    if (re * re + im * im > 1e-5) active.push(k);
  }
  const cosTable = new Float32Array(M * N);
  for (let m = 0; m < M; m++) {
    for (let i = 0; i < N; i++) cosTable[m * N + i] = Math.cos(m * PI * ((i + 0.5) / N));
  }
  for (let j = 0; j < N; j++) {
    for (let i = 0; i < N; i++) {
      let re = 0, im = 0;
      for (const k of active) {
        const m = (k / M) | 0, n = k % M;
        const phi = cosTable[m * N + i] * cosTable[n * N + j];
        re += weights[k * 2] * phi;
        im += weights[k * 2 + 1] * phi;
      }
      out[j * N + i] = Math.sqrt(re * re + im * im);
    }
  }
  return out;
}

/**
 * Figure similarity: Pearson correlation of the two amplitude maps. Scale-
 * and sign-free, so only the *shape* of the nodal pattern counts.
 */
export function figureMatch(a, b) {
  const n = a.length;
  let ma = 0, mb = 0;
  for (let i = 0; i < n; i++) { ma += a[i]; mb += b[i]; }
  ma /= n; mb /= n;
  let sab = 0, saa = 0, sbb = 0;
  for (let i = 0; i < n; i++) {
    const da = a[i] - ma, db = b[i] - mb;
    sab += da * db; saa += da * da; sbb += db * db;
  }
  if (saa < 1e-9 || sbb < 1e-9) return 0;
  return sab / Math.sqrt(saa * sbb);
}

export function peak(a) {
  let p = 0;
  for (let i = 0; i < a.length; i++) if (a[i] > p) p = a[i];
  return p;
}

/** The mode pairs that ring at a family frequency, e.g. "(0,5) (3,4)". */
export function familyLabel(f) {
  const pairs = [];
  for (let m = 0; m < M; m++) {
    for (let n = m; n < M; n++) if (modeFreq(m, n) === f) pairs.push(`(${m},${n})`);
  }
  return pairs.join(' ');
}
