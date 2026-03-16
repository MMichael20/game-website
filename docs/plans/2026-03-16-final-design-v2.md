# Final Design Document — Game Improvements v2
**Date:** 2026-03-16
**Status:** Authoritative — supersedes earlier proposal documents
**Scope:** Background animation, character rendering quality, outfit system, bug fixes, boot optimization

---

## 0. Decision Rationale

This document synthesizes three proposals and a critic pass. Every architectural choice below is justified by the reasoning recorded here. Proposals are referenced as A (maintainability), B (robustness), C (clean architecture).

| Decision | Choice | Reason |
|---|---|---|
| Boot parallelism | Promise.all groups, not PipelineScheduler | PipelineScheduler (A) is 400+ lines to replace 35 sequential awaits. `Promise.all` with two dependency groups is correct, readable, and zero-risk. |
| Outfit wiring | Call `OutfitRenderer.OUTFITS[i].draw()` directly from `drawCharacter()`, remove `drawOutfitPlaceholder` | Fixes P0 bug. No new abstraction needed. |
| `BodyMetrics` duplication | Export from `OffscreenCharacterRenderer.ts`, import in `OutfitRenderer.ts` | Eliminates duplicate. The commented-out import in `OutfitRenderer.ts` line 10 shows the original intent. |
| Background system | Phaser GameObjects with `setScrollFactor` (parallax) | Camera does follow the player; critic correctly called out that `scrollFactor` IS viable. Avoids inconsistency with texture pipeline. |
| Cloud animation | Phaser `Graphics` objects updated in `update()`, not a separate texture step | Keeps dynamic motion without adding boot cost. |
| Outfit layer ordering | Implicit positional order (draw calls in sequence) — no explicit `zIndex` field | Proposal A's `OutfitLayer[]` with zIndex AND positional ordering is ambiguous as the critic noted. The current pattern (draw calls = z-order) is unambiguous. |
| Error handling | Null-guard `makeCanvas`, magenta fallback texture in dev, solid-color fallback in prod | Proposal B's `safeArc` wrappers solve a non-existent problem. Canvas 2D does not throw. Null guards on `getContext` are the real gap. |
| Walk frame / outfit interaction | Outfit draw receives `frame: number`; frame-aware outfits animate sleeve position | This shared omission is addressed in section 5. |
| State for time-of-day | Plain `number` exported from `WorldScene`; no event emitter | `TimeOfDayManager` (A) is overkill. A single `export let gameTimeMinutes = 480` read by sky renderer is sufficient. |
| Registry pattern | Module-level `const OUTFITS: OutfitDefinition[]` array — no singleton class | Proposal C's singleton is a testing anti-pattern. The existing array pattern in `OutfitRenderer.ts` is already correct. |
| 6-frame walk cycle | Rejected — keep 3-frame (neutral, left-step, right-step) | The critic correctly noted 6 frames are unjustified. Doubling texture count doubles boot time with no visible gain at 8 fps. |
| Per-step boot timeouts | Rejected (Proposal B) | Introduces non-determinism in deterministic canvas rendering. If a step hangs it is a bug to fix, not to timeout around. |

---

## 1. Architecture Overview and File Structure

### Current structure (unchanged files omitted)

```
src/
  rendering/
    OffscreenCharacterRenderer.ts   ← owns BodyMetrics export (bug fix)
    OutfitRenderer.ts               ← imports BodyMetrics from above (bug fix)
    WorldRenderer.ts                ← null-guard fix; generateSky() added
    SkyRenderer.ts                  ← NEW: animated sky, clouds, parallax layers
    ParticleConfigs.ts
    UIRenderer.ts
  scenes/
    BootScene.ts                    ← parallel boot groups (optimization)
    WorldScene.ts                   ← SkyRenderer integration; gameTime export
    DressingRoomScene.ts
    MenuScene.ts
  utils/
    canvasUtils.ts                  ← NEW: shared Canvas2D pure functions
```

### New files

| File | Purpose |
|---|---|
| `src/rendering/SkyRenderer.ts` | Animated sky gradient, cloud layer, sun/moon, atmospheric haze. Pure Phaser GameObjects. |
| `src/utils/canvasUtils.ts` | Pure Canvas2D helpers: `roundedRect`, `vGrad`, `trapezoid`, `darkenHex`, `lightenHex`. Eliminates duplication between `OffscreenCharacterRenderer.ts` and `OutfitRenderer.ts`. |

### Deleted/renamed

- `drawOutfitPlaceholder` function in `OffscreenCharacterRenderer.ts` is **removed** (replaced by real `OutfitRenderer` call).

---

## 2. Bug Fixes (P0 — implement first)

### Bug 1: `drawOutfitPlaceholder` called instead of `OutfitRenderer`

**File:** `src/rendering/OffscreenCharacterRenderer.ts`

**Problem:** Layer 5 in `drawCharacter()` calls `drawOutfitPlaceholder()`, a flat colored shape that ignores the real outfit definitions in `OutfitRenderer.ts`.

**Fix:**
1. Import `OUTFITS` from `OutfitRenderer.ts` at the top of `OffscreenCharacterRenderer.ts`.
2. In `drawCharacter()`, replace the `drawOutfitPlaceholder(...)` call with:
   ```typescript
   // Layer 5: Real outfit
   const outfit = OUTFITS[outfitIndex % OUTFITS.length];
   outfit.draw(ctx, character, frameIndex, metrics);
   ```
3. Delete the `drawOutfitPlaceholder` function entirely.
4. Delete the `OUTFIT_COLORS` constant (no longer needed).

**Why this is safe:** `OutfitRenderer.OUTFITS` is a plain array of objects with `draw` functions. No circular dependency: `OutfitRenderer` imports `BodyMetrics` type from `OffscreenCharacterRenderer`; `OffscreenCharacterRenderer` imports `OUTFITS` (value) from `OutfitRenderer`. TypeScript resolves this cleanly as a value import and a type import in opposite directions.

> Note on circular imports: TypeScript handles circular imports at the value level only when the circular chain does not require a value before the module that exports it is evaluated. Here, `OUTFITS` is a module-level `const` array, evaluated before any function runs. `BodyMetrics` is an interface (type-only, erased at runtime). There is no runtime circular dependency.

### Bug 2: `BodyMetrics` interface duplicated

**Files:** `OffscreenCharacterRenderer.ts` (line 7) and `OutfitRenderer.ts` (line 12)

**Problem:** Two definitions can drift. The `OutfitRenderer.ts` copy has the commented-out import on line 10 showing the original intent was to import it.

**Fix:**
1. Keep the export in `OffscreenCharacterRenderer.ts` (already there, well-documented).
2. In `OutfitRenderer.ts`, uncomment and restore line 10:
   ```typescript
   import type { BodyMetrics } from './OffscreenCharacterRenderer';
   ```
3. Delete the local `export interface BodyMetrics` block (lines 12–27) from `OutfitRenderer.ts`.
4. Keep `export interface OutfitDefinition` — it stays in `OutfitRenderer.ts`.

### Bug 3: Sequential boot when parallel is possible

**File:** `src/scenes/BootScene.ts`

**Problem:** `generateCharacterTextures` and `generatePreviewTexture` are awaited sequentially in a loop — 16 texture sets × 2 = 32 sequential async image-load round trips.

**Fix:** Parallelize within two dependency groups:
```typescript
// Group A: synchronous (no change needed)
WorldRenderer.generateAllTextures(this);
generateParticleTextures(this);
this.generatePlaceholderPhoto();
updateBar(); // combined bar update for group A

// Group B: all 32 character texture sets in parallel
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

**Why this is safe:** Each texture write targets a unique key string. Phaser's texture manager is not async-locked — `addImage` is synchronous once the `Image` fires `onload`. Parallel image decode is handled by the browser's image decode thread pool. Expected boot time reduction: from ~2–4 s to ~0.5–1 s on a modern browser.

**Total steps counter:** Stays at 35 (3 sync + 32 async). Progress bar updates remain accurate.

### Bug 4: Missing null guards on canvas context in WorldRenderer

**File:** `src/rendering/WorldRenderer.ts`

**Problem:** `makeCanvas` uses `canvas.getContext('2d')!` non-null assertion. If the browser is at canvas limit or running in a headless test environment, this silently passes a `null` ctx, causing cryptic `TypeError: Cannot read properties of null` errors deep in draw calls.

**Fix:** Change `makeCanvas` to throw explicitly:
```typescript
private static makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error(`WorldRenderer: failed to get 2D context for ${w}×${h} canvas`);
  return [canvas, ctx];
}
```

Apply the same null-check pattern to the two canvas creation sites in `OffscreenCharacterRenderer.ts` (lines 1043 and 1091, which already do `if (!ctx) throw new Error(...)` — these are already correct).

---

## 3. Background System

### Goal
Replace the static void/color background with: animated sky gradient, layered parallax clouds, sun arc, atmospheric depth haze, and time-of-day color shifting — all using Phaser GameObjects, no new texture pipeline steps.

### File: `src/rendering/SkyRenderer.ts`

```typescript
export class SkyRenderer {
  private skyBg: Phaser.GameObjects.Graphics;
  private clouds: CloudObject[];
  private sun: Phaser.GameObjects.Graphics;
  private haze: Phaser.GameObjects.Graphics;

  create(scene: Phaser.Scene, worldW: number, worldH: number): void { ... }
  update(scene: Phaser.Scene, gameTimeMinutes: number, delta: number): void { ... }
}
```

### Sky gradient

The sky is a `Phaser.GameObjects.Graphics` object set to `setScrollFactor(0)` (fixed to camera) and drawn to fill the screen. It is **redrawn every frame** via `Graphics.clear()` + `fillGradientStyle()`.

Time-of-day drives sky color:
- 0–360 min (midnight to 6 am): deep navy `#0a0a2e` → indigo `#1a1a5e`
- 360–420 min (6–7 am): dawn gradient `#ff6b35` → `#ffd700`
- 420–1080 min (7 am–6 pm): day blue `#87ceeb` → `#c8e8ff`
- 1080–1140 min (6–7 pm): dusk `#ff9b4e` → `#e86bff`
- 1140–1440 min (7 pm–midnight): night `#1a1a5e` → `#0a0a2e`

Use linear interpolation between named stops. Expose a `getSkyColors(t: number): [number, number, number, number]` pure function (returns four Phaser packed colors: top-left, top-right, bottom-left, bottom-right) so it is unit-testable without a Phaser instance.

### Cloud layer

Three cloud layers with different `scrollFactor` values create depth parallax:
- Layer 0: `scrollFactor(0.05, 0)` — far clouds, slow, small, high opacity
- Layer 1: `scrollFactor(0.15, 0)` — mid clouds, medium speed
- Layer 2: `scrollFactor(0.3, 0)` — near clouds, fast, larger

Each cloud is a `CloudObject`:
```typescript
interface CloudObject {
  graphics: Phaser.GameObjects.Graphics;
  layer: 0 | 1 | 2;
  worldX: number;    // position in world space (not screen)
  speed: number;     // pixels per second, rightward drift
  width: number;
  alpha: number;
}
```

Clouds are drawn as 3–5 overlapping ellipses of varying opacity. In `update()`, advance `worldX` by `speed * delta/1000`, wrap at `worldW + cloud.width`. Redraw with `Graphics.clear()` only when position changes more than 0.5px.

**Why `Graphics` not texture:** Cloud shapes are simple enough that re-drawing 12–15 ellipses per frame is negligible. Adding cloud textures to the boot pipeline adds ~3 texture steps with no quality gain.

### Sun / Moon

A single `Phaser.GameObjects.Graphics` fixed to the camera (`setScrollFactor(0)`). In `update()`:
- During day: draw a `#FFF5C0` filled circle with a soft radial glow ring (two nested circles with decreasing alpha). Position follows a sine arc across the screen top.
- During night: draw a white circle with a blue-tinted glow. Add 3–6 static star dots (drawn once on night entry, cleared on day entry).
- During dawn/dusk: draw both at reduced alpha, blending the transition.

The arc calculation: `sunAngle = Math.PI * ((t - dawn) / (dusk - dawn))`, position = `(sin(angle) * screenW * 0.45 + screenW/2, screenH * 0.15 + cos(angle) * screenH * 0.12)`.

### Atmospheric haze

A `Phaser.GameObjects.Graphics` covering the bottom 20% of the screen, `setScrollFactor(0)`. Draw a vertical gradient from `rgba(200,220,255,0)` at top to `rgba(200,220,255,0.15)` at bottom. This gives a ground-fog effect at dusk/dawn; reduce alpha during midday.

### Integration in WorldScene

```typescript
// In WorldScene.create():
this.skyRenderer = new SkyRenderer();
this.skyRenderer.create(this, mapWidth * tileSize, mapHeight * tileSize);

// In WorldScene.update():
this.skyRenderer.update(this, this.gameTimeMinutes, delta);
this.gameTimeMinutes = (this.gameTimeMinutes + delta / 1000 * 0.5) % 1440; // 48-min real = 1 game day
```

The `gameTimeMinutes` field starts at 480 (8 am) so players see daylight on first load.

Add sky objects to the scene **before** the tilemap in `create()` so they render behind world tiles.

---

## 4. Character Rendering Improvements

### Current quality gaps

1. Arms are straight cylinders with no elbow suggestion
2. Leg animation has minimal offset (`±3px`) — barely perceptible
3. Shoes are flat rounded rects with no toe shape
4. Head shading uses only a radial gradient — no ambient occlusion under chin

### Improvements

**Legs — wider walk arc:**
Increase `leftLegDx` / `rightLegDx` in `getFrameOffsets()` from ±3 to ±5 for step frames. Add a Y offset to simulate the lifted foot: step foot rises `+4px` on Y. This is visible at the 160px canvas size.

```typescript
case 1: // left step
  return {
    leftLegDx: -5 * scale,  // was -3
    rightLegDx: 3 * scale,  // was 2
    leftLegDy: 0,
    rightLegDy: -4 * scale, // NEW: right foot lifts
    leftArmDy: 0,
    rightArmDy: -4 * scale, // was -3
  };
```

Add `leftLegDy` / `rightLegDy` to `FrameOffsets` interface. Pass these into `drawLegs()`.

**Shoes — toe shape:**
Replace `roundedRect` shoes with a pointed ellipse: `ctx.ellipse(cx, cy, legWidth * 0.7, 4 * s, -0.2, 0, Math.PI * 2)` for a subtle toe cap. Her shoes get a slight heel extension (+2px at the back).

**Arms — elbow hint:**
In `drawArms()`, split the arm into two segments (upper arm, lower arm) meeting at an elbow point. The elbow is offset slightly outward. Frame 0: elbow is flush. Frames 1/2: elbow for the swinging arm bends 10°. This is achieved with two bezier curves meeting at the elbow point rather than one long bezier.

**Chin ambient occlusion:**
In `drawHighlights()`, the existing under-chin ellipse uses `'multiply'` composite which works. Increase its opacity from `0.3` to `0.4` and widen the ellipse from `8 * s` to `10 * s`. Also add a small `'multiply'` shadow under the nose.

**Hair sheen:**
Add a second pass in `drawFrontHair()` using `'screen'` composite: a narrow `rgba(255,255,255,0.12)` ellipse drawn diagonally across the top of the hair volume, simulating specular on hair.

**No 6-frame walk cycle.** The existing 4-step animation sequence (frames 0, 1, 0, 2 at 8fps) with improved offsets is sufficient and keeps texture count identical.

---

## 5. Outfit System Architecture

### Walk frame / outfit interaction (shared omission)

The `OutfitDefinition.draw` signature already receives `frame: number`, but no current outfit uses it. This is correct for static garments. For garments with dynamic elements, the frame should be used:

**Principle:** Outfit draw functions that cover the arms **must** account for arm position changes between frames, or the outfit will clip through the skin-colored arm at a different position.

**Implementation rule:**
- Outfits that draw long sleeves (cozy sweater, formal jacket, restaurant blouse) must offset the sleeve endpoint using `frameOffsets.leftArmDy` / `rightArmDy`. These are derived from `frame`:
  ```typescript
  const dy = frame === 1 ? -4 * m.scale : frame === 2 ? 0 : 0;
  // left arm swings on frame 2, right arm swings on frame 1
  ```
- Outfits that only cover the torso (t-shirts stopping at the shoulder cap) do not need frame awareness.

Pass a `getArmOffsets(frame: number, scale: number): { leftDy: number; rightDy: number }` utility function from `canvasUtils.ts` so all outfit functions call the same offset logic as the character body renderer. This keeps arm and sleeve positions in sync.

### BodyMetrics single source of truth

After Bug Fix 2, `BodyMetrics` is defined once and imported everywhere. No further action needed.

### OutfitDefinition interface (unchanged)

```typescript
export interface OutfitDefinition {
  name: string;
  draw: (ctx: CanvasRenderingContext2D, character: 'her' | 'him', frame: number, metrics: BodyMetrics) => void;
}
```

The `frame` parameter is already there. No interface changes needed.

### No enum/component library

Proposal B's `ClothingComponentLibrary` with enums is rejected. Content is open-ended; adding a new outfit should not require updating an enum. The existing pattern (add a function + push to `OUTFITS` array) is correct.

### String IDs vs array index

Outfit selection is stored by array index (0–7). Array indices are used internally because:
- The array is stable (additions are append-only)
- Outfits are referenced as `OUTFITS[outfitIndex % OUTFITS.length]` which degrades gracefully if the stored index is stale
- String IDs add typo risk with no decoupling benefit at this codebase size

If outfit count exceeds 16 in future, migrate to string IDs with a lookup map at that time.

---

## 6. New Outfit Implementations

The existing 8 outfits cover: Casual (sundress/T-shirt), Formal (cocktail/suit), Date Night, Cozy (sweater/hoodie), Sporty, Restaurant (blouse/button-up), Pizza (apron overlay), Pajamas. This covers suits, dresses, t-shirts, and button shirts.

**Identified gaps vs. the goal:**
- No graphic tee / printed tee
- No blazer-over-casual look
- No tracksuit / matching set

**New outfit 8: Graphic Tee** (index 8, requires increasing OUTFITS from 8 to 9 and `totalSteps` from 35 to 37 in BootScene)

```
Her: Oversized graphic tee (mid-thigh length) over bike shorts
  - White/off-white tee body using trapezoid()
  - A colored band across chest area simulating a printed graphic (simple geometric shapes)
  - Black bike shorts from hip to mid-thigh
Him: Graphic tee (standard length) + joggers
  - Same tee body, different chest graphic (e.g. diagonal stripe block)
  - Dark joggers matching drawCozy() pattern
```

**New outfit 9: Smart Casual / Blazer** (index 9)

```
Her: Fitted blazer + straight-leg trousers
  - Blazer drawn using jacket technique from drawFormal() but in a lighter color (#6B7C93)
  - Straight trousers in charcoal
Him: Open blazer over white tee + dark chinos
  - Blazer open (two lapels visible with a gap in center showing white tee beneath)
  - White tee rectangle in the center gap
  - Chino trousers
```

Each new outfit adds 4 texture generation tasks to boot (2 characters × 2 calls each). Update `totalSteps` in `BootScene.ts` accordingly. Since boot is now parallel, actual time impact is minimal.

**Implementation location:** Append `drawGraphicTee()` and `drawSmartCasual()` functions to `OutfitRenderer.ts`, then push two entries to `OUTFITS`.

---

## 7. Boot Optimization

### Parallelization (see Bug Fix 3)

Expected improvement: 2–4 s → 0.5–1 s.

### Synchronous world textures

`WorldRenderer.generateAllTextures()` is already fully synchronous (canvas operations + `addCanvas`). No change needed. Cost is ~50ms.

### No PipelineScheduler

Proposal A's topological scheduler is rejected. The dependency structure is trivial:
- Group 1 (sync): world textures, particles, placeholder photo
- Group 2 (parallel async): all character textures

These two groups can be expressed as sequential `await` of `Promise.all` without any scheduler abstraction.

### No per-step timeouts

Rejected (Proposal B). A hung canvas draw is a bug to fix in the draw function.

### Progress bar accuracy

With parallel tasks, `updateBar()` is called inside each `.then()` callback, preserving progress reporting. The progress bar will now fill at variable rate (multiple bars updating concurrently), which is acceptable and more accurate than fake sequential progress.

---

## 8. Error Handling

### Canvas context null

Fixed in Bug Fix 4. All `getContext('2d')` calls will throw a descriptive error rather than passing `null` to draw functions.

### Texture registration failure

`OffscreenCharacterRenderer.canvasToTexture()` already wraps in a Promise and rejects on `img.onerror`. In the parallel boot, a rejection in any task rejects the outer `Promise.all`, causing the boot to throw. Add a top-level try/catch in `BootScene.create()`:

```typescript
try {
  await Promise.all(tasks);
} catch (err) {
  console.error('Boot failed:', err);
  // Prod fallback: register a solid magenta 160×200 canvas for any missing key
  this.registerFallbackTextures(renderer);
  // Continue to menu — game is playable without one outfit texture
}
```

The `registerFallbackTextures()` method iterates all expected texture keys and calls `textures.addCanvas(key, magentaCanvas)` for any that are missing. Magenta is correct for dev visibility; a neutral gray `#888888` is used in production (gated on `import.meta.env.DEV`).

### OutfitRenderer draw errors

Individual outfit `draw()` calls are inside the character renderer. Wrap each call in a try/catch:
```typescript
try {
  outfit.draw(ctx, character, frameIndex, metrics);
} catch (err) {
  console.warn(`Outfit ${outfitIndex} draw failed (frame ${frameIndex}):`, err);
  // Leave the layer blank — body and hair will still render
}
```

This prevents one broken outfit from crashing all textures.

### No fluent error collector

Proposal B's error collector is rejected. Standard `try/catch` with `console.warn` is sufficient and requires no new abstraction.

---

## 9. State Management

### Game time

```typescript
// WorldScene.ts
export let gameTimeMinutes = 480; // 8 am start
```

`SkyRenderer.update()` receives this as a parameter — it does not import it. `WorldScene.update()` passes it:
```typescript
this.skyRenderer.update(this, gameTimeMinutes, delta);
gameTimeMinutes = (gameTimeMinutes + delta * 0.0005) % 1440; // ~48 min real per game day
```

No event emitter. No singleton. SkyRenderer is stateless with respect to game time — it derives all visuals from the passed value.

### Outfit selection

Unchanged: stored in `localStorage` via `utils/storage.ts`. Loaded by `WorldScene` and `DressingRoomScene`.

### No global singleton registry

Proposal C's singleton registry is rejected (testing anti-pattern). Module-level constants (`OUTFITS`, `BodyMetrics` type) are accessible via normal imports.

---

## 10. Testing Strategy

### Unit-testable pure functions

Move the following into `src/utils/canvasUtils.ts` as exported pure functions (no Phaser, no DOM):
- `darkenHex(hex, amount): string`
- `lightenHex(hex, amount): string`
- `hexToComponents(hex): [number, number, number]`
- `getSkyColors(gameTimeMinutes: number): { topLeft: string, topRight: string, bottomLeft: string, bottomRight: string }`
- `getArmOffsets(frame: 0 | 1 | 2, scale: number): { leftDy: number, rightDy: number }`

These can be tested with Vitest (already in the Vite stack) with zero browser dependency.

### Canvas rendering tests

Use `jest-canvas-mock` or `vitest-canvas-mock` to record draw calls. Key assertions:
- `drawCharacter(ctx, 'her', 0, metrics, 0, 160, 200)` — verify `outfit.draw` is called (not `drawOutfitPlaceholder`)
- `OutfitRenderer.OUTFITS[0].draw(ctx, 'her', 0, metrics)` — verify it does not throw

### Integration: boot time

A Playwright test that boots the game and measures `BootScene.create()` duration:
- Assert boot completes in < 3 seconds in CI
- Assert all 32 expected texture keys exist after boot

### No snapshot tests on Canvas output

Canvas pixel snapshots are brittle across OS/GPU. Rely on call-recording tests instead.

---

## 11. Implementation Order / Phases

### Phase 1 — P0 Bug Fixes (do first, in order)
Estimated effort: 1–2 hours

1. **Bug 2** (BodyMetrics duplication): restore import in `OutfitRenderer.ts`, delete local interface. Zero risk, can be done in isolation.
2. **Bug 4** (null guard in WorldRenderer): replace `!` assertion with explicit throw. Zero risk.
3. **Bug 1** (outfit wiring): import `OUTFITS` in `OffscreenCharacterRenderer.ts`, replace `drawOutfitPlaceholder` call, delete the function. Verify by running the game and checking characters show actual outfits.
4. **Bug 3** (boot parallelism): refactor `BootScene.create()`. Verify boot completes and all textures load.

Checkpoint: all existing outfits render correctly on both characters in the world and dressing room.

### Phase 2 — Shared Utilities
Estimated effort: 1 hour

5. Create `src/utils/canvasUtils.ts` with the pure functions listed in section 10.
6. Update `OffscreenCharacterRenderer.ts` and `OutfitRenderer.ts` to import from `canvasUtils.ts` (remove duplicated `darkenHex`, `lightenHex`, `roundedRect`, `vGrad`, `trapezoid`).
7. Write unit tests for `getSkyColors()` and `getArmOffsets()`.

### Phase 3 — Character Rendering Quality
Estimated effort: 2–3 hours

8. Expand `FrameOffsets` interface to include `leftLegDy`, `rightLegDy`. Update `getFrameOffsets()` with wider arc values.
9. Update `drawLegs()` to apply Y offsets (foot lift on step frames).
10. Update `drawArms()` to split upper/lower arm with elbow bend.
11. Update shoe drawing for toe shape.
12. Update `drawHighlights()` for stronger chin AO.
13. Add hair sheen pass in `drawFrontHair()`.
14. Add `getArmOffsets()` usage in long-sleeve outfits (Cozy, Formal, Restaurant).

Checkpoint: Walk animation looks noticeably better. Sleeve/arm alignment correct on all frames.

### Phase 4 — Background System
Estimated effort: 3–4 hours

15. Create `src/rendering/SkyRenderer.ts` with sky gradient, cloud layer, sun/moon.
16. Add `getSkyColors()` to `canvasUtils.ts` and test.
17. Integrate in `WorldScene.create()` and `WorldScene.update()`.
18. Add `gameTimeMinutes` state to `WorldScene`.
19. Tune cloud speeds, counts, and alpha values visually.

Checkpoint: Game world has animated sky. Clouds drift. Time of day changes sky color over ~48 real minutes.

### Phase 5 — New Outfits
Estimated effort: 2 hours

20. Implement `drawGraphicTee()` in `OutfitRenderer.ts`.
21. Implement `drawSmartCasual()` in `OutfitRenderer.ts`.
22. Push both to `OUTFITS` array.
23. Update `totalSteps` in `BootScene.ts` (35 → 39, accounting for 4 new texture tasks per outfit × 2 outfits ... wait: 2 outfits × 2 characters × 2 calls = 8 new tasks; update to `totalSteps = 43`).
24. Update dressing room to show new outfit names if it hard-codes count.

Checkpoint: Dressing room shows 10 outfits per character. New outfits render correctly.

### Phase 6 — Error Handling Polish
Estimated effort: 1 hour

25. Add try/catch around `Promise.all(tasks)` in BootScene with fallback texture registration.
26. Add per-outfit try/catch in `OffscreenCharacterRenderer.drawCharacter()`.
27. Gate fallback color on `import.meta.env.DEV`.

---

## Appendix A: Files Changed Summary

| File | Change type | Section |
|---|---|---|
| `src/rendering/OffscreenCharacterRenderer.ts` | Bug fix: remove `drawOutfitPlaceholder`, import `OUTFITS`; quality improvements to `drawLegs`, `drawArms`, `drawFrontHair`, `drawHighlights` | §2, §4 |
| `src/rendering/OutfitRenderer.ts` | Bug fix: import `BodyMetrics` from OffscreenCharacterRenderer; add `drawGraphicTee`, `drawSmartCasual`; sleeve frame-awareness in long-sleeve outfits | §2, §5, §6 |
| `src/rendering/WorldRenderer.ts` | Bug fix: null guard in `makeCanvas` | §2 |
| `src/scenes/BootScene.ts` | Parallel boot; updated totalSteps; error handling | §7, §8 |
| `src/scenes/WorldScene.ts` | SkyRenderer integration; `gameTimeMinutes` state | §3, §9 |
| `src/rendering/SkyRenderer.ts` | NEW: full file | §3 |
| `src/utils/canvasUtils.ts` | NEW: pure utility functions | §2, §10 |

## Appendix B: What Was Explicitly Rejected and Why

| Rejected idea | Source | Reason |
|---|---|---|
| `PipelineScheduler` with topological sort | Proposal A | Over-engineering 35 known sequential steps |
| Self-registering imports via side-effect imports | Proposal A | Fragile under tree-shaking; import-order dependent |
| `TimeOfDayManager` as event emitter | Proposal A | A read-only number doesn't need observers |
| 6-frame walk cycle | Proposal A | Doubles texture count, no visual gain at 8fps/160px |
| `OutfitLayer[]` with explicit `zIndex` + positional ordering | Proposal A | Dual ordering is ambiguous; positional alone is unambiguous |
| `safeArc`/`safeBezier` wrappers | Proposal B | Canvas2D doesn't throw; wrappers solve nothing |
| `ClothingComponentLibrary` with enums | Proposal B | Too rigid for open-ended content |
| Per-step boot timeouts | Proposal B | Introduces non-determinism in deterministic code |
| 64MB memory budget assertion | Proposal B | Unjustified, no evidence of memory pressure |
| Boot failure recovery screen | Proposal B | YAGNI — handle gracefully in existing BootScene |
| Fluent error-collector | Proposal B | Verbosity with no benefit over try/catch |
| Singleton registry class | Proposal C | Testing anti-pattern; module-level const is correct |
| `CloudSystem` as Phaser GameObjects in the texture pipeline | Proposal C | Inconsistent; clouds don't need texture registration |
| String IDs for outfits | Proposal C | Typo risk, decouples nothing at current scale |
