// Where the present sits: between your palms while both hands hold it, or
// resting low in the middle of the screen while it waits for you. Pure, so
// it is tested on its own (hold.test.ts). Scene units: the camera at z = 5,
// fov 45 makes the screen about 4.1 units tall at the hand plane.

export type V2 = { x: number; y: number };

/** Where the box should be: its centre, its width and its screen turn (radians). */
export type Place = { x: number; y: number; width: number; roll: number };

export const HOLD = {
  /** The box is this much of the gap between your palm centres (the rest is your palms). */
  ofGap: 0.78,
  /** The box never gets smaller or bigger than this (units). */
  minWidth: 0.5,
  maxWidth: 2.6,
  /** Palms closer than this (units) are not holding anything. */
  minGap: 0.45,
  /** The box turns at most this far with your hands (radians, ~55°). */
  maxRoll: 0.96,
  /** Hands lost for longer than this (s) let the box go back to rest. */
  letGo: 0.6,
  /** How fast the box follows your hands, and flies back to rest (1/s). */
  follow: 16,
  settle: 4.5,
} as const;

/** Your palm's centre: the wrist and the index, middle and pinky knuckles. */
export const palmCentre = (joints: readonly V2[]): V2 => {
  const ids = [0, 5, 9, 17];
  return {
    x: ids.reduce((s, i) => s + joints[i].x, 0) / ids.length,
    y: ids.reduce((s, i) => s + joints[i].y, 0) / ids.length,
  };
};

const clamp = (v: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, v));

/** The box between two palms, or null when they are too close to hold one. */
export const holdBetween = (a: V2, b: V2): Place | null => {
  const [l, r] = a.x <= b.x ? [a, b] : [b, a];
  const dx = r.x - l.x;
  const dy = r.y - l.y;
  const gap = Math.hypot(dx, dy);
  if (gap < HOLD.minGap) return null;
  return {
    x: (l.x + r.x) / 2,
    y: (l.y + r.y) / 2,
    width: clamp(gap * HOLD.ofGap, HOLD.minWidth, HOLD.maxWidth),
    roll: clamp(Math.atan2(dy, dx), -HOLD.maxRoll, HOLD.maxRoll),
  };
};

/** The resting spot: low in the middle, a comfortable size for this screen. */
export const restPlace = (viewW: number, viewH: number): Place => ({
  x: 0,
  y: -viewH * 0.25,
  width: Math.min(viewW * 0.42, viewH * 0.3),
  roll: 0,
});

/** One step from `from` toward `to` by rate (1/s) over dt (s): eases out, never overshoots. */
export const approach = (
  from: Place,
  to: Place,
  rate: number,
  dt: number,
): Place => {
  const k = 1 - Math.exp(-rate * dt);
  return {
    x: from.x + (to.x - from.x) * k,
    y: from.y + (to.y - from.y) * k,
    width: from.width + (to.width - from.width) * k,
    roll: from.roll + (to.roll - from.roll) * k,
  };
};
