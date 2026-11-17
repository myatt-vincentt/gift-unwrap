// The confetti surprise: a burst of paper confetti shoots up out of the open
// box, spreads wide, then flutters down slowly across the screen, each piece
// turning as it falls, and shrinks away at the end.
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  Color,
  DoubleSide,
  InstancedMesh,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
  Quaternion,
  Vector3,
} from "three";

const COUNT = 160;
/** Bright party colours (the paper's own colours are mixed in too). */
const COLOURS = [
  "#ff4f6d",
  "#ffd23f",
  "#3ec1ff",
  "#7cf29a",
  "#b98bff",
  "#ffffff",
  "#ff9a3c",
];
/** How long a piece flies (s), and its fall speed limit (units/s) — paper drifts. */
const LIFE = [2.6, 3.6] as const;
const GRAVITY = 5;
const DRIFT = 0.9;

type Piece = {
  pos: Vector3;
  vel: Vector3;
  axis: Vector3;
  spin: number;
  turn: Quaternion;
  size: number;
  life: number;
  flutter: number;
};

const rnd = (lo: number, hi: number) => lo + Math.random() * (hi - lo);

/** Ask for a burst from a point in the scene, sized to a box `width` wide. */
const asked: { at: Vector3; width: number }[] = [];
export const burstConfetti = (at: Vector3, width: number) => {
  asked.push({ at: at.clone(), width });
};

export const Confetti = () => {
  const geo = useMemo(() => new PlaneGeometry(1, 0.55), []);
  const mat = useMemo(
    () => new MeshStandardMaterial({ side: DoubleSide, roughness: 0.55 }),
    [],
  );
  const mesh = useRef<InstancedMesh>(null);
  const pieces = useMemo<Piece[]>(
    () =>
      Array.from({ length: COUNT }, () => ({
        pos: new Vector3(),
        vel: new Vector3(),
        axis: new Vector3(0, 1, 0),
        spin: 0,
        turn: new Quaternion(),
        size: 0,
        life: 0,
        flutter: 0,
      })),
    [],
  );
  const born = useRef(-1e9);
  const dummy = useMemo(() => new Object3D(), []);
  const q = useMemo(() => new Quaternion(), []);
  const fall = useMemo(() => new Vector3(), []);
  const colour = useMemo(() => new Color(), []);

  useFrame((_, delta) => {
    const now = performance.now() / 1000;
    const dt = Math.min(delta, 0.05);
    const m = mesh.current;
    if (!m) return;
    const go = asked.shift();
    if (go) {
      born.current = now;
      const kick = Math.max(0.7, go.width);
      pieces.forEach((p, i) => {
        p.pos
          .copy(go.at)
          .add(
            new Vector3(rnd(-0.2, 0.2), 0, rnd(-0.1, 0.1)).multiplyScalar(
              go.width,
            ),
          );
        // Up and out in a wide fountain, a little toward you.
        const a = rnd(-1.15, 1.15);
        const speed = rnd(3.2, 6.2);
        p.vel
          .set(Math.sin(a) * speed * 0.75, Math.cos(a) * speed, rnd(0, 1.4))
          .multiplyScalar(kick);
        p.axis.set(rnd(-1, 1), rnd(-1, 1), rnd(-1, 1)).normalize();
        p.turn.setFromAxisAngle(p.axis, rnd(0, Math.PI * 2));
        Object.assign(p, {
          spin: rnd(4, 11),
          size: rnd(0.07, 0.12) * go.width,
          life: rnd(LIFE[0], LIFE[1]),
          flutter: rnd(0, Math.PI * 2),
        });
        colour.set(COLOURS[i % COLOURS.length]);
        m.setColorAt(i, colour);
      });
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
    }
    const age = now - born.current;
    pieces.forEach((p, i) => {
      let k = 0;
      if (age < p.life) {
        p.vel.add(fall.set(0, -GRAVITY * dt, 0));
        // Air: fast at first, then a slow drifting fall with a little sway.
        p.vel.multiplyScalar(1 - Math.min(0.9, 2.2 * dt));
        if (p.vel.y < -DRIFT) p.vel.setY(-DRIFT);
        p.pos.addScaledVector(p.vel, dt);
        p.pos.setX(p.pos.x + Math.sin(age * 3 + p.flutter) * 0.25 * dt);
        p.turn.multiply(q.setFromAxisAngle(p.axis, p.spin * dt));
        const end = (age - p.life * 0.75) / (p.life * 0.25);
        k = end <= 0 ? 1 : 1 - Math.min(1, end) ** 2;
      }
      dummy.position.copy(p.pos);
      dummy.quaternion.copy(p.turn);
      dummy.scale.setScalar(Math.max(1e-4, p.size * k));
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
    m.visible = age < LIFE[1];
  });

  return (
    <instancedMesh
      ref={mesh}
      args={[geo, mat, COUNT]}
      frustumCulled={false}
      visible={false}
      onUpdate={(m) => {
        // Give it colours from the start, so the first burst can set them.
        if (!m.instanceColor) m.setColorAt(0, new Color("#ffffff"));
      }}
    />
  );
};
