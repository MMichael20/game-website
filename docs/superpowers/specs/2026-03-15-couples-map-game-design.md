# Couple's Map Game — Design Spec

## Overview

A browser-based 2D top-down RPG-style game where the player controls customizable avatar characters exploring a green, grassy world map. Checkpoints on the map represent real places meaningful to the couple (favourite restaurant, café, cinema, park, etc.). Each checkpoint offers a memory card (photo + personal message) and an optional mini-game tied to the location.

The game blends personal/sentimental value with legitimate gameplay — it should feel like a real game, not just a slideshow.

**Target platform:** Desktop browsers (keyboard controls). Mobile is out of scope for v1.

## Core Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Game engine | Phaser 3 | Purpose-built for browser 2D games, massive community, AI-friendly API |
| Build tool | Vite + TypeScript | Fast dev server, simple config, type safety |
| Map editor | Tiled | Visual tilemap design, native Phaser integration |
| Art style | Pixel art | Easiest for AI generation, consistent look, fits top-down RPG |
| Character size | 48-64px (Overcooked-style) | Chunky, expressive, cozy feel |
| Camera zoom | Medium | Character prominent (~1/8 screen height), 3-4 checkpoints visible |
| Movement | Top-down, 4/8 directional | Classic RPG feel (Pokémon/Zelda style) |
| Progression | Open world | All checkpoints accessible from the start |
| Hosting | Render (static site) | Free tier, no backend needed |
| Persistence | localStorage | Avatar choices + visited checkpoints saved in browser |

## Architecture

### Static Site — No Backend

All game data lives in JSON files bundled with the build. No database, no API, no server. The entire game is a static site deployed to Render's free tier.

```
Browser → Static HTML/JS/Assets on Render CDN
              ↓
         Phaser 3 Engine
              ↓
    ┌─────────┼─────────────┐
    ↓         ↓             ↓
 Tiled     Sprites     Checkpoint
 Tilemap   Sheets      Data (JSON)
```

### Scene Architecture

Phaser scenes manage the game's screens and transitions:

- **BootScene** — preload all assets with a loading progress bar. On completion, transition to MenuScene.
- **MenuScene** — title screen. "New Game" → AvatarScene. "Continue" → WorldScene (skips avatar, loads from localStorage).
- **AvatarScene** — character customizer for both avatars. On confirm → WorldScene. Accessible again from a pause/settings menu in WorldScene.
- **WorldScene** — main game: tilemap rendering, character movement, camera, checkpoint detection. Persists while mini-game scenes run on top.
- **MemoryCard** — shared overlay/popup used by all checkpoints (photo + message + "Play Mini-Game" button). Displayed as a Phaser overlay on top of WorldScene. Close → return to WorldScene. "Play Mini-Game" → launch the checkpoint's mini-game scene.
- **Mini-game scenes** — each type is its own scene (`quiz`, `catch`, `puzzle`, `match`, `cooking`). Launched on top of WorldScene. On completion → show score/result → return to WorldScene.

### Scene Transition Diagram

```
BootScene → MenuScene → AvatarScene → WorldScene
                ↑ (Continue)              ↕
                └─────────────────── WorldScene
                                      ↕ (enter checkpoint)
                                   MemoryCard (overlay)
                                      ↕ (play mini-game)
                                   MiniGame scene
                                      ↓ (complete/close)
                                   WorldScene
```

## Game World & Map

### Tiled Configuration

- **Tile size:** 32x32 pixels
- **Tileset format:** Embedded in the Tiled JSON export (single file, simpler loading)
- **Map size:** ~40x30 tiles (1280x960 pixels) — enough for 6-12 checkpoints with breathing room

### Tilemap Layers

| Layer | Type | Purpose |
|-------|------|---------|
| Ground | Tile layer | Grass tiles, dirt path tiles |
| Decoration | Tile layer | Trees, bushes, flowers, rocks |
| Buildings | Tile layer | Checkpoint buildings/landmarks |
| Collision | Tile layer | Invisible tiles — Phaser collision enabled on this layer |
| Checkpoints | Object layer | Rectangle objects with `name` property matching checkpoint `id` in data |

### Checkpoint Positioning

Checkpoint positions are defined **in the Tiled object layer only** — the `Checkpoints` object layer contains rectangle trigger zones. Each object's `name` property matches the `id` field in `checkpoints.json`. The JSON file holds content data (memory, mini-game config) but NOT positions. This keeps the map as the single source of truth for spatial layout.

### Map Design

- Green grass base with dirt paths connecting all checkpoints
- Scattered trees, bushes, and flowers for decoration
- 6-12 checkpoint buildings spread across the map
- Paths provide natural guidance without restricting movement
- Map extends beyond the viewport — camera follows the player smoothly
- Player spawns at a central starting position

### Camera

- Follows the player character smoothly (Phaser's `camera.startFollow` with lerp)
- Zoomed in enough that the character is prominent but you can see 3-4 nearby checkpoints
- World bounds set to the tilemap size

## Characters

### Visual Style

- Chunky, Overcooked-inspired pixel art: big heads, simple features, bold outlines
- 48-64px sprite size
- 4-directional walk animations (up, down, left, right — 3-4 frames each)
- Idle animation per direction

### Avatar Customization

Presented on a dedicated screen before entering the map. Two characters to customize (player + partner). Re-accessible from a settings button in WorldScene.

**Customization options:**
- Hair style — 4-5 options
- Hair color — 6-8 color swatches
- Skin tone — 5-6 options
- Outfit — 4-5 options (full outfits for simplicity)
- Accessories — optional (hat, glasses)

**Technical approach:**
- Layered sprite composition: body base + hair + outfit + accessory
- Each layer is a separate spritesheet
- Phaser composites them at runtime
- Selections saved to localStorage

### Movement

- Arrow keys or WASD for 4/8 directional movement
- Free movement (not grid-locked) for fluid feel
- Collision detection against tilemap collision layer
- Both avatar characters visible on the map

### Partner Character Behavior

- Partner follows the player with a rubber-band algorithm: stays idle until the player moves ~48px away, then walks toward the player's previous position
- Uses the same walk/idle animations as the player character (with their own avatar config)
- Does NOT collide with obstacles (simplified — follows freely to avoid pathfinding complexity)
- Does not interact with checkpoints independently — purely cosmetic companion

## Checkpoint Interactions

### Flow

1. Player walks into a checkpoint's trigger zone (Tiled object layer rectangle)
2. Floating prompt appears above the building: "Press E to enter"
3. Player presses E → memory card overlay opens (WorldScene stays visible underneath, dimmed)
4. Player reads the memory, then either closes (Escape/X button) or clicks "Play Mini-Game"
5. Mini-game scene launches. On completion, shows score/result with a "Back to Map" button
6. Player returns to WorldScene at the same position they entered

### Memory Card

Every checkpoint has one. It's a styled overlay/popup containing:
- A photo (pre-processed to 600x400px JPG, max 100KB per photo)
- The location name
- A personal message/memory
- Optional date
- "Play Mini-Game" button (if a mini-game is configured for this checkpoint)

### Photos

- All photos must be pre-processed before adding to the project: resized to **600x400px**, saved as **JPG at 80% quality**, max **100KB each**
- This ensures consistent display in the memory card and fast loading (6-12 photos = ~600KB-1.2MB total)
- Photos are placed in `src/assets/photos/` and referenced by filename in `checkpoints.json`

### Visited State

- When a player enters a checkpoint for the first time, its `id` is added to `visitedCheckpoints` in localStorage
- On the world map, visited checkpoints show a small **checkmark badge** on their building sprite
- A **progress counter** is displayed in the corner of WorldScene: "3/8 places visited"
- Visiting all checkpoints triggers a **congratulations overlay** with a special message

### Mini-Games

Each checkpoint can optionally have a mini-game. Mini-game types are reusable — different checkpoints can use the same type with different content.

**Type naming convention:** JSON `type` field uses lowercase (`quiz`, `catch`, `match`, `puzzle`, `cooking`). Scene class names use PascalCase with `Game` suffix (`QuizGame`, `CatchGame`, etc.).

| Type (JSON) | Scene Class | Mechanic | Example |
|-------------|-------------|----------|---------|
| `quiz` | QuizGame | Multiple-choice questions, 4 options each, score = correct answers out of total | Café: "How well do you know us?" |
| `catch` | CatchGame | Move basket left/right with arrow keys, catch falling items, miss 3 = game over, score = items caught | Park: catch falling petals |
| `match` | MatchGame | Grid of face-down cards, flip 2 at a time to find pairs, score = number of moves (lower is better) | Cinema: match movie quotes to films |
| `puzzle` | PuzzleGame | Photo split into 3x3 or 4x4 grid, drag pieces to correct positions, score = completion time in seconds | Home: reassemble a photo |
| `cooking` | CookingGame | Orders appear at the top showing 2-3 items. Click items from a shelf in the correct order to fill each order. Timer counts down. Score = orders completed | Restaurant: recreate your favourite orders |

**On completion:** Mini-game shows a results screen with the score and a "Back to Map" button. Score is saved to localStorage under `miniGameScores[checkpointId]`. No pass/fail — it's a personal game, every attempt is a win.

## Data Model

### checkpoints.json

```json
{
  "checkpoints": [
    {
      "id": "restaurant",
      "name": "Luigi's Pizza",
      "icon": "pizza",
      "memory": {
        "photo": "restaurant.jpg",
        "message": "Remember when we ordered the wrong pizza and loved it?",
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

Note: `position` is NOT in this file — positions come from the Tiled object layer. The `id` field must match the Tiled object's `name` property.

### localStorage Schema

```json
{
  "avatar1": { "hair": 2, "hairColor": "#8B4513", "skin": 3, "outfit": 1, "accessory": null },
  "avatar2": { "hair": 4, "hairColor": "#FFD700", "skin": 2, "outfit": 3, "accessory": "glasses" },
  "visitedCheckpoints": ["restaurant", "cafe"],
  "miniGameScores": { "restaurant": 5, "cafe": 3 }
}
```

## Asset Loading

### BootScene Loading Strategy

- Display a simple loading progress bar (Phaser's built-in loader progress events)
- Load assets in order of priority: tilemap + tilesets first, then sprites, then photos
- Photos are loaded as Phaser images — they're only displayed in the memory card overlay, not on the world map
- If a photo fails to load, display a placeholder gradient with the checkpoint icon instead
- Total estimated asset size: ~2-4MB (tileset ~200KB, sprites ~500KB, photos ~1MB, map JSON ~50KB)

## Project Structure

```
game-website/
├── index.html
├── vite.config.ts
├── package.json
├── tsconfig.json
├── src/
│   ├── main.ts                  — Phaser game config, entry point
│   ├── scenes/
│   │   ├── BootScene.ts         — asset preloading with progress bar
│   │   ├── MenuScene.ts         — title screen
│   │   ├── AvatarScene.ts       — character customizer
│   │   ├── WorldScene.ts        — main map, movement, camera
│   │   └── checkpoints/
│   │       ├── MemoryCard.ts    — shared photo+message overlay
│   │       ├── QuizGame.ts      — trivia mini-game
│   │       ├── CatchGame.ts     — falling items mini-game
│   │       ├── PuzzleGame.ts    — jigsaw mini-game
│   │       ├── MatchGame.ts     — card matching mini-game
│   │       └── CookingGame.ts   — order assembly mini-game
│   ├── data/
│   │   └── checkpoints.json     — checkpoint content definitions
│   ├── utils/
│   │   └── storage.ts           — localStorage wrapper
│   └── assets/
│       ├── sprites/             — character spritesheets (layered)
│       ├── tiles/               — tileset PNGs for Tiled
│       ├── maps/                — Tiled JSON map exports
│       ├── photos/              — pre-processed couple photos (600x400, JPG, <100KB)
│       └── audio/               — optional background music/SFX
├── public/
└── dist/                        — Vite build output → deploy to Render
```

## Deployment

- **Build:** `npm run build` (Vite produces static `dist/` folder)
- **Host:** Render static site — point at Git repo, build command `npm run build`, publish directory `dist/`
- **Cost:** Free tier (static site, no backend)
- **Custom domain:** Optional, configurable through Render

## Scope Boundaries

**In scope:**
- Explorable top-down map with character movement (desktop/keyboard only)
- 6-12 checkpoint locations with memory cards
- 5 mini-game types (quiz, catch, match, puzzle, cooking)
- Avatar customizer for 2 characters
- localStorage persistence
- Visited checkpoint tracking with visual feedback and completion reward
- Loading progress bar
- Static site deployment to Render

**Out of scope (v1):**
- Mobile / touch controls
- Multiplayer / real-time co-op
- User accounts / authentication
- Backend / database
- Sound design (can add later as enhancement)
- Map editor in-game (Tiled is the editor)
- Accessibility features beyond keyboard navigation
