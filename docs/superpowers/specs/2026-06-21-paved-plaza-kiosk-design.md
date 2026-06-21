# Paved Plaza + Kiosk Cart — Design Spec

Date: 2026-06-21
Mode: autonomous-builder (`auto`). Forks self-answered; see Assumptions & Decisions.

## Problem

The central city blocks are bare grass. The user wants the city area paved (not
grass) and a paved "business plaza" with a fountain, flowers, benches, etc., plus a
detailed kiosk/vendor cart.

## Goal

1. **Pave the central area** so the blocks read as a paved downtown, not lawn.
2. A **plaza** composite: paved square furnished as a small business square —
   fountain, a ring of benches, planters with flowers, trees, lamps, and kiosk carts.
3. A detailed **`kioskCart`** object (the hero prop): wheels, wooden body, counter,
   striped canopy, crates of produce/goods, and a menu sign.

## Approach

Three new catalog objects + a map edit, all within the registry contract (local
space, deterministic, derived offsets, one merged mesh where possible).

- **`pavement`** — a paver-textured slab (reuses `makeSidewalkTexture` + `PAVER_SUPER_M`
  from `roads.ts`, the same pavers as the sidewalks). `params { w, d }`. The slab's
  y is baked into the geometry (`~0.012`, just above the grass ground, below the
  road asphalt at 0.02). No collider (walkable). One big slab paves the central grid.
- **`kioskCart`** — `params { canopyColor }`. Built from voxel primitives: a wooden
  body + plank lines, a counter top, a back shelf of goods, two spoked wheels
  (rotated cylinders), a handle, crates with `lowPolyBall` produce, a chalk menu
  sign, on 4 poles a striped `makeAwning` canopy. Returns `{ mesh, colliders, obstacles }`.
  FRONT (counter/customer side) faces +z.
- **`plaza`** — `params { w, d, seed }`. A furniture composite (no base slab — it sits
  on the central pavement) reusing `fountain`, `bench`, `flower`, `planter`, `tree`,
  `lamp`, `kioskCart` via `buildObject` + `applyTransform`, all positions derived
  from `w`/`d`: central fountain, 4 benches ringing it (facing in), corner planters +
  lamps + trees, and a couple of kiosk carts at the edges facing inward.
- **Map**: add one big `pavement` slab over the central grid (≈112×112, x,z∈[-56,56]);
  replace the SW-block `park` with the `plaza`; drop a couple of standalone kiosks on
  other paved blocks. Roads/sidewalks already render above the pavement.

## Non-goals

- No paving outside the central grid (stays grass — the city edge).
- No animated fountain/lights or vendor NPC.
- Plaza has no own base slab (relies on the central pavement); fine because we always
  pave the center.

## Verification

`npx tsc --noEmit` clean, then `npx vite build` succeeds. No tests/dev server/
screenshots (CLAUDE.md). Master, no worktree. User looks in-game after.

## Assumptions & Decisions

- Reuse the sidewalk paver texture for `pavement` → one consistent stone look across
  sidewalks and plazas; no new texture work.
- One big central pavement slab (not per-block) → simplest, fully covers the four
  blocks; roads/sidewalks (higher y) still read on top; grass remains outside ±56.
- Bake pavement y into geometry (~0.012) → immune to how the engine sets mesh y, and
  sits above grass (0) but below asphalt (0.02) so the markings stay visible.
- Plaza has no base slab → avoids a coplanar z-fight with the central pavement it
  sits on; documented that plaza must be placed on pavement.
- Replace the park with the plaza (don't keep both) → the user asked for a paved
  business square; the SW block already housed the green park, so the plaza takes its
  spot. (Park object stays in the catalog, just unplaced.)
- `kioskCart` front = +z (counter faces the customer) → consistent with the catalog's
  "+z is front" convention; placements rotate it to face into the plaza.
- Two kiosks in the plaza + a couple loose on other blocks → "a business area" reads
  as multiple vendors without crowding.
