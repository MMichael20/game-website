# Airport Tarmac Shrink & Animated Background Design

## Goal
Shrink the airport interior from 80x40 to 80x22 tiles. Replace the unused lower filler space with a large animated tarmac background visible through tall windows at the top. Pack the tarmac with life: parked planes, taxiing planes, takeoff sequence, luggage cart trains, fuel truck, ground crew, runway lights, and more.

## Architecture

### Approach: Single RenderTexture + Tween-Animated Sprites

1. **Tarmac RenderTexture** (2560x320, depth -49): Static background drawn once — sky gradient, tarmac surface, runway markings, taxiway lines, grass strips, parked plane silhouettes
2. **Animated sprites** (depth -48 to -45): Individual Phaser sprites with looping tweens for all moving elements
3. **Glass tint** (depth -44): Subtle blue rectangles (alpha 0.06) across window columns for "looking through glass" effect
4. **Window frames** (depth -40): Tall window frame sprites with transparent panes — tarmac shows through
5. **Floor/wall RT** (depth -50): Existing system, modified to skip rendering in tarmac zone (y=0-9)

### Why This Approach
- Extends the existing RenderTexture pattern (floor RT at depth -50)
- All animations use Phaser tweens — consistent with CheckinStations.ts and AirplaneCutscene.ts patterns
- No per-frame update() additions needed — tweens are self-managing
- 2560x320 is well within WebGL texture limits

---

## Layout Restructure

### New Dimensions
- **Width:** 80 tiles (unchanged)
- **Height:** 22 tiles (was 40)
- **Pixel size:** 2560 x 704

### Vertical Layout
| Row(s) | Purpose |
|--------|---------|
| y=0 | Top wall (above tarmac) |
| y=1 to y=9 | Tarmac zone — animated background visible through windows |
| y=10 | Wall row below windows (room top perimeter) — window frames mounted here |
| y=11 to y=20 | Gameplay area (walkable floor, counters, NPCs, stations) |
| y=21 | Bottom wall |

### Room Definitions
Rooms now start at y=10 with h=12. The `buildWallGrid` function creates walls at room perimeter (y=10 and y=21), with walkable interior at y=11-20. The wall at y=10 is the natural top perimeter — **no special handling needed**.

The tarmac zone (y=0-9) is NOT part of any room, so `buildWallGrid` leaves it as walls. To prevent those wall tiles from rendering over the tarmac RT, add a `tarmacZoneMaxY: 9` property to the layout. In `buildInteriorTileMap`, skip all rendering for y <= tarmacZoneMaxY.

```
Old rooms:                          New rooms:
{ x: 0,  y: 0, w: 18, h: 40 }  →  { x: 0,  y: 10, w: 18, h: 12 }
{ x: 17, y: 0, w: 11, h: 40 }  →  { x: 17, y: 10, w: 11, h: 12 }
{ x: 27, y: 0, w: 11, h: 40 }  →  { x: 27, y: 10, w: 11, h: 12 }
{ x: 37, y: 0, w: 17, h: 40 }  →  { x: 37, y: 10, w: 17, h: 12 }
{ x: 53, y: 0, w: 11, h: 40 }  →  { x: 53, y: 10, w: 11, h: 12 }
{ x: 63, y: 0, w: 11, h: 40 }  →  { x: 63, y: 10, w: 11, h: 12 }
{ x: 73, y: 0, w: 8,  h: 40 }  →  { x: 73, y: 10, w: 8,  h: 12 }
```

### Floor Zones
```
Old:                                              New:
{ tileX: 1,  tileY: 1, w: 16, h: 38, tile_floor }  →  { tileX: 1,  tileY: 11, w: 16, h: 9, tile_floor }
{ tileX: 18, tileY: 1, w: 8,  h: 38, carpet_beige } →  { tileX: 18, tileY: 11, w: 8,  h: 9, carpet_beige }
{ tileX: 28, tileY: 1, w: 8,  h: 38, tile_floor }  →  { tileX: 28, tileY: 11, w: 8,  h: 9, tile_floor }
{ tileX: 38, tileY: 1, w: 14, h: 38, carpet }      →  { tileX: 38, tileY: 11, w: 14, h: 9, carpet }
{ tileX: 54, tileY: 1, w: 8,  h: 38, wood }         →  { tileX: 54, tileY: 11, w: 8,  h: 9, wood }
{ tileX: 64, tileY: 1, w: 8,  h: 38, carpet_beige } →  { tileX: 64, tileY: 11, w: 8,  h: 9, carpet_beige }
{ tileX: 74, tileY: 1, w: 5,  h: 38, carpet }      →  { tileX: 74, tileY: 11, w: 5,  h: 9, carpet }
```

### Entrance / Exit
```
Old entrance: { tileX: 9, tileY: 38 }    →  New: { tileX: 9, tileY: 20 }
Old exit:     { tileX: 8, tileY: 38, w: 3, h: 2 }  →  New: { tileX: 8, tileY: 20, w: 3, h: 2 }
```

### Doorways
All doorways keep their X position. Y shifts from 16 to 14, height stays 5 (covering y=14-18).

```
Old: { x: 17, y: 16, w: 2, h: 5 }  →  New: { x: 17, y: 14, w: 2, h: 5 }
Old: { x: 27, y: 16, w: 2, h: 5 }  →  New: { x: 27, y: 14, w: 2, h: 5 }
Old: { x: 37, y: 16, w: 2, h: 5 }  →  New: { x: 37, y: 14, w: 2, h: 5 }
Old: { x: 53, y: 16, w: 2, h: 5 }  →  New: { x: 53, y: 14, w: 2, h: 5 }
Old: { x: 63, y: 16, w: 2, h: 5 }  →  New: { x: 63, y: 14, w: 2, h: 5 }
Old: { x: 73, y: 16, w: 2, h: 5 }  →  New: { x: 73, y: 14, w: 2, h: 5 }
```

**Doorway blocking in AirportInteriorScene.ts:** Change `for (let y = 16; y <= 20; y++)` to `for (let y = 14; y <= 18; y++)` in both `create()` and `unlockDoorway()`.

### Window Tiles
All window tiles move from y=0 to y=10 (the wall row where frames are mounted). X values unchanged.

```
All 28 entries: tileY: 0  →  tileY: 10
(X values: 2, 5, 8, 11, 14, 19, 22, 25, 29, 32, 35, 39, 42, 45, 48, 51, 55, 58, 61, 65, 67, 69, 71, 75, 77)
```

---

## Complete Coordinate Remapping

### Remapping Strategy
The old gameplay occupied y=1-38 (38 rows). The new gameplay occupies y=11-20 (10 rows). Rather than a linear formula (which would squish everything), we use a zone-based approach:

- **Upper gameplay elements** (old y=2-15): Map to y=11-13 (top of new gameplay)
- **Core gameplay elements** (old y=15-22): Map to y=13-17 (middle of new gameplay — where all the action is)
- **Lower filler elements** (old y=23-38): REMOVE (benches, waiting areas) or consolidate to y=18-20

### Station Triggers (CheckinStations.ts)
| Station | Old (tileX, tileY) | New (tileX, tileY) |
|---------|-------------------|-------------------|
| Ticket Counter | (4, 16) | (4, 14) |
| Luggage Check-in | (13, 16) | (13, 14) |
| Passport Control | (22, 19) | (22, 17) |
| Security Screening | (30, 19) | (30, 17) |
| Boarding Gate | (76, 11) | (76, 13) |

### Station NPCs (STATION_NPC_DEFS)
| NPC | Old (tileX, tileY) | New (tileX, tileY) | Notes |
|-----|-------------------|-------------------|-------|
| ticket-agent | (4, 15) | (4, 13) | Counter 1 |
| ticket-agent | (8, 15) | (8, 13) | Counter 2 |
| ticket-agent | (12, 15) | (12, 13) | Counter 3 |
| ticket-agent | (4, 22) | REMOVE | No space for second row |
| passport-officer | (22, 18) | (22, 16) | Active |
| passport-officer | (20, 18) | (20, 16) | Decorative |
| passport-officer | (24, 18) | (24, 16) | Decorative |
| security-guard | (30, 18) | (30, 16) | Lane 1 |
| security-guard | (34, 18) | (34, 16) | Lane 2 |
| gate-agent | (76, 10) | (76, 12) | Boarding gate |
| gate-agent | (68, 8) | (68, 12) | Gate 2 |
| gate-agent | (64, 8) | (64, 12) | Gate 3 |

### Dialog NPCs (DIALOG_NPCS)
| NPC | Old (tileX, tileY) | New (tileX, tileY) | Action |
|-----|-------------------|-------------------|--------|
| sitting-pax-1 | (3, 30) | REMOVE | Was in filler zone |
| sitting-pax-2 | (12, 33) | REMOVE | Was in filler zone |
| sitting-pax-3 | (7, 36) | REMOVE | Was in filler zone |
| walking-pax-1 | (10, 25) path [{x:10,y:25},{x:10,y:10}] | (10, 19) path [{x:10,y:19},{x:10,y:12}] | Remap walk path |
| duty-free-clerk | (45, 10) | (45, 12) | |
| shopping-pax-1 | (42, 20) | (42, 17) | |
| shopping-pax-2 | (48, 25) | REMOVE | Was in filler zone |
| food-chef | (56, 8) | (56, 12) | |
| eating-pax-1 | (56, 17) | (56, 15) | |
| eating-pax-2 | (60, 23) | REMOVE | Was in filler zone |
| walking-pax-2 | (65, 20) path [{x:65,y:20},{x:72,y:20}] | (65, 18) path [{x:65,y:18},{x:72,y:18}] | Remap walk path |
| standing-pax-1 | (10, 18) | (10, 16) | |
| passport-waiter-1 | (21, 24) | (21, 18) | |
| passport-waiter-2 | (23, 26) | REMOVE | Was in filler zone |
| security-queue-1 | (31, 22) | (31, 18) | |
| security-queue-2 | (33, 22) | (33, 18) | |
| corridor-walker-1 | (66, 15) path [{x:66,y:15},{x:72,y:15}] | (66, 15) path [{x:66,y:15},{x:72,y:15}] | Unchanged (already in range) |
| gate-pax-1 | (75, 22) | (75, 18) | |
| gate-pax-2 | (77, 26) | REMOVE | Was in filler zone |
| gate-pax-3 | (75, 18) | (75, 16) | |
| gate-pax-4 | (77, 22) | (77, 18) | |
| gate2-pax-1 | (67, 12) | (67, 14) | |
| gate3-pax-1 | (65, 12) | (65, 14) | |

### Interior Signs
| Sign | Old (tileX, tileY) | New (tileX, tileY) |
|------|-------------------|-------------------|
| sign-departures | (9, 2) | (9, 11) |
| sign-passport | (22, 3) | (22, 11) |
| sign-security | (32, 3) | (32, 11) |
| sign-duty-free | (45, 3) | (45, 11) |
| sign-food-court | (58, 3) | (58, 11) |
| sign-gates | (66, 3) | (66, 11) |
| sign-gate-maui | (76, 3) | (76, 11) |
| sign-gate-2 | (68, 5) | (68, 11) |
| sign-gate-3 | (64, 5) | (64, 11) |

### Decorations — Complete Remapping

**Zone 1 (Check-in Hall):**
| Old (tileX, tileY, type) | New (tileX, tileY) | Action |
|--------------------------|-------------------|--------|
| (2,0) airport-window | REMOVE | Replaced by tarmac system |
| (5,0) airport-window | REMOVE | Replaced by tarmac system |
| (8,0) airport-window | REMOVE | Replaced by tarmac system |
| (11,0) airport-window | REMOVE | Replaced by tarmac system |
| (14,0) airport-window | REMOVE | Replaced by tarmac system |
| (4,15) airport-counter | (4,13) | |
| (8,15) airport-counter | (8,13) | |
| (12,15) airport-counter | (12,13) | |
| (4,22) airport-counter | REMOVE | No space |
| (8,22) airport-counter | REMOVE | No space |
| (12,22) airport-counter | REMOVE | No space |
| (12,16) airport-luggage-belt | (12,14) | |
| (3,14) airport-rope-barrier | (3,12) | |
| (7,14) airport-rope-barrier | (7,12) | |
| (11,14) airport-rope-barrier | (11,12) | |
| (15,14) airport-rope-barrier | (15,12) | |
| (3,21) airport-rope-barrier | (3,18) | |
| (7,21) airport-rope-barrier | (7,18) | |
| (11,21) airport-rope-barrier | (11,18) | |
| (9,2) airport-departures-board | (9,11) | Mount on wall |
| (1,27) airport-luggage-cart | (1,19) | |
| (16,27) airport-luggage-cart | (16,19) | |
| (3,30)-(12,36) benches (8 total) | REMOVE ALL | Filler zone |
| (1,1) airport-plant | (1,11) | |
| (16,1) airport-plant | (16,11) | |
| (1,38) airport-plant | (1,20) | |
| (16,38) airport-plant | (16,20) | |

**Zone 2 (Passport Control):**
| Old | New | Action |
|-----|-----|--------|
| (19,0), (22,0), (25,0) windows | REMOVE | Tarmac system |
| (20,18) passport-desk | (20,16) | |
| (22,18) passport-desk | (22,16) | |
| (24,18) passport-desk | (24,16) | |
| (19,16) rope-barrier | (19,14) | |
| (21,16) rope-barrier | (21,14) | |
| (23,16) rope-barrier | (23,14) | |
| (25,16) rope-barrier | (25,14) | |
| (19,21) rope-barrier | (19,18) | |
| (25,21) rope-barrier | (25,18) | |
| (20,28), (24,28) benches | REMOVE | Filler zone |
| (18,1) plant | (18,11) | |
| (26,1) plant | (26,11) | |

**Zone 3 (Security Screening):**
| Old | New | Action |
|-----|-----|--------|
| (29,0), (32,0), (35,0) windows | REMOVE | Tarmac system |
| (30,18) metal-detector | (30,16) | |
| (34,18) metal-detector | (34,16) | |
| (31,17) conveyor-belt | (31,15) | |
| (35,17) conveyor-belt | (35,15) | |
| (29,17) bin | (29,15) | |
| (33,17) bin | (33,15) | |
| (29,15) rope-barrier | (29,13) | |
| (31,15) rope-barrier | (31,13) | |
| (33,15) rope-barrier | (33,13) | |
| (35,15) rope-barrier | (35,13) | |
| (28,1) plant | (28,11) | |
| (36,1) plant | (36,11) | |

**Zone 4 (Duty Free Shopping):**
| Old | New | Action |
|-----|-----|--------|
| (39,0)-(51,0) windows (5) | REMOVE | Tarmac system |
| (40,10) duty-free-counter | (40,12) | |
| (44,10) duty-free-counter | (44,12) | |
| (48,10) duty-free-counter | (48,12) | |
| (40,15) duty-free-shelf | (40,14) | |
| (44,15) duty-free-shelf | (44,14) | |
| (48,15) duty-free-shelf | (48,14) | |
| (40,24) duty-free-shelf | (40,18) | |
| (44,24) duty-free-shelf | (44,18) | |
| (48,24) duty-free-shelf | (48,18) | |
| (42,18) perfume-display | (42,16) | |
| (46,18) liquor-display | (46,16) | |
| (41,10) cash-register | (41,12) | |
| (45,10) cash-register | (45,12) | |
| (49,10) cash-register | (49,12) | |
| (40,30), (46,30) benches | REMOVE | Filler zone |
| (38,1) plant | (38,11) | |
| (52,1) plant | (52,11) | |
| (38,38) plant | (38,20) | |
| (52,38) plant | (52,20) | |

**Zone 5 (Food Court):**
| Old | New | Action |
|-----|-----|--------|
| (55,0)-(61,0) windows (3) | REMOVE | Tarmac system |
| (56,8) cafe-counter | (56,12) | |
| (60,8) cafe-counter | (60,12) | |
| (55,8) cafe-menu | (55,12) | |
| (59,8) cafe-menu | (59,12) | |
| (56,10) stool | (56,13) | |
| (57,10) stool | (57,13) | |
| (60,10) stool | (60,13) | |
| (61,10) stool | (61,13) | |
| (56,16) food-court-table | (56,15) | |
| (60,16) food-court-table | (60,15) | |
| (56,22) food-court-table | (56,18) | |
| (60,22) food-court-table | (60,18) | |
| (55,16)-(61,16) stools at tables (4) | (55,15)-(61,15) | |
| (54,28), (62,28) bins | REMOVE | Filler zone |
| (54,1) plant | (54,11) | |
| (62,1) plant | (62,11) | |

**Zone 6 (Terminal Corridor):**
| Old | New | Action |
|-----|-----|--------|
| (65,0)-(71,0) windows (4) | REMOVE | Tarmac system |
| (66,18)-(70,18) moving-walkway (5) | (66,16)-(70,16) | |
| (68,5) departures-board | (68,11) | |
| (64,5) departures-board | (64,11) | |
| (68,8) gate-desk | (68,12) | |
| (64,8) gate-desk | (64,12) | |
| (67,12) bench | (67,14) | |
| (69,12) bench | (69,14) | |
| (64,12) bench | (64,14) | |
| (66,12) bench | (66,14) | |
| (65,10) bench | (65,13) | |
| (69,10) bench | (69,13) | |
| (65,28), (69,28) benches | REMOVE | Filler zone |
| (64,1) plant | (64,11) | |
| (72,1) plant | (72,11) | |
| (64,38) plant | (64,20) | |
| (72,38) plant | (72,20) | |

**Zone 7 (Gate Area):**
| Old | New | Action |
|-----|-----|--------|
| (75,0), (77,0) windows | REMOVE | Tarmac system |
| (76,10) gate-desk | (76,12) | |
| (76,5) departures-board | (76,11) | |
| (75,18) bench | (75,16) | |
| (77,18) bench | (77,16) | |
| (75,22) bench | (75,18) | |
| (77,22) bench | (77,18) | |
| (75,26), (77,26) benches | REMOVE | Filler zone |
| (74,1) plant | (74,11) | |
| (78,1) plant | (78,11) | |

---

## Animated Tarmac System

### Tarmac RenderTexture (drawn once in create())

**Size:** 2560 x 320 pixels (80 tiles x 10 tiles, covering y=0 to y=9)
**Position:** (0, 0)
**Depth:** -49

**Static content drawn onto RT:**
1. **Sky gradient** — top 40% (128px): light blue (#87CEEB) fading to pale blue (#B0E0FF)
2. **Tarmac surface** — bottom 60% (192px): dark gray (#555555) with subtle noise dithering
3. **Runway** — centered at y=200, white dashed center line, threshold markings at x=400 and x=2000
4. **Taxiway lines** — yellow (#FFD700) parallel lines at y=160 and y=260
5. **Grass strips** — dark green (#2D5016) between taxiway and edges (y=140-155, y=265-280)
6. **Parking stand outlines** — white rectangles at x=1600 and x=2300 (where parked planes sit)
7. **Runway number** — "09L" in white pixels near x=300, y=210

### Animated Elements (All Tween-Based)

All animated sprites live in the tarmac zone. Depths between -48 and -45 (in front of tarmac RT, behind window frames at -40).

#### A. Taxiing Aircraft (2 sprites, depth -48)

| ID | Texture | Start | End | Duration | Config |
|----|---------|-------|-----|----------|--------|
| taxi-1 | airplane-exterior (128x48), flipX | (-140, 180) | (2700, 180) | 30000ms | loop, ease: Linear, repeatDelay: 8000 |
| taxi-2 | airplane-exterior (128x48) | (2700, 220) | (-140, 220) | 35000ms | loop, ease: Linear, repeatDelay: 15000 |

#### B. Parked Aircraft at Gate (1 sprite + 3 light children, depth -48)

| Element | Position | Animation |
|---------|----------|-----------|
| Parked plane body | (2350, 160) | Static, texture: airplane-exterior scaled 1.5x |
| Anti-collision beacon (red) | (2380, 145) | alpha tween 0↔1, 600ms, yoyo, loop |
| Left wingtip (red) | (2330, 170) | alpha tween 0↔1, 1000ms, yoyo, loop |
| Right wingtip (green) | (2430, 170) | alpha tween 0↔1, 1000ms, yoyo, loop, delay: 500 |

#### C. Takeoff Sequence (1 sprite, depth -48, periodic)

Triggered every 60 seconds via `scene.time.addEvent({ delay: 60000, loop: true })`:

1. Create sprite at (2600, 200), texture: airplane-exterior, alpha: 1, scale: 1.2
2. **Accelerate:** tween x: 2600→600, duration: 3500ms, ease: Quad.easeIn
3. **Lift off:** simultaneous tween y: 200→40, scaleX/Y: 1.2→0.5, alpha: 1→0, duration: 2000ms, ease: Sine.easeIn
4. Destroy sprite on complete

#### D. Luggage Cart Train (1 composite, depth -47)

**Texture:** new `tarmac-luggage-cart` (48x20) — yellow tug pulling 2 flat carts with suitcase blocks

| Element | Path | Duration | Config |
|---------|------|----------|--------|
| Cart train | x: (-60, 240) → (2700, 240) | 40000ms | loop, ease: Linear, repeatDelay: 5000 |

#### E. Fuel Truck (1 sprite, depth -47)

**Texture:** new `tarmac-fuel-truck` (56x24) — white cab + silver cylindrical tank

| Path | Duration | Config |
|------|----------|--------|
| x: (800, 250) → (2300, 250) | 15000ms | yoyo, loop, ease: Sine.easeInOut, repeatDelay: 8000 |

#### F. Airport Workers (2 sprites, depth -47)

**Texture:** new `tarmac-worker` (20x28) — orange vest, hard hat, small body

| Worker | Path | Duration | Config |
|--------|------|----------|--------|
| worker-1 | x: (500, 260) → (900, 260) | 8000ms | yoyo, loop, ease: Linear |
| worker-2 | x: (1600, 270) → (2000, 270) | 10000ms | yoyo, loop, ease: Linear, delay: 3000 |

#### G. Ground Crew with Wands (2 body sprites + 2 wand sprites, depth -47)

**Body texture:** new `tarmac-ground-crew` (20x28) — orange vest with extended arms
**Wand texture:** new `tarmac-wand` (10x3) — red/orange glow stick

| Element | Position | Animation |
|---------|----------|-----------|
| Crew body 1 | (2300, 190) | Static |
| Crew body 2 | (2320, 200) | Static |
| Wand 1 (on crew 1) | (2306, 185) | rotation tween: -0.5↔0.5 rad, 800ms, yoyo, loop, ease: Sine.easeInOut |
| Wand 2 (on crew 2) | (2326, 195) | rotation tween: 0.5↔-0.5 rad, 800ms, yoyo, loop, ease: Sine.easeInOut, delay: 400 |

#### H. Runway Lights (8 sprites, depth -47)

**Texture:** new `tarmac-runway-light` (6x6) — white/yellow circle with glow

Positioned at y=195, evenly spaced: x = 200, 500, 800, 1100, 1400, 1700, 2000, 2300

| Animation | Config |
|-----------|--------|
| alpha tween: 0.3↔1.0 | 800ms, yoyo, loop, each delayed by index*100ms for chase effect |

#### I. Distant Landing Plane (1 sprite, depth -48)

**Texture:** airplane-exterior scaled 0.4x (small silhouette)

| Path | Duration | Config |
|------|----------|--------|
| (2700, 40) → (-100, 80) | 45000ms | loop, ease: Linear, repeatDelay: 20000 |

Descending trajectory simulated by different start/end Y values.

#### J. Control Tower (1 sprite, depth -48, static)

**Texture:** new `tarmac-control-tower` (24x48) — gray tower with windowed top

| Position | Animation |
|----------|-----------|
| (100, 60) | Static (no animation) — visual anchor |

#### K. Windsock (1 sprite, depth -47)

**Texture:** new `tarmac-windsock` (16x20) — orange/white striped cone on pole

| Position | Animation |
|----------|-----------|
| (350, 50) | rotation tween: -0.2↔0.2 rad, 2500ms, yoyo, loop, ease: Sine.easeInOut |

### Total Sprite Count
- **14 primary sprites** (planes, vehicles, workers, crew, tower, windsock)
- **2 wand sprites** (attached to ground crew)
- **3 light sprites** (on parked plane)
- **8 runway light sprites**
- **= 27 total game objects**
- **15 independent tweens** (most are yoyo/loop, near-zero CPU)

### Window Frame System

Remove ALL old `airport-window` decorations (28 entries at y=0).

Create new window frames in `AirportInteriorScene.create()` (NOT through decoration system — these are custom-sized sprites):

**Texture:** new `interior-airport-window-tall` (32x320, covering 10 tiles of height)
- Opaque gray frame border (2px each side)
- Horizontal mullion bars at every 64px (5 panes)
- Vertical mullion bar at center
- Glass panes are transparent (alpha 0)
- Subtle highlight strip on upper-left of each pane (1px, alpha 0.15)

**Placement:** One per window column, origin (0,0), positioned at pixel (tileX * 32, 0)
**Depth:** -40 (behind all gameplay sprites but in front of tarmac animated sprites)

**Glass tint:** For each window column, place a `Phaser.GameObjects.Rectangle` at same position, same size, fill 0xAADDFF, alpha 0.05, depth -44. This creates the subtle "looking through glass" effect.

---

## New Textures (add to AirportTextures.ts)

Create a new `generateTarmacTextures(scene)` function, called from `generateAirportTextures()`:

| Key | Size | Description |
|-----|------|-------------|
| `interior-airport-window-tall` | 32x320 | Tall window frame, transparent panes, gray mullions |
| `tarmac-luggage-cart` | 48x20 | Yellow tug + 2 trailing flat carts with colored suitcase pixels |
| `tarmac-fuel-truck` | 56x24 | White cab + silver cylindrical tank, "FUEL" pixel text |
| `tarmac-worker` | 20x28 | Simplified person: orange vest, dark pants, hard hat |
| `tarmac-ground-crew` | 20x28 | Similar to worker but arms extended outward |
| `tarmac-wand` | 10x3 | Orange/red glow stick |
| `tarmac-runway-light` | 6x6 | White circle with slight yellow glow edge |
| `tarmac-control-tower` | 24x48 | Gray rectangular tower, windowed observation deck at top |
| `tarmac-windsock` | 16x20 | Orange/white striped cone on gray pole |
| `tarmac-blink-light` | 6x6 | Red circle with soft glow (for plane anti-collision lights) |

**Existing texture `airplane-exterior` (128x48):** Reused as-is for parked, taxiing, and takeoff planes.

---

## Shutdown / Cleanup

### Objects to Track
```typescript
// Add to AirportInteriorScene class:
private tarmacRT: Phaser.GameObjects.RenderTexture | null = null;
private tarmacSprites: Phaser.GameObjects.GameObject[] = [];  // all 27 sprites
private tarmacTweens: Phaser.Tweens.Tween[] = [];            // all 15+ tweens
private windowFrames: Phaser.GameObjects.Image[] = [];        // 28 window frames
private glassTints: Phaser.GameObjects.Rectangle[] = [];      // 28 glass tints
private takeoffTimer: Phaser.Time.TimerEvent | null = null;   // 60s recurring timer
```

### Cleanup in shutdown()
```
1. Stop and destroy all tarmacTweens
2. Cancel takeoffTimer
3. Destroy all tarmacSprites
4. Destroy all windowFrames
5. Destroy all glassTints
6. Destroy tarmacRT
7. Null all references
8. Call existing parent shutdown logic
```

---

## File Changes Summary

### 1. `src/game/scenes/airport/airportLayouts.ts`
- MAP_HEIGHT: 40 → 22
- AIRPORT_ROOMS: all 7 rooms get `y: 10, h: 12`
- Floor zones: all get `tileY: 11, height: 9`
- Window tiles: all get `tileY: 10`
- Doorways: all get `y: 14`
- Entrance/exit: `tileY: 20`
- Decorations: full remapping per tables above (remove filler, shift core)
- Signs: all move to `tileY: 11`
- Add `tarmacZoneMaxY: 9` property
- Remove all `airport-window` decorations

### 2. `src/game/scenes/airport/AirportInteriorScene.ts`
- Doorway blocking: `y = 16..20` → `y = 14..18`
- STATION_NPC_DEFS: update all tileY values per table
- DIALOG_NPCS: update tileY values, remove filler NPCs, remap walk paths
- Add tarmac RT creation in create() (after buildInteriorTileMap)
- Add animated tarmac sprite creation with tweens
- Add window frame and glass tint creation
- Add class properties for cleanup tracking
- Add shutdown cleanup

### 3. `src/game/scenes/airport/CheckinStations.ts`
- Update 5 station trigger tileY values per table

### 4. `src/game/rendering/AirportTextures.ts`
- Add `generateTarmacTextures(scene)` function with 10 new textures
- Call from `generateAirportTextures()`

### 5. `src/game/scenes/InteriorScene.ts`
- Add `tarmacZoneMaxY` guard in `buildInteriorTileMap`:
  - In wall-drawing pass: skip if `y <= layout.tarmacZoneMaxY`
  - In floor-drawing pass: skip if `y <= layout.tarmacZoneMaxY`

---

## Performance Notes

- **27 sprites** total, but only ~5-8 visible at any time (camera shows ~14 of 80 tiles)
- All animations use Phaser tweens — managed by the engine, no custom update() code
- Only the takeoff sequence creates/destroys sprites (1 sprite every 60s)
- Tarmac RT is drawn once (no per-frame redraws)
- No pooling or culling needed — tween-animated sprites that are off-camera are still cheap (Phaser skips rendering invisible/off-camera objects automatically with camera culling)
- Net texture memory roughly equal to before (smaller floor RT offset by tarmac RT)
