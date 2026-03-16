# Airport Redesign Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the airport — expand exterior footprint on world map with runway/planes/cars/NPCs, replace 3 interior scenes with one big open room with atmosphere zones.

**Architecture:** Expand world map from 40x32 to 40x38 tiles. Add new tile types (Tarmac, RunwayMarking, ParkingLot). Consolidate 3 airport interior scenes into a single 36x20 AirportInteriorScene. Generate new textures procedurally (bigger terminal building, runway airplane, new interior decorations). Migrate save system for old scene keys.

**Tech Stack:** Phaser 3, TypeScript, procedural canvas texture generation, InteriorScene base class

**Design doc:** `docs/plans/2026-03-16-airport-redesign.md`

---

## Chunk 1: Foundation — Constants, Tile Types, Map Expansion

### Task 1: Expand Map Dimensions

**Files:**
- Modify: `src/utils/constants.ts` (line 4)
- Modify: `src/game/data/mapLayout.ts` (lines 4-9, 13-55, 65-73)

- [ ] **Step 1: Update MAP_HEIGHT constant**

In `src/utils/constants.ts`, change line 4:
```typescript
export const MAP_HEIGHT = 38; // was 32
```

Note: `MAP_PX_HEIGHT` is derived from `MAP_HEIGHT * TILE_SIZE` so it updates automatically.

- [ ] **Step 2: Add new tile types to mapLayout.ts**

In `src/game/data/mapLayout.ts`, expand the TileType enum (around line 4-9):
```typescript
export enum TileType {
  Grass = 0,
  Dirt = 1,
  Stone = 2,
  DarkGrass = 3,
  Tarmac = 4,
  RunwayMarking = 5,
  ParkingLot = 6,
}
```

- [ ] **Step 3: Expand tileGrid to 38 rows with airport zone**

In the `tileGrid` generation (around lines 13-34), add airport zone tiles for rows 28-37:

```typescript
// After existing tile assignments, add:
// Access road (row 28)
for (let x = 8; x <= 31; x++) grid[28][x] = TileType.Stone;

// Parking lots
for (let y = 28; y <= 31; y++) {
  for (let x = 8; x <= 13; x++) grid[y][x] = TileType.ParkingLot;  // west lot
  for (let x = 26; x <= 31; x++) grid[y][x] = TileType.ParkingLot; // east lot
}

// Tarmac (rows 32-34: apron + taxiway)
for (let y = 32; y <= 34; y++) {
  for (let x = 5; x <= 34; x++) grid[y][x] = TileType.Tarmac;
}

// Runway (rows 35-37)
for (let y = 35; y <= 37; y++) {
  for (let x = 5; x <= 34; x++) {
    grid[y][x] = (y === 36) ? TileType.RunwayMarking : TileType.Tarmac;
  }
}
```

- [ ] **Step 4: Update walkability grid for airport zone**

Expand the walkGrid generation to 38 rows and block restricted areas:

```typescript
// Terminal building (14-25, 29-31)
for (let y = 29; y <= 31; y++) {
  for (let x = 14; x <= 25; x++) walk[y][x] = false;
}

// Tarmac + runway (rows 32-37) — all blocked
for (let y = 32; y <= 37; y++) {
  for (let x = 5; x <= 34; x++) walk[y][x] = false;
}

// Remove old airport blocking at (32-34, 24-26)
```

- [ ] **Step 5: Update airport checkpoint zone**

Replace the old airport checkpoint with the new position (around line 65-73):

```typescript
{ id: 'airport', centerX: 19 * 32 + 16, centerY: 29 * 32, radius: 56, promptText: 'Enter Airport' },
```

- [ ] **Step 6: Update airport building entry**

In the BUILDINGS array or wherever the airport building is defined in WorldScene.ts, update:
```typescript
{ name: 'airport', tileX: 14, tileY: 29, tileW: 12, tileH: 3 },
```

- [ ] **Step 7: Run type check**

Run: `npx tsc --noEmit`
Expected: zero errors

- [ ] **Step 8: Commit**

```bash
git add src/utils/constants.ts src/game/data/mapLayout.ts
git commit -m "feat: expand world map to 38 rows with airport zone tiles"
```

---

### Task 2: Extend Terrain Spritesheet + Generate New Textures

**Files:**
- Modify: `src/game/rendering/PixelArtGenerator.ts` (lines 151-167, `generateTerrain()`)
- Modify: `src/game/rendering/AirportTextures.ts` (lines 225-298 for building, plus new functions)

- [ ] **Step 1: Extend terrain spritesheet with new tile frames**

The terrain spritesheet lives in `src/game/rendering/PixelArtGenerator.ts`, function `generateTerrain()` at line 151. Currently it creates a 128×32 canvas with 4 frames (Grass, Dirt, Stone, DarkGrass at offsets 0, 32, 64, 96).

**Widen the canvas** from 128 to 224 pixels (7 tiles × 32px) and add 3 new tile frames:

```typescript
export function generateTerrain(scene: Phaser.Scene): void {
  const canvas = scene.textures.createCanvas('terrain', 224, 32); // was 128
  if (!canvas) return;
  const ctx = canvas.context;
  drawTerrainTile(ctx, 0, 'grass');
  drawTerrainTile(ctx, 32, 'dirt');
  drawTerrainTile(ctx, 64, 'stone');
  drawTerrainTile(ctx, 96, 'darkgrass');
  drawTerrainTile(ctx, 128, 'tarmac');        // NEW — tile type 4
  drawTerrainTile(ctx, 160, 'runwaymarking');  // NEW — tile type 5
  drawTerrainTile(ctx, 192, 'parkinglot');     // NEW — tile type 6
  canvas.refresh();

  const texture = scene.textures.get('terrain');
  texture.add(0, 0, 0, 0, 32, 32);
  texture.add(1, 0, 32, 0, 32, 32);
  texture.add(2, 0, 64, 0, 32, 32);
  texture.add(3, 0, 96, 0, 32, 32);
  texture.add(4, 0, 128, 0, 32, 32);  // Tarmac
  texture.add(5, 0, 160, 0, 32, 32);  // RunwayMarking
  texture.add(6, 0, 192, 0, 32, 32);  // ParkingLot
}
```

Then add the new tile drawing cases to the existing `drawTerrainTile()` function (line 60). Follow the same pattern as existing tiles — each draws at 32×32 starting at `(ox, 0)`:

```typescript
case 'tarmac':
  // Dark grey with subtle texture
  rect(ctx, ox, 0, 32, 32, '#3a3a4a');
  for (let i = 0; i < 8; i++) {
    px(ctx, ox + 2 + (i * 3) % 28, 4 + (i * 7) % 24, '#424250');
  }
  break;
case 'runwaymarking':
  // Tarmac base + white dashed center line
  rect(ctx, ox, 0, 32, 32, '#3a3a4a');
  rect(ctx, ox + 2, 14, 8, 4, '#ffffff');
  rect(ctx, ox + 18, 14, 8, 4, '#ffffff');
  break;
case 'parkinglot':
  // Lighter grey with parking lines
  rect(ctx, ox, 0, 32, 32, '#4a4a52');
  rect(ctx, ox, 0, 1, 32, '#5a5a62');
  rect(ctx, ox + 16, 0, 1, 32, '#5a5a62');
  break;
```

**NOTE:** Do NOT use `Math.random()` for the tarmac noise — use deterministic positions so it looks the same every time.

- [ ] **Step 2: Resize and redraw building-airport texture**

In `generateBuildingTexture()` (around line 225), change the canvas from 96x64 to **384x96** (12 tiles x 3 tiles):

```typescript
const canvas = scene.textures.createCanvas('building-airport', 384, 96);
const ctx = canvas.context;

// Background — glass/steel facade
rect(ctx, 0, 0, 384, 96, '#8a8a8a');

// Roof band
rect(ctx, 0, 0, 384, 12, '#2244aa');
rect(ctx, 0, 12, 384, 3, '#1a3388');

// Glass windows — repeating pattern across facade
for (let wx = 16; wx < 368; wx += 24) {
  rect(ctx, wx, 22, 18, 30, '#aaddff');
  rect(ctx, wx, 22, 18, 2, '#88bbdd');
  rect(ctx, wx + 8, 22, 2, 30, '#6699bb'); // mullion
}

// Central entrance (double doors)
const doorX = 384 / 2 - 24;
rect(ctx, doorX, 58, 48, 38, '#88ccee');
rect(ctx, doorX + 23, 58, 2, 38, '#6699aa'); // center divider
rect(ctx, doorX, 58, 48, 3, '#aaeeff'); // top bar

// "AIRPORT" text — use pixel-art letters with rect() calls
// (replicate existing pattern from the current building-airport generator
// which draws "AIRPORT" letter-by-letter at the top of the roof band)

// Control tower bump on right side (inside canvas bounds)
rect(ctx, 348, 0, 20, 12, '#7a7a8a');
rect(ctx, 350, 0, 16, 6, '#99bbdd'); // tower windows

// Ground strip
rect(ctx, 0, 93, 384, 3, '#666666');

canvas.refresh();
```

**NOTE:** The existing `building-airport` generator at line 261-292 draws "AIRPORT" pixel-by-pixel. Replicate that pattern, adjusting X positions to center the text on the wider 384px building. Check the existing code for the exact pixel letter shapes.

- [ ] **Step 3: Generate airplane-taxiing sprite**

Add to AirportTextures.ts:

```typescript
function generateAirplaneTaxiing(scene: Phaser.Scene): void {
  const canvas = scene.textures.createCanvas('airplane-taxiing', 64, 32);
  if (!canvas) return;
  const ctx = canvas.context;

  // Fuselage (top-down view)
  rect(ctx, 16, 8, 32, 16, '#e8e8ee');  // body
  rect(ctx, 12, 12, 8, 8, '#d0d0dd');   // nose taper
  rect(ctx, 48, 10, 8, 12, '#d0d0dd');  // tail taper

  // Wings
  rect(ctx, 24, 0, 16, 32, '#ccccdd');  // main wings
  rect(ctx, 26, 2, 12, 28, '#e0e0ee');  // wing highlight

  // Tail fin
  rect(ctx, 52, 6, 10, 4, '#2244aa');   // vertical stabilizer (blue)
  rect(ctx, 50, 12, 8, 8, '#ccccdd');   // horizontal stabilizer

  // Windows (tiny dots along fuselage)
  for (let wx = 20; wx < 46; wx += 4) {
    px(ctx, wx, 14, '#88aacc');
    px(ctx, wx, 17, '#88aacc');
  }

  // Engine nacelles
  rect(ctx, 28, 4, 4, 4, '#999999');
  rect(ctx, 28, 24, 4, 4, '#999999');

  canvas.refresh();
}
```

- [ ] **Step 4: Generate airport exterior decoration textures**

Add textures for fence, windsock, runway light:

```typescript
function generateAirportExteriorDecos(scene: Phaser.Scene): void {
  // Airport fence (32x32)
  const fence = scene.textures.createCanvas('deco-airport-fence', 32, 32);
  if (fence) {
    const ctx = fence.context;
    // Chain-link pattern — vertical posts with horizontal rails
    rect(ctx, 0, 8, 32, 2, '#888888');   // top rail
    rect(ctx, 0, 22, 32, 2, '#888888');  // bottom rail
    rect(ctx, 2, 0, 2, 32, '#999999');   // left post
    rect(ctx, 28, 0, 2, 32, '#999999');  // right post
    // Cross-hatch lines
    for (let i = 4; i < 28; i += 4) {
      rect(ctx, i, 10, 1, 12, '#aaaaaa');
    }
    fence.refresh();
  }

  // Windsock (32x32)
  const sock = scene.textures.createCanvas('deco-windsock', 32, 32);
  if (sock) {
    const ctx = sock.context;
    rect(ctx, 15, 8, 2, 20, '#888888');  // pole
    rect(ctx, 17, 8, 10, 4, '#ff6633');  // orange stripe
    rect(ctx, 17, 12, 8, 3, '#ffffff');  // white stripe
    rect(ctx, 17, 15, 6, 3, '#ff6633');  // orange stripe
    sock.refresh();
  }

  // Runway light (32x32)
  const rlight = scene.textures.createCanvas('deco-runway-light', 32, 32);
  if (rlight) {
    const ctx = rlight.context;
    rect(ctx, 14, 14, 4, 4, '#ffee44');
    rect(ctx, 13, 13, 6, 6, 'rgba(255,238,68,0.3)'); // glow
    rlight.refresh();
  }

  // Taxi car (32x16)
  const taxi = scene.textures.createCanvas('car-taxi', 32, 16);
  if (taxi) {
    const ctx = taxi.context;
    rect(ctx, 4, 2, 24, 12, '#f0c030');  // body
    rect(ctx, 8, 4, 16, 8, '#e0b020');   // darker center
    rect(ctx, 2, 4, 4, 8, '#f0c030');    // front
    rect(ctx, 26, 4, 4, 8, '#f0c030');   // rear
    rect(ctx, 10, 4, 4, 3, '#aaddff');   // windshield
    rect(ctx, 18, 4, 4, 3, '#aaddff');   // rear window
    rect(ctx, 4, 13, 4, 2, '#333333');   // front wheel
    rect(ctx, 24, 13, 4, 2, '#333333');  // rear wheel
    taxi.refresh();
  }

  // NPC with suitcase (48x48)
  const suitNpc = scene.textures.createCanvas('npc-suitcase', 48, 48);
  if (suitNpc) {
    const ctx = suitNpc.context;
    // Simple traveler silhouette
    const skin = '#f5d0a9';
    const shirt = '#5577aa';
    const pants = '#334455';
    // Head
    rect(ctx, 20, 6, 8, 8, skin);
    rect(ctx, 19, 7, 10, 6, skin);
    // Body
    rect(ctx, 18, 16, 12, 12, shirt);
    // Arms
    rect(ctx, 14, 18, 4, 10, shirt);
    rect(ctx, 32, 18, 4, 10, shirt);
    // Hands
    rect(ctx, 14, 28, 4, 2, skin);
    rect(ctx, 32, 28, 4, 2, skin);
    // Legs
    rect(ctx, 19, 28, 5, 10, pants);
    rect(ctx, 25, 28, 5, 10, pants);
    // Shoes
    rect(ctx, 18, 38, 6, 3, '#333333');
    rect(ctx, 25, 38, 6, 3, '#333333');
    // Hair
    rect(ctx, 19, 4, 10, 5, '#553322');
    // Suitcase (held in right hand)
    rect(ctx, 34, 26, 6, 8, '#cc5544');
    rect(ctx, 36, 22, 2, 4, '#444444'); // handle
    rect(ctx, 35, 34, 1, 1, '#444444'); // wheel
    rect(ctx, 39, 34, 1, 1, '#444444'); // wheel
    suitNpc.refresh();
  }
}
```

- [ ] **Step 5: Wire new generation functions into generateAirportTextures()**

At the bottom of AirportTextures.ts, in the `generateAirportTextures()` function, add calls:

```typescript
generateAirportExteriorDecos(scene);
generateAirplaneTaxiing(scene);
```

- [ ] **Step 6: Run type check**

Run: `npx tsc --noEmit`
Expected: zero errors

- [ ] **Step 7: Commit**

```bash
git add src/game/rendering/PixelArtGenerator.ts src/game/rendering/AirportTextures.ts
git commit -m "feat: generate new airport textures — terrain tiles, bigger terminal, airplane, exterior decos"
```

---

## Chunk 2: World Scene — Airport Exterior

### Task 3: Update WorldScene with Airport Complex

**Files:**
- Modify: `src/game/scenes/WorldScene.ts` (lines 25-32 for BUILDINGS, lines 56-83 for onCreateExtras)

- [ ] **Step 1: Update BUILDINGS array**

Change the airport entry (around line 30):
```typescript
{ name: 'airport', tileX: 14, tileY: 29, tileW: 12, tileH: 3 },
```

- [ ] **Step 2: Add airport decorations to world decorations**

Add new decoration entries for the airport zone. Either append to the existing DECORATIONS array in mapLayout.ts or add them in WorldScene.onCreateExtras(). Follow whichever pattern the codebase uses for world decorations:

```typescript
// Airport fencing along tarmac border
{ type: 'airport-fence', tileX: 5, tileY: 32 },
{ type: 'airport-fence', tileX: 8, tileY: 32 },
{ type: 'airport-fence', tileX: 11, tileY: 32 },
{ type: 'airport-fence', tileX: 26, tileY: 32 },
{ type: 'airport-fence', tileX: 29, tileY: 32 },
{ type: 'airport-fence', tileX: 32, tileY: 32 },
// Windsock
{ type: 'windsock', tileX: 34, tileY: 35 },
// Runway lights
{ type: 'runway-light', tileX: 5, tileY: 35 },
{ type: 'runway-light', tileX: 5, tileY: 37 },
{ type: 'runway-light', tileX: 34, tileY: 35 },
{ type: 'runway-light', tileX: 34, tileY: 37 },
// Trees around airport
{ type: 'tree', tileX: 7, tileY: 27 },
{ type: 'tree', tileX: 32, tileY: 27 },
{ type: 'tree', tileX: 6, tileY: 30 },
{ type: 'tree', tileX: 33, tileY: 30 },
```

- [ ] **Step 3: Add airplane runway animations in onCreateExtras()**

In WorldScene.onCreateExtras(), add animated planes using the same tween pattern as existing cars:

```typescript
// Runway airplane animations
const mapPxWidth = MAP_WIDTH * TILE_SIZE;

// Departing plane
const departPlane = this.add.sprite(
  18 * TILE_SIZE + TILE_SIZE / 2,
  32 * TILE_SIZE + TILE_SIZE / 2,
  'airplane-taxiing'
).setDepth(-6);

this.tweens.add({
  targets: departPlane,
  y: 36 * TILE_SIZE + TILE_SIZE / 2,
  duration: 4000,
  ease: 'Linear',
  onComplete: () => {
    this.tweens.add({
      targets: departPlane,
      x: mapPxWidth + 64,
      duration: 6000,
      ease: 'Quad.easeIn',
      onComplete: () => {
        // Reset to apron for next loop
        departPlane.x = 18 * TILE_SIZE + TILE_SIZE / 2;
        departPlane.y = 32 * TILE_SIZE + TILE_SIZE / 2;
      },
    });
  },
  delay: 2000,
  repeat: -1,
  repeatDelay: 18000, // wait 18s before next departure
});

// Arriving plane
const arrivePlane = this.add.sprite(-64, 36 * TILE_SIZE + TILE_SIZE / 2, 'airplane-taxiing')
  .setDepth(-6).setFlipX(true);

this.tweens.add({
  targets: arrivePlane,
  x: 20 * TILE_SIZE + TILE_SIZE / 2,
  duration: 6000,
  ease: 'Quad.easeOut',
  onComplete: () => {
    arrivePlane.setFlipX(false);
    this.tweens.add({
      targets: arrivePlane,
      y: 32 * TILE_SIZE + TILE_SIZE / 2,
      duration: 4000,
      ease: 'Linear',
      onComplete: () => {
        // Reset off-screen
        arrivePlane.x = -64;
        arrivePlane.y = 36 * TILE_SIZE + TILE_SIZE / 2;
        arrivePlane.setFlipX(true);
      },
    });
  },
  delay: 17000, // offset from departing
  repeat: -1,
  repeatDelay: 18000,
});
```

- [ ] **Step 4: Add airport cars in onCreateExtras()**

```typescript
// Airport area cars
const airportCarDefs = [
  { key: 'car-red', startTile: { x: 31, y: 28 }, endTile: { x: 8, y: 28 }, duration: 12000, delay: 0 },
  { key: 'car-blue', startTile: { x: 8, y: 28 }, endTile: { x: 31, y: 28 }, duration: 12000, delay: 6000 },
  { key: 'car-taxi', startTile: { x: 19, y: 24 }, endTile: { x: 19, y: 28 }, duration: 5000, delay: 3000 },
];

airportCarDefs.forEach(def => {
  const startX = def.startTile.x * TILE_SIZE + TILE_SIZE / 2;
  const startY = def.startTile.y * TILE_SIZE + TILE_SIZE / 2;
  const endX = def.endTile.x * TILE_SIZE + TILE_SIZE / 2;
  const endY = def.endTile.y * TILE_SIZE + TILE_SIZE / 2;
  const car = this.add.sprite(startX, startY, def.key).setDepth(-3);
  if (endX < startX) car.setFlipX(true);

  this.time.delayedCall(def.delay, () => {
    this.tweens.add({
      targets: car,
      x: endX,
      y: endY,
      duration: def.duration,
      ease: 'Linear',
      repeat: -1,
      yoyo: true,
      repeatDelay: 4000,
    });
  });
});
```

- [ ] **Step 5: Add airport pedestrian NPCs**

Add to the world map NPC_DEFS array in mapLayout.ts (or WorldScene depending on pattern):

```typescript
{ id: 'airport-ped-1', tileX: 16, tileY: 28, behavior: 'walk', texture: 'npc-suitcase',
  walkPath: [{ x: 16, y: 28 }, { x: 22, y: 28 }] },
{ id: 'airport-ped-2', tileX: 20, tileY: 27, behavior: 'walk', texture: 'npc-suitcase',
  walkPath: [{ x: 20, y: 27 }, { x: 20, y: 28 }] },
{ id: 'airport-ped-3', tileX: 10, tileY: 29, behavior: 'idle', texture: 'npc-villager' },
{ id: 'airport-ped-4', tileX: 28, tileY: 28, behavior: 'walk', texture: 'npc-suitcase',
  walkPath: [{ x: 28, y: 28 }, { x: 25, y: 28 }] },
```

- [ ] **Step 6: Update interior scene mapping**

In WorldScene.onEnterCheckpoint() (around line 99-103), update the airport mapping:

```typescript
const interiorSceneMap: Record<string, string> = {
  michaels_house: 'MichaelsHouseScene',
  hadars_house: 'HadarsHouseScene',
  airport: 'AirportInteriorScene', // was 'AirportEntranceScene'
};
```

- [ ] **Step 7: Run type check**

Run: `npx tsc --noEmit`
Expected: zero errors

- [ ] **Step 8: Commit**

```bash
git add src/game/data/mapLayout.ts src/game/scenes/WorldScene.ts
git commit -m "feat: add airport exterior — runway, planes, cars, NPCs, decorations"
```

---

## Chunk 3: Interior — New Airport Layout & Scene

### Task 4: Create New Airport Interior Layout

**Files:**
- Modify: `src/game/scenes/airport/airportLayouts.ts` (replace entire content)

- [ ] **Step 1: Replace all 3 layouts with single AIRPORT_INTERIOR_LAYOUT**

Replace the entire file content:

```typescript
import { InteriorLayout, buildWallGrid } from '../../data/interiorLayouts';

export const AIRPORT_INTERIOR_LAYOUT: InteriorLayout = {
  id: 'airport-interior',
  widthInTiles: 36,
  heightInTiles: 20,
  wallGrid: buildWallGrid(36, 20, [{ x: 0, y: 0, w: 36, h: 20 }], []),
  floors: [
    // Check-in area (tile_floor)
    { tileX: 1, tileY: 14, width: 34, height: 4, floorType: 'tile_floor' },
    // Divider row (carpet_beige)
    { tileX: 1, tileY: 12, width: 34, height: 2, floorType: 'carpet_beige' },
    // Security area (tile_floor)
    { tileX: 1, tileY: 8, width: 34, height: 4, floorType: 'tile_floor' },
    // Divider row (carpet_beige)
    { tileX: 1, tileY: 6, width: 34, height: 2, floorType: 'carpet_beige' },
    // Gate/boarding area — carpet
    { tileX: 12, tileY: 2, width: 23, height: 4, floorType: 'carpet' },
    // Cafe area — wood floor
    { tileX: 1, tileY: 2, width: 11, height: 4, floorType: 'wood' },
  ],
  decorations: [
    // ── CHECK-IN AREA (y=14-17) ──
    { type: 'airport-counter', tileX: 8, tileY: 15 },
    { type: 'airport-counter', tileX: 14, tileY: 15 },
    { type: 'airport-counter', tileX: 20, tileY: 15 },
    { type: 'airport-counter', tileX: 26, tileY: 15 },
    { type: 'airport-rope-barrier', tileX: 7, tileY: 14 },
    { type: 'airport-rope-barrier', tileX: 13, tileY: 14 },
    { type: 'airport-rope-barrier', tileX: 19, tileY: 14 },
    { type: 'airport-rope-barrier', tileX: 25, tileY: 14 },
    { type: 'airport-luggage-cart', tileX: 10, tileY: 17 },
    { type: 'airport-luggage-cart', tileX: 22, tileY: 17 },
    { type: 'airport-plant', tileX: 4, tileY: 14 },
    { type: 'airport-plant', tileX: 32, tileY: 14 },
    { type: 'airport-bench', tileX: 4, tileY: 16 },
    { type: 'airport-bench', tileX: 32, tileY: 16 },

    // ── SECURITY SECTION (y=8-11) ──
    { type: 'airport-metal-detector', tileX: 12, tileY: 10 },
    { type: 'airport-metal-detector', tileX: 24, tileY: 10 },
    { type: 'airport-conveyor-belt', tileX: 14, tileY: 9 },
    { type: 'airport-conveyor-belt', tileX: 26, tileY: 9 },
    { type: 'airport-rope-barrier', tileX: 10, tileY: 11 },
    { type: 'airport-rope-barrier', tileX: 16, tileY: 11 },
    { type: 'airport-rope-barrier', tileX: 22, tileY: 11 },
    { type: 'airport-rope-barrier', tileX: 28, tileY: 11 },
    { type: 'airport-bin', tileX: 8, tileY: 10 },
    { type: 'airport-bin', tileX: 30, tileY: 10 },

    // ── GATE/BOARDING AREA (y=2-5, x=12-35) ──
    { type: 'airport-gate-desk', tileX: 24, tileY: 3 },
    { type: 'airport-departures-board', tileX: 16, tileY: 2 },
    { type: 'airport-bench', tileX: 14, tileY: 3 },
    { type: 'airport-bench', tileX: 14, tileY: 5 },
    { type: 'airport-bench', tileX: 20, tileY: 3 },
    { type: 'airport-bench', tileX: 20, tileY: 5 },
    { type: 'airport-bench', tileX: 28, tileY: 5 },
    { type: 'airport-window', tileX: 13, tileY: 2 },
    { type: 'airport-window', tileX: 21, tileY: 2 },
    { type: 'airport-window', tileX: 29, tileY: 2 },
    { type: 'airport-window', tileX: 33, tileY: 2 },
    { type: 'airport-plant', tileX: 12, tileY: 2 },
    { type: 'airport-plant', tileX: 34, tileY: 2 },

    // ── CAFE NOOK (y=2-5, x=1-11) ──
    { type: 'airport-cafe-counter', tileX: 3, tileY: 3 },
    { type: 'airport-stool', tileX: 6, tileY: 3 },
    { type: 'airport-stool', tileX: 6, tileY: 5 },
    { type: 'airport-stool', tileX: 9, tileY: 3 },
    { type: 'airport-stool', tileX: 9, tileY: 5 },
    { type: 'airport-cafe-menu', tileX: 2, tileY: 3 },
    { type: 'airport-plant', tileX: 1, tileY: 2 },
    { type: 'airport-plant', tileX: 11, tileY: 2 },
  ],
  entrance: { tileX: 18, tileY: 18 },
  exit: { tileX: 17, tileY: 18, width: 3, height: 2, promptText: 'Exit Airport' },
  cameraZoom: 2.0,
};
```

- [ ] **Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: zero errors

- [ ] **Step 3: Commit**

```bash
git add src/game/scenes/airport/airportLayouts.ts
git commit -m "feat: single 36x20 airport interior layout with atmosphere zones"
```

---

### Task 5: Create AirportInteriorScene (Replace 3 Scenes)

**Files:**
- Delete: `src/game/scenes/airport/AirportSecurityScene.ts`
- Delete: `src/game/scenes/airport/AirportGateScene.ts`
- Rename/Rewrite: `src/game/scenes/airport/AirportEntranceScene.ts` → `src/game/scenes/airport/AirportInteriorScene.ts`

- [ ] **Step 1: Delete old scenes**

```bash
rm src/game/scenes/airport/AirportSecurityScene.ts
rm src/game/scenes/airport/AirportGateScene.ts
```

- [ ] **Step 2: Create AirportInteriorScene.ts**

Replace `AirportEntranceScene.ts` with new file `AirportInteriorScene.ts`:

```typescript
// src/game/scenes/airport/AirportInteriorScene.ts
import { InteriorScene } from '../InteriorScene';
import { InteriorLayout } from '../../data/interiorLayouts';
import { AIRPORT_INTERIOR_LAYOUT } from './airportLayouts';
import { NPCSystem } from '../../systems/NPCSystem';
import { NPCDef, worldToTile } from '../../data/mapLayout';
import { uiManager } from '../../../ui/UIManager';
import { saveCurrentScene } from '../../systems/SaveSystem';
import { SignTooltip, SignDef } from '../../../ui/SignTooltip';

const INTERIOR_NPCS: NPCDef[] = [
  // Check-in agents
  {
    id: 'checkin-agent-1', tileX: 8, tileY: 15, behavior: 'idle',
    texture: 'npc-ticket-agent', interactable: true, onInteract: 'dialog',
    interactionData: { lines: ['Welcome to Witchy Airlines!', 'Check in for your flight here.', 'Maui flights depart from Gate 1!'] },
  },
  {
    id: 'checkin-agent-2', tileX: 20, tileY: 15, behavior: 'idle',
    texture: 'npc-ticket-agent', interactable: true, onInteract: 'dialog',
    interactionData: { lines: ['Have a wonderful trip!', 'Don\'t forget to grab a coffee at the cafe!'] },
  },
  // Security
  {
    id: 'security-guard', tileX: 18, tileY: 10, behavior: 'idle',
    texture: 'npc-security-guard', interactable: true, onInteract: 'dialog',
    interactionData: { lines: ['Please have your boarding pass ready.', 'Proceed to the gates ahead.'] },
  },
  // Gate agent (triggers boarding)
  {
    id: 'gate-agent-maui', tileX: 24, tileY: 4, behavior: 'idle',
    texture: 'npc-gate-agent', interactable: true, onInteract: 'dialog',
    interactionData: { lines: ['Flight to Maui is now boarding!', 'Ready to board?'] },
  },
  // Cafe
  {
    id: 'barista', tileX: 3, tileY: 4, behavior: 'idle',
    texture: 'npc-cafe-worker', interactable: true, onInteract: 'dialog',
    interactionData: { lines: ['Welcome to Sky Cafe!', 'Coffee before your flight?'] },
  },
  // Ambient passengers
  { id: 'sitting-passenger-1', tileX: 14, tileY: 3, behavior: 'sit', texture: 'npc-traveler' },
  { id: 'sitting-passenger-2', tileX: 20, tileY: 5, behavior: 'sit', texture: 'npc-traveler-2' },
  { id: 'walking-passenger', tileX: 18, tileY: 14, behavior: 'walk', texture: 'npc-traveler',
    walkPath: [{ x: 18, y: 14 }, { x: 18, y: 7 }] },
];

const INTERIOR_SIGNS: SignDef[] = [
  { id: 'sign-gate-maui', tileX: 24, tileY: 2, texture: 'sign-gate-number', tooltipText: 'Gate 1 — Maui' },
  { id: 'sign-cafe', tileX: 5, tileY: 2, texture: 'sign-cafe', tooltipText: 'Sky Cafe' },
  { id: 'sign-security', tileX: 18, tileY: 8, texture: 'sign-security', tooltipText: 'Security' },
];

export class AirportInteriorScene extends InteriorScene {
  private npcSystem!: NPCSystem;
  private signTooltip!: SignTooltip;
  private boardingTriggered = false;

  constructor() {
    super({ key: 'AirportInteriorScene' });
  }

  getLayout(): InteriorLayout {
    return AIRPORT_INTERIOR_LAYOUT;
  }

  create(): void {
    super.create();
    saveCurrentScene('AirportInteriorScene');
    this.player.setTemporaryTexture('player-suitcase', this);
    this.partner.setTemporaryTexture('partner-suitcase', this);
    this.boardingTriggered = false;
    this.npcSystem = new NPCSystem();
    this.npcSystem.create(this, INTERIOR_NPCS);
    this.signTooltip = new SignTooltip(this, INTERIOR_SIGNS);

    // Wire dwell trigger for NPC interaction
    this.npcSystem.onDwellTrigger = (npc) => {
      if (!npc.interactionData?.lines) return;

      if (npc.id === 'gate-agent-maui') {
        this.inputSystem.freeze();
        uiManager.showNPCDialog(npc.interactionData.lines, () => {
          uiManager.hideNPCDialog();
          this.inputSystem.unfreeze();
          this.npcSystem.onDialogueEnd(npc.id);
          this.startBoarding();
        });
      } else {
        this.inputSystem.freeze();
        uiManager.showNPCDialog(npc.interactionData.lines, () => {
          uiManager.hideNPCDialog();
          this.inputSystem.unfreeze();
          this.npcSystem.onDialogueEnd(npc.id);
        });
      }
    };
  }

  private startBoarding(): void {
    if (this.boardingTriggered) return;
    this.boardingTriggered = true;

    uiManager.hideInteractionPrompt();
    const cam = this.cameras.main;
    this.tweens.add({
      targets: cam,
      alpha: 0,
      duration: 500,
      ease: 'Linear',
      onComplete: () => {
        this.scene.start('AirplaneCutscene', { destination: 'maui' });
      },
    });
  }

  update(time: number, delta: number): void {
    super.update(time, delta);
    const pos = this.player.getPosition();
    this.npcSystem.update(delta, pos.x, pos.y, this.inputSystem.isFrozen);
    const playerTile = worldToTile(pos.x, pos.y);
    this.signTooltip.update(playerTile.x, playerTile.y);
  }

  shutdown(): void {
    super.shutdown();
    this.npcSystem?.destroy();
    this.signTooltip?.destroy();
  }
}
```

- [ ] **Step 3: Delete old AirportEntranceScene.ts**

```bash
rm src/game/scenes/airport/AirportEntranceScene.ts
```

- [ ] **Step 4: Run type check**

Run: `npx tsc --noEmit`
Expected: errors from main.ts import references (fixed in next task)

- [ ] **Step 5: Commit**

```bash
git add -A src/game/scenes/airport/
git commit -m "feat: replace 3 airport scenes with single AirportInteriorScene"
```

---

## Chunk 4: Wiring — Scene Registration, Save Migration, Cleanup

### Task 6: Update Scene Registration and Imports

**Files:**
- Modify: `src/main.ts` (lines 4-18 imports, line 48 scene array)

- [ ] **Step 1: Update imports in main.ts**

Remove old imports, add new one:

```typescript
// Remove these:
// import { AirportEntranceScene } from './game/scenes/airport/AirportEntranceScene';
// import { AirportSecurityScene } from './game/scenes/airport/AirportSecurityScene';
// import { AirportGateScene } from './game/scenes/airport/AirportGateScene';

// Add:
import { AirportInteriorScene } from './game/scenes/airport/AirportInteriorScene';
```

- [ ] **Step 2: Update scene registration array**

Replace the 3 old entries with 1 new one:

```typescript
scene: [BootScene, DressingRoomScene, WorldScene, MichaelsHouseScene, HadarsHouseScene,
  AirportInteriorScene, AirplaneCutscene,
  MauiOverworldScene, MauiHotelScene, QuizScene, CatchScene, MatchScene, TennisScene]
```

- [ ] **Step 3: Commit**

```bash
git add src/main.ts
git commit -m "refactor: update scene registration for new airport interior"
```

---

### Task 7: Save System Migration

**Files:**
- Modify: `src/game/systems/SaveSystem.ts` (migration logic around lines 37-72)

- [ ] **Step 1: Add scene key migration in loadGameState()**

In the `migrate()` function or in `loadGameState()` after migration, add a mapping for old airport scene keys:

```typescript
// After existing migration logic, add:
const sceneKeyMigration: Record<string, string> = {
  'AirportEntranceScene': 'AirportInteriorScene',
  'AirportSecurityScene': 'AirportInteriorScene',
  'AirportGateScene': 'AirportInteriorScene',
};
if (state.currentScene && sceneKeyMigration[state.currentScene]) {
  state.currentScene = sceneKeyMigration[state.currentScene];
}
```

- [ ] **Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: zero errors

- [ ] **Step 3: Commit**

```bash
git add src/game/systems/SaveSystem.ts
git commit -m "fix: migrate saved airport scene keys to AirportInteriorScene"
```

---

### Task 8: New Interior Decoration Textures

**Files:**
- Modify: `src/game/rendering/AirportTextures.ts`

- [ ] **Step 1: Add any missing interior decoration textures**

Check which decoration types are referenced in the new layout (`AIRPORT_INTERIOR_LAYOUT.decorations`) and verify all corresponding `interior-airport-*` textures exist. The existing file already generates 14 decoration textures. Most should be reusable.

New textures that may be needed (if not already generated):
- `interior-airport-flight-board` — if `airport-departures-board` doesn't already exist (check — it may be the same as the existing `interior-airport-departures-board`)

Verify the decoration `type` values in the layout match the texture keys expected by InteriorScene's decoration rendering code. The pattern is typically `interior-airport-${type}` or `interior-${type}`.

- [ ] **Step 2: Verify sign textures exist**

The signs referenced are: `sign-gate-number`, `sign-cafe`, `sign-security` — these are already generated in `generateSignTextures()`. Confirm they exist.

- [ ] **Step 3: Run type check and visual verification**

Run: `npx tsc --noEmit`
Then: `npm run dev` → navigate to airport → verify all decorations render

- [ ] **Step 4: Commit (if any changes needed)**

```bash
git add src/game/rendering/AirportTextures.ts
git commit -m "fix: ensure all airport interior decoration textures are generated"
```

---

### Task 9: Final Integration Verification

**Files:** All modified files

- [ ] **Step 1: Full type check**

Run: `npx tsc --noEmit`
Expected: zero errors

- [ ] **Step 2: Visual verification checklist**

Run: `npm run dev` and verify:

1. World map is 40x38 — can scroll south past old map edge
2. Airport building is large (12 tiles wide) in south area
3. Tarmac/runway tiles render correctly (dark grey, markings)
4. Parking lot tiles visible on either side of terminal
5. Animated planes taxi on runway (departing and arriving)
6. Cars drive along access road
7. NPC pedestrians walk near terminal with suitcase sprites
8. Airport fencing, windsock, runway lights visible
9. Walking to terminal entrance triggers "Enter Airport" prompt
10. Entering airport shows single large room
11. Interior has distinct zones: check-in (tile floor), security (tile floor), gate (carpet), cafe (wood)
12. All decorations render: counters, benches, metal detectors, conveyor belts, plants, etc.
13. All NPCs respond: check-in agents, security guard, barista (dialog)
14. Gate agent triggers boarding → airplane cutscene → Maui
15. Player/partner have suitcase sprites inside airport
16. Exiting airport returns to world map at correct position
17. Old save files with `AirportSecurityScene` or `AirportGateScene` load correctly (migrate to interior)

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "feat: complete airport redesign — expanded exterior with runway, unified interior"
git push
```
