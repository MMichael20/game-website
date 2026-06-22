# Ben Gurion airport — "much bigger" realistic airfield

**Date:** 2026-06-22
**Status:** approved (autonomous mode — self-brainstormed)
**Topic:** Extend the airplanes out onto a large, realistic, fully-enclosed airfield.

## Request (verbatim intent)

> Extend the airplanes out and make airplanes outside only. Close the airport
> terminal building. Create realistic aircraft parking stations (apron/gates) like
> a real airport. Research real airport structure for realism. Make the whole
> airport MUCH BIGGER — extend the map as needed. Don't be afraid to make it WAY
> bigger.

## Current state (what already exists)

The airport is data in `src/world/airportMap.ts`, built from the registry/manifest/
engine. It is consumed **twice**:

1. Standalone descriptor `AIRPORT` (`GROUND = 360`).
2. Embedded into the city map (`src/world/map.ts`) via `airportPlacements(0, 260)`
   with city `GROUND_SIZE = 820` — a seamless drive-in north of the city.

Today it has: a sealed glass terminal hall, a landside forecourt/plaza/road, a
concourse, **4** gates + jet bridges, **4** nose-in airliners on **4** apron stands,
a control tower, a few apron vehicles, and 2 runways. All aircraft are already
outside; the terminal is already a closed building. The problem the request targets
is **scale and realism**: the airfield is small and the apron is a single short row.

## Real-airport structure (research distilled)

Landside → airside ordering of a real airport:

- **Landside**: access roads, curbside drop-off, car parks, forecourt.
- **Terminal**: check-in hall, security, departures concourse (sealed building).
- **Concourses / piers (fingers)**: buildings projecting onto the apron; **contact
  stands** line them, each with a **jet bridge** to a nose-in aircraft.
- **Apron / ramp**: the paved area where aircraft park and are serviced; marked
  **stands** (painted lead-in line, stop bar, safety box, stand number).
- **Remote stands**: parking positions away from the building (stairs + bus board).
- **Taxiways**: yellow-centreline paved paths (lettered) linking apron ↔ runways,
  with **parallel** and **connector** taxiways and **holding bays** at thresholds.
- **Runways**: long strips, piano-key thresholds, parallel taxiway alongside.
- **Cargo / maintenance**: freight apron, **hangars**, containers, GSE.
- **Perimeter**: a continuous **security fence** ringing the whole airfield.
- **Field furniture**: control tower, floodlight masts, windsocks.

## Design — expand AIRSIDE into a full airfield

Keep the landside (forecourt, road, terminal, concourse) essentially unchanged to
limit regression risk. Replace the small single-row apron with a real airfield.

Airport-local axis convention (unchanged): **+z = airside / north**, **-z = landside
/ south**, **+x = east**. ~1u = 1m. Rotation in {0,90,180,270} only.

### Zones (airport-local z)

1. **Landside (z ≈ -165 … -30)** — unchanged forecourt, multi-lane road, sealed
   terminal hall (`terminalHall` at z=-60), parking lots, plaza.
2. **Concourse (z ≈ -30 … +12)** — unchanged security/baggage/seating.
3. **Main contact apron (z ≈ +20 … +120)** — a WIDE east-west frontage:
   - **~10 contact stands** spread across x ∈ [-234 … +234] at ~52 m pitch, each a
     `gateLounge` + `jetBridge` + `apron` (stand number) + nose-in `airliner`.
   - An east-west **apron taxilane** (taxiway) just north of the tails.
4. **Satellite concourse (z ≈ +150 … +210)** — a `concoursePier` island building
   with a ring of **6 stands** (3 per long side) + jets, reached by a taxiway.
   "More planes, more realism" without crowding the terminal frontage.
5. **Remote apron (east, x ≈ +250 … +330)** — a block of **4 marked remote stands**
   with jets, boarding stairs, GSE, baggage trains, containers.
6. **Cargo / maintenance (west, x ≈ -250 … -340)** — **2 hangars** + **2 freighter
   jets** + container stacks + tugs.
7. **Taxiway network (z ≈ +120 … +250)** — parallel + connector taxiways (lettered
   centrelines via `runway taxiway:true`) routing apron → runways, with holding bays.
8. **Runways (z ≈ +290 … +345)** — **two parallel runways** (~520 m and ~480 m) with
   a parallel taxiway between them and threshold piano keys.
9. **Field furniture** — control tower, floodlight masts ringing the apron,
   **windsocks** near the runway thresholds.
10. **Perimeter fence** — a continuous `perimeterFence` ring around the entire
    airfield (4 runs), "closing" the airport as a secured zone.

Aircraft total rises from **4 → ~16** across all aprons, with varied liveries
(El Al blue, red, green, freighter grey/white).

### New catalog objects (built at local origin, full facet contract)

- **`perimeterFence`** — `{ length, h?, gateGap? }`. A run of chain-link/palisade
  panels on posts with a barbed-wire top rail; thin collider along its length so the
  player can't walk through the airfield boundary. Built along +x; placed in 90°
  rotations to ring the field.
- **`concoursePier`** — `{ len, w?, h? }`. A long, sealed, glass-walled finger
  concourse with a low ridge roof, gate signage along both long sides, and end caps.
  Closed (ceiling deck) like the terminal. Colliders for its walls; a walkable
  interior is NOT required (visual island). Anchors at both long-side gate doors.
- **`hangar`** — `{ w, d, h }`. A big maintenance hangar: tall box/arched shell, a
  wide dark door opening on the +z (apron) face, side walls, ridge roof, company
  signage. Colliders for the shell (door gap left clear).
- **`windsock`** — `{ h? }`. A pole + frame + striped orange cone. Tiny realism prop
  near the runways. Thin pole collider.

All four follow the hard rules: built at local origin (centred x=z=0, base y=0, front
+z), every facet returned from one `build()`, child placement derived from real
dimensions, fully deterministic (no `Math.random`/`Date.now`; seed via `world/rng.ts`
if needed).

### Ground / embed changes

- Standalone `AIRPORT` `GROUND`: **360 → 820** (covers the airfield's ~±410 extent).
- City `map.ts` `GROUND_SIZE`: **820 → 1500** so the embedded airport (now reaching
  city z ≈ 655 north) still sits on the city ground plane. Embed offset stays
  `(0, 260)` to preserve the drive-in seam. Spawn/portal unchanged.

## Out of scope (YAGNI)

- No NPC crowds / animated traffic (separate follow-up already noted in memory).
- No multi-level terminal interior changes.
- No changes to the city core, suburb, or landside layout beyond the ground bump.
- No new gameplay (still walk-around only on the airport map; drive-in from city).

## Verification gate

Per project rules (PITFALLS 1 & 2): **no dev server, no screenshots, no tests.** The
only checks run are `npx tsc --noEmit` (clean) and `npx vite build` (succeeds). Then
the user looks in-game themselves.

## Assumptions & Decisions (autonomous self-answered forks)

- "Bigger" magnitude → chose ~3× airside footprint, standalone ground 360→820, city
  ground 820→1500 — because it fits a full dual-runway airfield while keeping the
  existing city drive-in seam/offset intact.
- "Close the airport" → chose adding a continuous perimeter security fence ringing
  the airfield (terminal is already sealed) — because a fenced secure airfield is the
  real-world meaning of a "closed" airport.
- "Airplanes outside only / park station" → chose spreading all aircraft across
  outdoor marked stands (wide contact apron + satellite concourse + remote apron +
  cargo apron), none inside — because it matches the request and real apron layout.
- New objects scope → chose only `perimeterFence`, `concoursePier`, `hangar`,
  `windsock`; reuse existing `apron`/`airliner`/`runway`/`jetBridge`/`gateLounge`/
  `apronVehicle`/`apronContainers`/`controlTower`/`floodlightMast` — because that is
  the minimum new code to hit the realism target.
- Aircraft count → chose 4 → ~16 — because "way bigger" should visibly fill the apron.
- Runways → chose two parallel longer runways + taxiway network — for realism.
- Risk control → chose to leave landside/terminal/forecourt/concourse unchanged and
  expand only airside + grounds — to keep the change focused and low-regression.
- Spawn/portal → chose to leave untouched — out of scope.
