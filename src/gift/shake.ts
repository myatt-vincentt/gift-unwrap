// Shaking the box: every quick turn-around of your hands (left-right or
// up-down) is one "hit" — what's inside bumps the wall and rattles. Slow
// moves never rattle. Pure, so it is tested on its own (shake.test.ts).
// Distances are in box widths, so a box near the camera and one far away
// shake the same.

export const SHAKE = {
  /** A swing must travel at least this far (box widths) before it turns. */
  minSwing: 0.1,
  /** …at least this fast (box widths per second) to count as a hit. */
  minSpeed: 1.1,
  /** A hit is at most this strong (speed in box widths per second → 1). */
  fullSpeed: 4,
  /** Hits closer together than this (s) are one hit. */
  minGap: 0.06,
} as const;

export type Hit = {
  /** When it happened (s). */
  t: number;
  /** 0..1, from how fast the swing was. */
  strength: number;
  /** The swing's direction just before it turned (screen x, y; unit length). */
  dx: number;
  dy: number;
};

type Axis = {
  /** Where the current swing started, and its furthest point so far. */
  from: number;
  peak: number;
  /** When it started (s), and when the peak was reached. */
  fromT: number;
  peakT: number;
};

const newAxis = (p: number, t: number): Axis => ({
  from: p,
  peak: p,
  fromT: t,
  peakT: t,
});

export class ShakeMeter {
  private axes: [Axis, Axis] | null = null;

  private lastHit = -1e9;

  /** Forget the motion so far (the box was let go or replaced). */
  reset() {
    this.axes = null;
  }

  /**
   * One new reading of the box's centre (scene units) and width at time t (s).
   * Returns a hit when a swing has just turned around.
   */
  push(t: number, x: number, y: number, width: number): Hit | null {
    const w = Math.max(width, 1e-3);
    const p = [x / w, y / w];
    if (!this.axes) {
      this.axes = [newAxis(p[0], t), newAxis(p[1], t)];
      return null;
    }
    let hit: Hit | null = null;
    this.axes.forEach((a, i) => {
      const swing = a.peak - a.from;
      const now = p[i];
      // Still going the same way (or not yet moving): the peak follows.
      if (
        swing === 0 ||
        Math.sign(now - a.peak) === Math.sign(swing) ||
        now === a.peak
      ) {
        if (Math.abs(now - a.from) >= Math.abs(swing)) {
          Object.assign(a, { peak: now, peakT: t });
        }
        return;
      }
      // Coming back. A swing big enough has turned: is it a hit?
      if (Math.abs(a.peak - now) < SHAKE.minSwing * 0.5) return;
      const big = Math.abs(swing) >= SHAKE.minSwing;
      const speed = Math.abs(swing) / Math.max(a.peakT - a.fromT, 1 / 60);
      if (big && speed >= SHAKE.minSpeed && t - this.lastHit >= SHAKE.minGap) {
        const strength = Math.min(1, speed / SHAKE.fullSpeed);
        if (!hit || strength > hit.strength) {
          const s = Math.sign(swing);
          hit = { t, strength, dx: i === 0 ? s : 0, dy: i === 1 ? s : 0 };
        }
      }
      // The new swing starts at the turn.
      Object.assign(a, { from: a.peak, fromT: a.peakT, peak: now, peakT: t });
    });
    if (hit) this.lastHit = t;
    return hit;
  }
}
