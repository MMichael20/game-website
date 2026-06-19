# Rishon3D — Varied NPC Daily Itineraries (design)

Date: 2026-06-19
Branch: worktree-3d-spike (NOT merged / NOT deployed)

## Problem

NPCs now loop, but each one loops a SINGLE fixed activity forever (this patron
always dines, that one always paces). Up close the crowd reads as robots on rails.
We want each NPC to live a varied, multi-stop "daily routine" — restaurant, then
bakery, then sit outside, cross the street, visit the park, etc. — in a different
order per person, so the promenade reads as a living town.

NOT in scope: lighting/camera/render, pathfinding/obstacle avoidance (straight-line
moveToward stays), new venues/geometry.

## Approach

A pure, seeded **itinerary composer** that chains short activity "legs" into one
long looping route per NPC. Reuses the existing patron FSM (`stepPatron`) and the
`Patron` entity unchanged — they already consume `Waypoint[]` + `loop`.

- New `game/itinerary.ts` (pure, no THREE):
  - Activity legs, each `(rng) => Waypoint[]`, built from districtPois anchors with
    small randomization (which seat/table, dwell jitter, stroll targets):
    `dineRestaurant`, `browseBakery`, `browsePhone`, `outdoorDine` (sit at a patio
    table), `visitPark` (sit on the park bench), `crossStreet` (over and back),
    `stroll`, `waitTaxi`.
  - `buildItinerary(seed, count=4): { waypoints, speed, activities }` — seeds
    `mulberry32`, Fisher-Yates shuffles the activity pool, takes `count` of them,
    expands + concatenates (with a short stroll between stops), and returns a
    wandering speed. Deterministic in `seed`.
- `entities/Patron.ts` `spawnPatrons` builds ~12 patrons, each from
  `buildItinerary(seed_i)` with a distinct seed, palette and staggered delay. The
  Patron entity, FSM and sit/stand/idle logic are unchanged.

Each NPC therefore walks a unique multi-stop loop and no two share the same script.

## Verification

- `tsc`, full `vitest` (new `itinerary.test.ts`: deterministic per seed; different
  seeds differ; every itinerary has >=2 distinct activities; contains a sitting
  waypoint sometimes; never terminates under the FSM; all waypoints have finite
  coords), `build`, smoke.
- Visual: in-game screenshot confirming NPCs are spread across venues/sidewalks.

## Assumptions & Decisions (auto mode — self-answered)

- Composition vs. one big hand-authored route → **seeded composer over short legs**
  — because it yields per-NPC variety for free and stays pure/testable.
- RNG → reuse repo **`mulberry32`**, one seed per NPC index — deterministic +
  matches existing procedural code.
- Keep the old single-activity route builders in `patronRoutine.ts` → **yes**, as a
  tested simple-loop API; the new richer legs live in `itinerary.ts` (minor overlap
  accepted to avoid churning the existing tests).
- Activity count per NPC → **4** distinct activities + inter-stop strolls — enough
  variety without absurdly long loops; EntityManager already distance-culls.
- Patron count → **~12** — lively but within the existing perf envelope.
- Sitting anchors for outdoorDine/visitPark → reuse `seatClusters`/`CHAIR_OFFSETS`
  and `PARK_BENCH`; approximate facing via the existing poseSitting (±x by CX).
