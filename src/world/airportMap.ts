// Ben Gurion ("Natbag") international airport — the second world.
//
// Axis convention: +z = AIRSIDE (north), -z = LANDSIDE (south). The player fades
// in at the south curb (spawn) facing +z and walks north: forecourt -> terminal
// departures hall -> concourse -> gates -> apron with parked jets, ground
// vehicles, a control tower and runways across the far north.
//
// The terminal hall's open entrance (its local +z front) is turned to face south
// (rot:180) so you walk straight in from the curb; its rear doorway then opens
// north into the concourse. Reading this list is seeing the airport.

import type { MapDescriptor, Placement } from "./system/types";

const GROUND = 260;

// ── Landside spawn / portal anchors ─────────────────────────────────────────
const SPAWN = { x: 0, z: -98 };

const map: Placement[] = [
  // ── Ground + big paved slabs ───────────────────────────────────────────────
  { kind: "ground", params: { size: GROUND } },
  // Forecourt + terminal + concourse pavement (south half).
  { kind: "pavement", x: 0, z: -55, params: { w: 180, d: 110 } },
  // Apron concrete (north half) under the gates + parked jets.
  { kind: "pavement", x: 0, z: 55, params: { w: 230, d: 130 } },

  // ── LANDSIDE (south): drop-off curb, monument, palms ───────────────────────
  { kind: "curbCanopy", x: 0, z: -108, rot: 0, params: { w: 90, d: 12, label: "Arrivals" } },
  { kind: "airportMonument", x: 0, z: -90, rot: 0 },
  // Palm rows + lamps framing the forecourt.
  ...[-44, -30, 30, 44].flatMap((x): Placement[] => [
    { kind: "palmTree", x, z: -100, params: { h: 8 } },
    { kind: "palmTree", x, z: -78, params: { h: 7 } },
  ]),
  ...[-50, -25, 25, 50].map((x): Placement => ({ kind: "lamp", x, z: -94 })),
  { kind: "bench", x: -14, z: -88 },
  { kind: "bench", x: 14, z: -88 },
  { kind: "planter", x: -8, z: -92 },
  { kind: "planter", x: 8, z: -92 },
  // A couple of ground vehicles loitering kerbside.
  { kind: "apronVehicle", x: -34, z: -86, rot: 90, params: { variant: "stairs" } },
  { kind: "apronVehicle", x: 34, z: -86, rot: 270, params: { variant: "catering" } },

  // ── TERMINAL HALL (hero) — entrance faces south, concourse door faces north ──
  { kind: "terminalHall", x: 0, z: -58, rot: 180, params: { w: 110, d: 44, h: 14, rearGap: 18 } },

  // Departures flight boards high over the entrance/check-in, facing arrivals.
  { kind: "flightBoard", x: -22, z: -50, rot: 180, params: { w: 8, h: 3.4, rows: 8 } },
  { kind: "flightBoard", x: 22, z: -50, rot: 180, params: { w: 8, h: 3.4, rows: 8 } },

  // Four check-in islands (face south toward the entering passengers).
  ...[-39, -13, 13, 39].map((x): Placement => ({
    kind: "checkInIsland", x, z: -62, rot: 180, params: { len: 12, desks: 4 },
  })),

  // Central duty-free rotunda with its fountain.
  { kind: "dutyFreeRotunda", x: 0, z: -50, params: { r: 10 } },

  // Side-wall retail (face the hall interior).
  { kind: "dutyFreeShop", x: -48, z: -72, rot: 90, params: { w: 10, d: 8, name: "Perfume & Co", accent: 0x9b2d6f } },
  { kind: "dutyFreeShop", x: 48, z: -72, rot: 270, params: { w: 10, d: 8, name: "TechWorld", accent: 0x2980b9 } },
  { kind: "dutyFreeShop", x: -48, z: -44, rot: 90, params: { w: 10, d: 8, name: "Sabra Gifts", accent: 0x1f7a4d } },
  { kind: "dutyFreeShop", x: 48, z: -44, rot: 270, params: { w: 10, d: 8, name: "Last Minute", accent: 0xd9533b } },

  // Escalators flanking the rotunda (decorative).
  { kind: "escalator", x: -16, z: -44, rot: 0, params: { rise: 4, run: 7 } },
  { kind: "escalator", x: 16, z: -44, rot: 180, params: { rise: 4, run: 7 } },

  // Seating clusters in the entrance hall.
  { kind: "airportSeating", x: -8, z: -74, rot: 0, params: { seats: 6 } },
  { kind: "airportSeating", x: 8, z: -74, rot: 180, params: { seats: 6 } },

  // Security checkpoint at the concourse doorway (passengers pass north).
  { kind: "securityLane", x: 0, z: -39, rot: 0, params: { lanes: 4 } },

  // ── CONCOURSE (north of the terminal): seating, retail, baggage ─────────────
  { kind: "baggageCarousel", x: -34, z: -18, rot: 0, params: { rx: 6, rz: 3 } },
  { kind: "baggageCarousel", x: 34, z: -18, rot: 0, params: { rx: 6, rz: 3 } },
  { kind: "dutyFreeShop", x: -40, z: -28, rot: 90, params: { w: 10, d: 8, name: "Cafe Aroma", accent: 0x8a5a2b } },
  { kind: "dutyFreeShop", x: 40, z: -28, rot: 270, params: { w: 10, d: 8, name: "News & Books", accent: 0x355e9b } },
  { kind: "flightBoard", x: 0, z: -30, rot: 0, params: { w: 9, h: 3.2, rows: 8 } },
  ...[-12, 0, 12].map((x): Placement => ({ kind: "airportSeating", x, z: -8, rot: 0, params: { seats: 8 } })),
  ...[-12, 0, 12].map((x): Placement => ({ kind: "airportSeating", x, z: -2, rot: 180, params: { seats: 8 } })),

  // ── GATES (concourse edge): four lounges facing the apron (north) ───────────
  ...[
    { x: -45, gate: "B1", route: "TLV - LHR" },
    { x: -15, gate: "B3", route: "TLV - JFK" },
    { x: 15, gate: "B5", route: "TLV - CDG" },
    { x: 45, gate: "B7", route: "TLV - DXB" },
  ].map((g): Placement => ({
    kind: "gateLounge", x: g.x, z: 16, rot: 0, params: { w: 18, d: 14, gate: g.gate, route: g.route },
  })),

  // Jet bridges reaching from each gate toward its parked jet (run north).
  ...[-45, -15, 15, 45].map((x): Placement => ({ kind: "jetBridge", x: x + 6, z: 26, rot: 90, params: { len: 14 } })),

  // ── AIRSIDE (apron): stands, parked jets, ground service, tower, runways ────
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

  // Ground-service vehicles working the stands.
  { kind: "apronVehicle", x: -52, z: 48, rot: 0, params: { variant: "tug" } },
  { kind: "apronVehicle", x: -22, z: 48, rot: 0, params: { variant: "fuel" } },
  { kind: "apronVehicle", x: 8, z: 48, rot: 0, params: { variant: "pushback" } },
  { kind: "apronVehicle", x: 38, z: 48, rot: 0, params: { variant: "stairs" } },
  { kind: "apronVehicle", x: -38, z: 80, rot: 180, params: { variant: "catering" } },
  { kind: "apronVehicle", x: 22, z: 80, rot: 180, params: { variant: "tug" } },

  // Control tower off to the east of the apron.
  { kind: "controlTower", x: 95, z: 40, rot: 0, params: { h: 36 } },

  // Taxiway then runway across the far north (run east-west along x).
  { kind: "runway", x: 0, z: 92, rot: 0, params: { length: 220, taxiway: true } },
  { kind: "runway", x: 0, z: 116, rot: 0, params: { length: 230, taxiway: false } },
  // Apron / runway edge lamps.
  ...[-90, -45, 0, 45, 90].map((x): Placement => ({ kind: "lamp", x, z: 102 })),
];

export const AIRPORT: MapDescriptor = {
  id: "airport",
  map,
  spawn: SPAWN,
  groundSize: GROUND,
  hasCar: false,
  // Stand at the monument/curb and press E to fly back to the city.
  portals: [
    { x: 0, z: -90, r: 6, prompt: "Press E to return to the city", to: "city", toSpawn: { x: 24, z: 12 } },
  ],
};
