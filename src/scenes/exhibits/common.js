import * as THREE from 'three';

/**
 * Atmosphere for the gallery: slow dust motes and soft bokeh orbs that
 * drift between the camera and the artwork, giving the depth a tangible
 * volume to travel through.
 */

function discTexture(inner = 0.0) {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, size * inner, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.5, 'rgba(255,255,255,0.5)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(canvas);
}

export function makeDust(count, color = 0xffffff) {
  const positions = new Float32Array(count * 3);
  const speeds = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 16;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 11;
    positions[i * 3 + 2] = 1 - Math.random() * 13;
    speeds[i] = 0.04 + Math.random() * 0.12;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const mat = new THREE.PointsMaterial({
    map: discTexture(),
    color,
    size: 0.06,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.5,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  points.userData.speeds = speeds;
  return points;
}

export function makeBokeh(count, color = 0xbfd0ff) {
  const positions = new Float32Array(count * 3);
  const phase = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 12;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 8;
    positions[i * 3 + 2] = 0.5 - Math.random() * 9;
    phase[i] = Math.random() * Math.PI * 2;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('phase', new THREE.BufferAttribute(phase, 1));

  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { time: { value: 0 }, color: { value: new THREE.Color(color) }, tex: { value: discTexture(0.1) } },
    vertexShader: `
      attribute float phase;
      uniform float time;
      varying float vA;
      void main() {
        vA = 0.25 + 0.25 * sin(time * 0.6 + phase);
        vec3 p = position;
        p.x += sin(time * 0.2 + phase) * 0.3;
        p.y += cos(time * 0.15 + phase) * 0.2;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = (60.0 + 40.0 * sin(phase)) * (1.0 / -mv.z);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: `
      uniform sampler2D tex;
      uniform vec3 color;
      varying float vA;
      void main() {
        float a = texture2D(tex, gl_PointCoord).a;
        gl_FragColor = vec4(color, a * vA);
      }
    `
  });

  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  return points;
}
