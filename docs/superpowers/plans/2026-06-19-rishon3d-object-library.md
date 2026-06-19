# Plan — Rishon3D Object Library

Spec: docs/superpowers/specs/2026-06-19-rishon3d-object-library-design.md
Branch: worktree-3d-spike (NOT merged/deployed)

## Wave 0 — foundation (controller)
1. `src/world/objects/voxel.ts` — tintedBox, tintGeo, lowPolyBall, cone, cylinderY,
   mergeTinted, tintedMesh. + `test/voxel.test.ts`.
2. `src/world/objects/objectPalette.ts` — food/flavor/petal color sets.
3. `#objects` dev preview scaffold in `main.ts` (wire objects as they land).
4. `src/world/objects/index.ts` barrel + OBJECTS registry.

## Wave 1 — object modules (parallel, file-disjoint subagents)
- A: `objects/flower.ts` + `objects/pottedPlant.ts` + tests
- B: `objects/cake.ts` + `objects/cupcake.ts` + `objects/donut.ts` + tests
- C: `objects/iceCream.ts` + `objects/drinkCup.ts` + tests
- D: `objects/umbrella.ts` + test
- E: `entities/carMesh.ts` detail pass + test (collider untouched)

## Wave 2 — integration (controller)
- restaurantStreet: umbrella -> makeUmbrella; planter blooms -> makeFlower;
  add dessert display cart (cakes/cupcakes/donuts/ice creams).
- `world/bakeryInterior.ts` + open the west restaurant; update districtPois
  RESTAURANTS + restaurantColliders (shellWalls) + restaurantStreet open logic.
- Wire OBJECTS into the `#objects` preview.

## Wave 3 — verify (controller)
- tsc, vitest (all), build, smoke.
- Screenshots: `#objects` preview + in-scene promenade. Iterate on any cube-y reads.
- Update ledger + memory. Hand back branch.

## Verification gates (every wave): tsc clean, related tests pass.
## Final: full suite green + visual evidence captured.
