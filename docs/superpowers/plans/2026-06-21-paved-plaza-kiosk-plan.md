# Paved Plaza + Kiosk Cart Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Pave the central blocks and add a furnished business plaza with a detailed kiosk cart.

**Architecture:** Three catalog objects — `pavement` (paver slab), `kioskCart` (detailed prop), `plaza` (furniture composite) — plus a `map.ts` edit paving the center and replacing the park with the plaza.

## Global Constraints
- Local space, deterministic (`mulberry32`), derive offsets from dims (PITFALL 3).
- Rotation in {0,90,180,270}. Verify ONLY with `npx tsc --noEmit` + `npx vite build`. No tests/dev server/screenshots. Master, no worktree.

---

### Task 1: `pavement` object
**Files:** Create `src/world/catalog/pavement.ts`; modify `index.ts`.
**Interfaces:** Consumes `makeSidewalkTexture, PAVER_SUPER_M` from `../roads`. Produces kind `"pavement"`, params `{ w, d }` default `{ w:112, d:112 }`, returns `{ mesh }`. Geometry y baked at 0.012.
- [ ] Build a `PlaneGeometry(w,d)` rotated flat, translated y=0.012, with a cloned paver texture whose `repeat` = `round(w/PAVER_SUPER_M) × round(d/PAVER_SUPER_M)`; `receiveShadow`. Register, `tsc`, commit.

### Task 2: `kioskCart` object
**Files:** Create `src/world/catalog/kioskCart.ts`; modify `index.ts`.
**Interfaces:** Consumes `tintedBox, cylinderY, lowPolyBall, tintGeo, mergeTinted, tintedMesh` from `../objects/voxel`, `makeAwning` from `../objects/awning`, `PALETTE`. Produces kind `"kioskCart"`, params `{ canopyColor }` default `{ canopyColor: PALETTE.awningRed }`, returns `{ mesh: group, colliders, obstacles }`. FRONT = +z.
- [ ] Voxel parts merged into one mesh: wooden body + dark plank lines, counter top with overhang, back shelf, 2 spoked wheels (CylinderGeometry rotated Z 90° via `tintGeo`), handle bar, crates with `lowPolyBall` produce, chalk menu sign. Add a separate `makeAwning` striped canopy mesh on 4 poles. Collider ~ body box; obstacle ~ 2.8×1.4. Register, `tsc`, commit.

### Task 3: `plaza` composite
**Files:** Create `src/world/catalog/plaza.ts`; modify `index.ts`.
**Interfaces:** Consumes `defineObject, buildObject`, `applyTransform`, `mulberry32`, types `ObjectResult/Box/Rect`. Reuses kinds `fountain, bench, planter, tree, lamp, flower, kioskCart`. Produces kind `"plaza"`, params `{ w:26, d:20, seed:1 }`, returns aggregated facets. No base slab (sits on pavement).
- [ ] `compose()` like park. Central fountain; 4 benches at `(0,±bz)`/`(±bx,0)` facing the fountain; corner planters + lamps + trees derived from `w/d`; 2 kiosk carts at `(±(w/2-4), 0)` facing inward; a few flowers. Register, `tsc`, commit.

### Task 4: Map — pave center + plaza
**Files:** Modify `src/world/map.ts`.
- [ ] Add `{ kind:"pavement", x:0, z:0, params:{ w:112, d:112 } }` right after the `cityGrid` line.
- [ ] Replace the `{ kind:"park", x:-28, z:28, ... }` line with `{ kind:"plaza", x:-28, z:28, params:{ w:26, d:20, seed:5 } }`.
- [ ] Add 2 standalone kiosks on other paved blocks (clear of buildings/road corridors), e.g. `{ kind:"kioskCart", x:14, z:14, rot:180 }` and `{ kind:"kioskCart", x:-14, z:-2, rot:90 }` (verify clearance).
- [ ] `tsc`, commit.

### Task 5: Final gate
- [ ] `npx tsc --noEmit` clean; `npx vite build` succeeds. Hand back.

## Self-Review
- Spec coverage: pavement (T1), kioskCart (T2), plaza (T3), map paving + plaza + kiosks (T4), gate (T5).
- Determinism: `mulberry32` only; derived offsets. Reused object param names match their definitions (fountain {r,tiers}, flower {color,height}, others {}).
