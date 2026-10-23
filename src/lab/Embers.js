import * as THREE from 'three';

/**
 * Embers — a GPGPU particle field.
 *
 * Particle positions live in a ping-pong half-float render target.
 * Every frame a sim shader springs each ember toward a target glyph
 * position (rasterized from text), drifts it on curl noise, and lets
 * the cursor blow it away like sparks. The words cycle.
 */

const WORDS = ['EMBERS', 'TOUCH ME', 'STILL HERE', 'BURN SLOW'];

const NOISE_GLSL = `
  vec3 hash3(vec3 p) {
    p = vec3(dot(p, vec3(127.1, 311.7, 74.7)),
             dot(p, vec3(269.5, 183.3, 246.1)),
             dot(p, vec3(113.5, 271.9, 124.6)));
    return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
  }
  float noise3(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    vec3 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(dot(hash3(i), f),
                       dot(hash3(i + vec3(1,0,0)), f - vec3(1,0,0)), u.x),
                   mix(dot(hash3(i + vec3(0,1,0)), f - vec3(0,1,0)),
                       dot(hash3(i + vec3(1,1,0)), f - vec3(1,1,0)), u.x), u.y),
               mix(mix(dot(hash3(i + vec3(0,0,1)), f - vec3(0,0,1)),
                       dot(hash3(i + vec3(1,0,1)), f - vec3(1,0,1)), u.x),
                   mix(dot(hash3(i + vec3(0,1,1)), f - vec3(0,1,1)),
                       dot(hash3(i + vec3(1,1,1)), f - vec3(1,1,1)), u.x), u.y), u.z);
  }
  vec3 curl(vec3 p) {
    const float e = 0.04;
    float nx1 = noise3(p + vec3(0, e, 0)), nx2 = noise3(p - vec3(0, e, 0));
    float ny1 = noise3(p + vec3(0, 0, e)), ny2 = noise3(p - vec3(0, 0, e));
    float nz1 = noise3(p + vec3(e, 0, 0)), nz2 = noise3(p - vec3(e, 0, 0));
    return normalize(vec3(nx1 - nx2, ny1 - ny2, nz1 - nz2) / (2.0 * e) + 1e-6);
  }
`;

export default class Embers {
  constructor(host, quality) {
    this.simW = quality.isMobile ? 256 : 448;
    this.simH = quality.isMobile ? 160 : 280;
    this.count = this.simW * this.simH;
    this.wordIndex = 0;
    this.heat = 0;
    this.burst = 0;

    this.renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
    this.renderer.setSize(innerWidth, innerHeight);
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, quality.maxPixelRatio));
    host.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x070708);
    this.aspect = innerWidth / innerHeight;
    this.camera = new THREE.OrthographicCamera(-this.aspect, this.aspect, 1, -1, 0.1, 10);
    this.camera.position.z = 5;

    this.buildSim();
    this.buildPoints();
    this.setWord(0);

    this.wordTimer = setInterval(() => {
      this.setWord((this.wordIndex + 1) % WORDS.length);
    }, 7000);
  }

  buildSim() {
    const opts = {
      type: THREE.HalfFloatType,
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      depthBuffer: false,
      stencilBuffer: false
    };
    this.rtA = new THREE.WebGLRenderTarget(this.simW, this.simH, opts);
    this.rtB = new THREE.WebGLRenderTarget(this.simW, this.simH, opts);

    // Seed positions
    const seed = new Float32Array(this.count * 4);
    for (let i = 0; i < this.count; i++) {
      seed[i * 4] = (Math.random() - 0.5) * 2 * this.aspect;
      seed[i * 4 + 1] = (Math.random() - 0.5) * 2;
      seed[i * 4 + 2] = (Math.random() - 0.5) * 0.4;
      seed[i * 4 + 3] = Math.random();
    }
    this.seedTex = new THREE.DataTexture(seed, this.simW, this.simH, THREE.RGBAFormat, THREE.FloatType);
    this.seedTex.needsUpdate = true;

    this.simScene = new THREE.Scene();
    this.simCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.simMaterial = new THREE.ShaderMaterial({
      uniforms: {
        posTex: { value: this.seedTex },
        targetTex: { value: null },
        dt: { value: 0.016 },
        time: { value: 0 },
        cursor: { value: new THREE.Vector3(99, 99, 0) }
      },
      vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position, 1.0); }',
      fragmentShader: `
        uniform sampler2D posTex;
        uniform sampler2D targetTex;
        uniform float dt;
        uniform float time;
        uniform vec3 cursor;
        varying vec2 vUv;
        ${NOISE_GLSL}
        void main() {
          vec4 p = texture2D(posTex, vUv);
          vec3 target = texture2D(targetTex, vUv).xyz;
          vec3 pos = p.xyz;
          float seed = p.w;

          vec3 vel = (target - pos) * (1.6 + seed * 1.2);
          vel += curl(pos * 2.2 + vec3(0.0, 0.0, time * 0.1)) * (0.10 + 0.22 * fract(seed * 7.31));

          vec2 d = pos.xy - cursor.xy;
          float dist2 = dot(d, d);
          float push = exp(-dist2 * 18.0) * cursor.z;
          vel.xy += normalize(d + 1e-5) * push * 7.0;
          vel.z += (fract(seed * 13.7) - 0.5) * push * 2.0;

          pos += vel * dt;
          gl_FragColor = vec4(pos, seed);
        }
      `
    });
    this.simScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.simMaterial));

    // Prime both targets with the seed data
    const copy = new THREE.ShaderMaterial({
      uniforms: { tex: { value: this.seedTex } },
      vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position, 1.0); }',
      fragmentShader: 'uniform sampler2D tex; varying vec2 vUv; void main() { gl_FragColor = texture2D(tex, vUv); }'
    });
    const copyScene = new THREE.Scene();
    copyScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), copy));
    for (const rt of [this.rtA, this.rtB]) {
      this.renderer.setRenderTarget(rt);
      this.renderer.render(copyScene, this.simCamera);
    }
    this.renderer.setRenderTarget(null);
    copy.dispose();
  }

  buildPoints() {
    const refs = new Float32Array(this.count * 2);
    for (let i = 0; i < this.count; i++) {
      refs[i * 2] = ((i % this.simW) + 0.5) / this.simW;
      refs[i * 2 + 1] = (Math.floor(i / this.simW) + 0.5) / this.simH;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(this.count * 3), 3));
    geo.setAttribute('ref', new THREE.BufferAttribute(refs, 2));

    this.pointsMaterial = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        posTex: { value: null },
        targetTex: { value: null },
        pr: { value: Math.min(devicePixelRatio, 2) }
      },
      vertexShader: `
        attribute vec2 ref;
        uniform sampler2D posTex;
        uniform sampler2D targetTex;
        uniform float pr;
        varying float vHeat;
        varying float vSeed;
        void main() {
          vec4 p = texture2D(posTex, ref);
          vec3 t = texture2D(targetTex, ref).xyz;
          vHeat = clamp(length(p.xyz - t) * 2.4, 0.0, 1.0);
          vSeed = p.w;
          gl_PointSize = (1.4 + 2.2 * vHeat + fract(p.w * 5.0)) * pr;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p.xyz, 1.0);
        }
      `,
      fragmentShader: `
        varying float vHeat;
        varying float vSeed;
        void main() {
          vec2 c = gl_PointCoord - 0.5;
          float d = length(c);
          if (d > 0.5) discard;
          vec3 cold = vec3(0.38, 0.07, 0.05);
          vec3 hot = vec3(1.0, 0.52, 0.16);
          vec3 col = mix(cold, hot, vHeat);
          col += vec3(0.25, 0.1, 0.03) * step(0.96, fract(vSeed * 91.7)); // rare bright sparks
          float a = (1.0 - d * 2.0) * (0.55 + vHeat * 0.45);
          gl_FragColor = vec4(col, a);
        }
      `
    });

    this.points = new THREE.Points(geo, this.pointsMaterial);
    this.points.frustumCulled = false;
    this.scene.add(this.points);
  }

  /** Rasterize a word and build the target-position texture */
  setWord(index) {
    this.wordIndex = index;
    const word = WORDS[index];

    const cw = 1200, ch = 400;
    const canvas = document.createElement('canvas');
    canvas.width = cw;
    canvas.height = ch;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    let size = 230;
    do {
      ctx.font = `700 ${size}px 'Space Grotesk', sans-serif`;
      size -= 10;
    } while (ctx.measureText(word).width > cw * 0.92 && size > 40);
    ctx.fillText(word, cw / 2, ch / 2);

    const img = ctx.getImageData(0, 0, cw, ch).data;
    const pts = [];
    for (let y = 0; y < ch; y += 2) {
      for (let x = 0; x < cw; x += 2) {
        if (img[(y * cw + x) * 4 + 3] > 128) pts.push([x, y]);
      }
    }
    if (!pts.length) pts.push([cw / 2, ch / 2]);

    // Map raster coords into ortho world (keep the word ~70% of view width)
    const worldW = this.aspect * 1.5;
    const scale = worldW / cw;
    const data = new Float32Array(this.count * 4);
    for (let i = 0; i < this.count; i++) {
      const [px, py] = pts[(Math.random() * pts.length) | 0];
      data[i * 4] = (px - cw / 2) * scale + (Math.random() - 0.5) * 0.012;
      data[i * 4 + 1] = -(py - ch / 2) * scale + (Math.random() - 0.5) * 0.012;
      data[i * 4 + 2] = (Math.random() - 0.5) * 0.16;
      data[i * 4 + 3] = 1;
    }

    const old = this.targetTex;
    this.targetTex = new THREE.DataTexture(data, this.simW, this.simH, THREE.RGBAFormat, THREE.FloatType);
    this.targetTex.needsUpdate = true;
    this.simMaterial.uniforms.targetTex.value = this.targetTex;
    this.pointsMaterial.uniforms.targetTex.value = this.targetTex;
    old?.dispose();
  }

  click() {
    this.burst = 3.2;
  }

  update(dt, time, pointer) {
    // Cursor in world coords; strength from movement speed
    const wx = (pointer.x / innerWidth * 2 - 1) * this.aspect;
    const wy = -(pointer.y / innerHeight * 2 - 1);
    const speed = Math.hypot(pointer.x - pointer.px, pointer.y - pointer.py);
    this.heat += ((speed > 1 ? Math.min(speed / 18, 1.4) : 0) - this.heat) * 0.12;
    this.burst = Math.max(0, this.burst - dt * 4);

    const u = this.simMaterial.uniforms;
    u.cursor.value.set(wx, wy, 0.25 + this.heat + this.burst);
    u.dt.value = Math.min(dt, 0.033);
    u.time.value = time;
    u.posTex.value = this.rtA.texture;

    this.renderer.setRenderTarget(this.rtB);
    this.renderer.render(this.simScene, this.simCamera);
    this.renderer.setRenderTarget(null);

    [this.rtA, this.rtB] = [this.rtB, this.rtA];
    this.pointsMaterial.uniforms.posTex.value = this.rtA.texture;

    this.renderer.render(this.scene, this.camera);
  }

  resize(w, h) {
    this.aspect = w / h;
    this.camera.left = -this.aspect;
    this.camera.right = this.aspect;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.setWord(this.wordIndex);
  }

  dispose() {
    clearInterval(this.wordTimer);
    this.rtA.dispose();
    this.rtB.dispose();
    this.seedTex.dispose();
    this.targetTex?.dispose();
    this.points.geometry.dispose();
    this.pointsMaterial.dispose();
    this.simMaterial.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
