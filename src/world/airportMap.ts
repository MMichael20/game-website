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

const GROUND = 300;

// ── Landside spawn / portal anchors ─────────────────────────────────────────
const SPAWN = { x: 0, z: -104 };

const map: Placement[] = [
  // ── Ground + big paved slabs ───────────────────────────────────────────────
  { kind: "ground", params: { size: GROUND } },
  { kind: "pavement", x: 0, z: -70, params: { w: 280, d: 120 } },
  { kind: "pavement", x: 0, z: 55, params: { w: 260, d: 150 } },

  // ── LANDSIDE access road (clean wide flat road across +x, no borders) ──────
  { kind: "airportRoad", x: 0, z: -122, rot: 0, params: { length: 250, width: 26, lanes: 6 } },

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

  // Forecourt floodlights at the corners.
  { kind: "floodlightMast", x: -125, z: -118, params: { h: 18 } },
  { kind: "floodlightMast", x: 125, z: -118, params: { h: 18 } },

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

  // ── TERMINAL HALL (hero) — huge, wide, opaque facade ───────────────────────
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
    { x: -45, gate: "B1", route: "TLV - LHR" },
    { x: -15, gate: "B3", route: "TLV - JFK" },
    { x: 15, gate: "B5", route: "TLV - CDG" },
    { x: 45, gate: "B7", route: "TLV - DXB" },
  ].map((g): Placement => ({
    kind: "gateLounge", x: g.x, z: 16, rot: 0, params: { w: 18, d: 14, gate: g.gate, route: g.route },
  })),
  ...[-45, -15, 15, 45].map((x): Placement => ({ kind: "jetBridge", x: x + 6, z: 26, rot: 90, params: { len: 14 } })),

  // ── AIRSIDE (apron) ─────────────────────────────────────────────────────────
  ...[-45, -15, 15, 45].map((x): Placement => ({ kind: "apron", x, z: 58, rot: 0, params: { w: 36, d: 44, stand: "B" } })),
  ...[
    { x: -45, livery: 0xffffff, belly: 0x0038b8, tail: 0x0038b8, reg: "4X-EKA" },
    { x: -15, livery: 0xffffff, belly: 0x0038b8, tail: 0x0038b8, reg: "4X-EKB" },
    { x: 15, livery: 0xf2f2f2, belly: 0xb5402f, tail: 0xb5402f, reg: "4X-ABF" },
    { x: 45, livery: 0xffffff, belly: 0x1f7a4d, tail: 0x1f7a4d, reg: "4X-ECC" },
  ].map((a): Placement => ({
    kind: "airliner", x: a.x, z: 64, rot: 90,
    params: { livery: a.livery, belly: a.belly, tail: a.tail, reg: a.reg },
  })),

  { kind: "apronVehicle", x: -52, z: 48, rot: 0, params: { variant: "tug" } },
  { kind: "apronVehicle", x: -22, z: 48, rot: 0, params: { variant: "fuel" } },
  { kind: "apronVehicle", x: 8, z: 48, rot: 0, params: { variant: "pushback" } },
  { kind: "apronVehicle", x: 38, z: 48, rot: 0, params: { variant: "stairs" } },
  { kind: "apronVehicle", x: -38, z: 80, rot: 180, params: { variant: "catering" } },
  { kind: "apronVehicle", x: 22, z: 80, rot: 180, params: { variant: "tug" } },
  { kind: "baggageCartTrain", x: -64, z: 50, rot: 0, params: { carts: 4, seed: 0xca31 } },
  { kind: "baggageCartTrain", x: 64, z: 52, rot: 0, params: { carts: 5, seed: 0xca32 } },
  { kind: "apronContainers", x: -115, z: 60, rot: 0, params: { w: 18, d: 14, seed: 0xc0a71 } },

  { kind: "controlTower", x: 110, z: 40, rot: 0, params: { h: 42 } },

  ...[-110, -55, 0, 55, 110].map((x): Placement => ({ kind: "floodlightMast", x, z: 100, params: { h: 20 } })),

  { kind: "runway", x: 0, z: 92, rot: 0, params: { length: 260, taxiway: true } },
  { kind: "runway", x: 0, z: 116, rot: 0, params: { length: 280, taxiway: false } },

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
