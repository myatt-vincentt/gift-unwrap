import { describe, expect, it } from "vitest";

import { type Hit, ShakeMeter } from "./shake";

/** Feeds a path of x positions (box width 1) at a fixed rate; returns the hits. */
const run = (xs: number[], fps = 30, width = 1) => {
  const m = new ShakeMeter();
  const hits: Hit[] = [];
  xs.forEach((x, i) => {
    const h = m.push(i / fps, x * width, 0, width);
    if (h) hits.push(h);
  });
  return hits;
};

/** A side-to-side shake: `cycles` back-and-forths of `amp`, `hz` per second. */
const wave = (amp: number, hz: number, cycles: number, fps = 30) =>
  Array.from(
    { length: Math.round((cycles / hz) * fps) + 1 },
    (_, i) => amp * Math.sin((2 * Math.PI * hz * i) / fps),
  );

describe("ShakeMeter", () => {
  it("hits at each turn of a quick shake", () => {
    const hits = run(wave(0.2, 3, 2));
    // Two cycles turn about four times.
    expect(hits.length).toBeGreaterThanOrEqual(3);
    expect(hits.length).toBeLessThanOrEqual(4);
    hits.forEach((h) => expect(h.strength).toBeGreaterThan(0));
  });

  it("names the swing's direction before the turn", () => {
    const hits = run(wave(0.2, 3, 1));
    expect(hits[0].dx).toBe(1); // first swing goes right, then turns
    expect(hits[1].dx).toBe(-1);
  });

  it("never rattles on slow moves", () => {
    expect(run(wave(0.3, 0.4, 2))).toHaveLength(0);
  });

  it("ignores tiny tremble", () => {
    expect(run(wave(0.02, 6, 3))).toHaveLength(0);
  });

  it("shakes harder = stronger hits", () => {
    const soft = run(wave(0.12, 2.5, 2));
    const hard = run(wave(0.3, 4, 2));
    const max = (hs: Hit[]) => Math.max(...hs.map((h) => h.strength));
    expect(max(hard)).toBeGreaterThan(max(soft));
  });

  it("is the same for a box near or far (measured in box widths)", () => {
    expect(run(wave(0.2, 3, 2), 30, 2.5).length).toBe(
      run(wave(0.2, 3, 2), 30, 0.6).length,
    );
  });

  it("forgets the motion after a reset", () => {
    const m = new ShakeMeter();
    m.push(0, 0, 0, 1);
    m.push(0.05, 0.3, 0, 1);
    m.reset();
    expect(m.push(0.1, -0.3, 0, 1)).toBeNull();
  });
});
