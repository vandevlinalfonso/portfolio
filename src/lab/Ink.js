import * as THREE from 'three';

/**
 * Ink — real-time stable-fluids simulation (Stam).
 *
 * Velocity and dye fields live in ping-pong half-float targets.
 * Per frame: advect velocity, inject cursor splats, solve pressure
 * (Jacobi), subtract its gradient, advect the dye, draw the dye.
 */

const VERT = 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position, 1.0); }';

function doubleFBO(w, h, format) {
  const opts = {
    type: THREE.HalfFloatType,
    format,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    wrapS: THREE.ClampToEdgeWrapping,
    wrapT: THREE.ClampToEdgeWrapping,
    depthBuffer: false,
    stencilBuffer: false
  };
  return {
    read: new THREE.WebGLRenderTarget(w, h, opts),
    write: new THREE.WebGLRenderTarget(w, h, opts),
    swap() { [this.read, this.write] = [this.write, this.read]; },
    dispose() { this.read.dispose(); this.write.dispose(); }
  };
}

export default class Ink {
  constructor(host, quality) {
    const simH = quality.isMobile ? 96 : 144;
    const dyeH = quality.isMobile ? 320 : 512;
    this.aspect = innerWidth / innerHeight;
    this.simW = Math.round(simH * this.aspect);
    this.simH = simH;
    this.dyeW = Math.round(dyeH * this.aspect);
    this.dyeH = dyeH;
    this.jacobi = quality.isMobile ? 14 : 22;
    this.hue = Math.random();

    this.renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
    this.renderer.setSize(innerWidth, innerHeight);
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, quality.maxPixelRatio));
    host.appendChild(this.renderer.domElement);

    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.quadScene = new THREE.Scene();
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
    this.quadScene.add(this.quad);

    this.velocity = doubleFBO(this.simW, this.simH, THREE.RGBAFormat);
    this.dye = doubleFBO(this.dyeW, this.dyeH, THREE.RGBAFormat);
    this.pressure = doubleFBO(this.simW, this.simH, THREE.RGBAFormat);
    this.divergence = doubleFBO(this.simW, this.simH, THREE.RGBAFormat);

    this.buildMaterials();
  }

  buildMaterials() {
    const simTexel = new THREE.Vector2(1 / this.simW, 1 / this.simH);
    const dyeTexel = new THREE.Vector2(1 / this.dyeW, 1 / this.dyeH);

    this.advectMat = new THREE.ShaderMaterial({
      uniforms: {
        velocity: { value: null },
        source: { value: null },
        texelSize: { value: simTexel },
        dt: { value: 0.016 },
        dissipation: { value: 0.98 }
      },
      vertexShader: VERT,
      fragmentShader: `
        uniform sampler2D velocity;
        uniform sampler2D source;
        uniform vec2 texelSize;
        uniform float dt;
        uniform float dissipation;
        varying vec2 vUv;
        void main() {
          vec2 vel = texture2D(velocity, vUv).xy;
          vec2 coord = vUv - dt * vel * texelSize;
          gl_FragColor = dissipation * texture2D(source, coord);
          gl_FragColor.a = 1.0;
        }
      `
    });

    this.splatMat = new THREE.ShaderMaterial({
      uniforms: {
        target: { value: null },
        point: { value: new THREE.Vector2() },
        color: { value: new THREE.Vector3() },
        radius: { value: 0.0016 },
        aspect: { value: this.aspect }
      },
      vertexShader: VERT,
      fragmentShader: `
        uniform sampler2D target;
        uniform vec2 point;
        uniform vec3 color;
        uniform float radius;
        uniform float aspect;
        varying vec2 vUv;
        void main() {
          vec2 d = vUv - point;
          d.x *= aspect;
          vec3 splat = exp(-dot(d, d) / radius) * color;
          gl_FragColor = vec4(texture2D(target, vUv).xyz + splat, 1.0);
        }
      `
    });

    this.divergenceMat = new THREE.ShaderMaterial({
      uniforms: { velocity: { value: null }, texelSize: { value: simTexel } },
      vertexShader: VERT,
      fragmentShader: `
        uniform sampler2D velocity;
        uniform vec2 texelSize;
        varying vec2 vUv;
        void main() {
          float l = texture2D(velocity, vUv - vec2(texelSize.x, 0.0)).x;
          float r = texture2D(velocity, vUv + vec2(texelSize.x, 0.0)).x;
          float b = texture2D(velocity, vUv - vec2(0.0, texelSize.y)).y;
          float t = texture2D(velocity, vUv + vec2(0.0, texelSize.y)).y;
          gl_FragColor = vec4(0.5 * (r - l + t - b), 0.0, 0.0, 1.0);
        }
      `
    });

    this.pressureMat = new THREE.ShaderMaterial({
      uniforms: {
        pressure: { value: null },
        divergence: { value: null },
        texelSize: { value: simTexel }
      },
      vertexShader: VERT,
      fragmentShader: `
        uniform sampler2D pressure;
        uniform sampler2D divergence;
        uniform vec2 texelSize;
        varying vec2 vUv;
        void main() {
          float l = texture2D(pressure, vUv - vec2(texelSize.x, 0.0)).x;
          float r = texture2D(pressure, vUv + vec2(texelSize.x, 0.0)).x;
          float b = texture2D(pressure, vUv - vec2(0.0, texelSize.y)).x;
          float t = texture2D(pressure, vUv + vec2(0.0, texelSize.y)).x;
          float div = texture2D(divergence, vUv).x;
          gl_FragColor = vec4((l + r + b + t - div) * 0.25, 0.0, 0.0, 1.0);
        }
      `
    });

    this.gradientMat = new THREE.ShaderMaterial({
      uniforms: {
        pressure: { value: null },
        velocity: { value: null },
        texelSize: { value: simTexel }
      },
      vertexShader: VERT,
      fragmentShader: `
        uniform sampler2D pressure;
        uniform sampler2D velocity;
        uniform vec2 texelSize;
        varying vec2 vUv;
        void main() {
          float l = texture2D(pressure, vUv - vec2(texelSize.x, 0.0)).x;
          float r = texture2D(pressure, vUv + vec2(texelSize.x, 0.0)).x;
          float b = texture2D(pressure, vUv - vec2(0.0, texelSize.y)).x;
          float t = texture2D(pressure, vUv + vec2(0.0, texelSize.y)).x;
          vec2 vel = texture2D(velocity, vUv).xy;
          vel -= vec2(r - l, t - b) * 0.5;
          gl_FragColor = vec4(vel, 0.0, 1.0);
        }
      `
    });

    this.clearMat = new THREE.ShaderMaterial({
      uniforms: { target: { value: null }, value: { value: 0.85 } },
      vertexShader: VERT,
      fragmentShader: `
        uniform sampler2D target;
        uniform float value;
        varying vec2 vUv;
        void main() { gl_FragColor = value * texture2D(target, vUv); gl_FragColor.a = 1.0; }
      `
    });

    this.displayMat = new THREE.ShaderMaterial({
      uniforms: { dye: { value: null }, dyeTexel: { value: dyeTexel } },
      vertexShader: VERT,
      fragmentShader: `
        uniform sampler2D dye;
        uniform vec2 dyeTexel;
        varying vec2 vUv;
        void main() {
          vec3 c = texture2D(dye, vUv).rgb;
          // cheap emboss lighting from dye density gradient
          float h0 = dot(texture2D(dye, vUv - dyeTexel).rgb, vec3(0.33));
          float h1 = dot(texture2D(dye, vUv + dyeTexel).rgb, vec3(0.33));
          c += (h1 - h0) * 0.55;
          c = pow(max(c, 0.0), vec3(0.85));
          float vig = smoothstep(1.05, 0.4, length(vUv - 0.5));
          c *= mix(0.55, 1.0, vig);
          gl_FragColor = vec4(c, 1.0);
        }
      `
    });
  }

  blit(target, material) {
    this.quad.material = material;
    this.renderer.setRenderTarget(target);
    this.renderer.render(this.quadScene, this.camera);
  }

  splat(x, y, dx, dy, color, radius = 0.0016) {
    const u = this.splatMat.uniforms;
    u.aspect.value = this.aspect;
    u.point.value.set(x, 1 - y);
    u.radius.value = radius;

    u.target.value = this.velocity.read.texture;
    u.color.value.set(dx, -dy, 0);
    this.blit(this.velocity.write, this.splatMat);
    this.velocity.swap();

    u.target.value = this.dye.read.texture;
    u.color.value.copy(color);
    this.blit(this.dye.write, this.splatMat);
    this.dye.swap();
  }

  click(cx, cy) {
    // Radial dye pulse
    const color = this.currentColor(3.2);
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      this.splat(
        cx / innerWidth, cy / innerHeight,
        Math.cos(a) * 220, Math.sin(a) * 220,
        color, 0.004
      );
    }
  }

  currentColor(strength = 1) {
    this.hue = (this.hue + 0.0013) % 1;
    const c = new THREE.Color().setHSL(this.hue, 0.85, 0.5);
    return new THREE.Vector3(c.r * 0.32 * strength, c.g * 0.32 * strength, c.b * 0.32 * strength);
  }

  update(dt, time, pointer) {
    const u = this.advectMat.uniforms;
    const simTexel = new THREE.Vector2(1 / this.simW, 1 / this.simH);

    // Cursor splat from motion
    const dx = pointer.x - pointer.px;
    const dy = pointer.y - pointer.py;
    if (Math.hypot(dx, dy) > 0.5) {
      this.splat(
        pointer.x / innerWidth,
        pointer.y / innerHeight,
        dx * 9, dy * 9,
        this.currentColor(pointer.down ? 2.2 : 1)
      );
    }

    // Advect velocity
    u.velocity.value = this.velocity.read.texture;
    u.source.value = this.velocity.read.texture;
    u.texelSize.value = simTexel;
    u.dt.value = Math.min(dt, 0.033) * 60;
    u.dissipation.value = 0.985;
    this.blit(this.velocity.write, this.advectMat);
    this.velocity.swap();

    // Pressure projection
    this.divergenceMat.uniforms.velocity.value = this.velocity.read.texture;
    this.blit(this.divergence.read, this.divergenceMat);

    this.clearMat.uniforms.target.value = this.pressure.read.texture;
    this.blit(this.pressure.write, this.clearMat);
    this.pressure.swap();

    for (let i = 0; i < this.jacobi; i++) {
      this.pressureMat.uniforms.pressure.value = this.pressure.read.texture;
      this.pressureMat.uniforms.divergence.value = this.divergence.read.texture;
      this.blit(this.pressure.write, this.pressureMat);
      this.pressure.swap();
    }

    this.gradientMat.uniforms.pressure.value = this.pressure.read.texture;
    this.gradientMat.uniforms.velocity.value = this.velocity.read.texture;
    this.blit(this.velocity.write, this.gradientMat);
    this.velocity.swap();

    // Advect dye at dye resolution
    u.velocity.value = this.velocity.read.texture;
    u.source.value = this.dye.read.texture;
    u.texelSize.value = new THREE.Vector2(1 / this.dyeW, 1 / this.dyeH);
    u.dissipation.value = 0.988;
    this.blit(this.dye.write, this.advectMat);
    this.dye.swap();

    // Draw
    this.displayMat.uniforms.dye.value = this.dye.read.texture;
    this.blit(null, this.displayMat);
  }

  resize(w, h) {
    this.aspect = w / h;
    this.renderer.setSize(w, h);
    // Fields keep their resolution; aspect only affects splats/display
  }

  dispose() {
    this.velocity.dispose();
    this.dye.dispose();
    this.pressure.dispose();
    this.divergence.dispose();
    [this.advectMat, this.splatMat, this.divergenceMat, this.pressureMat,
      this.gradientMat, this.clearMat, this.displayMat].forEach((m) => m.dispose());
    this.quad.geometry.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
