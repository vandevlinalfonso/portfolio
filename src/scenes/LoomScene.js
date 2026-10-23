import * as THREE from 'three';
import gsap from 'gsap';
import AppState from '../state/AppState.js';
import { quality } from '../utils/Quality.js';
import CameraRig, { keyLerp } from './cameraRig.js';
import {
  createLoomUniforms,
  loomVertexShader,
  makeLoomFragmentShader
} from '../shaders/loomShader.js';

/**
 * The Cinematic Loom — the DevSecOps lens scene.
 *
 * The entire world is rendered by one ray-marched volumetric fragment
 * shader (src/shaders/loomShader.js), built in the same language as the
 * lab's Blackhole: per-pixel volumetrics, SDF machinery with machined
 * detail, transmittance compositing, HDR emission through an ACES
 * tonemap. This class is the host: a fullscreen triangle, the camera
 * rig bridge, and the scroll/fault/interaction state machines that feed
 * the uniforms.
 *
 * Scroll story (per-section keys, like the Breach specimen's):
 *   hero        half-lidded iris, composed
 *   system      the eye opens; rings telescope into a corridor
 *   disciplines the mechanism loosens face-on (hover ignites a sector)
 *   doctrine    CLIMAX — full mechanical disassembly: every component
 *               disengaged along its seams, naked throat blazing
 *   contact     reseated, serene, tiny machine in the void
 *
 * Scene interface (shared by every lens scene): setHighlight / setMark /
 * setSectionAnchors / setAgitation / update / getScene / dispose
 * (+ optional onImpact callback).
 */

const SECTORS = 5;
const SECTOR_ANGLE = (Math.PI * 2) / SECTORS;

// Per-section camera states (world scale: funnel reaches z ≈ -11)
const CAMERA_KEYS = [
  { pos: new THREE.Vector3(-3.0, 0.7, 6.2), look: new THREE.Vector3(-1.2, 0.0, 0) },    // 00 hero — ring right, river receding
  { pos: new THREE.Vector3(2.6, 0.9, 3.8), look: new THREE.Vector3(1.2, 0.3, -0.3) },   // 01 system — close on the rim/corridor
  { pos: new THREE.Vector3(0, 0.2, 7.2), look: new THREE.Vector3(0, 0.1, 0) },          // 02 disciplines — face-on
  { pos: new THREE.Vector3(-2.9, -1.6, 4.6), look: new THREE.Vector3(-1.0, 0.1, -0.4) }, // 03 doctrine — low angle on the fracture
  { pos: new THREE.Vector3(-3.5, 2.2, 14.0), look: new THREE.Vector3(-0.9, 0, -1.0) }   // 04 contact — pulled far back
];

// The machine's scroll-driven states (per section midpoint)
const IRIS_KEYS = [0.25, 0.9, 0.75, 1.0, 0.35];
const SPREAD_KEYS = [0.05, 0.9, 0.1, 0.3, 0.05];
const FRACT_KEYS = [0.0, 0.0, 0.55, 1.0, 0.0];
const DRAMA_KEYS = [0.15, 0.5, 0.55, 1.0, 0.08];

const _col = new THREE.Vector3();

export default class LoomScene {
  /**
   * Optional per-scene render profile, read by main.js at boot. A full-
   * screen ray march costs per PIXEL what geometry scenes cost per frame,
   * so the loom caps its internal resolution (the Blackhole's trick) and
   * opts into the downward-only adaptive governor for slower GPUs. Scenes
   * without a profile fall through to quality.maxPixelRatio.
   */
  static renderProfile = {
    maxPixelRatio: quality.low ? 1.0 : 1.25,
    adaptive: quality.low ? null : { budgetMs: 19, ladder: [1.1, 0.95] }
  };

  constructor(camera, lens) {
    this.lens = lens;
    this.palette = lens.palette;
    this.camera = camera;
    this.scene = new THREE.Scene();

    this.rig = new CameraRig(camera, CAMERA_KEYS, quality.reducedMotion ? 0 : 0.16);

    this.time = 0;
    this.agitation = 0;
    this.drama = DRAMA_KEYS[0];
    this.onImpact = null; // wired by main.js → post glitch tick

    this.highlightValues = [0, 0, 0, 0, 0];
    this.markValues = [0, 0, 0, 0, 0];
    this.faults = []; // at most two concurrent rejection state machines
    this.faultCooldown = 4; // no rejection theater in the first seconds

    this.flareTheta = 0;
    this.flareAmt = 0;
    // Start the smoothed coverage at the persisted value — no ramp-in
    this.covSmooth = Math.min(1, Math.max(0, (AppState.getDecayLevel() - 0.3) / 0.55));

    this.uniforms = createLoomUniforms(this.palette);
    this.uniforms.highlight.value = this.highlightValues;
    this.uniforms.markArr.value = this.markValues;
    this.uniforms.motionAmp.value = quality.reducedMotion ? 0.15 : 1;

    const steps = quality.low ? 56 : 88;
    const material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: loomVertexShader,
      fragmentShader: makeLoomFragmentShader(steps),
      depthWrite: false,
      depthTest: false
    });

    // One fullscreen triangle — the shader is the scene
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
      -1, -1, 0, 3, -1, 0, -1, 3, 0
    ]), 3));
    this.quad = new THREE.Mesh(geometry, material);
    this.quad.frustumCulled = false;
    this.scene.add(this.quad);
  }

  /* ---------------- Rejection lifecycle ---------------- */

  spawnFault() {
    if (this.faults.length >= 2) return;
    this.faults.push({
      theta: Math.random() * Math.PI * 2,
      level: 0,
      phase: 'flicker',
      hold: 0.4 + Math.random() * 0.4,
      cut: 0,
      seed: Math.random()
    });
  }

  updateFaults(deltaTime) {
    // Quadratic drama curve + cooldown: calm sections are truly calm
    // (hero ≈ one rejection per ~45 s; doctrine ≈ one per ~3 s)
    this.faultCooldown -= deltaTime;
    const rps = (0.015 + this.drama * this.drama * 0.34)
              * (quality.reducedMotion ? 0.35 : 1);
    if (this.faultCooldown <= 0 && Math.random() < rps * deltaTime) {
      this.spawnFault();
      this.faultCooldown = 3 + (1 - this.drama) * 12;
    }

    for (let i = this.faults.length - 1; i >= 0; i--) {
      const f = this.faults[i];

      if (f.phase === 'flicker') {
        f.level = Math.min(1, f.level + deltaTime * 1.3);
        if (f.level >= 1) {
          f.hold -= deltaTime;
          if (f.hold <= 0) {
            // Severed at the rim — the gate rejects it
            f.phase = 'cut';
            this.flareTheta = f.theta;
            this.flareAmt = 1;
            if (!quality.reducedMotion && this.drama > 0.5 && this.onImpact) {
              this.onImpact(0.1 + this.drama * 0.22);
            }
          }
        }
      } else {
        f.cut = Math.min(1, f.cut + deltaTime * 1.4);
        f.level = Math.max(0, 1 - f.cut * 1.2);
        if (f.cut >= 1) this.faults.splice(i, 1);
      }
    }

    // Feed the two fault uniform slots
    const u0 = this.uniforms.fault0.value;
    const u1 = this.uniforms.fault1.value;
    const f0 = this.faults[0];
    const f1 = this.faults[1];
    if (f0) u0.set(f0.theta, f0.level, f0.cut, f0.seed);
    else u0.set(0, 0, 0, 0);
    if (f1) u1.set(f1.theta, f1.level, f1.cut, f1.seed);
    else u1.set(0, 0, 0, 0);
  }

  /* ---------------- Scene interface ---------------- */

  setSectionAnchors(anchors) {
    this.rig.setSectionAnchors(anchors);
  }

  setAgitation(amount) {
    this.agitation = amount;
  }

  /**
   * Case-row hover: ignite the matching shard + its slice of the river
   */
  setHighlight(sector, on) {
    if (sector < 0 || sector >= SECTORS) return;
    gsap.to(this.highlightValues, {
      [sector]: on ? 1 : 0,
      duration: 0.45,
      ease: 'power2.out'
    });
  }

  /**
   * Case examined: a seal arc burns permanently on that shard
   */
  setMark(sector, instant = false) {
    if (sector < 0 || sector >= SECTORS) return;
    if (instant) {
      this.markValues[sector] = 1;
    } else {
      gsap.to(this.markValues, { [sector]: 1, duration: 1.4 });
    }
  }

  update(deltaTime, progress, mouse) {
    this.time += deltaTime;

    const t = this.rig.update(progress, mouse);
    this.drama = keyLerp(DRAMA_KEYS, t);

    // Coverage scalar (0.3..0.85) → throat intensity / river body (0..1).
    // Smoothed on a minutes scale so idle growth deepens the scene
    // imperceptibly instead of visibly morphing it.
    const cov = Math.min(1, Math.max(0, (AppState.getDecayLevel() - 0.3) / 0.55));
    this.covSmooth += (cov - this.covSmooth) * Math.min(1, deltaTime * 0.05);

    const u = this.uniforms;
    u.time.value = this.time;
    u.iris.value = keyLerp(IRIS_KEYS, t);
    u.spread.value = keyLerp(SPREAD_KEYS, t);
    u.fracture.value = keyLerp(FRACT_KEYS, t);
    u.cov.value = this.covSmooth;

    this.flareAmt = Math.max(0, this.flareAmt - deltaTime * 2.2);
    u.flareTheta.value = this.flareTheta;
    u.flareAmt.value = this.flareAmt;

    this.updateFaults(deltaTime);

    // Bridge the rig camera into the shader's world-space rays
    this.camera.updateMatrixWorld();
    const m = this.camera.matrixWorld.elements;
    u.camPos.value.copy(this.camera.position);
    u.camRight.value.set(m[0], m[1], m[2]).normalize();
    u.camUp.value.set(m[4], m[5], m[6]).normalize();
    _col.set(m[8], m[9], m[10]).normalize();
    u.camFwd.value.set(-_col.x, -_col.y, -_col.z);
    u.aspect.value = this.camera.aspect;
  }

  getScene() {
    return this.scene;
  }

  dispose() {
    this.quad.geometry.dispose();
    this.quad.material.dispose();
  }
}
