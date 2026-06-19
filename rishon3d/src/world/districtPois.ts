// rishon3d/src/world/districtPois.ts
//
// The single source of truth for the restaurant-district vertical slice: the
// promenade geometry constants, the restaurant footprints, and the named
// gameplay anchors (POIs) that the interior builder, secondary-location
// builders, scripted-NPC routes, the minimap and the interaction system all
// share. Keeping every coordinate here means a change to the block layout
// stays consistent across geometry, AI and UI. No THREE, no RNG -> testable.

import { PALETTE } from "./palette";
import { ROAD_W } from "./roads";

export interface Vec2 { x: number; z: number }

// --- promenade footprint (the paved plaza the restaurants line) ---------------
export const CX = 95;        // promenade center x
export const CZ = 95;        // promenade center z
export const PROM_W = 44;    // span along x (the row of restaurants)
export const PROM_D = 22;    // depth along z (storefronts -> seating -> street)

// Z bands across the block (north -> south, i.e. increasing z toward the street).
export const SHOP_Z = CZ - 6;    // 89  building front line (box centers)
export const SEAT_Z = CZ + 2;    // 97  outdoor seating band
export const ANCHOR_Z = CZ + 8;  // 103 menu / pickup stand band
export const ROAD_Z = CZ + 14;   // 109 street centerline
export const STREET_LEN = 54;    // road length along x
export const FAR_WALK_D = 4;      // depth of the sidewalk across the road
export { ROAD_W };

// Front face of a restaurant box of depth d centered on SHOP_Z.
export function shopFront(d: number): number { return SHOP_Z + d / 2; }

export interface RestaurantSpec {
  x: number; w: number; d: number; h: number; awning: number;
  open?: boolean; // the one enterable, furnished restaurant
}

// Three bespoke restaurants spaced evenly along the promenade. The middle box
// is the OPEN one: a hollow shell with a walk-in doorway and a full interior.
export const RESTAURANTS: RestaurantSpec[] = [
  { x: CX - 15, w: 8, d: 8, h: 6, awning: PALETTE.awningRed },
  { x: CX, w: 9, d: 8, h: 9, awning: PALETTE.awningBlue, open: true },
  { x: CX + 15, w: 8, d: 8, h: 7, awning: PALETTE.awningRed },
];

export const MAIN_RESTAURANT: RestaurantSpec =
  RESTAURANTS.find((r) => r.open) ?? RESTAURANTS[1];

// --- patio seating clusters ---------------------------------------------------
// One table cluster per slot, deliberately skipping the central x≈CX entrance
// lane so there is an unobstructed walk from the street/pickup stand straight
// into the open restaurant's doorway.
export function seatClusters(): Vec2[] {
  const xs = [CX - 22, CX - 15, CX - 8, CX + 8, CX + 15];
  return xs.map((x, i) => ({ x, z: SEAT_Z + (i % 2 === 0 ? 0 : 2.4) }));
}

// Chair offsets around a table (deterministic four-around layout).
export const CHAIR_OFFSETS: [number, number][] = [
  [0.95, 0], [-0.95, 0], [0, 0.95], [0, -0.95],
];

// --- named gameplay anchors (POIs) -------------------------------------------
// All in world space. `r` is the interaction/approach radius.
export type PoiKind =
  | "restaurant" | "counter" | "phoneShop" | "taxi" | "park" | "pickup" | "crosswalk";

export interface Poi {
  kind: PoiKind;
  id: string;
  label: string;
  x: number;
  z: number;
  r: number;
  /** one-letter glyph drawn on the minimap marker */
  glyph: string;
  /** minimap marker color */
  color: string;
}

const MD = MAIN_RESTAURANT;
const MAIN_FRONT = shopFront(MD.d); // 93

// Door opening of the open restaurant, offset to the +x side of the storefront.
export const RESTAURANT_DOOR: Vec2 = { x: MD.x + MD.w * 0.28, z: MAIN_FRONT };
// A waypoint just inside the doorway and the ordering counter behind it.
export const RESTAURANT_INSIDE: Vec2 = { x: MD.x + 1.2, z: SHOP_Z + 1.0 };
export const RESTAURANT_COUNTER: Vec2 = { x: MD.x - 0.6, z: SHOP_Z - 1.6 };
// Staff stand-point behind the counter (cashier idles here).
export const RESTAURANT_STAFF: Vec2 = { x: MD.x - 0.6, z: SHOP_Z - 3.0 };

// Indoor table seats (where scripted diners sit; face toward the table center).
export interface Seat extends Vec2 { faceYaw: number }
export const INDOOR_TABLE_SEATS: Seat[] = [
  { x: MD.x - 2.6, z: SHOP_Z + 2.0, faceYaw: Math.PI / 2 },
  { x: MD.x + 2.6, z: SHOP_Z + 2.0, faceYaw: -Math.PI / 2 },
];

// Phone / convenience shop: a storefront at the east end of the promenade row.
export const PHONE_SHOP = { x: CX + 23, w: 9, d: 8, h: 7 };
const PHONE_FRONT = shopFront(PHONE_SHOP.d);
export const PHONE_SHOP_DOOR: Vec2 = { x: PHONE_SHOP.x + 2.4, z: PHONE_FRONT };
export const PHONE_SHOP_INSIDE: Vec2 = { x: PHONE_SHOP.x + 0.5, z: SHOP_Z + 0.5 };
export const PHONE_SHOP_COUNTER: Vec2 = { x: PHONE_SHOP.x - 1.0, z: SHOP_Z - 1.4 };
export const PHONE_SHOP_STAFF: Vec2 = { x: PHONE_SHOP.x - 1.0, z: SHOP_Z - 2.8 };

// Taxi pickup: a parked cab on the near curb just east of the crosswalk, with a
// waiting spot + sign on the patio side.
export const TAXI_CAR: Vec2 = { x: CX + 9, z: ROAD_Z - ROAD_W / 2 + 1.0 };
export const TAXI_WAIT: Vec2 = { x: CX + 9, z: ANCHOR_Z + 1 };

// Pocket park / plaza: a small green pocket at the west end of the block.
export const PARK_CENTER: Vec2 = { x: CX - 25, z: CZ + 6 };
export const PARK_BENCH: Vec2 = { x: PARK_CENTER.x, z: PARK_CENTER.z + 2.0 };

// Pickup / delivery stand (existing landmark anchor).
export const PICKUP_STAND: Vec2 = { x: CX, z: ANCHOR_Z };

// Crosswalk center (player crosses the street here).
export const CROSSWALK: Vec2 = { x: CX, z: ROAD_Z };

// Sidewalk band centers used for pedestrian routes.
export const PATIO_WALK_Z = ANCHOR_Z + 2.0;            // 105: patio-side walking lane
export const FAR_WALK_Z = ROAD_Z + ROAD_W / 2 + 0.3 + FAR_WALK_D / 2; // far sidewalk

// The POI table consumed by the minimap legend + the interaction prompts.
export const POIS: Poi[] = [
  { kind: "restaurant", id: "restaurant", label: "Restaurant", glyph: "R", color: "#e0524a",
    x: RESTAURANT_DOOR.x, z: RESTAURANT_DOOR.z, r: 4.5 },
  { kind: "phoneShop", id: "phoneShop", label: "Phone Shop", glyph: "P", color: "#3aa0ff",
    x: PHONE_SHOP_DOOR.x, z: PHONE_SHOP_DOOR.z, r: 4.5 },
  { kind: "taxi", id: "taxi", label: "Taxi Stand", glyph: "T", color: "#f2c14e",
    x: TAXI_WAIT.x, z: TAXI_WAIT.z, r: 4.5 },
  { kind: "park", id: "park", label: "Pocket Park", glyph: "G", color: "#5cc24a",
    x: PARK_CENTER.x, z: PARK_CENTER.z, r: 6 },
  { kind: "pickup", id: "pickup", label: "Pickup", glyph: "S", color: "#ffd98a",
    x: PICKUP_STAND.x, z: PICKUP_STAND.z, r: 3.5 },
];
