# Rishon3D — Game UX: main menu, HUD, minimap, car polish

**Date:** 2026-06-18
**Branch:** worktree-3d-spike
**Mode:** autonomous-builder (`auto`) — brainstorming forks self-answered and logged below.

## Goal

Make rishon3d feel like a game you sit down and play: a polished **main/title screen**,
a cleaner **HUD with a live speedometer when driving**, a **minimap** so you can see the
city and where you are, and targeted **car polish/bug fixes** so driving feels right. This
is the first of two UX builds; **"call a taxi" is decomposed into the next cycle** (D1).

## Scope decomposition (the request was multi-subsystem)

The request listed: text polish, drive the car, call a taxi, a map, main screen, "ambient
overall", and bug fixes. Decomposed:

- **This build:** main screen, HUD/text polish + speedometer, minimap, car drive
  fixes/bug fixes. Cohesive player-facing UX; low integration risk.
- **Next build (D1):** call-a-taxi (a new "riding" sub-mode + AI routing to the player) —
  independent, riskier, deserves its own spec/plan/build.
- **Deferred (logged):** sound/audio ambient (no audio subsystem exists — a whole new
  dependency; D7) and camera-vs-building occlusion (D8). "Ambient overall" lighting was
  delivered in the prior dusk-atmosphere build; here "ambient" is the menu/HUD vibe.

## Non-goals (YAGNI)

- No audio. No new physics for NPC-car collision. No save/load. No settings menu.
- No gameplay objectives/scoring. The minimap is read-only (no click-to-navigate).

## Architecture

Pure logic (math/state) lives in small modules unit-tested under vitest (no DOM/WebGL);
DOM/canvas rendering and Three.js wiring stay thin and are verified by build + smoke.

### Unit 1 — `src/ui/minimapMath.ts` (new, pure): world→minimap projection

- `worldToMinimap(wx: number, wz: number, worldSize: number, mapPx: number): { x: number; y: number }`
  — maps a world XZ coord (world spans `[-worldSize/2, +worldSize/2]`) to minimap pixel
  space `[0, mapPx]`, with world `+z` going **down** the minimap (screen-natural). Center
  maps to `mapPx/2`. **Pure, unit-tested** (center, corners, scaling).
- `worldRectToMinimap(cx, cz, w, d, worldSize, mapPx): { x; y; w; h }` — a building/road
  footprint as a minimap rect (top-left + size). **Pure, unit-tested.**

### Unit 2 — `src/ui/Minimap.ts` (new): canvas minimap overlay

- `class Minimap` — a fixed `<canvas>` (e.g. 180×180) top-right. Constructor takes the
  container and the `RishonMap`. Pre-renders the **static layer** (ground tint, roads as
  light lines, buildings as filled rects) once to an offscreen canvas via `minimapMath`.
- `update(player: {x;z}, car: {x;z}, mode: "onFoot"|"driving")` — redraws: blits the static
  layer, then a player dot and a car dot (the active one highlighted). Cheap (one blit + a
  few arcs per frame).
- `setVisible(v: boolean)` / `toggle()` — show/hide; bound to the **M** key.

### Unit 3 — `src/game/exit.ts` (new, pure): safe car-exit position

- `safeExitPosition(car: {x;z}, rects: Rect[], bounds: number, candidates?: {x;z}[]): {x;z}`
  — returns a spot beside the car to drop the player that is **inside bounds and not inside
  any building rect**. Tries side/front/back offsets around the car; falls back to the car
  position if none clear. (`Rect` = the building-rect shape already produced by
  `buildingRects` in `wander.ts`: `{ minX; maxX; minZ; maxZ }`.) **Pure, unit-tested.**
  Fixes the current bug where exiting always teleports to `car.x + 2.5` — which can land the
  player inside a building.

### Unit 4 — `src/ui/format.ts` (new, pure): HUD number formatting

- `formatSpeed(metersPerSec: number): string` — e.g. `"42 km/h"` (rounds `mps * 3.6`,
  non-negative). **Pure, unit-tested.**

### Unit 5 — `src/entities/Car.ts` (edit): speed readout + reverse cap

- Add `get speed(): number` — horizontal speed magnitude from `body.linvel()`
  (`hypot(vx, vz)`, m/s) for the HUD speedometer.
- Reverse-cap bug fix: stop applying reverse engine force once the car is already moving
  backward fast (read `body.linvel()` projected on heading), so reverse doesn't accelerate
  unboundedly. Keep forward behavior unchanged. Small, contained edit in `update`.

### Unit 6 — `src/ui/Hud.ts` (edit): restyle + speedometer

- Inject a one-time `<style>` block (id-guarded) for HUD typography and a `.speedo` badge.
- Restyle hint/prompt (cleaner padding, subtle panel background, readable on the dusk sky).
- Add `setSpeed(text: string | null)` → a bottom-right speed badge, shown only while driving.
- Update the standing hint copy to mention **M: map**.

### Unit 7 — `src/ui/Menu.ts` (edit): polished title screen

- Inject a one-time `<style>` block: gradient/vignette backdrop, fade-in `@keyframes`,
  button `:hover`/`:active`, a controls-legend grid.
- `showTitle()` → big title "Rishon 3D", a one-line tagline, a **controls legend** (Move ·
  Look · Drive (E) · Map (M) · Pause (Esc)), and a polished Start button with hover.
- `showPause()` → matching styled "Paused" panel + Resume. Keep `onStart`/`hide` API.

### Unit 8 — wiring (edits)

- `src/main.ts`: construct `Minimap(container, RISHON_MAP)`; on `keydown` **KeyM** toggle it
  (guarded by `started`); the title legend text reflects real controls.
- `src/game/Game.ts`: hold the `Minimap`; each frame call `minimap.update(playerPos, carPos,
  mode)` and `hud.setSpeed(mode === "driving" ? formatSpeed(car.speed) : null)`. On car exit,
  use `safeExitPosition(carPos, this.rects, bounds)` instead of the hardcoded offset (store
  the `rects`/`bounds` already computed in the constructor as fields).

## Data flow

Map data (`RISHON_MAP`) → `Minimap` static layer (once). Each frame: `Game` reads player/car
positions and mode → `Minimap.update` + `Hud.setSpeed`. Input **M** toggles the minimap.
Car exposes `speed`; `formatSpeed` turns it into HUD text. `safeExitPosition` keeps the
player out of buildings on exit. No change to the physics step order or the tested
`InteractionSystem`/`pathFollow` modules.

## Error handling

- Minimap canvas uses `getContext("2d")`; if null (unsupported), `Minimap` no-ops safely.
- `safeExitPosition` always returns a value (falls back to car position) — never throws.
- `formatSpeed` clamps negatives to 0; NaN guarded to `0 km/h`.
- Injected `<style>` blocks are id-guarded so re-construction never duplicates them.

## Testing

Vitest (no DOM/WebGL) for pure units; `tsc --noEmit` + `vite build` for type/build safety;
Playwright smoke must still load the scene with no console errors.

- `minimapMath.test.ts` — `worldToMinimap` center/corners/scaling; `worldRectToMinimap`
  top-left + size; +z maps downward.
- `exit.test.ts` — returns a clear, in-bounds spot beside the car; avoids a building rect
  that overlaps the default offset; falls back when fully boxed in.
- `format.test.ts` — `formatSpeed` rounding, zero/negative/NaN handling, unit suffix.
- Whole suite (`npm run test`) + `npm run build` + `npm run test:smoke` green before done.
- DOM/canvas (`Minimap`, `Hud`, `Menu`) and Three.js (`Car`) are integration-verified via
  build + smoke, matching the repo's existing convention (UI classes are not unit-tested).

## Assumptions & Decisions (autonomous self-brainstorm log)

- D1 Scope split → chose to **build UX/minimap/car-fixes now and decompose call-a-taxi into
  the next cycle** — because the taxi adds a new ride sub-mode + AI routing (independent and
  riskier), and brainstorming guidance says decompose multi-subsystem asks into sequential
  specs.
- D2 Minimap tech → chose a **2D `<canvas>` overlay** over a second Three.js ortho camera —
  because a canvas is far cheaper, simpler, and trivially styled, and the map is read-only.
- D3 Minimap default + toggle → chose **visible by default, toggle with M** — because a city
  this size benefits from constant orientation; M lets players hide it.
- D4 Speedometer units → chose **km/h** (from m/s × 3.6) — most readable; physics units are
  ~meters.
- D5 Car reverse fix → chose to **cap reverse by velocity-along-heading** rather than add a
  gearbox — smallest change that fixes unbounded reverse while leaving forward driving
  untouched.
- D6 Exit-position fix → chose a **pure `safeExitPosition` that probes offsets around the car
  against building rects** over a physics raycast — deterministic, unit-testable, reuses the
  existing `buildingRects` data.
- D7 Audio/ambient sound → **deferred** — no audio subsystem exists; adding Web Audio is its
  own project. "Ambient" here is delivered as menu/HUD vibe; ambient *lighting* shipped in
  the prior dusk build.
- D8 Camera-building occlusion → **deferred** — a known rough edge, but a separate,
  non-trivial concern outside this UX pass.
- D9 Styling approach → chose **injected, id-guarded `<style>` blocks** for `:hover`/
  `@keyframes` (which inline styles can't express) over adding a CSS build step — minimal and
  matches the no-framework DOM UI already in use.
