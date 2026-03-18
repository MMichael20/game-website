import { InteriorLayout, buildWallGrid } from '../../data/interiorLayouts';

const W = 40;
const H = 16;

const rooms = [
  { x: 1, y: 3, w: 38, h: 8 },    // Main arrivals hall (walkable y=4..9)
  { x: 12, y: 10, w: 16, h: 6 },  // Exit corridor (walkable y=11..14)
];

const doorways = [
  { x: 12, y: 10, width: 16, height: 1 },  // Hall to corridor connection
];

export const BUDAPEST_AIRPORT_LAYOUT: InteriorLayout = {
  id: 'budapest-airport',
  widthInTiles: W,
  heightInTiles: H,
  wallGrid: buildWallGrid(W, H, rooms, doorways),
  floors: [
    { tileX: 1, tileY: 3, width: 38, height: 8, floorType: 'tile_floor' },
    { tileX: 12, tileY: 10, width: 16, height: 6, floorType: 'tile_floor' },
  ],
  decorations: [
    { tileX: 10, tileY: 4, type: 'bp-luggage-carousel' },
    { tileX: 26, tileY: 4, type: 'bp-luggage-carousel' },
    { tileX: 6, tileY: 7, type: 'bp-exchange-booth' },
    { tileX: 20, tileY: 13, type: 'bp-bus-stop-sign' },
  ],
  entrance: { tileX: 20, tileY: 5 },
  exit: {
    tileX: 15, tileY: 14, width: 10, height: 1,
    promptText: 'Take Bus 100E to the city',
  },
  exitDoorStyle: 'glass',
};
