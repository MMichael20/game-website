import { InteriorLayout, buildWallGrid } from '../../data/interiorLayouts';

const W = 40;
const H = 14;

const rooms = [
  { x: 1, y: 3, w: 38, h: 8 },
  { x: 15, y: 11, w: 10, h: 2 },
];

const doorways = [
  { x: 15, y: 11, width: 10, height: 1 },
];

export const BUDAPEST_AIRPORT_LAYOUT: InteriorLayout = {
  id: 'budapest-airport',
  widthInTiles: W,
  heightInTiles: H,
  wallGrid: buildWallGrid(W, H, rooms, doorways),
  floors: [
    { tileX: 1, tileY: 3, width: 38, height: 8, floorType: 'tile_floor' },
    { tileX: 15, tileY: 11, width: 10, height: 2, floorType: 'tile_floor' },
  ],
  decorations: [
    { tileX: 10, tileY: 4, type: 'bp-luggage-carousel' },
    { tileX: 26, tileY: 4, type: 'bp-luggage-carousel' },
    { tileX: 6, tileY: 7, type: 'bp-exchange-booth' },
    { tileX: 20, tileY: 11, type: 'bp-bus-stop-sign' },
  ],
  entrance: { tileX: 20, tileY: 5 },
  exit: {
    tileX: 15, tileY: 13, width: 10, height: 1,
    promptText: 'Take Bus 100E to the city',
  },
  exitDoorStyle: 'glass',
};
