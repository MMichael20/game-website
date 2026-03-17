# Airport Tarmac Shrink & Animated Background Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Shrink airport from 80x40 to 80x22 tiles. Top 10 rows become animated tarmac visible through windows, packed with life (planes, vehicles, workers).

**Architecture:** Two-layer rendering: a static tarmac RenderTexture (depth -49) behind the existing floor/wall RT (depth -50 but skips tarmac zone), with tween-animated sprites at depths -48 to -45. Window frames at depth -40 with transparent panes let the tarmac show through. All animations use Phaser tweens (no per-frame update logic needed).

**Tech Stack:** Phaser 3, TypeScript, Canvas 2D procedural textures

**Design Doc:** `docs/plans/2026-03-17-airport-tarmac-shrink-design.md`

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `src/game/data/interiorLayouts.ts` | Modify | Add `tarmacZoneMaxY` to `InteriorLayout` interface |
| `src/game/scenes/InteriorScene.ts` | Modify | Skip tarmac zone in `buildInteriorTileMap` |
| `src/game/scenes/airport/airportLayouts.ts` | Modify | Shrink dimensions, remap all coordinates |
| `src/game/scenes/airport/AirportInteriorScene.ts` | Modify | Add tarmac RT, animated sprites, window frames, cleanup |
| `src/game/scenes/airport/CheckinStations.ts` | Modify | Update 5 station trigger coordinates |
| `src/game/rendering/AirportTextures.ts` | Modify | Add `generateTarmacTextures()` with 10 new textures |

---

## Task 1: Add `tarmacZoneMaxY` to InteriorLayout and skip rendering in tarmac zone

This task adds the foundation: the layout interface gets a new optional property, and the base scene skips wall/floor rendering for rows in the tarmac zone.

**Files:**
- Modify: `src/game/data/interiorLayouts.ts:27-42` (InteriorLayout interface)
- Modify: `src/game/scenes/InteriorScene.ts:199-250` (buildInteriorTileMap method)

- [ ] **Step 1: Add `tarmacZoneMaxY` to `InteriorLayout` interface**

In `src/game/data/interiorLayouts.ts`, add to the interface after `windowTiles`:

```typescript
  windowTiles?: { tileX: number; tileY: number }[];
  tarmacZoneMaxY?: number;  // rows 0..N are tarmac background, skip all tile rendering
```

- [ ] **Step 2: Add tarmac zone skip guard in `buildInteriorTileMap`**

In `src/game/scenes/InteriorScene.ts`, in the `buildInteriorTileMap` method:

**First pass (wall drawing, line ~215):** Add a skip before the existing wall check:

```typescript
    for (let y = 0; y < layout.heightInTiles; y++) {
      for (let x = 0; x < layout.widthInTiles; x++) {
        if (layout.tarmacZoneMaxY !== undefined && y <= layout.tarmacZoneMaxY) continue;
        if (layout.wallGrid[y][x] && !windowSet.has(`${x},${y}`)) {
```

**Second pass (floor drawing, line ~224):** Add the same skip at the start of the inner y loop:

```typescript
    for (const fz of layout.floors) {
      const frame = floorTypeToFrame[fz.floorType] ?? InteriorTileType.Wood;
      for (let y = fz.tileY; y < fz.tileY + fz.height; y++) {
        if (layout.tarmacZoneMaxY !== undefined && y <= layout.tarmacZoneMaxY) continue;
        for (let x = fz.tileX; x < fz.tileX + fz.width; x++) {
```

**Third pass (door frames, line ~234):** Same guard:

```typescript
    for (let y = 0; y < layout.heightInTiles; y++) {
      for (let x = 0; x < layout.widthInTiles; x++) {
        if (layout.tarmacZoneMaxY !== undefined && y <= layout.tarmacZoneMaxY) continue;
        if (!layout.wallGrid[y][x]) {
```

- [ ] **Step 3: Verify existing scenes still work**

Run: `npm run dev` and visit the house interior or another interior scene.
Expected: No visual change — `tarmacZoneMaxY` is undefined for all existing layouts, so the guard is never hit.

- [ ] **Step 4: Commit**

```bash
git add src/game/data/interiorLayouts.ts src/game/scenes/InteriorScene.ts
git commit -m "feat: add tarmacZoneMaxY to InteriorLayout for skipping tarmac zone rendering"
```

---

## Task 2: Shrink airport layout from 80x40 to 80x22

This is the biggest coordinate migration task. Every room, floor zone, doorway, decoration, sign, entrance, exit, and window tile must be remapped.

**Files:**
- Modify: `src/game/scenes/airport/airportLayouts.ts` (entire file)

- [ ] **Step 1: Update room definitions and map dimensions**

Change `AIRPORT_ROOMS` — all rooms now start at y=10 with h=12:

```typescript
const AIRPORT_ROOMS = [
  { x: 0,  y: 10, w: 18, h: 12 },  // Zone 1: Check-in Hall
  { x: 17, y: 10, w: 11, h: 12 },  // Zone 2: Passport Control
  { x: 27, y: 10, w: 11, h: 12 },  // Zone 3: Security Screening
  { x: 37, y: 10, w: 17, h: 12 },  // Zone 4: Duty Free Shopping
  { x: 53, y: 10, w: 11, h: 12 },  // Zone 5: Food Court
  { x: 63, y: 10, w: 11, h: 12 },  // Zone 6: Terminal Corridor
  { x: 73, y: 10, w: 8,  h: 12 },  // Zone 7: Gate Area
];
```

This gives us: walkable interior y=11-20, walls at y=10 and y=21. The wall at y=10 is where window frames go.

- [ ] **Step 2: Update doorways**

All doorways shift from y=16 to y=14:

```typescript
const AIRPORT_DOORWAYS = [
  { x: 17, y: 14, width: 2, height: 5 },  // Check-in → Passport
  { x: 27, y: 14, width: 2, height: 5 },  // Passport → Security
  { x: 37, y: 14, width: 2, height: 5 },  // Security → Duty Free
  { x: 53, y: 14, width: 2, height: 5 },  // Duty Free → Food Court
  { x: 63, y: 14, width: 2, height: 5 },  // Food Court → Terminal
  { x: 73, y: 14, width: 2, height: 5 },  // Terminal → Gate
];
```

- [ ] **Step 3: Update layout export — dimensions, wallGrid, tarmacZoneMaxY**

```typescript
export const AIRPORT_INTERIOR_LAYOUT: InteriorLayout = {
  id: 'airport-interior',
  widthInTiles: 80,
  heightInTiles: 22,
  wallGrid: buildWallGrid(80, 22, AIRPORT_ROOMS, AIRPORT_DOORWAYS),
  tarmacZoneMaxY: 9,
```

- [ ] **Step 4: Update floor zones**

All start at y=11 with height 9:

```typescript
  floors: [
    { tileX: 1,  tileY: 11, width: 16, height: 9, floorType: 'tile_floor' },
    { tileX: 18, tileY: 11, width: 8,  height: 9, floorType: 'carpet_beige' },
    { tileX: 28, tileY: 11, width: 8,  height: 9, floorType: 'tile_floor' },
    { tileX: 38, tileY: 11, width: 14, height: 9, floorType: 'carpet' },
    { tileX: 54, tileY: 11, width: 8,  height: 9, floorType: 'wood' },
    { tileX: 64, tileY: 11, width: 8,  height: 9, floorType: 'carpet_beige' },
    { tileX: 74, tileY: 11, width: 5,  height: 9, floorType: 'carpet' },
  ],
```

- [ ] **Step 5: Update window tiles**

All windows move to y=10 (the wall row where frames will be mounted):

```typescript
  windowTiles: [
    { tileX: 2, tileY: 10 }, { tileX: 5, tileY: 10 }, { tileX: 8, tileY: 10 },
    { tileX: 11, tileY: 10 }, { tileX: 14, tileY: 10 },
    { tileX: 19, tileY: 10 }, { tileX: 22, tileY: 10 }, { tileX: 25, tileY: 10 },
    { tileX: 29, tileY: 10 }, { tileX: 32, tileY: 10 }, { tileX: 35, tileY: 10 },
    { tileX: 39, tileY: 10 }, { tileX: 42, tileY: 10 }, { tileX: 45, tileY: 10 },
    { tileX: 48, tileY: 10 }, { tileX: 51, tileY: 10 },
    { tileX: 55, tileY: 10 }, { tileX: 58, tileY: 10 }, { tileX: 61, tileY: 10 },
    { tileX: 65, tileY: 10 }, { tileX: 67, tileY: 10 }, { tileX: 69, tileY: 10 }, { tileX: 71, tileY: 10 },
    { tileX: 75, tileY: 10 }, { tileX: 77, tileY: 10 },
  ],
```

- [ ] **Step 6: Replace entire decorations array**

Remove all old `airport-window` decorations (replaced by tarmac system). Remove all filler-zone decorations (benches at y>=27, plants at y>=38). Remap all remaining decorations.

Complete new decorations array:

```typescript
  decorations: [
    // ═══ ZONE 1: CHECK-IN HALL (x:1-16) ═══
    // Check-in counters (1 row only — no space for 2nd row)
    { tileX: 4, tileY: 13, type: 'airport-counter' },
    { tileX: 8, tileY: 13, type: 'airport-counter' },
    { tileX: 12, tileY: 13, type: 'airport-counter' },
    // Luggage belt
    { tileX: 12, tileY: 14, type: 'airport-luggage-belt' },
    // Rope barriers
    { tileX: 3, tileY: 12, type: 'airport-rope-barrier' },
    { tileX: 7, tileY: 12, type: 'airport-rope-barrier' },
    { tileX: 11, tileY: 12, type: 'airport-rope-barrier' },
    { tileX: 15, tileY: 12, type: 'airport-rope-barrier' },
    { tileX: 3, tileY: 18, type: 'airport-rope-barrier' },
    { tileX: 7, tileY: 18, type: 'airport-rope-barrier' },
    { tileX: 11, tileY: 18, type: 'airport-rope-barrier' },
    // Departures board (mounted on wall)
    { tileX: 9, tileY: 11, type: 'airport-departures-board' },
    // Luggage carts
    { tileX: 1, tileY: 19, type: 'airport-luggage-cart' },
    { tileX: 16, tileY: 19, type: 'airport-luggage-cart' },
    // Plants
    { tileX: 1, tileY: 11, type: 'airport-plant' },
    { tileX: 16, tileY: 11, type: 'airport-plant' },
    { tileX: 1, tileY: 20, type: 'airport-plant' },
    { tileX: 16, tileY: 20, type: 'airport-plant' },

    // ═══ ZONE 2: PASSPORT CONTROL (x:18-26) ═══
    // Passport desks
    { tileX: 20, tileY: 16, type: 'airport-passport-desk' },
    { tileX: 22, tileY: 16, type: 'airport-passport-desk' },
    { tileX: 24, tileY: 16, type: 'airport-passport-desk' },
    // Rope barriers
    { tileX: 19, tileY: 14, type: 'airport-rope-barrier' },
    { tileX: 21, tileY: 14, type: 'airport-rope-barrier' },
    { tileX: 23, tileY: 14, type: 'airport-rope-barrier' },
    { tileX: 25, tileY: 14, type: 'airport-rope-barrier' },
    { tileX: 19, tileY: 18, type: 'airport-rope-barrier' },
    { tileX: 25, tileY: 18, type: 'airport-rope-barrier' },
    // Plants
    { tileX: 18, tileY: 11, type: 'airport-plant' },
    { tileX: 26, tileY: 11, type: 'airport-plant' },

    // ═══ ZONE 3: SECURITY SCREENING (x:28-36) ═══
    // Metal detectors
    { tileX: 30, tileY: 16, type: 'airport-metal-detector' },
    { tileX: 34, tileY: 16, type: 'airport-metal-detector' },
    // Conveyor belts
    { tileX: 31, tileY: 15, type: 'airport-conveyor-belt' },
    { tileX: 35, tileY: 15, type: 'airport-conveyor-belt' },
    // Bins
    { tileX: 29, tileY: 15, type: 'airport-bin' },
    { tileX: 33, tileY: 15, type: 'airport-bin' },
    // Rope barriers
    { tileX: 29, tileY: 13, type: 'airport-rope-barrier' },
    { tileX: 31, tileY: 13, type: 'airport-rope-barrier' },
    { tileX: 33, tileY: 13, type: 'airport-rope-barrier' },
    { tileX: 35, tileY: 13, type: 'airport-rope-barrier' },
    // Plants
    { tileX: 28, tileY: 11, type: 'airport-plant' },
    { tileX: 36, tileY: 11, type: 'airport-plant' },

    // ═══ ZONE 4: DUTY FREE SHOPPING (x:38-52) ═══
    // Shop counters
    { tileX: 40, tileY: 12, type: 'airport-duty-free-counter' },
    { tileX: 44, tileY: 12, type: 'airport-duty-free-counter' },
    { tileX: 48, tileY: 12, type: 'airport-duty-free-counter' },
    // Display shelves
    { tileX: 40, tileY: 14, type: 'airport-duty-free-shelf' },
    { tileX: 44, tileY: 14, type: 'airport-duty-free-shelf' },
    { tileX: 48, tileY: 14, type: 'airport-duty-free-shelf' },
    { tileX: 40, tileY: 18, type: 'airport-duty-free-shelf' },
    { tileX: 44, tileY: 18, type: 'airport-duty-free-shelf' },
    { tileX: 48, tileY: 18, type: 'airport-duty-free-shelf' },
    // Perfume display
    { tileX: 42, tileY: 16, type: 'airport-perfume-display' },
    // Liquor display
    { tileX: 46, tileY: 16, type: 'airport-liquor-display' },
    // Cash registers
    { tileX: 41, tileY: 12, type: 'airport-cash-register' },
    { tileX: 45, tileY: 12, type: 'airport-cash-register' },
    { tileX: 49, tileY: 12, type: 'airport-cash-register' },
    // Plants
    { tileX: 38, tileY: 11, type: 'airport-plant' },
    { tileX: 52, tileY: 11, type: 'airport-plant' },
    { tileX: 38, tileY: 20, type: 'airport-plant' },
    { tileX: 52, tileY: 20, type: 'airport-plant' },

    // ═══ ZONE 5: FOOD COURT (x:54-62) ═══
    // Cafe counters
    { tileX: 56, tileY: 12, type: 'airport-cafe-counter' },
    { tileX: 60, tileY: 12, type: 'airport-cafe-counter' },
    // Cafe menus
    { tileX: 55, tileY: 12, type: 'airport-cafe-menu' },
    { tileX: 59, tileY: 12, type: 'airport-cafe-menu' },
    // Stools at counters
    { tileX: 56, tileY: 13, type: 'airport-stool' },
    { tileX: 57, tileY: 13, type: 'airport-stool' },
    { tileX: 60, tileY: 13, type: 'airport-stool' },
    { tileX: 61, tileY: 13, type: 'airport-stool' },
    // Food court tables
    { tileX: 56, tileY: 15, type: 'airport-food-court-table' },
    { tileX: 60, tileY: 15, type: 'airport-food-court-table' },
    { tileX: 56, tileY: 18, type: 'airport-food-court-table' },
    { tileX: 60, tileY: 18, type: 'airport-food-court-table' },
    // Stools at tables
    { tileX: 55, tileY: 15, type: 'airport-stool' },
    { tileX: 57, tileY: 15, type: 'airport-stool' },
    { tileX: 59, tileY: 15, type: 'airport-stool' },
    { tileX: 61, tileY: 15, type: 'airport-stool' },
    // Plants
    { tileX: 54, tileY: 11, type: 'airport-plant' },
    { tileX: 62, tileY: 11, type: 'airport-plant' },

    // ═══ ZONE 6: TERMINAL CORRIDOR (x:64-72) ═══
    // Moving walkway segments
    { tileX: 66, tileY: 16, type: 'airport-moving-walkway' },
    { tileX: 67, tileY: 16, type: 'airport-moving-walkway' },
    { tileX: 68, tileY: 16, type: 'airport-moving-walkway' },
    { tileX: 69, tileY: 16, type: 'airport-moving-walkway' },
    { tileX: 70, tileY: 16, type: 'airport-moving-walkway' },
    // Departures boards (mounted on wall)
    { tileX: 68, tileY: 11, type: 'airport-departures-board' },
    { tileX: 64, tileY: 11, type: 'airport-departures-board' },
    // Gate desks
    { tileX: 68, tileY: 12, type: 'airport-gate-desk' },
    { tileX: 64, tileY: 12, type: 'airport-gate-desk' },
    // Benches near gates
    { tileX: 67, tileY: 14, type: 'airport-bench' },
    { tileX: 69, tileY: 14, type: 'airport-bench' },
    { tileX: 64, tileY: 14, type: 'airport-bench' },
    { tileX: 66, tileY: 14, type: 'airport-bench' },
    // More benches
    { tileX: 65, tileY: 13, type: 'airport-bench' },
    { tileX: 69, tileY: 13, type: 'airport-bench' },
    // Plants
    { tileX: 64, tileY: 11, type: 'airport-plant' },
    { tileX: 72, tileY: 11, type: 'airport-plant' },
    { tileX: 64, tileY: 20, type: 'airport-plant' },
    { tileX: 72, tileY: 20, type: 'airport-plant' },

    // ═══ ZONE 7: GATE AREA (x:74-78) ═══
    // Gate desk
    { tileX: 76, tileY: 12, type: 'airport-gate-desk' },
    // Departures board (mounted on wall)
    { tileX: 76, tileY: 11, type: 'airport-departures-board' },
    // Benches (consolidated — 2 rows instead of 3)
    { tileX: 75, tileY: 16, type: 'airport-bench' },
    { tileX: 77, tileY: 16, type: 'airport-bench' },
    { tileX: 75, tileY: 18, type: 'airport-bench' },
    { tileX: 77, tileY: 18, type: 'airport-bench' },
    // Plants
    { tileX: 74, tileY: 11, type: 'airport-plant' },
    { tileX: 78, tileY: 11, type: 'airport-plant' },
  ],
```

- [ ] **Step 7: Update entrance, exit, and cameraZoom**

```typescript
  entrance: { tileX: 9, tileY: 20 },
  exit: { tileX: 8, tileY: 20, width: 3, height: 2, promptText: 'Exit Airport' },
  exitDoorStyle: 'glass',
  cameraZoom: 1.75,
};
```

- [ ] **Step 8: Verify the layout compiles**

Run: `npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 9: Commit**

```bash
git add src/game/scenes/airport/airportLayouts.ts
git commit -m "feat: shrink airport layout from 80x40 to 80x22 with tarmac zone"
```

---

## Task 3: Update AirportInteriorScene — doorway blocking, NPC positions, signs

**Files:**
- Modify: `src/game/scenes/airport/AirportInteriorScene.ts`

- [ ] **Step 1: Update doorway blocking Y range**

In `create()`, change `for (let y = 16; y <= 20; y++)` to `for (let y = 14; y <= 18; y++)`.

Also update the barrier center position from `tileToWorld(pos.x, 18)` to `tileToWorld(pos.x, 16)`.

- [ ] **Step 2: Update `unlockDoorway` Y range**

In `unlockDoorway()`, change `for (let y = 16; y <= 20; y++)` to `for (let y = 14; y <= 18; y++)`.

- [ ] **Step 3: Update STATION_NPC_DEFS positions**

```typescript
const STATION_NPC_DEFS = [
  { texture: 'npc-ticket-agent', tileX: 4, tileY: 13 },       // Counter 1
  { texture: 'npc-ticket-agent', tileX: 8, tileY: 13 },       // Counter 2
  { texture: 'npc-ticket-agent', tileX: 12, tileY: 13 },      // Counter 3
  // Counter 4 (was at y:22) — REMOVED, no space
  { texture: 'npc-passport-officer', tileX: 22, tileY: 16 },  // Passport (active)
  { texture: 'npc-passport-officer', tileX: 20, tileY: 16 },  // Passport (decorative)
  { texture: 'npc-passport-officer', tileX: 24, tileY: 16 },  // Passport (decorative)
  { texture: 'npc-security-guard', tileX: 30, tileY: 16 },    // Security lane 1
  { texture: 'npc-security-guard', tileX: 34, tileY: 16 },    // Security lane 2
  { texture: 'npc-gate-agent', tileX: 76, tileY: 12 },        // Boarding gate
  { texture: 'npc-gate-agent', tileX: 68, tileY: 12 },        // Gate 2
  { texture: 'npc-gate-agent', tileX: 64, tileY: 12 },        // Gate 3
];
```

- [ ] **Step 4: Update DIALOG_NPCS — remap positions, remove filler NPCs**

```typescript
const DIALOG_NPCS: NPCDef[] = [
  // Zone 1: walking passenger (remap walk path)
  { id: 'walking-pax-1', tileX: 10, tileY: 19, behavior: 'walk', texture: 'npc-traveler',
    walkPath: [{ x: 10, y: 19 }, { x: 10, y: 12 }] },
  // Zone 4: Duty Free
  { id: 'duty-free-clerk', tileX: 45, tileY: 12, behavior: 'idle',
    texture: 'npc-duty-free-clerk', interactable: true, onInteract: 'dialog',
    interactionData: { lines: [
      'Welcome to Ben Gurion Duty Free!',
      'We have the finest perfumes, chocolates, and Dead Sea cosmetics.',
      'Take your time browsing!',
    ] } },
  { id: 'shopping-pax-1', tileX: 42, tileY: 17, behavior: 'idle', texture: 'npc-traveler' },
  // Zone 5: Food Court
  { id: 'food-chef', tileX: 56, tileY: 12, behavior: 'idle',
    texture: 'npc-cafe-worker', interactable: true, onInteract: 'dialog',
    interactionData: { lines: [
      'Welcome to Terminal Cafe!',
      'Try our shakshuka or grab a coffee for the gate.',
    ] } },
  { id: 'eating-pax-1', tileX: 56, tileY: 15, behavior: 'sit', texture: 'npc-traveler' },
  // Zone 6: Terminal
  { id: 'walking-pax-2', tileX: 65, tileY: 18, behavior: 'walk', texture: 'npc-traveler-2',
    walkPath: [{ x: 65, y: 18 }, { x: 72, y: 18 }] },
  // More passengers
  { id: 'standing-pax-1', tileX: 10, tileY: 16, behavior: 'idle', texture: 'npc-traveler-2' },
  // Passport zone
  { id: 'passport-waiter-1', tileX: 21, tileY: 18, behavior: 'idle', texture: 'npc-traveler' },
  // Security zone
  { id: 'security-queue-1', tileX: 31, tileY: 18, behavior: 'idle', texture: 'npc-traveler' },
  { id: 'security-queue-2', tileX: 33, tileY: 18, behavior: 'idle', texture: 'npc-traveler-2' },
  // Terminal corridor walker
  { id: 'corridor-walker-1', tileX: 66, tileY: 15, behavior: 'walk', texture: 'npc-traveler',
    walkPath: [{ x: 66, y: 15 }, { x: 72, y: 15 }] },
  // Gate area
  { id: 'gate-pax-1', tileX: 75, tileY: 18, behavior: 'sit', texture: 'npc-traveler' },
  { id: 'gate-pax-3', tileX: 75, tileY: 16, behavior: 'sit', texture: 'npc-traveler' },
  { id: 'gate-pax-4', tileX: 77, tileY: 18, behavior: 'sit', texture: 'npc-traveler-2' },
  // Coming soon gate passengers
  { id: 'gate2-pax-1', tileX: 67, tileY: 14, behavior: 'sit', texture: 'npc-traveler' },
  { id: 'gate3-pax-1', tileX: 65, tileY: 14, behavior: 'sit', texture: 'npc-traveler-2' },
];
```

**Removed NPCs** (were in filler zone): sitting-pax-1 (y:30), sitting-pax-2 (y:33), sitting-pax-3 (y:36), shopping-pax-2 (y:25), eating-pax-2 (y:23), passport-waiter-2 (y:26), gate-pax-2 (y:26).

- [ ] **Step 5: Update INTERIOR_SIGNS positions**

All signs move to y=11 (top of gameplay area, mounted on wall):

```typescript
const INTERIOR_SIGNS: SignDef[] = [
  { id: 'sign-departures', tileX: 9, tileY: 11, texture: 'sign-departures', tooltipText: 'Departures' },
  { id: 'sign-passport', tileX: 22, tileY: 11, texture: 'sign-passport', tooltipText: 'Passport Control' },
  { id: 'sign-security', tileX: 32, tileY: 11, texture: 'sign-security', tooltipText: 'Security Screening' },
  { id: 'sign-duty-free', tileX: 45, tileY: 11, texture: 'sign-duty-free', tooltipText: 'Duty Free' },
  { id: 'sign-food-court', tileX: 58, tileY: 11, texture: 'sign-food-court', tooltipText: 'Food Court' },
  { id: 'sign-gates', tileX: 66, tileY: 11, texture: 'sign-gates', tooltipText: 'Gates →' },
  { id: 'sign-gate-maui', tileX: 76, tileY: 11, texture: 'sign-gate-number', tooltipText: 'Gate 1 — Maui' },
  { id: 'sign-gate-2', tileX: 68, tileY: 11, texture: 'sign-gate-number', tooltipText: 'Gate 2 — Coming Soon' },
  { id: 'sign-gate-3', tileX: 64, tileY: 11, texture: 'sign-gate-number', tooltipText: 'Gate 3 — Coming Soon' },
];
```

- [ ] **Step 6: Verify compilation**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 7: Commit**

```bash
git add src/game/scenes/airport/AirportInteriorScene.ts
git commit -m "feat: update airport NPCs, doorways, and signs for 22-tile layout"
```

---

## Task 4: Update CheckinStations trigger coordinates

**Files:**
- Modify: `src/game/scenes/airport/CheckinStations.ts`

- [ ] **Step 1: Update STATIONS trigger positions**

```typescript
export const STATIONS: StationDef[] = [
  { id: 'ticket-counter',     triggerTileX: 4,  triggerTileY: 14 },  // Agent at (4,13)
  { id: 'luggage-checkin',    triggerTileX: 13, triggerTileY: 14 },  // Agent at (12,13), right of belt
  { id: 'passport-control',   triggerTileX: 22, triggerTileY: 17 },  // Agent at (22,16)
  { id: 'security-screening', triggerTileX: 30, triggerTileY: 17 },  // Agent at (30,16)
  { id: 'boarding-gate',      triggerTileX: 76, triggerTileY: 13 },  // Agent at (76,12)
];
```

- [ ] **Step 2: Update focusCamera calls in station sequences**

In `playTicketCounter`: change `focusCamera(scene, 4, 15)` to `focusCamera(scene, 4, 13)`.
Also update `tileToWorld(4, 15)` to `tileToWorld(4, 13)` for the counter position.

In `playLuggageCheckin`: change `focusCamera(scene, 12, 15)` to `focusCamera(scene, 12, 13)`.
Update `tileToWorld(12, 16)` to `tileToWorld(12, 14)` for the belt position.

In `playPassportControl`: change `focusCamera(scene, 22, 18)` to `focusCamera(scene, 22, 16)`.
Update `tileToWorld(22, 18)` to `tileToWorld(22, 16)` for the desk position.

In `playSecurityScreening`: change `focusCamera(scene, 30, 18, 0.2)` to `focusCamera(scene, 30, 16, 0.2)`.
Update `tileToWorld(31, 17)` to `tileToWorld(31, 15)` for conveyor position.
Update `tileToWorld(30, 18)` to `tileToWorld(30, 16)` for detector position.

In `playBoardingGate`: change `focusCamera(scene, 76, 10)` to `focusCamera(scene, 76, 12)`.
Update `tileToWorld(76, 10)` to `tileToWorld(76, 12)` for the gate desk position.

- [ ] **Step 3: Verify compilation**

Run: `npx tsc --noEmit`

- [ ] **Step 4: Commit**

```bash
git add src/game/scenes/airport/CheckinStations.ts
git commit -m "feat: update station triggers and camera targets for 22-tile airport"
```

---

## Task 5: Generate tarmac textures

**Files:**
- Modify: `src/game/rendering/AirportTextures.ts`

- [ ] **Step 1: Add `generateTarmacTextures` function**

Add this function before `generateAirportTextures` at the bottom. Uses the same `px()`, `rect()`, `darken()`, `lighten()` helpers already available in the file.

```typescript
function generateTarmacTextures(scene: Phaser.Scene): void {
  // ── Tall window frame (32×320) — transparent panes, opaque mullions ──
  {
    const c = scene.textures.createCanvas('interior-airport-window-tall', 32, 320);
    if (!c) return;
    const ctx = c.context;
    // Frame border
    rect(ctx, 0, 0, 32, 320, '#777777');   // outer frame
    rect(ctx, 2, 2, 28, 316, '#999999');    // inner frame

    // Cut transparent glass panes (5 panes, each ~60px tall)
    for (let i = 0; i < 5; i++) {
      const paneY = 4 + i * 64;
      // Clear to transparent for glass areas
      ctx.clearRect(4, paneY, 11, 58);      // left pane
      ctx.clearRect(17, paneY, 11, 58);     // right pane
      // Subtle highlight on upper-left of each pane
      ctx.fillStyle = 'rgba(170,221,255,0.15)';
      ctx.fillRect(4, paneY, 11, 8);
      ctx.fillRect(17, paneY, 11, 4);
    }
    c.refresh();
  }

  // ── Luggage cart (48×20) — yellow tug + trailing carts ──
  {
    const c = scene.textures.createCanvas('tarmac-luggage-cart', 48, 20);
    if (!c) return;
    const ctx = c.context;
    // Tug body
    rect(ctx, 0, 4, 14, 12, '#DDBB22');    // yellow body
    rect(ctx, 1, 2, 10, 3, '#CCAA11');      // cab roof
    rect(ctx, 10, 8, 4, 4, '#333333');       // engine
    // Wheels
    rect(ctx, 2, 16, 4, 3, '#222222');
    rect(ctx, 8, 16, 4, 3, '#222222');
    // Cart 1
    rect(ctx, 16, 6, 12, 10, '#888888');    // flatbed
    rect(ctx, 18, 2, 3, 5, '#CC4444');       // red suitcase
    rect(ctx, 22, 3, 4, 4, '#4444CC');       // blue suitcase
    rect(ctx, 20, 16, 4, 3, '#222222');      // wheels
    // Cart 2
    rect(ctx, 30, 6, 12, 10, '#888888');
    rect(ctx, 32, 2, 4, 5, '#44AA44');       // green suitcase
    rect(ctx, 37, 3, 3, 4, '#AA44AA');       // purple suitcase
    rect(ctx, 34, 16, 4, 3, '#222222');      // wheels
    // Hitch connectors
    rect(ctx, 14, 10, 2, 2, '#555555');
    rect(ctx, 28, 10, 2, 2, '#555555');
    c.refresh();
  }

  // ── Fuel truck (56×24) ──
  {
    const c = scene.textures.createCanvas('tarmac-fuel-truck', 56, 24);
    if (!c) return;
    const ctx = c.context;
    // Cab
    rect(ctx, 0, 4, 16, 14, '#EEEEEE');     // white cab
    rect(ctx, 1, 2, 12, 4, '#DDDDDD');       // roof
    rect(ctx, 2, 6, 6, 4, '#88BBDD');        // windshield
    // Tank body (cylindrical look)
    rect(ctx, 18, 2, 34, 16, '#CCCCCC');     // silver tank
    rect(ctx, 19, 4, 32, 12, '#BBBBBB');     // slightly darker center
    rect(ctx, 20, 3, 30, 2, lighten('#CCCCCC', 0.3));  // highlight
    // "FUEL" text
    rect(ctx, 28, 8, 2, 4, '#333333');  // F
    rect(ctx, 28, 8, 4, 1, '#333333');
    rect(ctx, 28, 10, 3, 1, '#333333');
    rect(ctx, 33, 8, 2, 5, '#333333');  // U
    rect(ctx, 33, 12, 4, 1, '#333333');
    rect(ctx, 36, 8, 2, 5, '#333333');
    rect(ctx, 39, 8, 2, 5, '#333333');  // E
    rect(ctx, 39, 8, 4, 1, '#333333');
    rect(ctx, 39, 10, 3, 1, '#333333');
    rect(ctx, 39, 12, 4, 1, '#333333');
    rect(ctx, 44, 8, 2, 5, '#333333');  // L
    rect(ctx, 44, 12, 4, 1, '#333333');
    // Wheels
    rect(ctx, 4, 18, 6, 4, '#222222');
    rect(ctx, 22, 18, 6, 4, '#222222');
    rect(ctx, 40, 18, 6, 4, '#222222');
    c.refresh();
  }

  // ── Tarmac worker (20×28) ──
  {
    const c = scene.textures.createCanvas('tarmac-worker', 20, 28);
    if (!c) return;
    const ctx = c.context;
    // Hard hat
    rect(ctx, 6, 0, 8, 4, '#FFDD00');
    rect(ctx, 5, 3, 10, 2, '#FFDD00');
    // Head
    rect(ctx, 7, 5, 6, 5, '#D4A76A');
    // Orange vest body
    rect(ctx, 5, 10, 10, 8, '#FF6600');
    // Reflective stripes
    rect(ctx, 5, 12, 10, 1, '#FFFF88');
    rect(ctx, 5, 15, 10, 1, '#FFFF88');
    // Arms
    rect(ctx, 2, 11, 3, 6, '#FF6600');
    rect(ctx, 15, 11, 3, 6, '#FF6600');
    // Hands
    rect(ctx, 2, 17, 3, 2, '#D4A76A');
    rect(ctx, 15, 17, 3, 2, '#D4A76A');
    // Dark pants
    rect(ctx, 6, 18, 4, 6, '#333355');
    rect(ctx, 11, 18, 4, 6, '#333355');
    // Boots
    rect(ctx, 5, 24, 5, 3, '#222222');
    rect(ctx, 10, 24, 5, 3, '#222222');
    c.refresh();
  }

  // ── Ground crew (20×28) — arms extended with wands ──
  {
    const c = scene.textures.createCanvas('tarmac-ground-crew', 20, 28);
    if (!c) return;
    const ctx = c.context;
    // Hard hat
    rect(ctx, 6, 0, 8, 4, '#FFDD00');
    rect(ctx, 5, 3, 10, 2, '#FFDD00');
    // Head
    rect(ctx, 7, 5, 6, 5, '#D4A76A');
    // Orange vest body
    rect(ctx, 5, 10, 10, 8, '#FF6600');
    // Reflective stripes
    rect(ctx, 5, 12, 10, 1, '#FFFF88');
    rect(ctx, 5, 15, 10, 1, '#FFFF88');
    // Extended arms (wider spread)
    rect(ctx, 0, 11, 5, 3, '#FF6600');
    rect(ctx, 15, 11, 5, 3, '#FF6600');
    // Hands holding wands
    rect(ctx, 0, 14, 2, 2, '#D4A76A');
    rect(ctx, 18, 14, 2, 2, '#D4A76A');
    // Dark pants
    rect(ctx, 6, 18, 4, 6, '#333355');
    rect(ctx, 11, 18, 4, 6, '#333355');
    // Boots
    rect(ctx, 5, 24, 5, 3, '#222222');
    rect(ctx, 10, 24, 5, 3, '#222222');
    c.refresh();
  }

  // ── Wand (10×3) — orange glow stick ──
  {
    const c = scene.textures.createCanvas('tarmac-wand', 10, 3);
    if (!c) return;
    const ctx = c.context;
    rect(ctx, 0, 0, 10, 3, '#FF4400');
    rect(ctx, 1, 1, 8, 1, '#FF8800');  // bright center
    c.refresh();
  }

  // ── Runway light (6×6) ──
  {
    const c = scene.textures.createCanvas('tarmac-runway-light', 6, 6);
    if (!c) return;
    const ctx = c.context;
    // Glow
    ctx.fillStyle = 'rgba(255,255,200,0.4)';
    ctx.fillRect(0, 0, 6, 6);
    // Core
    rect(ctx, 1, 1, 4, 4, '#FFFFAA');
    rect(ctx, 2, 2, 2, 2, '#FFFFFF');
    c.refresh();
  }

  // ── Control tower (24×48) ──
  {
    const c = scene.textures.createCanvas('tarmac-control-tower', 24, 48);
    if (!c) return;
    const ctx = c.context;
    // Tower shaft
    rect(ctx, 8, 16, 8, 32, '#888888');
    rect(ctx, 9, 16, 6, 32, '#999999');
    // Observation deck (wider top)
    rect(ctx, 2, 8, 20, 10, '#777777');
    rect(ctx, 3, 9, 18, 8, '#888888');
    // Windows on observation deck
    for (let x = 4; x < 20; x += 3) {
      rect(ctx, x, 10, 2, 5, '#88CCEE');
    }
    // Roof
    rect(ctx, 4, 4, 16, 5, '#666666');
    rect(ctx, 6, 2, 12, 3, '#555555');
    // Antenna
    rect(ctx, 11, 0, 2, 3, '#444444');
    // Base
    rect(ctx, 4, 44, 16, 4, '#777777');
    c.refresh();
  }

  // ── Windsock (16×20) ──
  {
    const c = scene.textures.createCanvas('tarmac-windsock', 16, 20);
    if (!c) return;
    const ctx = c.context;
    // Pole
    rect(ctx, 2, 6, 2, 14, '#888888');
    // Crossbar
    rect(ctx, 2, 6, 6, 2, '#888888');
    // Sock (orange/white stripes)
    rect(ctx, 6, 4, 8, 6, '#FF6600');
    rect(ctx, 8, 4, 2, 6, '#FFFFFF');
    rect(ctx, 12, 4, 2, 6, '#FFFFFF');
    // Tapered end
    rect(ctx, 14, 5, 2, 4, '#FF6600');
    c.refresh();
  }

  // ── Blink light (6×6) — red anti-collision light ──
  {
    const c = scene.textures.createCanvas('tarmac-blink-light', 6, 6);
    if (!c) return;
    const ctx = c.context;
    ctx.fillStyle = 'rgba(255,0,0,0.3)';
    ctx.fillRect(0, 0, 6, 6);
    rect(ctx, 1, 1, 4, 4, '#FF2222');
    rect(ctx, 2, 2, 2, 2, '#FF6666');
    c.refresh();
  }
}
```

- [ ] **Step 2: Register the new function in `generateAirportTextures`**

Add `generateTarmacTextures(scene);` at the end of `generateAirportTextures()`.

- [ ] **Step 3: Verify compilation**

Run: `npx tsc --noEmit`

- [ ] **Step 4: Commit**

```bash
git add src/game/rendering/AirportTextures.ts
git commit -m "feat: add tarmac texture generation (window frames, vehicles, workers, lights)"
```

---

## Task 6: Create tarmac RenderTexture and animated sprites

This is the main visual feature — the animated tarmac background behind the windows.

**Files:**
- Modify: `src/game/scenes/airport/AirportInteriorScene.ts`

- [ ] **Step 1: Add class properties for tarmac system**

Add after the existing class properties (after `barrierSprites`):

```typescript
  // Tarmac background
  private tarmacRT: Phaser.GameObjects.RenderTexture | null = null;
  private tarmacSprites: Phaser.GameObjects.GameObject[] = [];
  private tarmacTweens: Phaser.Tweens.Tween[] = [];
  private windowFrames: Phaser.GameObjects.Image[] = [];
  private glassTints: Phaser.GameObjects.Rectangle[] = [];
  private takeoffTimer: Phaser.Time.TimerEvent | null = null;
```

- [ ] **Step 2: Add `createTarmacBackground` method**

Add this method to the class. It draws the static tarmac RenderTexture:

```typescript
  private createTarmacBackground(): void {
    const TILE = TILE_SIZE;
    const tarmacW = this.layout.widthInTiles * TILE;  // 2560
    const tarmacH = 10 * TILE;                         // 320 (rows 0-9)

    // Static tarmac background
    this.tarmacRT = this.add.renderTexture(0, 0, tarmacW, tarmacH);
    this.tarmacRT.setOrigin(0, 0);
    this.tarmacRT.setDepth(-49);

    // Draw sky gradient (top 40%)
    const skyH = Math.floor(tarmacH * 0.4);
    for (let y = 0; y < skyH; y++) {
      const t = y / skyH;
      const r = Math.round(135 + t * 40);
      const g = Math.round(206 + t * 18);
      const b = Math.round(235 + t * 10);
      const color = (r << 16) | (g << 8) | b;
      const line = this.add.rectangle(tarmacW / 2, y + 0.5, tarmacW, 1, color).setOrigin(0.5, 0.5);
      this.tarmacRT.draw(line);
      line.destroy();
    }

    // Draw tarmac surface (bottom 60%)
    const tarmacRect = this.add.rectangle(tarmacW / 2, skyH + (tarmacH - skyH) / 2, tarmacW, tarmacH - skyH, 0x555555).setOrigin(0.5, 0.5);
    this.tarmacRT.draw(tarmacRect);
    tarmacRect.destroy();

    // Grass strip at horizon
    const grassRect = this.add.rectangle(tarmacW / 2, skyH + 4, tarmacW, 12, 0x2D5016).setOrigin(0.5, 0.5);
    this.tarmacRT.draw(grassRect);
    grassRect.destroy();

    // Runway center line (white dashes)
    for (let x = 0; x < tarmacW; x += 40) {
      const dash = this.add.rectangle(x + 10, skyH + 72, 20, 3, 0xFFFFFF).setOrigin(0, 0.5);
      this.tarmacRT.draw(dash);
      dash.destroy();
    }

    // Taxiway lines (yellow)
    const taxiLine1 = this.add.rectangle(tarmacW / 2, skyH + 40, tarmacW, 2, 0xFFD700).setOrigin(0.5, 0.5);
    this.tarmacRT.draw(taxiLine1);
    taxiLine1.destroy();
    const taxiLine2 = this.add.rectangle(tarmacW / 2, skyH + 110, tarmacW, 2, 0xFFD700).setOrigin(0.5, 0.5);
    this.tarmacRT.draw(taxiLine2);
    taxiLine2.destroy();
  }
```

- [ ] **Step 3: Add `createTarmacAnimations` method**

This creates all the animated sprites and their tweens:

```typescript
  private createTarmacAnimations(): void {
    const addSprite = (x: number, y: number, texture: string, depth: number, scaleX = 1, scaleY = 1) => {
      const s = this.add.image(x, y, texture).setDepth(depth).setScale(scaleX, scaleY);
      this.tarmacSprites.push(s);
      return s;
    };
    const addTween = (config: Phaser.Types.Tweens.TweenBuilderConfig) => {
      const t = this.tweens.add(config);
      this.tarmacTweens.push(t);
      return t;
    };

    // ── A. Taxiing planes ──
    const taxi1 = addSprite(-140, 180, 'airplane-exterior', -48);
    taxi1.setFlipX(true);
    addTween({ targets: taxi1, x: 2700, duration: 30000, ease: 'Linear', repeat: -1, repeatDelay: 8000 });

    const taxi2 = addSprite(2700, 220, 'airplane-exterior', -48);
    addTween({ targets: taxi2, x: -140, duration: 35000, ease: 'Linear', repeat: -1, repeatDelay: 15000 });

    // ── B. Parked plane at gate ──
    const parked = addSprite(2350, 160, 'airplane-exterior', -48, 1.5, 1.5);
    // Anti-collision beacon
    const beacon = addSprite(2380, 145, 'tarmac-blink-light', -48);
    addTween({ targets: beacon, alpha: 0, duration: 600, yoyo: true, repeat: -1 });
    // Wingtip lights
    const leftTip = addSprite(2330, 170, 'tarmac-blink-light', -48);
    leftTip.setTint(0xFF0000);
    addTween({ targets: leftTip, alpha: 0, duration: 1000, yoyo: true, repeat: -1 });
    const rightTip = addSprite(2430, 170, 'tarmac-blink-light', -48);
    rightTip.setTint(0x00FF00);
    addTween({ targets: rightTip, alpha: 0, duration: 1000, yoyo: true, repeat: -1, delay: 500 });

    // ── C. Takeoff sequence (every 60s) ──
    this.takeoffTimer = this.time.addEvent({
      delay: 60000,
      loop: true,
      callback: () => {
        const plane = this.add.image(2600, 200, 'airplane-exterior', 0).setDepth(-48).setScale(1.2);
        this.tweens.add({
          targets: plane, x: 600, duration: 3500, ease: 'Quad.easeIn',
          onComplete: () => {
            this.tweens.add({
              targets: plane, y: 40, scaleX: 0.5, scaleY: 0.5, alpha: 0,
              duration: 2000, ease: 'Sine.easeIn',
              onComplete: () => plane.destroy(),
            });
          },
        });
      },
    });

    // ── D. Luggage cart train ──
    const cart = addSprite(-60, 250, 'tarmac-luggage-cart', -47);
    addTween({ targets: cart, x: 2700, duration: 40000, ease: 'Linear', repeat: -1, repeatDelay: 5000 });

    // ── E. Fuel truck ──
    const fuel = addSprite(800, 260, 'tarmac-fuel-truck', -47);
    addTween({ targets: fuel, x: 2300, duration: 15000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', repeatDelay: 8000 });

    // ── F. Airport workers ──
    const worker1 = addSprite(500, 270, 'tarmac-worker', -47);
    addTween({ targets: worker1, x: 900, duration: 8000, yoyo: true, repeat: -1, ease: 'Linear' });
    const worker2 = addSprite(1600, 280, 'tarmac-worker', -47);
    addTween({ targets: worker2, x: 2000, duration: 10000, yoyo: true, repeat: -1, ease: 'Linear', delay: 3000 });

    // ── G. Ground crew with wands ──
    addSprite(2300, 190, 'tarmac-ground-crew', -47);
    addSprite(2320, 200, 'tarmac-ground-crew', -47);
    const wand1 = addSprite(2294, 190, 'tarmac-wand', -47);
    addTween({ targets: wand1, rotation: 0.5, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    wand1.rotation = -0.5;
    const wand2 = addSprite(2314, 200, 'tarmac-wand', -47);
    addTween({ targets: wand2, rotation: -0.5, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: 400 });
    wand2.rotation = 0.5;

    // ── H. Runway lights ──
    const lightXPositions = [200, 500, 800, 1100, 1400, 1700, 2000, 2300];
    lightXPositions.forEach((lx, i) => {
      const light = addSprite(lx, 200, 'tarmac-runway-light', -47);
      light.setAlpha(0.3);
      addTween({ targets: light, alpha: 1, duration: 800, yoyo: true, repeat: -1, delay: i * 100 });
    });

    // ── I. Distant landing plane ──
    const distant = addSprite(2700, 40, 'airplane-exterior', -48, 0.4, 0.4);
    addTween({ targets: distant, x: -100, y: 80, duration: 45000, ease: 'Linear', repeat: -1, repeatDelay: 20000 });

    // ── J. Control tower (static) ──
    addSprite(100, 60, 'tarmac-control-tower', -48);

    // ── K. Windsock ──
    const sock = addSprite(350, 50, 'tarmac-windsock', -47);
    addTween({ targets: sock, rotation: 0.2, duration: 2500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    sock.rotation = -0.2;
  }
```

- [ ] **Step 4: Add `createWindowFrames` method**

```typescript
  private createWindowFrames(): void {
    const windowXPositions = [2, 5, 8, 11, 14, 19, 22, 25, 29, 32, 35, 39, 42, 45, 48, 51, 55, 58, 61, 65, 67, 69, 71, 75, 77];
    windowXPositions.forEach(tx => {
      // Glass tint (behind frame, in front of tarmac sprites)
      const tint = this.add.rectangle(tx * TILE_SIZE + TILE_SIZE / 2, 160, TILE_SIZE, 320, 0xAADDFF, 0.05)
        .setOrigin(0.5, 0.5).setDepth(-44);
      this.glassTints.push(tint);

      // Window frame (transparent panes show tarmac through)
      const frame = this.add.image(tx * TILE_SIZE, 0, 'interior-airport-window-tall')
        .setOrigin(0, 0).setDepth(-40);
      this.windowFrames.push(frame);
    });
  }
```

- [ ] **Step 5: Wire up tarmac creation in `create()`**

In the `create()` method, add these calls after `this.updateStationIndicator();`:

```typescript
    // ── Tarmac animated background ──
    this.createTarmacBackground();
    this.createTarmacAnimations();
    this.createWindowFrames();
```

- [ ] **Step 6: Add cleanup in `shutdown()`**

Add before the existing `super.shutdown()` call:

```typescript
    // Cleanup tarmac
    this.tarmacTweens.forEach(t => { t.stop(); t.destroy(); });
    this.tarmacTweens = [];
    this.takeoffTimer?.destroy();
    this.takeoffTimer = null;
    this.tarmacSprites.forEach(s => { if (!s.scene) return; (s as Phaser.GameObjects.Image).destroy(); });
    this.tarmacSprites = [];
    this.windowFrames.forEach(f => f.destroy());
    this.windowFrames = [];
    this.glassTints.forEach(t => t.destroy());
    this.glassTints = [];
    this.tarmacRT?.destroy();
    this.tarmacRT = null;
```

- [ ] **Step 7: Verify compilation**

Run: `npx tsc --noEmit`

- [ ] **Step 8: Visual test**

Run: `npm run dev`, navigate to the airport interior.
Expected:
- Airport is noticeably shorter (less vertical space)
- Large animated tarmac visible through window frames at the top
- Planes taxiing, lights blinking, vehicles moving, workers walking
- All 5 stations still work (ticket → luggage → passport → security → boarding)
- Doorways block/unlock correctly
- Player can walk through entire airport and board the plane

- [ ] **Step 9: Commit**

```bash
git add src/game/scenes/airport/AirportInteriorScene.ts
git commit -m "feat: add animated tarmac background with planes, vehicles, and workers"
```

---

## Task 7: Final integration test and polish

- [ ] **Step 1: Full playthrough test**

Run: `npm run dev`. Play through the entire airport flow:
1. Enter airport from town
2. Complete ticket counter station
3. Complete luggage check-in station
4. Walk through unlocked doorway to passport control
5. Complete passport control
6. Walk through to security
7. Complete security screening
8. Walk freely through duty free, food court, terminal
9. Complete boarding gate
10. Verify airplane cutscene starts

Check for:
- No NPCs walking into walls
- No decorations overlapping walkable paths incorrectly
- Doorway barriers appear and disappear correctly
- Signs show tooltips when player is nearby
- Tarmac animations are visible through window panes
- No performance issues

- [ ] **Step 2: Fix any issues found**

Address any visual glitches, collision issues, or coordinate bugs discovered during testing.

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "fix: polish airport tarmac integration and coordinate fixes"
```
