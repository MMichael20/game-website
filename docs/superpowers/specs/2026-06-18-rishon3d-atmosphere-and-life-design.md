# Rishon3D — Atmosphere & Life (golden-hour dusk, real roads, denser world)

**Date:** 2026-06-18
**Branch:** worktree-3d-spike
**Mode:** autonomous-builder (`auto`) — brainstorming forks self-answered and logged below.

## Goal

Make the rishon3d world feel like a real place at **18:45 — roughly 20 minutes before
sunset**: low warm sun still up, long shadows, a glowing sky, streetlights and windows
just starting to come on. At the same time, add environmental life and depth: **actual
roads** (lane markings + sidewalks/curbs), **more and more-varied trees**, and a couple
of new world modules (benches, lit windows) so the city reads as inhabited.

This is a content + atmosphere pass on the existing Three.js + Rapier slice. It does not
change gameplay, controls, physics, or the camera.

## Non-goals (YAGNI)

- No animated ambient creatures (birds, etc.). Motion/life is already provided by the
  existing NPCs, animals, and cars. (See decision D8.)
- No day/night cycle or time slider. One fixed, hand-tuned dusk look.
- No new gameplay, no interiors, no new vehicles.
- No broad refactor of building material creation beyond what windows need.

## Architecture

The work splits into small, independently testable units. Pure data/math lives in
functions that run under vitest (no WebGL); Three.js object construction stays thin.

### Unit 1 — `src/core/sky.ts` (new): dusk atmosphere config + sun math

- `sunDirection(elevationDeg, azimuthDeg): THREE.Vector3` — unit vector from the world
  origin toward the sun, from compass azimuth (0 = +Z/north, 90 = +X/east) and elevation
  above the horizon. **Pure, fully unit-tested** (cardinal cases, normalization).
- `DUSK` — a single frozen config object holding the 18:45 look: sun elevation/azimuth,
  Sky shader params (turbidity, rayleigh, mieCoefficient, mieDirectionalG), tone-mapping
  exposure, fog color + near/far, and the colors/intensities for the hemisphere /
  directional / ambient lights.
- `sunPosition(distance): THREE.Vector3` — `sunDirection(DUSK…)` scaled, for placing the
  directional light and the Sky `sunPosition` uniform consistently.

### Unit 2 — `src/core/Engine.ts` (edit): wire the atmosphere

- Add a `Sky` mesh (`three/examples/jsm/objects/Sky.js`), scaled large, with uniforms
  driven from `DUSK`. Set its `sunPosition` from `sunPosition()`.
- Set `renderer.toneMapping = ACESFilmicToneMapping` and `toneMappingExposure =
  DUSK.exposure` for an HDR, cinematic dusk.
- Recolor `scene.fog` to the warm dusk haze in `DUSK`; keep fog as `THREE.Fog`
  (linear) with `DUSK` near/far so distant districts melt into the horizon glow.
- Re-tune the three lights from `DUSK`: low warm directional **sun positioned via
  `sunPosition()`** (so shadows fall long and match the sky), warmer/dimmer hemisphere,
  slightly cool ambient fill. Keep the existing shadow-map setup; widen the shadow
  ortho box only if long shadows clip.
- `scene.background` is now the Sky, not a flat color.

### Unit 3 — `src/world/roads.ts` (new): actual roads

Derive richer road geometry from the existing `RoadDef[]` — **no map-data change needed.**

- `laneDashes(road): Placement[]` — positions/rotations of dashed center-line segments
  along a road (regular spacing, count derived from `road.length`). **Pure, unit-tested**
  (count, spacing, on-axis).
- `sidewalkRects(road): {x,z,w,d}[]` — the two curb/sidewalk strips flanking each road.
  **Pure, unit-tested** (flank offset = road half-width + sidewalk half-width; correct
  axis per `horizontal`).
- `makeRoadNetwork(roads): THREE.Group` — builds: asphalt surfaces (slightly darker than
  today), one instanced mesh of white dash quads for all center lines, and merged/instanced
  sidewalk strips in a light concrete color. Markings sit at y just above asphalt to avoid
  z-fighting. World swaps its per-road `makeRoad` loop for this.

### Unit 4 — `src/world/props.ts` (edit): tree variety + benches

- Trees gain a **species**: existing conifer (cone foliage) plus a new **deciduous**
  (rounded/sphere foliage, lighter green). `placementsFor` assigns species
  deterministically from the placement index; `treeInstances` emits a shared trunk
  instanced mesh plus one instanced foliage mesh per species. Foliage color varies subtly
  per species.
- `benchInstances(props)` — new instanced mesh for `"bench"` props (seat slab + two legs
  baked into one geometry, wood color). Mirrors the existing tree/bush instancing pattern.

### Unit 5 — `src/world/windows.ts` (new): lit-window emissive texture

- `windowPattern(cols, rows, seed): Uint8Array` — RGBA pixel data for a grid of windows,
  a deterministic subset lit warm (others dark). **Pure, unit-tested** (length =
  `cols*rows*4`, deterministic per seed, lit-fraction within bounds).
- `makeWindowTexture(...)` — wraps the pattern in a `THREE.DataTexture` (warm emissive
  windows). One shared texture instance, reused across buildings.
- `src/world/builders.ts` (edit): non-house buildings get the window texture as
  `emissiveMap` with a warm `emissive` color and `emissiveIntensity` from `DUSK`, with
  `repeat` scaled to building width/height so windows tile at a believable size. Houses
  keep their current look (small, pitched-roof homes).

### Unit 6 — content density tuning (edit, deterministic)

- `src/world/cityGen.ts`: raise per-cell vegetation probability and occasionally place a
  bench beside a building. **Preserve the fixed rng draw order** (add new draws at the end
  of the per-cell sequence so existing structure stays stable); keep all footprints clear
  of road corridors.
- `src/world/worldData.ts`: add deterministic **roadside tree rows** along the four
  arterials so the drives between districts are lined with trees.
- `src/world/rishonMap.ts`: extend `PropKind` with `"bench"`; add a few hand-placed
  benches/trees in the downtown core; keep `validateMap` passing (in-bounds, clear of
  buildings).
- `src/world/World.ts`: raise the streetlight point-light budget (dusk wants more glow)
  to a still-modest cap, and add the bench instances to the scene.

## Data flow

`DUSK` (sky.ts) is the single source of truth for the time-of-day look; Engine consumes it
for sky + lights + fog + exposure, and builders/windows consume its emissive intensity.
World generation (rishonMap → cityGen → worldData → World) stays deterministic; new props
(`bench`, extra trees) flow through the existing `PropDef[]` pipeline and instancing.

## Error handling

- Sky/atmosphere is additive; if the `Sky` import path ever fails, the scene still renders
  (fog + lights). Guard nothing dynamically — it's a static import resolved by Vite.
- `validateMap` continues to gate map integrity at boot; new props must pass it.
- Determinism is the core invariant for world gen: every new rng use is appended in fixed
  order and covered by a determinism test.

## Testing

Vitest (no WebGL) for all pure units; `tsc --noEmit` + `vite build` for type/build safety;
existing Playwright smoke test must still load the scene.

- `sky.test.ts` — `sunDirection` cardinal/elevation cases + unit length; `DUSK` sanity
  (sun low above horizon, exposure < 1).
- `roads.test.ts` — `laneDashes` count/spacing/on-axis; `sidewalkRects` flank offset + axis.
- `windows.test.ts` — `windowPattern` length, determinism, lit-fraction bounds.
- `props.test.ts` — species assignment deterministic; bench placements map 1:1 to `"bench"`
  props. (Three.js geometry/material constructs fine under node; assert instance counts.)
- Update `cityGen.test.ts` / `worldData.test.ts` / `rishonMap.test.ts` for the new draws,
  roadside trees, and `"bench"` kind — keeping determinism and footprint-clearance asserts.
- Whole suite (`npm run test`) and `npm run build` green before completion.

## Assumptions & Decisions (autonomous self-brainstorm log)

- D1 Sky technique → chose **Three.js `Sky` shader** (examples/jsm) over a gradient dome or
  flat background — because it gives physically-based Rayleigh/Mie sunset glow driven by a
  sun position, looks best for golden hour, and ships with the installed three@0.169.
- D2 Time-of-day encoding → chose **sun elevation ≈ 4° above horizon, azimuth ≈ 290° (WNW)**
  as "18:45, ~20 min before sunset" — because a low but positive elevation keeps the sun
  visibly up with long shadows; exact almanac accuracy is irrelevant for a game. Tunable in
  `DUSK`.
- D3 Tone mapping → chose **ACESFilmic with exposure ≈ 0.5** — because the Sky shader emits
  HDR values that need tone mapping, and sub-1 exposure delivers the "a bit dark but sun
  still out" brief.
- D4 Fog → chose to **keep linear fog, recolored to warm dusk haze** matching the horizon —
  because it cheaply blends distant districts into the glow and already exists.
- D5 "Actual roads" scope → chose **dashed center lines + sidewalk/curb strips derived from
  existing `RoadDef`** over modeling intersections/curbs-with-bevels — because it reads as
  real roads with no map-data churn and stays instanced/cheap.
- D6 Tree variety → chose **two species (conifer + deciduous) via per-instance species
  index**, kept fully instanced — because variety is the ask and instancing keeps draw
  calls flat.
- D7 Lit windows → chose a **procedural `DataTexture` emissiveMap** (grid of warm windows)
  over per-window meshes or a canvas texture — because DataTexture is pure pixel data
  (testable, no canvas/DOM dependency in node) and one shared texture costs ~nothing.
- D8 "More life" → chose **environmental life (trees, roads, benches, lit windows,
  streetlight glow)** and **deferred animated creatures (birds)** — because the existing
  NPCs/animals/cars already supply motion, and birds add non-deterministic animation work
  outside the atmosphere brief.
- D9 Determinism with new content → chose to **append new rng draws at the end of each
  cell's fixed sequence** rather than interleave — because it preserves existing layout
  stability while letting tests keep asserting determinism.
- D10 Streetlight glow budget → chose to **raise the point-light cap to ~12** (from 6) —
  because dusk wants more pooled light, while staying well within a safe perf budget.
