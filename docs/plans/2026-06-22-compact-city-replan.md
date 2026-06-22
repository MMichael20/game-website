# Compact City Re-plan — Implementation Plan

Spec: `docs/superpowers/specs/2026-06-22-compact-city-replan-design.md`
Scope: data-only rewrite of `src/world/map.ts`. No catalog/engine/runtime changes.

## Gate
- `npx tsc --noEmit` clean.
- `npx vite build` succeeds.
- (No tests — bootstrap mode. User looks in-game afterward.)

## Task 1 — Constants
In `src/world/map.ts`:
- `GROUND_SIZE`: `280 → 140`.
- `PLAYER_SPAWN`: `{ x: 8, z: 9 } → { x: 8, z: 6 }`.
- `CAR_SPAWN`: unchanged `{ x: 12, z: 2 }`.
- Update the header comment block to describe the new compact grid (single ±44 ring,
  core blocks ±22, perimeter rows at ±56 bands, highway north at z=-56, world ±70).

## Task 2 — Core grid + paving
- `cityGrid` params: `pitch: 44, half: 1, length: 124` (was 56/2/260).
- `pavement` params: `w: 88, d: 88` (was 112/112).

## Task 3 — Core block contents
- `phoneRepairShop` lot: unchanged (NW, originX=-22, originZ=-17).
- `restaurant` lot: unchanged (NE, originX=22, originZ=-21).
- `plaza`: `x: -22, z: 22` (was -28,28). Params `w:36 d:28` unchanged.
- `terraceRow` (SE): `x: 22, z: 14, rot: 180, units:3, d:11` (was x28/z12). Keep
  district/anchor/seed.
- `kioskCart` x2: `(-14, 5)` and `(-20, 5)` (was z=8).
- `trafficLight` x4: unchanged (±7, ±7).

## Task 4 — Perimeter ring (tall storeys on the edge)
Replace the 12 outer-ring `buildingRow`s with **6** rows facing inward:
- South: `{x:-22, z:56, rot:180}`, `{x:22, z:56, rot:180}`.
- West:  `{x:-56, z:-22, rot:90}`, `{x:-56, z:22, rot:90}`.
- East:  `{x:56,  z:-22, rot:270}`, `{x:56, z:22, rot:270}`.
- Each `params: { units:3, d:12, district, anchor:"center", seed }`. Distinct seeds;
  district per side (south→east palette, west→west, east→west or per taste).

## Task 5 — Highway (north edge)
- `highway`: `x:0, z:-56, rot:0`, `params: { length:124, lanes:2, laneW:3.6, medianW:4,
  shoulderW:1.2, gantry:true, seed:1 }` (was z=-128, length 260).

## Verification
1. `npx tsc --noEmit` — must be clean.
2. `npx vite build` — must succeed.
3. Sanity-scan the rewritten `MAP` against the spec's layout table (footprints inside
   ±70, no two footprints overlapping, roads not buried under buildings).
4. Report results; hand back on `master` for the user to view in-game.
