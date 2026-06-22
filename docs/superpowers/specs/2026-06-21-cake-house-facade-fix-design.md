# Cake House — facade fix + exterior richness

**Date:** 2026-06-21
**Status:** approved direction (user: "make it fuller of details, really put effort in");
finished in autonomous mode.
**Reference:** `assets/design-examples/large-enterable-restaurant-model-v1.png`
**Trigger:** in-game screenshot shows the restaurant as a plain pale-grey box — the
detailing is present in code but geometrically hidden.

## Root cause (the "grey box")

`buildingShell` side walls are `T = 0.3` thick, centred on `±w/2`, so their OUTER face is at
`±(w/2 + 0.15)` (back wall outer face at `-(d/2 + 0.15)`). `makeExteriorFacade` mounts the
tan body / stone base / red fascia panels at `±(w/2 + 0.06)` (and the back at
`-(d/2 + 0.06)`) — i.e. **inside** the shell's outer surface. The pale shell wall
(`0xf0ede6`) therefore covers them and the building reads as a blank box. Only the corner
pilasters (0.5 wide) protrude, which matches the screenshot exactly. `makeSideWindows`
mounts glass at `w/2 + 0.12`, also inside the shell face, so windows are half-buried.

## Fix + enrichment (all in `src/world/catalog/stores.ts`)

1. **Mount cladding PROUD of the shell** — anchor every exterior band to the shell outer
   face `FACE = w/2 + T/2` (sides) / `d/2 + T/2` (back), then push outward by the cladding
   thickness. Single source `T = 0.3`. This alone makes the tan body, stone base course,
   and red fascia band visible on all three big walls.

2. **More wall articulation in `makeExteriorFacade`:**
   - Taller, clearly-visible **stone base course** and a thin brown **string course** on top
     of it.
   - A horizontal brown **belt/cornice course** at window-header height, wrapping sides+back.
   - A prominent **red fascia band** just under the roof cap (wraps sides+back).
   - **Vertical pilaster strips** (brown) on the BACK wall, evenly spaced, base→fascia.
   - Keep corner pilasters, roof cap, parapet (made a touch deeper as a cornice).

3. **Side bays in `makeSideWindows`:**
   - **Taller windows** (sill ~1.1 to ~4.3) with a slim **transom bar**, so glass fills the
     wall instead of a low strip.
   - **Vertical pilaster strips** between bays (aligned with the window step), base→fascia —
     gives the reference's structural rhythm and breaks up the blank wall.
   - A row of small **clerestory accent windows** high on the tan band between pilasters,
     filling the upper wall.
   - Re-offset glass / awnings / planters / lanterns to clear the now-proud cladding
     (glass ~`xo+0.30`, awning ~`xo+0.28`, planter ~`xo+0.6`, lantern on the cladding face).
   - Raise awnings to the new window top.

## Verification gate

`npx tsc --noEmit` clean + `npx vite build` succeeds. No dev server / screenshots / tests
(CLAUDE.md). User looks in-game.

## Assumptions & Decisions

- "Grey box" → diagnosed as **buried cladding (offset bug)**, not missing geometry — verified
  by reading shell vs facade offsets; corner pilasters protruding confirms it.
- Pilaster placement → **side pilasters live in `makeSideWindows`** (aligned to the window
  step) and **back pilasters in `makeExteriorFacade`** — each placed where its bay layout is
  known, avoiding cross-function magic numbers.
- Building height kept at `h=8` (don't shrink) — fill the tall wall with bands, taller
  windows, pilasters, and clerestory accents rather than changing the placed massing.
- Storefront (front face) left untouched — it is shared with `phoneRepairShop`; the front
  already reads as glass + sign + awning.
- Isolation → **build on master, no worktree** (user's standing rule overrides the worktree
  step).
- Execution → **direct implementation, not multi-subagent** — one cohesive file needing
  iterative typecheck; the fix and the enrichment share the same `FACE`/offset math.
