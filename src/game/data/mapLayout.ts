// src/game/data/mapLayout.ts
import { MAP_WIDTH, MAP_HEIGHT, TILE_SIZE } from '../../utils/constants';

export const enum TileType {
  Grass = 0,
  Dirt = 1,
  Stone = 2,
  DarkGrass = 3,
}

// 30x24 tile grid — 0=grass, 1=dirt, 2=stone, 3=dark grass
// Row-major: tileGrid[y][x]
export const tileGrid: number[][] = Array.from({ length: MAP_HEIGHT }, (_, y) => {
  return Array.from({ length: MAP_WIDTH }, (_, x) => {
    // Main east-west path
    if (y >= 11 && y <= 12 && x >= 3 && x <= 27) return TileType.Dirt;
    // North-south path
    if (x >= 14 && x <= 15 && y >= 3 && y <= 20) return TileType.Dirt;
    // Stone plaza around restaurant (top-left area)
    if (x >= 5 && x <= 9 && y >= 5 && y <= 9) return TileType.Stone;
    // Stone plaza around cinema (top-right area)
    if (x >= 21 && x <= 25 && y >= 5 && y <= 9) return TileType.Stone;
    // Park area (bottom-center) — dark grass
    if (x >= 10 && x <= 20 && y >= 15 && y <= 21) return TileType.DarkGrass;
    // Default grass
    return TileType.Grass;
  });
});

// Walkability grid — true = passable
// Buildings, water, dense decorations marked as impassable
export const walkGrid: boolean[][] = Array.from({ length: MAP_HEIGHT }, (_, y) => {
  return Array.from({ length: MAP_WIDTH }, (_, x) => {
    // Map borders
    if (x <= 0 || x >= MAP_WIDTH - 1 || y <= 0 || y >= MAP_HEIGHT - 1) return false;
    // Building footprints (3x3 tile buildings)
    // Restaurant building (inside)
    if (x >= 6 && x <= 8 && y >= 6 && y <= 8) return false;
    // Cinema building (inside)
    if (x >= 22 && x <= 24 && y >= 6 && y <= 8) return false;
    // Pond in park
    if (x >= 13 && x <= 16 && y >= 17 && y <= 19) return false;
    // Fences/walls along edges
    if (y === 2 && (x < 5 || x > 25)) return false;
    return true;
  });
});

export interface CheckpointZone {
  id: string;
  tileX: number;
  tileY: number;
  width: number;  // in tiles
  height: number; // in tiles
  promptText: string;
}

export const CHECKPOINT_ZONES: CheckpointZone[] = [
  { id: 'restaurant', tileX: 5, tileY: 5, width: 2, height: 1, promptText: 'Press E to enter restaurant' },
  { id: 'park', tileX: 14, tileY: 15, width: 2, height: 1, promptText: 'Press E to play in the park' },
  { id: 'cinema', tileX: 21, tileY: 5, width: 2, height: 1, promptText: 'Press E to enter cinema' },
];

export interface DecorationDef {
  type: string;
  tileX: number;
  tileY: number;
}

export const DECORATIONS: DecorationDef[] = [
  // Trees
  { type: 'tree', tileX: 2, tileY: 3 },
  { type: 'tree', tileX: 3, tileY: 8 },
  { type: 'tree', tileX: 27, tileY: 3 },
  { type: 'tree', tileX: 28, tileY: 10 },
  { type: 'tree', tileX: 10, tileY: 16 },
  { type: 'tree', tileX: 20, tileY: 16 },
  { type: 'tree', tileX: 11, tileY: 20 },
  { type: 'tree', tileX: 19, tileY: 20 },
  // Benches
  { type: 'bench', tileX: 12, tileY: 12 },
  { type: 'bench', tileX: 18, tileY: 12 },
  { type: 'bench', tileX: 15, tileY: 21 },
  // Lamps
  { type: 'lamp', tileX: 5, tileY: 11 },
  { type: 'lamp', tileX: 25, tileY: 11 },
  { type: 'lamp', tileX: 14, tileY: 5 },
  { type: 'lamp', tileX: 14, tileY: 20 },
  // Flowers
  { type: 'flower', tileX: 11, tileY: 17 },
  { type: 'flower', tileX: 19, tileY: 17 },
  { type: 'flower', tileX: 12, tileY: 19 },
  { type: 'flower', tileX: 18, tileY: 19 },
  // Fountain (park center)
  { type: 'fountain', tileX: 15, tileY: 18 },
  // Fences
  { type: 'fence', tileX: 4, tileY: 4 },
  { type: 'fence', tileX: 10, tileY: 4 },
  { type: 'fence', tileX: 20, tileY: 4 },
  { type: 'fence', tileX: 26, tileY: 4 },
];

export interface NPCDef {
  id: string;
  tileX: number;
  tileY: number;
  behavior: 'idle' | 'walk' | 'sit';
  walkPath?: Array<{ x: number; y: number }>; // tile coords
}

export const NPC_DEFS: NPCDef[] = [
  { id: 'npc-1', tileX: 7, tileY: 10, behavior: 'walk', walkPath: [{ x: 7, y: 10 }, { x: 12, y: 10 }, { x: 12, y: 12 }, { x: 7, y: 12 }] },
  { id: 'npc-2', tileX: 12, tileY: 12, behavior: 'sit' },
  { id: 'npc-3', tileX: 23, tileY: 10, behavior: 'walk', walkPath: [{ x: 23, y: 10 }, { x: 23, y: 12 }, { x: 26, y: 12 }, { x: 26, y: 10 }] },
  { id: 'npc-4', tileX: 15, tileY: 21, behavior: 'sit' },
];

/** Check if a tile is walkable */
export function isWalkable(tileX: number, tileY: number): boolean {
  if (tileX < 0 || tileX >= MAP_WIDTH || tileY < 0 || tileY >= MAP_HEIGHT) return false;
  return walkGrid[tileY][tileX];
}

/** Convert tile coords to world pixel coords (center of tile) */
export function tileToWorld(tileX: number, tileY: number): { x: number; y: number } {
  return { x: tileX * TILE_SIZE + TILE_SIZE / 2, y: tileY * TILE_SIZE + TILE_SIZE / 2 };
}

/** Convert world pixel coords to tile coords */
export function worldToTile(worldX: number, worldY: number): { x: number; y: number } {
  return { x: Math.floor(worldX / TILE_SIZE), y: Math.floor(worldY / TILE_SIZE) };
}
