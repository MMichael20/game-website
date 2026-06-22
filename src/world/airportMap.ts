// Ben Gurion ("Natbag") international airport — the second world.
//
// Axis convention: +z = AIRSIDE (north), -z = LANDSIDE (south). The player fades
// in at the south curb (spawn) facing +z and walks north: forecourt -> terminal
// departures hall -> concourse -> gates -> apron with parked jets, ground
// vehicles, a control tower and runways across the far north.
//
// The terminal hall's open entrance (its local +z front) is turned to face south
// (rot:180) so you walk straight in from the curb; its rear doorway then opens
// north into the concourse.
//
// 2026-06-22: huge wide terminal with an OPAQUE facade (interior is discovered on
// entry), a bold-blue glazed roof, a full-width white drop-off canopy, and a
// multi-lane access road running right across the landside.

import type { MapDescriptor, Placement } from "./system/types";

const GROUND = 360;

// Aircraft stand x-positions — 52 m pitch so the ~40 m-wingspan jets clear their
// wingtips (the old 30 m pitch overlapped them, the "crammed" look).
const STAND_X = [-78, -26, 26, 78];
// Push the whole airside (gates -> bridges -> stands -> apron -> tower -> runway)
// this far north of its old position, opening a deep apron clear of the terminal.
const AIRSIDE_N = 18;

// ── Landside spawn / portal anchors ─────────────────────────────────────────
const SPAWN = { x: 0, z: -134 };

const map: Placement[] = [
  // ── Ground + big paved slabs ───────────────────────────────────────────────
  { kind: "ground", params: { size: GROUND } },
  { kind: "pavement", x: 0, z: -84, params: { w: 280, d: 168 } },
  { kind: "pavement", x: 0, z: 55, params: { w: 260, d: 150 } },

  // ── LANDSIDE access road (pushed south to open a deep forecourt plaza) ─────
  { kind: "airportRoad", x: 0, z: -150, rot: 0, params: { length: 250, width: 26, lanes: 6 } },

  // ── Drop-off curb canopy (full width, white, amber signage) ────────────────
  { kind: "curbCanopy", x: 0, z: -100, rot: 0, params: { w: 210, d: 14, label: "Departures" } },

  // Hung wayfinding under the canopy.
  ...[-70, -23, 24, 71].map((x, i): Placement => ({
    kind: "wayfindingSign", x, z: -98, rot: 0,
    params: { text: ["ARRIVALS", "DEPARTURES", "DEPARTURES", "TAXI"][i], style: i === 1 || i === 2 ? "blue" : "amber", w: 5, arrow: i === 3, alt: 4.2 },
  })),

  // Israeli-flag monument + the return portal off to the east side.
  { kind: "airportMonument", x: 90, z: -100, rot: 0 },

  // Palm rows + hedges framing the forecourt (kept off the building footprint).
  ...[-130, -118, 118, 130].flatMap((x): Placement[] => [
    { kind: "palmTree", x, z: -100, params: { h: 6 } },
    { kind: "palmTree", x, z: -60, params: { h: 6 } },
  ]),
  // Parking lots flanking the drop-off (instead of green blocks).
  { kind: "parkingLot", x: -150, z: -70, rot: 0, params: { w: 48, d: 56, seed: 0x9a11, fill: 0.55 } },
  { kind: "parkingLot", x: 150, z: -70, rot: 0, params: { w: 48, d: 56, seed: 0x9a12, fill: 0.5 } },

  // Forecourt floodlights at the corners (by the relocated curb).
  { kind: "floodlightMast", x: -125, z: -146, params: { h: 18 } },
  { kind: "floodlightMast", x: 125, z: -146, params: { h: 18 } },

  // Curbside vehicles + luggage near the doors.
  { kind: "airportTaxi", x: -30, z: -110, rot: 90, params: { color: 0xf2c21e } },
  { kind: "airportTaxi", x: 8, z: -110, rot: 90, params: { color: 0xcf3a2c } },
  { kind: "airportTaxi", x: 44, z: -110, rot: 90, params: { color: 0xf2c21e } },
  { kind: "baggageTrolley", x: -40, z: -96, rot: 0, params: { bags: 4, seed: 0x7711 } },
  { kind: "luggagePile", x: 40, z: -96, rot: 0, params: { count: 7, seed: 0xba911 } },
  { kind: "bench", x: -16, z: -96 },
  { kind: "bench", x: 16, z: -96 },
  { kind: "pottedPlant", x: -10, z: -94, params: { h: 2.0 } },
  { kind: "pottedPlant", x: 10, z: -94, params: { h: 2.0 } },
  { kind: "trashBin", x: -24, z: -94 },
  { kind: "infoDesk", x: 26, z: -94 },

  // ── FORECOURT PLAZA (landscaped garden between the curb and the terminal) ──
  // A formal voxel plaza matching the reference render: a tiered fountain
  // centerpiece, hedge planter beds dotted with red/white flowers, palm allees,
  // yellow-band bollard edging, nested luggage carts and lamps. A clear central
  // walking corridor (|x| < 9) runs from the curb to the terminal doors.
  { kind: "grandFountain", x: 0, z: -122, params: { r: 5, seed: 0x0a17 } },

  // Clipped-hedge planter beds in a symmetric grid flanking the fountain.
  ...[-1, 1].flatMap((s): Placement[] => [
    { kind: "hedgeRow", x: s * 30, z: -130, params: { len: 12, h: 1.0, seed: 0xbed1 } },
    { kind: "hedgeRow", x: s * 55, z: -130, params: { len: 12, h: 1.0, seed: 0xbed2 } },
    { kind: "hedgeRow", x: s * 30, z: -114, params: { len: 12, h: 1.0, seed: 0xbed3 } },
    { kind: "hedgeRow", x: s * 55, z: -114, params: { len: 12, h: 1.0, seed: 0xbed4 } },
  ]),

  // Red / white flower dots in front of the beds.
  ...[-1, 1].flatMap((s): Placement[] => [
    { kind: "flower", x: s * 24, z: -126, params: { color: "white", height: 0.38 } },
    { kind: "flower", x: s * 30, z: -126, params: { color: "red", height: 0.40 } },
    { kind: "flower", x: s * 36, z: -126, params: { color: "white", height: 0.38 } },
    { kind: "flower", x: s * 49, z: -110, params: { color: "red", height: 0.38 } },
    { kind: "flower", x: s * 55, z: -110, params: { color: "white", height: 0.40 } },
    { kind: "flower", x: s * 61, z: -110, params: { color: "red", height: 0.38 } },
  ]),

  // Palm allees flanking the central walk and the plaza edges.
  ...[-1, 1].flatMap((s): Placement[] => [
    { kind: "palmTree", x: s * 12, z: -118, params: { h: 6 } },
    { kind: "palmTree", x: s * 12, z: -130, params: { h: 6 } },
    { kind: "palmTree", x: s * 70, z: -115, params: { h: 7 } },
    { kind: "palmTree", x: s * 70, z: -132, params: { h: 7 } },
  ]),

  // Yellow-band bollards: a curb run flanking the entrance + central-walk edging.
  { kind: "bollardRow", x: -38, z: -136, rot: 0, params: { len: 44, gap: 3, h: 1.0 } },
  { kind: "bollardRow", x: 38, z: -136, rot: 0, params: { len: 44, gap: 3, h: 1.0 } },
  ...[-1, 1].map((s): Placement => ({
    kind: "bollardRow", x: s * 16, z: -122, rot: 90, params: { len: 28, gap: 3, h: 1.0 },
  })),

  // Nested luggage-cart trains near the canopy.
  { kind: "baggageCartTrain", x: -62, z: -110, rot: 0, params: { carts: 5, seed: 0xca41 } },
  { kind: "baggageCartTrain", x: 62, z: -110, rot: 0, params: { carts: 5, seed: 0xca42 } },

  // Plaza lamps + inward-facing benches + entrance planters.
  ...[-1, 1].flatMap((s): Placement[] => [
    { kind: "lamp", x: s * 42, z: -122 },
    { kind: "lamp", x: s * 66, z: -132 },
  ]),
  { kind: "bench", x: -20, z: -122, rot: 90 },
  { kind: "bench", x: 20, z: -122, rot: 270 },
  { kind: "pottedPlant", x: -12, z: -136, params: { h: 2.2 } },
  { kind: "pottedPlant", x: 12, z: -136, params: { h: 2.2 } },

  // ── TERMINAL HALL (hero) — huge, wide, see-through glass facade ────────────
  { kind: "terminalHall", x: 0, z: -60, rot: 180, params: { w: 220, d: 60, h: 20, rearGap: 24, roofRidge: 14, roofSteps: 7 } },

  // Big ceiling-hung amber departure boards inside, over the check-in.
  { kind: "flightBoard", x: -26, z: -52, rot: 180, params: { w: 13, h: 4.0, rows: 10, hung: true, alt: 16.5 } },
  { kind: "flightBoard", x: 26, z: -52, rot: 180, params: { w: 13, h: 4.0, rows: 10, hung: true, alt: 16.5 } },

  // Four NUMBERED check-in islands.
  ...[
    { x: -48, no: 1 }, { x: -16, no: 5 }, { x: 16, no: 9 }, { x: 48, no: 13 },
  ].map((c): Placement => ({
    kind: "checkInIsland", x: c.x, z: -64, rot: 180, params: { len: 14, desks: 4, startNo: c.no },
  })),

  // Self-service kiosk clusters + queue belts.
  { kind: "selfCheckinKiosk", x: -30, z: -74, rot: 180, params: { count: 5 } },
  { kind: "selfCheckinKiosk", x: 30, z: -74, rot: 180, params: { count: 5 } },
  { kind: "queueLane", x: 0, z: -72, rot: 0, params: { w: 18, d: 6, rows: 3 } },

  // Central duty-free rotunda.
  { kind: "dutyFreeRotunda", x: 0, z: -50, params: { r: 10 } },

  // Side-wall retail (warm wooden duty-free).
  { kind: "dutyFreeShop", x: -96, z: -74, rot: 90, params: { w: 10, d: 8, name: "Perfume & Co", accent: 0x9b2d6f, warm: true } },
  { kind: "dutyFreeShop", x: 96, z: -74, rot: 270, params: { w: 10, d: 8, name: "TechWorld", accent: 0x2980b9 } },
  { kind: "dutyFreeShop", x: -96, z: -46, rot: 90, params: { w: 10, d: 8, name: "Sabra Gifts", accent: 0x1f7a4d, warm: true } },
  { kind: "dutyFreeShop", x: 96, z: -46, rot: 270, params: { w: 10, d: 8, name: "Last Minute", accent: 0xd9533b, warm: true } },

  // Escalators flanking the rotunda.
  { kind: "escalator", x: -18, z: -44, rot: 0, params: { rise: 4, run: 7 } },
  { kind: "escalator", x: 18, z: -44, rot: 180, params: { rise: 4, run: 7 } },

  // Seating (bold red/blue) + dressing in the hall.
  { kind: "airportSeating", x: -10, z: -80, rot: 0, params: { seats: 6, scheme: "redblue" } },
  { kind: "airportSeating", x: 10, z: -80, rot: 180, params: { seats: 6, scheme: "redblue" } },
  { kind: "pottedPlant", x: -90, z: -82, params: { h: 2.4 } },
  { kind: "pottedPlant", x: 90, z: -82, params: { h: 2.4 } },
  { kind: "waterFountain", x: -90, z: -58, rot: 90 },
  { kind: "atmKiosk", x: 90, z: -58, rot: 270 },
  { kind: "luggagePile", x: -36, z: -56, rot: 0, params: { count: 6, seed: 0xba922 } },
  { kind: "luggagePile", x: 36, z: -56, rot: 0, params: { count: 5, seed: 0xba933 } },
  { kind: "baggageTrolley", x: 0, z: -80, rot: 0, params: { bags: 3, seed: 0x7722 } },

  // Overhead wayfinding inside the hall.
  { kind: "wayfindingSign", x: -8, z: -42, rot: 180, params: { text: "SECURITY", style: "blue", w: 5, alt: 13.0 } },
  { kind: "wayfindingSign", x: 8, z: -42, rot: 180, params: { text: "GATES", style: "amber", w: 5, alt: 13.0 } },

  // Security checkpoint at the concourse doorway.
  { kind: "securityLane", x: 0, z: -36, rot: 0, params: { lanes: 4 } },

  // ── CONCOURSE (north of the terminal) ──────────────────────────────────────
  { kind: "baggageCarousel", x: -34, z: -16, rot: 0, params: { rx: 6, rz: 3 } },
  { kind: "baggageCarousel", x: 34, z: -16, rot: 0, params: { rx: 6, rz: 3 } },
  { kind: "dutyFreeShop", x: -40, z: -26, rot: 90, params: { w: 10, d: 8, name: "Cafe Aroma", accent: 0x8a5a2b, warm: true } },
  { kind: "dutyFreeShop", x: 40, z: -26, rot: 270, params: { w: 10, d: 8, name: "News & Books", accent: 0x355e9b } },
  { kind: "flightBoard", x: 0, z: -28, rot: 0, params: { w: 11, h: 3.6, rows: 9, hung: true, alt: 9.5 } },
  ...[-12, 0, 12].map((x): Placement => ({ kind: "airportSeating", x, z: -8, rot: 0, params: { seats: 8, scheme: "redblue" } })),
  ...[-12, 0, 12].map((x): Placement => ({ kind: "airportSeating", x, z: -2, rot: 180, params: { seats: 8, scheme: "redblue" } })),
  { kind: "pottedPlant", x: -24, z: -2, params: { h: 2.4 } },
  { kind: "pottedPlant", x: 24, z: -2, params: { h: 2.4 } },

  // ── GATES ──────────────────────────────────────────────────────────────────
  ...[
    { gate: "B1", route: "TLV - LHR" },
    { gate: "B3", route: "TLV - JFK" },
    { gate: "B5", route: "TLV - CDG" },
    { gate: "B7", route: "TLV - DXB" },
  ].map((g, i): Placement => ({
    kind: "gateLounge", x: STAND_X[i], z: 16 + AIRSIDE_N, rot: 0, params: { w: 18, d: 14, gate: g.gate, route: g.route },
  })),
  ...STAND_X.map((x): Placement => ({ kind: "jetBridge", x: x + 6, z: 26 + AIRSIDE_N, rot: 90, params: { len: 18 } })),

  // ── AIRSIDE (apron) — roomy stands pushed north, jets spaced wingtip-clear ──
  ...STAND_X.map((x): Placement => ({ kind: "apron", x, z: 58 + AIRSIDE_N, rot: 0, params: { w: 48, d: 44, stand: "B" } })),
  ...[
    { livery: 0xffffff, belly: 0x0038b8, tail: 0x0038b8, reg: "4X-EKA" },
    { livery: 0xffffff, belly: 0x0038b8, tail: 0x0038b8, reg: "4X-EKB" },
    { livery: 0xf2f2f2, belly: 0xb5402f, tail: 0xb5402f, reg: "4X-ABF" },
    { livery: 0xffffff, belly: 0x1f7a4d, tail: 0x1f7a4d, reg: "4X-ECC" },
  ].map((a, i): Placement => ({
    kind: "airliner", x: STAND_X[i], z: 64 + AIRSIDE_N, rot: 90,
    params: { livery: a.livery, belly: a.belly, tail: a.tail, reg: a.reg },
  })),

  { kind: "apronVehicle", x: -84, z: 48 + AIRSIDE_N, rot: 0, params: { variant: "tug" } },
  { kind: "apronVehicle", x: -32, z: 48 + AIRSIDE_N, rot: 0, params: { variant: "fuel" } },
  { kind: "apronVehicle", x: 20, z: 48 + AIRSIDE_N, rot: 0, params: { variant: "pushback" } },
  { kind: "apronVehicle", x: 72, z: 48 + AIRSIDE_N, rot: 0, params: { variant: "stairs" } },
  { kind: "apronVehicle", x: -52, z: 80 + AIRSIDE_N, rot: 180, params: { variant: "catering" } },
  { kind: "apronVehicle", x: 46, z: 80 + AIRSIDE_N, rot: 180, params: { variant: "tug" } },
  { kind: "baggageCartTrain", x: -108, z: 50 + AIRSIDE_N, rot: 0, params: { carts: 4, seed: 0xca31 } },
  { kind: "baggageCartTrain", x: 108, z: 52 + AIRSIDE_N, rot: 0, params: { carts: 5, seed: 0xca32 } },
  { kind: "apronContainers", x: -140, z: 60 + AIRSIDE_N, rot: 0, params: { w: 18, d: 14, seed: 0xc0a71 } },

  { kind: "controlTower", x: 130, z: 40 + AIRSIDE_N, rot: 0, params: { h: 42 } },

  ...[-140, -70, 0, 70, 140].map((x): Placement => ({ kind: "floodlightMast", x, z: 100 + AIRSIDE_N, params: { h: 20 } })),

  { kind: "runway", x: 0, z: 92 + AIRSIDE_N, rot: 0, params: { length: 300, taxiway: true } },
  { kind: "runway", x: 0, z: 116 + AIRSIDE_N, rot: 0, params: { length: 320, taxiway: false } },

  // ── SKY: cube clouds ────────────────────────────────────────────────────────
  { kind: "cubeCloud", x: -80, z: -70, params: { size: 9, alt: 50, seed: 0xc1d1 } },
  { kind: "cubeCloud", x: -20, z: -120, params: { size: 8, alt: 56, seed: 0xc1d2 } },
  { kind: "cubeCloud", x: 50, z: -100, params: { size: 10, alt: 52, seed: 0xc1d3 } },
  { kind: "cubeCloud", x: 95, z: -30, params: { size: 7, alt: 58, seed: 0xc1d4 } },
  { kind: "cubeCloud", x: -100, z: 20, params: { size: 9, alt: 54, seed: 0xc1d5 } },
  { kind: "cubeCloud", x: 15, z: 35, params: { size: 8, alt: 60, seed: 0xc1d6 } },
  { kind: "cubeCloud", x: 80, z: 95, params: { size: 10, alt: 50, seed: 0xc1d7 } },
  { kind: "cubeCloud", x: -55, z: 115, params: { size: 8, alt: 55, seed: 0xc1d8 } },
];

/** The airport placements translated by (ox, oz), with its own ground dropped so
 *  it can be embedded into a host map that already owns the floor. Used to merge
 *  the airport into the city map (seamless drive-in, no portal). */
export function airportPlacements(ox: number, oz: number): Placement[] {
  return map
    .filter((p) => p.kind !== "ground")
    .map((p) => ({ ...p, x: (p.x ?? 0) + ox, z: (p.z ?? 0) + oz }));
}

export const AIRPORT: MapDescriptor = {
  id: "airport",
  map,
  spawn: SPAWN,
  groundSize: GROUND,
  hasCar: false,
  portals: [
    { x: 90, z: -100, r: 7, prompt: "Press E to return to the city", to: "city", toSpawn: { x: 102, z: 0 } },
  ],
};
