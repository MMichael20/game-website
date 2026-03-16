// src/game/scenes/maui/mauiMap.ts
import { NPCDef, CheckpointZone } from '../../data/mapLayout';

export const MAUI_WIDTH = 30;
export const MAUI_HEIGHT = 24;

export const enum MauiTileType {
  Sand = 0,
  SandStone = 1,
  Stone = 2,
  ShallowWater = 3,
  Ocean = 4,
  Grass = 5,
}

// 30×24 tile grid — row-major: mauiTileGrid[y][x]
export const mauiTileGrid: number[][] = Array.from({ length: MAUI_HEIGHT }, (_, y) => {
  return Array.from({ length: MAUI_WIDTH }, (_, x) => {
    // Ocean (bottom rows)
    if (y >= 20) return MauiTileType.Ocean;
    // Shallow water
    if (y >= 18) return MauiTileType.ShallowWater;
    // Beach sand
    if (y >= 14) return MauiTileType.Sand;
    // Stone path from town to beach
    if (y >= 11 && y <= 13 && x >= 12 && x <= 17) return MauiTileType.Stone;
    // Town zone (y 3-10)
    if (y >= 3 && y <= 10) {
      // Horizontal stone paths
      if ((y === 5 || y === 9) && x >= 3 && x <= 26) return MauiTileType.Stone;
      // Vertical stone paths
      if ((x === 10 || x === 20) && y >= 5 && y <= 9) return MauiTileType.Stone;
      // Shop area (sandstone)
      if (x >= 4 && x <= 8 && y >= 6 && y <= 8) return MauiTileType.SandStone;
      // House area (sandstone)
      if (x >= 12 && x <= 16 && y >= 6 && y <= 8) return MauiTileType.SandStone;
      // Airport area (sandstone)
      if (x >= 22 && x <= 27 && y >= 6 && y <= 8) return MauiTileType.SandStone;
      // Remaining town = grass
      return MauiTileType.Grass;
    }
    // Top border rows (y 0-2)
    return MauiTileType.Grass;
  });
});

// Walkability grid — true = passable
export const mauiWalkGrid: boolean[][] = Array.from({ length: MAUI_HEIGHT }, (_, y) => {
  return Array.from({ length: MAUI_WIDTH }, (_, x) => {
    // Map borders
    if (x === 0 || x === 29 || y === 0 || y === 23) return false;
    // Water is impassable
    if (y >= 18) return false;
    // Maui shop building footprint
    if (x >= 5 && x <= 7 && y >= 6 && y <= 7) return false;
    // Maui house building footprint
    if (x >= 13 && x <= 15 && y >= 6 && y <= 7) return false;
    // Maui airport building footprint
    if (x >= 23 && x <= 26 && y >= 6 && y <= 8) return false;
    // Everything else walkable
    return true;
  });
});

/** Check if a Maui tile is walkable */
export function isMauiWalkable(tileX: number, tileY: number): boolean {
  if (tileX < 0 || tileX >= MAUI_WIDTH || tileY < 0 || tileY >= MAUI_HEIGHT) return false;
  return mauiWalkGrid[tileY][tileX];
}

export const MAUI_DECORATIONS = [
  { type: 'palm-tree', tileX: 2, tileY: 14 },
  { type: 'palm-tree', tileX: 10, tileY: 14 },
  { type: 'palm-tree', tileX: 20, tileY: 14 },
  { type: 'palm-tree', tileX: 27, tileY: 14 },
  { type: 'beach-umbrella', tileX: 5, tileY: 16 },
  { type: 'beach-umbrella', tileX: 15, tileY: 16 },
  { type: 'beach-umbrella', tileX: 22, tileY: 15 },
  { type: 'beach-towel', tileX: 6, tileY: 17 },
  { type: 'beach-towel', tileX: 16, tileY: 17 },
  { type: 'surfboard', tileX: 8, tileY: 15 },
  { type: 'maui-market-stall', tileX: 8, tileY: 9 },
  { type: 'maui-fountain', tileX: 15, tileY: 5 },
  { type: 'maui-flower-pot', tileX: 4, tileY: 5 },
  { type: 'maui-flower-pot', tileX: 18, tileY: 5 },
  { type: 'maui-flower-pot', tileX: 12, tileY: 9 },
];

export const MAUI_BUILDINGS = [
  { name: 'maui-shop', tileX: 5, tileY: 6, tileW: 3, tileH: 2 },
  { name: 'maui-house', tileX: 13, tileY: 6, tileW: 3, tileH: 2 },
  { name: 'maui-airport', tileX: 23, tileY: 6, tileW: 4, tileH: 3 },
];

export const MAUI_NPCS: NPCDef[] = [
  {
    id: 'maui-shopkeeper', tileX: 9, tileY: 9, behavior: 'idle',
    texture: 'npc-maui-shopkeeper', interactable: true, onInteract: 'dialog',
    interactionData: { lines: ['Aloha! Welcome to Maui!', 'Check out our local crafts!'] },
  },
  {
    id: 'maui-airport-agent', tileX: 24, tileY: 9, behavior: 'idle',
    texture: 'npc-ticket-agent', interactable: true, onInteract: 'cutscene-trigger',
    interactionData: {
      sceneKey: 'AirplaneCutscene', sceneData: { destination: 'home' },
      lines: ['Ready to fly home?'],
    },
  },
  {
    id: 'surfer', tileX: 9, tileY: 15, behavior: 'idle',
    texture: 'npc-surfer', interactable: true, onInteract: 'dialog',
    interactionData: { lines: ['Surf is up, dude!', 'Best waves on the island right here.'] },
  },
  { id: 'maui-local-1', tileX: 16, tileY: 5, behavior: 'walk', texture: 'npc-maui-local', walkPath: [{ x: 12, y: 5 }, { x: 20, y: 5 }] },
  { id: 'maui-local-2', tileX: 6, tileY: 9, behavior: 'walk', texture: 'npc-maui-local', walkPath: [{ x: 4, y: 9 }, { x: 10, y: 9 }] },
  { id: 'beachgoer-1', tileX: 7, tileY: 17, behavior: 'sit', texture: 'npc-traveler' },
  { id: 'beachgoer-2', tileX: 17, tileY: 17, behavior: 'sit', texture: 'npc-traveler-2' },
];

export const MAUI_CHECKPOINT_ZONES: CheckpointZone[] = [];
