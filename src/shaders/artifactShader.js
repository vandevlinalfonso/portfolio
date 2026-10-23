import * as THREE from 'three';

/**
 * Dark-glass specimen shader.
 * - Obsidian base with faceted specular + fresnel rim
 * - FBM-driven red intrusion veins; coverage grows with decay
 * - highlight: case-row hover ignites the fragment
 * - scar: permanently marks examined fragments
 */
const artifactShader = {
  uniforms: {
    time: { value: 0 },
    decay: { value: 0.3 },
    highlight: { value: 0 },
    scar: { value: 0 },
    seed: { value: 0 },
    scanY: { value: -10 },
    scanIntensity: { value: 0 },
    lightPosition: { value: new THREE.Vector3(3, 5, 2) },
    baseColor: { value: new THREE.Color(0x0e1014) },
    veinColor: { value: new THREE.Color(0xc43a2f) },
    rimColor: { value: new THREE.Color(0xb8c4d4) },
    scarTint: { value: new THREE.Color(0.13, 0.05, 0.045) }
  },

  vertexShader: `
    varying vec3 vNormal;
    varying vec3 vViewPosition;
    varying vec3 vLocalPos;
    varying vec3 vWorldPos;

    void main() {
      vLocalPos = position;
      vNormal = normalize(normalMatrix * normal);
      vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;

      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      vViewPosition = -mvPosition.xyz;

      gl_Position = projectionMatrix * mvPosition;
    }
  `,

  fragmentShader: `
    uniform float time;
    uniform float decay;
    uniform float highlight;
    uniform float scar;
    uniform float seed;
    uniform float scanY;
    uniform float scanIntensity;
    uniform vec3 lightPosition;
    uniform vec3 baseColor;
    uniform vec3 veinColor;
    uniform vec3 rimColor;
    uniform vec3 scarTint;

    varying vec3 vNormal;
    varying vec3 vViewPosition;
    varying vec3 vLocalPos;
    varying vec3 vWorldPos;

    float hash3(vec3 p) {
      return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453123);
    }

    float vnoise3(vec3 p) {
      vec3 i = floor(p);
      vec3 f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      float n000 = hash3(i);
      float n100 = hash3(i + vec3(1.0, 0.0, 0.0));
      float n010 = hash3(i + vec3(0.0, 1.0, 0.0));
      float n110 = hash3(i + vec3(1.0, 1.0, 0.0));
      float n001 = hash3(i + vec3(0.0, 0.0, 1.0));
      float n101 = hash3(i + vec3(1.0, 0.0, 1.0));
      float n011 = hash3(i + vec3(0.0, 1.0, 1.0));
      float n111 = hash3(i + vec3(1.0, 1.0, 1.0));
      return mix(
        mix(mix(n000, n100, f.x), mix(n010, n110, f.x), f.y),
        mix(mix(n001, n101, f.x), mix(n011, n111, f.x), f.y),
        f.z
      );
    }

    float fbm3(vec3 p) {
      float value = 0.0;
      float amplitude = 0.5;
      for (int i = 0; i < 4; i++) {
        value += amplitude * vnoise3(p);
        p *= 2.07;
        amplitude *= 0.5;
      }
      return value;
    }

    void main() {
      vec3 N = normalize(vNormal);
      vec3 V = normalize(vViewPosition);

      // Key light in view space
      vec3 fragViewPos = -vViewPosition;
      vec3 lightView = (viewMatrix * vec4(lightPosition, 1.0)).xyz;
      vec3 L = normalize(lightView - fragViewPos);

      // Obsidian base, slightly modulated so facets are not uniform
      float grain = fbm3(vLocalPos * 5.0 + seed);
      vec3 base = baseColor * (0.85 + grain * 0.3);

      // Scarred fragments dry out toward the lens's scar tint
      base = mix(base, scarTint, scar * 0.55);

      // Faceted specular: tight highlight per face (flat normals)
      vec3 H = normalize(L + V);
      float spec = pow(max(dot(N, H), 0.0), 60.0) * 0.7;

      // Fresnel rim — cool bone light catching edges
      float fresnel = pow(1.0 - abs(dot(N, V)), 2.6);
      vec3 rim = rimColor * fresnel * mix(0.18, 0.45, highlight);

      // Soft diffuse so the form reads
      float diffuse = max(dot(N, L), 0.0) * 0.25 + 0.12;

      // Intrusion veins: thin filaments where the noise field crosses
      // the decay threshold — coverage spreads as the specimen rots
      float field = fbm3(vLocalPos * 3.2 + seed * 1.7);
      float threshold = 0.8 - decay * 0.42;
      float vein = smoothstep(threshold, threshold - 0.03, field)
                 - smoothstep(threshold - 0.055, threshold - 0.11, field);
      vein = clamp(vein, 0.0, 1.0);

      // Veins cluster in infected regions rather than covering evenly
      float region = smoothstep(0.38, 0.68, fbm3(vLocalPos * 1.1 + seed * 0.9 + 5.0));
      vein *= mix(region, 1.0, decay * 0.55);

      float pulse = 0.75 + 0.25 * sin(time * 1.6 + seed * 3.1);
      vec3 veins = veinColor * vein * pulse * (1.3 + highlight * 1.6);

      // Hover ignition floods the whole fragment faintly
      vec3 ignite = veinColor * highlight * 0.22;

      // Forensic scan sweep: a thin bright band crossing the specimen,
      // exposing the vein lattice as it passes
      float scanBand = smoothstep(0.22, 0.0, abs(vWorldPos.y - scanY)) * scanIntensity;
      vec3 scanGlow = vec3(0.9, 0.95, 1.0) * scanBand * 0.35;
      float scanVeinExpose = scanBand * 2.0;
      float wideExpose = smoothstep(0.9, 0.0, abs(vWorldPos.y - scanY)) * scanIntensity;

      // Veins below the passed scan line stay lit while scanning
      float passed = smoothstep(0.0, 0.15, scanY - vWorldPos.y) * scanIntensity;

      vec3 color = base * (diffuse + 0.55)
                 + vec3(spec)
                 + rim
                 + veins * (1.0 + scanVeinExpose + passed * 0.8 + wideExpose * 0.5)
                 + scanGlow
                 + ignite;

      gl_FragColor = vec4(color, 1.0);
    }
  `
};

export default artifactShader;
