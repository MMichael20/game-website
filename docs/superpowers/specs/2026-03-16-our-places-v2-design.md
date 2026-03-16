# Our Places v2 — Complete Rebuild Design Spec

## Overview

A complete rebuild of "Our Places" — a couples' exploration game where two characters explore a cozy pixel art village, visit romantic locations, and play mini-games together. The rebuild addresses the fundamental issues with the current version: broken UI popups, poor responsive behavior, low-quality procedural graphics, and accumulated architectural debt.

## Core Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Engine | Phaser 3 + TypeScript + Vite | Proven stack, problems were in code not framework |
| Visual style | Pixel art (32×32 tiles) | Consistent, scales well, AI-generatable, fits genre |
| Asset strategy | Hybrid — real sprites + procedural sky/particles | Best of both worlds |
| UI system | HTML/CSS overlay | Eliminates popup/responsive bugs entirely |
| Map design | Small but dense | 3 locations, visually rich, no empty filler space |
| Mini-games (MVP) | Quiz, Catch, Match | 1 cerebral + 1 action + 1 memory |
| Dressing room | Keep | Core feature, outfit selection for both characters |

## Architecture

### Project Structure

```
src/
├── main.ts                      # Phaser game config + bootstrap + UIManager init
├── game/
│   ├── scenes/
│   │   ├── BootScene.ts         # Asset loading with progress bar
│   │   ├── WorldScene.ts        # Main exploration scene
│   │   ├── DressingRoomScene.ts # Outfit selection (Phaser-rendered previews)
│   │   └── minigames/
│   │       ├── QuizScene.ts     # Q&A mini-game
│   │       ├── CatchScene.ts    # Falling object catch game
│   │       └── MatchScene.ts    # Card pair matching
│   ├── entities/
│   │   ├── Player.ts            # Player character (movement, animation)
│   │   ├── Partner.ts           # Partner follow logic
│   │   └── NPC.ts               # NPC with schedule/behavior
│   ├── systems/
│   │   ├── InputSystem.ts       # Unified keyboard + touch input
│   │   ├── NPCSystem.ts         # NPC scheduling, pathfinding
│   │   └── SaveSystem.ts        # localStorage persistence
│   ├── rendering/
│   │   ├── SkyRenderer.ts       # Procedural sky, clouds, parallax
│   │   └── ParticleEffects.ts   # Petals, sparkles, ambient particles
│   └── data/
│       ├── mapLayout.ts         # Tile map, NPC positions, paths, walkability grid
│       └── checkpoints.ts       # Typed checkpoint definitions (imports JSON)
├── ui/
│   ├── UIManager.ts             # Bridge between Phaser scenes and DOM UI
│   ├── components/
│   │   ├── MainMenu.ts          # Title screen menu
│   │   ├── SettingsPanel.ts     # Settings overlay
│   │   ├── HUD.ts               # Progress, interaction prompts
│   │   ├── Dialog.ts            # Generic popup/dialog
│   │   ├── MinigameOverlay.ts   # Score display, timer, results
│   │   ├── DressingRoomUI.ts    # Outfit picker DOM elements
│   │   └── CompletionScreen.ts  # End-game celebration
│   └── styles/
│       ├── base.css             # Reset, variables, typography
│       ├── hud.css              # In-game HUD styles
│       ├── menus.css            # Menu and dialog styles
│       └── minigames.css        # Mini-game overlay styles
├── assets/
│   ├── sprites/
│   │   ├── characters/          # Player, partner sprite sheets (walk cycles, outfits)
│   │   ├── npcs/                # NPC sprite sheets
│   │   └── items/               # Mini-game items, collectibles
│   ├── tiles/
│   │   ├── terrain.png          # Grass, dirt, stone, water tileset
│   │   └── buildings.png        # Building tileset (restaurant, park, cinema)
│   ├── ui/
│   │   └── icons.png            # UI icons (checkpoint markers, buttons)
│   └── audio/                   # Background music, SFX (optional, future)
└── utils/
    ├── constants.ts             # Game dimensions, colors, config
    └── helpers.ts               # Shared utility functions
```

### Key Architecture Principles

1. **Phaser renders ONLY the game world** — tiles, sprites, sky, particles. No UI in Phaser.
2. **HTML/CSS handles ALL UI** — menus, popups, HUD, dialogs, mini-game overlays. Responsive by default.
3. **UIManager is a module-level singleton** — instantiated and exported from `UIManager.ts`. Scenes access it via `import { uiManager } from '../ui/UIManager'`. Initialized in `main.ts` before the Phaser game is created.
4. **Entities own their behavior** — Player, Partner, NPC are self-contained classes with their own update loops, not scattered logic across scenes.
5. **Data-driven checkpoints** — mini-game configs live in data files, scenes read them. Adding a new checkpoint = adding data, not new scene code (mini-game scenes are reusable).
6. **Target ~300 lines per file** — extract logic into entities/systems when scenes grow. WorldScene will realistically be 300-400 lines even with good extraction; that's acceptable.

## UI System (HTML/CSS Overlay)

### How It Works

The Phaser canvas lives inside a container div. UI elements are absolutely positioned divs layered on top of the canvas. CSS handles all layout, responsiveness, animations, and theming.

```html
<div id="game-container">
  <canvas id="game-canvas"></canvas>  <!-- Phaser renders here -->
  <div id="ui-layer">                 <!-- All UI lives here -->
    <div id="hud"></div>
    <div id="dialog-container"></div>
    <div id="menu-container"></div>
  </div>
</div>
```

### UIManager API

```typescript
// Module-level singleton, exported from UIManager.ts
// Initialized in main.ts: uiManager.init(document.getElementById('ui-layer'))
// All scenes import: import { uiManager } from '../ui/UIManager'

class UIManager {
  init(container: HTMLElement): void;
  showMainMenu(onNewGame: () => void, onContinue: () => void): void;
  hideMainMenu(): void;
  showHUD(checkpoints: CheckpointStatus[]): void;
  updateHUD(checkpoints: CheckpointStatus[]): void;
  hideHUD(): void;
  showInteractionPrompt(text: string): void;
  hideInteractionPrompt(): void;
  showDialog(config: DialogConfig): void;
  hideDialog(): void;
  showMinigameOverlay(config: MinigameOverlayConfig): void;
  updateMinigameOverlay(data: Partial<MinigameOverlayConfig>): void;
  hideMinigameOverlay(): void;
  showCompletionScreen(scores: Record<string, number>): void;
  showSettings(config: SettingsConfig): void;
  showDressingRoom(config: DressingRoomConfig): void;
  hideDressingRoom(): void;
}

export const uiManager = new UIManager();
```

### Theming

CSS custom properties for consistent styling:

```css
:root {
  --color-primary: #d4a574;      /* Warm gold */
  --color-secondary: #7b5ea7;    /* Soft purple */
  --color-bg: #fdf6e3;           /* Warm cream */
  --color-text: #3c3c3c;         /* Dark gray */
  --color-accent: #e8836b;       /* Coral accent */
  --font-display: 'Press Start 2P', monospace;  /* Pixel font for headers */
  --font-body: 'Inter', sans-serif;              /* Clean font for body text */
  --radius: 8px;
  --shadow: 0 4px 12px rgba(0,0,0,0.15);
}
```

### Responsive Strategy

- Mobile-first CSS with breakpoints at 480px, 768px, 1024px
- HUD uses `position: fixed` with percentage-based positioning
- Dialogs use `max-width: min(90vw, 400px)` — never overflow
- Touch targets minimum 44×44px
- Font sizes use `clamp()` for fluid scaling

## Game World

### Map

- **Size:** 30×24 tiles (960×768px at 32px/tile) — compact, no wasted space
- **Tileset:** Pixel art terrain (grass variants, dirt paths, stone walkways, flower patches)
- **Tile rendering:** Programmatic placement from a single tileset atlas (not Tiled JSON). `mapLayout.ts` defines tile indices per cell; Phaser creates sprites/images from the atlas at init time.
- **Walkability grid:** `mapLayout.ts` includes a 30×24 boolean grid marking which tiles are passable. Buildings, water, and dense decorations are impassable. This grid is used for NPC pathfinding and player collision detection.
- **3 checkpoint locations:** Restaurant, Park, Cinema — each with distinct visual identity
- **Ambient details:** Benches, lamp posts, fountains, flower beds, trees, fences, mailboxes
- **NPCs:** 4-6 ambient NPCs with simple schedules (walking, sitting, standing)

### Locations

| Location | Visual Theme | Mini-game | Vibe |
|----------|-------------|-----------|------|
| Restaurant | Warm interior glow, outdoor seating, string lights | Quiz | Romantic dinner |
| Park | Trees, pond, flowers, bench, bridge | Catch | Playful afternoon |
| Cinema | Marquee sign, ticket booth, movie posters | Match | Fun date night |

### Camera

- Fixed zoom level per device class (no dynamic zoom formulas that break). These are starting values — tune during testing:
  - Desktop: 2x zoom
  - Tablet: 1.75x
  - Phone: 1.5x
- Device class detected via `window.innerWidth`: <768 = phone, <1024 = tablet, else desktop
- Camera follows player with smooth lerp, clamped to map bounds
- Sky/cloud layers use `setScrollFactor()` for parallax — this is intentional parallax, not a UI hack

### Characters

- **Player & Partner:** 32×32 pixel art sprites with 4-direction walk animations (3 frames each)
- **8 outfit variations** per character (same as current: casual, formal, beach, winter, gothic, sporty, festival, elegant)
- Each outfit = separate sprite sheet row or individual sheet
- Partner follows player with position history queue + lerp smoothing. Key fixes from v1 incorporated:
  - Lerp-based approach when <20px from target (no oscillation)
  - Snap to position when <6px (no jitter)
  - Deceleration curve, not abrupt stop
- Breathing animation: subtle 1-2px vertical bob (pixel art style, not scale transform)

### NPCs

- 32×32 pixel art sprites, 2-3 unique NPC designs
- Simple state machine: `idle | walking | sitting`
- Schedule-based transitions with smooth fade+move tweens (no teleporting — v1 bug fix incorporated)
- BFS pathfinding on the walkability grid

## Scene Lifecycle

Mini-games run as separate Phaser scenes. The transition strategy:

1. **Entering a mini-game:** `scene.switch('QuizScene', { checkpointId })` — this stops WorldScene and starts the mini-game scene. Player position is saved to SaveSystem before switching.
2. **Exiting a mini-game:** `scene.switch('WorldScene')` — WorldScene re-initializes, reads player position from SaveSystem, restores state.
3. **Why `switch` not `launch`:** Since all UI is in the DOM (not Phaser), we don't need WorldScene alive for HUD visibility. `switch` is cleaner — no sleeping scenes consuming memory, no camera conflicts between scenes.
4. **WorldScene rebuild cost:** Minimal. Tile placement from data is fast. Sky/particles reinitialize in <100ms. The only "expensive" part is asset loading, which is already done in BootScene.

### Scene Flow

```
BootScene → MainMenu (DOM) → DressingRoomScene → WorldScene ↔ Mini-game Scenes
                                                       ↓
                                                CompletionScreen (DOM)
```

## Mini-Games

All mini-games run as separate Phaser scenes. Mini-game **UI** (score, timer, instructions, results) is all HTML/CSS via `MinigameOverlay`.

### Quiz (Restaurant)

- Question displayed in DOM overlay
- 4 answer buttons (DOM)
- Score counter and progress indicator (DOM)
- Phaser scene shows a cozy restaurant background
- Correct/wrong feedback animations (CSS transitions + Phaser particle burst)

### Catch (Park)

- Items fall from top of Phaser scene (sprites)
- Player-controlled basket/net moves left-right (Phaser sprite, keyboard/touch)
- Score and timer in DOM overlay
- Increasing difficulty (faster items, more variety)
- Park background with trees, falling petals (Phaser)

### Match (Cinema)

- Card grid rendered in Phaser (sprite-based cards with flip animation)
- Cards show pixel art icons (movie-themed: popcorn, ticket, clapperboard, etc.)
- Move counter and timer in DOM overlay
- Responsive grid: 4×3 on desktop, 3×4 on portrait mobile

## Dressing Room

### Layout Strategy

The DressingRoomScene uses a split layout to coordinate Phaser rendering with DOM controls:

- **Phaser canvas:** Renders character previews in the upper 60% of the viewport. Two characters side by side, animated with current outfit, centered horizontally.
- **DOM overlay (DressingRoomUI):** Positioned in the lower 40% of the viewport via CSS. Contains outfit name, left/right arrows, and "Start Adventure" button. Uses `position: absolute; bottom: 0; width: 100%` within the ui-layer.
- **Coordination:** DressingRoomScene emits events (`outfit-changed`) that the DOM UI listens to for updating outfit names. DOM button clicks emit events that the scene listens to for cycling outfits and starting the game.
- Left/right arrows or swipe to cycle outfits
- "Start" button confirms selection and transitions to WorldScene

## Procedural Rendering (Kept from v1)

### Sky System

- Gradient background (time-of-day palette: dawn → day → dusk → night)
- 2-3 cloud layers with parallax scrolling (`setScrollFactor(0.05, 0.15, 0.3)`)
- Sun/moon position based on game time
- Stars at night (twinkle animation)

### Particle Effects

- **Petals** — drift across screen near park
- **Sparkles** — on checkpoint interaction
- **Leaves** — ambient near trees
- Particle configs as data objects, not hardcoded

## Data Files

### checkpoints.ts

```typescript
// Typed wrapper around checkpoint data
import checkpointData from './checkpoints.json';

export interface Checkpoint {
  id: string;
  name: string;
  icon: string;
  miniGame: {
    type: 'quiz' | 'catch' | 'match';
    config: QuizConfig | CatchConfig | MatchConfig;
  };
}

// MVP checkpoints only — cafe, home, pizzeria are deferred to post-MVP
export const CHECKPOINTS: Checkpoint[] = checkpointData.checkpoints
  .filter(cp => ['restaurant', 'park', 'cinema'].includes(cp.id) && cp.miniGame != null)
  .map(cp => ({ ...cp, miniGame: cp.miniGame! }));

export const VALID_CHECKPOINT_IDS = CHECKPOINTS.map(cp => cp.id);
```

### checkpoints.json

Updated to remove null mini-games and keep only MVP checkpoints, but the format remains compatible with v1 for future expansion.

## Save System

```typescript
interface GameStateV2 {
  version: 2;
  outfits: { player: number; partner: number };
  visitedCheckpoints: string[];  // Only valid v2 checkpoint IDs
  miniGameScores: Record<string, number>;  // Latest score per mini-game
  bestScores: Record<string, number>;      // All-time best score per mini-game
  playerPosition?: { x: number; y: number };  // For scene restoration after mini-game return
  // When playerPosition is absent (new game), player spawns at DEFAULT_SPAWN from mapLayout.ts
}

// V1 format (no version field)
interface GameStateV1 {
  outfits: { herOutfit: number; hisOutfit: number };
  visitedCheckpoints: string[];
  miniGameScores: Record<string, number>;
}
```

### Migration Logic

```typescript
function migrate(raw: any): GameStateV2 {
  if (raw?.version === 2) return raw;

  // Unknown future version — return fresh state
  if (raw?.version && raw.version > 2) return getDefaultState();

  // V1 → V2 migration
  // V1 miniGameScores tracked best scores, so copy to both fields
  const filteredScores = Object.fromEntries(
    Object.entries(raw?.miniGameScores ?? {})
      .filter(([id]) => VALID_CHECKPOINT_IDS.includes(id))
  );

  return {
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
```

- Save to `localStorage` on every meaningful state change
- Load on boot, migrate from v1 format if detected (no `version` field = v1)
- "New Game" clears save, "Continue" loads it

## Input System

`InputSystem` is a unified input handler that normalizes keyboard and touch input into a consistent API. Scenes consume direction vectors and action events without caring about input source.

### InputSystem API

```typescript
class InputSystem {
  // Returns normalized direction vector (-1 to 1 per axis)
  getDirection(): { x: number; y: number };

  // Returns true on the frame interaction is pressed (E, Space, or joystick action button)
  isInteractPressed(): boolean;

  // Returns true on the frame escape/back is pressed
  isBackPressed(): boolean;

  // Call in scene update() to poll input state
  update(): void;

  // Enables/disables the virtual joystick (hidden on desktop, shown on touch devices)
  setTouchEnabled(enabled: boolean): void;

  // Cleanup
  destroy(): void;
}
```

### Keyboard
- Arrow keys or WASD → `getDirection()` returns `{x: -1|0|1, y: -1|0|1}`
- E or Space → `isInteractPressed()` returns true
- Escape → `isBackPressed()` returns true

### Touch (Mobile)

- **Virtual joystick** — a floating joystick (Phaser-based, rendered on the game canvas) that appears in the bottom-left when the user touches that region. Returns analog direction via `getDirection()`. Disappears when finger lifts. Implementation: Phaser circle graphics with drag events, constrained to a radius, mapped to -1..1 direction vector.
- **Action button** — bottom-right touch zone for interaction, mapped to `isInteractPressed()`
- **Direct touch** in mini-games — mini-game scenes bypass InputSystem and use their own Phaser input events (tap cards in Match, drag basket in Catch). Quiz uses DOM click handlers.
- All DOM touch targets ≥ 44×44px (CSS). Phaser touch zones ≥ 48×48px (hitArea).

### Device Detection

- Touch device detected via `'ontouchstart' in window || navigator.maxTouchPoints > 0`
- Virtual joystick auto-shown on touch devices, hidden on desktop
- Both input methods active simultaneously (hybrid laptop/tablet devices)

**Why virtual joystick over tap-to-move:** Tap-to-move requires full tile-grid pathfinding, visual path feedback, and impassable-tile handling. A virtual joystick gives the same directional control as keyboard with zero pathfinding complexity. The walkability grid is used for NPC pathfinding and player collision detection only.

## Asset Loading & Error Handling

### BootScene Strategy

1. Show loading progress bar (DOM-based, not Phaser — visible immediately)
2. Load all sprite sheets and tileset PNGs via Phaser's loader
3. On individual asset failure: log warning, register a fallback 32×32 magenta checkerboard texture under the expected key. Game continues with visible but non-crashing placeholders.
4. On critical failure (tileset missing): show error message in DOM, do not proceed to game
5. Generate procedural textures (sky, particles) after sprite loading completes — these cannot fail

### Critical vs. Non-Critical Assets

| Asset | Critical? | Fallback |
|-------|-----------|----------|
| Terrain tileset | Yes | Block — game unplayable without ground |
| Character sprites | Yes | Block — game unplayable without characters |
| NPC sprites | No | Magenta placeholder, game still playable |
| Building tileset | No | Magenta placeholder, game still playable |
| Decoration sprites | No | Skip decorations, game still playable |
| Mini-game items | No | Magenta placeholder per mini-game |

## Performance Considerations

- **Tile rendering:** Programmatic sprite placement from a single tileset atlas (GPU-efficient batching)
- **Character sprites:** Pre-loaded sprite sheets, no runtime generation (eliminates boot delay)
- **DOM UI:** Reuse elements via hide/show rather than create/destroy. Minimize layout thrashing.
- **Particles:** Cap at ~50 active particles, recycle emitters
- **Mobile:** Target 60fps on mid-range phones (2020+)

## What's NOT in MVP

- Audio/music (add later)
- Weather effects (add later)
- Additional mini-games: Puzzle, Cooking (add later)
- Additional locations: Cafe, Home, Pizzeria (add when adding corresponding mini-games)
- Memory card/photo feature (the v1 `memory` field per checkpoint — deferred, add as post-MVP feature)
- Photo upload for memories (add later)
- Tap-to-move pathfinding for player (may revisit post-MVP if virtual joystick feels limiting)
- Multiplayer (probably never)

## Migration Path

1. Build v2 in a new `src/` directory — move current code to `src-v1/` for reference
2. Checkpoint data format is compatible — v2 filters to MVP checkpoints only
3. SaveSystem v2 migrates v1 localStorage data (field renames, checkpoint filtering, version tag)
4. Once v2 is stable, delete `src-v1/`
