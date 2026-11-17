// The present in your hands. Both palms seen → the box sits between them,
// as wide as the gap and turned with the line between your hands. No hands
// (or one) for a moment → it floats back to its resting spot, low in the
// middle, and sways gently while it waits. It always shows a little of its
// top and one side, so it reads as a box.
//
// Shake it: each quick turn of your hands rattles what's inside (shake.ts);
// the box jolts the way it swung and the lid hops. A tap anywhere does a
// short shake too (rattle.ts).
import { useEffect, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Group, PerspectiveCamera, type Object3D } from "three";
import { XRModel } from "@vincentt-xr/sdk";
import {
  useXRModelNode,
  type XRModelNodeHandTracking,
} from "@vincentt-xr/sdk/low-level";
import { handPoseToScene } from "@vincentt-xr/sdk/tracking";

import { approach, HOLD, holdBetween, palmCentre, restPlace } from "./hold";
import { PAPERS } from "./paper";
import { LID_Y, Present } from "./Present";
import { playDueRattles, rattle } from "./rattle";
import { ShakeMeter } from "./shake";
import { gift, onPaper, setMode } from "./state";

/** A rattle's jolt: how far the box moves and turns (box widths, radians). */
const JOLT = {
  move: 0.07,
  turn: 0.14,
  lid: 0.07,
  settle: 9,
  rate: 36,
} as const;

/** The box's fixed turn toward you: top tipped forward, one side showing. */
const TILT = 0.32;
const TURN = -0.38;

/** The screen's size (units) at the hand plane (z = 0). */
export const viewAtHands = (camera: PerspectiveCamera) => {
  const h = 2 * camera.position.z * Math.tan((camera.fov * Math.PI) / 360);
  return { w: h * camera.aspect, h };
};

export const Gift = () => {
  const node = useXRModelNode<XRModelNodeHandTracking>(XRModel.HAND_TRACKER);
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const outer = useRef<Group>(null);
  const inner = useRef<Group>(null);
  /** How much of the resting sway shows (eases in and out with the mode). */
  const sway = useRef(1);
  const meter = useRef(new ShakeMeter());
  /** The last held reading pushed to the shake meter. */
  const lastHeld = useRef({ x: NaN, y: NaN });
  const lid = useRef<Object3D | null>(null);
  const [paper, setPaper] = useState(gift.paper);
  useEffect(() => onPaper(setPaper), []);

  useFrame(({ clock }, delta) => {
    const now = performance.now() / 1000;
    const dt = Math.min(delta, 0.1);
    // Your palms, in scene units.
    (["left", "right"] as const).forEach((side) => {
      const pose = node?.poses?.[side] ?? null;
      gift.palms[side] = pose
        ? palmCentre(handPoseToScene(pose, camera))
        : null;
    });
    const left = gift.fake?.left ?? gift.palms.left;
    const right = gift.fake?.right ?? gift.palms.right;
    const held = left && right ? holdBetween(left, right) : null;
    if (held) {
      gift.seenAt = now;
      setMode("held", now);
      // Each new reading of your hands goes to the shake meter.
      const last = lastHeld.current;
      if (held.x !== last.x || held.y !== last.y) {
        last.x = held.x;
        last.y = held.y;
        const hit = meter.current.push(now, held.x, held.y, held.width);
        if (hit) rattle(hit.strength, hit.dx, hit.dy);
      }
    } else {
      meter.current.reset();
      if (now - gift.seenAt > HOLD.letGo) setMode("rest", now);
    }
    playDueRattles(now);

    const view = viewAtHands(camera);
    if (gift.mode === "held" && held)
      gift.at = approach(gift.at, held, HOLD.follow, dt);
    else if (gift.mode === "rest")
      gift.at = approach(gift.at, restPlace(view.w, view.h), HOLD.settle, dt);

    const o = outer.current;
    const i = inner.current;
    if (!o || !i) return;
    o.position.set(gift.at.x, gift.at.y, 0);
    o.rotation.set(0, 0, gift.at.roll);
    o.scale.setScalar(gift.at.width);
    // Resting: a gentle sway and bob, so it looks alive while it waits.
    const t = clock.elapsedTime;
    sway.current +=
      ((gift.mode === "rest" ? 1 : 0) - sway.current) * (1 - Math.exp(-6 * dt));
    const rest = sway.current;
    // The last rattle's jolt: a quick shudder the way it swung, dying away.
    const age = now - gift.hit.t;
    const k = gift.hit.strength * Math.exp(-age * JOLT.settle);
    const shudder = k * Math.sin(age * JOLT.rate);
    i.rotation.set(
      TILT + gift.hit.dy * shudder * JOLT.turn * 0.6,
      TURN + rest * Math.sin(t * 0.9) * 0.22,
      -gift.hit.dx * shudder * JOLT.turn,
    );
    i.position.set(
      gift.hit.dx * shudder * JOLT.move,
      rest * Math.sin(t * 1.6) * 0.025 + gift.hit.dy * shudder * JOLT.move,
      0,
    );
    // The lid hops on each rattle and drops back.
    if (!lid.current) lid.current = i.getObjectByName("lid") ?? null;
    if (lid.current)
      lid.current.position.y =
        LID_Y + JOLT.lid * k * Math.abs(Math.sin(age * JOLT.rate * 0.5));
  });

  return (
    <group ref={outer}>
      <group ref={inner}>
        <Present paper={PAPERS[paper]} />
      </group>
    </group>
  );
};
