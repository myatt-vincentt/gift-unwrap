import { describe, expect, it } from "vitest";

import { approach, HOLD, holdBetween, palmCentre, restPlace } from "./hold";

describe("holdBetween", () => {
  it("puts the box halfway between the palms, a bit narrower than the gap", () => {
    const p = holdBetween({ x: -1, y: 0.2 }, { x: 1, y: 0.2 })!;
    expect(p.x).toBeCloseTo(0);
    expect(p.y).toBeCloseTo(0.2);
    expect(p.width).toBeCloseTo(2 * HOLD.ofGap);
    expect(p.roll).toBeCloseTo(0);
  });

  it("is the same whichever hand comes first", () => {
    const a = holdBetween({ x: -1, y: 0 }, { x: 1, y: 0.5 })!;
    const b = holdBetween({ x: 1, y: 0.5 }, { x: -1, y: 0 })!;
    expect(a).toEqual(b);
  });

  it("turns with the line between the hands (right hand higher = anticlockwise)", () => {
    expect(
      holdBetween({ x: -1, y: 0 }, { x: 1, y: 0.5 })!.roll,
    ).toBeGreaterThan(0);
    expect(holdBetween({ x: -1, y: 0.5 }, { x: 1, y: 0 })!.roll).toBeLessThan(
      0,
    );
  });

  it("limits the turn and the size", () => {
    const steep = holdBetween({ x: 0, y: -2 }, { x: 0.1, y: 2 })!;
    expect(steep.roll).toBeCloseTo(HOLD.maxRoll);
    expect(holdBetween({ x: -5, y: 0 }, { x: 5, y: 0 })!.width).toBe(
      HOLD.maxWidth,
    );
  });

  it("holds nothing when the palms are together", () => {
    expect(holdBetween({ x: 0, y: 0 }, { x: 0.2, y: 0 })).toBeNull();
  });
});

describe("palmCentre", () => {
  it("averages the wrist and three knuckles", () => {
    const joints = Array.from({ length: 21 }, () => ({ x: 9, y: 9 }));
    joints[0] = { x: 0, y: 0 };
    joints[5] = { x: 1, y: 1 };
    joints[9] = { x: 1, y: 2 };
    joints[17] = { x: 2, y: 1 };
    expect(palmCentre(joints)).toEqual({ x: 1, y: 1 });
  });
});

describe("approach", () => {
  it("eases toward the target without passing it", () => {
    let at = { x: 0, y: 0, width: 1, roll: 0 };
    const to = { x: 1, y: -1, width: 2, roll: 0.5 };
    let last = 0;
    for (let i = 0; i < 120; i++) {
      at = approach(at, to, HOLD.follow, 1 / 60);
      expect(at.x).toBeGreaterThanOrEqual(last);
      expect(at.x).toBeLessThanOrEqual(1);
      last = at.x;
    }
    expect(at.x).toBeCloseTo(1, 3);
    expect(at.width).toBeCloseTo(2, 3);
  });
});

describe("restPlace", () => {
  it("sits below the middle and fits a narrow phone screen", () => {
    const p = restPlace(2.33, 4.14);
    expect(p.y).toBeLessThan(0);
    expect(p.width).toBeLessThan(2.33 / 2);
  });
});
