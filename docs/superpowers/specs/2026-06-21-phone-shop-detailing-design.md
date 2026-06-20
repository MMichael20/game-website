# Phone Repair Shop — detailing & largeness (parity with the restaurant)

**Date:** 2026-06-21
**Status:** design (auto mode — self-brainstormed)
**Topic:** Bring `phoneRepairShop` up to the same richness and scale as `restaurant`.

## Problem

`restaurant` (`src/world/catalog/stores.ts`) is a fully dressed building: clad
exterior facade with banded courses, awning'd side windows + planters + lanterns,
rooftop HVAC, downspouts, a raised front elevation, a back alley (dumpster, crates,
bollards, dolly, utilities), a tiled interior floor, and ~15 interior fittings
(display cases, kitchen run, communal tables, café tables, coffee bar, drinks
fridge, menu board, pictures, bunting, pendants, clock, beams, plants). It is also
large: placed at `w=22, d=24, h=8`.

`phoneRepairShop` is, by contrast, almost bare: a shell, a glass storefront, one
generic counter kit, three grey shelf kits, and four phones on the counter. It uses
the default `w=18, d=14, h=6`.

The user wants the phone shop to feel as detailed and as large as the restaurant,
while still reading as the **phone-repair-shop reference image**
(`assets/design-examples/phone-repair-shop-location-v1.png`): a wide, single-storey,
street-level showroom with a tan body, a **blue** "Phone Repair" sign and **blue/white
striped awning**, a glass storefront backed by **walls of phones**, pendant lights, a
service counter with staff, and out front a **planter of shrubs + flowers**, a
**sandwich-board (A-frame) sign with a phone icon**, a **bench**, **street lamps**, and
**trees**.

## Goal

Author `phoneRepairShop` as a rich composite that matches the restaurant's fitting
count and exterior completeness, themed blue and laid out as a phone showroom +
repair bench, and enlarge it on the map. Reuse the restaurant's exterior helpers
where they fit (theming them blue), and add phone-specific interior fittings.

## Non-goals

- No raised stone podium / steps. The reference is a flat, street-level storefront,
  so the phone shop gets a flat sidewalk apron + a shallow entry stoop instead of the
  restaurant's `makeFrontElevation` podium.
- No new rendering / lighting systems (project prioritizes content over lighting).
- No tests, no dev server, no screenshots (per `CLAUDE.md` PITFALLS). Gate = `tsc`.

## Approach

Author entirely in the existing registry/manifest/engine pattern. The building gets
richer by expanding its `build()` in `stores.ts`; it gets larger and better-furnished
on the street by editing its `lot()` in `map.ts`. Follow the restaurant's structure
so the two read as siblings.

### Exterior (reuse + theme)

Generalize the restaurant's module-scoped helpers so both buildings share them:

- `makeExteriorFacade(w,d,h, accent?)` — add an optional `accent` color (the fascia
  band). Default `PALETTE.awningRed` keeps the restaurant byte-identical; phone shop
  passes `PALETTE.awningBlue`.
- `makeSideWindows(w,d,h, accent?)` — same: the side-window awnings take `accent`,
  default red. Phone shop passes blue.
- Reuse unchanged: `makePavement`, `makeRooftopUnit`, `makeSideDownspouts`,
  `makeBackUtilities`, and the inline back-alley props (roll door, service door,
  dumpster, crates, bollards, dolly).
- `storefront` (`buildings.ts`): add an optional `signColor` param (default
  `PALETTE.awningRed`) so the header sign board reads blue for the phone shop. The
  awning already takes `awningColor`.

Front treatment (new, flat — no podium):

- Reuse `makePavement(w,d)` for the sidewalk apron.
- New `makeEntryStoop(w)`: a shallow 2-step stoop at the door, rise derived from
  `FLOOR_TOP (0.3)`, so stepping from the apron up into the shop is seamless. Width
  derived from the door gap.

### Interior (new, phone-themed fittings)

All built at composite-local origin, footprints/colliders **derived from real sizes**
(CLAUDE.md pitfall #3), mirroring the restaurant's `Fitting` pattern:

- `makePhoneWallDisplay(cx,cz,len, accent)` — a backlit wall panel against the back
  wall holding a derived **grid of phones** (rows × columns from `len`), with a slim
  under-shelf glow strip. Solid collider. Several across the back wall = the "wall of
  phones".
- `makeAccessoryWall(cx,cz,len)` — a pegboard of hanging accessories (cases, chargers,
  cables as small colored boxes) over a low shelf of boxed stock. Against a wall.
- `makeDisplayIsland(cx,cz)` — a glass-topped showroom island: dark-wood base, glass
  top, a derived row of phones/tablets on little stands. A few in showroom rows.
  Solid collider.
- `makeRepairCounter(cx,cz,len)` — the main service counter: wood body + top lip, a
  register, a small parts-organizer, a magnifier/anglepoise repair lamp, a couple of
  phones lying on the top, and a low glass divider. Customer-side `counter`/`staff`
  anchors derived from it.
- `makeRepairBench(cx,cz,len)` — a technician workbench: steel top, a **tool pegboard**
  above it, parts bins, a magnifier lamp, a part-disassembled phone, a soldering iron.
  Solid collider.
- `makeWaitingArea(cx,cz)` — two chairs (reuse `makeInlineChair`) + a low table with a
  magazine/phone, near the front. Chairs are seating (anchors, not obstacles).
- `makeWallScreen(w,h, hue)` — a glowing flat digital price/ad board for the walls.

Reuse for dressing: `makeTiledFloor`, `makePendantLamp` (cool track-pendants over the
showroom), `makeTextSignMesh` (interior "Phone Repair" title, blue board),
`makeWallClock`, `makeFramedPicture` (tech posters), `makePottedPlantMesh`,
`makeWallLampMesh`, ceiling beams, welcome mat.

Tablets are just `makePhone` at a wider/shorter size — no new object.

### New reusable object

- `src/world/objects/aFrameSign.ts` → `makeAFrameSign()`: a voxel sandwich board
  (two angled boards on a hinge) with a phone icon + a couple of text lines, base at
  y=0, front +z. Registered as catalog object `aFrameSign` in `primitives.ts` so it
  can be placed as a `lot()` prop.

### Map / lot

- Enlarge: `buildingParams: { w: 22, d: 16, h: 7 }` (showroom proportions — wide,
  shallow, single storey; parity with the restaurant's 22×24 footprint).
- Keep the front face at world `z = -9`: front face `= originZ + d/2`, so with `d=16`
  set `originZ = -17`. Building spans world `x ∈ [-23, -1]` (clear of the restaurant
  at `x ∈ [5, 27]`).
- Relocate the loose street furniture (currently raw `lamp/bench/flower/planter` lines
  at `z=-7`) **into the phone-shop lot** as lot-local props so the whole frontage
  moves together: two flanking street **lamps**, a **bench**, a **planter**, a couple
  of **trees** at the back corners, and the new **aFrameSign** — all placed on the
  apron (lot-local `+z` toward the street), clear of the entry stoop and door gap.

## Components & boundaries

| Unit | Does | Used by | Depends on |
|------|------|---------|------------|
| `objects/aFrameSign.ts` | one sandwich-board mesh | catalog `aFrameSign`, lot props | voxel helpers |
| `catalog primitives: aFrameSign` | place the sign as a prop | `map.ts` lot | aFrameSign object |
| `storefront` (+`signColor`) | themed glass facade | both stores | unchanged otherwise |
| `makeExteriorFacade` (+`accent`) | clad banded facade | both stores | palette |
| `makeSideWindows` (+`accent`) | awning'd side windows | both stores | awning/glass/planter |
| phone fittings (in `stores.ts`) | showroom + repair interior | `phoneRepairShop` | voxel/phone/glass |
| `phoneRepairShop.build()` | compose all of the above | engine via MAP | all of the above |
| `map.ts` phone lot | size + frontage | engine | `lot()` |

## Verification

- `npx tsc --noEmit` clean (the **only** allowed check — `CLAUDE.md` PITFALL 2
  forbids `vite build`, dev server, tests, screenshots).
- Restaurant must be byte-unchanged in behavior: the shared helpers keep red defaults,
  so a diff of the restaurant's output is nil.
- User then looks in-game (PITFALL 1 — we do not run it).

## Assumptions & Decisions (auto-mode log)

- Isolation worktree → **skipped; work on master** — user instruction "work on master
  only" (memory + `CLAUDE.md`) overrides the autonomous-builder worktree step.
- Verification command → **`npx tsc --noEmit` only** — PITFALL 2 ("no vite build")
  overrides the looser bootstrap Gate that also mentions `vite build`. Stricter wins.
- Size → **w=22, d=16, h=7** — wide single-storey showroom; footprint parity with the
  restaurant without copying its tall 24-deep proportions, which don't match the
  reference.
- Front face position → **kept at z=-9** (`originZ=-17`) — preserves the established
  street layout (road at z=-2, sidewalk z∈[-9,-5]).
- Front style → **flat street-level apron + shallow entry stoop**, not the restaurant's
  raised stone podium — matches the phone-shop reference, which is street-level.
- Exterior theme → **blue** via generalized `accent` params with **red defaults** so
  the restaurant is untouched.
- Tablets → **reuse `makePhone`** at wider sizes; no new object — YAGNI.
- Loose street props → **moved into the phone-shop lot** for move-together framing,
  rather than left as raw lines that would overlap the enlarged apron.
- Subagent split → the self-contained `aFrameSign` object+registration goes to a
  subagent; the derivation-sensitive composite assembly in `stores.ts`/`map.ts` is
  authored in-session for reliability (pitfall #3). Logged because it deviates from a
  pure subagent-per-task split.
