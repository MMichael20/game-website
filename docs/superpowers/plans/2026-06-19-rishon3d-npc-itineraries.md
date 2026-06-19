# Plan — Varied NPC Daily Itineraries

Spec: docs/superpowers/specs/2026-06-19-rishon3d-npc-itineraries-design.md
Branch: worktree-3d-spike (NOT merged/deployed)

1. `src/game/itinerary.ts` (pure): activity legs (dineRestaurant, browseBakery,
   browsePhone, outdoorDine, visitPark, crossStreet, stroll, waitTaxi) +
   `buildItinerary(seed, count)` that mulberry32-shuffles the pool, takes `count`,
   concatenates legs (+ inter-stop strolls) into one looping route with a rolled speed.
2. `test/itinerary.test.ts`: deterministic per seed; seeds differ; >=2 distinct
   activities; only-real activity names + sane speed; finite coords; drives a
   looping patron that never finishes and sits when its routine has a sit-down.
3. `entities/Patron.ts` `spawnPatrons`: 12 patrons, each from a unique seeded
   itinerary, looped, staggered. FSM + entity unchanged.
4. Verify: tsc, full vitest, build, smoke, in-game screenshot.

Done when all gates green + screenshot-confirmed.
