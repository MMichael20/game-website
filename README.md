# H&M Adventures

A browser 3D voxel neighborhood game — walk and drive around a compact, Roblox-style
block built with Three.js + Rapier. (Formerly prototyped under `rishon3d/`; the 3D game
is now the whole project.)

## What is in the world

A single walkable neighborhood loop, built from reusable data-driven kits:

- **Player house** — your spawn / home base, with a yard, driveway and parked car.
- **Restaurant district (hero)** — a main restaurant + an adjacent cafe, both enterable
  walk-in shells, with a busy patio (umbrella tables, planters) and a bakery.
- **Phone / tech shop** — enterable, with a counter and product displays.
- **Real park** — a path loop, fountain, picnic area, benches, and greenery.
- **Hi-tech office block** — a tall blue-glass tower with a walk-in lobby, reception,
  plaza, kiosks and bike racks.
- **Streets** — roads, sidewalks, crosswalks, traffic lights and stop signs; a couple of
  decorative cars loop past.
- **Living NPCs** — scripted townspeople with varied daily itineraries and behavior types
  (diners, shoppers, park-goers, office workers, pedestrians) plus a call-a-car taxi.

## Run
    npm install
    npm run dev
    # open the printed localhost URL, click Start Game

## Controls
- WASD / Arrows: move (on foot or driving)
- Mouse: orbit camera (click canvas to capture pointer)
- Scroll: zoom
- E: enter / exit the car (stand near it)
- P: phone (call a car)
- M: toggle minimap
- Space: brake (in car)
- Esc: pause · F3: debug overlay

## Test
    npm test           # vitest unit tests (pure logic)
    npm run build      # tsc --noEmit + vite build
    npm run test:smoke # playwright boot/render smoke test

## Architecture

Three.js (rendering) + Rapier (physics, `@dimforge/rapier3d-compat`) + Vite + TypeScript.

The world is assembled from **reusable, data-driven systems** so the map can grow without
hand-placing blocks:

- **Coordinate source of truth:** `src/world/districtPois.ts` — every door/counter/seat/
  anchor lives here; geometry, colliders, NPC routes and the minimap all derive from it.
- **Location registry:** `src/world/locations.ts` — one `LocationDef[]` drives the minimap
  markers and interaction prompts (`POIS` is a projection of it).
- **Reusable objects:** `src/world/objects/` — vertex-colored, merged `make<Thing>()`
  builders (glass, awning, sign, lamp, planter, fountain, kiosk, traffic light, stop sign,
  food props, …) registered in `OBJECT_LIBRARY` (browse them at `#objects`).
- **Composable kits:** `src/world/storefront.ts` (storefront facades), `src/world/kits.ts`
  (patio sets, planter rows, bench/bin/lamp, taxi, crosswalk, plaza, counter, …) and
  `src/world/surfaceFill.ts` (deterministic greenery/pavement filling) — each returns its
  geometry *and* its NPC collision footprints together.
- **NPCs:** pure FSM (`src/game/patronRoutine.ts`) + seeded daily itineraries
  (`src/game/itinerary.ts`) + behavior types, rendered by `src/entities/Patron.ts`.

All pure logic (timestep, culling, path-following, interactions, road markings, itineraries)
is three.js-free and covered by vitest unit tests; a Playwright smoke test asserts the app
boots and renders with zero console errors.
