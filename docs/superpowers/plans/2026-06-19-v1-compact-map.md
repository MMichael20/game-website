# V1 Compact Map — Implementation Plan

Spec: `docs/superpowers/specs/2026-06-19-v1-compact-map-design.md`. Worktree
`worktree-3d-spike`. Do NOT merge/deploy.

Strategy: implement the tightly-coupled **spine** inline & sequentially (shared files,
exact coordinates), then fan out the **mechanical cleanup + test reconciliation** in a
parallel workflow, then **verify** (tsc + vitest + vite build + playwright).

---

## Phase 1 — Map data & framing (spine)

### 1.1 `world/districtPois.ts`
- Add house block:
  ```ts
  export const HOUSE = { x: 74, z: 124, w: 12, d: 9, h: 5 };
  // front faces -z (north) toward the street:
  export const HOUSE_FRONT = HOUSE.z - HOUSE.d / 2;          // 119.5
  export const HOUSE_DOOR: Vec2 = { x: HOUSE.x, z: HOUSE_FRONT };
  export const HOUSE_SPAWN: Vec2 = { x: HOUSE.x, z: HOUSE_FRONT + 2.5 }; // ~122 on the path
  export const DRIVEWAY: Vec2 = { x: 86, z: 123 };
  export const MAILBOX: Vec2 = { x: 80, z: 118 };
  ```
- Relocate the pocket park to the south, below the crosswalk:
  `PARK_CENTER = { x: 94, z: 121 }` (was (70,101)); `PARK_BENCH` follows (e.g. center.z+2).
- Add `"house"` to `PoiKind`; add a POIS entry
  `{ kind:"house", id:"house", label:"Home", glyph:"H", color:"#f4c542", x:HOUSE_DOOR.x, z:HOUSE_DOOR.z, r:4 }`.
- Keep restaurant/bakery/phoneShop/taxi/park/pickup POIs. (interactions.test wants
  taxi+restaurant+park to exist and the restaurant prompt to contain "walk in".)

### 1.2 `world/rishonMap.ts`
- Extend `RishonMap.ground` to `{ size: number; center?: Vec2 }`.
- Replace `CORE_MAP` content: ground `{ size: 100, center: { x: 95, z: 104 } }`; one
  house building at `HOUSE` (id "house", isHouse:true) — keeps `validateMap`'s "exactly
  one house"; drop the downtown cross + coreFurniture + the 8 generic buildings; one
  decorative street `RoadDef` `{ id:"street", x:95, z:109, length:60, horizontal:true }`
  (for the minimap + roadClear); `npcSpawns` a small handful near the loop (clear of
  buildings); `carSpawn` at the driveway `{ x:86, z:123 }`; `playerSpawn = HOUSE_SPAWN`.
- Keep `validateMap` invariants. (Import HOUSE/HOUSE_SPAWN from districtPois, or inline.)

### 1.3 `world/worldData.ts`
- Rewrite `assembleMap()` to return the compact `CORE_MAP` directly (no DISTRICTS,
  arterials, roadsideTrees, downtown parkProps, generateDistrict). Keep `filterPropsOffRoads`
  for props vs the one street. Keep exported names `assembleMap` and `RISHON_MAP`.
  Remove `DISTRICTS` export (and its import of `generateDistrict`/`DistrictSpec`/`park`).

---

## Phase 2 — World assembly & house geometry (spine)

### 2.1 `world/playerHouse.ts` (NEW)
- `export function makePlayerHouse(): THREE.Object3D` anchored at `HOUSE`/`DRIVEWAY`/
  `MAILBOX`/`HOUSE_DOOR` from districtPois. Built from the voxel/tinted helpers + PALETTE
  to match the concept art (yellow body, terracotta/brown roof trim, blue windows w/
  frames, brown door, porch step, window planter boxes w/ `makeFlower`, low wood fence,
  paver front path, grass yard pad, mailbox, driveway slab + a green parked car via
  `makeCarBody({bodyColor:0x2e8b57, variant:"van", withWheels:true})`). Merge/instance to
  a few draw calls. Name the main shell mesh (e.g. `"playerHouse"`).
- `export const HOUSE_COLLIDER: BoxCollider` (or compute in restaurantColliders) — a solid
  box for the house body.

### 2.2 `world/restaurantStreet.ts`
- `INFILL_FOOTPRINTS`: remove the 4 `rfar-*` (south far-retail). Keep `rflank-0` + `rbg-0/1/2`.
- Add a south residential strip: a south sidewalk + grass yard pad (extend `makeStreetBlock`
  or a new `makeResidentialLot`), then `group.add(makePlayerHouse())`. Move/trim the wide
  parked-car spread; keep a couple near the curb.
- Pocket park already pulls from `PARK_CENTER` (now south) — verify its planters/edge face
  the street (north).
- Preserve named meshes the tests check: ≥3 `"restaurantBuilding"`, exactly 1 `"awnings"`,
  1 `"pickupStand"`, ≥3 InstancedMesh, `RESTAURANT===(95,103)`, bounds still SE-corner
  (min.x>30/min.z>30) — these still hold (block stays at 95,95).

### 2.3 `world/restaurantColliders.ts`
- Iterate the trimmed `INFILL_FOOTPRINTS` (auto). Append a solid house collider from
  `HOUSE`. Keep the walk-in shell invariants (open front clear, walls solid, bottom y=0).

### 2.4 `world/World.ts`
- Remove `makeRail()`, `makeAirport()`, `makeParkGround()` (downtown park),
  `makeStreetFurniture(map)`, and `makeRoadNetwork(map.roads)` calls. Keep `makeGround`,
  `makeRestaurantStreet`, `restaurantColliders`, building loop, prop instancers, streetlights,
  clouds (repositioned over the block).
- `makeGround` + the ground collider honor `map.ground.center`.
- Reposition the clouds group to `ground.center`.

### 2.5 `world/builders.ts`
- `makeGround(map)`: position the grass plane at `map.ground.center ?? origin`, size
  `map.ground.size`. (House uses its own branch / or playerHouse builds it directly.)

---

## Phase 3 — NPC life & UI (spine)

### 3.1 `game/Game.ts`
- Remove `planPopulations`, `Npc`, `Animal`, and `world.npcSpawns` scatter. Keep
  `spawnPatrons(scene)`. Add 1–2 `NpcCar` with hand-authored short E–W street routes
  (e.g. along `ROAD_Z`, a there-and-back closed loop offset off-screen at each end).
- Keep the summon-car / phone / HUD-prompt / minimap wiring. Shrink the `callCar`
  `player.x+25` summon offset if needed for the compact map.

### 3.2 `game/itinerary.ts`
- Add a `goHome` activity anchored at `HOUSE_DOOR` (walk home, dwell, leave). Keep
  dineRestaurant/outdoorDine/visitPark/crossStreet/browsePhone/browseBakery/waitTaxi/stroll.
- Narrow `stroll()`/`jit` x-spread from ±18 to fit the compact block.

### 3.3 `entities/Patron.ts`
- Reduce `PATRON_COUNT` 12 → ~7. Sit-facing keys off `CX=95` (unchanged) — OK.

### 3.4 `ui/Minimap.ts`
- Frame the compact block: use `map.ground.center` as view center and `map.ground.size`
  as span. Translate world coords by subtracting center before `worldToMinimap`
  (DON'T change `minimapMath` signatures — they're pinned). Draw the one street + house +
  buildings; POI markers already derive from `POIS` (now includes house).

---

## Phase 4 — Delete dead modules (cleanup workflow)

Delete files + their tests: `cityGen.ts`(+test), `districts.ts`, `rail.ts`(+test),
`airport.ts`(+test), `park.ts`(+test), `populate.ts`(+test), `entities/Npc.ts`,
`entities/Animal.ts`, `parkedCars.ts`(+test). Remove all imports/usages.

---

## Phase 5 — Test reconciliation (cleanup workflow, parallel per file)

Update for the compact map (each agent owns one file, runs that test to green):
- `worldData.test.ts` — was: >20 buildings, ≥3 districts. New: assert compact map
  (1 house, the one street, ground.size 100 + center, RISHON_MAP shape).
- `rishonMap.test.ts` — keep validateMap + one-house; update CORE_MAP expectations.
- `restaurantStreet.test.ts` — drop the 4 `rfar` assumptions if any; keep named-mesh +
  RESTAURANT + SE-corner asserts (still valid); update infill count if pinned.
- `restaurantColliders.test.ts` — add house-collider expectation; trimmed infill.
- `streetFurniture.test.ts` — repoint to a self-contained road fixture (no assembleMap).
- `roads.test.ts` — only if CORE_ROAD_IDS/isCoreArterial expectations change (likely not,
  since we keep restaurantStreet's own crosswalk; verify).
- `populate.test.ts`, `parkedCars.test.ts`, `cityGen/rail/airport/park.test.ts` — DELETE.
- `wander.test.ts` — if `buildingRects/pointInRects` are removed with Npc/Animal, drop
  those cases; keep `moveToward/reachedTarget`. (Or keep the helpers to avoid churn —
  decide during build: simplest is keep wander.ts intact since it's cheap.)
- `itinerary.test.ts` — structural invariants should survive; verify sitters set + new
  goHome activity don't violate determinism/speed asserts.

> Note: `wander.ts` — KEEP intact (cheap, pure) to avoid breaking its test; just stop
> importing the unused helpers elsewhere. Only `Npc/Animal/populate` consumers go away.

---

## Phase 6 — Verify (verification workflow)

1. `npx tsc --noEmit` — zero errors.
2. `npx vitest run` — all remaining tests green (capture summary).
3. `npx vite build` — succeeds.
4. `npx playwright test` (smoke) — exactly 2 canvases, zero console errors after Start.
5. Manual: `vite dev` + playwright navigate, click Start, screenshot the block from a
   street-level angle; confirm it reads like the concept art (house+park south,
   restaurant strip north, crosswalk between, minimap framed on the block).
6. Adversarial review pass (workflow) over the diff for correctness/coupling regressions.

Hand back the finished branch with a summary (built / assumed / remains / test results).
