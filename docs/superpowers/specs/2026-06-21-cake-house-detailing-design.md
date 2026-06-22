# Cake House restaurant — match the reference, add detail

**Date:** 2026-06-21
**Status:** approved (interactive brainstorm; finished in autonomous mode).
**Reference:** `assets/design-examples/large-enterable-restaurant-model-v1.png`
(FRONT/INTERIOR, SIDE, BACK of a voxel "Cake House" bakery-restaurant).

## Goal

Bring the `restaurant` catalog object (`src/world/catalog/stores.ts`, signed "Cake
House", placed at `w:22 d:24 h:8` in `src/world/map.ts`) closer to the reference and add
substantially more detail. Everything stays deterministic and derived from `w/d/h`
(CLAUDE.md pitfall #3); only `catalog/stores.ts` changes. The retired legacy hand-builders
(`restaurantInterior.ts`, `bakeryInterior.ts`, `restaurantStreet.ts`) are NOT touched.

## Already matching (left as-is)

Tan clad walls, stone base course, red fascia band, brown corner pilasters, parapet roof,
glass storefront + double doors + mullions, red/white awning, "Cake House" front sign, side
awning'd windows with planters + lanterns, checker tile floor, glass display case, cake
wall shelves, stainless kitchen + hood + fridge, red-bench communal tables, café tables,
back roll-door + service door + drainpipes + conduit/panel + vents + dumpster + crates,
interior wall lanterns, indoor plants.

## Changes

1. **Front entrance → stone elevation (replaces the wooden deck).** Replace
   `makeFrontDeck` (wood planks + wooden railing + corner lanterns) with
   `makeFrontElevation`: a raised **stone plinth/podium** whose top is flush with the
   interior floor (`FLOOR_TOP`), a stone curb lip, **stone steps** descending to the
   sidewalk at the entrance, glowing lanterns on **stone** corner posts (no wooden
   railing), and ground-level flower **planter boxes** flanking the door and under the
   front windows. Colliders for the podium top + steps so the player walks up cleanly.
   Footprint depth kept ~equal to the old deck so no new placement overlap with the phone
   shop.

2. **Roof → HVAC unit.** `makeRooftopUnit(w,d,h)`: a grey boxy AC/vent unit (louvered
   face + small feet) on the parapet roof, offset toward the back so it reads from the SIDE
   and over the open front. Decorative (no collider — out of reach on the roof).

3. **Kitchen → busier.** Extend `makeKitchen`: add a tall stainless **wire shelving rack**
   (with tray/sheet-pan slabs) beside the fridge and a small **microwave** on the worktop.
   Colliders added for the rack; obstacle footprint widened to include it.

4. **Display case → L-shape.** Generalize `makeDisplayCase(cx,cz,len,horizontal?)` to build
   along x when `horizontal`. Compose the case as an L: the existing long leg (along z) plus
   a short **return leg** (along x) at the front, register at the inner corner. Cakes line
   both legs.

5. **Fuller, more varied bakery.** A third cake wall-shelf unit and slightly higher
   cake/cupcake density (counts still derived from length) so shelves and case read as
   well-stocked, with more colour variety from the existing `CAKE_LOOKS`/`GLAZES` sets.

6. **Back → loading detail.** Add **yellow safety bollards** flanking the roll-up loading
   door, a **hand-truck/dolly** leaning by the back wall, and one extra **crate**, matching
   the BACK view. Bollards/dolly/crate get colliders + obstacle footprints.

7. **Side sign.** A small "Cake House" `textSign` on a side wall near the front corner,
   facing outward (±x), echoing the SIDE view.

## Verification gate (project rule)

`npx tsc --noEmit` clean + `npx vite build` succeeds. No dev server, no screenshots, no
tests (CLAUDE.md pitfalls 1 & 2). The user looks in-game.

## Assumptions & Decisions

- Front entrance → chose **raised stone elevation (plinth + stone steps), drop the wooden
  deck/railing** — user clarified the reference is "raised... with a stone-esque
  elevation"; keep it raised but stone, not a wooden porch.
- Side sign → chose **add a small side "Cake House" sign** — the SIDE view shows one; cheap
  fidelity win.
- Rooftop unit → chose **decorative, no collider** — it sits on the roof out of player
  reach; a collider would be dead weight.
- Display case L-shape → chose **generalize `makeDisplayCase` with a `horizontal` flag +
  compose two legs** over a bespoke L builder — reuses the existing case geometry.
- Bakery fullness → chose **one extra shelf + modest density bump** over packing every
  surface — avoids cramped overlap and keeps the deterministic derive-from-size rule clean.
- Isolation → chose **build on master, no worktree** — overrides the autonomous-builder
  worktree step because the user's standing rule is "work on master only".
- Execution → chose **direct implementation, not multi-subagent** — all edits live in one
  cohesive file (`stores.ts`) and need iterative `tsc`; splitting risks overlap/integration
  breakage for no parallelism gain.
