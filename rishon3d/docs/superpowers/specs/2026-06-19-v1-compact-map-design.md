# V1 Compact Map — Design Spec (autonomous build)

Date: 2026-06-19
Branch/worktree: `worktree-3d-spike` (do NOT merge/deploy — hand back finished branch)
Source design: `game-website/docs/plans/2026-06-19-v1-small-map-design.md` + concept art in
`assets/design-examples/v1-*.png`.

## Goal

Collapse the rishon3d world from a sprawling procedural city into a single compact,
readable V1 block built around the restaurant we already have. The map becomes one
short walkable loop with four core locations:

1. **Player House** (spawn / home base) — NEW
2. **Pocket Park / plaza** (landmark on the walk) — exists, relocate to player side
3. **Open Restaurant + patio** (the hero, kept & improved, enterable) — exists, keep
4. **Phone Shop + Taxi Curb** (utility) — exists, keep

Loop: `house → park → crosswalk → restaurant → phone/taxi → home`, every location
reachable in < 20s on foot. "Start small and grow."

## Key finding (why this is surgical, not a rewrite)

The codebase has **two parallel coordinate systems**:

- A big procedural city at/around the origin (`CORE_MAP` + `DISTRICTS` + arterials +
  `airport` + `rail` + downtown `park`) that the player **never visits**.
- The actual playable slice: the **restaurant promenade at `CX=95, CZ=95`**, a
  self-contained scene (`makeRestaurantStreet()`) anchored by the single source of
  truth `world/districtPois.ts`. It already contains the restaurant (enterable),
  bakery (enterable), phone shop (enterable), pocket park, taxi pickup, crosswalk,
  patio seating, planters, awnings, and a scripted NPC "patron" life system. The
  player already spawns here (95,100).

So V1 = **delete the big-city half, keep the slice, add a house, re-frame the
ground/minimap, trim NPC population.** ~90% of the loop already exists.

## Map layout (final, CX=95 / CZ=95 kept — see Decision D1)

Coordinates anchored in `districtPois.ts`. Street runs E–W; `ROAD_Z=109` centerline,
`SHOP_Z=89` strip front line, crosswalk at `x=CX=95`.

**NORTH side (commercial, z ≈ 78–101) — KEEP as-is:**
- Skyline backdrop: 3 tall background boxes (`rbg-0/1/2`, z≈78).
- Strip front (`SHOP_Z=89`): bakery `x=80` (open), restaurant `x=95` (open hero),
  closed eatery `x=110`, phone shop `x=118` (open). West closure box `rflank-0 x=68`.
- Patio (`SEAT_Z=97`): tables/chairs/umbrellas/planters/lamps/dessert-cart/patio-people.
- Taxi curb: cab + sign on the north curb (`TAXI_CAR x≈104`).

**ROAD (z ≈ 106–112):** asphalt, double-yellow, curbs, central crosswalk at x=95
(drawn by `restaurantStreet.makeStreetBlock()`, independent of `roads.ts` gating).

**SOUTH side (residential, z ≈ 115–130) — NEW, replaces the deleted far-retail infill:**
- South sidewalk (paver) z≈114–116; grass front yards z≈117–122.
- **Player House** `~(74,124)`, front door faces north toward the street; body + roof,
  readable windows, door, porch step, window planters, low fence.
- Driveway + decorative parked car `~(86,123)`; mailbox at the path `~(80,118)`;
  front path (paver) from door to sidewalk.
- **Pocket Park** relocated to `PARK_CENTER ≈ (94,121)` (south, just below the
  crosswalk): grass pad, 2–3 trees, bench, bin, planters, lamp, path.
- Player spawn = house front path `~(74,121)` facing north.

**Loop check:** spawn house(x74) → east along south walk → park(x94) → north across
crosswalk(x95) → restaurant(x95) → east to phone/taxi(x104–118) → cross back → home.
Monotonic, short, every beat a landmark.

**Ground / minimap framing:** introduce `ground.center` so the ground plane, the
ground collider, and the minimap all frame the playable block (`center ≈ (95,104)`,
`size ≈ 100`) instead of the old 280-unit origin-centered city.

## What "enterable" means in V1

No new interior/portal system. The restaurant, bakery and phone shop are **walk-in
shells**: the mesh has an open storefront and the colliders (`restaurantColliders.ts`
`shellWalls()`) leave the front center open, so the player physically walks in. The
house is **exterior-only for V1** (design says interior is "optional, not required").
The house collider is a solid box (you don't enter it yet).

## Assumptions & Decisions (auto mode — self-answered, logged)

- **D1 Re-center to origin vs keep (95,95)** → chose **keep at CX=95,CZ=95** — because
  re-centering ripples into multiple pinned tests (`restaurantStreet.test` SE-corner
  asserts + `RESTAURANT===(95,103)`) and the playable area is asymmetric in z anyway
  (so origin wouldn't auto-center the minimap). Instead add an explicit `ground.center`
  for framing — fewer test changes, no coordinate shift through 12 dependent files.
- **D2 House placement** → chose **south side, opposite the restaurant, replacing the
  far-retail infill** — because the design loop and concept art both put the player
  crossing the crosswalk from a residential side to the restaurant side. Park moves
  south too so `house→park→crosswalk→restaurant` is a clean monotonic walk.
- **D3 Bakery (2nd eatery)** → chose **keep** — it's finished, enterable, on-theme for
  a "restaurant street," part of "the restaurant thingie we worked on," and deleting
  working content gains no gameplay. Hero = main restaurant; bakery = adjacent cafe.
- **D4 Closed 3rd restaurant** → chose **keep** — cheap strip-filler between restaurant
  and phone shop; already wired into colliders.
- **D5 Infill buildings (8)** → chose **keep 3 skyline backdrop (`rbg`) + 1 west
  closure (`rflank`); delete the 4 south far-retail (`rfar`)** — the south is now the
  residential lot; the skyline matches the concept art's distant city.
- **D6 facade.ts / windows.ts** → chose **keep** — still used by the retained skyline/
  infill boxes via `makeBuilding`; deleting them would break those.
- **D7 clouds** → chose **keep** (reposition group over the block) — the user likes the
  bright sky; clouds are one cheap instanced draw and match the concept art.
- **D8 NpcCar traffic + pathFollow** → chose **keep, feed 1–2 hand-authored short
  street routes** (not `planPopulations`) — a car or two driving past adds life cheaply
  and matches the art; delete only the big-city population planner.
- **D9 streetFurniture grid generators** → chose **stop calling `makeStreetFurniture`
  in World** (the compact map has no arterial grid; taxi/bus utilities are covered by
  `secondaryLocations`); keep the file + repoint its test to a self-contained fixture.
- **D10 map.roads / makeRoadNetwork** → chose **keep one decorative street `RoadDef`
  for the minimap, drop the `makeRoadNetwork(map.roads)` call in World** (the real 3D
  road is drawn by `restaurantStreet`; avoids double-rendering). `roadClear` still uses
  the one road to keep props off it.
- **D11 NPC random-wander stack (`Npc`, `Animal`, `populate`)** → chose **delete** — the
  desired life is the scripted `Patron`/`itinerary` stack; the random wanderers are
  big-city filler coupled to the scrapped map.
- **D12 parkedCars.ts (procedural)** → chose **delete** — replaced by the few
  hand-placed cars already in `restaurantStreet` + the new driveway car.
- **D13 No interior/scene-swap system for V1** → walk-in shells already satisfy
  "enterable"; house interior deferred.

## Files: keep / modify / delete (from the architecture map)

**DELETE (big city):** `cityGen.ts`, `districts.ts`, `rail.ts`, `airport.ts`,
`park.ts` (downtown park), `populate.ts`, `entities/Npc.ts`, `entities/Animal.ts`,
`parkedCars.ts` — and their tests (`cityGen/rail/airport/park/populate/parkedCars.test`).

**MODIFY (spine — done inline, carefully, shared files):** `districtPois.ts` (add
HOUSE anchors+POI, move PARK), `rishonMap.ts` (gut `CORE_MAP` to one house + ground
center), `worldData.ts` (compact `assembleMap`), `World.ts` (drop rail/airport/
downtown-park/streetFurniture/roadNetwork calls; ground center; house collider),
`restaurantStreet.ts` (drop `rfar` infill, add south residential lot + south sidewalk,
move park), `restaurantColliders.ts` (drop deleted infill, add house box),
`Game.ts` (drop planPopulations/Npc/Animal, keep patrons + add 1–2 NpcCar routes),
`Minimap.ts` (frame around `ground.center`), `itinerary.ts` (add home activity, narrow
stroll), `entities/Patron.ts` (reduce count), `builders.ts`/`palette.ts` (minor).

**NEW:** `world/playerHouse.ts` (house + yard + driveway car + mailbox + fence + path).

**KEEP verbatim:** engine spine (`Engine/Physics/timestep/FollowCamera/cameraMath/
Input/sky/culling/format/carMesh/Car/RideCar/Character/Humanoid/EntityManager`), the
whole `objects/*` library + `assets/InstancedProps/props`, `restaurantInterior`,
`bakeryInterior`, `secondaryLocations`, `roads`/`roadClear`, the scripted-NPC engine
`patronRoutine`, and the interaction/UI machinery (`interactions/InteractionSystem/
taxi/exit/Phone/Hud/Menu/minimapMath`).

## Acceptance (from design doc) + test gate

Gameplay: player spawns at the house; route to restaurant is obvious; restaurant/
bakery/phone shop are enterable walk-ins; patio furniture is chunky & readable;
umbrellas/planters are real objects; NPCs visibly move in/out and sit; phone shop +
taxi curb present; pocket park present; minimap shows all core locations (house,
park, restaurant, phone shop, taxi) and frames the compact block.

Gate (must be green, with evidence): `tsc --noEmit && vite build`, `vitest run` (all
remaining tests updated/passing), `playwright test` smoke (exactly 2 canvases, **zero**
console errors after Start). Plus a manual playwright screenshot confirming the block
reads like the concept art.

Out of scope for V1: lighting/post-processing changes, house interior, new interior/
scene-swap system, any merge/deploy.
