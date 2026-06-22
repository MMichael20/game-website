import type { Placement, Vec2 } from "./system/types";
import { lot, blockWalls } from "./layout";

export const GROUND_SIZE = 260;
// Player spawns on the south sidewalk just east of the central junction (clear of
// every block wall), in the dense core.
export const PLAYER_SPAWN: Vec2 = { x: 6, z: 3.8 };
// Car spawns in the RIGHT-HAND (eastbound) lane of the main-h road — south of the
// centerline (z=+1.5), facing east (+x) so you pull away driving on the right.
export const CAR_SPAWN: Vec2 = { x: 8, z: 1.5 };
export const CAR_SPAWN_YAW = Math.PI / 2;           // local +z (forward) -> +x (east)

// ── Dense city: pack every grid cell ────────────────────────────────────────
// A tight 4×4 block grid that fills the whole map. Roads at x,z ∈ {0, ±32, ±64};
// block cells centred at {-48,-16,16,48} on each axis (16 cells). EVERY cell is
// built up: the four inner cells hold the hero shops + a plaza, and the other
// twelve are wrapped in continuous streetwalls by `blockWalls` (four terraceRow
// streetwalls per block, exact-fit so they fill the block and never leak onto a
// lane). Wall span is 23 (< the 26m cell interior) so a ~1.5m sidewalk stays clear
// of the road. The result is a street-canyon city with no empty aprons.
const CELLS = [-48, -16, 16, 48];
const BLOCK = 23;                                   // wall span inside each 26m cell
const HERO_CELLS = new Set(["-16,-16", "16,-16", "-16,16"]); // phone, restaurant, plaza
const DISTRICTS = ["north", "east", "west"];

const filledBlocks: Placement[] = [];
let blockSeed = 200;
for (let ri = 0; ri < CELLS.length; ri++) {
  for (let ci = 0; ci < CELLS.length; ci++) {
    const cx = CELLS[ci], cz = CELLS[ri];
    if (HERO_CELLS.has(`${cx},${cz}`)) continue;     // special cells handled below
    filledBlocks.push(...blockWalls(cx, cz, BLOCK, DISTRICTS[(ri + ci) % 3], blockSeed));
    blockSeed += 7;
  }
}

// THE MAP. Reading this list is seeing the world. rot is degrees in {0,90,180,270}.
export const MAP: Placement[] = [
  { kind: "ground", params: { size: GROUND_SIZE } },
  // The street network: a tight grid at x,z ∈ {0, ±32, ±64}. The central H/V roads
  // are the painted core arterials (crosswalks, double-yellow, right-hand arrows).
  { kind: "cityGrid", x: 0, z: 0, params: { pitch: 32, half: 2, length: 128, seed: 1 } },
  // Pave the whole grid so the ground between buildings reads as city, not lawn.
  { kind: "pavement", x: 0, z: 0, params: { w: 128, d: 128 } },

  // ── Inner NW cell (-16,-16): phone-repair shop lot, facing the main-h road ──
  ...lot(
    { cell: { col: 0, row: 0 }, building: "phoneRepairShop",
      buildingParams: { w: 22, d: 16, h: 7 },
      props: [
        { kind: "lamp", x: -10, z: 9 },
        { kind: "lamp", x: 10, z: 9 },
        { kind: "bench", x: -7, z: 9 },
        { kind: "aFrameSign", x: 4.5, z: 9 },
        { kind: "planter", x: 7.5, z: 9 },
        { kind: "tree", x: -11, z: 10.5 },
        { kind: "tree", x: 11, z: 10.5 },
      ] },
    { originX: -16, originZ: -16, cellW: 8, cellD: 8 },
  ),
  // ── Inner NE cell (16,-16): restaurant lot, facing the main-h road ──────────
  ...lot({
    cell: { col: 0, row: 0 },
    building: "restaurant",
    buildingParams: { variant: "bakery", w: 22, d: 20, h: 8 },
    props: [
      { kind: "lamp", x: -12, z: 9 },
      { kind: "lamp", x: 12, z: 9 },
      { kind: "tree", x: -13, z: -9 },
      { kind: "tree", x: 13, z: -9 },
    ],
  }, { originX: 16, originZ: -18, cellW: 8, cellD: 8 }),

  // ── Inner SW cell (-16,16): a compact plaza (fountain + seating + kiosks) ────
  // The one open square in the dense core — used space, not an empty apron.
  { kind: "plaza", x: -16, z: 16, params: { w: 24, d: 22, seed: 5 } },

  // ── Airport expressway: drive EAST out of the city to the edge ───────────────
  // The main arterial (z=0) continues east as a long drivable road from the city
  // edge (x≈62) out to the airport terminal at the map's east edge (x≈118). Take
  // the highway, park, walk to the door, press E (city portal at x:108,z:0).
  { kind: "road", x: 90, z: 0, params: { length: 64 } },        // x ≈ 58..122 at z=0
  ...[64, 76, 88, 100].flatMap((x): Placement[] => [
    { kind: "lamp", x, z: 6 },
    { kind: "lamp", x, z: -6 },
  ]),
  // Roadside greenery so the outskirts read as a landscaped airport approach.
  ...[70, 94].flatMap((x): Placement[] => [
    { kind: "tree", x, z: 10 },
    { kind: "tree", x, z: -10 },
  ]),

  // ── Airport terminal entrance ("Terminal 3") on the EAST EDGE ────────────────
  // Open front (local +z) turned to face WEST toward the incoming road (rot:270);
  // its door lands at x≈108,z≈0. A forecourt apron, drop-off and signage frame it.
  { kind: "pavement", x: 100, z: 0, params: { w: 46, d: 60 } },
  { kind: "terminalHall", x: 118, z: 0, rot: 270, params: { w: 30, d: 20, h: 10, rearGap: 10 } },
  { kind: "airportMonument", x: 100, z: 14, rot: 270 },
  { kind: "curbCanopy", x: 104, z: -16, rot: 0, params: { w: 30, d: 10, label: "Departures" } },
  ...[90, 104].flatMap((x): Placement[] => [
    { kind: "palmTree", x, z: 12, params: { h: 7 } },
    { kind: "palmTree", x, z: -12, params: { h: 7 } },
  ]),
  { kind: "lamp", x: 110, z: 9 },
  { kind: "lamp", x: 110, z: -9 },
  { kind: "bench", x: 100, z: 6 },
  { kind: "bench", x: 100, z: -6 },
  // A couple of ground vehicles parked at the terminal forecourt.
  { kind: "apronVehicle", x: 96, z: 22, rot: 0, params: { variant: "stairs" } },
  { kind: "apronVehicle", x: 108, z: 22, rot: 0, params: { variant: "catering" } },

  // ── Every other cell: packed streetwall blocks ──────────────────────────────
  ...filledBlocks,

  // Traffic lights at the central junction corners (within ±4.5, clear of the
  // inner block walls whose fronts sit at ±4.5 from the junction).
  { kind: "trafficLight", x: 4, z: 4, rot: 0 },
  { kind: "trafficLight", x: -4, z: -4, rot: 180 },
  { kind: "trafficLight", x: 4, z: -4, rot: 270 },
  { kind: "trafficLight", x: -4, z: 4, rot: 90 },
];
