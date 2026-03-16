# Multi-Map Interior System — Design Document

## Goal
Add explorable interior maps to the game. Walk up to a building on the overworld, press E, and a full tile-based interior loads. First implementation: Michael's House (30x24 tiles, 5 rooms).

Characters: Hadar and Michael.

## Approach: One Scene Per Building, Rooms as Zones

Each building = one Phaser scene with a single contiguous tile grid. Rooms are spatial zones separated by wall tiles. Doorways are 2-tile walkable gaps. No scene transitions between rooms — the player just walks through.

**Why this approach:**
- Mirrors the overworld pattern (one grid, named zones, checkpoint areas)
- Zero scene transitions for room-to-room movement
- Partner follow logic works unchanged
- Camera follow works unchanged
- One scene per building, not per room — scales to many buildings without explosion

## Architecture

```
WorldScene (overworld)
    │
    ├── Player enters house checkpoint zone, presses E
    ├── Save overworld position
    ├── Camera fade out
    │
    ▼
MichaelsHouseScene extends InteriorScene
    - 30x24 tile contiguous grid
    - 5 rooms separated by wall tiles
    - Doorways = 2-tile walkable gaps
    - Exit zone at front door → fade out → return to WorldScene
```

## New Files

### `src/game/scenes/InteriorScene.ts`
Base class for all interior scenes. Handles:
- Grid creation from layout data
- Player + Partner spawning at entrance
- Walkability grid (injected into Player)
- Exit zone detection → return to overworld
- Camera setup (zoom 2.5x, bounds, follow)
- Fade in/out transitions
- Shutdown/cleanup

### `src/game/scenes/MichaelsHouseScene.ts`
Thin wrapper extending InteriorScene. Just provides layout data.

### `src/game/data/interiorLayouts.ts`
Data definitions for interior maps. Contains:
- `InteriorLayout` interface (walls, floors, decorations, entrance, exit)
- `buildWallGrid()` helper (computes wall grid from room rectangles + doorways)
- `MICHAELS_HOUSE_LAYOUT` constant

## Modified Files

### `src/game/entities/Player.ts`
**Critical change:** Inject walkability function instead of importing hardcoded overworld grid.
```ts
type WalkCheck = (tileX: number, tileY: number) => boolean;
// Player constructor accepts walkCheck parameter
```

### `src/game/data/mapLayout.ts`
- Add Michael's House building decoration (3x3 footprint)
- Add house checkpoint zone (type: 'interior')
- Add impassable tiles for house footprint

### `src/game/scenes/WorldScene.ts`
- Handle 'interior' checkpoint type → scene.start(interiorSceneKey, { returnX, returnY })
- Handle returnFromInterior in init() to restore player position
- Pass overworld isWalkable to Player

### `src/main.ts`
Register MichaelsHouseScene in scene array.

### `src/game/rendering/PixelArtGenerator.ts`
Add interior texture generation:
- Floor tiles: wood, carpet, tile_floor
- Interior wall tiles
- Door frame tiles
- Furniture: bed, couch, table, stove, sink, toilet, desk, bookshelf

### `src/utils/constants.ts`
Add interior constants (zoom level, tile types).

## Michael's House Layout (30x24 tiles)

```
+----------+----------+--------+
|          |          |        |
| Living   | Kitchen  | Bath-  |
| Room     |          | room   |
| (10x10)  | (10x10) | (8x10) |
|          |          |        |
+----  ----+----  ----+--  ----+
|                     |        |
|    Bedroom          |Michael |
|    (20x12)          |'s Room |
|                     |(8x12)  |
+----------     ------+--  ----+
           [EXIT]
```

**Room floor types:**
- Living Room: carpet (dusty blue)
- Kitchen: tile_floor (checkerboard)
- Bathroom: tile_floor (white/gray)
- Bedroom: carpet (warm beige)
- Michael's Room: wood

**Furniture per room:**
- Living Room: couch (2x1), bookshelf, table
- Kitchen: stove, sink, table
- Bathroom: toilet, sink
- Bedroom: bed (2x2), bookshelf
- Michael's Room: desk, bed (1x2), bookshelf

## Scene Lifecycle

### Entering the house
1. Player walks into house checkpoint zone on overworld
2. Press E → WorldScene saves overworld position
3. Camera fades out (300ms black)
4. `scene.start('MichaelsHouseScene', { returnX, returnY })`
5. Interior creates grid, renders tiles, spawns player+partner at entrance
6. Camera fades in

### Moving between rooms
- Player walks toward doorway (2-tile gap in wall)
- Walkable — player walks through, camera follows
- No transition, no event

### Exiting the house
1. Player walks into exit zone (front door area)
2. Press E or automatic → camera fades out
3. `scene.start('WorldScene', { returnFromInterior: true, returnX, returnY })`
4. WorldScene spawns player at saved overworld position
5. Camera fades in

## Camera in Interiors
- Zoom: 2.5x (tighter than overworld to frame one room at a time)
- Bounds: interior pixel dimensions (30*32 x 24*32 = 960x768)
- Follow: same smooth lerp as overworld

## Save System
- v1: No interior persistence. Player always restarts on overworld.
- Overworld position saved before entering (existing pattern).
- Interior save fields deferred until needed.

## Known Limitations (v1)
- Partner may clip through walls in tight corridors (cosmetic)
- No NPCs in interiors
- No mini-game triggers in rooms (zones ready for future use)
- No mid-interior save/reload
- Movement logic duplicated between WorldScene and InteriorScene
