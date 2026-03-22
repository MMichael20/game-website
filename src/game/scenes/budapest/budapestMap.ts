// src/game/scenes/budapest/budapestMap.ts
import { NPCDef, CheckpointZone, tileToWorld } from '../../data/mapLayout';

export const BUDAPEST_WIDTH = 65;
export const BUDAPEST_HEIGHT = 40;

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
  WaterShallow = 10,
}

// 65×40 tile grid — row-major: budapestTileGrid[y][x]
export const budapestTileGrid: number[][] = Array.from({ length: BUDAPEST_HEIGHT }, (_, y) => {
  return Array.from({ length: BUDAPEST_WIDTH }, (_, x) => {
    // === BUDA SIDE (y=0-9) ===

    // Buda Castle (y=0-2, x=6-14)
    if (y >= 0 && y <= 2 && x >= 6 && x <= 14) return BudapestTileType.BudaCastle;
    // Fisherman's Bastion (y=3-6, x=6-14)
    if (y >= 3 && y <= 6 && x >= 6 && x <= 14) return BudapestTileType.BudaCastle;

    // Citadella (y=0-2, x=2-6) — part of Gellert Hill
    if (y >= 0 && y <= 2 && x >= 2 && x <= 5) return BudapestTileType.Grass;

    // Gellert Hill (y=0-5, x=0-7) — Grass with ParkPath winding paths
    if (y >= 0 && y <= 5 && x >= 0 && x <= 7) {
      // Winding park paths
      if (y === 3 && x >= 4 && x <= 5) return BudapestTileType.ParkPath;
      if (y === 4 && x >= 3 && x <= 5) return BudapestTileType.ParkPath;
      if (y === 5 && x >= 2 && x <= 4) return BudapestTileType.ParkPath;
      return BudapestTileType.Grass;
    }

    // Buda riverside (y=7-8) — Grass
    if (y >= 7 && y <= 8) return BudapestTileType.Grass;
    // Buda riverside promenade at y=9 — Sidewalk
    if (y === 9) return BudapestTileType.Sidewalk;

    // === DANUBE RIVER (y=10-14) ===
    if (y >= 10 && y <= 14) {
      // Liberty Bridge (x=8-12)
      if (x >= 8 && x <= 12) return BudapestTileType.Bridge;
      // Chain Bridge (x=28-32)
      if (x >= 28 && x <= 32) return BudapestTileType.Bridge;
      // Margaret Bridge (x=50-54)
      if (x >= 50 && x <= 54) return BudapestTileType.Bridge;
      // Shallow shores
      if (y === 10 || y === 14) return BudapestTileType.WaterShallow;
      // Deep water
      return BudapestTileType.Water;
    }

    // === PEST SIDE (y=15+) ===

    // Pest riverside promenade (y=15)
    if (y === 15) return BudapestTileType.Sidewalk;
    // Riverside road (y=16)
    if (y === 16) return BudapestTileType.Road;

    // Parliament zone (y=17-19, x=18-28) — Plaza
    if (y >= 17 && y <= 19 && x >= 18 && x <= 28) return BudapestTileType.Plaza;

    // Major road with tram (y=17-19) — non-Parliament areas
    if (y === 17) return BudapestTileType.Road;
    if (y === 18) return BudapestTileType.TramTrack;
    if (y === 19) return BudapestTileType.Road;

    // Sidewalk row (y=20)
    if (y === 20) return BudapestTileType.Sidewalk;

    // Erzsébet Square / Budapest Eye area (y=21-25, x=28-36) — Plaza
    if (y >= 21 && y <= 25 && x >= 28 && x <= 36) return BudapestTileType.Plaza;

    // Andrassy Avenue corridor (y=21-25, x=40-58)
    if (y >= 21 && y <= 25 && x >= 40 && x <= 58) {
      // Grass tree strips on edges
      if (x === 41 || x === 57) return BudapestTileType.Grass;
      // Sidewalk sides
      if (x === 40 || x === 42 || x === 56 || x === 58) return BudapestTileType.Sidewalk;
      // Road center
      return BudapestTileType.Road;
    }

    // Jewish Quarter entrance (y=26-30, x=46-52) — Cobblestone
    if (y >= 26 && y <= 30 && x >= 46 && x <= 52) return BudapestTileType.Cobblestone;

    // Southern restaurants/shops (y=26-30, x=10-28) — Cobblestone
    if (y >= 26 && y <= 30 && x >= 10 && x <= 28) return BudapestTileType.Cobblestone;

    // Airbnb area (y=31-34, x=40-44) — Cobblestone
    if (y >= 31 && y <= 34 && x >= 40 && x <= 44) return BudapestTileType.Cobblestone;

    // Thermal baths area (y=35-39, x=4-14) — Plaza with Grass surroundings
    if (y >= 35 && y <= 39 && x >= 4 && x <= 14) {
      if (x === 4 || x === 14 || y === 35 || y === 39) return BudapestTileType.Grass;
      return BudapestTileType.Plaza;
    }

    // Southern park/transport hub (y=35-39, x=22-34) — Grass with ParkPath
    if (y >= 35 && y <= 39 && x >= 22 && x <= 34) {
      if (x === 28 || y === 37) return BudapestTileType.ParkPath;
      return BudapestTileType.Grass;
    }

    // Park paths in mid-city area
    if (y === 22 && x >= 15 && x <= 23) return BudapestTileType.ParkPath;
    if (x === 20 && y >= 21 && y <= 25) return BudapestTileType.ParkPath;

    // Southern streets (y=31-34)
    if (y >= 31 && y <= 34 && x >= 20 && x <= 38) return BudapestTileType.Cobblestone;
    if (y >= 31 && y <= 34) return BudapestTileType.Grass;

    // Default: cobblestone for urban areas (y >= 15), grass for Buda side
    if (y >= 15) return BudapestTileType.Cobblestone;
    return BudapestTileType.Grass;
  });
});

// Walkability grid — true = passable
export const budapestWalkGrid: boolean[][] = Array.from({ length: BUDAPEST_HEIGHT }, (_, y) => {
  return Array.from({ length: BUDAPEST_WIDTH }, (_, x) => {
    // Map borders
    if (x === 0 || x === BUDAPEST_WIDTH - 1 || y === 0 || y === BUDAPEST_HEIGHT - 1) return false;

    // Citadella (y=0-2, x=2-6) — impassable
    if (y >= 0 && y <= 2 && x >= 2 && x <= 6) return false;

    // Gellert Hill steep areas (y=0-2, x=0-4) — partially impassable
    if (y >= 0 && y <= 2 && x >= 0 && x <= 4) return false;

    // Buda Castle footprint (y=0-6, x=6-14) — impassable except paths
    if (y >= 0 && y <= 6 && x >= 6 && x <= 14) return false;

    // Danube (y=10-14) impassable EXCEPT bridge tiles
    if (y >= 10 && y <= 14) {
      if (x >= 8 && x <= 12) return true;   // Liberty Bridge
      if (x >= 28 && x <= 32) return true;   // Chain Bridge
      if (x >= 50 && x <= 54) return true;   // Margaret Bridge
      return false;
    }

    // Parliament building footprint (y=17-19, x=19-27) — impassable
    if (y >= 17 && y <= 19 && x >= 19 && x <= 27) return false;

    // Budapest Eye structure (y=22-24, x=30-32) — impassable
    if (y >= 22 && y <= 24 && x >= 30 && x <= 32) return false;

    // Opera House (y=22-24, x=46-49) — impassable
    if (y >= 22 && y <= 24 && x >= 46 && x <= 49) return false;

    // Dohány Synagogue (y=26-28, x=46-50) — impassable
    if (y >= 26 && y <= 28 && x >= 46 && x <= 50) return false;

    // Airbnb building (y=31-33, x=40-43) — impassable
    if (y >= 31 && y <= 33 && x >= 40 && x <= 43) return false;

    // Restaurant buildings (y=29-31, x=12-16 and x=20-24) — impassable
    if (y >= 29 && y <= 31 && x >= 12 && x <= 16) return false;
    if (y >= 29 && y <= 31 && x >= 20 && x <= 24) return false;

    // Shop buildings along Andrassy (y=23-24, x=40-43 and x=50-53) — impassable
    if (y >= 23 && y <= 24 && x >= 40 && x <= 43) return false;
    if (y >= 23 && y <= 24 && x >= 50 && x <= 53) return false;

    // Gellert Baths (y=36-38, x=5-11) — impassable
    if (y >= 36 && y <= 38 && x >= 5 && x <= 11) return false;

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
  // === Interactable NPCs (4) ===
  {
    id: 'bp-tourist-info', tileX: 32, tileY: 21, behavior: 'idle',
    texture: 'npc-bp-guide', interactable: true, onInteract: 'dialog',
    facingDirection: 'down',
    interactionData: { lines: ['The Eye gives the best sunset views!', 'You can see Parliament and the Castle from the top!'] },
  },
  {
    id: 'bp-hotdog-vendor', tileX: 28, tileY: 22, behavior: 'idle',
    texture: 'npc-bp-vendor', interactable: true, onInteract: 'dialog',
    facingDirection: 'down',
    interactionData: { lines: ['Hot dog? Kolbász? Best in Budapest!', 'Try it with mustard and pickled peppers!'] },
  },
  {
    id: 'bp-tram-conductor', tileX: 14, tileY: 18, behavior: 'idle',
    texture: 'npc-bp-conductor', interactable: true, onInteract: 'dialog',
    facingDirection: 'down',
    interactionData: { lines: ['Tram 2 is the most scenic in Europe!', 'Runs right along the Danube river.'] },
  },
  {
    id: 'bp-photographer', tileX: 18, tileY: 15, behavior: 'idle',
    texture: 'npc-bp-tourist', interactable: true, onInteract: 'dialog',
    facingDirection: 'up',
    interactionData: { lines: ['Parliament is gorgeous!', 'Can you take my photo?'] },
  },

  // === Walking NPCs (10) ===
  { id: 'bp-walker-1', tileX: 5, tileY: 16, behavior: 'walk', texture: 'npc-bp-local',
    walkPath: [{ x: 5, y: 16 }, { x: 25, y: 16 }] },
  { id: 'bp-walker-2', tileX: 35, tileY: 16, behavior: 'walk', texture: 'npc-bp-local-2',
    walkPath: [{ x: 35, y: 16 }, { x: 58, y: 16 }] },
  { id: 'bp-walker-3', tileX: 22, tileY: 21, behavior: 'walk', texture: 'npc-bp-tourist',
    walkPath: [{ x: 22, y: 21 }, { x: 22, y: 27 }] },
  { id: 'bp-walker-4', tileX: 38, tileY: 26, behavior: 'walk', texture: 'npc-bp-local',
    walkPath: [{ x: 38, y: 26 }, { x: 38, y: 32 }] },
  { id: 'bp-walker-5', tileX: 15, tileY: 28, behavior: 'walk', texture: 'npc-bp-tourist-2',
    walkPath: [{ x: 15, y: 28 }, { x: 28, y: 28 }] },
  { id: 'bp-walker-6', tileX: 52, tileY: 22, behavior: 'walk', texture: 'npc-bp-local-2',
    walkPath: [{ x: 52, y: 22 }, { x: 52, y: 28 }] },
  { id: 'bp-bridge-walker-1', tileX: 29, tileY: 12, behavior: 'walk', texture: 'npc-bp-tourist',
    walkPath: [{ x: 28, y: 12 }, { x: 32, y: 12 }] },
  { id: 'bp-bridge-walker-2', tileX: 31, tileY: 12, behavior: 'walk', texture: 'npc-bp-local',
    walkPath: [{ x: 32, y: 12 }, { x: 28, y: 12 }] },
  { id: 'bp-jogger', tileX: 10, tileY: 15, behavior: 'walk', texture: 'npc-bp-jogger', speed: 70,
    walkPath: [{ x: 3, y: 15 }, { x: 22, y: 15 }] },
  { id: 'bp-couple', tileX: 45, tileY: 26, behavior: 'walk', texture: 'npc-bp-couple',
    walkPath: [{ x: 45, y: 26 }, { x: 45, y: 32 }] },

  // === Sitting NPCs (6) ===
  { id: 'bp-bench-1', tileX: 22, tileY: 15, behavior: 'sit', texture: 'npc-bp-local' },
  { id: 'bp-bench-2', tileX: 36, tileY: 21, behavior: 'sit', texture: 'npc-bp-tourist' },
  { id: 'bp-bench-3', tileX: 29, tileY: 25, behavior: 'sit', texture: 'npc-bp-local-2' },
  { id: 'bp-bench-4', tileX: 12, tileY: 27, behavior: 'sit', texture: 'npc-bp-local' },
  { id: 'bp-bench-5', tileX: 56, tileY: 20, behavior: 'sit', texture: 'npc-bp-tourist-2' },
  { id: 'bp-bench-6', tileX: 5, tileY: 24, behavior: 'sit', texture: 'npc-bp-local-2' },

  // === Idle NPCs (5) ===
  { id: 'bp-street-performer', tileX: 33, tileY: 22, behavior: 'idle', texture: 'npc-bp-performer' },
  { id: 'bp-police', tileX: 42, tileY: 20, behavior: 'idle', texture: 'npc-bp-police' },
  { id: 'bp-vendor-flowers', tileX: 22, tileY: 28, behavior: 'idle', texture: 'npc-bp-vendor-2' },
  { id: 'bp-tourist-selfie', tileX: 30, tileY: 12, behavior: 'idle', texture: 'npc-bp-tourist-2' },
  { id: 'bp-elderly-couple', tileX: 17, tileY: 22, behavior: 'walk', texture: 'npc-bp-elderly',
    walkPath: [{ x: 17, y: 22 }, { x: 27, y: 22 }] },

  // === NEW NPCs (11) ===
  // Bridge walkers
  { id: 'bp-liberty-walker', tileX: 9, tileY: 12, behavior: 'walk', texture: 'npc-bp-local',
    walkPath: [{ x: 8, y: 12 }, { x: 12, y: 12 }] },
  { id: 'bp-margaret-jogger', tileX: 51, tileY: 12, behavior: 'walk', texture: 'npc-bp-jogger', speed: 70,
    walkPath: [{ x: 50, y: 12 }, { x: 54, y: 12 }] },
  // Gellert Hill
  { id: 'bp-hiker', tileX: 3, tileY: 4, behavior: 'walk', texture: 'npc-bp-hiker',
    walkPath: [{ x: 3, y: 4 }, { x: 5, y: 7 }] },
  { id: 'bp-viewpoint-couple', tileX: 4, tileY: 3, behavior: 'sit', texture: 'npc-bp-couple' },
  // Andrassy Avenue
  { id: 'bp-andrassy-walker-1', tileX: 42, tileY: 22, behavior: 'walk', texture: 'npc-bp-local',
    walkPath: [{ x: 42, y: 22 }, { x: 56, y: 22 }] },
  { id: 'bp-andrassy-walker-2', tileX: 55, tileY: 24, behavior: 'walk', texture: 'npc-bp-tourist',
    walkPath: [{ x: 55, y: 24 }, { x: 42, y: 24 }] },
  { id: 'bp-window-shopper', tileX: 48, tileY: 23, behavior: 'idle', texture: 'npc-bp-tourist-2' },
  // Thermal baths area
  { id: 'bp-bath-goer', tileX: 8, tileY: 35, behavior: 'walk', texture: 'npc-bp-bath-goer',
    walkPath: [{ x: 8, y: 35 }, { x: 8, y: 38 }] },
  { id: 'bp-bath-exit', tileX: 12, tileY: 38, behavior: 'walk', texture: 'npc-bp-local-2',
    walkPath: [{ x: 12, y: 38 }, { x: 12, y: 35 }] },
  // Riverside
  { id: 'bp-fisherman', tileX: 35, tileY: 15, behavior: 'sit', texture: 'npc-bp-fisherman' },
  { id: 'bp-riverside-couple', tileX: 38, tileY: 15, behavior: 'walk', texture: 'npc-bp-couple',
    walkPath: [{ x: 38, y: 15 }, { x: 48, y: 15 }] },
];

export const BUDAPEST_CHECKPOINT_ZONES: CheckpointZone[] = [
  // === Existing checkpoints (updated positions) ===
  {
    id: 'bp_eye',
    centerX: tileToWorld(31, 25).x,
    centerY: tileToWorld(31, 25).y,
    radius: 56,
    promptText: 'Ride the Budapest Eye?',
  },
  {
    id: 'bp_airbnb',
    centerX: tileToWorld(42, 34).x,
    centerY: tileToWorld(42, 34).y,
    radius: 48,
    promptText: 'Enter Airbnb',
  },
  {
    id: 'bp_jewish_quarter',
    centerX: tileToWorld(48, 29).x,
    centerY: tileToWorld(48, 29).y,
    radius: 56,
    promptText: 'Enter Jewish Quarter',
  },
  {
    id: 'bp_tram_stop_north',
    centerX: tileToWorld(14, 18).x,
    centerY: tileToWorld(14, 18).y,
    radius: 48,
    promptText: 'Tram Stop',
  },
  {
    id: 'bp_tram_stop_south',
    centerX: tileToWorld(28, 37).x,
    centerY: tileToWorld(28, 37).y,
    radius: 48,
    promptText: 'Tram Stop',
  },
  {
    id: 'bp_restaurant_1',
    centerX: tileToWorld(14, 32).x,
    centerY: tileToWorld(14, 32).y,
    radius: 48,
    promptText: 'Enter Restaurant',
  },
  {
    id: 'bp_restaurant_2',
    centerX: tileToWorld(22, 32).x,
    centerY: tileToWorld(22, 32).y,
    radius: 48,
    promptText: 'Enter Restaurant',
  },
  {
    id: 'bp_indian_restaurant',
    centerX: tileToWorld(18, 32).x,
    centerY: tileToWorld(18, 32).y,
    radius: 48,
    promptText: 'Enter Indian Restaurant',
  },
  {
    id: 'bp_parliament',
    centerX: tileToWorld(23, 16).x,
    centerY: tileToWorld(23, 16).y,
    radius: 56,
    promptText: 'Look at Parliament',
  },
  {
    id: 'bp_chain_bridge',
    centerX: tileToWorld(30, 10).x,
    centerY: tileToWorld(30, 10).y,
    radius: 56,
    promptText: 'Cross Chain Bridge',
  },
  {
    id: 'bp_fishermans_bastion',
    centerX: tileToWorld(10, 7).x,
    centerY: tileToWorld(10, 7).y,
    radius: 56,
    promptText: 'Fisherman\'s Bastion',
  },

  // === New checkpoints ===
  {
    id: 'bp_liberty_bridge',
    centerX: tileToWorld(10, 12).x,
    centerY: tileToWorld(10, 12).y,
    radius: 56,
    promptText: 'Liberty Bridge',
  },
  {
    id: 'bp_margaret_bridge',
    centerX: tileToWorld(52, 12).x,
    centerY: tileToWorld(52, 12).y,
    radius: 56,
    promptText: 'Margaret Bridge',
  },
  {
    id: 'bp_gellert_hill',
    centerX: tileToWorld(4, 3).x,
    centerY: tileToWorld(4, 3).y,
    radius: 56,
    promptText: 'Gellert Hill Viewpoint',
  },
  {
    id: 'bp_opera',
    centerX: tileToWorld(48, 25).x,
    centerY: tileToWorld(48, 25).y,
    radius: 56,
    promptText: 'Opera House',
  },
  {
    id: 'bp_thermal_baths',
    centerX: tileToWorld(8, 35).x,
    centerY: tileToWorld(8, 35).y,
    radius: 56,
    promptText: 'Visit Thermal Baths?',
  },
  {
    id: 'bp_danube_cruise',
    centerX: tileToWorld(22, 15).x,
    centerY: tileToWorld(22, 15).y,
    radius: 56,
    promptText: 'Take an evening cruise?',
  },
  {
    id: 'bp_fast_travel',
    centerX: tileToWorld(32, 21).x,
    centerY: tileToWorld(32, 21).y,
    radius: 56,
    promptText: 'Fast Travel',
  },
];

export const BUDAPEST_DECORATIONS = [
  // Fast travel marker near spawn
  { type: 'bp-tram-stop', tileX: 32, tileY: 21 },

  // Danube riverside area
  { type: 'bp-bench', tileX: 4, tileY: 15 },
  { type: 'bp-bench', tileX: 24, tileY: 15 },
  { type: 'bp-lamp', tileX: 6, tileY: 15 },
  { type: 'bp-lamp', tileX: 18, tileY: 15 },
  { type: 'bp-lamp', tileX: 36, tileY: 15 },

  // Chain Bridge pillars (shifted to x=28, x=32)
  { type: 'bp-chain-bridge-pillar', tileX: 28, tileY: 10 },
  { type: 'bp-chain-bridge-pillar', tileX: 32, tileY: 10 },

  // Liberty Bridge pillars
  { type: 'bp-liberty-bridge-pillar', tileX: 8, tileY: 10 },
  { type: 'bp-liberty-bridge-pillar', tileX: 12, tileY: 10 },

  // Margaret Bridge pillars
  { type: 'bp-margaret-bridge-pillar', tileX: 50, tileY: 10 },
  { type: 'bp-margaret-bridge-pillar', tileX: 54, tileY: 10 },

  // Erzsébet Square area
  { type: 'bp-fountain', tileX: 29, tileY: 23 },
  { type: 'bp-bench', tileX: 28, tileY: 25 },
  { type: 'bp-bench', tileX: 34, tileY: 25 },
  { type: 'bp-lamp', tileX: 28, tileY: 21 },
  { type: 'bp-lamp', tileX: 36, tileY: 21 },
  { type: 'bp-cafe-table', tileX: 35, tileY: 23 },
  { type: 'bp-cafe-table', tileX: 36, tileY: 24 },

  // Trees and greenery
  { type: 'bp-tree', tileX: 17, tileY: 23 },
  { type: 'bp-tree', tileX: 19, tileY: 25 },
  { type: 'bp-tree-autumn', tileX: 26, tileY: 24 },
  { type: 'bp-tree', tileX: 38, tileY: 22 },
  { type: 'bp-bush', tileX: 15, tileY: 21 },
  { type: 'bp-bush', tileX: 37, tileY: 21 },

  // Trees along Andrassy Avenue (x=41 and x=57, y=21-25)
  { type: 'bp-tree', tileX: 41, tileY: 21 },
  { type: 'bp-tree', tileX: 41, tileY: 23 },
  { type: 'bp-tree', tileX: 41, tileY: 25 },
  { type: 'bp-tree', tileX: 57, tileY: 21 },
  { type: 'bp-tree', tileX: 57, tileY: 23 },
  { type: 'bp-tree', tileX: 57, tileY: 25 },

  // Cafe tables on Andrassy
  { type: 'bp-cafe-table', tileX: 45, tileY: 22 },
  { type: 'bp-cafe-table', tileX: 45, tileY: 24 },

  // Flags at Parliament
  { type: 'bp-flag-hungarian', tileX: 18, tileY: 15 },
  { type: 'bp-flag-eu', tileX: 28, tileY: 15 },

  // Street lamps along road
  { type: 'bp-lamp', tileX: 8, tileY: 16 },
  { type: 'bp-lamp', tileX: 24, tileY: 16 },
  { type: 'bp-lamp', tileX: 40, tileY: 16 },
  { type: 'bp-lamp', tileX: 56, tileY: 16 },

  // Southern area
  { type: 'bp-bench', tileX: 24, tileY: 29 },
  { type: 'bp-flower-bed', tileX: 27, tileY: 28 },
  { type: 'bp-lamp', tileX: 16, tileY: 28 },
  { type: 'bp-lamp', tileX: 30, tileY: 28 },

  // Tram stops
  { type: 'bp-tram-stop', tileX: 14, tileY: 18 },
  { type: 'bp-tram-stop', tileX: 44, tileY: 18 },
  { type: 'bp-tram-stop', tileX: 28, tileY: 36 },

  // Statue near bridges
  { type: 'bp-statue', tileX: 28, tileY: 15 },
  { type: 'bp-statue', tileX: 10, tileY: 9 },

  // Thermal baths area
  { type: 'bp-bench', tileX: 6, tileY: 36 },

  // Lamps along riverside
  { type: 'bp-lamp', tileX: 22, tileY: 15 },
  { type: 'bp-lamp', tileX: 42, tileY: 15 },
  { type: 'bp-lamp', tileX: 58, tileY: 15 },

  // Flower beds near Gellert Hill
  { type: 'bp-flower-bed', tileX: 6, tileY: 8 },
];

export const BUDAPEST_BUILDINGS = [
  // Existing buildings (updated positions)
  { name: 'parliament', tileX: 18, tileY: 17, tileW: 10, tileH: 3 },
  { name: 'fishermans-bastion', tileX: 6, tileY: 3, tileW: 8, tileH: 4 },
  { name: 'buda-castle', tileX: 6, tileY: 0, tileW: 9, tileH: 3 },
  { name: 'dohany-synagogue', tileX: 46, tileY: 26, tileW: 5, tileH: 3 },
  { name: 'budapest-eye', tileX: 30, tileY: 22, tileW: 3, tileH: 3 },
  { name: 'bp-airbnb', tileX: 40, tileY: 31, tileW: 4, tileH: 3 },
  { name: 'bp-restaurant-1', tileX: 12, tileY: 29, tileW: 5, tileH: 3 },
  { name: 'bp-restaurant-2', tileX: 20, tileY: 29, tileW: 5, tileH: 3 },
  { name: 'bp-hotel', tileX: 54, tileY: 21, tileW: 4, tileH: 3 },
  { name: 'ruin-bar-exterior', tileX: 50, tileY: 26, tileW: 4, tileH: 3 },
  { name: 'bp-shop-1', tileX: 40, tileY: 23, tileW: 2, tileH: 2 },
  { name: 'bp-shop-2', tileX: 42, tileY: 23, tileW: 2, tileH: 2 },
  { name: 'bp-shop-3', tileX: 50, tileY: 23, tileW: 2, tileH: 2 },
  { name: 'bp-shop-4', tileX: 52, tileY: 23, tileW: 2, tileH: 2 },

  // New buildings
  { name: 'citadella', tileX: 2, tileY: 0, tileW: 4, tileH: 3 },
  { name: 'opera-house', tileX: 46, tileY: 22, tileW: 4, tileH: 3 },
  { name: 'gellert-baths', tileX: 5, tileY: 36, tileW: 6, tileH: 3 },
];
