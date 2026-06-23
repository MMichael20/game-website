# Pretty Animated Water Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the world's still water surfaces (fountain pools + bowls, player-house pool) a pretty, natural animated shimmer via a shared shader-patched material.

**Architecture:** A cached `MeshStandardMaterial` patched through `onBeforeCompile` injects a `uTime` uniform, a world-position varying, sum-of-sines normal ripples, and a Fresnel rim sheen — so flat geometry *looks* like living water with no vertex work. One shared clock (`tickWaterSurfaces`) advances `uTime` once per frame from `World.tick`.

**Tech Stack:** TypeScript, three.js (r1xx), existing world registry/engine.

## Global Constraints

- **NO tests, NO dev server, NO screenshots** (CLAUDE.md PITFALLS 1-2). Gate per task = `npx tsc --noEmit` clean; final gate also `npx vite build` succeeds.
- **Work on `master`** — no worktree/branch (memory `work-on-master-only`).
- **Determinism:** no `Math.random()` / `Date.now()` / argless `new Date()` in builders or the water module — time is accumulated render `dt`.
- Build objects at LOCAL origin; return facets; one shared material instance per variant (cached via `getMaterial`, never disposed by `World.unload`).
- No lighting/post-processing changes; preserve vertex colors + the bright sky (memory `rishon3d-prioritize-content-over-rendering`).

---

### Task 1: Shared animated water-surface material module

**Files:**
- Create: `src/world/objects/water.ts`

**Interfaces:**
- Produces:
  - `waterSurfaceMaterial(variant: "opaque" | "translucent"): THREE.MeshStandardMaterial` — cached one-per-variant, vertex-colored, patched for shimmer; translucent variant is `transparent`, `opacity 0.62`.
  - `tickWaterSurfaces(dt: number): void` — advances the shared clock and writes `uTime` to every created water material. Call once per frame.

- [ ] **Step 1: Write the module**

```ts
// src/world/objects/water.ts
//
// Shared ANIMATED water-surface material. A MeshStandardMaterial patched via
// onBeforeCompile so flat water discs/slabs shimmer: moving sum-of-sines normal
// ripples drift the specular highlights, and a Fresnel rim adds a glassy sheen.
// Vertex colors + shadows are preserved (additive shimmer, not a recolor). One
// cached instance per variant, like voxelMaterial(), so chunk-merge skips it and
// World.unload never disposes it. Time is a single shared uniform advanced once
// per frame by tickWaterSurfaces(dt) — no per-mesh double counting, deterministic.
import * as THREE from "three";
import { getMaterial } from "../assets";

// One shared time value for ALL water materials (advanced once per frame).
const clock = { t: 0 };
const mats: THREE.MeshStandardMaterial[] = [];

function patch(mat: THREE.MeshStandardMaterial): THREE.MeshStandardMaterial {
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = { value: clock.t };
    // expose the uniform so the ticker can write straight to it
    (mat.userData as { uTimeUniform?: { value: number } }).uTimeUniform = shader.uniforms.uTime;

    // --- vertex: pass world XZ to the fragment stage ---
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        "#include <common>\nvarying vec2 vWaterXZ;",
      )
      .replace(
        "#include <worldpos_vertex>",
        "#include <worldpos_vertex>\n\tvWaterXZ = (modelMatrix * vec4( transformed, 1.0 )).xz;",
      );
    // worldpos_vertex only emits `worldPosition` when needed; compute our own to be safe
    shader.vertexShader = shader.vertexShader.replace(
      "vWaterXZ = (modelMatrix * vec4( transformed, 1.0 )).xz;",
      "vWaterXZ = (modelMatrix * vec4( transformed, 1.0 )).xz;",
    );

    // --- fragment: animated normal ripples + Fresnel sheen ---
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        "#include <common>\nuniform float uTime;\nvarying vec2 vWaterXZ;",
      )
      // perturb the geometric normal BEFORE lighting so specular highlights move
      .replace(
        "#include <normal_fragment_begin>",
        `#include <normal_fragment_begin>
        {
          vec2 p = vWaterXZ;
          float t = uTime;
          // two crossing wave trains + a finer ripple = lively but calm water
          float nx = 0.0, nz = 0.0;
          nx += 0.06 * cos(p.x * 0.9 + t * 1.1);
          nz += 0.06 * sin(p.y * 0.9 + t * 1.3);
          nx += 0.04 * cos(p.x * 1.7 - p.y * 1.1 + t * 1.7);
          nz += 0.04 * sin(p.y * 1.7 + p.x * 1.1 + t * 1.5);
          nx += 0.025 * cos(p.x * 3.3 + t * 2.6);
          nz += 0.025 * sin(p.y * 3.1 + t * 2.9);
          normal = normalize(normal + vec3(nx, 0.0, nz));
        }`,
      )
      // add a soft Fresnel rim sheen to emissive (glassy water edge)
      .replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
        {
          float fres = pow(1.0 - clamp(dot(normalize(normal), normalize(vViewPosition)), 0.0, 1.0), 3.0);
          totalEmissiveRadiance += vec3(0.10, 0.16, 0.22) * fres;
        }`,
      );
  };
  // changing onBeforeCompile after first compile needs a new program
  mat.needsUpdate = true;
  mats.push(mat);
  return mat;
}

/** Cached animated water-surface material. One instance per variant. */
export function waterSurfaceMaterial(variant: "opaque" | "translucent"): THREE.MeshStandardMaterial {
  return getMaterial(
    variant === "translucent" ? "waterSurfaceT" : "waterSurfaceO",
    () =>
      patch(
        new THREE.MeshStandardMaterial({
          vertexColors: true,
          roughness: 0.22,
          metalness: 0.0,
          ...(variant === "translucent" ? { transparent: true, opacity: 0.62 } : {}),
        }),
      ),
  ) as THREE.MeshStandardMaterial;
}

/** Advance the shared water clock ONCE per frame and push it to every water material. */
export function tickWaterSurfaces(dt: number): void {
  clock.t += dt;
  for (const m of mats) {
    const u = (m.userData as { uTimeUniform?: { value: number } }).uTimeUniform;
    if (u) u.value = clock.t;
  }
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean (no errors). Fix any type errors inline.

- [ ] **Step 3: Commit**

```bash
git add src/world/objects/water.ts
git commit -m "feat(water): shared animated water-surface shader material"
```

---

### Task 2: Drive the water clock from World.tick

**Files:**
- Modify: `src/world/World.ts` (the `tick` method, ~line 113-115; add import)

**Interfaces:**
- Consumes: `tickWaterSurfaces` from Task 1.

- [ ] **Step 1: Import**

Add near the other world imports at the top of `src/world/World.ts`:
```ts
import { tickWaterSurfaces } from "./objects/water";
```

- [ ] **Step 2: Call it once per frame**

Change `tick`:
```ts
  tick(dt: number): void {
    tickWaterSurfaces(dt);
    for (const fn of this.animated) fn(dt);
  }
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add src/world/World.ts
git commit -m "feat(water): tick the shared water clock from World.tick"
```

---

### Task 3: Animate the grand-fountain surfaces

**Files:**
- Modify: `src/world/catalog/grandFountain.ts`

**Interfaces:**
- Consumes: `waterSurfaceMaterial` from Task 1.

- [ ] **Step 1: Import the shared material**

Add after the existing imports:
```ts
import { waterSurfaceMaterial } from "../objects/water";
```

- [ ] **Step 2: Collect surfaces separately**

After `const water: THREE.BufferGeometry[] = [...]` declaration (line ~43), add:
```ts
    const surface: THREE.BufferGeometry[] = []; // still water surfaces (pool + bowls): shimmer
```

- [ ] **Step 3: Move the four surface discs from `parts`/`water` into `surface`**

Replace the pool-surface lines (currently `parts.push(disc(... WATER ...))` at ~61-62):
```ts
    // ── Pool water (big surface + a brighter inner pool) — animated shimmer ──
    surface.push(disc(r - 0.5, 0.12, 0, waterY, 0, WATER, 36));
    surface.push(disc(r - 1.6, 0.13, 0, waterY + 0.01, 0, WATER_LIGHT, 32));
```
Replace the lower-bowl water line (~93):
```ts
    surface.push(disc(2.0, 0.1, 0, lowBowlY + 0.12, 0, WATER, 28));               // lower bowl water
```
Replace the upper-bowl water line (~98):
```ts
    surface.push(disc(1.1, 0.08, 0, upBowlY + 0.1, 0, WATER, 24));                // upper bowl water
```

- [ ] **Step 4: Build the surface mesh and add it to the group**

After the existing `waterMesh` block (after line ~131, before `const group`):
```ts
    const surfaceMesh = new THREE.Mesh(mergeTinted(surface), waterSurfaceMaterial("opaque"));
    surfaceMesh.castShadow = false;
    surfaceMesh.receiveShadow = true;
    surfaceMesh.userData.animated = true; // distinct material + live matrix → skipped by chunk-merge
```
And add it to the group:
```ts
    group.add(stone);
    group.add(waterMesh);
    group.add(surfaceMesh);
```

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add src/world/catalog/grandFountain.ts
git commit -m "feat(water): shimmer the grand-fountain pool + bowl surfaces"
```

---

### Task 4: Animate the player-house pool

**Files:**
- Modify: `src/world/catalog/playerHouse.ts` (the `waterParts` assembly, ~1058-1065; add import)

**Interfaces:**
- Consumes: `waterSurfaceMaterial` from Task 1.

- [ ] **Step 1: Import**

Add to the existing imports at the top of `playerHouse.ts`:
```ts
import { waterSurfaceMaterial } from "../objects/water";
```
(If the file imports from `../objects/voxel` already, add this as a new import line.)

- [ ] **Step 2: Use the shared translucent water material**

Replace the `if (waterParts.length) { ... }` block (~1058-1066):
```ts
    if (waterParts.length) {
      const waterMesh = new THREE.Mesh(mergeTinted(waterParts), waterSurfaceMaterial("translucent"));
      waterMesh.castShadow = false;
      waterMesh.receiveShadow = true;
      waterMesh.userData.animated = true; // distinct material + live matrix → skipped by chunk-merge
      group.add(waterMesh);
    }
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add src/world/catalog/playerHouse.ts
git commit -m "feat(water): shimmer the player-house pool surface"
```

---

### Task 5: Final gate

- [ ] **Step 1: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 2: Production build**

Run: `npx vite build`
Expected: build succeeds (no shader compile is exercised at build time, but TS + bundling must pass).

- [ ] **Step 3: Hand back**

Report what was built; let the user look in-game (no screenshots, per project rule).

## Self-Review

- **Spec coverage:** module (Task 1) ✓, engine wiring (Task 2) ✓, fountain surfaces (Task 3) ✓, house pool (Task 4) ✓, gate (Task 5) ✓.
- **Placeholders:** none — full code in every code step.
- **Type consistency:** `waterSurfaceMaterial(variant)` / `tickWaterSurfaces(dt)` names match across Tasks 1, 2, 3, 4. `userData.uTimeUniform` written in `patch`, read in `tickWaterSurfaces`.
- **Determinism:** time is `dt`-accumulated; no banned calls.
