# Pretty animated water — design

**Date:** 2026-06-23
**Mode:** autonomous-builder (`auto`) — self-brainstormed, forks logged below.
**Goal:** Make the world's water *surfaces* (fountain pools + bowls, player-house
pool) shimmer and ripple in a natural, pretty way — not just the crude jet bob that
exists today.

## Problem / current state

- `grandFountain.ts` puts the flat pool/bowl water **discs** into the static `parts`
  array (lines 61-62, 93, 98), so they get merged into the shared voxel material and
  are completely static. Only the jets/streams (`water` array) animate, via a blunt
  whole-mesh `scale.y`/`position.y` sine bob.
- The player-house pool water (`playerHouse.ts:685`, assembled at 1058-1065) is a
  static translucent slab — no motion at all.
- There IS a clean per-frame hook: `ObjectResult.animate(dt)`, driven by
  `Game.update → World.tick → animated[]`. Meshes with `userData.animated = true`
  keep a live matrix and a *distinct* (non-voxel) material is skipped by chunk-merge.

So the surfaces a player actually stares into are dead-flat. "Pretty animation" =
give those surfaces a living, shimmering water look.

## Approach (chosen)

A **shared, animated water-surface material** patched from `MeshStandardMaterial`
via `onBeforeCompile`, plus a single shared clock. Surfaces keep their existing flat
geometry; the *look* of motion comes from the shader, so no geometry subdivision and
no per-frame CPU vertex work.

The shader injects:
- a `uTime` uniform (advanced once per frame by a shared ticker),
- a world-position varying (from the vertex stage),
- in the fragment stage: a **sum-of-sines normal perturbation** (small moving
  ripples) fed into the standard lighting so specular highlights drift across the
  surface, plus a **Fresnel rim sheen** added to emissive for that glassy water edge.

Vertex colors and shadows are preserved, so existing tints (`WATER`, `WATER_LIGHT`,
`poolWater`) and the bright-sky lighting the user likes are untouched — this is
additive shimmer, not a recolor or a post-process. (Honors the "content over
rendering / keep the bright sky" memory: no lighting/post-processing changes.)

### New module: `src/world/objects/water.ts`
- `waterSurfaceMaterial(variant: "opaque" | "translucent")` → a **cached** patched
  `MeshStandardMaterial` (one instance per variant, like `voxelMaterial()`), so
  `World.unload` never disposes it and chunk-merge always skips it. `vertexColors:
  true`; the translucent variant sets `transparent`, `opacity ~0.62`. Each created
  material is recorded in a module-level list and shares one `uTime` uniform object.
- `tickWaterSurfaces(dt)` → advances one module-level accumulator and writes it to
  every created water-surface material's `uTime`. Called **exactly once per frame**
  so time never double-counts across multiple water meshes.

Determinism preserved: time is accumulated render `dt` — no `Math.random` /
`Date.now` / `new Date()` in any builder.

### Engine wiring
- `World.tick(dt)` calls `tickWaterSurfaces(dt)` once, alongside the existing
  per-object `animated[]` callbacks. (Single owner of the clock → no double advance.)

### Builder changes
- **grandFountain.ts:** pull the pool-surface + bowl-surface discs out of `parts`
  into their own mesh using `waterSurfaceMaterial("opaque")`, `userData.animated =
  true`. Keep the existing jets/streams mesh and its bob animate as-is (the jets are
  *volumes* of falling/rising water; the bob still reads well). Net: the big still
  surfaces now shimmer; the jets still surge.
- **playerHouse.ts:** swap the inline pool `waterMat` for
  `waterSurfaceMaterial("translucent")`; mark the pool mesh `userData.animated =
  true`. The floor/lane-lines still show through.

## Components / boundaries
- `water.ts` — owns the material + clock. Inputs: variant. Output: a material + a
  tick fn. Depends only on three + the shared-material cache (`getMaterial`).
- `World.tick` — drives the clock. One added line.
- Builders — consume `waterSurfaceMaterial(...)`; no knowledge of the shader.

## Performance
- Cost is a handful of `sin()` calls per water fragment — water is a small fraction
  of screen. Cheap. No new draw calls beyond the one extra surface mesh in the
  fountain (the pool slab in the house already existed).
- The ripple is intentionally subtle and applies on all quality tiers. Not gated on
  `core/quality.ts` — see Decision 4.

## Testing / gate
Per project rules (CLAUDE.md PITFALLS 1-2): **no dev server, no screenshots, no
tests.** Gate = `npx tsc --noEmit` clean + `npx vite build` succeeds. Then the user
looks in-game.

## Assumptions & Decisions (auto-mode log)
- Worktree isolation (pipeline step 3) → **chose: build directly on `master`, no
  worktree** — because the project's standing instruction is master-only (memory
  `work-on-master-only`, no branches/worktrees). User instruction overrides the
  skill default. Nothing is "merged"; changes are left on master for the user to
  review in-game, the established flow here.
- Which water to animate → **chose: all surfaces (fountain pools + bowls + house
  pool)** uniformly via one shared material — because "the water" was unqualified and
  a shared material is the DRY, consistent fit for this registry architecture.
- Animation technique → **chose: fragment-shader normal/Fresnel shimmer on existing
  flat geometry** over vertex-displacement waves — because the surfaces are 2-triangle
  / low-segment discs where vertex waves wouldn't show, and a fragment approach is
  cheap, needs no geometry change, and integrates with existing lighting.
- Quality-tier gating → **chose: always-on, ungated** — because the effect is cheap
  and the user explicitly wants it "pretty"; gating it off on Low would defeat the
  request. Revisit only if it measurably hurts Low-tier phones.
- Keep the jet bob → **chose: keep it** — the jets are rising/falling water volumes
  the bob suits; the new shimmer targets the still surfaces the bob never animated.
- Plan/build scale → **chose: implement directly (hold all context) rather than
  fan-out subagents** — single ~80-line module + two small edits is below the
  threshold where subagent parallelism helps.
