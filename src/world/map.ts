import type { Placement, Vec2 } from "./system/types";

export const GROUND_SIZE = 220;
export const PLAYER_SPAWN: Vec2 = { x: 0, z: 8 };
export const CAR_SPAWN: Vec2 = { x: 12, z: 10 };

// THE MAP. Reading this list is seeing the world. Coordinates are world-space;
// rot is degrees in {0,90,180,270}. Stores face +z by default (rot:0).
// Building footprints (for placing props clear of them):
//   phoneRepairShop @ x=-12, w=18 -> x in [-21,-3], front face z=-9.
//   restaurant      @ x=12,  w=12 -> x in [ 6,18], front face z=-11.
// The road sits at z=-2 (z in [-5,1]); the sidewalk strip in FRONT of both stores
// is z in [-9,-5]. Street props live at z=-7 — in front of the glass, clear of
// every building body (z=-7 is south of both front faces) and of the road.
export const MAP: Placement[] = [
  { kind: "ground", params: { size: GROUND_SIZE } },
  { kind: "road", x: 0, z: -2, params: { length: 80 } },
  { kind: "phoneRepairShop", x: -12, z: -16 },
  { kind: "restaurant", x: 12, z: -16, params: { variant: "bakery" } },
  // street furniture along the sidewalk (z=-7), spread so nothing overlaps:
  { kind: "lamp", x: -16, z: -7 },
  { kind: "bench", x: -8, z: -7 },
  { kind: "planter", x: 2, z: -7 },
  { kind: "flower", x: 4, z: -7, params: { color: "red" } },
  { kind: "lamp", x: 12, z: -7 },
  { kind: "tree", x: 22, z: -7 },
];
