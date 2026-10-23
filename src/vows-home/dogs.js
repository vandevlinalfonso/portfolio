/**
 * Open House — Sugar & Omi, live in the flat.
 *
 * Simple agents on the floor line: wander between waypoints, sit, nap,
 * drift toward the cursor when curious, and — the coaching mechanic —
 * periodically walk to an UNDISCOVERED memory and sniff at it. Omi
 * occasionally steals a flashcard from the fridge and trots off with it.
 * Tap a dog: tail wag, a little hop, and a caption.
 *
 * All state lives in per-dog objects owned by this module (created at
 * runtime, mutated locally — safe from minifier constant-folding).
 */

const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const rand = (a, b) => a + Math.random() * (b - a);

export class Dogs {
  /**
   * @param {object} env {
   *   worldW: () => number, floorY: () => number, size: () => number,
   *   hotspots: () => [{ id, wx, wy, found }],   // world coords
   *   fridgeX: () => number,
   *   onCaption: (text, worldX, worldY) => void,
   *   lines: string[]
   * }
   */
  constructor(env) {
    this.env = env;
    this.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const W = env.worldW();
    this.dogs = [
      this.makeDog('Sugar', 'white-fluffy', W * 0.3, 1),
      this.makeDog('Omi', 'black-sleek', W * 0.7, 0.92)
    ];
    this.nextGuide = performance.now() + 6000;
    this.nextTheft = performance.now() + 24000;
  }

  makeDog(name, look, x, scale) {
    return {
      name, look, scale,
      x, dir: 1,
      state: 'sit', stateUntil: performance.now() + rand(1500, 4000),
      target: x, speed: 0.09,
      wag: 0, hop: 0, legPh: Math.random() * 7,
      sniffAt: null,       // hotspot currently being pointed out
      carrying: false,     // Omi's stolen flashcard
      guard: 0             // >0 while guarding the ring box
    };
  }

  /** captions are per-dog: tapping Sugar must never talk about Omi */
  line(dog) {
    const all = this.env.lines || {};
    const list = Array.isArray(all)
      ? all // legacy flat list still works
      : all[dog.name] || all.default || [`${dog.name} is a very good dog.`];
    dog.lineIdx = ((dog.lineIdx ?? -1) + 1) % list.length;
    return list[dog.lineIdx];
  }

  /** send a dog to sit in front of a world-x (the ring box guard) */
  guardTo(wx) {
    const d = this.dogs[1]; // Omi is very serious about this
    d.state = 'walk';
    d.target = wx;
    d.guard = 1;
    d.sniffAt = null;
  }

  /** tap test in world coords; triggers the reaction */
  hit(wx, wy) {
    const fy = this.env.floorY();
    const s = this.env.size();
    for (const d of this.dogs) {
      if (Math.abs(wx - d.x) < s * 2.6 && Math.abs(wy - (fy - s)) < s * 3) {
        d.wag = 1;
        d.hop = 1;
        return { dog: d, text: this.line(d), x: d.x, y: fy - s * 2.6 };
      }
    }
    return null;
  }

  hover(wx, wy) {
    const fy = this.env.floorY();
    const s = this.env.size();
    return this.dogs.some((d) => Math.abs(wx - d.x) < s * 2.6 && Math.abs(wy - (fy - s)) < s * 3);
  }

  update(dt, now, pointerWX, pointerActive) {
    if (this.reduced) {
      // reduced motion: dogs nap, no wandering
      for (const d of this.dogs) { d.state = 'sleep'; d.wag = Math.max(0, d.wag - dt * 0.001); }
      return;
    }
    const W = this.env.worldW();

    // coaching: every ~13s, a free dog walks to an undiscovered memory
    if (now > this.nextGuide) {
      this.nextGuide = now + rand(11000, 17000);
      const free = this.dogs.find((d) => !d.guard && d.state !== 'carry');
      const todo = this.env.hotspots().filter((hs) => !hs.found);
      if (free && todo.length) {
        const target = todo.reduce((a, b) =>
          Math.abs(a.wx - free.x) < Math.abs(b.wx - free.x) ? a : b);
        free.state = 'walk';
        free.target = clamp(target.wx + rand(-30, 30), W * 0.03, W * 0.97);
        free.sniffAt = target;
      }
    }

    // Omi's flashcard heist
    if (now > this.nextTheft) {
      this.nextTheft = now + rand(34000, 60000);
      const omi = this.dogs[1];
      if (!omi.guard && omi.state !== 'carry') {
        omi.state = 'walk';
        omi.target = this.env.fridgeX();
        omi.sniffAt = null;
        omi.thieving = true;
      }
    }

    for (const d of this.dogs) {
      d.wag = Math.max(0, d.wag - dt * 0.0006);
      d.hop = Math.max(0, d.hop - dt * 0.004);

      if (d.state === 'walk' || d.state === 'carry') {
        const dx = d.target - d.x;
        d.dir = dx > 0 ? 1 : -1;
        d.x += clamp(dx, -1, 1) * d.speed * dt * (d.state === 'carry' ? 1.25 : 1);
        d.legPh += dt * 0.016;
        if (Math.abs(dx) < 8) {
          if (d.thieving) {
            d.thieving = false;
            d.carrying = true;
            d.state = 'carry';
            d.target = clamp(d.x + rand(-W * 0.3, W * 0.3), W * 0.05, W * 0.95);
          } else if (d.state === 'carry') {
            d.carrying = false; // drops the card, walks away innocent
            d.state = 'sit';
            d.stateUntil = now + rand(2000, 5000);
          } else if (d.guard) {
            d.state = 'sit';
            d.stateUntil = now + 9e9; // guards until released
          } else if (d.sniffAt) {
            d.state = 'sniff';
            d.stateUntil = now + rand(2600, 4200);
          } else {
            d.state = Math.random() < 0.3 ? 'sleep' : 'sit';
            d.stateUntil = now + rand(3000, 9000);
          }
        }
      } else if (now > d.stateUntil) {
        d.sniffAt = null;
        // curiosity: sometimes drift toward the visitor's cursor
        if (pointerActive && Math.random() < 0.35) {
          d.state = 'walk';
          d.target = clamp(pointerWX + rand(-60, 60), W * 0.03, W * 0.97);
        } else {
          d.state = 'walk';
          d.target = clamp(d.x + rand(-W * 0.22, W * 0.22), W * 0.03, W * 0.97);
        }
      }
      // found mid-sniff? wander off
      if (d.sniffAt && d.sniffAt.found) {
        d.sniffAt = null;
        if (d.state === 'sniff') { d.state = 'sit'; d.stateUntil = now + 1500; }
      }
    }
  }

  releaseGuard() {
    for (const d of this.dogs) {
      if (d.guard) {
        d.guard = 0;
        d.state = 'walk';
        d.target = clamp(d.x - 160, 0, this.env.worldW());
      }
    }
  }

  draw(ctx, cam, t) {
    const fy = this.env.floorY();
    const s = this.env.size();
    for (const d of this.dogs) {
      const sx = d.x - cam;
      if (sx < -120 || sx > innerWidth + 120) continue;
      this.drawDog(ctx, d, sx, fy, s * d.scale, t);
      // sniff cue: little scent puffs rising toward the hotspot
      if (d.state === 'sniff' && d.sniffAt) {
        const hx = d.sniffAt.wx - cam, hy = d.sniffAt.wy;
        ctx.strokeStyle = `rgba(194, 96, 79, ${0.5 + 0.3 * Math.sin(t * 5)})`;
        ctx.lineWidth = 1.6;
        for (let i = 0; i < 3; i++) {
          const ph = ((t * 0.7 + i * 0.33) % 1);
          const px = sx + d.dir * s * 1.4 + (hx - sx - d.dir * s * 1.4) * ph;
          const py = fy - s * 1.6 + (hy - fy + s * 1.6) * ph;
          ctx.globalAlpha = 1 - ph;
          ctx.beginPath();
          ctx.arc(px, py + Math.sin(ph * 9) * 4, 2.4, 0, TAU);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }
    }
  }

  drawDog(ctx, d, x, fy, s, t) {
    const colors = { 'white-fluffy': '#f3ecdf', 'black-sleek': '#332c26' };
    const col = colors[d.look] || '#8a6244';
    const fluffy = d.look === 'white-fluffy';
    const walking = d.state === 'walk' || d.state === 'carry';
    const sleeping = d.state === 'sleep';
    const hopY = Math.sin(Math.min(1, d.hop) * Math.PI) * s * 0.8;

    ctx.save();
    ctx.translate(x, fy - hopY);
    ctx.scale(d.dir, 1);
    // shadow
    ctx.fillStyle = 'rgba(60, 40, 24, 0.18)';
    ctx.beginPath();
    ctx.ellipse(0, 2, s * 1.5, s * 0.3, 0, 0, TAU);
    ctx.fill();

    ctx.fillStyle = col;
    const fluff = (px, py, rr, n = 7) => {
      if (!fluffy) return;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU;
        ctx.beginPath();
        ctx.arc(px + Math.cos(a) * rr * 0.7, py + Math.sin(a) * rr * 0.5, rr * 0.42, 0, TAU);
        ctx.fill();
      }
    };

    if (sleeping) {
      fluff(0, -s * 0.45, s * 0.9);
      ctx.beginPath();
      ctx.ellipse(0, -s * 0.45, s * 1.05, s * 0.55, 0, 0, TAU);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(s * 0.7, -s * 0.5, s * 0.42, 0, TAU);
      ctx.fill();
      // slow breath
      const br = 1 + Math.sin(t * 1.4 + d.legPh) * 0.02;
      ctx.scale(br, br);
      // zzz
      ctx.fillStyle = 'rgba(90, 104, 146, 0.55)';
      ctx.font = `italic ${Math.round(s * 0.5)}px Georgia, serif`;
      ctx.fillText('z', s * 1.1, -s * 1.3 - Math.sin(t * 1.2) * 3);
      ctx.restore();
      return;
    }

    const sit = d.state === 'sit' || d.state === 'sniff';
    const bodyY = -s * (sit ? 0.95 : 1.05);
    // legs
    ctx.strokeStyle = col;
    ctx.lineWidth = s * 0.26;
    ctx.lineCap = 'round';
    if (walking) {
      for (let i = 0; i < 4; i++) {
        const ph = d.legPh + i * (Math.PI / 2);
        const lx = -s * 0.7 + i * s * 0.46;
        ctx.beginPath();
        ctx.moveTo(lx, bodyY + s * 0.3);
        ctx.lineTo(lx + Math.sin(ph) * s * 0.34, 0);
        ctx.stroke();
      }
    } else {
      // front legs straight; haunch behind when sitting
      ctx.beginPath();
      ctx.moveTo(s * 0.55, bodyY + s * 0.3);
      ctx.lineTo(s * 0.55, 0);
      ctx.moveTo(s * 0.3, bodyY + s * 0.3);
      ctx.lineTo(s * 0.3, 0);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(-s * 0.6, -s * 0.5, s * 0.62, s * 0.55, 0, 0, TAU);
      ctx.fill();
    }
    // body
    fluff(0, bodyY, s * 0.95);
    ctx.beginPath();
    ctx.ellipse(0, bodyY, s * 1.0, sit ? s * 0.62 : s * 0.55, sit ? -0.18 : 0, 0, TAU);
    ctx.fill();
    // head (sniffing dips it)
    const sniffDip = d.state === 'sniff' ? Math.sin(t * 6) * s * 0.12 + s * 0.18 : 0;
    const hx = s * 1.0, hy = bodyY - s * 0.62 + sniffDip;
    fluff(hx, hy, s * 0.52, 5);
    ctx.beginPath();
    ctx.arc(hx, hy, s * 0.5, 0, TAU);
    ctx.fill();
    // snout + nose
    ctx.beginPath();
    ctx.ellipse(hx + s * 0.46, hy + s * 0.12, s * 0.26, s * 0.16, 0.1, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#1d1813';
    ctx.beginPath();
    ctx.arc(hx + s * 0.68, hy + s * 0.1, s * 0.08, 0, TAU);
    ctx.fill();
    // ears (pricked, shiba-ish — short and wide-set, not cat-pointy)
    ctx.fillStyle = col;
    for (const ex of [-0.26, 0.18]) {
      ctx.beginPath();
      ctx.moveTo(hx + s * ex, hy - s * 0.3);
      ctx.lineTo(hx + s * (ex + 0.17), hy - s * 0.66);
      ctx.lineTo(hx + s * (ex + 0.38), hy - s * 0.26);
      ctx.closePath();
      ctx.fill();
    }
    // eye
    ctx.fillStyle = '#1d1813';
    ctx.beginPath();
    ctx.arc(hx + s * 0.18, hy - s * 0.08, s * 0.07, 0, TAU);
    ctx.fill();
    // the stolen flashcard
    if (d.carrying) {
      ctx.save();
      ctx.translate(hx + s * 0.62, hy + s * 0.28);
      ctx.rotate(-0.2 + Math.sin(t * 8) * 0.05);
      ctx.fillStyle = '#fdf6e8';
      ctx.strokeStyle = '#b89058';
      ctx.lineWidth = 1;
      ctx.fillRect(-s * 0.4, -s * 0.26, s * 0.8, s * 0.52);
      ctx.strokeRect(-s * 0.4, -s * 0.26, s * 0.8, s * 0.52);
      ctx.fillStyle = '#5a6892';
      ctx.font = `600 ${Math.round(s * 0.3)}px Georgia, serif`;
      ctx.textAlign = 'center';
      ctx.fillText('der', 0, s * 0.1);
      ctx.textAlign = 'left';
      ctx.restore();
    }
    // tail: curled over the back, wag swings it
    const wagA = (d.wag > 0.01 ? Math.sin(t * 16) * 0.8 * d.wag : Math.sin(t * 2 + d.legPh) * 0.08);
    ctx.strokeStyle = col;
    ctx.lineWidth = s * (fluffy ? 0.5 : 0.3);
    ctx.beginPath();
    ctx.moveTo(-s * 0.92, bodyY - s * 0.15);
    ctx.quadraticCurveTo(
      -s * 1.4, bodyY - s * 0.95,
      -s * (1.05 - Math.sin(wagA) * 0.5), bodyY - s * 1.15
    );
    ctx.stroke();
    ctx.restore();
  }
}
