import * as THREE from 'three';
import gsap from 'gsap';
import artifactShader from '../shaders/artifactShader.js';

/**
 * The Specimen: a dark-glass icosahedron partitioned into fragment
 * shards (one per incident) around a core cluster.
 *
 * - Scroll dissection: fragments separate along their centroid normals
 * - Case-row hover ignites the matching fragment
 * - Examined cases scar their fragment permanently
 * - Decay level drives red intrusion-vein coverage
 */
export default class Artifact {
  constructor(fragmentCount = 5, palette = null) {
    this.group = new THREE.Group();
    this.fragments = []; // project shards, index-aligned with case rows
    this.core = null;
    this.payload = null;
    this.explode = 0;
    this.payloadGlow = 0;
    this.agitation = 0;
    this.time = 0;
    this.palette = palette;
    this._seamHot = new THREE.Color(1.0, 0.4, 0.33); // seam-glow tint target

    this.build(fragmentCount);
    this.buildPayload();
    if (palette) this.applyPalette(palette);
  }

  /** Convert a lens palette color (hex number or [r,g,b] array) to a Color */
  static toColor(value) {
    return Array.isArray(value)
      ? new THREE.Color(value[0], value[1], value[2])
      : new THREE.Color(value);
  }

  /**
   * Recolor the whole specimen from a lens palette.
   * @param {object} palette
   */
  applyPalette(palette) {
    this.palette = palette;
    const map = {
      baseColor: palette.baseColor,
      veinColor: palette.veinColor,
      rimColor: palette.rimColor,
      scarTint: palette.scarTint,
    };
    this.group.traverse((obj) => {
      if (!obj.isMesh || !obj.material.uniforms) return;
      for (const [name, value] of Object.entries(map)) {
        if (value !== undefined && obj.material.uniforms[name]) {
          obj.material.uniforms[name].value.copy(Artifact.toColor(value));
        }
      }
    });
    if (this.payload) {
      const u = this.payload.material.uniforms;
      if (palette.payloadHot) u.hot.value.copy(Artifact.toColor(palette.payloadHot));
      if (palette.payloadDeep) u.deep.value.copy(Artifact.toColor(palette.payloadDeep));
    }
    if (this.payloadWire && palette.payloadHot) {
      this.payloadWire.material.color.copy(Artifact.toColor(palette.payloadHot));
    }
    if (palette.payloadHot) this._seamHot.copy(Artifact.toColor(palette.payloadHot));
  }

  build(fragmentCount) {
    const source = new THREE.IcosahedronGeometry(1.15, 1); // 80 faces, non-indexed
    const positions = source.getAttribute('position');
    const faceCount = positions.count / 3;

    // Seed directions: distribute fragment anchors around the sphere,
    // plus one zero-vector "core" seed that collects leftover faces
    const seeds = [];
    for (let i = 0; i < fragmentCount; i++) {
      const phi = Math.acos(1 - (2 * (i + 0.5)) / fragmentCount);
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;
      seeds.push(new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta),
        Math.cos(phi),
        Math.sin(phi) * Math.sin(theta)
      ));
    }

    // Assign each face to its nearest seed (faces far from every seed
    // fall to the core)
    const clusters = Array.from({ length: fragmentCount + 1 }, () => []);
    const centroid = new THREE.Vector3();
    const a = new THREE.Vector3();
    const b = new THREE.Vector3();
    const c = new THREE.Vector3();

    for (let f = 0; f < faceCount; f++) {
      a.fromBufferAttribute(positions, f * 3);
      b.fromBufferAttribute(positions, f * 3 + 1);
      c.fromBufferAttribute(positions, f * 3 + 2);
      centroid.copy(a).add(b).add(c).divideScalar(3).normalize();

      let best = -1;
      let bestDot = 0.62; // similarity floor; below it, the face is core
      for (let s = 0; s < seeds.length; s++) {
        const d = centroid.dot(seeds[s]);
        if (d > bestDot) {
          bestDot = d;
          best = s;
        }
      }
      clusters[best === -1 ? fragmentCount : best].push(f);
    }

    source.computeVertexNormals();

    clusters.forEach((faces, clusterIndex) => {
      if (faces.length === 0) return;

      const isCore = clusterIndex === fragmentCount;
      const mesh = this.buildFragmentMesh(source, faces, clusterIndex, isCore);

      if (isCore) {
        this.core = mesh;
      } else {
        this.fragments[clusterIndex] = mesh;
      }
      this.group.add(mesh);
    });

    source.dispose();
  }

  /**
   * Build one shard mesh (geometry recentered on its centroid so it can
   * translate outward), with a faceted glass material and edge overlay.
   */
  buildFragmentMesh(source, faces, clusterIndex, isCore) {
    const src = source.getAttribute('position');
    const verts = new Float32Array(faces.length * 9);

    const center = new THREE.Vector3();
    const v = new THREE.Vector3();

    for (let i = 0; i < faces.length; i++) {
      for (let j = 0; j < 3; j++) {
        v.fromBufferAttribute(src, faces[i] * 3 + j);
        center.add(v);
        verts.set([v.x, v.y, v.z], (i * 3 + j) * 3);
      }
    }
    center.divideScalar(faces.length * 3);

    for (let i = 0; i < verts.length; i += 3) {
      verts[i] -= center.x;
      verts[i + 1] -= center.y;
      verts[i + 2] -= center.z;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(verts, 3));
    geometry.computeVertexNormals(); // flat, faceted normals

    const material = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.clone(artifactShader.uniforms),
      vertexShader: artifactShader.vertexShader,
      fragmentShader: artifactShader.fragmentShader
    });
    material.uniforms.seed.value = clusterIndex * 7.31 + 1.7;

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(center);

    // Technical edge overlay
    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(geometry, 8),
      new THREE.LineBasicMaterial({
        color: 0xe8e6e1,
        transparent: true,
        opacity: isCore ? 0.08 : 0.14
      })
    );
    mesh.add(edges);

    // Dissection parameters
    mesh.userData = {
      basePos: center.clone(),
      dir: center.lengthSq() > 0.0001 ? center.clone().normalize() : new THREE.Vector3(0, 1, 0),
      spread: isCore ? 0.12 : 0.55 + Math.random() * 0.6,
      spinAxis: new THREE.Vector3().randomDirection(),
      spinAmount: isCore ? 0.05 : (Math.random() - 0.5) * 1.1,
      driftPhase: Math.random() * Math.PI * 2,
      driftAxis: new THREE.Vector3().randomDirection(),
      edges,
      highlightLift: { value: 0 }
    };

    return mesh;
  }

  /**
   * The Payload: the thing being contained. A small bright core hidden
   * inside the specimen, only visible when the fragments separate.
   */
  buildPayload() {
    const material = new THREE.ShaderMaterial({
      transparent: true,
      uniforms: {
        time: { value: 0 },
        glow: { value: 0 },
        hot: { value: new THREE.Color(1.0, 0.42, 0.3) },
        deep: { value: new THREE.Color(0.55, 0.06, 0.05) }
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vViewPosition;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          vViewPosition = -mvPosition.xyz;
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform float glow;
        uniform vec3 hot;
        uniform vec3 deep;
        varying vec3 vNormal;
        varying vec3 vViewPosition;
        void main() {
          vec3 N = normalize(vNormal);
          vec3 V = normalize(vViewPosition);
          float fresnel = pow(1.0 - abs(dot(N, V)), 1.6);
          float pulse = 0.82 + 0.18 * sin(time * 2.4);
          vec3 color = mix(deep, hot, fresnel) * (0.6 + glow * 2.2) * pulse;
          gl_FragColor = vec4(color, glow * (0.55 + fresnel * 0.45));
        }
      `
    });

    this.payload = new THREE.Mesh(new THREE.IcosahedronGeometry(0.34, 1), material);

    // Inner wireframe heart for the technical read
    this.payloadWire = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(0.46, 0)),
      new THREE.LineBasicMaterial({ color: 0xff5a44, transparent: true, opacity: 0 })
    );
    this.payload.add(this.payloadWire);
    this.group.add(this.payload);
  }

  /**
   * Scroll-driven dissection
   * @param {number} amount - 0 (intact) .. 1 (fully separated)
   */
  setExplode(amount) {
    this.explode = amount;
  }

  /**
   * Payload core exposure: 0 hidden .. 1 burning through the seams
   */
  setPayloadGlow(amount) {
    this.payloadGlow = amount;
  }

  /**
   * Scroll-velocity agitation: adds jitter to dissected fragments
   */
  setAgitation(amount) {
    this.agitation = amount;
  }

  /**
   * Forensic scan sweep: world-space Y of the scan plane + intensity
   */
  setScan(y, intensity) {
    this.group.traverse((obj) => {
      if (obj.isMesh && obj.material.uniforms && obj.material.uniforms.scanY) {
        obj.material.uniforms.scanY.value = y;
        obj.material.uniforms.scanIntensity.value = intensity;
      }
    });
  }

  /**
   * Ignite/extinguish a fragment from its case row
   * @param {number} index
   * @param {boolean} on
   */
  setHighlight(index, on) {
    const mesh = this.fragments[index];
    if (!mesh) return;

    gsap.to(mesh.material.uniforms.highlight, {
      value: on ? 1 : 0,
      duration: 0.45,
      ease: 'power2.out'
    });
    gsap.to(mesh.userData.highlightLift, {
      value: on ? 1 : 0,
      duration: 0.45,
      ease: 'power2.out'
    });
  }

  /**
   * Permanently scar an examined fragment
   * @param {number} index
   * @param {boolean} instant - skip the animation (session restore)
   */
  setScar(index, instant = false) {
    const mesh = this.fragments[index];
    if (!mesh) return;

    if (instant) {
      mesh.material.uniforms.scar.value = 1;
    } else {
      gsap.to(mesh.material.uniforms.scar, { value: 1, duration: 1.4 });
    }
  }

  /**
   * @param {number} decay - 0..1 global rot level
   */
  setDecay(decay) {
    this.group.traverse((obj) => {
      if (obj.isMesh && obj.material.uniforms && obj.material.uniforms.decay) {
        obj.material.uniforms.decay.value = decay;
      }
    });
  }

  update(deltaTime) {
    this.time += deltaTime;

    // Slow, museum-display rotation + faint levitation
    this.group.rotation.y += deltaTime * 0.08;
    this.group.position.y = Math.sin(this.time * 0.45) * 0.05;

    const e = this.explode;
    const all = this.core ? [...this.fragments, this.core] : this.fragments;

    for (const mesh of all) {
      if (!mesh) continue;
      const d = mesh.userData;

      // Base separation along centroid normal
      const offset = e * d.spread + d.highlightLift.value * 0.14;
      mesh.position.copy(d.basePos).addScaledVector(d.dir, offset);

      if (e > 0.03) {
        // Dissected fragments are alive: orbital drift + slow tumble,
        // strength scales with how far apart they are
        const t = this.time * 0.6 + d.driftPhase;
        const drift = 0.07 * e;
        mesh.position.x += Math.sin(t) * drift * d.driftAxis.x;
        mesh.position.y += Math.sin(t * 1.31 + 1.7) * drift * d.driftAxis.y;
        mesh.position.z += Math.cos(t * 0.83) * drift * d.driftAxis.z;

        // Scroll agitation: nervous jitter while the visitor moves fast
        if (this.agitation > 0.02) {
          const j = this.agitation * 0.04 * e;
          mesh.position.x += (Math.random() - 0.5) * j;
          mesh.position.y += (Math.random() - 0.5) * j;
        }

        // Tumble keeps accumulating while dissected
        mesh.quaternion.setFromAxisAngle(
          d.spinAxis,
          e * d.spinAmount + this.time * 0.1 * e * Math.sign(d.spinAmount)
        );
      } else {
        mesh.quaternion.setFromAxisAngle(d.spinAxis, e * d.spinAmount);
      }

      if (mesh.material.uniforms) {
        mesh.material.uniforms.time.value = this.time;
      }

      // Seam glow: when the payload burns, edge lines catch its light,
      // tinting from bone toward the lens's core color
      if (d.edges) {
        const base = mesh === this.core ? 0.08 : 0.14;
        d.edges.material.opacity = base + this.payloadGlow * 0.25;
        const hot = this._seamHot;
        d.edges.material.color.setRGB(
          0.91 + (hot.r - 0.91) * this.payloadGlow,
          0.9 + (hot.g - 0.9) * this.payloadGlow,
          0.88 + (hot.b - 0.88) * this.payloadGlow
        );
      }
    }

    // Payload core: breathes, spins against the shell, fades with glow
    if (this.payload) {
      const m = this.payload.material.uniforms;
      m.time.value = this.time;
      m.glow.value = this.payloadGlow;
      this.payload.visible = this.payloadGlow > 0.01;
      this.payload.rotation.y = -this.time * 0.4;
      this.payload.rotation.x = Math.sin(this.time * 0.3) * 0.4;
      const s = 1 + Math.sin(this.time * 2.4) * 0.06 * this.payloadGlow;
      this.payload.scale.setScalar(s);
      this.payloadWire.material.opacity = this.payloadGlow * 0.5;
      this.payloadWire.rotation.y = this.time * 0.7;
    }
  }

  getGroup() {
    return this.group;
  }

  dispose() {
    this.group.traverse((obj) => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) obj.material.dispose();
    });
  }
}
