# World Authoring Rewrite — Object Library + Map Manifest + Engine

**Date:** 2026-06-20
**Status:** Design approved, pending spec review
**Visual target:** `assets/design-examples/` (esp. `phone-repair-shop-location-v1.png`,
`design-example-shop-street.png`, `restaurant-street-v1.png`) — a clean, polished
voxel city: storefronts with glass + awnings + signs, lamp posts, planters with
flowers, benches, bins, trees, characters with backpacks.

## Motivation

Today a "place" (restaurant, phone shop, park) is defined by coordinates in
`districtPois.ts`, but those same coordinates are consumed *separately* by ~6
files — the mesh builder, the collider builder, the obstacle list, the POI/minimap
registry, the static people, and the NPC routes. Nothing binds them, so they are
kept in sync by hand. Moving the phone shop this session touched ~6 files + tests,
and the bug classes the current `CLAUDE.md` rules guard against (floating diner,
intersecting props, NPCs through walls) are all *drift between these copies*.

We want it to have been built the way it should have been from the start:

- **One source for objects** — a registry of parameterized object *types* (`tree`,
  `flower`, `phone`, `restaurant`, …), each defined once, reused everywhere.
- **One source for the map** — a single declarative placement list. Reading that
  one file *is* seeing the map.
- **No drift** — every facet of an object (mesh, collider, obstacle, anchor, POI)
  comes from one definition, so they cannot disagree.

## Decisions (locked during brainstorming)

- **Composites are first-class objects** (Q3 #1): `restaurant` is one library entry
  that internally places shared `table`/`chair`/`counter` objects from its params.
  The manifest stays "one line = one place."
- **Big-bang, start tiny** (Q4 #2): rebuild the world layer fresh. Do not migrate
  the old content. First slice = ground + a street + **two stores** (phone repair
  shop + restaurant) + the player, built on the new system, looking right against
  the reference images.
- **Lighten the process now, harden later:** the current 47-test suite is paused
  (quarantined, not deleted). While we are bootstrapping, the gate is `tsc` +
  `vite build` + *it looks right in-game* — not a test run after each change.
  Tests come back, focused, once we are happy with the foundation. `CLAUDE.md` is
  rewritten to describe this lighter, faster workflow.

## Architecture — three parts + one contract

### 1. Object Library (`registry`)

A registry of object *types*, each a pure, deterministic factory built at its own
local origin (centered on x=z=0, base at y=0, one canonical facing; ~1u = 1m).

```ts
defineObject("flower", {
  params: { color: "red", height: 0.34 },     // defaults
  build(p): ObjectResult { ... },
})
defineObject("restaurant", {
  params: { variant: "bakery", width: 8 },
  build(p): ObjectResult {                      // composite
    // internally calls the registry: counter(), table(), chair(), glassFront()...
  },
})
```

Primitives (`tree`, `flower`, `phone`, `lamp`, `awning`, `glassFront`,
`buildingShell`, `counter`, `table`, `chair`, `bench`, `planter`, `sign`) and
composites (`phoneRepairShop`, `restaurant`) all live here. Composites build by
calling other registry objects, so a store reuses the exact same `table`/`chair`/
`counter` used elsewhere. Existing low-level builders in `src/world/objects/*` and
`voxel.ts` are reused as the primitive implementations — we are not re-drawing
geometry from zero, we are giving it a uniform registration + facet wrapper.

### 2. The facet contract (the bug-killer)

`build(params)` returns *everything* about the object from one definition:

```ts
interface ObjectResult {
  mesh: THREE.Object3D;          // merged, vertex-colored geometry (local space)
  colliders?: Box[];             // solid collision boxes (walls, body) — local space
  obstacles?: Rect[];            // NPC-avoid footprints — local space
  anchors?: Record<string, Vec2 | Seat>;  // named points: door, seats, counter, staff
  pois?: PoiSpec[];              // minimap / interaction entries (kind, label, radius)
}
```

Because mesh + collider + obstacle + anchor + POI all derive from the same
`params`, they cannot drift. The anti-drift `CLAUDE.md` rules become structurally
enforced instead of test-enforced.

### 3. Local origin + transform

Objects are built in **local space**. The map places each with a transform
`{ x, z, rot }`. A single `applyTransform(result, transform)` helper rotates +
translates the mesh **and** the collider boxes, obstacle rects, anchors, and POIs
together — so moving/rotating/duplicating an object is changing numbers, with no
per-object hacks (this replaces things like the phone-shop 180° flip).

### 4. Map Manifest

One data file that *is* the map:

```ts
export const MAP: Placement[] = [
  { kind: "ground" },
  { kind: "road", x: 95, z: 109, length: 60 },
  { kind: "phoneRepairShop", x: 95, z: 96, rot: 0 },
  { kind: "restaurant", x: 75, z: 96, rot: 0, params: { variant: "bakery" } },
  { kind: "tree", x: 110, z: 100 },
  { kind: "flower", x: 111, z: 101, params: { color: "red" } },
]
```

`Placement = { kind: string; x?: number; z?: number; rot?: number; params?: object }`.

### 5. The Engine

`buildWorld(MAP)` walks the manifest, calls each object's `build(params)`, applies
its transform, and aggregates into three outputs:

- a `THREE.Group` of all meshes → added to the scene,
- a flat `Box[]` of all colliders → handed to Rapier as fixed cuboids,
- aggregated `obstacles`, `anchors`, `pois` → handed to AI / minimap / interaction.

This one loop replaces the scattered hand-assembly in `restaurantStreet.ts` etc.

## Scope: keep vs rebuild vs retire

- **Keep (unchanged):** the runtime — `core/` (scene, follow-camera, Rapier
  physics, sky, input), the player `Character`, the camera/timestep math. These
  work and are not the complaint.
- **Keep & reuse:** `src/world/objects/*` and `voxel.ts` low-level geometry
  builders, wrapped by the registry. `roads.ts` texture helpers.
- **Rebuild (new):** `registry.ts`, `manifest.ts`, `engine.ts`, `transform.ts`,
  the two composite store objects, and the rewiring of `World.ts` to call the
  engine.
- **Retire (set aside, not precious):** the hand-assembly + scattered sources —
  `restaurantStreet.ts`, `secondaryLocations.ts`, `districtPois.ts`,
  `restaurantColliders.ts`, `obstacles.ts`, the per-location interior builders,
  `staticPeople.ts`, `patronRoutine.ts`. Removed from the live path; left in the
  tree (or a `_legacy/` folder) until the new world surpasses them, then deleted.

## First slice (definition of done for step 1)

- The game boots into a small scene from the new engine: ground + one street +
  **phone repair shop** + **restaurant**, both as composite registry objects, with
  the player able to walk around (collisions work via the facet colliders).
- The two stores read well against `assets/design-examples/`.
- Authoring proof: moving a store is editing one `{x,z,rot}` in `manifest.ts`;
  adding a tree is one line.
- Gate met: `tsc` clean, `vite build` succeeds, looks right in-game.

NPC patrons, minimap wiring, and the rest of the old content are **out of scope**
for slice #1 — added incrementally once the foundation feels good.

## Process change ("clean our way of working")

- **Quarantine tests now.** Move `test/` aside (e.g. `test/_legacy/`) and exclude
  from the dev loop so iteration is fast. We do **not** run tests after each change
  while bootstrapping — that cadence is for production, not for starting things up.
- **New gate while bootstrapping:** `tsc --noEmit` clean + `vite build` + visual
  check in-game.
- **Rewrite `CLAUDE.md`** for the new, faster workflow. New contents:
  - The registry / manifest / engine model and the facet contract.
  - "How to add an object" (define in registry, return facets) and "how to place
    one" (one line in the manifest).
  - Determinism rule stays (no `Math.random`/`Date.now` in builders; seed via rng).
  - Visual target points at `assets/design-examples/`.
  - Drop the obsolete anti-drift rules (single-source-of-placement, register
    footprints, derive seats) — now automatic via the facet contract.
  - State the lighter gate; note that focused tests return once the foundation is
    stable and the game heads toward production.

## Non-goals (YAGNI for now)

- Visual in-browser map editor — deferred; the manifest is the data layer it would
  later sit on, but we are not building the editor now.
- Re-creating all old content (office, park, taxi, cafe, NPC routines) — comes
  back incrementally, not in slice #1.
- A comprehensive new test suite — added later, focused, when we are happy.

## Risks / notes

- No test safety net during the rewrite is an accepted, deliberate trade for speed
  (user decision). The facet contract + `tsc` + visual checks are the guardrails.
- Determinism must be preserved in builders so scenes are reproducible.
- The transform helper must handle rotation of colliders/anchors correctly (the
  one piece of non-trivial math); it gets a tiny focused test even during the
  light phase, since it underpins correctness of every placement.
