/**
 * One City, Two Windows — the side chooser.
 *
 * A full-screen night cityscape with exactly two windows lit. Hovering
 * (or first tap, on touch) warms a window and reveals the silhouette
 * inside — him counting other people's windows, her sketching past
 * midnight. Choosing one dives the camera through the glass into that
 * life. A small rooftop sign skips ahead to the date & details.
 */

const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const ease = (t) => t * t * (3 - 2 * t);

/** deterministic pseudo-random, so the skyline is stable across frames */
function rng(seed) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function buildChoice(cfg, onChoose, onSkip) {
  const section = document.getElementById('choice');
  const canvas = document.getElementById('city-canvas');
  const ctx = canvas.getContext('2d');
  const hotHost = document.getElementById('city-hotspots');
  const start = performance.now();
  const touchOnly = matchMedia('(hover: none)').matches;

  const heroes = {
    groom: { px: 0, py: 0, ws: 0, preview: 0, target: 0, name: cfg.couple.groom.name, line: (cfg.choice && cfg.choice.groomLine) || 'Walk his years' },
    bride: { px: 0, py: 0, ws: 0, preview: 0, target: 0, name: cfg.couple.bride.name, line: (cfg.choice && cfg.choice.brideLine) || 'Walk her years' }
  };
  let buildings = [];
  let stars = [];
  let dive = null; // { side, t0 }

  /* ---------- layout ---------- */

  function layout() {
    const w = innerWidth, h = innerHeight;
    const mobile = w < 700;
    // hero window anchors, clear of the copy block up top
    heroes.groom.px = w * (mobile ? 0.26 : 0.3);
    heroes.groom.py = h * (mobile ? 0.56 : 0.58);
    heroes.bride.px = w * (mobile ? 0.74 : 0.7);
    heroes.bride.py = h * (mobile ? 0.66 : 0.52);
    heroes.groom.ws = Math.min(w, h) * (mobile ? 0.085 : 0.055);
    heroes.bride.ws = heroes.groom.ws;

    const rand = rng(77);
    stars = Array.from({ length: 90 }, (_, i) => ({
      x: rand(), y: rand() * 0.5, s: 0.5 + rand() * 1.7, ph: i * 1.3
    }));

    buildings = [];
    // back row: distant plum silhouettes
    let bx = -0.04;
    while (bx < 1.06) {
      const bw = 0.07 + rand() * 0.1;
      buildings.push({ x: bx * w, w: bw * w, top: h * (0.42 + rand() * 0.2), c: '#221b38', back: true });
      bx += bw + 0.01;
    }
    // front row: near-black, carrying the windows
    bx = -0.03;
    while (bx < 1.05) {
      const bw = 0.09 + rand() * 0.12;
      const b = {
        x: bx * w, w: bw * w, top: h * (0.5 + rand() * 0.22),
        c: '#0e0b1a', back: false, seed: Math.floor(rand() * 1000), hero: null
      };
      for (const side of ['groom', 'bride']) {
        const hr = heroes[side];
        if (hr.px > b.x && hr.px < b.x + b.w) {
          b.hero = side;
          b.top = Math.min(b.top, hr.py - hr.ws * 2.2);
        }
      }
      buildings.push(b);
      bx += bw + 0.008;
    }
    // guarantee each hero sits on a front building
    for (const side of ['groom', 'bride']) {
      if (!buildings.some((b) => b.hero === side)) {
        const hr = heroes[side];
        buildings.push({
          x: hr.px - w * 0.07, w: w * 0.14, top: hr.py - hr.ws * 2.2,
          c: '#0e0b1a', back: false, seed: 11, hero: side
        });
      }
    }
    placeHotspots();
  }

  function placeHotspots() {
    for (const side of ['groom', 'bride']) {
      const hr = heroes[side];
      const el = hotHost.querySelector(`[data-side="${side}"]`);
      const lab = hotHost.querySelector(`[data-label="${side}"]`);
      const r = hr.ws * 2.4;
      el.style.left = `${hr.px - r}px`;
      el.style.top = `${hr.py - r}px`;
      el.style.width = `${r * 2}px`;
      el.style.height = `${r * 2}px`;
      lab.style.left = `${hr.px}px`;
      lab.style.top = `${hr.py + hr.ws * 1.6}px`;
    }
  }

  /* ---------- DOM hotspots ---------- */

  hotHost.innerHTML = ['groom', 'bride'].map((side) => `
    <button class="win-hot" data-side="${side}" aria-label="Walk ${heroes[side].name}'s story"></button>
    <div class="win-label" data-label="${side}">
      <b>${heroes[side].name}</b>
      <span>${heroes[side].line}</span>
    </div>`).join('');

  for (const side of ['groom', 'bride']) {
    const el = hotHost.querySelector(`[data-side="${side}"]`);
    el.addEventListener('pointerenter', () => { if (!dive) heroes[side].target = 1; });
    el.addEventListener('pointerleave', () => { if (!dive) heroes[side].target = 0; });
    el.addEventListener('click', () => {
      if (dive) return;
      if (touchOnly && heroes[side].preview < 0.5) {
        // first tap previews, second tap enters
        heroes.groom.target = side === 'groom' ? 1 : 0;
        heroes.bride.target = side === 'bride' ? 1 : 0;
        return;
      }
      dive = { side, t0: performance.now() };
      section.classList.add('diving');
    });
  }

  document.getElementById('choice-skip').addEventListener('click', (e) => {
    e.preventDefault();
    onSkip();
  });

  window.addEventListener('resize', layout);
  layout();

  /* ---------- silhouettes inside the windows ---------- */

  function drawInhabitant(side, hr, t, a) {
    const s = hr.ws;
    ctx.save();
    ctx.translate(hr.px, hr.py);
    ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(40, 24, 16, 0.85)';
    ctx.strokeStyle = 'rgba(40, 24, 16, 0.85)';
    ctx.lineWidth = s * 0.08;
    ctx.lineCap = 'round';
    if (side === 'groom') {
      // seated at a sill, chin on hand, counting other windows
      ctx.beginPath();
      ctx.arc(-s * 0.12, -s * 0.28, s * 0.2, 0, TAU); // head
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-s * 0.12, -s * 0.08);
      ctx.quadraticCurveTo(-s * 0.3, s * 0.2, -s * 0.22, s * 0.52); // back
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-s * 0.1, -s * 0.02);
      ctx.lineTo(s * 0.18, -s * 0.18 + Math.sin(t * 0.8) * s * 0.02); // arm to chin
      ctx.stroke();
      ctx.fillRect(-s * 0.5, s * 0.5, s, s * 0.08); // sill
    } else {
      // bent over a drawing board, hand moving
      ctx.beginPath();
      ctx.arc(-s * 0.05, -s * 0.3, s * 0.2, 0, TAU);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-s * 0.05, -s * 0.1);
      ctx.quadraticCurveTo(-s * 0.28, s * 0.16, -s * 0.2, s * 0.5);
      ctx.stroke();
      ctx.save();
      ctx.translate(0, s * 0.16);
      ctx.rotate(-0.34);
      ctx.fillRect(-s * 0.1, -s * 0.04, s * 0.56, s * 0.07); // tilted board
      ctx.restore();
      const hx = s * (0.12 + Math.sin(t * 3.2) * 0.08);
      ctx.beginPath();
      ctx.moveTo(-s * 0.02, 0);
      ctx.lineTo(hx, s * 0.1 - hx * 0.3); // sketching hand
      ctx.stroke();
    }
    ctx.restore();
  }

  /* ---------- frame ---------- */

  function drawScene(t, w, h, inhabFade = 1) {
    // sky
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#0e0c1c');
    sky.addColorStop(0.7, '#241b36');
    sky.addColorStop(1, '#33203a');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);
    for (const st of stars) {
      const tw = 0.3 + 0.7 * Math.abs(Math.sin(t * 1.05 + st.ph));
      ctx.fillStyle = `rgba(240, 220, 178, ${0.7 * tw})`;
      ctx.beginPath();
      ctx.arc(st.x * w, st.y * h, st.s, 0, TAU);
      ctx.fill();
    }
    // moon (tucked higher and smaller on phones, clear of the copy)
    const mobile = w < 700;
    const mx = w * (mobile ? 0.9 : 0.86);
    const my = h * (mobile ? 0.045 : 0.14);
    const mr = Math.min(w, h) * (mobile ? 0.035 : 0.05);
    const halo = ctx.createRadialGradient(mx, my, mr * 0.4, mx, my, mr * 4.5);
    halo.addColorStop(0, 'rgba(244, 220, 174, 0.22)');
    halo.addColorStop(1, 'rgba(244, 220, 174, 0)');
    ctx.fillStyle = halo;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#f1d9ab';
    ctx.beginPath();
    ctx.arc(mx, my, mr, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#181229';
    ctx.beginPath();
    ctx.arc(mx + mr * 0.42, my - mr * 0.18, mr * 0.86, 0, TAU);
    ctx.fill();

    // buildings + ambient windows
    for (const b of buildings) {
      ctx.fillStyle = b.c;
      ctx.fillRect(b.x, b.top, b.w, h - b.top);
      if (b.back) continue;
      const cols = Math.max(2, Math.floor(b.w / 26));
      const rows = Math.max(3, Math.floor((h - b.top) / 40));
      for (let cx = 0; cx < cols; cx++) {
        for (let cy = 0; cy < rows; cy++) {
          const wx = b.x + 8 + cx * ((b.w - 16) / cols);
          const wy = b.top + 14 + cy * ((h - b.top - 22) / rows);
          // every other window in the city is dark tonight
          const glow = Math.sin(b.seed + cx * 7.7 + cy * 3.9);
          ctx.fillStyle = glow > 0.86
            ? 'rgba(186, 158, 122, 0.16)'
            : 'rgba(255, 255, 255, 0.035)';
          ctx.fillRect(wx, wy, 7, 11);
        }
      }
    }

    // the two lit windows
    for (const side of ['groom', 'bride']) {
      const hr = heroes[side];
      hr.preview += (hr.target - hr.preview) * 0.08;
      const p = ease(hr.preview);
      const s = hr.ws * (1 + p * 0.12);
      const flicker = 0.92 + Math.sin(t * 7 + (side === 'groom' ? 0 : 3)) * 0.04;
      const halo2 = ctx.createRadialGradient(hr.px, hr.py, 0, hr.px, hr.py, s * (4 + p * 2.4));
      halo2.addColorStop(0, `rgba(255, 198, 128, ${(0.3 + p * 0.3) * flicker})`);
      halo2.addColorStop(1, 'rgba(255, 198, 128, 0)');
      ctx.fillStyle = halo2;
      ctx.fillRect(hr.px - s * 7, hr.py - s * 7, s * 14, s * 14);
      ctx.fillStyle = `rgba(255, ${Math.round(204 + p * 24)}, ${Math.round(138 + p * 40)}, ${0.92 * flicker})`;
      ctx.fillRect(hr.px - s * 0.62, hr.py - s * 0.82, s * 1.24, s * 1.64);
      // muntins
      ctx.strokeStyle = 'rgba(40, 24, 16, 0.55)';
      ctx.lineWidth = Math.max(1.4, s * 0.05);
      ctx.strokeRect(hr.px - s * 0.62, hr.py - s * 0.82, s * 1.24, s * 1.64);
      ctx.beginPath();
      ctx.moveTo(hr.px - s * 0.62, hr.py - s * 0.28);
      ctx.lineTo(hr.px + s * 0.62, hr.py - s * 0.28);
      ctx.stroke();
      if (p > 0.04 && inhabFade > 0.02) drawInhabitant(side, hr, t, p * inhabFade);
    }

    // street glow at the base
    const street = ctx.createLinearGradient(0, h * 0.9, 0, h);
    street.addColorStop(0, 'rgba(20, 12, 24, 0)');
    street.addColorStop(1, 'rgba(56, 32, 30, 0.5)');
    ctx.fillStyle = street;
    ctx.fillRect(0, h * 0.9, w, h * 0.1);

    const vig = ctx.createRadialGradient(w / 2, h / 2, h * 0.42, w / 2, h / 2, h * 0.95);
    vig.addColorStop(0, 'rgba(8, 5, 4, 0)');
    vig.addColorStop(1, 'rgba(8, 5, 4, 0.32)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, w, h);
  }

  let chosen = false;
  function loop() {
    if (!canvas.isConnected) return;
    requestAnimationFrame(loop);
    const r = section.getBoundingClientRect();
    if (r.bottom < 0 || r.top > innerHeight) return; // off-screen: sleep

    const w = innerWidth, h = innerHeight;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    if (canvas.width !== Math.round(w * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const t = (performance.now() - start) / 1000;

    if (dive) {
      const hr = heroes[dive.side];
      const d = clamp((performance.now() - dive.t0) / 1500, 0, 1);
      const k = 1 + ease(d) * (Math.max(w, h) / hr.ws) * 0.9;
      ctx.save();
      ctx.translate(w / 2, h / 2);
      ctx.scale(k, k);
      ctx.translate(-hr.px, -hr.py);
      // the silhouette steps away from the glass as we approach
      drawScene(t, w, h, 1 - ease(clamp(d / 0.5, 0, 1)));
      ctx.restore();
      // light floods the frame as the glass gets close
      const flood = ease(clamp((d - 0.55) / 0.45, 0, 1));
      if (flood > 0.01) {
        ctx.fillStyle = `rgba(255, 234, 196, ${flood})`;
        ctx.fillRect(0, 0, w, h);
      }
      if (d >= 1 && !chosen) {
        chosen = true;
        onChoose(dive.side);
        setTimeout(() => { dive = null; chosen = false; section.classList.remove('diving'); }, 900);
      }
      return;
    }
    drawScene(t, w, h);
  }
  requestAnimationFrame(loop);
}
