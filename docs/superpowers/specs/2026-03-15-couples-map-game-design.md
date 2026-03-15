# Couple's Map Game — Design Spec

## Overview

A browser-based 2D top-down RPG-style game where the player controls customizable avatar characters exploring a green, grassy world map. Checkpoints on the map represent real places meaningful to the couple (favourite restaurant, café, cinema, park, etc.). Each checkpoint offers a memory card (photo + personal message) and an optional mini-game tied to the location.

The game blends personal/sentimental value with legitimate gameplay — it should feel like a real game, not just a slideshow.

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

- **BootScene** — preload all assets (sprites, tilemaps, photos, audio)
- **MenuScene** — title screen with "Start" and "Continue" options
- **AvatarScene** — character customizer for both avatars
- **WorldScene** — main game: tilemap rendering, character movement, camera, checkpoint detection
- **Checkpoint scenes** — each mini-game type is its own scene (QuizGame, CatchGame, PuzzleGame, MatchGame)
- **MemoryCard** — shared overlay/popup used by all checkpoints (photo + message + "Play Mini-Game" button)

## Game World & Map

### Tilemap Structure

Designed in Tiled, exported as JSON, loaded natively by Phaser:

| Layer | Purpose |
|-------|---------|
| Ground | Grass tiles, dirt path tiles |
| Decoration | Trees, bushes, flowers, rocks |
| Buildings | Checkpoint buildings/landmarks |
| Collision | Invisible layer — blocks player from walking through obstacles |
| Checkpoints | Object layer — trigger zones around each building |

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

Presented on a dedicated screen before entering the map. Two characters to customize (player + partner).

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
- Smooth tile-based or free movement (free movement preferred for fluid feel)
- Collision detection against tilemap collision layer
- Both avatar characters visible on the map — partner follows the player character

## Checkpoint Interactions

### Flow

1. Player walks near a checkpoint building
2. Prompt appears: "Press E to enter" (or tap on mobile)
3. Memory card overlay opens
4. Player reads the memory, then optionally starts the mini-game
5. After closing/completing, player returns to the world map

### Memory Card

Every checkpoint has one. It's a styled overlay/popup containing:
- A photo (actual photo from the couple's life)
- The location name
- A personal message/memory
- Optional date
- "Play Mini-Game" button (if a mini-game is configured for this checkpoint)

### Mini-Games

Each checkpoint can optionally have a mini-game. Mini-game types are reusable — different checkpoints can use the same type with different content.

| Type | Description | Example Use |
|------|-------------|-------------|
| QuizGame | Multiple-choice trivia questions | Café: "How well do you know us?" |
| CatchGame | Move left/right to catch falling items | Park: catch falling petals in a basket |
| MatchGame | Match pairs of cards/items | Cinema: match movie quotes to films |
| PuzzleGame | Jigsaw puzzle from a photo | Home: reassemble a photo of you two |
| CookingGame | Timed order assembly | Restaurant: recreate your favourite order |

Mini-games are configured per checkpoint in `checkpoints.json` — specify the type and the content (questions, items, photo, etc.).

## Data Model

### checkpoints.json

```json
{
  "checkpoints": [
    {
      "id": "restaurant",
      "name": "Luigi's Pizza",
      "icon": "🍕",
      "position": { "x": 320, "y": 480 },
      "memory": {
        "photo": "photos/restaurant.jpg",
        "message": "Remember when we ordered the wrong pizza and loved it?",
        "date": "March 2024"
      },
      "miniGame": {
        "type": "cooking",
        "config": {
          "items": ["pizza", "pasta", "tiramisu"],
          "timeLimit": 30
        }
      }
    }
  ]
}
```

### localStorage Schema

```json
{
  "avatar1": { "hair": 2, "hairColor": "#8B4513", "skin": 3, "outfit": 1, "accessory": null },
  "avatar2": { "hair": 4, "hairColor": "#FFD700", "skin": 2, "outfit": 3, "accessory": "glasses" },
  "visitedCheckpoints": ["restaurant", "cafe"],
  "miniGameScores": { "restaurant": 850, "cafe": 3 }
}
```

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
│   │   ├── BootScene.ts         — asset preloading
│   │   ├── MenuScene.ts         — title screen
│   │   ├── AvatarScene.ts       — character customizer
│   │   ├── WorldScene.ts        — main map, movement, camera
│   │   └── checkpoints/
│   │       ├── MemoryCard.ts    — shared photo+message popup
│   │       ├── QuizGame.ts      — trivia mini-game
│   │       ├── CatchGame.ts     — falling items mini-game
│   │       ├── PuzzleGame.ts    — jigsaw mini-game
│   │       ├── MatchGame.ts     — matching mini-game
│   │       └── CookingGame.ts   — timed assembly mini-game
│   ├── data/
│   │   └── checkpoints.json     — checkpoint definitions
│   ├── utils/
│   │   └── storage.ts           — localStorage wrapper
│   └── assets/
│       ├── sprites/             — character spritesheets (layered)
│       ├── tiles/               — tileset PNGs for Tiled
│       ├── maps/                — Tiled JSON map exports
│       ├── photos/              — actual couple photos
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
- Explorable top-down map with character movement
- 6-12 checkpoint locations with memory cards
- 5 mini-game types (quiz, catch, match, puzzle, cooking)
- Avatar customizer for 2 characters
- localStorage persistence
- Static site deployment to Render

**Out of scope:**
- Multiplayer / real-time co-op
- User accounts / authentication
- Backend / database
- Mobile app (browser-only, though should be responsive)
- Sound design (can add later as enhancement)
- Map editor in-game (Tiled is the editor)
