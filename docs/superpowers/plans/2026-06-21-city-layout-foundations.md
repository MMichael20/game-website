# City Layout Foundations Implementation Plan

> **For agentic workers:** This plan is executed inline in auto mode (right-sized: small, tightly-coupled pure functions). Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a declarative `src/world/layout/` layer that expands compact descriptions (grid cells, rows/grids of props, lots) into the `Placement[]` the existing engine already consumes — without touching the engine, registry, or facet contract.

**Architecture:** Pure expander functions. `grid.ts` converts integer cells to world coords; `helpers.ts` emits rows/grids/rings of placements; `lot.ts` offsets a building + lot-local props to a cell and rotates them in 90° steps (reusing `rotateXZ` from `system/transform.ts`). `map.ts` spreads these outputs alongside existing raw lines. Higher layers (`block`) are stubbed.

**Tech Stack:** TypeScript, three.js (only via existing `Placement` type), Vite.

## Global Constraints

- Determinism: no `Math.random` / `Date.now` / argless `new Date()`. (`Math.cos/sin` are fine.)
- Rotation values stay in `{0, 90, 180, 270}` degrees.
- No new tests; suite stays paused (CLAUDE.md PITFALL 2). Per-task gate: `npx tsc --noEmit` clean.
- No screenshots (PITFALL 1) — final visual check is the user in their browser.
- Work on master, no worktree/branch (user standing preference).
- Non-breaking: existing raw `MAP` lines and current render result must keep working.

---

### Task 1: Layout types + grid math

**Files:**
- Create: `src/world/layout/types.ts`
- Create: `src/world/layout/grid.ts`

**Interfaces:**
- Consumes: `Placement` from `src/world/system/types.ts`.
- Produces: `Cell`, `GridSpec`, `LotSpec`, `RowOpts`, `GridOpts`, `RingOpts` (types); `DEFAULT_GRID`, `cell(c, grid?)`, `cellRegion(c, w, h, grid?)`.

- [ ] **Step 1: Write `types.ts`**

```ts
import type { Placement } from "../system/types";

/** Integer grid cell index. */
export interface Cell { col: number; row: number; }

/** Grid placement: world origin of cell (0,0) and per-step cell size in metres. */
export interface GridSpec { originX: number; originZ: number; cellW: number; cellD: number; }

/** A lot: a building and/or props placed at a grid cell, authored in lot-local coords. */
export interface LotSpec {
  cell: Cell;
  building?: string;
  buildingParams?: Record<string, unknown>;
  rot?: number;                 // {0,90,180,270}, applied to the whole lot
  props?: Placement[];          // x,z are lot-local (relative to the cell centre)
}

export interface RowOpts {
  x: number; z: number; count: number; gap: number;
  axis?: "x" | "z"; rot?: number; params?: Record<string, unknown>;
}
export interface GridOpts {
  x: number; z: number; cols: number; rows: number; gap: number;
  gapZ?: number; rot?: number; params?: Record<string, unknown>;
}
export interface RingOpts {
  x: number; z: number; count: number; radius: number;
  rot?: number; params?: Record<string, unknown>;
}
```

- [ ] **Step 2: Write `grid.ts`**

```ts
import type { Cell, GridSpec } from "./types";

/** Default grid: origin at world (0,0), 8m square cells. */
export const DEFAULT_GRID: GridSpec = { originX: 0, originZ: 0, cellW: 8, cellD: 8 };

/** World-space centre of a single grid cell. */
export function cell(c: Cell, grid: GridSpec = DEFAULT_GRID): { x: number; z: number } {
  return { x: grid.originX + c.col * grid.cellW, z: grid.originZ + c.row * grid.cellD };
}

/** World-space centre of a w×h block of cells whose corner cell is `c`. */
export function cellRegion(
  c: Cell, w: number, h: number, grid: GridSpec = DEFAULT_GRID,
): { x: number; z: number } {
  const first = cell(c, grid);
  return { x: first.x + ((w - 1) * grid.cellW) / 2, z: first.z + ((h - 1) * grid.cellD) / 2 };
}
```

- [ ] **Step 3: Verify** — Run `npx tsc --noEmit`. Expected: clean (no errors).
- [ ] **Step 4: Commit** — `git add src/world/layout/types.ts src/world/layout/grid.ts && git commit -m "feat(layout): grid math + layout types"`

---

### Task 2: Row / grid / ring helpers

**Files:**
- Create: `src/world/layout/helpers.ts`

**Interfaces:**
- Consumes: `Placement` from `system/types`; `RowOpts`, `GridOpts`, `RingOpts` from `./types`.
- Produces: `row(kind, opts)`, `grid(kind, opts)`, `ring(kind, opts)`, each `=> Placement[]`.

- [ ] **Step 1: Write `helpers.ts`**

```ts
import type { Placement } from "../system/types";
import type { RowOpts, GridOpts, RingOpts } from "./types";

/** A straight line of `count` copies of `kind`, `gap` metres apart along one axis. */
export function row(kind: string, o: RowOpts): Placement[] {
  const out: Placement[] = [];
  const axis = o.axis ?? "x";
  for (let i = 0; i < o.count; i++) {
    const d = i * o.gap;
    out.push({
      kind,
      x: axis === "x" ? o.x + d : o.x,
      z: axis === "z" ? o.z + d : o.z,
      rot: o.rot,
      params: o.params,
    });
  }
  return out;
}

/** A cols×rows grid of `kind`: `gap` apart in x, `gapZ` (default `gap`) apart in z. */
export function grid(kind: string, o: GridOpts): Placement[] {
  const out: Placement[] = [];
  const gz = o.gapZ ?? o.gap;
  for (let r = 0; r < o.rows; r++) {
    for (let c = 0; c < o.cols; c++) {
      out.push({ kind, x: o.x + c * o.gap, z: o.z + r * gz, rot: o.rot, params: o.params });
    }
  }
  return out;
}

/** `count` copies of `kind` evenly spaced on a circle of `radius` around (x,z). */
export function ring(kind: string, o: RingOpts): Placement[] {
  const out: Placement[] = [];
  for (let i = 0; i < o.count; i++) {
    const t = (i / o.count) * Math.PI * 2;
    out.push({
      kind,
      x: o.x + Math.cos(t) * o.radius,
      z: o.z + Math.sin(t) * o.radius,
      rot: o.rot,
      params: o.params,
    });
  }
  return out;
}
```

- [ ] **Step 2: Verify** — Run `npx tsc --noEmit`. Expected: clean.
- [ ] **Step 3: Commit** — `git add src/world/layout/helpers.ts && git commit -m "feat(layout): row/grid/ring placement helpers"`

---

### Task 3: Lot expander

**Files:**
- Create: `src/world/layout/lot.ts`

**Interfaces:**
- Consumes: `Placement` from `system/types`; `LotSpec`, `GridSpec` from `./types`; `cell`, `DEFAULT_GRID` from `./grid`; `rotateXZ` from `system/transform`.
- Produces: `lot(spec, grid?) => Placement[]`.

- [ ] **Step 1: Write `lot.ts`**

```ts
import type { Placement } from "../system/types";
import type { LotSpec, GridSpec } from "./types";
import { cell, DEFAULT_GRID } from "./grid";
import { rotateXZ } from "../system/transform";

/**
 * Expand a lot into world-space placements. The building (if any) and every prop
 * are authored in lot-LOCAL coords (centre = the cell centre); each is rotated by
 * the lot's `rot` (90° increments) and offset to the lot's world cell. This is the
 * "move-together" unit: change the cell and the whole lot follows.
 */
export function lot(spec: LotSpec, grid: GridSpec = DEFAULT_GRID): Placement[] {
  const origin = cell(spec.cell, grid);
  const rot = spec.rot ?? 0;
  const out: Placement[] = [];

  const place = (
    kind: string, lx: number, lz: number, localRot: number, params?: Record<string, unknown>,
  ) => {
    const r = rotateXZ(lx, lz, rot);
    out.push({ kind, x: origin.x + r.x, z: origin.z + r.z, rot: (localRot + rot) % 360, params });
  };

  if (spec.building) place(spec.building, 0, 0, 0, spec.buildingParams);
  for (const p of spec.props ?? []) {
    place(p.kind, p.x ?? 0, p.z ?? 0, p.rot ?? 0, p.params);
  }
  return out;
}
```

- [ ] **Step 2: Verify** — Run `npx tsc --noEmit`. Expected: clean. (Confirms `rotateXZ(x, z, deg)` signature matches `system/transform.ts`.)
- [ ] **Step 3: Commit** — `git add src/world/layout/lot.ts && git commit -m "feat(layout): lot expander (building + local props -> placements)"`

---

### Task 4: Public surface + deferred block stub

**Files:**
- Create: `src/world/layout/index.ts`
- Create: `src/world/layout/block.ts`

**Interfaces:**
- Produces: barrel re-exports of `cell`, `cellRegion`, `DEFAULT_GRID`, `row`, `grid`, `ring`, `lot`, and the types.

- [ ] **Step 1: Write `index.ts`**

```ts
export { cell, cellRegion, DEFAULT_GRID } from "./grid";
export { row, grid, ring } from "./helpers";
export { lot } from "./lot";
export type { Cell, GridSpec, LotSpec, RowOpts, GridOpts, RingOpts } from "./types";
```

- [ ] **Step 2: Write `block.ts` (deferred stub)**

```ts
// DEFERRED — designed, not built. See
// docs/superpowers/specs/2026-06-21-city-layout-foundations-design.md
//
// A `block` will place a group of lots over a w×h region of grid cells and add the
// roads bounding it, returning Placement[] exactly like lot(). It will call lot()
// per parcel and a future road helper for the perimeter. Intentionally unimplemented:
// build it when a second neighbourhood is actually needed, not before (YAGNI).
export {};
```

- [ ] **Step 3: Verify** — Run `npx tsc --noEmit`. Expected: clean.
- [ ] **Step 4: Commit** — `git add src/world/layout/index.ts src/world/layout/block.ts && git commit -m "feat(layout): public barrel + deferred block stub"`

---

### Task 5: Demonstrate in map.ts (non-breaking)

**Files:**
- Modify: `src/world/map.ts`

**Interfaces:**
- Consumes: `lot` from `./layout`.

Re-express the phone shop and its west lamp via `lot()` while keeping the **exact
same world positions** (phone shop @ (-12,-16); lamp @ (-16,-7)). A tuned `GridSpec`
puts cell (0,0) at the phone shop's spot, and the lamp is its lot-local prop at
(-4, 9). The restaurant stays a raw line to prove both styles coexist. No visible change.

- [ ] **Step 1: Add the import at the top of `map.ts`**

```ts
import { lot } from "./layout";
```

- [ ] **Step 2: Replace the `phoneRepairShop` raw line and remove the west lamp line**

Find:
```ts
  { kind: "phoneRepairShop", x: -12, z: -16 },
```
and the later:
```ts
  { kind: "lamp", x: -16, z: -7 },
```
Replace the `phoneRepairShop` line with (and delete the `{ kind: "lamp", x: -16, z: -7 }` line):
```ts
  // phone-shop lot: building + its west lamp, authored as one move-together unit.
  // Custom grid puts cell (0,0) exactly at the shop's world spot; lamp is lot-local.
  ...lot(
    { cell: { col: 0, row: 0 }, building: "phoneRepairShop",
      props: [{ kind: "lamp", x: -4, z: 9 }] },
    { originX: -12, originZ: -16, cellW: 8, cellD: 8 },
  ),
```

- [ ] **Step 3: Verify types** — Run `npx tsc --noEmit`. Expected: clean.
- [ ] **Step 4: Verify boot** — Start `npx vite` (dev). Expected: server boots, no module/runtime errors in startup output; user confirms the map looks unchanged in their browser.
- [ ] **Step 5: Commit** — `git add src/world/map.ts && git commit -m "feat(world): author phone-shop as a lot() (demonstrates layout layer)"`

---

## Self-Review

**Spec coverage:** grid math (Task 1), row/grid/ring helpers (Task 2), lot move-together unit (Task 3), public surface + deferred block (Task 4), non-breaking map integration + demo (Task 5). Coordinate model, determinism, and the tsc/dev gate are all reflected. Roads/block/district correctly deferred per spec non-goals.

**Placeholder scan:** none — every step contains full code or an exact command.

**Type consistency:** `cell`/`cellRegion`/`DEFAULT_GRID` defined in Task 1 and consumed in Task 3/4; `RowOpts`/`GridOpts`/`RingOpts` defined Task 1, consumed Task 2; `lot(spec, grid?)` defined Task 3, consumed Task 5; `rotateXZ(x, z, deg)` matches `system/transform.ts`.
