// Gift Unwrap: a wrapped present between your two hands. Your real hands
// stay in front of the box (the hand cut-out), so your palms hold it.
import { useEffect, useState } from "react";
import { useThree } from "@react-three/fiber";
import { PMREMGenerator } from "three";
// eslint-disable-next-line import/extensions
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { HandCutout, HandTracker } from "@vincentt-xr/sdk/tracking";

import { Confetti } from "./Confetti";
import { Gift } from "./Gift";
import { Hint } from "./Hint";
import { Scraps } from "./Scraps";
import { SnowCloud } from "./SnowCloud";
import { gift, onInside } from "./state";
import { TapToShake } from "./TapToShake";

/** Soft studio reflections for the glossy paper and the satin ribbon. */
const useStudioLight = () => {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  useEffect(() => {
    const pmrem = new PMREMGenerator(gl);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    const before = scene.environment;
    scene.environment = env;
    scene.environmentIntensity = 0.6;
    return () => {
      scene.environment = before;
      env.dispose();
      pmrem.dispose();
    };
  }, [gl, scene]);
};

export const GiftScene = () => {
  useStudioLight();
  // The snow cloud needs your head, so the face tracker runs only while a
  // box holds snow (from the moment that box appears, so it is ready).
  const [inside, setInside] = useState(gift.inside);
  useEffect(() => onInside(setInside), []);
  return (
    <>
      <ambientLight intensity={0.35} />
      <directionalLight position={[2, 4, 5]} intensity={1.6} />
      <directionalLight position={[-3, 1, 2]} intensity={0.5} color="#ffe2c4" />
      <HandTracker>
        <HandCutout />
      </HandTracker>
      <Gift />
      <Scraps />
      <Confetti />
      {inside === "snow" ? <SnowCloud /> : null}
      <Hint />
      <TapToShake />
    </>
  );
};
