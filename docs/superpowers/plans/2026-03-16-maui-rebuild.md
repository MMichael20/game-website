# Maui Map Rebuild Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the Maui overworld map (45x30) based on the user's vacation experience, with hotel interior, driving cars, tennis mini-game, and new NPCs/buildings.

**Architecture:** Full rewrite of mauiMap.ts (tile grid, walkability, buildings, decorations, NPCs, checkpoints). Major additions to MauiTextures.ts (3 new terrain tiles, 2 buildings, 3 decorations, 4 NPCs, 3 cars). New MauiHotelScene (interior) and TennisScene (mini-game). Driving cars are standalone tweened sprites in MauiOverworldScene, NOT NPCs.

**Tech Stack:** Phaser 3, TypeScript, Canvas 2D procedural textures

**Design doc:** `docs/plans/2026-03-16-maui-rebuild-design.md`

---

## File Structure

| File | Responsibility | Action |
|---|---|---|
| `src/game/scenes/maui/mauiMap.ts` | Map data: tile grid, walk grid, buildings, decorations, NPCs, checkpoints | Full rewrite |
| `src/game/rendering/MauiTextures.ts` | All Maui procedural textures | Major modify (add terrain, buildings, decos, NPCs, cars) |
| `src/game/scenes/maui/MauiOverworldScene.ts` | Overworld scene with driving cars and checkpoint routing | Modify |
| `src/game/scenes/maui/MauiHotelScene.ts` | Hotel room interior scene | New file |
| `src/game/scenes/minigames/TennisScene.ts` | Tennis rally mini-game | New file |
| `src/main.ts` | Scene registration | Modify (add MauiHotelScene, TennisScene) |

---

## Chunk 1: Map Data & Terrain Textures

### Task 1: Rewrite mauiMap.ts — tile grid, walkability, buildings, decorations, NPCs, checkpoints

**Files:**
- Rewrite: `src/game/scenes/maui/mauiMap.ts`

- [ ] **Step 1: Rewrite the entire mauiMap.ts file**

Replace the entire file with the new 45x30 map data. Key changes:
- `MAUI_WIDTH = 45`, `MAUI_HEIGHT = 30`
- Add 3 new tile types to MauiTileType enum: `Road = 6`, `ParkingLot = 7`, `Sidewalk = 8`
- New tile grid generator with zones: grass (y=0-9), sidewalk (y=10), road (y=11-13), sand (y=14-19), shallow water (y=20-24), ocean (y=25-29), with parking lot in top-right (x>=35, y<=5)
- New walk grid: borders impassable, ocean impassable, building footprints impassable (hotel at x[22-29] y[4-8], restaurant at x[10-14] y[15-17])
- New buildings array: `maui-hotel` (22,4,8,5) and `maui-restaurant` (10,15,5,3)
- New decorations array (from design doc): jacuzzi, tennis court, parked cars, palm trees, beach items
- New NPCs array (from design doc): restaurant-owner, hotel-greeter, jacuzzi-npc, airbnb-neighbor, beach-surfer, walker, beachgoers
- New checkpoint zones array with **pixel coordinates**: hotel entrance and tennis court

The tile grid generator should follow this zone logic:

```typescript
// Zone rules (evaluated top-to-bottom, first match wins):
// Parking lot:  x >= 35 && y <= 5 → ParkingLot
// Sidewalk:     y === 10 → Sidewalk
// Road:         y >= 11 && y <= 13 → Road
// Ocean:        y >= 25 → Ocean
// Shallow water: y >= 21 → ShallowWater (with right-side gradient: x > 30 → SandStone for y < 24)
// Sand:         y >= 14 → Sand
// Stone paths:  specific horizontal/vertical paths in town zone → Stone
// SandStone:    areas around buildings → SandStone
// Default:      Grass
```

The walk grid should block:
- Map borders (x=0, x=44, y=0, y=29)
- Ocean (y >= 25)
- Hotel footprint: x[22-29], y[4-8]
- Restaurant footprint: x[10-14], y[15-17]
- Jacuzzi decoration: x[34-35], y[3-4]
- Tennis court is walkable (checkpoint triggers mini-game)
- Parked car decorations on sidewalk (x=5, x=15, x=35 at y=10)

Checkpoint zones use `tileToWorld()` for pixel coordinates:
```typescript
import { NPCDef, CheckpointZone, tileToWorld } from '../../data/mapLayout';

export const MAUI_CHECKPOINT_ZONES: CheckpointZone[] = [
  {
    id: 'maui_hotel',
    centerX: tileToWorld(26, 9).x,
    centerY: tileToWorld(26, 9).y,
    radius: 48,
    promptText: 'Tap to enter Hotel',
  },
  {
    id: 'maui_tennis',
    centerX: tileToWorld(40, 8).x,
    centerY: tileToWorld(40, 8).y,
    radius: 64,
    promptText: 'Tap to play Tennis',
  },
];
```

NPCs from design doc (all use the new trigger zone dwell system automatically):
- `restaurant-owner` at (12,14), dialog, facing down
- `hotel-greeter` at (25,10), dialog, facing down
- `jacuzzi-npc` at (34,5), dialog, facing up
- `airbnb-neighbor` at (37,5), dialog, facing left
- `beach-surfer` at (7,17), dialog, facing down
- `maui-walker-1` at (16,5), walk path x[12-20]
- `beachgoer-1` at (3,17), sit
- `beachgoer-2` at (14,18), sit

- [ ] **Step 2: Verify build compiles**

Run: `npx tsc --noEmit`
Expected: Should compile (may warn about missing textures at runtime, that's fine)

- [ ] **Step 3: Commit**

```bash
git add src/game/scenes/maui/mauiMap.ts
git commit -m "feat: rewrite Maui map data for 45x30 vacation layout"
```

---

### Task 2: Add new terrain tiles to MauiTextures.ts

**Files:**
- Modify: `src/game/rendering/MauiTextures.ts`

- [ ] **Step 1: Expand terrain spritesheet from 192x32 to 288x32 and add 3 new tiles**

In the `generateMauiTerrain()` function:
- Change canvas width from `192` to `288` (line 114)
- Add after the Grass tile (index 5):

```typescript
  // Index 6 — Road (dark gray asphalt with yellow center dashes)
  {
    const ox = 192;
    const rng = seededRandom(700);
    rect(ctx, ox, 0, 32, 32, '#444444');
    // Asphalt texture scatter
    for (let i = 0; i < 40; i++) {
      const x = Math.floor(rng() * 32);
      const y = Math.floor(rng() * 32);
      px(ctx, ox + x, y, rng() > 0.5 ? '#3a3a3a' : '#4e4e4e');
    }
    // Yellow center dashes
    for (let x = 2; x < 32; x += 8) {
      rect(ctx, ox + x, 15, 5, 2, '#FFD700');
    }
  }

  // Index 7 — ParkingLot (lighter gray with white parking lines)
  {
    const ox = 224;
    const rng = seededRandom(800);
    rect(ctx, ox, 0, 32, 32, '#666666');
    for (let i = 0; i < 30; i++) {
      const x = Math.floor(rng() * 32);
      const y = Math.floor(rng() * 32);
      px(ctx, ox + x, y, rng() > 0.5 ? '#5a5a5a' : '#707070');
    }
    // White parking line on right edge
    rect(ctx, ox + 30, 0, 2, 32, '#CCCCCC');
  }

  // Index 8 — Sidewalk (light concrete)
  {
    const ox = 256;
    const rng = seededRandom(900);
    rect(ctx, ox, 0, 32, 32, '#BBBBBB');
    for (let i = 0; i < 25; i++) {
      const x = Math.floor(rng() * 32);
      const y = Math.floor(rng() * 32);
      px(ctx, ox + x, y, rng() > 0.5 ? '#AAAAAA' : '#CCCCCC');
    }
    // Subtle crack
    for (let y = 10; y < 22; y++) {
      px(ctx, ox + 16 + (y % 3 === 0 ? 1 : 0), y, '#999999');
    }
  }
```

- [ ] **Step 2: Verify build compiles**

Run: `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add src/game/rendering/MauiTextures.ts
git commit -m "feat: add Road, ParkingLot, Sidewalk terrain tiles to Maui"
```

---

### Task 3: Add new building textures (hotel, restaurant)

**Files:**
- Modify: `src/game/rendering/MauiTextures.ts`

- [ ] **Step 1: Replace the `generateMauiBuildings()` function**

Replace the existing building generation with new buildings. Remove the old maui-shop, maui-house, maui-airport textures and add:

**`building-maui-hotel`** (256x160, 8x5 tiles): Multi-story beige building with windows, "HOTEL" text, entrance door at bottom center.

**`building-maui-restaurant`** (160x96, 5x3 tiles): Warm terracotta building with "RESTAURANT" sign, doorway.

Follow the existing pattern from `generateMauiBuildings()` — use `scene.textures.createCanvas()`, draw with `rect()`, `px()`, and `c.refresh()`.

- [ ] **Step 2: Commit**

```bash
git add src/game/rendering/MauiTextures.ts
git commit -m "feat: add hotel and restaurant building textures"
```

---

### Task 4: Add new decoration textures (jacuzzi, tennis court, parked car)

**Files:**
- Modify: `src/game/rendering/MauiTextures.ts`

- [ ] **Step 1: Add new decoration textures to `generateMauiDecorations()`**

Add these new textures to the existing function (keep existing palm-tree, beach-umbrella, etc.):

**`deco-maui-jacuzzi`** (64x64, 2x2 tiles): Blue circular hot tub with wooden rim, bubble dots.

**`deco-maui-tenniscourt`** (128x128, 4x4 tiles): Green surface with white boundary lines and center net line.

**`deco-maui-parkedcar`** (32x32, 1x1 tile): Top-down car shape — colored rectangle with windshield detail.

- [ ] **Step 2: Commit**

```bash
git add src/game/rendering/MauiTextures.ts
git commit -m "feat: add jacuzzi, tennis court, parked car decoration textures"
```

---

### Task 5: Add new NPC and car textures

**Files:**
- Modify: `src/game/rendering/MauiTextures.ts`

- [ ] **Step 1: Add new NPC textures to `generateMauiNPCs()`**

Add these new 48x48 NPC textures using the existing `drawNPCBase()` helper:

**`npc-maui-restaurant`**: Dark-haired person with white apron over dark top.
**`npc-maui-greeter`**: Person in colorful aloha shirt (red/orange with flower pattern).
**`npc-maui-tourist`**: Casual vacation outfit — hat, sunglasses, light shirt.
**`npc-maui-frontdesk`**: Hotel uniform — dark blue top, name badge detail.

- [ ] **Step 2: Add driving car textures**

Add a new function `generateMauiCars(scene)` and call it from `generateMauiTextures()`.

Create 3 car sprites (48x32 each — wider than tall, top-down view):
- `car-red`: Red body, gray windshield
- `car-blue`: Blue body, gray windshield
- `car-white`: White body, gray windshield

Each car: `scene.textures.createCanvas('car-red', 48, 32)`, draw a rounded rectangle body with windshield.

- [ ] **Step 3: Update `generateMauiTextures()` to call `generateMauiCars()`**

- [ ] **Step 4: Commit**

```bash
git add src/game/rendering/MauiTextures.ts
git commit -m "feat: add new Maui NPC and driving car textures"
```

---

## Chunk 2: Scene Updates & Hotel Interior

### Task 6: Update MauiOverworldScene — driving cars, checkpoint routing, spawn point

**Files:**
- Modify: `src/game/scenes/maui/MauiOverworldScene.ts`

- [ ] **Step 1: Update getConfig() with new spawn point**

Change spawn from (24,10) to (38,2) — Airbnb parking lot:

```typescript
spawnX: 38 * TILE_SIZE + TILE_SIZE / 2,
spawnY: 2 * TILE_SIZE + TILE_SIZE / 2,
```

- [ ] **Step 2: Add driving car sprites in onCreateExtras()**

After the existing decorations/buildings rendering, add 3 animated car sprites:

```typescript
// Driving cars (visual-only, not NPCs)
const mapPxWidth = MAUI_WIDTH * TILE_SIZE;
const carDefs = [
  { key: 'car-red',   y: 12, direction: 1,  delay: 0 },     // east
  { key: 'car-blue',  y: 11, direction: -1, delay: 3000 },   // west
  { key: 'car-white', y: 13, direction: 1,  delay: 6000 },   // east
];

carDefs.forEach(def => {
  const worldY = def.y * TILE_SIZE + TILE_SIZE / 2;
  const startX = def.direction > 0 ? -48 : mapPxWidth + 48;
  const endX = def.direction > 0 ? mapPxWidth + 48 : -48;
  const car = this.add.sprite(startX, worldY, def.key).setDepth(-3);
  if (def.direction < 0) car.setFlipX(true);

  this.time.delayedCall(def.delay, () => {
    this.tweens.add({
      targets: car,
      x: endX,
      duration: 10000,
      ease: 'Linear',
      repeat: -1,
      onRepeat: () => { car.x = startX; },
    });
  });
});
```

- [ ] **Step 3: Implement onEnterCheckpoint()**

Replace the empty handler:

```typescript
onEnterCheckpoint(zone: CheckpointZone): void {
  const pos = this.player.getPosition();
  if (zone.id === 'maui_hotel') {
    this.fadeToScene('MauiHotelScene', { returnX: pos.x, returnY: pos.y });
  } else if (zone.id === 'maui_tennis') {
    uiManager.hideHUD();
    uiManager.hideInteractionPrompt();
    this.scene.start('TennisScene', { returnScene: 'MauiOverworldScene' });
  }
}
```

Add the uiManager import if not already present.

- [ ] **Step 4: Commit**

```bash
git add src/game/scenes/maui/MauiOverworldScene.ts
git commit -m "feat: add driving cars, checkpoint routing, new spawn in MauiOverworldScene"
```

---

### Task 7: Create MauiHotelScene (hotel room interior)

**Files:**
- Create: `src/game/scenes/maui/MauiHotelScene.ts`

- [ ] **Step 1: Create MauiHotelScene.ts**

Follow the pattern from `AirportEntranceScene.ts` — extends InteriorScene, has its own NPCSystem.

```typescript
// src/game/scenes/maui/MauiHotelScene.ts
import { InteriorScene } from '../InteriorScene';
import { InteriorLayout } from '../../data/interiorLayouts';
import { NPCSystem } from '../../systems/NPCSystem';
import { NPCDef, worldToTile } from '../../data/mapLayout';
import { uiManager } from '../../../ui/UIManager';
import { saveCurrentScene } from '../../systems/SaveSystem';

const HOTEL_LAYOUT: InteriorLayout = {
  id: 'maui-hotel',
  widthInTiles: 10,
  heightInTiles: 8,
  wallGrid: Array.from({ length: 8 }, (_, y) =>
    Array.from({ length: 10 }, (_, x) =>
      y === 0 || y === 7 || x === 0 || x === 9
    ),
  ),
  floors: [
    { floorType: 'wood', tileX: 1, tileY: 1, width: 8, height: 6 },
  ],
  decorations: [
    { type: 'kitchen-counter', tileX: 1, tileY: 1 },
    { type: 'kitchen-counter', tileX: 2, tileY: 1 },
    { type: 'sink', tileX: 3, tileY: 1 },
    { type: 'fridge', tileX: 1, tileY: 2 },
    { type: 'bathroom-wall', tileX: 8, tileY: 1 },
    { type: 'toilet', tileX: 8, tileY: 2 },
    { type: 'tv', tileX: 3, tileY: 4 },
    { type: 'bed', tileX: 5, tileY: 5 },
    { type: 'desk', tileX: 8, tileY: 6 },
  ],
  entrance: { tileX: 4, tileY: 6 },
  exit: { tileX: 4, tileY: 7, width: 2, height: 1, promptText: 'Tap to go out' },
};

const HOTEL_NPCS: NPCDef[] = [
  {
    id: 'hotel-frontdesk', tileX: 7, tileY: 6, behavior: 'idle',
    texture: 'npc-maui-frontdesk', interactable: true,
    onInteract: 'cutscene-trigger',
    interactionData: {
      lines: ['Ready to check out?', "We'll arrange your flight home. Mahalo!"],
      sceneKey: 'AirplaneCutscene',
      sceneData: { destination: 'home' },
    },
    facingDirection: 'left',
  },
];

export class MauiHotelScene extends InteriorScene {
  private npcSystem!: NPCSystem;

  constructor() {
    super({ key: 'MauiHotelScene' });
  }

  getLayout(): InteriorLayout {
    return HOTEL_LAYOUT;
  }

  create(): void {
    super.create();
    saveCurrentScene('MauiHotelScene');
    this.npcSystem = new NPCSystem();
    this.npcSystem.create(this, HOTEL_NPCS);

    this.npcSystem.onDwellTrigger = (npc) => {
      if (npc.onInteract === 'cutscene-trigger' && npc.interactionData?.sceneKey) {
        this.inputSystem.freeze();
        const sceneKey = npc.interactionData.sceneKey;
        const sceneData = npc.interactionData.sceneData ?? {};
        const triggerCutscene = () => {
          this.npcSystem.onDialogueEnd(npc.id);
          uiManager.hideInteractionPrompt();
          uiManager.hideHUD();
          const cam = this.cameras.main;
          this.tweens.add({
            targets: cam, alpha: 0, duration: 500, ease: 'Linear',
            onComplete: () => { this.scene.start(sceneKey, sceneData); },
          });
        };
        if (npc.interactionData.lines?.length) {
          uiManager.showNPCDialog(npc.interactionData.lines, triggerCutscene);
        } else {
          triggerCutscene();
        }
      }
    };
  }

  update(time: number, delta: number): void {
    super.update(time, delta);
    const pos = this.player.getPosition();
    this.npcSystem.update(delta, pos.x, pos.y, this.inputSystem.isFrozen);
  }

  // Override to return to Maui, not WorldScene
  protected exitToOverworld(): void {
    uiManager.hideInteractionPrompt();
    const cam = this.cameras.main;
    this.tweens.add({
      targets: cam, alpha: 0, duration: 300, ease: 'Linear',
      onComplete: () => {
        this.scene.start('MauiOverworldScene', {
          returnFromInterior: true,
          returnX: (this as any).returnData.returnX,
          returnY: (this as any).returnData.returnY,
        });
      },
    });
  }

  shutdown(): void {
    super.shutdown();
    this.npcSystem?.destroy();
  }
}
```

Note: The `returnData` access uses `(this as any)` because it's a private field on InteriorScene. This follows the same pattern as how the base class uses it internally. If this causes a compile error, make `returnData` protected in InteriorScene instead.

- [ ] **Step 2: Add hotel interior decoration textures**

In `MauiTextures.ts`, add a new function `generateHotelInteriorTextures(scene)` that creates interior decoration textures needed by the hotel room. These are small canvas textures for:

- `interior-kitchen-counter` (32x32): brown wooden counter
- `interior-sink` (32x32): counter with gray basin
- `interior-fridge` (32x32): white rectangle with handle
- `interior-bathroom-wall` (32x32): partial wall divider (lighter color than full wall)
- `interior-toilet` (32x32): white toilet shape
- `interior-tv` (32x32): dark rectangle with colored screen
- `interior-bed` (64x64): 2x2 white/blue bed with pillow
- `interior-desk` (32x32): brown desk with drawer

Call this from `generateMauiTextures()`.

**Important:** Check if `interiorLayouts.ts` uses `interior-${deco.type}` pattern for decoration rendering. The InteriorScene renders decorations as `this.add.image(pos.x, pos.y, \`interior-${deco.type}\`).setDepth(5)`. So texture keys must be `interior-kitchen-counter`, etc.

- [ ] **Step 3: Verify build compiles**

Run: `npx tsc --noEmit`

- [ ] **Step 4: Commit**

```bash
git add src/game/scenes/maui/MauiHotelScene.ts src/game/rendering/MauiTextures.ts
git commit -m "feat: add MauiHotelScene with hotel room interior and furniture textures"
```

---

## Chunk 3: Tennis Mini-Game & Scene Registration

### Task 8: Create TennisScene (rally counter mini-game)

**Files:**
- Create: `src/game/scenes/minigames/TennisScene.ts`

- [ ] **Step 1: Create TennisScene.ts**

Follow the CatchScene pattern. Side-view tennis rally — ball arcs toward player, tap/click in the sweet spot to return it.

```typescript
// src/game/scenes/minigames/TennisScene.ts
import Phaser from 'phaser';
import { uiManager } from '../../../ui/UIManager';

export class TennisScene extends Phaser.Scene {
  private score = 0;
  private ballSpeed = 200;
  private ball!: Phaser.GameObjects.Arc;
  private sweetSpot!: Phaser.GameObjects.Rectangle;
  private gameOver = false;
  private returnScene = 'MauiOverworldScene';

  constructor() {
    super({ key: 'TennisScene' });
  }

  init(data: { returnScene?: string }): void {
    this.returnScene = data.returnScene ?? 'MauiOverworldScene';
    this.score = 0;
    this.ballSpeed = 200;
    this.gameOver = false;
  }

  create(): void {
    const { width, height } = this.scale;

    // Court background (green)
    this.add.rectangle(width / 2, height / 2, width, height, 0x2d8b2d);

    // Court lines
    this.add.rectangle(width / 2, height / 2, width - 80, height - 60, 0x2d8b2d)
      .setStrokeStyle(2, 0xffffff);

    // Net (center vertical line)
    this.add.rectangle(width / 2, height / 2, 4, height - 60, 0xffffff);

    // Player side indicator (left)
    this.add.rectangle(width * 0.2, height / 2, 32, 48, 0x3366ff);

    // Opponent side (right)
    this.add.rectangle(width * 0.8, height / 2, 32, 48, 0xff3333);

    // Sweet spot zone (where player should tap)
    this.sweetSpot = this.add.rectangle(width * 0.25, height / 2, 60, 80, 0xffff00, 0.2);

    // Ball
    this.ball = this.add.circle(width * 0.75, height / 2, 8, 0xccff00);

    // Score display
    uiManager.showMinigameOverlay('Tennis Rally', this.score, '');

    // Start ball moving
    this.launchBall();

    // Tap/click to return
    this.input.on('pointerdown', () => {
      if (this.gameOver) return;
      this.tryReturn();
    });

    // Keyboard support
    if (this.input.keyboard) {
      this.input.keyboard.on('keydown-SPACE', () => {
        if (this.gameOver) return;
        this.tryReturn();
      });
    }
  }

  private launchBall(): void {
    const { width, height } = this.scale;
    // Ball starts from opponent side, arcs toward player
    this.ball.x = width * 0.75;
    this.ball.y = height / 2 + (Math.random() - 0.5) * 100;

    this.tweens.add({
      targets: this.ball,
      x: width * 0.1,
      y: height / 2 + (Math.random() - 0.5) * 120,
      duration: this.ballSpeed * 10,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        if (!this.gameOver) {
          this.endGame(); // Missed!
        }
      },
    });
  }

  private tryReturn(): void {
    // Check if ball is within the sweet spot
    const dx = this.ball.x - this.sweetSpot.x;
    const dy = this.ball.y - this.sweetSpot.y;
    const inZone = Math.abs(dx) < 40 && Math.abs(dy) < 50;

    if (inZone) {
      // Successful return!
      this.score++;
      this.ballSpeed = Math.max(80, this.ballSpeed - 5); // Speed up
      uiManager.updateMinigameScore(this.score);

      // Stop current tween, send ball back
      this.tweens.killTweensOf(this.ball);
      const { width, height } = this.scale;

      // Ball goes back to opponent
      this.tweens.add({
        targets: this.ball,
        x: width * 0.75,
        y: height / 2 + (Math.random() - 0.5) * 80,
        duration: 400,
        ease: 'Sine.easeOut',
        onComplete: () => {
          // Opponent "returns" after a brief delay
          this.time.delayedCall(300, () => {
            if (!this.gameOver) this.launchBall();
          });
        },
      });
    }
    // If not in zone, nothing happens — ball keeps moving, player can try again
  }

  private endGame(): void {
    this.gameOver = true;
    this.tweens.killAll();

    uiManager.hideMinigameOverlay();
    uiManager.showDialog({
      title: 'Game Over!',
      message: `Rally score: ${this.score}`,
      buttons: [{
        label: 'Back to Maui',
        onClick: () => {
          uiManager.hideDialog();
          this.scene.start(this.returnScene);
        },
      }],
    });
  }
}
```

**Note:** This uses `uiManager.showMinigameOverlay()` and `uiManager.updateMinigameScore()`. Check if these methods exist in UIManager. If not, use `uiManager.showDialog()` for score display instead, or create a simple in-scene text display.

- [ ] **Step 2: Verify build compiles**

Run: `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add src/game/scenes/minigames/TennisScene.ts
git commit -m "feat: add TennisScene rally counter mini-game"
```

---

### Task 9: Register new scenes in main.ts

**Files:**
- Modify: `src/main.ts`

- [ ] **Step 1: Add imports and register MauiHotelScene and TennisScene**

Add imports:
```typescript
import { MauiHotelScene } from './game/scenes/maui/MauiHotelScene';
import { TennisScene } from './game/scenes/minigames/TennisScene';
```

Add to the scene array (line 45):
```typescript
scene: [BootScene, DressingRoomScene, WorldScene, MichaelsHouseScene, AirportEntranceScene, AirportSecurityScene, AirportGateScene, AirplaneCutscene, MauiOverworldScene, MauiHotelScene, QuizScene, CatchScene, MatchScene, TennisScene],
```

- [ ] **Step 2: Make InteriorScene.returnData protected (if needed)**

Check if `MauiHotelScene` can access `this.returnData` from the base class. If it's `private`, change it to `protected` in `src/game/scenes/InteriorScene.ts`:

```typescript
// Change from:
private returnData!: InteriorSceneData;
// To:
protected returnData!: InteriorSceneData;
```

- [ ] **Step 3: Verify full build compiles**

Run: `npx tsc --noEmit`
Expected: Zero errors

- [ ] **Step 4: Commit**

```bash
git add src/main.ts src/game/scenes/InteriorScene.ts
git commit -m "feat: register MauiHotelScene and TennisScene, make returnData protected"
```

---

## Chunk 4: Final Verification

### Task 10: Full build and visual verification

- [ ] **Step 1: Verify full build compiles**

Run: `npx tsc --noEmit`
Expected: Zero errors

- [ ] **Step 2: Run dev server and verify**

Run: `npm run dev`

Manual verification checklist:
1. Fly to Maui from home world airport → arrives at Airbnb parking lot (top-right)
2. See new 45x30 map with correct zones: parking lot, grass, hotel building, road, restaurant, sand, water
3. 3 new terrain types visible: dark road, gray parking lot, light sidewalk
4. Hotel building (8x5) renders at center-right above road
5. Restaurant building (5x3) renders below road
6. Driving cars animate across road tiles (3 cars, different speeds/directions)
7. Jacuzzi decoration visible at Airbnb area
8. Tennis court decoration visible at Airbnb area
9. Walk to restaurant owner NPC → dwell trigger → dialogue works
10. Walk to hotel greeter NPC → dwell trigger → dialogue works
11. Walk to jacuzzi NPC → dwell trigger → relaxation dialogue
12. Walk to beach surfer → dwell trigger → dialogue
13. Enter hotel checkpoint zone → transitions to hotel interior
14. Hotel room: bed, TV, kitchen, bathroom visible
15. Walk to front desk NPC → dwell trigger → cutscene dialogue → airplane cutscene → home
16. Exit hotel via door → returns to Maui overworld at correct position
17. Enter tennis court checkpoint → TennisScene launches
18. Tennis game: ball moves, tap in sweet spot returns it, score increments
19. Miss ball → game over dialog → return to Maui
20. Palm trees, parked cars, beach decorations all render correctly
21. Walking NPC patrols in town area
22. Beachgoers sit on beach

- [ ] **Step 3: Fix any issues found**

```bash
git add -A
git commit -m "fix: address Maui rebuild integration issues"
```
