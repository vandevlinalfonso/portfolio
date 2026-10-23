import * as THREE from 'three';

/**
 * Blackhole — ray-marched null geodesics, not a screen-space trick.
 *
 * Every pixel fires a photon backwards through curved spacetime
 * (Schwarzschild, geometric units: horizon at r = 1) using the conserved
 * angular momentum form  a = -1.5 h² p / r⁵. Rays that spiral inside the
 * horizon stay black; rays that cross the equatorial plane pick up
 * emission from a Keplerian accretion disk — differentially rotating,
 * doppler-beamed (g³) so the approaching limb burns white — and rays
 * that escape sample a dim starfield, already lensed by the journey.
 * The photon ring, the over/under light wrap, and the shadow all emerge
 * from the integration instead of being painted.
 *
 * Cursor orbits the camera, scroll tilts toward/away from the disk
 * plane, click drops matter in (accretion surge from the inner edge).
 */
export default class Blackhole {
  constructor(host, quality) {
    this.renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
    this.renderer.setSize(innerWidth, innerHeight);
    // geodesic marching is heavy: cap the internal resolution
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, quality.isMobile ? 1.0 : 1.4));
    host.appendChild(this.renderer.domElement);

    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.scene = new THREE.Scene();

    this.flare = 0;
    this.shake = 0;
    this.tilt = 0.17;            // camera height above disk plane (radians-ish)
    this.orbit = new THREE.Vector2(0, 0);
    this.orbitTarget = new THREE.Vector2(0, 0);

    const STEPS = quality.isMobile ? 96 : 140;

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        aspect: { value: innerWidth / innerHeight },
        orbit: { value: this.orbit },
        tilt: { value: this.tilt },
        flare: { value: 0 },
        shake: { value: 0 }
      },
      vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position, 1.0); }',
      fragmentShader: `
        precision highp float;

        uniform float time;
        uniform float aspect;
        uniform vec2 orbit;
        uniform float tilt;
        uniform float flare;
        uniform float shake;
        varying vec2 vUv;

        #define STEPS ${STEPS}
        #define R_IN 2.2
        #define R_OUT 6.8

        float hash21(vec2 p) {
          p = fract(p * vec2(234.34, 435.345));
          p += dot(p, p + 34.23);
          return fract(p.x * p.y);
        }

        float noise2(vec2 p) {
          vec2 i = floor(p), f = fract(p);
          vec2 u = f * f * (3.0 - 2.0 * f);
          return mix(mix(hash21(i), hash21(i + vec2(1, 0)), u.x),
                     mix(hash21(i + vec2(0, 1)), hash21(i + vec2(1, 1)), u.x), u.y);
        }

        float fbm(vec2 p) {
          float v = 0.0, a = 0.5;
          for (int i = 0; i < 4; i++) {
            v += a * noise2(p);
            p = p * 2.13 + 19.7;
            a *= 0.5;
          }
          return v;
        }

        // Sparse cold starfield sampled by escape direction
        // (octahedral mapping: no pole stretch, no streak artifacts)
        vec3 sky(vec3 v) {
          vec3 n = v / (abs(v.x) + abs(v.y) + abs(v.z));
          vec2 uv = n.y >= 0.0 ? n.xz : (1.0 - abs(n.zx)) * sign(n.xz);
          uv = uv * 2.0 + 17.3;
          vec3 col = vec3(0.0);
          for (int l = 0; l < 2; l++) {
            float scale = l == 0 ? 22.0 : 52.0;
            vec2 g = uv * scale + float(l) * 37.0;
            vec2 id = floor(g);
            vec2 f = fract(g) - 0.5;
            float h = hash21(id);
            vec2 off = vec2(fract(h * 71.3), fract(h * 31.7)) - 0.5;
            float d = length(f - off * 0.85);
            float tw = 0.65 + 0.35 * sin(time * (0.6 + h * 2.4) + h * 43.0);
            float star = smoothstep(0.06, 0.0, d) * step(0.93, h) * tw;
            col += mix(vec3(0.75, 0.82, 1.0), vec3(1.0, 0.88, 0.75), fract(h * 7.0))
                   * star * (l == 0 ? 0.9 : 0.45);
          }
          // the faintest breath of a galactic band — darkness should win
          float band = exp(-v.y * v.y * 14.0);
          col += vec3(0.04, 0.045, 0.075) * band * fbm(v.xz * 4.0);
          return col;
        }

        // Disk emission where a geodesic pierces the equatorial plane
        vec3 diskEmit(vec3 q, vec3 rd, float boost, out float alpha) {
          float rr = length(q.xz);
          // differential (Keplerian) rotation: rotate the sample frame
          float w = 2.6 / pow(rr, 1.5);
          float ca = cos(w * time), sa = sin(w * time);
          vec2 rq = mat2(ca, -sa, sa, ca) * q.xz;
          float n = fbm(rq * vec2(1.7, 1.7));
          float fil = fbm(vec2(rr * 6.0, atan(rq.y, rq.x) * 3.0));
          n = n * 0.65 + fil * 0.35;

          float density = smoothstep(R_IN, R_IN + 0.4, rr)
                        * smoothstep(R_OUT, R_OUT - 2.2, rr)
                        * (0.18 + 0.82 * smoothstep(0.34, 0.8, n));

          // white-hot rim where matter is about to fall in
          float rim = smoothstep(R_IN + 1.0, R_IN, rr);
          density += rim * 0.5 + flare * rim * 1.2;

          // doppler beaming: g = 1 / (1 - beta . n), brightness ~ g^3
          vec3 tang = normalize(vec3(-q.z, 0.0, q.x));
          float beta = min(0.62, 0.85 / sqrt(max(rr, 1.4)));
          float g = 1.0 / max(1.0 - beta * dot(tang, -rd), 0.3);
          float g3 = g * g * g;

          // temperature: white-hot inner edge cooling to molten amber
          float tgrad = smoothstep(R_IN, R_OUT * 0.55, rr);
          vec3 tcol = mix(vec3(1.12, 1.02, 0.85), vec3(1.0, 0.5, 0.14), tgrad);
          // blue-shift the approaching limb
          tcol = mix(tcol, vec3(0.8, 0.88, 1.08), clamp((g - 1.0) * 1.4, 0.0, 0.5));

          float radial = 1.0 / (0.3 * pow(rr, 1.7));
          float bright = density * radial * g3 * (0.5 + 0.5 * n) * boost;

          alpha = clamp(density * 0.85, 0.0, 1.0);
          return tcol * bright;
        }

        void main() {
          vec2 uv = (vUv - 0.5) * vec2(aspect, 1.0);

          // camera on an orbit rail, almost in the disk plane
          float yaw = orbit.x;
          float pitch = tilt + orbit.y;
          float dist = 17.0;
          vec3 ro = vec3(sin(yaw) * cos(pitch), sin(pitch), -cos(yaw) * cos(pitch)) * dist;

          // feed shake
          ro.xy += (vec2(noise2(vec2(time * 9.0, 3.7)), noise2(vec2(1.3, time * 8.0))) - 0.5) * shake * 0.7;

          vec3 fwd = normalize(-ro);
          vec3 rgt = normalize(cross(fwd, vec3(0.0, 1.0, 0.0)));
          vec3 up = cross(rgt, fwd);
          // keep the whole structure in frame on portrait screens
          float focal = 1.9 * min(1.0, aspect / 1.5);
          vec3 rd = normalize(fwd * focal + rgt * uv.x + up * uv.y);

          // conserved angular momentum of the photon
          vec3 h = cross(ro, rd);
          float h2 = dot(h, h);

          vec3 p = ro;
          vec3 v = rd;
          vec3 col = vec3(0.0);
          float T = 1.0;              // transmittance through the disk
          float boost = 1.0 + flare * 1.1;
          bool captured = false;

          for (int i = 0; i < STEPS; i++) {
            float r2 = dot(p, p);
            float r = sqrt(r2);

            if (r < 1.0) { captured = true; break; }
            if (r2 > 420.0 && dot(p, v) > 0.0) break;

            // adaptive step: creep near the photon sphere, stride far out
            // (bending ~ 1/r^5, so long far steps cost no accuracy and the
            // step budget reaches the lensed far side of the disk)
            float dt = clamp(0.06 * (r - 0.6), 0.04, 0.8);

            vec3 a = -1.5 * h2 * p / (r2 * r2 * r);
            vec3 pn = p + v * dt + 0.5 * a * dt * dt;

            // equatorial plane crossing → disk sample
            if (p.y * pn.y < 0.0) {
              float f = p.y / (p.y - pn.y);
              vec3 q = mix(p, pn, f);
              float rr = length(q.xz);
              if (rr > R_IN * 0.92 && rr < R_OUT) {
                float alpha;
                vec3 e = diskEmit(q, normalize(v), boost, alpha);
                col += T * e;
                T *= 1.0 - alpha * 0.82;
                if (T < 0.02) break;
              }
            }

            v += a * dt;
            p = pn;
          }

          if (!captured && T > 0.02) {
            col += T * sky(normalize(v));
          }

          // ACES-ish tonemap — keeps the core blinding without clipping ugly
          col *= 0.8 * vec3(1.06, 0.98, 0.88);
          col = (col * (2.51 * col + 0.03)) / (col * (2.43 * col + 0.59) + 0.14);

          // vignette + grain: the void presses in
          float vig = smoothstep(1.3, 0.4, length(vUv - 0.5) * 1.6);
          col *= mix(0.42, 1.0, vig);
          col += (hash21(vUv * vec2(913.0, 717.0) + fract(time)) - 0.5) * 0.025;

          gl_FragColor = vec4(col, 1.0);
        }
      `
    });

    this.scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.material));
  }

  click() {
    this.flare = 1.4;
    this.shake = 1.0;
  }

  wheel(deltaY) {
    this.tilt = THREE.MathUtils.clamp(this.tilt + deltaY * 0.00045, 0.05, 0.7);
  }

  update(dt, time, pointer) {
    // cursor steers the orbit rail, slowly — a heavy thing to move around
    this.orbitTarget.set(
      (pointer.x / innerWidth - 0.5) * 1.1,
      -(pointer.y / innerHeight - 0.5) * 0.22
    );
    this.orbit.lerp(this.orbitTarget, 0.016);
    this.flare = Math.max(0, this.flare - dt * 0.55);
    this.shake = Math.max(0, this.shake - dt * 2.4);

    const u = this.material.uniforms;
    u.time.value = time;
    u.aspect.value = innerWidth / innerHeight;
    u.flare.value = this.flare;
    u.shake.value = this.shake;
    u.tilt.value += (this.tilt - u.tilt.value) * 0.05;

    this.renderer.render(this.scene, this.camera);
  }

  resize(w, h) {
    this.renderer.setSize(w, h);
  }

  dispose() {
    this.material.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
