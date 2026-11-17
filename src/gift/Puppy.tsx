// The puppy surprise: a glossy toy corgi pops up out of the open box, its
// paws over the front edge, and peeks at you — wagging, panting with its
// tongue out, and one happy "boof" with little hearts as it appears.
// The model is the library's corgi puppy in its glossy red-and-white finish;
// it rides along with the box in your hands.
import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import {
  AnimationMixer,
  Box3,
  Group,
  LoopOnce,
  LoopRepeat,
  Vector3,
  type Material,
  type Mesh,
} from "three";
// eslint-disable-next-line import/extensions
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";
// eslint-disable-next-line import/extensions
import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { defineGltfAsset, useXRAsset } from "@vincentt-xr/sdk";

import { BOX } from "./Present";

const PUPPY = defineGltfAsset("/models/vincentt-pet-corgi-puppy.glb");

/** The glossy red-and-white coat: the file's own spare materials. */
const COAT: Record<string, string> = {
  mat_fur: "mat_fur_classic_glossy",
  mat_fur2: "mat_fur2_glossy",
};
/** Loops it plays (and how much of each), and the one-shot "boof" as it appears. */
const LOOPS: Record<string, number> = { idle: 1, wag: 1, pant: 0.7 };
const HELLO = "burst";

/** Its size and spot in the box (box widths): wide as most of the box, chest at the front edge. */
const FIT = { width: 0.72, sink: 0.12, front: 0.08 } as const;
/** It pops up over this long (s), easing out. */
const POP = 0.4;
/** Turned a little toward you from the box's own turn (radians). */
const FACE_YOU = { yaw: 0.3, pitch: -0.15 } as const;

const easeOut = (k: number) => 1 - (1 - Math.min(1, Math.max(0, k))) ** 3;

/** The coat materials, loaded by name (they're in the file but on no mesh). */
const useCoat = (value: GLTF | null | undefined) => {
  const [coat, setCoat] = useState<Map<string, Material> | null>(null);
  useEffect(() => {
    if (!value) return undefined;
    let alive = true;
    const want = new Set(Object.values(COAT));
    const defs = (value.parser.json.materials ?? []) as { name?: string }[];
    Promise.all(
      defs
        .map((d, i) => [d.name, i] as const)
        .filter(([n]) => n && want.has(n))
        .map(([n, i]) =>
          value.parser
            .getDependency("material", i)
            .then((m: Material) => [n as string, m] as const),
        ),
    )
      .then((pairs) => alive && setCoat(new Map(pairs)))
      .catch(() => alive && setCoat(new Map()));
    return () => {
      alive = false;
    };
  }, [value]);
  return coat;
};

export const Puppy = () => {
  const { value } = useXRAsset(PUPPY);
  const coat = useCoat(value);
  const holder = useRef<Group>(null);
  const born = useRef(-1);

  const pup = useMemo(() => {
    if (!value || !coat) return null;
    const root = cloneSkinned(value.scene);
    root.traverse((o) => {
      const m = o as Mesh;
      if (!m.isMesh) return;
      m.frustumCulled = false;
      if (!Array.isArray(m.material)) {
        const to = coat.get(COAT[m.material.name]);
        if (to) m.material = to;
      }
    });
    const mixer = new AnimationMixer(root);
    value.animations.forEach((c) => {
      if (c.name in LOOPS)
        mixer
          .clipAction(c)
          .setLoop(LoopRepeat, Infinity)
          .setEffectiveWeight(LOOPS[c.name])
          .play();
      if (c.name === HELLO) {
        const a = mixer.clipAction(c).setLoop(LoopOnce, 1);
        a.clampWhenFinished = false;
        a.play();
      }
    });
    // Fit: as wide as most of the box, its bottom sunk into the opening,
    // its front just past the box's front edge.
    // Measured as posed (bones applied), not in the rig's resting shape.
    mixer.update(0);
    root.updateMatrixWorld(true);
    // Only its body and head count (the "boof" hearts fly far above it).
    const box = new Box3();
    root.traverse((o) => {
      const part = /corgi_(body|head)$/;
      if (
        (o as Mesh).isMesh &&
        (part.test(o.name) || part.test(o.parent?.name ?? ""))
      )
        box.expandByObject(o, true);
    });
    const size = box.getSize(new Vector3());
    const scale = FIT.width / Math.max(size.x, 1e-6);
    const offset = new Vector3(
      -(box.min.x + box.max.x) / 2,
      -box.min.y,
      -box.max.z,
    ).multiplyScalar(scale);
    return { root, mixer, scale, offset };
  }, [value, coat]);

  useEffect(
    () => () => {
      pup?.mixer.stopAllAction();
    },
    [pup],
  );

  useFrame((_, delta) => {
    const h = holder.current;
    if (!h || !pup) return;
    const now = performance.now() / 1000;
    if (born.current < 0) born.current = now;
    pup.mixer.update(Math.min(delta, 0.1));
    const k = easeOut((now - born.current) / POP);
    h.scale.setScalar(pup.scale * Math.max(1e-4, k));
    h.position.set(
      pup.offset.x * k,
      BOX.height / 2 - FIT.sink + pup.offset.y * k - (1 - k) * 0.15,
      BOX.depth / 2 + FIT.front + pup.offset.z * k,
    );
  });

  if (!pup) return null;
  return (
    <group rotation={[FACE_YOU.pitch, FACE_YOU.yaw, 0]}>
      <group ref={holder}>
        <primitive object={pup.root} />
      </group>
    </group>
  );
};
