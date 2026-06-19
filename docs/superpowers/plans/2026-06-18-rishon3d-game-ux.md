# Rishon3D Game UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a polished main/title screen, a cleaner HUD with a live speedometer, a 2D minimap (toggle with M), and targeted car drive fixes (speed readout, reverse cap, safe exit) to rishon3d.

**Architecture:** Pure math/logic modules (`minimapMath`, `exit`, `format`) are TDD'd under vitest with no DOM/WebGL. DOM/canvas UI (`Minimap`, `Hud`, `Menu`) and the Three.js `Car` edit are thin and verified by `tsc`/`vite build` + the Playwright smoke test, matching the repo convention that UI/entity classes are not unit-tested. `Game` orchestrates: each frame it feeds player/car position + mode to the minimap and speedometer.

**Tech Stack:** TypeScript, Three.js 0.169, Rapier 3D, Vite, Vitest, Playwright.

## Global Constraints

- All work is inside the `rishon3d/` subfolder. Run npm/test/build commands from `rishon3d/`.
- `tsconfig.json` has `strict`, `noUnusedLocals`, `noUnusedParameters` all `true` — remove imports/params as soon as they go unused or `npm run build` fails.
- No new dependencies. No audio. Do not modify the tested `InteractionSystem`, `pathFollow`, `wander`, or `cameraMath` modules' existing behavior.
- World materials stay `MeshStandardMaterial`. The minimap is a 2D `<canvas>` overlay, not a Three.js camera.
- Building-rect shape is `Rect { minX; maxX; minZ; maxZ }` from `src/game/wander.ts`; reuse `pointInRects(p, rects)` from there.
- Single-test run: `npx vitest run test/<file>.test.ts`. Full gate: `npm run test`, then `npm run build`, then `npm run test:smoke`.
- Commit after each task. End commit messages with:
  `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`

---

### Task 1: Minimap projection math (`src/ui/minimapMath.ts`)

**Files:**
- Create: `rishon3d/src/ui/minimapMath.ts`
- Test: `rishon3d/test/minimapMath.test.ts`

**Interfaces:**
- Produces:
  - `interface MiniPoint { x: number; y: number }`, `interface MiniRect { x: number; y: number; w: number; h: number }`
  - `worldToMinimap(wx: number, wz: number, worldSize: number, mapPx: number): MiniPoint` — world XZ (span `[-worldSize/2, +worldSize/2]`) → pixel `[0, mapPx]`; world `+z` maps downward.
  - `worldRectToMinimap(cx: number, cz: number, w: number, d: number, worldSize: number, mapPx: number): MiniRect` — centered world footprint → top-left pixel rect + pixel size.

- [ ] **Step 1: Write the failing test**

Create `rishon3d/test/minimapMath.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { worldToMinimap, worldRectToMinimap } from "../src/ui/minimapMath";

describe("worldToMinimap", () => {
  it("maps world center to minimap center", () => {
    expect(worldToMinimap(0, 0, 280, 180)).toEqual({ x: 90, y: 90 });
  });
  it("maps the -/- world corner to (0,0)", () => {
    expect(worldToMinimap(-140, -140, 280, 180)).toEqual({ x: 0, y: 0 });
  });
  it("maps the +/+ world corner to (mapPx, mapPx)", () => {
    expect(worldToMinimap(140, 140, 280, 180)).toEqual({ x: 180, y: 180 });
  });
  it("maps world +z downward (larger y)", () => {
    expect(worldToMinimap(0, 70, 280, 180).y).toBeGreaterThan(90);
  });
});

describe("worldRectToMinimap", () => {
  it("returns the top-left corner and scaled size", () => {
    const r = worldRectToMinimap(0, 0, 28, 28, 280, 180);
    // half-extent 14 world units => 9 px; centered => tl at 90-9=81
    expect(r.x).toBeCloseTo(81, 5);
    expect(r.y).toBeCloseTo(81, 5);
    expect(r.w).toBeCloseTo(18, 5);
    expect(r.h).toBeCloseTo(18, 5);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd rishon3d && npx vitest run test/minimapMath.test.ts`
Expected: FAIL — cannot resolve `../src/ui/minimapMath`.

- [ ] **Step 3: Write minimal implementation**

Create `rishon3d/src/ui/minimapMath.ts`:

```ts
export interface MiniPoint { x: number; y: number }
export interface MiniRect { x: number; y: number; w: number; h: number }

// World XZ spans [-worldSize/2, +worldSize/2]; minimap pixel space is [0, mapPx].
// World +z maps downward on the minimap (screen-natural).
export function worldToMinimap(wx: number, wz: number, worldSize: number, mapPx: number): MiniPoint {
  const half = worldSize / 2;
  return {
    x: ((wx + half) / worldSize) * mapPx,
    y: ((wz + half) / worldSize) * mapPx,
  };
}

// A centered world footprint (cx,cz,w,d) as a top-left pixel rect + pixel size.
export function worldRectToMinimap(
  cx: number, cz: number, w: number, d: number, worldSize: number, mapPx: number,
): MiniRect {
  const tl = worldToMinimap(cx - w / 2, cz - d / 2, worldSize, mapPx);
  const scale = mapPx / worldSize;
  return { x: tl.x, y: tl.y, w: w * scale, h: d * scale };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd rishon3d && npx vitest run test/minimapMath.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add rishon3d/src/ui/minimapMath.ts rishon3d/test/minimapMath.test.ts
git commit -m "feat(rishon3d): minimap world-to-pixel projection math

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Safe car-exit position (`src/game/exit.ts`)

**Files:**
- Create: `rishon3d/src/game/exit.ts`
- Test: `rishon3d/test/exit.test.ts`

**Interfaces:**
- Consumes: `Vec2` from `../world/rishonMap`; `Rect` + `pointInRects` from `./wander`.
- Produces: `safeExitPosition(car: Vec2, rects: Rect[], bounds: number): Vec2` — a spot beside the car that is within `[-bounds, bounds]` on both axes and not inside any rect; falls back to the car position if all candidates are blocked.

- [ ] **Step 1: Write the failing test**

Create `rishon3d/test/exit.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { safeExitPosition } from "../src/game/exit";
import type { Rect } from "../src/game/wander";

describe("safeExitPosition", () => {
  it("drops beside the car when nothing blocks", () => {
    const p = safeExitPosition({ x: 0, z: 0 }, [], 140);
    expect(Math.hypot(p.x - 0, p.z - 0)).toBeGreaterThan(0); // moved off the car
    expect(Math.abs(p.x)).toBeLessThanOrEqual(140);
    expect(Math.abs(p.z)).toBeLessThanOrEqual(140);
  });

  it("avoids a building rect overlapping the default offset", () => {
    // Block the +x side; expect a different, clear side.
    const rects: Rect[] = [{ minX: 1, maxX: 4, minZ: -2, maxZ: 2 }];
    const p = safeExitPosition({ x: 0, z: 0 }, rects, 140);
    const inBlocked = p.x >= 1 && p.x <= 4 && p.z >= -2 && p.z <= 2;
    expect(inBlocked).toBe(false);
  });

  it("falls back to the car position when fully boxed in", () => {
    const rects: Rect[] = [{ minX: -5, maxX: 5, minZ: -5, maxZ: 5 }];
    const p = safeExitPosition({ x: 0, z: 0 }, rects, 140);
    expect(p).toEqual({ x: 0, z: 0 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd rishon3d && npx vitest run test/exit.test.ts`
Expected: FAIL — cannot resolve `../src/game/exit`.

- [ ] **Step 3: Write minimal implementation**

Create `rishon3d/src/game/exit.ts`:

```ts
import type { Vec2 } from "../world/rishonMap";
import { type Rect, pointInRects } from "./wander";

// Pick a spot beside the car to drop the player: inside bounds and clear of every
// building rect. Probes a few offsets around the car; falls back to the car
// position if all are blocked. Pure and deterministic.
export function safeExitPosition(car: Vec2, rects: Rect[], bounds: number): Vec2 {
  const offsets: Vec2[] = [
    { x: 2.5, z: 0 }, { x: -2.5, z: 0 },
    { x: 0, z: 2.5 }, { x: 0, z: -2.5 },
    { x: 2.5, z: 2.5 }, { x: -2.5, z: -2.5 },
  ];
  for (const o of offsets) {
    const p = { x: car.x + o.x, z: car.z + o.z };
    if (Math.abs(p.x) <= bounds && Math.abs(p.z) <= bounds && !pointInRects(p, rects)) return p;
  }
  return { x: car.x, z: car.z };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd rishon3d && npx vitest run test/exit.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add rishon3d/src/game/exit.ts rishon3d/test/exit.test.ts
git commit -m "feat(rishon3d): safe car-exit position avoiding buildings

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: HUD speed formatting (`src/ui/format.ts`)

**Files:**
- Create: `rishon3d/src/ui/format.ts`
- Test: `rishon3d/test/format.test.ts`

**Interfaces:**
- Produces: `formatSpeed(metersPerSec: number): string` — `"<n> km/h"`, rounded, non-negative, NaN-safe.

- [ ] **Step 1: Write the failing test**

Create `rishon3d/test/format.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { formatSpeed } from "../src/ui/format";

describe("formatSpeed", () => {
  it("converts m/s to rounded km/h", () => {
    expect(formatSpeed(10)).toBe("36 km/h");
  });
  it("shows zero at rest", () => {
    expect(formatSpeed(0)).toBe("0 km/h");
  });
  it("clamps negative speed to zero", () => {
    expect(formatSpeed(-5)).toBe("0 km/h");
  });
  it("guards NaN to zero", () => {
    expect(formatSpeed(NaN)).toBe("0 km/h");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd rishon3d && npx vitest run test/format.test.ts`
Expected: FAIL — cannot resolve `../src/ui/format`.

- [ ] **Step 3: Write minimal implementation**

Create `rishon3d/src/ui/format.ts`:

```ts
// Formats a horizontal speed (m/s) as a rounded km/h badge string.
export function formatSpeed(metersPerSec: number): string {
  const v = Number.isFinite(metersPerSec) ? Math.max(0, metersPerSec) : 0;
  return `${Math.round(v * 3.6)} km/h`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd rishon3d && npx vitest run test/format.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add rishon3d/src/ui/format.ts rishon3d/test/format.test.ts
git commit -m "feat(rishon3d): km/h speed formatting helper

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Minimap canvas overlay (`src/ui/Minimap.ts`)

**Files:**
- Create: `rishon3d/src/ui/Minimap.ts`

**Interfaces:**
- Consumes: `RishonMap` from `../world/rishonMap`; `worldToMinimap`, `worldRectToMinimap` from `./minimapMath`.
- Produces:
  - `class Minimap` with `constructor(container: HTMLElement, map: RishonMap)`.
  - `update(player: { x: number; z: number }, car: { x: number; z: number }, mode: "onFoot" | "driving"): void`.
  - `setVisible(v: boolean): void`, `toggle(): void`.

No unit test (canvas/DOM); verified by build + smoke in Task 8.

- [ ] **Step 1: Create the file**

Create `rishon3d/src/ui/Minimap.ts`:

```ts
import type { RishonMap } from "../world/rishonMap";
import { worldToMinimap, worldRectToMinimap } from "./minimapMath";

const SIZE = 180;

// A lightweight 2D minimap overlay. The static city layer (ground/roads/buildings)
// is rendered once to an offscreen canvas; each frame we blit it and draw the
// moving player/car dots on top.
export class Minimap {
  private canvas = document.createElement("canvas");
  private ctx: CanvasRenderingContext2D | null;
  private base: HTMLCanvasElement | null = null;
  private worldSize: number;

  constructor(container: HTMLElement, private map: RishonMap) {
    this.worldSize = map.ground.size;
    this.canvas.width = SIZE;
    this.canvas.height = SIZE;
    this.canvas.style.cssText =
      "position:fixed;right:12px;top:12px;width:180px;height:180px;border-radius:8px;" +
      "border:2px solid rgba(255,255,255,0.25);box-shadow:0 2px 8px rgba(0,0,0,0.5);z-index:6;";
    container.appendChild(this.canvas);
    this.ctx = this.canvas.getContext("2d");
    this.renderBase();
  }

  private renderBase(): void {
    const base = document.createElement("canvas");
    base.width = SIZE;
    base.height = SIZE;
    const b = base.getContext("2d");
    if (!b) return;
    b.fillStyle = "#2e3b2a"; // ground tint
    b.fillRect(0, 0, SIZE, SIZE);
    b.fillStyle = "#5b5b66"; // roads
    for (const r of this.map.roads) {
      const w = r.horizontal ? r.length : 6;
      const d = r.horizontal ? 6 : r.length;
      const rect = worldRectToMinimap(r.x, r.z, w, d, this.worldSize, SIZE);
      b.fillRect(rect.x, rect.y, rect.w, rect.h);
    }
    b.fillStyle = "#9aa7b8"; // buildings
    for (const bl of this.map.buildings) {
      const rect = worldRectToMinimap(bl.x, bl.z, bl.width, bl.depth, this.worldSize, SIZE);
      b.fillRect(rect.x, rect.y, rect.w, rect.h);
    }
    this.base = base;
  }

  update(player: { x: number; z: number }, car: { x: number; z: number }, mode: "onFoot" | "driving"): void {
    const ctx = this.ctx;
    if (!ctx || !this.base) return;
    ctx.clearRect(0, 0, SIZE, SIZE);
    ctx.drawImage(this.base, 0, 0);
    const dot = (p: { x: number; z: number }, color: string, radius: number) => {
      const m = worldToMinimap(p.x, p.z, this.worldSize, SIZE);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(m.x, m.y, radius, 0, Math.PI * 2);
      ctx.fill();
    };
    dot(car, mode === "driving" ? "#ffd24a" : "#c0392b", mode === "driving" ? 4 : 3);
    dot(player, "#4ad6ff", mode === "onFoot" ? 4 : 3);
  }

  setVisible(v: boolean): void { this.canvas.style.display = v ? "block" : "none"; }
  toggle(): void { this.setVisible(this.canvas.style.display === "none"); }
}
```

- [ ] **Step 2: Type-check**

Run: `cd rishon3d && npm run build`
Expected: PASS (tsc clean — `Minimap` is unused until Task 8, but `noUnusedLocals` only flags unused *locals*, not unused exported classes, so the build stays green).

- [ ] **Step 3: Commit**

```bash
git add rishon3d/src/ui/Minimap.ts
git commit -m "feat(rishon3d): 2D canvas minimap overlay

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Car speed readout + reverse cap (`src/entities/Car.ts`)

**Files:**
- Modify: `rishon3d/src/entities/Car.ts`

**Interfaces:**
- Produces: `get speed(): number` on `Car` (horizontal speed magnitude, m/s).
- Behavior change: reverse engine force is suppressed once the car is already moving backward beyond a cap (forward driving and braking-via-reverse unchanged).

No unit test (Rapier/Three.js); verified by build + smoke.

- [ ] **Step 1: Add module-level temporaries for the heading math**

In `rishon3d/src/entities/Car.ts`, below the existing constants (after `const MAX_STEER = 0.5;`), add:

```ts
const REVERSE_MAX = 8; // m/s — cap on how fast the car may travel in reverse
const _q = new THREE.Quaternion();
const _fwd = new THREE.Vector3();
```

- [ ] **Step 2: Add the `speed` getter**

Immediately after the existing `get position()` line (`get position(): THREE.Vector3 { return this.object.position; }`), add:

```ts
get speed(): number {
  const v = this.body.linvel();
  return Math.hypot(v.x, v.z);
}
```

- [ ] **Step 3: Apply the reverse cap in `update`**

In `update(dt)`, replace the engine block:

```ts
    let engine = 0;
    if (this.enabled) {
      if (accel) engine = ENGINE_FORCE;
      else if (reverse) engine = -ENGINE_FORCE * 0.7;
    }
```

with:

```ts
    // Signed speed along the car's forward axis (+z is forward).
    const rot = this.body.rotation();
    _q.set(rot.x, rot.y, rot.z, rot.w);
    _fwd.set(0, 0, 1).applyQuaternion(_q);
    const vel = this.body.linvel();
    const along = vel.x * _fwd.x + vel.z * _fwd.z;

    let engine = 0;
    if (this.enabled) {
      if (accel) engine = ENGINE_FORCE;
      // Reverse pushes back, and still works as a brake while moving forward,
      // but stops adding force once we're already reversing faster than the cap.
      else if (reverse && along > -REVERSE_MAX) engine = -ENGINE_FORCE * 0.7;
    }
```

- [ ] **Step 4: Build + smoke**

Run: `cd rishon3d && npm run build && npm run test:smoke`
Expected: PASS — tsc clean (`_q`/`_fwd`/`along`/`REVERSE_MAX` all used), vite build, smoke green.

- [ ] **Step 5: Commit**

```bash
git add rishon3d/src/entities/Car.ts
git commit -m "feat(rishon3d): car speed getter + reverse speed cap

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: HUD restyle + speedometer (`src/ui/Hud.ts`)

**Files:**
- Modify: `rishon3d/src/ui/Hud.ts`

**Interfaces:**
- Produces: existing `setHint`/`setPrompt` unchanged in signature; new `setSpeed(text: string | null): void` (bottom-right badge).

No unit test (DOM); verified by build + smoke.

- [ ] **Step 1: Replace the file**

Replace the entire contents of `rishon3d/src/ui/Hud.ts` with:

```ts
let hudStyleInjected = false;
function injectHudStyle(): void {
  if (hudStyleInjected || document.getElementById("r3d-hud-style")) { hudStyleInjected = true; return; }
  const s = document.createElement("style");
  s.id = "r3d-hud-style";
  s.textContent = [
    ".r3d-hint{position:fixed;left:12px;bottom:12px;color:#fff;font-family:system-ui,sans-serif;",
    "font-size:13px;letter-spacing:.2px;padding:6px 10px;border-radius:6px;",
    "background:rgba(10,12,24,0.45);text-shadow:0 1px 2px #000;z-index:5;}",
    ".r3d-prompt{position:fixed;left:50%;top:62%;transform:translateX(-50%);color:#fff;",
    "font-family:system-ui,sans-serif;font-size:18px;font-weight:600;padding:8px 18px;",
    "border-radius:8px;background:rgba(0,0,0,0.55);box-shadow:0 2px 10px rgba(0,0,0,0.4);z-index:5;}",
    ".r3d-speedo{position:fixed;right:14px;bottom:14px;color:#ffe9a8;",
    "font-family:ui-monospace,monospace;font-size:22px;font-weight:700;padding:6px 12px;",
    "border-radius:8px;background:rgba(10,12,24,0.55);border:1px solid rgba(255,210,120,0.35);z-index:6;}",
  ].join("");
  document.head.appendChild(s);
  hudStyleInjected = true;
}

export class Hud {
  private hint = document.createElement("div");
  private prompt = document.createElement("div");
  private speedo = document.createElement("div");

  constructor(container: HTMLElement) {
    injectHudStyle();
    this.hint.className = "r3d-hint";
    this.prompt.className = "r3d-prompt";
    this.speedo.className = "r3d-speedo";
    this.prompt.style.display = "none";
    this.speedo.style.display = "none";
    container.append(this.hint, this.prompt, this.speedo);
  }

  setHint(text: string): void { this.hint.textContent = text; }

  setPrompt(text: string | null): void {
    if (text) { this.prompt.textContent = text; this.prompt.style.display = "block"; }
    else { this.prompt.style.display = "none"; }
  }

  setSpeed(text: string | null): void {
    if (text) { this.speedo.textContent = text; this.speedo.style.display = "block"; }
    else { this.speedo.style.display = "none"; }
  }
}
```

- [ ] **Step 2: Build + smoke**

Run: `cd rishon3d && npm run build && npm run test:smoke`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add rishon3d/src/ui/Hud.ts
git commit -m "feat(rishon3d): restyled HUD with speedometer badge

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: Polished title/pause screen (`src/ui/Menu.ts`)

**Files:**
- Modify: `rishon3d/src/ui/Menu.ts`

**Interfaces:**
- `onStart`, `showTitle`, `showPause`, `hide` keep their existing signatures.

No unit test (DOM); verified by build + smoke.

- [ ] **Step 1: Replace the file**

Replace the entire contents of `rishon3d/src/ui/Menu.ts` with:

```ts
let menuStyleInjected = false;
function injectMenuStyle(): void {
  if (menuStyleInjected || document.getElementById("r3d-menu-style")) { menuStyleInjected = true; return; }
  const s = document.createElement("style");
  s.id = "r3d-menu-style";
  s.textContent = [
    "@keyframes r3dFade{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}",
    ".r3d-menu{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;",
    "font-family:system-ui,sans-serif;color:#eaeaf0;z-index:10;",
    "background:radial-gradient(120% 120% at 50% 20%,#2a2740 0%,#15131f 55%,#0a0c18 100%);}",
    ".r3d-card{display:flex;flex-direction:column;align-items:center;gap:16px;text-align:center;",
    "padding:36px 44px;animation:r3dFade .5s ease both;}",
    ".r3d-title{font-size:54px;margin:0;letter-spacing:3px;",
    "background:linear-gradient(180deg,#ffe9b0,#ffae57);-webkit-background-clip:text;",
    "background-clip:text;color:transparent;text-shadow:0 2px 16px rgba(255,160,60,0.25);}",
    ".r3d-tag{margin:0;opacity:0.82;font-size:16px;}",
    ".r3d-legend{display:grid;grid-template-columns:repeat(2,minmax(140px,auto));gap:6px 24px;",
    "font-size:13px;opacity:0.82;margin:4px 0 8px;}",
    ".r3d-legend span{white-space:nowrap;}",
    ".r3d-legend b{color:#ffd27a;font-weight:700;margin-right:6px;}",
    ".r3d-btn{padding:12px 40px;font-size:20px;border:0;border-radius:10px;cursor:pointer;",
    "background:#2e6fb0;color:#fff;transition:transform .08s ease,background .15s ease;}",
    ".r3d-btn:hover{background:#3a86d6;}",
    ".r3d-btn:active{transform:scale(0.96);}",
  ].join("");
  document.head.appendChild(s);
  menuStyleInjected = true;
}

export class Menu {
  private root = document.createElement("div");
  private startCb: () => void = () => {};

  constructor(container: HTMLElement) {
    injectMenuStyle();
    this.root.className = "r3d-menu";
    container.appendChild(this.root);
  }

  onStart(cb: () => void): void { this.startCb = cb; }

  showTitle(): void {
    this.root.innerHTML = [
      '<div class="r3d-card">',
      '<h1 class="r3d-title">Rishon 3D</h1>',
      '<p class="r3d-tag">Drive and wander a living city at golden hour.</p>',
      '<div class="r3d-legend">',
      "<span><b>WASD</b>Move</span><span><b>Mouse</b>Look</span>",
      "<span><b>E</b>Drive / Exit</span><span><b>M</b>Map</span>",
      "<span><b>Space</b>Brake</span><span><b>Esc</b>Pause</span>",
      "</div>",
      '<button class="r3d-btn" id="r3d-start">Start</button>',
      "</div>",
    ].join("");
    (this.root.querySelector("#r3d-start") as HTMLButtonElement).onclick = () => this.startCb();
    this.root.style.display = "flex";
  }

  showPause(): void {
    this.root.innerHTML = [
      '<div class="r3d-card">',
      '<h2 class="r3d-title" style="font-size:36px">Paused</h2>',
      '<button class="r3d-btn" id="r3d-resume">Resume</button>',
      "</div>",
    ].join("");
    (this.root.querySelector("#r3d-resume") as HTMLButtonElement).onclick = () => this.startCb();
    this.root.style.display = "flex";
  }

  hide(): void { this.root.style.display = "none"; }
}
```

- [ ] **Step 2: Build + smoke**

Run: `cd rishon3d && npm run build && npm run test:smoke`
Expected: PASS — the smoke test clicks Start (the `#r3d-start` button) to boot, so confirm it still starts.

- [ ] **Step 3: Commit**

```bash
git add rishon3d/src/ui/Menu.ts
git commit -m "feat(rishon3d): polished title/pause screen with controls legend

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 8: Wire minimap, speedometer, and safe exit into the game

**Files:**
- Modify: `rishon3d/src/game/Game.ts`
- Modify: `rishon3d/src/main.ts`

**Interfaces:**
- Consumes: `Minimap` (Task 4), `safeExitPosition` (Task 2), `formatSpeed` (Task 3), `Car.speed` (Task 5), `Hud.setSpeed` (Task 6).
- `Game` constructor gains a trailing `minimap: Minimap` parameter.

No unit test (integration); verified by build + smoke.

- [ ] **Step 1: Update `Game.ts` imports and fields**

In `rishon3d/src/game/Game.ts`:
- Change the wander import (line 13) from `import { buildingRects } from "./wander";` to `import { buildingRects, type Rect } from "./wander";`
- Add after the `import type { Hud } from "../ui/Hud";` line:

```ts
import type { Minimap } from "../ui/Minimap";
import { safeExitPosition } from "./exit";
import { formatSpeed } from "../ui/format";
```

- Add two fields beside the existing private fields (after `private entities: EntityManager;`):

```ts
  private rects: Rect[];
  private bounds: number;
```

- [ ] **Step 2: Accept the minimap and store rects/bounds**

In the `Game` constructor signature, add the trailing parameter after `private hud: Hud,`:

```ts
    private hud: Hud,
    private minimap: Minimap,
```

In the constructor body, change the two local declarations:

```ts
    const rects = buildingRects(world.map.buildings, 1.5);
    const bounds = world.map.ground.size / 2 - 2;
```

to assign the new fields (and keep the locals used right below for spawning):

```ts
    const rects = buildingRects(world.map.buildings, 1.5);
    const bounds = world.map.ground.size / 2 - 2;
    this.rects = rects;
    this.bounds = bounds;
```

- [ ] **Step 3: Use safe exit on leaving the car**

In `update`, replace the on-foot transition line:

```ts
        this.character.setPosition(this.car.position.x + 2.5, this.car.position.z);
```

with:

```ts
        const exit = safeExitPosition(cPos, this.rects, this.bounds);
        this.character.setPosition(exit.x, exit.z);
```

(`cPos` is already computed at the top of `update` as the car's current XZ.)

- [ ] **Step 4: Drive the minimap + speedometer each frame**

In `update`, just before the final `this.character.update(dt);` line, add:

```ts
    this.minimap.update(pPos, cPos, this.mode);
    this.hud.setSpeed(this.mode === "driving" ? formatSpeed(this.car.speed) : null);
```

- [ ] **Step 5: Construct the minimap and bind the M key in `main.ts`**

In `rishon3d/src/main.ts`:
- Add after `import { Hud } from "./ui/Hud";`:

```ts
import { Minimap } from "./ui/Minimap";
```

- After the `const hud = new Hud(container);` line, add:

```ts
  const minimap = new Minimap(container, RISHON_MAP);
```

- Change the `Game` construction to pass the minimap:

```ts
  const game = new Game(engine.scene, physics, input, world, follow, engine.camera, hud, minimap);
```

- Update the standing hint copy (the `hud.setHint(...)` call) to mention the map:

```ts
  hud.setHint("WASD / Arrows move - Mouse look - Scroll zoom - Space brake - E enter/exit - M map - Esc pause");
```

- In the existing `window.addEventListener("keydown", ...)` handler, add an M-toggle alongside the Escape handling (inside the same listener body):

```ts
    if (e.code === "KeyM" && started) minimap.toggle();
```

- [ ] **Step 6: Full gate**

Run: `cd rishon3d && npm run test && npm run build && npm run test:smoke`
Expected: PASS — all vitest suites green, tsc + vite clean, Playwright smoke boots the scene (clicking Start) and renders with no console errors.

- [ ] **Step 7: Commit**

```bash
git add rishon3d/src/game/Game.ts rishon3d/src/main.ts
git commit -m "feat(rishon3d): wire minimap toggle, speedometer, and safe car exit

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Final verification (after all tasks)

- [ ] `cd rishon3d && npm run test` — entire vitest suite green (includes the 3 new pure-logic test files).
- [ ] `cd rishon3d && npm run build` — `tsc --noEmit` + Vite build clean.
- [ ] `cd rishon3d && npm run test:smoke` — Playwright smoke boots and renders without console errors.
- [ ] Manual/screenshot sanity (if a browser is available): polished title screen with legend; in-game minimap top-right with player/car dots; speedometer appears while driving; exiting the car never lands inside a building; M toggles the minimap.

## Self-Review

- **Spec coverage:** Unit 1 → Task 1; Unit 2 → Task 4; Unit 3 → Task 2; Unit 4 → Task 3; Unit 5 → Task 5; Unit 6 → Task 6; Unit 7 → Task 7; Unit 8 wiring → Task 8. D5 reverse cap → Task 5; D6 safe exit → Task 2/8; D3 M-toggle → Task 8. All spec units mapped.
- **Placeholder scan:** No TBD/TODO; every code step shows full code and exact commands.
- **Type consistency:** `worldToMinimap`/`worldRectToMinimap`/`MiniPoint`/`MiniRect`, `safeExitPosition(car, rects, bounds)`, `formatSpeed`, `Minimap.update(player, car, mode)`/`toggle`, `Car.speed`, `Hud.setSpeed` used with identical names/signatures across tasks. `Rect` is imported from `./wander` (its real shape `{minX,maxX,minZ,maxZ}`), and `pointInRects` is reused. `Game` constructor's new `minimap` parameter is passed from `main.ts` in Task 8.
