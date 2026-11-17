// The present in your hands. Both palms seen → the box sits between them,
// as wide as the gap and turned with the line between your hands. No hands
// (or one) for a moment → it floats back to its resting spot, low in the
// middle, and sways gently while it waits. It always shows a little of its
// top and one side, so it reads as a box.
import { useEffect, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Group, PerspectiveCamera } from "three";
import { XRModel } from "@vincentt-xr/sdk";
import {
  useXRModelNode,
  type XRModelNodeHandTracking,
} from "@vincentt-xr/sdk/low-level";
import { handPoseToScene } from "@vincentt-xr/sdk/tracking";

import { approach, HOLD, holdBetween, palmCentre, restPlace } from "./hold";
import { PAPERS } from "./paper";
import { Present } from "./Present";
import { gift, onPaper, setMode } from "./state";

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
    } else if (now - gift.seenAt > HOLD.letGo) setMode("rest", now);

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
    i.rotation.set(TILT, TURN + rest * Math.sin(t * 0.9) * 0.22, 0);
    i.position.y = rest * Math.sin(t * 1.6) * 0.025;
  });

  return (
    <group ref={outer}>
      <group ref={inner}>
        <Present paper={PAPERS[paper]} />
      </group>
    </group>
  );
};
