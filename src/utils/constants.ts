// src/utils/constants.ts
export const TILE_SIZE = 32;
export const MAP_WIDTH = 40;   // tiles
export const MAP_HEIGHT = 32;  // tiles
export const MAP_PX_WIDTH = MAP_WIDTH * TILE_SIZE;   // 960
export const MAP_PX_HEIGHT = MAP_HEIGHT * TILE_SIZE;  // 768

export const GAME_WIDTH = 800;
export const GAME_HEIGHT = 600;

// Camera zoom per device class — tunable starting values
export function getDeviceZoom(): number {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const isLandscape = w > h;
  if (w < 768) return isLandscape ? 2 : 2.5;   // phone
  if (w < 1024) return isLandscape ? 1.75 : 2;  // tablet
  return 2;                                       // desktop
}

export const DEFAULT_SPAWN = { x: 20, y: 16 }; // center of map, in tile coords

export const OUTFIT_NAMES = [
  'Purple Jacket',
  'Summer Breeze',
  'Cozy Autumn',
  'Sporty',
  'Night Out',
] as const;

export const OUTFIT_COUNT = OUTFIT_NAMES.length;

export const enum InteriorTileType {
  Wood = 0,
  Carpet = 1,
  TileFloor = 2,
  Wall = 3,
  DoorFrame = 4,
  CarpetBeige = 5,
}

// NPC trigger zone constants
export const DWELL_TIME_MS = 1000;
export const DWELL_COOLDOWN_MS = 2000;
export const TRIGGER_INDICATOR_ALPHA = 0.25;
export const TRIGGER_INDICATOR_ACTIVE_ALPHA = 0.6;
export const TRIGGER_INDICATOR_COLOR = 0xffff00;

export const FACING_OFFSETS: Record<string, { dx: number; dy: number }> = {
  up:    { dx: 0, dy: -1 },
  down:  { dx: 0, dy:  1 },
  left:  { dx: -1, dy: 0 },
  right: { dx:  1, dy: 0 },
};
