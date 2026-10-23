import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

/**
 * Final grade pass: chromatic aberration, film grain, vignette, color tint.
 */
const GradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    time: { value: 0 },
    grain: { value: 0.05 },
    aberration: { value: 0.0012 },
    vignette: { value: 0.55 },
    tint: { value: new THREE.Color(1, 1, 1) },
    glitch: { value: 0 },
    scanline: { value: 0.035 }
  },

  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,

  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float time;
    uniform float grain;
    uniform float aberration;
    uniform float vignette;
    uniform vec3 tint;
    uniform float glitch;
    uniform float scanline;

    varying vec2 vUv;

    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
    }

    void main() {
      vec2 uv = vUv;

      // Glitch burst: horizontal band displacement (act transitions,
      // violent scrolling)
      if (glitch > 0.002) {
        float band = floor(uv.y * 28.0);
        float jitter = hash(vec2(band, floor(time * 24.0)));
        float shift = (jitter - 0.5) * glitch * 0.09 * step(0.6, jitter);
        uv.x += shift;
      }

      vec2 dir = uv - 0.5;
      float dist = length(dir);

      // Chromatic aberration, stronger toward edges, spikes with glitch
      float ca = (aberration + glitch * 0.004) * (0.5 + dist * 2.0);
      vec3 col;
      col.r = texture2D(tDiffuse, uv + dir * ca).r;
      col.g = texture2D(tDiffuse, uv).g;
      col.b = texture2D(tDiffuse, uv - dir * ca).b;

      col *= tint;

      // Vignette
      col *= 1.0 - smoothstep(0.4, 0.95, dist) * vignette;

      // CRT scanlines, barely-there
      col *= 1.0 - scanline * (0.5 + 0.5 * sin(vUv.y * 1400.0));

      // Animated film grain (heavier during glitches)
      float g = hash(vUv * vec2(1920.0, 1080.0) + fract(time) * 113.0) - 0.5;
      col += g * (grain + glitch * 0.08);

      gl_FragColor = vec4(col, 1.0);
    }
  `
};

// Per-section grade: hero (cold/clinical) -> specimen -> incidents
// (dimmed so the case rows lead) -> doctrine (warm) -> contact (calm)
const SECTION_PRESETS = {
  0: { bloom: 0.4, grain: 0.045, aberration: 0.0012, vignette: 0.5, tint: new THREE.Color(0.94, 0.97, 1.05) },
  1: { bloom: 0.45, grain: 0.05, aberration: 0.0015, vignette: 0.55, tint: new THREE.Color(0.96, 0.97, 1.02) },
  2: { bloom: 0.35, grain: 0.05, aberration: 0.0018, vignette: 0.68, tint: new THREE.Color(0.9, 0.9, 0.92) },
  3: { bloom: 0.5, grain: 0.06, aberration: 0.0022, vignette: 0.6, tint: new THREE.Color(1.04, 0.95, 0.9) },
  4: { bloom: 0.45, grain: 0.045, aberration: 0.0012, vignette: 0.52, tint: new THREE.Color(0.97, 0.97, 1.0) }
};

export default class PostProcessing {
  constructor(renderer, camera) {
    this.renderer = renderer;
    this.camera = camera;

    this.composer = new EffectComposer(renderer);

    this.renderPass = new RenderPass(new THREE.Scene(), camera);
    this.composer.addPass(this.renderPass);

    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.35, // strength
      0.6,  // radius
      0.82  // threshold
    );
    this.composer.addPass(this.bloomPass);

    this.gradePass = new ShaderPass(GradeShader);
    this.composer.addPass(this.gradePass);

    this.composer.addPass(new OutputPass());

    this.target = { ...SECTION_PRESETS[0], tint: SECTION_PRESETS[0].tint.clone() };
    this.glitchLevel = 0;
    this.velocityBoost = 0;
    this.setSection(0);
  }

  /**
   * Fire a short glitch burst (act transitions, violent interactions)
   * @param {number} strength - 0..1
   */
  triggerGlitch(strength = 1) {
    this.glitchLevel = Math.max(this.glitchLevel, Math.min(1, strength));
  }

  /**
   * Feed normalized scroll velocity; fast scrubbing destabilizes the
   * image (aberration + grain creep up)
   * @param {number} velocity
   */
  setScrollVelocity(velocity) {
    this.velocityBoost = Math.min(1, velocity);
  }

  setSection(sectionIndex) {
    const preset = SECTION_PRESETS[sectionIndex] || SECTION_PRESETS[0];
    this.target.bloom = preset.bloom;
    this.target.grain = preset.grain;
    this.target.aberration = preset.aberration;
    this.target.vignette = preset.vignette;
    this.target.tint.copy(preset.tint);
  }

  resize(width, height) {
    this.composer.setSize(width, height);
  }

  /**
   * Device-pixel-ratio multiplier, same semantics as
   * WebGLRenderer.setPixelRatio. The composer caches CSS dims and re-runs
   * setSize internally, resizing its ping-pong targets and every pass —
   * the bloom mip chain included. Call AFTER renderer.setPixelRatio.
   */
  setPixelRatio(ratio) {
    this.composer.setPixelRatio(ratio);
  }

  render(deltaTime, scene) {
    this.renderPass.scene = scene;

    // Ease current grade toward the active Act's preset
    const k = Math.min(1, deltaTime * 1.5);
    const u = this.gradePass.uniforms;
    this.bloomPass.strength += (this.target.bloom - this.bloomPass.strength) * k;
    u.grain.value += (this.target.grain - u.grain.value) * k;
    u.vignette.value += (this.target.vignette - u.vignette.value) * k;
    u.tint.value.lerp(this.target.tint, k);
    u.time.value += deltaTime;

    // Scroll velocity destabilizes the image
    const targetAberration = this.target.aberration * (1 + this.velocityBoost * 4);
    u.aberration.value += (targetAberration - u.aberration.value) * Math.min(1, deltaTime * 4);

    // Glitch bursts decay quickly
    this.glitchLevel = Math.max(0, this.glitchLevel - deltaTime * 2.2);
    u.glitch.value = this.glitchLevel;

    this.composer.render(deltaTime);
  }

  dispose() {
    this.composer.dispose();
  }
}
