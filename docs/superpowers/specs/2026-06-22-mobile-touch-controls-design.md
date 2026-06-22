# Mobile touch controls — design

**Date:** 2026-06-22
**Status:** approved (auto mode — self-brainstormed)

## Goal

Make the game playable on a phone/tablet with touch only. Add:

- A **virtual joystick** (bottom-left) to move the player (and drive the car).
- **Touch camera look** — drag anywhere on the right of the screen to orbit; two-finger
  pinch to zoom (replacing mouse-look + wheel, which don't exist on touch).
- **On-screen action buttons** (bottom-right): **Run** (hold), **Action/E**
  (enter/exit vehicle, use portals/interactions), **Phone** (open/close phone).

Desktop keyboard/mouse controls are untouched. Touch controls only appear on touch
devices (or when forced via a URL flag for testing).

## Why this is low-risk

The input layer is already abstracted: gameplay reads key codes from `Input`
(`isDown` / `justPressed`) and camera deltas via `FollowCamera.addOrbit` / `zoom`.
Touch controls feed those **same** sinks. The only systems that gain a new input
source are `Input` (an analog move vector) and the two consumers of movement
(`Character`, `Car`). No game-logic / mode-switch code changes.

## Architecture

### 1. `Input` gains an analog move vector
`Input` already exposes `handleKeyDown(code)` / `handleKeyUp(code)` publicly, so the
buttons just push the existing key codes (`ShiftLeft`, `KeyE`, `KeyP`) — `justPressed`
works because `handleKeyDown` records a fresh press.

Add one field for the joystick:
```ts
// analog movement from a virtual joystick; x = strafe (+ = right), y = forward (+ = forward). Each in [-1,1].
move = { x: 0, y: 0 };
```
Cleared to `{0,0}` on joystick release.

### 2. `Character` reads the analog vector (additive with keys)
In the camera-relative move build, after the WASD adds:
```ts
move.addScaledVector(forward, this.input.move.y);
move.addScaledVector(right,   this.input.move.x);
```
Speed is then scaled by the **clamped** vector magnitude so a light push walks slowly
and a full push hits walk speed; the Run button (`ShiftLeft`) still selects run speed:
```ts
const mag = Math.min(1, move.length());
move.normalize().multiplyScalar(speed * dt * mag);
```
Keyboard is unaffected (single key and diagonal both clamp to `mag = 1`).

### 3. `Car` reads the analog vector
Throttle/reverse from `move.y` (threshold), steering proportional to `move.x`
(falls back to the discrete A/D when the joystick is idle). Keyboard unchanged.

### 4. New `src/ui/VirtualControls.ts` (a `Tickable`)
Owns all touch DOM, mounted into the same `#app` container as the other overlays.
- **Root**: `position:fixed; inset:0; pointer-events:none; z-index:7` (above HUD z5/6,
  below Phone z9 and Menu z10 — so when the phone/menu is up it sits behind their
  full-screen overlays and receives no touches).
- **Look zone** (full-area child, `pointer-events:auto`, lowest sibling): one-finger
  drag → `follow.addOrbit(dx, dy)`; two-finger → `follow.zoom(...)` (pinch). Touches
  are tracked by `Touch.identifier`, so look + joystick work simultaneously.
- **Joystick** (fixed circular base bottom-left, on top of the look zone): thumb
  follows the finger clamped to the base radius; writes `input.move`; resets on release.
- **Buttons** (bottom-right stack): **Run** = hold → `ShiftLeft` down/up;
  **E** = tap → `KeyE` down then up; **Phone** = tap → `KeyP` down then up.
- `update(dt)` toggles overall visibility from an `isActive()` callback
  (`started && !game.phoneOpen`) so controls hide on the title/pause screens and while
  the phone UI is open.
- `touch-action:none` on interactive elements to stop browser scroll/zoom gestures.

### 5. `main.ts` wiring
- Detect touch: `matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window ||
  navigator.maxTouchPoints > 0`, OR forced via `?touch` / `#touch` in the URL.
- Only when touch: construct `VirtualControls(container, input, follow, () => started && !game.phoneOpen)`,
  register it as a tickable, and make `lockPointer` a no-op (pointer lock is
  meaningless on touch and camera look comes from the look zone).
- Desktop path unchanged.

### 6. `index.html`
Harden the viewport meta for a game: `maximum-scale=1, user-scalable=no,
viewport-fit=cover` (kills double-tap/pinch page zoom so canvas gestures are clean).

## Assumptions & Decisions (auto mode — self-answered)

- **Show controls when?** → auto-detect touch device; also a `?touch` / `#touch` URL
  flag to test on desktop — because desktop users must not see touch UI, but I need a
  way to verify without a phone.
- **Joystick: fixed vs floating?** → fixed circular base, bottom-left — simplest
  reliable hit target; floating-origin is a v2 nicety.
- **Joystick → movement: synthesize WASD vs analog vector?** → analog vector on
  `Input` — gives proportional speed and clean diagonal control; synthesizing fake key
  events loses magnitude and is hackier.
- **Speed from joystick magnitude?** → yes, clamped to walk speed; Run button selects
  run — matches a real twin-stick feel without new tuning constants.
- **Camera look region?** → drag anywhere not on the joystick/buttons (effectively the
  right/center); pinch to zoom — standard mobile-shooter convention.
- **Which buttons?** → exactly Run, Action/E, Phone (what the user listed). No Jump
  (Space is dev-only fly) and no separate Brake (joystick-down already brakes/reverses
  the car) — YAGNI.
- **Driving vs on-foot button set?** → same three buttons in both; Run/Phone are inert
  while driving but harmless — avoids a mode-specific layout for v1.
- **Pointer lock on touch?** → disabled (no-op `lockPointer`) — it would reject and
  isn't needed once look comes from the look zone.
- **Worktree isolation?** → SKIPPED; working directly on `master` — overrides the
  autonomous-builder default because this project's standing rule is "work on master
  only, no branches/worktrees".
- **Verification gate?** → `npx tsc --noEmit` only — the project's PITFALL hard rules
  forbid running the dev server, tests, and (per PITFALL 2) `vite build`; the user
  looks in-game themselves. No screenshots.

## Out of scope (v2)

Floating-origin joystick, haptics, a driving-specific button layout (brake/handbrake),
on-screen jump, settings to resize/reposition controls, gamepad support.
