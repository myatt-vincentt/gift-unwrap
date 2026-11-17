// The screen's size at the hand plane (z = 0), in scene units.
import type { PerspectiveCamera } from "three";

export const viewAtHands = (camera: PerspectiveCamera) => {
  const h = 2 * camera.position.z * Math.tan((camera.fov * Math.PI) / 360);
  return { w: h * camera.aspect, h };
};
