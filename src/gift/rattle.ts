// One rattle of the box: the box and lid jiggle (Gift.tsx reads gift.hit)
// and what's inside makes its sound. A tap on the screen gives a short
// shake of four rattles, for phones (one hand holds the phone) and for
// anyone without both hands free.
import { playRattle } from "./audio";
import { gift } from "./state";

export const rattle = (strength: number, dx: number, dy: number) => {
  gift.hit = { t: performance.now() / 1000, strength, dx, dy };
  gift.hits += 1;
  playRattle(gift.inside, strength);
};

/** A tap's shake: four rattles side to side, each a little softer. */
const TAP_SHAKE = [
  { at: 0, strength: 0.85, dx: 1 },
  { at: 0.14, strength: 0.75, dx: -1 },
  { at: 0.28, strength: 0.65, dx: 1 },
  { at: 0.42, strength: 0.5, dx: -1 },
] as const;

/** Rattles waiting to play (s, performance clock). */
const queue: { t: number; strength: number; dx: number }[] = [];

export const tapShake = () => {
  // Only a wrapped box rattles (an open one has nothing left to shake).
  if (gift.phase !== "wrapped") return;
  const now = performance.now() / 1000;
  // A tap during a tap-shake restarts it.
  queue.length = 0;
  TAP_SHAKE.forEach((r) =>
    queue.push({ t: now + r.at, strength: r.strength, dx: r.dx }),
  );
};

/** Plays the queued rattles that are due (call every frame). */
export const playDueRattles = (now: number) => {
  // A box torn mid-shake drops the rest of the shake.
  if (gift.phase !== "wrapped") queue.length = 0;
  while (queue.length && queue[0].t <= now) {
    const r = queue.shift()!;
    rattle(r.strength, r.dx, 0);
  }
};
