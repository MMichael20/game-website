# Alive World Design -- Final

> **Goal**: Make the world map feel cozy, charming, and lived-in. Stardew Valley town vibes -- not overwhelming, not gamey. This is a romantic gift.

---

## 1. Architecture Overview

The current architecture stays intact. We add three concerns:

1. **Pre-rendered ground canvas** -- replace ~1200 individual grass/dirt sprites with a single offscreen canvas baked at boot time.
2. **NPC system** -- 6-8 townspeople who wander named routes, idle at landmarks, and react to time of day. All logic in one file.
3. **Expanded map layout** -- more roads, more buildings (decorative, non-checkpoint), more decoration objects. Defined in a TypeScript data file for compile-time safety.

No new Phaser plugins, no external images, no additional npm dependencies.

### Guiding Principles

- **Charming, not complex.** NPCs wave, sit on benches, walk between shops. No combat, no AI trees, no pathfinding edge cases.
- **Performance-first.** Ground layer is 1 draw call. NPCs cap at 8. Decorations are static images. Budget: 60 FPS on mobile.
- **Incremental delivery.** Each of the 8 implementation steps produces a fully working game. Nothing breaks between steps.

---

## 2. File Structure

```
src/
  data/
    checkpoints.json          (existing, unchanged)
    mapLayout.ts              (NEW -- tile grid, road network, decoration coords, NPC defs)
  rendering/
    WorldRenderer.ts          (MODIFIED -- add new textures, add pre-rendered ground canvas)
    ParticleConfigs.ts        (MODIFIED -- add butterfly emitter)
    SkyRenderer.ts            (existing, unchanged)
    OffscreenCharacterRenderer.ts (existing, unchanged)
    OutfitRenderer.ts         (existing, unchanged)
    UIRenderer.ts             (existing, unchanged)
  scenes/
    BootScene.ts              (MODIFIED -- generate new textures, generate ground canvas)
    WorldScene.ts             (MODIFIED -- use ground canvas, spawn NPCs, spawn decorations)
  systems/
    NPCSystem.ts              (NEW -- all NPC logic: spawning, behaviors, schedules, throttling, stuck detection)
  utils/
    canvasUtils.ts            (MODIFIED -- add seeded random utility)
    storage.ts                (existing, unchanged)
```

**Total new files: 2** (`mapLayout.ts`, `NPCSystem.ts`).
**Modified files: 5** (`WorldRenderer.ts`, `ParticleConfigs.ts`, `BootScene.ts`, `WorldScene.ts`, `canvasUtils.ts`).

---

## 3. Module Details

### 3.1 `src/data/mapLayout.ts` (NEW)

Purpose: Single source of truth for the world's spatial data. TypeScript for compile-time type safety (not JSON).

```ts
// Tile types for the ground grid
export const enum TileType {
  Grass = 0,
  Dirt = 1,
  Stone = 2,      // cobblestone paths
  GrassDark = 3,  // under trees / shaded areas
}

export const MAP_WIDTH = 40;
export const MAP_HEIGHT = 30;
export const TILE_SIZE = 32;

// 40x30 grid. Each cell is a TileType.
// Built procedurally from road definitions below.
export function buildTileGrid(): TileType[][] { ... }

// Named road segments
export interface RoadSegment {
  name: string;
  tiles: Array<{ x: number; y: number }>;
}

export const ROADS: RoadSegment[] = [
  { name: 'main-street',   tiles: /* x=5..35, y=15 */ },
  { name: 'north-avenue',  tiles: /* x=20, y=5..15 */ },
  { name: 'south-avenue',  tiles: /* x=20, y=15..25 */ },
  { name: 'market-lane',   tiles: /* x=8..14, y=8..10 */ },
  { name: 'park-path',     tiles: /* curved path near park */ },
  { name: 'cinema-row',    tiles: /* x=14..18, y=6 */ },
  { name: 'lakeside-walk', tiles: /* gentle curve x=25..33, y=18..22 */ },
];

// Decoration placements
export interface DecorationDef {
  type: string;    // texture key
  x: number;       // tile-x
  y: number;       // tile-y
  scale?: number;
}

export const DECORATIONS: DecorationDef[] = [
  // Benches (6 total -- along paths)
  { type: 'bench', x: 12, y: 15 },
  { type: 'bench', x: 24, y: 15 },
  { type: 'bench', x: 20, y: 20 },
  { type: 'bench', x: 8, y: 10 },
  { type: 'bench', x: 30, y: 18 },
  { type: 'bench', x: 17, y: 6 },

  // Mailboxes (3)
  { type: 'mailbox', x: 5, y: 9 },
  { type: 'mailbox', x: 29, y: 8 },
  { type: 'mailbox', x: 15, y: 15 },

  // Signposts (2)
  { type: 'signpost', x: 20, y: 15 },
  { type: 'signpost', x: 10, y: 15 },

  // Trash cans (2)
  { type: 'trashcan', x: 13, y: 15 },
  { type: 'trashcan', x: 27, y: 15 },

  // Flower planters (4)
  { type: 'planter', x: 31, y: 8 },
  { type: 'planter', x: 9, y: 8 },
  { type: 'planter', x: 21, y: 22 },
  { type: 'planter', x: 14, y: 10 },

  // Well (1, decorative centerpiece)
  { type: 'well', x: 20, y: 12 },

  // Fountain (1, in park area)
  { type: 'fountain', x: 22, y: 22 },

  // Picnic blanket (1)
  { type: 'picnic-blanket', x: 18, y: 24 },

  // String lights between lamp posts (data only; rendered as particle/overlay)
  // ... handled in WorldScene
];

// Decorative (non-checkpoint) buildings
export interface DecorativeBuildingDef {
  type: string;
  x: number;  // tile-x
  y: number;  // tile-y
  label: string;
}

export const DECORATIVE_BUILDINGS: DecorativeBuildingDef[] = [
  { type: 'building-bookshop',  x: 26, y: 8,  label: 'Bookshop' },
  { type: 'building-bakery',    x: 6,  y: 15, label: 'Bakery' },
  { type: 'building-florist',   x: 34, y: 15, label: 'Florist' },
  { type: 'building-fountain-shop', x: 28, y: 18, label: 'Gift Shop' },
];

// NPC definitions (see Section 6 for behavior details)
export interface NPCDef {
  id: string;
  name: string;
  palette: NPCPalette;
  defaultRoute: string;      // named route from ROADS
  schedule: NPCScheduleEntry[];
}

export interface NPCPalette {
  skin: string;
  hair: string;
  shirt: string;
  pants: string;
}

export interface NPCScheduleEntry {
  startMinute: number;  // game time 0-1440
  endMinute: number;
  behavior: 'walk-route' | 'idle-at' | 'sit-bench';
  target?: string;  // route name or decoration id
}

export const NPCS: NPCDef[] = [ /* 6-8 NPCs, see Section 6 */ ];

// Path network for BFS (see Section 4)
export interface PathNode {
  id: string;         // "road-name" or "junction-x-y"
  x: number;          // world pixel x
  y: number;          // world pixel y
  neighbors: string[];
}

export const PATH_NETWORK: PathNode[] = [ ... ];
```

### 3.2 `src/systems/NPCSystem.ts` (NEW)

Purpose: All NPC logic in one file. Spawning, movement, behavior strategies, scheduling, stuck detection, adaptive throttling. ~200-250 lines estimated.

Key exports:
```ts
export class NPCSystem {
  constructor(scene: Phaser.Scene, npcs: NPCDef[], pathNetwork: PathNode[])

  update(delta: number, gameTimeMinutes: number): void
  destroy(): void
}
```

Internals (not exported):
- `NPCEntity` -- sprite + state (currentBehavior, targetNode, stuckTimer, etc.)
- `BehaviorStrategy` interface -- `{ enter(npc): void; update(npc, delta): void; exit(npc): void }`
- Concrete behaviors: `WalkRouteBehavior`, `IdleAtBehavior`, `SitBenchBehavior`
- `bfs(from, to, network)` -- simple BFS on PathNode graph, returns node ID path
- Stuck detection: if NPC hasn't moved >4px in 3 seconds, teleport to nearest path node
- Adaptive throttling: only update N NPCs per frame (round-robin), reduce to fewer on low FPS

### 3.3 `src/rendering/WorldRenderer.ts` (MODIFIED)

New texture generators to add:
- `generateStoneTile(scene)` -- cobblestone path tile (32x32)
- `generateDarkGrassTile(scene)` -- shaded grass variant (32x32)
- `generateBench(scene)` -- park/street bench (48x32)
- `generateMailbox(scene)` -- small red mailbox (24x40)
- `generateSignpost(scene)` -- wooden signpost (32x48)
- `generateTrashcan(scene)` -- small metal bin (20x28)
- `generatePlanter(scene)` -- stone planter with flowers (32x32)
- `generateWell(scene)` -- cobblestone well (48x48)
- `generateFountain(scene)` -- small fountain (48x48)
- `generatePicnicBlanket(scene)` -- checkered blanket (48x32)
- `generateNPCTexture(scene, palette, key)` -- simple 32x48 NPC sprite (3 frames: idle, walk1, walk2)
- `generateBuildingBookshop(scene)` -- warm bookshop facade (256x256)
- `generateBuildingBakery(scene)` -- bakery with croissant sign (256x256)
- `generateBuildingFlorist(scene)` -- flower shop with window display (256x256)
- `generatePreRenderedGround(scene)` -- the big one (see Section 5)

Existing `generateAllTextures` updated to call all new generators.

### 3.4 `src/scenes/BootScene.ts` (MODIFIED)

Changes:
- Update `totalSteps` to include new textures and the ground canvas
- Call new texture generators (decorations, NPC sprites, decorative buildings)
- Call `WorldRenderer.generatePreRenderedGround(scene)` -- registers as `'ground-canvas'`
- Seeded random initialized before texture generation for determinism

### 3.5 `src/scenes/WorldScene.ts` (MODIFIED)

Changes to `createMap()`:
- Replace the grass/dirt sprite loops with a single `this.add.image(mapW*16, mapH*16, 'ground-canvas')`
- Place decorations from `DECORATIONS` array
- Place decorative buildings from `DECORATIVE_BUILDINGS` array
- Place expanded tree positions (up from 12 to ~20)
- Place expanded flower patches, lamp posts, fences

New method: `createNPCs()`:
- Instantiate `NPCSystem` with NPC defs from `mapLayout.ts`

Changes to `update()`:
- Call `this.npcSystem.update(delta, this.gameTimeMinutes)`

Changes to `updateDepthSorting()`:
- NPC sprites get depth-sorted along with player/partner (NPCSystem handles its own sprite depths internally)

### 3.6 `src/utils/canvasUtils.ts` (MODIFIED)

Add seeded PRNG:
```ts
export function createSeededRandom(seed: number): () => number {
  // Mulberry32
  return function() {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
```

Used by `WorldRenderer` for grass variation, stone placement, etc. so the ground canvas looks identical on every load.

---

## 4. Data Structures

### 4.1 Tile Grid

A `TileType[][]` array (30 rows x 40 cols). Built by `buildTileGrid()` which:
1. Fills everything with `Grass`
2. Stamps `Dirt` for each road segment in `ROADS`
3. Stamps `Stone` for market-lane and cinema-row
4. Stamps `GrassDark` in a 2-tile radius around tree positions

### 4.2 Path Network

A small graph (~20-30 nodes) of junctions and waypoints. Each node has `(x, y)` in world pixels and a list of neighbor IDs. Used for NPC routing via BFS.

Example nodes:
- `main-st-west` (5*32, 15*32)
- `main-st-east` (35*32, 15*32)
- `junction-center` (20*32, 15*32)
- `junction-north` (20*32, 5*32)
- `park-entrance` (20*32, 20*32)
- etc.

BFS on 20-30 nodes is effectively instant (<0.01ms). No need for A*, Dijkstra, or any spatial index.

### 4.3 NPC Definitions

6 NPCs with charming, cozy personalities:

| ID | Name | Default Route | Flavor |
|----|------|--------------|--------|
| `baker` | Baker | market-lane | Carries bread basket, idles outside bakery |
| `florist` | Florist | main-street | Walks between florist shop and park |
| `reader` | Book Lover | cinema-row | Sits on benches, walks to bookshop |
| `dog-walker` | Dog Walker | lakeside-walk | Loops lakeside path, never sits |
| `musician` | Street Musician | main-street (center) | Idles near well/fountain |
| `cat` | Town Cat | park-path | Wanders randomly, sits on things |

Each NPC is 32x48 pixels (slightly smaller than the player's 160px * 0.4 = 64px display, establishing visual hierarchy: player is the protagonist).

---

## 5. Pre-Rendered Ground Canvas

### The Problem
Currently, `createMap()` places 1200 individual grass sprites + ~60 dirt sprites = ~1260 game objects just for the ground. Each is a separate draw call.

### The Solution
Bake the entire ground layer into a single offscreen `<canvas>` element at boot time. Register it as one Phaser texture. Place it as one `Phaser.GameObjects.Image`.

### How Roads Integrate with Grass

The `generatePreRenderedGround()` method in `WorldRenderer`:

```
1. Create a canvas: MAP_WIDTH * TILE_SIZE x MAP_HEIGHT * TILE_SIZE (1280x960)
2. Build the tile grid from buildTileGrid()
3. For each cell (x, y):
   a. If Grass:     draw grass tile (seeded random variation)
   b. If GrassDark: draw darker grass tile
   c. If Dirt:      draw dirt tile
   d. If Stone:     draw stone tile
4. For each road edge (where Dirt/Stone meets Grass):
   - Draw a 4px blend strip using a gradient from road color to grass color
   - This creates soft, natural-looking edges (no harsh tile boundaries)
5. Register the final canvas as 'ground-canvas'
```

**Edge blending detail**: For each tile that is road-type, check its 4 cardinal neighbors. For each neighbor that is grass, draw a small linear gradient (4px wide) from road color to transparent, overlaid on the grass side. This creates a worn-dirt-meets-grass look without needing dedicated edge tiles for every orientation.

### Performance Impact
- Before: ~1260 game objects, ~1260 draw calls for ground
- After: 1 game object, 1 draw call for ground
- Memory: one 1280x960 canvas = ~4.9 MB RGBA. Well within budget.

---

## 6. NPC System

### 6.1 Behavior Strategy Pattern

```ts
interface BehaviorStrategy {
  enter(npc: NPCEntity): void;
  update(npc: NPCEntity, delta: number): boolean; // returns true when done
  exit(npc: NPCEntity): void;
}
```

Three concrete strategies (all in `NPCSystem.ts`, not separate files):

**WalkRouteBehavior**: NPC walks along a sequence of path nodes. Moves at 40-60 px/s (slow, leisurely). Plays walk animation. Flips sprite based on direction. When reaching the final node, signals done.

**IdleAtBehavior**: NPC stands at a position. Plays idle animation. Optionally plays a small "look around" by flipping sprite every few seconds. Duration: 5-15 seconds (randomized).

**SitBenchBehavior**: NPC moves to a bench position, then switches to a sitting frame. Stays for 10-30 seconds. Only used by `reader` and `cat`.

### 6.2 Scheduling (Time of Day)

Each NPC has a `schedule` array. The NPCSystem checks `gameTimeMinutes` and switches behavior when a new schedule entry becomes active.

Example schedule for `baker`:
```
06:00-09:00  walk-route "market-lane" (morning deliveries)
09:00-12:00  idle-at bakery-front
12:00-14:00  walk-route "main-street"
14:00-17:00  idle-at bakery-front
17:00-20:00  walk-route "park-path" (evening stroll)
20:00-06:00  idle-at bakery-front (inside, not visible -- NPC hidden)
```

NPCs with `startMinute > endMinute` that span midnight are handled by checking both ranges. NPCs are set invisible when their schedule says `idle-at` their "home" building during night hours (20:00-06:00), creating the illusion of going home.

### 6.3 BFS Pathfinding

When a behavior says "walk route X" but the NPC is currently near node A and route X starts at node B:

1. BFS from closest-node-to-NPC to first-node-of-route
2. Walk the BFS result
3. Then walk the route itself

BFS implementation: standard queue-based, on the `PathNode` graph. ~15 lines of code. No priority queue needed -- all edges are effectively equal weight at this scale.

**Fallback**: If BFS finds no path (graph disconnection bug), teleport the NPC to the route start. Log a warning in dev mode.

### 6.4 NPC Visuals

Each NPC is a 32x48 canvas with 3 frames (idle, walk-left, walk-right), generated at boot time by `WorldRenderer.generateNPCTexture()`.

NPC anatomy (simple and charming):
- Head: 12x12 circle at top, filled with `palette.skin`, hair drawn on top
- Body: 14x16 rectangle, filled with `palette.shirt`
- Legs: two 5x12 rectangles, filled with `palette.pants`, offset per walk frame
- Scale: displayed at 1.0x (32x48 on screen) -- smaller than the player (64px), creating clear protagonist hierarchy

Animation: 3-frame walk cycle at 4 FPS (matching the cozy, unhurried vibe).

### 6.5 Stuck Detection

In `NPCSystem.update()`, for each active NPC:
```ts
if (npc.behavior === 'walking') {
  const moved = distance(npc.sprite.x, npc.sprite.y, npc.lastX, npc.lastY);
  if (moved < 4) {
    npc.stuckTimer += delta;
    if (npc.stuckTimer > 3000) {
      // Teleport to nearest path node
      npc.sprite.setPosition(nearestNode.x, nearestNode.y);
      npc.stuckTimer = 0;
    }
  } else {
    npc.stuckTimer = 0;
  }
  npc.lastX = npc.sprite.x;
  npc.lastY = npc.sprite.y;
}
```

### 6.6 Adaptive Throttling

NPCs don't need 60 FPS updates. The system uses round-robin:

```ts
private updateIndex = 0;

update(delta: number, gameTimeMinutes: number): void {
  const fps = 1000 / delta;
  const npcsPerFrame = fps < 30 ? 2 : fps < 45 ? 3 : this.npcs.length;

  for (let i = 0; i < npcsPerFrame; i++) {
    const idx = (this.updateIndex + i) % this.npcs.length;
    this.updateNPC(this.npcs[idx], delta * (this.npcs.length / npcsPerFrame), gameTimeMinutes);
  }
  this.updateIndex = (this.updateIndex + npcsPerFrame) % this.npcs.length;
}
```

At 60 FPS: all 6 NPCs update every frame.
At 30 FPS: 2 NPCs per frame, each NPC updates every 3 frames. Scaled delta compensates.
Below 20 FPS: NPCs are visually less smooth but gameplay (player movement) stays responsive.

---

## 7. New Buildings and Decorations

### 7.1 Decorative Buildings (4 new, non-interactive)

These add visual density without gameplay. Placed along roads, slightly smaller than checkpoint buildings (scale 0.5 vs 0.6).

| Building | Visual Style | Location Rationale |
|----------|-------------|-------------------|
| **Bookshop** | Warm wood facade, bay window with book display, hanging sign | Near cinema (cultural district) |
| **Bakery** | Cream walls, orange awning, window with bread shapes, "FRESH" sign | Along main-street west |
| **Florist** | Green-trimmed white walls, window full of colorful circles (flowers), hanging basket | Main-street east |
| **Gift Shop** | Pastel purple facade, bow on door, display window with wrapped boxes | Near lakeside walk |

Each is 256x256 canvas, same as existing buildings. They get a subtle label text (like checkpoints do) but no glow, no interaction zone, no checkmark.

### 7.2 Decorations (17 new objects)

| Type | Count | Size | Visual |
|------|-------|------|--------|
| Bench | 6 | 48x32 | Wooden slats, armrests, warm brown |
| Mailbox | 3 | 24x40 | Red box on post |
| Signpost | 2 | 32x48 | Wooden post with arrow sign |
| Trash can | 2 | 20x28 | Small grey cylinder |
| Flower planter | 4 | 32x32 | Stone box with colorful flowers |
| Well | 1 | 48x48 | Stone circle with wooden crossbeam and bucket |
| Fountain | 1 | 48x48 | Stone basin, water effect (subtle blue circles) |
| Picnic blanket | 1 | 48x32 | Red-white checkered, on grass near park |

### 7.3 Expanded Trees and Nature

- Trees: increase from 12 to ~20 positions. Add clusters of 2-3 near park and home areas.
- Flower patches: increase from 6 to ~10. Add along lakeside-walk and near florist.
- Lamp posts: keep existing 8, add 4 more along new roads.
- Hedges/fences: keep existing 7 segments, add 3-4 more to define "yards" near decorative buildings.

---

## 8. Ambient Life Systems

Beyond NPCs, these small details make the world breathe:

### 8.1 Butterfly Particles (park area)
New particle emitter near the park/flower areas. Small colored dots (pink, yellow, white) that drift slowly in random directions. Very low frequency (1 every 2 seconds). Lifespan 6 seconds.

### 8.2 Fountain Water Effect
The fountain decoration gets a dedicated particle emitter: tiny blue-white dots that rise slightly then fall. Subtle and looping.

### 8.3 Bakery Smoke
Same as existing pizzeria smoke emitter, positioned at the bakery chimney.

### 8.4 Wind Effect on Trees (stretch goal)
Subtle: every 10-20 seconds, very slightly scale trees by 1-2% on X axis using a tween, creating a gentle sway. Low priority -- only if performance budget allows.

### 8.5 Ambient NPC Interactions
When two NPCs are within 48px of each other and both idle, they face each other for a few seconds (flip sprites toward each other). No speech bubbles, no UI -- just a subtle visual that implies conversation. Handled inside `NPCSystem.update()` with a simple proximity check.

---

## 9. Texture Generation Plan

### New Textures (added to `WorldRenderer.generateAllTextures()`)

**Ground tiles (2 new):**
1. `stone-tile` (32x32) -- grey cobblestone with subtle mortar lines
2. `dark-grass-tile` (32x32) -- same as grass but darker palette (#3a6835 base)

**Decorations (10 new):**
3. `bench` (48x32) -- brown wooden bench, side view
4. `mailbox` (24x40) -- red mailbox on wooden post
5. `signpost` (32x48) -- wooden post with directional arrow
6. `trashcan` (20x28) -- grey metallic cylinder with lid
7. `planter` (32x32) -- stone planter with flower dots on top
8. `well` (48x48) -- circular stone wall, wooden crossbar, rope
9. `fountain` (48x48) -- stone basin, water surface (blue gradient)
10. `picnic-blanket` (48x32) -- checkered red/white pattern

**Buildings (4 new):**
11. `building-bookshop` (256x256)
12. `building-bakery` (256x256)
13. `building-florist` (256x256)
14. `building-fountain-shop` (256x256)

**NPC sprites (6 new, 3 frames each):**
15-20. One texture atlas per NPC (32x48, 3 frames baked into spritesheet or 3 separate canvas textures like the player)

**Particle textures (1 new):**
21. `particle-butterfly` (10x10) -- small colored dot with tiny wing shapes

**Pre-rendered canvas (1):**
22. `ground-canvas` (1280x960) -- the full ground layer

**Total new textures: 22.** All generated synchronously in `generateAllTextures()` except `ground-canvas` which is generated as a separate step.

### Boot Loading Bar Update

Current `totalSteps`: 3 + (outfits * 2 * 2).
New: add 1 step for new tile/decoration textures, 1 step for decorative building textures, 1 step for NPC textures, 1 step for ground canvas. Total added: 4 steps.

---

## 10. Performance Budget and Optimizations

### Budget

| Metric | Target | Measurement |
|--------|--------|-------------|
| Ground draw calls | 1 | Single image |
| Total game objects | <100 | Down from ~1300+. Ground=1, buildings=10, decorations=~25, trees=~20, flowers=~10, lamps=~12, fences=~10, NPCs=6, players=2, particles=~5, UI=~5 |
| NPC updates per frame (60fps) | 6 | All NPCs every frame |
| NPC updates per frame (30fps) | 2 | Round-robin throttled |
| Boot time increase | <500ms | New textures are small canvases |
| Ground canvas memory | ~5 MB | 1280x960x4 bytes |
| Total texture memory | <20 MB | Existing + new well within browser limits |

### Optimizations Applied

1. **Ground canvas**: 1260 sprites -> 1 image. Biggest win.
2. **No SpatialGrid**: At 6 NPCs + 2 players, brute-force proximity checks are faster than any spatial structure. O(n^2) where n=8 is 28 comparisons. YAGNI.
3. **NPC throttling**: Round-robin update means NPC logic cost scales down with FPS.
4. **Static decorations**: Benches, mailboxes, etc. are plain `Phaser.GameObjects.Image` -- no physics bodies, no update logic.
5. **Seeded random**: Ground canvas is deterministic, so no need to regenerate or cache between sessions.
6. **Particle reuse**: Butterfly and fountain emitters use the same low-frequency, short-lifespan patterns as existing emitters.

### What We Explicitly Skip

- **SpatialGrid/QuadTree**: Not needed at this object count.
- **A* pathfinding**: BFS on 20-30 nodes is instant.
- **Shared MovementSystem for players + NPCs**: Player uses physics (Arcade body + velocity). NPCs use manual position updates. Different models, don't force them together.
- **Web Workers for texture gen**: Boot time is already <2s. Not worth the complexity.
- **Tile culling**: With 1 ground image, there's nothing to cull. Phaser's camera culling handles the rest.

---

## 11. Error Handling

### Texture Generation Failures

Existing pattern in `BootScene.ts` already handles this well: try/catch around async texture generation, fallback magenta canvas in dev mode. Extend the same pattern:

```ts
// In BootScene, after generating NPC textures:
for (const npcDef of NPCS) {
  for (let frame = 0; frame < 3; frame++) {
    const key = `npc-${npcDef.id}-frame-${frame}`;
    if (!this.textures.exists(key)) {
      console.warn(`Missing NPC texture: ${key}, using fallback`);
      this.textures.addCanvas(key, fallbackCanvas);
    }
  }
}
```

### NPC Runtime Errors

- **Stuck detection** (Section 6.5): Teleport to nearest node after 3s stuck.
- **Missing route**: If a schedule references a non-existent route name, NPC falls back to idle behavior. Logged as warning.
- **BFS failure**: If no path found, teleport NPC. Logged as warning.
- **No excessive try/catch**: The NPC update loop does not wrap every NPC in try/catch. If one NPC throws, it bubbles to the scene's error handler. This is intentional -- a thrown error in dev means a bug to fix, not something to swallow.

### Ground Canvas Failure

If `getContext('2d')` fails for the ground canvas (extremely rare), fall back to the current individual-sprite approach. The `createMap()` method checks for the texture:

```ts
if (this.textures.exists('ground-canvas')) {
  this.add.image(mapW * 16, mapH * 16, 'ground-canvas');
} else {
  // Legacy: individual tiles
  this.createMapLegacy();
}
```

---

## 12. 8-Step Migration Plan

Each step produces a fully working, shippable game. No step depends on a future step.

### Step 1: Seeded Random + Map Data File

**Files**: `canvasUtils.ts` (add `createSeededRandom`), `mapLayout.ts` (new, with tile grid builder, road definitions, decoration coordinates, decorative building defs)

**Validates**: TypeScript compiles. Data structures are well-typed. Seeded random produces deterministic output.

**Game state after**: Identical to current. No visual changes.

---

### Step 2: Pre-Rendered Ground Canvas

**Files**: `WorldRenderer.ts` (add `generateStoneTile`, `generateDarkGrassTile`, `generatePreRenderedGround`), `BootScene.ts` (call ground canvas generator), `WorldScene.ts` (replace tile loops with single image)

**What changes**:
- `generatePreRenderedGround()` reads the tile grid, paints each tile, applies edge blending
- `createMap()` uses single `ground-canvas` image instead of 1260 individual sprites
- Existing dirt cross-path still visible, now with softer edges
- New stone path tiles visible where defined in `ROADS`

**Validates**: Ground renders correctly. Performance measurably improved (check Phaser's game object count). Roads have soft blended edges into grass.

**Game state after**: Visually similar but with more road variety and dramatically fewer draw calls.

---

### Step 3: New Decoration Textures

**Files**: `WorldRenderer.ts` (add all decoration texture generators: bench, mailbox, signpost, trashcan, planter, well, fountain, picnic-blanket), `BootScene.ts` (update totalSteps)

**What changes**: 10 new texture generators added. All called from `generateAllTextures()`.

**Validates**: All textures generate without error. Can inspect via Phaser texture manager in console.

**Game state after**: No visual changes yet (textures exist but aren't placed).

---

### Step 4: Place Decorations and Expanded Nature

**Files**: `WorldScene.ts` (update `createMap()` to place decorations, more trees, more flowers)

**What changes**:
- Decorations from `DECORATIONS` array placed as static images with depth sorting
- Tree count increased from 12 to ~20
- Flower patches increased from 6 to ~10
- Additional lamp posts and fence segments
- Well and fountain placed as visual landmarks

**Validates**: All decorations render at correct positions. Depth sorting works (player walks behind/in front correctly). No z-fighting.

**Game state after**: World feels notably more detailed and furnished. Benches, a well, mailboxes, planters.

---

### Step 5: Decorative Buildings

**Files**: `WorldRenderer.ts` (add 4 new building generators), `WorldScene.ts` (place decorative buildings from `DECORATIVE_BUILDINGS`, with labels)

**What changes**:
- Bookshop, bakery, florist, gift shop appear on the map
- Each has a small text label (like checkpoints) but no glow, no zone, no interaction
- Positioned along roads to create a "town" feel

**Validates**: Buildings render. Labels show. No interaction triggers. Player walks past them normally.

**Game state after**: The map now looks like a small town with 10 buildings total (6 checkpoint + 4 decorative).

---

### Step 6: NPC Textures and System Skeleton

**Files**: `WorldRenderer.ts` (add `generateNPCTexture`), `NPCSystem.ts` (new, full implementation), `BootScene.ts` (generate NPC textures)

**What changes**:
- 6 NPC sprite textures generated at boot (3 frames each)
- `NPCSystem` class created with spawning, behavior strategies, BFS, and update loop
- NPCs not yet added to WorldScene (just the system exists)

**Validates**: NPC textures generate. NPCSystem can be instantiated without errors in isolation.

**Game state after**: No visual changes yet. System is ready.

---

### Step 7: NPCs in the World

**Files**: `WorldScene.ts` (add `createNPCs()`, call `npcSystem.update()` in `update()`)

**What changes**:
- 6 NPCs appear on the map, walking their default routes
- Schedule system active: NPCs change behavior based on game time
- Stuck detection active
- Adaptive throttling active
- NPCs depth-sorted with player
- Proximity-based "facing" behavior for idle NPC pairs

**Validates**: NPCs walk correctly. No NPCs get stuck permanently. NPCs respect schedules. Performance stays at target FPS. NPCs sort correctly with player sprite.

**Game state after**: The world is alive. Townspeople walk around, sit on benches, idle near shops.

---

### Step 8: Ambient Particles and Polish

**Files**: `ParticleConfigs.ts` (add butterfly and fountain configs), `WorldScene.ts` (add new particle emitters, add bakery smoke emitter)

**What changes**:
- Butterfly particles near park
- Fountain water effect
- Bakery chimney smoke
- Optional: tree sway tween (only if FPS budget allows)

**Validates**: Particles render. FPS stays above 50 on target devices. No particle leaks (lifespan finite).

**Game state after**: Fully alive world. Butterflies drift through the park, fountains bubble, smoke rises from chimneys. Cozy, warm, charming.

---

## Summary of Changes by Numbers

| Metric | Before | After |
|--------|--------|-------|
| Ground game objects | ~1260 | 1 |
| Total game objects | ~1310 | ~100 |
| Buildings | 6 | 10 |
| Decorations | ~26 (trees+flowers+lamps+fences) | ~60 |
| NPCs | 0 | 6 |
| Road tiles | ~60 (1 cross-path) | ~200 (7 named roads) |
| Particle emitters | 4 | 7 |
| New source files | 0 | 2 |
| Modified source files | 0 | 5 |
