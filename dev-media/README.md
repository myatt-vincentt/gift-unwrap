# dev-media

Optional dev-only preview media. Nothing here ships: only
`src/gift/DevMediaSwitcher.tsx` reads this folder, and it is stripped from
production builds.

You don't need anything here. Without a webcam, `pnpm dev` starts on the SDK's
built-in "Person ThumbUp" video and lists every SDK sample video and image.

To preview with your own clip, add a portrait video of someone holding both
hands up, palms facing each other, at `dev-media/hands.mp4` (H.264 MP4); it is
listed first and used as the start. Clips here are git-ignored. Restart
`pnpm dev` after adding or removing one.

No sample holds two palms apart, so the dev-only driver (`src/gift/DevGift.tsx`)
holds the box with the mouse: Shift + press and drag (drag quickly to shake),
scroll to change the gap, Q / E to tilt, N for the next paper, I for what's
inside, T to tear it open. A plain click is a tap, which shakes the box.
