# Character Visuals — Final Design Document
**Date:** 2026-03-16
**Status:** Authoritative — supersedes `2026-03-16-final-design-v2.md` on character rendering topics
**Scope:** Production-quality character visuals, Z-ordering fix, NPC pipeline migration, composite operation discipline, preview-scale design rules, skin tone diversity

---

## 0. Executive Summary

This document is the Judge ruling on three proposals (A: maintainability, B: robustness, C: clean architecture) plus one critic pass. The critic identified four cross-cutting issues that all three proposals missed. Every architectural decision below is justified. Implementation order is prioritized by severity of defect.

### What the critic got right (and all proposals missed)
1. **Arm/outfit Z-ordering conflict** — Layer 5 (outfit) renders before Layer 6 (arms). Long-sleeve outfits paint sleeves that arms then overdraw with bare skin. The fix requires splitting outfits into two draw phases.
2. **NPC texture generation is a separate flat renderer** — `WorldRenderer.generateNPCTexture()` (lines 1686–1754) draws block-primitive NPCs entirely independently of `drawCharacter()`. Any character quality improvements are invisible on NPCs unless they migrate.
3. **DressingRoom preview scale mismatch** — Preview renders at ~1.5× (300px canvas height). Game renders at 0.4× (~64×80px on screen). Fine details added for preview look sharp in the dressing room but disappear in gameplay. Details must be designed for the game-scale target.
4. **`globalCompositeOperation` leak in `drawFrontHair()`** — Lines 902–913: the function sets `ctx.globalCompositeOperation = 'screen'` and manually resets to `'source-over'` at line 913. This manual reset is inside `ctx.save()/restore()` (save at line 787, restore at line 915), but the outer `ctx.save()` was entered *before* the composite was changed — restoring it will undo the composite. So the manual reset on line 913 is correct but redundant (the `restore()` on line 915 would also reset it). **The actual risk** is if an exception is thrown between lines 902–913: the `restore()` at line 915 will not run (no try/finally), leaving `globalCompositeOperation` as `'screen'` permanently on this context. The fix is to move the composite operation into its own `ctx.save()/restore()` block with no manual reset needed.

### What the existing design doc (`2026-03-16-final-design-v2.md`) already covers correctly
- Parallel boot via `Promise.all` (Bug Fix 3)
- `BodyMetrics` deduplication (Bug Fix 2)
- `makeCanvas` null guard (Bug Fix 4)
- `drawOutfitPlaceholder` removal and `OUTFITS` wiring (Bug Fix 1)
- `SkyRenderer` architecture
- `canvasUtils.ts` pure functions
- No PipelineScheduler, no CanvasPool, no MetricsValidator (YAGNI rejections)
- Keep 3-frame walk cycle

This document **extends** that design for the four critic findings above plus adds the visual quality decisions the critic identified as best elements from each proposal.

---

## 1. Decision Table

| Decision | Choice | Rejected alternatives | Reason |
|---|---|---|---|
| Arm/outfit Z-order fix | Split outfit draw into two phases: `drawOutfitUnderArms()` and `drawOutfitOverArms()` | Single-phase outfit draw (all proposals) | Only structural fix; any workaround (e.g. re-render arms last) breaks the shadow/highlight layer order |
| NPC visual quality | Upgrade `generateNPCTexture()` with 5 skin tone palettes and a proper head+body draw | Full migration to `drawCharacter()` | NPCs are 32×48px at 1× scale (half the character canvas); `drawCharacter()` would produce invisible detail at that size. A targeted upgrade of the existing NPC renderer is proportionate. |
| Preview-scale detail rules | Codify: no detail smaller than 4px at 160×200px canvas scale (= 1px at 64×80px display) | Add any fine detail that looks good at 1.5× | A 1px line at canvas scale = 0.4px at display scale — antialiased to near-invisible. The dressing room is a design tool, not a display target. |
| `globalCompositeOperation` discipline | All composite op usage must be inside its own `ctx.save()/ctx.restore()` pair, never manually reset | Manual reset to `'source-over'` | `ctx.restore()` is guaranteed to undo the composite even on exception paths; manual resets are not. |
| `CharacterProfile` type | Add `CharacterProfile` interface but keep `'her'\|'him'` discriminant — do not replace existing function signatures | Replace `'her'\|'him'` everywhere with `CharacterProfile` (Proposal C) | 1100-line file churn to change every signature for a type alias is not justified. Add `CharacterProfile` as a richer type for new code paths (NPC system) only. |
| Skin tone diversity | 5 skin tones via `SKIN_TONES` constant array; NPCs cycle through them by index | Proposal B's full subsurface scatter system | 5 flat palette entries is proportionate. Full SSS is invisible at 32×48px NPC canvas. |
| Cheek blush | One `'multiply'` ellipse pass in `drawFace()` for `isHer === true` | Proposal B's full subsurface scatter approximation | Blush via multiply is the correct, simple approach. SSS naming was the error, not the technique. |
| Hair specular | Two-pass: broad `'screen'` ellipse + tight white ellipse at 0.5 opacity | Proposal A's "Kajiya-Kay" naming | The technique (screen-blend ellipses) is already in the current code (line 902). Fix the leak, keep the technique. |
| Idle animation | Phaser tweens on `y` and `scale.y` of the sprite (Proposal C) | Pre-baked idle textures (Proposal B), no idle (current) | Zero boot cost; Phaser's tween system handles it in one line. |
| Walk elbow bend | Split arm into two bezier segments; elbow offset varies by frame | FK law-of-cosines (Proposal A) | Already implemented in current code (lines 464–495). No change needed — the code already does two-segment arms with elbow offset. |
| NPC walk frame rate | Upgrade from 4fps to 6fps | Keep 4fps | 4fps is visually choppy; 6fps is still cheap (same 3 textures). No new texture generation needed. |

---

## 2. Architecture: Z-Ordering Fix (Arm/Outfit Conflict)

### The problem in detail

Current `drawCharacter()` layer order:
```
Layer 1: Shadow
Layer 2: Back hair
Layer 3: Legs
Layer 4: Body
Layer 5: Outfit           ← outfit draws long sleeves here
Layer 6: Arms             ← skin-colored arms overdraw the sleeves
Layer 7: Neck + Head
Layer 8: Face
Layer 9: Front hair
Layer 10: Highlights
```

For short-sleeve or sleeveless outfits, this order is correct: the body shows, arms are in front of the body, the outfit's collar and hem are visible. For long-sleeve outfits, the sleeve painted in Layer 5 gets painted over by the skin-colored arm in Layer 6. The result is a bare arm extending below a sleeve cap — visually broken.

### Fix: Two-phase outfit draw

Split `OutfitDefinition.draw` into two optional callbacks:

```typescript
export interface OutfitDefinition {
  name: string;
  /** Draws parts of the outfit that appear BEHIND the arms (torso, skirts, pants, sleeve caps). */
  drawUnder: (
    ctx: CanvasRenderingContext2D,
    character: 'her' | 'him',
    frame: number,
    metrics: BodyMetrics,
  ) => void;
  /**
   * Draws parts of the outfit that appear IN FRONT OF the arms.
   * Optional — only required for long sleeves, gloves, wristbands.
   * Called after Layer 6 (arms).
   */
  drawOver?: (
    ctx: CanvasRenderingContext2D,
    character: 'her' | 'him',
    frame: number,
    metrics: BodyMetrics,
  ) => void;
}
```

**Revised `drawCharacter()` layer order:**
```
Layer 1: Shadow
Layer 2: Back hair
Layer 3: Legs
Layer 4: Body
Layer 5: outfit.drawUnder()     ← torso, skirts, pants, short sleeves, sleeve caps
Layer 6: Arms (skin)
Layer 6b: outfit.drawOver()     ← long sleeves, forearm cuffs (optional)
Layer 7: Neck + Head
Layer 8: Face
Layer 9: Front hair
Layer 10: Highlights
```

**Migration of existing outfits:**

| Outfit | `drawUnder` content | `drawOver` content |
|---|---|---|
| Casual (sundress/T-shirt) | Everything (sleeve cap only) | — |
| Formal (cocktail/suit) | Body, skirt/trousers, shoulder cap | Sleeve from elbow to wrist + cuff |
| Date Night | Body, skirt, shoulder cap | Sleeve from elbow to wrist |
| Cozy (sweater/hoodie) | Body, skirt/trousers, shoulder cap | Full sleeve (shoulder to wrist) |
| Sporty | Everything (short sleeves) | — |
| Restaurant (blouse/button-up) | Body, collar, shoulder cap | Sleeve from elbow to wrist |
| Pizza (apron overlay) | Everything | — |
| Pajamas | Everything (wide sleeves go over arms naturally) | — |

**Practical rule for `drawOver`:** If the outfit's sleeve covers the forearm (below elbow), move that forearm segment to `drawOver`. The upper arm (shoulder-to-elbow) stays in `drawUnder` as a sleeve cap because it's visually part of the torso silhouette.

**Backward compatibility:** Rename existing `draw` to `drawUnder` in all 8 outfits. Add `drawOver` only to Formal, Date Night, Cozy, and Restaurant. No interface changes affect external consumers (outfit draw functions are internal to `OutfitRenderer.ts`).

**In `drawCharacter()`:**
```typescript
// Layer 5a: Outfit under-arms
try {
  outfit.drawUnder(ctx, character, frameIndex, metrics);
} catch (err) {
  console.warn(`Outfit ${outfitIndex} drawUnder failed (frame ${frameIndex}):`, err);
}

// Layer 6: Arms
drawArms(ctx, cx, metrics, offsets, isHer, s);

// Layer 6b: Outfit over-arms (long sleeves)
if (outfit.drawOver) {
  try {
    outfit.drawOver(ctx, character, frameIndex, metrics);
  } catch (err) {
    console.warn(`Outfit ${outfitIndex} drawOver failed (frame ${frameIndex}):`, err);
  }
}
```

### Sleeve frame-awareness in `drawOver`

Long-sleeve forearm segments in `drawOver` must track arm position. Use `getArmOffsets()` from `canvasUtils.ts` to get the correct Y offset per frame:

```typescript
// Example: Cozy sweater forearm in drawOver
import { getArmOffsets } from '../utils/canvasUtils';

// Inside drawOver:
const armOff = getArmOffsets(frame as 0 | 1 | 2, metrics.scale);
const leftWristY = metrics.armBottomY + armOff.leftDy;
const rightWristY = metrics.armBottomY + armOff.rightDy;
// Draw forearm sleeve segment from elbowY to wristY
```

This is the only correct way to keep sleeves aligned with arms across walk frames. Any outfit that ignores `frame` in `drawOver` will have misaligned sleeves on frames 1 and 2.

---

## 3. Architecture: NPC Visual Upgrade

### Current state

`WorldRenderer.generateNPCTexture()` (lines 1686–1754) draws NPCs as flat block primitives: `arc()` for head, `fillRect()` for body/arms/legs/shoes, two 1×1 pixel eye dots. Canvas size is 32×48px. This produces silhouette-level NPCs with no character differentiation beyond palette colors.

### Why not migrate to `drawCharacter()`

`drawCharacter()` draws at 160×200px with details sized for that canvas. At 32×48px (0.2× scale), the bezier curves, gradient shading, eye details, and hair specular are all sub-pixel. The function would produce a technically correct but visually indistinguishable result at a 16× performance cost for no visual gain. The proportionate fix is to upgrade the NPC renderer in place, targeting what is actually visible at 32×48px.

### What is visible at 32×48px (NPC game-scale)

At 32×48px canvas rendered at 1× in-game (NPCs are full-size on the tile grid, unlike player characters which render at 0.4×):
- Head shape: round vs slightly wider → **visible**
- Hair block color and rough shape → **visible**
- Skin tone variation → **visible** (is the core diversity signal)
- Shirt/pants color → **visible**
- Eyes as dots → **visible** (already implemented)
- Eyebrows → **not visible** (too small)
- Nose detail → **not visible**
- Mouth expression → **barely visible** — a horizontal 2px line is the limit
- Arm swing direction → **visible** (already implemented)
- Shoe color vs pants color → **visible**

### Upgrade plan: `generateNPCTexture()`

**Add `CharacterProfile` interface** (new, lives in `OffscreenCharacterRenderer.ts` alongside `BodyMetrics`):

```typescript
/**
 * Richer character description for NPC generation.
 * Used by generateNPCTexture() and future NPC systems.
 */
export interface CharacterProfile {
  /** Visual gender expression — drives body proportions and hair style */
  gender: 'her' | 'him';
  /** Index into NPC_SKIN_TONES (0–4). */
  skinToneIndex: number;
  /** Index into NPC_HAIR_COLORS. */
  hairColorIndex: number;
  /** Shirt hex color */
  shirtColor: string;
  /** Pants/skirt hex color */
  bottomColor: string;
}
```

**Add `NPC_SKIN_TONES` and `NPC_HAIR_COLORS`** constant arrays in `WorldRenderer.ts` (or in a new `src/data/npcPalettes.ts` if `WorldRenderer.ts` grows beyond 2000 lines; currently at 1788 lines, keep it co-located):

```typescript
// 5 skin tones: fair, light, medium, tan, dark
const NPC_SKIN_TONES = ['#ffe0c0', '#f0c8a0', '#d4a070', '#b07840', '#7a4820'] as const;
// 6 hair colors: black, dark brown, brown, auburn, blonde, grey
const NPC_HAIR_COLORS = ['#1a0800', '#3a1a0a', '#6b3a1a', '#8b3a18', '#c8a030', '#888888'] as const;
```

**Upgraded `generateNPCTexture()` signature:**

```typescript
static generateNPCTexture(
  scene: Phaser.Scene,
  id: string,
  profile: CharacterProfile,
): void
```

The existing `palette: { skin, hair, shirt, pants }` callers in `WorldScene.ts` must be updated to construct a `CharacterProfile`. Since palette is currently constructed per-NPC with hardcoded colors, this is a one-time migration of the call sites.

**Upgraded draw logic** (replace flat rects with minimally-shaped primitives, keeping within the 32×48px budget):

```
Head: arc — keep as-is (it already works)
Hair: filled arc (top half) with 1px highlight line — add a thin lighter-tone stroke across the top arc
      For 'her': hair extends slightly lower on sides (2px lower at edges)
Body: trapezoid (wider at shoulders for 'him', narrower for 'her') instead of fillRect
Arms: keep fillRect — too small for bezier curves
Skin patch on arms (lower half of arm rect, below sleeve): fill with skin tone
Legs: keep fillRect with legOffset — unchanged
Shoes: ellipse instead of fillRect — adds 1 line of code, visibly softer
Eyes: 1×1 dark dots — unchanged
Cheek blush for 'her': two tiny rgba ellipses (1×1px) at cheek positions
```

**Walk frame rate:** Change from 4fps to 6fps. Same 3 textures, tighter animation. Update the `scene.anims.create` call in `generateNPCTexture()`:
```typescript
frameRate: 6,  // was 4
```

**Callers:** `WorldScene.ts` constructs palettes for ~10 NPCs. Update those calls to pass `CharacterProfile` objects. Assign `skinToneIndex` values spread across 0–4 to give visible diversity.

---

## 4. Design Rules for Target Resolution

### The scale chain
```
Draw canvas:   160 × 200 px  (scale = 1.0)
Preview:       240 × 300 px  (scale = 1.5) — DressingRoom
Game display:  ~64 × 80 px   (Phaser setScale(0.4))
```

### Minimum visible detail at game scale (64×80px)
A 1px line on the 160×200 canvas = 0.4px at game scale = antialiased out of existence on most displays. The practical minimum:

| Feature | Min canvas px | Visible at 0.4× scale? |
|---|---|---|
| Solid filled shape edge | 1px | Yes (via antialiasing) |
| Stroke line | 2px width | Yes |
| Detail stroke line | 1px width | Barely — only on high-DPI screens |
| Gradient across a body | 20px width | Yes |
| Hair specular ellipse (15px wide) | 15px | Yes — reads as a highlight |
| Eye iris detail | 3px radius | Yes — readable as "eyes" |
| Eye pupil highlight dot | 1px | No — invisible at 0.4× |
| Eyelash lines | 1.5px | No — invisible at 0.4× |
| Nostril dots | 1px | No — invisible at 0.4× |
| Lip shine ellipse | 1.5px | No — invisible at 0.4× |
| Chin AO ellipse (10px wide) | 10px | Yes |
| Arm elbow bend (2px offset) | 2px | No — invisible at 0.4× |

### Rule for new visual details
**A detail passes if it reads as a shape at 64×80px, not just at 160×200px.** Test by squinting at the 160×200px canvas until details blur — if the intended effect is still visible as a shape, it passes. If it disappears, it is dressing-room-only detail and should be gated on a `previewOnly: true` flag or simply omitted.

### Implications for current code
The following details in the current code are **invisible at game scale** (they are dressing-room-only quality) and should not be relied upon as visual differentiators:
- Pupil highlight dots (lines 673–677)
- Eyelash strokes (lines 688–697)
- Nostril ellipses (lines 740–744)
- Lip shine (lines 763–765)
- Under-nose shadow multiply pass (lines 966–969) — very marginal

These do not need to be removed (they improve dressing-room quality at no runtime cost), but they should not be the *primary* differentiator between characters. Character readability at game scale depends on:
- Hair silhouette shape and color
- Body silhouette (her hourglass vs him athletic)
- Outfit color block
- Eye color (readable as a colored dot cluster)

### DressingRoom preview: design intent
The preview at 1.5× is intentionally more detailed than the game display. This is correct behavior. The rule is: **details may be added that only show in preview**, but they must not be *necessary* for character readability in gameplay. If removing a detail from the game display makes the character unrecognizable, it was load-bearing and should be implemented at game scale too.

---

## 5. `globalCompositeOperation` Discipline

### The bug

In `drawFrontHair()` (line 787–915):

```typescript
ctx.save();                                    // line 787 — saves composite = 'source-over'
// ... hair shape drawing ...
ctx.globalCompositeOperation = 'screen';       // line 902 — changes composite
ctx.fillStyle = 'rgba(255,255,255,0.12)';
// ... specular ellipse ...
ctx.globalCompositeOperation = 'source-over'; // line 913 — manual reset
ctx.restore();                                 // line 915 — would have reset it anyway
```

The current code is functionally correct at runtime: the manual reset on line 913 fixes the state before `restore()`. But this pattern is fragile. If an exception is thrown between line 902 and line 913, `ctx.restore()` will not run (no try/finally guard on canvas calls), and subsequent draw calls on this context will use `'screen'` mode permanently. In the texture generation path this means all subsequent frames for this character would have broken compositing.

### The fix pattern

Move every `globalCompositeOperation` change into its own isolated `ctx.save()/ctx.restore()` block. Never manually reset composite operations:

```typescript
// WRONG — fragile:
ctx.globalCompositeOperation = 'screen';
// ... draw ...
ctx.globalCompositeOperation = 'source-over'; // manual reset

// CORRECT — safe:
ctx.save();
ctx.globalCompositeOperation = 'screen';
// ... draw ...
ctx.restore(); // resets composite automatically, even on exception
```

### Locations to fix in `OffscreenCharacterRenderer.ts`

1. **Lines 901–913 in `drawFrontHair()`:** Extract the specular ellipse into its own `ctx.save()/ctx.restore()` block. Remove the manual reset on line 913.

   Current structure:
   ```
   ctx.save()        ← line 787
     ... hair drawing ...
     ctx.globalCompositeOperation = 'screen'   ← line 902  PROBLEM
     ... specular ...
     ctx.globalCompositeOperation = 'source-over'  ← line 913  manual reset
   ctx.restore()     ← line 915
   ```

   Fixed structure:
   ```
   ctx.save()        ← line 787
     ... hair drawing ...
     ctx.save()                                ← NEW inner save
       ctx.globalCompositeOperation = 'screen'
       ... specular ellipse ...
     ctx.restore()                             ← NEW inner restore (no manual reset)
   ctx.restore()     ← line 915 (unchanged)
   ```

2. **`drawHighlights()` — lines 930–971:** Both the `'screen'` block (lines 930–953) and `'multiply'` block (lines 956–971) are already correctly wrapped in their own `ctx.save()/ctx.restore()` pairs. No change needed here.

### Enforcement for new code
Any new `globalCompositeOperation` change must:
1. Be preceded by `ctx.save()`
2. Be followed by `ctx.restore()` (not a manual reset)
3. Not use `try/catch` as a substitute (canvas draws don't throw, but save/restore is still the correct idiom)

---

## 6. Visual Quality Improvements

### 6.1 Character Palette System

Add a `CharacterPalette` typed constant to `OffscreenCharacterRenderer.ts`. This replaces the current scattered color constants and makes character-specific colors easy to audit:

```typescript
interface CharacterPalette {
  skinBase: string;
  skinShadow: string;
  skinHighlight: string;
  hairDark: string;
  hairLight: string;
  eyeColor: string;
}

const HER_PALETTE: CharacterPalette = {
  skinBase: '#ffe0c0',
  skinShadow: '#eec8a0',
  skinHighlight: '#fff0d8',
  hairDark: '#1a0a00',
  hairLight: '#2c1810',
  eyeColor: '#553311',
};

const HIM_PALETTE: CharacterPalette = {
  skinBase: '#ffe0c0',
  skinShadow: '#eec8a0',
  skinHighlight: '#fff0d8',
  hairDark: '#e8c830',
  hairLight: '#f0d860',
  eyeColor: '#3377dd',
};
```

This is purely a refactor — same values, typed bag. It reduces the scattered `const HER_HAIR_DARK`, `const HIM_HAIR_DARK` etc. to two objects. Use `const palette = isHer ? HER_PALETTE : HIM_PALETTE` at the top of `drawCharacter()`.

### 6.2 Cheek Blush (from Proposal B — correct technique, wrong name)

Add a blush pass in `drawFace()` for `isHer === true`, using `'multiply'` composite:

```typescript
if (isHer) {
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = 'rgba(220,150,150,0.35)';
  // Left cheek
  ctx.beginPath();
  ctx.ellipse(cx - 6 * s, eyeY + 4 * s, 4 * s, 2.5 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  // Right cheek
  ctx.beginPath();
  ctx.ellipse(cx + 6 * s, eyeY + 4 * s, 4 * s, 2.5 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
```

At 160×200px canvas, the 4px ellipse is visible. At 64×80px game scale, the two cheek blushes read as a subtle warmth on the face — they function as a color block, not a fine-detail feature. This passes the visibility test.

### 6.3 Hair Specular (fix the bug, keep the technique)

The current two-pass hair specular in `drawFrontHair()` (the `'screen'` mode ellipse) is the correct approach from Proposal A. The only change is fixing the composite leak (Section 5.1). The technique itself is sound and visible at game scale (a 15px ellipse reads as a highlight mass even at 64px display width).

For `'him'` hair (currently golden-blonde), the specular should use a slightly warm tone instead of pure white to avoid the hair looking plastic:

```typescript
// For 'her' (dark hair):
ctx.fillStyle = 'rgba(255,255,255,0.12)';
// For 'him' (blonde hair):
ctx.fillStyle = 'rgba(255,240,200,0.18)'; // warm gold tint
```

### 6.4 Idle Animation (Proposal C — Phaser tweens)

Zero boot-time cost approach. Add a `startIdleAnimation(sprite: Phaser.GameObjects.Sprite): Phaser.Tweens.Tween` exported function in a new location or directly in `WorldScene.ts`:

```typescript
// In WorldScene.ts, after player sprite is created:
this.tweens.add({
  targets: this.playerSprite,
  y: this.playerSprite.y - 2,           // 2px bob
  scaleY: this.playerSprite.scaleY * 0.98, // very subtle vertical compression
  duration: 1200,
  yoyo: true,
  repeat: -1,
  ease: 'Sine.easeInOut',
  paused: true, // only plays when player is standing still
});
```

Stop the tween when the player starts walking, resume when they stop. This is Phaser's native system — no new abstraction needed.

**Why not pre-baked idle textures:** At 3 existing texture sets × 2 characters × 10 outfits = 60 textures, adding idle frames would bring the total to 100+ textures. Boot time impact on a mid-range device would be measurable. The tween approach costs zero additional textures.

### 6.5 Walk Animation — Elbow Bend (already implemented)

The current `drawArms()` code (lines 452–555) already implements the two-segment arm with elbow offset. This was implemented correctly. No changes needed to this specific function. The elbow offset (`elbowLx = lx - 2 * s` for left arm, `elbowRx = rx + 2 * s` for right arm) is constant across frames, which is correct for this scale — varying it by frame would require a 2px positional difference that is invisible at 64×80px display size.

---

## 7. File Structure and Change Summary

### Final file list (modified or created)

```
src/
  rendering/
    OffscreenCharacterRenderer.ts   MODIFY — CharacterPalette, composite fix,
                                             drawCharacter split for two-phase outfit,
                                             CharacterProfile export, cheek blush
    OutfitRenderer.ts               MODIFY — rename draw→drawUnder, add drawOver
                                             to Formal/DateNight/Cozy/Restaurant,
                                             new Graphic Tee + Smart Casual outfits
    WorldRenderer.ts                MODIFY — NPC skin tone upgrade, CharacterProfile
                                             call sites, NPC frameRate 4→6
    SkyRenderer.ts                  CREATE  — (from 2026-03-16-final-design-v2.md)
  utils/
    canvasUtils.ts                  MODIFY — already has getSkyColors, getArmOffsets;
                                             add NPC_SKIN_TONES, NPC_HAIR_COLORS exports
  scenes/
    BootScene.ts                    MODIFY — parallel boot (from existing design doc)
    WorldScene.ts                   MODIFY — SkyRenderer, gameTimeMinutes,
                                             idle tween on player sprite,
                                             CharacterProfile for NPC calls
```

**Total modified files: 6. Total new files: 1 (`SkyRenderer.ts`).** This keeps the file count lean for a 25-file project.

### Files NOT changed
- `DressingRoomScene.ts` — preview rendering continues to use `generatePreviewTexture()` unchanged. The preview intentionally shows more detail than game display.
- `MenuScene.ts` — no character rendering
- `UIRenderer.ts`, `ParticleConfigs.ts`, `SkyRenderer.ts` (if already created) — unchanged by this doc

---

## 8. Interface Changes Summary

### `OutfitDefinition` (breaking change — internal to `OutfitRenderer.ts`)

```typescript
// BEFORE:
export interface OutfitDefinition {
  name: string;
  draw: (ctx, character, frame, metrics) => void;
}

// AFTER:
export interface OutfitDefinition {
  name: string;
  drawUnder: (ctx, character, frame, metrics) => void;
  drawOver?: (ctx, character, frame, metrics) => void;
}
```

All callers of `outfit.draw()` are inside `OffscreenCharacterRenderer.ts` (which is the only file that invokes draw functions). Update those 1–2 call sites to `outfit.drawUnder()` and add the `outfit.drawOver?.()` call. External consumers only import `OUTFITS` array and `OutfitDefinition` type — the renamed field is a one-file change.

### `CharacterProfile` (new export from `OffscreenCharacterRenderer.ts`)

Exported alongside `BodyMetrics`. Used by `WorldRenderer.generateNPCTexture()` and `WorldScene.ts` NPC construction. No existing code breaks — this is additive.

### `generateNPCTexture()` signature change (breaking — update call sites)

```typescript
// BEFORE:
static generateNPCTexture(
  scene: Phaser.Scene,
  id: string,
  palette: { skin: string; hair: string; shirt: string; pants: string },
): void

// AFTER:
static generateNPCTexture(
  scene: Phaser.Scene,
  id: string,
  profile: CharacterProfile,
): void
```

Update all `generateNPCTexture()` call sites in `WorldScene.ts`. There are approximately 10 NPC definitions — a mechanical search-and-replace.

---

## 9. Implementation Order

This extends the phase plan in `2026-03-16-final-design-v2.md`. Complete Phases 1–2 from that document first (P0 bug fixes and shared utilities), then:

### Phase 3A — Composite Operation Fix (1 hour, low risk)
1. In `drawFrontHair()`, wrap the `'screen'` composite ellipse in its own `ctx.save()/ctx.restore()`.
2. Remove the manual `ctx.globalCompositeOperation = 'source-over'` reset on line 913.
3. Verify visually: hair specular should look identical, no regression.

### Phase 3B — Z-Ordering Fix (2 hours, high impact)
4. Update `OutfitDefinition` interface: rename `draw` → `drawUnder`, add optional `drawOver`.
5. In all 8 existing outfits: rename `draw` to `drawUnder`. For Casual, Sporty, Pizza, Pajamas: done.
6. For Formal, DateNight, Cozy, Restaurant: extract forearm sleeve drawing to `drawOver`, using `getArmOffsets()` for frame-correct positioning.
7. Update `drawCharacter()` to call `drawUnder`, then arms, then `drawOver`.
8. Visual checkpoint: walk through all 8 outfits × 3 frames in the dressing room. Long sleeves must align with arm position.

### Phase 3C — Character Palette Refactor (30 min, zero-risk refactor)
9. Add `CharacterPalette` interface and `HER_PALETTE`/`HIM_PALETTE` constants.
10. Replace scattered color constants in `drawCharacter()` and sub-functions with palette lookups.
11. Add warm-tint specular for him hair.

### Phase 3D — Cheek Blush (30 min)
12. Add blush `'multiply'` pass in `drawFace()` for `isHer`.
13. Verify: readable as warmth at game scale, not just at preview scale.

### Phase 4 — NPC Upgrade (2 hours)
14. Add `CharacterProfile` interface to `OffscreenCharacterRenderer.ts`.
15. Add `NPC_SKIN_TONES`, `NPC_HAIR_COLORS` to `canvasUtils.ts` (exported constants, no Phaser dep).
16. Upgrade `generateNPCTexture()`: new signature, trapezoid body, ellipse shoes, cheek blush for 'her', frameRate 6.
17. Update NPC call sites in `WorldScene.ts` with `CharacterProfile` objects. Assign varied `skinToneIndex` values.
18. Visual checkpoint: NPCs show visible skin tone diversity and gender shape difference.

### Phase 5 — Idle Tween (1 hour)
19. Add idle tween to player sprite in `WorldScene.create()`.
20. Wire tween pause/resume to player movement detection.
21. Visual checkpoint: player bobs gently when standing still, stops bobbing when walking.

### Phase 6 — New Outfits (from existing design doc, unchanged)
22. Implement Graphic Tee in `OutfitRenderer.ts` using `drawUnder` only (no sleeves).
23. Implement Smart Casual in `OutfitRenderer.ts` using `drawUnder` + `drawOver` for blazer sleeves.
24. Update boot step count.

---

## 10. Testing Strategy

### Unit tests (Vitest, no DOM/Phaser needed)

Target `src/utils/canvasUtils.ts` pure functions:
- `getSkyColors(0)` → night palette (starOpacity = 1)
- `getSkyColors(480)` → day palette (starOpacity = 0)
- `getSkyColors(1440)` → wraps to same as `getSkyColors(0)`
- `getArmOffsets(0, 1)` → `{ leftDy: 0, rightDy: 0 }`
- `getArmOffsets(1, 1)` → `{ leftDy: 0, rightDy: -4 }`
- `getArmOffsets(2, 2)` → `{ leftDy: -8, rightDy: 0 }` (scale = 2)
- `lerpColor('#000000', '#ffffff', 0.5)` → `'rgb(128,128,128)'`

### Canvas mock tests (vitest-canvas-mock)

**Note:** Do NOT use the `canvas` npm package (native module, broken on Windows with node-gyp). Use `vitest-canvas-mock` which patches the browser Canvas API without native compilation.

Key assertions for `drawCharacter()`:
- `outfit.drawUnder` is called exactly once per frame
- `outfit.drawOver` is called exactly once per frame for long-sleeve outfits
- `outfit.drawOver` is not called for outfits without it

Key assertion for composite discipline:
- After `drawFrontHair()` completes, `ctx.globalCompositeOperation` equals `'source-over'`
- This catches any future manual-reset regressions

### Integration test (Playwright)

Boot the game, assert:
- Boot completes in < 3s
- All `her-outfit-N-frame-M` and `him-outfit-N-frame-M` texture keys exist in the texture manager
- NPC textures exist with correct skin tone diversity (check that at least 3 distinct skin colors appear in the palette objects passed to `generateNPCTexture`)

---

## 11. Explicitly Rejected Elements from All Proposals

| Rejected | Source | Reason |
|---|---|---|
| `PipelineScheduler` with topological sort | A | YAGNI — two dependency groups need `await Promise.all`, not 400 lines of scheduler |
| Self-registering imports (side-effect imports) | A | Fragile under tree-shaking; import-order bugs are insidious |
| 5-frame walk cycle | A | Invisible at 8fps/64px display; doubles texture count |
| FK law-of-cosines elbow IK | A | Already implemented correctly as two bezier segments |
| Pre-baked idle textures | B | 60 extra textures for what a 4-line tween achieves |
| `safeArc`/`safeBezier` wrappers | B | Canvas 2D does not throw; wrappers solve nothing |
| `ClothingComponentLibrary` enums | B | Open-ended content does not benefit from enum rigidity |
| 6-frame walk + 8-frame idle = 280 textures | B | 4.7× current texture count; boot penalty is real |
| Per-step boot timeouts | B | Non-determinism in deterministic canvas rendering |
| `MetricsValidator` guarding pure function output | B | Test the function; don't guard its output at runtime |
| `CanvasPool` | B | YAGNI — batch-at-boot creates one canvas per texture |
| `TextureUploader` with 5s timeout | B | Slow machine ≠ bug |
| Full subsurface scatter on head | B | Invisible at 64px; `'multiply'` cheek blush is the right technique |
| Singleton `OutfitRegistry` | C | Testing anti-pattern; module-level `const` is correct |
| Second `AnimationController` on top of Phaser | C | Phaser's animation system + one tween is all that's needed |
| `canvas` npm package for tests | C | Native module; broken on Windows (node-gyp) |
| Dead scale guard (nasolabial fold only at scale >= 1.0) | C | Fine detail that doesn't exist in current code |
| `[LayerName]Params` per-layer typed objects | C | Useful in a 50-layer pipeline; premature for 10 layers |
| Rename `'her'\|'him'` to `CharacterProfile` everywhere | C | 1100-line file-wide churn; `CharacterProfile` is additive for NPCs only |
| Replace `OutfitDefinition.draw` with component system | C | The `drawUnder`/`drawOver` split is the minimum needed fix |
| 20+ file decomposition | A | Over-engineered for a ~25-file codebase |
| Heel stitching / nasolabial fold | Any | Invisible at 0.4× scale — dressing-room-only detail with no gameplay value |

---

## Appendix A: Complete Z-Order Reference After Fix

```
Layer 1:    Shadow (drop shadow under feet)
Layer 2:    Back hair (her only — long hair behind body)
Layer 3:    Legs + shoes
Layer 4:    Body base (skin, bezier silhouette, chest definition)
Layer 5a:   outfit.drawUnder()  ← torso, skirt/pants, short sleeves, sleeve caps
Layer 6:    Arms (skin, two-segment bezier, hands)
Layer 6b:   outfit.drawOver()   ← forearm sleeves, cuffs (optional, long-sleeve outfits only)
Layer 7:    Neck + Head (with ear hints)
Layer 8:    Face (eyes, eyebrows, nose, mouth, cheek blush)
Layer 9:    Front hair (bang shape, specular highlight)
Layer 10:   Highlights (rim light 'screen', chin AO 'multiply', under-nose shadow)
```

This ordering is correct for all current and planned outfits. No outfit requires drawing in front of the head. If a future outfit requires a hat or hood, it would be a Layer 11 added after front hair.

---

## Appendix B: NPC Skin Tone Assignment

Suggested `skinToneIndex` spread for 10 NPCs to ensure visible diversity:

| NPC | `skinToneIndex` | `gender` |
|---|---|---|
| npc-0 | 0 (fair) | 'her' |
| npc-1 | 2 (medium) | 'him' |
| npc-2 | 4 (dark) | 'her' |
| npc-3 | 1 (light) | 'him' |
| npc-4 | 3 (tan) | 'her' |
| npc-5 | 2 (medium) | 'him' |
| npc-6 | 0 (fair) | 'him' |
| npc-7 | 4 (dark) | 'him' |
| npc-8 | 1 (light) | 'her' |
| npc-9 | 3 (tan) | 'her' |

This gives: 2 fair, 2 light, 2 medium, 2 tan, 2 dark — equal distribution. 4 'her' gender, 6 'him' gender — adjust based on narrative needs.
