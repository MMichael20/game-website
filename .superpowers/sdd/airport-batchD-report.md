# Airport Batch D Report — Landside / Israeli Identity

## Status: DONE

## Files Created

1. `src/world/catalog/airport/airportMonument.ts` — kind `airportMonument`
2. `src/world/catalog/airport/palmTree.ts` — kind `palmTree`
3. `src/world/catalog/airport/curbCanopy.ts` — kind `curbCanopy`

## TypeScript Status (our 3 files)

Zero errors in airportMonument.ts, palmTree.ts, curbCanopy.ts.

Remaining tsc errors are all in OTHER batch files:
- airliner.ts, baggageCarousel.ts, checkInIsland.ts, controlTower.ts, flightBoard.ts, gateLounge.ts, terminalHall.ts
(unused import warnings in other authors' files — not our concern per task rules)

## Implementation Notes

### airportMonument.ts
- Three-stepped stone plinth (stoneBase / dark stone accent) with full-width body
- Two text sign boards on the plinth front face (+z): English "Ben Gurion Airport" and Hebrew "נמל התעופה בן-גוריון" — both in Israeli blue (0x0038b8) with white text
- Two 8m flag poles flanking at x=±7.5, each with a cylinderY shaft, stone pedestal, and steel finial ball
- Israeli flag on each pole: white field + two horizontal blue stripes + Star of David approximated as crossed bars

### palmTree.ts
- 8-segment tapering trunk using cylinderY; alternates TRUNK_LIGHT / TRUNK_DARK shading; adds a ring bump disc at each joint for the characteristic date-palm ring texture; slight deterministic per-segment lean for organic curve
- Crown of 8 fronds via ringAngles; each frond is a tapered cone; secondary leaflets along each frond using smaller cones
- 5 date clusters under the crown (lowPolyBall, amber/brown)
- Soil mound at base; slim trunk collider; small obstacle footprint

### curbCanopy.ts
- Derives column count from `w` (every ~8m, +1 for ends)
- Each column: stone plinth base + cylinderY shaft + capital; collider + obstacle per column
- Roof slab with longitudinal rib strips on top; coffered ceiling grid underneath; pendant light strip suggestions
- Full-length Israeli blue fascia band on +z front edge
- Label sign (makeTextSignMesh, 0x0038b8 board, white text) centered/repeated at ~20m intervals along the fascia
- Raised curb strip with yellow edge paint; asphalt lane pad; white dashed lane dividers; yellow center line; chevron arrow markings
