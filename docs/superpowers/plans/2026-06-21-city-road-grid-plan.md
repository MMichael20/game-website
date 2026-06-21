# City Road Grid Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Lay a connected road grid with sidewalks, crosswalks and traffic lights, and re-author the map onto city blocks.

**Architecture:** A `cityGrid` catalog object generates a `RoadDef[]` and returns `makeRoadNetwork()`'s mesh; a `trafficLight` object adds signals; `map.ts` is re-authored onto blocks. Reuses the tested `src/world/roads.ts`.

**Tech Stack:** TypeScript, Three.js, the `src/world` registry/manifest/engine, `roads.ts`.

## Global Constraints
- Local space, deterministic; derive child positions from dims (PITFALL 3).
- Rotation in {0,90,180,270}. Verify ONLY with `npx tsc --noEmit` then `npx vite build`. No tests/dev server/screenshots. Master, no worktree.
- `ROAD_W=6`, `SIDEWALK_W=1.6` → road corridor half-width 4.6m; keep footprints ≥6m from each road centerline.

---

### Task 1: `cityGrid` catalog object
**Files:** Create `src/world/catalog/cityGrid.ts`; modify `src/world/catalog/index.ts` (`import "./cityGrid";`).
**Interfaces:** Consumes `makeRoadNetwork` from `../roads`, `RoadDef` from `../rishonMap`, `defineObject`. Produces kind `"cityGrid"`, params `{ pitch:number; half:number; length:number; seed:number }` defaults `{ pitch:56, half:1, length:140, seed:1 }`, returns `{ mesh }`.

- [ ] **Step 1:** Create the file:
```ts
// src/world/catalog/cityGrid.ts
// A connected road grid: horizontal roads at z=k*pitch and vertical at x=k*pitch
// for k in [-half,half]. Reuses makeRoadNetwork (asphalt + paver sidewalks + curbs
// + crosswalks/markings). The central H/V roads are named so the existing system
// paints them as core arterials. Visual only — no colliders (roads are walkable).
import { defineObject } from "../system/registry";
import { makeRoadNetwork } from "../roads";
import type { RoadDef } from "../rishonMap";

interface CityGridParams { pitch: number; half: number; length: number; seed: number }

defineObject("cityGrid", {
  params: { pitch: 56, half: 1, length: 140, seed: 1 } as CityGridParams,
  build(p: CityGridParams) {
    const roads: RoadDef[] = [];
    for (let k = -p.half; k <= p.half; k++) {
      const off = k * p.pitch;
      roads.push({ id: off === 0 ? "main-h" : `h${k}`, x: 0, z: off, length: p.length, horizontal: true });
      roads.push({ id: off === 0 ? "cross-v" : `v${k}`, x: off, z: 0, length: p.length, horizontal: false });
    }
    return { mesh: makeRoadNetwork(roads) };
  },
});
```
- [ ] **Step 2:** Add `import "./cityGrid";` to `index.ts`.
- [ ] **Step 3:** `npx tsc --noEmit` — expect clean.
- [ ] **Step 4:** Commit `feat(world): add cityGrid object (road grid via makeRoadNetwork)`.

---

### Task 2: `trafficLight` catalog object
**Files:** Create `src/world/catalog/trafficLight.ts`; modify `index.ts` (`import "./trafficLight";`).
**Interfaces:** Consumes voxel helpers (`tintedBox, cylinderY, mergeTinted, tintedMesh`), `PALETTE`, `defineObject`. Produces kind `"trafficLight"`, params `{ height:number }` default `{ height:5 }`, returns `{ mesh, colliders, obstacles }`. FRONT (signal face) = `-z`.

- [ ] **Step 1:** Create the file:
```ts
// src/world/catalog/trafficLight.ts
// A street traffic signal: dark pole + horizontal mast arm (+z) + a signal head
// with red/amber/green lamps facing -z. Derived from `height`. LOCAL: base y=0,
// signal faces -z.
import * as THREE from "three";
import { defineObject } from "../system/registry";
import { tintedBox, cylinderY, mergeTinted, tintedMesh } from "../objects/voxel";
import { PALETTE } from "../palette";

interface TLParams { height: number }

defineObject("trafficLight", {
  params: { height: 5 } as TLParams,
  build(p: TLParams) {
    const pole = PALETTE.lampPole;
    const armLen = 3;
    const parts: THREE.BufferGeometry[] = [];
    // pole
    parts.push(cylinderY(0.13, p.height, 0, p.height / 2, 0, pole));
    // base
    parts.push(tintedBox(0.5, 0.25, 0.5, 0, 0.12, 0, PALETTE.steelDark));
    // mast arm reaching over the road (-z), at the top
    const armY = p.height - 0.25;
    parts.push(tintedBox(0.12, 0.12, armLen, 0, armY, -armLen / 2, pole));
    // signal head box at the arm end
    const headZ = -armLen;
    const headH = 1.2;
    const headCY = armY - headH / 2 - 0.05;
    parts.push(tintedBox(0.5, headH, 0.4, 0, headCY, headZ, PALETTE.steelDark));
    // three lamps on the -z face, derived from headH
    const lamps = [PALETTE.flowerRed, 0xf2a93b, PALETTE.leaf]; // red / amber / green
    for (let i = 0; i < 3; i++) {
      const ly = headCY + headH / 2 - 0.3 - i * 0.35;
      parts.push(tintedBox(0.26, 0.26, 0.08, 0, ly, headZ - 0.22, lamps[i]));
    }
    const mesh = tintedMesh(mergeTinted(parts));
    mesh.castShadow = true;
    return {
      mesh,
      colliders: [{ x: 0, y: p.height / 2, z: 0, hx: 0.2, hy: p.height / 2, hz: 0.2 }],
      obstacles: [{ x: 0, z: 0, w: 0.5, d: 0.5 }],
    };
  },
});
```
- [ ] **Step 2:** Add `import "./trafficLight";` to `index.ts`.
- [ ] **Step 3:** `npx tsc --noEmit` — expect clean.
- [ ] **Step 4:** Commit `feat(world): add trafficLight object (pole + R/Y/G signal head)`.

---

### Task 3: Re-author `map.ts` onto the grid
**Files:** Modify `src/world/map.ts`.
**Interfaces:** Consumes `cityGrid`, `trafficLight`, existing `lot`, `terraceRow`, `fillerBuilding`, `park`.

- [ ] **Step 1:** Replace the `{ kind:"road" ... }` line with `{ kind: "cityGrid", x:0, z:0, params:{ pitch:56, half:1, length:140, seed:1 } }`.
- [ ] **Step 2:** Move the phone-shop lot grid origin to `{ originX:-22, originZ:-17, cellW:8, cellD:8 }` (center the shop on the NW block).
- [ ] **Step 3:** Re-place the restaurant lot using a custom origin grid centered `(22,-21)`: change its call to pass `{ originX:22, originZ:-21, cellW:8, cellD:8 }` and `cell:{col:0,row:0}` (keeps its props, which are lot-local).
- [ ] **Step 4:** Delete the two loose `flower` lines (now in the carriageway).
- [ ] **Step 5:** Replace the terrace/tower/park/south block with:
```ts
  // Connected streetwalls on the blocks.
  { kind: "terraceRow", x: 28, z: 12, rot: 180, params: { units: 3, d: 11, district: "east", anchor: "center", seed: 41 } },
  { kind: "terraceRow", x: -28, z: 45, params: { units: 3, d: 11, district: "west", anchor: "center", seed: 43 } },
  // North skyline backdrop beyond the z=-56 road (freestanding towers).
  { kind: "fillerBuilding", x: -40, z: -68, params: { w: 14, d: 14, stories: 7, style: "glassTower", bodyColor: 0x6aa9c9, roofUnit: false, seed: 21 } },
  { kind: "fillerBuilding", x: -14, z: -72, params: { w: 16, d: 16, stories: 9, style: "darkGlass", bodyColor: 0x1d3b44, roofUnit: false, seed: 22 } },
  { kind: "fillerBuilding", x: 12, z: -70, params: { w: 14, d: 14, stories: 6, style: "glassTower", bodyColor: 0x9ac6e0, roofUnit: false, seed: 23 } },
  { kind: "fillerBuilding", x: 38, z: -68, params: { w: 13, d: 13, stories: 8, style: "darkGlass", bodyColor: 0x223f49, roofUnit: false, seed: 24 } },
  // Park on the SW block.
  { kind: "park", x: -28, z: 28, params: { w: 26, d: 20, fountain: true, seed: 5 } },
  // Traffic lights at the central intersection corners (signal faces -z by default).
  { kind: "trafficLight", x: 7, z: 7, rot: 0 },
  { kind: "trafficLight", x: -7, z: -7, rot: 180 },
  { kind: "trafficLight", x: 7, z: -7, rot: 270 },
  { kind: "trafficLight", x: -7, z: 7, rot: 90 },
```
- [ ] **Step 6:** Update spawns: `PLAYER_SPAWN = { x: 8, z: 9 }` (off the cross-v road); keep `CAR_SPAWN = { x: 12, z: 10 }`.
- [ ] **Step 7:** `npx tsc --noEmit` — expect clean.
- [ ] **Step 8:** Commit `feat(world): re-author map onto the city block grid`.

---

### Task 4: Final gate
- [ ] **Step 1:** `npx tsc --noEmit` — clean.
- [ ] **Step 2:** `npx vite build` — succeeds (pre-existing chunk warning only).
- [ ] **Step 3:** Hand back for the user to look in-game.

## Self-Review
- Spec coverage: cityGrid (T1), trafficLight (T2), block re-author + lights + spawns (T3), gate (T4). All mapped.
- Placeholder scan: full code in each step; verification = tsc/build.
- Type consistency: `RoadDef` fields match roads.ts usage; `CityGridParams`/`TLParams` consistent; terraceRow/fillerBuilding/park param names match their definitions.
