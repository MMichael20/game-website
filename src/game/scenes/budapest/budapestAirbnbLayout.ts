import { InteriorLayout, buildWallGrid } from '../../data/interiorLayouts';

const W = 16;
const H = 12;

const rooms = [
  { x: 2, y: 2, w: 6, h: 5 },    // Living room
  { x: 10, y: 2, w: 4, h: 4 },   // Kitchen
  { x: 2, y: 7, w: 6, h: 4 },    // Bedroom
  { x: 10, y: 7, w: 4, h: 4 },   // Bathroom
];

const doorways = [
  { x: 8, y: 3, width: 2, height: 1 },
  { x: 5, y: 7, width: 2, height: 1 },
  { x: 10, y: 6, width: 1, height: 1 },
];

export const BUDAPEST_AIRBNB_LAYOUT: InteriorLayout = {
  id: 'budapest-airbnb',
  widthInTiles: W,
  heightInTiles: H,
  wallGrid: buildWallGrid(W, H, rooms, doorways),
  floors: [
    { tileX: 2, tileY: 2, width: 6, height: 5, floorType: 'wood' },
    { tileX: 10, tileY: 2, width: 4, height: 4, floorType: 'tile_floor' },
    { tileX: 2, tileY: 7, width: 6, height: 4, floorType: 'carpet' },
    { tileX: 10, tileY: 7, width: 4, height: 4, floorType: 'tile_floor' },
  ],
  decorations: [
    { tileX: 3, tileY: 3, type: 'couch' },
    { tileX: 5, tileY: 4, type: 'coffee-table' },
    { tileX: 7, tileY: 3, type: 'bookshelf' },
    { tileX: 11, tileY: 3, type: 'stove' },
    { tileX: 13, tileY: 3, type: 'fridge' },
    { tileX: 3, tileY: 8, type: 'bed' },
    { tileX: 6, tileY: 8, type: 'wardrobe' },
  ],
  entrance: { tileX: 5, tileY: 8 },
  exit: {
    tileX: 3, tileY: 9, width: 4, height: 1,
    promptText: 'Leave Apartment',
  },
  exitDoorStyle: 'wooden',
};
