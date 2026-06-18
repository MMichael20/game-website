# rishon3d Voxel Daytime "Toy-City Readability" Pass (v0.1) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pivot the rishon3d spike from a warm dusk-realism look to a bright, saturated, blocky Roblox/voxel daytime scene (reference: `assets/roblox-style-city-browser-game.png`), reshaping the hero entities (tree, character, car) and adding curbs, awnings, blocky clouds, and a static elevated rail — with zero gameplay/physics changes.

**Architecture:** Three.js + Rapier browser game. The scene mood lives in `core/sky.ts` (config) + `core/Engine.ts` (sky/lights/render). World content is built from a `RishonMap` by `world/World.ts` and per-kind builders/props. Entities (`Character`, `Car`, NPCs) are `Tickable`s. This plan changes materials, colors, geometry, and lighting only; it adds small additive modules (`palette.ts`, `clouds.ts`, `rail.ts`, `carMesh.ts`) and keeps the existing instancing/material-cache and seeded-RNG patterns.

**Tech Stack:** TypeScript, three.js ^0.169, @dimforge/rapier3d-compat, Vite, Vitest, Playwright. Run all commands from `rishon3d/` inside the worktree `C:\Learning\game-website\.claude\worktrees\3d-spike`.

## Global Constraints

- **No gameplay/physics/controls changes.** Driving, walking, NPCs, taxi/phone-ride flow, minimap, HUD, phone, world layout, spawns, and all collider shapes/sizes behave exactly as before. Visual mesh changes must NOT change any Rapier collider, wheel position, or rigidbody.
- **Keep the performance architecture.** Reuse `world/assets.ts` (`getGeometry`/`getMaterial`) and `world/InstancedProps.ts` (`makeInstanced`). New repeated props (clouds, curbs, rail pillars) must be instanced or geometry-merged (`mergeGeometries`), not one mesh per object.
- **Determinism.** Any randomized placement uses `mulberry32` from `world/rng.ts`. Never use `Math.random()` in world/scene generation.
- **No bloom / no ACES.** Use `THREE.NeutralToneMapping` at exposure ~1.0; render directly (no `EffectComposer`). Bloom code is removed (restorable later).
- **TDD + frequent commits.** Each task: failing test → see it fail → implement → see it pass → commit. Pure helpers get unit tests in `test/` matching the existing style (`vitest`, `describe/it/expect`). Visual-only changes are gated by `npm run build` (which runs `tsc --noEmit`) plus any helper test.
- Build gate: `npm run build` (= `tsc --noEmit && vite build`) must pass at the end of every task. Test gate: `npm test` (= `vitest run`) must stay fully green.

---

### Task 1: Palette module

**Files:**
- Create: `rishon3d/src/world/palette.ts`
- Test: `rishon3d/test/palette.test.ts`

**Interfaces:**
- Produces: `export const PALETTE` (object of named `number` colors), `export const BUILDING_COLORS: number[]`, `export const DISTRICT_PALETTES: Record<string, number[]>`, `export function isHexColor(n: number): boolean`.

- [ ] **Step 1: Write the failing test**

```ts
// rishon3d/test/palette.test.ts
import { describe, it, expect } from "vitest";
import { PALETTE, BUILDING_COLORS, DISTRICT_PALETTES, isHexColor } from "../src/world/palette";

describe("palette", () => {
  it("exposes valid hex colors for every named entry", () => {
    for (const v of Object.values(PALETTE)) expect(isHexColor(v)).toBe(true);
  });
  it("provides a non-trivial saturated building color set", () => {
    expect(BUILDING_COLORS.length).toBeGreaterThanOrEqual(6);
    for (const c of BUILDING_COLORS) expect(isHexColor(c)).toBe(true);
  });
  it("has a palette for each of the four districts", () => {
    for (const id of ["north", "east", "south", "west"]) {
      expect(DISTRICT_PALETTES[id].length).toBeGreaterThanOrEqual(3);
      for (const c of DISTRICT_PALETTES[id]) expect(isHexColor(c)).toBe(true);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd rishon3d && npx vitest run test/palette.test.ts`
Expected: FAIL — cannot resolve `../src/world/palette`.

- [ ] **Step 3: Write minimal implementation**

```ts
// rishon3d/src/world/palette.ts
// Central saturated color palette for the voxel-daytime look. One source of
// truth so the whole city can be retuned here. Values are THREE hex numbers.

export function isHexColor(n: number): boolean {
  return Number.isInteger(n) && n >= 0 && n <= 0xffffff;
}

export const PALETTE = {
  // sky / ambient
  skyBlue: 0x6fb7ff,
  hemiSky: 0xbfe3ff,
  hemiGround: 0x7fa45a,
  sunWarm: 0xfff4e0,
  ambient: 0xcfe2f7,
  cloud: 0xffffff,
  // ground / streets
  grass: 0x6db24a,
  parkGrass: 0x5fa83f,
  asphalt: 0x3a3a42,
  sidewalk: 0xc8c6c0,
  curb: 0xd8d6cf,
  laneLine: 0xf3ecd0,
  parkPath: 0xcdbb95,
  // props
  trunk: 0x8a5a2b,
  leaf: 0x4caf3f,
  leafDeep: 0x3f9a36,
  bush: 0x57b04a,
  benchWood: 0xa9692f,
  lampPole: 0x2b2b30,
  lantern: 0xffd98a,
  lanternGlow: 0xffb84d,
  // house
  houseBody: 0xf3d29a,
  houseRoof: 0xc0392b,
  // awnings
  awningRed: 0xc0392b,
  awningBlue: 0x2980b9,
  awningStripe: 0xf5f3ee,
  // rail
  railConcrete: 0xb9b6ae,
  railDeck: 0x9aa0a6,
} as const;

// Saturated building bodies for the hand-authored core buildings.
export const BUILDING_COLORS: number[] = [
  0xf2c14e, // warm yellow
  0xe07a5f, // terracotta
  0xe9c46a, // sand
  0x6aa9c9, // blue glass
  0xd96c5f, // brick red
  0x84b06a, // mint
  0xc98ab0, // mauve
  0xe6b89c, // peach
];

// Per-district body palettes (saturated, with a slight regional bias).
export const DISTRICT_PALETTES: Record<string, number[]> = {
  north: [0x6aa9c9, 0x7fb5d6, 0x9ac6e0], // blue-glass downtown
  east: [0xf2c14e, 0xe9c46a, 0xe6b89c],  // warm market
  south: [0xe07a5f, 0xd96c5f, 0xc98ab0], // brick + accents
  west: [0x84b06a, 0x9ac06a, 0x6aa9c9],  // green + glass
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd rishon3d && npx vitest run test/palette.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add rishon3d/src/world/palette.ts rishon3d/test/palette.test.ts
git commit -m "feat(rishon3d): central saturated color palette module"
```

---

### Task 2: Daytime scene — sky config, Engine lighting, drop ACES + bloom

Renames the `DUSK` config to `DAY` with midday values and rewrites the Engine to bright daytime: high soft sun, strong even fill, `NeutralToneMapping` at exposure 1.0, no fog, direct render (no `EffectComposer`/bloom). `builders.ts` only needs its `DUSK`→`DAY` import renamed (its window-emissive usage stays).

**Files:**
- Modify: `rishon3d/src/core/sky.ts` (rename `DUSK`→`DAY`, daytime values; keep `sunDirection`/`sunPosition`)
- Modify: `rishon3d/src/core/Engine.ts` (lighting/tonemapping, remove composer/bloom/fog)
- Modify: `rishon3d/src/world/builders.ts` (import + usages `DUSK`→`DAY` only)
- Test: `rishon3d/test/sky.test.ts` (update `DUSK` block → `DAY` daytime assertions; keep sun-direction tests)

**Interfaces:**
- Consumes: nothing new.
- Produces: `export const DAY` with fields `{ sunElevationDeg, sunAzimuthDeg, turbidity, rayleigh, mieCoefficient, mieDirectionalG, exposure, hemiSky, hemiGround, hemiIntensity, sunColor, sunIntensity, ambientColor, ambientIntensity, windowEmissive, windowEmissiveIntensity }`. `sunDirection`/`sunPosition` signatures unchanged. `DUSK` is removed.

- [ ] **Step 1: Update the test first (it will fail against current code)**

Replace the `describe("DUSK", ...)` block in `rishon3d/test/sky.test.ts` and the import line. Full new file:

```ts
// rishon3d/test/sky.test.ts
import { describe, it, expect } from "vitest";
import { sunDirection, sunPosition, DAY } from "../src/core/sky";

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

describe("DAY", () => {
  it("puts the sun high for midday", () => {
    expect(DAY.sunElevationDeg).toBeGreaterThan(40);
    expect(DAY.sunElevationDeg).toBeLessThanOrEqual(90);
  });
  it("uses ~1.0 exposure (bright, not the dark dusk look)", () => {
    expect(DAY.exposure).toBeGreaterThanOrEqual(0.9);
  });
  it("keeps daytime window glow subtle", () => {
    expect(DAY.windowEmissiveIntensity).toBeLessThan(0.4);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd rishon3d && npx vitest run test/sky.test.ts`
Expected: FAIL — `DAY` is not exported (still `DUSK`).

- [ ] **Step 3: Rewrite `core/sky.ts`**

Keep `sunDirection`/`sunPosition` exactly; replace the `DUSK` constant with `DAY`:

```ts
// rishon3d/src/core/sky.ts
import * as THREE from "three";

// Compass azimuth: 0 = north (+Z), 90 = east (+X). Elevation: degrees above
// the horizon. Returns a unit vector from the origin toward the sun.
export function sunDirection(elevationDeg: number, azimuthDeg: number): THREE.Vector3 {
  const el = THREE.MathUtils.degToRad(elevationDeg);
  const az = THREE.MathUtils.degToRad(azimuthDeg);
  const cosEl = Math.cos(el);
  return new THREE.Vector3(cosEl * Math.sin(az), Math.sin(el), cosEl * Math.cos(az)).normalize();
}

// The single source of truth for the bright midday "toy-city" look.
// Consumed by Engine (sky + lights + exposure) and builders (window glow).
export const DAY = {
  sunElevationDeg: 58,     // high midday sun -> short, soft shadows
  sunAzimuthDeg: 135,      // SE, gives pleasant angled shadows
  turbidity: 2,            // clear sky
  rayleigh: 1.1,           // bright blue gradient, not hazy
  mieCoefficient: 0.005,
  mieDirectionalG: 0.8,
  exposure: 1.0,           // neutral; colors read at face value
  hemiSky: 0xbfe3ff,       // bright sky-blue fill from above
  hemiGround: 0x7fa45a,    // green bounce from the ground
  hemiIntensity: 1.15,     // strong, even fill -> flat poster shading
  sunColor: 0xfff4e0,      // near-white warm daylight key
  sunIntensity: 2.1,       // bright key, soft shadows
  ambientColor: 0xcfe2f7,  // cool sky ambient
  ambientIntensity: 0.45,  // lifts shadows so colors stay readable
  windowEmissive: 0x9fc4e8, // cool daytime window tint
  windowEmissiveIntensity: 0.18, // subtle window grid, not glowing
} as const;

export function sunPosition(distance: number): THREE.Vector3 {
  return sunDirection(DAY.sunElevationDeg, DAY.sunAzimuthDeg).multiplyScalar(distance);
}
```

- [ ] **Step 4: Rewrite `core/Engine.ts`** (daytime lights, NeutralToneMapping, no fog, no composer/bloom — direct render)

```ts
// rishon3d/src/core/Engine.ts
import * as THREE from "three";
import { Sky } from "three/examples/jsm/objects/Sky.js";
import { DAY, sunPosition } from "./sky";

export interface Tickable { update(dt: number): void }

export class Engine {
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  readonly renderer: THREE.WebGLRenderer;
  private clock = new THREE.Clock();
  private tickables: Tickable[] = [];
  private running = false;
  private readonly onResize = () => this.resize();

  constructor(private container: HTMLElement) {
    const sunDir = sunPosition(1);

    // Sky dome: physically-based scattering tuned to a bright clear midday.
    const sky = new Sky();
    sky.scale.setScalar(10000);
    const u = sky.material.uniforms;
    u.turbidity.value = DAY.turbidity;
    u.rayleigh.value = DAY.rayleigh;
    u.mieCoefficient.value = DAY.mieCoefficient;
    u.mieDirectionalG.value = DAY.mieDirectionalG;
    u.sunPosition.value.copy(sunDir);
    this.scene.add(sky);

    // No fog: distant districts stay crisp and colorful in the daytime look.
    this.scene.fog = null;

    this.camera = new THREE.PerspectiveCamera(60, this.aspect(), 0.1, 1000);
    this.camera.position.set(0, 8, 14);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    // Neutral tone mapping keeps saturated flat colors punchy (no ACES desat).
    this.renderer.toneMapping = THREE.NeutralToneMapping;
    this.renderer.toneMappingExposure = DAY.exposure;
    container.appendChild(this.renderer.domElement);

    const hemi = new THREE.HemisphereLight(DAY.hemiSky, DAY.hemiGround, DAY.hemiIntensity);
    this.scene.add(hemi);
    const sun = new THREE.DirectionalLight(DAY.sunColor, DAY.sunIntensity);
    sun.position.copy(sunPosition(120));
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    const s = 100;
    sun.shadow.camera.left = -s; sun.shadow.camera.right = s;
    sun.shadow.camera.top = s; sun.shadow.camera.bottom = -s;
    sun.shadow.camera.far = 400;
    this.scene.add(sun);
    this.scene.add(new THREE.AmbientLight(DAY.ambientColor, DAY.ambientIntensity));

    window.addEventListener("resize", this.onResize);
  }

  private aspect(): number {
    return this.container.clientWidth / Math.max(1, this.container.clientHeight);
  }

  add(t: Tickable): void { this.tickables.push(t); }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.clock.start();
    this.renderer.setAnimationLoop(() => this.frame());
  }

  stop(): void {
    this.running = false;
    this.renderer.setAnimationLoop(null);
  }

  private frame(): void {
    const dt = Math.min(this.clock.getDelta(), 0.05);
    for (const t of this.tickables) t.update(dt);
    this.renderer.render(this.scene, this.camera);
  }

  private resize(): void {
    this.camera.aspect = this.aspect();
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
  }

  dispose(): void {
    this.stop();
    window.removeEventListener("resize", this.onResize);
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
```

- [ ] **Step 5: Update `world/builders.ts` import + usages `DUSK`→`DAY`**

Change `import { DUSK } from "../core/sky";` to `import { DAY } from "../core/sky";`, and in `makeBuilding` change the three `DUSK.` references to `DAY.`:

```ts
  const mat = new THREE.MeshStandardMaterial({
    color: def.color,
    emissive: DAY.windowEmissive,
    emissiveMap: tex,
    emissiveIntensity: DAY.windowEmissiveIntensity,
  });
```

- [ ] **Step 6: Run the full test + build to verify green**

Run: `cd rishon3d && npx vitest run test/sky.test.ts && npm run build`
Expected: sky tests PASS; build PASS (tsc + vite). If `NeutralToneMapping` is missing from the `@types/three` version, fall back to `THREE.NoToneMapping` (still no ACES) and rerun.

- [ ] **Step 7: Commit**

```bash
git add rishon3d/src/core/sky.ts rishon3d/src/core/Engine.ts rishon3d/src/world/builders.ts rishon3d/test/sky.test.ts
git commit -m "feat(rishon3d): bright daytime scene (DAY config, neutral tonemap, no bloom/fog)"
```

---

### Task 3: Blocky clouds

A handful of chunky white voxel cloud clusters high above the city, placed deterministically, rendered as one instanced mesh. Static (no animation) for v0.1.

**Files:**
- Create: `rishon3d/src/world/clouds.ts`
- Modify: `rishon3d/src/world/World.ts` (add clouds to the scene)
- Test: `rishon3d/test/clouds.test.ts`

**Interfaces:**
- Consumes: `mulberry32` (`world/rng.ts`).
- Produces: `export interface CloudPlacement { x: number; y: number; z: number; scale: number }`, `export function cloudPlacements(seed: number, count: number, spread: number, height: number): CloudPlacement[]`, `export function makeClouds(seed?: number, count?: number): THREE.Object3D`.

- [ ] **Step 1: Write the failing test**

```ts
// rishon3d/test/clouds.test.ts
import { describe, it, expect } from "vitest";
import * as THREE from "three";
import { cloudPlacements, makeClouds } from "../src/world/clouds";

describe("cloudPlacements", () => {
  it("is deterministic for a given seed", () => {
    const a = cloudPlacements(7, 10, 120, 70);
    const b = cloudPlacements(7, 10, 120, 70);
    expect(a).toEqual(b);
  });
  it("places the requested count high above the ground within the spread", () => {
    const p = cloudPlacements(7, 12, 120, 70);
    expect(p.length).toBe(12);
    for (const c of p) {
      expect(Math.abs(c.x)).toBeLessThanOrEqual(120);
      expect(Math.abs(c.z)).toBeLessThanOrEqual(120);
      expect(c.y).toBeGreaterThan(40);
      expect(c.scale).toBeGreaterThan(0);
    }
  });
});

describe("makeClouds", () => {
  it("returns one instanced mesh with an instance per cloud", () => {
    const obj = makeClouds(7, 9) as THREE.InstancedMesh;
    expect(obj.isInstancedMesh).toBe(true);
    expect(obj.count).toBe(9);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd rishon3d && npx vitest run test/clouds.test.ts`
Expected: FAIL — cannot resolve `../src/world/clouds`.

- [ ] **Step 3: Write `world/clouds.ts`**

```ts
// rishon3d/src/world/clouds.ts
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { mulberry32 } from "./rng";
import { PALETTE } from "./palette";

export interface CloudPlacement { x: number; y: number; z: number; scale: number }

// Deterministic chunky-cloud positions high above the city.
export function cloudPlacements(seed: number, count: number, spread: number, height: number): CloudPlacement[] {
  const rng = mulberry32(seed);
  const out: CloudPlacement[] = [];
  for (let i = 0; i < count; i++) {
    const x = (rng() * 2 - 1) * spread;
    const z = (rng() * 2 - 1) * spread;
    const y = height + (rng() * 2 - 1) * 10;
    const scale = 0.8 + rng() * 1.8;
    out.push({ x, y, z, scale });
  }
  return out;
}

// One cloud = several overlapping white boxes merged into a single geometry.
function cloudGeo(): THREE.BufferGeometry {
  const specs: [number, number, number, number, number, number][] = [
    // w, h, d, x, y, z
    [8, 3, 5, 0, 0, 0],
    [5, 2.6, 4, 4, -0.3, 1],
    [6, 2.8, 5, -3.5, 0.2, -0.5],
    [4.5, 2.4, 4, 1.5, 1.0, -1.2],
  ];
  const boxes = specs.map(([w, h, d, x, y, z]) => {
    const g = new THREE.BoxGeometry(w, h, d);
    g.translate(x, y, z);
    return g;
  });
  return mergeGeometries(boxes);
}

// Flat, always-bright white clouds (unlit), instanced for one draw call.
export function makeClouds(seed = 7, count = 10): THREE.Object3D {
  const geo = cloudGeo();
  const mat = new THREE.MeshBasicMaterial({ color: PALETTE.cloud });
  const placements = cloudPlacements(seed, count, 130, 75);
  const mesh = new THREE.InstancedMesh(geo, mat, placements.length);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const s = new THREE.Vector3();
  const p = new THREE.Vector3();
  placements.forEach((c, i) => {
    s.set(c.scale, c.scale, c.scale);
    p.set(c.x, c.y, c.z);
    m.compose(p, q, s);
    mesh.setMatrixAt(i, m);
  });
  mesh.instanceMatrix.needsUpdate = true;
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  return mesh;
}
```

- [ ] **Step 4: Wire clouds into `world/World.ts`**

Add the import and one line in the `World` constructor (after `makeRoadNetwork`):

```ts
import { makeClouds } from "./clouds";
```
```ts
    scene.add(makeClouds());
```

- [ ] **Step 5: Run tests + build**

Run: `cd rishon3d && npx vitest run test/clouds.test.ts && npm run build`
Expected: clouds tests PASS; build PASS.

- [ ] **Step 6: Commit**

```bash
git add rishon3d/src/world/clouds.ts rishon3d/src/world/World.ts rishon3d/test/clouds.test.ts
git commit -m "feat(rishon3d): blocky voxel clouds high above the city"
```

---

### Task 4: Voxel trees, blocky bushes, glowing lantern (`world/props.ts`)

Replace cone/sphere foliage with stacked-cube canopies; box trunk; blockier bushes; brighter glowing lamp lanterns. Keep all instancing and the `treeSpecies` split so `test/props.test.ts` still passes (trunk InstancedMesh + one foliage InstancedMesh per present species; instance counts unchanged).

**Files:**
- Modify: `rishon3d/src/world/props.ts`
- Test: `rishon3d/test/props.test.ts` (add cases; keep existing ones intact)

**Interfaces:**
- Consumes: `getGeometry`/`getMaterial`, `makeInstanced`, `mergeGeometries`, `PALETTE`.
- Produces (new exports for testability): `export function coniferCanopyBoxes(): { y: number; s: number }[]`, `export function deciduousCanopyBoxes(): [number, number, number, number][]`. Existing exports (`treeSpecies`, `treeInstances`, `bushInstances`, `benchInstances`, `makeStreetLight`) keep their signatures.

- [ ] **Step 1: Add failing tests to `test/props.test.ts`**

Append (and add the import for the new helpers to the existing import line):

```ts
import { coniferCanopyBoxes, deciduousCanopyBoxes } from "../src/world/props";

describe("voxel canopies", () => {
  it("conifer canopy is a stack that narrows toward the top", () => {
    const layers = coniferCanopyBoxes();
    expect(layers.length).toBeGreaterThanOrEqual(3);
    for (let i = 1; i < layers.length; i++) {
      expect(layers[i].y).toBeGreaterThan(layers[i - 1].y); // higher
      expect(layers[i].s).toBeLessThan(layers[i - 1].s);    // narrower
    }
  });
  it("deciduous canopy is a multi-cube cluster", () => {
    expect(deciduousCanopyBoxes().length).toBeGreaterThanOrEqual(4);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd rishon3d && npx vitest run test/props.test.ts`
Expected: FAIL — `coniferCanopyBoxes` not exported.

- [ ] **Step 3: Rewrite the geometry/material section of `world/props.ts`**

Replace the trunk/foliage/bush geometry + material definitions (the block from `trunkGeo` through `bushMat`) with:

```ts
function trunkGeo(): THREE.BufferGeometry {
  return getGeometry("trunk", () => {
    const g = new THREE.BoxGeometry(0.5, 1.4, 0.5);
    g.translate(0, 0.7, 0);
    return g;
  });
}

// Conifer: a stepped pyramid of green cubes (wide bottom, narrow top).
export function coniferCanopyBoxes(): { y: number; s: number }[] {
  return [
    { y: 1.7, s: 2.2 },
    { y: 2.5, s: 1.6 },
    { y: 3.2, s: 1.0 },
  ];
}
function foliageGeo(): THREE.BufferGeometry {
  return getGeometry("foliageVoxel", () => {
    const boxes = coniferCanopyBoxes().map(({ y, s }) => {
      const b = new THREE.BoxGeometry(s, 0.9, s);
      b.translate(0, y, 0);
      return b;
    });
    return mergeGeometries(boxes);
  });
}

// Deciduous: a chunky cluster of cubes. Tuples are [x, y, z, size].
export function deciduousCanopyBoxes(): [number, number, number, number][] {
  return [
    [0, 2.3, 0, 2.0],
    [1.0, 2.5, 0.3, 1.2],
    [-0.9, 2.4, -0.4, 1.3],
    [0.2, 3.1, -0.2, 1.4],
    [-0.3, 2.0, 0.8, 1.1],
  ];
}
function deciduousGeo(): THREE.BufferGeometry {
  return getGeometry("foliageDecidVoxel", () => {
    const boxes = deciduousCanopyBoxes().map(([x, y, z, s]) => {
      const b = new THREE.BoxGeometry(s, s, s);
      b.translate(x, y, z);
      return b;
    });
    return mergeGeometries(boxes);
  });
}
function bushGeo(): THREE.BufferGeometry {
  return getGeometry("bushVoxel", () => {
    const specs: [number, number, number, number][] = [
      [0, 0.45, 0, 0.9],
      [0.5, 0.4, 0.2, 0.6],
      [-0.45, 0.4, -0.2, 0.6],
    ];
    const boxes = specs.map(([x, y, z, s]) => {
      const b = new THREE.BoxGeometry(s, s, s);
      b.translate(x, y, z);
      return b;
    });
    return mergeGeometries(boxes);
  });
}
const trunkMat = () => getMaterial("trunkMat", () => new THREE.MeshStandardMaterial({ color: PALETTE.trunk }));
const foliageMat = () => getMaterial("foliageMat", () => new THREE.MeshStandardMaterial({ color: PALETTE.leaf }));
const deciduousMat = () => getMaterial("foliageDecidMat", () => new THREE.MeshStandardMaterial({ color: PALETTE.leafDeep }));
const bushMat = () => getMaterial("bushMat", () => new THREE.MeshStandardMaterial({ color: PALETTE.bush }));
```

Add `import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";` and `import { PALETTE } from "./palette";` at the top (the file already imports `getGeometry`/`getMaterial`/`makeInstanced`). The `benchMat` keeps its color but switch to the palette: `getMaterial("benchMat", () => new THREE.MeshStandardMaterial({ color: PALETTE.benchWood }))`.

- [ ] **Step 4: Brighten the lamp lantern in `makeStreetLight`**

Replace the pole/lamp material colors with palette + a brighter glow:

```ts
  const pole = new THREE.Mesh(
    getGeometry("slPole", () => new THREE.CylinderGeometry(0.08, 0.1, 3.4, 8)),
    getMaterial("slPoleMat", () => new THREE.MeshStandardMaterial({ color: PALETTE.lampPole })),
  );
  pole.position.y = 1.7; pole.castShadow = true;
  const lamp = new THREE.Mesh(
    getGeometry("slLamp", () => new THREE.BoxGeometry(0.5, 0.5, 0.5)),
    getMaterial("slLampMat", () => new THREE.MeshStandardMaterial({ color: PALETTE.lantern, emissive: PALETTE.lanternGlow, emissiveIntensity: 1.4 })),
  );
  lamp.position.y = 3.4;
```

- [ ] **Step 5: Run tests + build**

Run: `cd rishon3d && npx vitest run test/props.test.ts && npm run build`
Expected: all props tests PASS (existing trunk/foliage instance-count tests still hold); build PASS.

- [ ] **Step 6: Commit**

```bash
git add rishon3d/src/world/props.ts rishon3d/test/props.test.ts
git commit -m "feat(rishon3d): voxel trees, blocky bushes, glowing lamp lanterns"
```

---

### Task 5: Blocky character with cube head + backpack (`entities/Humanoid.ts`)

Cube head (was a sphere), slightly chunkier proportions, and a backpack box. Keep the limb rig and `animateWalk` so `Character`/`Npc` are unaffected. Name the parts for testability.

**Files:**
- Modify: `rishon3d/src/entities/Humanoid.ts`
- Test: `rishon3d/test/humanoid.test.ts` (new)

**Interfaces:**
- Consumes: nothing new.
- Produces: `makeHumanoid(palette: HumanoidPalette): Humanoid` (unchanged signature), with the returned `group` now containing named children `"torso"`, `"head"` (BoxGeometry), `"backpack"`. `HumanoidLimbs`, `animateWalk` unchanged.

- [ ] **Step 1: Write the failing test**

```ts
// rishon3d/test/humanoid.test.ts
import { describe, it, expect } from "vitest";
import * as THREE from "three";
import { makeHumanoid, animateWalk } from "../src/entities/Humanoid";

const palette = { skin: 0xf0c9a0, shirt: 0x2e6fb0, pants: 0x274060 };

describe("makeHumanoid", () => {
  it("builds a blocky head (box geometry), not a sphere", () => {
    const { group } = makeHumanoid(palette);
    const head = group.getObjectByName("head") as THREE.Mesh;
    expect(head).toBeTruthy();
    expect(head.geometry.type).toBe("BoxGeometry");
  });
  it("includes a backpack on the character", () => {
    const { group } = makeHumanoid(palette);
    expect(group.getObjectByName("backpack")).toBeTruthy();
  });
  it("exposes swinging limbs via animateWalk", () => {
    const { limbs } = makeHumanoid(palette);
    animateWalk(limbs, Math.PI / 2, 0.6);
    expect(limbs.leftLeg.rotation.x).not.toBe(0);
    expect(limbs.rightLeg.rotation.x).toBeCloseTo(-limbs.leftLeg.rotation.x, 6);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd rishon3d && npx vitest run test/humanoid.test.ts`
Expected: FAIL — no such file / `head` not found.

- [ ] **Step 3: Update `makeHumanoid` in `entities/Humanoid.ts`**

Replace the body of `makeHumanoid` (keep `limb`, `animateWalk`, and the interfaces exactly):

```ts
export function makeHumanoid(palette: HumanoidPalette): Humanoid {
  const group = new THREE.Group();

  const torso = new THREE.Mesh(
    new THREE.BoxGeometry(0.55, 0.72, 0.3),
    new THREE.MeshStandardMaterial({ color: palette.shirt }),
  );
  torso.name = "torso";
  torso.position.y = 1.15; torso.castShadow = true;
  group.add(torso);

  // Blocky cube head (Roblox-ish, slightly oversized).
  const head = new THREE.Mesh(
    new THREE.BoxGeometry(0.44, 0.44, 0.44),
    new THREE.MeshStandardMaterial({ color: palette.skin }),
  );
  head.name = "head";
  head.position.y = 1.78; head.castShadow = true;
  group.add(head);

  // Backpack box on the torso back (-z).
  const backpack = new THREE.Mesh(
    new THREE.BoxGeometry(0.44, 0.56, 0.22),
    new THREE.MeshStandardMaterial({ color: 0x8a6b4a }),
  );
  backpack.name = "backpack";
  backpack.position.set(0, 1.16, -0.24); backpack.castShadow = true;
  group.add(backpack);

  // legs hinge at hip (y ~0.9), length 0.9 -> feet near 0
  const leftLeg = limb(0.2, 0.9, 0.22, palette.pants, 0.9, -0.14);
  const rightLeg = limb(0.2, 0.9, 0.22, palette.pants, 0.9, 0.14);
  // arms hinge at shoulder (y ~1.45), length 0.65
  const leftArm = limb(0.16, 0.65, 0.18, palette.shirt, 1.45, -0.35);
  const rightArm = limb(0.16, 0.65, 0.18, palette.shirt, 1.45, 0.35);
  group.add(leftLeg, rightLeg, leftArm, rightArm);

  return { group, limbs: { leftLeg, rightLeg, leftArm, rightArm } };
}
```

- [ ] **Step 4: Run tests + build**

Run: `cd rishon3d && npx vitest run test/humanoid.test.ts && npm run build`
Expected: humanoid tests PASS; build PASS.

- [ ] **Step 5: Commit**

```bash
git add rishon3d/src/entities/Humanoid.ts rishon3d/test/humanoid.test.ts
git commit -m "feat(rishon3d): blocky character with cube head + backpack"
```

---

### Task 6: Cleaner blocky car (shared car-mesh helper)

Factor the car's visual body into one helper so the player car, summoned car, and NPC traffic look consistent (body + dark-glass greenhouse + roof + headlights, flat matte, optional static wheels). Parked cars get a matching merged geometry. **No physics/collider/wheel-position changes.**

**Files:**
- Create: `rishon3d/src/entities/carMesh.ts`
- Modify: `rishon3d/src/entities/Car.ts` (use helper for the body; keep animated wheels + all physics)
- Modify: `rishon3d/src/entities/RideCar.ts` (use helper)
- Modify: `rishon3d/src/entities/NpcCar.ts` (use helper)
- Modify: `rishon3d/src/world/parkedCars.ts` (matching merged geo, drop metalness)
- Test: `rishon3d/test/carMesh.test.ts` (new)

**Interfaces:**
- Produces: `export interface CarBodyOpts { bodyColor: number; withWheels?: boolean }`, `export function makeCarBody(opts: CarBodyOpts): THREE.Group`. The body box is centered at the group's local origin (y=0), matching `Car`'s existing chassis convention; `RideCar`/`NpcCar` offset the group to `y = 0.5` (their existing `CAR_Y`).

- [ ] **Step 1: Write the failing test**

```ts
// rishon3d/test/carMesh.test.ts
import { describe, it, expect } from "vitest";
import * as THREE from "three";
import { makeCarBody } from "../src/entities/carMesh";

describe("makeCarBody", () => {
  it("builds a multi-part body group without wheels by default", () => {
    const g = makeCarBody({ bodyColor: 0xc0392b });
    // body + glass + roof + 2 headlights + skirt = 6 parts, no wheels
    expect(g.children.length).toBeGreaterThanOrEqual(5);
  });
  it("adds four wheels when requested", () => {
    const plain = makeCarBody({ bodyColor: 0x2980b9 });
    const wheeled = makeCarBody({ bodyColor: 0x2980b9, withWheels: true });
    expect(wheeled.children.length).toBe(plain.children.length + 4);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd rishon3d && npx vitest run test/carMesh.test.ts`
Expected: FAIL — cannot resolve `../src/entities/carMesh`.

- [ ] **Step 3: Write `entities/carMesh.ts`**

```ts
// rishon3d/src/entities/carMesh.ts
import * as THREE from "three";

export interface CarBodyOpts { bodyColor: number; withWheels?: boolean }

// Shared blocky toy-car visual. Body box is centered at the group origin (y=0)
// to match Car's chassis convention; kinematic cars offset the group to y=0.5.
// Flat matte paint (metalness 0), dark-glass greenhouse, roof cap, headlights.
export function makeCarBody(opts: CarBodyOpts): THREE.Group {
  const g = new THREE.Group();
  const paint = new THREE.MeshStandardMaterial({ color: opts.bodyColor, metalness: 0, roughness: 0.85 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x222b38, metalness: 0, roughness: 0.4 });
  const trim = new THREE.MeshStandardMaterial({ color: 0x16181d, metalness: 0, roughness: 0.9 });
  const light = new THREE.MeshStandardMaterial({ color: 0xfff2c0, emissive: 0xffe08a, emissiveIntensity: 0.5 });

  const body = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.5, 3.6), paint);
  body.position.y = 0; body.castShadow = true; g.add(body);

  const skirt = new THREE.Mesh(new THREE.BoxGeometry(1.86, 0.2, 3.66), trim);
  skirt.position.y = -0.2; g.add(skirt);

  const glassBox = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.46, 1.9), glass);
  glassBox.position.set(0, 0.48, -0.2); glassBox.castShadow = true; g.add(glassBox);

  const roof = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.16, 1.7), paint);
  roof.position.set(0, 0.79, -0.2); roof.castShadow = true; g.add(roof);

  for (const x of [-0.6, 0.6]) {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.18, 0.08), light);
    hl.position.set(x, 0.05, 1.82); g.add(hl);
  }

  if (opts.withWheels) {
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111114, metalness: 0, roughness: 0.9 });
    const positions: [number, number][] = [[-0.9, 1.2], [0.9, 1.2], [-0.9, -1.2], [0.9, -1.2]];
    for (const [x, z] of positions) {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.3, 14), wheelMat);
      w.rotation.z = Math.PI / 2;
      w.position.set(x, -0.2, z); w.castShadow = true; g.add(w);
    }
  }
  return g;
}
```

- [ ] **Step 4: Use the helper in `entities/Car.ts`**

In `Car.ts`: remove the `private chassis: THREE.Mesh;` field declaration. Replace the chassis+cabin construction block (the `this.chassis = ...` through `this.object.add(this.chassis);`) with:

```ts
    this.object.add(makeCarBody({ bodyColor: 0xc0392b, withWheels: false }));
```

Add `import { makeCarBody } from "./carMesh";` at the top. Leave the wheel-mesh creation loop, colliders, vehicle controller, and `update()` exactly as-is (the 4 animated cylinder wheels are still added to `this.object`).

- [ ] **Step 5: Use the helper in `entities/RideCar.ts`**

Replace the body+cabin construction (the two `getGeometry`/`getMaterial` meshes and `this.object.add(body, cabin);`) with:

```ts
    const car = makeCarBody({ bodyColor: 0xc0392b, withWheels: true });
    car.position.y = CAR_Y;
    this.object.add(car);
    this.object.visible = false;
    scene.add(this.object);
```

Add `import { makeCarBody } from "./carMesh";`. Remove the now-unused `getGeometry`/`getMaterial` import if nothing else uses it. Keep `CAR_Y`, `driveTo`, `spawnAt`, etc. unchanged.

- [ ] **Step 6: Use the helper in `entities/NpcCar.ts`**

Replace the body+cabin construction with:

```ts
    const car = makeCarBody({ bodyColor: color, withWheels: true });
    car.position.y = CAR_Y;
    this.object.add(car);
```

Add `import { makeCarBody } from "./carMesh";`. Remove the now-unused `getGeometry`/`getMaterial` import if unused. Keep route/`advanceAlong`/`update` unchanged.

- [ ] **Step 7: Update `world/parkedCars.ts` to a matching merged geo, flat matte**

Replace `parkedCarGeo` and `parkedCarMat`:

```ts
function parkedCarGeo(): THREE.BufferGeometry {
  return getGeometry("parkedCar", () => {
    const body = new THREE.BoxGeometry(1.8, 0.5, 3.6); body.translate(0, 0.5, 0);
    const glass = new THREE.BoxGeometry(1.5, 0.46, 1.9); glass.translate(0, 0.98, -0.2);
    const roof = new THREE.BoxGeometry(1.6, 0.16, 1.7); roof.translate(0, 1.29, -0.2);
    return mergeGeometries([body, glass, roof]);
  });
}
const parkedCarMat = () => getMaterial("parkedCarMat", () => new THREE.MeshStandardMaterial({ color: 0x8b94a3, metalness: 0, roughness: 0.85 }));
```

(`mergeGeometries` is already imported in `parkedCars.ts`.)

- [ ] **Step 8: Run tests + build**

Run: `cd rishon3d && npx vitest run test/carMesh.test.ts && npm run build`
Expected: carMesh tests PASS; build PASS. (If TS flags an unused `getGeometry`/`getMaterial`/`THREE` import in RideCar/NpcCar, remove just that import.)

- [ ] **Step 9: Commit**

```bash
git add rishon3d/src/entities/carMesh.ts rishon3d/src/entities/Car.ts rishon3d/src/entities/RideCar.ts rishon3d/src/entities/NpcCar.ts rishon3d/src/world/parkedCars.ts rishon3d/test/carMesh.test.ts
git commit -m "feat(rishon3d): cleaner blocky car (shared body helper: glass, roof, headlights)"
```

---

### Task 7: Repaint buildings with the saturated palette

Swap the muted blue-grays for saturated colors from `palette.ts`, in both the hand-authored core buildings and the procedural district palettes, plus the house body/roof. Materials stay `MeshStandardMaterial` (already matte at default metalness 0).

**Files:**
- Modify: `rishon3d/src/world/rishonMap.ts` (`CORE_MAP.buildings[].color`)
- Modify: `rishon3d/src/world/worldData.ts` (`DISTRICTS[].palette`)
- Modify: `rishon3d/src/world/builders.ts` (house body/roof colors from palette)
- Test: `rishon3d/test/worldData.test.ts` (add a case asserting district palettes come from the saturated set; keep existing cases)

**Interfaces:**
- Consumes: `BUILDING_COLORS`, `DISTRICT_PALETTES`, `PALETTE` from `world/palette.ts`.
- Produces: no new exports.

- [ ] **Step 1: Add a failing test to `test/worldData.test.ts`**

First check what `worldData.test.ts` imports; add this `describe` and the needed import:

```ts
import { DISTRICTS } from "../src/world/worldData";
import { DISTRICT_PALETTES } from "../src/world/palette";

describe("district palettes use the saturated palette", () => {
  it("each district's palette matches the shared palette module", () => {
    for (const d of DISTRICTS) {
      expect(DISTRICT_PALETTES[d.id]).toBeTruthy();
      expect(d.palette).toEqual(DISTRICT_PALETTES[d.id]);
    }
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd rishon3d && npx vitest run test/worldData.test.ts`
Expected: FAIL — district palettes are still the muted hardcoded arrays.

- [ ] **Step 3: Repaint district palettes in `world/worldData.ts`**

Add `import { DISTRICT_PALETTES } from "./palette";` and set each district's `palette` to the shared one:

```ts
export const DISTRICTS: DistrictSpec[] = [
  { id: "north", center: { x: 0, z: -95 }, size: 60, blocks: 4, seed: 101,
    palette: DISTRICT_PALETTES.north, minHeight: 8, maxHeight: 22, density: 0.85 },
  { id: "east", center: { x: 95, z: 0 }, size: 60, blocks: 4, seed: 202,
    palette: DISTRICT_PALETTES.east, minHeight: 6, maxHeight: 16, density: 0.8 },
  { id: "south", center: { x: 0, z: 95 }, size: 60, blocks: 5, seed: 303,
    palette: DISTRICT_PALETTES.south, minHeight: 7, maxHeight: 14, density: 0.75 },
  { id: "west", center: { x: -95, z: 0 }, size: 60, blocks: 4, seed: 404,
    palette: DISTRICT_PALETTES.west, minHeight: 10, maxHeight: 24, density: 0.85 },
];
```

- [ ] **Step 4: Repaint the core buildings in `world/rishonMap.ts`**

Add `import { BUILDING_COLORS, PALETTE } from "./palette";` at the top. Update each non-house building `color` in `CORE_MAP.buildings` to `BUILDING_COLORS[i]` values, and the house to `PALETTE.houseBody`. Concretely set the colors:

```ts
  buildings: [
    { id: "house", x: 14, z: 14, width: 8, depth: 8, height: 5, color: PALETTE.houseBody, isHouse: true },
    { id: "b1", x: -18, z: 12, width: 10, depth: 10, height: 12, color: BUILDING_COLORS[0] },
    { id: "b2", x: -16, z: -16, width: 12, depth: 8, height: 16, color: BUILDING_COLORS[3] },
    { id: "b3", x: 18, z: -14, width: 9, depth: 11, height: 9, color: BUILDING_COLORS[1] },
    { id: "b4", x: 34, z: 8, width: 8, depth: 8, height: 20, color: BUILDING_COLORS[3] },
    { id: "b5", x: -38, z: -12, width: 14, depth: 10, height: 7, color: BUILDING_COLORS[2] },
    { id: "b6", x: 12, z: 36, width: 10, depth: 9, height: 14, color: BUILDING_COLORS[5] },
    { id: "b7", x: -14, z: -36, width: 11, depth: 11, height: 10, color: BUILDING_COLORS[4] },
  ],
```

- [ ] **Step 5: Repaint the house body/roof in `world/builders.ts`**

In `makeBuilding`'s `isHouse` branch, set the body material color to `def.color` (so the map controls it) and the roof to `PALETTE.houseRoof`. Add `import { PALETTE } from "./palette";`:

```ts
    const bodyMat = new THREE.MeshStandardMaterial({ color: def.color });
    ...
    const roofMat = new THREE.MeshStandardMaterial({ color: PALETTE.houseRoof });
```

- [ ] **Step 6: Run tests + build**

Run: `cd rishon3d && npx vitest run && npm run build`
Expected: full suite PASS (incl. new worldData case); build PASS. If `cityGen.test.ts` asserts specific old colors, update those expectations to read from `DISTRICT_PALETTES`.

- [ ] **Step 7: Commit**

```bash
git add rishon3d/src/world/rishonMap.ts rishon3d/src/world/worldData.ts rishon3d/src/world/builders.ts rishon3d/test/worldData.test.ts
git commit -m "feat(rishon3d): repaint buildings with the saturated daytime palette"
```

---

### Task 8: Raised curbs along the streets (`world/roads.ts`)

Add a thin raised curb strip at both asphalt edges of every road, merged into a single mesh (one draw call). Purely visual (no collider).

**Files:**
- Modify: `rishon3d/src/world/roads.ts`
- Test: `rishon3d/test/roads.test.ts` (add `curbRects` cases; keep existing)

**Interfaces:**
- Consumes: `mergeGeometries`, `getMaterial`, `PALETTE`, `ROAD_W`.
- Produces: `export const CURB_W: number`, `export const CURB_H: number`, `export function curbRects(road: RoadDef): Rect[]`.

- [ ] **Step 1: Add failing tests to `test/roads.test.ts`**

Add to the imports `curbRects, CURB_W` and append:

```ts
import { curbRects, CURB_W } from "../src/world/roads";

describe("curbRects", () => {
  it("runs a thin strip just outside each asphalt edge of a horizontal road", () => {
    const r = curbRects(hRoad);
    expect(r.length).toBe(2);
    const offs = r.map((c) => c.z - hRoad.z).sort((a, b) => a - b);
    expect(offs[0]).toBeCloseTo(-offs[1], 6);
    expect(Math.abs(offs[0])).toBeGreaterThan(ROAD_W / 2);
    for (const c of r) {
      expect(c.w).toBeCloseTo(hRoad.length, 6); // spans the road length
      expect(c.d).toBeCloseTo(CURB_W, 6);       // thin across
    }
  });
  it("runs along x for a vertical road", () => {
    const r = curbRects(vRoad);
    const offs = r.map((c) => c.x - vRoad.x).sort((a, b) => a - b);
    expect(offs[0]).toBeCloseTo(-offs[1], 6);
    for (const c of r) expect(c.d).toBeCloseTo(vRoad.length, 6);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd rishon3d && npx vitest run test/roads.test.ts`
Expected: FAIL — `curbRects` not exported.

- [ ] **Step 3: Add curbs to `world/roads.ts`**

Add `import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";` and `import { PALETTE } from "./palette";` at the top. Add the constants + helper near `sidewalkRects`:

```ts
export const CURB_W = 0.3;
export const CURB_H = 0.12;

// Thin raised strips just outside each asphalt edge.
export function curbRects(road: RoadDef): Rect[] {
  const off = ROAD_W / 2 + CURB_W / 2;
  if (road.horizontal) {
    return [
      { x: road.x, z: road.z - off, w: road.length, d: CURB_W },
      { x: road.x, z: road.z + off, w: road.length, d: CURB_W },
    ];
  }
  return [
    { x: road.x - off, z: road.z, w: CURB_W, d: road.length },
    { x: road.x + off, z: road.z, w: CURB_W, d: road.length },
  ];
}
```

In `makeRoadNetwork`, after the sidewalk loop and before the dashes block, build merged curbs:

```ts
  const curbGeos: THREE.BufferGeometry[] = [];
  for (const r of roads) {
    for (const c of curbRects(r)) {
      const g = new THREE.BoxGeometry(c.w, CURB_H, c.d);
      g.translate(c.x, CURB_H / 2, c.z);
      curbGeos.push(g);
    }
  }
  if (curbGeos.length) {
    const curbMat = getMaterial("curbMat", () => new THREE.MeshStandardMaterial({ color: PALETTE.curb }));
    const curb = new THREE.Mesh(mergeGeometries(curbGeos), curbMat);
    curb.receiveShadow = true; curb.castShadow = false;
    group.add(curb);
  }
```

(Note for the implementer: curbs intentionally have no collider and may visually cross at intersections — an accepted v0.1 artifact; keep `CURB_H` low so it reads as a curb, not a speed bump.)

- [ ] **Step 4: Run tests + build**

Run: `cd rishon3d && npx vitest run test/roads.test.ts && npm run build`
Expected: roads tests PASS; build PASS.

- [ ] **Step 5: Commit**

```bash
git add rishon3d/src/world/roads.ts rishon3d/test/roads.test.ts
git commit -m "feat(rishon3d): raised curbs along street edges"
```

---

### Task 9: Striped shop awnings (`world/builders.ts`)

A deterministic subset of non-house buildings gets a striped awning over one face so they read as shops.

**Files:**
- Modify: `rishon3d/src/world/builders.ts` (awning helpers + attach in `makeBuilding`)
- Test: `rishon3d/test/builders.test.ts` (new — pure `awningStyle` helper)

**Interfaces:**
- Consumes: `PALETTE`.
- Produces: `export function awningStyle(id: string): { show: boolean; color: number }` (deterministic from the building id; color ∈ {`PALETTE.awningRed`, `PALETTE.awningBlue`}).

- [ ] **Step 1: Write the failing test**

```ts
// rishon3d/test/builders.test.ts
import { describe, it, expect } from "vitest";
import { awningStyle } from "../src/world/builders";
import { PALETTE } from "../src/world/palette";

describe("awningStyle", () => {
  it("is deterministic for a given building id", () => {
    expect(awningStyle("b3")).toEqual(awningStyle("b3"));
  });
  it("chooses red or blue when shown", () => {
    for (const id of ["b1", "b2", "b3", "b4", "b5", "north-b-0-1"]) {
      const a = awningStyle(id);
      if (a.show) expect([PALETTE.awningRed, PALETTE.awningBlue]).toContain(a.color);
    }
  });
  it("shows awnings on a meaningful fraction of buildings", () => {
    const ids = Array.from({ length: 200 }, (_, i) => `b-${i}`);
    const shown = ids.filter((id) => awningStyle(id).show).length;
    expect(shown).toBeGreaterThan(40);
    expect(shown).toBeLessThan(160);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd rishon3d && npx vitest run test/builders.test.ts`
Expected: FAIL — `awningStyle` not exported.

- [ ] **Step 3: Add awnings to `world/builders.ts`**

Add the helper (near the top, after imports) and a striped-texture cache:

```ts
// Deterministic per-building awning choice from a hash of its id.
export function awningStyle(id: string): { show: boolean; color: number } {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  const show = (h % 100) < 45;
  const color = (h & 1) ? PALETTE.awningRed : PALETTE.awningBlue;
  return { show, color };
}

// Vertical color/white stripe texture (cached per color).
const STRIPE_TEX = new Map<number, THREE.DataTexture>();
function stripeTexture(color: number): THREE.DataTexture {
  let t = STRIPE_TEX.get(color);
  if (t) return t;
  const cols = 8;
  const c = new THREE.Color(color);
  const data = new Uint8Array(cols * 1 * 4);
  for (let i = 0; i < cols; i++) {
    const o = i * 4;
    const stripe = i % 2 === 0;
    const col = stripe ? c : new THREE.Color(PALETTE.awningStripe);
    data[o] = Math.round(col.r * 255);
    data[o + 1] = Math.round(col.g * 255);
    data[o + 2] = Math.round(col.b * 255);
    data[o + 3] = 255;
  }
  t = new THREE.DataTexture(data, cols, 1, THREE.RGBAFormat);
  t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter;
  t.needsUpdate = true;
  STRIPE_TEX.set(color, t);
  return t;
}

// A sloped striped awning slab over the +z face of a building.
function makeAwning(def: BuildingDef, color: number): THREE.Mesh {
  const w = Math.min(def.width * 0.92, 8);
  const tex = stripeTexture(color).clone();
  tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(Math.max(2, Math.round(w / 1.2)), 1);
  tex.needsUpdate = true;
  const mat = new THREE.MeshStandardMaterial({ map: tex });
  const awn = new THREE.Mesh(new THREE.BoxGeometry(w, 0.18, 1.4), mat);
  const y = Math.min(2.7, def.height - 0.6);
  awn.position.set(0, y, def.depth / 2 + 0.6);
  awn.rotation.x = -0.32; // slope down toward the street
  awn.castShadow = true;
  return awn;
}
```

In `makeBuilding`'s non-house path, after building `mesh`, return a group with the awning when shown:

```ts
  const a = awningStyle(def.id);
  if (!a.show) return mesh;
  const group = new THREE.Group();
  group.add(mesh);
  group.add(makeAwning(def, a.color));
  return group;
```

(The current non-house path positions `mesh` at world coords via `mesh.position.set(def.x, def.height/2, def.z)`; the awning is positioned in the same world frame, so add it to the group at the building's world position. Implementer note: position the awning using `def.x`/`def.z` absolute coordinates the same way the mesh is, i.e. set `awn.position.set(def.x, y, def.z + def.depth / 2 + 0.6)` inside `makeAwning`, since `mesh` is not parented to the group's origin.)

Correct `makeAwning` final positioning to absolute coords (matching how `mesh` is placed):

```ts
  awn.position.set(def.x, y, def.z + def.depth / 2 + 0.6);
```

- [ ] **Step 4: Run tests + build**

Run: `cd rishon3d && npx vitest run test/builders.test.ts && npm run build`
Expected: builders tests PASS; build PASS.

- [ ] **Step 5: Commit**

```bash
git add rishon3d/src/world/builders.ts rishon3d/test/builders.test.ts
git commit -m "feat(rishon3d): striped shop awnings on a subset of buildings"
```

---

### Task 10: Static elevated rail silhouette (`world/rail.ts`)

A static elevated track deck on concrete pillars along the east edge, clear of all districts (which span ±125 within the ±140 ground). No animation, no collider. First to cut if it can't be placed cleanly.

**Files:**
- Create: `rishon3d/src/world/rail.ts`
- Modify: `rishon3d/src/world/World.ts` (add the rail)
- Test: `rishon3d/test/rail.test.ts` (new)

**Interfaces:**
- Consumes: `mergeGeometries`, `PALETTE`.
- Produces: `export function pillarZs(length: number, spacing: number): number[]`, `export function makeRail(opts?: { x?: number; length?: number; height?: number; spacing?: number }): THREE.Object3D`.

- [ ] **Step 1: Write the failing test**

```ts
// rishon3d/test/rail.test.ts
import { describe, it, expect } from "vitest";
import * as THREE from "three";
import { pillarZs, makeRail } from "../src/world/rail";

describe("pillarZs", () => {
  it("spaces pillars symmetrically along the deck", () => {
    const zs = pillarZs(260, 20);
    expect(zs.length).toBeGreaterThan(5);
    const sum = zs.reduce((a, b) => a + b, 0);
    expect(sum / zs.length).toBeCloseTo(0, 6); // centered on 0
    for (const z of zs) expect(Math.abs(z)).toBeLessThanOrEqual(130);
  });
});

describe("makeRail", () => {
  it("returns an object placed clear of the districts (|x| > 125)", () => {
    const rail = makeRail();
    expect(Math.abs(rail.position.x)).toBeGreaterThan(125);
    expect(rail.children.length).toBeGreaterThanOrEqual(2); // deck + pillars (+rails)
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd rishon3d && npx vitest run test/rail.test.ts`
Expected: FAIL — cannot resolve `../src/world/rail`.

- [ ] **Step 3: Write `world/rail.ts`**

```ts
// rishon3d/src/world/rail.ts
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { PALETTE } from "./palette";

// Evenly spaced, center-symmetric pillar z-positions along a deck of `length`.
export function pillarZs(length: number, spacing: number): number[] {
  const count = Math.max(2, Math.floor(length / spacing));
  const span = count * spacing;
  const start = -span / 2;
  const out: number[] = [];
  for (let i = 0; i <= count; i++) out.push(start + i * spacing);
  return out;
}

// Static elevated rail: a deck on concrete pillars, plus two thin rails on top.
// Placed along x = ±130 (clear of districts at ±125), running along z. No collider.
export function makeRail(opts: { x?: number; length?: number; height?: number; spacing?: number } = {}): THREE.Object3D {
  const x = opts.x ?? 130;
  const length = opts.length ?? 260;
  const height = opts.height ?? 11;
  const spacing = opts.spacing ?? 20;
  const group = new THREE.Group();
  group.position.set(x, 0, 0);

  const concrete = new THREE.MeshStandardMaterial({ color: PALETTE.railConcrete });
  const deckMat = new THREE.MeshStandardMaterial({ color: PALETTE.railDeck });

  // Deck.
  const deck = new THREE.Mesh(new THREE.BoxGeometry(4, 1, length), deckMat);
  deck.position.set(0, height, 0);
  deck.castShadow = true; deck.receiveShadow = true;
  group.add(deck);

  // Two thin rails on top.
  const railGeos: THREE.BufferGeometry[] = [];
  for (const rx of [-1.1, 1.1]) {
    const g = new THREE.BoxGeometry(0.25, 0.3, length);
    g.translate(rx, height + 0.65, 0);
    railGeos.push(g);
  }
  const rails = new THREE.Mesh(mergeGeometries(railGeos), concrete);
  group.add(rails);

  // Pillars merged into one mesh.
  const pillarGeos: THREE.BufferGeometry[] = [];
  for (const z of pillarZs(length, spacing)) {
    const g = new THREE.BoxGeometry(1.6, height, 1.6);
    g.translate(0, height / 2, z);
    pillarGeos.push(g);
  }
  const pillars = new THREE.Mesh(mergeGeometries(pillarGeos), concrete);
  pillars.castShadow = true; pillars.receiveShadow = true;
  group.add(pillars);

  return group;
}
```

- [ ] **Step 4: Wire the rail into `world/World.ts`**

Add `import { makeRail } from "./rail";` and in the constructor:

```ts
    scene.add(makeRail());
```

- [ ] **Step 5: Run tests + build**

Run: `cd rishon3d && npx vitest run test/rail.test.ts && npm run build`
Expected: rail tests PASS; build PASS.

- [ ] **Step 6: Commit**

```bash
git add rishon3d/src/world/rail.ts rishon3d/src/world/World.ts rishon3d/test/rail.test.ts
git commit -m "feat(rishon3d): static elevated rail silhouette along the east edge"
```

---

### Task 11: Full verification + visual check

**Files:** none (verification only).

- [ ] **Step 1: Full unit suite**

Run: `cd rishon3d && npm test`
Expected: ALL test files PASS (the original 110 plus the new palette/clouds/humanoid/carMesh/rail/builders/voxel-canopy/curb cases).

- [ ] **Step 2: Production build**

Run: `cd rishon3d && npm run build`
Expected: `tsc --noEmit` clean + Vite build success.

- [ ] **Step 3: Smoke test**

Run: `cd rishon3d && npm run test:smoke`
Expected: Playwright smoke passes. (If it requires a running dev server and the environment can't provide one headless, note the limitation rather than marking it green.)

- [ ] **Step 4: Visual verification**

Run the dev server (`cd rishon3d && npm run dev`), open the app, start the game, and capture a screenshot. Confirm against `assets/roblox-style-city-browser-game.png`:
- Bright blue sky with chunky white clouds; no orange dusk haze.
- Saturated matte buildings (tans/yellows/brick/blue-glass), striped awnings on some.
- Voxel (stacked-cube) trees; blockier bushes.
- Blocky character with a cube head + backpack.
- Cleaner blocky car (glass band, roof, headlights).
- Visible raised curbs along streets; static elevated rail on the east edge.
Confirm driving/walking/phone-ride still work (no physics regressions).

- [ ] **Step 5: Final summary**

Report: what was built, decisions/assumptions logged, test results (with the actual pass counts), the smoke-test outcome, the visual screenshot result, and anything deferred. Do NOT merge or deploy — hand back the finished branch.

---

## Self-Review

**Spec coverage:**
- Daytime sky + clouds → Tasks 2, 3. No fog / no ACES / no bloom → Task 2. Neutral tonemap exposure ~1.0 → Task 2. ✓
- Flat matte materials → Task 2 (lighting + tonemap) + Task 6 (car metalness removed); existing Standard materials already matte (documented). ✓
- Saturated palette / repaint → Tasks 1, 7. ✓
- Voxel trees / blocky bushes → Task 4. Glowing lantern → Task 4. ✓
- Blocky character + cube head + backpack box → Task 5. ✓
- Cleaner blocky car (shared across all car entities) → Task 6. ✓
- Curbs → Task 8. Striped awnings → Task 9. ✓
- Static elevated rail → Task 10. ✓
- No gameplay/physics changes; instancing/determinism kept → Global Constraints, enforced per task. ✓
- Deferred (animated train, fountain, interiors, hair/face/straps, vehicle variety, trash cans/planters) → not in any task, by design. ✓

**Placeholder scan:** No TBD/TODO; every code step shows complete code; every command shows expected output. ✓

**Type consistency:** `DAY` (Task 2) consumed by Engine/builders; `PALETTE`/`BUILDING_COLORS`/`DISTRICT_PALETTES` (Task 1) consumed by Tasks 3,4,6(parked uses literal),7,8,9,10; `makeCarBody`/`CarBodyOpts` (Task 6) consumed by Car/RideCar/NpcCar; `curbRects`/`CURB_W`/`CURB_H` (Task 8); `awningStyle` (Task 9); `pillarZs`/`makeRail` (Task 10); `cloudPlacements`/`makeClouds` (Task 3); `coniferCanopyBoxes`/`deciduousCanopyBoxes` (Task 4). Names are consistent across producer and consumer tasks. ✓
