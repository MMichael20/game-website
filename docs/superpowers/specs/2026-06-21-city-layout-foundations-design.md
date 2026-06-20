# City-scale layout foundations — declarative expander layer

Date: 2026-06-21
Status: approved (auto mode — self-brainstormed)

## Problem

The world is authored as a flat, hand-typed `Placement[]` in `src/world/map.ts`
with absolute world coordinates and **manual** overlap-avoidance (see the
hand-computed building-footprint comments in that file). This tops out at a
village and has already produced bugs (twenty `tree` placements stacked on one
coordinate). To prepare for cities **without rewriting the engine**, we add a
declarative *layout* layer that expands compact descriptions into the exact
`Placement[]` the engine already consumes.

The core object system (registry + facet contract + engine) is good and stays
untouched. This work sits strictly **above** the engine, producing its input.

## Goals

- **Declarative:** describe high-level structure; code expands it deterministically
  into placements ("you describe it, code expands it").
- **Grid macro + freeform micro:** big structure snaps to a grid of cells (overlap
  impossible by design); objects *inside* a lot are placed freely in lot-local space.
- **Non-breaking:** the engine, registry, facet contract, and existing raw map lines
  all keep working. New helpers return `Placement[]` and are spread into `MAP`.
- **Foundations only:** build the bottom, useful-today layers; design the higher
  layers but do not build them yet.
- **Deterministic:** no `Math.random` / `Date.now`, consistent with the world rules.

## Non-goals (designed here, deferred to later)

- `block`, `district`, `city` layers — described in Architecture, not built now.
- Road generation — a minimal helper is optional; a full road grid is deferred.
- Runtime scaling (instancing, chunking, culling, streaming) — explicitly out of
  scope. The grid model is chosen so these can be bolted on later cheaply.

## Architecture

A layered expander that compiles down to `Placement[]`:

```
 conceptual hierarchy:   City > District > Block > Lot > Object
                                                    │
 BUILD NOW (foundations):                           │
   grid:    cell(col,row) -> world {x,z}            │  pure coord math
   helpers: row() / grid() / ring() -> Placement[]  │  repeated props, no overlap math
   lot:     lot({cell, building, rot, props}) -> Placement[]   the "move-together" unit
                                                    │
 DEFERRED (designed, stubbed):                      │
   block(...)    -> calls lot() + road helpers -> Placement[]
   district/city -> calls block() -> Placement[]
                                                    ▼
                              buildWorld(MAP)   <-- existing engine, UNCHANGED
```

### Coordinate model

Three spaces, with explicit conversions (no hidden offsets):

- **World space** — meters `(x, z)`. What the engine and existing map use. Unchanged.
- **Grid space** — integer `(col, row)`. `cell(col,row)` converts to world via a
  configurable origin and cell size: `x = originX + col*cellW`, `z = originZ + row*cellD`.
- **Lot-local space** — a lot's `props` are authored relative to the lot center
  `(0,0)`; the expander offsets each prop by the lot's world position and applies the
  lot's rotation. This mirrors how catalog composites use local space — but done in
  **data at author time** instead of inside a `build()`.

### Modules (new directory `src/world/layout/`)

Kept separate from `catalog/` (the object library) and `system/` (the engine). The
layout layer is the authoring/expansion layer that sits above both.

- `types.ts` — `Cell`, `GridSpec`, `LotSpec`, and the option types for the helpers.
- `grid.ts` — grid origin + cell size; `cell(col,row)` and `cellRegion(col,row,w,h)`.
- `helpers.ts` — `row()`, `grid()`, `ring()`, each returning `Placement[]`.
- `lot.ts` — `lot(spec)` -> `Placement[]`: offsets the building + each prop to the
  lot's world cell and applies a `{0,90,180,270}` rotation.
- `index.ts` — re-exports the public surface.
- `block.ts` — **deferred**: a documented stub describing the intended block API so
  the next layer has an obvious home. No behavior yet.

### Rotation

`lot()` reuses `rotateXZ` from `src/world/system/transform.ts` so lot-local prop
coordinates rotate exactly the way the engine rotates placements. Rotation stays in
90-degree increments, preserving the axis-aligned-AABB invariant.

### Integration with map.ts

`map.ts` keeps `export const MAP: Placement[]`. It is now *assembled* by spreading
helper/lot outputs alongside any remaining raw lines, e.g.:

```ts
export const MAP: Placement[] = [
  { kind: "ground", params: { size: GROUND_SIZE } },
  { kind: "road",   x: 0, z: -2, params: { length: 80 } },
  ...lot({ cell: { col: -1, row: -2 }, building: "phoneRepairShop",
           props: [{ kind: "lamp", x: -4, z: 9 }] }),
  { kind: "restaurant", x: 14, z: -20, params: { /* ...unchanged raw line... */ } },
  ...row("tree", { x: 30, z: -16, count: 4, gap: 4 }),
];
```

Raw placements and expanded placements coexist; nothing about the current render
result is required to change.

## Determinism

Every expander is a pure function of its arguments — no randomness, no time. The
same description always yields the same `Placement[]`, matching the world's existing
determinism contract.

## Testing / verification

Per `CLAUDE.md` PITFALL 2 the test suite stays paused and **no new tests are
written**. The gate for this work is:

1. `npx tsc --noEmit` is clean.
2. The Vite dev server boots and the existing map still renders (the user looks in
   their own browser — PITFALL 1, no screenshots).

Note: `npx vite build` currently fails on a **pre-existing, unrelated**
`index.html` inline-CSS proxy error. This work neither introduces nor fixes that;
the production-build gate is therefore reported as known-broken upstream of this
change, and `tsc` + dev-server boot is the effective gate.

## Assumptions & Decisions

- **Approach A (expander functions) vs B (one city object)** -> chose **A**.
  Incremental, non-breaking, composes bottom-up; B's monolithic schema is the
  over-engineering trap for a "foundations first" goal. B remains the natural
  graduation target if a single saveable city value is later wanted.
- **Worktree isolation vs work-on-master** -> chose **master, no worktree/branch**.
  User's explicit standing preference ("work on master only"); overrides the
  autonomous-builder isolation default per instruction priority (user > skill).
- **Test suite vs project gate** -> chose **`tsc --noEmit` + dev-server boot**.
  CLAUDE.md PITFALL 2 pauses tests; overrides the skill's "tests must pass" mandate.
- **Grid origin / cell size** -> origin at world `(0,0)`; cell size configurable via
  `GridSpec` with a sensible default. Current buildings are large, so a lot may span
  multiple cells via `cellRegion`; the default cell size is chosen to make the lot
  footprint expressible, not to force one-building-per-cell.
- **Scope of "foundations"** -> build `grid` + `helpers` (row/grid/ring) + `lot`;
  `block`/`district`/road generation are designed and stubbed only.
- **Demonstration** -> re-express one building (the phone shop) plus a small prop
  set via `lot()`, and any repeated decorations via `row()`/`grid()`, while keeping
  the visible map essentially unchanged. Proves the layer end-to-end without a
  visual regression. The restaurant stays a raw line to show both styles coexist.
- **Right-sizing the build step** -> the foundation is a small, tightly-coupled set
  of pure functions held fully in context; it is implemented directly under the
  written plan rather than fanned out to parallel subagents. Logged per auto-mode
  decision logging.
