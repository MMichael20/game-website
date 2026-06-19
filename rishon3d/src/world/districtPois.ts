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
// Type-only import: erased at runtime, so it forms NO init cycle (mirrors the
// `import type { RoadDef }` already used by roads.ts). The east cross-street
// RoadDef is mirrored as a literal in rishonMap.CORE_MAP (the only edge that
// would close the rishonMap -> districtPois -> roads -> rishonMap loop is a
// VALUE import, which we never add).
import type { RoadDef } from "./rishonMap";

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
  open?: boolean;   // an enterable, furnished, walk-in shell
  bakery?: boolean; // the west shell is a bakery-cafe (its own dessert interior)
}

// Three bespoke restaurants spaced evenly along the promenade. The middle box is
// the OPEN restaurant; the west box is the OPEN bakery-cafe; both are walk-in
// shells with full interiors. The east box stays a closed facade (follow-up).
export const RESTAURANTS: RestaurantSpec[] = [
  { x: CX - 15, w: 8, d: 8, h: 6, awning: PALETTE.awningRed, open: true, bakery: true },
  // HERO main restaurant — widened (9 -> 11) to read as the district's centrepiece.
  { x: CX, w: 11, d: 8, h: 9, awning: PALETTE.awningBlue, open: true },
  { x: CX + 15, w: 8, d: 8, h: 7, awning: PALETTE.awningRed },
];

// The middle restaurant specifically (NOT the bakery) anchors restaurantInterior.
export const MAIN_RESTAURANT: RestaurantSpec =
  RESTAURANTS.find((r) => r.open && !r.bakery) ?? RESTAURANTS[1];

// The bakery-cafe shell (west), anchoring bakeryInterior.
export const BAKERY: RestaurantSpec =
  RESTAURANTS.find((r) => r.bakery) ?? RESTAURANTS[0];

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
//
// The `Poi`/`PoiKind` TYPES and the flat `POIS` table now live in `locations.ts`
// (the single source: `POIS = locationPois()`, a projection of `LOCATIONS`). This
// module only owns the raw coordinate ANCHORS that the registry composes from —
// keeping the dependency one-way (locations -> districtPois) with no runtime
// back-edge.
const MD = MAIN_RESTAURANT;
const MAIN_FRONT = shopFront(MD.d); // 93

// Door opening of the open restaurant, offset to the +x side of the storefront.
export const RESTAURANT_DOOR: Vec2 = { x: MD.x + MD.w * 0.28, z: MAIN_FRONT };
// A waypoint just inside the doorway and the ordering counter behind it.
export const RESTAURANT_INSIDE: Vec2 = { x: MD.x + 1.2, z: SHOP_Z + 1.0 };
export const RESTAURANT_COUNTER: Vec2 = { x: MD.x - 0.6, z: SHOP_Z - 1.6 };
// Staff stand-point behind the counter (cashier idles here).
export const RESTAURANT_STAFF: Vec2 = { x: MD.x - 0.6, z: SHOP_Z - 3.0 };

// Indoor dining — the SINGLE SOURCE OF TRUTH for the two indoor tables, their
// chairs and the seats NPCs use. restaurantInterior builds tables+chairs from
// these exact constants (so a chair is always under every seat), and the seat
// lists below are derived as table.x +/- INDOOR_CHAIR_DX — never hand-typed table
// centers. (The floating-diner bug came from seats pointing at table centers.)
export interface Seat extends Vec2 { faceYaw: number }
export const INDOOR_TABLES: Vec2[] = [
  { x: MD.x - 2.6, z: SHOP_Z + 2.2 },
  { x: MD.x + 2.6, z: SHOP_Z + 2.2 },
];
export const INDOOR_CHAIR_DX = 0.95; // chair offset along x from each table center

// Scripted patrons sit on the OUTER chairs (away from CX): the Patron sit-facing
// heuristic (face +x when seat.x < CX, else -x) only reads correctly there.
export const INDOOR_TABLE_SEATS: Seat[] = INDOOR_TABLES.map((t) => {
  const outer = t.x < CX ? t.x - INDOOR_CHAIR_DX : t.x + INDOOR_CHAIR_DX;
  return { x: outer, z: t.z, faceYaw: t.x < CX ? Math.PI / 2 : -Math.PI / 2 };
});
// Always-present static diners take the INNER chairs (distinct seats, so they
// never double up with a scripted diner). They face the table via faceYaw.
export const INDOOR_DINER_SEATS: Seat[] = INDOOR_TABLES.map((t) => {
  const inner = t.x < CX ? t.x + INDOOR_CHAIR_DX : t.x - INDOOR_CHAIR_DX;
  return { x: inner, z: t.z, faceYaw: t.x < CX ? -Math.PI / 2 : Math.PI / 2 };
});

// Bakery-cafe (west shell): walk-in door + interior anchors.
const BD = BAKERY;
const BAKERY_FRONT = shopFront(BD.d);
export const BAKERY_DOOR: Vec2 = { x: BD.x - BD.w * 0.26, z: BAKERY_FRONT };
export const BAKERY_INSIDE: Vec2 = { x: BD.x - 1.0, z: SHOP_Z + 1.0 };
export const BAKERY_COUNTER: Vec2 = { x: BD.x + 0.6, z: SHOP_Z - 1.4 };
export const BAKERY_STAFF: Vec2 = { x: BD.x + 0.6, z: SHOP_Z - 2.6 };

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

// Pocket park / plaza: a small green pocket on the PLAYER (south) side of the
// street, just below the central crosswalk, so the loop reads
// house -> park -> crosswalk -> restaurant. Its street-facing edge faces NORTH
// toward the road (see makePocketPark, which flips its offsets for the south side).
export const PARK_CENTER: Vec2 = { x: CX - 1, z: ROAD_Z + 12 };   // (94, 121)
export const PARK_BENCH: Vec2 = { x: PARK_CENTER.x, z: PARK_CENTER.z + 1.5 };

// --- Player House (the spawn / home base, location #1) -------------------------
// A small residential lot on the SOUTH side of the street (across the crosswalk
// from the restaurant strip). The house front faces NORTH (-z) onto the street.
// NOTE: rishonMap.CORE_MAP mirrors these coords as literals (to avoid an import
// cycle) for the one isHouse building + the player/car spawns — keep them in sync.
export const HOUSE = { x: CX - 21, z: ROAD_Z + 15, w: 12, d: 9, h: 5 }; // (74, 124)
export const HOUSE_FRONT = HOUSE.z - HOUSE.d / 2;                       // 119.5 (north face)
// The door anchor sits ~1u IN FRONT of the physical door so it is clear of the
// house's solid footprint (used by the home POI + the NPC "goHome" target, both
// of which want the spot just outside the door, not embedded in the wall).
export const HOUSE_DOOR: Vec2 = { x: HOUSE.x, z: HOUSE_FRONT - 1.0 };
// Spawn IN FRONT of the house (lower z, toward the street) so the player is not
// inside the solid house collider, and offset east of the house body so the
// follow-camera (which sits ~7.5u behind) clears the house instead of starting
// inside it. The player faces north toward the crosswalk + restaurant strip.
export const HOUSE_SPAWN: Vec2 = { x: HOUSE.x + 10, z: HOUSE_FRONT - 3.5 }; // (84, 116)
export const DRIVEWAY: Vec2 = { x: CX - 9, z: ROAD_Z + 14 };           // (86, 123) drivable car
export const MAILBOX: Vec2 = { x: CX - 15, z: HOUSE_FRONT - 1.5 };     // (80, 118) at the path

// --- East cross street + east-side locations (Task 8 world growth) ------------
// The world is grown to ground.size 160 / center (108,104) so an office tower
// (east) and a cafe (west) fit beside the existing hero strip. A second, short
// south-running street branches off the hero street EAST of the phone shop
// (x=118), giving the loop a junction + a frontage for the office tower.
// NOTE: rishonMap.CORE_MAP mirrors EAST_CROSS as a literal RoadDef (to avoid the
// rishonMap -> districtPois import cycle) — keep them in sync.
export const EAST_CROSS_X = 128;                 // cross-street centerline x
// z=112 (== ROAD_Z + 3): centered so the 40u street straddles the hero street
// (z=109) and runs south past the office frontage. Pinned literal for the test.
export const EAST_CROSS: RoadDef = { id: "east-cross", x: EAST_CROSS_X, z: 112, length: 40, horizontal: false };
// Junction of the hero street (z = ROAD_Z = 109) and the east cross street.
export const EAST_CROSS_JUNCTION: Vec2 = { x: EAST_CROSS_X, z: ROAD_Z };

// Office tower (Task 12 builds the geometry/colliders): a tall block fronting the
// east cross street, set back EAST of it so its lobby door faces the street (-x).
// Footprint only here (mirrored as a comment in rishonMap, but NOT added to
// CORE_MAP.buildings — World renders data buildings as generic boxes, so the real
// tower must come from its own builder, not the box path).
export const OFFICE = { x: 142, z: 100, w: 18, d: 16, h: 22 };
const OFFICE_WEST = OFFICE.x - OFFICE.w / 2;     // 133: street-facing (west) face
// Lobby door on the west face, ~1u clear of the solid wall, offset toward the
// junction end so the approach reads off the cross street.
export const OFFICE_DOOR: Vec2 = { x: OFFICE_WEST - 1.0, z: OFFICE.z + 2 };
// A waypoint just inside the lobby, the reception desk behind it, and a small
// arrival plaza out on the street side (where NPCs queue / the marker sits).
export const OFFICE_LOBBY: Vec2 = { x: OFFICE.x - OFFICE.w * 0.3, z: OFFICE.z + 1 };
export const OFFICE_DESK: Vec2 = { x: OFFICE.x, z: OFFICE.z - OFFICE.d * 0.28 };
export const OFFICE_PLAZA: Vec2 = { x: OFFICE_WEST - 3.5, z: OFFICE.z + 2 };

// Cafe (Task 9 builds the geometry): a small walk-in shell WEST of the bakery,
// extending the hero strip's storefront row. Its front face derives from SHOP_Z
// via shopFront() like the other promenade shells, so it lines up with the row.
export const CAFE = { x: 62, z: SHOP_Z, w: 12, d: 9, h: 6 };
const CAFE_FRONT = shopFront(CAFE.d);            // front (south) face on the strip
// Door offset to the +x side of the storefront (toward the bakery), clear of the
// solid wall; an inside waypoint and the service counter behind it.
export const CAFE_DOOR: Vec2 = { x: CAFE.x + CAFE.w * 0.26, z: CAFE_FRONT };
export const CAFE_INSIDE: Vec2 = { x: CAFE.x + 1.0, z: SHOP_Z + 1.0 };
export const CAFE_COUNTER: Vec2 = { x: CAFE.x - 0.6, z: SHOP_Z - 1.6 };
// Two small indoor cafe tables (south, near the entrance) and the chairs/seats
// derived from them — same drift-free pattern as INDOOR_TABLES so a chair always
// sits under every reachable seat. Tables straddle the door lane so a patron can
// still walk in. Built by cafeInterior; seats are reachable dwell targets.
export const CAFE_TABLES: Vec2[] = [
  { x: CAFE.x - 2.6, z: SHOP_Z + 2.4 },
  { x: CAFE.x + 2.6, z: SHOP_Z + 2.4 },
];
export const CAFE_CHAIR_DX = 0.95;
// Scripted cafe diners sit on the OUTER chairs (away from the table center toward
// the room edge); face the table along x.
export const CAFE_TABLE_SEATS: Seat[] = CAFE_TABLES.map((t) => {
  const outer = t.x < CAFE.x ? t.x - CAFE_CHAIR_DX : t.x + CAFE_CHAIR_DX;
  return { x: outer, z: t.z, faceYaw: t.x < CAFE.x ? Math.PI / 2 : -Math.PI / 2 };
});

// Pickup / delivery stand (existing landmark anchor).
export const PICKUP_STAND: Vec2 = { x: CX, z: ANCHOR_Z };

// Crosswalk center (player crosses the street here).
export const CROSSWALK: Vec2 = { x: CX, z: ROAD_Z };

// Sidewalk band centers used for pedestrian routes.
export const PATIO_WALK_Z = ANCHOR_Z + 2.0;            // 105: patio-side walking lane
export const FAR_WALK_Z = ROAD_Z + ROAD_W / 2 + 0.3 + FAR_WALK_D / 2; // far sidewalk

// The flat POI table consumed by the minimap legend + the interaction prompts is
// NOT declared here anymore. It is `POIS` in `locations.ts` (a projection of the
// `LOCATIONS` registry: the single source). This module only owns the raw
// coordinate ANCHORS above (RESTAURANT_DOOR, BAKERY_DOOR, ...) that the registry
// composes from.
//
// IMPORT-CYCLE NOTE: districtPois must NOT import any `locations` VALUE. The
// dependency runs one way only (locations -> districtPois for anchors + Vec2),
// which keeps both the older rishonMap -> districtPois -> roads -> rishonMap chain
// broken AND avoids a districtPois <-> locations init-order trap (locations
// reading these anchors while districtPois is still mid-initialisation).
