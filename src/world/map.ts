import type { Placement, Vec2 } from "./system/types";
import { lot } from "./layout";

export const GROUND_SIZE = 220;
export const PLAYER_SPAWN: Vec2 = { x: 0, z: 8 };
export const CAR_SPAWN: Vec2 = { x: 12, z: 10 };

// THE MAP. Reading this list is seeing the world. Coordinates are world-space;
// rot is degrees in {0,90,180,270}. Stores face +z by default (rot:0).
// Building footprints (for placing props clear of them):
//   phoneRepairShop @ x=-12, w=22 -> x in [-23,-1], front face z=-9 (origin z=-17).
//   restaurant      @ cell(2,-3)=world(16,-24), w=22 -> x in [5,27], front face z=-12.
// The road sits at z=-2 (z in [-5,1]); the sidewalk strip in FRONT of both stores
// is z in [-9,-5]. Both stores now own their full frontage as lot props (the phone
// shop's flat apron + stoop + lamps/bench/planter/sign/trees, the restaurant's
// raised deck), so the two frontages move with their buildings and no loose street
// props sit in front of either glass.
export const MAP: Placement[] = [
  { kind: "ground", params: { size: GROUND_SIZE } },
  { kind: "road", x: 0, z: -2, params: { length: 80 } },
  // phone-shop lot: the big blue showroom + its full street frontage, authored as
  // one move-together unit. Custom grid puts cell (0,0) exactly at the shop's world
  // spot; every prop is lot-local (+z = toward the street), clear of the centred
  // entry stoop (x in [-2.5,2.5]) and the door.
  ...lot(
    { cell: { col: 0, row: 0 }, building: "phoneRepairShop",
      buildingParams: { w: 22, d: 16, h: 7 },
      props: [
        { kind: "lamp", x: -10, z: 9 },    // left front corner
        { kind: "lamp", x: 10, z: 9 },     // right front corner
        { kind: "bench", x: -7, z: 9 },    // bench by the left lamp
        { kind: "aFrameSign", x: 4.5, z: 9 }, // sandwich board by the door
        { kind: "planter", x: 7.5, z: 9 }, // flower planter to the right of the door
        { kind: "tree", x: -11, z: 10.5 }, // street trees flanking the frontage
        { kind: "tree", x: 11, z: 10.5 },
      ] },
    { originX: -12, originZ: -17, cellW: 8, cellD: 8 },
  ),
  // restaurant lot: building + its OWN flanking lamps and corner trees, placed by
  // grid CELL (default 8m grid -> world (16,-24)). Move `cell` and all 5 follow.
  // Props are in lot-local coords: +z = toward the street, x = across the front.
  ...lot({
    cell: { col: 2, row: -3 },
    building: "restaurant",
    buildingParams: { variant: "bakery", w: 22, d: 24, h: 8 },
    props: [
      { kind: "lamp", x: -12, z: 10 },   // flanks entrance, left corner
      { kind: "lamp", x: 12, z: 10 },    // flanks entrance, right corner
      { kind: "tree", x: -14, z: -10 },  // back-left corner
      { kind: "tree", x: 14, z: -10 },   // back-right corner
    ],
  }),
  // A little loose furniture in the GAP between the two stores — the phone apron
  // ends at world x=1 and the restaurant deck starts at ~x=4.7, so these sit clear
  // of both. Independent of either lot, so they stay raw lines.
  { kind: "flower", x: 2.5, z: -7, params: { color: "red" } },
  { kind: "flower", x: 3.6, z: -7, params: { color: "yellow" } },

  // ── Filler backdrop ──────────────────────────────────────────────────────
  // North streetwall: masonry blocks flanking the two real stores, on the
  // building line (front face +z ≈ z=-9), so the street reads as continuous.
  { kind: "fillerBuilding", x: -34, z: -16, params: { w: 12, d: 10, stories: 3, bodyColor: 0xe07a5f, ground: "storefront", awningColor: 0xc0392b, seed: 11 } },
  { kind: "fillerBuilding", x: -47, z: -16, params: { w: 11, d: 10, stories: 4, bodyColor: 0xe9c46a, seed: 12 } },
  { kind: "fillerBuilding", x: 39, z: -17, params: { w: 12, d: 11, stories: 3, bodyColor: 0x84b06a, ground: "storefront", awningColor: 0x2980b9, seed: 13 } },
  { kind: "fillerBuilding", x: 52, z: -17, params: { w: 11, d: 11, stories: 4, bodyColor: 0xc98ab0, seed: 14 } },

  // Skyline towers: tall cool glass blocks set well back as a backdrop.
  { kind: "fillerBuilding", x: -30, z: -44, params: { w: 14, d: 14, stories: 7, style: "glassTower", bodyColor: 0x6aa9c9, roofUnit: false, seed: 21 } },
  { kind: "fillerBuilding", x: 0, z: -48, params: { w: 16, d: 16, stories: 8, style: "glassTower", bodyColor: 0x7fb5d6, roofUnit: false, seed: 22 } },
  { kind: "fillerBuilding", x: 32, z: -44, params: { w: 14, d: 14, stories: 6, style: "glassTower", bodyColor: 0x9ac6e0, roofUnit: false, seed: 23 } },

  // South streetwall: a couple of blocks across the road, facing -z (rot 180),
  // set back behind the spawn corridor.
  { kind: "fillerBuilding", x: -50, z: 26, rot: 180, params: { w: 12, d: 10, stories: 3, bodyColor: 0xf2c14e, seed: 31 } },
  { kind: "fillerBuilding", x: 45, z: 26, rot: 180, params: { w: 12, d: 10, stories: 4, bodyColor: 0xd96c5f, ground: "storefront", awningColor: 0xc0392b, seed: 32 } },

  // Park plaza: south-west, clear of the (0,8)/(12,10) spawn corridor.
  { kind: "park", x: -30, z: 18, params: { w: 26, d: 20, fountain: true, seed: 5 } },
];
