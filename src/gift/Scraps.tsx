// The tear: everything that comes off the box flies away in the room.
//   paper scraps   torn pieces of the box's own paper, flung toward each hand
//                  (left half to the left, right half to the right), tumbling
//                  and falling, shrinking away at the end
//   ribbon strips  the snapped ribbon, four strips flying out from the top
//   the lid        pops straight up with its bow, tumbles and falls away
// They live in the scene, not on the box, so they keep flying when your
// hands move on.
import { useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import {
  BoxGeometry,
  Color,
  DoubleSide,
  Group,
  InstancedMesh,
  Matrix4,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  Object3D,
  Quaternion,
  Shape,
  ShapeGeometry,
  Vector3,
} from "three";

import { paperTexture, PAPERS, type Paper } from "./paper";
import { BOX, Lid } from "./Present";

const SCRAPS = 72;
const STRIPS = 4;
const GRAVITY = 7;

type Bit = {
  pos: Vector3;
  vel: Vector3;
  spinAxis: Vector3;
  spin: number;
  turn: Quaternion;
  size: number;
  born: number;
  life: number;
};

const newBit = (): Bit => ({
  pos: new Vector3(),
  vel: new Vector3(),
  spinAxis: new Vector3(0, 1, 0),
  spin: 0,
  turn: new Quaternion(),
  size: 0,
  born: -1e9,
  life: 0,
});

/** A torn scrap: a jagged little polygon, one unit across. */
const scrapGeometry = () => {
  const shape = new Shape();
  const n = 9;
  Array.from({ length: n }).forEach((_, i) => {
    const a = (i / n) * Math.PI * 2;
    const r = 0.5 * (0.62 + 0.38 * Math.abs(Math.sin(i * 2.7 + 1.3)));
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r * 0.8;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  });
  shape.closePath();
  const geo = new ShapeGeometry(shape);
  // The paper's pattern at about its size on the box.
  const uv = geo.getAttribute("uv");
  Array.from({ length: uv.count }).forEach((_, i) => {
    uv.setXY(i, uv.getX(i) * 0.4, uv.getY(i) * 0.4);
  });
  return geo;
};

/** What the tear needs to know about the box at the moment it tears. */
export type TearFrom = {
  /** The box's world matrix (one unit wide in its own frame). */
  box: Matrix4;
  /** The lid's world matrix. */
  lid: Matrix4;
  /** The box's width in scene units. */
  width: number;
  paper: number;
};

const pending: TearFrom[] = [];

/** Rip the box apart (Gift.tsx calls this; Scraps flies the pieces). */
export const flyApart = (from: TearFrom) => {
  pending.push(from);
};

const rnd = (lo: number, hi: number) => lo + Math.random() * (hi - lo);

/** A point on the paper (front, top or a side) in the box's own frame, and its outward normal. */
const surfacePoint = () => {
  const { width: w, height: h, depth: d } = BOX;
  const face = Math.random();
  if (face < 0.5)
    return {
      p: new Vector3(rnd(-w / 2, w / 2), rnd(-h / 2, h / 2), d / 2),
      n: new Vector3(0, 0, 1),
    };
  if (face < 0.7)
    return {
      p: new Vector3(rnd(-w / 2, w / 2), h / 2, rnd(-d / 2, d / 2)),
      n: new Vector3(0, 1, 0),
    };
  const side = face < 0.85 ? -1 : 1;
  return {
    p: new Vector3((side * w) / 2, rnd(-h / 2, h / 2), rnd(-d / 2, d / 2)),
    n: new Vector3(side, 0, 0),
  };
};

export const Scraps = () => {
  const scrapGeo = useMemo(scrapGeometry, []);
  const stripGeo = useMemo(() => new BoxGeometry(BOX.ribbon, 0.012, 0.55), []);
  const scrapMat = useMemo(
    () =>
      new MeshStandardMaterial({
        side: DoubleSide,
        roughness: 0.5,
        map: paperTexture(PAPERS[0]),
      }),
    [],
  );
  const stripMat = useMemo(
    () => new MeshPhysicalMaterial({ roughness: 0.3, clearcoat: 1 }),
    [],
  );
  const scraps = useRef<InstancedMesh>(null);
  const strips = useRef<InstancedMesh>(null);
  const lidGroup = useRef<Group>(null);
  const bits = useMemo(
    () => ({
      scraps: Array.from({ length: SCRAPS }, newBit),
      strips: Array.from({ length: STRIPS }, newBit),
      lid: newBit(),
    }),
    [],
  );
  const [lidPaper, setLidPaper] = useState<Paper>(PAPERS[0]);
  const dummy = useMemo(() => new Object3D(), []);
  const tmp = useMemo(
    () => ({ q: new Quaternion(), s: new Vector3(), v: new Vector3() }),
    [],
  );

  const launch = (from: TearFrom, now: number) => {
    const paper = PAPERS[from.paper];
    scrapMat.map = paperTexture(paper);
    scrapMat.needsUpdate = true;
    stripMat.color = new Color(paper.ribbon);
    setLidPaper(paper);
    const w = from.width;
    const kick = Math.max(0.7, w);
    const turn = new Quaternion();
    from.box.decompose(tmp.v, turn, tmp.s);
    // Paper scraps: each flies out from where it was, toward its own side.
    bits.scraps.forEach((b) => {
      const { p, n } = surfacePoint();
      const side = p.x === 0 ? Math.sign(Math.random() - 0.5) : Math.sign(p.x);
      b.pos.copy(p).applyMatrix4(from.box);
      const out = n.applyQuaternion(turn);
      b.vel
        .set(side * rnd(1.4, 3.2), rnd(0.6, 2.4), rnd(0.4, 1.4))
        .add(out.multiplyScalar(rnd(0.5, 1.2)))
        .multiplyScalar(kick);
      b.spinAxis.set(rnd(-1, 1), rnd(-1, 1), rnd(-1, 1)).normalize();
      b.turn.copy(turn);
      Object.assign(b, {
        spin: rnd(5, 12),
        size: rnd(0.12, 0.24) * w,
        born: now,
        life: rnd(1.0, 1.6),
      });
    });
    // Ribbon strips: out from the top in four directions.
    bits.strips.forEach((b, i) => {
      const a = (i / STRIPS) * Math.PI * 2 + Math.PI / 4;
      const dir = new Vector3(Math.cos(a), 0, Math.sin(a));
      b.pos
        .set(dir.x * 0.25, BOX.height / 2 + BOX.lidHeight, dir.z * 0.25)
        .applyMatrix4(from.box);
      b.vel
        .copy(dir.applyQuaternion(turn))
        .multiplyScalar(rnd(2.2, 3.2))
        .add(new Vector3(0, rnd(1.5, 2.5), 0.6))
        .multiplyScalar(kick);
      b.spinAxis.set(rnd(-1, 1), rnd(-1, 1), rnd(-1, 1)).normalize();
      b.turn
        .copy(turn)
        .multiply(new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), a));
      Object.assign(b, { spin: rnd(6, 10), size: w, born: now, life: 1.3 });
    });
    // The lid pops straight up, a little toward you, and tumbles.
    const { lid } = bits;
    from.lid.decompose(lid.pos, lid.turn, tmp.s);
    lid.size = tmp.s.x;
    // …and off to one side, so it never falls back over the box.
    const away = Math.random() < 0.5 ? -1 : 1;
    lid.vel.set(away * rnd(1.1, 1.6), rnd(2.6, 3.1), 0.8).multiplyScalar(kick);
    lid.spinAxis.set(rnd(-0.3, 0.3), rnd(-0.2, 0.2), 1).normalize();
    lid.spin = rnd(-5, 5) || 3;
    Object.assign(lid, { born: now, life: 1.4 });
  };

  /** Moves a bit for dt (s). Returns how much of it shows (0 = gone). */
  const step = (b: Bit, now: number, dt: number) => {
    const age = now - b.born;
    if (age > b.life) return 0;
    b.vel.add(tmp.v.set(0, -GRAVITY * dt, 0));
    b.vel.multiplyScalar(1 - 0.6 * dt); // air slows the light paper
    b.pos.addScaledVector(b.vel, dt);
    b.turn.multiply(tmp.q.setFromAxisAngle(b.spinAxis, b.spin * dt));
    // Shrink away over the last third of its life (ease-out).
    const end = (age - b.life * 0.66) / (b.life * 0.34);
    return end <= 0 ? 1 : 1 - Math.min(1, end) ** 2;
  };

  useFrame((_, delta) => {
    const now = performance.now() / 1000;
    const dt = Math.min(delta, 0.05);
    while (pending.length) launch(pending.shift()!, now);
    const sm = scraps.current;
    const st = strips.current;
    const lg = lidGroup.current;
    if (!sm || !st || !lg) return;
    bits.scraps.forEach((b, i) => {
      const k = step(b, now, dt);
      dummy.position.copy(b.pos);
      dummy.quaternion.copy(b.turn);
      dummy.scale.setScalar(Math.max(1e-4, b.size * k));
      dummy.updateMatrix();
      sm.setMatrixAt(i, dummy.matrix);
    });
    sm.instanceMatrix.needsUpdate = true;
    bits.strips.forEach((b, i) => {
      const k = step(b, now, dt);
      dummy.position.copy(b.pos);
      dummy.quaternion.copy(b.turn);
      dummy.scale.set(
        b.size * k || 1e-4,
        b.size * k || 1e-4,
        b.size * k * 0.9 || 1e-4,
      );
      dummy.updateMatrix();
      st.setMatrixAt(i, dummy.matrix);
    });
    st.instanceMatrix.needsUpdate = true;
    const k = step(bits.lid, now, dt);
    lg.visible = k > 0;
    lg.position.copy(bits.lid.pos);
    lg.quaternion.copy(bits.lid.turn);
    lg.scale.setScalar(Math.max(1e-4, bits.lid.size * k));
  });

  return (
    <>
      <instancedMesh
        ref={scraps}
        args={[scrapGeo, scrapMat, SCRAPS]}
        frustumCulled={false}
      />
      <instancedMesh
        ref={strips}
        args={[stripGeo, stripMat, STRIPS]}
        frustumCulled={false}
      />
      <group ref={lidGroup} visible={false}>
        <Lid paper={lidPaper} />
      </group>
    </>
  );
};
