# V2 Foundation + Airport Slice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Clean-room v2 of the couples game: a polished foundation (scene framework, save, input, dialogue, feel kit, audio, asset pipeline) proven by a minimal content slice — title screen, Ben Gurion airport chapter, check-in gauntlet minigame, flight cutscene.

**Architecture:** Phaser 3 + Vite + TypeScript (strict) static site. All art from verified CC0 Kenney packs loaded via a typed asset manifest. Maps are typed TS data rendered through Phaser tilemaps. V1 is preserved on master and via tag `v1-final`; v2 is built on branch `v2-foundation` in a worktree. The only v1 code carried over is the procedural audio engine (`src/audio/`), behind a thin facade.

**Tech Stack:** Phaser ^3.90, Vite ^5/^6, TypeScript ^5 strict, Vitest for unit tests, Playwright MCP for visual verification.

**Spec:** `docs/superpowers/specs/2026-06-11-v2-foundation-airport-design.md`

---

## Verified asset sources (downloaded and inspected during planning — all CC0)

| Pack | Direct zip URL | Use |
|---|---|---|
| RPG Urban Pack | `https://kenney.nl/media/pages/assets/rpg-urban-pack/0a097d1dc7-1677578575/kenney_rpg-urban-pack.zip` | World tiles + characters. `Tilemap/tilemap_packed.png` is 432x288 = 27 cols x 18 rows of 16px frames, NO spacing. Characters: 4 directions x 3 frames (idle + 2 walk), right-side columns. |
| Pixel UI Pack | `https://kenney.nl/media/pages/assets/pixel-ui-pack/821e760f21-1677661508/kenney_pixel-ui-pack.zip` | 9-slice panels, buttons (`9-Slice/Colored/*.png`). |
| Roguelike Modern City | `https://kenney.nl/media/pages/assets/roguelike-modern-city/0ff3dfff2b-1677694743/kenney_roguelike-modern-city.zip` | RESERVE ONLY — different palette. Use a tile only if recolored to match; prefer not using it at all. |
| Kenney Fonts | resolve from `https://kenney.nl/assets/kenney-fonts` (extract `href='...kenney_kenney-fonts.zip'` from page HTML) | `Kenney Pixel.ttf` for all text. |

If a URL has gone stale, re-resolve it: fetch `https://kenney.nl/assets/<slug>` and regex `href='(https://kenney\.nl/media/pages/assets/[^']+kenney_[^']+\.zip)'`.

**Frame-index workflow (used by several tasks):** exact frame indices in `tilemap_packed.png` are discovered with the FrameExplorer debug scene (Task 3), which renders the sheet with index labels. Screenshot it via Playwright MCP, read the screenshot, record indices as named constants in `src/assets/frames.ts`. Never hardcode bare numbers in scenes — always named constants.

---

## File structure (target state)

```
src/
├── main.ts                      — Phaser config + system bootstrap
├── core/
│   ├── types.ts                 — SceneKey union, ScenePayloads map
│   ├── BaseScene.ts             — fades, typed goTo, cleanup registry
│   ├── SaveSystem.ts            — versioned localStorage + corruption guard
│   ├── InputSystem.ts           — keyboard + tap-to-move, interact events
│   ├── pathfinding.ts           — A* with binary min-heap
│   ├── feel.ts                  — shake/flash/pop/floatText/particle presets
│   ├── errorOverlay.ts          — global crash overlay (DOM)
│   └── debugMenu.ts             — dev-only scene jump + FPS (DOM)
├── dialogue/
│   ├── DialogueSystem.ts        — promise-based dialogue runner (Phaser UI)
│   └── scripts.ts               — all dialogue content as typed data
├── audio/                       — v1 engines copied verbatim + AudioFacade.ts
├── assets/
│   ├── manifest.ts              — typed asset registry (key → path → loader)
│   ├── frames.ts                — named spritesheet frame indices
│   └── packs/                   — committed pack files (only the files we use)
│       └── ATTRIBUTION.md
├── world/
│   ├── mapTypes.ts              — MapDef interface
│   ├── buildMap.ts              — MapDef → Phaser tilemap layers + collision
│   ├── Character.ts             — shared 4-dir animated sprite base
│   ├── Player.ts  Partner.ts  Npc.ts
│   └── Checkpoint.ts            — memory trigger zones
├── ui/
│   ├── MemoryCard.ts            — photo + message overlay
│   └── TouchControls.ts         — on-screen interact button (mobile)
├── data/
│   └── memories.ts              — checkpoint content (typed, not JSON)
└── scenes/
    ├── BootScene.ts             — manifest loading + progress bar
    ├── TitleScene.ts
    ├── airport/AirportScene.ts + airportMap.ts
    ├── minigames/CheckinGauntletScene.ts (+ stage modules)
    ├── FlightScene.ts
    └── dev/FrameExplorerScene.ts
tests/                           — Vitest unit tests (save, pathfinding, dialogue queue, scoring)
```

Conventions: depth bands — 0-9 ground/props, 10-19 characters (y-sorted), 20-29 overhead, 30-39 in-scene UI, 40+ overlays. All texture keys/frame indices via `manifest.ts` / `frames.ts` constants. Every scene extends `BaseScene` and registers cleanups.

---

## Task 0: Branch + repo reset

**Files:** delete v1 `src/**` (branch only), rewrite `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`.

- [ ] **Step 1: Verify isolation.** You must be in the `v2-foundation` worktree (created by the orchestrator). Run `git branch --show-current` → expect `v2-foundation`. Run `git tag -l v1-final` → expect `v1-final` exists. If either fails, STOP and report.
- [ ] **Step 2: Preserve audio.** `Copy-Item src/audio _keep-audio -Recurse` (it returns in Task 5; the copy avoids a checkout from tag later).
- [ ] **Step 3: Remove v1.** `git rm -r -q src; git rm -q index.html vite.config.ts tsconfig.json package.json package-lock.json render.yaml`. Do NOT touch `docs/` or `.claude/`.
- [ ] **Step 4: Write the new minimal config files.**

`package.json`:
```json
{
  "name": "mahalo",
  "private": true,
  "version": "2.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "check": "tsc --noEmit && vitest run && vite build"
  },
  "dependencies": { "phaser": "^3.90.0" },
  "devDependencies": { "typescript": "^5.6.0", "vite": "^6.0.0", "vitest": "^3.0.0" }
}
```

`tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022", "module": "ESNext", "moduleResolution": "bundler",
    "strict": true, "noUncheckedIndexedAccess": true, "noImplicitOverride": true,
    "skipLibCheck": true, "types": ["vite/client"], "noEmit": true
  },
  "include": ["src", "tests"]
}
```

`vite.config.ts`:
```ts
import { defineConfig } from 'vite';
export default defineConfig({ base: './', build: { chunkSizeWarningLimit: 1600 } });
```

`index.html`: dark page (`background:#1a1c2c`), `<div id="game">`, `<script type="module" src="/src/main.ts">`, viewport meta `width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no`, title "Mahalo".

`render.yaml`: recreate as v1 had it (static site, build `npm install && npm run build`, publish `dist`) — check v1 content via `git show v1-final:render.yaml`.

- [ ] **Step 5: Skeleton boot.** Create `src/core/errorOverlay.ts` (port the concept from `git show v1-final:src/ui/errorBoundary.ts` — window error/unhandledrejection listeners → fixed-position DOM overlay with message + stack + reload button). Create `src/main.ts`:

```ts
import Phaser from 'phaser';
import { installErrorOverlay } from './core/errorOverlay';
import { BootScene } from './scenes/BootScene';

installErrorOverlay();

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: 640,
  height: 360,
  pixelArt: true,
  backgroundColor: '#1a1c2c',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  physics: { default: 'arcade' },
  scene: [BootScene],
});
```

`src/scenes/BootScene.ts` for now: a scene that renders the text "MAHALO v2 skeleton" and a moving rectangle (temporary, replaced in Task 2 — primitives allowed only in this throwaway step).

- [ ] **Step 6: Verify.** `npm install` then `npm run check` → expect tsc clean, 0 tests (vitest passWithNoTests not set — add one trivial test `tests/smoke.test.ts` asserting `1+1===2`), build success. Then `npm run dev` in background, Playwright MCP `browser_navigate` to `http://localhost:5173`, screenshot: dark page with text and moving rectangle, no console errors.
- [ ] **Step 7: Commit** `feat(v2): repo reset — fresh skeleton, v1 preserved on master and tag v1-final`.

### Task 1: Asset acquisition + manifest + BootScene

**Files:** Create `src/assets/packs/**` (downloaded files), `src/assets/packs/ATTRIBUTION.md`, `src/assets/manifest.ts`, real `src/scenes/BootScene.ts`, `src/scenes/TitleScene.ts` (stub).

- [ ] **Step 1: Download packs** (URLs in the table above) to `$env:TEMP`, unzip, copy ONLY used files into the repo:
  - `src/assets/packs/urban/tilemap_packed.png` (from RPG Urban Pack `Tilemap/`)
  - `src/assets/packs/ui/` — from Pixel UI Pack `9-Slice/Colored/`: `blue.png`, `blue_pressed.png`, `yellow.png`, `yellow_pressed.png`, `grey.png`
  - `src/assets/packs/fonts/KenneyPixel.ttf` (from Kenney Fonts `Fonts/Kenney Pixel.ttf`)
- [ ] **Step 2: ATTRIBUTION.md** — table: pack name, author Kenney, license CC0 1.0, source URL, files used. Hard rule stated at top: no asset enters this directory without a row here.
- [ ] **Step 3: manifest.ts**:

```ts
export const TEX = {
  urban: 'urban',
  uiBlue: 'ui-blue', uiBluePressed: 'ui-blue-pressed',
  uiYellow: 'ui-yellow', uiYellowPressed: 'ui-yellow-pressed', uiGrey: 'ui-grey',
} as const;

type SpritesheetEntry = { kind: 'spritesheet'; key: string; url: string; frameWidth: number; frameHeight: number };
type ImageEntry = { kind: 'image'; key: string; url: string };
export type ManifestEntry = SpritesheetEntry | ImageEntry;

export const MANIFEST: ManifestEntry[] = [
  { kind: 'spritesheet', key: TEX.urban, url: new URL('./packs/urban/tilemap_packed.png', import.meta.url).href, frameWidth: 16, frameHeight: 16 },
  { kind: 'image', key: TEX.uiBlue, url: new URL('./packs/ui/blue.png', import.meta.url).href },
  // ... one entry per file above
];
```

- [ ] **Step 4: BootScene** loads every MANIFEST entry, draws a progress bar from UI panel images once available (bootstrapping order: load the two bar images with `this.load.image` first in `init`-phase queue, then the rest; an all-asset progress bar built from `load.on('progress')`). Loads the TTF via CSS `@font-face` injection + `document.fonts.load` before `create` completes. On complete → `TitleScene` (stub: scene key + "TITLE" text).
- [ ] **Step 5: Verify** via dev server + Playwright screenshot (progress bar visible on throttled reload is optional; main check: no missing-texture green squares, console clean, TitleScene reached).
- [ ] **Step 6: Commit** `feat(v2): asset pipeline — CC0 packs, typed manifest, boot loader`.

### Task 2: Core scene framework + SaveSystem (TDD)

**Files:** Create `src/core/types.ts`, `src/core/BaseScene.ts`, `src/core/SaveSystem.ts`, `tests/saveSystem.test.ts`.

- [ ] **Step 1: types.ts**

```ts
export const SCENES = {
  boot: 'BootScene', title: 'TitleScene', airport: 'AirportScene',
  checkin: 'CheckinGauntletScene', flight: 'FlightScene', frameExplorer: 'FrameExplorerScene',
} as const;
export type SceneKey = typeof SCENES[keyof typeof SCENES];

export interface ScenePayloads {
  [k: string]: unknown;
  TitleScene: undefined;
  AirportScene: { spawn?: 'entrance' | 'checkin-desk' } | undefined;
  CheckinGauntletScene: undefined;
  FlightScene: undefined;
}
```

- [ ] **Step 2: SaveSystem — failing tests first.** localStorage-free design: constructor takes a `Storage`-like interface so tests inject a fake. Tests (write them, run, expect FAIL on missing module):
  - fresh storage → `load()` returns default save (`version: 2`, `chapter: 'airport'`, empty stars/memories, default settings)
  - `save()` then `load()` round-trips
  - corrupted JSON in storage → `load()` returns defaults AND `wasCorrupted` flag true (UI shows toast)
  - unknown future version → treated as corrupted (no crash)
  - `setStars('checkin', 2)` keeps max of existing and new
- [ ] **Step 3: Implement SaveSystem** (`STORAGE_KEY = 'mahalo-save-v2'`; pure class + a singleton bound to `window.localStorage`). Run tests → PASS.
- [ ] **Step 4: BaseScene.**

```ts
export abstract class BaseScene extends Phaser.Scene {
  private cleanups: Array<() => void> = [];
  protected onShutdown(fn: () => void) { this.cleanups.push(fn); }

  override create(...args: unknown[]) {
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.cleanups.forEach(fn => fn()); this.cleanups = [];
    });
    this.cameras.main.fadeIn(300, 26, 28, 44);
  }

  goTo<K extends keyof ScenePayloads & SceneKey>(key: K, payload?: ScenePayloads[K]) {
    this.cameras.main.fadeOut(300, 26, 28, 44);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start(key, payload as object | undefined);
    });
  }
}
```

All subsequent scenes extend BaseScene and call `super.create()`.
- [ ] **Step 5:** `npm run check` green. **Commit** `feat(v2): scene framework + versioned save system with corruption guard`.

### Task 3: Debug tools — FrameExplorer + debugMenu

**Files:** Create `src/scenes/dev/FrameExplorerScene.ts`, `src/core/debugMenu.ts`, `src/assets/frames.ts` (initial).

- [ ] **Step 1: FrameExplorerScene** (registered only when `import.meta.env.DEV`): renders the urban sheet frame-by-frame in a grid at 2x with tiny index labels every frame and bold labels every row start; arrow keys / drag to pan. Purpose: discover frame indices visually.
- [ ] **Step 2: debugMenu.ts** (DEV only): DOM panel toggled by backtick — buttons to jump to every scene, FPS readout, "clear save" button.
- [ ] **Step 3: Use it.** Dev server + Playwright: open FrameExplorer, screenshot regions, identify and record in `frames.ts`:
  - 2 player characters (Michael: dark-haired character; Hadar: pick a distinct second character) — for each: down/up/left/right idle + 2 walk frames (12 frames each)
  - 3+ NPC characters for airport travelers
  - floor tiles (light interior floor), wall tiles, door, window, counter/desk tiles, seats/bench, plants/trees, luggage-ish props (crates/bags), vehicle frames (for tarmac dressing)
  Format: `export const F = { michael: { down: [a,b,c], up: [...], left: [...], right: [...] }, ... , tiles: { floor: n, wallTop: n, ... } }` — every entry a named constant with a comment.
- [ ] **Step 4: Commit** `feat(v2): dev tools — frame explorer, debug menu, named frame registry`.

### Task 4: Input + pathfinding (TDD) + feel kit

**Files:** Create `src/core/pathfinding.ts`, `tests/pathfinding.test.ts`, `src/core/InputSystem.ts`, `src/core/feel.ts`, `src/ui/TouchControls.ts`.

- [ ] **Step 1: pathfinding tests first** (pure module: `findPath(isWalkable: (x,y)=>boolean, w, h, from, to): Point[] | null`): straight line, around obstacle, no path → null, from===to → [], target blocked → path to nearest walkable neighbor (best-so-far fallback — v1 lesson). Run → FAIL.
- [ ] **Step 2: Implement A*** with a binary min-heap (no linear scans — v1 perf lesson). 4-directional. Run → PASS.
- [ ] **Step 3: InputSystem** (constructed per world scene): exposes `update(): {dx,dy}` normalized from WASD/arrows; tap/click on world → emits `moveTo(worldX, worldY)`; `interact` event from E key / on-screen button / tapping an interactable. `TouchControls`: bottom-right interact button (UI panel image + label), shown only when a `currentInteractable` is set; auto-shows on touch devices.
- [ ] **Step 4: feel.ts** — small pure-Phaser helpers, all tween-based: `shake(scene, ms?, intensity?)`, `flash(scene, color?)`, `pop(obj)` (scale 1→1.15→1 back.out), `floatText(scene, x, y, text, color)` (rise+fade, KenneyPixel font), `confetti(scene, x, y)` + `sparkle(scene, x, y)` (particle emitters using small UI/tile frames as particles), `pulseRing(scene, x, y)` (tap feedback — tweened ring image, not a primitive: use a UI panel circle or a ring frame; if none suitable in packs, generate ONE 16px ring texture at boot via `Graphics.generateTexture` — this is a particle/UI element, permitted by the quality bar).
- [ ] **Step 5:** `npm run check` green. **Commit** `feat(v2): input system, A* pathfinding, game-feel kit`.

### Task 5: Audio port behind facade

**Files:** Restore `_keep-audio/*` → `src/audio/` (then delete `_keep-audio`), create `src/audio/AudioFacade.ts`.

- [ ] **Step 1:** Move the six v1 files back to `src/audio/`. Fix any imports referencing removed v1 paths (they may import `utils/constants` etc. — inline whatever tiny constants they need; do not recreate v1 modules). `tsc --noEmit` must pass with strict (the v1 files were strict-built already; patch if not).
- [ ] **Step 2: AudioFacade.ts** — the ONLY audio API scenes may use: `init()` (user-gesture unlock + suspend/resume handler — verify v1's mobile resume fix survives), `playMusic(mood: 'title' | 'airport' | 'tense' | 'flight')`, `stopMusic()`, `sfx(name: 'tap' | 'success' | 'fail' | 'step' | 'whoosh' | 'ding' | 'stamp')`, volume get/set persisted via SaveSystem settings. Map moods/names onto the v1 engines' existing capabilities (read their public methods; pick closest existing presets — do NOT compose new music).
- [ ] **Step 3:** Wire `init()` to first pointer event in TitleScene. Verify in browser: title plays music after first click, no console errors. **Commit** `feat(v2): v1 procedural audio engines behind AudioFacade`.

### Task 6: Dialogue system (TDD for queue logic)

**Files:** Create `src/dialogue/DialogueSystem.ts`, `src/dialogue/scripts.ts`, `tests/dialogue.test.ts`.

- [ ] **Step 1: Types + pure logic tests first.** `DialogueLine = { speaker: 'michael' | 'hadar' | string; text: string; choices?: { label: string; next: DialogueLine[] }[] }`. Pure `DialogueWalker` class (no Phaser): `current()`, `advance(choiceIndex?)`, `done` — tests: linear advance, branch via choice, nested branch returns to end, advance past end is safe. FAIL → implement → PASS.
- [ ] **Step 2: Phaser layer.** `runDialogue(scene, lines): Promise<void>` — bottom panel (9-slice `uiGrey`), speaker name in yellow, typewriter text (per-char timer, tap/E skips to full text, second tap advances), portrait: the speaker's idle-down frame scaled 3x in a small panel, choices as 2-3 buttons (`uiBlue`/`uiYellow` panels + pop on select). Blocks world input while open (InputSystem gets `enabled` flag). Must use feel.ts and AudioFacade (`tap` per advance).
- [ ] **Step 3:** Demo: temporary debugMenu button runs a 3-line script with one choice in TitleScene; verify via Playwright screenshots (panel visible, typewriter mid-state, choices render). Remove demo button after screenshots.
- [ ] **Step 4:** `npm run check` green. **Commit** `feat(v2): dialogue system — portraits, typewriter, choices`.

### Task 7: Title screen (full polish)

**Files:** Rewrite `src/scenes/TitleScene.ts`.

- [ ] **Step 1: Build.** Sky gradient backdrop (multi-stop, generated once — background, permitted), drifting cloud layer (use white/soft frames from packs or one generated soft blob used as particle — keep it subtle), parallax silhouette strip at the bottom built from urban tiles (rooftops), "MAHALO" wordmark in KenneyPixel with letter-by-letter drop-in + idle bob tween, then "New Game" / "Continue" buttons (UI panels, hover/pressed states, pop + sfx on select). Continue only if `SaveSystem.exists()`. New Game with existing save → confirm dialog (UI panels). Music: `playMusic('title')` after first interaction.
- [ ] **Step 2: Quality pass.** Playwright at 640x360 and phone portrait 390x844: everything readable, FIT letterboxing acceptable, buttons tappable. Screenshot both, fix what looks wrong. No console errors.
- [ ] **Step 3:** `npm run check` green. **Commit** `feat(v2): animated title screen`.

### Task 8: World framework — map building + characters + checkpoints

**Files:** Create `src/world/mapTypes.ts`, `src/world/buildMap.ts`, `src/world/Character.ts`, `src/world/Player.ts`, `src/world/Partner.ts`, `src/world/Npc.ts`, `src/world/Checkpoint.ts`, `src/ui/MemoryCard.ts`, `src/data/memories.ts`.

- [ ] **Step 1: mapTypes.ts**

```ts
export interface MapDef {
  width: number; height: number;            // in tiles (16px)
  ground: number[][];                        // frame indices into TEX.urban
  props: number[][];                         // -1 = empty
  overhead: number[][];                      // renders above characters; -1 = empty
  collision: number[][];                     // 0 walkable, 1 solid
  spawns: Record<string, { x: number; y: number }>;   // tile coords
  interactables: { id: string; x: number; y: number; w: number; h: number }[];
}
```

- [ ] **Step 2: buildMap.ts** — `buildMap(scene, def)`: three `make.tilemap({ data })` layers from the arrays (tileset = urban sheet, 16px, no spacing), depths 0/5/20; returns `{ isWalkable(x,y), pixelW, pixelH }`. Camera bounds + arcade world bounds set from def.
- [ ] **Step 3: Character.ts** — sprite subclass: takes a frame set from `frames.ts`, registers per-direction anims (generated once per frame-set key), `walkTo` path following (tile path from pathfinding, smooth lerp between tile centers, anim matches direction, ~80 px/s), `face(dir)`, y-sorted depth (`depth = 10 + y/1000`). Player: driven by InputSystem (direct vector move with arcade collision against solid tiles via a static group OR manual grid check each frame — use grid check + sub-tile resolution, simpler and deterministic). Tap-to-move: path preview via `pulseRing` at destination. Partner: follow player with rubber-band (idle until >40px, then path toward player's trail position; never blocks). Npc: idle loops, optional patrol path, optional `onInteract` dialogue.
- [ ] **Step 4: Checkpoint.ts + MemoryCard.ts + memories.ts.** Checkpoint zone (from `def.interactables` with id prefixed `memory:`) — when player inside: floating bobbing indicator above the spot + sets InputSystem interactable; on interact → MemoryCard overlay: photo placeholder area (9-slice panel; actual photos arrive when Michael adds them — render a soft gradient + caption if photo asset missing), title, message, date, close. Marks seen in SaveSystem. `memories.ts` ships ONE entry: `departures-hall` with a real message placeholder text Michael will edit (this is content data, flagged clearly at top of file).
- [ ] **Step 5: Smoke scene test.** Temporary dev map (10x8, in debugMenu) to walk around with keyboard + tap; Playwright-verify movement, partner follow, checkpoint card. Remove or keep as dev-only `frameExplorer` sibling (keep: `DevWorldScene`, DEV-registered — useful forever).
- [ ] **Step 6:** `npm run check` green. **Commit** `feat(v2): world framework — maps, animated characters, partner follow, memory checkpoints`.

### Task 9: Airport scene

**Files:** Create `src/scenes/airport/airportMap.ts`, `src/scenes/airport/AirportScene.ts`.

- [ ] **Step 1: airportMap.ts** — Ben Gurion terminal ~40x25 tiles authored as MapDef arrays. Required zones: entrance (south), departures hall with the memory checkpoint, check-in desk row (interactable `checkin-desk`), seating area, windows along the top wall (overhead layer), security/gate corridor (visual only, used by minigame fiction). Author it BY LOOKING: build incrementally, screenshot via Playwright at each pass, adjust. Floors must vary (accent rows/carpet strips), walls have depth (top wall face + cap), at least 12 prop clusters (plants, seats, luggage, signage built from tile frames).
- [ ] **Step 2: AirportScene.ts** — extends BaseScene: builds map, spawns Michael + Hadar (Partner) at `spawns.entrance`, 6+ NPC travelers (mixed idle/patrol), ambient: departure-board "flip" (a small sign region where random tile frames swap every few seconds + `ding` sfx occasionally), occasional NPC walk bursts. Entry beat: short dialogue (write 4-6 lines in `scripts.ts` — excited-couple tone, one choice moment e.g. "duty free first?" / "straight to the gate!"). `playMusic('airport')`. Check-in desk interact → confirm dialogue → `goTo('CheckinGauntletScene')`.
- [ ] **Step 3: Quality bar pass** (all six rules from the spec) with Playwright desktop + phone viewport screenshots. Iterate until it genuinely looks alive — this task is done when a screenshot of the terminal would not embarrass the spec's quality bar, not when code merely runs.
- [ ] **Step 4:** `npm run check` green. **Commit** `feat(v2): Ben Gurion airport chapter`.

### Task 10: Check-in gauntlet minigame

**Files:** Create `src/scenes/minigames/CheckinGauntletScene.ts`, `src/scenes/minigames/stages/{PackStage,PassportStage,SecurityStage,GateDashStage}.ts`, `src/scenes/minigames/scoring.ts`, `tests/scoring.test.ts`.

- [ ] **Step 1: scoring.ts TDD.** Pure: each stage reports `{ score: 0..100 }`; `totalStars(scores: number[]): 1|2|3` (avg ≥85 → 3, ≥60 → 2, else 1); tests for boundaries. FAIL → implement → PASS.
- [ ] **Step 2: Gauntlet shell.** Scene orchestrates 4 stages sequentially: intro card per stage (name + one-line how-to + tap to start), stage runs 20-40s, result flash (feel.ts + sfx), next. After stage 4: results screen — per-stage bars, total stars (animated pop, confetti for 3), "Back to terminal" → `goTo('AirportScene', { spawn: 'checkin-desk' })`. Stars saved via `setStars('checkin', n)` (keeps max).
- [ ] **Step 3: Stages** (each its own module with `run(scene, ctx): Promise<number>`; all use urban-sheet frames for items, UI panels for chrome, feel.ts everywhere; keyboard AND touch):
  1. **PackStage** — 4x3 suitcase grid; queue of item sprites with weights; drag (pointer) or arrows+E to place; weight meter; over-limit blocks; score = items packed before timer.
  2. **PassportStage** — show Hadar's portrait briefly, then 6 passport cards (5 decoy characters from the sheet); pick the right one; then stamp-timing bar (marker oscillates, tap in green zone). Score = correctness + timing accuracy.
  3. **SecurityStage** — conveyor of item sprites crossing a scanner window; tap/space when inside the window; speed escalates; misses flash red + shake. Score = hits/attempts.
  4. **GateDashStage** — side-scroll auto-run along a corridor strip (built from tiles); tap/space to hop over luggage carts; reach gate before "final call" timer. Score = distance/time + collisions penalty.
- [ ] **Step 4:** Playwright run-through of all four stages (use `browser_evaluate` to stub timers where needed for determinism, but ALSO one honest manual-ish pass with screenshots). Phone viewport check. `npm run check` green.
- [ ] **Step 5: Commit** `feat(v2): check-in gauntlet minigame (4 stages, stars, scoring)`.

### Task 11: Flight cutscene + chapter loop

**Files:** Create `src/scenes/FlightScene.ts`; modify `scripts.ts`, TitleScene Continue routing.

- [ ] **Step 1: FlightScene.** Window-seat composition: cabin wall + window frame from tiles/panels (foreground, overhead depth), through the window: 3 parallax cloud layers + ocean below, day→sunset palette shift over ~40s (tween a tint/gradient overlay — screen-effect, permitted), plane wing hint. Beats: takeoff rumble (shake + whoosh), cruise + dialogue exchange (4-6 lines, warm, references Maui), sunset, "Maui — to be continued" card (KenneyPixel, sparkle), then fade → TitleScene. Entire scene skippable (corner button → jumps to card). Sets `chapter: 'flight-done'`.
- [ ] **Step 2: Loop wiring.** Boarding trigger in AirportScene appears after check-in played at least once (gate corridor interactable `board`): confirm dialogue → FlightScene. TitleScene Continue: `chapter === 'airport'` → AirportScene; `'flight-done'` → AirportScene with a "play again / replay flight" free-roam (boarding stays available). Keep it simple — no chapter select UI.
- [ ] **Step 3:** Playwright verify full loop: New Game → airport → dialogue → minigame → board → flight → title → Continue works. `npm run check` green.
- [ ] **Step 4: Commit** `feat(v2): flight cutscene + chapter completion loop`.

### Task 12: Final quality + verification sweep

- [ ] **Step 1:** Run the spec's six-rule quality bar against every scene with fresh Playwright screenshots (desktop + 390x844). Fix violations. Grep for stray primitives: `rg "add\.(rectangle|circle)" src/` — every hit must be a documented screen-effect/UI exception with a comment.
- [ ] **Step 2:** Performance: with debugMenu FPS visible, airport scene ≥55fps in a screenshot after 10s idle (desktop proxy for the phone budget; note real-device check remains for Michael).
- [ ] **Step 3:** `npm run check` green; `npm run preview` + Playwright against the PRODUCTION build (catches base-path/asset issues).
- [ ] **Step 4:** Rewrite `README.md` (concept, dev commands, asset attribution pointer, how to add a memory/photo).
- [ ] **Step 5: Commit** `chore(v2): quality sweep + docs`. Do NOT merge to master.

---

## Self-review notes

- Spec coverage: repo transition (T0), asset pipeline + attribution (T1), scene framework + save (T2), input + feel (T4), audio (T5), dialogue (T6), title (T7), world/checkpoint/memory (T8), airport + ambient + dialogue beat (T9), gauntlet 4 stages + stars (T10), flight + completion (T11), quality bar + 60fps + touch (T12). Tiled → TS map data is a logged deviation. Photos: spec's `photos/` dir deferred until real photos exist; MemoryCard handles absence — logged.
- Type consistency: `goTo` payloads match `ScenePayloads`; `setStars` defined in T2 tests and used in T10; `frames.ts` names referenced in T8-T10 are established in T3.
- Placeholders: content scenes intentionally specify contract + acceptance criteria rather than full inline code; layout must be tuned against real assets visually (logged decision). All commands, file paths, schemas, and tricky algorithms are concrete.
