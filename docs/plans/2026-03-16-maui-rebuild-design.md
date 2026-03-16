# Maui Map Rebuild — Design Document

## Overview

Rebuild the Maui overworld map based on the user's actual vacation experience. Layout flows right-to-left: Airbnb area (parking, jacuzzi, tennis court) → Hotel (center-right, enterable interior) → Road with cars → Indian restaurant → Beach.

## Map Layout (45x30 tiles)

```
          x=0       x=10      x=20       x=30       x=40  x=44
     +----------+----------+----------+----------+----------+
y=0  |          |          |          | GRASS    | PARKING  |
     |  GRASS   |  GRASS   |  GRASS   |          | LOT     |
y=3  |          |          |          | JACUZZI  | (Airbnb) |
     |          |          |          | NPC      |          |
y=5  |          |          | HOTEL    |          | TENNIS   |
     |          |          | BUILDING | GRASS    | COURT    |
y=8  |          |          | (8x5)   |          |          |
     |          |          |          |          |          |
y=10 |  SIDEWALK|  SIDEWALK|  SIDEWALK|  SIDEWALK|  SIDEWALK|
y=11 |===ROAD===|===ROAD===|===ROAD===|===ROAD===|===ROAD===|
y=13 |===ROAD===|===ROAD===|===ROAD===|===ROAD===|===ROAD===|
y=14 |  SAND    |  SAND    | SAND     |  SAND    | SAND     |
     |          | RESTAU-  |          |          |          |
y=16 |          | RANT NPC |          |          |          |
     |          | (5x3)    |          |          |          |
y=18 |  SAND    |  SAND    | SAND     | SAND     | SANDSTONE|
y=20 | SHALLOW  | SHALLOW  | SAND     | SANDSTONE| SANDSTONE|
y=23 | SHALLOW  | SHALLOW  | SHALLOW  | SHALLOW  | SAND     |
y=25 |  OCEAN   | OCEAN    | OCEAN    | SHALLOW  | SANDSTONE|
y=29 |  OCEAN   | OCEAN    | OCEAN    | OCEAN    | OCEAN    |
     +----------+----------+----------+----------+----------+
```

## New Tile Types

Add to MauiTileType enum:

| ID | Name | Visual | Walkable |
|----|------|--------|----------|
| 6 | Road | Dark gray asphalt with yellow center dashes | Yes |
| 7 | ParkingLot | Lighter gray with white parking line dashes | Yes |
| 8 | Sidewalk | Light stone/concrete | Yes |

Terrain spritesheet expands from 192x32 (6 tiles) to 288x32 (9 tiles).

## Buildings

```typescript
MAUI_BUILDINGS = [
  { name: 'maui-hotel',      tileX: 22, tileY: 4, tileW: 8, tileH: 5 },
  { name: 'maui-restaurant', tileX: 10, tileY: 15, tileW: 5, tileH: 3 },
];
```

No Airbnb building — it's an open-air compound (parking lot tiles, decorations). No airport building.

## Decorations

```typescript
MAUI_DECORATIONS = [
  // Airbnb area
  { type: 'maui-jacuzzi',     tileX: 34, tileY: 3 },   // 2x2
  { type: 'maui-tenniscourt', tileX: 38, tileY: 6 },   // 4x4
  { type: 'maui-parkedcar',   tileX: 36, tileY: 1 },
  { type: 'maui-parkedcar',   tileX: 39, tileY: 1 },
  { type: 'palm-tree',        tileX: 33, tileY: 1 },
  { type: 'palm-tree',        tileX: 33, tileY: 7 },

  // Hotel area
  { type: 'palm-tree',        tileX: 20, tileY: 5 },
  { type: 'palm-tree',        tileX: 31, tileY: 5 },

  // Road — static parked cars
  { type: 'maui-parkedcar',   tileX: 5,  tileY: 10 },
  { type: 'maui-parkedcar',   tileX: 15, tileY: 10 },
  { type: 'maui-parkedcar',   tileX: 35, tileY: 10 },

  // Beach
  { type: 'palm-tree',        tileX: 2,  tileY: 15 },
  { type: 'palm-tree',        tileX: 8,  tileY: 14 },
  { type: 'beach-umbrella',   tileX: 4,  tileY: 17 },
  { type: 'beach-towel',      tileX: 6,  tileY: 18 },
  { type: 'surfboard',        tileX: 10, tileY: 17 },

  // Restaurant area
  { type: 'palm-tree',        tileX: 8,  tileY: 16 },
  { type: 'palm-tree',        tileX: 16, tileY: 16 },
];
```

## NPCs

### Overworld NPCs

```typescript
MAUI_NPCS = [
  // Restaurant owner — standing in front of restaurant
  {
    id: 'restaurant-owner', tileX: 12, tileY: 14, behavior: 'idle',
    texture: 'npc-maui-restaurant', interactable: true, onInteract: 'dialog',
    interactionData: { lines: ['Welcome! Best curry on the island.', 'We have been here for 20 years. Aloha!'] },
    facingDirection: 'down',
  },

  // Hotel greeter — on sidewalk in front of hotel
  {
    id: 'hotel-greeter', tileX: 25, tileY: 10, behavior: 'idle',
    texture: 'npc-maui-greeter', interactable: true, onInteract: 'dialog',
    interactionData: { lines: ['Welcome to the hotel!', 'Head inside to rest up.'] },
    facingDirection: 'down',
  },

  // Jacuzzi NPC — next to jacuzzi, triggers relaxation dialogue
  {
    id: 'jacuzzi-npc', tileX: 34, tileY: 5, behavior: 'idle',
    texture: 'npc-maui-tourist', interactable: true, onInteract: 'dialog',
    interactionData: { lines: ['This jacuzzi is amazing!', 'So relaxing after a day at the beach...', 'Ahhh...'] },
    facingDirection: 'up',
  },

  // Airbnb neighbor
  {
    id: 'airbnb-neighbor', tileX: 37, tileY: 5, behavior: 'idle',
    texture: 'npc-maui-tourist', interactable: true, onInteract: 'dialog',
    interactionData: { lines: ['Hey neighbor! This Airbnb is great, right?', 'Have you tried the tennis court?'] },
    facingDirection: 'left',
  },

  // Beach surfer
  {
    id: 'beach-surfer', tileX: 7, tileY: 17, behavior: 'idle',
    texture: 'npc-surfer', interactable: true, onInteract: 'dialog',
    interactionData: { lines: ["Surf's up, brah!", 'Maui has the best breaks in all of Hawaii.'] },
    facingDirection: 'down',
  },

  // Ambient walking NPCs (non-interactable)
  { id: 'maui-walker-1', tileX: 16, tileY: 5, behavior: 'walk', texture: 'npc-maui-local',
    walkPath: [{ x: 12, y: 5 }, { x: 20, y: 5 }] },
  { id: 'beachgoer-1', tileX: 3, tileY: 17, behavior: 'sit', texture: 'npc-traveler' },
  { id: 'beachgoer-2', tileX: 14, tileY: 18, behavior: 'sit', texture: 'npc-traveler-2' },
];
```

### Hotel Interior NPC (in MauiHotelScene)

```typescript
// Front desk NPC — triggers fly-home cutscene
{
  id: 'hotel-frontdesk', tileX: 7, tileY: 6, behavior: 'idle',
  texture: 'npc-maui-frontdesk', interactable: true,
  onInteract: 'cutscene-trigger',
  interactionData: {
    lines: ['Ready to check out?', "We'll arrange your flight home. Mahalo!"],
    sceneKey: 'AirplaneCutscene',
    sceneData: { destination: 'home' },
  },
  facingDirection: 'left',
}
```

## Driving Cars (NOT NPCs)

Driving cars are **NOT** NPCs — they are simple tweened Phaser sprites managed directly in MauiOverworldScene. This avoids polluting the NPCDef type and NPCSystem with a fundamentally different movement model.

```typescript
// In MauiOverworldScene.onCreateExtras():
private drivingCars: Phaser.GameObjects.Sprite[] = [];

// Create 3 car sprites at road rows, tween them across:
// - car_red:   y=12, drives east (left to right)
// - car_blue:  y=11, drives west (right to left)
// - car_white: y=13, drives east
// Each car: linear tween from x=-48 to x=(45*32+48), duration ~8-12s, repeat: -1
// Stagger start positions for variety
```

Cars are depth -3 (below NPCs, above decorations). They are visual-only, non-collidable. Road tiles are walkable — cars pass through the player.

## Checkpoint Zones

All coordinates in **world pixels** (using tileToWorld conversion):

```typescript
MAUI_CHECKPOINT_ZONES = [
  // Hotel entrance
  {
    id: 'maui_hotel',
    centerX: 26 * 32 + 16,   // tile 26 center
    centerY: 9 * 32 + 16,    // tile 9 center (just above sidewalk)
    radius: 48,               // 1.5 tiles
    promptText: 'Tap to enter Hotel',
  },

  // Tennis court mini-game
  {
    id: 'maui_tennis',
    centerX: 40 * 32 + 16,
    centerY: 8 * 32 + 16,
    radius: 64,               // 2 tiles
    promptText: 'Tap to play Tennis',
  },
];
```

Note: Jacuzzi interaction is handled by the `jacuzzi-npc` NPC (dwell trigger), NOT a checkpoint zone. This is simpler and follows existing patterns.

## Hotel Interior (MauiHotelScene)

New scene extending InteriorScene. 10x8 tile room.

```
x=0  x=1  x=2  x=3  x=4  x=5  x=6  x=7  x=8  x=9
[WALL][WALL][WALL][WALL][WALL][WALL][WALL][WALL][WALL][WALL]  y=0
[WALL][kitc][kitc][sink][ .. ][ .. ][ .. ][ .. ][bath][WALL]  y=1  kitchen left, bathroom right
[WALL][frdg][ .. ][ .. ][ .. ][ .. ][ .. ][ .. ][toil][WALL]  y=2
[WALL][ .. ][ .. ][ .. ][ .. ][ .. ][ .. ][ .. ][ .. ][WALL]  y=3
[WALL][ .. ][ .. ][ TV ][ .. ][ .. ][ .. ][ .. ][ .. ][WALL]  y=4  TV on left-center
[WALL][ .. ][ .. ][ .. ][ .. ][BED ][BED ][ .. ][ .. ][WALL]  y=5  bed faces TV
[WALL][ .. ][ .. ][ .. ][ .. ][BED ][BED ][ .. ][desk][WALL]  y=6  front desk NPC at desk
[WALL][WALL][WALL][WALL][EXIT][EXIT][WALL][WALL][WALL][WALL]  y=7  exit at bottom center
```

### Layout Definition

```typescript
MAUI_HOTEL_LAYOUT: InteriorLayout = {
  id: 'maui-hotel',
  widthInTiles: 10,
  heightInTiles: 8,
  wallGrid: /* 10x8, perimeter is walls */,
  floors: [
    { floorType: 'wood', tileX: 1, tileY: 1, width: 8, height: 6 },
  ],
  decorations: [
    { type: 'kitchen-counter', tileX: 1, tileY: 1 },
    { type: 'kitchen-counter', tileX: 2, tileY: 1 },
    { type: 'sink',            tileX: 3, tileY: 1 },
    { type: 'fridge',          tileX: 1, tileY: 2 },
    { type: 'bathroom-wall',   tileX: 8, tileY: 1 },
    { type: 'toilet',          tileX: 8, tileY: 2 },
    { type: 'tv',              tileX: 3, tileY: 4 },
    { type: 'bed',             tileX: 5, tileY: 5 },  // 2x2
    { type: 'desk',            tileX: 8, tileY: 6 },
  ],
  entrance: { tileX: 4, tileY: 6 },
  exit: { tileX: 4, tileY: 7, width: 2, height: 1, promptText: 'Tap to go out' },
};
```

### MauiHotelScene class

- Extends InteriorScene
- Has its own NPCSystem with the front desk NPC
- Wires `onDwellTrigger` for the front desk cutscene-trigger
- **Overrides `exitToOverworld()`** to return to `'MauiOverworldScene'` instead of `'WorldScene'`

## Tennis Mini-Game (TennisScene)

**Style: Rally Counter (Timing-based)**

Side-view tennis rally. Player on left, NPC opponent on right. Ball arcs toward player — tap/click when ball is in the "sweet spot" zone to return it. Each return increases rally count and ball speed.

- **Scoring:** Rally count = score. Miss = game over.
- **Scene:** `TennisScene` (follows CatchScene/MatchScene pattern)
- **Registration:** Must be added to Phaser game config scene list
- **Return:** Back to MauiOverworldScene after game ends
- **Textures:** Court background, ball, net, racket — all procedurally generated

## Spawn Point

Player arrives via AirplaneCutscene → spawns at **x=38, y=2** (Airbnb parking lot, in tile coords converted to pixels for spawnX/spawnY). This is the "taxi drops you at your rental" moment.

## Travel Flow

1. **Arrival:** AirplaneCutscene → MauiOverworldScene (spawn at Airbnb)
2. **Departure:** Enter hotel → talk to front desk NPC → AirplaneCutscene (destination: home) → WorldScene

## MauiOverworldScene.onEnterCheckpoint()

```typescript
onEnterCheckpoint(zone: CheckpointZone): void {
  const pos = this.player.getPosition();
  if (zone.id === 'maui_hotel') {
    this.fadeToScene('MauiHotelScene', { returnX: pos.x, returnY: pos.y });
  } else if (zone.id === 'maui_tennis') {
    this.scene.start('TennisScene', { returnScene: 'MauiOverworldScene' });
  }
}
```

## New Textures Required

### Terrain (add to existing spritesheet)
- Road tile (32x32): dark gray, yellow dashed center line
- ParkingLot tile (32x32): lighter gray, white dashed lines
- Sidewalk tile (32x32): light concrete, subtle cracks

### Buildings
- `building-maui-hotel` (256x160): multi-story beige building, windows, "HOTEL" text, entrance door
- `building-maui-restaurant` (160x96): terracotta/warm building, "RESTAURANT" sign

### Decorations
- `deco-maui-jacuzzi` (64x64): blue circular tub, wooden rim, bubbles
- `deco-maui-tenniscourt` (128x128): green surface, white boundary lines, center net
- `deco-maui-parkedcar` (32x32): top-down car shape

### NPCs (48x48)
- `npc-maui-restaurant`: dark-haired person with apron
- `npc-maui-greeter`: person in aloha shirt
- `npc-maui-tourist`: casual vacation outfit
- `npc-maui-frontdesk`: hotel uniform

### Cars (driving sprites, 48x32)
- `car-red`, `car-blue`, `car-white`: side-view car sprites

### Tennis mini-game
- `tennis-court-bg`: court background
- `tennis-ball`: yellow circle
- `tennis-net`: vertical net

## File Changes Summary

| File | Action | Scope |
|------|--------|-------|
| `src/game/scenes/maui/mauiMap.ts` | Full rewrite | New 45x30 grid, buildings, decorations, NPCs, checkpoints |
| `src/game/scenes/maui/MauiOverworldScene.ts` | Modify | Add driving cars, onEnterCheckpoint handler |
| `src/game/rendering/MauiTextures.ts` | Major modify | New terrain tiles, building textures, decoration textures, NPC textures, car textures |
| `src/game/scenes/maui/MauiHotelScene.ts` | New file | Interior scene for hotel room |
| `src/game/scenes/maui/maui-hotel-layout.ts` | New file | Hotel interior layout definition |
| `src/game/scenes/minigames/TennisScene.ts` | New file | Tennis mini-game |
| `src/game/rendering/TennisTextures.ts` | New file | Tennis mini-game procedural textures |
| `src/game/scenes/BootScene.ts` | Modify | Register TennisScene and MauiHotelScene |
| No changes to NPCSystem, NPC entity, or NPCDef type | — | Cars are standalone sprites |
