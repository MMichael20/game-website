# Rishon 3D Spike Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a small browser-based 3D vertical slice of Rishon LeZion where you can walk a character, enter and drive a car, see static NPCs, and use a title/pause menu — to evaluate a 3D direction for the game.

**Architecture:** A self-contained `rishon3d/` Vite + TypeScript sub-project using Three.js for rendering and Rapier (WASM) for physics. An `Engine` owns the render loop and ticks systems; a `Game` owns the Character and Car entities and the walk⇄drive state machine; the world is assembled from a data file. Pure logic (map validation, interaction state, input edge detection) is unit-tested with vitest; the integrated app is verified with a headless Playwright smoke test.

**Tech Stack:** TypeScript, Vite, Three.js (`three`), Rapier (`@dimforge/rapier3d-compat`), vitest, Playwright (smoke test only).

## Global Constraints

- Sub-project lives entirely in `rishon3d/` with its own `package.json`. The root Phaser game, root `vite.config.ts`, root `index.html`, and `render.yaml` MUST NOT be modified.
- Physics library: `@dimforge/rapier3d-compat` (the compat WASM build — no Vite top-level-await config needed). Initialize via `await RAPIER.init()` before creating a world.
- Rendering: `three` (latest 0.16x+). Vanilla TS only — no React / R3F.
- No downloaded art assets. All geometry is procedural Three.js primitives.
- No emojis anywhere in committed files.
- Desktop keyboard controls only. No touch/mobile in this spike.
- Every code step shows the actual code. TDD where there is pure logic; commit after each task.
- TypeScript strict mode on. `npm run build` = `tsc --noEmit && vite build` and must pass.

---

### Task 1: Scaffold the `rishon3d/` sub-project

**Files:**
- Create: `rishon3d/package.json`
- Create: `rishon3d/tsconfig.json`
- Create: `rishon3d/vite.config.ts`
- Create: `rishon3d/index.html`
- Create: `rishon3d/src/main.ts`
- Create: `rishon3d/.gitignore`

**Interfaces:**
- Consumes: nothing.
- Produces: a runnable Vite project. `npm run dev` serves a page; `npm run build` runs `tsc --noEmit && vite build`; `npm test` runs vitest.

- [ ] **Step 1: Create `rishon3d/package.json`**

```json
{
  "name": "rishon3d",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "test": "vitest run"
  },
  "dependencies": {
    "three": "^0.169.0",
    "@dimforge/rapier3d-compat": "^0.14.0"
  },
  "devDependencies": {
    "@types/three": "^0.169.0",
    "typescript": "^5.9.3",
    "vite": "^5.4.0",
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Step 2: Create `rishon3d/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "skipLibCheck": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "types": ["vite/client"],
    "isolatedModules": true,
    "noEmit": true
  },
  "include": ["src", "test"]
}
```

- [ ] **Step 3: Create `rishon3d/vite.config.ts`**

```ts
import { defineConfig } from "vite";

export default defineConfig({
  root: ".",
  build: { target: "es2022", outDir: "dist" },
});
```

- [ ] **Step 4: Create `rishon3d/index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Rishon 3D</title>
    <style>
      html, body { margin: 0; height: 100%; overflow: hidden; background: #1a1a2e; }
      #app { position: fixed; inset: 0; }
      canvas { display: block; }
    </style>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

- [ ] **Step 5: Create `rishon3d/.gitignore`**

```
node_modules
dist
```

- [ ] **Step 6: Create placeholder `rishon3d/src/main.ts`**

```ts
// Bootstrap is filled in by Task 9. Placeholder keeps the build green.
const app = document.getElementById("app");
if (app) app.textContent = "Rishon 3D booting...";
```

- [ ] **Step 7: Install and verify build**

Run: `cd rishon3d && npm install && npm run build`
Expected: install succeeds; `tsc --noEmit` passes; `vite build` writes `dist/`. PASS.

- [ ] **Step 8: Commit**

```bash
git add rishon3d/package.json rishon3d/package-lock.json rishon3d/tsconfig.json rishon3d/vite.config.ts rishon3d/index.html rishon3d/.gitignore rishon3d/src/main.ts
git commit -m "chore(rishon3d): scaffold Three.js + Rapier sub-project"
```

---

### Task 2: World map data + validation (pure, TDD)

**Files:**
- Create: `rishon3d/src/world/rishonMap.ts`
- Create: `rishon3d/test/rishonMap.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `interface Vec2 { x: number; z: number }`
  - `interface BuildingDef { id: string; x: number; z: number; width: number; depth: number; height: number; color: number; isHouse?: boolean }`
  - `interface RoadDef { id: string; x: number; z: number; length: number; horizontal: boolean }`
  - `interface RishonMap { ground: { size: number }; buildings: BuildingDef[]; roads: RoadDef[]; npcSpawns: Vec2[]; carSpawn: Vec2; playerSpawn: Vec2 }`
  - `const RISHON_MAP: RishonMap`
  - `function validateMap(map: RishonMap): string[]` — returns array of error strings (empty = valid).

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { RISHON_MAP, validateMap } from "../src/world/rishonMap";

describe("RISHON_MAP", () => {
  it("is valid", () => {
    expect(validateMap(RISHON_MAP)).toEqual([]);
  });
  it("has unique building ids", () => {
    const ids = RISHON_MAP.buildings.map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it("has exactly one house", () => {
    expect(RISHON_MAP.buildings.filter((b) => b.isHouse).length).toBe(1);
  });
  it("keeps spawns inside the ground bounds", () => {
    const half = RISHON_MAP.ground.size / 2;
    for (const s of [RISHON_MAP.carSpawn, RISHON_MAP.playerSpawn, ...RISHON_MAP.npcSpawns]) {
      expect(Math.abs(s.x)).toBeLessThanOrEqual(half);
      expect(Math.abs(s.z)).toBeLessThanOrEqual(half);
    }
  });
  it("validateMap reports duplicate ids", () => {
    const bad = { ...RISHON_MAP, buildings: [...RISHON_MAP.buildings, RISHON_MAP.buildings[0]] };
    expect(validateMap(bad).length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd rishon3d && npx vitest run test/rishonMap.test.ts`
Expected: FAIL (module not found / exports undefined).

- [ ] **Step 3: Write minimal implementation**

```ts
export interface Vec2 { x: number; z: number }

export interface BuildingDef {
  id: string; x: number; z: number;
  width: number; depth: number; height: number;
  color: number; isHouse?: boolean;
}

export interface RoadDef {
  id: string; x: number; z: number; length: number; horizontal: boolean;
}

export interface RishonMap {
  ground: { size: number };
  buildings: BuildingDef[];
  roads: RoadDef[];
  npcSpawns: Vec2[];
  carSpawn: Vec2;
  playerSpawn: Vec2;
}

export const RISHON_MAP: RishonMap = {
  ground: { size: 120 },
  roads: [
    { id: "main-h", x: 0, z: 0, length: 120, horizontal: true },
    { id: "cross-v", x: 0, z: 0, length: 120, horizontal: false },
  ],
  buildings: [
    { id: "house", x: 14, z: 14, width: 8, depth: 8, height: 5, color: 0xd98c5f, isHouse: true },
    { id: "b1", x: -18, z: 12, width: 10, depth: 10, height: 12, color: 0x8d99ae },
    { id: "b2", x: -16, z: -16, width: 12, depth: 8, height: 16, color: 0x6d7a91 },
    { id: "b3", x: 18, z: -14, width: 9, depth: 11, height: 9, color: 0xa3b0c2 },
    { id: "b4", x: 34, z: 8, width: 8, depth: 8, height: 20, color: 0x7c8aa0 },
    { id: "b5", x: -34, z: -6, width: 14, depth: 10, height: 7, color: 0x99a6ba },
    { id: "b6", x: 6, z: 36, width: 10, depth: 9, height: 14, color: 0x828fa6 },
    { id: "b7", x: -8, z: -36, width: 11, depth: 11, height: 10, color: 0x90a0b5 },
  ],
  npcSpawns: [
    { x: 8, z: 6 },
    { x: -6, z: 4 },
    { x: 4, z: -10 },
  ],
  carSpawn: { x: 6, z: 14 },
  playerSpawn: { x: 0, z: 4 },
};

export function validateMap(map: RishonMap): string[] {
  const errors: string[] = [];
  const ids = map.buildings.map((b) => b.id);
  if (new Set(ids).size !== ids.length) errors.push("duplicate building ids");
  if (map.buildings.filter((b) => b.isHouse).length !== 1) errors.push("must have exactly one house");
  const half = map.ground.size / 2;
  const inBounds = (p: Vec2) => Math.abs(p.x) <= half && Math.abs(p.z) <= half;
  if (!inBounds(map.carSpawn)) errors.push("carSpawn out of bounds");
  if (!inBounds(map.playerSpawn)) errors.push("playerSpawn out of bounds");
  map.npcSpawns.forEach((s, i) => { if (!inBounds(s)) errors.push(`npcSpawn ${i} out of bounds`); });
  return errors;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd rishon3d && npx vitest run test/rishonMap.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add rishon3d/src/world/rishonMap.ts rishon3d/test/rishonMap.test.ts
git commit -m "feat(rishon3d): data-driven Rishon map + validation"
```

---

### Task 3: Input system with edge detection (pure-ish, TDD)

**Files:**
- Create: `rishon3d/src/core/Input.ts`
- Create: `rishon3d/test/input.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `class Input` with: `constructor(target?: { addEventListener: Function })` (defaults to `window` at runtime; tests pass a fake),
    `isDown(code: string): boolean`,
    `justPressed(code: string): boolean` (true only on the frame after a fresh keydown),
    `handleKeyDown(code: string): void` / `handleKeyUp(code: string): void` (called by listeners; exposed for tests),
    `endFrame(): void` (clears the justPressed set; call at end of each tick),
    `dispose(): void`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { Input } from "../src/core/Input";

function makeFakeTarget() {
  const handlers: Record<string, Function> = {};
  return {
    addEventListener: (type: string, fn: Function) => { handlers[type] = fn; },
    removeEventListener: () => {},
    fire: (type: string, code: string) => handlers[type]?.({ code, preventDefault() {} }),
  };
}

describe("Input", () => {
  it("tracks held keys", () => {
    const t = makeFakeTarget();
    const input = new Input(t as any);
    t.fire("keydown", "KeyW");
    expect(input.isDown("KeyW")).toBe(true);
    t.fire("keyup", "KeyW");
    expect(input.isDown("KeyW")).toBe(false);
  });

  it("justPressed is true once, then false until released and pressed again", () => {
    const t = makeFakeTarget();
    const input = new Input(t as any);
    t.fire("keydown", "KeyE");
    expect(input.justPressed("KeyE")).toBe(true);
    input.endFrame();
    expect(input.justPressed("KeyE")).toBe(false);
    // still held: a repeat keydown should not re-trigger justPressed
    t.fire("keydown", "KeyE");
    expect(input.justPressed("KeyE")).toBe(false);
    t.fire("keyup", "KeyE");
    t.fire("keydown", "KeyE");
    expect(input.justPressed("KeyE")).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd rishon3d && npx vitest run test/input.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Write minimal implementation**

```ts
type Listenable = {
  addEventListener: (type: string, fn: (e: any) => void) => void;
  removeEventListener?: (type: string, fn: (e: any) => void) => void;
};

export class Input {
  private down = new Set<string>();
  private pressed = new Set<string>();
  private readonly target: Listenable;
  private readonly onDown = (e: { code: string }) => this.handleKeyDown(e.code);
  private readonly onUp = (e: { code: string }) => this.handleKeyUp(e.code);

  constructor(target?: Listenable) {
    this.target = target ?? (window as unknown as Listenable);
    this.target.addEventListener("keydown", this.onDown);
    this.target.addEventListener("keyup", this.onUp);
  }

  handleKeyDown(code: string): void {
    if (!this.down.has(code)) this.pressed.add(code); // fresh press only
    this.down.add(code);
  }

  handleKeyUp(code: string): void {
    this.down.delete(code);
  }

  isDown(code: string): boolean { return this.down.has(code); }
  justPressed(code: string): boolean { return this.pressed.has(code); }
  endFrame(): void { this.pressed.clear(); }

  dispose(): void {
    this.target.removeEventListener?.("keydown", this.onDown);
    this.target.removeEventListener?.("keyup", this.onUp);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd rishon3d && npx vitest run test/input.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add rishon3d/src/core/Input.ts rishon3d/test/input.test.ts
git commit -m "feat(rishon3d): keyboard input with justPressed edge detection"
```

---

### Task 4: Interaction state machine for walk/drive (pure, TDD)

**Files:**
- Create: `rishon3d/src/game/InteractionSystem.ts`
- Create: `rishon3d/test/interaction.test.ts`

**Interfaces:**
- Consumes: `Vec2` from `rishonMap.ts`.
- Produces:
  - `type Mode = "onFoot" | "driving"`
  - `function distanceXZ(a: Vec2, b: Vec2): number`
  - `function canEnter(mode: Mode, playerPos: Vec2, carPos: Vec2, radius: number): boolean` — true when onFoot and within radius.
  - `function nextMode(mode: Mode, ePressed: boolean, playerPos: Vec2, carPos: Vec2, radius: number): Mode` — toggles onFoot↔driving on E (enter requires proximity; exit always allowed).

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { distanceXZ, canEnter, nextMode } from "../src/game/InteractionSystem";

const R = 3;

describe("InteractionSystem", () => {
  it("computes planar distance", () => {
    expect(distanceXZ({ x: 0, z: 0 }, { x: 3, z: 4 })).toBe(5);
  });
  it("can enter only when on foot and near", () => {
    expect(canEnter("onFoot", { x: 0, z: 0 }, { x: 1, z: 0 }, R)).toBe(true);
    expect(canEnter("onFoot", { x: 0, z: 0 }, { x: 10, z: 0 }, R)).toBe(false);
    expect(canEnter("driving", { x: 0, z: 0 }, { x: 1, z: 0 }, R)).toBe(false);
  });
  it("E near car enters; E while driving exits; E far away does nothing", () => {
    expect(nextMode("onFoot", true, { x: 0, z: 0 }, { x: 1, z: 0 }, R)).toBe("driving");
    expect(nextMode("driving", true, { x: 0, z: 0 }, { x: 1, z: 0 }, R)).toBe("onFoot");
    expect(nextMode("onFoot", true, { x: 0, z: 0 }, { x: 99, z: 0 }, R)).toBe("onFoot");
    expect(nextMode("onFoot", false, { x: 0, z: 0 }, { x: 1, z: 0 }, R)).toBe("onFoot");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd rishon3d && npx vitest run test/interaction.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Write minimal implementation**

```ts
import type { Vec2 } from "../world/rishonMap";

export type Mode = "onFoot" | "driving";

export function distanceXZ(a: Vec2, b: Vec2): number {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dz * dz);
}

export function canEnter(mode: Mode, playerPos: Vec2, carPos: Vec2, radius: number): boolean {
  return mode === "onFoot" && distanceXZ(playerPos, carPos) <= radius;
}

export function nextMode(
  mode: Mode, ePressed: boolean, playerPos: Vec2, carPos: Vec2, radius: number,
): Mode {
  if (!ePressed) return mode;
  if (mode === "driving") return "onFoot";
  return canEnter(mode, playerPos, carPos, radius) ? "driving" : "onFoot";
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd rishon3d && npx vitest run test/interaction.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add rishon3d/src/game/InteractionSystem.ts rishon3d/test/interaction.test.ts
git commit -m "feat(rishon3d): pure walk/drive interaction state machine"
```

---

### Task 5: Engine — renderer, scene, camera, render loop

**Files:**
- Create: `rishon3d/src/core/Engine.ts`
- Create: `rishon3d/src/core/FollowCamera.ts`

**Interfaces:**
- Consumes: `three`.
- Produces:
  - `interface Tickable { update(dt: number): void }`
  - `class Engine` with: `constructor(container: HTMLElement)`, public readonly `scene: THREE.Scene`, `camera: THREE.PerspectiveCamera`, `renderer: THREE.WebGLRenderer`; `add(t: Tickable): void`; `start(): void`; `stop(): void`; `dispose(): void`. Sets up lights, sky color, fog, shadow-enabled renderer, resize handling. The loop computes `dt` from `THREE.Clock` and calls each tickable's `update(dt)` then renders.
  - `class FollowCamera` implements `Tickable` with: `constructor(camera: THREE.PerspectiveCamera)`, `setTarget(obj: THREE.Object3D, offset: THREE.Vector3): void`, smoothing toward `target.position + offset`, always `lookAt` target.

- [ ] **Step 1: Implement `FollowCamera.ts`**

```ts
import * as THREE from "three";
import type { Tickable } from "./Engine";

export class FollowCamera implements Tickable {
  private target?: THREE.Object3D;
  private offset = new THREE.Vector3(0, 6, 10);
  private desired = new THREE.Vector3();

  constructor(private camera: THREE.PerspectiveCamera) {}

  setTarget(obj: THREE.Object3D, offset: THREE.Vector3): void {
    this.target = obj;
    this.offset.copy(offset);
  }

  update(dt: number): void {
    if (!this.target) return;
    this.desired.copy(this.target.position).add(this.offset);
    const lerp = 1 - Math.pow(0.001, dt); // frame-rate independent smoothing
    this.camera.position.lerp(this.desired, lerp);
    this.camera.lookAt(this.target.position);
  }
}
```

- [ ] **Step 2: Implement `Engine.ts`**

```ts
import * as THREE from "three";

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
    this.scene.background = new THREE.Color(0x87b8e0);
    this.scene.fog = new THREE.Fog(0x87b8e0, 60, 180);

    this.camera = new THREE.PerspectiveCamera(60, this.aspect(), 0.1, 1000);
    this.camera.position.set(0, 8, 14);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    const hemi = new THREE.HemisphereLight(0xbfe3ff, 0x55503a, 0.9);
    this.scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xffffff, 1.6);
    sun.position.set(30, 50, 20);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    const s = 80;
    sun.shadow.camera.left = -s; sun.shadow.camera.right = s;
    sun.shadow.camera.top = s; sun.shadow.camera.bottom = -s;
    sun.shadow.camera.far = 200;
    this.scene.add(sun);

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

- [ ] **Step 3: Verify type-check passes**

Run: `cd rishon3d && npx tsc --noEmit`
Expected: PASS (no type errors).

- [ ] **Step 4: Commit**

```bash
git add rishon3d/src/core/Engine.ts rishon3d/src/core/FollowCamera.ts
git commit -m "feat(rishon3d): engine render loop + follow camera"
```

---

### Task 6: Physics world wrapper + world geometry builders

**Files:**
- Create: `rishon3d/src/core/Physics.ts`
- Create: `rishon3d/src/world/builders.ts`
- Create: `rishon3d/src/world/World.ts`

**Interfaces:**
- Consumes: `three`, `@dimforge/rapier3d-compat` (as `RAPIER`), `RISHON_MAP`, builders.
- Produces:
  - `Physics.init(): Promise<void>` (static; calls `await RAPIER.init()` once), `class Physics` with `world: RAPIER.World`, `step(dt: number): void`, and `RAPIER` re-exported.
  - `builders.ts`: `makeGround(map): THREE.Mesh`, `makeBuilding(def): THREE.Mesh`, `makeRoad(def): THREE.Mesh` — Three meshes positioned per data; buildings/ground cast/receive shadows appropriately.
  - `class World` with `constructor(scene, physics, map)`, builds ground + roads + buildings as Three meshes AND static Rapier colliders (fixed cuboids for buildings + a ground collider). Exposes `npcSpawns`, `carSpawn`, `playerSpawn` passthrough.

- [ ] **Step 1: Implement `Physics.ts`**

```ts
import RAPIER from "@dimforge/rapier3d-compat";

export { RAPIER };

export class Physics {
  readonly world: RAPIER.World;
  private static ready = false;

  static async init(): Promise<void> {
    if (!Physics.ready) { await RAPIER.init(); Physics.ready = true; }
  }

  constructor() {
    this.world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
  }

  step(dt: number): void {
    this.world.timestep = Math.min(dt, 1 / 30);
    this.world.step();
  }
}
```

- [ ] **Step 2: Implement `builders.ts`**

```ts
import * as THREE from "three";
import type { BuildingDef, RishonMap, RoadDef } from "./rishonMap";

export function makeGround(map: RishonMap): THREE.Mesh {
  const geo = new THREE.PlaneGeometry(map.ground.size, map.ground.size);
  const mat = new THREE.MeshStandardMaterial({ color: 0x5a7d4f });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.receiveShadow = true;
  return mesh;
}

export function makeRoad(def: RoadDef): THREE.Mesh {
  const w = def.horizontal ? def.length : 6;
  const d = def.horizontal ? 6 : def.length;
  const geo = new THREE.PlaneGeometry(w, d);
  const mat = new THREE.MeshStandardMaterial({ color: 0x3a3a40 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(def.x, 0.02, def.z);
  mesh.receiveShadow = true;
  return mesh;
}

export function makeBuilding(def: BuildingDef): THREE.Mesh {
  const geo = new THREE.BoxGeometry(def.width, def.height, def.depth);
  const mat = new THREE.MeshStandardMaterial({ color: def.color });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(def.x, def.height / 2, def.z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}
```

- [ ] **Step 3: Implement `World.ts`**

```ts
import * as THREE from "three";
import { Physics, RAPIER } from "../core/Physics";
import { makeBuilding, makeGround, makeRoad } from "./builders";
import type { RishonMap } from "./rishonMap";

export class World {
  constructor(scene: THREE.Scene, physics: Physics, public readonly map: RishonMap) {
    scene.add(makeGround(map));
    for (const r of map.roads) scene.add(makeRoad(r));

    // ground collider (thin fixed cuboid at y=0)
    const half = map.ground.size / 2;
    const groundBody = physics.world.createRigidBody(RAPIER.RigidBodyDesc.fixed());
    physics.world.createCollider(
      RAPIER.ColliderDesc.cuboid(half, 0.1, half).setTranslation(0, -0.1, 0),
      groundBody,
    );

    for (const b of map.buildings) {
      scene.add(makeBuilding(b));
      const body = physics.world.createRigidBody(
        RAPIER.RigidBodyDesc.fixed().setTranslation(b.x, b.height / 2, b.z),
      );
      physics.world.createCollider(
        RAPIER.ColliderDesc.cuboid(b.width / 2, b.height / 2, b.depth / 2),
        body,
      );
    }
  }

  get npcSpawns() { return this.map.npcSpawns; }
  get carSpawn() { return this.map.carSpawn; }
  get playerSpawn() { return this.map.playerSpawn; }
}
```

- [ ] **Step 4: Verify type-check passes**

Run: `cd rishon3d && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add rishon3d/src/core/Physics.ts rishon3d/src/world/builders.ts rishon3d/src/world/World.ts
git commit -m "feat(rishon3d): rapier physics world + procedural world geometry"
```

---

### Task 7: Character controller + static NPCs

**Files:**
- Create: `rishon3d/src/entities/Character.ts`
- Create: `rishon3d/src/entities/Npc.ts`

**Interfaces:**
- Consumes: `three`, `Physics`/`RAPIER`, `Input`, `Tickable`, `Vec2`.
- Produces:
  - `class Character implements Tickable` with `constructor(scene, physics, input, spawn: Vec2)`, `object: THREE.Object3D` (the visual group), `enabled: boolean` (when false, does not move/update — used while driving), `position: THREE.Vector3` getter, `update(dt)` using Rapier `KinematicCharacterController` for movement + collision against buildings, camera-relative WASD movement, faces travel direction. `setPosition(x, z): void`.
  - `class Npc` with `constructor(scene, spawn: Vec2, color: number)` building a simple low-poly humanoid (box body + sphere head) placed at spawn; `object: THREE.Object3D`.

- [ ] **Step 1: Implement `Npc.ts`**

```ts
import * as THREE from "three";
import type { Vec2 } from "../world/rishonMap";

export class Npc {
  readonly object = new THREE.Group();

  constructor(scene: THREE.Scene, spawn: Vec2, color: number) {
    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.35, 0.8, 4, 8),
      new THREE.MeshStandardMaterial({ color }),
    );
    body.position.y = 0.9;
    body.castShadow = true;
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.28, 12, 12),
      new THREE.MeshStandardMaterial({ color: 0xf0c9a0 }),
    );
    head.position.y = 1.7;
    head.castShadow = true;
    this.object.add(body, head);
    this.object.position.set(spawn.x, 0, spawn.z);
    scene.add(this.object);
  }
}
```

- [ ] **Step 2: Implement `Character.ts`**

```ts
import * as THREE from "three";
import { Physics, RAPIER } from "../core/Physics";
import type { Input } from "../core/Input";
import type { Tickable } from "../core/Engine";
import type { Vec2 } from "../world/rishonMap";

const SPEED = 8;

export class Character implements Tickable {
  readonly object = new THREE.Group();
  enabled = true;

  private body: RAPIER.RigidBody;
  private collider: RAPIER.Collider;
  private controller: RAPIER.KinematicCharacterController;
  private tmp = new THREE.Vector3();

  constructor(
    private scene: THREE.Scene,
    private physics: Physics,
    private input: Input,
    spawn: Vec2,
    private camera: THREE.Camera,
  ) {
    const mesh = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.4, 1.0, 4, 8),
      new THREE.MeshStandardMaterial({ color: 0x2e6fb0 }),
    );
    mesh.position.y = 0.9;
    mesh.castShadow = true;
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.3, 12, 12),
      new THREE.MeshStandardMaterial({ color: 0xf0c9a0 }),
    );
    head.position.y = 1.75;
    head.castShadow = true;
    this.object.add(mesh, head);
    this.object.position.set(spawn.x, 0, spawn.z);
    scene.add(this.object);

    this.body = physics.world.createRigidBody(
      RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(spawn.x, 1.0, spawn.z),
    );
    this.collider = physics.world.createCollider(
      RAPIER.ColliderDesc.capsule(0.5, 0.4),
      this.body,
    );
    this.controller = physics.world.createCharacterController(0.1);
    this.controller.enableAutostep(0.5, 0.2, true);
    this.controller.enableSnapToGround(0.5);
  }

  get position(): THREE.Vector3 { return this.object.position; }

  setPosition(x: number, z: number): void {
    this.body.setNextKinematicTranslation({ x, y: 1.0, z });
    this.object.position.set(x, 0, z);
  }

  update(dt: number): void {
    if (!this.enabled) return;

    // camera-relative input direction on XZ plane
    const forward = this.tmp.set(0, 0, -1).applyQuaternion(this.camera.quaternion);
    forward.y = 0; forward.normalize();
    const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize().negate();

    const move = new THREE.Vector3();
    if (this.input.isDown("KeyW") || this.input.isDown("ArrowUp")) move.add(forward);
    if (this.input.isDown("KeyS") || this.input.isDown("ArrowDown")) move.sub(forward);
    if (this.input.isDown("KeyA") || this.input.isDown("ArrowLeft")) move.sub(right);
    if (this.input.isDown("KeyD") || this.input.isDown("ArrowRight")) move.add(right);

    let desired = { x: 0, y: -9.81 * dt, z: 0 };
    if (move.lengthSq() > 0) {
      move.normalize().multiplyScalar(SPEED * dt);
      desired = { x: move.x, y: -9.81 * dt, z: move.z };
      this.object.rotation.y = Math.atan2(move.x, move.z);
    }

    this.controller.computeColliderMovement(this.collider, desired);
    const corrected = this.controller.computedMovement();
    const t = this.body.translation();
    const nx = t.x + corrected.x, ny = t.y + corrected.y, nz = t.z + corrected.z;
    this.body.setNextKinematicTranslation({ x: nx, y: ny, z: nz });
    this.object.position.set(nx, ny - 1.0, nz);
  }
}
```

- [ ] **Step 3: Verify type-check passes**

Run: `cd rishon3d && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add rishon3d/src/entities/Character.ts rishon3d/src/entities/Npc.ts
git commit -m "feat(rishon3d): kinematic character controller + static npcs"
```

---

### Task 8: Car — Rapier raycast vehicle

**Files:**
- Create: `rishon3d/src/entities/Car.ts`

**Interfaces:**
- Consumes: `three`, `Physics`/`RAPIER`, `Input`, `Tickable`, `Vec2`.
- Produces:
  - `class Car implements Tickable` with `constructor(scene, physics, input, spawn: Vec2)`, `object: THREE.Object3D` (chassis mesh), `enabled: boolean` (only steers/drives when true), `position: THREE.Vector3` getter, `update(dt)` driving the `DynamicRayCastVehicleController`: WASD/arrows accelerate/reverse/steer, Space brakes; syncs chassis mesh + 4 wheel meshes to physics each frame.

- [ ] **Step 1: Implement `Car.ts`**

```ts
import * as THREE from "three";
import { Physics, RAPIER } from "../core/Physics";
import type { Input } from "../core/Input";
import type { Tickable } from "../core/Engine";
import type { Vec2 } from "../world/rishonMap";

const ENGINE_FORCE = 28;
const BRAKE = 4;
const MAX_STEER = 0.5;

export class Car implements Tickable {
  readonly object = new THREE.Group();
  enabled = false;

  private body: RAPIER.RigidBody;
  private vehicle: RAPIER.DynamicRayCastVehicleController;
  private chassis: THREE.Mesh;
  private wheelMeshes: THREE.Mesh[] = [];

  constructor(
    private scene: THREE.Scene,
    private physics: Physics,
    private input: Input,
    spawn: Vec2,
  ) {
    this.chassis = new THREE.Mesh(
      new THREE.BoxGeometry(1.8, 0.6, 3.6),
      new THREE.MeshStandardMaterial({ color: 0xc0392b, metalness: 0.3, roughness: 0.5 }),
    );
    this.chassis.castShadow = true;
    const cabin = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 0.5, 1.8),
      new THREE.MeshStandardMaterial({ color: 0x222831 }),
    );
    cabin.position.set(0, 0.5, -0.2);
    this.chassis.add(cabin);
    this.object.add(this.chassis);
    scene.add(this.object);

    this.body = physics.world.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic().setTranslation(spawn.x, 1.0, spawn.z).setCanSleep(false),
    );
    physics.world.createCollider(
      RAPIER.ColliderDesc.cuboid(0.9, 0.3, 1.8).setMass(150),
      this.body,
    );

    this.vehicle = physics.world.createVehicleController(this.body);
    const wheelPositions: [number, number, number][] = [
      [-0.9, -0.2, 1.3], [0.9, -0.2, 1.3], [-0.9, -0.2, -1.3], [0.9, -0.2, -1.3],
    ];
    const suspensionDir = { x: 0, y: -1, z: 0 };
    const axleCs = { x: -1, y: 0, z: 0 };
    for (const [x, y, z] of wheelPositions) {
      this.vehicle.addWheel({ x, y, z }, suspensionDir, axleCs, 0.4, 0.35);
      const idx = this.wheelMeshes.length;
      this.vehicle.setWheelSuspensionStiffness(idx, 24);
      this.vehicle.setWheelMaxSuspensionTravel(idx, 0.3);
      const wheel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.35, 0.35, 0.3, 16),
        new THREE.MeshStandardMaterial({ color: 0x111111 }),
      );
      wheel.rotation.z = Math.PI / 2;
      wheel.castShadow = true;
      this.object.add(wheel);
      this.wheelMeshes.push(wheel);
    }
  }

  get position(): THREE.Vector3 { return this.object.position; }

  update(dt: number): void {
    const accel = this.input.isDown("KeyW") || this.input.isDown("ArrowUp");
    const reverse = this.input.isDown("KeyS") || this.input.isDown("ArrowDown");
    const left = this.input.isDown("KeyA") || this.input.isDown("ArrowLeft");
    const right = this.input.isDown("KeyD") || this.input.isDown("ArrowRight");
    const braking = this.input.isDown("Space");

    let engine = 0;
    if (this.enabled) {
      if (accel) engine = ENGINE_FORCE;
      else if (reverse) engine = -ENGINE_FORCE * 0.6;
    }
    let steer = 0;
    if (this.enabled) {
      if (left) steer = MAX_STEER;
      else if (right) steer = -MAX_STEER;
    }

    // rear-wheel drive (indices 2,3), front-wheel steer (indices 0,1)
    this.vehicle.setWheelEngineForce(2, engine);
    this.vehicle.setWheelEngineForce(3, engine);
    this.vehicle.setWheelSteering(0, steer);
    this.vehicle.setWheelSteering(1, steer);
    const brakeForce = this.enabled && braking ? BRAKE : 0;
    for (let i = 0; i < 4; i++) this.vehicle.setWheelBrake(i, brakeForce);

    this.vehicle.updateVehicle(Math.min(dt, 1 / 30));

    const t = this.body.translation();
    const r = this.body.rotation();
    this.object.position.set(t.x, t.y, t.z);
    this.object.quaternion.set(r.x, r.y, r.z, r.w);

    for (let i = 0; i < this.wheelMeshes.length; i++) {
      const conn = this.vehicle.wheelChassisConnectionPointCs(i);
      const susp = this.vehicle.wheelSuspensionLength(i) ?? 0;
      if (conn) this.wheelMeshes[i].position.set(conn.x, conn.y - susp, conn.z);
    }
  }
}
```

- [ ] **Step 2: Verify type-check passes**

Run: `cd rishon3d && npx tsc --noEmit`
Expected: PASS. (If a Rapier vehicle method name differs in the installed version, consult `node_modules/@dimforge/rapier3d-compat` typings and adjust to the real signature — do not invent names.)

- [ ] **Step 3: Commit**

```bash
git add rishon3d/src/entities/Car.ts
git commit -m "feat(rishon3d): rapier raycast vehicle car"
```

---

### Task 9: UI (menu + HUD) and Game wiring + bootstrap

**Files:**
- Create: `rishon3d/src/ui/Menu.ts`
- Create: `rishon3d/src/ui/Hud.ts`
- Create: `rishon3d/src/game/Game.ts`
- Modify: `rishon3d/src/main.ts`

**Interfaces:**
- Consumes: everything above.
- Produces:
  - `class Menu` — DOM overlays: `onStart(cb)`, `showTitle()`, `showPause()`, `hide()`.
  - `class Hud` — DOM: `setHint(text)`, `setPrompt(text | null)` (the "Press E" prompt).
  - `class Game implements Tickable` — owns `Character`, `Car`, `FollowCamera`, `mode`. On each update: reads input, applies `nextMode` on `justPressed("KeyE")`, toggles `character.enabled`/`car.enabled`, retargets `followCamera`, sets HUD prompt when `canEnter` is true, ticks active entity, and calls `input.endFrame()` LAST.
  - `main.ts` — async bootstrap: `await Physics.init()`, build Engine/World/Game, wire Menu Start to `engine.start()` + `game.begin()`, handle Esc pause.

- [ ] **Step 1: Implement `Menu.ts`**

```ts
export class Menu {
  private root = document.createElement("div");
  private startCb: () => void = () => {};

  constructor(container: HTMLElement) {
    this.root.style.cssText =
      "position:fixed;inset:0;display:flex;align-items:center;justify-content:center;" +
      "flex-direction:column;gap:20px;background:rgba(10,12,24,0.92);color:#eaeaf0;" +
      "font-family:system-ui,sans-serif;z-index:10;";
    container.appendChild(this.root);
  }

  onStart(cb: () => void): void { this.startCb = cb; }

  showTitle(): void {
    this.root.innerHTML = "";
    const h = document.createElement("h1");
    h.textContent = "Rishon 3D";
    h.style.cssText = "font-size:48px;margin:0;letter-spacing:2px;";
    const sub = document.createElement("p");
    sub.textContent = "WASD / Arrows to move - E to enter/exit car - Esc to pause";
    sub.style.opacity = "0.8";
    const btn = this.button("Start");
    btn.onclick = () => this.startCb();
    this.root.append(h, sub, btn);
    this.root.style.display = "flex";
  }

  showPause(): void {
    this.root.innerHTML = "";
    const h = document.createElement("h2");
    h.textContent = "Paused";
    const btn = this.button("Resume");
    btn.onclick = () => this.startCb();
    this.root.append(h, btn);
    this.root.style.display = "flex";
  }

  hide(): void { this.root.style.display = "none"; }

  private button(label: string): HTMLButtonElement {
    const b = document.createElement("button");
    b.textContent = label;
    b.style.cssText =
      "padding:12px 32px;font-size:20px;border:0;border-radius:8px;cursor:pointer;" +
      "background:#2e6fb0;color:white;";
    return b;
  }
}
```

- [ ] **Step 2: Implement `Hud.ts`**

```ts
export class Hud {
  private hint = document.createElement("div");
  private prompt = document.createElement("div");

  constructor(container: HTMLElement) {
    this.hint.style.cssText =
      "position:fixed;left:12px;bottom:12px;color:#fff;font-family:system-ui,sans-serif;" +
      "font-size:14px;opacity:0.8;text-shadow:0 1px 2px #000;z-index:5;";
    this.prompt.style.cssText =
      "position:fixed;left:50%;top:60%;transform:translateX(-50%);color:#fff;" +
      "font-family:system-ui,sans-serif;font-size:20px;padding:8px 16px;border-radius:6px;" +
      "background:rgba(0,0,0,0.5);z-index:5;display:none;";
    container.append(this.hint, this.prompt);
  }

  setHint(text: string): void { this.hint.textContent = text; }

  setPrompt(text: string | null): void {
    if (text) { this.prompt.textContent = text; this.prompt.style.display = "block"; }
    else { this.prompt.style.display = "none"; }
  }
}
```

- [ ] **Step 3: Implement `Game.ts`**

```ts
import * as THREE from "three";
import type { Tickable } from "../core/Engine";
import { FollowCamera } from "../core/FollowCamera";
import type { Input } from "../core/Input";
import type { Physics } from "../core/Physics";
import { Character } from "../entities/Character";
import { Car } from "../entities/Car";
import { Npc } from "../entities/Npc";
import type { World } from "../world/World";
import { nextMode, canEnter, type Mode } from "./InteractionSystem";
import type { Hud } from "../ui/Hud";

const ENTER_RADIUS = 3.5;

export class Game implements Tickable {
  private character: Character;
  private car: Car;
  private mode: Mode = "onFoot";

  constructor(
    scene: THREE.Scene,
    physics: Physics,
    private input: Input,
    private world: World,
    private follow: FollowCamera,
    camera: THREE.Camera,
    private hud: Hud,
  ) {
    this.character = new Character(scene, physics, input, world.playerSpawn, camera);
    this.car = new Car(scene, physics, input, world.carSpawn);
    const npcColors = [0x9b59b6, 0x27ae60, 0xe67e22];
    world.npcSpawns.forEach((s, i) => new Npc(scene, s, npcColors[i % npcColors.length]));
    this.car.enabled = false;
    this.character.enabled = true;
    this.follow.setTarget(this.character.object, new THREE.Vector3(0, 6, 9));
  }

  update(dt: number): void {
    const ePressed = this.input.justPressed("KeyE");
    const pPos = { x: this.character.position.x, z: this.character.position.z };
    const cPos = { x: this.car.position.x, z: this.car.position.z };
    const newMode = nextMode(this.mode, ePressed, pPos, cPos, ENTER_RADIUS);

    if (newMode !== this.mode) {
      this.mode = newMode;
      if (this.mode === "driving") {
        this.character.enabled = false;
        this.character.object.visible = false;
        this.car.enabled = true;
        this.follow.setTarget(this.car.object, new THREE.Vector3(0, 5, 9));
      } else {
        this.car.enabled = false;
        this.character.setPosition(this.car.position.x + 2.5, this.car.position.z);
        this.character.object.visible = true;
        this.character.enabled = true;
        this.follow.setTarget(this.character.object, new THREE.Vector3(0, 6, 9));
      }
    }

    // prompt
    if (this.mode === "onFoot" && canEnter("onFoot", pPos, cPos, ENTER_RADIUS)) {
      this.hud.setPrompt("Press E to drive");
    } else if (this.mode === "driving") {
      this.hud.setPrompt("Press E to exit");
    } else {
      this.hud.setPrompt(null);
    }

    this.character.update(dt);
    this.car.update(dt);
    this.input.endFrame();
  }
}
```

- [ ] **Step 4: Implement `main.ts` bootstrap**

```ts
import * as THREE from "three";
import { Engine } from "./core/Engine";
import { Input } from "./core/Input";
import { Physics } from "./core/Physics";
import { FollowCamera } from "./core/FollowCamera";
import { World } from "./world/World";
import { RISHON_MAP, validateMap } from "./world/rishonMap";
import { Game } from "./game/Game";
import { Menu } from "./ui/Menu";
import { Hud } from "./ui/Hud";

async function boot() {
  const container = document.getElementById("app")!;
  const errors = validateMap(RISHON_MAP);
  if (errors.length) console.error("map invalid", errors);

  await Physics.init();
  const physics = new Physics();
  const engine = new Engine(container);
  const world = new World(engine.scene, physics, RISHON_MAP);
  const follow = new FollowCamera(engine.camera);
  const input = new Input();
  const hud = new Hud(container);
  const game = new Game(engine.scene, physics, input, world, follow, engine.camera, hud);

  // step physics before game logic each frame
  engine.add({ update: (dt) => physics.step(dt) });
  engine.add(game);
  engine.add(follow);

  hud.setHint("WASD / Arrows move - E enter/exit - Esc pause");

  const menu = new Menu(container);
  let started = false;
  const begin = () => { menu.hide(); engine.start(); started = true; };
  menu.onStart(begin);
  menu.showTitle();

  window.addEventListener("keydown", (e) => {
    if (e.code === "Escape" && started) {
      if (engine["running"] ?? true) { engine.stop(); menu.showPause(); }
    }
  });
}

boot();
```

Note: pause toggle uses `engine.stop()`; Resume calls the same `begin()` which restarts the loop. Keep this simple for the spike.

- [ ] **Step 5: Type-check, build, and run unit tests**

Run: `cd rishon3d && npx tsc --noEmit && npm test && npm run build`
Expected: tsc clean; vitest all green; vite build writes `dist/`. PASS.

- [ ] **Step 6: Commit**

```bash
git add rishon3d/src/ui/Menu.ts rishon3d/src/ui/Hud.ts rishon3d/src/game/Game.ts rishon3d/src/main.ts
git commit -m "feat(rishon3d): ui, game wiring, and bootstrap"
```

---

### Task 10: Headless smoke test (integration evidence)

**Files:**
- Create: `rishon3d/test/smoke.spec.ts`
- Modify: `rishon3d/package.json` (add `@playwright/test` dev dep + `test:smoke` script)

**Interfaces:**
- Consumes: the built/served app.
- Produces: a Playwright test that boots the app, clicks Start, asserts a canvas exists and there are no console errors.

- [ ] **Step 1: Add Playwright dep + script to `package.json`**

Add to `devDependencies`: `"@playwright/test": "^1.48.0"`.
Add to `scripts`: `"test:smoke": "playwright test"`.

- [ ] **Step 2: Create `rishon3d/playwright.config.ts`**

```ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./test",
  testMatch: /.*\.spec\.ts/,
  webServer: {
    command: "npm run dev -- --port 5191",
    url: "http://localhost:5191",
    reuseExistingServer: false,
    timeout: 60000,
  },
  use: { baseURL: "http://localhost:5191" },
});
```

- [ ] **Step 3: Create `rishon3d/test/smoke.spec.ts`**

```ts
import { test, expect } from "@playwright/test";

test("boots, starts, renders a canvas with no console errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push(e.message));

  await page.goto("/");
  await page.getByRole("button", { name: "Start" }).click();
  await page.waitForTimeout(1500); // let physics init + a few frames run

  const canvas = page.locator("canvas");
  await expect(canvas).toHaveCount(1);

  expect(errors, `console errors:\n${errors.join("\n")}`).toEqual([]);
});
```

- [ ] **Step 4: Install browser + run smoke test**

Run: `cd rishon3d && npm install && npx playwright install chromium && npm run test:smoke`
Expected: 1 passed. (If WebGL is unavailable in the CI chromium, the test may need `--use-gl=swiftshader`; add `launchOptions.args` only if it fails.)

- [ ] **Step 5: Commit**

```bash
git add rishon3d/package.json rishon3d/package-lock.json rishon3d/playwright.config.ts rishon3d/test/smoke.spec.ts
git commit -m "test(rishon3d): headless smoke test for boot + render"
```

---

### Task 11: README + final verification

**Files:**
- Create: `rishon3d/README.md`

**Interfaces:**
- Consumes: nothing.
- Produces: how-to-run docs.

- [ ] **Step 1: Write `rishon3d/README.md`**

```markdown
# Rishon 3D (spike)

A small browser 3D vertical slice: walk, enter a car, drive around a few blocks of
Rishon LeZion. Built to evaluate a 3D direction for the game. Throwaway-able.

## Run
    cd rishon3d
    npm install
    npm run dev
    # open the printed localhost URL, click Start

## Controls
- WASD / Arrows: move (on foot or driving)
- E: enter / exit the car (stand near it)
- Space: brake (in car)
- Esc: pause

## Test
    npm test           # vitest unit tests (pure logic)
    npm run build      # tsc --noEmit + vite build
    npm run test:smoke # playwright boot/render smoke test

## Stack
Three.js (rendering) + Rapier (physics, @dimforge/rapier3d-compat) + Vite + TypeScript.
World geometry is procedural primitives; the map is data-driven in `src/world/rishonMap.ts`.
```

- [ ] **Step 2: Full verification run**

Run: `cd rishon3d && npm run build && npm test && npm run test:smoke`
Expected: build PASS; vitest all green; smoke 1 passed.

- [ ] **Step 3: Commit**

```bash
git add rishon3d/README.md
git commit -m "docs(rishon3d): readme + run instructions"
```

---

## Self-Review Notes

- **Spec coverage:** world/house/roads/buildings (T2,T6), walk (T7), drive (T8), walk⇄drive (T4,T9), NPCs (T7,T9), menu+pause (T9), foundations/structure (T1,T5,T6), verification strategy (T2-4 vitest, T10 smoke). All spec sections map to tasks.
- **Type consistency:** `Vec2`, `RishonMap`, `validateMap`, `Mode`, `nextMode`, `canEnter`, `Tickable`, `Physics`, `RAPIER`, `Input.justPressed/endFrame`, `FollowCamera.setTarget`, entity `enabled`/`object`/`position` are used consistently across tasks.
- **Risk note:** Rapier vehicle/character API method names can vary by version. Tasks 7-8 instruct: if a signature differs in the installed `@dimforge/rapier3d-compat`, consult the actual typings and adjust — never invent names. This is the most likely place for build friction; the smoke test (T10) is the backstop that proves it actually runs.
