# Filler Building Detail + Dark-Glass Tower — Design Spec

Date: 2026-06-21
Mode: autonomous-builder (`auto`). Forks self-answered; see Assumptions & Decisions.

## Problem

The `fillerBuilding` catalog object (masonry + light glassTower) reads as a flat
block: a body, a window grid, a cornice, and one rooftop box. The user wants
**more facade detail** and a **dark-glass tower** style that matches the reference
art in `assets/design-examples/` (the moody teal-blue reflective curtain-wall
storefronts/towers seen in `design-example-shop-street.png` and `-city-walk.png`).

## Goal

1. A new `darkGlass` style: a moody, dark teal-blue curtain-wall tower with bright
   reflective accent panes — the look of the glass in the reference art.
2. Richer facade detail shared across ALL styles, so even the existing masonry and
   light towers read less flat: inter-floor spandrel bands, vertical pilasters /
   mullion piers between window columns, window sills, a varied/taller parapet, and
   a more varied rooftop (water tank + AC unit + vent) instead of one box.
3. Showcase the new style by placing dark-glass towers in the map (skyline + a
   couple at street level), keeping the road and spawn corridors clear.

## Reference read (from the design folder)

- Towers in the back of `design-example-city-walk.png` / `-driving-view.png` are
  **light blue-grey** curtain walls with a fine window grid + visible vertical piers.
- Foreground storefront glass in `design-example-shop-street.png` is **dark teal**
  with a few **bright cyan/white reflection** panes — that contrast is the "dark
  glass" the user is asking for. The darkGlass style reproduces it: dark base panes,
  a minority of bright reflective panes, slim light mullions.

## Approach

All changes stay inside the existing registry contract: `defineObject` at local
origin, deterministic, every detail position derived from real dimensions
(CLAUDE.md PITFALL 3), all geometry merged into one vertex-colored mesh. No new
collider/obstacle behavior — the footprint box is unchanged.

- **Palette:** add a small set of dark-glass + detail tones (dark/bright glass,
  spandrel band, pier/mullion, rooftop tank/vent metals).
- **fillerBuilding.ts:**
  - Add `"darkGlass"` to the `style` union. It behaves like a tower (big cells,
    parapet, no ground awning) but uses the dark/bright reflective pane pair and a
    slimmer dark mullion.
  - Window grid gains: a thin **sill** slab under each window, and the reflective
    "bright pane" picked deterministically (~1 in 5) for glass styles.
  - Add **vertical pilaster piers** between window columns (derived from cellW) —
    one merged set per facade — for the curtain-wall ribbing in the art.
  - Add **inter-floor spandrel bands** (a thin proud band at each story line).
  - Replace the single rooftop box with a small **rooftop cluster** (water tank +
    AC box + vent pipe), positions derived + seeded, still optional via `roofUnit`.
  - Parapet: taller for towers/darkGlass so the silhouette reads.
- **map.ts:** convert/add placements: re-theme the 3 skyline towers (one darkGlass),
  add 1-2 darkGlass towers further back, and one darkGlass block at street level on
  the south wall. Keep clear of road (z∈[-5,1]) and spawns ((0,8)/(12,10)).

## Non-goals

- No walk-in interiors (fillers stay solid backdrops).
- No new collider shapes (one body box + one footprint rect, as today).
- No lighting/post-processing work (user prioritizes content over rendering).

## Verification

Per CLAUDE.md: `npx tsc --noEmit` clean, then `npx vite build` succeeds. No tests,
no dev server, no screenshots. User looks in-game afterward.

## Assumptions & Decisions

- New style vs recolor → **added a 3rd `style: "darkGlass"`** rather than recoloring
  the existing glassTower — because keeping `masonry`/`glassTower` untouched avoids
  regressing the already-placed buildings, and gives the user both a light and a
  dark tower to choose from.
- Scope of "more detail" → **spandrel bands + pilaster piers + sills + rooftop
  cluster + reflective bright panes**, all derived from dims — because these are the
  cheap, high-impact facade cues visible in the reference art, and merge into the
  existing single-mesh path with no perf change.
- Reflective bright-pane frequency → **~1 in 5 panes** (deterministic by row+col+seed)
  — because the art shows a sparse minority of bright reflections, not a checkerboard.
- Apply detail to masonry too? → **yes, shared** (sills + spandrels + piers + rooftop
  cluster apply to all styles; awning/storefront stays masonry-only) — because the
  user said "more details on those buildings" generally, not only towers.
- Map placement → **re-theme existing skyline + add dark-glass instances** instead of
  a large new cluster — because it showcases the style without crowding the clear
  corridors, and is easy for the user to extend.
- Collider/obstacle unchanged → kept the single body box — because none of the new
  detail extends the walkable footprint meaningfully (piers/sills are <0.15m proud).
