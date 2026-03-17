import { InteriorLayout, buildWallGrid } from '../../data/interiorLayouts';

// 7 rooms, shared walls overlap by 1 tile (intentional — buildWallGrid's +1 border offset preserves shared wall)
const AIRPORT_ROOMS = [
  { x: 0,  y: 10, w: 18, h: 12 },  // Zone 1: Check-in Hall
  { x: 17, y: 10, w: 11, h: 12 },  // Zone 2: Passport Control
  { x: 27, y: 10, w: 11, h: 12 },  // Zone 3: Security Screening
  { x: 37, y: 10, w: 17, h: 12 },  // Zone 4: Duty Free Shopping
  { x: 53, y: 10, w: 11, h: 12 },  // Zone 5: Food Court
  { x: 63, y: 10, w: 11, h: 12 },  // Zone 6: Terminal Corridor
  { x: 73, y: 10, w: 8,  h: 12 },  // Zone 7: Gate Area
];

const AIRPORT_DOORWAYS = [
  { x: 17, y: 14, width: 2, height: 5 },  // Check-in → Passport
  { x: 27, y: 14, width: 2, height: 5 },  // Passport → Security
  { x: 37, y: 14, width: 2, height: 5 },  // Security → Duty Free
  { x: 53, y: 14, width: 2, height: 5 },  // Duty Free → Food Court
  { x: 63, y: 14, width: 2, height: 5 },  // Food Court → Terminal
  { x: 73, y: 14, width: 2, height: 5 },  // Terminal → Gate
];

export const AIRPORT_INTERIOR_LAYOUT: InteriorLayout = {
  id: 'airport-interior',
  widthInTiles: 80,
  heightInTiles: 22,
  wallGrid: buildWallGrid(80, 22, AIRPORT_ROOMS, AIRPORT_DOORWAYS),
  tarmacZoneMaxY: 9,

  floors: [
    { tileX: 1,  tileY: 11, width: 16, height: 9, floorType: 'tile_floor' },
    { tileX: 18, tileY: 11, width: 8,  height: 9, floorType: 'carpet_beige' },
    { tileX: 28, tileY: 11, width: 8,  height: 9, floorType: 'tile_floor' },
    { tileX: 38, tileY: 11, width: 14, height: 9, floorType: 'carpet' },
    { tileX: 54, tileY: 11, width: 8,  height: 9, floorType: 'wood' },
    { tileX: 64, tileY: 11, width: 8,  height: 9, floorType: 'carpet_beige' },
    { tileX: 74, tileY: 11, width: 5,  height: 9, floorType: 'carpet' },
  ],

  windowTiles: [
    { tileX: 2, tileY: 10 }, { tileX: 5, tileY: 10 }, { tileX: 8, tileY: 10 },
    { tileX: 11, tileY: 10 }, { tileX: 14, tileY: 10 },
    { tileX: 19, tileY: 10 }, { tileX: 22, tileY: 10 }, { tileX: 25, tileY: 10 },
    { tileX: 29, tileY: 10 }, { tileX: 32, tileY: 10 }, { tileX: 35, tileY: 10 },
    { tileX: 39, tileY: 10 }, { tileX: 42, tileY: 10 }, { tileX: 45, tileY: 10 },
    { tileX: 48, tileY: 10 }, { tileX: 51, tileY: 10 },
    { tileX: 55, tileY: 10 }, { tileX: 58, tileY: 10 }, { tileX: 61, tileY: 10 },
    { tileX: 65, tileY: 10 }, { tileX: 67, tileY: 10 }, { tileX: 69, tileY: 10 }, { tileX: 71, tileY: 10 },
    { tileX: 75, tileY: 10 }, { tileX: 77, tileY: 10 },
  ],

  decorations: [
    // ═══ ZONE 1: CHECK-IN HALL (x:1-16) ═══
    { tileX: 4, tileY: 13, type: 'airport-counter' },
    { tileX: 8, tileY: 13, type: 'airport-counter' },
    { tileX: 12, tileY: 13, type: 'airport-counter' },
    { tileX: 12, tileY: 14, type: 'airport-luggage-belt' },
    { tileX: 3, tileY: 12, type: 'airport-rope-barrier' },
    { tileX: 7, tileY: 12, type: 'airport-rope-barrier' },
    { tileX: 11, tileY: 12, type: 'airport-rope-barrier' },
    { tileX: 15, tileY: 12, type: 'airport-rope-barrier' },
    { tileX: 3, tileY: 18, type: 'airport-rope-barrier' },
    { tileX: 7, tileY: 18, type: 'airport-rope-barrier' },
    { tileX: 11, tileY: 18, type: 'airport-rope-barrier' },
    { tileX: 9, tileY: 11, type: 'airport-departures-board' },
    { tileX: 1, tileY: 19, type: 'airport-luggage-cart' },
    { tileX: 16, tileY: 19, type: 'airport-luggage-cart' },
    { tileX: 1, tileY: 11, type: 'airport-plant' },
    { tileX: 16, tileY: 11, type: 'airport-plant' },
    { tileX: 1, tileY: 20, type: 'airport-plant' },
    { tileX: 16, tileY: 20, type: 'airport-plant' },

    // ═══ ZONE 2: PASSPORT CONTROL (x:18-26) ═══
    { tileX: 20, tileY: 16, type: 'airport-passport-desk' },
    { tileX: 22, tileY: 16, type: 'airport-passport-desk' },
    { tileX: 24, tileY: 16, type: 'airport-passport-desk' },
    { tileX: 19, tileY: 14, type: 'airport-rope-barrier' },
    { tileX: 21, tileY: 14, type: 'airport-rope-barrier' },
    { tileX: 23, tileY: 14, type: 'airport-rope-barrier' },
    { tileX: 25, tileY: 14, type: 'airport-rope-barrier' },
    { tileX: 19, tileY: 18, type: 'airport-rope-barrier' },
    { tileX: 25, tileY: 18, type: 'airport-rope-barrier' },
    { tileX: 18, tileY: 11, type: 'airport-plant' },
    { tileX: 26, tileY: 11, type: 'airport-plant' },

    // ═══ ZONE 3: SECURITY SCREENING (x:28-36) ═══
    { tileX: 30, tileY: 16, type: 'airport-metal-detector' },
    { tileX: 34, tileY: 16, type: 'airport-metal-detector' },
    { tileX: 31, tileY: 15, type: 'airport-conveyor-belt' },
    { tileX: 35, tileY: 15, type: 'airport-conveyor-belt' },
    { tileX: 29, tileY: 15, type: 'airport-bin' },
    { tileX: 33, tileY: 15, type: 'airport-bin' },
    { tileX: 29, tileY: 13, type: 'airport-rope-barrier' },
    { tileX: 31, tileY: 13, type: 'airport-rope-barrier' },
    { tileX: 33, tileY: 13, type: 'airport-rope-barrier' },
    { tileX: 35, tileY: 13, type: 'airport-rope-barrier' },
    { tileX: 28, tileY: 11, type: 'airport-plant' },
    { tileX: 36, tileY: 11, type: 'airport-plant' },

    // ═══ ZONE 4: DUTY FREE SHOPPING (x:38-52) ═══
    { tileX: 40, tileY: 12, type: 'airport-duty-free-counter' },
    { tileX: 44, tileY: 12, type: 'airport-duty-free-counter' },
    { tileX: 48, tileY: 12, type: 'airport-duty-free-counter' },
    { tileX: 40, tileY: 14, type: 'airport-duty-free-shelf' },
    { tileX: 44, tileY: 14, type: 'airport-duty-free-shelf' },
    { tileX: 48, tileY: 14, type: 'airport-duty-free-shelf' },
    { tileX: 40, tileY: 18, type: 'airport-duty-free-shelf' },
    { tileX: 44, tileY: 18, type: 'airport-duty-free-shelf' },
    { tileX: 48, tileY: 18, type: 'airport-duty-free-shelf' },
    { tileX: 42, tileY: 16, type: 'airport-perfume-display' },
    { tileX: 46, tileY: 16, type: 'airport-liquor-display' },
    { tileX: 41, tileY: 12, type: 'airport-cash-register' },
    { tileX: 45, tileY: 12, type: 'airport-cash-register' },
    { tileX: 49, tileY: 12, type: 'airport-cash-register' },
    { tileX: 38, tileY: 11, type: 'airport-plant' },
    { tileX: 52, tileY: 11, type: 'airport-plant' },
    { tileX: 38, tileY: 20, type: 'airport-plant' },
    { tileX: 52, tileY: 20, type: 'airport-plant' },

    // ═══ ZONE 5: FOOD COURT (x:54-62) ═══
    { tileX: 56, tileY: 12, type: 'airport-cafe-counter' },
    { tileX: 60, tileY: 12, type: 'airport-cafe-counter' },
    { tileX: 55, tileY: 12, type: 'airport-cafe-menu' },
    { tileX: 59, tileY: 12, type: 'airport-cafe-menu' },
    { tileX: 56, tileY: 13, type: 'airport-stool' },
    { tileX: 57, tileY: 13, type: 'airport-stool' },
    { tileX: 60, tileY: 13, type: 'airport-stool' },
    { tileX: 61, tileY: 13, type: 'airport-stool' },
    { tileX: 56, tileY: 15, type: 'airport-food-court-table' },
    { tileX: 60, tileY: 15, type: 'airport-food-court-table' },
    { tileX: 56, tileY: 18, type: 'airport-food-court-table' },
    { tileX: 60, tileY: 18, type: 'airport-food-court-table' },
    { tileX: 55, tileY: 15, type: 'airport-stool' },
    { tileX: 57, tileY: 15, type: 'airport-stool' },
    { tileX: 59, tileY: 15, type: 'airport-stool' },
    { tileX: 61, tileY: 15, type: 'airport-stool' },
    { tileX: 54, tileY: 11, type: 'airport-plant' },
    { tileX: 62, tileY: 11, type: 'airport-plant' },

    // ═══ ZONE 6: TERMINAL CORRIDOR (x:64-72) ═══
    { tileX: 66, tileY: 16, type: 'airport-moving-walkway' },
    { tileX: 67, tileY: 16, type: 'airport-moving-walkway' },
    { tileX: 68, tileY: 16, type: 'airport-moving-walkway' },
    { tileX: 69, tileY: 16, type: 'airport-moving-walkway' },
    { tileX: 70, tileY: 16, type: 'airport-moving-walkway' },
    { tileX: 68, tileY: 11, type: 'airport-departures-board' },
    { tileX: 64, tileY: 11, type: 'airport-departures-board' },
    { tileX: 68, tileY: 12, type: 'airport-gate-desk' },
    { tileX: 64, tileY: 12, type: 'airport-gate-desk' },
    { tileX: 67, tileY: 14, type: 'airport-bench' },
    { tileX: 69, tileY: 14, type: 'airport-bench' },
    { tileX: 64, tileY: 14, type: 'airport-bench' },
    { tileX: 66, tileY: 14, type: 'airport-bench' },
    { tileX: 65, tileY: 13, type: 'airport-bench' },
    { tileX: 69, tileY: 13, type: 'airport-bench' },
    { tileX: 64, tileY: 11, type: 'airport-plant' },
    { tileX: 72, tileY: 11, type: 'airport-plant' },
    { tileX: 64, tileY: 20, type: 'airport-plant' },
    { tileX: 72, tileY: 20, type: 'airport-plant' },

    // ═══ ZONE 7: GATE AREA (x:74-78) ═══
    { tileX: 76, tileY: 12, type: 'airport-gate-desk' },
    { tileX: 76, tileY: 11, type: 'airport-departures-board' },
    { tileX: 75, tileY: 16, type: 'airport-bench' },
    { tileX: 77, tileY: 16, type: 'airport-bench' },
    { tileX: 75, tileY: 18, type: 'airport-bench' },
    { tileX: 77, tileY: 18, type: 'airport-bench' },
    { tileX: 74, tileY: 11, type: 'airport-plant' },
    { tileX: 78, tileY: 11, type: 'airport-plant' },
  ],

  entrance: { tileX: 9, tileY: 20 },
  exit: { tileX: 8, tileY: 20, width: 3, height: 2, promptText: 'Exit Airport' },
  exitDoorStyle: 'glass',
  cameraZoom: 1.75,
};
