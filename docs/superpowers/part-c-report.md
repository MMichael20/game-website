# Part C Implementation Report

## Task Status

| Task | Description | Status | Commit |
|------|-------------|--------|--------|
| C1 | Pure path-following math (pathFollow.ts) | DONE | 5541055 |
| C2 | Kinematic NPC traffic car (NpcCar.ts) | DONE | 152b4eb |
| C3 | Pure population planner (populate.ts) | DONE | c2cc90d |
| C4 | Wire into Game.ts via EntityManager | DONE | 4d89e37 |
| C5 | Final verification + README update | DONE | e189c82 |

## Commit Log (last 10)

```
e189c82 docs(rishon3d): note districts, traffic, and wildlife
4d89e37 feat(rishon3d): populate city with NPCs, animals, and traffic via EntityManager
c2cc90d feat(rishon3d): pure population + traffic-route planner
152b4eb feat(rishon3d): kinematic NPC traffic car
5541055 feat(rishon3d): pure path-following math for traffic
b6582b8 feat(rishon3d): wandering cat/dog animal entity
12048ea feat(rishon3d): instanced trees/bushes + cached prop materials
b9fe849 feat(rishon3d): assemble multi-district city map
48b861a feat(rishon3d): procedural district block generator
8a3ea96 feat(rishon3d): district spec type + bush prop kind
```

## npm test

```
Test Files  14 passed (14)
      Tests  57 passed (57)
   Duration  908ms
```

All suites pass: input, pathFollow, rng, culling, interaction, cameraMath, wander,
timestep, rishonMap, cityGen, populate, worldData, assets, instancedProps.

## npm run build

PASS - no TypeScript errors. vite build completed in 1.27s (36 modules transformed).
Only warning is bundle size (2557 kB uncompressed) which is pre-existing and expected
for Rapier3d-compat.

## npm run test:smoke

```
1 passed (8.5s)
ok 1 test\smoke.spec.ts:3:1 - boots, starts, renders a canvas with no console errors
```

## Notes

- All pure modules (pathFollow.ts, populate.ts) contain no three.js imports.
- No Math.random() in any pure generator module (mulberry32 used throughout).
- No emojis in any committed file.
- One commit per task (C1 through C5).
- The `camera` parameter passed to `EntityManager` in Game.ts uses `camera.position`
  which is `THREE.Camera`'s position (a Vector3), satisfying the `() => THREE.Vector3`
  getter signature required by EntityManager.

## Review Fix Report (Finding 2 + Finding 3)

**Status:** DONE

**Commit:** c1e2dc5 — fix(rishon3d): keep spawned agents out of buildings + route cars on perimeter road

**Finding 2 — agents spawning inside buildings:**
- Added `buildingRects`, `pointInRects`, `Rect` import from `./wander` to `populate.ts`.
- `sampleOnRoads` now takes a `rects: Rect[]` parameter; for each agent it retries up to 12
  times and keeps the first candidate that passes `!pointInRects(candidate, rects)`, falling
  back to the last sample if all 12 fail.
- `planPopulations` computes `buildingRects(map.buildings, 0.5)` and passes it to all three
  `sampleOnRoads` calls.

**Finding 3 — NPC car loops cutting through district buildings:**
- Changed `districtLoop(d.center, d.size / 2 - 4)` to `districtLoop(d.center, d.size / 2 - 1.5)`
  so the rectangle sits inside the 6-unit-wide perimeter road corridor, clear of buildings.

**Covering test command:**
```
npx vitest run test/populate.test.ts
```
Result: 5 passed (5) — includes new test "no pedestrian/cat/dog spawns inside building footprints" using seed 42 against `buildingRects(map.buildings, 0)`.

**Full suite:**
```
Test Files  14 passed (14)
      Tests  58 passed (58)
   Duration  919ms
```

**Build:** PASS — tsc --noEmit clean, vite built in 1.29s (36 modules), no new warnings.
