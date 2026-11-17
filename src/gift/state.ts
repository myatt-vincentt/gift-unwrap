// What every part of the scene shares about the present, read in useFrame
// (never React state).
import { PAPERS } from "./paper";
import type { Place, V2 } from "./hold";

/** What a box can hold. Each rattles differently. */
export const INSIDES = ["puppy", "confetti", "snow"] as const;
export type Inside = (typeof INSIDES)[number];

const pickInside = (not?: Inside): Inside => {
  const choices = INSIDES.filter((i) => i !== not);
  return choices[Math.floor(Math.random() * choices.length)];
};

export const gift = {
  /** "rest": waiting low on the screen; "held": between your palms. */
  mode: "rest" as "rest" | "held",
  /** When the mode last changed (s, performance clock). */
  since: 0,
  /** Where the box is now (smoothed), and where it is going. */
  at: { x: 0, y: -0.7, width: 0.9, roll: 0 } as Place,
  /** Which paper the current box wears (index into PAPERS). */
  paper: Math.floor(Math.random() * PAPERS.length),
  /** Your palms in scene units while seen; dev fake hands write here too. */
  palms: { left: null as V2 | null, right: null as V2 | null },
  /** When both hands were last seen holding (s). */
  seenAt: -1e9,
  /** What's inside this box (secret until it opens). */
  inside: pickInside(),
  /** The last rattle: when (s), how hard (0..1), and which way it swung. */
  hit: { t: -1e9, strength: 0, dx: 0, dy: 0 },
  /** How many rattles this box has had. */
  hits: 0,
  /** "wrapped" until you tear it, then "open" until the next box comes. */
  phase: "wrapped" as "wrapped" | "open",
  /** When this box appeared, and when it was torn open (s). */
  bornAt: 0,
  openedAt: -1e9,
  /** A tear asked for by a pinch-out on the screen (or a dev key). */
  tearAsked: false,
  /** Dev only: fake palms in place of the tracker. */
  fake: null as { left: V2; right: V2 } | null,
};

export const setMode = (mode: typeof gift.mode, now: number) => {
  if (gift.mode === mode) return;
  gift.mode = mode;
  gift.since = now;
};

/** A new secret for the next box (never the same twice in a row). */
const insideListeners = new Set<(i: Inside) => void>();
export const onInside = (fn: (i: Inside) => void) => {
  insideListeners.add(fn);
  return () => {
    insideListeners.delete(fn);
  };
};
export const setInside = (i: Inside) => {
  gift.inside = i;
  insideListeners.forEach((fn) => fn(i));
};
export const newInside = () => {
  setInside(pickInside(gift.inside));
  gift.hits = 0;
};

/** Listeners for a new paper (the box re-dresses itself). */
const paperListeners = new Set<(i: number) => void>();
export const onPaper = (fn: (i: number) => void) => {
  paperListeners.add(fn);
  return () => {
    paperListeners.delete(fn);
  };
};
export const setPaper = (i: number) => {
  gift.paper = i;
  paperListeners.forEach((fn) => fn(i));
};
export const nextPaper = () => {
  // A random paper each time, never the one just used.
  const others = PAPERS.map((_, i) => i).filter((i) => i !== gift.paper);
  setPaper(others[Math.floor(Math.random() * others.length)]);
};
