// The wordless hint: while the box waits, two soft white hands slide in from
// either side and stop at its sides, as if to pick it up, then fade and
// start again. It fades away as soon as your hands hold the box.
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  CanvasTexture,
  DoubleSide,
  Group,
  MeshBasicMaterial,
  PlaneGeometry,
  SRGBColorSpace,
} from "three";

import { gift } from "./state";

/** One loop (s): slide in, hold at the box, fade, rest. */
const LOOP = { in: 1.0, hold: 0.7, out: 0.4, gap: 0.4 } as const;
const PERIOD = LOOP.in + LOOP.hold + LOOP.out + LOOP.gap;
/** How far out each hand starts (in box widths), and its height (box widths). */
const SLIDE = 0.55;
const HAND_H = 0.75;
/** The hint shows this long after the box comes to rest (s). */
const DELAY = 0.8;

/** An open hand, fingers up, thumb toward the box (on the right). Drawn once. */
const handTexture = () => {
  const W = 256;
  const H = 320;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const c = canvas.getContext("2d")!;
  const shape = () => {
    c.beginPath();
    c.roundRect(64, 150, 118, 128, 44); // palm
    // Fingers: little, ring, middle, index (left to right), round-ended.
    const fingers = [
      [72, 92, 24],
      [100, 58, 26],
      [130, 46, 26],
      [160, 64, 25],
    ];
    fingers.forEach(([x, top, w]) =>
      c.roundRect(x - w / 2, top, w, 190 - top, w / 2),
    );
    c.fill();
    // Thumb, angled out toward the box.
    c.save();
    c.translate(176, 214);
    c.rotate(-0.75);
    c.beginPath();
    c.roundRect(-14, -84, 28, 96, 14);
    c.fill();
    c.restore();
  };
  // A soft dark halo first (reads on bright rooms), then the white hand.
  c.shadowColor = "rgba(10, 20, 40, 0.55)";
  c.shadowBlur = 22;
  c.fillStyle = "rgba(255, 255, 255, 0.92)";
  shape();
  c.shadowBlur = 0;
  shape();
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  return { tex, aspect: W / H };
};

const easeOut = (k: number) => 1 - (1 - Math.min(1, Math.max(0, k))) ** 3;

/** The hands fade in as they slide, stay at the box, then fade out. */
const fadeAt = (p: number) => {
  if (p < LOOP.in * 0.4) return easeOut(p / (LOOP.in * 0.4));
  if (p < LOOP.in + LOOP.hold) return 1;
  return 1 - easeOut((p - LOOP.in - LOOP.hold) / LOOP.out);
};

export const Hint = () => {
  const { geo, mat } = useMemo(() => {
    const { tex, aspect } = handTexture();
    return {
      geo: new PlaneGeometry(aspect, 1),
      mat: new MeshBasicMaterial({
        map: tex,
        transparent: true,
        depthTest: false,
        depthWrite: false,
        side: DoubleSide,
        opacity: 0,
      }),
    };
  }, []);
  const left = useRef<Group>(null);
  const right = useRef<Group>(null);
  const shown = useRef(0);

  useFrame((_, delta) => {
    const now = performance.now() / 1000;
    const want = gift.mode === "rest" && now - gift.since > DELAY ? 1 : 0;
    shown.current +=
      (want - shown.current) * (1 - Math.exp(-5 * Math.min(delta, 0.1)));
    const l = left.current;
    const r = right.current;
    if (!l || !r) return;
    const visible = shown.current > 0.01;
    l.visible = visible;
    r.visible = visible;
    if (!visible) return;
    const p = (now - gift.since - DELAY) % PERIOD;
    const slide = 1 - easeOut(p / LOOP.in);
    const fade = fadeAt(p);
    mat.opacity = shown.current * fade * 0.9;
    const w = gift.at.width;
    const x = w * (0.5 + 0.18 + SLIDE * slide);
    (
      [
        [l, -1],
        [r, 1],
      ] as const
    ).forEach(([g, s]) => {
      g.position.set(gift.at.x + s * x, gift.at.y + w * 0.05, 0.6);
      // The right-hand hint is the left one mirrored (thumb toward the box).
      g.scale.set(-s * w * HAND_H, w * HAND_H, 1);
    });
  });

  return (
    <>
      <group ref={left} renderOrder={500}>
        <mesh geometry={geo} material={mat} renderOrder={500} />
      </group>
      <group ref={right} renderOrder={500}>
        <mesh geometry={geo} material={mat} renderOrder={500} />
      </group>
    </>
  );
};
