/**
 * Open House — memory cards + the reveal.
 *
 * Tapping an object opens a polaroid-style card: a small animated canvas
 * vignette, the year, a handwritten caption. The ring box opens the
 * proposal card, then the full reveal splash (names, date, countdown).
 */

import { gsap } from 'gsap';

const TAU = Math.PI * 2;
const ease = (t) => t * t * (3 - 2 * t);

/* ---------- mini vignettes, one per memory id ---------- */

const MINIS = {
  sketch(ctx, w, h, t) {
    bg(ctx, w, h, '#f8e8c8', '#fdf4dd');
    const gy = h * 0.78;
    sun(ctx, w * 0.78, h * 0.24, 16, t);
    ctx.fillStyle = '#a4763e';
    ctx.fillRect(w * 0.3, gy - 46, w * 0.4, 46);
    ctx.fillStyle = '#6e4c38';
    ctx.beginPath();
    ctx.moveTo(w * 0.24, gy - 46);
    ctx.quadraticCurveTo(w * 0.5, gy - 96, w * 0.76, gy - 46);
    ctx.lineTo(w * 0.7, gy - 40);
    ctx.quadraticCurveTo(w * 0.5, gy - 78, w * 0.3, gy - 40);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#5c3c28';
    ctx.fillRect(w * 0.46, gy - 30, 18, 30);
    ctx.fillStyle = 'rgba(255, 226, 168, 0.9)';
    ctx.fillRect(w * 0.34, gy - 34, 12, 12);
    ground(ctx, w, h, gy, '#caa468');
    palmMini(ctx, w * 0.13, gy, 14, t);
    palmMini(ctx, w * 0.9, gy, 11, t + 2);
  },
  brother(ctx, w, h, t) {
    bg(ctx, w, h, '#9aa9c0', '#cfd6c8');
    const gy = h * 0.8;
    rain(ctx, w, h, t);
    ground(ctx, w, h, gy, '#8a8478');
    fig(ctx, w * 0.46, gy, 22, '#f4e9d8', true);
    arms(ctx, w * 0.46, gy, 22);
    fig(ctx, w * 0.58, gy, 14, '#5a6478');
    for (let i = 0; i < 3; i++) {
      ctx.globalAlpha = 0.45;
      fig(ctx, w * (0.16 + i * 0.08), gy, 23, '#3c3a46');
      ctx.globalAlpha = 1;
    }
  },
  journals(ctx, w, h, t) {
    bg(ctx, w, h, '#3a2330', '#c97a58');
    const gy = h * 0.82;
    glow(ctx, w * 0.5, gy - 14, 70, 'rgba(255, 206, 130, 0.5)');
    ctx.fillStyle = '#7a5c44';
    ctx.fillRect(w * 0.3, gy - 6, w * 0.4, 6);
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = ['#a8503f', '#5a6892', '#8a9b77'][i];
      ctx.fillRect(w * 0.4, gy - 16 - i * 9, w * 0.2, 8);
    }
    for (let i = 0; i < 6; i++) {
      const ph = ((t * 0.16 + i * 0.17) % 1);
      const px = w * (0.3 + (i % 3) * 0.2) + Math.sin(t + i) * 8;
      ctx.save();
      ctx.translate(px, gy - 30 - ph * (h * 0.6));
      ctx.rotate(Math.sin(t * 1.4 + i) * 0.5);
      ctx.fillStyle = `rgba(250, 244, 230, ${0.85 - ph * 0.6})`;
      ctx.fillRect(-7, -9, 14, 18);
      ctx.restore();
    }
  },
  keybowl(ctx, w, h, t) {
    bg(ctx, w, h, '#1f2433', '#4a4660');
    const cx = w * 0.5;
    glow(ctx, cx, h * 0.5, 80, 'rgba(255, 206, 140, 0.4)');
    const sway = Math.sin(t * 1.6) * 0.16;
    ctx.save();
    ctx.translate(cx, h * 0.12);
    ctx.rotate(sway);
    ctx.strokeStyle = '#5a6892';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, h * 0.4);
    ctx.stroke();
    ctx.fillStyle = '#fdf6e8';
    ctx.fillRect(-22, h * 0.4, 44, 56);
    ctx.fillStyle = '#9aa4b8';
    ctx.fillRect(-14, h * 0.4 + 8, 28, 24);
    ctx.fillStyle = '#c2604f';
    ctx.fillRect(-16, h * 0.4 + 40, 32, 7);
    ctx.restore();
  },
  flashcards(ctx, w, h, t) {
    bg(ctx, w, h, '#2a2138', '#6b4a62');
    glow(ctx, w * 0.5, h * 0.7, 90, 'rgba(255, 206, 140, 0.45)');
    const words = ['der', 'die', 'das'];
    words.forEach((wd, i) => {
      const bounce = Math.sin(t * 1.8 + i * 2.1) * 6;
      ctx.save();
      ctx.translate(w * (0.26 + i * 0.24), h * 0.4 + bounce);
      ctx.rotate(Math.sin(i * 5.1 + t * 0.5) * 0.12);
      ctx.fillStyle = '#fdf6e8';
      ctx.fillRect(-26, -17, 52, 34);
      ctx.fillStyle = '#5a6892';
      ctx.font = 'italic 600 15px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText(wd, 0, 5);
      ctx.restore();
    });
    // a sleeping fluffy blob on a fourth card
    ctx.fillStyle = '#fdf6e8';
    ctx.fillRect(w * 0.38, h * 0.74, 70, 16);
    dogCurl(ctx, w * 0.5, h * 0.74, 16, '#f3ecdf', t);
    ctx.textAlign = 'left';
  },
  snowglobe(ctx, w, h, t) {
    bg(ctx, w, h, '#dfe6ee', '#f7f5f1');
    const cx = w * 0.5, cy = h * 0.52, r = h * 0.3;
    ctx.fillStyle = 'rgba(196, 214, 235, 0.5)';
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(122, 110, 96, 0.6)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#5c6880';
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.5, cy + r * 0.5);
    ctx.lineTo(cx - r * 0.5, cy);
    ctx.lineTo(cx, cy - r * 0.42);
    ctx.lineTo(cx + r * 0.5, cy);
    ctx.lineTo(cx + r * 0.5, cy + r * 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 210, 150, 0.95)';
    ctx.fillRect(cx - 7, cy, 14, 14);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    for (let i = 0; i < 22; i++) {
      const ph = ((t * 0.1 + i * 0.045) % 1);
      const a = i * 2.4;
      const px = cx + Math.cos(a) * r * 0.7 * Math.sin(ph * Math.PI);
      ctx.beginPath();
      ctx.arc(px, cy - r * 0.8 + ph * r * 1.5, 1.6, 0, TAU);
      ctx.fill();
    }
    ctx.fillStyle = '#7a5c44';
    ctx.fillRect(cx - r * 0.6, cy + r * 0.86, r * 1.2, r * 0.3);
  },
  radio(ctx, w, h, t) {
    bg(ctx, w, h, '#1c2538', '#3b4866');
    const cx = w * 0.4, cy = h * 0.62;
    ctx.fillStyle = '#4a4038';
    ctx.beginPath();
    ctx.roundRect(cx - 50, cy - 34, 100, 52, 6);
    ctx.fill();
    const dial = 0.5 + 0.5 * Math.sin(t * 0.7);
    ctx.fillStyle = `rgba(255, 206, 130, ${0.5 + dial * 0.5})`;
    ctx.fillRect(cx - 36, cy - 20, 72, 12);
    ctx.fillStyle = '#221e1c';
    ctx.fillRect(cx - 36 + dial * 66, cy - 23, 3, 18);
    ctx.strokeStyle = '#4a4038';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(cx + 44, cy - 34);
    ctx.lineTo(cx + 62, cy - 64);
    ctx.stroke();
    for (let i = 0; i < 4; i++) {
      const ph = ((t * 0.3 + i * 0.25) % 1);
      ctx.strokeStyle = `rgba(176, 198, 235, ${0.5 * (1 - ph)})`;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(cx, cy - 20, 12 + ph * w * 0.45, -1.2, -0.1);
      ctx.stroke();
    }
    moonMini(ctx, w * 0.85, h * 0.2, 11);
  },
  blueprints(ctx, w, h, t) {
    bg(ctx, w, h, '#2b3247', '#7c6a78');
    const deck = h * 0.6;
    ctx.fillStyle = 'rgba(36, 44, 66, 0.9)';
    ctx.fillRect(0, h * 0.72, w, h * 0.28);
    const prog = (Math.sin(t * 0.5) + 1) / 2 * 0.4 + 0.6;
    ctx.strokeStyle = 'rgba(200, 208, 226, 0.95)';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(w * 0.06, deck);
    ctx.lineTo(w * 0.06 + w * 0.88 * prog, deck);
    ctx.stroke();
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i <= 40 * prog; i++) {
      const u = i / 40;
      const px = w * (0.06 + 0.88 * u);
      const py = deck - Math.sin(u * Math.PI) * h * 0.22;
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.stroke();
    moonMini(ctx, w * 0.82, h * 0.16, 10);
  },
  watch(ctx, w, h, t) {
    bg(ctx, w, h, '#2a2430', '#5c4a4a');
    glow(ctx, w * 0.5, h * 0.5, 90, 'rgba(255, 214, 150, 0.4)');
    const cx = w * 0.5, cy = h * 0.5, r = h * 0.27;
    // strap running off both edges
    ctx.strokeStyle = '#4a3a2c';
    ctx.lineWidth = r * 0.55;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx, cy - r * 1.5);
    ctx.quadraticCurveTo(cx - r * 0.4, cy - r * 2.2, cx - r * 0.2, cy - h * 0.6);
    ctx.moveTo(cx, cy + r * 1.5);
    ctx.quadraticCurveTo(cx + r * 0.4, cy + r * 2.2, cx + r * 0.2, cy + h * 0.6);
    ctx.stroke();
    // case + face
    ctx.fillStyle = '#e0b66a';
    ctx.beginPath();
    ctx.arc(cx, cy, r * 1.12, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#fdf6e8';
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, TAU);
    ctx.fill();
    // hour ticks
    ctx.strokeStyle = 'rgba(61, 52, 43, 0.6)';
    ctx.lineWidth = 1.4;
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * r * 0.86, cy + Math.sin(a) * r * 0.86);
      ctx.lineTo(cx + Math.cos(a) * r * 0.94, cy + Math.sin(a) * r * 0.94);
      ctx.stroke();
    }
    // hands — still going
    ctx.strokeStyle = '#3d342b';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(-1.1) * r * 0.45, cy + Math.sin(-1.1) * r * 0.45);
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(0.6) * r * 0.66, cy + Math.sin(0.6) * r * 0.66);
    ctx.stroke();
    const sa = (t % 60) / 60 * TAU - Math.PI / 2;
    ctx.strokeStyle = '#c2604f';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(sa) * r * 0.78, cy + Math.sin(sa) * r * 0.78);
    ctx.stroke();
    ctx.fillStyle = '#3d342b';
    ctx.beginPath();
    ctx.arc(cx, cy, 2.6, 0, TAU);
    ctx.fill();
  },
  phone(ctx, w, h, t) {
    bg(ctx, w, h, '#2c3550', '#6b5a72');
    glow(ctx, w * 0.5, h * 0.52, 100, 'rgba(255, 214, 150, 0.3)');
    const pw = w * 0.42, ph = h * 0.74, px = w * 0.5 - pw / 2, py = h * 0.13;
    ctx.fillStyle = '#221e1c';
    ctx.beginPath();
    ctx.roundRect(px - 7, py - 7, pw + 14, ph + 14, 18);
    ctx.fill();
    const scr = ctx.createLinearGradient(0, py, 0, py + ph);
    scr.addColorStop(0, '#fdf6e8');
    scr.addColorStop(1, '#f0e0c2');
    ctx.fillStyle = scr;
    ctx.beginPath();
    ctx.roundRect(px, py, pw, ph, 10);
    ctx.fill();
    // the conversation, looping: her attempt, his gentle reply
    const cyc = (t % 6) / 6;
    ctx.textAlign = 'left';
    const bubble = (bx, by, bw2, col, mine2) => {
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.roundRect(bx, by, bw2, 22, mine2 ? [10, 10, 2, 10] : [10, 10, 10, 2]);
      ctx.fill();
    };
    if (cyc > 0.08) {
      bubble(px + 10, py + 16, pw * 0.62, '#dfe6f2', false);
      ctx.fillStyle = '#3d342b';
      ctx.font = 'italic 11px Caveat, cursive';
      ctx.fillText('Ich heisse Vella?', px + 17, py + 31);
    }
    if (cyc > 0.35) {
      bubble(px + pw - 10 - pw * 0.56, py + 48, pw * 0.56, '#c2604f', true);
      ctx.fillStyle = '#fdf6e8';
      ctx.font = 'italic 11px Caveat, cursive';
      ctx.fillText('heiße :). Hallo, Vella', px + pw - 5 - pw * 0.56, py + 63);
    }
    if (cyc > 0.62) {
      bubble(px + 10, py + 80, pw * 0.4, '#dfe6f2', false);
      ctx.fillStyle = '#3d342b';
      ctx.font = 'italic 11px Caveat, cursive';
      ctx.fillText('Hallo, Manu', px + 17, py + 95);
    }
    // typing dots
    if (cyc > 0.78) {
      for (let i = 0; i < 3; i++) {
        const bounce = Math.abs(Math.sin(t * 4 + i * 0.7)) * 3;
        ctx.fillStyle = 'rgba(90, 104, 146, 0.7)';
        ctx.beginPath();
        ctx.arc(px + pw - 36 + i * 9, py + 120 - bounce, 2.4, 0, TAU);
        ctx.fill();
      }
    }
    moonMini(ctx, w * 0.87, h * 0.18, 10);
  },
  crates(ctx, w, h, t) {
    bg(ctx, w, h, '#2c3550', '#6a7c9c');
    // plane window
    ctx.fillStyle = '#1c2538';
    ctx.beginPath();
    ctx.roundRect(w * 0.56, h * 0.14, w * 0.34, h * 0.46, 26);
    ctx.fill();
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(w * 0.59, h * 0.18, w * 0.28, h * 0.38, 22);
    ctx.clip();
    ctx.fillStyle = '#8cb0d8';
    ctx.fillRect(w * 0.59, h * 0.18, w * 0.28, h * 0.38);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    for (let i = 0; i < 4; i++) {
      const px = w * (0.59 + (((i * 0.27 + t * 0.05) % 1) * 0.28));
      ctx.beginPath();
      ctx.ellipse(px, h * (0.3 + (i % 2) * 0.16), 18, 7, 0, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
    // crate with a face peeking
    const cs = h * 0.34;
    ctx.fillStyle = '#b8a888';
    ctx.beginPath();
    ctx.roundRect(w * 0.12, h * 0.5, cs * 1.2, cs, 6);
    ctx.fill();
    ctx.fillStyle = 'rgba(70, 50, 30, 0.5)';
    for (let i = 0; i < 3; i++) ctx.fillRect(w * 0.16, h * 0.58 + i * cs * 0.22, cs * 0.9, cs * 0.07);
    dogCurl(ctx, w * 0.12 + cs * 0.6, h * 0.5 + cs * 0.34, 13, '#f3ecdf', t);
  },
  leashes(ctx, w, h, t) {
    bg(ctx, w, h, '#f3e9d4', '#e0cfae');
    const gy = h * 0.84;
    ground(ctx, w, h, gy, '#c2a075');
    // two excited tails behind a door edge
    ctx.fillStyle = '#a87c52';
    ctx.fillRect(0, h * 0.1, w * 0.2, gy - h * 0.1);
    for (const [off, col, sp] of [[0.3, '#f3ecdf', 14], [0.62, '#332c26', 17]]) {
      const wag = Math.sin(t * sp) * 0.7;
      ctx.strokeStyle = col;
      ctx.lineWidth = 9;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(w * (0.3 + off * 0.4), gy - 14);
      ctx.quadraticCurveTo(
        w * (0.3 + off * 0.4) - 12, gy - 44,
        w * (0.3 + off * 0.4) + Math.sin(wag) * 22, gy - 56
      );
      ctx.stroke();
      // body hint
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.ellipse(w * (0.36 + off * 0.4), gy - 12, 26, 14, 0, 0, TAU);
      ctx.fill();
    }
  },
  proposal(ctx, w, h, t) {
    bg(ctx, w, h, '#1c2538', '#c97a58');
    // string lights
    for (let r = 0; r < 2; r++) {
      const y0 = h * (0.14 + r * 0.1);
      ctx.strokeStyle = 'rgba(120, 110, 130, 0.5)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, y0);
      ctx.quadraticCurveTo(w / 2, y0 + h * 0.08, w, y0);
      ctx.stroke();
      for (let i = 1; i < 8; i++) {
        const u = i / 8;
        const tw = 0.5 + 0.5 * Math.sin(t * 2 + i * 1.7 + r);
        ctx.fillStyle = `rgba(255, 214, 150, ${0.35 + tw * 0.6})`;
        ctx.beginPath();
        ctx.arc(u * w, y0 + Math.sin(u * Math.PI) * h * 0.06, 2.6, 0, TAU);
        ctx.fill();
      }
    }
    const gy = h * 0.84;
    glow(ctx, w * 0.5, gy - 20, 90, 'rgba(255, 200, 130, 0.5)');
    ground(ctx, w, h, gy, 'rgba(240, 240, 248, 0.25)');
    fig(ctx, w * 0.42, gy, 24, '#3c4254', false, 1);
    fig(ctx, w * 0.6, gy, 24, '#f4e9d8', true);
    // the ring glint
    const tw = 0.5 + 0.5 * Math.sin(t * 4);
    ctx.strokeStyle = '#f3d289';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(w * 0.5, gy - 26, 4, 0, TAU);
    ctx.stroke();
    ctx.fillStyle = `rgba(255, 240, 200, ${tw})`;
    ctx.beginPath();
    ctx.arc(w * 0.52, gy - 30, 1.6, 0, TAU);
    ctx.fill();
    // Omi mid-interruption
    const cross = ((t * 0.12) % 1.3) - 0.15;
    ctx.fillStyle = '#332c26';
    ctx.beginPath();
    ctx.ellipse(w * cross, gy - 8, 16, 9, 0, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(w * cross + 14, gy - 14, 7, 0, TAU);
    ctx.fill();
    // snow
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    for (let i = 0; i < 18; i++) {
      const ph = ((t * 0.06 + i * 0.055) % 1);
      ctx.beginPath();
      ctx.arc((i * 53.7) % w, ph * h, 1.4, 0, TAU);
      ctx.fill();
    }
  }
};

/* tiny shared shapes for the minis */
function bg(ctx, w, h, top, bot) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, top);
  g.addColorStop(1, bot);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}
function ground(ctx, w, h, gy, col) {
  ctx.fillStyle = col;
  ctx.fillRect(0, gy, w, h - gy);
}
function glow(ctx, x, y, r, col) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, col);
  g.addColorStop(1, 'rgba(255, 206, 130, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}
function sun(ctx, x, y, r, t) {
  glow(ctx, x, y, r * 3.4, 'rgba(255, 226, 168, 0.8)');
  ctx.fillStyle = '#ffe9b8';
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
}
function moonMini(ctx, x, y, r) {
  ctx.fillStyle = '#ece0c2';
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
  ctx.fillStyle = 'rgba(28, 37, 56, 1)';
  ctx.beginPath();
  ctx.arc(x + r * 0.42, y - r * 0.18, r * 0.85, 0, TAU);
  ctx.fill();
}
function rain(ctx, w, h, t) {
  ctx.strokeStyle = 'rgba(214, 222, 240, 0.4)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 26; i++) {
    const ph = ((t * 0.5 + i * 0.039) % 1);
    const x = (i * 37.3) % w;
    ctx.beginPath();
    ctx.moveTo(x - ph * 10, ph * h);
    ctx.lineTo(x - ph * 10 - 2, ph * h + 8);
    ctx.stroke();
  }
}
function fig(ctx, x, gy, s, col, dress = false, kneel = 0) {
  ctx.fillStyle = '#f6d7bf';
  ctx.beginPath();
  ctx.arc(x, gy - s * 1.7 + kneel * s * 0.5, s * 0.36, 0, TAU);
  ctx.fill();
  ctx.fillStyle = col;
  ctx.beginPath();
  if (dress) {
    ctx.moveTo(x - s * 0.16, gy - s * 1.34);
    ctx.lineTo(x + s * 0.16, gy - s * 1.34);
    ctx.lineTo(x + s * 0.46, gy);
    ctx.lineTo(x - s * 0.46, gy);
  } else {
    ctx.moveTo(x - s * 0.25, gy - s * 1.34 + kneel * s * 0.5);
    ctx.lineTo(x + s * 0.25, gy - s * 1.34 + kneel * s * 0.5);
    ctx.lineTo(x + s * 0.2, gy);
    ctx.lineTo(x - s * 0.2, gy);
  }
  ctx.closePath();
  ctx.fill();
}
function arms(ctx, x, gy, s) {
  ctx.strokeStyle = '#f4e9d8';
  ctx.lineWidth = s * 0.14;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x - s * 0.55, gy - s * 1.05);
  ctx.lineTo(x + s * 0.55, gy - s * 1.05);
  ctx.stroke();
}
function dogCurl(ctx, x, y, s, col, t) {
  ctx.fillStyle = col;
  const br = 1 + Math.sin(t * 1.6) * 0.03;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(br, br);
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * TAU;
    ctx.beginPath();
    ctx.arc(Math.cos(a) * s * 0.6, Math.sin(a) * s * 0.38, s * 0.32, 0, TAU);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.ellipse(0, 0, s * 0.8, s * 0.5, 0, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(s * 0.5, -s * 0.1, s * 0.3, 0, TAU);
  ctx.fill();
  ctx.restore();
}
function palmMini(ctx, x, gy, s, t) {
  ctx.strokeStyle = 'rgba(110, 92, 56, 0.8)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x, gy);
  ctx.quadraticCurveTo(x + s * 0.5, gy - s * 2, x + s, gy - s * 3.4);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(116, 122, 62, 0.85)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 5; i++) {
    const a = -0.2 - i * 0.6 + Math.sin(t + i) * 0.05;
    ctx.beginPath();
    ctx.moveTo(x + s, gy - s * 3.4);
    ctx.quadraticCurveTo(
      x + s + Math.cos(a) * s * 1.2, gy - s * 3.4 + Math.sin(a) * s * 0.6 - s * 0.3,
      x + s + Math.cos(a) * s * 2.2, gy - s * 3.4 + Math.sin(a) * s * 1.4
    );
    ctx.stroke();
  }
}

/* ---------- the memory card overlay ---------- */

let openCard = null;

/**
 * @param {object} data { id, year, title, caption, object, who }
 * @param {object} names { bride, groom }
 * @returns {Promise<void>} resolves when closed
 */
export function showMemoryCard(data, names) {
  return new Promise((resolve) => {
    closeCard();
    const whose = data.who === 'bride' ? `${names.bride}'s` : data.who === 'groom' ? `${names.groom}'s` : 'their';
    const el = document.createElement('div');
    el.id = 'memcard';
    el.innerHTML = `
      <div class="mem-pol" role="dialog" aria-label="${data.title}">
        <button class="mem-close" aria-label="Close">×</button>
        <canvas class="mem-mini" width="10" height="10"></canvas>
        <div class="mem-meta">
          <span class="mem-year">${data.year}</span>
          <span class="mem-whose">${whose} ${data.object || 'memory'}</span>
        </div>
        <h3 class="mem-title">${data.title}</h3>
        <p class="mem-caption">${data.caption}</p>
      </div>`;
    document.body.appendChild(el);

    const pol = el.querySelector('.mem-pol');
    gsap.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.25 });
    gsap.fromTo(pol,
      { y: 30, rotation: -2.5, scale: 0.94 },
      { y: 0, rotation: Math.random() * 2 - 1, scale: 1, duration: 0.5, ease: 'back.out(1.4)' });

    // animate the vignette
    const mini = el.querySelector('.mem-mini');
    const mctx = mini.getContext('2d');
    const draw = MINIS[data.id] || MINIS.sketch;
    const t0 = performance.now();
    let alive = true;
    const tick = () => {
      if (!alive || !mini.isConnected) return;
      requestAnimationFrame(tick);
      const dpr = Math.min(devicePixelRatio || 1, 2);
      const r = mini.getBoundingClientRect();
      if (mini.width !== Math.round(r.width * dpr)) {
        mini.width = Math.round(r.width * dpr);
        mini.height = Math.round(r.height * dpr);
      }
      mctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw(mctx, r.width, r.height, (performance.now() - t0) / 1000);
    };
    requestAnimationFrame(tick);

    const close = () => {
      if (!alive) return;
      alive = false;
      openCard = null;
      gsap.to(el, { opacity: 0, duration: 0.25, onComplete: () => el.remove() });
      resolve();
    };
    openCard = close;
    el.querySelector('.mem-close').addEventListener('click', close);
    el.addEventListener('click', (e) => { if (e.target === el) close(); });
    window.addEventListener('keydown', function esc(e) {
      if (e.key === 'Escape') { close(); window.removeEventListener('keydown', esc); }
    });
  });
}

export function closeCard() {
  openCard?.();
}

/* ---------- the reveal splash ---------- */

export function showReveal(cfg, guestName) {
  return new Promise((resolve) => {
    closeCard();
    const el = document.createElement('div');
    el.id = 'reveal';
    el.innerHTML = `
      <div class="rev-inner" role="dialog" aria-label="The announcement">
        <div class="rev-kicker">${cfg.reveal.kicker}</div>
        <div class="rev-names">${cfg.couple.groom.name} <span class="amp">&amp;</span> ${cfg.couple.bride.name}</div>
        <div class="rev-line">${cfg.reveal.line}</div>
        <div class="rev-date">${cfg.dateDisplay}</div>
        <div class="rev-count" id="rev-count"></div>
        <div class="rev-parents">${cfg.couple.groom.fullName}, ${cfg.couple.groom.parents}<br>${cfg.couple.bride.fullName}, ${cfg.couple.bride.parents}</div>
        <div class="rev-closing">${guestName ? `${cfg.closing} See you there, ${guestName}.` : cfg.closing}</div>
        <div class="rev-tag">${cfg.hashtag}</div>
        <button id="rev-back" type="button">← back to the flat</button>
      </div>
      <canvas id="rev-confetti"></canvas>`;
    document.body.appendChild(el);

    gsap.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.4 });
    gsap.fromTo(el.querySelectorAll('.rev-inner > *'),
      { y: 26, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.7, stagger: 0.09, ease: 'power3.out', clearProps: 'opacity,transform' });

    // countdown
    const target = new Date(cfg.date).getTime();
    const cdEl = el.querySelector('#rev-count');
    const units = [['Days', 86400000], ['Hours', 3600000], ['Minutes', 60000], ['Seconds', 1000]];
    cdEl.innerHTML = units.map(([u]) => `<div class="cd"><b data-u="${u}">0</b><span>${u}</span></div>`).join('');
    let cdTimer = 0;
    const tickCd = () => {
      let diff = target - Date.now();
      if (diff <= 0) {
        cdEl.innerHTML = '<div class="cd"><b>Today!</b><span>The day is here</span></div>';
        return;
      }
      for (const [u, ms] of units) {
        const v = Math.floor(diff / ms);
        diff -= v * ms;
        const node = cdEl.querySelector(`[data-u="${u}"]`);
        if (node) node.textContent = v;
      }
      cdTimer = setTimeout(tickCd, 1000);
    };
    tickCd();

    // gentle gold confetti
    const cv = el.querySelector('#rev-confetti');
    const cx2 = cv.getContext('2d');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const bits = reduced ? [] : Array.from({ length: 60 }, () => ({
      x: Math.random(), y: -Math.random() * 0.6, v: 0.04 + Math.random() * 0.06,
      s: 3 + Math.random() * 4, ph: Math.random() * 7,
      col: ['#e0b66a', '#c2604f', '#f4e2c6', '#8a9b77'][Math.floor(Math.random() * 4)]
    }));
    let alive = true;
    const t0 = performance.now();
    const tick = () => {
      if (!alive || !cv.isConnected) return;
      requestAnimationFrame(tick);
      const dpr = Math.min(devicePixelRatio || 1, 2);
      if (cv.width !== Math.round(innerWidth * dpr)) {
        cv.width = Math.round(innerWidth * dpr);
        cv.height = Math.round(innerHeight * dpr);
      }
      cx2.setTransform(dpr, 0, 0, dpr, 0, 0);
      cx2.clearRect(0, 0, innerWidth, innerHeight);
      const t = (performance.now() - t0) / 1000;
      for (const b of bits) {
        const y = (b.y + t * b.v) % 1.15;
        cx2.save();
        cx2.translate(b.x * innerWidth + Math.sin(t * 1.4 + b.ph) * 26, y * innerHeight);
        cx2.rotate(t * 2 + b.ph);
        cx2.fillStyle = b.col;
        cx2.fillRect(-b.s / 2, -b.s / 4, b.s, b.s / 2);
        cx2.restore();
      }
    };
    requestAnimationFrame(tick);

    el.querySelector('#rev-back').addEventListener('click', () => {
      alive = false;
      clearTimeout(cdTimer);
      gsap.to(el, { opacity: 0, duration: 0.35, onComplete: () => el.remove() });
      resolve();
    });
  });
}
