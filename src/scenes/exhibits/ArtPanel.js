import * as THREE from 'three';

/**
 * A single artwork presented as a living, depth-displaced panel.
 *
 * The pristine image is never repainted. Instead a high-resolution plane
 * is displaced in Z by a depth proxy (image luminance + a radial bias),
 * so the picture gains real relief. As the visitor scrolls, the panel
 * dollies toward the camera and the displacement deepens — you travel
 * *into* the image. Edges feather to black so there is no rectangular
 * border; neighbouring panels cross-dissolve through depth.
 */
export default class ArtPanel {
  constructor(texture, fov = 45) {
    this.texture = texture;
    if (texture) {
      texture.minFilter = THREE.LinearMipmapLinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.generateMipmaps = true;
    }

    const img = texture && texture.image;
    const aspect = img && img.width ? img.width / img.height : 16 / 9;

    let w, h;
    if (aspect >= 1) { h = 5.0; w = h * aspect; }
    else { w = 4.7; h = w / aspect; }
    this.aspect = aspect;

    // Distance at which the panel just fills the frame height
    this.baseDist = (h / 2) / Math.tan(THREE.MathUtils.degToRad(fov / 2)) / 0.96;

    const geo = new THREE.PlaneGeometry(w, h, 200, 200);

    this.material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: {
        map: { value: texture },
        time: { value: 0 },
        depthScale: { value: 0.2 },
        parallax: { value: new THREE.Vector2() },
        opacity: { value: 0 },
        enter: { value: 0 },
        grain: { value: 0 }
      },
      vertexShader: `
        uniform sampler2D map;
        uniform float depthScale;
        uniform vec2 parallax;
        varying vec2 vUv;
        varying float vDepth;

        float luma(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }

        void main() {
          vUv = uv;
          vec2 c = uv - 0.5;

          // Radial bias: the centre lifts toward the viewer (the "tunnel
          // into the picture"); content luminance adds true relief.
          float radial = 1.0 - smoothstep(0.0, 0.78, length(c));
          float l = luma(texture2D(map, uv).rgb);
          float depth = radial * 0.5 + l * 0.55;
          vDepth = depth;

          vec3 pos = position;
          pos.z += depth * depthScale;
          // Nearer (deeper) regions shift more under parallax
          pos.xy += parallax * (depth - 0.25);

          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D map;
        uniform float opacity;
        uniform float enter;
        uniform float time;
        uniform float grain;
        uniform vec2 parallax;
        varying vec2 vUv;
        varying float vDepth;

        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }

        void main() {
          // Micro layered parallax in the texture lookup for extra depth
          vec2 uv = vUv + parallax * 0.02 * (vDepth - 0.4);
          vec3 col = texture2D(map, uv).rgb;

          // Gentle filmic lift; deepen as the visitor enters
          col = pow(col, vec3(0.94));
          col *= 1.0 + enter * 0.05;

          // Cinematic vignette focusing the centre
          float vig = smoothstep(0.92, 0.28, length(vUv - 0.5));
          col *= mix(0.62, 1.0, vig);

          // Feather the rectangular border into nothing
          float edge = smoothstep(0.0, 0.07, vUv.x) * smoothstep(1.0, 0.93, vUv.x)
                     * smoothstep(0.0, 0.07, vUv.y) * smoothstep(1.0, 0.93, vUv.y);

          // Subtle moving grain
          float g = (hash(floor((vUv + time * 0.4) * 900.0)) - 0.5) * grain;
          col += g;

          gl_FragColor = vec4(col, opacity * edge);
        }
      `
    });

    this.mesh = new THREE.Mesh(geo, this.material);
    this.mesh.frustumCulled = false;
  }

  /**
   * @param {number} t - position relative to this panel: -1 emerging from
   *   depth, 0 fully presented, +1 dollied past/into the viewer
   * @param {THREE.Vector2} mouse
   * @param {number} time
   * @param {boolean} reduced - reduced motion
   */
  update(t, mouse, time, reduced) {
    const fadeIn = THREE.MathUtils.smoothstep(t, -0.95, -0.4);
    const fadeOut = 1.0 - THREE.MathUtils.smoothstep(t, 0.38, 0.78);
    const opacity = fadeIn * fadeOut;

    this.mesh.visible = opacity > 0.002;
    if (!this.mesh.visible) {
      this.material.uniforms.opacity.value = 0;
      return;
    }

    const u = this.material.uniforms;
    u.opacity.value = opacity;

    // Dolly: far when emerging, pushes toward the eye as we enter
    const dist = this.baseDist * (1.0 - t * 0.8);
    this.mesh.position.z = -dist;

    // Depth deepens through the travel — the relief opens up as we enter
    const enter = THREE.MathUtils.smoothstep(t, -0.6, 0.95);
    u.enter.value = enter;
    u.depthScale.value = 0.16 + enter * 0.6;
    u.time.value = time;
    u.grain.value = 0.05;

    if (reduced) {
      u.parallax.value.set(0, 0);
      this.mesh.rotation.set(0, 0, 0);
      this.mesh.scale.setScalar(1);
      return;
    }

    // Mouse parallax tilt + drift, and a slow breathing scale
    u.parallax.value.lerp(this._p || (this._p = new THREE.Vector2()), 0);
    u.parallax.value.set(mouse.x * 0.14, mouse.y * 0.11);
    this.mesh.rotation.y += (mouse.x * 0.07 - this.mesh.rotation.y) * 0.06;
    this.mesh.rotation.x += (-mouse.y * 0.05 - this.mesh.rotation.x) * 0.06;
    this.mesh.scale.setScalar(1.0 + Math.sin(time * 0.35) * 0.008);
  }

  dispose() {
    this.mesh.geometry.dispose();
    this.material.dispose();
  }
}
