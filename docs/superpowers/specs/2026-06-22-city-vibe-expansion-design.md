# City-Vibe Expansion — Design

Date: 2026-06-22
Mode: autonomous-builder (`auto all`) — clarifying questions self-answered; see
**Assumptions & Decisions**.

## Goal

Turn the current single-junction town (220×220m, one cross intersection, two hero
shops) into a denser **city**: a real arterial grid, multiple rows of buildings
filling the blocks, the two existing stores on the main street, and a **highway**
bounding the city to the north. Keep the bigger world performant.

This is **city vibe only**. The airport (and its "press E to enter / load airport
map" flow) is explicitly a **separate later phase** and is out of scope here. No
moving traffic / AI cars.

## Non-goals (deferred, logged)

- Airport map + map/scene switching + E-to-enter interaction → future phase.
- AI/moving vehicles on roads or highway.
- New interactive store interiors — reuse the existing `phoneRepairShop` and
  `restaurant` as the "two stores"; everything else is non-interactive backdrop.

## Architecture (fits the existing registry + manifest + engine)

All new content is authored as **data**, following CLAUDE.md: new object `kind`s in
`src/world/catalog/`, placed by lines in `MAP` (`src/world/map.ts`). Child placement
is **derived from dimensions** (PITFALL 3), never magic offsets. Determinism only
(seeded `rng`, no `Math.random`/`Date.now`).

### A. World expansion

- `GROUND_SIZE` 220 → **280** (world spans [-140, 140]). The `ground` object's floor
  collider auto-sizes from `size`, so this is the only change needed for the floor.
- `cityGrid` → **half = 2, length ≈ 260** (pitch 56 unchanged): arterials at
  x,z ∈ {-112, -56, 0, 56, 112}. The core junction (main-h × cross-v at 0,0) is
  unchanged, so the existing hero-shop frontages, plaza, kiosks and traffic lights
  stay valid. Roads are visual-only (no colliders) — they never trip the engine's
  footprint-overlap check; buildings are responsible for staying clear of road
  corridors (≥ ~6m off any centerline, matching the existing convention).

### B. New catalog objects

**1. `highway`** — `src/world/catalog/highway.ts`
A divided highway **segment**, authored at LOCAL origin, running along **+x** by
default (length param), centered on z=0. Composed entirely of derived dimensions:
  - Two asphalt carriageways (each ~`lanes`×`laneW`), one on each side of a center
    median, separated by `medianW`. One merged/few-mesh asphalt surface using the
    existing `makeAsphaltTexture()` (single `MeshStandardMaterial` per carriageway).
  - **Center median**: a raised planted/concrete strip down the middle (low box) —
    a **collider** so you can't cross between carriageways.
  - **Guardrails / barriers** along the two outer edges — low boxes, **colliders**,
    so the highway reads bounded and is safe to drive up to.
  - **Lane markings**: dashed white lane lines per carriageway (instanced via the
    existing `makeInstanced`) + a solid edge line. No crosswalks/arrows (not a city
    street).
  - Optional simple **overhead sign gantry** (`gantry: boolean`, default off) — a
    portal frame over the carriageways with a blank green sign panel; off by default
    to keep it cheap.
  - Returns `{ mesh, colliders: [median, 2 guardrails], obstacles: [outer rails] }`.
  - Carriageway asphalt is **drivable** (no collider on the road surface itself,
    matching `cityGrid`/`road`); only median + guardrails collide.

**2. `buildingRow`** — `src/world/catalog/buildingRow.ts`
A composite "fill-in" streetwall: **N backdrop buildings spaced along x with gaps**,
deterministic by seed. Unlike `terraceRow` (butted party walls), this row leaves a
small `gap` between freestanding `fillerBuilding`s so it reads as a block of
separate buildings. Reuses `fillerBuilding` (no new building primitive).
  - Each unit's center x is the running sum of prior `(width + gap)` — **derived**,
    no magic offsets (PITFALL 3). Row is centered on local x=0 (or anchored).
  - Per-unit width/height/style/body-color/ground chosen deterministically from the
    seed + a district palette (same approach as `terraceRow.genUnit`). A deterministic
    subset get masonry **storefront** ground floors for street life.
  - Each unit shows facade detail on the faces that are exposed for a streetwall
    (`+z` front always; `+x`/`-x` only on the row ends; configurable for back rows
    that face away via a `facing`/`rot` at placement time).
  - Returns the composed `{ mesh: Group, colliders[], obstacles[] }` (one collider +
    obstacle per building) via the same `compose()` pattern `terraceRow` uses.
  - One `MAP` line places a whole row.

### C. Map restructure (the city)

`src/world/map.ts` is re-authored to read as a city. Layers, from the core outward:

1. **Core (kept):** `ground` (size 280), `cityGrid` (half 2), central `pavement`,
   the two hero lots (`phoneRepairShop`, `restaurant`) with their frontages, the
   central `plaza`, the two `kioskCart`s, the four `trafficLight`s. Player/Car spawns
   unchanged.
2. **Mid rows:** `buildingRow`s and one or two `terraceRow`s laid along the arterials
   to fill the blocks around the core — multiple rows of buildings on the N, E and W
   sides, each facing its street (rot chosen so fronts face the road). Buildings kept
   clear of road corridors.
3. **North skyline row:** the existing four `fillerBuilding` towers folded into a
   back row (or a `buildingRow` of towers) just south of the highway.
4. **Highway:** one (or two, end-to-end) `highway` placement(s) running E-W along the
   north edge (~z = -126), with the north building row between the city and the
   highway so the progression reads "city → rows → highway".

Footprints must not overlap (the engine warns); placements derive clearance from the
grid pitch and each object's footprint.

### D. Optimization (perf hygiene for the denser city)

The world is fully static after build. The denser city adds many objects, so:

- **Freeze static transforms.** In `World.ts`, after `scene.add(built.group)`, do one
  `built.group.updateMatrixWorld(true)` then traverse and set
  `obj.matrixAutoUpdate = false` (and `matrixWorldAutoUpdate = false`) on the group +
  all descendants. The world never moves, so this removes per-frame matrix
  recomputation across hundreds of static meshes — a safe CPU win that scales with
  object count. (Entities — player, car, NPCs, clouds — are separate and unaffected.)
- **Single-mesh / instanced new surfaces.** Highway asphalt = one mesh per
  carriageway; lane dashes = one instanced draw; guardrail/median = merged box mesh.
  `buildingRow` adds no new per-prop draw calls beyond the buildings themselves.
- **Respect existing rendering choices.** Do **not** touch lighting, sky, tone
  mapping, post-processing, shadow settings, pixel-ratio or fps caps (per the user's
  standing preference to prioritize content over rendering and keep the bright look).
  Three.js per-object frustum culling already limits on-screen draw calls.

## Components & interfaces (each independently understandable)

| Unit | Does | Inputs | Depends on |
|------|------|--------|------------|
| `highway` object | one divided highway segment + barriers + markings | `{ length, lanes, laneW, medianW, gantry, seed }` | `voxel`, `roads` (asphalt tex), `InstancedProps`, `palette` |
| `buildingRow` object | a spaced row of N backdrop buildings | `{ units, gap, d, district, anchor, seed, faces? }` | `fillerBuilding`, `transform`, `palette`, `rng` |
| `map.ts` | the city manifest | n/a | both new kinds + existing kinds |
| `World.ts` freeze | static-transform perf pass | the built group | three.js |

## Error / edge handling

- Determinism enforced: seeded rng only; no `Math.random`/`Date.now` in builders.
- Rotations stay in {0,90,180,270} so collider/obstacle AABBs remain axis-aligned.
- Building rows must not sit on road corridors — placement coordinates derive from
  grid pitch; verified by the engine's overlap warning (treated as a failure to fix,
  not ignore).
- Highway barriers are colliders; the road surface is not (drivable), matching
  existing road convention.

## Testing / verification

Per CLAUDE.md bootstrap gate (PITFALLS 1 & 2): **no tests, no dev server, no
screenshots.** Verification is exactly:
1. `npx tsc --noEmit` — clean.
2. `npx vite build` — succeeds.
Then the user looks in-game themselves.

## Assumptions & Decisions (auto mode — self-answered)

- Build on **master, no worktree/branch** → user's standing instruction "work on
  master only" overrides the autonomous-builder worktree step. Chose master because
  the user has explicitly consolidated all work there.
- Scope = **city only**; airport + E-to-enter map switching **deferred** → user said
  "start with working on the city vibe only."
- World grows to **280m** (not larger) → enough for rows + highway, keeps shadow
  coverage (sun shadow cam ±100) and perf sane; avoids a sprawling empty map.
- Reuse `cityGrid` with **half=2** rather than hand-adding ad-hoc roads → stays
  data-driven and symmetric; core junction preserved.
- **Two stores = the existing two** (`phoneRepairShop`, `restaurant`); all other
  buildings are non-interactive filler → matches "like 2 stores."
- Highway is **drivable scenery with barrier colliders, no AI traffic** → YAGNI;
  reads as a highway without a traffic-simulation system.
- `buildingRow` **composes `fillerBuilding`** (spaced) instead of a new building
  primitive → reuse; `terraceRow` already covers the butted-wall case.
- Optimization = **static-matrix freeze + single-mesh/instanced surfaces**, with
  **no lighting/post changes** → respects "prioritize content over rendering" while
  still giving a real, safe perf win that scales with the bigger city.
- Sign gantry on the highway **off by default** → keep the first pass cheap; can be
  switched on per placement later. (Map turns it on for the single placement.)
- **Layout fit-fix (caught during execution):** building rows use `units:3` (≈40.5m,
  fits the ~46.8m block interior) and are placed ONLY in the empty OUTER bands (north
  z=-84, south z=84, west x=-84, east x=84) — chose this because the inner-ring blocks
  are already occupied by the two stores, the plaza and the terraceRow, and 4-unit rows
  overflowed block interiors onto roads.
- **Standalone north towers dropped** → the `half=2` north band (z=-112 arterial + verge
  + highway) had no clean room for them; skyline height variety now comes from
  `buildingRow`'s glassTower/darkGlass units, so no separate towers are needed.
- **Highway at z=-128** (not -126) → derived half-width 10.4 keeps it inside the world
  edge (-140) with a grass verge above the z=-112 arterial.
