// Touch controls, for phones (one hand holds the phone) and anyone without
// both hands free:
//   a quick tap anywhere on the picture   shakes the box
//   two fingers spreading apart quickly   tears it open (like pulling hands apart)
// A long press, a drag or a tap on a button does nothing here. Listened for
// on the page, because layers over the canvas take the touches first. The
// first touch also switches sound on (browsers only allow sound after it).
import { useEffect } from "react";

import { unlockAudioOnFirstTouch } from "./audio";
import { tapShake } from "./rattle";
import { gift } from "./state";

/** A tap is shorter than this (ms) and moves less than this (px). */
const TAP = { ms: 350, px: 14 } as const;
/** A pinch-out spreads by this much of its start (and at least `px`) within `ms`. */
const PINCH = { growth: 0.4, px: 50, ms: 600 } as const;

export const TapToShake = () => {
  useEffect(() => {
    unlockAudioOnFirstTouch();
    /** Taps on controls (buttons, links, menus, fields) are theirs, not a shake. */
    const onControl = (e: Event) =>
      e.target instanceof Element &&
      !!e.target.closest(
        "button, a, input, select, textarea, label, [role='button'], [role='menu'], [role='dialog']",
      );
    const fingers = new Map<number, { x: number; y: number }>();
    let tap: { t: number; x: number; y: number } | null = null;
    let pinch: { t: number; d: number } | null = null;
    const spread = () => {
      const [a, b] = [...fingers.values()];
      return Math.hypot(a.x - b.x, a.y - b.y);
    };

    const down = (e: PointerEvent) => {
      if (onControl(e)) return;
      fingers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (fingers.size === 1)
        tap = { t: performance.now(), x: e.clientX, y: e.clientY };
      if (fingers.size === 2) {
        // Two fingers are a pinch, never a tap.
        tap = null;
        pinch = { t: performance.now(), d: spread() };
      }
    };
    const move = (e: PointerEvent) => {
      if (!fingers.has(e.pointerId)) return;
      fingers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (!pinch || fingers.size !== 2) return;
      const d = spread();
      if (performance.now() - pinch.t > PINCH.ms) {
        // Too slow: measure again from here.
        pinch = { t: performance.now(), d };
        return;
      }
      if (d - pinch.d >= Math.max(PINCH.px, PINCH.growth * pinch.d)) {
        pinch = null;
        gift.tearAsked = true;
      }
    };
    const up = (e: PointerEvent) => {
      if (!fingers.delete(e.pointerId)) return;
      if (fingers.size < 2) pinch = null;
      if (!tap) return;
      const quick = performance.now() - tap.t < TAP.ms;
      const still = Math.hypot(e.clientX - tap.x, e.clientY - tap.y) < TAP.px;
      tap = null;
      if (quick && still && !e.shiftKey) tapShake();
    };
    window.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, []);
  return null;
};
