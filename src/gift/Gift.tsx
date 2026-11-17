// The present in your hands. Both palms seen → the box sits between them,
// as wide as the gap and turned with the line between your hands. No hands
// (or one) for a moment → it floats back to its resting spot, low in the
// middle, and sways gently while it waits. It always shows a little of its
// top and one side, so it reads as a box.
//
// Shake it: each quick turn of your hands rattles what's inside (shake.ts);
// the box jolts the way it swung and the lid hops. A tap anywhere does a
// short shake too (rattle.ts).
//
// Tear it: pull your hands apart quickly (tear.ts), or pinch out on the
// screen. The ribbon snaps, the paper flies off in scraps and the lid pops
// away (Scraps.tsx); the plain box stays in your hands, tissue peeking out.
// The surprise comes out (the puppy peeks out of the box, confetti bursts
// up, or a snow cloud floats up over your head); then the open box shrinks
// away and a new box in the next paper grows in.
import { Suspense, useEffect, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Group, PerspectiveCamera, Vector3 } from "three";
import { XRModel } from "@vincentt-xr/sdk";
import {
  useXRModelNode,
  type XRModelNodeHandTracking,
} from "@vincentt-xr/sdk/low-level";
import { handPoseToScene } from "@vincentt-xr/sdk/tracking";

import { approach, HOLD, holdBetween, palmCentre, restPlace } from "./hold";
import { PAPERS } from "./paper";
import { burstConfetti } from "./Confetti";
import { BOX, LID_Y, Present } from "./Present";
import { Puppy } from "./Puppy";
import { releaseCloud } from "./SnowCloud";
import { playTear } from "./audio";
import { playDueRattles, rattle } from "./rattle";
import { flyApart } from "./Scraps";
import { ShakeMeter } from "./shake";
import { gift, newInside, nextPaper, onPaper, setMode } from "./state";
import { gapOf, TearMeter } from "./tear";
import { viewAtHands } from "./view";

/** The open box and its surprise stay this long (s); the box shrinks away at the end. */
const OPEN_FOR = 4.6;
const SHRINK = 0.35;
/** A new box grows in over this long (s), easing out. */
const GROW_IN = 0.45;

const easeOut = (k: number) => 1 - (1 - Math.min(1, Math.max(0, k))) ** 3;

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

export const Gift = () => {
  const node = useXRModelNode<XRModelNodeHandTracking>(XRModel.HAND_TRACKER);
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const outer = useRef<Group>(null);
  const inner = useRef<Group>(null);
  /** How much of the resting sway shows (eases in and out with the mode). */
  const sway = useRef(1);
  const meter = useRef(new ShakeMeter());
  /** The last held reading pushed to the shake meter. */
  const lastHeld = useRef({ lx: NaN, ly: NaN, rx: NaN, ry: NaN });
  const tearMeter = useRef(new TearMeter());
  /**
   * The box's width followed slowly: the size it had before a quick pull.
   * The open box keeps that size (a pull apart opens it, it doesn't grow it).
   */
  const calmWidth = useRef(gift.at.width);
  const openWidth = useRef(gift.at.width);
  const [paper, setPaper] = useState(gift.paper);
  const [opened, setOpened] = useState(false);

  /** Rip the box open: pieces fly from where the box is right now. */
  const tearOpen = (now: number) => {
    const i = inner.current;
    const lidObj = i?.getObjectByName("lid");
    if (!i || !lidObj) return;
    i.updateWorldMatrix(true, true);
    flyApart({
      box: i.matrixWorld.clone(),
      lid: lidObj.matrixWorld.clone(),
      width: gift.at.width,
      paper: gift.paper,
    });
    openWidth.current = Math.min(gift.at.width, calmWidth.current);
    playTear();
    // The surprise comes out of the opening.
    const top = i.localToWorld(new Vector3(0, BOX.height / 2, 0));
    if (gift.inside === "confetti") burstConfetti(top, gift.at.width);
    if (gift.inside === "snow") releaseCloud(top, openWidth.current);
    gift.phase = "open";
    gift.openedAt = now;
    meter.current.reset();
    tearMeter.current.reset();
    setOpened(true);
  };
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
      // (A new reading moves either palm; a pull apart keeps the centre still.)
      const last = lastHeld.current;
      if (
        left!.x !== last.lx ||
        left!.y !== last.ly ||
        right!.x !== last.rx ||
        right!.y !== last.ry
      ) {
        Object.assign(last, {
          lx: left!.x,
          ly: left!.y,
          rx: right!.x,
          ry: right!.y,
        });
        if (gift.phase === "wrapped") {
          const hit = meter.current.push(now, held.x, held.y, held.width);
          if (hit) rattle(hit.strength, hit.dx, hit.dy);
          if (tearMeter.current.push(now, gapOf(left!, right!)))
            gift.tearAsked = true;
        }
      }
    } else {
      meter.current.reset();
      tearMeter.current.reset();
      if (now - gift.seenAt > HOLD.letGo) setMode("rest", now);
    }
    playDueRattles(now);
    if (gift.tearAsked) {
      gift.tearAsked = false;
      if (gift.phase === "wrapped" && now - gift.bornAt > GROW_IN)
        tearOpen(now);
    }
    // The next box: a new secret inside and the next paper.
    if (gift.phase === "open" && now - gift.openedAt > OPEN_FOR) {
      newInside();
      nextPaper();
      gift.phase = "wrapped";
      gift.bornAt = now;
      gift.hit = { t: -1e9, strength: 0, dx: 0, dy: 0 };
      setOpened(false);
    }

    const view = viewAtHands(camera);
    if (gift.mode === "held" && held)
      gift.at = approach(
        gift.at,
        gift.phase === "open" ? { ...held, width: openWidth.current } : held,
        HOLD.follow,
        dt,
      );
    else if (gift.mode === "rest")
      gift.at = approach(gift.at, restPlace(view.w, view.h), HOLD.settle, dt);

    calmWidth.current +=
      (gift.at.width - calmWidth.current) * (1 - Math.exp(-3 * dt));
    const o = outer.current;
    const i = inner.current;
    if (!o || !i) return;
    o.position.set(gift.at.x, gift.at.y, 0);
    o.rotation.set(0, 0, gift.at.roll);
    const leaving =
      gift.phase === "open"
        ? 1 - easeOut((now - gift.openedAt - (OPEN_FOR - SHRINK)) / SHRINK)
        : 1;
    o.scale.setScalar(
      Math.max(
        1e-4,
        gift.at.width * easeOut((now - gift.bornAt) / GROW_IN) * leaving,
      ),
    );
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
    const lidObj = i.getObjectByName("lid");
    if (lidObj)
      lidObj.position.y =
        LID_Y + JOLT.lid * k * Math.abs(Math.sin(age * JOLT.rate * 0.5));
  });

  return (
    <group ref={outer}>
      <group ref={inner}>
        <Present paper={PAPERS[paper]} opened={opened} />
        {opened && gift.inside === "puppy" ? (
          <Suspense fallback={null}>
            <Puppy />
          </Suspense>
        ) : null}
      </group>
    </group>
  );
};
