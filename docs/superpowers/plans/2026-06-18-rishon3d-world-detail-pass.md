# Rishon3D — World Detail Pass (plan)

Spec: `docs/superpowers/specs/2026-06-18-rishon3d-world-detail-pass-design.md`
Branch: `worktree-3d-spike` (do NOT merge/deploy). Work dir: `rishon3d/`.

File-ownership so the parallel tasks never edit the same file:

| Task | Owns (edits) |
|------|--------------|
| P0 palette (do first) | `src/world/palette.ts` |
| A Facades | `src/world/facade.ts` (new), `src/world/builders.ts`, `src/world/windows.ts`, `test/facade.test.ts` (new), `test/builders.test.ts` |
| B Sky/Clouds | `src/core/sky.ts`, `src/world/clouds.ts`, `src/core/Engine.ts`, `test/clouds.test.ts`, `test/sky.test.ts` |
| C Streets | `src/world/roads.ts`, `test/roads.test.ts` |
| D Furniture | `src/world/props.ts`, `src/world/rishonMap.ts`, `src/world/cityGen.ts`, `src/game/World.ts`, `test/props.test.ts` |

`palette.ts` is the only shared file → P0 lands all new color constants up front, then
A/C/D import them; B mostly uses `sky.ts` `DAY`. After P0, A/B/C/D run in parallel.

---

## P0 — Extend palette (foundational, do before fan-out)

Add to `PALETTE` (keep saturated daytime tone):
- Facade: `glass` (cool blue, e.g. `0x8fb8d8`), `glassDark` (`0x5e88a8`), `frame`
  (light mullion, `0xe8e6df`), `storefront` (bright cyan glass, `0x9fd0e8`),
  `cornice`/`trim` (slightly darker than body neutral, `0xb9b4a8`), `roofCap`
  (`0x9a958c`).
- Streets: `crosswalk` (`0xf3ecd0`/white), `yellowLine` (`0xf2c14e`).
- Furniture: `flowerStem`/base green (`0x4f9a3a`), `flowerYellow` (`0xf2c14e`),
  `flowerRed` (`0xe0524a`), `flowerWhite` (`0xf3efe6`), `trashCan` (`0x2f6b4a`),
  `hedge` (`0x4f9a3a`), `planterStone` (`0xbdb7a8`).

Acceptance: `npm run -s build` typechecks; `npm test` still green (palette.test may need
an extra assertion that new entries are valid hex — keep it passing).

---

## A — Building facades (biggest visual win)

1. New `src/world/facade.ts`:
   - `facadePattern(cols, rows, floors, seed, opts) -> Uint8Array` (pure RGBA, like
     `windows.ts`): wall field in body color; window grid of `glass`/`glassDark` panels
     with `frame` mullions; **top row = cornice**; **bottom 1–2 rows = storefront**
     (large `storefront` glass + frame + a colored lintel). Deterministic per seed.
   - `makeFacadeTexture(...) : THREE.DataTexture` (NearestFilter, no wrap needed since
     mapped 1:1) and a cache keyed by quantized `(cols,rows,floorBucket,colorBucket,
     storefront)`.
   - A helper to derive `cols`/`floors` from `def.width`/`def.height`.
2. `builders.ts` `makeBuilding` (non-house path): build a **6-material box** — facade
   material (albedo = facade texture, tinted by `def.color`) on the 4 sides, `roofCap`
   material on top, body color on bottom. Keep a subtle emissive accent for a few lit
   windows (can reuse `DAY.windowEmissive`). House path unchanged (or minor trim).
3. Keep `windows.ts` exports working (other code/tests import `makeWindowTexture`/
   `windowPattern`); reuse or supersede internally — don't break its tests.
4. Tests `test/facade.test.ts`: determinism (same seed → same bytes), storefront row
   present at the bottom, cornice at top, window/frame ratio sane, dimensions correct.
   Update `test/builders.test.ts` for the new material array if it asserts material shape.

Acceptance: `npm test` green; building renders with a visible window grid + ground-floor
storefront in a fresh screenshot (verified in the verification phase).

---

## B — Sky, clouds, atmosphere

1. `clouds.ts`: lower `cloudPlacements` height (~75 → ~34) and raise default `count`
   (~10 → ~16); keep chunky white. Keep `cloudPlacements` pure + its determinism test;
   update `clouds.test.ts` expectations for the new height band.
2. `sky.ts` `DAY`: retune turbidity/rayleigh for a **deeper saturated blue** horizon
   (bounded — must stay daytime, not navy). Keep `sky.test.ts` passing (adjust expected
   numbers if asserted).
3. `Engine.ts`: only if needed after A+B, a small exposure/hemi nudge for punch; otherwise
   leave. Do not regress shadows.

Acceptance: `npm test` green; fresh screenshot shows a saturated sky with visible low
clouds (verified in verification phase).

---

## C — Streets / sidewalks

1. `roads.ts`:
   - Sidewalk **tile texture** (pure-data tile + grout grid; `RepeatWrapping`; repeat
     scaled to strip length ≈1.2 m tiles); apply to sidewalk planes.
   - **Crosswalk** stripe bands across asphalt at the central core intersection (merged
     thin planes just above asphalt). Keep a pure helper (e.g. `crosswalkRects(road)` or
     intersection-based) so it is unit-testable.
   - **Double-yellow** solid center line on core arterials (`main-h`, `cross-v`); keep
     white dashes elsewhere. Gate by road id/flag.
2. Tests `test/roads.test.ts`: tile texture data sanity (has grout + slab pixels);
   crosswalk stripe placement/count deterministic; double-yellow only on core roads.

Acceptance: `npm test` green; sidewalks read as tiled and a crosswalk is visible at the
core intersection in a fresh screenshot.

---

## D — Street furniture + trees

1. `rishonMap.ts`: extend `PropKind` union with `"flowerbed" | "trashcan" | "planter"`;
   add seeded placements of these along `CORE_MAP` arterial sidewalks (and a few extra
   benches/lamps for density). Keep `validateMap` + tests passing.
2. `cityGen.ts`: scatter a few flowerbeds/trashcans per district deterministically
   (consume rng in a fixed order so existing building layout is unchanged — append new
   rng draws after the existing ones, mirroring the `rbench` comment).
3. `props.ts`: geometries + instancing for `flowerbed` (green base + bright dot-tops),
   `trashcan` (dark-green bin), `planter` (stone rim + hedge top). Brighten/enlarge the
   deciduous tree canopy. Each new prop = InstancedMesh or merged geometry (≤2 draw calls
   each).
4. `World.ts`: wire the new prop instancers into the scene.
5. Tests `test/props.test.ts`: placement filters per new kind; geometry builders return
   non-empty merged geometry; determinism.

Acceptance: `npm test` green; fresh screenshot shows flower color pops, trash cans, and
denser greenery along the core street.

---

## Verification (after A–D merge into the worktree)

1. `cd rishon3d && npm test` → all vitest green (capture output).
2. `npm run build` → tsc + vite build clean (capture output).
3. `npm run test:smoke` → playwright boot/render green (capture output).
4. Dev server + Playwright: capture on-foot street view and driving view; compare to
   `design-example-city-walk.png` / `design-example-driving-view.png`. Save after-shots.
5. If a screenshot shows a clear miss (e.g. sky too dark, storefront misaligned), do a
   bounded follow-up tweak in the owning file and re-verify. Never fake green.

Stop at a finished, verified branch. Do **not** merge or deploy.
