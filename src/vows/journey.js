/**
 * The film: ONE pinned full-viewport canvas for the entire invitation.
 * There are no sections — birth, childhood, the meeting, the proposal,
 * the date reveal, the moments, the wedding day, the venue map and the
 * lantern-sky finale are all chapters of a single morphing world.
 * Scroll is the projector. Typography floats over it.
 *
 * Every biography scene takes a per-side `variant` so his years and her
 * years are different worlds, and hides a cameo of the other person —
 * a hit-testable easter egg that feeds the "paths crossed" counter.
 */

/* ---------- palette helpers ---------- */

function hex(c) {
  return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
}

function lerpHex(a, b, t) {
  const A = hex(a), B = hex(b);
  return `rgb(${Math.round(A[0] + (B[0] - A[0]) * t)}, ${Math.round(A[1] + (B[1] - A[1]) * t)}, ${Math.round(A[2] + (B[2] - A[2]) * t)})`;
}

const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

const lerp = (a, b, t) => a + (b - a) * t;

/** Sky palettes + text tone per scene key (variant keys override) */
const PALETTES = {
  birth: { top: '#2b2540', bot: '#71505e', dark: true },
  'birth:dawn': { top: '#8a7596', bot: '#f4d3ae', dark: false },
  childhood: { top: '#a3c4dc', bot: '#f8ead3', dark: false },
  'childhood:collect': { top: '#cfe0cd', bot: '#f9efd8', dark: false },
  school: { top: '#e7d9c2', bot: '#f9f2e4', dark: false },
  'school:margins': { top: '#f2e3d6', bot: '#fbf2e2', dark: false },
  work: { top: '#3f3154', bot: '#cf7d5d', dark: true },
  'work:studio': { top: '#191430', bot: '#553a6e', dark: true },
  searching: { top: '#151019', bot: '#39282e', dark: true },
  'searching:almost': { top: '#222031', bot: '#4e3e48', dark: true },
  meeting: { top: '#eec29c', bot: '#fdf2e2', dark: false },
  proposal: { top: '#2a1c3e', bot: '#c97a58', dark: true },
  reveal: { top: '#241a38', bot: '#76506a', dark: true },
  moments: { top: '#0d0a14', bot: '#251c29', dark: true },
  day: { top: '#aecfdb', bot: '#f7e8c8', dark: false },
  venue: { top: '#f0e6d2', bot: '#faf4e8', dark: false },
  lanterns: { top: '#0e0c1e', bot: '#41294a', dark: true }
};

const palFor = (ch) => PALETTES[`${ch.scene}:${ch.variant}`] || PALETTES[ch.scene] || PALETTES.birth;

/* ---------- cameos: the other person, hidden in every chapter ---------- */

/**
 * Closure-based (NOT object-literal flags — Rollup constant-folds those):
 * the scene reports the cameo's screen position every frame via set();
 * the Journey hit-tests taps/hovers against it.
 */
function makeCameo() {
  let found = false;
  let x = -1e4, y = -1e4, r = 0;
  return {
    set(nx, ny, nr) { x = nx; y = ny; r = nr; },
    hit(px, py) {
      return Math.hypot(px - x, py - y) < Math.max(34, r) ? { x, y } : null;
    },
    get pos() { return { x, y }; },
    get found() { return found; },
    find() { found = true; }
  };
}

/** hover/found ring shared by every cameo */
function drawCameoMark(ctx, cam, px, py, t, p, alpha) {
  const hot = p.active && cam.hit(p.x, p.y);
  if (cam.found) {
    ctx.strokeStyle = `rgba(227, 201, 142, ${0.55 * alpha})`;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(px, py, 20 + Math.sin(t * 2) * 1.5, 0, Math.PI * 2);
    ctx.stroke();
  } else if (hot) {
    const pr = (t * 0.9) % 1;
    ctx.strokeStyle = `rgba(255, 226, 168, ${0.6 * (1 - pr) * alpha})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(px, py, 16 + pr * 22, 0, Math.PI * 2);
    ctx.stroke();
  }
}

/* ---------- shared figure drawing ---------- */

function drawFigure(ctx, x, gy, s, { dress = false, kneel = 0, step = 0, dir = 1 } = {}) {
  ctx.save();
  ctx.translate(x, gy - Math.abs(step) * 0.6);
  ctx.lineCap = 'round';
  ctx.fillStyle = 'rgba(60, 38, 28, 0.2)';
  ctx.beginPath();
  ctx.ellipse(0, 3, s * 0.55, s * 0.12, 0, 0, Math.PI * 2);
  ctx.fill();
  const drop = kneel * s * 0.55;
  ctx.translate(0, drop);
  // head
  ctx.fillStyle = '#f6d7bf';
  ctx.strokeStyle = '#5d4435';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.arc(kneel * s * 0.18 * dir, -s * 1.7 + kneel * s * 0.1, s * 0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // body
  ctx.fillStyle = dress ? '#fdf6ec' : '#3a3f4a';
  ctx.beginPath();
  if (dress) {
    ctx.moveTo(-s * 0.15, -s * 1.3);
    ctx.lineTo(s * 0.15, -s * 1.3);
    ctx.lineTo(s * 0.48, 0);
    ctx.lineTo(-s * 0.48, 0);
  } else {
    const tilt = kneel * s * 0.16 * dir;
    ctx.moveTo(-s * 0.28 + tilt, -s * 1.3);
    ctx.lineTo(s * 0.28 + tilt, -s * 1.3);
    ctx.lineTo(s * 0.22, 0);
    ctx.lineTo(-s * 0.22, 0);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  if (!dress) {
    ctx.beginPath();
    if (kneel > 0.5) {
      // kneeling: one leg folded forward, one knee on the ground
      ctx.moveTo(-s * 0.12, 0);
      ctx.lineTo(-s * 0.34 * dir, s * 0.26 - drop * 0.5);
      ctx.moveTo(s * 0.12, 0);
      ctx.lineTo(s * 0.3 * dir, s * 0.05);
      ctx.lineTo(s * 0.3 * dir, s * 0.32 - drop * 0.4);
    } else {
      ctx.moveTo(-s * 0.1, 0);
      ctx.lineTo(-s * 0.1 + step * dir, s * 0.3);
      ctx.moveTo(s * 0.1, 0);
      ctx.lineTo(s * 0.1 - step * dir, s * 0.3);
    }
    ctx.stroke();
  }
  ctx.restore();
}

function s2(w, h, f) { return Math.min(w, h) * f; }

/* ============================================================
   Full-bleed scene library
   Each: draw(ctx, w, h, t, p, local, alpha, sky)
   ============================================================ */

const SCENES = {
  birth(seed, variant) {
    const dawn = variant === 'dawn';
    const cameo = makeCameo();
    const stars = Array.from({ length: dawn ? 14 : 46 }, (_, i) => ({
      x: Math.random(), y: Math.random() * 0.72, s: 0.8 + Math.random() * 2.2, ph: i * 1.7 + seed
    }));
    const drops = dawn ? [] : Array.from({ length: 64 }, () => ({
      x: Math.random(), y: Math.random(), v: 0.011 + Math.random() * 0.008, l: 9 + Math.random() * 12
    }));
    return {
      cameo,
      draw(ctx, w, h, t, p, local, alpha, sky) {
        ctx.globalAlpha = alpha;
        for (const st of stars) {
          const tw = 0.35 + 0.65 * Math.abs(Math.sin(t * 1.1 + st.ph));
          ctx.fillStyle = `rgba(244, 220, 174, ${(dawn ? 0.4 : 0.8) * tw})`;
          ctx.beginPath();
          ctx.arc(st.x * w + Math.sin(t * 0.25 + st.ph) * 8, st.y * h, st.s, 0, Math.PI * 2);
          ctx.fill();
        }
        if (dawn) {
          // a pale sun just clearing the mist
          const sx = w * 0.26, sy = h * 0.34, sr = Math.min(w, h) * 0.07;
          const sun = ctx.createRadialGradient(sx, sy, 0, sx, sy, sr * 6);
          sun.addColorStop(0, 'rgba(255, 232, 188, 0.75)');
          sun.addColorStop(0.2, 'rgba(255, 220, 170, 0.3)');
          sun.addColorStop(1, 'rgba(255, 220, 170, 0)');
          ctx.fillStyle = sun;
          ctx.fillRect(0, 0, w, h);
          ctx.fillStyle = '#ffeecb';
          ctx.beginPath();
          ctx.arc(sx, sy, sr, 0, Math.PI * 2);
          ctx.fill();
          // drifting mist bands
          ctx.fillStyle = 'rgba(255, 250, 240, 0.16)';
          for (let i = 0; i < 4; i++) {
            const my2 = h * (0.46 + i * 0.1);
            const mx2 = ((i * 0.27 + t * 0.012) % 1.3 - 0.15) * w;
            ctx.beginPath();
            ctx.ellipse(mx2, my2, w * 0.3, h * 0.028, 0, 0, Math.PI * 2);
            ctx.fill();
          }
          // cameo: the storm that announced him, leaving on the horizon
          const cmx = w * 0.86, cmy = h * 0.2;
          ctx.fillStyle = 'rgba(62, 52, 76, 0.8)';
          for (const [ox, oy, r] of [[-26, 6, 22], [0, 0, 28], [26, 8, 20], [10, 14, 24]]) {
            ctx.beginPath();
            ctx.arc(cmx + ox, cmy + oy, r, 0, Math.PI * 2);
            ctx.fill();
          }
          const flick = Math.sin(t * 0.7 + seed) > 0.96;
          if (flick || cameo.found) {
            ctx.strokeStyle = `rgba(255, 240, 200, ${cameo.found ? 0.5 : 0.9})`;
            ctx.lineWidth = 1.6;
            ctx.beginPath();
            ctx.moveTo(cmx - 4, cmy + 18);
            ctx.lineTo(cmx + 3, cmy + 30);
            ctx.lineTo(cmx - 2, cmy + 31);
            ctx.lineTo(cmx + 5, cmy + 44);
            ctx.stroke();
          }
          cameo.set(cmx, cmy + 14, 46);
          drawCameoMark(ctx, cameo, cmx, cmy + 14, t, p, alpha);
        } else {
          // the moon over his storm
          const mx = w * 0.74, my = h * 0.22, mr = Math.min(w, h) * 0.085;
          const halo = ctx.createRadialGradient(mx, my, mr * 0.5, mx, my, mr * 5);
          halo.addColorStop(0, 'rgba(244, 220, 174, 0.28)');
          halo.addColorStop(1, 'rgba(244, 220, 174, 0)');
          ctx.fillStyle = halo;
          ctx.fillRect(0, 0, w, h);
          ctx.save();
          ctx.translate(mx, my);
          ctx.rotate(-0.35 + Math.sin(t * 0.5) * 0.05);
          ctx.fillStyle = '#f4dcae';
          ctx.beginPath();
          ctx.arc(0, 0, mr, 0, Math.PI * 2);
          ctx.fill();
          ctx.save();
          ctx.beginPath();
          ctx.arc(0, 0, mr + 1, 0, Math.PI * 2);
          ctx.clip();
          ctx.fillStyle = sky.top;
          ctx.beginPath();
          ctx.arc(mr * 0.5, -mr * 0.22, mr * 0.92, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
          ctx.restore();
          // the storm itself: rain + the occasional flash
          const flash = Math.max(0, Math.sin(t * 0.62 + seed) - 0.965) / 0.035;
          if (flash > 0) {
            ctx.fillStyle = `rgba(232, 226, 255, ${flash * 0.16})`;
            ctx.fillRect(0, 0, w, h);
          }
          ctx.strokeStyle = 'rgba(214, 222, 244, 0.22)';
          ctx.lineWidth = 1;
          for (const d of drops) {
            const dy = ((d.y + t * d.v) % 1.1) - 0.05;
            const dx = d.x * w - dy * 30;
            ctx.beginPath();
            ctx.moveTo(dx, dy * h);
            ctx.lineTo(dx - 4, dy * h + d.l);
            ctx.stroke();
          }
          // cameo: a dawn-coloured glimmer low on the horizon — her year coming
          const cmx = w * 0.09, cmy = h * 0.66;
          const pulse = 0.5 + 0.5 * Math.sin(t * 1.6);
          const dg = ctx.createRadialGradient(cmx, cmy, 0, cmx, cmy, 34);
          dg.addColorStop(0, `rgba(255, 196, 170, ${0.4 + pulse * 0.3})`);
          dg.addColorStop(1, 'rgba(255, 196, 170, 0)');
          ctx.fillStyle = dg;
          ctx.fillRect(cmx - 34, cmy - 34, 68, 68);
          ctx.fillStyle = `rgba(255, 224, 200, ${0.7 + pulse * 0.3})`;
          ctx.beginPath();
          ctx.arc(cmx, cmy, 2.6, 0, Math.PI * 2);
          ctx.fill();
          cameo.set(cmx, cmy, 40);
          drawCameoMark(ctx, cameo, cmx, cmy, t, p, alpha);
        }
        ctx.fillStyle = dawn ? 'rgba(122, 96, 86, 0.5)' : 'rgba(26, 20, 36, 0.85)';
        ctx.beginPath();
        ctx.moveTo(0, h);
        ctx.quadraticCurveTo(w * 0.4, h * 0.8, w, h * 0.9);
        ctx.lineTo(w, h);
        ctx.closePath();
        ctx.fill();
        const cx = w * 0.66, cy = h * 0.85, cw = Math.min(w, h) * 0.115;
        const basket = dawn ? '#7c5b48' : '#352a44';
        const trim = dawn ? '#fff4dc' : '#f0c482';
        const hood = dawn ? '#8a6852' : '#43355a';
        const glow = ctx.createRadialGradient(cx, cy - cw * 0.4, 0, cx, cy - cw * 0.4, cw * 3.4);
        glow.addColorStop(0, dawn ? 'rgba(255, 232, 188, 0.4)' : 'rgba(240, 196, 130, 0.3)');
        glow.addColorStop(1, 'rgba(240, 196, 130, 0)');
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, w, h);
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(Math.sin(t * 1.3) * 0.07);
        ctx.lineCap = 'round';
        ctx.fillStyle = basket;
        ctx.beginPath();
        ctx.arc(0, -cw * 0.08, cw * 0.72, 0.1, Math.PI - 0.1);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = trim;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, -cw * 0.08, cw * 0.72, 0.1, Math.PI - 0.1);
        ctx.stroke();
        ctx.fillStyle = 'rgba(217, 140, 127, 0.95)';
        ctx.beginPath();
        ctx.ellipse(0, -cw * 0.12, cw * 0.6, cw * 0.16, 0, Math.PI, 0);
        ctx.fill();
        ctx.fillStyle = '#f6d7bf';
        ctx.beginPath();
        ctx.arc(-cw * 0.32, -cw * 0.22, cw * 0.16, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = hood;
        ctx.beginPath();
        ctx.moveTo(cw * 0.18, -cw * 0.2);
        ctx.quadraticCurveTo(cw * 0.2, -cw * 1.05, cw * 0.78, -cw * 0.32);
        ctx.quadraticCurveTo(cw * 0.78, -cw * 0.1, cw * 0.72, -cw * 0.02);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = trim;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cw * 0.18, -cw * 0.2);
        ctx.quadraticCurveTo(cw * 0.2, -cw * 1.05, cw * 0.78, -cw * 0.32);
        ctx.stroke();
        ctx.strokeStyle = trim;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, -cw * 0.55, cw * 1.18, Math.PI * 0.38, Math.PI * 0.62);
        ctx.stroke();
        ctx.restore();
        const zo = (t % 3.2) / 3.2;
        ctx.globalAlpha = alpha * (1 - zo);
        ctx.fillStyle = dawn ? '#a8765c' : '#f0c482';
        ctx.font = `italic ${Math.round(h * 0.034)}px serif`;
        ctx.fillText('z', cx - cw * 0.2, cy - cw * 0.9 - zo * 36);
        ctx.globalAlpha = 1;
      }
    };
  },

  childhood(seed, variant) {
    const cameo = makeCameo();
    if (variant === 'collect') {
      // her shelf of small proofs that a good day happened
      // chapter text sits right of frame, so the shelf lives on the left
      const JARS = [
        { x: 0.18, fill: ['rgba(217, 140, 127, 0.85)', 'rgba(238, 186, 110, 0.8)'] },
        { x: 0.32, fill: ['rgba(160, 170, 110, 0.8)', 'rgba(217, 140, 127, 0.7)'] },
        { x: 0.46, fill: ['rgba(185, 138, 71, 0.75)', 'rgba(160, 170, 110, 0.7)'] }
      ];
      const falling = Array.from({ length: 14 }, (_, i) => ({
        x: Math.random(), y: Math.random(), s: 3 + Math.random() * 4, ph: i * 1.9,
        v: 0.014 + Math.random() * 0.018, petal: i % 3 !== 0
      }));
      return {
        cameo,
        draw(ctx, w, h, t, p, local, alpha) {
          ctx.globalAlpha = alpha;
          const sg = ctx.createRadialGradient(w * 0.78, h * 0.14, 0, w * 0.78, h * 0.14, h * 0.5);
          sg.addColorStop(0, 'rgba(255, 244, 206, 0.55)');
          sg.addColorStop(1, 'rgba(255, 244, 206, 0)');
          ctx.fillStyle = sg;
          ctx.fillRect(0, 0, w, h);
          // cameo: a paper plane that flew three rooftops to get here
          const cyc = (t * 0.07 + seed) % 1.3 - 0.15;
          const camX = cyc * w;
          const camY = h * 0.2 + Math.sin(t * 1.1) * 16;
          ctx.save();
          ctx.translate(camX, camY);
          ctx.rotate(0.12 + Math.sin(t * 1.1) * 0.1);
          const ps = Math.min(w, h) * 0.02;
          ctx.fillStyle = '#fffdf8';
          ctx.strokeStyle = '#8a755f';
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.moveTo(ps * 1.7, 0);
          ctx.lineTo(-ps, -ps * 0.8);
          ctx.lineTo(-ps * 0.3, 0);
          ctx.lineTo(-ps, ps * 0.8);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.restore();
          cameo.set(camX, camY, 44);
          drawCameoMark(ctx, cameo, camX, camY, t, p, alpha);
          // meadow
          ctx.fillStyle = 'rgba(176, 184, 130, 0.45)';
          ctx.beginPath();
          ctx.moveTo(0, h);
          ctx.quadraticCurveTo(w * 0.4, h * 0.76, w, h * 0.84);
          ctx.lineTo(w, h);
          ctx.closePath();
          ctx.fill();
          // the shelf
          const sy = h * 0.68, jw = Math.min(w, h) * 0.075;
          ctx.strokeStyle = 'rgba(122, 96, 70, 0.7)';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(w * 0.1, sy + jw * 1.3);
          ctx.lineTo(w * 0.54, sy + jw * 1.3);
          ctx.stroke();
          for (const [ji, J] of JARS.entries()) {
            const jx = J.x * w;
            ctx.save();
            ctx.translate(jx, sy);
            // glass
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.strokeStyle = 'rgba(122, 110, 90, 0.8)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.roundRect(-jw / 2, 0, jw, jw * 1.3, jw * 0.16);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = 'rgba(185, 138, 71, 0.85)';
            ctx.fillRect(-jw * 0.34, -jw * 0.12, jw * 0.68, jw * 0.14);
            // the small things inside, gently settling
            for (let i = 0; i < 9; i++) {
              const ix = -jw * 0.3 + ((i * 0.37 + ji * 0.21) % 1) * jw * 0.6;
              const iy = jw * 1.16 - ((i * 0.53) % 1) * jw * 0.5 + Math.sin(t * 1.4 + i + ji) * 1.2;
              ctx.fillStyle = J.fill[i % 2];
              ctx.beginPath();
              ctx.ellipse(ix, iy, 3.4, 2.2, i, 0, Math.PI * 2);
              ctx.fill();
            }
            ctx.restore();
          }
          // petals and bus tickets still finding their way in
          for (const f of falling) {
            const fy = ((f.y + t * f.v) % 1.06) - 0.03;
            const fx = f.x * w + Math.sin(t * 1.2 + f.ph) * 22;
            ctx.save();
            ctx.translate(fx, fy * h);
            ctx.rotate(Math.sin(t + f.ph) * 0.9);
            if (f.petal) {
              ctx.fillStyle = 'rgba(217, 140, 127, 0.55)';
              ctx.beginPath();
              ctx.ellipse(0, 0, f.s, f.s * 0.55, 0, 0, Math.PI * 2);
              ctx.fill();
            } else {
              ctx.fillStyle = 'rgba(238, 218, 178, 0.8)';
              ctx.strokeStyle = 'rgba(141, 123, 110, 0.5)';
              ctx.lineWidth = 1;
              ctx.fillRect(-f.s, -f.s * 0.55, f.s * 2, f.s * 1.1);
              ctx.strokeRect(-f.s, -f.s * 0.55, f.s * 2, f.s * 1.1);
            }
            ctx.restore();
          }
          ctx.globalAlpha = 1;
        }
      };
    }

    // his rooftop paper-plane years
    let px = 0.15, py = 0.38, prevY = 0;
    const trail = [];
    return {
      cameo,
      draw(ctx, w, h, t, p, local, alpha) {
        ctx.globalAlpha = alpha;
        const sg = ctx.createRadialGradient(w * 0.18, h * 0.16, 0, w * 0.18, h * 0.16, h * 0.5);
        sg.addColorStop(0, 'rgba(255, 240, 200, 0.55)');
        sg.addColorStop(1, 'rgba(255, 240, 200, 0)');
        ctx.fillStyle = sg;
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = 'rgba(255, 252, 246, 0.75)';
        for (let i = 0; i < 4; i++) {
          const cxp = ((i * 0.3 + t * 0.008) % 1.25 - 0.12) * w;
          const cyp = h * (0.14 + i * 0.13);
          for (let j = 0; j < 4; j++) {
            ctx.beginPath();
            ctx.arc(cxp + j * 26 - 36, cyp + (j % 2 === 1 ? -12 : 0), 20 + (j % 3) * 6, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        ctx.fillStyle = 'rgba(199, 178, 137, 0.5)';
        ctx.beginPath();
        ctx.moveTo(0, h);
        ctx.quadraticCurveTo(w * 0.3, h * 0.74, w * 0.65, h * 0.86);
        ctx.quadraticCurveTo(w * 0.85, h * 0.92, w, h * 0.84);
        ctx.lineTo(w, h);
        ctx.closePath();
        ctx.fill();
        // cameo: a small collector on the far hill, jar in hand
        const gx = w * 0.84, gyH = h * 0.842;
        const gs = Math.min(w, h) * 0.024;
        ctx.save();
        ctx.translate(gx, gyH);
        ctx.fillStyle = 'rgba(96, 74, 58, 0.85)';
        ctx.strokeStyle = 'rgba(96, 74, 58, 0.85)';
        ctx.lineWidth = gs * 0.3;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(0, -gs * 1.7, gs * 0.42, 0, Math.PI * 2); // head
        ctx.fill();
        ctx.beginPath(); // little dress
        ctx.moveTo(-gs * 0.16, -gs * 1.3);
        ctx.lineTo(gs * 0.16, -gs * 1.3);
        ctx.lineTo(gs * 0.5, 0);
        ctx.lineTo(-gs * 0.5, 0);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath(); // arm to the jar
        ctx.moveTo(gs * 0.2, -gs);
        ctx.lineTo(gs * 0.9, -gs * 0.7);
        ctx.stroke();
        ctx.fillStyle = 'rgba(255, 252, 240, 0.7)';
        ctx.strokeStyle = 'rgba(96, 74, 58, 0.7)';
        ctx.lineWidth = 1.2;
        ctx.fillRect(gs * 0.7, -gs * 0.7, gs * 0.5, gs * 0.6); // the jar
        ctx.strokeRect(gs * 0.7, -gs * 0.7, gs * 0.5, gs * 0.6);
        // a glint so she catches the eye
        const gl = 0.5 + 0.5 * Math.sin(t * 2.2 + seed);
        ctx.fillStyle = `rgba(255, 238, 196, ${gl * 0.9})`;
        ctx.beginPath();
        ctx.arc(gs * 0.95, -gs * 0.85, 1.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        cameo.set(gx, gyH - gs, 44);
        drawCameoMark(ctx, cameo, gx, gyH - gs, t, p, alpha);
        ctx.fillStyle = 'rgba(168, 142, 96, 0.55)';
        ctx.beginPath();
        ctx.moveTo(0, h);
        ctx.quadraticCurveTo(w * 0.55, h * 0.86, w, h * 0.94);
        ctx.lineTo(w, h);
        ctx.closePath();
        ctx.fill();
        const targetY = p.active ? p.y : h * (0.4 + Math.sin(t * 0.6) * 0.16);
        px += w * 0.0021;
        if (px > w + 60) { px = -60; trail.length = 0; }
        py += (targetY - py) * 0.028;
        const bobble = Math.sin(t * 2.1) * 4;
        const angle = Math.atan2((py - prevY) * 2 + Math.cos(t * 2.1) * 1.2, 4);
        prevY = py;
        trail.push({ x: px, y: py + bobble });
        if (trail.length > 60) trail.shift();
        ctx.strokeStyle = 'rgba(120, 100, 80, 0.45)';
        ctx.lineWidth = 1.6;
        ctx.setLineDash([5, 9]);
        ctx.beginPath();
        trail.forEach((pt, i) => i ? ctx.lineTo(pt.x, pt.y) : ctx.moveTo(pt.x, pt.y));
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.save();
        ctx.translate(px, py + bobble);
        ctx.rotate(angle);
        const s = Math.min(w, h) * 0.042;
        ctx.fillStyle = '#fffdf8';
        ctx.strokeStyle = '#5d4d3e';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(s * 1.7, 0);
        ctx.lineTo(-s, -s * 0.8);
        ctx.lineTo(-s * 0.3, 0);
        ctx.lineTo(-s, s * 0.8);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(s * 1.7, 0);
        ctx.lineTo(-s * 0.3, 0);
        ctx.stroke();
        ctx.restore();
        ctx.globalAlpha = 1;
      }
    };
  },

  school(seed, variant) {
    const margins = variant === 'margins';
    const cameo = makeCameo();
    // his pages are quiet half-songs; hers are loud with doodles
    const GLYPHS = margins
      ? ['♥', '★', '✿', '☼', '✎', '~', '∞', '◌']
      : ['♪', '?', '~', '♩', '…'];
    const items = Array.from({ length: margins ? 26 : 14 }, (_, i) => ({
      x: Math.random(), y: 0.08 + Math.random() * 0.84, g: GLYPHS[i % GLYPHS.length],
      s: 0.5 + Math.random() * 1.1, ph: Math.random() * 7, depth: 0.3 + Math.random() * 0.7
    }));
    // the stray mark in someone else's ink
    const stray = margins
      ? { g: '♪', x: 0.69, y: 0.4, ink: 'rgba(90, 104, 146, 0.9)' }
      : { g: '✿', x: 0.78, y: 0.32, ink: 'rgba(201, 111, 99, 0.9)' };
    return {
      cameo,
      draw(ctx, w, h, t, p, local, alpha) {
        ctx.globalAlpha = alpha * 0.75;
        ctx.strokeStyle = 'rgba(185, 138, 71, 0.22)';
        ctx.lineWidth = 1;
        for (let y = h * 0.12; y < h; y += h * 0.11) {
          ctx.beginPath();
          ctx.moveTo(0, y + Math.sin(t * 0.4 + y) * 3);
          ctx.lineTo(w, y + Math.cos(t * 0.3 + y) * 3);
          ctx.stroke();
        }
        ctx.strokeStyle = 'rgba(201, 111, 99, 0.35)';
        ctx.beginPath();
        ctx.moveTo(w * 0.12, 0);
        ctx.lineTo(w * 0.12, h);
        ctx.stroke();
        ctx.globalAlpha = alpha;
        const ox = p.active ? (p.x - w / 2) : 0;
        const oy = p.active ? (p.y - h / 2) : 0;
        for (const it of items) {
          const x = it.x * w + Math.sin(t * 0.5 + it.ph) * 14 - ox * 0.05 * it.depth;
          const y = it.y * h + Math.cos(t * 0.4 + it.ph) * 11 - oy * 0.05 * it.depth;
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(Math.sin(t * 1.1 + it.ph) * 0.2);
          ctx.font = `${Math.round(h * 0.075 * it.s)}px serif`;
          ctx.fillStyle = it.g === '♥' || it.g === '✿'
            ? `rgba(201, 111, 99, ${0.4 + it.depth * 0.45})`
            : `rgba(93, 77, 62, ${0.22 + it.depth * 0.4})`;
          ctx.textAlign = 'center';
          ctx.fillText(it.g, 0, 0);
          ctx.restore();
        }
        if (!margins) {
          // the notebook nobody was allowed to read
          const bx = w * 0.78, by = h * 0.84, bw = Math.min(w, h) * 0.2;
          ctx.save();
          ctx.translate(bx, by);
          const spines = ['rgba(122, 96, 70, 0.9)', 'rgba(160, 110, 90, 0.9)', 'rgba(93, 90, 120, 0.9)'];
          spines.forEach((c, i) => {
            ctx.fillStyle = c;
            ctx.save();
            ctx.rotate((i - 1) * 0.015);
            ctx.fillRect(-bw / 2, -bw * 0.13 * (i + 1), bw, bw * 0.11);
            ctx.restore();
          });
          // the notebook on top, slightly open
          ctx.save();
          ctx.translate(0, -bw * 0.44);
          ctx.rotate(-0.04);
          ctx.fillStyle = '#fbf3e0';
          ctx.strokeStyle = 'rgba(122, 96, 70, 0.8)';
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.moveTo(-bw * 0.42, 0);
          ctx.quadraticCurveTo(-bw * 0.2, -bw * 0.07, 0, -bw * 0.015);
          ctx.quadraticCurveTo(bw * 0.2, -bw * 0.07, bw * 0.42, 0);
          ctx.lineTo(bw * 0.4, bw * 0.05);
          ctx.lineTo(-bw * 0.4, bw * 0.05);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.restore();
          ctx.restore();
        } else {
          // her pencil, mid-doodle
          const pxn = w * 0.2, pyn = h * 0.82;
          ctx.save();
          ctx.translate(pxn + Math.sin(t * 1.4) * 8, pyn + Math.cos(t * 1.1) * 4);
          ctx.rotate(0.7 + Math.sin(t * 1.4) * 0.06);
          const ps = Math.min(w, h) * 0.05;
          ctx.fillStyle = '#d9a85e';
          ctx.fillRect(-ps * 0.08, -ps, ps * 0.16, ps * 1.6);
          ctx.fillStyle = '#f6d7bf';
          ctx.beginPath();
          ctx.moveTo(-ps * 0.08, ps * 0.6);
          ctx.lineTo(0, ps * 0.85);
          ctx.lineTo(ps * 0.08, ps * 0.6);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }
        // cameo: the mark in foreign ink
        const camX = stray.x * w + Math.sin(t * 0.6 + seed) * 12;
        const camY = stray.y * h + Math.cos(t * 0.5 + seed) * 9;
        ctx.save();
        ctx.translate(camX, camY);
        ctx.rotate(Math.sin(t * 0.9 + seed) * 0.16);
        ctx.font = `${Math.round(h * 0.06)}px serif`;
        ctx.fillStyle = stray.ink;
        ctx.textAlign = 'center';
        ctx.fillText(stray.g, 0, 0);
        ctx.restore();
        cameo.set(camX, camY - h * 0.018, 42);
        drawCameoMark(ctx, cameo, camX, camY - h * 0.018, t, p, alpha);
        ctx.globalAlpha = 1;
        ctx.textAlign = 'left';
      }
    };
  },

  work(seed, variant) {
    const cameo = makeCameo();
    if (variant === 'studio') {
      // her single window, still lit past midnight
      const stars = Array.from({ length: 34 }, (_, i) => ({
        x: Math.random(), y: Math.random() * 0.5, s: 0.6 + Math.random() * 1.6, ph: i * 1.9 + seed
      }));
      return {
        cameo,
        draw(ctx, w, h, t, p, local, alpha) {
          ctx.globalAlpha = alpha;
          for (const st of stars) {
            const tw = 0.3 + 0.7 * Math.abs(Math.sin(t * 1.05 + st.ph));
            ctx.fillStyle = `rgba(240, 220, 178, ${0.7 * tw})`;
            ctx.beginPath();
            ctx.arc(st.x * w, st.y * h, st.s, 0, Math.PI * 2);
            ctx.fill();
          }
          // her studio building, right of frame
          const bx = w * 0.56, bw = w * 0.38, btop = h * 0.16;
          ctx.fillStyle = 'rgba(16, 12, 26, 0.95)';
          ctx.fillRect(bx, btop, bw, h - btop);
          const cols = 4, rows = 6;
          const wx0 = bx + bw * 0.1, wgx = (bw * 0.8) / (cols - 0.4);
          const wy0 = btop + h * 0.05, wgy = (h - btop - h * 0.12) / rows;
          const litC = 1, litR = 2;
          for (let cx = 0; cx < cols; cx++) {
            for (let cy = 0; cy < rows; cy++) {
              const wx = wx0 + cx * wgx, wy = wy0 + cy * wgy;
              const ws = Math.min(w, h) * 0.026;
              if (cx === litC && cy === litR) {
                const flicker = 0.9 + Math.sin(t * 6.4) * 0.06;
                const halo = ctx.createRadialGradient(wx, wy, 0, wx, wy, ws * 7);
                halo.addColorStop(0, `rgba(255, 198, 128, ${0.42 * flicker})`);
                halo.addColorStop(1, 'rgba(255, 198, 128, 0)');
                ctx.fillStyle = halo;
                ctx.fillRect(wx - ws * 7, wy - ws * 7, ws * 14, ws * 14);
                ctx.fillStyle = `rgba(255, 212, 150, ${0.95 * flicker})`;
                ctx.fillRect(wx - ws, wy - ws * 1.3, ws * 2, ws * 2.6);
                // her, bent over the board
                ctx.fillStyle = 'rgba(40, 24, 16, 0.85)';
                ctx.beginPath();
                ctx.arc(wx - ws * 0.2, wy - ws * 0.2, ws * 0.34, 0, Math.PI * 2);
                ctx.fill();
                ctx.save();
                ctx.translate(wx, wy + ws * 0.5);
                ctx.rotate(-0.3);
                ctx.fillRect(-ws * 0.7, 0, ws * 1.5, ws * 0.18);
                ctx.restore();
              } else {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.045)';
                ctx.fillRect(wx - ws, wy - ws * 1.3, ws * 2, ws * 2.6);
              }
            }
          }
          // cameo: across the street, someone counting lit windows
          const ox = w * 0.13, obw = w * 0.2, otop = h * 0.34;
          ctx.fillStyle = 'rgba(22, 17, 34, 0.92)';
          ctx.fillRect(ox, otop, obw, h - otop);
          const cwx = ox + obw * 0.5, cwy = h * 0.52, cws = Math.min(w, h) * 0.024;
          ctx.fillStyle = 'rgba(214, 196, 170, 0.34)';
          ctx.fillRect(cwx - cws, cwy - cws * 1.3, cws * 2, cws * 2.6);
          ctx.fillStyle = 'rgba(14, 10, 20, 0.9)';
          ctx.beginPath();
          ctx.arc(cwx + cws * 0.1, cwy - cws * 0.1, cws * 0.36, 0, Math.PI * 2); // his head
          ctx.fill();
          ctx.fillRect(cwx - cws * 0.26, cwy + cws * 0.2, cws * 0.74, cws * 1.06); // shoulders
          cameo.set(cwx, cwy, 42);
          drawCameoMark(ctx, cameo, cwx, cwy, t, p, alpha);
          // street between them
          ctx.fillStyle = 'rgba(10, 7, 16, 0.96)';
          ctx.fillRect(0, h * 0.9, w, h * 0.1);
          ctx.strokeStyle = 'rgba(240, 196, 130, 0.18)';
          ctx.lineWidth = 1.4;
          ctx.setLineDash([10, 14]);
          ctx.beginPath();
          ctx.moveTo(0, h * 0.95);
          ctx.lineTo(w, h * 0.95);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.globalAlpha = 1;
        }
      };
    }

    // his sixth-floor view: a city of lit windows to count
    const buildings = [];
    let bx = -0.02;
    while (bx < 1.05) {
      const bw = 0.05 + Math.random() * 0.09;
      buildings.push({ x: bx, w: bw, h: 0.26 + Math.random() * 0.4, seed: Math.random() * 100 });
      bx += bw + 0.012;
    }
    // her window: a fixed cell on a building near the right third
    const herB = buildings.reduce((best, b) =>
      Math.abs(b.x - 0.68) < Math.abs(best.x - 0.68) ? b : best, buildings[0]);
    return {
      cameo,
      draw(ctx, w, h, t, p, local, alpha) {
        ctx.globalAlpha = alpha;
        for (let i = 0; i < 30; i++) {
          const sx = (i * 73.7) % w;
          const sy = (i * 31.3) % (h * 0.45);
          ctx.fillStyle = `rgba(250, 240, 220, ${0.25 + 0.45 * Math.abs(Math.sin(t + i))})`;
          ctx.fillRect(sx, sy, 1.7, 1.7);
        }
        for (const b of buildings) {
          const X = b.x * w, W = b.w * w, H = b.h * h, Y = h - H;
          ctx.fillStyle = 'rgba(30, 22, 38, 0.92)';
          ctx.fillRect(X, Y, W, H);
          const cols = Math.max(2, Math.floor(W / 17));
          const rows = Math.max(3, Math.floor(H / 24));
          for (let cx = 0; cx < cols; cx++) {
            for (let cy = 0; cy < rows; cy++) {
              const wx = X + 5 + cx * ((W - 10) / cols);
              const wy = Y + 8 + cy * ((H - 14) / rows);
              if (b === herB && cx === Math.min(1, cols - 1) && cy === Math.min(2, rows - 1)) {
                // the one window that never goes dark before midnight —
                // rose-warm, breathing, haloed, so it reads against the grid
                const breathe = 0.86 + Math.sin(t * 2.2) * 0.14;
                const halo = ctx.createRadialGradient(wx + 4, wy + 5, 0, wx + 4, wy + 5, 64);
                halo.addColorStop(0, `rgba(255, 150, 122, ${0.8 * breathe})`);
                halo.addColorStop(0.4, `rgba(255, 160, 128, ${0.3 * breathe})`);
                halo.addColorStop(1, 'rgba(255, 160, 128, 0)');
                ctx.fillStyle = halo;
                ctx.fillRect(wx - 60, wy - 59, 128, 128);
                ctx.fillStyle = `rgba(255, 182, 138, ${0.98 * breathe})`;
                ctx.fillRect(wx - 3, wy - 3.5, 13, 17);
                ctx.fillStyle = 'rgba(40, 24, 16, 0.9)';
                ctx.beginPath();
                ctx.arc(wx + 3.5, wy + 4.6, 2.3, 0, Math.PI * 2); // her, tiny, at the desk
                ctx.fill();
                ctx.fillRect(wx + 1.2, wy + 7, 4.6, 4.8);
                cameo.set(wx + 3.5, wy + 4.5, 44);
                drawCameoMark(ctx, cameo, wx + 3.5, wy + 4.5, t, p, alpha);
                continue;
              }
              const flick = Math.sin(b.seed + cx * 7.3 + cy * 3.1 + Math.floor(t * 0.5));
              let on = flick > 0.5;
              let warm = 0;
              if (p.active) {
                const d = Math.hypot(wx - p.x, wy - p.y);
                warm = Math.max(0, 1 - d / (w * 0.12));
                if (warm > 0.12) on = true;
              }
              if (on) {
                ctx.fillStyle = warm > 0.12
                  ? `rgba(255, 178, 150, ${0.55 + warm * 0.45})`
                  : 'rgba(240, 196, 130, 0.55)';
                ctx.fillRect(wx, wy, 6, 9);
              }
            }
          }
        }
        ctx.fillStyle = 'rgba(16, 11, 22, 0.96)';
        ctx.beginPath();
        ctx.moveTo(0, h);
        ctx.lineTo(0, h * 0.86);
        ctx.lineTo(w * 0.2, h * 0.86);
        ctx.lineTo(w * 0.22, h * 0.82);
        ctx.lineTo(w * 0.3, h * 0.82);
        ctx.lineTo(w * 0.32, h * 0.86);
        ctx.lineTo(w, h * 0.86);
        ctx.lineTo(w, h);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    };
  },

  searching(seed, variant) {
    const cameo = makeCameo();
    if (variant === 'almost') {
      // the city kept practicing: two strangers, three near-misses
      const drops = Array.from({ length: 54 }, () => ({
        x: Math.random(), y: Math.random(), v: 0.012 + Math.random() * 0.009, l: 8 + Math.random() * 11
      }));
      return {
        cameo,
        draw(ctx, w, h, t, p, local, alpha) {
          ctx.globalAlpha = alpha;
          // rain
          ctx.strokeStyle = 'rgba(206, 212, 232, 0.2)';
          ctx.lineWidth = 1;
          for (const d of drops) {
            const dy = ((d.y + t * d.v) % 1.08) - 0.04;
            const dx = d.x * w - dy * 22;
            ctx.beginPath();
            ctx.moveTo(dx, dy * h);
            ctx.lineTo(dx - 3, dy * h + d.l);
            ctx.stroke();
          }
          // the bookshop she keeps almost meeting him in, on the pavement
          const gy = h * 0.78;
          const shX = w * 0.5, shW = Math.min(w, h) * 0.24, shH = shW * 0.95;
          const shTop = gy - shH;
          ctx.fillStyle = 'rgba(34, 24, 30, 0.92)';
          ctx.fillRect(shX - shW / 2, shTop, shW, shH);
          const shopGlow = ctx.createRadialGradient(shX, gy - shH * 0.4, 0, shX, gy - shH * 0.4, shW * 1.4);
          shopGlow.addColorStop(0, 'rgba(238, 190, 120, 0.18)');
          shopGlow.addColorStop(1, 'rgba(238, 190, 120, 0)');
          ctx.fillStyle = shopGlow;
          ctx.fillRect(shX - shW * 1.5, shTop - shW * 0.5, shW * 3, shH + shW);
          ctx.fillStyle = 'rgba(238, 190, 120, 0.42)';
          ctx.fillRect(shX - shW * 0.36, shTop + shH * 0.32, shW * 0.72, shH * 0.58);
          // awning
          ctx.fillStyle = 'rgba(150, 84, 76, 0.9)';
          for (let i = 0; i < 5; i++) {
            ctx.beginPath();
            ctx.arc(shX - shW * 0.4 + (i + 0.5) * shW * 0.16, shTop + shH * 0.26, shW * 0.085, 0, Math.PI);
            ctx.fill();
          }
          // tiny stacked spines in the glow
          const spines = ['rgba(238, 210, 170, 0.7)', 'rgba(217, 140, 127, 0.7)', 'rgba(160, 170, 110, 0.7)'];
          spines.forEach((c, i) => {
            ctx.fillStyle = c;
            ctx.fillRect(shX - shW * 0.26 + i * shW * 0.2, gy - shH * 0.28 - (i % 2) * 5, shW * 0.05, shW * 0.2);
          });
          // wet pavement
          ctx.fillStyle = 'rgba(20, 16, 26, 0.85)';
          ctx.fillRect(0, gy, w, h - gy);
          ctx.fillStyle = 'rgba(238, 190, 120, 0.1)';
          ctx.beginPath();
          ctx.ellipse(shX, gy + 14, shW * 0.55, 9, 0, 0, Math.PI * 2);
          ctx.fill();
          // the two of them, forever out of phase
          const cyc = (t * 0.1 + seed) % 1;
          const herX = w * (1.06 - cyc * 1.12);
          const hisX = w * (cyc * 1.12 - 0.06);
          const s = Math.min(w, h) * 0.06;
          const step = Math.sin(t * 7) * 3.4;
          // her, solid: this is her chapter
          drawFigure(ctx, herX, gy + 2, s, { dress: true, dir: -1 });
          // him, a passing blur — the cameo
          ctx.save();
          ctx.globalAlpha = alpha * 0.42;
          drawFigure(ctx, hisX, gy + 2, s, { dir: 1, step });
          ctx.restore();
          // umbrella over him
          ctx.save();
          ctx.globalAlpha = alpha * 0.42;
          ctx.fillStyle = '#3c4254';
          ctx.beginPath();
          ctx.arc(hisX, gy - s * 2.4, s * 0.85, Math.PI, 0);
          ctx.fill();
          ctx.strokeStyle = '#3c4254';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(hisX, gy - s * 2.4);
          ctx.lineTo(hisX, gy - s * 1.5);
          ctx.stroke();
          ctx.restore();
          // a spark when they pass without seeing each other
          const near = Math.max(0, 1 - Math.abs(herX - hisX) / (s * 3));
          if (near > 0.1) {
            ctx.strokeStyle = `rgba(255, 214, 150, ${near * 0.6})`;
            ctx.lineWidth = 1.3;
            ctx.beginPath();
            ctx.arc((herX + hisX) / 2, gy - s * 1.4, s * (0.7 + near * 0.4), -2.4, -0.7);
            ctx.stroke();
          }
          cameo.set(hisX, gy - s * 1.2, Math.max(40, s * 1.2));
          drawCameoMark(ctx, cameo, hisX, gy - s * 1.2, t, p, alpha);
          ctx.globalAlpha = 1;
        }
      };
    }

    // his search: a lantern, fireflies, and a seat kept free
    const flies = Array.from({ length: 24 }, () => ({
      x: Math.random(), y: Math.random(), vx: 0, vy: 0, ph: Math.random() * 9
    }));
    let lx = 0.5, ly = 0.55;
    return {
      cameo,
      draw(ctx, w, h, t, p, local, alpha) {
        ctx.globalAlpha = alpha;
        const tx = p.active ? p.x : w * (0.5 + Math.sin(t * 0.35) * 0.32);
        const ty = p.active ? p.y : h * (0.55 + Math.cos(t * 0.28) * 0.18);
        lx += (tx - lx) * 0.045;
        ly += (ty - ly) * 0.045;
        ctx.strokeStyle = 'rgba(240, 196, 130, 0.14)';
        ctx.lineWidth = 2;
        ctx.setLineDash([2, 14]);
        ctx.beginPath();
        ctx.moveTo(0, h * 0.88);
        ctx.quadraticCurveTo(w * 0.5, h * 0.82, w, h * 0.9);
        ctx.stroke();
        ctx.setLineDash([]);
        const r = Math.min(w, h) * 0.42;
        const glow = ctx.createRadialGradient(lx, ly, 0, lx, ly, r);
        glow.addColorStop(0, 'rgba(238, 186, 110, 0.75)');
        glow.addColorStop(0.35, 'rgba(220, 150, 95, 0.25)');
        glow.addColorStop(1, 'rgba(220, 150, 95, 0)');
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, w, h);
        ctx.save();
        ctx.translate(lx, ly + Math.sin(t * 2) * 4);
        ctx.strokeStyle = '#b98a47';
        ctx.fillStyle = 'rgba(252, 224, 160, 0.95)';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.ellipse(0, 0, 11, 16, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, -16);
        ctx.lineTo(0, -28);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, -31, 3.4, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
        for (const f of flies) {
          const fx = f.x * w, fy = f.y * h;
          const d = Math.hypot(lx - fx, ly - fy);
          const pull = Math.min(0.00014, 0.1 / (d * d + 40));
          f.vx += (lx - fx) * pull + (Math.random() - 0.5) * 0.0007;
          f.vy += (ly - fy) * pull + (Math.random() - 0.5) * 0.0007;
          f.vx *= 0.96; f.vy *= 0.96;
          f.x += f.vx; f.y += f.vy;
          f.x = (f.x + 1) % 1; f.y = (f.y + 1) % 1;
          const tw = 0.25 + 0.75 * Math.abs(Math.sin(t * 2.2 + f.ph));
          ctx.fillStyle = `rgba(244, 214, 130, ${tw})`;
          ctx.beginPath();
          ctx.arc(f.x * w, f.y * h, 2.4, 0, Math.PI * 2);
          ctx.fill();
        }
        // the seat he keeps free, everywhere he goes
        const bx2 = w * 0.78, by2 = h * 0.86, bs = Math.min(w, h) * 0.07;
        ctx.save();
        ctx.translate(bx2, by2);
        ctx.strokeStyle = 'rgba(150, 122, 90, 0.8)';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-bs, 0); ctx.lineTo(bs, 0); // seat
        ctx.moveTo(-bs * 0.85, 0); ctx.lineTo(-bs * 0.85, bs * 0.5);
        ctx.moveTo(bs * 0.85, 0); ctx.lineTo(bs * 0.85, bs * 0.5); // legs
        ctx.moveTo(-bs, -bs * 0.62); ctx.lineTo(bs, -bs * 0.62); // backrest
        ctx.moveTo(-bs * 0.85, 0); ctx.lineTo(-bs * 0.85, -bs * 0.62);
        ctx.moveTo(bs * 0.85, 0); ctx.lineTo(bs * 0.85, -bs * 0.62);
        ctx.stroke();
        ctx.restore();
        // cameo: she passed this exact spot, minutes before him
        const cyc2 = (t * 0.085 + seed * 0.1) % 1;
        const ghX = w * (1.08 - cyc2 * 1.2);
        const ghS = Math.min(w, h) * 0.052;
        ctx.save();
        ctx.globalAlpha = alpha * 0.34;
        drawFigure(ctx, ghX, by2 + 2, ghS, { dress: true, dir: -1 });
        ctx.fillStyle = '#5a4456';
        ctx.beginPath();
        ctx.arc(ghX, by2 - ghS * 2.3, ghS * 0.8, Math.PI, 0); // her umbrella
        ctx.fill();
        ctx.strokeStyle = '#5a4456';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(ghX, by2 - ghS * 2.3);
        ctx.lineTo(ghX, by2 - ghS * 1.4);
        ctx.stroke();
        ctx.restore();
        cameo.set(ghX, by2 - ghS * 1.2, Math.max(40, ghS * 1.2));
        drawCameoMark(ctx, cameo, ghX, by2 - ghS * 1.2, t, p, alpha);
        ctx.globalAlpha = 1;
      }
    };
  },

  meeting() {
    return {
      draw(ctx, w, h, t, p, local, alpha) {
        ctx.globalAlpha = alpha;
        const gy = h * 0.8;
        const sun = ctx.createRadialGradient(w / 2, gy, 0, w / 2, gy, h * 0.75);
        sun.addColorStop(0, 'rgba(255, 226, 170, 0.8)');
        sun.addColorStop(0.4, 'rgba(255, 200, 150, 0.25)');
        sun.addColorStop(1, 'rgba(255, 200, 150, 0)');
        ctx.fillStyle = sun;
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = 'rgba(150, 110, 84, 0.3)';
        ctx.fillRect(0, gy + 6, w, h - gy);
        ctx.strokeStyle = 'rgba(150, 110, 84, 0.5)';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(0, gy + 6);
        ctx.lineTo(w, gy + 6);
        ctx.stroke();

        const adv = smooth(0.05, 0.78, local);
        const lx = w * (0.08 + adv * 0.36);
        const rx = w * (0.92 - adv * 0.36);
        const step = Math.sin(t * 7) * (adv < 0.99 ? 4 : 0);
        const s = Math.min(w, h) * 0.075;

        drawFigure(ctx, lx, gy + 4, s, { step, dir: 1 });
        drawFigure(ctx, rx, gy + 4, s, { dress: true, dir: -1 });

        if (adv > 0.97) {
          const beat = 1 + Math.sin(t * 5) * 0.09;
          const hy = gy - h * 0.3;
          ctx.save();
          ctx.translate(w / 2, hy);
          ctx.scale(beat, beat);
          ctx.fillStyle = '#c96f63';
          const hs = Math.min(w, h) * 0.045;
          ctx.beginPath();
          ctx.moveTo(0, hs * 0.9);
          ctx.bezierCurveTo(-hs * 1.4, -hs * 0.3, -hs * 0.5, -hs * 1.2, 0, -hs * 0.35);
          ctx.bezierCurveTo(hs * 0.5, -hs * 1.2, hs * 1.4, -hs * 0.3, 0, hs * 0.9);
          ctx.fill();
          ctx.restore();
          ctx.strokeStyle = 'rgba(238, 186, 110, 0.35)';
          ctx.lineWidth = 1.4;
          for (let i = 0; i < 7; i++) {
            const a = -Math.PI / 2 + (i - 3) * 0.26 + Math.sin(t * 0.7) * 0.02;
            ctx.beginPath();
            ctx.moveTo(w / 2 + Math.cos(a) * s2(w, h, 0.075), hy + Math.sin(a) * s2(w, h, 0.075));
            ctx.lineTo(w / 2 + Math.cos(a) * s2(w, h, 0.13), hy + Math.sin(a) * s2(w, h, 0.13));
            ctx.stroke();
          }
        }
        ctx.globalAlpha = 1;
      }
    };
  },

  proposal() {
    const stars = Array.from({ length: 40 }, (_, i) => ({
      x: Math.random(), y: Math.random() * 0.5, s: 0.7 + Math.random() * 1.8, ph: i * 2.3
    }));
    const windows = Array.from({ length: 60 }, (_, i) => ({
      x: 0.04 + ((i * 0.171) % 0.92), y: 0.62 + ((i * 0.083) % 0.1), ph: i * 1.3
    }));
    return {
      draw(ctx, w, h, t, p, local, alpha) {
        ctx.globalAlpha = alpha;
        for (const st of stars) {
          const tw = 0.3 + 0.7 * Math.abs(Math.sin(t * 0.9 + st.ph));
          ctx.fillStyle = `rgba(248, 224, 180, ${0.75 * tw})`;
          ctx.beginPath();
          ctx.arc(st.x * w, st.y * h, st.s, 0, Math.PI * 2);
          ctx.fill();
        }
        // the city they almost met in, far below — melts into the dusk
        const cityG = ctx.createLinearGradient(0, h * 0.58, 0, h * 0.74);
        cityG.addColorStop(0, 'rgba(24, 16, 34, 0)');
        cityG.addColorStop(0.5, 'rgba(24, 16, 34, 0.4)');
        cityG.addColorStop(1, 'rgba(24, 16, 34, 0)');
        ctx.fillStyle = cityG;
        ctx.fillRect(0, h * 0.58, w, h * 0.16);
        for (const win of windows) {
          const on = Math.sin(win.ph + Math.floor(t * 0.4)) > 0.1;
          if (on) {
            ctx.fillStyle = 'rgba(240, 196, 130, 0.75)';
            ctx.fillRect(win.x * w, win.y * h, 2.4, 3.6);
          }
        }
        // the hill
        ctx.fillStyle = '#1c1226';
        ctx.beginPath();
        ctx.moveTo(0, h);
        ctx.lineTo(0, h * 0.92);
        ctx.quadraticCurveTo(w * 0.35, h * 0.6, w * 0.62, h * 0.66);
        ctx.quadraticCurveTo(w * 0.85, h * 0.72, w, h * 0.86);
        ctx.lineTo(w, h);
        ctx.closePath();
        ctx.fill();
        // a couple of grasses
        ctx.strokeStyle = 'rgba(240, 196, 130, 0.25)';
        ctx.lineWidth = 1.4;
        for (let i = 0; i < 7; i++) {
          const gx = w * (0.12 + i * 0.115);
          const gy = h * (0.74 - Math.sin(i * 1.2) * 0.045);
          ctx.beginPath();
          ctx.moveTo(gx, gy + 10);
          ctx.quadraticCurveTo(gx + Math.sin(t * 1.6 + i) * 5, gy - 6, gx + Math.sin(t * 1.6 + i) * 9, gy - 14);
          ctx.stroke();
        }

        const gy = h * 0.655;
        const s = Math.min(w, h) * 0.075;
        const kneel = smooth(0.25, 0.55, local);
        const cx = w * 0.46;
        drawFigure(ctx, cx - s * 0.85, gy, s, { kneel, dir: 1 });
        drawFigure(ctx, cx + s * 0.85, gy, s, { dress: true, dir: -1 });

        // the ring
        const ringOn = smooth(0.5, 0.62, local);
        if (ringOn > 0.01) {
          const rx = cx - s * 0.18, ry = gy - s * (0.85 - kneel * 0.25);
          ctx.globalAlpha = alpha * ringOn;
          const glow = ctx.createRadialGradient(rx, ry, 0, rx, ry, s * 1.8);
          glow.addColorStop(0, 'rgba(255, 232, 170, 0.5)');
          glow.addColorStop(1, 'rgba(255, 232, 170, 0)');
          ctx.fillStyle = glow;
          ctx.fillRect(rx - s * 2, ry - s * 2, s * 4, s * 4);
          ctx.strokeStyle = '#f3d289';
          ctx.lineWidth = 2.4;
          ctx.beginPath();
          ctx.arc(rx, ry, s * 0.16, 0, Math.PI * 2);
          ctx.stroke();
          ctx.fillStyle = '#fff6dd';
          ctx.save();
          ctx.translate(rx, ry - s * 0.24);
          ctx.rotate(Math.PI / 4);
          const d = s * 0.085;
          ctx.fillRect(-d / 2, -d / 2, d, d);
          ctx.restore();
          // sparkle rays
          ctx.strokeStyle = `rgba(255, 244, 210, ${0.6 * (0.5 + 0.5 * Math.sin(t * 6))})`;
          ctx.lineWidth = 1.2;
          for (let i = 0; i < 4; i++) {
            const a = i * Math.PI / 2 + t * 0.8;
            ctx.beginPath();
            ctx.moveTo(rx + Math.cos(a) * s * 0.3, ry - s * 0.24 + Math.sin(a) * s * 0.3);
            ctx.lineTo(rx + Math.cos(a) * s * 0.55, ry - s * 0.24 + Math.sin(a) * s * 0.55);
            ctx.stroke();
          }
        }

        // the yes: gold stars burst, gently held
        const yes = smooth(0.7, 0.85, local);
        if (yes > 0.01) {
          ctx.globalAlpha = alpha * yes;
          for (let i = 0; i < 18; i++) {
            const a = (i / 18) * Math.PI * 2;
            const rr = s * (1.1 + yes * 1.6) + Math.sin(t * 3 + i) * 5;
            const px2 = cx + Math.cos(a) * rr;
            const py2 = gy - s * 1.4 + Math.sin(a) * rr * 0.7;
            ctx.fillStyle = `rgba(244, 214, 130, ${0.5 + 0.5 * Math.sin(t * 4 + i * 2)})`;
            ctx.beginPath();
            ctx.arc(px2, py2, 1.8, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        ctx.globalAlpha = 1;
      }
    };
  },

  reveal() {
    const petals = Array.from({ length: 26 }, (_, i) => ({
      x: Math.random(), y: Math.random(), s: 4 + Math.random() * 7,
      sway: 0.5 + Math.random(), ph: i * 1.9, v: 0.018 + Math.random() * 0.03
    }));
    return {
      draw(ctx, w, h, t, p, local, alpha) {
        ctx.globalAlpha = alpha;
        // breathing glow behind the names
        const glow = ctx.createRadialGradient(w / 2, h * 0.46, 0, w / 2, h * 0.46, h * 0.62);
        glow.addColorStop(0, `rgba(244, 206, 156, ${0.22 + 0.06 * Math.sin(t * 0.8)})`);
        glow.addColorStop(1, 'rgba(244, 206, 156, 0)');
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, w, h);
        // two interlocked rings, slowly turning
        const ry = h * 0.088, rr = Math.min(w, h) * 0.03;
        ctx.save();
        ctx.translate(w / 2, ry);
        ctx.rotate(Math.sin(t * 0.4) * 0.08);
        ctx.lineWidth = 2.6;
        ctx.strokeStyle = 'rgba(227, 201, 142, 0.9)';
        ctx.beginPath();
        ctx.arc(-rr * 0.62, 0, rr, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(227, 201, 142, 0.65)';
        ctx.beginPath();
        ctx.arc(rr * 0.62, 0, rr, 0.45, Math.PI * 2 + 0.05);
        ctx.stroke();
        const sp = 0.5 + 0.5 * Math.sin(t * 2.4);
        ctx.fillStyle = `rgba(255, 246, 221, ${0.5 + sp * 0.5})`;
        ctx.beginPath();
        ctx.arc(-rr * 0.62, -rr, 2 + sp * 1.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        // falling petals
        for (const pe of petals) {
          const py = ((pe.y + t * pe.v) % 1.15) - 0.07;
          const px = pe.x * w + Math.sin(t * pe.sway + pe.ph) * 26;
          ctx.save();
          ctx.translate(px, py * h);
          ctx.rotate(Math.sin(t * 0.9 + pe.ph) * 0.9);
          ctx.fillStyle = 'rgba(217, 140, 127, 0.5)';
          ctx.beginPath();
          ctx.ellipse(0, 0, pe.s, pe.s * 0.55, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
        ctx.globalAlpha = 1;
      }
    };
  },

  moments(media) {
    // The Projection Room: the invitation is a film, so the gallery is the
    // booth itself — a dusty beam, a breathing screen, a sprocket filmstrip.
    const imgs = (media || []).map((m) => {
      const img = new Image();
      img.src = m.src;
      return { img, caption: (m.caption || '').toUpperCase() };
    });
    const N = Math.max(1, imgs.length);
    const dust = Array.from({ length: 64 }, (_, i) => ({
      u: Math.random(), q: Math.random(), vu: 0, vq: 0,
      drift: 0.01 + Math.random() * 0.02, ph: i * 1.7, s: 0.5 + Math.random() * 1.3
    }));
    let lastIdx = -1, cutAt = -1e9;

    const cover = (ctx, m, dx, dy, dw, dh) => {
      if (!m.img.complete || !m.img.naturalWidth) {
        ctx.fillStyle = '#241c28';
        ctx.fillRect(dx, dy, dw, dh);
        return;
      }
      const iw = m.img.naturalWidth, ih = m.img.naturalHeight;
      const k = Math.max(dw / iw, dh / ih);
      const sw2 = dw / k, sh2 = dh / k;
      ctx.drawImage(m.img, (iw - sw2) / 2, (ih - sh2) / 2, sw2, sh2, dx, dy, dw, dh);
    };

    return {
      draw(ctx, w, h, t, p, local, alpha) {
        const mobile = w < 700;
        ctx.globalAlpha = alpha;

        // ---- geometry
        const sw = w * (mobile ? 0.86 : 0.6);
        const sh = sw * (mobile ? 0.68 : 0.56);
        const scx = w / 2;
        const scy = h * (mobile ? 0.44 : 0.45);
        const sx = scx - sw / 2, sy = scy - sh / 2;

        // ---- reel position from scroll; the reel finishes before the
        // chapter crossfade starts (frac 0.6), so every frame gets seen
        const tl = Math.min(0.9999, Math.max(0, (local - 0.07) / 0.62));
        const fIdx = Math.min(N - 1, Math.floor(tl * N));
        if (fIdx !== lastIdx) { lastIdx = fIdx; cutAt = t; }
        const sinceCut = t - cutAt;
        const cut = Math.max(0, 1 - sinceCut / 0.4);
        const flicker = 0.93
          + Math.sin(t * 23) * 0.022
          + Math.sin(t * 61) * 0.013
          + cut * 0.2;
        const jitter = cut * Math.sin(t * 130) * 6;

        // ---- the beam, widening from an aperture above the frame
        const ax = scx, ay = -h * 0.04;
        const beamHalf = (q) => 16 + (sw * 0.5 - 16) * q; // half-width at q∈[0..1]
        for (let i = 0; i < 3; i++) {
          const spread = 1 + i * 0.22;
          const bg = ctx.createLinearGradient(0, ay, 0, sy + sh * 0.3);
          bg.addColorStop(0, `rgba(255, 234, 192, ${(0.17 - i * 0.05) * flicker})`);
          bg.addColorStop(1, 'rgba(255, 234, 192, 0.015)');
          ctx.fillStyle = bg;
          ctx.beginPath();
          ctx.moveTo(ax - 16 * spread, ay);
          ctx.lineTo(ax + 16 * spread, ay);
          ctx.lineTo(scx + sw * 0.5 * spread, sy + 4);
          ctx.lineTo(scx - sw * 0.5 * spread, sy + 4);
          ctx.closePath();
          ctx.fill();
        }
        const ap = ctx.createRadialGradient(ax, ay + 20, 0, ax, ay + 20, 90);
        ap.addColorStop(0, `rgba(255, 244, 214, ${0.6 * flicker})`);
        ap.addColorStop(1, 'rgba(255, 244, 214, 0)');
        ctx.fillStyle = ap;
        ctx.fillRect(ax - 90, ay - 70, 180, 180);

        // ---- dust drifting in the light; the cursor stirs it
        for (const d of dust) {
          d.q += d.drift * 0.016 + d.vq;
          d.u += Math.sin(t * 0.4 + d.ph) * 0.0006 + d.vu;
          d.vu *= 0.94; d.vq *= 0.94;
          if (d.q > 1) { d.q -= 1; d.u = Math.random(); }
          if (d.u < 0) d.u += 1; else if (d.u > 1) d.u -= 1;
          const dy2 = ay + (sy + sh * 0.25 - ay) * d.q;
          const dx2 = ax + (d.u - 0.5) * 2 * beamHalf(d.q);
          if (p.active) {
            const dist = Math.hypot(dx2 - p.x, dy2 - p.y);
            if (dist < 130) {
              const push = (1 - dist / 130) * 0.004;
              d.vu += ((dx2 - p.x) / 130) * push * 2;
              d.vq += ((dy2 - p.y) / 130) * push;
            }
          }
          const tw = 0.25 + 0.75 * Math.abs(Math.sin(t * 1.8 + d.ph));
          ctx.fillStyle = `rgba(255, 238, 200, ${0.5 * tw * flicker})`;
          ctx.beginPath();
          ctx.arc(dx2, dy2, d.s, 0, Math.PI * 2);
          ctx.fill();
        }

        // ---- the screen
        const m = imgs[fIdx];
        ctx.save();
        // breathing canvas + cut jitter
        ctx.translate(scx, scy + jitter * 0.5);
        ctx.scale(1 + Math.sin(t * 0.7) * 0.003, 1 + Math.sin(t * 0.93) * 0.004);
        ctx.translate(-scx, -scy);
        // spill glow behind the screen
        const spill = ctx.createRadialGradient(scx, scy, sh * 0.2, scx, scy, sw * 0.85);
        spill.addColorStop(0, `rgba(255, 226, 180, ${0.16 * flicker})`);
        spill.addColorStop(1, 'rgba(255, 226, 180, 0)');
        ctx.fillStyle = spill;
        ctx.fillRect(scx - sw, scy - sw * 0.7, sw * 2, sw * 1.4);
        // surface
        ctx.fillStyle = `rgba(244, 234, 214, ${0.18 * flicker})`;
        ctx.fillRect(sx - 6, sy - 6, sw + 12, sh + 12);
        ctx.save();
        ctx.beginPath();
        ctx.rect(sx, sy, sw, sh);
        ctx.clip();
        cover(ctx, m, sx, sy, sw, sh);
        // projector warmth + brightness flicker
        ctx.fillStyle = `rgba(255, 214, 150, ${0.14 + (1 - flicker) * 0.4})`;
        ctx.fillRect(sx, sy, sw, sh);
        // vignette pooled in the corners
        const vg = ctx.createRadialGradient(scx, scy, sh * 0.34, scx, scy, sw * 0.72);
        vg.addColorStop(0, 'rgba(20, 10, 8, 0)');
        vg.addColorStop(1, 'rgba(20, 10, 8, 0.5)');
        ctx.fillStyle = vg;
        ctx.fillRect(sx, sy, sw, sh);
        // the cut: a white-hot frame slips through the gate
        if (cut > 0.02) {
          ctx.fillStyle = `rgba(255, 248, 230, ${cut * 0.85})`;
          ctx.fillRect(sx, sy, sw, sh);
        }
        // film grain
        for (let i = 0; i < 110; i++) {
          const gx = sx + Math.random() * sw;
          const gy = sy + Math.random() * sh;
          ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.07})`;
          ctx.fillRect(gx, gy, 1.3, 1.3);
        }
        // an occasional hair in the gate
        if (Math.sin(t * 0.9) > 0.93) {
          ctx.strokeStyle = 'rgba(30, 20, 14, 0.4)';
          ctx.lineWidth = 1;
          const hx = sx + sw * (0.2 + ((t * 7) % 0.6));
          ctx.beginPath();
          ctx.moveTo(hx, sy);
          ctx.quadraticCurveTo(hx + 8, sy + sh * 0.4, hx - 4, sy + sh);
          ctx.stroke();
        }
        ctx.restore();
        // warm-white screen edge
        ctx.strokeStyle = `rgba(250, 240, 220, ${0.5 * flicker})`;
        ctx.lineWidth = 1.4;
        ctx.strokeRect(sx - 6, sy - 6, sw + 12, sh + 12);
        ctx.restore();

        // ---- subtitle: the caption types itself out
        const chars = Math.max(0, Math.floor((sinceCut - 0.3) * 26));
        const shown = m.caption.slice(0, chars);
        if (shown) {
          ctx.font = `500 ${mobile ? 11 : 13}px Georgia, serif`;
          ctx.textAlign = 'center';
          ctx.fillStyle = `rgba(238, 210, 160, ${0.92 * alpha})`;
          const caret = chars < m.caption.length && Math.sin(t * 14) > 0 ? '▎' : '';
          ctx.fillText(shown.split('').join('\u200a') + caret, scx, sy + sh + (mobile ? 34 : 42));
          ctx.textAlign = 'left';
        }

        // ---- the filmstrip timeline
        const thW = Math.min(w, h) * (mobile ? 0.17 : 0.13);
        const thH = thW * 0.68;
        const gap = thW * 0.18;
        const stripCy = h * (mobile ? 0.87 : 0.86);
        const bandH = thH + thW * 0.22;
        // celluloid band
        ctx.fillStyle = 'rgba(8, 6, 12, 0.88)';
        ctx.fillRect(0, stripCy - bandH / 2, w, bandH);
        // the reel slides continuously with the scroll
        const reel = tl * N - 0.5;
        const pitch = thW + gap;
        // sprocket holes travel with the reel
        const holeP = pitch / 3;
        const holeOff = ((-reel * pitch) % holeP + holeP) % holeP;
        ctx.fillStyle = 'rgba(190, 175, 150, 0.4)';
        for (let hx = holeOff - holeP; hx < w + holeP; hx += holeP) {
          ctx.fillRect(hx, stripCy - bandH / 2 + bandH * 0.06, 5, 4);
          ctx.fillRect(hx, stripCy + bandH / 2 - bandH * 0.06 - 4, 5, 4);
        }
        // frames
        imgs.forEach((mm, i) => {
          const cx2 = scx + (i - reel) * pitch;
          if (cx2 < -thW || cx2 > w + thW) return;
          const active = i === fIdx;
          ctx.save();
          ctx.globalAlpha = alpha * (active ? 1 : 0.45);
          ctx.beginPath();
          ctx.rect(cx2 - thW / 2, stripCy - thH / 2, thW, thH);
          ctx.clip();
          cover(ctx, mm, cx2 - thW / 2, stripCy - thH / 2, thW, thH);
          ctx.fillStyle = active ? 'rgba(255, 214, 150, 0.12)' : 'rgba(10, 8, 14, 0.45)';
          ctx.fillRect(cx2 - thW / 2, stripCy - thH / 2, thW, thH);
          ctx.restore();
          if (active) {
            // the gate
            ctx.strokeStyle = `rgba(255, 232, 180, ${0.85 * flicker})`;
            ctx.lineWidth = 1.6;
            ctx.strokeRect(cx2 - thW / 2 - 4, stripCy - thH / 2 - 4, thW + 8, thH + 8);
          }
        });

        ctx.globalAlpha = 1;
      }
    };
  },

  day() {
    const confetti = Array.from({ length: 26 }, (_, i) => ({
      x: Math.random(), y: Math.random(), ph: i * 1.7, v: 0.015 + Math.random() * 0.02,
      c: ['rgba(217, 140, 127, 0.65)', 'rgba(227, 201, 142, 0.7)', 'rgba(255, 253, 248, 0.8)'][i % 3]
    }));
    return {
      draw(ctx, w, h, t, p, local, alpha) {
        ctx.globalAlpha = alpha;
        // the sun makes its way up as you scroll
        const sa = Math.PI * (1 - local * 0.5) - 0.35;
        const sx = w * 0.5 + Math.cos(sa) * w * 0.38;
        const sy = h * 0.7 - Math.sin(sa) * h * 0.34;
        const sun = ctx.createRadialGradient(sx, sy, 0, sx, sy, h * 0.4);
        sun.addColorStop(0, 'rgba(255, 244, 214, 0.95)');
        sun.addColorStop(0.12, 'rgba(255, 234, 186, 0.6)');
        sun.addColorStop(1, 'rgba(255, 234, 186, 0)');
        ctx.fillStyle = sun;
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#fdf2da';
        ctx.beginPath();
        ctx.arc(sx, sy, Math.min(w, h) * 0.035, 0, Math.PI * 2);
        ctx.fill();
        // birds
        ctx.strokeStyle = 'rgba(70, 80, 90, 0.5)';
        ctx.lineWidth = 1.6;
        for (let i = 0; i < 3; i++) {
          const bx = ((t * 0.014 + i * 0.33) % 1.2 - 0.1) * w;
          const by = h * (0.16 + i * 0.07) + Math.sin(t * 1.2 + i * 3) * 8;
          const fl = Math.sin(t * 6 + i * 2) * 4;
          ctx.beginPath();
          ctx.moveTo(bx - 8, by - fl * 0.4);
          ctx.quadraticCurveTo(bx - 3, by - 4 - fl, bx, by);
          ctx.quadraticCurveTo(bx + 3, by - 4 - fl, bx + 8, by - fl * 0.4);
          ctx.stroke();
        }
        // lawn
        const gy = h * 0.78;
        ctx.fillStyle = 'rgba(176, 184, 130, 0.5)';
        ctx.beginPath();
        ctx.moveTo(0, h);
        ctx.lineTo(0, gy + h * 0.05);
        ctx.quadraticCurveTo(w * 0.5, gy - h * 0.02, w, gy + h * 0.04);
        ctx.lineTo(w, h);
        ctx.closePath();
        ctx.fill();
        // the pavilion
        const cx = w * 0.5, base = gy + h * 0.02, pw = Math.min(w, h) * 0.34, phh = pw * 0.62;
        ctx.save();
        ctx.translate(cx, base);
        ctx.lineCap = 'round';
        // columns
        ctx.fillStyle = '#fbf4e6';
        ctx.strokeStyle = '#bba577';
        ctx.lineWidth = 2;
        for (const colX of [-pw / 2, -pw / 6, pw / 6, pw / 2]) {
          ctx.beginPath();
          ctx.rect(colX - pw * 0.022, -phh, pw * 0.044, phh);
          ctx.fill();
          ctx.stroke();
        }
        // pediment
        ctx.fillStyle = '#f7ecd6';
        ctx.beginPath();
        ctx.moveTo(-pw * 0.6, -phh);
        ctx.lineTo(pw * 0.6, -phh);
        ctx.lineTo(pw * 0.46, -phh - pw * 0.14);
        ctx.lineTo(-pw * 0.46, -phh - pw * 0.14);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-pw * 0.46, -phh - pw * 0.14);
        ctx.lineTo(0, -phh - pw * 0.3);
        ctx.lineTo(pw * 0.46, -phh - pw * 0.14);
        ctx.closePath();
        ctx.fillStyle = '#f3e3c4';
        ctx.fill();
        ctx.stroke();
        // garlands between columns
        ctx.strokeStyle = 'rgba(160, 170, 110, 0.9)';
        ctx.lineWidth = 2.4;
        for (const [a, b] of [[-pw / 2, -pw / 6], [-pw / 6, pw / 6], [pw / 6, pw / 2]]) {
          ctx.beginPath();
          ctx.moveTo(a, -phh * 0.94);
          ctx.quadraticCurveTo((a + b) / 2, -phh * 0.78 + Math.sin(t * 1.4) * 2, b, -phh * 0.94);
          ctx.stroke();
        }
        ctx.fillStyle = 'rgba(217, 140, 127, 0.9)';
        for (const [a, b] of [[-pw / 2, -pw / 6], [-pw / 6, pw / 6], [pw / 6, pw / 2]]) {
          for (let i = 1; i < 4; i++) {
            const tt = i / 4;
            const fx = lerp(a, b, tt);
            const fy = -phh * 0.94 + Math.sin(Math.PI * tt) * (phh * 0.15);
            ctx.beginPath();
            ctx.arc(fx, fy, 2.6, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        ctx.restore();
        // the two of them, under the middle
        const s = Math.min(w, h) * 0.052;
        drawFigure(ctx, cx - s * 0.6, base - 2, s, { dir: 1 });
        drawFigure(ctx, cx + s * 0.6, base - 2, s, { dress: true, dir: -1 });
        // drifting celebration
        for (const cf of confetti) {
          const py = ((cf.y + t * cf.v) % 1.05) - 0.02;
          ctx.fillStyle = cf.c;
          ctx.save();
          ctx.translate(cf.x * w + Math.sin(t * 1.3 + cf.ph) * 14, py * h);
          ctx.rotate(t * 2 + cf.ph);
          ctx.fillRect(-2.4, -1.4, 4.8, 2.8);
          ctx.restore();
        }
        ctx.globalAlpha = 1;
      }
    };
  },

  venue() {
    return {
      draw(ctx, w, h, t, p, local, alpha) {
        ctx.globalAlpha = alpha;
        const mobile = w < 700;
        // hand-drawn map: faint grid
        ctx.strokeStyle = 'rgba(185, 138, 71, 0.08)';
        ctx.lineWidth = 1;
        const grid = Math.min(w, h) * 0.07;
        for (let x = 0; x < w; x += grid) {
          ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
        }
        for (let y = 0; y < h; y += grid) {
          ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
        }
        // river
        ctx.strokeStyle = 'rgba(150, 185, 200, 0.6)';
        ctx.lineWidth = grid * 0.5;
        ctx.beginPath();
        ctx.moveTo(w * 0.05, h * 1.02);
        ctx.bezierCurveTo(w * 0.2, h * 0.7, w * 0.05, h * 0.42, w * 0.3, h * 0.18);
        ctx.stroke();
        // roads
        ctx.strokeStyle = 'rgba(141, 123, 110, 0.55)';
        ctx.lineWidth = grid * 0.26;
        ctx.beginPath();
        ctx.moveTo(0, h * 0.72);
        ctx.bezierCurveTo(w * 0.4, h * 0.66, w * 0.6, h * 0.78, w, h * 0.7);
        ctx.moveTo(w * 0.55, 0);
        ctx.bezierCurveTo(w * 0.5, h * 0.3, w * 0.62, h * 0.5, w * 0.55, h);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(250, 244, 232, 0.85)';
        ctx.lineWidth = 1.4;
        ctx.setLineDash([8, 10]);
        ctx.beginPath();
        ctx.moveTo(0, h * 0.72);
        ctx.bezierCurveTo(w * 0.4, h * 0.66, w * 0.6, h * 0.78, w, h * 0.7);
        ctx.moveTo(w * 0.55, 0);
        ctx.bezierCurveTo(w * 0.5, h * 0.3, w * 0.62, h * 0.5, w * 0.55, h);
        ctx.stroke();
        ctx.setLineDash([]);
        // trees
        for (let i = 0; i < 14; i++) {
          const tx = w * (0.08 + ((i * 0.193) % 0.32));
          const ty = h * (0.12 + ((i * 0.127) % 0.4));
          ctx.fillStyle = 'rgba(160, 170, 110, 0.65)';
          ctx.beginPath();
          ctx.arc(tx, ty, 5 + (i % 3) * 2.4, 0, Math.PI * 2);
          ctx.fill();
        }
        // blocks
        ctx.fillStyle = 'rgba(185, 138, 71, 0.2)';
        for (let i = 0; i < 7; i++) {
          const bx = w * (0.62 + ((i * 0.13) % 0.3));
          const by = h * (0.08 + ((i * 0.17) % 0.5));
          ctx.fillRect(bx, by, grid * (0.7 + (i % 2) * 0.5), grid * (0.55 + ((i + 1) % 2) * 0.4));
        }
        // the route, drawing itself toward the pin
        const pinX = w * (mobile ? 0.5 : 0.62), pinY = h * (mobile ? 0.3 : 0.4);
        const reveal2 = smooth(0.05, 0.5, local);
        ctx.strokeStyle = 'rgba(194, 96, 79, 0.85)';
        ctx.lineWidth = 2.6;
        ctx.setLineDash([1, 12]);
        ctx.lineCap = 'round';
        const path = new Path2D();
        path.moveTo(w * 0.06, h * 0.94);
        path.bezierCurveTo(w * 0.3, h * 0.9, w * 0.26, h * 0.62, pinX - 30, pinY + 60);
        ctx.save();
        // clip-grow the dotted route with a sweeping wipe
        ctx.beginPath();
        ctx.rect(0, h * (1 - reveal2 * 1.1), w, h * reveal2 * 1.4);
        ctx.clip();
        ctx.stroke(path);
        ctx.restore();
        ctx.setLineDash([]);
        // pin drop
        const drop = smooth(0.42, 0.6, local);
        if (drop > 0.01) {
          const py = pinY - (1 - drop) * h * 0.3;
          // pulse rings
          if (drop > 0.95) {
            const pr = ((t * 0.5) % 1);
            ctx.strokeStyle = `rgba(194, 96, 79, ${0.5 * (1 - pr)})`;
            ctx.lineWidth = 1.6;
            ctx.beginPath();
            ctx.arc(pinX, pinY + 4, 10 + pr * 36, 0, Math.PI * 2);
            ctx.stroke();
          }
          ctx.save();
          ctx.translate(pinX, py);
          ctx.globalAlpha = alpha * Math.min(1, drop * 1.4);
          ctx.fillStyle = '#c2604f';
          ctx.strokeStyle = '#93402f';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(0, -18, 13, Math.PI * 0.86, Math.PI * 0.14);
          ctx.quadraticCurveTo(11, -6, 0, 6);
          ctx.quadraticCurveTo(-11, -6, -12.2, -13);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = '#fdf6ec';
          // a heart where the hole should be
          ctx.beginPath();
          ctx.moveTo(0, -13);
          ctx.bezierCurveTo(-6, -21, -1.5, -24.5, 0, -20.5);
          ctx.bezierCurveTo(1.5, -24.5, 6, -21, 0, -13);
          ctx.fill();
          ctx.restore();
        }
        // compass
        ctx.save();
        ctx.translate(w * 0.9, h * 0.14);
        ctx.strokeStyle = 'rgba(141, 123, 110, 0.6)';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(0, 0, 17, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, 10);
        ctx.lineTo(0, -10);
        ctx.moveTo(-4, -4);
        ctx.lineTo(0, -10);
        ctx.lineTo(4, -4);
        ctx.stroke();
        ctx.font = 'italic 11px Georgia, serif';
        ctx.fillStyle = 'rgba(141, 123, 110, 0.8)';
        ctx.textAlign = 'center';
        ctx.fillText('N', 0, 28);
        ctx.restore();
        ctx.textAlign = 'left';
        ctx.globalAlpha = 1;
      }
    };
  },

  lanterns() {
    const stars = Array.from({ length: 60 }, (_, i) => ({
      x: Math.random(), y: Math.random() * 0.6, s: 0.6 + Math.random() * 1.6, ph: i * 1.3
    }));
    const field = []; // wish lanterns, populated via setWishes/launch
    // closure state (not object literal properties): Rollup would constant-fold
    // these and strip the mutations otherwise
    let coachOn = true;
    let avoidRect = null; // finale overlay box — keep the coach cue out of it
    const api = {
      field,
      setWishes(list) {
        field.length = 0;
        list.slice(0, 40).forEach((m, i) => {
          field.push({
            wish: m,
            x: 0.06 + ((i * 0.337 + 0.13) % 0.88),
            y: Math.random() * 1.1,
            v: 0.011 + ((i * 7919) % 100) / 100 * 0.014,
            sway: 0.4 + ((i * 31) % 10) / 10 * 0.8,
            ph: i * 2.7,
            depth: 0.45 + ((i * 13) % 10) / 10 * 0.6,
            launch: 0,
            sx: 0, sy: 0, r: 0, hot: false, hotT: 0
          });
        });
      },
      launch(wish) {
        field.push({
          wish, x: 0.5, y: 1.25, v: 0.013, sway: 0.7, ph: Math.random() * 7,
          depth: 1.05, launch: 1, sx: 0, sy: 0, r: 0, hot: false, hotT: 0
        });
      },
      get coach() { return coachOn; },
      dismissCoach() { coachOn = false; },
      setAvoid(rect) { avoidRect = rect; },
      _coachL: null,
      /** screen-space hit test, shared by hover + tap */
      hit(x, y) {
        let best = null, bestD = 1e9;
        for (const L of field) {
          const d = Math.hypot(L.sx - x, L.sy - y);
          if (d < Math.max(36, L.r) && d < bestD) { best = L; bestD = d; }
        }
        return best;
      }
    };
    api.draw = (ctx, w, h, t, p, local, alpha) => {
      ctx.globalAlpha = alpha;
      for (const st of stars) {
        const tw = 0.3 + 0.7 * Math.abs(Math.sin(t * 0.8 + st.ph));
        ctx.fillStyle = `rgba(235, 220, 190, ${0.6 * tw})`;
        ctx.beginPath();
        ctx.arc(st.x * w, st.y * h, st.s, 0, Math.PI * 2);
        ctx.fill();
      }
      // far mountains
      ctx.fillStyle = 'rgba(16, 12, 26, 0.7)';
      ctx.beginPath();
      ctx.moveTo(0, h);
      ctx.lineTo(0, h * 0.88);
      ctx.quadraticCurveTo(w * 0.22, h * 0.78, w * 0.42, h * 0.87);
      ctx.quadraticCurveTo(w * 0.66, h * 0.95, w * 0.8, h * 0.85);
      ctx.quadraticCurveTo(w * 0.92, h * 0.79, w, h * 0.88);
      ctx.lineTo(w, h);
      ctx.closePath();
      ctx.fill();

      for (const L of field) {
        // rise, loop back under the horizon
        L.y -= L.v * 0.016 * (L.launch ? 2.6 : 1);
        if (L.launch && L.y < 0.55) L.launch = 0;
        if (L.y < -0.18) L.y = 1.18;
        // hover response eases in and out
        L.hotT += ((L.hot ? 1 : 0) - L.hotT) * 0.16;
        const lx = L.x * w + Math.sin(t * L.sway + L.ph) * 22 * L.depth;
        const ly = L.y * h;
        const sc = s2(w, h, 0.028) * L.depth * (1 + 0.2 * L.hotT);
        L.sx = lx; L.sy = ly; L.r = sc * 3;
        const mine = !!L.wish.mine;
        const flick = (0.82 + 0.18 * Math.sin(t * 5 + L.ph * 3)) * (1 + 0.35 * L.hotT);
        // glow
        const g = ctx.createRadialGradient(lx, ly, 0, lx, ly, sc * 4.4);
        g.addColorStop(0, mine
          ? `rgba(255, 176, 150, ${Math.min(1, 0.5 * flick * L.depth)})`
          : `rgba(255, 196, 120, ${Math.min(1, 0.4 * flick * L.depth)})`);
        g.addColorStop(1, 'rgba(255, 196, 120, 0)');
        ctx.fillStyle = g;
        ctx.fillRect(lx - sc * 5, ly - sc * 5, sc * 10, sc * 10);
        // body
        ctx.save();
        ctx.translate(lx, ly);
        ctx.rotate(Math.sin(t * L.sway + L.ph) * 0.06);
        const bw = sc * 1.5, bh = sc * 2.1;
        const grad = ctx.createLinearGradient(0, -bh / 2, 0, bh / 2);
        const a1 = Math.min(1, 0.95 * flick), a2 = Math.min(1, 0.9 * flick);
        grad.addColorStop(0, mine ? `rgba(255, 214, 196, ${a1})` : `rgba(255, 226, 168, ${a1})`);
        grad.addColorStop(1, mine ? `rgba(224, 110, 84, ${a2})` : `rgba(224, 138, 78, ${a2})`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(-bw * 0.34, -bh / 2);
        ctx.lineTo(bw * 0.34, -bh / 2);
        ctx.quadraticCurveTo(bw * 0.52, -bh * 0.1, bw * 0.42, bh / 2);
        ctx.lineTo(-bw * 0.42, bh / 2);
        ctx.quadraticCurveTo(-bw * 0.52, -bh * 0.1, -bw * 0.34, -bh / 2);
        ctx.closePath();
        ctx.fill();
        // ribs
        ctx.strokeStyle = `rgba(160, 80, 40, ${0.3 * flick})`;
        ctx.lineWidth = 1;
        for (let i = 1; i < 3; i++) {
          ctx.beginPath();
          ctx.moveTo(-bw * 0.45, -bh / 2 + (bh / 3) * i);
          ctx.lineTo(bw * 0.45, -bh / 2 + (bh / 3) * i);
          ctx.stroke();
        }
        // flame mouth
        ctx.fillStyle = `rgba(255, 247, 214, ${Math.min(1, flick)})`;
        ctx.beginPath();
        ctx.ellipse(0, bh / 2, bw * 0.2, sc * 0.16, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // ---- "tap to read" coach: rides a lantern until the first wish opens
      if (coachOn && field.length) {
        const cl = api._coachL;
        const PAD = 44; // ring + label clearance around the overlay text
        const clear = (L) => !avoidRect
          || L.sx < avoidRect.left - PAD || L.sx > avoidRect.right + PAD
          || L.sy < avoidRect.top - PAD || L.sy > avoidRect.bottom + PAD;
        const edge = Math.min(90, w * 0.14);
        const visible = (L) => !L.launch
          && L.sy > h * 0.1 && L.sy < h * 0.84
          && L.sx > edge && L.sx < w - edge;
        // re-pick when the coach is gone, or it overlaps the copy and a clear
        // lantern is available (don't thrash if nothing better exists)
        const betterExists = () => field.some((L) => visible(L) && clear(L));
        if (!cl || !visible(cl) || (!clear(cl) && betterExists())) {
          // prefer a lantern far from the centered text column;
          // heavily penalize ones sitting on top of the overlay copy
          let best = null, bestScore = -1;
          for (const L of field) {
            if (!visible(L)) continue;
            const score = Math.abs(L.sx - w / 2) + L.depth * 60 + (clear(L) ? 4000 : 0);
            if (score > bestScore) { bestScore = score; best = L; }
          }
          api._coachL = best;
        }
        const C = api._coachL;
        if (C) {
          ctx.globalAlpha = alpha;
          // expanding pulse ring
          const pr = (t * 0.6) % 1;
          ctx.strokeStyle = `rgba(255, 226, 168, ${0.65 * (1 - pr)})`;
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.arc(C.sx, C.sy, C.r * 1.1 + pr * 30, 0, Math.PI * 2);
          ctx.stroke();
          // resting halo ring so it reads even mid-pulse
          ctx.strokeStyle = 'rgba(255, 226, 168, 0.4)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(C.sx, C.sy, C.r * 1.1, 0, Math.PI * 2);
          ctx.stroke();
          // hairline to a small caps label, flipped away from the edge
          const side2 = C.sx > w / 2 ? -1 : 1;
          const lx2 = C.sx + side2 * (C.r * 1.1 + 16);
          const tx2 = C.sx + side2 * (C.r * 1.1 + 30);
          ctx.strokeStyle = 'rgba(255, 226, 168, 0.5)';
          ctx.beginPath();
          ctx.moveTo(C.sx + side2 * (C.r * 1.1 + 2), C.sy);
          ctx.lineTo(lx2, C.sy);
          ctx.stroke();
          ctx.font = '600 10px Georgia, serif';
          ctx.fillStyle = `rgba(255, 235, 196, ${0.75 + 0.25 * Math.sin(t * 2.4)})`;
          ctx.textAlign = side2 === 1 ? 'left' : 'right';
          ctx.fillText('T A P   T O   R E A D', tx2 - side2 * 12, C.sy + 3.5);
          ctx.textAlign = 'left';
        }
      }
      ctx.globalAlpha = 1;
    };
    return api;
  }
};

/* ============================================================
   Choice screen
   ============================================================ */

/* ============================================================
   Film engine — the pinned world
   ============================================================ */

export class Journey {
  /**
   * @param {object} cfg config.json contents
   * @param {string} side 'groom' | 'bride'
   * @param {object} hooks { onLight, onWish } — finale interactions
   */
  constructor(cfg, side, hooks = {}) {
    this.alive = true;
    this.hooks = hooks;
    this.cfg = cfg;
    this.side = side;
    this.pointer = { x: 0, y: 0, active: false };

    const person = cfg.couple[side];
    const bio = cfg.journeys[side].map((ch) => ({ ...ch, type: 'text' }));
    const chapters = [
      ...bio,
      { ...cfg.journeys.meeting, type: 'text' },
      { ...cfg.journeys.proposal, type: 'text' },
      { scene: 'reveal', type: 'reveal' },
      { scene: 'moments', type: 'moments' },
      { scene: 'day', type: 'day' },
      { scene: 'venue', type: 'venue' },
      { scene: 'lanterns', type: 'finale' }
    ];
    this.chapters = chapters;
    this.bioCount = bio.length;
    this.revealIndex = bio.length + 2;
    const N = chapters.length;
    const host = document.getElementById('film');

    host.innerHTML = `
      <div class="jw-track" style="height:${N * 120 + 40}vh">
        <div class="jw-stage">
          <canvas class="jw-canvas"></canvas>
          <div class="jw-counter"><span class="jw-cur">01</span><i><b></b></i><span>${String(N).padStart(2, '0')}</span></div>
          <div class="jw-cross" aria-live="polite"><b>0</b>&hairsp;/&hairsp;${bio.length} paths crossed</div>
          ${chapters.map((ch, i) => this.overlayHTML(ch, i, side, person)).join('')}
        </div>
      </div>`;

    this.track = host.querySelector('.jw-track');
    this.stage = host.querySelector('.jw-stage');
    this.canvas = host.querySelector('.jw-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.texts = [...host.querySelectorAll('.jw-ovl')];
    this.counterCur = host.querySelector('.jw-cur');
    this.counterFill = host.querySelector('.jw-counter i b');
    this.crossEl = host.querySelector('.jw-cross');

    this.scenes = chapters.map((ch, i) => {
      if (ch.scene === 'moments') return SCENES.moments(cfg.moments.map((m) => ({ ...m, src: `./${m.src}` })));
      return (SCENES[ch.scene] || SCENES.birth)(i * 13.7, ch.variant);
    });
    this.lanternScene = this.scenes[N - 1];
    this.palettes = chapters.map(palFor);

    // restore already-found crossings for this side
    this.crossKey = `vows-crossings-${side}`;
    try {
      this.found = new Set(JSON.parse(localStorage.getItem(this.crossKey) || '[]'));
    } catch { this.found = new Set(); }
    for (const i of this.found) this.scenes[i]?.cameo?.find();
    this.updateCross(false);

    // rewind to the other side (proposal block + reveal link)
    host.querySelectorAll('[data-rewind]').forEach((el) =>
      el.addEventListener('click', () => this.hooks.onRewind?.()));

    this._onMove = (e) => {
      this.pointer.x = e.touches ? e.touches[0].clientX : e.clientX;
      this.pointer.y = e.touches ? e.touches[0].clientY : e.clientY;
      this.pointer.active = true;
    };
    window.addEventListener('mousemove', this._onMove, { passive: true });
    window.addEventListener('touchmove', this._onMove, { passive: true });

    // taps on the sky: lanterns in the finale, cameos in the biography.
    // Bound to the stage, not the canvas — overlays sit above the canvas
    // with pointer-events enabled, so canvas-only clicks would be swallowed.
    this._onTap = (e) => {
      if (e.target.closest('button, a, input, textarea, select, label')) return;
      if (this.lastIdx === N - 1 && this.hooks.onWish) {
        const best = this.lanternScene.hit(e.clientX, e.clientY);
        if (best) {
          this.lanternScene.dismissCoach(); // they got it — coaching done
          this.hooks.onWish(best.wish, best.sx, best.sy);
        }
        return;
      }
      const sc = this.scenes[this.lastIdx];
      if (sc?.cameo) {
        const hit = sc.cameo.hit(e.clientX, e.clientY);
        if (hit) this.crossFound(this.lastIdx, hit);
      }
    };
    this.stage.addEventListener('click', this._onTap);

    const light = host.querySelector('#light-lantern');
    if (light && this.hooks.onLight) light.addEventListener('click', this.hooks.onLight);

    this.start = performance.now();
    this.lastIdx = -1;
    this.loop();
  }

  /* ---------- paths crossed ---------- */

  crossFound(i, hit) {
    const sc = this.scenes[i];
    const fresh = !sc.cameo.found;
    sc.cameo.find();
    if (fresh) {
      this.found.add(i);
      try { localStorage.setItem(this.crossKey, JSON.stringify([...this.found])); } catch { /* private mode */ }
      this.updateCross(true);
    }
    this.showCameoPop(this.chapters[i].cameo?.caption || 'Paths crossed.', hit.x, hit.y);
  }

  updateCross(ping) {
    const b = this.crossEl.querySelector('b');
    b.textContent = String(this.found.size);
    if (ping) {
      this.crossEl.classList.remove('ping');
      void this.crossEl.offsetWidth; // restart the animation
      this.crossEl.classList.add('ping');
    }
  }

  showCameoPop(caption, x, y) {
    this.cameoPop?.remove();
    const el = document.createElement('div');
    el.className = 'cameo-pop';
    el.innerHTML = `<i>Paths crossed</i><p>${caption}</p>`;
    this.stage.appendChild(el);
    // keep the card on screen
    const pad = 18;
    el.style.left = `${Math.min(Math.max(x, 170), innerWidth - 170)}px`;
    el.style.top = `${Math.max(y - pad, 120)}px`;
    requestAnimationFrame(() => el.classList.add('on'));
    this.cameoPop = el;
    clearTimeout(this.cameoPopT);
    this.cameoPopT = setTimeout(() => this.hideCameoPop(), 4200);
  }

  hideCameoPop() {
    const el = this.cameoPop;
    if (!el) return;
    this.cameoPop = null;
    clearTimeout(this.cameoPopT);
    el.classList.remove('on');
    setTimeout(() => el.remove(), 500);
  }

  overlayHTML(ch, i, side, person) {
    const pal = palFor(ch);
    const dark = pal.dark ? 'dark' : '';
    const cfg = this.cfg;
    const other = cfg.couple[side === 'groom' ? 'bride' : 'groom'];
    const herHim = side === 'groom' ? 'her' : 'him';
    const hisHer = side === 'groom' ? 'his' : 'her';
    if (ch.type === 'text') {
      const isProposal = i === this.revealIndex - 1;
      return `
        <div class="jw-ovl jw-text ${i % 2 ? 'right' : 'left'} ${dark}" data-i="${i}">
          ${i === 0 ? `<div class="jw-side">${side === 'groom' ? 'His' : 'Her'} side of the story · ${person.fullName}</div>` : ''}
          <div class="jw-year" aria-hidden="true">${ch.year}</div>
          <h3>${ch.title}</h3>
          <p>${ch.text}</p>
          ${i === 0 ? `<div class="jw-cameo-hint">${other.name} is hidden somewhere in each of these years: tap ${herHim} when you spot ${herHim}.</div>` : ''}
          ${isProposal ? `
            <div class="jw-rewind">
              <p>You walked ${hisHer} years. ${other.name} was under the same sky the whole time.</p>
              <button type="button" id="rewind-btn" data-rewind>↺ Rewind to ${side === 'groom' ? 'her' : 'his'} side</button>
            </div>` : ''}
        </div>`;
    }
    if (ch.type === 'reveal') {
      return `
        <div class="jw-ovl jw-center ${dark}" data-i="${i}" data-tx="-50%">
          <div class="jw-kicker">${cfg.reveal.kicker}</div>
          <div class="jw-names">${cfg.couple.groom.name} <span class="amp">&amp;</span> ${cfg.couple.bride.name}</div>
          <div class="jw-line">${cfg.reveal.line}</div>
          <div class="jw-date">${cfg.dateDisplay}</div>
          <div class="jw-count" id="countdown"></div>
          <div class="jw-parents">${cfg.couple.groom.fullName}, ${cfg.couple.groom.parents}<br>${cfg.couple.bride.fullName}, ${cfg.couple.bride.parents}</div>
          <button type="button" class="jw-rewind-link" data-rewind>↺ replay these years from ${other.name}'s window</button>
        </div>`;
    }
    if (ch.type === 'moments') {
      return `
        <div class="jw-ovl jw-top ${dark}" data-i="${i}" data-tx="-50%">
          <div class="jw-kicker">A few moments along the way</div>
        </div>`;
    }
    if (ch.type === 'day') {
      return `
        <div class="jw-ovl jw-top" data-i="${i}" data-tx="-50%">
          <div class="jw-kicker">The day itself</div>
          <div class="jw-events">
            ${cfg.events.map((ev) => `
              <div class="jw-ev">
                <b>${ev.time}</b>
                <span>${ev.name}</span>
                <i>${ev.place} · ${ev.note}</i>
              </div>`).join('')}
          </div>
        </div>`;
    }
    if (ch.type === 'venue') {
      return `
        <div class="jw-ovl jw-side-left" data-i="${i}">
          <div class="jw-kicker">Where to find us</div>
          <h3>${cfg.venue.name}</h3>
          <p>${cfg.venue.address}</p>
          <a class="jw-btn" href="${cfg.venue.mapsUrl}" target="_blank" rel="noopener">Open in maps</a>
        </div>`;
    }
    // finale
    return `
      <div class="jw-ovl jw-center jw-finale dark" data-i="${i}" data-tx="-50%">
        <div class="jw-kicker">One last thing</div>
        <h3 class="jw-finale-title">Send a wish into the sky</h3>
        <p class="jw-finale-sub">Each floating lantern carries a guest's wish:
          tap one to read it, then light your own.</p>
        <button id="light-lantern" type="button">Light your lantern</button>
        <div class="jw-stats" id="lantern-stats"></div>
        <div class="jw-closing" id="closing-line"></div>
        <div class="jw-essentials">
          ${cfg.dateDisplay} · ${cfg.venue.name} · reply before ${cfg.rsvp.deadline}<br>
          <span>${cfg.hashtag}</span> · <a href="../../">part of my interactive works</a>
        </div>
      </div>`;
  }

  /** Scroll so chapter i sits centered in its range */
  scrollToChapter(i) {
    const N = this.chapters.length;
    const rect = this.track.getBoundingClientRect();
    const top = rect.top + scrollY;
    const range = rect.height - innerHeight;
    const raw = (i + 0.5) / (N - 0.05);
    window.scrollTo({ top: top + raw * range, behavior: 'smooth' });
  }

  setWishes(messages, statsText) {
    this.lanternScene.setWishes(messages);
    const el = document.getElementById('lantern-stats');
    if (el) el.textContent = statsText;
  }

  launchLantern(wish) {
    this.lanternScene.launch(wish);
  }

  loop() {
    if (!this.alive) return;
    requestAnimationFrame(this.loop.bind(this));

    const rect = this.track.getBoundingClientRect();
    const range = rect.height - innerHeight;
    if (rect.top > innerHeight || rect.bottom < 0) return;

    const N = this.chapters.length;
    const raw = Math.min(1, Math.max(0, -rect.top / Math.max(1, range)));
    const P = raw * (N - 0.05);

    const dpr = Math.min(devicePixelRatio || 1, 2);
    const w = innerWidth, h = innerHeight;
    if (this.canvas.width !== Math.round(w * dpr)) {
      this.canvas.width = Math.round(w * dpr);
      this.canvas.height = Math.round(h * dpr);
    }

    const t = (performance.now() - this.start) / 1000;
    const ctx = this.ctx;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const c = Math.min(N - 1, Math.floor(P));
    const frac = P - c;

    const cur = this.palettes[c];
    const nxt = this.palettes[Math.min(N - 1, c + 1)];
    const skyT = smooth(0.62, 0.96, frac);
    const skyCols = {
      top: lerpHex(cur.top, nxt.top, skyT),
      bot: lerpHex(cur.bot, nxt.bot, skyT)
    };
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, skyCols.top);
    sky.addColorStop(1, skyCols.bot);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);

    // hover cues: lanterns in the finale, cameos in the biography
    if (c === N - 1) {
      const hot = this.pointer.active ? this.lanternScene.hit(this.pointer.x, this.pointer.y) : null;
      for (const L of this.lanternScene.field) L.hot = L === hot;
      this.stage.style.cursor = hot ? 'pointer' : '';
      this.lanternScene.setAvoid(this.texts[N - 1].getBoundingClientRect());
    } else if (this.scenes[c]?.cameo && this.pointer.active) {
      this.stage.style.cursor = this.scenes[c].cameo.hit(this.pointer.x, this.pointer.y) ? 'pointer' : '';
    } else if (this.stage.style.cursor) {
      this.stage.style.cursor = '';
    }

    // the crossings tally only matters during the biography years
    this.crossEl.style.opacity = c < this.bioCount + 1 ? 1 : 0;

    const aCur = c === N - 1 ? 1 : 1 - smooth(0.6, 0.92, frac);
    const aNxt = smooth(0.82, 1.0, frac);
    if (aCur > 0.01) this.scenes[c].draw(ctx, w, h, t, this.pointer, frac, aCur, skyCols);
    if (c + 1 < N && aNxt > 0.01) this.scenes[c + 1].draw(ctx, w, h, t, this.pointer, 0, aNxt, skyCols);

    const vig = ctx.createRadialGradient(w / 2, h / 2, h * 0.42, w / 2, h / 2, h * 0.95);
    vig.addColorStop(0, 'rgba(20, 12, 8, 0)');
    vig.addColorStop(1, 'rgba(20, 12, 8, 0.26)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, w, h);

    this.texts.forEach((el, i) => {
      const d = i === N - 1 ? Math.max(0, (i + 0.5) - P) : Math.abs(P - (i + 0.5));
      const vis = 1 - smooth(0.3, 0.5, d);
      el.style.opacity = vis.toFixed(3);
      el.style.transform = `translate(${el.dataset.tx || '0px'}, ${((1 - vis) * 36 * (P > i + 0.5 ? -1 : 1)).toFixed(1)}px)`;
      el.style.visibility = vis > 0.01 ? 'visible' : 'hidden';
      el.style.pointerEvents = vis > 0.55 ? 'auto' : 'none';
    });

    const idx = Math.min(N - 1, Math.round(P - 0.5));
    if (idx !== this.lastIdx) {
      this.lastIdx = idx;
      this.counterCur.textContent = String(idx + 1).padStart(2, '0');
      this.hideCameoPop(); // a crossing card belongs to its chapter
    }
    this.counterFill.style.transform = `scaleX(${(P / (N - 0.05)).toFixed(4)})`;
  }

  dispose() {
    this.alive = false;
    window.removeEventListener('mousemove', this._onMove);
    window.removeEventListener('touchmove', this._onMove);
    document.getElementById('film').innerHTML = '';
  }
}
