# Airport overhaul: glass enclosure, closed roof, spaced apron, forecourt plaza

Date: 2026-06-22
Status: design (autonomous-builder, `auto` mode — self-brainstormed, master-only)

## Goal

Bring the Ben Gurion airport (the `airport` map / merged-city airside) closer to
the polished reference render: a glazed terminal you can see into, a properly
*closed* roof, aircraft sitting on roomy spaced parking stands (not crammed wing-
to-wing against the building), and a landscaped tiled forecourt plaza out front.

Four cohesive moves, all within the airport:

1. **Transparent glass terminal** — the front (and side) curtain walls become
   see-through tinted glass so the lit interior (check-in islands, boards, shops)
   reads from the forecourt, matching the reference's glazed facade.
2. **Close the roof** — seal the open clerestory gap that currently sits between
   the top of the walls and the stepped sawtooth roof, and add a full-footprint
   ceiling deck so no sky is visible from inside.
3. **Move the planes out onto spaced stands + extend the map** — respace the four
   gates/jet-bridges/aprons/airliners so wingtips clear each other, widen the
   apron pads, push the airside cluster north, and grow the ground plane to fit.
4. **Forecourt plaza** — enrich the landside forecourt: a central tiered fountain,
   planter beds with clipped hedges and red/white flowers, palm rows, yellow-band
   bollard edging, a nested luggage-cart row, lamps and wayfinding.

## Context (what exists today)

- Architecture: ONE object registry (`catalog/`), ONE manifest (`airportMap.ts`),
  ONE engine (`system/buildWorld`). Authoring is data; facets come from `build()`.
- `terminalHall.ts` builds an **opaque** dark-glass curtain wall (front + sides),
  an opaque back wall with a `rearGap` door, and a **stepped bold-blue sawtooth
  roof**. Walls top out ~2 m below the roof underside → an open clerestory band
  all around (the visible "open roof").
- `airliner` is ~42 m long × ~40 m wingspan. Stands sit 30 m apart (x −45/−15/15/45,
  rot 90) → wingspan along x overlaps → the "crammed against the building" look.
- Forecourt props already in the catalog and reusable: `grandFountain` (a tiered
  wedding-cake fountain — perfect centerpiece), `palmTree`, `planter`, `flower`,
  `hedgeRow`, `lamp`, `bench`, `baggageTrolley`/`baggageCartTrain`, `airportMonument`
  (the red/blue/green/yellow checker pylon), `wayfindingSign`, `pavement` (tiled
  paving already laid across the forecourt).
- Transparent glass is already supported: `objects/glass.ts` → `makeGlassPaneMaterial`
  (a cached transparent `MeshStandardMaterial`, `depthWrite:false`, `DoubleSide`).
  Transparent panes must live on **separate, non-merged** meshes.

## Design

### Move 1 — Transparent glass terminal (`terminalHall.ts`)

Keep the opaque structure (columns, sills, mullion frames, color band, roof) merged
as today. Replace the **solid opaque glass infill** of the front and side bays with
**transparent pane meshes** added to the group separately:

- A small helper `glassPane(w, h, cx, cy, cz, axis)` builds a `PlaneGeometry` with
  `makeGlassPaneMaterial({ tint: GLASS_TINT, opacity: GLASS_OPACITY })`, oriented to
  face ±z (front/back) or ±x (sides), and returns a `THREE.Mesh`.
- Front: per front segment, lay a transparent pane across the bay instead of the
  opaque `curtainWall` dark field; keep the mullion grid + floor bands opaque.
- Sides: per side bay, swap the opaque `DARK_GLASS` infill box for a transparent
  pane; keep the slim mullion.
- Colliders are unchanged (you still cannot walk through the glass).
- Tint `0x3f7fb5` (cool blue), opacity `0.5` — reads as tinted terminal glazing,
  not invisible, so the interior is sensed rather than starkly exposed.

### Move 2 — Close the roof (`terminalHall.ts`)

- Add a solid horizontal **ceiling deck** spanning the full `w × d` footprint at the
  eave height (just above the ceiling beams, `y ≈ h`), color `ROOF_FRAME`/`WALL_COLOR`.
  Guarantees no sky from inside, independent of the sawtooth above.
- Add a **perimeter parapet / clerestory infill** that closes the open band between
  the wall-top (~`h − 0.1`) and the roof underside around all four sides, so the
  building reads sealed from outside too. The decorative blue sawtooth stays on top.

### Move 3 — Move planes out + extend map (`airportMap.ts`, maybe `apron.ts` params)

- New stand x-positions: **−78, −26, 26, 78** (≈ 52 m apart > 40 m wingspan → clear
  wingtips). Applied consistently to the four `gateLounge`, `jetBridge`, `apron`,
  and `airliner` placements so the gate→bridge→stand chain stays aligned.
- Widen apron pads (`apron` `w` 36 → ~48) to frame the wider stand spacing.
- Push the **airside cluster north** (aprons, airliners, apron vehicles, baggage
  trains, containers, control tower, north floodlights, runways) by **+18** for a
  deeper apron / breathing room between gates and stands.
- Grow `GROUND` from **300 → 360** so the pushed-north airside still sits on the slab.
- Keep nose-in parking orientation (rot 90) and right-hand-traffic conventions.

### Move 4 — Forecourt plaza (`airportMap.ts` + new `bollard`)

Populate the open landside forecourt (the empty paved area between the drop-off curb
and the terminal front) to match the render. Paving (`pavement`) already covers it.

- **Centerpiece**: one `grandFountain` (r ≈ 5) on the forecourt centerline, clear of
  the door walking axis.
- **Planter grid**: rows of `planter` / `hedgeRow` with `flower` scatter (red/white),
  laid in an orderly grid with walking lanes, spacing derived from the bed sizes.
- **Palms**: extend palm rows through the plaza and along the approach.
- **Bollards**: new `bollard` (black post + yellow band) edging the walkways and
  crosswalk approaches, placed as rows with spacing derived from run length.
- **Amenities**: a nested luggage-cart row (`baggageCartTrain`), `bench`es beside
  beds, `lamp`s through the plaza, `wayfindingSign` posts (plane / taxi / cart).

### New catalog objects

- `bollard` — short black post with a yellow safety band near the top; a thin
  collider so the player stops at it. Params `{ h, band }`. Exposes its footprint.
- `bollardRow` — composite placing N `bollard`s along a line; **count derived from
  `len` and a `gap`**, never a hand-typed offset (CLAUDE PITFALL 3). Params
  `{ len, gap }`.

## Non-goals (YAGNI)

- No new aircraft types, no animated water/jet motion, no NPC crowds.
- No redesign of the signature sawtooth roof — only *closing* it.
- No icon-art on wayfinding signs (text + arrow is enough for now).
- No interior re-layout of the terminal beyond what glazing reveals.

## Verification

- Per CLAUDE.md hard rules: **no tests, no dev server, no screenshots.** Gate is a
  one-shot `npx tsc --noEmit` clean. The user looks in-game afterward.

## Assumptions & Decisions (auto-mode log)

- Worktree isolation → **skipped; work on master** — because the user's standing
  instruction / memory is "work on master only, no worktrees/branches." User
  instructions override the autonomous-builder pipeline.
- Verification gate → **`npx tsc --noEmit` only** (no test suite / no `vite build` /
  no running game) — because CLAUDE.md PITFALL 1 & 2 forbid them; the user verifies
  visually.
- Build execution → **direct sequential edits, not a subagent fan-out** — because the
  work is tightly coupled across `terminalHall.ts` + `airportMap.ts` (shared
  coordinates); parallel agents would conflict on the same two files.
- Sequencing → **all four moves in one pass**, structural first (glass, roof, apron)
  then the forecourt — because the plaza sits in front of the (re)built terminal.
- "Close the roof" interpretation → **seal the clerestory gap + add a ceiling deck**,
  keep the sawtooth — because the visible opening is that perimeter gap; this is the
  minimal change that makes the building read enclosed.
- "Close with transparent glass" scope → **front + side walls transparent; back wall
  stays opaque** — because the back wall is the interior boundary to the concourse
  and the front/sides are what the player sees; limits transparent-surface sorting.
- Plane re-spacing → **52 m stand pitch, +18 m northward shift, GROUND 360** — chosen
  so wingtips (±20 m) clear with margin while staying on the slab.
- Forecourt layout → **hand-composed placements in `airportMap.ts`** (not a new
  `airportPlaza` composite) — because it is a one-off bespoke forecourt; explicit
  placements are clearer here and the map is the manifest.
- Airside northward shift scope → **also moved the gates + jet bridges +18 north**
  (not only the aprons) — because the terminal opens almost onto the curbside;
  translating the whole gate→bridge→stand chain together keeps it connected while
  still pulling the jets clear of the building.
- Plaza depth → **pushed the access road south (z −122 → −150) and the spawn to the
  new plaza edge (z −104 → −134), widening the front pavement to cover it** — because
  the terminal door sat ~3 m from the drop-off canopy with no room for a plaza; this
  opens a ~30 m-deep landscaped forecourt the player crosses on approach. (City-merge
  arrival is via the expressway, so moving the standalone-map spawn is low-risk.)
