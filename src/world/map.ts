import type { Placement, Vec2 } from "./system/types";
import { lot } from "./layout";

export const GROUND_SIZE = 280;
export const PLAYER_SPAWN: Vec2 = { x: 8, z: 9 };   // sidewalk corner SE of the central junction
export const CAR_SPAWN: Vec2 = { x: 12, z: 2 };     // in the eastbound lane of the main-h road

// THE MAP. Reading this list is seeing the world. Coordinates are world-space;
// rot is degrees in {0,90,180,270}. Stores face +z by default (rot:0).
//
// World size: 280m. City grid: 5×5 arterials, pitch=56, half=2 (roads at
// x,z ∈ {±56,±112}). Core junction at origin; inner-ring block centres ±28;
// outer-ring block centres ±84. North edge bounded by a divided highway at z=-128.
//
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
  { kind: "cityGrid", x: 0, z: 0, params: { pitch: 56, half: 2, length: 260, seed: 1 } },
  // Pave the central blocks (paver stone, same as the sidewalks). Sits just above
  // the grass and below the road asphalt, so the city core reads paved, not lawn.
  { kind: "pavement", x: 0, z: 0, params: { w: 112, d: 112 } },
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

  // ── Outer building rows: one row per outer-ring block, facing inward ────────
  // The half=2 grid has blocks centred at ±84 (outer ring) and ±28 (inner ring).
  // Inner-ring blocks are occupied by the two stores, plaza, and terraceRow —
  // rows are ONLY placed in the outer-ring (±84) blocks.
  // Each row: units:3 ≈ 40.5m run, d:12, fits a 46.8m block with margin.

  // ── North band (z=-84): 4 rows facing the city (south, +z, rot:0) ──────────
  { kind: "buildingRow", x: -84, z: -84, rot: 0, params: { units: 3, d: 12, district: "north", anchor: "center", seed: 61 } },
  { kind: "buildingRow", x: -28, z: -84, rot: 0, params: { units: 3, d: 12, district: "north", anchor: "center", seed: 62 } },
  { kind: "buildingRow", x: 28,  z: -84, rot: 0, params: { units: 3, d: 12, district: "north", anchor: "center", seed: 63 } },
  { kind: "buildingRow", x: 84,  z: -84, rot: 0, params: { units: 3, d: 12, district: "north", anchor: "center", seed: 64 } },

  // ── South band (z=84): 4 rows facing the city (north, -z, rot:180) ──────────
  { kind: "buildingRow", x: -84, z: 84, rot: 180, params: { units: 3, d: 12, district: "east", anchor: "center", seed: 65 } },
  { kind: "buildingRow", x: -28, z: 84, rot: 180, params: { units: 3, d: 12, district: "east", anchor: "center", seed: 66 } },
  { kind: "buildingRow", x: 28,  z: 84, rot: 180, params: { units: 3, d: 12, district: "east", anchor: "center", seed: 67 } },
  { kind: "buildingRow", x: 84,  z: 84, rot: 180, params: { units: 3, d: 12, district: "east", anchor: "center", seed: 68 } },

  // ── West band (x=-84): 2 rows facing the city (east, +x, rot:90) ───────────
  { kind: "buildingRow", x: -84, z: -28, rot: 90, params: { units: 3, d: 12, district: "west", anchor: "center", seed: 71 } },
  { kind: "buildingRow", x: -84, z: 28,  rot: 90, params: { units: 3, d: 12, district: "west", anchor: "center", seed: 72 } },
  // ── East band (x=84): 2 rows facing the city (west, -x, rot:270) ───────────
  { kind: "buildingRow", x: 84,  z: -28, rot: 270, params: { units: 3, d: 12, district: "west", anchor: "center", seed: 73 } },
  { kind: "buildingRow", x: 84,  z: 28,  rot: 270, params: { units: 3, d: 12, district: "west", anchor: "center", seed: 74 } },

  // ── Highway: a divided multi-lane highway bounding the city to the north. ───
  // Half-width = medianW/2 + lanes*laneW + shoulderW = 2 + 7.2 + 1.2 = 10.4,
  // so at z=-128 it spans z ∈ [-138.4,-117.6] — inside the world edge (-140)
  // with a grass verge between it and the z=-112 arterial.
  { kind: "highway", x: 0, z: -128, rot: 0, params: { length: 260, lanes: 2, laneW: 3.6, medianW: 4, shoulderW: 1.2, gantry: true, seed: 1 } },

  // Business plaza filling the SW block: a landmark fountain ringed by benches,
  // planters, trees, lamps and two big vendor kiosks, on the central pavement.
  { kind: "plaza", x: -28, z: 28, params: { w: 36, d: 28, seed: 5 } },
  // A pair of loose vendor kiosks on the open paved strip south of the junction.
  { kind: "kioskCart", x: -14, z: 8, rot: 0, params: { canopyColor: 0x2e8b57 } },
  { kind: "kioskCart", x: -20, z: 8, rot: 0, params: { canopyColor: 0xc97b30 } },

  // Traffic lights at the central intersection corners (signal head faces -z by
  // default; rot turns each to face its approach).
  { kind: "trafficLight", x: 7, z: 7, rot: 0 },
  { kind: "trafficLight", x: -7, z: -7, rot: 180 },
  { kind: "trafficLight", x: 7, z: -7, rot: 270 },
  { kind: "trafficLight", x: -7, z: 7, rot: 90 },
];
