# rishon3d — content & stability rules

This is a Three.js + Rapier voxel game ("H&M Adventures"). The whole point of the
V1 probe is to make FUTURE content stable. Follow these rules so the classes of
bugs we already hit never recur. They are enforced by tests in `test/` — keep them
green.

## 1. NEVER place a bare cube for a prop — build a reusable object

Do NOT drop raw `BoxGeometry`/`tintedBox` cubes to represent a real thing (a phone,
a pizza, scissors, a hairdryer, a book...). Build a **reusable, configurable object**
in `src/world/objects/` (like `flower.ts`, `cake.ts`, `umbrella.ts`, `phone.ts`):

- export `make<Thing>(config): THREE.BufferGeometry` (merged, vertex-colored) and a
  `make<Thing>Mesh(config)` wrapper, built from the `objects/voxel.ts` primitives.
- give it a config with sensible defaults + color presets in `objectPalette.ts`.
- register it in `objects/index.ts` (barrel + `OBJECT_LIBRARY`) so it shows in the
  `#objects` dev catalog and can be reused anywhere.
- convention: base at y=0, grows +y, centered on x=z=0, ~1u = 1m.

Bare boxes are fine ONLY for genuine architecture (walls, floors, counters, shelves,
slabs) — not for recognizable items. If you're tempted to "just put a cube," make
the object instead.

## 2. One source of truth for placement (no drift)

Coordinates for locations, seats, doors, counters and table/chair layouts live in
`world/districtPois.ts`. Geometry builders (interiors, props, NPCs) must DERIVE from
those constants, never hand-retype them. Example: indoor chairs are built from
`INDOOR_TABLES` + `INDOOR_CHAIR_DX`, and the NPC seats are derived as
`table.x ± INDOOR_CHAIR_DX` — so a chair is always under every seat. (The floating-
diner bug came from a seat pointing at a table center instead of a chair.)
Test: `obstacles.test.ts` "indoor seats sit on real chairs".

## 3. NPCs must not walk through objects — register every chunky prop's footprint

Scripted patrons push out of `PATRON_OBSTACLES` (`world/obstacles.ts`). When you add
a chunky prop (planter, cart, tree, hedge, stand, bin...), add its footprint to that
location's `*PropObstacles()` export **in the same file** where you place the mesh,
using `rectAround(cx, cz, w, d, margin)`. obstacles.ts aggregates them.

- EXCLUDE seating (patio clusters, indoor chairs, `PARK_BENCH`) and open-shell
  interiors — those are sit/enter targets; blocking them traps patrons.
- A patron DWELL target (sit/order/wait/enter) must never be inside an obstacle.
  Test: `obstacles.test.ts` "keeps every patron sit / order / wait / enter target
  reachable".

## 4. Props must not intersect each other

Lay display items (desserts on shelves, items on counters) with real spacing — an
object is as tall/wide as its geometry, not its footprint. Tall items (ice-cream
cones, multi-tier cakes) must clear the shelf above and not sit inside a neighbor.
(The "cake inside the ice cream" bug was a tall cone flush against a shelf cake.)

## 5. Determinism

No `Math.random()` / `Date.now()` / argless `new Date()` in world/object builders —
everything must be reproducible (seed with `world/rng.ts` if randomness is needed).

## 6. Don't touch lighting / the bright sky

Per the project owner: prioritize objects/props/interiors, NOT lighting or
post-processing. `core/sky.ts` (the bright DAY look) is intentional — leave it.

## Gate

`npx tsc --noEmit` clean · `npx vitest run` all green · `npx vite build` · the
playwright smoke (`npx playwright test`) must show exactly 2 canvases and ZERO
console errors. Dev camera: `#view=x,z[,height][,dist]` (negative dist looks south).
