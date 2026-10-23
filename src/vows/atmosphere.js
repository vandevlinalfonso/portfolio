import * as THREE from 'three';

/**
 * The living backdrop of the whole invitation: a slow silk-light
 * gradient (domain-warped FBM), golden bokeh dust drifting in depth,
 * and film grain + warm vignette in the same pass. Moods retint the
 * silk per flow stage; flare() blooms white-gold for the unseal.
 *
 * Falls back to a layered CSS gradient (body.atmo-fallback) when WebGL
 * or motion isn't available.
 */

const MOODS = {
  seal: { a: '#fdfaf4', b: '#f6e9d8', c: '#f0d6c6', spot: 1.0, bokeh: 0.85 },
  invite: { a: '#fbf6ed', b: '#f4e5d0', c: '#eed2bf', spot: 0.4, bokeh: 0.6 },
  dusk: { a: '#f8efe2', b: '#eedac2', c: '#e2bfab', spot: 0.3, bokeh: 0.75 }
};

function bokehTexture() {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,240,210,0.9)');
  g.addColorStop(0.4, 'rgba(255,225,180,0.35)');
  g.addColorStop(1, 'rgba(255,220,170,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(canvas);
}

export default class Atmosphere {
  constructor() {
    this.reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let ok = true;
    try {
      const c = document.createElement('canvas');
      ok = !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
    } catch { ok = false; }

    if (!ok || this.reduced) {
      document.body.classList.add('atmo-fallback');
      this.disabled = true;
      return;
    }

    this.renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
    this.renderer.setSize(innerWidth, innerHeight);
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
    const el = this.renderer.domElement;
    el.id = 'atmosphere';
    el.style.cssText = 'position:fixed;inset:0;z-index:0;pointer-events:none;';
    document.body.prepend(el);

    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 10);
    this.camera.position.z = 1;

    this.mouse = new THREE.Vector2(0.5, 0.5);
    this.targetMouse = new THREE.Vector2(0.5, 0.5);
    this.current = { ...this.parseMood('seal') };
    this.target = { ...this.current };
    this.flareV = 0;

    this.buildSilk();
    this.buildBokeh();

    window.addEventListener('mousemove', (e) => {
      this.targetMouse.set(e.clientX / innerWidth, 1 - e.clientY / innerHeight);
    }, { passive: true });
    window.addEventListener('resize', () => {
      this.renderer.setSize(innerWidth, innerHeight);
      this.silk.material.uniforms.aspect.value = innerWidth / innerHeight;
    });

    this.clock = new THREE.Clock();
    this.loop();
  }

  parseMood(name) {
    const m = MOODS[name] || MOODS.invite;
    return {
      a: new THREE.Color(m.a),
      b: new THREE.Color(m.b),
      c: new THREE.Color(m.c),
      spot: m.spot,
      bokeh: m.bokeh
    };
  }

  buildSilk() {
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        aspect: { value: innerWidth / innerHeight },
        colA: { value: this.current.a.clone() },
        colB: { value: this.current.b.clone() },
        colC: { value: this.current.c.clone() },
        spot: { value: this.current.spot },
        scroll: { value: 0 },
        mouse: { value: this.mouse },
        flare: { value: 0 }
      },
      vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position, 1.0); }',
      fragmentShader: `
        uniform float time;
        uniform float aspect;
        uniform vec3 colA;
        uniform vec3 colB;
        uniform vec3 colC;
        uniform float spot;
        uniform float scroll;
        uniform vec2 mouse;
        uniform float flare;
        varying vec2 vUv;

        float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float noise(vec2 p) {
          vec2 i = floor(p), f = fract(p);
          vec2 u = f * f * (3.0 - 2.0 * f);
          return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x),
                     mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
        }
        float fbm(vec2 p) {
          float v = 0.0, a = 0.5;
          for (int i = 0; i < 4; i++) { v += a * noise(p); p = p * 2.02 + 13.7; a *= 0.5; }
          return v;
        }

        void main() {
          vec2 uv = vUv;
          vec2 q = uv * vec2(aspect, 1.0) * 1.35;
          q.y += scroll * 0.28;
          float t = time * 0.025;

          // silk: domain-warped folds of light
          float warp = fbm(q + t);
          float n = fbm(q * 1.15 + warp * 1.5 - t * 0.7);
          float n2 = fbm(q * 2.1 - warp * 0.9 + t);

          vec3 col = mix(colA, colB, smoothstep(0.2, 0.85, n));
          col = mix(col, colC, smoothstep(0.58, 0.98, n2) * 0.5);
          // sheen lines along the folds
          col += vec3(1.0, 0.96, 0.88) * pow(smoothstep(0.62, 0.72, n) * (1.0 - smoothstep(0.72, 0.82, n)), 1.4) * 0.1;

          // spotlight pool (mood-driven), follows the mouse a little
          vec2 sp = vec2(0.5 + (mouse.x - 0.5) * 0.1, 0.56 + (mouse.y - 0.5) * 0.06);
          vec2 d = (uv - sp) * vec2(aspect, 1.0);
          col *= 1.0 + spot * exp(-dot(d, d) * 2.6) * 0.16;
          col -= (1.0 - spot * 0.5) * 0.0;

          // warm vignette
          float vig = smoothstep(1.25, 0.35, length((uv - 0.5) * vec2(aspect, 1.0)));
          col = mix(col * vec3(0.88, 0.84, 0.8), col, vig);

          // unseal bloom
          col += vec3(1.0, 0.96, 0.86) * flare;

          // film grain
          col += (hash(uv * vec2(1731.0, 911.0) + fract(time)) - 0.5) * 0.035;

          gl_FragColor = vec4(col, 1.0);
        }
      `
    });
    this.silk = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
    this.scene.add(this.silk);
  }

  buildBokeh() {
    const count = innerWidth < 700 ? 26 : 48;
    const pos = new Float32Array(count * 3);
    const attr = new Float32Array(count * 3); // size, phase, depth
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 2;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 2;
      pos[i * 3 + 2] = 0;
      attr[i * 3] = 18 + Math.pow(Math.random(), 2.2) * 130;
      attr[i * 3 + 1] = Math.random() * Math.PI * 2;
      attr[i * 3 + 2] = 0.25 + Math.random() * 0.75;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('attr', new THREE.BufferAttribute(attr, 3));

    this.bokehMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        time: { value: 0 },
        tex: { value: bokehTexture() },
        strength: { value: this.current.bokeh },
        mouse: { value: this.mouse },
        pr: { value: Math.min(devicePixelRatio, 1.75) }
      },
      vertexShader: `
        attribute vec3 attr;
        uniform float time;
        uniform vec2 mouse;
        uniform float pr;
        varying float vA;
        void main() {
          float size = attr.x;
          float ph = attr.y;
          float depth = attr.z;
          vec3 p = position;
          p.x += sin(time * 0.05 + ph) * 0.16 + (mouse.x - 0.5) * 0.08 * depth;
          p.y += mod(time * 0.014 * depth + ph, 2.4) - 1.2 + (mouse.y - 0.5) * 0.05 * depth;
          vA = (0.16 + 0.2 * sin(time * 0.4 + ph)) * depth;
          gl_PointSize = size * pr;
          gl_Position = vec4(p.xy, 0.0, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D tex;
        uniform float strength;
        varying float vA;
        void main() {
          float a = texture2D(tex, gl_PointCoord).a;
          gl_FragColor = vec4(1.0, 0.88, 0.66, a * vA * strength * 0.5);
        }
      `
    });
    const points = new THREE.Points(geo, this.bokehMat);
    points.frustumCulled = false;
    this.scene.add(points);
  }

  setMood(name) {
    if (this.disabled || name === this.moodName) return;
    this.moodName = name;
    this.target = this.parseMood(name);
  }

  flare() {
    if (this.disabled) return;
    this.flareV = 1;
  }

  /** 0..1 — hides the silk behind the journey's own sky */
  setDim(v) {
    if (this.disabled) return;
    this.dim = v;
  }

  loop() {
    requestAnimationFrame(this.loop.bind(this));
    const t = this.clock.getElapsedTime();
    const u = this.silk.material.uniforms;

    this.mouse.lerp(this.targetMouse, 0.04);
    this.current.a.lerp(this.target.a, 0.02);
    this.current.b.lerp(this.target.b, 0.02);
    this.current.c.lerp(this.target.c, 0.02);
    this.current.spot += (this.target.spot - this.current.spot) * 0.02;
    this.current.bokeh += (this.target.bokeh - this.current.bokeh) * 0.02;
    this.flareV = Math.max(0, this.flareV - 0.016);

    u.time.value = t;
    u.colA.value.copy(this.current.a);
    u.colB.value.copy(this.current.b);
    u.colC.value.copy(this.current.c);
    u.spot.value = this.current.spot;
    u.scroll.value = scrollY / Math.max(1, innerHeight);
    u.flare.value = this.flareV * this.flareV;
    this.bokehMat.uniforms.time.value = t;
    this.bokehMat.uniforms.strength.value = this.current.bokeh;

    this.renderer.render(this.scene, this.camera);
  }
}
