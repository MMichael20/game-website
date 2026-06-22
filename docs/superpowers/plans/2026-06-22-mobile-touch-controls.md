# Mobile Touch Controls Implementation Plan

> **For agentic workers:** Execute task-by-task. Steps use checkbox (`- [ ]`) syntax.
> **Project override:** No test runner, no dev server, no screenshots (CLAUDE.md PITFALLs).
> The per-task gate is `npx tsc --noEmit` (clean). Work on `master` — no worktree.

**Goal:** Make the game fully playable by touch — virtual joystick to move/drive,
drag-to-look + pinch-zoom camera, and Run / Action(E) / Phone on-screen buttons.

**Architecture:** Touch controls feed the existing input sinks. A new
`VirtualControls` DOM overlay writes an analog move vector onto `Input` and pushes
existing key codes (`ShiftLeft`/`KeyE`/`KeyP`) via `Input.handleKeyDown/Up`, and calls
`FollowCamera.addOrbit`/`zoom`. `Character` and `Car` read the new analog vector. Only
`main.ts` decides (touch device → instantiate; else desktop unchanged).

**Tech Stack:** TypeScript, Three.js, Rapier, Vite. DOM/touch events. No new deps.

## Global Constraints

- Determinism: no `Math.random()` / `Date.now()` / argless `new Date()` in builders.
- Verification gate per task: `npx tsc --noEmit` is clean. Nothing else is run.
- Desktop keyboard/mouse path MUST remain byte-for-byte behavior-identical.

---

### Task 1: Add analog move vector to `Input`

**Files:**
- Modify: `src/core/Input.ts`

**Interfaces:**
- Produces: `Input.move: { x: number; y: number }` (x = strafe +right, y = forward
  +forward, each in [-1,1]); reset to `{0,0}` on joystick release by the writer.

- [ ] **Step 1: Add the field**

```ts
export class Input {
  private down = new Set<string>();
  private pressed = new Set<string>();
  // Analog movement from a virtual joystick (mobile). x = strafe (+ = right),
  // y = forward (+ = forward). Each in [-1,1]. Keyboard play leaves this at 0.
  readonly move = { x: 0, y: 0 };
```

Also reset it in `clear()` so blur/pause drops any held joystick:

```ts
  clear(): void { this.down.clear(); this.pressed.clear(); this.move.x = 0; this.move.y = 0; }
```

- [ ] **Step 2: Gate** — `npx tsc --noEmit` clean.
- [ ] **Step 3: Commit** — `feat(input): analog move vector for touch joystick`.

---

### Task 2: `Character` reads the analog vector

**Files:**
- Modify: `src/entities/Character.ts` (the move build at lines ~85-113)

**Interfaces:**
- Consumes: `Input.move` from Task 1.

- [ ] **Step 1: Add analog contribution after the WASD adds**

After the four `if (this.input.isDown(...))` lines that build `move`:

```ts
    if (this.input.isDown("KeyD") || this.input.isDown("ArrowRight")) move.add(right);
    // Analog joystick (mobile): additive with the keys, camera-relative.
    move.addScaledVector(forward, this.input.move.y);
    move.addScaledVector(right, this.input.move.x);
```

- [ ] **Step 2: Scale speed by clamped magnitude (light push walks slowly)**

Replace the `if (moving) { move.normalize().multiplyScalar(speed * dt); ... }` block's
scaling line so it honors partial joystick deflection (keyboard clamps to 1, unchanged):

```ts
    const moving = move.lengthSq() > 1e-6;
    if (moving) {
      const mag = Math.min(1, move.length());
      move.normalize().multiplyScalar(speed * dt * mag);
      desired = { x: move.x, y: gravityDy, z: move.z };
      this.object.rotation.y = Math.atan2(move.x, move.z);
      this.phase += speed * dt * 6;
    }
```

- [ ] **Step 3: Gate** — `npx tsc --noEmit` clean.
- [ ] **Step 4: Commit** — `feat(character): drive movement from analog joystick`.

---

### Task 3: `Car` reads the analog vector

**Files:**
- Modify: `src/entities/Car.ts` (the input read at lines ~85-109)

**Interfaces:**
- Consumes: `Input.move` from Task 1.

- [ ] **Step 1: Fold the joystick into throttle/steer**

Replace the discrete-only reads + steer selection:

```ts
    const mx = this.input.move.x, my = this.input.move.y;
    const accel = this.input.isDown("KeyW") || this.input.isDown("ArrowUp") || my > 0.15;
    const reverse = this.input.isDown("KeyS") || this.input.isDown("ArrowDown") || my < -0.15;
    const left = this.input.isDown("KeyA") || this.input.isDown("ArrowLeft");
    const right = this.input.isDown("KeyD") || this.input.isDown("ArrowRight");
    const braking = this.input.isDown("Space");
```

And in the steer block, let the joystick override proportionally:

```ts
    let steer = 0;
    if (this.enabled) {
      if (left) steer = MAX_STEER;
      else if (right) steer = -MAX_STEER;
      if (Math.abs(mx) > 0.05) steer = -mx * MAX_STEER; // analog joystick steering
    }
```

- [ ] **Step 2: Gate** — `npx tsc --noEmit` clean.
- [ ] **Step 3: Commit** — `feat(car): steer/throttle from analog joystick`.

---

### Task 4: `VirtualControls` overlay (joystick + look + buttons)

**Files:**
- Create: `src/ui/VirtualControls.ts`

**Interfaces:**
- Consumes: `Input` (writes `move`, calls `handleKeyDown/Up`), `FollowCamera`
  (`addOrbit`, `zoom`), and an `isActive: () => boolean` callback.
- Produces: `class VirtualControls implements Tickable` with `update(dt)` that toggles
  visibility from `isActive()`. Constructor:
  `new VirtualControls(container, input, follow, isActive)`.

- [ ] **Step 1: Write the class** (full file — DOM, styles, touch handlers)

Key behaviors (see design doc for rationale):
- Root `position:fixed; inset:0; pointer-events:none; z-index:7`.
- Look zone: lowest child, `pointer-events:auto`, `touch-action:none`. Track touches by
  `identifier`; 1 finger → `follow.addOrbit(dx,dy)`; 2 fingers → `follow.zoom(-(dist-prevDist))`.
- Joystick: fixed base bottom-left on top of the look zone; thumb clamped to radius;
  writes `input.move` (`x = dx/R`, `y = -dy/R`, clamped to unit length); reset on end.
- Buttons bottom-right: Run (hold → `ShiftLeft`), E (tap → `KeyE` down+up), Phone (tap
  → `KeyP` down+up). Use `pointerdown`/`pointerup`/`pointercancel` with
  `preventDefault()`.
- `update()`: `root.style.display = this.isActive() ? "block" : "none"` (only write on change).

- [ ] **Step 2: Gate** — `npx tsc --noEmit` clean.
- [ ] **Step 3: Commit** — `feat(ui): VirtualControls touch overlay`.

---

### Task 5: Wire into `main.ts` + viewport meta

**Files:**
- Modify: `src/main.ts`
- Modify: `index.html`

**Interfaces:**
- Consumes: `VirtualControls` (Task 4), `Input`, `FollowCamera`, `Game.phoneOpen`,
  `started`.

- [ ] **Step 1: Touch detection + instantiate (after `game` and `started` exist)**

```ts
  const isTouch =
    matchMedia("(pointer: coarse)").matches ||
    "ontouchstart" in window ||
    navigator.maxTouchPoints > 0 ||
    /[?#].*\btouch\b/.test(location.href);
  if (isTouch) {
    const controls = new VirtualControls(container, input, follow, () => started && !game.phoneOpen);
    engine.add(controls);
  }
```

- [ ] **Step 2: No-op pointer lock on touch** — wrap so it never rejects on mobile:

```ts
  const lockPointer = isTouch ? () => {} : () => {
    const p = canvas.requestPointerLock?.() as unknown as Promise<void> | undefined;
    if (p && typeof p.catch === "function") p.catch(() => {});
  };
```

(Place the `isTouch` computation before `lockPointer` if needed; keep one definition.)

- [ ] **Step 3: Import** `import { VirtualControls } from "./ui/VirtualControls";`

- [ ] **Step 4: Harden viewport meta in `index.html`**

```html
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
```

- [ ] **Step 5: Gate** — `npx tsc --noEmit` clean.
- [ ] **Step 6: Commit** — `feat(mobile): wire VirtualControls + touch-safe viewport`.

---

## Self-Review

- Spec coverage: joystick (T1-T2,T4), driving (T3,T4), look+pinch (T4), buttons (T4),
  detection + pointer-lock + viewport (T5). All covered.
- No test-runner steps (project rule); gate is `tsc --noEmit` each task.
- Type consistency: `Input.move` shape identical across T1/T2/T3/T4; `VirtualControls`
  constructor signature identical in T4/T5.
