// rishon3d/src/world/obstacles.ts
//
// Static SOLID obstacles the scripted patrons must not walk through. The open
// shells (restaurant / bakery / phone shop) are deliberately EXCLUDED so patrons
// can still enter them via the open storefront; this set is the solid stuff —
// closed buildings, skyline/flank infill, the player house and the curbside cars.
// Pure data + a cheap per-frame push-out (no THREE) -> unit-testable.

import { RESTAURANTS, SHOP_Z, HOUSE, TAXI_CAR, type Vec2 } from "./districtPois";
import { INFILL_FOOTPRINTS, PARKED_CAR_SPOTS, restaurantPropObstacles, cafePropObstacles } from "./restaurantStreet";
import { secondaryPropObstacles } from "./secondaryLocations";
import { residentialPropObstacles } from "./residential";
import { allLocationObstacles } from "./locations";
import { rectAround, type Rect } from "../game/wander";

const M = 0.25; // keep-clear band so NPCs graze rather than touch

// Curbside cars run their length along x (~3.6) and ~1.8 across (z).
const CAR_W = 3.8, CAR_D = 2.0;

// The full solid-obstacle set the scripted patrons push out of. Buildings/house/
// cars here; the chunky PROPS come from each location builder's *PropObstacles()
// (so a new prop is covered by adding its footprint right where it's placed).
// EXCLUDED by design: open-shell interiors (patrons enter via the door) and all
// SEATING (patio clusters, indoor chairs, PARK_BENCH) — those are sit targets.
export const PATRON_OBSTACLES: Rect[] = [
  // closed restaurants are solid bodies centered on the building front line.
  ...RESTAURANTS.filter((r) => !r.open).map((r) => rectAround(r.x, SHOP_Z, r.w, r.d, M)),
  // skyline + west-flank infill buildings.
  ...INFILL_FOOTPRINTS.map((f) => rectAround(f.x, f.z, f.width, f.depth, M)),
  // the player house.
  rectAround(HOUSE.x, HOUSE.z, HOUSE.w, HOUSE.d, M),
  // curbside cars (parked + taxi).
  ...PARKED_CAR_SPOTS.map((c) => rectAround(c.x, c.z, CAR_W, CAR_D, M)),
  rectAround(TAXI_CAR.x, TAXI_CAR.z, CAR_W, CAR_D, M),
  // chunky props from each location (planters, stand, cart, trees, hedges, bins...)
  ...restaurantPropObstacles(),
  ...cafePropObstacles(),
  ...secondaryPropObstacles(),
  ...residentialPropObstacles(),
  // Additive registry hook: solid footprints declared directly on a LocationDef.
  // Empty for the current locations (their solids come from the spreads above),
  // so this changes nothing today; it lets a FUTURE location ship its own.
  ...allLocationObstacles(),
];

// If `pos` is inside any obstacle rect, push it out to the nearest edge (smallest
// displacement axis) so the agent slides along the solid instead of ghosting
// through it. Mutates and returns pos. Boundary points are treated as outside, so
// a waypoint placed exactly at an obstacle edge stays reachable.
export function resolveObstacles(pos: Vec2, rects: Rect[] = PATRON_OBSTACLES): Vec2 {
  for (const r of rects) {
    if (pos.x <= r.minX || pos.x >= r.maxX || pos.z <= r.minZ || pos.z >= r.maxZ) continue;
    const dLeft = pos.x - r.minX, dRight = r.maxX - pos.x;
    const dDown = pos.z - r.minZ, dUp = r.maxZ - pos.z;
    const m = Math.min(dLeft, dRight, dDown, dUp);
    if (m === dLeft) pos.x = r.minX;
    else if (m === dRight) pos.x = r.maxX;
    else if (m === dDown) pos.z = r.minZ;
    else pos.z = r.maxZ;
  }
  return pos;
}
