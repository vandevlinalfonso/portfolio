import * as THREE from 'three';
import Theme from '../theme/index.js';

/**
 * Decrypt portrait — the CV centerpiece.
 *
 * The subject photo is treated entirely in-shader (no pixels are pre-baked):
 *   · the flat red studio background is chroma-keyed out into the forensic void
 *   · a faux relight adds a cold key and an accent rim along the silhouette
 *   · the image is graded to a bone/accent duotone (accent = active lens)
 *   · on load it resolves top-to-bottom out of blocky decrypt static
 *   · film grain, scanlines, vignette and an ACES-ish filmic tonemap finish it,
 *     matching the house look used by the Blackhole and the Loom.
 *
 * Same pose, same subject — only background, light, framing and grade change.
 */

const VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const FRAG = /* glsl */ `
  precision highp float;
  varying vec2 vUv;

  uniform sampler2D uTex;
  uniform float uTime;
  uniform float uReveal;     // 0..1 decrypt progress
  uniform float uHover;      // 0..1 pointer inside
  uniform float uReady;      // 1 once texture loaded
  uniform vec2  uMouse;      // -1..1 within panel
  uniform vec2  uRes;        // panel px
  uniform float uPanelA;     // panel aspect w/h
  uniform float uImgA;       // image aspect w/h
  uniform vec3  uAccent;     // active lens accent

  const vec3 VOID   = vec3(0.039, 0.039, 0.043);
  const vec3 BONE   = vec3(0.910, 0.902, 0.882);
  #define ACCENT uAccent

  float hash21(vec2 p){ p = fract(p * vec2(234.34, 435.345)); p += dot(p, p + 34.23); return fract(p.x * p.y); }
  float noise2(vec2 p){
    vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    float a = hash21(i), b = hash21(i + vec2(1,0)), c = hash21(i + vec2(0,1)), d = hash21(i + vec2(1,1));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }
  vec3 filmic(vec3 c){ return (c * (2.51 * c + 0.03)) / (c * (2.43 * c + 0.59) + 0.14); }

  // object-fit: cover mapping
  vec2 coverUv(vec2 uv){
    vec2 c = uv - 0.5;
    if (uPanelA > uImgA) c.y *= uImgA / uPanelA;
    else                 c.x *= uPanelA / uImgA;
    return c + 0.5;
  }

  // 1.0 where the red studio background is, 0.0 on the subject.
  // Threshold sits well above skin redness so cheeks are never keyed.
  float bgKey(vec2 uv){
    vec3 s = texture2D(uTex, uv).rgb;
    float redness = s.r - max(s.g, s.b);
    return smoothstep(0.34, 0.56, redness);
  }

  void main(){
    // subtle parallax + breathing zoom
    vec2 par = uMouse * 0.012 * (0.4 + 0.6 * uHover);
    float zoom = 1.0 - 0.02 * uHover;
    vec2 uv = coverUv((vUv - 0.5) * zoom + 0.5 + par);

    vec3 tex = texture2D(uTex, uv).rgb;
    float mask = bgKey(uv);                 // 1 = background

    // ---- duotone grade of the subject ----
    float lum = dot(tex, vec3(0.299, 0.587, 0.114));
    lum = pow(clamp(lum, 0.0, 1.0), 0.92);
    vec3 subject = mix(VOID * 1.1, BONE, smoothstep(0.04, 0.96, lum));
    subject += ACCENT * smoothstep(0.32, 0.68, lum) * 0.03;   // faint accent midtones
    // cold key from upper-left
    float key = clamp(dot(normalize(vec2(-0.6, 0.8)), (vUv - 0.5)) + 0.5, 0.0, 1.0);
    subject *= mix(vec3(0.86, 0.9, 1.02), vec3(1.04, 1.0, 0.95), key);

    // ---- silhouette rim light (faux relight) ----
    // Only fires where a real background pixel sits next to the subject, so
    // near-threshold skin regions (cheeks) never glow.
    vec2 e = 1.8 / uRes;
    float kL = bgKey(uv + vec2(e.x, 0.0));
    float kR = bgKey(uv - vec2(e.x, 0.0));
    float kU = bgKey(uv + vec2(0.0, e.y));
    float kD = bgKey(uv - vec2(0.0, e.y));
    float edge = abs(mask - kL) + abs(mask - kR) + abs(mask - kU) + abs(mask - kD);
    float nbBg = max(max(kL, kR), max(kU, kD));           // is a neighbour truly background?
    edge = clamp(edge * 1.4, 0.0, 1.0) * smoothstep(0.35, 0.8, nbBg) * (1.0 - mask);
    float rim = pow(edge, 1.25);

    // ---- background field (void + spotlight behind head) ----
    vec2 p = vUv - vec2(0.5, 0.62);
    p.x *= uPanelA;
    float halo = smoothstep(0.62, 0.0, length(p));
    vec3 bg = mix(VOID * 0.65, ACCENT * 0.14, halo * 0.6);
    bg += (noise2(vUv * uRes * 0.18 + uTime * 0.05) - 0.5) * 0.015;

    vec3 col = mix(subject, bg, mask);
    col += ACCENT * rim * (0.55 + 0.45 * uHover);   // accent rim on the silhouette

    // ---- slow drifting scan highlight ----
    float scanY = fract(uTime * 0.05);
    float scan = smoothstep(0.010, 0.0, abs((1.0 - vUv.y) - scanY));
    col += ACCENT * scan * 0.05;

    // ---- develop / signal-lock reveal (top -> bottom) ----
    // The portrait resolves out of a dim, finely-grained, interlaced "latent"
    // of itself — a photograph developing / a feed locking on — not blocky static.
    float py = 1.0 - vUv.y;
    float line = uReveal * 1.16;
    float lock = 1.0 - smoothstep(line - 0.11, line + 0.02, py);   // 1 = resolved

    float fine = hash21(vUv * uRes * 0.85 + floor(uTime * 46.0) * 2.71);
    float interlace = 0.62 + 0.38 * step(0.5, fract(vUv.y * uRes.y * 0.5));
    vec3 latent = col * 0.5;
    latent = mix(latent, ACCENT * 0.40, 0.12);       // faint accent cast
    latent *= interlace;                              // thin, even interlace lines
    latent += (fine - 0.5) * 0.11;                    // fine grain, not blocks

    float lockEdge = smoothstep(0.055, 0.0, abs(py - line)) * step(uReveal, 0.999);
    col = mix(latent, col, lock);
    col += (ACCENT * 0.5 + BONE * 0.18) * lockEdge;   // soft bright lock edge
    col = mix(VOID, col, uReady);

    // ---- finish ----
    float d = length(vUv - 0.5);
    col *= smoothstep(1.28, 0.32, d);                                  // vignette
    col *= 0.965 + 0.035 * sin(vUv.y * uRes.y * 1.5);                  // fine scanlines
    col += (hash21(vUv * uRes + fract(uTime)) - 0.5) * 0.022;         // subtle grain
    col = filmic(col * 1.06);

    gl_FragColor = vec4(col, 1.0);
  }
`;

export default class Portrait {
  constructor(canvas, quality, imageUrl) {
    this.canvas = canvas;
    this.quality = quality;
    this.dpr = Math.min(window.devicePixelRatio || 1, quality.isMobile ? 1.5 : 2);

    // preserveDrawingBuffer so the resolved frame can be captured to a still
    // image for the PDF export
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(this.dpr);

    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    this.uniforms = {
      uTex: { value: null },
      uTime: { value: 0 },
      uReveal: { value: 0 },
      uHover: { value: 0 },
      uReady: { value: 0 },
      uMouse: { value: new THREE.Vector2(0, 0) },
      uRes: { value: new THREE.Vector2(1, 1) },
      uPanelA: { value: 1 },
      uImgA: { value: 0.75 },
      uAccent: { value: new THREE.Vector3(...Theme.accentVec3()) }
    };
    this.offTheme = Theme.onChange(() => this.uniforms.uAccent.value.set(...Theme.accentVec3()));

    this.mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms: this.uniforms })
    );
    this.scene.add(this.mesh);

    this._targetReveal = 0;
    this._targetHover = 0;
    this._mouse = new THREE.Vector2(0, 0);
    this._rect = canvas.getBoundingClientRect();

    this.resize();

    new THREE.TextureLoader().load(imageUrl, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.minFilter = THREE.LinearFilter;
      this.uniforms.uTex.value = tex;
      this.uniforms.uImgA.value = tex.image.width / tex.image.height;
      this.uniforms.uReady.value = 1;
      this._loaded = true;
      if (this._pendingReveal) this.reveal();
    });
  }

  reveal() {
    if (!this._loaded) { this._pendingReveal = true; return; }
    this._revealing = true;      // start marked on the next frame (needs the clock)
    this._revealStart = -1;
  }

  setPointer(clientX, clientY) {
    const r = this._rect;
    const inside =
      clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom;
    this._targetHover = inside ? 1 : 0;
    this._mouse.set(
      ((clientX - r.left) / r.width) * 2 - 1,
      -(((clientY - r.top) / r.height) * 2 - 1)
    );
  }

  update(dt, time) {
    this.uniforms.uTime.value = time;
    // steady decrypt sweep (~1.7s), driven by wall-clock so it resolves the same
    // regardless of frame-rate
    if (this._revealing) {
      if (this._revealStart < 0) this._revealStart = time;
      this.uniforms.uReveal.value = Math.min(1, (time - this._revealStart) / 1.7);
    }
    this.uniforms.uHover.value += (this._targetHover - this.uniforms.uHover.value) * Math.min(1, dt * 6);
    this.uniforms.uMouse.value.lerp(this._mouse, Math.min(1, dt * 4));
    this.renderer.render(this.scene, this.camera);
  }

  // Snapshot the current (keyed, duotone) frame as a data URL for the PDF.
  captureDataURL() {
    this.renderer.render(this.scene, this.camera); // ensure a fresh frame in the buffer
    return this.renderer.domElement.toDataURL('image/jpeg', 0.92);
  }

  resize() {
    this._rect = this.canvas.getBoundingClientRect();
    const w = this.canvas.clientWidth || 1;
    const h = this.canvas.clientHeight || 1;
    this.renderer.setSize(w, h, false);
    this.uniforms.uRes.value.set(w * this.dpr, h * this.dpr);
    this.uniforms.uPanelA.value = w / h;
  }

  dispose() {
    this.offTheme();
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
    this.uniforms.uTex.value?.dispose();
    this.renderer.dispose();
  }
}
