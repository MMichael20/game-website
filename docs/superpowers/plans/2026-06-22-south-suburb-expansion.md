# South Suburb Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Build a large southern residential district (opposite the northern airport)
with ~70+ houses on a connected road grid, a per-house driveway, and a huge richly-
detailed mansion that is the player spawn with the drivable car parked beside it.

**Architecture:** Pure world-authoring data. Grow the `playerHouse` composite and add
a front-yard detail layer; add a new `driveway` catalog object; rewrite
`suburbPlacements()` as a programmatic south grid; rewire `map.ts` (connector, spawn,
car). Everything derives from dimension constants — no magic offsets.

**Tech Stack:** TypeScript, Three.js, Rapier, Vite. Registry/manifest/engine world.

## Global Constraints

- Determinism: NO `Math.random` / `Date.now` / argless `new Date()` in builders; seed
  via `mulberry32` from `world/rng.ts`.
- Rotation only in {0, 90, 180, 270}; child placement derived from real dimensions.
- Gate is ONLY `npx tsc --noEmit` clean + `npx vite build` succeeds. NO tests, NO dev
  server, NO screenshots (per `CLAUDE.md`).
- Build at LOCAL origin: centered x=z=0, base y=0, FRONT faces +z, ~1u = 1m.
- Coordinates: +x east, -x west, +z north, -z south. Airport north (0,+260).

---

### Task 1: Enlarge the hero `playerHouse` + add a 30+ element front-yard detail layer

**Files:**
- Modify: `src/world/catalog/playerHouse.ts`

**Interfaces:**
- Produces: same registry object `"playerHouse"` with params `{ seed }`. Footprint
  grows; builder still returns `{ mesh, colliders, obstacles, anchors, pois }`.
  `anchors.door = { x: 0, z: D/2 }`, `anchors.driveway = { x: garCX, z: D/2 + 4 }`
  remain (consumers in the layout read these).

- [ ] **Step 1: Grow the dimension constants.** At the top of `build()` change:
  `W = 26`, `D = 20`, `FLOOR_H = 3.3`, keep `FLOORS = 2`, `GAR_W = 11` (3-car),
  `GAR_D = 9`. Leave all derived child code as-is (interior furniture is wall/`livCX`
  anchored and stays valid). Verify the door/window/roof/garage still derive cleanly.

- [ ] **Step 2: Add a `makeFrontYard(): Piece` builder** (mirrors `makePorchAndYard`
  but for the FRONT, +z side) producing **30+ detail elements**, all derived from
  `W`, `D`, `DOOR_W`, `PORCH`/path metrics. Include at minimum:
  - Walkable **stoop**: 2 steps (each ~0.15 m rise) up to the floor slab, full-block
    per-step colliders like the interior stairs (so the player walks up).
  - Grand **entry walk**: a paved slab runway from the stoop to ~`D/2 + 10` (kept
    clear: NO colliders, NO props on the centre line — this is the spawn corridor).
  - **Flower beds** (2) flanking the stoop: soil box + a grid of coloured voxel
    blooms (stem + bloom), ≥6 blooms each.
  - **Flower borders** lining both sides of the walk (rows of blooms).
  - **Hedges** (2 long) flanking the façade; **topiary balls** (2) at the walk mouth.
  - **Lamp posts / lanterns** (2) at the walk entrance.
  - **Garden bench** (1) on the lawn.
  - **Potted plants** on the porch (2) and by the door (2).
  - **Window flower boxes** under each front ground-floor window (2+).
  - **Path lights / edging stones** along the walk (≥4).
  - **Front lawn trees** (2) + **shrubs** (4).
  - **Bird bath / garden ornament** centrepiece (1), **welcome mat** at door (1),
    **house-number plaque** beside the door (1).
  Keep every collider OFF the entry walk centre line.

- [ ] **Step 3: Assemble.** Add `const front = makeFrontYard();` to the ASSEMBLE
  block; spread `front.parts` into `allParts`, `front.colliders` into `colliders`,
  `front.obstacles` (if any) into `obstacles`. Keep anchors/pois.

- [ ] **Step 4: Typecheck.** Run `npx tsc --noEmit`. Expected: clean. Fix any errors.

- [ ] **Step 5: Commit.**
  `git add src/world/catalog/playerHouse.ts && git commit -m "feat(house): huge hero mansion + 30+ front-yard details"`

---

### Task 2: New `driveway` catalog object

**Files:**
- Create: `src/world/catalog/driveway.ts`
- Modify: `src/world/catalog/index.ts` (add `import "./driveway";` in the suburb block)

**Interfaces:**
- Produces: registry object `"driveway"`, params `{ length: number; width?: number;
  color?: number }`. Built at LOCAL origin running ALONG +z (length on z, width on x),
  base y≈0.02. Returns `{ mesh }` only (no colliders — drivable/walkable).

- [ ] **Step 1: Implement** a flat concrete slab `width × length` centred at origin,
  top just above ground; add a pair of slightly darker **tyre-track** strips along z
  and a thin lighter **edging** border on the ±x sides — all derived from `width`/
  `length`. Use `tintedBox`/`mergeTinted`/`tintedMesh` like other catalog objects;
  `defineObject("driveway", { params: { length: 8, width: 3, color: PALETTE.curb }, build(p){…} })`.

- [ ] **Step 2: Register** — add `import "./driveway";` under the
  "Residential suburb props." block of `src/world/catalog/index.ts`.

- [ ] **Step 3: Typecheck.** `npx tsc --noEmit` clean.

- [ ] **Step 4: Commit.**
  `git add src/world/catalog/driveway.ts src/world/catalog/index.ts && git commit -m "feat(catalog): driveway strip object"`

---

### Task 3: Rewrite `suburbPlacements()` as a big south grid + driveways + amenities

**Files:**
- Modify: `src/world/suburbMap.ts`

**Interfaces:**
- Consumes: `"playerHouse"` (Task 1, new footprint via its `driveway` anchor),
  `"driveway"` (Task 2), plus existing `road`, `house`, `fence`, `mailbox`, `tree`,
  `planter`, `lamp`, `bench`, `parkedCar`.
- Produces: `suburbPlacements(ox, oz): Placement[]` (same signature) building the whole
  district relative to origin `(ox, oz)`. Exports `HERO_SPAWN: Vec2` and
  `HERO_CAR_SPAWN: Vec2` + `HERO_CAR_YAW: number` (world-space) for `map.ts` to import.

- [ ] **Step 1: Roads.** Build **3 E-W avenues** at `z = oz + {+54, 0, -54}` (len
  ~260, `x ∈ [ox-130, ox+130]`) and **4 N-S cross streets** at `x = ox + {-96,-32,
  +32,+96}` (len ~120, spanning all three avenues). Use `road` (ROAD_W=6). Record the
  road bands for overlap checks (avenue z-bands `z±3`, cross x-bands `x±3`).

- [ ] **Step 2: Hero lot.** Place the bigger `playerHouse` on a prime lot just east of
  the central cross, north of the north avenue, `rot 180` (front faces south to the
  avenue). Derive the fence perimeter from the new footprint (+1.5 m margin), a front
  gate, mailbox at the curb, and 4 yard trees — same pattern as today but with the new
  W=26/D=20 extents. Add a **`driveway`** from the avenue up to the hero front
  (length = setback), `rot 180`. Export `HERO_SPAWN` (just in front of the door on the
  walk, world coords) and `HERO_CAR_SPAWN` (on the driveway, world) + `HERO_CAR_YAW`
  (facing the avenue/south). Do NOT place a scenery `parkedCar` on the hero lot.

- [ ] **Step 3: Placeholder houses (programmatic, ~70+).** For each avenue, place a
  north row (`rot 180`) and a south row (`rot 0`) of houses set back ~16 m from the
  avenue centre; iterate x across the avenue at pitch ~20 m, **skipping any lot whose
  footprint would enter a cross-street x-band or the hero lot**. Each house: seeded
  `house` params with bigger sizes (`w` 10–14, `d` 11–14, `stories` 2–3, alternating
  garage/porch, `seed = 400 + i*7`). For **every** placed house also push a
  **`driveway`** from the fronting avenue to the house front (length from setback,
  `rot` matching the house facing). Target ≥ 64 placeholder houses (+ hero).

- [ ] **Step 4: Amenities + greenery (MORE).** Add a **pocket park** block in one
  interior grid cell (use existing `park` or `plaza` kind + `bench`/`tree`/`planter`),
  street **lamps** along every avenue (rows), and scattered **trees**/`planter`s along
  the perimeter and between lots — all outside road bands and house footprints.

- [ ] **Step 5: Overlap audit.** Re-read the generated bands and assert in comments (as
  the current file does) that no house extent enters a road band, the hero lot, or
  another house; fix any offender.

- [ ] **Step 6: Typecheck.** `npx tsc --noEmit` clean.

- [ ] **Step 7: Commit.**
  `git add src/world/suburbMap.ts && git commit -m "feat(suburb): south district grid, ~70 houses, per-house driveways, park"`

---

### Task 4: Rewire `map.ts` — south connector, relocate district, spawn + car at home

**Files:**
- Modify: `src/world/map.ts`

**Interfaces:**
- Consumes: `suburbPlacements`, `HERO_SPAWN`, `HERO_CAR_SPAWN`, `HERO_CAR_YAW` from
  `suburbMap.ts`.

- [ ] **Step 1: Remove** the west connector expressway + its 6 lamps and the
  `...suburbPlacements(-205, 0)` line.

- [ ] **Step 2: Add a south connector** — an `airportRoad` along `z` (`rot 90`) at
  `x=0` from the city south edge (`z≈-64`) to the north avenue (`z≈-156`), centred
  `z≈-110`, length ~92, width 16; add lamp rows along it. Then
  `...suburbPlacements(0, -210),`.

- [ ] **Step 3: Spawn + car at home.** Change `PLAYER_SPAWN` to import/equal
  `HERO_SPAWN`; change `CAR_SPAWN` to `HERO_CAR_SPAWN` and `CAR_SPAWN_YAW` to
  `HERO_CAR_YAW`. (Import them from `./suburbMap`.)

- [ ] **Step 4: Typecheck.** `npx tsc --noEmit` clean.

- [ ] **Step 5: Commit.**
  `git add src/world/map.ts && git commit -m "feat(map): south connector + spawn & car at the hero mansion"`

---

### Task 5: Verify the gate

- [ ] **Step 1:** `npx tsc --noEmit` → clean.
- [ ] **Step 2:** `npx vite build` → succeeds.
- [ ] **Step 3:** Report results; hand back the branch (master). Do NOT run the dev
  server or screenshot.

## Self-Review

- Spec coverage: relocate south (T4), 4x+ houses (T3), road grid (T3), driveways (T3),
  bigger mansion (T1), 30+ details (T1), spawn at home (T4), car at home (T3 exports +
  T4), amenities/MORE (T3). All covered.
- Placeholders: none — each task carries concrete constants and commands.
- Type consistency: `HERO_SPAWN`/`HERO_CAR_SPAWN`/`HERO_CAR_YAW` exported by T3 and
  consumed by T4; `driveway` params consistent between T2 and T3.
