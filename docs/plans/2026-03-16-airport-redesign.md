# Airport Redesign — Design Document

## Overview

Major airport redesign: expand the exterior footprint on the world map with runway, animated planes, cars, and NPC pedestrians. Replace the 3 small interior scenes with one big open room featuring distinct atmosphere zones.

## 1. World Map Changes

### Map Dimensions

Expand from 40×32 to **40×38** (6 extra rows south). Update `MAP_HEIGHT` in constants.

### Airport Building & Runway Layout

```
Rows 0–27:   Existing town (unchanged, airport removed from old position at 32,24)
Row  28:      Access road + parking lots
Rows 29–31:  Airport terminal building (12×3 tiles at position 14,29)
Rows 32–34:  Tarmac (runway approach, taxiway area — all non-walkable)
Rows 35–37:  Runway with center markings (30×3 tiles, x=5 to x=34)
```

**Terminal:** tiles (14,29) to (25,31) — 12×3 = 384×96px sprite
**Runway:** tiles (5,35) to (34,37) — 30×3 tiles with dashed center line
**Tarmac:** tiles (5,32) to (34,34) — apron + taxiway merged into one tarmac zone
**Parking lots:** (8,28)–(13,31) west, (26,28)–(31,31) east — 6×4 each
**Access road:** (8,28)–(31,28) — single row connecting parking lots

### New Tile Types

| ID | Name | Color | Purpose |
|----|------|-------|---------|
| 4 | Tarmac | `#3a3a4a` | Runway approach, taxiway, apron |
| 5 | RunwayMarking | `#3a3a4a` + white dashes | Runway center line |
| 6 | ParkingLot | `#4a4a52` | Parking areas |

### Walkability

- Terminal building: **blocked**
- Runway + tarmac (rows 32–37): **blocked**
- Parking lots + access road: **walkable**
- Airport fencing: **blocked**

### Checkpoint Zone

```js
{
  id: 'airport',
  centerX: tileToWorld(19, 29).x,  // 624px — center of terminal front
  centerY: tileToWorld(19, 29).y,   // 944px — north face of terminal
  radius: 56,
  promptText: 'Enter Airport?'
}
```

### Animated Planes (tweened sprites, cosmetic)

1. **Departing:** Spawns at tarmac tile (18,32), taxis south to runway (18,36), accelerates east off-screen. 30s loop.
2. **Arriving:** Appears off-screen west, decelerates along runway to (18,36), taxis north to tarmac (20,32). 30s loop, 15s offset.

Plane sprite: 64×32px. Depth: -6 (behind buildings at -5).

### Cars

1. Access road east→west: (31,28) → (8,28), 12s loop
2. Access road west→east: (8,28) → (31,28), 12s loop, 6s offset
3. Taxi from town: (19,24) → (19,28), pause 4s, return. 8s each way, 3s offset.

### NPC Pedestrians

| ID | Start Tile | Walk Path | Texture |
|----|-----------|-----------|---------|
| airport_ped_1 | (16,28) | (16,28)↔(22,28) | npc-suitcase |
| airport_ped_2 | (20,27) | (20,27)↔(20,28) | npc-suitcase |
| airport_ped_3 | (10,29) | idle | npc-traveler |
| airport_ped_4 | (28,28) | (28,28)↔(25,28) | npc-suitcase |

### Decorations

- Fencing along tarmac border (y=32 from x=5–13 and x=26–34)
- Windsock at (34,35)
- Runway lights at runway ends
- Trees at (7,27), (32,27), (6,29), (33,29)
- Terminal sign at (19,28)

---

## 2. Interior Redesign

### Single Room: 36×20 tiles

Replaces all 3 old scenes. Zones from south (entrance) to north (gates):

```
Y=0-1:    North wall
Y=2-5:    GATE/BOARDING (x=12-35) + CAFE (x=1-11)
Y=6-7:    Divider (planters, rope barriers) — carpet_beige floor
Y=8-11:   SECURITY SECTION
Y=12-13:  Divider (rope barriers) — carpet_beige floor
Y=14-17:  CHECK-IN AREA
Y=18-19:  Entrance wall + door
```

### Floor Types

| Zone | Floor | Vibe |
|------|-------|------|
| Check-in (y=14-17) | tile_floor | Bright lobby |
| Security (y=8-11) | tile_floor | Institutional |
| Dividers (y=6-7, 12-13) | carpet_beige | Transition |
| Gate area (y=2-5, x=12-35) | carpet | Soft waiting area |
| Cafe (y=2-5, x=1-11) | wood | Warm nook |

### Decorations by Zone

**Check-in (y=14-17):** 4 counters (x=8,14,20,26 y=15), 2 conveyor belts (x=10,22 y=17), 4 rope barriers, CHECK-IN sign, 2 plants, 2 benches

**Security (y=8-11):** 2 metal detectors (x=12,24 y=10), 2 conveyor belts (x=14,26 y=9), security booth (x=18 y=9), 4 rope barriers, SECURITY sign, 2 bins

**Gate/Boarding (y=2-5, x=12-35):** Gate desk (x=24 y=3), GATE 1 MAUI sign, departures board (x=16 y=2), 5 benches, 5 windows (north wall), 2 plants

**Cafe (y=2-5, x=1-11):** Cafe counter (x=3 y=3), 4 tables, CAFE sign, menu board, 2 plants

### NPCs

| ID | Position | Role | Interactable |
|----|----------|------|-------------|
| checkin_agent_1 | (8,15) | Clerk — "Welcome! Check in here." | Yes |
| checkin_agent_2 | (20,15) | Clerk — "Have a great trip!" | Yes |
| security_guard | (18,10) | Guard — "Boarding pass ready?" | Yes |
| gate_agent_maui | (24,4) | **Triggers AirplaneCutscene** `{ destination: 'maui' }` | Yes |
| barista | (3,4) | "Coffee before your flight?" | Yes |
| sitting_passenger_1 | (14,3) | Ambient | No |
| sitting_passenger_2 | (20,5) | Ambient | No |
| walking_passenger | (18,14) | Patrol (18,14)↔(18,7) | No |

### Entrance / Exit

- Entrance + exit: tile (18,18), south wall center
- No forwardExit/nextScene — single room, gate agent NPC triggers cutscene
- Camera zoom: 2.0

---

## 3. New Textures

### World Map

| Key | Size | Description |
|-----|------|-------------|
| `building-airport` | 384×96 | Wide terminal: glass facade, entrance doors, AIRPORT text, control tower |
| `tile-tarmac` | 32×32 | Dark grey with subtle noise |
| `tile-runway-marking` | 32×32 | Tarmac + white dashed center line |
| `tile-parking` | 32×32 | Medium grey with parking lines |
| `airplane-taxiing` | 64×32 | Top-down plane: white fuselage, grey wings |
| `deco-windsock` | 32×32 | Pole + orange/white striped cone |
| `deco-runway-light` | 32×32 | Yellow/white ground light |
| `deco-airport-fence` | 32×32 | Chain-link fence segment |
| `npc-suitcase` | 48×48 | Traveler variant holding suitcase |
| `car-taxi` | 32×16 | Yellow taxi car |

### Interior

| Key | Size | Description |
|-----|------|-------------|
| `interior-airport-flight-board` | 32×32 | Departures board with colored rows |
| `interior-airport-cafe-table` | 32×32 | Small round table |
| `interior-airport-window-large` | 32×32 | Wall window showing sky |
| `interior-airport-trash-bin` | 32×32 | Small bin |
| `interior-airport-security-booth` | 32×32 | Enclosed booth |
| Signs: gate-maui, cafe, checkin, security | 32×16 | Zone label signs |

Most existing interior decorations reused (counters, benches, conveyor belts, metal detectors, rope barriers, plants, luggage cart, stools, cafe menu).

---

## 4. Scene Changes

### Delete
- `AirportSecurityScene.ts`
- `AirportGateScene.ts`

### Rename
- `AirportEntranceScene.ts` → `AirportInteriorScene.ts` (class + scene key)

### Scene Chain (Before → After)
```
Before: WorldScene → Entrance → Security → Gate → Cutscene → Maui
After:  WorldScene → AirportInteriorScene → Cutscene → Maui
```

### Save Migration
Map old scene keys in save loader:
- `'AirportSecurityScene'` → `'AirportInteriorScene'`
- `'AirportGateScene'` → `'AirportInteriorScene'`
- `'AirportEntranceScene'` → `'AirportInteriorScene'`

---

## 5. File Changes

| File | Changes |
|------|---------|
| `src/utils/constants.ts` | `MAP_HEIGHT` 32→38 |
| `src/game/data/mapLayout.ts` | Add tile types 4-6, expand tileGrid/walkGrid to 38 rows, paint airport zone tiles, update walkability, update checkpoint |
| `src/game/scenes/WorldScene.ts` | Update BUILDINGS (airport at 14,29,12,3), add plane animations, airport cars, airport NPCs, airport decorations |
| `src/game/rendering/AirportTextures.ts` | Resize building-airport to 384×96, add world textures (tarmac, runway, parking, airplane, fence, etc.), add new interior decortures |
| `src/game/scenes/airport/AirportEntranceScene.ts` → `AirportInteriorScene.ts` | Rename, new 36×20 layout, all NPCs, gate agent boarding trigger |
| `src/game/scenes/airport/airportLayouts.ts` | Replace 3 layouts with 1 `AIRPORT_INTERIOR_LAYOUT` |
| `src/game/systems/SaveSystem.ts` | Add migration for old airport scene keys |
| `src/main.ts` | Update scene imports (remove 2, rename 1) |
| DELETE `AirportSecurityScene.ts` | — |
| DELETE `AirportGateScene.ts` | — |
