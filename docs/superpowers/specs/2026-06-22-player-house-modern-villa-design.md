# Player house → modern villa reskin

Date: 2026-06-22
Status: design (auto-brainstormed)

## Goal

Rebuild the EXTERIOR of the hero `playerHouse` catalog object so it reads like the
reference concept `assets/design-examples/player-house-modern-villa-concept-v1.png`:
a contemporary luxury villa with asymmetric dark mono-pitch (shed) roofs, a mix of
stucco + stacked-stone + vertical wood-slat cladding, a double-height glazed entry
bay, a modern single-bay garage with wood-slat surround, an upper terrace with a
wood pergola and black railings, and a stone chimney on the right.

The walk-in interior, colliders, anchors, POIs, and the lush front/back yard already
work and broadly match the concept (paved walk, flower beds, bollard lights, trees).
They are KEPT. Only the exterior shell, roof, garage door, and a new upper terrace
change. The white perimeter fence, mailbox, driveway, yard trees, and the drivable
car are supplied by `suburbMap.ts` and are out of scope here.

## Constraints (project hard rules — see CLAUDE.md)

- LOCAL space: centered x=z=0, base y=0, FRONT faces +z, ~1u = 1m.
- Determinism: no `Math.random` / `Date.now` / `new Date()`. Variation only via
  `mulberry32(seed)` or index.
- Rotation is 90° increments; collider/obstacle AABBs stay axis-aligned.
- Derive ALL child placement from the named dimension constants at the top of
  `build()` — no hand-typed magic offsets.
- The facet contract: mesh + colliders + obstacles + anchors + pois all come from
  the single `build()`.
- Gate: `npx tsc --noEmit` clean + `npx vite build` succeeds. No tests, no dev
  server, no screenshots (user reviews in-game).

## Footprint (UNCHANGED — the map mirrors these)

`suburbMap.ts` mirrors `W=26`, `D=20`, `GAR_W=11`. Keep them so the hero lot, fences
(`0xece7da`), driveway, and spawn anchors stay aligned. Garage stays on local `-x`.

## Design

### Palette additions (`src/world/palette.ts`)

Add a named villa group (single source of truth), e.g.:

- `villaStucco` — warm cream stucco (main upper walls)
- `villaStuccoWarm` — slightly deeper tan stucco accent
- `villaStone` — beige stacked-stone veneer (entry pillar, base courses, chimney)
- `villaWood` — warm brown vertical wood-slat cladding (garage surround, accents)
- `villaRoof` — dark charcoal / near-black shed roof
- `villaSoffit` — lighter grey eave underside
- `villaDeck` — pale terrace/balcony floor stone
- `villaPergola` — pergola louver wood (matches `villaWood` family, a touch darker)

Reuse existing: `winFrame` (dark charcoal mullions), `glass` / `glassDark` (panes),
`shopGlow` (warm lit interior behind the glass bay), `lantern` (sconce glow),
`balconyRail` retired in favour of a near-black rail color (reuse `bulkhead`/`winFrame`).

### `makeShell` — facade reskin (geometry/colliders unchanged in footprint)

- Body walls switch from one seeded `bodyColor` to a deliberate MATERIAL MIX:
  - upper walls = `villaStucco`,
  - a full-height stacked-stone ENTRY PILLAR (`villaStone`) just left of the door,
    rising past the 2nd floor (matches the concept's stone column),
  - a vertical wood-slat accent panel (`villaWood`, individual battens) on the
    front to the right of the glass bay,
  - a stacked-stone base course (`villaStone`) along the ground-floor front.
- DOUBLE-HEIGHT GLASS BAY centered/right on the front (+z): a tall grid of
  `glassDark` panes over a `shopGlow` backing, divided by `winFrame` mullions,
  spanning both storeys. This replaces the old centered porch-window stack.
- Keep the walk-in centered door gap + lintel + colliders exactly as-is (interior
  and spawn depend on it). Door slab → warm wood (`facadeDoor` stays).
- Windows: wider modern dark-framed picture windows on the right (+x) and the
  ground-floor right room; keep back/left windows. Glazing frames = `winFrame`.
- Retire the small front balcony (replaced by the proper upper terrace below).

### `makeGarage` — modern single-bay door

- Replace the 3-bay up-and-over door with ONE wide modern sectional door:
  horizontal slats (`rollDoor`/charcoal) with a thin top window band, framed by
  vertical wood-slat cladding (`villaWood`) on the surround and side returns.
- Flat roof slab over the garage stays (it visually anchors the left mass).
- Walk-in (no front collider) and all other colliders unchanged. GAR_W = 11.

### `makeRoof` — asymmetric shed roofs + stone chimney

- Remove the gable, dormers, and brick gable-chimney.
- Main block: TWO stepped MONO-PITCH (shed) slabs in `villaRoof` at different
  heights with DEEP overhanging eaves and `villaSoffit` undersides — derive slope
  and eave from `W/D` and an `apex` rise constant. The higher slab sits over the
  glass-bay/entry mass, the lower over the right wing, giving the staggered modern
  silhouette.
- A stacked-stone CHIMNEY (`villaStone`) rises on the right (+x, toward -z) above
  the roof, capped with a darker block.
- Garage keeps its single mono-pitch shed slab, recolored `villaRoof`.

### `makeTerrace` — NEW upper terrace + pergola (front-right, +x/+z corner)

- A railed deck projecting forward at the 2nd-floor level over the right wing:
  `villaDeck` floor, near-black thin metal balusters/rail on the front + side,
  a wood-slat PERGOLA (horizontal `villaPergola` louvers on two posts) over the
  right end, and 1–2 potted plants (pot + foliage + bloom) on the deck.
- All positions derive from `W/D/FLOOR_H` and the deck extents. The deck overhang
  is purely visual (small floating slab) — OR carried on two slim posts down to the
  ground for believability (derive post height from `FLOOR_H`). No collider needed
  (it is above head height and not walkable); skip colliders to avoid trapping the
  player, matching how the old balcony added none.

### Interior, yard, anchors, POIs

Unchanged. The interior is independent of the facade reskin. `door` / `driveway`
anchors and the `home` POI stay. Front yard (walk, beds, bollards, trees, etc.)
stays — it already matches the concept's landscaping.

## Assumptions & Decisions

- Scope = exterior reskin only → chose KEEP interior + yard + colliders + footprint
  — because they already work and match, and changing `W/D/GAR_W` would force a
  `suburbMap.ts` mirror + fence/driveway/anchor rework for no visual gain.
- Materials → chose ADD a named `villa*` palette group rather than inline hexes —
  because palette.ts is the project's single source of truth for color.
- Randomness → chose FIX the villa body/roof colors (drop seeded BODY_CHOICES /
  ROOF_CHOICES) — because the hero should reliably match the designed concept;
  seed stays for incidental variation only.
- Terrace overhang → chose to carry the deck on two slim posts to the ground
  (believable) and add NO collider — because a head-height deck collider could trap
  the player, and the old balcony likewise added none.
- Garage door → chose ONE wide modern sectional door (concept shows a single door),
  replacing the 3-bay door, keeping GAR_W=11 and the walk-in open bay.
- Build method → chose to implement INLINE (not fan out to subagents) — because the
  exterior is one tightly-coupled unit where roof/terrace/garage all derive from the
  shared shell dimensions; splitting it risks violating the derive-from-dimensions
  rule and the facet contract.
- Isolation → chose to work ON MASTER (no worktree) — per the user's standing
  "work on master only" instruction, which overrides the generic worktree step.

## Verification

`npx tsc --noEmit` clean + `npx vite build` succeeds. Then the user looks in-game.
No tests, no dev server, no screenshots.
