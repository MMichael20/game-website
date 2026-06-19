# Rishon3D Call-a-Taxi Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`).

**Goal:** Press T (on foot) to summon a taxi that drives to you; press E to ride; it drives you to the town center and drops you off.

**Architecture:** Pure phase machine + movement helper (`taxi.ts`, TDD'd); a kinematic `Taxi` entity; `Game` orchestrates the phases and gates against the own-car mode machine. No physics collider, no change to tested `InteractionSystem`/`pathFollow`.

**Tech Stack:** TypeScript, Three.js 0.169, Vite, Vitest, Playwright.

## Global Constraints
- All in `rishon3d/`. tsconfig strict+noUnusedLocals+noUnusedParameters.
- Reuse `turnToward` (pathFollow), `safeExitPosition` (game/exit), `getGeometry`/`getMaterial` (world/assets), `Vec2` (world/rishonMap). Taxi is decorative — NO Rapier body/collider.
- Commit per task; messages end with:
  `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`

---

### Task 1: Taxi phase machine + movement (`src/game/taxi.ts`)

**Files:** Create `rishon3d/src/game/taxi.ts`, `rishon3d/test/taxi.test.ts`

**Interfaces:**
- `type TaxiPhase = "idle" | "toPickup" | "waiting" | "toDropoff"`
- `type TaxiEvent = "call" | "arrivedPickup" | "ride" | "arrivedDropoff"`
- `nextTaxiPhase(phase: TaxiPhase, event: TaxiEvent): TaxiPhase`
- `stepToward(pos: Vec2, heading: number, target: Vec2, speed: number, dt: number, turnRate: number): { pos: Vec2; heading: number; arrived: boolean }`

- [ ] **Step 1: Write the failing test** — create `rishon3d/test/taxi.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { nextTaxiPhase, stepToward } from "../src/game/taxi";

describe("nextTaxiPhase", () => {
  it("advances through the ride loop", () => {
    expect(nextTaxiPhase("idle", "call")).toBe("toPickup");
    expect(nextTaxiPhase("toPickup", "arrivedPickup")).toBe("waiting");
    expect(nextTaxiPhase("waiting", "ride")).toBe("toDropoff");
    expect(nextTaxiPhase("toDropoff", "arrivedDropoff")).toBe("idle");
  });
  it("ignores irrelevant events (stays in phase)", () => {
    expect(nextTaxiPhase("idle", "ride")).toBe("idle");
    expect(nextTaxiPhase("toPickup", "call")).toBe("toPickup");
    expect(nextTaxiPhase("toDropoff", "call")).toBe("toDropoff");
  });
});

describe("stepToward", () => {
  it("moves toward the target and is not yet arrived when far", () => {
    const r = stepToward({ x: 0, z: 0 }, 0, { x: 0, z: 10 }, 5, 0.1, 3);
    expect(r.arrived).toBe(false);
    expect(r.pos.z).toBeGreaterThan(0); // moved toward +z
  });
  it("reports arrived and holds position within the arrive radius", () => {
    const r = stepToward({ x: 0, z: 0 }, 0, { x: 0, z: 1 }, 5, 0.1, 3);
    expect(r.arrived).toBe(true);
    expect(r.pos).toEqual({ x: 0, z: 0 });
  });
  it("never overshoots the target in one step", () => {
    const r = stepToward({ x: 0, z: 0 }, 0, { x: 0, z: 4 }, 100, 1, 100);
    expect(r.pos.z).toBeLessThanOrEqual(4 + 1e-9);
  });
});
```

- [ ] **Step 2: Run to verify it fails** — `cd rishon3d && npx vitest run test/taxi.test.ts` → FAIL (module missing).

- [ ] **Step 3: Implement** — create `rishon3d/src/game/taxi.ts`:

```ts
import type { Vec2 } from "../world/rishonMap";
import { turnToward } from "./pathFollow";

export type TaxiPhase = "idle" | "toPickup" | "waiting" | "toDropoff";
export type TaxiEvent = "call" | "arrivedPickup" | "ride" | "arrivedDropoff";

// Ride loop: idle --call--> toPickup --arrivedPickup--> waiting --ride--> toDropoff --arrivedDropoff--> idle.
export function nextTaxiPhase(phase: TaxiPhase, event: TaxiEvent): TaxiPhase {
  switch (phase) {
    case "idle": return event === "call" ? "toPickup" : "idle";
    case "toPickup": return event === "arrivedPickup" ? "waiting" : "toPickup";
    case "waiting": return event === "ride" ? "toDropoff" : "waiting";
    case "toDropoff": return event === "arrivedDropoff" ? "idle" : "toDropoff";
  }
}

const ARRIVE_RADIUS = 2.5;

// Kinematic step toward a target (same heading convention as pathFollow:
// x = sin(heading), z = cos(heading)). Eases heading, never overshoots.
export function stepToward(
  pos: Vec2, heading: number, target: Vec2, speed: number, dt: number, turnRate: number,
): { pos: Vec2; heading: number; arrived: boolean } {
  const dx = target.x - pos.x;
  const dz = target.z - pos.z;
  const dist = Math.hypot(dx, dz);
  if (dist <= ARRIVE_RADIUS) return { pos, heading, arrived: true };
  const desired = Math.atan2(dx, dz);
  const h = turnToward(heading, desired, turnRate * dt);
  const step = Math.min(speed * dt, dist);
  return { pos: { x: pos.x + Math.sin(h) * step, z: pos.z + Math.cos(h) * step }, heading: h, arrived: false };
}
```

- [ ] **Step 4: Run to verify it passes** — `cd rishon3d && npx vitest run test/taxi.test.ts` → PASS.

- [ ] **Step 5: Commit**

```bash
git add rishon3d/src/game/taxi.ts rishon3d/test/taxi.test.ts
git commit -m "feat(rishon3d): taxi phase machine + kinematic step helper

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Taxi entity (`src/entities/Taxi.ts`)

**Files:** Create `rishon3d/src/entities/Taxi.ts`

**Interfaces:**
- `class Taxi` — `constructor(scene: THREE.Scene)`; `readonly object: THREE.Group`; `get position(): Vec2`; `spawnAt(p: Vec2): void`; `setVisible(v: boolean): void`; `driveTo(target: Vec2, dt: number): boolean` (returns `arrived`).

No unit test (Three.js); verified by build + smoke in Task 3.

- [ ] **Step 1: Create the file** — `rishon3d/src/entities/Taxi.ts`:

```ts
import * as THREE from "three";
import type { Vec2 } from "../world/rishonMap";
import { stepToward } from "../game/taxi";
import { getGeometry, getMaterial } from "../world/assets";

const CAR_Y = 0.5;
const SPEED = 11;
const TURN = 2.6;

// A hailable yellow taxi. Kinematic + decorative (no physics body); Game drives
// it toward a target each frame via driveTo().
export class Taxi {
  readonly object = new THREE.Group();
  private pos: Vec2 = { x: 0, z: 0 };
  private heading = 0;

  constructor(scene: THREE.Scene) {
    const body = new THREE.Mesh(
      getGeometry("npcCarBody", () => new THREE.BoxGeometry(1.7, 0.6, 3.4)),
      getMaterial("taxiBodyMat", () => new THREE.MeshStandardMaterial({ color: 0xf2c200, metalness: 0.3, roughness: 0.5 })),
    );
    body.position.y = CAR_Y;
    body.castShadow = true;
    const cabin = new THREE.Mesh(
      getGeometry("npcCarCabin", () => new THREE.BoxGeometry(1.4, 0.5, 1.6)),
      getMaterial("taxiCabinMat", () => new THREE.MeshStandardMaterial({ color: 0x222831 })),
    );
    cabin.position.set(0, CAR_Y + 0.5, -0.2);
    this.object.add(body, cabin);
    this.object.visible = false;
    scene.add(this.object);
  }

  get position(): Vec2 { return this.pos; }

  spawnAt(p: Vec2): void {
    this.pos = { x: p.x, z: p.z };
    this.heading = 0;
    this.object.position.set(p.x, 0, p.z);
    this.object.rotation.y = 0;
    this.object.visible = true;
  }

  setVisible(v: boolean): void { this.object.visible = v; }

  driveTo(target: Vec2, dt: number): boolean {
    const r = stepToward(this.pos, this.heading, target, SPEED, dt, TURN);
    this.pos = r.pos;
    this.heading = r.heading;
    this.object.position.set(r.pos.x, 0, r.pos.z);
    this.object.rotation.y = r.heading;
    return r.arrived;
  }
}
```

- [ ] **Step 2: Type-check** — `cd rishon3d && npm run build` → PASS (Taxi is an unused export until Task 3; that does not fail `noUnusedLocals`).

- [ ] **Step 3: Commit**

```bash
git add rishon3d/src/entities/Taxi.ts
git commit -m "feat(rishon3d): yellow taxi entity (kinematic, decorative)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Wire the taxi into the game (`src/game/Game.ts`, `src/main.ts`)

**Files:** Modify `rishon3d/src/game/Game.ts`, `rishon3d/src/main.ts`

**Interfaces:** Consumes `Taxi` (Task 2), `nextTaxiPhase`/`TaxiPhase` (Task 1), `safeExitPosition`.

No unit test (integration); verified by full gate + a browser screenshot of the taxi en route.

- [ ] **Step 1: Add imports + fields in `Game.ts`**

After `import { formatSpeed } from "../ui/format";` (added in a prior build), add:

```ts
import { Taxi } from "../entities/Taxi";
import { nextTaxiPhase, type TaxiPhase } from "./taxi";
```

Add fields beside the existing private fields (after `private bounds: number;`):

```ts
  private taxi: Taxi;
  private taxiPhase: TaxiPhase = "idle";
  private pickup = { x: 0, z: 0 };
  private dropoff = { x: 0, z: 0 };
```

- [ ] **Step 2: Construct the taxi**

In the constructor, after `this.bounds = bounds;` (added in a prior build), add:

```ts
    this.taxi = new Taxi(scene);
    this.dropoff = { x: world.playerSpawn.x, z: world.playerSpawn.z };
```

- [ ] **Step 3: Replace the `update` method body**

Replace the entire `update(dt: number)` method with this version (it adds taxi handling and gates the own-car logic while riding; the own-car transition + prompt logic is preserved):

```ts
  update(dt: number): void {
    const ePressed = this.input.justPressed("KeyE");
    const tPressed = this.input.justPressed("KeyT");
    const pPos = { x: this.character.position.x, z: this.character.position.z };
    const cPos = { x: this.car.position.x, z: this.car.position.z };

    // --- Taxi phase machine ---
    let taxiConsumedE = false;
    if (this.taxiPhase === "idle") {
      if (tPressed && this.mode === "onFoot") {
        this.taxiPhase = nextTaxiPhase("idle", "call");
        this.pickup = { x: pPos.x, z: pPos.z };
        this.taxi.spawnAt({ x: pPos.x + 25, z: pPos.z });
      }
    } else if (this.taxiPhase === "toPickup") {
      if (this.taxi.driveTo(this.pickup, dt)) this.taxiPhase = nextTaxiPhase("toPickup", "arrivedPickup");
    } else if (this.taxiPhase === "waiting") {
      const near = Math.hypot(pPos.x - this.taxi.position.x, pPos.z - this.taxi.position.z) <= 4.5;
      if (ePressed && near && this.mode === "onFoot") {
        this.taxiPhase = nextTaxiPhase("waiting", "ride");
        taxiConsumedE = true;
        this.character.enabled = false;
        this.character.object.visible = false;
        this.follow.setTarget(this.taxi.object, 12, 1.6);
      }
    } else if (this.taxiPhase === "toDropoff") {
      if (this.taxi.driveTo(this.dropoff, dt)) {
        this.taxiPhase = nextTaxiPhase("toDropoff", "arrivedDropoff");
        const exit = safeExitPosition(this.taxi.position, this.rects, this.bounds);
        this.character.setPosition(exit.x, exit.z);
        this.character.object.visible = true;
        this.character.enabled = true;
        this.follow.setTarget(this.character.object, 10, 1.6);
        this.taxi.setVisible(false);
      }
    }
    const riding = this.taxiPhase === "toDropoff";

    // --- Own car enter/exit (suppressed while riding a taxi or when E was consumed) ---
    const eForCar = ePressed && !taxiConsumedE && !riding;
    const newMode = nextMode(this.mode, eForCar, pPos, cPos, ENTER_RADIUS);
    if (!riding && newMode !== this.mode) {
      this.mode = newMode;
      if (this.mode === "driving") {
        this.character.enabled = false;
        this.character.object.visible = false;
        this.car.enabled = true;
        this.follow.setTarget(this.car.object, 11, 1.4);
      } else {
        this.car.enabled = false;
        const exit = safeExitPosition(cPos, this.rects, this.bounds);
        this.character.setPosition(exit.x, exit.z);
        this.character.object.visible = true;
        this.character.enabled = true;
        this.follow.setTarget(this.character.object, 10, 1.6);
      }
    }

    // --- HUD prompt ---
    if (this.taxiPhase === "toPickup") {
      this.hud.setPrompt("Taxi arriving...");
    } else if (this.taxiPhase === "waiting") {
      this.hud.setPrompt("Press E to ride");
    } else if (this.taxiPhase === "toDropoff") {
      this.hud.setPrompt("Riding...");
    } else if (this.mode === "onFoot" && canEnter("onFoot", pPos, cPos, ENTER_RADIUS)) {
      this.hud.setPrompt("Press E to drive");
    } else if (this.mode === "driving") {
      this.hud.setPrompt("Press E to exit");
    } else if (this.mode === "onFoot") {
      this.hud.setPrompt("Press T for taxi");
    } else {
      this.hud.setPrompt(null);
    }

    this.character.update(dt);
    this.car.update(dt);
    this.entities.update(dt);
    this.minimap.update(pPos, cPos, this.mode);
    this.hud.setSpeed(this.mode === "driving" ? formatSpeed(this.car.speed) : null);
    this.input.endFrame();
  }
```

- [ ] **Step 4: Update the standing hint in `main.ts`**

Change the `hud.setHint(...)` line to include the taxi key:

```ts
  hud.setHint("WASD / Arrows move - Mouse look - E enter/exit - T taxi - M map - Esc pause");
```

- [ ] **Step 5: Full gate**

Run: `cd rishon3d && npm run test && npm run build && npm run test:smoke`
Expected: PASS — all suites green (incl. new taxi tests), tsc + vite clean, smoke (2 canvases + WebGL) green.

- [ ] **Step 6: Commit**

```bash
git add rishon3d/src/game/Game.ts rishon3d/src/main.ts
git commit -m "feat(rishon3d): wire call-a-taxi ride flow into the game

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Final verification
- [ ] `cd rishon3d && npm run test` — all green incl. `taxi.test.ts`.
- [ ] `cd rishon3d && npm run build` + `npm run test:smoke` — green.
- [ ] Browser: press T on foot → taxi drives in; prompt cycles "Taxi arriving…" → "Press E to ride" → "Riding…" → dropped off.

## Self-Review
- **Spec coverage:** Unit 1 → Task 1; Unit 2 → Task 2; Unit 3 → Task 3. Phases/events/gating per D1-D5.
- **Placeholder scan:** none.
- **Type consistency:** `nextTaxiPhase(phase, event)`, `stepToward(...)`, `Taxi.driveTo/spawnAt/setVisible/position`, `safeExitPosition`, `nextMode`/`canEnter` used with their real signatures. `riding` gates `nextMode`; `taxiConsumedE` prevents E double-handling. Heading convention (sin x / cos z) matches `pathFollow`.
