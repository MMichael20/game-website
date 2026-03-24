import { InteriorLayout, buildWallGrid } from '../../data/interiorLayouts';

// Ground floor lobby of the Budapest airbnb building
// Long narrow corridor running vertically (bottom to top)
// LEFT side: restaurant kitchen (you can see into it)
// RIGHT side: reception room with luggage, then elevator/staircase at the end

const W = 26;
const H = 22;

const rooms = [
  // Main corridor — narrow (4 tiles wide), runs from bottom to near top
  { x: 10, y: 1, w: 6, h: 20 },     // walkable x=11..14, y=2..19

  // LEFT: Restaurant kitchen
  { x: 1, y: 6, w: 10, h: 8 },      // walkable x=2..9, y=7..12

  // RIGHT: Reception / luggage room
  { x: 15, y: 8, w: 10, h: 8 },     // walkable x=16..23, y=9..14

  // RIGHT top: Elevator / staircase room
  { x: 15, y: 1, w: 10, h: 7 },     // walkable x=16..23, y=2..6
];

const doorways = [
  // Corridor ↔ Kitchen (left wall of corridor)
  { x: 10, y: 8, width: 1, height: 2 },

  // Corridor ↔ Reception (right wall of corridor)
  { x: 15, y: 10, width: 1, height: 2 },

  // Corridor ↔ Elevator/Staircase (right wall, further up)
  { x: 15, y: 3, width: 1, height: 2 },
];

export const BUDAPEST_AIRBNB_LOBBY_LAYOUT: InteriorLayout = {
  id: 'budapest-airbnb-lobby',
  widthInTiles: W,
  heightInTiles: H,
  wallGrid: buildWallGrid(W, H, rooms, doorways),
  floors: [
    // Corridor — marble tile
    { tileX: 11, tileY: 2, width: 4, height: 18, floorType: 'tile_floor' },

    // Kitchen — tile floor
    { tileX: 2, tileY: 7, width: 8, height: 6, floorType: 'tile_floor' },

    // Reception — dark wood
    { tileX: 16, tileY: 9, width: 8, height: 6, floorType: 'wood' },

    // Elevator/staircase room — marble
    { tileX: 16, tileY: 2, width: 8, height: 5, floorType: 'tile_floor' },
  ],
  decorations: [
    // ── Corridor decorations (narrow, sparse) ──
    { tileX: 11, tileY: 3, type: 'painting' },
    { tileX: 14, tileY: 5, type: 'painting' },
    { tileX: 11, tileY: 12, type: 'plant-lux' },
    { tileX: 14, tileY: 14, type: 'plant-lux' },
    { tileX: 12, tileY: 8, type: 'rug' },
    { tileX: 13, tileY: 8, type: 'rug' },
    { tileX: 11, tileY: 17, type: 'chandelier' },

    // ── Kitchen (left) — restaurant kitchen you can peek into ──
    { tileX: 2, tileY: 7, type: 'stove' },
    { tileX: 4, tileY: 7, type: 'stove' },
    { tileX: 6, tileY: 7, type: 'sink' },
    { tileX: 8, tileY: 7, type: 'fridge' },
    { tileX: 3, tileY: 10, type: 'table' },
    { tileX: 6, tileY: 10, type: 'table' },
    { tileX: 2, tileY: 12, type: 'bookshelf' },
    { tileX: 8, tileY: 12, type: 'plant-lux' },

    // ── Reception room (right) — luggage storage ──
    { tileX: 18, tileY: 9, type: 'reception-desk' },
    { tileX: 19, tileY: 9, type: 'reception-desk' },
    { tileX: 16, tileY: 11, type: 'luggage-rack' },
    { tileX: 22, tileY: 10, type: 'luggage' },
    { tileX: 22, tileY: 12, type: 'luggage' },
    { tileX: 16, tileY: 13, type: 'armchair' },
    { tileX: 20, tileY: 13, type: 'painting' },

    // ── Elevator / staircase room (right, top) ──
    { tileX: 17, tileY: 2, type: 'elevator' },
    { tileX: 19, tileY: 2, type: 'staircase' },
    { tileX: 22, tileY: 3, type: 'painting' },
    { tileX: 20, tileY: 5, type: 'chandelier' },
  ],
  entrance: { tileX: 12, tileY: 19 },
  exit: {
    tileX: 11, tileY: 19, width: 4, height: 1,
    promptText: 'Leave Building',
  },
  exitDoorStyle: 'wooden',

  // Forward exit to 2nd floor via elevator/staircase room
  forwardExit: {
    tileX: 17, tileY: 3, width: 3, height: 1,
    promptText: 'Go to 2nd Floor',
  },
  nextScene: 'BudapestAirbnbScene',
};
