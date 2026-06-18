# rishon3d — Voxel Daytime "Toy-City Readability" Pass (v0.1)

Date: 2026-06-18
Branch: worktree-3d-spike
Status: Approved design, ready for implementation plan

## Goal

Move the rishon3d spike from "3D dusk prototype" to "this could actually become
the browser game style" by pivoting the art direction to a bright, saturated,
blocky **Roblox/voxel daytime** look. Reference target:
`assets/roblox-style-city-browser-game.png` (bright sunny street, deep blue sky
with chunky white clouds, flat saturated colors, blocky trees, blocky character
with a backpack, clean blocky cars, raised curbs, striped shop awnings, an
elevated rail line).

v0.1 is a **bright toy-city readability pass**, not merely a lighting/material
swap. The city must read as *playable streets and shops*, not generic low-poly
blocks. It is the first detail pass toward that reference, not a pixel-perfect
recreation.

## Non-goals (deferred to later passes)

- Animated train (only a **static** elevated rail silhouette in v0.1)
- Animated fountain
- Building interiors / glassy storefront interiors
- Fine character details: spiky hair, face, backpack straps (a plain backpack
  **box** is in v0.1)
- Vehicle variety (one improved car model is enough for v0.1)
- Re-adding bloom (deferred; can return later for lamps/lit windows)

## Hard constraints

- **No gameplay/physics/controls changes.** This is purely visual. Driving,
  walking, NPCs, taxi/ride flow, minimap, HUD, phone, world layout, and all
  spawns/colliders behave exactly as before. Collider shapes/sizes are unchanged
  even where visual meshes change (e.g. car, character, trees).
- **Keep the performance architecture.** Reuse the `assets.ts` geometry/material
  cache and the `InstancedProps` instancing. New repeated props (trees, curbs,
  awnings, clouds) must be instanced or geometry-merged, not one mesh per object.
- **Stay deterministic.** Any randomized placement reuses the existing seeded RNG
  (`mulberry32` in `world/rng.ts`); no `Math.random()`.

## v0.1 target checklist

```text
Bright daytime + saturated palette
Voxel clouds
Blocky trees
Blocky character with cube head + backpack box
Cleaner blocky car
Curbs
Striped awnings
Matte colorful buildings
Optional static elevated rail silhouette
No gameplay changes
No bloom/ACES
```

---

## Section 1 — Scene & lighting (`core/Engine.ts`, `core/sky.ts`)

The current scene is a deliberate dusk: physically-based `Sky` with a low sun,
warm orange `Fog` (near 50 / far 200), `ACESFilmicToneMapping` at exposure 0.58,
and an `UnrealBloomPass`. All of this is tuned by the `DUSK` constant in
`core/sky.ts`. We replace the mood with a bright midday config.

Changes:

- **Sky:** retune the existing three.js `Sky` uniforms to midday — high sun
  elevation (e.g. ~55-70 deg), low turbidity, blue Rayleigh, small/dim sun disc.
  Keep using `Sky` (already wired) rather than introducing a new sky system.
- **Sun direction / lights:** raise the directional sun to a high angle so
  shadows are short and soft (keep `PCFSoftShadowMap`). Strong `HemisphereLight`
  (blue sky color / green ground color) for flat, even fill; modest
  `AmbientLight`. Bright, low-contrast, poster-like — colors should read flat and
  saturated, not high-contrast.
- **Fog:** remove the heavy orange dusk fog. Either drop fog entirely or use a
  very faint, far blue haze (large `fogFar`) so distant buildings stay crisp and
  colorful. Default: drop it for v0.1.
- **Tone mapping / exposure:** switch off `ACESFilmicToneMapping` (it desaturates
  and fights the look). Use `THREE.NoToneMapping` or `THREE.NeutralToneMapping`
  at exposure ~1.0.
- **Bloom / post:** remove the `UnrealBloomPass` for v0.1 and render directly
  (drop the `EffectComposer`, render `renderer.render(scene, camera)` in
  `frame()`), or keep the composer with bloom strength 0. Simpler + faster path
  preferred: render directly and keep the composer code easy to restore later.
- **Clouds:** add a small set (e.g. 6-12) of chunky white blocky cloud clusters
  (each a merged group of boxes), placed high above the city, drifting very
  slowly (or static). Unlit/emissive-white or flat-white material so they stay
  bright. Belongs in a new `world/clouds.ts` (or `core/sky.ts`).

The `DUSK` constant becomes the single source of truth for the **daytime** look
(rename to `DAY` or repurpose `DUSK`'s fields with daytime values — keep one
named config object that Engine consumes, mirroring today's structure).

## Section 2 — Materials & palette (new `world/palette.ts`, `world/assets.ts`)

- **Flat matte materials.** Replace the PBR look with flat matte shading:
  `MeshLambertMaterial`, or `MeshStandardMaterial` with `metalness: 0,
  roughness: 1`. No glossy highlights. `flatShading: true` where chunky facets
  help. Lambert is the default choice (cheap, no specular).
- **New `world/palette.ts`:** one module exporting the saturated color constants
  used everywhere — sky blue, grass green, asphalt, light-gray sidewalk, curb
  gray, building colors (cream/tan, warm yellow, brick red, blue-glass), black
  lamp pole, warm lantern emissive, awning red/white and blue/white, wood brown,
  leaf green, trunk brown. Everything pulls colors from here so the palette is
  tunable in one place.
- **Building repaint.** The current building colors in `world/rishonMap.ts`
  (`CORE_MAP.buildings`) are muted blue-grays (`0x8d99ae`, `0x6d7a91`, etc.).
  Repaint them to the saturated reference palette (tans, creams, yellows,
  brick-red, blue-glass) — assign from `palette.ts`. The house body/roof colors
  in `world/builders.ts` get the same treatment (keep the cream body + warm roof
  but tune toward the brighter palette).

## Section 3 — Hero entities (the detail the user explicitly wants)

### Tree (`world/props.ts`)
Replace the cone (conifer) and squashed-sphere (deciduous) foliage with a
**voxel tree**: a short brown trunk box + a canopy built from stacked green cubes
(a chunky Minecraft-style cluster). Keep 1-2 species (e.g. tall vs. bushy) and
keep them **instanced** — merge the canopy boxes into one `BufferGeometry` per
species (via `mergeGeometries`) so each species is a single instanced draw, as
trunks/foliage are today. The `treeSpecies()` deterministic split stays.

### Character (`entities/Humanoid.ts`, `entities/Character.ts`)
Rebuild the humanoid blocky in `makeHumanoid`:
- **Cube head** instead of the current `SphereGeometry` head.
- Boxy torso and limbs (already boxes) tuned to slightly chunkier Roblox-ish
  proportions (somewhat larger head).
- A **backpack box** attached at the torso back.
- Keep the existing limb-pivot rig and `animateWalk` exactly (legs/arms still
  swing from the same pivots). The `HumanoidLimbs` interface and the
  `Character`/`Npc` consumers stay source-compatible.
Hair, face, and straps are deferred. The capsule collider in `Character.ts` is
unchanged.

### Car (`entities/Car.ts`, and shared by `entities/RideCar.ts` / `NpcCar.ts` /
`world/parkedCars.ts` if they build their own mesh)
Improve the blocky car so it reads as a clean toy car, not just two stacked
boxes:
- Lower body / bumper block, a **window glass band** (dark/tinted) around the
  cabin, simple **headlight** blocks, saturated matte paint.
- Wheels: keep cylinders (flat-shaded) or switch to box wheels with a hubcap;
  either way flat matte black.
- The chassis collider (`cuboid(0.9, 0.3, 1.8)`), wheel positions, and all
  driving physics are **unchanged** — only the visual chassis/cabin/wheel meshes
  change. If multiple car entities duplicate mesh-building, factor the visual
  build into one shared helper so they look consistent.

## Section 4 — Props & street surfaces (`world/props.ts`, `world/roads.ts`,
`world/builders.ts`)

- **Street lamp (`makeStreetLight`)**: keep the pole; make the lantern a clearly
  **glowing warm lantern** (emissive box/lantern shape) so lamps read "lit" like
  the reference even in daytime. (Re-adding an actual bloom glow is deferred.)
- **Curbs (`world/roads.ts`)**: add raised curb strips along the sidewalk/road
  edge. Sidewalks are currently flat planes at y≈0.015; add a thin raised curb
  box (a few cm tall) at the asphalt/sidewalk boundary so streets read as real
  curbed streets. Instanced/merged across all road segments. Purely visual — no
  colliders (player/cars already constrained as today).
- **Awnings (`world/builders.ts`)**: add striped awning blocks (red/white and
  blue/white) over building fronts to make them read as shops. Deterministic
  which buildings get one and the stripe color. Cheap geometry (a slanted box or
  a couple of boxes); striping via two-color geometry or a simple texture.
- **Bushes (`world/props.ts`)**: make blockier — small box clusters instead of
  squashed spheres. Stay instanced.
- **Quick-win props (optional, drop first if time is tight):** trash cans and
  planters as small boxes near storefronts.

## Section 5 — Static elevated rail silhouette (new `world/rail.ts`)

A **static** elevated rail/overpass — no train, no animation. A simple raised
track deck running along one edge of the map (e.g. parallel to a main road, set
back from the playable core), held up by evenly spaced concrete support pillars.
Big reference signal that stops the scene looking like generic city blocks.
Geometry-merged or instanced (deck as long boxes, pillars as one instanced set).
No collider (it's overhead). Placement is deterministic and chosen to avoid
overlapping buildings/roads/spawns. If it proves fiddly to place cleanly, it is
the **first thing to cut** from v0.1 (it was the "optional" pull-in).

---

## Architecture / data flow

No new subsystems beyond small additive modules. The data flow is unchanged:
`main.ts` -> `Game.ts` wires `Engine` (scene/lights/render) and `World`
(builds ground/roads/buildings/props from `RishonMap`); entities (`Character`,
`Car`, NPCs) are `Tickable`s added to the engine loop.

New/changed files:
- `world/palette.ts` — NEW. Central saturated color constants.
- `world/clouds.ts` — NEW. Blocky cloud clusters.
- `world/rail.ts` — NEW. Static elevated rail silhouette.
- `core/sky.ts` — daytime config (replaces/repurposes `DUSK`).
- `core/Engine.ts` — daytime lights, no ACES, no bloom (direct render), add
  clouds/rail to scene (or have `World` add them).
- `world/builders.ts` — building/house repaint, awnings.
- `world/roads.ts` — raised curbs.
- `world/props.ts` — voxel trees, blocky bushes, glowing lantern.
- `world/rishonMap.ts` — saturated building colors. (PropDef/BuildingDef types
  may gain optional fields for awning/curb/rail config if needed.)
- `entities/Humanoid.ts` — cube head, backpack, chunkier proportions.
- `entities/Car.ts` (+ shared car-mesh helper) — cleaner blocky car.

## Testing & verification

- `cd rishon3d && npm run build` — must pass (`tsc --noEmit` typecheck + Vite
  build). The pivot must not break the type contracts (`HumanoidLimbs`,
  `RishonMap`, etc.).
- `npm test` (`vitest run`) — existing unit tests (window pattern, map
  validation, math helpers, etc.) must stay green. Add small unit tests for any
  new pure helpers (e.g. cloud/rail/curb placement, palette lookups, voxel-tree
  geometry counts) following the existing test style.
- `npm run test:smoke` (`playwright test`) — existing smoke must still pass.
- **Visual check:** run `npm run dev` and confirm against the reference:
  bright blue sky + blocky clouds, saturated matte buildings, voxel trees,
  blocky character with cube head + backpack, cleaner car, visible curbs and
  awnings, and (if kept) the elevated rail silhouette. Capture a screenshot to
  compare with `assets/roblox-style-city-browser-game.png`.
- Confirm **no regressions** in driving/walking/taxi: physics, colliders, and
  controls behave as before.

## Open questions / decisions already made

- Tone mapping: `NoToneMapping` or `NeutralToneMapping` at exposure ~1.0
  (decided: drop ACES).
- Bloom: removed for v0.1 (decided), code kept easy to restore.
- Awnings + curbs: in v0.1 (decided).
- Static rail: in v0.1, first to cut if fiddly (decided).
- Trash cans/planters: optional, drop first if time is tight (decided).

## Assumptions & Decisions (autonomous build log)

Forks resolved during the autonomous run (auto mode: decide + log):

- Pre-existing WIP in the worktree → committed it as a checkpoint (`b08e308`,
  taxi→phone-ride refactor) before starting — because the baseline built and all
  110 unit tests passed, and the WIP overlapped my target files; a checkpoint
  gives a clean base and keeps the user's work separate from mine in history.
- Worktree isolation → reused the existing `worktree-3d-spike` worktree (master
  never touched) rather than nesting a new one — already isolated.
- `DUSK` config → renamed to `DAY` with midday values — because a constant named
  DUSK holding daytime values is misleading; churn is small (Engine, builders,
  sky.test).
- Tone mapping → `THREE.NeutralToneMapping` at exposure 1.0, fallback
  `NoToneMapping` if the types lack it — drops ACES desaturation while taming the
  bright sky.
- Bloom → removed; render directly via `renderer.render` (no `EffectComposer`) —
  daytime needs no glow; code is easy to restore later.
- Fog → dropped entirely for v0.1 — keeps distant districts crisp/colorful.
- Materials → kept `MeshStandardMaterial` (its defaults metalness 0 / roughness 1
  are already matte); only removed the cars' explicit `metalness: 0.3`. No blanket
  Lambert swap — the glossy realism came from ACES + low fill light, not the
  materials; avoids wide churn/risk.
- Clouds → static (no drift) for v0.1, `MeshBasicMaterial` (always-bright flat
  white), instanced — simplest faithful result.
- Curbs → no collider; accepted that curb strips visually cross at intersections
  in v0.1 (kept low, `CURB_H` 0.12) — refine later.
- Awnings → placed on the building's +z face (not road-facing), ~45% of
  buildings, red/blue chosen by a hash of the building id — simple + deterministic.
- Rail → placed at x=130 (clear of districts which span ±125 within the ±140
  ground); static, no collider; first to cut if placement is fiddly.
- Trash cans/planters → omitted from the plan (YAGNI; deferred per spec).
- Daytime windows → kept a subtle cool window emissive (0.18) rather than off, so
  building window grids stay faintly visible; proper daytime window albedo
  deferred.
- Execution mode → self-selected subagent-driven-development (auto mode skips the
  execution-choice prompt).
```
