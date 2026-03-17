# Airbnb Compound Scene Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the jacuzzi corner in Maui overworld with a full Airbnb compound scene (40x32 tiles) containing tennis court, jacuzzi, pool, building backdrop, gardens, and parking area.

**Architecture:** New `AirbnbCompoundScene` extending `OverworldScene`, entered via checkpoint from MauiOverworldScene. Water effects extracted into reusable `WaterEffectSystem` class. Terrain shares extended `maui-terrain` spritesheet with 6 new tile types.

**Tech Stack:** Phaser 3, TypeScript, procedural Canvas 2D textures

---

### Task 1: Extract WaterEffectSystem from MauiOverworldScene

This is a prerequisite — water effects (wave overlay, bubble/foam particles, speed reduction) live as private methods in MauiOverworldScene. Extract into a composable class that both scenes can use.

**IMPORTANT:** The `WaterEffectSystem` handles water-tile-specific effects ONLY (overlay, bubbles, speed). The MauiOverworldScene has a separate `BEACH_TILE_Y`-based swimsuit swap (Y >= 14 triggers swimsuit even on sand tiles). That beach swimsuit logic must stay in MauiOverworldScene — it's a zone mechanic, not a water-tile mechanic. The `WaterEffectSystem` does NOT handle swimsuit swaps.

**Files:**
- Create: `src/game/systems/WaterEffectSystem.ts`
- Modify: `src/game/scenes/maui/MauiOverworldScene.ts`

- [ ] **Step 1: Create WaterEffectSystem class**

Create `src/game/systems/WaterEffectSystem.ts`:

```typescript
// src/game/systems/WaterEffectSystem.ts
import Phaser from 'phaser';
import { TILE_SIZE } from '../../utils/constants';

const BUBBLE_KEY = '__water_bubble';
const FOAM_KEY = '__water_foam';

interface WaterFX {
  overlay: Phaser.GameObjects.Graphics;
  bubbleEmitter: Phaser.GameObjects.Particles.ParticleEmitter;
  foamEmitter: Phaser.GameObjects.Particles.ParticleEmitter;
  depth: number; // 0=dry, 1=wading, 2=swimming
}

interface WaterEffectConfig {
  /** Returns the tile type at given tile coords */
  getTileType: (tileX: number, tileY: number) => number;
  /** The tile type value that represents water */
  waterTileValue: number;
  /** Speed multiplier when wading (default 0.8) */
  wadingSpeed?: number;
  /** Optional: speed multiplier for deep/swimming */
  swimmingSpeed?: number;
  /** Optional: returns true if tile Y counts as "deep" water */
  isDeepWater?: (tileY: number) => boolean;
}

export class WaterEffectSystem {
  private scene: Phaser.Scene;
  private config: Required<Pick<WaterEffectConfig, 'getTileType' | 'waterTileValue'>> & WaterEffectConfig;
  private playerFX!: WaterFX;
  private partnerFX!: WaterFX;
  private playerInWater = false;
  private partnerInWater = false;
  private wadingSpeed: number;
  private swimmingSpeed: number;

  constructor(scene: Phaser.Scene, config: WaterEffectConfig) {
    this.scene = scene;
    this.config = config;
    this.wadingSpeed = config.wadingSpeed ?? 0.8;
    this.swimmingSpeed = config.swimmingSpeed ?? 0.55;
  }

  create(): void {
    this.createWaterTextures();
    this.playerFX = this.createWaterFX();
    this.partnerFX = this.createWaterFX();
  }

  /**
   * Call from scene.update(). Handles speed reduction and visual water effects (overlay, bubbles).
   * Does NOT handle swimsuit swap — that's a zone mechanic handled by the scene.
   */
  update(
    player: { sprite: Phaser.GameObjects.Sprite; speedMultiplier: number },
    partner: { sprite: Phaser.GameObjects.Sprite; speedMultiplier: number },
  ): void {
    const ptx = Math.floor(player.sprite.x / TILE_SIZE);
    const pty = Math.floor(player.sprite.y / TILE_SIZE);
    this.updateWaterEffect(player.sprite, ptx, pty, this.playerFX, (m) => { player.speedMultiplier = m; });

    const patx = Math.floor(partner.sprite.x / TILE_SIZE);
    const paty = Math.floor(partner.sprite.y / TILE_SIZE);
    this.updateWaterEffect(partner.sprite, patx, paty, this.partnerFX, (m) => { partner.speedMultiplier = m; });
  }

  shutdown(
    player: { speedMultiplier: number },
    partner: { speedMultiplier: number },
  ): void {
    player.speedMultiplier = 1.0;
    partner.speedMultiplier = 1.0;
  }

  // --- Private methods (moved from MauiOverworldScene) ---

  private createWaterTextures(): void {
    if (!this.scene.textures.exists(BUBBLE_KEY)) {
      const c = this.scene.textures.createCanvas(BUBBLE_KEY, 6, 6)!;
      const ctx = c.getContext();
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.beginPath();
      ctx.arc(3, 3, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,1)';
      ctx.beginPath();
      ctx.arc(2, 2, 1, 0, Math.PI * 2);
      ctx.fill();
      c.refresh();
    }

    if (!this.scene.textures.exists(FOAM_KEY)) {
      const c = this.scene.textures.createCanvas(FOAM_KEY, 8, 4)!;
      const ctx = c.getContext();
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.beginPath();
      ctx.ellipse(4, 2, 4, 2, 0, 0, Math.PI * 2);
      ctx.fill();
      c.refresh();
    }
  }

  private createWaterFX(): WaterFX {
    const overlay = this.scene.add.graphics().setDepth(11).setVisible(false);

    const bubbleEmitter = this.scene.add.particles(0, 0, BUBBLE_KEY, {
      speed: { min: 8, max: 20 },
      angle: { min: 240, max: 300 },
      lifespan: { min: 600, max: 1200 },
      frequency: 300,
      alpha: { start: 0.7, end: 0 },
      scale: { start: 1, end: 0.3 },
      emitting: false,
    });
    bubbleEmitter.setDepth(12);

    const foamEmitter = this.scene.add.particles(0, 0, FOAM_KEY, {
      speed: { min: 5, max: 15 },
      angle: { min: 0, max: 360 },
      lifespan: { min: 400, max: 800 },
      frequency: 500,
      alpha: { start: 0.6, end: 0 },
      scale: { start: 0.8, end: 0.2 },
      emitting: false,
    });
    foamEmitter.setDepth(12);

    return { overlay, bubbleEmitter, foamEmitter, depth: 0 };
  }

  private updateWaterEffect(
    sprite: Phaser.GameObjects.Sprite,
    tileX: number,
    tileY: number,
    fx: WaterFX,
    setSpeed: (m: number) => void,
  ): void {
    const tileType = this.config.getTileType(tileX, tileY);
    if (tileType !== this.config.waterTileValue) {
      fx.overlay.setVisible(false);
      fx.bubbleEmitter.emitting = false;
      fx.foamEmitter.emitting = false;
      if (fx.depth !== 0) setSpeed(1.0);
      fx.depth = 0;
      return;
    }

    const isDeep = this.config.isDeepWater?.(tileY) ?? false;
    const depth = isDeep ? 2 : 1;
    setSpeed(depth === 2 ? this.swimmingSpeed : this.wadingSpeed);
    fx.overlay.setVisible(true);
    fx.depth = depth;

    const gfx = fx.overlay;
    gfx.clear();

    const cx = sprite.x;
    const cy = sprite.y;
    const halfW = 26;
    const t = this.scene.time.now;

    let waterTop: number;
    let waterBottom: number;

    if (depth === 2) {
      const bob = Math.sin(t / 400) * 2;
      waterTop = cy - 2 + bob;
      waterBottom = cy + 28;
    } else {
      waterTop = cy + 10;
      waterBottom = cy + 28;
    }

    const wave1 = Math.sin(t / 300) * 2;
    const wave2 = Math.sin(t / 250 + 1.5) * 1.5;
    const wave3 = Math.sin(t / 350 + 3) * 2;

    gfx.fillStyle(0x1a8ccc, 0.4);
    gfx.beginPath();
    gfx.moveTo(cx - halfW, waterTop + wave1);
    gfx.lineTo(cx - halfW * 0.5, waterTop + wave2 - 1);
    gfx.lineTo(cx, waterTop + wave3);
    gfx.lineTo(cx + halfW * 0.5, waterTop + wave2 + 1);
    gfx.lineTo(cx + halfW, waterTop + wave1 - 0.5);
    gfx.lineTo(cx + halfW, waterBottom);
    gfx.lineTo(cx - halfW, waterBottom);
    gfx.closePath();
    gfx.fillPath();

    gfx.fillStyle(0xffffff, 0.25);
    gfx.beginPath();
    gfx.moveTo(cx - halfW, waterTop + wave1);
    gfx.lineTo(cx - halfW * 0.5, waterTop + wave2 - 1);
    gfx.lineTo(cx, waterTop + wave3);
    gfx.lineTo(cx + halfW * 0.5, waterTop + wave2 + 1);
    gfx.lineTo(cx + halfW, waterTop + wave1 - 0.5);
    gfx.lineTo(cx + halfW, waterTop + wave1 + 3);
    gfx.lineTo(cx + halfW * 0.5, waterTop + wave2 + 4);
    gfx.lineTo(cx, waterTop + wave3 + 3);
    gfx.lineTo(cx - halfW * 0.5, waterTop + wave2 + 2);
    gfx.lineTo(cx - halfW, waterTop + wave1 + 3);
    gfx.closePath();
    gfx.fillPath();

    const emitY = waterTop + 2;
    fx.bubbleEmitter.setPosition(cx, emitY);
    fx.foamEmitter.setPosition(cx, emitY);

    fx.bubbleEmitter.emitting = true;
    fx.foamEmitter.emitting = true;

    if (depth === 2) {
      fx.bubbleEmitter.frequency = 200;
      fx.foamEmitter.frequency = 350;
    } else {
      fx.bubbleEmitter.frequency = 500;
      fx.foamEmitter.frequency = 700;
    }
  }
}
```

- [ ] **Step 2: Refactor MauiOverworldScene to use WaterEffectSystem**

In `src/game/scenes/maui/MauiOverworldScene.ts`:

1. Remove: `BUBBLE_KEY`, `FOAM_KEY` constants (lines 15-16), `WaterFX` interface (lines 18-23), `playerWater`/`partnerWater` fields (lines 28-29), methods `createWaterTextures()` (lines 169-196), `createWaterFX()` (lines 198-224), `updateWaterEffect()` (lines 226-323). **KEEP** `BEACH_TILE_Y`, `playerOnBeach`, `partnerOnBeach` — the beach swimsuit swap stays.

2. Add import and field:
```typescript
import { WaterEffectSystem } from '../../systems/WaterEffectSystem';
// ...
private waterSystem!: WaterEffectSystem;
```

3. In `onCreateExtras()`, replace lines 72-74:
```typescript
// Old:
this.createWaterTextures();
this.playerWater = this.createWaterFX();
this.partnerWater = this.createWaterFX();

// New:
this.waterSystem = new WaterEffectSystem(this, {
  getTileType: getMauiTileType,
  waterTileValue: MauiTileType.ShallowWater,
  wadingSpeed: 0.8,
  swimmingSpeed: 0.55,
  isDeepWater: (tileY) => tileY >= 25,
});
this.waterSystem.create();
```

4. Replace `update()` method (lines 137-167) — KEEP the beach swimsuit swap logic, replace only the water overlay calls:
```typescript
update(time: number, delta: number): void {
  super.update(time, delta);

  // Beach swimsuit detection (zone-based, NOT water-tile-based)
  const playerTileY = Math.floor(this.player.sprite.y / TILE_SIZE);
  if (playerTileY >= BEACH_TILE_Y && !this.playerOnBeach) {
    this.playerOnBeach = true;
    this.player.setTemporaryTexture('player-swimsuit', this);
  } else if (playerTileY < BEACH_TILE_Y && this.playerOnBeach) {
    this.playerOnBeach = false;
    this.player.restoreTexture(this);
  }

  const partnerTileY = Math.floor(this.partner.sprite.y / TILE_SIZE);
  if (partnerTileY >= BEACH_TILE_Y && !this.partnerOnBeach) {
    this.partnerOnBeach = true;
    this.partner.setTemporaryTexture('partner-swimsuit', this);
  } else if (partnerTileY < BEACH_TILE_Y && this.partnerOnBeach) {
    this.partnerOnBeach = false;
    this.partner.restoreTexture(this);
  }

  // Water overlay effects (speed, bubbles, waves — handled by system)
  this.waterSystem.update(this.player, this.partner);
}
```

5. Replace `shutdown()` method (lines 356-369) — KEEP swimsuit restore:
```typescript
shutdown(): void {
  if (this.playerOnBeach) {
    this.player.restoreTexture(this);
    this.playerOnBeach = false;
  }
  if (this.partnerOnBeach) {
    this.partner.restoreTexture(this);
    this.partnerOnBeach = false;
  }
  this.waterSystem.shutdown(this.player, this.partner);
  super.shutdown();
}
```

- [ ] **Step 3: Build and verify**

Run: `npm run build`
Expected: No errors. MauiOverworldScene water behavior unchanged.

- [ ] **Step 4: Commit**

```bash
git add src/game/systems/WaterEffectSystem.ts src/game/scenes/maui/MauiOverworldScene.ts
git commit -m "refactor: extract WaterEffectSystem from MauiOverworldScene"
```

---

### Task 2: Extend Maui terrain spritesheet with 6 new tile types

Add StonePath, WoodDeck, TennisCourt, Asphalt, HedgeWall, PoolEdge to the `maui-terrain` spritesheet and `MauiTileType` enum.

**Files:**
- Modify: `src/game/scenes/maui/mauiMap.ts` (enum only)
- Modify: `src/game/rendering/MauiTextures.ts` (spritesheet generation)

- [ ] **Step 1: Add new enum values to MauiTileType**

In `src/game/scenes/maui/mauiMap.ts`, extend the enum (lines 7-17):

```typescript
export const enum MauiTileType {
  Sand = 0,
  SandStone = 1,
  Stone = 2,
  ShallowWater = 3,
  Ocean = 4,
  Grass = 5,
  Road = 6,
  ParkingLot = 7,
  Sidewalk = 8,
  // Airbnb compound additions
  StonePath = 9,
  WoodDeck = 10,
  TennisCourt = 11,
  Asphalt = 12,
  HedgeWall = 13,
  PoolEdge = 14,
}
```

- [ ] **Step 2: Widen terrain spritesheet and draw 6 new tile frames**

In `src/game/rendering/MauiTextures.ts`, in `generateMauiTerrain()`:

1. Change canvas width from 288 to 480 (line 114):
```typescript
const c = scene.textures.createCanvas('maui-terrain', 480, 32);
```

2. After the Sidewalk block (after line 282), add 6 new tile drawings:

```typescript
  // Index 9 — StonePath (light gray cobblestone)
  {
    const ox = 288;
    const rng = seededRandom(1000);
    rect(ctx, ox, 0, 32, 32, '#C8C8C8');
    // Cobblestone pattern
    for (let gy = 0; gy < 4; gy++) {
      for (let gx = 0; gx < 4; gx++) {
        const sx = ox + gx * 8 + (gy % 2 === 0 ? 0 : 4);
        const sy = gy * 8;
        rect(ctx, sx, sy, 7, 7, rng() > 0.5 ? '#BEBEBE' : '#D2D2D2');
        rect(ctx, sx, sy, 7, 1, lighten('#D2D2D2', 0.1));
      }
    }
    for (let i = 0; i < 15; i++) {
      const x = Math.floor(rng() * 32);
      const y = Math.floor(rng() * 32);
      px(ctx, ox + x, y, rng() > 0.5 ? '#B0B0B0' : '#DADADA');
    }
  }

  // Index 10 — WoodDeck (brown horizontal planks)
  {
    const ox = 320;
    const rng = seededRandom(1100);
    rect(ctx, ox, 0, 32, 32, '#A0724A');
    // Horizontal plank lines
    for (let y = 0; y < 32; y += 8) {
      rect(ctx, ox, y, 32, 1, darken('#A0724A', 0.15));
      rect(ctx, ox, y + 7, 32, 1, darken('#A0724A', 0.1));
    }
    // Wood grain
    for (let i = 0; i < 20; i++) {
      const x = Math.floor(rng() * 32);
      const y = Math.floor(rng() * 32);
      px(ctx, ox + x, y, rng() > 0.5 ? '#8B6340' : '#B8845A');
    }
  }

  // Index 11 — TennisCourt (green with white line accents)
  {
    const ox = 352;
    rect(ctx, ox, 0, 32, 32, '#3E8E41');
    // Subtle surface texture
    for (let y = 0; y < 32; y += 2) {
      for (let x = 0; x < 32; x += 4) {
        px(ctx, ox + x + (y % 4 === 0 ? 0 : 2), y, '#368438');
      }
    }
    // White court lines at edges
    rect(ctx, ox, 0, 32, 1, '#FFFFFF');
    rect(ctx, ox, 31, 32, 1, '#FFFFFF');
    rect(ctx, ox, 0, 1, 32, '#FFFFFF');
    rect(ctx, ox + 31, 0, 1, 32, '#FFFFFF');
  }

  // Index 12 — Asphalt (dark gray parking)
  {
    const ox = 384;
    const rng = seededRandom(1200);
    rect(ctx, ox, 0, 32, 32, '#555555');
    for (let i = 0; i < 35; i++) {
      const x = Math.floor(rng() * 32);
      const y = Math.floor(rng() * 32);
      px(ctx, ox + x, y, rng() > 0.5 ? '#4a4a4a' : '#606060');
    }
  }

  // Index 13 — HedgeWall (dense green hedge)
  {
    const ox = 416;
    const rng = seededRandom(1300);
    rect(ctx, ox, 0, 32, 32, '#2D6B2A');
    for (let i = 0; i < 40; i++) {
      const x = Math.floor(rng() * 32);
      const y = Math.floor(rng() * 32);
      const r = Math.floor(rng() * 3) + 2;
      circle(ctx, ox + x, y, r, rng() > 0.5 ? '#1F5C1C' : '#3A8537');
    }
    // Dark base shadow
    rect(ctx, ox, 28, 32, 4, darken('#2D6B2A', 0.25));
  }

  // Index 14 — PoolEdge (blue-tinted stone border)
  {
    const ox = 448;
    const rng = seededRandom(1400);
    rect(ctx, ox, 0, 32, 32, '#8FAAB5');
    for (let gy = 0; gy < 4; gy++) {
      for (let gx = 0; gx < 4; gx++) {
        const sx = ox + gx * 8;
        const sy = gy * 8;
        rect(ctx, sx, sy, 7, 7, rng() > 0.5 ? '#84A0AC' : '#9AB4BF');
      }
    }
    for (let i = 0; i < 10; i++) {
      const x = Math.floor(rng() * 32);
      const y = Math.floor(rng() * 32);
      px(ctx, ox + x, y, '#7A96A2');
    }
  }
```

3. After the existing `texture.add` calls (line 296), add:
```typescript
  texture.add(9, 0, 288, 0, 32, 32);   // StonePath
  texture.add(10, 0, 320, 0, 32, 32);  // WoodDeck
  texture.add(11, 0, 352, 0, 32, 32);  // TennisCourt
  texture.add(12, 0, 384, 0, 32, 32);  // Asphalt
  texture.add(13, 0, 416, 0, 32, 32);  // HedgeWall
  texture.add(14, 0, 448, 0, 32, 32);  // PoolEdge
```

- [ ] **Step 3: Build and verify**

Run: `npm run build`
Expected: No errors. Existing Maui scene unchanged (new tiles not used yet).

- [ ] **Step 4: Commit**

```bash
git add src/game/scenes/maui/mauiMap.ts src/game/rendering/MauiTextures.ts
git commit -m "feat: add 6 new tile types to Maui terrain spritesheet"
```

---

### Task 3: Create Airbnb compound map data

Define the 40x32 tile grid, walkability, NPCs, checkpoint zones, and decoration data.

**Files:**
- Create: `src/game/scenes/maui/airbnbCompoundMap.ts`

- [ ] **Step 1: Create the map data file**

Create `src/game/scenes/maui/airbnbCompoundMap.ts` with the tile grid, walk check, NPCs, checkpoints, and decoration arrays. The map uses `MauiTileType` values from `mauiMap.ts`.

```typescript
// src/game/scenes/maui/airbnbCompoundMap.ts
import { NPCDef, CheckpointZone, tileToWorld } from '../../data/mapLayout';
import { MauiTileType } from './mauiMap';

export const COMPOUND_WIDTH = 40;
export const COMPOUND_HEIGHT = 32;

/** Helper: returns tile type for given position */
export function getCompoundTileType(x: number, y: number): number {
  if (x < 0 || x >= COMPOUND_WIDTH || y < 0 || y >= COMPOUND_HEIGHT) return -1;
  return compoundTileGrid[y][x];
}

/** 40×32 tile grid — row-major: compoundTileGrid[y][x] */
export const compoundTileGrid: number[][] = Array.from({ length: COMPOUND_HEIGHT }, (_, y) => {
  return Array.from({ length: COMPOUND_WIDTH }, (_, x) => {
    // Row 0: Hedge border
    if (y === 0) return MauiTileType.HedgeWall;
    // Left/right borders: hedge
    if (x === 0 || x === 39) return MauiTileType.HedgeWall;

    // Airbnb building (14,1)-(25,8) — use StonePath as building base
    if (x >= 14 && x <= 25 && y >= 1 && y <= 8) return MauiTileType.StonePath;

    // Central stone path spine (18-21, y=9..30)
    if (x >= 18 && x <= 21 && y >= 9 && y <= 30) return MauiTileType.StonePath;

    // Jacuzzi area — stone border (3-9, 11-17)
    if (x >= 3 && x <= 9 && y >= 11 && y <= 17) {
      // Inner hot water (4-8, 13-16)
      if (x >= 4 && x <= 8 && y >= 13 && y <= 16) return MauiTileType.ShallowWater;
      // Stone border around it
      return MauiTileType.StonePath;
    }

    // Pool area — pool edge border + water
    if (x >= 24 && x <= 31 && y >= 12 && y <= 18) {
      // Inner pool water (25-30, 13-18)
      if (x >= 25 && x <= 30 && y >= 13 && y <= 18) return MauiTileType.ShallowWater;
      // PoolEdge border
      return MauiTileType.PoolEdge;
    }
    // Pool deck extension (24-33, 19-20)
    if (x >= 24 && x <= 33 && y >= 19 && y <= 20) return MauiTileType.WoodDeck;

    // Tennis court surface (3-16, 23-28) — non-walkable
    if (x >= 3 && x <= 16 && y >= 23 && y <= 28) return MauiTileType.TennisCourt;

    // Tennis area walkable border (2-17, 22 and 29)
    if (x >= 2 && x <= 17 && (y === 22 || y === 29)) return MauiTileType.StonePath;
    if ((x === 2 || x === 17) && y >= 22 && y <= 29) return MauiTileType.StonePath;

    // Parking area (rows 30-31)
    if (y >= 30) return MauiTileType.Asphalt;

    // Lounge area east (26-38, 22-29) — grass with stone path accents
    if (x >= 26 && x <= 38 && y >= 22 && y <= 29) return MauiTileType.Grass;

    // Default: grass
    return MauiTileType.Grass;
  });
});

/** Check if a compound tile is walkable */
export function isCompoundWalkable(tileX: number, tileY: number): boolean {
  if (tileX < 0 || tileX >= COMPOUND_WIDTH || tileY < 0 || tileY >= COMPOUND_HEIGHT) return false;
  const tile = compoundTileGrid[tileY][tileX];
  // Non-walkable tiles
  if (tile === MauiTileType.HedgeWall) return false;
  if (tile === MauiTileType.TennisCourt) return false;
  // Building footprint
  if (tileX >= 14 && tileX <= 25 && tileY >= 1 && tileY <= 8) return false;
  return true;
}

export const COMPOUND_DECORATIONS = [
  // Palm trees
  { type: 'palm-tree', tileX: 2, tileY: 2 },
  { type: 'palm-tree', tileX: 6, tileY: 1 },
  { type: 'palm-tree', tileX: 12, tileY: 2 },
  { type: 'palm-tree', tileX: 28, tileY: 2 },
  { type: 'palm-tree', tileX: 34, tileY: 3 },
  { type: 'palm-tree', tileX: 28, tileY: 23 },
  { type: 'palm-tree', tileX: 33, tileY: 25 },
  // Lounge chairs
  { type: 'compound-lounge-chair', tileX: 3, tileY: 4 },
  { type: 'compound-lounge-chair', tileX: 5, tileY: 4 },
  { type: 'compound-lounge-chair', tileX: 7, tileY: 18 },
  { type: 'compound-lounge-chair', tileX: 26, tileY: 19 },
  { type: 'compound-lounge-chair', tileX: 28, tileY: 19 },
  // Patio tables
  { type: 'compound-patio-table', tileX: 30, tileY: 24 },
  { type: 'compound-patio-table', tileX: 34, tileY: 26 },
  // Tiki torches
  { type: 'compound-tiki-torch', tileX: 27, tileY: 25 },
  { type: 'compound-tiki-torch', tileX: 36, tileY: 22 },
  // Flower beds
  { type: 'compound-flower-bed', tileX: 30, tileY: 3 },
  { type: 'compound-flower-bed', tileX: 34, tileY: 5 },
  { type: 'compound-flower-bed', tileX: 36, tileY: 27 },
  // Tennis benches
  { type: 'compound-tennis-bench', tileX: 3, tileY: 29 },
  { type: 'compound-tennis-bench', tileX: 10, tileY: 29 },
  // Diving board
  { type: 'compound-diving-board', tileX: 24, tileY: 15 },
  // Compound sign
  { type: 'compound-sign', tileX: 19, tileY: 9 },
  // Parked cars in parking
  { type: 'maui-parkedcar', tileX: 4, tileY: 31 },
  { type: 'maui-parkedcar', tileX: 10, tileY: 31 },
  { type: 'maui-parkedcar', tileX: 28, tileY: 31 },
  { type: 'maui-parkedcar', tileX: 35, tileY: 31 },
];

export const COMPOUND_BUILDINGS = [
  { name: 'airbnb-building', tileX: 14, tileY: 1, tileW: 12, tileH: 8 },
];

export const COMPOUND_NPCS: NPCDef[] = [
  {
    id: 'airbnb-host', tileX: 19, tileY: 9, behavior: 'idle',
    texture: 'npc-maui-greeter', interactable: true, onInteract: 'dialog',
    interactionData: { lines: [
      'Welcome to Maui Breeze! Make yourself at home.',
      "The pool's great this time of year!",
      "Don't forget to try the hot tub — you've earned it.",
    ]},
    facingDirection: 'down',
  },
  {
    id: 'pool-attendant', tileX: 32, tileY: 14, behavior: 'idle',
    texture: 'npc-lifeguard', interactable: true, onInteract: 'dialog',
    interactionData: { lines: [
      'The pool is perfect for a dive!',
      'Careful on the deck, it can be slippery!',
    ]},
    facingDirection: 'left',
  },
  {
    id: 'tennis-player-npc', tileX: 9, tileY: 21, behavior: 'idle',
    texture: 'npc-maui-tourist', interactable: true, onInteract: 'dialog',
    interactionData: { lines: [
      'Wanna hit some balls? Step onto the court!',
      'I play every morning before the heat kicks in.',
    ]},
    facingDirection: 'down',
  },
  {
    id: 'jacuzzi-relaxer', tileX: 5, tileY: 12, behavior: 'sit',
    texture: 'npc-maui-tourist', interactable: true, onInteract: 'dialog',
    interactionData: { lines: [
      'Ahhhh... the warm jets massage your tired muscles.',
      'So relaxing...',
      'You feel completely refreshed!',
    ]},
    facingDirection: 'down',
  },
];

export const COMPOUND_CHECKPOINT_ZONES: CheckpointZone[] = [
  {
    id: 'compound_exit',
    centerX: tileToWorld(19, 31).x,
    centerY: tileToWorld(19, 31).y,
    radius: 48,
    promptText: 'Leave compound',
  },
  {
    id: 'compound_tennis',
    centerX: tileToWorld(9, 22).x,
    centerY: tileToWorld(9, 22).y,
    radius: 64,
    promptText: 'Play Tennis?',
  },
  {
    id: 'compound_pool_dive',
    centerX: tileToWorld(27, 13).x,
    centerY: tileToWorld(27, 13).y,
    radius: 48,
    promptText: 'Dive in!',
  },
];
```

- [ ] **Step 2: Build and verify**

Run: `npm run build`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/game/scenes/maui/airbnbCompoundMap.ts
git commit -m "feat: add Airbnb compound map data (40x32 tile grid)"
```

---

### Task 4: Create Airbnb compound textures

Generate procedural pixel art for the building, lounge chairs, patio tables, tiki torches, flower beds, tennis benches, diving board, and compound sign.

**Files:**
- Create: `src/game/rendering/AirbnbCompoundTextures.ts`
- Modify: `src/game/rendering/PixelArtGenerator.ts` (register in `generateAllTextures`)

- [ ] **Step 1: Create the texture generation file**

Create `src/game/rendering/AirbnbCompoundTextures.ts`. Use the same `px`, `rect`, `circle`, `darken`, `lighten` helpers pattern from MauiTextures.ts (copy the helpers or import them — check if they're exported; if not, define local copies).

```typescript
// src/game/rendering/AirbnbCompoundTextures.ts
import Phaser from 'phaser';

// Helper functions (same as MauiTextures.ts)
function px(ctx: CanvasRenderingContext2D, x: number, y: number, color: string): void {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, 1, 1);
}

function rect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string): void {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

function circle(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
}

function darken(hex: string, amount = 0.2): string {
  const n = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, Math.floor(((n >> 16) & 0xff) * (1 - amount)));
  const g = Math.max(0, Math.floor(((n >> 8) & 0xff) * (1 - amount)));
  const b = Math.max(0, Math.floor((n & 0xff) * (1 - amount)));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

function lighten(hex: string, amount = 0.2): string {
  const n = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, Math.floor(((n >> 16) & 0xff) * (1 + amount)));
  const g = Math.min(255, Math.floor(((n >> 8) & 0xff) * (1 + amount)));
  const b = Math.min(255, Math.floor((n & 0xff) * (1 + amount)));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

function generateAirbnbBuilding(scene: Phaser.Scene): void {
  // 384×256 (12×8 tiles) — two-story tropical building
  const c = scene.textures.createCanvas('building-airbnb-building', 384, 256);
  if (!c) return;
  const ctx = c.context;

  // Main walls — cream/off-white
  rect(ctx, 0, 40, 384, 216, '#FFF8DC');

  // Roof — terracotta
  rect(ctx, 0, 0, 384, 44, '#B74C2C');
  rect(ctx, 0, 40, 384, 6, darken('#B74C2C', 0.15));
  // Roof overhang shadow
  rect(ctx, 0, 46, 384, 4, 'rgba(0,0,0,0.1)');

  // Foundation
  rect(ctx, 0, 240, 384, 16, '#8B8378');

  // Windows — 2 rows of 5
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 5; col++) {
      const wx = 30 + col * 72;
      const wy = 60 + row * 80;
      // Window frame
      rect(ctx, wx - 2, wy - 2, 40, 48, '#6B4E35');
      // Glass
      rect(ctx, wx, wy, 36, 44, '#87CEEB');
      // Cross bars
      rect(ctx, wx + 17, wy, 2, 44, '#6B4E35');
      rect(ctx, wx, wy + 21, 36, 2, '#6B4E35');
      // Highlight
      rect(ctx, wx + 2, wy + 2, 14, 8, lighten('#87CEEB', 0.2));
    }
  }

  // Front door
  const doorX = 172;
  const doorY = 180;
  rect(ctx, doorX, doorY, 40, 60, '#5C3A1E');
  rect(ctx, doorX + 2, doorY + 2, 36, 56, '#6B4E35');
  // Door knob
  circle(ctx, doorX + 34, doorY + 32, 3, '#FFD700');
  // Door step
  rect(ctx, doorX - 8, 240, 56, 6, '#A0A0A0');

  // Balcony (second floor)
  rect(ctx, 100, 115, 184, 4, '#8B7355');
  // Balcony railing
  for (let i = 0; i < 12; i++) {
    rect(ctx, 108 + i * 15, 100, 2, 15, '#8B7355');
  }
  rect(ctx, 100, 100, 184, 2, '#8B7355');

  // Sign area above door
  rect(ctx, 145, 158, 94, 18, '#F5F5DC');
  rect(ctx, 146, 159, 92, 16, '#FFF8E7');
  // "MAUI BREEZE" text (pixel art)
  const textColor = '#5C3A1E';
  // M
  rect(ctx, 152, 162, 1, 10, textColor); rect(ctx, 153, 163, 1, 1, textColor);
  rect(ctx, 154, 164, 1, 1, textColor); rect(ctx, 155, 163, 1, 1, textColor);
  rect(ctx, 156, 162, 1, 10, textColor);
  // A
  rect(ctx, 159, 164, 1, 8, textColor); rect(ctx, 163, 164, 1, 8, textColor);
  rect(ctx, 160, 163, 3, 1, textColor); rect(ctx, 160, 167, 3, 1, textColor);
  rect(ctx, 159, 162, 5, 1, textColor);
  // U
  rect(ctx, 166, 162, 1, 9, textColor); rect(ctx, 170, 162, 1, 9, textColor);
  rect(ctx, 167, 171, 3, 1, textColor);
  // I
  rect(ctx, 173, 162, 1, 10, textColor);

  c.refresh();
}

function generateCompoundDecorations(scene: Phaser.Scene): void {
  // Lounge chair — 32×32
  {
    const c = scene.textures.createCanvas('deco-compound-lounge-chair', 32, 32);
    if (!c) return;
    const ctx = c.context;
    // Frame
    rect(ctx, 4, 14, 24, 3, '#8B6914');
    rect(ctx, 4, 17, 2, 12, '#8B6914');
    rect(ctx, 26, 17, 2, 12, '#8B6914');
    // Backrest (angled)
    rect(ctx, 4, 8, 10, 6, '#8B6914');
    // Cushion
    rect(ctx, 5, 9, 8, 4, '#FF6B6B');
    rect(ctx, 6, 15, 20, 2, '#FF6B6B');
    c.refresh();
  }

  // Patio table — 64×64 (round table with umbrella)
  {
    const c = scene.textures.createCanvas('deco-compound-patio-table', 64, 64);
    if (!c) return;
    const ctx = c.context;
    // Table shadow
    circle(ctx, 32, 48, 14, 'rgba(0,0,0,0.15)');
    // Table top (oval)
    circle(ctx, 32, 44, 12, '#8B6914');
    circle(ctx, 32, 44, 10, '#A0824A');
    // Table leg
    rect(ctx, 30, 44, 4, 14, '#6B4E35');
    // Umbrella pole
    rect(ctx, 31, 4, 2, 40, '#666');
    // Umbrella canopy
    circle(ctx, 32, 10, 18, '#E74C3C');
    circle(ctx, 32, 10, 16, '#C0392B');
    // Highlight
    rect(ctx, 26, 6, 12, 3, lighten('#E74C3C', 0.15));
    // Chairs (2 small rectangles on sides)
    rect(ctx, 10, 42, 8, 8, '#8B6914');
    rect(ctx, 46, 42, 8, 8, '#8B6914');
    c.refresh();
  }

  // Tiki torch — 32×64
  {
    const c = scene.textures.createCanvas('deco-compound-tiki-torch', 32, 64);
    if (!c) return;
    const ctx = c.context;
    // Pole
    rect(ctx, 14, 16, 4, 46, '#A0724A');
    rect(ctx, 13, 16, 1, 46, darken('#A0724A', 0.15));
    // Torch top
    rect(ctx, 12, 14, 8, 6, darken('#A0724A', 0.1));
    // Flame
    circle(ctx, 16, 10, 5, '#FF8C00');
    circle(ctx, 16, 8, 4, '#FFD700');
    circle(ctx, 16, 6, 2, '#FFFACD');
    // Base
    rect(ctx, 12, 60, 8, 4, '#6B4E35');
    c.refresh();
  }

  // Flower bed — 64×32
  {
    const c = scene.textures.createCanvas('deco-compound-flower-bed', 64, 32);
    if (!c) return;
    const ctx = c.context;
    // Soil/mulch base
    rect(ctx, 2, 18, 60, 12, '#5C3A1E');
    rect(ctx, 4, 20, 56, 8, '#6B4A2E');
    // Flowers — colorful circles
    const colors = ['#FF6B6B', '#FFD93D', '#6BCB77', '#4D96FF', '#FF78F0'];
    for (let i = 0; i < 8; i++) {
      const fx = 6 + i * 7 + (i % 2 === 0 ? 0 : 3);
      const fy = 14 + (i % 2 === 0 ? 0 : -4);
      // Stem
      rect(ctx, fx + 1, fy + 4, 1, 8, '#2D6B2A');
      // Petals
      circle(ctx, fx + 1, fy + 2, 3, colors[i % colors.length]);
      // Center
      circle(ctx, fx + 1, fy + 2, 1, '#FFD700');
    }
    // Border stones
    rect(ctx, 0, 26, 64, 4, '#8A8A8A');
    c.refresh();
  }

  // Tennis bench — 64×32
  {
    const c = scene.textures.createCanvas('deco-compound-tennis-bench', 64, 32);
    if (!c) return;
    const ctx = c.context;
    // Bench legs
    rect(ctx, 8, 18, 4, 12, '#6B4E35');
    rect(ctx, 52, 18, 4, 12, '#6B4E35');
    // Seat
    rect(ctx, 4, 16, 56, 4, '#A0724A');
    rect(ctx, 4, 15, 56, 1, lighten('#A0724A', 0.15));
    // Back rest
    rect(ctx, 4, 8, 56, 3, '#A0724A');
    rect(ctx, 8, 11, 4, 5, '#6B4E35');
    rect(ctx, 52, 11, 4, 5, '#6B4E35');
    c.refresh();
  }

  // Diving board — 32×64
  {
    const c = scene.textures.createCanvas('deco-compound-diving-board', 32, 64);
    if (!c) return;
    const ctx = c.context;
    // Base/support
    rect(ctx, 10, 40, 12, 20, '#8A8A8A');
    rect(ctx, 8, 38, 16, 4, '#8A8A8A');
    // Board
    rect(ctx, 8, 32, 18, 4, '#E8E8E8');
    rect(ctx, 8, 30, 18, 2, lighten('#E8E8E8', 0.1));
    // Grip lines
    rect(ctx, 10, 33, 14, 1, '#CCC');
    // Board extends over water (top section)
    rect(ctx, 4, 14, 16, 4, '#E8E8E8');
    rect(ctx, 8, 18, 4, 14, '#B0B0B0');
    c.refresh();
  }

  // Compound sign — 32×32
  {
    const c = scene.textures.createCanvas('deco-compound-sign', 32, 32);
    if (!c) return;
    const ctx = c.context;
    // Post
    rect(ctx, 14, 12, 4, 18, '#6B4E35');
    // Sign board
    rect(ctx, 2, 2, 28, 14, '#F5F5DC');
    rect(ctx, 3, 3, 26, 12, '#FFF8E7');
    // Border
    rect(ctx, 2, 2, 28, 1, '#8B6914');
    rect(ctx, 2, 15, 28, 1, '#8B6914');
    rect(ctx, 2, 2, 1, 14, '#8B6914');
    rect(ctx, 29, 2, 1, 14, '#8B6914');
    // Simple "AB" text
    rect(ctx, 8, 5, 1, 7, '#5C3A1E');
    rect(ctx, 12, 5, 1, 7, '#5C3A1E');
    rect(ctx, 9, 5, 3, 1, '#5C3A1E');
    rect(ctx, 9, 8, 3, 1, '#5C3A1E');
    rect(ctx, 17, 5, 1, 7, '#5C3A1E');
    rect(ctx, 21, 5, 1, 6, '#5C3A1E');
    rect(ctx, 18, 5, 3, 1, '#5C3A1E');
    rect(ctx, 18, 8, 3, 1, '#5C3A1E');
    rect(ctx, 18, 11, 3, 1, '#5C3A1E');
    c.refresh();
  }
}

// Gate decoration for Maui overworld entry point — 64×64
function generateCompoundGate(scene: Phaser.Scene): void {
  const c = scene.textures.createCanvas('deco-compound-gate', 64, 64);
  if (!c) return;
  const ctx = c.context;
  // Stone pillars
  rect(ctx, 4, 8, 12, 52, '#8A8A8A');
  rect(ctx, 48, 8, 12, 52, '#8A8A8A');
  // Pillar caps
  rect(ctx, 2, 4, 16, 6, '#9A9A9A');
  rect(ctx, 46, 4, 16, 6, '#9A9A9A');
  // Arch/sign board
  rect(ctx, 4, 4, 56, 10, '#A0724A');
  rect(ctx, 6, 6, 52, 6, '#B8845A');
  // Text hint lines
  rect(ctx, 14, 8, 36, 2, '#FFF8DC');
  // Path underneath
  rect(ctx, 16, 52, 32, 12, '#C8C8C8');
  c.refresh();
}

export function generateAirbnbCompoundTextures(scene: Phaser.Scene): void {
  generateAirbnbBuilding(scene);
  generateCompoundDecorations(scene);
  generateCompoundGate(scene);
}
```

- [ ] **Step 2: Register in PixelArtGenerator**

In `src/game/rendering/PixelArtGenerator.ts`:

1. Add import at top:
```typescript
import { generateAirbnbCompoundTextures } from './AirbnbCompoundTextures';
```

2. In `generateAllTextures()` (line 2861), add after `generateMauiTextures(scene);`:
```typescript
  generateAirbnbCompoundTextures(scene);
```

- [ ] **Step 3: Build and verify**

Run: `npm run build`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/game/rendering/AirbnbCompoundTextures.ts src/game/rendering/PixelArtGenerator.ts
git commit -m "feat: add Airbnb compound procedural textures"
```

---

### Task 5: Create AirbnbCompoundScene

The main scene class extending OverworldScene, with water effects and all checkpoint handlers.

**Files:**
- Create: `src/game/scenes/maui/AirbnbCompoundScene.ts`

- [ ] **Step 1: Create the scene file**

```typescript
// src/game/scenes/maui/AirbnbCompoundScene.ts
import { OverworldScene, OverworldConfig } from '../OverworldScene';
import { TILE_SIZE } from '../../../utils/constants';
import { tileToWorld, CheckpointZone } from '../../data/mapLayout';
import { saveCurrentScene } from '../../systems/SaveSystem';
import { uiManager } from '../../../ui/UIManager';
import { WaterEffectSystem } from '../../systems/WaterEffectSystem';
import { MauiTileType } from './mauiMap';
import {
  COMPOUND_WIDTH, COMPOUND_HEIGHT, compoundTileGrid, isCompoundWalkable,
  getCompoundTileType, COMPOUND_NPCS, COMPOUND_CHECKPOINT_ZONES,
  COMPOUND_DECORATIONS, COMPOUND_BUILDINGS,
} from './airbnbCompoundMap';

// Return position data for scene transitions
interface CompoundReturnData {
  returnX?: number;
  returnY?: number;
}

export class AirbnbCompoundScene extends OverworldScene {
  private waterSystem!: WaterEffectSystem;
  private returnPos: CompoundReturnData = {};
  private playerInWater = false;
  private partnerInWater = false;

  constructor() {
    super({ key: 'AirbnbCompoundScene' });
  }

  init(data?: any): void {
    super.init(data);
    // If returning from a minigame with position data
    if (data?.returnX != null && data?.returnY != null && !data?.returnFromInterior) {
      this.returnPos = { returnX: data.returnX, returnY: data.returnY };
    } else {
      this.returnPos = {};
    }
  }

  getConfig(): OverworldConfig {
    // Spawn position priority:
    // 1. OverworldScene.init() handles returnFromInterior (exit checkpoint uses this)
    // 2. returnPos from minigame return (e.g., tennis → compound)
    // 3. Default: parking area tile (19, 30)
    const spawnPos = this.returnPos.returnX
      ? { x: this.returnPos.returnX, y: this.returnPos.returnY! }
      : tileToWorld(19, 30);

    return {
      mapWidth: COMPOUND_WIDTH,
      mapHeight: COMPOUND_HEIGHT,
      tileGrid: compoundTileGrid,
      walkCheck: isCompoundWalkable,
      npcs: COMPOUND_NPCS,
      checkpointZones: COMPOUND_CHECKPOINT_ZONES,
      spawnX: spawnPos.x,
      spawnY: spawnPos.y,
      terrainTextureKey: 'maui-terrain',
    };
  }

  getLabelMap(): Record<string, string> {
    return {
      compound_exit: 'Exit',
      compound_tennis: 'Tennis',
      compound_pool_dive: 'Pool',
    };
  }

  create(): void {
    super.create();
    saveCurrentScene('AirbnbCompoundScene');
  }

  onCreateExtras(): void {
    // Decorations
    COMPOUND_DECORATIONS.forEach(deco => {
      const pos = tileToWorld(deco.tileX, deco.tileY);
      this.add.image(pos.x, pos.y, `deco-${deco.type}`)
        .setDepth(-10);
    });

    // Buildings
    COMPOUND_BUILDINGS.forEach(b => {
      const cx = b.tileX * TILE_SIZE + (b.tileW * TILE_SIZE) / 2;
      const cy = b.tileY * TILE_SIZE + (b.tileH * TILE_SIZE) / 2;
      this.add.image(cx, cy, `building-${b.name}`)
        .setDepth(-5);
    });

    // Water effect system for pool and jacuzzi
    this.waterSystem = new WaterEffectSystem(this, {
      getTileType: getCompoundTileType,
      waterTileValue: MauiTileType.ShallowWater,
      wadingSpeed: 0.8,
    });
    this.waterSystem.create();
  }

  update(time: number, delta: number): void {
    super.update(time, delta);

    // Swimsuit swap when stepping on water tiles (pool/jacuzzi)
    const ptx = Math.floor(this.player.sprite.x / TILE_SIZE);
    const pty = Math.floor(this.player.sprite.y / TILE_SIZE);
    const playerOnWater = getCompoundTileType(ptx, pty) === MauiTileType.ShallowWater;
    if (playerOnWater && !this.playerInWater) {
      this.playerInWater = true;
      this.player.setTemporaryTexture('player-swimsuit', this);
    } else if (!playerOnWater && this.playerInWater) {
      this.playerInWater = false;
      this.player.restoreTexture(this);
    }

    const patx = Math.floor(this.partner.sprite.x / TILE_SIZE);
    const paty = Math.floor(this.partner.sprite.y / TILE_SIZE);
    const partnerOnWater = getCompoundTileType(patx, paty) === MauiTileType.ShallowWater;
    if (partnerOnWater && !this.partnerInWater) {
      this.partnerInWater = true;
      this.partner.setTemporaryTexture('partner-swimsuit', this);
    } else if (!partnerOnWater && this.partnerInWater) {
      this.partnerInWater = false;
      this.partner.restoreTexture(this);
    }

    // Water overlay effects
    this.waterSystem.update(this.player, this.partner);
  }

  onEnterCheckpoint(zone: CheckpointZone): void {
    const pos = this.player.getPosition();

    if (zone.id === 'compound_exit') {
      this.fadeToScene('MauiOverworldScene', {
        returnFromInterior: true,
        returnX: tileToWorld(37, 5).x,
        returnY: tileToWorld(37, 5).y,
      });
    } else if (zone.id === 'compound_tennis') {
      uiManager.hideHUD();
      uiManager.hideInteractionPrompt();
      this.scene.start('TennisScene', {
        returnScene: 'AirbnbCompoundScene',
        returnX: pos.x,
        returnY: pos.y,
      });
    } else if (zone.id === 'compound_pool_dive') {
      uiManager.showNPCDialog(
        ['The diving board bounces invitingly...', 'Pool dive minigame coming soon!'],
        () => { uiManager.hideNPCDialog(); },
      );
    }
  }

  shutdown(): void {
    if (this.playerInWater) {
      this.player.restoreTexture(this);
      this.playerInWater = false;
    }
    if (this.partnerInWater) {
      this.partner.restoreTexture(this);
      this.partnerInWater = false;
    }
    this.waterSystem.shutdown(this.player, this.partner);
    super.shutdown();
  }

  protected onBack(): void {
    // No-op
  }
}
```

- [ ] **Step 2: Build and verify**

Run: `npm run build`
Expected: No errors (scene not registered yet, but file should compile).

- [ ] **Step 3: Commit**

```bash
git add src/game/scenes/maui/AirbnbCompoundScene.ts
git commit -m "feat: add AirbnbCompoundScene extending OverworldScene"
```

---

### Task 6: Register scene and update Maui overworld

Register the new scene in main.ts, add compound entry checkpoint to Maui, remove old jacuzzi/tennis entries from Maui.

**Files:**
- Modify: `src/main.ts`
- Modify: `src/game/scenes/maui/mauiMap.ts`
- Modify: `src/game/scenes/maui/MauiOverworldScene.ts`

- [ ] **Step 1: Register AirbnbCompoundScene in main.ts**

In `src/main.ts`:

1. Add import:
```typescript
import { AirbnbCompoundScene } from './game/scenes/maui/AirbnbCompoundScene';
```

2. Add to scene array (line 47), after `MauiHotelScene`:
```typescript
scene: [BootScene, DressingRoomScene, WorldScene, MichaelsHouseScene, HadarsHouseScene, AirportInteriorScene, AirplaneCutscene, MauiOverworldScene, MauiHotelScene, AirbnbCompoundScene, QuizScene, CatchScene, MatchScene, TennisScene, ChaseBabyScene],
```

- [ ] **Step 2: Update mauiMap.ts — add compound entry checkpoint, remove old tennis checkpoint**

In `src/game/scenes/maui/mauiMap.ts`:

1. In `MAUI_DECORATIONS` (line 88), remove the jacuzzi decoration line:
```typescript
  // Remove: { type: 'maui-jacuzzi', tileX: 34, tileY: 3 },
  // Remove: { type: 'maui-tenniscourt', tileX: 38, tileY: 6 },
```
Add compound gate decoration instead:
```typescript
  { type: 'compound-gate', tileX: 36, tileY: 4 },
```

2. In `MAUI_NPCS` (line 136), remove `jacuzzi-npc` (lines 150-154) and `airbnb-neighbor` (lines 156-160) — they move to the compound scene.

3. In `MAUI_CHECKPOINT_ZONES` (line 189), remove the `maui_tennis` checkpoint (lines 197-203) and add `maui_airbnb`:
```typescript
  {
    id: 'maui_airbnb',
    centerX: tileToWorld(37, 5).x,
    centerY: tileToWorld(37, 5).y,
    radius: 48,
    promptText: 'Enter Airbnb compound',
  },
```

4. In `mauiWalkGrid`, remove the jacuzzi blocking (line 62):
```typescript
  // Remove: if (x >= 34 && x <= 35 && y >= 3 && y <= 4) return false;
```

- [ ] **Step 3: Update MauiOverworldScene — add compound checkpoint handler, remove tennis handler**

In `src/game/scenes/maui/MauiOverworldScene.ts`:

1. In `getLabelMap()`, replace `maui_tennis: 'Tennis'` with `maui_airbnb: 'Airbnb Compound'`.

2. In `onEnterCheckpoint()`, remove the `maui_tennis` case (lines 329-332) and add:
```typescript
    } else if (zone.id === 'maui_airbnb') {
      this.fadeToScene('AirbnbCompoundScene', { returnX: pos.x, returnY: pos.y });
    }
```

- [ ] **Step 4: Build and verify**

Run: `npm run build`
Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add src/main.ts src/game/scenes/maui/mauiMap.ts src/game/scenes/maui/MauiOverworldScene.ts
git commit -m "feat: wire up Airbnb compound scene entry from Maui overworld"
```

---

### Task 7: Update TennisScene to pass return position data

TennisScene currently reads `returnScene` but does NOT read or pass back `returnX`/`returnY`. Without this fix, returning from tennis spawns the player at the parking lot instead of near the tennis court.

**Files:**
- Modify: `src/game/scenes/minigames/TennisScene.ts`

- [ ] **Step 1: Update TennisScene to store and return position data**

In `src/game/scenes/minigames/TennisScene.ts`:

1. Add fields:
```typescript
private returnX?: number;
private returnY?: number;
```

2. In `init()`, read return position:
```typescript
init(data: { returnScene?: string; returnX?: number; returnY?: number }): void {
  this.returnScene = data.returnScene ?? 'MauiOverworldScene';
  this.returnX = data.returnX;
  this.returnY = data.returnY;
  // ... rest of init
}
```

3. In `endGame()`, pass return data back to the caller scene:
```typescript
this.scene.start(this.returnScene, {
  returnX: this.returnX,
  returnY: this.returnY,
});
```

- [ ] **Step 2: Build and verify**

Run: `npm run build`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/game/scenes/minigames/TennisScene.ts
git commit -m "fix: pass return position data from TennisScene back to caller"
```

---

### Task 8: Final build and play-test verification

**Files:** None (verification only)

- [ ] **Step 1: Full build**

Run: `npm run build`
Expected: No errors, no warnings except chunk size.

- [ ] **Step 2: Dev server verification checklist**

Run: `npm run dev` and test:

1. Navigate to Maui overworld — old jacuzzi area replaced with gate decoration
2. Walk to gate → "Enter Airbnb compound" prompt appears
3. Enter compound → spawns in parking area (bottom of map)
4. Walk around compound — all areas accessible, hedges block edges
5. Walk into pool → swimsuit swap, speed reduction, wave overlay with bubbles
6. Walk into jacuzzi → swimsuit swap, NPC dialog triggers on approach
7. Walk to tennis court → "Play Tennis?" prompt, launches tennis minigame
8. After tennis → returns to compound near tennis court (not parking)
9. Walk to south edge → "Leave compound" exits back to Maui overworld at gate position
10. Maui water effects still work (beach, ocean)
11. All NPCs have dialog that triggers

- [ ] **Step 3: Commit design doc**

```bash
git add docs/plans/2026-03-17-airbnb-compound-design.md
git commit -m "docs: add Airbnb compound scene design document"
```
