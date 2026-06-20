import type { Placement, Vec2 } from "./system/types";

export const GROUND_SIZE = 220;
export const PLAYER_SPAWN: Vec2 = { x: 0, z: 8 };
export const CAR_SPAWN: Vec2 = { x: 12, z: 10 };

// THE MAP. Reading this list is seeing the world. Coordinates are world-space;
// rot is degrees in {0,90,180,270}. Stores face +z by default (rot:0).
export const MAP: Placement[] = [
  { kind: "ground", params: { size: GROUND_SIZE } },
  { kind: "road", x: 0, z: -6, params: { length: 80 } },
  { kind: "phoneRepairShop", x: -12, z: -16 },
  { kind: "restaurant", x: 12, z: -16, params: { variant: "bakery" } },
  { kind: "tree", x: 24, z: -10 },
  { kind: "lamp", x: 6, z: -11 },
  { kind: "lamp", x: -6, z: -11 },
  { kind: "planter", x: 0, z: -12 },
  { kind: "bench", x: 18, z: -11 },
  { kind: "flower", x: 1, z: -12, params: { color: "red" } },
];
