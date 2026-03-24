import { InteriorLayout, buildWallGrid } from '../../data/interiorLayouts';

// Ground floor lobby: corridor leading to reception (end) and staircase (one door before)
// Luxury European apartment building lobby

const W = 20;
const H = 16;

const rooms = [
  { x: 6, y: 7, w: 8, h: 8 },     // Main corridor (walkable y=8..13, x=7..12)
  { x: 2, y: 1, w: 8, h: 7 },     // Staircase/elevator room (walkable y=2..6, x=3..8)
  { x: 10, y: 1, w: 8, h: 7 },    // Reception/luggage room (walkable y=2..6, x=11..16)
];

const doorways = [
  { x: 7, y: 7, width: 2, height: 1 },   // Corridor ↔ Staircase
  { x: 13, y: 7, width: 2, height: 1 },   // Corridor ↔ Reception
];

export const BUDAPEST_AIRBNB_LOBBY_LAYOUT: InteriorLayout = {
  id: 'budapest-airbnb-lobby',
  widthInTiles: W,
  heightInTiles: H,
  wallGrid: buildWallGrid(W, H, rooms, doorways),
  floors: [
    { tileX: 7, tileY: 8, width: 6, height: 6, floorType: 'tile_floor' },   // Corridor - marble tile
    { tileX: 3, tileY: 2, width: 6, height: 5, floorType: 'tile_floor' },   // Staircase room - marble
    { tileX: 11, tileY: 2, width: 6, height: 5, floorType: 'wood' },        // Reception - dark wood
  ],
  decorations: [
    // Corridor decorations
    { tileX: 7, tileY: 9, type: 'plant-lux' },
    { tileX: 12, tileY: 9, type: 'plant-lux' },
    { tileX: 9, tileY: 8, type: 'rug' },
    { tileX: 10, tileY: 8, type: 'rug' },

    // Staircase/elevator room
    { tileX: 4, tileY: 2, type: 'elevator' },
    { tileX: 5, tileY: 2, type: 'staircase' },
    { tileX: 7, tileY: 3, type: 'painting' },
    { tileX: 3, tileY: 5, type: 'chandelier' },

    // Reception room
    { tileX: 13, tileY: 2, type: 'reception-desk' },
    { tileX: 14, tileY: 2, type: 'reception-desk' },
    { tileX: 11, tileY: 4, type: 'luggage-rack' },
    { tileX: 16, tileY: 3, type: 'luggage' },
    { tileX: 16, tileY: 5, type: 'armchair' },
    { tileX: 12, tileY: 5, type: 'painting' },
  ],
  entrance: { tileX: 9, tileY: 13 },
  exit: {
    tileX: 8, tileY: 13, width: 4, height: 1,
    promptText: 'Leave Building',
  },
  exitDoorStyle: 'wooden',

  // Forward exit to 2nd floor via staircase room
  forwardExit: {
    tileX: 4, tileY: 3, width: 2, height: 1,
    promptText: 'Go to 2nd Floor',
  },
  nextScene: 'BudapestAirbnbScene',
};
