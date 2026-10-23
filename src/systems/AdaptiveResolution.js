/**
 * Downward-only resolution governor for render-heavy scenes.
 *
 * A full-screen ray march pays per pixel, so on GPUs that can't hold the
 * frame budget the cheapest smooth-out is internal resolution. This walks
 * a small ladder of pixel ratios DOWN only — never back up, so the image
 * never visibly pumps — and only when the frame-time EMA has stayed over
 * budget continuously for a sustained window, outside of warmup/cooldown.
 *
 * Armed exclusively by a scene whose static renderProfile declares
 * `adaptive: { budgetMs, ladder }` (see LoomScene). Geometry scenes never
 * construct one.
 */

const EMA_ALPHA = 0.05;
const WARMUP_S = 2.0; // after construction, after each rung, after reset()
const SUSTAIN_S = 1.5; // EMA must exceed budget this long before stepping

export default class AdaptiveResolution {
  constructor(renderer, post, basePixelRatio, { budgetMs, ladder }) {
    this.renderer = renderer;
    this.post = post;
    this.budgetMs = budgetMs;
    // only rungs below the starting ratio make sense
    this.ladder = ladder.filter((r) => r < basePixelRatio);
    this.ema = 0;
    this.warmup = WARMUP_S;
    this.overBudgetFor = 0;
  }

  /** Forget recent history (e.g. after a tab-visibility resume). */
  reset() {
    this.ema = 0;
    this.warmup = WARMUP_S;
    this.overBudgetFor = 0;
  }

  update(deltaTime) {
    if (this.ladder.length === 0) return;

    const ms = deltaTime * 1000;
    this.ema = this.ema === 0 ? ms : this.ema + (ms - this.ema) * EMA_ALPHA;

    if (this.warmup > 0) {
      this.warmup -= deltaTime;
      return;
    }

    if (this.ema > this.budgetMs) {
      this.overBudgetFor += deltaTime;
      if (this.overBudgetFor >= SUSTAIN_S) {
        const ratio = this.ladder.shift();
        // renderer first (rebuilds its buffer from cached CSS dims), then
        // the composer chain (re-runs setSize internally, resizing every
        // pass's targets including the bloom mip chain)
        this.renderer.setPixelRatio(ratio);
        this.post.setPixelRatio(ratio);
        this.reset();
      }
    } else {
      this.overBudgetFor = 0;
    }
  }
}
