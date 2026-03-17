# Maui Expansion Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand Maui with a compound preview on the overworld, a driving hub scene, Road to Hana with 3 pullover stops, and Sun Beach with turtles + a minigame.

**Architecture:** Each destination is its own scene. Walkable areas extend `OverworldScene` (tile-based). Driving scenes and minigames extend `Phaser.Scene` directly (no tilemap). All textures are procedurally generated via Canvas 2D. Scene transitions use the existing `fadeToScene` pattern.

**Tech Stack:** Phaser 3.90, TypeScript, Canvas 2D procedural pixel art, HTML UI overlays via `uiManager`

**Design doc:** `docs/plans/2026-03-17-maui-expansion-design.md`

---

### Task 1: Compound Preview Texture + Decoration Swap

**Files:**
- Modify: `src/game/rendering/AirbnbCompoundTextures.ts`
- Modify: `src/game/scenes/maui/mauiMap.ts`

This replaces the gate decoration on the Maui overworld with a miniature bird's-eye view of the compound.

- [ ] **Step 1: Add `generateCompoundPreview()` to AirbnbCompoundTextures.ts**

Add a new function that creates a 128×96px canvas texture keyed `deco-compound-preview`. It should draw a miniature top-down view of the compound:

```typescript
function generateCompoundPreview(scene: Phaser.Scene): void {
  const c = scene.textures.createCanvas('deco-compound-preview', 128, 96);
  if (!c) return;
  const ctx = c.context;

  // Background grass
  rect(ctx, 0, 0, 128, 96, '#6B8E23');

  // Hedge border (dark green outline, 2px)
  rect(ctx, 0, 0, 128, 2, '#2E5A1C');   // top
  rect(ctx, 0, 94, 128, 2, '#2E5A1C');  // bottom
  rect(ctx, 0, 0, 2, 96, '#2E5A1C');    // left
  rect(ctx, 126, 0, 2, 96, '#2E5A1C');  // right

  // Main building (top-center) — cream rectangle with brown roof
  rect(ctx, 30, 4, 68, 24, '#B74C2C');  // roof
  rect(ctx, 32, 10, 64, 20, '#FFF8DC'); // walls

  // Pool (right-center) — blue rectangle
  rect(ctx, 80, 38, 32, 20, '#5DADE2');
  rect(ctx, 78, 36, 36, 24, '#8A8A8A'); // pool edge
  rect(ctx, 80, 38, 32, 20, '#5DADE2'); // water on top

  // Jacuzzi (left-center) — smaller blue square
  rect(ctx, 12, 42, 16, 12, '#8A8A8A'); // edge
  rect(ctx, 14, 44, 12, 8, '#5DADE2');  // water

  // Tennis court (bottom-left) — green rectangle with white line
  rect(ctx, 8, 66, 40, 18, '#2E7D32');
  rect(ctx, 27, 66, 2, 18, '#FFFFFF');  // net

  // Stone paths (tan lines connecting areas)
  rect(ctx, 56, 30, 8, 60, '#DEB887'); // vertical spine
  rect(ctx, 48, 66, 30, 4, '#DEB887'); // horizontal to deck

  // Wood deck (brown, right of pool)
  rect(ctx, 78, 58, 36, 6, '#A0724A');

  // Parking lot (bottom strip)
  rect(ctx, 4, 88, 120, 6, '#666666');

  // Mini palm trees (1-2px green dots with brown stem)
  const palmPositions = [[6, 8], [20, 6], [118, 8], [100, 70], [46, 64]];
  palmPositions.forEach(([px2, py]) => {
    rect(ctx, px2, py + 2, 1, 3, '#6B4E35');   // trunk
    circle(ctx, px2, py, 3, '#228B22');          // canopy
  });

  c.refresh();
}
```

In `generateAirbnbCompoundTextures()`, add the call: `generateCompoundPreview(scene);`

The existing `generateCompoundGate()` can remain — unreferenced textures are harmless.

- [ ] **Step 2: Swap the decoration in mauiMap.ts**

In `MAUI_DECORATIONS` array, find:
```typescript
{ type: 'compound-gate', tileX: 36, tileY: 4 },
```
Replace with:
```typescript
{ type: 'compound-preview', tileX: 37, tileY: 4 },
```

The `tileX` shifts to 37 to center the larger texture over the compound entrance area. The checkpoint zone `maui_airbnb` at (37,5) is unchanged.

- [ ] **Step 3: Build and verify visually**

Run: `npm run dev`
Expected: On the Maui overworld, where the gate used to be, a miniature compound preview is visible showing the building, pool, jacuzzi, and tennis court. Walking to the checkpoint still enters the compound.

- [ ] **Step 4: Commit**

```bash
git add src/game/rendering/AirbnbCompoundTextures.ts src/game/scenes/maui/mauiMap.ts
git commit -m "feat: replace compound gate with miniature preview on Maui overworld"
```

---

### Task 2: Driving Textures

**Files:**
- Create: `src/game/rendering/DrivingTextures.ts`
- Modify: `src/game/rendering/PixelArtGenerator.ts`

Generate all textures needed for the driving hub, Hana driving, and Sun Beach scenes. Bundle them in one file since they share the same helpers.

- [ ] **Step 1: Create DrivingTextures.ts**

Create `src/game/rendering/DrivingTextures.ts`. Follow the same pattern as `AirbnbCompoundTextures.ts` — local `px`, `rect`, `circle`, `darken`, `lighten` helpers, then texture generation functions.

Textures to generate:

1. **`car-player`** (48×32) — top-down player car, teal/green color. Body rect, windshield, wheels.
2. **`deco-road-sign-airport`** (32×48) — wooden post with white sign reading "Airport" (pixel text or arrow left).
3. **`deco-road-sign-hana`** (32×48) — sign reading "Hana" with arrow up.
4. **`deco-road-sign-beach`** (32×48) — sign reading "Beach" with arrow right.
5. **`deco-road-sign-back`** (32×48) — sign reading "Back" with arrow down.
6. **`deco-jungle-foliage`** (64×32) — strip of dark green jungle foliage for road edges.
7. **`deco-road-tree`** (32×64) — taller palm/tropical tree for roadside.

Export function signature:
```typescript
export function generateDrivingTextures(scene: Phaser.Scene): void { ... }
```

- [ ] **Step 2: Register in PixelArtGenerator.ts**

Add import at top of `src/game/rendering/PixelArtGenerator.ts`:
```typescript
import { generateDrivingTextures } from './DrivingTextures';
```

Find the section where `generateAirbnbCompoundTextures(scene)` is called and add after it:
```typescript
generateDrivingTextures(scene);
```

- [ ] **Step 3: Build to verify no errors**

Run: `npm run dev`
Expected: No errors. Textures are generated but not yet used by any scene.

- [ ] **Step 4: Commit**

```bash
git add src/game/rendering/DrivingTextures.ts src/game/rendering/PixelArtGenerator.ts
git commit -m "feat: add procedural textures for driving scenes"
```

---

### Task 3: DrivingScene (Hub)

**Files:**
- Create: `src/game/scenes/maui/DrivingScene.ts`
- Modify: `src/game/scenes/maui/MauiOverworldScene.ts`
- Modify: `src/game/scenes/maui/mauiMap.ts`
- Modify: `src/main.ts`

- [ ] **Step 1: Create DrivingScene.ts**

Create `src/game/scenes/maui/DrivingScene.ts`. This extends `Phaser.Scene` directly (like `TennisScene` and `AirplaneCutscene`). Pattern reference: `src/game/scenes/minigames/TennisScene.ts`.

```typescript
import Phaser from 'phaser';
import { uiManager } from '../../../ui/UIManager';

export class DrivingScene extends Phaser.Scene {
  private returnX?: number;
  private returnY?: number;

  constructor() {
    super({ key: 'DrivingScene' });
  }

  init(data: { returnX?: number; returnY?: number }) {
    this.returnX = data?.returnX;
    this.returnY = data?.returnY;
  }

  create() {
    const { width, height } = this.scale;

    // Green background (grass/jungle)
    this.add.rectangle(width / 2, height / 2, width, height, 0x4a7c2e);

    // Jungle foliage strips along edges
    for (let i = 0; i < Math.ceil(width / 64); i++) {
      this.add.image(i * 64 + 32, 30, 'deco-jungle-foliage').setDepth(0);
      this.add.image(i * 64 + 32, height - 30, 'deco-jungle-foliage').setDepth(0);
    }

    // Road: main trunk from bottom-center to fork point
    const roadColor = 0x555555;
    const roadWidth = 80;
    const forkY = height * 0.35;

    // Main road trunk (bottom to fork)
    this.add.rectangle(width / 2, (forkY + height) / 2, roadWidth, height - forkY, roadColor).setDepth(1);

    // Center line (dashed yellow)
    for (let y = height; y > forkY; y -= 30) {
      this.add.rectangle(width / 2, y, 4, 15, 0xffcc00).setDepth(2);
    }

    // Left branch (Airport) — angles to top-left
    const leftEndX = width * 0.15;
    const leftEndY = 40;
    // Draw as angled rectangle series
    const leftSteps = 10;
    for (let i = 0; i <= leftSteps; i++) {
      const t = i / leftSteps;
      const x = width / 2 + (leftEndX - width / 2) * t;
      const y = forkY + (leftEndY - forkY) * t;
      this.add.rectangle(x, y, roadWidth, (forkY - leftEndY) / leftSteps + 10, roadColor)
        .setDepth(1).setAngle(-25);
    }

    // Center branch (Hana) — straight up
    this.add.rectangle(width / 2, forkY / 2, roadWidth, forkY, roadColor).setDepth(1);
    for (let y = forkY; y > 0; y -= 30) {
      this.add.rectangle(width / 2, y, 4, 15, 0xffcc00).setDepth(2);
    }

    // Right branch (Beach) — angles to top-right
    const rightEndX = width * 0.85;
    const rightEndY = 40;
    for (let i = 0; i <= leftSteps; i++) {
      const t = i / leftSteps;
      const x = width / 2 + (rightEndX - width / 2) * t;
      const y = forkY + (rightEndY - forkY) * t;
      this.add.rectangle(x, y, roadWidth, (forkY - rightEndY) / leftSteps + 10, roadColor)
        .setDepth(1).setAngle(25);
    }

    // Road signs at each branch
    this.add.image(leftEndX + 60, leftEndY + 40, 'deco-road-sign-airport').setDepth(5);
    this.add.image(width / 2 + 60, 50, 'deco-road-sign-hana').setDepth(5);
    this.add.image(rightEndX - 60, rightEndY + 40, 'deco-road-sign-beach').setDepth(5);

    // Roadside trees
    const treePositions = [
      [40, 150], [width - 40, 150], [40, 350], [width - 40, 350],
      [150, 80], [width - 150, 80],
    ];
    treePositions.forEach(([x, y]) => {
      this.add.image(x, y, 'deco-road-tree').setDepth(3);
    });

    // Player car starts at bottom
    const car = this.add.image(width / 2, height + 30, 'car-player').setDepth(10);

    // Auto-drive car from bottom to fork
    this.tweens.add({
      targets: car,
      y: forkY + 60,
      duration: 2000,
      ease: 'Sine.easeOut',
      onComplete: () => {
        // Show destination choice dialog (non-dismissable)
        this.showDestinationChoice();
      },
    });
  }

  private showDestinationChoice(): void {
    uiManager.showDialog({
      title: 'Where to?',
      message: 'Choose your destination',
      buttons: [
        {
          label: '✈ Airport (Go Home)',
          onClick: () => {
            uiManager.hideDialog();
            this.cameras.main.fadeOut(500, 0, 0, 0);
            this.cameras.main.once('camerafadeoutcomplete', () => {
              this.scene.start('AirplaneCutscene', { destination: 'home' });
            });
          },
        },
        {
          label: '🌿 Road to Hana',
          onClick: () => {
            uiManager.hideDialog();
            this.cameras.main.fadeOut(500, 0, 0, 0);
            this.cameras.main.once('camerafadeoutcomplete', () => {
              this.scene.start('HanaDrivingScene', {
                resumeSegment: 0,
                returnX: this.returnX,
                returnY: this.returnY,
              });
            });
          },
        },
        {
          label: '🐢 Sun Beach',
          onClick: () => {
            uiManager.hideDialog();
            this.cameras.main.fadeOut(500, 0, 0, 0);
            this.cameras.main.once('camerafadeoutcomplete', () => {
              this.scene.start('SunBeachScene', {
                returnX: this.returnX,
                returnY: this.returnY,
              });
            });
          },
        },
        {
          label: '← Go Back',
          onClick: () => {
            uiManager.hideDialog();
            this.cameras.main.fadeOut(500, 0, 0, 0);
            this.cameras.main.once('camerafadeoutcomplete', () => {
              this.scene.start('MauiOverworldScene', {
                returnFromInterior: true,
                returnX: this.returnX,
                returnY: this.returnY,
              });
            });
          },
        },
      ],
    });
  }
}
```

**Note:** The road rendering above is approximate. The exact geometry should look good at 800×600. Adjust positions/angles as needed during implementation.

- [ ] **Step 2: Register DrivingScene in main.ts**

In `src/main.ts`, add import:
```typescript
import { DrivingScene } from './game/scenes/maui/DrivingScene';
```

Add `DrivingScene` to the scene array after `AirbnbCompoundScene`:
```typescript
scene: [BootScene, DressingRoomScene, WorldScene, MichaelsHouseScene, HadarsHouseScene, AirportInteriorScene, AirplaneCutscene, MauiOverworldScene, MauiHotelScene, AirbnbCompoundScene, DrivingScene, QuizScene, CatchScene, MatchScene, TennisScene, ChaseBabyScene],
```

- [ ] **Step 3: Redirect taxi checkpoint to DrivingScene**

In `src/game/scenes/maui/MauiOverworldScene.ts`, change the `maui_taxi` handler in `onEnterCheckpoint()`:

Replace:
```typescript
    } else if (zone.id === 'maui_taxi') {
      uiManager.showNPCDialog(
        ['Ready to head to the airport?', 'Hang loose! Enjoy your flight home!'],
        () => {
          uiManager.hideNPCDialog();
          uiManager.hideHUD();
          uiManager.hideInteractionPrompt();
          const cam = this.cameras.main;
          this.tweens.add({
            targets: cam, alpha: 0, duration: 500, ease: 'Linear',
            onComplete: () => {
              this.scene.start('AirplaneCutscene', { destination: 'home' });
            },
          });
        },
      );
    }
```

With:
```typescript
    } else if (zone.id === 'maui_taxi') {
      const pos = this.player.getPosition();
      this.fadeToScene('DrivingScene', { returnX: pos.x, returnY: pos.y });
    }
```

- [ ] **Step 4: Update checkpoint prompt text in mauiMap.ts**

In `src/game/scenes/maui/mauiMap.ts`, find the `maui_taxi` checkpoint zone and change `promptText`:

Replace:
```typescript
    promptText: 'Tap to take Taxi to Airport',
```
With:
```typescript
    promptText: 'Get in Car',
```

Also update the label map in `MauiOverworldScene.ts` — change `maui_taxi: 'Taxi'` to `maui_taxi: 'Car'`.

- [ ] **Step 5: Build and test**

Run: `npm run dev`
Expected: On Maui overworld, the taxi checkpoint now says "Get in Car". Entering it fades to DrivingScene which shows a road with a fork and 4 destination buttons. "Go Back" returns to Maui overworld. "Airport" goes to AirplaneCutscene. "Road to Hana" and "Sun Beach" will fail (scenes not registered yet) — that's expected.

- [ ] **Step 6: Commit**

```bash
git add src/game/scenes/maui/DrivingScene.ts src/game/scenes/maui/MauiOverworldScene.ts src/game/scenes/maui/mauiMap.ts src/main.ts
git commit -m "feat: add driving hub scene with destination selection"
```

---

### Task 4: Hana Textures + BlackSand Tile Type

**Files:**
- Create: `src/game/rendering/HanaTextures.ts`
- Modify: `src/game/scenes/maui/mauiMap.ts`
- Modify: `src/game/rendering/MauiTextures.ts`
- Modify: `src/game/rendering/PixelArtGenerator.ts`

- [ ] **Step 1: Add BlackSand to MauiTileType enum**

In `src/game/scenes/maui/mauiMap.ts`, add after `PoolEdge = 14`:
```typescript
  BlackSand = 15,
```

- [ ] **Step 2: Add BlackSand frame to terrain spritesheet**

In `src/game/rendering/MauiTextures.ts`, in `generateMauiTerrain()`:

Change the canvas width from 480 to 512:
```typescript
const c = scene.textures.createCanvas('maui-terrain', 512, 32);
```

Add a new block after the PoolEdge (index 14) block to generate frame 15 — BlackSand. Dark gray sand with slight texture:

```typescript
// Index 15 — BlackSand
{
  const ox = 480;
  const rng = seededRandom(1600);
  rect(ctx, ox, 0, 32, 32, '#3a3a3a');
  for (let y = 0; y < 32; y++) {
    for (let x = 0; x < 32; x++) {
      const r = rng();
      if (r < 0.15) px(ctx, ox + x, y, '#2a2a2a');
      else if (r < 0.25) px(ctx, ox + x, y, '#4a4a4a');
    }
  }
}
```

- [ ] **Step 3: Create HanaTextures.ts**

Create `src/game/rendering/HanaTextures.ts` with local helpers (same pattern as other texture files).

Textures to generate:

1. **`deco-waterfall`** (64×96) — multi-tile waterfall. Blue-white water cascading down gray cliff face. Cliff = gray rects at top, water = vertical blue/white stripes with foam at bottom.
2. **`deco-bamboo-stalk`** (16×64) — tall green bamboo with segments. Green rects with darker segment lines.
3. **`deco-volcanic-rock`** (32×32) — dark gray/black irregular rock shape.
4. **`deco-hana-sign`** (32×32) — small wooden sign.
5. **`deco-mossy-rock`** (32×32) — gray rock with green moss patches.
6. **`deco-driftwood-hana`** (48×16) — weathered wood piece on black sand.
7. **`npc-hiker`** (48×48) — use `drawNPCBase()` pattern from MauiTextures. Hiking outfit (khaki pants, green top, hat).
8. **`npc-trail-guide`** (48×48) — NPC in ranger outfit (brown pants, khaki top).
9. **`npc-geologist`** (48×48) — NPC with glasses and clipboard (blue top, gray pants).

Export: `export function generateHanaTextures(scene: Phaser.Scene): void { ... }`

- [ ] **Step 4: Register in PixelArtGenerator.ts**

Add import and call after `generateDrivingTextures(scene);`:
```typescript
import { generateHanaTextures } from './HanaTextures';
// ...
generateHanaTextures(scene);
```

- [ ] **Step 5: Build to verify**

Run: `npm run dev`
Expected: No errors. New textures generated but not yet used.

- [ ] **Step 6: Commit**

```bash
git add src/game/rendering/HanaTextures.ts src/game/rendering/MauiTextures.ts src/game/scenes/maui/mauiMap.ts src/game/rendering/PixelArtGenerator.ts
git commit -m "feat: add Hana textures and BlackSand tile type"
```

---

### Task 5: Hana Pullover Layouts + Scene

**Files:**
- Create: `src/game/scenes/maui/hanaPulloverLayouts.ts`
- Create: `src/game/scenes/maui/HanaPulloverScene.ts`
- Modify: `src/main.ts`

- [ ] **Step 1: Create hanaPulloverLayouts.ts**

Create `src/game/scenes/maui/hanaPulloverLayouts.ts`. This exports map data for 3 pullover stops. Pattern reference: `src/game/scenes/maui/airbnbCompoundMap.ts`.

Each layout exports a function that returns: `{ width, height, tileGrid, walkCheck, getTileType, npcs, checkpointZones, decorations, buildings }`.

```typescript
import { NPCDef, CheckpointZone, tileToWorld } from '../../data/mapLayout';
import { MauiTileType } from './mauiMap';

export type HanaStop = 'waterfall' | 'bamboo' | 'blacksand';

interface HanaPulloverLayout {
  width: number;
  height: number;
  tileGrid: number[][];
  walkCheck: (x: number, y: number) => boolean;
  getTileType: (x: number, y: number) => number;
  npcs: NPCDef[];
  checkpointZones: CheckpointZone[];
  decorations: Array<{ type: string; tileX: number; tileY: number }>;
  buildings: Array<{ name: string; tileX: number; tileY: number; tileW: number; tileH: number }>;
}

export function getHanaPulloverLayout(stop: HanaStop): HanaPulloverLayout {
  switch (stop) {
    case 'waterfall': return getWaterfallLayout();
    case 'bamboo': return getBambooLayout();
    case 'blacksand': return getBlackSandLayout();
  }
}
```

**Waterfall layout (20×15):**
- y=0-2: Stone (cliff wall, impassable)
- y=3-5, x=7-12: ShallowWater (pool at base of waterfall)
- y=6-14: Grass with StonePath at x=10
- Walkability: everything walkable except y=0-2 (cliff) and map borders
- NPC: hiker at (6,8), idle, interactable, dialog: ["What a view!", "The mist from the falls is so refreshing."]
- Checkpoint: `hana_return` at (10,14), radius 48, "Return to Car"
- Decorations: waterfall at (8,0), mossy-rock at (4,5), (14,4), palm-tree at (2,10), (17,8)

**Bamboo Forest layout (20×15):**
- Full Grass terrain with StonePath winding from (10,14) upward
- StonePath tiles at: x=10 for y=14-10, x=10-12 for y=10, x=12 for y=10-6, x=12-8 for y=6, x=8 for y=6-2
- Walkability: all walkable except map borders
- NPC: trail-guide at (12,7), idle, dialog: ["This bamboo forest is over 100 years old.", "Listen to the wind through the stalks..."]
- Checkpoint: `hana_return` at (10,14), radius 48, "Return to Car"
- Decorations: bamboo-stalk at (4,3), (6,5), (3,8), (14,2), (16,4), (15,9), (5,11), (17,7), hana-sign at (10,13)

**Black Sand Beach layout (20×15):**
- y=0-7: BlackSand (tile type 15)
- y=8-10: ShallowWater
- y=11-14: Ocean (impassable)
- Walkability: walkable except y>=11 (ocean) and map borders
- NPC: geologist at (12,3), idle, dialog: ["This black sand comes from volcanic basalt.", "It takes thousands of years to form!"]
- Checkpoint: `hana_return` at (10,0), radius 48, "Return to Car" (north edge)
- Decorations: volcanic-rock at (3,2), (15,4), (8,6), driftwood-hana at (6,1), (14,5)

Each layout function builds the tileGrid procedurally (like `mauiMap.ts` does), defines walkCheck and getTileType inline.

- [ ] **Step 2: Create HanaPulloverScene.ts**

Create `src/game/scenes/maui/HanaPulloverScene.ts`. This extends `OverworldScene`. Pattern reference: `src/game/scenes/maui/AirbnbCompoundScene.ts`.

```typescript
import { OverworldScene, OverworldConfig } from '../OverworldScene';
import { TILE_SIZE } from '../../../utils/constants';
import { CheckpointZone, tileToWorld } from '../../data/mapLayout';
import { saveCurrentScene } from '../../systems/SaveSystem';
import { WaterEffectSystem } from '../../systems/WaterEffectSystem';
import { MauiTileType } from './mauiMap';
import { getHanaPulloverLayout, HanaStop } from './hanaPulloverLayouts';

export class HanaPulloverScene extends OverworldScene {
  private stop: HanaStop = 'waterfall';
  private resumeSegment = 0;
  private returnX?: number;
  private returnY?: number;
  private waterSystem!: WaterEffectSystem;

  constructor() {
    super({ key: 'HanaPulloverScene' });
  }

  init(data?: any): void {
    super.init(data);
    this.stop = data?.stop ?? 'waterfall';
    this.resumeSegment = data?.resumeSegment ?? 0;
    this.returnX = data?.returnX;
    this.returnY = data?.returnY;
  }

  getConfig(): OverworldConfig {
    const layout = getHanaPulloverLayout(this.stop);
    // Spawn near the exit checkpoint
    const exitZone = layout.checkpointZones[0];
    return {
      mapWidth: layout.width,
      mapHeight: layout.height,
      tileGrid: layout.tileGrid,
      walkCheck: layout.walkCheck,
      npcs: layout.npcs,
      checkpointZones: layout.checkpointZones,
      spawnX: exitZone.centerX,
      spawnY: exitZone.centerY,
      terrainTextureKey: 'maui-terrain',
    };
  }

  getLabelMap(): Record<string, string> {
    return { hana_return: 'Car' };
  }

  create(): void {
    super.create();
    saveCurrentScene('HanaDrivingScene'); // save as driving scene so reload restarts drive
  }

  onCreateExtras(): void {
    const layout = getHanaPulloverLayout(this.stop);
    layout.decorations.forEach(deco => {
      const pos = tileToWorld(deco.tileX, deco.tileY);
      this.add.image(pos.x, pos.y, `deco-${deco.type}`).setDepth(-10);
    });
    layout.buildings.forEach(b => {
      const cx = b.tileX * TILE_SIZE + (b.tileW * TILE_SIZE) / 2;
      const cy = b.tileY * TILE_SIZE + (b.tileH * TILE_SIZE) / 2;
      this.add.image(cx, cy, `building-${b.name}`).setDepth(-5);
    });

    this.waterSystem = new WaterEffectSystem(this, {
      getTileType: layout.getTileType,
      waterTileValue: MauiTileType.ShallowWater,
      wadingSpeed: 0.8,
    });
    this.waterSystem.create();
  }

  update(time: number, delta: number): void {
    super.update(time, delta);
    this.waterSystem.update(this.player, this.partner);
  }

  onEnterCheckpoint(zone: CheckpointZone): void {
    if (zone.id === 'hana_return') {
      this.fadeToScene('HanaDrivingScene', {
        resumeSegment: this.resumeSegment + 1,
        returnX: this.returnX,
        returnY: this.returnY,
      });
    }
  }

  shutdown(): void {
    this.waterSystem?.shutdown(this.player, this.partner);
    super.shutdown();
  }

  protected onBack(): void { /* no-op */ }
}
```

- [ ] **Step 3: Register HanaPulloverScene in main.ts**

Add import:
```typescript
import { HanaPulloverScene } from './game/scenes/maui/HanaPulloverScene';
```

Add to scene array after `DrivingScene`.

- [ ] **Step 4: Build to verify**

Run: `npm run dev`
Expected: No errors. Scene registered but not yet reachable (HanaDrivingScene not created yet).

- [ ] **Step 5: Commit**

```bash
git add src/game/scenes/maui/hanaPulloverLayouts.ts src/game/scenes/maui/HanaPulloverScene.ts src/main.ts
git commit -m "feat: add Hana pullover stop layouts and scene"
```

---

### Task 6: HanaDrivingScene

**Files:**
- Create: `src/game/scenes/maui/HanaDrivingScene.ts`
- Modify: `src/main.ts`

- [ ] **Step 1: Create HanaDrivingScene.ts**

Create `src/game/scenes/maui/HanaDrivingScene.ts`. This is a linear driving scene (no tilemap) with scrolling road. Pattern reference: `AirplaneCutscene.ts` for tween-based scene, `TennisScene.ts` for init/return pattern.

```typescript
import Phaser from 'phaser';
import { uiManager } from '../../../ui/UIManager';

const SEGMENT_NAMES = ['Waterfall', 'Bamboo Forest', 'Black Sand Beach'];
const SEGMENT_STOPS = ['waterfall', 'bamboo', 'blacksand'] as const;
const SEGMENT_COLORS = [0x4a7c2e, 0x2d5a1c, 0x3a3a3a]; // grass, jungle, volcanic
const SEGMENT_DURATION = 6000; // ms per driving segment

export class HanaDrivingScene extends Phaser.Scene {
  private resumeSegment = 0;
  private returnX?: number;
  private returnY?: number;

  constructor() {
    super({ key: 'HanaDrivingScene' });
  }

  init(data: { resumeSegment?: number; returnX?: number; returnY?: number }) {
    this.resumeSegment = data?.resumeSegment ?? 0;
    this.returnX = data?.returnX;
    this.returnY = data?.returnY;
  }

  create() {
    const { width, height } = this.scale;

    // If all segments done, return to driving hub
    if (this.resumeSegment >= SEGMENT_STOPS.length) {
      this.cameras.main.fadeOut(500, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('DrivingScene', {
          returnX: this.returnX,
          returnY: this.returnY,
        });
      });
      return;
    }

    const segIdx = this.resumeSegment;
    const bgColor = SEGMENT_COLORS[segIdx] ?? 0x4a7c2e;

    // Background (changes per segment)
    this.add.rectangle(width / 2, height / 2, width, height, bgColor);

    // Road (vertical center strip)
    const roadW = 100;
    this.add.rectangle(width / 2, height / 2, roadW, height, 0x555555).setDepth(1);

    // Scrolling center line
    const lines: Phaser.GameObjects.Rectangle[] = [];
    for (let y = -30; y < height + 60; y += 40) {
      const line = this.add.rectangle(width / 2, y, 4, 20, 0xffcc00).setDepth(2);
      lines.push(line);
    }

    // Scroll lines downward to simulate driving
    this.tweens.add({
      targets: lines,
      y: '+=40',
      duration: 500,
      ease: 'Linear',
      repeat: -1,
    });

    // Scenery (trees scroll down on both sides)
    const sceneryItems: Phaser.GameObjects.Image[] = [];
    for (let i = 0; i < 8; i++) {
      const side = i % 2 === 0 ? width / 2 - roadW / 2 - 40 : width / 2 + roadW / 2 + 40;
      const y = -60 - i * 80;
      const tree = this.add.image(side, y, 'deco-road-tree').setDepth(3);
      sceneryItems.push(tree);
    }

    this.tweens.add({
      targets: sceneryItems,
      y: `+=${height + 200}`,
      duration: SEGMENT_DURATION,
      ease: 'Linear',
    });

    // Player car (bottom center)
    const car = this.add.image(width / 2, height * 0.75, 'car-player').setDepth(10);

    // After segment duration, show pullover prompt
    this.time.delayedCall(SEGMENT_DURATION * 0.8, () => {
      // Stop scrolling effect
      this.tweens.killAll();

      // Show pullover sign
      const signName = SEGMENT_NAMES[segIdx];
      uiManager.showDialog({
        title: `${signName} Ahead`,
        message: `Would you like to pull over and explore?`,
        buttons: [
          {
            label: `Pull Over at ${signName}`,
            onClick: () => {
              uiManager.hideDialog();
              this.cameras.main.fadeOut(500, 0, 0, 0);
              this.cameras.main.once('camerafadeoutcomplete', () => {
                this.scene.start('HanaPulloverScene', {
                  stop: SEGMENT_STOPS[segIdx],
                  resumeSegment: segIdx,
                  returnX: this.returnX,
                  returnY: this.returnY,
                });
              });
            },
          },
          {
            label: 'Keep Driving',
            onClick: () => {
              uiManager.hideDialog();
              // Advance to next segment
              this.scene.start('HanaDrivingScene', {
                resumeSegment: segIdx + 1,
                returnX: this.returnX,
                returnY: this.returnY,
              });
            },
          },
        ],
      });
    });
  }
}
```

- [ ] **Step 2: Register in main.ts**

Add import:
```typescript
import { HanaDrivingScene } from './game/scenes/maui/HanaDrivingScene';
```

Add to scene array after `HanaPulloverScene`.

- [ ] **Step 3: Build and test full Hana flow**

Run: `npm run dev`
Expected: From DrivingScene, choosing "Road to Hana" starts HanaDrivingScene. Road scrolls, pullover prompt appears. "Pull Over" enters the pullover stop (waterfall/bamboo/blacksand). "Return to Car" resumes driving at next segment. After all 3 segments, returns to DrivingScene.

- [ ] **Step 4: Commit**

```bash
git add src/game/scenes/maui/HanaDrivingScene.ts src/main.ts
git commit -m "feat: add Road to Hana driving scene with pullover stops"
```

---

### Task 7: Sun Beach Textures

**Files:**
- Create: `src/game/rendering/SunBeachTextures.ts`
- Modify: `src/game/rendering/PixelArtGenerator.ts`

- [ ] **Step 1: Create SunBeachTextures.ts**

Create `src/game/rendering/SunBeachTextures.ts` with local helpers (same pattern).

Textures to generate:

1. **`npc-turtle`** (32×32) — green sea turtle on sand, top-down view. Dark green shell with lighter pattern, flippers, small head.
2. **`npc-turtle-water`** (32×32) — turtle in water variant (blue-green tint, extended flippers for swimming pose).
3. **`deco-turtle-nest`** (32×32) — sandy mound with small white egg circles.
4. **`deco-beach-grass`** (32×32) — tufts of dune grass (green wisps on sand-colored base).
5. **`deco-driftwood`** (48×16) — weathered brown wood piece.
6. **`deco-sun-beach-sign`** (32×48) — wooden sign with "Sun Beach" (pixel text or decorative).
7. **Minigame textures:**
   - `mini-baby-turtle` (16×16) — tiny green turtle
   - `mini-crab` (16×16) — red/orange crab
   - `mini-seagull` (16×16) — white/gray bird
   - `mini-driftwood-obstacle` (24×8) — small brown wood
8. **`npc-nature-guide`** (48×48) — use drawNPCBase pattern (green top, khaki pants, hat).
9. **`npc-tourist-camera`** (48×48) — tourist with camera detail (bright shirt, shorts).

Export: `export function generateSunBeachTextures(scene: Phaser.Scene): void { ... }`

- [ ] **Step 2: Register in PixelArtGenerator.ts**

Add import and call:
```typescript
import { generateSunBeachTextures } from './SunBeachTextures';
// ...
generateSunBeachTextures(scene);
```

- [ ] **Step 3: Build to verify**

Run: `npm run dev`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/game/rendering/SunBeachTextures.ts src/game/rendering/PixelArtGenerator.ts
git commit -m "feat: add Sun Beach and turtle textures"
```

---

### Task 8: Sun Beach Map + Scene

**Files:**
- Create: `src/game/scenes/maui/sunBeachMap.ts`
- Create: `src/game/scenes/maui/SunBeachScene.ts`
- Modify: `src/main.ts`

- [ ] **Step 1: Create sunBeachMap.ts**

Create `src/game/scenes/maui/sunBeachMap.ts`. Pattern reference: `airbnbCompoundMap.ts`.

```typescript
import { NPCDef, CheckpointZone, tileToWorld } from '../../data/mapLayout';
import { MauiTileType } from './mauiMap';

export const SUNBEACH_WIDTH = 30;
export const SUNBEACH_HEIGHT = 20;
```

**Tile grid (30×20):**
- y=0-1: Asphalt (road/parking)
- y=2-3: Grass
- y=4-10: Sand
- y=11-14: ShallowWater
- y=15-19: Ocean (impassable)

**Walk grid:**
- Walkable everywhere except: map borders, y>=15 (ocean), parked car at (14,0) and (15,0)

**NPCs (6 total):**
- `turtle-sand-1`: (8,6), walk, texture `npc-turtle`, walkPath [{x:8,y:6},{x:14,y:6}], speed 15, interactable, dialog: ["*The turtle slowly looks at you*", "It seems unbothered by your presence."]
- `turtle-sand-2`: (20,8), idle, texture `npc-turtle`, interactable, dialog: ["*The turtle is sunbathing*", "Living its best life."]
- `turtle-water-1`: (12,12), walk, texture `npc-turtle-water`, walkPath [{x:10,y:12},{x:18,y:12}], speed 20
- `turtle-water-2`: (22,13), walk, texture `npc-turtle-water`, walkPath [{x:20,y:13},{x:26,y:13}], speed 25
- `nature-guide-npc`: (5,4), idle, texture `npc-nature-guide`, interactable, dialog: ["Welcome to Sun Beach!", "This is a protected nesting area for green sea turtles.", "Please enjoy from a respectful distance."]
- `tourist-camera-npc`: (24,7), idle, texture `npc-tourist-camera`, interactable, dialog: ["I've been trying to get the perfect photo all day!", "These turtles are amazing."]

**Checkpoints:**
- `sunbeach_exit`: at (15,0), radius 48, "Return to Car"
- `sunbeach_turtle_game`: at (5,5), radius 64, "Play Turtle Rescue?"

**Decorations:**
- `sun-beach-sign` at (13,3)
- `turtle-nest` at (4,6), (18,5)
- `beach-grass` at (1,3), (28,3), (3,4), (26,4)
- `driftwood` at (10,9), (22,10)
- `palm-tree` at (0,2), (29,2), (7,3), (23,3)
- `beach-umbrella` at (16,7)
- `beach-towel` at (17,8)
- `maui-parkedcar` at (14,0), (16,0)

Export: all constants + `isSunBeachWalkable`, `getSunBeachTileType` functions.

- [ ] **Step 2: Create SunBeachScene.ts**

Create `src/game/scenes/maui/SunBeachScene.ts`. Extends `OverworldScene`. Pattern: `AirbnbCompoundScene.ts`.

```typescript
import { OverworldScene, OverworldConfig } from '../OverworldScene';
import { TILE_SIZE } from '../../../utils/constants';
import { CheckpointZone, tileToWorld } from '../../data/mapLayout';
import { saveCurrentScene } from '../../systems/SaveSystem';
import { uiManager } from '../../../ui/UIManager';
import { WaterEffectSystem } from '../../systems/WaterEffectSystem';
import { MauiTileType } from './mauiMap';
import {
  SUNBEACH_WIDTH, SUNBEACH_HEIGHT, sunBeachTileGrid, isSunBeachWalkable,
  getSunBeachTileType, SUNBEACH_NPCS, SUNBEACH_CHECKPOINT_ZONES,
  SUNBEACH_DECORATIONS,
} from './sunBeachMap';

const BEACH_TILE_Y = 4;

export class SunBeachScene extends OverworldScene {
  private waterSystem!: WaterEffectSystem;
  private returnX?: number;
  private returnY?: number;
  private playerOnBeach = false;
  private partnerOnBeach = false;

  constructor() {
    super({ key: 'SunBeachScene' });
  }

  init(data?: any): void {
    super.init(data);
    this.playerOnBeach = false;
    this.partnerOnBeach = false;
    this.returnX = data?.returnX;
    this.returnY = data?.returnY;
  }

  getConfig(): OverworldConfig {
    // Use return position from minigame, or default to parking area
    const spawnPos = this.returnX != null
      ? { x: this.returnX!, y: this.returnY! }
      : tileToWorld(15, 1);

    return {
      mapWidth: SUNBEACH_WIDTH,
      mapHeight: SUNBEACH_HEIGHT,
      tileGrid: sunBeachTileGrid,
      walkCheck: isSunBeachWalkable,
      npcs: SUNBEACH_NPCS,
      checkpointZones: SUNBEACH_CHECKPOINT_ZONES,
      spawnX: spawnPos.x,
      spawnY: spawnPos.y,
      terrainTextureKey: 'maui-terrain',
    };
  }

  getLabelMap(): Record<string, string> {
    return {
      sunbeach_exit: 'Car',
      sunbeach_turtle_game: 'Turtle Rescue',
    };
  }

  create(): void {
    super.create();
    saveCurrentScene('SunBeachScene');
  }

  onCreateExtras(): void {
    SUNBEACH_DECORATIONS.forEach(deco => {
      const pos = tileToWorld(deco.tileX, deco.tileY);
      this.add.image(pos.x, pos.y, `deco-${deco.type}`).setDepth(-10);
    });

    this.waterSystem = new WaterEffectSystem(this, {
      getTileType: getSunBeachTileType,
      waterTileValue: MauiTileType.ShallowWater,
      wadingSpeed: 0.8,
      swimmingSpeed: 0.55,
      isDeepWater: (tileY) => tileY >= 15,
    });
    this.waterSystem.create();

    // Wave animations along shore
    for (let i = 0; i < 6; i++) {
      const pos = tileToWorld(i * 5 + 2, 14);
      const wave = this.add.image(pos.x, pos.y, 'deco-wave-foam')
        .setDepth(-8).setAlpha(0.6);
      this.tweens.add({
        targets: wave, x: pos.x + 16, alpha: 0.25,
        duration: 2000 + i * 200, ease: 'Sine.easeInOut',
        repeat: -1, yoyo: true, delay: i * 300,
      });
    }
  }

  update(time: number, delta: number): void {
    super.update(time, delta);

    // Swimsuit swap at beach zone
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

    this.waterSystem.update(this.player, this.partner);
  }

  onEnterCheckpoint(zone: CheckpointZone): void {
    const pos = this.player.getPosition();
    if (zone.id === 'sunbeach_exit') {
      this.fadeToScene('DrivingScene', {
        returnX: this.returnX,
        returnY: this.returnY,
      });
    } else if (zone.id === 'sunbeach_turtle_game') {
      uiManager.hideHUD();
      uiManager.hideInteractionPrompt();
      this.scene.start('TurtleRescueScene', {
        returnScene: 'SunBeachScene',
        returnX: pos.x,
        returnY: pos.y,
      });
    }
  }

  shutdown(): void {
    if (this.playerOnBeach) {
      this.player.restoreTexture(this);
      this.playerOnBeach = false;
    }
    if (this.partnerOnBeach) {
      this.partner.restoreTexture(this);
      this.partnerOnBeach = false;
    }
    this.waterSystem?.shutdown(this.player, this.partner);
    super.shutdown();
  }

  protected onBack(): void { /* no-op */ }
}
```

- [ ] **Step 3: Register SunBeachScene in main.ts**

Add import:
```typescript
import { SunBeachScene } from './game/scenes/maui/SunBeachScene';
```

Add to scene array.

- [ ] **Step 4: Build and test**

Run: `npm run dev`
Expected: From DrivingScene, "Sun Beach" transitions to an explorable beach with turtles walking on sand and swimming in water. Exit checkpoint returns to DrivingScene. Turtle Rescue checkpoint will fail (scene not yet created).

- [ ] **Step 5: Commit**

```bash
git add src/game/scenes/maui/sunBeachMap.ts src/game/scenes/maui/SunBeachScene.ts src/main.ts
git commit -m "feat: add Sun Beach scene with turtles"
```

---

### Task 9: Turtle Rescue Minigame

**Files:**
- Create: `src/game/scenes/minigames/TurtleRescueScene.ts`
- Modify: `src/main.ts`

- [ ] **Step 1: Create TurtleRescueScene.ts**

Create `src/game/scenes/minigames/TurtleRescueScene.ts`. Pattern reference: `src/game/scenes/minigames/TennisScene.ts`.

```typescript
import Phaser from 'phaser';
import { uiManager } from '../../../ui/UIManager';

const TOTAL_TURTLES = 10;
const TURTLE_SPEED = 1500;      // ms to cross screen
const OBSTACLE_INTERVAL = 800;  // ms between obstacle spawns
const LANE_COUNT = 5;

export class TurtleRescueScene extends Phaser.Scene {
  private saved = 0;
  private lost = 0;
  private spawned = 0;
  private gameOver = false;
  private returnScene = 'SunBeachScene';
  private returnX?: number;
  private returnY?: number;
  private obstacles: Phaser.GameObjects.Image[] = [];

  constructor() {
    super({ key: 'TurtleRescueScene' });
  }

  init(data: { returnScene?: string; returnX?: number; returnY?: number }) {
    this.returnScene = data.returnScene ?? 'SunBeachScene';
    this.returnX = data.returnX;
    this.returnY = data.returnY;
    this.saved = 0;
    this.lost = 0;
    this.spawned = 0;
    this.gameOver = false;
    this.obstacles = [];
  }

  create() {
    const { width, height } = this.scale;

    // Beach background (sand at top, ocean at bottom)
    this.add.rectangle(width / 2, height * 0.3, width, height * 0.6, 0xF4D03F); // sand
    this.add.rectangle(width / 2, height * 0.8, width, height * 0.4, 0x5DADE2); // ocean

    // Goal line (ocean edge)
    this.add.rectangle(width / 2, height * 0.6, width, 4, 0x2E86C1).setDepth(1);

    // Nest area at top
    this.add.rectangle(width / 2, 20, width, 40, 0xD4B030).setDepth(0);

    // Score overlay
    uiManager.showMinigameOverlay({
      title: 'Turtle Rescue',
      score: 0,
      maxScore: TOTAL_TURTLES,
      onExit: () => this.endGame(),
    });

    // Spawn turtles one at a time
    this.spawnNextTurtle();

    // Spawn obstacles periodically
    this.time.addEvent({
      delay: OBSTACLE_INTERVAL,
      callback: () => { if (!this.gameOver) this.spawnObstacle(); },
      loop: true,
    });
  }

  private spawnNextTurtle(): void {
    if (this.spawned >= TOTAL_TURTLES || this.gameOver) return;

    const { width, height } = this.scale;
    const lane = Phaser.Math.Between(0, LANE_COUNT - 1);
    const laneWidth = width / LANE_COUNT;
    const x = lane * laneWidth + laneWidth / 2;

    const turtle = this.add.image(x, 30, 'mini-baby-turtle').setDepth(5);
    this.spawned++;

    // Turtle waddles toward ocean
    this.tweens.add({
      targets: turtle,
      y: height * 0.7,
      duration: TURTLE_SPEED + Phaser.Math.Between(-300, 300),
      ease: 'Linear',
      onUpdate: () => {
        // Check if turtle hits an obstacle
        for (const obs of this.obstacles) {
          if (!obs.active) continue;
          const dx = Math.abs(turtle.x - obs.x);
          const dy = Math.abs(turtle.y - obs.y);
          if (dx < 16 && dy < 12) {
            // Turtle blocked!
            this.tweens.killTweensOf(turtle);
            turtle.setTint(0xff0000);
            this.time.delayedCall(300, () => turtle.destroy());
            this.lost++;
            this.checkEnd();
            return;
          }
        }
      },
      onComplete: () => {
        // Turtle reached ocean — saved!
        turtle.destroy();
        this.saved++;
        uiManager.updateMinigameOverlay({ score: this.saved });
        this.checkEnd();
      },
    });

    // Spawn next turtle after delay
    this.time.delayedCall(800, () => this.spawnNextTurtle());
  }

  private spawnObstacle(): void {
    const { width, height } = this.scale;
    const obstacleTypes = ['mini-crab', 'mini-seagull', 'mini-driftwood-obstacle'];
    const type = Phaser.Utils.Array.GetRandom(obstacleTypes);
    const x = Phaser.Math.Between(30, width - 30);
    const y = Phaser.Math.Between(60, height * 0.55);

    const obs = this.add.image(x, y, type).setDepth(3).setInteractive();
    this.obstacles.push(obs);

    // Tap/click to clear obstacle
    obs.on('pointerdown', () => {
      obs.disableInteractive();
      obs.active = false;
      this.tweens.add({
        targets: obs,
        alpha: 0,
        scaleX: 0.5,
        scaleY: 0.5,
        duration: 200,
        onComplete: () => obs.destroy(),
      });
    });

    // Obstacle disappears after a while if not clicked
    this.time.delayedCall(4000, () => {
      if (obs.active) {
        obs.active = false;
        obs.destroy();
      }
    });
  }

  private checkEnd(): void {
    if (this.saved + this.lost >= TOTAL_TURTLES) {
      this.endGame();
    }
  }

  private endGame(): void {
    if (this.gameOver) return;
    this.gameOver = true;
    this.tweens.killAll();
    this.time.removeAllEvents();
    uiManager.hideMinigameOverlay();

    uiManager.showDialog({
      title: 'Turtle Rescue Complete!',
      message: `You saved ${this.saved} out of ${TOTAL_TURTLES} baby turtles!`,
      buttons: [{
        label: 'Back to Beach',
        onClick: () => {
          uiManager.hideDialog();
          this.scene.start(this.returnScene, {
            returnX: this.returnX,
            returnY: this.returnY,
          });
        },
      }],
    });
  }
}
```

- [ ] **Step 2: Register in main.ts**

Add import:
```typescript
import { TurtleRescueScene } from './game/scenes/minigames/TurtleRescueScene';
```

Add to scene array.

- [ ] **Step 3: Build and test full flow**

Run: `npm run dev`
Expected: From Sun Beach, the "Turtle Rescue" checkpoint starts the minigame. Baby turtles appear at top, waddle toward ocean. Obstacles appear that you tap to clear. Score tracks saved turtles. Game ends after all 10 turtles. "Back to Beach" returns to SunBeachScene.

- [ ] **Step 4: Commit**

```bash
git add src/game/scenes/minigames/TurtleRescueScene.ts src/main.ts
git commit -m "feat: add Turtle Rescue minigame"
```

---

### Task 10: Integration Test — Full Flow Verification

**Files:** None (testing only)

- [ ] **Step 1: Test complete flow**

Run: `npm run dev` and manually walk through every path:

1. **Maui overworld** — verify compound preview decoration is visible at parking area
2. **Compound preview** — walk to it, enter compound, verify compound still works normally
3. **Get in Car** — walk to car checkpoint, enter DrivingScene
4. **DrivingScene → Airport** — verify AirplaneCutscene starts
5. **DrivingScene → Go Back** — verify returns to Maui overworld at correct position
6. **DrivingScene → Road to Hana** — verify HanaDrivingScene starts with scrolling road
7. **Hana → Pull Over (Waterfall)** — verify walkable area, NPC dialog, return to car
8. **Hana → Keep Driving → Pull Over (Bamboo)** — verify layout change
9. **Hana → Keep Driving → Pull Over (Black Sand)** — verify BlackSand tiles render correctly
10. **Hana complete** — verify returns to DrivingScene after all segments
11. **DrivingScene → Sun Beach** — verify explorable beach with turtles
12. **Sun Beach turtles** — walk near turtle NPCs, verify dialog
13. **Turtle Rescue** — play minigame, verify score, verify return to beach
14. **Sun Beach → Return to Car** — verify returns to DrivingScene
15. **DrivingScene → Go Back** — final return to Maui overworld

- [ ] **Step 2: Fix any issues found during testing**

If any transitions fail, positions are wrong, or textures are missing — fix them. Common issues:
- Decoration texture keys must match `deco-${type}` pattern
- NPC textures must be generated before scenes that use them
- Scene keys must match exactly between `scene.start()` calls and constructor keys
- Checkpoint zone positions must use `tileToWorld()` for consistency

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "fix: integration fixes for Maui expansion"
```

Only create this commit if there are actual fixes. If everything worked, skip.
