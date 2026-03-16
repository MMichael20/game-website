// src/utils/constants.ts
export const TILE_SIZE = 32;
export const MAP_WIDTH = 30;   // tiles
export const MAP_HEIGHT = 24;  // tiles
export const MAP_PX_WIDTH = MAP_WIDTH * TILE_SIZE;   // 960
export const MAP_PX_HEIGHT = MAP_HEIGHT * TILE_SIZE;  // 768

export const GAME_WIDTH = 800;
export const GAME_HEIGHT = 600;

// Camera zoom per device class — tunable starting values
export function getDeviceZoom(): number {
  const w = window.innerWidth;
  if (w < 768) return 1.5;   // phone
  if (w < 1024) return 1.75; // tablet
  return 2;                   // desktop
}

export function isTouchDevice(): boolean {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

export const DEFAULT_SPAWN = { x: 15, y: 12 }; // center of map, in tile coords

export const OUTFIT_NAMES = [
  'Casual', 'Formal', 'Beach', 'Winter',
  'Gothic', 'Sporty', 'Festival', 'Elegant',
] as const;

export const OUTFIT_COUNT = OUTFIT_NAMES.length;
