// Development only: try the present without a camera.
//
//   Shift + hold the mouse button on the picture: two fake palms hold the
//   box around the pointer (drag quickly to shake it). Scroll to move them
//   apart / together; Q / E tilt. A plain click is a tap (shakes the box).
//   N                 the next paper
//   I                 what's inside next (puppy → confetti → snow)
//   window.__gift     the shared state
//
// Never reaches production: Scene.tsx lazy-imports this behind an inline
// `process.env.NODE_ENV` check, which esbuild folds.
import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import type { PerspectiveCamera } from "three";

import { viewAtHands } from "./Gift";
import { gift, INSIDES, nextPaper } from "./state";

const DevGift = () => {
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const gl = useThree((s) => s.gl);

  useEffect(() => {
    const el = gl.domElement;
    const fake = { down: false, x: 0, y: 0, gap: 1.6, tilt: 0 };
    const place = () => {
      if (!fake.down) {
        gift.fake = null;
        return;
      }
      const dx = (Math.cos(fake.tilt) * fake.gap) / 2;
      const dy = (Math.sin(fake.tilt) * fake.gap) / 2;
      gift.fake = {
        left: { x: fake.x - dx, y: fake.y - dy },
        right: { x: fake.x + dx, y: fake.y + dy },
      };
    };
    const toScene = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const v = viewAtHands(camera);
      fake.x = ((e.clientX - r.left) / r.width - 0.5) * v.w;
      fake.y = (0.5 - (e.clientY - r.top) / r.height) * v.h;
    };
    const down = (e: PointerEvent) => {
      if (!e.shiftKey) return;
      fake.down = true;
      toScene(e);
      place();
    };
    const move = (e: PointerEvent) => {
      if (!fake.down) return;
      toScene(e);
      place();
    };
    const up = () => {
      fake.down = false;
      place();
    };
    const wheel = (e: WheelEvent) => {
      fake.gap = Math.min(4, Math.max(0.3, fake.gap - e.deltaY * 0.003));
      place();
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === "n" || e.key === "N") nextPaper();
      if (e.key === "i" || e.key === "I") {
        const i = INSIDES.indexOf(gift.inside);
        gift.inside = INSIDES[(i + 1) % INSIDES.length];
      }
      if (e.key === "q") fake.tilt += 0.1;
      if (e.key === "e") fake.tilt -= 0.1;
      place();
    };
    window.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("wheel", wheel, { passive: true });
    window.addEventListener("keydown", key);
    (window as unknown as { __gift: unknown }).__gift = {
      gift,
      nextPaper,
      fake,
      place,
    };
    return () => {
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("wheel", wheel);
      window.removeEventListener("keydown", key);
    };
  }, [camera, gl]);
  return null;
};

export default DevGift;
