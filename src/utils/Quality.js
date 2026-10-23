/**
 * Device capability / preference detection.
 * Low-power mode drops post-processing and reduces particle counts.
 */
export const quality = (() => {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
  const smallScreen = window.innerWidth < 768;
  const low = reducedMotion || coarsePointer || smallScreen;

  return {
    reducedMotion,
    isMobile: coarsePointer || smallScreen,
    low,
    postProcessing: !low,
    particleMultiplier: low ? 0.4 : 1,
    maxPixelRatio: low ? 1.5 : 2
  };
})();

export function isWebGLAvailable() {
  try {
    const canvas = document.createElement('canvas');
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl2') || canvas.getContext('webgl'))
    );
  } catch (error) {
    return false;
  }
}
