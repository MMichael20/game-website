# Multi-Map Interior System Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add explorable interior maps — walk up to Michael's House on the overworld, press E, and a full 30x24 tile interior with 5 rooms loads as a new scene.

**Architecture:** One Phaser scene per building. Interior is a single contiguous tile grid with rooms as spatial zones separated by wall tiles. Doorways are 2-tile walkable gaps. Mirrors the overworld pattern (grid + decorations + checkpoint zones). Player walkability is injected rather than hardcoded.

**Tech Stack:** Phaser 3.90, TypeScript, Vite, Canvas 2D procedural pixel art.

**Design doc:** `docs/plans/2026-03-16-multi-map-interiors-design.md`

---

## Chunk 1: Foundation (Constants, Player Fix, Textures)

### Task 1: Add interior constants to constants.ts

**Files:**
- Modify: `src/utils/constants.ts`

- [ ] **Step 1: Add interior tile enum and zoom constant**

Add after the existing `OUTFIT_COUNT` export:

```ts
// Interior map constants
export const INTERIOR_ZOOM = 2.5;

export const enum InteriorTileType {
  Wood = 0,
  Carpet = 1,
  TileFloor = 2,
  Wall = 3,
  DoorFrame = 4,
  CarpetBeige = 5,
}
```

- [ ] **Step 2: Verify build passes**

Run: `npx vite build`
Expected: Build succeeds with no errors.

- [ ] **Step 3: Commit**

```bash
git add src/utils/constants.ts
git commit -m "feat: add interior tile constants and zoom level"
```

---

### Task 2: Inject walkability into Player (critical fix)

**Files:**
- Modify: `src/game/entities/Player.ts`
- Modify: `src/game/scenes/WorldScene.ts`

The Player currently imports `isWalkable` and `worldToTile` directly from `mapLayout.ts`, hardcoding it to the overworld grid. Interior scenes need their own walkability. Fix: inject a walk-check function via the constructor.

- [ ] **Step 1: Add WalkCheck type and update Player constructor**

In `src/game/entities/Player.ts`, replace the import and constructor:

```ts
// Remove: import { isWalkable, worldToTile } from '../data/mapLayout';
// Add: import { worldToTile } from '../data/mapLayout';

export type WalkCheck = (tileX: number, tileY: number) => boolean;

// In constructor, add walkCheck parameter:
constructor(scene: Phaser.Scene, x: number, y: number, outfit: number, walkCheck?: WalkCheck)
```

Store the walkCheck as a private field. If not provided, default to always-walkable (or import `isWalkable` as fallback). Since WorldScene will always pass it, the fallback is just safety.

- [ ] **Step 2: Update Player.update() to use injected walkCheck**

Replace the hardcoded `isWalkable(...)` calls in `update()` with `this.walkCheck(...)`:

```ts
private walkCheck: WalkCheck;

constructor(scene: Phaser.Scene, x: number, y: number, outfit: number, walkCheck?: WalkCheck) {
  this.walkCheck = walkCheck ?? (() => true);
  // ... rest unchanged
}

update(direction: { x: number; y: number }): void {
  const vx = direction.x * SPEED;
  const vy = direction.y * SPEED;
  const nextX = this.sprite.x + vx * (1 / 60);
  const nextY = this.sprite.y + vy * (1 / 60);

  let finalVx = vx;
  let finalVy = vy;

  if (!this.walkCheck(worldToTile(nextX, this.sprite.y).x, worldToTile(nextX, this.sprite.y).y)) {
    finalVx = 0;
  }
  if (!this.walkCheck(worldToTile(this.sprite.x, nextY).x, worldToTile(this.sprite.x, nextY).y)) {
    finalVy = 0;
  }

  // ... rest unchanged
}
```

- [ ] **Step 3: Update WorldScene to pass isWalkable to Player**

In `src/game/scenes/WorldScene.ts`, import `isWalkable` from mapLayout (it's already imported indirectly) and pass it to the Player constructor:

```ts
import { tileGrid, DECORATIONS, CHECKPOINT_ZONES, CheckpointZone, tileToWorld, worldToTile, isWalkable } from '../data/mapLayout';

// In create(), change Player instantiation:
this.player = new Player(this, spawn.x, spawn.y, state.outfits.player, isWalkable);
```

- [ ] **Step 4: Verify build passes and game works**

Run: `npx vite build`
Expected: Build succeeds. Game plays identically to before (overworld collision unchanged).

- [ ] **Step 5: Commit**

```bash
git add src/game/entities/Player.ts src/game/scenes/WorldScene.ts
git commit -m "refactor: inject walkability function into Player for multi-map support"
```

---

### Task 3: Generate interior terrain textures

**Files:**
- Modify: `src/game/rendering/PixelArtGenerator.ts`

Add procedural generation for interior floor tiles and wall tiles. These are 32x32 pixel tiles, stored as frames in a single `interior-terrain` texture sheet (same pattern as the existing `terrain` sheet).

- [ ] **Step 1: Add interior terrain drawing functions**

Add these functions before the `generateTerrain` export function (or in a new section after the terrain section). Each draws a 32x32 tile at a given X offset:

**Wood floor** — warm brown planks with horizontal grain lines:
```ts
function drawWoodFloor(ctx: Ctx, offsetX: number): void {
  const rng = seededRandom(offsetX * 23 + 7);
  // Base warm brown
  rect(ctx, offsetX, 0, 32, 32, '#b8864e');
  // Plank lines (horizontal, every 8px)
  for (let y = 0; y < 32; y += 8) {
    rect(ctx, offsetX, y, 32, 1, '#a07040');
  }
  // Grain lines (subtle horizontal streaks)
  for (let i = 0; i < 12; i++) {
    const y = Math.floor(rng() * 32);
    const x = Math.floor(rng() * 20);
    const len = Math.floor(rng() * 10) + 3;
    for (let j = 0; j < len; j++) {
      px(ctx, offsetX + x + j, y, rng() > 0.5 ? '#a87844' : '#c89860');
    }
  }
  // Knots
  for (let i = 0; i < 2; i++) {
    const kx = Math.floor(rng() * 28) + 2;
    const ky = Math.floor(rng() * 28) + 2;
    px(ctx, offsetX + kx, ky, '#8a6030');
    px(ctx, offsetX + kx + 1, ky, '#8a6030');
  }
}
```

**Carpet** — solid muted color with subtle noise texture:
```ts
function drawCarpet(ctx: Ctx, offsetX: number): void {
  const rng = seededRandom(offsetX * 31 + 13);
  // Base dusty blue
  rect(ctx, offsetX, 0, 32, 32, '#7a8fa8');
  // Noise texture
  for (let i = 0; i < 40; i++) {
    const x = Math.floor(rng() * 32);
    const y = Math.floor(rng() * 32);
    px(ctx, offsetX + x, y, rng() > 0.5 ? '#7085a0' : '#8498b0');
  }
  // Subtle weave pattern (diagonal)
  for (let y = 0; y < 32; y += 4) {
    for (let x = (y % 8 === 0 ? 0 : 2); x < 32; x += 4) {
      px(ctx, offsetX + x, y, '#6878908a');
    }
  }
}
```

**Carpet (warm beige)** — for bedrooms:
```ts
function drawCarpetBeige(ctx: Ctx, offsetX: number): void {
  const rng = seededRandom(offsetX * 33 + 17);
  // Base warm beige
  rect(ctx, offsetX, 0, 32, 32, '#c8b090');
  // Noise texture
  for (let i = 0; i < 40; i++) {
    const x = Math.floor(rng() * 32);
    const y = Math.floor(rng() * 32);
    px(ctx, offsetX + x, y, rng() > 0.5 ? '#c0a888' : '#d0b898');
  }
  // Subtle weave pattern (diagonal)
  for (let y = 0; y < 32; y += 4) {
    for (let x = (y % 8 === 0 ? 0 : 2); x < 32; x += 4) {
      px(ctx, offsetX + x, y, '#b8a0808a');
    }
  }
}
```

**Tile floor** — white/light gray checkerboard:
```ts
function drawTileFloor(ctx: Ctx, offsetX: number): void {
  const rng = seededRandom(offsetX * 37 + 19);
  // Checkerboard (8x8 sub-tiles)
  for (let ty = 0; ty < 4; ty++) {
    for (let tx = 0; tx < 4; tx++) {
      const light = (tx + ty) % 2 === 0;
      rect(ctx, offsetX + tx * 8, ty * 8, 8, 8, light ? '#e8e8e8' : '#d0d0d0');
    }
  }
  // Grout lines
  for (let i = 0; i < 4; i++) {
    rect(ctx, offsetX, i * 8, 32, 1, '#bbb');
    rect(ctx, offsetX + i * 8, 0, 1, 32, '#bbb');
  }
  // Subtle dirt/wear
  for (let i = 0; i < 8; i++) {
    const x = Math.floor(rng() * 32);
    const y = Math.floor(rng() * 32);
    px(ctx, offsetX + x, y, '#c8c8c8');
  }
}
```

**Interior wall** — off-white/cream with baseboard:
```ts
function drawInteriorWall(ctx: Ctx, offsetX: number): void {
  const rng = seededRandom(offsetX * 41 + 23);
  // Wall body — cream
  rect(ctx, offsetX, 0, 32, 30, '#e8dcc8');
  // Subtle texture
  for (let i = 0; i < 20; i++) {
    const x = Math.floor(rng() * 32);
    const y = Math.floor(rng() * 28);
    px(ctx, offsetX + x, y, rng() > 0.5 ? '#e0d4c0' : '#f0e4d0');
  }
  // Baseboard (dark strip at bottom)
  rect(ctx, offsetX, 30, 32, 2, '#8a7a6a');
  rect(ctx, offsetX, 29, 32, 1, '#a09080');
}
```

**Door frame** — dark brown outline, open center:
```ts
function drawDoorFrame(ctx: Ctx, offsetX: number): void {
  // Floor showing through (wood-ish)
  rect(ctx, offsetX, 0, 32, 32, '#b8864e');
  // Door frame left
  rect(ctx, offsetX, 0, 4, 32, '#6a4a2a');
  rect(ctx, offsetX + 1, 0, 2, 32, '#7a5a3a');
  // Door frame right
  rect(ctx, offsetX + 28, 0, 4, 32, '#6a4a2a');
  rect(ctx, offsetX + 29, 0, 2, 32, '#7a5a3a');
  // Door frame top
  rect(ctx, offsetX, 0, 32, 4, '#6a4a2a');
  rect(ctx, offsetX, 1, 32, 2, '#7a5a3a');
}
```

- [ ] **Step 2: Add generateInteriorTerrain function**

```ts
export function generateInteriorTerrain(scene: Phaser.Scene): void {
  const canvas = scene.textures.createCanvas('interior-terrain', 192, 32);
  if (!canvas) return;
  const ctx = canvas.context;
  drawWoodFloor(ctx, 0);      // frame 0
  drawCarpet(ctx, 32);        // frame 1
  drawTileFloor(ctx, 64);     // frame 2
  drawInteriorWall(ctx, 96);  // frame 3
  drawDoorFrame(ctx, 128);    // frame 4
  drawCarpetBeige(ctx, 160);  // frame 5
  canvas.refresh();

  const texture = scene.textures.get('interior-terrain');
  texture.add(0, 0, 0, 0, 32, 32);     // Wood
  texture.add(1, 0, 32, 0, 32, 32);    // Carpet (dusty blue)
  texture.add(2, 0, 64, 0, 32, 32);    // TileFloor
  texture.add(3, 0, 96, 0, 32, 32);    // Wall
  texture.add(4, 0, 128, 0, 32, 32);   // DoorFrame
  texture.add(5, 0, 160, 0, 32, 32);   // CarpetBeige (warm beige)
}
```

- [ ] **Step 3: Call generateInteriorTerrain from generateAllTextures**

In `generateAllTextures`, add after `generateTerrain(scene)`:

```ts
generateInteriorTerrain(scene);
```

- [ ] **Step 4: Verify build**

Run: `npx vite build`
Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/game/rendering/PixelArtGenerator.ts
git commit -m "feat: add interior terrain texture generation (wood, carpet, tile, wall, door)"
```

---

### Task 4: Generate interior furniture textures

**Files:**
- Modify: `src/game/rendering/PixelArtGenerator.ts`

Furniture sprites are 32x32 each, stored as individual textures with the `interior-` prefix (same pattern as `deco-*` decorations on the overworld).

- [ ] **Step 1: Add furniture drawing functions**

Add these after the interior terrain functions:

```ts
// ── interior furniture ──────────────────────────────────────────────────

function drawBed(ctx: Ctx): void {
  // Frame (dark wood)
  rect(ctx, 2, 4, 28, 26, '#6a4a2a');
  rect(ctx, 3, 5, 26, 24, '#7a5a3a');
  // Mattress
  rect(ctx, 4, 8, 24, 18, '#f0e8e0');
  // Pillow (top)
  rect(ctx, 6, 6, 20, 5, '#ffffff');
  rect(ctx, 7, 7, 18, 3, '#f8f0e8');
  // Blanket
  rect(ctx, 4, 14, 24, 12, '#6688aa');
  rect(ctx, 5, 15, 22, 10, '#7798bb');
  // Blanket fold line
  rect(ctx, 4, 14, 24, 1, '#5578aa');
  // Blanket pattern
  rect(ctx, 8, 18, 16, 1, '#88aacc');
  rect(ctx, 8, 22, 16, 1, '#88aacc');
}

function drawCouch(ctx: Ctx): void {
  // Base/seat
  rect(ctx, 2, 12, 28, 14, '#8b6f5e');
  rect(ctx, 3, 13, 26, 12, '#9b7f6e');
  // Back rest
  rect(ctx, 2, 4, 28, 10, '#7a5f4e');
  rect(ctx, 3, 5, 26, 8, '#8b6f5e');
  // Armrests
  rect(ctx, 0, 8, 4, 18, '#7a5f4e');
  rect(ctx, 28, 8, 4, 18, '#7a5f4e');
  // Cushion lines
  rect(ctx, 15, 13, 1, 12, '#7a5f4e');
  // Cushion highlights
  rect(ctx, 5, 14, 8, 2, '#a88f7e');
  rect(ctx, 18, 14, 8, 2, '#a88f7e');
}

function drawInteriorTable(ctx: Ctx): void {
  // Table top (top-down view)
  rect(ctx, 4, 6, 24, 20, '#a08050');
  rect(ctx, 5, 7, 22, 18, '#b09060');
  // Edge highlight
  rect(ctx, 5, 7, 22, 1, '#c0a070');
  // Legs (visible corners)
  rect(ctx, 4, 6, 2, 2, '#806030');
  rect(ctx, 26, 6, 2, 2, '#806030');
  rect(ctx, 4, 24, 2, 2, '#806030');
  rect(ctx, 26, 24, 2, 2, '#806030');
}

function drawStove(ctx: Ctx): void {
  // Body
  rect(ctx, 2, 2, 28, 28, '#3a3a3a');
  rect(ctx, 3, 3, 26, 26, '#4a4a4a');
  // 4 burners (circles)
  circle(ctx, 10, 10, 4, '#2a2a2a');
  circle(ctx, 22, 10, 4, '#2a2a2a');
  circle(ctx, 10, 22, 4, '#2a2a2a');
  circle(ctx, 22, 22, 4, '#2a2a2a');
  // Burner grates (cross pattern)
  for (const [bx, by] of [[10,10],[22,10],[10,22],[22,22]]) {
    rect(ctx, bx - 3, by, 6, 1, '#555');
    rect(ctx, bx, by - 3, 1, 6, '#555');
  }
  // Control knobs
  rect(ctx, 6, 28, 3, 2, '#666');
  rect(ctx, 14, 28, 3, 2, '#666');
  rect(ctx, 22, 28, 3, 2, '#666');
}

function drawSink(ctx: Ctx): void {
  // Counter
  rect(ctx, 2, 4, 28, 24, '#c0c0c0');
  rect(ctx, 3, 5, 26, 22, '#d0d0d0');
  // Basin (oval inset)
  rect(ctx, 7, 8, 18, 14, '#a0a0a0');
  rect(ctx, 8, 9, 16, 12, '#b0b0b8');
  // Faucet
  rect(ctx, 14, 4, 4, 6, '#888');
  rect(ctx, 13, 3, 6, 2, '#999');
  // Drain
  px(ctx, 16, 16, '#777');
  px(ctx, 15, 16, '#777');
  // Water highlight
  px(ctx, 12, 12, '#c8d8e8');
  px(ctx, 18, 14, '#c8d8e8');
}

function drawToilet(ctx: Ctx): void {
  // Tank (back)
  rect(ctx, 8, 2, 16, 10, '#f0f0f0');
  rect(ctx, 9, 3, 14, 8, '#e8e8e8');
  // Flush handle
  rect(ctx, 22, 5, 4, 2, '#ccc');
  // Bowl (front)
  rect(ctx, 6, 10, 20, 16, '#f8f8f8');
  rect(ctx, 7, 11, 18, 14, '#f0f0f0');
  // Seat
  rect(ctx, 8, 12, 16, 12, '#e0e0e0');
  rect(ctx, 10, 14, 12, 8, '#e8e8e8');
  // Inner
  rect(ctx, 11, 15, 10, 6, '#d0d8e0');
}

function drawDesk(ctx: Ctx): void {
  // Desk surface
  rect(ctx, 2, 6, 28, 20, '#8a7050');
  rect(ctx, 3, 7, 26, 18, '#9a8060');
  // Edge
  rect(ctx, 3, 7, 26, 1, '#aa9070');
  // Monitor
  rect(ctx, 10, 2, 12, 9, '#333');
  rect(ctx, 11, 3, 10, 7, '#4488cc');
  // Monitor stand
  rect(ctx, 14, 11, 4, 2, '#444');
  // Keyboard
  rect(ctx, 8, 16, 16, 4, '#555');
  rect(ctx, 9, 17, 14, 2, '#666');
  // Legs
  rect(ctx, 2, 24, 2, 4, '#705030');
  rect(ctx, 28, 24, 2, 4, '#705030');
}

function drawBookshelf(ctx: Ctx): void {
  // Frame
  rect(ctx, 2, 2, 28, 28, '#6a4a2a');
  rect(ctx, 3, 3, 26, 26, '#7a5a3a');
  // Shelves (3 horizontal shelves)
  for (let sy = 3; sy < 28; sy += 8) {
    rect(ctx, 3, sy, 26, 1, '#5a3a1a');
  }
  // Books (colored rectangles on each shelf)
  const rng = seededRandom(42);
  const bookColors = ['#cc4444', '#4444cc', '#44aa44', '#ccaa44', '#aa44cc', '#44aaaa', '#cc8844', '#8844cc', '#44cc88'];
  let ci = 0;
  for (let shelf = 0; shelf < 3; shelf++) {
    const sy = 4 + shelf * 8;
    let bx = 4;
    while (bx < 27) {
      const bw = 2 + Math.floor(rng() * 3);
      if (bx + bw > 28) break;
      rect(ctx, bx, sy, bw, 7, bookColors[ci % bookColors.length]);
      // Spine highlight
      rect(ctx, bx, sy, 1, 7, lighten(bookColors[ci % bookColors.length], 0.2));
      bx += bw + 1;
      ci++;
    }
  }
}
```

- [ ] **Step 2: Add generateInteriorFurniture function**

```ts
export function generateInteriorFurniture(scene: Phaser.Scene): void {
  const drawFns: Record<string, (ctx: Ctx) => void> = {
    bed: drawBed,
    couch: drawCouch,
    table: drawInteriorTable,
    stove: drawStove,
    sink: drawSink,
    toilet: drawToilet,
    desk: drawDesk,
    bookshelf: drawBookshelf,
  };

  for (const [name, draw] of Object.entries(drawFns)) {
    const canvas = scene.textures.createCanvas(`interior-${name}`, 32, 32);
    if (!canvas) continue;
    draw(canvas.context);
    canvas.refresh();
  }
}
```

- [ ] **Step 3: Call from generateAllTextures**

Add after `generateInteriorTerrain(scene)`:
```ts
generateInteriorFurniture(scene);
```

- [ ] **Step 4: Verify build**

Run: `npx vite build`
Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/game/rendering/PixelArtGenerator.ts
git commit -m "feat: add interior furniture texture generation (bed, couch, desk, stove, sink, toilet, bookshelf, table)"
```

---

### Task 5: Generate Michael's House building texture

**Files:**
- Modify: `src/game/rendering/PixelArtGenerator.ts`

Add a house building sprite (96x96, same size as restaurant/cinema) to show on the overworld.

- [ ] **Step 1: Add drawMichaelsHouse function**

Add near the existing `drawRestaurant`/`drawCinema` functions:

```ts
function drawMichaelsHouse(ctx: Ctx): void {
  // House body
  rect(ctx, 8, 30, 80, 50, '#d4b896');    // warm beige walls
  rect(ctx, 10, 32, 76, 46, '#e0c8a8');   // lighter inset

  // Roof (triangle-ish)
  rect(ctx, 4, 18, 88, 14, '#8b4513');     // brown roof base
  rect(ctx, 8, 14, 80, 8, '#a0522d');      // roof top
  rect(ctx, 16, 10, 64, 6, '#8b4513');     // roof peak
  // Roof ridge
  rect(ctx, 20, 9, 56, 2, '#703010');
  // Roof tiles pattern
  for (let y = 14; y < 32; y += 4) {
    for (let x = 4 + ((y % 8 === 0) ? 0 : 4); x < 92; x += 8) {
      rect(ctx, x, y, 7, 1, '#7a3a10');
    }
  }

  // Door (center bottom)
  rect(ctx, 38, 56, 20, 24, '#6a4a2a');
  rect(ctx, 40, 58, 16, 20, '#7a5a3a');
  // Door knob
  circle(ctx, 52, 68, 2, '#ccaa44');
  // Door frame
  rect(ctx, 36, 54, 24, 2, '#5a3a1a');

  // Windows (two, flanking door)
  for (const wx of [16, 66]) {
    rect(ctx, wx, 42, 16, 16, '#88bbdd');
    rect(ctx, wx + 1, 43, 14, 14, '#aaddff');
    // Window cross
    rect(ctx, wx + 7, 43, 2, 14, '#e0c8a8');
    rect(ctx, wx + 1, 49, 14, 2, '#e0c8a8');
    // Window sill
    rect(ctx, wx - 1, 58, 18, 2, '#c0a080');
  }

  // Chimney
  rect(ctx, 70, 4, 10, 16, '#8a7a6a');
  rect(ctx, 69, 2, 12, 4, '#9a8a7a');

  // "Michael's" sign (small colored strip above door)
  rect(ctx, 34, 50, 28, 5, '#4a6a8a');
  rect(ctx, 35, 51, 26, 3, '#5a7a9a');

  // Ground shadow
  rect(ctx, 6, 80, 84, 4, 'rgba(0,0,0,0.1)');

  // Doorstep
  rect(ctx, 34, 80, 28, 4, '#aaa');
}
```

- [ ] **Step 2: Register in generateBuildings**

In the `generateBuildings` function, add to the `builders` record:

```ts
'michaels-house': drawMichaelsHouse,
```

- [ ] **Step 3: Verify build**

Run: `npx vite build`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/game/rendering/PixelArtGenerator.ts
git commit -m "feat: add Michael's House building texture for overworld"
```

---

## Chunk 2: Data + Overworld Integration

### Task 6: Create interior layout data

**Files:**
- Create: `src/game/data/interiorLayouts.ts`

This file defines the `InteriorLayout` interface, a `buildWallGrid` helper, and the `MICHAELS_HOUSE_LAYOUT` constant.

- [ ] **Step 1: Create the file with types and wall grid builder**

```ts
// src/game/data/interiorLayouts.ts
import { TILE_SIZE } from '../../utils/constants';

export type FloorType = 'wood' | 'carpet' | 'carpet_beige' | 'tile_floor';

export interface FloorZone {
  tileX: number;
  tileY: number;
  width: number;
  height: number;
  floorType: FloorType;
}

export interface InteriorDecoration {
  tileX: number;
  tileY: number;
  type: string;  // matches texture key, e.g., 'bed', 'couch'
}

export interface ExitZone {
  tileX: number;
  tileY: number;
  width: number;
  height: number;
  promptText: string;
}

export interface InteriorLayout {
  id: string;
  widthInTiles: number;
  heightInTiles: number;
  wallGrid: boolean[][];  // true = wall (impassable), false = walkable
  floors: FloorZone[];
  decorations: InteriorDecoration[];
  entrance: { tileX: number; tileY: number };
  exit: ExitZone;
  cameraZoom?: number;  // override INTERIOR_ZOOM if needed
}

interface RoomRect {
  x: number; y: number; w: number; h: number;
}

interface Doorway {
  x: number; y: number; width: number; height: number;
}

/**
 * Build a wall grid from room rectangles and doorways.
 * Starts with all walls, carves out room interiors, then carves doorways.
 */
function buildWallGrid(
  mapW: number, mapH: number,
  rooms: RoomRect[],
  doorways: Doorway[],
): boolean[][] {
  // Initialize all as wall
  const grid: boolean[][] = Array.from({ length: mapH }, () =>
    Array.from({ length: mapW }, () => true),
  );

  // Carve room interiors (leave 1-tile wall border around each room)
  for (const r of rooms) {
    for (let y = r.y + 1; y < r.y + r.h - 1; y++) {
      for (let x = r.x + 1; x < r.x + r.w - 1; x++) {
        if (y >= 0 && y < mapH && x >= 0 && x < mapW) {
          grid[y][x] = false;
        }
      }
    }
  }

  // Carve doorways
  for (const d of doorways) {
    for (let y = d.y; y < d.y + d.height; y++) {
      for (let x = d.x; x < d.x + d.width; x++) {
        if (y >= 0 && y < mapH && x >= 0 && x < mapW) {
          grid[y][x] = false;
        }
      }
    }
  }

  return grid;
}
```

- [ ] **Step 2: Define Michael's House layout**

The house is 30x24 tiles. Room layout:

```
Row 0-11 (top half):
  Cols 0-10:  Living Room (11 wide x 12 tall)
  Cols 10-20: Kitchen (11 wide x 12 tall)
  Cols 20-29: Bathroom (10 wide x 12 tall)

Row 12-23 (bottom half):
  Cols 0-20:  Bedroom (21 wide x 12 tall)
  Cols 20-29: Michael's Room (10 wide x 12 tall)

Exit: bottom center of Bedroom
```

```ts
const HOUSE_ROOMS: RoomRect[] = [
  { x: 0, y: 0, w: 11, h: 12 },     // Living Room
  { x: 10, y: 0, w: 11, h: 12 },    // Kitchen
  { x: 20, y: 0, w: 10, h: 12 },    // Bathroom
  { x: 0, y: 11, w: 21, h: 13 },    // Bedroom
  { x: 20, y: 11, w: 10, h: 13 },   // Michael's Room
];

const HOUSE_DOORWAYS: Doorway[] = [
  // Living Room ↔ Kitchen (horizontal wall at x=10, row ~6)
  { x: 10, y: 5, width: 1, height: 2 },
  // Kitchen ↔ Bathroom (horizontal wall at x=20, row ~6)
  { x: 20, y: 5, width: 1, height: 2 },
  // Living Room ↔ Bedroom (vertical wall at y=11, col ~5)
  { x: 4, y: 11, width: 2, height: 1 },
  // Kitchen ↔ Bedroom (vertical wall at y=11, col ~15)
  { x: 14, y: 11, width: 2, height: 1 },
  // Bedroom ↔ Michael's Room (vertical wall at x=20, row ~17)
  { x: 20, y: 17, width: 1, height: 2 },
];

export const MICHAELS_HOUSE_LAYOUT: InteriorLayout = {
  id: 'michaels_house',
  widthInTiles: 30,
  heightInTiles: 24,
  wallGrid: buildWallGrid(30, 24, HOUSE_ROOMS, HOUSE_DOORWAYS),
  floors: [
    // Living Room — carpet
    { tileX: 1, tileY: 1, width: 9, height: 10, floorType: 'carpet' },
    // Kitchen — tile floor
    { tileX: 11, tileY: 1, width: 9, height: 10, floorType: 'tile_floor' },
    // Bathroom — tile floor
    { tileX: 21, tileY: 1, width: 8, height: 10, floorType: 'tile_floor' },
    // Bedroom — warm beige carpet
    { tileX: 1, tileY: 12, width: 19, height: 11, floorType: 'carpet_beige' },
    // Michael's Room — wood
    { tileX: 21, tileY: 12, width: 8, height: 11, floorType: 'wood' },
  ],
  decorations: [
    // Living Room
    { tileX: 2, tileY: 2, type: 'couch' },
    { tileX: 2, tileY: 6, type: 'bookshelf' },
    { tileX: 5, tileY: 4, type: 'table' },
    // Kitchen
    { tileX: 12, tileY: 2, type: 'stove' },
    { tileX: 14, tileY: 2, type: 'sink' },
    { tileX: 15, tileY: 5, type: 'table' },
    // Bathroom
    { tileX: 22, tileY: 2, type: 'toilet' },
    { tileX: 25, tileY: 2, type: 'sink' },
    // Bedroom
    { tileX: 3, tileY: 14, type: 'bed' },
    { tileX: 8, tileY: 14, type: 'bookshelf' },
    // Michael's Room
    { tileX: 22, tileY: 14, type: 'desk' },
    { tileX: 25, tileY: 14, type: 'bed' },
    { tileX: 22, tileY: 18, type: 'bookshelf' },
  ],
  entrance: { tileX: 10, tileY: 22 },
  exit: {
    tileX: 9,
    tileY: 22,
    width: 3,
    height: 2,
    promptText: 'Press E to exit house',
  },
};
```

- [ ] **Step 3: Add isWalkable helper for interior layouts**

```ts
/** Create a walkability checker for an interior layout */
export function createInteriorWalkCheck(layout: InteriorLayout) {
  return (tileX: number, tileY: number): boolean => {
    if (tileX < 0 || tileX >= layout.widthInTiles || tileY < 0 || tileY >= layout.heightInTiles) {
      return false;
    }
    if (layout.wallGrid[tileY][tileX]) return false;
    // Check decoration blocking
    for (const deco of layout.decorations) {
      if (deco.tileX === tileX && deco.tileY === tileY) return false;
    }
    return true;
  };
}
```

- [ ] **Step 4: Verify build**

Run: `npx vite build`
Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/game/data/interiorLayouts.ts
git commit -m "feat: add Michael's House interior layout data (30x24, 5 rooms)"
```

---

### Task 7: Add Michael's House to the overworld

**Files:**
- Modify: `src/game/data/mapLayout.ts`
- Modify: `src/game/scenes/WorldScene.ts`

- [ ] **Step 1: Add house building footprint and checkpoint to mapLayout.ts**

Place Michael's House in the top-left area near the market/garden. Position: tileX=14, tileY=3 (above the main east-west path, left-center of the map). The building is 3x3 tiles.

In the `walkGrid` array initializer (line 38-49 of `mapLayout.ts`), add a new impassable block **after the cinema footprint check** (line 45: `if (x >= 30 && x <= 32 && y >= 7 && y <= 9) return false;`) and **before the `return true`** (line 47):

```ts
// Michael's House footprint
if (x >= 14 && x <= 16 && y >= 3 && y <= 5) return false;
```

Add a new entry to the `CHECKPOINT_ZONES` array (after the cinema entry, line 63):

```ts
{ id: 'michaels_house', tileX: 14, tileY: 6, width: 3, height: 1, promptText: "Press E to enter Michael's House" },
```

Note: The building sprite is rendered via the `BUILDINGS` array in WorldScene (Step 2 below), not via `DECORATIONS`.

- [ ] **Step 2: Add house to WorldScene BUILDINGS array**

In `src/game/scenes/WorldScene.ts`, add to the `BUILDINGS` array:

```ts
{ name: 'michaels-house', tileX: 14, tileY: 3, tileW: 3, tileH: 3 },
```

- [ ] **Step 3: Verify build**

Run: `npx vite build`
Expected: Build succeeds. The house should appear on the overworld map.

- [ ] **Step 4: Commit**

```bash
git add src/game/data/mapLayout.ts src/game/scenes/WorldScene.ts
git commit -m "feat: add Michael's House to overworld (building + checkpoint zone)"
```

---

## Chunk 3: Interior Scene System

### Task 8: Create InteriorScene base class

**Files:**
- Create: `src/game/scenes/InteriorScene.ts`

This is the base class for all interior scenes. Handles grid rendering, player+partner spawning, exit zone detection, camera setup, and fade transitions.

- [ ] **Step 1: Create the base class**

```ts
// src/game/scenes/InteriorScene.ts
import Phaser from 'phaser';
import { TILE_SIZE, INTERIOR_ZOOM } from '../../utils/constants';
import { InteriorLayout, createInteriorWalkCheck } from '../data/interiorLayouts';
import { worldToTile, tileToWorld } from '../data/mapLayout';
import { Player } from '../entities/Player';
import { Partner } from '../entities/Partner';
import { InputSystem } from '../systems/InputSystem';
import { loadGameState } from '../systems/SaveSystem';
import { uiManager } from '../../ui/UIManager';
import { InteriorTileType } from '../../utils/constants';

interface InteriorSceneData {
  returnX: number;
  returnY: number;
}

export abstract class InteriorScene extends Phaser.Scene {
  protected player!: Player;
  protected partner!: Partner;
  protected inputSystem!: InputSystem;
  protected layout!: InteriorLayout;

  private returnData!: InteriorSceneData;
  private interactCooldown = 0;
  private backCooldown = 0;
  private activeExitZone = false;

  abstract getLayout(): InteriorLayout;

  init(data: InteriorSceneData): void {
    this.returnData = data;
    this.layout = this.getLayout();
  }

  create(): void {
    const state = loadGameState();
    const layout = this.layout;
    const mapPxW = layout.widthInTiles * TILE_SIZE;
    const mapPxH = layout.heightInTiles * TILE_SIZE;

    // 1. Render tile map
    this.buildInteriorTileMap(layout, mapPxW, mapPxH);

    // 2. Render decorations
    layout.decorations.forEach(deco => {
      const pos = tileToWorld(deco.tileX, deco.tileY);
      this.add.image(pos.x, pos.y, `interior-${deco.type}`).setDepth(5);
    });

    // 3. Player & Partner at entrance
    const spawnPos = tileToWorld(layout.entrance.tileX, layout.entrance.tileY);
    const walkCheck = createInteriorWalkCheck(layout);
    this.player = new Player(this, spawnPos.x, spawnPos.y, state.outfits.player, walkCheck);
    this.partner = new Partner(this, spawnPos.x, spawnPos.y, state.outfits.partner);

    // 4. Input
    this.inputSystem = new InputSystem(this);

    // 5. Camera
    const cam = this.cameras.main;
    cam.setZoom(layout.cameraZoom ?? INTERIOR_ZOOM);
    cam.startFollow(this.player.sprite, true, 0.1, 0.1);
    cam.setBounds(0, 0, mapPxW, mapPxH);

    // 6. Physics bounds
    this.physics.world.setBounds(0, 0, mapPxW, mapPxH);
    this.player.sprite.setCollideWorldBounds(true);

    // 7. Fade in
    cam.setAlpha(0);
    this.tweens.add({
      targets: cam,
      alpha: 1,
      duration: 300,
      ease: 'Linear',
    });
  }

  update(_time: number, delta: number): void {
    if (this.interactCooldown > 0) this.interactCooldown -= delta;
    if (this.backCooldown > 0) this.backCooldown -= delta;

    // Input
    this.inputSystem.update();
    const dir = this.inputSystem.getDirection();

    // Player & Partner
    this.player.update(dir);
    this.partner.update(this.player.getPosition());

    // Exit zone check
    const playerPos = this.player.getPosition();
    const playerTile = worldToTile(playerPos.x, playerPos.y);
    const exit = this.layout.exit;
    const inExitZone =
      playerTile.x >= exit.tileX &&
      playerTile.x < exit.tileX + exit.width &&
      playerTile.y >= exit.tileY &&
      playerTile.y < exit.tileY + exit.height;

    if (inExitZone && !this.activeExitZone) {
      this.activeExitZone = true;
      uiManager.showInteractionPrompt(exit.promptText);
    } else if (!inExitZone && this.activeExitZone) {
      this.activeExitZone = false;
      uiManager.hideInteractionPrompt();
    }

    // Interact
    if (this.inputSystem.isInteractPressed() && this.activeExitZone && this.interactCooldown <= 0) {
      this.interactCooldown = 500;
      this.exitToOverworld();
    }

    // Back/ESC
    if (this.inputSystem.isBackPressed() && this.backCooldown <= 0) {
      this.backCooldown = 500;
      this.exitToOverworld();
    }
  }

  private buildInteriorTileMap(layout: InteriorLayout, mapPxW: number, mapPxH: number): void {
    const rt = this.add.renderTexture(0, 0, mapPxW, mapPxH);
    rt.setOrigin(0, 0);
    rt.setDepth(-50);

    const floorTypeToFrame: Record<string, number> = {
      wood: InteriorTileType.Wood,
      carpet: InteriorTileType.Carpet,
      carpet_beige: InteriorTileType.CarpetBeige,
      tile_floor: InteriorTileType.TileFloor,
    };

    // First pass: draw walls everywhere
    for (let y = 0; y < layout.heightInTiles; y++) {
      for (let x = 0; x < layout.widthInTiles; x++) {
        if (layout.wallGrid[y][x]) {
          rt.drawFrame('interior-terrain', InteriorTileType.Wall, x * TILE_SIZE, y * TILE_SIZE);
        }
      }
    }

    // Second pass: draw floor zones
    for (const fz of layout.floors) {
      const frame = floorTypeToFrame[fz.floorType] ?? InteriorTileType.Wood;
      for (let y = fz.tileY; y < fz.tileY + fz.height; y++) {
        for (let x = fz.tileX; x < fz.tileX + fz.width; x++) {
          rt.drawFrame('interior-terrain', frame, x * TILE_SIZE, y * TILE_SIZE);
        }
      }
    }

    // Third pass: draw door frames at doorway positions (walkable, non-wall, non-floor-zone tiles)
    for (let y = 0; y < layout.heightInTiles; y++) {
      for (let x = 0; x < layout.widthInTiles; x++) {
        if (!layout.wallGrid[y][x]) {
          // Check if this tile is NOT covered by a floor zone
          let inFloorZone = false;
          for (const fz of layout.floors) {
            if (x >= fz.tileX && x < fz.tileX + fz.width && y >= fz.tileY && y < fz.tileY + fz.height) {
              inFloorZone = true;
              break;
            }
          }
          if (!inFloorZone) {
            rt.drawFrame('interior-terrain', InteriorTileType.DoorFrame, x * TILE_SIZE, y * TILE_SIZE);
          }
        }
      }
    }
  }

  protected exitToOverworld(): void {
    uiManager.hideInteractionPrompt();
    const cam = this.cameras.main;
    this.tweens.add({
      targets: cam,
      alpha: 0,
      duration: 300,
      ease: 'Linear',
      onComplete: () => {
        this.scene.start('WorldScene', {
          returnFromInterior: true,
          returnX: this.returnData.returnX,
          returnY: this.returnData.returnY,
        });
      },
    });
  }

  shutdown(): void {
    this.inputSystem?.destroy();
    this.player?.destroy();
    this.partner?.destroy();
    uiManager.hideInteractionPrompt();
  }
}
```

- [ ] **Step 2: Verify build**

Run: `npx vite build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/game/scenes/InteriorScene.ts
git commit -m "feat: add InteriorScene base class for explorable building interiors"
```

---

### Task 9: Create MichaelsHouseScene

**Files:**
- Create: `src/game/scenes/MichaelsHouseScene.ts`

- [ ] **Step 1: Create the scene file**

```ts
// src/game/scenes/MichaelsHouseScene.ts
import { InteriorScene } from './InteriorScene';
import { InteriorLayout, MICHAELS_HOUSE_LAYOUT } from '../data/interiorLayouts';

export class MichaelsHouseScene extends InteriorScene {
  constructor() {
    super({ key: 'MichaelsHouseScene' });
  }

  getLayout(): InteriorLayout {
    return MICHAELS_HOUSE_LAYOUT;
  }
}
```

- [ ] **Step 2: Register in main.ts**

In `src/main.ts`, add the import and scene registration:

```ts
import { MichaelsHouseScene } from './game/scenes/MichaelsHouseScene';

// In the scene array:
scene: [BootScene, DressingRoomScene, WorldScene, MichaelsHouseScene, QuizScene, CatchScene, MatchScene],
```

- [ ] **Step 3: Verify build**

Run: `npx vite build`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/game/scenes/MichaelsHouseScene.ts src/main.ts
git commit -m "feat: add MichaelsHouseScene and register in Phaser config"
```

---

### Task 10: Wire up WorldScene for interior entry/exit

**Files:**
- Modify: `src/game/scenes/WorldScene.ts`

Two changes:
1. `enterCheckpoint` must handle the `'michaels_house'` checkpoint by starting MichaelsHouseScene instead of a mini-game.
2. `create()` must handle `returnFromInterior` data to restore player position after exiting an interior.

- [ ] **Step 1: Handle interior checkpoint in enterCheckpoint**

In `enterCheckpoint()`, add a branch before the mini-game logic:

```ts
private enterCheckpoint(zone: CheckpointZone): void {
  const pos = this.player.getPosition();
  savePlayerPosition(pos.x, pos.y);

  // Interior buildings — check if this zone is a building entry
  const interiorSceneMap: Record<string, string> = {
    michaels_house: 'MichaelsHouseScene',
  };

  if (interiorSceneMap[zone.id]) {
    uiManager.hideHUD();
    uiManager.hideInteractionPrompt();
    const cam = this.cameras.main;
    this.tweens.add({
      targets: cam,
      alpha: 0,
      duration: 300,
      ease: 'Linear',
      onComplete: () => {
        this.scene.start(interiorSceneMap[zone.id], {
          returnX: pos.x,
          returnY: pos.y,
        });
      },
    });
    return;
  }

  // Existing mini-game logic below...
  markCheckpointVisited(zone.id);
  const checkpoint = CHECKPOINTS.find(cp => cp.id === zone.id);
  if (!checkpoint) return;
  uiManager.hideHUD();
  uiManager.hideInteractionPrompt();
  const sceneMap: Record<string, string> = {
    quiz: 'QuizScene',
    catch: 'CatchScene',
    match: 'MatchScene',
  };
  const sceneKey = sceneMap[checkpoint.miniGame.type];
  if (sceneKey) {
    this.scene.start(sceneKey, {
      checkpointId: checkpoint.id,
      config: checkpoint.miniGame.config,
    });
  }
}
```

- [ ] **Step 2: Handle returnFromInterior in create()**

Add two new private fields and an `init()` method to WorldScene:

```ts
private returnFromInteriorData: { returnX: number; returnY: number } | null = null;
private shouldFadeIn = false;

init(data?: { returnFromInterior?: boolean; returnX?: number; returnY?: number }): void {
  if (data?.returnFromInterior && data.returnX != null && data.returnY != null) {
    this.returnFromInteriorData = { returnX: data.returnX, returnY: data.returnY };
    this.shouldFadeIn = true;
  } else {
    this.returnFromInteriorData = null;
    this.shouldFadeIn = false;
  }
}
```

Then in `create()`, after the player+partner spawn (after line 88: `this.partner = new Partner(...)`), override position if returning from interior:

```ts
if (this.returnFromInteriorData) {
  this.player.sprite.setPosition(this.returnFromInteriorData.returnX, this.returnFromInteriorData.returnY);
  this.partner.sprite.setPosition(this.returnFromInteriorData.returnX + 32, this.returnFromInteriorData.returnY);
  this.returnFromInteriorData = null;
}
```

At the end of `create()` (after all other setup), add conditional fade-in:

```ts
if (this.shouldFadeIn) {
  const cam = this.cameras.main;
  cam.setAlpha(0);
  this.tweens.add({
    targets: cam,
    alpha: 1,
    duration: 300,
    ease: 'Linear',
  });
  this.shouldFadeIn = false;
}
```

- [ ] **Step 3: Verify build**

Run: `npx vite build`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/game/scenes/WorldScene.ts
git commit -m "feat: wire WorldScene to handle interior entry/exit with fade transitions"
```

---

### Task 11: Integration verification

- [ ] **Step 1: Run the dev server**

Run: `npx vite dev`
Open browser.

- [ ] **Step 2: Verify overworld**

Expected:
- Michael's House building visible on the map (near tile 14,3)
- Walking up to the house shows "Press E to enter Michael's House"
- All existing locations (Restaurant, Park, Cinema) still work

- [ ] **Step 3: Verify interior entry**

Press E at Michael's House entrance:
- Screen fades to black
- Interior scene loads with 5 rooms visible
- Player spawns at entrance
- Partner spawns near player
- Camera is zoomed in (2.5x)
- Can walk through all 5 rooms via doorways
- Furniture decorations visible in each room
- Walls block movement correctly

- [ ] **Step 4: Verify interior exit**

Walk to exit zone (bottom of bedroom):
- "Press E to exit house" prompt appears
- Press E: screen fades to black, returns to overworld
- Player spawns at the position where they entered the house
- ESC also exits to overworld

- [ ] **Step 5: Fix any issues found during testing**

Address collision, rendering, or transition bugs.

- [ ] **Step 6: Final commit with any fixes**

```bash
git add -A
git commit -m "fix: polish interior system after integration testing"
```
