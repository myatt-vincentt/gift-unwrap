// Scene.tsx — Gift Unwrap: a wrapped present appears between your two hands.
import { lazy, Suspense } from "react";

import { GiftScene } from "./gift/GiftScene";

// Dev-only helpers. Lazy and behind a constant esbuild folds to false in
// production. Two rules: `process.env.NODE_ENV`, not `import.meta.env.DEV`;
// and write the check INSIDE the ternary — hoisted into a `const`, esbuild
// keeps the dead branch.
const DevMediaSwitcher =
  process.env.NODE_ENV !== "production"
    ? lazy(() => import("./gift/DevMediaSwitcher"))
    : null;
const DevGift =
  process.env.NODE_ENV !== "production"
    ? lazy(() => import("./gift/DevGift"))
    : null;

export const Scene = () => (
  <>
    <GiftScene />
    {DevMediaSwitcher ? (
      <Suspense fallback={null}>
        <DevMediaSwitcher />
      </Suspense>
    ) : null}
    {DevGift ? (
      <Suspense fallback={null}>
        <DevGift />
      </Suspense>
    ) : null}
  </>
);
