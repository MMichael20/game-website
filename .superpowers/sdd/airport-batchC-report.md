# Airport Batch C (Airside) Report

## Status: DONE

## Files Created

1. `src/world/catalog/airport/airliner.ts` — kind "airliner"
2. `src/world/catalog/airport/controlTower.ts` — kind "controlTower"
3. `src/world/catalog/airport/apronVehicle.ts` — kind "apronVehicle"
4. `src/world/catalog/airport/apron.ts` — kind "apron"
5. `src/world/catalog/airport/runway.ts` — kind "runway"

## TypeScript Status (my 5 files)

Zero errors in the 5 batch-C files after fixing unused imports.
Remaining tsc errors all belong to other batch files (baggageCarousel, dutyFreeShop, gateLounge, jetBridge) — not authored by this agent.

## Key design notes

### airliner.ts
- Nose points +X, wingspan along Z, gear wheels on y=0
- ~38m total length (36m fuselage + 6m nose cone + 7m tail cone combined), ~38m wingspan
- All horizontal cylinders (fuselage, nacelles, landing gear wheels) built via CylinderGeometry + Matrix4 rotation + .applyMatrix4() before tintGeo — avoids rotated-mesh-in-merge problem
- Details: belly cheatline, 28 windows per side, swept wings with root fillets and winglets, twin CFM-style nacelles with intake lips + exhaust nozzles + pylons, vertical fin with Star-of-David hint in gold, horizontal stabilizers, nose gear + 2 main bogies with 4 wheels each, registration text decal
- Single fuselage AABB collider; full-wingspan obstacle rect

### controlTower.ts
- Tapered shaft via 6 stacked CylinderGeometry segments; glass cab as separate transparent CylinderGeometry (open sides, DoubleSide); emissive beacon on mast tip
- 20-post gallery railing; equipment boxes at base; 2 AC units + vent pipe on roof

### apronVehicle.ts
- All 5 variants in one file via switch(variant)
- tug: yellow tractor + 3 coupled baggage carts
- fuel: grey bowser with horizontal cylindrical tank (Matrix4 rotation), hose reel
- stairs: 10-step flight with handrails climbing to top platform
- pushback: low wide blue tug with counterweight, 6 big wheels
- catering: box truck with scissor-lift box body at raised height

### apron.ts
- Concrete slab with expansion joint grid, dashed yellow lead-in centreline, arc guidance, stop bar, white edge lines, nose-wheel box, stand number canvas decal laid flat (rotation.x = -PI/2)
- No colliders or obstacles (flat ground)

### runway.ts
- Built along X; width 45m (runway) or 14m (taxiway)
- Runway: dashed centreline, threshold piano keys, edge lines, touchdown zone bar pairs, designation hints
- Taxiway: solid yellow centreline, edge light boxes (lanternGlow color), hold-short double bar, chevron arrows
- No colliders or obstacles
