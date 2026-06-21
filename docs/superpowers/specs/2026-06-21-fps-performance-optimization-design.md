# FPS Performance Optimization — Design

Date: 2026-06-21
Status: approved (auto mode — self-brainstormed, decisions logged below)

## Goal

Improve frame rate and, more importantly, make the game **scale** as the world
fills with more NPCs, cars, and props — without changing how the game looks or
behaves. "Important as we scale" is the operative phrase: the fix targets the cost
that grows with object count, not one-off micro-tweaks.

## Problem (verified in code)

Profiling the source turned up one dominant, scaling cost and two minor ones:

1. **Per-instance GPU resources (the scaling lever).** The two avatar/vehicle
   factories allocate fresh geometries and materials for *every* instance:
   - `makeHumanoid` (`src/entities/Humanoid.ts:150`) builds ~15 `BoxGeometry` +
     ~15 `MeshStandardMaterial` per NPC, **and rebuilds a ~40-cube merged hair
     geometry** (`hairGeometry()`, line 77) for each one. With a crowd
     (`staticPeople`, `Patron`, the player) this is O(NPCs) geometries+materials.
   - `makeCarBody` (`src/entities/carMesh.ts:19`) builds ~40 geometries + 8
     materials per car. Called from `Car`, `NpcCar`, `RideCar`, `kits`,
     `restaurantStreet`, `secondaryLocations` — O(cars).
   - A process-wide cache (`getGeometry`/`getMaterial`, `src/world/assets.ts`)
     already exists for exactly this purpose but **the entity factories don't use
     it.** Both factories are the single choke points: ~10 call sites funnel
     through them, so fixing the two functions fixes every spawn.

2. **Per-frame allocations.** `Character.update` (`src/entities/Character.ts:79,81`)
   allocates two `new THREE.Vector3()` every frame (`right`, `move`), adding GC
   pressure.

3. **No way to measure.** There is no on-screen FPS / draw-call readout, so we
   can't see scaling behavior or confirm a win. The game already has an F3
   `DebugOverlay` (`src/ui/DebugOverlay.ts`) we can extend.

## Non-goals (explicitly out of scope)

- **No visual or behavioral change.** Lighting, shadows, tone mapping,
  `AmbientLight`, `preserveDrawingBuffer`, and `logarithmicDepthBuffer` are left
  untouched (memory: user prioritizes content over rendering and likes the current
  look; the screenshot read-back path depends on `preserveDrawingBuffer`).
- **No InstancedMesh rewrite of NPCs/cars.** Limbs/wheels animate per-instance;
  instancing animated skeletons is a large, risky rewrite. Deferred.
- **No LOD / spatial index (quadtree/octree).** Current draw-call count
  (~80–150) is fine; THREE already frustum-culls and `EntityManager` already
  distance-culls agents. The bottleneck is resource allocation, not draw calls.
- No new dependencies (no `stats.js`).

## Approach

### 1. Measurement HUD (so scaling is visible)
Extend the existing `DebugOverlay` (toggled by F3, already wired in
`Game.toggleDebug`) with an optional perf block:
- **FPS** — smoothed from the frame `dt` the game already computes.
- **draw calls** and **triangles** — from `renderer.info.render`.
- **geom / mat** — from `assetCounts()` so cache sharing is observable.

`renderer.info` requires a renderer reference. `Game` doesn't currently hold one,
so pass `engine.renderer` into `Game` (one new constructor arg in `main.ts`) and
include the perf fields when building `DebugInfo` (`Game.ts:197`). `DebugInfo`
gets an optional `perf?` field so nothing else breaks.

### 2. Share Humanoid resources (`Humanoid.ts`)
Route every geometry and material through `getGeometry`/`getMaterial`:
- Geometries keyed by their box dimensions (e.g. `"box:0.52x0.72x0.32"`); the
  merged **hair geometry cached once** under a single `"hair"` key (it is fully
  deterministic and identical for every NPC).
- Materials keyed by color (e.g. `"std:" + hex`); the palette-independent
  constants (white tee, shoe black, pack browns, face ink, ears = skin) collapse
  to one shared material each.
- **Exception — phone screen material stays per-instance.** `applyPhonePose`
  mutates its `emissiveIntensity` per character (`Humanoid.ts:259`), so a shared
  material would make every phone glow in lockstep. It keeps its own `new
  MeshStandardMaterial`.

Sharing geometry/material across meshes is safe: a mesh's transform and rotation
are per-instance (so limb animation is unaffected); only the shape and surface are
shared.

### 3. Share Car resources (`carMesh.ts`)
Same treatment: geometries keyed by dimensions(+variant where it matters),
`paint`/`paintDark` keyed by body color, and the constant materials (glass, trim,
chrome, headlight, taillight, plate, tire, hub, taxi sign) shared globally. The
emissive materials are never mutated at runtime, so sharing is safe.

### 4. Remove per-frame allocations (`Character.ts`)
Reuse two reusable `Vector3` temporaries (instance fields or module-level) for
`right` and `move` instead of `new THREE.Vector3()` each frame.

## Risk / correctness notes

- **Shared resources must not be mutated per-instance.** The only runtime-mutated
  material is the humanoid phone screen — kept per-instance. All other materials
  are set once at build. Verified against `animateWalk`/`animateIdle`/`applyPhonePose`
  (they rotate limbs, they do not recolor) and the car (no runtime material edits).
- **Disposal.** Shared geometries/materials must not be individually disposed
  while other instances use them. The codebase already disposes only globally via
  `disposeAssets()`; individual humanoids/cars are not torn down mid-session.
- **Determinism preserved.** Cache keys are deterministic strings; no `Math.random`
  / `Date.now` introduced (CLAUDE.md rule).

## Gate (per CLAUDE.md, overrides standard verification)

`npx tsc --noEmit` clean **and** `npx vite build` succeeds. No tests run or
written; no dev server; no screenshots. The user then looks in-game and reads the
F3 perf HUD.

## Assumptions & Decisions (auto mode log)

- Scope of "FPS optimization" → chose **resource sharing + per-frame GC + a
  measurement HUD**, all visually/behaviorally invariant — because that is the
  cost that scales with object count and respects "prioritize content over
  rendering."
- Add a measurement tool? → chose **extend the existing F3 DebugOverlay** (no new
  dep, no new key) — because "important as we scale" requires being able to see
  the win, and reuse is lowest-risk.
- Phone screen material → chose **keep per-instance** — because it is mutated per
  character; sharing would couple all phone glows.
- Lighting / shadows / AmbientLight / preserveDrawingBuffer / logarithmicDepthBuffer
  → chose **do not touch** — visual change or breaks screenshot read-back; user
  deprioritizes rendering and likes the current look. Logged as deferred opt-ins.
- InstancedMesh for animated NPCs/cars, and LOD/quadtree → chose **defer** — large
  rewrites; not the current bottleneck.
- `renderer.info` access → chose **pass `engine.renderer` into `Game`** (one arg)
  rather than relocating the overlay — minimal coupling.
