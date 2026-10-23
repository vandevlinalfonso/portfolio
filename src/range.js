import '@fontsource/space-grotesk/300.css';
import '@fontsource/space-grotesk/500.css';
import '@fontsource/space-grotesk/700.css';
import './styles/base.css';
import Theme from './theme/index.js';

import Cursor from './ui/Cursor.js';
import { quality } from './utils/Quality.js';
import { KEYS, SAVE_KEY } from './resonance/keys.js';
import { copyFor } from './resonance/copy.js';
import { drawGlyph } from './resonance/glyph.js';

/**
 * The Range — index of playable exercises (a sibling of the Lab, not a tab
 * inside it). Each exercise is its own page under /projects/range/<slug>/.
 *
 * ADDING AN EXERCISE:
 *   1. projects/range/<slug>/index.html + src/<slug>.js (copy Resonance's
 *      frame: nav links are three levels deep, the Range crumb is "../").
 *   2. Register it in rollupOptions.input (vite.config.js).
 *   3. Add an entry to EXERCISES below and drop one SEALED slot.
 *      `figure(host)` paints the card's live thumbnail and returns a
 *      repaint function (called on lens change); `record()` reads the
 *      exercise's own save, so the index shows the visitor's progress.
 */

const fmtTime = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

/** Resonance's thumbnail: the seven key figures, crossfading in vault order. */
function resonanceFigure(host) {
  const layers = [0, 1].map(() => {
    const c = document.createElement('canvas');
    c.width = c.height = 288;
    host.appendChild(c);
    return c;
  });
  let index = KEYS.length - 1;
  let front = 0;

  const paint = () => {
    drawGlyph(layers[front], KEYS[index], Theme.rgb);
    layers[front].style.opacity = '1';
    layers[1 - front].style.opacity = '0';
  };
  paint();

  if (!quality.reducedMotion) {
    setInterval(() => {
      if (document.hidden) return;
      index = (index + 1) % KEYS.length;
      front = 1 - front;
      paint();
    }, 2600);
  }
  return paint;
}

function resonanceRecord() {
  let save = {};
  try {
    save = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}');
  } catch (error) {
    // unreadable save — show the exercise as untouched
  }
  const total = String(KEYS.length).padStart(2, '0');
  if (save.best) return { status: 'Cleared', detail: `Best run ${fmtTime(save.best)}` };
  if (save.solved > 0) {
    return { status: 'In progress', detail: `Key ${String(save.solved + 1).padStart(2, '0')} / ${total}` };
  }
  return { status: 'Open', detail: `${total} keys` };
}

const EXERCISES = [
  {
    href: './resonance/',
    title: 'Resonance',
    kicker: (lens) => copyFor(lens).kicker,
    brief:
      'A vault that opens to sound. Tune a singing steel plate and move where ' +
      'you strike it until its sand draws each of seven keys. Nothing is drawn: ' +
      'the figures fall out of real Chladni physics.',
    meta: ['Plate physics', 'GPU sand', 'Procedural audio', 'Headphones on'],
    cta: 'Enter the exercise →',
    figure: resonanceFigure,
    record: resonanceRecord
  }
];

// Reserved slots rendered after the live exercises
const SEALED = [
  { kicker: 'In preparation', title: 'Classified' }
];

function buildIndex() {
  const host = document.getElementById('exercises');
  const kickers = [];
  const repaints = [];

  EXERCISES.forEach((ex, i) => {
    const record = ex.record();
    const a = document.createElement('a');
    a.className = 'ex';
    a.href = ex.href;
    a.innerHTML = `
      <span class="x-no">${String(i + 1).padStart(2, '0')}</span>
      <span class="x-fig" aria-hidden="true"></span>
      <span class="x-main">
        <span class="x-kicker" style="display:block"></span>
        <span class="x-title">${ex.title}</span>
        <span class="x-brief" style="display:block">${ex.brief}</span>
        <span class="x-meta">${ex.meta.map((m) => `<span>${m}</span>`).join('')}</span>
      </span>
      <span class="x-side">
        <span class="x-status">${record.status}</span>
        <span>${record.detail}</span>
        <span class="x-cta">${ex.cta}</span>
      </span>
    `;
    host.appendChild(a);
    kickers.push([a.querySelector('.x-kicker'), ex.kicker]);
    repaints.push(ex.figure(a.querySelector('.x-fig')));
  });

  SEALED.forEach((slot, j) => {
    const div = document.createElement('div');
    div.className = 'ex sealed';
    div.setAttribute('aria-disabled', 'true');
    div.innerHTML = `
      <span class="x-no">${String(EXERCISES.length + j + 1).padStart(2, '0')}</span>
      <span class="x-fig" aria-hidden="true"></span>
      <span class="x-main">
        <span class="x-kicker" style="display:block">${slot.kicker}</span>
        <span class="x-title">${slot.title}</span>
        <span class="x-bars" aria-hidden="true"><span></span><span></span></span>
      </span>
      <span class="x-side"><span class="x-status dim">Sealed</span></span>
    `;
    host.appendChild(div);
  });

  const relabel = (lens) => kickers.forEach(([el, fn]) => { el.textContent = fn(lens); });
  relabel(Theme.lens);
  Theme.onChange((lens) => {
    relabel(lens);
    repaints.forEach((paint) => paint());
  });

  [...host.children].forEach((el, i) => setTimeout(() => el.classList.add('in'), 150 + i * 120));
}

function init() {
  new Cursor();
  buildIndex();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
