# Rishon 3D — Stabilize & Expand — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stabilize the rishon3d architecture (fixed-timestep physics, shared asset cache, instanced props, entity manager) and expand content (procedural districts, NPC cars, bushes, cats, dogs, more pedestrians).

**Architecture:** Foundations first (Part A) so content (Parts B/C) is built on cheap, reusable primitives. Pure logic (city generation, path following, accumulator, culling, population planning) lives in three.js-free modules with vitest tests; three.js builders consume them.

**Tech Stack:** TypeScript, Three.js 0.169, Rapier3d-compat 0.14, Vite, Vitest, Playwright.

## Global Constraints

- All work stays in worktree `worktree-3d-spike`. Do NOT merge to master or deploy.
- Everything stays procedural primitives — no external/GLTF art assets.
- Pure modules (`cityGen`, `pathFollow`, `rng`, `timestep`, `culling`, `populate`, `wander`, `cameraMath`, `InteractionSystem`) MUST NOT import three.js or touch the DOM.
- No `Math.random()` in pure generator modules — use the seeded `mulberry32` RNG so tests are deterministic.
- `validateMap` must keep passing: exactly one house, all spawns/props in bounds, no core npcSpawn inside any building.
- Run from `rishon3d/`: `npm test`, `npm run build`, `npm run test:smoke`.
- Commit after each task. No emojis in committed files.

---

## File Structure

**Part A — stability**
- Create `rishon3d/src/core/timestep.ts` — pure accumulator.
- Modify `rishon3d/src/core/Physics.ts` — use accumulator.
- Create `rishon3d/src/world/assets.ts` — shared geometry/material cache.
- Create `rishon3d/src/world/InstancedProps.ts` — InstancedMesh builder.
- Create `rishon3d/src/game/culling.ts` — pure range check.
- Create `rishon3d/src/game/EntityManager.ts` — agent registry + cull update.

**Part B — world**
- Create `rishon3d/src/world/rng.ts` — seeded RNG.
- Create `rishon3d/src/world/districts.ts` — district types + specs.
- Create `rishon3d/src/world/cityGen.ts` — pure district generator.
- Create `rishon3d/src/world/worldData.ts` — assembleMap() combining core + districts.
- Modify `rishon3d/src/world/rishonMap.ts` — add `bush` PropKind; keep core map as `CORE_MAP`; `RISHON_MAP = assembleMap()`.
- Modify `rishon3d/src/world/props.ts` — `makeBush`; use asset cache; instanced-friendly geometries.
- Create `rishon3d/src/entities/Animal.ts` — quadruped (cat/dog) agent.
- Modify `rishon3d/src/world/World.ts` — instanced trees/bushes; consume assembled map.

**Part C — dynamic content**
- Create `rishon3d/src/game/pathFollow.ts` — pure route following.
- Create `rishon3d/src/entities/NpcCar.ts` — kinematic traffic car agent.
- Create `rishon3d/src/game/populate.ts` — pure population/route planning.
- Modify `rishon3d/src/game/Game.ts` — use EntityManager; spawn cars/animals/pedestrians.
- Modify `rishon3d/src/main.ts` — pass camera position getter if needed.

Tests under `rishon3d/test/`.

---

## PART A — ARCHITECTURE / STABILITY

### Task A1: Fixed-timestep physics accumulator

**Files:**
- Create: `rishon3d/src/core/timestep.ts`
- Test: `rishon3d/test/timestep.test.ts`
- Modify: `rishon3d/src/core/Physics.ts`

**Interfaces:**
- Produces: `accumulateSteps(carry: number, dt: number, fixedStep: number, maxSteps: number): { steps: number; remainder: number }`

- [ ] **Step 1: Write the failing test** — `rishon3d/test/timestep.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { accumulateSteps } from "../src/core/timestep";

describe("accumulateSteps", () => {
  const STEP = 1 / 60;
  it("returns whole steps and carries remainder", () => {
    const r = accumulateSteps(0, STEP * 2.5, STEP, 5);
    expect(r.steps).toBe(2);
    expect(r.remainder).toBeCloseTo(STEP * 0.5, 6);
  });
  it("accumulates carry across calls", () => {
    const r = accumulateSteps(STEP * 0.8, STEP * 0.5, STEP, 5);
    expect(r.steps).toBe(1);
    expect(r.remainder).toBeCloseTo(STEP * 0.3, 6);
  });
  it("clamps to maxSteps to avoid spiral of death", () => {
    const r = accumulateSteps(0, STEP * 100, STEP, 5);
    expect(r.steps).toBe(5);
    expect(r.remainder).toBeLessThan(STEP);
  });
  it("takes no step when under the threshold", () => {
    const r = accumulateSteps(0, STEP * 0.4, STEP, 5);
    expect(r.steps).toBe(0);
    expect(r.remainder).toBeCloseTo(STEP * 0.4, 6);
  });
});
```

- [ ] **Step 2: Run test to verify it fails** — `cd rishon3d && npx vitest run test/timestep.test.ts` — Expected: FAIL (module not found).

- [ ] **Step 3: Implement** — `rishon3d/src/core/timestep.ts`

```ts
// Pure fixed-timestep accumulator. Splits a variable frame delta into a whole
// number of fixed substeps plus a carried remainder, clamped to avoid the
// "spiral of death" when the frame delta is huge (e.g. after a tab is backgrounded).
export interface StepPlan {
  steps: number;
  remainder: number;
}

export function accumulateSteps(
  carry: number,
  dt: number,
  fixedStep: number,
  maxSteps: number,
): StepPlan {
  let acc = carry + dt;
  let steps = 0;
  while (acc >= fixedStep && steps < maxSteps) {
    acc -= fixedStep;
    steps += 1;
  }
  // If we hit the clamp, drop excess backlog so we don't keep a huge remainder.
  if (steps >= maxSteps && acc >= fixedStep) {
    acc = acc % fixedStep;
  }
  return { steps, remainder: acc };
}
```

- [ ] **Step 4: Run test to verify it passes** — `npx vitest run test/timestep.test.ts` — Expected: PASS.

- [ ] **Step 5: Wire into Physics** — replace `rishon3d/src/core/Physics.ts` body:

```ts
import RAPIER from "@dimforge/rapier3d-compat";
import { accumulateSteps } from "./timestep";

export { RAPIER };

const FIXED_STEP = 1 / 60;
const MAX_SUBSTEPS = 5;

export class Physics {
  readonly world: RAPIER.World;
  private static ready = false;
  private carry = 0;

  static async init(): Promise<void> {
    if (!Physics.ready) { await RAPIER.init(); Physics.ready = true; }
  }

  constructor() {
    this.world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
    this.world.timestep = FIXED_STEP;
  }

  step(dt: number): void {
    const { steps, remainder } = accumulateSteps(this.carry, dt, FIXED_STEP, MAX_SUBSTEPS);
    this.carry = remainder;
    for (let i = 0; i < steps; i++) this.world.step();
  }
}
```

- [ ] **Step 6: Verify build + full tests** — `npm run build && npm test` — Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add rishon3d/src/core/timestep.ts rishon3d/test/timestep.test.ts rishon3d/src/core/Physics.ts
git commit -m "refactor(rishon3d): fixed-timestep physics accumulator for stability"
```

---

### Task A2: Shared asset cache

**Files:**
- Create: `rishon3d/src/world/assets.ts`
- Test: `rishon3d/test/assets.test.ts`

**Interfaces:**
- Produces:
  - `getGeometry(key: string, make: () => THREE.BufferGeometry): THREE.BufferGeometry`
  - `getMaterial(key: string, make: () => THREE.Material): THREE.Material`
  - `disposeAssets(): void`
  - `assetCounts(): { geometries: number; materials: number }`

- [ ] **Step 1: Write the failing test** — `rishon3d/test/assets.test.ts`

```ts
import { describe, it, expect, beforeEach } from "vitest";
import * as THREE from "three";
import { getGeometry, getMaterial, disposeAssets, assetCounts } from "../src/world/assets";

describe("asset cache", () => {
  beforeEach(() => disposeAssets());

  it("memoizes geometry by key", () => {
    let calls = 0;
    const a = getGeometry("box", () => { calls++; return new THREE.BoxGeometry(1, 1, 1); });
    const b = getGeometry("box", () => { calls++; return new THREE.BoxGeometry(1, 1, 1); });
    expect(a).toBe(b);
    expect(calls).toBe(1);
  });

  it("distinct keys produce distinct instances", () => {
    const a = getGeometry("g1", () => new THREE.BoxGeometry(1, 1, 1));
    const b = getGeometry("g2", () => new THREE.BoxGeometry(2, 2, 2));
    expect(a).not.toBe(b);
    expect(assetCounts().geometries).toBe(2);
  });

  it("memoizes materials and disposeAssets clears the cache", () => {
    getMaterial("red", () => new THREE.MeshStandardMaterial({ color: 0xff0000 }));
    expect(assetCounts().materials).toBe(1);
    disposeAssets();
    expect(assetCounts()).toEqual({ geometries: 0, materials: 0 });
  });
});
```

- [ ] **Step 2: Run test, verify fails** — `npx vitest run test/assets.test.ts` — Expected: FAIL (module not found).

- [ ] **Step 3: Implement** — `rishon3d/src/world/assets.ts`

```ts
import * as THREE from "three";

// Process-wide cache of shared geometries and materials. Keeps the GPU
// allocation count at O(distinct kinds) instead of O(objects), which is the
// main scaling lever as the world fills with props and agents.
const geometries = new Map<string, THREE.BufferGeometry>();
const materials = new Map<string, THREE.Material>();

export function getGeometry(key: string, make: () => THREE.BufferGeometry): THREE.BufferGeometry {
  let g = geometries.get(key);
  if (!g) { g = make(); geometries.set(key, g); }
  return g;
}

export function getMaterial(key: string, make: () => THREE.Material): THREE.Material {
  let m = materials.get(key);
  if (!m) { m = make(); materials.set(key, m); }
  return m;
}

export function disposeAssets(): void {
  for (const g of geometries.values()) g.dispose();
  for (const m of materials.values()) m.dispose();
  geometries.clear();
  materials.clear();
}

export function assetCounts(): { geometries: number; materials: number } {
  return { geometries: geometries.size, materials: materials.size };
}
```

- [ ] **Step 4: Run test, verify passes** — `npx vitest run test/assets.test.ts` — Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add rishon3d/src/world/assets.ts rishon3d/test/assets.test.ts
git commit -m "feat(rishon3d): shared geometry/material asset cache"
```

---

### Task A3: Instanced static-prop builder

**Files:**
- Create: `rishon3d/src/world/InstancedProps.ts`
- Test: `rishon3d/test/instancedProps.test.ts`

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces:
  - `interface Placement { x: number; z: number; rotationY?: number; scale?: number }`
  - `makeInstanced(geometry: THREE.BufferGeometry, material: THREE.Material, placements: Placement[], baseY: number): THREE.InstancedMesh`

- [ ] **Step 1: Write the failing test** — `rishon3d/test/instancedProps.test.ts`

```ts
import { describe, it, expect } from "vitest";
import * as THREE from "three";
import { makeInstanced, type Placement } from "../src/world/InstancedProps";

describe("makeInstanced", () => {
  it("creates one InstancedMesh sized to the placement count", () => {
    const geo = new THREE.BoxGeometry(1, 1, 1);
    const mat = new THREE.MeshStandardMaterial();
    const placements: Placement[] = [{ x: 1, z: 2 }, { x: -3, z: 4 }, { x: 0, z: 0 }];
    const mesh = makeInstanced(geo, mat, placements, 0.5);
    expect(mesh).toBeInstanceOf(THREE.InstancedMesh);
    expect(mesh.count).toBe(3);
  });

  it("positions instances at their placement coordinates and baseY", () => {
    const geo = new THREE.BoxGeometry(1, 1, 1);
    const mat = new THREE.MeshStandardMaterial();
    const mesh = makeInstanced(geo, mat, [{ x: 5, z: -7 }], 1.5);
    const m = new THREE.Matrix4();
    mesh.getMatrixAt(0, m);
    const pos = new THREE.Vector3().setFromMatrixPosition(m);
    expect(pos.x).toBeCloseTo(5, 5);
    expect(pos.y).toBeCloseTo(1.5, 5);
    expect(pos.z).toBeCloseTo(-7, 5);
  });

  it("handles an empty placement list", () => {
    const mesh = makeInstanced(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial(), [], 0);
    expect(mesh.count).toBe(0);
  });
});
```

- [ ] **Step 2: Run test, verify fails** — `npx vitest run test/instancedProps.test.ts` — Expected: FAIL.

- [ ] **Step 3: Implement** — `rishon3d/src/world/InstancedProps.ts`

```ts
import * as THREE from "three";

export interface Placement {
  x: number;
  z: number;
  rotationY?: number;
  scale?: number;
}

const UP = new THREE.Vector3(0, 1, 0);

// Renders many identical static props (trees, bushes, poles) in a single draw
// call. Bake vertical offsets into the source geometry (geometry.translate) so
// one transform per instance places the whole prop on the ground plane.
export function makeInstanced(
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  placements: Placement[],
  baseY: number,
): THREE.InstancedMesh {
  const mesh = new THREE.InstancedMesh(geometry, material, placements.length);
  const matrix = new THREE.Matrix4();
  const quat = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  const pos = new THREE.Vector3();
  placements.forEach((p, i) => {
    quat.setFromAxisAngle(UP, p.rotationY ?? 0);
    const s = p.scale ?? 1;
    scale.set(s, s, s);
    pos.set(p.x, baseY, p.z);
    matrix.compose(pos, quat, scale);
    mesh.setMatrixAt(i, matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}
```

- [ ] **Step 4: Run test, verify passes** — `npx vitest run test/instancedProps.test.ts` — Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add rishon3d/src/world/InstancedProps.ts rishon3d/test/instancedProps.test.ts
git commit -m "feat(rishon3d): InstancedMesh builder for static props"
```

---

### Task A4: Entity manager + culling

**Files:**
- Create: `rishon3d/src/game/culling.ts`
- Create: `rishon3d/src/game/EntityManager.ts`
- Test: `rishon3d/test/culling.test.ts`

**Interfaces:**
- Produces:
  - `inRange(dx: number, dz: number, radius: number): boolean` (culling.ts)
  - `interface Agent extends Tickable { readonly object: THREE.Object3D }` (EntityManager.ts)
  - `class EntityManager implements Tickable` with `constructor(getCameraPos: () => THREE.Vector3, cullDistance?: number)`, `add(a: Agent): void`, `get count(): number`, `update(dt: number): void`

- [ ] **Step 1: Write the failing test** — `rishon3d/test/culling.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { inRange } from "../src/game/culling";

describe("inRange", () => {
  it("true when within radius", () => {
    expect(inRange(3, 4, 5)).toBe(true);   // dist 5 == radius
    expect(inRange(1, 1, 5)).toBe(true);
  });
  it("false when outside radius", () => {
    expect(inRange(10, 0, 5)).toBe(false);
    expect(inRange(4, 4, 5)).toBe(false);  // dist ~5.66
  });
});
```

- [ ] **Step 2: Run test, verify fails** — `npx vitest run test/culling.test.ts` — Expected: FAIL.

- [ ] **Step 3: Implement culling** — `rishon3d/src/game/culling.ts`

```ts
// Squared-distance range check (no sqrt). Used to skip updating/rendering
// agents far from the camera.
export function inRange(dx: number, dz: number, radius: number): boolean {
  return dx * dx + dz * dz <= radius * radius;
}
```

- [ ] **Step 4: Run test, verify passes** — `npx vitest run test/culling.test.ts` — Expected: PASS.

- [ ] **Step 5: Implement EntityManager** — `rishon3d/src/game/EntityManager.ts`

```ts
import * as THREE from "three";
import type { Tickable } from "../core/Engine";
import { inRange } from "./culling";

// An agent is anything with a scene object and per-frame update (NPC people,
// animals, traffic). The manager owns the population and applies a simple
// distance LOD: agents beyond cullDistance are hidden and skip their update.
export interface Agent extends Tickable {
  readonly object: THREE.Object3D;
}

export class EntityManager implements Tickable {
  private agents: Agent[] = [];

  constructor(
    private getCameraPos: () => THREE.Vector3,
    private cullDistance = 130,
  ) {}

  add(agent: Agent): void {
    this.agents.push(agent);
  }

  get count(): number {
    return this.agents.length;
  }

  update(dt: number): void {
    const cam = this.getCameraPos();
    for (const a of this.agents) {
      const p = a.object.position;
      const visible = inRange(p.x - cam.x, p.z - cam.z, this.cullDistance);
      a.object.visible = visible;
      if (visible) a.update(dt);
    }
  }
}
```

- [ ] **Step 6: Verify build** — `npm run build` — Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add rishon3d/src/game/culling.ts rishon3d/src/game/EntityManager.ts rishon3d/test/culling.test.ts
git commit -m "feat(rishon3d): entity manager with distance culling"
```

---

## PART B — WORLD EXPANSION

### Task B1: Seeded RNG

**Files:**
- Create: `rishon3d/src/world/rng.ts`
- Test: `rishon3d/test/rng.test.ts`

**Interfaces:**
- Produces: `mulberry32(seed: number): () => number`

- [ ] **Step 1: Write the failing test** — `rishon3d/test/rng.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { mulberry32 } from "../src/world/rng";

describe("mulberry32", () => {
  it("is deterministic for a given seed", () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });
  it("different seeds diverge", () => {
    const a = mulberry32(1), b = mulberry32(2);
    expect(a()).not.toBe(b());
  });
  it("stays within [0, 1)", () => {
    const r = mulberry32(7);
    for (let i = 0; i < 100; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});
```

- [ ] **Step 2: Run test, verify fails** — `npx vitest run test/rng.test.ts` — Expected: FAIL.

- [ ] **Step 3: Implement** — `rishon3d/src/world/rng.ts`

```ts
// mulberry32: small, fast, deterministic PRNG. Returns a function that yields
// successive floats in [0, 1). Used so procedural generation is reproducible
// and unit-testable (no Math.random in pure modules).
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
```

- [ ] **Step 4: Run test, verify passes** — `npx vitest run test/rng.test.ts` — Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add rishon3d/src/world/rng.ts rishon3d/test/rng.test.ts
git commit -m "feat(rishon3d): seeded mulberry32 RNG"
```

---

### Task B2: District types + bush prop kind

**Files:**
- Create: `rishon3d/src/world/districts.ts`
- Modify: `rishon3d/src/world/rishonMap.ts` (PropKind only — see Step 1)

**Interfaces:**
- Consumes: `Vec2` from `rishonMap.ts`.
- Produces: `interface DistrictSpec { id: string; center: Vec2; size: number; blocks: number; seed: number; palette: number[]; minHeight: number; maxHeight: number; density: number }`

- [ ] **Step 1: Add `bush` to PropKind** — in `rishon3d/src/world/rishonMap.ts` change:

```ts
export type PropKind = "tree" | "streetlight" | "bush";
```

- [ ] **Step 2: Implement districts** — `rishon3d/src/world/districts.ts`

```ts
import type { Vec2 } from "./rishonMap";

// A district is a square region with a uniform street grid and a building style.
// The procedural generator (cityGen) turns a spec into buildings/roads/props.
export interface DistrictSpec {
  id: string;
  center: Vec2;
  size: number;        // side length of the square footprint, world units
  blocks: number;      // grid divisions per side (blocks x blocks cells)
  seed: number;
  palette: number[];   // candidate building colors
  minHeight: number;
  maxHeight: number;
  density: number;     // 0..1 probability a cell receives a building
}
```

- [ ] **Step 3: Verify build** — `npm run build` — Expected: PASS (PropKind change is backward compatible; no consumer breaks).

- [ ] **Step 4: Commit**

```bash
git add rishon3d/src/world/districts.ts rishon3d/src/world/rishonMap.ts
git commit -m "feat(rishon3d): district spec type + bush prop kind"
```

---

### Task B3: Procedural district generator

**Files:**
- Create: `rishon3d/src/world/cityGen.ts`
- Test: `rishon3d/test/cityGen.test.ts`

**Interfaces:**
- Consumes: `DistrictSpec` (districts.ts), `BuildingDef`/`RoadDef`/`PropDef` (rishonMap.ts), `mulberry32` (rng.ts).
- Produces:
  - `const ROAD_WIDTH = 6`
  - `interface DistrictResult { buildings: BuildingDef[]; roads: RoadDef[]; props: PropDef[] }`
  - `generateDistrict(spec: DistrictSpec): DistrictResult`

- [ ] **Step 1: Write the failing test** — `rishon3d/test/cityGen.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { generateDistrict, ROAD_WIDTH } from "../src/world/cityGen";
import type { DistrictSpec } from "../src/world/districts";

const spec: DistrictSpec = {
  id: "d1", center: { x: 100, z: 0 }, size: 60, blocks: 4, seed: 9,
  palette: [0x808080, 0x909090], minHeight: 6, maxHeight: 18, density: 1,
};

describe("generateDistrict", () => {
  it("is deterministic for a seed", () => {
    const a = generateDistrict(spec);
    const b = generateDistrict(spec);
    expect(a.buildings.length).toBe(b.buildings.length);
    expect(a.buildings.map((x) => x.id)).toEqual(b.buildings.map((x) => x.id));
  });

  it("emits a grid of roads (blocks+1 lines each axis)", () => {
    const r = generateDistrict(spec);
    const horiz = r.roads.filter((x) => x.horizontal).length;
    const vert = r.roads.filter((x) => !x.horizontal).length;
    expect(horiz).toBe(spec.blocks + 1);
    expect(vert).toBe(spec.blocks + 1);
  });

  it("gives every building a unique id", () => {
    const ids = generateDistrict(spec).buildings.map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("keeps building footprints out of the road corridors", () => {
    const r = generateDistrict(spec);
    const half = spec.size / 2;
    const cell = spec.size / spec.blocks;
    const clearance = ROAD_WIDTH / 2;
    for (const b of r.buildings) {
      // local coords within the district
      const lx = b.x - spec.center.x;
      const lz = b.z - spec.center.z;
      // distance from the nearest grid line on each axis must exceed half-footprint + clearance
      const nearestLineX = Math.round((lx + half) / cell) * cell - half;
      const nearestLineZ = Math.round((lz + half) / cell) * cell - half;
      expect(Math.abs(lx - nearestLineX)).toBeGreaterThanOrEqual(b.width / 2 + clearance - 1e-6);
      expect(Math.abs(lz - nearestLineZ)).toBeGreaterThanOrEqual(b.depth / 2 + clearance - 1e-6);
    }
  });

  it("keeps everything inside the district footprint", () => {
    const r = generateDistrict(spec);
    const half = spec.size / 2;
    for (const b of r.buildings) {
      expect(Math.abs(b.x - spec.center.x)).toBeLessThanOrEqual(half);
      expect(Math.abs(b.z - spec.center.z)).toBeLessThanOrEqual(half);
    }
  });
});
```

- [ ] **Step 2: Run test, verify fails** — `npx vitest run test/cityGen.test.ts` — Expected: FAIL.

- [ ] **Step 3: Implement** — `rishon3d/src/world/cityGen.ts`

```ts
import type { BuildingDef, RoadDef, PropDef } from "./rishonMap";
import type { DistrictSpec } from "./districts";
import { mulberry32 } from "./rng";

export const ROAD_WIDTH = 6;

export interface DistrictResult {
  buildings: BuildingDef[];
  roads: RoadDef[];
  props: PropDef[];
}

// Lays a uniform street grid over the district and drops a building into the
// centre of each cell, sized to leave a clear road corridor on all sides.
// Deterministic given spec.seed.
export function generateDistrict(spec: DistrictSpec): DistrictResult {
  const rng = mulberry32(spec.seed);
  const half = spec.size / 2;
  const cell = spec.size / spec.blocks;
  const buildings: BuildingDef[] = [];
  const roads: RoadDef[] = [];
  const props: PropDef[] = [];

  for (let i = 0; i <= spec.blocks; i++) {
    const offset = -half + i * cell;
    roads.push({ id: `${spec.id}-rh-${i}`, x: spec.center.x, z: spec.center.z + offset, length: spec.size, horizontal: true });
    roads.push({ id: `${spec.id}-rv-${i}`, x: spec.center.x + offset, z: spec.center.z, length: spec.size, horizontal: false });
  }

  // Largest centered footprint that still leaves a full road corridor + 1u margin.
  const maxFootprint = cell - ROAD_WIDTH - 2;

  for (let gx = 0; gx < spec.blocks; gx++) {
    for (let gz = 0; gz < spec.blocks; gz++) {
      // Consume rng in a fixed order regardless of branches so layout is stable.
      const place = rng();
      const rw = rng();
      const rd = rng();
      const rh = rng();
      const rc = rng();
      const rtree = rng();
      if (place > spec.density || maxFootprint < 3) continue;

      const cx = spec.center.x - half + (gx + 0.5) * cell;
      const cz = spec.center.z - half + (gz + 0.5) * cell;
      const w = 3 + rw * Math.min(maxFootprint - 3, 7);
      const d = 3 + rd * Math.min(maxFootprint - 3, 7);
      const h = spec.minHeight + rh * (spec.maxHeight - spec.minHeight);
      const color = spec.palette[Math.floor(rc * spec.palette.length)] ?? spec.palette[0];
      buildings.push({ id: `${spec.id}-b-${gx}-${gz}`, x: cx, z: cz, width: w, depth: d, height: h, color });

      if (rtree < 0.5) {
        // Tuck a bush/tree against the building, still clear of the corridor.
        const kind = rtree < 0.25 ? "tree" : "bush";
        const ox = (w / 2) + 0.8;
        props.push({ id: `${spec.id}-p-${gx}-${gz}`, kind, x: cx - ox, z: cz });
      }
    }
  }

  return { buildings, roads, props };
}
```

- [ ] **Step 4: Run test, verify passes** — `npx vitest run test/cityGen.test.ts` — Expected: PASS. (If the corridor test fails, the footprint cap is too generous — confirm `maxFootprint = cell - ROAD_WIDTH - 2` and `w,d <= maxFootprint`.)

- [ ] **Step 5: Commit**

```bash
git add rishon3d/src/world/cityGen.ts rishon3d/test/cityGen.test.ts
git commit -m "feat(rishon3d): procedural district block generator"
```

---

### Task B4: Assemble multi-district map

**Files:**
- Create: `rishon3d/src/world/worldData.ts`
- Modify: `rishon3d/src/world/rishonMap.ts` (rename inline map to `CORE_MAP`, export `RISHON_MAP = assembleMap()`)
- Test: `rishon3d/test/worldData.test.ts`
- Existing test to keep green: `rishon3d/test/rishonMap.test.ts`

**Interfaces:**
- Consumes: `generateDistrict` (cityGen.ts), `DistrictSpec` (districts.ts), `CORE_MAP`/`RishonMap`/`validateMap` (rishonMap.ts).
- Produces: `DISTRICTS: DistrictSpec[]`, `assembleMap(): RishonMap`

- [ ] **Step 1: In `rishonMap.ts`, rename the exported constant.** Change `export const RISHON_MAP: RishonMap = {` to `export const CORE_MAP: RishonMap = {`. Increase ground size to hold districts: set `ground: { size: 280 }`. Leave everything else (buildings, roads, props, spawns, `validateMap`) unchanged. Do NOT re-export `RISHON_MAP` here — `worldData.ts` will.

- [ ] **Step 2: Update the existing test import.** In `rishon3d/test/rishonMap.test.ts`, change any `import { RISHON_MAP ... }` to `import { CORE_MAP as RISHON_MAP ... }` (or update references to `CORE_MAP`). Keep the assertions; CORE_MAP must still validate clean. Run `npx vitest run test/rishonMap.test.ts` — Expected: PASS.

- [ ] **Step 3: Write the failing test** — `rishon3d/test/worldData.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { assembleMap, DISTRICTS } from "../src/world/worldData";
import { validateMap } from "../src/world/rishonMap";

describe("assembleMap", () => {
  const map = assembleMap();

  it("validates cleanly (one house, spawns in bounds, no spawn in a building)", () => {
    expect(validateMap(map)).toEqual([]);
  });

  it("has exactly one house (only the core district)", () => {
    expect(map.buildings.filter((b) => b.isHouse).length).toBe(1);
  });

  it("adds district buildings on top of the core", () => {
    // core has 8 buildings; districts add many more
    expect(map.buildings.length).toBeGreaterThan(20);
  });

  it("gives every building a unique id across districts", () => {
    const ids = map.buildings.map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("keeps all buildings within the (larger) ground bounds", () => {
    const half = map.ground.size / 2;
    for (const b of map.buildings) {
      expect(Math.abs(b.x) + b.width / 2).toBeLessThanOrEqual(half);
      expect(Math.abs(b.z) + b.depth / 2).toBeLessThanOrEqual(half);
    }
  });

  it("declares at least three districts", () => {
    expect(DISTRICTS.length).toBeGreaterThanOrEqual(3);
  });
});
```

- [ ] **Step 4: Run test, verify fails** — `npx vitest run test/worldData.test.ts` — Expected: FAIL.

- [ ] **Step 5: Implement** — `rishon3d/src/world/worldData.ts`

```ts
import { CORE_MAP, type RishonMap, type RoadDef } from "./rishonMap";
import type { DistrictSpec } from "./districts";
import { generateDistrict } from "./cityGen";

// Four satellite districts arranged around the hand-authored downtown core.
// Centers/sizes chosen to sit inside the 280-unit ground with margin and not
// overlap the core (which spans roughly +/-40 around the origin).
export const DISTRICTS: DistrictSpec[] = [
  { id: "north", center: { x: 0, z: -95 }, size: 60, blocks: 4, seed: 101,
    palette: [0x9aa7b8, 0x7c8aa0, 0x6d7a91], minHeight: 8, maxHeight: 22, density: 0.85 },
  { id: "east", center: { x: 95, z: 0 }, size: 60, blocks: 4, seed: 202,
    palette: [0xb0a08a, 0xc2b29a, 0x99876b], minHeight: 6, maxHeight: 16, density: 0.8 },
  { id: "south", center: { x: 0, z: 95 }, size: 60, blocks: 5, seed: 303,
    palette: [0x99a6ba, 0x828fa6, 0x90a0b5], minHeight: 7, maxHeight: 14, density: 0.75 },
  { id: "west", center: { x: -95, z: 0 }, size: 60, blocks: 4, seed: 404,
    palette: [0xa3b0c2, 0x8d99ae, 0x7c8aa0], minHeight: 10, maxHeight: 24, density: 0.85 },
];

// Wide arterial roads from the origin out to each district center so the
// player can drive between downtown and the satellites.
function arterials(): RoadDef[] {
  return [
    { id: "art-n", x: 0, z: -55, length: 90, horizontal: false },
    { id: "art-e", x: 55, z: 0, length: 90, horizontal: true },
    { id: "art-s", x: 0, z: 55, length: 90, horizontal: false },
    { id: "art-w", x: -55, z: 0, length: 90, horizontal: true },
  ];
}

export function assembleMap(): RishonMap {
  const buildings = [...CORE_MAP.buildings];
  const roads = [...CORE_MAP.roads, ...arterials()];
  const props = [...CORE_MAP.props];

  for (const spec of DISTRICTS) {
    const r = generateDistrict(spec);
    buildings.push(...r.buildings);
    roads.push(...r.roads);
    props.push(...r.props);
  }

  return {
    ground: CORE_MAP.ground,
    buildings,
    roads,
    props,
    npcSpawns: CORE_MAP.npcSpawns,
    carSpawn: CORE_MAP.carSpawn,
    playerSpawn: CORE_MAP.playerSpawn,
  };
}

export const RISHON_MAP: RishonMap = assembleMap();
```

- [ ] **Step 6: Point main.ts at the assembled map.** In `rishon3d/src/main.ts` change the import:
`import { RISHON_MAP, validateMap } from "./world/rishonMap";`
becomes
`import { validateMap } from "./world/rishonMap";`
`import { RISHON_MAP } from "./world/worldData";`

- [ ] **Step 7: Run tests + build** — `npx vitest run test/worldData.test.ts test/rishonMap.test.ts && npm run build` — Expected: PASS. If `validateMap` reports a core npcSpawn inside a generated building, a district is too close to the origin — nudge its center outward.

- [ ] **Step 8: Commit**

```bash
git add rishon3d/src/world/worldData.ts rishon3d/src/world/rishonMap.ts rishon3d/src/main.ts rishon3d/test/worldData.test.ts rishon3d/test/rishonMap.test.ts
git commit -m "feat(rishon3d): assemble multi-district city map"
```

---

### Task B5: Bush builder + instanced trees/bushes in World

**Files:**
- Modify: `rishon3d/src/world/props.ts` (add `makeBush`; route tree/bush/streetlight geometry+material through the asset cache; export shared geometry factories for instancing)
- Modify: `rishon3d/src/world/World.ts` (render trees and bushes via `makeInstanced`)

**Interfaces:**
- Consumes: `getGeometry`/`getMaterial` (assets.ts), `makeInstanced`/`Placement` (InstancedProps.ts), map props.
- Produces (props.ts):
  - `treeInstances(props: PropDef[]): THREE.Object3D` — group of instanced trunk+foliage for all `tree` props
  - `bushInstances(props: PropDef[]): THREE.Object3D` — instanced bushes for all `bush` props
  - keep existing `makeStreetLight(def)` (route its geometry/material through the cache)

- [ ] **Step 1: Rewrite `props.ts`** to use the cache and expose instance builders:

```ts
import * as THREE from "three";
import type { PropDef } from "./rishonMap";
import { getGeometry, getMaterial } from "./assets";
import { makeInstanced, type Placement } from "./InstancedProps";

// --- shared geometries (vertical offset baked in so one transform places the prop) ---
function trunkGeo(): THREE.BufferGeometry {
  return getGeometry("trunk", () => {
    const g = new THREE.CylinderGeometry(0.18, 0.24, 1.4, 8);
    g.translate(0, 0.7, 0);
    return g;
  });
}
function foliageGeo(): THREE.BufferGeometry {
  return getGeometry("foliage", () => {
    const g = new THREE.ConeGeometry(1.1, 2.2, 9);
    g.translate(0, 2.2, 0);
    return g;
  });
}
function bushGeo(): THREE.BufferGeometry {
  return getGeometry("bush", () => {
    const g = new THREE.SphereGeometry(0.7, 8, 6);
    g.scale(1, 0.7, 1);
    g.translate(0, 0.5, 0);
    return g;
  });
}
const trunkMat = () => getMaterial("trunkMat", () => new THREE.MeshStandardMaterial({ color: 0x6b4a2b }));
const foliageMat = () => getMaterial("foliageMat", () => new THREE.MeshStandardMaterial({ color: 0x3f7d3a }));
const bushMat = () => getMaterial("bushMat", () => new THREE.MeshStandardMaterial({ color: 0x4f8c46 }));

function placementsFor(props: PropDef[], kind: PropDef["kind"]): Placement[] {
  return props
    .filter((p) => p.kind === kind)
    .map((p, i) => ({ x: p.x, z: p.z, rotationY: (i * 2.39996) % (Math.PI * 2), scale: 0.85 + ((i * 7) % 5) * 0.08 }));
}

export function treeInstances(props: PropDef[]): THREE.Object3D {
  const group = new THREE.Group();
  const pl = placementsFor(props, "tree");
  if (pl.length === 0) return group;
  group.add(makeInstanced(trunkGeo(), trunkMat(), pl, 0));
  group.add(makeInstanced(foliageGeo(), foliageMat(), pl, 0));
  return group;
}

export function bushInstances(props: PropDef[]): THREE.Object3D {
  const pl = placementsFor(props, "bush");
  return makeInstanced(bushGeo(), bushMat(), pl, 0);
}

export function makeStreetLight(def: PropDef): THREE.Object3D {
  const g = new THREE.Group();
  g.position.set(def.x, 0, def.z);
  const pole = new THREE.Mesh(
    getGeometry("slPole", () => new THREE.CylinderGeometry(0.08, 0.1, 3.4, 8)),
    getMaterial("slPoleMat", () => new THREE.MeshStandardMaterial({ color: 0x2b2b30 })),
  );
  pole.position.y = 1.7; pole.castShadow = true;
  const lamp = new THREE.Mesh(
    getGeometry("slLamp", () => new THREE.BoxGeometry(0.4, 0.18, 0.4)),
    getMaterial("slLampMat", () => new THREE.MeshStandardMaterial({ color: 0xffd98a, emissive: 0xffb24d, emissiveIntensity: 1.2 })),
  );
  lamp.position.y = 3.5;
  g.add(pole, lamp);
  return g;
}
```

> NOTE: `makeTree` is removed (replaced by `treeInstances`). World.ts (next step) is the only caller and is updated in the same task.

- [ ] **Step 2: Update `World.ts`** to use instanced trees/bushes. Replace the prop loop (the `for (const p of map.props)` block and the `import { makeTree, makeStreetLight }` line):

```ts
import { makeBuilding, makeGround, makeRoad } from "./builders";
import { treeInstances, bushInstances, makeStreetLight } from "./props";
```

and the prop section becomes:

```ts
    scene.add(treeInstances(map.props));
    scene.add(bushInstances(map.props));

    let lightBudget = 6;
    for (const p of map.props) {
      if (p.kind !== "streetlight") continue;
      const sl = makeStreetLight(p);
      scene.add(sl);
      if (lightBudget-- > 0) {
        const glow = new THREE.PointLight(0xffb24d, 8, 16, 2);
        glow.position.set(p.x, 3.4, p.z);
        scene.add(glow);
      }
    }
```

- [ ] **Step 3: Verify build + tests** — `npm run build && npm test` — Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add rishon3d/src/world/props.ts rishon3d/src/world/World.ts
git commit -m "feat(rishon3d): instanced trees/bushes + cached prop materials"
```

---

### Task B6: Animal entity (cat/dog)

**Files:**
- Create: `rishon3d/src/entities/Animal.ts`
- Test: none new (logic is the existing, already-tested `wander`); covered by build + smoke.

**Interfaces:**
- Consumes: `Agent` (EntityManager.ts), `wander` helpers, `getGeometry`/`getMaterial` (assets.ts), `Vec2`, `Rect`.
- Produces:
  - `type AnimalKind = "cat" | "dog"`
  - `class Animal implements Agent` with `constructor(scene: THREE.Scene, origin: Vec2, kind: AnimalKind, opts: { bounds: number; rects: Rect[] })`, `readonly object: THREE.Group`, `update(dt): void`

- [ ] **Step 1: Implement** — `rishon3d/src/entities/Animal.ts`

```ts
import * as THREE from "three";
import type { Agent } from "../game/EntityManager";
import type { Vec2 } from "../world/rishonMap";
import { getGeometry, getMaterial } from "../world/assets";
import { moveToward, reachedTarget, clampToBounds, pickTarget, pointInRects, type Rect } from "../game/wander";

export type AnimalKind = "cat" | "dog";

interface AnimalOpts { bounds: number; rects: Rect[] }

const STYLE: Record<AnimalKind, { color: number; scale: number; speed: number; radius: number }> = {
  cat: { color: 0x8a8a8a, scale: 0.5, speed: 1.1, radius: 7 },
  dog: { color: 0x9c6b3f, scale: 0.75, speed: 1.6, radius: 10 },
};

// Low-poly quadruped: body + head + 4 legs + tail, all from cached boxes.
// Reuses the same wander logic as pedestrians, with smaller radius/speed.
export class Animal implements Agent {
  readonly object = new THREE.Group();
  private legs: THREE.Object3D[] = [];
  private pos: Vec2;
  private target: Vec2;
  private phase = 0;
  private pause = 0;
  private readonly speed: number;
  private readonly radius: number;

  constructor(scene: THREE.Scene, private origin: Vec2, kind: AnimalKind, private opts: AnimalOpts) {
    const s = STYLE[kind];
    this.speed = s.speed;
    this.radius = s.radius;
    const mat = getMaterial(`animal-${kind}`, () => new THREE.MeshStandardMaterial({ color: s.color }));

    const body = new THREE.Mesh(getGeometry("animalBody", () => new THREE.BoxGeometry(0.4, 0.4, 0.9)), mat);
    body.position.y = 0.55; body.castShadow = true;
    const head = new THREE.Mesh(getGeometry("animalHead", () => new THREE.BoxGeometry(0.34, 0.34, 0.34)), mat);
    head.position.set(0, 0.7, 0.6); head.castShadow = true;
    const tail = new THREE.Mesh(getGeometry("animalTail", () => new THREE.BoxGeometry(0.1, 0.1, 0.4)), mat);
    tail.position.set(0, 0.65, -0.6);
    this.object.add(body, head, tail);

    const legGeo = getGeometry("animalLeg", () => {
      const g = new THREE.BoxGeometry(0.12, 0.45, 0.12);
      g.translate(0, -0.225, 0); // pivot at hip
      return g;
    });
    for (const [lx, lz] of [[-0.13, 0.3], [0.13, 0.3], [-0.13, -0.3], [0.13, -0.3]] as const) {
      const leg = new THREE.Mesh(legGeo, mat);
      leg.position.set(lx, 0.45, lz); leg.castShadow = true;
      this.object.add(leg);
      this.legs.push(leg);
    }

    this.object.scale.setScalar(s.scale);
    this.pos = { x: origin.x, z: origin.z };
    this.object.position.set(origin.x, 0, origin.z);
    this.target = this.newTarget();
    scene.add(this.object);
  }

  private newTarget(): Vec2 {
    for (let i = 0; i < 12; i++) {
      const t = clampToBounds(pickTarget(this.origin, this.radius, Math.random(), Math.random()), this.opts.bounds);
      if (!pointInRects(t, this.opts.rects)) return t;
    }
    return { x: this.origin.x, z: this.origin.z };
  }

  private swingLegs(intensity: number): void {
    const s = Math.sin(this.phase) * intensity;
    this.legs[0].rotation.x = s; this.legs[3].rotation.x = s;
    this.legs[1].rotation.x = -s; this.legs[2].rotation.x = -s;
  }

  update(dt: number): void {
    if (this.pause > 0) { this.pause -= dt; this.swingLegs(0); return; }
    const step = this.speed * dt;
    const next = clampToBounds(moveToward(this.pos, this.target, step), this.opts.bounds);
    if (pointInRects(next, this.opts.rects)) { this.target = this.newTarget(); this.swingLegs(0); return; }
    const dx = next.x - this.pos.x, dz = next.z - this.pos.z;
    if (dx !== 0 || dz !== 0) this.object.rotation.y = Math.atan2(dx, dz);
    this.pos = next;
    this.phase += step * 8;
    this.swingLegs(0.6);
    this.object.position.set(this.pos.x, 0, this.pos.z);
    if (reachedTarget(this.pos, this.target, 0.5)) {
      this.pause = 0.5 + Math.random() * 1.0;
      this.target = this.newTarget();
    }
  }
}
```

- [ ] **Step 2: Verify build** — `npm run build` — Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add rishon3d/src/entities/Animal.ts
git commit -m "feat(rishon3d): wandering cat/dog animal entity"
```

---

## PART C — DYNAMIC CONTENT

### Task C1: Path-following math

**Files:**
- Create: `rishon3d/src/game/pathFollow.ts`
- Test: `rishon3d/test/pathFollow.test.ts`

**Interfaces:**
- Consumes: `Vec2` (rishonMap.ts).
- Produces:
  - `turnToward(current: number, target: number, maxDelta: number): number`
  - `interface FollowState { pos: Vec2; heading: number; waypoint: number }`
  - `advanceAlong(route: Vec2[], state: FollowState, speed: number, dt: number, arriveRadius: number, turnRate: number): FollowState`

- [ ] **Step 1: Write the failing test** — `rishon3d/test/pathFollow.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { turnToward, advanceAlong, type FollowState } from "../src/game/pathFollow";

describe("turnToward", () => {
  it("snaps when within maxDelta", () => {
    expect(turnToward(0, 0.05, 0.1)).toBeCloseTo(0.05, 6);
  });
  it("steps toward the target by maxDelta", () => {
    expect(turnToward(0, 1, 0.1)).toBeCloseTo(0.1, 6);
  });
  it("turns the short way across the +/-PI seam", () => {
    // from 3.0 rad to -3.0 rad: short way is +,  crossing PI
    const next = turnToward(3.0, -3.0, 0.1);
    expect(next).toBeGreaterThan(3.0); // moved forward past PI, not back toward 0
  });
});

describe("advanceAlong", () => {
  const route = [{ x: 0, z: 0 }, { x: 0, z: 10 }, { x: 10, z: 10 }];

  it("moves the position toward the active waypoint", () => {
    const s0: FollowState = { pos: { x: 0, z: 0 }, heading: 0, waypoint: 1 };
    const s1 = advanceAlong(route, s0, 5, 0.1, 0.5, 10);
    expect(s1.pos.z).toBeGreaterThan(0);  // moved toward (0,10)
    expect(s1.pos.z).toBeLessThan(10);
  });

  it("advances to the next waypoint on arrival", () => {
    const s0: FollowState = { pos: { x: 0, z: 9.8 }, heading: 0, waypoint: 1 };
    const s1 = advanceAlong(route, s0, 5, 0.1, 0.5, 10);
    expect(s1.waypoint).toBe(2);
  });

  it("wraps the waypoint index at the end of the route", () => {
    const s0: FollowState = { pos: { x: 10, z: 10 }, heading: 0, waypoint: 2 };
    const s1 = advanceAlong(route, s0, 5, 0.1, 0.5, 10);
    expect(s1.waypoint).toBe(0);
  });

  it("returns the state unchanged for an empty route", () => {
    const s0: FollowState = { pos: { x: 1, z: 1 }, heading: 0.5, waypoint: 0 };
    expect(advanceAlong([], s0, 5, 0.1, 0.5, 10)).toEqual(s0);
  });
});
```

- [ ] **Step 2: Run test, verify fails** — `npx vitest run test/pathFollow.test.ts` — Expected: FAIL.

- [ ] **Step 3: Implement** — `rishon3d/src/game/pathFollow.ts`

```ts
import type { Vec2 } from "../world/rishonMap";

// Rotate `current` toward `target` by at most `maxDelta`, taking the short way
// around the circle (handles the +/-PI seam).
export function turnToward(current: number, target: number, maxDelta: number): number {
  let diff = target - current;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  if (Math.abs(diff) <= maxDelta) return target;
  return current + Math.sign(diff) * maxDelta;
}

export interface FollowState {
  pos: Vec2;
  heading: number;
  waypoint: number;
}

// Kinematic route follower. Eases heading toward the active waypoint, steps
// forward by speed*dt, and advances (looping) when within arriveRadius.
export function advanceAlong(
  route: Vec2[],
  state: FollowState,
  speed: number,
  dt: number,
  arriveRadius: number,
  turnRate: number,
): FollowState {
  if (route.length === 0) return state;

  let waypoint = state.waypoint % route.length;
  const target = route[waypoint];
  const dx = target.x - state.pos.x;
  const dz = target.z - state.pos.z;
  const dist = Math.hypot(dx, dz);

  if (dist <= arriveRadius) {
    waypoint = (waypoint + 1) % route.length;
  }

  const desiredHeading = Math.atan2(dx, dz);
  const heading = turnToward(state.heading, desiredHeading, turnRate * dt);
  const step = speed * dt;
  const pos = {
    x: state.pos.x + Math.sin(heading) * step,
    z: state.pos.z + Math.cos(heading) * step,
  };
  return { pos, heading, waypoint };
}
```

- [ ] **Step 4: Run test, verify passes** — `npx vitest run test/pathFollow.test.ts` — Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add rishon3d/src/game/pathFollow.ts rishon3d/test/pathFollow.test.ts
git commit -m "feat(rishon3d): pure path-following math for traffic"
```

---

### Task C2: NPC car entity

**Files:**
- Create: `rishon3d/src/entities/NpcCar.ts`

**Interfaces:**
- Consumes: `Agent` (EntityManager.ts), `advanceAlong`/`FollowState` (pathFollow.ts), `Vec2`, `getGeometry`/`getMaterial` (assets.ts).
- Produces: `class NpcCar implements Agent` with `constructor(scene: THREE.Scene, route: Vec2[], color: number, speed?: number)`, `readonly object: THREE.Group`, `update(dt): void`

- [ ] **Step 1: Implement** — `rishon3d/src/entities/NpcCar.ts`

```ts
import * as THREE from "three";
import type { Agent } from "../game/EntityManager";
import type { Vec2 } from "../world/rishonMap";
import { advanceAlong, type FollowState } from "../game/pathFollow";
import { getGeometry, getMaterial } from "../world/assets";

const CAR_Y = 0.5;

// Decorative kinematic traffic: follows a closed route of road-lane waypoints.
// Not a physics vehicle (cheap and stable at population scale); does not
// collide with the player.
export class NpcCar implements Agent {
  readonly object = new THREE.Group();
  private state: FollowState;
  private readonly speed: number;

  constructor(scene: THREE.Scene, private route: Vec2[], color: number, speed = 7) {
    this.speed = speed;
    const body = new THREE.Mesh(
      getGeometry("npcCarBody", () => new THREE.BoxGeometry(1.7, 0.6, 3.4)),
      getMaterial(`npcCarMat-${color}`, () => new THREE.MeshStandardMaterial({ color, metalness: 0.3, roughness: 0.6 })),
    );
    body.position.y = CAR_Y; body.castShadow = true;
    const cabin = new THREE.Mesh(
      getGeometry("npcCarCabin", () => new THREE.BoxGeometry(1.4, 0.5, 1.6)),
      getMaterial("npcCarCabinMat", () => new THREE.MeshStandardMaterial({ color: 0x222831 })),
    );
    cabin.position.set(0, CAR_Y + 0.5, -0.2);
    this.object.add(body, cabin);

    const start = route[0] ?? { x: 0, z: 0 };
    this.object.position.set(start.x, 0, start.z);
    this.state = { pos: { x: start.x, z: start.z }, heading: 0, waypoint: 1 };
    scene.add(this.object);
  }

  update(dt: number): void {
    this.state = advanceAlong(this.route, this.state, this.speed, dt, 1.5, 2.5);
    this.object.position.set(this.state.pos.x, 0, this.state.pos.z);
    this.object.rotation.y = this.state.heading;
  }
}
```

- [ ] **Step 2: Verify build** — `npm run build` — Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add rishon3d/src/entities/NpcCar.ts
git commit -m "feat(rishon3d): kinematic NPC traffic car"
```

---

### Task C3: Population planner (pure)

**Files:**
- Create: `rishon3d/src/game/populate.ts`
- Test: `rishon3d/test/populate.test.ts`

**Interfaces:**
- Consumes: `RishonMap`/`Vec2`/`RoadDef` (rishonMap.ts), `mulberry32` (rng.ts), `DISTRICTS` (worldData.ts).
- Produces:
  - `interface PopulationBudget { pedestrians: number; cats: number; dogs: number }`
  - `interface Populations { pedestrians: Vec2[]; cats: Vec2[]; dogs: Vec2[]; carRoutes: Vec2[][] }`
  - `planPopulations(map: RishonMap, seed: number, budget: PopulationBudget): Populations`

- [ ] **Step 1: Write the failing test** — `rishon3d/test/populate.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { planPopulations, type PopulationBudget } from "../src/game/populate";
import { assembleMap } from "../src/world/worldData";

const map = assembleMap();
const budget: PopulationBudget = { pedestrians: 20, cats: 6, dogs: 6 };

describe("planPopulations", () => {
  it("respects the budget caps", () => {
    const p = planPopulations(map, 5, budget);
    expect(p.pedestrians.length).toBeLessThanOrEqual(20);
    expect(p.cats.length).toBeLessThanOrEqual(6);
    expect(p.dogs.length).toBeLessThanOrEqual(6);
  });

  it("is deterministic for a seed", () => {
    const a = planPopulations(map, 5, budget);
    const b = planPopulations(map, 5, budget);
    expect(a.pedestrians).toEqual(b.pedestrians);
    expect(a.carRoutes.length).toBe(b.carRoutes.length);
  });

  it("keeps spawned agents within ground bounds", () => {
    const half = map.ground.size / 2;
    const all = planPopulations(map, 5, budget);
    for (const v of [...all.pedestrians, ...all.cats, ...all.dogs]) {
      expect(Math.abs(v.x)).toBeLessThanOrEqual(half);
      expect(Math.abs(v.z)).toBeLessThanOrEqual(half);
    }
  });

  it("produces at least one car route with multiple waypoints", () => {
    const p = planPopulations(map, 5, budget);
    expect(p.carRoutes.length).toBeGreaterThan(0);
    expect(p.carRoutes[0].length).toBeGreaterThanOrEqual(4);
  });
});
```

- [ ] **Step 2: Run test, verify fails** — `npx vitest run test/populate.test.ts` — Expected: FAIL.

- [ ] **Step 3: Implement** — `rishon3d/src/game/populate.ts`

```ts
import type { RishonMap, Vec2, RoadDef } from "../world/rishonMap";
import { mulberry32 } from "../world/rng";
import { DISTRICTS } from "../world/worldData";

export interface PopulationBudget {
  pedestrians: number;
  cats: number;
  dogs: number;
}

export interface Populations {
  pedestrians: Vec2[];
  cats: Vec2[];
  dogs: Vec2[];
  carRoutes: Vec2[][];
}

// Sample a point on a road, offset slightly to a side lane.
function pointOnRoad(road: RoadDef, t: number, laneOffset: number): Vec2 {
  if (road.horizontal) {
    return { x: road.x - road.length / 2 + t * road.length, z: road.z + laneOffset };
  }
  return { x: road.x + laneOffset, z: road.z - road.length / 2 + t * road.length };
}

function sampleOnRoads(roads: RoadDef[], count: number, rng: () => number): Vec2[] {
  const out: Vec2[] = [];
  if (roads.length === 0) return out;
  for (let i = 0; i < count; i++) {
    const road = roads[Math.floor(rng() * roads.length)];
    const lane = (rng() < 0.5 ? -1 : 1) * (1.5 + rng() * 1.0);
    out.push(pointOnRoad(road, rng(), lane));
  }
  return out;
}

// A clockwise rectangular loop around a district center, on the arterial ring.
function districtLoop(center: Vec2, half: number): Vec2[] {
  return [
    { x: center.x - half, z: center.z - half },
    { x: center.x + half, z: center.z - half },
    { x: center.x + half, z: center.z + half },
    { x: center.x - half, z: center.z + half },
  ];
}

export function planPopulations(map: RishonMap, seed: number, budget: PopulationBudget): Populations {
  const rng = mulberry32(seed);
  const roads = map.roads;

  const pedestrians = sampleOnRoads(roads, budget.pedestrians, rng);
  const cats = sampleOnRoads(roads, budget.cats, rng);
  const dogs = sampleOnRoads(roads, budget.dogs, rng);

  // One traffic loop per district, plus a big loop around downtown.
  const carRoutes: Vec2[][] = [
    districtLoop({ x: 0, z: 0 }, 50),
    ...DISTRICTS.map((d) => districtLoop(d.center, d.size / 2 - 4)),
  ];

  return { pedestrians, cats, dogs, carRoutes };
}
```

- [ ] **Step 4: Run test, verify passes** — `npx vitest run test/populate.test.ts` — Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add rishon3d/src/game/populate.ts rishon3d/test/populate.test.ts
git commit -m "feat(rishon3d): pure population + traffic-route planner"
```

---

### Task C4: Wire everything into Game

**Files:**
- Modify: `rishon3d/src/game/Game.ts`

**Interfaces:**
- Consumes: `EntityManager`/`Agent`, `Npc`, `Animal`, `NpcCar`, `planPopulations`, `buildingRects`.

- [ ] **Step 1: Rewrite the population section of `Game.ts`.** Replace the `private npcs: Npc[] = [];` field and the `world.npcSpawns.forEach(...)` block and the `for (const n of this.npcs) n.update(dt);` line.

Add imports at the top:

```ts
import { Animal } from "../entities/Animal";
import { NpcCar } from "../entities/NpcCar";
import { EntityManager } from "./EntityManager";
import { planPopulations } from "./populate";
```

Replace the field:

```ts
  private entities: EntityManager;
```

In the constructor, after the existing `palettes` array, replace the `world.npcSpawns.forEach(...)` loop with:

```ts
    this.entities = new EntityManager(() => camera.position, 140);

    // Hand-authored downtown NPCs (kept for character).
    world.npcSpawns.forEach((s, i) => {
      this.entities.add(new Npc(scene, s, palettes[i % palettes.length], { bounds, rects }));
    });

    // Procedurally placed life across the whole city.
    const pop = planPopulations(world.map, 1234, { pedestrians: 28, cats: 8, dogs: 8 });
    pop.pedestrians.forEach((s, i) => {
      this.entities.add(new Npc(scene, s, palettes[i % palettes.length], { bounds, rects }));
    });
    pop.cats.forEach((s) => this.entities.add(new Animal(scene, s, "cat", { bounds, rects })));
    pop.dogs.forEach((s) => this.entities.add(new Animal(scene, s, "dog", { bounds, rects })));

    const carColors = [0x2980b9, 0xf1c40f, 0x27ae60, 0xe67e22, 0x8e44ad, 0xecf0f1];
    pop.carRoutes.forEach((route, i) => {
      this.entities.add(new NpcCar(scene, route, carColors[i % carColors.length], 6 + (i % 3)));
    });
```

In `update(dt)`, replace `for (const n of this.npcs) n.update(dt);` with:

```ts
    this.entities.update(dt);
```

- [ ] **Step 2: Verify build + tests** — `npm run build && npm test` — Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add rishon3d/src/game/Game.ts
git commit -m "feat(rishon3d): populate city with NPCs, animals, and traffic via EntityManager"
```

---

### Task C5: Final verification

- [ ] **Step 1: Full unit suite** — `cd rishon3d && npm test` — Expected: all suites PASS (original 20 + new timestep, assets, instancedProps, culling, rng, cityGen, worldData, pathFollow, populate).
- [ ] **Step 2: Typecheck + production build** — `npm run build` — Expected: PASS, no TS errors.
- [ ] **Step 3: Smoke test** — `npm run test:smoke` — Expected: PASS (scene boots and renders with the larger map). If Playwright browsers are missing, run `npx playwright install chromium` first.
- [ ] **Step 4: Update README** — add the new content (districts, traffic, animals) and any new controls note to `rishon3d/README.md`. Commit:

```bash
git add rishon3d/README.md
git commit -m "docs(rishon3d): note districts, traffic, and wildlife"
```

---

## Self-Review

- **Spec coverage:** Part A (timestep A1, assets A2, instancing A3, entity manager A4); Part B (rng B1, districts B2, cityGen B3, assembleMap B4, bushes/instanced props B5, animals B6); Part C (pathFollow C1, NpcCar C2, populate C3, Game wiring C4, verify C5). All spec sections map to tasks.
- **Placeholder scan:** No placeholders or TODOs; all code blocks are complete and copy-ready.
- **Type consistency:** `Agent` defined in A4 and consumed by Animal/NpcCar; `FollowState`/`advanceAlong` defined in C1 and consumed in C2; `DistrictResult`/`generateDistrict` in B3 consumed in B4; `Populations` in C3 consumed in C4; `Placement`/`makeInstanced` in A3 consumed in B5. Names align.
- **Ordering:** Foundations (A) precede consumers (B/C). B4 depends on B2/B3; C4 depends on all of C and on A4/B6. Dependencies respected.
