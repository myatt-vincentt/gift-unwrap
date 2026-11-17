// The present: a glossy toy box with a lid, wrapped in patterned paper, with
// a satin ribbon crossing over the top and a bow. Built in code at one unit
// wide; the parent scales it to your hands.
import { useMemo } from "react";
import {
  BoxGeometry,
  BufferGeometry,
  Color,
  MeshPhysicalMaterial,
  TorusGeometry,
  SphereGeometry,
  Vector3,
  type BufferAttribute,
} from "three";
// eslint-disable-next-line import/extensions
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

import { paperTexture, type Paper } from "./paper";

/** The box's shape at one unit wide. */
export const BOX = {
  width: 1,
  height: 0.62,
  depth: 0.82,
  lidHeight: 0.17,
  /** The lid overhangs the box by this much on each side. */
  lidLip: 0.035,
  ribbon: 0.13,
} as const;

/** How many pattern tiles fit across one unit of paper. */
const TILES_PER_UNIT = 2.2;

/**
 * Paper UVs from the box's own size: each face takes its two flat axes, so the
 * pattern keeps its shape on every face (no stretched dots on the long sides).
 */
const paperUVs = (geo: BufferGeometry) => {
  const pos = geo.getAttribute("position") as BufferAttribute;
  const nor = geo.getAttribute("normal") as BufferAttribute;
  const uv = geo.getAttribute("uv") as BufferAttribute;
  const n = new Vector3();
  for (let i = 0; i < pos.count; i += 1) {
    n.fromBufferAttribute(nor, i);
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const ax = Math.abs(n.x);
    const ay = Math.abs(n.y);
    const az = Math.abs(n.z);
    let u: number;
    let v: number;
    if (ax >= ay && ax >= az) [u, v] = [z * Math.sign(n.x), y];
    else if (ay >= az) [u, v] = [x, z * Math.sign(n.y)];
    else [u, v] = [-x * Math.sign(n.z), y];
    uv.setXY(i, u * TILES_PER_UNIT, v * TILES_PER_UNIT);
  }
  uv.needsUpdate = true;
  return geo;
};

/** The parts' geometry, made once and shared by every box. */
const useGeometry = () =>
  useMemo(() => {
    const {
      width: w,
      height: h,
      depth: d,
      lidHeight: lh,
      lidLip: lip,
      ribbon: rb,
    } = BOX;
    const body = paperUVs(new RoundedBoxGeometry(w, h, d, 3, 0.03));
    const lid = paperUVs(
      new RoundedBoxGeometry(w + lip * 2, lh, d + lip * 2, 3, 0.03),
    );
    // Ribbon bands sit a hair outside the paper, one each way round the box and the lid.
    const e = 0.008;
    const bandBodyX = new BoxGeometry(rb, h + e, d + e);
    const bandBodyZ = new BoxGeometry(w + e, h + e, rb);
    const bandLidX = new BoxGeometry(rb, lh + e, d + lip * 2 + e);
    const bandLidZ = new BoxGeometry(w + lip * 2 + e, lh + e, rb);
    // The bow: two loops, two tails and a knot.
    // A loop is a flat satin band (wide front to back), its inner edge at the knot.
    const loop = new TorusGeometry(0.13, 0.03, 10, 40);
    loop.scale(1, 0.62, 1);
    loop.translate(0.13, 0, 0);
    loop.scale(1, 1, 2.1);
    const tail = new BoxGeometry(0.075, 0.012, 0.24);
    const knot = new SphereGeometry(0.065, 20, 14);
    knot.scale(1, 0.8, 1);
    return {
      body,
      lid,
      bandBodyX,
      bandBodyZ,
      bandLidX,
      bandLidZ,
      loop,
      tail,
      knot,
    };
  }, []);

/** Glossy toy paper, and satin ribbon (a little shinier). */
const usePaperMaterials = (paper: Paper) =>
  useMemo(() => {
    const paperMat = new MeshPhysicalMaterial({
      map: paperTexture(paper),
      roughness: 0.42,
      clearcoat: 0.7,
      clearcoatRoughness: 0.25,
    });
    const ribbonMat = new MeshPhysicalMaterial({
      color: new Color(paper.ribbon),
      roughness: 0.3,
      clearcoat: 1,
      clearcoatRoughness: 0.12,
      sheen: 0.25,
      sheenColor: new Color(paper.ribbon).lerp(new Color("#ffffff"), 0.4),
    });
    return { paperMat, ribbonMat };
  }, [paper]);

/** Where the lid sits on the box (one unit wide). */
export const LID_Y = BOX.height / 2 + BOX.lidHeight / 2 - 0.02;

export const Present = ({ paper }: { paper: Paper }) => {
  const g = useGeometry();
  const { paperMat, ribbonMat } = usePaperMaterials(paper);
  const { lidHeight: lh } = BOX;
  const lidY = LID_Y;
  return (
    <group name="present">
      <group name="box">
        <mesh geometry={g.body} material={paperMat} />
        <mesh geometry={g.bandBodyX} material={ribbonMat} />
        <mesh geometry={g.bandBodyZ} material={ribbonMat} />
      </group>
      <group name="lid" position={[0, lidY, 0]}>
        <mesh geometry={g.lid} material={paperMat} />
        <mesh geometry={g.bandLidX} material={ribbonMat} />
        <mesh geometry={g.bandLidZ} material={ribbonMat} />
        <group name="bow" position={[0, lh / 2 + 0.02, 0]}>
          {/* Loops lean out to the sides and tip up a little. */}
          <mesh
            geometry={g.loop}
            material={ribbonMat}
            position={[0.02, 0.05, 0]}
            rotation={[0, 0.25, 0.42]}
          />
          <mesh
            geometry={g.loop}
            material={ribbonMat}
            position={[-0.02, 0.05, 0]}
            rotation={[0, Math.PI - 0.25, 0.42]}
          />
          <mesh
            geometry={g.tail}
            material={ribbonMat}
            position={[-0.06, -0.005, 0.13]}
            rotation={[0, 0.5, 0]}
          />
          <mesh
            geometry={g.tail}
            material={ribbonMat}
            position={[0.06, -0.005, 0.13]}
            rotation={[0, -0.5, 0]}
          />
          <mesh
            geometry={g.knot}
            material={ribbonMat}
            position={[0, 0.03, 0]}
          />
        </group>
      </group>
    </group>
  );
};

/** The present's full height at one unit wide, lid and bow included. */
export const PRESENT_HEIGHT = BOX.height + BOX.lidHeight + 0.2;
