# Filler buildings & parks — design

Date: 2026-06-21
Status: design (autonomous mode — self-brainstormed)

## Goal

Add **decorative "filler" content** that makes the city read as a continuous,
lived-in street rather than two lonely shops floating on grass — matching the
voxel-city reference shots (`design-example-city-walk.png`,
`design-example-driving-view.png`, `design-example-park-plaza.png`). Two new
families of content:

1. **Filler buildings** — multi-story blocks with NO walk-in interior, present
   purely for the skyline/streetwall. Colorful mid-rise "masonry" blocks for the
   streetwall and tall cool "glass towers" for the background skyline.
2. **Parks** — a paved plaza with stone-bordered grass beds, trees, flower
   clusters, benches, lamps, and a central fountain.

These are backdrop, not gameplay: a player can't enter them. They block movement
(solid colliders) and NPC pathing (obstacle rects), exactly like the existing
`tree`/`lamp` props.

## Non-goals (YAGNI)

- No interiors, no doors that open, no POIs/anchors on fillers (they're scenery).
- No procedural city generator. We hand-place a handful via `MAP`, using the
  same `lot()`/raw-placement patterns already in `map.ts`.
- No new lighting/post-processing (per [[rishon3d-prioritize-content-over-rendering]] —
  content fidelity, not rendering).
- No moving cars/NPCs in the background (the examples show them, but that's a
  separate system; out of scope here).

## Approach

Author **three new catalog objects** + place them in `MAP`. All follow the
registry contract (one `build(p)` returns `{ mesh, colliders?, obstacles? }`),
local space (centered x=z=0, base y=0, front +z, 1u≈1m), fully deterministic.

### 1. `fillerBuilding` — `src/world/catalog/fillerBuilding.ts`

A parametric solid block with baked-on facade detail. Windows are **opaque
vertex-colored boxes** (not transparent panes): the reference art uses flat
stylized windows, and baking them keeps the whole building to a couple of draw
calls — important because we'll place many.

Params (all with sensible defaults):

| param | default | meaning |
|-------|---------|---------|
| `w` | 10 | width (x) |
| `d` | 9 | depth (z) |
| `stories` | 3 | floor count |
| `storyH` | 3.0 | metres per floor (total height = `stories*storyH`) |
| `bodyColor` | `BUILDING_COLORS[0]` | wall color |
| `style` | `"masonry"` | `"masonry"` \| `"glassTower"` |
| `ground` | `"plain"` | `"plain"` \| `"storefront"` \| `"none"` — ground-floor treatment |
| `awningColor` | `PALETTE.awningBlue` | awning color when `ground:"storefront"` |
| `roofUnit` | `true` | small rooftop box (AC/stairwell) for silhouette |
| `seed` | `1` | deterministic variation (window-tint alternation, awning side) |

Build:

- **Body**: one `tintedBox(w, totalH, d)` in `bodyColor`.
- **Base plinth**: a short `stoneBase` band at the bottom, slightly proud.
- **Window grid**: derived from dimensions — `cols` from `w` (≈ one window per
  2.2 m, min 2), one row per story. For each cell, a light `frame` box proud of
  the wall + an inset `glass`/`glassDark` pane box (alternating for life).
  Applied to the **front (+z)** and **both sides (±x)**. Back (−z) left plain
  (fillers abut other buildings / the map edge). Window rect, margins, and sill
  height are all computed from `w`/`d`/`storyH` — **no hand-typed offsets**
  (PITFALL 3).
- **Cornice**: a thin band slightly wider than the body (`cornice` color) at the
  top.
- **Roof**: flat `roofCap` slab; if `roofUnit`, a small box offset on top.
- **`style:"masonry"`**: warm body color, punched windows + cornice as above.
  When `ground:"storefront"`, the ground floor gets a recessed dark glass band +
  a striped `makeAwning(...)` across the front (reusing the existing helper).
- **`style:"glassTower"`**: cool body (`officeGlass`-ish), a uniform full-height
  curtain-wall grid (thin frames, larger glass cells), a flat parapet instead of
  a cornice, no awning. Taller by default at the call site (more `stories`).
- **Colliders**: ONE solid box covering the full footprint+height
  (`w × totalH × d`) — backdrop is impassable.
- **Obstacles**: one rect `w × d` so NPCs route around it.

### 2. `fountain` — register in `src/world/catalog/primitives.ts`

Thin wrapper exposing the existing `makeFountain()` helper as a placeable kind so
both the park and the map can use it. Params `{ r: 1.4, tiers: 2 }`. Returns the
fountain mesh + a box collider (basin footprint, derived from `r`) + an obstacle
rect (`2r × 2r`).

### 3. `park` — `src/world/catalog/park.ts`

A composite plaza built by composing existing catalog objects via
`buildObject` + `applyTransform` (same pattern as the stores' `compose()`).

Params: `{ w: 26, d: 20, fountain: true, seed: 1 }`.

Build (everything derived from `w`/`d`):

- **Paved base**: a thin `sidewalk`-colored slab `w × d` at y≈0.03 (the plaza
  floor over the grass).
- **Grass beds**: a 2×2 grid of raised beds, sized from `w`/`d` minus a central
  cross-path and a perimeter path. Each bed = a low `stoneBase` rim box + an
  inset `parkGrass` top, with a few `flower`s and one `tree` per bed (positions
  derived from the bed rect; seeded jitter via `mulberry32(seed)` only for which
  flower color, never for geometry that must stay aligned).
- **Central fountain** (if `fountain`): `fountain` kind placed at center.
- **Benches**: along the central paths, facing the path (seat anchors not needed —
  scenery).
- **Lamps**: at the four outer corners.
- **Colliders/obstacles**: aggregated from the composed children (rims, fountain,
  trees, lamps, benches). The open paved paths stay walkable.

### Map placement — `src/world/map.ts`

Extend the existing street into a streetwall + skyline + a park, **keeping clear
corridors** around `PLAYER_SPAWN (0,8)`, `CAR_SPAWN (12,10)`, and the road
(z∈[-5,1]). Documented existing footprints: phone shop x∈[-23,-1] front z=-9;
restaurant x∈[5,27] front z≈-12.

- **North streetwall (same side as the stores, front +z toward the street):**
  2 `masonry` fillers to the left of the phone shop (x < -23) and 2 to the right
  of the restaurant (x > 27), on the building line (front face ≈ z=-9), varied
  colors/heights. Some with `ground:"storefront"` for awnings.
- **Skyline towers:** 3–4 `glassTower` fillers set well back (z ≈ -42), tall
  (5–7 stories), spanning x, as a pure backdrop behind the streetwall.
- **South streetwall + park:** across the road on the +z side, set back to z ≈
  +24 (behind spawn): a couple of `masonry` fillers facing -z (rot 180) on the
  far left/right, and one **`park`** placed clear of spawn (e.g. centered around
  x ≈ -30, z ≈ 16, well left of the spawn corridor).

Exact coordinates are computed at wiring time from the rule "stay clear of the
road and both spawns"; the build step lists the final numbers.

## Assumptions & Decisions (autonomous — self-resolved forks)

- Worktree isolation → **chose: work directly on master, no worktree** — the
  logged user preference [[work-on-master-only]] (no branches/worktrees) overrides
  the autonomous-builder default; the work is additive and low-risk.
- Filler = walk-in shell or solid block? → **chose: solid block with a single
  footprint collider** — they're pure backdrop; reusing `buildingShell` (hollow,
  walk-in) would be wrong and heavier.
- Windows: transparent panes vs baked opaque boxes? → **chose: baked opaque
  vertex-colored boxes** — reference art is flat/stylized and we place many
  buildings; keeps draw calls low. Real glass panes reserved for actual
  storefronts.
- One object with a `style` param vs two objects (block + tower)? → **chose: one
  `fillerBuilding` with `style: "masonry" | "glassTower"`** — smaller surface
  area; towers are just tall glass fillers.
- Skyline towers as billboards/sprites vs real geometry? → **chose: real low-poly
  geometry** — consistent with the all-voxel world; cheap enough at this count.
- Park: composite object vs loose `lot()` props? → **chose: a `park` composite
  object** — encapsulates the beds+paths+fountain as one placeable unit, matching
  the registry "one build returns all facets" philosophy; reuses `tree`/`bench`/
  `lamp`/`flower`/`fountain`.
- Fountain: inline in park vs registered kind? → **chose: register a `fountain`
  kind** wrapping the existing `makeFountain()` — reusable by both park and map,
  no duplicated geometry.
- Park placement vs spawn → **chose: offset the park to the south-west (clear of
  the (0,8)/(12,10) spawn corridor)** rather than directly across the road, so it
  never traps the player or car at spawn.
- Determinism → **chose: `mulberry32(seed)` only for cosmetic choices** (flower
  color, window-tint alternation); all structural geometry derived from
  dimensions, never random — satisfies the determinism rule and PITFALL 3.

## Verification gate

Per CLAUDE.md bootstrap gate: `npx tsc --noEmit` clean **and** `npx vite build`
succeeds. NO tests, NO dev server, NO screenshots — the user looks in-game.
