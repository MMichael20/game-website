# Maui Expansion Design: Compound Preview, Driving, Road to Hana, Sun Beach

## Overview

Four features expanding the Maui experience:
1. Replace Airbnb gate with miniature compound preview on overworld
2. Free-roam driving scene with destination selection at intersections
3. Road to Hana driving segment with 3 scenic pullover stops
4. Sun Beach explorable area with turtles + Turtle Rescue minigame

## Architecture: Separate Scenes Per Destination

Each destination is its own scene following existing patterns:
- Walkable areas → OverworldScene subclass
- Driving/minigames → Phaser.Scene direct extension
- Scene transitions via fadeToScene (500ms camera fade)

## Complete Scene Graph

```
MauiOverworldScene
  → DrivingScene (hub)
    → AirplaneCutscene (airport exit)
    → HanaDrivingScene (linear drive)
      → HanaPulloverScene { stop: 'waterfall' }
      → HanaPulloverScene { stop: 'bamboo' }
      → HanaPulloverScene { stop: 'blacksand' }
      → DrivingScene (drive complete)
    → SunBeachScene (explorable beach)
      → TurtleRescueScene (minigame)
    → MauiOverworldScene (go back)
```

---

## Feature 1: Airbnb Compound Preview on Overworld

Replace `deco-compound-gate` at tile (36,4) with a 128x96px (4x3 tile) decoration texture showing bird's-eye miniature of compound: building silhouette (top), blue pool (right), jacuzzi (left), green tennis court (bottom), hedge border. Pure decoration swap.

**Modified files:**
- `src/game/rendering/AirbnbCompoundTextures.ts` — new `generateCompoundPreview()` function, 128x96 canvas
- `src/game/scenes/maui/mauiMap.ts` — swap decoration entry from compound-gate to compound-preview

**No logic changes.** Checkpoint at (37,5) unchanged.

---

## Feature 2: Driving Scene (Free-Roam Hub)

New `DrivingScene` extending Phaser.Scene (no tilemap). Road drawn with rectangles/sprites. Car auto-drives via tween from bottom-center to a 3-way fork at center.

At fork: **non-dismissable dialog** with choices:
- "Airport" → AirplaneCutscene { destination: 'home' }
- "Road to Hana" → HanaDrivingScene { resumeSegment: 0 }
- "Sun Beach" → SunBeachScene
- "Go Back" → MauiOverworldScene

Car idles at fork until player chooses. On choice, car tweens down chosen branch, fade to target.

**Entry point:** Repurpose `maui_taxi` checkpoint to route to DrivingScene instead of AirplaneCutscene.

**New files:**
- `src/game/scenes/maui/DrivingScene.ts`
- `src/game/rendering/DrivingTextures.ts` — road signs, player car (48x32), road scenery

**Modified files:**
- `src/game/scenes/maui/MauiOverworldScene.ts` — redirect taxi checkpoint
- `src/game/scenes/maui/mauiMap.ts` — update checkpoint prompt text to "Get in Car"
- `src/main.ts` — register DrivingScene
- `src/game/rendering/PixelArtGenerator.ts` — import/call DrivingTextures

**Road layout (800x600 canvas):**
- Road enters bottom-center
- Straight to y=300
- 3-way fork: left (Airport), center (Hana), right (Sun Beach)
- Signs at each branch

---

## Feature 3: Road to Hana

### HanaDrivingScene
Linear driving scene with scrolling road background. Car drives automatically. At 3 pullover points, prompt appears: "Pull Over" or "Keep Driving".

**Init data:** `{ resumeSegment: number, returnScene, returnX, returnY }`
- segment 0 → waterfall pullover
- segment 1 → bamboo forest pullover
- segment 2 → black sand beach pullover
- segment 3 → drive complete, return to DrivingScene

Scenery changes per segment (coastal cliffs → jungle → volcanic rock).

### HanaPulloverScene
Single OverworldScene subclass loading different layouts from `hanaPulloverLayouts.ts` based on `stop` parameter. Each ~20x15 tiles.

**Init data:** `{ stop: 'waterfall'|'bamboo'|'blacksand', resumeSegment: number, returnScene, returnX, returnY }`

Exit checkpoint → HanaDrivingScene { resumeSegment: currentSegment + 1 }

### Pullover Stop Layouts

**Waterfall (20x15):**
- Cliff wall (y=0-2) with waterfall texture at x=8-11
- ShallowWater pool (y=3-5, x=7-12)
- Grass with stone path from (10,14) to (10,5)
- NPC: hiker at (6,8)
- Exit: "Return to Car" at (10,14)

**Bamboo Forest (20x15):**
- Grass/DarkGrass terrain, dense bamboo decorations
- StonePath winding y=14 to y=2
- NPC: trail guide at (12,7)
- Exit: "Return to Car" at (10,14)

**Black Sand Beach (20x15):**
- BlackSand (y=0-7), ShallowWater (y=8-10), Ocean (y=11-14)
- Volcanic rock decorations
- NPC: geologist at (12,3)
- Exit: "Return to Car" at (10,0)

### New tile type
`BlackSand = 15` added to MauiTileType. Terrain spritesheet width: **480→512px** (16 frames).

**New files:**
- `src/game/scenes/maui/HanaDrivingScene.ts`
- `src/game/scenes/maui/HanaPulloverScene.ts`
- `src/game/scenes/maui/hanaPulloverLayouts.ts`
- `src/game/rendering/HanaTextures.ts` — waterfall (64x96), bamboo stalks, volcanic rocks, signs

**Modified files:**
- `src/game/scenes/maui/mauiMap.ts` — add BlackSand=15 to enum
- `src/game/rendering/MauiTextures.ts` — add frame 15 to spritesheet, update canvas width to 512
- `src/main.ts` — register HanaDrivingScene, HanaPulloverScene
- `src/game/rendering/PixelArtGenerator.ts` — import/call HanaTextures

---

## Feature 4: Sun Beach

### SunBeachScene
OverworldScene subclass, 30x20 tiles.

**Map layout:**
- y=0-1: Asphalt (road/parking, parked car at x=14-15)
- y=2-3: Grass with path to beach
- y=4-10: Sand (main beach, turtles on sand)
- y=11-14: ShallowWater (swimming turtles)
- y=15-19: Ocean (impassable)

**Turtles as NPCs:**
- 2 on sand: idle/walk behavior, `npc-turtle` texture, slow speed (~15)
- 2 in water: walk behavior, `npc-turtle-water` texture
- Interactable with dialog about turtles
- 1-2 human NPCs: nature guide, tourist

**Checkpoints:**
- `sunbeach_exit` at (15,0) — "Return to Car" → DrivingScene
- `sunbeach_turtle_game` at (5,5) — "Play Turtle Rescue?" → TurtleRescueScene

WaterEffectSystem for water tiles. Swimsuit swap at y≥4 (beach zone).

### TurtleRescueScene
Minigame following TennisScene pattern.

**Gameplay:** Top-down beach strip. Wave of 10 baby turtles spawn at top (sand), waddle toward bottom (ocean). Obstacles (crabs, seagulls, driftwood) appear in path. Player taps/clicks obstacles to clear them. Score = turtles that reach ocean. Game ends when all 10 turtles either arrive or get blocked. Difficulty increases with subsequent waves (more obstacles, faster spawns).

**End condition:** Fixed wave of 10 turtles. Shows score dialog, "Back to Beach" button → SunBeachScene.

**New files:**
- `src/game/scenes/maui/SunBeachScene.ts`
- `src/game/scenes/maui/sunBeachMap.ts`
- `src/game/scenes/minigames/TurtleRescueScene.ts`
- `src/game/rendering/SunBeachTextures.ts` — turtle sprites (32x32 land/water, 16x16 baby), crab, seagull, driftwood, beach grass, turtle nest, sign

**Modified files:**
- `src/main.ts` — register SunBeachScene, TurtleRescueScene
- `src/game/rendering/PixelArtGenerator.ts` — import/call SunBeachTextures

---

## File Summary

### New Files (10)
| File | Type |
|------|------|
| `src/game/scenes/maui/DrivingScene.ts` | Driving hub scene |
| `src/game/rendering/DrivingTextures.ts` | Driving textures |
| `src/game/scenes/maui/HanaDrivingScene.ts` | Hana driving scene |
| `src/game/scenes/maui/HanaPulloverScene.ts` | Hana pullover scene (OverworldScene) |
| `src/game/scenes/maui/hanaPulloverLayouts.ts` | Pullover stop map data |
| `src/game/rendering/HanaTextures.ts` | Hana textures |
| `src/game/scenes/maui/SunBeachScene.ts` | Sun Beach scene (OverworldScene) |
| `src/game/scenes/maui/sunBeachMap.ts` | Sun Beach map data |
| `src/game/scenes/minigames/TurtleRescueScene.ts` | Turtle Rescue minigame |
| `src/game/rendering/SunBeachTextures.ts` | Sun Beach/turtle textures |

### Modified Files (6)
| File | Changes |
|------|---------|
| `src/game/rendering/AirbnbCompoundTextures.ts` | Replace gate with compound preview texture |
| `src/game/scenes/maui/mauiMap.ts` | Swap decoration, add BlackSand=15, update prompt |
| `src/game/scenes/maui/MauiOverworldScene.ts` | Redirect taxi→DrivingScene |
| `src/game/rendering/MauiTextures.ts` | Add BlackSand frame, spritesheet 480→512px |
| `src/game/rendering/PixelArtGenerator.ts` | Import/call 3 new texture generators |
| `src/main.ts` | Register 5 new scenes |
