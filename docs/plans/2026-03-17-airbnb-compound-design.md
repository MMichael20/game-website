# Airbnb Compound Scene — Design Document

## Overview

Replace the small jacuzzi corner in the Maui overworld with a full Airbnb compound as a **separate OverworldScene** entered via checkpoint zone. The compound includes a tennis court, jacuzzi, pool, Airbnb building backdrop, gardens, and parking area.

## Map Layout — 40 wide x 32 tall

```
     0         10        20        30        39
 0 - [====== HEDGE BORDER (non-walkable) ==========]
 1 - [  GARDEN/PALMS  | AIRBNB BLDG (14,1)-(25,8) | GARDEN  ]
 2 - [  palm   palm   |  (non-walkable backdrop)   | palm    ]
 3 - [  lounge chairs |                            | flowers ]
 4 - [  grass         |                            | grass   ]
 5 - [  grass         |                            | grass   ]
 6 - [  grass         |       DOOR AREA            | grass   ]
 7 - [  grass         |                            | grass   ]
 8 - [  grass         |                            | grass   ]
 9 - [===stone path from door leading south=====================]
10 - [  JACUZZI AREA  |  stone path  | POOL AREA              ]
11 - [  (3,10)-(9,16) |  (18-21)     | (24,12)-(31,18)        ]
12 - [  stone border  |  stone path  |  stone deck border     ]
13 - [  +---------+   |  stone path  |  +---------------+     ]
14 - [  | hot tub |   |  stone path  |  | ShallowWater  |     ]
15 - [  | (water) |   |  stone path  |  |    POOL 6x6   |     ]
16 - [  +---------+   |  stone path  |  |               |     ]
17 - [  lounge chairs |  stone path  |  +---------------+     ]
18 - [  grass/garden  |  stone path  |  pool deck + chairs    ]
19 - [                |  stone path  |                         ]
20 - [                |  stone path  |                         ]
21 - [=== stone path continues ================================]
22 - [  TENNIS COURT  |  stone path  |  GARDEN/LOUNGE         ]
23 - [  (2,23)-(17,28)|  (18-21)     |  palm trees, seating   ]
24 - [  green surface |  stone path  |  patio tables           ]
25 - [  (non-walkable)|  stone path  |  tiki torches           ]
26 - [                |  stone path  |  flowers                ]
27 - [                |  stone path  |  grass                  ]
28 - [                |  stone path  |  grass                  ]
29 - [  benches       |  stone path  |  grass                  ]
30 - [=== PARKING (Asphalt) ===================================]
31 - [ car car  | ENTRANCE/EXIT (18-21,31) |  car car          ]
```

## Tile Types

Extend existing `MauiTileType` enum with new values (shared `maui-terrain` spritesheet):

| Type | Index | Visual | Walkable |
|------|-------|--------|----------|
| Grass | 5 (existing) | Green ground | Yes |
| ShallowWater | 3 (existing) | Blue water (pool + jacuzzi) | Yes (slow) |
| Sand | 0 (existing) | Accent patches | Yes |
| **StonePath** | 9 (new) | Light gray cobblestone | Yes |
| **WoodDeck** | 10 (new) | Brown horizontal planks | Yes |
| **TennisCourt** | 11 (new) | Green flat + white lines | **No** |
| **Asphalt** | 12 (new) | Dark gray parking | Yes |
| **HedgeWall** | 13 (new) | Dense green hedge | **No** |
| **PoolEdge** | 14 (new) | Blue-tinted stone border | Yes |

## Water Effects — WaterEffectSystem extraction

**Critical prerequisite.** Water effects (swimsuit swap, speed reduction, wave overlay, bubble particles) currently live as private methods in `MauiOverworldScene`. Must extract into a reusable class before this scene can function.

### New file: `src/game/systems/WaterEffectSystem.ts`

```
class WaterEffectSystem {
  constructor(scene, options: {
    getTileType: (tileX, tileY) => number;
    waterTileValue: number;      // e.g. MauiTileType.ShallowWater
    wadingSpeed: number;         // 0.8
    swimmingSpeed?: number;      // 0.55 (optional, for deep water)
    deepWaterCheck?: (tileY: number) => boolean;  // optional
  })

  update(delta, playerSprite, partnerSprite): void  // call from scene.update()
  createEffects(): void                              // call from scene.create()
  shutdown(): void                                   // call from scene shutdown
}
```

- `MauiOverworldScene` refactored to use `WaterEffectSystem` (behavior unchanged)
- `AirbnbCompoundScene` instantiates `WaterEffectSystem` with compound-specific tile lookup
- Pool and jacuzzi both use `ShallowWater` tile type — 0.8x speed, swimsuit swap, wave overlay, bubbles

## NPCs (4)

| ID | Tile | Facing | Behavior | Dialog |
|----|------|--------|----------|--------|
| `airbnb-host` | (19,9) | down | `idle` | "Welcome to Maui Breeze! Make yourself at home." / "The pool's great this time of year." / "Don't forget to try the hot tub!" |
| `pool-attendant` | (32,14) | left | `idle` | "The pool is perfect for a dive!" / "Careful on the deck, it's slippery!" |
| `tennis-player-npc` | (9,22) | down | `idle` | "Wanna hit some balls? Step onto the court!" |
| `jacuzzi-relaxer` | (5,12) | down | `sit` | "Ahhhh... the warm jets massage your tired muscles." / "So relaxing..." / "You feel completely refreshed." |

The jacuzzi interaction is handled by the `jacuzzi-relaxer` NPC dwell trigger — when the player walks near (into the jacuzzi water area), the NPC dialog auto-fires after ~1 second. No custom checkpoint needed.

## Checkpoint Zones (3)

| ID | Center Tile | Radius | Prompt | Action |
|----|------------|--------|--------|--------|
| `exit-to-maui` | (19, 31) | 48px | "Leave compound" | `fadeToScene('MauiOverworldScene', { returnX, returnY })` back to Maui entrance |
| `tennis-court` | (9, 22) | 64px | "Play Tennis?" | `scene.start('TennisScene', { returnScene: 'AirbnbCompoundScene', returnX: 9*32+16, returnY: 22*32+16 })` |
| `pool-dive` | (27, 13) | 48px | "Dive in!" | Placeholder dialog: "The diving board bounces invitingly... (Coming soon!)" |

**Note:** Pool-dive is a checkpoint (not NPC) because it will become a minigame scene transition later. Keeps the pattern consistent for future implementation.

## Maui-Side Entry Checkpoint

In `mauiMap.ts`, add new checkpoint zone:

| ID | Position | Radius | Prompt |
|----|----------|--------|--------|
| `maui_airbnb` | tile (37, 5) | 48px | "Enter Airbnb compound" |

In `MauiOverworldScene.onEnterCheckpoint()`, add case:
```
'maui_airbnb' → fadeToScene('AirbnbCompoundScene', { returnX: pos.x, returnY: pos.y })
```

Replace the old jacuzzi decoration and jacuzzi-npc at (34,3)-(34,5) with a gate/archway decoration and path leading to the checkpoint. Remove the tennis checkpoint from Maui (tennis moves into compound).

## Decorations (New Textures)

| Texture Key | Size | Positions | Notes |
|-------------|------|-----------|-------|
| `airbnb-building` | 384x256 (12x8 tiles) | (14,1) | Two-story tropical. Cream walls, terracotta roof, balcony, windows, door. NOT enterable (MauiHotelScene is the interior). |
| `deco-lounge-chair` | 32x32 | (3,3), (5,3), (7,17), (9,17), (26,19), (28,19) | Reclined pool chair, side view |
| `deco-patio-table` | 64x64 | (30,24), (34,26) | Round table + 2 chairs + umbrella |
| `deco-tiki-torch` | 32x64 | (27,25), (36,22) | Bamboo pole with flame |
| `deco-flower-bed` | 64x32 | (30,3), (34,5), (36,27) | Tropical flowers |
| `deco-tennis-bench` | 64x32 | (3,29), (10,29) | Wooden bench |
| `deco-diving-board` | 32x64 | (24,15) | Board extending over pool edge |
| `deco-compound-sign` | 32x32 | (19,9) | "Maui Breeze Airbnb" |
| `deco-compound-gate` | 64x64 | On Maui map at (36,4) | Gate/archway for Maui-side entry visual |

Reuse existing: `deco-maui-palm-tree`, `deco-maui-parked-car` from MauiTextures.

## Scene Flow

```
MauiOverworldScene
  │ checkpoint 'maui_airbnb' at (37,5)
  ▼
AirbnbCompoundScene — spawns at (19, 30) parking
  ├─→ TennisScene (checkpoint) → returns to compound (9,22)
  ├─→ Pool dive placeholder (checkpoint dialog)
  ├─→ Jacuzzi (NPC dwell dialog, auto swimsuit swap)
  └─→ Exit (south edge) → MauiOverworldScene
```

## File Structure

### New files
| Path | Purpose |
|------|---------|
| `src/game/scenes/maui/AirbnbCompoundScene.ts` | OverworldScene subclass |
| `src/game/scenes/maui/airbnbCompoundMap.ts` | Tile grid, walk grid, NPCs, checkpoints, decorations |
| `src/game/rendering/AirbnbCompoundTextures.ts` | Procedural texture generation for compound decorations |
| `src/game/systems/WaterEffectSystem.ts` | Extracted reusable water effects |

### Modified files
| Path | Changes |
|------|---------|
| `src/main.ts` | Add `AirbnbCompoundScene` to scene array |
| `src/game/scenes/maui/MauiOverworldScene.ts` | Use `WaterEffectSystem`, add `maui_airbnb` checkpoint handler, remove tennis checkpoint handler |
| `src/game/scenes/maui/mauiMap.ts` | Add `maui_airbnb` checkpoint zone, remove old jacuzzi decoration + jacuzzi-npc + tennis checkpoint, add gate decoration, extend `MauiTileType` enum with 6 new values, widen terrain spritesheet |
| `src/game/rendering/MauiTextures.ts` | Add new tile type frames to terrain spritesheet, add gate texture, register in `generateMauiTextures()` |
| `src/game/rendering/PixelArtGenerator.ts` | Call `generateAirbnbCompoundTextures()` |

## Constants
- `CATCH_RADIUS` bump: already done (28)
- Map: 40 tiles wide, 32 tall
- Spawn: tile (19, 30) — parking area entrance
