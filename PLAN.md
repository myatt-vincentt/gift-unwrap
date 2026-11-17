# Plan

How Gift Unwrap works, piece by piece (all in `src/gift/`).

## The loop

1. **Waiting** (`Gift.tsx`, `Hint.tsx`): the box rests low in the middle and sways; two soft
   white hands slide in to its sides and fade, over and over.
2. **Holding** (`hold.ts`): both palms seen → the box sits halfway between them, 0.78 of the gap
   wide, turned with the line between your hands (up to about 55°). Hands gone for 0.6 s → it
   floats back to rest.
3. **Shaking** (`shake.ts`, `rattle.ts`, `audio.ts`): every quick turn of your hands (a swing of
   at least 0.1 box widths at 1.1 box widths a second) is a rattle: the box jolts the way it
   swung, the lid hops, and what's inside makes its sound. A tap does four rattles.
4. **Tearing** (`tear.ts`, `Scraps.tsx`): the gap between your palms grows by 40% within 0.4 s
   (after holding for half a second), or two fingers spread on the screen. The ribbon strips,
   72 paper scraps and the lid fly off; the plain box stays, at the size it was before the pull.
5. **The surprise** (`Puppy.tsx`, `Confetti.tsx`, `SnowCloud.tsx`): chosen when the box appears,
   never the same twice in a row. After 4.6 s the open box shrinks away and the next box grows
   in, in the next of five papers.

## Design

- Glossy toy look: clear-coated paper and satin ribbon under soft studio reflections.
- Your real hands stay in front of the box (hand cut-out), so your palms hold it.
- Motion eases out and never overshoots; the rattle's jolt is a short shudder that dies away.
- No words on screen except the recording captions; the hint is wordless.
- Sounds only from the present itself: rattle, rip, pop. Never the microphone.

## Known limits

- Sound starts at the first tap, click or key press (a browser rule).
- The snow cloud needs a moment (about 2 s) to find your face after a snow box appears.
