# Compact City Re-plan — Design

Date: 2026-06-22
Status: approved (auto mode — self-brainstormed)
Topic: Make the city compact and coherent; move the tall "storeys" to the edge.

## Problem

The current city (`src/world/map.ts`) is large and sparse:

- `GROUND_SIZE = 280` (world spans ±140).
- Road grid `pitch=56, half=2` → roads at `{0, ±56, ±112}`, with an **inner** ring of
  blocks at ±28 and an **outer** ring at ±84.
- **12** tall `buildingRow`s are scattered around the far outer ring (±84 bands), a long
  way from the playable core, with wide empty grass gaps between the core and the ring.
- The divided highway sits even further out at `z=-128`.

The result reads as a thin downtown floating in a big empty plain. The user wants it
**compact**, with the tall multi-storey buildings ("stories etc") **living on the edge**
of the city framing a tight, full core — and the layout planned coherently.

## Goal

A small, dense, legible downtown:

- One tight ring of **4 core blocks** around the central junction holds all the playable
  content (two hero shops, a plaza, a terrace of shops, kiosks, fountain).
- A **perimeter ring of tall building rows** lines the outbound roads on three sides
  (south, east, west), framing the skyline at the city's edge.
- The **divided highway** forms the north edge (the road you arrive on), sitting just
  behind the hero shops.
- Almost no empty grass: the world shrinks from 280 → **140**.

## Approach (chosen)

**Single-ring compact grid + perimeter skyline.** Considered three options:

1. **Shrink the existing two-ring grid in place** (just reduce pitch/world). Rejected:
   keeps the inner+outer ring structure that creates the empty mid-band; not compact
   enough and the 12-row outer ring stays far out.
2. **Concentric single ring (chosen).** Collapse to `half=1` (one ring of 4 core blocks)
   and place the tall rows just outside the ring roads, lining the outbound streets. This
   is the most compact arrangement that still fits the big hero shops, and it puts the
   storeys exactly on the edge.
3. **Hand-placed irregular blocks.** Rejected: throws away the data-driven grid; harder to
   reason about and maintain; no real benefit over (2).

This is a **data-only change to `src/world/map.ts`** (manifest + the three exported
constants at its top). No catalog/engine/runtime code changes — every object used already
exists. The facet contract guarantees colliders/obstacles/anchors follow the new positions.

## The compact layout

All numbers are world-space metres. Roads have half-width 2 (occupy ±2 around a centerline).

### World + core grid
- `GROUND_SIZE = 140` → world spans ±70; player/car bounds = 68 (`groundSize/2 - 2`).
- `cityGrid`: `pitch=44, half=1, length=124` → roads at `{0, ±44}` spanning ±62.
  Keeps the central `main-h` (z=0) and `cross-v` (x=0) arterials, so the central junction,
  crosswalks, traffic lights and the hero-shop frontages are unchanged.
- `pavement` core slab: `w=88, d=88` (covers the ±44 core), down from 112.
- **4 core blocks**, each ~40 m, centred at (±22, ±22):
  - **NW** `phoneRepairShop` lot — unchanged authored lot (`originX=-22, originZ=-17`).
    Building spans x∈[-33,-11], z∈[-25,-9], front (door) at z=-9 facing `main-h`.
  - **NE** `restaurant` (bakery) lot — unchanged authored lot (`originX=22, originZ=-21`).
    Building spans x∈[11,33], z∈[-33,-9], front at z=-9 facing `main-h`.
  - **SW** `plaza` (fountain + benches + 2 kiosks) at (-22, 22), `w=36 d=28` →
    x∈[-40,-4], z∈[8,36]. (Moved from (-28,28).)
  - **SE** `terraceRow` shops at (22, 14), `rot=180`, `units=3 d=11` →
    run x∈[2,42], building z∈[8.5,19.5], front at z=8.5 facing `main-h`. (Moved from (28,12).)
- Two loose `kioskCart`s on the paved strip just south of the junction, north of the plaza:
  (-14, 5) and (-20, 5). (Moved up from z=8 so they clear the relocated plaza.)
- 4 `trafficLight`s at the junction corners (±7, ±7) — unchanged.

### Perimeter ring — the tall storeys on the edge
Tall `buildingRow`s (3–7 storeys) line the outbound roads, facing **inward** toward the
core. Rows sit at block-centre x/z (±22) so they straddle neither the x=0/z=0 arterials
nor the ±44 ring roads — the outbound streets run between them, just like the old outer
ring did. `units=3` (~40 m run), `d=12`. 6 rows total (down from 12):

- **South band** z=56, `rot=180` (faces north): rows at x=-22 and x=22.
- **West band**  x=-56, `rot=90`  (faces east):  rows at z=-22 and z=22.
- **East band**  x=56,  `rot=270` (faces west):  rows at z=-22 and z=22.
- Backs sit at ±62; fronts at ±50, ~6 m off the ±44 ring road; 8 m verge to the ±70 edge.

### North edge — the highway
- `highway` at z=-56, `length=124`, `gantry:true` (other params unchanged). Spans
  z∈[-66.4,-45.6] along x∈[-62,62]. Sits ~9 m behind the hero shops (backs at z=-33),
  3.6 m inside the -70 world edge. No north building band — the highway is the north edge.

### Spawns
- `PLAYER_SPAWN = { x: 8, z: 6 }` — sidewalk just SE of the junction, north of the terrace
  front (z=8.5). (Was (8,9), which now lands inside the relocated terrace footprint.)
- `CAR_SPAWN = { x: 12, z: 2 }` — eastbound `main-h` lane, unchanged.

## Why this is correct (facet contract)

Every kind used (`ground`, `cityGrid`, `pavement`, `phoneRepairShop`/`restaurant` via
`lot`, `plaza`, `terraceRow`, `buildingRow`, `highway`, `kioskCart`, `trafficLight`) is
already registered and returns its mesh + colliders + obstacles + anchors from one
`build()`. Moving a placement moves all its facets together, so collisions and walkability
stay consistent. The change is purely the manifest + the three exported constants.

## Out of scope
- No new catalog objects, no engine/runtime changes, no new building styles.
- No retuning of `buildingRow`/`terraceRow` internal generation.
- No tests (project is in bootstrap mode; gate is `tsc --noEmit` + `vite build`).

## Assumptions & Decisions (auto mode log)

- "stories etc should live on the edge" → interpreted as the tall multi-storey
  `buildingRow`s; chose to ring them on the perimeter (S/E/W) facing inward — because that
  frames the skyline and matches "on the edge of the city".
- Compactness target → world 280→140, grid to a single `half=1` ring — because the big hero
  shops need ~40 m blocks, which fixes the core pitch at ~44; a single ring is then the
  most compact arrangement that still fits them.
- North edge → highway, no north building band — because the hero shops back onto the north
  and a building row there would face their backs; the highway reads as the arrival edge.
- Row count 12→6 (2 per side, 3 sides) → because a single perimeter ring needs only one row
  per outbound street segment; denser would crowd the ±70 edge.
- Loose kiosks moved z=8→5 → because the relocated plaza (SW, z∈[8,36]) now overlaps their
  old spot; nudged onto the junction's south sidewalk strip instead of deleting them.
- Player spawn (8,9)→(8,6) → because the relocated SE terrace footprint (z∈[8.5,19.5]) now
  covers the old spawn; moved onto the clear junction-corner sidewalk.
- Worktree isolation → SKIPPED; working on `master` directly — because the user's standing
  instruction (memory: "Work on master only — no worktrees/branches") overrides the
  autonomous-builder's worktree step (user instructions are highest priority).
- Subagent-driven build → SKIPPED in favour of a direct edit — because this is a single
  data file (`map.ts`) with no independent parallelizable tasks; fan-out would add pure
  overhead. The verification gate (tsc + vite build) is still run with evidence.
