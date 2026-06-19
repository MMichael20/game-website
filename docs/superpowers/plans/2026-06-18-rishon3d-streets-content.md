# Rishon3D Streets Content Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Fix "trees in the middle of the road" via a general road-corridor prop filter, and add decorative parked cars along the roadsides.

**Architecture:** Pure logic (`roadClear`, `planParkedCars`) is TDD'd under vitest; the parked-car mesh and world wiring are thin and build/smoke-verified. World generation stays deterministic.

**Tech Stack:** TypeScript, Three.js 0.169, Vite, Vitest, Playwright.

## Global Constraints

- All work in `rishon3d/`. Run commands from there.
- tsconfig `strict`+`noUnusedLocals`+`noUnusedParameters` — no unused symbols.
- World gen deterministic: no `Math.random`; use `mulberry32(seed)` from `src/world/rng.ts`.
- `Rect` is `{minX;maxX;minZ;maxZ}` from `src/game/wander.ts`; reuse `pointInRects`/`buildingRects` from there. `ROAD_W` (=6) is exported from `src/world/roads.ts`. `Placement` is `{x;z;rotationY?;scale?}` from `src/world/InstancedProps.ts`; instance via `makeInstanced`. Merge geometry via `mergeGeometries` from `three/examples/jsm/utils/BufferGeometryUtils.js`. Shared geo/mat via `getGeometry`/`getMaterial` from `src/world/assets.ts`.
- Commit after each task; end messages with:
  `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`

---

### Task 1: Road-corridor prop filter (`src/world/roadClear.ts`)

**Files:**
- Create: `rishon3d/src/world/roadClear.ts`
- Test: `rishon3d/test/roadClear.test.ts`

**Interfaces:**
- Consumes: `RoadDef`, `PropDef` from `./rishonMap`; `Rect`, `pointInRects` from `../game/wander`; `ROAD_W` from `./roads`.
- Produces:
  - `roadRects(roads: RoadDef[], margin: number): Rect[]`
  - `filterPropsOffRoads(props: PropDef[], roads: RoadDef[], margin: number): PropDef[]` (keeps `streetlight`; drops `tree`/`bush`/`bench` whose center is in a corridor).

- [ ] **Step 1: Write the failing test**

Create `rishon3d/test/roadClear.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { roadRects, filterPropsOffRoads } from "../src/world/roadClear";
import type { RoadDef, PropDef } from "../src/world/rishonMap";

const vRoad: RoadDef = { id: "v", x: 0, z: 0, length: 120, horizontal: false };
const hRoad: RoadDef = { id: "h", x: 0, z: 0, length: 120, horizontal: true };

describe("roadRects", () => {
  it("vertical road: narrow in x (half-width+margin), long in z", () => {
    const [r] = roadRects([vRoad], 1.5); // ROAD_W/2 + 1.5 = 4.5
    expect(r.minX).toBeCloseTo(-4.5, 6);
    expect(r.maxX).toBeCloseTo(4.5, 6);
    expect(r.minZ).toBeCloseTo(-60, 6);
    expect(r.maxZ).toBeCloseTo(60, 6);
  });
  it("horizontal road: long in x, narrow in z", () => {
    const [r] = roadRects([hRoad], 1.5);
    expect(r.maxX).toBeCloseTo(60, 6);
    expect(r.maxZ).toBeCloseTo(4.5, 6);
  });
});

describe("filterPropsOffRoads", () => {
  const props: PropDef[] = [
    { id: "on", kind: "tree", x: 0, z: 30 },    // on the vertical road -> removed
    { id: "off", kind: "tree", x: 5, z: 30 },   // x=5 > 4.5 -> kept
    { id: "lamp", kind: "streetlight", x: 0, z: 30 }, // exempt -> kept
  ];
  it("removes vegetation on a road but keeps off-road and streetlights", () => {
    const out = filterPropsOffRoads(props, [vRoad], 1.5).map((p) => p.id);
    expect(out).toContain("off");
    expect(out).toContain("lamp");
    expect(out).not.toContain("on");
  });
  it("is deterministic / pure", () => {
    const a = filterPropsOffRoads(props, [vRoad], 1.5);
    const b = filterPropsOffRoads(props, [vRoad], 1.5);
    expect(a).toEqual(b);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd rishon3d && npx vitest run test/roadClear.test.ts`
Expected: FAIL — cannot resolve `../src/world/roadClear`.

- [ ] **Step 3: Write minimal implementation**

Create `rishon3d/src/world/roadClear.ts`:

```ts
import type { RoadDef, PropDef } from "./rishonMap";
import { type Rect, pointInRects } from "../game/wander";
import { ROAD_W } from "./roads";

// Each road as a corridor rect: half-width = ROAD_W/2 + margin along the short axis,
// full length along the long axis.
export function roadRects(roads: RoadDef[], margin: number): Rect[] {
  const halfW = ROAD_W / 2 + margin;
  return roads.map((r) =>
    r.horizontal
      ? { minX: r.x - r.length / 2, maxX: r.x + r.length / 2, minZ: r.z - halfW, maxZ: r.z + halfW }
      : { minX: r.x - halfW, maxX: r.x + halfW, minZ: r.z - r.length / 2, maxZ: r.z + r.length / 2 },
  );
}

// Drops trees/bushes/benches sitting in a road corridor. Streetlights are kept
// (they belong at road edges).
export function filterPropsOffRoads(props: PropDef[], roads: RoadDef[], margin: number): PropDef[] {
  const rects = roadRects(roads, margin);
  return props.filter((p) => p.kind === "streetlight" || !pointInRects({ x: p.x, z: p.z }, rects));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd rishon3d && npx vitest run test/roadClear.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add rishon3d/src/world/roadClear.ts rishon3d/test/roadClear.test.ts
git commit -m "feat(rishon3d): road-corridor prop filter (keeps streetlights)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Apply the filter so no tree sits on a road (`src/world/worldData.ts`)

**Files:**
- Modify: `rishon3d/src/world/worldData.ts`
- Test: `rishon3d/test/worldData.test.ts` (add a regression case)

**Interfaces:**
- Consumes: `filterPropsOffRoads` from `./roadClear`.

- [ ] **Step 1: Add the regression test**

In `rishon3d/test/worldData.test.ts`, add these imports at the top (after the existing imports):

```ts
import { roadRects } from "../src/world/roadClear";
import { pointInRects } from "../src/game/wander";
```

And add this case inside the `describe("assembleMap", ...)` block:

```ts
  it("keeps trees/bushes/benches out of road corridors", () => {
    const corridors = roadRects(map.roads, 1.5);
    const onRoad = map.props.filter(
      (p) => p.kind !== "streetlight" && pointInRects({ x: p.x, z: p.z }, corridors),
    );
    expect(onRoad).toEqual([]);
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd rishon3d && npx vitest run test/worldData.test.ts`
Expected: FAIL — the current map has on-road trees (e.g. `t11` at `(0,30)`), so `onRoad` is non-empty.

- [ ] **Step 3: Apply the filter in `assembleMap`**

In `rishon3d/src/world/worldData.ts`, add to the imports:

```ts
import { filterPropsOffRoads } from "./roadClear";
```

In `assembleMap`, change the returned `props` to be filtered. Replace the `props` field in the returned object:

```ts
    props,
```

with:

```ts
    props: filterPropsOffRoads(props, roads, 1.5),
```

(The `1.5` margin matches the regression test; roadside trees at flank 5 survive since 5 > ROAD_W/2 + 1.5 = 4.5.)

- [ ] **Step 4: Run the suite to verify it passes**

Run: `cd rishon3d && npx vitest run test/worldData.test.ts`
Expected: PASS — `onRoad` is now empty, and the existing assembleMap cases still pass.

- [ ] **Step 5: Commit**

```bash
git add rishon3d/src/world/worldData.ts rishon3d/test/worldData.test.ts
git commit -m "fix(rishon3d): filter trees/bushes/benches off road corridors

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Parked cars (`src/world/parkedCars.ts`) + world wiring

**Files:**
- Create: `rishon3d/src/world/parkedCars.ts`
- Test: `rishon3d/test/parkedCars.test.ts`
- Modify: `rishon3d/src/world/World.ts`

**Interfaces:**
- Consumes: `RishonMap` from `./rishonMap`; `Placement`, `makeInstanced` from `./InstancedProps`; `ROAD_W` from `./roads`; `buildingRects`, `pointInRects` from `../game/wander`; `mulberry32` from `./rng`; `getGeometry`/`getMaterial` from `./assets`; `mergeGeometries`.
- Produces:
  - `planParkedCars(map: RishonMap, seed: number, max: number): Placement[]`
  - `parkedCarInstances(placements: Placement[]): THREE.Object3D`

- [ ] **Step 1: Write the failing test**

Create `rishon3d/test/parkedCars.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { planParkedCars } from "../src/world/parkedCars";
import type { RishonMap } from "../src/world/rishonMap";

const map: RishonMap = {
  ground: { size: 280 },
  roads: [
    { id: "h", x: 0, z: 0, length: 120, horizontal: true },
    { id: "v", x: 0, z: 0, length: 120, horizontal: false },
  ],
  buildings: [{ id: "b", x: 20, z: 20, width: 10, depth: 10, height: 8, color: 0x888888 }],
  props: [],
  npcSpawns: [],
  carSpawn: { x: 0, z: 0 },
  playerSpawn: { x: 0, z: 0 },
};

describe("planParkedCars", () => {
  it("respects the max cap", () => {
    expect(planParkedCars(map, 7, 10).length).toBeLessThanOrEqual(10);
  });
  it("keeps cars in bounds and out of buildings", () => {
    const half = map.ground.size / 2;
    const rects = [{ minX: 15, maxX: 25, minZ: 15, maxZ: 25 }];
    for (const p of planParkedCars(map, 7, 40)) {
      expect(Math.abs(p.x)).toBeLessThanOrEqual(half);
      expect(Math.abs(p.z)).toBeLessThanOrEqual(half);
      const inBuilding = p.x >= rects[0].minX && p.x <= rects[0].maxX && p.z >= rects[0].minZ && p.z <= rects[0].maxZ;
      expect(inBuilding).toBe(false);
    }
  });
  it("is deterministic for a seed", () => {
    expect(planParkedCars(map, 7, 40)).toEqual(planParkedCars(map, 7, 40));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd rishon3d && npx vitest run test/parkedCars.test.ts`
Expected: FAIL — cannot resolve `../src/world/parkedCars`.

- [ ] **Step 3: Write minimal implementation**

Create `rishon3d/src/world/parkedCars.ts`:

```ts
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { RishonMap } from "./rishonMap";
import { type Placement, makeInstanced } from "./InstancedProps";
import { ROAD_W } from "./roads";
import { buildingRects, pointInRects } from "../game/wander";
import { mulberry32 } from "./rng";
import { getGeometry, getMaterial } from "./assets";

const OFFSET = ROAD_W / 2 + 1.2; // park just off the driving lane
const SPACING = 14;

// Deterministic positions for decorative cars parked along the roadsides,
// skipping spots inside buildings or out of bounds.
export function planParkedCars(map: RishonMap, seed: number, max: number): Placement[] {
  const rng = mulberry32(seed);
  const rects = buildingRects(map.buildings, 0.5);
  const half = map.ground.size / 2 - 2;
  const out: Placement[] = [];
  for (const r of map.roads) {
    if (out.length >= max) break;
    const n = Math.floor(r.length / SPACING);
    for (let i = 1; i < n && out.length < max; i++) {
      const t = -r.length / 2 + i * SPACING;
      const side = rng() < 0.5 ? 1 : -1;
      const place = rng() < 0.5; // sparse: ~half the slots
      if (!place) continue;
      const x = r.horizontal ? r.x + t : r.x + side * OFFSET;
      const z = r.horizontal ? r.z + side * OFFSET : r.z + t;
      if (Math.abs(x) > half || Math.abs(z) > half) continue;
      if (pointInRects({ x, z }, rects)) continue;
      out.push({ x, z, rotationY: r.horizontal ? Math.PI / 2 : 0, scale: 1 });
    }
  }
  return out;
}

function parkedCarGeo(): THREE.BufferGeometry {
  return getGeometry("parkedCar", () => {
    const body = new THREE.BoxGeometry(1.7, 0.55, 3.4); body.translate(0, 0.5, 0);
    const cabin = new THREE.BoxGeometry(1.4, 0.45, 1.6); cabin.translate(0, 0.95, -0.2);
    return mergeGeometries([body, cabin]);
  });
}
const parkedCarMat = () => getMaterial("parkedCarMat", () => new THREE.MeshStandardMaterial({ color: 0x6b7280, metalness: 0.3, roughness: 0.6 }));

export function parkedCarInstances(placements: Placement[]): THREE.Object3D {
  return makeInstanced(parkedCarGeo(), parkedCarMat(), placements, 0);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd rishon3d && npx vitest run test/parkedCars.test.ts`
Expected: PASS.

- [ ] **Step 5: Wire into the world**

In `rishon3d/src/world/World.ts`:
- Add an import after the other world imports:

```ts
import { planParkedCars, parkedCarInstances } from "./parkedCars";
```

- After the `scene.add(bushInstances(map.props));` line (and any bench line added previously), add:

```ts
    scene.add(parkedCarInstances(planParkedCars(map, 4242, 40)));
```

- [ ] **Step 6: Full gate**

Run: `cd rishon3d && npm run test && npm run build && npm run test:smoke`
Expected: PASS — all suites green, tsc + vite clean, smoke (2 canvases + WebGL) green.

- [ ] **Step 7: Commit**

```bash
git add rishon3d/src/world/parkedCars.ts rishon3d/test/parkedCars.test.ts rishon3d/src/world/World.ts
git commit -m "feat(rishon3d): decorative parked cars along roadsides

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Final verification (after all tasks)

- [ ] `cd rishon3d && npm run test` — all vitest suites green (incl. roadClear, parkedCars, worldData regression).
- [ ] `cd rishon3d && npm run build` — tsc + vite clean.
- [ ] `cd rishon3d && npm run test:smoke` — green.

## Self-Review

- **Spec coverage:** Unit 1 → Task 1; Unit 2 → Task 2; Unit 3 → Task 3 (plan + renderer); Unit 4 → Task 3 Step 5. D1/D2 filter → Tasks 1-2; D3/D5 parked cars → Task 3; D4 margin 1.5 → Tasks 1-2.
- **Placeholder scan:** none.
- **Type consistency:** `roadRects(roads, margin)`, `filterPropsOffRoads(props, roads, margin)`, `planParkedCars(map, seed, max)`, `parkedCarInstances(placements)`, `Placement`, `Rect`, `ROAD_W`, `pointInRects`, `buildingRects` used consistently. Filter margin (1.5) matches between `assembleMap` and the regression test.
