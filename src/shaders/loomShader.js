import * as THREE from 'three';

/**
 * The Cinematic Loom — a full-screen ray-marched volumetric shader,
 * built in the same rendering language as src/lab/Blackhole.js.
 *
 * One continuous volumetric river: chaotic filaments stream in from the
 * void through a narrowing funnel — the SAME matter visibly compressing,
 * straightening, heating — pass the machined aperture ring, and exit as
 * a tight braided beam. The machine is a signed-distance field with
 * domain-repeated machined detail; it OCCLUDES the flow behind it and
 * bleeds light at its edges. The throat burns HDR-hot and is tamed by an
 * ACES tonemap, exactly the Blackhole's trick.
 *
 * Scroll-driven machine states arrive as uniforms:
 *   iris      0 closed eye .. 1 wide open (inner shutter + core gate)
 *   spread    detail rings telescope along the axis into a corridor
 *   fracture  mechanical disassembly — the machine comes apart along its
 *             real component seams (exploded view), then reseats
 *
 * Per-sector interaction (index-aligned with the discipline rows):
 *   highlight[5]  hover — sector glow + its slice of the river ignites
 *   markArr[5]    examined — a seal arc burns permanently on that shard
 *
 * Rejection: fault uniforms tint one angular filament red; at the cut it
 * convulses, is deflected at the rim, and bursts — never crossing the
 * gate.
 */

export function createLoomUniforms(palette) {
  const c = (v) => new THREE.Color(v);
  return {
    time: { value: 0 },
    aspect: { value: 1 },
    camPos: { value: new THREE.Vector3(0, 0, 6) },
    camRight: { value: new THREE.Vector3(1, 0, 0) },
    camUp: { value: new THREE.Vector3(0, 1, 0) },
    camFwd: { value: new THREE.Vector3(0, 0, -1) },

    iris: { value: 0.3 },
    spread: { value: 0 },
    fracture: { value: 0 },
    cov: { value: 0 },
    motionAmp: { value: 1 },

    highlight: { value: [0, 0, 0, 0, 0] },
    markArr: { value: [0, 0, 0, 0, 0] },

    // (theta, flickerLevel, cutLevel, seed) — two concurrent faults max
    fault0: { value: new THREE.Vector4(0, 0, 0, 0) },
    fault1: { value: new THREE.Vector4(0, 0, 0, 0) },
    flareTheta: { value: 0 },
    flareAmt: { value: 0 },

    strandColor: { value: c(palette.strandColor) },
    ringColor: { value: c(palette.ringColor) },
    braidColor: { value: c(palette.braidColor) },
    coreColor: { value: c(palette.coreColor) },
    faultColor: { value: c(palette.faultColor) }
  };
}

export const loomVertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = position.xy * 0.5 + 0.5;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

export function makeLoomFragmentShader(steps) {
  return `
    precision highp float;

    #define STEPS ${steps}
    #define TAU 6.28318530718
    #define SECTOR 1.25663706144   // TAU / 5

    uniform float time;
    uniform float aspect;
    uniform vec3 camPos;
    uniform vec3 camRight;
    uniform vec3 camUp;
    uniform vec3 camFwd;

    uniform float iris;
    uniform float spread;
    uniform float fracture;
    uniform float cov;
    uniform float motionAmp;

    uniform float highlight[5];
    uniform float markArr[5];

    uniform vec4 fault0;
    uniform vec4 fault1;
    uniform float flareTheta;
    uniform float flareAmt;

    uniform vec3 strandColor;
    uniform vec3 ringColor;
    uniform vec3 braidColor;
    uniform vec3 coreColor;
    uniform vec3 faultColor;

    varying vec2 vUv;

    /* ------------- noise (ported from the Blackhole) ------------- */

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
      for (int i = 0; i < 3; i++) {
        v += a * noise2(p);
        p = p * 2.13 + 19.7;
        a *= 0.5;
      }
      return v;
    }

    /* ------------- sky: sparse cold starfield, teal void ------------- */

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
        float star = smoothstep(0.06, 0.0, d) * step(0.94, h) * tw;
        col += mix(vec3(0.7, 0.85, 1.0), vec3(0.85, 1.0, 0.95), fract(h * 7.0))
               * star * (l == 0 ? 0.55 : 0.3);
      }
      float band = exp(-v.y * v.y * 12.0);
      col += vec3(0.02, 0.035, 0.045) * band * fbm(v.xz * 4.0);
      return col;
    }

    /* ------------- the machine (SDF, machined detail) ------------- */

    float sdTorusZ(vec3 p, float R, float r) {
      vec2 q = vec2(length(p.xy) - R, p.z);
      return length(q) - r;
    }

    float sdBox(vec3 p, vec3 b) {
      vec3 q = abs(p) - b;
      return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
    }

    // n-fold angular block pattern: ~0 on segment bodies, 1 in the grooves
    float grooves(float th, float n) {
      return smoothstep(0.32, 0.5, abs(fract(th * n / TAU) - 0.5) * 2.0);
    }

    float hash1(float n) {
      return fract(sin(n * 17.13) * 437.58);
    }

    vec2 rot2(vec2 v, float a) {
      float c = cos(a), s = sin(a);
      return vec2(c * v.x - s * v.y, s * v.x + c * v.y);
    }

    // Distance to the machine. Also reports the angular sector (used for
    // per-discipline lighting: hover glow, seal arcs).
    //
    // 'fracture' DISASSEMBLES the machine along its real component seams —
    // an engineering exploded view: the front ring slides toward the
    // viewer, the heavy back ring recedes and tilts, the struts unclip and
    // drift outward, the shutter's petals separate, and the rim's teeth
    // individually loosen. No arbitrary break lines — the mechanism simply
    // comes undone, then reseats.
    float machineD(vec3 p, out float sid) {
      float thw = atan(p.y, p.x);
      sid = floor(mod(thw + TAU, TAU) / SECTOR);

      float f = fracture;
      float rxy = length(p.xy);

      // Cheap bounding proxy first: a slab-annulus around the assembly
      // (including full disassembly + telescoping). It also excludes the
      // interior hole, so rays looking through the ring at the core skip
      // all the machined-detail math below. max() underestimates the true
      // distance, so marching by it is conservative and safe.
      float irisRb = mix(0.16, 1.26, iris) - f * 0.3;
      float dz = abs(p.z + 0.03) - (0.72 + f * 1.55 + spread * 0.85);
      float dr = max(min(irisRb, 0.9) - rxy, rxy - (2.05 + f * 0.85));
      float dbound = max(dz, dr);
      if (dbound > 0.3) return dbound;

      float wob = f * 0.05 * sin(time * 0.4 * motionAmp);

      // One shared angular frame for every segment pattern (component
      // tilts are small enough that per-component angles aren't worth
      // the extra atan cost)
      float thn = mod(thw + TAU, TAU);

      // ---- Ring A: the main rim — the anchor. Its 48 teeth unclip. ----
      float segA = floor(thn * 48.0 / TAU);
      float hA = hash1(segA + 3.0);
      float ra = rxy + f * (hA - 0.5) * 0.24;
      float za = p.z + f * (fract(hA * 7.31) - 0.5) * 0.3 + wob * sin(segA);
      float dA = length(vec2(ra - 1.5, za)) - 0.075
               - 0.014 * (1.0 - grooves(thw, 48.0));

      // ---- Ring B: heavy back ring — recedes, tilts, blocks unclip ----
      vec3 qb = p;
      qb.x -= f * 0.2;
      qb.yz = rot2(qb.yz, f * 0.14);
      float segB = floor(thn * 20.0 / TAU);
      float hB = hash1(segB + 11.0);
      float rb = length(qb.xy) + f * (hB - 0.5) * 0.4;
      float zb = qb.z + 0.34 + spread * 0.7 + f * 1.35
               + f * (fract(hB * 5.7) - 0.5) * 0.25 + wob * sin(segB);
      float dB = length(vec2(rb - 1.85, zb)) - 0.095
               - 0.02 * (1.0 - grooves(thw, 20.0));

      // ---- Ring C: thin front ring — slides toward the viewer, rises ----
      vec3 qc = p;
      qc.y -= f * 0.15;
      qc.yz = rot2(qc.yz, -f * 0.10);
      float zc = qc.z - (0.3 + spread * 0.75 + f * 1.15) + wob;
      float dC = length(vec2(length(qc.xy) - 1.32, zc)) - 0.034
               - 0.005 * (1.0 - grooves(thw, 90.0));

      // ---- Struts: five radial bars — they detach and drift outward ----
      float hS = hash1(sid + 9.0);
      float a5 = (fract(thw * 5.0 / TAU + 0.5) - 0.5) * SECTOR
               + f * (hS - 0.5) * 0.2;
      vec3 ps = vec3(rxy - 1.66 - f * 0.75,
                     a5 * rxy,
                     p.z + 0.15 + spread * 0.3 - f * (fract(hS * 5.7) - 0.5) * 0.9);
      float dS = sdBox(ps, vec3(0.32, 0.048, 0.048));

      // ---- Iris shutter: slides forward, its 15 petals separate ----
      float pet = floor(thn * 15.0 / TAU);
      float hP = hash1(pet + 27.0);
      float rrP = rxy + f * (hP - 0.5) * 0.5;
      float saw = abs(fract(thw * 15.0 / TAU) - 0.5) * 2.0;
      float irisR = mix(0.16, 1.26, iris) + saw * 0.1 * (1.0 - iris);
      float dPlate = max(abs(p.z - 0.06 - f * 0.55 - f * 0.08 * p.y) - 0.018,
                         max(irisR - rrP, rrP - 1.3));

      return min(min(dA, dB), min(min(dC, dS), dPlate));
    }

    float machineDist(vec3 p) {
      float sid;
      return machineD(p, sid);
    }

    /* ------------- the river: one continuous volumetric flow ------------- */

    // Funnel envelope: the visible compression. Chaos radius far out,
    // narrowing smoothly into the throat, exiting as a tight tube.
    float envelopeR(float z) {
      if (z < 0.0) {
        float s = smoothstep(-11.0, -0.35, z);
        return mix(4.2, 0.5, pow(s, 0.8));
      }
      return 0.42 + z * 0.045;
    }

    float angDist(float a, float b) {
      return abs(mod(a - b + 3.14159265, TAU) - 3.14159265);
    }

    // Emission + opacity of the river at p
    vec4 flowSample(vec3 p) {
      vec3 fp = p;
      // the exit beam bends down-right toward the viewer
      if (p.z > 0.0) {
        fp.x -= 0.16 * p.z + 0.045 * p.z * p.z;
        fp.y += 0.2 * p.z + 0.05 * p.z * p.z;
      }

      float z = fp.z;
      if (z < -11.5 || z > 6.0) return vec4(0.0);

      float r = length(fp.xy);
      float Rf = envelopeR(z);
      if (r > Rf * 1.35 + 0.35) return vec4(0.0);

      float th = atan(fp.y, fp.x);
      float rn = r / max(Rf, 0.001);

      // hollow tube of filaments in normalized coordinates: the same
      // lanes physically converge as the funnel narrows
      float shell = smoothstep(1.25, 0.95, rn) * smoothstep(0.15, 0.5, rn);
      // most samples sit inside/outside the tube — skip the noise for them
      if (shell < 0.012) return vec4(0.0);

      // chaos wobble, proportional to how wide the funnel still is
      float wav = clamp((Rf - 0.5) / 3.7, 0.0, 1.0);
      float wob = (fbm(vec2(th * 2.0 + z * 0.33, z * 0.75 - time * 0.45 * motionAmp)) - 0.5)
                * wav * 5.0;

      // ---- faults: a contaminated filament, convulsing, then severed ----
      float fm = 0.0;
      float cutBulge = 0.0;
      if (z < 0.3) {
        float f0 = smoothstep(0.5, 0.12, angDist(th, fault0.x)) * fault0.y;
        float f1 = smoothstep(0.5, 0.12, angDist(th, fault1.x)) * fault1.y;
        fm = max(f0, f1);
        wob += fm * sin(time * 14.0 + z * 7.0) * 1.6;
        // the cut deflects that slice outward near the rim — it never enters
        float nearRim = smoothstep(-2.2, -0.4, z);
        cutBulge = max(f0 * fault0.z, f1 * fault1.z) * nearRim;
        rn -= cutBulge * 0.9;
      }

      float lanes;
      float packets;
      if (z < 0.0) {
        lanes = pow(0.5 + 0.5 * sin(th * 9.0 + wob + z * 0.55), 3.0);
        packets = 0.55 + 0.45 * sin(z * 2.1 - time * 2.3 * motionAmp + th * 2.0);
      } else {
        // the braid: tight counter-twisted strands
        lanes = pow(0.5 + 0.5 * sin(th * 7.0 - z * 5.5 - time * 1.9 * motionAmp), 4.0);
        packets = 0.6 + 0.4 * sin(z * 3.0 - time * 2.6 * motionAmp);
      }

      // ends fade into the void
      float gate = smoothstep(-11.5, -8.5, z) * smoothstep(6.0, 4.2, z);

      float density = shell * lanes * packets * gate;
      density *= 0.72 + cov * 0.28;

      // physical compression: the narrower the funnel, the denser the light
      float comp = 3.4 / (Rf + 0.45);

      // per-sector hover ignition of the incoming river
      float sid = floor(mod(th + TAU, TAU) / SECTOR);
      float h = 0.0;
      for (int i = 0; i < 5; i++) {
        if (float(i) == sid) h = highlight[i];
      }
      if (z < 0.0) density *= 1.0 + h * 1.1;

      // temperature: cold teal far out, white-gold as it meets the gate
      float heat = z < 0.0 ? smoothstep(-3.6, -0.1, z) : smoothstep(2.2, 0.0, z);
      vec3 hot = mix(coreColor, vec3(1.25, 1.12, 0.95), 0.45);
      vec3 col = mix(z < 0.0 ? strandColor : braidColor, hot, heat);
      col = mix(col, faultColor, clamp(fm * (0.65 + 0.35 * sin(time * 16.0)), 0.0, 1.0));

      float e = density * comp;
      return vec4(col * e, e * 0.55);
    }

    /* ------------- march ------------- */

    vec2 sphereBound(vec3 ro, vec3 rd, vec3 c, float R) {
      vec3 oc = ro - c;
      float b = dot(oc, rd);
      float h = b * b - (dot(oc, oc) - R * R);
      if (h < 0.0) return vec2(-1.0);
      h = sqrt(h);
      return vec2(-b - h, -b + h);
    }

    vec3 shadeMetal(vec3 p, vec3 rd, float sid) {
      vec2 e = vec2(0.006, -0.006);
      vec3 n = normalize(
        e.xyy * machineDist(p + e.xyy) + e.yyx * machineDist(p + e.yyx) +
        e.yxy * machineDist(p + e.yxy) + e.xxx * machineDist(p + e.xxx));

      float h = 0.0;
      float m = 0.0;
      for (int i = 0; i < 5; i++) {
        if (float(i) == sid) { h = highlight[i]; m = markArr[i]; }
      }

      // Polished dark chrome: brighter base, a teal fill from below-front,
      // a wide fresnel rim — depth without dead-black masses
      vec3 base = vec3(0.09, 0.10, 0.115);
      vec3 keyDir = normalize(vec3(0.4, 0.8, 0.45));
      vec3 fillDir = normalize(vec3(-0.3, -0.6, 0.7));
      float diff = max(dot(n, keyDir), 0.0);
      float fill = max(dot(n, fillDir), 0.0);
      float fres = pow(1.0 - abs(dot(n, rd)), 2.2);

      // lit by its own core
      vec3 toCore = -p;
      float coreLit = max(dot(n, normalize(toCore)), 0.0)
                    / (dot(toCore, toCore) * 0.4 + 0.6);

      // Luminous seams — ONLY the joints between the main rim's teeth.
      // Any angular pattern on the shutter plate reads as radial stripes
      // filling the whole aperture: the plate stays clean dark chrome and
      // gets its interest from the fresnel + the glowing sawtooth edge.
      float th = atan(p.y, p.x);
      float rxy = length(p.xy);
      float seam = grooves(th, 48.0) * smoothstep(0.14, 0.06, abs(rxy - 1.5));

      return base * (0.45 + 0.55 * diff)
           + ringColor * fill * 0.12
           + ringColor * fres * (0.7 + h * 1.6 + m * 0.4)
           + ringColor * seam * 0.3
           + coreColor * coreLit * (0.35 + iris * 0.5 + fracture * 0.5);
    }

    void main() {
      vec2 uv = vUv - 0.5;
      uv.x *= aspect;
      // matches the app's PerspectiveCamera fov 45°
      vec3 rd = normalize(camFwd * 1.2071 + camRight * uv.x + camUp * uv.y);
      vec3 ro = camPos;

      vec3 col = vec3(0.0);
      float T = 1.0;

      vec2 bound = sphereBound(ro, rd, vec3(0.0, 0.0, -2.5), 11.8);
      bool hitSurface = false;

      if (bound.y > 0.0) {
        float t = max(bound.x, 0.0);
        float tMax = bound.y;

        float breathe = 0.82 + 0.18 * sin(time * 0.55 * motionAmp);
        vec3 flarePos = vec3(cos(flareTheta), sin(flareTheta), 0.0) * 1.5;
        vec3 burst0 = vec3(cos(fault0.x), sin(fault0.x), 0.0) * 1.5;
        vec3 burst1 = vec3(cos(fault1.x), sin(fault1.x), 0.0) * 1.5;

        // The burning throat, integrated ANALYTICALLY per segment:
        // ∫ dt / (|ro + t·rd|² + a²) = atan((t+b)/s) / s. Point-sampling
        // this near-singular glow at march strides banded and crawled as
        // the camera dollied — the closed form is exact at any stride.
        float coreK = 0.05 * breathe * (0.15 + iris * 0.85)
                    * (1.0 + fracture * 1.3 + cov * 0.2);
        vec3 coreCol = (coreColor * 1.15 + 0.25) * coreK;
        float bRay = dot(ro, rd);
        float invS = inversesqrt(max(dot(ro, ro) + 0.02 - bRay * bRay, 1e-4));
        float prevF = atan((t + bRay) * invS);

        // total soft-edge coverage this ray has composited (grazing rays
        // must not smear the same edge repeatedly)
        float srfAcc = 0.0;

        for (int i = 0; i < STEPS; i++) {
          vec3 p = ro + rd * t;

          float sid;
          float dM = machineD(p, sid);

          // Soft-edge compositing: near the surface, blend the metal in by
          // partial coverage instead of a hard hit — silhouettes get ~1px
          // soft edges rather than aliased staircases
          if (dM < 0.012) {
            float srf = smoothstep(0.012, 0.0, dM) * (1.0 - srfAcc);
            srfAcc += srf;
            col += T * srf * shadeMetal(p, rd, sid);
            T *= 1.0 - srf;
            if (T < 0.03) {
              hitSurface = true;
              break;
            }
            // step past the grazing region decisively, keeping the
            // analytic core integral in sync with the advanced t
            t += max(0.045, dM + 0.02);
            float edgeF = atan((t + bRay) * invS);
            col += T * coreCol * (edgeF - prevF) * invS;
            prevF = edgeF;
            continue;
          }

          // ---- volumetrics along this stride ----
          float stride = clamp(dM * 0.8, 0.07, 0.9);
          float Rf = envelopeR(min(p.z, 0.0));
          bool inFlow = p.z > -11.6 && p.z < 6.2 && length(p.xy) < Rf * 1.4 + 2.6;
          if (inFlow) stride = min(stride, 0.32);
          // the compression throat is the hottest, highest-frequency zone
          if (dot(p.xy, p.xy) < 1.0 && abs(p.z) < 1.5) stride = min(stride, 0.2);
          // NEVER tunnel: the shutter plate (0.036 thick) and the thin
          // front ring are thinner than the volumetric stride floor, so an
          // unclamped stride steps clean over them — pixels stochastically
          // see through the machine. Classic sphere-tracing rule: when the
          // surface is nearer than the stride, converge onto it.
          stride = min(stride, max(dM, 0.013));

          vec4 fs = inFlow ? flowSample(p) : vec4(0.0);

          // machine edge-light bleeding into the medium. Faded out BEFORE
          // the bounding-proxy shell (0.28): dM switches from the cheap
          // bound to the true machined distance there, and an unfaded glow
          // paints that discontinuity as wavy contour bands.
          vec3 glow = ringColor * exp(-max(dM, 0.0) * 6.5)
                    * smoothstep(0.26, 0.15, dM) * 0.05;

          // seal arc: a permanently burning ring segment on marked shards
          float mk = 0.0;
          float hl = 0.0;
          for (int s = 0; s < 5; s++) {
            if (float(s) == sid) { mk = markArr[s]; hl = highlight[s]; }
          }
          if (mk + hl > 0.001) {
            float dSeal = sdTorusZ(p - vec3(0.0, 0.0, 0.14), 1.62, 0.02);
            glow += ringColor * exp(-max(dSeal, 0.0) * 22.0) * (mk * 0.5 + hl * 0.2);
          }

          // the burning throat — exact segment integral (see coreCol above)
          float newF = atan((t + stride + bRay) * invS);
          col += T * coreCol * (newF - prevF) * invS;
          prevF = newF;

          // rejection: rim flare + severed-strand burst
          glow += faultColor * flareAmt * 0.5
                * exp(-dot(p - flarePos, p - flarePos) * 5.0);
          float b0 = fault0.z * (1.0 - fault0.z) * 4.0;
          float b1 = fault1.z * (1.0 - fault1.z) * 4.0;
          glow += faultColor * b0 * 0.6 * exp(-dot(p - burst0, p - burst0) * 7.0);
          glow += faultColor * b1 * 0.6 * exp(-dot(p - burst1, p - burst1) * 7.0);

          col += T * (fs.rgb + glow) * stride;
          T *= exp(-fs.a * stride);

          t += stride;
          if (t > tMax || T < 0.03) break;
        }
      }

      if (!hitSurface && T > 0.03) {
        col += T * sky(rd);
      }

      // ACES-ish tonemap (the Blackhole's): keeps the throat blinding
      // without clipping ugly
      col *= vec3(0.98, 1.0, 1.02);
      col = (col * (2.51 * col + 0.03)) / (col * (2.43 * col + 0.59) + 0.14);

      gl_FragColor = vec4(col, 1.0);
    }
  `;
}
