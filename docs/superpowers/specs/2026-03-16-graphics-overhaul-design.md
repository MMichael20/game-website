# Graphics Overhaul Design Spec

## Overview

Complete visual overhaul of the "Our Places" couples game. Replace the current 48px procedural stick-figure characters with high-fidelity 160px characters rendered via offscreen Canvas 2D API. Upgrade world environment, UI, and all visual elements to match.

## Approach

**Offscreen Canvas Pre-rendering (Approach 2)**

Use HTML5 Canvas 2D API (separate from Phaser) to pre-render high-quality textures at startup, then load them into Phaser as sprite textures. This gives access to full Canvas2D power — complex paths, compositing modes, filters, gradient meshes — while keeping everything procedural (no external image files).

## 1. Character Rendering System

### Architecture

A new `OffscreenCharacterRenderer` class replaces the current `CharacterRenderer`. It uses an offscreen `<canvas>` element with the 2D context to draw characters, then converts to Phaser textures via `textures.addImage()` using `canvas.toDataURL()` (each frame gets its own canvas, converted to an image, then discarded — avoids Phaser's `addCanvas` reference-holding issues).

### Pre-defined Characters

Characters are no longer customizable in appearance — they are hardcoded. Only outfits are changeable.

**Her:**
- Hourglass body shape — defined waist, curved hips and bust
- Long flowing dark hair (#1a0a00 to #2c1810 gradient) past shoulders
- Dark brown eyes with shine highlights
- Height: ~140px in spritesheet
- Soft facial features, small nose, subtle lip color

**Him:**
- Athletic build — broad shoulders, defined torso, straight hips
- Short-medium blond hair (#e8c830 to #f0d860 gradient), slightly tousled
- Blue eyes (#3377dd) with white shine dots
- Height: ~160px in spritesheet
- Stronger jawline

### Rendering Layers (bottom to top)

1. Drop shadow (blurred ellipse beneath feet)
2. Back hair (for her — long hair behind body)
3. Body base (skin tone with gradient shading)
4. Outfit layer (the customizable part)
5. Arms (with outfit sleeves, skin-toned hands)
6. Neck + Head with facial features (eyes, nose, mouth)
7. Front hair (bangs, side framing)
8. Highlights pass (rim lighting, shine on hair/eyes)

### Character Size & World Scale

Characters are rendered at high resolution (him: 160px tall, her: 140px tall on a 160x200px canvas) but displayed in-world at a scaled-down size to fit the tile grid. The world uses 32px tiles on a 40x30 map (1280x960). Characters display at ~64px tall in-world (scale factor ~0.4), which makes them ~2 tiles tall — proportional to the buildings which will also be scaled up from current sizes. The high-res rendering ensures crisp visuals even at the smaller display size (supersampling).

Buildings are pre-rendered at ~200-300px and displayed at ~128-192px in-world (4-6 tiles), up from the current ~64px. The map dimensions stay the same but buildings take up more visual space with proper detail.

### Animation Frames

4 frames per character per outfit for walk cycle. Frames 0 and 2 are both neutral stance — they share the same drawing logic (rendered once, duplicated to both frame slots).
- Frame 0: Neutral stance
- Frame 1: Left step (left leg forward, right arm forward)
- Frame 2: Neutral stance (same as frame 0)
- Frame 3: Right step (right leg forward, left arm forward)

Each outfit variant generates its own 4-frame spritesheet texture (3 unique draws per outfit, frame 0 reused for frame 2).

### Canvas 2D Techniques

- `createRadialGradient()` for skin shading, eye iris detail
- `createLinearGradient()` for hair shine, clothing folds
- `shadowBlur` + `shadowColor` for soft drop shadows
- `globalCompositeOperation = 'multiply'` for shading layers
- `globalCompositeOperation = 'screen'` for highlight/rim light
- `bezierCurveTo()` for body contours, hair flow, clothing curves
- `clip()` for constraining shading within body regions

## 2. Outfit System

### Outfit List

8 complete outfits per character. Each outfit is a rendering function that draws clothing onto the character canvas between body base and arms layers.

**Her outfits:**
1. Casual — sundress with thin straps, knee length
2. Formal — fitted cocktail dress, off-shoulder
3. Date night — matching couple outfit (coordinated colors with his)
4. Cozy — oversized sweater + leggings
5. Sporty — crop top + joggers
6. Location: Restaurant — elegant blouse + skirt
7. Location: Pizza — cute apron over casual
8. Bonus: Pajamas — matching PJ set

**His outfits:**
1. Casual — t-shirt + jeans
2. Formal — fitted suit + tie
3. Date night — matching with her (coordinated colors)
4. Cozy — hoodie + joggers
5. Sporty — athletic tee + shorts
6. Location: Restaurant — button-up + chinos
7. Location: Pizza — apron over casual
8. Bonus: Pajamas — matching PJ set

### Outfit Rendering

Each outfit defines:
- Torso shape and coverage (tank top vs long sleeve vs off-shoulder)
- Leg covering (skirt, pants, shorts, leggings)
- Sleeve style (none, short, long, rolled)
- Color palette (primary, secondary, accent)
- Details (buttons, zippers, patterns, collars, belts)

Outfits are drawn using the same Canvas 2D bezier/gradient techniques as the body.

### Outfit Application

- Manual outfits: selected in the dressing room before gameplay
- Location outfits: auto-apply when entering specific checkpoints (restaurant, pizza). The outfit reverts to the player's selected outfit when leaving the checkpoint zone. Auto-apply is purely visual — does not persist to storage.
- Auto-apply uses a quick fade transition on the character sprite (swap texture key, no re-render needed since all outfit textures are pre-rendered at boot)

## 3. Dressing Room Screen (replaces AvatarScene)

### Layout

- Large character preview center screen (~300px display height) on soft gradient backdrop. The preview is a dedicated high-res render at 300px (not a scaled-up 160px texture) for crisp dressing room visuals.
- Subtle floor reflection beneath character (flipped, faded copy)
- Character label above preview
- Horizontal outfit carousel below — scrollable outfit thumbnails with names
- Left/right navigation arrows
- "Switch Character" button to toggle between her and him
- "Ready" button to confirm selections and start/resume the game (always enabled — defaults to Casual if player doesn't change anything)

### Visual Style

- Soft, warm UI — rounded panel containers
- Pastel accent colors, subtle shadows
- Outfit switch: smooth crossfade transition on the character preview
- Character switch: slide transition (current slides out, other slides in)

### State

- Selected outfits persist to localStorage (same storage system as current game)
- Default outfit: Casual (#1) for both characters

### Storage Migration

The current `AvatarConfig` interface stores `{ hair, hairColor, skin, outfit, accessory }` per character. This is replaced with a simpler `OutfitSelection` interface: `{ herOutfit: number, hisOutfit: number }` (outfit index 0-7).

Migration strategy:
- On load, check if saved data has the old `AvatarConfig` shape (has `hair` field)
- If old format found: discard avatar config, keep all other game state (checkpoint progress, etc.), default both outfits to 0 (Casual)
- `hasSavedGame()` continues to work — it checks for checkpoint progress, not avatar data
- The `storage.ts` functions `saveAvatarConfig` / `loadAvatarConfig` are replaced with `saveOutfitSelection` / `loadOutfitSelection`

## 4. World & Environment Upgrade

### Ground

- Subtle grass texture using overlapping semi-transparent circles in varying greens
- Dirt paths between locations with worn texture (brown gradient with noise-like variation)
- Path edges softened with grass-to-dirt gradient blending

### Buildings

Each of the 6 checkpoint buildings pre-rendered with depth and detail:

- **Restaurant:** Warm brick facade, awning with stripes, glowing windows (warm yellow), door with handle, "OPEN" sign, flower boxes
- **Coffee Shop:** Cozy storefront, chalkboard sign, steam particles rising, warm interior glow, coffee cup logo
- **The Park:** Open green area, large tree with layered foliage (overlapping gradient circles), park bench, flower patches, small pond with reflection
- **Movie Night Spot:** Cinema-style facade, marquee with lights, film reel decoration, dark purple/red color scheme
- **Happy Place:** Whimsical design — could be a gazebo or treehouse, fairy lights (glowing dots), warm inviting colors, sparkle particles
- **Luigi's Pizza:** Italian-style facade, red/white/green color scheme, pizza sign, checkered detail, chimney with smoke particles

### Building Rendering Technique

Each building drawn on offscreen canvas with:
- Base structure with gradient fills (not flat colors)
- Shadow casting (dark gradient at base extending outward)
- Window details with inner glow effect
- Decorative elements (signs, flowers, lights)
- Depth through overlapping layers and shadow

### Ambient Elements

- Trees: layered overlapping circles with green gradient fills, color variation per circle, trunk with bark texture, cast shadow
- Lamp posts: along paths, with warm glow circle (radial gradient, low opacity)
- Flower patches: clusters of small colored circles with green stem lines
- Decorative fences/hedges between areas

### Particles (Phaser particle system)

- Floating leaves near the park (slow drift, rotation)
- Steam wisps near coffee shop (rising, fading)
- Sparkles near happy place (twinkling, random positions)
- Smoke from pizza chimney (rising, expanding, fading)

### Lighting

- Warm ambient vignette on camera edges (dark corners, bright center)
- Each building emits a subtle warm glow (radial gradient overlay)
- Overall color palette: warm, romantic, inviting

## 5. UI Overhaul

### Design Language

- Rounded rectangles with soft drop shadows for all panels/containers
- Color palette: warm golds (#ffd700), soft purples (#7c3aed), cream whites (#fff8f0), dark backgrounds (#1a1a2e)
- Typography: clean sans-serif, title text larger with slight letter spacing
- Consistent padding and spacing throughout
- Hover states: subtle scale + brightness increase
- Press states: slight inward shadow + scale down

### Main Menu (MenuScene)

- Game title with decorative styling (gradient text or outlined)
- "New Game" and "Continue" as styled buttons with icons
- Soft animated background (slow gradient shift or floating particles)
- Couple silhouette or heart motif as decorative element

### Memory Cards

- Styled card container with decorative border (ornate frame corners)
- Photo area with subtle inner shadow frame
- Text area with warm background, readable typography
- Close button styled consistently
- Dark semi-transparent overlay behind card (no blur — just darken the game world with a black overlay at ~60% opacity)
- Entry animation: card scales up from center with slight bounce

### Mini-Game UI

- Score/timer displays in styled pill-shaped containers
- Buttons with consistent styling (rounded, colored, hover/press states)
- Game-over / completion screens with styled panels
- Progress indicators where applicable

### Transitions

- Scene transitions: fade to black (or warm color) and back
- Checkpoint entry: camera zooms slightly, fade overlay
- Memory card: dark overlay + card scale-in animation
- Mini-game start: slide-in from side or scale-in

## 6. Technical Architecture

### New Files

- `src/rendering/OffscreenCharacterRenderer.ts` — new character rendering system
- `src/rendering/OutfitRenderer.ts` — outfit drawing functions
- `src/rendering/WorldRenderer.ts` — building and environment rendering
- `src/rendering/UIRenderer.ts` — shared UI component rendering helpers
- `src/rendering/ParticleConfigs.ts` — particle system configurations

### Modified Files

- `src/scenes/BootScene.ts` — use new renderers for texture generation
- `src/scenes/AvatarScene.ts` — renamed to `DressingRoomScene.ts`, scene key updated from `'AvatarScene'` to `'DressingRoomScene'` in both the Phaser game config (`main.ts`) and all scene references (`WorldScene.ts` line 161, etc.)
- `src/scenes/WorldScene.ts` — use new world textures, add particles, lighting
- `src/scenes/MenuScene.ts` — visual upgrade
- `src/scenes/checkpoints/MemoryCard.ts` — styled card UI
- `src/scenes/checkpoints/*.ts` — all mini-games get UI polish
- `src/rendering/CharacterRenderer.ts` — replaced by OffscreenCharacterRenderer
- `src/utils/storage.ts` — update to store outfit selection instead of full avatar config

### Removed Files

- `src/rendering/CharacterRenderer.ts` — replaced entirely by OffscreenCharacterRenderer
- `src/rendering/colorUtils.ts` — no longer needed; the new renderer uses Canvas 2D native gradients instead of Phaser color manipulation utilities

### Rendering Pipeline

1. BootScene creates OffscreenCharacterRenderer and WorldRenderer
2. Show a custom loading bar (Phaser Graphics-drawn progress bar, updated manually as each texture completes — not tied to `this.load` events since rendering is synchronous Canvas work)
3. For each character × each outfit × 3 unique frames (frame 0 reused for frame 2):
   a. Create offscreen canvas (160x200px)
   b. Draw layers bottom-to-top using Canvas 2D API
   c. Convert to image via `canvas.toDataURL()`, load into Phaser via `textures.addImage()`
   d. Register animation frames (4 frames, frame 2 = frame 0)
   e. Update loading bar progress
4. Generate particle textures (small circles/shapes for leaves, steam, sparkles, smoke) — ~4 tiny canvases
5. WorldRenderer pre-renders all building/environment textures similarly
6. Generate dressing room preview textures at 300px height (2 characters × 8 outfits = 16 preview textures)
7. Game proceeds with all textures ready

Estimated boot time: ~1-2 seconds on desktop, ~2-4 seconds on mobile (total: ~84 character textures + 16 previews + ~10 building textures + particles).

### Performance Considerations

- Pre-rendering happens once at boot — slight initial load time increase
- Runtime performance is the same as before (just sprite rendering)
- Canvas size per character frame: ~160x200px — negligible memory
- Total textures: 2 characters × 8 outfits × 4 frames = 64 in-game character frames + 16 dressing room previews + ~10 building textures + ~4 particle textures + UI elements (~94 total)
- Estimated total texture memory: < 5MB

### Compatibility

- OffscreenCanvas API: widely supported, fallback to regular canvas element if needed
- Canvas 2D API: universal browser support
- No new dependencies required
