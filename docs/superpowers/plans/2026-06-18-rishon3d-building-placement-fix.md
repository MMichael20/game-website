# Rishon3D Building Placement Fix Implementation Plan

> REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Checkbox steps.

**Goal:** No building sits on any road. Nudge the 3 conflicting downtown buildings off the core roads and add a general building-vs-road AABB filter (+ regression test) as a permanent guarantee.

**Architecture:** Pure AABB helpers in `roadClear.ts` (TDD'd); nudge core building coords; apply the filter in `assembleMap`; assert no building overlaps any road in `worldData.test.ts`.

## Global Constraints
- All in `rishon3d/`. tsconfig strict+noUnusedLocals+noUnusedParameters. Deterministic world gen. Commit messages end with `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.
- `Rect = {minX;maxX;minZ;maxZ}` (wander). `roadRects` + `ROAD_W` already in `roadClear.ts`/`roads.ts`.

---

### Task 1: Building-vs-road AABB filter (`src/world/roadClear.ts`)

**Files:** Modify `rishon3d/src/world/roadClear.ts`; modify `rishon3d/test/roadClear.test.ts`

**Interfaces (add):**
- `rectsOverlap(a: Rect, b: Rect): boolean`
- `filterBuildingsOffRoads(buildings: BuildingDef[], roads: RoadDef[], roadMargin: number, buildingMargin: number): BuildingDef[]`

- [ ] **Step 1: Add failing tests** — append to `rishon3d/test/roadClear.test.ts`:

```ts
import { rectsOverlap, filterBuildingsOffRoads } from "../src/world/roadClear";
import type { BuildingDef } from "../src/world/rishonMap";

describe("rectsOverlap", () => {
  it("detects overlap and separation", () => {
    expect(rectsOverlap({ minX: 0, maxX: 2, minZ: 0, maxZ: 2 }, { minX: 1, maxX: 3, minZ: 1, maxZ: 3 })).toBe(true);
    expect(rectsOverlap({ minX: 0, maxX: 2, minZ: 0, maxZ: 2 }, { minX: 5, maxX: 6, minZ: 5, maxZ: 6 })).toBe(false);
  });
});

describe("filterBuildingsOffRoads", () => {
  const vRoad: RoadDef = { id: "v", x: 0, z: 0, length: 120, horizontal: false }; // corridor x in [-3.5,3.5] at margin .5
  const onRoad: BuildingDef = { id: "on", x: 0, z: 20, width: 8, depth: 8, height: 10, color: 0x888888 };
  const offRoad: BuildingDef = { id: "off", x: 40, z: 20, width: 8, depth: 8, height: 10, color: 0x888888 };
  it("removes a building overlapping a road, keeps one clear of it", () => {
    const out = filterBuildingsOffRoads([onRoad, offRoad], [vRoad], 0.5, 0).map((b) => b.id);
    expect(out).toEqual(["off"]);
  });
});
```

- [ ] **Step 2: Run → fail** — `cd rishon3d && npx vitest run test/roadClear.test.ts` (new symbols missing).

- [ ] **Step 3: Implement** — in `rishon3d/src/world/roadClear.ts`, change the import on line 1 to add `BuildingDef`:

```ts
import type { RoadDef, PropDef, BuildingDef } from "./rishonMap";
```

Append at the end of the file:

```ts
// Axis-aligned bounding-box overlap.
export function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.minX <= b.maxX && a.maxX >= b.minX && a.minZ <= b.maxZ && a.maxZ >= b.minZ;
}

// Drops any building whose footprint (+buildingMargin) overlaps a road corridor
// (roadRects at roadMargin). Guarantees no building sits on a road.
export function filterBuildingsOffRoads(
  buildings: BuildingDef[], roads: RoadDef[], roadMargin: number, buildingMargin: number,
): BuildingDef[] {
  const rrects = roadRects(roads, roadMargin);
  return buildings.filter((b) => {
    const br: Rect = {
      minX: b.x - b.width / 2 - buildingMargin,
      maxX: b.x + b.width / 2 + buildingMargin,
      minZ: b.z - b.depth / 2 - buildingMargin,
      maxZ: b.z + b.depth / 2 + buildingMargin,
    };
    return !rrects.some((r) => rectsOverlap(br, r));
  });
}
```

- [ ] **Step 4: Run → pass** — `cd rishon3d && npx vitest run test/roadClear.test.ts`.

- [ ] **Step 5: Commit**

```bash
git add rishon3d/src/world/roadClear.ts rishon3d/test/roadClear.test.ts
git commit -m "feat(rishon3d): building-vs-road AABB filter

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Nudge core buildings + apply the filter + regression test

**Files:** Modify `rishon3d/src/world/rishonMap.ts`, `rishon3d/src/world/worldData.ts`, `rishon3d/test/worldData.test.ts`

- [ ] **Step 1: Add the regression test (fails first)** — in `rishon3d/test/worldData.test.ts`, add imports if missing (`roadRects`, `rectsOverlap` from `../src/world/roadClear`) and add inside `describe("assembleMap", ...)`:

```ts
  it("keeps every building off every road", () => {
    const corridors = roadRects(map.roads, 0); // the actual road surfaces
    const onRoad = map.buildings.filter((b) => {
      const br = {
        minX: b.x - b.width / 2, maxX: b.x + b.width / 2,
        minZ: b.z - b.depth / 2, maxZ: b.z + b.depth / 2,
      };
      return corridors.some((r) => rectsOverlap(br, r));
    });
    expect(onRoad).toEqual([]);
  });
```

Run `cd rishon3d && npx vitest run test/worldData.test.ts` → FAIL (b5/b6/b7 overlap core roads).

- [ ] **Step 2: Nudge the 3 conflicting core buildings** — in `rishon3d/src/world/rishonMap.ts`, in `CORE_MAP.buildings`, change these three lines:

```ts
    { id: "b5", x: -34, z: -6, width: 14, depth: 10, height: 7, color: 0x99a6ba },
    { id: "b6", x: 6, z: 36, width: 10, depth: 9, height: 14, color: 0x828fa6 },
    { id: "b7", x: -8, z: -36, width: 11, depth: 11, height: 10, color: 0x90a0b5 },
```

to:

```ts
    { id: "b5", x: -38, z: -12, width: 14, depth: 10, height: 7, color: 0x99a6ba },
    { id: "b6", x: 12, z: 36, width: 10, depth: 9, height: 14, color: 0x828fa6 },
    { id: "b7", x: -14, z: -36, width: 11, depth: 11, height: 10, color: 0x90a0b5 },
```

- [ ] **Step 3: Apply the filter in `assembleMap`** — in `rishon3d/src/world/worldData.ts`, add to the `roadClear` import (currently `import { filterPropsOffRoads } from "./roadClear";`):

```ts
import { filterPropsOffRoads, filterBuildingsOffRoads } from "./roadClear";
```

In `assembleMap`, change the returned `buildings` field. Replace:

```ts
  return {
    ground: CORE_MAP.ground,
    buildings,
```

with:

```ts
  return {
    ground: CORE_MAP.ground,
    buildings: filterBuildingsOffRoads(buildings, roads, 0.5, 0),
```

- [ ] **Step 4: Run → pass** — `cd rishon3d && npx vitest run test/worldData.test.ts` (the new case passes; existing one-house/>20/unique-ids/in-bounds cases still pass — the nudged house is unaffected, only road-overlapping buildings are removed and the 3 core nudges keep downtown full).

- [ ] **Step 5: Full gate** — `cd rishon3d && npm run test && npm run build && npm run test:smoke` → all green.

- [ ] **Step 6: Commit**

```bash
git add rishon3d/src/world/rishonMap.ts rishon3d/src/world/worldData.ts rishon3d/test/worldData.test.ts
git commit -m "fix(rishon3d): nudge downtown buildings off the roads + filter any building on a road

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

## Self-Review
- Spec: Unit 1 → Task 1; Unit 2 (nudge) → Task 2 Step 2; Unit 3 (filter) → Task 2 Step 3; regression → Task 2 Step 1.
- Margins (roadMargin 0.5 / buildingMargin 0) keep legit district buildings (≥4.0 from grid centerlines) while removing any true on-road building; regression asserts against the actual road surface (margin 0).
- Types: `rectsOverlap(Rect,Rect)`, `filterBuildingsOffRoads(buildings,roads,roadMargin,buildingMargin)`, `BuildingDef` import added. Determinism unaffected (pure filter).
