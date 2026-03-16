# NPC Trigger Zone Interaction Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace tap/click NPC interaction with passive trigger zone tiles that auto-activate dialogue after a 1-second dwell.

**Architecture:** Each interactable NPC computes a trigger tile one position in front of it (based on facing direction). NPCSystem tracks a per-NPC dwell timer. When the player stands on a trigger tile for 1 second, dialogue fires automatically. A subtle visual indicator on the trigger tile ramps alpha during dwell.

**Tech Stack:** Phaser 3, TypeScript

**Design doc:** `docs/plans/2026-03-16-npc-trigger-zones-design.md`

---

## File Structure

| File | Responsibility | Action |
|---|---|---|
| `src/utils/constants.ts` | Dwell/indicator constants, NPCDef type update | Modify |
| `src/game/data/mapLayout.ts` | Add `facingDirection` to NPCDef interface | Modify |
| `src/game/entities/NPC.ts` | Add trigger tile, indicator, remove proximity prompt | Modify |
| `src/game/systems/NPCSystem.ts` | Add dwell timer logic, remove proximity methods | Modify |
| `src/game/systems/InputSystem.ts` | Add `isFrozen` getter | Modify |
| `src/game/scenes/OverworldScene.ts` | Wire dwell callback, remove old NPC interaction | Modify |
| `src/game/scenes/InteriorScene.ts` | No changes (base class `onInteractPressed` stays as fallback) | None |
| `src/game/scenes/airport/AirportEntranceScene.ts` | Wire dwell callback, remove `onInteractPressed` NPC branch | Modify |
| `src/game/scenes/airport/AirportGateScene.ts` | Wire dwell callback, adapt gate-agent special logic | Modify |
| `src/game/scenes/airport/AirportSecurityScene.ts` | Wire dwell callback, remove `onInteractPressed` NPC branch | Modify |
| `src/game/scenes/maui/mauiMap.ts` | No changes (Maui NPCs flow through OverworldScene) | None |
| `src/game/scenes/maui/MauiOverworldScene.ts` | No changes (inherits from OverworldScene) | None |

---

## Chunk 1: Core Infrastructure

### Task 1: Add constants and update NPCDef type

**Files:**
- Modify: `src/utils/constants.ts`
- Modify: `src/game/data/mapLayout.ts:176-193`

- [ ] **Step 1: Add dwell/indicator constants to constants.ts**

Add at the end of `src/utils/constants.ts`:

```typescript
// NPC trigger zone constants
export const DWELL_TIME_MS = 1000;
export const DWELL_COOLDOWN_MS = 2000;
export const TRIGGER_INDICATOR_ALPHA = 0.25;
export const TRIGGER_INDICATOR_ACTIVE_ALPHA = 0.6;
export const TRIGGER_INDICATOR_COLOR = 0xffff00;

export const FACING_OFFSETS: Record<string, { dx: number; dy: number }> = {
  up:    { dx: 0, dy: -1 },
  down:  { dx: 0, dy:  1 },
  left:  { dx: -1, dy: 0 },
  right: { dx:  1, dy: 0 },
};
```

- [ ] **Step 2: Update NPCDef interface — add `facingDirection`, remove `interactionRadius`**

In `src/game/data/mapLayout.ts`, add `facingDirection` after `speed?: number;` and remove `interactionRadius`:

```typescript
  facingDirection?: 'up' | 'down' | 'left' | 'right'; // default 'down'
```

Remove this line from the interface:
```typescript
  interactionRadius?: number;   // pixels, default 48
```

- [ ] **Step 3: Verify build compiles**

Run: `npx tsc --noEmit`
Expected: No errors (new fields are optional, no consumers yet)

- [ ] **Step 4: Commit**

```bash
git add src/utils/constants.ts src/game/data/mapLayout.ts
git commit -m "feat: add trigger zone constants and facingDirection to NPCDef"
```

---

### Task 2: Update NPC entity — add trigger tile, indicator, remove proximity

**Files:**
- Modify: `src/game/entities/NPC.ts`

- [ ] **Step 1: Add imports for new constants**

Replace the import line at the top of `src/game/entities/NPC.ts`:

```typescript
import { NPCDef, tileToWorld } from '../data/mapLayout';
```

With:

```typescript
import { NPCDef, tileToWorld } from '../data/mapLayout';
import {
  TILE_SIZE, FACING_OFFSETS, TRIGGER_INDICATOR_COLOR, TRIGGER_INDICATOR_ALPHA,
} from '../../utils/constants';
```

- [ ] **Step 2: Add trigger zone properties, remove proximity properties**

Replace the property block (lines 11-30 approximately) with:

```typescript
export class NPC {
  public sprite: Phaser.GameObjects.Sprite;
  public readonly id: string;
  public readonly interactable: boolean;
  public readonly onInteract?: string;
  public readonly interactionData?: {
    lines?: string[];
    sceneKey?: string;
    sceneData?: any;
  };

  // Trigger zone (only for interactable non-walking NPCs)
  public readonly facingDirection: 'up' | 'down' | 'left' | 'right';
  public readonly triggerTile: { tileX: number; tileY: number } | null = null;
  public triggerIndicator: Phaser.GameObjects.Rectangle | null = null;

  private state: NPCState;
  private walkPath: Array<{ x: number; y: number }>;
  private currentPathIndex = 0;
  private targetPos: { x: number; y: number } | null = null;
  private speed: number;
  private scene: Phaser.Scene;
```

Note: `_inRange`, `_currentDistance`, `promptText`, `interactionRadius` are all removed. The `inRange` and `currentDistance` getters are also removed.

- [ ] **Step 3: Update constructor to compute trigger tile and create indicator**

Replace the constructor body with:

```typescript
  constructor(scene: Phaser.Scene, def: NPCDef) {
    this.scene = scene;
    this.id = def.id;
    this.interactable = def.interactable ?? false;
    this.onInteract = def.onInteract;
    this.interactionData = def.interactionData;
    this.facingDirection = def.facingDirection ?? 'down';

    const worldPos = tileToWorld(def.tileX, def.tileY);
    this.sprite = scene.add.sprite(worldPos.x, worldPos.y, def.texture ?? 'npc-default');
    this.sprite.setDepth(8);

    this.walkPath = def.walkPath ?? [];
    this.speed = def.speed ?? DEFAULT_NPC_SPEED;
    this.state = def.behavior === 'walk' ? 'walking' : def.behavior === 'sit' ? 'sitting' : 'idle';

    // Compute trigger tile for interactable non-walking NPCs
    if (this.interactable && this.state !== 'walking') {
      const offset = FACING_OFFSETS[this.facingDirection];
      this.triggerTile = {
        tileX: def.tileX + offset.dx,
        tileY: def.tileY + offset.dy,
      };

      // Create subtle ground indicator on trigger tile
      const triggerWorldPos = tileToWorld(this.triggerTile.tileX, this.triggerTile.tileY);
      this.triggerIndicator = scene.add.rectangle(
        triggerWorldPos.x, triggerWorldPos.y,
        TILE_SIZE - 4, TILE_SIZE - 4,
        TRIGGER_INDICATOR_COLOR, TRIGGER_INDICATOR_ALPHA,
      );
      this.triggerIndicator.setDepth(0);
    }

    if (this.state === 'walking' && this.walkPath.length > 1) {
      this.currentPathIndex = 0;
      this.setNextTarget();
    }
  }
```

- [ ] **Step 4: Remove `checkProximity` method entirely**

Delete the entire `checkProximity` method (lines 68-102 in original).

- [ ] **Step 5: Simplify `update` method — remove prompt positioning**

Replace the `update` method with:

```typescript
  update(delta: number): void {
    if (this.state !== 'walking' || !this.targetPos) return;

    const dx = this.targetPos.x - this.sprite.x;
    const dy = this.targetPos.y - this.sprite.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 4) {
      this.sprite.x = this.targetPos.x;
      this.sprite.y = this.targetPos.y;
      this.sprite.scene.time.delayedCall(1000, () => {
        this.setNextTarget();
      });
      this.targetPos = null;
      return;
    }

    const step = this.speed * (delta / 1000);
    this.sprite.x += (dx / dist) * step;
    this.sprite.y += (dy / dist) * step;
  }
```

- [ ] **Step 6: Update `destroy` method to clean up indicator**

Replace the `destroy` method with:

```typescript
  destroy(): void {
    if (this.triggerIndicator) {
      this.triggerIndicator.destroy();
      this.triggerIndicator = null;
    }
    this.sprite.destroy();
  }
```

- [ ] **Step 7: Verify build compiles**

Run: `npx tsc --noEmit`
Expected: Errors in NPCSystem.ts and scene files (they reference removed methods like `checkProximity`, `inRange`, `getInteractableInRange`). This is expected — we fix those in the next tasks.

- [ ] **Step 8: Commit**

```bash
git add src/game/entities/NPC.ts
git commit -m "feat: add trigger tile and indicator to NPC, remove proximity prompt"
```

---

### Task 3: Update NPCSystem — add dwell timer logic, remove proximity methods

**Files:**
- Modify: `src/game/systems/NPCSystem.ts`

- [ ] **Step 1: Rewrite NPCSystem.ts**

Replace the entire file with:

```typescript
// src/game/systems/NPCSystem.ts
import Phaser from 'phaser';
import { NPC } from '../entities/NPC';
import { NPCDef, worldToTile } from '../data/mapLayout';
import {
  DWELL_TIME_MS, DWELL_COOLDOWN_MS,
  TRIGGER_INDICATOR_ALPHA, TRIGGER_INDICATOR_ACTIVE_ALPHA,
} from '../../utils/constants';

export class NPCSystem {
  private npcs: NPC[] = [];
  private dwellTimers: Map<string, number> = new Map(); // npcId -> ms accumulated
  private cooldowns: Map<string, number> = new Map();   // npcId -> cooldown end timestamp
  private dialogueOpen = false;

  /** Callback fired when dwell threshold is reached on an NPC's trigger tile */
  public onDwellTrigger?: (npc: NPC) => void;

  create(scene: Phaser.Scene, defs: NPCDef[]): void {
    this.npcs = defs.map(def => new NPC(scene, def));
  }

  update(delta: number, playerX?: number, playerY?: number, inputFrozen = false): void {
    this.npcs.forEach(npc => npc.update(delta));

    // Skip dwell logic if no player position, input is frozen, or dialogue is open
    if (playerX == null || playerY == null || inputFrozen || this.dialogueOpen) return;

    const playerTile = worldToTile(playerX, playerY);
    const now = Date.now();

    for (const npc of this.npcs) {
      if (!npc.triggerTile) continue;

      const onTile = playerTile.x === npc.triggerTile.tileX &&
                     playerTile.y === npc.triggerTile.tileY;

      if (onTile) {
        // Check cooldown
        const cooldownEnd = this.cooldowns.get(npc.id) ?? 0;
        if (now < cooldownEnd) continue;

        // Increment dwell timer
        const prev = this.dwellTimers.get(npc.id) ?? 0;
        const elapsed = prev + delta;
        this.dwellTimers.set(npc.id, elapsed);

        // Update indicator alpha (lerp from base to active)
        const progress = Math.min(elapsed / DWELL_TIME_MS, 1);
        const alpha = TRIGGER_INDICATOR_ALPHA +
          (TRIGGER_INDICATOR_ACTIVE_ALPHA - TRIGGER_INDICATOR_ALPHA) * progress;
        if (npc.triggerIndicator) npc.triggerIndicator.setAlpha(alpha);

        // Fire trigger when threshold reached
        if (elapsed >= DWELL_TIME_MS) {
          this.dwellTimers.set(npc.id, 0);
          if (npc.triggerIndicator) npc.triggerIndicator.setAlpha(TRIGGER_INDICATOR_ALPHA);
          this.dialogueOpen = true;
          this.onDwellTrigger?.(npc);
        }
      } else {
        // Player not on trigger tile — reset
        if (this.dwellTimers.has(npc.id)) {
          this.dwellTimers.set(npc.id, 0);
          if (npc.triggerIndicator) npc.triggerIndicator.setAlpha(TRIGGER_INDICATOR_ALPHA);
        }
      }
    }
  }

  /** Called by the scene when dialogue ends to re-enable dwell detection */
  onDialogueEnd(npcId: string): void {
    this.dialogueOpen = false;
    this.cooldowns.set(npcId, Date.now() + DWELL_COOLDOWN_MS);
    this.dwellTimers.set(npcId, 0);
  }

  /** Find an interactable NPC whose sprite is near the given world position (tap radius) */
  getNPCAtPosition(worldX: number, worldY: number, radius = 32): NPC | null {
    for (const npc of this.npcs) {
      if (!npc.interactable) continue;
      const dx = npc.sprite.x - worldX;
      const dy = npc.sprite.y - worldY;
      if (Math.sqrt(dx * dx + dy * dy) <= radius) return npc;
    }
    return null;
  }

  destroy(): void {
    this.npcs.forEach(npc => npc.destroy());
    this.npcs = [];
    this.dwellTimers.clear();
    this.cooldowns.clear();
    this.dialogueOpen = false;
  }
}
```

- [ ] **Step 2: Verify build compiles**

Run: `npx tsc --noEmit`
Expected: Errors in scene files (they still reference `getInteractableInRange`, `checkProximity`, `inRange`). Fixed in next tasks.

- [ ] **Step 3: Commit**

```bash
git add src/game/systems/NPCSystem.ts
git commit -m "feat: add dwell timer logic to NPCSystem, remove proximity methods"
```

---

### Task 4: Add `isFrozen` getter to InputSystem

**Files:**
- Modify: `src/game/systems/InputSystem.ts`

- [ ] **Step 1: Add `isFrozen` getter**

In `src/game/systems/InputSystem.ts`, add after line 124 (`this.frozen = false;` in `unfreeze()`):

```typescript
  get isFrozen(): boolean {
    return this.frozen;
  }
```

- [ ] **Step 2: Commit**

```bash
git add src/game/systems/InputSystem.ts
git commit -m "feat: add isFrozen getter to InputSystem"
```

---

## Chunk 2: Scene Integration

### Task 5: Update OverworldScene — wire dwell callback, remove old NPC interaction

**Files:**
- Modify: `src/game/scenes/OverworldScene.ts`

- [ ] **Step 1: Remove `pendingNPCInteract` and `activeNPC` properties**

In `src/game/scenes/OverworldScene.ts`, remove these two lines (lines 35-36):

```typescript
  private pendingNPCInteract: NPC | null = null;
  private activeNPC: NPC | null = null;
```

Also remove the `NPC` import from line 7 since it's no longer directly referenced:

```typescript
import { NPC } from '../entities/NPC';
```

- [ ] **Step 2: Wire dwell callback after NPC system creation**

Replace lines 87-106 (NPC system creation + onWorldTap callback) with:

```typescript
    // 4. NPC system
    this.npcSystem = new NPCSystem();
    this.npcSystem.create(this, config.npcs);

    // Wire dwell trigger callback
    this.npcSystem.onDwellTrigger = (npc) => {
      this.handleNPCInteract(npc);
    };

    // 5. Input system
    this.inputSystem = new InputSystem(this);
    this.inputSystem.enableClickToMove(config.walkCheck, config.mapWidth, config.mapHeight, () => this.player.getPosition());
```

Note: The `onWorldTap` callback is no longer set — taps now only do click-to-move pathfinding.

- [ ] **Step 3: Update the update() loop — remove NPC prompt priority, pending interact, and NPC keyboard interact**

Replace the `update` method body (lines 147-231) with:

```typescript
  update(_time: number, delta: number): void {
    const config = this.cachedConfig;

    // Cooldown timers
    if (this.interactCooldown > 0) this.interactCooldown -= delta;
    if (this.backCooldown > 0) this.backCooldown -= delta;

    // 1. Input
    this.inputSystem.update();
    const dir = this.inputSystem.getDirection();

    // 2. Player
    this.player.update(dir);

    // 3. Partner follows player
    this.partner.update(this.player.getPosition());

    // 4. NPCs (dwell logic runs inside NPCSystem.update)
    const playerPos = this.player.getPosition();
    this.npcSystem.update(delta, playerPos.x, playerPos.y, this.inputSystem.isFrozen);

    // 5. Checkpoint proximity (radius-based)
    let inZone: CheckpointZone | null = null;

    for (const zone of config.checkpointZones) {
      const dx = playerPos.x - zone.centerX;
      const dy = playerPos.y - zone.centerY;
      if (dx * dx + dy * dy <= zone.radius * zone.radius) {
        inZone = zone;
        break;
      }
    }

    if (inZone && inZone !== this.activeZone) {
      this.activeZone = inZone;
      uiManager.showInteractionPrompt(inZone.promptText, () => {
        this.interactCooldown = 500;
        this.onEnterCheckpoint(inZone);
      });
    } else if (!inZone && this.activeZone) {
      this.activeZone = null;
      uiManager.hideInteractionPrompt();
    }

    // 6. Interact press (keyboard E/Space) — checkpoint zones only
    if (this.inputSystem.isInteractPressed() && this.interactCooldown <= 0) {
      this.interactCooldown = 500;
      if (this.activeZone) {
        this.onEnterCheckpoint(this.activeZone);
      }
    }

    // 7. Back/ESC press
    if (this.inputSystem.isBackPressed() && this.backCooldown <= 0) {
      this.backCooldown = 500;
      this.onBack();
    }
  }
```

- [ ] **Step 4: Update `handleNPCInteract` to call `onDialogueEnd`**

Replace the `handleNPCInteract` method with:

```typescript
  private handleNPCInteract(npc: { id: string; onInteract?: string; interactionData?: { lines?: string[]; sceneKey?: string; sceneData?: any } }): void {
    if (npc.onInteract === 'dialog' && npc.interactionData?.lines) {
      this.inputSystem.freeze();
      uiManager.showNPCDialog(npc.interactionData.lines, () => {
        uiManager.hideNPCDialog();
        this.inputSystem.unfreeze();
        this.npcSystem.onDialogueEnd(npc.id);
      });
    } else if (npc.onInteract === 'cutscene-trigger' && npc.interactionData?.sceneKey) {
      this.inputSystem.freeze();
      const sceneKey = npc.interactionData.sceneKey;
      const sceneData = npc.interactionData.sceneData ?? {};
      const triggerCutscene = () => {
        this.npcSystem.onDialogueEnd(npc.id);
        uiManager.hideInteractionPrompt();
        const cam = this.cameras.main;
        this.tweens.add({
          targets: cam, alpha: 0, duration: 300, ease: 'Linear',
          onComplete: () => { this.scene.start(sceneKey, sceneData); },
        });
      };
      if (npc.interactionData.lines?.length) {
        uiManager.showNPCDialog(npc.interactionData.lines, triggerCutscene);
      } else {
        triggerCutscene();
      }
    }
  }
```

- [ ] **Step 5: Verify build compiles**

Run: `npx tsc --noEmit`
Expected: No errors for OverworldScene. Errors may remain in airport scenes.

- [ ] **Step 6: Commit**

```bash
git add src/game/scenes/OverworldScene.ts
git commit -m "feat: wire dwell trigger in OverworldScene, remove tap-to-interact NPC logic"
```

---

### Task 6: Update AirportEntranceScene — wire dwell callback, remove onInteractPressed NPC branch

**Files:**
- Modify: `src/game/scenes/airport/AirportEntranceScene.ts`

- [ ] **Step 1: Import uiManager (already imported) and update create() to wire dwell callback**

Replace `create()` method with:

```typescript
  create(): void {
    super.create();
    saveCurrentScene('AirportEntranceScene');
    this.npcSystem = new NPCSystem();
    this.npcSystem.create(this, ENTRANCE_NPCS);
    this.signTooltip = new SignTooltip(this, ENTRANCE_SIGNS);

    // Wire dwell trigger for NPC interaction
    this.npcSystem.onDwellTrigger = (npc) => {
      if (npc.interactionData?.lines) {
        this.inputSystem.freeze();
        uiManager.showNPCDialog(npc.interactionData.lines, () => {
          uiManager.hideNPCDialog();
          this.inputSystem.unfreeze();
          this.npcSystem.onDialogueEnd(npc.id);
        });
      }
    };
  }
```

- [ ] **Step 2: Remove the `onInteractPressed` override entirely**

Delete the entire `onInteractPressed` method (lines 52-61).

- [ ] **Step 3: Update `update()` to pass `inputFrozen`**

Replace the update method with:

```typescript
  update(time: number, delta: number): void {
    super.update(time, delta);
    const pos = this.player.getPosition();
    this.npcSystem.update(delta, pos.x, pos.y, this.inputSystem.isFrozen);
    const playerTile = worldToTile(pos.x, pos.y);
    this.signTooltip.update(playerTile.x, playerTile.y);
  }
```

- [ ] **Step 4: Commit**

```bash
git add src/game/scenes/airport/AirportEntranceScene.ts
git commit -m "feat: wire dwell trigger in AirportEntranceScene"
```

---

### Task 7: Update AirportSecurityScene — wire dwell callback, remove onInteractPressed NPC branch

**Files:**
- Modify: `src/game/scenes/airport/AirportSecurityScene.ts`

- [ ] **Step 1: Update create() to wire dwell callback**

Replace `create()` method with:

```typescript
  create(): void {
    super.create();
    saveCurrentScene('AirportSecurityScene');
    this.npcSystem = new NPCSystem();
    this.npcSystem.create(this, SECURITY_NPCS);
    this.signTooltip = new SignTooltip(this, SECURITY_SIGNS);

    // Wire dwell trigger for NPC interaction
    this.npcSystem.onDwellTrigger = (npc) => {
      if (npc.interactionData?.lines) {
        this.inputSystem.freeze();
        uiManager.showNPCDialog(npc.interactionData.lines, () => {
          uiManager.hideNPCDialog();
          this.inputSystem.unfreeze();
          this.npcSystem.onDialogueEnd(npc.id);
        });
      }
    };
  }
```

- [ ] **Step 2: Remove the `onInteractPressed` override entirely**

Delete the entire `onInteractPressed` method (lines 44-53).

- [ ] **Step 3: Update `update()` to pass `inputFrozen`**

Replace the update method with:

```typescript
  update(time: number, delta: number): void {
    super.update(time, delta);
    const pos = this.player.getPosition();
    this.npcSystem.update(delta, pos.x, pos.y, this.inputSystem.isFrozen);
    const playerTile = worldToTile(pos.x, pos.y);
    this.signTooltip.update(playerTile.x, playerTile.y);
  }
```

- [ ] **Step 4: Commit**

```bash
git add src/game/scenes/airport/AirportSecurityScene.ts
git commit -m "feat: wire dwell trigger in AirportSecurityScene"
```

---

### Task 8: Update AirportGateScene — wire dwell callback with gate-agent special logic

**Files:**
- Modify: `src/game/scenes/airport/AirportGateScene.ts`

This scene has special logic: when the `gate-agent` NPC finishes dialogue, it triggers boarding (scene transition to `AirplaneCutscene`). The dwell callback must preserve this behavior.

- [ ] **Step 1: Update create() to wire dwell callback with gate-agent special case**

Replace `create()` method with:

```typescript
  create(): void {
    super.create();
    saveCurrentScene('AirportGateScene');
    this.boardingTriggered = false;
    this.npcSystem = new NPCSystem();
    this.npcSystem.create(this, GATE_NPCS);
    this.signTooltip = new SignTooltip(this, GATE_SIGNS);

    // Wire dwell trigger for NPC interaction
    this.npcSystem.onDwellTrigger = (npc) => {
      if (!npc.interactionData?.lines) return;

      if (npc.id === 'gate-agent') {
        this.inputSystem.freeze();
        uiManager.showNPCDialog(npc.interactionData.lines, () => {
          uiManager.hideNPCDialog();
          this.inputSystem.unfreeze();
          this.npcSystem.onDialogueEnd(npc.id);
          this.startBoarding();
        });
      } else {
        this.inputSystem.freeze();
        uiManager.showNPCDialog(npc.interactionData.lines, () => {
          uiManager.hideNPCDialog();
          this.inputSystem.unfreeze();
          this.npcSystem.onDialogueEnd(npc.id);
        });
      }
    };
  }
```

- [ ] **Step 2: Remove the `onInteractPressed` override entirely**

Delete the entire `onInteractPressed` method (lines 60-76).

- [ ] **Step 3: Update `update()` to pass `inputFrozen`**

Replace the update method with:

```typescript
  update(time: number, delta: number): void {
    super.update(time, delta);
    const pos = this.player.getPosition();
    this.npcSystem.update(delta, pos.x, pos.y, this.inputSystem.isFrozen);
    const playerTile = worldToTile(pos.x, pos.y);
    this.signTooltip.update(playerTile.x, playerTile.y);
  }
```

- [ ] **Step 4: Commit**

```bash
git add src/game/scenes/airport/AirportGateScene.ts
git commit -m "feat: wire dwell trigger in AirportGateScene with boarding logic"
```

---

### Task 9: Verify trigger tile positions are walkable

All interactable NPCs default to `facingDirection: 'down'`, placing trigger tiles one tile below them. Verify each NPC's trigger tile is actually walkable (not a wall or obstacle):

**Files:**
- Read-only verification: NPC definition arrays in all scene files

- [ ] **Step 1: Cross-reference each interactable NPC's position with map walkability**

Check each interactable NPC:
- `ticket-agent-1` (5,3) -> trigger at (5,4) — must be walkable in airport entrance
- `ticket-agent-2` (13,3) -> trigger at (13,4) — must be walkable in airport entrance
- `security-guard` (8,5) -> trigger at (8,6) — must be walkable in airport security
- `gate-agent` (19,3) -> trigger at (19,4) — must be walkable in airport gate
- `cafe-worker` (5,3) -> trigger at (5,4) — must be walkable in airport gate
- `shopkeeper` (2,8) -> trigger at (2,9) — must be walkable in airport gate
- `maui-shopkeeper` (9,9) -> trigger at (9,10) — must be walkable in Maui overworld
- `maui-airport-agent` (24,9) -> trigger at (24,10) — must be walkable in Maui overworld
- `surfer` (9,15) -> trigger at (9,16) — must be walkable in Maui overworld

If any trigger tile is not walkable, add `facingDirection` to that NPC's definition to point toward a walkable tile.

- [ ] **Step 2: Commit any facingDirection overrides**

```bash
git add -A
git commit -m "fix: set facingDirection for NPCs with blocked default trigger tiles"
```

---

## Chunk 3: Final Verification

### Task 10: Full build verification and manual test

- [ ] **Step 1: Verify full build compiles**

Run: `npx tsc --noEmit`
Expected: Zero errors

- [ ] **Step 2: Run dev server and verify**

Run: `npm run dev`

Manual verification checklist:
1. Walk to an NPC — see subtle yellow indicator on tile in front of them
2. Stand on indicator tile — alpha ramps up over 1 second
3. After 1 second — dialogue opens automatically
4. Walk off tile before 1 second — timer resets, alpha returns to base
5. After closing dialogue — can't re-trigger immediately (2 second cooldown)
6. Walk away and return — can trigger again after cooldown
7. Click-to-move still works (tapping empty ground pathfinds)
8. Checkpoint zones still show prompts and work with tap/E/Space
9. Airport scenes: ticket agents, security guard, cafe worker, shopkeeper, gate agent all trigger correctly
10. Gate agent: after dialogue, boarding cutscene starts
11. Maui scene: shopkeeper, surfer, airport agent all trigger correctly
12. Airport agent in Maui triggers cutscene after dialogue

- [ ] **Step 3: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix: address trigger zone integration issues"
```
