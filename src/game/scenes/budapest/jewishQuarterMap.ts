import { NPCDef, CheckpointZone, tileToWorld } from '../../data/mapLayout';
import { BudapestTileType } from './budapestMap';

export const JQ_WIDTH = 30;
export const JQ_HEIGHT = 25;

// Tile grid (30x25) — dense urban area, mostly cobblestone with narrow streets
export const jqTileGrid: number[][] = Array.from({ length: JQ_HEIGHT }, (_, y) => {
  return Array.from({ length: JQ_WIDTH }, (_, x) => {
    // Northern boundary buildings (y=0-2)
    if (y <= 2) return BudapestTileType.Cobblestone;
    // Synagogue plaza (y=3-6, x=3-10)
    if (y >= 3 && y <= 6 && x >= 3 && x <= 10) return BudapestTileType.Plaza;
    // Kazinczy Street (y=7-9, narrow main street)
    if (y >= 7 && y <= 9) return BudapestTileType.Cobblestone;
    // Ruin Bar District (y=10-14)
    if (y >= 10 && y <= 14) return BudapestTileType.Cobblestone;
    // Restaurant side streets (y=15-18)
    if (y >= 15 && y <= 18) return BudapestTileType.Cobblestone;
    // Southern residential (y=19-22)
    if (y >= 19 && y <= 22) return BudapestTileType.Cobblestone;
    // Exit zone (y=23-24)
    if (y >= 23 && y <= 24 && x >= 22 && x <= 28) return BudapestTileType.TramTrack;
    if (y >= 23) return BudapestTileType.Sidewalk;
    return BudapestTileType.Cobblestone;
  });
});

// Walk grid
export const jqWalkGrid: boolean[][] = Array.from({ length: JQ_HEIGHT }, (_, y) => {
  return Array.from({ length: JQ_WIDTH }, (_, x) => {
    // Map borders
    if (x === 0 || x === JQ_WIDTH - 1 || y === 0 || y === JQ_HEIGHT - 1) return false;
    // Northern building facades (y=1-2, most tiles blocked except doorway paths)
    if (y <= 2 && !(x >= 12 && x <= 14)) return false;
    // Synagogue building footprint (y=3-5, x=3-10)
    if (y >= 3 && y <= 5 && x >= 3 && x <= 10) return false;
    // Building blocks along Kazinczy (left side)
    if (y >= 7 && y <= 9 && x >= 1 && x <= 3) return false;
    // Building blocks along Kazinczy (right side)
    if (y >= 7 && y <= 9 && x >= 26 && x <= 28) return false;
    // Ruin bar buildings (not entrance)
    if (y >= 10 && y <= 11 && x >= 1 && x <= 5) return false;
    if (y >= 10 && y <= 11 && x >= 24 && x <= 28) return false;
    // Szimpla Kert building (entrance at x=18-22, y=12)
    if (y >= 10 && y <= 14 && x >= 18 && x <= 22 && !(y === 12 && x >= 19 && x <= 21)) return false;
    // Restaurant buildings
    if (y >= 15 && y <= 17 && x >= 1 && x <= 4) return false;
    if (y >= 15 && y <= 17 && x >= 24 && x <= 28) return false;
    // Residential buildings
    if (y >= 19 && y <= 21 && x >= 1 && x <= 4) return false;
    if (y >= 19 && y <= 21 && x >= 24 && x <= 28) return false;
    return true;
  });
});

export function isJQWalkable(tx: number, ty: number): boolean {
  if (ty < 0 || ty >= JQ_HEIGHT || tx < 0 || tx >= JQ_WIDTH) return false;
  return jqWalkGrid[ty][tx];
}

// NPCs (15 total)
export const JQ_NPCS: NPCDef[] = [
  // Interactable (3)
  {
    id: 'jq-synagogue-guide', tileX: 6, tileY: 7, behavior: 'idle',
    texture: 'npc-bp-guide', interactable: true, onInteract: 'dialog',
    facingDirection: 'down',
    interactionData: { lines: ['The Dohány Synagogue is Europe\'s largest!', 'Built in the 1850s in Moorish Revival style.', 'It can seat over 3,000 people.'] },
  },
  {
    id: 'jq-food-vendor', tileX: 15, tileY: 16, behavior: 'idle',
    texture: 'npc-bp-vendor', interactable: true, onInteract: 'dialog',
    facingDirection: 'down',
    interactionData: { lines: ['Chimney cake! Hot off the spit!', 'Cinnamon, chocolate, or walnut coating?'] },
  },
  {
    id: 'jq-bar-tout', tileX: 19, tileY: 12, behavior: 'idle',
    texture: 'npc-bp-bouncer', interactable: true, onInteract: 'dialog',
    facingDirection: 'left',
    interactionData: { lines: ['Best ruin bar in Budapest! Come in!', 'Szimpla Kert — the original since 2004!'] },
  },
  // Walking (6)
  { id: 'jq-walker-1', tileX: 5, tileY: 8, behavior: 'walk', texture: 'npc-bp-tourist',
    walkPath: [{ x: 5, y: 8 }, { x: 12, y: 8 }] },
  { id: 'jq-walker-2', tileX: 14, tileY: 10, behavior: 'walk', texture: 'npc-bp-local',
    walkPath: [{ x: 14, y: 10 }, { x: 14, y: 16 }] },
  { id: 'jq-walker-3', tileX: 22, tileY: 8, behavior: 'walk', texture: 'npc-bp-tourist-2',
    walkPath: [{ x: 16, y: 8 }, { x: 24, y: 8 }] },
  { id: 'jq-walker-4', tileX: 8, tileY: 15, behavior: 'walk', texture: 'npc-bp-local-2',
    walkPath: [{ x: 8, y: 15 }, { x: 8, y: 20 }] },
  { id: 'jq-walker-5', tileX: 20, tileY: 18, behavior: 'walk', texture: 'npc-bp-tourist',
    walkPath: [{ x: 16, y: 18 }, { x: 22, y: 18 }] },
  { id: 'jq-walker-6', tileX: 12, tileY: 20, behavior: 'walk', texture: 'npc-bp-local',
    walkPath: [{ x: 12, y: 20 }, { x: 20, y: 20 }] },
  // Sitting (4)
  { id: 'jq-cafe-1', tileX: 10, tileY: 16, behavior: 'sit', texture: 'npc-bp-tourist' },
  { id: 'jq-cafe-2', tileX: 12, tileY: 16, behavior: 'sit', texture: 'npc-bp-local-2' },
  { id: 'jq-bench-1', tileX: 6, tileY: 20, behavior: 'sit', texture: 'npc-bp-tourist-2' },
  { id: 'jq-bench-2', tileX: 22, tileY: 14, behavior: 'sit', texture: 'npc-bp-local' },
  // Idle (2)
  { id: 'jq-busker', tileX: 16, tileY: 8, behavior: 'idle', texture: 'npc-bp-performer' },
  { id: 'jq-mural-artist', tileX: 23, tileY: 10, behavior: 'idle', texture: 'npc-bp-artist' },
];

// Checkpoint zones (4)
export const JQ_CHECKPOINT_ZONES: CheckpointZone[] = [
  {
    id: 'jq_ruin_bar',
    centerX: tileToWorld(20, 12).x,
    centerY: tileToWorld(20, 12).y,
    radius: 48,
    promptText: 'Enter Szimpla Kert',
  },
  {
    id: 'jq_synagogue',
    centerX: tileToWorld(6, 6).x,
    centerY: tileToWorld(6, 6).y,
    radius: 56,
    promptText: 'Visit Synagogue',
  },
  {
    id: 'jq_exit',
    centerX: tileToWorld(15, 24).x,
    centerY: tileToWorld(15, 24).y,
    radius: 48,
    promptText: 'Leave Jewish Quarter',
  },
  {
    id: 'jq_tram_stop',
    centerX: tileToWorld(25, 24).x,
    centerY: tileToWorld(25, 24).y,
    radius: 48,
    promptText: 'Tram Stop',
  },
];

// Decorations
export const JQ_DECORATIONS = [
  // String lights between buildings
  { type: 'bp-string-lights', tileX: 8, tileY: 8 },
  { type: 'bp-string-lights', tileX: 16, tileY: 8 },
  { type: 'bp-string-lights', tileX: 10, tileY: 12 },
  // Murals on walls
  { type: 'bp-mural', tileX: 2, tileY: 10 },
  { type: 'bp-mural-2', tileX: 25, tileY: 12 },
  { type: 'bp-graffiti', tileX: 15, tileY: 14 },
  // Street lamps
  { type: 'bp-lamp', tileX: 6, tileY: 8 },
  { type: 'bp-lamp', tileX: 14, tileY: 8 },
  { type: 'bp-lamp', tileX: 22, tileY: 8 },
  { type: 'bp-lamp', tileX: 10, tileY: 15 },
  { type: 'bp-lamp', tileX: 18, tileY: 15 },
  // Cafe tables
  { type: 'bp-cafe-table', tileX: 10, tileY: 17 },
  { type: 'bp-cafe-table', tileX: 12, tileY: 17 },
  // Benches
  { type: 'bp-bench', tileX: 6, tileY: 19 },
  { type: 'bp-bench', tileX: 15, tileY: 22 },
  // Neon sign at Szimpla entrance
  { type: 'bp-neon-sign', tileX: 19, tileY: 11 },
  // Tram stop
  { type: 'bp-tram-stop', tileX: 25, tileY: 23 },
  // Flower beds
  { type: 'bp-flower-bed', tileX: 8, tileY: 6 },
  { type: 'bp-flower-bed', tileX: 20, tileY: 20 },
];

// Buildings
export const JQ_BUILDINGS = [
  { name: 'dohany-synagogue', tileX: 3, tileY: 3, tileW: 5, tileH: 3 },
  { name: 'kazinczy-synagogue', tileX: 26, tileY: 7, tileW: 3, tileH: 2 },
  { name: 'ruin-bar-exterior', tileX: 18, tileY: 10, tileW: 4, tileH: 3 },
  { name: 'bp-shop-1', tileX: 1, tileY: 10, tileW: 2, tileH: 2 },
  { name: 'bp-shop-2', tileX: 24, tileY: 10, tileW: 2, tileH: 2 },
  { name: 'bp-shop-3', tileX: 1, tileY: 15, tileW: 2, tileH: 2 },
  { name: 'bp-shop-4', tileX: 24, tileY: 15, tileW: 2, tileH: 2 },
];
