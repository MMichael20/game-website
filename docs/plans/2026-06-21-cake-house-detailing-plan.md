# Cake House detailing — implementation plan

Spec: `docs/superpowers/specs/2026-06-21-cake-house-detailing-design.md`
All edits in `src/world/catalog/stores.ts` (the `restaurant` builder + helpers).

## Steps

1. **Stone elevation** — replace `makeFrontDeck` with `makeFrontElevation(w,d)`:
   stone podium (top at `FLOOR_TOP`) + curb lip + stone steps + ground planter boxes +
   lanterns on stone posts. Colliders: podium + each step. Update the call site.

2. **Rooftop unit** — `makeRooftopUnit(w,d,h)` -> grey HVAC box with louvers + feet; push as
   a `{ mesh }` part, offset toward the back of the roof.

3. **Kitchen** — extend `makeKitchen`: add a wire shelving rack beside the fridge + a
   microwave on the worktop; add the rack collider; widen the obstacle.

4. **Display case L** — add `horizontal?` to `makeDisplayCase` (build along x when set,
   swap collider/obstacle extents). In the builder add a short return leg to form the L;
   move the register to the inner corner.

5. **Fuller bakery** — add a third `makeCakeShelf` along the back-left; nudge cake/cupcake
   counts up where derived.

6. **Back loading detail** — yellow bollards flanking the roll door, a hand-truck/dolly, an
   extra crate; each with collider + obstacle.

7. **Side sign** — small `makeTextSignMesh("Cake House")` on a side wall near the front
   corner, rotated to face outward.

## Verify

`npx tsc --noEmit` clean + `npx vite build` succeeds. No dev server / screenshots / tests.
