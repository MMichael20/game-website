# Our Places v2 — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild "Our Places" as a polished pixel art couples' exploration game with HTML/CSS UI overlay, 3 mini-games, and a dense village map.

**Architecture:** Phaser 3 game renders the world (tiles, sprites, sky, particles). All UI lives in the DOM as HTML/CSS overlays managed by a singleton UIManager. Scenes communicate with UI via the UIManager bridge. Input is unified via InputSystem (keyboard + virtual joystick).

**Tech Stack:** Phaser 3.90, TypeScript 5.9, Vite 8, HTML/CSS for UI

**Spec:** `docs/superpowers/specs/2026-03-16-our-places-v2-design.md`

---

## Chunk 1: Project Scaffolding & Core Infrastructure

### Task 1: Move v1 code and set up v2 project structure

**Files:**
- Move: `src/` → `src-v1/`
- Create: `src/main.ts`
- Create: `src/utils/constants.ts`
- Modify: `index.html`

- [ ] **Step 1: Move existing src to src-v1**

```bash
git mv src src-v1
```

- [ ] **Step 2: Create new src directory structure**

```bash
mkdir -p src/game/scenes/minigames
mkdir -p src/game/entities
mkdir -p src/game/systems
mkdir -p src/game/rendering
mkdir -p src/game/data
mkdir -p src/ui/components
mkdir -p src/ui/styles
mkdir -p src/assets/sprites/characters
mkdir -p src/assets/sprites/npcs
mkdir -p src/assets/sprites/items
mkdir -p src/assets/tiles
mkdir -p src/assets/ui
mkdir -p src/assets/audio
mkdir -p src/utils
```

- [ ] **Step 3: Create constants.ts**

```typescript
// src/utils/constants.ts
export const TILE_SIZE = 32;
export const MAP_WIDTH = 30;   // tiles
export const MAP_HEIGHT = 24;  // tiles
export const MAP_PX_WIDTH = MAP_WIDTH * TILE_SIZE;   // 960
export const MAP_PX_HEIGHT = MAP_HEIGHT * TILE_SIZE;  // 768

export const GAME_WIDTH = 800;
export const GAME_HEIGHT = 600;

// Camera zoom per device class — tunable starting values
export function getDeviceZoom(): number {
  const w = window.innerWidth;
  if (w < 768) return 1.5;   // phone
  if (w < 1024) return 1.75; // tablet
  return 2;                   // desktop
}

export function isTouchDevice(): boolean {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

export const DEFAULT_SPAWN = { x: 15, y: 12 }; // center of map, in tile coords

export const OUTFIT_NAMES = [
  'Casual', 'Formal', 'Beach', 'Winter',
  'Gothic', 'Sporty', 'Festival', 'Elegant',
] as const;

export const OUTFIT_COUNT = OUTFIT_NAMES.length;
```

- [ ] **Step 4: Update index.html with game container and ui-layer**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="mobile-web-app-capable" content="yes" />
  <title>Our Places</title>
  <link rel="stylesheet" href="/src/ui/styles/base.css" />
  <link rel="stylesheet" href="/src/ui/styles/hud.css" />
  <link rel="stylesheet" href="/src/ui/styles/menus.css" />
  <link rel="stylesheet" href="/src/ui/styles/minigames.css" />
</head>
<body>
  <div id="game-container">
    <div id="ui-layer">
      <div id="hud"></div>
      <div id="dialog-container"></div>
      <div id="menu-container"></div>
    </div>
  </div>
  <script type="module" src="/src/main.ts"></script>
</body>
</html>
```

- [ ] **Step 5: Create base.css with theme variables and reset**

```css
/* src/ui/styles/base.css */
@import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&family=Inter:wght@400;600;700&display=swap');

:root {
  --color-primary: #d4a574;
  --color-secondary: #7b5ea7;
  --color-bg: #fdf6e3;
  --color-text: #3c3c3c;
  --color-accent: #e8836b;
  --font-display: 'Press Start 2P', monospace;
  --font-body: 'Inter', sans-serif;
  --radius: 8px;
  --shadow: 0 4px 12px rgba(0,0,0,0.15);
}

* { margin: 0; padding: 0; box-sizing: border-box; }

html, body {
  width: 100%; height: 100%;
  overflow: hidden;
  background: #1a1a2e;
  font-family: var(--font-body);
}

body {
  display: flex; justify-content: center; align-items: center;
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  padding: env(safe-area-inset-top) env(safe-area-inset-right)
           env(safe-area-inset-bottom) env(safe-area-inset-left);
}

#game-container {
  position: relative;
  width: 100%; height: 100%;
}

#game-container canvas {
  display: block;
  width: 100% !important;
  height: 100% !important;
}

#ui-layer {
  position: absolute;
  top: 0; left: 0;
  width: 100%; height: 100%;
  pointer-events: none;
  z-index: 10;
}

#ui-layer > * {
  pointer-events: auto;
}

#hud, #dialog-container, #menu-container {
  position: absolute;
  top: 0; left: 0;
  width: 100%; height: 100%;
  pointer-events: none;
}

#hud > *, #dialog-container > *, #menu-container > * {
  pointer-events: auto;
}
```

- [ ] **Step 6: Create stub CSS files**

```css
/* src/ui/styles/hud.css */
/* HUD styles — populated in Task 7 */

/* src/ui/styles/menus.css */
/* Menu and dialog styles — populated in Task 6 */

/* src/ui/styles/minigames.css */
/* Mini-game overlay styles — populated in Tasks 11-13 */
```

- [ ] **Step 7: Create main.ts with Phaser config and UIManager init**

```typescript
// src/main.ts
import Phaser from 'phaser';
import { uiManager } from './ui/UIManager';
import { BootScene } from './game/scenes/BootScene';
import { DressingRoomScene } from './game/scenes/DressingRoomScene';
import { WorldScene } from './game/scenes/WorldScene';
import { QuizScene } from './game/scenes/minigames/QuizScene';
import { CatchScene } from './game/scenes/minigames/CatchScene';
import { MatchScene } from './game/scenes/minigames/MatchScene';
import { GAME_WIDTH, GAME_HEIGHT } from './utils/constants';

// Initialize UI layer before Phaser
const uiLayer = document.getElementById('ui-layer');
if (uiLayer) {
  uiManager.init(uiLayer);
}

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  parent: 'game-container',
  backgroundColor: '#1a1a2e',
  physics: {
    default: 'arcade',
    arcade: { gravity: { x: 0, y: 0 }, debug: false },
  },
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
  },
  input: {
    touch: { capture: true },
  },
  scene: [BootScene, DressingRoomScene, WorldScene, QuizScene, CatchScene, MatchScene],
};

new Phaser.Game(config);
```

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat(v2): scaffold project structure, constants, index.html, main.ts"
```

---

### Task 2: UIManager singleton

**Files:**
- Create: `src/ui/UIManager.ts`

- [ ] **Step 1: Create UIManager with init and basic show/hide methods**

```typescript
// src/ui/UIManager.ts

export interface CheckpointStatus {
  id: string;
  name: string;
  visited: boolean;
}

export interface DialogConfig {
  title: string;
  message: string;
  buttons: Array<{ label: string; onClick: () => void }>;
}

export interface MinigameOverlayConfig {
  title: string;
  score?: number;
  timer?: number;
  maxScore?: number;
  progress?: string; // e.g. "2/5"
}

export interface SettingsConfig {
  onClose: () => void;
  onFullscreen: () => void;
  onNewGame: () => void;
}

export interface DressingRoomConfig {
  playerOutfitName: string;
  partnerOutfitName: string;
  onPrevPlayer: () => void;
  onNextPlayer: () => void;
  onPrevPartner: () => void;
  onNextPartner: () => void;
  onStart: () => void;
}

class UIManager {
  private container!: HTMLElement;
  private hud!: HTMLElement;
  private dialogContainer!: HTMLElement;
  private menuContainer!: HTMLElement;

  init(container: HTMLElement): void {
    this.container = container;
    this.hud = container.querySelector('#hud') as HTMLElement;
    this.dialogContainer = container.querySelector('#dialog-container') as HTMLElement;
    this.menuContainer = container.querySelector('#menu-container') as HTMLElement;
  }

  // --- Main Menu ---
  showMainMenu(onNewGame: () => void, onContinue: () => void | null): void {
    this.menuContainer.innerHTML = '';
    const menu = document.createElement('div');
    menu.className = 'main-menu';
    menu.innerHTML = `
      <h1 class="main-menu__title">Our Places</h1>
      <div class="main-menu__buttons">
        <button class="btn btn--primary" data-action="new">New Game</button>
        ${onContinue ? '<button class="btn btn--secondary" data-action="continue">Continue</button>' : ''}
      </div>
    `;
    menu.querySelector('[data-action="new"]')?.addEventListener('click', onNewGame);
    menu.querySelector('[data-action="continue"]')?.addEventListener('click', onContinue);
    this.menuContainer.appendChild(menu);
  }

  hideMainMenu(): void {
    this.menuContainer.innerHTML = '';
  }

  // --- HUD ---
  showHUD(checkpoints: CheckpointStatus[]): void {
    this.hud.innerHTML = '';
    const hudEl = document.createElement('div');
    hudEl.className = 'hud';
    hudEl.innerHTML = `
      <div class="hud__progress">
        ${checkpoints.map(cp => `
          <span class="hud__checkpoint ${cp.visited ? 'hud__checkpoint--visited' : ''}"
                title="${cp.name}">
            ${cp.visited ? '✓' : '○'}
          </span>
        `).join('')}
      </div>
      <button class="hud__settings-btn" title="Settings">⚙</button>
    `;
    this.hud.appendChild(hudEl);
  }

  updateHUD(checkpoints: CheckpointStatus[]): void {
    this.showHUD(checkpoints); // simple re-render
  }

  hideHUD(): void {
    this.hud.innerHTML = '';
  }

  // --- Interaction Prompt ---
  showInteractionPrompt(text: string): void {
    this.hideInteractionPrompt();
    const prompt = document.createElement('div');
    prompt.className = 'interaction-prompt';
    prompt.id = 'interaction-prompt';
    prompt.textContent = text;
    this.hud.appendChild(prompt);
  }

  hideInteractionPrompt(): void {
    document.getElementById('interaction-prompt')?.remove();
  }

  // --- Dialog ---
  showDialog(config: DialogConfig): void {
    this.dialogContainer.innerHTML = '';
    const dialog = document.createElement('div');
    dialog.className = 'dialog-overlay';
    dialog.innerHTML = `
      <div class="dialog">
        <h2 class="dialog__title">${config.title}</h2>
        <p class="dialog__message">${config.message}</p>
        <div class="dialog__buttons">
          ${config.buttons.map((btn, i) => `
            <button class="btn btn--primary" data-btn="${i}">${btn.label}</button>
          `).join('')}
        </div>
      </div>
    `;
    config.buttons.forEach((btn, i) => {
      dialog.querySelector(`[data-btn="${i}"]`)?.addEventListener('click', btn.onClick);
    });
    this.dialogContainer.appendChild(dialog);
  }

  hideDialog(): void {
    this.dialogContainer.innerHTML = '';
  }

  // --- Mini-game Overlay ---
  showMinigameOverlay(config: MinigameOverlayConfig): void {
    this.hideMinigameOverlay();
    const overlay = document.createElement('div');
    overlay.className = 'minigame-overlay';
    overlay.id = 'minigame-overlay';
    overlay.innerHTML = `
      <div class="minigame-overlay__header">
        <span class="minigame-overlay__title">${config.title}</span>
        ${config.progress ? `<span class="minigame-overlay__progress">${config.progress}</span>` : ''}
      </div>
      <div class="minigame-overlay__stats">
        ${config.score !== undefined ? `<span class="minigame-overlay__score">Score: <strong>${config.score}</strong></span>` : ''}
        ${config.timer !== undefined ? `<span class="minigame-overlay__timer">Time: <strong>${config.timer}s</strong></span>` : ''}
      </div>
    `;
    this.hud.appendChild(overlay);
  }

  updateMinigameOverlay(data: Partial<MinigameOverlayConfig>): void {
    const overlay = document.getElementById('minigame-overlay');
    if (!overlay) return;
    if (data.score !== undefined) {
      const el = overlay.querySelector('.minigame-overlay__score strong');
      if (el) el.textContent = String(data.score);
    }
    if (data.timer !== undefined) {
      const el = overlay.querySelector('.minigame-overlay__timer strong');
      if (el) el.textContent = `${data.timer}s`;
    }
    if (data.progress) {
      const el = overlay.querySelector('.minigame-overlay__progress');
      if (el) el.textContent = data.progress;
    }
  }

  hideMinigameOverlay(): void {
    document.getElementById('minigame-overlay')?.remove();
  }

  // --- Completion Screen ---
  showCompletionScreen(scores: Record<string, number>): void {
    this.menuContainer.innerHTML = '';
    const screen = document.createElement('div');
    screen.className = 'completion-screen';
    const scoreEntries = Object.entries(scores)
      .map(([name, score]) => `<li>${name}: ${score}</li>`)
      .join('');
    screen.innerHTML = `
      <div class="completion-screen__content">
        <h1 class="completion-screen__title">🎉 Adventure Complete!</h1>
        <p class="completion-screen__message">You visited all the places together!</p>
        <ul class="completion-screen__scores">${scoreEntries}</ul>
        <button class="btn btn--primary" id="completion-restart">Play Again</button>
      </div>
    `;
    this.menuContainer.appendChild(screen);
  }

  // --- Settings ---
  showSettings(config: SettingsConfig): void {
    this.dialogContainer.innerHTML = '';
    const panel = document.createElement('div');
    panel.className = 'dialog-overlay';
    panel.innerHTML = `
      <div class="settings-panel">
        <h2 class="settings-panel__title">Settings</h2>
        <button class="btn btn--secondary settings-panel__btn" data-action="fullscreen">Toggle Fullscreen</button>
        <button class="btn btn--secondary settings-panel__btn" data-action="newgame">New Game</button>
        <button class="btn btn--primary settings-panel__btn" data-action="close">Close</button>
      </div>
    `;
    panel.querySelector('[data-action="fullscreen"]')?.addEventListener('click', config.onFullscreen);
    panel.querySelector('[data-action="newgame"]')?.addEventListener('click', config.onNewGame);
    panel.querySelector('[data-action="close"]')?.addEventListener('click', config.onClose);
    this.dialogContainer.appendChild(panel);
  }

  // --- Dressing Room ---
  showDressingRoom(config: DressingRoomConfig): void {
    this.hideDressingRoom();
    const el = document.createElement('div');
    el.className = 'dressing-room-ui';
    el.id = 'dressing-room-ui';
    el.innerHTML = `
      <div class="dressing-room-ui__row">
        <div class="dressing-room-ui__picker">
          <span class="dressing-room-ui__label">Her</span>
          <div class="dressing-room-ui__controls">
            <button class="btn btn--icon" data-action="prev-player">◀</button>
            <span class="dressing-room-ui__outfit-name" id="player-outfit-name">${config.playerOutfitName}</span>
            <button class="btn btn--icon" data-action="next-player">▶</button>
          </div>
        </div>
        <div class="dressing-room-ui__picker">
          <span class="dressing-room-ui__label">Him</span>
          <div class="dressing-room-ui__controls">
            <button class="btn btn--icon" data-action="prev-partner">◀</button>
            <span class="dressing-room-ui__outfit-name" id="partner-outfit-name">${config.partnerOutfitName}</span>
            <button class="btn btn--icon" data-action="next-partner">▶</button>
          </div>
        </div>
      </div>
      <button class="btn btn--primary dressing-room-ui__start" data-action="start">Start Adventure ♥</button>
    `;
    el.querySelector('[data-action="prev-player"]')?.addEventListener('click', config.onPrevPlayer);
    el.querySelector('[data-action="next-player"]')?.addEventListener('click', config.onNextPlayer);
    el.querySelector('[data-action="prev-partner"]')?.addEventListener('click', config.onPrevPartner);
    el.querySelector('[data-action="next-partner"]')?.addEventListener('click', config.onNextPartner);
    el.querySelector('[data-action="start"]')?.addEventListener('click', config.onStart);
    this.menuContainer.appendChild(el);
  }

  updateDressingRoom(playerOutfitName: string, partnerOutfitName: string): void {
    const pEl = document.getElementById('player-outfit-name');
    const partEl = document.getElementById('partner-outfit-name');
    if (pEl) pEl.textContent = playerOutfitName;
    if (partEl) partEl.textContent = partnerOutfitName;
  }

  hideDressingRoom(): void {
    document.getElementById('dressing-room-ui')?.remove();
  }

  // --- Quiz-specific ---
  showQuizQuestion(question: string, options: string[], onAnswer: (index: number) => void): void {
    this.hideQuizQuestion();
    const el = document.createElement('div');
    el.className = 'quiz-overlay';
    el.id = 'quiz-overlay';
    el.innerHTML = `
      <div class="quiz-overlay__question">${question}</div>
      <div class="quiz-overlay__options">
        ${options.map((opt, i) => `
          <button class="btn btn--quiz" data-answer="${i}">${opt}</button>
        `).join('')}
      </div>
    `;
    options.forEach((_, i) => {
      el.querySelector(`[data-answer="${i}"]`)?.addEventListener('click', () => onAnswer(i));
    });
    this.dialogContainer.appendChild(el);
  }

  showQuizFeedback(correct: boolean, correctAnswer: string): void {
    const el = document.getElementById('quiz-overlay');
    if (!el) return;
    const feedback = document.createElement('div');
    feedback.className = `quiz-overlay__feedback quiz-overlay__feedback--${correct ? 'correct' : 'wrong'}`;
    feedback.textContent = correct ? '✓ Correct!' : `✗ It was: ${correctAnswer}`;
    el.appendChild(feedback);
  }

  hideQuizQuestion(): void {
    document.getElementById('quiz-overlay')?.remove();
  }

  // --- Match result screen ---
  showMinigameResult(title: string, score: number, onContinue: () => void): void {
    this.dialogContainer.innerHTML = '';
    const el = document.createElement('div');
    el.className = 'dialog-overlay';
    el.innerHTML = `
      <div class="dialog">
        <h2 class="dialog__title">${title}</h2>
        <p class="dialog__message">Score: ${score}</p>
        <button class="btn btn--primary" id="minigame-continue">Continue</button>
      </div>
    `;
    el.querySelector('#minigame-continue')?.addEventListener('click', onContinue);
    this.dialogContainer.appendChild(el);
  }
}

export const uiManager = new UIManager();
```

- [ ] **Step 2: Commit**

```bash
git add src/ui/UIManager.ts
git commit -m "feat(v2): add UIManager singleton with all UI methods"
```

---

### Task 3: SaveSystem with v1 migration

**Files:**
- Create: `src/game/systems/SaveSystem.ts`
- Create: `src/game/data/checkpoints.ts`
- Copy: `src-v1/data/checkpoints.json` → `src/game/data/checkpoints.json`

- [ ] **Step 1: Copy checkpoints.json from v1**

```bash
cp src-v1/data/checkpoints.json src/game/data/checkpoints.json
```

- [ ] **Step 2: Create checkpoints.ts typed wrapper**

```typescript
// src/game/data/checkpoints.ts
import checkpointData from './checkpoints.json';

export interface QuizConfig {
  questions: Array<{
    question: string;
    options: string[];
    answer: number;
  }>;
}

export interface CatchConfig {
  items: string[];
  speed: number;
  spawnRate: number;
}

export interface MatchConfig {
  pairs: Array<{ a: string; b: string }>;
}

export interface Checkpoint {
  id: string;
  name: string;
  icon: string;
  miniGame: {
    type: 'quiz' | 'catch' | 'match';
    config: QuizConfig | CatchConfig | MatchConfig;
  };
}

// MVP checkpoints only — cafe, home, pizzeria deferred
export const CHECKPOINTS: Checkpoint[] = (checkpointData as any).checkpoints
  .filter((cp: any) => ['restaurant', 'park', 'cinema'].includes(cp.id) && cp.miniGame != null)
  .map((cp: any) => ({ id: cp.id, name: cp.name, icon: cp.icon, miniGame: cp.miniGame }));

export const VALID_CHECKPOINT_IDS = CHECKPOINTS.map(cp => cp.id);
```

- [ ] **Step 3: Create SaveSystem.ts**

```typescript
// src/game/systems/SaveSystem.ts
import { VALID_CHECKPOINT_IDS } from '../data/checkpoints';
import { DEFAULT_SPAWN } from '../../utils/constants';

export interface GameStateV2 {
  version: 2;
  outfits: { player: number; partner: number };
  visitedCheckpoints: string[];
  miniGameScores: Record<string, number>;
  bestScores: Record<string, number>;
  playerPosition?: { x: number; y: number };
}

const STORAGE_KEY = 'couples-map-game';

export function getDefaultState(): GameStateV2 {
  return {
    version: 2,
    outfits: { player: 0, partner: 0 },
    visitedCheckpoints: [],
    miniGameScores: {},
    bestScores: {},
  };
}

function migrate(raw: any): GameStateV2 {
  if (raw?.version === 2) return raw as GameStateV2;
  if (raw?.version && raw.version > 2) return getDefaultState();

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

export function loadGameState(): GameStateV2 {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultState();
    return migrate(JSON.parse(raw));
  } catch {
    return getDefaultState();
  }
}

export function saveGameState(state: GameStateV2): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function hasSavedGame(): boolean {
  const state = loadGameState();
  return state.visitedCheckpoints.length > 0;
}

export function clearGameState(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function markCheckpointVisited(id: string): void {
  const state = loadGameState();
  if (!state.visitedCheckpoints.includes(id)) {
    state.visitedCheckpoints.push(id);
    saveGameState(state);
  }
}

export function saveMiniGameScore(id: string, score: number): void {
  const state = loadGameState();
  state.miniGameScores[id] = score;
  if (!state.bestScores[id] || score > state.bestScores[id]) {
    state.bestScores[id] = score;
  }
  saveGameState(state);
}

export function savePlayerPosition(x: number, y: number): void {
  const state = loadGameState();
  state.playerPosition = { x, y };
  saveGameState(state);
}

export function getPlayerSpawn(): { x: number; y: number } {
  const state = loadGameState();
  return state.playerPosition ?? {
    x: DEFAULT_SPAWN.x * 32,
    y: DEFAULT_SPAWN.y * 32,
  };
}

export function saveOutfits(player: number, partner: number): void {
  const state = loadGameState();
  state.outfits = { player, partner };
  saveGameState(state);
}
```

- [ ] **Step 4: Commit**

```bash
git add src/game/data/ src/game/systems/SaveSystem.ts
git commit -m "feat(v2): add SaveSystem with v1 migration and checkpoint data"
```

---

### Task 4: Placeholder assets and BootScene

**Files:**
- Create: `src/game/scenes/BootScene.ts`
- Create: placeholder PNGs (generated programmatically at build time or simple colored squares)

Since we're using pixel art assets that will be created separately, BootScene needs to work with placeholder textures initially and be swapped for real assets later.

- [ ] **Step 1: Create BootScene with procedural placeholder textures**

```typescript
// src/game/scenes/BootScene.ts
import Phaser from 'phaser';
import { uiManager } from '../../ui/UIManager';
import { hasSavedGame } from '../systems/SaveSystem';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    // DOM-based loading bar
    const bar = document.createElement('div');
    bar.id = 'loading-bar';
    bar.style.cssText = `
      position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
      width: 200px; height: 20px; background: #333; border-radius: 10px;
      overflow: hidden; z-index: 100;
    `;
    const fill = document.createElement('div');
    fill.style.cssText = `
      width: 0%; height: 100%; background: #d4a574;
      border-radius: 10px; transition: width 0.2s;
    `;
    bar.appendChild(fill);
    document.body.appendChild(bar);

    this.load.on('progress', (value: number) => {
      fill.style.width = `${value * 100}%`;
    });

    this.load.on('complete', () => {
      bar.remove();
    });

    // TODO: Load real sprite sheet assets here once created
    // For now, generate placeholder textures programmatically in create()
  }

  create(): void {
    this.generatePlaceholderTextures();
    this.generateProceduralTextures();

    // Show main menu
    const canContinue = hasSavedGame();
    uiManager.showMainMenu(
      () => {
        uiManager.hideMainMenu();
        this.scene.start('DressingRoomScene', { isNewGame: true });
      },
      canContinue ? () => {
        uiManager.hideMainMenu();
        this.scene.start('DressingRoomScene', { isNewGame: false });
      } : () => {},
    );
  }

  private generatePlaceholderTextures(): void {
    // Terrain tiles — 30 tile variants in a strip
    const terrainCanvas = this.textures.createCanvas('terrain', 32 * 4, 32);
    if (terrainCanvas) {
      const ctx = terrainCanvas.context;
      const colors = ['#4a7c4f', '#c4a265', '#8a8a8a', '#3a6b3f']; // grass, dirt, stone, dark grass
      colors.forEach((color, i) => {
        ctx.fillStyle = color;
        ctx.fillRect(i * 32, 0, 32, 32);
      });
      terrainCanvas.refresh();
    }

    // Character placeholder — simple colored square per outfit
    const outfitColors = ['#4488cc', '#cc4444', '#44cc88', '#8844cc', '#333333', '#cc8844', '#cc44cc', '#cccc44'];
    for (let c = 0; c < 2; c++) {
      const prefix = c === 0 ? 'player' : 'partner';
      for (let o = 0; o < 8; o++) {
        const key = `${prefix}-outfit-${o}`;
        const canvas = this.textures.createCanvas(key, 32 * 3, 32 * 4);
        if (canvas) {
          const ctx = canvas.context;
          ctx.fillStyle = outfitColors[o];
          // 3 frames x 4 directions
          for (let d = 0; d < 4; d++) {
            for (let f = 0; f < 3; f++) {
              ctx.fillRect(f * 32 + 4, d * 32 + 4, 24, 24);
              // Border
              ctx.strokeStyle = c === 0 ? '#ff69b4' : '#4169e1';
              ctx.lineWidth = 2;
              ctx.strokeRect(f * 32 + 4, d * 32 + 4, 24, 24);
            }
          }
          canvas.refresh();
        }
      }
    }

    // NPC placeholder
    const npcCanvas = this.textures.createCanvas('npc-default', 32, 32);
    if (npcCanvas) {
      const ctx = npcCanvas.context;
      ctx.fillStyle = '#888888';
      ctx.fillRect(4, 4, 24, 24);
      npcCanvas.refresh();
    }

    // Building placeholders
    ['restaurant', 'park-entrance', 'cinema'].forEach((name, i) => {
      const colors = ['#cc6644', '#44aa44', '#4466cc'];
      const canvas = this.textures.createCanvas(`building-${name}`, 96, 96);
      if (canvas) {
        const ctx = canvas.context;
        ctx.fillStyle = colors[i];
        ctx.fillRect(0, 0, 96, 96);
        ctx.fillStyle = '#fff';
        ctx.font = '10px sans-serif';
        ctx.fillText(name, 4, 50);
        canvas.refresh();
      }
    });

    // Decoration placeholders
    ['tree', 'bench', 'lamp', 'fence', 'flower', 'fountain'].forEach(name => {
      const canvas = this.textures.createCanvas(`deco-${name}`, 32, 32);
      if (canvas) {
        const ctx = canvas.context;
        ctx.fillStyle = '#556b2f';
        ctx.fillRect(8, 8, 16, 16);
        canvas.refresh();
      }
    });

    // Catch game items
    ['petal', 'leaf', 'butterfly'].forEach(name => {
      const canvas = this.textures.createCanvas(`catch-${name}`, 32, 32);
      if (canvas) {
        const ctx = canvas.context;
        ctx.fillStyle = '#ff88aa';
        ctx.beginPath();
        ctx.arc(16, 16, 12, 0, Math.PI * 2);
        ctx.fill();
        canvas.refresh();
      }
    });

    // Catch basket
    const basketCanvas = this.textures.createCanvas('catch-basket', 64, 32);
    if (basketCanvas) {
      const ctx = basketCanvas.context;
      ctx.fillStyle = '#8B4513';
      ctx.fillRect(8, 8, 48, 24);
      basketCanvas.refresh();
    }

    // Match card back and icons
    const cardBack = this.textures.createCanvas('card-back', 64, 80);
    if (cardBack) {
      const ctx = cardBack.context;
      ctx.fillStyle = '#7b5ea7';
      ctx.fillRect(0, 0, 64, 80);
      ctx.fillStyle = '#d4a574';
      ctx.font = '24px sans-serif';
      ctx.fillText('?', 24, 48);
      cardBack.refresh();
    }

    const matchIcons = ['🍿', '🎬', '🎟', '🎥', '⭐', '🎭'];
    matchIcons.forEach((icon, i) => {
      const canvas = this.textures.createCanvas(`match-icon-${i}`, 64, 80);
      if (canvas) {
        const ctx = canvas.context;
        ctx.fillStyle = '#fdf6e3';
        ctx.fillRect(0, 0, 64, 80);
        ctx.font = '32px sans-serif';
        ctx.fillText(icon, 16, 52);
        canvas.refresh();
      }
    });
  }

  private generateProceduralTextures(): void {
    // Sky gradient — will be replaced by SkyRenderer
    const skyCanvas = this.textures.createCanvas('sky', 1, 256);
    if (skyCanvas) {
      const ctx = skyCanvas.context;
      const grad = ctx.createLinearGradient(0, 0, 0, 256);
      grad.addColorStop(0, '#87CEEB');
      grad.addColorStop(1, '#E0F0FF');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1, 256);
      skyCanvas.refresh();
    }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/game/scenes/BootScene.ts
git commit -m "feat(v2): add BootScene with placeholder textures and main menu"
```

---

## Chunk 2: InputSystem, Entities & Map Data

### Task 5: InputSystem (keyboard + virtual joystick)

**Files:**
- Create: `src/game/systems/InputSystem.ts`

- [ ] **Step 1: Create InputSystem**

```typescript
// src/game/systems/InputSystem.ts
import Phaser from 'phaser';
import { isTouchDevice } from '../../utils/constants';

export class InputSystem {
  private scene: Phaser.Scene;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<string, Phaser.Input.Keyboard.Key>;
  private interactKey!: Phaser.Input.Keyboard.Key;
  private escKey!: Phaser.Input.Keyboard.Key;
  private spaceKey!: Phaser.Input.Keyboard.Key;

  // Virtual joystick state
  private joystickBase?: Phaser.GameObjects.Circle;
  private joystickThumb?: Phaser.GameObjects.Circle;
  private joystickDirection = { x: 0, y: 0 };
  private joystickRadius = 50;
  private touchEnabled = false;
  private actionPressed = false;

  // Action button
  private actionButton?: Phaser.GameObjects.Circle;
  private actionButtonLabel?: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    // Keyboard
    if (scene.input.keyboard) {
      this.cursors = scene.input.keyboard.createCursorKeys();
      this.wasd = {
        W: scene.input.keyboard.addKey('W'),
        A: scene.input.keyboard.addKey('A'),
        S: scene.input.keyboard.addKey('S'),
        D: scene.input.keyboard.addKey('D'),
      };
      this.interactKey = scene.input.keyboard.addKey('E');
      this.spaceKey = scene.input.keyboard.addKey('SPACE');
      this.escKey = scene.input.keyboard.addKey('ESC');
    }

    if (isTouchDevice()) {
      this.setTouchEnabled(true);
    }
  }

  setTouchEnabled(enabled: boolean): void {
    this.touchEnabled = enabled;
    if (enabled) {
      this.createVirtualJoystick();
      this.createActionButton();
    } else {
      this.destroyVirtualJoystick();
      this.destroyActionButton();
    }
  }

  private createVirtualJoystick(): void {
    const scene = this.scene;
    const cam = scene.cameras.main;
    const baseX = 80;
    const baseY = cam.height - 80;

    this.joystickBase = scene.add.circle(baseX, baseY, this.joystickRadius, 0x000000, 0.3)
      .setScrollFactor(0)
      .setDepth(1000)
      .setInteractive();

    this.joystickThumb = scene.add.circle(baseX, baseY, 20, 0xffffff, 0.5)
      .setScrollFactor(0)
      .setDepth(1001);

    // Touch events on the base
    this.joystickBase.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.updateJoystickPosition(pointer);
    });

    scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (pointer.isDown && this.joystickBase && this.isInJoystickZone(pointer)) {
        this.updateJoystickPosition(pointer);
      }
    });

    scene.input.on('pointerup', () => {
      this.resetJoystick();
    });
  }

  private isInJoystickZone(pointer: Phaser.Input.Pointer): boolean {
    if (!this.joystickBase) return false;
    const dx = pointer.x - this.joystickBase.x;
    const dy = pointer.y - this.joystickBase.y;
    return Math.sqrt(dx * dx + dy * dy) < this.joystickRadius * 2;
  }

  private updateJoystickPosition(pointer: Phaser.Input.Pointer): void {
    if (!this.joystickBase || !this.joystickThumb) return;

    const dx = pointer.x - this.joystickBase.x;
    const dy = pointer.y - this.joystickBase.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const clampedDist = Math.min(dist, this.joystickRadius);
    const angle = Math.atan2(dy, dx);

    this.joystickThumb.x = this.joystickBase.x + Math.cos(angle) * clampedDist;
    this.joystickThumb.y = this.joystickBase.y + Math.sin(angle) * clampedDist;

    // Normalize to -1..1
    this.joystickDirection.x = (Math.cos(angle) * clampedDist) / this.joystickRadius;
    this.joystickDirection.y = (Math.sin(angle) * clampedDist) / this.joystickRadius;

    // Apply deadzone
    if (Math.abs(this.joystickDirection.x) < 0.2) this.joystickDirection.x = 0;
    if (Math.abs(this.joystickDirection.y) < 0.2) this.joystickDirection.y = 0;
  }

  private resetJoystick(): void {
    if (this.joystickBase && this.joystickThumb) {
      this.joystickThumb.x = this.joystickBase.x;
      this.joystickThumb.y = this.joystickBase.y;
    }
    this.joystickDirection = { x: 0, y: 0 };
  }

  private destroyVirtualJoystick(): void {
    this.joystickBase?.destroy();
    this.joystickThumb?.destroy();
    this.joystickBase = undefined;
    this.joystickThumb = undefined;
  }

  private createActionButton(): void {
    const scene = this.scene;
    const cam = scene.cameras.main;
    const btnX = cam.width - 60;
    const btnY = cam.height - 80;

    this.actionButton = scene.add.circle(btnX, btnY, 28, 0x000000, 0.3)
      .setScrollFactor(0)
      .setDepth(1000)
      .setInteractive();

    this.actionButtonLabel = scene.add.text(btnX, btnY, 'E', {
      fontSize: '16px',
      color: '#ffffff',
      fontFamily: 'sans-serif',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(1001);

    this.actionButton.on('pointerdown', () => {
      this.actionPressed = true;
    });
  }

  private destroyActionButton(): void {
    this.actionButton?.destroy();
    this.actionButtonLabel?.destroy();
    this.actionButton = undefined;
    this.actionButtonLabel = undefined;
  }

  getDirection(): { x: number; y: number } {
    let x = 0;
    let y = 0;

    // Keyboard
    if (this.cursors) {
      if (this.cursors.left.isDown || this.wasd.A.isDown) x -= 1;
      if (this.cursors.right.isDown || this.wasd.D.isDown) x += 1;
      if (this.cursors.up.isDown || this.wasd.W.isDown) y -= 1;
      if (this.cursors.down.isDown || this.wasd.S.isDown) y += 1;
    }

    // Virtual joystick overrides if active
    if (this.touchEnabled && (this.joystickDirection.x !== 0 || this.joystickDirection.y !== 0)) {
      x = this.joystickDirection.x;
      y = this.joystickDirection.y;
    }

    return { x, y };
  }

  isInteractPressed(): boolean {
    const keyboard = this.interactKey?.isDown || this.spaceKey?.isDown || false;
    const touch = this.actionPressed;
    this.actionPressed = false; // consume
    return keyboard || touch;
  }

  isBackPressed(): boolean {
    return this.escKey?.isDown || false;
  }

  update(): void {
    // Reserved for future per-frame input processing
  }

  destroy(): void {
    this.destroyVirtualJoystick();
    this.destroyActionButton();
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/game/systems/InputSystem.ts
git commit -m "feat(v2): add InputSystem with keyboard and virtual joystick support"
```

---

### Task 6: Map data and Player/Partner entities

**Files:**
- Create: `src/game/data/mapLayout.ts`
- Create: `src/game/entities/Player.ts`
- Create: `src/game/entities/Partner.ts`

- [ ] **Step 1: Create mapLayout.ts with tile grid, walkability, and checkpoint positions**

```typescript
// src/game/data/mapLayout.ts
import { MAP_WIDTH, MAP_HEIGHT, TILE_SIZE } from '../../utils/constants';

export const enum TileType {
  Grass = 0,
  Dirt = 1,
  Stone = 2,
  DarkGrass = 3,
}

// 30x24 tile grid — 0=grass, 1=dirt, 2=stone, 3=dark grass
// Row-major: tileGrid[y][x]
export const tileGrid: number[][] = Array.from({ length: MAP_HEIGHT }, (_, y) => {
  return Array.from({ length: MAP_WIDTH }, (_, x) => {
    // Main east-west path
    if (y >= 11 && y <= 12 && x >= 3 && x <= 27) return TileType.Dirt;
    // North-south path
    if (x >= 14 && x <= 15 && y >= 3 && y <= 20) return TileType.Dirt;
    // Stone plaza around restaurant (top-left area)
    if (x >= 5 && x <= 9 && y >= 5 && y <= 9) return TileType.Stone;
    // Stone plaza around cinema (top-right area)
    if (x >= 21 && x <= 25 && y >= 5 && y <= 9) return TileType.Stone;
    // Park area (bottom-center) — dark grass
    if (x >= 10 && x <= 20 && y >= 15 && y <= 21) return TileType.DarkGrass;
    // Default grass
    return TileType.Grass;
  });
});

// Walkability grid — true = passable
// Buildings, water, dense decorations marked as impassable
export const walkGrid: boolean[][] = Array.from({ length: MAP_HEIGHT }, (_, y) => {
  return Array.from({ length: MAP_WIDTH }, (_, x) => {
    // Map borders
    if (x <= 0 || x >= MAP_WIDTH - 1 || y <= 0 || y >= MAP_HEIGHT - 1) return false;
    // Building footprints (3x3 tile buildings)
    // Restaurant building (inside)
    if (x >= 6 && x <= 8 && y >= 6 && y <= 8) return false;
    // Cinema building (inside)
    if (x >= 22 && x <= 24 && y >= 6 && y <= 8) return false;
    // Pond in park
    if (x >= 13 && x <= 16 && y >= 17 && y <= 19) return false;
    // Fences/walls along edges
    if (y === 2 && (x < 5 || x > 25)) return false;
    return true;
  });
});

export interface CheckpointZone {
  id: string;
  tileX: number;
  tileY: number;
  width: number;  // in tiles
  height: number; // in tiles
  promptText: string;
}

export const CHECKPOINT_ZONES: CheckpointZone[] = [
  { id: 'restaurant', tileX: 5, tileY: 5, width: 2, height: 1, promptText: 'Press E to enter restaurant' },
  { id: 'park', tileX: 14, tileY: 15, width: 2, height: 1, promptText: 'Press E to play in the park' },
  { id: 'cinema', tileX: 21, tileY: 5, width: 2, height: 1, promptText: 'Press E to enter cinema' },
];

export interface DecorationDef {
  type: string;
  tileX: number;
  tileY: number;
}

export const DECORATIONS: DecorationDef[] = [
  // Trees
  { type: 'tree', tileX: 2, tileY: 3 },
  { type: 'tree', tileX: 3, tileY: 8 },
  { type: 'tree', tileX: 27, tileY: 3 },
  { type: 'tree', tileX: 28, tileY: 10 },
  { type: 'tree', tileX: 10, tileY: 16 },
  { type: 'tree', tileX: 20, tileY: 16 },
  { type: 'tree', tileX: 11, tileY: 20 },
  { type: 'tree', tileX: 19, tileY: 20 },
  // Benches
  { type: 'bench', tileX: 12, tileY: 12 },
  { type: 'bench', tileX: 18, tileY: 12 },
  { type: 'bench', tileX: 15, tileY: 21 },
  // Lamps
  { type: 'lamp', tileX: 5, tileY: 11 },
  { type: 'lamp', tileX: 25, tileY: 11 },
  { type: 'lamp', tileX: 14, tileY: 5 },
  { type: 'lamp', tileX: 14, tileY: 20 },
  // Flowers
  { type: 'flower', tileX: 11, tileY: 17 },
  { type: 'flower', tileX: 19, tileY: 17 },
  { type: 'flower', tileX: 12, tileY: 19 },
  { type: 'flower', tileX: 18, tileY: 19 },
  // Fountain (park center)
  { type: 'fountain', tileX: 15, tileY: 18 },
  // Fences
  { type: 'fence', tileX: 4, tileY: 4 },
  { type: 'fence', tileX: 10, tileY: 4 },
  { type: 'fence', tileX: 20, tileY: 4 },
  { type: 'fence', tileX: 26, tileY: 4 },
];

export interface NPCDef {
  id: string;
  tileX: number;
  tileY: number;
  behavior: 'idle' | 'walk' | 'sit';
  walkPath?: Array<{ x: number; y: number }>; // tile coords
}

export const NPC_DEFS: NPCDef[] = [
  { id: 'npc-1', tileX: 7, tileY: 10, behavior: 'walk', walkPath: [{ x: 7, y: 10 }, { x: 12, y: 10 }, { x: 12, y: 12 }, { x: 7, y: 12 }] },
  { id: 'npc-2', tileX: 12, tileY: 12, behavior: 'sit' },
  { id: 'npc-3', tileX: 23, tileY: 10, behavior: 'walk', walkPath: [{ x: 23, y: 10 }, { x: 23, y: 12 }, { x: 26, y: 12 }, { x: 26, y: 10 }] },
  { id: 'npc-4', tileX: 15, tileY: 21, behavior: 'sit' },
];

/** Check if a tile is walkable */
export function isWalkable(tileX: number, tileY: number): boolean {
  if (tileX < 0 || tileX >= MAP_WIDTH || tileY < 0 || tileY >= MAP_HEIGHT) return false;
  return walkGrid[tileY][tileX];
}

/** Convert tile coords to world pixel coords (center of tile) */
export function tileToWorld(tileX: number, tileY: number): { x: number; y: number } {
  return { x: tileX * TILE_SIZE + TILE_SIZE / 2, y: tileY * TILE_SIZE + TILE_SIZE / 2 };
}

/** Convert world pixel coords to tile coords */
export function worldToTile(worldX: number, worldY: number): { x: number; y: number } {
  return { x: Math.floor(worldX / TILE_SIZE), y: Math.floor(worldY / TILE_SIZE) };
}
```

- [ ] **Step 2: Create Player.ts**

```typescript
// src/game/entities/Player.ts
import Phaser from 'phaser';
import { TILE_SIZE } from '../../utils/constants';
import { isWalkable, worldToTile } from '../data/mapLayout';

const SPEED = 120; // pixels per second

export class Player {
  public sprite: Phaser.Physics.Arcade.Sprite;
  private currentOutfit = 0;
  private facing: 'down' | 'left' | 'right' | 'up' = 'down';

  constructor(scene: Phaser.Scene, x: number, y: number, outfit: number) {
    this.currentOutfit = outfit;
    const key = `player-outfit-${outfit}`;
    this.sprite = scene.physics.add.sprite(x, y, key, 0);
    this.sprite.setSize(24, 24);
    this.sprite.setOffset(4, 8);
    this.sprite.setDepth(10);

    this.createAnimations(scene);
  }

  private createAnimations(scene: Phaser.Scene): void {
    const key = `player-outfit-${this.currentOutfit}`;
    const directions = ['down', 'left', 'right', 'up'];
    directions.forEach((dir, row) => {
      const animKey = `player-${dir}`;
      if (!scene.anims.exists(animKey)) {
        scene.anims.create({
          key: animKey,
          frames: [
            { key, frame: row * 3 },
            { key, frame: row * 3 + 1 },
            { key, frame: row * 3 + 2 },
            { key, frame: row * 3 + 1 },
          ],
          frameRate: 8,
          repeat: -1,
        });
      }
    });
  }

  update(direction: { x: number; y: number }): void {
    const vx = direction.x * SPEED;
    const vy = direction.y * SPEED;

    // Collision check against walkability grid
    const nextX = this.sprite.x + vx * (1 / 60);
    const nextY = this.sprite.y + vy * (1 / 60);
    const nextTile = worldToTile(nextX, nextY);

    let finalVx = vx;
    let finalVy = vy;

    if (!isWalkable(worldToTile(nextX, this.sprite.y).x, worldToTile(nextX, this.sprite.y).y)) {
      finalVx = 0;
    }
    if (!isWalkable(worldToTile(this.sprite.x, nextY).x, worldToTile(this.sprite.x, nextY).y)) {
      finalVy = 0;
    }

    this.sprite.setVelocity(finalVx, finalVy);

    // Animation
    if (finalVx !== 0 || finalVy !== 0) {
      if (Math.abs(finalVx) > Math.abs(finalVy)) {
        this.facing = finalVx < 0 ? 'left' : 'right';
      } else {
        this.facing = finalVy < 0 ? 'up' : 'down';
      }
      this.sprite.anims.play(`player-${this.facing}`, true);
    } else {
      this.sprite.anims.stop();
    }
  }

  getPosition(): { x: number; y: number } {
    return { x: this.sprite.x, y: this.sprite.y };
  }

  setOutfit(outfit: number, scene: Phaser.Scene): void {
    this.currentOutfit = outfit;
    this.sprite.setTexture(`player-outfit-${outfit}`);
    // Re-create anims if needed
    this.createAnimations(scene);
  }

  destroy(): void {
    this.sprite.destroy();
  }
}
```

- [ ] **Step 3: Create Partner.ts**

```typescript
// src/game/entities/Partner.ts
import Phaser from 'phaser';

const FOLLOW_DISTANCE = 40;
const LERP_SPEED = 0.08;
const SNAP_DISTANCE = 6;

export class Partner {
  public sprite: Phaser.Physics.Arcade.Sprite;
  private currentOutfit = 0;
  private positionHistory: Array<{ x: number; y: number }> = [];
  private historySize = 15;

  constructor(scene: Phaser.Scene, x: number, y: number, outfit: number) {
    this.currentOutfit = outfit;
    const key = `partner-outfit-${outfit}`;
    this.sprite = scene.physics.add.sprite(x + FOLLOW_DISTANCE, y, key, 0);
    this.sprite.setSize(24, 24);
    this.sprite.setOffset(4, 8);
    this.sprite.setDepth(9);

    this.createAnimations(scene);
  }

  private createAnimations(scene: Phaser.Scene): void {
    const key = `partner-outfit-${this.currentOutfit}`;
    const directions = ['down', 'left', 'right', 'up'];
    directions.forEach((dir, row) => {
      const animKey = `partner-${dir}`;
      if (!scene.anims.exists(animKey)) {
        scene.anims.create({
          key: animKey,
          frames: [
            { key, frame: row * 3 },
            { key, frame: row * 3 + 1 },
            { key, frame: row * 3 + 2 },
            { key, frame: row * 3 + 1 },
          ],
          frameRate: 8,
          repeat: -1,
        });
      }
    });
  }

  update(playerPos: { x: number; y: number }): void {
    // Record player positions
    this.positionHistory.push({ ...playerPos });
    if (this.positionHistory.length > this.historySize) {
      this.positionHistory.shift();
    }

    // Target = oldest position in history (delayed follow)
    const target = this.positionHistory[0];
    const dx = target.x - this.sprite.x;
    const dy = target.y - this.sprite.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < SNAP_DISTANCE) {
      // Snap — no jitter
      this.sprite.setVelocity(0, 0);
      this.sprite.anims.stop();
      return;
    }

    // Lerp with deceleration curve
    const lerpFactor = dist < 20 ? LERP_SPEED * 0.5 : LERP_SPEED;
    const moveX = dx * lerpFactor * 60; // approximate velocity
    const moveY = dy * lerpFactor * 60;

    this.sprite.setVelocity(moveX, moveY);

    // Animation
    if (Math.abs(moveX) > 5 || Math.abs(moveY) > 5) {
      let dir: string;
      if (Math.abs(moveX) > Math.abs(moveY)) {
        dir = moveX < 0 ? 'left' : 'right';
      } else {
        dir = moveY < 0 ? 'up' : 'down';
      }
      this.sprite.anims.play(`partner-${dir}`, true);
    } else {
      this.sprite.anims.stop();
    }
  }

  setOutfit(outfit: number, scene: Phaser.Scene): void {
    this.currentOutfit = outfit;
    this.sprite.setTexture(`partner-outfit-${outfit}`);
    this.createAnimations(scene);
  }

  destroy(): void {
    this.sprite.destroy();
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add src/game/data/mapLayout.ts src/game/entities/Player.ts src/game/entities/Partner.ts
git commit -m "feat(v2): add map layout data, Player and Partner entities"
```

---

### Task 7: NPC entity and system

**Files:**
- Create: `src/game/entities/NPC.ts`
- Create: `src/game/systems/NPCSystem.ts`

- [ ] **Step 1: Create NPC.ts**

```typescript
// src/game/entities/NPC.ts
import Phaser from 'phaser';
import { tileToWorld } from '../data/mapLayout';

type NPCState = 'idle' | 'walking' | 'sitting';

const NPC_SPEED = 40;

export class NPC {
  public sprite: Phaser.GameObjects.Sprite;
  private state: NPCState;
  private walkPath: Array<{ x: number; y: number }>;
  private currentPathIndex = 0;
  private targetPos: { x: number; y: number } | null = null;

  constructor(
    scene: Phaser.Scene,
    tileX: number,
    tileY: number,
    behavior: 'idle' | 'walk' | 'sit',
    walkPath?: Array<{ x: number; y: number }>,
  ) {
    const worldPos = tileToWorld(tileX, tileY);
    this.sprite = scene.add.sprite(worldPos.x, worldPos.y, 'npc-default');
    this.sprite.setDepth(8);

    this.walkPath = walkPath ?? [];
    this.state = behavior === 'walk' ? 'walking' : behavior === 'sit' ? 'sitting' : 'idle';

    if (this.state === 'walking' && this.walkPath.length > 1) {
      this.currentPathIndex = 0;
      this.setNextTarget();
    }
  }

  private setNextTarget(): void {
    this.currentPathIndex = (this.currentPathIndex + 1) % this.walkPath.length;
    const tile = this.walkPath[this.currentPathIndex];
    this.targetPos = tileToWorld(tile.x, tile.y);
  }

  update(delta: number): void {
    if (this.state !== 'walking' || !this.targetPos) return;

    const dx = this.targetPos.x - this.sprite.x;
    const dy = this.targetPos.y - this.sprite.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 4) {
      this.sprite.x = this.targetPos.x;
      this.sprite.y = this.targetPos.y;
      // Brief pause then next target
      this.sprite.scene.time.delayedCall(1000, () => {
        this.setNextTarget();
      });
      this.targetPos = null;
      return;
    }

    const step = NPC_SPEED * (delta / 1000);
    this.sprite.x += (dx / dist) * step;
    this.sprite.y += (dy / dist) * step;
  }

  destroy(): void {
    this.sprite.destroy();
  }
}
```

- [ ] **Step 2: Create NPCSystem.ts**

```typescript
// src/game/systems/NPCSystem.ts
import Phaser from 'phaser';
import { NPC } from '../entities/NPC';
import { NPC_DEFS } from '../data/mapLayout';

export class NPCSystem {
  private npcs: NPC[] = [];

  create(scene: Phaser.Scene): void {
    this.npcs = NPC_DEFS.map(def =>
      new NPC(scene, def.tileX, def.tileY, def.behavior, def.walkPath)
    );
  }

  update(delta: number): void {
    this.npcs.forEach(npc => npc.update(delta));
  }

  destroy(): void {
    this.npcs.forEach(npc => npc.destroy());
    this.npcs = [];
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/game/entities/NPC.ts src/game/systems/NPCSystem.ts
git commit -m "feat(v2): add NPC entity with walk/idle/sit states and NPCSystem"
```

---

## Chunk 3: Core Scenes (DressingRoom, WorldScene)

### Task 8: DressingRoomScene

**Files:**
- Create: `src/game/scenes/DressingRoomScene.ts`
- Update: `src/ui/styles/menus.css`

- [ ] **Step 1: Create DressingRoomScene**

```typescript
// src/game/scenes/DressingRoomScene.ts
import Phaser from 'phaser';
import { uiManager } from '../../ui/UIManager';
import { OUTFIT_NAMES, OUTFIT_COUNT } from '../../utils/constants';
import { loadGameState, saveOutfits, clearGameState } from '../systems/SaveSystem';

export class DressingRoomScene extends Phaser.Scene {
  private playerOutfit = 0;
  private partnerOutfit = 0;
  private playerPreview?: Phaser.GameObjects.Sprite;
  private partnerPreview?: Phaser.GameObjects.Sprite;

  constructor() {
    super({ key: 'DressingRoomScene' });
  }

  init(data: { isNewGame: boolean }): void {
    if (data.isNewGame) {
      clearGameState();
      this.playerOutfit = 0;
      this.partnerOutfit = 0;
    } else {
      const state = loadGameState();
      this.playerOutfit = state.outfits.player;
      this.partnerOutfit = state.outfits.partner;
    }
  }

  create(): void {
    const { width, height } = this.cameras.main;

    // Background
    this.cameras.main.setBackgroundColor('#2a1a3a');

    // Character previews in upper 60%
    const previewY = height * 0.3;
    const gap = width * 0.2;

    this.playerPreview = this.add.sprite(width / 2 - gap, previewY, `player-outfit-${this.playerOutfit}`, 0)
      .setScale(3)
      .setDepth(1);

    this.partnerPreview = this.add.sprite(width / 2 + gap, previewY, `partner-outfit-${this.partnerOutfit}`, 0)
      .setScale(3)
      .setDepth(1);

    // DOM UI for outfit selection
    uiManager.showDressingRoom({
      playerOutfitName: OUTFIT_NAMES[this.playerOutfit],
      partnerOutfitName: OUTFIT_NAMES[this.partnerOutfit],
      onPrevPlayer: () => this.cycleOutfit('player', -1),
      onNextPlayer: () => this.cycleOutfit('player', 1),
      onPrevPartner: () => this.cycleOutfit('partner', -1),
      onNextPartner: () => this.cycleOutfit('partner', 1),
      onStart: () => this.startGame(),
    });
  }

  private cycleOutfit(who: 'player' | 'partner', dir: number): void {
    if (who === 'player') {
      this.playerOutfit = (this.playerOutfit + dir + OUTFIT_COUNT) % OUTFIT_COUNT;
      this.playerPreview?.setTexture(`player-outfit-${this.playerOutfit}`);
    } else {
      this.partnerOutfit = (this.partnerOutfit + dir + OUTFIT_COUNT) % OUTFIT_COUNT;
      this.partnerPreview?.setTexture(`partner-outfit-${this.partnerOutfit}`);
    }
    uiManager.updateDressingRoom(
      OUTFIT_NAMES[this.playerOutfit],
      OUTFIT_NAMES[this.partnerOutfit],
    );
  }

  private startGame(): void {
    saveOutfits(this.playerOutfit, this.partnerOutfit);
    uiManager.hideDressingRoom();
    this.scene.start('WorldScene');
  }
}
```

- [ ] **Step 2: Add menu and dressing room CSS**

```css
/* src/ui/styles/menus.css */

/* Main Menu */
.main-menu {
  position: absolute;
  top: 0; left: 0; width: 100%; height: 100%;
  display: flex; flex-direction: column;
  justify-content: center; align-items: center;
  background: rgba(26, 26, 46, 0.9);
}

.main-menu__title {
  font-family: var(--font-display);
  font-size: clamp(24px, 6vw, 48px);
  color: var(--color-primary);
  text-shadow: 0 2px 8px rgba(0,0,0,0.5);
  margin-bottom: 40px;
}

.main-menu__buttons {
  display: flex; flex-direction: column; gap: 16px;
}

/* Buttons */
.btn {
  font-family: var(--font-display);
  font-size: clamp(10px, 2.5vw, 14px);
  padding: 12px 32px;
  border: none; border-radius: var(--radius);
  cursor: pointer;
  min-width: 180px;
  min-height: 44px;
  transition: transform 0.1s, box-shadow 0.1s;
}

.btn:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow);
}

.btn:active {
  transform: translateY(0);
}

.btn--primary {
  background: var(--color-primary);
  color: #fff;
}

.btn--secondary {
  background: var(--color-secondary);
  color: #fff;
}

.btn--icon {
  font-family: var(--font-body);
  font-size: 20px;
  padding: 8px 16px;
  min-width: 44px;
  min-height: 44px;
  background: var(--color-secondary);
  color: #fff;
  border: none; border-radius: var(--radius);
  cursor: pointer;
}

/* Dressing Room UI */
.dressing-room-ui {
  position: absolute;
  bottom: 0; left: 0; width: 100%;
  height: 40%;
  display: flex; flex-direction: column;
  justify-content: center; align-items: center;
  gap: 20px;
  background: linear-gradient(transparent, rgba(26, 26, 46, 0.95) 30%);
  padding: 20px;
}

.dressing-room-ui__row {
  display: flex; gap: clamp(20px, 8vw, 80px);
  justify-content: center;
}

.dressing-room-ui__picker {
  display: flex; flex-direction: column;
  align-items: center; gap: 8px;
}

.dressing-room-ui__label {
  font-family: var(--font-display);
  font-size: clamp(10px, 2vw, 14px);
  color: var(--color-primary);
}

.dressing-room-ui__controls {
  display: flex; align-items: center; gap: 12px;
}

.dressing-room-ui__outfit-name {
  font-family: var(--font-body);
  font-size: clamp(12px, 2.5vw, 16px);
  color: #fff;
  min-width: 80px;
  text-align: center;
}

.dressing-room-ui__start {
  margin-top: 10px;
  font-size: clamp(12px, 3vw, 16px) !important;
  padding: 14px 40px !important;
}

/* Dialog overlay */
.dialog-overlay {
  position: absolute;
  top: 0; left: 0; width: 100%; height: 100%;
  display: flex; justify-content: center; align-items: center;
  background: rgba(0, 0, 0, 0.6);
}

.dialog {
  background: var(--color-bg);
  border-radius: var(--radius);
  padding: 24px;
  max-width: min(90vw, 400px);
  box-shadow: var(--shadow);
  text-align: center;
}

.dialog__title {
  font-family: var(--font-display);
  font-size: clamp(14px, 3vw, 20px);
  color: var(--color-text);
  margin-bottom: 12px;
}

.dialog__message {
  font-family: var(--font-body);
  font-size: clamp(12px, 2.5vw, 16px);
  color: var(--color-text);
  margin-bottom: 20px;
}

.dialog__buttons {
  display: flex; gap: 12px; justify-content: center;
  flex-wrap: wrap;
}

/* Settings Panel */
.settings-panel {
  background: var(--color-bg);
  border-radius: var(--radius);
  padding: 24px;
  max-width: min(90vw, 320px);
  box-shadow: var(--shadow);
  display: flex; flex-direction: column; gap: 12px;
  align-items: center;
}

.settings-panel__title {
  font-family: var(--font-display);
  font-size: clamp(14px, 3vw, 18px);
  color: var(--color-text);
  margin-bottom: 8px;
}

.settings-panel__btn {
  width: 100%;
}

/* Completion Screen */
.completion-screen {
  position: absolute;
  top: 0; left: 0; width: 100%; height: 100%;
  display: flex; justify-content: center; align-items: center;
  background: rgba(26, 26, 46, 0.95);
}

.completion-screen__content {
  text-align: center;
  padding: 24px;
}

.completion-screen__title {
  font-family: var(--font-display);
  font-size: clamp(18px, 5vw, 32px);
  color: var(--color-primary);
  margin-bottom: 16px;
}

.completion-screen__message {
  font-family: var(--font-body);
  font-size: clamp(14px, 3vw, 18px);
  color: #fff;
  margin-bottom: 20px;
}

.completion-screen__scores {
  list-style: none;
  font-family: var(--font-body);
  color: #ccc;
  margin-bottom: 24px;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/game/scenes/DressingRoomScene.ts src/ui/styles/menus.css
git commit -m "feat(v2): add DressingRoomScene with DOM outfit picker"
```

---

### Task 9: WorldScene

**Files:**
- Create: `src/game/scenes/WorldScene.ts`
- Create: `src/game/rendering/SkyRenderer.ts`
- Update: `src/ui/styles/hud.css`

- [ ] **Step 1: Create SkyRenderer**

```typescript
// src/game/rendering/SkyRenderer.ts
import Phaser from 'phaser';

export class SkyRenderer {
  private skyBg!: Phaser.GameObjects.Rectangle;
  private clouds: Phaser.GameObjects.Ellipse[] = [];

  create(scene: Phaser.Scene): void {
    const { width, height } = scene.cameras.main;

    // Sky gradient background
    this.skyBg = scene.add.rectangle(0, 0, width * 3, height * 3, 0x87CEEB)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(-100);

    // Cloud layers with parallax
    const cloudConfigs = [
      { y: 40, scrollFactor: 0.05, count: 4, alpha: 0.6 },
      { y: 80, scrollFactor: 0.15, count: 3, alpha: 0.4 },
      { y: 120, scrollFactor: 0.3, count: 3, alpha: 0.3 },
    ];

    cloudConfigs.forEach(cfg => {
      for (let i = 0; i < cfg.count; i++) {
        const cloud = scene.add.ellipse(
          Math.random() * width * 2,
          cfg.y + Math.random() * 30,
          80 + Math.random() * 60,
          30 + Math.random() * 15,
          0xffffff,
          cfg.alpha,
        ).setScrollFactor(cfg.scrollFactor).setDepth(-90);

        this.clouds.push(cloud);

        // Slow drift animation
        scene.tweens.add({
          targets: cloud,
          x: cloud.x + 200,
          duration: 20000 + Math.random() * 15000,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
      }
    });
  }

  destroy(): void {
    this.skyBg?.destroy();
    this.clouds.forEach(c => c.destroy());
    this.clouds = [];
  }
}
```

- [ ] **Step 2: Create WorldScene**

```typescript
// src/game/scenes/WorldScene.ts
import Phaser from 'phaser';
import { uiManager, CheckpointStatus } from '../../ui/UIManager';
import { Player } from '../entities/Player';
import { Partner } from '../entities/Partner';
import { InputSystem } from '../systems/InputSystem';
import { NPCSystem } from '../systems/NPCSystem';
import { SkyRenderer } from '../rendering/SkyRenderer';
import {
  loadGameState, savePlayerPosition, markCheckpointVisited,
  getPlayerSpawn,
} from '../systems/SaveSystem';
import {
  MAP_WIDTH, MAP_HEIGHT, TILE_SIZE, MAP_PX_WIDTH, MAP_PX_HEIGHT,
} from '../../utils/constants';
import { getDeviceZoom } from '../../utils/constants';
import {
  tileGrid, TileType, CHECKPOINT_ZONES, DECORATIONS,
  tileToWorld, worldToTile, CheckpointZone,
} from '../data/mapLayout';
import { CHECKPOINTS } from '../data/checkpoints';

export class WorldScene extends Phaser.Scene {
  private player!: Player;
  private partner!: Partner;
  private inputSystem!: InputSystem;
  private npcSystem!: NPCSystem;
  private skyRenderer!: SkyRenderer;
  private nearCheckpoint: CheckpointZone | null = null;

  constructor() {
    super({ key: 'WorldScene' });
  }

  create(): void {
    const state = loadGameState();

    // Sky
    this.skyRenderer = new SkyRenderer();
    this.skyRenderer.create(this);

    // Tile map
    this.buildTileMap();

    // Decorations
    this.placeDecorations();

    // Buildings
    this.placeBuildings();

    // Player & Partner
    const spawn = getPlayerSpawn();
    this.player = new Player(this, spawn.x, spawn.y, state.outfits.player);
    this.partner = new Partner(this, spawn.x, spawn.y, state.outfits.partner);

    // NPCs
    this.npcSystem = new NPCSystem();
    this.npcSystem.create(this);

    // Input
    this.inputSystem = new InputSystem(this);

    // Camera
    const zoom = getDeviceZoom();
    this.cameras.main.setZoom(zoom);
    this.cameras.main.startFollow(this.player.sprite, true, 0.1, 0.1);
    this.cameras.main.setBounds(0, 0, MAP_PX_WIDTH, MAP_PX_HEIGHT);

    // World bounds
    this.physics.world.setBounds(0, 0, MAP_PX_WIDTH, MAP_PX_HEIGHT);
    this.player.sprite.setCollideWorldBounds(true);

    // HUD
    this.updateHUD(state.visitedCheckpoints);

    // Handle resize
    this.scale.on('resize', () => {
      this.cameras.main.setZoom(getDeviceZoom());
    });
  }

  update(_time: number, delta: number): void {
    this.inputSystem.update();

    const dir = this.inputSystem.getDirection();
    this.player.update(dir);
    this.partner.update(this.player.getPosition());
    this.npcSystem.update(delta);

    // Checkpoint proximity check
    this.checkCheckpointProximity();

    // Interact
    if (this.inputSystem.isInteractPressed() && this.nearCheckpoint) {
      this.enterCheckpoint(this.nearCheckpoint);
    }

    // Settings
    if (this.inputSystem.isBackPressed()) {
      this.openSettings();
    }
  }

  private buildTileMap(): void {
    for (let y = 0; y < MAP_HEIGHT; y++) {
      for (let x = 0; x < MAP_WIDTH; x++) {
        const tileType = tileGrid[y][x];
        const pos = tileToWorld(x, y);
        // Use terrain canvas — frame based on tile type
        this.add.rectangle(pos.x, pos.y, TILE_SIZE, TILE_SIZE, this.getTileColor(tileType))
          .setDepth(-50);
      }
    }
  }

  private getTileColor(type: number): number {
    switch (type) {
      case TileType.Grass: return 0x4a7c4f;
      case TileType.Dirt: return 0xc4a265;
      case TileType.Stone: return 0x8a8a8a;
      case TileType.DarkGrass: return 0x3a6b3f;
      default: return 0x4a7c4f;
    }
  }

  private placeDecorations(): void {
    DECORATIONS.forEach(deco => {
      const pos = tileToWorld(deco.tileX, deco.tileY);
      const key = `deco-${deco.type}`;
      if (this.textures.exists(key)) {
        this.add.sprite(pos.x, pos.y, key).setDepth(5);
      }
    });
  }

  private placeBuildings(): void {
    const buildings = [
      { key: 'building-restaurant', tileX: 7, tileY: 7 },
      { key: 'building-park-entrance', tileX: 15, tileY: 15 },
      { key: 'building-cinema', tileX: 23, tileY: 7 },
    ];
    buildings.forEach(b => {
      const pos = tileToWorld(b.tileX, b.tileY);
      if (this.textures.exists(b.key)) {
        this.add.sprite(pos.x, pos.y, b.key).setDepth(4);
      }
    });
  }

  private checkCheckpointProximity(): void {
    const playerTile = worldToTile(this.player.sprite.x, this.player.sprite.y);
    let found: CheckpointZone | null = null;

    for (const zone of CHECKPOINT_ZONES) {
      if (
        playerTile.x >= zone.tileX &&
        playerTile.x < zone.tileX + zone.width &&
        playerTile.y >= zone.tileY &&
        playerTile.y < zone.tileY + zone.height
      ) {
        found = zone;
        break;
      }
    }

    if (found && found !== this.nearCheckpoint) {
      uiManager.showInteractionPrompt(found.promptText);
    } else if (!found && this.nearCheckpoint) {
      uiManager.hideInteractionPrompt();
    }
    this.nearCheckpoint = found;
  }

  private enterCheckpoint(zone: CheckpointZone): void {
    const checkpoint = CHECKPOINTS.find(cp => cp.id === zone.id);
    if (!checkpoint) return;

    // Save position before switching
    savePlayerPosition(this.player.sprite.x, this.player.sprite.y);
    markCheckpointVisited(zone.id);
    uiManager.hideInteractionPrompt();
    uiManager.hideHUD();

    // Map checkpoint type to scene key
    const sceneMap: Record<string, string> = {
      quiz: 'QuizScene',
      catch: 'CatchScene',
      match: 'MatchScene',
    };

    const sceneKey = sceneMap[checkpoint.miniGame.type];
    if (sceneKey) {
      this.scene.start(sceneKey, {
        checkpointId: checkpoint.id,
        config: checkpoint.miniGame.config,
      });
    }
  }

  private openSettings(): void {
    uiManager.showSettings({
      onClose: () => uiManager.hideDialog(),
      onFullscreen: () => {
        if (this.scale.isFullscreen) {
          this.scale.stopFullscreen();
        } else {
          this.scale.startFullscreen();
        }
      },
      onNewGame: () => {
        uiManager.hideDialog();
        uiManager.hideHUD();
        this.scene.start('BootScene');
      },
    });
  }

  private updateHUD(visited: string[]): void {
    const statuses: CheckpointStatus[] = CHECKPOINTS.map(cp => ({
      id: cp.id,
      name: cp.name,
      visited: visited.includes(cp.id),
    }));
    uiManager.showHUD(statuses);

    // Check completion
    if (visited.length >= CHECKPOINTS.length) {
      const state = loadGameState();
      uiManager.showCompletionScreen(state.bestScores);
    }
  }

  shutdown(): void {
    this.inputSystem?.destroy();
    this.npcSystem?.destroy();
    this.skyRenderer?.destroy();
  }
}
```

- [ ] **Step 3: Add HUD CSS**

```css
/* src/ui/styles/hud.css */

.hud {
  position: absolute;
  top: 0; left: 0; width: 100%; height: 100%;
  pointer-events: none;
}

.hud > * {
  pointer-events: auto;
}

.hud__progress {
  position: absolute;
  top: 12px; left: 12px;
  display: flex; gap: 8px;
  background: rgba(0, 0, 0, 0.5);
  padding: 8px 12px;
  border-radius: var(--radius);
}

.hud__checkpoint {
  font-size: clamp(14px, 3vw, 20px);
  color: #666;
  transition: color 0.3s;
}

.hud__checkpoint--visited {
  color: var(--color-primary);
}

.hud__settings-btn {
  position: absolute;
  top: 12px; right: 12px;
  width: 44px; height: 44px;
  font-size: 24px;
  background: rgba(0, 0, 0, 0.5);
  color: #fff;
  border: none; border-radius: var(--radius);
  cursor: pointer;
}

.hud__settings-btn:hover {
  background: rgba(0, 0, 0, 0.7);
}

/* Interaction Prompt */
.interaction-prompt {
  position: absolute;
  bottom: 15%;
  left: 50%;
  transform: translateX(-50%);
  font-family: var(--font-display);
  font-size: clamp(10px, 2vw, 14px);
  color: #fff;
  background: rgba(0, 0, 0, 0.7);
  padding: 10px 20px;
  border-radius: var(--radius);
  animation: prompt-bounce 1.5s ease-in-out infinite;
}

@keyframes prompt-bounce {
  0%, 100% { transform: translateX(-50%) translateY(0); }
  50% { transform: translateX(-50%) translateY(-4px); }
}
```

- [ ] **Step 4: Commit**

```bash
git add src/game/scenes/WorldScene.ts src/game/rendering/SkyRenderer.ts src/ui/styles/hud.css
git commit -m "feat(v2): add WorldScene with tile map, camera, HUD, and checkpoint interaction"
```

---

## Chunk 4: Mini-Games

### Task 10: QuizScene

**Files:**
- Create: `src/game/scenes/minigames/QuizScene.ts`
- Update: `src/ui/styles/minigames.css`

- [ ] **Step 1: Create QuizScene**

```typescript
// src/game/scenes/minigames/QuizScene.ts
import Phaser from 'phaser';
import { uiManager } from '../../../ui/UIManager';
import { saveMiniGameScore } from '../../systems/SaveSystem';
import { QuizConfig } from '../../data/checkpoints';

export class QuizScene extends Phaser.Scene {
  private checkpointId = '';
  private questions: QuizConfig['questions'] = [];
  private currentQuestion = 0;
  private score = 0;

  constructor() {
    super({ key: 'QuizScene' });
  }

  init(data: { checkpointId: string; config: QuizConfig }): void {
    this.checkpointId = data.checkpointId;
    this.questions = data.config.questions;
    this.currentQuestion = 0;
    this.score = 0;
  }

  create(): void {
    // Background
    this.cameras.main.setBackgroundColor('#2a1a3a');

    // Minigame overlay (score + progress)
    uiManager.showMinigameOverlay({
      title: 'Quiz Time!',
      score: 0,
      progress: `1/${this.questions.length}`,
    });

    this.showQuestion();
  }

  private showQuestion(): void {
    const q = this.questions[this.currentQuestion];
    if (!q) {
      this.endGame();
      return;
    }

    uiManager.showQuizQuestion(q.question, q.options, (index) => {
      this.handleAnswer(index);
    });
  }

  private handleAnswer(index: number): void {
    const q = this.questions[this.currentQuestion];
    const correct = index === q.answer;
    if (correct) this.score += 100;

    uiManager.showQuizFeedback(correct, q.options[q.answer]);
    uiManager.updateMinigameOverlay({
      score: this.score,
      progress: `${this.currentQuestion + 1}/${this.questions.length}`,
    });

    // Next question after delay
    this.time.delayedCall(1500, () => {
      uiManager.hideQuizQuestion();
      this.currentQuestion++;
      if (this.currentQuestion < this.questions.length) {
        this.showQuestion();
      } else {
        this.endGame();
      }
    });
  }

  private endGame(): void {
    saveMiniGameScore(this.checkpointId, this.score);
    uiManager.hideMinigameOverlay();
    uiManager.showMinigameResult('Quiz Complete!', this.score, () => {
      uiManager.hideDialog();
      this.scene.start('WorldScene');
    });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/game/scenes/minigames/QuizScene.ts
git commit -m "feat(v2): add QuizScene mini-game with DOM question overlay"
```

---

### Task 11: CatchScene

**Files:**
- Create: `src/game/scenes/minigames/CatchScene.ts`

- [ ] **Step 1: Create CatchScene**

```typescript
// src/game/scenes/minigames/CatchScene.ts
import Phaser from 'phaser';
import { uiManager } from '../../../ui/UIManager';
import { saveMiniGameScore } from '../../systems/SaveSystem';
import { CatchConfig } from '../../data/checkpoints';

const GAME_DURATION = 30; // seconds

export class CatchScene extends Phaser.Scene {
  private checkpointId = '';
  private config!: CatchConfig;
  private basket!: Phaser.GameObjects.Sprite;
  private score = 0;
  private timeLeft = GAME_DURATION;
  private spawnTimer?: Phaser.Time.TimerEvent;
  private countdownTimer?: Phaser.Time.TimerEvent;
  private items: Phaser.GameObjects.Sprite[] = [];

  constructor() {
    super({ key: 'CatchScene' });
  }

  init(data: { checkpointId: string; config: CatchConfig }): void {
    this.checkpointId = data.checkpointId;
    this.config = data.config;
    this.score = 0;
    this.timeLeft = GAME_DURATION;
    this.items = [];
  }

  create(): void {
    const { width, height } = this.cameras.main;
    this.cameras.main.setBackgroundColor('#87CEEB');

    // Ground
    this.add.rectangle(width / 2, height - 20, width, 40, 0x4a7c4f).setDepth(0);

    // Basket
    this.basket = this.add.sprite(width / 2, height - 50, 'catch-basket').setDepth(10);

    // Touch/keyboard control for basket
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      this.basket.x = Phaser.Math.Clamp(pointer.x, 32, width - 32);
    });

    // Overlay
    uiManager.showMinigameOverlay({
      title: 'Catch!',
      score: 0,
      timer: GAME_DURATION,
    });

    // Spawn items
    this.spawnTimer = this.time.addEvent({
      delay: this.config.spawnRate,
      callback: this.spawnItem,
      callbackScope: this,
      loop: true,
    });

    // Countdown
    this.countdownTimer = this.time.addEvent({
      delay: 1000,
      callback: () => {
        this.timeLeft--;
        uiManager.updateMinigameOverlay({ timer: this.timeLeft });
        if (this.timeLeft <= 0) this.endGame();
      },
      callbackScope: this,
      loop: true,
    });
  }

  private spawnItem(): void {
    const { width } = this.cameras.main;
    const itemTypes = this.config.items;
    const type = itemTypes[Math.floor(Math.random() * itemTypes.length)];
    const x = Phaser.Math.Between(32, width - 32);
    const item = this.add.sprite(x, -20, `catch-${type}`).setDepth(5);
    this.items.push(item);

    // Fall tween
    this.tweens.add({
      targets: item,
      y: this.cameras.main.height + 20,
      duration: 2000 / this.config.speed,
      onComplete: () => {
        const idx = this.items.indexOf(item);
        if (idx >= 0) this.items.splice(idx, 1);
        item.destroy();
      },
    });
  }

  update(): void {
    // Keyboard basket control
    if (this.input.keyboard) {
      const left = this.input.keyboard.addKey('LEFT').isDown || this.input.keyboard.addKey('A').isDown;
      const right = this.input.keyboard.addKey('RIGHT').isDown || this.input.keyboard.addKey('D').isDown;
      const { width } = this.cameras.main;
      if (left) this.basket.x = Math.max(32, this.basket.x - 5);
      if (right) this.basket.x = Math.min(width - 32, this.basket.x + 5);
    }

    // Collision check
    for (let i = this.items.length - 1; i >= 0; i--) {
      const item = this.items[i];
      const dx = Math.abs(item.x - this.basket.x);
      const dy = Math.abs(item.y - this.basket.y);
      if (dx < 40 && dy < 20) {
        this.score += 10;
        uiManager.updateMinigameOverlay({ score: this.score });
        this.items.splice(i, 1);
        item.destroy();
      }
    }
  }

  private endGame(): void {
    this.spawnTimer?.destroy();
    this.countdownTimer?.destroy();
    this.items.forEach(i => i.destroy());
    this.items = [];

    saveMiniGameScore(this.checkpointId, this.score);
    uiManager.hideMinigameOverlay();
    uiManager.showMinigameResult('Catch Complete!', this.score, () => {
      uiManager.hideDialog();
      this.scene.start('WorldScene');
    });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/game/scenes/minigames/CatchScene.ts
git commit -m "feat(v2): add CatchScene mini-game with falling items and basket"
```

---

### Task 12: MatchScene

**Files:**
- Create: `src/game/scenes/minigames/MatchScene.ts`

- [ ] **Step 1: Create MatchScene**

```typescript
// src/game/scenes/minigames/MatchScene.ts
import Phaser from 'phaser';
import { uiManager } from '../../../ui/UIManager';
import { saveMiniGameScore } from '../../systems/SaveSystem';
import { MatchConfig } from '../../data/checkpoints';

interface Card {
  sprite: Phaser.GameObjects.Sprite;
  pairIndex: number;
  flipped: boolean;
  matched: boolean;
}

export class MatchScene extends Phaser.Scene {
  private checkpointId = '';
  private pairs: MatchConfig['pairs'] = [];
  private cards: Card[] = [];
  private flippedCards: Card[] = [];
  private moves = 0;
  private matchedPairs = 0;
  private canFlip = true;

  constructor() {
    super({ key: 'MatchScene' });
  }

  init(data: { checkpointId: string; config: MatchConfig }): void {
    this.checkpointId = data.checkpointId;
    this.pairs = data.config.pairs;
    this.cards = [];
    this.flippedCards = [];
    this.moves = 0;
    this.matchedPairs = 0;
    this.canFlip = true;
  }

  create(): void {
    const { width, height } = this.cameras.main;
    this.cameras.main.setBackgroundColor('#1a1a2e');

    // Overlay
    uiManager.showMinigameOverlay({
      title: 'Memory Match!',
      score: 0,
      progress: `0/${this.pairs.length}`,
    });

    // Create card deck — each pair gets two cards
    const cardData: Array<{ pairIndex: number }> = [];
    this.pairs.forEach((_, i) => {
      cardData.push({ pairIndex: i }, { pairIndex: i });
    });

    // Shuffle
    for (let i = cardData.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cardData[i], cardData[j]] = [cardData[j], cardData[i]];
    }

    // Layout grid
    const cols = width > height ? 4 : 3;
    const rows = Math.ceil(cardData.length / cols);
    const cardW = 64;
    const cardH = 80;
    const gapX = 16;
    const gapY = 16;
    const totalW = cols * cardW + (cols - 1) * gapX;
    const totalH = rows * cardH + (rows - 1) * gapY;
    const startX = (width - totalW) / 2 + cardW / 2;
    const startY = (height - totalH) / 2 + cardH / 2;

    cardData.forEach((cd, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = startX + col * (cardW + gapX);
      const y = startY + row * (cardH + gapY);

      const sprite = this.add.sprite(x, y, 'card-back')
        .setInteractive()
        .setDepth(5);

      const card: Card = {
        sprite,
        pairIndex: cd.pairIndex,
        flipped: false,
        matched: false,
      };

      sprite.on('pointerdown', () => this.flipCard(card));
      this.cards.push(card);
    });
  }

  private flipCard(card: Card): void {
    if (!this.canFlip || card.flipped || card.matched) return;
    if (this.flippedCards.length >= 2) return;

    // Show face
    card.flipped = true;
    const iconIndex = card.pairIndex % 6;
    card.sprite.setTexture(`match-icon-${iconIndex}`);

    this.flippedCards.push(card);

    if (this.flippedCards.length === 2) {
      this.moves++;
      this.canFlip = false;

      const [a, b] = this.flippedCards;
      if (a.pairIndex === b.pairIndex) {
        // Match!
        a.matched = true;
        b.matched = true;
        this.matchedPairs++;
        uiManager.updateMinigameOverlay({
          score: this.matchedPairs * 100,
          progress: `${this.matchedPairs}/${this.pairs.length}`,
        });

        this.flippedCards = [];
        this.canFlip = true;

        if (this.matchedPairs >= this.pairs.length) {
          this.time.delayedCall(500, () => this.endGame());
        }
      } else {
        // No match — flip back after delay
        this.time.delayedCall(1000, () => {
          a.flipped = false;
          b.flipped = false;
          a.sprite.setTexture('card-back');
          b.sprite.setTexture('card-back');
          this.flippedCards = [];
          this.canFlip = true;
        });
      }
    }
  }

  private endGame(): void {
    // Score: higher is better. Base 1000 minus moves penalty.
    const score = Math.max(0, 1000 - (this.moves - this.pairs.length) * 50);
    saveMiniGameScore(this.checkpointId, score);
    uiManager.hideMinigameOverlay();
    uiManager.showMinigameResult(
      `Match Complete! (${this.moves} moves)`,
      score,
      () => {
        uiManager.hideDialog();
        this.scene.start('WorldScene');
      },
    );
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/game/scenes/minigames/MatchScene.ts
git commit -m "feat(v2): add MatchScene mini-game with card flip and pair matching"
```

---

### Task 13: Mini-game CSS

**Files:**
- Update: `src/ui/styles/minigames.css`

- [ ] **Step 1: Add mini-game overlay and quiz styles**

```css
/* src/ui/styles/minigames.css */

/* Mini-game Overlay (score, timer, progress) */
.minigame-overlay {
  position: absolute;
  top: 0; left: 0; width: 100%;
  pointer-events: none;
  padding: 12px;
}

.minigame-overlay__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(0, 0, 0, 0.6);
  padding: 8px 16px;
  border-radius: var(--radius);
  margin-bottom: 8px;
}

.minigame-overlay__title {
  font-family: var(--font-display);
  font-size: clamp(10px, 2.5vw, 16px);
  color: var(--color-primary);
}

.minigame-overlay__progress {
  font-family: var(--font-display);
  font-size: clamp(8px, 2vw, 12px);
  color: #ccc;
}

.minigame-overlay__stats {
  display: flex;
  gap: 16px;
  background: rgba(0, 0, 0, 0.4);
  padding: 6px 12px;
  border-radius: var(--radius);
  width: fit-content;
}

.minigame-overlay__score,
.minigame-overlay__timer {
  font-family: var(--font-body);
  font-size: clamp(12px, 2.5vw, 16px);
  color: #fff;
}

/* Quiz Overlay */
.quiz-overlay {
  position: absolute;
  bottom: 10%;
  left: 50%;
  transform: translateX(-50%);
  width: min(90vw, 500px);
  background: rgba(0, 0, 0, 0.8);
  border-radius: var(--radius);
  padding: 20px;
  text-align: center;
}

.quiz-overlay__question {
  font-family: var(--font-body);
  font-size: clamp(14px, 3vw, 20px);
  color: #fff;
  margin-bottom: 16px;
  line-height: 1.4;
}

.quiz-overlay__options {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

@media (max-width: 480px) {
  .quiz-overlay__options {
    grid-template-columns: 1fr;
  }
}

.btn--quiz {
  font-family: var(--font-body);
  font-size: clamp(12px, 2.5vw, 16px);
  padding: 12px 16px;
  background: var(--color-secondary);
  color: #fff;
  border: 2px solid transparent;
  border-radius: var(--radius);
  cursor: pointer;
  min-height: 44px;
  transition: background 0.2s, border-color 0.2s;
}

.btn--quiz:hover {
  background: var(--color-primary);
}

.quiz-overlay__feedback {
  margin-top: 12px;
  font-family: var(--font-display);
  font-size: clamp(12px, 2.5vw, 16px);
  padding: 8px;
  border-radius: var(--radius);
}

.quiz-overlay__feedback--correct {
  color: #4caf50;
  background: rgba(76, 175, 80, 0.2);
}

.quiz-overlay__feedback--wrong {
  color: var(--color-accent);
  background: rgba(232, 131, 107, 0.2);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/ui/styles/minigames.css
git commit -m "feat(v2): add mini-game overlay and quiz CSS styles"
```

---

## Chunk 5: Polish & Verification

### Task 14: Particle effects

**Files:**
- Create: `src/game/rendering/ParticleEffects.ts`

- [ ] **Step 1: Create ParticleEffects (simplified — Phaser particle system)**

```typescript
// src/game/rendering/ParticleEffects.ts
import Phaser from 'phaser';

export class ParticleEffects {
  private emitters: Phaser.GameObjects.Particles.ParticleEmitter[] = [];

  /** Create ambient petal particles drifting across the scene */
  createPetals(scene: Phaser.Scene): void {
    // Create a small petal texture
    const canvas = scene.textures.createCanvas('particle-petal', 8, 8);
    if (canvas) {
      const ctx = canvas.context;
      ctx.fillStyle = '#ffb6c1';
      ctx.beginPath();
      ctx.ellipse(4, 4, 4, 2, 0, 0, Math.PI * 2);
      ctx.fill();
      canvas.refresh();
    }

    const emitter = scene.add.particles(0, 0, 'particle-petal', {
      x: { min: 0, max: scene.cameras.main.width * 2 },
      y: -10,
      lifespan: 6000,
      speedX: { min: -20, max: -5 },
      speedY: { min: 15, max: 30 },
      angle: { min: 0, max: 360 },
      rotate: { min: 0, max: 360 },
      alpha: { start: 0.7, end: 0 },
      scale: { start: 1, end: 0.5 },
      frequency: 2000,
      maxParticles: 15,
    });
    emitter.setScrollFactor(0.5);
    emitter.setDepth(-10);
    this.emitters.push(emitter);
  }

  /** Create sparkle burst at a position */
  createSparkle(scene: Phaser.Scene, x: number, y: number): void {
    const canvas = scene.textures.createCanvas('particle-sparkle', 4, 4);
    if (canvas) {
      const ctx = canvas.context;
      ctx.fillStyle = '#ffd700';
      ctx.fillRect(0, 0, 4, 4);
      canvas.refresh();
    }

    const emitter = scene.add.particles(x, y, 'particle-sparkle', {
      speed: { min: 50, max: 100 },
      lifespan: 800,
      alpha: { start: 1, end: 0 },
      scale: { start: 1, end: 0 },
      quantity: 10,
      emitting: false,
    });
    emitter.explode(10);
    this.emitters.push(emitter);
  }

  destroy(): void {
    this.emitters.forEach(e => e.destroy());
    this.emitters = [];
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/game/rendering/ParticleEffects.ts
git commit -m "feat(v2): add ParticleEffects with petal drift and sparkle burst"
```

---

### Task 15: Helpers and final wiring

**Files:**
- Create: `src/utils/helpers.ts`

- [ ] **Step 1: Create helpers.ts**

```typescript
// src/utils/helpers.ts

/** Clamp a number between min and max */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Linear interpolation */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Distance between two points */
export function distance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/utils/helpers.ts
git commit -m "feat(v2): add utility helpers (clamp, lerp, distance)"
```

---

### Task 16: Verify build and test

- [ ] **Step 1: Run TypeScript compiler to check for errors**

```bash
npx tsc --noEmit
```

Fix any type errors found.

- [ ] **Step 2: Run dev server and verify game loads**

```bash
npm run dev
```

Open in browser, verify:
- Main menu appears
- "New Game" → Dressing room shows with outfit picker
- Start → World loads with tiles, player, partner, NPCs
- Player moves with WASD/arrows
- Walking near checkpoints shows interaction prompt
- Pressing E enters mini-game
- Quiz, Catch, Match all playable
- Returning to world restores position
- HUD shows checkpoint progress
- Settings menu works

- [ ] **Step 3: Fix any issues found during testing**

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat(v2): complete MVP rebuild — all scenes, mini-games, and UI working"
```
