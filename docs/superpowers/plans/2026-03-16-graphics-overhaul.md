# Graphics Overhaul Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current 48px stick-figure characters with high-fidelity 160px characters using offscreen Canvas 2D pre-rendering, upgrade world environment, UI, and all visual elements.

**Architecture:** New OffscreenCharacterRenderer draws characters on offscreen canvases using Canvas 2D API (bezier curves, gradients, compositing), converts to Phaser textures via toDataURL(). All textures pre-rendered at boot. Characters are pre-defined (her: dark hair/hourglass, him: blond/athletic), only outfits customizable. AvatarScene replaced with DressingRoomScene.

**Tech Stack:** Phaser 3.90.0, TypeScript 5.9.3, Vite 8.0.0, Canvas 2D API

**Spec:** `docs/superpowers/specs/2026-03-16-graphics-overhaul-design.md`

**Note:** This is a Phaser game with no test framework. Visual verification is done by running `npm run dev` and checking the browser. Each task includes a visual verification step.

---

## Chunk 1: Foundation (Storage + Character Renderer)

### Task 1: Update Storage System

**Files:**
- Modify: `src/utils/storage.ts`

- [ ] **Step 1: Update interfaces and functions**

Replace `AvatarConfig` with `OutfitSelection`. Update `GameState` to use it. Add migration logic for old saves. Replace `saveAvatars` with `saveOutfitSelection`/`loadOutfitSelection`. Update `hasSavedGame` to check `outfits !== null || visitedCheckpoints.length > 0` (so outfit selection alone counts as having a save).

```typescript
// New interfaces
export interface OutfitSelection {
  herOutfit: number;
  hisOutfit: number;
}

export interface GameState {
  outfits: OutfitSelection;
  visitedCheckpoints: string[];
  miniGameScores: Record<string, number>;
}
```

Migration: if loaded state has `avatar1` field (old format), discard avatar data, keep checkpoints/scores, default outfits to `{ herOutfit: 0, hisOutfit: 0 }`.

- [ ] **Step 2: Commit**

```bash
git add src/utils/storage.ts
git commit -m "refactor: migrate storage from AvatarConfig to OutfitSelection"
```

### Task 2: Create OffscreenCharacterRenderer

**Files:**
- Create: `src/rendering/OffscreenCharacterRenderer.ts`

- [ ] **Step 1: Implement the core renderer**

Create the `OffscreenCharacterRenderer` class with methods:
- `generateCharacterTextures(scene: Phaser.Scene, character: 'her' | 'him', outfitIndex: number, textureKey: string): void` — draws 3 unique frames on offscreen canvas, creates Phaser textures and walk animation
- `generatePreviewTexture(scene: Phaser.Scene, character: 'her' | 'him', outfitIndex: number, textureKey: string): void` — draws single frame at 300px for dressing room
- Private helper methods for each layer: `drawShadow`, `drawBackHair`, `drawBody`, `drawOutfit`, `drawArms`, `drawHead`, `drawFrontHair`, `drawHighlights`

Character definitions hardcoded:
- **Her**: 140px tall on 160x200 canvas. Hourglass shape via bezier curves. Long dark hair (#1a0a00→#2c1810). Dark brown eyes. Skin #ffe0c0.
- **Him**: 160px tall on 160x200 canvas. Athletic build, broader shoulders. Blond hair (#e8c830→#f0d860). Blue eyes (#3377dd). Skin #ffe0c0.

Canvas 2D techniques:
- `bezierCurveTo()` for body contours (hourglass waist, broad shoulders)
- `createRadialGradient()` for skin shading, eye iris
- `createLinearGradient()` for hair shine
- `shadowBlur`/`shadowColor` for soft shadows
- `globalCompositeOperation = 'multiply'` for shading, `'screen'` for highlights
- `clip()` for constraining shading/highlights within body regions

Texture creation: draw on offscreen canvas → `canvas.toDataURL('image/png')` → create Image → `scene.textures.addImage(textureKey + '-frame-' + i, img)` → register 4 animation frames (frame 2 reuses frame 0's texture) → create walk animation.

- [ ] **Step 2: Verify the build compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/rendering/OffscreenCharacterRenderer.ts
git commit -m "feat: add OffscreenCharacterRenderer with Canvas 2D rendering"
```

### Task 3: Create OutfitRenderer

**Files:**
- Create: `src/rendering/OutfitRenderer.ts`

- [ ] **Step 1: Implement outfit drawing functions**

Export an array of outfit definitions, each with a `draw(ctx: CanvasRenderingContext2D, character: 'her' | 'him', frame: number, bodyMetrics: BodyMetrics)` function.

`BodyMetrics` contains computed positions from character body (shoulder width, waist position, hip width, arm positions, leg positions) so outfits align correctly.

8 outfits per character:
0. **Casual** — her: sundress (bezier A-line shape, thin strap lines); him: t-shirt (rounded neckline) + jeans (straight leg fill)
1. **Formal** — her: cocktail dress (fitted bezier, off-shoulder lines); him: suit (lapel lines, tie rectangle)
2. **Date Night** — coordinated burgundy/gold palette for both
3. **Cozy** — her: oversized sweater (wider body fill, ribbed bottom edge) + leggings; him: hoodie (hood arc behind head) + joggers
4. **Sporty** — her: crop top + joggers; him: athletic tee + shorts
5. **Restaurant** — her: blouse + skirt; him: button-up (button dots) + chinos
6. **Pizza** — apron overlay (white rectangle with ties) over casual base
7. **Pajamas** — matching patterns, relaxed fit

Each outfit draws torso coverage, leg coverage, sleeve shapes, and details (buttons, zippers, patterns) using the same Canvas 2D bezier/gradient approach.

- [ ] **Step 2: Verify build compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/rendering/OutfitRenderer.ts
git commit -m "feat: add OutfitRenderer with 8 outfit definitions per character"
```

## Chunk 2: World & Particles

### Task 4: Create WorldRenderer

**Files:**
- Create: `src/rendering/WorldRenderer.ts`

- [ ] **Step 1: Implement world texture generation**

Create `WorldRenderer` class with methods:
- `generateGrassTile(scene)` — 32x32 grass with overlapping semi-transparent green circles for texture
- `generateDirtTile(scene)` — 32x32 dirt path with brown gradient and subtle variation
- `generateBuilding(scene, type: string)` — 256x256 building textures for each checkpoint type:
  - `restaurant`: warm brick (reddish-brown gradient), striped awning (alternating color arcs), glowing windows (yellow radial gradient), door with handle, flower boxes
  - `cafe`: cozy storefront, chalkboard sign (dark rect with chalk-colored text), warm glow, coffee cup logo (simple cup shape with steam lines)
  - `park`: large tree with layered foliage (overlapping gradient circles), bench, flowers, pond
  - `cinema`: marquee with dot lights (small circles), film decoration, purple/red scheme
  - `home`: gazebo/treehouse shape, fairy lights (small glowing dots), warm colors
  - `pizzeria`: Italian facade, red/white/green stripes, pizza sign, checkered pattern
- `generateTree(scene)` — 64x80 tree with layered gradient circles, bark texture trunk, shadow
- `generateLampPost(scene)` — lamp with warm glow (radial gradient overlay)
- `generateFlowerPatch(scene)` — clusters of small colored circles with green stem lines
- `generateFence(scene)` — decorative fence/hedge segments for placement between areas
- `generateCheckpointGlow(scene)` — improved golden glow with pulsing effect texture
- `generateCheckmark(scene)` — styled checkmark badge

For grass/dirt tiles, implement path edge blending: generate `grass-dirt-edge` tiles with gradient transition from green to brown for smooth path borders.

All drawn on offscreen canvas, converted to Phaser textures.

- [ ] **Step 2: Commit**

```bash
git add src/rendering/WorldRenderer.ts
git commit -m "feat: add WorldRenderer for environment textures"
```

### Task 5: Create ParticleConfigs

**Files:**
- Create: `src/rendering/ParticleConfigs.ts`

- [ ] **Step 1: Implement particle texture generation and configs**

Generate small particle textures on offscreen canvas:
- `leaf` — 8x8 green leaf shape (bezier)
- `steam` — 6x6 white circle with soft edges (radial gradient to transparent)
- `sparkle` — 4x4 bright white/gold star shape
- `smoke` — 10x10 gray circle with soft edges

Export Phaser particle emitter configs for each:
- `leafConfig` — slow drift, rotation, near park checkpoint
- `steamConfig` — rise upward, fade out, near cafe
- `sparkleConfig` — twinkle effect, random positions, near home
- `smokeConfig` — rise and expand, fade, near pizzeria chimney

- [ ] **Step 2: Commit**

```bash
git add src/rendering/ParticleConfigs.ts
git commit -m "feat: add ParticleConfigs for ambient particle effects"
```

## Chunk 3: Boot Scene & Dressing Room

### Task 6: Create UIRenderer

**Files:**
- Create: `src/rendering/UIRenderer.ts`

- [ ] **Step 1: Implement shared UI helper functions**

Export utility functions for consistent UI across all scenes:
- `createStyledButton(scene, x, y, text, options?)` — rounded rectangle button with hover/press states, warm gold/purple theme
- `createPanel(scene, x, y, w, h, options?)` — rounded rect container with soft drop shadow
- `createStyledText(scene, x, y, text, style?)` — text with consistent typography defaults
- `addFadeTransition(scene, duration?)` — camera fade in/out helper
- Color constants: `UI_COLORS = { gold: '#ffd700', purple: '#7c3aed', cream: '#fff8f0', dark: '#1a1a2e', text: '#ffffff', muted: '#94a3b8' }`

- [ ] **Step 2: Commit**

```bash
git add src/rendering/UIRenderer.ts
git commit -m "feat: add UIRenderer with shared UI components"
```

### Task 7: Rewrite BootScene

**Files:**
- Modify: `src/scenes/BootScene.ts`

- [ ] **Step 1: Replace texture generation with new renderers**

Rewrite `BootScene` to:
1. Show a custom loading bar (Phaser Graphics-drawn, manually updated)
2. Use `WorldRenderer` to generate all environment textures (grass, dirt, buildings, trees, lamp posts, checkpoint glow, checkmark)
3. Use `OffscreenCharacterRenderer` to generate all character textures:
   - 2 characters × 8 outfits × 3 unique frames = 48 draws → 64 frame textures
   - 2 characters × 8 outfits = 16 preview textures at 300px
4. Generate particle textures from `ParticleConfigs`
5. Update loading bar progress after each batch
6. Remove old `generatePlaceholderTextures()` method entirely
7. Remove import of old `CharacterRenderer`

- [ ] **Step 2: Verify build and run**

```bash
npm run dev
```
Open browser, verify loading bar shows, textures load, game boots to menu.

- [ ] **Step 3: Commit**

```bash
git add src/scenes/BootScene.ts
git commit -m "feat: rewrite BootScene with new rendering pipeline"
```

### Task 8: Create DressingRoomScene (replace AvatarScene)

**Files:**
- Create: `src/scenes/DressingRoomScene.ts`
- Delete: `src/scenes/AvatarScene.ts`
- Modify: `src/main.ts` (import + scene list)

- [ ] **Step 1: Create DressingRoomScene**

Scene key: `'DressingRoomScene'`

Layout:
- Gradient backdrop (linear gradient from dark purple to dark blue)
- Large character preview center (300px height) using pre-rendered preview textures
- Floor reflection: flipped copy of preview at reduced alpha below
- Character name label above: "Her" / "Him"
- Horizontal outfit carousel below: row of small outfit thumbnail rectangles with name labels, scrollable with arrows
- Left/right arrow buttons for outfit navigation
- "Switch Character" button to toggle between her/him (slide transition)
- "Ready" button (always enabled, defaults Casual)

State management:
- Load outfit selection from storage (or defaults)
- On outfit change: swap preview texture key, crossfade transition
- On character switch: slide transition
- On Ready: save outfits to storage, start/resume WorldScene

Handle `fromWorld` param like current AvatarScene does.

- [ ] **Step 2: Update main.ts**

Replace `AvatarScene` import with `DressingRoomScene`. Update scene array.

- [ ] **Step 3: Delete old AvatarScene and unused rendering files**

Delete `src/scenes/AvatarScene.ts`, `src/rendering/CharacterRenderer.ts`, `src/rendering/colorUtils.ts`.

- [ ] **Step 4: Verify build and run**

```bash
npm run dev
```
Click "New Game", verify dressing room shows with character preview and outfit carousel.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: replace AvatarScene with DressingRoomScene"
```

## Chunk 4: World Scene & Menu Upgrade

### Task 9: Upgrade WorldScene

**Files:**
- Modify: `src/scenes/WorldScene.ts`

- [ ] **Step 1: Update character creation**

Replace `generateCharacterSpritesheet` calls with references to pre-rendered textures from BootScene. Characters use texture keys like `'her-outfit-0'` and `'him-outfit-0'`. Load outfit selection from storage to pick correct texture. Set sprite scale to 0.4 (display ~64px from 160px render). Update physics body size/offset for new sprite dimensions. Update animation references.

- [ ] **Step 2: Update building creation**

Replace `'building'` texture with per-checkpoint building textures (`'building-restaurant'`, `'building-cafe'`, etc.). Adjust building positions/sizes for larger textures (~128-192px display). Update checkpoint zone sizes accordingly. Add lamp post sprites along paths. Update tree texture references.

- [ ] **Step 3: Add decorative elements**

Add flower patches, decorative fences/hedges between areas, and path edge tiles for smooth grass-to-dirt transitions. Place lamp posts along dirt paths.

- [ ] **Step 4: Add particle emitters**

Import `ParticleConfigs`. Add particle emitters at checkpoint locations:
- Leaves near park
- Steam near cafe
- Sparkles near home
- Smoke near pizzeria

- [ ] **Step 5: Add ambient lighting**

Add warm vignette overlay (dark gradient rectangle at camera edges, fixed to camera). Add warm glow sprites near each building (radial gradient texture, low alpha).

- [ ] **Step 6: Update scene references**

Replace `'AvatarScene'` with `'DressingRoomScene'` in settings button handler (line 161). Update `applyAvatarTints` to `applyOutfitChange` — loads outfit selection, swaps texture keys.

- [ ] **Step 7: Update UI elements**

Style the progress text, settings button, fullscreen button with rounded backgrounds and consistent colors from `UIRenderer`. Style the prompt text and completion overlay with new design language.

- [ ] **Step 8: Add location-based outfit auto-apply**

In `checkCheckpointOverlap`, when entering restaurant/pizzeria checkpoint zone, swap character texture to location outfit (index 5 for restaurant, 6 for pizza). On exit, revert to player-selected outfit. Use texture key swap (no re-render needed).

- [ ] **Step 9: Add checkpoint entry camera zoom**

When entering a checkpoint zone, briefly zoom the camera in slightly (1.5 → 1.7 over 300ms) and add subtle fade overlay. Reset zoom on exit.

- [ ] **Step 10: Verify and commit**

```bash
npm run dev
```
Walk around the map, verify buildings look detailed, particles animate, characters render correctly.

```bash
git add src/scenes/WorldScene.ts
git commit -m "feat: upgrade WorldScene with new graphics, particles, lighting"
```

### Task 10: Upgrade MenuScene

**Files:**
- Modify: `src/scenes/MenuScene.ts`

- [ ] **Step 1: Visual upgrade**

- Add animated gradient background (slowly shifting colors via tween or shader)
- Style title "Our Places" with larger font, warm gold color, slight shadow
- Add decorative heart or couple silhouette element (drawn with Graphics API)
- Style buttons using `UIRenderer.createStyledButton` with rounded backgrounds, hover/press animations
- Add floating particle effect (sparkles or hearts) in background
- Add camera fade-in on scene start
- Update `'AvatarScene'` reference to `'DressingRoomScene'`

- [ ] **Step 2: Verify and commit**

```bash
npm run dev
```
Verify menu looks polished with animated background and styled buttons.

```bash
git add src/scenes/MenuScene.ts
git commit -m "feat: upgrade MenuScene with polished visuals"
```

## Chunk 5: Memory Card & Mini-Game UI Polish

### Task 11: Upgrade MemoryCard

**Files:**
- Modify: `src/scenes/checkpoints/MemoryCard.ts`

- [ ] **Step 1: Visual upgrade**

- Dark overlay at 60% opacity (already 0.7, adjust to 0.6)
- Card container: rounded rectangle with decorative border, ornate corner elements (small L-shaped lines or dots at corners), warm cream background (#fff8f0)
- Photo frame: inner shadow border, slightly inset
- Text: warm typography, location name in gold, message in cream with italic
- Close button: styled circular button with X
- Entry animation: card starts at scale 0 and tweens to scale 1 with slight bounce (Phaser tween with `ease: 'Back.easeOut'`)
- Add scene fade-in

- [ ] **Step 2: Commit**

```bash
git add src/scenes/checkpoints/MemoryCard.ts
git commit -m "feat: upgrade MemoryCard with polished card UI"
```

### Task 12: Upgrade Mini-Game UIs

**Files:**
- Modify: `src/scenes/checkpoints/QuizGame.ts`
- Modify: `src/scenes/checkpoints/CatchGame.ts`
- Modify: `src/scenes/checkpoints/MatchGame.ts`
- Modify: `src/scenes/checkpoints/PuzzleGame.ts`
- Modify: `src/scenes/checkpoints/CookingGame.ts`

- [ ] **Step 1: QuizGame polish**

- Styled background with subtle gradient
- Question progress in pill-shaped container
- Answer buttons with rounded backgrounds, hover animations
- Results screen in styled panel
- Scene scale-in transition (start at 0.8 scale, tween to 1.0)

- [ ] **Step 2: CatchGame polish**

- Score/miss counters in pill containers (top bar)
- Basket with gradient fill and shadow
- Falling items with glow effect
- Game-over panel styled consistently
- Scene fade-in

- [ ] **Step 3: MatchGame polish**

- Cards with rounded corners and smooth flip animation (tween scaleX 1→0→1 with texture swap at midpoint)
- Matched cards glow green
- Moves counter in pill container
- Results panel styled
- Scene fade-in

- [ ] **Step 4: PuzzleGame polish**

- Tiles with rounded corners, gradient fills
- Drag shadow effect
- Timer display in styled container
- Results panel styled
- Scene fade-in

- [ ] **Step 5: CookingGame polish**

- Order display in styled card panel
- Item shelf with icon-like buttons, rounded
- Selected tray visual (small item chips)
- Timer with color change (green→yellow→red as time runs out)
- Results panel styled
- Scene fade-in

- [ ] **Step 6: Add consistent quit button styling across all games**

All 5 games get the same styled circular X button (from UIRenderer) instead of raw text.

- [ ] **Step 7: Verify and commit**

```bash
npm run dev
```
Play each mini-game, verify UI is polished and consistent.

```bash
git add src/scenes/checkpoints/
git commit -m "feat: polish all mini-game UIs with consistent design language"
```

## Chunk 6: Cleanup & Final Integration

### Task 13: Remove pixelArt mode and final cleanup

**Files:**
- Modify: `src/main.ts`

- [ ] **Step 1: Update game config**

Remove `pixelArt: true` from config (we want smooth rendering now, not crispy pixels). Verify all scene imports are correct.

- [ ] **Step 2: Final integration test**

```bash
npm run dev
```
Full playthrough: Menu → Dressing Room → World → visit all checkpoints → play mini-games → completion screen. Verify:
- Characters render beautifully with correct appearance (her: dark hair, hourglass; him: blond, blue eyes, taller)
- Outfit changes work in dressing room
- World has detailed buildings, trees, particles
- Location outfits auto-apply at restaurant/pizzeria
- All mini-games play correctly with polished UI
- Completion overlay looks good
- Settings button opens dressing room and returns correctly

- [ ] **Step 3: Build check**

```bash
npm run build
```
Verify production build succeeds with no errors.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: remove pixelArt mode, final integration cleanup"
```
