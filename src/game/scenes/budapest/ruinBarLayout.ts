import { InteriorLayout, buildWallGrid } from '../../data/interiorLayouts';

const W = 20;
const H = 16;

const rooms = [
  { x: 2, y: 2, w: 6, h: 5 },    // Bar area
  { x: 10, y: 2, w: 8, h: 7 },   // Seating area
  { x: 4, y: 9, w: 7, h: 5 },    // Dance floor
  { x: 12, y: 9, w: 7, h: 6 },   // Back garden
];

const doorways = [
  { x: 8, y: 4, width: 2, height: 1 },
  { x: 6, y: 7, width: 2, height: 1 },
  { x: 11, y: 9, width: 1, height: 2 },
  { x: 10, y: 12, width: 2, height: 1 },
];

export const RUIN_BAR_LAYOUT: InteriorLayout = {
  id: 'ruin-bar',
  widthInTiles: W,
  heightInTiles: H,
  wallGrid: buildWallGrid(W, H, rooms, doorways),
  floors: [
    { tileX: 2, tileY: 2, width: 6, height: 5, floorType: 'wood' },
    { tileX: 10, tileY: 2, width: 8, height: 7, floorType: 'wood' },
    { tileX: 4, tileY: 9, width: 7, height: 5, floorType: 'tile_floor' },
    { tileX: 12, tileY: 9, width: 7, height: 6, floorType: 'wood' },
  ],
  decorations: [
    { tileX: 3, tileY: 3, type: 'bp-barrels' },
    { tileX: 13, tileY: 3, type: 'bp-bathtub-couch' },
    { tileX: 15, tileY: 5, type: 'bp-mismatched-chair' },
    { tileX: 6, tileY: 10, type: 'bp-string-lights' },
    { tileX: 14, tileY: 10, type: 'bp-plants-hanging' },
    { tileX: 16, tileY: 12, type: 'bp-graffiti' },
    { tileX: 4, tileY: 12, type: 'bp-neon-sign' },
  ],
  entrance: { tileX: 10, tileY: 14 },
  exit: {
    tileX: 9, tileY: 15, width: 3, height: 1,
    promptText: 'Leave Szimpla Kert',
  },
  exitDoorStyle: 'wooden',
};
