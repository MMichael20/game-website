# Budapest Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Budapest as a Gate 2 destination with an alive, bustling European city feel — airport arrivals, bus ride, city overworld with Danube/Parliament/Chain Bridge, Budapest Eye Ferris wheel sunset cutscene, Jewish Quarter sub-overworld with ruin bar interior, Airbnb apartment, and a transport hub.

**Architecture:** Hub-and-spoke, identical to Maui. 8 new scenes (3 OverworldScene, 3 InteriorScene, 2 custom Phaser.Scene cutscenes/menus), 2 texture files, 2 map data files, 2 layout files. All follow existing codebase patterns — no new base classes or systems. 54 NPCs, 10 vehicle tweens, ~70 textures.

**Tech Stack:** Phaser 3 (v3.90.0), TypeScript, Canvas 2D pixel art generation, existing OverworldScene/InteriorScene/NPCSystem/CheckpointZone patterns.

**Design doc:** `docs/plans/2026-03-18-budapest-expansion-design.md`

---

## Task Dependency Graph

```
Task 1 (Textures) ──────────────┐
Task 2 (Airport Integration) ───┤
Task 3 (Budapest Airport Scene) ┤── all independent, can parallelize
Task 4 (Bus Ride Scene) ────────┤
Task 5 (Budapest Map Data) ─────┤
Task 6 (Jewish Quarter Data) ───┤── depends on Task 5 (imports BudapestTileType)
Task 7 (Ruin Bar Layout) ───────┤
Task 8 (Airbnb Layout) ─────────┘
                                 │
Task 9 (Budapest Overworld) ─────┤── depends on Tasks 1, 5
Task 10 (Jewish Quarter Scene) ──┤── depends on Tasks 1, 6
Task 11 (Ruin Bar Scene) ────────┤── depends on Tasks 1, 7
Task 12 (Airbnb Scene) ──────────┤── depends on Tasks 1, 8
Task 13 (Budapest Eye Scene) ────┤── depends on Task 1
Task 14 (Transport Hub Scene) ───┘── depends on Task 1
                                 │
Task 15 (Scene Registration) ────┘── depends on all above
Task 16 (Smoke Test & Fix) ─────── depends on Task 15
```

---

### Task 1: Budapest Textures

**Files:**
- Create: `src/game/rendering/BudapestTextures.ts`
- Modify: `src/game/rendering/PixelArtGenerator.ts:1-10,2852-2870`

This is the largest single task (~2000-2500 lines). It generates ALL Budapest pixel art textures: terrain spritesheet, NPC sprites, vehicle sprites, building sprites, decoration sprites, and cutscene sprites.

- [ ] **Step 1: Create BudapestTextures.ts with helpers and terrain spritesheet**

Create `src/game/rendering/BudapestTextures.ts`. Copy the helper functions (`px`, `rect`, `circle`, `darken`, `lighten`, `seededRandom`, `drawNPCBase`) from `MauiTextures.ts` (lines 1-120).

Then implement the terrain spritesheet — a 320×32 canvas (`budapest-terrain`) with 10 tile frames at 32×32 each:

```typescript
// Frame 0: Cobblestone — gray-beige cobblestone pattern (European streets)
// Frame 1: Road — dark gray asphalt with subtle texture
// Frame 2: TramTrack — road with embedded metal rail lines (2px yellow rails)
// Frame 3: Sidewalk — light gray paved sidewalk
// Frame 4: Grass — green grass (parks, Danube bank)
// Frame 5: Water — dark blue Danube water with ripple pattern (darker than Maui ocean)
// Frame 6: Bridge — brown/gray stone bridge surface with railing marks
// Frame 7: Plaza — decorative stone tile pattern (Erzsébet Square, Parliament)
// Frame 8: ParkPath — gravel/packed earth path
// Frame 9: BudaCastle — elevated gray-brown stone (decorative, impassable)
```

Use the same `drawTerrainTile` pattern from `PixelArtGenerator.ts:62-99` but with Budapest-appropriate colors.

- [ ] **Step 2: Add NPC sprites (21 textures)**

Add NPC generation functions using the `drawNPCBase` helper (48×48 canvas per NPC). Each NPC is a standalone texture:

```typescript
// Hungarian locals (European casual clothing):
// 'npc-bp-local': male, brown hair, navy jacket, khaki pants
// 'npc-bp-local-2': female, blonde hair, red top, dark skirt
// Tourists:
// 'npc-bp-tourist': camera strap, backpack, cargo shorts
// 'npc-bp-tourist-2': sun hat, floral shirt, shorts
// Service workers:
// 'npc-bp-guide': clipboard, hat, vest
// 'npc-bp-vendor': apron, chef hat, white shirt
// 'npc-bp-vendor-2': green apron, flowers in hand
// 'npc-bp-conductor': blue uniform, cap
// 'npc-bp-police': dark uniform, belt, cap
// 'npc-bp-performer': beret, instrument on back
// 'npc-bp-bouncer': black shirt, broad shoulders
// 'npc-bp-bartender': vest, rolled sleeves
// 'npc-bp-artist': beret, paint-stained smock
// 'npc-bp-jogger': sportswear, headband
// 'npc-bp-couple': two-person sprite (arm in arm)
// 'npc-bp-elderly': older couple, coats
// Airport-specific:
// 'npc-bp-exchange-clerk': uniform behind counter
// 'npc-bp-ticket-clerk': blue vest, name badge
// 'npc-bp-info-desk': blazer, badge
// 'npc-bp-traveler': suitcase, casual clothes
// 'npc-bp-traveler-2': backpacker variant
```

- [ ] **Step 3: Add vehicle sprites (6 textures)**

Each vehicle is a single canvas texture:

```typescript
// 'budapest-tram': 64×24 — yellow tram, elongated, windows along top half, red trim at base
// 'budapest-bus': 48×24 — blue city bus, white stripe, windows
// 'budapest-car-blue': 32×16 — small European sedan, blue
// 'budapest-car-red': 32×16 — small European sedan, red
// 'budapest-car-white': 32×16 — small European sedan, white
// 'budapest-car-gray': 32×16 — small European sedan, gray
```

- [ ] **Step 4: Add building sprites (16 textures)**

Multi-tile building sprites:

```typescript
// 'building-parliament': 256×96 — neo-Gothic silhouette with central dome and spires
// 'building-fishermans-bastion': 256×96 — white turrets, fairytale castle outline
// 'building-buda-castle': 256×96 — castle silhouette on hill
// 'building-dohany-synagogue': 160×96 — ornate facade, two thin towers
// 'building-kazinczy-synagogue': 96×64 — art nouveau, blue accents
// 'building-bp-airbnb': 128×96 — apartment building, balconies
// 'building-bp-restaurant-1': 128×96 — "Goulash House" sign
// 'building-bp-restaurant-2': 128×96 — "Chimney Cake" sign
// 'building-budapest-eye': 96×96 — Ferris wheel structure (circle outline + spokes)
// 'building-bp-hotel': 128×96 — generic hotel facade
// 'building-ruin-bar-exterior': 128×96 — weathered brick, neon sign
// 'building-bp-shop-1' to 'building-bp-shop-4': 64×64 — various shopfronts
// 'building-bp-airport-terminal': 192×96 — modern glass terminal building
```

- [ ] **Step 5: Add decoration sprites (26 textures)**

32×32 unless noted:

```typescript
// 'deco-bp-bench', 'deco-bp-lamp', 'deco-bp-tree' (deciduous, not palm!),
// 'deco-bp-tree-autumn', 'deco-bp-bush', 'deco-bp-flower-bed',
// 'deco-bp-fountain' (48×48), 'deco-bp-statue' (32×64),
// 'deco-bp-cafe-table', 'deco-bp-string-lights' (64×8),
// 'deco-bp-mural' (64×64), 'deco-bp-mural-2' (64×64),
// 'deco-bp-flag-hungarian', 'deco-bp-flag-eu',
// 'deco-bp-pigeon' (16×16), 'deco-bp-luggage-carousel' (64×32),
// 'deco-bp-exchange-booth', 'deco-bp-bus-stop-sign',
// 'deco-bp-tram-stop', 'deco-bp-chain-bridge-pillar' (32×64),
// 'deco-bp-bathtub-couch', 'deco-bp-graffiti' (64×32),
// 'deco-bp-neon-sign', 'deco-bp-barrels',
// 'deco-bp-mismatched-chair', 'deco-bp-plants-hanging'
```

- [ ] **Step 6: Add cutscene sprites (6 textures)**

```typescript
// 'budapest-eye-wheel': 128×128 — large Ferris wheel (circle with spokes and cabins)
// 'budapest-eye-cabin': 16×16 — single cabin (small box with window)
// 'budapest-skyline': 800×200 — city silhouette (Parliament dome, Church spires, buildings)
// 'bp-bus-interior-frame': 800×600 — bus window frame overlay (dark frame with window cutout)
// 'bp-bus-building-1': 64×96 — suburban building for bus ride scrolling
// 'bp-bus-building-2': 64×128 — city building for bus ride scrolling
// 'bp-bus-building-3': 48×96 — apartment building variant
```

- [ ] **Step 7: Wire export function and register in PixelArtGenerator**

At the bottom of `BudapestTextures.ts`, export:
```typescript
export function generateBudapestTextures(scene: Phaser.Scene): void {
  generateBudapestTerrain(scene);
  generateBudapestNPCs(scene);
  generateBudapestVehicles(scene);
  generateBudapestBuildings(scene);
  generateBudapestDecorations(scene);
  generateBudapestCutsceneSprites(scene);
}
```

In `PixelArtGenerator.ts`:
- Add import at line 9: `import { generateBudapestTextures } from './BudapestTextures';`
- Add call at line 2869 (after `generateSunBeachTextures`): `generateBudapestTextures(scene);`

- [ ] **Step 8: Commit**

```bash
git add src/game/rendering/BudapestTextures.ts src/game/rendering/PixelArtGenerator.ts
git commit -m "feat(budapest): add all Budapest texture generation (~70 sprites)"
```

---

### Task 2: Airport Integration (Gate 2 + AirplaneCutscene)

**Files:**
- Modify: `src/game/scenes/airport/AirportInteriorScene.ts:91-101,431-452,462-467`
- Modify: `src/game/scenes/airport/AirplaneCutscene.ts:12,18,520-528`

- [ ] **Step 1: Widen AirplaneCutscene destination type and add switch**

In `AirplaneCutscene.ts`:

Line 12, change:
```typescript
private destination: 'maui' | 'home' = 'maui';
```
to:
```typescript
private destination: 'maui' | 'budapest' | 'home' = 'maui';
```

Line 18, change:
```typescript
init(data: { destination: 'maui' | 'home' }) {
```
to:
```typescript
init(data: { destination: 'maui' | 'budapest' | 'home' }) {
```

Lines 520-528, replace `transitionToDestination()` with:
```typescript
private transitionToDestination() {
  switch (this.destination) {
    case 'maui':
      saveCurrentScene('MauiOverworldScene');
      this.scene.start('MauiOverworldScene');
      break;
    case 'budapest':
      saveCurrentScene('BudapestAirportScene');
      this.scene.start('BudapestAirportScene');
      break;
    case 'home':
    default:
      saveCurrentScene('WorldScene');
      this.scene.start('WorldScene');
      break;
  }
}
```

- [ ] **Step 2: Update Gate 2 sign in AirportInteriorScene**

In `AirportInteriorScene.ts` line 99, change:
```typescript
{ id: 'sign-gate-2', tileX: 68, tileY: 11, texture: 'sign-gate-number', tooltipText: 'Gate 2 \u2014 Coming Soon' },
```
to:
```typescript
{ id: 'sign-gate-2', tileX: 68, tileY: 11, texture: 'sign-gate-number', tooltipText: 'Gate 2 \u2014 Budapest' },
```

- [ ] **Step 3: Decouple auto-boarding from station completion**

In `AirportInteriorScene.ts`, remove the auto-boarding trigger at lines 431-434:
```typescript
    // After final station, trigger boarding
    if (this.currentStation >= STATIONS.length) {
      this.startBoarding();
    }
```
Replace with nothing (just remove those 4 lines).

- [ ] **Step 4: Add gate proximity boarding triggers in update()**

In `AirportInteriorScene.ts`, after the station trigger check block (line 467), add gate boarding logic:

```typescript
    // Gate boarding — only after all stations are complete
    if (!this.sequenceActive && this.currentStation >= STATIONS.length && !this.boardingTriggered) {
      // Gate 1 — Maui (tile 76, 12)
      if (playerTile.x >= 75 && playerTile.x <= 77 && playerTile.y >= 11 && playerTile.y <= 13) {
        this.startBoarding('maui');
      }
      // Gate 2 — Budapest (tile 68, 12)
      if (playerTile.x >= 67 && playerTile.x <= 69 && playerTile.y >= 11 && playerTile.y <= 13) {
        this.startBoarding('budapest');
      }
    }
```

- [ ] **Step 5: Modify startBoarding() to accept destination parameter**

Change the `startBoarding()` method at lines 437-452:

```typescript
  private startBoarding(destination: 'maui' | 'budapest'): void {
    if (this.boardingTriggered) return;
    this.boardingTriggered = true;

    uiManager.hideInteractionPrompt();
    const cam = this.cameras.main;
    this.tweens.add({
      targets: cam,
      alpha: 0,
      duration: 500,
      ease: 'Linear',
      onComplete: () => {
        this.scene.start('AirplaneCutscene', { destination });
      },
    });
  }
```

- [ ] **Step 6: Commit**

```bash
git add src/game/scenes/airport/AirportInteriorScene.ts src/game/scenes/airport/AirplaneCutscene.ts
git commit -m "feat(budapest): wire Gate 2 to Budapest, add destination routing"
```

---

### Task 3: Budapest Airport Scene (Arrivals Hall)

**Files:**
- Create: `src/game/scenes/budapest/budapestAirportLayout.ts`
- Create: `src/game/scenes/budapest/BudapestAirportScene.ts`

- [ ] **Step 1: Create the airport interior layout**

Create `src/game/scenes/budapest/budapestAirportLayout.ts`:

```typescript
import { InteriorLayout, buildWallGrid } from '../../data/interiorLayouts';

const W = 40;
const H = 14;

// Rooms: main hall (rows 3-10), exit corridor (rows 11-12)
const rooms = [
  { x: 1, y: 3, w: 38, h: 8 },   // Main arrivals hall
  { x: 15, y: 11, w: 10, h: 2 },  // Exit corridor
];

const doorways = [
  { x: 15, y: 11, width: 10, height: 1 }, // Hall to corridor
];

export const BUDAPEST_AIRPORT_LAYOUT: InteriorLayout = {
  id: 'budapest-airport',
  widthInTiles: W,
  heightInTiles: H,
  wallGrid: buildWallGrid(W, H, rooms, doorways),
  floors: [
    { tileX: 1, tileY: 3, width: 38, height: 8, floorType: 'tile_floor' },
    { tileX: 15, tileY: 11, width: 10, height: 2, floorType: 'tile_floor' },
  ],
  decorations: [
    // Luggage carousels (decorative)
    { tileX: 10, tileY: 4, type: 'bp-luggage-carousel' },
    { tileX: 26, tileY: 4, type: 'bp-luggage-carousel' },
    // Money exchange booth
    { tileX: 6, tileY: 7, type: 'bp-exchange-booth' },
    // Bus stop sign near exit
    { tileX: 20, tileY: 11, type: 'bp-bus-stop-sign' },
  ],
  entrance: { tileX: 20, tileY: 5 },
  exit: {
    tileX: 15, tileY: 13, width: 10, height: 1,
    promptText: 'Take Bus 100E to the city',
  },
  exitDoorStyle: 'glass',
  // No previousScene — exitToOverworld() is overridden in BudapestAirportScene
  // to go forward to BudapestBusRideScene instead of back to WorldScene
};
```

- [ ] **Step 2: Create BudapestAirportScene**

Create `src/game/scenes/budapest/BudapestAirportScene.ts`:

```typescript
import { InteriorScene } from '../InteriorScene';
import { InteriorLayout } from '../../data/interiorLayouts';
import { BUDAPEST_AIRPORT_LAYOUT } from './budapestAirportLayout';
import { NPCSystem } from '../../systems/NPCSystem';
import { NPCDef } from '../../data/mapLayout';
import { uiManager } from '../../../ui/UIManager';
import { saveCurrentScene } from '../../systems/SaveSystem';

const AIRPORT_NPCS: NPCDef[] = [
  {
    id: 'bp-airport-exchange', tileX: 6, tileY: 8, behavior: 'idle',
    texture: 'npc-bp-exchange-clerk', interactable: true, onInteract: 'dialog',
    facingDirection: 'down',
    interactionData: { lines: [
      'Welcome to Budapest!',
      'The Hungarian Forint is the local currency. 1 USD ≈ 360 HUF.',
      'Here you go! You\'re all set for the city.',
    ] },
  },
  {
    id: 'bp-airport-bus-ticket', tileX: 16, tileY: 8, behavior: 'idle',
    texture: 'npc-bp-ticket-clerk', interactable: true, onInteract: 'dialog',
    facingDirection: 'down',
    interactionData: { lines: [
      'Bus 100E goes straight to the city center!',
      'The ride takes about 40 minutes.',
      'Here\'s your ticket. Head to the exit for the bus stop!',
    ] },
  },
  {
    id: 'bp-airport-info', tileX: 32, tileY: 8, behavior: 'idle',
    texture: 'npc-bp-info-desk', interactable: true, onInteract: 'dialog',
    facingDirection: 'down',
    interactionData: { lines: [
      'Welcome to Budapest Ferenc Liszt Airport!',
      'Don\'t miss the Jewish Quarter and the Budapest Eye!',
      'Enjoy your stay!',
    ] },
  },
  { id: 'bp-airport-traveler-1', tileX: 10, tileY: 9, behavior: 'walk', texture: 'npc-bp-traveler',
    walkPath: [{ x: 10, y: 9 }, { x: 20, y: 9 }] },
  { id: 'bp-airport-traveler-2', tileX: 25, tileY: 8, behavior: 'walk', texture: 'npc-bp-traveler-2',
    walkPath: [{ x: 25, y: 8 }, { x: 35, y: 8 }] },
  { id: 'bp-airport-traveler-3', tileX: 20, tileY: 10, behavior: 'idle', texture: 'npc-bp-traveler' },
  { id: 'bp-airport-luggage-1', tileX: 12, tileY: 5, behavior: 'idle', texture: 'npc-bp-traveler-2' },
  { id: 'bp-airport-luggage-2', tileX: 26, tileY: 5, behavior: 'sit', texture: 'npc-bp-traveler' },
];

export class BudapestAirportScene extends InteriorScene {
  private npcSystem!: NPCSystem;

  constructor() {
    super({ key: 'BudapestAirportScene' });
  }

  getLayout(): InteriorLayout {
    return BUDAPEST_AIRPORT_LAYOUT;
  }

  create(): void {
    super.create();
    saveCurrentScene('BudapestAirportScene');

    this.npcSystem = new NPCSystem();
    this.npcSystem.create(this, AIRPORT_NPCS);

    this.npcSystem.onDwellTrigger = (npc) => {
      if (!npc.interactionData?.lines) return;
      this.inputSystem.freeze();
      uiManager.showNPCDialog(npc.interactionData.lines, () => {
        uiManager.hideNPCDialog();
        this.inputSystem.unfreeze();
        this.npcSystem.onDialogueEnd(npc.id);
      });
    };
  }

  // Override: exit goes to bus ride, not WorldScene
  protected exitToOverworld(): void {
    uiManager.hideInteractionPrompt();
    const cam = this.cameras.main;
    this.tweens.add({
      targets: cam, alpha: 0, duration: 300, ease: 'Linear',
      onComplete: () => {
        this.scene.start('BudapestBusRideScene');
      },
    });
  }

  update(time: number, delta: number): void {
    super.update(time, delta);
    const pos = this.player.getPosition();
    this.npcSystem.update(delta, pos.x, pos.y, this.inputSystem.isFrozen);
  }

  shutdown(): void {
    super.shutdown();
    this.npcSystem?.destroy();
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/game/scenes/budapest/budapestAirportLayout.ts src/game/scenes/budapest/BudapestAirportScene.ts
git commit -m "feat(budapest): add Budapest airport arrivals scene"
```

---

### Task 4: Bus Ride Cutscene

**Files:**
- Create: `src/game/scenes/budapest/BudapestBusRideScene.ts`

- [ ] **Step 1: Create the bus ride cutscene**

Follow the `HanaDrivingScene` pattern. Create `src/game/scenes/budapest/BudapestBusRideScene.ts`:

```typescript
import Phaser from 'phaser';

export class BudapestBusRideScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BudapestBusRideScene' });
  }

  create() {
    const { width, height } = this.scale;

    // Background — starts green (suburban), shifts to gray-blue (urban)
    const bg = this.add.rectangle(width / 2, height / 2, width, height, 0x6a9a4e);

    // Road (horizontal, bus goes right-to-left view)
    const roadW = 100;
    this.add.rectangle(width / 2, height * 0.7, width, roadW, 0x555555).setDepth(1);

    // Road edges
    this.add.rectangle(width / 2, height * 0.7 - roadW / 2, width, 4, 0x888888).setDepth(2);
    this.add.rectangle(width / 2, height * 0.7 + roadW / 2, width, 4, 0x888888).setDepth(2);

    // Scrolling center dashes
    const lines: Phaser.GameObjects.Rectangle[] = [];
    for (let x = -30; x < width + 60; x += 40) {
      lines.push(this.add.rectangle(x, height * 0.7, 20, 4, 0xffcc00).setDepth(2));
    }
    this.tweens.add({ targets: lines, x: '-=40', duration: 400, ease: 'Linear', repeat: -1 });

    // Bus window frame overlay (if texture exists, otherwise simple frame)
    const frame = this.add.rectangle(width / 2, height / 2, width, height, 0x333333)
      .setDepth(20).setAlpha(0);
    // Window cutout effect: just darken edges
    const topBar = this.add.rectangle(width / 2, 25, width, 50, 0x444444).setDepth(15);
    const bottomBar = this.add.rectangle(width / 2, height - 25, width, 50, 0x444444).setDepth(15);
    const leftBar = this.add.rectangle(25, height / 2, 50, height, 0x444444).setDepth(15);
    const rightBar = this.add.rectangle(width - 25, height / 2, 50, height, 0x444444).setDepth(15);

    // Scrolling buildings on both sides
    const buildings: Phaser.GameObjects.Image[] = [];
    const buildingKeys = ['bp-bus-building-1', 'bp-bus-building-2', 'bp-bus-building-3'];
    for (let i = 0; i < 12; i++) {
      const key = buildingKeys[i % buildingKeys.length];
      const x = width + 100 + i * 120;
      const y = height * 0.7 - roadW / 2 - 60;
      const b = this.add.image(x, y, key).setDepth(3);
      buildings.push(b);
    }

    // Scroll buildings left
    this.tweens.add({
      targets: buildings,
      x: `-=${width + 1600}`,
      duration: 10000,
      ease: 'Linear',
    });

    // Phase transitions — background color shift
    // Phase 1 (0-3s): suburban green
    // Phase 2 (3-6s): transition
    this.time.delayedCall(3000, () => {
      this.tweens.add({ targets: bg, fillColor: 0x7a8a8e, duration: 3000 });
    });
    // Phase 3 (6-9s): city gray-blue
    this.time.delayedCall(6000, () => {
      this.tweens.add({ targets: bg, fillColor: 0x5a7a8e, duration: 2000 });
    });

    // "Budapest" text appears near end
    this.time.delayedCall(7000, () => {
      const text = this.add.text(width / 2, height * 0.3, 'Arriving in Budapest...', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '14px',
        color: '#ffffff',
      }).setOrigin(0.5).setDepth(25).setAlpha(0);
      this.tweens.add({ targets: text, alpha: 1, duration: 1000 });
    });

    // Phase 4 (9-10s): fade to overworld
    this.time.delayedCall(9500, () => {
      this.cameras.main.fadeOut(500, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('BudapestOverworldScene');
      });
    });

    // Skip button
    const skipBtn = document.createElement('div');
    skipBtn.className = 'skip-cutscene';
    skipBtn.textContent = 'Skip ▶▶';
    document.getElementById('ui-layer')!.appendChild(skipBtn);

    skipBtn.addEventListener('click', () => {
      skipBtn.remove();
      this.tweens.killAll();
      this.time.removeAllEvents();
      this.cameras.main.fadeOut(300, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('BudapestOverworldScene');
      });
    });

    this.events.once('shutdown', () => { skipBtn.remove(); });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/game/scenes/budapest/BudapestBusRideScene.ts
git commit -m "feat(budapest): add bus ride cutscene from airport to city"
```

---

### Task 5: Budapest Overworld Map Data

**Files:**
- Create: `src/game/scenes/budapest/budapestMap.ts`

- [ ] **Step 1: Create budapestMap.ts with tile types, grid, walkability, NPCs, checkpoints, decorations, buildings**

Follow the exact pattern of `mauiMap.ts`. Create `src/game/scenes/budapest/budapestMap.ts`:

```typescript
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
```

Then implement the full tile grid (55×35), walk grid, NPCs (25), checkpoint zones (10), decorations, and buildings arrays as specified in the design doc sections 5.4 and 5.10-5.12.

**Key layout:**
- Y=0-9: Buda side (castle hill, Fisherman's Bastion) — mostly impassable decorative
- Y=10-12: Danube River (Water tiles, impassable) with Chain Bridge at x=22-26
- Y=13-15: Pest riverside — Parliament at x=10-18
- Y=16-18: Major road with tram tracks at y=17, tram stops at x=12 and x=40
- Y=19-23: Central Pest — Erzsébet Square (Budapest Eye) at x=24-30
- Y=24-27: Jewish Quarter entrance zone, Synagogue facade
- Y=28-30: Southern streets — Airbnb, restaurants
- Y=31-34: Southern boundary, transport hub

**25 NPCs** as specified in design doc section 5.10 (BudapestOverworldScene table).

**10 Checkpoint zones** as specified in design doc section 5.11. Remember: `centerX`/`centerY` must be **world pixels** using `tileToWorld()`.

- [ ] **Step 2: Commit**

```bash
git add src/game/scenes/budapest/budapestMap.ts
git commit -m "feat(budapest): add Budapest overworld map data (55x35, 25 NPCs, 10 checkpoints)"
```

---

### Task 6: Jewish Quarter Map Data

**Files:**
- Create: `src/game/scenes/budapest/jewishQuarterMap.ts`

- [ ] **Step 1: Create jewishQuarterMap.ts**

Same pattern as `budapestMap.ts` but for the 30×25 Jewish Quarter sub-overworld. Uses the same `BudapestTileType` enum (import from budapestMap).

**Key layout:**
- Y=0-2: Northern boundary (building facades)
- Y=3-6: Dohány Synagogue area + plaza
- Y=7-9: Kazinczy Street (narrow, 2-tile wide)
- Y=10-14: Ruin Bar District (Szimpla Kert entrance checkpoint)
- Y=15-18: Side streets with restaurants, outdoor seating
- Y=19-22: Southern residential streets
- Y=23-24: Exit zone + tram stop

**15 NPCs** as specified in design doc section 5.10 (JewishQuarterScene table).

**4 Checkpoint zones** (ruin bar, synagogue, exit, tram stop) as in design doc section 5.11.

- [ ] **Step 2: Commit**

```bash
git add src/game/scenes/budapest/jewishQuarterMap.ts
git commit -m "feat(budapest): add Jewish Quarter map data (30x25, 15 NPCs)"
```

---

### Task 7: Ruin Bar Interior Layout

**Files:**
- Create: `src/game/scenes/budapest/ruinBarLayout.ts`

- [ ] **Step 1: Create ruinBarLayout.ts**

Follow the `interiorLayouts.ts` `InteriorLayout` interface:

```typescript
import { InteriorLayout, buildWallGrid } from '../../data/interiorLayouts';

const W = 20;
const H = 16;

const rooms = [
  { x: 2, y: 2, w: 6, h: 5 },    // Bar area
  { x: 10, y: 2, w: 8, h: 7 },   // Seating area
  { x: 4, y: 9, w: 7, h: 5 },    // Dance floor
  { x: 12, y: 9, w: 7, h: 6 },   // Back garden
];

const doorways = [
  { x: 8, y: 4, width: 2, height: 1 },  // Bar to seating
  { x: 6, y: 7, width: 2, height: 1 },  // Bar to dance
  { x: 11, y: 9, width: 1, height: 2 },  // Seating to garden
  { x: 10, y: 12, width: 2, height: 1 }, // Dance to garden
];

export const RUIN_BAR_LAYOUT: InteriorLayout = {
  id: 'ruin-bar',
  widthInTiles: W,
  heightInTiles: H,
  wallGrid: buildWallGrid(W, H, rooms, doorways),
  floors: [
    { tileX: 2, tileY: 2, width: 6, height: 5, floorType: 'wood' },
    { tileX: 10, tileY: 2, width: 8, height: 7, floorType: 'wood' },
    { tileX: 4, tileY: 9, width: 7, height: 5, floorType: 'tile_floor' },
    { tileX: 12, tileY: 9, width: 7, height: 6, floorType: 'wood' },
  ],
  decorations: [
    { tileX: 3, tileY: 3, type: 'bp-barrels' },
    { tileX: 13, tileY: 3, type: 'bp-bathtub-couch' },
    { tileX: 15, tileY: 5, type: 'bp-mismatched-chair' },
    { tileX: 6, tileY: 10, type: 'bp-string-lights' },
    { tileX: 14, tileY: 10, type: 'bp-plants-hanging' },
    { tileX: 16, tileY: 12, type: 'bp-graffiti' },
    { tileX: 4, tileY: 12, type: 'bp-neon-sign' },
  ],
  entrance: { tileX: 10, tileY: 14 },
  exit: {
    tileX: 9, tileY: 15, width: 3, height: 1,
    promptText: 'Leave Szimpla Kert',
  },
  exitDoorStyle: 'wooden',
  // No previousScene — exitToOverworld() is overridden in RuinBarScene
};
```

- [ ] **Step 2: Commit**

```bash
git add src/game/scenes/budapest/ruinBarLayout.ts
git commit -m "feat(budapest): add Ruin Bar interior layout"
```

---

### Task 8: Budapest Airbnb Interior Layout

**Files:**
- Create: `src/game/scenes/budapest/budapestAirbnbLayout.ts`

- [ ] **Step 1: Create budapestAirbnbLayout.ts**

```typescript
import { InteriorLayout, buildWallGrid } from '../../data/interiorLayouts';

const W = 16;
const H = 12;

const rooms = [
  { x: 2, y: 2, w: 6, h: 5 },    // Living room
  { x: 10, y: 2, w: 4, h: 4 },   // Kitchen
  { x: 2, y: 7, w: 6, h: 4 },    // Bedroom
  { x: 10, y: 7, w: 4, h: 4 },   // Bathroom
];

const doorways = [
  { x: 8, y: 3, width: 2, height: 1 },  // Living to kitchen
  { x: 5, y: 7, width: 2, height: 1 },  // Living to bedroom
  { x: 10, y: 6, width: 1, height: 1 }, // Kitchen to bathroom
];

export const BUDAPEST_AIRBNB_LAYOUT: InteriorLayout = {
  id: 'budapest-airbnb',
  widthInTiles: W,
  heightInTiles: H,
  wallGrid: buildWallGrid(W, H, rooms, doorways),
  floors: [
    { tileX: 2, tileY: 2, width: 6, height: 5, floorType: 'wood' },
    { tileX: 10, tileY: 2, width: 4, height: 4, floorType: 'tile_floor' },
    { tileX: 2, tileY: 7, width: 6, height: 4, floorType: 'carpet' },
    { tileX: 10, tileY: 7, width: 4, height: 4, floorType: 'tile_floor' },
  ],
  decorations: [
    // Living room
    { tileX: 3, tileY: 3, type: 'couch' },
    { tileX: 5, tileY: 4, type: 'coffee-table' },
    { tileX: 7, tileY: 3, type: 'bookshelf' },
    // Kitchen
    { tileX: 11, tileY: 3, type: 'stove' },
    { tileX: 13, tileY: 3, type: 'fridge' },
    // Bedroom
    { tileX: 3, tileY: 8, type: 'bed' },
    { tileX: 6, tileY: 8, type: 'wardrobe' },
  ],
  entrance: { tileX: 8, tileY: 10 },
  exit: {
    tileX: 7, tileY: 11, width: 3, height: 1,
    promptText: 'Leave Apartment',
  },
  exitDoorStyle: 'wooden',
  // No previousScene — exitToOverworld() is overridden in BudapestAirbnbScene
};
```

- [ ] **Step 2: Commit**

```bash
git add src/game/scenes/budapest/budapestAirbnbLayout.ts
git commit -m "feat(budapest): add Budapest Airbnb apartment layout"
```

---

### Task 9: Budapest Overworld Scene

**Files:**
- Create: `src/game/scenes/budapest/BudapestOverworldScene.ts`

Depends on: Task 1 (textures), Task 5 (map data)

- [ ] **Step 1: Create BudapestOverworldScene**

Follow `MauiOverworldScene.ts` exactly. Create `src/game/scenes/budapest/BudapestOverworldScene.ts`:

```typescript
import { OverworldScene, OverworldConfig } from '../OverworldScene';
import { TILE_SIZE } from '../../../utils/constants';
import { tileToWorld, CheckpointZone } from '../../data/mapLayout';
import { saveCurrentScene } from '../../systems/SaveSystem';
import { uiManager } from '../../../ui/UIManager';
import { WaterEffectSystem } from '../../systems/WaterEffectSystem';
import {
  BUDAPEST_WIDTH, BUDAPEST_HEIGHT, budapestTileGrid, isBudapestWalkable,
  BUDAPEST_NPCS, BUDAPEST_CHECKPOINT_ZONES, BUDAPEST_DECORATIONS, BUDAPEST_BUILDINGS,
  getBudapestTileType, BudapestTileType,
} from './budapestMap';

export class BudapestOverworldScene extends OverworldScene {
  private waterSystem!: WaterEffectSystem;

  constructor() {
    super({ key: 'BudapestOverworldScene' });
  }

  getConfig(): OverworldConfig {
    return {
      mapWidth: BUDAPEST_WIDTH,
      mapHeight: BUDAPEST_HEIGHT,
      tileGrid: budapestTileGrid,
      walkCheck: isBudapestWalkable,
      npcs: BUDAPEST_NPCS,
      checkpointZones: BUDAPEST_CHECKPOINT_ZONES,
      spawnX: 27 * TILE_SIZE + TILE_SIZE / 2,  // Center of city
      spawnY: 19 * TILE_SIZE + TILE_SIZE / 2,
      terrainTextureKey: 'budapest-terrain',
    };
  }

  getLabelMap(): Record<string, string> {
    return {
      bp_eye: 'Budapest Eye',
      bp_airbnb: 'Airbnb',
      bp_jewish_quarter: 'Jewish Quarter',
      bp_tram_stop_north: 'Tram Stop',
      bp_tram_stop_south: 'Tram Stop',
      bp_restaurant_1: 'Goulash House',
      bp_restaurant_2: 'Chimney Cake',
      bp_parliament: 'Parliament',
      bp_chain_bridge: 'Chain Bridge',
      bp_fishermans_bastion: 'Fisherman\'s Bastion',
    };
  }

  create(): void {
    super.create();
    saveCurrentScene('BudapestOverworldScene');
  }

  onCreateExtras(): void {
    // Decorations
    BUDAPEST_DECORATIONS.forEach(deco => {
      const pos = tileToWorld(deco.tileX, deco.tileY);
      this.add.image(pos.x, pos.y, `deco-${deco.type}`).setDepth(-10);
    });

    // Buildings
    BUDAPEST_BUILDINGS.forEach(b => {
      const cx = b.tileX * TILE_SIZE + (b.tileW * TILE_SIZE) / 2;
      const cy = b.tileY * TILE_SIZE + (b.tileH * TILE_SIZE) / 2;
      this.add.image(cx, cy, `building-${b.name}`).setDepth(-5);
    });

    // Danube water effects
    this.waterSystem = new WaterEffectSystem(this, {
      getTileType: getBudapestTileType,
      waterTileValue: BudapestTileType.Water,
      wadingSpeed: 0.8,
      swimmingSpeed: 0.55,
      isDeepWater: () => true,  // All Danube is deep
    });
    this.waterSystem.create();

    // Wave animations on Danube
    this.addDanubeWaves();

    // Vehicles (10 total: 2 trams, 2 buses, 6 cars)
    this.addVehicles();

    // Pigeon animations in Erzsébet Square
    this.addPigeons();
  }

  private addDanubeWaves(): void {
    const waveYs = [10, 11, 12];
    for (const wy of waveYs) {
      for (let wx = 0; wx < BUDAPEST_WIDTH; wx += 8) {
        const pos = tileToWorld(wx, wy);
        const wave = this.add.image(pos.x, pos.y, 'deco-wave-foam')
          .setDepth(-8).setAlpha(0.4);
        this.tweens.add({
          targets: wave, x: pos.x + 12, alpha: 0.15,
          duration: 2500 + Math.random() * 500,
          ease: 'Sine.easeInOut', repeat: -1, yoyo: true,
          delay: Math.random() * 1000,
        });
      }
    }
  }

  private addVehicles(): void {
    const mapPxWidth = BUDAPEST_WIDTH * TILE_SIZE;

    const vehicleDefs = [
      // Trams (y=17, tram track row)
      { key: 'budapest-tram', y: 17, direction: 1, delay: 0, duration: 20000 },
      { key: 'budapest-tram', y: 17, direction: -1, delay: 10000, duration: 22000 },
      // Buses (y=16, 18)
      { key: 'budapest-bus', y: 16, direction: 1, delay: 5000, duration: 15000 },
      { key: 'budapest-bus', y: 18, direction: -1, delay: 12000, duration: 18000 },
      // Cars
      { key: 'budapest-car-blue', y: 16, direction: 1, delay: 0, duration: 12000 },
      { key: 'budapest-car-red', y: 18, direction: -1, delay: 3000, duration: 10000 },
      { key: 'budapest-car-white', y: 16, direction: 1, delay: 7000, duration: 11000 },
      { key: 'budapest-car-gray', y: 18, direction: -1, delay: 9000, duration: 13000 },
      // Riverside cars
      { key: 'budapest-car-red', y: 14, direction: 1, delay: 2000, duration: 14000 },
      { key: 'budapest-car-blue', y: 14, direction: -1, delay: 8000, duration: 16000 },
    ];

    vehicleDefs.forEach(def => {
      const worldY = def.y * TILE_SIZE + TILE_SIZE / 2;
      const startX = def.direction > 0 ? -80 : mapPxWidth + 80;
      const endX = def.direction > 0 ? mapPxWidth + 80 : -80;
      const vehicle = this.add.sprite(startX, worldY, def.key).setDepth(-3);
      if (def.direction < 0) vehicle.setFlipX(true);

      this.time.delayedCall(def.delay, () => {
        this.tweens.add({
          targets: vehicle, x: endX,
          duration: def.duration, ease: 'Linear',
          repeat: -1, onRepeat: () => { vehicle.x = startX; },
        });
      });
    });
  }

  private addPigeons(): void {
    // Small pigeon sprites in Erzsébet Square area
    for (let i = 0; i < 5; i++) {
      const px = (25 + Math.random() * 4) * TILE_SIZE;
      const py = (20 + Math.random() * 2) * TILE_SIZE;
      const pigeon = this.add.image(px, py, 'deco-bp-pigeon').setDepth(-6).setAlpha(0.8);

      // Random flutter movement
      this.tweens.add({
        targets: pigeon,
        x: px + (Math.random() - 0.5) * 64,
        y: py + (Math.random() - 0.5) * 32,
        duration: 3000 + Math.random() * 2000,
        ease: 'Sine.easeInOut', repeat: -1, yoyo: true,
        delay: Math.random() * 2000,
      });
    }
  }

  onEnterCheckpoint(zone: CheckpointZone): void {
    const pos = this.player.getPosition();
    switch (zone.id) {
      case 'bp_eye':
        this.fadeToScene('BudapestEyeScene');
        break;
      case 'bp_airbnb':
        this.fadeToScene('BudapestAirbnbScene', { returnX: pos.x, returnY: pos.y });
        break;
      case 'bp_jewish_quarter':
        this.fadeToScene('JewishQuarterScene');
        break;
      case 'bp_tram_stop_north':
      case 'bp_tram_stop_south':
        this.fadeToScene('BudapestTransportScene', { returnX: pos.x, returnY: pos.y });
        break;
      case 'bp_restaurant_1':
        this.inputSystem.freeze();
        uiManager.showNPCDialog([
          'Welcome to Goulash House!',
          'Try our famous Hungarian goulash!',
          'The lángos with sour cream is incredible today.',
        ], () => { uiManager.hideNPCDialog(); this.inputSystem.unfreeze(); });
        break;
      case 'bp_restaurant_2':
        this.inputSystem.freeze();
        uiManager.showNPCDialog([
          'Budapest\'s best chimney cake shop!',
          'Cinnamon, chocolate, or walnut?',
          'Fresh off the spit — enjoy!',
        ], () => { uiManager.hideNPCDialog(); this.inputSystem.unfreeze(); });
        break;
      case 'bp_parliament':
        this.inputSystem.freeze();
        uiManager.showNPCDialog([
          'The Hungarian Parliament Building.',
          'Neo-Gothic masterpiece, completed in 1904.',
          'It houses the Holy Crown of Hungary.',
        ], () => { uiManager.hideNPCDialog(); this.inputSystem.unfreeze(); });
        break;
      case 'bp_chain_bridge':
        this.inputSystem.freeze();
        uiManager.showNPCDialog([
          'The Széchenyi Chain Bridge.',
          'First permanent bridge across the Danube, built in 1849.',
          'It connects Buda and Pest — two cities that became one.',
        ], () => { uiManager.hideNPCDialog(); this.inputSystem.unfreeze(); });
        break;
      case 'bp_fishermans_bastion':
        this.inputSystem.freeze();
        uiManager.showNPCDialog([
          'Fisherman\'s Bastion.',
          'Seven towers for the seven Magyar chieftains who founded Hungary.',
          'The view from here is breathtaking!',
        ], () => { uiManager.hideNPCDialog(); this.inputSystem.unfreeze(); });
        break;
    }
  }

  update(time: number, delta: number): void {
    super.update(time, delta);
    this.waterSystem.update(this.player, this.partner);
  }

  shutdown(): void {
    this.waterSystem?.shutdown(this.player, this.partner);
    super.shutdown();
  }

  protected onBack(): void {
    // No-op
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/game/scenes/budapest/BudapestOverworldScene.ts
git commit -m "feat(budapest): add Budapest overworld scene (55x35, vehicles, Danube, pigeons)"
```

---

### Task 10: Jewish Quarter Scene

**Files:**
- Create: `src/game/scenes/budapest/JewishQuarterScene.ts`

Depends on: Task 1, Task 6

- [ ] **Step 1: Create JewishQuarterScene**

Follow `MauiOverworldScene` pattern but for the dense 30×25 sub-overworld:

```typescript
import { OverworldScene, OverworldConfig } from '../OverworldScene';
import { TILE_SIZE } from '../../../utils/constants';
import { tileToWorld, CheckpointZone } from '../../data/mapLayout';
import { saveCurrentScene } from '../../systems/SaveSystem';
import { uiManager } from '../../../ui/UIManager';
import {
  JQ_WIDTH, JQ_HEIGHT, jqTileGrid, isJQWalkable,
  JQ_NPCS, JQ_CHECKPOINT_ZONES, JQ_DECORATIONS, JQ_BUILDINGS,
} from './jewishQuarterMap';

export class JewishQuarterScene extends OverworldScene {
  constructor() {
    super({ key: 'JewishQuarterScene' });
  }

  getConfig(): OverworldConfig {
    return {
      mapWidth: JQ_WIDTH,
      mapHeight: JQ_HEIGHT,
      tileGrid: jqTileGrid,
      walkCheck: isJQWalkable,
      npcs: JQ_NPCS,
      checkpointZones: JQ_CHECKPOINT_ZONES,
      spawnX: 15 * TILE_SIZE + TILE_SIZE / 2,
      spawnY: 23 * TILE_SIZE + TILE_SIZE / 2,
      terrainTextureKey: 'budapest-terrain',  // Reuses Budapest terrain
    };
  }

  getLabelMap(): Record<string, string> {
    return {
      jq_ruin_bar: 'Szimpla Kert',
      jq_synagogue: 'Dohány Synagogue',
      jq_exit: 'Exit',
      jq_tram_stop: 'Tram Stop',
    };
  }

  create(): void {
    super.create();
    saveCurrentScene('JewishQuarterScene');
  }

  onCreateExtras(): void {
    JQ_DECORATIONS.forEach(deco => {
      const pos = tileToWorld(deco.tileX, deco.tileY);
      this.add.image(pos.x, pos.y, `deco-${deco.type}`).setDepth(-10);
    });

    JQ_BUILDINGS.forEach(b => {
      const cx = b.tileX * TILE_SIZE + (b.tileW * TILE_SIZE) / 2;
      const cy = b.tileY * TILE_SIZE + (b.tileH * TILE_SIZE) / 2;
      this.add.image(cx, cy, `building-${b.name}`).setDepth(-5);
    });
  }

  onEnterCheckpoint(zone: CheckpointZone): void {
    const pos = this.player.getPosition();
    switch (zone.id) {
      case 'jq_ruin_bar':
        this.fadeToScene('RuinBarScene', { returnX: pos.x, returnY: pos.y });
        break;
      case 'jq_synagogue':
        this.inputSystem.freeze();
        uiManager.showNPCDialog([
          'The Dohány Street Synagogue.',
          'The largest synagogue in Europe!',
          'Built in the 1850s in Moorish Revival style.',
        ], () => { uiManager.hideNPCDialog(); this.inputSystem.unfreeze(); });
        break;
      case 'jq_exit':
        this.fadeToScene('BudapestOverworldScene', { returnFromInterior: true, returnX: 42 * TILE_SIZE, returnY: 25 * TILE_SIZE });
        break;
      case 'jq_tram_stop':
        this.fadeToScene('BudapestTransportScene', { returnX: pos.x, returnY: pos.y });
        break;
    }
  }

  shutdown(): void {
    super.shutdown();
  }

  protected onBack(): void {
    // No-op
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/game/scenes/budapest/JewishQuarterScene.ts
git commit -m "feat(budapest): add Jewish Quarter scene (30x25, 15 NPCs, dense streets)"
```

---

### Task 11: Ruin Bar Scene

**Files:**
- Create: `src/game/scenes/budapest/RuinBarScene.ts`

Depends on: Task 1, Task 7

- [ ] **Step 1: Create RuinBarScene**

```typescript
import { InteriorScene } from '../InteriorScene';
import { InteriorLayout } from '../../data/interiorLayouts';
import { RUIN_BAR_LAYOUT } from './ruinBarLayout';
import { NPCSystem } from '../../systems/NPCSystem';
import { NPCDef } from '../../data/mapLayout';
import { uiManager } from '../../../ui/UIManager';
import { saveCurrentScene } from '../../systems/SaveSystem';

const RUIN_BAR_NPCS: NPCDef[] = [
  {
    id: 'rb-bartender', tileX: 5, tileY: 3, behavior: 'idle',
    texture: 'npc-bp-bartender', interactable: true, onInteract: 'dialog',
    facingDirection: 'down',
    interactionData: { lines: ['What\'ll it be?', 'We have pálinka, spritzer, or craft beer!'] },
  },
  {
    id: 'rb-local', tileX: 14, tileY: 6, behavior: 'idle',
    texture: 'npc-bp-local', interactable: true, onInteract: 'dialog',
    facingDirection: 'left',
    interactionData: { lines: [
      'Ruin bars started in abandoned buildings in the early 2000s.',
      'Now they\'re the heart of Budapest nightlife!',
    ] },
  },
  { id: 'rb-patron-1', tileX: 12, tileY: 4, behavior: 'sit', texture: 'npc-bp-tourist' },
  { id: 'rb-patron-2', tileX: 16, tileY: 4, behavior: 'sit', texture: 'npc-bp-local-2' },
  { id: 'rb-dancer', tileX: 7, tileY: 11, behavior: 'walk', texture: 'npc-bp-tourist-2',
    walkPath: [{ x: 7, y: 11 }, { x: 9, y: 11 }, { x: 9, y: 13 }, { x: 7, y: 13 }] },
  { id: 'rb-photo-tourist', tileX: 14, tileY: 12, behavior: 'idle', texture: 'npc-bp-tourist' },
];

export class RuinBarScene extends InteriorScene {
  private npcSystem!: NPCSystem;

  constructor() {
    super({ key: 'RuinBarScene' });
  }

  getLayout(): InteriorLayout {
    return RUIN_BAR_LAYOUT;
  }

  create(): void {
    super.create();
    saveCurrentScene('RuinBarScene');

    this.npcSystem = new NPCSystem();
    this.npcSystem.create(this, RUIN_BAR_NPCS);

    this.npcSystem.onDwellTrigger = (npc) => {
      if (!npc.interactionData?.lines) return;
      this.inputSystem.freeze();
      uiManager.showNPCDialog(npc.interactionData.lines, () => {
        uiManager.hideNPCDialog();
        this.inputSystem.unfreeze();
        this.npcSystem.onDialogueEnd(npc.id);
      });
    };
  }

  // Override: exit goes to JewishQuarterScene with returnFromInterior flag
  // Cannot rely on layout.previousScene because transitionToScene() doesn't pass returnFromInterior
  protected exitToOverworld(): void {
    uiManager.hideInteractionPrompt();
    const cam = this.cameras.main;
    this.tweens.add({
      targets: cam, alpha: 0, duration: 300, ease: 'Linear',
      onComplete: () => {
        this.scene.start('JewishQuarterScene', {
          returnFromInterior: true,
          returnX: this.returnData.returnX,
          returnY: this.returnData.returnY,
        });
      },
    });
  }

  update(time: number, delta: number): void {
    super.update(time, delta);
    const pos = this.player.getPosition();
    this.npcSystem.update(delta, pos.x, pos.y, this.inputSystem.isFrozen);
  }

  shutdown(): void {
    super.shutdown();
    this.npcSystem?.destroy();
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/game/scenes/budapest/RuinBarScene.ts
git commit -m "feat(budapest): add Ruin Bar interior scene (6 NPCs, eclectic decor)"
```

---

### Task 12: Budapest Airbnb Scene

**Files:**
- Create: `src/game/scenes/budapest/BudapestAirbnbScene.ts`

Depends on: Task 1, Task 8

- [ ] **Step 1: Create BudapestAirbnbScene**

```typescript
import { InteriorScene } from '../InteriorScene';
import { InteriorLayout } from '../../data/interiorLayouts';
import { BUDAPEST_AIRBNB_LAYOUT } from './budapestAirbnbLayout';
import { saveCurrentScene } from '../../systems/SaveSystem';
import { uiManager } from '../../../ui/UIManager';

export class BudapestAirbnbScene extends InteriorScene {
  constructor() {
    super({ key: 'BudapestAirbnbScene' });
  }

  getLayout(): InteriorLayout {
    return BUDAPEST_AIRBNB_LAYOUT;
  }

  create(): void {
    super.create();
    saveCurrentScene('BudapestAirbnbScene');
  }

  // Override: exit goes to BudapestOverworldScene with returnFromInterior flag
  // Cannot rely on layout.previousScene because transitionToScene() doesn't pass returnFromInterior
  protected exitToOverworld(): void {
    uiManager.hideInteractionPrompt();
    const cam = this.cameras.main;
    this.tweens.add({
      targets: cam, alpha: 0, duration: 300, ease: 'Linear',
      onComplete: () => {
        this.scene.start('BudapestOverworldScene', {
          returnFromInterior: true,
          returnX: this.returnData.returnX,
          returnY: this.returnData.returnY,
        });
      },
    });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/game/scenes/budapest/BudapestAirbnbScene.ts
git commit -m "feat(budapest): add Budapest Airbnb apartment scene"
```

---

### Task 13: Budapest Eye Cutscene

**Files:**
- Create: `src/game/scenes/budapest/BudapestEyeScene.ts`

Depends on: Task 1

- [ ] **Step 1: Create the Budapest Eye Ferris wheel sunset cutscene**

Create `src/game/scenes/budapest/BudapestEyeScene.ts` following the `AirplaneCutscene` pattern (timed phases, sprite tweens, skip button):

```typescript
import Phaser from 'phaser';

export class BudapestEyeScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BudapestEyeScene' });
  }

  create() {
    const w = Number(this.cameras.main.width);
    const h = Number(this.cameras.main.height);

    // ── Sky background ──
    const sky = this.add.rectangle(w / 2, h / 2, w, h, 0x87CEEB).setDepth(0);

    // ── City skyline silhouette ──
    const skyline = this.add.image(w / 2, h * 0.85, 'budapest-skyline')
      .setDepth(1).setDisplaySize(w, h * 0.3);

    // ── Danube reflection ──
    const river = this.add.rectangle(w / 2, h * 0.92, w, h * 0.16, 0x2255AA)
      .setDepth(1).setAlpha(0.6);

    // ── Ferris Wheel ──
    const wheelCenterX = w / 2;
    const wheelCenterY = h * 0.45;
    const wheelRadius = Math.min(w, h) * 0.28;

    // Wheel structure
    const wheel = this.add.image(wheelCenterX, wheelCenterY, 'budapest-eye-wheel')
      .setDepth(2).setDisplaySize(wheelRadius * 2, wheelRadius * 2);

    // Player cabin (highlighted)
    const cabin = this.add.image(wheelCenterX, wheelCenterY + wheelRadius, 'budapest-eye-cabin')
      .setDepth(4).setScale(2);

    // Cabin angle tracking
    let cabinAngle = Math.PI / 2; // starts at bottom

    // ── Sunset overlay rectangles ──
    const sunsetOrange = this.add.rectangle(w / 2, h * 0.3, w, h * 0.6, 0xFF6B35)
      .setAlpha(0).setDepth(0);
    const sunsetPink = this.add.rectangle(w / 2, h * 0.2, w, h * 0.4, 0xCC3366)
      .setAlpha(0).setDepth(0);
    const sunsetPurple = this.add.rectangle(w / 2, h * 0.15, w, h * 0.3, 0x663399)
      .setAlpha(0).setDepth(0);

    // ── Phase 1: Boarding (0-3s) ──
    // Player walks toward cabin
    const playerSprite = this.add.rectangle(w / 2 - 20, h * 0.8, 8, 16, 0x4488FF)
      .setDepth(5);
    const partnerSprite = this.add.rectangle(w / 2 + 20, h * 0.8, 8, 16, 0xFF6688)
      .setDepth(5);

    this.tweens.add({
      targets: [playerSprite, partnerSprite],
      y: wheelCenterY + wheelRadius - 10,
      duration: 2000,
      ease: 'Sine.easeOut',
      onComplete: () => {
        playerSprite.setVisible(false);
        partnerSprite.setVisible(false);
      },
    });

    // ── Phase 2: Ascending (3-10s) ──
    this.time.delayedCall(3000, () => {
      // Rotate wheel slowly
      this.tweens.add({
        targets: wheel,
        angle: -180,
        duration: 17000,
        ease: 'Linear',
      });

      // Cabin follows circular path
      const startTime = this.time.now;
      const ascendEvent = this.time.addEvent({
        delay: 16,
        loop: true,
        callback: () => {
          const elapsed = this.time.now - startTime;
          cabinAngle = (Math.PI / 2) - (elapsed / 17000) * Math.PI;
          cabin.x = wheelCenterX + Math.cos(cabinAngle) * wheelRadius;
          cabin.y = wheelCenterY + Math.sin(cabinAngle) * wheelRadius;

          // Stop at top
          if (elapsed >= 17000) {
            ascendEvent.destroy();
          }
        },
      });
    });

    // ── Phase 3: Sunset at Top (10-18s) ──
    this.time.delayedCall(10000, () => {
      // Sky transitions to sunset
      this.tweens.add({ targets: sunsetOrange, alpha: 0.6, duration: 3000, ease: 'Sine.easeInOut' });
      this.time.delayedCall(2000, () => {
        this.tweens.add({ targets: sunsetPink, alpha: 0.4, duration: 3000, ease: 'Sine.easeInOut' });
      });
      this.time.delayedCall(4000, () => {
        this.tweens.add({ targets: sunsetPurple, alpha: 0.3, duration: 3000, ease: 'Sine.easeInOut' });
      });

      // River reflects sunset
      this.tweens.add({
        targets: river,
        fillColor: 0xFF6644,
        alpha: 0.5,
        duration: 5000,
      });

      // Golden particles
      for (let i = 0; i < 15; i++) {
        this.time.delayedCall(i * 400, () => {
          const px = Math.random() * w;
          const py = Math.random() * h * 0.5;
          const particle = this.add.circle(px, py, 2, 0xFFDD88).setAlpha(0.7).setDepth(3);
          this.tweens.add({
            targets: particle,
            y: py - 30,
            alpha: 0,
            duration: 2000,
            ease: 'Sine.easeIn',
            onComplete: () => particle.destroy(),
          });
        });
      }
    });

    // ── Phase 4: Descending (18-23s) ──
    // Wheel continues rotating (already in the 17s tween)
    // Sky deepens to twilight
    this.time.delayedCall(18000, () => {
      this.tweens.add({ targets: sunsetPurple, alpha: 0.5, duration: 4000 });
    });

    // ── Phase 5: Exit (23-25s) ──
    this.time.delayedCall(23000, () => {
      skipBtn.remove();
      this.cameras.main.fadeOut(1500, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('BudapestOverworldScene', { returnFromInterior: true });
      });
    });

    // ── Skip Button ──
    const skipBtn = document.createElement('div');
    skipBtn.className = 'skip-cutscene';
    skipBtn.textContent = 'Skip ▶▶';
    document.getElementById('ui-layer')!.appendChild(skipBtn);

    skipBtn.addEventListener('click', () => {
      skipBtn.remove();
      this.tweens.killAll();
      this.time.removeAllEvents();
      this.cameras.main.fadeOut(300, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('BudapestOverworldScene', { returnFromInterior: true });
      });
    });

    this.events.once('shutdown', () => { skipBtn.remove(); });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/game/scenes/budapest/BudapestEyeScene.ts
git commit -m "feat(budapest): add Budapest Eye Ferris wheel sunset cutscene"
```

---

### Task 14: Transport Hub Scene

**Files:**
- Create: `src/game/scenes/budapest/BudapestTransportScene.ts`

Depends on: Task 1

- [ ] **Step 1: Create BudapestTransportScene**

Follow `DrivingScene` pattern:

```typescript
import Phaser from 'phaser';
import { uiManager } from '../../../ui/UIManager';

export class BudapestTransportScene extends Phaser.Scene {
  private returnX?: number;
  private returnY?: number;

  constructor() {
    super({ key: 'BudapestTransportScene' });
  }

  init(data: { returnX?: number; returnY?: number }) {
    this.returnX = data?.returnX;
    this.returnY = data?.returnY;
  }

  create() {
    const { width, height } = this.scale;

    // Urban background
    this.add.rectangle(width / 2, height / 2, width, height, 0x5a6a7a);

    // Tram stop shelter visual
    this.add.rectangle(width / 2, height * 0.35, 200, 120, 0x444444).setDepth(1);
    this.add.rectangle(width / 2, height * 0.28, 220, 10, 0x666666).setDepth(2);

    // Tram stop sign
    this.add.text(width / 2, height * 0.2, 'Tram Stop', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '14px',
      color: '#FFD700',
    }).setOrigin(0.5).setDepth(5);

    // Tram tracks
    this.add.rectangle(width / 2, height * 0.55, width, 4, 0x888888).setDepth(1);
    this.add.rectangle(width / 2, height * 0.58, width, 4, 0x888888).setDepth(1);

    // Animated tram arrival
    const tram = this.add.image(-100, height * 0.52, 'budapest-tram').setDepth(3).setScale(2);
    this.tweens.add({
      targets: tram,
      x: width / 2,
      duration: 2000,
      ease: 'Sine.easeOut',
      onComplete: () => {
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
          label: 'Jewish Quarter',
          onClick: () => {
            uiManager.hideDialog();
            this.cameras.main.fadeOut(500, 0, 0, 0);
            this.cameras.main.once('camerafadeoutcomplete', () => {
              this.scene.start('JewishQuarterScene');
            });
          },
        },
        {
          label: 'Budapest Eye',
          onClick: () => {
            uiManager.hideDialog();
            this.cameras.main.fadeOut(500, 0, 0, 0);
            this.cameras.main.once('camerafadeoutcomplete', () => {
              this.scene.start('BudapestOverworldScene', {
                returnFromInterior: true,
                returnX: 27 * 32 + 16,  // Eye area tile 27
                returnY: 21 * 32 + 16,  // Eye area tile 21
              });
            });
          },
        },
        {
          label: 'City Center',
          onClick: () => {
            uiManager.hideDialog();
            this.cameras.main.fadeOut(500, 0, 0, 0);
            this.cameras.main.once('camerafadeoutcomplete', () => {
              this.scene.start('BudapestOverworldScene', {
                returnFromInterior: true,
                returnX: this.returnX,
                returnY: this.returnY,
              });
            });
          },
        },
        {
          label: 'Airport (Go Home)',
          onClick: () => {
            uiManager.hideDialog();
            this.cameras.main.fadeOut(500, 0, 0, 0);
            this.cameras.main.once('camerafadeoutcomplete', () => {
              this.scene.start('AirplaneCutscene', { destination: 'home' });
            });
          },
        },
        {
          label: 'Go Back',
          onClick: () => {
            uiManager.hideDialog();
            this.cameras.main.fadeOut(500, 0, 0, 0);
            this.cameras.main.once('camerafadeoutcomplete', () => {
              this.scene.start('BudapestOverworldScene', {
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

- [ ] **Step 2: Commit**

```bash
git add src/game/scenes/budapest/BudapestTransportScene.ts
git commit -m "feat(budapest): add transport hub scene (tram stop menu)"
```

---

### Task 15: Scene Registration in main.ts

**Files:**
- Modify: `src/main.ts:1-53`

Depends on: All scene tasks (3, 4, 9, 10, 11, 12, 13, 14)

- [ ] **Step 1: Add imports for all 8 Budapest scenes**

Add after line 23 (after TurtleRescueScene import):

```typescript
import { BudapestAirportScene } from './game/scenes/budapest/BudapestAirportScene';
import { BudapestBusRideScene } from './game/scenes/budapest/BudapestBusRideScene';
import { BudapestOverworldScene } from './game/scenes/budapest/BudapestOverworldScene';
import { JewishQuarterScene } from './game/scenes/budapest/JewishQuarterScene';
import { RuinBarScene } from './game/scenes/budapest/RuinBarScene';
import { BudapestEyeScene } from './game/scenes/budapest/BudapestEyeScene';
import { BudapestAirbnbScene } from './game/scenes/budapest/BudapestAirbnbScene';
import { BudapestTransportScene } from './game/scenes/budapest/BudapestTransportScene';
```

- [ ] **Step 2: Add scenes to the scene array**

In the `scene` array (line 53), add the 8 Budapest scenes after `TurtleRescueScene`:

```typescript
scene: [BootScene, DressingRoomScene, WorldScene, MichaelsHouseScene, HadarsHouseScene, AirportInteriorScene, AirplaneCutscene, MauiOverworldScene, MauiHotelScene, AirbnbCompoundScene, DrivingScene, HanaPulloverScene, HanaDrivingScene, SunBeachScene, QuizScene, CatchScene, MatchScene, TennisScene, ChaseBabyScene, TurtleRescueScene, BudapestAirportScene, BudapestBusRideScene, BudapestOverworldScene, JewishQuarterScene, RuinBarScene, BudapestEyeScene, BudapestAirbnbScene, BudapestTransportScene],
```

- [ ] **Step 3: Commit**

```bash
git add src/main.ts
git commit -m "feat(budapest): register all 8 Budapest scenes"
```

---

### Task 16: Smoke Test & Fix

**Files:**
- Potentially any of the above

Depends on: Task 15

- [ ] **Step 1: Build the project**

```bash
cd /c/Learnings/game-website && npm run build
```

Fix any TypeScript compilation errors. Common issues:
- Missing exports from map data files
- Type mismatches in OverworldConfig or InteriorLayout
- Missing texture keys referenced in scenes

- [ ] **Step 2: Run dev server and test basic flow**

```bash
npm run dev
```

Test the flow: WorldScene → Airport → Gate 2 → Flight → Budapest Airport → Bus Ride → Budapest Overworld. Verify:
- Gate 2 sign shows "Budapest"
- Walking to Gate 2 area triggers boarding
- AirplaneCutscene transitions to BudapestAirportScene
- NPCs in airport scene are visible and interactive
- Bus ride plays and transitions to overworld
- Budapest overworld renders terrain, NPCs, vehicles, buildings
- Checkpoint zones trigger correct scenes
- Budapest Eye cutscene plays sunset animation
- Jewish Quarter loads with dense NPCs
- Ruin Bar interior works
- Airbnb interior works
- Transport hub offers correct destinations
- "Airport (Go Home)" returns to WorldScene

- [ ] **Step 3: Fix any issues found and commit**

```bash
git add -A
git commit -m "fix(budapest): address smoke test issues"
```
