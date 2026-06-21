# Terrace Row (Connected Streetwall) — Design Spec

Date: 2026-06-21
Builds on: `2026-06-21-filler-building-detail-design.md` (the `fillerBuilding` object).

## Problem

Filler buildings stand as freestanding blocks with gaps. The user wants them
**connected like a real street** — a continuous terrace of adjacent buildings
sharing party walls, with one unbroken facade line and varied rooflines/colors,
matching the reference-art streetwall.

## Decision (from brainstorm)

- **Continuous terrace row**: units butt edge-to-edge, shared side walls, flush
  front line, varied widths/heights/colors. (Not a corner-wrap, not just sliding
  existing blocks together.)
- **Mixed shopfronts**: most units get a storefront band + awning (varied awning
  colors), a few stay plain; upper floors vary in height/color/style.

## Approach

A new composite catalog object **`terraceRow`** that composes the existing
`fillerBuilding` units side by side via `buildObject` + `applyTransform`, mirroring
the `park` composite pattern. Each unit's x-position is **derived from the running
sum of prior unit widths** (CLAUDE.md PITFALL 3 — no magic offsets). All units share
one depth `d`, so front (+z) and back lines are flush.

### `terraceRow` interface
- params:
  - `units: number` — generative unit count (used when `unitSpecs` omitted).
  - `unitSpecs?: UnitSpec[]` — explicit per-unit override for hand-tuned rhythm.
  - `d: number` (shared depth), `storyH: number`.
  - `district: keyof DISTRICT_PALETTES` — body-color palette source (default `"east"`).
  - `anchor: "center" | "left" | "right"` — where the row's origin sits, so it can
    be butted exactly against an existing building edge. Default `"center"`.
  - `seed: number`.
- `UnitSpec`: `{ w, stories, bodyColor, style, ground, awningColor }`.
- **Generative variety** (deterministic from `seed`): per unit — width ~9–14m,
  height 3–6 stories, body color from the district palette, style (mostly masonry;
  ~1 in 7 a glass unit), ground (~70% storefront with a varied awning color, else
  plain). Each unit gets seed `seed + i` so its rooftop cluster varies.
- **Layout**: `totalW = Σ wᵢ`. Origin offset from `anchor`: center → units span
  `[-totalW/2, +totalW/2]`; left → `[0, totalW]`; right → `[-totalW, 0]`. Cursor
  walks left→right; each unit centered at `cursor + wᵢ/2`.
- **Party walls**: interior units render only the front facade (`faces: ["+z"]`);
  the two end units add their exposed outer side (`["+z","-x"]` leftmost,
  `["+z","+x"]` rightmost); a 1-unit row shows all three. Hidden side walls are
  blank body — leaner geometry, no seam z-fighting.
- Returns aggregated `{ mesh, colliders, obstacles }` — one body box + one footprint
  rect per unit (sufficient; abutting boxes are fine for collision).

### Small change to `fillerBuilding`
Add optional `faces?: Axis[]` param, default `["+z","+x","-x"]` (existing placements
unchanged). Windows, piers, and spandrels iterate `p.faces` instead of a hardcoded
list, so `terraceRow` can request front-only interior units.

## Map placement

- **North**: two terrace rows flanking the real stores (phone shop `x∈[-23,-1]`,
  restaurant `x∈[5,27]`), aligned to the building line (~z=-16). Left row anchored
  `"right"` just left of the phone shop; right row anchored `"left"` just right of
  the restaurant. Replaces the 4 scattered north fillers.
- **South**: one wide terrace row centered, `rot:180` (fronts face the street),
  set back at ~z=30, clear of spawns ((0,8)/(12,10)) and the park (x=-30,z=18).
  Replaces the 2 south fillers + the standalone dark-glass mid-rise.
- **Unchanged**: dark-glass skyline towers (z<-44) stay freestanding; park stays.

## Non-goals
- No corner-wrap / L-blocks. No interiors. No new collider *shapes* (per-unit boxes,
  as today). No lighting work.

## Verification
`npx tsc --noEmit` clean, then `npx vite build` succeeds. No tests/dev server/
screenshots (CLAUDE.md). User looks in-game after.

## Assumptions & Decisions
- Generative-first API with optional explicit `unitSpecs` → one-line varied blocks in
  the map, full control when wanted.
- `anchor` param → lets a row butt cleanly against existing stores without knowing its
  generated total width at map-authoring time (PITFALL-3 clean).
- Per-unit body box colliders (not one merged box) → simpler, abutting boxes collide
  fine; matches how `park` aggregates child facets.
- Front-only interior facades → leaner geometry and avoids proud-window z-fighting at
  shared walls; backs were already window-less.
