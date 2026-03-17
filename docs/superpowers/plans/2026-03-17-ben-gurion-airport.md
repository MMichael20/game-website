# Ben Gurion Airport Redesign Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the airport interior from 36x20 to an 80x40 Ben Gurion-style airport with 7 zones, zone gating, duty free, food court, and animated tarmac through windows.

**Architecture:** Single InteriorScene with 80x40 tile grid, 7 rooms connected by gated doorways. InteriorScene base class extended with `windowTiles` support and `getWalkCheck()` hook. Tarmac background rendered behind window holes with animated planes/vehicles.

**Tech Stack:** Phaser 3, TypeScript, procedural Canvas 2D textures

---

### Task 1: Extend InteriorScene base class

Add `windowTiles` to InteriorLayout, add walk check override hook, use layout camera zoom. These are backwards-compatible changes.

**Files:**
- Modify: `src/game/data/interiorLayouts.ts`
- Modify: `src/game/scenes/InteriorScene.ts`

- [ ] **Step 1: Add windowTiles to InteriorLayout interface**

In `src/game/data/interiorLayouts.ts`, add to the InteriorLayout interface after line 40 (`previousScene`):

```typescript
  windowTiles?: { tileX: number; tileY: number }[];
```

- [ ] **Step 2: Add getWalkCheck hook and windowTiles support to InteriorScene**

In `src/game/scenes/InteriorScene.ts`:

1. Change `buildInteriorTileMap` from `private` to `protected` (line 199).

2. In the wall draw pass (lines 212-218), skip window tiles:
```typescript
    // First pass: draw walls everywhere (skip window tiles)
    const windowSet = new Set(
      (layout.windowTiles ?? []).map(t => `${t.tileX},${t.tileY}`)
    );
    for (let y = 0; y < layout.heightInTiles; y++) {
      for (let x = 0; x < layout.widthInTiles; x++) {
        if (layout.wallGrid[y][x] && !windowSet.has(`${x},${y}`)) {
          rt.drawFrame('interior-terrain', InteriorTileType.Wall, x * TILE_SIZE, y * TILE_SIZE);
        }
      }
    }
```

3. Add a protected `getWalkCheck` method:
```typescript
  protected getWalkCheck(layout: InteriorLayout): (tileX: number, tileY: number) => boolean {
    return createInteriorWalkCheck(layout);
  }
```

4. In `create()` line 71, replace:
```typescript
    const walkCheck = createInteriorWalkCheck(layout);
```
with:
```typescript
    const walkCheck = this.getWalkCheck(layout);
```

5. In `create()` line 81, replace:
```typescript
    cam.setZoom(getDeviceZoom());
```
with:
```typescript
    cam.setZoom(layout.cameraZoom ? Math.min(layout.cameraZoom, getDeviceZoom()) : getDeviceZoom());
```

- [ ] **Step 3: Build and verify**

Run: `npm run build`
Expected: No errors. Existing scenes unchanged (windowTiles is optional, getWalkCheck default returns same result).

- [ ] **Step 4: Commit**

```bash
git add src/game/data/interiorLayouts.ts src/game/scenes/InteriorScene.ts
git commit -m "refactor: add windowTiles, getWalkCheck hook, layout cameraZoom to InteriorScene"
```

---

### Task 2: Add new airport textures

Add ~12 new procedural textures for duty free, food court, tarmac, barriers, signs, and NPC.

**Files:**
- Modify: `src/game/rendering/AirportTextures.ts`

- [ ] **Step 1: Add new texture generators**

In `src/game/rendering/AirportTextures.ts`, add a new function `generateBenGurionTextures(scene)` before the export function. This generates all new textures needed for the expanded airport:

**New interior decorations (32x32 each):**
- `interior-airport-duty-free-counter` — Glass display counter with visible items
- `interior-airport-duty-free-shelf` — Tall shelf with bottles/boxes
- `interior-airport-perfume-display` — Small perfume stand
- `interior-airport-liquor-display` — Bottle shelf
- `interior-airport-cash-register` — Register on counter
- `interior-airport-food-court-table` — Round table, top-down
- `interior-airport-moving-walkway` — Gray conveyor belt segment with arrows
- `interior-airport-doorway-barrier` — Red/orange retractable barrier

**New tarmac textures:**
- `tarmac-background` (2560x128) — Gray tarmac with white runway dashes
- `tarmac-plane-parked` (64x32) — Side-view parked plane
- `tarmac-tow-vehicle` (32x16) — Yellow tow vehicle
- `tarmac-plane-takeoff` (48x24) — Plane angled upward

**New sign:**
- `sign-duty-free` (32x16) — "DUTY FREE" text sign
- `sign-passport` (32x16) — "PASSPORT" text sign
- `sign-food-court` (32x16) — "FOOD COURT" text sign
- `sign-gates` (32x16) — "GATES →" text sign

**New NPC:**
- `npc-duty-free-clerk` (48x48) — Blue vest uniform NPC

Use the same `px()`, `rect()`, `darken()`, `lighten()` helpers already in the file. Follow the existing texture drawing patterns (e.g., `generateInteriorTextures` for decoration style, `generateSignTextures` for sign style, `drawNPCBase` pattern if available or manual drawing for NPC).

Each texture function should follow this pattern:
```typescript
{
  const c = scene.textures.createCanvas('texture-key', width, height);
  if (!c) return;
  const ctx = c.context;
  // ... drawing code ...
  c.refresh();
}
```

- [ ] **Step 2: Register in generateAirportTextures**

Add `generateBenGurionTextures(scene);` call inside `generateAirportTextures()`.

- [ ] **Step 3: Build and verify**

Run: `npm run build`
Expected: No errors. New textures generated at boot, unused until layout references them.

- [ ] **Step 4: Commit**

```bash
git add src/game/rendering/AirportTextures.ts
git commit -m "feat: add Ben Gurion airport textures (duty free, food court, tarmac, barriers)"
```

---

### Task 3: Rewrite airport layout data

Replace the 36x20 layout with the 80x40 Ben Gurion layout. This is the largest data change.

**Files:**
- Modify: `src/game/scenes/airport/airportLayouts.ts`

- [ ] **Step 1: Replace AIRPORT_INTERIOR_LAYOUT**

Rewrite `airportLayouts.ts` completely. The new layout has:

**Dimensions:** 80x40

**7 rooms** (overlapping by 1 tile at shared walls — intentional, see design doc):
```typescript
const AIRPORT_ROOMS = [
  { x: 0,  y: 0, w: 18, h: 40 },  // Zone 1: Check-in Hall
  { x: 17, y: 0, w: 11, h: 40 },  // Zone 2: Passport Control
  { x: 27, y: 0, w: 11, h: 40 },  // Zone 3: Security Screening
  { x: 37, y: 0, w: 17, h: 40 },  // Zone 4: Duty Free Shopping
  { x: 53, y: 0, w: 11, h: 40 },  // Zone 5: Food Court
  { x: 63, y: 0, w: 11, h: 40 },  // Zone 6: Terminal Corridor
  { x: 73, y: 0, w: 8,  h: 40 },  // Zone 7: Gate Area
];
```

**6 doorways** (5 tiles wide at y=16-20):
```typescript
const AIRPORT_DOORWAYS = [
  { x: 17, y: 16, width: 2, height: 5 },
  { x: 27, y: 16, width: 2, height: 5 },
  { x: 37, y: 16, width: 2, height: 5 },
  { x: 53, y: 16, width: 2, height: 5 },
  { x: 63, y: 16, width: 2, height: 5 },
  { x: 73, y: 16, width: 2, height: 5 },
];
```

**Floor zones** (one per zone):
```typescript
floors: [
  { tileX: 1, tileY: 1, width: 16, height: 38, floorType: 'tile_floor' },      // Zone 1
  { tileX: 18, tileY: 1, width: 8, height: 38, floorType: 'carpet_beige' },    // Zone 2
  { tileX: 28, tileY: 1, width: 8, height: 38, floorType: 'tile_floor' },      // Zone 3
  { tileX: 38, tileY: 1, width: 14, height: 38, floorType: 'carpet' },         // Zone 4
  { tileX: 54, tileY: 1, width: 8, height: 38, floorType: 'wood' },            // Zone 5
  { tileX: 64, tileY: 1, width: 8, height: 38, floorType: 'carpet_beige' },    // Zone 6
  { tileX: 74, tileY: 1, width: 5, height: 38, floorType: 'carpet' },          // Zone 7
],
```

**Window tiles** (positions along top wall y=0 where wall is skipped):
```typescript
windowTiles: [
  // Zone 1 windows
  { tileX: 2, tileY: 0 }, { tileX: 5, tileY: 0 }, { tileX: 8, tileY: 0 },
  { tileX: 11, tileY: 0 }, { tileX: 14, tileY: 0 },
  // Zone 2 windows
  { tileX: 19, tileY: 0 }, { tileX: 22, tileY: 0 }, { tileX: 25, tileY: 0 },
  // Zone 3 windows
  { tileX: 29, tileY: 0 }, { tileX: 32, tileY: 0 }, { tileX: 35, tileY: 0 },
  // Zone 4 windows (duty free — more windows)
  { tileX: 39, tileY: 0 }, { tileX: 42, tileY: 0 }, { tileX: 45, tileY: 0 },
  { tileX: 48, tileY: 0 }, { tileX: 51, tileY: 0 },
  // Zone 5 windows
  { tileX: 55, tileY: 0 }, { tileX: 58, tileY: 0 }, { tileX: 61, tileY: 0 },
  // Zone 6 windows (terminal — many windows)
  { tileX: 65, tileY: 0 }, { tileX: 67, tileY: 0 }, { tileX: 69, tileY: 0 }, { tileX: 71, tileY: 0 },
  // Zone 7 windows
  { tileX: 75, tileY: 0 }, { tileX: 77, tileY: 0 },
],
```

**Decorations** (~130 entries, organized by zone). Key placements:

Zone 1 (Check-in): 4 counters at y=15, rope barriers at y=14, luggage belt at (14,16), departures board at (9,2), benches at y=30-36, plants at corners, luggage carts.

Zone 2 (Passport): 3 passport desks at y=18 (x=20,22,24), rope barriers at y=16-17.

Zone 3 (Security): 2 metal detectors at y=18 (x=30,34), 2 conveyor belts at y=17, bins, rope barriers.

Zone 4 (Duty Free): 3 duty-free-counters at y=10, 6 duty-free-shelves, perfume display, liquor display, cash registers.

Zone 5 (Food Court): 2 cafe counters at y=8, cafe menus, stools, 4 food-court-tables.

Zone 6 (Terminal): 5 moving-walkway segments at y=18, benches, departures board.

Zone 7 (Gate): gate desk at (76,10), departures board, benches.

**All zones:** Window decorations at each windowTile position + plants at zone corners.

Also add **6 doorway-barrier decorations** at each doorway position (these are managed separately by AirportInteriorScene for gating).

**Entrance:** `{ tileX: 9, tileY: 38 }`
**Exit:** `{ tileX: 8, tileY: 38, width: 3, height: 2, promptText: 'Exit Airport' }`
**Exit door style:** `glass`
**Camera zoom:** `1.75`

- [ ] **Step 2: Build and verify**

Run: `npm run build`
Expected: No errors. (The scene won't render correctly yet since AirportInteriorScene still references old NPC positions, but it should compile.)

- [ ] **Step 3: Commit**

```bash
git add src/game/scenes/airport/airportLayouts.ts
git commit -m "feat: rewrite airport layout to 80x40 Ben Gurion style with 7 zones"
```

---

### Task 4: Rewrite AirportInteriorScene with zone gating and tarmac

The main scene controller with zone gating, tarmac background, animated planes/vehicles, updated NPCs/signs.

**Files:**
- Modify: `src/game/scenes/airport/AirportInteriorScene.ts`

- [ ] **Step 1: Rewrite the scene file**

Complete rewrite of AirportInteriorScene.ts. Key changes:

1. **Walk check override** — Override `getWalkCheck(layout)` to wrap base check with `blockedDoorways` gating:
```typescript
private blockedDoorways = new Set<string>();

protected getWalkCheck(layout: InteriorLayout) {
  const baseCheck = createInteriorWalkCheck(layout);
  return (tx: number, ty: number) => {
    if (this.blockedDoorways.has(`${tx},${ty}`)) return false;
    return baseCheck(tx, ty);
  };
}
```

2. **Init blocked doorways** — In `create()`, block all 6 doorway positions initially:
```typescript
// Doorway positions (same as layout doorways)
const DOORWAY_TILES = [
  { x: 17, ys: [16,17,18,19,20] },  // Check-in → Passport
  { x: 27, ys: [16,17,18,19,20] },  // Passport → Security
  { x: 37, ys: [16,17,18,19,20] },  // Security → Duty Free
  { x: 53, ys: [16,17,18,19,20] },  // Duty Free → Food Court
  { x: 63, ys: [16,17,18,19,20] },  // Food Court → Terminal
  { x: 73, ys: [16,17,18,19,20] },  // Terminal → Gate
];
```
Block all tiles initially. Also create a barrier decoration sprite at each doorway (stored in `barrierSprites[]` for cleanup).

3. **Doorway unlock method**:
```typescript
private unlockDoorway(doorwayIndex: number): void {
  const doorway = DOORWAY_TILES[doorwayIndex];
  for (const y of doorway.ys) {
    this.blockedDoorways.delete(`${doorway.x},${y}`);
    this.blockedDoorways.delete(`${doorway.x + 1},${y}`);
  }
  // Fade out barrier sprite
  const barrier = this.barrierSprites[doorwayIndex];
  if (barrier) {
    this.tweens.add({ targets: barrier, alpha: 0, duration: 400, onComplete: () => barrier.destroy() });
  }
}
```

4. **Station completion hooks** — After `runStation()`:
```typescript
if (stationIndex === 1) this.unlockDoorway(0);  // Luggage → open Passport
if (stationIndex === 2) this.unlockDoorway(1);  // Passport → open Security
if (stationIndex === 3) {                        // Security → open all remaining
  this.unlockDoorway(2);
  this.unlockDoorway(3);
  this.unlockDoorway(4);
  this.unlockDoorway(5);
}
```

5. **Tarmac background** — In `create()` after `super.create()`:
```typescript
// Tarmac render texture behind top wall
const tarmacRT = this.add.renderTexture(0, 0, mapPxW, 4 * TILE_SIZE);
tarmacRT.setOrigin(0, 0);
tarmacRT.setDepth(-60);
// Fill with tarmac texture or gray color
tarmacRT.fill(0x555555);
// Draw runway dashes
// ... (use tarmac-background texture if generated, or draw directly)
```

6. **Animated tarmac sprites** — Following Maui car pattern:
```typescript
// Parked planes (static)
const parkedPlanes = [
  this.add.image(10 * TILE_SIZE, 1 * TILE_SIZE, 'tarmac-plane-parked').setDepth(-45),
  this.add.image(45 * TILE_SIZE, 1 * TILE_SIZE, 'tarmac-plane-parked').setDepth(-45),
  this.add.image(70 * TILE_SIZE, 1 * TILE_SIZE, 'tarmac-plane-parked').setDepth(-45),
];

// Tow vehicle (animated, loops)
const tow = this.add.image(-32, 2 * TILE_SIZE, 'tarmac-tow-vehicle').setDepth(-45);
this.tweens.add({
  targets: tow, x: mapPxW + 32, duration: 15000, ease: 'Linear',
  repeat: -1, onRepeat: () => { tow.x = -32; },
});

// Plane takeoff (periodic)
this.time.addEvent({
  delay: 25000, loop: true,
  callback: () => {
    const plane = this.add.image(mapPxW, TILE_SIZE, 'tarmac-plane-takeoff').setDepth(-45);
    this.tweens.add({
      targets: plane, x: -200, y: -50, scaleX: 1.5, scaleY: 1.5,
      duration: 8000, ease: 'Sine.easeIn',
      onComplete: () => plane.destroy(),
    });
  },
});
```
Store all persistent tarmac sprites in `tarmacSprites[]` for `shutdown()` cleanup.

7. **Window frame decorations** — Already placed via layout decorations at window tile positions. The `interior-airport-window` texture provides the frame visual.

8. **Updated STATION_NPC_DEFS** — New positions matching the 80x40 layout (see design doc section 4.8).

9. **Updated DIALOG_NPCS** — Zone-appropriate NPCs including duty-free-clerk and food-chef with dialog.

10. **Updated INTERIOR_SIGNS** — 7 signs across all zones (see design doc section 4.9).

11. **Cleanup in shutdown()** — Destroy `barrierSprites`, `tarmacSprites`, and tarmac timer.

- [ ] **Step 2: Build and verify**

Run: `npm run build`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/game/scenes/airport/AirportInteriorScene.ts
git commit -m "feat: rewrite AirportInteriorScene with zone gating and tarmac animations"
```

---

### Task 5: Update CheckinStations with new coordinates

All 5 station functions need updated tile coordinates for camera focus and prop spawn positions.

**Files:**
- Modify: `src/game/scenes/airport/CheckinStations.ts`

- [ ] **Step 1: Update STATIONS array**

```typescript
export const STATIONS: StationDef[] = [
  { id: 'ticket-counter',     triggerTileX: 6,  triggerTileY: 16 },
  { id: 'luggage-checkin',    triggerTileX: 14, triggerTileY: 16 },
  { id: 'passport-control',   triggerTileX: 22, triggerTileY: 20 },
  { id: 'security-screening', triggerTileX: 32, triggerTileY: 20 },
  { id: 'boarding-gate',      triggerTileX: 76, triggerTileY: 20 },
];
```

- [ ] **Step 2: Update playTicketCounter**

Update camera focus tile from (8,15) to (6,15). Update counter position from `tileToWorld(8, 15)` to `tileToWorld(6, 15)`. The viewport center fix from earlier (using `cam.getWorldPoint`) is already in place.

- [ ] **Step 3: Update playLuggageCheckin**

Update camera focus from (14,16) to (14,16) (same X, belt position unchanged within Zone 1). Update belt position to `tileToWorld(14, 16)`.

- [ ] **Step 4: Update playPassportControl**

Update camera focus from (18,12) to (22,18). Update desk position from `tileToWorld(18, 12)` to `tileToWorld(22, 18)`.

- [ ] **Step 5: Update playSecurityScreening**

Update camera focus from (24,10) to (32,18). Update conveyor position from `tileToWorld(26, 9)` to `tileToWorld(33, 17)`. Update detector position from `tileToWorld(24, 10)` to `tileToWorld(32, 18)`.

- [ ] **Step 6: Update playBoardingGate**

Update camera focus from (24,4) to (76,10). Update gate desk position from `tileToWorld(24, 3)` to `tileToWorld(76, 10)`.

- [ ] **Step 7: Build and verify**

Run: `npm run build`
Expected: No errors.

- [ ] **Step 8: Commit**

```bash
git add src/game/scenes/airport/CheckinStations.ts
git commit -m "feat: update check-in station coordinates for 80x40 airport layout"
```

---

### Task 6: Final build, verify, and push

- [ ] **Step 1: Full build**

Run: `npm run build`
Expected: No errors.

- [ ] **Step 2: Dev server verification**

Run: `npm run dev` and test:
1. Enter airport from WorldScene → spawns at bottom of Zone 1 (check-in hall)
2. Walk to ticket counter → animation plays with departure board visible
3. Walk to luggage belt → animation plays, suitcase textures restored
4. Doorway to Zone 2 unlocks after luggage station
5. Walk through to passport control → stamp animation plays
6. Doorway to Zone 3 unlocks → security screening works
7. After security, ALL remaining doorways open
8. Walk through Duty Free → duty-free-clerk NPC has dialog
9. Walk through Food Court → chef NPC has dialog
10. Walk through Terminal Corridor → see moving walkway decorations
11. Arrive at Gate → boarding gate animation triggers cutscene
12. Windows along top wall show tarmac with animated planes/vehicles
13. Locked doorways show barrier decorations that fade on unlock
14. Camera zoom appropriate (not too tight, not too wide)

- [ ] **Step 3: Commit design doc**

```bash
git add docs/plans/2026-03-17-ben-gurion-airport-design.md
git commit -m "docs: add Ben Gurion airport design document"
```

- [ ] **Step 4: Push all**

```bash
git push
```
