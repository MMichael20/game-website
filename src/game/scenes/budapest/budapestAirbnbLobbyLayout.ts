import { InteriorLayout, buildWallGrid } from '../../data/interiorLayouts';

// Ground floor lobby of the Budapest airbnb building
// Long narrow corridor running vertically (bottom to top)
// Elevator/staircase is AT THE END of the corridor (top) — you walk straight to it
// LEFT side: restaurant kitchen
// RIGHT side: reception room with luggage

const W = 24;
const H = 24;

const rooms = [
  // Main corridor — narrow (4 tiles wide), runs full length bottom to top
  // The elevator is at the TOP END of the corridor — you walk straight into it
  { x: 9, y: 1, w: 6, h: 22 },      // walkable x=10..13, y=2..21

  // LEFT: Restaurant kitchen (midway up)
  { x: 1, y: 7, w: 9, h: 8 },       // walkable x=2..8, y=8..13

  // RIGHT: Reception / luggage room (midway up)
  { x: 14, y: 9, w: 9, h: 8 },      // walkable x=15..21, y=10..15
];

const doorways = [
  // Corridor ↔ Kitchen (left wall of corridor, midway)
  { x: 9, y: 9, width: 1, height: 2 },

  // Corridor ↔ Reception (right wall of corridor, midway)
  { x: 14, y: 11, width: 1, height: 2 },
];

export const BUDAPEST_AIRBNB_LOBBY_LAYOUT: InteriorLayout = {
  id: 'budapest-airbnb-lobby',
  widthInTiles: W,
  heightInTiles: H,
  wallGrid: buildWallGrid(W, H, rooms, doorways),
  floors: [
    // Corridor — marble tile
    { tileX: 10, tileY: 2, width: 4, height: 20, floorType: 'tile_floor' },

    // Kitchen — tile floor
    { tileX: 2, tileY: 8, width: 7, height: 6, floorType: 'tile_floor' },

    // Reception — dark wood
    { tileX: 15, tileY: 10, width: 7, height: 6, floorType: 'wood' },
  ],
  decorations: [
    // ── TOP OF CORRIDOR — Elevator & Staircase (the destination!) ──
    { tileX: 10, tileY: 2, type: 'elevator' },
    { tileX: 13, tileY: 2, type: 'staircase' },

    // ── Corridor decorations (along the walls, don't block center path) ──
    { tileX: 10, tileY: 5, type: 'painting' },
    { tileX: 13, tileY: 7, type: 'painting' },
    { tileX: 10, tileY: 15, type: 'plant-lux' },
    { tileX: 13, tileY: 17, type: 'plant-lux' },
    { tileX: 11, tileY: 10, type: 'rug' },
    { tileX: 12, tileY: 10, type: 'rug' },
    { tileX: 13, tileY: 19, type: 'chandelier' },

    // ── Kitchen (left) — restaurant kitchen ──
    { tileX: 2, tileY: 8, type: 'stove' },
    { tileX: 4, tileY: 8, type: 'stove' },
    { tileX: 6, tileY: 8, type: 'sink' },
    { tileX: 8, tileY: 8, type: 'fridge' },
    { tileX: 3, tileY: 11, type: 'table' },
    { tileX: 6, tileY: 11, type: 'table' },
    { tileX: 2, tileY: 13, type: 'bookshelf' },
    { tileX: 8, tileY: 13, type: 'plant-lux' },

    // ── Reception room (right) — luggage storage ──
    { tileX: 17, tileY: 10, type: 'reception-desk' },
    { tileX: 18, tileY: 10, type: 'reception-desk' },
    { tileX: 15, tileY: 12, type: 'luggage-rack' },
    { tileX: 21, tileY: 11, type: 'luggage' },
    { tileX: 21, tileY: 13, type: 'luggage' },
    { tileX: 15, tileY: 14, type: 'armchair' },
    { tileX: 19, tileY: 14, type: 'painting' },
  ],
  entrance: { tileX: 11, tileY: 21 },
  exit: {
    tileX: 10, tileY: 21, width: 4, height: 1,
    promptText: 'Leave Building',
  },
  exitDoorStyle: 'wooden',

  // Forward exit — RIGHT AT THE END of the corridor, by the elevator
  forwardExit: {
    tileX: 10, tileY: 3, width: 4, height: 1,
    promptText: 'Take Elevator to 2nd Floor',
  },
  nextScene: 'BudapestAirbnbScene',
};
