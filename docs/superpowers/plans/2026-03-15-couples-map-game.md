# Couple's Map Game Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a browser-based 2D top-down game where the player explores a map of meaningful couple locations, each with memory cards and mini-games.

**Architecture:** Static site built with Vite + TypeScript. Phaser 3 handles all game rendering, scenes, and input. Tilemap designed in Tiled. All data in JSON, progress in localStorage. Deployed to Render as a static site.

**Tech Stack:** Phaser 3, Vite, TypeScript, Tiled (map editor)

**Spec:** `docs/superpowers/specs/2026-03-15-couples-map-game-design.md`

---

## File Map

| File | Responsibility |
|------|---------------|
| `index.html` | HTML shell, mount point for Phaser canvas |
| `vite.config.ts` | Vite config with static asset handling |
| `tsconfig.json` | TypeScript config |
| `package.json` | Dependencies and scripts |
| `src/main.ts` | Phaser game config, register all scenes, launch |
| `src/utils/storage.ts` | localStorage read/write for avatars, visited checkpoints, scores |
| `src/data/checkpoints.json` | Checkpoint content: names, messages, photos, mini-game configs |
| `src/scenes/BootScene.ts` | Preload all assets, show progress bar, transition to MenuScene |
| `src/scenes/MenuScene.ts` | Title screen with New Game / Continue buttons |
| `src/scenes/AvatarScene.ts` | Character customizer for 2 avatars |
| `src/scenes/WorldScene.ts` | Tilemap rendering, player movement, camera, partner follower, checkpoint detection, visited badges, progress counter |
| `src/scenes/checkpoints/MemoryCard.ts` | Overlay scene: photo, message, date, play mini-game button |
| `src/scenes/checkpoints/QuizGame.ts` | Multiple-choice trivia mini-game |
| `src/scenes/checkpoints/CatchGame.ts` | Falling items catch mini-game |
| `src/scenes/checkpoints/MatchGame.ts` | Card-matching pairs mini-game |
| `src/scenes/checkpoints/PuzzleGame.ts` | Jigsaw photo puzzle mini-game |
| `src/scenes/checkpoints/CookingGame.ts` | Timed order assembly mini-game |
| `src/assets/sprites/` | Character spritesheets (placeholder then real) |
| `src/assets/tiles/` | Tileset PNGs |
| `src/assets/maps/` | Tiled JSON exports |
| `src/assets/photos/` | Couple photos (placeholder then real) |

---

## Chunk 1: Project Scaffolding + Utilities + Boot/Menu Scenes

### Task 1: Initialize Vite + TypeScript + Phaser project

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `index.html`
- Create: `src/main.ts`
- Create: `.gitignore`

- [ ] **Step 1: Initialize npm project and install dependencies**

```bash
cd C:/Learnings/game-website
npm init -y
npm install phaser
npm install -D typescript vite
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "skipLibCheck": true,
    "outDir": "dist",
    "sourceMap": true
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create vite.config.ts**

```ts
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    assetsInlineLimit: 0,
  },
});
```

- [ ] **Step 4: Create index.html**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Our Places</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #1a1a2e; display: flex; justify-content: center; align-items: center; min-height: 100vh; overflow: hidden; }
  </style>
</head>
<body>
  <script type="module" src="/src/main.ts"></script>
</body>
</html>
```

- [ ] **Step 5: Create src/main.ts with minimal Phaser config**

```ts
import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { MenuScene } from './scenes/MenuScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  parent: document.body,
  backgroundColor: '#1a1a2e',
  pixelArt: true,
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene, MenuScene],
};

new Phaser.Game(config);
```

- [ ] **Step 6: Create .gitignore**

```
node_modules/
dist/
.superpowers/
```

- [ ] **Step 7: Add scripts to package.json**

Add to `package.json` scripts:
```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  }
}
```

- [ ] **Step 8: Commit**

```bash
git add package.json tsconfig.json vite.config.ts index.html src/main.ts .gitignore
git commit -m "feat: scaffold Vite + TypeScript + Phaser 3 project"
```

---

### Task 2: Storage utility

**Files:**
- Create: `src/utils/storage.ts`

- [ ] **Step 1: Create storage.ts with typed read/write functions**

```ts
export interface AvatarConfig {
  hair: number;
  hairColor: string;
  skin: number;
  outfit: number;
  accessory: string | null;
}

export interface GameState {
  avatar1: AvatarConfig | null;
  avatar2: AvatarConfig | null;
  visitedCheckpoints: string[];
  miniGameScores: Record<string, number>;
}

const STORAGE_KEY = 'couples-map-game';

function getDefaultState(): GameState {
  return {
    avatar1: null,
    avatar2: null,
    visitedCheckpoints: [],
    miniGameScores: {},
  };
}

export function loadGameState(): GameState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultState();
    return { ...getDefaultState(), ...JSON.parse(raw) };
  } catch {
    return getDefaultState();
  }
}

export function saveGameState(state: GameState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function saveAvatars(avatar1: AvatarConfig, avatar2: AvatarConfig): void {
  const state = loadGameState();
  state.avatar1 = avatar1;
  state.avatar2 = avatar2;
  saveGameState(state);
}

export function markCheckpointVisited(checkpointId: string): void {
  const state = loadGameState();
  if (!state.visitedCheckpoints.includes(checkpointId)) {
    state.visitedCheckpoints.push(checkpointId);
    saveGameState(state);
  }
}

export function saveMiniGameScore(checkpointId: string, score: number, lowerIsBetter = false): void {
  const state = loadGameState();
  const existing = state.miniGameScores[checkpointId];
  const isBetter = lowerIsBetter ? score < existing : score > existing;
  if (existing === undefined || isBetter) {
    state.miniGameScores[checkpointId] = score;
    saveGameState(state);
  }
}

export function hasSavedGame(): boolean {
  const state = loadGameState();
  return state.avatar1 !== null;
}

export function clearGameState(): void {
  localStorage.removeItem(STORAGE_KEY);
}
```

- [ ] **Step 2: Verify it compiles**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/utils/storage.ts
git commit -m "feat: add localStorage storage utility"
```

---

### Task 3: Placeholder assets

We need minimal placeholder assets to develop scenes. These will be replaced with real pixel art later.

**Files:**
- Create: `src/assets/tiles/placeholder-tileset.png` (programmatic)
- Create: `src/assets/sprites/placeholder-character.png` (programmatic)
- Create: `src/assets/maps/world.json` (hand-crafted minimal Tiled-format JSON)
- Create: `src/assets/photos/placeholder.jpg` (programmatic)
- Create: `src/data/checkpoints.json`

- [ ] **Step 1: Create a placeholder tileset PNG**

Use a small Node script to generate a 128x32 PNG with 4 colored 32x32 tiles (grass green, dirt brown, tree dark-green, building gray):

```bash
mkdir -p src/assets/tiles src/assets/sprites src/assets/maps src/assets/photos src/data
node -e "
const { createCanvas } = require('canvas');
const fs = require('fs');
const c = createCanvas(128, 32);
const ctx = c.getContext('2d');
const colors = ['#4a7c3f', '#8B7355', '#2d5a1b', '#888888'];
colors.forEach((col, i) => { ctx.fillStyle = col; ctx.fillRect(i * 32, 0, 32, 32); });
fs.writeFileSync('src/assets/tiles/placeholder-tileset.png', c.toBuffer('image/png'));
"
```

If `canvas` npm package is not available, create the tileset manually as a simple 128x32 colored-squares PNG using any image tool, OR create it inline as a base64 data URL in the BootScene and skip the file. As a fallback, use Phaser's built-in `this.make.graphics()` to generate colored rectangles at runtime.

**Recommended fallback approach (no canvas dependency):** Generate placeholder assets at runtime in BootScene using Phaser graphics:

```ts
// In BootScene.preload(), generate textures programmatically:
const grassGfx = this.make.graphics({ x: 0, y: 0, add: false });
grassGfx.fillStyle(0x4a7c3f).fillRect(0, 0, 32, 32);
grassGfx.generateTexture('grass-tile', 32, 32);
grassGfx.destroy();
```

Use this approach for all placeholder assets — no external image files needed for development.

- [ ] **Step 2: Create a minimal Tiled-format tilemap JSON**

Create `src/assets/maps/world.json` — a valid Phaser-compatible tilemap with a 20x15 ground layer (all grass), a collision layer, and a checkpoints object layer with 3 example checkpoint zones:

```json
{
  "width": 20,
  "height": 15,
  "tilewidth": 32,
  "tileheight": 32,
  "orientation": "orthogonal",
  "renderorder": "right-down",
  "tilesets": [],
  "layers": [
    {
      "name": "Ground",
      "type": "tilelayer",
      "width": 20,
      "height": 15,
      "data": [],
      "visible": true,
      "opacity": 1,
      "x": 0,
      "y": 0
    },
    {
      "name": "Collision",
      "type": "tilelayer",
      "width": 20,
      "height": 15,
      "data": [],
      "visible": false,
      "opacity": 1,
      "x": 0,
      "y": 0
    },
    {
      "name": "Checkpoints",
      "type": "objectgroup",
      "objects": [
        { "id": 1, "name": "restaurant", "x": 128, "y": 96, "width": 64, "height": 64 },
        { "id": 2, "name": "cafe", "x": 384, "y": 96, "width": 64, "height": 64 },
        { "id": 3, "name": "park", "x": 256, "y": 288, "width": 64, "height": 64 },
        { "id": 4, "name": "cinema", "x": 512, "y": 192, "width": 64, "height": 64 },
        { "id": 5, "name": "home", "x": 128, "y": 288, "width": 64, "height": 64 },
        { "id": 6, "name": "pizzeria", "x": 448, "y": 320, "width": 64, "height": 64 }
      ],
      "visible": true,
      "opacity": 1,
      "x": 0,
      "y": 0
    }
  ]
}
```

Note: The Ground `data` array should be filled with 300 entries of `1` (all grass). The Collision `data` array should be 300 entries of `0` (no collision). We'll refine the map once we have real tiles.

- [ ] **Step 3: Create checkpoints.json with sample data**

```json
{
  "checkpoints": [
    {
      "id": "restaurant",
      "name": "Our Favourite Restaurant",
      "icon": "pizza",
      "memory": {
        "photo": "placeholder.jpg",
        "message": "This is where it all started!",
        "date": "January 2024"
      },
      "miniGame": {
        "type": "quiz",
        "config": {
          "questions": [
            {
              "question": "What did we order on our first date?",
              "options": ["Pizza", "Pasta", "Sushi", "Burgers"],
              "answer": 0
            }
          ]
        }
      }
    },
    {
      "id": "cafe",
      "name": "Morning Coffee Spot",
      "icon": "coffee",
      "memory": {
        "photo": "placeholder.jpg",
        "message": "Our weekend ritual.",
        "date": "March 2024"
      },
      "miniGame": null
    },
    {
      "id": "park",
      "name": "The Park",
      "icon": "flower",
      "memory": {
        "photo": "placeholder.jpg",
        "message": "Where we go to escape the world.",
        "date": "Summer 2024"
      },
      "miniGame": {
        "type": "catch",
        "config": {
          "items": ["petal", "leaf", "butterfly"],
          "speed": 2,
          "spawnRate": 1000
        }
      }
    },
    {
      "id": "cinema",
      "name": "Movie Night Spot",
      "icon": "movie",
      "memory": {
        "photo": "placeholder.jpg",
        "message": "We always pick the same seat.",
        "date": "February 2024"
      },
      "miniGame": {
        "type": "match",
        "config": {
          "pairs": [
            { "a": "Here's looking at you", "b": "Casablanca" },
            { "a": "You had me at hello", "b": "Jerry Maguire" },
            { "a": "To infinity and beyond", "b": "Toy Story" },
            { "a": "I am Groot", "b": "Guardians of the Galaxy" }
          ]
        }
      }
    },
    {
      "id": "home",
      "name": "Our Happy Place",
      "icon": "home",
      "memory": {
        "photo": "placeholder.jpg",
        "message": "Home is wherever you are.",
        "date": "Always"
      },
      "miniGame": {
        "type": "puzzle",
        "config": {
          "photo": "placeholder.jpg",
          "gridSize": 3
        }
      }
    },
    {
      "id": "pizzeria",
      "name": "Luigi's Pizza",
      "icon": "pizza",
      "memory": {
        "photo": "placeholder.jpg",
        "message": "Remember the wrong pizza that was actually perfect?",
        "date": "March 2024"
      },
      "miniGame": {
        "type": "cooking",
        "config": {
          "orders": [
            { "name": "Our usual", "items": ["pizza", "garlic-bread", "tiramisu"] },
            { "name": "The accident", "items": ["wrong-pizza", "salad"] }
          ],
          "timeLimit": 30
        }
      }
    }
  ]
}
```

- [ ] **Step 4: Commit**

```bash
git add src/assets/ src/data/
git commit -m "feat: add placeholder assets and sample checkpoint data"
```

---

### Task 4: BootScene with progress bar

**Files:**
- Create: `src/scenes/BootScene.ts`

- [ ] **Step 1: Create BootScene**

```ts
import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    this.createProgressBar();
    this.generatePlaceholderTextures();
    // Checkpoint data is imported via ES modules in WorldScene/MemoryCard, not loaded here
  }

  private createProgressBar(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    const barBg = this.add.rectangle(width / 2, height / 2, 320, 20, 0x333333);
    const bar = this.add.rectangle(width / 2 - 158, height / 2, 0, 16, 0x7c3aed);
    bar.setOrigin(0, 0.5);

    const loadingText = this.add.text(width / 2, height / 2 - 30, 'Loading...', {
      fontSize: '16px',
      color: '#ffffff',
    }).setOrigin(0.5);

    this.load.on('progress', (value: number) => {
      bar.width = 316 * value;
    });

    this.load.on('complete', () => {
      barBg.destroy();
      bar.destroy();
      loadingText.destroy();
    });
  }

  private generatePlaceholderTextures(): void {
    // Grass tile
    const grass = this.make.graphics({ add: false });
    grass.fillStyle(0x4a7c3f).fillRect(0, 0, 32, 32);
    grass.fillStyle(0x3d6b35).fillRect(4, 4, 4, 4);
    grass.fillStyle(0x3d6b35).fillRect(20, 14, 4, 4);
    grass.fillStyle(0x3d6b35).fillRect(10, 24, 4, 4);
    grass.generateTexture('grass-tile', 32, 32);
    grass.destroy();

    // Dirt tile
    const dirt = this.make.graphics({ add: false });
    dirt.fillStyle(0x8b7355).fillRect(0, 0, 32, 32);
    dirt.generateTexture('dirt-tile', 32, 32);
    dirt.destroy();

    // Building placeholder
    const building = this.make.graphics({ add: false });
    building.fillStyle(0x888888).fillRect(0, 0, 64, 64);
    building.fillStyle(0x666666).fillRect(0, 0, 64, 8);
    building.fillStyle(0xaaaa55).fillRect(24, 40, 16, 24);
    building.generateTexture('building', 64, 64);
    building.destroy();

    // Tree placeholder
    const tree = this.make.graphics({ add: false });
    tree.fillStyle(0x8b6914).fillRect(12, 24, 8, 16);
    tree.fillStyle(0x2d5a1b).fillCircle(16, 16, 14);
    tree.generateTexture('tree', 32, 40);
    tree.destroy();

    // Character placeholder (48x48, simple body)
    const charGfx = this.make.graphics({ add: false });
    charGfx.fillStyle(0xffcc99).fillCircle(24, 12, 10); // head
    charGfx.fillStyle(0x4488cc).fillRect(14, 22, 20, 20); // body
    charGfx.fillStyle(0x333366).fillRect(14, 42, 8, 6); // left leg
    charGfx.fillStyle(0x333366).fillRect(26, 42, 8, 6); // right leg
    charGfx.generateTexture('character', 48, 48);
    charGfx.destroy();

    // Checkpoint glow
    const glow = this.make.graphics({ add: false });
    glow.fillStyle(0xffd700, 0.3).fillCircle(32, 32, 32);
    glow.fillStyle(0xffd700, 0.6).fillCircle(32, 32, 16);
    glow.generateTexture('checkpoint-glow', 64, 64);
    glow.destroy();

    // Checkmark badge
    const check = this.make.graphics({ add: false });
    check.fillStyle(0x22c55e).fillCircle(8, 8, 8);
    check.lineStyle(2, 0xffffff);
    check.beginPath();
    check.moveTo(4, 8);
    check.lineTo(7, 11);
    check.lineTo(12, 5);
    check.strokePath();
    check.generateTexture('checkmark', 16, 16);
    check.destroy();

    // Photo placeholder
    const photo = this.make.graphics({ add: false });
    const gradient = photo;
    gradient.fillGradientStyle(0x667eea, 0x764ba2, 0x667eea, 0x764ba2);
    gradient.fillRect(0, 0, 600, 400);
    gradient.fillStyle(0xffffff, 0.3);
    gradient.fillCircle(300, 200, 60);
    photo.generateTexture('placeholder-photo', 600, 400);
    photo.destroy();
  }

  create(): void {
    this.scene.start('MenuScene');
  }
}
```

- [ ] **Step 2: Verify dev server runs**

```bash
npm run dev
```

Open browser, confirm you see a loading bar then transition. Check console for errors.

- [ ] **Step 3: Commit**

```bash
git add src/scenes/BootScene.ts
git commit -m "feat: add BootScene with progress bar and placeholder textures"
```

---

### Task 5: MenuScene

**Files:**
- Create: `src/scenes/MenuScene.ts`

- [ ] **Step 1: Create MenuScene**

```ts
import Phaser from 'phaser';
import { hasSavedGame } from '../utils/storage';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' });
  }

  create(): void {
    const { width, height } = this.cameras.main;

    // Title
    this.add.text(width / 2, height / 3, 'Our Places', {
      fontSize: '48px',
      color: '#ffffff',
      fontFamily: 'Georgia, serif',
    }).setOrigin(0.5);

    // Subtitle
    this.add.text(width / 2, height / 3 + 50, 'A little world of us', {
      fontSize: '16px',
      color: '#94a3b8',
      fontFamily: 'Georgia, serif',
    }).setOrigin(0.5);

    // New Game button
    const newGameBtn = this.add.text(width / 2, height / 2 + 40, '[ New Game ]', {
      fontSize: '24px',
      color: '#7c3aed',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    newGameBtn.on('pointerover', () => newGameBtn.setColor('#a78bfa'));
    newGameBtn.on('pointerout', () => newGameBtn.setColor('#7c3aed'));
    newGameBtn.on('pointerdown', () => this.scene.start('AvatarScene'));

    // Continue button (only if saved game exists)
    if (hasSavedGame()) {
      const continueBtn = this.add.text(width / 2, height / 2 + 80, '[ Continue ]', {
        fontSize: '24px',
        color: '#22c55e',
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });

      continueBtn.on('pointerover', () => continueBtn.setColor('#4ade80'));
      continueBtn.on('pointerout', () => continueBtn.setColor('#22c55e'));
      continueBtn.on('pointerdown', () => this.scene.start('WorldScene'));
    }
  }
}
```

- [ ] **Step 2: Verify in browser**

```bash
npm run dev
```

Confirm: title screen renders with "Our Places" and "New Game" button. Clicking "New Game" should error (AvatarScene not yet created) — that's expected.

- [ ] **Step 3: Commit**

```bash
git add src/scenes/MenuScene.ts
git commit -m "feat: add MenuScene with title screen and navigation"
```

---

## Chunk 2: WorldScene — Map, Movement, Camera

### Task 6: WorldScene with tilemap and player movement

**Files:**
- Create: `src/scenes/WorldScene.ts`
- Modify: `src/main.ts` (register WorldScene)

- [ ] **Step 1: Create WorldScene with programmatic tilemap and player**

Since we're using placeholder textures (not a real Tiled JSON yet), build the ground layer programmatically for now. We'll swap to a Tiled JSON map later when real assets are ready.

```ts
import Phaser from 'phaser';
import { loadGameState, markCheckpointVisited } from '../utils/storage';
import checkpointData from '../data/checkpoints.json';

export class WorldScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Sprite;
  private partner!: Phaser.GameObjects.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<string, Phaser.Input.Keyboard.Key>;
  private speed = 160;
  private checkpointZones: Phaser.GameObjects.Zone[] = [];
  private activeCheckpointId: string | null = null;
  private promptText!: Phaser.GameObjects.Text;
  private playerPositionHistory: Phaser.Math.Vector2[] = [];
  private progressText!: Phaser.GameObjects.Text;
  private checkmarkSprites: Map<string, Phaser.GameObjects.Image> = new Map();
  private completionShown = false;

  constructor() {
    super({ key: 'WorldScene' });
  }

  create(): void {
    this.createMap();
    this.createPlayer();
    this.createPartner();
    this.createCheckpointZones();
    this.createUI();
    this.setupCamera();
    this.setupInput();
  }

  private createMap(): void {
    const mapWidth = 40;
    const mapHeight = 30;
    const tileSize = 32;

    // Fill ground with grass tiles
    for (let y = 0; y < mapHeight; y++) {
      for (let x = 0; x < mapWidth; x++) {
        this.add.image(x * tileSize + 16, y * tileSize + 16, 'grass-tile');
      }
    }

    // Add some dirt paths
    for (let x = 5; x < 35; x++) {
      this.add.image(x * tileSize + 16, 15 * tileSize + 16, 'dirt-tile');
    }
    for (let y = 5; y < 25; y++) {
      this.add.image(20 * tileSize + 16, y * tileSize + 16, 'dirt-tile');
    }

    // Add trees as decorations
    const treePositions = [
      [3, 3], [7, 2], [2, 10], [8, 8], [15, 3], [30, 5],
      [35, 12], [5, 20], [12, 25], [28, 22], [33, 27], [37, 8],
    ];
    treePositions.forEach(([x, y]) => {
      const tree = this.add.image(x * tileSize + 16, y * tileSize + 8, 'tree');
      tree.setDepth(y * tileSize); // Depth sorting
    });

    // Set world bounds
    this.physics.world.setBounds(0, 0, mapWidth * tileSize, mapHeight * tileSize);
  }

  private createPlayer(): void {
    const state = loadGameState();
    // Spawn at center of map
    this.player = this.physics.add.sprite(20 * 32, 15 * 32, 'character');
    this.player.setDepth(15 * 32);
    (this.player.body as Phaser.Physics.Arcade.Body).setCollideWorldBounds(true);
    (this.player.body as Phaser.Physics.Arcade.Body).setSize(24, 24);
    (this.player.body as Phaser.Physics.Arcade.Body).setOffset(12, 24);

    // Apply avatar outfit color as tint (placeholder until real spritesheets)
    if (state.avatar1) {
      const outfitColors = [0x4488cc, 0xcc4444, 0x44cc44, 0xcccc44, 0xcc44cc];
      this.player.setTint(outfitColors[state.avatar1.outfit] || 0xffffff);
    }
  }

  private createPartner(): void {
    const state = loadGameState();
    this.partner = this.add.sprite(20 * 32 + 40, 15 * 32, 'character');
    this.partner.setDepth(15 * 32);

    // Apply avatar2 outfit color as tint (placeholder until real spritesheets)
    if (state.avatar2) {
      const outfitColors = [0x4488cc, 0xcc4444, 0x44cc44, 0xcccc44, 0xcc44cc];
      this.partner.setTint(outfitColors[state.avatar2.outfit] || 0xffaacc);
    } else {
      this.partner.setTint(0xffaacc);
    }
  }

  private createCheckpointZones(): void {
    const checkpoints = checkpointData.checkpoints;
    const state = loadGameState();

    checkpoints.forEach((cp) => {
      // Place buildings on the map based on checkpoint data
      // For now, use fixed positions. Later these come from Tiled object layer.
      const positions: Record<string, { x: number; y: number }> = {
        restaurant: { x: 10 * 32, y: 8 * 32 },
        cafe: { x: 30 * 32, y: 8 * 32 },
        park: { x: 20 * 32, y: 22 * 32 },
        cinema: { x: 16 * 32, y: 6 * 32 },
        home: { x: 4 * 32, y: 9 * 32 },
        pizzeria: { x: 14 * 32, y: 10 * 32 },
      };

      const pos = positions[cp.id];
      if (!pos) return;

      // Building sprite
      const bldg = this.add.image(pos.x, pos.y, 'building');
      bldg.setDepth(pos.y - 32);

      // Checkpoint glow
      this.add.image(pos.x, pos.y, 'checkpoint-glow').setDepth(pos.y - 33);

      // Visited checkmark (store ref for dynamic updates)
      if (state.visitedCheckpoints.includes(cp.id)) {
        const cm = this.add.image(pos.x + 24, pos.y - 24, 'checkmark').setDepth(pos.y);
        this.checkmarkSprites.set(cp.id, cm);
      }

      // Label
      this.add.text(pos.x, pos.y + 40, cp.name, {
        fontSize: '10px',
        color: '#ffffff',
        backgroundColor: '#00000088',
        padding: { x: 4, y: 2 },
      }).setOrigin(0.5).setDepth(pos.y);

      // Trigger zone
      const zone = this.add.zone(pos.x, pos.y, 80, 80);
      this.physics.add.existing(zone, true);
      (zone as any).checkpointId = cp.id;
      this.checkpointZones.push(zone);
    });
  }

  private createUI(): void {
    // Interaction prompt (hidden by default)
    this.promptText = this.add.text(0, 0, 'Press E to enter', {
      fontSize: '12px',
      color: '#ffd700',
      backgroundColor: '#000000aa',
      padding: { x: 6, y: 3 },
    }).setOrigin(0.5).setVisible(false).setDepth(99999);

    // Progress counter (fixed to camera)
    const state = loadGameState();
    const total = checkpointData.checkpoints.length;
    const visited = state.visitedCheckpoints.length;
    this.progressText = this.add.text(10, 10, `${visited}/${total} places visited`, {
      fontSize: '14px',
      color: '#ffffff',
      backgroundColor: '#00000088',
      padding: { x: 8, y: 4 },
    }).setScrollFactor(0).setDepth(90000);

    // Settings button (re-access avatar customization)
    const settingsBtn = this.add.text(this.cameras.main.width - 10, 10, '[ Settings ]', {
      fontSize: '12px',
      color: '#94a3b8',
      backgroundColor: '#00000088',
      padding: { x: 6, y: 3 },
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(90000).setInteractive({ useHandCursor: true });

    settingsBtn.on('pointerdown', () => {
      this.scene.pause();
      this.scene.launch('AvatarScene', { fromWorld: true });
    });
  }

  private setupCamera(): void {
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
    this.cameras.main.setBounds(0, 0, 40 * 32, 30 * 32);
    this.cameras.main.setZoom(1.5);
  }

  private setupInput(): void {
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = {
      up: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      down: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      left: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };
    this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E).on('down', () => {
      if (this.activeCheckpointId) {
        this.openMemoryCard(this.activeCheckpointId);
      }
    });
  }

  update(_time: number, delta: number): void {
    this.handleMovement();
    this.updatePartner(delta);
    this.checkCheckpointOverlap();
    this.updateDepthSorting();
  }

  private handleMovement(): void {
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0);

    const up = this.cursors.up.isDown || this.wasd.up.isDown;
    const down = this.cursors.down.isDown || this.wasd.down.isDown;
    const left = this.cursors.left.isDown || this.wasd.left.isDown;
    const right = this.cursors.right.isDown || this.wasd.right.isDown;

    if (left) body.setVelocityX(-this.speed);
    else if (right) body.setVelocityX(this.speed);

    if (up) body.setVelocityY(-this.speed);
    else if (down) body.setVelocityY(this.speed);

    // Normalize diagonal
    if (body.velocity.x !== 0 && body.velocity.y !== 0) {
      body.velocity.normalize().scale(this.speed);
    }

    // Record position history for partner
    if (body.velocity.x !== 0 || body.velocity.y !== 0) {
      this.playerPositionHistory.push(new Phaser.Math.Vector2(this.player.x, this.player.y));
      if (this.playerPositionHistory.length > 30) {
        this.playerPositionHistory.shift();
      }
    }
  }

  private updatePartner(delta: number): void {
    const dist = Phaser.Math.Distance.Between(
      this.partner.x, this.partner.y,
      this.player.x, this.player.y
    );

    if (dist > 48 && this.playerPositionHistory.length > 10) {
      const target = this.playerPositionHistory[0];
      const angle = Phaser.Math.Angle.Between(
        this.partner.x, this.partner.y,
        target.x, target.y
      );
      const partnerSpeed = this.speed * 0.9;
      this.partner.x += Math.cos(angle) * partnerSpeed * (delta / 1000);
      this.partner.y += Math.sin(angle) * partnerSpeed * (delta / 1000);
    }
  }

  private checkCheckpointOverlap(): void {
    let foundCheckpoint: string | null = null;

    this.checkpointZones.forEach((zone) => {
      const playerBody = this.player.body as Phaser.Physics.Arcade.Body;
      const zoneBody = zone.body as Phaser.Physics.Arcade.StaticBody;

      if (Phaser.Geom.Intersects.RectangleToRectangle(
        playerBody.getBounds(new Phaser.Geom.Rectangle()),
        zoneBody.getBounds(new Phaser.Geom.Rectangle())
      )) {
        foundCheckpoint = (zone as any).checkpointId;
      }
    });

    this.activeCheckpointId = foundCheckpoint;

    if (foundCheckpoint) {
      this.promptText.setVisible(true);
      this.promptText.setPosition(this.player.x, this.player.y - 40);
    } else {
      this.promptText.setVisible(false);
    }
  }

  private updateDepthSorting(): void {
    this.player.setDepth(this.player.y);
    this.partner.setDepth(this.partner.y);
  }

  private openMemoryCard(checkpointId: string): void {
    this.scene.pause();
    this.scene.launch('MemoryCard', { checkpointId });
  }

  refreshUI(): void {
    const state = loadGameState();
    const total = checkpointData.checkpoints.length;
    const visited = state.visitedCheckpoints.length;
    this.progressText.setText(`${visited}/${total} places visited`);

    // Add checkmarks for newly visited checkpoints
    const positions: Record<string, { x: number; y: number }> = {
      restaurant: { x: 10 * 32, y: 8 * 32 },
      cafe: { x: 30 * 32, y: 8 * 32 },
      park: { x: 20 * 32, y: 22 * 32 },
      cinema: { x: 16 * 32, y: 6 * 32 },
      home: { x: 4 * 32, y: 9 * 32 },
      pizzeria: { x: 14 * 32, y: 10 * 32 },
    };

    state.visitedCheckpoints.forEach((cpId) => {
      if (!this.checkmarkSprites.has(cpId)) {
        const pos = positions[cpId];
        if (pos) {
          const cm = this.add.image(pos.x + 24, pos.y - 24, 'checkmark').setDepth(pos.y);
          this.checkmarkSprites.set(cpId, cm);
        }
      }
    });

    // Completion check (only show once per session)
    if (visited === total && total > 0 && !this.completionShown) {
      this.completionShown = true;
      this.showCompletionOverlay();
    }
  }

  private showCompletionOverlay(): void {
    const { width, height } = this.cameras.main;
    const overlayElements: Phaser.GameObjects.GameObject[] = [];

    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.8)
      .setScrollFactor(0).setDepth(95000);
    overlayElements.push(overlay);

    const title = this.add.text(width / 2, height / 2 - 40, 'You visited all our places!', {
      fontSize: '28px', color: '#ffd700', align: 'center',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(95001);
    overlayElements.push(title);

    const msg = this.add.text(width / 2, height / 2 + 20, 'Thank you for being my favourite person.', {
      fontSize: '16px', color: '#ffffff', fontStyle: 'italic',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(95001);
    overlayElements.push(msg);

    const closeBtn = this.add.text(width / 2, height / 2 + 70, '[ Continue Exploring ]', {
      fontSize: '18px', color: '#22c55e',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setScrollFactor(0).setDepth(95001);
    overlayElements.push(closeBtn);

    closeBtn.on('pointerdown', () => {
      overlayElements.forEach((el) => el.destroy());
    });
  }

  applyAvatarTints(): void {
    const state = loadGameState();
    const outfitColors = [0x4488cc, 0xcc4444, 0x44cc44, 0xcccc44, 0xcc44cc];
    if (state.avatar1) {
      this.player.setTint(outfitColors[state.avatar1.outfit] || 0xffffff);
    }
    if (state.avatar2) {
      this.partner.setTint(outfitColors[state.avatar2.outfit] || 0xffaacc);
    }
  }
}
```

- [ ] **Step 2: Update main.ts to register WorldScene**

Add to imports and scene array:
```ts
import { WorldScene } from './scenes/WorldScene';
// Add to scene array: [BootScene, MenuScene, WorldScene]
```

- [ ] **Step 3: Verify in browser**

```bash
npm run dev
```

Click "New Game" — for now bypass AvatarScene by temporarily changing MenuScene's new game button to start WorldScene directly. Confirm:
- Green grass map renders
- Character appears at center
- WASD/arrow keys move the character
- Camera follows smoothly
- Buildings visible with labels
- "Press E" prompt appears near buildings
- Partner follows the player

- [ ] **Step 4: Commit**

```bash
git add src/scenes/WorldScene.ts src/main.ts
git commit -m "feat: add WorldScene with map, player movement, camera, and checkpoint zones"
```

---

## Chunk 3: AvatarScene

### Task 7: Avatar customization screen

**Files:**
- Create: `src/scenes/AvatarScene.ts`
- Modify: `src/main.ts` (register AvatarScene)

- [ ] **Step 1: Create AvatarScene**

```ts
import Phaser from 'phaser';
import { AvatarConfig, saveAvatars, loadGameState } from '../utils/storage';

const HAIR_STYLES = ['Short', 'Long', 'Curly', 'Ponytail', 'Buzz'];
const HAIR_COLORS = ['#2c1810', '#8B4513', '#DAA520', '#FFD700', '#C41E3A', '#1a1a2e', '#ff69b4', '#ffffff'];
const SKIN_TONES = ['#FFDBB4', '#E8B88A', '#C68642', '#8D5524', '#6B3E26', '#3B2219'];
const OUTFIT_COLORS = [0x4488cc, 0xcc4444, 0x44cc44, 0xcccc44, 0xcc44cc];
const ACCESSORIES = [null, 'hat', 'glasses'];

export class AvatarScene extends Phaser.Scene {
  private currentAvatar: 1 | 2 = 1;
  private avatars: [AvatarConfig, AvatarConfig] = [
    { hair: 0, hairColor: '#2c1810', skin: 0, outfit: 0, accessory: null },
    { hair: 0, hairColor: '#C41E3A', skin: 0, outfit: 1, accessory: null },
  ];
  private previewGraphics!: Phaser.GameObjects.Graphics;
  private fromWorld = false;

  constructor() {
    super({ key: 'AvatarScene' });
  }

  init(data?: { fromWorld?: boolean }): void {
    this.fromWorld = data?.fromWorld ?? false;
    // Load existing avatars if re-accessing from world
    if (this.fromWorld) {
      const state = loadGameState();
      if (state.avatar1) this.avatars[0] = { ...state.avatar1 };
      if (state.avatar2) this.avatars[1] = { ...state.avatar2 };
    }
  }

  create(): void {
    const { width, height } = this.cameras.main;

    this.add.text(width / 2, 30, 'Create Your Characters', {
      fontSize: '28px',
      color: '#ffffff',
    }).setOrigin(0.5);

    // Avatar tab buttons
    const tab1 = this.add.text(width / 2 - 80, 70, '[ Player 1 ]', {
      fontSize: '16px',
      color: '#7c3aed',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    const tab2 = this.add.text(width / 2 + 80, 70, '[ Player 2 ]', {
      fontSize: '16px',
      color: '#666666',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    tab1.on('pointerdown', () => {
      this.currentAvatar = 1;
      tab1.setColor('#7c3aed');
      tab2.setColor('#666666');
      this.refreshOptions();
    });

    tab2.on('pointerdown', () => {
      this.currentAvatar = 2;
      tab2.setColor('#7c3aed');
      tab1.setColor('#666666');
      this.refreshOptions();
    });

    // Preview area
    this.previewGraphics = this.add.graphics();
    this.drawPreview();

    // Options
    this.refreshOptions();

    // Confirm button
    const confirmBtn = this.add.text(width / 2, height - 40, '[ Start Adventure! ]', {
      fontSize: '24px',
      color: '#22c55e',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    confirmBtn.on('pointerover', () => confirmBtn.setColor('#4ade80'));
    confirmBtn.on('pointerout', () => confirmBtn.setColor('#22c55e'));
    confirmBtn.on('pointerdown', () => {
      saveAvatars(this.avatars[0], this.avatars[1]);
      if (this.fromWorld) {
        // Return to existing WorldScene without destroying it
        this.scene.stop();
        this.scene.resume('WorldScene');
        // WorldScene will re-apply avatar tints on resume
        const worldScene = this.scene.get('WorldScene') as any;
        if (worldScene?.applyAvatarTints) worldScene.applyAvatarTints();
      } else {
        this.scene.start('WorldScene');
      }
    });
  }

  private get currentConfig(): AvatarConfig {
    return this.avatars[this.currentAvatar - 1];
  }

  private optionElements: Phaser.GameObjects.GameObject[] = [];

  private refreshOptions(): void {
    // Clear previous option elements
    this.optionElements.forEach((el) => el.destroy());
    this.optionElements = [];

    const startY = 120;
    const { width } = this.cameras.main;

    const addOption = <T extends Phaser.GameObjects.GameObject>(el: T): T => {
      this.optionElements.push(el);
      return el;
    };

    // Hair style
    addOption(this.add.text(60, startY, 'Hair Style:', {
      fontSize: '14px', color: '#94a3b8',
    }));

    HAIR_STYLES.forEach((style, i) => {
      const btn = addOption(this.add.text(60 + i * 70, startY + 25, style, {
        fontSize: '12px',
        color: this.currentConfig.hair === i ? '#ffffff' : '#666666',
        backgroundColor: this.currentConfig.hair === i ? '#7c3aed' : '#2a2a4a',
        padding: { x: 6, y: 4 },
      }).setInteractive({ useHandCursor: true }));

      btn.on('pointerdown', () => {
        this.currentConfig.hair = i;
        this.refreshOptions();
        this.drawPreview();
      });
    });

    // Hair color
    addOption(this.add.text(60, startY + 55, 'Hair Color:', {
      fontSize: '14px', color: '#94a3b8',
    }));

    HAIR_COLORS.forEach((color, i) => {
      const swatch = addOption(this.add.rectangle(
        60 + i * 30, startY + 80, 22, 22,
        Phaser.Display.Color.HexStringToColor(color).color
      ).setInteractive({ useHandCursor: true }));

      if (this.currentConfig.hairColor === color) {
        addOption(this.add.rectangle(60 + i * 30, startY + 80, 26, 26)
          .setStrokeStyle(2, 0xffffff));
      }

      swatch.on('pointerdown', () => {
        this.currentConfig.hairColor = color;
        this.refreshOptions();
        this.drawPreview();
      });
    });

    // Skin tone
    addOption(this.add.text(60, startY + 105, 'Skin Tone:', {
      fontSize: '14px', color: '#94a3b8',
    }));

    SKIN_TONES.forEach((color, i) => {
      const swatch = addOption(this.add.rectangle(
        60 + i * 30, startY + 130, 22, 22,
        Phaser.Display.Color.HexStringToColor(color).color
      ).setInteractive({ useHandCursor: true }));

      if (this.currentConfig.skin === i) {
        addOption(this.add.rectangle(60 + i * 30, startY + 130, 26, 26)
          .setStrokeStyle(2, 0xffffff));
      }

      swatch.on('pointerdown', () => {
        this.currentConfig.skin = i;
        this.refreshOptions();
        this.drawPreview();
      });
    });

    // Outfit
    addOption(this.add.text(60, startY + 160, 'Outfit:', {
      fontSize: '14px', color: '#94a3b8',
    }));

    OUTFIT_COLORS.forEach((color, i) => {
      const swatch = addOption(this.add.rectangle(
        60 + i * 30, startY + 185, 22, 22, color
      ).setInteractive({ useHandCursor: true }));

      if (this.currentConfig.outfit === i) {
        addOption(this.add.rectangle(60 + i * 30, startY + 185, 26, 26)
          .setStrokeStyle(2, 0xffffff));
      }

      swatch.on('pointerdown', () => {
        this.currentConfig.outfit = i;
        this.refreshOptions();
        this.drawPreview();
      });
    });

    // Accessories
    addOption(this.add.text(60, startY + 215, 'Accessory:', {
      fontSize: '14px', color: '#94a3b8',
    }));

    ACCESSORIES.forEach((acc, i) => {
      const label = acc ? acc.charAt(0).toUpperCase() + acc.slice(1) : 'None';
      const btn = addOption(this.add.text(60 + i * 80, startY + 240, label, {
        fontSize: '12px',
        color: this.currentConfig.accessory === acc ? '#ffffff' : '#666666',
        backgroundColor: this.currentConfig.accessory === acc ? '#7c3aed' : '#2a2a4a',
        padding: { x: 6, y: 4 },
      }).setInteractive({ useHandCursor: true }));

      btn.on('pointerdown', () => {
        this.currentConfig.accessory = acc;
        this.refreshOptions();
        this.drawPreview();
      });
    });

    this.drawPreview();
  }

  private drawPreview(): void {
    this.previewGraphics.clear();
    const { width } = this.cameras.main;
    const cx = width / 2;

    // Draw both avatars side by side
    this.drawCharacter(cx - 50, 420, this.avatars[0], this.currentAvatar === 1);
    this.drawCharacter(cx + 50, 420, this.avatars[1], this.currentAvatar === 2);
  }

  private drawCharacter(x: number, y: number, config: AvatarConfig, selected: boolean): void {
    const g = this.previewGraphics;

    if (selected) {
      g.lineStyle(2, 0x7c3aed);
      g.strokeRect(x - 30, y - 40, 60, 100);
    }

    // Head (skin)
    const skinColor = Phaser.Display.Color.HexStringToColor(SKIN_TONES[config.skin]).color;
    g.fillStyle(skinColor);
    g.fillCircle(x, y - 10, 14);

    // Hair (varies by style)
    const hairColor = Phaser.Display.Color.HexStringToColor(config.hairColor).color;
    g.fillStyle(hairColor);
    switch (config.hair) {
      case 0: // Short
        g.fillEllipse(x, y - 18, 28, 12);
        break;
      case 1: // Long
        g.fillEllipse(x, y - 18, 30, 14);
        g.fillRect(x - 14, y - 18, 28, 20); // hair hanging down
        break;
      case 2: // Curly
        g.fillCircle(x - 8, y - 18, 8);
        g.fillCircle(x + 8, y - 18, 8);
        g.fillCircle(x, y - 22, 8);
        break;
      case 3: // Ponytail
        g.fillEllipse(x, y - 18, 26, 12);
        g.fillEllipse(x + 16, y - 10, 8, 16); // ponytail
        break;
      case 4: // Buzz
        g.fillEllipse(x, y - 16, 26, 8);
        break;
    }

    // Body (outfit)
    g.fillStyle(OUTFIT_COLORS[config.outfit]);
    g.fillRect(x - 12, y + 4, 24, 24);

    // Legs
    g.fillStyle(0x333366);
    g.fillRect(x - 10, y + 28, 8, 8);
    g.fillRect(x + 2, y + 28, 8, 8);

    // Accessories
    if (config.accessory === 'hat') {
      g.fillStyle(0x8B4513);
      g.fillRect(x - 14, y - 28, 28, 6); // brim
      g.fillRect(x - 8, y - 38, 16, 12); // crown
    } else if (config.accessory === 'glasses') {
      g.lineStyle(2, 0x333333);
      g.strokeCircle(x - 6, y - 10, 5);
      g.strokeCircle(x + 6, y - 10, 5);
      g.lineBetween(x - 1, y - 10, x + 1, y - 10); // bridge
    }
  }
}
```

- [ ] **Step 2: Register AvatarScene in main.ts**

Add to imports and scene array:
```ts
import { AvatarScene } from './scenes/AvatarScene';
// scene: [BootScene, MenuScene, AvatarScene, WorldScene]
```

- [ ] **Step 3: Verify in browser**

```bash
npm run dev
```

Confirm: New Game → AvatarScene shows. Can switch between Player 1 and Player 2. Can pick hair color, skin tone, outfit. "Start Adventure" goes to WorldScene.

- [ ] **Step 4: Commit**

```bash
git add src/scenes/AvatarScene.ts src/main.ts
git commit -m "feat: add AvatarScene with character customization"
```

---

## Chunk 4: MemoryCard Overlay + Checkpoint Interactions

### Task 8: MemoryCard overlay scene

**Files:**
- Create: `src/scenes/checkpoints/MemoryCard.ts`
- Modify: `src/main.ts` (register MemoryCard scene)

- [ ] **Step 1: Create MemoryCard scene**

```ts
import Phaser from 'phaser';
import { markCheckpointVisited, loadGameState } from '../../utils/storage';
import checkpointData from '../../data/checkpoints.json';

interface MemoryCardData {
  checkpointId: string;
}

export class MemoryCard extends Phaser.Scene {
  private checkpointId!: string;

  constructor() {
    super({ key: 'MemoryCard' });
  }

  init(data: MemoryCardData): void {
    this.checkpointId = data.checkpointId;
  }

  create(): void {
    const { width, height } = this.cameras.main;
    const cp = checkpointData.checkpoints.find((c) => c.id === this.checkpointId);
    if (!cp) {
      this.closeCard();
      return;
    }

    // Mark as visited
    markCheckpointVisited(this.checkpointId);

    // Dim overlay
    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.7);
    overlay.setInteractive(); // Block clicks through

    // Card background
    const cardW = 420;
    const cardH = 480;
    const cardX = width / 2;
    const cardY = height / 2;

    this.add.rectangle(cardX, cardY, cardW, cardH, 0x1e1b2e)
      .setStrokeStyle(2, 0x7c3aed);

    // Photo (placeholder for now)
    const photoKey = this.textures.exists(cp.memory.photo)
      ? cp.memory.photo
      : 'placeholder-photo';
    const photo = this.add.image(cardX, cardY - 100, photoKey);
    photo.setDisplaySize(380, 180);

    // Location name
    this.add.text(cardX, cardY + 10, cp.name, {
      fontSize: '22px',
      color: '#ffffff',
      fontFamily: 'Georgia, serif',
    }).setOrigin(0.5);

    // Message
    this.add.text(cardX, cardY + 50, `"${cp.memory.message}"`, {
      fontSize: '14px',
      color: '#94a3b8',
      fontStyle: 'italic',
      wordWrap: { width: 360 },
      align: 'center',
    }).setOrigin(0.5, 0);

    // Date
    if (cp.memory.date) {
      this.add.text(cardX, cardY + 110, cp.memory.date, {
        fontSize: '12px',
        color: '#64748b',
      }).setOrigin(0.5);
    }

    // Mini-game button (if available)
    if (cp.miniGame) {
      const playBtn = this.add.text(cardX, cardY + 160, '[ Play Mini-Game! ]', {
        fontSize: '18px',
        color: '#7c3aed',
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });

      playBtn.on('pointerover', () => playBtn.setColor('#a78bfa'));
      playBtn.on('pointerout', () => playBtn.setColor('#7c3aed'));
      playBtn.on('pointerdown', () => {
        const sceneKey = this.getMiniGameSceneKey(cp.miniGame!.type);
        this.scene.stop(); // Stop MemoryCard overlay
        this.scene.launch(sceneKey, { // Launch mini-game (WorldScene stays paused underneath)
          checkpointId: this.checkpointId,
          config: cp.miniGame!.config,
        });
      });
    }

    // Close button
    const closeBtn = this.add.text(cardX + cardW / 2 - 20, cardY - cardH / 2 + 10, 'X', {
      fontSize: '20px',
      color: '#ef4444',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    closeBtn.on('pointerdown', () => this.closeCard());

    // Escape key to close
    this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ESC).on('down', () => {
      this.closeCard();
    });
  }

  private getMiniGameSceneKey(type: string): string {
    const map: Record<string, string> = {
      quiz: 'QuizGame',
      catch: 'CatchGame',
      match: 'MatchGame',
      puzzle: 'PuzzleGame',
      cooking: 'CookingGame',
    };
    return map[type] || 'QuizGame';
  }

  private closeCard(): void {
    const worldScene = this.scene.get('WorldScene') as any;
    if (worldScene?.refreshUI) {
      worldScene.refreshUI();
    }
    this.scene.stop();
    this.scene.resume('WorldScene');
  }
}
```

- [ ] **Step 2: Register MemoryCard in main.ts**

```ts
import { MemoryCard } from './scenes/checkpoints/MemoryCard';
// Add to scene array
```

- [ ] **Step 3: Verify in browser**

Walk to a checkpoint, press E. Confirm:
- Overlay dims the world
- Card shows with placeholder photo, name, message, date
- Close button (X) and Escape work
- "Play Mini-Game" button shows if the checkpoint has one
- Progress counter updates after visiting

- [ ] **Step 4: Commit**

```bash
git add src/scenes/checkpoints/MemoryCard.ts src/main.ts
git commit -m "feat: add MemoryCard overlay with checkpoint interaction flow"
```

---

## Chunk 5: Mini-Games

### Task 9: QuizGame

**Files:**
- Create: `src/scenes/checkpoints/QuizGame.ts`
- Modify: `src/main.ts`

- [ ] **Step 1: Create QuizGame scene**

```ts
import Phaser from 'phaser';
import { saveMiniGameScore } from '../../utils/storage';

interface QuizConfig {
  questions: Array<{
    question: string;
    options: string[];
    answer: number;
  }>;
}

interface QuizData {
  checkpointId: string;
  config: QuizConfig;
}

export class QuizGame extends Phaser.Scene {
  private checkpointId!: string;
  private questions!: QuizConfig['questions'];
  private currentQuestion = 0;
  private score = 0;

  constructor() {
    super({ key: 'QuizGame' });
  }

  init(data: QuizData): void {
    this.checkpointId = data.checkpointId;
    this.questions = data.config.questions;
    this.currentQuestion = 0;
    this.score = 0;
  }

  create(): void {
    this.showQuestion();
  }

  private showQuestion(): void {
    this.children.removeAll();
    const { width, height } = this.cameras.main;
    const q = this.questions[this.currentQuestion];

    // Background
    this.add.rectangle(width / 2, height / 2, width, height, 0x1a1a2e);

    // Progress
    this.add.text(width / 2, 30, `Question ${this.currentQuestion + 1}/${this.questions.length}`, {
      fontSize: '14px',
      color: '#64748b',
    }).setOrigin(0.5);

    // Question
    this.add.text(width / 2, height / 3, q.question, {
      fontSize: '20px',
      color: '#ffffff',
      wordWrap: { width: 600 },
      align: 'center',
    }).setOrigin(0.5);

    // Options
    q.options.forEach((opt, i) => {
      const btn = this.add.text(width / 2, height / 2 + i * 50, `${String.fromCharCode(65 + i)}) ${opt}`, {
        fontSize: '18px',
        color: '#94a3b8',
        backgroundColor: '#2a2a4a',
        padding: { x: 20, y: 10 },
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });

      btn.on('pointerover', () => btn.setColor('#ffffff'));
      btn.on('pointerout', () => btn.setColor('#94a3b8'));
      btn.on('pointerdown', () => this.handleAnswer(i));
    });
  }

  private handleAnswer(selected: number): void {
    const q = this.questions[this.currentQuestion];
    if (selected === q.answer) {
      this.score++;
    }

    this.currentQuestion++;
    if (this.currentQuestion < this.questions.length) {
      this.showQuestion();
    } else {
      this.showResults();
    }
  }

  private showResults(): void {
    this.children.removeAll();
    const { width, height } = this.cameras.main;

    this.add.rectangle(width / 2, height / 2, width, height, 0x1a1a2e);

    saveMiniGameScore(this.checkpointId, this.score);

    this.add.text(width / 2, height / 3, `You got ${this.score}/${this.questions.length}!`, {
      fontSize: '32px',
      color: '#ffd700',
    }).setOrigin(0.5);

    this.add.text(width / 2, height / 3 + 50, this.score === this.questions.length ? 'Perfect! You know us so well!' : 'Nice try!', {
      fontSize: '16px',
      color: '#94a3b8',
    }).setOrigin(0.5);

    const backBtn = this.add.text(width / 2, height / 2 + 60, '[ Back to Map ]', {
      fontSize: '20px',
      color: '#22c55e',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    backBtn.on('pointerdown', () => this.returnToWorld());
  }

  private returnToWorld(): void {
    const worldScene = this.scene.get('WorldScene') as any;
    if (worldScene?.refreshUI) worldScene.refreshUI();
    this.scene.stop();
    this.scene.resume('WorldScene');
  }
}
```

- [ ] **Step 2: Register in main.ts, verify, commit**

```bash
git add src/scenes/checkpoints/QuizGame.ts src/main.ts
git commit -m "feat: add QuizGame mini-game"
```

---

### Task 10: CatchGame

**Files:**
- Create: `src/scenes/checkpoints/CatchGame.ts`
- Modify: `src/main.ts`

- [ ] **Step 1: Create CatchGame scene**

```ts
import Phaser from 'phaser';
import { saveMiniGameScore } from '../../utils/storage';

interface CatchConfig {
  items: string[];
  speed: number;
  spawnRate: number;
}

interface CatchData {
  checkpointId: string;
  config: CatchConfig;
}

export class CatchGame extends Phaser.Scene {
  private checkpointId!: string;
  private config!: CatchConfig;
  private basket!: Phaser.GameObjects.Rectangle;
  private score = 0;
  private misses = 0;
  private scoreText!: Phaser.GameObjects.Text;
  private missText!: Phaser.GameObjects.Text;
  private spawnTimer!: Phaser.Time.TimerEvent;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private gameOver = false;

  constructor() {
    super({ key: 'CatchGame' });
  }

  init(data: CatchData): void {
    this.checkpointId = data.checkpointId;
    this.config = data.config;
    this.score = 0;
    this.misses = 0;
    this.gameOver = false;
  }

  create(): void {
    const { width, height } = this.cameras.main;

    this.add.rectangle(width / 2, height / 2, width, height, 0x1a1a2e);

    // Basket
    this.basket = this.add.rectangle(width / 2, height - 40, 60, 20, 0x8B4513);
    this.physics.add.existing(this.basket);
    (this.basket.body as Phaser.Physics.Arcade.Body).setCollideWorldBounds(true);
    (this.basket.body as Phaser.Physics.Arcade.Body).setImmovable(true);

    // UI
    this.scoreText = this.add.text(10, 10, 'Caught: 0', {
      fontSize: '16px', color: '#22c55e',
    }).setScrollFactor(0);

    this.missText = this.add.text(10, 30, 'Missed: 0/3', {
      fontSize: '16px', color: '#ef4444',
    }).setScrollFactor(0);

    // Input
    this.cursors = this.input.keyboard!.createCursorKeys();

    // Spawn items
    this.spawnTimer = this.time.addEvent({
      delay: this.config.spawnRate,
      callback: this.spawnItem,
      callbackScope: this,
      loop: true,
    });
  }

  private spawnItem(): void {
    if (this.gameOver) return;
    const { width } = this.cameras.main;
    const x = Phaser.Math.Between(30, width - 30);
    const item = this.add.circle(x, -10, 10, 0xffd700);
    this.physics.add.existing(item);
    (item.body as Phaser.Physics.Arcade.Body).setVelocityY(this.config.speed * 60);
  }

  update(): void {
    if (this.gameOver) return;

    const body = this.basket.body as Phaser.Physics.Arcade.Body;
    body.setVelocityX(0);

    if (this.cursors.left.isDown) body.setVelocityX(-300);
    else if (this.cursors.right.isDown) body.setVelocityX(300);

    // Check catches and misses
    const { height } = this.cameras.main;
    this.children.list.forEach((child) => {
      if (child instanceof Phaser.GameObjects.Arc && child.body) {
        const itemBody = child.body as Phaser.Physics.Arcade.Body;
        const basketBody = this.basket.body as Phaser.Physics.Arcade.Body;

        if (Phaser.Geom.Intersects.RectangleToRectangle(
          itemBody.getBounds(new Phaser.Geom.Rectangle()),
          basketBody.getBounds(new Phaser.Geom.Rectangle())
        )) {
          this.score++;
          this.scoreText.setText(`Caught: ${this.score}`);
          child.destroy();
        } else if (child.y > height + 10) {
          this.misses++;
          this.missText.setText(`Missed: ${this.misses}/3`);
          child.destroy();
          if (this.misses >= 3) this.endGame();
        }
      }
    });
  }

  private endGame(): void {
    this.gameOver = true;
    this.spawnTimer.destroy();
    saveMiniGameScore(this.checkpointId, this.score);

    const { width, height } = this.cameras.main;
    this.add.rectangle(width / 2, height / 2, 300, 200, 0x1e1b2e)
      .setStrokeStyle(2, 0x7c3aed);

    this.add.text(width / 2, height / 2 - 40, `Caught ${this.score}!`, {
      fontSize: '28px', color: '#ffd700',
    }).setOrigin(0.5);

    const backBtn = this.add.text(width / 2, height / 2 + 30, '[ Back to Map ]', {
      fontSize: '18px', color: '#22c55e',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    backBtn.on('pointerdown', () => {
      const worldScene = this.scene.get('WorldScene') as any;
      if (worldScene?.refreshUI) worldScene.refreshUI();
      this.scene.stop();
      this.scene.resume('WorldScene');
    });
  }
}
```

- [ ] **Step 2: Register, verify, commit**

```bash
git add src/scenes/checkpoints/CatchGame.ts src/main.ts
git commit -m "feat: add CatchGame mini-game"
```

---

### Task 11: MatchGame

**Files:**
- Create: `src/scenes/checkpoints/MatchGame.ts`
- Modify: `src/main.ts`

- [ ] **Step 1: Create MatchGame scene**

```ts
import Phaser from 'phaser';
import { saveMiniGameScore } from '../../utils/storage';

interface MatchConfig {
  pairs: Array<{ a: string; b: string }>;
}

interface MatchData {
  checkpointId: string;
  config: MatchConfig;
}

export class MatchGame extends Phaser.Scene {
  private checkpointId!: string;
  private cards: Array<{ text: string; pairIndex: number; revealed: boolean; matched: boolean; obj: Phaser.GameObjects.Rectangle; label: Phaser.GameObjects.Text }> = [];
  private flipped: number[] = [];
  private moves = 0;
  private movesText!: Phaser.GameObjects.Text;
  private canFlip = true;

  constructor() {
    super({ key: 'MatchGame' });
  }

  init(data: MatchData): void {
    this.checkpointId = data.checkpointId;
    this.cards = [];
    this.flipped = [];
    this.moves = 0;
    this.canFlip = true;

    // Build card deck from pairs
    const items: Array<{ text: string; pairIndex: number }> = [];
    const pairs = data.config.pairs || [
      { a: 'Movie 1', b: 'Quote 1' },
      { a: 'Movie 2', b: 'Quote 2' },
      { a: 'Movie 3', b: 'Quote 3' },
      { a: 'Movie 4', b: 'Quote 4' },
    ];
    pairs.forEach((pair, i) => {
      items.push({ text: pair.a, pairIndex: i });
      items.push({ text: pair.b, pairIndex: i });
    });
    Phaser.Utils.Array.Shuffle(items);

    // Store for create
    (this as any).__items = items;
  }

  create(): void {
    const { width, height } = this.cameras.main;
    const items = (this as any).__items as Array<{ text: string; pairIndex: number }>;

    this.add.rectangle(width / 2, height / 2, width, height, 0x1a1a2e);

    this.add.text(width / 2, 20, 'Match the Pairs!', {
      fontSize: '22px', color: '#ffffff',
    }).setOrigin(0.5);

    this.movesText = this.add.text(width / 2, 50, 'Moves: 0', {
      fontSize: '14px', color: '#94a3b8',
    }).setOrigin(0.5);

    // Grid layout
    const cols = 4;
    const rows = Math.ceil(items.length / cols);
    const cardW = 140;
    const cardH = 60;
    const gap = 10;
    const startX = width / 2 - ((cols * (cardW + gap)) - gap) / 2 + cardW / 2;
    const startY = 90 + cardH / 2;

    items.forEach((item, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = startX + col * (cardW + gap);
      const y = startY + row * (cardH + gap);

      const card = this.add.rectangle(x, y, cardW, cardH, 0x2a2a4a)
        .setStrokeStyle(1, 0x444466)
        .setInteractive({ useHandCursor: true });

      const label = this.add.text(x, y, '?', {
        fontSize: '14px', color: '#666',
      }).setOrigin(0.5);

      const cardData = {
        text: item.text,
        pairIndex: item.pairIndex,
        revealed: false,
        matched: false,
        obj: card,
        label,
      };
      this.cards.push(cardData);

      card.on('pointerdown', () => this.flipCard(i));
    });
  }

  private flipCard(index: number): void {
    if (!this.canFlip) return;
    const card = this.cards[index];
    if (card.revealed || card.matched) return;

    card.revealed = true;
    card.obj.setFillStyle(0x3a3a5a);
    card.label.setText(card.text).setColor('#ffffff');
    this.flipped.push(index);

    if (this.flipped.length === 2) {
      this.moves++;
      this.movesText.setText(`Moves: ${this.moves}`);
      this.canFlip = false;

      const [i1, i2] = this.flipped;
      if (this.cards[i1].pairIndex === this.cards[i2].pairIndex) {
        // Match!
        this.cards[i1].matched = true;
        this.cards[i2].matched = true;
        this.cards[i1].obj.setFillStyle(0x22c55e);
        this.cards[i2].obj.setFillStyle(0x22c55e);
        this.flipped = [];
        this.canFlip = true;

        // Check win
        if (this.cards.every((c) => c.matched)) {
          this.time.delayedCall(500, () => this.showResults());
        }
      } else {
        // No match — flip back
        this.time.delayedCall(800, () => {
          this.cards[i1].revealed = false;
          this.cards[i2].revealed = false;
          this.cards[i1].obj.setFillStyle(0x2a2a4a);
          this.cards[i2].obj.setFillStyle(0x2a2a4a);
          this.cards[i1].label.setText('?').setColor('#666');
          this.cards[i2].label.setText('?').setColor('#666');
          this.flipped = [];
          this.canFlip = true;
        });
      }
    }
  }

  private showResults(): void {
    const { width, height } = this.cameras.main;
    saveMiniGameScore(this.checkpointId, this.moves, true); // lower moves = better

    this.add.rectangle(width / 2, height / 2, 300, 200, 0x1e1b2e, 0.95)
      .setStrokeStyle(2, 0x7c3aed);

    this.add.text(width / 2, height / 2 - 40, `Done in ${this.moves} moves!`, {
      fontSize: '24px', color: '#ffd700',
    }).setOrigin(0.5);

    const backBtn = this.add.text(width / 2, height / 2 + 30, '[ Back to Map ]', {
      fontSize: '18px', color: '#22c55e',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    backBtn.on('pointerdown', () => {
      const worldScene = this.scene.get('WorldScene') as any;
      if (worldScene?.refreshUI) worldScene.refreshUI();
      this.scene.stop();
      this.scene.resume('WorldScene');
    });
  }
}
```

- [ ] **Step 2: Register, verify, commit**

```bash
git add src/scenes/checkpoints/MatchGame.ts src/main.ts
git commit -m "feat: add MatchGame mini-game"
```

---

### Task 12: PuzzleGame

**Files:**
- Create: `src/scenes/checkpoints/PuzzleGame.ts`
- Modify: `src/main.ts`

- [ ] **Step 1: Create PuzzleGame scene**

```ts
import Phaser from 'phaser';
import { saveMiniGameScore } from '../../utils/storage';

interface PuzzleData {
  checkpointId: string;
  config: {
    photo?: string;
    gridSize?: number;
  };
}

export class PuzzleGame extends Phaser.Scene {
  private checkpointId!: string;
  private gridSize = 3;
  private tiles: Phaser.GameObjects.Rectangle[] = [];
  private positions: Array<{ x: number; y: number }> = [];
  private correctOrder: number[] = [];
  private currentOrder: number[] = [];
  private startTime = 0;
  private dragTile: number | null = null;

  constructor() {
    super({ key: 'PuzzleGame' });
  }

  init(data: PuzzleData): void {
    this.checkpointId = data.checkpointId;
    this.gridSize = data.config.gridSize || 3;
    this.tiles = [];
    this.positions = [];
    this.correctOrder = [];
    this.currentOrder = [];
    this.dragTile = null;
  }

  create(): void {
    const { width, height } = this.cameras.main;

    this.add.rectangle(width / 2, height / 2, width, height, 0x1a1a2e);

    this.add.text(width / 2, 20, 'Solve the Puzzle!', {
      fontSize: '22px', color: '#ffffff',
    }).setOrigin(0.5);

    const tileSize = 80;
    const gap = 4;
    const totalSize = this.gridSize * (tileSize + gap) - gap;
    const startX = width / 2 - totalSize / 2 + tileSize / 2;
    const startY = height / 2 - totalSize / 2 + tileSize / 2;

    // Create grid positions
    const indices: number[] = [];
    for (let i = 0; i < this.gridSize * this.gridSize; i++) {
      indices.push(i);
      const row = Math.floor(i / this.gridSize);
      const col = i % this.gridSize;
      this.positions.push({
        x: startX + col * (tileSize + gap),
        y: startY + row * (tileSize + gap),
      });
    }
    this.correctOrder = [...indices];

    // Shuffle
    const shuffled = [...indices];
    Phaser.Utils.Array.Shuffle(shuffled);
    this.currentOrder = shuffled;

    // Create tiles with colored segments to form a gradient pattern
    shuffled.forEach((tileIndex, posIndex) => {
      const pos = this.positions[posIndex];
      const hue = (tileIndex / (this.gridSize * this.gridSize)) * 360;
      const color = Phaser.Display.Color.HSLToColor(hue / 360, 0.6, 0.5).color;

      const tile = this.add.rectangle(pos.x, pos.y, tileSize, tileSize, color)
        .setStrokeStyle(1, 0x444466)
        .setInteractive({ useHandCursor: true, draggable: true });

      const label = this.add.text(pos.x, pos.y, `${tileIndex + 1}`, {
        fontSize: '20px', color: '#ffffff',
      }).setOrigin(0.5);

      (tile as any).__tileIndex = tileIndex;
      (tile as any).__posIndex = posIndex;
      (tile as any).__label = label;
      this.tiles.push(tile);
    });

    // Drag events
    this.input.on('dragstart', (_pointer: Phaser.Input.Pointer, obj: Phaser.GameObjects.Rectangle) => {
      obj.setDepth(100);
      (obj as any).__label.setDepth(101);
    });

    this.input.on('drag', (_pointer: Phaser.Input.Pointer, obj: Phaser.GameObjects.Rectangle, dragX: number, dragY: number) => {
      obj.x = dragX;
      obj.y = dragY;
      (obj as any).__label.setPosition(dragX, dragY);
    });

    this.input.on('dragend', (_pointer: Phaser.Input.Pointer, obj: Phaser.GameObjects.Rectangle) => {
      // Find closest position
      let closestPos = 0;
      let closestDist = Infinity;
      this.positions.forEach((pos, i) => {
        const dist = Phaser.Math.Distance.Between(obj.x, obj.y, pos.x, pos.y);
        if (dist < closestDist) {
          closestDist = dist;
          closestPos = i;
        }
      });

      // Swap with tile at that position
      const myPosIndex = (obj as any).__posIndex;
      const otherTile = this.tiles.find((t) => (t as any).__posIndex === closestPos);

      if (otherTile && otherTile !== obj) {
        // Swap positions
        (otherTile as any).__posIndex = myPosIndex;
        (obj as any).__posIndex = closestPos;

        const otherPos = this.positions[myPosIndex];
        otherTile.setPosition(otherPos.x, otherPos.y);
        (otherTile as any).__label.setPosition(otherPos.x, otherPos.y);

        // Update current order
        this.currentOrder[myPosIndex] = (otherTile as any).__tileIndex;
        this.currentOrder[closestPos] = (obj as any).__tileIndex;
      }

      const snapPos = this.positions[closestPos];
      obj.setPosition(snapPos.x, snapPos.y);
      (obj as any).__label.setPosition(snapPos.x, snapPos.y);
      obj.setDepth(0);
      (obj as any).__label.setDepth(1);

      // Check win
      this.checkWin();
    });

    this.startTime = Date.now();
  }

  private checkWin(): void {
    const isCorrect = this.currentOrder.every((val, i) => val === this.correctOrder[i]);
    if (isCorrect) {
      const elapsed = Math.round((Date.now() - this.startTime) / 1000);
      this.showResults(elapsed);
    }
  }

  private showResults(seconds: number): void {
    const { width, height } = this.cameras.main;
    saveMiniGameScore(this.checkpointId, seconds, true); // lower time = better

    this.add.rectangle(width / 2, height / 2, 300, 200, 0x1e1b2e, 0.95)
      .setStrokeStyle(2, 0x7c3aed).setDepth(200);

    this.add.text(width / 2, height / 2 - 40, `Solved in ${seconds}s!`, {
      fontSize: '24px', color: '#ffd700',
    }).setOrigin(0.5).setDepth(201);

    const backBtn = this.add.text(width / 2, height / 2 + 30, '[ Back to Map ]', {
      fontSize: '18px', color: '#22c55e',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(201);

    backBtn.on('pointerdown', () => {
      const worldScene = this.scene.get('WorldScene') as any;
      if (worldScene?.refreshUI) worldScene.refreshUI();
      this.scene.stop();
      this.scene.resume('WorldScene');
    });
  }
}
```

- [ ] **Step 2: Register, verify, commit**

```bash
git add src/scenes/checkpoints/PuzzleGame.ts src/main.ts
git commit -m "feat: add PuzzleGame mini-game"
```

---

### Task 13: CookingGame

**Files:**
- Create: `src/scenes/checkpoints/CookingGame.ts`
- Modify: `src/main.ts`

- [ ] **Step 1: Create CookingGame scene**

```ts
import Phaser from 'phaser';
import { saveMiniGameScore } from '../../utils/storage';

interface CookingConfig {
  orders: Array<{ name: string; items: string[] }>;
  timeLimit: number;
}

interface CookingData {
  checkpointId: string;
  config: CookingConfig;
}

export class CookingGame extends Phaser.Scene {
  private checkpointId!: string;
  private config!: CookingConfig;
  private currentOrderIndex = 0;
  private selectedItems: string[] = [];
  private score = 0;
  private timeLeft = 30;
  private timerText!: Phaser.GameObjects.Text;
  private scoreText!: Phaser.GameObjects.Text;
  private orderText!: Phaser.GameObjects.Text;
  private selectedText!: Phaser.GameObjects.Text;
  private gameOver = false;
  private timerEvent!: Phaser.Time.TimerEvent;

  constructor() {
    super({ key: 'CookingGame' });
  }

  init(data: CookingData): void {
    this.checkpointId = data.checkpointId;
    this.config = data.config;
    this.currentOrderIndex = 0;
    this.selectedItems = [];
    this.score = 0;
    this.timeLeft = data.config.timeLimit;
    this.gameOver = false;
  }

  create(): void {
    const { width, height } = this.cameras.main;

    this.add.rectangle(width / 2, height / 2, width, height, 0x1a1a2e);

    this.add.text(width / 2, 20, 'Fill the Orders!', {
      fontSize: '22px', color: '#ffffff',
    }).setOrigin(0.5);

    // Timer
    this.timerText = this.add.text(width - 20, 20, `Time: ${this.timeLeft}s`, {
      fontSize: '16px', color: '#ef4444',
    }).setOrigin(1, 0);

    this.scoreText = this.add.text(20, 20, `Orders: ${this.score}`, {
      fontSize: '16px', color: '#22c55e',
    });

    // Current order display
    this.orderText = this.add.text(width / 2, 70, '', {
      fontSize: '16px', color: '#ffd700', align: 'center',
    }).setOrigin(0.5);

    // Selected items display
    this.selectedText = this.add.text(width / 2, height - 120, 'Your tray: (empty)', {
      fontSize: '14px', color: '#94a3b8',
    }).setOrigin(0.5);

    // Gather all unique items from all orders
    const allItems = new Set<string>();
    this.config.orders.forEach((o) => o.items.forEach((item) => allItems.add(item)));
    const itemList = Array.from(allItems);

    // Item shelf
    const shelfY = height / 2 + 40;
    itemList.forEach((item, i) => {
      const btn = this.add.text(
        width / 2 - ((itemList.length - 1) * 70) / 2 + i * 70,
        shelfY,
        item.replace(/-/g, ' '),
        {
          fontSize: '13px',
          color: '#ffffff',
          backgroundColor: '#2a2a4a',
          padding: { x: 8, y: 12 },
        }
      ).setOrigin(0.5).setInteractive({ useHandCursor: true });

      btn.on('pointerover', () => btn.setBackgroundColor('#3a3a5a'));
      btn.on('pointerout', () => btn.setBackgroundColor('#2a2a4a'));
      btn.on('pointerdown', () => this.selectItem(item));
    });

    // Submit button
    const submitBtn = this.add.text(width / 2, height - 60, '[ Submit Order ]', {
      fontSize: '18px', color: '#7c3aed',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    submitBtn.on('pointerdown', () => this.submitOrder());

    // Clear button
    const clearBtn = this.add.text(width / 2, height - 30, '[ Clear ]', {
      fontSize: '14px', color: '#ef4444',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    clearBtn.on('pointerdown', () => {
      this.selectedItems = [];
      this.selectedText.setText('Your tray: (empty)');
    });

    this.showCurrentOrder();

    // Timer
    this.timerEvent = this.time.addEvent({
      delay: 1000,
      callback: () => {
        this.timeLeft--;
        this.timerText.setText(`Time: ${this.timeLeft}s`);
        if (this.timeLeft <= 0) this.endGame();
      },
      loop: true,
    });
  }

  private showCurrentOrder(): void {
    if (this.currentOrderIndex >= this.config.orders.length) {
      // Cycle orders
      this.currentOrderIndex = 0;
    }
    const order = this.config.orders[this.currentOrderIndex];
    this.orderText.setText(`Order: "${order.name}"\nNeed: ${order.items.map((i) => i.replace(/-/g, ' ')).join(', ')}`);
  }

  private selectItem(item: string): void {
    if (this.gameOver) return;
    this.selectedItems.push(item);
    this.selectedText.setText(`Your tray: ${this.selectedItems.map((i) => i.replace(/-/g, ' ')).join(', ')}`);
  }

  private submitOrder(): void {
    if (this.gameOver) return;
    const order = this.config.orders[this.currentOrderIndex];

    // Check if selected items match order (same items, same order)
    const correct = order.items.length === this.selectedItems.length &&
      order.items.every((item, i) => item === this.selectedItems[i]);

    if (correct) {
      this.score++;
      this.scoreText.setText(`Orders: ${this.score}`);
      this.currentOrderIndex++;
      this.showCurrentOrder();
    }

    this.selectedItems = [];
    this.selectedText.setText('Your tray: (empty)');
  }

  private endGame(): void {
    this.gameOver = true;
    this.timerEvent.destroy();
    saveMiniGameScore(this.checkpointId, this.score);

    const { width, height } = this.cameras.main;

    this.add.rectangle(width / 2, height / 2, 300, 200, 0x1e1b2e, 0.95)
      .setStrokeStyle(2, 0x7c3aed).setDepth(200);

    this.add.text(width / 2, height / 2 - 40, `${this.score} orders filled!`, {
      fontSize: '24px', color: '#ffd700',
    }).setOrigin(0.5).setDepth(201);

    const backBtn = this.add.text(width / 2, height / 2 + 30, '[ Back to Map ]', {
      fontSize: '18px', color: '#22c55e',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(201);

    backBtn.on('pointerdown', () => {
      const worldScene = this.scene.get('WorldScene') as any;
      if (worldScene?.refreshUI) worldScene.refreshUI();
      this.scene.stop();
      this.scene.resume('WorldScene');
    });
  }
}
```

- [ ] **Step 2: Register, verify, commit**

```bash
git add src/scenes/checkpoints/CookingGame.ts src/main.ts
git commit -m "feat: add CookingGame mini-game"
```

---

## Chunk 6: Completion + Deployment

### Task 14: Verify completion overlay works

The completion check and `showCompletionOverlay()` are already built into WorldScene's `refreshUI()` method (Task 6). This task is a verification step.

- [ ] **Step 1: Test completion flow**

In browser, visit all checkpoints and verify:
- Congratulations overlay appears after the last checkpoint is visited
- "Continue Exploring" button dismisses the overlay
- Overlay does NOT reappear on subsequent checkpoint interactions
- Progress counter is still visible after dismissing

- [ ] **Step 2: Commit any fixes if needed**

```bash
git add src/scenes/WorldScene.ts
git commit -m "fix: verify and polish completion overlay"
```

---

### Task 15: Final main.ts with all scenes registered

**Files:**
- Modify: `src/main.ts`

- [ ] **Step 1: Ensure all scenes are imported and registered**

```ts
import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { MenuScene } from './scenes/MenuScene';
import { AvatarScene } from './scenes/AvatarScene';
import { WorldScene } from './scenes/WorldScene';
import { MemoryCard } from './scenes/checkpoints/MemoryCard';
import { QuizGame } from './scenes/checkpoints/QuizGame';
import { CatchGame } from './scenes/checkpoints/CatchGame';
import { MatchGame } from './scenes/checkpoints/MatchGame';
import { PuzzleGame } from './scenes/checkpoints/PuzzleGame';
import { CookingGame } from './scenes/checkpoints/CookingGame';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  parent: document.body,
  backgroundColor: '#1a1a2e',
  pixelArt: true,
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene, MenuScene, AvatarScene, WorldScene, MemoryCard, QuizGame, CatchGame, MatchGame, PuzzleGame, CookingGame],
};

new Phaser.Game(config);
```

- [ ] **Step 2: Verify full game flow**

```bash
npm run dev
```

Test the complete flow:
1. Boot → loading bar → Menu
2. New Game → Avatar customization → pick colors → Start Adventure
3. Walk around the map with WASD
4. Walk to a checkpoint → "Press E" → Memory card opens
5. Play a mini-game → score shown → back to map
6. Visit all checkpoints → congratulations overlay
7. Refresh browser → Continue resumes from saved state

- [ ] **Step 3: Commit**

```bash
git add src/main.ts
git commit -m "feat: register all scenes in final game config"
```

---

### Task 16: Build and deployment config

**Files:**
- Verify: `vite.config.ts`
- Verify: `package.json`

- [ ] **Step 1: Test production build**

```bash
npm run build
```

Expected: `dist/` folder created with `index.html` and bundled JS/assets.

- [ ] **Step 2: Test preview**

```bash
npm run preview
```

Open the preview URL, verify game works in production build.

- [ ] **Step 3: Add .gitignore entry for dist if missing**

Verify `.gitignore` includes `dist/`.

- [ ] **Step 4: Commit any final adjustments**

```bash
git add -A
git commit -m "chore: verify production build and deployment readiness"
```

---

### Task 17: Deployment to Render

- [ ] **Step 1: Push to a Git remote (GitHub or GitLab)**

Create a repo and push:
```bash
git remote add origin <repo-url>
git push -u origin master
```

- [ ] **Step 2: Create Render static site**

On Render dashboard:
- New → Static Site
- Connect to your Git repo
- Build command: `npm install && npm run build`
- Publish directory: `dist`

- [ ] **Step 3: Verify deployed site works**

Open the Render URL and test the full game flow.

---

## Summary

| Task | Description | Dependencies |
|------|-------------|-------------|
| 1 | Project scaffolding (Vite + TS + Phaser) | None |
| 2 | Storage utility | None |
| 3 | Placeholder assets + checkpoint data | None |
| 4 | BootScene (loading + textures) | 1 |
| 5 | MenuScene | 2, 4 |
| 6 | WorldScene (map, movement, camera) | 2, 3, 4 |
| 7 | AvatarScene | 2 |
| 8 | MemoryCard overlay | 6 |
| 9 | QuizGame | 8 |
| 10 | CatchGame | 8 |
| 11 | MatchGame | 8 |
| 12 | PuzzleGame | 8 |
| 13 | CookingGame | 8 |
| 14 | Completion overlay | 6 |
| 15 | Final main.ts | All scenes |
| 16 | Production build | 15 |
| 17 | Deploy to Render | 16 |
