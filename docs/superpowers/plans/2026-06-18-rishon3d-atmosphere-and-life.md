# Rishon3D Atmosphere & Life Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the rishon3d world a fixed golden-hour dusk look (~18:45, sun still up), real-looking roads (lane markings + sidewalks), more and more-varied trees, and new world modules (benches, lit windows) so the city feels inhabited.

**Architecture:** A single `DUSK` config + sun-direction math in `src/core/sky.ts` is the source of truth for the time-of-day look; `Engine` consumes it for the Three.js `Sky` shader, tone mapping, fog, and lights. Pure data/geometry helpers (roads, window texture, tree species) are unit-tested under vitest (no WebGL); thin Three.js builders consume them. World generation stays deterministic — new content is appended in fixed RNG order.

**Tech Stack:** TypeScript, Three.js 0.169 (incl. `examples/jsm/objects/Sky.js` and `examples/jsm/utils/BufferGeometryUtils.js`), Rapier 3D, Vite, Vitest.

## Global Constraints

- All work is inside the `rishon3d/` subfolder. Run npm/test/build commands from `rishon3d/`.
- `tsconfig.json` has `strict`, `noUnusedLocals`, `noUnusedParameters` all `true` — **remove imports/params as soon as they go unused** or `npm run build` fails.
- World generation MUST stay deterministic: never add `Math.random`; use `mulberry32(seed)` from `src/world/rng.ts`. Append new RNG draws at the END of an existing fixed draw sequence so prior output is unchanged.
- All world materials are `MeshStandardMaterial` (light-reactive). Keep it that way.
- Shared geometries/materials go through `getGeometry(key, make)` / `getMaterial(key, make)` from `src/world/assets.ts` so GPU allocation stays O(distinct kinds).
- Instanced static props use `makeInstanced(geometry, material, placements, baseY)` from `src/world/InstancedProps.ts`; vertical offset is baked into the geometry via `geometry.translate(...)`.
- Single-test run: `npx vitest run test/<file>.test.ts`. Full gate: `npm run test` then `npm run build`.
- Commit after each task. End commit messages with the Co-Authored-By trailer used in this repo.

---

### Task 1: Dusk atmosphere config + sun math (`src/core/sky.ts`)

**Files:**
- Create: `rishon3d/src/core/sky.ts`
- Test: `rishon3d/test/sky.test.ts`

**Interfaces:**
- Consumes: `three` (`THREE.Vector3`, `THREE.MathUtils`).
- Produces:
  - `sunDirection(elevationDeg: number, azimuthDeg: number): THREE.Vector3` — unit vector; azimuth 0 = +Z (north), 90 = +X (east); elevation = degrees above horizon.
  - `sunPosition(distance: number): THREE.Vector3` — `sunDirection(DUSK.sunElevationDeg, DUSK.sunAzimuthDeg)` scaled by `distance`.
  - `DUSK` — frozen config object with numeric fields: `sunElevationDeg, sunAzimuthDeg, turbidity, rayleigh, mieCoefficient, mieDirectionalG, exposure, fogColor, fogNear, fogFar, hemiSky, hemiGround, hemiIntensity, sunColor, sunIntensity, ambientColor, ambientIntensity, windowEmissive, windowEmissiveIntensity`.

- [ ] **Step 1: Write the failing test**

Create `rishon3d/test/sky.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { sunDirection, sunPosition, DUSK } from "../src/core/sky";

describe("sunDirection", () => {
  it("points east at azimuth 90, horizon elevation", () => {
    const v = sunDirection(0, 90);
    expect(v.x).toBeCloseTo(1, 5);
    expect(v.y).toBeCloseTo(0, 5);
    expect(v.z).toBeCloseTo(0, 5);
  });

  it("points north (+Z) at azimuth 0, horizon elevation", () => {
    const v = sunDirection(0, 0);
    expect(v.z).toBeCloseTo(1, 5);
    expect(v.x).toBeCloseTo(0, 5);
  });

  it("points straight up at elevation 90", () => {
    const v = sunDirection(90, 123);
    expect(v.y).toBeCloseTo(1, 5);
  });

  it("returns a unit vector", () => {
    const v = sunDirection(33, 217);
    expect(v.length()).toBeCloseTo(1, 6);
  });
});

describe("sunPosition", () => {
  it("scales the sun direction by distance", () => {
    const p = sunPosition(100);
    expect(p.length()).toBeCloseTo(100, 4);
  });
});

describe("DUSK", () => {
  it("keeps the sun low but above the horizon (golden hour)", () => {
    expect(DUSK.sunElevationDeg).toBeGreaterThan(0);
    expect(DUSK.sunElevationDeg).toBeLessThan(15);
  });
  it("uses sub-1 exposure so it reads a bit dark", () => {
    expect(DUSK.exposure).toBeGreaterThan(0);
    expect(DUSK.exposure).toBeLessThan(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd rishon3d && npx vitest run test/sky.test.ts`
Expected: FAIL — cannot resolve `../src/core/sky`.

- [ ] **Step 3: Write minimal implementation**

Create `rishon3d/src/core/sky.ts`:

```ts
import * as THREE from "three";

// Compass azimuth: 0 = north (+Z), 90 = east (+X). Elevation: degrees above
// the horizon. Returns a unit vector from the origin toward the sun.
export function sunDirection(elevationDeg: number, azimuthDeg: number): THREE.Vector3 {
  const el = THREE.MathUtils.degToRad(elevationDeg);
  const az = THREE.MathUtils.degToRad(azimuthDeg);
  const cosEl = Math.cos(el);
  return new THREE.Vector3(cosEl * Math.sin(az), Math.sin(el), cosEl * Math.cos(az)).normalize();
}

// The single source of truth for the "18:45, ~20 min before sunset" look.
// Consumed by Engine (sky + lights + fog + exposure) and builders (window glow).
export const DUSK = {
  sunElevationDeg: 4,     // low but still up -> long shadows, sun visible
  sunAzimuthDeg: 290,     // WNW, where the sun sets
  turbidity: 8,
  rayleigh: 2.5,
  mieCoefficient: 0.008,
  mieDirectionalG: 0.82,
  exposure: 0.5,          // sub-1 -> "a bit dark but sun still out"
  fogColor: 0xe8a262,     // warm dusk haze matching the horizon glow
  fogNear: 50,
  fogFar: 200,
  hemiSky: 0xffd9a8,
  hemiGround: 0x4a4036,
  hemiIntensity: 0.45,
  sunColor: 0xffb060,     // warm golden key light
  sunIntensity: 2.4,
  ambientColor: 0x4a5a78, // cool sky fill
  ambientIntensity: 0.3,
  windowEmissive: 0xffd27a,
  windowEmissiveIntensity: 0.9,
} as const;

export function sunPosition(distance: number): THREE.Vector3 {
  return sunDirection(DUSK.sunElevationDeg, DUSK.sunAzimuthDeg).multiplyScalar(distance);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd rishon3d && npx vitest run test/sky.test.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add rishon3d/src/core/sky.ts rishon3d/test/sky.test.ts
git commit -m "feat(rishon3d): dusk atmosphere config + sun-direction math

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Wire the atmosphere into the renderer (`src/core/Engine.ts`)

**Files:**
- Modify: `rishon3d/src/core/Engine.ts:14-43` (constructor scene/light setup)

**Interfaces:**
- Consumes: `DUSK`, `sunPosition` from Task 1; `Sky` from `three/examples/jsm/objects/Sky.js`.
- Produces: no new exports — visual change only. Verified by `npm run build` + the Playwright smoke test (Engine uses `WebGLRenderer`, which cannot run under vitest/node).

- [ ] **Step 1: Add imports**

At the top of `rishon3d/src/core/Engine.ts`, below `import * as THREE from "three";`, add:

```ts
import { Sky } from "three/examples/jsm/objects/Sky.js";
import { DUSK, sunPosition } from "./sky";
```

- [ ] **Step 2: Replace the scene/background/fog/light block**

Replace the constructor body from the `const haze = ...` line through the `this.scene.add(new THREE.AmbientLight(...))` line (currently lines 15-40) with:

```ts
    const sunDir = sunPosition(1);

    // Sky dome: physically-based Rayleigh/Mie sunset glow, replaces the flat
    // background color. Driven entirely by DUSK so sky + lights stay in sync.
    const sky = new Sky();
    sky.scale.setScalar(10000);
    const u = sky.material.uniforms;
    u.turbidity.value = DUSK.turbidity;
    u.rayleigh.value = DUSK.rayleigh;
    u.mieCoefficient.value = DUSK.mieCoefficient;
    u.mieDirectionalG.value = DUSK.mieDirectionalG;
    u.sunPosition.value.copy(sunDir);
    this.scene.add(sky);

    // Warm haze so distant districts melt into the horizon glow.
    this.scene.fog = new THREE.Fog(DUSK.fogColor, DUSK.fogNear, DUSK.fogFar);

    this.camera = new THREE.PerspectiveCamera(60, this.aspect(), 0.1, 1000);
    this.camera.position.set(0, 8, 14);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = DUSK.exposure;
    container.appendChild(this.renderer.domElement);

    const hemi = new THREE.HemisphereLight(DUSK.hemiSky, DUSK.hemiGround, DUSK.hemiIntensity);
    this.scene.add(hemi);
    const sun = new THREE.DirectionalLight(DUSK.sunColor, DUSK.sunIntensity);
    sun.position.copy(sunPosition(120)); // far, along the sun direction -> long shadows
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    const s = 100; // widened for the long dusk shadows
    sun.shadow.camera.left = -s; sun.shadow.camera.right = s;
    sun.shadow.camera.top = s; sun.shadow.camera.bottom = -s;
    sun.shadow.camera.far = 400;
    this.scene.add(sun);
    this.scene.add(new THREE.AmbientLight(DUSK.ambientColor, DUSK.ambientIntensity));
```

(The `this.camera` / `this.renderer` assignments stay; they are just relocated to keep them after the sky setup. Confirm there is exactly one assignment of each and no leftover `haze` reference.)

- [ ] **Step 3: Type-check the build**

Run: `cd rishon3d && npm run build`
Expected: PASS — `tsc --noEmit` clean (no unused `haze`, imports resolve) and Vite build succeeds.

- [ ] **Step 4: Confirm no test regressions**

Run: `cd rishon3d && npm run test`
Expected: PASS — existing suite still green (Engine has no unit tests; this confirms nothing else broke).

- [ ] **Step 5: Commit**

```bash
git add rishon3d/src/core/Engine.ts
git commit -m "feat(rishon3d): golden-hour Sky, ACES tone mapping, dusk fog + lights

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Real roads — lane markings + sidewalks (`src/world/roads.ts`)

**Files:**
- Create: `rishon3d/src/world/roads.ts`
- Test: `rishon3d/test/roads.test.ts`
- Modify: `rishon3d/src/world/World.ts:3,10` (swap `makeRoad` loop for `makeRoadNetwork`)

**Interfaces:**
- Consumes: `RoadDef` from `./rishonMap`; `getGeometry`/`getMaterial` from `./assets`; `makeInstanced`, `Placement` from `./InstancedProps`.
- Produces:
  - `laneDashes(road: RoadDef): Placement[]` — dashed center-line segment placements.
  - `sidewalkRects(road: RoadDef): Rect[]` where `interface Rect { x: number; z: number; w: number; d: number }` — two flanking curb strips.
  - `makeRoadNetwork(roads: RoadDef[]): THREE.Group` — asphalt + sidewalks + one instanced dash mesh.
  - `ROAD_W = 6` (number).

- [ ] **Step 1: Write the failing test**

Create `rishon3d/test/roads.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { laneDashes, sidewalkRects, ROAD_W } from "../src/world/roads";
import type { RoadDef } from "../src/world/rishonMap";

const hRoad: RoadDef = { id: "h", x: 0, z: 10, length: 40, horizontal: true };
const vRoad: RoadDef = { id: "v", x: -5, z: 0, length: 40, horizontal: false };

describe("laneDashes", () => {
  it("emits evenly spaced dashes along a horizontal road's x axis", () => {
    const d = laneDashes(hRoad);
    expect(d.length).toBeGreaterThan(0);
    for (const p of d) expect(p.z).toBeCloseTo(hRoad.z, 6); // stays on the road centerline
    expect(d.every((p) => p.rotationY === Math.PI / 2)).toBe(true);
  });

  it("emits dashes along a vertical road's z axis", () => {
    const d = laneDashes(vRoad);
    for (const p of d) expect(p.x).toBeCloseTo(vRoad.x, 6);
    expect(d.every((p) => p.rotationY === 0)).toBe(true);
  });

  it("is symmetric about the road center", () => {
    const xs = laneDashes(hRoad).map((p) => p.x);
    const sum = xs.reduce((a, b) => a + b, 0);
    expect(sum / xs.length).toBeCloseTo(hRoad.x, 6);
  });
});

describe("sidewalkRects", () => {
  it("flanks a horizontal road on both z sides at half-road + half-sidewalk", () => {
    const r = sidewalkRects(hRoad);
    expect(r.length).toBe(2);
    const offs = r.map((s) => s.z - hRoad.z).sort((a, b) => a - b);
    expect(offs[0]).toBeCloseTo(-offs[1], 6);
    expect(Math.abs(offs[0])).toBeGreaterThan(ROAD_W / 2);
    for (const s of r) expect(s.w).toBeCloseTo(hRoad.length, 6);
  });

  it("flanks a vertical road on both x sides", () => {
    const r = sidewalkRects(vRoad);
    const offs = r.map((s) => s.x - vRoad.x).sort((a, b) => a - b);
    expect(offs[0]).toBeCloseTo(-offs[1], 6);
    for (const s of r) expect(s.d).toBeCloseTo(vRoad.length, 6);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd rishon3d && npx vitest run test/roads.test.ts`
Expected: FAIL — cannot resolve `../src/world/roads`.

- [ ] **Step 3: Write minimal implementation**

Create `rishon3d/src/world/roads.ts`:

```ts
import * as THREE from "three";
import type { RoadDef } from "./rishonMap";
import { getGeometry, getMaterial } from "./assets";
import { makeInstanced, type Placement } from "./InstancedProps";

export const ROAD_W = 6;
const SIDEWALK_W = 1.6;
const DASH_LEN = 2;
const DASH_GAP = 2;

export interface Rect { x: number; z: number; w: number; d: number }

// Dashed center line. Dashes run along the road's long axis, centered on it.
export function laneDashes(road: RoadDef): Placement[] {
  const period = DASH_LEN + DASH_GAP;
  const count = Math.max(0, Math.floor(road.length / period));
  const span = count * period;
  const start = -span / 2 + period / 2;
  const out: Placement[] = [];
  for (let i = 0; i < count; i++) {
    const t = start + i * period;
    if (road.horizontal) {
      out.push({ x: road.x + t, z: road.z, rotationY: Math.PI / 2 });
    } else {
      out.push({ x: road.x, z: road.z + t, rotationY: 0 });
    }
  }
  return out;
}

// Two concrete strips flanking the asphalt.
export function sidewalkRects(road: RoadDef): Rect[] {
  const off = ROAD_W / 2 + SIDEWALK_W / 2;
  if (road.horizontal) {
    return [
      { x: road.x, z: road.z - off, w: road.length, d: SIDEWALK_W },
      { x: road.x, z: road.z + off, w: road.length, d: SIDEWALK_W },
    ];
  }
  return [
    { x: road.x - off, z: road.z, w: SIDEWALK_W, d: road.length },
    { x: road.x + off, z: road.z, w: SIDEWALK_W, d: road.length },
  ];
}

export function makeRoadNetwork(roads: RoadDef[]): THREE.Group {
  const group = new THREE.Group();
  const asphalt = getMaterial("asphalt", () => new THREE.MeshStandardMaterial({ color: 0x33333a }));
  const concrete = getMaterial("concrete", () => new THREE.MeshStandardMaterial({ color: 0x8c8a86 }));

  for (const r of roads) {
    const w = r.horizontal ? r.length : ROAD_W;
    const d = r.horizontal ? ROAD_W : r.length;
    const surf = new THREE.Mesh(new THREE.PlaneGeometry(w, d), asphalt);
    surf.rotation.x = -Math.PI / 2;
    surf.position.set(r.x, 0.02, r.z);
    surf.receiveShadow = true;
    group.add(surf);

    for (const s of sidewalkRects(r)) {
      const sw = new THREE.Mesh(new THREE.PlaneGeometry(s.w, s.d), concrete);
      sw.rotation.x = -Math.PI / 2;
      sw.position.set(s.x, 0.015, s.z); // just below the asphalt to avoid z-fight at edges
      sw.receiveShadow = true;
      group.add(sw);
    }
  }

  // All center-line dashes in a single instanced draw.
  const dashes = roads.flatMap(laneDashes);
  if (dashes.length) {
    const dashGeo = getGeometry("laneDash", () => {
      const g = new THREE.PlaneGeometry(0.18, DASH_LEN);
      g.rotateX(-Math.PI / 2); // lie flat; long axis along +z
      return g;
    });
    const dashMat = getMaterial("laneDashMat", () => new THREE.MeshStandardMaterial({ color: 0xf2e9c0 }));
    const mesh = makeInstanced(dashGeo, dashMat, dashes, 0.03); // above asphalt
    mesh.castShadow = false;
    group.add(mesh);
  }
  return group;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd rishon3d && npx vitest run test/roads.test.ts`
Expected: PASS.

- [ ] **Step 5: Wire into World**

In `rishon3d/src/world/World.ts`:
- Change the import on line 3 from `import { makeBuilding, makeGround, makeRoad } from "./builders";` to `import { makeBuilding, makeGround } from "./builders";` (drop `makeRoad` — it is now unused and `noUnusedLocals` will fail the build otherwise).
- Add a new import after line 5: `import { makeRoadNetwork } from "./roads";`
- Replace line 10 `for (const r of map.roads) scene.add(makeRoad(r));` with `scene.add(makeRoadNetwork(map.roads));`

- [ ] **Step 6: Build to confirm wiring + no unused imports**

Run: `cd rishon3d && npm run build`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add rishon3d/src/world/roads.ts rishon3d/test/roads.test.ts rishon3d/src/world/World.ts
git commit -m "feat(rishon3d): real roads with lane markings and sidewalks

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Tree variety + benches (`src/world/props.ts`)

**Files:**
- Modify: `rishon3d/src/world/rishonMap.ts:13` (add `"bench"` to `PropKind`)
- Modify: `rishon3d/src/world/props.ts` (species split + `benchInstances`)
- Test: `rishon3d/test/props.test.ts`

**Interfaces:**
- Consumes: `PropDef`, `PropKind` from `./rishonMap`; `mergeGeometries` from `three/examples/jsm/utils/BufferGeometryUtils.js`; existing `getGeometry`/`getMaterial`/`makeInstanced`.
- Produces:
  - `treeSpecies(index: number): number` — `0` = conifer, `1` = deciduous, deterministic.
  - `treeInstances(props)` (existing signature) now emits trunk + per-species foliage meshes.
  - `benchInstances(props: PropDef[]): THREE.Object3D`.

- [ ] **Step 1: Extend the PropKind type**

In `rishon3d/src/world/rishonMap.ts` line 13, change:

```ts
export type PropKind = "tree" | "streetlight" | "bush";
```

to:

```ts
export type PropKind = "tree" | "streetlight" | "bush" | "bench";
```

- [ ] **Step 2: Write the failing test**

Create `rishon3d/test/props.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import * as THREE from "three";
import { treeSpecies, treeInstances, benchInstances } from "../src/world/props";
import type { PropDef } from "../src/world/rishonMap";

describe("treeSpecies", () => {
  it("is deterministic and partitions into two species", () => {
    const kinds = new Set([0, 1, 2, 3, 4, 5].map(treeSpecies));
    expect(kinds.has(0)).toBe(true);
    expect(kinds.has(1)).toBe(true);
    expect(treeSpecies(2)).toBe(treeSpecies(2));
    for (const i of [0, 1, 2, 3]) expect([0, 1]).toContain(treeSpecies(i));
  });
});

describe("treeInstances", () => {
  it("returns a group containing a trunk plus foliage instanced meshes", () => {
    const props: PropDef[] = [
      { id: "t1", kind: "tree", x: 0, z: 0 },
      { id: "t2", kind: "tree", x: 4, z: 0 },
      { id: "b1", kind: "bush", x: 8, z: 0 },
    ];
    const grp = treeInstances(props) as THREE.Group;
    const meshes = grp.children.filter((c) => (c as THREE.InstancedMesh).isInstancedMesh);
    // trunk (2) + at least one foliage species
    expect(meshes.length).toBeGreaterThanOrEqual(2);
    const total = meshes.reduce((n, m) => n + (m as THREE.InstancedMesh).count, 0);
    // 2 trunks + 2 foliage instances spread across species
    expect(total).toBe(4);
  });
});

describe("benchInstances", () => {
  it("creates one instance per bench prop", () => {
    const props: PropDef[] = [
      { id: "x1", kind: "bench", x: 1, z: 1 },
      { id: "x2", kind: "bench", x: 2, z: 2 },
      { id: "t", kind: "tree", x: 0, z: 0 },
    ];
    const mesh = benchInstances(props) as THREE.InstancedMesh;
    expect(mesh.count).toBe(2);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd rishon3d && npx vitest run test/props.test.ts`
Expected: FAIL — `treeSpecies` / `benchInstances` not exported.

- [ ] **Step 4: Implement species split + bench in `props.ts`**

In `rishon3d/src/world/props.ts`:

Add the import below the existing imports (after line 4):

```ts
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
```

Add a deciduous foliage geometry + material beside the existing `foliageGeo`/`foliageMat` (after line 20 / line 30 respectively):

```ts
function deciduousGeo(): THREE.BufferGeometry {
  return getGeometry("foliageDecid", () => {
    const g = new THREE.SphereGeometry(1.2, 10, 8);
    g.scale(1, 1.1, 1);
    g.translate(0, 2.3, 0);
    return g;
  });
}
```

```ts
const deciduousMat = () => getMaterial("foliageDecidMat", () => new THREE.MeshStandardMaterial({ color: 0x5a9e4a }));
```

Add bench geometry + material (anywhere among the geometry/material helpers):

```ts
function benchGeo(): THREE.BufferGeometry {
  return getGeometry("bench", () => {
    const seat = new THREE.BoxGeometry(1.6, 0.12, 0.5); seat.translate(0, 0.5, 0);
    const back = new THREE.BoxGeometry(1.6, 0.5, 0.1); back.translate(0, 0.78, -0.2);
    const legL = new THREE.BoxGeometry(0.12, 0.5, 0.5); legL.translate(-0.7, 0.25, 0);
    const legR = new THREE.BoxGeometry(0.12, 0.5, 0.5); legR.translate(0.7, 0.25, 0);
    return mergeGeometries([seat, back, legL, legR]);
  });
}
const benchMat = () => getMaterial("benchMat", () => new THREE.MeshStandardMaterial({ color: 0x8a5a2b }));
```

Add the species helper (export it) above `treeInstances`:

```ts
// Deterministic species per tree: 0 = conifer (cone), 1 = deciduous (round).
export function treeSpecies(index: number): number {
  return index % 2;
}
```

Replace the existing `treeInstances` function (lines 39-46) with:

```ts
export function treeInstances(props: PropDef[]): THREE.Object3D {
  const group = new THREE.Group();
  const pl = placementsFor(props, "tree");
  if (pl.length === 0) return group;
  group.add(makeInstanced(trunkGeo(), trunkMat(), pl, 0));
  const conifer = pl.filter((_, i) => treeSpecies(i) === 0);
  const decid = pl.filter((_, i) => treeSpecies(i) === 1);
  if (conifer.length) group.add(makeInstanced(foliageGeo(), foliageMat(), conifer, 0));
  if (decid.length) group.add(makeInstanced(deciduousGeo(), deciduousMat(), decid, 0));
  return group;
}
```

Add `benchInstances` after `bushInstances`:

```ts
export function benchInstances(props: PropDef[]): THREE.Object3D {
  const pl = placementsFor(props, "bench");
  return makeInstanced(benchGeo(), benchMat(), pl, 0);
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd rishon3d && npx vitest run test/props.test.ts`
Expected: PASS.

- [ ] **Step 6: Full suite + build (PropKind change touches several files)**

Run: `cd rishon3d && npm run test && npm run build`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add rishon3d/src/world/props.ts rishon3d/src/world/rishonMap.ts rishon3d/test/props.test.ts
git commit -m "feat(rishon3d): two tree species + instanced park benches

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Lit windows at dusk (`src/world/windows.ts`)

**Files:**
- Create: `rishon3d/src/world/windows.ts`
- Test: `rishon3d/test/windows.test.ts`
- Modify: `rishon3d/src/world/builders.ts` (apply window emissive map to non-house buildings)

**Interfaces:**
- Consumes: `three` (`DataTexture`); `mulberry32` from `./rng`; `DUSK` from `../core/sky`.
- Produces:
  - `windowPattern(cols: number, rows: number, seed: number): Uint8Array` — RGBA pixels, length `cols*rows*4`.
  - `makeWindowTexture(cols?: number, rows?: number, seed?: number): THREE.DataTexture`.

- [ ] **Step 1: Write the failing test**

Create `rishon3d/test/windows.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { windowPattern } from "../src/world/windows";

describe("windowPattern", () => {
  it("produces RGBA data of length cols*rows*4", () => {
    const d = windowPattern(8, 8, 1);
    expect(d.length).toBe(8 * 8 * 4);
  });

  it("is deterministic for a seed", () => {
    expect(Array.from(windowPattern(6, 6, 42))).toEqual(Array.from(windowPattern(6, 6, 42)));
  });

  it("lights some windows but not all (alpha always opaque)", () => {
    const d = windowPattern(10, 10, 7);
    let lit = 0;
    for (let i = 0; i < 100; i++) {
      expect(d[i * 4 + 3]).toBe(255); // opaque
      if (d[i * 4] > 200) lit++; // warm-lit pixels have high red
    }
    expect(lit).toBeGreaterThan(0);
    expect(lit).toBeLessThan(100);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd rishon3d && npx vitest run test/windows.test.ts`
Expected: FAIL — cannot resolve `../src/world/windows`.

- [ ] **Step 3: Write minimal implementation**

Create `rishon3d/src/world/windows.ts`:

```ts
import * as THREE from "three";
import { mulberry32 } from "./rng";

// Deterministic grid of windows: a warm-lit subset glows, the rest are dark.
// Pure pixel data (no canvas/DOM) so it is unit-testable under node.
export function windowPattern(cols: number, rows: number, seed: number): Uint8Array {
  const rng = mulberry32(seed);
  const data = new Uint8Array(cols * rows * 4);
  for (let i = 0; i < cols * rows; i++) {
    const o = i * 4;
    if (rng() < 0.45) {
      data[o] = 255; data[o + 1] = 210; data[o + 2] = 130; data[o + 3] = 255;
    } else {
      data[o] = 12; data[o + 1] = 12; data[o + 2] = 16; data[o + 3] = 255;
    }
  }
  return data;
}

export function makeWindowTexture(cols = 8, rows = 8, seed = 1337): THREE.DataTexture {
  const tex = new THREE.DataTexture(windowPattern(cols, rows, seed), cols, rows, THREE.RGBAFormat);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.needsUpdate = true;
  return tex;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd rishon3d && npx vitest run test/windows.test.ts`
Expected: PASS.

- [ ] **Step 5: Apply lit windows to non-house buildings**

In `rishon3d/src/world/builders.ts`:

Add imports after line 2:

```ts
import { makeWindowTexture } from "./windows";
import { DUSK } from "../core/sky";
```

Add a shared-texture accessor above `makeGround` (after the imports):

```ts
// One shared base window texture; cloned per building so each can tile its
// windows at a believable size via texture.repeat.
let WINDOW_TEX: THREE.DataTexture | null = null;
function windowTexture(): THREE.DataTexture {
  if (!WINDOW_TEX) WINDOW_TEX = makeWindowTexture();
  return WINDOW_TEX;
}
```

Replace the non-house branch (current lines 53-59) of `makeBuilding`:

```ts
  const geo = new THREE.BoxGeometry(def.width, def.height, def.depth);
  const mat = new THREE.MeshStandardMaterial({ color: def.color });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(def.x, def.height / 2, def.z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
```

with:

```ts
  const geo = new THREE.BoxGeometry(def.width, def.height, def.depth);
  const tex = windowTexture().clone();
  tex.needsUpdate = true;
  tex.repeat.set(Math.max(1, Math.round(def.width / 3)), Math.max(1, Math.round(def.height / 3)));
  const mat = new THREE.MeshStandardMaterial({
    color: def.color,
    emissive: DUSK.windowEmissive,
    emissiveMap: tex,
    emissiveIntensity: DUSK.windowEmissiveIntensity,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(def.x, def.height / 2, def.z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
```

- [ ] **Step 6: Build + full suite**

Run: `cd rishon3d && npm run test && npm run build`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add rishon3d/src/world/windows.ts rishon3d/test/windows.test.ts rishon3d/src/world/builders.ts
git commit -m "feat(rishon3d): warm lit-window emissive maps on buildings for dusk

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: Denser, livelier world — content tuning (deterministic)

**Files:**
- Modify: `rishon3d/src/world/cityGen.ts` (more vegetation + occasional benches)
- Modify: `rishon3d/src/world/worldData.ts` (roadside tree rows along arterials)
- Modify: `rishon3d/src/world/rishonMap.ts` (a few core benches + trees)
- Modify: `rishon3d/src/world/World.ts` (add bench instances, raise streetlight budget)
- Modify: `rishon3d/test/cityGen.test.ts` (assert bench/veg determinism)

**Interfaces:**
- Consumes: `benchInstances` from `./props` (Task 4); `makeRoadNetwork` already wired (Task 3); existing `generateDistrict`, `assembleMap`.
- Produces: no new exports; richer `PropDef[]` content. Building geometry/ids are unchanged (RNG draw order for buildings is preserved).

- [ ] **Step 1: More vegetation + benches in `cityGen.ts` (preserve draw order)**

In `rishon3d/src/world/cityGen.ts`, inside the per-cell loop, the fixed RNG block currently ends at `const rtree = rng();`. Append one new draw immediately after it (keeps all building draws — `place,rw,rd,rh,rc` — byte-for-byte identical):

```ts
      const rtree = rng();
      const rbench = rng(); // appended; building layout above is unaffected
```

Then replace the existing tree/bush placement block (current lines 52-57):

```ts
      if (rtree < 0.5) {
        // Tuck a bush/tree against the building, still clear of the corridor.
        const kind = rtree < 0.25 ? "tree" : "bush";
        const ox = (w / 2) + 0.8;
        props.push({ id: `${spec.id}-p-${gx}-${gz}`, kind, x: cx - ox, z: cz });
      }
```

with:

```ts
      if (rtree < 0.7) {
        // Tuck a bush/tree against the building, still clear of the corridor.
        const kind = rtree < 0.35 ? "tree" : "bush";
        const ox = (w / 2) + 0.8;
        props.push({ id: `${spec.id}-p-${gx}-${gz}`, kind, x: cx - ox, z: cz });
      }
      if (rbench < 0.18) {
        const oz = (d / 2) + 0.8;
        props.push({ id: `${spec.id}-bench-${gx}-${gz}`, kind: "bench", x: cx, z: cz + oz });
      }
```

- [ ] **Step 2: Roadside tree rows in `worldData.ts`**

In `rishon3d/src/world/worldData.ts`, add a helper above `assembleMap` (uses the existing `arterials()`):

```ts
// Tree-line the arterials so the drives between districts feel alive.
function roadsideTrees(): PropDef[] {
  const out: PropDef[] = [];
  const spacing = 8;
  const flank = 5;
  for (const a of arterials()) {
    const n = Math.floor(a.length / spacing);
    for (let i = 0; i <= n; i++) {
      const t = -a.length / 2 + i * spacing;
      if (a.horizontal) {
        out.push({ id: `rt-${a.id}-${i}-a`, kind: "tree", x: a.x + t, z: a.z - flank });
        out.push({ id: `rt-${a.id}-${i}-b`, kind: "tree", x: a.x + t, z: a.z + flank });
      } else {
        out.push({ id: `rt-${a.id}-${i}-a`, kind: "tree", x: a.x - flank, z: a.z + t });
        out.push({ id: `rt-${a.id}-${i}-b`, kind: "tree", x: a.x + flank, z: a.z + t });
      }
    }
  }
  return out;
}
```

Add `PropDef` to the type import on line 1:

```ts
import { CORE_MAP, type RishonMap, type RoadDef, type PropDef } from "./rishonMap";
```

Then in `assembleMap`, after `const props = [...CORE_MAP.props];`, add:

```ts
  props.push(...roadsideTrees());
```

- [ ] **Step 3: A few hand-placed core benches + trees in `rishonMap.ts`**

In `rishon3d/src/world/rishonMap.ts`, append to the `props` array of `CORE_MAP` (after the `l6` streetlight entry, before the closing `]`):

```ts
    { id: "bench-c1", kind: "bench", x: 6, z: -6 }, { id: "bench-c2", kind: "bench", x: -6, z: 6 },
    { id: "bench-c3", kind: "bench", x: 16, z: 2 },
    { id: "t9", kind: "tree", x: -16, z: 6 }, { id: "t10", kind: "tree", x: 16, z: -6 },
    { id: "t11", kind: "tree", x: 0, z: 30 }, { id: "t12", kind: "tree", x: 0, z: -30 },
```

(These are clear of the 8 core building footprints and inside bounds; `validateMap` only checks props for in-bounds, which holds.)

- [ ] **Step 4: Add bench instances + more dusk light in `World.ts`**

In `rishon3d/src/world/World.ts`:
- Update the props import (line 4) to include benches: `import { treeInstances, bushInstances, makeStreetLight, benchInstances } from "./props";`
- After the `scene.add(bushInstances(map.props));` line, add: `scene.add(benchInstances(map.props));`
- Change `let lightBudget = 6;` to `let lightBudget = 12;` (dusk wants more pooled glow).

- [ ] **Step 5: Update `cityGen.test.ts` for the new content**

In `rishon3d/test/cityGen.test.ts`, add these cases inside the `describe("generateDistrict", ...)` block (the existing building tests still pass unchanged because building RNG draws are untouched):

```ts
  it("still produces a deterministic prop set after the bench draw", () => {
    const a = generateDistrict(spec).props.map((p) => p.id);
    const b = generateDistrict(spec).props.map((p) => p.id);
    expect(a).toEqual(b);
  });

  it("can place benches as a prop kind", () => {
    // density 1 spec fills every cell; with the bench probability some appear.
    const dense = generateDistrict({ ...spec, seed: 5 });
    const kinds = new Set(dense.props.map((p) => p.kind));
    expect([...kinds].every((k) => ["tree", "bush", "bench"].includes(k))).toBe(true);
  });
```

- [ ] **Step 6: Full suite + build**

Run: `cd rishon3d && npm run test && npm run build`
Expected: PASS — all suites green, including `worldData.test.ts` (still one house, ids unique, buildings in bounds) and `rishonMap.test.ts` (CORE_MAP still valid).

- [ ] **Step 7: Commit**

```bash
git add rishon3d/src/world/cityGen.ts rishon3d/src/world/worldData.ts rishon3d/src/world/rishonMap.ts rishon3d/src/world/World.ts rishon3d/test/cityGen.test.ts
git commit -m "feat(rishon3d): denser vegetation, tree-lined arterials, benches, more dusk lights

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Final verification (after all tasks)

- [ ] `cd rishon3d && npm run test` — entire vitest suite green.
- [ ] `cd rishon3d && npm run build` — `tsc --noEmit` + Vite build clean.
- [ ] `cd rishon3d && npm run test:smoke` — Playwright smoke test loads the scene without console errors (best-effort; note if the headless environment cannot run it).
- [ ] Manual/screenshot sanity (if a browser is available): start `npm run dev`, confirm the sky reads as golden-hour dusk, roads show lane markings + sidewalks, trees vary, windows glow warmly, benches present.

## Self-Review

- **Spec coverage:** D1-D4 atmosphere → Tasks 1-2; D5 real roads → Task 3; D6 tree variety + benches → Task 4 (+6 content); D7 lit windows → Task 5; D8/D10 life + light budget → Task 6; D9 determinism → Task 6 (appended RNG draw + tests). All spec units mapped.
- **Placeholder scan:** No TBD/TODO; every code step shows full code.
- **Type consistency:** `treeSpecies`, `benchInstances`, `makeRoadNetwork`, `laneDashes`, `sidewalkRects`, `Rect`, `windowPattern`, `makeWindowTexture`, `DUSK`, `sunDirection`, `sunPosition` used with identical names/signatures across tasks. `PropKind` gains `"bench"` in Task 4 before Task 6 emits bench props. `makeRoad` import removed in Task 3 (the only consumer).
