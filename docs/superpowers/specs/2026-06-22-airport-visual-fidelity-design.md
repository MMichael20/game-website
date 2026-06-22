# Airport visual-fidelity pass — design

**Date:** 2026-06-22
**Topic:** Close the gap between the built Ben Gurion airport map and the five
design references so the world matches the picture. Visual detail only — **no
NPCs/crowds** (explicit user scope).

## References

- `assets/design-examples/airport-exterior-v1.png` — ground-level curb view
- `assets/design-examples/airport-exterior-v2.png` — aerial
- `assets/design-examples/airport-exterior-no-npcs-v1.png` — clean aerial (clearest)
- `assets/design-examples/airport-interior-v1.png` — departures hall
- `assets/design-examples/airport-interior-no-npcs-v1.png` — clean hall (clearest)

## Problem

The airport has the correct *layout* (terminal, check-in, boards, duty-free,
security, escalators, gates, jet bridges, jets, tower, runways) but almost none of
the *signature visual language* of the references. The build reads grey-and-pale;
the references read **deep-blue glazed roof + white canopy + amber signage +
red/yellow/blue/green block accents + bold red/blue furniture + scattered bright
luggage + dense greenery + busy apron**.

## The visual DNA to hit (from the references)

1. **Deep-blue glazed sawtooth roof** on the terminal — high ridge stepping down
   to the apron in a serrated parapet, blue glass (`#1f3a6b`–`#2c5aa0`) over a
   white mullion grid. *This is the single biggest miss.*
2. **White curb canopy** (not grey concrete) with **glowing amber sign panels**
   hung underneath.
3. **Cylindrical control tower** with a slender shaft and an **overhanging bulged
   glass cab** + **antenna cluster** (Ben Gurion silhouette).
4. **Red/yellow/blue/green block accents** — a strong mosaic band across the
   ground-level facade top, plus smaller accent tiles elsewhere.
5. **Ceiling-hung amber departure boards** with **colored status cells**
   (red/green/blue/white row-end blocks).
6. **Numbered check-in lightboxes** in colored pairs (blue/green/red) + glowing
   blue desk monitors.
7. **Self-service check-in kiosks** — pedestals with angled glowing-blue screens.
8. **Blue queue-belt stanchions** snaking in front of the desks.
9. **Rainbow color-totem columns** (vertical stack of color cubes at mid-height) +
   smaller column accent tiles.
10. **Overhead wayfinding signs** — amber pictogram/arrow signs, "SECURITY",
    "GATES →", restroom/info icons.
11. **Red/blue gang seating** (alternating bucket seats on metal frames).
12. **Duty Free** warm wooden shelving + colorful product cubes under a red sign.
13. **Glossy reflective tile floor** with a darker border band.
14. **Colorful luggage** — suitcase piles + loaded baggage trolleys (props, not NPCs).
15. **Dense roadside greenery** — hedges + voxel-tree rows; **floodlight masts**.
16. **Busy apron** — baggage-cart trains, fuel/catering trucks, buses, and a
    colorful container/cargo corner.
17. **Cube clouds** in the sky (all references show them).

## Approach

**Extend the existing catalog in place; add a small set of new prop objects.** This
respects the registry+manifest+engine architecture (CLAUDE.md): every change is one
`build()` carrying all facets, and placement stays data in `airportMap.ts`. No
hand-wiring, no magic child offsets (derive from dimensions).

### Objects to REWRITE / extend (existing)

- `terminalHall` — add the **blue glazed sawtooth roof** (param-driven bay count,
  ridge height, step depth), a **front glass curtain wall + sliding-door bays**
  (replace the open-gap front), a **color-block mosaic band** on the upper fascia,
  and **colored accent tiles** on columns. Keep anchors/colliders contract.
- `controlTower` — reshape to a **slender ~constant cylindrical shaft** with an
  **overhanging bulged glass cab** (cab radius > shaft radius), white collar ring,
  and a **multi-antenna cluster** on the cab roof.
- `curbCanopy` — recolor roof **white**, hang **amber sign panels** under it
  (departures/arrivals), keep the column/curb/lane facets.
- `flightBoard` — make a **ceiling-hung** variant: large dark board, amber
  dot-matrix rows, **colored status cells** at row ends, drop-supports from above.
  Param to choose hung vs wall.
- `checkInIsland` — add **numbered backlit lightboxes** (colored pairs) on the
  overhead fascia + **glowing blue monitors** per desk.
- `airportSeating` — recolor to **alternating red/blue** bucket seats; keep frame.
- `dutyFreeShop` — add **warm wooden shelving with colorful product cubes** and a
  brighter illuminated sign band.

### New prop objects to ADD (catalog/airport/)

- `selfCheckinKiosk` — pedestal + angled glowing-blue screen; row param.
- `queueStanchion` / `queueBelt` — chrome posts + **blue belt** segments; a
  snaking-lane composite param.
- `wayfindingSign` — ceiling-hung sign; param `style` (amber-pictogram | blue-arrow
  | text) and `text`/`icon`.
- `luggagePile` — deterministic cluster of colorful suitcase cubes; `count` param.
- `baggageTrolley` — grey cart frame loaded with stacked bags.
- `hedgeRow` — line of green cube shrubs/voxel trees; `len` param.
- `floodlightMast` — tall pole with a light array head.
- `apronContainerStack` — colorful stacked container/box-truck cubes (cargo corner).
- `cubeCloud` — pure-white stepped cube cluster placed high in the sky; `size` param.

### Map assembly (`airportMap.ts`)

Re-dress landside (white canopy + amber boards + curb trolley/taxi + hedges +
floodlights), interior (hung boards, numbered desks, kiosks, queue belts, color
columns, wayfinding, red/blue seating, duty-free, luggage piles, indoor planters),
and apron (container corner, more GSE, floodlights). Add cube clouds. Keep the
existing spawn/portal.

## Architecture & contracts (unchanged)

- One `defineObject(kind, {params, build})` per type; `build` returns
  `{mesh, colliders?, obstacles?, anchors?, pois?}`. The facet contract keeps
  mesh/collider/obstacle from drifting.
- Build at local origin, base y=0, front +z, ~1u=1m.
- **Determinism:** no `Math.random`/`Date.now`; seed via `world/rng.ts` if a prop
  needs variation (luggage colors cycle by index, not random).
- Rotation in 90° increments; child placement derived from real part dimensions,
  never magic numbers (CLAUDE.md PITFALL 3).
- New props imported from `catalog/index.ts`.

## Testing / verification

Per project CLAUDE.md (tests paused, no dev server, no screenshots): the gate is
`npx tsc --noEmit` clean **and** `npx vite build` succeeds. The user then reviews
in-game. No unit tests written or run.

## Out of scope

- NPCs / crowds / pathing (explicit user exclusion; prior follow-up).
- Lighting / post-processing (user prefers content over rendering).
- Gameplay, portals, second-map switching (already done).

## Assumptions & Decisions

- Worktree isolation → **skipped, build on master** — user standing rule "work on
  master only" (memory) overrides the worktree sub-skill.
- Verification → **tsc + vite build, no test suite** — project CLAUDE.md pauses
  tests and bans the dev server/screenshots.
- Scope of items → **all 17 visual items including cube clouds** — user said "make
  it look like the picture… details… a lot"; clouds are cheap and in every render.
- Glossy floor (item 13) → **approximate with tile color/material tweak only**, not
  true reflections — user prefers content over rendering; real SSR is out of scope.
- Apron GSE density (item 16) → **add a container/cargo corner + a few more
  vehicles**, not a full fleet — payoff per object drops off and it's background.
- Luggage/trolley color variation → **cycle a fixed palette by index** (deterministic),
  not RNG — CLAUDE.md determinism rule.
- Execution model → **parallel implementer subagents in batches** for the 13
  independent single-file object tasks; they write files only (no git, no build
  tools, no `index.ts` edits) to avoid git/index races. Controller integrates
  `index.ts` + `airportMap.ts` and runs the tsc + vite-build gate centrally, then a
  final whole-branch review. Adapts SDD to the no-tests project rule + task independence.
- `cubeCloud` sky height → object carries an `alt` param (default ~42) because
  `Placement` has no y-coordinate.
