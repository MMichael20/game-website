# Alive World Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Phaser 3 couples' memory game map feel alive with more roads, decorative buildings, NPCs walking around, and ambient particle effects.

**Architecture:** Replace ~1260 individual grass/dirt sprites with a single pre-rendered ground canvas. Add a data-driven map layout file (`mapLayout.ts`) as single source of truth for all world positions. Add an NPC system with behavior strategies, time-of-day schedules, and adaptive throttling. Add decorative buildings, street furniture, and ambient particles.

**Tech Stack:** Phaser 3.90, TypeScript 5.9, Vite 8, Canvas 2D (all textures procedural — no external images)

**Design Doc:** `docs/plans/2026-03-16-alive-world-design.md`

---

## File Structure

### New Files
- `src/data/mapLayout.ts` — Single source of truth for all world element positions, road definitions, decoration coords, NPC definitions, path network. TypeScript for compile-time safety.
- `src/systems/NPCSystem.ts` — All NPC logic: spawning, behavior strategies (WalkRoute, IdleAt, SitBench), BFS pathfinding, scheduling, stuck detection, adaptive throttling. ~250 lines.

### Modified Files
- `src/utils/canvasUtils.ts` — Add `createSeededRandom()` (Mulberry32 PRNG)
- `src/rendering/WorldRenderer.ts` — Add 14 new texture generators (2 tiles, 8 decorations, 4 buildings) + `generatePreRenderedGround()` + `generateNPCTexture()`
- `src/rendering/ParticleConfigs.ts` — Add butterfly and fountain particle configs + textures
- `src/scenes/BootScene.ts` — Call new texture generators, update loading bar steps
- `src/scenes/WorldScene.ts` — Replace tile loops with ground canvas, place decorations/buildings from mapLayout, integrate NPCSystem, add new particle emitters

---

## Chunk 1: Foundation (Tasks 1-3)

### Task 1: Add Seeded Random Utility

**Files:**
- Modify: `src/utils/canvasUtils.ts:121` (append after last function)

- [ ] **Step 1: Add `createSeededRandom` to canvasUtils.ts**

Append at end of `src/utils/canvasUtils.ts` (after line 121):

```ts
/**
 * Mulberry32 seeded PRNG. Returns a function that produces
 * deterministic pseudo-random numbers in [0, 1) for a given seed.
 */
export function createSeededRandom(seed: number): () => number {
  let s = seed | 0;
  return function () {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd /c/Learnings/game-website && npx tsc --noEmit`
Expected: No errors.

---

### Task 2: Create Map Layout Data File

**Files:**
- Create: `src/data/mapLayout.ts`

This is the single source of truth for all world positions. It replaces hardcoded arrays scattered across `WorldScene.ts`.

- [ ] **Step 1: Create `src/data/mapLayout.ts` with tile types, road definitions, and existing positions**

```ts
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
  { id: 'north-junc',   x: 20 * 32,  y: 8 * 32,       neighbors: ['main-center', 'north-top', 'cinema-junc'] },
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
      { startMinute: 720, endMinute: 960,  behavior: 'walk-route', route: ['cinema-front', 'cinema-junc', 'north-junc', 'market-w', 'market-e', 'market-w', 'north-junc', 'cinema-junc', 'cinema-front'] },
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
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd /c/Learnings/game-website && npx tsc --noEmit`
Expected: No errors.

---

### Task 3: Pre-Rendered Ground Canvas

**Files:**
- Modify: `src/rendering/WorldRenderer.ts:900-922` (add new tile generators + ground canvas)
- Modify: `src/scenes/BootScene.ts:31-33` (call ground canvas generator)
- Modify: `src/scenes/WorldScene.ts:66-82` (replace tile loops with single image)

This is the single highest-impact change: ~1260 individual sprites become 1 image.

- [ ] **Step 1: Add stone tile and dark grass tile generators to WorldRenderer**

In `src/rendering/WorldRenderer.ts`, first add the import at the top of the file (after the Phaser import):

```ts
import { createSeededRandom } from '../utils/canvasUtils';
```

Then add these new methods BEFORE `generateAllTextures()` (before line 906):

```ts
  // ---------------------------------------------------------------------------
  // Stone Tile (cobblestone paths)
  // ---------------------------------------------------------------------------

  static generateStoneTile(scene: Phaser.Scene): void {
    const [canvas, ctx] = this.makeCanvas(32, 32);

    // Base grey
    const baseGrad = ctx.createLinearGradient(0, 0, 32, 32);
    baseGrad.addColorStop(0, '#8a8a8a');
    baseGrad.addColorStop(0.5, '#9a9a9a');
    baseGrad.addColorStop(1, '#8a8a8a');
    ctx.fillStyle = baseGrad;
    ctx.fillRect(0, 0, 32, 32);

    // Cobblestone pattern — rounded rects in a grid
    ctx.fillStyle = '#7a7a7a';
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        const offsetX = row % 2 === 0 ? 0 : 4;
        const bx = col * 8 + offsetX;
        const by = row * 8;
        ctx.beginPath();
        ctx.roundRect(bx + 1, by + 1, 6, 6, 1);
        ctx.fill();
      }
    }

    // Mortar lines (light cracks)
    ctx.strokeStyle = 'rgba(180, 170, 160, 0.3)';
    ctx.lineWidth = 0.5;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(0, i * 8);
      ctx.lineTo(32, i * 8);
      ctx.stroke();
    }

    this.register(scene, 'stone-tile', canvas);
  }

  // ---------------------------------------------------------------------------
  // Dark Grass Tile (shaded areas under trees)
  // ---------------------------------------------------------------------------

  static generateDarkGrassTile(scene: Phaser.Scene): void {
    const [canvas, ctx] = this.makeCanvas(32, 32);

    // Darker green base
    const baseGrad = ctx.createLinearGradient(0, 0, 32, 32);
    baseGrad.addColorStop(0, '#3a6835');
    baseGrad.addColorStop(0.5, '#2d5a28');
    baseGrad.addColorStop(1, '#3a6835');
    ctx.fillStyle = baseGrad;
    ctx.fillRect(0, 0, 32, 32);

    // Organic texture (same pattern as grass but darker — seeded for determinism)
    const rng = createSeededRandom(9999);
    for (let i = 0; i < 20; i++) {
      const x = rng() * 32;
      const y = rng() * 32;
      ctx.fillStyle = `rgba(40, 80, 35, ${0.2 + rng() * 0.3})`;
      ctx.fillRect(x, y, 2, 2);
    }

    this.register(scene, 'dark-grass-tile', canvas);
  }

  // ---------------------------------------------------------------------------
  // Pre-Rendered Ground Canvas
  // ---------------------------------------------------------------------------

  static generatePreRenderedGround(scene: Phaser.Scene, tileGrid: TileType[][]): void {
    const mapW = tileGrid[0].length;
    const mapH = tileGrid.length;
    const ts = 32;
    const [canvas, ctx] = this.makeCanvas(mapW * ts, mapH * ts);

    // Get tile textures from scene
    const grassSource = scene.textures.get('grass-tile').getSourceImage() as HTMLCanvasElement;
    const dirtSource = scene.textures.get('dirt-tile').getSourceImage() as HTMLCanvasElement;
    const stoneSource = scene.textures.get('stone-tile').getSourceImage() as HTMLCanvasElement;
    const darkGrassSource = scene.textures.get('dark-grass-tile').getSourceImage() as HTMLCanvasElement;

    // Paint every tile
    for (let y = 0; y < mapH; y++) {
      for (let x = 0; x < mapW; x++) {
        const tile = tileGrid[y][x];
        let src: HTMLCanvasElement;
        switch (tile) {
          case 1 /* TileType.Dirt */: src = dirtSource; break;
          case 2 /* TileType.Stone */: src = stoneSource; break;
          case 3 /* TileType.GrassDark */: src = darkGrassSource; break;
          default: src = grassSource; break;
        }
        ctx.drawImage(src, x * ts, y * ts, ts, ts);
      }
    }

    // Edge blending: where road meets grass, draw a soft 4px gradient strip
    for (let y = 0; y < mapH; y++) {
      for (let x = 0; x < mapW; x++) {
        const tile = tileGrid[y][x];
        if (tile !== 1 && tile !== 2) continue; // only blend road edges

        const roadColor = tile === 1 ? 'rgba(139, 119, 92,' : 'rgba(138, 138, 138,';

        // Check each cardinal neighbor
        const neighbors: Array<[number, number, string]> = [
          [x, y - 1, 'top'],
          [x, y + 1, 'bottom'],
          [x - 1, y, 'left'],
          [x + 1, y, 'right'],
        ];

        for (const [nx, ny, side] of neighbors) {
          if (nx < 0 || nx >= mapW || ny < 0 || ny >= mapH) continue;
          const neighborTile = tileGrid[ny][nx];
          if (neighborTile === 0 || neighborTile === 3) {
            // Neighbor is grass — draw blend strip on the grass side
            const blendW = 4;
            let gx: number, gy: number, gw: number, gh: number;
            let gradX0: number, gradY0: number, gradX1: number, gradY1: number;

            switch (side) {
              case 'top':
                gx = x * ts; gy = ny * ts + ts - blendW; gw = ts; gh = blendW;
                gradX0 = 0; gradY0 = blendW; gradX1 = 0; gradY1 = 0;
                break;
              case 'bottom':
                gx = x * ts; gy = ny * ts; gw = ts; gh = blendW;
                gradX0 = 0; gradY0 = 0; gradX1 = 0; gradY1 = blendW;
                break;
              case 'left':
                gx = nx * ts + ts - blendW; gy = y * ts; gw = blendW; gh = ts;
                gradX0 = blendW; gradY0 = 0; gradX1 = 0; gradY1 = 0;
                break;
              case 'right':
              default:
                gx = nx * ts; gy = y * ts; gw = blendW; gh = ts;
                gradX0 = 0; gradY0 = 0; gradX1 = blendW; gradY1 = 0;
                break;
            }

            const grad = ctx.createLinearGradient(gx + gradX0, gy + gradY0, gx + gradX1, gy + gradY1);
            grad.addColorStop(0, roadColor + '0.4)');
            grad.addColorStop(1, roadColor + '0)');
            ctx.fillStyle = grad;
            ctx.fillRect(gx, gy, gw, gh);
          }
        }
      }
    }

    this.register(scene, 'ground-canvas', canvas);
  }
```

- [ ] **Step 2: Update `generateAllTextures` to call new tile generators**

In `src/rendering/WorldRenderer.ts`, modify `generateAllTextures()` (line 906) to add calls to the new generators. Add these lines after line 909 (`this.generateGrassDirtEdge(scene);`):

```ts
    this.generateStoneTile(scene);
    this.generateDarkGrassTile(scene);
```

- [ ] **Step 3: Add ground canvas generation to BootScene**

In `src/scenes/BootScene.ts`, add the import at the top (after line 1):

```ts
import { buildTileGrid } from '../data/mapLayout';
```

Then after `WorldRenderer.generateAllTextures(this);` and `updateBar();` (after line 33), add:

```ts
    // Generate pre-rendered ground canvas
    WorldRenderer.generatePreRenderedGround(this, buildTileGrid());
    updateBar();
```

Also update `totalSteps` on line 25 to add 1:

```ts
    const totalSteps = 4 + outfitCount * 2 * 2; // 1 world + 1 ground + 1 particles + 1 photo + outfits
```

- [ ] **Step 4: Replace tile loops in WorldScene.createMap() with single ground image**

In `src/scenes/WorldScene.ts`, add import at top (after line 4):

```ts
import {
  MAP_WIDTH, MAP_HEIGHT, TILE_SIZE,
  TREE_POSITIONS, FLOWER_POSITIONS, FENCE_POSITIONS, LAMP_POSITIONS,
  CHECKPOINT_POSITIONS,
} from '../data/mapLayout';
```

Then replace `createMap()` (lines 66-123) with:

```ts
  private createMap(): void {
    const mapW = MAP_WIDTH * TILE_SIZE;
    const mapH = MAP_HEIGHT * TILE_SIZE;

    // Single pre-rendered ground image (replaces ~1260 individual tile sprites)
    if (this.textures.exists('ground-canvas')) {
      this.add.image(mapW / 2, mapH / 2, 'ground-canvas');
    } else {
      // Legacy fallback: individual tiles
      for (let y = 0; y < MAP_HEIGHT; y++) {
        for (let x = 0; x < MAP_WIDTH; x++) {
          this.add.image(x * TILE_SIZE + 16, y * TILE_SIZE + 16, 'grass-tile');
        }
      }
      for (let x = 5; x < 35; x++) {
        this.add.image(x * TILE_SIZE + 16, 15 * TILE_SIZE + 16, 'dirt-tile');
      }
      for (let y = 5; y < 25; y++) {
        this.add.image(20 * TILE_SIZE + 16, y * TILE_SIZE + 16, 'dirt-tile');
      }
    }

    // Trees
    TREE_POSITIONS.forEach(([x, y]) => {
      const tree = this.add.image(x * TILE_SIZE + 16, y * TILE_SIZE + 8, 'tree');
      tree.setDepth(y * TILE_SIZE);
    });

    // Flowers
    FLOWER_POSITIONS.forEach(([x, y]) => {
      const flower = this.add.image(x * TILE_SIZE + 16, y * TILE_SIZE + 16, 'flower-patch');
      flower.setDepth(y * TILE_SIZE - 1);
    });

    // Fences
    FENCE_POSITIONS.forEach(([x, y]) => {
      const fence = this.add.image(x * TILE_SIZE + 16, y * TILE_SIZE + 16, 'fence');
      fence.setDepth(y * TILE_SIZE);
    });

    // Lamp posts
    LAMP_POSITIONS.forEach(([x, y]) => {
      const lamp = this.add.image(x * TILE_SIZE + 16, y * TILE_SIZE + 8, 'lamp-post');
      lamp.setDepth(y * TILE_SIZE);
    });

    this.physics.world.setBounds(0, 0, MAP_WIDTH * TILE_SIZE, MAP_HEIGHT * TILE_SIZE);
  }
```

- [ ] **Step 5: Update checkpoint positions to use mapLayout data**

In `src/scenes/WorldScene.ts`, update `createCheckpointZones()` to use the imported `CHECKPOINT_POSITIONS` instead of its hardcoded positions. Replace lines 163-170 (the `positions` object inside `createCheckpointZones`) with:

```ts
      const pos = CHECKPOINT_POSITIONS[cp.id];
```

And remove the local `positions` constant entirely.

Also update `refreshUI()` (lines 512-519) to use the same import. Replace the `positions` object there with:

```ts
    const positions = CHECKPOINT_POSITIONS;
```

- [ ] **Step 6: Update camera bounds and sky renderer to use constants**

In `src/scenes/WorldScene.ts`, update `setupCamera()` (line 262) to use constants:

```ts
    this.cameras.main.setBounds(0, 0, MAP_WIDTH * TILE_SIZE, MAP_HEIGHT * TILE_SIZE);
```

Update `create()` (line 52) sky renderer:

```ts
    this.skyRenderer.create(this, MAP_WIDTH * TILE_SIZE, MAP_HEIGHT * TILE_SIZE);
```

Update `setupInput()` tap-to-move clamps (lines 290-291):

```ts
      const clampedX = Phaser.Math.Clamp(worldPoint.x, 0, MAP_WIDTH * TILE_SIZE);
      const clampedY = Phaser.Math.Clamp(worldPoint.y, 0, MAP_HEIGHT * TILE_SIZE);
```

- [ ] **Step 7: Verify the game runs correctly**

Run: `cd /c/Learnings/game-website && npx tsc --noEmit`
Then: `npm run dev`

Expected:
- TypeScript compiles without errors
- Game loads successfully
- Ground renders as a single image with grass, dirt roads, cobblestone paths, dark grass under trees
- Road edges have soft blending into grass
- All 6 checkpoint buildings still appear and work
- Trees, flowers, fences, lamp posts appear at their positions (including new ones)
- Player movement and camera work unchanged
- Performance: dramatically fewer game objects (check browser dev tools → Phaser debug)

---

## Chunk 2: Decorations and Buildings (Tasks 4-6)

### Task 4: Decoration Texture Generators

**Files:**
- Modify: `src/rendering/WorldRenderer.ts` (add 8 decoration texture generators before `generateAllTextures`)

- [ ] **Step 1: Add bench, mailbox, signpost, trashcan texture generators**

Add these static methods to `WorldRenderer` (before `generateAllTextures`):

```ts
  // ---------------------------------------------------------------------------
  // Bench (48x32)
  // ---------------------------------------------------------------------------

  static generateBench(scene: Phaser.Scene): void {
    const [canvas, ctx] = this.makeCanvas(48, 32);

    // Bench legs
    ctx.fillStyle = '#5c4033';
    ctx.fillRect(6, 20, 4, 12);
    ctx.fillRect(38, 20, 4, 12);

    // Seat
    const seatGrad = ctx.createLinearGradient(0, 14, 0, 22);
    seatGrad.addColorStop(0, '#8b6914');
    seatGrad.addColorStop(1, '#6b4f12');
    ctx.fillStyle = seatGrad;
    ctx.beginPath();
    ctx.roundRect(4, 14, 40, 8, 2);
    ctx.fill();

    // Seat planks (lines)
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.lineWidth = 0.5;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(6, 16 + i * 2);
      ctx.lineTo(42, 16 + i * 2);
      ctx.stroke();
    }

    // Back rest
    ctx.fillStyle = '#7a5c14';
    ctx.beginPath();
    ctx.roundRect(6, 8, 36, 6, 2);
    ctx.fill();

    // Armrests
    ctx.fillStyle = '#5c4033';
    ctx.fillRect(4, 10, 4, 12);
    ctx.fillRect(40, 10, 4, 12);

    this.register(scene, 'bench', canvas);
  }

  // ---------------------------------------------------------------------------
  // Mailbox (24x40)
  // ---------------------------------------------------------------------------

  static generateMailbox(scene: Phaser.Scene): void {
    const [canvas, ctx] = this.makeCanvas(24, 40);

    // Post
    ctx.fillStyle = '#6b4f12';
    ctx.fillRect(10, 18, 4, 22);

    // Box body
    ctx.fillStyle = '#cc3333';
    ctx.beginPath();
    ctx.roundRect(3, 4, 18, 16, 3);
    ctx.fill();

    // Box top (slightly darker)
    ctx.fillStyle = '#aa2222';
    ctx.beginPath();
    ctx.roundRect(3, 4, 18, 4, [3, 3, 0, 0]);
    ctx.fill();

    // Mail slot
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(7, 12, 10, 2);

    // Flag
    ctx.fillStyle = '#ff6347';
    ctx.fillRect(20, 6, 2, 8);
    ctx.fillRect(18, 6, 4, 3);

    this.register(scene, 'mailbox', canvas);
  }

  // ---------------------------------------------------------------------------
  // Signpost (32x48)
  // ---------------------------------------------------------------------------

  static generateSignpost(scene: Phaser.Scene): void {
    const [canvas, ctx] = this.makeCanvas(32, 48);

    // Post
    ctx.fillStyle = '#6b4f12';
    ctx.fillRect(14, 12, 4, 36);

    // Sign board (arrow shape pointing right)
    ctx.fillStyle = '#8b6914';
    ctx.beginPath();
    ctx.moveTo(4, 4);
    ctx.lineTo(24, 4);
    ctx.lineTo(28, 10);
    ctx.lineTo(24, 16);
    ctx.lineTo(4, 16);
    ctx.closePath();
    ctx.fill();

    // Sign border
    ctx.strokeStyle = '#5c4033';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Text lines (decorative)
    ctx.fillStyle = '#3c2a10';
    ctx.fillRect(8, 8, 12, 1);
    ctx.fillRect(8, 11, 8, 1);

    this.register(scene, 'signpost', canvas);
  }

  // ---------------------------------------------------------------------------
  // Trash Can (20x28)
  // ---------------------------------------------------------------------------

  static generateTrashcan(scene: Phaser.Scene): void {
    const [canvas, ctx] = this.makeCanvas(20, 28);

    // Can body
    const bodyGrad = ctx.createLinearGradient(0, 0, 20, 0);
    bodyGrad.addColorStop(0, '#808080');
    bodyGrad.addColorStop(0.5, '#a0a0a0');
    bodyGrad.addColorStop(1, '#808080');
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.roundRect(3, 8, 14, 18, [0, 0, 2, 2]);
    ctx.fill();

    // Lid
    ctx.fillStyle = '#707070';
    ctx.beginPath();
    ctx.roundRect(2, 5, 16, 4, [3, 3, 0, 0]);
    ctx.fill();

    // Lid handle
    ctx.fillStyle = '#606060';
    ctx.fillRect(8, 2, 4, 4);

    // Bands
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(4, 14);
    ctx.lineTo(16, 14);
    ctx.moveTo(4, 20);
    ctx.lineTo(16, 20);
    ctx.stroke();

    this.register(scene, 'trashcan', canvas);
  }
```

- [ ] **Step 2: Add planter, well, fountain, picnic-blanket texture generators**

Continue adding to `WorldRenderer`:

```ts
  // ---------------------------------------------------------------------------
  // Flower Planter (32x32)
  // ---------------------------------------------------------------------------

  static generatePlanter(scene: Phaser.Scene): void {
    const [canvas, ctx] = this.makeCanvas(32, 32);

    // Stone box
    ctx.fillStyle = '#a0968a';
    ctx.beginPath();
    ctx.roundRect(4, 16, 24, 14, 2);
    ctx.fill();

    // Dirt inside
    ctx.fillStyle = '#6b4f12';
    ctx.fillRect(6, 16, 20, 4);

    // Flowers on top (fixed positions — no random for determinism)
    const flowerColors = ['#ff6b8a', '#ffd700', '#ff69b4', '#ff4500', '#da70d6'];
    const stemHeights = [10, 8, 11, 9, 10];
    const headOffsets = [8, 7, 9, 8, 7];
    for (let i = 0; i < 5; i++) {
      const fx = 8 + i * 4;
      // Stem
      ctx.strokeStyle = '#2d8b1b';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(fx, 16);
      ctx.lineTo(fx, stemHeights[i]);
      ctx.stroke();
      // Flower head
      ctx.fillStyle = flowerColors[i];
      ctx.beginPath();
      ctx.arc(fx, headOffsets[i], 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    this.register(scene, 'planter', canvas);
  }

  // ---------------------------------------------------------------------------
  // Well (48x48)
  // ---------------------------------------------------------------------------

  static generateWell(scene: Phaser.Scene): void {
    const [canvas, ctx] = this.makeCanvas(48, 48);

    // Stone wall (circular shape represented as octagon-ish)
    ctx.fillStyle = '#8a8278';
    ctx.beginPath();
    ctx.arc(24, 30, 16, 0, Math.PI * 2);
    ctx.fill();

    // Inner dark (water)
    ctx.fillStyle = '#1a3a5c';
    ctx.beginPath();
    ctx.arc(24, 28, 10, 0, Math.PI * 2);
    ctx.fill();

    // Stone texture on rim
    ctx.strokeStyle = '#6a6258';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(24, 30, 16, 0, Math.PI * 2);
    ctx.stroke();

    // Wooden crossbar
    ctx.fillStyle = '#6b4f12';
    ctx.fillRect(8, 8, 3, 22);   // Left post
    ctx.fillRect(37, 8, 3, 22);  // Right post
    ctx.fillRect(8, 6, 32, 3);   // Crossbar

    // Bucket rope
    ctx.strokeStyle = '#5c4033';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(24, 9);
    ctx.lineTo(24, 22);
    ctx.stroke();

    // Small bucket
    ctx.fillStyle = '#5c4033';
    ctx.fillRect(21, 22, 6, 5);

    this.register(scene, 'well', canvas);
  }

  // ---------------------------------------------------------------------------
  // Fountain (48x48)
  // ---------------------------------------------------------------------------

  static generateFountain(scene: Phaser.Scene): void {
    const [canvas, ctx] = this.makeCanvas(48, 48);

    // Base basin
    ctx.fillStyle = '#9a9088';
    ctx.beginPath();
    ctx.ellipse(24, 36, 20, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    // Water surface
    ctx.fillStyle = '#4a9adf';
    ctx.globalAlpha = 0.6;
    ctx.beginPath();
    ctx.ellipse(24, 34, 16, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Center pillar
    ctx.fillStyle = '#a0968a';
    ctx.fillRect(21, 16, 6, 20);

    // Top bowl
    ctx.fillStyle = '#9a9088';
    ctx.beginPath();
    ctx.ellipse(24, 16, 10, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Water spout dots (decorative)
    ctx.fillStyle = '#6ab8e8';
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.arc(20, 20, 1.5, 0, Math.PI * 2);
    ctx.arc(28, 20, 1.5, 0, Math.PI * 2);
    ctx.arc(24, 18, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    this.register(scene, 'fountain', canvas);
  }

  // ---------------------------------------------------------------------------
  // Picnic Blanket (48x32)
  // ---------------------------------------------------------------------------

  static generatePicnicBlanket(scene: Phaser.Scene): void {
    const [canvas, ctx] = this.makeCanvas(48, 32);

    // Blanket base (red)
    ctx.fillStyle = '#cc4444';
    ctx.beginPath();
    // Slightly irregular shape (not a perfect rectangle)
    ctx.moveTo(4, 4);
    ctx.lineTo(44, 2);
    ctx.lineTo(46, 28);
    ctx.lineTo(2, 30);
    ctx.closePath();
    ctx.fill();

    // White checkerboard pattern
    ctx.fillStyle = '#ffffff';
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 6; col++) {
        if ((row + col) % 2 === 0) {
          ctx.fillRect(4 + col * 7, 4 + row * 7, 6, 6);
        }
      }
    }

    // Subtle shadow/fold
    ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.fillRect(24, 2, 2, 28);

    this.register(scene, 'picnic-blanket', canvas);
  }
```

- [ ] **Step 3: Update `generateAllTextures` to call all new decoration generators**

In `src/rendering/WorldRenderer.ts`, update `generateAllTextures()` to include the new calls. After the stone/dark grass calls added in Task 3, add:

```ts
    this.generateBench(scene);
    this.generateMailbox(scene);
    this.generateSignpost(scene);
    this.generateTrashcan(scene);
    this.generatePlanter(scene);
    this.generateWell(scene);
    this.generateFountain(scene);
    this.generatePicnicBlanket(scene);
```

- [ ] **Step 4: Verify TypeScript compiles and textures generate**

Run: `cd /c/Learnings/game-website && npx tsc --noEmit`
Then: `npm run dev`

Expected: Game loads. New textures exist (not visible on map yet — that's Task 5).

---

### Task 5: Place Decorations on the Map

**Files:**
- Modify: `src/scenes/WorldScene.ts` — import DECORATIONS, place them in createMap

- [ ] **Step 1: Add DECORATIONS import and placement in createMap**

In `src/scenes/WorldScene.ts`, update the import from mapLayout to include `DECORATIONS`:

```ts
import {
  MAP_WIDTH, MAP_HEIGHT, TILE_SIZE,
  TREE_POSITIONS, FLOWER_POSITIONS, FENCE_POSITIONS, LAMP_POSITIONS,
  CHECKPOINT_POSITIONS, DECORATIONS,
} from '../data/mapLayout';
```

Then at the end of `createMap()` (before the `this.physics.world.setBounds` line), add:

```ts
    // Street decorations (benches, mailboxes, etc.)
    DECORATIONS.forEach((dec) => {
      const key = dec.type;
      if (this.textures.exists(key)) {
        const sprite = this.add.image(
          dec.tileX * TILE_SIZE + 16,
          dec.tileY * TILE_SIZE + 16,
          key,
        );
        sprite.setScale(dec.scale ?? 1);
        sprite.setDepth(dec.tileY * TILE_SIZE);
      }
    });
```

- [ ] **Step 2: Verify decorations render**

Run: `npm run dev`

Expected: Benches, mailboxes, signposts, trash cans, planters, well, fountain, and picnic blanket visible on the map at their defined positions. Depth sorting correct (player walks behind/in front correctly).

---

### Task 6: Decorative Building Textures and Placement

**Files:**
- Modify: `src/rendering/WorldRenderer.ts` — add 4 building draw functions + update generateBuilding switch
- Modify: `src/scenes/WorldScene.ts` — place decorative buildings from mapLayout

- [ ] **Step 1: Add 4 decorative building draw functions to WorldRenderer**

Add these methods to `WorldRenderer` (before `generateAllTextures`):

```ts
  // ---------------------------------------------------------------------------
  // Decorative Building: Bookshop
  // ---------------------------------------------------------------------------

  private static drawBookshop(ctx: CanvasRenderingContext2D): void {
    // Warm wooden facade
    const wallGrad = ctx.createLinearGradient(0, 40, 0, 230);
    wallGrad.addColorStop(0, '#8b6914');
    wallGrad.addColorStop(1, '#6b4f12');
    ctx.fillStyle = wallGrad;
    ctx.fillRect(20, 40, 216, 190);

    // Roof
    ctx.fillStyle = '#5c3a1e';
    ctx.beginPath();
    ctx.moveTo(10, 50);
    ctx.lineTo(128, 10);
    ctx.lineTo(246, 50);
    ctx.closePath();
    ctx.fill();

    // Bay window
    ctx.fillStyle = '#c8e8ff';
    ctx.fillRect(40, 100, 80, 60);
    ctx.fillRect(136, 100, 80, 60);

    // Window frames
    ctx.strokeStyle = '#5c3a1e';
    ctx.lineWidth = 2;
    ctx.strokeRect(40, 100, 80, 60);
    ctx.strokeRect(136, 100, 80, 60);
    // Window cross panes
    ctx.beginPath();
    ctx.moveTo(80, 100); ctx.lineTo(80, 160);
    ctx.moveTo(40, 130); ctx.lineTo(120, 130);
    ctx.moveTo(176, 100); ctx.lineTo(176, 160);
    ctx.moveTo(136, 130); ctx.lineTo(216, 130);
    ctx.stroke();

    // Book shapes in window
    const bookColors = ['#cc3333', '#3366cc', '#33cc33', '#cc9933', '#9933cc'];
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = bookColors[i];
      ctx.fillRect(48 + i * 14, 140, 10, 16);
    }
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = bookColors[(i + 2) % 5];
      ctx.fillRect(144 + i * 14, 140, 10, 16);
    }

    // Door
    ctx.fillStyle = '#4a3520';
    ctx.beginPath();
    ctx.roundRect(100, 170, 56, 60, [8, 8, 0, 0]);
    ctx.fill();

    // Door handle
    ctx.fillStyle = '#c8a82e';
    ctx.beginPath();
    ctx.arc(146, 200, 3, 0, Math.PI * 2);
    ctx.fill();

    // Hanging sign
    ctx.fillStyle = '#4a3520';
    ctx.fillRect(108, 70, 40, 20);
    ctx.fillStyle = '#ffd700';
    ctx.font = '10px serif';
    ctx.textAlign = 'center';
    ctx.fillText('BOOKS', 128, 85);
  }

  // ---------------------------------------------------------------------------
  // Decorative Building: Bakery
  // ---------------------------------------------------------------------------

  private static drawBakery(ctx: CanvasRenderingContext2D): void {
    // Cream wall
    ctx.fillStyle = '#faf0dc';
    ctx.fillRect(20, 40, 216, 190);

    // Orange awning
    ctx.fillStyle = '#e67e22';
    ctx.beginPath();
    ctx.moveTo(10, 80);
    ctx.lineTo(246, 80);
    ctx.lineTo(240, 100);
    ctx.lineTo(16, 100);
    ctx.closePath();
    ctx.fill();

    // Awning stripes
    ctx.fillStyle = '#d35400';
    for (let i = 0; i < 8; i += 2) {
      ctx.fillRect(16 + i * 28, 80, 28, 20);
    }

    // Roof
    ctx.fillStyle = '#a0522d';
    ctx.fillRect(10, 30, 236, 20);

    // Window with warm glow
    ctx.fillStyle = '#ffe4b5';
    ctx.fillRect(50, 110, 70, 50);
    ctx.fillRect(136, 110, 70, 50);

    // Window frames
    ctx.strokeStyle = '#8b6914';
    ctx.lineWidth = 2;
    ctx.strokeRect(50, 110, 70, 50);
    ctx.strokeRect(136, 110, 70, 50);

    // Bread shapes in window
    ctx.fillStyle = '#daa520';
    ctx.beginPath();
    ctx.ellipse(75, 140, 15, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(165, 140, 12, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    // Door
    ctx.fillStyle = '#8b4513';
    ctx.beginPath();
    ctx.roundRect(100, 170, 56, 60, [8, 8, 0, 0]);
    ctx.fill();

    // Croissant sign
    ctx.fillStyle = '#daa520';
    ctx.font = 'bold 14px serif';
    ctx.textAlign = 'center';
    ctx.fillText('BAKERY', 128, 70);

    // Chimney
    ctx.fillStyle = '#8b4513';
    ctx.fillRect(200, 10, 20, 25);
  }

  // ---------------------------------------------------------------------------
  // Decorative Building: Florist
  // ---------------------------------------------------------------------------

  private static drawFlorist(ctx: CanvasRenderingContext2D): void {
    // White walls with green trim
    ctx.fillStyle = '#f0f8f0';
    ctx.fillRect(20, 40, 216, 190);

    // Green trim
    ctx.fillStyle = '#2e8b57';
    ctx.fillRect(20, 40, 216, 8);
    ctx.fillRect(20, 222, 216, 8);
    ctx.fillRect(20, 40, 8, 190);
    ctx.fillRect(228, 40, 8, 190);

    // Roof
    ctx.fillStyle = '#2e8b57';
    ctx.beginPath();
    ctx.moveTo(10, 50);
    ctx.lineTo(128, 15);
    ctx.lineTo(246, 50);
    ctx.closePath();
    ctx.fill();

    // Large display window
    ctx.fillStyle = '#c8e8c8';
    ctx.fillRect(40, 90, 176, 70);
    ctx.strokeStyle = '#2e8b57';
    ctx.lineWidth = 3;
    ctx.strokeRect(40, 90, 176, 70);

    // Flowers in window display
    const colors = ['#ff69b4', '#ff4500', '#ffd700', '#da70d6', '#ff6347', '#ff1493', '#ffa500'];
    for (let i = 0; i < 12; i++) {
      const fx = 55 + (i % 6) * 26;
      const fy = i < 6 ? 120 : 145;
      // Stem
      ctx.strokeStyle = '#228b22';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(fx, fy);
      ctx.lineTo(fx, fy - 15);
      ctx.stroke();
      // Flower
      ctx.fillStyle = colors[i % colors.length];
      ctx.beginPath();
      ctx.arc(fx, fy - 17, 5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Door
    ctx.fillStyle = '#2e8b57';
    ctx.beginPath();
    ctx.roundRect(100, 175, 56, 55, [8, 8, 0, 0]);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(146, 200, 3, 0, Math.PI * 2);
    ctx.fill();

    // Hanging baskets
    ctx.fillStyle = '#228b22';
    ctx.beginPath();
    ctx.arc(50, 75, 12, 0, Math.PI, false);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(206, 75, 12, 0, Math.PI, false);
    ctx.fill();
    // Flowers on baskets
    ctx.fillStyle = '#ff69b4';
    ctx.beginPath();
    ctx.arc(46, 72, 3, 0, Math.PI * 2);
    ctx.arc(54, 72, 3, 0, Math.PI * 2);
    ctx.arc(202, 72, 3, 0, Math.PI * 2);
    ctx.arc(210, 72, 3, 0, Math.PI * 2);
    ctx.fill();

    // Sign
    ctx.fillStyle = '#2e8b57';
    ctx.font = 'bold 12px serif';
    ctx.textAlign = 'center';
    ctx.fillText('FLOWERS', 128, 60);
  }

  // ---------------------------------------------------------------------------
  // Decorative Building: Gift Shop
  // ---------------------------------------------------------------------------

  private static drawGiftshop(ctx: CanvasRenderingContext2D): void {
    // Pastel purple facade
    ctx.fillStyle = '#e8d5f0';
    ctx.fillRect(20, 40, 216, 190);

    // Purple trim
    ctx.fillStyle = '#9b59b6';
    ctx.fillRect(20, 40, 216, 12);

    // Roof
    ctx.fillStyle = '#8e44ad';
    ctx.fillRect(10, 28, 236, 16);

    // Display windows
    ctx.fillStyle = '#f0e0ff';
    ctx.fillRect(40, 100, 70, 60);
    ctx.fillRect(146, 100, 70, 60);
    ctx.strokeStyle = '#9b59b6';
    ctx.lineWidth = 2;
    ctx.strokeRect(40, 100, 70, 60);
    ctx.strokeRect(146, 100, 70, 60);

    // Gift boxes in window
    const giftColors = ['#ff6b8a', '#ffd700', '#6bb5ff', '#90ee90'];
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = giftColors[i];
      const bx = 50 + i * 20;
      ctx.fillRect(bx, 130, 14, 14);
      // Ribbon
      ctx.fillStyle = giftColors[(i + 1) % 4];
      ctx.fillRect(bx + 6, 130, 2, 14);
      ctx.fillRect(bx, 136, 14, 2);
      // Bow
      ctx.beginPath();
      ctx.arc(bx + 7, 129, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    for (let i = 0; i < 2; i++) {
      ctx.fillStyle = giftColors[i + 1];
      const bx = 156 + i * 25;
      ctx.fillRect(bx, 128, 18, 18);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(bx + 8, 128, 2, 18);
      ctx.fillRect(bx, 136, 18, 2);
    }

    // Door with bow
    ctx.fillStyle = '#8e44ad';
    ctx.beginPath();
    ctx.roundRect(100, 170, 56, 60, [8, 8, 0, 0]);
    ctx.fill();
    ctx.fillStyle = '#ffd700';
    ctx.beginPath();
    ctx.arc(128, 182, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffed4a';
    ctx.beginPath();
    ctx.moveTo(120, 182);
    ctx.lineTo(128, 190);
    ctx.lineTo(136, 182);
    ctx.fill();

    // Sign
    ctx.fillStyle = '#8e44ad';
    ctx.font = 'bold 11px serif';
    ctx.textAlign = 'center';
    ctx.fillText('GIFTS', 128, 68);
  }
```

- [ ] **Step 2: Update `generateBuilding` to support new building types**

In `src/rendering/WorldRenderer.ts`, update the `generateBuilding` method (around line 134-159) to include the new types in its switch statement. Find the switch inside `generateBuilding` and add cases:

```ts
      case 'bookshop':  this.drawBookshop(ctx); break;
      case 'bakery':    this.drawBakery(ctx); break;
      case 'florist':   this.drawFlorist(ctx); break;
      case 'giftshop':  this.drawGiftshop(ctx); break;
```

Also update `generateAllTextures()` to include the new building types:

```ts
    const buildingTypes = ['restaurant', 'cafe', 'park', 'cinema', 'home', 'pizzeria', 'bookshop', 'bakery', 'florist', 'giftshop'];
```

- [ ] **Step 3: Place decorative buildings in WorldScene**

In `src/scenes/WorldScene.ts`, update the import to include `DECORATIVE_BUILDINGS`:

```ts
import {
  MAP_WIDTH, MAP_HEIGHT, TILE_SIZE,
  TREE_POSITIONS, FLOWER_POSITIONS, FENCE_POSITIONS, LAMP_POSITIONS,
  CHECKPOINT_POSITIONS, DECORATIONS, DECORATIVE_BUILDINGS,
} from '../data/mapLayout';
```

Add decorative building placement at the end of `createMap()` (before `this.physics.world.setBounds`):

```ts
    // Decorative (non-interactive) buildings
    DECORATIVE_BUILDINGS.forEach((bldg) => {
      const texKey = `building-${bldg.type}`;
      if (this.textures.exists(texKey)) {
        const worldX = bldg.tileX * TILE_SIZE;
        const worldY = bldg.tileY * TILE_SIZE;
        const sprite = this.add.image(worldX, worldY, texKey);
        sprite.setScale(bldg.scale);
        sprite.setDepth(worldY - 32);

        // Label
        this.add.text(worldX, worldY + 40, bldg.label, {
          fontSize: '10px',
          color: '#ffffff',
          backgroundColor: '#00000088',
          padding: { x: 4, y: 2 },
        }).setOrigin(0.5).setDepth(worldY);
      }
    });
```

- [ ] **Step 4: Verify buildings render correctly**

Run: `npm run dev`

Expected: Bookshop, Bakery, Florist, and Gift Shop appear on the map with labels. No interaction zones on them. Visual style consistent with existing buildings.

---

## Chunk 3: NPC System (Tasks 7-8)

### Task 7: NPC Texture Generation

**Files:**
- Modify: `src/rendering/WorldRenderer.ts` — add `generateNPCTexture` method
- Modify: `src/scenes/BootScene.ts` — generate NPC textures at boot

- [ ] **Step 1: Add NPC texture generator to WorldRenderer**

Add to `WorldRenderer`:

```ts
  // ---------------------------------------------------------------------------
  // NPC Sprite (32x48, 3 frames: idle, walk-left, walk-right)
  // ---------------------------------------------------------------------------

  static generateNPCTexture(
    scene: Phaser.Scene,
    id: string,
    palette: { skin: string; hair: string; shirt: string; pants: string },
  ): void {
    for (let frame = 0; frame < 3; frame++) {
      const [canvas, ctx] = this.makeCanvas(32, 48);

      // Head
      ctx.fillStyle = palette.skin;
      ctx.beginPath();
      ctx.arc(16, 12, 6, 0, Math.PI * 2);
      ctx.fill();

      // Hair
      ctx.fillStyle = palette.hair;
      ctx.beginPath();
      ctx.arc(16, 10, 6, Math.PI, 0); // top half
      ctx.fill();

      // Body / shirt
      ctx.fillStyle = palette.shirt;
      ctx.fillRect(9, 18, 14, 14);

      // Arms (slight swing per frame)
      const armSwing = frame === 0 ? 0 : frame === 1 ? -2 : 2;
      ctx.fillStyle = palette.shirt;
      ctx.fillRect(5, 19 + armSwing, 4, 10);
      ctx.fillRect(23, 19 - armSwing, 4, 10);

      // Hands
      ctx.fillStyle = palette.skin;
      ctx.beginPath();
      ctx.arc(7, 30 + armSwing, 2, 0, Math.PI * 2);
      ctx.arc(25, 30 - armSwing, 2, 0, Math.PI * 2);
      ctx.fill();

      // Legs / pants
      ctx.fillStyle = palette.pants;
      const legOffset = frame === 0 ? 0 : frame === 1 ? 2 : -2;
      ctx.fillRect(10, 32, 5, 12 + legOffset);
      ctx.fillRect(17, 32, 5, 12 - legOffset);

      // Shoes
      ctx.fillStyle = '#333333';
      ctx.fillRect(9, 43 + Math.max(0, legOffset), 6, 3);
      ctx.fillRect(17, 43 + Math.max(0, -legOffset), 6, 3);

      // Eyes (tiny dots)
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(14, 11, 1, 1);
      ctx.fillRect(18, 11, 1, 1);

      this.register(scene, `npc-${id}-frame-${frame}`, canvas);
    }

    // Create walk animation
    scene.anims.create({
      key: `npc-${id}-walk`,
      frames: [
        { key: `npc-${id}-frame-1` },
        { key: `npc-${id}-frame-0` },
        { key: `npc-${id}-frame-2` },
        { key: `npc-${id}-frame-0` },
      ],
      frameRate: 4,
      repeat: -1,
    });
  }
```

- [ ] **Step 2: Generate NPC textures in BootScene**

In `src/scenes/BootScene.ts`, update the mapLayout import (already added in Task 3) to include `NPCS`:

```ts
import { buildTileGrid, NPCS } from '../data/mapLayout';
```

After the ground canvas generation and `updateBar()` call (added in Task 3), add:

```ts
    // Generate NPC textures
    for (const npcDef of NPCS) {
      WorldRenderer.generateNPCTexture(this, npcDef.id, npcDef.palette);
    }
    updateBar();
```

Update `totalSteps` to add 1 more:

```ts
    const totalSteps = 5 + outfitCount * 2 * 2; // world + ground + particles + photo + NPCs + outfits
```

- [ ] **Step 3: Verify NPC textures generate**

Run: `npx tsc --noEmit && npm run dev`

Expected: Game loads without errors. NPC textures exist in texture manager (check console: `game.textures.list` should include `npc-baker-frame-0`, etc.). NPCs not visible yet (that's Task 8).

---

### Task 8: NPC System Implementation

**Files:**
- Create: `src/systems/NPCSystem.ts`
- Modify: `src/scenes/WorldScene.ts` — integrate NPCSystem

- [ ] **Step 1: Create the NPCSystem file**

Create `src/systems/NPCSystem.ts`:

```ts
import Phaser from 'phaser';
import type { NPCDef, NPCScheduleEntry, PathNode } from '../data/mapLayout';

// ---------------------------------------------------------------------------
// Behavior Strategy Interface
// ---------------------------------------------------------------------------

interface BehaviorStrategy {
  enter(npc: NPCEntity): void;
  update(npc: NPCEntity, delta: number): boolean; // true = done
  exit(npc: NPCEntity): void;
}

// ---------------------------------------------------------------------------
// NPC Entity (internal state)
// ---------------------------------------------------------------------------

interface NPCEntity {
  def: NPCDef;
  sprite: Phaser.GameObjects.Sprite;
  currentBehavior: BehaviorStrategy | null;
  currentScheduleIdx: number;
  // Movement state
  route: PathNode[];
  routeIdx: number;
  // Stuck detection
  lastX: number;
  lastY: number;
  stuckTimer: number;
  // Idle timer (for idle-at and sit-bench)
  idleTimer: number;
  idleDuration: number;
  visible: boolean;
}

// ---------------------------------------------------------------------------
// BFS Pathfinding
// ---------------------------------------------------------------------------

function bfs(
  fromId: string,
  toId: string,
  networkMap: Map<string, PathNode>,
): PathNode[] | null {
  if (fromId === toId) return [networkMap.get(fromId)!];

  const queue: string[] = [fromId];
  const visited = new Set<string>([fromId]);
  const parent = new Map<string, string>();

  while (queue.length > 0) {
    const current = queue.shift()!;
    const node = networkMap.get(current);
    if (!node) continue;

    for (const neighborId of node.neighbors) {
      if (visited.has(neighborId)) continue;
      visited.add(neighborId);
      parent.set(neighborId, current);

      if (neighborId === toId) {
        // Reconstruct path
        const path: PathNode[] = [];
        let id: string | undefined = toId;
        while (id !== undefined) {
          path.unshift(networkMap.get(id)!);
          id = parent.get(id);
        }
        return path;
      }
      queue.push(neighborId);
    }
  }

  return null; // no path
}

function findClosestNode(x: number, y: number, networkMap: Map<string, PathNode>): PathNode {
  let closest: PathNode | null = null;
  let closestDist = Infinity;
  for (const node of networkMap.values()) {
    const d = (node.x - x) ** 2 + (node.y - y) ** 2;
    if (d < closestDist) {
      closestDist = d;
      closest = node;
    }
  }
  return closest!;
}

// ---------------------------------------------------------------------------
// Concrete Behaviors
// ---------------------------------------------------------------------------

class WalkRouteBehavior implements BehaviorStrategy {
  private targetRoute: PathNode[] = [];
  private targetIdx = 0;

  constructor(private routeNodeIds: string[], private networkMap: Map<string, PathNode>) {}

  enter(npc: NPCEntity): void {
    // Build the full path from NPC's current position to route start, then the route itself
    const currentNode = findClosestNode(npc.sprite.x, npc.sprite.y, this.networkMap);
    const routeNodes = this.routeNodeIds
      .map(id => this.networkMap.get(id))
      .filter((n): n is PathNode => n !== undefined);

    if (routeNodes.length === 0) {
      this.targetRoute = [];
      return;
    }

    // BFS from current to first route node
    const pathToStart = bfs(currentNode.id, routeNodes[0].id, this.networkMap);
    if (pathToStart && pathToStart.length > 1) {
      // Combine: path to start (excluding last, which is first of route) + route
      this.targetRoute = [...pathToStart.slice(0, -1), ...routeNodes];
    } else {
      this.targetRoute = routeNodes;
    }
    this.targetIdx = 0;
  }

  update(npc: NPCEntity, delta: number): boolean {
    if (this.targetRoute.length === 0 || this.targetIdx >= this.targetRoute.length) {
      return true; // done
    }

    const target = this.targetRoute[this.targetIdx];
    const dx = target.x - npc.sprite.x;
    const dy = target.y - npc.sprite.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 4) {
      // Reached node
      npc.sprite.setPosition(target.x, target.y);
      this.targetIdx++;
      return this.targetIdx >= this.targetRoute.length;
    }

    // Move toward target
    const speed = npc.def.speed * (delta / 1000);
    const angle = Math.atan2(dy, dx);
    npc.sprite.x += Math.cos(angle) * speed;
    npc.sprite.y += Math.sin(angle) * speed;

    // Face direction
    if (dx < -1) npc.sprite.setFlipX(true);
    else if (dx > 1) npc.sprite.setFlipX(false);

    // Play walk animation
    npc.sprite.play(`npc-${npc.def.id}-walk`, true);

    return false;
  }

  exit(npc: NPCEntity): void {
    npc.sprite.stop();
    npc.sprite.setTexture(`npc-${npc.def.id}-frame-0`);
  }
}

class IdleAtBehavior implements BehaviorStrategy {
  private flipTimer = 0;
  private nextFlipAt = 0;

  constructor(private nodeId: string, private networkMap: Map<string, PathNode>) {}

  enter(npc: NPCEntity): void {
    const node = this.networkMap.get(this.nodeId);
    if (node) {
      npc.sprite.setPosition(node.x, node.y);
    }
    npc.sprite.stop();
    npc.sprite.setTexture(`npc-${npc.def.id}-frame-0`);
    npc.idleTimer = 0;
    npc.idleDuration = 8000 + Math.random() * 12000; // 8-20 seconds
    this.flipTimer = 0;
    this.nextFlipAt = 3000 + Math.random() * 4000;
  }

  update(npc: NPCEntity, delta: number): boolean {
    npc.idleTimer += delta;
    this.flipTimer += delta;

    // Occasionally look around (threshold set once, not per-frame)
    if (this.flipTimer >= this.nextFlipAt) {
      npc.sprite.setFlipX(!npc.sprite.flipX);
      this.flipTimer = 0;
      this.nextFlipAt = 3000 + Math.random() * 4000;
    }

    return npc.idleTimer >= npc.idleDuration;
  }

  exit(_npc: NPCEntity): void {}
}

class SitBenchBehavior implements BehaviorStrategy {
  constructor(private nodeId: string, private networkMap: Map<string, PathNode>) {}

  enter(npc: NPCEntity): void {
    const node = this.networkMap.get(this.nodeId);
    if (node) {
      npc.sprite.setPosition(node.x, node.y);
    }
    npc.sprite.stop();
    npc.sprite.setTexture(`npc-${npc.def.id}-frame-0`);
    // Sitting = slightly lower position
    npc.sprite.y += 4;
    npc.idleTimer = 0;
    npc.idleDuration = 15000 + Math.random() * 15000; // 15-30 seconds
  }

  update(npc: NPCEntity, delta: number): boolean {
    npc.idleTimer += delta;
    return npc.idleTimer >= npc.idleDuration;
  }

  exit(npc: NPCEntity): void {
    npc.sprite.y -= 4; // stand back up
  }
}

// ---------------------------------------------------------------------------
// NPC System
// ---------------------------------------------------------------------------

export class NPCSystem {
  private npcs: NPCEntity[] = [];
  private networkMap: Map<string, PathNode>;
  private scene: Phaser.Scene;
  private updateIndex = 0;

  constructor(scene: Phaser.Scene, npcDefs: NPCDef[], pathNetwork: PathNode[]) {
    this.scene = scene;
    this.networkMap = new Map(pathNetwork.map(n => [n.id, n]));

    for (const def of npcDefs) {
      const startNode = this.getStartNode(def);
      const sprite = scene.add.sprite(startNode.x, startNode.y, `npc-${def.id}-frame-0`);
      sprite.setDepth(startNode.y);

      const npc: NPCEntity = {
        def,
        sprite,
        currentBehavior: null,
        currentScheduleIdx: -1,
        route: [],
        routeIdx: 0,
        lastX: startNode.x,
        lastY: startNode.y,
        stuckTimer: 0,
        idleTimer: 0,
        idleDuration: 0,
        visible: true,
      };

      this.npcs.push(npc);
    }
  }

  private getStartNode(def: NPCDef): PathNode {
    if (def.schedule.length > 0) {
      const first = def.schedule[0];
      if (first.route && first.route.length > 0) {
        const node = this.networkMap.get(first.route[0]);
        if (node) return node;
      }
      if (first.idleAt) {
        const node = this.networkMap.get(first.idleAt);
        if (node) return node;
      }
    }
    // Fallback: first node in network
    return this.networkMap.values().next().value!;
  }

  update(delta: number, gameTimeMinutes: number): void {
    // Adaptive throttling: at low FPS, update fewer NPCs per frame
    const fps = 1000 / Math.max(delta, 1);
    const npcsPerFrame = fps < 30 ? 2 : fps < 45 ? 3 : this.npcs.length;

    for (let i = 0; i < Math.min(npcsPerFrame, this.npcs.length); i++) {
      const idx = (this.updateIndex + i) % this.npcs.length;
      const scaledDelta = delta * (this.npcs.length / npcsPerFrame);
      this.updateNPC(this.npcs[idx], scaledDelta, gameTimeMinutes);
    }
    this.updateIndex = (this.updateIndex + npcsPerFrame) % this.npcs.length;

    // Ambient proximity interaction: idle NPCs near each other face one another
    this.updateProximityFacing();
  }

  private updateProximityFacing(): void {
    const idleNpcs = this.npcs.filter(n => n.visible && !(n.currentBehavior instanceof WalkRouteBehavior));
    for (let i = 0; i < idleNpcs.length; i++) {
      for (let j = i + 1; j < idleNpcs.length; j++) {
        const a = idleNpcs[i];
        const b = idleNpcs[j];
        const dx = b.sprite.x - a.sprite.x;
        const dist = Math.abs(dx) + Math.abs(b.sprite.y - a.sprite.y);
        if (dist < 48 * 2) {
          // Face each other
          a.sprite.setFlipX(dx > 0);
          b.sprite.setFlipX(dx < 0);
        }
      }
    }
  }

  private updateNPC(npc: NPCEntity, delta: number, gameTimeMinutes: number): void {
    // Check schedule
    const scheduleIdx = this.getActiveScheduleIndex(npc.def.schedule, gameTimeMinutes);

    // Visibility: hide NPCs outside any schedule window
    if (scheduleIdx === -1) {
      if (npc.visible) {
        npc.visible = false;
        npc.sprite.setVisible(false);
        if (npc.currentBehavior) {
          npc.currentBehavior.exit(npc);
          npc.currentBehavior = null;
        }
      }
      return;
    }

    if (!npc.visible) {
      npc.visible = true;
      npc.sprite.setVisible(true);
    }

    // Switch behavior if schedule changed
    if (scheduleIdx !== npc.currentScheduleIdx) {
      if (npc.currentBehavior) {
        npc.currentBehavior.exit(npc);
      }
      npc.currentScheduleIdx = scheduleIdx;
      npc.currentBehavior = this.createBehavior(npc.def.schedule[scheduleIdx]);
      npc.currentBehavior.enter(npc);
    }

    // Update current behavior
    if (npc.currentBehavior) {
      const done = npc.currentBehavior.update(npc, delta);
      if (done) {
        npc.currentBehavior.exit(npc);
        // Loop: re-enter same behavior (e.g., walk route again)
        npc.currentBehavior.enter(npc);
      }
    }

    // Depth sort
    npc.sprite.setDepth(npc.sprite.y);

    // Stuck detection (only when walking)
    if (npc.currentBehavior instanceof WalkRouteBehavior) {
      const moved = Math.abs(npc.sprite.x - npc.lastX) + Math.abs(npc.sprite.y - npc.lastY);
      if (moved < 2) {
        npc.stuckTimer += delta;
        if (npc.stuckTimer > 3000) {
          // Teleport to nearest path node
          const nearest = findClosestNode(npc.sprite.x, npc.sprite.y, this.networkMap);
          npc.sprite.setPosition(nearest.x, nearest.y);
          npc.stuckTimer = 0;
          console.warn(`NPC ${npc.def.id} was stuck, teleported to ${nearest.id}`);
        }
      } else {
        npc.stuckTimer = 0;
      }
      npc.lastX = npc.sprite.x;
      npc.lastY = npc.sprite.y;
    }
  }

  private getActiveScheduleIndex(schedule: NPCScheduleEntry[], gameTime: number): number {
    for (let i = 0; i < schedule.length; i++) {
      const entry = schedule[i];
      if (entry.startMinute <= entry.endMinute) {
        if (gameTime >= entry.startMinute && gameTime < entry.endMinute) return i;
      } else {
        // Wraps midnight
        if (gameTime >= entry.startMinute || gameTime < entry.endMinute) return i;
      }
    }
    return -1; // no active schedule
  }

  private createBehavior(entry: NPCScheduleEntry): BehaviorStrategy {
    switch (entry.behavior) {
      case 'walk-route':
        return new WalkRouteBehavior(entry.route ?? [], this.networkMap);
      case 'idle-at':
        return new IdleAtBehavior(entry.idleAt ?? '', this.networkMap);
      case 'sit-bench':
        return new SitBenchBehavior(entry.idleAt ?? '', this.networkMap);
      default:
        return new IdleAtBehavior('main-center', this.networkMap);
    }
  }

  /** Get all NPC sprites (for proximity checks, etc.) */
  getSprites(): Phaser.GameObjects.Sprite[] {
    return this.npcs.filter(n => n.visible).map(n => n.sprite);
  }

  destroy(): void {
    for (const npc of this.npcs) {
      npc.sprite.destroy();
    }
    this.npcs = [];
  }
}
```

- [ ] **Step 2: Integrate NPCSystem into WorldScene**

In `src/scenes/WorldScene.ts`, add imports:

```ts
import { NPCSystem } from '../systems/NPCSystem';
import { NPCS, PATH_NETWORK } from '../data/mapLayout';
```

(Update the existing mapLayout import to include `NPCS` and `PATH_NETWORK`.)

Add instance variable after other private vars (around line 43):

```ts
  private npcSystem!: NPCSystem;
```

In `create()`, after `this.createParticles();` (line 61), add:

```ts
    this.npcSystem = new NPCSystem(this, NPCS, PATH_NETWORK);
```

In `update()`, after `this.checkCheckpointOverlap();` (line 329), add:

```ts
    this.npcSystem.update(delta, this.gameTimeMinutes);
```

- [ ] **Step 3: Verify NPCs appear and walk**

Run: `npx tsc --noEmit && npm run dev`

Expected:
- 6 NPCs appear on the map (visible during their scheduled hours, game starts at 8am/480min)
- Baker should be walking along market-lane
- Reader should be sitting near cinema
- Dog Walker should be walking the lakeside path
- Musician should appear around 10am (600min)
- Cat should be walking through the park
- NPCs walk along path network nodes, pause at idle points
- NPCs face their movement direction
- Depth sorting correct (NPCs behind/in front of player correctly)
- NPCs disappear during unscheduled hours (fast-forward time to verify)

---

## Chunk 4: Ambient Particles and Polish (Tasks 9-10)

### Task 9: Ambient Particle Effects

**Files:**
- Modify: `src/rendering/ParticleConfigs.ts` — add butterfly and fountain particle textures + configs
- Modify: `src/scenes/WorldScene.ts` — add new particle emitters

- [ ] **Step 1: Add butterfly and fountain water particle textures**

In `src/rendering/ParticleConfigs.ts`, add at the end of `generateParticleTextures()` (before the closing `}`):

```ts
  // --- Butterfly texture (10x10) ---
  {
    const canvas = document.createElement('canvas');
    canvas.width = 10;
    canvas.height = 10;
    const ctx = canvas.getContext('2d')!;

    // Body
    ctx.fillStyle = '#4a3520';
    ctx.fillRect(4, 3, 2, 5);

    // Wings (colorful dots)
    ctx.fillStyle = '#ff69b4';
    ctx.beginPath();
    ctx.ellipse(2, 4, 2.5, 3, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffa07a';
    ctx.beginPath();
    ctx.ellipse(8, 4, 2.5, 3, 0.3, 0, Math.PI * 2);
    ctx.fill();

    scene.textures.addCanvas('particle-butterfly', canvas);
  }

  // --- Fountain water droplet (6x6) ---
  {
    const canvas = document.createElement('canvas');
    canvas.width = 6;
    canvas.height = 6;
    const ctx = canvas.getContext('2d')!;

    const gradient = ctx.createRadialGradient(3, 3, 0, 3, 3, 3);
    gradient.addColorStop(0, 'rgba(106, 184, 232, 1)');
    gradient.addColorStop(1, 'rgba(106, 184, 232, 0)');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(3, 3, 3, 0, Math.PI * 2);
    ctx.fill();

    scene.textures.addCanvas('particle-water', canvas);
  }
```

- [ ] **Step 2: Add butterfly and fountain particle configs**

In `src/rendering/ParticleConfigs.ts`, add to the `PARTICLE_CONFIGS` export (after the `smoke` entry):

```ts
  butterflies: {
    speed: { min: 3, max: 8 },
    angle: { min: 0, max: 360 },
    lifespan: 6000,
    frequency: 2000,
    alpha: { start: 0.9, end: 0 },
    scale: { start: 1, end: 0.8 },
    rotate: { min: -15, max: 15 },
    emitZone: {
      type: 'random' as const,
      source: new Phaser.Geom.Rectangle(-80, -40, 160, 80),
    },
  },

  fountainWater: {
    speed: { min: 8, max: 20 },
    angle: { min: 240, max: 300 },
    lifespan: 1500,
    frequency: 200,
    alpha: { start: 0.7, end: 0 },
    scale: { start: 0.6, end: 0.3 },
    gravityY: 30,
    emitZone: {
      type: 'random' as const,
      source: new Phaser.Geom.Rectangle(-8, -4, 16, 4),
    },
  },
```

- [ ] **Step 3: Verify new textures and configs compile**

Run: `npx tsc --noEmit`

Expected: No errors. New particle textures and configs are ready. Emitter placement happens in Task 10.

---

### Task 10: Final Polish and Verification

**Files:**
- Modify: `src/scenes/WorldScene.ts` — update existing particle positions to use TILE_SIZE constant

- [ ] **Step 1: Update existing particle positions to use constants**

In `src/scenes/WorldScene.ts`, update `createParticles()` to use `CHECKPOINT_POSITIONS` and `TILE_SIZE` for consistency. Replace lines 297-307 with:

```ts
  private createParticles(): void {
    // Park leaves
    this.add.particles(
      CHECKPOINT_POSITIONS.park.x, CHECKPOINT_POSITIONS.park.y,
      'particle-leaf',
      PARTICLE_CONFIGS.leaves as Phaser.Types.GameObjects.Particles.ParticleEmitterConfig,
    );

    // Cafe steam
    this.add.particles(
      CHECKPOINT_POSITIONS.cafe.x, CHECKPOINT_POSITIONS.cafe.y - 20,
      'particle-steam',
      PARTICLE_CONFIGS.steam as Phaser.Types.GameObjects.Particles.ParticleEmitterConfig,
    );

    // Home sparkles
    this.add.particles(
      CHECKPOINT_POSITIONS.home.x, CHECKPOINT_POSITIONS.home.y,
      'particle-sparkle',
      PARTICLE_CONFIGS.sparkles as Phaser.Types.GameObjects.Particles.ParticleEmitterConfig,
    );

    // Pizzeria smoke
    this.add.particles(
      CHECKPOINT_POSITIONS.pizzeria.x + 20, CHECKPOINT_POSITIONS.pizzeria.y - 30,
      'particle-smoke',
      PARTICLE_CONFIGS.smoke as Phaser.Types.GameObjects.Particles.ParticleEmitterConfig,
    );

    // Butterflies near park
    this.add.particles(
      CHECKPOINT_POSITIONS.park.x, CHECKPOINT_POSITIONS.park.y,
      'particle-butterfly',
      PARTICLE_CONFIGS.butterflies as Phaser.Types.GameObjects.Particles.ParticleEmitterConfig,
    );

    // Fountain water effect
    this.add.particles(
      22 * TILE_SIZE, 22 * TILE_SIZE - 10,
      'particle-water',
      PARTICLE_CONFIGS.fountainWater as Phaser.Types.GameObjects.Particles.ParticleEmitterConfig,
    );

    // Bakery chimney smoke
    this.add.particles(
      6 * TILE_SIZE + 20, 15 * TILE_SIZE - 30,
      'particle-smoke',
      PARTICLE_CONFIGS.smoke as Phaser.Types.GameObjects.Particles.ParticleEmitterConfig,
    );
  }
```

- [ ] **Step 2: Full verification pass**

Run: `npx tsc --noEmit && npm run dev`

Verify ALL of the following:
1. Game loads with loading bar completing
2. Ground renders as single image (grass + dirt roads + cobblestone paths + dark grass under trees + soft edge blending)
3. All 6 checkpoint buildings appear and are interactive (enter with E key or tap)
4. 4 decorative buildings appear (Bookshop, Bakery, Florist, Gift Shop) with labels, not interactive
5. All decorations visible: benches, mailboxes, signposts, trash cans, planters, well, fountain, picnic blanket
6. ~20 trees (up from 12), ~10 flower patches (up from 6), ~12 lamp posts (up from 8), ~11 fences (up from 7)
7. 6 NPCs walking around during their scheduled hours (game starts at 8am)
8. NPCs follow path network nodes, face movement direction, animate walking
9. NPCs change behavior based on time of day
10. NPCs hidden during unscheduled hours
11. Butterflies near park, fountain water effect, bakery smoke
12. All existing particles (leaves, steam, sparkles, pizzeria smoke) still work
13. Player movement (keyboard + tap-to-move) works correctly
14. Partner follows player correctly
15. Depth sorting correct for all entities (player, partner, NPCs, trees, buildings)
16. Camera follow and zoom on checkpoint approach works
17. Performance: smooth 60fps (dramatically fewer game objects than before)

---

## Summary

| Task | Description | New/Modified Files |
|------|------------|-------------------|
| 1 | Seeded random utility | canvasUtils.ts |
| 2 | Map layout data file | mapLayout.ts (NEW) |
| 3 | Pre-rendered ground canvas | WorldRenderer.ts, BootScene.ts, WorldScene.ts |
| 4 | Decoration textures | WorldRenderer.ts |
| 5 | Place decorations | WorldScene.ts |
| 6 | Decorative buildings | WorldRenderer.ts, WorldScene.ts |
| 7 | NPC textures | WorldRenderer.ts, BootScene.ts |
| 8 | NPC system | NPCSystem.ts (NEW), WorldScene.ts |
| 9 | Ambient particles | ParticleConfigs.ts, WorldScene.ts |
| 10 | Final polish & verification | WorldScene.ts |
