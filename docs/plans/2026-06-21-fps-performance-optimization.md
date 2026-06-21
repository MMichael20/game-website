# FPS Performance Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the game scale to more NPCs/cars/props by sharing GPU geometries and materials across instances, cut per-frame allocations, and add an on-screen FPS/draw-call readout — with zero visual or behavioral change.

**Architecture:** Route the two entity factories (`makeHumanoid`, `makeCarBody`) through the existing process-wide `getGeometry`/`getMaterial` cache in `src/world/assets.ts`, so GPU resources are O(distinct kinds) not O(instances). Extend the existing F3 `DebugOverlay` with a perf block fed by `renderer.info` + `assetCounts()`. Reuse `Vector3` temporaries in the player update loop.

**Tech Stack:** TypeScript, Three.js 0.169, Vite.

## Global Constraints

- **NO tests, NO dev server, NO screenshots.** The ONLY verification per task is `npx tsc --noEmit`. The final gate adds `npx vite build`. (CLAUDE.md PITFALLS 1 & 2 — these override the TDD steps the writing-plans skill normally prescribes.)
- **No visual or behavioral change.** Do not touch lighting, shadows, tone mapping, `AmbientLight`, `preserveDrawingBuffer`, or `logarithmicDepthBuffer`.
- **Determinism:** no `Math.random()` / `Date.now()` / argless `new Date()`. Cache keys must be deterministic strings.
- **Work on master.** No worktrees/branches (project rule).
- Reuse the existing cache (`getGeometry`/`getMaterial`/`assetCounts` from `src/world/assets.ts`). No new dependencies.
- Shared geometries/materials must NOT be mutated per-instance. The single exception is the humanoid phone screen material (mutated in `applyPhonePose`), which stays per-instance.

---

### Task 1: Perf measurement HUD

**Files:**
- Modify: `src/ui/DebugOverlay.ts` (add optional `perf` to `DebugInfo`; render it)
- Modify: `src/game/Game.ts` (hold a renderer ref; compute FPS; pass `perf` into `debug.update`)
- Modify: `src/main.ts` (pass `engine.renderer` into the `Game` constructor)

**Interfaces:**
- Consumes: `renderer.info.render.calls` / `.triangles` (Three.js built-in), `assetCounts()` from `src/world/assets.ts` (returns `{ geometries: number; materials: number }`).
- Produces: extended `DebugInfo` shape `{ ..., perf?: { fps: number; calls: number; tris: number; geoms: number; mats: number } }`.

- [ ] **Step 1: Extend `DebugInfo` and render the perf block in `DebugOverlay.ts`**

Add the optional field to the interface (after `mode?`):

```ts
  mode?: string;
  /** optional perf readout; shown as extra lines when present */
  perf?: { fps: number; calls: number; tris: number; geoms: number; mats: number };
```

In `update()`, after the existing `lines` array is built (before the `filter(Boolean).join`), append perf lines when present:

```ts
    if (info.perf) {
      const p = info.perf;
      lines.push(
        `fps     ${p.fps.toFixed(0).padStart(6)}`,
        `draws   ${String(p.calls).padStart(6)}   tris ${p.tris.toLocaleString()}`,
        `cache   geom ${p.geoms}   mat ${p.mats}`,
      );
    }
```

(Insert this between the `const lines = [ ... ];` declaration and the `this.el.textContent = ...` line. Keep the existing `axes` line last is not required; appending after it is fine.)

- [ ] **Step 2: Feed perf data from `Game.ts`**

`Game` must hold a `WebGLRenderer` reference and compute a smoothed FPS.

In `src/game/Game.ts`:
1. Add the import at the top if not already present: `import * as THREE from "three";` (it almost certainly is — verify, don't duplicate).
2. Add the renderer as the FIRST constructor parameter and store it. The current constructor begins `constructor(scene, physics, input, world, follow, camera, hud, minimap, container, lockPointer)`. Add `renderer: THREE.WebGLRenderer` as a `private` parameter at the FRONT:

```ts
  constructor(
    private renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    // ...the existing parameters, unchanged...
```

3. Add two private fields near the other private fields (e.g. by `private debug`):

```ts
  private fps = 0;
  private fpsClock = 0;
```

4. In the per-frame update method, advance the smoothed FPS. Find where `dt` is available in `Game.update(dt)` and add near the top of the method body:

```ts
    // Exponentially-smoothed FPS for the debug HUD.
    if (dt > 0) this.fps += ((1 / dt) - this.fps) * 0.1;
```

5. At the `this.debug.update({ ... })` call (around line 197), add the `perf` field. Use `assetCounts()` — add the import `import { assetCounts } from "../world/assets.ts";` (check the existing import path style in the file; match it — likely `"../world/assets"`). Then:

```ts
    const info = this.renderer.info.render;
    const ac = assetCounts();
    this.debug.update({
      // ...existing fields unchanged...
      perf: { fps: this.fps, calls: info.calls, tris: info.triangles, geoms: ac.geometries, mats: ac.materials },
    });
```

- [ ] **Step 3: Pass the renderer in `main.ts`**

In `src/main.ts`, the `Game` is constructed (~line 119):
```ts
  const game = new Game(engine.scene, physics, input, world, follow, engine.camera, hud, minimap, container, lockPointer);
```
Change to put `engine.renderer` first:
```ts
  const game = new Game(engine.renderer, engine.scene, physics, input, world, follow, engine.camera, hud, minimap, container, lockPointer);
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean (no errors). Fix any type mismatch (e.g. import path for `assetCounts`).

- [ ] **Step 5: Commit**

```bash
git add src/ui/DebugOverlay.ts src/game/Game.ts src/main.ts
git commit -m "feat(perf): F3 debug HUD shows fps, draw calls, triangles, cache counts"
```

---

### Task 2: Share Humanoid geometries and materials

**Files:**
- Modify: `src/entities/Humanoid.ts`

**Interfaces:**
- Consumes: `getGeometry(key, make)` and `getMaterial(key, make)` from `src/world/assets.ts`.
- Produces: no signature changes — `makeHumanoid`, `animateWalk`, `animateIdle`, `applyPhonePose` keep their exact current signatures. Behavior identical.

- [ ] **Step 1: Import the cache**

At the top of `src/entities/Humanoid.ts`, add:
```ts
import { getGeometry, getMaterial } from "../world/assets";
```

- [ ] **Step 2: Add small typed helpers**

`getMaterial` returns `THREE.Material`; humanoid meshes need `MeshStandardMaterial`. Add two helpers near the top (after the color constants):

```ts
// Shared box geometry keyed by exact dimensions; shared standard material keyed
// by color. Identical-looking parts across all NPCs collapse to one GPU resource.
function boxGeo(w: number, h: number, d: number): THREE.BoxGeometry {
  return getGeometry(`box:${w}x${h}x${d}`, () => new THREE.BoxGeometry(w, h, d)) as THREE.BoxGeometry;
}
function stdMat(color: number): THREE.MeshStandardMaterial {
  return getMaterial(`std:${color}`, () => new THREE.MeshStandardMaterial({ color })) as THREE.MeshStandardMaterial;
}
```

- [ ] **Step 3: Replace per-instance geometry/material allocations**

Replace every `new THREE.BoxGeometry(w, h, d)` used for a mesh with `boxGeo(w, h, d)`, and every `new THREE.MeshStandardMaterial({ color })` with `stdMat(color)`, throughout `limb()`, `addFace()`, `makeBackpack()`, and `makeHumanoid()`. Specifically:

- `limb()` (lines ~47-61): `new THREE.BoxGeometry(width, height, depth)` -> `boxGeo(width, height, depth)`; `new THREE.MeshStandardMaterial({ color })` -> `stdMat(color)`; cap mesh `new THREE.BoxGeometry(width * 1.08, cap.height, d)` -> `boxGeo(width * 1.08, cap.height, d)`; `new THREE.MeshStandardMaterial({ color: cap.color })` -> `stdMat(cap.color)`.
- `addFace()` (lines ~115-127): `const ink = new THREE.MeshStandardMaterial({ color: INK });` -> `const ink = stdMat(INK);`; the three eye/mouth/corner `new THREE.BoxGeometry(...)` -> `boxGeo(...)`.
- `makeBackpack()` (lines ~132-147): `brown`/`dark` materials -> `stdMat(PACK)` / `stdMat(PACK_DARK)`; each `new THREE.BoxGeometry(...)` -> `boxGeo(...)`.
- `makeHumanoid()` torso/panels/lapels/shirt/head/ears (lines ~157-189): box geometries -> `boxGeo(...)`; materials -> `stdMat(jacket)`, `stdMat(jacketDark)` (compute `jacketDark` as today via `darken`), `stdMat(WHITE_TEE)`, `stdMat(palette.skin)`.
- Hair material (line ~191): `new THREE.MeshStandardMaterial({ color: hairColorFor(palette) })` -> `stdMat(hairColorFor(palette))`.

NOTE: `darken()` and `hairColorFor()` stay exactly as-is — only the resulting color is passed to `stdMat`.

- [ ] **Step 4: Cache the merged hair geometry once**

The hair geometry is deterministic and identical for every NPC. Wrap the `hairGeometry()` call so the merge runs once. At the hair mesh creation (line ~191), change:
```ts
  const hair = new THREE.Mesh(hairGeometry(), stdMat(hairColorFor(palette)));
```
to use a cached geometry:
```ts
  const hair = new THREE.Mesh(getGeometry("humanoid:hair", hairGeometry), stdMat(hairColorFor(palette)));
```
(`getGeometry` accepts the `make` thunk; `hairGeometry` matches `() => THREE.BufferGeometry`.)

- [ ] **Step 5: Keep the phone screen material per-instance**

Do NOT change the phone material at lines ~209-212. It is mutated per-character in `applyPhonePose` (`emissiveIntensity`), so it MUST remain a fresh `new THREE.MeshStandardMaterial({ color: 0x12141a, emissive: 0x2a3550, emissiveIntensity: 0.6 })`. Leave that block untouched. Likewise the phone's `BoxGeometry(0.14, 0.24, 0.03)` may be shared via `boxGeo` (geometry is not mutated) — that is allowed but optional; if in doubt leave it as `new THREE.BoxGeometry`.

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean. Common fix: the `as THREE.MeshStandardMaterial` casts in the helpers handle the `Material` return type.

- [ ] **Step 7: Commit**

```bash
git add src/entities/Humanoid.ts
git commit -m "perf(humanoid): share geometries/materials via cache, cache hair geometry"
```

---

### Task 3: Share Car geometries and materials

**Files:**
- Modify: `src/entities/carMesh.ts`

**Interfaces:**
- Consumes: `getGeometry`, `getMaterial` from `src/world/assets.ts`.
- Produces: `makeCarBody(opts)` keeps its exact signature and visual output.

- [ ] **Step 1: Import the cache and add helpers**

At the top of `src/entities/carMesh.ts` add:
```ts
import { getGeometry, getMaterial } from "../world/assets";
```
Add helpers (after the imports / before `makeCarBody`):
```ts
function boxGeo(w: number, h: number, d: number): THREE.BoxGeometry {
  return getGeometry(`car:box:${w}x${h}x${d}`, () => new THREE.BoxGeometry(w, h, d)) as THREE.BoxGeometry;
}
function cylGeo(rt: number, rb: number, h: number, seg: number): THREE.CylinderGeometry {
  return getGeometry(`car:cyl:${rt}x${rb}x${h}x${seg}`, () => new THREE.CylinderGeometry(rt, rb, h, seg)) as THREE.CylinderGeometry;
}
```

- [ ] **Step 2: Share the materials**

In `makeCarBody`, the materials block (lines ~24-31) currently creates 8 materials per car. Replace each with a `getMaterial` lookup. The body paints are keyed by color; the rest are constants:
```ts
  const paint = getMaterial(`car:paint:${opts.bodyColor}`, () => new THREE.MeshStandardMaterial({ color: opts.bodyColor, metalness: 0.1, roughness: 0.6 })) as THREE.MeshStandardMaterial;
  const paintDark = getMaterial(`car:paintDark:${opts.bodyColor}`, () => new THREE.MeshStandardMaterial({ color: shade(opts.bodyColor, 0.78), metalness: 0.1, roughness: 0.65 })) as THREE.MeshStandardMaterial;
  const glass = getMaterial("car:glass", () => new THREE.MeshStandardMaterial({ color: 0x1b2530, metalness: 0.2, roughness: 0.25 })) as THREE.MeshStandardMaterial;
  const trim = getMaterial("car:trim", () => new THREE.MeshStandardMaterial({ color: 0x16181d, metalness: 0.2, roughness: 0.85 })) as THREE.MeshStandardMaterial;
  const chrome = getMaterial("car:chrome", () => new THREE.MeshStandardMaterial({ color: 0xb8bcc4, metalness: 0.8, roughness: 0.35 })) as THREE.MeshStandardMaterial;
  const headlight = getMaterial("car:headlight", () => new THREE.MeshStandardMaterial({ color: 0xfff2c0, emissive: 0xffe08a, emissiveIntensity: 0.6 })) as THREE.MeshStandardMaterial;
  const taillight = getMaterial("car:taillight", () => new THREE.MeshStandardMaterial({ color: 0xff5a48, emissive: 0xff2d1a, emissiveIntensity: 0.7 })) as THREE.MeshStandardMaterial;
  const plate = getMaterial("car:plate", () => new THREE.MeshStandardMaterial({ color: 0xeae6d8, emissive: 0x33312a, emissiveIntensity: 0.15, roughness: 0.8 })) as THREE.MeshStandardMaterial;
```

- [ ] **Step 3: Share the wheel and taxi-sign materials**

In the `withWheels` block (lines ~206-207):
```ts
    const tireMat = getMaterial("car:tire", () => new THREE.MeshStandardMaterial({ color: 0x111114, metalness: 0, roughness: 0.95 })) as THREE.MeshStandardMaterial;
    const hubMat = getMaterial("car:hub", () => new THREE.MeshStandardMaterial({ color: 0xc9ccd2, metalness: 0.7, roughness: 0.4 })) as THREE.MeshStandardMaterial;
```
In the taxi block (lines ~193-196), share the sign material:
```ts
    const sign = new THREE.Mesh(
      boxGeo(0.5, 0.16, 0.22),
      getMaterial("car:taxiSign", () => new THREE.MeshStandardMaterial({ color: 0x222222, emissive: 0xffcc33, emissiveIntensity: 0.6 })) as THREE.MeshStandardMaterial,
    );
```

- [ ] **Step 4: Share the geometries**

Replace every `new THREE.BoxGeometry(w, h, d)` in `makeCarBody` with `boxGeo(w, h, d)`, and the two `new THREE.CylinderGeometry(...)` (tire line ~216, hub line ~221) with `cylGeo(...)`. This covers body, hood, trunk, rub strips, door seams, skirt, glass core, roof, windshield, rear glass, pillars (A/B/C), bumpers, grille, grille bar, headlights, plates, mirror stalks/caps, taxi sign, tire, hub, arch. Leave all positions/rotations/`castShadow`/`receiveShadow` exactly as-is — only the geometry constructor call changes.

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add src/entities/carMesh.ts
git commit -m "perf(car): share car geometries/materials via cache"
```

---

### Task 4: Remove per-frame allocations in Character.update

**Files:**
- Modify: `src/entities/Character.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: identical movement behavior; no allocations per frame in `update()`.

- [ ] **Step 1: Add reusable temporaries**

`Character` already has `private tmp = new THREE.Vector3();` (line ~25). Add two more next to it:
```ts
  private tmpRight = new THREE.Vector3();
  private tmpMove = new THREE.Vector3();
  private static readonly UP = new THREE.Vector3(0, 1, 0);
```

- [ ] **Step 2: Reuse them in `update()`**

Replace lines ~79 and ~81. Currently:
```ts
    const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

    const move = new THREE.Vector3();
```
Change to:
```ts
    const right = this.tmpRight.crossVectors(forward, Character.UP).normalize();

    const move = this.tmpMove.set(0, 0, 0);
```
Everything downstream (`move.add(forward)`, `move.normalize()`, etc.) works unchanged because `move`/`right` are now the reused vectors. NOTE: `forward` is `this.tmp` (already reused) and is consumed before `move` is set, so there is no aliasing problem.

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add src/entities/Character.ts
git commit -m "perf(character): reuse Vector3 temporaries in update loop"
```

---

### Task 5: Final verification gate

**Files:** none (verification only).

- [ ] **Step 1: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean, no output.

- [ ] **Step 2: Production build**

Run: `npx vite build`
Expected: build completes successfully (exit 0), no errors.

- [ ] **Step 3: Report**

Summarize: what changed, that the gate is green, and that the user should look in-game (F3 shows the new fps / draws / cache counts; moving around a crowd should show far fewer cache `geom`/`mat` than instances).

---

## Self-Review

**Spec coverage:** measurement HUD (Task 1), Humanoid sharing incl. hair + phone exception (Task 2), Car sharing (Task 3), per-frame GC (Task 4), gate (Task 5). All spec sections covered. Non-goals (lighting/instancing/LOD) correctly excluded.

**Placeholder scan:** none — every code step shows the exact edit.

**Type consistency:** helper names `boxGeo`/`cylGeo`/`stdMat` and the `perf` shape are used consistently; `getGeometry`/`getMaterial`/`assetCounts` signatures match `src/world/assets.ts`.
