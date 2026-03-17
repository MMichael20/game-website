# Ben Gurion Airport Interior Redesign — Design Document

## Overview

Redesign the airport interior from 36x20 tiles to an 80x40 Ben Gurion-style airport with 7 distinct zones, zone gating, duty free shopping, food court, terminal corridors, and animated tarmac visible through windows.

## Map Layout — 80 wide x 40 tall

Single continuous InteriorScene. Flow LEFT to RIGHT. Internal walls divide 7 zones with 5-tile-wide doorways at y=16-20.

```
 0              17  27  37              53  63  73  80
 ┌──────────────┬───┬───┬──────────────┬───┬───┬──────┐ 0
 │  WINDOWS      W   W   WINDOWS        W   W   WIN   │
 │              │   │   │              │   │   │      │
 │  CHECK-IN    │ P │ S │  DUTY FREE   │ F │ T │ GATE │
 │  HALL        │ A │ E │  SHOPPING    │ O │ E │ AREA │
 │  (entrance   │ S │ C │             │ O │ R │      │
 │   bottom)    │ S │ U │             │ D │ M │      │
 │              │   │ R │             │   │   │      │
 └──────────────┴───┴───┴──────────────┴───┴───┴──────┘ 40
```

### Zone Breakdown

| Zone | Name | X Range | Width | Floor Type | Doorway X |
|------|------|---------|-------|------------|-----------|
| 1 | Check-in Hall | 0-17 | 18 | tile_floor | 17 |
| 2 | Passport Control | 17-27 | 11 | carpet_beige | 27 |
| 3 | Security Screening | 27-37 | 11 | tile_floor | 37 |
| 4 | Duty Free Shopping | 37-53 | 17 | carpet | 53 |
| 5 | Food Court | 53-63 | 11 | wood | 63 |
| 6 | Terminal Corridor | 63-73 | 11 | carpet_beige | 73 |
| 7 | Gate Area | 73-80 | 8 | carpet | — |

**Note:** Room rects overlap by 1 tile at shared walls (e.g., Zone1 w=18 ends at x=17, Zone2 starts at x=17 w=11). This is intentional — `buildWallGrid`'s +1 border offset preserves the shared wall column. Doorways punch through at y=16-20 (5 tiles wide, centered vertically).

### Room & Doorway Definitions

```
rooms: [
  { x: 0,  y: 0, w: 18, h: 40 },  // Zone 1 — shared wall at x=17
  { x: 17, y: 0, w: 11, h: 40 },  // Zone 2 — shared wall at x=27
  { x: 27, y: 0, w: 11, h: 40 },  // Zone 3 — shared wall at x=37
  { x: 37, y: 0, w: 17, h: 40 },  // Zone 4 — shared wall at x=53
  { x: 53, y: 0, w: 11, h: 40 },  // Zone 5 — shared wall at x=63
  { x: 63, y: 0, w: 11, h: 40 },  // Zone 6 — shared wall at x=73
  { x: 73, y: 0, w: 8,  h: 40 },  // Zone 7 — end
]

doorways: [
  { x: 17, y: 16, width: 2, height: 5 },  // Check-in → Passport
  { x: 27, y: 16, width: 2, height: 5 },  // Passport → Security
  { x: 37, y: 16, width: 2, height: 5 },  // Security → Duty Free
  { x: 53, y: 16, width: 2, height: 5 },  // Duty Free → Food Court
  { x: 63, y: 16, width: 2, height: 5 },  // Food Court → Terminal
  { x: 73, y: 16, width: 2, height: 5 },  // Terminal → Gate
]
```

Entrance: `{ tileX: 9, tileY: 38 }` (bottom of Zone 1)
Exit: `{ tileX: 8, tileY: 38, width: 3, height: 2 }` (glass doors)

## Zone Gating

### Mechanism

`AirportInteriorScene` maintains a `blockedDoorways: Set<string>` of `"x,y"` tile keys. A custom walk check wraps the base interior walk check:

```
gatedWalkCheck(tx, ty) = !blockedDoorways.has(`${tx},${ty}`) && baseWalkCheck(tx, ty)
```

### Walk Check Override Hook

Add a `protected getWalkCheck(layout): (tx,ty) => boolean` method to `InteriorScene`. Default implementation returns `createInteriorWalkCheck(layout)`. `AirportInteriorScene` overrides it to wrap with doorway gating. This method is called in `InteriorScene.create()` before Player/InputSystem construction, so they receive the gated check directly.

### Unlock Schedule

| Station Completed | Doorway Unlocked (x) | Access Granted |
|---|---|---|
| Station 1 (ticket) + Station 2 (luggage) | x=17 | Passport Control |
| Station 3 (passport) | x=27 | Security |
| Station 4 (security) | x=37, 53, 63, 73 (ALL) | Duty Free → Food Court → Terminal → Gate |
| Station 5 (boarding) | — | Triggers AirplaneCutscene |

### Persistence

**Transient** — resets each visit. Player re-does stations on re-entry. This matches the "going through airport" experience being a repeatable journey each time they fly.

### Visual Feedback

Locked doorways display a `doorway-barrier` decoration (red/orange retractable barrier). On unlock: tween alpha→0, destroy. Paired with a brief dialog: "Ticket verified — proceed to passport control."

## Stations (Updated Positions)

### Mandatory Stations (5)

```
{ id: 'ticket-counter',     triggerTileX: 6,  triggerTileY: 16 }  // Zone 1
{ id: 'luggage-checkin',    triggerTileX: 14, triggerTileY: 16 }  // Zone 1
{ id: 'passport-control',   triggerTileX: 22, triggerTileY: 20 }  // Zone 2
{ id: 'security-screening', triggerTileX: 32, triggerTileY: 20 }  // Zone 3
{ id: 'boarding-gate',      triggerTileX: 76, triggerTileY: 20 }  // Zone 7
```

Each station's `play*()` function in CheckinStations.ts needs updated tile coordinates for camera focus, desk positions, and prop spawn points.

### Optional Interactions (NPCSystem dwell triggers, not stations)

- **Duty Free Clerk** at (45, 10) in Zone 4 — dialog about shopping
- **Food Court Chef** at (56, 8) in Zone 5 — dialog about food

## Tarmac Background Through Windows

### Architecture

1. **Tarmac render texture** at depth -60: full map width x 4 tiles tall (2560x128 px), gray tarmac with runway lines, positioned behind top wall row
2. **Window tiles** defined in `InteriorLayout.windowTiles[]`: positions on top wall (y=0) where wall drawing is skipped, creating transparent holes that reveal the tarmac
3. **Window tile walk check**: `windowTiles` positions excluded from walk check (they're wall positions — player shouldn't walk there anyway, but window decorations need consistent treatment)
4. **Window frame decorations** at depth 5: overlay the holes with frame borders
5. **Animated tarmac sprites** at depth -45 (between tarmac RT and tilemap RT):
   - 3 parked planes (static): x=10*32, 45*32, 70*32 at y=1*32
   - 1 tow vehicle (tweened L→R, repeat -1, 15s duration)
   - 1 airside car (tweened R→L, repeat -1, 12s duration)
   - 1 takeoff plane (periodic, every 25s: tweens from right to left+up, scale 0.5→1.5)

### InteriorScene Base Class Changes

1. Make `buildInteriorTileMap` **protected** (currently private)
2. Add `windowTiles?: { tileX: number; tileY: number }[]` to `InteriorLayout` interface
3. In wall draw pass, skip tiles that appear in `windowTiles`
4. Camera zoom: `cam.setZoom(Math.min(layout.cameraZoom ?? Infinity, getDeviceZoom()))` — respects both layout preference and device constraints

### Animated Sprite Cleanup

All tarmac animated sprites stored in `tarmacSprites: Phaser.GameObjects.Image[]` array, destroyed in `shutdown()`.

### Render Texture Size

80x40 tiles = 2560x1280 px. Max texture size on most WebGL devices is 4096x4096. The 2560x1280 tilemap RT and 2560x128 tarmac RT are both within budget.

## New Textures Needed

### Interior Decorations (32x32)

| Key | Description |
|-----|-------------|
| `interior-airport-duty-free-counter` | Glass display counter |
| `interior-airport-duty-free-shelf` | Tall shelf with items |
| `interior-airport-perfume-display` | Perfume stand |
| `interior-airport-liquor-display` | Bottle shelf |
| `interior-airport-cash-register` | Counter register |
| `interior-airport-food-court-table` | Round table top-down |
| `interior-airport-moving-walkway` | Conveyor belt segment |
| `interior-airport-doorway-barrier` | Red retractable barrier |

### Tarmac Elements

| Key | Size | Description |
|-----|------|-------------|
| `tarmac-background` | 2560x128 | Static gray tarmac with runway lines |
| `tarmac-plane-parked` | 64x32 | Side-view parked plane |
| `tarmac-tow-vehicle` | 32x16 | Yellow tow vehicle |
| `tarmac-plane-takeoff` | 48x24 | Plane angled for takeoff |

### Signs

| Key | Description |
|-----|-------------|
| `sign-duty-free` | "Duty Free" sign |
| `sign-food-court` | "Food Court" sign |
| `sign-gates` | "Gates →" sign |
| `sign-passport` | "Passport Control" sign |

### NPCs

| Key | Description |
|-----|-------------|
| `npc-duty-free-clerk` | 48x48, blue vest uniform |

## NPCs

### Station NPCs (static sprites)

10 agents positioned at their posts:
- 4 ticket agents at check-in counters (2 active, 2 decorative)
- 3 passport officers at booths (1 active, 2 decorative)
- 2 security guards (1 active, 1 decorative)
- 1 gate agent

### Dialogue NPCs (NPCSystem)

12 NPCs:
- Zone 1: 2 sitting passengers, 1 walking passenger
- Zone 4: duty-free-clerk (interactable), 2 browsing passengers
- Zone 5: food-chef (interactable), 2 eating passengers
- Zone 6: 1 walking passenger in corridor
- Zone 7: 2 sitting passengers at gate

## Sign Tooltips

7 signs: Departures, Passport Control, Security, Duty Free, Food Court, Gates, Gate 1—Maui

## File Changes

| File | Change |
|------|--------|
| `src/game/data/interiorLayouts.ts` | Add `windowTiles` to InteriorLayout interface |
| `src/game/scenes/InteriorScene.ts` | Make buildInteriorTileMap protected, add windowTiles skip, add getWalkCheck hook, use layout.cameraZoom with device min |
| `src/game/scenes/airport/airportLayouts.ts` | Complete rewrite — 80x40 layout with 7 rooms, 6 doorways, ~150 decorations, window tile positions |
| `src/game/scenes/airport/AirportInteriorScene.ts` | Major rewrite — zone gating, tarmac animations, updated NPCs/signs, doorway unlock logic |
| `src/game/scenes/airport/CheckinStations.ts` | Update STATIONS positions, update camera focus/prop coordinates in all 5 play*() functions |
| `src/game/rendering/AirportTextures.ts` | Add ~12 new texture generators (duty free, food court, tarmac, barrier, signs, NPC) |
