/**
 * mapLayout.ts — Single source of truth for all world element positions.
 * Tile coordinates are grid positions (multiply by TILE_SIZE for world px).
 */

export const MAP_WIDTH = 40;
export const MAP_HEIGHT = 30;
export const TILE_SIZE = 32;

// ---------------------------------------------------------------------------
// Tile Grid
// ---------------------------------------------------------------------------

export const enum TileType {
  Grass = 0,
  Dirt = 1,
  Stone = 2,
  GrassDark = 3,
}

export interface RoadSegment {
  name: string;
  tiles: Array<[number, number]>; // [tileX, tileY]
  surface: TileType.Dirt | TileType.Stone;
}

/** Build all road tile positions from segment definitions. */
function buildRoadTiles(
  fromX: number, fromY: number,
  toX: number, toY: number,
  width: number,
): Array<[number, number]> {
  const tiles: Array<[number, number]> = [];
  if (fromX === toX) {
    // vertical
    const minY = Math.min(fromY, toY);
    const maxY = Math.max(fromY, toY);
    for (let y = minY; y <= maxY; y++) {
      for (let w = 0; w < width; w++) {
        tiles.push([fromX + w, y]);
      }
    }
  } else if (fromY === toY) {
    // horizontal
    const minX = Math.min(fromX, toX);
    const maxX = Math.max(fromX, toX);
    for (let x = minX; x <= maxX; x++) {
      for (let w = 0; w < width; w++) {
        tiles.push([x, fromY + w]);
      }
    }
  }
  return tiles;
}

export const ROADS: RoadSegment[] = [
  // Main east-west avenue (existing horizontal dirt path, but now named)
  {
    name: 'main-street',
    tiles: buildRoadTiles(5, 15, 35, 15, 2),
    surface: TileType.Dirt,
  },
  // Main north-south avenue (existing vertical dirt path)
  {
    name: 'north-avenue',
    tiles: buildRoadTiles(20, 5, 20, 14, 2),
    surface: TileType.Dirt,
  },
  {
    name: 'south-avenue',
    tiles: buildRoadTiles(20, 17, 20, 25, 2),
    surface: TileType.Dirt,
  },
  // Market lane (NE area, cobblestone)
  {
    name: 'market-lane',
    tiles: buildRoadTiles(26, 8, 34, 8, 1),
    surface: TileType.Stone,
  },
  // Cinema row (connects cinema to main street)
  {
    name: 'cinema-row',
    tiles: buildRoadTiles(16, 7, 16, 14, 1),
    surface: TileType.Stone,
  },
  // Park path (south area)
  {
    name: 'park-path',
    tiles: [
      ...buildRoadTiles(18, 20, 22, 20, 1),
      ...buildRoadTiles(20, 20, 20, 22, 1),
    ],
    surface: TileType.Dirt,
  },
  // Lakeside walk (SE gentle path)
  {
    name: 'lakeside-walk',
    tiles: buildRoadTiles(25, 18, 33, 18, 1),
    surface: TileType.Dirt,
  },
  // Home lane (connects home to main street)
  {
    name: 'home-lane',
    tiles: buildRoadTiles(4, 10, 4, 14, 1),
    surface: TileType.Dirt,
  },
];

/** Build a TileType[][] grid from road definitions. */
export function buildTileGrid(): TileType[][] {
  const grid: TileType[][] = [];
  for (let y = 0; y < MAP_HEIGHT; y++) {
    grid[y] = new Array(MAP_WIDTH).fill(TileType.Grass);
  }

  // Stamp roads
  for (const road of ROADS) {
    for (const [tx, ty] of road.tiles) {
      if (tx >= 0 && tx < MAP_WIDTH && ty >= 0 && ty < MAP_HEIGHT) {
        grid[ty][tx] = road.surface;
      }
    }
  }

  // Dark grass near trees (2-tile radius per design doc)
  for (const [tx, ty] of TREE_POSITIONS) {
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        const nx = tx + dx;
        const ny = ty + dy;
        if (nx >= 0 && nx < MAP_WIDTH && ny >= 0 && ny < MAP_HEIGHT) {
          if (grid[ny][nx] === TileType.Grass) {
            grid[ny][nx] = TileType.GrassDark;
          }
        }
      }
    }
  }

  return grid;
}

// ---------------------------------------------------------------------------
// Tree Positions (expanded from 12 to ~20)
// ---------------------------------------------------------------------------

export const TREE_POSITIONS: Array<[number, number]> = [
  // Original 12
  [3, 3], [7, 2], [2, 10], [8, 8], [15, 3], [30, 5],
  [35, 12], [5, 20], [12, 25], [28, 22], [33, 27], [37, 8],
  // New 8 — clusters near park and residential areas
  [17, 22], [23, 23], [24, 21], [6, 5], [36, 4], [1, 26],
  [38, 20], [32, 24],
];

// ---------------------------------------------------------------------------
// Flower Positions (expanded from 6 to ~10)
// ---------------------------------------------------------------------------

export const FLOWER_POSITIONS: Array<[number, number]> = [
  // Original 6
  [6, 14], [18, 20], [25, 18], [32, 10], [10, 24], [22, 4],
  // New 4 — near florist, lakeside, park
  [34, 16], [19, 23], [27, 19], [8, 6],
];

// ---------------------------------------------------------------------------
// Fence Positions (expanded from 7 to ~11)
// ---------------------------------------------------------------------------

export const FENCE_POSITIONS: Array<[number, number]> = [
  // Original 7
  [9, 12], [10, 12], [11, 12], [12, 12],
  [26, 6], [27, 6], [28, 6],
  // New 4 — near decorative buildings
  [5, 8], [6, 8], [33, 16], [34, 16],
];

// ---------------------------------------------------------------------------
// Lamp Post Positions (expanded from 8 to ~12)
// ---------------------------------------------------------------------------

export const LAMP_POSITIONS: Array<[number, number]> = [
  // Original 8
  [8, 15], [14, 15], [26, 15], [32, 15],
  [20, 8], [20, 12], [20, 18], [20, 24],
  // New 4 — along new roads
  [16, 10], [30, 8], [28, 18], [4, 12],
];

// ---------------------------------------------------------------------------
// Checkpoint Building Positions (unchanged — these are the interactive ones)
// ---------------------------------------------------------------------------

export const CHECKPOINT_POSITIONS: Record<string, { x: number; y: number }> = {
  restaurant: { x: 10 * TILE_SIZE, y: 8 * TILE_SIZE },
  cafe:       { x: 30 * TILE_SIZE, y: 8 * TILE_SIZE },
  park:       { x: 20 * TILE_SIZE, y: 22 * TILE_SIZE },
  cinema:     { x: 16 * TILE_SIZE, y: 6 * TILE_SIZE },
  home:       { x: 4 * TILE_SIZE, y: 9 * TILE_SIZE },
  pizzeria:   { x: 14 * TILE_SIZE, y: 10 * TILE_SIZE },
};

// ---------------------------------------------------------------------------
// Decorative (non-interactive) Buildings
// ---------------------------------------------------------------------------

export interface DecorativeBuildingDef {
  type: string;     // texture key will be 'building-<type>'
  tileX: number;
  tileY: number;
  label: string;
  scale: number;
}

export const DECORATIVE_BUILDINGS: DecorativeBuildingDef[] = [
  { type: 'bookshop', tileX: 26, tileY: 6,  label: 'Bookshop',  scale: 0.5 },
  { type: 'bakery',   tileX: 6,  tileY: 15, label: 'Bakery',    scale: 0.5 },
  { type: 'florist',  tileX: 34, tileY: 15, label: 'Florist',   scale: 0.5 },
  { type: 'giftshop', tileX: 28, tileY: 18, label: 'Gift Shop', scale: 0.5 },
];

// ---------------------------------------------------------------------------
// Street Decorations
// ---------------------------------------------------------------------------

export interface DecorationDef {
  type: string;     // texture key
  tileX: number;
  tileY: number;
  scale?: number;
}

export const DECORATIONS: DecorationDef[] = [
  // Benches (6 — along paths)
  { type: 'bench', tileX: 12, tileY: 15 },
  { type: 'bench', tileX: 24, tileY: 15 },
  { type: 'bench', tileX: 20, tileY: 20 },
  { type: 'bench', tileX: 8, tileY: 10 },
  { type: 'bench', tileX: 30, tileY: 18 },
  { type: 'bench', tileX: 17, tileY: 6 },

  // Mailboxes (3)
  { type: 'mailbox', tileX: 5, tileY: 9 },
  { type: 'mailbox', tileX: 29, tileY: 8 },
  { type: 'mailbox', tileX: 15, tileY: 15 },

  // Signposts (2)
  { type: 'signpost', tileX: 20, tileY: 15 },
  { type: 'signpost', tileX: 10, tileY: 15 },

  // Trash cans (2)
  { type: 'trashcan', tileX: 13, tileY: 15 },
  { type: 'trashcan', tileX: 27, tileY: 15 },

  // Flower planters (4)
  { type: 'planter', tileX: 31, tileY: 8 },
  { type: 'planter', tileX: 9, tileY: 8 },
  { type: 'planter', tileX: 21, tileY: 22 },
  { type: 'planter', tileX: 14, tileY: 10 },

  // Well (1 — decorative centerpiece near main junction)
  { type: 'well', tileX: 20, tileY: 12 },

  // Fountain (1 — park area)
  { type: 'fountain', tileX: 22, tileY: 22 },

  // Picnic blanket (1 — near park)
  { type: 'picnic-blanket', tileX: 18, tileY: 24 },
];

// ---------------------------------------------------------------------------
// Path Network (for NPC navigation)
// ---------------------------------------------------------------------------

export interface PathNode {
  id: string;
  x: number; // world pixel x
  y: number; // world pixel y
  neighbors: string[];
}

export const PATH_NETWORK: PathNode[] = [
  // Main street junctions
  { id: 'main-w',       x: 5 * 32,   y: 15 * 32 + 16, neighbors: ['main-home', 'main-center'] },
  { id: 'main-home',    x: 4 * 32,   y: 15 * 32 + 16, neighbors: ['main-w', 'home-entrance'] },
  { id: 'home-entrance', x: 4 * 32,  y: 10 * 32,      neighbors: ['main-home'] },
  { id: 'main-center',  x: 20 * 32,  y: 15 * 32 + 16, neighbors: ['main-w', 'main-e', 'north-junc', 'south-junc'] },
  { id: 'main-e',       x: 35 * 32,  y: 15 * 32 + 16, neighbors: ['main-center', 'main-lake-junc'] },

  // North avenue
  { id: 'north-junc',   x: 20 * 32,  y: 8 * 32,       neighbors: ['main-center', 'north-top', 'cinema-junc', 'market-w'] },
  { id: 'north-top',    x: 20 * 32,  y: 5 * 32,       neighbors: ['north-junc'] },
  { id: 'cinema-junc',  x: 16 * 32,  y: 8 * 32,       neighbors: ['north-junc', 'cinema-front'] },
  { id: 'cinema-front', x: 16 * 32,  y: 7 * 32,       neighbors: ['cinema-junc'] },

  // South avenue
  { id: 'south-junc',   x: 20 * 32,  y: 20 * 32,      neighbors: ['main-center', 'south-bottom', 'park-entrance'] },
  { id: 'south-bottom', x: 20 * 32,  y: 25 * 32,      neighbors: ['south-junc'] },
  { id: 'park-entrance', x: 20 * 32, y: 22 * 32,      neighbors: ['south-junc'] },

  // Market lane
  { id: 'market-w',     x: 26 * 32,  y: 8 * 32,       neighbors: ['north-junc', 'market-e-south'] },

  // Connecting junction: main-street to lakeside and market
  { id: 'main-lake-junc', x: 25 * 32, y: 15 * 32 + 16, neighbors: ['main-center', 'main-e', 'lake-w'] },
  { id: 'market-junc',    x: 34 * 32, y: 15 * 32 + 16, neighbors: ['main-lake-junc', 'main-e', 'market-e-south'] },
  { id: 'market-e-south', x: 34 * 32, y: 8 * 32,       neighbors: ['market-junc', 'market-w'] },

  // Lakeside
  { id: 'lake-w',       x: 25 * 32,  y: 18 * 32,      neighbors: ['main-lake-junc', 'lake-e'] },
  { id: 'lake-e',       x: 33 * 32,  y: 18 * 32,      neighbors: ['lake-w'] },

  // Bakery area
  { id: 'bakery-front', x: 6 * 32,   y: 15 * 32 + 16, neighbors: ['main-w'] },
];

// ---------------------------------------------------------------------------
// NPC Definitions
// ---------------------------------------------------------------------------

export interface NPCPalette {
  skin: string;
  hair: string;
  shirt: string;
  pants: string;
}

export interface NPCScheduleEntry {
  startMinute: number; // 0-1440
  endMinute: number;
  behavior: 'walk-route' | 'idle-at' | 'sit-bench';
  route?: string[];  // path node IDs to walk
  idleAt?: string;   // path node ID to idle near
}

export interface NPCDef {
  id: string;
  name: string;
  palette: NPCPalette;
  schedule: NPCScheduleEntry[];
  speed: number; // pixels per second
}

export const NPCS: NPCDef[] = [
  {
    id: 'baker',
    name: 'Baker',
    palette: { skin: '#f5c6a0', hair: '#8b4513', shirt: '#ffffff', pants: '#4a4a4a' },
    speed: 50,
    schedule: [
      { startMinute: 360, endMinute: 720,  behavior: 'walk-route', route: ['bakery-front', 'main-w', 'main-center', 'main-w', 'bakery-front'] },
      { startMinute: 720, endMinute: 1020, behavior: 'idle-at', idleAt: 'bakery-front' },
      { startMinute: 1020, endMinute: 1200, behavior: 'walk-route', route: ['bakery-front', 'main-w', 'main-center', 'south-junc', 'park-entrance', 'south-junc', 'main-center', 'main-w', 'bakery-front'] },
    ],
  },
  {
    id: 'florist',
    name: 'Florist',
    palette: { skin: '#e8b88a', hair: '#d4a574', shirt: '#90ee90', pants: '#2e8b57' },
    speed: 45,
    schedule: [
      { startMinute: 420, endMinute: 900,  behavior: 'walk-route', route: ['main-e', 'main-center', 'south-junc', 'park-entrance', 'south-junc', 'main-center', 'main-e'] },
      { startMinute: 900, endMinute: 1140, behavior: 'idle-at', idleAt: 'main-e' },
    ],
  },
  {
    id: 'reader',
    name: 'Book Lover',
    palette: { skin: '#c68c53', hair: '#2c1810', shirt: '#6b4c8a', pants: '#3c3c5a' },
    speed: 35,
    schedule: [
      { startMinute: 480, endMinute: 720,  behavior: 'sit-bench', idleAt: 'cinema-front' },
      { startMinute: 720, endMinute: 960,  behavior: 'walk-route', route: ['cinema-front', 'cinema-junc', 'north-junc', 'market-w', 'market-e-south', 'market-w', 'north-junc', 'cinema-junc', 'cinema-front'] },
      { startMinute: 960, endMinute: 1200, behavior: 'sit-bench', idleAt: 'main-center' },
    ],
  },
  {
    id: 'dog-walker',
    name: 'Dog Walker',
    palette: { skin: '#f5deb3', hair: '#a0522d', shirt: '#ff6347', pants: '#4682b4' },
    speed: 60,
    schedule: [
      { startMinute: 360, endMinute: 600,  behavior: 'walk-route', route: ['lake-w', 'lake-e', 'lake-w', 'main-center', 'south-junc', 'south-bottom', 'south-junc', 'main-center', 'lake-w'] },
      { startMinute: 600, endMinute: 960,  behavior: 'idle-at', idleAt: 'park-entrance' },
      { startMinute: 960, endMinute: 1260, behavior: 'walk-route', route: ['park-entrance', 'south-junc', 'main-center', 'lake-w', 'lake-e', 'lake-w'] },
    ],
  },
  {
    id: 'musician',
    name: 'Musician',
    palette: { skin: '#8d5524', hair: '#1a1a1a', shirt: '#ffd700', pants: '#1a1a1a' },
    speed: 30,
    schedule: [
      { startMinute: 600, endMinute: 1080, behavior: 'idle-at', idleAt: 'main-center' },
      { startMinute: 1080, endMinute: 1320, behavior: 'walk-route', route: ['main-center', 'main-w', 'main-center', 'main-e', 'main-center'] },
    ],
  },
  {
    id: 'cat',
    name: 'Town Cat',
    palette: { skin: '#ff8c00', hair: '#ff8c00', shirt: '#ff8c00', pants: '#ff8c00' },
    speed: 40,
    schedule: [
      { startMinute: 300, endMinute: 720,  behavior: 'walk-route', route: ['park-entrance', 'south-junc', 'main-center', 'north-junc', 'cinema-junc', 'cinema-front', 'cinema-junc', 'north-junc', 'main-center', 'south-junc', 'park-entrance'] },
      { startMinute: 720, endMinute: 1080, behavior: 'sit-bench', idleAt: 'south-junc' },
      { startMinute: 1080, endMinute: 1400, behavior: 'walk-route', route: ['south-junc', 'main-center', 'main-w', 'bakery-front', 'main-w', 'main-center', 'south-junc'] },
    ],
  },
];
