/**
 * Open House — the front door.
 *
 * No seal, no puzzle: you arrive at their landing. A door with a brass
 * nameplate, a mat that says "come in", and a doorbell. Ring it — two
 * dogs answer from inside (speech-bubble barks, paw shadows under the
 * door), the door swings open onto warm light, and you're in.
 *
 * Personalization: with ?to=, a parcel on the mat carries the guest's
 * name in handwriting.
 */

const TAU = Math.PI * 2;
const ease = (t) => t * t * (3 - 2 * t);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

export default class Door {
  constructor(cfg, guestName, onEnter) {
    this.cfg = cfg;
    this.guestName = guestName;
    this.onEnter = onEnter;
    this.canvas = document.getElementById('door-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.state = 'idle'; // idle | barking | opening | done
    this.stateT = 0;
    this.barks = [];
    this.entered = false;
    this.start = performance.now();
    this.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

    const bell = document.getElementById('door-bell');
    bell.addEventListener('click', () => this.ring());
    window.__door = this; // test handle

    this._loop = this.loop.bind(this);
    requestAnimationFrame(this._loop);
  }

  ring() {
    if (this.state !== 'idle') return;
    this.state = 'barking';
    this.stateT = performance.now();
    document.getElementById('door-bell').classList.add('rung');
    const m = this.metrics();
    const woofs = ['WOOF!', 'WOOF WOOF!', 'woof?', 'WOOF!!'];
    woofs.forEach((txt, i) => {
      this.barks.push({
        txt,
        x: m.dx + (i % 2 ? 0.32 : -0.3) * m.dw + (Math.random() - 0.5) * 20,
        y0: m.gy - m.dh * (0.18 + i * 0.05),
        delay: i * (this.reduced ? 60 : 260),
        big: i % 2 === 0
      });
    });
    setTimeout(() => {
      this.state = 'opening';
      this.stateT = performance.now();
    }, this.reduced ? 400 : 1700);
  }

  metrics() {
    const w = innerWidth, h = innerHeight;
    const mobile = w < 700;
    const dw = Math.min(w * 0.5, Math.min(w, h) * 0.36);
    const dh = Math.min(h * (mobile ? 0.4 : 0.56), dw * 2.1);
    return { w, h, dw, dh, dx: w / 2, gy: h * (mobile ? 0.7 : 0.86) };
  }

  loop() {
    if (this.state === 'done' || !this.canvas.isConnected) return;
    requestAnimationFrame(this._loop);

    const m = this.metrics();
    const { w, h, dw, dh, dx, gy } = m;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    if (this.canvas.width !== Math.round(w * dpr)) {
      this.canvas.width = Math.round(w * dpr);
      this.canvas.height = Math.round(h * dpr);
    }
    const ctx = this.ctx;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const t = (performance.now() - this.start) / 1000;

    // landing: warm plaster wall + wainscot
    const wall = ctx.createLinearGradient(0, 0, 0, h);
    wall.addColorStop(0, '#e9ddc8');
    wall.addColorStop(1, '#d9c8ac');
    ctx.fillStyle = wall;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(122, 92, 68, 0.16)';
    ctx.fillRect(0, gy - dh * 0.32, w, 3);
    // floor
    const floor = ctx.createLinearGradient(0, gy, 0, h);
    floor.addColorStop(0, '#b89a74');
    floor.addColorStop(1, '#9a7c58');
    ctx.fillStyle = floor;
    ctx.fillRect(0, gy, w, h - gy);
    // floorboards
    ctx.strokeStyle = 'rgba(90, 66, 44, 0.25)';
    ctx.lineWidth = 1;
    for (let i = 1; i < 6; i++) {
      const fy = gy + (h - gy) * (i / 6);
      const persp = (fy - gy) / (h - gy);
      ctx.beginPath();
      ctx.moveTo(w * 0.5 - w * (0.3 + persp * 0.6), fy);
      ctx.lineTo(w * 0.5 + w * (0.3 + persp * 0.6), fy);
      ctx.stroke();
    }
    // wall sconces
    for (const sx of [dx - dw * 1.25, dx + dw * 1.25]) {
      if (sx < 30 || sx > w - 30) continue;
      const glow = ctx.createRadialGradient(sx, gy - dh * 0.85, 0, sx, gy - dh * 0.85, dh * 0.5);
      glow.addColorStop(0, 'rgba(255, 214, 150, 0.4)');
      glow.addColorStop(1, 'rgba(255, 214, 150, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(sx - dh * 0.5, gy - dh * 1.35, dh, dh);
      ctx.fillStyle = '#caa86a';
      ctx.beginPath();
      ctx.arc(sx, gy - dh * 0.85, 6, 0, TAU);
      ctx.fill();
    }

    // door opening progress
    let open = 0;
    if (this.state === 'opening') {
      open = ease(clamp((performance.now() - this.stateT) / (this.reduced ? 500 : 1400), 0, 1));
      if (open >= 0.55 && !this.entered) {
        this.entered = true;
        this.onEnter();
        setTimeout(() => { this.state = 'done'; }, this.reduced ? 500 : 1200);
      }
    }

    // door frame
    const fx = dx - dw / 2, fy2 = gy - dh;
    ctx.fillStyle = '#8a6a48';
    ctx.fillRect(fx - 14, fy2 - 14, dw + 28, dh + 14);
    // warm interior light revealed behind the door
    const inner = ctx.createLinearGradient(fx, fy2, fx, gy);
    inner.addColorStop(0, '#ffe9c4');
    inner.addColorStop(1, '#f2c98e');
    ctx.fillStyle = inner;
    ctx.fillRect(fx, fy2, dw, dh);
    if (open > 0.05) {
      // a sliver of the flat: floor line + plant silhouette
      ctx.fillStyle = 'rgba(154, 124, 88, 0.7)';
      ctx.fillRect(fx, gy - dh * 0.06, dw, dh * 0.06);
      ctx.strokeStyle = 'rgba(110, 122, 86, 0.65)';
      ctx.lineWidth = 3;
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(fx + dw * 0.78, gy - dh * 0.06);
        ctx.quadraticCurveTo(
          fx + dw * (0.74 + i * 0.03), gy - dh * (0.2 + i * 0.05),
          fx + dw * (0.68 + i * 0.07), gy - dh * (0.3 + i * 0.06)
        );
        ctx.stroke();
      }
    }
    // the door itself, hinged left: horizontal squash + darkening edge
    const doorW = dw * (1 - open * 0.96);
    if (doorW > 2) {
      const wood = ctx.createLinearGradient(fx, 0, fx + doorW, 0);
      wood.addColorStop(0, '#a87c52');
      wood.addColorStop(1, `rgb(${138 - open * 60}, ${100 - open * 44}, ${66 - open * 30})`);
      ctx.fillStyle = wood;
      ctx.fillRect(fx, fy2, doorW, dh);
      // panels
      ctx.strokeStyle = 'rgba(74, 50, 32, 0.5)';
      ctx.lineWidth = 2;
      const px = (u) => fx + u * doorW;
      ctx.strokeRect(px(0.14), fy2 + dh * 0.08, doorW * 0.72, dh * 0.34);
      ctx.strokeRect(px(0.14), fy2 + dh * 0.5, doorW * 0.72, dh * 0.4);
      // knob + peephole
      ctx.fillStyle = '#e0b66a';
      ctx.beginPath();
      ctx.arc(px(0.88), fy2 + dh * 0.52, Math.max(2, 6 * (1 - open)), 0, TAU);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(px(0.5), fy2 + dh * 0.22, Math.max(1.5, 4 * (1 - open)), 0, TAU);
      ctx.fill();
      // paw shadows under the door while barking
      if (this.state === 'barking') {
        const bt = (performance.now() - this.stateT) / 1000;
        ctx.fillStyle = 'rgba(40, 28, 18, 0.4)';
        for (let i = 0; i < 4; i++) {
          const sx = px(0.2 + 0.18 * i) + Math.sin(bt * 9 + i * 2) * 6;
          ctx.beginPath();
          ctx.ellipse(sx, gy - 3, 7, 3, 0, 0, TAU);
          ctx.fill();
        }
      }
    }
    // brass nameplate ON the door's top rail (squashes with the door)
    if (doorW > dw * 0.3) {
      const npW = Math.min(doorW * 0.7, 170);
      const npY = fy2 + dh * 0.035;
      ctx.fillStyle = '#e0b66a';
      ctx.beginPath();
      ctx.roundRect(fx + doorW / 2 - npW / 2, npY, npW, 22, 3);
      ctx.fill();
      ctx.fillStyle = '#4a3520';
      ctx.font = `600 ${Math.min(13, npW * 0.085)}px Georgia, serif`;
      ctx.textAlign = 'center';
      ctx.fillText(`${this.cfg.door.flatNo} · ${this.cfg.door.nameplate}`, fx + doorW / 2, npY + 15, npW - 12);
      ctx.textAlign = 'left';
    }
    // wreath on the door
    if (doorW > dw * 0.4) {
      const wx = fx + doorW * 0.5, wy = fy2 + dh * 0.33, wr = Math.min(32, dw * 0.13);
      for (let i = 0; i < 18; i++) {
        const a = (i / 18) * TAU;
        ctx.save();
        ctx.translate(wx + Math.cos(a) * wr, wy + Math.sin(a) * wr);
        ctx.rotate(a + Math.PI / 2 + Math.sin(i * 3.1) * 0.4);
        ctx.fillStyle = i % 3 ? '#76845e' : '#5e6e4a';
        ctx.beginPath();
        ctx.ellipse(0, 0, wr * 0.3, wr * 0.13, 0, 0, TAU);
        ctx.fill();
        ctx.restore();
      }
      ctx.fillStyle = '#c2604f';
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * TAU + 0.4;
        ctx.beginPath();
        ctx.arc(wx + Math.cos(a) * wr * 0.94, wy + Math.sin(a) * wr * 0.94, 3, 0, TAU);
        ctx.fill();
      }
      // a small bow at the bottom
      ctx.fillStyle = '#a8503f';
      ctx.beginPath();
      ctx.moveTo(wx, wy + wr);
      ctx.lineTo(wx - 8, wy + wr + 9);
      ctx.lineTo(wx, wy + wr + 5);
      ctx.lineTo(wx + 8, wy + wr + 9);
      ctx.closePath();
      ctx.fill();
    }
    // mat + stitched text
    const mobile = w < 700;
    ctx.save();
    ctx.translate(dx, gy + (h - gy) * (mobile ? 0.16 : 0.4));
    ctx.fillStyle = '#b05c48';
    ctx.beginPath();
    const mw = dw * 1.04, mh = (h - gy) * (mobile ? 0.22 : 0.5);
    ctx.moveTo(-mw / 2, -mh / 2);
    ctx.lineTo(mw / 2, -mh / 2);
    ctx.lineTo(mw / 2 * 1.12, mh / 2);
    ctx.lineTo(-mw / 2 * 1.12, mh / 2);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 235, 210, 0.65)';
    ctx.lineWidth = 1.4;
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(255, 240, 220, 0.92)';
    ctx.font = `italic ${Math.max(13, Math.round(mw * 0.052))}px Caveat, cursive`;
    ctx.textAlign = 'center';
    ctx.fillText(this.cfg.door.mat, 0, 5, mw * 0.9);
    ctx.restore();
    // the parcel with the guest's name
    if (this.guestName) {
      const pxr = dx + dw * 0.74, pyr = gy + (h - gy) * (mobile ? 0.2 : 0.34);
      ctx.save();
      ctx.translate(pxr, pyr);
      ctx.rotate(-0.06);
      ctx.fillStyle = '#c8a878';
      ctx.fillRect(-46, -30, 92, 34);
      ctx.fillStyle = '#b89058';
      ctx.fillRect(-46, -30, 92, 7);
      ctx.strokeStyle = 'rgba(122, 76, 52, 0.7)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, -30);
      ctx.lineTo(0, 4);
      ctx.stroke();
      ctx.fillStyle = '#fdf6e8';
      ctx.fillRect(-34, -22, 30, 18);
      ctx.fillStyle = '#7a4c34';
      ctx.font = '600 9px Caveat, cursive';
      ctx.fillText(`for ${this.guestName.split(' ')[0]}`, -19, -10);
      ctx.restore();
      ctx.textAlign = 'left';
    }
    ctx.textAlign = 'left';

    // bark bubbles
    if (this.state === 'barking' || this.state === 'opening') {
      const bt = performance.now() - this.stateT + (this.state === 'opening' ? 1700 : 0);
      ctx.textAlign = 'center';
      for (const b of this.barks) {
        const life = (bt - b.delay) / 1100;
        if (life < 0 || life > 1) continue;
        const k = ease(Math.min(1, life * 3));
        const rise = life * 46;
        ctx.save();
        ctx.translate(b.x, b.y0 - rise);
        ctx.scale(k, k);
        ctx.globalAlpha = 1 - ease(Math.max(0, (life - 0.6) / 0.4));
        const bw = b.big ? 86 : 64, bh = b.big ? 38 : 30;
        ctx.fillStyle = '#fffdf6';
        ctx.strokeStyle = '#7a5c44';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(-bw / 2, -bh / 2, bw, bh, bh / 2);
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-6, bh / 2 - 1);
        ctx.lineTo(2, bh / 2 + 12);
        ctx.lineTo(10, bh / 2 - 1);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#3d342b';
        ctx.font = `700 ${b.big ? 15 : 12}px Georgia, serif`;
        ctx.fillText(b.txt, 0, 5);
        ctx.restore();
      }
      ctx.globalAlpha = 1;
      ctx.textAlign = 'left';
    }

    // warm flood as the door finishes opening
    if (open > 0.4) {
      const flood = ease((open - 0.4) / 0.6);
      const fg = ctx.createRadialGradient(dx, gy - dh / 2, 0, dx, gy - dh / 2, Math.hypot(w, h) * 0.7);
      fg.addColorStop(0, `rgba(255, 238, 206, ${flood})`);
      fg.addColorStop(1, `rgba(255, 238, 206, ${flood * 0.9})`);
      ctx.fillStyle = fg;
      ctx.fillRect(0, 0, w, h);
    }

    // soft vignette
    const vig = ctx.createRadialGradient(w / 2, h / 2, h * 0.45, w / 2, h / 2, h * 1.05);
    vig.addColorStop(0, 'rgba(60, 40, 20, 0)');
    vig.addColorStop(1, 'rgba(60, 40, 20, 0.22)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, w, h);
  }
}
