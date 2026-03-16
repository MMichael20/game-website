// src/game/data/mapLayout.ts
import { MAP_WIDTH, MAP_HEIGHT, TILE_SIZE } from '../../utils/constants';

export const enum TileType {
  Grass = 0,
  Dirt = 1,
  Stone = 2,
  DarkGrass = 3,
  Tarmac = 4,
  RunwayMarking = 5,
  ParkingLot = 6,
}

// 40x38 tile grid — 0=grass, 1=dirt, 2=stone, 3=dark grass, 4=tarmac, 5=runwaymarking, 6=parkinglot
// Row-major: tileGrid[y][x]
export const tileGrid: number[][] = Array.from({ length: MAP_HEIGHT }, (_, y) => {
  return Array.from({ length: MAP_WIDTH }, (_, x) => {
    // ── Airport zone (rows 28-37) ──
    // Runway center line (row 36)
    if (y === 36 && x >= 5 && x <= 34) return TileType.RunwayMarking;
    // Runway rows (35-37) — tarmac except center marking
    if (y >= 35 && y <= 37 && x >= 5 && x <= 34) return TileType.Tarmac;
    // Tarmac apron (rows 32-34)
    if (y >= 32 && y <= 34 && x >= 5 && x <= 34) return TileType.Tarmac;
    // Parking lots: left block (x=8-13, y=28-31) and right block (x=26-31, y=28-31)
    if (y >= 28 && y <= 31 && ((x >= 8 && x <= 13) || (x >= 26 && x <= 31))) return TileType.ParkingLot;
    // Access road (row 28, connecting parking to terminal)
    if (y === 28 && x >= 8 && x <= 31) return TileType.Stone;

    // ── Existing town zones ──
    // Main east-west path
    if (y >= 14 && y <= 15 && x >= 3 && x <= 37) return TileType.Dirt;
    // North-south path
    if (x >= 19 && x <= 20 && y >= 3 && y <= 28) return TileType.Dirt;
    // Secondary east-west path (south, through park)
    if (y >= 23 && y <= 24 && x >= 13 && x <= 27) return TileType.Dirt;
    // Restaurant plaza (top-left)
    if (x >= 5 && x <= 11 && y >= 5 && y <= 11) return TileType.Stone;
    // Cinema plaza (top-right)
    if (x >= 28 && x <= 34 && y >= 5 && y <= 11) return TileType.Stone;
    // Market/garden area (left side)
    if (x >= 4 && x <= 10 && y >= 17 && y <= 22) return TileType.Stone;
    // Cafe area (right side)
    if (x >= 30 && x <= 36 && y >= 17 && y <= 22) return TileType.Stone;
    // Park area (center-bottom)
    if (x >= 13 && x <= 27 && y >= 18 && y <= 28) return TileType.DarkGrass;
    // Default grass
    return TileType.Grass;
  });
});

// Walkability grid — true = passable
// Only buildings are impassable (user requested no blocking on the map)
export const walkGrid: boolean[][] = Array.from({ length: MAP_HEIGHT }, (_, y) => {
  return Array.from({ length: MAP_WIDTH }, (_, x) => {
    // Map borders
    if (x <= 0 || x >= MAP_WIDTH - 1 || y <= 0 || y >= MAP_HEIGHT - 1) return false;
    // Restaurant building footprint
    if (x >= 7 && x <= 9 && y >= 7 && y <= 9) return false;
    // Cinema building footprint
    if (x >= 30 && x <= 32 && y >= 7 && y <= 9) return false;
    // Michael's House footprint
    if (x >= 14 && x <= 16 && y >= 3 && y <= 5) return false;
    // Hadar's House footprint
    if (x >= 24 && x <= 26 && y >= 3 && y <= 5) return false;
    // Terminal building footprint (new airport zone)
    if (x >= 14 && x <= 25 && y >= 29 && y <= 31) return false;
    // Tarmac + runway — all blocked (rows 32-37)
    if (x >= 5 && x <= 34 && y >= 32 && y <= 37) return false;
    // Everything else is walkable
    return true;
  });
});

export interface CheckpointZone {
  id: string;
  centerX: number;  // world pixel X
  centerY: number;  // world pixel Y
  radius: number;   // detection radius in pixels
  promptText: string;
}

export const CHECKPOINT_ZONES: CheckpointZone[] = [
  // Zones centered at building doors with generous radius
  { id: 'restaurant', centerX: 272, centerY: 336, radius: 72, promptText: 'Tap to go in' },
  { id: 'park', centerX: 624, centerY: 688, radius: 72, promptText: 'Tap to go in' },
  { id: 'cinema', centerX: 1008, centerY: 336, radius: 72, promptText: 'Tap to go in' },
  { id: 'michaels_house', centerX: 496, centerY: 208, radius: 72, promptText: 'Tap to go in' },
  { id: 'airport', centerX: 19 * 32 + 16, centerY: 29 * 32, radius: 56, promptText: 'Enter Airport' },
  { id: 'hadars_house', centerX: 816, centerY: 208, radius: 72, promptText: 'Tap to go in' },
];

export interface DecorationDef {
  type: string;
  tileX: number;
  tileY: number;
}

export const DECORATIONS: DecorationDef[] = [
  // ── Trees (scattered throughout) ──
  { type: 'tree', tileX: 2, tileY: 3 },
  { type: 'tree', tileX: 3, tileY: 9 },
  { type: 'tree', tileX: 37, tileY: 3 },
  { type: 'tree', tileX: 38, tileY: 10 },
  { type: 'tree', tileX: 13, tileY: 20 },
  { type: 'tree', tileX: 27, tileY: 20 },
  { type: 'tree', tileX: 14, tileY: 27 },
  { type: 'tree', tileX: 26, tileY: 27 },
  { type: 'tree', tileX: 2, tileY: 20 },
  { type: 'tree', tileX: 38, tileY: 20 },
  { type: 'tree', tileX: 15, tileY: 4 },
  { type: 'tree', tileX: 28, tileY: 4 },
  { type: 'tree', tileX: 2, tileY: 28 },
  { type: 'tree', tileX: 38, tileY: 28 },
  { type: 'tree', tileX: 12, tileY: 12 },
  { type: 'tree', tileX: 28, tileY: 12 },

  // ── Benches (along paths) ──
  { type: 'bench', tileX: 16, tileY: 15 },
  { type: 'bench', tileX: 24, tileY: 15 },
  { type: 'bench', tileX: 20, tileY: 28 },
  { type: 'bench', tileX: 8, tileY: 14 },
  { type: 'bench', tileX: 33, tileY: 14 },
  { type: 'bench', tileX: 8, tileY: 24 },

  // ── Lamps (along main paths) ──
  { type: 'lamp', tileX: 6, tileY: 14 },
  { type: 'lamp', tileX: 12, tileY: 14 },
  { type: 'lamp', tileX: 28, tileY: 14 },
  { type: 'lamp', tileX: 35, tileY: 14 },
  { type: 'lamp', tileX: 19, tileY: 6 },
  { type: 'lamp', tileX: 19, tileY: 27 },
  { type: 'lamp', tileX: 6, tileY: 22 },
  { type: 'lamp', tileX: 35, tileY: 22 },

  // ── Flowers (in and around park) ──
  { type: 'flower', tileX: 15, tileY: 21 },
  { type: 'flower', tileX: 25, tileY: 21 },
  { type: 'flower', tileX: 16, tileY: 25 },
  { type: 'flower', tileX: 24, tileY: 25 },
  { type: 'flower', tileX: 20, tileY: 22 },
  { type: 'flower', tileX: 18, tileY: 26 },
  { type: 'flower', tileX: 22, tileY: 26 },

  // ── Fountain (park center) ──
  { type: 'fountain', tileX: 20, tileY: 24 },

  // ── Fences (along north edge) ──
  { type: 'fence', tileX: 4, tileY: 4 },
  { type: 'fence', tileX: 12, tileY: 4 },
  { type: 'fence', tileX: 27, tileY: 4 },
  { type: 'fence', tileX: 35, tileY: 4 },

  // ── Bushes (edges, near buildings, borders) ──
  { type: 'bush', tileX: 1, tileY: 6 },
  { type: 'bush', tileX: 1, tileY: 12 },
  { type: 'bush', tileX: 38, tileY: 6 },
  { type: 'bush', tileX: 38, tileY: 14 },
  { type: 'bush', tileX: 12, tileY: 18 },
  { type: 'bush', tileX: 28, tileY: 18 },
  { type: 'bush', tileX: 4, tileY: 28 },
  { type: 'bush', tileX: 36, tileY: 28 },
  { type: 'bush', tileX: 1, tileY: 18 },
  { type: 'bush', tileX: 38, tileY: 24 },
  { type: 'bush', tileX: 13, tileY: 5 },
  { type: 'bush', tileX: 28, tileY: 5 },

  // ── Rocks (scattered in nature areas) ──
  { type: 'rock', tileX: 3, tileY: 16 },
  { type: 'rock', tileX: 37, tileY: 16 },
  { type: 'rock', tileX: 17, tileY: 26 },
  { type: 'rock', tileX: 23, tileY: 26 },
  { type: 'rock', tileX: 1, tileY: 29 },
  { type: 'rock', tileX: 38, tileY: 29 },
  { type: 'rock', tileX: 36, tileY: 4 },
  { type: 'rock', tileX: 2, tileY: 14 },

  // ── Cafe tables (outdoor seating area) ──
  { type: 'cafeTable', tileX: 31, tileY: 18 },
  { type: 'cafeTable', tileX: 33, tileY: 18 },
  { type: 'cafeTable', tileX: 35, tileY: 18 },
  { type: 'cafeTable', tileX: 31, tileY: 21 },
  { type: 'cafeTable', tileX: 34, tileY: 21 },

  // ── Street signs (at intersections) ──
  { type: 'streetSign', tileX: 18, tileY: 13 },
  { type: 'streetSign', tileX: 21, tileY: 13 },

  // ── Garden beds (market/garden area) ──
  { type: 'gardenBed', tileX: 5, tileY: 18 },
  { type: 'gardenBed', tileX: 5, tileY: 20 },
  { type: 'gardenBed', tileX: 9, tileY: 18 },
  { type: 'gardenBed', tileX: 9, tileY: 20 },
  { type: 'gardenBed', tileX: 7, tileY: 22 },

  // ── Airport decorations ──
  { type: 'airport-fence', tileX: 5, tileY: 32 },
  { type: 'airport-fence', tileX: 8, tileY: 32 },
  { type: 'airport-fence', tileX: 11, tileY: 32 },
  { type: 'airport-fence', tileX: 26, tileY: 32 },
  { type: 'airport-fence', tileX: 29, tileY: 32 },
  { type: 'airport-fence', tileX: 32, tileY: 32 },
  { type: 'windsock', tileX: 34, tileY: 35 },
  { type: 'runway-light', tileX: 5, tileY: 35 },
  { type: 'runway-light', tileX: 5, tileY: 37 },
  { type: 'runway-light', tileX: 34, tileY: 35 },
  { type: 'runway-light', tileX: 34, tileY: 37 },
  { type: 'tree', tileX: 7, tileY: 27 },
  { type: 'tree', tileX: 32, tileY: 27 },
  { type: 'tree', tileX: 6, tileY: 30 },
  { type: 'tree', tileX: 33, tileY: 30 },
];

export interface NPCDef {
  id: string;
  tileX: number;
  tileY: number;
  behavior: 'idle' | 'walk' | 'sit';
  walkPath?: Array<{ x: number; y: number }>; // tile coords
  texture?: string;
  speed?: number;
  facingDirection?: 'up' | 'down' | 'left' | 'right'; // default 'down'
  // Interaction fields (all optional, existing NPCs unaffected)
  interactable?: boolean;
  onInteract?: 'dialog' | 'cutscene-trigger';
  interactionData?: {
    lines?: string[];       // for dialog type
    sceneKey?: string;      // for cutscene-trigger type
    sceneData?: any;        // data to pass to target scene
  };
}

export const NPC_DEFS: NPCDef[] = [
  // Wizard strolling near restaurant
  { id: 'npc-1', tileX: 8, tileY: 13, behavior: 'walk', texture: 'npc-default',
    walkPath: [{ x: 8, y: 13 }, { x: 16, y: 13 }, { x: 16, y: 15 }, { x: 8, y: 15 }] },
  // Reader sitting on bench
  { id: 'npc-2', tileX: 16, tileY: 15, behavior: 'sit', texture: 'npc-reader' },
  // Villager walking near cinema
  { id: 'npc-3', tileX: 31, tileY: 13, behavior: 'walk', texture: 'npc-villager',
    walkPath: [{ x: 31, y: 13 }, { x: 31, y: 15 }, { x: 35, y: 15 }, { x: 35, y: 13 }] },
  // Reader at park bench
  { id: 'npc-4', tileX: 20, tileY: 28, behavior: 'sit', texture: 'npc-reader' },
  // Jogger running laps in park
  { id: 'npc-5', tileX: 15, tileY: 20, behavior: 'walk', texture: 'npc-jogger', speed: 70,
    walkPath: [{ x: 15, y: 20 }, { x: 25, y: 20 }, { x: 25, y: 27 }, { x: 15, y: 27 }] },
  // Shopkeeper at market
  { id: 'npc-6', tileX: 7, tileY: 19, behavior: 'idle', texture: 'npc-shopkeeper' },
  // Villager at cafe
  { id: 'npc-7', tileX: 33, tileY: 19, behavior: 'idle', texture: 'npc-villager' },
  // Stroller along main path
  { id: 'npc-8', tileX: 24, tileY: 14, behavior: 'walk', texture: 'npc-villager',
    walkPath: [{ x: 24, y: 14 }, { x: 32, y: 14 }, { x: 32, y: 15 }, { x: 24, y: 15 }] },

  // ── Airport pedestrians ──
  { id: 'airport-ped-1', tileX: 16, tileY: 28, behavior: 'walk', texture: 'npc-suitcase',
    walkPath: [{ x: 16, y: 28 }, { x: 22, y: 28 }] },
  { id: 'airport-ped-2', tileX: 20, tileY: 27, behavior: 'walk', texture: 'npc-suitcase',
    walkPath: [{ x: 20, y: 27 }, { x: 20, y: 28 }] },
  { id: 'airport-ped-3', tileX: 10, tileY: 29, behavior: 'idle', texture: 'npc-villager' },
  { id: 'airport-ped-4', tileX: 28, tileY: 28, behavior: 'walk', texture: 'npc-suitcase',
    walkPath: [{ x: 28, y: 28 }, { x: 25, y: 28 }] },
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
