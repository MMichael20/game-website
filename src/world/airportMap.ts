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
//
// 2026-06-22 (airfield expansion): the airside is now a full, much bigger airport.
// All aircraft park OUTSIDE on marked stands: a WIDE 10-gate contact apron, a
// SATELLITE concourse pier with its own ring of stands, a REMOTE apron (east), a
// CARGO/maintenance ramp with hangars (west), a taxiway network and DUAL parallel
// runways far north. A PERIMETER security fence rings the whole field — the only
// airside access is through the terminal, so the airport reads as "closed".

import type { MapDescriptor, Placement } from "./system/types";

// Big enough to hold the whole expanded airfield (landside road at z=-150 up to
// the north perimeter fence at z=+392, and ±360 across).
const GROUND = 820;

// ── AIRSIDE LAYOUT (a much bigger, realistic airfield) ───────────────────────
// +z = airside / north. Every aircraft parks OUTSIDE on a marked stand; the whole
// field is ringed by a security fence. Stand pitch clears the ~40 m wingspans.

// MAIN CONTACT APRON — a wide east-west frontage of 10 gates/stands. Jets park
// nose-in (rot 90 → nose points -z, toward the terminal). The z deltas reuse the
// proven gate -> bridge -> apron -> jet spacing, just pushed further out.
const FRONT_X = [-234, -182, -130, -78, -26, 26, 78, 130, 182, 234];
const FRONT_GATE_Z   = 40;
const FRONT_BRIDGE_Z = 50;
const FRONT_APRON_Z  = 82;
const FRONT_JET_Z    = 88;
const FRONT_ROUTES = [
  "TLV - LHR", "TLV - JFK", "TLV - CDG", "TLV - DXB", "TLV - BKK",
  "TLV - FRA", "TLV - IST", "TLV - ATH", "TLV - LCA", "TLV - AMS",
];

// SATELLITE CONCOURSE — an island pier north of the main apron, contact stands on
// both long sides (east jets nose-in west = rot 180, west jets nose-in east = rot 0).
const SAT_Z = 175;
const SAT_STAND_Z = [130, 175, 220];
const SAT_JET_X = 38;

// Varied flag-carrier liveries, cycled across the stands; plus a cargo freighter.
const LIVERIES = [
  { livery: 0xffffff, belly: 0x0038b8, tail: 0x0038b8, reg: "4X-EKA" },
  { livery: 0xffffff, belly: 0x0038b8, tail: 0x0038b8, reg: "4X-EKB" },
  { livery: 0xf2f2f2, belly: 0xb5402f, tail: 0xb5402f, reg: "4X-ABF" },
  { livery: 0xffffff, belly: 0x1f7a4d, tail: 0x1f7a4d, reg: "4X-ECC" },
  { livery: 0xeef2f6, belly: 0x33415c, tail: 0x33415c, reg: "4X-EDD" },
  { livery: 0xffffff, belly: 0xe08a1e, tail: 0xe08a1e, reg: "4X-EFE" },
];
const FREIGHTER = { livery: 0xdfe3e7, belly: 0x555b63, tail: 0x8a1f1f, reg: "4X-EFX" };

// ── Landside spawn / portal anchors ─────────────────────────────────────────
const SPAWN = { x: 0, z: -134 };

const map: Placement[] = [
  // ── Ground + big paved slabs ───────────────────────────────────────────────
  { kind: "ground", params: { size: GROUND } },
  { kind: "pavement", x: 0, z: -84, params: { w: 280, d: 168 } },
  { kind: "pavement", x: 0, z: 55, params: { w: 260, d: 150 } },

  // ── LANDSIDE access road (pushed south to open a deep forecourt plaza) ─────
  { kind: "airportRoad", x: 0, z: -150, rot: 0, params: { length: 250, width: 26, lanes: 6 } },

  // ── DEPARTURES DROP-OFF LOOP ───────────────────────────────────────────────
  // A curbside lane right under the canopy where cars pull up to drop passengers,
  // joined back to the main access road by two connector ramps at the east/west
  // ends. The fountain plaza sits in the median of the loop, exactly as at a real
  // terminal forecourt. airportRoad has no collider, so this just paints drivable
  // asphalt under the existing taxis/curb props — drive in, drop off, drive out.
  { kind: "airportRoad", x: 0, z: -108, rot: 0, params: { length: 170, width: 9, lanes: 2 } },
  { kind: "airportRoad", x: -85, z: -129, rot: 90, params: { length: 46, width: 9, lanes: 2 } },
  { kind: "airportRoad", x: 85, z: -129, rot: 90, params: { length: 46, width: 9, lanes: 2 } },

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

  // ════════════════════════════════════════════════════════════════════════════
  // AIRSIDE — a full realistic airfield: a wide contact apron, a satellite
  // concourse, remote + cargo aprons, a taxiway network, dual runways, all ringed
  // by a perimeter security fence. Every aircraft parks OUTSIDE on a marked stand.
  // ════════════════════════════════════════════════════════════════════════════

  // ── MAIN CONTACT APRON: 10 gates + jet bridges + marked stands + nose-in jets ─
  ...FRONT_X.flatMap((x, i): Placement[] => [
    { kind: "gateLounge", x, z: FRONT_GATE_Z, rot: 0,
      params: { w: 18, d: 14, gate: `A${i + 1}`, route: FRONT_ROUTES[i] } },
    { kind: "jetBridge", x: x + 6, z: FRONT_BRIDGE_Z, rot: 90, params: { len: 18 } },
    { kind: "apron", x, z: FRONT_APRON_Z, rot: 0, params: { w: 48, d: 44, stand: `A${i + 1}` } },
    { kind: "airliner", x, z: FRONT_JET_Z, rot: 90, params: LIVERIES[i % LIVERIES.length] },
  ]),
  // Apron service taxilane just north of the parked tails (east-west).
  { kind: "runway", x: 0, z: 120, rot: 0, params: { length: 540, taxiway: true } },

  // Ground service equipment scattered across the contact apron.
  { kind: "apronVehicle", x: -208, z: 110, rot: 0, params: { variant: "tug" } },
  { kind: "apronVehicle", x: -104, z: 110, rot: 0, params: { variant: "fuel" } },
  { kind: "apronVehicle", x: 0, z: 110, rot: 0, params: { variant: "pushback" } },
  { kind: "apronVehicle", x: 104, z: 110, rot: 0, params: { variant: "catering" } },
  { kind: "apronVehicle", x: 208, z: 110, rot: 0, params: { variant: "stairs" } },
  { kind: "baggageCartTrain", x: -156, z: 108, rot: 0, params: { carts: 5, seed: 0xca31 } },
  { kind: "baggageCartTrain", x: 156, z: 108, rot: 0, params: { carts: 4, seed: 0xca32 } },

  // ── SATELLITE CONCOURSE (island pier) + a ring of 6 contact stands ──────────
  { kind: "concoursePier", x: 0, z: SAT_Z, rot: 0, params: { len: 120, w: 18, h: 9 } },
  // East side stands (jets nose-in west, rot 180):
  ...SAT_STAND_Z.flatMap((z, i): Placement[] => [
    { kind: "apron", x: SAT_JET_X, z, rot: 0, params: { w: 48, d: 44, stand: `C${21 + i * 2}` } },
    { kind: "airliner", x: SAT_JET_X, z, rot: 180, params: LIVERIES[(i + 2) % LIVERIES.length] },
  ]),
  // West side stands (jets nose-in east, rot 0):
  ...SAT_STAND_Z.flatMap((z, i): Placement[] => [
    { kind: "apron", x: -SAT_JET_X, z, rot: 0, params: { w: 48, d: 44, stand: `D${22 + i * 2}` } },
    { kind: "airliner", x: -SAT_JET_X, z, rot: 0, params: LIVERIES[(i + 4) % LIVERIES.length] },
  ]),

  // ── TAXIWAY NETWORK linking the aprons to the runways ───────────────────────
  { kind: "runway", x: -90, z: 185, rot: 90, params: { length: 150, taxiway: true } },
  { kind: "runway", x:  90, z: 185, rot: 90, params: { length: 150, taxiway: true } },
  { kind: "runway", x: 0, z: 255, rot: 0, params: { length: 600, taxiway: true } },
  { kind: "runway", x: 0, z: 330, rot: 0, params: { length: 560, taxiway: true } },

  // ── DUAL PARALLEL RUNWAYS (far north) ───────────────────────────────────────
  { kind: "runway", x: 0, z: 300, rot: 0, params: { length: 520, taxiway: false } },
  { kind: "runway", x: 0, z: 360, rot: 0, params: { length: 480, taxiway: false } },

  // ── REMOTE STAND APRON (east) — stairs/bus boarding, no jet bridge ───────────
  ...[40, 92, 144, 196].flatMap((z, i): Placement[] => [
    { kind: "apron", x: 300, z, rot: 0, params: { w: 48, d: 46, stand: `R${i + 1}` } },
    { kind: "airliner", x: 300, z, rot: 90, params: LIVERIES[(i + 1) % LIVERIES.length] },
    { kind: "apronVehicle", x: 274, z, rot: 0, params: { variant: "stairs" } },
  ]),
  { kind: "baggageCartTrain", x: 262, z: 70, rot: 90, params: { carts: 5, seed: 0xca51 } },
  { kind: "apronContainers", x: 262, z: 150, rot: 0, params: { w: 18, d: 14, seed: 0xc0a72 } },

  // ── CARGO / MAINTENANCE (west) — hangars + freighters + containers ──────────
  { kind: "hangar", x: -305, z: 70, rot: 90, params: { w: 80, d: 60, h: 28, name: "EL AL CARGO" } },
  { kind: "hangar", x: -305, z: 165, rot: 90, params: { w: 80, d: 60, h: 26, name: "MAINTENANCE" } },
  { kind: "apron", x: -245, z: 70, rot: 0, params: { w: 50, d: 46, stand: "F1" } },
  { kind: "apron", x: -245, z: 165, rot: 0, params: { w: 50, d: 46, stand: "F2" } },
  { kind: "airliner", x: -245, z: 70, rot: 180, params: FREIGHTER },
  { kind: "airliner", x: -245, z: 165, rot: 180, params: { ...FREIGHTER, reg: "4X-EFY" } },
  { kind: "apronContainers", x: -200, z: 110, rot: 0, params: { w: 20, d: 16, seed: 0xc0a73 } },
  { kind: "apronVehicle", x: -208, z: 70, rot: 0, params: { variant: "tug" } },

  // ── FIELD FURNITURE: control tower, floodlight masts, windsocks ─────────────
  { kind: "controlTower", x: 170, z: 150, rot: 0, params: { h: 46 } },
  ...[-260, -130, 0, 130, 260].flatMap((x): Placement[] => [
    { kind: "floodlightMast", x, z: 116, params: { h: 22 } },
    { kind: "floodlightMast", x, z: 240, params: { h: 22 } },
  ]),
  { kind: "windsock", x: -210, z: 285, params: { h: 9 } },
  { kind: "windsock", x: 250, z: 330, params: { h: 9 } },

  // ── PERIMETER SECURITY FENCE — rings the airfield ("closed" airport) ────────
  // North run, the two side runs, and two south runs flanking the terminal (the
  // terminal building itself closes the centre of the south boundary).
  { kind: "perimeterFence", x: 0, z: 392, rot: 0, params: { length: 740, h: 3.2, gateGap: 0 } },
  { kind: "perimeterFence", x: -360, z: 185, rot: 90, params: { length: 430, h: 3.2, gateGap: 0 } },
  { kind: "perimeterFence", x: 360, z: 185, rot: 90, params: { length: 430, h: 3.2, gateGap: 0 } },
  { kind: "perimeterFence", x: -235, z: -28, rot: 0, params: { length: 250, h: 3.2, gateGap: 0 } },
  { kind: "perimeterFence", x: 235, z: -28, rot: 0, params: { length: 250, h: 3.2, gateGap: 0 } },

  // ── SKY: cube clouds spread across the bigger field ─────────────────────────
  { kind: "cubeCloud", x: -180, z: -60, params: { size: 10, alt: 54, seed: 0xc1d1 } },
  { kind: "cubeCloud", x: 120, z: -90, params: { size: 9, alt: 58, seed: 0xc1d2 } },
  { kind: "cubeCloud", x: -90, z: 90, params: { size: 11, alt: 56, seed: 0xc1d3 } },
  { kind: "cubeCloud", x: 200, z: 60, params: { size: 9, alt: 60, seed: 0xc1d4 } },
  { kind: "cubeCloud", x: -250, z: 200, params: { size: 10, alt: 54, seed: 0xc1d5 } },
  { kind: "cubeCloud", x: 40, z: 240, params: { size: 9, alt: 62, seed: 0xc1d6 } },
  { kind: "cubeCloud", x: 260, z: 320, params: { size: 11, alt: 52, seed: 0xc1d7 } },
  { kind: "cubeCloud", x: -150, z: 350, params: { size: 9, alt: 58, seed: 0xc1d8 } },
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
