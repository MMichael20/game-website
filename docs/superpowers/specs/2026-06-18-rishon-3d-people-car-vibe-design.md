# Rishon 3D — People, Car & Vibe (Iteration 2) Design Spec

**Date:** 2026-06-18
**Status:** Auto-mode (autonomous-builder). Self-answered; decisions logged below.
**Branch:** worktree-3d-spike (builds on the Iteration 1 spike).
**Topic:** Make the world feel alive: real walking people, a punchier car (reverse + faster), and a golden-hour atmosphere.

## 1. Purpose

Iteration 1 proved the drive/walk feel. The user looked at it, liked it, and asked to: (a) "actually [work on] the people", (b) improve the car so it "can also drive backwards" and "drive faster", and (c) "add a bit of a vibe into it". This iteration delivers those three, staying in the same `rishon3d/` sub-project, same stack (Three.js + Rapier), still procedural primitives, still desktop-keyboard, still frontend-only.

## 2. Scope

### A. People (player + NPCs)
- **Shared low-poly humanoid** built from primitives: head, torso, two arms, two legs (a clear "person" silhouette, not a capsule). One builder `makeHumanoid(palette)` returns a `THREE.Group` plus references to the four limbs for animation. Used by BOTH the player `Character` and the `Npc`.
- **Walk animation:** legs and arms swing in opposition driven by a per-entity walk phase that advances with distance moved; idle = limbs at rest. Applied to player when moving and to NPCs while wandering.
- **NPC wander AI:** each NPC owns a home origin and a wander radius; it walks to a random reachable point within that radius, pauses briefly, picks another, forever. Targets that fall inside a building footprint (plus margin) are rejected. NPCs clamp to ground bounds. No pathfinding, no inter-NPC avoidance, no reaction to the car (out of scope — YAGNI for vibe).
- **More of them:** raise NPC count to ~6 so the streets read as populated.

### B. Car (feel)
- **Faster:** raise forward engine force so top speed is noticeably higher.
- **Real reverse:** raise reverse force so holding `KeyS`/Down from a stop actually backs the car up at a usable pace.
- **Stability:** set wheel friction for grip so the higher speed does not cause constant sliding (only if the API exists in the installed Rapier build; otherwise skip and log).
- Controls unchanged: W/Up accelerate, S/Down reverse, A/D steer, Space brake.

### C. Vibe (atmosphere)
- **Golden-hour lighting:** warm low-angle directional sun (long shadows), warm hemisphere fill, hazy warm fog with the scene background matched to the fog color so distance reads as golden haze.
- **Decorative props:** procedural **trees** (trunk + foliage) and **streetlights** (pole + emissive warm lamp head, a few with a cheap non-shadow point-light glow). Data-driven via a new `props` array on the map. Props are cosmetic (no colliders) for this iteration.

## 3. Architecture & Files

Keep the Iteration 1 boundaries. New pure-logic seams are unit-tested; visual/physics changes are covered by the existing build + smoke gate.

- **New** `src/entities/Humanoid.ts` — `makeHumanoid(palette): { group, limbs }` and `animateWalk(limbs, phase, intensity)`. Pure-ish (no scene/physics).
- **New** `src/game/wander.ts` — pure functions: `moveToward(pos, target, maxStep)`, `reachedTarget(pos, target, threshold)`, `clampToBounds(pos, half)`, `pickTarget(origin, radius, rngAngle01, rngDist01)`, `buildingRects(buildings, margin)`, `pointInRects(p, rects)`. Unit-tested.
- **Modify** `src/entities/Npc.ts` — implements `Tickable`; uses `makeHumanoid`; wanders via `wander.ts`; rejects building-blocked targets; animates limbs.
- **Modify** `src/entities/Character.ts` — uses `makeHumanoid` for its visual; advances a walk phase and calls `animateWalk` when moving. Physics/controller logic unchanged.
- **Modify** `src/entities/Car.ts` — tune `ENGINE_FORCE`, reverse fraction, optional wheel friction.
- **New** `src/world/props.ts` — `makeTree(def)`, `makeStreetLight(def)` returning `THREE.Object3D` (streetlight may add a `THREE.PointLight`).
- **Modify** `src/world/rishonMap.ts` — add `PropDef` + `props: PropDef[]`; add NPC spawns; keep `validateMap` (extend to bounds-check props).
- **Modify** `src/world/World.ts` — build props; expose `map.buildings` for NPC avoidance (already reachable via `world.map`).
- **Modify** `src/game/Game.ts` — construct NPCs as moving entities with `(origin, bounds, buildingRects)`; keep references; tick each NPC in `update`.
- **Modify** `src/core/Engine.ts` — golden-hour light/fog/background values.

## 4. Testing & Verification

- **vitest (pure):** new `test/wander.test.ts` covering `moveToward` (steps toward, never overshoots), `reachedTarget`, `clampToBounds`, `pickTarget` (deterministic for given rng inputs; lands within radius), `buildingRects` + `pointInRects` (inside/outside/margin). Existing 10 tests stay green; `rishonMap.test.ts` updated if the NPC-spawn/props assertions change counts.
- **Build gate:** `npm run build` (tsc strict + vite).
- **Smoke:** existing `npm run test:smoke` still passes (boots, Start, canvas, zero console errors) — now with moving NPCs and props in the scene.
- No faked green. If verification fails after honest debugging, STOP and report.

## 5. Assumptions & Decisions (auto-mode log)

- Approval HARD-GATE -> skipped per auto mode; self-answered and proceeding on the existing branch.
- "the people" -> chose **upgrade both player and NPCs to a shared limbed humanoid + walk animation, and give NPCs wander AI** — because static capsule+sphere figures are the least "alive" thing in the scene and the user paired this with "add a vibe".
- NPC intelligence -> chose **random bounded wander with building-footprint rejection, no pathfinding/no car reaction** — because it reads as alive at near-zero cost; smarter AI is a later iteration.
- "drive backwards" -> interpreted as **reverse exists but is too weak to overcome friction at force 28; raise reverse force** — not adding a new control (S already reverses).
- "drive faster" -> chose **raise forward engine force (and add wheel friction for grip if the API exists)** rather than imposing an artificial speed cap — top speed emerges from force vs friction.
- Exact tuning values -> chosen as a reasonable starting point and flagged tunable; play-test may adjust. Values: forward ~65, reverse ~0.7x, steer unchanged.
- "a bit of a vibe" -> chose **golden-hour lighting + warm haze + trees & streetlights** as the highest atmosphere-per-effort, and **deferred audio** — because a procedural engine/ambient sound is a larger, separable add; visual mood lands the "vibe" first.
- Props collision -> chose **cosmetic, no colliders** this iteration — to keep scope tight; can add trunk/pole colliders later.
- Streetlight lights -> chose **emissive lamp heads + a small capped number of cheap non-shadow point lights** — to suggest lit lamps without a shadow-map cost per lamp.

## 6. Out of scope / later
Audio (engine + ambient), prop colliders, NPC reactions to player/car, traffic, day/night cycle control, mobile/touch, geographically accurate Rishon, asset packs. Each its own follow-up.
