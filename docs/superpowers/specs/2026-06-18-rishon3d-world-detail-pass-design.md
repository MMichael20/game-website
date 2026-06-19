# Rishon3D — World Detail Pass (design)

Date: 2026-06-18
Branch: `worktree-3d-spike` (isolated; do NOT merge/deploy)
Mode: autonomous-builder (self-brainstormed; decisions logged below)

## Problem

The 3D city renders as a readable but **detail-poor** scene. Side-by-side with the
target art (`assets/design-examples/*`) the current build (`assets/actual-game-screenshots/*`,
plus a fresh baseline capture) shows a large, very actionable gap:

- **Buildings are flat solid-color boxes with no readable detail.** Windows are an
  *emissive-only* texture (`windows.ts`), so in daylight they are invisible — you see
  a plain colored block. The target has brick/stucco facades, a real window grid,
  glass storefronts at street level, and trim/cornices.
- **Sidewalks/streets are flat single colors.** The target has tiled sidewalks with
  grout grid lines and crosswalks at intersections.
- **Sky is washed out and empty.** The horizon reads near-white and the chunky voxel
  clouds sit at y≈75 — far above the camera, out of frame. The target sky is a
  saturated blue band with prominent low clouds.
- **Street life is sparse.** The target is lush: flower beds, hedges/planters, trash
  cans, dense benches and lamps. We have trees, bushes, benches, lamps only.

The user picked **"World detail pass"** for this round. Core look (blocky daytime,
saturated palette) is already right — what is missing is *detail and richness*.

## Goal

Close the world-detail gap so a fresh on-foot / driving screenshot reads much closer
to `design-example-city-walk.png` and `design-example-driving-view.png`: detailed
facades, tiled sidewalks, a saturated cloudy sky, and denser street life — while
keeping the flat-shaded voxel aesthetic, determinism, the pure-data/unit-test pattern,
and a flat draw-call budget.

## Scope

In scope (the **world**):
1. **Building facades** — readable window grid + ground-floor storefront band + roof
   cap, applied to every building (core + districts).
2. **Streets/sidewalks** — tiled sidewalk texture, crosswalks at major intersections,
   double-yellow center line on the core arterials.
3. **Sky / clouds / atmosphere** — saturated sky, clouds brought down into the visible
   band, more of them.
4. **Street furniture** — new flower beds (color pops), trash cans, hedge planters;
   denser placement along the core; brighter/chunkier trees.

Explicitly **out of scope** this round (other rounds cover them — see decisions):
character model (spiky hair/backpack), vehicle remodeling, UI/HUD restyle, building
interiors, airport/restaurant/phone scenes.

## Approach (per area)

### 1. Building facades — procedural facade DataTexture (the big win)

Replace the emissive-only window map with a **procedural albedo facade texture** per
building, following the existing pure-pixel pattern in `windows.ts` (node-testable, no
canvas/DOM):

- A new `facade.ts` exports `facadePattern(cols, rows, floors, seed, opts) -> Uint8Array`
  producing RGBA pixels for one facade: a wall field in the building body color, a grid
  of **glass window panels** (cool blue) separated by lighter **mullions/frame**, the
  **top row a cornice/trim** band, and the **bottom rows a storefront** (large glass +
  frame + a sign/awning-color lintel).
- The texture maps **1:1** across the box height (no vertical `repeat`) so the storefront
  always lands at the ground floor and the cornice at the top. Columns derive from
  `def.width`, floors from `def.height`.
- Apply via a **6-material `BoxGeometry`**: facade material on the 4 side faces, a plain
  roof-cap material on top, body color on the bottom. This keeps windows off the roof.
- Keep a **small warm-lit subset** of windows as an emissive accent (reuse the existing
  random-subset idea) so a few windows glow — but the grid itself is now visible in
  daylight as albedo, which is the fix.
- **Cache facade textures by a quantized key** (`cols × rows × colorBucket × storefront`)
  so the ~60–70 buildings collapse to a handful of unique textures (memory + perf).
- Houses (`isHouse`) keep their current body+pitched-roof treatment (optionally a small
  facade on the body, but not required).

Rejected: extruded/inset window geometry (heavy, more draw calls, wrong for the flat
voxel look). Texture is the right tool.

### 2. Streets / sidewalks — `roads.ts`

- **Sidewalk tile texture**: a pure-data tile DataTexture (light slab + darker grout
  lines), `RepeatWrapping`, repeat scaled to the strip length so tiles are ~1.2 m.
- **Crosswalks**: white stripe bands across the asphalt at the central core
  intersection(s) (and optionally arterial mouths), as merged/instanced thin planes.
- **Double-yellow center line** on the two core arterials (`main-h`, `cross-v`):
  two solid thin yellow strips; keep dashed white elsewhere.

### 3. Sky / clouds / atmosphere — `sky.ts`, `clouds.ts`, `Engine.ts`

- Retune `DAY` sky params toward a **deeper, more saturated blue** (lower turbidity /
  higher rayleigh within a bounded range) so the horizon stops reading near-white.
  Verify by screenshot; stay inside a sane range so it doesn't go navy/night.
- **Bring clouds into frame**: lower `cloudPlacements` height from ~75 to ~32–40,
  increase count (~10 → ~16), keep them chunky and flat-white. They should read as a
  band of low puffy clouds like the target.
- Leave tone mapping (`NeutralToneMapping`) and exposure as-is unless screenshots show
  the scene is too dull after the facade + sky changes; if so, a small exposure/hemi
  nudge only.

### 4. Street furniture — `props.ts`, `palette.ts`, `rishonMap.ts`, `cityGen.ts`, `World.ts`

- New `PropKind`s: `"flowerbed"`, `"trashcan"`, `"planter"` (hedge).
  - **flowerbed**: a low green base with a few bright dot-tops (yellow/red/white) — the
    pops of color along sidewalks and in the park. Instanced/merged, one/two draw calls.
  - **trashcan**: small dark-green box/cylinder; placed near a subset of streetlights.
  - **planter**: a stone rim box with a clipped hedge top (mid-green).
- **Denser placement** of these along the core arterial sidewalks + a few in each
  district, seeded deterministically (extend `CORE_MAP.props` and `cityGen` scatter).
- **Trees**: enlarge + brighten the deciduous canopy slightly to match the chunky bright
  target trees (tune `deciduousCanopyBoxes` sizes and/or `leaf`/`leafDeep`).

## Constraints / invariants

- Deterministic given seeds; all new pixel/pattern generators are pure (node-testable)
  and unit-tested, mirroring `windows.ts` / `clouds.ts` / `roads.ts` tests.
- Draw-call budget stays roughly flat: facades reuse cached textures and the existing
  per-building mesh; new furniture uses InstancedMesh / merged geometry.
- `npm run build` (tsc --noEmit + vite build), `npm test` (vitest), and `npm run
  test:smoke` (playwright) must all pass. No new console errors (favicon 404 is
  pre-existing and ignored).
- Public APIs of edited modules stay backward-compatible where other modules import them.

## Verification

- `npm test`, `npm run build`, `npm run test:smoke` all green (evidence captured).
- Fresh Playwright capture of the on-foot street view and the driving view, compared
  against `design-example-city-walk.png` / `design-example-driving-view.png`. Baseline
  captured before changes (`baseline-walk.png`) for before/after.

## Assumptions & Decisions

- Reference images live in main repo (`C:/Learning/game-website/assets`), not the worktree
  → read them from there; do not copy large PNGs into the branch.
- Scope = world only → chose to **exclude character/vehicle/UI/interiors** this round —
  because the user explicitly selected "World detail pass" and those are separate rounds.
- Facade rendering approach → chose **procedural albedo facade DataTexture on a 6-material
  box** (vs. emissive-only, vs. extruded geometry) — because it makes windows/storefronts
  readable in daylight, matches the flat voxel look, stays node-testable, and keeps one
  mesh per building.
- Facade memory/perf → chose to **cache textures by quantized key** — because ~60–70
  buildings would otherwise each allocate a texture; quantizing collapses them to a few.
- Storefront placement → chose **1:1 vertical texture mapping (no repeat)** so the ground
  floor is always a storefront and the top is always a cornice — because tiled repeat
  can't pin a distinct ground floor.
- Sky saturation → chose to **retune existing `Sky` `DAY` params + screenshot-verify**
  rather than swapping in a flat gradient dome — because it is the smaller change and the
  Sky dome is already wired; bounded range avoids a tuning rabbit hole.
- Clouds → chose to **lower height to ~32–40 and raise count to ~16** — because the
  current y≈75 puts them out of frame; this is the minimal change to match the target band.
- New furniture as **new `PropKind`s** (not overloading existing kinds) — because it keeps
  the map data, builders, and tests clean and explicit.
- Double-yellow/crosswalks limited to **core roads/intersection** — chose to not retrofit
  every district road — because the core is what the player sees first and it bounds scope.
- Verification camera → chose **default post-Start follow camera** (approximates the
  city-walk framing) rather than authoring a bespoke debug camera — because it is the
  real in-game view and needs no new code.
- Build orchestration → chose to **extend `palette.ts` first (shared file), then fan out
  4 file-disjoint subagents** (facades / sky+clouds / roads / furniture) — because palette
  is the only shared file; pre-extending it lets the rest run in parallel without edit
  conflicts in the single worktree.
- Integrated build caught one `tsc` error → fixed `facade.ts` to allocate the pixel
  buffer via `new Uint8Array(new ArrayBuffer(...))` typed `Uint8Array<ArrayBuffer>`
  (matching `windows.ts`) — because `DataTexture` rejects `Uint8Array<ArrayBufferLike>`.
- Visual pass: sky still read pale and clouds sparse vs the target → applied a bounded
  atmosphere nudge (`turbidity 1.4→1.2`, `rayleigh 2.2→2.7`; clouds `height 34→30`,
  `scale 0.8+1.8r → 1.4+2.0r`) and screenshot-confirmed a deeper saturated blue with
  bolder clouds — kept exposure at 1.0 so the sky did not wash back out.
