import { describe, expect, it } from "vitest";

import { TEAR, TearMeter } from "./tear";

/** Feeds gaps at 30 per second, starting at t0; returns the first tear time or null. */
const run = (gaps: number[], m = new TearMeter(), t0 = 0) => {
  let at: number | null = null;
  gaps.forEach((g, i) => {
    if (m.push(t0 + i / 30, g) && at === null) at = t0 + i / 30;
  });
  return at;
};

const hold = (gap: number, secs: number) =>
  Array.from({ length: Math.round(secs * 30) }, () => gap);
const ramp = (from: number, to: number, secs: number) => {
  const n = Math.max(1, Math.round(secs * 30));
  return Array.from(
    { length: n },
    (_, i) => from + ((to - from) * (i + 1)) / n,
  );
};

describe("TearMeter", () => {
  it("tears on a quick pull apart", () => {
    expect(run([...hold(1.6, 1), ...ramp(1.6, 2.6, 0.25)])).not.toBeNull();
  });

  it("does not tear when the hands widen slowly", () => {
    expect(run([...hold(1.6, 1), ...ramp(1.6, 3.2, 2)])).toBeNull();
  });

  it("does not tear on a small quick move", () => {
    expect(run([...hold(1.6, 1), ...ramp(1.6, 1.9, 0.2)])).toBeNull();
  });

  it("never tears while the hands are just arriving", () => {
    expect(run(ramp(0.8, 2.4, TEAR.minHeld * 0.8))).toBeNull();
  });

  it("tears once per pull, and starts over after a reset", () => {
    const m = new TearMeter();
    expect(run([...hold(1.6, 1), ...ramp(1.6, 2.6, 0.25)], m)).not.toBeNull();
    m.reset();
    expect(run(hold(2.6, 0.3), m, 2)).toBeNull();
  });
});
