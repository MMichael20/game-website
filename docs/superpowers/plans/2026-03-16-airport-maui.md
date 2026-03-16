# Airport & Maui Destination Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a hub-style airport with 3 rooms, an animated airplane cutscene, and a Maui destination with beach + town zones.

**Architecture:** Airport rooms extend InteriorScene with new multi-room transition support. AirplaneCutscene is a bare Phaser.Scene with Timeline API. MauiOverworldScene extends a new OverworldScene base class extracted from WorldScene. NPC interaction system added to support dialog and cutscene triggers.

**Tech Stack:** Phaser 3.90.0, TypeScript, Vite, procedural pixel art via PixelArtGenerator (canvas 2D)

**Design doc:** `docs/plans/2026-03-16-airport-maui-design.md`

---

## Chunk 1: Infrastructure — InteriorScene Multi-Room Transitions

### Task 1: Extend InteriorScene with nextRoom/previousRoom support

**Files:**
- Modify: `src/game/scenes/InteriorScene.ts`
- Modify: `src/game/data/interiorLayouts.ts` (add forward/back exit to InteriorLayout)

The current InteriorScene has a single `exit` zone and `exitToOverworld()` hardcoded to return to WorldScene. We need:
- A second exit zone (forward door vs back door)
- Config-driven next/previous scene routing

- [ ] **Step 1: Add forward exit to InteriorLayout interface**

In `src/game/data/interiorLayouts.ts`, add an optional `forwardExit` field to the `InteriorLayout` interface:

```typescript
export interface InteriorLayout {
  id: string;
  widthInTiles: number;
  heightInTiles: number;
  wallGrid: boolean[][];
  floors: FloorZone[];
  decorations: InteriorDecoration[];
  entrance: { tileX: number; tileY: number };
  exit: ExitZone;                          // existing — back exit (to previous room / overworld)
  forwardExit?: ExitZone;                  // NEW — forward exit (to next room)
  nextScene?: string;                      // NEW — scene key for forward exit
  previousScene?: string;                  // NEW — scene key for back exit (null = exitToOverworld)
  cameraZoom?: number;
}
```

- [ ] **Step 2: Update InteriorSceneData to carry scene routing info**

In `src/game/scenes/InteriorScene.ts`, update the data interface:

```typescript
interface InteriorSceneData {
  returnX: number;
  returnY: number;
}
```

No changes needed to the interface — `previousScene`/`nextScene` on the layout handles routing.

- [ ] **Step 3: Add forward exit zone detection in InteriorScene.update()**

In `src/game/scenes/InteriorScene.ts`, add tracking for the forward exit zone alongside the existing exit zone. After the existing exit zone check block (lines 92-108), add forward exit zone detection:

```typescript
// Forward exit zone check
if (this.layout.forwardExit) {
  const fwd = this.layout.forwardExit;
  const inForwardZone =
    playerTile.x >= fwd.tileX &&
    playerTile.x < fwd.tileX + fwd.width &&
    playerTile.y >= fwd.tileY &&
    playerTile.y < fwd.tileY + fwd.height;

  if (inForwardZone && !this.activeForwardZone) {
    this.activeForwardZone = true;
    uiManager.showInteractionPrompt(fwd.promptText);
  } else if (!inForwardZone && this.activeForwardZone) {
    this.activeForwardZone = false;
    uiManager.hideInteractionPrompt();
  }
}
```

Add `private activeForwardZone = false;` to class properties.

- [ ] **Step 4: Update interact handler to support forward exit**

In the interact handler (around line 111), check which zone is active:

```typescript
if (this.inputSystem.isInteractPressed() && this.interactCooldown <= 0) {
  this.interactCooldown = 500;

  // Let subclass handle interact first (e.g., NPC interaction in airport scenes)
  if (this.onInteractPressed()) {
    // Subclass handled it
  } else if (this.activeForwardZone && this.layout.nextScene) {
    this.transitionToScene(this.layout.nextScene);
  } else if (this.activeExitZone) {
    if (this.layout.previousScene) {
      this.transitionToScene(this.layout.previousScene);
    } else {
      this.exitToOverworld();
    }
  }
}
```

Also add a virtual hook method to the InteriorScene class:

```typescript
/** Override in subclasses to handle interact (e.g., NPC dialog). Return true if handled. */
protected onInteractPressed(): boolean {
  return false;
}
```

**IMPORTANT:** `isInteractPressed()` consumes the touch action on first call. Having a single call point here prevents double-consumption bugs. Subclasses override `onInteractPressed()` instead of calling `isInteractPressed()` themselves.

- [ ] **Step 5: Add transitionToScene method to InteriorScene**

```typescript
protected transitionToScene(sceneKey: string): void {
  uiManager.hideInteractionPrompt();
  const cam = this.cameras.main;
  const pos = this.player.getPosition();
  this.tweens.add({
    targets: cam,
    alpha: 0,
    duration: 300,
    ease: 'Linear',
    onComplete: () => {
      this.scene.start(sceneKey, {
        returnX: this.returnData.returnX,
        returnY: this.returnData.returnY,
      });
    },
  });
}
```

- [ ] **Step 6: Update back/ESC to use previousScene**

Update the back/ESC handler (around line 117):

```typescript
if (this.inputSystem.isBackPressed() && this.backCooldown <= 0) {
  this.backCooldown = 500;
  if (this.layout.previousScene) {
    this.transitionToScene(this.layout.previousScene);
  } else {
    this.exitToOverworld();
  }
}
```

- [ ] **Step 7: Verify MichaelsHouseScene still works**

Run: `npm run dev`

MichaelsHouseScene has no `forwardExit`, `nextScene`, or `previousScene`, so it should fall through to existing `exitToOverworld()` behavior. Navigate to Michael's House, walk around, exit. Confirm no regression.

- [ ] **Step 8: Commit**

```bash
git add src/game/scenes/InteriorScene.ts src/game/data/interiorLayouts.ts
git commit -m "feat: add multi-room transition support to InteriorScene"
```

---

## Chunk 2: Infrastructure — NPC Interaction System

### Task 2: Add interaction capability to NPC entity

**Files:**
- Modify: `src/game/entities/NPC.ts`
- Modify: `src/game/data/mapLayout.ts` (extend NPCDef interface)

- [ ] **Step 1: Extend NPCDef interface**

In `src/game/data/mapLayout.ts`, add optional interaction fields to `NPCDef`:

```typescript
export interface NPCDef {
  id: string;
  tileX: number;
  tileY: number;
  behavior: 'idle' | 'walk' | 'sit';
  walkPath?: Array<{ x: number; y: number }>;
  texture?: string;
  speed?: number;
  // Interaction fields (all optional, existing NPCs unaffected)
  interactable?: boolean;
  interactionRadius?: number;   // pixels, default 48
  onInteract?: 'dialog' | 'cutscene-trigger';
  interactionData?: {
    lines?: string[];       // for dialog type
    sceneKey?: string;      // for cutscene-trigger type
    sceneData?: any;        // data to pass to target scene
  };
}
```

- [ ] **Step 2: Add interaction fields and proximity check to NPC class**

In `src/game/entities/NPC.ts`, add interaction support:

```typescript
export class NPC {
  public sprite: Phaser.GameObjects.Sprite;
  public readonly id: string;
  public readonly interactable: boolean;
  public readonly interactionRadius: number;
  public readonly onInteract?: 'dialog' | 'cutscene-trigger';
  public readonly interactionData?: { lines?: string[]; sceneKey?: string; sceneData?: any };

  private state: NPCState;
  private walkPath: Array<{ x: number; y: number }>;
  private currentPathIndex = 0;
  private targetPos: { x: number; y: number } | null = null;
  private speed: number;
  private promptSprite: Phaser.GameObjects.Text | null = null;
  private _inRange = false;

  constructor(
    scene: Phaser.Scene,
    def: NPCDef,
  ) {
    this.id = def.id;
    const worldPos = tileToWorld(def.tileX, def.tileY);
    this.sprite = scene.add.sprite(worldPos.x, worldPos.y, def.texture ?? 'npc-default');
    this.sprite.setDepth(8);

    this.walkPath = def.walkPath ?? [];
    this.speed = def.speed ?? DEFAULT_NPC_SPEED;
    this.state = def.behavior === 'walk' ? 'walking' : def.behavior === 'sit' ? 'sitting' : 'idle';

    this.interactable = def.interactable ?? false;
    this.interactionRadius = def.interactionRadius ?? 48;
    this.onInteract = def.onInteract;
    this.interactionData = def.interactionData;

    if (this.state === 'walking' && this.walkPath.length > 1) {
      this.currentPathIndex = 0;
      this.setNextTarget();
    }
  }

  get inRange(): boolean { return this._inRange; }
  get currentDistance(): number { return this._currentDistance; }
  private _currentDistance = Infinity;

  checkProximity(playerX: number, playerY: number): boolean {
    if (!this.interactable) return false;
    const dx = playerX - this.sprite.x;
    const dy = playerY - this.sprite.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    this._currentDistance = dist;
    const wasInRange = this._inRange;
    this._inRange = dist <= this.interactionRadius;

    if (this._inRange && !wasInRange) {
      this.showPrompt();
    } else if (!this._inRange && wasInRange) {
      this.hidePrompt();
    }
    return this._inRange;
  }

  private showPrompt(): void {
    if (this.promptSprite) return;
    this.promptSprite = this.sprite.scene.add.text(
      this.sprite.x, this.sprite.y - 20, 'E',
      { fontSize: '10px', color: '#ffffff', backgroundColor: '#00000088', padding: { x: 3, y: 2 } }
    );
    this.promptSprite.setOrigin(0.5);
    this.promptSprite.setDepth(100);
  }

  private hidePrompt(): void {
    this.promptSprite?.destroy();
    this.promptSprite = null;
  }

  // ... existing update/setNextTarget/destroy methods stay the same,
  // but destroy() must also call this.hidePrompt()
}
```

**Important:** The constructor signature changes from positional args to a single `NPCDef` object. This is cleaner and avoids a 7-argument constructor.

- [ ] **Step 3: Update NPC.destroy() to clean up prompt**

```typescript
destroy(): void {
  this.hidePrompt();
  this.sprite.destroy();
}
```

- [ ] **Step 4: Update NPC.update() to reposition prompt**

At the end of the existing `update()` method, add:

```typescript
if (this.promptSprite) {
  this.promptSprite.setPosition(this.sprite.x, this.sprite.y - 20);
}
```

**IMPORTANT:** The NPC constructor changes from positional args to `(scene, def: NPCDef)`. This is a breaking change — NPCSystem must be updated in the same commit. Continue with Steps 5-8 below before committing.

### Task 2 continued + Task 3: Parameterize NPCSystem and update WorldScene

**Files:**
- Modify: `src/game/systems/NPCSystem.ts`
- Modify: `src/game/scenes/WorldScene.ts` (pass NPC_DEFS explicitly)

- [ ] **Step 1: Update NPCSystem to accept NPC defs as parameter**

Rewrite `src/game/systems/NPCSystem.ts`:

```typescript
import Phaser from 'phaser';
import { NPC } from '../entities/NPC';
import { NPCDef } from '../data/mapLayout';

export class NPCSystem {
  private npcs: NPC[] = [];
  private scene!: Phaser.Scene;

  create(scene: Phaser.Scene, defs: NPCDef[]): void {
    this.scene = scene;
    this.npcs = defs.map(def => new NPC(scene, def));
  }

  update(delta: number, playerX?: number, playerY?: number): void {
    for (const npc of this.npcs) {
      npc.update(delta);
      if (playerX !== undefined && playerY !== undefined) {
        npc.checkProximity(playerX, playerY);
      }
    }
  }

  /** Returns the closest interactable NPC currently in range, or null */
  getInteractableInRange(): NPC | null {
    let closest: NPC | null = null;
    let closestDist = Infinity;
    for (const npc of this.npcs) {
      if (npc.inRange) {
        const dist = npc.currentDistance;
        if (dist < closestDist) {
          closest = npc;
          closestDist = dist;
        }
      }
    }
    return closest;
  }

  destroy(): void {
    this.npcs.forEach(npc => npc.destroy());
    this.npcs = [];
  }
}
```

- [ ] **Step 2: Update WorldScene to pass NPC_DEFS and player position**

In `src/game/scenes/WorldScene.ts`:

1. Change the NPCSystem create call (around line 112):
```typescript
// Before:
this.npcSystem.create(this);
// After:
import { NPC_DEFS } from '../data/mapLayout';
this.npcSystem.create(this, NPC_DEFS);
```

2. Update the npcSystem.update call (around line 173):
```typescript
// Before:
this.npcSystem.update(delta);
// After:
const playerPos = this.player.getPosition();
this.npcSystem.update(delta, playerPos.x, playerPos.y);
```

Note: `playerPos` is already computed on line 176 — move it above the npcSystem.update call.

- [ ] **Step 3: Run dev server and verify NPCs still work**

Run: `npm run dev`

Walk around the overworld, confirm all 8 NPCs behave normally (walking, sitting, idle). None are `interactable` yet, so no prompts should appear.

- [ ] **Step 4: Commit all NPC changes together**

```bash
git add src/game/entities/NPC.ts src/game/data/mapLayout.ts src/game/systems/NPCSystem.ts src/game/scenes/WorldScene.ts
git commit -m "feat: add NPC interaction system with parameterized NPCSystem"
```

### Task 4: Add NPC dialog overlay to UIManager

**Files:**
- Modify: `src/ui/UIManager.ts`
- Create: `src/ui/styles/dialog-overlay.css` (or add to existing `menus.css`)

- [ ] **Step 1: Add showNPCDialog and hideNPCDialog to UIManager**

In `src/ui/UIManager.ts`, add these methods to the `UIManager` class:

```typescript
// --- NPC Dialog ---
showNPCDialog(lines: string[], onComplete: () => void): void {
  this.hideNPCDialog();
  let currentLine = 0;
  const el = document.createElement('div');
  el.className = 'npc-dialog';
  el.id = 'npc-dialog';
  el.innerHTML = `
    <div class="npc-dialog__box">
      <p class="npc-dialog__text" id="npc-dialog-text">${lines[0]}</p>
      <span class="npc-dialog__advance">${lines.length > 1 ? 'E / Click ▶' : 'E / Click ✕'}</span>
    </div>
  `;

  const advance = () => {
    currentLine++;
    if (currentLine >= lines.length) {
      this.hideNPCDialog();
      onComplete();
      return;
    }
    const textEl = document.getElementById('npc-dialog-text');
    if (textEl) textEl.textContent = lines[currentLine];
    const advEl = el.querySelector('.npc-dialog__advance');
    if (advEl) advEl.textContent = currentLine === lines.length - 1 ? 'E / Click ✕' : 'E / Click ▶';
  };

  el.addEventListener('click', advance);
  // Also listen for E key
  const keyHandler = (e: KeyboardEvent) => {
    if (e.key === 'e' || e.key === 'E' || e.key === ' ') {
      advance();
    }
  };
  document.addEventListener('keydown', keyHandler);
  // Store handler ref for cleanup
  (el as any)._keyHandler = keyHandler;

  this.dialogContainer.appendChild(el);
}

hideNPCDialog(): void {
  const el = document.getElementById('npc-dialog');
  if (el) {
    const handler = (el as any)._keyHandler;
    if (handler) document.removeEventListener('keydown', handler);
    el.remove();
  }
}
```

- [ ] **Step 2: Add NPC dialog styles**

In `src/ui/styles/menus.css`, add at the end:

```css
/* NPC Dialog */
.npc-dialog {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 200;
  pointer-events: auto;
}

.npc-dialog__box {
  background: rgba(26, 26, 46, 0.95);
  border: 2px solid #d4a574;
  border-radius: 8px;
  padding: 16px 24px;
  min-width: 300px;
  max-width: 500px;
  text-align: center;
}

.npc-dialog__text {
  color: #fdf6e3;
  font-family: 'Press Start 2P', monospace;
  font-size: 11px;
  line-height: 1.6;
  margin: 0 0 8px 0;
}

.npc-dialog__advance {
  color: #d4a574;
  font-family: 'Press Start 2P', monospace;
  font-size: 8px;
  opacity: 0.7;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/ui/UIManager.ts src/ui/styles/menus.css
git commit -m "feat: add NPC dialog overlay to UIManager"
```

---

## Chunk 3: Infrastructure — Save System V3 & OverworldScene Base Class

### Task 5: Upgrade save system to V3

**Files:**
- Modify: `src/game/systems/SaveSystem.ts`

- [ ] **Step 1: Add GameStateV3 and update save system**

```typescript
export interface GameStateV3 {
  version: 3;
  outfits: { player: number; partner: number };
  visitedCheckpoints: string[];
  miniGameScores: Record<string, number>;
  bestScores: Record<string, number>;
  playerPosition?: { x: number; y: number };
  currentScene: string;   // scene key for resume: 'WorldScene', 'AirportEntranceScene', 'MauiOverworldScene'
}
```

Update `migrate()` to handle V2→V3:

```typescript
function migrate(raw: any): GameStateV3 {
  if (raw?.version === 3) return raw as GameStateV3;

  // First migrate to V2 if needed
  let v2: GameStateV2;
  if (raw?.version === 2) {
    v2 = raw as GameStateV2;
  } else if (raw?.version && raw.version > 3) {
    return getDefaultState();
  } else {
    // V1 → V2 migration (existing logic)
    const filteredScores = Object.fromEntries(
      Object.entries(raw?.miniGameScores ?? {})
        .filter(([id]) => VALID_CHECKPOINT_IDS.includes(id))
    ) as Record<string, number>;
    v2 = {
      version: 2,
      outfits: {
        player: raw?.outfits?.herOutfit ?? 0,
        partner: raw?.outfits?.hisOutfit ?? 0,
      },
      visitedCheckpoints: (raw?.visitedCheckpoints ?? [])
        .filter((id: string) => VALID_CHECKPOINT_IDS.includes(id)),
      miniGameScores: filteredScores,
      bestScores: { ...filteredScores },
    };
  }

  // V2 → V3
  return {
    ...v2,
    version: 3,
    currentScene: 'WorldScene',
  };
}
```

Update `getDefaultState()` to return V3:

```typescript
export function getDefaultState(): GameStateV3 {
  return {
    version: 3,
    outfits: { player: 0, partner: 0 },
    visitedCheckpoints: [],
    miniGameScores: {},
    bestScores: {},
    currentScene: 'WorldScene',
  };
}
```

Add `saveCurrentScene()`:

```typescript
export function saveCurrentScene(sceneKey: string): void {
  const state = loadGameState();
  state.currentScene = sceneKey;
  saveGameState(state);
}

export function getCurrentScene(): string {
  const state = loadGameState();
  return state.currentScene;
}
```

Update all function signatures from `GameStateV2` to `GameStateV3`.

Also update `hasSavedGame()` to account for location:

```typescript
export function hasSavedGame(): boolean {
  const state = loadGameState();
  return state.visitedCheckpoints.length > 0 || state.currentScene !== 'WorldScene' || state.playerPosition != null;
}
```

- [ ] **Step 2: Verify existing save/load still works**

Run: `npm run dev`

Start a game, visit a checkpoint, reload. Confirm saved state loads correctly with V2→V3 migration.

- [ ] **Step 3: Commit**

```bash
git add src/game/systems/SaveSystem.ts
git commit -m "feat: upgrade save system to V3 with currentScene field"
```

### Task 6: Extract OverworldScene base class from WorldScene

**Files:**
- Create: `src/game/scenes/OverworldScene.ts`
- Modify: `src/game/scenes/WorldScene.ts` (extend OverworldScene)

This is the highest-risk refactor. The goal is to extract shared overworld logic (tilemap, player, partner, NPC system, input, camera, zone transitions) into a base class that both WorldScene and MauiOverworldScene can extend.

- [ ] **Step 1: Define the OverworldSceneConfig interface**

Create `src/game/scenes/OverworldScene.ts`:

```typescript
import Phaser from 'phaser';
import { TILE_SIZE, getDeviceZoom } from '../../utils/constants';
import { tileToWorld, worldToTile, NPCDef, CheckpointZone } from '../data/mapLayout';
import { Player } from '../entities/Player';
import { Partner } from '../entities/Partner';
import { InputSystem } from '../systems/InputSystem';
import { NPCSystem } from '../systems/NPCSystem';
import { loadGameState } from '../systems/SaveSystem';
import { uiManager } from '../../ui/UIManager';

export interface OverworldConfig {
  mapWidth: number;          // tiles
  mapHeight: number;         // tiles
  tileGrid: number[][];      // [y][x] tile type indices
  walkCheck: (tileX: number, tileY: number) => boolean;
  npcs: NPCDef[];
  checkpointZones: CheckpointZone[];
  spawnX: number;            // world px
  spawnY: number;            // world px
  terrainTextureKey: string; // spritesheet key for tiles
}

export abstract class OverworldScene extends Phaser.Scene {
  protected player!: Player;
  protected partner!: Partner;
  protected inputSystem!: InputSystem;
  protected npcSystem!: NPCSystem;

  protected activeZone: CheckpointZone | null = null;
  protected interactCooldown = 0;
  protected backCooldown = 0;

  private returnFromInteriorData: { returnX: number; returnY: number } | null = null;
  private shouldFadeIn = false;

  protected cachedConfig!: OverworldConfig;

  abstract getConfig(): OverworldConfig;

  /** Override to handle entering a checkpoint zone */
  abstract onEnterCheckpoint(zone: CheckpointZone): void;

  /** Override to add scene-specific decorations, buildings, ambient effects */
  abstract onCreateExtras(): void;

  /** Override to show scene-specific HUD */
  onShowHUD(): void {}

  /** Override for back/ESC behavior */
  onBack(): void {}

  init(data?: { returnFromInterior?: boolean; returnX?: number; returnY?: number }): void {
    if (data?.returnFromInterior && data.returnX != null && data.returnY != null) {
      this.returnFromInteriorData = { returnX: data.returnX, returnY: data.returnY };
      this.shouldFadeIn = true;
    } else {
      this.returnFromInteriorData = null;
      this.shouldFadeIn = false;
    }
  }

  create(): void {
    const state = loadGameState();
    this.cachedConfig = this.getConfig();
    const config = this.cachedConfig;
    const mapPxW = config.mapWidth * TILE_SIZE;
    const mapPxH = config.mapHeight * TILE_SIZE;

    // 1. Build tile map
    this.buildOverworldTileMap(config, mapPxW, mapPxH);

    // 2. Scene-specific decorations, buildings, ambient
    this.onCreateExtras();

    // 3. Player & Partner
    let spawnX = config.spawnX;
    let spawnY = config.spawnY;
    if (this.returnFromInteriorData) {
      spawnX = this.returnFromInteriorData.returnX;
      spawnY = this.returnFromInteriorData.returnY;
      this.returnFromInteriorData = null;
    }
    this.player = new Player(this, spawnX, spawnY, state.outfits.player, config.walkCheck);
    this.partner = new Partner(this, spawnX, spawnY, state.outfits.partner);

    // 4. NPC system
    this.npcSystem = new NPCSystem();
    this.npcSystem.create(this, config.npcs);

    // 5. Input system
    this.inputSystem = new InputSystem(this);
    this.inputSystem.enableClickToMove(config.walkCheck, config.mapWidth, config.mapHeight, () => this.player.getPosition());

    // 6. Camera
    const cam = this.cameras.main;
    cam.setZoom(getDeviceZoom());
    cam.startFollow(this.player.sprite, true, 0.1, 0.1);
    cam.setBounds(0, 0, mapPxW, mapPxH);

    // 7. Physics bounds
    this.physics.world.setBounds(0, 0, mapPxW, mapPxH);
    this.player.sprite.setCollideWorldBounds(true);

    // 8. HUD
    this.onShowHUD();

    // 9. Resize handler
    this.scale.on('resize', () => {
      this.cameras.main.setZoom(getDeviceZoom());
    });

    // 10. Fade in
    if (this.shouldFadeIn) {
      cam.setAlpha(0);
      this.tweens.add({ targets: cam, alpha: 1, duration: 300, ease: 'Linear' });
      this.shouldFadeIn = false;
    }
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

    // NPCs
    const playerPos = this.player.getPosition();
    this.npcSystem.update(delta, playerPos.x, playerPos.y);

    // Checkpoint proximity
    const config = this.cachedConfig;
    const playerTile = worldToTile(playerPos.x, playerPos.y);
    let inZone: CheckpointZone | null = null;

    for (const zone of config.checkpointZones) {
      if (
        playerTile.x >= zone.tileX &&
        playerTile.x < zone.tileX + zone.width &&
        playerTile.y >= zone.tileY &&
        playerTile.y < zone.tileY + zone.height
      ) {
        inZone = zone;
        break;
      }
    }

    if (inZone && inZone !== this.activeZone) {
      this.activeZone = inZone;
      uiManager.showInteractionPrompt(inZone.promptText);
    } else if (!inZone && this.activeZone) {
      this.activeZone = null;
      uiManager.hideInteractionPrompt();
    }

    // NPC interaction check
    if (this.inputSystem.isInteractPressed() && this.interactCooldown <= 0) {
      this.interactCooldown = 500;
      // Check NPC interaction first
      const npc = this.npcSystem.getInteractableInRange();
      if (npc) {
        this.handleNPCInteract(npc);
      } else if (this.activeZone) {
        this.onEnterCheckpoint(this.activeZone);
      }
    }

    // Back/ESC
    if (this.inputSystem.isBackPressed() && this.backCooldown <= 0) {
      this.backCooldown = 500;
      this.onBack();
    }
  }

  private handleNPCInteract(npc: import('../entities/NPC').NPC): void {
    if (npc.onInteract === 'dialog' && npc.interactionData?.lines) {
      this.inputSystem.freeze();
      uiManager.showNPCDialog(npc.interactionData.lines, () => {
        this.inputSystem.unfreeze();
      });
    } else if (npc.onInteract === 'cutscene-trigger' && npc.interactionData?.sceneKey) {
      this.inputSystem.freeze();
      const sceneKey = npc.interactionData.sceneKey;
      const sceneData = npc.interactionData.sceneData ?? {};

      const triggerCutscene = () => {
        uiManager.hideInteractionPrompt();
        const cam = this.cameras.main;
        this.tweens.add({
          targets: cam,
          alpha: 0,
          duration: 300,
          ease: 'Linear',
          onComplete: () => {
            this.scene.start(sceneKey, sceneData);
          },
        });
      };

      // Show dialog first if lines are present, then trigger cutscene
      if (npc.interactionData.lines?.length) {
        uiManager.showNPCDialog(npc.interactionData.lines, triggerCutscene);
      } else {
        triggerCutscene();
      }
    }
  }

  private buildOverworldTileMap(config: OverworldConfig, mapPxW: number, mapPxH: number): void {
    const rt = this.add.renderTexture(0, 0, mapPxW, mapPxH);
    rt.setOrigin(0, 0);
    rt.setDepth(-50);

    for (let y = 0; y < config.mapHeight; y++) {
      for (let x = 0; x < config.mapWidth; x++) {
        const tileType = config.tileGrid[y][x];
        rt.drawFrame(config.terrainTextureKey, tileType, x * TILE_SIZE, y * TILE_SIZE);
      }
    }
  }

  protected fadeToScene(sceneKey: string, data: any): void {
    uiManager.hideHUD();
    uiManager.hideInteractionPrompt();
    const cam = this.cameras.main;
    this.tweens.add({
      targets: cam,
      alpha: 0,
      duration: 300,
      ease: 'Linear',
      onComplete: () => {
        this.scene.start(sceneKey, data);
      },
    });
  }

  shutdown(): void {
    this.inputSystem?.destroy();
    this.npcSystem?.destroy();
    uiManager.hideHUD();
    uiManager.hideInteractionPrompt();
    uiManager.hideNPCDialog();
  }
}
```

- [ ] **Step 2: Add freeze/unfreeze to InputSystem**

In `src/game/systems/InputSystem.ts`, add a frozen state:

```typescript
private frozen = false;

freeze(): void { this.frozen = true; }
unfreeze(): void { this.frozen = false; }

// At the top of getDirection(), add:
if (this.frozen) return { x: 0, y: 0 };

// In isInteractPressed(), ALWAYS consume touch action even when frozen:
isInteractPressed(): boolean {
  const touch = this.actionPressed;
  this.actionPressed = false; // always consume to prevent queuing
  if (this.frozen) return false;
  return this.interactKey?.isDown || this.spaceKey?.isDown || touch;
}
```

**IMPORTANT:** The touch action must be consumed even when frozen, or it will queue up and fire unexpectedly when unfrozen.

- [ ] **Step 3: Refactor WorldScene to extend OverworldScene**

Rewrite `src/game/scenes/WorldScene.ts` to extend `OverworldScene`. The key change: move scene-specific logic (buildings, decorations, sky, lamp glow, butterflies, HUD, settings, checkpoint handling) into the override methods. The shared logic (tilemap, player, partner, NPC, input, camera) comes from the base class.

```typescript
import { OverworldScene, OverworldConfig } from './OverworldScene';
import { uiManager, CheckpointStatus } from '../../ui/UIManager';
import { TILE_SIZE, MAP_WIDTH, MAP_HEIGHT } from '../../utils/constants';
import {
  tileGrid, DECORATIONS, CHECKPOINT_ZONES, CheckpointZone,
  tileToWorld, isWalkable, NPC_DEFS,
} from '../data/mapLayout';
import { CHECKPOINTS } from '../data/checkpoints';
import { SkyRenderer } from '../rendering/SkyRenderer';
import {
  loadGameState, savePlayerPosition, markCheckpointVisited,
  clearGameState, getPlayerSpawn,
} from '../systems/SaveSystem';

const BUILDINGS = [
  { name: 'restaurant', tileX: 7, tileY: 7, tileW: 3, tileH: 3 },
  { name: 'park-entrance', tileX: 18, tileY: 19, tileW: 3, tileH: 2 },
  { name: 'cinema', tileX: 30, tileY: 7, tileW: 3, tileH: 3 },
  { name: 'michaels-house', tileX: 14, tileY: 3, tileW: 3, tileH: 3 },
];

export class WorldScene extends OverworldScene {
  private skyRenderer!: SkyRenderer;

  constructor() {
    super({ key: 'WorldScene' });
  }

  getConfig(): OverworldConfig {
    const spawn = getPlayerSpawn();
    return {
      mapWidth: MAP_WIDTH,
      mapHeight: MAP_HEIGHT,
      tileGrid,
      walkCheck: isWalkable,
      npcs: NPC_DEFS,
      checkpointZones: CHECKPOINT_ZONES,
      spawnX: spawn.x,
      spawnY: spawn.y,
      terrainTextureKey: 'terrain',
    };
  }

  onCreateExtras(): void {
    // Sky
    this.skyRenderer = new SkyRenderer();
    this.skyRenderer.create(this);

    // Decorations
    const lampPositions: Array<{ x: number; y: number }> = [];
    DECORATIONS.forEach(deco => {
      const pos = tileToWorld(deco.tileX, deco.tileY);
      this.add.image(pos.x, pos.y, `deco-${deco.type}`).setDepth(-10);
      if (deco.type === 'lamp') lampPositions.push(pos);
    });

    // Buildings
    BUILDINGS.forEach(b => {
      const cx = b.tileX * TILE_SIZE + (b.tileW * TILE_SIZE) / 2;
      const cy = b.tileY * TILE_SIZE + (b.tileH * TILE_SIZE) / 2;
      this.add.image(cx, cy, `building-${b.name}`).setDepth(-5);
    });

    // Settings button
    const settingsBtn = document.querySelector('.hud__settings-btn');
    settingsBtn?.addEventListener('click', () => this.openSettings());

    // Ambient
    this.addLampGlow(lampPositions);
    this.addButterflies();
  }

  onShowHUD(): void {
    this.updateHUD();
  }

  onBack(): void {
    this.openSettings();
  }

  onEnterCheckpoint(zone: CheckpointZone): void {
    const pos = this.player.getPosition();
    savePlayerPosition(pos.x, pos.y);

    const interiorSceneMap: Record<string, string> = {
      michaels_house: 'MichaelsHouseScene',
      airport: 'AirportEntranceScene',
    };

    if (interiorSceneMap[zone.id]) {
      this.fadeToScene(interiorSceneMap[zone.id], {
        returnX: pos.x,
        returnY: pos.y,
      });
      return;
    }

    markCheckpointVisited(zone.id);
    const checkpoint = CHECKPOINTS.find(cp => cp.id === zone.id);
    if (!checkpoint) return;
    const sceneMap: Record<string, string> = {
      quiz: 'QuizScene',
      catch: 'CatchScene',
      match: 'MatchScene',
    };
    const sceneKey = sceneMap[checkpoint.miniGame.type];
    if (sceneKey) {
      uiManager.hideHUD();
      uiManager.hideInteractionPrompt();
      this.scene.start(sceneKey, {
        checkpointId: checkpoint.id,
        config: checkpoint.miniGame.config,
      });
    }
  }

  // Keep all private methods: addLampGlow, addButterflies, openSettings, updateHUD
  // (copy them unchanged from the current WorldScene)

  private addLampGlow(lampPositions: Array<{ x: number; y: number }>): void {
    // ... same as current implementation
  }

  private addButterflies(): void {
    // ... same as current implementation
  }

  private openSettings(): void {
    // ... same as current implementation
  }

  private updateHUD(): void {
    // ... same as current implementation
  }

  shutdown(): void {
    super.shutdown();
    this.skyRenderer?.destroy();
  }
}
```

- [ ] **Step 4: Run dev server and verify WorldScene works identically**

Run: `npm run dev`

Full regression test: start new game, walk around, enter Michael's House, exit, visit checkpoints, play minigames, check HUD updates. Everything must work exactly as before.

- [ ] **Step 5: Commit**

```bash
git add src/game/scenes/OverworldScene.ts src/game/scenes/WorldScene.ts src/game/systems/InputSystem.ts
git commit -m "refactor: extract OverworldScene base class from WorldScene"
```

---

## Chunk 4: Airport Textures & Layouts

### Task 7: Generate airport textures

**Files:**
- Create: `src/game/rendering/AirportTextures.ts`
- Modify: `src/game/rendering/PixelArtGenerator.ts` (import and call)
- Modify: `src/game/scenes/BootScene.ts` (if needed)

- [ ] **Step 1: Create AirportTextures.ts**

Create `src/game/rendering/AirportTextures.ts` with all airport-specific texture generation functions. Follow the exact same pattern as existing functions in PixelArtGenerator.ts (canvas 2D drawing, `scene.textures.createCanvas()`).

Textures to generate:

**NPC textures (3 base types with palette support):**
- `npc-ticket-agent` — blue vest (#2244AA), white shirt, 16×16
- `npc-traveler` — casual: tan jacket (#C3A080), dark pants, 16×16
- `npc-traveler-2` — recolor: red top (#CC4444), blue pants, 16×16
- `npc-security-guard` — dark blue (#1A1A4E) uniform, gold badge, 16×16
- `npc-gate-agent` — teal (#008080) vest, white shirt, 16×16
- `npc-cafe-worker` — brown apron (#8B4513), green shirt, 16×16

**Building:**
- `building-airport` — 96×64 terminal facade (gray #8A8A8A walls, blue #2244AA roof accent, glass doors)

**Interior decorations (32×32 unless noted):**
- `airport-counter` — check-in desk (gray top, dark front)
- `airport-bench` — metal waiting bench (64×32)
- `airport-conveyor-belt` — dark gray belt with silver edges
- `airport-metal-detector` — gray arch frame (32×48)
- `airport-rope-barrier` — gold post with red rope
- `airport-departures-board` — black board with colored dots (64×32)
- `airport-window` — frame with blue sky fill
- `airport-gate-desk` — small podium desk
- `airport-bin` — security tray (32×16)
- `airport-cafe-counter` — wood counter with coffee machine detail
- `airport-stool` — bar stool (16×32)
- `airport-cafe-menu` — wall-mounted menu board
- `airport-plant` — potted plant (16×32)
- `airport-luggage-cart` — cart with suitcases

**Signs (32×16):**
- `sign-departures` — blue rect with white right arrow
- `sign-gate` — blue rect with gate icon
- `sign-security` — blue rect with shield icon
- `sign-cafe` — brown rect with coffee cup icon
- `sign-gate-number` — blue rect with "G7" text

Export a single `generateAirportTextures(scene: Phaser.Scene): void` function.

- [ ] **Step 2: Wire into PixelArtGenerator**

In `src/game/rendering/PixelArtGenerator.ts`, import and call:

```typescript
import { generateAirportTextures } from './AirportTextures';

export function generateAllTextures(scene: Phaser.Scene): void {
  generateTerrain(scene);
  generateInteriorTerrain(scene);
  generateInteriorFurniture(scene);
  generateCharacterOutfits(scene);
  generateNPCs(scene);
  generateBuildings(scene);
  generateDecorations(scene);
  generateCatchItems(scene);
  generateMatchCards(scene);
  generateSky(scene);
  generateAirportTextures(scene);   // NEW
}
```

- [ ] **Step 3: Verify textures load without errors**

Run: `npm run dev`

Open browser console — no texture errors. The textures exist but aren't used by any scene yet.

- [ ] **Step 4: Commit**

```bash
git add src/game/rendering/AirportTextures.ts src/game/rendering/PixelArtGenerator.ts
git commit -m "feat: add airport texture generation"
```

### Task 8: Define airport room layouts

**Files:**
- Create: `src/game/scenes/airport/airportLayouts.ts`

- [ ] **Step 1: Create airport layout definitions**

Create `src/game/scenes/airport/airportLayouts.ts` following the exact pattern of `interiorLayouts.ts`:

```typescript
import { InteriorLayout, FloorZone, InteriorDecoration, ExitZone } from '../../data/interiorLayouts';

// Reuse buildWallGrid helper — either import it or inline it.
// Since buildWallGrid is not exported from interiorLayouts.ts, we need to either:
// a) Export it from interiorLayouts.ts, or
// b) Duplicate it here.
// Option (a) is cleaner — export buildWallGrid from interiorLayouts.ts.

function buildWallGrid(
  mapW: number, mapH: number,
  rooms: Array<{ x: number; y: number; w: number; h: number }>,
  doorways: Array<{ x: number; y: number; width: number; height: number }>,
): boolean[][] {
  // ... same implementation as interiorLayouts.ts
}

export const AIRPORT_ENTRANCE_LAYOUT: InteriorLayout = {
  id: 'airport_entrance',
  widthInTiles: 20,
  heightInTiles: 14,
  wallGrid: buildWallGrid(20, 14,
    [{ x: 0, y: 0, w: 20, h: 14 }],
    [] // single room, no internal doorways
  ),
  floors: [
    { tileX: 1, tileY: 1, width: 18, height: 12, floorType: 'tile_floor' },
    { tileX: 5, tileY: 6, width: 10, height: 5, floorType: 'carpet_beige' },
  ],
  decorations: [
    // Check-in counters (top wall)
    { tileX: 4, tileY: 2, type: 'airport-counter' },
    { tileX: 7, tileY: 2, type: 'airport-counter' },
    { tileX: 10, tileY: 2, type: 'airport-counter' },
    { tileX: 13, tileY: 2, type: 'airport-counter' },
    // Departures board
    { tileX: 9, tileY: 1, type: 'airport-departures-board' },
    // Seating
    { tileX: 6, tileY: 7, type: 'airport-bench' },
    { tileX: 12, tileY: 7, type: 'airport-bench' },
    { tileX: 6, tileY: 9, type: 'airport-bench' },
    { tileX: 12, tileY: 9, type: 'airport-bench' },
    // Signs
    { tileX: 17, tileY: 2, type: 'sign-departures' },
    // Atmosphere
    { tileX: 1, tileY: 5, type: 'airport-plant' },
    { tileX: 18, tileY: 5, type: 'airport-plant' },
    { tileX: 2, tileY: 11, type: 'airport-luggage-cart' },
  ],
  entrance: { tileX: 10, tileY: 12 },
  exit: {
    tileX: 9, tileY: 12, width: 3, height: 2,
    promptText: 'Press E to exit airport',
  },
  forwardExit: {
    tileX: 17, tileY: 2, width: 2, height: 2,
    promptText: 'Press E to go to Security',
  },
  nextScene: 'AirportSecurityScene',
  cameraZoom: 2.0,
};

export const AIRPORT_SECURITY_LAYOUT: InteriorLayout = {
  id: 'airport_security',
  widthInTiles: 12,
  heightInTiles: 8,
  wallGrid: buildWallGrid(12, 8,
    [{ x: 0, y: 0, w: 12, h: 8 }],
    []
  ),
  floors: [
    { tileX: 1, tileY: 1, width: 10, height: 6, floorType: 'tile_floor' },
  ],
  decorations: [
    { tileX: 4, tileY: 3, type: 'airport-conveyor-belt' },
    { tileX: 6, tileY: 3, type: 'airport-conveyor-belt' },
    { tileX: 7, tileY: 5, type: 'airport-metal-detector' },
    { tileX: 3, tileY: 2, type: 'airport-rope-barrier' },
    { tileX: 3, tileY: 4, type: 'airport-rope-barrier' },
    { tileX: 9, tileY: 1, type: 'sign-gate' },
    { tileX: 3, tileY: 3, type: 'airport-bin' },
    { tileX: 8, tileY: 3, type: 'airport-bin' },
  ],
  entrance: { tileX: 2, tileY: 4 },
  exit: {
    tileX: 1, tileY: 4, width: 2, height: 2,
    promptText: 'Press E to return to Check-in',
  },
  forwardExit: {
    tileX: 9, tileY: 4, width: 2, height: 2,
    promptText: 'Press E to go to Gates',
  },
  nextScene: 'AirportGateScene',
  previousScene: 'AirportEntranceScene',
  cameraZoom: 2.0,
};

export const AIRPORT_GATE_LAYOUT: InteriorLayout = {
  id: 'airport_gate',
  widthInTiles: 22,
  heightInTiles: 14,
  wallGrid: buildWallGrid(22, 14,
    [{ x: 0, y: 0, w: 22, h: 14 }],
    []
  ),
  floors: [
    // Cafe area (left)
    { tileX: 1, tileY: 1, width: 9, height: 12, floorType: 'wood' },
    // Gate waiting area (right)
    { tileX: 10, tileY: 1, width: 11, height: 12, floorType: 'tile_floor' },
  ],
  decorations: [
    // Cafe section
    { tileX: 3, tileY: 2, type: 'airport-cafe-counter' },
    { tileX: 5, tileY: 2, type: 'airport-cafe-counter' },
    { tileX: 7, tileY: 2, type: 'airport-cafe-counter' },
    { tileX: 4, tileY: 4, type: 'airport-stool' },
    { tileX: 6, tileY: 4, type: 'airport-stool' },
    { tileX: 5, tileY: 1, type: 'airport-cafe-menu' },
    { tileX: 2, tileY: 1, type: 'sign-cafe' },
    // Gate waiting area
    { tileX: 12, tileY: 6, type: 'airport-bench' },
    { tileX: 17, tileY: 6, type: 'airport-bench' },
    { tileX: 12, tileY: 9, type: 'airport-bench' },
    { tileX: 17, tileY: 9, type: 'airport-bench' },
    // Windows (top wall)
    { tileX: 12, tileY: 1, type: 'airport-window' },
    { tileX: 15, tileY: 1, type: 'airport-window' },
    { tileX: 18, tileY: 1, type: 'airport-window' },
    // Gate desk
    { tileX: 19, tileY: 2, type: 'airport-gate-desk' },
    { tileX: 19, tileY: 1, type: 'sign-gate-number' },
  ],
  entrance: { tileX: 1, tileY: 7 },
  exit: {
    tileX: 1, tileY: 6, width: 1, height: 3,
    promptText: 'Press E to return to Security',
  },
  // No forwardExit — cutscene is triggered by gate agent NPC
  previousScene: 'AirportSecurityScene',
  cameraZoom: 1.8,
};
```

- [ ] **Step 2: Export buildWallGrid from interiorLayouts.ts**

In `src/game/data/interiorLayouts.ts`, add `export` to the `buildWallGrid` function, then import it in `airportLayouts.ts` instead of duplicating.

- [ ] **Step 3: Commit**

```bash
git add src/game/scenes/airport/airportLayouts.ts src/game/data/interiorLayouts.ts
git commit -m "feat: define airport room layouts"
```

---

## Chunk 5: Airport Scenes

### Task 9: Create the 3 airport InteriorScene subclasses

**Files:**
- Create: `src/game/scenes/airport/AirportEntranceScene.ts`
- Create: `src/game/scenes/airport/AirportSecurityScene.ts`
- Create: `src/game/scenes/airport/AirportGateScene.ts`

- [ ] **Step 1: Create AirportEntranceScene**

```typescript
import { InteriorScene } from '../InteriorScene';
import { InteriorLayout } from '../../data/interiorLayouts';
import { AIRPORT_ENTRANCE_LAYOUT } from './airportLayouts';
import { NPCSystem } from '../../systems/NPCSystem';
import { NPCDef } from '../../data/mapLayout';
import { uiManager } from '../../../ui/UIManager';
import { saveCurrentScene } from '../../systems/SaveSystem';

const ENTRANCE_NPCS: NPCDef[] = [
  {
    id: 'ticket-agent-1', tileX: 5, tileY: 3, behavior: 'idle',
    texture: 'npc-ticket-agent',
    interactable: true, onInteract: 'dialog',
    interactionData: { lines: ['Welcome to Witchy Airlines!', 'Where would you like to go today?', 'Maui flights depart from Gate 7. Head through security!'] },
  },
  {
    id: 'ticket-agent-2', tileX: 13, tileY: 3, behavior: 'idle',
    texture: 'npc-ticket-agent',
    interactable: true, onInteract: 'dialog',
    interactionData: { lines: ['Our tropical destinations are very popular!', 'Check the departures board for flight times.'] },
  },
  { id: 'traveler-1', tileX: 7, tileY: 8, behavior: 'sit', texture: 'npc-traveler' },
  { id: 'traveler-2', tileX: 11, tileY: 8, behavior: 'sit', texture: 'npc-traveler-2' },
  {
    id: 'traveler-walk-1', tileX: 4, tileY: 11, behavior: 'walk', texture: 'npc-traveler',
    walkPath: [{ x: 4, y: 11 }, { x: 15, y: 11 }],
  },
  {
    id: 'traveler-walk-2', tileX: 15, tileY: 5, behavior: 'walk', texture: 'npc-traveler-2',
    walkPath: [{ x: 15, y: 5 }, { x: 15, y: 10 }],
  },
];

export class AirportEntranceScene extends InteriorScene {
  private npcSystem!: NPCSystem;

  constructor() {
    super({ key: 'AirportEntranceScene' });
  }

  getLayout(): InteriorLayout {
    return AIRPORT_ENTRANCE_LAYOUT;
  }

  create(): void {
    super.create();
    saveCurrentScene('AirportEntranceScene');

    // NPCs
    this.npcSystem = new NPCSystem();
    this.npcSystem.create(this, ENTRANCE_NPCS);
  }

  update(time: number, delta: number): void {
    super.update(time, delta);
    const pos = this.player.getPosition();
    this.npcSystem.update(delta, pos.x, pos.y);
  }

  protected onInteractPressed(): boolean {
    const npc = this.npcSystem.getInteractableInRange();
    if (npc && npc.onInteract === 'dialog' && npc.interactionData?.lines) {
      this.inputSystem.freeze();
      uiManager.showNPCDialog(npc.interactionData.lines, () => {
        this.inputSystem.unfreeze();
      });
      return true;
    }
    return false;
  }

  shutdown(): void {
    super.shutdown();
    this.npcSystem?.destroy();
  }
}
```

- [ ] **Step 2: Create AirportSecurityScene**

```typescript
import { InteriorScene } from '../InteriorScene';
import { InteriorLayout } from '../../data/interiorLayouts';
import { AIRPORT_SECURITY_LAYOUT } from './airportLayouts';
import { NPCSystem } from '../../systems/NPCSystem';
import { NPCDef } from '../../data/mapLayout';
import { uiManager } from '../../../ui/UIManager';

const SECURITY_NPCS: NPCDef[] = [
  {
    id: 'security-guard', tileX: 8, tileY: 5, behavior: 'idle',
    texture: 'npc-security-guard',
    interactable: true, onInteract: 'dialog',
    interactionData: { lines: ['Have a safe flight!', 'Please proceed to the gates.'] },
  },
  {
    id: 'traveler-queue', tileX: 4, tileY: 2, behavior: 'walk', texture: 'npc-traveler',
    walkPath: [{ x: 4, y: 2 }, { x: 7, y: 2 }],
  },
];

export class AirportSecurityScene extends InteriorScene {
  private npcSystem!: NPCSystem;

  constructor() {
    super({ key: 'AirportSecurityScene' });
  }

  getLayout(): InteriorLayout {
    return AIRPORT_SECURITY_LAYOUT;
  }

  create(): void {
    super.create();
    this.npcSystem = new NPCSystem();
    this.npcSystem.create(this, SECURITY_NPCS);
  }

  update(time: number, delta: number): void {
    super.update(time, delta);
    const pos = this.player.getPosition();
    this.npcSystem.update(delta, pos.x, pos.y);

    if (this.inputSystem.isInteractPressed()) {
      const npc = this.npcSystem.getInteractableInRange();
      if (npc && npc.onInteract === 'dialog' && npc.interactionData?.lines) {
        this.inputSystem.freeze();
        uiManager.showNPCDialog(npc.interactionData.lines, () => {
          this.inputSystem.unfreeze();
        });
      }
    }
  }

  shutdown(): void {
    super.shutdown();
    this.npcSystem?.destroy();
  }
}
```

- [ ] **Step 3: Create AirportGateScene**

This one is special — the gate agent triggers the cutscene via NPC interaction, not an exit zone.

```typescript
import { InteriorScene } from '../InteriorScene';
import { InteriorLayout } from '../../data/interiorLayouts';
import { AIRPORT_GATE_LAYOUT } from './airportLayouts';
import { NPCSystem } from '../../systems/NPCSystem';
import { NPCDef } from '../../data/mapLayout';
import { uiManager } from '../../../ui/UIManager';

const GATE_NPCS: NPCDef[] = [
  {
    id: 'gate-agent', tileX: 19, tileY: 3, behavior: 'idle',
    texture: 'npc-gate-agent',
    interactable: true, onInteract: 'dialog',
    interactionData: {
      lines: ['Flight to Maui is now boarding!', 'Ready to board?'],
    },
  },
  {
    id: 'cafe-worker', tileX: 5, tileY: 3, behavior: 'idle',
    texture: 'npc-cafe-worker',
    interactable: true, onInteract: 'dialog',
    interactionData: { lines: ['Welcome to Sky Cafe!', 'Can I get you a coffee for the flight?'] },
  },
  {
    id: 'shopkeeper', tileX: 2, tileY: 8, behavior: 'idle',
    texture: 'npc-shopkeeper',
    interactable: true, onInteract: 'dialog',
    interactionData: { lines: ['Looking for souvenirs?', 'Come back after your trip!'] },
  },
  { id: 'traveler-sit-1', tileX: 13, tileY: 7, behavior: 'sit', texture: 'npc-traveler' },
  { id: 'traveler-sit-2', tileX: 18, tileY: 7, behavior: 'sit', texture: 'npc-traveler-2' },
  { id: 'traveler-sit-3', tileX: 13, tileY: 10, behavior: 'sit', texture: 'npc-traveler' },
  {
    id: 'traveler-walk-gate', tileX: 11, tileY: 11, behavior: 'walk', texture: 'npc-traveler-2',
    walkPath: [{ x: 11, y: 11 }, { x: 19, y: 11 }],
  },
];

export class AirportGateScene extends InteriorScene {
  private npcSystem!: NPCSystem;
  private boardingTriggered = false;

  constructor() {
    super({ key: 'AirportGateScene' });
  }

  getLayout(): InteriorLayout {
    return AIRPORT_GATE_LAYOUT;
  }

  create(): void {
    super.create();
    this.boardingTriggered = false;
    this.npcSystem = new NPCSystem();
    this.npcSystem.create(this, GATE_NPCS);
  }

  update(time: number, delta: number): void {
    super.update(time, delta);
    const pos = this.player.getPosition();
    this.npcSystem.update(delta, pos.x, pos.y);
  }

  protected onInteractPressed(): boolean {
    if (this.boardingTriggered) return false;
    const npc = this.npcSystem.getInteractableInRange();
    if (!npc) return false;

    if (npc.id === 'gate-agent') {
      // Gate agent triggers boarding dialog, then cutscene
      this.inputSystem.freeze();
      uiManager.showNPCDialog(npc.interactionData!.lines!, () => {
        this.boardingTriggered = true;
        this.startBoarding();
      });
      return true;
    } else if (npc.onInteract === 'dialog' && npc.interactionData?.lines) {
      this.inputSystem.freeze();
      uiManager.showNPCDialog(npc.interactionData.lines, () => {
        this.inputSystem.unfreeze();
      });
      return true;
    }
    return false;
  }

  private startBoarding(): void {
    uiManager.hideInteractionPrompt();
    const cam = this.cameras.main;
    this.tweens.add({
      targets: cam,
      alpha: 0,
      duration: 500,
      ease: 'Linear',
      onComplete: () => {
        this.scene.start('AirplaneCutscene', { destination: 'maui' });
      },
    });
  }

  shutdown(): void {
    super.shutdown();
    this.npcSystem?.destroy();
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add src/game/scenes/airport/
git commit -m "feat: create airport entrance, security, and gate scenes"
```

### Task 10: Add airport building and checkpoint zone to WorldScene

**Files:**
- Modify: `src/game/data/mapLayout.ts` (add airport checkpoint zone, walkGrid block)
- Modify: `src/game/scenes/WorldScene.ts` (add airport to building list and interior scene map)

- [ ] **Step 1: Add airport checkpoint zone and building footprint**

In `src/game/data/mapLayout.ts`:

1. Add airport building footprint to walkGrid (around y=24-26, x=32-34 — bottom-right area near the cafe):
```typescript
// Airport building footprint
if (x >= 32 && x <= 34 && y >= 24 && y <= 26) return false;
```

2. Add airport checkpoint zone:
```typescript
{ id: 'airport', tileX: 32, tileY: 23, width: 3, height: 1, promptText: 'Press E to enter airport' },
```

- [ ] **Step 2: Add airport building to WorldScene**

In `src/game/scenes/WorldScene.ts`, add to the BUILDINGS array:
```typescript
{ name: 'airport', tileX: 32, tileY: 24, tileW: 3, tileH: 3 },
```

The `interiorSceneMap` in `onEnterCheckpoint` already has `airport: 'AirportEntranceScene'` from the refactor (Task 6 Step 3).

- [ ] **Step 3: Register airport scenes in main.ts**

In `src/main.ts`:
```typescript
import { AirportEntranceScene } from './game/scenes/airport/AirportEntranceScene';
import { AirportSecurityScene } from './game/scenes/airport/AirportSecurityScene';
import { AirportGateScene } from './game/scenes/airport/AirportGateScene';

// Add to scene array:
scene: [BootScene, DressingRoomScene, WorldScene, MichaelsHouseScene,
        AirportEntranceScene, AirportSecurityScene, AirportGateScene,
        QuizScene, CatchScene, MatchScene],
```

- [ ] **Step 4: Run and test airport flow**

Run: `npm run dev`

1. Walk to airport building in overworld
2. Press E to enter → should fade to AirportEntranceScene
3. Walk to forward exit → should transition to AirportSecurityScene
4. Walk through security to forward exit → should transition to AirportGateScene
5. Talk to gate agent → dialog should show, then boarding not yet (cutscene not built yet — will just error, that's OK)
6. Press ESC or walk to back exit → should return to previous rooms
7. Exit from AirportEntrance back door → should return to WorldScene

- [ ] **Step 5: Commit**

```bash
git add src/game/data/mapLayout.ts src/game/scenes/WorldScene.ts src/main.ts
git commit -m "feat: add airport building to world map and register airport scenes"
```

---

## Chunk 6: Airplane Cutscene

### Task 11: Create AirplaneCutscene scene

**Files:**
- Create: `src/game/scenes/airport/AirplaneCutscene.ts`
- Modify: `src/game/rendering/AirportTextures.ts` (add airplane sprites)
- Modify: `src/main.ts` (register scene)

- [ ] **Step 1: Add airplane textures to AirportTextures.ts**

Add these texture generation functions to `AirportTextures.ts`:

- `airplane-exterior` — 128×48, white fuselage, blue tail, windows, wings
- `airplane-cabin-bg` — 800×600, interior view (seat rows, overhead bins, windows on sides)
- `cloud-1` — 64×32, white fluffy cloud
- `cloud-2` — 48×24, smaller cloud
- `cloud-3` — 80×40, large cloud
- `runway` — 800×64, gray with white dashed center line
- `ground-strip` — 800×200, green ground fading to horizon

- [ ] **Step 2: Create AirplaneCutscene.ts**

```typescript
import Phaser from 'phaser';
import { loadGameState } from '../../systems/SaveSystem';
import { saveCurrentScene } from '../../systems/SaveSystem';

interface CutsceneData {
  destination: 'maui' | 'home';
}

export class AirplaneCutscene extends Phaser.Scene {
  private destination!: string;

  constructor() {
    super({ key: 'AirplaneCutscene' });
  }

  init(data: CutsceneData): void {
    this.destination = data.destination ?? 'maui';
  }

  create(): void {
    const { width, height } = this.scale;
    const state = loadGameState();

    // Phase 1: Takeoff (3s)
    // Blue sky background
    const sky = this.add.rectangle(width / 2, height / 2, width, height, 0x87CEEB);
    sky.setAlpha(0);

    // Ground
    const ground = this.add.rectangle(width / 2, height - 50, width, 200, 0x4a7c4f);
    ground.setAlpha(0);

    // Runway
    const runway = this.add.image(width / 2, height - 30, 'runway');
    runway.setAlpha(0);

    // Airplane
    const plane = this.add.image(width / 2, height - 80, 'airplane-exterior');
    plane.setAlpha(0);
    plane.setScale(1);

    // Phase 2: Interior elements (created but hidden)
    const cabinBg = this.add.image(width / 2, height / 2, 'airplane-cabin-bg');
    cabinBg.setAlpha(0);
    cabinBg.setDisplaySize(width, height);

    // Seated characters — use idle frame (frame 0) of player/partner outfits
    const playerOutfit = `player-outfit-${state.outfits.player}`;
    const partnerOutfit = `partner-outfit-${state.outfits.partner}`;
    const seatY = height * 0.55;
    const playerSprite = this.add.sprite(width * 0.42, seatY, playerOutfit, 0);
    const partnerSprite = this.add.sprite(width * 0.58, seatY, partnerOutfit, 0);
    playerSprite.setAlpha(0).setScale(2);
    partnerSprite.setAlpha(0).setScale(2);

    // Clouds for window scrolling
    const clouds: Phaser.GameObjects.Image[] = [];
    for (let i = 0; i < 6; i++) {
      const cloudKey = `cloud-${(i % 3) + 1}`;
      const cloud = this.add.image(
        width + 100 + i * 200,
        100 + Math.random() * (height - 200),
        cloudKey
      );
      cloud.setAlpha(0);
      clouds.push(cloud);
    }

    // Whiteout overlay
    const whiteout = this.add.rectangle(width / 2, height / 2, width, height, 0xffffff);
    whiteout.setAlpha(0).setDepth(100);

    // Landing elements
    const landGround = this.add.rectangle(width / 2, height, width, 300, 0x2d8a4e);
    landGround.setAlpha(0);

    // === ANIMATION TIMELINE ===

    // Phase 1: Takeoff (0-3s)
    this.tweens.add({ targets: [sky, ground, runway, plane], alpha: 1, duration: 500 });

    this.time.delayedCall(500, () => {
      // Plane takes off
      this.tweens.add({
        targets: plane,
        y: height * 0.3,
        x: width * 0.6,
        duration: 2000,
        ease: 'Quad.easeIn',
      });
      this.tweens.add({
        targets: ground,
        y: height + 200,
        scaleY: 0.5,
        duration: 2000,
        ease: 'Quad.easeIn',
      });
      this.tweens.add({
        targets: runway,
        y: height + 100,
        alpha: 0,
        duration: 1500,
      });
    });

    // Phase 2: Interior (3-7s)
    this.time.delayedCall(3000, () => {
      // Fade out exterior
      this.tweens.add({ targets: [sky, ground, plane], alpha: 0, duration: 500 });
      // Fade in interior
      this.tweens.add({
        targets: [cabinBg, playerSprite, partnerSprite],
        alpha: 1,
        duration: 500,
        delay: 300,
      });
      // Show and scroll clouds
      clouds.forEach(cloud => {
        cloud.setAlpha(0.8);
        this.tweens.add({
          targets: cloud,
          x: -200,
          duration: 4000 + Math.random() * 2000,
          ease: 'Linear',
        });
      });
      // Slight camera shake for turbulence
      this.time.delayedCall(1500, () => {
        this.cameras.main.shake(500, 0.002);
      });
    });

    // Phase 3: Cloud whiteout (7-9s)
    this.time.delayedCall(7000, () => {
      this.tweens.add({
        targets: whiteout,
        alpha: 1,
        duration: 2000,
        ease: 'Quad.easeIn',
      });
    });

    // Phase 4: Landing (9-12s)
    this.time.delayedCall(9000, () => {
      // Hide interior
      cabinBg.setAlpha(0);
      playerSprite.setAlpha(0);
      partnerSprite.setAlpha(0);
      clouds.forEach(c => c.setAlpha(0));

      // Show landing elements
      const landSky = this.add.rectangle(width / 2, height / 2, width, height, 0x87CEEB);
      landSky.setDepth(90);
      landGround.setDepth(91).setAlpha(1).setY(height + 100);
      whiteout.setDepth(100);

      // Plane descending
      const landPlane = this.add.image(width / 2, -50, 'airplane-exterior');
      landPlane.setDepth(92).setScale(0.5);

      this.tweens.add({ targets: whiteout, alpha: 0, duration: 500 });

      this.tweens.add({
        targets: landPlane,
        y: height * 0.5,
        scaleX: 1.2,
        scaleY: 1.2,
        duration: 2000,
        ease: 'Quad.easeOut',
      });

      this.tweens.add({
        targets: landGround,
        y: height - 50,
        duration: 2000,
        ease: 'Quad.easeOut',
      });

      // Touchdown shake
      this.time.delayedCall(2000, () => {
        this.cameras.main.shake(300, 0.005);
      });
    });

    // Phase 5: Fade to destination (12s)
    this.time.delayedCall(12000, () => {
      const cam = this.cameras.main;
      this.tweens.add({
        targets: cam,
        alpha: 0,
        duration: 500,
        onComplete: () => {
          if (this.destination === 'maui') {
            saveCurrentScene('MauiOverworldScene');
            this.scene.start('MauiOverworldScene');
          } else {
            saveCurrentScene('WorldScene');
            this.scene.start('WorldScene');
          }
        },
      });
    });
  }
}
```

- [ ] **Step 3: Register AirplaneCutscene in main.ts**

```typescript
import { AirplaneCutscene } from './game/scenes/airport/AirplaneCutscene';
// Add to scene array
```

- [ ] **Step 4: Test the full airport → cutscene flow**

Run: `npm run dev`

Walk to airport → navigate rooms → talk to gate agent → watch cutscene. It should play all 4 phases (~12s) then try to start MauiOverworldScene (which doesn't exist yet — will error, that's expected).

- [ ] **Step 5: Commit**

```bash
git add src/game/scenes/airport/AirplaneCutscene.ts src/game/rendering/AirportTextures.ts src/main.ts
git commit -m "feat: create airplane cutscene with 4-phase animation"
```

---

## Chunk 7: Maui Destination

### Task 12: Generate Maui textures

**Files:**
- Create: `src/game/rendering/MauiTextures.ts`
- Modify: `src/game/rendering/PixelArtGenerator.ts`

- [ ] **Step 1: Create MauiTextures.ts**

Generate all Maui-specific textures:

**Terrain tiles (add to terrain spritesheet or create new 'maui-terrain'):**
- `tile-sand` — warm yellow (#F4D03F, slight noise/grain)
- `tile-sandstone` — tan (#DEB887)
- `tile-shallow-water` — light blue (#5DADE2, wave pattern)
- `tile-ocean` — deep blue (#2E86C1, darker wave pattern)

**NPC textures:**
- `npc-maui-local` — Hawaiian shirt (floral: green #228B22 base, pink/yellow dots), shorts
- `npc-surfer` — board shorts (#20B2AA), tanned, no shirt
- `npc-maui-shopkeeper` — colorful market vendor (purple #800080, yellow #FFD700)

**Decorations:**
- `deco-palm-tree` — 32×64, brown trunk, green fronds at top
- `deco-beach-umbrella` — colorful striped parasol, 32×32
- `deco-beach-towel` — flat colored rectangle, 32×16
- `deco-surfboard` — standing surfboard, 16×48
- `deco-maui-market-stall` — wooden stall with cloth top, 64×48
- `deco-maui-fountain` — stone fountain, 32×32
- `deco-maui-flower-pot` — terracotta pot, 16×16

**Buildings:**
- `building-maui-shop` — small tropical shop, 64×64
- `building-maui-house` — small island house, 64×64
- `building-maui-airport` — small tropical terminal, 96×64

Export `generateMauiTextures(scene: Phaser.Scene): void`.

- [ ] **Step 2: Wire into PixelArtGenerator**

```typescript
import { generateMauiTextures } from './MauiTextures';

// In generateAllTextures:
generateMauiTextures(scene);
```

- [ ] **Step 3: Commit**

```bash
git add src/game/rendering/MauiTextures.ts src/game/rendering/PixelArtGenerator.ts
git commit -m "feat: add Maui texture generation"
```

### Task 13: Create MauiOverworldScene

**Files:**
- Create: `src/game/scenes/maui/MauiOverworldScene.ts`
- Create: `src/game/scenes/maui/mauiMap.ts`
- Modify: `src/main.ts` (register scene)

- [ ] **Step 1: Create mauiMap.ts with tile grid, walk grid, NPCs, and decorations**

```typescript
import { TILE_SIZE } from '../../../utils/constants';
import { NPCDef, CheckpointZone } from '../../data/mapLayout';

export const MAUI_WIDTH = 30;  // tiles
export const MAUI_HEIGHT = 24; // tiles

// Tile types for Maui terrain spritesheet
export const enum MauiTileType {
  Sand = 0,
  SandStone = 1,
  Stone = 2,
  ShallowWater = 3,
  Ocean = 4,
  Grass = 5,
}

// 30x24 tile grid
export const mauiTileGrid: number[][] = Array.from({ length: MAUI_HEIGHT }, (_, y) => {
  return Array.from({ length: MAUI_WIDTH }, (_, x) => {
    // Ocean (impassable, bottom rows)
    if (y >= 20) return MauiTileType.Ocean;
    // Shallow water
    if (y >= 18 && y < 20) return MauiTileType.ShallowWater;
    // Beach
    if (y >= 14 && y < 18) return MauiTileType.Sand;
    // Path between town and beach
    if (y >= 11 && y < 14 && x >= 12 && x <= 17) return MauiTileType.Stone;
    // Town zone
    if (y >= 3 && y < 11) {
      // Stone paths
      if (x >= 3 && x <= 26 && (y === 5 || y === 9)) return MauiTileType.Stone;
      if ((x === 10 || x === 20) && y >= 5 && y <= 9) return MauiTileType.Stone;
      // Building areas
      if (x >= 4 && x <= 8 && y >= 6 && y <= 8) return MauiTileType.SandStone;
      if (x >= 12 && x <= 16 && y >= 6 && y <= 8) return MauiTileType.SandStone;
      if (x >= 22 && x <= 27 && y >= 6 && y <= 8) return MauiTileType.SandStone;
      return MauiTileType.Grass;
    }
    // Top area (grass border)
    return MauiTileType.Grass;
  });
});

export const mauiWalkGrid: boolean[][] = Array.from({ length: MAUI_HEIGHT }, (_, y) => {
  return Array.from({ length: MAUI_WIDTH }, (_, x) => {
    if (x <= 0 || x >= MAUI_WIDTH - 1 || y <= 0 || y >= MAUI_HEIGHT - 1) return false;
    // Ocean and shallow water
    if (y >= 18) return false;
    // Building footprints
    if (x >= 5 && x <= 7 && y >= 6 && y <= 7) return false; // maui shop
    if (x >= 13 && x <= 15 && y >= 6 && y <= 7) return false; // maui house
    if (x >= 23 && x <= 26 && y >= 6 && y <= 8) return false; // maui airport
    return true;
  });
});

export function isMauiWalkable(tileX: number, tileY: number): boolean {
  if (tileX < 0 || tileX >= MAUI_WIDTH || tileY < 0 || tileY >= MAUI_HEIGHT) return false;
  return mauiWalkGrid[tileY][tileX];
}

export const MAUI_DECORATIONS = [
  // Beach
  { type: 'palm-tree', tileX: 2, tileY: 14 },
  { type: 'palm-tree', tileX: 10, tileY: 14 },
  { type: 'palm-tree', tileX: 20, tileY: 14 },
  { type: 'palm-tree', tileX: 27, tileY: 14 },
  { type: 'beach-umbrella', tileX: 5, tileY: 16 },
  { type: 'beach-umbrella', tileX: 15, tileY: 16 },
  { type: 'beach-umbrella', tileX: 22, tileY: 15 },
  { type: 'beach-towel', tileX: 6, tileY: 17 },
  { type: 'beach-towel', tileX: 16, tileY: 17 },
  { type: 'surfboard', tileX: 8, tileY: 15 },
  // Town
  { type: 'maui-market-stall', tileX: 8, tileY: 9 },
  { type: 'maui-fountain', tileX: 15, tileY: 5 },
  { type: 'maui-flower-pot', tileX: 4, tileY: 5 },
  { type: 'maui-flower-pot', tileX: 18, tileY: 5 },
  { type: 'maui-flower-pot', tileX: 12, tileY: 9 },
];

export const MAUI_BUILDINGS = [
  { name: 'maui-shop', tileX: 5, tileY: 6, tileW: 3, tileH: 2 },
  { name: 'maui-house', tileX: 13, tileY: 6, tileW: 3, tileH: 2 },
  { name: 'maui-airport', tileX: 23, tileY: 6, tileW: 4, tileH: 3 },
];

export const MAUI_NPCS: NPCDef[] = [
  {
    id: 'maui-shopkeeper', tileX: 9, tileY: 9, behavior: 'idle',
    texture: 'npc-maui-shopkeeper',
    interactable: true, onInteract: 'dialog',
    interactionData: { lines: ['Aloha! Welcome to Maui!', 'Check out our local crafts!'] },
  },
  {
    id: 'maui-airport-agent', tileX: 24, tileY: 9, behavior: 'idle',
    texture: 'npc-ticket-agent',
    interactable: true, onInteract: 'cutscene-trigger',
    interactionData: {
      sceneKey: 'AirplaneCutscene',
      sceneData: { destination: 'home' },
      lines: ['Ready to fly home?'],
    },
  },
  {
    id: 'surfer', tileX: 9, tileY: 15, behavior: 'idle',
    texture: 'npc-surfer',
    interactable: true, onInteract: 'dialog',
    interactionData: { lines: ['Surf is up, dude!', 'Best waves on the island right here.'] },
  },
  {
    id: 'maui-local-1', tileX: 16, tileY: 5, behavior: 'walk', texture: 'npc-maui-local',
    walkPath: [{ x: 12, y: 5 }, { x: 20, y: 5 }],
  },
  {
    id: 'maui-local-2', tileX: 6, tileY: 9, behavior: 'walk', texture: 'npc-maui-local',
    walkPath: [{ x: 4, y: 9 }, { x: 10, y: 9 }],
  },
  { id: 'beachgoer-1', tileX: 7, tileY: 17, behavior: 'sit', texture: 'npc-traveler' },
  { id: 'beachgoer-2', tileX: 17, tileY: 17, behavior: 'sit', texture: 'npc-traveler-2' },
];

export const MAUI_CHECKPOINT_ZONES: CheckpointZone[] = [
  // Return flight trigger zone near maui airport
  // (Actually handled by NPC interaction, not checkpoint zone. Leave empty for now.)
];
```

- [ ] **Step 2: Create MauiOverworldScene.ts**

```typescript
import { OverworldScene, OverworldConfig } from '../OverworldScene';
import { TILE_SIZE } from '../../../utils/constants';
import { tileToWorld, CheckpointZone } from '../../data/mapLayout';
import { saveCurrentScene } from '../../systems/SaveSystem';
import {
  MAUI_WIDTH, MAUI_HEIGHT, mauiTileGrid, isMauiWalkable,
  MAUI_NPCS, MAUI_CHECKPOINT_ZONES, MAUI_DECORATIONS, MAUI_BUILDINGS,
} from './mauiMap';

export class MauiOverworldScene extends OverworldScene {
  constructor() {
    super({ key: 'MauiOverworldScene' });
  }

  getConfig(): OverworldConfig {
    return {
      mapWidth: MAUI_WIDTH,
      mapHeight: MAUI_HEIGHT,
      tileGrid: mauiTileGrid,
      walkCheck: isMauiWalkable,
      npcs: MAUI_NPCS,
      checkpointZones: MAUI_CHECKPOINT_ZONES,
      spawnX: 24 * TILE_SIZE + TILE_SIZE / 2,  // near maui airport
      spawnY: 10 * TILE_SIZE + TILE_SIZE / 2,
      terrainTextureKey: 'maui-terrain',
    };
  }

  create(): void {
    super.create();
    saveCurrentScene('MauiOverworldScene');
  }

  onCreateExtras(): void {
    // Decorations
    MAUI_DECORATIONS.forEach(deco => {
      const pos = tileToWorld(deco.tileX, deco.tileY);
      this.add.image(pos.x, pos.y, `deco-${deco.type}`).setDepth(-10);
    });

    // Buildings
    MAUI_BUILDINGS.forEach(b => {
      const cx = b.tileX * TILE_SIZE + (b.tileW * TILE_SIZE) / 2;
      const cy = b.tileY * TILE_SIZE + (b.tileH * TILE_SIZE) / 2;
      this.add.image(cx, cy, `building-${b.name}`).setDepth(-5);
    });
  }

  onEnterCheckpoint(_zone: CheckpointZone): void {
    // No checkpoint zones in Maui for now
    // Return flight is handled by NPC interaction (maui-airport-agent)
  }

  onBack(): void {
    // ESC does nothing special in Maui (no settings menu yet for this scene)
    // Could add a simple "Return home?" prompt later
  }
}
```

- [ ] **Step 3: Register MauiOverworldScene in main.ts**

```typescript
import { MauiOverworldScene } from './game/scenes/maui/MauiOverworldScene';
// Add to scene array
```

- [ ] **Step 4: Test complete flow**

Run: `npm run dev`

1. WorldScene → walk to airport → enter
2. Navigate airport rooms (Entrance → Security → Gate)
3. Talk to gate agent → cutscene plays
4. Cutscene ends → lands in Maui
5. Walk around beach and town zones
6. Talk to surfer, shopkeeper (dialog works)
7. Talk to maui airport agent → triggers return cutscene
8. Return cutscene → back to WorldScene

- [ ] **Step 5: Commit**

```bash
git add src/game/scenes/maui/ src/main.ts
git commit -m "feat: create Maui overworld scene with beach and town zones"
```

---

## Chunk 8: Signage System & Polish

### Task 14: Add sign tooltip system

**Files:**
- Create: `src/ui/SignTooltip.ts`
- Modify: `src/ui/styles/hud.css`

- [ ] **Step 1: Create SignTooltip.ts**

```typescript
import { TILE_SIZE } from '../utils/constants';

export interface SignDef {
  id: string;
  tileX: number;
  tileY: number;
  texture: string;
  tooltipText: string;
}

export class SignTooltip {
  private scene: Phaser.Scene;
  private signs: SignDef[];
  private tooltipEl: HTMLElement | null = null;
  private activeSign: SignDef | null = null;

  constructor(scene: Phaser.Scene, signs: SignDef[]) {
    this.scene = scene;
    this.signs = signs;

    // Place sign sprites in the scene
    signs.forEach(sign => {
      const x = sign.tileX * TILE_SIZE + TILE_SIZE / 2;
      const y = sign.tileY * TILE_SIZE + TILE_SIZE / 2;
      scene.add.image(x, y, sign.texture).setDepth(5);
    });
  }

  update(playerTileX: number, playerTileY: number): void {
    let closest: SignDef | null = null;
    let closestDist = Infinity;

    for (const sign of this.signs) {
      const dx = Math.abs(playerTileX - sign.tileX);
      const dy = Math.abs(playerTileY - sign.tileY);
      const dist = dx + dy; // Manhattan distance
      if (dist <= 2 && dist < closestDist) {
        closest = sign;
        closestDist = dist;
      }
    }

    if (closest && closest !== this.activeSign) {
      this.showTooltip(closest);
    } else if (!closest && this.activeSign) {
      this.hideTooltip();
    }
  }

  private showTooltip(sign: SignDef): void {
    this.hideTooltip();
    this.activeSign = sign;
    this.tooltipEl = document.createElement('div');
    this.tooltipEl.className = 'sign-tooltip';
    this.tooltipEl.id = 'sign-tooltip';
    this.tooltipEl.textContent = sign.tooltipText;
    document.getElementById('ui-layer')?.appendChild(this.tooltipEl);
  }

  private hideTooltip(): void {
    this.activeSign = null;
    document.getElementById('sign-tooltip')?.remove();
    this.tooltipEl = null;
  }

  destroy(): void {
    this.hideTooltip();
  }
}
```

- [ ] **Step 2: Add sign tooltip styles**

In `src/ui/styles/hud.css`, add:

```css
.sign-tooltip {
  position: absolute;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(26, 26, 46, 0.9);
  border: 1px solid #d4a574;
  border-radius: 4px;
  padding: 6px 12px;
  color: #fdf6e3;
  font-family: 'Press Start 2P', monospace;
  font-size: 9px;
  z-index: 150;
  pointer-events: none;
  white-space: nowrap;
}
```

- [ ] **Step 3: Add signs to airport scenes**

In each airport scene's `create()`, create a `SignTooltip` instance with the signs for that room. Update it in `update()`. Clean up in `shutdown()`.

Example for AirportEntranceScene:
```typescript
import { SignTooltip, SignDef } from '../../../ui/SignTooltip';

const ENTRANCE_SIGNS: SignDef[] = [
  { id: 'dep-sign', tileX: 17, tileY: 2, texture: 'sign-departures', tooltipText: 'Departures →' },
];

// In create():
this.signTooltip = new SignTooltip(this, ENTRANCE_SIGNS);

// In update():
const ptile = worldToTile(pos.x, pos.y);
this.signTooltip.update(ptile.x, ptile.y);

// In shutdown():
this.signTooltip?.destroy();
```

- [ ] **Step 4: Commit**

```bash
git add src/ui/SignTooltip.ts src/ui/styles/hud.css src/game/scenes/airport/
git commit -m "feat: add sign tooltip system with airport signage"
```

### Task 15: Final integration test and cleanup

- [ ] **Step 1: Full flow test**

Run: `npm run dev`

Test the complete journey:
1. New game → dressing room → WorldScene
2. Walk to airport building → enter
3. See sign tooltips in airport
4. Talk to ticket agents (dialog)
5. Navigate: Entrance → Security → Gate
6. Talk to gate agent → boarding cutscene
7. Watch all 4 cutscene phases (~12s)
8. Arrive in Maui → explore beach and town
9. Talk to NPCs
10. Talk to maui airport agent → return cutscene
11. Return to WorldScene
12. Save/load test: save in Maui, reload, confirm resume at Maui

- [ ] **Step 2: Fix any issues found during testing**

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "feat: complete airport & Maui destination feature"
```
