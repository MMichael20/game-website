# City-Vibe Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand the world into a denser city — a 5×5 arterial grid, multiple rows of filler buildings, the two existing stores on the main street, and a highway bounding the north edge — while keeping it performant.

**Architecture:** Pure data authoring in the existing registry + manifest + engine. Two new catalog object kinds (`highway`, `buildingRow`) registered via `defineObject`, placed by lines in `MAP`. One small engine-side perf pass (freeze static transforms). No rendering/lighting changes.

**Tech Stack:** TypeScript, Three.js, Rapier. Build tools: `tsc`, `vite`.

## Global Constraints (verbatim from CLAUDE.md / spec)

- **No tests, no dev server, no screenshots.** Per-task gate is ONLY `npx tsc --noEmit` clean. Final gate adds `npx vite build` succeeds.
- **Determinism:** no `Math.random()` / `Date.now()` / argless `new Date()` in builders. Seed via `world/rng.ts` (`mulberry32`).
- **Derive child placement from dimensions, never magic numbers** (PITFALL 3). Builders expose/derive footprint; composites derive spacing from real widths.
- **Rotation is 90° increments** {0,90,180,270} (keeps AABBs axis-aligned).
- Build at LOCAL origin: centered x=z=0, base y=0, FRONT +z, ~1u=1m. Return facets in local space; the engine transforms on placement.
- New object files must be imported from `src/world/catalog/index.ts` to auto-register.
- **Do NOT touch** lighting, sky, tone mapping, shadows, pixel-ratio/fps caps.
- Work on **master** (no worktree — user standing instruction).

---

### Task 1: `highway` catalog object

**Files:**
- Create: `src/world/catalog/highway.ts`
- Modify: `src/world/catalog/index.ts` (add `import "./highway";`)

**Interfaces:**
- Consumes: `defineObject` from `../system/registry`; `tintedBox, mergeTinted, tintedMesh` from `../objects/voxel`; `makeAsphaltTexture, GRAIN_M` from `../roads`; `makeInstanced, type Placement` from `../InstancedProps`; `PALETTE` from `../palette`; `ObjectResult, Box, Rect` types from `../system/types`.
- Produces: registers kind `"highway"` with params `{ length:number, lanes:number, laneW:number, medianW:number, shoulderW:number, gantry:boolean, seed:number }`. `build` returns `{ mesh: THREE.Group, colliders: Box[], obstacles: Rect[] }`. Runs along +x, centered z=0; total width = `2*(lanes*laneW + shoulderW) + medianW`.

- [ ] **Step 1: Read the references**

Read `src/world/catalog/primitives.ts` (the `road` object) and `src/world/roads.ts` `makeRoadNetwork` for the asphalt-texture pattern and `makeInstanced` dash usage. Read `src/world/objects/voxel.ts` for `tintedBox`/`mergeTinted`/`tintedMesh` signatures. Read `src/world/system/types.ts` for `Box`/`Rect`/`ObjectResult`. Confirm `PALETTE` keys for asphalt, curb/concrete, a green (median planting), and a guardrail/steel color (e.g. `PALETTE.asphalt`, `PALETTE.curb`, `PALETTE.parkGrass`/`leaf`, `PALETTE.steelDark`). If a needed color key is missing, reuse the closest existing key — do not invent palette entries.

- [ ] **Step 2: Implement `highway.ts`**

Build at local origin, running along +x. Derive every z-position from the lane math. Carriageways are drivable (no collider); only median + guardrails collide.

```ts
// src/world/catalog/highway.ts
//
// A divided highway segment running along +x, centered on z=0. Two asphalt
// carriageways flank a raised planted center median; low guardrails run the
// outer edges. Drivable surface (no collider); median + guardrails are
// colliders so the highway reads bounded. Lane dashes are one instanced draw.
// All z-positions derive from lane math (PITFALL 3). Deterministic.

import * as THREE from "three";
import { defineObject } from "../system/registry";
import { tintedBox, mergeTinted, tintedMesh } from "../objects/voxel";
import { makeAsphaltTexture, GRAIN_M } from "../roads";
import { makeInstanced, type Placement } from "../InstancedProps";
import { PALETTE } from "../palette";
import type { Box, Rect } from "../system/types";

interface HighwayParams {
  length: number;
  lanes: number;     // lanes per carriageway
  laneW: number;     // width of one lane
  medianW: number;   // center median width
  shoulderW: number; // outer shoulder width (between outer lane and guardrail)
  gantry: boolean;
  seed: number;
}

defineObject("highway", {
  params: { length: 260, lanes: 2, laneW: 3.6, medianW: 4, shoulderW: 1.2, gantry: false, seed: 1 } as HighwayParams,
  build(p: HighwayParams) {
    const group = new THREE.Group();
    const carW = p.lanes * p.laneW + p.shoulderW;        // one carriageway width
    const carCenter = p.medianW / 2 + carW / 2;          // |z| of each carriageway center
    const half = p.medianW / 2 + carW;                   // |z| of the outer edge

    // Two asphalt carriageways (one mesh each; surface is drivable, no collider).
    for (const sign of [-1, 1] as const) {
      const tex = makeAsphaltTexture();
      tex.repeat.set(Math.max(1, Math.round(p.length / GRAIN_M)), Math.max(1, Math.round(carW / GRAIN_M)));
      const geo = new THREE.PlaneGeometry(p.length, carW);
      geo.rotateX(-Math.PI / 2);
      const surf = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex }));
      surf.position.set(0, 0.02, sign * carCenter);
      surf.receiveShadow = true;
      group.add(surf);
    }

    // Raised planted center median: concrete kerb + green strip on top (collider).
    const medParts: THREE.BufferGeometry[] = [];
    const kerbH = 0.25;
    medParts.push(tintedBox(p.length, kerbH, p.medianW, 0, kerbH / 2, 0, PALETTE.curb));
    medParts.push(tintedBox(p.length, 0.12, p.medianW - 0.5, 0, kerbH + 0.06, 0, PALETTE.parkGrass));
    group.add(tintedMesh(mergeTinted(medParts)));

    // Outer guardrails: low steel barriers on each outer edge (colliders + obstacles).
    const railH = 0.7;
    const railT = 0.2;
    const railParts: THREE.BufferGeometry[] = [];
    for (const sign of [-1, 1] as const) {
      railParts.push(tintedBox(p.length, railH, railT, 0, railH / 2, sign * half, PALETTE.steelDark));
    }
    const railMesh = tintedMesh(mergeTinted(railParts));
    railMesh.castShadow = true;
    group.add(railMesh);

    // Lane dashes: white dashes down each carriageway's lane boundaries, one
    // instanced draw. Long axis along +x → rotate the dash quad 90°.
    const DASH_LEN = 3, DASH_GAP = 6;
    const period = DASH_LEN + DASH_GAP;
    const count = Math.max(0, Math.floor(p.length / period));
    const start = -count * period / 2 + period / 2;
    const places: Placement[] = [];
    for (const sign of [-1, 1] as const) {
      // interior lane boundaries within a carriageway (lanes-1 of them)
      for (let b = 1; b < p.lanes; b++) {
        const zEdge = sign * (p.medianW / 2 + b * p.laneW);
        for (let i = 0; i < count; i++) places.push({ x: start + i * period, z: zEdge, rotationY: Math.PI / 2 });
      }
    }
    if (places.length) {
      const dashGeo = new THREE.PlaneGeometry(0.2, DASH_LEN);
      dashGeo.rotateX(-Math.PI / 2);
      const dashMat = new THREE.MeshStandardMaterial({ color: PALETTE.laneLine });
      const dashes = makeInstanced(dashGeo, dashMat, places, 0.03);
      dashes.castShadow = false;
      group.add(dashes);
    }

    // Optional overhead sign gantry (off by default): a portal frame + blank green panel.
    if (p.gantry) {
      const gParts: THREE.BufferGeometry[] = [];
      const postH = 5.5;
      for (const sign of [-1, 1] as const) {
        gParts.push(tintedBox(0.4, postH, 0.4, 0, postH / 2, sign * (half - 0.3), PALETTE.steelDark));
      }
      gParts.push(tintedBox(0.4, 0.4, 2 * half, 0, postH, 0, PALETTE.steelDark));      // top beam
      gParts.push(tintedBox(0.2, 1.6, 5, 0, postH - 1.1, 0, 0x2e7d32));                // green sign panel
      group.add(tintedMesh(mergeTinted(gParts)));
    }

    const colliders: Box[] = [
      { x: 0, y: kerbH / 2, z: 0, hx: p.length / 2, hy: kerbH / 2 + 0.06, hz: p.medianW / 2 }, // median
      { x: 0, y: railH / 2, z: half, hx: p.length / 2, hy: railH / 2, hz: railT / 2 },          // +z rail
      { x: 0, y: railH / 2, z: -half, hx: p.length / 2, hy: railH / 2, hz: railT / 2 },         // -z rail
    ];
    const obstacles: Rect[] = [
      { x: 0, z: 0, w: p.length, d: p.medianW },
      { x: 0, z: half, w: p.length, d: railT },
      { x: 0, z: -half, w: p.length, d: railT },
    ];
    return { mesh: group, colliders, obstacles };
  },
});
```

- [ ] **Step 3: Register it.** In `src/world/catalog/index.ts` add `import "./highway";` alongside the other catalog imports.

- [ ] **Step 4: Typecheck.** Run: `npx tsc --noEmit` — Expected: clean (no errors). If `tintedBox`/`mergeTinted`/`tintedMesh` signatures differ from assumed (`(w,h,d,x,y,z,color)`), adjust the calls to match the real signatures found in Step 1; do NOT change `voxel.ts`.

- [ ] **Step 5: Commit.**

```bash
git add src/world/catalog/highway.ts src/world/catalog/index.ts
git commit -m "feat(world): add highway catalog object"
```

---

### Task 2: `buildingRow` catalog object

**Files:**
- Create: `src/world/catalog/buildingRow.ts`
- Modify: `src/world/catalog/index.ts` (add `import "./buildingRow";`)

**Interfaces:**
- Consumes: `defineObject, buildObject` from `../system/registry`; `applyTransform` from `../system/transform`; `DISTRICT_PALETTES, PALETTE` from `../palette`; `mulberry32` from `../rng`; `ObjectResult, Box, Rect` from `../system/types`. Reuses the `"fillerBuilding"` kind (params `{ w,d,stories,storyH,bodyColor,style,ground,awningColor,roofUnit,faces,seed }` — see `fillerBuilding.ts`).
- Produces: registers kind `"buildingRow"` with params `{ units:number, gap:number, d:number, storyH:number, district:string, anchor:"center"|"left"|"right", faces:Axis[], seed:number }`. `build` returns composed `{ mesh, colliders, obstacles }`. Row runs along +x, fronts face +z. Each unit center derived from running sum of `(w+gap)`.

- [ ] **Step 1: Read the reference.** Read `src/world/catalog/terraceRow.ts` (the `compose()` helper + `genUnit` + running-cursor pattern) and the top of `src/world/catalog/fillerBuilding.ts` (params + `faces` axis type). `buildingRow` is `terraceRow` but with a `gap` between freestanding units and all units showing both side faces (`+z,+x,-x`) since they don't share party walls.

- [ ] **Step 2: Implement `buildingRow.ts`**

```ts
// src/world/catalog/buildingRow.ts
//
// A row of N FREESTANDING backdrop buildings spaced along +x with a gap between
// them (contrast terraceRow, which butts units edge-to-edge). Reuses
// fillerBuilding. Each unit's center x is the running sum of prior (width+gap)
// — derived, never a magic offset (PITFALL 3). Fronts face +z. Deterministic.
//
// LOCAL space: origin set by `anchor` (center/left/right edge of the whole run),
// base y=0, FRONT +z, ~1u=1m.

import * as THREE from "three";
import { defineObject, buildObject } from "../system/registry";
import { applyTransform } from "../system/transform";
import { DISTRICT_PALETTES, PALETTE } from "../palette";
import { mulberry32 } from "../rng";
import type { ObjectResult, Box, Rect } from "../system/types";

type Axis = "+z" | "-z" | "+x" | "-x";

function compose(parts: ObjectResult[]): ObjectResult {
  const group = new THREE.Group();
  const colliders: Box[] = [];
  const obstacles: Rect[] = [];
  for (const p of parts) {
    group.add(p.mesh);
    if (p.colliders) colliders.push(...p.colliders);
    if (p.obstacles) obstacles.push(...p.obstacles);
  }
  return { mesh: group, colliders, obstacles };
}

interface UnitSpec {
  w: number; stories: number; bodyColor: number;
  style: "masonry" | "glassTower" | "darkGlass";
  ground: "plain" | "storefront";
  awningColor: number;
}

interface RowParams {
  units: number;
  gap: number;
  d: number;
  storyH: number;
  district: string;
  anchor: "center" | "left" | "right";
  faces: Axis[];
  seed: number;
}

const AWNINGS = [PALETTE.awningRed, PALETTE.awningBlue, 0x2e8b57, 0xc97b30, 0x7a4ea0];

function genUnit(rng: () => number, palette: number[]): UnitSpec {
  const w = 10 + Math.floor(rng() * 6);            // 10..15
  const stories = 3 + Math.floor(rng() * 5);       // 3..7
  const bodyColor = palette[Math.floor(rng() * palette.length)];
  const r = rng();
  const style: UnitSpec["style"] = r < 0.18 ? "glassTower" : r < 0.30 ? "darkGlass" : "masonry";
  const isShop = style === "masonry" && rng() < 0.6;
  return { w, stories, bodyColor, style, ground: isShop ? "storefront" : "plain", awningColor: AWNINGS[Math.floor(rng() * AWNINGS.length)] };
}

defineObject("buildingRow", {
  params: { units: 5, gap: 1.5, d: 12, storyH: 3.0, district: "north", anchor: "center", faces: ["+z", "+x", "-x"] as Axis[], seed: 1 } as RowParams,
  build(p: RowParams) {
    const rng = mulberry32(p.seed >>> 0);
    const palette = DISTRICT_PALETTES[p.district] ?? DISTRICT_PALETTES.east;
    const specs: UnitSpec[] = Array.from({ length: p.units }, () => genUnit(rng, palette));

    // Total run width = sum of widths + gaps between (units-1 gaps).
    const totalW = specs.reduce((s, u) => s + u.w, 0) + p.gap * Math.max(0, specs.length - 1);
    const leftEdge = p.anchor === "center" ? -totalW / 2 : p.anchor === "left" ? 0 : -totalW;

    const parts: ObjectResult[] = [];
    let cursor = leftEdge;
    specs.forEach((u, i) => {
      const cx = cursor + u.w / 2;
      cursor += u.w + p.gap;
      const unit = buildObject("fillerBuilding", {
        w: u.w, d: p.d, stories: u.stories, storyH: p.storyH,
        bodyColor: u.bodyColor, style: u.style, ground: u.ground,
        awningColor: u.awningColor, roofUnit: true, faces: p.faces, seed: p.seed + i + 1,
      });
      parts.push(applyTransform(unit, { x: cx, z: 0, rot: 0 }));
    });
    return compose(parts);
  },
});
```

- [ ] **Step 3: Register it.** In `src/world/catalog/index.ts` add `import "./buildingRow";`.

- [ ] **Step 4: Verify `DISTRICT_PALETTES` has a usable key.** Read `src/world/palette.ts`; confirm `DISTRICT_PALETTES` exists and pick real district keys for the map (e.g. `east`, `north`, `west` — use whatever exists; the `?? DISTRICT_PALETTES.east` fallback covers a missing key). Adjust the default `district` if `"north"` is not a defined key.

- [ ] **Step 5: Typecheck.** Run: `npx tsc --noEmit` — Expected: clean.

- [ ] **Step 6: Commit.**

```bash
git add src/world/catalog/buildingRow.ts src/world/catalog/index.ts
git commit -m "feat(world): add buildingRow catalog object"
```

---

### Task 3: Static-world perf pass (freeze transforms)

**Files:**
- Modify: `src/world/World.ts` (after `scene.add(built.group)`, ~line 18)

**Interfaces:**
- Consumes: `built.group` (a `THREE.Group`). Produces: no API change; the world group + descendants stop recomputing matrices each frame.

- [ ] **Step 1: Implement the freeze.** In `src/world/World.ts`, immediately after `scene.add(built.group);`, add:

```ts
    // The world is fully static after build: compute world matrices once, then
    // stop per-frame matrix recomputation across every static mesh. Entities
    // (player, car, NPCs, clouds) are separate objects and are unaffected.
    built.group.updateMatrixWorld(true);
    built.group.traverse((obj) => {
      obj.matrixAutoUpdate = false;
      obj.matrixWorldAutoUpdate = false;
    });
```

(Place this BEFORE `const clouds = makeClouds();` so clouds — which animate — are not frozen.)

- [ ] **Step 2: Typecheck.** Run: `npx tsc --noEmit` — Expected: clean. (`matrixWorldAutoUpdate` exists on `THREE.Object3D` in the project's three version; if tsc reports it missing, drop that one line and keep `matrixAutoUpdate = false`.)

- [ ] **Step 3: Commit.**

```bash
git add src/world/World.ts
git commit -m "perf(world): freeze static world transforms (no per-frame matrix recompute)"
```

---

### Task 4: Restructure `MAP` into the city + highway

**Files:**
- Modify: `src/world/map.ts`

**Interfaces:**
- Consumes: kinds `ground, cityGrid, pavement, phoneRepairShop, restaurant, terraceRow, fillerBuilding, plaza, kioskCart, trafficLight, buildingRow, highway`. Produces: a re-authored `MAP` and `GROUND_SIZE = 280`.

- [ ] **Step 1: Bump world size + grid.** Edit the top of `map.ts`:
  - `export const GROUND_SIZE = 280;`
  - `ground` placement stays `{ kind: "ground", params: { size: GROUND_SIZE } }`.
  - `cityGrid` placement → `{ kind: "cityGrid", x: 0, z: 0, params: { pitch: 56, half: 2, length: 260, seed: 1 } }`.
  - Keep `PLAYER_SPAWN`/`CAR_SPAWN` unchanged.
  - `pavement` stays `{ w: 112, d: 112 }` (covers the core blocks only).

- [ ] **Step 2: Keep the core lots, plaza, kiosks, traffic lights** exactly as they are (the two `...lot(...)` blocks, `plaza`, two `kioskCart`s, four `trafficLight`s, the SE `terraceRow`). These are valid against the unchanged core junction.

- [ ] **Step 3: Add building rows filling the blocks.** Append these placements (coordinates keep buildings ≥6m off every road centerline; arterials are at ±56, ±112). Block interiors between arterials are centered at ±28 and ±84 on each axis. Rows face their fronting street via `rot`.

```ts
  // ── North district: two rows of buildings between the core and the highway ──
  // Row A faces the z=-56 arterial from the north (back row of the core blocks),
  // fronts facing +z toward the road → rot 0 puts fronts at higher z; we want
  // fronts toward the road (south), so rot 180.
  { kind: "buildingRow", x: -28, z: -40, rot: 0, params: { units: 4, d: 12, district: "north", anchor: "center", seed: 61 } },
  { kind: "buildingRow", x: 28, z: -40, rot: 0, params: { units: 4, d: 12, district: "north", anchor: "center", seed: 62 } },
  // Row B sits in the -56..-112 blocks, fronts facing the z=-56 road (south) → rot 180.
  { kind: "buildingRow", x: -28, z: -84, rot: 180, params: { units: 4, d: 13, district: "north", anchor: "center", seed: 63 } },
  { kind: "buildingRow", x: 28, z: -84, rot: 180, params: { units: 4, d: 13, district: "north", anchor: "center", seed: 64 } },

  // ── East & West rows facing the cross-v / ±56 vertical arterials ──
  // West block interior at x=-28: a row running along z, fronts facing +x (east)
  // toward the cross-v road → rot 90 maps local +z (front) to world +x.
  { kind: "buildingRow", x: -84, z: 28, rot: 90, params: { units: 4, d: 12, district: "west", anchor: "center", seed: 71 } },
  { kind: "buildingRow", x: -84, z: -28, rot: 90, params: { units: 4, d: 12, district: "west", anchor: "center", seed: 72 } },
  // East block interior at x=84: fronts facing -x (west) → rot 270.
  { kind: "buildingRow", x: 84, z: 28, rot: 270, params: { units: 4, d: 12, district: "east", anchor: "center", seed: 73 } },
  { kind: "buildingRow", x: 84, z: -28, rot: 270, params: { units: 4, d: 12, district: "east", anchor: "center", seed: 74 } },
```

NOTE on `rot`: verify front-facing visually is the user's job (PITFALL 1). The implementer's job is only that footprints don't overlap roads/each other and tsc/build pass. If the engine logs a footprint-overlap warning at build time, nudge the offending row's x/z so its derived footprint clears the corridor, then re-run.

- [ ] **Step 4: Relocate the four filler towers into a north skyline back row near the highway**, between the city and the highway (highway will sit at z≈-126). Replace the four existing `fillerBuilding` lines (currently at z=-68..-72) with a spread just south of the highway:

```ts
  // North skyline backdrop: glass towers just south of the highway.
  { kind: "fillerBuilding", x: -56, z: -112, params: { w: 14, d: 14, stories: 8, style: "glassTower", bodyColor: 0x6aa9c9, roofUnit: true, seed: 21 } },
  { kind: "fillerBuilding", x: -20, z: -116, params: { w: 16, d: 16, stories: 10, style: "darkGlass", bodyColor: 0x1d3b44, roofUnit: true, seed: 22 } },
  { kind: "fillerBuilding", x: 20, z: -116, params: { w: 14, d: 14, stories: 7, style: "glassTower", bodyColor: 0x9ac6e0, roofUnit: true, seed: 23 } },
  { kind: "fillerBuilding", x: 56, z: -112, params: { w: 13, d: 13, stories: 9, style: "darkGlass", bodyColor: 0x223f49, roofUnit: true, seed: 24 } },
```

- [ ] **Step 5: Place the highway along the north edge.**

```ts
  // ── Highway: a divided multi-lane highway bounding the city to the north. ──
  { kind: "highway", x: 0, z: -126, rot: 0, params: { length: 260, lanes: 2, laneW: 3.6, medianW: 4, shoulderW: 1.2, gantry: true, seed: 1 } },
```

- [ ] **Step 6: Typecheck.** Run: `npx tsc --noEmit` — Expected: clean.

- [ ] **Step 7: Check for footprint-overlap warnings.** Since the dev server can't run (PITFALL 1), inspect the engine's overlap logic isn't triggered by construction: the only colliders/obstacles in play are buildings (footprints at their placement x/z, sizes from their `w`/`d`), the highway (z=-126±~10), and core objects. Confirm by reasoning that no two placed footprints' AABBs intersect (rows centered at ±28/±84 with d≈12–13; towers at z=-112..-116; highway at z=-126). If any pair could overlap, nudge coordinates and note it. (No runtime check available — this is a static reasoning step.)

- [ ] **Step 8: Commit.**

```bash
git add src/world/map.ts
git commit -m "feat(world): restructure map into a city grid with building rows + highway"
```

---

### Task 5: Final gate

**Files:** none (verification only).

- [ ] **Step 1: Typecheck.** Run: `npx tsc --noEmit` — Expected: clean, no output.
- [ ] **Step 2: Build.** Run: `npx vite build` — Expected: succeeds (exit 0), bundle written, no errors.
- [ ] **Step 3:** If both pass, the branch/working tree is ready for the user to look in-game. Do NOT run the dev server or screenshot (PITFALL 1). Do NOT merge/deploy.

---

## Self-Review

**Spec coverage:**
- World expansion (280, grid half=2) → Task 4 Step 1. ✓
- `highway` object → Task 1. ✓
- `buildingRow` object → Task 2. ✓
- Map restructure: core kept + mid rows + north skyline + highway → Task 4. ✓
- Multiple rows of buildings → Task 4 Steps 3–4 (8 building rows + tower back row). ✓
- Two stores on the street → kept in Task 4 Step 2 (existing lots). ✓
- Perf: freeze static transforms → Task 3; single-mesh/instanced surfaces → Task 1 (carriageways, instanced dashes, merged rails). ✓
- No lighting/post changes → constraint stated; no task touches Engine.ts. ✓
- Out of scope (airport, AI traffic, new stores) → not in any task. ✓

**Placeholder scan:** No TBD/TODO; all code shown in full; commands explicit with expected output. ✓

**Type consistency:** `compose()` shape matches `terraceRow`'s; `Axis` type matches `fillerBuilding`'s `faces`; `Box`/`Rect`/`ObjectResult` from `system/types`; `fillerBuilding` params match the real builder. The `tintedBox(w,h,d,x,y,z,color)` signature is flagged for confirmation in Task 1 Step 1/4. ✓

**Open verification dependence:** Front-facing rotation correctness and visual placement are confirmed by the user in-game (PITFALL 1), not by this plan. Tasks gate only on tsc + vite build + non-overlapping footprints.
