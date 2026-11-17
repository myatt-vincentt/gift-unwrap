// Tearing the paper: pull your hands apart quickly. The gap between your
// palms must grow by a good part of itself in a short moment; slowly
// widening your hands only makes the box bigger. Pure, so it is tested on
// its own (tear.test.ts).

export const TEAR = {
  /** The gap must grow by this much of itself… */
  growth: 0.4,
  /** …within this long (s). */
  window: 0.4,
  /** Hold the box this long (s) first: hands just arriving never tear it. */
  minHeld: 0.5,
} as const;

export class TearMeter {
  private samples: { t: number; gap: number }[] = [];

  private heldSince = -1;

  /** Forget the motion so far (the box was let go, or it opened). */
  reset() {
    this.samples = [];
    this.heldSince = -1;
  }

  /** One new reading of the gap between your palms (scene units) at t (s). True = tear. */
  push(t: number, gap: number): boolean {
    if (this.heldSince < 0) this.heldSince = t;
    this.samples.push({ t, gap });
    this.samples = this.samples.filter((s) => t - s.t <= TEAR.window);
    if (t - this.heldSince < TEAR.minHeld) return false;
    const least = Math.min(...this.samples.map((s) => s.gap));
    if (least > 0 && gap - least >= TEAR.growth * least) {
      this.reset();
      return true;
    }
    return false;
  }
}

/** The gap between two palms. */
export const gapOf = (
  a: { x: number; y: number },
  b: { x: number; y: number },
) => Math.hypot(a.x - b.x, a.y - b.y);
