# Ben Gurion Airport — second map + map-switching ("press E to enter")

Date: 2026-06-22
Status: design (autonomous-builder run)

## Goal

Add a **second, fully detailed world** to the game — Ben Gurion ("Natbag")
international airport — reachable from the existing city by walking up to a big,
detailed **terminal-entrance building** (authored at the same fidelity as the
cake shop / phone-repair shop) and pressing **E to enter**. Entering plays a
**fade-to-black** transition and loads the airport map. A matching exit inside
the airport returns you to the city.

The airport must read like a finished game: a grand departures hall, check-in
islands, a flight-information board with real destinations, security lanes, a
duty-free rotunda, a concourse, gate lounges with jet bridges, parked airliners
on the apron, a control tower, runway + taxiway markings, ground-service
vehicles, and an Israeli landside (monument, flag poles, palms, drop-off curb).

This is purely additive content + one new runtime capability (map switching).
The city map, player, car, camera, physics and sky are otherwise unchanged.

## Constraints (from CLAUDE.md + memory — non-negotiable)

- **No dev server, no screenshots, no browser** — the user runs and looks.
- **No tests** written or run. Only gate: `npx tsc --noEmit` clean + `npx vite
  build` succeeds.
- **Work on master only** — no worktree/branch (overrides the skill's worktree
  step; per project memory).
- All builders **deterministic** — no `Math.random` / `Date.now`; seed via
  `world/rng.ts` (`mulberry32`) where randomness is wanted.
- **Rotation in 90° increments** only; colliders/obstacles stay axis-aligned.
- **Derive child placement from real dimensions**, never magic offsets
  (CLAUDE.md pitfall #3). Builders expose footprints; composites derive from them.
- Reuse the existing facet pipeline: every object is one `defineObject(kind,
  {params, build})` returning `{ mesh, colliders?, obstacles?, anchors?, pois? }`,
  assembled from `voxel.ts` primitives, merged to one geometry per part.

## Architecture

### 1. Map-switching runtime (the one new capability)

Today `World` builds `MAP` once in its constructor: it adds the built group +
clouds to the scene and creates Rapier colliders inline, with **no teardown**.
We make the world **reloadable** and drive transitions from `Game`.

**`MapDescriptor`** (new type) — what each map module exports:

```ts
interface Portal { x: number; z: number; r: number; prompt: string; to: string; toSpawn: Vec2 }
interface MapDescriptor {
  id: string;                 // "city" | "airport"
  map: Placement[];           // the manifest
  spawn: Vec2;                // default on-foot spawn
  groundSize: number;
  portals: Portal[];          // entry/exit triggers on this map
  hasCar?: boolean;           // city: true (car drivable); airport: false (on-foot only)
  carSpawn?: Vec2; carSpawnYaw?: number;
}
```

A small registry `src/world/maps.ts` exports `MAPS: Record<string, MapDescriptor>`
= `{ city, airport }`. The `city` descriptor wraps the existing `MAP` /
`PLAYER_SPAWN` / `CAR_SPAWN` from `map.ts` and gets one portal (the terminal
entrance). The `airport` descriptor comes from the new `airportMap.ts`.

**`World` becomes a manager** (same class, reworked):
- `constructor(scene, physics)` — keeps refs; creates clouds **once** (sky is
  global, not per-map); calls `load(MAPS.city)`.
- `load(desc)` — `buildWorld(desc.map)`; add group to scene; freeze matrices
  (existing optimization); create colliders, **tracking every created
  `RAPIER.RigidBody`** in `this.bodies`; store `pois`, `portals`, `spawn`,
  `groundSize`, `currentId`.
- `unload()` — remove the group from the scene and dispose its geometries +
  materials; `physics.world.removeRigidBody(body)` for each tracked body; clear
  the tracking arrays. (Clouds stay.)
- Getters: `spawn`, `groundSize`, `groundCenter`, `portals`, `currentId`,
  plus the existing `playerSpawn` / `carSpawn` / `carSpawnYaw` for boot.

**`FadeOverlay`** (`src/ui/FadeOverlay.ts`) — a fixed full-screen black `div`
(z-index above HUD/phone/menu, e.g. 60) with `setOpacity(0..1)`. No animation
logic of its own; `Game` drives opacity from frame `dt`. Injects its own style
once, mirroring `Hud`/`Phone`.

**Transition state machine in `Game`** (mirrors the existing phone freeze):
- State `transition`: `"idle" | "out" | "in"`, accumulator `tT`, pending portal.
- A portal is triggered when on foot, within `r`, and `E` is pressed. While
  `transition !== "idle"`, `update()` early-returns after advancing the fade
  (gameplay frozen), exactly like the phone branch.
- `out`: ramp opacity `0→1` over `FADE` (~0.45 s). At full black perform the
  **swap**: `world.unload()`; `world.load(MAPS[portal.to])`; move the player
  rigid body to `portal.toSpawn`; re-aim the follow camera at the player and
  snap it (no visible pan); set mode to `onFoot`; if the target map has no car,
  disable + hide the car and park its body at a far sentinel (restored to
  `CAR_SPAWN` when you return to the city). Then `transition = "in"`.
- `in`: ramp opacity `1→0` over `FADE`; at 0, `transition = "idle"`.

**Portal prompts** are independent of the city-only `locationPois()` registry,
so the feature is self-contained and works on any map. `Game` recomputes the
nearest portal each on-foot frame and shows its `prompt` ("Press E to enter the
airport" / "Press E to return to the city"), taking precedence over the generic
"Press P for phone" line.

### 2. Airport content — new catalog objects

All authored in `src/world/catalog/airport/` (new folder), imported from
`catalog/index.ts`. Local-space convention as everywhere: centered x=z=0, base
y=0, **front faces +z**. Each exposes colliders for solid bodies and obstacles
for NPC avoidance; seating exposes anchors. Reuse `voxel.ts`, `glass.ts`,
`textSign.ts`, `PALETTE`, and `mulberry32`.

Objects (each a `defineObject`):

1. **`terminalHall`** — the hero building. A very large hall: glass curtain
   walls on a structural grid of columns, a tall flat/stepped roof with skylight
   strips, **open south front** (entrance) and a wide **doorway gap in the north
   wall** to the concourse. Params `w,d,h` + rear-opening width. This is also the
   city-side entrance facade (placed in the city as a self-contained building).
2. **`checkInIsland`** — a row of check-in desks: counter + monitor + bag scale
   + a stub belt + a backlit airline/zone sign, with belt-barrier queue
   stanchions in front. Count derived from length.
3. **`flightBoard`** — a large FIDS departures board (canvas-rendered multi-row
   table: time / destination / gate / "Boarding|On time|Delayed"), on a stand or
   wall mount. Real Israeli + world destinations.
4. **`securityLane`** — X-ray scanner + roller conveyor + walk-through metal
   detector arch + tray stack; lanes repeatable.
5. **`baggageCarousel`** — oval reclaim carousel (sloped belt ring) with a few
   suitcases and an overhead flight sign.
6. **`gateLounge`** — gate desk/podium + boarding sign ("Gate B7 — TLV→JFK") +
   rows of seating facing the window; exposes a `boardingDoor` anchor.
7. **`airportSeating`** — the classic linked beam terminal seats (row of N),
   reused by gate lounges and the concourse. Seat anchors derived.
8. **`jetBridge`** — telescoping passenger boarding bridge: rotunda at the
   terminal end, angled tunnel sections, a cab at the aircraft end.
9. **`airliner`** — detailed parked narrow-body jet: fuselage tube + nose/cockpit
   + windscreen, swept wings, two underwing engines, tail fin + horizontal
   stabilizers, passenger-window strip, landing gear, EL AL-style livery (white
   body, blue belly stripe, blue tail with a light Star-of-David hint). Big
   collider so you can't walk through it. Params for livery color + registration.
10. **`controlTower`** — tall tapered shaft + glass control cab with canted
    windows + railing + antenna mast + beacon.
11. **`apron`** — large concrete pad with painted aircraft-stand lead-in lines,
    a stand number, and a safety box. Tiled/derived to size.
12. **`runway`** / **`taxiway`** — long tarmac strips with centerline dashes,
    threshold "piano keys", edge markings; taxiway in yellow. Params `length`.
13. **`apronVehicle`** — ground-service family via `variant`: `tug` (tractor +
    cart train), `fuel` (bowser), `stairs` (mobile staircase), `pushback`,
    `catering` (scissor-lift box truck). Reuses one builder.
14. **`dutyFreeRotunda`** — the iconic round duty-free with a central fountain
    under a ring (BGN Terminal 3 signature). Reuses `fountain`/`grandFountain`.
15. **`dutyFreeShop`** — storefront-style shop unit (perfume / electronics /
    snacks) reusing the `storefront` glass + sign style, for the concourse.
16. **`airportMonument`** — landside entry sign "Ben Gurion Airport /
    נמל התעופה בן-גוריון" on a stone plinth, flanked by **flag poles** flying the
    Israeli flag (approximated voxel flag: white field, two blue stripes, blue
    hexagram hint).
17. **`palmTree`** — date-palm (ringed trunk + frond crown) for the Israeli
    landside, distinct from the city `tree`.
18. **`escalator`** — decorative escalator/stair bank (steps + balustrades +
    moving-handrail look). Static prop (single playable level), adds vertical
    interest near the rotunda.
19. **`curbCanopy`** — the departures/arrivals drop-off canopy over the landside
    curb (columns + flat roof + signage), with taxi/bus drop-off lanes.

NPC traffic (travelers with luggage) is **out of scope** for this run — the
existing `EntityManager` wanders city NPCs; populating the airport with crowds is
a follow-up. Static "world feel" comes from dense props, seating, planes and
vehicles. (Logged decision.)

### 3. Airport layout (`src/world/airportMap.ts`)

Ground ~**260×260**. Axis convention: **+z = airside (north)**, **−z = landside
(south)**; player enters at the south curb facing +z. Built from the catalog
objects above plus the existing `ground`, `pavement`, `tree`, `lamp`, `bench`,
`planter`. Bands (south→north):

- **Landside (z ≈ −120…−80):** `airportMonument` + flag poles, `palmTree` rows,
  `curbCanopy` over a drop-off curb with parked taxis/buses (reuse city car?
  no — simple static `apronVehicle`/box props), parking rows, benches, lamps.
  **Exit portal** back to the city sits here, at the monument/curb.
- **Terminal (z ≈ −80…−25):** the big `terminalHall` (e.g. w≈120, d≈50, h≈14),
  open to the landside (south) and to the concourse (north). Inside: rows of
  `checkInIsland`, a wall of `flightBoard`s over the check-in hall, the central
  `dutyFreeRotunda`, `dutyFreeShop`s and cafes along the sides, `airportSeating`
  clusters, `escalator` near the rotunda, and a bank of `securityLane`s at the
  north end framing the doorway to the concourse.
- **Concourse (z ≈ −25…+20):** a long wide hall (another shell or open colonnade)
  with `airportSeating`, more `dutyFreeShop`s, `baggageCarousel`s on one flank,
  directional `flightBoard`s, and openings to the gate lounges.
- **Gates (z ≈ +20…+55):** a row of `gateLounge`s along the concourse; each
  `jetBridge` reaches north through the glass to a parked `airliner`.
- **Apron / airside (z ≈ +55…+130):** parked `airliner`s at `apron` stands,
  `apronVehicle`s servicing them, the `controlTower` off to one side, and
  `runway` + `taxiway` strips running east-west across the far north, with edge
  lamps. Big glass curtain on the gates/concourse so the airside is a vista even
  before you walk out.

`airportMap.ts` exports `AIRPORT: MapDescriptor` with `id:"airport"`,
`spawn` at the landside curb, `hasCar:false`, and `portals:[{ back to city at
the monument }]`. `maps.ts` registers it.

### 4. City entrance (edit `src/world/map.ts` + `maps.ts`)

- Place the `terminalHall` (entrance variant) in the **free SE inner hero cell
  `(16,16)`** — the one inner cell not yet a hero — as "Terminal 3" with its open
  front to the main road, plus dressing (lamps, planters, palms, an
  `airportMonument` sign). Its footprint must not overlap the surrounding block
  walls (derive size to the cell, like the other hero lots).
- Add a city **entry portal** at the terminal door: `{ prompt:"Press E to enter
  the airport", to:"airport", toSpawn: airport landside curb }`.

## Data flow

```
boot() → new World(scene, physics)         # loads MAPS.city, clouds once
       → new Game(..., world, ...)          # owns transition state machine
frame  → physics.step → game.update → follow.update
on foot, near a portal, E pressed:
  game: transition="out" → (black) world.unload(); world.load(MAPS[to]);
        move player to toSpawn; re-aim+snap camera; toggle car per hasCar
      → transition="in" → idle
```

## Error handling / edge cases

- **Double-trigger / mid-fade input:** ignored — `update()` early-returns while
  `transition !== "idle"`.
- **Car body across maps:** on entering a `hasCar:false` map the car is disabled,
  hidden, and parked at a far sentinel so its collider can't block the player;
  returning to the city restores it to `CAR_SPAWN`. (Player always returns to the
  city portal spawn, not to where the car is.)
- **Camera pan on swap:** camera is re-aimed and snapped while the screen is
  fully black, so the cut is invisible.
- **Footprint overlaps:** the engine already warns on overlapping placements;
  airport layout is authored to derive positions from dimensions and keep clear
  margins, so the console stays quiet.
- **Disposal leak:** `unload()` disposes geometries/materials and removes rigid
  bodies, so repeated entering/leaving doesn't grow memory.

## Testing

Per CLAUDE.md, **no automated tests** this run. Verification gate:
`npx tsc --noEmit` clean **and** `npx vite build` succeeds. The user then looks
in-game (entering the airport, walking the terminal/concourse/gates/apron,
returning to the city).

## Assumptions & Decisions (auto-mode decision log)

- Worktree isolation → **skipped; work on master** — project memory "work on
  master only" overrides the skill's worktree step (user instruction precedence).
- Map-switch mechanism → **reloadable `World` (load/unload) + DOM fade overlay**,
  driven by a `Game` state machine — minimal clean change over the build-once
  world; matches the existing freeze/static patterns.
- Trigger mechanism → **explicit per-map `portals`**, not the city-only
  `locationPois()` registry — keeps the feature map-agnostic and self-contained.
- Airport is **on-foot only**; car stays in the city — you don't drive inside a
  terminal; simplest and realistic.
- **Single playable level** (everything at y=0); escalators are decorative —
  keeps colliders axis-aligned (90° rotation rule); multi-floor is a follow-up.
- City entrance placed in the **free SE inner hero cell `(16,16)`** as
  "Terminal 3" — the natural 4th hero alongside phone shop / bakery / plaza.
- Branding → **EL AL-style livery + Israeli-flag / Hebrew-signage motifs** as
  simple voxel decals — Ben Gurion identity without heavy geometry.
- **No airport NPC crowds** this run — populating with travelers is deferred;
  density comes from props, seating, planes, vehicles.
- Car-return policy → **car returns to `CAR_SPAWN`** when you re-enter the city
  (not persisted to last-parked) — simpler, avoids cross-map pose bookkeeping.
```
