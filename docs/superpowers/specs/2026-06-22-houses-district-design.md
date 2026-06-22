# Houses District (West Suburb) — design

Date: 2026-06-22
Status: approved-for-build (autonomous mode)

## Goal

Add a residential suburb west of the city: a street grid of ~12 **varied
placeholder houses** (the residential analog of the placeholder shop/filler
buildings) plus **ONE highly detailed hero "player house"** with an attached
garage, walk-in furnished interior, two storeys, a pitched detailed roof, and
front + back yards. "REALLY A LOT OF DETAILS."

## Where it lives

The city core fills `x,z ∈ [-64, 64]`; the airport is merged to the north
(`z≈260`). West of the core is empty and the ground plane already reaches
`x≈-410` (GROUND_SIZE 820). The suburb goes WEST, reached by driving out the
city's `z=0` arterial — mirroring how the airport is reached driving north.

- **West avenue:** continue the `z=0` road from the city west edge (`x≈-72`) out
  to the suburb using the existing `airportRoad` object (wide, multi-lane,
  painted) plus `lamp` rows. Lands the player at the suburb entrance ~`x=-150`.
- **Suburb streets:** a small residential grid centered ~`x=-205, z=0`:
  one E–W "avenue" (`z=0`) and two cross-streets (`x=-185`, `x=-225`), paved with
  the existing `road` object. Right-hand-traffic rule preserved.
- **Lots:** houses sit on lots set back from the street, facing the road, placed
  with the existing `lot()` / `grid()` / `row()` layout helpers. ~12 placeholder
  lots; the hero house takes one prominent oversized corner lot.

## Components

All new catalog objects follow the established conventions (CLAUDE.md): built at
LOCAL origin (centered x=z=0, base y=0, FRONT faces +z, ~1u=1m), fully
deterministic (seed via `mulberry32` from `world/rng.ts`, never `Math.random`),
all child placement derived from real part sizes (PITFALL 3), one merged
vertex-colored mesh per static cluster (`tintedBox`/`cylinderY`/`mergeTinted`/
`tintedMesh` from `objects/voxel.ts`). Each returns an `ObjectResult`
(`mesh`, optional `colliders`, `obstacles`, `anchors`, `pois`).

### 1. `house` — seeded placeholder house (`catalog/house.ts`)

The residential counterpart to `fillerBuilding`: a solid, NON-walk-in house that
reads richly from outside. One object, seeded variation so every instance differs.

Params (all optional, defaulted):
- `w, d` — footprint (default ~8×9).
- `stories` — 1 or 2.
- `storyH` — per-floor height (~2.7).
- `bodyColor`, `roofColor` — wall + roof colors. When omitted, derived from
  `seed` over a small residential palette (warm pastels) so a row varies.
- `roofStyle` — `"gable"` (ridge along x, two slopes) or `"hip"` (pyramid). Picked
  from `seed` when omitted.
- `garage` — bool: attach a single-car garage bay (door + flat roof) on one side.
- `porch` — bool: a small covered porch over the front door.
- `seed` — drives color choice, window count, garage/porch, chimney side.

Derived detail (all from dims): a base plinth; punched windows with frames +
sills on the front and sides (count = `round(span / 2.6)`, like fillerBuilding's
`colsFor`); a front door with a small stoop; the chosen roof (gable = two tinted
slabs forming a ridge with gable-end triangles; hip = a short pyramid via 4
sloped slabs or a tapered cone); fascia/eave band; a chimney box; optional porch
posts + roof; optional garage bay with a paneled up-and-over door.

Facets: `mesh` (merged) + one `collider` box (full footprint incl. garage) +
one `obstacle` rect. No interior.

### 2. `playerHouse` — the hero house (`catalog/playerHouse.ts`)

A large composite (the star). Authored as a set of merged meshes (exterior shell,
roof, interior furniture, yard) inside one `THREE.Group`, with hand-placed
colliders that leave door openings walk-through (the `buildingShell` pattern:
closed walls + short front "returns", an open doorway gap). Everything derived
from named dimensions declared once at the top of `build()`.

Layout (local space; FRONT = +z faces the street):
- **Main block:** ~12w × 11d × two storeys (`floorH≈3`). Walk-in: floor slab,
  back + side walls, a second-storey floor slab, ceiling/roof underside. FRONT
  wall has a centered door gap (walk-in) flanked by windows; large windows
  punched on all exterior faces; upstairs windows + a small balcony over the
  porch.
- **Attached garage wing:** ~6w × 7d single storey on the LEFT (-x) side, flush
  with the front. Sectional up-and-over **garage door** (horizontal paneled
  slats) on the +z face; walk-in interior; a **parked car** (the `parkedCar`
  prop, placed as a child mesh) inside or on the driveway; concrete **driveway**
  apron extending +z to meet the street.
- **Interior furniture (ground floor):** living room — sofa, armchair, coffee
  table, rug, wall TV; kitchen — counter run, upper cabinets, fridge, stove,
  sink; a **staircase** (stacked tinted steps) up to the second floor.
- **Interior (second floor):** a landing + bedroom — bed, nightstand, wardrobe;
  a small bathroom suggestion (tub box). Reachable by the stairs.
- **Roof:** a pitched **gable** roof over the main block (ridge along x), with
  **fascia/gutters**, a brick **chimney**, and one or two **dormer** windows.
  Garage gets a lower flat/shed roof.
- **Front yard:** a low **picket fence** (the `fence` prop) around the lot with a
  **gate** opening onto the path; lawn (a tinted slab / the ground reads as
  grass); a paved **path** from gate to porch; a **mailbox** (the `mailbox`
  prop) at the curb; 2 trees (`tree`) and flower planters (`planter`); a **porch**
  with posts, roof, and a porch light.
- **Back yard:** fenced; a **patio** slab; a **BBQ** (box + lid + grill); a
  garden **table + chairs**; a small tool **shed**; optionally a tiny **pool**
  (recessed blue slab with a coping rim).

Facets:
- `mesh` — the Group (merged sub-meshes).
- `colliders` — perimeter walls (with door gaps), garage walls, second-floor
  slab, staircase, major furniture, fence segments, shed, BBQ, pool rim.
- `obstacles` — house footprint, garage, shed, fence line, trees (for NPCs).
- `anchors` — `{ door: {x,z}, driveway: {x,z} }`.
- `pois` — one `{ kind: "home", label: "Home", radius, anchor: "door" }` so the
  house is a recognized landmark.

The builder is large; it is decomposed into local helper functions
(`makeShell`, `makeRoof`, `makeGarage`, `makeInterior`, `makeFrontYard`,
`makeBackYard`) each returning `{ parts, colliders?, obstacles? }`, so each piece
is independently understandable and child placement is derived from the shared
dimension constants — never magic offsets.

### 3. Supporting props

- `fence` (`catalog/fence.ts`) — a straight **picket-fence** segment. Params:
  `length`, `gate?` (leave a gap for a gate), `color`. Posts + rails + pickets,
  merged. Returns `mesh` + a thin `collider` (skipped across the gate gap) +
  `obstacle`. Reused by both yards and (optionally) placeholder lots.
- `parkedCar` (`catalog/parkedCar.ts`) — a static stylized **car** for
  driveways/curbs (distinct from the drivable `Car` entity in
  `src/entities/Car.ts`). Body + cabin + 4 wheels + windows + lights, seeded
  `color`. Returns `mesh` + `collider` + `obstacle`.
- `mailbox` (`catalog/mailbox.ts`) — a post + box + flag. `mesh` + small
  `obstacle`.

All three are registered via `catalog/index.ts` side-effect imports.

## Map integration (`src/world/map.ts`)

A new `suburbPlacements(originX, originZ)` helper (in a new
`src/world/suburbMap.ts`, mirroring `airportMap.ts`) returns the full suburb:
streets, lots, the hero house, props, and perimeter trees. `MAP` gains:
1. the west avenue (`airportRoad` + lamps) bridging city edge → suburb;
2. `...suburbPlacements(-205, 0)`.

The hero house faces the suburb avenue on a corner lot; placeholder houses fill
the remaining lots on both sides of the streets, alternating which side they face
so they front the road (rot 0 / 180), with seeded params for variety.

## Determinism & gate

- No `Math.random` / `Date.now` / argless `new Date()` anywhere; seeds via
  `world/rng.ts`.
- Rotations in {0, 90, 180, 270} only.
- **Gate (per CLAUDE.md PITFALL 1 & 2):** `npx tsc --noEmit` clean +
  `npx vite build` succeeds. NO dev server, NO screenshots, NO tests. The user
  looks in-game.

## Assumptions & Decisions (autonomous mode)

- Worktree isolation (autonomous-builder step 3) vs. project rule → **work on
  master, no worktree** — because CLAUDE.md + memory `work-on-master-only` is a
  standing user instruction that overrides the skill default.
- Verification standard → **`tsc --noEmit` + `vite build`, not tests** — because
  CLAUDE.md PITFALL 2 forbids tests until the user says so.
- District location → **west suburb** (user-chosen).
- Placeholder style → **one seeded `house` object with per-instance variation**
  (user-chosen).
- Hero interior depth → **fully walk-in + furnished** — because the user asked
  for maximal detail ("infinity").
- Suburb scale → **~12 placeholder houses on a small 3-street grid centered
  x≈-205** — chosen as the simplest layout that reads as a real neighborhood
  without bloating the map; trivially extendable.
- Suburb connection → **extend the z=0 arterial west via `airportRoad`** —
  reuses an existing, painted multi-lane road object rather than inventing one.
- Parked car → **new static `parkedCar` prop**, not the drivable `Car` entity —
  the entity is player-controlled and lives outside the catalog; scenery needs a
  cheap static mesh.
- Pool in back yard → **included but minimal** (recessed blue slab + coping) —
  cheap, adds detail, no water sim.
- Hero house "home" landmark → **emit a `home` POI** so the engine can treat the
  house as a recognized location, consistent with how other anchors/pois work.
