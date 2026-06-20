# rishon3d — world authoring (registry + manifest + engine)

Three.js + Rapier voxel game. The world is built from ONE object registry + ONE
map manifest + ONE engine. Authoring is data, not hand-wiring.

## PITFALLS — hard rules (do not violate)
1. **NO SCREENSHOTS, and DO NOT RUN THE DEV SERVER.** Never drive a browser /
   Playwright to screenshot the game, and never start `npm run dev` / `vite` to
   "verify" or "see" it — the user runs and watches it themselves. Don't run the
   game at all. Make the change, and let the user look. This overrides the run /
   verification skills.
2. **NO TESTS until the user explicitly says so.** Do not write new tests and do
   not run the test suite. The ONLY thing you may run to check your work is a
   one-shot `npx tsc --noEmit` (a typecheck, not the game). Nothing else — no
   `vite build`, no dev server, no test runner.
3. **Derive child placement from dimensions, never magic numbers.** Inside a
   composite, a sub-object's position MUST be computed from the real sizes of the
   parts (e.g. `chairDist = tableHalfDepth + chairHalfDepth + GAP`), never a
   hand-typed constant. The facet contract stops an object's own facets drifting;
   it does NOT stop bad relative placement of children. Hand-typed offsets are how
   chairs end up overlapping the table. Builders should expose their footprint so
   composites can derive from it.

## The three pieces
- `src/world/catalog/` — the OBJECT LIBRARY. Register a type with
  `defineObject(kind, { params, build })`. `build(params)` returns an `ObjectResult`
  carrying EVERY facet: `{ mesh, colliders?, obstacles?, anchors?, pois? }`.
  Composites (stores) build by composing other registry objects via `applyTransform`.
- `src/world/map.ts` — the MAP MANIFEST: a single `MAP: Placement[]`. Reading it is
  seeing the world. Each entry is `{ kind, x?, z?, rot?, params? }`.
- `src/world/system/` — the ENGINE. `buildWorld(MAP)` walks the manifest, applies each
  placement's transform to all facets, and aggregates mesh + colliders + obstacles +
  anchors + pois. `World.ts` adds the mesh to the scene and the colliders to Rapier.

## The facet contract (why this is bugless)
mesh, collider, obstacle, anchor and POI all come from one `build()`, so they cannot
drift. To add or move content you change ONE place.

## How to add an OBJECT
1. `defineObject("thing", { params: {…defaults}, build(p) { …; return result } })` in a
   `catalog/` file; import it from `catalog/index.ts`.
2. Build at LOCAL origin: centered on x=z=0, base y=0, FRONT facing +z, ~1u = 1m.
3. Return its facets in local space — the engine transforms them on placement.

## How to PLACE something
Add one line to `MAP` in `src/world/map.ts`:
`{ kind: "thing", x, z, rot, params }`. `rot` is degrees in {0, 90, 180, 270}.

## Rules
- Determinism: no `Math.random()` / `Date.now()` / argless `new Date()` in builders;
  seed via `world/rng.ts` if needed.
- Rotation is 90° increments (keeps collider/obstacle AABBs axis-aligned).
- Reuse objects: a store reuses the same counter/shelf/table the catalog offers.

## Visual target
`assets/design-examples/` — phone-repair-shop-location-v1.png, restaurant-street-v1.png,
design-example-shop-street.png (polished voxel city).

## Gate (bootstrap mode)
We are bootstrapping the new world — iterate fast. The gate is ONLY:
`npx tsc --noEmit` clean + `npx vite build` succeeds. Then the USER looks in-game
(see PITFALL 1 — no screenshots). Tests are paused entirely (PITFALL 2): none are
run or written until the user says so. The old `src/world/*` hand-builders are
retired: left in the tree, not invoked.
