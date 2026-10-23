import * as THREE from 'three';
import { quality } from '../utils/Quality.js';

/**
 * Shared stage dressing used by every lens scene: the radially-faded grid
 * floor and the slow ambient dust motes.
 */

/**
 * Faint grid floor, radially faded toward the fog.
 * @param {THREE.Scene} scene
 * @param {object} opts - { baseColor, lineColor, y }
 * @returns {THREE.Mesh}
 */
export function createFloor(scene, { baseColor = 0x0a0a0b, lineColor = 0xe8e6e1, y = -1.85 } = {}) {
  const geometry = new THREE.PlaneGeometry(44, 44);
  const material = new THREE.ShaderMaterial({
    uniforms: {
      baseColor: { value: new THREE.Color(baseColor) },
      lineColor: { value: new THREE.Color(lineColor) }
    },
    vertexShader: `
      varying vec3 vWorldPos;
      void main() {
        vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 baseColor;
      uniform vec3 lineColor;
      varying vec3 vWorldPos;

      float gridLine(float coord) {
        float f = abs(fract(coord) - 0.5);
        return 1.0 - smoothstep(0.47, 0.5, 0.5 - f);
      }

      void main() {
        float gx = gridLine(vWorldPos.x * 0.8);
        float gz = gridLine(vWorldPos.z * 0.8);
        float grid = max(gx, gz);

        float dist = length(vWorldPos.xz);
        float fade = 1.0 - smoothstep(2.5, 13.0, dist);

        vec3 color = baseColor + lineColor * grid * 0.07 * fade;
        gl_FragColor = vec4(color, 1.0);
      }
    `
  });

  const floor = new THREE.Mesh(geometry, material);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = y;
  scene.add(floor);
  return floor;
}

/**
 * Slow-drifting ambient dust. Returns a handle with an update method the
 * owning scene calls each frame.
 * @param {THREE.Scene} scene
 * @param {object} opts - { color, opacity }
 */
export function createDust(scene, { color = 0xffffff, opacity = 0.28 } = {}) {
  const count = Math.floor(220 * quality.particleMultiplier);
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const velocities = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 9;
    positions[i * 3 + 1] = Math.random() * 6 - 1.8;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 9;
    velocities[i * 3] = (Math.random() - 0.5) * 0.0012;
    velocities[i * 3 + 1] = Math.random() * 0.002;
    velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.0012;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const points = new THREE.Points(geometry, new THREE.PointsMaterial({
    color,
    size: 0.018,
    sizeAttenuation: true,
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    fog: true
  }));
  scene.add(points);

  return {
    points,
    update() {
      const pos = geometry.attributes.position.array;
      for (let i = 0; i < count; i++) {
        pos[i * 3] += velocities[i * 3];
        pos[i * 3 + 1] += velocities[i * 3 + 1];
        pos[i * 3 + 2] += velocities[i * 3 + 2];
        if (pos[i * 3 + 1] > 4.5) pos[i * 3 + 1] = -1.8;
        if (Math.abs(pos[i * 3]) > 4.5) pos[i * 3] *= -0.92;
        if (Math.abs(pos[i * 3 + 2]) > 4.5) pos[i * 3 + 2] *= -0.92;
      }
      geometry.attributes.position.needsUpdate = true;
    }
  };
}
