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
//
// 2026-06-22 visual-fidelity pass: deep-blue glazed terminal roof, white curb
// canopy + amber signage, cylindrical tower, color-block facade, hung amber
// boards, numbered check-in, self-service kiosks, blue queue belts, wayfinding,
// red/blue seating, warm duty-free, dense luggage + greenery, busier apron, and
// cube clouds in the sky.

import type { MapDescriptor, Placement } from "./system/types";

const GROUND = 260;

// ── Landside spawn / portal anchors ─────────────────────────────────────────
const SPAWN = { x: 0, z: -98 };

const map: Placement[] = [
  // ── Ground + big paved slabs ───────────────────────────────────────────────
  { kind: "ground", params: { size: GROUND } },
  { kind: "pavement", x: 0, z: -55, params: { w: 180, d: 110 } },
  { kind: "pavement", x: 0, z: 55, params: { w: 230, d: 130 } },

  // ── LANDSIDE (south): drop-off curb, monument, palms ───────────────────────
  { kind: "curbCanopy", x: 0, z: -108, rot: 0, params: { w: 90, d: 12, label: "Departures" } },
  { kind: "airportMonument", x: 0, z: -90, rot: 0 },

  // Hung wayfinding under the canopy (face the arriving traffic, +z).
  { kind: "wayfindingSign", x: -28, z: -106, rot: 0, params: { text: "ARRIVALS", style: "amber", w: 4, alt: 4.0 } },
  { kind: "wayfindingSign", x: 0, z: -106, rot: 0, params: { text: "DEPARTURES", style: "blue", w: 5, arrow: false, alt: 4.0 } },
  { kind: "wayfindingSign", x: 28, z: -106, rot: 0, params: { text: "TAXI", style: "amber", w: 4, alt: 4.0 } },

  // Palm rows + lamps framing the forecourt.
  ...[-44, -30, 30, 44].flatMap((x): Placement[] => [
    { kind: "palmTree", x, z: -100, params: { h: 8 } },
    { kind: "palmTree", x, z: -78, params: { h: 7 } },
  ]),
  // Hedge rows lining the forecourt edges + a central planted strip.
  { kind: "hedgeRow", x: -38, z: -73, rot: 0, params: { len: 18, h: 1.0, seed: 0x4101 } },
  { kind: "hedgeRow", x: 38, z: -73, rot: 0, params: { len: 18, h: 1.0, seed: 0x4102 } },
  { kind: "hedgeRow", x: -62, z: -95, rot: 90, params: { len: 30, h: 1.1, seed: 0x4103 } },
  { kind: "hedgeRow", x: 62, z: -95, rot: 90, params: { len: 30, h: 1.1, seed: 0x4104 } },

  // Forecourt floodlights at the corners.
  { kind: "floodlightMast", x: -60, z: -120, params: { h: 16 } },
  { kind: "floodlightMast", x: 60, z: -120, params: { h: 16 } },

  { kind: "bench", x: -14, z: -88 },
  { kind: "bench", x: 14, z: -88 },
  { kind: "pottedPlant", x: -9, z: -84, params: { h: 2.0 } },
  { kind: "pottedPlant", x: 9, z: -84, params: { h: 2.0 } },
  { kind: "trashBin", x: -20, z: -86 },
  { kind: "infoDesk", x: 22, z: -88 },

  // Curbside vehicles + luggage.
  { kind: "airportTaxi", x: -16, z: -114, rot: 90, params: { color: 0xf2c21e } },
  { kind: "airportTaxi", x: 14, z: -114, rot: 90, params: { color: 0xcf3a2c } },
  { kind: "baggageTrolley", x: -24, z: -84, rot: 0, params: { bags: 4, seed: 0x7711 } },
  { kind: "luggagePile", x: 26, z: -85, rot: 0, params: { count: 7, seed: 0xba911 } },
  { kind: "rollingSuitcase", x: 4, z: -86, params: { color: 0x2e9e4f } },

  // ── TERMINAL HALL (hero) — entrance faces south, concourse door faces north ──
  { kind: "terminalHall", x: 0, z: -58, rot: 180, params: { w: 110, d: 44, h: 14, rearGap: 18, roofRidge: 9, roofSteps: 6 } },

  // Big ceiling-hung amber departure boards over the entrance/check-in.
  { kind: "flightBoard", x: -20, z: -52, rot: 180, params: { w: 11, h: 3.6, rows: 9, hung: true, alt: 11.5 } },
  { kind: "flightBoard", x: 20, z: -52, rot: 180, params: { w: 11, h: 3.6, rows: 9, hung: true, alt: 11.5 } },

  // Four NUMBERED check-in islands (face south toward entering passengers).
  ...[
    { x: -39, no: 1 }, { x: -13, no: 5 }, { x: 13, no: 9 }, { x: 39, no: 13 },
  ].map((c): Placement => ({
    kind: "checkInIsland", x: c.x, z: -62, rot: 180, params: { len: 12, desks: 4, startNo: c.no },
  })),

  // Self-service kiosk clusters between entrance and check-in.
  { kind: "selfCheckinKiosk", x: -26, z: -71, rot: 180, params: { count: 4 } },
  { kind: "selfCheckinKiosk", x: 26, z: -71, rot: 180, params: { count: 4 } },

  // Blue queue belts in the central concourse approach.
  { kind: "queueLane", x: 0, z: -69, rot: 0, params: { w: 16, d: 6, rows: 3 } },

  // Central duty-free rotunda with its fountain.
  { kind: "dutyFreeRotunda", x: 0, z: -50, params: { r: 10 } },

  // Side-wall retail (warm wooden duty-free, face the hall interior).
  { kind: "dutyFreeShop", x: -48, z: -72, rot: 90, params: { w: 10, d: 8, name: "Perfume & Co", accent: 0x9b2d6f, warm: true } },
  { kind: "dutyFreeShop", x: 48, z: -72, rot: 270, params: { w: 10, d: 8, name: "TechWorld", accent: 0x2980b9 } },
  { kind: "dutyFreeShop", x: -48, z: -44, rot: 90, params: { w: 10, d: 8, name: "Sabra Gifts", accent: 0x1f7a4d, warm: true } },
  { kind: "dutyFreeShop", x: 48, z: -44, rot: 270, params: { w: 10, d: 8, name: "Last Minute", accent: 0xd9533b, warm: true } },

  // Escalators flanking the rotunda.
  { kind: "escalator", x: -16, z: -44, rot: 0, params: { rise: 4, run: 7 } },
  { kind: "escalator", x: 16, z: -44, rot: 180, params: { rise: 4, run: 7 } },

  // Seating clusters (bold red/blue) in the entrance hall.
  { kind: "airportSeating", x: -8, z: -76, rot: 0, params: { seats: 6, scheme: "redblue" } },
  { kind: "airportSeating", x: 8, z: -76, rot: 180, params: { seats: 6, scheme: "redblue" } },

  // Interior dressing: potted plants, fountains, ATMs, luggage scatter.
  { kind: "pottedPlant", x: -46, z: -78, params: { h: 2.2 } },
  { kind: "pottedPlant", x: 46, z: -78, params: { h: 2.2 } },
  { kind: "waterFountain", x: -45, z: -56, rot: 90 },
  { kind: "atmKiosk", x: 45, z: -56, rot: 270 },
  { kind: "trashBin", x: -42, z: -66 },
  { kind: "luggagePile", x: -30, z: -55, rot: 0, params: { count: 6, seed: 0xba922 } },
  { kind: "luggagePile", x: 30, z: -55, rot: 0, params: { count: 5, seed: 0xba933 } },
  { kind: "baggageTrolley", x: 0, z: -76, rot: 0, params: { bags: 3, seed: 0x7722 } },
  { kind: "rollingSuitcase", x: -12, z: -70, params: { color: 0xc0392b } },
  { kind: "rollingSuitcase", x: 12, z: -70, params: { color: 0x7a3fb0 } },

  // Overhead wayfinding inside the hall.
  { kind: "wayfindingSign", x: -6, z: -48, rot: 180, params: { text: "SECURITY", style: "blue", w: 4, alt: 9.0 } },
  { kind: "wayfindingSign", x: 6, z: -48, rot: 180, params: { text: "GATES", style: "amber", w: 4, alt: 9.0 } },
  { kind: "wayfindingSign", x: 0, z: -58, rot: 180, params: { text: "TOILETS", style: "amber", w: 3.5, alt: 9.0 } },

  // Security checkpoint at the concourse doorway.
  { kind: "securityLane", x: 0, z: -39, rot: 0, params: { lanes: 4 } },

  // ── CONCOURSE (north of the terminal): seating, retail, baggage ─────────────
  { kind: "baggageCarousel", x: -34, z: -18, rot: 0, params: { rx: 6, rz: 3 } },
  { kind: "baggageCarousel", x: 34, z: -18, rot: 0, params: { rx: 6, rz: 3 } },
  { kind: "dutyFreeShop", x: -40, z: -28, rot: 90, params: { w: 10, d: 8, name: "Cafe Aroma", accent: 0x8a5a2b, warm: true } },
  { kind: "dutyFreeShop", x: 40, z: -28, rot: 270, params: { w: 10, d: 8, name: "News & Books", accent: 0x355e9b } },
  { kind: "flightBoard", x: 0, z: -30, rot: 0, params: { w: 10, h: 3.4, rows: 9, hung: true, alt: 9.5 } },
  ...[-12, 0, 12].map((x): Placement => ({ kind: "airportSeating", x, z: -8, rot: 0, params: { seats: 8, scheme: "redblue" } })),
  ...[-12, 0, 12].map((x): Placement => ({ kind: "airportSeating", x, z: -2, rot: 180, params: { seats: 8, scheme: "redblue" } })),
  { kind: "luggagePile", x: -20, z: -6, rot: 0, params: { count: 6, seed: 0xba944 } },
  { kind: "luggagePile", x: 20, z: -6, rot: 0, params: { count: 6, seed: 0xba955 } },
  { kind: "pottedPlant", x: -24, z: -2, params: { h: 2.4 } },
  { kind: "pottedPlant", x: 24, z: -2, params: { h: 2.4 } },
  { kind: "wayfindingSign", x: 0, z: -12, rot: 0, params: { text: "GATES B", style: "amber", w: 5, alt: 8.5 } },

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

  // Baggage-cart trains shuttling between the stands.
  { kind: "baggageCartTrain", x: -60, z: 50, rot: 0, params: { carts: 4, seed: 0xca31 } },
  { kind: "baggageCartTrain", x: 60, z: 52, rot: 0, params: { carts: 5, seed: 0xca32 } },
  { kind: "baggageCartTrain", x: 0, z: 84, rot: 90, params: { carts: 4, seed: 0xca33 } },

  // Cargo corner off to the west of the apron.
  { kind: "apronContainers", x: -102, z: 60, rot: 0, params: { w: 18, d: 14, seed: 0xc0a71 } },

  // Control tower off to the east of the apron.
  { kind: "controlTower", x: 95, z: 40, rot: 0, params: { h: 38 } },

  // Apron floodlight masts along the stand edge.
  ...[-90, -45, 0, 45, 90].map((x): Placement => ({ kind: "floodlightMast", x, z: 100, params: { h: 18 } })),
  { kind: "floodlightMast", x: -75, z: 45, params: { h: 16 } },
  { kind: "floodlightMast", x: 75, z: 70, params: { h: 16 } },

  // Taxiway then runway across the far north (run east-west along x).
  { kind: "runway", x: 0, z: 92, rot: 0, params: { length: 220, taxiway: true } },
  { kind: "runway", x: 0, z: 116, rot: 0, params: { length: 230, taxiway: false } },

  // ── SKY: cube clouds scattered high overhead ───────────────────────────────
  { kind: "cubeCloud", x: -70, z: -60, params: { size: 8, alt: 46, seed: 0xc1d1 } },
  { kind: "cubeCloud", x: -20, z: -110, params: { size: 7, alt: 52, seed: 0xc1d2 } },
  { kind: "cubeCloud", x: 40, z: -90, params: { size: 9, alt: 48, seed: 0xc1d3 } },
  { kind: "cubeCloud", x: 80, z: -30, params: { size: 6, alt: 55, seed: 0xc1d4 } },
  { kind: "cubeCloud", x: -90, z: 20, params: { size: 8, alt: 50, seed: 0xc1d5 } },
  { kind: "cubeCloud", x: 10, z: 30, params: { size: 7, alt: 58, seed: 0xc1d6 } },
  { kind: "cubeCloud", x: 70, z: 90, params: { size: 9, alt: 47, seed: 0xc1d7 } },
  { kind: "cubeCloud", x: -50, z: 110, params: { size: 7, alt: 53, seed: 0xc1d8 } },
];

export const AIRPORT: MapDescriptor = {
  id: "airport",
  map,
  spawn: SPAWN,
  groundSize: GROUND,
  hasCar: false,
  // Stand at the monument/curb and press E to fly back to the city.
  portals: [
    { x: 0, z: -90, r: 6, prompt: "Press E to return to the city", to: "city", toSpawn: { x: 102, z: 0 } },
  ],
};
