# Rishon3D — Reusable Configurable Object Library (design)

Date: 2026-06-19
Branch: worktree-3d-spike (NOT merged / NOT deployed)

## Problem

The scene reads well at city scale, but close-up the *props are single colored
cubes*: planter "flowers" are a stem-box + one cube, food is cubes, umbrellas are
stacked shrinking square rings (a ziggurat, not an umbrella), and cars are two
stacked boxes. The user wants **real, multi-part modeled objects** — flowers,
cakes, ice creams, etc. — and crucially a **reusable, configurable library** of
them (tunable colors / counts / sizes / variants) so they can be authored once
and dropped anywhere later. "Not just squares — more detail. This is the whole
difference." Also: one restaurant is still a closed facade (missing interior).

Style stays voxel-daytime (blocky, saturated, bright sky). NOT in scope:
lighting, camera, post-processing, render grade.

## Goal

A `src/world/objects/` library of detailed, parameterized voxel object factories,
plus reworked umbrellas and cars, plus a dev preview to inspect them, plus their
use in the live restaurant scene, plus the one missing interior built from them.

## Architecture

- `objects/voxel.ts` — shared low-level builders so every object is consistent and
  merges to one draw call:
  - `tintedBox(w,h,d,x,y,z,hex)` — vertex-colored box (centralized; the per-file
    copies in restaurantStreet/restaurantInterior/secondaryLocations can migrate later).
  - `tintGeo(geo, hex)` — bake one color into any geometry's vertices.
  - `lowPolyBall(r, x,y,z, hex, detail=0)` — chunky icosahedron for organic blobs
    (ice-cream scoops, cherries, flower centers, berries).
  - `cone(rBottom, rTop, h, x,y,z, hex, seg=8)` — low-poly cone/frustum (ice-cream
    cone, umbrella canopy, hats).
  - `cylinderY(r,h,x,y,z,hex,seg=10)` — posts, cups, cake tiers.
  - `mergeTinted(parts): BufferGeometry` and `tintedMesh(geo)` — merge + the shared
    `MeshStandardMaterial({ vertexColors:true })`.
  All builders return THREE geometry; colors are baked as vertex colors so a whole
  object is one geometry / one material, instanceable.
- `objects/objectPalette.ts` — food/object color sets (cake sponge/frosting, ice
  cream flavors, donut glaze, drink colors, petal sets). Kept separate from the
  city `palette.ts` so object colors don't bloat the world palette.
- Each object module exports `XxxConfig` (all fields optional, sensible defaults)
  and `makeXxx(cfg?): THREE.BufferGeometry`. A `makeXxxMesh(cfg?)` convenience
  wraps it in a `tintedMesh`. Deterministic (no RNG; variety via config/seed index).
- `objects/index.ts` — barrel re-export + an `OBJECTS` registry (name -> factory +
  default config) consumed by the dev preview and future placement tools.
- `#objects` dev route in `main.ts` (mirrors the existing `#char` preview): lays out
  one of each object plus a few color variants on a turntable row for visual QA and
  as living documentation of the library. Reused for all future object work.

## Objects (v1)

Each is multi-part and configurable:

- **flower** — stem, 1-2 angled leaves, a ring of `petalCount` petals around a
  `lowPolyBall` center; config: petalColor, centerColor, stemColor, leafColor,
  height, petalCount.
- **pottedPlant** — terracotta/`potColor` pot + soil + leaf clumps + optional
  flowers (reuses `makeFlower`); config: potColor, bloom (bool), flowerColor.
- **cake** — round plate, `tiers` sponge layers with cream bands between, top
  frosting, `cherry`, optional cut `slice`; config: spongeColor, frostingColor,
  plateColor, cherryColor, tiers, cherry, slice.
- **cupcake** — fluted wrapper (tapered, ribbed), domed swirl frosting, sprinkle
  dots / cherry; config: wrapperColor, frostingColor, sprinkleColors, cherry.
- **donut** — torus-ish ring (8 segment boxes), glaze top ring, sprinkles; config:
  doughColor, glazeColor, sprinkleColors.
- **iceCream** — waffle `cone` (cross-hatch via two tints), 1-3 stacked `lowPolyBall`
  scoops in `flavors[]`, optional cherry + drip; config: coneColor, flavors[], cherry.
- **drinkCup** — tapered cup, lid, dome lid + straw, optional band/logo; config:
  cupColor, lidColor, strawColor, drink (iced bool).
- **umbrella** (rework) — central pole, hub, `ribs` radial ribs, paneled canopy
  (hex `cone` with alternating two-tone panels), scalloped valance, finial; config:
  colorA, colorB, ribs, radius, height.
- **car** (detail pass on `entities/carMesh.ts`) — lower body + separate cabin
  greenhouse with raked pillars, hood/trunk, windshield + side + rear glass (dark),
  headlights + taillights, grille, front/rear bumpers, side mirrors, door-seam
  inset, license plate, hubcap wheels; config: bodyColor + `variant`
  ('sedan'|'hatch'|'van'|'taxi'). Physics collider in Car.ts stays untouched.

## Scene integration

- restaurantStreet: replace `umbrellaGeo` with `makeUmbrella`; replace planter
  `flowerSprig` blooms with `makeFlower`; add a **dessert display cart** on the
  promenade showing cakes / cupcakes / donuts / ice creams (showcases the library
  in-scene immediately).
- The missing interior: open the **west restaurant** as a **bakery-café** — a new
  `bakeryInterior.ts` with a glass dessert case full of the new objects + counter +
  tables. Add its walk-in wall colliders (reuse `shellWalls`) and flip its
  `open`/kind so it is enterable. (The east restaurant staying a facade is logged as
  a follow-up.)
- carMesh detail flows automatically to Car/RideCar/NpcCar/parkedCars/taxi.

## Verification

- `tsc --noEmit`, full `vitest` (unit tests per object: config changes geometry,
  bbox within expected envelope, deterministic, >0 positive-extent parts), `npm run
  build`, Playwright `test:smoke`.
- **Visual**: screenshot `#objects` preview (must look like the named objects, not
  cubes) and an in-scene shot of the promenade (new umbrellas + flowers + dessert
  cart). Iterate on anything that still reads as a cube. This gate is mandatory —
  the whole point is visual fidelity.

## Assumptions & Decisions (auto mode — self-answered)

- Object return type → **vertex-colored merged BufferGeometry** (+ mesh helper) —
  because it matches the existing merged/instanced pattern and keeps each object at
  one draw call while staying recolorable per-config.
- Blocky-only vs. a few rounded primitives → **allow low-poly icosahedron/cone/cyl**
  for organic bits — because cube-only flowers/cakes/ice-creams read poorly; chunky
  low-poly keeps the voxel feel while actually looking like the object.
- Object color source → **separate `objectPalette.ts`** — because food/flavor colors
  are object-scoped and shouldn't bloat the city `palette.ts`.
- Config style → **all-optional config interface with defaults** — because callers
  should get a good object from `makeX()` yet tune any field for reuse/variety.
- Which missing interior → **open the west restaurant as a bakery-café** showcasing
  the new dessert objects — because it resolves "one interior missing" and exercises
  the library; the east restaurant staying closed is logged as a follow-up.
- Car collider → **left untouched**; detail is visual-only on the mesh — because
  changing the cuboid would alter driving physics (out of scope).
- Centralizing `tintedBox` → **add the canonical one in `voxel.ts`; do NOT mass-migrate**
  the existing per-file copies this pass — because a sweeping refactor risks the
  working scene; migration is a low-priority follow-up.
- Build orchestration → **lay `voxel.ts`/`objectPalette.ts` foundation first, then
  fan out object modules to file-disjoint subagents**, integrate + visually verify
  centrally — because the objects share the foundation but are otherwise independent.
