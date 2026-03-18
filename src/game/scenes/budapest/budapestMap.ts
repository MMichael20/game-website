// src/game/scenes/budapest/budapestMap.ts
import { NPCDef, CheckpointZone, tileToWorld } from '../../data/mapLayout';

export const BUDAPEST_WIDTH = 55;
export const BUDAPEST_HEIGHT = 35;

export const enum BudapestTileType {
  Cobblestone = 0,
  Road = 1,
  TramTrack = 2,
  Sidewalk = 3,
  Grass = 4,
  Water = 5,
  Bridge = 6,
  Plaza = 7,
  ParkPath = 8,
  BudaCastle = 9,
}

// 55×35 tile grid — row-major: budapestTileGrid[y][x]
export const budapestTileGrid: number[][] = Array.from({ length: BUDAPEST_HEIGHT }, (_, y) => {
  return Array.from({ length: BUDAPEST_WIDTH }, (_, x) => {
    // Buda Castle elevated area (y=0-6, x=0-12)
    if (y >= 0 && y <= 2 && x >= 0 && x <= 12) return BudapestTileType.BudaCastle;
    if (y >= 3 && y <= 6 && x >= 0 && x <= 12) return BudapestTileType.BudaCastle;
    // Fisherman's Bastion (y=3-6, x=3-10)
    if (y >= 3 && y <= 6 && x >= 3 && x <= 10) return BudapestTileType.BudaCastle;
    // Buda riverside grass (y=7-9)
    if (y >= 7 && y <= 9) return BudapestTileType.Grass;

    // DANUBE RIVER (y=10-12, full width)
    if (y >= 10 && y <= 12) {
      // Chain Bridge (x=22-26)
      if (x >= 22 && x <= 26) return BudapestTileType.Bridge;
      return BudapestTileType.Water;
    }

    // Pest riverside promenade (y=13)
    if (y === 13) return BudapestTileType.Sidewalk;
    // Riverside road (y=14)
    if (y === 14) return BudapestTileType.Road;
    // Parliament plaza (y=13-15, x=10-18)
    if (y >= 13 && y <= 15 && x >= 10 && x <= 18) return BudapestTileType.Plaza;

    // Major road with tram (y=16-18)
    if (y === 16) return BudapestTileType.Road;
    if (y === 17) return BudapestTileType.TramTrack;
    if (y === 18) return BudapestTileType.Road;

    // Erzsébet Square / Budapest Eye area (y=19-23, x=24-30)
    if (y >= 19 && y <= 23 && x >= 24 && x <= 30) return BudapestTileType.Plaza;

    // Jewish Quarter entrance area (y=24-26, x=40-44)
    if (y >= 24 && y <= 26 && x >= 40 && x <= 44) return BudapestTileType.Cobblestone;

    // Southern streets (y=28-30)
    if (y >= 28 && y <= 30) return BudapestTileType.Cobblestone;

    // Park paths
    if (y === 22 && x >= 15 && x <= 23) return BudapestTileType.ParkPath;
    if (x === 20 && y >= 19 && y <= 25) return BudapestTileType.ParkPath;

    // Sidewalks along roads
    if (y === 15 || y === 19) return BudapestTileType.Sidewalk;

    // Southern transport hub area (y=31-34)
    if (y >= 31 && y <= 34 && x >= 20 && x <= 30) return BudapestTileType.Cobblestone;
    if (y >= 31 && y <= 34) return BudapestTileType.Grass;

    // Default: cobblestone for urban areas (y >= 13), grass for Buda side
    if (y >= 13) return BudapestTileType.Cobblestone;
    return BudapestTileType.Grass;
  });
});

// Walkability grid — true = passable
export const budapestWalkGrid: boolean[][] = Array.from({ length: BUDAPEST_HEIGHT }, (_, y) => {
  return Array.from({ length: BUDAPEST_WIDTH }, (_, x) => {
    // Map borders
    if (x === 0 || x === BUDAPEST_WIDTH - 1 || y === 0 || y === BUDAPEST_HEIGHT - 1) return false;
    // Buda Castle area (impassable decorative, except paths)
    if (y >= 0 && y <= 6 && x >= 0 && x <= 12) return false;
    // Fisherman's Bastion building footprint
    if (y >= 3 && y <= 5 && x >= 3 && x <= 10) return false;
    // Danube (impassable except bridge)
    if (y >= 10 && y <= 12 && !(x >= 22 && x <= 26)) return false;
    // Parliament building footprint
    if (y >= 13 && y <= 15 && x >= 11 && x <= 17) return false;
    // Budapest Eye structure
    if (y >= 20 && y <= 22 && x >= 26 && x <= 28) return false;
    // Dohány Synagogue footprint
    if (y >= 24 && y <= 26 && x >= 40 && x <= 44) return false;
    // Airbnb building
    if (y >= 28 && y <= 30 && x >= 34 && x <= 37) return false;
    // Restaurant buildings
    if (y >= 28 && y <= 30 && x >= 8 && x <= 12) return false;
    if (y >= 28 && y <= 30 && x >= 16 && x <= 20) return false;
    // Shop buildings along streets
    if (y >= 21 && y <= 22 && x >= 35 && x <= 38) return false;
    if (y >= 21 && y <= 22 && x >= 45 && x <= 48) return false;
    // Everything else walkable
    return true;
  });
});

/** Check if a Budapest tile is walkable */
export function isBudapestWalkable(tx: number, ty: number): boolean {
  if (ty < 0 || ty >= BUDAPEST_HEIGHT || tx < 0 || tx >= BUDAPEST_WIDTH) return false;
  return budapestWalkGrid[ty][tx];
}

/** Get the tile type at a given position */
export function getBudapestTileType(tx: number, ty: number): number {
  if (ty < 0 || ty >= BUDAPEST_HEIGHT || tx < 0 || tx >= BUDAPEST_WIDTH) return BudapestTileType.Water;
  return budapestTileGrid[ty][tx];
}

export const BUDAPEST_NPCS: NPCDef[] = [
  // Interactable NPCs (4)
  {
    id: 'bp-tourist-info', tileX: 28, tileY: 19, behavior: 'idle',
    texture: 'npc-bp-guide', interactable: true, onInteract: 'dialog',
    facingDirection: 'down',
    interactionData: { lines: ['The Eye gives the best sunset views!', 'You can see Parliament and the Castle from the top!'] },
  },
  {
    id: 'bp-hotdog-vendor', tileX: 22, tileY: 20, behavior: 'idle',
    texture: 'npc-bp-vendor', interactable: true, onInteract: 'dialog',
    facingDirection: 'down',
    interactionData: { lines: ['Hot dog? Kolbász? Best in Budapest!', 'Try it with mustard and pickled peppers!'] },
  },
  {
    id: 'bp-tram-conductor', tileX: 12, tileY: 17, behavior: 'idle',
    texture: 'npc-bp-conductor', interactable: true, onInteract: 'dialog',
    facingDirection: 'down',
    interactionData: { lines: ['Tram 2 is the most scenic in Europe!', 'Runs right along the Danube river.'] },
  },
  {
    id: 'bp-photographer', tileX: 14, tileY: 13, behavior: 'idle',
    texture: 'npc-bp-tourist', interactable: true, onInteract: 'dialog',
    facingDirection: 'up',
    interactionData: { lines: ['Parliament is gorgeous!', 'Can you take my photo?'] },
  },
  // Walking NPCs (10)
  { id: 'bp-walker-1', tileX: 5, tileY: 16, behavior: 'walk', texture: 'npc-bp-local',
    walkPath: [{ x: 5, y: 16 }, { x: 20, y: 16 }] },
  { id: 'bp-walker-2', tileX: 30, tileY: 16, behavior: 'walk', texture: 'npc-bp-local-2',
    walkPath: [{ x: 30, y: 16 }, { x: 50, y: 16 }] },
  { id: 'bp-walker-3', tileX: 20, tileY: 19, behavior: 'walk', texture: 'npc-bp-tourist',
    walkPath: [{ x: 20, y: 19 }, { x: 20, y: 25 }] },
  { id: 'bp-walker-4', tileX: 35, tileY: 24, behavior: 'walk', texture: 'npc-bp-local',
    walkPath: [{ x: 35, y: 24 }, { x: 35, y: 30 }] },
  { id: 'bp-walker-5', tileX: 15, tileY: 28, behavior: 'walk', texture: 'npc-bp-tourist-2',
    walkPath: [{ x: 15, y: 28 }, { x: 25, y: 28 }] },
  { id: 'bp-walker-6', tileX: 45, tileY: 20, behavior: 'walk', texture: 'npc-bp-local-2',
    walkPath: [{ x: 45, y: 20 }, { x: 45, y: 26 }] },
  { id: 'bp-bridge-walker-1', tileX: 23, tileY: 11, behavior: 'walk', texture: 'npc-bp-tourist',
    walkPath: [{ x: 22, y: 11 }, { x: 26, y: 11 }] },
  { id: 'bp-bridge-walker-2', tileX: 25, tileY: 11, behavior: 'walk', texture: 'npc-bp-local',
    walkPath: [{ x: 26, y: 11 }, { x: 22, y: 11 }] },
  { id: 'bp-jogger', tileX: 8, tileY: 13, behavior: 'walk', texture: 'npc-bp-jogger', speed: 70,
    walkPath: [{ x: 3, y: 13 }, { x: 18, y: 13 }] },
  { id: 'bp-couple', tileX: 40, tileY: 22, behavior: 'walk', texture: 'npc-bp-couple',
    walkPath: [{ x: 40, y: 22 }, { x: 40, y: 28 }] },
  // Sitting NPCs (6)
  { id: 'bp-bench-1', tileX: 18, tileY: 13, behavior: 'sit', texture: 'npc-bp-local' },
  { id: 'bp-bench-2', tileX: 32, tileY: 19, behavior: 'sit', texture: 'npc-bp-tourist' },
  { id: 'bp-bench-3', tileX: 26, tileY: 23, behavior: 'sit', texture: 'npc-bp-local-2' },
  { id: 'bp-bench-4', tileX: 10, tileY: 29, behavior: 'sit', texture: 'npc-bp-local' },
  { id: 'bp-bench-5', tileX: 48, tileY: 16, behavior: 'sit', texture: 'npc-bp-tourist-2' },
  { id: 'bp-bench-6', tileX: 5, tileY: 22, behavior: 'sit', texture: 'npc-bp-local-2' },
  // Idle NPCs (5)
  { id: 'bp-street-performer', tileX: 27, tileY: 20, behavior: 'idle', texture: 'npc-bp-performer' },
  { id: 'bp-police', tileX: 38, tileY: 17, behavior: 'idle', texture: 'npc-bp-police' },
  { id: 'bp-vendor-flowers', tileX: 20, tileY: 28, behavior: 'idle', texture: 'npc-bp-vendor-2' },
  { id: 'bp-tourist-selfie', tileX: 24, tileY: 11, behavior: 'idle', texture: 'npc-bp-tourist-2' },
  { id: 'bp-elderly-couple', tileX: 15, tileY: 20, behavior: 'walk', texture: 'npc-bp-elderly',
    walkPath: [{ x: 15, y: 20 }, { x: 25, y: 20 }] },
];

export const BUDAPEST_CHECKPOINT_ZONES: CheckpointZone[] = [
  {
    id: 'bp_eye',
    centerX: tileToWorld(27, 21).x,
    centerY: tileToWorld(27, 21).y,
    radius: 56,
    promptText: 'Ride the Budapest Eye?',
  },
  {
    id: 'bp_airbnb',
    centerX: tileToWorld(36, 29).x,
    centerY: tileToWorld(36, 29).y,
    radius: 48,
    promptText: 'Enter Airbnb',
  },
  {
    id: 'bp_jewish_quarter',
    centerX: tileToWorld(42, 25).x,
    centerY: tileToWorld(42, 25).y,
    radius: 56,
    promptText: 'Enter Jewish Quarter',
  },
  {
    id: 'bp_tram_stop_north',
    centerX: tileToWorld(12, 17).x,
    centerY: tileToWorld(12, 17).y,
    radius: 48,
    promptText: 'Tram Stop',
  },
  {
    id: 'bp_tram_stop_south',
    centerX: tileToWorld(25, 33).x,
    centerY: tileToWorld(25, 33).y,
    radius: 48,
    promptText: 'Tram Stop',
  },
  {
    id: 'bp_restaurant_1',
    centerX: tileToWorld(10, 29).x,
    centerY: tileToWorld(10, 29).y,
    radius: 48,
    promptText: 'Enter Restaurant',
  },
  {
    id: 'bp_restaurant_2',
    centerX: tileToWorld(18, 29).x,
    centerY: tileToWorld(18, 29).y,
    radius: 48,
    promptText: 'Enter Restaurant',
  },
  {
    id: 'bp_parliament',
    centerX: tileToWorld(14, 14).x,
    centerY: tileToWorld(14, 14).y,
    radius: 56,
    promptText: 'Look at Parliament',
  },
  {
    id: 'bp_chain_bridge',
    centerX: tileToWorld(24, 10).x,
    centerY: tileToWorld(24, 10).y,
    radius: 56,
    promptText: 'Cross Chain Bridge',
  },
  {
    id: 'bp_fishermans_bastion',
    centerX: tileToWorld(6, 7).x,
    centerY: tileToWorld(6, 7).y,
    radius: 56,
    promptText: 'Fisherman\'s Bastion',
  },
];

export const BUDAPEST_DECORATIONS = [
  // Danube area
  { type: 'bp-bench', tileX: 4, tileY: 13 },
  { type: 'bp-bench', tileX: 20, tileY: 13 },
  { type: 'bp-lamp', tileX: 6, tileY: 13 },
  { type: 'bp-lamp', tileX: 16, tileY: 13 },
  { type: 'bp-lamp', tileX: 30, tileY: 13 },
  // Chain Bridge pillars
  { type: 'bp-chain-bridge-pillar', tileX: 22, tileY: 10 },
  { type: 'bp-chain-bridge-pillar', tileX: 26, tileY: 10 },
  // Erzsébet Square area
  { type: 'bp-fountain', tileX: 25, tileY: 21 },
  { type: 'bp-bench', tileX: 24, tileY: 23 },
  { type: 'bp-bench', tileX: 30, tileY: 23 },
  { type: 'bp-lamp', tileX: 24, tileY: 19 },
  { type: 'bp-lamp', tileX: 30, tileY: 19 },
  { type: 'bp-cafe-table', tileX: 31, tileY: 21 },
  { type: 'bp-cafe-table', tileX: 32, tileY: 22 },
  // Trees and greenery
  { type: 'bp-tree', tileX: 15, tileY: 21 },
  { type: 'bp-tree', tileX: 17, tileY: 23 },
  { type: 'bp-tree-autumn', tileX: 22, tileY: 22 },
  { type: 'bp-tree', tileX: 35, tileY: 20 },
  { type: 'bp-bush', tileX: 13, tileY: 19 },
  { type: 'bp-bush', tileX: 33, tileY: 19 },
  // Flags at Parliament
  { type: 'bp-flag-hungarian', tileX: 10, tileY: 13 },
  { type: 'bp-flag-eu', tileX: 18, tileY: 13 },
  // Street lamps along road
  { type: 'bp-lamp', tileX: 8, tileY: 16 },
  { type: 'bp-lamp', tileX: 20, tileY: 16 },
  { type: 'bp-lamp', tileX: 35, tileY: 16 },
  { type: 'bp-lamp', tileX: 48, tileY: 16 },
  // Southern area
  { type: 'bp-bench', tileX: 22, tileY: 29 },
  { type: 'bp-flower-bed', tileX: 25, tileY: 28 },
  { type: 'bp-lamp', tileX: 14, tileY: 28 },
  { type: 'bp-lamp', tileX: 28, tileY: 28 },
  // Tram stops
  { type: 'bp-tram-stop', tileX: 12, tileY: 16 },
  { type: 'bp-tram-stop', tileX: 40, tileY: 16 },
  { type: 'bp-tram-stop', tileX: 25, tileY: 32 },
  // Statue near bridge
  { type: 'bp-statue', tileX: 21, tileY: 13 },
];

export const BUDAPEST_BUILDINGS = [
  { name: 'parliament', tileX: 10, tileY: 13, tileW: 8, tileH: 3 },
  { name: 'fishermans-bastion', tileX: 3, tileY: 3, tileW: 8, tileH: 3 },
  { name: 'buda-castle', tileX: 0, tileY: 0, tileW: 8, tileH: 3 },
  { name: 'dohany-synagogue', tileX: 40, tileY: 24, tileW: 5, tileH: 3 },
  { name: 'budapest-eye', tileX: 26, tileY: 19, tileW: 3, tileH: 3 },
  { name: 'bp-airbnb', tileX: 34, tileY: 28, tileW: 4, tileH: 3 },
  { name: 'bp-restaurant-1', tileX: 8, tileY: 28, tileW: 4, tileH: 3 },
  { name: 'bp-restaurant-2', tileX: 16, tileY: 28, tileW: 4, tileH: 3 },
  { name: 'bp-hotel', tileX: 45, tileY: 19, tileW: 4, tileH: 3 },
  { name: 'ruin-bar-exterior', tileX: 48, tileY: 24, tileW: 4, tileH: 3 },
  { name: 'bp-shop-1', tileX: 35, tileY: 21, tileW: 2, tileH: 2 },
  { name: 'bp-shop-2', tileX: 38, tileY: 21, tileW: 2, tileH: 2 },
  { name: 'bp-shop-3', tileX: 45, tileY: 21, tileW: 2, tileH: 2 },
  { name: 'bp-shop-4', tileX: 48, tileY: 21, tileW: 2, tileH: 2 },
];
