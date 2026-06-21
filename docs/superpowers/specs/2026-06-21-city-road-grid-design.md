# City Road Grid — Design Spec

Date: 2026-06-21
Mode: autonomous-builder (`auto`). Design approved by user in chat. Forks logged below.

## Problem

The scene is a single east–west street on grass; buildings float on grass with no
sidewalks, no connecting roads, no intersections or signals. The user wants it to
read like an actual city: pavement around the buildings, a connected road grid, and
traffic lights.

## Approach (approved)

Reuse the existing, tested `src/world/roads.ts` `makeRoadNetwork(roads: RoadDef[])`
— it builds asphalt (grain texture) + concrete paver **sidewalks + curbs flanking
every road**, plus crosswalks, double-yellow, stop bars and lane arrows on the core
arterials. Two new catalog objects + a map re-author:

1. **`cityGrid`** catalog object. `params: { pitch, half, length, seed }`. Builds a
   `RoadDef[]` grid: horizontal roads at `z = k·pitch` and vertical at `x = k·pitch`
   for `k ∈ [-half, half]`, each `length` long. The central horizontal/vertical roads
   are named `main-h` / `cross-v` so the existing system gives them the painted
   treatment (crosswalks/yellow/stop bars/arrows at the central junction). Returns
   `{ mesh: makeRoadNetwork(roads) }` — no colliders (roads/sidewalks are drivable +
   walkable; the `ground` object already supplies the floor collider).

2. **`trafficLight`** catalog object. Dark pole + mast arm (+z) + a signal head with
   three lamps (red/amber/green, bright voxel colors), FRONT faces `-z`. Returns
   `{ mesh, colliders:[poleBox], obstacles:[smallRect] }`. Derived from a `height`
   param; lamp/arm offsets computed from dimensions (PITFALL 3).

3. **Re-author `map.ts`** onto the grid (`pitch = 56, half = 1`, roads at `{-56,0,56}`
   in x and z; road `length = 140` so each spans the grid). Road corridor half-width
   = `ROAD_W/2 (3) + SIDEWALK_W (1.6) = 4.6`; all building footprints kept ≥6m from
   each road centerline (inside block interiors). Placements:
   - Phone shop (lot) → NW block, center `(-22,-17)`, front +z at z=-9.
   - Restaurant (lot) → NE block, center `(22,-21)`, front +z at z=-9. (Both shops
     front the `main-h` road at z=0; the gap x∈[-11,11] clears the `cross-v` corridor.)
   - Terrace row A → SE block `(28,12) rot180 units3` (south streetwall on main-h).
   - Terrace row B → SW-south `(-28,45) rot0 units3` (streetwall on the z=56 road).
   - Glass towers → north skyline backdrop beyond the z=-56 road (z≈-66…-72), spread
     in x, clear of vertical-road corridors.
   - Park → SW block `(-28,28)`.
   - Traffic lights → 4 at the `(0,0)` intersection corners (±7, ±7), facing the junction.
   - Spawns → player `(8,9)` (off the cross-v road), car `(12,10)` (kept).
   - Remove the old standalone `road` and the two loose street flowers (now in the carriageway).

## Components / interfaces

- `cityGrid` build → `{ mesh }`. Consumes `makeRoadNetwork`, `ROAD_W` from `../roads`;
  `RoadDef` from `../rishonMap`.
- `trafficLight` build → `{ mesh, colliders, obstacles }`. Consumes voxel helpers +
  PALETTE.
- `map.ts` consumes both kinds + existing `lot`, `terraceRow`, `fillerBuilding`, `park`.

## Non-goals

- Block interiors stay grass behind the sidewalk strip (realistic; full-paving is a
  later pass). Crosswalks/arrows richest at the central junction (existing system).
- No traffic-light state machine / animation (static signal heads).
- No new collider behavior for roads (visual only).

## Verification

`npx tsc --noEmit` clean, then `npx vite build` succeeds. No tests/dev server/
screenshots (CLAUDE.md). Master, no worktree (user rule). User looks in-game after.

## Assumptions & Decisions

- Reuse `makeRoadNetwork` rather than a new road builder → it already does sidewalks/
  curbs/markings and is tested; one function delivers most of the ask.
- `cityGrid` returns visual-only mesh (no colliders) → roads/sidewalks must be
  drivable/walkable; the `ground` collider already provides the floor.
- `pitch=56, half=1` (3×3 junction grid) → compact, fully inside the 220 ground, with
  ~44m buildable blocks; the central junction lands in the existing shop gap.
- Spread the two hero shops to x-centers ∓22 → opens a ≥12m gap so `cross-v` (needs
  9.2m) fits between them without clipping either building.
- Towers kept as a freestanding north skyline (not on a block) → matches the "set
  back skyline" look and avoids crowding the central blocks.
- Terrace units reduced to 3 (~34m) for in-grid rows → comfortably fit 44m blocks
  with margin, avoiding edge overlaps with roads/park.
- Static traffic lights (no signal cycling) → content/landmark value without a
  runtime system; can animate later.
- Removed the two loose flowers + standalone road → they now fall on the carriageway.
