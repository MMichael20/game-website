# Character Visuals Overhaul — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dramatically improve character visuals with Z-ordering fix, composite operation safety, character palette system, cheek blush, NPC diversity, and idle animation.

**Architecture:** Six incremental phases modifying existing files in-place. No new architectural abstractions — all changes are surgical improvements to `OffscreenCharacterRenderer.ts`, `OutfitRenderer.ts`, `WorldRenderer.ts`, `WorldScene.ts`, and `canvasUtils.ts`. The `OutfitDefinition` interface gains an optional `drawOver` method for long-sleeve Z-ordering.

**Tech Stack:** Phaser 3.90, TypeScript (strict), Canvas 2D API, Vite 8

**Design Doc:** `docs/plans/2026-03-16-character-visuals-final-design.md`

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `src/rendering/OffscreenCharacterRenderer.ts` | Modify | CharacterPalette type + constants, composite fix in drawFrontHair, two-phase outfit call in drawCharacter, cheek blush in drawFace, export CharacterProfile |
| `src/rendering/OutfitRenderer.ts` | Modify | Rename `draw` → `drawUnder` in interface + all 10 outfits, add `drawOver` to Formal him (outfit 1), Cozy (outfit 3), and Restaurant (outfit 5) |
| `src/rendering/WorldRenderer.ts` | Modify | Upgrade generateNPCTexture with CharacterProfile param, skin tone palettes, trapezoid body, ellipse shoes, gender shape, 6fps walk |
| `src/data/mapLayout.ts` | Modify | Add `gender` field to NPCDef, update NPCS array with gender and skinToneIndex |
| `src/scenes/WorldScene.ts` | Modify | Idle tween on player/partner sprites, pause/resume on movement |
| `src/scenes/BootScene.ts` | Modify | Pass updated NPC palette format to generateNPCTexture |

---

## Chunk 1: Foundation Fixes

### Task 1: Fix globalCompositeOperation leak in drawFrontHair

**Files:**
- Modify: `src/rendering/OffscreenCharacterRenderer.ts:901-913`

This fixes a real bug: if an exception is thrown between lines 902-913, the `'screen'` composite mode leaks to all subsequent draw calls on this canvas context.

- [ ] **Step 1: Wrap the specular ellipse in its own ctx.save/restore**

In `src/rendering/OffscreenCharacterRenderer.ts`, find the hair sheen block at ~line 901. Replace:

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

With:

```typescript
  // Hair sheen — specular highlight (isolated composite operation)
  ctx.save();
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
  ctx.restore();
```

- [ ] **Step 2: Build and verify no TypeScript errors**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Visual verification**

Run: `npm run dev`
Open browser → enter game → verify hair specular highlight still appears on both characters. Should look identical to before.

- [ ] **Step 4: Commit**

```bash
git add src/rendering/OffscreenCharacterRenderer.ts
git commit -m "fix: wrap hair specular composite op in ctx.save/restore"
```

---

### Task 2: Add CharacterPalette type and refactor color constants

**Files:**
- Modify: `src/rendering/OffscreenCharacterRenderer.ts:37-51` (color constants) and `drawCharacter` at line 182-184

This replaces scattered color constants with a typed palette object per character.

- [ ] **Step 1: Add CharacterPalette interface and palette constants**

In `src/rendering/OffscreenCharacterRenderer.ts`, after the existing color constants (lines 37-51), add:

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
  skinBase: SKIN_TONE,
  skinShadow: SKIN_SHADOW,
  skinHighlight: SKIN_HIGHLIGHT,
  hairDark: HER_HAIR_DARK,
  hairLight: HER_HAIR_LIGHT,
  eyeColor: HER_EYE_COLOR,
};

const HIM_PALETTE: CharacterPalette = {
  skinBase: SKIN_TONE,
  skinShadow: SKIN_SHADOW,
  skinHighlight: SKIN_HIGHLIGHT,
  hairDark: HIM_HAIR_DARK,
  hairLight: HIM_HAIR_LIGHT,
  eyeColor: HIM_EYE_COLOR,
};
```

- [ ] **Step 2: Use palette in drawCharacter**

In `drawCharacter()` at ~line 178, after `const isHer = character === 'her'`, add:

```typescript
  const palette = isHer ? HER_PALETTE : HIM_PALETTE;
```

Then replace the three lines:
```typescript
  const hairDark = isHer ? HER_HAIR_DARK : HIM_HAIR_DARK;
  const hairLight = isHer ? HER_HAIR_LIGHT : HIM_HAIR_LIGHT;
  const eyeColor = isHer ? HER_EYE_COLOR : HIM_EYE_COLOR;
```

With:
```typescript
  const { hairDark, hairLight, eyeColor } = palette;
```

- [ ] **Step 3: Add warm-tint specular for 'him' hair**

In `drawFrontHair()`, find the hair sheen block (now wrapped in save/restore from Task 1). Replace the fillStyle line to be character-aware:

```typescript
  ctx.fillStyle = isHer ? 'rgba(255,255,255,0.12)' : 'rgba(255,240,200,0.18)';
```

Note: `drawFrontHair` already receives the `isHer` parameter (line 779 signature).

- [ ] **Step 4: Build and verify**

Run: `npx tsc --noEmit`
Expected: No errors

Run: `npm run dev`
Verify: Both characters render identically to before. Him's hair sheen should have a subtle warm golden tint.

- [ ] **Step 5: Commit**

```bash
git add src/rendering/OffscreenCharacterRenderer.ts
git commit -m "refactor: add CharacterPalette type, warm hair specular for him"
```

---

### Task 3: Add cheek blush for 'her' character

**Files:**
- Modify: `src/rendering/OffscreenCharacterRenderer.ts` — `drawFace()` function

- [ ] **Step 1: Add blush pass in drawFace**

Find `drawFace()` in `OffscreenCharacterRenderer.ts` (starts at approximately line 577). At the END of the function, before the closing `}`, add the blush block:

```typescript
  // Cheek blush (her only) — multiply blend for natural warmth
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

Note: `drawFace` has parameters `(ctx, cx, headCy, eyeColor, isHer, s)`. The variable `eyeY` is computed inside drawFace — verify the exact variable name. It should be the Y-position of the eyes. If the function uses a different variable name (like `headCy` offset), compute the correct Y: `const eyeY = headCy + 1 * s;` (approximate eye Y from head center).

- [ ] **Step 2: Build and verify**

Run: `npx tsc --noEmit`
Expected: No errors

Run: `npm run dev`
Verify: 'Her' character has subtle warm blush on cheeks. 'Him' does not. Blush should be visible both in dressing room preview and in-game (the 4px ellipse at canvas scale = ~1.6px at 0.4× game scale — marginal but visible as warmth).

- [ ] **Step 3: Commit**

```bash
git add src/rendering/OffscreenCharacterRenderer.ts
git commit -m "feat: add cheek blush for her character via multiply blend"
```

---

## Chunk 2: Z-Ordering Fix (Arm/Outfit Conflict)

### Task 4: Update OutfitDefinition interface — rename draw to drawUnder, add drawOver

**Files:**
- Modify: `src/rendering/OutfitRenderer.ts:10-18` (interface) and `1210-1221` (OUTFITS array)

- [ ] **Step 1: Update the interface**

In `src/rendering/OutfitRenderer.ts`, replace the `OutfitDefinition` interface (lines 10-18):

```typescript
export interface OutfitDefinition {
  name: string;
  draw: (
    ctx: CanvasRenderingContext2D,
    character: 'her' | 'him',
    frame: number,
    metrics: BodyMetrics,
  ) => void;
}
```

With:

```typescript
export interface OutfitDefinition {
  name: string;
  /** Draws parts behind the arms: torso, skirts, pants, sleeve caps. */
  drawUnder: (
    ctx: CanvasRenderingContext2D,
    character: 'her' | 'him',
    frame: number,
    metrics: BodyMetrics,
  ) => void;
  /** Optional: draws parts in front of arms (forearm sleeves, cuffs). Called after arms are drawn. */
  drawOver?: (
    ctx: CanvasRenderingContext2D,
    character: 'her' | 'him',
    frame: number,
    metrics: BodyMetrics,
  ) => void;
}
```

- [ ] **Step 2: Rename all draw functions to drawUnder in OUTFITS array**

At the bottom of the file (lines 1210-1221), replace `draw:` with `drawUnder:` for all 10 entries:

```typescript
export const OUTFITS: OutfitDefinition[] = [
  { name: 'Casual', drawUnder: drawCasual },
  { name: 'Formal', drawUnder: drawFormal },
  { name: 'Date Night', drawUnder: drawDateNight },
  { name: 'Cozy', drawUnder: drawCozy },
  { name: 'Sporty', drawUnder: drawSporty },
  { name: 'Restaurant', drawUnder: drawRestaurant },
  { name: 'Pizza', drawUnder: drawPizza },
  { name: 'Pajamas', drawUnder: drawPajamas },
  { name: 'Graphic Tee', drawUnder: drawGraphicTee },
  { name: 'Smart Casual', drawUnder: drawSmartCasual },
];
```

- [ ] **Step 3: Update the caller in drawCharacter**

In `src/rendering/OffscreenCharacterRenderer.ts`, find the outfit draw call at ~line 204-209. Replace:

```typescript
  // ===== Layer 5: Outfit =====
  const outfit = OUTFITS[outfitIndex % OUTFITS.length];
  try {
    outfit.draw(ctx, character, frameIndex, metrics);
  } catch (err) {
    console.warn(`Outfit ${outfitIndex} draw failed (frame ${frameIndex}):`, err);
  }

  // ===== Layer 6: Arms =====
  drawArms(ctx, cx, metrics, offsets, isHer, s);
```

With:

```typescript
  // ===== Layer 5a: Outfit (under arms) =====
  const outfit = OUTFITS[outfitIndex % OUTFITS.length];
  try {
    outfit.drawUnder(ctx, character, frameIndex, metrics);
  } catch (err) {
    console.warn(`Outfit ${outfitIndex} drawUnder failed (frame ${frameIndex}):`, err);
  }

  // ===== Layer 6: Arms =====
  drawArms(ctx, cx, metrics, offsets, isHer, s);

  // ===== Layer 6b: Outfit (over arms — long sleeves) =====
  if (outfit.drawOver) {
    try {
      outfit.drawOver(ctx, character, frameIndex, metrics);
    } catch (err) {
      console.warn(`Outfit ${outfitIndex} drawOver failed (frame ${frameIndex}):`, err);
    }
  }
```

- [ ] **Step 4: Build and verify**

Run: `npx tsc --noEmit`
Expected: No errors (all references to `.draw` should now be `.drawUnder`)

Run: `npm run dev`
Verify: All outfits still render correctly. No visual change expected yet — the long sleeves are still drawn in drawUnder (which renders before arms), so they'll still be overdrawn by skin-colored arms.

- [ ] **Step 5: Commit**

```bash
git add src/rendering/OutfitRenderer.ts src/rendering/OffscreenCharacterRenderer.ts
git commit -m "refactor: split OutfitDefinition.draw into drawUnder/drawOver"
```

---

### Task 5: Extract long sleeves to drawOver for Cozy outfit (index 3)

**Files:**
- Modify: `src/rendering/OutfitRenderer.ts` — `drawCozy()` function (~line 415-520) and OUTFITS array

The Cozy outfit has long sleeves for both 'her' (lines 451-455: sweater) and 'him' (lines 501-505: hoodie). These sleeves extend 90% of arm length and get completely overdrawn by skin-colored arms in Layer 6.

- [ ] **Step 1: Create drawCozyOver function**

Add a new function after `drawCozy()` (after its closing brace):

```typescript
function drawCozyOver(
  ctx: CanvasRenderingContext2D,
  character: 'her' | 'him',
  _frame: number,
  m: BodyMetrics,
) {
  const s = m.scale;
  if (character === 'her') {
    // Long sweater sleeves (drawn over arms)
    const sweaterColor = '#D4A07A';
    const sleeveLen = (m.armBottomY - m.armTopY) * 0.9;
    const sleeveW = hw(m, 'shoulder') * 0.6;
    shortSleeve(ctx, m.leftArmX, m.armTopY, sleeveLen, sleeveW, sweaterColor);
    shortSleeve(ctx, m.rightArmX, m.armTopY, sleeveLen, sleeveW, sweaterColor);
  } else {
    // Long hoodie sleeves (drawn over arms)
    const hoodieColor = '#5A5A6A';
    const sleeveLen = (m.armBottomY - m.armTopY) * 0.9;
    const sleeveW = hw(m, 'shoulder') * 0.6;
    shortSleeve(ctx, m.leftArmX, m.armTopY, sleeveLen, sleeveW, hoodieColor);
    shortSleeve(ctx, m.rightArmX, m.armTopY, sleeveLen, sleeveW, hoodieColor);
  }
}
```

- [ ] **Step 2: Remove long sleeve drawing from drawCozy**

In `drawCozy()`, remove the long sleeve lines for 'her' (~lines 451-455):
```typescript
    // Long sleeves
    const sleeveLen = (m.armBottomY - m.armTopY) * 0.9;
    const sleeveW = hw(m, 'shoulder') * 0.6;
    shortSleeve(ctx, m.leftArmX, m.armTopY, sleeveLen, sleeveW, sweaterColor);
    shortSleeve(ctx, m.rightArmX, m.armTopY, sleeveLen, sleeveW, sweaterColor);
```

And remove the long sleeve lines for 'him' (~lines 501-505):
```typescript
    // Long sleeves
    const sleeveLen = (m.armBottomY - m.armTopY) * 0.9;
    const sleeveW = hw(m, 'shoulder') * 0.6;
    shortSleeve(ctx, m.leftArmX, m.armTopY, sleeveLen, sleeveW, hoodieColor);
    shortSleeve(ctx, m.rightArmX, m.armTopY, sleeveLen, sleeveW, hoodieColor);
```

Replace each removed block with a comment:
```typescript
    // Long sleeves moved to drawCozyOver (rendered after arms for correct Z-order)
```

- [ ] **Step 3: Register drawOver in OUTFITS array**

Update the Cozy entry in the OUTFITS array:
```typescript
  { name: 'Cozy', drawUnder: drawCozy, drawOver: drawCozyOver },
```

- [ ] **Step 4: Build and verify**

Run: `npx tsc --noEmit`
Expected: No errors

Run: `npm run dev`
Verify: Select Cozy outfit in dressing room. The sweater/hoodie sleeves should now appear IN FRONT of the skin-colored arms — this is the Z-ordering fix working. Walk around to verify all 3 frames look correct.

- [ ] **Step 5: Commit**

```bash
git add src/rendering/OutfitRenderer.ts
git commit -m "fix: Cozy outfit sleeves render over arms (Z-order fix)"
```

---

### Task 6: Extract long sleeves to drawOver for Formal him (index 1)

**Files:**
- Modify: `src/rendering/OutfitRenderer.ts` — `drawFormal()` function (~line 185-311)

Formal him has jacket sleeves at lines 305-309 with `sleeveLen = (m.hipY - m.shoulderY) * 0.75` — long enough to be overdrawn by arms. Formal her is an off-shoulder dress with no sleeves, so no drawOver needed.

- [ ] **Step 1: Create drawFormalOver function**

Add after `drawFormal()`:

```typescript
function drawFormalOver(
  ctx: CanvasRenderingContext2D,
  character: 'her' | 'him',
  _frame: number,
  m: BodyMetrics,
) {
  if (character !== 'him') return; // Her has off-shoulder dress — no sleeves
  // Suit jacket sleeves (drawn over arms)
  const jacketColor = '#1B2A4A';
  const sleeveLen = (m.hipY - m.shoulderY) * 0.75;
  const sleeveW = hw(m, 'shoulder') * 0.55;
  shortSleeve(ctx, m.leftArmX, m.armTopY, sleeveLen, sleeveW, jacketColor);
  shortSleeve(ctx, m.rightArmX, m.armTopY, sleeveLen, sleeveW, jacketColor);
}
```

- [ ] **Step 2: Remove sleeve drawing from drawFormal him**

In `drawFormal()`, for 'him' (~lines 305-309), remove:
```typescript
    // Jacket sleeves
    const sleeveLen = (m.hipY - m.shoulderY) * 0.75;
    const sleeveW = hw(m, 'shoulder') * 0.55;
    shortSleeve(ctx, m.leftArmX, m.armTopY, sleeveLen, sleeveW, jacketColor);
    shortSleeve(ctx, m.rightArmX, m.armTopY, sleeveLen, sleeveW, jacketColor);
```

Replace with:
```typescript
    // Jacket sleeves moved to drawFormalOver (rendered after arms for correct Z-order)
```

- [ ] **Step 3: Register drawOver in OUTFITS array**

Update the Formal entry:
```typescript
  { name: 'Formal', drawUnder: drawFormal, drawOver: drawFormalOver },
```

- [ ] **Step 4: Build and verify**

Run: `npx tsc --noEmit`
Expected: No errors

Run: `npm run dev`
Verify: Select Formal outfit → him's suit jacket sleeves appear in front of arms. Her's off-shoulder dress is unchanged.

- [ ] **Step 5: Commit**

```bash
git add src/rendering/OutfitRenderer.ts
git commit -m "fix: Formal him jacket sleeves render over arms (Z-order fix)"
```

---

### Task 7: Extract sleeves to drawOver for Restaurant outfit (index 5)

**Files:**
- Modify: `src/rendering/OutfitRenderer.ts` — `drawRestaurant()` function (~line 614)

Restaurant outfit has 3/4-length sleeves for 'her' (lines 643-647) and rolled 3/4 sleeves for 'him' (lines 699-703). Both are long enough to be partially overdrawn by arms.

- [ ] **Step 1: Create drawRestaurantOver function**

Add after `drawRestaurant()`:

```typescript
function drawRestaurantOver(
  ctx: CanvasRenderingContext2D,
  character: 'her' | 'him',
  _frame: number,
  m: BodyMetrics,
) {
  const s = m.scale;
  if (character === 'her') {
    // 3/4 blouse sleeves (drawn over arms)
    const blouseColor = '#F5E6C8';
    const sleeveLen = (m.armBottomY - m.armTopY) * 0.6;
    const sleeveW = hw(m, 'shoulder') * 0.45;
    shortSleeve(ctx, m.leftArmX, m.armTopY, sleeveLen, sleeveW, blouseColor);
    shortSleeve(ctx, m.rightArmX, m.armTopY, sleeveLen, sleeveW, blouseColor);
  } else {
    // Rolled shirt sleeves (drawn over arms)
    const shirtColor = '#F0EBE0';
    const sleeveLen = (m.armBottomY - m.armTopY) * 0.55;
    const sleeveW = hw(m, 'shoulder') * 0.5;
    shortSleeve(ctx, m.leftArmX, m.armTopY, sleeveLen, sleeveW, shirtColor);
    shortSleeve(ctx, m.rightArmX, m.armTopY, sleeveLen, sleeveW, shirtColor);
    // Rolled cuff line
    ctx.strokeStyle = '#D0C8B8';
    ctx.lineWidth = Math.max(1, 1 * s);
    const cuffY = m.armTopY + sleeveLen - 3 * s;
    ctx.beginPath();
    ctx.moveTo(m.leftArmX - sleeveW / 2, cuffY);
    ctx.lineTo(m.leftArmX + sleeveW / 2, cuffY);
    ctx.moveTo(m.rightArmX - sleeveW / 2, cuffY);
    ctx.lineTo(m.rightArmX + sleeveW / 2, cuffY);
    ctx.stroke();
  }
}
```

- [ ] **Step 2: Remove sleeve drawing from drawRestaurant**

In `drawRestaurant()`, for 'her' (~lines 643-647), remove:
```typescript
    // Sleeves (3/4 length)
    const sleeveLen = (m.armBottomY - m.armTopY) * 0.6;
    const sleeveW = hw(m, 'shoulder') * 0.45;
    shortSleeve(ctx, m.leftArmX, m.armTopY, sleeveLen, sleeveW, blouseColor);
    shortSleeve(ctx, m.rightArmX, m.armTopY, sleeveLen, sleeveW, blouseColor);
```

Replace with:
```typescript
    // 3/4 sleeves moved to drawRestaurantOver (rendered after arms for correct Z-order)
```

For 'him' (~lines 699-709), remove the sleeve block AND the rolled cuff lines:
```typescript
    // Rolled sleeves (3/4)
    const sleeveLen = (m.armBottomY - m.armTopY) * 0.55;
    const sleeveW = hw(m, 'shoulder') * 0.5;
    shortSleeve(ctx, m.leftArmX, m.armTopY, sleeveLen, sleeveW, shirtColor);
    shortSleeve(ctx, m.rightArmX, m.armTopY, sleeveLen, sleeveW, shirtColor);
    // Rolled cuff line
    ctx.strokeStyle = '#D0C8B8';
    ctx.lineWidth = Math.max(1, 1 * s);
    const cuffY = m.armTopY + sleeveLen - 3 * s;
    ctx.beginPath();
    ctx.moveTo(m.leftArmX - sleeveW / 2, cuffY);
    ctx.lineTo(m.leftArmX + sleeveW / 2, cuffY);
    ctx.moveTo(m.rightArmX - sleeveW / 2, cuffY);
    ctx.lineTo(m.rightArmX + sleeveW / 2, cuffY);
    ctx.stroke();
```

Replace with:
```typescript
    // Rolled sleeves moved to drawRestaurantOver (rendered after arms for correct Z-order)
```

- [ ] **Step 3: Register drawOver in OUTFITS array**

Update the Restaurant entry:
```typescript
  { name: 'Restaurant', drawUnder: drawRestaurant, drawOver: drawRestaurantOver },
```

- [ ] **Step 4: Build and verify**

Run: `npx tsc --noEmit`
Expected: No errors

Run: `npm run dev`
Verify: Select Restaurant outfit in dressing room. Sleeves appear in front of arms correctly for both her and him. Walk all 3 frames.

- [ ] **Step 5: Commit**

```bash
git add src/rendering/OutfitRenderer.ts
git commit -m "fix: Restaurant outfit sleeves render over arms (Z-order fix)"
```

---

## Chunk 3: NPC Visual Upgrade

### Task 9: Add gender to NPCDef and diversify NPC skin tones

**Files:**
- Modify: `src/data/mapLayout.ts:322-410`

- [ ] **Step 1: Add gender field to NPCDef and update NPCs**

In `src/data/mapLayout.ts`, update the `NPCDef` interface to add a `gender` field:

```typescript
export interface NPCDef {
  id: string;
  name: string;
  gender: 'her' | 'him';
  palette: NPCPalette;
  schedule: NPCScheduleEntry[];
  speed: number;
}
```

Then update each NPC in the NPCS array to include `gender` and update skin tones for diversity. Use the `palette.skin` field for the new diverse skin tones (keep using the same NPCPalette interface — the upgrade is in the values):

```typescript
export const NPCS: NPCDef[] = [
  {
    id: 'baker',
    name: 'Baker',
    gender: 'him',
    palette: { skin: '#ffe0c0', hair: '#8b4513', shirt: '#ffffff', pants: '#4a4a4a' },
    // ... schedule and speed unchanged
  },
  {
    id: 'florist',
    name: 'Florist',
    gender: 'her',
    palette: { skin: '#d4a070', hair: '#d4a574', shirt: '#90ee90', pants: '#2e8b57' },
    // ... schedule and speed unchanged
  },
  {
    id: 'reader',
    name: 'Book Lover',
    gender: 'her',
    palette: { skin: '#7a4820', hair: '#2c1810', shirt: '#6b4c8a', pants: '#3c3c5a' },
    // ... schedule and speed unchanged
  },
  {
    id: 'dog-walker',
    name: 'Dog Walker',
    gender: 'him',
    palette: { skin: '#f0c8a0', hair: '#a0522d', shirt: '#ff6347', pants: '#4682b4' },
    // ... schedule and speed unchanged
  },
  {
    id: 'musician',
    name: 'Musician',
    gender: 'him',
    palette: { skin: '#b07840', hair: '#1a1a1a', shirt: '#ffd700', pants: '#1a1a1a' },
    // ... schedule and speed unchanged
  },
  {
    id: 'cat',
    name: 'Town Cat',
    gender: 'him',
    palette: { skin: '#ff8c00', hair: '#ff8c00', shirt: '#ff8c00', pants: '#ff8c00' },
    // ... schedule and speed unchanged
  },
];
```

- [ ] **Step 2: Build and verify**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/data/mapLayout.ts
git commit -m "feat: add gender field to NPCDef, diversify NPC skin tones"
```

---

### Task 10: Upgrade generateNPCTexture with gender-aware shapes

**Files:**
- Modify: `src/rendering/WorldRenderer.ts:1686-1754`
- Modify: `src/scenes/BootScene.ts:45-47`

- [ ] **Step 1: Update generateNPCTexture signature and body**

In `src/rendering/WorldRenderer.ts`, replace the entire `generateNPCTexture` method (lines 1686-1754) with:

```typescript
  static generateNPCTexture(
    scene: Phaser.Scene,
    npc: { id: string; gender: 'her' | 'him'; palette: { skin: string; hair: string; shirt: string; pants: string } },
  ): void {
    const isHer = npc.gender === 'her';

    for (let frame = 0; frame < 3; frame++) {
      const [canvas, ctx] = this.makeCanvas(32, 48);

      // Head — slightly narrower for 'her'
      const headR = isHer ? 5.5 : 6;
      ctx.fillStyle = npc.palette.skin;
      ctx.beginPath();
      ctx.arc(16, 12, headR, 0, Math.PI * 2);
      ctx.fill();

      // Hair — fuller for 'her' (extends lower on sides)
      ctx.fillStyle = npc.palette.hair;
      ctx.beginPath();
      if (isHer) {
        ctx.arc(16, 10, headR, Math.PI, 0); // top half
        // Side hair extending below ears
        ctx.fillRect(10, 10, 3, 6);
        ctx.fillRect(19, 10, 3, 6);
      } else {
        ctx.arc(16, 10, headR, Math.PI, 0); // top half only
      }
      ctx.fill();

      // Hair highlight (subtle lighter arc)
      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(16, 10, headR - 1, Math.PI + 0.5, -0.5);
      ctx.stroke();

      // Body / shirt — trapezoid shape instead of flat rect
      ctx.fillStyle = npc.palette.shirt;
      ctx.beginPath();
      if (isHer) {
        // Narrower shoulders, slightly wider hips
        ctx.moveTo(10, 18);
        ctx.lineTo(22, 18);
        ctx.lineTo(23, 31);
        ctx.lineTo(9, 31);
      } else {
        // Broader shoulders
        ctx.moveTo(9, 18);
        ctx.lineTo(23, 18);
        ctx.lineTo(22, 31);
        ctx.lineTo(10, 31);
      }
      ctx.closePath();
      ctx.fill();

      // Arms (slight swing per frame)
      const armSwing = frame === 0 ? 0 : frame === 1 ? -2 : 2;
      ctx.fillStyle = npc.palette.shirt;
      ctx.fillRect(5, 19 + armSwing, 4, 10);
      ctx.fillRect(23, 19 - armSwing, 4, 10);

      // Skin on lower arms
      ctx.fillStyle = npc.palette.skin;
      ctx.fillRect(5, 25 + armSwing, 4, 4);
      ctx.fillRect(23, 25 - armSwing, 4, 4);

      // Hands
      ctx.fillStyle = npc.palette.skin;
      ctx.beginPath();
      ctx.arc(7, 30 + armSwing, 2, 0, Math.PI * 2);
      ctx.arc(25, 30 - armSwing, 2, 0, Math.PI * 2);
      ctx.fill();

      // Legs / pants
      ctx.fillStyle = npc.palette.pants;
      const legOffset = frame === 0 ? 0 : frame === 1 ? 2 : -2;
      ctx.fillRect(10, 32, 5, 12 + legOffset);
      ctx.fillRect(17, 32, 5, 12 - legOffset);

      // Shoes — ellipse instead of flat rect
      ctx.fillStyle = '#333333';
      ctx.beginPath();
      ctx.ellipse(12, 44 + Math.max(0, legOffset), 3, 1.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(20, 44 + Math.max(0, -legOffset), 3, 1.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Eyes (tiny dots)
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(14, 11, 1, 1);
      ctx.fillRect(18, 11, 1, 1);

      // Cheek blush for 'her'
      if (isHer) {
        ctx.save();
        ctx.globalCompositeOperation = 'multiply';
        ctx.fillStyle = 'rgba(220,150,150,0.25)';
        ctx.beginPath();
        ctx.arc(13, 13, 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(19, 13, 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      this.register(scene, `npc-${npc.id}-frame-${frame}`, canvas);
    }

    // Create walk animation — 6fps (upgraded from 4fps)
    scene.anims.create({
      key: `npc-${npc.id}-walk`,
      frames: [
        { key: `npc-${npc.id}-frame-1` },
        { key: `npc-${npc.id}-frame-0` },
        { key: `npc-${npc.id}-frame-2` },
        { key: `npc-${npc.id}-frame-0` },
      ],
      frameRate: 6,
      repeat: -1,
    });
  }
```

- [ ] **Step 2: Update BootScene NPC texture generation call**

In `src/scenes/BootScene.ts`, find the NPC texture generation loop (~line 45-47):

```typescript
    for (const npcDef of NPCS) {
      WorldRenderer.generateNPCTexture(this, npcDef.id, npcDef.palette);
    }
```

Replace with:

```typescript
    for (const npcDef of NPCS) {
      WorldRenderer.generateNPCTexture(this, npcDef);
    }
```

- [ ] **Step 3: Build and verify**

Run: `npx tsc --noEmit`
Expected: No errors

Run: `npm run dev`
Verify:
- NPCs have diverse skin tones (visible color differences across the 6 NPCs)
- 'her' NPCs (florist, reader) have narrower shoulders and cheek blush
- 'him' NPCs (baker, dog-walker, musician) have broader shoulders
- All NPCs have ellipse shoes instead of flat rectangles
- NPC walk animation is slightly smoother (6fps vs 4fps)
- Cat still renders correctly (all palette fields are the same orange)

- [ ] **Step 4: Commit**

```bash
git add src/rendering/WorldRenderer.ts src/scenes/BootScene.ts
git commit -m "feat: upgrade NPC visuals with gender shapes, skin diversity, ellipse shoes, 6fps walk"
```

---

## Chunk 4: Idle Animation

### Task 11: Add idle tween animation for player and partner

**Files:**
- Modify: `src/scenes/WorldScene.ts`

- [ ] **Step 1: Add idle tween properties and setup**

In `WorldScene.ts`, find the class properties section (near the top of the class). Add two new properties:

```typescript
  private playerIdleTween?: Phaser.Tweens.Tween;
  private partnerIdleTween?: Phaser.Tweens.Tween;
```

In the `create()` method, after the player and partner sprites are created and positioned (after line ~180), add idle tween setup:

```typescript
    // Idle breathing animation — subtle bob + scale when standing still
    this.playerIdleTween = this.tweens.add({
      targets: this.player,
      y: this.player.y - 1.5,
      scaleY: this.player.scaleY * 0.985,
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
      paused: true,
    });

    this.partnerIdleTween = this.tweens.add({
      targets: this.partner,
      y: this.partner.y - 1.5,
      scaleY: this.partner.scaleY * 0.985,
      duration: 1400,  // slightly different period to avoid sync
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
      paused: true,
    });

    // Start idle immediately (player starts standing)
    this.playerIdleTween.resume();
    this.partnerIdleTween.resume();
```

- [ ] **Step 2: Pause idle on movement, resume on stop**

In the `update()` method, find the movement detection block (~lines 446-461). Modify to integrate idle tween:

Replace the block:
```typescript
    if (isMoving) {
      this.playerPositionHistory.push(new Phaser.Math.Vector2(this.player.x, this.player.y));
      if (this.playerPositionHistory.length > 30) {
        this.playerPositionHistory.shift();
      }
      // Play walk animation and flip based on direction
      this.player.play(this.playerTextureKey + '-walk', true);
      if (body.velocity.x < 0) this.player.setFlipX(true);
      else if (body.velocity.x > 0) this.player.setFlipX(false);
      this.playerMoving = true;
    } else if (this.playerMoving) {
      // Transition to idle — set texture once
      this.playerMoving = false;
      this.player.stop();
      this.player.setTexture(this.playerTextureKey + '-frame-0');
    }
```

With:
```typescript
    if (isMoving) {
      this.playerPositionHistory.push(new Phaser.Math.Vector2(this.player.x, this.player.y));
      if (this.playerPositionHistory.length > 30) {
        this.playerPositionHistory.shift();
      }
      // Play walk animation and flip based on direction
      this.player.play(this.playerTextureKey + '-walk', true);
      if (body.velocity.x < 0) this.player.setFlipX(true);
      else if (body.velocity.x > 0) this.player.setFlipX(false);
      if (!this.playerMoving) {
        this.playerIdleTween?.pause();
      }
      this.playerMoving = true;
    } else if (this.playerMoving) {
      // Transition to idle — set texture once
      this.playerMoving = false;
      this.player.stop();
      this.player.setTexture(this.playerTextureKey + '-frame-0');
      this.playerIdleTween?.resume();
    }
```

- [ ] **Step 3: Handle idle tween Y-position reset**

The idle tween modifies `this.player.y`. When the player starts moving, the Y position may be mid-tween (offset by up to 1.5px). The tween's `pause()` freezes at current position, and movement takes over — this is acceptable because the physics body controls position during movement. When pausing, we should update the tween's targets to the current position so it resumes correctly:

After the `this.playerIdleTween?.resume()` line, add:

```typescript
      // Update tween target to current position
      if (this.playerIdleTween) {
        this.playerIdleTween.updateTo('y', this.player.y - 1.5, true);
      }
```

Note: `updateTo` updates the tween's target value mid-flight. This ensures the idle bob centers around wherever the player stopped.

- [ ] **Step 4: Pause/resume partner idle tween on partner movement**

In `updatePartner()`, find where the partner starts/stops walking. The partner follows the player using position history. Add idle tween handling:

When the partner starts moving (playing walk animation), pause the idle tween:
```typescript
    this.partnerIdleTween?.pause();
```

When the partner stops (sets idle texture), resume the idle tween:
```typescript
    this.partnerIdleTween?.resume();
    if (this.partnerIdleTween) {
      this.partnerIdleTween.updateTo('y', this.partner.y - 1.5, true);
    }
```

The exact insertion points depend on the partner movement logic — look for where `this.partner.play(...)` and `this.partner.stop()` are called in `updatePartner()`.

- [ ] **Step 5: Build and verify**

Run: `npx tsc --noEmit`
Expected: No errors

Run: `npm run dev`
Verify:
- Player subtly bobs up and down when standing still (with slight vertical scale breathing)
- Partner also bobs with a slightly different rhythm
- Bobbing pauses immediately when player starts moving
- Partner bobbing pauses when partner is following player
- Bobbing resumes when player/partner stops
- No visible "jump" when transitioning between idle and walk

- [ ] **Step 6: Commit**

```bash
git add src/scenes/WorldScene.ts
git commit -m "feat: add idle breathing tween animation for player and partner"
```

---

## Final Verification

### Task 12: Full visual walkthrough and build verification

- [ ] **Step 1: Production build**

Run: `npm run build`
Expected: Build completes with no errors

- [ ] **Step 2: Full visual walkthrough**

Run: `npm run preview`

Verify each improvement:
1. **Composite fix:** Hair specular highlight renders correctly (no composite leak)
2. **Character palette:** Him's hair has warm golden specular, her's has white
3. **Cheek blush:** Her character has subtle warm cheek blush in both dressing room and game
4. **Z-ordering:** Select Cozy outfit → sleeves appear IN FRONT of arms (not overdrawn by skin)
5. **Z-ordering:** Select Formal outfit → him's jacket sleeves appear correctly over arms
6. **Z-ordering:** Select Restaurant outfit → sleeves appear correctly over arms
6. **NPC diversity:** Walk around world — NPCs show different skin tones and gender shapes
7. **NPC shoes:** NPCs have rounded ellipse shoes instead of flat rectangles
8. **NPC walk:** NPC walk animation is smoother (6fps)
9. **Idle animation:** Stand still → player bobs gently. Walk → bobbing stops. Stop → bobbing resumes.

- [ ] **Step 3: Final commit with all changes**

If any fixes were needed during verification, commit them:
```bash
git add -A
git commit -m "feat: character visual overhaul — Z-ordering, palettes, blush, NPC diversity, idle animation"
```
