import type { Placement, Vec2 } from "./system/types";
import { lot } from "./layout";

export const GROUND_SIZE = 220;
export const PLAYER_SPAWN: Vec2 = { x: 8, z: 9 };   // sidewalk corner SE of the central junction
export const CAR_SPAWN: Vec2 = { x: 12, z: 2 };     // in the eastbound lane of the main-h road

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
  // The whole street network: a connected grid of roads with paver sidewalks,
  // curbs, crosswalks, double-yellow, stop bars and lane arrows at the central
  // junction. Roads at x,z in {-56, 0, 56}; the gap between the two hero shops is
  // the central cross-v street.
  { kind: "cityGrid", x: 0, z: 0, params: { pitch: 56, half: 1, length: 140, seed: 1 } },
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
    { originX: -22, originZ: -17, cellW: 8, cellD: 8 },
  ),
  // restaurant lot: building + its OWN flanking lamps and corner trees, placed by
  // grid CELL (default 8m grid -> world (16,-24)). Move `cell` and all 5 follow.
  // Props are in lot-local coords: +z = toward the street, x = across the front.
  ...lot({
    cell: { col: 0, row: 0 },
    building: "restaurant",
    buildingParams: { variant: "bakery", w: 22, d: 24, h: 8 },
    props: [
      { kind: "lamp", x: -12, z: 10 },   // flanks entrance, left corner
      { kind: "lamp", x: 12, z: 10 },    // flanks entrance, right corner
      { kind: "tree", x: -14, z: -10 },  // back-left corner
      { kind: "tree", x: 14, z: -10 },   // back-right corner
    ],
  }, { originX: 22, originZ: -21, cellW: 8, cellD: 8 }),

  // ── City blocks ───────────────────────────────────────────────────────────
  // Connected streetwalls on the block edges (kept ≥6m off every road centerline).
  // SE block: faces the main-h road from the south (rot 180).
  { kind: "terraceRow", x: 28, z: 12, rot: 180, params: { units: 3, d: 11, district: "east", anchor: "center", seed: 41 } },
  // SW-south: faces the z=56 road.
  { kind: "terraceRow", x: -28, z: 45, params: { units: 3, d: 11, district: "west", anchor: "center", seed: 43 } },

  // North skyline backdrop: freestanding glass towers beyond the z=-56 road,
  // spread in x and clear of the vertical-road corridors.
  { kind: "fillerBuilding", x: -40, z: -68, params: { w: 14, d: 14, stories: 7, style: "glassTower", bodyColor: 0x6aa9c9, roofUnit: false, seed: 21 } },
  { kind: "fillerBuilding", x: -14, z: -72, params: { w: 16, d: 16, stories: 9, style: "darkGlass", bodyColor: 0x1d3b44, roofUnit: false, seed: 22 } },
  { kind: "fillerBuilding", x: 12, z: -70, params: { w: 14, d: 14, stories: 6, style: "glassTower", bodyColor: 0x9ac6e0, roofUnit: false, seed: 23 } },
  { kind: "fillerBuilding", x: 38, z: -68, params: { w: 13, d: 13, stories: 8, style: "darkGlass", bodyColor: 0x223f49, roofUnit: false, seed: 24 } },

  // Park plaza on the SW block.
  { kind: "park", x: -28, z: 28, params: { w: 26, d: 20, fountain: true, seed: 5 } },

  // Traffic lights at the central intersection corners (signal head faces -z by
  // default; rot turns each to face its approach).
  { kind: "trafficLight", x: 7, z: 7, rot: 0 },
  { kind: "trafficLight", x: -7, z: -7, rot: 180 },
  { kind: "trafficLight", x: 7, z: -7, rot: 270 },
  { kind: "trafficLight", x: -7, z: 7, rot: 90 },
];
