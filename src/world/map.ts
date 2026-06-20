import type { Placement, Vec2 } from "./system/types";
import { lot } from "./layout";

export const GROUND_SIZE = 220;
export const PLAYER_SPAWN: Vec2 = { x: 0, z: 8 };
export const CAR_SPAWN: Vec2 = { x: 12, z: 10 };

// THE MAP. Reading this list is seeing the world. Coordinates are world-space;
// rot is degrees in {0,90,180,270}. Stores face +z by default (rot:0).
// Building footprints (for placing props clear of them):
//   phoneRepairShop @ x=-12, w=18 -> x in [-21,-3], front face z=-9.
//   restaurant      @ x=14,  w=22 -> x in [ 3,25], front face z=-8.
// The road sits at z=-2 (z in [-5,1]); the sidewalk strip in FRONT of both stores
// is z in [-9,-5]. Street props live at z=-7 — in front of the glass, clear of
// every building body (z=-7 is south of both front faces) and of the road.
// NOTE: the restaurant has its own raised deck (steps + railing + planters +
// lanterns) that fills the sidewalk in front of it (world x in ~[2.7,25.3],
// z in [-8,-6]). Keep loose street props out of that strip — they belong in
// front of the phone shop (x in [-21,-3]) or in the gap between the two.
export const MAP: Placement[] = [
  { kind: "ground", params: { size: GROUND_SIZE } },
  { kind: "road", x: 0, z: -2, params: { length: 80 } },
  // phone-shop lot: building + its west lamp, authored as one move-together unit.
  // Custom grid puts cell (0,0) exactly at the shop's world spot; lamp is lot-local.
  ...lot(
    { cell: { col: 0, row: 0 }, building: "phoneRepairShop",
      props: [{ kind: "lamp", x: -4, z: 9 }] },
    { originX: -12, originZ: -16, cellW: 8, cellD: 8 },
  ),
  { kind: "restaurant", x: 14, z: -20, params: { variant: "bakery", w: 22, d: 24, h: 8 } },
  // street furniture along the sidewalk (z=-7), clear of the restaurant deck:
  { kind: "lamp", x: -12, z: -7 },
  { kind: "bench", x: -8, z: -7 },
  { kind: "flower", x: -4, z: -7, params: { color: "red" } },
  { kind: "planter", x: 0, z: -7 },
];
