# Budapest Cutscene Character Overhaul — Design Document

**Date:** 2026-03-22
**Status:** Design Phase
**Scope:** Character prominence, outfit-awareness, animations, and emotional arcs across all 4 Budapest cutscene scenes.

---

## Decision: Approach B (Shared Character System + Per-Scene Fixes)

### Why not A or C:
- **A (scene-by-scene)** leads to copy-pasted sprite generation, inconsistent animation quality, and 5x maintenance burden. Each scene would re-invent outfit-aware drawing.
- **C (full rewrite)** throws away working environmental code (the Eye's 8-phase parallax system, the Cruise's bridge sequence, the Bath's steam effects). These environments are good — the characters inside them are bad.
- **B** creates one shared system (like AirportTextures' `generateCutsceneSeatedSprites`) that all Budapest scenes consume, then fixes each scene's character integration. The environments stay, the characters get promoted to foreground focus.

### Self-critique of Approach B:
- **Risk**: Over-engineering a shared system that each scene barely uses differently. Mitigation: keep the shared system thin — sprite generation + animation presets, not a scene orchestrator.
- **Risk**: Shared animations feel samey across scenes. Mitigation: presets are building blocks (breathing, swaying), not full choreographies. Each scene composes them differently.
- **Risk**: Scope creep into environment rewrites. Mitigation: explicitly forbid environmental changes except depth/alpha adjustments to make characters foreground.

---

## Architecture

### New file: `src/game/rendering/BudapestCutsceneSprites.ts`

Single exported function + animation presets. Follows the exact pattern of `generateCutsceneSeatedSprites` in AirportTextures.ts.

```
generateBudapestCoupleSprites(scene, playerOutfitIdx, partnerOutfitIdx)
```

Generates these texture keys (all outfit-aware, reading from OUTFIT_STYLES):
- `bp-couple-seated` — 96x64, couple sitting side by side (bus, bath pool edge)
- `bp-couple-seated-cozy` — 96x64, same but partner head on player shoulder, eyes half-closed
- `bp-couple-standing` — 96x80, upper-body close-up, both facing camera (cruise, general)
- `bp-couple-standing-close` — 96x80, same but leaning together, one arm around other
- `bp-couple-silhouette` — 80x60, dark outline versions for Eye scene backlighting
- `bp-player-eyes-closed` — variant of seated with closed eyes (reuse pattern from cutscene-player-resting)
- `bp-partner-eyes-closed` — same for partner

Canvas sizes are larger than current (96x64 vs 64x48) because these will be rendered at 2.0 scale = 192x128 visual pixels, making characters prominent.

### New file: `src/game/systems/CutsceneAnimations.ts`

Animation preset functions that return tween configs. Not a class — just exported functions that take a sprite and return `Phaser.Types.Tweens.TweenBuilderConfig`.

```typescript
// Returns tween config for subtle breathing (y oscillation, 2px, 2s period)
breathingAnim(sprite): TweenBuilderConfig

// Returns tween config for gentle side-to-side sway (angle -2 to +2, 3s)
swayAnim(sprite): TweenBuilderConfig

// Returns tween config for head-lean transition (angle + x shift over 1.5s)
leanTogetherAnim(playerSprite, partnerSprite): TweenBuilderConfig[]

// Returns tween config for floating Z's (creates text objects)
sleepingZAnim(scene, anchorSprite): void

// Texture swap after delay (eyes open -> eyes closed)
eyeCloseTransition(scene, sprite, closedTextureKey, delayMs): void
```

### Modified files:

1. `src/game/rendering/BudapestTextures.ts` — Remove hardcoded couple sprites (`bp-cutscene-bus-couple`, `bp-cutscene-couple-close`, `bp-cutscene-couple-pool`). Replace with calls to the new system. Keep all environmental textures unchanged.

2. `src/game/scenes/budapest/BudapestBusRideScene.ts` — Major character rework
3. `src/game/scenes/budapest/BudapestEyeScene.ts` — Character rework within POV frame
4. `src/game/scenes/budapest/DanubeCruiseScene.ts` — Character rework
5. `src/game/scenes/budapest/ThermalBathScene.ts` — Character rework (most severe current state)
6. `src/game/scenes/budapest/cutsceneHelpers.ts` — No changes needed

---

## Sprite Generation Details

### `generateBudapestCoupleSprites` internals

The function reads `OUTFIT_STYLES[playerOutfitIdx]` and `OUTFIT_STYLES[partnerOutfitIdx]` for:
- `skin`, `hair`, `maleHair`, `shirt`, `pants`, `hairStyle`, `maleHairStyle`, `accent`

It draws on canvas using the same `px()`, `rect()`, `darken()`, `lighten()` helpers already in AirportTextures.ts. These helpers should be extracted to a shared `src/game/rendering/pixelUtils.ts` (they're currently duplicated between AirportTextures.ts and BudapestTextures.ts).

**bp-couple-seated (96x64)**:
- Left figure (player): 16x14 head, 24x16 torso, seated pose. Uses `shirt` color for top, `hair`/`hairStyle` for hair, `skin` for face/hands. Eyes open, slight smile, blush marks.
- Right figure (partner): Same proportions, uses `maleHair`/`maleHairStyle`, `shirt` from partner outfit. Broader shoulders (male build, matching AirportTextures partner pattern).
- Figures overlap slightly at shoulders — intimate seating.
- Seat/bench rendered at bottom 10px.

**bp-couple-seated-cozy (96x64)**:
- Same base as seated, but partner's head tilted 15deg toward player, resting on shoulder.
- Player's eyes half-closed (2px horizontal line instead of eye whites).
- Partner's arm crosses behind player.
- Stronger blush on both.

**bp-couple-standing (96x80)**:
- Upper-body portrait. Heads at top third, shoulders/torso fill middle.
- Both facing camera (3/4 view, matching AirportTextures seated approach).
- Hands visible at bottom — one pair clasped together between them.

**bp-couple-standing-close (96x80)**:
- Same as standing but leaning in. Player's head tilted, partner's arm around player shoulder.
- Warmer expression (wider smile line).

**bp-couple-silhouette (80x60)**:
- Dark fill (#1A1A2A) with subtle skin-tone edge highlights.
- Used in Eye scene where couple is backlit by sunset. Only outlines and hair silhouette visible.
- Drawn at reduced detail — no eyes, no clothing color. Just shape + hair outline.

### Why 96px wide instead of 64px:

At 2.0 scale, 96px = 192px visual. On a 640px-wide game canvas, that's 30% width — prominent without overwhelming. The current 64px at 1.0 scale = 64px visual = 10% width. That's why characters feel like labels.

---

## Per-Scene Changes

### 1. BudapestBusRideScene

**Current state**: Single `bp-cutscene-bus-couple` at 1.0 scale, depth 45, positioned at `(w/2, h-60)`. Zero animations. Character is a static label at bottom of screen while environments scroll.

**After**:

**Character setup (create-time)**:
- Call `generateBudapestCoupleSprites(this, state.outfits.player, state.outfits.partner)`
- Player sprite: `this.add.image(w*0.5, h*0.72, 'bp-couple-seated').setScale(2.0).setDepth(45)`
- Visual size: 192x128, centered in lower half of screen.

**Animation channels (4 simultaneous)**:
1. **Breathing**: Both figures get `breathingAnim()` — subtle y oscillation, offset by 500ms.
2. **Bus sway**: Gentle angle oscillation (-1.5 to +1.5 deg, 1.5s period) synced to road motion. Applied to couple sprite.
3. **Texture swap at Phase 4 (14s)**: Swap to `bp-couple-seated-cozy` — partner rests head on player shoulder as they cross the Danube.
4. **Emotional glow**: At Phase 4, add a warm circle (depth 44) behind couple that pulses with golden overlay.

**Emotional arc**:
- Phase 1-2 (0-8s): Excited, eyes open, breathing + sway. Dialogue shows anticipation.
- Phase 3 (8-14s): Eyes still open, couple points at scenery (brief x-shift tween on sprite).
- Phase 4 (14-18s): Cozy texture swap. Breathing slows (period doubles). Bus sway dampens. Golden backlight.
- Phase 5 (18-20s): Gentle fade — characters stay visible through final fade.

**Character screen time**: ~95% (visible from frame 1 to final fade).

**Environmental changes**: Reduce bus window frame alpha from 0.85 to 0.6 so it doesn't compete with characters. Increase couple depth from 45 to 48 (above frame overlay at 40). No other environment changes.

---

### 2. BudapestEyeScene

**Current state**: Couple is `bp-eye-pov-couple` silhouette at depth 98, positioned at `(w/2, h-90)`. Scale 1.0 on a 240x140 texture. Only animations: alpha fade-in, x-shift of 3px, angle tilt of 3deg. The couple is a background object in their own scene. The POV approach means the city is the star, not the characters.

**Design tension**: The Eye scene is a POV experience — you're looking OUT the cabin window. Making characters front-and-center contradicts the "looking at the city" concept.

**Resolution**: Hybrid approach. Phases 1-4 (0-20s) stay POV-focused but with a **visible couple reflection** in the glass that has real animations. Phases 5-8 (20-40s) transition to a **close-up character framing** where the city becomes background and the couple becomes foreground.

**After**:

**Character setup**:
- Call `generateBudapestCoupleSprites()`
- Replace `bp-eye-pov-couple` with `bp-couple-silhouette` at depth 98, scale 1.5 (was 1.0). Position at `(w/2, h-70)` (higher up, more visible).
- Add `bp-couple-standing` at depth 92, scale 0.8, alpha 0 — used for reflection.

**Phases 1-4 adjustments (POV with animated silhouette)**:
- Silhouette gets `swayAnim()` synced to cabin sway tween.
- Silhouette gets `breathingAnim()`.
- At phase 3 (9s), silhouette's hand position shifts (couple reaches for each other).
- Couple reflection (depth 90) fades to alpha 0.12 (was 0.07) — real animations: breathing + sway matching silhouette.

**Phase 5 (The Apex, 20-26s) — character transition**:
- Over 3 seconds, silhouette fades out and `bp-couple-standing-close` fades in at depth 98, scale 2.0, positioned at `(w*0.5, h*0.6)`.
- Camera zoom from 1.02 to 1.08 (was 1.02) — pushing in on the couple.
- City elements get alpha reduced to 0.4 — characters become foreground focus.
- 4 animation channels active: breathing, sway, golden backlight pulse, texture-hold on close variant.

**Phases 6-8 (26-40s)**:
- Couple stays at 2.0 scale, depth 98.
- At phase 7 (32s), swap to `bp-couple-seated-cozy` — they've settled in together as the ride descends.
- City lights twinkle behind them (depth 2-5), not competing.
- Character screen time for close-up: 20 of 40 seconds = 50%. Combined with silhouette: 95% total.

**Emotional arc**:
- Phases 1-4: Wonder (looking at city, breathing quickens at phase 3).
- Phase 5: Intimacy (turning to each other, city recedes).
- Phase 6-7: Contentment (leaning together, breathing slows).
- Phase 8: Bittersweet (ride ending, but characters stay prominent through fade).

---

### 3. DanubeCruiseScene

**Current state**: Couple appears as `bp-cutscene-couple-close` at 0.5 scale (phase 1), disappears for 8 seconds (phases 2-3), reappears at 1.0 scale (phase 4) with only alpha fade. Environmental spectacle (Parliament, bridges, castle) dominates.

**After**:

**Character setup**:
- Call `generateBudapestCoupleSprites()`
- Phase 1: `bp-couple-standing` at scale 1.5 (not 0.5), depth 40. Positioned at `(w*0.65, h*0.65)` — on the boat deck, right of center.
- Character NEVER disappears. During phases 2-3, couple stays visible, repositioned to `(w*0.5, h*0.75)` with scale reduced to 1.2 as "camera" pulls back to show landmarks, but they're still there.

**Phase 1 (Boarding, 0-4s)**:
- Couple walks onto boat: tween from `(w-130, waterY+8)` to `(w*0.65, h*0.65)`.
- Scale tweens from 1.0 to 1.5 as they approach camera.
- `breathingAnim()` starts immediately.

**Phase 2-3 (Departure + Bridges, 4-16s)**:
- Couple stays visible at `(w*0.5, h*0.75)`, scale 1.2.
- `swayAnim()` added — boat rocking.
- During bridge pass (8-12s), shadow overlay dims everything BUT couple (couple depth 40, shadow at depth 30).
- At 12s, texture swap to `bp-couple-standing-close` — partner leans in, pointing at something.

**Phase 4 (City of Lights, 16-24s)**:
- Couple scales up to 2.0, moves to `(w*0.5, h*0.65)` — foreground focus.
- 4 animation channels: breathing, boat sway, golden backlight circle, texture-hold on close variant.
- City buildings flanking at depth 4 with alpha 0.7 — framing, not competing.
- Golden sparkles rise BEHIND couple (depth 15 vs couple depth 40).

**Phase 5 (Return, 24-30s)**:
- Swap to `bp-couple-seated-cozy` at 25s — they've sat down on the deck.
- Scale stays 2.0. Breathing slows. Sway continues.
- Stars multiply behind them. Cool blue overlay at depth 25 (below couple at 40).

**Character screen time**: 100% (never disappears).

**Emotional arc**: Excited (boarding) -> Awed (landmarks) -> Romantic (city of lights) -> Peaceful (return).

---

### 4. ThermalBathScene

**Current state**: Characters start as COLORED RECTANGLES (8x16px `player` and `partner` at depth 10), walk in, then become `bp-cutscene-couple-pool` (64x32) at depth 15 with only alpha fade. The colored rectangles are the worst character representation in the entire game.

**After**:

**Character setup**:
- Call `generateBudapestCoupleSprites()`
- Remove colored rectangles entirely.
- Phase 1: `bp-couple-standing` at scale 1.8, depth 30, walking in from left.
- Phase 2: Swap to `bp-couple-seated` at scale 2.0, depth 30, at pool edge.

**Phase 1 (Entrance, 0-5s)**:
- Couple walks in as `bp-couple-standing` at scale 1.8 — immediately recognizable, outfit-correct.
- Positioned at `(-40, floorY-50)`, tweens to `(w*0.35, floorY-50)`.
- `breathingAnim()` active from start.
- Steam wisps pass IN FRONT of couple at depth 35 (couple at 30) — environmental depth.

**Phase 2 (The Pool, 5-14s)**:
- Camera pan (existing). After pan completes:
- Standing sprite fades out, `bp-couple-seated` fades in at `(poolX, poolY + poolH/2 - 20)`, scale 2.0.
- Characters are LARGE and centered at pool edge.
- `breathingAnim()` + `swayAnim()` (gentle, matching water ripple rhythm).
- Pool ripples at depth 9 (below couple at 30). Steam at depth 35 (above couple).
- Characters framed by pool columns on either side.

**Phase 3 (Relaxation, 14-22s)**:
- At 16s, swap to `bp-couple-seated-cozy` — partner resting head on player.
- `eyeCloseTransition(scene, playerSprite, 'bp-player-eyes-closed', 2000)` — player's eyes close.
- Breathing period doubles (4s instead of 2s) — deep relaxation.
- Steam intensifies around them but couple stays clearly visible (higher depth).
- Amber overlay warms but couple stays outfit-colored (no tint on character sprite).

**Phase 4 (Exit, 22-25s)**:
- Characters stay visible through warm white fade. Last thing you see before transition.

**Character screen time**: 100%.

**Emotional arc**: Impressed (entering) -> Delighted (pool) -> Deeply relaxed (cozy) -> Blissful (fade out).

---

### 5. Overworld Scenes (BudapestOverworldScene, JewishQuarterScene, RuinBarScene)

These are gameplay scenes, not cutscenes. The player character is already the standard overworld sprite driven by `PixelArtGenerator.ts` outfit system. NPCs are static 48x48 but that's appropriate for overworld — they're background characters.

**No changes needed for this effort.** The cutscene character system is specifically for the 4 cutscene scenes above. Overworld character quality is a separate initiative.

---

## Animation Presets Detail

### `breathingAnim(sprite)`
```typescript
{
  targets: sprite,
  y: sprite.y - 2,   // 2px lift
  duration: 2000,     // 2s period
  ease: 'Sine.easeInOut',
  yoyo: true,
  repeat: -1,
}
```

### `swayAnim(sprite)`
```typescript
{
  targets: sprite,
  angle: { from: -2, to: 2 },
  duration: 3000,
  ease: 'Sine.easeInOut',
  yoyo: true,
  repeat: -1,
}
```

### `leanTogetherAnim(player, partner)`
Returns array of 2 tween configs:
- Partner: angle +8, x -5 (lean toward player), 1500ms
- Player: angle -3, x +3 (slight lean back to receive), 1500ms

### `sleepingZAnim(scene, anchor)`
Spawns 3 waves of floating "z" text (same as AirplaneCutscene phase 4), anchored to sprite position. Uses `Press Start 2P` font, white with alpha fade.

### `eyeCloseTransition(scene, sprite, closedKey, delay)`
```typescript
scene.time.delayedCall(delay, () => {
  sprite.setTexture(closedKey);
});
```
Simple, but having it as a named function makes the intent clear in scene code.

---

## Shared Pixel Utils Extraction

Currently `px()`, `rect()`, `darken()`, `lighten()` are duplicated in both AirportTextures.ts and BudapestTextures.ts.

Create `src/game/rendering/pixelUtils.ts`:
```typescript
export function px(ctx, x, y, color): void { ... }
export function rect(ctx, x, y, w, h, color): void { ... }
export function darken(hex, amount): string { ... }
export function lighten(hex, amount): string { ... }
```

Both texture files import from here. BudapestCutsceneSprites.ts also imports from here.

---

## File Structure Summary

```
src/game/rendering/
  pixelUtils.ts                    [NEW] — shared px/rect/darken/lighten
  BudapestCutsceneSprites.ts       [NEW] — outfit-aware couple sprite generation
  AirportTextures.ts               [MODIFY] — import from pixelUtils
  BudapestTextures.ts              [MODIFY] — remove hardcoded couples, import from pixelUtils

src/game/systems/
  CutsceneAnimations.ts            [NEW] — animation preset functions

src/game/scenes/budapest/
  BudapestBusRideScene.ts          [MODIFY] — character rework
  BudapestEyeScene.ts              [MODIFY] — character rework
  DanubeCruiseScene.ts             [MODIFY] — character rework
  ThermalBathScene.ts              [MODIFY] — character rework
  cutsceneHelpers.ts               [NO CHANGE]
```

---

## Implementation Order

### Phase 1: Foundation (do first — everything else depends on this)
1. **pixelUtils.ts** — Extract shared drawing functions. Update AirportTextures.ts and BudapestTextures.ts imports. Zero behavior change, pure refactor.
2. **BudapestCutsceneSprites.ts** — Implement `generateBudapestCoupleSprites()`. Generate all 7 texture variants. Test by temporarily rendering them in a test scene.
3. **CutsceneAnimations.ts** — Implement all 5 preset functions.

### Phase 2: Scene fixes (do in this order — easiest to hardest)
4. **BudapestBusRideScene.ts** — Simplest scene, most straightforward fix. Good test of the shared system.
5. **ThermalBathScene.ts** — Second simplest. Eliminates the worst offender (colored rectangles).
6. **DanubeCruiseScene.ts** — Medium complexity. Character persistence through all phases requires careful timing.
7. **BudapestEyeScene.ts** — Most complex. Hybrid POV-to-closeup transition. Do last because lessons from other scenes inform this one.

### Phase 3: Cleanup
8. **BudapestTextures.ts** — Remove old hardcoded couple textures that are no longer referenced.
9. Verify all scenes import and call `generateBudapestCoupleSprites()` correctly.
10. Test outfit changes propagate to all Budapest cutscenes.

---

## Key Metrics (Before -> After)

| Metric | Bus | Eye | Cruise | Bath |
|--------|-----|-----|--------|------|
| Character scale | 1.0 -> 2.0 | 1.0 -> 1.5/2.0 | 0.5/1.0 -> 1.5/2.0 | rect/1.0 -> 1.8/2.0 |
| Animation channels | 0 -> 4 | 2 -> 4 | 1 -> 4 | 1 -> 3 |
| Outfit-aware | No -> Yes | No -> Yes | No -> Yes | No -> Yes |
| Texture variants | 1 -> 2 | 1 -> 3 | 1 -> 3 | 1 -> 3 |
| Screen time | ~95% -> ~95% | ~80% -> ~95% | ~60% -> 100% | ~75% -> 100% |
| Emotional arc | None -> 4 phases | Minimal -> 4 phases | None -> 4 phases | None -> 4 phases |
| Character visual px | 64x48 | 240x140 silhouette | 32x24 / 64x48 | 8x16 rect / 64x32 |
| Character visual px (after) | 192x128 | 120x90 sil + 192x160 close | 192x160 | 192x128 |
