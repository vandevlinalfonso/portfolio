import * as THREE from 'three';
import PostProcessing from '../systems/PostProcessing.js';
import Sand from './sand.js';

/**
 * Stage — the instrument on the bench.
 *
 * A square steel plate, center-bolted like a lab Chladni plate, seen from
 * a low three-quarter angle. The plate shader is brushed steel under a
 * soft key light; where the field is loud the surface hazes with
 * vibration, so the antinodes read even before the sand arrives. The
 * transducer puck marks the drive point. Grains come from Sand.
 */

const PLATE_VERT = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vWorld;
  void main() {
    vUv = uv;
    vec4 w = modelMatrix * vec4(position, 1.0);
    vWorld = w.xyz;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;

const PLATE_FRAG = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  varying vec3 vWorld;
  uniform sampler2D uField;
  uniform float uPeak;
  uniform float uTime;
  uniform vec3 uAccent;
  uniform vec3 uCam;
  uniform vec2 uDrive;
  uniform float uDriveOn;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
  }

  void main() {
    vec2 uv = vUv;
    // brushed steel: long anisotropic streaks along u
    float brush = noise(vec2(uv.x * 3.0, uv.y * 900.0)) * 0.6 + noise(vec2(uv.x * 11.0, uv.y * 2400.0)) * 0.4;
    // (linear light: the output pass tonemaps + encodes)
    vec3 base = vec3(0.011, 0.012, 0.0145) * (0.8 + 0.4 * brush);

    // soft key light as a broad specular band that shifts with the viewer
    vec3 N = vec3(0.0, 0.0, 1.0);
    vec3 V = normalize(uCam - vWorld);
    vec3 L = normalize(vec3(-0.6, 0.9, 1.4));
    vec3 H = normalize(L + V);
    float spec = pow(max(dot(N, H), 0.0), 60.0) * (0.5 + 0.5 * brush);
    base += vec3(0.07, 0.074, 0.084) * spec;
    base += vec3(0.004, 0.0045, 0.005) * pow(1.0 - max(dot(N, V), 0.0), 3.0);

    // vibration haze where the plate is loud
    float amp = texture2D(uField, uv).r / max(uPeak, 1e-3);
    float shimmer = 0.5 + 0.5 * sin(uTime * 41.0 + uv.x * 60.0 + uv.y * 47.0);
    base += vec3(0.004, 0.0044, 0.005) * smoothstep(0.45, 1.0, amp) * (0.5 + 0.5 * shimmer);

    // bevelled rim + engraved edge ticks (instrument feel)
    vec2 e = min(uv, 1.0 - uv);
    float edge = min(e.x, e.y);
    base += vec3(0.05) * smoothstep(0.006, 0.0, edge);
    base *= mix(0.55, 1.0, smoothstep(0.0, 0.03, edge));
    float tickU = step(0.94, fract(uv.x * 16.0 + 0.03)) * step(edge, 0.018) * step(e.y, 0.018);
    float tickV = step(0.94, fract(uv.y * 16.0 + 0.03)) * step(edge, 0.018) * step(e.x, 0.018);
    base += vec3(0.012) * max(tickU, tickV);

    // center bolt
    float r = length(uv - 0.5);
    float bolt = smoothstep(0.022, 0.018, r);
    base = mix(base, vec3(0.016, 0.017, 0.019) + spec * 0.08, bolt);
    base += vec3(0.02) * smoothstep(0.003, 0.0, abs(r - 0.021));

    // transducer puck
    float pd = length(uv - uDrive);
    float ring = smoothstep(0.004, 0.0, abs(pd - 0.028)) + 0.5 * smoothstep(0.003, 0.0, abs(pd - 0.012));
    float pulse = 0.6 + 0.4 * sin(uTime * 6.0);
    base += uAccent * uAccent * ring * uDriveOn * pulse * 0.8;

    gl_FragColor = vec4(base, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export default class Stage {
  constructor(host, quality) {
    this.quality = quality;
    this.renderer = new THREE.WebGLRenderer({ antialias: !quality.postProcessing, powerPreference: 'high-performance' });
    this.dpr = Math.min(devicePixelRatio, quality.maxPixelRatio);
    this.renderer.setPixelRatio(this.dpr);
    this.renderer.setSize(innerWidth, innerHeight);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    host.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x070708);
    this.camera = new THREE.PerspectiveCamera(30, innerWidth / innerHeight, 0.1, 50);
    this.look = new THREE.Vector3(0, 0, 0);
    this.parallax = new THREE.Vector2();
    // framing offset in screen-fractions: the plate steps aside for the intro
    this.frame = { x: 0, y: 0, zoom: 1 };
    this.frameGoal = { x: 0, y: 0, zoom: 1 };

    this.sand = new Sand(this.renderer, quality);

    this.plateUniforms = {
      uField: { value: this.sand.field.texture },
      uPeak: { value: 1 },
      uTime: { value: 0 },
      uAccent: { value: new THREE.Vector3(0.2, 0.7, 0.77) },
      uCam: { value: new THREE.Vector3() },
      uDrive: { value: new THREE.Vector2(0.5, 0.5) },
      uDriveOn: { value: 0 }
    };
    this.plate = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      new THREE.ShaderMaterial({ uniforms: this.plateUniforms, vertexShader: PLATE_VERT, fragmentShader: PLATE_FRAG })
    );
    this.plate.renderOrder = 1;
    this.scene.add(this.plate);
    // grains sit a hair above the plate so they never z-fight it
    this.sand.points.position.z = 0.002;
    this.scene.add(this.sand.points);

    if (quality.postProcessing) this.post = new PostProcessing(this.renderer, this.camera);

    this.raycaster = new THREE.Raycaster();
    this.ndc = new THREE.Vector2();
    this.planeZ = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    this.hit = new THREE.Vector3();

    this.resize(innerWidth, innerHeight);
  }

  setAccent(vec3) {
    this.plateUniforms.uAccent.value.set(...vec3);
    this.sand.pointsMat.uniforms.uAccent.value.set(...vec3);
  }

  /** Screen px → plate uv (null when off the plate). */
  pick(x, y, clampToPlate = false) {
    this.ndc.set((x / innerWidth) * 2 - 1, -(y / innerHeight) * 2 + 1);
    this.raycaster.setFromCamera(this.ndc, this.camera);
    if (!this.raycaster.ray.intersectPlane(this.planeZ, this.hit)) return null;
    let u = (this.hit.x + 1) / 2;
    let v = (this.hit.y + 1) / 2;
    const inside = u >= 0 && u <= 1 && v >= 0 && v <= 1;
    if (!inside && !clampToPlate) return null;
    u = Math.min(0.985, Math.max(0.015, u));
    v = Math.min(0.985, Math.max(0.015, v));
    return { u, v };
  }

  /** Plate uv → screen px (for HUD anchoring). */
  project(u, v) {
    const p = new THREE.Vector3(u * 2 - 1, v * 2 - 1, 0).project(this.camera);
    return { x: (p.x + 1) / 2 * innerWidth, y: (1 - p.y) / 2 * innerHeight };
  }

  resize(w, h) {
    this.renderer.setSize(w, h);
    this.post?.resize(w, h);
    this.camera.aspect = w / h;
    // Fit the plate: leave room for the tuning rail below and HUD above,
    // and on portrait screens let the width decide.
    this.portrait = w / h < 0.9;
    const fill = this.portrait ? 0.88 : 0.6;
    const halfFov = THREE.MathUtils.degToRad(this.camera.fov / 2);
    const limitH = 1 / (Math.tan(halfFov) * fill);
    const limitW = limitH / Math.min(1, this.camera.aspect);
    this.baseDist = this.portrait ? limitW : limitH;
    this.camera.updateProjectionMatrix();
    this.sand.pointsMat.uniforms.uSize.value = this.dpr * Math.min(1.5, Math.max(1.05, h / 760));
    this.place();
  }

  /** Where the plate sits on screen: x/y as fractions of the view, zoom < 1 = smaller. */
  setFraming(x, y, zoom = 1) {
    this.frameGoal = { x, y, zoom };
  }

  place() {
    const tilt = 0.5; // radians away from straight-down
    const d = this.baseDist / this.frame.zoom;
    this.dist = d;
    const halfH = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)) * d;
    const halfW = halfH * this.camera.aspect;
    // shifting the look point moves the plate the opposite way on screen
    const ox = -this.frame.x * halfW * 2;
    const oy = -this.frame.y * halfH * 2 - 0.08;
    this.camera.position.set(
      ox + this.parallax.x * 0.35,
      oy - Math.sin(tilt) * d + this.parallax.y * 0.2,
      Math.cos(tilt) * d
    );
    this.look.set(ox, oy, 0);
    this.camera.lookAt(this.look);
    this.plateUniforms.uCam.value.copy(this.camera.position);
    this.sand.pointsMat.uniforms.uDist.value = d;
  }

  render(dt, time, { peak, drive, driveOn, lock }) {
    this.plateUniforms.uTime.value = time;
    this.plateUniforms.uPeak.value = peak;
    this.plateUniforms.uDrive.value.set(drive.u, drive.v);
    this.plateUniforms.uDriveOn.value = driveOn;
    const pu = this.sand.pointsMat.uniforms;
    pu.uPeak.value = peak;
    pu.uLock.value = lock;
    const k = Math.min(1, dt * 2.2);
    this.frame.x += (this.frameGoal.x - this.frame.x) * k;
    this.frame.y += (this.frameGoal.y - this.frame.y) * k;
    this.frame.zoom += (this.frameGoal.zoom - this.frame.zoom) * k;
    this.place();
    if (this.post) this.post.render(dt, this.scene);
    else this.renderer.render(this.scene, this.camera);
  }

  glitch(strength) {
    this.post?.triggerGlitch(strength);
  }

  dispose() {
    this.sand.dispose();
    this.plate.geometry.dispose();
    this.plate.material.dispose();
    this.post?.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
