import * as THREE from 'three';
import { MODE_COUNT } from './plate.js';

/**
 * Sand — GPGPU grains on the vibrating plate.
 *
 * Three passes per sim step, all full-screen quads:
 *   field  256² — evaluates the complex modal sum once per texel:
 *                 r = |A| (displacement amplitude), gb = ∇|A|²
 *   vel    grains — a grounded grain launches only when the local plate
 *                 acceleration out-pulls gravity (|A|·drive > 1 g), with a
 *                 random kick and a slight bias down the amplitude slope;
 *                 airborne grains fall ballistically
 *   pos    grains — integrate, land, bounce off the rim
 * Grains on a node never feel enough acceleration to leave, so they pile
 * into the nodal lines: the Chladni figure is emergent, never targeted.
 */

const QUAD_VERT = 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';

const HASH = /* glsl */ `
  float hash12(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }
  vec2 hash22(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.xx + p3.yz) * p3.zy);
  }
`;

const FIELD_FRAG = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform vec2 uW[${MODE_COUNT}];
  const float PI = 3.14159265;

  void main() {
    float cu[9], su[9], cv[9], sv[9];
    for (int m = 0; m < 9; m++) {
      float fm = float(m) * PI;
      cu[m] = cos(fm * vUv.x); su[m] = sin(fm * vUv.x);
      cv[m] = cos(fm * vUv.y); sv[m] = sin(fm * vUv.y);
    }
    vec2 A = vec2(0.0), Au = vec2(0.0), Av = vec2(0.0);
    for (int m = 0; m < 9; m++) {
      for (int n = 0; n < 9; n++) {
        vec2 w = uW[m * 9 + n];
        A  += w * (cu[m] * cv[n]);
        Au += w * (-float(m) * PI * su[m] * cv[n]);
        Av += w * (-float(n) * PI * cu[m] * sv[n]);
      }
    }
    // ∇|A|² = 2 Re(conj(A) ∇A)
    gl_FragColor = vec4(length(A), 2.0 * dot(A, Au), 2.0 * dot(A, Av), 1.0);
  }
`;

const VEL_FRAG = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uPos;
  uniform sampler2D uVel;
  uniform sampler2D uField;
  uniform float uDrive;    // amplitude → plate acceleration in g
  uniform float uDt;
  uniform float uTime;
  uniform float uHold;     // 1 = frozen (tumbler set), grains stay put
  uniform float uScatter;  // one-shot shake that redistributes everything
  ${HASH}

  const float GRAVITY = 7.5;

  void main() {
    vec4 P = texture2D(uPos, vUv);
    vec4 V = texture2D(uVel, vUv);
    vec4 F = texture2D(uField, P.xy);

    float acc = F.r * uDrive * (1.0 - uHold);
    bool grounded = P.z <= 0.0;
    vec2 r = hash22(vUv * 1731.0 + fract(uTime * 13.17) * 97.0);

    if (grounded) {
      float excess = acc - 1.0;
      if (uScatter > 0.0) {
        float a = r.x * 6.2831853;
        V.xy = vec2(cos(a), sin(a)) * (0.1 + 0.3 * r.y) * uScatter;
        V.z = (0.25 + 0.3 * fract(r.y * 5.31)) * uScatter;
      } else if (excess > 0.0) {
        // bounce: a random scatter plus a bias down the amplitude slope —
        // a grain lands a little nearer the node more often than not
        float e = min(sqrt(excess), 2.4);
        float a = r.x * 6.2831853;
        vec2 slope = F.gb;
        float sl = length(slope);
        vec2 downhill = sl > 1e-4 ? -slope / sl * min(sl * 0.15, 1.0) : vec2(0.0);
        V.xy = vec2(cos(a), sin(a)) * e * (0.015 + 0.035 * r.y) + downhill * (0.12 + 0.1 * e) * (0.8 + 0.4 * fract(r.y * 3.7));
        V.z = e * (0.1 + 0.14 * fract(r.y * 7.13));
      } else if (acc > 0.12) {
        // below launch, a buzzing surface still ratchets grains downhill:
        // this is what collapses the still band onto one crisp nodal line
        vec2 slope = F.gb;
        float sl = length(slope);
        V.xy = sl > 1e-4 ? -slope / sl * (acc - 0.12) * 0.05 : vec2(0.0);
        V.z = 0.0;
      } else {
        V = vec4(0.0);
      }
    } else {
      V.z -= GRAVITY * uDt;
      V.xy *= 1.0 - 1.5 * uDt;
    }
    gl_FragColor = V;
  }
`;

const POS_FRAG = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uPos;
  uniform sampler2D uVel;
  uniform float uDt;

  void main() {
    vec4 P = texture2D(uPos, vUv);
    vec4 V = texture2D(uVel, vUv);
    P.xyz += V.xyz * uDt;
    P.z = max(P.z, 0.0);
    // the plate has a rim: reflect back inside
    P.xy = 1.0 - abs(1.0 - abs(P.xy));
    P.xy = clamp(P.xy, 0.002, 0.998);
    gl_FragColor = P;
  }
`;

const POINT_VERT = /* glsl */ `
  attribute vec2 ref;
  uniform sampler2D uPos;
  uniform sampler2D uField;
  uniform float uSize;
  uniform float uDist;
  uniform float uHop;
  uniform float uPeak;
  varying float vAir;
  varying float vNode;
  varying float vSeed;

  void main() {
    vec4 P = texture2D(uPos, ref);
    float amp = texture2D(uField, P.xy).r;
    vAir = clamp(P.z * 60.0, 0.0, 1.0);
    vNode = 1.0 - clamp(amp / max(uPeak, 1e-3) * 5.0, 0.0, 1.0);
    vSeed = P.w;
    vec3 world = vec3((P.xy - 0.5) * 2.0, P.z * uHop);
    vec4 mv = modelViewMatrix * vec4(world, 1.0);
    gl_PointSize = uSize * (0.75 + 0.5 * fract(P.w * 17.3) + vAir * 0.4) * (uDist / -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;

const POINT_FRAG = /* glsl */ `
  precision highp float;
  uniform vec3 uAccent;
  uniform float uLock;     // 0..1 glow of a set tumbler
  uniform float uGain;
  varying float vAir;
  varying float vNode;
  varying float vSeed;

  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    if (d > 0.5) discard;
    // quartz sand: bone with a few darker and a few glinting grains
    float tone = fract(vSeed * 91.7);
    vec3 sand = mix(vec3(0.34, 0.31, 0.27), vec3(0.86, 0.82, 0.74), tone);
    sand *= 0.8 + 0.6 * vAir;
    vec3 col = mix(sand, uAccent * uAccent * 2.2 + 0.08, uLock * vNode);
    float a = (1.0 - d * 2.0) * uGain * (0.7 + 0.5 * vAir);
    gl_FragColor = vec4(col * a, a);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export default class Sand {
  constructor(renderer, quality) {
    this.renderer = renderer;
    const side = quality.isMobile ? 208 : 320;
    this.simW = side;
    this.simH = side;
    this.count = side * side;
    this.weights = new Float32Array(MODE_COUNT * 2);

    const floatOK = renderer.capabilities.isWebGL2 && renderer.extensions.has('EXT_color_buffer_float');
    const simOpts = {
      type: floatOK ? THREE.FloatType : THREE.HalfFloatType,
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      depthBuffer: false,
      stencilBuffer: false
    };
    this.pos = [new THREE.WebGLRenderTarget(side, side, simOpts), new THREE.WebGLRenderTarget(side, side, simOpts)];
    this.vel = [new THREE.WebGLRenderTarget(side, side, simOpts), new THREE.WebGLRenderTarget(side, side, simOpts)];
    this.field = new THREE.WebGLRenderTarget(256, 256, {
      type: THREE.HalfFloatType,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      wrapS: THREE.ClampToEdgeWrapping,
      wrapT: THREE.ClampToEdgeWrapping,
      depthBuffer: false,
      stencilBuffer: false
    });

    this.quadCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
    this.quadScene = new THREE.Scene();
    this.quadScene.add(this.quad);

    this.fieldMat = new THREE.ShaderMaterial({
      uniforms: { uW: { value: this.weights } },
      vertexShader: QUAD_VERT,
      fragmentShader: FIELD_FRAG
    });
    this.velMat = new THREE.ShaderMaterial({
      uniforms: {
        uPos: { value: null }, uVel: { value: null }, uField: { value: this.field.texture },
        uDrive: { value: 1 }, uDt: { value: 1 / 120 }, uTime: { value: 0 },
        uHold: { value: 0 }, uScatter: { value: 0 }
      },
      vertexShader: QUAD_VERT,
      fragmentShader: VEL_FRAG
    });
    this.posMat = new THREE.ShaderMaterial({
      uniforms: { uPos: { value: null }, uVel: { value: null }, uDt: { value: 1 / 120 } },
      vertexShader: QUAD_VERT,
      fragmentShader: POS_FRAG
    });

    this.seed();
    this.buildPoints(quality);
  }

  seed() {
    const data = new Float32Array(this.count * 4);
    for (let i = 0; i < this.count; i++) {
      data[i * 4] = Math.random();
      data[i * 4 + 1] = Math.random();
      data[i * 4 + 2] = 0;
      data[i * 4 + 3] = Math.random();
    }
    const tex = new THREE.DataTexture(data, this.simW, this.simH, THREE.RGBAFormat, THREE.FloatType);
    tex.needsUpdate = true;
    const copy = new THREE.ShaderMaterial({
      uniforms: { t: { value: tex } },
      vertexShader: QUAD_VERT,
      fragmentShader: 'uniform sampler2D t; varying vec2 vUv; void main() { gl_FragColor = texture2D(t, vUv); }'
    });
    const zero = new THREE.ShaderMaterial({
      vertexShader: QUAD_VERT,
      fragmentShader: 'void main() { gl_FragColor = vec4(0.0); }'
    });
    this.pass(copy, this.pos[0]);
    this.pass(copy, this.pos[1]);
    this.pass(zero, this.vel[0]);
    this.pass(zero, this.vel[1]);
    copy.dispose();
    zero.dispose();
    tex.dispose();
  }

  buildPoints(quality) {
    const refs = new Float32Array(this.count * 2);
    for (let i = 0; i < this.count; i++) {
      refs[i * 2] = ((i % this.simW) + 0.5) / this.simW;
      refs[i * 2 + 1] = (Math.floor(i / this.simW) + 0.5) / this.simH;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(this.count * 3), 3));
    geo.setAttribute('ref', new THREE.BufferAttribute(refs, 2));

    this.pointsMat = new THREE.ShaderMaterial({
      uniforms: {
        uPos: { value: this.pos[0].texture },
        uField: { value: this.field.texture },
        uSize: { value: 1.6 },
        uDist: { value: 6 },
        uHop: { value: quality.reducedMotion ? 0.8 : 2.4 },
        uPeak: { value: 1 },
        uAccent: { value: new THREE.Vector3(0.2, 0.7, 0.77) },
        uLock: { value: 0 },
        uGain: { value: quality.isMobile ? 0.55 : 0.42 }
      },
      vertexShader: POINT_VERT,
      fragmentShader: POINT_FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.CustomBlending,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneMinusSrcAlphaFactor
    });
    this.points = new THREE.Points(geo, this.pointsMat);
    this.points.frustumCulled = false;
    this.points.renderOrder = 2;
  }

  pass(material, target) {
    this.quad.material = material;
    this.renderer.setRenderTarget(target);
    this.renderer.render(this.quadScene, this.quadCamera);
  }

  /** Upload modal weights and re-evaluate the plate field. */
  setWeights(weights) {
    this.weights.set(weights);
    this.pass(this.fieldMat, this.field);
    this.renderer.setRenderTarget(null);
  }

  step(dt, time, { drive, hold, scatter }) {
    const v = this.velMat.uniforms;
    v.uDrive.value = drive;
    v.uHold.value = hold;
    v.uScatter.value = scatter;
    v.uDt.value = dt;
    v.uTime.value = time;
    v.uPos.value = this.pos[0].texture;
    v.uVel.value = this.vel[0].texture;
    this.pass(this.velMat, this.vel[1]);
    this.vel.reverse();

    const p = this.posMat.uniforms;
    p.uDt.value = dt;
    p.uPos.value = this.pos[0].texture;
    p.uVel.value = this.vel[0].texture;
    this.pass(this.posMat, this.pos[1]);
    this.pos.reverse();

    this.renderer.setRenderTarget(null);
    this.pointsMat.uniforms.uPos.value = this.pos[0].texture;
  }

  dispose() {
    [...this.pos, ...this.vel, this.field].forEach((rt) => rt.dispose());
    [this.fieldMat, this.velMat, this.posMat, this.pointsMat].forEach((m) => m.dispose());
    this.quad.geometry.dispose();
    this.points.geometry.dispose();
  }
}
