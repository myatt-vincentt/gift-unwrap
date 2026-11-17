// A quick tap anywhere on the picture shakes the box (a long press, a drag
// or a tap on a button does not). Listened for on the page, because layers
// over the canvas take the touches first. It also switches sound on: browsers only allow sound
// after the first touch.
import { useEffect } from "react";

import { unlockAudioOnFirstTouch } from "./audio";
import { tapShake } from "./rattle";

/** A tap is shorter than this (ms) and moves less than this (px). */
const TAP = { ms: 350, px: 14 } as const;

export const TapToShake = () => {
  useEffect(() => {
    unlockAudioOnFirstTouch();
    /** Taps on controls (buttons, links, menus, fields) are theirs, not a shake. */
    const onControl = (e: Event) =>
      e.target instanceof Element &&
      !!e.target.closest(
        "button, a, input, select, textarea, label, [role='button'], [role='menu'], [role='dialog']",
      );
    let start: { t: number; x: number; y: number } | null = null;
    const down = (e: PointerEvent) => {
      if (onControl(e)) return;
      start = { t: performance.now(), x: e.clientX, y: e.clientY };
    };
    const up = (e: PointerEvent) => {
      if (!start) return;
      const quick = performance.now() - start.t < TAP.ms;
      const still =
        Math.hypot(e.clientX - start.x, e.clientY - start.y) < TAP.px;
      start = null;
      if (quick && still && !e.shiftKey) tapShake();
    };
    window.addEventListener("pointerdown", down);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("pointerup", up);
    };
  }, []);
  return null;
};
