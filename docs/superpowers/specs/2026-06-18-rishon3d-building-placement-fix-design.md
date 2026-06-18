# Rishon3D — Building placement fix (no buildings on roads)

**Date:** 2026-06-18 · Branch: worktree-3d-spike · Mode: autonomous-builder (`auto`), iteration IT11.

## Problem (root-caused)
Buildings sit in the middle of roads. Two causes:
1. **Core downtown** hand-placed buildings `b5 (-34,-6)`, `b6 (6,36)`, `b7 (-8,-36)` straddle the
   core roads (`main-h` at z=0, `cross-v` at x=0) because their footprints extend into the
   ±3 road corridor.
2. **District** buildings near the **arterials** (`art-n/s` at x=0, `art-e/w` at z=0) sit on
   those arterials — `cityGen` only leaves corridors for each district's OWN grid roads, not
   the arterials that cut through them.

Nothing ever validated buildings against road corridors (only props were filtered). This is
the core "make it v1 worthy" placement bug.

## Fix

### Unit 1 — `src/world/roadClear.ts` (extend, pure): building-vs-road AABB filter
- `rectsOverlap(a: Rect, b: Rect): boolean` — standard AABB overlap.
- `filterBuildingsOffRoads(buildings: BuildingDef[], roads: RoadDef[], roadMargin: number, buildingMargin: number): BuildingDef[]`
  — drops any building whose footprint (±`buildingMargin`) overlaps any road corridor
  (`roadRects(roads, roadMargin)`). **Pure, unit-tested.** This is the general guarantee:
  after it, no building can overlap any road (core, arterial, or district).

### Unit 2 — `src/world/rishonMap.ts` (edit): nudge the 3 conflicting core buildings
Move them to clearly road-clear spots so downtown stays full (the filter would otherwise
delete them):
- `b5 (-34,-6) → (-38,-12)`
- `b6 (6,36) → (12,36)`
- `b7 (-8,-36) → (-14,-36)`
(All verified clear of `main-h`/`cross-v` with the chosen margins, in bounds, not overlapping
other core buildings.)

### Unit 3 — `src/world/worldData.ts` (edit): apply the filter
In `assembleMap`, run `filterBuildingsOffRoads(buildings, roads, 1.0, 0.5)` on the assembled
building list before returning. (Road corridor half-width = ROAD_W/2 + 1.0 = 4.0; buildings
keep a 0.5 shoulder.) The nudged core buildings survive; district buildings on arterials are
removed, leaving clean road corridors. `World.ts` builds colliders from `map.buildings`, so
removed buildings also lose their colliders automatically — no change needed there.

## Invariants / testing
- Determinism preserved (filter is a pure `.filter`, no RNG).
- `validateMap` still passes: exactly one house (the house is road-clear, never removed),
  unique ids, all in bounds.
- Tests: extend `roadClear.test.ts` (`rectsOverlap` + `filterBuildingsOffRoads` removes an
  on-road building, keeps an off-road one); add a regression to `worldData.test.ts`: **no
  building footprint overlaps any road corridor** in the assembled map. Existing assembleMap
  cases (one house, >20 buildings, unique ids, in bounds) still pass. Full `npm run test` +
  `build` + `test:smoke` green; screenshot confirms clear roads downtown.

## Decisions (autonomous log)
- D1 General AABB filter over per-building hand-fixing — guarantees correctness for core,
  arterials, and districts, and is unit-testable; the safety net for any future placement.
- D2 Nudge the 3 core buildings in source (rather than let the filter delete them) — keeps
  downtown full while staying road-clear.
- D3 Removing arterial-adjacent district buildings is the desired outcome — it clears the
  arterial corridors (a road should have clear sides), and districts have ample buildings left.
- D4 Margins roadMargin=1.0 / buildingMargin=0.5 → ~1-unit shoulder between building and road
  edge; clean separation without over-thinning the city.
- D5 The far-left "leaning" building in the report is wide-FOV edge perspective on an
  axis-aligned box (no rotation in code), not a geometry bug — no action.
