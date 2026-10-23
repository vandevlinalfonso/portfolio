import * as THREE from 'three';

const _lookMatrix = new THREE.Matrix4();
const _up = new THREE.Vector3(0, 1, 0);
const _right = new THREE.Vector3();
const _upCol = new THREE.Vector3();
const _eye = new THREE.Vector3();

/**
 * Linear interpolation across an array of per-section key values.
 * @param {Array<number>} keys
 * @param {number} t - 0..1 across all keys
 */
export function keyLerp(keys, t) {
  const seg = Math.min(keys.length - 2, Math.floor(t * (keys.length - 1)));
  const local = t * (keys.length - 1) - seg;
  return keys[seg] + (keys[seg + 1] - keys[seg]) * local;
}

/**
 * Scroll-driven camera rig shared by every lens scene.
 *
 * Per-section {pos, look} keys are interpolated along Catmull-Rom curves so
 * the dolly between sections stays liquid; section anchors (normalized
 * scroll offsets of section centers, fed from the DOM) pin each key exactly
 * to its section. Mouse parallax drifts the eye, not the target.
 */
export default class CameraRig {
  /**
   * @param {THREE.PerspectiveCamera} camera
   * @param {Array<{pos: THREE.Vector3, look: THREE.Vector3}>} keys
   * @param {number} parallaxStrength
   */
  constructor(camera, keys, parallaxStrength = 0.16) {
    this.camera = camera;
    this.keyCount = keys.length;

    this.posCurve = new THREE.CatmullRomCurve3(keys.map((k) => k.pos), false, 'centripetal');
    this.lookCurve = new THREE.CatmullRomCurve3(keys.map((k) => k.look), false, 'centripetal');

    this.smoothedPos = keys[0].pos.clone();
    this.smoothedLook = keys[0].look.clone();
    this.targetPos = new THREE.Vector3();
    this.targetLook = new THREE.Vector3();
    this.parallax = new THREE.Vector2();
    this.parallaxStrength = parallaxStrength;

    this.sectionAnchors = keys.map((_, i) => i / (keys.length - 1));

    camera.position.copy(this.smoothedPos);
    camera.lookAt(this.smoothedLook);
  }

  /**
   * @param {Array<number>} anchors - ascending, 0..1, one per key
   */
  setSectionAnchors(anchors) {
    if (anchors.length === this.keyCount) {
      this.sectionAnchors = anchors;
    }
  }

  /**
   * Map global scroll progress (0..1) to curve parameter using section
   * anchors, so each camera key lands exactly on its section.
   */
  progressToCurveT(progress) {
    const a = this.sectionAnchors;
    const n = a.length - 1;
    if (progress <= a[0]) return 0;
    if (progress >= a[n]) return 1;

    for (let i = 0; i < n; i++) {
      if (progress <= a[i + 1]) {
        const local = (progress - a[i]) / Math.max(1e-6, a[i + 1] - a[i]);
        return (i + local) / n;
      }
    }
    return 1;
  }

  /**
   * Advance the camera. Returns the curve parameter t (0..1) so scenes can
   * derive per-section behavior from it.
   * @param {number} progress - smoothed global scroll progress 0..1
   * @param {THREE.Vector2} mouse - normalized mouse (-1..1)
   * @param {number} orbitAngle - optional extra yaw around the look target
   */
  update(progress, mouse, orbitAngle = 0) {
    const t = this.progressToCurveT(progress);

    this.posCurve.getPoint(t, this.targetPos);
    this.lookCurve.getPoint(t, this.targetLook);
    this.smoothedPos.lerp(this.targetPos, 0.06);
    this.smoothedLook.lerp(this.targetLook, 0.06);

    _eye.copy(this.smoothedPos).sub(this.smoothedLook);
    if (orbitAngle) _eye.applyAxisAngle(_up, orbitAngle);
    _eye.add(this.smoothedLook);

    this.parallax.lerp(mouse, 0.04);
    _lookMatrix.lookAt(_eye, this.smoothedLook, _up);
    _right.setFromMatrixColumn(_lookMatrix, 0);
    _upCol.setFromMatrixColumn(_lookMatrix, 1);

    this.camera.position
      .copy(_eye)
      .addScaledVector(_right, this.parallax.x * this.parallaxStrength)
      .addScaledVector(_upCol, this.parallax.y * this.parallaxStrength * 0.6);
    this.camera.lookAt(this.smoothedLook);

    return t;
  }
}
