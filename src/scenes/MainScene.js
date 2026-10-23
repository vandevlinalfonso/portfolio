import * as THREE from 'three';
import Artifact from '../objects/Artifact.js';
import AppState from '../state/AppState.js';
import { quality } from '../utils/Quality.js';
import LensManager from '../lenses/index.js';
import CameraRig, { keyLerp } from './cameraRig.js';
import { createFloor, createDust } from './environment.js';

/**
 * The Specimen scene — the examined artifact (Breach lens).
 * A dark-glass icosahedron under forensic examination: scroll dissects it,
 * a scan ring sweeps it, examined cases scar it, decay spreads veins.
 *
 * Implements the shared scene interface: setHighlight / setMark /
 * setSectionAnchors / setAgitation / update / getScene / dispose.
 */

// Per-section camera states
const CAMERA_KEYS = [
  { pos: new THREE.Vector3(-2.4, 0.6, 4.6), look: new THREE.Vector3(-1.3, 0.15, 0) },  // 00 hero — artifact right
  { pos: new THREE.Vector3(2.6, 0.9, 4.2), look: new THREE.Vector3(1.55, 0.1, 0) },   // 01 specimen — artifact left
  { pos: new THREE.Vector3(0, 1.9, 8.0), look: new THREE.Vector3(0, 0.3, 0) },        // 02 incidents — far back, centered
  { pos: new THREE.Vector3(-2.3, -0.5, 3.9), look: new THREE.Vector3(-1.25, 0.35, 0) }, // 03 doctrine — low angle, right
  { pos: new THREE.Vector3(-1.8, 0.5, 6.2), look: new THREE.Vector3(-1.15, 0.1, 0) }  // 04 contact — calm, distant right
];

// Default (Breach) physics, used when the lens doesn't override them
const DEFAULT_PHYSICS = {
  explodeKeys: [0.02, 0.15, 0.8, 0.45, 0.05],
  payloadKeys: [0.0, 0.12, 1.0, 0.7, 0.22]
};

export default class MainScene {
  constructor(camera, lens = LensManager.active) {
    this.lens = lens;
    this.palette = lens.palette;
    const physics = lens.physics || DEFAULT_PHYSICS;
    this.explodeKeys = physics.explodeKeys;
    this.payloadKeys = physics.payloadKeys;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(this.palette.background);
    this.scene.fog = new THREE.Fog(this.palette.fog[0], this.palette.fog[1], this.palette.fog[2]);

    this.rig = new CameraRig(camera, CAMERA_KEYS, quality.reducedMotion ? 0 : 0.16);

    this.artifact = new Artifact(5, this.palette);
    this.scene.add(this.artifact.getGroup());

    this.agitation = 0;

    this.setupLights();
    this.floor = createFloor(this.scene, {
      baseColor: this.palette.background,
      lineColor: 0xe8e6e1,
      y: -1.85
    });
    this.createShadowBlob();
    this.dust = createDust(this.scene);
    this.createLightShaft();
    this.createScanRing();
  }

  setupLights() {
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.35));

    const key = new THREE.DirectionalLight(0xffffff, 1.1);
    key.position.set(3, 5, 2);
    this.scene.add(key);

    const rimCool = new THREE.PointLight(0x6688ff, 8, 12);
    rimCool.position.set(-3, 1.5, -2.5);
    this.scene.add(rimCool);

    const rimWarm = new THREE.PointLight(this.palette.lightWarm, 4, 9);
    rimWarm.position.set(2.5, -1.5, 2);
    this.scene.add(rimWarm);
  }

  /**
   * Fake soft contact shadow under the specimen
   */
  createShadowBlob() {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0.55)');
    gradient.addColorStop(0.6, 'rgba(0, 0, 0, 0.25)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    this.shadowBlob = new THREE.Mesh(
      new THREE.PlaneGeometry(4.4, 4.4),
      new THREE.MeshBasicMaterial({
        map: new THREE.CanvasTexture(canvas),
        transparent: true,
        depthWrite: false
      })
    );
    this.shadowBlob.rotation.x = -Math.PI / 2;
    this.shadowBlob.position.y = -1.84;
    this.scene.add(this.shadowBlob);
  }

  createLightShaft() {
    const geometry = new THREE.ConeGeometry(1.7, 6.2, 32, 1, true);
    const material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      uniforms: {
        time: { value: 0 },
        intensity: { value: 0.07 }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform float intensity;
        varying vec2 vUv;
        void main() {
          float fade = pow(vUv.y, 2.2);
          float flicker = 0.9 + 0.1 * sin(time * 0.7) * sin(time * 0.23 + 1.7);
          gl_FragColor = vec4(vec3(0.8, 0.86, 1.0), fade * intensity * flicker);
        }
      `
    });

    this.shaft = new THREE.Mesh(geometry, material);
    this.shaft.position.set(0, 4.6 - 3.1, 0);
    this.scene.add(this.shaft);
  }

  /**
   * Forensic scan ring: a thin glowing hoop that sweeps the specimen
   * vertically while the visitor reads the Specimen section
   */
  createScanRing() {
    this.scanRing = new THREE.Group();

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.85, 0.008, 8, 96),
      new THREE.MeshBasicMaterial({
        color: 0xdce6f5,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
    ring.rotation.x = Math.PI / 2;
    this.scanRing.add(ring);

    // Faint scan disc inside the hoop
    const disc = new THREE.Mesh(
      new THREE.CircleGeometry(1.85, 64),
      new THREE.MeshBasicMaterial({
        color: 0x91a8c8,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide
      })
    );
    disc.rotation.x = -Math.PI / 2;
    this.scanRing.add(disc);

    this.scanRingMat = ring.material;
    this.scanDiscMat = disc.material;
    this.scanRing.visible = false;
    this.scene.add(this.scanRing);
  }

  /* ---------------- Scene interface ---------------- */

  setAgitation(amount) {
    this.agitation = amount;
    this.artifact.setAgitation(amount);
  }

  setSectionAnchors(anchors) {
    this.rig.setSectionAnchors(anchors);
  }

  /**
   * Case-row hover: ignite the matching fragment
   */
  setHighlight(index, on) {
    this.artifact.setHighlight(index, on);
  }

  /**
   * Case examined: permanently scar the fragment
   */
  setMark(index, instant = false) {
    this.artifact.setScar(index, instant);
  }

  /**
   * @param {number} deltaTime
   * @param {number} progress - smoothed global scroll progress 0..1
   * @param {THREE.Vector2} mouse - normalized mouse (-1..1)
   */
  update(deltaTime, progress, mouse) {
    // During full dissection (section 2) the camera slowly orbits the
    // exploded specimen instead of holding still
    const preT = this.rig.progressToCurveT(progress);
    const u = preT * (CAMERA_KEYS.length - 1);
    const orbitWeight = Math.max(0, 1 - Math.abs(u - 2));
    const orbitAngle = orbitWeight * Math.sin(this.artifact.time * 0.07) * 0.5;

    const t = this.rig.update(progress, mouse, orbitAngle);

    // Dissection + payload exposure follow the same anchor mapping
    const explode = keyLerp(this.explodeKeys, t);
    this.artifact.setExplode(explode);
    this.artifact.setPayloadGlow(keyLerp(this.payloadKeys, t));

    // Scan sweep: active through the Specimen section (u in 0.5..1.5),
    // the hoop travels bottom-to-top as the visitor scrolls through it
    const scanPhase = Math.min(1, Math.max(0, u - 0.45) / 1.0);
    const scanActive = u > 0.45 && u < 1.55;
    const scanIntensity = scanActive
      ? Math.min(1, Math.min((u - 0.45) / 0.15, (1.55 - u) / 0.15))
      : 0;
    const scanY = -1.5 + scanPhase * 3.1 + Math.sin(this.artifact.time * 0.8) * 0.04;

    this.artifact.setScan(scanY, scanIntensity);
    if (this.scanRing) {
      this.scanRing.visible = scanIntensity > 0.01;
      this.scanRing.position.y = scanY + this.artifact.group.position.y;
      this.scanRingMat.opacity = scanIntensity * 0.55;
      this.scanDiscMat.opacity = scanIntensity * 0.05;
      this.scanRing.rotation.y = this.artifact.time * 0.3;
    }

    // The specimen's shadow loosens as it comes apart
    if (this.shadowBlob) {
      this.shadowBlob.material.opacity = 1 - explode * 0.55;
      const s = 1 + explode * 0.5;
      this.shadowBlob.scale.set(s, s, 1);
    }

    this.artifact.setDecay(AppState.getDecayLevel());
    this.artifact.update(deltaTime);

    if (this.shaft) this.shaft.material.uniforms.time.value += deltaTime;

    this.dust.update();
  }

  getScene() {
    return this.scene;
  }

  dispose() {
    this.artifact.dispose();
    this.scene.traverse((obj) => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material && obj.material.dispose) obj.material.dispose();
    });
  }
}
