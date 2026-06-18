# Rishon 3D — Stabilize & Expand — Design

Date: 2026-06-18
Branch: `worktree-3d-spike`
Mode: autonomous-builder (`auto`)

## Goal

Two-part effort on the `rishon3d` spike:

1. **Stabilize the architecture** so the game can grow without becoming fragile or
   slow.
2. **Expand the content**: a larger world with multiple districts ("more cities"),
   NPC traffic (cars), and decorative life — trees, bushes, cats, dogs, and more
   pedestrians.

The spike must stay a self-contained, throwaway-able vertical slice. No merge to
`master`, no deploy.

## Context (current state)

- `World` constructor does everything inline: ground, roads, buildings, props, point
  lights. Map is a single flat 120x120 plane defined in `rishonMap.ts`.
- Every prop (`makeTree`, `makeStreetLight`) and every humanoid builds its **own**
  geometry + material. With hundreds of props this means hundreds of draw calls and
  redundant GPU allocations — the main scaling risk.
- `Game` manually instantiates `Character`, `Car`, and a fixed `npcs[]` array, and
  ticks them by hand. Adding new entity types means editing this wiring each time.
- Physics steps on a **variable** timestep (`Math.min(dt, 1/30)`), which makes the
  vehicle controller jittery under frame-rate variance — a real stability issue.
- NPC people use a clean, unit-tested pure-logic wander module (`wander.ts`). This is
  the pattern to reuse for new agents.
- Baseline is green: 20 vitest tests pass, `npm run build` succeeds, smoke test exists.

## Architecture decisions

### Part A — Stability (foundations first)

1. **Fixed-timestep physics accumulator.** Replace the variable-step call with an
   accumulator that steps physics in fixed 1/60s increments inside `Physics.step(dt)`
   (clamping the number of substeps to avoid spiral-of-death). Deterministic,
   smoother vehicle behavior. Pure accumulator logic extracted to a testable function.

2. **Shared asset cache (`src/world/assets.ts`).** A small module that lazily creates
   and memoizes shared `BufferGeometry` and `Material` instances by key. Prop builders
   pull from it instead of `new`-ing per call. Cuts material/geometry count from
   O(props) to O(distinct kinds). Includes a `disposeAssets()` for teardown hygiene.

3. **Instanced static props (`src/world/InstancedProps.ts`).** Decorative, non-moving,
   identical-mesh props (trees, bushes, streetlight poles) render through
   `THREE.InstancedMesh` — one draw call per kind regardless of count. A builder takes
   a list of placements `{x, z, rotationY, scale}` and returns the instanced meshes.

4. **Entity registry / spawner (`src/game/EntityManager.ts`).** A registry that owns a
   list of `Tickable` agents (NPC people, NPC cars, animals), updates them in one
   loop, and supports a per-frame **update budget / distance culling** so large
   populations stay cheap (agents far from the camera tick less often / skip
   animation). `Game` delegates population updates to it instead of hand-rolled arrays.

### Part B — World expansion

5. **District/city data model (`src/world/districts.ts`).** The map becomes a list of
   **districts**, each a named region with a center, footprint size, a road grid, and
   a building style (palette + height range + density). The total ground grows to hold
   them (target ~280x280). Districts are connected by arterial roads so you can drive
   between them.

6. **Procedural block generator (`src/world/cityGen.ts`).** Pure functions that, given
   a district spec and a seeded RNG, lay out a grid of streets and place buildings in
   the blocks between them, leaving road corridors clear and respecting a margin from
   intersections. Returns `BuildingDef[] / RoadDef[] / PropDef[]` — fully testable
   without three.js. A **seeded RNG** (`mulberry32`) keeps generation deterministic
   (reproducible, testable, no `Math.random` in pure code).

7. **New prop + creature builders.** Extend `props.ts` with `makeBush`, and add
   `src/entities/Animal.ts` for low-poly quadrupeds (cat = small/grey, dog =
   medium/brown) built from boxes + the shared asset cache. Pedestrians keep using the
   existing `Humanoid`. Animals reuse the `wander` module with small radii and slower
   speeds.

### Part C — Dynamic content

8. **NPC cars (`src/entities/NpcCar.ts` + `src/game/pathFollow.ts`).** Kinematic, *not*
   physics vehicles — many Rapier vehicles would be expensive and unstable. Each NPC
   car follows a closed **route** (ordered list of waypoints along road lanes) at a
   set speed, easing its heading toward the next waypoint. The path-following math
   (advance-along-route, heading interpolation, waypoint arrival, loop wrap) lives in a
   pure, unit-tested module `pathFollow.ts`. Routes are derived from the district road
   grid. NPC cars do not physically collide with the player (decorative traffic); they
   simply slow/stop logic is out of scope for this pass (documented assumption).

9. **Populate the world.** Scatter pedestrians, cats, and dogs across districts and run
   NPC cars on the arterial loops — all created through the EntityManager and capped by
   explicit budget constants so totals stay controlled.

## Module boundaries (what depends on what)

```
core/Physics      <- accumulator (pure: stepAccumulator)
world/assets      <- shared geom/material cache (no deps)
world/props       -> assets
world/InstancedProps -> assets
world/cityGen     <- pure (seeded RNG, no three) -> districts types
world/districts   <- data + types
world/World       -> builders, props, InstancedProps, cityGen, districts
entities/Animal   -> assets, Humanoid pattern, wander
entities/NpcCar   -> pathFollow (pure)
game/pathFollow   <- pure (no three)
game/EntityManager -> Tickable
game/Game         -> EntityManager, entities
```

Pure/testable modules (no three.js, no DOM): `cityGen`, `pathFollow`, the physics
accumulator function, plus existing `wander`, `cameraMath`, `InteractionSystem`.

## Testing strategy

- **Unit (vitest), TDD where logic is non-trivial:**
  - `cityGen`: deterministic output for a seed; buildings never overlap road
    corridors; placements stay inside district bounds; building ids unique.
  - `pathFollow`: advances toward next waypoint, wraps at route end, arrival
    detection, heading eases the short way around the circle.
  - physics accumulator: correct substep count, clamps the max, carries remainder.
  - `districts` / map validation: extend `validateMap` to cover multi-district maps
    (spawns in bounds, exactly one house preserved, no spawn inside a building across
    all districts).
- **Build:** `tsc --noEmit && vite build` must pass.
- **Smoke (playwright):** existing boot/render test must still pass after the bigger
  scene.

## Out of scope (YAGNI)

- NPC car ↔ player collision / traffic rules / signals.
- Pathfinding / navmesh — animals and people keep simple wander; cars follow fixed
  routes.
- GLTF / external art assets — everything stays procedural primitives.
- Asset streaming / chunked loading — one static scene built at boot.
- Day/night cycle, sound, save/load.

## Assumptions & Decisions (auto-mode log)

- "More cities" scope → chose **multiple connected districts on one larger ground
  (~280x280)** rather than separate disconnected maps — keeps one seamless drivable
  world and one physics world, much simpler and still reads as "more city."
- City layout → chose **seeded procedural block generator** over hand-placing every
  building — scales to many districts and is unit-testable; keeps the original
  hand-authored downtown as one district for character.
- NPC cars → chose **kinematic waypoint-following** over Rapier physics vehicles —
  many physics vehicles are expensive and prone to instability; kinematic traffic is
  cheap, deterministic, and testable.
- NPC car collisions → chose **decorative (no physical collision with player)** for
  this pass — full traffic interaction is a large separate feature; logged as out of
  scope.
- Animals → chose **reuse the existing wander module** with small radius/speed and
  new quadruped meshes rather than new AI — least new code, consistent behavior.
- Performance for large populations → chose **InstancedMesh for static props +
  distance-based update budget for agents** as the two scaling levers.
- RNG → chose a **seeded `mulberry32`** in pure generators so output is deterministic
  and tests are stable (no `Math.random` in pure modules).
- Physics stability → chose a **fixed-timestep accumulator (1/60)** over the current
  variable clamped step for smoother, deterministic vehicle motion.
- Did NOT merge or deploy — work stays on `worktree-3d-spike` per auto-mode rules.
