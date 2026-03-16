// src/game/data/interiorLayouts.ts

export type FloorType = 'wood' | 'carpet' | 'carpet_beige' | 'tile_floor';

export interface FloorZone {
  tileX: number;
  tileY: number;
  width: number;
  height: number;
  floorType: FloorType;
}

export interface InteriorDecoration {
  tileX: number;
  tileY: number;
  type: string;
}

export interface ExitZone {
  tileX: number;
  tileY: number;
  width: number;
  height: number;
  promptText: string;
}

export interface InteriorLayout {
  id: string;
  widthInTiles: number;
  heightInTiles: number;
  wallGrid: boolean[][];
  floors: FloorZone[];
  decorations: InteriorDecoration[];
  entrance: { tileX: number; tileY: number };
  exit: ExitZone;
  cameraZoom?: number;
  forwardExit?: ExitZone;
  nextScene?: string;
  previousScene?: string;
}

interface RoomRect {
  x: number; y: number; w: number; h: number;
}

interface Doorway {
  x: number; y: number; width: number; height: number;
}

export function buildWallGrid(
  mapW: number, mapH: number,
  rooms: RoomRect[],
  doorways: Doorway[],
): boolean[][] {
  const grid: boolean[][] = Array.from({ length: mapH }, () =>
    Array.from({ length: mapW }, () => true),
  );

  for (const r of rooms) {
    for (let y = r.y + 1; y < r.y + r.h - 1; y++) {
      for (let x = r.x + 1; x < r.x + r.w - 1; x++) {
        if (y >= 0 && y < mapH && x >= 0 && x < mapW) {
          grid[y][x] = false;
        }
      }
    }
  }

  for (const d of doorways) {
    for (let y = d.y; y < d.y + d.height; y++) {
      for (let x = d.x; x < d.x + d.width; x++) {
        if (y >= 0 && y < mapH && x >= 0 && x < mapW) {
          grid[y][x] = false;
        }
      }
    }
  }

  return grid;
}

const HOUSE_ROOMS: RoomRect[] = [
  { x: 0, y: 0, w: 11, h: 12 },
  { x: 10, y: 0, w: 11, h: 12 },
  { x: 20, y: 0, w: 10, h: 12 },
  { x: 0, y: 11, w: 21, h: 13 },
  { x: 20, y: 11, w: 10, h: 13 },
];

const HOUSE_DOORWAYS: Doorway[] = [
  { x: 10, y: 5, width: 1, height: 2 },
  { x: 20, y: 5, width: 1, height: 2 },
  { x: 4, y: 11, width: 2, height: 1 },
  { x: 14, y: 11, width: 2, height: 1 },
  { x: 20, y: 17, width: 1, height: 2 },
];

export const MICHAELS_HOUSE_LAYOUT: InteriorLayout = {
  id: 'michaels_house',
  widthInTiles: 30,
  heightInTiles: 24,
  wallGrid: buildWallGrid(30, 24, HOUSE_ROOMS, HOUSE_DOORWAYS),
  floors: [
    { tileX: 1, tileY: 1, width: 9, height: 10, floorType: 'carpet' },
    { tileX: 11, tileY: 1, width: 9, height: 10, floorType: 'tile_floor' },
    { tileX: 21, tileY: 1, width: 8, height: 10, floorType: 'tile_floor' },
    { tileX: 1, tileY: 12, width: 19, height: 11, floorType: 'carpet_beige' },
    { tileX: 21, tileY: 12, width: 8, height: 11, floorType: 'wood' },
  ],
  decorations: [
    { tileX: 2, tileY: 2, type: 'couch' },
    { tileX: 2, tileY: 6, type: 'bookshelf' },
    { tileX: 5, tileY: 4, type: 'table' },
    { tileX: 12, tileY: 2, type: 'stove' },
    { tileX: 14, tileY: 2, type: 'sink' },
    { tileX: 15, tileY: 5, type: 'table' },
    { tileX: 22, tileY: 2, type: 'toilet' },
    { tileX: 25, tileY: 2, type: 'sink' },
    { tileX: 3, tileY: 14, type: 'bed' },
    { tileX: 8, tileY: 14, type: 'bookshelf' },
    { tileX: 22, tileY: 14, type: 'desk' },
    { tileX: 25, tileY: 14, type: 'bed' },
    { tileX: 22, tileY: 18, type: 'bookshelf' },
  ],
  entrance: { tileX: 10, tileY: 22 },
  exit: {
    tileX: 9,
    tileY: 22,
    width: 3,
    height: 2,
    promptText: 'Tap to go out',
  },
};

export function createInteriorWalkCheck(layout: InteriorLayout) {
  return (tileX: number, tileY: number): boolean => {
    if (tileX < 0 || tileX >= layout.widthInTiles || tileY < 0 || tileY >= layout.heightInTiles) {
      return false;
    }
    if (layout.wallGrid[tileY][tileX]) return false;
    for (const deco of layout.decorations) {
      if (deco.tileX === tileX && deco.tileY === tileY) return false;
    }
    return true;
  };
}
