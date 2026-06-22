import type { Placement, Vec2 } from "./system/types";
import { lot, blockWalls } from "./layout";
import { airportPlacements } from "./airportMap";
import { suburbPlacements, suburbAnchors } from "./suburbMap";

// Large enough to hold the city core (origin), the EXPANDED airport to the north
// (embedded at z≈+260, its airfield now reaching city z≈+655), AND the big south
// district (z down to ≈-330). 1500 (=> ±750) covers both extremes.
export const GROUND_SIZE = 1500;

// The south residential district origin (opposite the northern airport).
const SUBURB_OX = 0, SUBURB_OZ = -210;
const HOME = suburbAnchors(SUBURB_OX, SUBURB_OZ);

// The player now wakes up AT HOME — on the entry walk of the hero mansion in the
// south district, with the drivable car parked on its driveway facing the avenue.
export const PLAYER_SPAWN: Vec2 = HOME.spawn;
export const CAR_SPAWN: Vec2 = HOME.carSpawn;
export const CAR_SPAWN_YAW = HOME.carYaw;           // face south, out toward the avenue

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

  // ── Airport approach: drive NORTH out of the city to Ben Gurion ──────────────
  // The x=0 arterial continues north as a clean wide road from the city edge
  // (z≈64) to the airport landside (drop-off at z≈138). The full airport sits
  // beyond, its glass facade facing back toward the city — a seamless drive-in.
  { kind: "airportRoad", x: 0, z: 101, rot: 90, params: { length: 90, width: 22, lanes: 4 } },
  ...[72, 92, 112, 130].flatMap((z): Placement[] => [
    { kind: "lamp", x: 14, z },
    { kind: "lamp", x: -14, z },
  ]),
  // Parking lots flanking the approach (instead of bare green).
  { kind: "parkingLot", x: -40, z: 108, rot: 0, params: { w: 40, d: 26, seed: 0x9a01, fill: 0.6 } },
  { kind: "parkingLot", x: 40, z: 108, rot: 0, params: { w: 40, d: 26, seed: 0x9a02, fill: 0.5 } },

  // ── The merged airport, offset to the north (its landside faces the city) ────
  ...airportPlacements(0, 260),

  // ── South connector expressway: city south edge (z≈-64) → district (z≈-114) ──
  // An airportRoad along z (rot 90) at x=0, mirroring the northbound airport drive.
  // The city south road ends at z=-64; the district's north avenue is at z=-114.
  // Centre the slab at z=-89, length=52 so it spans z∈[-115,-63] — flush joins both.
  { kind: "airportRoad", x: 0, z: -89, rot: 90,
    params: { length: 52, width: 16, lanes: 2 } },
  // Lamps along the connector (x=±10, every ~18 m).
  { kind: "lamp", x: 10,  z: -71 },
  { kind: "lamp", x: -10, z: -71 },
  { kind: "lamp", x: 10,  z: -89 },
  { kind: "lamp", x: -10, z: -89 },
  { kind: "lamp", x: 10,  z: -107 },
  { kind: "lamp", x: -10, z: -107 },

  // ── South residential district: ~70 homes on a road grid (opposite the airport) ─
  ...suburbPlacements(SUBURB_OX, SUBURB_OZ),

  // ── Every other cell: packed streetwall blocks ──────────────────────────────
  ...filledBlocks,

  // Traffic lights at the central junction corners (within ±4.5, clear of the
  // inner block walls whose fronts sit at ±4.5 from the junction).
  { kind: "trafficLight", x: 4, z: 4, rot: 0 },
  { kind: "trafficLight", x: -4, z: -4, rot: 180 },
  { kind: "trafficLight", x: 4, z: -4, rot: 270 },
  { kind: "trafficLight", x: -4, z: 4, rot: 90 },
];
