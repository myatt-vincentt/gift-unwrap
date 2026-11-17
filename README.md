# Gift Unwrap

A Christmas present in your hands. A glossy wrapped box floats between your two palms: it grows
as you move your hands apart and tilts with them. Shake it to hear what's inside rattle (soft
thumps, a papery rustle or icy tinkles, so you can guess). Pull your hands apart quickly and the
ribbon snaps, the paper rips off in scraps and the lid pops away. Out comes a random surprise:
a corgi puppy peeking over the edge, a burst of confetti, or a little snow cloud that floats
over your head and snows on you. Then the next box grows in, in new paper. On a phone, tap the
screen to shake and spread two fingers to tear. The record button makes a video with the box's
own sounds and the Made with Vincentt mark.

- The box, the papers, the ribbon and the bow are made in code (`src/gift/Present.tsx`,
  `paper.ts`); the puppy is the vincentt.studio corgi in its glossy finish (`Puppy.tsx`).
- Shake and tear are read from your palms (`shake.ts`, `tear.ts`, both tested); the sounds are
  made in code (`audio.ts`) and switch on at your first tap or click.
- The snow cloud follows your head with face tracking, which runs only while a box holds snow.
- Recording: `src/gift/Record.tsx`. Credits: `CREDITS.md`. How it works: `PLAN.md`.
- Dev preview without a camera: see `dev-media/README.md` (mouse fake hands, N paper, I surprise,
  T tear).

---

# v2-template

The Vincentt starter app: a real React + R3F + Vincentt XR SDK (`@vincentt-xr/sdk`)
WebXR app. The dev server bundles with esbuild; the production build is the Vincentt CLI's
`vincentt build`.

## Shape

```
src/
  main.tsx            mount — never edited
  App.tsx             protected shell: XRProvider + FrameContainer +
                      XRScene + media-source binding, camera, lighting,
                      VideoBackground, PreviewAnchors — never edited
  frame.config.ts     the frame: "phone" (9:16, default) or "full" (the viewport)
  Scene.tsx           the agent's surface: add SDK components and R3F
                      primitives here
  PreviewAnchors.tsx  editor-preview integration — never edited
```

See `AGENTS.md` and `GROUNDING.md` for the API reference and how to author scenes.

## Develop

```
pnpm install
vincentt login    # once per machine; `vincentt create` registers a folder from `vincentt init`
pnpm preview      # on-device preview over a secure tunnel: the address the developer gets
pnpm dev          # esbuild dev server on localhost:5173 for your own checks (output in .dev/)
pnpm typecheck
pnpm build        # `vincentt build`: production bundle to dist/ (needs the CLI installed)
vincentt publish  # upload dist/ and go live at <slug>.vincentt.app
```

The developer's path is the platform: sign in, preview, publish. `pnpm dev` is a local
check; its address is never the one a developer or a phone is given.

## Release

`vincentt init` scaffolds from the **`latest` tag**, not from `main`. Merging to `main` does
not ship a template to creators — cutting a release does.

```
git tag 1.1.0 <sha>      # bare semver, no `v` prefix
git push origin 1.1.0    # the Release workflow verifies the tag, then moves `latest`
```

The Release workflow (`.github/workflows/release.yml`) installs from the frozen lockfile,
builds, and typechecks **the tagged tree** before force-updating `latest` to it. A tag that
fails leaves `latest` where it was, so a broken release cannot reach a new creator.

The job runs in the `release` environment, which accepts bare-semver tags only. To re-run it by
hand, dispatch it from the tag itself ("Use workflow from: 1.1.0"); a dispatch from `main` is
refused.

To correct a migration note without moving `latest`, fix the entry in `MIGRATION.md` on
`main`, then dispatch the Release row workflow (`.github/workflows/release-row.yml`) from the
newest tag with that tag as its input. It re-sends only the platform release row: no build,
no tag move. It exists only on tags cut after it was added.

**Never move `latest` by hand.** It is force-updated by that workflow and nowhere else; moving
it manually decouples the pointer from the version it claims to be.

Creators can pin a specific version — `vincentt init --template 1.0.0` — which is the escape
hatch when a release turns out to be bad. That is why the version tags are immutable and only
`latest` moves.

### `MIGRATION.md` and the platform release row

Root `MIGRATION.md` carries one entry per released tag, newest first, authored in the same
PR as the change: `required: true|false`, a one-line summary, and optional notes bullets.
`required: false` means no consumer action is needed, never that the entry was skipped. The
Release workflow refuses to move `latest` for a tag with no valid entry, then — once `latest`
has moved — posts that entry as this release's row to the platform (`POST
/platform/releases`, component `template`), via `scripts/release-row.mjs`. Both steps read
`MIGRATION.md` from `main`, not from the tagged tree: the note is reviewed via PR into `main`
and is append-only per version, so `main`'s copy is the reviewed source for any tag, including
one cut before this file existed. That row is what `vincentt outdated` reads back to tell a
creator's agent what changed and what to do about it.
