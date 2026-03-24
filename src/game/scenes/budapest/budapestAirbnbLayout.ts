import { InteriorLayout, buildWallGrid } from '../../data/interiorLayouts';

// Second floor luxury apartment
// Layout: Enter from elevator area (left) → corridor → TV/living area → bedroom (end)
//         Bathroom/shower to the right of bedroom (below it in grid)

const W = 24;
const H = 16;

const rooms = [
  { x: 1, y: 7, w: 6, h: 8 },      // Entry/elevator area (walkable y=8..13, x=2..5)
  { x: 6, y: 3, w: 10, h: 12 },     // Corridor + living/TV area (walkable y=4..13, x=7..14)
  { x: 15, y: 1, w: 8, h: 8 },      // Bedroom (walkable y=2..7, x=16..21)
  { x: 15, y: 9, w: 8, h: 6 },      // Bathroom/shower (walkable y=10..13, x=16..21)
];

const doorways = [
  { x: 6, y: 9, width: 1, height: 2 },    // Entry ↔ Corridor
  { x: 15, y: 4, width: 1, height: 2 },    // Corridor ↔ Bedroom
  { x: 15, y: 10, width: 1, height: 2 },   // Corridor ↔ Bathroom
];

export const BUDAPEST_AIRBNB_LAYOUT: InteriorLayout = {
  id: 'budapest-airbnb',
  widthInTiles: W,
  heightInTiles: H,
  wallGrid: buildWallGrid(W, H, rooms, doorways),
  floors: [
    { tileX: 2, tileY: 8, width: 4, height: 6, floorType: 'tile_floor' },    // Entry - marble tile
    { tileX: 7, tileY: 4, width: 8, height: 10, floorType: 'wood' },          // Corridor/living - dark wood
    { tileX: 16, tileY: 2, width: 6, height: 6, floorType: 'carpet' },        // Bedroom - plush carpet
    { tileX: 16, tileY: 10, width: 6, height: 4, floorType: 'tile_floor' },   // Bathroom - marble tile
  ],
  decorations: [
    // Entry/elevator area
    { tileX: 3, tileY: 8, type: 'elevator' },
    { tileX: 2, tileY: 10, type: 'mirror' },
    { tileX: 5, tileY: 8, type: 'plant-lux' },
    { tileX: 3, tileY: 12, type: 'rug' },

    // Corridor / Living / TV area
    { tileX: 8, tileY: 4, type: 'painting' },
    { tileX: 11, tileY: 4, type: 'painting' },
    { tileX: 7, tileY: 6, type: 'armchair' },
    { tileX: 9, tileY: 7, type: 'coffee-table' },
    { tileX: 7, tileY: 8, type: 'chandelier' },
    { tileX: 13, tileY: 5, type: 'tv-luxury' },       // TV in front of bedroom
    { tileX: 12, tileY: 7, type: 'couch' },
    { tileX: 10, tileY: 10, type: 'rug' },
    { tileX: 11, tileY: 10, type: 'rug' },
    { tileX: 8, tileY: 12, type: 'minibar' },
    { tileX: 14, tileY: 12, type: 'plant-lux' },

    // Bedroom (end of corridor)
    { tileX: 18, tileY: 2, type: 'luxury-bed' },       // 64×64 king bed
    { tileX: 16, tileY: 3, type: 'nightstand' },
    { tileX: 21, tileY: 3, type: 'nightstand' },
    { tileX: 16, tileY: 6, type: 'wardrobe' },
    { tileX: 20, tileY: 2, type: 'painting' },
    { tileX: 19, tileY: 6, type: 'rug' },

    // Bathroom/shower (to the right of bedroom)
    { tileX: 16, tileY: 10, type: 'vanity' },
    { tileX: 19, tileY: 10, type: 'shower' },
    { tileX: 20, tileY: 10, type: 'shower' },
    { tileX: 21, tileY: 12, type: 'towel-rack' },
    { tileX: 17, tileY: 12, type: 'mirror' },
  ],
  entrance: { tileX: 3, tileY: 11 },
  exit: {
    tileX: 2, tileY: 12, width: 4, height: 2,
    promptText: 'Go to Lobby',
  },
  exitDoorStyle: 'wooden',
  previousScene: 'BudapestAirbnbLobbyScene',
};
