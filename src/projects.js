import '@fontsource/space-grotesk/300.css';
import '@fontsource/space-grotesk/500.css';
import '@fontsource/space-grotesk/700.css';
import './styles/base.css';
import './theme/index.js';

import Cursor from './ui/Cursor.js';

const WORKS = [
  {
    href: './range/',
    title: 'Range',
    desc: 'Playable exercises built on real simulations: the rules are physics you have to discover. No. 01: Resonance, a vault that opens only when a singing steel plate draws each of seven keys in sand.',
    tags: ['Games', 'GPGPU sand', 'Plate physics', 'Procedural audio'],
    year: '2026',
    status: 'New',
    peek: { gradient: 'radial-gradient(circle at 50% 55%, #1b1e23, #0a0a0b 72%)', label: '◇ ∿ ◇', color: 'var(--accent)' }
  },
  {
    href: './visions/',
    title: 'Visions',
    desc: 'Three photomanipulation plates hung in a dark volume. Scroll dollies the camera through the surface of each image.',
    tags: ['WebGL', 'Depth shader', 'Scroll rig'],
    year: '2026',
    status: 'Live',
    peek: { image: './visions/1.jpeg' }
  },
  {
    href: './vows/',
    title: 'Vows',
    desc: 'A collection of interactive wedding invitations: each couple gets a different concept. No. 01: a continuous film opened by a red thread. No. 02: an explorable apartment where every object holds a memory.',
    tags: ['Interaction design', 'Canvas film', 'Config template'],
    year: '2026',
    status: 'Live',
    peek: { gradient: 'linear-gradient(135deg, #f7ece4, #efc8c4 55%, #d9a05b)', label: 'L ♥ S', color: '#7a3b3b' }
  },
  {
    href: './lab/',
    title: 'Lab',
    desc: 'Experimental UI playground: two hundred thousand embers, a fluid ink simulation, a kinetic type wall. Bring a cursor.',
    tags: ['GPGPU', 'Fluid sim', 'Kinetic type'],
    year: '2026',
    status: 'Growing',
    peek: { gradient: 'radial-gradient(circle at 30% 60%, #2b0d0a, #0a0a0b 70%)', label: '✦ ✦ ✦', color: 'var(--accent)' }
  }
];

function buildWorks() {
  const host = document.getElementById('works');
  const peek = document.getElementById('peek');

  WORKS.forEach((w, i) => {
    const a = document.createElement('a');
    a.className = 'work';
    a.href = w.href;
    a.dataset.index = i;
    a.innerHTML = `
      <span class="w-no">0${i + 1}</span>
      <span class="w-main">
        <span class="w-title">${w.title}</span>
        <span class="w-desc" style="display:block">${w.desc}</span>
        <span class="w-tags">${w.tags.map((t) => `<span>${t}</span>`).join('')}</span>
      </span>
      <span class="w-side">
        <span>${w.year}</span>
        <span class="w-status ${['Live', 'New'].includes(w.status) ? '' : 'dim'}">${w.status}</span>
      </span>
    `;
    host.appendChild(a);

    const pane = document.createElement('div');
    pane.className = 'peek-pane';
    if (w.peek.image) {
      pane.style.backgroundImage = `url(${w.peek.image})`;
    } else {
      pane.style.background = w.peek.gradient;
      pane.innerHTML = `<span style="color:${w.peek.color}">${w.peek.label}</span>`;
    }
    peek.appendChild(pane);

    a.addEventListener('mouseenter', () => {
      peek.classList.add('on');
      [...peek.children].forEach((p, j) => p.classList.toggle('show', j === i));
    });
    a.addEventListener('mouseleave', () => peek.classList.remove('on'));

    // Staggered entrance
    setTimeout(() => a.classList.add('in'), 150 + i * 120);
  });

  let px = 0, py = 0, tx = 0, ty = 0;
  window.addEventListener('mousemove', (e) => { tx = e.clientX; ty = e.clientY; }, { passive: true });
  (function follow() {
    px += (tx - px) * 0.12;
    py += (ty - py) * 0.12;
    peek.style.left = `${px + 28}px`;
    peek.style.top = `${py - 100}px`;
    requestAnimationFrame(follow);
  })();
}

function init() {
  new Cursor();
  buildWorks();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
