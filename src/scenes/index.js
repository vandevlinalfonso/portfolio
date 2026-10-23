import MainScene from './MainScene.js';
import LoomScene from './LoomScene.js';

/**
 * Scene registry: a lens declares which scene it uses via its `scene` key.
 *
 * Every scene implements the same interface (see LoomScene for the
 * reference list): setHighlight, setMark, setSectionAnchors, setAgitation,
 * update(dt, progress, mouse), getScene, dispose — plus an optional
 * onImpact callback the app wires to the post-processing glitch.
 *
 * A scene may also declare a static `renderProfile` to shape the renderer
 * at boot (see LoomScene): { maxPixelRatio } caps the internal resolution
 * (essential for per-pixel ray marchers), and an optional
 * `adaptive: { budgetMs, ladder }` arms the downward-only resolution
 * governor (src/systems/AdaptiveResolution.js). Scenes without a profile
 * get quality.maxPixelRatio.
 */
export default {
  specimen: MainScene, // the examined artifact (Breach lens)
  loom: LoomScene      // the woven system (DevSecOps lens)
};
