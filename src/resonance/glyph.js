import { familyWeights, sampleAmplitude, peak } from './plate.js';

/**
 * Draw a key's figure the way sand would settle into it: bright where the
 * plate is still (nodal lines), dark where it throws. Evaluated from the
 * same modal sum as the plate, never hand-drawn.
 */
export function drawGlyph(canvas, key, rgb, { dim = false } = {}) {
  const size = canvas.width;
  const N = Math.min(160, size);
  const amp = sampleAmplitude(familyWeights(key.f, key.drive[0], key.drive[1]), N);
  const pk = peak(amp) || 1;

  const off = document.createElement('canvas');
  off.width = off.height = N;
  const octx = off.getContext('2d');
  const img = octx.createImageData(N, N);
  const [r, g, b] = dim ? [150, 146, 140] : rgb;
  for (let j = 0; j < N; j++) {
    for (let i = 0; i < N; i++) {
      const a = amp[j * N + i] / pk;
      const line = Math.exp(-a / 0.05);
      // plate v runs up the screen; image rows run down
      const o = ((N - 1 - j) * N + i) * 4;
      img.data[o] = r;
      img.data[o + 1] = g;
      img.data[o + 2] = b;
      img.data[o + 3] = Math.round(line * (dim ? 120 : 255));
    }
  }
  octx.putImageData(img, 0, 0);

  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, size, size);
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(off, 0, 0, size, size);
}
