// rishon3d/src/world/restaurantColliders.ts
//
// Fixed box colliders for the restaurant-district slice, so the player can walk
// INTO the two open shells (the restaurant + the phone shop) through their front
// opening but cannot pass through their walls, the closed restaurants, or the
// infill buildings. Pure data (no THREE / no Rapier) -> unit-testable; World.ts
// turns each BoxCollider into a Rapier fixed cuboid.

import {
  RESTAURANTS, PHONE_SHOP, CAFE, SHOP_Z, HOUSE, OFFICE, OFFICE_LOBBY_H,
  type RestaurantSpec,
} from "./districtPois";
import { INFILL_FOOTPRINTS } from "./restaurantStreet";

export interface BoxCollider { x: number; y: number; z: number; hx: number; hy: number; hz: number; }

const WALL_T = 0.3;          // wall thickness
const FRONT_RETURN_W = 1.0;  // width of each front corner return flanking the entrance

const box = (x: number, y: number, z: number, hx: number, hy: number, hz: number): BoxCollider =>
  ({ x, y, z, hx, hy, hz });

// Perimeter walls of a walk-in shell centered on SHOP_Z: back wall, two side
// walls, and two short front returns flanking an open storefront entrance. The
// center of the front face is intentionally left open (no collider) so the
// player can walk straight in through the storefront.
function shellWalls(cx: number, w: number, d: number, h: number): BoxCollider[] {
  const lx = cx - w / 2, rx = cx + w / 2;
  const back = SHOP_Z - d / 2;
  const front = SHOP_Z + d / 2;
  const hy = h / 2;
  return [
    box(cx, hy, back + WALL_T / 2, w / 2, hy, WALL_T / 2),                                    // back wall
    box(lx + WALL_T / 2, hy, SHOP_Z, WALL_T / 2, hy, d / 2),                                  // left wall
    box(rx - WALL_T / 2, hy, SHOP_Z, WALL_T / 2, hy, d / 2),                                  // right wall
    box(lx + FRONT_RETURN_W / 2, hy, front - WALL_T / 2, FRONT_RETURN_W / 2, hy, WALL_T / 2), // front-left return
    box(rx - FRONT_RETURN_W / 2, hy, front - WALL_T / 2, FRONT_RETURN_W / 2, hy, WALL_T / 2), // front-right return
  ];
}

// A solid box collider matching a closed restaurant body (centered on SHOP_Z).
function solidRestaurant(r: RestaurantSpec): BoxCollider {
  return box(r.x, r.h / 2, SHOP_Z, r.w / 2, r.h / 2, r.d / 2);
}

// Office block (Task 12): the WEST/center of the footprint is a walk-in LOBBY
// (open WEST front, facing the cross street); the EAST third is a SOLID TOWER
// CORE that rises FULL HEIGHT from the ground (it is the visual + collision mass
// of the glass tower above). So the player walks INTO the lobby through the open
// west center, is bounded by the lobby's north/south walls, and is stopped at the
// back by the solid tower core (you cannot walk THROUGH the tower). Every box
// rests on the ground (bottom y=0): the lobby walls (height = lobby clear height)
// and the full-height tower core both satisfy `y - hy == 0`.
const OFFICE_FRONT_RETURN_D = 2.0; // depth of the closed corner returns on the west face
const OFFICE_CORE_D = 5.0;         // depth (along x) of the solid tower core at the east back
function officeColliders(): BoxCollider[] {
  const O = OFFICE;
  const west = O.x - O.w / 2, east = O.x + O.w / 2;
  const north = O.z - O.d / 2, south = O.z + O.d / 2;
  const lh = OFFICE_LOBBY_H;     // lobby clear height
  const lhy = lh / 2;
  const coreWestX = east - OFFICE_CORE_D;  // west face of the solid tower core
  const out: BoxCollider[] = [];
  // --- solid TOWER CORE (east back third), FULL HEIGHT, rests on the ground ---
  out.push(box((coreWestX + east) / 2, O.h / 2, O.z, OFFICE_CORE_D / 2, O.h / 2, O.d / 2));
  // --- lobby perimeter walls (lobby clear height), open WEST center ---
  // north + south walls span only the lobby depth in front of the core.
  const lobbyLen = coreWestX - west;       // x-extent of the walk-in lobby
  const lobbyMidX = (west + coreWestX) / 2;
  out.push(box(lobbyMidX, lhy, north + WALL_T / 2, lobbyLen / 2, lhy, WALL_T / 2)); // north wall
  out.push(box(lobbyMidX, lhy, south - WALL_T / 2, lobbyLen / 2, lhy, WALL_T / 2)); // south wall
  // front corner returns on the open west face (closed corners, open center).
  out.push(box(west + WALL_T / 2, lhy, north + OFFICE_FRONT_RETURN_D / 2, WALL_T / 2, lhy, OFFICE_FRONT_RETURN_D / 2));
  out.push(box(west + WALL_T / 2, lhy, south - OFFICE_FRONT_RETURN_D / 2, WALL_T / 2, lhy, OFFICE_FRONT_RETURN_D / 2));
  return out;
}

export function restaurantColliders(): BoxCollider[] {
  const out: BoxCollider[] = [];
  for (const r of RESTAURANTS) {
    if (r.open) out.push(...shellWalls(r.x, r.w, r.d, r.h)); // walk-in: walls only, open front
    else out.push(solidRestaurant(r));                       // closed: solid box
  }
  // the phone shop is the other walk-in shell
  out.push(...shellWalls(PHONE_SHOP.x, PHONE_SHOP.w, PHONE_SHOP.d, PHONE_SHOP.h));
  // the cafe (west of the bakery) is a walk-in shell too (open front center)
  out.push(...shellWalls(CAFE.x, CAFE.w, CAFE.d, CAFE.h));
  // the hi-tech office: walk-in lobby (open west front) + solid full-height tower core
  out.push(...officeColliders());
  // infill buildings: solid boxes (footprints shared with the mesh builder)
  for (const f of INFILL_FOOTPRINTS) {
    out.push(box(f.x, f.height / 2, f.z, f.width / 2, f.height / 2, f.depth / 2));
  }
  // the player house: a solid box matching its body footprint (geometry in
  // playerHouse.ts; the player walks around it, not into it, in V1).
  out.push(box(HOUSE.x, HOUSE.h / 2, HOUSE.z, HOUSE.w / 2, HOUSE.h / 2, HOUSE.d / 2));
  return out;
}
