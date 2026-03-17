import { InteriorLayout, buildWallGrid } from '../../data/interiorLayouts';

// 7 rooms, shared walls overlap by 1 tile (intentional — buildWallGrid's +1 border offset preserves shared wall)
const AIRPORT_ROOMS = [
  { x: 0,  y: 0, w: 18, h: 40 },  // Zone 1: Check-in Hall
  { x: 17, y: 0, w: 11, h: 40 },  // Zone 2: Passport Control
  { x: 27, y: 0, w: 11, h: 40 },  // Zone 3: Security Screening
  { x: 37, y: 0, w: 17, h: 40 },  // Zone 4: Duty Free Shopping
  { x: 53, y: 0, w: 11, h: 40 },  // Zone 5: Food Court
  { x: 63, y: 0, w: 11, h: 40 },  // Zone 6: Terminal Corridor
  { x: 73, y: 0, w: 8,  h: 40 },  // Zone 7: Gate Area
];

const AIRPORT_DOORWAYS = [
  { x: 17, y: 16, width: 2, height: 5 },  // Check-in → Passport
  { x: 27, y: 16, width: 2, height: 5 },  // Passport → Security
  { x: 37, y: 16, width: 2, height: 5 },  // Security → Duty Free
  { x: 53, y: 16, width: 2, height: 5 },  // Duty Free → Food Court
  { x: 63, y: 16, width: 2, height: 5 },  // Food Court → Terminal
  { x: 73, y: 16, width: 2, height: 5 },  // Terminal → Gate
];

export const AIRPORT_INTERIOR_LAYOUT: InteriorLayout = {
  id: 'airport-interior',
  widthInTiles: 80,
  heightInTiles: 40,
  wallGrid: buildWallGrid(80, 40, AIRPORT_ROOMS, AIRPORT_DOORWAYS),

  floors: [
    { tileX: 1,  tileY: 1, width: 16, height: 38, floorType: 'tile_floor' },     // Zone 1: Check-in
    { tileX: 18, tileY: 1, width: 8,  height: 38, floorType: 'carpet_beige' },   // Zone 2: Passport
    { tileX: 28, tileY: 1, width: 8,  height: 38, floorType: 'tile_floor' },     // Zone 3: Security
    { tileX: 38, tileY: 1, width: 14, height: 38, floorType: 'carpet' },         // Zone 4: Duty Free
    { tileX: 54, tileY: 1, width: 8,  height: 38, floorType: 'wood' },           // Zone 5: Food Court
    { tileX: 64, tileY: 1, width: 8,  height: 38, floorType: 'carpet_beige' },   // Zone 6: Terminal
    { tileX: 74, tileY: 1, width: 5,  height: 38, floorType: 'carpet' },         // Zone 7: Gate
  ],

  windowTiles: [
    // Zone 1 windows (top wall y=0)
    { tileX: 2, tileY: 0 }, { tileX: 5, tileY: 0 }, { tileX: 8, tileY: 0 },
    { tileX: 11, tileY: 0 }, { tileX: 14, tileY: 0 },
    // Zone 2 windows
    { tileX: 19, tileY: 0 }, { tileX: 22, tileY: 0 }, { tileX: 25, tileY: 0 },
    // Zone 3 windows
    { tileX: 29, tileY: 0 }, { tileX: 32, tileY: 0 }, { tileX: 35, tileY: 0 },
    // Zone 4 windows (duty free — more windows)
    { tileX: 39, tileY: 0 }, { tileX: 42, tileY: 0 }, { tileX: 45, tileY: 0 },
    { tileX: 48, tileY: 0 }, { tileX: 51, tileY: 0 },
    // Zone 5 windows
    { tileX: 55, tileY: 0 }, { tileX: 58, tileY: 0 }, { tileX: 61, tileY: 0 },
    // Zone 6 windows (terminal — many windows for tarmac views)
    { tileX: 65, tileY: 0 }, { tileX: 67, tileY: 0 }, { tileX: 69, tileY: 0 }, { tileX: 71, tileY: 0 },
    // Zone 7 windows
    { tileX: 75, tileY: 0 }, { tileX: 77, tileY: 0 },
  ],

  decorations: [
    // ═══ ZONE 1: CHECK-IN HALL (x:1-16) ═══
    // Windows
    { tileX: 2, tileY: 0, type: 'airport-window' },
    { tileX: 5, tileY: 0, type: 'airport-window' },
    { tileX: 8, tileY: 0, type: 'airport-window' },
    { tileX: 11, tileY: 0, type: 'airport-window' },
    { tileX: 14, tileY: 0, type: 'airport-window' },
    // Check-in counters (4 counters in 2 rows)
    { tileX: 4, tileY: 15, type: 'airport-counter' },
    { tileX: 8, tileY: 15, type: 'airport-counter' },
    { tileX: 12, tileY: 15, type: 'airport-counter' },
    { tileX: 4, tileY: 22, type: 'airport-counter' },
    { tileX: 8, tileY: 22, type: 'airport-counter' },
    { tileX: 12, tileY: 22, type: 'airport-counter' },
    // Luggage belt
    { tileX: 12, tileY: 16, type: 'airport-luggage-belt' },
    // Rope barriers
    { tileX: 3, tileY: 14, type: 'airport-rope-barrier' },
    { tileX: 7, tileY: 14, type: 'airport-rope-barrier' },
    { tileX: 11, tileY: 14, type: 'airport-rope-barrier' },
    { tileX: 15, tileY: 14, type: 'airport-rope-barrier' },
    { tileX: 3, tileY: 21, type: 'airport-rope-barrier' },
    { tileX: 7, tileY: 21, type: 'airport-rope-barrier' },
    { tileX: 11, tileY: 21, type: 'airport-rope-barrier' },
    // Departures board
    { tileX: 9, tileY: 2, type: 'airport-departures-board' },
    // Luggage carts
    { tileX: 1, tileY: 27, type: 'airport-luggage-cart' },
    { tileX: 16, tileY: 27, type: 'airport-luggage-cart' },
    // Benches (waiting area lower half)
    { tileX: 3, tileY: 30, type: 'airport-bench' },
    { tileX: 7, tileY: 30, type: 'airport-bench' },
    { tileX: 12, tileY: 30, type: 'airport-bench' },
    { tileX: 3, tileY: 33, type: 'airport-bench' },
    { tileX: 7, tileY: 33, type: 'airport-bench' },
    { tileX: 12, tileY: 33, type: 'airport-bench' },
    { tileX: 3, tileY: 36, type: 'airport-bench' },
    { tileX: 7, tileY: 36, type: 'airport-bench' },
    // Plants
    { tileX: 1, tileY: 1, type: 'airport-plant' },
    { tileX: 16, tileY: 1, type: 'airport-plant' },
    { tileX: 1, tileY: 38, type: 'airport-plant' },
    { tileX: 16, tileY: 38, type: 'airport-plant' },

    // ═══ ZONE 2: PASSPORT CONTROL (x:18-26) ═══
    // Windows
    { tileX: 19, tileY: 0, type: 'airport-window' },
    { tileX: 22, tileY: 0, type: 'airport-window' },
    { tileX: 25, tileY: 0, type: 'airport-window' },
    // Passport desks (3 booths)
    { tileX: 20, tileY: 18, type: 'airport-passport-desk' },
    { tileX: 22, tileY: 18, type: 'airport-passport-desk' },
    { tileX: 24, tileY: 18, type: 'airport-passport-desk' },
    // Rope barriers (lane guides)
    { tileX: 19, tileY: 16, type: 'airport-rope-barrier' },
    { tileX: 21, tileY: 16, type: 'airport-rope-barrier' },
    { tileX: 23, tileY: 16, type: 'airport-rope-barrier' },
    { tileX: 25, tileY: 16, type: 'airport-rope-barrier' },
    { tileX: 19, tileY: 21, type: 'airport-rope-barrier' },
    { tileX: 25, tileY: 21, type: 'airport-rope-barrier' },
    // Benches
    { tileX: 20, tileY: 28, type: 'airport-bench' },
    { tileX: 24, tileY: 28, type: 'airport-bench' },
    // Plants
    { tileX: 18, tileY: 1, type: 'airport-plant' },
    { tileX: 26, tileY: 1, type: 'airport-plant' },

    // ═══ ZONE 3: SECURITY SCREENING (x:28-36) ═══
    // Windows
    { tileX: 29, tileY: 0, type: 'airport-window' },
    { tileX: 32, tileY: 0, type: 'airport-window' },
    { tileX: 35, tileY: 0, type: 'airport-window' },
    // Metal detectors (2 lanes)
    { tileX: 30, tileY: 18, type: 'airport-metal-detector' },
    { tileX: 34, tileY: 18, type: 'airport-metal-detector' },
    // Conveyor belts
    { tileX: 31, tileY: 17, type: 'airport-conveyor-belt' },
    { tileX: 35, tileY: 17, type: 'airport-conveyor-belt' },
    // Bins
    { tileX: 29, tileY: 17, type: 'airport-bin' },
    { tileX: 33, tileY: 17, type: 'airport-bin' },
    // Rope barriers
    { tileX: 29, tileY: 15, type: 'airport-rope-barrier' },
    { tileX: 31, tileY: 15, type: 'airport-rope-barrier' },
    { tileX: 33, tileY: 15, type: 'airport-rope-barrier' },
    { tileX: 35, tileY: 15, type: 'airport-rope-barrier' },
    // Plants
    { tileX: 28, tileY: 1, type: 'airport-plant' },
    { tileX: 36, tileY: 1, type: 'airport-plant' },

    // ═══ ZONE 4: DUTY FREE SHOPPING (x:38-52) ═══
    // Windows
    { tileX: 39, tileY: 0, type: 'airport-window' },
    { tileX: 42, tileY: 0, type: 'airport-window' },
    { tileX: 45, tileY: 0, type: 'airport-window' },
    { tileX: 48, tileY: 0, type: 'airport-window' },
    { tileX: 51, tileY: 0, type: 'airport-window' },
    // Shop counters (3 display counters)
    { tileX: 40, tileY: 10, type: 'airport-duty-free-counter' },
    { tileX: 44, tileY: 10, type: 'airport-duty-free-counter' },
    { tileX: 48, tileY: 10, type: 'airport-duty-free-counter' },
    // Display shelves (6 shelves spread around)
    { tileX: 40, tileY: 15, type: 'airport-duty-free-shelf' },
    { tileX: 44, tileY: 15, type: 'airport-duty-free-shelf' },
    { tileX: 48, tileY: 15, type: 'airport-duty-free-shelf' },
    { tileX: 40, tileY: 24, type: 'airport-duty-free-shelf' },
    { tileX: 44, tileY: 24, type: 'airport-duty-free-shelf' },
    { tileX: 48, tileY: 24, type: 'airport-duty-free-shelf' },
    // Perfume display
    { tileX: 42, tileY: 18, type: 'airport-perfume-display' },
    // Liquor display
    { tileX: 46, tileY: 18, type: 'airport-liquor-display' },
    // Cash registers
    { tileX: 41, tileY: 10, type: 'airport-cash-register' },
    { tileX: 45, tileY: 10, type: 'airport-cash-register' },
    { tileX: 49, tileY: 10, type: 'airport-cash-register' },
    // Benches
    { tileX: 40, tileY: 30, type: 'airport-bench' },
    { tileX: 46, tileY: 30, type: 'airport-bench' },
    // Plants
    { tileX: 38, tileY: 1, type: 'airport-plant' },
    { tileX: 52, tileY: 1, type: 'airport-plant' },
    { tileX: 38, tileY: 38, type: 'airport-plant' },
    { tileX: 52, tileY: 38, type: 'airport-plant' },

    // ═══ ZONE 5: FOOD COURT (x:54-62) ═══
    // Windows
    { tileX: 55, tileY: 0, type: 'airport-window' },
    { tileX: 58, tileY: 0, type: 'airport-window' },
    { tileX: 61, tileY: 0, type: 'airport-window' },
    // Cafe counters
    { tileX: 56, tileY: 8, type: 'airport-cafe-counter' },
    { tileX: 60, tileY: 8, type: 'airport-cafe-counter' },
    // Cafe menus
    { tileX: 55, tileY: 8, type: 'airport-cafe-menu' },
    { tileX: 59, tileY: 8, type: 'airport-cafe-menu' },
    // Stools at counters
    { tileX: 56, tileY: 10, type: 'airport-stool' },
    { tileX: 57, tileY: 10, type: 'airport-stool' },
    { tileX: 60, tileY: 10, type: 'airport-stool' },
    { tileX: 61, tileY: 10, type: 'airport-stool' },
    // Food court tables
    { tileX: 56, tileY: 16, type: 'airport-food-court-table' },
    { tileX: 60, tileY: 16, type: 'airport-food-court-table' },
    { tileX: 56, tileY: 22, type: 'airport-food-court-table' },
    { tileX: 60, tileY: 22, type: 'airport-food-court-table' },
    // Stools at tables
    { tileX: 55, tileY: 16, type: 'airport-stool' },
    { tileX: 57, tileY: 16, type: 'airport-stool' },
    { tileX: 59, tileY: 16, type: 'airport-stool' },
    { tileX: 61, tileY: 16, type: 'airport-stool' },
    // Bins (trash)
    { tileX: 54, tileY: 28, type: 'airport-bin' },
    { tileX: 62, tileY: 28, type: 'airport-bin' },
    // Plants
    { tileX: 54, tileY: 1, type: 'airport-plant' },
    { tileX: 62, tileY: 1, type: 'airport-plant' },

    // ═══ ZONE 6: TERMINAL CORRIDOR (x:64-72) ═══
    // Windows (many — long views of tarmac)
    { tileX: 65, tileY: 0, type: 'airport-window' },
    { tileX: 67, tileY: 0, type: 'airport-window' },
    { tileX: 69, tileY: 0, type: 'airport-window' },
    { tileX: 71, tileY: 0, type: 'airport-window' },
    // Moving walkway segments
    { tileX: 66, tileY: 18, type: 'airport-moving-walkway' },
    { tileX: 67, tileY: 18, type: 'airport-moving-walkway' },
    { tileX: 68, tileY: 18, type: 'airport-moving-walkway' },
    { tileX: 69, tileY: 18, type: 'airport-moving-walkway' },
    { tileX: 70, tileY: 18, type: 'airport-moving-walkway' },
    // Gate signs (terminal corridor zone)
    { tileX: 68, tileY: 5, type: 'airport-departures-board' },  // Gate 2 area
    { tileX: 64, tileY: 5, type: 'airport-departures-board' },  // Gate 3 area
    // Gate desks for coming-soon gates
    { tileX: 68, tileY: 8, type: 'airport-gate-desk' },   // Gate 2 desk
    { tileX: 64, tileY: 8, type: 'airport-gate-desk' },   // Gate 3 desk
    // More benches near gates
    { tileX: 67, tileY: 12, type: 'airport-bench' },
    { tileX: 69, tileY: 12, type: 'airport-bench' },
    { tileX: 64, tileY: 12, type: 'airport-bench' },
    { tileX: 66, tileY: 12, type: 'airport-bench' },
    // Benches
    { tileX: 65, tileY: 10, type: 'airport-bench' },
    { tileX: 69, tileY: 10, type: 'airport-bench' },
    { tileX: 65, tileY: 28, type: 'airport-bench' },
    { tileX: 69, tileY: 28, type: 'airport-bench' },
    // Plants
    { tileX: 64, tileY: 1, type: 'airport-plant' },
    { tileX: 72, tileY: 1, type: 'airport-plant' },
    { tileX: 64, tileY: 38, type: 'airport-plant' },
    { tileX: 72, tileY: 38, type: 'airport-plant' },

    // ═══ ZONE 7: GATE AREA (x:74-78) ═══
    // Windows (showing the plane)
    { tileX: 75, tileY: 0, type: 'airport-window' },
    { tileX: 77, tileY: 0, type: 'airport-window' },
    // Gate desk
    { tileX: 76, tileY: 10, type: 'airport-gate-desk' },
    // Departures board
    { tileX: 76, tileY: 5, type: 'airport-departures-board' },
    // Benches (waiting area)
    { tileX: 75, tileY: 18, type: 'airport-bench' },
    { tileX: 77, tileY: 18, type: 'airport-bench' },
    { tileX: 75, tileY: 22, type: 'airport-bench' },
    { tileX: 77, tileY: 22, type: 'airport-bench' },
    { tileX: 75, tileY: 26, type: 'airport-bench' },
    { tileX: 77, tileY: 26, type: 'airport-bench' },
    // Plants
    { tileX: 74, tileY: 1, type: 'airport-plant' },
    { tileX: 78, tileY: 1, type: 'airport-plant' },
  ],

  entrance: { tileX: 9, tileY: 38 },
  exit: { tileX: 8, tileY: 38, width: 3, height: 2, promptText: 'Exit Airport' },
  exitDoorStyle: 'glass',
  cameraZoom: 1.75,
};
