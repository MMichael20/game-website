# Voxel material sharing + small-prop shadow culling — design

Date: 2026-06-23
Mode: autonomous-builder (`auto`)

## Goal

Two low-risk asset-layer optimizations in the live voxel object library:

1. **Shared voxel material.** `voxelMaterial()` allocated a fresh
   `MeshStandardMaterial({ vertexColors:true, roughness:0.85, metalness:0 })` for
   every `tintedMesh()` call (hundreds of identical instances across the live
   world; `stores.ts` alone calls it 61x). Return ONE shared cached instance.
2. **Skip shadow-casting on small props.** `tintedMesh()` set
   `castShadow = true` unconditionally, so sub-1m props (flowers, fittings,
   handles) cost a shadow-map draw for near-zero visible shadow. Default
   `castShadow` from the merged geometry's size; large hero props that already
   re-assert `mesh.castShadow = true` keep casting.

Both target the fill-rate / memory budget; the render loop (Engine.ts) is left
untouched. Gate: `npx tsc --noEmit` only (CLAUDE.md PITFALLS 1 & 2 — no dev
server, no tests).

## Assumptions & Decisions

- Worktree vs master → chose **master, no worktree** — CLAUDE.md + memory
  ("work-on-master-only") explicitly forbids worktrees/branches; user
  instructions override the skill's isolation step.
- Subagent fan-out vs direct edit → chose **direct edit** — the change is two
  functions in one file; decomposition adds no value.
- Shared material: plain module singleton vs assets cache → chose **assets
  cache (`getMaterial("voxel", ...)`)** — `World.unload()` disposes any material
  NOT in `cachedAssetSets()`. A bare singleton would be disposed on map switch
  and corrupt the next load; routing through the cache makes it survive (same
  contract glass materials already rely on). Safe because nothing mutates a
  per-mesh voxel material (grep: no `.material.opacity/color/...=` on these).
- Small-prop threshold → chose **largest bounding-box dimension < 1.0m disables
  castShadow** — matches the "sub-1m" ask, derives from real geometry size
  (CLAUDE.md PITFALL 3 spirit), and is automatic for every `tintedMesh` caller.
- `receiveShadow` → **left true** for all props — cheap, and small props
  receiving shadow looks correct.
- Follow-up "make objects cheaper" → consolidated all static colliders onto ONE
  fixed rigid body in `World.ts` (was one body per collider). Behaviour-identical
  (fixed bodies aren't simulated); cuts body count/memory. Bigger draw-call lever
  (chunked static-geometry merge, now unlocked by the shared material) deferred to
  its own pass — it changes frustum-culling granularity and the user must verify
  in-game, so it shouldn't ride along silently.

## Follow-up: chunked static merge + detail distance-LOD

User asked to (a) make objects "just geometry" (merge), (b) cull small details at
distance, (c) "render only what's in view". (c) is already on — Three frustum-culls
every mesh by default. (a)+(b) become ONE mechanism: spatial chunking.

Design (`src/world/chunkMerge.ts`, called from `World.load`):
- After build, traverse the world group and collect every leaf mesh whose material
  IS the shared voxel singleton (today's change makes `===` valid). Non-voxel meshes
  (glass/transparent, textured roads, signs) are left untouched — different materials
  can't merge and need their own sorting.
- Bucket by `floor(worldXZ / CELL)` (CELL=48m), split into **casters**
  (`castShadow===true`, i.e. ≥1m props/buildings) and **details** (`castShadow===false`,
  small props). Clone each mesh's geometry, trim to position/normal/color (voxel mat is
  untextured → uv dropped so every bucket merges with identical attributes), bake the
  world matrix in, merge per bucket into ONE mesh. Dispose originals (cache-guarded).
- Caster chunks: always visible, frustum-cull only. Detail chunks: returned to World,
  which hides them past `DETAIL_CULL_DIST` (160m) each frame via `cullDetails()` —
  mirrors the existing `EntityManager` agent LOD. Game calls it with the camera pos.

This collapses hundreds of voxel draw calls into ~2 per occupied cell, hides far small
props (b), and keeps per-cell frustum culling (c).

### Assumptions & Decisions (follow-up)

- Scope → chose **full chunked merge + detail LOD** (user selected it over the simpler
  cull-only option).
- Merge predicate → **material identity === shared voxel singleton** — bulletproof,
  auto-excludes glass/roads/signs; no fragile size/name heuristics.
- Caster/detail split → reuse **`castShadow`** (already a size proxy from this pass) so
  buildings keep casting and stay always-on; only small props distance-cull.
- CELL=48m, DETAIL_CULL_DIST=160m → **simplest reasonable defaults**; both are single
  consts the user can retune after watching for pop-in.
- Robustness → force every bucket geometry to have position/normal/color (add white
  color / compute normals if missing) so `mergeGeometries` can never fail on attribute
  mismatch; guard against disposing cache-owned geometries.

## Verification

`npx tsc --noEmit` clean. (No `vite build`/dev server/tests per CLAUDE.md.)
User looks in-game — watch for detail-chunk pop-in at distance and any voxel object
that went missing (would mean it was wrongly merged); both are threshold/predicate tunes.
