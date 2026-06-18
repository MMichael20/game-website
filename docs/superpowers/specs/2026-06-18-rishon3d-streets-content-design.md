# Rishon3D — Streets: road-clear props (bug fix) + parked cars

**Date:** 2026-06-18
**Branch:** worktree-3d-spike
**Mode:** autonomous-builder (`auto`) — iteration IT2. Forks self-answered and logged.

## Goal

Fix the reported bug "trees in the middle of the road", and add **parked cars** along the
roadsides to make streets feel lived-in. (More sidewalks and a park area are the next
iteration; graphics passes follow.)

## Problem (root-caused)

- Hand-placed core trees `t11 (0,30)` and `t12 (0,-30)` sit on the `cross-v` road
  (x=0 vertical, z∈[-60,60], 6 wide → x∈[-3,3]); their centers are on the road.
- `roadsideTrees()` along arterials (flank 5) does not skip intersections, so some trees
  land on perpendicular roads.

A point-fix of two coords would not catch intersection cases or future additions. So:

## Architecture

### Unit 1 — `src/world/roadClear.ts` (new, pure): road corridors + prop filter

- `roadRects(roads: RoadDef[], margin: number): Rect[]` — each road as a `Rect`
  (`{minX;maxX;minZ;maxZ}`, same shape as `wander.ts`), corridor half-width = `ROAD_W/2 +
  margin` (`ROAD_W` from `./roads`). Horizontal road spans its length in x and the corridor
  in z; vertical road the reverse. **Pure, unit-tested.**
- `filterPropsOffRoads(props: PropDef[], roads: RoadDef[], margin: number): PropDef[]` —
  drops any `tree`/`bush`/`bench` whose center lies in a road corridor; **keeps
  `streetlight`** (intentionally roadside). Reuses `pointInRects` from `./wander`. **Pure,
  unit-tested.**

### Unit 2 — wire the filter into `src/world/worldData.ts`

- In `assembleMap`, after all props are gathered (core + districts + roadside trees), apply
  `filterPropsOffRoads(props, roads, MARGIN)` so no tree/bush/bench survives on a road.
  Margin chosen so roadside trees (flank 5) survive but on-road props are removed.

### Unit 3 — `src/world/parkedCars.ts` (new, pure) + renderer

- `planParkedCars(map: RishonMap, seed: number, max: number): Placement[]` — deterministic
  positions/rotations for static cars parked just off the driving lane along roads
  (offset ≈ `ROAD_W/2 + 1.2` from road centerline, spaced along the road, oriented along it),
  skipping spots that fall on a building rect or out of bounds. `Placement` is the existing
  `{x;z;rotationY;scale}` from `InstancedProps`. **Pure, unit-tested** (count ≤ max, all
  in-bounds, all clear of buildings, deterministic).
- `parkedCarInstances(placements: Placement[]): THREE.Object3D` — one instanced mesh of a
  simple parked-car shape (merged body + cabin box, muted colors), via `makeInstanced` +
  `mergeGeometries`, like `benchInstances`. Thin; not unit-tested.

### Unit 4 — wire into `src/world/World.ts`

- Build parked-car placements from the map and add `parkedCarInstances(...)` to the scene.

## Data flow

`assembleMap` filters props off roads before they ever reach the renderer. `World` plans
parked cars from the same map and adds them as one instanced mesh. No change to the physics
step, the drivable `Car`, NPC traffic, or tested modules' behavior.

## Error handling / invariants

- World generation stays deterministic (no `Math.random`; `mulberry32(seed)`).
- `filterPropsOffRoads` and `planParkedCars` are total functions (never throw); empty inputs
  yield empty outputs.
- Parked cars are decorative (no colliders) — they will not block the drivable car. (Logged
  D3.)

## Testing

- `roadClear.test.ts` — `roadRects` corridor extents per orientation; `filterPropsOffRoads`
  removes an on-road tree, keeps an off-road tree, keeps an on-road streetlight, is
  deterministic.
- `parkedCars.test.ts` — `planParkedCars` count ≤ max, all in-bounds, none inside a building
  rect, deterministic for a seed.
- Regression assertion in `worldData.test.ts`: no `tree`/`bush`/`bench` prop in the assembled
  map lies within a road corridor.
- Full `npm run test` + `npm run build` + `npm run test:smoke` green.

## Assumptions & Decisions (autonomous log)

- D1 Fix breadth → chose a **general road-corridor filter** over editing the two bad coords —
  catches intersections and future props, and is unit-testable.
- D2 Streetlights exempt → chose to **keep streetlights** in the filter (they belong at road
  edges); only vegetation/benches are removed from corridors.
- D3 Parked cars are decorative (no physics collider) → keeps the drivable car's handling
  unchanged and avoids spawning dynamic bodies; they are visual dressing parked off-lane.
- D4 Corridor margin → chose `ROAD_W/2 + 1.5` (= 4.5) so flank-5 roadside trees survive while
  on-centerline props are removed.
- D5 Parked-car density → a modest seeded cap (e.g. ≤ 40) spaced along roads, skipping
  building overlaps — enough to feel populated without clutter or perf cost.
