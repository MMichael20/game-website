// rishon3d/src/world/restaurantColliders.ts
//
// Fixed box colliders for the restaurant-district slice, so the player can walk
// INTO the two open shells (the restaurant + the phone shop) through their front
// opening but cannot pass through their walls, the closed restaurants, or the
// infill buildings. Pure data (no THREE / no Rapier) -> unit-testable; World.ts
// turns each BoxCollider into a Rapier fixed cuboid.

import { RESTAURANTS, PHONE_SHOP, SHOP_Z, HOUSE, type RestaurantSpec } from "./districtPois";
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

export function restaurantColliders(): BoxCollider[] {
  const out: BoxCollider[] = [];
  for (const r of RESTAURANTS) {
    if (r.open) out.push(...shellWalls(r.x, r.w, r.d, r.h)); // walk-in: walls only, open front
    else out.push(solidRestaurant(r));                       // closed: solid box
  }
  // the phone shop is the other walk-in shell
  out.push(...shellWalls(PHONE_SHOP.x, PHONE_SHOP.w, PHONE_SHOP.d, PHONE_SHOP.h));
  // infill buildings: solid boxes (footprints shared with the mesh builder)
  for (const f of INFILL_FOOTPRINTS) {
    out.push(box(f.x, f.height / 2, f.z, f.width / 2, f.height / 2, f.depth / 2));
  }
  // the player house: a solid box matching its body footprint (geometry in
  // playerHouse.ts; the player walks around it, not into it, in V1).
  out.push(box(HOUSE.x, HOUSE.h / 2, HOUSE.z, HOUSE.w / 2, HOUSE.h / 2, HOUSE.d / 2));
  return out;
}
