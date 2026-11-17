// What every part of the scene shares about the present, read in useFrame
// (never React state).
import { PAPERS } from "./paper";
import type { Place, V2 } from "./hold";

export const gift = {
  /** "rest": waiting low on the screen; "held": between your palms. */
  mode: "rest" as "rest" | "held",
  /** When the mode last changed (s, performance clock). */
  since: 0,
  /** Where the box is now (smoothed), and where it is going. */
  at: { x: 0, y: -0.7, width: 0.9, roll: 0 } as Place,
  /** Which paper the current box wears (index into PAPERS). */
  paper: 0,
  /** Your palms in scene units while seen; dev fake hands write here too. */
  palms: { left: null as V2 | null, right: null as V2 | null },
  /** When both hands were last seen holding (s). */
  seenAt: -1e9,
  /** Dev only: fake palms in place of the tracker. */
  fake: null as { left: V2; right: V2 } | null,
};

export const setMode = (mode: typeof gift.mode, now: number) => {
  if (gift.mode === mode) return;
  gift.mode = mode;
  gift.since = now;
};

/** Listeners for a new paper (the box re-dresses itself). */
const paperListeners = new Set<(i: number) => void>();
export const onPaper = (fn: (i: number) => void) => {
  paperListeners.add(fn);
  return () => {
    paperListeners.delete(fn);
  };
};
export const nextPaper = () => {
  gift.paper = (gift.paper + 1) % PAPERS.length;
  paperListeners.forEach((fn) => fn(gift.paper));
};
