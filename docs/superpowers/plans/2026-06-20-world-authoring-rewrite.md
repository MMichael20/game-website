# World Authoring Rewrite — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hand-assembled world with a registry of parameterized objects + a single map manifest + an engine that emits mesh/collider/obstacle/anchor/POI from one definition, then build a first slice: ground + street + a phone repair shop + a restaurant + the player.

**Architecture:** Three new layers under `src/world/system/` (types, registry, transform, engine) and a catalog under `src/world/catalog/`. Objects build in local space and the engine applies a `{x,z,rot}` transform to every facet at once. The current runtime (`core/`, player, camera, physics, sky) is kept; the old hand-builders are left in the tree but no longer invoked.

**Tech Stack:** TypeScript, Three.js (0.169), @dimforge/rapier3d-compat, Vite. Vitest exists but is **paused** for this work (see Global Constraints).

## Global Constraints

- **Determinism:** no `Math.random()` / `Date.now()` / argless `new Date()` in any builder. Seed via `src/world/rng.ts` if randomness is needed. (Copied from spec.)
- **Process / gate (bootstrap mode):** the test suite is quarantined. The gate for every task is `npx tsc --noEmit` clean + `npx vite build` succeeds. The ONE exception is Task 2 (transform math), which keeps a focused Vitest test. Do **not** run the full suite per task.
- **Rotation is restricted to 90° increments** (`rot ∈ {0, 90, 180, 270}`) so collider/obstacle AABBs stay axis-aligned. Decision logged in spec.
- **Units & convention:** ~1u = 1m. Objects build centered on x=z=0, base at y=0, canonical facing +z (front toward +z). The engine's transform rotates/translates from there.
- **Visual target:** `assets/design-examples/` (phone-repair-shop-location-v1.png, restaurant-street-v1.png, design-example-shop-street.png).
- **Do NOT delete old `src/world/*` files** — they stay compiling; just stop invoking them. Only `test/` is moved (quarantined).

---

### Task 1: Core types + registry

**Files:**
- Create: `src/world/system/types.ts`
- Create: `src/world/system/registry.ts`

**Interfaces:**
- Produces: `Vec2`, `Box`, `Rect`, `Seat`, `PoiSpec`, `ObjectResult`, `ObjectDef<P>`, `Placement` (types.ts); `defineObject(kind, def)`, `buildObject(kind, params?) → ObjectResult`, `hasObject(kind) → boolean`, `objectKinds() → string[]` (registry.ts).

- [ ] **Step 1: Write `src/world/system/types.ts`**

```ts
import type * as THREE from "three";

export interface Vec2 { x: number; z: number }
/** Axis-aligned collider box (Rapier cuboid): center (x,y,z), half-extents (hx,hy,hz). */
export interface Box { x: number; y: number; z: number; hx: number; hy: number; hz: number }
/** NPC-avoid footprint rect: center (x,z), full size (w,d). */
export interface Rect { x: number; z: number; w: number; d: number }
/** A named seat: a point plus the yaw an NPC faces when sitting. */
export interface Seat extends Vec2 { faceYaw: number }
/** A point-of-interest tied to one of the object's anchors by name. */
export interface PoiSpec { kind: string; label: string; radius: number; anchor: string }

/** Everything an object knows about itself, in LOCAL space (centered on origin). */
export interface ObjectResult {
  mesh: THREE.Object3D;
  colliders?: Box[];
  obstacles?: Rect[];
  anchors?: Record<string, Vec2 | Seat>;
  pois?: PoiSpec[];
}

/** A registered object type: default params + a pure builder. */
export interface ObjectDef<P extends object> {
  params: P;
  build(p: P): ObjectResult;
}

/** One placed instance in the map manifest. rot is degrees in {0,90,180,270}. */
export interface Placement {
  kind: string;
  x?: number;
  z?: number;
  rot?: number;
  params?: Record<string, unknown>;
}
```

- [ ] **Step 2: Write `src/world/system/registry.ts`**

```ts
import type { ObjectDef, ObjectResult } from "./types";

const REGISTRY = new Map<string, ObjectDef<object>>();

export function defineObject<P extends object>(kind: string, def: ObjectDef<P>): void {
  if (REGISTRY.has(kind)) throw new Error(`object kind already defined: ${kind}`);
  REGISTRY.set(kind, def as unknown as ObjectDef<object>);
}

export function hasObject(kind: string): boolean {
  return REGISTRY.has(kind);
}

export function objectKinds(): string[] {
  return [...REGISTRY.keys()];
}

/** Build an instance: merge caller params over the type defaults, then build(). */
export function buildObject(kind: string, params?: Record<string, unknown>): ObjectResult {
  const def = REGISTRY.get(kind);
  if (!def) throw new Error(`unknown object kind: ${kind}`);
  const merged = { ...def.params, ...(params ?? {}) };
  return def.build(merged);
}
```

- [ ] **Step 3: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/world/system/types.ts src/world/system/registry.ts
git commit -m "feat(world): object registry + facet types"
```

---

### Task 2: Transform (the one tested unit)

**Files:**
- Create: `src/world/system/transform.ts`
- Test: `test/transform.test.ts` (the single focused test kept during bootstrap — created BEFORE the quarantine in Task 8)

**Interfaces:**
- Consumes: `Vec2`, `Seat`, `Box`, `Rect`, `ObjectResult` (Task 1).
- Produces: `rotateXZ(x, z, deg) → Vec2`, `applyTransform(result, t) → ObjectResult` where `t = { x, z, rot }`.

- [ ] **Step 1: Write the failing test `test/transform.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import * as THREE from "three";
import { rotateXZ, applyTransform } from "../src/world/system/transform";
import type { ObjectResult } from "../src/world/system/types";

describe("rotateXZ", () => {
  it("matches a three.js R_y rotation for 90-degree steps", () => {
    for (const deg of [0, 90, 180, 270]) {
      const obj = new THREE.Object3D();
      obj.rotation.y = (deg * Math.PI) / 180;
      obj.updateMatrixWorld(true);
      const p = new THREE.Vector3(2, 0, 5).applyMatrix4(obj.matrixWorld);
      const r = rotateXZ(2, 5, deg);
      expect(r.x).toBeCloseTo(p.x, 6);
      expect(r.z).toBeCloseTo(p.z, 6);
    }
  });
});

describe("applyTransform", () => {
  it("moves the mesh and the collider/anchor together", () => {
    const result: ObjectResult = {
      mesh: new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1)),
      colliders: [{ x: 1, y: 0.5, z: 0, hx: 0.5, hy: 0.5, hz: 0.5 }],
      anchors: { door: { x: 0, z: 2 } },
    };
    const out = applyTransform(result, { x: 10, z: 20, rot: 90 });
    // door local (0,2) -> rotateXZ(0,2,90) = (2,0) -> +(10,20) = (12,20)
    expect(out.anchors!.door.x).toBeCloseTo(12, 6);
    expect(out.anchors!.door.z).toBeCloseTo(20, 6);
    // collider center (1,0) -> (0,-1) -> (10,19)
    expect(out.colliders![0].x).toBeCloseTo(10, 6);
    expect(out.colliders![0].z).toBeCloseTo(19, 6);
  });

  it("swaps box/rect extents for 90 and 270", () => {
    const result: ObjectResult = {
      mesh: new THREE.Object3D(),
      colliders: [{ x: 0, y: 1, z: 0, hx: 3, hy: 1, hz: 0.5 }],
      obstacles: [{ x: 0, z: 0, w: 6, d: 1 }],
    };
    const out = applyTransform(result, { x: 0, z: 0, rot: 90 });
    expect(out.colliders![0].hx).toBeCloseTo(0.5, 6);
    expect(out.colliders![0].hz).toBeCloseTo(3, 6);
    expect(out.obstacles![0].w).toBeCloseTo(1, 6);
    expect(out.obstacles![0].d).toBeCloseTo(6, 6);
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npx vitest run test/transform.test.ts`
Expected: FAIL ("rotateXZ is not a function" / module not found).

- [ ] **Step 3: Write `src/world/system/transform.ts`**

```ts
import * as THREE from "three";
import type { ObjectResult, Vec2, Seat, Box, Rect } from "./types";

export interface Transform { x: number; z: number; rot: number } // rot: degrees in {0,90,180,270}

/** Rotate a point in the xz-plane about the origin by `deg`, matching three.js R_y. */
export function rotateXZ(x: number, z: number, deg: number): Vec2 {
  const t = (deg * Math.PI) / 180;
  const c = Math.cos(t), s = Math.sin(t);
  return { x: x * c + z * s, z: -x * s + z * c };
}

const isSeat = (a: Vec2 | Seat): a is Seat => "faceYaw" in a;
const swap = (deg: number) => deg === 90 || deg === 270;

/** Apply a placement transform to every facet of an object result. */
export function applyTransform(result: ObjectResult, t: Transform): ObjectResult {
  const rad = (t.rot * Math.PI) / 180;

  // Mesh: a parent group carries the exact rotation+translation (normals preserved).
  const group = new THREE.Group();
  group.position.set(t.x, 0, t.z);
  group.rotation.y = rad;
  group.add(result.mesh);

  const colliders: Box[] | undefined = result.colliders?.map((b) => {
    const c = rotateXZ(b.x, b.z, t.rot);
    return {
      x: c.x + t.x, y: b.y, z: c.z + t.z,
      hx: swap(t.rot) ? b.hz : b.hx, hy: b.hy, hz: swap(t.rot) ? b.hx : b.hz,
    };
  });

  const obstacles: Rect[] | undefined = result.obstacles?.map((r) => {
    const c = rotateXZ(r.x, r.z, t.rot);
    return { x: c.x + t.x, z: c.z + t.z, w: swap(t.rot) ? r.d : r.w, d: swap(t.rot) ? r.w : r.d };
  });

  let anchors: Record<string, Vec2 | Seat> | undefined;
  if (result.anchors) {
    anchors = {};
    for (const [name, a] of Object.entries(result.anchors)) {
      const c = rotateXZ(a.x, a.z, t.rot);
      anchors[name] = isSeat(a)
        ? { x: c.x + t.x, z: c.z + t.z, faceYaw: a.faceYaw + rad }
        : { x: c.x + t.x, z: c.z + t.z };
    }
  }

  return { mesh: group, colliders, obstacles, anchors, pois: result.pois };
}
```

- [ ] **Step 4: Run the test to confirm it passes**

Run: `npx vitest run test/transform.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/world/system/transform.ts test/transform.test.ts
git commit -m "feat(world): placement transform (mesh+collider+anchor) with test"
```

---

### Task 3: Engine

**Files:**
- Create: `src/world/system/engine.ts`

**Interfaces:**
- Consumes: `buildObject` (Task 1), `applyTransform` (Task 2), `Placement`, `Box`, `Rect`, `Vec2`, `Seat`, `PoiSpec`.
- Produces: `BuiltWorld = { group: THREE.Group; colliders: Box[]; obstacles: Rect[]; anchors: Record<string, Vec2|Seat>; pois: ResolvedPoi[] }`; `ResolvedPoi = { kind; label; radius; x; z }`; `buildWorld(manifest: Placement[]) → BuiltWorld`.

- [ ] **Step 1: Write `src/world/system/engine.ts`**

```ts
import * as THREE from "three";
import type { Placement, Box, Rect, Vec2, Seat } from "./types";
import { buildObject } from "./registry";
import { applyTransform } from "./transform";

export interface ResolvedPoi { kind: string; label: string; radius: number; x: number; z: number }
export interface BuiltWorld {
  group: THREE.Group;
  colliders: Box[];
  obstacles: Rect[];
  anchors: Record<string, Vec2 | Seat>;
  pois: ResolvedPoi[];
}

/** Walk the manifest: build each object, transform it, aggregate every facet. */
export function buildWorld(manifest: Placement[]): BuiltWorld {
  const group = new THREE.Group();
  group.name = "world";
  const colliders: Box[] = [];
  const obstacles: Rect[] = [];
  const anchors: Record<string, Vec2 | Seat> = {};
  const pois: ResolvedPoi[] = [];

  manifest.forEach((p, i) => {
    const built = buildObject(p.kind, p.params);
    const placed = applyTransform(built, { x: p.x ?? 0, z: p.z ?? 0, rot: p.rot ?? 0 });
    group.add(placed.mesh);
    if (placed.colliders) colliders.push(...placed.colliders);
    if (placed.obstacles) obstacles.push(...placed.obstacles);
    // Anchors namespaced by placement so two of the same kind don't collide.
    if (placed.anchors) {
      for (const [name, a] of Object.entries(placed.anchors)) anchors[`${p.kind}.${i}.${name}`] = a;
    }
    // POIs resolve their position from the (already transformed) named anchor.
    if (built.pois && placed.anchors) {
      for (const poi of built.pois) {
        const a = placed.anchors[poi.anchor];
        if (a) pois.push({ kind: poi.kind, label: poi.label, radius: poi.radius, x: a.x, z: a.z });
      }
    }
  });

  return { group, colliders, obstacles, anchors, pois };
}
```

- [ ] **Step 2: Verify compile**

Run: `npx tsc --noEmit`
Expected: no errors (engine is unused until Task 8 — that's fine).

- [ ] **Step 3: Commit**

```bash
git add src/world/system/engine.ts
git commit -m "feat(world): engine walks manifest and aggregates facets"
```

---

### Task 4: Ground, road, and primitive registrations

**Files:**
- Create: `src/world/catalog/primitives.ts`
- Create: `src/world/catalog/index.ts`

**Interfaces:**
- Consumes: `defineObject` (Task 1); `ObjectResult` types; existing `src/world/objects/voxel.ts` (`tintedBox`, `mergeTinted`, `tintedMesh`), `src/world/objects/flower.ts` (`makeFlower`), `src/world/props.ts` (`treeInstances`/tree geometry — if awkward to reuse, build a simple voxel tree), `src/world/roads.ts` (`makeAsphaltTexture`, `makeSidewalkTexture`, `GRAIN_M`, `PAVER_SUPER_M`, `ROAD_W`).
- Produces: registered kinds `ground`, `road`, `tree`, `flower`, `lamp`, `planter`, `bench`. `index.ts` exports `registerCatalog()` that imports all catalog modules so registration side-effects run once.

Notes for the implementer:
- Each `defineObject` returns an `ObjectResult` with `mesh` in LOCAL space (centered on origin, base y=0, front +z). Reuse existing geometry helpers; where an existing helper places at world coords, build at origin instead.
- `ground`: params `{ size: number, center?: never }` default `{ size: 220 }`; a flat green `THREE.Mesh(PlaneGeometry)` rotated to xz at y=0, plus ONE `colliders: [{x:0,y:-0.1,z:0,hx:size/2,hy:0.1,hz:size/2}]`. (The engine places it at the manifest's x/z.)
- `road`: params `{ length: 60 }`; reuse the look from the retired `makeRoad` (raised asphalt box 0.12 thick at y=0.06, two curbs, double-yellow center) built centered at origin running along x. No collider (roads are walkable). Width = `ROAD_W`.
- `tree`, `flower`, `lamp`, `planter`, `bench`: thin wrappers that build the existing voxel geometry at origin and return `{ mesh, obstacles?: [footprint] }`. Trees/planters/benches/lamps get an `obstacles` rect (chunky); flowers do not.

- [ ] **Step 1: Implement `src/world/catalog/primitives.ts`** — one `defineObject(...)` per kind above, each returning local-space `ObjectResult`. Build geometry by reuse; keep determinism.

(Implementer: write the real builders here following the notes; ~150-200 lines. Use `tintedBox`/`mergeTinted`/`tintedMesh` for voxel shapes and the road textures from `roads.ts`.)

- [ ] **Step 2: Implement `src/world/catalog/index.ts`**

```ts
// Importing this module registers every catalog object (side-effect imports).
import "./primitives";
// later: import "./buildings"; import "./stores";

/** Call once at startup to guarantee the catalog modules have been evaluated. */
export function registerCatalog(): void { /* imports above run the defineObject calls */ }
```

- [ ] **Step 3: Verify compile + build**

Run: `npx tsc --noEmit && npx vite build`
Expected: both succeed.

- [ ] **Step 4: Commit**

```bash
git add src/world/catalog/primitives.ts src/world/catalog/index.ts
git commit -m "feat(world): catalog primitives (ground, road, tree, flower, lamp, planter, bench)"
```

---

### Task 5: Building shell + storefront primitives

**Files:**
- Create: `src/world/catalog/buildings.ts`
- Modify: `src/world/catalog/index.ts` (add `import "./buildings";`)

**Interfaces:**
- Consumes: `defineObject`; `src/world/objects/voxel.ts`; existing `src/world/storefront.ts` `makeStorefront` (reuse for the glass facade — call it with `x: 0, frontZ: d/2` so it builds in local space, front at +z).
- Produces: registered kinds `buildingShell` (params `{ w, d, h }`) and `storefront` (params `{ w, h, signText, awningColor, fullGlassFront }`).

Notes:
- `buildingShell`: hollow shell (floor, ceiling, back wall at -z, two side walls), front OPEN at +z. Returns `mesh` + `colliders` = the four walls + two short front returns flanking the open front (reuse the wall layout from the retired `restaurantColliders.shellWalls`, but in LOCAL space centered on origin: back at `-d/2`, front at `+d/2`, sides at `±w/2`). The open center front has no collider so the player walks in.
- `storefront`: wrap `makeStorefront({ x:0, frontZ: d/2, w, h, signText, awningColor, glassStyle:"storefront", doorSide:"center", fullGlassFront })`. Discard its obstacles (the shell provides collision). Return just `{ mesh }`. (Pass `d` via params too, default small e.g. 0.6 isn't needed — `makeStorefront` uses its own shallow depth; place its `frontZ` at the shell's front `+d/2`.)

- [ ] **Step 1: Implement `src/world/catalog/buildings.ts`** per the notes (real code, ~120 lines). Keep determinism.

- [ ] **Step 2: Add `import "./buildings";` to `src/world/catalog/index.ts`.**

- [ ] **Step 3: Verify compile + build**

Run: `npx tsc --noEmit && npx vite build`
Expected: both succeed.

- [ ] **Step 4: Commit**

```bash
git add src/world/catalog/buildings.ts src/world/catalog/index.ts
git commit -m "feat(world): buildingShell + storefront catalog objects"
```

---

### Task 6: `phoneRepairShop` and `restaurant` composites

**Files:**
- Create: `src/world/catalog/stores.ts`
- Modify: `src/world/catalog/index.ts` (add `import "./stores";`)

**Interfaces:**
- Consumes: `defineObject`; `buildObject` (to nest primitives — call `buildObject("buildingShell", {...})`, `buildObject("counter"...)` etc.) OR call the underlying builders directly; existing `kits.ts` `makeCounterKit`, `makeDisplayShelf` and `objects/phone.ts` `makePhone`.
- Produces: registered kinds `phoneRepairShop` and `restaurant`.

Composite pattern (both stores): build a `buildingShell`, place a `storefront` at its front, add interior furniture, then **merge child `ObjectResult`s**: concat their `colliders`/`obstacles`, collect named `anchors`, and `group.add` their meshes. A small local helper `compose(parts: {result, dx?, dz?}[])` that offsets each part is fine. All in LOCAL space, front +z.

- `phoneRepairShop` (params `{ w: 18, d: 14, h: 6 }`): shell + full-glass storefront (`signText: "Phone Repair"`, `fullGlassFront: true`, `awningColor` blue) + a counter near the back + a row of wall display shelves + a few `makePhone` props on the counter. Anchors: `door` (front center, `{x:0, z:d/2}`), `counter` (`{x:0, z:-d/2+2}`), `staff` (just behind counter). POIs: `[{ kind:"phoneShop", label:"Phone Repair", radius:4.5, anchor:"door" }]`.
- `restaurant` (params `{ w: 12, d: 10, h: 7, variant: "bakery" }`): shell + storefront (`signText` from variant, awning red) + counter + 2 indoor tables each with 4 chairs (reuse a `table`/`chair` primitive — if not present, add minimal ones to `primitives.ts` in this task) + seats as anchors. Anchors: `door`, `counter`, `seat0..seatN`. POIs: `[{ kind:"restaurant", label:"Restaurant", radius:4.5, anchor:"door" }]`.

Notes:
- If `table`/`chair` primitives are missing, add them to `primitives.ts` here (small voxel builders) and register them.
- Keep each store self-contained: reading `stores.ts` tells you the whole store.

- [ ] **Step 1: Implement `src/world/catalog/stores.ts`** (real code; reuse shell/storefront/counter/shelf/phone). Add `table`/`chair` primitives if needed.

- [ ] **Step 2: Add `import "./stores";` to `index.ts`.**

- [ ] **Step 3: Verify compile + build**

Run: `npx tsc --noEmit && npx vite build`
Expected: both succeed.

- [ ] **Step 4: Commit**

```bash
git add src/world/catalog/stores.ts src/world/catalog/index.ts src/world/catalog/primitives.ts
git commit -m "feat(world): phoneRepairShop + restaurant composite objects"
```

---

### Task 7: Map manifest

**Files:**
- Create: `src/world/map.ts`

**Interfaces:**
- Consumes: `Placement` type.
- Produces: `export const MAP: Placement[]`; `export const PLAYER_SPAWN: Vec2`; `export const CAR_SPAWN: Vec2`; `export const GROUND_SIZE = 220`.

- [ ] **Step 1: Write `src/world/map.ts`** — the readable single source of the slice:

```ts
import type { Placement, Vec2 } from "./system/types";

export const GROUND_SIZE = 220;
export const PLAYER_SPAWN: Vec2 = { x: 0, z: 8 };
export const CAR_SPAWN: Vec2 = { x: 12, z: 10 };

// THE MAP. Reading this list is seeing the world. Coordinates are world-space;
// rot is degrees in {0,90,180,270}. Stores face +z by default (rot:0).
export const MAP: Placement[] = [
  { kind: "ground", params: { size: GROUND_SIZE } },
  { kind: "road", x: 0, z: -6, params: { length: 80 } },
  { kind: "phoneRepairShop", x: -12, z: -16 },
  { kind: "restaurant", x: 12, z: -16, params: { variant: "bakery" } },
  // a little street life from the reference images
  { kind: "tree", x: 24, z: -10 }, { kind: "lamp", x: 6, z: -11 }, { kind: "lamp", x: -6, z: -11 },
  { kind: "planter", x: 0, z: -12 }, { kind: "bench", x: 18, z: -11 },
  { kind: "flower", x: 1, z: -12, params: { color: "red" } },
];
```

- [ ] **Step 2: Verify compile**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/world/map.ts
git commit -m "feat(world): map manifest for slice #1 (two stores + street)"
```

---

### Task 8: Wire the engine into the runtime; quarantine tests; rewrite CLAUDE.md

**Files:**
- Modify: `src/world/World.ts` (replace its body with the engine path)
- Modify: `src/main.ts` (drop the `RISHON_MAP`/`validateMap` dependency for World construction; keep minimap construction harmless)
- Modify: `src/game/Game.ts` (disable scripted patrons + NpcCars + old POIS for the clean slice; keep player + own car)
- Move: `test/` → `test/_legacy/` EXCEPT `test/transform.test.ts` (stays at `test/transform.test.ts`)
- Rewrite: `CLAUDE.md`

**Interfaces:**
- Consumes: `buildWorld` (Task 3), `registerCatalog` (Task 4), `MAP`/`PLAYER_SPAWN`/`CAR_SPAWN`/`GROUND_SIZE` (Task 7), `Physics`/`RAPIER`, `makeClouds`, sky (kept).

- [ ] **Step 1: Rewrite `src/world/World.ts`**

```ts
import * as THREE from "three";
import { Physics, RAPIER } from "../core/Physics";
import { makeClouds } from "./clouds";
import { registerCatalog } from "./catalog";
import { buildWorld, type ResolvedPoi } from "./system/engine";
import { MAP, PLAYER_SPAWN, CAR_SPAWN, GROUND_SIZE } from "./map";

// New world: the whole scene comes from the manifest + engine. core/ runtime,
// player, camera, physics and sky are unchanged.
export class World {
  readonly pois: ResolvedPoi[];
  readonly groundSize = GROUND_SIZE;
  readonly groundCenter = { x: 0, z: 0 };

  constructor(scene: THREE.Scene, physics: Physics) {
    registerCatalog();
    const built = buildWorld(MAP);
    scene.add(built.group);

    const clouds = makeClouds();
    scene.add(clouds);

    for (const c of built.colliders) {
      const body = physics.world.createRigidBody(
        RAPIER.RigidBodyDesc.fixed().setTranslation(c.x, c.y, c.z),
      );
      physics.world.createCollider(RAPIER.ColliderDesc.cuboid(c.hx, c.hy, c.hz), body);
    }
    this.pois = built.pois;
  }

  get playerSpawn() { return PLAYER_SPAWN; }
  get carSpawn() { return CAR_SPAWN; }
}
```

- [ ] **Step 2: Update `src/main.ts`** — construct `new World(engine.scene, physics)` (no map arg). Remove the `validateMap(RISHON_MAP)` block and the `RISHON_MAP` import if now unused. Keep the `Minimap` construction but pass an empty-roads map or guard it (read main.ts; if Minimap requires a `RishonMap`, pass a minimal literal `{ ground: { size: 220, center: {x:0,z:0} }, roads: [], buildings: [], npcSpawns: [], carSpawn: {x:12,z:10}, playerSpawn: {x:0,z:8}, props: [] }`).

- [ ] **Step 3: Update `src/game/Game.ts`** — for the clean slice, stop spawning old content:
  - Comment out the scripted patrons loop (`for (const patron of spawnPatrons(scene)) ...`).
  - Comment out the two `NpcCar` additions and the `streetLoop`/`streetLoopB` consts.
  - Replace `buildingRects(world.map.buildings, 1.5)` with `const rects: Rect[] = [];` and `world.map.ground...` with `world.groundCenter`/`world.groundSize`.
  - If `POIS = locationPois()` causes issues, set `const POIS = world.pois`-style is out of scope; keep `POIS` but it may be empty — fine. Do whatever keeps `tsc` green with the new `World` shape.

- [ ] **Step 4: Quarantine tests**

```bash
mkdir -p test/_legacy
git mv test/*.test.ts test/_legacy/ 2>/dev/null || true
git mv test/_legacy/transform.test.ts test/transform.test.ts
```
(Result: only `test/transform.test.ts` runs; the rest are parked in `test/_legacy/`.)

- [ ] **Step 5: Rewrite `CLAUDE.md`** with the new, lighter workflow:
  - Describe the registry / manifest / engine model and the facet contract (one `build()` returns mesh + colliders + obstacles + anchors + pois).
  - "How to add an object" (`defineObject` in `catalog/`, return facets, build at local origin front +z) and "how to place one" (one line in `src/world/map.ts`).
  - Keep the determinism rule. Note rotation is 90° increments.
  - State the bootstrap gate: `npx tsc --noEmit` + `npx vite build` + visual check; full tests are paused in `test/_legacy/` and return, focused, when the foundation is stable / heading to production.
  - Point the visual target at `assets/design-examples/`.
  - Remove the obsolete anti-drift rules (now automatic).

- [ ] **Step 6: Verify the gate**

Run: `npx tsc --noEmit && npx vite build && npx vitest run test/transform.test.ts`
Expected: tsc clean, build succeeds, transform test passes.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(world): wire engine into runtime; quarantine tests; rewrite CLAUDE.md"
```

---

## Self-Review

- **Spec coverage:** registry (T1), facet contract (T1 types + used T4-6), transform/local-origin (T2), manifest (T7), engine (T3), composites reuse primitives (T6), keep-engine/retire-old (T8), two-store slice (T6/T7), quarantine tests + new gate + CLAUDE.md rewrite (T8), visual target referenced (constraints + T8). Covered.
- **Placeholder scan:** foundation tasks (T1-3, T7, T8 World) carry full code. Object tasks (T4-6) are recipe + reuse — acceptable because they compose existing, audited builders and the orchestrator reviews each task's diff before the next. No "TBD".
- **Type consistency:** `ObjectResult`, `Box`, `Rect`, `Vec2`, `Seat`, `PoiSpec`, `Placement` defined in T1 and used unchanged in T2/T3/T4-6; `buildWorld`/`BuiltWorld`/`ResolvedPoi` from T3 used in T8; `MAP`/`PLAYER_SPAWN`/`CAR_SPAWN`/`GROUND_SIZE` from T7 used in T8. Consistent.

## Decisions (also logged in spec Assumptions & Decisions)

- Rotation restricted to 90° increments → axis-aligned colliders, simple swap math.
- Old `src/world/*` files kept compiling, not deleted; only `test/` quarantined.
- Slice #1 disables scripted NPCs/static people/old POIs for a clean two-store scene; they return in a later slice.
- HUD/minimap kept on their existing (now mostly empty) data for slice #1; wiring engine POIs into them is deferred.
