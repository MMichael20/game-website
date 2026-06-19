# Scalable Neighborhood (V2) — Design Spec (autonomous build)

Date: 2026-06-19
Branch/worktree: `worktree-3d-spike` (do NOT merge/deploy — hand back finished branch)
Builds on: `2026-06-19-v1-compact-map-design.md` (the current compact loop).

## Goal

Turn the current compact V1 loop into a fuller, **scalable** V1+ Roblox-style neighborhood —
**but the deliverable is the reusable systems, not hand-placed blocks.** The user's directive:
*"Do not just add more stuff manually. Build reusable detail systems so the map can grow."*

So this build is **systems-first, content-as-demonstration**. We build a small number of
data-driven kits and a location registry, then assemble the neighborhood from them so that
adding the *next* shop/park/office is a data entry, not a new bespoke file.

Target neighborhood (detail tiers in parens):
1. **Player house** (support) — exists, keep.
2. **Restaurant district** (HERO) — upgrade: bigger main restaurant + adjacent cafe, richer patio.
3. **Phone / tech shop** (secondary) — exists, retrofit onto the kit.
4. **Taxi pickup** (support) — exists, becomes a reusable kit.
5. **Real park** (secondary) — upgrade the pocket park: path loop, fountain, picnic, benches, NPC loop.
6. **Hi-tech office block** (secondary, NEW) — tall blue-glass tower + walk-in lobby + plaza + kiosks.
7. **Roads/sidewalks/intersections + traffic lights + stop signs** (support, never empty).

## Current state (grounded in the codebase)

- World assembled flat: `worldData.assembleMap()` → `rishonMap.CORE_MAP` → `World.ts` adds
  ground/clouds/`makeRestaurantStreet()`/colliders. Off-origin frame: `ground.center≈(95,104)`,
  `ground.size=100`.
- **Coordinate SSOT** is `world/districtPois.ts` (CX=95, CZ=95; band Z's SHOP_Z=89 < SEAT_Z=97 <
  ANCHOR_Z=103 < ROAD_Z=109; house/park south of the road). Everything derives from it.
- **`POIS[]`** (kind,id,label,x,z,r,glyph,color) is the de-facto location registry — already read
  by `interactions.nearestPoi`/`poiPrompt` and `Minimap.drawPois`. Thin: no zones/paths/interior/props.
- **Reusable primitives that exist:** `objects/voxel.ts` (tintGeo/tintedBox/cone/cylinderY/disc/
  lowPolyBall/mergeTinted/voxelMaterial/tintedMesh/ringAngles); the `make<Thing>(config):BufferGeometry`
  object pattern + `objectPalette.ts` presets + `objects/index.ts` `OBJECT_LIBRARY`; `InstancedProps.
  makeInstanced(geo,mat,placements,baseY)`; `assets.ts` geo/material cache; `props.ts` instancers.
- **A complete, tested, but UNUSED road kit:** `roads.ts` — `laneDashes/doubleYellowRects/
  crosswalkRects/roadIntersections/stopLineRects/laneArrows/parkingBayRects/curbRects/sidewalkRects` +
  `makeRoadNetwork(roads)` + asphalt/sidewalk/paver textures. `makeRoadNetwork` is **not called** in V1;
  the visible street is the one-off `restaurantStreet.makeStreetBlock()`.
- **NPC stack:** pure FSM `patronRoutine.ts` (Waypoint{to,state,dwell} + `makePatron/stepPatron`,
  route builders `dineInRoute`/`bakeryRoute`/`phoneShopRoute`/`crossingLoopRoute`/`taxiWaitRoute`/
  `patrolRoute`) + `itinerary.ts` `ACTIVITIES[]` (9) + `Patron.ts` THREE shell + `Humanoid.ts` avatar +
  `EntityManager` (`Agent{object,update}` + distance-cull). `pathFollow.advanceAlong` powers `NpcCar`.
  ONE patron type; "workers" are frozen `staticPeople.ts`.
- **Interiors:** 3 bespoke hand-built makers (restaurant/bakery/phone); only the **collider**
  `restaurantColliders.shellWalls(cx,w,d,h)` is shared (5 walls, open front center).
- **Glass:** single flat translucent boxes (opacity 0.2–0.62). No layering.

## Architecture — the reusable systems (build these first)

Each kit follows existing conventions: built on `objects/voxel.ts` primitives, vertex-color baked,
merged to a handful of draw calls; recognizable items registered in `OBJECT_LIBRARY`; colors in
`objectPalette.ts`; coordinates derived from `districtPois.ts`; chunky footprints registered via
`rectAround` in a `*PropObstacles()`; deterministic (no `Math.random`/`Date.now`).

### S1 — Layered glass object (`objects/glass.ts`) — NEW
`makeGlassPanel(cfg)` / `makeGlassPanelMesh(cfg)` and a small `GLASS_PRESETS`. A panel composes:
dark **frame** box, **tinted translucent pane**, a brighter **highlight** strip, optional vertical
**mullion** bars (divided panes), a **handle** (door variant), and a dim **interior-silhouette**
plane behind the pane. Transparency can't vertex-merge with opaque parts, so the panel returns a
**Group of ≤3 meshes** (opaque frame/mullions/handle merged; one shared transparent pane material via
`assets.getMaterial`; one silhouette plane). `cfg`: `{w,h,tint,frameColor,divisions,door?,handle?,
silhouette?}`. This replaces the flat glass boxes in restaurant/phone/bakery/house.

### S2 — Storefront detail kit (`world/storefront.ts`) — NEW
`makeStorefront(spec): {object, obstacles}` — a data-driven facade assembler that emits, from one
`StorefrontSpec`, the brief's pieces: main wall/body, base trim, roof trim, **sign band** (+emissive
lit accent), **door frame** + **glass door** (S1), **window frames** + **large glass** (S1), **awning**
(reuse one `makeAwning` kit), **wall lamps**, **window planters** (S3 planter), **entrance props**, and
optional **interior-visible-through-glass** silhouette. `StorefrontSpec`:
`{x, frontZ, w, h, signText?, awningColor?, glassStyle, doorSide?, lamps?, planters?, interiorPeek?}`.
The existing restaurant + phone storefronts are **retrofit** to call this (removing their inline
`restaurantStorefront*`/`makePhoneShop` shell helpers); the new cafe + office lobby are built from it.

### S3 — Prop-group kits (`world/kits.ts`) — NEW
Each kit is a function returning `{object, obstacles, seats?}` so geometry **and** NPC footprints are
produced together (kills the hand-retyped `*PropObstacles()` drift). Kits: `makePatioSet`,
`makePlanterRow`, `makeWindowPlanter`, `makeBenchBinLamp`, `makeTaxiKit`, `makeCrosswalkKit`,
`makeTrafficLightKit`, `makeStopSignKit`, `makePicnicKit`, `makeFountain`, `makeOfficePlaza`,
`makeBikeRack`, `makeDisplayShelf`, `makeCounterKit`. Repeated sub-props route through `makeInstanced`.
Recognizable atoms (planter, bench, traffic light, stop sign, bike rack, fountain, kiosk) are added as
`objects/*` modules + `OBJECT_LIBRARY` entries; the kits compose them. Existing inline planters/
patio/taxi/crosswalk are replaced by kit calls.

### S4 — Surface-fill system (`world/surfaceFill.ts`) — NEW
`fillSurface(region, kind, seed)` deterministically scatters greenery/pavement detail over a region
rect, given `roadRects`/footprints to avoid. Kinds: `grass` (flowers/bushes/small trees),
`plaza`/`pavement` (paver tiles + planters + bins). Generalizes the one-off `residential.ts` dressing
so no area reads as "buildings floating on grass."

### S5 — Location registry (`world/locations.ts`) — NEW
`LocationDef { id, name, type, minimap:{glyph,color,icon}, footprint?, interactionZones:[{center,r,
prompt}], npcPaths?, entry?, exit?, interiorId?, propGroups?, count? }` and `LOCATIONS: LocationDef[]`
+ helpers (`byId`, `byType`, `minimapEntries`, `allObstacles`). `POIS` becomes a **derived projection**
of `LOCATIONS` (so `nearestPoi`/`poiPrompt`/`Minimap.drawPois` keep working unchanged — `nearestPoi`
already takes an injectable list). `obstacles.PATRON_OBSTACLES` consumes `LOCATIONS.flatMap(l=>obstacles)`.
Coordinates still live in `districtPois.ts`; `locations.ts` references those constants. **Import-cycle
guard:** `locations.ts` may import `districtPois`, but `rishonMap.ts` must NOT (keep its mirrored literals).

### S6 — NPC behavior-type system (extend `patronRoutine`/`itinerary`/`Patron`)
Add named behavior types as data: `BEHAVIORS: Record<BehaviorType, (loc, rng)=>{waypoints, speed,
palette?}>` covering `sidewalkWalker, restaurantCustomer, restaurantWorker, shopCustomer, shopWorker,
taxiPassenger, parkWalker, parkBenchIdle, officeWorker, crosswalkPedestrian`. New closed-loop route
builders (`parkLoopRoute`, `officeLobbyRoute`, `cafeRoute`, `sidewalkLoopRoute`, `workerStationRoute`)
derive from `districtPois` anchors. `spawnPatrons` iterates `LOCATIONS × per-location counts` instead of
a flat `PATRON_COUNT`. **Generalize seating:** `Patron.poseSitting` reads a per-`Waypoint`/seat `faceYaw`
instead of the CX-anchored heuristic, so park benches / lobby / cafe seats face correctly (this unblocks
`parkBenchIdle` as a real behavior). Workers stand/loop behind counters as dynamic Agents.

### S7 — Roads/intersections/signals (wire the existing kit)
Populate `CORE_MAP.roads` with the real network (hero promenade + a cross street to the office block) and
call `makeRoadNetwork(roads)` from `World.ts` for the **new** roads (sidewalks/curbs/dashes/stop-lines/
lane-arrows for free). Keep `makeStreetBlock()` for the hero promenade to avoid double-drawing/z-fighting
at z≈109 (its crosswalk stays; new crossings use `makeCrosswalkKit`). Place `makeTrafficLightKit` /
`makeStopSignKit` at `roadIntersections(roads)` output. Traffic lights get a tiny deterministic cycling
controller (an `Agent` ticking a fixed-period state) — geometry-only, no lighting changes.

### S8 — Minimap from registry
`Minimap` markers (icon/shape/color) drive from `LOCATIONS.minimapEntries()`; base ground/roads/buildings
stay from `RishonMap` data (now populated with the real roads + new building footprints so they show).
Keep `minimapMath` signatures unchanged; keep the `- center` off-origin translation.

## Content built from the systems

- **Restaurant district (HERO):** widen main restaurant; add adjacent **cafe** (its own `makeStorefront`
  + small interior via the shared shell); richer patio via `makePatioSet` + `makePlanterRow`; outdoor
  diners + queue via `restaurantCustomer`/`restaurantWorker`.
- **Phone/tech shop:** retrofit storefront/glass onto S1/S2; `shopWorker` + `shopCustomer`.
- **Real park:** path loop, `makeFountain`, `makePicnicKit`, benches, `makeBenchBinLamp`, trees via
  `fillSurface`; `parkWalker` loop + `parkBenchIdle`.
- **Hi-tech office block (NEW):** tall blue-glass tower (new `BuildingDef` glass-tier variant or a
  bespoke `makeOfficeTower` using S1 glass), walk-in **lobby** (shared shell + reception/seating/kiosk
  via `makeCounterKit`/`makeDisplayShelf`), `makeOfficePlaza` (paving + `makeBikeRack` + kiosks +
  modern planters), `officeWorker` NPCs. Placed as a new wing (see layout).
- **Surface fill** applied to every empty grass/pavement region.

## Map layout & framing changes

- Grow the world to fit the office wing + bigger district while keeping the loop tight:
  `ground.size ≈ 160`, `ground.center` re-derived to frame all locations. Office block placed as an
  **east wing**: a new south-running cross street at the east end (past the phone shop ~x=118) leads to
  an office plaza + tower. This keeps the hero `restaurantStreet` (west/center, x≈68–118) geometry and
  its bounds undisturbed; exact coords pinned in the plan.
- New anchors added to `districtPois.ts`: `OFFICE_*`, `CAFE_*`, expanded `PARK_*`, intersection points.
- `CORE_MAP.roads` gains the cross street + the hero street id so the minimap + `roadClear` see them.
- `validateMap` bounds and `worldData.test` `size<=140` updated to the new framed size (deliberate).

## Test strategy (what we protect vs. deliberately update)

PROTECT (correctness invariants — keep green, do not weaken):
- `obstacles.test.ts` "every patron sit/order/wait/enter target reachable" + "indoor seats on real
  chairs" + scripted≠static chairs. Every new dwell target validated against `PATRON_OBSTACLES`.
- `restaurantColliders.test.ts` open-shell-vs-solid + bottom-on-ground (`y-hy≈0`).
- `voxel/instancedProps/props/facade/windows/roads/itinerary/patronRoutine/pathFollow/humanoid/
  interactions/interaction/taxi/minimapMath/culling/assets/palette/exit/rng/timestep/cameraMath` —
  keep green; extend **additively** (new types/objects get sibling tests; don't mutate pinned bytes).
- `smoke.spec.ts` — exactly 2 canvases, ZERO console errors after Start (the integration gate).

DELIBERATELY UPDATE (maintenance assertions that encode the *current* compact scene, not correctness):
- `restaurantStreet.test.ts` deterministic Box3 bounds (±138, exact min/max arrays) + traverse counts —
  adding patio/cafe content shifts the box; **keep** the meaningful asserts (≥3 `restaurantBuilding`
  meshes, 1 `awnings`, 1 `pickupStand`, ≥3 instanced, determinism-across-calls, `RESTAURANT==={x:95,z:103}`,
  SE-corner placement) and update the numeric bounds/counts to the new content.
- `worldData.test.ts` `ground.size<=140` → new framed size; keep "every building off every road",
  "exactly one isHouse", "in-bounds", "unique ids".
- `rishonMap.test.ts` CORE_MAP expectations (roads/buildings) for the populated network.
- Add NEW sibling tests: `glass.test.ts`, `storefront.test.ts`, `kits.test.ts`, `surfaceFill.test.ts`,
  `locations.test.ts`, plus new behavior-route + worker tests.

## Assumptions & Decisions (auto mode — self-answered, logged)

- **D1 Build emphasis** → chose **reusable systems first, content as demonstration** — the user's
  leading instruction prioritizes scalability ("build reusable detail systems so the map can grow")
  over raw quantity; this also makes the next location a data entry.
- **D2 One spec vs decompose** → chose **one cohesive spec, phased** — it's a single neighborhood; the
  kits are interdependent. The PLAN sequences it so the gate is green after each major phase (systems →
  retrofit → new content → roads/signals → NPC types → minimap → verify).
- **D3 Map expansion** → chose **grow `ground.size`≈160 + add an office wing**; update `validateMap`
  bounds + the `size<=140` test — the brief explicitly wants a fuller neighborhood incl. a NEW office
  block; the compact loop is kept as the core, the office is an additive wing so the walk stays short.
- **D4 `restaurantStreet` Box3 test** → chose **deliberately update the numeric bounds/traverse asserts,
  keep the semantic ones** — those exact-array bounds encode the *current* scene, not a correctness
  invariant; the brief requires changing that scene. Determinism-across-calls is preserved.
- **D5 Office lobby enterable** → chose **walk-in shell (open front) like the restaurant**, NOT a new
  portal/scene-swap system — consistent with the established "enterable = open shell" pattern; no new
  interior-load machinery (kept out of scope, as in V1).
- **D6 Roads kit vs hero street** → chose **keep `makeStreetBlock` for the hero promenade, wire
  `makeRoadNetwork` for the NEW cross street + intersections/signals** — avoids double-drawing/z-fighting
  at z≈109 while finally using the tested road kit for new content.
- **D7 Traffic lights** → chose **geometry kit + a tiny deterministic fixed-period cycling Agent**
  (no real lighting — colored lens emissive only) — adds life within rule 6 (no lighting/post) and stays
  deterministic/test-safe; baseline still reads fine if the controller is removed.
- **D8 Layered glass = extra meshes** → chose **a ≤3-mesh Group per panel with shared transparent
  material via `assets.getMaterial`** — transparency can't vertex-merge with opaque parts; sharing the
  pane material keeps draw calls bounded and the zero-console-error smoke safe.
- **D9 Location registry vs replacing POIS** → chose **`LOCATIONS` as the source, `POIS` a derived
  projection** — keeps `nearestPoi`/`poiPrompt`/`Minimap`/their tests working unchanged while giving the
  brief's richer per-location definition.
- **D10 Import cycle** → chose **`locations.ts` imports `districtPois`; `rishonMap.ts` stays literal-
  mirrored** — preserves the existing cycle-break (`rishonMap→districtPois→roads→rishonMap` must not form).
- **D11 Worker NPCs** → chose **dynamic Agents (loop/stand behind counter) for hero+secondary, keep a
  couple static fillers** — gives visible life without instancing every humanoid; `poseSitting`
  generalized to per-seat yaw so benches/lobby/cafe seating pose correctly.
- **D12 Retrofit scope** → chose **retrofit restaurant + phone storefront/glass onto S1/S2; leave
  procedural skyline/infill boxes on their painted facade** — mixing geometry glass onto procedural
  boxes risks draw-call blowup; hero buildings get the kit, backdrop stays cheap.

## Acceptance + gate

Gameplay: neighborhood reads as a finished Roblox-style block — hero restaurant district (bigger
restaurant + cafe + busy patio), retrofit phone shop, real park (path loop + fountain + picnic + NPC
loop), NEW hi-tech office block (glass tower + walk-in lobby + plaza + kiosks + bike racks), better
roads with crosswalks + traffic lights + stop signs, filled surfaces everywhere, NPCs of multiple
behavior types visibly moving, minimap showing every location from the registry. Every new location
was built from the kits; a future agent can add another shop by adding a `LocationDef` + a
`StorefrontSpec` + an interior def.

Gate (must be green, with evidence): `tsc --noEmit && vite build`, `vitest run` (all tests
updated/passing), `playwright test` smoke (exactly 2 canvases, **zero** console errors after Start),
plus manual playwright screenshots of each tier confirming the read.

Out of scope: lighting/post-processing/sky changes (rule 6); a portal/scene-swap interior system;
house interior; any merge/deploy.
