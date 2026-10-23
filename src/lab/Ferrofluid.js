import * as THREE from 'three';

/**
 * Ferrofluid — a ray-marched pool of black-chrome magnetic fluid.
 *
 * The blob is a signed-distance sphere whose surface is pushed out into
 * Rosensweig spikes wherever the magnetic field is strong. The cursor IS
 * the magnet: the field points from the blob toward it, so the fluid
 * reaches and spikes toward wherever you move. A reveal-on-hover glass
 * control deck tunes the field — the "controllable UI" made literal, since
 * here the controls are the physics.
 *
 * Chrome shading is a fresnel-weighted studio reflection with a hot key
 * light; the oil-slick toggle blends in thin-film iridescence. HDR is
 * tonemapped (ACES) with the house vignette + grain so it sits next to the
 * Blackhole.
 */
export default class Ferrofluid {
  constructor(host, quality) {
    this.reduced = quality.reducedMotion;
    this.renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
    this.renderer.setSize(innerWidth, innerHeight);
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, quality.isMobile ? 1.0 : 1.4));
    host.appendChild(this.renderer.domElement);

    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.scene = new THREE.Scene();

    this.mouse = new THREE.Vector2(0.0, 0.0);
    this.mouseTarget = new THREE.Vector2(0.0, 0.0);
    this.pulse = 0;

    // live-tunable field parameters (driven by the deck)
    this.params = { field: 0.72, density: 0.66, visc: 0.35, oil: 0.0 };

    const STEPS = quality.isMobile ? 84 : 150;

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        aspect: { value: innerWidth / innerHeight },
        mouse: { value: this.mouse },
        pulse: { value: 0 },
        uField: { value: this.params.field },
        uDensity: { value: this.params.density },
        uVisc: { value: this.params.visc },
        uOil: { value: this.params.oil }
      },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position,1.0); }',
      fragmentShader: `
        precision highp float;
        uniform float time, aspect, pulse;
        uniform vec2 mouse;
        uniform float uField, uDensity, uVisc, uOil;
        varying vec2 vUv;

        #define STEPS ${STEPS}

        float hash(vec3 p){
          p = fract(p * 0.3183099 + 0.1);
          p *= 17.0;
          return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
        }
        float vnoise(vec3 p){
          vec3 i = floor(p), f = fract(p);
          f = f*f*(3.0-2.0*f);
          return mix(mix(mix(hash(i+vec3(0,0,0)), hash(i+vec3(1,0,0)), f.x),
                         mix(hash(i+vec3(0,1,0)), hash(i+vec3(1,1,0)), f.x), f.y),
                     mix(mix(hash(i+vec3(0,0,1)), hash(i+vec3(1,0,1)), f.x),
                         mix(hash(i+vec3(0,1,1)), hash(i+vec3(1,1,1)), f.x), f.y), f.z);
        }
        float fbm(vec3 p){
          float v = 0.0, a = 0.55;
          for (int i = 0; i < 4; i++){ v += a * vnoise(p); p = p * 2.02 + 7.3; a *= 0.5; }
          return v;
        }

        // the magnet in 3D: cursor projected onto a plane in front of the blob
        vec3 magnet(){ return vec3(mouse.x * 1.7, mouse.y * 1.7, 1.6); }

        // signed distance to the spiked blob
        float map(vec3 p){
          float r = length(p);
          vec3 dir = p / max(r, 1e-4);
          float align = dot(dir, normalize(magnet()));
          float facing = smoothstep(-0.4, 1.0, align);     // gentle bias toward the magnet

          // spike field: only the PEAKS of the noise rise into spikes — the
          // rest of the pool stays smooth chrome. That threshold is what reads
          // as ferrofluid rather than a rough rock.
          float freq = mix(3.5, 8.5, uDensity);
          float sharp = mix(1.8, 3.6, 1.0 - uVisc);
          float n = fbm(dir * freq + vec3(0.0, 0.0, time * 0.15));
          n = pow(clamp(n * 1.2, 0.0, 1.0), sharp);         // dense bristle across the WHOLE surface

          float amp = (0.6 + 0.4 * pulse) * uField;
          float spike = amp * n * (0.8 + 0.2 * facing);      // covers everything, a touch more toward the magnet
          float base = 1.0 + 0.1 * facing * uField;
          return (r - base - spike) * 0.5;                   // shrink Lipschitz for safety
        }

        vec3 calcN(vec3 p){
          vec2 e = vec2(0.0016, 0.0);
          return normalize(vec3(
            map(p+e.xyy) - map(p-e.xyy),
            map(p+e.yxy) - map(p-e.yxy),
            map(p+e.yyx) - map(p-e.yyx)));
        }

        // dark studio environment reflected by the black chrome — mostly dark
        // with a few bright sources so the body reads as a black mirror
        vec3 env(vec3 d){
          float y = d.y * 0.5 + 0.5;
          vec3 grad = mix(vec3(0.012, 0.013, 0.019), vec3(0.075, 0.085, 0.12), smoothstep(-0.1, 1.0, y));
          vec3 key = normalize(vec3(0.4, 0.82, 0.42));
          grad += vec3(1.0, 0.95, 0.82) * smoothstep(0.62, 1.0, dot(d, key)) * 1.7;   // bright soft key
          grad += vec3(1.0, 0.98, 0.9) * pow(max(dot(d, key), 0.0), 64.0) * 3.2;       // hot key core
          grad += vec3(0.7, 0.76, 0.92) * smoothstep(0.11, 0.0, abs(d.y - 0.04)) * 0.55; // softbox band
          vec3 rim = normalize(vec3(-0.6, 0.1, -0.7));
          grad += vec3(0.35, 0.46, 0.78) * pow(max(dot(d, rim), 0.0), 3.0) * 0.85;     // cool rim
          return grad;
        }

        void main(){
          vec2 uv = (vUv - 0.5) * vec2(aspect, 1.0);
          vec3 ro = vec3(0.0, 0.4, 4.5);                 // pulled back: a contained, centred pool
          vec3 ta = vec3(0.0, 0.0, 0.0);
          vec3 f = normalize(ta - ro);
          vec3 rt = normalize(cross(f, vec3(0.0, 1.0, 0.0)));
          vec3 uu = cross(rt, f);
          vec3 rd = normalize(uv.x * rt + uv.y * uu + 1.7 * f);

          float t = 0.0;
          bool hit = false;
          vec3 p;
          for (int i = 0; i < STEPS; i++){
            p = ro + rd * t;
            float d = map(p);
            if (d < 0.0008){ hit = true; break; }
            t += d;
            if (t > 7.0) break;
          }

          vec3 col;
          if (hit){
            vec3 n = calcN(p);
            vec3 view = -rd;
            float fres = pow(1.0 - max(dot(n, view), 0.0), 5.0);
            vec3 refl = reflect(rd, n);
            vec3 reflC = env(refl);

            vec3 base = vec3(0.012);                      // deep-black ferrofluid body
            col = base + reflC * (0.28 + 0.72 * fres);    // dark, absorbing — light only at edges

            vec3 key = normalize(vec3(0.55, 0.85, 0.35));
            float spec = pow(max(dot(refl, key), 0.0), 44.0);
            col += vec3(1.0, 0.97, 0.9) * spec * 1.7;     // sharp glossy glint

            // oil-slick: thin-film iridescence rising with grazing angle
            vec3 irid = 0.5 + 0.5 * cos(6.2831 * (fres * 3.2 + vec3(0.0, 0.33, 0.67)));
            vec3 oilCol = base + reflC * 0.25 + irid * (0.28 + 0.72 * fres);
            col = mix(col, oilCol, uOil);

            // contact shadow / depth fade
            col *= mix(1.0, 0.85, smoothstep(2.6, 4.2, t));
          } else {
            // dim studio backdrop so the chrome pool stays the hero
            float y = rd.y * 0.5 + 0.5;
            col = mix(vec3(0.015, 0.017, 0.026), vec3(0.06, 0.07, 0.10), smoothstep(-0.2, 1.0, y));
            col *= smoothstep(1.5, 0.25, length(vUv - 0.5) * 1.4); // gentle spotlight
          }

          // ACES-ish tonemap
          col *= 1.05;
          col = (col * (2.51 * col + 0.03)) / (col * (2.43 * col + 0.59) + 0.14);
          // vignette + grain (house look)
          float vig = smoothstep(1.35, 0.35, length(vUv - 0.5) * 1.55);
          col *= mix(0.5, 1.0, vig);
          col += (hash(vec3(vUv * vec2(913.0, 717.0), fract(time))) - 0.5) * 0.02;

          gl_FragColor = vec4(col, 1.0);
        }
      `
    });

    this.scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.material));

    this.buildDeck();
  }

  // ---- reveal-on-hover glass control deck --------------------------------
  buildDeck() {
    const style = document.createElement('style');
    style.textContent = `
      .ferro-deck{
        position:fixed; right:0; top:50%; transform:translate(24px,-50%);
        z-index:60; width:238px; padding:20px 20px 18px;
        display:flex; flex-direction:column; gap:16px;
        background:rgba(10,10,11,0.62); backdrop-filter:blur(14px);
        border:1px solid var(--line,rgba(232,230,225,0.14));
        border-right:none; border-radius:10px 0 0 10px;
        opacity:0; pointer-events:none;
        transition:opacity .5s ease, transform .5s cubic-bezier(.2,.8,.2,1);
        font-family:var(--mono,monospace);
      }
      .ferro-deck.show{ opacity:1; pointer-events:auto; transform:translate(0,-50%); }
      .ferro-deck h4{
        margin:0 0 2px; font-size:9px; letter-spacing:3px; text-transform:uppercase;
        color:var(--fg-faint,rgba(232,230,225,0.4)); font-weight:500;
      }
      .ferro-row{ display:flex; flex-direction:column; gap:7px; }
      .ferro-row label{
        display:flex; justify-content:space-between; font-size:10px; letter-spacing:2px;
        text-transform:uppercase; color:var(--fg-dim,rgba(232,230,225,0.55));
      }
      .ferro-row label span{ color:var(--accent); }
      .ferro-deck input[type=range]{
        -webkit-appearance:none; appearance:none; width:100%; height:2px;
        background:rgba(232,230,225,0.18); outline:none; border-radius:2px; margin:2px 0;
      }
      .ferro-deck input[type=range]:focus-visible{ outline:1px solid var(--accent); outline-offset:4px; }
      .ferro-deck input[type=range]::-webkit-slider-thumb{
        -webkit-appearance:none; width:12px; height:12px; border-radius:50%;
        background:var(--accent); cursor:pointer; border:2px solid #0a0a0b;
      }
      .ferro-deck input[type=range]::-moz-range-thumb{
        width:12px; height:12px; border-radius:50%; background:var(--accent);
        cursor:pointer; border:2px solid #0a0a0b;
      }
      .ferro-seg{ display:flex; gap:6px; }
      .ferro-seg button{
        flex:1; font-family:var(--mono,monospace); font-size:9px; letter-spacing:1.5px;
        text-transform:uppercase; padding:7px 4px; cursor:pointer;
        background:transparent; color:var(--fg-faint,rgba(232,230,225,0.4));
        border:1px solid var(--line,rgba(232,230,225,0.14)); border-radius:4px;
        transition:color .25s, border-color .25s;
      }
      .ferro-seg button.on{ color:var(--accent); border-color:var(--accent); }
      .ferro-tab{
        position:fixed; right:8px; top:50%; transform:translateY(-50%); z-index:59;
        writing-mode:vertical-rl; font-family:var(--mono,monospace); font-size:9px;
        letter-spacing:3px; text-transform:uppercase; color:var(--fg-faint,rgba(232,230,225,0.32));
        pointer-events:none; transition:opacity .4s ease;
      }
      .ferro-tab.hide{ opacity:0; }
    `;
    document.head.appendChild(style);
    this._style = style;

    const deck = document.createElement('div');
    deck.className = 'ferro-deck';
    deck.innerHTML = `
      <h4>Field deck</h4>
      <div class="ferro-row"><label>Field strength <span data-v="field"></span></label>
        <input type="range" min="0" max="1" step="0.01" data-k="field"></div>
      <div class="ferro-row"><label>Spike density <span data-v="density"></span></label>
        <input type="range" min="0" max="1" step="0.01" data-k="density"></div>
      <div class="ferro-row"><label>Viscosity <span data-v="visc"></span></label>
        <input type="range" min="0" max="1" step="0.01" data-k="visc"></div>
      <div class="ferro-row"><label>Surface</label>
        <div class="ferro-seg">
          <button data-oil="0">Chrome</button>
          <button data-oil="1">Oil-slick</button>
        </div></div>
    `;
    document.body.appendChild(deck);
    this._deck = deck;

    const tab = document.createElement('div');
    tab.className = 'ferro-tab';
    tab.textContent = 'Field deck →';
    document.body.appendChild(tab);
    this._tab = tab;

    // wire sliders
    const fmt = (v) => Math.round(v * 100) + '%';
    deck.querySelectorAll('input[type=range]').forEach((el) => {
      const k = el.dataset.k;
      el.value = this.params[k];
      deck.querySelector(`[data-v="${k}"]`).textContent = fmt(this.params[k]);
      el.addEventListener('input', () => {
        this.params[k] = parseFloat(el.value);
        deck.querySelector(`[data-v="${k}"]`).textContent = fmt(this.params[k]);
      });
    });
    // oil-slick segmented toggle
    this._oilBtns = deck.querySelectorAll('.ferro-seg button');
    const setOil = (v) => {
      this.params.oil = v;
      this._oilBtns.forEach((b) => b.classList.toggle('on', parseInt(b.dataset.oil, 10) === v));
    };
    this._oilBtns.forEach((b) => b.addEventListener('click', () => setOil(parseInt(b.dataset.oil, 10))));
    setOil(0);

    // keep the deck open while the pointer is over it
    this._overDeck = false;
    deck.addEventListener('pointerenter', () => { this._overDeck = true; });
    deck.addEventListener('pointerleave', () => { this._overDeck = false; });

    this.idle = 0;
    this.deckShown = false;
  }

  _reveal(show) {
    if (show === this.deckShown) return;
    this.deckShown = show;
    this._deck.classList.toggle('show', show);
    this._tab.classList.toggle('hide', show);
  }

  click() { this.pulse = 1.0; }

  update(dt, time, pointer) {
    // cursor → magnet position (normalized to the shader's uv space)
    this.mouseTarget.set(
      (pointer.x / innerWidth - 0.5) * (innerWidth / innerHeight),
      -(pointer.y / innerHeight - 0.5)
    );
    // viscosity slows how fast the fluid follows the magnet
    const follow = 1 - Math.exp(-dt / (0.06 + this.params.visc * 0.5));
    this.mouse.lerp(this.mouseTarget, follow);
    this.pulse = Math.max(0, this.pulse - dt * 1.6);

    // reveal-on-hover / idle: show near the right edge or when idle; the pool
    // sculpting itself (moving in the main area) keeps it hidden
    const moved = Math.hypot(pointer.x - pointer.px, pointer.y - pointer.py);
    if (moved > 1.5) this.idle = 0; else this.idle += dt;
    const nearEdge = pointer.x > innerWidth - 300;
    this._reveal(this._overDeck || nearEdge || this.idle > 1.5);

    const u = this.material.uniforms;
    u.time.value = time;
    u.aspect.value = innerWidth / innerHeight;
    u.pulse.value = this.pulse;
    u.uField.value = this.params.field;
    u.uDensity.value = this.params.density;
    u.uVisc.value = this.params.visc;
    u.uOil.value += (this.params.oil - u.uOil.value) * (1 - Math.exp(-dt / 0.12));

    this.renderer.render(this.scene, this.camera);
  }

  resize(w, h) { this.renderer.setSize(w, h); }

  dispose() {
    this.material.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
    this._deck?.remove();
    this._tab?.remove();
    this._style?.remove();
  }
}
