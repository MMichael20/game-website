# World Authoring Rewrite — progress ledger

Branch: worktree-world-rewrite
Gate (bootstrap): `npx tsc --noEmit` + `npx vite build`. Only test: transform.test.ts.

- [x] Task 1: types + registry
- [x] Task 2: transform (+test)
- [x] Task 3: engine
- [x] Task 4: catalog primitives (ground/road/tree/flower/lamp/planter/bench)
- [x] Task 5: buildingShell + storefront
- [x] Task 6: phoneRepairShop + restaurant composites
- [x] Task 7: map manifest
- [x] Task 8: wire engine, quarantine tests, rewrite CLAUDE.md
Task 1: complete (commit 68d58d8, verbatim code, tsc clean)
Task 2: complete (commit 9e41ece, 3 tests pass, tsc clean)
Task 3: complete (commit 6e75111, tsc clean)
Task 4: complete (commit 45e8432, tsc+build clean)
DECISION: catalog storefront built fresh from objects/glass+awning+signBand (worktree baseline lacks the uncommitted fullGlassFront work; keeps catalog independent of retired storefront.ts)
Task 5: complete (commit 593a253, tsc+build clean)
CONCERN(T5): buildingShell added floor+ceiling colliders (scoped to walls+returns). Floor collider ~0.13 lip may bump at doorway — review/fix in final pass.
Task 6: complete (commit 030aeaa, tsc+build clean; kits reused for counter/shelf/phone, inline table/chair)
Task 7: complete (commit 1ab522d, tsc clean)
Task 8: complete (commit b848a83; tsc+vite+vitest all green)
