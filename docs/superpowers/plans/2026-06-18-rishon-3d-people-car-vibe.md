# Rishon 3D Iteration 2 — People, Car & Vibe — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Make the spike feel alive — limbed walking people (player + wandering NPCs), a faster car with real reverse, and a golden-hour atmosphere with trees and streetlights.

**Architecture:** Same `rishon3d/` Three.js + Rapier sub-project. New pure-logic modules (`wander.ts`, the limb-animation helper) are unit-tested; visual/physics tuning is covered by the build + Playwright smoke gate. NPCs become `Tickable` entities ticked by `Game`.

**Tech Stack:** TypeScript (strict), Vite, Three.js, `@dimforge/rapier3d-compat`, vitest, Playwright.

## Global Constraints

- Only modify files under `rishon3d/`. Do not touch the root Phaser game, root configs, or `render.yaml`.
- Procedural primitives only — no downloaded assets. No emojis in committed files.
- Strict TS with `noUnusedLocals`/`noUnusedParameters` on. `npm run build` = `tsc --noEmit && vite build` must pass.
- Desktop keyboard only. Keep existing controls (W/Up accel, S/Down reverse, A/D steer, Space brake, E enter/exit, Esc pause).
- The existing 10 vitest tests and the Playwright smoke test must remain green (smoke = boots, click Start, one canvas, zero console errors; dev port 5191, swiftshader args already configured).
- Frame/update order in `main.ts` (physics.step -> game.update -> follow.update) and `input.endFrame()` being LAST in `Game.update` must be preserved.

---

### Task 1: Pure wander logic (TDD)

**Files:**
- Create: `rishon3d/src/game/wander.ts`
- Create: `rishon3d/test/wander.test.ts`

**Interfaces (Produces):**
- `import type { Vec2 } from "../world/rishonMap"` and `import type { BuildingDef } from "../world/rishonMap"`.
- `interface Rect { minX: number; maxX: number; minZ: number; maxZ: number }`
- `function moveToward(pos: Vec2, target: Vec2, maxStep: number): Vec2` — moves at most `maxStep` toward target; never overshoots (if distance <= maxStep, returns target).
- `function reachedTarget(pos: Vec2, target: Vec2, threshold: number): boolean`
- `function clampToBounds(pos: Vec2, half: number): Vec2`
- `function pickTarget(origin: Vec2, radius: number, rngAngle01: number, rngDist01: number): Vec2` — angle = rngAngle01*2PI, dist = sqrt(rngDist01)*radius (uniform disk), returned point = origin + (cos*dist, sin*dist) on x/z.
- `function buildingRects(buildings: BuildingDef[], margin: number): Rect[]` — axis-aligned rect per building expanded by margin.
- `function pointInRects(p: Vec2, rects: Rect[]): boolean`

- [ ] **Step 1: Write the failing test** `rishon3d/test/wander.test.ts`

```ts
import { describe, it, expect } from "vitest";
import {
  moveToward, reachedTarget, clampToBounds, pickTarget, buildingRects, pointInRects,
} from "../src/game/wander";
import type { BuildingDef } from "../src/world/rishonMap";

describe("wander", () => {
  it("moveToward steps toward without overshooting", () => {
    const p = moveToward({ x: 0, z: 0 }, { x: 10, z: 0 }, 3);
    expect(p.x).toBeCloseTo(3); expect(p.z).toBeCloseTo(0);
    const q = moveToward({ x: 0, z: 0 }, { x: 2, z: 0 }, 5);
    expect(q.x).toBeCloseTo(2); expect(q.z).toBeCloseTo(0); // clamped to target
  });
  it("reachedTarget respects threshold", () => {
    expect(reachedTarget({ x: 0, z: 0 }, { x: 0.3, z: 0 }, 0.5)).toBe(true);
    expect(reachedTarget({ x: 0, z: 0 }, { x: 2, z: 0 }, 0.5)).toBe(false);
  });
  it("clampToBounds keeps point inside square", () => {
    expect(clampToBounds({ x: 100, z: -100 }, 60)).toEqual({ x: 60, z: -60 });
  });
  it("pickTarget lands within radius of origin", () => {
    const o = { x: 5, z: 5 };
    for (const [a, d] of [[0, 1], [0.25, 0.5], [0.5, 0], [0.75, 1]] as const) {
      const t = pickTarget(o, 10, a, d);
      const dist = Math.hypot(t.x - o.x, t.z - o.z);
      expect(dist).toBeLessThanOrEqual(10 + 1e-9);
    }
  });
  it("buildingRects + pointInRects detect footprints with margin", () => {
    const b: BuildingDef[] = [{ id: "x", x: 0, z: 0, width: 10, depth: 10, height: 5, color: 0 }];
    const rects = buildingRects(b, 1);
    expect(pointInRects({ x: 0, z: 0 }, rects)).toBe(true);   // center
    expect(pointInRects({ x: 5.5, z: 0 }, rects)).toBe(true);  // within margin (half=5 + 1)
    expect(pointInRects({ x: 7, z: 0 }, rects)).toBe(false);   // outside
  });
});
```

- [ ] **Step 2: Run test to verify it fails** — `cd rishon3d && npx vitest run test/wander.test.ts` → FAIL (module not found).

- [ ] **Step 3: Implement** `rishon3d/src/game/wander.ts`

```ts
import type { Vec2, BuildingDef } from "../world/rishonMap";

export interface Rect { minX: number; maxX: number; minZ: number; maxZ: number }

export function moveToward(pos: Vec2, target: Vec2, maxStep: number): Vec2 {
  const dx = target.x - pos.x;
  const dz = target.z - pos.z;
  const dist = Math.hypot(dx, dz);
  if (dist <= maxStep || dist === 0) return { x: target.x, z: target.z };
  const k = maxStep / dist;
  return { x: pos.x + dx * k, z: pos.z + dz * k };
}

export function reachedTarget(pos: Vec2, target: Vec2, threshold: number): boolean {
  return Math.hypot(target.x - pos.x, target.z - pos.z) <= threshold;
}

export function clampToBounds(pos: Vec2, half: number): Vec2 {
  return {
    x: Math.max(-half, Math.min(half, pos.x)),
    z: Math.max(-half, Math.min(half, pos.z)),
  };
}

export function pickTarget(origin: Vec2, radius: number, rngAngle01: number, rngDist01: number): Vec2 {
  const angle = rngAngle01 * Math.PI * 2;
  const dist = Math.sqrt(rngDist01) * radius;
  return { x: origin.x + Math.cos(angle) * dist, z: origin.z + Math.sin(angle) * dist };
}

export function buildingRects(buildings: BuildingDef[], margin: number): Rect[] {
  return buildings.map((b) => ({
    minX: b.x - b.width / 2 - margin,
    maxX: b.x + b.width / 2 + margin,
    minZ: b.z - b.depth / 2 - margin,
    maxZ: b.z + b.depth / 2 + margin,
  }));
}

export function pointInRects(p: Vec2, rects: Rect[]): boolean {
  return rects.some((r) => p.x >= r.minX && p.x <= r.maxX && p.z >= r.minZ && p.z <= r.maxZ);
}
```

- [ ] **Step 4: Run test to verify it passes** — `cd rishon3d && npx vitest run test/wander.test.ts` → PASS (5 tests).

- [ ] **Step 5: Commit** — `git add rishon3d/src/game/wander.ts rishon3d/test/wander.test.ts && git commit -m "feat(rishon3d): pure NPC wander logic"`

---

### Task 2: Shared humanoid builder + walk animation

**Files:**
- Create: `rishon3d/src/entities/Humanoid.ts`

**Interfaces (Produces):**
- `interface HumanoidPalette { skin: number; shirt: number; pants: number }`
- `interface HumanoidLimbs { leftLeg: THREE.Object3D; rightLeg: THREE.Object3D; leftArm: THREE.Object3D; rightArm: THREE.Object3D }`
- `interface Humanoid { group: THREE.Group; limbs: HumanoidLimbs }`
- `function makeHumanoid(palette: HumanoidPalette): Humanoid` — builds a low-poly person ~1.8 units tall standing on the ground (feet at y=0, so the group's local origin is at the feet). Head (sphere, skin), torso (box, shirt), two arms (boxes, shirt) hinged at shoulders, two legs (boxes, pants) hinged at hips. Limb pivots set so rotation about X swings them forward/back (use a `THREE.Group` per limb positioned at the joint with the mesh offset downward/below the pivot). Whole group casts shadow.
- `function animateWalk(limbs: HumanoidLimbs, phase: number, intensity: number): void` — sets limb X-rotations: legs swing opposite (`leftLeg.rotation.x = sin(phase)*intensity`, right = `-sin`), arms swing opposite to legs (`leftArm = -sin*intensity*0.8`, right = `+sin*...`). `intensity` 0 = limbs at rest.

**Implementation guidance (write this file):**

```ts
import * as THREE from "three";

export interface HumanoidPalette { skin: number; shirt: number; pants: number }
export interface HumanoidLimbs {
  leftLeg: THREE.Object3D; rightLeg: THREE.Object3D;
  leftArm: THREE.Object3D; rightArm: THREE.Object3D;
}
export interface Humanoid { group: THREE.Group; limbs: HumanoidLimbs }

function limb(width: number, height: number, depth: number, color: number, jointY: number, x: number): THREE.Group {
  // pivot group at the joint; mesh hangs below the pivot so rotation.x swings the free end
  const pivot = new THREE.Group();
  pivot.position.set(x, jointY, 0);
  const mat = new THREE.MeshStandardMaterial({ color });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), mat);
  mesh.position.y = -height / 2;
  mesh.castShadow = true;
  pivot.add(mesh);
  return pivot;
}

export function makeHumanoid(palette: HumanoidPalette): Humanoid {
  const group = new THREE.Group();

  const torso = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.7, 0.28),
    new THREE.MeshStandardMaterial({ color: palette.shirt }),
  );
  torso.position.y = 1.15; torso.castShadow = true;
  group.add(torso);

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 14, 14),
    new THREE.MeshStandardMaterial({ color: palette.skin }),
  );
  head.position.y = 1.72; head.castShadow = true;
  group.add(head);

  // legs hinge at hip (y ~0.9), length 0.9 -> feet near 0
  const leftLeg = limb(0.2, 0.9, 0.22, palette.pants, 0.9, -0.14);
  const rightLeg = limb(0.2, 0.9, 0.22, palette.pants, 0.9, 0.14);
  // arms hinge at shoulder (y ~1.45), length 0.65
  const leftArm = limb(0.16, 0.65, 0.18, palette.shirt, 1.45, -0.33);
  const rightArm = limb(0.16, 0.65, 0.18, palette.shirt, 1.45, 0.33);
  group.add(leftLeg, rightLeg, leftArm, rightArm);

  return { group, limbs: { leftLeg, rightLeg, leftArm, rightArm } };
}

export function animateWalk(limbs: HumanoidLimbs, phase: number, intensity: number): void {
  const s = Math.sin(phase) * intensity;
  limbs.leftLeg.rotation.x = s;
  limbs.rightLeg.rotation.x = -s;
  limbs.leftArm.rotation.x = -s * 0.8;
  limbs.rightArm.rotation.x = s * 0.8;
}
```

- [ ] **Step 1: Create the file above.**
- [ ] **Step 2: Type-check** — `cd rishon3d && npx tsc --noEmit` → PASS.
- [ ] **Step 3: Commit** — `git add rishon3d/src/entities/Humanoid.ts && git commit -m "feat(rishon3d): shared low-poly humanoid + walk animation"`

---

### Task 3: NPC becomes a wandering, animated entity

**Files:**
- Modify: `rishon3d/src/entities/Npc.ts` (full rewrite)

**Interfaces:**
- Consumes: `makeHumanoid`/`animateWalk` (Task 2), `wander.ts` (Task 1), `Tickable`, `Vec2`, `Rect`.
- Produces: `class Npc implements Tickable` with constructor `(scene: THREE.Scene, origin: Vec2, palette: HumanoidPalette, opts: { bounds: number; rects: Rect[]; radius?: number; speed?: number })`, `object: THREE.Group`, `update(dt)`.

**Behavior:**
- Build humanoid, place at `origin`.
- State: `pos` (Vec2, starts at origin), `target` (pick a valid one at construction), `phase = 0`, `paused` timer.
- `update(dt)`:
  - If paused > 0: decrement, set `animateWalk(limbs, phase, 0)` (idle), return.
  - Compute `next = clampToBounds(moveToward(pos, target, speed*dt), bounds)`.
  - If `pointInRects(next, rects)` is true: don't step into a building — pick a new target and return (try again next frame).
  - Else set `pos = next`; advance `phase += (speed*dt) * 6` (so swing scales with distance); face heading via `object.rotation.y = atan2(dx, dz)` toward movement; `animateWalk(limbs, phase, 0.5)`.
  - If `reachedTarget(pos, target, 0.6)`: set a short pause (e.g. 0.6–1.4s) and pick a new target.
  - Sync `object.position.set(pos.x, 0, pos.z)`.
- New-target picker: try up to 12 times: `pickTarget(origin, radius, Math.random(), Math.random())`, `clampToBounds`, accept if NOT `pointInRects`; fallback to `origin`.
- Defaults: `radius = 12`, `speed = 1.6`.

**Write the file:**

```ts
import * as THREE from "three";
import type { Tickable } from "../core/Engine";
import type { Vec2 } from "../world/rishonMap";
import { makeHumanoid, animateWalk, type HumanoidPalette, type HumanoidLimbs } from "./Humanoid";
import { moveToward, reachedTarget, clampToBounds, pickTarget, pointInRects, type Rect } from "../game/wander";

interface NpcOpts { bounds: number; rects: Rect[]; radius?: number; speed?: number }

export class Npc implements Tickable {
  readonly object: THREE.Group;
  private limbs: HumanoidLimbs;
  private pos: Vec2;
  private target: Vec2;
  private phase = 0;
  private pause = 0;
  private readonly radius: number;
  private readonly speed: number;

  constructor(scene: THREE.Scene, private origin: Vec2, palette: HumanoidPalette, private opts: NpcOpts) {
    const h = makeHumanoid(palette);
    this.object = h.group;
    this.limbs = h.limbs;
    this.radius = opts.radius ?? 12;
    this.speed = opts.speed ?? 1.6;
    this.pos = { x: origin.x, z: origin.z };
    this.target = this.newTarget();
    this.object.position.set(origin.x, 0, origin.z);
    scene.add(this.object);
  }

  private newTarget(): Vec2 {
    for (let i = 0; i < 12; i++) {
      const t = clampToBounds(pickTarget(this.origin, this.radius, Math.random(), Math.random()), this.opts.bounds);
      if (!pointInRects(t, this.opts.rects)) return t;
    }
    return { x: this.origin.x, z: this.origin.z };
  }

  update(dt: number): void {
    if (this.pause > 0) {
      this.pause -= dt;
      animateWalk(this.limbs, this.phase, 0);
      return;
    }
    const step = this.speed * dt;
    const next = clampToBounds(moveToward(this.pos, this.target, step), this.opts.bounds);
    if (pointInRects(next, this.opts.rects)) {
      this.target = this.newTarget();
      animateWalk(this.limbs, this.phase, 0);
      return;
    }
    const dx = next.x - this.pos.x, dz = next.z - this.pos.z;
    if (dx !== 0 || dz !== 0) this.object.rotation.y = Math.atan2(dx, dz);
    this.pos = next;
    this.phase += step * 6;
    animateWalk(this.limbs, this.phase, 0.5);
    this.object.position.set(this.pos.x, 0, this.pos.z);
    if (reachedTarget(this.pos, this.target, 0.6)) {
      this.pause = 0.6 + Math.random() * 0.8;
      this.target = this.newTarget();
    }
  }
}
```

- [ ] **Step 1: Rewrite `Npc.ts` as above.**
- [ ] **Step 2: Type-check** — `cd rishon3d && npx tsc --noEmit`. NOTE: this will fail until `Game.ts` (Task 6) updates the `new Npc(...)` call to the new signature — that is expected; if you want a green tsc at this step, you may temporarily skip, but DO run tsc after Task 6. To keep commits green, implement Task 6 in the same wave and type-check after both. (Implementer: build Tasks 3 and 6 together, then type-check, then make the two commits.)
- [ ] **Step 3: Commit** — `git add rishon3d/src/entities/Npc.ts && git commit -m "feat(rishon3d): wandering animated NPCs"`

---

### Task 4: Player character uses humanoid + walk animation

**Files:**
- Modify: `rishon3d/src/entities/Character.ts`

**Changes (keep all physics/controller logic intact):**
- Replace the capsule+sphere visual construction (the `mesh`/`head` block adding to `this.object`) with `makeHumanoid`. Store the returned `limbs` and a `phase` field.
- Player palette: e.g. `{ skin: 0xf0c9a0, shirt: 0x2e6fb0, pants: 0x274060 }`.
- In `update`, after computing `move`: if `move.lengthSq() > 0`, advance `this.phase += SPEED * dt * 6` and call `animateWalk(this.limbs, this.phase, 0.6)`; else `animateWalk(this.limbs, this.phase, 0)` (rest). The existing `this.object.rotation.y = atan2(move.x, move.z)` stays.
- The humanoid group origin is at the feet (y=0), and the existing code does `this.object.position.set(nx, ny - 1.0, nz)`. The old capsule visual was offset to ~0.9; the humanoid stands on its origin, so keep `ny - 1.0` (the body's kinematic origin is at y~1.0, feet at ~0). Verify visually via smoke that the character is not sunk into / floating above the ground; if needed adjust the vertical offset constant only (do not change physics).

- [ ] **Step 1: Edit `Character.ts`** — add imports `import { makeHumanoid, animateWalk, type HumanoidLimbs } from "./Humanoid";`; add fields `private limbs: HumanoidLimbs;` and `private phase = 0;`; replace visual block with:
```ts
const h = makeHumanoid({ skin: 0xf0c9a0, shirt: 0x2e6fb0, pants: 0x274060 });
this.object.add(h.group);
this.limbs = h.limbs;
```
(Keep `this.object.position.set(spawn.x, 0, spawn.z); scene.add(this.object);`.)
- [ ] **Step 2: In `update`,** replace the movement-rotation branch so it also animates:
```ts
if (move.lengthSq() > 0) {
  move.normalize().multiplyScalar(SPEED * dt);
  desired = { x: move.x, y: gravityDy, z: move.z };
  this.object.rotation.y = Math.atan2(move.x, move.z);
  this.phase += SPEED * dt * 6;
  animateWalk(this.limbs, this.phase, 0.6);
} else {
  animateWalk(this.limbs, this.phase, 0);
}
```
- [ ] **Step 3: Type-check** — `cd rishon3d && npx tsc --noEmit` → PASS.
- [ ] **Step 4: Commit** — `git add rishon3d/src/entities/Character.ts && git commit -m "feat(rishon3d): player uses humanoid + walk animation"`

---

### Task 5: Car tuning — faster + real reverse

**Files:**
- Modify: `rishon3d/src/entities/Car.ts`

**Changes:**
- Raise `ENGINE_FORCE` from `28` to `65`.
- Change reverse: `engine = -ENGINE_FORCE * 0.7` (was 0.6) so reverse is usable.
- Grip (only if API exists): after `addWheel(...)` in the wheel loop, if `setWheelFrictionSlip` exists on the vehicle controller (check `node_modules/@dimforge/rapier3d-compat` typings), call `this.vehicle.setWheelFrictionSlip(idx, 2.0)` for stability at higher speed. If the method does not exist, skip it and note in the report.
- Do not change steering, wheel layout, mesh sync, or the brake.

- [ ] **Step 1: Edit constants and reverse line.**
- [ ] **Step 2: Check typings for `setWheelFrictionSlip`;** add the per-wheel call inside the existing wheel loop if present.
- [ ] **Step 3: Type-check** — `cd rishon3d && npx tsc --noEmit` → PASS.
- [ ] **Step 4: Commit** — `git add rishon3d/src/entities/Car.ts && git commit -m "feat(rishon3d): faster car + stronger reverse"`

---

### Task 6: Map data (props + more NPCs) and Game/World wiring

**Files:**
- Modify: `rishon3d/src/world/rishonMap.ts`
- Create: `rishon3d/src/world/props.ts`
- Modify: `rishon3d/src/world/World.ts`
- Modify: `rishon3d/src/game/Game.ts`
- Modify: `rishon3d/test/rishonMap.test.ts` (only if spawn/props counts change an asserted number)

**6a. `rishonMap.ts`:** add prop types + data, more NPC spawns.

- Add interface:
```ts
export type PropKind = "tree" | "streetlight";
export interface PropDef { id: string; kind: PropKind; x: number; z: number }
```
- Add `props: PropDef[]` to the `RishonMap` interface.
- Add a `props` array to `RISHON_MAP` (about 10–14 items: trees scattered in open areas away from building footprints, streetlights near the two roads). Example values (place clear of buildings):
```ts
props: [
  { id: "t1", kind: "tree", x: 10, z: -4 }, { id: "t2", kind: "tree", x: -10, z: 2 },
  { id: "t3", kind: "tree", x: 24, z: -2 }, { id: "t4", kind: "tree", x: -26, z: 10 },
  { id: "t5", kind: "tree", x: 2, z: 22 }, { id: "t6", kind: "tree", x: -2, z: -22 },
  { id: "t7", kind: "tree", x: 22, z: 20 }, { id: "t8", kind: "tree", x: -22, z: -22 },
  { id: "l1", kind: "streetlight", x: 4, z: -8 }, { id: "l2", kind: "streetlight", x: -4, z: 8 },
  { id: "l3", kind: "streetlight", x: 4, z: 20 }, { id: "l4", kind: "streetlight", x: -4, z: -20 },
  { id: "l5", kind: "streetlight", x: 20, z: -4 }, { id: "l6", kind: "streetlight", x: -20, z: 4 },
],
```
- Expand `npcSpawns` to 6:
```ts
npcSpawns: [
  { x: 8, z: 6 }, { x: -6, z: 4 }, { x: 4, z: -10 },
  { x: -12, z: -4 }, { x: 12, z: 10 }, { x: -2, z: 16 },
],
```
- Extend `validateMap` to also check each prop is in bounds (same `inBounds` helper), appending `prop <id> out of bounds`.

**6b. `props.ts`:** builders.
```ts
import * as THREE from "three";
import type { PropDef } from "./rishonMap";

export function makeTree(def: PropDef): THREE.Object3D {
  const g = new THREE.Group();
  g.position.set(def.x, 0, def.z);
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.24, 1.4, 8),
    new THREE.MeshStandardMaterial({ color: 0x6b4a2b }),
  );
  trunk.position.y = 0.7; trunk.castShadow = true;
  const foliage = new THREE.Mesh(
    new THREE.ConeGeometry(1.1, 2.2, 9),
    new THREE.MeshStandardMaterial({ color: 0x3f7d3a }),
  );
  foliage.position.y = 2.2; foliage.castShadow = true;
  g.add(trunk, foliage);
  return g;
}

export function makeStreetLight(def: PropDef): THREE.Object3D {
  const g = new THREE.Group();
  g.position.set(def.x, 0, def.z);
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.1, 3.4, 8),
    new THREE.MeshStandardMaterial({ color: 0x2b2b30 }),
  );
  pole.position.y = 1.7; pole.castShadow = true;
  const lamp = new THREE.Mesh(
    new THREE.BoxGeometry(0.4, 0.18, 0.4),
    new THREE.MeshStandardMaterial({ color: 0xffd98a, emissive: 0xffb24d, emissiveIntensity: 1.2 }),
  );
  lamp.position.y = 3.5;
  g.add(pole, lamp);
  return g;
}
```

**6c. `World.ts`:** build props after buildings. Add inside the constructor (after the buildings loop):
```ts
import { makeTree, makeStreetLight } from "./props";
// ...
let lightBudget = 6;
for (const p of map.props) {
  if (p.kind === "tree") scene.add(makeTree(p));
  else {
    const sl = makeStreetLight(p);
    scene.add(sl);
    if (lightBudget-- > 0) {
      const glow = new THREE.PointLight(0xffb24d, 8, 16, 2);
      glow.position.set(p.x, 3.4, p.z);
      scene.add(glow);
    }
  }
}
```
(Keep everything else in World.ts unchanged. `map.buildings` is already accessible via `this.map`.)

**6d. `Game.ts`:** construct NPCs with the new signature and tick them.
- Add imports: `import { buildingRects } from "./wander";`
- Replace the NPC construction block and add an `npcs` field + ticking:
```ts
private npcs: Npc[] = [];
// in constructor, replace the forEach line:
const rects = buildingRects(world.map.buildings, 1.5);
const bounds = world.map.ground.size / 2 - 2;
const palettes = [
  { skin: 0xe8b98a, shirt: 0x9b59b6, pants: 0x40313f },
  { skin: 0xf0c9a0, shirt: 0x27ae60, pants: 0x1e5c3a },
  { skin: 0xd9a066, shirt: 0xe67e22, pants: 0x7a431a },
  { skin: 0xf2d2b6, shirt: 0x2980b9, pants: 0x1f3f57 },
  { skin: 0xe8b98a, shirt: 0xc0392b, pants: 0x5a1f1a },
  { skin: 0xf0c9a0, shirt: 0xf1c40f, pants: 0x6b5a12 },
];
world.npcSpawns.forEach((s, i) => {
  this.npcs.push(new Npc(scene, s, palettes[i % palettes.length], { bounds, rects }));
});
// in update(), tick NPCs (before input.endFrame()):
for (const n of this.npcs) n.update(dt);
```
- Keep the existing `Npc` import; it now resolves to the new class.

- [ ] **Step 1: Edit `rishonMap.ts`** (PropDef/PropKind, `props` field + data, 6 npcSpawns, validateMap prop check).
- [ ] **Step 2: Create `props.ts`.**
- [ ] **Step 3: Edit `World.ts`** to build props + capped point lights.
- [ ] **Step 4: Edit `Game.ts`** for new NPC construction + per-frame ticking.
- [ ] **Step 5: Update `test/rishonMap.test.ts`** ONLY if an assertion hard-codes a count that changed. The Iteration 1 tests assert "exactly one house", "unique ids", and spawn-in-bounds (loops over npcSpawns) — those still hold. If you add a props-bounds assertion, keep it consistent. Do not weaken existing assertions.
- [ ] **Step 6: Type-check + run unit tests** — `cd rishon3d && npx tsc --noEmit && npx vitest run` → tsc clean; all suites green (the original 10 + new wander 5 = 15).
- [ ] **Step 7: Commit** — `git add rishon3d/src/world/rishonMap.ts rishon3d/src/world/props.ts rishon3d/src/world/World.ts rishon3d/src/game/Game.ts rishon3d/test/rishonMap.test.ts && git commit -m "feat(rishon3d): props, more NPCs, world+game wiring"`

> Implementer note: Tasks 3 and 6 are interdependent (the `Npc` signature change and its caller). Implement Task 3's file and Task 6's edits in the same wave, then type-check once, then make the separate commits in order (Task 3 commit, then Task 6 commit) so history stays clean. Task 4 (Character) and Task 5 (Car) are independent and can be done before or after.

---

### Task 7: Golden-hour vibe lighting

**Files:**
- Modify: `rishon3d/src/core/Engine.ts`

**Changes (only the scene/light/fog setup in the constructor):**
- Background + fog to warm haze (matched so distance blends):
```ts
const haze = new THREE.Color(0xe7c9a0);
this.scene.background = haze;
this.scene.fog = new THREE.Fog(haze, 55, 190);
```
- Hemisphere warmer/softer: `new THREE.HemisphereLight(0xffe6c2, 0x4a4036, 0.7)`.
- Directional sun warm + lower for long shadows:
```ts
const sun = new THREE.DirectionalLight(0xffd2a1, 2.2);
sun.position.set(38, 26, 16);
```
(Keep the existing `castShadow`, `shadow.mapSize`, and shadow-camera bounds.)
- Optionally add a faint cool ambient to avoid crushed shadows: `this.scene.add(new THREE.AmbientLight(0x335066, 0.25));`

- [ ] **Step 1: Apply the lighting/fog/background edits.**
- [ ] **Step 2: Type-check** — `cd rishon3d && npx tsc --noEmit` → PASS.
- [ ] **Step 3: Commit** — `git add rishon3d/src/core/Engine.ts && git commit -m "feat(rishon3d): golden-hour lighting and warm haze"`

---

### Task 8: Full verification + HUD hint refresh

**Files:**
- Modify: `rishon3d/src/main.ts` (HUD hint text only — mention Space brake)

**Changes:**
- Update the hint line to reflect controls: `hud.setHint("WASD / Arrows move - Space brake - E enter/exit - Esc pause");`

- [ ] **Step 1: Edit the hint text in `main.ts`.**
- [ ] **Step 2: Full gate:**
  - `cd rishon3d && npm run build` → tsc clean + vite dist/.
  - `cd rishon3d && npm test` → all vitest green (15 tests).
  - `cd rishon3d && npm run test:smoke` → 1 passed, zero console errors.
- [ ] **Step 3: Commit** — `git add rishon3d/src/main.ts && git commit -m "chore(rishon3d): update HUD hint; iteration 2 verification"`

---

## Self-Review Notes

- **Spec coverage:** People → Tasks 2,3,4 (humanoid + animation, wandering NPCs, player upgrade). Car → Task 5 (faster + reverse). Vibe → Tasks 6 (props/more NPCs) + 7 (golden-hour). Pure-logic tests → Task 1. Verification → Task 8.
- **Type consistency:** `Vec2`, `BuildingDef`, `PropDef`/`PropKind`, `Rect`, `HumanoidPalette`/`HumanoidLimbs`/`Humanoid`, `makeHumanoid`/`animateWalk`, `Tickable`, and the new `Npc(scene, origin, palette, opts)` signature are used consistently across Tasks 1-6. The `Npc` signature change and its single caller (`Game.ts`) are explicitly sequenced together (Task 3 + Task 6 same wave).
- **Risk:** `setWheelFrictionSlip` may not exist in the installed Rapier build — Task 5 makes it conditional and logged, not assumed. Vertical offset of the humanoid vs the old capsule (Task 4) is the one visual thing to confirm via smoke/screenshot; only a render offset, never physics, may be adjusted.
- **Green-commit ordering:** Task 3 leaves tsc red until Task 6; the implementer note instructs building 3+6 in one wave and type-checking after, so no broken-build commit is verified as green in isolation. Acceptable because the two commits land back-to-back in the same wave.
