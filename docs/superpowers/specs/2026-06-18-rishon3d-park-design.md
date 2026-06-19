# Rishon3D — Park area

**Date:** 2026-06-18 · Branch: worktree-3d-spike · Mode: autonomous-builder (`auto`), iteration IT6.

## Goal
Add a green park (open space with grass, a path, scattered trees and benches) so the city
has a recreational area, as requested. Placed at `(-58, 58)` — open ground between the
downtown core and the west/south districts, reachable by driving.

## Architecture

### Unit 1 — `src/world/park.ts` (new)
- `PARK = { x: -58, z: 58, size: 34 }` (const).
- `parkProps(seed?): PropDef[]` (pure, deterministic) — scattered `tree` + `bench` props
  within the park footprint (kept a few units inside the edge). **Unit-tested**: fixed
  count, all within park bounds, deterministic for a seed. Uses `mulberry32`.
- `makeParkGround(): THREE.Object3D` — a grass `PlaneGeometry` (green) just above the main
  ground, plus a light path strip; shared geo/mat via `getGeometry`/`getMaterial`; thin
  (not unit-tested).

### Unit 2 — wiring
- `src/world/worldData.ts`: `props.push(...parkProps())` BEFORE the existing
  `filterPropsOffRoads(...)` call (park is off-road, so all survive; if any ever overlapped a
  road it would be correctly removed).
- `src/world/World.ts`: `scene.add(makeParkGround())`.

## Invariants / testing
- Deterministic (no `Math.random`).
- Park props flow through the existing `treeInstances`/`benchInstances` (driven by
  `map.props`) — no new render path.
- Tests: `park.test.ts` (count, in-bounds, deterministic); existing `worldData.test.ts`
  road-corridor regression still passes (park is clear of roads). Full `npm run test` +
  `build` + `test:smoke` green.

## Decisions (autonomous log)
- D1 Location `(-58,58)` → verified clear of districts (west x∈[-125,-65], south z∈[65,125])
  and arterials (x=±55, z=±55); open, drivable-to.
- D2 Park content via `PropDef`s added to the map → reuses existing instancing; only the
  grass/path ground is a new mesh.
- D3 Size 34 → a believable city block of green without crowding neighbors.
