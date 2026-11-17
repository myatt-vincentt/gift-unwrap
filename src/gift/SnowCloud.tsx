// The snow cloud surprise: a fluffy little cloud puffs up out of the open
// box, floats up to just above your head (the top of the screen if no face
// is seen) and follows you there, snowing on you, then shrinks away.
import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  Group,
  IcosahedronGeometry,
  MeshPhysicalMaterial,
  type PerspectiveCamera,
  Points,
  PointsMaterial,
  SRGBColorSpace,
  Vector3,
} from "three";
import { useFaceInfo } from "@vincentt-xr/sdk/tracking";

import { viewAtHands } from "./view";

/** How long the cloud stays (s): rise, snow, and shrink away at the end. */
export const CLOUD = { rise: 0.9, stay: 4.2, leave: 0.4 } as const;
const FLAKES = 140;

/** Puffs that make the cloud (centre, radius), one unit wide. */
const PUFFS = [
  [0, 0.05, 0, 0.3],
  [-0.28, -0.02, 0.02, 0.22],
  [0.29, -0.01, 0.0, 0.24],
  [-0.12, 0.17, -0.04, 0.2],
  [0.14, 0.15, 0.02, 0.21],
  [-0.45, -0.08, -0.02, 0.14],
  [0.47, -0.07, 0.02, 0.15],
  [0.02, -0.1, 0.1, 0.2],
] as const;

const easeOut = (k: number) => 1 - (1 - Math.min(1, Math.max(0, k))) ** 3;

/** A soft round snowflake dot. */
const flakeTexture = () => {
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 64;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.45, "rgba(255,255,255,0.9)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  Object.assign(g, { fillStyle: grad });
  g.fillRect(0, 0, 64, 64);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
};

/** Ask for a cloud to come out of the box at a point (scene), box `width` wide. */
const asked: { at: Vector3; width: number }[] = [];
export const releaseCloud = (at: Vector3, width: number) => {
  asked.push({ at: at.clone(), width });
};

export const SnowCloud = () => {
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const face = useFaceInfo({ active: true, targetFps: 15 });
  const faceRef = useRef(face);
  faceRef.current = face;
  if (process.env.NODE_ENV !== "production")
    (window as unknown as { __face: unknown }).__face = face;
  const cloud = useRef<Group>(null);
  const snow = useRef<Points>(null);
  const run = useRef({
    born: -1e9,
    from: new Vector3(),
    width: 1,
    at: new Vector3(),
  });
  const puff = useMemo(() => new IcosahedronGeometry(1, 3), []);
  const puffMat = useMemo(
    () =>
      new MeshPhysicalMaterial({
        color: new Color("#ffffff"),
        roughness: 0.9,
        sheen: 1,
        sheenColor: new Color("#cfe6ff"),
        emissive: new Color("#dde9ff"),
        emissiveIntensity: 0.25,
        transparent: true,
      }),
    [],
  );
  const flakes = useMemo(() => {
    const geo = new BufferGeometry();
    geo.setAttribute(
      "position",
      new BufferAttribute(new Float32Array(FLAKES * 3), 3),
    );
    return {
      geo,
      mat: new PointsMaterial({
        map: flakeTexture(),
        size: 0.07,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        opacity: 0.95,
      }),
      seed: Array.from({ length: FLAKES }, () => ({
        x: Math.random() - 0.5,
        z: Math.random() - 0.5,
        phase: Math.random(),
        speed: 0.75 + Math.random() * 0.5,
        sway: Math.random() * Math.PI * 2,
      })),
    };
  }, []);
  const target = useMemo(() => new Vector3(), []);

  /**
   * Just above your head (scene units), kept on screen; the top middle
   * without a face. The face's position is already in scene units; its
   * height comes from its bounds (the picture's full height maps to the
   * screen's, whichever way the camera is cropped).
   */
  const aboveHead = (out: Vector3, width: number) => {
    const view = viewAtHands(camera);
    const top = view.h / 2 - width * 0.12;
    const f = faceRef.current;
    if (!f) return out.set(0, top, 0);
    const faceH = f.bounds.height * view.h;
    const crown = f.pose.position.y + faceH * 0.72;
    return out.set(f.pose.position.x, Math.min(top, crown + width * 0.22), 0);
  };

  useFrame((_, delta) => {
    const now = performance.now() / 1000;
    const r = run.current;
    const go = asked.shift();
    if (go) Object.assign(r, { born: now, width: go.width, from: go.at });
    const c = cloud.current;
    const s = snow.current;
    if (!c || !s) return;
    const age = now - r.born;
    const end = CLOUD.rise + CLOUD.stay;
    const on = age >= 0 && age < end + CLOUD.leave;
    c.visible = on;
    s.visible = on && age > CLOUD.rise * 0.6;
    if (!on) return;
    const w = Math.max(0.7, r.width * 0.75);
    aboveHead(target, w);
    // Rise from the box (ease-out), then follow your head smoothly.
    if (age < CLOUD.rise)
      r.at.lerpVectors(r.from, target, easeOut(age / CLOUD.rise));
    else r.at.lerp(target, 1 - Math.exp(-6 * Math.min(delta, 0.1)));
    const grow = easeOut(age / (CLOUD.rise * 0.7));
    const shrink = age > end ? 1 - easeOut((age - end) / CLOUD.leave) : 1;
    const k = Math.max(1e-4, grow * shrink);
    c.position.copy(r.at);
    c.scale.set(w * k, w * k * 0.8, w * k * 0.7);
    // A gentle bob.
    c.position.y += Math.sin(age * 2.2) * 0.02 * w;
    // Snow: flakes fall from under the cloud for about a head and a half.
    const pos = flakes.geo.getAttribute("position") as BufferAttribute;
    const drop = w * 1.5;
    flakes.seed.forEach((f, i) => {
      const t = (f.phase + (age * f.speed) / 1.8) % 1;
      pos.setXYZ(
        i,
        r.at.x + f.x * w * 0.9 + Math.sin(age * 1.7 + f.sway) * 0.04 * w,
        r.at.y - w * 0.1 - t * drop,
        r.at.z + f.z * w * 0.4 + 0.2,
      );
    });
    pos.needsUpdate = true;
    flakes.mat.size = 0.075 * Math.max(0.8, w);
    flakes.mat.opacity = 0.95 * shrink;
    puffMat.opacity = shrink;
  });

  return (
    <>
      <group ref={cloud} visible={false}>
        {PUFFS.map(([x, y, z, rad]) => (
          <mesh
            key={`${x},${y}`}
            geometry={puff}
            material={puffMat}
            position={[x, y, z]}
            scale={rad}
          />
        ))}
      </group>
      <points
        ref={snow}
        geometry={flakes.geo}
        material={flakes.mat}
        frustumCulled={false}
        visible={false}
      />
    </>
  );
};
