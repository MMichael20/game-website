import type { Placement, Vec2 } from "./system/types";
import { lot } from "./layout";

export const GROUND_SIZE = 140;
export const PLAYER_SPAWN: Vec2 = { x: 8, z: 6 };   // sidewalk corner SE of the central junction
export const CAR_SPAWN: Vec2 = { x: 12, z: 2 };     // in the eastbound lane of the main-h road

// THE MAP. Reading this list is seeing the world. Coordinates are world-space;
// rot is degrees in {0,90,180,270}. Stores face +z by default (rot:0).
//
// COMPACT CITY (re-plan 2026-06-22). World size: 140m (spans ±70). A single tight
// ring: one core grid of 4 blocks around the central junction holds all the
// playable content; the tall multi-storey "storeys" ring the perimeter on three
// sides; the divided highway forms the north edge.
//   Core grid: half=1, pitch=44 -> roads at x,z ∈ {0, ±44}. Core blocks ~40m,
//     centred at (±22, ±22). Central junction at origin (main-h z=0, cross-v x=0).
//   Core blocks: NW phoneRepairShop, NE restaurant, SW plaza, SE terraceRow.
//   Perimeter storeys: tall buildingRows at the ±56 bands (S/E/W), facing inward.
//   North edge: divided highway at z=-56, just behind the hero shops.
//
// Building footprints (for placing props clear of them):
//   phoneRepairShop lot @ originX=-22 -> body x in [-33,-11], front face z=-9.
//   restaurant      lot @ originX=22  -> body x in [11,33],   front face z=-9.
// The main-h road sits at z=0 (z in [-2,2]); both hero shops sit in the north
// blocks facing south onto it. Both stores own their full frontage as lot props,
// so the two frontages move with their buildings.
export const MAP: Placement[] = [
  { kind: "ground", params: { size: GROUND_SIZE } },
  // The street network: a tight grid with paver sidewalks, curbs, crosswalks,
  // double-yellow, stop bars and lane arrows at the central junction. Roads at
  // x,z in {0, ±44}; the gap between the two hero shops is the central cross-v.
  { kind: "cityGrid", x: 0, z: 0, params: { pitch: 44, half: 1, length: 124, seed: 1 } },
  // Pave the core blocks (paver stone, same as the sidewalks). Covers the ±44
  // core so the city centre reads paved, not lawn.
  { kind: "pavement", x: 0, z: 0, params: { w: 88, d: 88 } },
  // phone-shop lot (NW block): the big blue showroom + its full street frontage,
  // authored as one move-together unit. Cell (0,0) sits at the shop's world spot;
  // every prop is lot-local (+z = toward the street), clear of the centred entry
  // stoop (x in [-2.5,2.5]) and the door.
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
  // restaurant lot (NE block): building + its OWN flanking lamps and corner trees.
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

  // ── SW block: business plaza ────────────────────────────────────────────────
  // A landmark fountain ringed by benches, planters, trees, lamps and two big
  // vendor kiosks, on the central pavement. Footprint x∈[-40,-4], z∈[8,36].
  { kind: "plaza", x: -22, z: 22, params: { w: 36, d: 28, seed: 5 } },

  // ── SE block: terrace of shops ──────────────────────────────────────────────
  // A continuous streetwall facing north (rot 180) onto the main-h road. units:2
  // (run ≤ ~28m) so its ends stay clear of the cross-v road and the x=44 road —
  // units:3 ran wide enough to poke a corner into the cross-v lane by the junction.
  { kind: "terraceRow", x: 22, z: 14, rot: 180, params: { units: 2, d: 11, district: "east", anchor: "center", seed: 41 } },

  // A pair of loose vendor kiosks on the paved strip just south of the junction,
  // north of the plaza.
  { kind: "kioskCart", x: -14, z: 5, rot: 0, params: { canopyColor: 0x2e8b57 } },
  { kind: "kioskCart", x: -20, z: 5, rot: 0, params: { canopyColor: 0xc97b30 } },

  // ── Perimeter storeys: tall building rows ringing the edge, facing inward ────
  // Rows sit at block-centre x/z (±22) so they straddle neither the x=0/z=0
  // arterials nor the ±44 ring roads — the outbound streets run between them.
  // Each row: units:2 (run ≤ ~31m), d:12 — sized to fit between the x=0/±44 roads
  // so no row leaks onto a lane. Fronts ~±50, backs ±62, inside the ±70 edge.

  // South band (z=56): faces north (-z, rot:180).
  { kind: "buildingRow", x: -22, z: 56, rot: 180, params: { units: 2, d: 12, district: "east", anchor: "center", seed: 61 } },
  { kind: "buildingRow", x: 22,  z: 56, rot: 180, params: { units: 2, d: 12, district: "east", anchor: "center", seed: 62 } },
  // West band (x=-56): faces east (+x, rot:90).
  { kind: "buildingRow", x: -56, z: -22, rot: 90, params: { units: 2, d: 12, district: "west", anchor: "center", seed: 71 } },
  { kind: "buildingRow", x: -56, z: 22,  rot: 90, params: { units: 2, d: 12, district: "west", anchor: "center", seed: 72 } },
  // East band (x=56): faces west (-x, rot:270).
  { kind: "buildingRow", x: 56,  z: -22, rot: 270, params: { units: 2, d: 12, district: "north", anchor: "center", seed: 73 } },
  { kind: "buildingRow", x: 56,  z: 22,  rot: 270, params: { units: 2, d: 12, district: "north", anchor: "center", seed: 74 } },

  // ── North edge: a divided multi-lane highway, just behind the hero shops. ────
  // Half-width = medianW/2 + lanes*laneW + shoulderW = 2 + 7.2 + 1.2 = 10.4, so at
  // z=-56 it spans z ∈ [-66.4,-45.6] — inside the world edge (-70), ~9m behind the
  // shops (backs at z=-33).
  { kind: "highway", x: 0, z: -56, rot: 0, params: { length: 124, lanes: 2, laneW: 3.6, medianW: 4, shoulderW: 1.2, gantry: true, seed: 1 } },

  // Traffic lights at the central intersection corners (signal head faces -z by
  // default; rot turns each to face its approach).
  { kind: "trafficLight", x: 7, z: 7, rot: 0 },
  { kind: "trafficLight", x: -7, z: -7, rot: 180 },
  { kind: "trafficLight", x: 7, z: -7, rot: 270 },
  { kind: "trafficLight", x: -7, z: 7, rot: 90 },
];
