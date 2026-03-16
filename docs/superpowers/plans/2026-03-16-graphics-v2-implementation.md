# Graphics Overhaul v2 — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dramatically improve game visuals: animated sky/clouds background with parallax, higher-quality character rendering, 2 new outfits, and fix 4 critical bugs.

**Architecture:** All graphics remain procedurally generated via Canvas 2D. Background uses Phaser `GameObjects.Graphics` with `setScrollFactor` for parallax. Character rendering is improved in-place. New outfits append to existing `OUTFITS` array. Boot is parallelized via `Promise.all`.

**Tech Stack:** Phaser 3 (v3.90.0), TypeScript (strict), Vite 8, Canvas 2D API

**Design Document:** `docs/plans/2026-03-16-final-design-v2.md`

---

## File Structure

| File | Action | Purpose |
|------|--------|---------|
| `src/rendering/OffscreenCharacterRenderer.ts` | Modify | Fix outfit wiring (replace `drawOutfitPlaceholder` with real outfit calls), improve arms/legs/hair/highlights |
| `src/rendering/OutfitRenderer.ts` | Modify | Fix BodyMetrics import, add 2 new outfits (Graphic Tee, Smart Casual) |
| `src/rendering/WorldRenderer.ts` | Modify | Fix null guard in `makeCanvas` |
| `src/rendering/SkyRenderer.ts` | Create | Animated sky gradient, clouds, sun/moon, atmospheric haze |
| `src/utils/canvasUtils.ts` | Create | Shared pure functions: `getSkyColors`, `getArmOffsets`, `darkenHex`, `lightenHex`, `hexToComponents` |
| `src/scenes/BootScene.ts` | Modify | Parallel boot via `Promise.all`, update `totalSteps` |
| `src/scenes/WorldScene.ts` | Modify | Integrate SkyRenderer, add `gameTimeMinutes` state |
| `src/scenes/DressingRoomScene.ts` | Modify | Use `OUTFITS.length` instead of hardcoded 8 |

---

## Chunk 1: P0 Bug Fixes

### Task 1: Fix BodyMetrics duplication (Bug 2)

**Files:**
- Modify: `src/rendering/OutfitRenderer.ts:10-27`

- [ ] **Step 1: Restore the canonical import and remove duplicate interface**

In `src/rendering/OutfitRenderer.ts`, replace lines 8-27:

```typescript
// Try the canonical import first; fall back to a local definition if the
// module doesn't exist yet (parallel development).
// import type { BodyMetrics } from './OffscreenCharacterRenderer';

export interface BodyMetrics {
  centerX: number;
  shoulderY: number;
  waistY: number;
  hipY: number;
  kneeY: number;
  ankleY: number;
  shoulderWidth: number;
  waistWidth: number;
  hipWidth: number;
  leftArmX: number;
  rightArmX: number;
  armTopY: number;
  armBottomY: number;
  scale: number;
}
```

With:

```typescript
import type { BodyMetrics } from './OffscreenCharacterRenderer';
```

Note: `OutfitDefinition` interface stays in this file — do NOT remove it.

- [ ] **Step 2: Verify the project compiles**

Run: `cd /c/Learnings/game-website && npx tsc --noEmit`
Expected: No errors. If `BodyMetrics` is imported elsewhere from `OutfitRenderer`, those imports will need updating (check for `import { BodyMetrics } from './OutfitRenderer'` or `from '../rendering/OutfitRenderer'`).

- [ ] **Step 3: Check for downstream BodyMetrics imports**

Search the codebase for any file importing `BodyMetrics` from `OutfitRenderer`. If found, update those imports to point to `OffscreenCharacterRenderer` instead. If none found, this step is complete.

---

### Task 2: Fix null guard in WorldRenderer (Bug 4)

**Files:**
- Modify: `src/rendering/WorldRenderer.ts:13-18`

- [ ] **Step 1: Replace the non-null assertion with explicit throw**

In `src/rendering/WorldRenderer.ts`, replace lines 13-18:

```typescript
  private static makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    return [canvas, ctx];
  }
```

With:

```typescript
  private static makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error(`WorldRenderer: failed to get 2D context for ${w}x${h} canvas`);
    return [canvas, ctx];
  }
```

- [ ] **Step 2: Verify the project compiles**

Run: `cd /c/Learnings/game-website && npx tsc --noEmit`
Expected: No errors.

---

### Task 3: Wire real OutfitRenderer into character pipeline (Bug 1)

**Files:**
- Modify: `src/rendering/OffscreenCharacterRenderer.ts:1,52-53,198-199,415-509`

This is the P0 bug — `drawOutfitPlaceholder()` is called instead of real outfits.

- [ ] **Step 1: Add OUTFITS import at the top of OffscreenCharacterRenderer.ts**

In `src/rendering/OffscreenCharacterRenderer.ts`, after line 1 (`import Phaser from 'phaser';`), add:

```typescript
import { OUTFITS } from './OutfitRenderer';
```

- [ ] **Step 2: Replace drawOutfitPlaceholder call with real outfit call**

In `src/rendering/OffscreenCharacterRenderer.ts`, replace line 198-199:

```typescript
  // ===== Layer 5: Outfit placeholder =====
  drawOutfitPlaceholder(ctx, cx, metrics, outfitIndex, isHer, s);
```

With:

```typescript
  // ===== Layer 5: Outfit =====
  const outfit = OUTFITS[outfitIndex % OUTFITS.length];
  try {
    outfit.draw(ctx, character, frameIndex, metrics);
  } catch (err) {
    console.warn(`Outfit ${outfitIndex} draw failed (frame ${frameIndex}):`, err);
  }
```

- [ ] **Step 3: Delete the drawOutfitPlaceholder function and OUTFIT_COLORS constant**

In `src/rendering/OffscreenCharacterRenderer.ts`:

Delete the `OUTFIT_COLORS` constant (line 53):
```typescript
const OUTFIT_COLORS = ['#4488cc', '#cc4444', '#44cc44', '#cccc44', '#cc44cc', '#cc8844', '#44cccc', '#8844cc'];
```

Delete the entire `drawOutfitPlaceholder` function (lines 415-509).

- [ ] **Step 4: Verify the project compiles and run**

Run: `cd /c/Learnings/game-website && npx tsc --noEmit`
Expected: No errors.

Run: `cd /c/Learnings/game-website && npx vite build`
Expected: Build succeeds.

---

### Task 4: Parallelize boot sequence (Bug 3)

**Files:**
- Modify: `src/scenes/BootScene.ts:41-49`

- [ ] **Step 1: Replace the sequential character texture loop with parallel Promise.all**

In `src/scenes/BootScene.ts`, replace lines 41-49:

```typescript
    // Generate character textures (async due to image loading)
    const renderer = new OffscreenCharacterRenderer();
    for (const character of ['her', 'him'] as const) {
      for (let outfit = 0; outfit < 8; outfit++) {
        await renderer.generateCharacterTextures(this, character, outfit, `${character}-outfit-${outfit}`);
        updateBar();
        await renderer.generatePreviewTexture(this, character, outfit, `${character}-preview-${outfit}`);
        updateBar();
      }
    }
```

With:

```typescript
    // Generate character textures in parallel
    const renderer = new OffscreenCharacterRenderer();
    const tasks: Promise<void>[] = [];
    for (const character of ['her', 'him'] as const) {
      for (let outfit = 0; outfit < 8; outfit++) {
        tasks.push(
          renderer.generateCharacterTextures(this, character, outfit, `${character}-outfit-${outfit}`)
            .then(() => updateBar()),
        );
        tasks.push(
          renderer.generatePreviewTexture(this, character, outfit, `${character}-preview-${outfit}`)
            .then(() => updateBar()),
        );
      }
    }
    await Promise.all(tasks);
```

- [ ] **Step 2: Verify the project compiles**

Run: `cd /c/Learnings/game-website && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Test in dev server**

Run: `cd /c/Learnings/game-website && npx vite build`
Expected: Build succeeds. All character textures load. Characters display correct outfits.

---

## Chunk 2: Shared Utilities

### Task 5: Create canvasUtils.ts with shared pure functions

**Files:**
- Create: `src/utils/canvasUtils.ts`

- [ ] **Step 1: Create the canvasUtils module**

Create `src/utils/canvasUtils.ts`:

```typescript
/**
 * Shared pure Canvas2D utility functions.
 * No Phaser dependency — usable in unit tests.
 */

export function hexToComponents(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

export function darkenHex(hex: string, amount: number): string {
  const [r, g, b] = hexToComponents(hex);
  const dr = Math.max(0, Math.round(r * (1 - amount)));
  const dg = Math.max(0, Math.round(g * (1 - amount)));
  const db = Math.max(0, Math.round(b * (1 - amount)));
  return `rgb(${dr},${dg},${db})`;
}

export function lightenHex(hex: string, amount: number): string {
  const [r, g, b] = hexToComponents(hex);
  const lr = Math.min(255, Math.round(r + (255 - r) * amount));
  const lg = Math.min(255, Math.round(g + (255 - g) * amount));
  const lb = Math.min(255, Math.round(b + (255 - b) * amount));
  return `rgb(${lr},${lg},${lb})`;
}

/**
 * Get arm Y-offsets for a given walk frame.
 * Must match the offsets used by OffscreenCharacterRenderer.drawArms().
 */
export function getArmOffsets(frame: 0 | 1 | 2, scale: number): { leftDy: number; rightDy: number } {
  switch (frame) {
    case 1:
      return { leftDy: 0, rightDy: -4 * scale };
    case 2:
      return { leftDy: -4 * scale, rightDy: 0 };
    default:
      return { leftDy: 0, rightDy: 0 };
  }
}

/**
 * Interpolate between two hex colors.
 * t=0 returns c1, t=1 returns c2.
 */
export function lerpColor(c1: string, c2: string, t: number): string {
  const [r1, g1, b1] = hexToComponents(c1);
  const [r2, g2, b2] = hexToComponents(c2);
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  return `rgb(${r},${g},${b})`;
}

export interface SkyColors {
  topColor: string;
  bottomColor: string;
  horizonGlow: string;
  starOpacity: number;
}

/**
 * Pure function: given game time in minutes (0-1440), return sky colors.
 * 0=midnight, 360=6am dawn, 720=noon, 1080=6pm dusk, 1440=midnight
 */
export function getSkyColors(gameTimeMinutes: number): SkyColors {
  const t = ((gameTimeMinutes % 1440) + 1440) % 1440;

  if (t < 300) {
    // Midnight to 5am — deep night
    return { topColor: '#050510', bottomColor: '#0a0a2e', horizonGlow: '#1a1a3e', starOpacity: 1.0 };
  } else if (t < 390) {
    // 5am-6:30am — dawn transition
    const p = (t - 300) / 90;
    return {
      topColor: lerpColor('#050510', '#2a1a3a', p),
      bottomColor: lerpColor('#0a0a2e', '#ff6b35', p),
      horizonGlow: lerpColor('#1a1a3e', '#ffa07a', p),
      starOpacity: 1.0 - p,
    };
  } else if (t < 480) {
    // 6:30am-8am — sunrise to morning
    const p = (t - 390) / 90;
    return {
      topColor: lerpColor('#2a1a3a', '#5a8fbf', p),
      bottomColor: lerpColor('#ff6b35', '#87ceeb', p),
      horizonGlow: lerpColor('#ffa07a', '#c8e8ff', p),
      starOpacity: 0,
    };
  } else if (t < 1020) {
    // 8am-5pm — daytime
    const midP = Math.sin(((t - 480) / 540) * Math.PI);
    return {
      topColor: lerpColor('#5a8fbf', '#3a6fa0', midP),
      bottomColor: lerpColor('#87ceeb', '#a8d8f0', midP),
      horizonGlow: lerpColor('#c8e8ff', '#e0f0ff', midP),
      starOpacity: 0,
    };
  } else if (t < 1110) {
    // 5pm-6:30pm — sunset
    const p = (t - 1020) / 90;
    return {
      topColor: lerpColor('#3a6fa0', '#2a1530', p),
      bottomColor: lerpColor('#a8d8f0', '#ff4500', p),
      horizonGlow: lerpColor('#e0f0ff', '#ff8c00', p),
      starOpacity: 0,
    };
  } else if (t < 1200) {
    // 6:30pm-8pm — dusk to night
    const p = (t - 1110) / 90;
    return {
      topColor: lerpColor('#2a1530', '#050510', p),
      bottomColor: lerpColor('#ff4500', '#0a0a2e', p),
      horizonGlow: lerpColor('#ff8c00', '#1a1a3e', p),
      starOpacity: p,
    };
  } else {
    // 8pm-midnight — night
    return { topColor: '#050510', bottomColor: '#0a0a2e', horizonGlow: '#1a1a3e', starOpacity: 1.0 };
  }
}
```

- [ ] **Step 2: Verify the project compiles**

Run: `cd /c/Learnings/game-website && npx tsc --noEmit`
Expected: No errors.

---

## Chunk 3: Character Rendering Quality

### Task 6: Improve walk animation — wider arc and foot lift

**Files:**
- Modify: `src/rendering/OffscreenCharacterRenderer.ts:132-158,267-300`

- [ ] **Step 1: Add leg Y-offsets to FrameOffsets interface and getFrameOffsets**

In `src/rendering/OffscreenCharacterRenderer.ts`, replace lines 132-158:

```typescript
interface FrameOffsets {
  leftLegDx: number;
  rightLegDx: number;
  leftArmDy: number;
  rightArmDy: number;
}

function getFrameOffsets(frameIndex: number, scale: number): FrameOffsets {
  switch (frameIndex) {
    case 1: // left step
      return {
        leftLegDx: -3 * scale,
        rightLegDx: 2 * scale,
        leftArmDy: 0,
        rightArmDy: -3 * scale,
      };
    case 2: // right step (mirror)
      return {
        leftLegDx: 2 * scale,
        rightLegDx: -3 * scale,
        leftArmDy: -3 * scale,
        rightArmDy: 0,
      };
    default: // neutral
      return { leftLegDx: 0, rightLegDx: 0, leftArmDy: 0, rightArmDy: 0 };
  }
}
```

With:

```typescript
interface FrameOffsets {
  leftLegDx: number;
  rightLegDx: number;
  leftLegDy: number;
  rightLegDy: number;
  leftArmDy: number;
  rightArmDy: number;
}

function getFrameOffsets(frameIndex: number, scale: number): FrameOffsets {
  switch (frameIndex) {
    case 1: // left step
      return {
        leftLegDx: -5 * scale,
        rightLegDx: 3 * scale,
        leftLegDy: 0,
        rightLegDy: -4 * scale,
        leftArmDy: 0,
        rightArmDy: -4 * scale,
      };
    case 2: // right step (mirror)
      return {
        leftLegDx: 3 * scale,
        rightLegDx: -5 * scale,
        leftLegDy: -4 * scale,
        rightLegDy: 0,
        leftArmDy: -4 * scale,
        rightArmDy: 0,
      };
    default: // neutral
      return { leftLegDx: 0, rightLegDx: 0, leftLegDy: 0, rightLegDy: 0, leftArmDy: 0, rightArmDy: 0 };
  }
}
```

- [ ] **Step 2: Update drawLegs to use Y-offsets for foot lift and toe-shaped shoes**

In `src/rendering/OffscreenCharacterRenderer.ts`, replace the entire `drawLegs` function (lines 267-300):

```typescript
function drawLegs(
  ctx: CanvasRenderingContext2D,
  cx: number,
  metrics: BodyMetrics,
  offsets: FrameOffsets,
  s: number,
): void {
  const legTopY = metrics.hipY + 4 * s;
  const legWidth = 10 * s;
  const legHeight = metrics.ankleY - legTopY + 6 * s;
  const legSpacing = 6 * s;

  // Left leg
  ctx.save();
  ctx.fillStyle = '#334466';
  roundedRect(ctx, cx - legSpacing - legWidth + offsets.leftLegDx, legTopY, legWidth, legHeight, 3 * s);
  ctx.fill();
  // Left shoe
  ctx.fillStyle = '#553322';
  roundedRect(ctx, cx - legSpacing - legWidth + offsets.leftLegDx - 1 * s, legTopY + legHeight - 5 * s, legWidth + 2 * s, 6 * s, 2 * s);
  ctx.fill();
  ctx.restore();

  // Right leg
  ctx.save();
  ctx.fillStyle = '#334466';
  roundedRect(ctx, cx + legSpacing + offsets.rightLegDx, legTopY, legWidth, legHeight, 3 * s);
  ctx.fill();
  // Right shoe
  ctx.fillStyle = '#553322';
  roundedRect(ctx, cx + legSpacing + offsets.rightLegDx - 1 * s, legTopY + legHeight - 5 * s, legWidth + 2 * s, 6 * s, 2 * s);
  ctx.fill();
  ctx.restore();
}
```

With:

```typescript
function drawLegs(
  ctx: CanvasRenderingContext2D,
  cx: number,
  metrics: BodyMetrics,
  offsets: FrameOffsets,
  s: number,
): void {
  const legTopY = metrics.hipY + 4 * s;
  const legWidth = 10 * s;
  const legHeight = metrics.ankleY - legTopY + 6 * s;
  const legSpacing = 6 * s;

  // Left leg
  ctx.save();
  const leftY = legTopY + offsets.leftLegDy;
  ctx.fillStyle = '#334466';
  roundedRect(ctx, cx - legSpacing - legWidth + offsets.leftLegDx, leftY, legWidth, legHeight, 3 * s);
  ctx.fill();
  // Left shoe — toe-shaped ellipse
  ctx.fillStyle = '#553322';
  ctx.beginPath();
  ctx.ellipse(
    cx - legSpacing - legWidth / 2 + offsets.leftLegDx,
    leftY + legHeight - 1 * s,
    legWidth * 0.7, 4 * s, -0.2, 0, Math.PI * 2,
  );
  ctx.fill();
  ctx.restore();

  // Right leg
  ctx.save();
  const rightY = legTopY + offsets.rightLegDy;
  ctx.fillStyle = '#334466';
  roundedRect(ctx, cx + legSpacing + offsets.rightLegDx, rightY, legWidth, legHeight, 3 * s);
  ctx.fill();
  // Right shoe — toe-shaped ellipse
  ctx.fillStyle = '#553322';
  ctx.beginPath();
  ctx.ellipse(
    cx + legSpacing + legWidth / 2 + offsets.rightLegDx,
    rightY + legHeight - 1 * s,
    legWidth * 0.7, 4 * s, 0.2, 0, Math.PI * 2,
  );
  ctx.fill();
  ctx.restore();
}
```

- [ ] **Step 3: Verify the project compiles**

Run: `cd /c/Learnings/game-website && npx tsc --noEmit`
Expected: No errors.

---

### Task 7: Improve arms with elbow hint

**Files:**
- Modify: `src/rendering/OffscreenCharacterRenderer.ts` — `drawArms` function (lines 511-588 after previous edits)

- [ ] **Step 1: Replace drawArms with elbow-bend version**

Replace the entire `drawArms` function with:

```typescript
function drawArms(
  ctx: CanvasRenderingContext2D,
  cx: number,
  metrics: BodyMetrics,
  offsets: FrameOffsets,
  isHer: boolean,
  s: number,
): void {
  const armWidth = isHer ? 8 * s : 10 * s;
  const armLength = metrics.armBottomY - metrics.armTopY;
  const elbowFrac = 0.5;

  // Left arm
  ctx.save();
  const lx = metrics.leftArmX;
  const ly = metrics.armTopY + offsets.leftArmDy;
  const elbowLx = lx - 2 * s;
  const elbowLy = ly + armLength * elbowFrac;

  const leftArmGrad = ctx.createLinearGradient(lx, ly, lx, ly + armLength);
  leftArmGrad.addColorStop(0, SKIN_TONE);
  leftArmGrad.addColorStop(1, SKIN_SHADOW);
  ctx.fillStyle = leftArmGrad;

  // Upper arm (shoulder to elbow)
  ctx.beginPath();
  ctx.moveTo(lx - armWidth / 2, ly);
  ctx.bezierCurveTo(
    lx - armWidth / 2 - 1 * s, ly + armLength * 0.2,
    elbowLx - armWidth / 2, elbowLy - 2 * s,
    elbowLx - armWidth / 2 + 1 * s, elbowLy,
  );
  ctx.lineTo(elbowLx + armWidth / 2 - 1 * s, elbowLy);
  ctx.bezierCurveTo(
    lx + armWidth / 2, elbowLy - 2 * s,
    lx + armWidth / 2 + 1 * s, ly + armLength * 0.2,
    lx + armWidth / 2, ly,
  );
  ctx.closePath();
  ctx.fill();

  // Lower arm (elbow to wrist)
  ctx.beginPath();
  ctx.moveTo(elbowLx - armWidth / 2 + 1 * s, elbowLy);
  ctx.bezierCurveTo(
    elbowLx - armWidth / 2, elbowLy + armLength * 0.2,
    lx - armWidth / 2, ly + armLength * 0.9,
    lx - armWidth / 2 + 1 * s, ly + armLength,
  );
  ctx.lineTo(lx + armWidth / 2 - 1 * s, ly + armLength);
  ctx.bezierCurveTo(
    lx + armWidth / 2, ly + armLength * 0.9,
    elbowLx + armWidth / 2, elbowLy + armLength * 0.2,
    elbowLx + armWidth / 2 - 1 * s, elbowLy,
  );
  ctx.closePath();
  ctx.fill();

  // Left hand
  ctx.fillStyle = SKIN_TONE;
  ctx.beginPath();
  ctx.ellipse(lx, ly + armLength + 3 * s, armWidth / 2, 4 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Right arm
  ctx.save();
  const rx = metrics.rightArmX;
  const ry = metrics.armTopY + offsets.rightArmDy;
  const elbowRx = rx + 2 * s;
  const elbowRy = ry + armLength * elbowFrac;

  const rightArmGrad = ctx.createLinearGradient(rx, ry, rx, ry + armLength);
  rightArmGrad.addColorStop(0, SKIN_TONE);
  rightArmGrad.addColorStop(1, SKIN_SHADOW);
  ctx.fillStyle = rightArmGrad;

  // Upper arm
  ctx.beginPath();
  ctx.moveTo(rx - armWidth / 2, ry);
  ctx.bezierCurveTo(
    rx - armWidth / 2 - 1 * s, ry + armLength * 0.2,
    elbowRx - armWidth / 2, elbowRy - 2 * s,
    elbowRx - armWidth / 2 + 1 * s, elbowRy,
  );
  ctx.lineTo(elbowRx + armWidth / 2 - 1 * s, elbowRy);
  ctx.bezierCurveTo(
    rx + armWidth / 2, elbowRy - 2 * s,
    rx + armWidth / 2 + 1 * s, ry + armLength * 0.2,
    rx + armWidth / 2, ry,
  );
  ctx.closePath();
  ctx.fill();

  // Lower arm
  ctx.beginPath();
  ctx.moveTo(elbowRx - armWidth / 2 + 1 * s, elbowRy);
  ctx.bezierCurveTo(
    elbowRx - armWidth / 2, elbowRy + armLength * 0.2,
    rx - armWidth / 2, ry + armLength * 0.9,
    rx - armWidth / 2 + 1 * s, ry + armLength,
  );
  ctx.lineTo(rx + armWidth / 2 - 1 * s, ry + armLength);
  ctx.bezierCurveTo(
    rx + armWidth / 2, ry + armLength * 0.9,
    elbowRx + armWidth / 2, elbowRy + armLength * 0.2,
    elbowRx + armWidth / 2 - 1 * s, elbowRy,
  );
  ctx.closePath();
  ctx.fill();

  // Right hand
  ctx.fillStyle = SKIN_TONE;
  ctx.beginPath();
  ctx.ellipse(rx, ry + armLength + 3 * s, armWidth / 2, 4 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
```

- [ ] **Step 2: Verify the project compiles**

Run: `cd /c/Learnings/game-website && npx tsc --noEmit`
Expected: No errors.

---

### Task 8: Improve highlights — stronger chin AO and hair sheen

**Files:**
- Modify: `src/rendering/OffscreenCharacterRenderer.ts` — `drawHighlights` and `drawFrontHair` functions

- [ ] **Step 1: Enhance drawHighlights with stronger chin shadow and nose shadow**

Replace the `drawHighlights` function with:

```typescript
function drawHighlights(
  ctx: CanvasRenderingContext2D,
  cx: number,
  headCy: number,
  metrics: BodyMetrics,
  _hairDark: string,
  isHer: boolean,
  canvasW: number,
  canvasH: number,
  s: number,
): void {
  // Rim lighting pass using 'screen' composite
  ctx.save();
  ctx.globalCompositeOperation = 'screen';

  const headRadius = isHer ? 14 * s : 15 * s;

  // Hair rim light (right side)
  ctx.fillStyle = 'rgba(80,60,40,0.15)';
  ctx.beginPath();
  ctx.ellipse(cx + headRadius * 0.7, headCy - headRadius * 0.5, 4 * s, headRadius * 0.8, 0.3, 0, Math.PI * 2);
  ctx.fill();

  // Body rim light
  ctx.fillStyle = 'rgba(60,50,40,0.1)';
  ctx.beginPath();
  ctx.ellipse(
    cx + metrics.shoulderWidth / 2 - 2 * s,
    (metrics.shoulderY + metrics.hipY) / 2,
    3 * s,
    (metrics.hipY - metrics.shoulderY) / 2,
    0, 0, Math.PI * 2,
  );
  ctx.fill();

  ctx.restore();

  // Subtle shading pass using 'multiply'
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';

  // Under-chin shadow — wider and more opaque
  ctx.fillStyle = 'rgba(200,180,160,0.4)';
  ctx.beginPath();
  ctx.ellipse(cx, headCy + headRadius + 2 * s, 10 * s, 3.5 * s, 0, 0, Math.PI * 2);
  ctx.fill();

  // Under-nose shadow
  ctx.fillStyle = 'rgba(200,180,160,0.2)';
  ctx.beginPath();
  ctx.ellipse(cx, headCy + 6 * s, 4 * s, 1.5 * s, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}
```

- [ ] **Step 2: Add hair sheen pass to drawFrontHair**

At the end of the `drawFrontHair` function, just before the final `ctx.restore();`, add:

```typescript
  // Hair sheen — specular highlight
  ctx.globalCompositeOperation = 'screen';
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.beginPath();
  ctx.ellipse(
    cx + headRadius * 0.2,
    hairTop + headRadius * 0.4,
    headRadius * 0.3,
    headRadius * 0.8,
    -0.4, 0, Math.PI * 2,
  );
  ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
```

- [ ] **Step 3: Verify the project compiles**

Run: `cd /c/Learnings/game-website && npx tsc --noEmit`
Expected: No errors.

---

## Chunk 4: Background System

### Task 9: Create SkyRenderer

**Files:**
- Create: `src/rendering/SkyRenderer.ts`

- [ ] **Step 1: Create the SkyRenderer class**

Create `src/rendering/SkyRenderer.ts`:

```typescript
import Phaser from 'phaser';
import { getSkyColors, lerpColor } from '../utils/canvasUtils';

interface CloudObject {
  graphics: Phaser.GameObjects.Graphics;
  worldX: number;
  speed: number;
  width: number;
  baseY: number;
  alpha: number;
  puffs: Array<{ rx: number; ry: number; rw: number; rh: number }>;
}

export class SkyRenderer {
  private skyBg!: Phaser.GameObjects.Graphics;
  private clouds: CloudObject[] = [];
  private sun!: Phaser.GameObjects.Graphics;
  private haze!: Phaser.GameObjects.Graphics;
  private stars: Array<{ x: number; y: number; size: number }> = [];
  private screenW = 0;
  private screenH = 0;
  private worldW = 0;

  create(scene: Phaser.Scene, worldW: number, _worldH: number): void {
    this.screenW = scene.cameras.main.width;
    this.screenH = scene.cameras.main.height;
    this.worldW = worldW;

    // Sky background — fixed to camera
    this.skyBg = scene.add.graphics();
    this.skyBg.setScrollFactor(0);
    this.skyBg.setDepth(-10000);

    // Generate star positions (deterministic seed via fixed positions)
    this.stars = [];
    for (let i = 0; i < 60; i++) {
      this.stars.push({
        x: ((i * 137 + 53) % this.screenW),
        y: ((i * 97 + 31) % (this.screenH * 0.6)),
        size: (i % 3 === 0) ? 1.5 : 1,
      });
    }

    // Sun/Moon
    this.sun = scene.add.graphics();
    this.sun.setScrollFactor(0);
    this.sun.setDepth(-9998);

    // Clouds — 3 layers
    const cloudConfigs = [
      { count: 4, scrollFactor: 0.05, speedMin: 4, speedMax: 8, alphaMin: 0.2, alphaMax: 0.35, yMin: 0.05, yMax: 0.2 },
      { count: 4, scrollFactor: 0.15, speedMin: 8, speedMax: 15, alphaMin: 0.3, alphaMax: 0.5, yMin: 0.1, yMax: 0.3 },
      { count: 3, scrollFactor: 0.3, speedMin: 15, speedMax: 25, alphaMin: 0.4, alphaMax: 0.6, yMin: 0.15, yMax: 0.35 },
    ];

    for (const cfg of cloudConfigs) {
      for (let i = 0; i < cfg.count; i++) {
        const g = scene.add.graphics();
        g.setScrollFactor(cfg.scrollFactor, 0);
        g.setDepth(-9999);

        const cloudW = 60 + (i * 37 % 80);
        const puffs = this.generateCloudPuffs(cloudW);

        const cloud: CloudObject = {
          graphics: g,
          worldX: (i * (worldW / cfg.count)) + (i * 73 % 100),
          speed: cfg.speedMin + (i * 13 % (cfg.speedMax - cfg.speedMin)),
          width: cloudW,
          baseY: this.screenH * (cfg.yMin + (i * 41 % 100) / 100 * (cfg.yMax - cfg.yMin)),
          alpha: cfg.alphaMin + (i * 23 % 100) / 100 * (cfg.alphaMax - cfg.alphaMin),
          puffs,
        };
        this.clouds.push(cloud);
      }
    }

    // Atmospheric haze
    this.haze = scene.add.graphics();
    this.haze.setScrollFactor(0);
    this.haze.setDepth(-9997);
  }

  private generateCloudPuffs(cloudW: number): Array<{ rx: number; ry: number; rw: number; rh: number }> {
    const puffs = [];
    const count = 3 + Math.floor(cloudW / 30);
    for (let i = 0; i < count; i++) {
      puffs.push({
        rx: (i / count) * cloudW - cloudW / 2,
        ry: (i % 2 === 0 ? -5 : 3) + (i * 7 % 6 - 3),
        rw: 20 + (i * 13 % 25),
        rh: 12 + (i * 11 % 10),
      });
    }
    return puffs;
  }

  update(_scene: Phaser.Scene, gameTimeMinutes: number, delta: number): void {
    const colors = getSkyColors(gameTimeMinutes);
    const deltaS = delta / 1000;

    // Draw sky gradient
    this.skyBg.clear();
    const steps = 16;
    for (let i = 0; i < steps; i++) {
      const t = i / steps;
      const color = lerpColor(colors.topColor, colors.bottomColor, t);
      const bandH = Math.ceil(this.screenH / steps) + 1;
      this.skyBg.fillStyle(this.cssToHex(color), 1);
      this.skyBg.fillRect(0, Math.floor(t * this.screenH), this.screenW, bandH);
    }

    // Draw stars (only when visible)
    if (colors.starOpacity > 0.01) {
      for (const star of this.stars) {
        this.skyBg.fillStyle(0xffffff, colors.starOpacity * (0.5 + Math.sin(star.x + gameTimeMinutes * 0.1) * 0.5));
        this.skyBg.fillCircle(star.x, star.y, star.size);
      }
    }

    // Sun / Moon
    this.sun.clear();
    const t = gameTimeMinutes % 1440;
    if (t > 360 && t < 1140) {
      // Daytime — draw sun
      const sunProgress = (t - 360) / (1140 - 360);
      const sunAngle = Math.PI * sunProgress;
      const sunX = this.screenW * 0.1 + Math.sin(sunAngle) * this.screenW * 0.8;
      const sunY = this.screenH * 0.45 - Math.sin(sunAngle) * this.screenH * 0.35;

      // Sun glow
      this.sun.fillStyle(0xfff5c0, 0.15);
      this.sun.fillCircle(sunX, sunY, 30);
      this.sun.fillStyle(0xfff5c0, 0.3);
      this.sun.fillCircle(sunX, sunY, 18);
      this.sun.fillStyle(0xfffde0, 0.9);
      this.sun.fillCircle(sunX, sunY, 10);
    } else {
      // Nighttime — draw moon
      const moonProgress = t < 360
        ? (t + 1440 - 1140) / (1440 - 1140 + 360)
        : (t - 1140) / (1440 - 1140 + 360);
      const moonAngle = Math.PI * moonProgress;
      const moonX = this.screenW * 0.2 + Math.sin(moonAngle) * this.screenW * 0.6;
      const moonY = this.screenH * 0.4 - Math.sin(moonAngle) * this.screenH * 0.3;

      // Moon glow
      this.sun.fillStyle(0xc8d8f0, 0.1);
      this.sun.fillCircle(moonX, moonY, 20);
      this.sun.fillStyle(0xe8e8f0, 0.7);
      this.sun.fillCircle(moonX, moonY, 8);
    }

    // Update clouds
    for (const cloud of this.clouds) {
      cloud.worldX += cloud.speed * deltaS;
      if (cloud.worldX > this.worldW + cloud.width) {
        cloud.worldX = -cloud.width;
      }

      cloud.graphics.clear();
      cloud.graphics.fillStyle(0xffffff, cloud.alpha);
      for (const puff of cloud.puffs) {
        cloud.graphics.fillEllipse(
          cloud.worldX + puff.rx,
          cloud.baseY + puff.ry,
          puff.rw,
          puff.rh,
        );
      }
    }

    // Atmospheric haze
    this.haze.clear();
    const hazeAlpha = (t > 300 && t < 480) || (t > 1020 && t < 1200) ? 0.12 : 0.04;
    const hazeTop = this.screenH * 0.8;
    for (let i = 0; i < 8; i++) {
      const frac = i / 8;
      this.haze.fillStyle(0xc8dcff, hazeAlpha * frac);
      this.haze.fillRect(0, hazeTop + frac * (this.screenH - hazeTop), this.screenW, (this.screenH - hazeTop) / 8 + 1);
    }
  }

  private cssToHex(css: string): number {
    // Handle rgb(r,g,b) format
    const match = css.match(/rgb\((\d+),(\d+),(\d+)\)/);
    if (match) {
      return (parseInt(match[1]) << 16) | (parseInt(match[2]) << 8) | parseInt(match[3]);
    }
    // Handle #rrggbb format
    return parseInt(css.replace('#', ''), 16);
  }
}
```

- [ ] **Step 2: Verify the project compiles**

Run: `cd /c/Learnings/game-website && npx tsc --noEmit`
Expected: No errors.

---

### Task 10: Integrate SkyRenderer into WorldScene

**Files:**
- Modify: `src/scenes/WorldScene.ts`

- [ ] **Step 1: Add SkyRenderer import and state**

In `src/scenes/WorldScene.ts`, add import after line 5:

```typescript
import { SkyRenderer } from '../rendering/SkyRenderer';
```

Add class properties after line 38 (`private partnerMoving = false;`):

```typescript
  private skyRenderer!: SkyRenderer;
  private gameTimeMinutes = 480; // start at 8am
```

- [ ] **Step 2: Create sky in the create method — BEFORE createMap**

In `src/scenes/WorldScene.ts`, in the `create()` method, add before `this.createMap();` (line 46):

```typescript
    // Sky background — must be created before map tiles
    this.skyRenderer = new SkyRenderer();
    this.skyRenderer.create(this, 40 * 32, 30 * 32);
```

- [ ] **Step 3: Update sky in the update method**

In `src/scenes/WorldScene.ts`, in the `update` method (line 314), add at the start of the method body before `this.handleMovement();`:

```typescript
    // Advance game time and update sky
    this.gameTimeMinutes = (this.gameTimeMinutes + delta * 0.0005) % 1440;
    this.skyRenderer.update(this, this.gameTimeMinutes, delta);
```

- [ ] **Step 4: Verify the project compiles and builds**

Run: `cd /c/Learnings/game-website && npx tsc --noEmit && npx vite build`
Expected: No errors.

---

## Chunk 5: New Outfits

### Task 11: Add Graphic Tee outfit

**Files:**
- Modify: `src/rendering/OutfitRenderer.ts`

- [ ] **Step 1: Add drawGraphicTee function before the OUTFITS array**

In `src/rendering/OutfitRenderer.ts`, add before the `OUTFITS` array definition (before the line `export const OUTFITS: OutfitDefinition[] = [`):

```typescript
// ---------------------------------------------------------------------------
// 8 — Graphic Tee
// ---------------------------------------------------------------------------

function drawGraphicTee(
  ctx: CanvasRenderingContext2D,
  character: 'her' | 'him',
  _frame: number,
  m: BodyMetrics,
) {
  const s = m.scale;
  if (character === 'her') {
    // Oversized graphic tee — mid-thigh length, white
    const teeColor = '#F5F0E8';
    const teeGrad = vGrad(ctx, m.centerX, m.shoulderY, m.kneeY - 6 * s, '#FFFFFF', teeColor);
    ctx.fillStyle = teeGrad;
    // Oversized = wider than shoulders
    trapezoid(ctx, m.centerX, m.shoulderY, hw(m, 'shoulder') * 1.15, m.kneeY - 6 * s, hw(m, 'hip') * 1.2);
    ctx.fill();

    // Crew neckline
    ctx.fillStyle = 'rgba(0,0,0,0.1)';
    ctx.beginPath();
    ctx.moveTo(m.centerX - hw(m, 'shoulder') * 0.25, m.shoulderY);
    ctx.bezierCurveTo(
      m.centerX - hw(m, 'shoulder') * 0.1, m.shoulderY + 4 * s,
      m.centerX + hw(m, 'shoulder') * 0.1, m.shoulderY + 4 * s,
      m.centerX + hw(m, 'shoulder') * 0.25, m.shoulderY,
    );
    ctx.closePath();
    ctx.fill();

    // Graphic — colorful geometric band across chest
    const graphicY = m.shoulderY + (m.waistY - m.shoulderY) * 0.35;
    const graphicH = 10 * s;
    // Teal band
    ctx.fillStyle = '#2DD4BF';
    ctx.fillRect(m.centerX - hw(m, 'shoulder') * 0.9, graphicY, hw(m, 'shoulder') * 1.8, graphicH * 0.4);
    // Coral band
    ctx.fillStyle = '#FB7185';
    ctx.fillRect(m.centerX - hw(m, 'shoulder') * 0.9, graphicY + graphicH * 0.4, hw(m, 'shoulder') * 1.8, graphicH * 0.3);
    // Gold band
    ctx.fillStyle = '#FBBF24';
    ctx.fillRect(m.centerX - hw(m, 'shoulder') * 0.9, graphicY + graphicH * 0.7, hw(m, 'shoulder') * 1.8, graphicH * 0.3);

    // Short sleeves
    const sleeveLen = (m.waistY - m.shoulderY) * 0.3;
    const sleeveW = hw(m, 'shoulder') * 0.5;
    shortSleeve(ctx, m.leftArmX, m.armTopY, sleeveLen, sleeveW, teeColor);
    shortSleeve(ctx, m.rightArmX, m.armTopY, sleeveLen, sleeveW, teeColor);

    // Bike shorts underneath
    ctx.fillStyle = '#1a1a1a';
    const shortsTop = m.hipY;
    const shortsBot = m.kneeY - 8 * s;
    trapezoid(ctx, m.centerX, shortsTop, hw(m, 'hip') * 0.85, shortsBot, hw(m, 'hip') * 0.75);
    ctx.fill();
    const legInset = 2 * s;
    ctx.fillRect(m.centerX - hw(m, 'hip') * 0.75, shortsBot, hw(m, 'hip') * 0.75 - legInset, 4 * s);
    ctx.fillRect(m.centerX + legInset, shortsBot, hw(m, 'hip') * 0.75 - legInset, 4 * s);
  } else {
    // Him: Graphic tee + joggers
    const teeColor = '#E8E4E0';
    const teeGrad = vGrad(ctx, m.centerX, m.shoulderY, m.waistY + 6 * s, '#F5F0EA', teeColor);
    ctx.fillStyle = teeGrad;
    trapezoid(ctx, m.centerX, m.shoulderY, hw(m, 'shoulder') * 1.05, m.waistY + 6 * s, hw(m, 'waist') * 1.05);
    ctx.fill();

    // Rounded neckline
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.beginPath();
    ctx.moveTo(m.centerX - hw(m, 'shoulder') * 0.3, m.shoulderY);
    ctx.bezierCurveTo(
      m.centerX - hw(m, 'shoulder') * 0.15, m.shoulderY + 5 * s,
      m.centerX + hw(m, 'shoulder') * 0.15, m.shoulderY + 5 * s,
      m.centerX + hw(m, 'shoulder') * 0.3, m.shoulderY,
    );
    ctx.closePath();
    ctx.fill();

    // Diagonal stripe graphic
    const gY = m.shoulderY + (m.waistY - m.shoulderY) * 0.3;
    ctx.save();
    ctx.beginPath();
    // Clip to shirt area
    trapezoid(ctx, m.centerX, m.shoulderY, hw(m, 'shoulder') * 1.05, m.waistY + 6 * s, hw(m, 'waist') * 1.05);
    ctx.clip();
    // Draw diagonal stripes
    ctx.fillStyle = '#2DD4BF';
    ctx.beginPath();
    ctx.moveTo(m.centerX - hw(m, 'shoulder'), gY);
    ctx.lineTo(m.centerX + hw(m, 'shoulder') * 0.3, gY);
    ctx.lineTo(m.centerX + hw(m, 'shoulder'), gY + 8 * s);
    ctx.lineTo(m.centerX - hw(m, 'shoulder') * 0.3, gY + 8 * s);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#FB7185';
    ctx.beginPath();
    ctx.moveTo(m.centerX - hw(m, 'shoulder') * 0.6, gY + 8 * s);
    ctx.lineTo(m.centerX + hw(m, 'shoulder') * 0.6, gY + 8 * s);
    ctx.lineTo(m.centerX + hw(m, 'shoulder'), gY + 14 * s);
    ctx.lineTo(m.centerX, gY + 14 * s);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Short sleeves
    const sleeveLen = (m.waistY - m.shoulderY) * 0.35;
    const sleeveW = hw(m, 'shoulder') * 0.55;
    shortSleeve(ctx, m.leftArmX, m.armTopY, sleeveLen, sleeveW, teeColor);
    shortSleeve(ctx, m.rightArmX, m.armTopY, sleeveLen, sleeveW, teeColor);

    // Joggers — dark gray
    const joggerColor = '#3A3A3A';
    const joggerGrad = vGrad(ctx, m.centerX, m.waistY, m.ankleY, '#4A4A4A', joggerColor);
    ctx.fillStyle = joggerGrad;
    trapezoid(ctx, m.centerX, m.waistY, hw(m, 'waist'), m.hipY, hw(m, 'hip'));
    ctx.fill();
    const legInset = 2 * s;
    ctx.fillStyle = joggerGrad;
    ctx.fillRect(m.centerX - hw(m, 'hip'), m.hipY, hw(m, 'hip') - legInset, m.ankleY - m.hipY);
    ctx.fillRect(m.centerX + legInset, m.hipY, hw(m, 'hip') - legInset, m.ankleY - m.hipY);

    // Cuffed ankles
    ctx.fillStyle = '#2A2A2A';
    const cuffH = 3 * s;
    ctx.fillRect(m.centerX - hw(m, 'hip'), m.ankleY - cuffH, hw(m, 'hip') - legInset, cuffH);
    ctx.fillRect(m.centerX + legInset, m.ankleY - cuffH, hw(m, 'hip') - legInset, cuffH);
  }
}
```

- [ ] **Step 2: Add to OUTFITS array**

In `src/rendering/OutfitRenderer.ts`, add to the `OUTFITS` array after the Pajamas entry:

```typescript
  { name: 'Graphic Tee', draw: drawGraphicTee },
```

- [ ] **Step 3: Verify the project compiles**

Run: `cd /c/Learnings/game-website && npx tsc --noEmit`
Expected: No errors.

---

### Task 12: Add Smart Casual outfit

**Files:**
- Modify: `src/rendering/OutfitRenderer.ts`

- [ ] **Step 1: Add drawSmartCasual function after drawGraphicTee**

In `src/rendering/OutfitRenderer.ts`, add after the `drawGraphicTee` function:

```typescript
// ---------------------------------------------------------------------------
// 9 — Smart Casual / Blazer
// ---------------------------------------------------------------------------

function drawSmartCasual(
  ctx: CanvasRenderingContext2D,
  character: 'her' | 'him',
  _frame: number,
  m: BodyMetrics,
) {
  const s = m.scale;
  if (character === 'her') {
    // Fitted blazer + straight-leg trousers
    const blazerColor = '#6B7C93';
    const blazerGrad = vGrad(ctx, m.centerX, m.shoulderY, m.hipY + 2 * s, '#7B8CA3', blazerColor);

    // Trousers first (underneath blazer)
    const trouserColor = '#3A3A3A';
    const trouserGrad = vGrad(ctx, m.centerX, m.waistY, m.ankleY, '#4A4A4A', trouserColor);
    ctx.fillStyle = trouserGrad;
    trapezoid(ctx, m.centerX, m.waistY, hw(m, 'waist'), m.hipY, hw(m, 'hip'));
    ctx.fill();
    const legInset = 2 * s;
    ctx.fillStyle = trouserGrad;
    ctx.fillRect(m.centerX - hw(m, 'hip'), m.hipY, hw(m, 'hip') - legInset, m.ankleY - m.hipY);
    ctx.fillRect(m.centerX + legInset, m.hipY, hw(m, 'hip') - legInset, m.ankleY - m.hipY);

    // Blazer body
    ctx.fillStyle = blazerGrad;
    trapezoid(ctx, m.centerX, m.shoulderY, hw(m, 'shoulder') * 1.02, m.hipY + 2 * s, hw(m, 'hip') * 0.95);
    ctx.fill();

    // Lapels — V-opening showing blouse
    ctx.fillStyle = '#F5F0E8';
    ctx.beginPath();
    ctx.moveTo(m.centerX - hw(m, 'shoulder') * 0.3, m.shoulderY);
    ctx.lineTo(m.centerX - hw(m, 'shoulder') * 0.08, m.waistY + 2 * s);
    ctx.lineTo(m.centerX + hw(m, 'shoulder') * 0.08, m.waistY + 2 * s);
    ctx.lineTo(m.centerX + hw(m, 'shoulder') * 0.3, m.shoulderY);
    ctx.closePath();
    ctx.fill();

    // Lapel lines
    ctx.strokeStyle = '#5A6B80';
    ctx.lineWidth = Math.max(1, 1.2 * s);
    ctx.beginPath();
    ctx.moveTo(m.centerX - hw(m, 'shoulder') * 0.5, m.shoulderY + 3 * s);
    ctx.lineTo(m.centerX - hw(m, 'shoulder') * 0.08, m.waistY + 2 * s);
    ctx.moveTo(m.centerX + hw(m, 'shoulder') * 0.5, m.shoulderY + 3 * s);
    ctx.lineTo(m.centerX + hw(m, 'shoulder') * 0.08, m.waistY + 2 * s);
    ctx.stroke();

    // Blazer sleeves (3/4 length)
    const sleeveLen = (m.armBottomY - m.armTopY) * 0.65;
    const sleeveW = hw(m, 'shoulder') * 0.5;
    shortSleeve(ctx, m.leftArmX, m.armTopY, sleeveLen, sleeveW, blazerColor);
    shortSleeve(ctx, m.rightArmX, m.armTopY, sleeveLen, sleeveW, blazerColor);
  } else {
    // Open blazer over white tee + dark chinos
    const blazerColor = '#5A6B80';

    // White tee underneath
    const teeGrad = vGrad(ctx, m.centerX, m.shoulderY, m.waistY + 4 * s, '#FFFFFF', '#F0EBE5');
    ctx.fillStyle = teeGrad;
    trapezoid(ctx, m.centerX, m.shoulderY, hw(m, 'shoulder') * 0.9, m.waistY + 4 * s, hw(m, 'waist') * 0.9);
    ctx.fill();

    // Neckline
    ctx.fillStyle = 'rgba(0,0,0,0.1)';
    ctx.beginPath();
    ctx.moveTo(m.centerX - hw(m, 'shoulder') * 0.25, m.shoulderY);
    ctx.bezierCurveTo(
      m.centerX - hw(m, 'shoulder') * 0.1, m.shoulderY + 4 * s,
      m.centerX + hw(m, 'shoulder') * 0.1, m.shoulderY + 4 * s,
      m.centerX + hw(m, 'shoulder') * 0.25, m.shoulderY,
    );
    ctx.closePath();
    ctx.fill();

    // Chinos — charcoal
    const chinoColor = '#4A4A4A';
    const chinoGrad = vGrad(ctx, m.centerX, m.waistY, m.ankleY, '#5A5A5A', chinoColor);
    ctx.fillStyle = chinoGrad;
    trapezoid(ctx, m.centerX, m.waistY, hw(m, 'waist'), m.hipY, hw(m, 'hip'));
    ctx.fill();
    const legInset = 2 * s;
    ctx.fillStyle = chinoGrad;
    ctx.fillRect(m.centerX - hw(m, 'hip'), m.hipY, hw(m, 'hip') - legInset, m.ankleY - m.hipY);
    ctx.fillRect(m.centerX + legInset, m.hipY, hw(m, 'hip') - legInset, m.ankleY - m.hipY);

    // Blazer — open, two sides with gap showing tee
    const blazerGrad = vGrad(ctx, m.centerX, m.shoulderY, m.hipY + 4 * s, '#6A7B90', blazerColor);
    // Left panel
    ctx.fillStyle = blazerGrad;
    ctx.beginPath();
    ctx.moveTo(m.centerX - hw(m, 'shoulder'), m.shoulderY);
    ctx.lineTo(m.centerX - hw(m, 'shoulder') * 0.15, m.shoulderY);
    ctx.lineTo(m.centerX - hw(m, 'shoulder') * 0.1, m.hipY + 4 * s);
    ctx.lineTo(m.centerX - hw(m, 'hip') * 0.95, m.hipY + 4 * s);
    ctx.closePath();
    ctx.fill();
    // Right panel
    ctx.beginPath();
    ctx.moveTo(m.centerX + hw(m, 'shoulder'), m.shoulderY);
    ctx.lineTo(m.centerX + hw(m, 'shoulder') * 0.15, m.shoulderY);
    ctx.lineTo(m.centerX + hw(m, 'shoulder') * 0.1, m.hipY + 4 * s);
    ctx.lineTo(m.centerX + hw(m, 'hip') * 0.95, m.hipY + 4 * s);
    ctx.closePath();
    ctx.fill();

    // Lapel edges
    ctx.strokeStyle = '#4A5B70';
    ctx.lineWidth = Math.max(1, 1 * s);
    ctx.beginPath();
    ctx.moveTo(m.centerX - hw(m, 'shoulder') * 0.15, m.shoulderY);
    ctx.lineTo(m.centerX - hw(m, 'shoulder') * 0.1, m.hipY + 4 * s);
    ctx.moveTo(m.centerX + hw(m, 'shoulder') * 0.15, m.shoulderY);
    ctx.lineTo(m.centerX + hw(m, 'shoulder') * 0.1, m.hipY + 4 * s);
    ctx.stroke();

    // Blazer sleeves
    const sleeveLen = (m.armBottomY - m.armTopY) * 0.7;
    const sleeveW = hw(m, 'shoulder') * 0.55;
    shortSleeve(ctx, m.leftArmX, m.armTopY, sleeveLen, sleeveW, blazerColor);
    shortSleeve(ctx, m.rightArmX, m.armTopY, sleeveLen, sleeveW, blazerColor);
  }
}
```

- [ ] **Step 2: Add to OUTFITS array**

Add to the `OUTFITS` array after the Graphic Tee entry:

```typescript
  { name: 'Smart Casual', draw: drawSmartCasual },
```

- [ ] **Step 3: Verify the project compiles**

Run: `cd /c/Learnings/game-website && npx tsc --noEmit`
Expected: No errors.

---

### Task 13: Update BootScene and DressingRoomScene for new outfit count

**Files:**
- Modify: `src/scenes/BootScene.ts:23,44`
- Modify: `src/scenes/DressingRoomScene.ts:3,118-121`

- [ ] **Step 1: Update BootScene to use OUTFITS.length and recalculate totalSteps**

In `src/scenes/BootScene.ts`, add import after line 3:

```typescript
import { OUTFITS } from '../rendering/OutfitRenderer';
```

Replace the totalSteps line and the outfit loop:

Change:
```typescript
    const totalSteps = 35; // 1 world + 1 particles + 1 photo + 32 character (16 texture + 16 preview)
```
To:
```typescript
    const outfitCount = OUTFITS.length;
    const totalSteps = 3 + outfitCount * 2 * 2; // 1 world + 1 particles + 1 photo + (outfits * 2 chars * 2 calls)
```

Change the outfit loop:
```typescript
      for (let outfit = 0; outfit < 8; outfit++) {
```
To:
```typescript
      for (let outfit = 0; outfit < outfitCount; outfit++) {
```

- [ ] **Step 2: Update DressingRoomScene to use OUTFITS.length instead of hardcoded 8**

In `src/scenes/DressingRoomScene.ts`, replace lines 117-121:

```typescript
  private changeOutfit(delta: number): void {
    if (this.currentCharacter === 'her') {
      this.herOutfit = (this.herOutfit + delta + 8) % 8;
    } else {
      this.hisOutfit = (this.hisOutfit + delta + 8) % 8;
    }
```

With:

```typescript
  private changeOutfit(delta: number): void {
    const count = OUTFIT_NAMES.length;
    if (this.currentCharacter === 'her') {
      this.herOutfit = (this.herOutfit + delta + count) % count;
    } else {
      this.hisOutfit = (this.hisOutfit + delta + count) % count;
    }
```

- [ ] **Step 3: Verify the project compiles and builds**

Run: `cd /c/Learnings/game-website && npx tsc --noEmit && npx vite build`
Expected: No errors. Build succeeds.

---

## Chunk 6: Error Handling Polish

### Task 14: Add boot error recovery and outfit draw safety

**Files:**
- Modify: `src/scenes/BootScene.ts`

- [ ] **Step 1: Wrap Promise.all in try/catch with fallback texture registration**

In `src/scenes/BootScene.ts`, wrap the `await Promise.all(tasks)` in a try/catch:

Replace:
```typescript
    await Promise.all(tasks);
```

With:
```typescript
    try {
      await Promise.all(tasks);
    } catch (err) {
      console.error('Boot: some textures failed to generate:', err);
      // Register fallback textures for any missing keys
      const fallbackCanvas = document.createElement('canvas');
      fallbackCanvas.width = 160;
      fallbackCanvas.height = 200;
      const fallbackCtx = fallbackCanvas.getContext('2d');
      if (fallbackCtx) {
        fallbackCtx.fillStyle = import.meta.env.DEV ? '#ff00ff' : '#888888';
        fallbackCtx.fillRect(0, 0, 160, 200);
      }
      for (const character of ['her', 'him'] as const) {
        for (let outfit = 0; outfit < outfitCount; outfit++) {
          const textureKey = `${character}-outfit-${outfit}`;
          for (let frame = 0; frame < 3; frame++) {
            const frameKey = `${textureKey}-frame-${frame}`;
            if (!this.textures.exists(frameKey)) {
              this.textures.addCanvas(frameKey, fallbackCanvas);
            }
          }
          const previewKey = `${character}-preview-${outfit}`;
          if (!this.textures.exists(previewKey)) {
            this.textures.addCanvas(previewKey, fallbackCanvas);
          }
        }
      }
    }
```

- [ ] **Step 2: Verify the project compiles and builds**

Run: `cd /c/Learnings/game-website && npx tsc --noEmit && npx vite build`
Expected: No errors. Build succeeds.

---

## Verification Checklist

After all tasks are complete, verify:

- [ ] `npx tsc --noEmit` passes with no errors
- [ ] `npx vite build` succeeds
- [ ] Game boots faster than before (parallel texture generation)
- [ ] Characters display real outfits (not flat colored placeholders)
- [ ] All 10 outfits are visible in the dressing room for both characters
- [ ] Walk animation shows foot lift and wider leg arc
- [ ] Arms have visible elbow bend
- [ ] Sky has animated gradient that changes over game time
- [ ] Clouds drift across the sky with parallax
- [ ] Sun/moon is visible and moves across sky
- [ ] Dawn/dusk transitions produce warm colors
- [ ] Atmospheric haze is subtle at ground level
