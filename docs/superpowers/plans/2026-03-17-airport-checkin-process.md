# Airport Check-In Process Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 5 sequential animated check-in stations to the airport interior scene, replacing NPC dialogue triggers with process-driven tween animations.

**Architecture:** Station progression tracked as scene-level state. Each station has a trigger tile checked in `update()`. When triggered, a tween-based animation sequence plays (freeze input → camera pan → prop animations → camera restore → unfreeze). Existing NPC dialogue system removed for station NPCs; they become static sprites animated within sequences.

**Tech Stack:** Phaser 3 (tweens, camera, sprites), TypeScript, procedural Canvas 2D textures

**Spec:** `docs/superpowers/specs/2026-03-17-airport-checkin-process-design.md`

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `src/game/systems/InputSystem.ts` | Modify | Gate `isBackPressed()` on frozen state to prevent ESC during sequences |
| `src/game/rendering/AirportTextures.ts` | Modify | Add prop textures + passport officer NPC texture |
| `src/game/scenes/airport/airportLayouts.ts` | Modify | Add passport booth desk + luggage belt decorations |
| `src/game/scenes/airport/CheckinStations.ts` | Create | Station definitions, trigger tiles, and all 5 animation sequence functions |
| `src/game/scenes/airport/AirportInteriorScene.ts` | Modify | Add station progression logic, trigger checking in `update()`, replace NPC dialogue wiring |

---

### Task 1: Fix InputSystem ESC During Frozen State

**Files:**
- Modify: `src/game/systems/InputSystem.ts:181`

The `isBackPressed()` method does not check `this.frozen`, which means ESC can trigger scene exit during animation sequences. This would crash the game.

- [ ] **Step 1: Gate isBackPressed on frozen state**

In `src/game/systems/InputSystem.ts`, change `isBackPressed()` at line 181:

```typescript
  isBackPressed(): boolean {
    if (this.frozen) return false;
    return this.escKey?.isDown || false;
  }
```

- [ ] **Step 2: Verify build compiles**

Run: `npm run build 2>&1 | head -20`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/game/systems/InputSystem.ts
git commit -m "fix: gate isBackPressed on frozen state to prevent ESC during sequences"
```

---

### Task 2: Add Prop Textures to AirportTextures.ts

**Files:**
- Modify: `src/game/rendering/AirportTextures.ts`

These are the animation prop sprites used during station sequences. All follow the existing pattern of `scene.textures.createCanvas()` with pixel art drawn via `rect()`/`px()`.

- [ ] **Step 1: Add `generateCheckinPropTextures` function**

Add a new function after `generateExteriorDecoTextures` (line ~1636) and before the main `generateAirportTextures` export. This function creates all prop textures needed for station animations:

```typescript
function generateCheckinPropTextures(scene: Phaser.Scene): void {
  // prop-boarding-pass (48x24) — white card with barcode lines
  {
    const c = scene.textures.createCanvas('prop-boarding-pass', 48, 24);
    if (!c) return;
    const ctx = c.context;
    rect(ctx, 0, 0, 48, 24, '#FFFFFF');
    rect(ctx, 0, 0, 48, 1, '#CCCCCC');
    rect(ctx, 0, 23, 48, 1, '#CCCCCC');
    rect(ctx, 0, 0, 1, 24, '#CCCCCC');
    rect(ctx, 47, 0, 1, 24, '#CCCCCC');
    // Header bar
    rect(ctx, 2, 2, 44, 5, '#2255AA');
    // "BOARDING PASS" text (tiny dots)
    for (let x = 6; x < 42; x += 3) {
      rect(ctx, x, 3, 2, 3, '#FFFFFF');
    }
    // Destination text line
    rect(ctx, 4, 9, 20, 2, '#333333');
    // Seat text line
    rect(ctx, 4, 13, 12, 2, '#333333');
    // Barcode
    for (let x = 28; x < 46; x += 2) {
      rect(ctx, x, 9, 1, 12, '#000000');
    }
    // Dashed tear line
    for (let x = 25; x < 26; x++) {
      for (let y = 2; y < 22; y += 3) {
        px(ctx, x, y, '#AAAAAA');
      }
    }
    c.refresh();
  }

  // prop-passport (24x32) — dark blue booklet with gold emblem
  {
    const c = scene.textures.createCanvas('prop-passport', 24, 32);
    if (!c) return;
    const ctx = c.context;
    rect(ctx, 0, 0, 24, 32, '#1A3A6A');
    rect(ctx, 0, 0, 24, 1, lighten('#1A3A6A'));
    rect(ctx, 0, 31, 24, 1, darken('#1A3A6A'));
    // Gold emblem (circle)
    rect(ctx, 9, 10, 6, 6, '#C8A84E');
    rect(ctx, 10, 9, 4, 8, '#C8A84E');
    // Text lines
    rect(ctx, 6, 20, 12, 1, '#C8A84E');
    rect(ctx, 8, 23, 8, 1, '#C8A84E');
    // Spine
    rect(ctx, 0, 0, 2, 32, darken('#1A3A6A', 0.15));
    c.refresh();
  }

  // prop-stamp (24x24) — red circular stamp
  {
    const c = scene.textures.createCanvas('prop-stamp', 24, 24);
    if (!c) return;
    const ctx = c.context;
    ctx.strokeStyle = '#CC3333';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(12, 12, 10, 0, Math.PI * 2);
    ctx.stroke();
    // Inner text lines
    rect(ctx, 7, 9, 10, 1, '#CC3333');
    rect(ctx, 8, 12, 8, 1, '#CC3333');
    rect(ctx, 7, 15, 10, 1, '#CC3333');
    c.refresh();
  }

  // prop-suitcase (24x20) — small suitcase for luggage animation
  {
    const c = scene.textures.createCanvas('prop-suitcase', 24, 20);
    if (!c) return;
    const ctx = c.context;
    // Body
    rect(ctx, 2, 4, 20, 14, '#8B4513');
    rect(ctx, 2, 4, 20, 2, lighten('#8B4513', 0.2));
    // Handle
    rect(ctx, 9, 1, 6, 4, '#555555');
    rect(ctx, 10, 0, 4, 2, '#555555');
    // Clasp
    rect(ctx, 10, 10, 4, 2, '#C8A84E');
    // Wheels
    rect(ctx, 5, 18, 3, 2, '#333333');
    rect(ctx, 16, 18, 3, 2, '#333333');
    c.refresh();
  }

  // prop-luggage-tag (16x10) — small white tag with barcode
  {
    const c = scene.textures.createCanvas('prop-luggage-tag', 16, 10);
    if (!c) return;
    const ctx = c.context;
    rect(ctx, 0, 0, 16, 10, '#FFFFFF');
    rect(ctx, 0, 0, 16, 1, '#DDDDDD');
    rect(ctx, 0, 9, 16, 1, '#DDDDDD');
    // Barcode
    for (let x = 2; x < 14; x += 2) {
      rect(ctx, x, 3, 1, 5, '#000000');
    }
    // String hole
    rect(ctx, 1, 1, 2, 2, '#AAAAAA');
    c.refresh();
  }

  // prop-scale-display (32x16) — digital weight readout
  {
    const c = scene.textures.createCanvas('prop-scale-display', 32, 16);
    if (!c) return;
    const ctx = c.context;
    rect(ctx, 0, 0, 32, 16, '#222222');
    rect(ctx, 1, 1, 30, 14, '#111111');
    // Green digits "18.5"
    rect(ctx, 4, 4, 4, 8, '#00FF66');
    rect(ctx, 10, 4, 4, 8, '#00FF66');
    rect(ctx, 15, 10, 2, 2, '#00FF66'); // decimal
    rect(ctx, 18, 4, 4, 8, '#00FF66');
    // "kg" text
    rect(ctx, 24, 6, 3, 1, '#00FF66');
    rect(ctx, 24, 9, 3, 1, '#00FF66');
    c.refresh();
  }

  // prop-security-bin (32x12) — grey tray
  {
    const c = scene.textures.createCanvas('prop-security-bin', 32, 12);
    if (!c) return;
    const ctx = c.context;
    rect(ctx, 0, 2, 32, 10, '#888888');
    rect(ctx, 1, 0, 30, 3, '#999999');
    rect(ctx, 2, 3, 28, 8, '#777777');
    rect(ctx, 1, 0, 30, 1, lighten('#999999'));
    c.refresh();
  }

  // prop-small-items (24x8) — phone + keys + wallet cluster
  {
    const c = scene.textures.createCanvas('prop-small-items', 24, 8);
    if (!c) return;
    const ctx = c.context;
    // Phone
    rect(ctx, 1, 1, 5, 7, '#222222');
    rect(ctx, 2, 2, 3, 4, '#4488CC');
    // Keys
    rect(ctx, 9, 2, 3, 3, '#CCAA44');
    rect(ctx, 10, 5, 1, 2, '#CCAA44');
    rect(ctx, 12, 4, 2, 1, '#CCAA44');
    // Wallet
    rect(ctx, 16, 1, 7, 6, '#664422');
    rect(ctx, 16, 1, 7, 1, lighten('#664422'));
    c.refresh();
  }

  // prop-scanner-line (32x2) — thin red scanning line
  {
    const c = scene.textures.createCanvas('prop-scanner-line', 32, 2);
    if (!c) return;
    const ctx = c.context;
    rect(ctx, 0, 0, 32, 2, '#FF3333');
    rect(ctx, 0, 0, 32, 1, '#FF6666');
    c.refresh();
  }

  // prop-checkmark (16x16) — green checkmark
  {
    const c = scene.textures.createCanvas('prop-checkmark', 16, 16);
    if (!c) return;
    const ctx = c.context;
    ctx.strokeStyle = '#33CC33';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(2, 8);
    ctx.lineTo(6, 13);
    ctx.lineTo(14, 3);
    ctx.stroke();
    c.refresh();
  }

  // prop-departure-board (128x96) — flip-board overlay with destinations
  {
    const c = scene.textures.createCanvas('prop-departure-board', 128, 96);
    if (!c) return;
    const ctx = c.context;
    // Board background
    rect(ctx, 0, 0, 128, 96, '#1A1A1A');
    rect(ctx, 0, 0, 128, 2, '#444444');
    rect(ctx, 0, 94, 128, 2, '#444444');
    // Title bar
    rect(ctx, 0, 0, 128, 16, '#333333');
    // "DEPARTURES" text dots
    for (let x = 20; x < 108; x += 4) {
      rect(ctx, x, 5, 3, 6, '#FFAA00');
    }
    // Row 1: MAUI — highlighted
    rect(ctx, 4, 20, 120, 18, '#2A3A2A');
    rect(ctx, 8, 24, 40, 2, '#FFAA00'); // destination
    rect(ctx, 60, 24, 20, 2, '#FFAA00'); // time
    rect(ctx, 88, 24, 32, 2, '#33CC33'); // status: ON TIME
    rect(ctx, 8, 29, 30, 2, '#FFAA00'); // flight number
    // Row 2: PARIS — greyed
    rect(ctx, 4, 42, 120, 18, '#222222');
    rect(ctx, 8, 46, 40, 2, '#555555');
    rect(ctx, 60, 46, 20, 2, '#555555');
    rect(ctx, 88, 46, 32, 2, '#555555'); // COMING SOON
    // Row 3: TOKYO — greyed
    rect(ctx, 4, 64, 120, 18, '#222222');
    rect(ctx, 8, 68, 40, 2, '#555555');
    rect(ctx, 60, 68, 20, 2, '#555555');
    rect(ctx, 88, 68, 32, 2, '#555555');
    c.refresh();
  }

  // interior-airport-passport-desk (32x32) — small desk for passport control
  {
    const c = scene.textures.createCanvas('interior-airport-passport-desk', 32, 32);
    if (!c) return;
    const ctx = c.context;
    // Desk body
    rect(ctx, 0, 12, 32, 20, '#5C4033');
    rect(ctx, 0, 10, 32, 4, '#6B4F3A');
    rect(ctx, 0, 10, 32, 1, lighten('#6B4F3A', 0.2));
    // Small computer/screen on desk
    rect(ctx, 20, 4, 8, 7, '#333333');
    rect(ctx, 21, 5, 6, 5, '#4488AA');
    rect(ctx, 23, 11, 4, 1, '#333333');
    // Stamp pad
    rect(ctx, 4, 6, 6, 4, '#222222');
    rect(ctx, 5, 7, 4, 2, '#881111');
    c.refresh();
  }

  // interior-airport-luggage-belt (32x32) — check-in luggage conveyor
  {
    const c = scene.textures.createCanvas('interior-airport-luggage-belt', 32, 32);
    if (!c) return;
    const ctx = c.context;
    // Belt base
    rect(ctx, 0, 14, 32, 12, '#444444');
    // Silver rails
    rect(ctx, 0, 13, 32, 2, '#AAAAAA');
    rect(ctx, 0, 25, 32, 2, '#AAAAAA');
    // Rollers
    for (let x = 3; x < 30; x += 4) {
      rect(ctx, x, 16, 2, 8, '#555555');
    }
    // Scale platform on top
    rect(ctx, 4, 8, 24, 6, '#666666');
    rect(ctx, 4, 8, 24, 1, lighten('#666666', 0.2));
    // Legs
    rect(ctx, 2, 27, 3, 5, '#777777');
    rect(ctx, 27, 27, 3, 5, '#777777');
    c.refresh();
  }
}
```

- [ ] **Step 2: Wire into `generateAirportTextures`**

In the `generateAirportTextures` export function (line ~1638), add a call to `generateCheckinPropTextures(scene)`:

```typescript
export function generateAirportTextures(scene: Phaser.Scene): void {
  generateNPCTextures(scene);
  generateBuildingTexture(scene);
  generateInteriorTextures(scene);
  generateSignTextures(scene);
  generateAirplaneTextures(scene);
  generateBoardingTextures(scene);
  generateAirplaneTaxiingTexture(scene);
  generateExteriorDecoTextures(scene);
  generateCheckinPropTextures(scene);  // NEW
}
```

- [ ] **Step 3: Add passport officer NPC texture**

Inside `generateNPCTextures` (after the cafe worker block, ~line 222), add a new NPC texture:

```typescript
  // npc-passport-officer: dark uniform, stern look
  {
    const c = scene.textures.createCanvas('npc-passport-officer', 48, 48);
    if (!c) return;
    const ctx = c.context;
    drawNPCBase(ctx, {
      skin: '#D4A574',
      hair: '#222222',
      top: '#2C3E50',
      pants: '#1A1A2E',
      shoes: '#111111',
      detail: (dCtx) => {
        // Badge
        rect(dCtx, 16, 22, 4, 4, '#C8A84E');
        // Shoulder marks
        rect(dCtx, 14, 19, 3, 1, '#C8A84E');
        rect(dCtx, 31, 19, 3, 1, '#C8A84E');
      },
    });
    c.refresh();
  }
```

- [ ] **Step 4: Verify build compiles**

Run: `npm run build 2>&1 | head -20`
Expected: No errors related to textures

- [ ] **Step 5: Commit**

```bash
git add src/game/rendering/AirportTextures.ts
git commit -m "feat(airport): add check-in prop and passport officer textures"
```

---

### Task 3: Update Airport Layout

**Files:**
- Modify: `src/game/scenes/airport/airportLayouts.ts`

Add the passport booth desk and luggage belt decorations to the layout.

- [ ] **Step 1: Add new decorations to the layout**

In `airportLayouts.ts`, add the passport desk and luggage belt decorations to the `decorations` array. The passport desk goes in the corridor at y=12, and the luggage belt goes near the existing check-in area at y=16:

```typescript
    // PASSPORT CONTROL (y=12-13 corridor)
    { type: 'airport-passport-desk', tileX: 18, tileY: 12 },
    // LUGGAGE CHECK-IN (near check-in counters)
    { type: 'airport-luggage-belt', tileX: 14, tileY: 16 },
```

- [ ] **Step 2: Verify build compiles**

Run: `npm run build 2>&1 | head -20`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/game/scenes/airport/airportLayouts.ts
git commit -m "feat(airport): add passport desk and luggage belt to layout"
```

---

### Task 4: Create CheckinStations Module

**Files:**
- Create: `src/game/scenes/airport/CheckinStations.ts`

This module defines station data (trigger tile positions) and exports each station's animation sequence as an async function. Each function takes the scene as a parameter and returns a Promise that resolves when the animation is complete.

The scene is typed as `Phaser.Scene` but accesses `player` and `partner` via a typed interface to avoid unsafe casts.

- [ ] **Step 1: Create the station definitions and helpers**

```typescript
// src/game/scenes/airport/CheckinStations.ts
import Phaser from 'phaser';
import { tileToWorld } from '../../data/mapLayout';
import { TILE_SIZE } from '../../../utils/constants';
import { Player } from '../../entities/Player';
import { Partner } from '../../entities/Partner';

export interface StationDef {
  id: string;
  triggerTileX: number;
  triggerTileY: number;
}

/** Scene interface for accessing player/partner from station sequences */
interface AirportScene extends Phaser.Scene {
  player: Player;
  partner: Partner;
}

// Stations in order — trigger tiles are one tile below each NPC/desk
// Layout flows bottom-to-top: check-in (y=14-17) → passport (y=12-13) → security (y=8-11) → gate (y=2-5)
export const STATIONS: StationDef[] = [
  { id: 'ticket-counter', triggerTileX: 8, triggerTileY: 16 },
  { id: 'luggage-checkin', triggerTileX: 14, triggerTileY: 17 },
  { id: 'passport-control', triggerTileX: 18, triggerTileY: 13 },
  { id: 'security-screening', triggerTileX: 18, triggerTileY: 11 },
  { id: 'boarding-gate', triggerTileX: 24, triggerTileY: 5 },
];

/** Create a temporary sprite at given position, starts invisible */
function tempSprite(
  scene: Phaser.Scene,
  x: number, y: number,
  texture: string,
  depth = 20,
): Phaser.GameObjects.Image {
  return scene.add.image(x, y, texture).setDepth(depth).setAlpha(0);
}

/** Promisified tween */
function tweenAsync(scene: Phaser.Scene, config: Phaser.Types.Tweens.TweenBuilderConfig): Promise<void> {
  return new Promise(resolve => {
    scene.tweens.add({ ...config, onComplete: () => resolve() });
  });
}

/** Promisified delay */
function delayAsync(scene: Phaser.Scene, ms: number): Promise<void> {
  return new Promise(resolve => {
    scene.time.delayedCall(ms, resolve);
  });
}

/** Camera pan and zoom to a tile position. Returns an async restore function. */
async function focusCamera(
  scene: Phaser.Scene,
  tileX: number, tileY: number,
  zoomBoost = 0.3,
): Promise<() => Promise<void>> {
  const cam = scene.cameras.main;
  const origZoom = cam.zoom;
  const target = tileToWorld(tileX, tileY);
  cam.stopFollow();
  cam.pan(target.x, target.y, 300, 'Sine.easeInOut');
  cam.zoomTo(origZoom + zoomBoost, 300, 'Sine.easeInOut');
  await delayAsync(scene, 320);

  return async () => {
    const as = scene as unknown as AirportScene;
    cam.zoomTo(origZoom, 300, 'Sine.easeInOut');
    await delayAsync(scene, 100);
    if (as.player?.sprite) {
      cam.startFollow(as.player.sprite, true, 0.1, 0.1);
    }
    await delayAsync(scene, 220);
  };
}
```

- [ ] **Step 2: Add Station 1 — Ticket Counter sequence**

Append to the same file:

```typescript
export async function playTicketCounter(scene: Phaser.Scene): Promise<void> {
  const restore = await focusCamera(scene, 8, 15);

  // Departure board overlay — positioned relative to camera viewport
  const cam = scene.cameras.main;
  const cx = cam.scrollX + cam.width / (2 * cam.zoom);
  const cy = cam.scrollY + cam.height / (2 * cam.zoom);

  const board = tempSprite(scene, cx, cy - 20, 'prop-departure-board', 100);
  board.setScale(0.5);
  await tweenAsync(scene, { targets: board, alpha: 1, scale: 1, duration: 400, ease: 'Back.easeOut' });
  await delayAsync(scene, 1200);

  // Highlight Maui row — flash effect
  const highlight = scene.add.rectangle(cx, cy - 32, 120, 18, 0x33CC33, 0.3).setDepth(101);
  await tweenAsync(scene, { targets: highlight, alpha: 0.6, duration: 200, yoyo: true, repeat: 1 });
  highlight.destroy();
  await delayAsync(scene, 400);

  // Board fades out
  await tweenAsync(scene, { targets: board, alpha: 0, scale: 0.8, duration: 300 });
  board.destroy();

  // Boarding pass slides across counter from agent to player
  const counterPos = tileToWorld(8, 15);
  const pass = tempSprite(scene, counterPos.x + 20, counterPos.y, 'prop-boarding-pass', 20);
  pass.setAlpha(1).setScale(0.5);
  await tweenAsync(scene, { targets: pass, x: counterPos.x - 10, duration: 400, ease: 'Sine.easeOut' });
  await delayAsync(scene, 300);

  // Show enlarged boarding pass briefly (centered in viewport)
  const bigPass = tempSprite(scene, cx, cy, 'prop-boarding-pass', 100);
  bigPass.setScale(0.5);
  await tweenAsync(scene, { targets: bigPass, alpha: 1, scale: 2.5, duration: 400, ease: 'Back.easeOut' });
  await delayAsync(scene, 1000);
  await tweenAsync(scene, { targets: bigPass, alpha: 0, duration: 400 });
  bigPass.destroy();
  pass.destroy();

  await restore();
}
```

- [ ] **Step 3: Add Station 2 — Luggage Check-In sequence**

```typescript
export async function playLuggageCheckin(scene: Phaser.Scene): Promise<void> {
  const as = scene as unknown as AirportScene;
  const restore = await focusCamera(scene, 14, 16);
  const beltPos = tileToWorld(14, 16);
  const playerPos = as.player.getPosition();

  // Suitcase slides from player to belt (using prop-suitcase, not npc-suitcase)
  const suitcase = tempSprite(scene, playerPos.x, playerPos.y, 'prop-suitcase', 20);
  suitcase.setAlpha(1).setScale(1);
  await tweenAsync(scene, {
    targets: suitcase,
    x: beltPos.x, y: beltPos.y,
    duration: 600, ease: 'Sine.easeInOut',
  });

  // Scale display appears above belt
  const scale = tempSprite(scene, beltPos.x, beltPos.y - TILE_SIZE, 'prop-scale-display', 25);
  await tweenAsync(scene, { targets: scale, alpha: 1, duration: 300 });
  await delayAsync(scene, 800);

  // Checkmark on scale
  const check = tempSprite(scene, beltPos.x + 20, beltPos.y - TILE_SIZE, 'prop-checkmark', 26);
  await tweenAsync(scene, { targets: check, alpha: 1, duration: 200 });
  await delayAsync(scene, 400);
  check.destroy();
  scale.destroy();

  // Tag slaps onto suitcase
  const tag = tempSprite(scene, beltPos.x + 12, beltPos.y - 10, 'prop-luggage-tag', 21);
  tag.setScale(2);
  await tweenAsync(scene, { targets: tag, alpha: 1, scale: 1, y: beltPos.y, duration: 200, ease: 'Bounce.easeOut' });
  await delayAsync(scene, 300);

  // Suitcase rolls away down the belt
  await tweenAsync(scene, {
    targets: [suitcase, tag],
    x: beltPos.x - 200, alpha: 0,
    duration: 800, ease: 'Sine.easeIn',
  });
  suitcase.destroy();
  tag.destroy();

  // Remove suitcase textures from player and partner
  as.player.restoreTexture(scene);
  as.partner.restoreTexture(scene);

  await restore();
}
```

- [ ] **Step 4: Add Station 3 — Passport Control sequence**

```typescript
export async function playPassportControl(scene: Phaser.Scene): Promise<void> {
  const as = scene as unknown as AirportScene;
  const restore = await focusCamera(scene, 18, 12);
  const deskPos = tileToWorld(18, 12);
  const playerPos = as.player.getPosition();

  // Passport slides from player to officer
  const passport = tempSprite(scene, playerPos.x, playerPos.y, 'prop-passport', 20);
  passport.setAlpha(1).setScale(0.8);
  await tweenAsync(scene, {
    targets: passport,
    x: deskPos.x, y: deskPos.y,
    duration: 500, ease: 'Sine.easeInOut',
  });

  // Officer inspects (brief pause)
  await delayAsync(scene, 600);

  // Stamp comes down onto passport
  const stamp = tempSprite(scene, deskPos.x, deskPos.y - 30, 'prop-stamp', 22);
  stamp.setAlpha(1).setScale(1.5);
  await tweenAsync(scene, {
    targets: stamp,
    y: deskPos.y, scale: 1,
    duration: 200, ease: 'Bounce.easeOut',
  });

  // Brief screen shake for impact
  scene.cameras.main.shake(100, 0.005);
  await delayAsync(scene, 300);

  // Stamp fades
  await tweenAsync(scene, { targets: stamp, alpha: 0, duration: 200 });
  stamp.destroy();

  // Passport slides back to player
  await tweenAsync(scene, {
    targets: passport,
    x: playerPos.x, y: playerPos.y,
    duration: 500, ease: 'Sine.easeInOut',
  });
  await tweenAsync(scene, { targets: passport, alpha: 0, duration: 200 });
  passport.destroy();

  await restore();
}
```

- [ ] **Step 5: Add Station 4 — Security Screening sequence**

The security area has metal detectors at (24, 10) and conveyors at (26, 9). The trigger tile is at (18, 11). The animation uses the right-side equipment which is closer to the center and more visible.

```typescript
export async function playSecurityScreening(scene: Phaser.Scene): Promise<void> {
  const as = scene as unknown as AirportScene;
  // Focus on the right-side security lane (detector at 24,10, conveyor at 26,9)
  const restore = await focusCamera(scene, 24, 10, 0.2);
  const conveyorPos = tileToWorld(26, 9);
  const detectorPos = tileToWorld(24, 10);
  const playerPos = as.player.getPosition();

  // Bin appears on conveyor
  const bin = tempSprite(scene, conveyorPos.x + 20, conveyorPos.y, 'prop-security-bin', 20);
  await tweenAsync(scene, { targets: bin, alpha: 1, duration: 300 });

  // Items slide from player into bin
  const items = tempSprite(scene, playerPos.x, playerPos.y, 'prop-small-items', 21);
  items.setAlpha(1);
  await tweenAsync(scene, {
    targets: items,
    x: conveyorPos.x + 20, y: conveyorPos.y,
    duration: 400, ease: 'Sine.easeOut',
  });
  items.destroy();

  // Bin rolls into X-ray (moves left, fades as it enters machine)
  await tweenAsync(scene, {
    targets: bin,
    x: conveyorPos.x - 10, alpha: 0.3,
    duration: 600, ease: 'Linear',
  });

  // Player walks through metal detector — tween a temp sprite, not the actual player physics sprite
  const walkSprite = scene.add.image(playerPos.x, detectorPos.y + TILE_SIZE, as.player.sprite.texture.key, 0).setDepth(20);
  await tweenAsync(scene, {
    targets: walkSprite,
    y: detectorPos.y - TILE_SIZE / 2,
    duration: 600, ease: 'Linear',
  });

  // Metal detector flash green
  const flash = scene.add.rectangle(detectorPos.x, detectorPos.y, TILE_SIZE, TILE_SIZE * 1.5, 0x33FF33, 0.4).setDepth(15);
  await tweenAsync(scene, { targets: flash, alpha: 0, duration: 400 });
  flash.destroy();
  walkSprite.destroy();

  // Bin emerges on other side
  bin.setPosition(conveyorPos.x - TILE_SIZE * 2, conveyorPos.y);
  await tweenAsync(scene, {
    targets: bin,
    x: conveyorPos.x - TILE_SIZE * 3, alpha: 1,
    duration: 500, ease: 'Linear',
  });

  // Items return (fade out toward player)
  const itemsBack = tempSprite(scene, bin.x, bin.y, 'prop-small-items', 21);
  itemsBack.setAlpha(1);
  await tweenAsync(scene, {
    targets: itemsBack,
    x: playerPos.x, y: playerPos.y,
    alpha: 0, duration: 400, ease: 'Sine.easeIn',
  });
  itemsBack.destroy();
  bin.destroy();

  await restore();
}
```

- [ ] **Step 6: Add Station 5 — Boarding Gate sequence**

```typescript
export async function playBoardingGate(scene: Phaser.Scene): Promise<void> {
  const as = scene as unknown as AirportScene;
  const restore = await focusCamera(scene, 24, 4);
  const gatePos = tileToWorld(24, 3);  // gate desk decoration position
  const playerPos = as.player.getPosition();

  // Boarding pass slides to agent
  const pass = tempSprite(scene, playerPos.x, playerPos.y, 'prop-boarding-pass', 20);
  pass.setAlpha(1).setScale(0.7);
  await tweenAsync(scene, {
    targets: pass,
    x: gatePos.x, y: gatePos.y,
    duration: 500, ease: 'Sine.easeInOut',
  });

  // Scanner line sweeps across pass
  const scanner = tempSprite(scene, gatePos.x - 16, gatePos.y, 'prop-scanner-line', 22);
  scanner.setAlpha(1);
  await tweenAsync(scene, {
    targets: scanner,
    x: gatePos.x + 16,
    duration: 400, ease: 'Linear',
  });
  scanner.destroy();

  // Checkmark above agent
  const check = tempSprite(scene, gatePos.x, gatePos.y - TILE_SIZE, 'prop-checkmark', 25);
  check.setScale(0.5);
  await tweenAsync(scene, { targets: check, alpha: 1, scale: 1.2, duration: 300, ease: 'Back.easeOut' });
  await delayAsync(scene, 500);
  await tweenAsync(scene, { targets: check, alpha: 0, duration: 200 });
  check.destroy();

  // Pass slides back and fades
  await tweenAsync(scene, {
    targets: pass,
    x: playerPos.x, y: playerPos.y, alpha: 0,
    duration: 400, ease: 'Sine.easeIn',
  });
  pass.destroy();

  await restore();
}
```

- [ ] **Step 7: Verify build compiles**

Run: `npm run build 2>&1 | head -20`
Expected: No errors

- [ ] **Step 8: Commit**

```bash
git add src/game/scenes/airport/CheckinStations.ts
git commit -m "feat(airport): add check-in station definitions and animation sequences"
```

---

### Task 5: Integrate Station Progression into AirportInteriorScene

**Files:**
- Modify: `src/game/scenes/airport/AirportInteriorScene.ts`

Replace the NPC dialogue system for station NPCs with tile-based station trigger checking and animation sequence playback.

- [ ] **Step 1: Rewrite AirportInteriorScene.ts**

Replace the entire contents of `AirportInteriorScene.ts` with:

```typescript
// src/game/scenes/airport/AirportInteriorScene.ts
import { InteriorScene } from '../InteriorScene';
import { InteriorLayout } from '../../data/interiorLayouts';
import { AIRPORT_INTERIOR_LAYOUT } from './airportLayouts';
import { NPCSystem } from '../../systems/NPCSystem';
import { NPCDef, worldToTile, tileToWorld } from '../../data/mapLayout';
import { uiManager } from '../../../ui/UIManager';
import { saveCurrentScene } from '../../systems/SaveSystem';
import { SignTooltip, SignDef } from '../../../ui/SignTooltip';
import { TILE_SIZE } from '../../../utils/constants';
import {
  STATIONS,
  playTicketCounter,
  playLuggageCheckin,
  playPassportControl,
  playSecurityScreening,
  playBoardingGate,
} from './CheckinStations';

// NPCs managed by NPCSystem (dialogue-based) — cafe + passengers only
const DIALOG_NPCS: NPCDef[] = [
  {
    id: 'barista', tileX: 3, tileY: 4, behavior: 'idle',
    texture: 'npc-cafe-worker', interactable: true, onInteract: 'dialog',
    interactionData: { lines: ['Welcome to Sky Cafe!', 'Can I get you a coffee for the flight?'] },
  },
  { id: 'sitting-passenger-1', tileX: 14, tileY: 3, behavior: 'sit', texture: 'npc-traveler' },
  { id: 'sitting-passenger-2', tileX: 20, tileY: 5, behavior: 'sit', texture: 'npc-traveler-2' },
  { id: 'walking-passenger', tileX: 18, tileY: 14, behavior: 'walk', texture: 'npc-traveler', walkPath: [{ x: 18, y: 14 }, { x: 18, y: 7 }] },
];

// Station NPCs — static sprites rendered at their posts, animated by station sequences
const STATION_NPC_DEFS = [
  { texture: 'npc-ticket-agent', tileX: 8, tileY: 15 },      // Station 1: ticket counter
  { texture: 'npc-ticket-agent', tileX: 20, tileY: 15 },      // Second check-in agent (background)
  { texture: 'npc-passport-officer', tileX: 18, tileY: 12 },  // Station 3: passport control
  { texture: 'npc-security-guard', tileX: 18, tileY: 10 },    // Station 4: security
  { texture: 'npc-gate-agent', tileX: 24, tileY: 4 },         // Station 5: boarding gate
];

const INTERIOR_SIGNS: SignDef[] = [
  { id: 'sign-gate-maui', tileX: 24, tileY: 2, texture: 'sign-gate-number', tooltipText: 'Gate 1 — Maui' },
  { id: 'sign-cafe', tileX: 5, tileY: 2, texture: 'sign-cafe', tooltipText: 'Sky Cafe' },
  { id: 'sign-security', tileX: 18, tileY: 8, texture: 'sign-security', tooltipText: 'Security' },
];

export class AirportInteriorScene extends InteriorScene {
  // Exposed for CheckinStations module to access
  public player!: import('../../entities/Player').Player;
  public partner!: import('../../entities/Partner').Partner;

  private npcSystem!: NPCSystem;
  private signTooltip!: SignTooltip;
  private boardingTriggered = false;

  // Station progression (transient — resets each visit)
  private currentStation = 0; // 0 = not started, increments as stations complete
  private sequenceActive = false;
  private stationIndicator: Phaser.GameObjects.Rectangle | null = null;
  private stationNPCSprites: Phaser.GameObjects.Image[] = [];

  constructor() {
    super({ key: 'AirportInteriorScene' });
  }

  getLayout(): InteriorLayout {
    return AIRPORT_INTERIOR_LAYOUT;
  }

  create(): void {
    super.create();
    saveCurrentScene('AirportInteriorScene');
    this.player.setTemporaryTexture('player-suitcase', this);
    this.partner.setTemporaryTexture('partner-suitcase', this);
    this.boardingTriggered = false;
    this.currentStation = 0;
    this.sequenceActive = false;

    // Create station NPC sprites (static images, not in NPCSystem)
    this.stationNPCSprites = STATION_NPC_DEFS.map(def => {
      const pos = tileToWorld(def.tileX, def.tileY);
      return this.add.image(pos.x, pos.y, def.texture, 0).setDepth(8);
    });

    // NPCSystem for dialogue NPCs only (barista + passengers)
    this.npcSystem = new NPCSystem();
    this.npcSystem.create(this, DIALOG_NPCS);
    this.signTooltip = new SignTooltip(this, INTERIOR_SIGNS);

    // Wire barista dialogue
    this.npcSystem.onDwellTrigger = (npc) => {
      if (!npc.interactionData?.lines) return;
      this.inputSystem.freeze();
      uiManager.showNPCDialog(npc.interactionData.lines, () => {
        uiManager.hideNPCDialog();
        this.inputSystem.unfreeze();
        this.npcSystem.onDialogueEnd(npc.id);
      });
    };

    // Show first station indicator
    this.updateStationIndicator();
  }

  private updateStationIndicator(): void {
    this.stationIndicator?.destroy();
    this.stationIndicator = null;

    if (this.currentStation >= STATIONS.length) return;

    const station = STATIONS[this.currentStation];
    const pos = tileToWorld(station.triggerTileX, station.triggerTileY);
    this.stationIndicator = this.add.rectangle(
      pos.x, pos.y, TILE_SIZE - 4, TILE_SIZE - 4,
      0xFFDD44, 0.3,
    ).setDepth(1);

    // Pulsing alpha tween
    this.tweens.add({
      targets: this.stationIndicator,
      alpha: 0.6,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private async runStation(stationIndex: number): Promise<void> {
    this.sequenceActive = true;
    this.inputSystem.freeze();

    const sequences = [
      playTicketCounter,
      playLuggageCheckin,
      playPassportControl,
      playSecurityScreening,
      playBoardingGate,
    ];

    await sequences[stationIndex](this);

    this.currentStation = stationIndex + 1;
    this.sequenceActive = false;
    this.inputSystem.unfreeze();
    this.updateStationIndicator();

    // After final station, trigger boarding
    if (this.currentStation >= STATIONS.length) {
      this.startBoarding();
    }
  }

  private startBoarding(): void {
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
        this.scene.start('AirplaneCutscene', { destination: 'maui' });
      },
    });
  }

  update(time: number, delta: number): void {
    super.update(time, delta);
    const pos = this.player.getPosition();
    this.npcSystem.update(delta, pos.x, pos.y, this.inputSystem.isFrozen);
    const playerTile = worldToTile(pos.x, pos.y);
    this.signTooltip.update(playerTile.x, playerTile.y);

    // Station trigger check — only when no sequence is running
    if (!this.sequenceActive && this.currentStation < STATIONS.length) {
      const nextStation = STATIONS[this.currentStation];
      if (playerTile.x === nextStation.triggerTileX && playerTile.y === nextStation.triggerTileY) {
        this.runStation(this.currentStation);
      }
    }
  }

  shutdown(): void {
    super.shutdown();
    this.npcSystem?.destroy();
    this.signTooltip?.destroy();
    this.stationIndicator?.destroy();
    this.stationNPCSprites.forEach(s => s.destroy());
    this.stationNPCSprites = [];
  }
}
```

- [ ] **Step 2: Verify build compiles**

Run: `npm run build 2>&1 | head -20`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/game/scenes/airport/AirportInteriorScene.ts
git commit -m "feat(airport): integrate station progression and animated check-in sequences"
```

---

### Task 6: Manual Testing & Polish

**Files:**
- Possibly modify: `src/game/scenes/airport/CheckinStations.ts` (timing/position adjustments)
- Possibly modify: `src/game/scenes/airport/AirportInteriorScene.ts` (trigger tile positions)

- [ ] **Step 1: Run dev server and test full flow**

Run: `npm run dev`

Test the full check-in flow:
1. Enter airport from overworld
2. Verify yellow pulsing indicator on ticket counter trigger tile
3. Walk to station 1 (ticket counter) — verify departure board animation plays, boarding pass shown
4. Verify indicator moves to station 2 (luggage)
5. Walk to station 2 — verify suitcase slides to belt, weight display, tag, rolls away
6. Verify player/partner suitcase textures removed after luggage check-in
7. Walk to station 3 (passport) — verify passport slide, stamp, camera shake
8. Walk to station 4 (security) — verify bin, items, metal detector walk-through, green flash
9. Walk to station 5 (gate) — verify boarding pass scan, checkmark, then transition to cutscene
10. Verify cafe barista dialogue still works at any point
11. Verify exiting airport mid-process and re-entering resets progress
12. Verify pressing ESC during a sequence does NOT exit the scene
13. Verify station NPC sprites render correctly at their positions

- [ ] **Step 2: Adjust animation timings if needed**

Based on testing, tweak `duration` values in the tween configs in `CheckinStations.ts` if sequences feel too fast or too slow. Target 3-6 seconds per station.

- [ ] **Step 3: Fix any sprite positioning issues**

Based on testing, adjust `tileX`/`tileY` values in `STATIONS` array or sprite positions in animation sequences if props appear misaligned with the layout decorations.

- [ ] **Step 4: Commit final adjustments**

```bash
git add src/game/scenes/airport/CheckinStations.ts src/game/scenes/airport/AirportInteriorScene.ts
git commit -m "fix(airport): polish check-in animation timing and positioning"
```
