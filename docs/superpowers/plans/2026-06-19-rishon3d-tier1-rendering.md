# Rishon3D Tier 1 Rendering Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement
> this plan task-by-task (inline). Chosen over subagent-driven because each task needs a
> visual screenshot feedback loop (GTAO/bloom/grade) that a blind subagent cannot judge,
> and the edits are small and tightly interdependent. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Land Tier 1 of the fidelity roadmap — global lighting re-grade, an
EffectComposer post-processing pipeline (GTAO + selective bloom + SMAA), subtle fog, and
character contact shadows — to close most of the perceptual gap to the City-Craft reference.

**Architecture:** Centralize a post-processing pipeline in a new `core/postfx.ts` consumed
by both the game `Engine` and the dev `turnaround`. Re-grade the single `DAY` lighting
source of truth toward a bright sunny look where AO/shadows read. Add a reusable contact
-shadow mesh helper for the humanoid.

**Tech Stack:** TypeScript, three.js r0.169 (examples/jsm postprocessing passes — already
vendored), Vite, Vitest, Playwright.

## Global Constraints

- three.js r0.169; use `three/examples/jsm/postprocessing/*` — NO new dependencies.
- Keep `THREE.NeutralToneMapping` (ACES was intentionally removed for desaturation).
- Keep `renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))`.
- `DAY` in `sky.ts` stays the single source of truth for lighting/sky/fog.
- Bright sunny target (match the reference frame), NOT a dim/orange golden hour.
- All edits under `rishon3d/`; work on branch `worktree-3d-spike`; commit per task.

---

### Task 1: Lighting re-grade + update sky test intent

**Files:**
- Modify: `rishon3d/src/core/sky.ts:15-32` (DAY constants; add fog fields)
- Modify: `rishon3d/src/core/Engine.ts:49-56` (shadow bias/near)
- Test: `rishon3d/test/sky.test.ts:34-44` (update midday assertion)

**Interfaces:**
- Produces: `DAY.fogColor: number`, `DAY.fogDensity: number` (consumed by Task 3).

- [ ] **Step 1: Update the test to the new intent (red)**

```ts
// replace the "puts the sun high for midday" test
it("lowers the sun into the afternoon for readable form (not flat midday)", () => {
  expect(DAY.sunElevationDeg).toBeGreaterThanOrEqual(30);
  expect(DAY.sunElevationDeg).toBeLessThanOrEqual(50);
});
```

- [ ] **Step 2: Run it, expect FAIL** (`npx vitest run test/sky.test.ts`) — current 58 > 50.

- [ ] **Step 3: Re-grade `DAY`** — `sunElevationDeg 58→40`, `sunColor 0xfff4e0→0xfff1d6`,
  `sunIntensity 2.1→2.3`, `hemiIntensity 1.15→0.75`, `ambientIntensity 0.45→0.28`,
  `exposure 1.0→1.03`; add `fogColor: 0xcfe6ff`, `fogDensity: 0.0012`. Update the leading
  comment from "bright midday" to "bright sunny afternoon".

- [ ] **Step 4: Add shadow bias in Engine** (after `sun.shadow.mapSize.set`):
  `sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.02; sun.shadow.camera.near = 1;`

- [ ] **Step 5: Run `npx vitest run test/sky.test.ts`, expect PASS.**

- [ ] **Step 6: Commit** `feat(rishon3d): Tier 1 lighting re-grade for readable form`.

### Task 2: Shared EffectComposer pipeline

**Files:**
- Create: `rishon3d/src/core/postfx.ts`
- Modify: `rishon3d/src/core/Engine.ts` (build composer; `frame()`/`resize()`)
- Modify: `rishon3d/src/turnaround.ts:12-19,54` (render through composer)

**Interfaces:**
- Produces: `createComposer(renderer, scene, camera, size): EffectComposer` and a
  `resizeComposer(composer, w, h)` helper.

- [ ] **Step 1:** Write `postfx.ts` building
  `RenderPass → GTAOPass → UnrealBloomPass → OutputPass → SMAAPass`. GTAO: `radius≈0.6`,
  `scale≈1`, blend multiply; set `gtao.output = GTAOPass.OUTPUT.Default`. Bloom:
  `strength≈0.5, radius≈0.3, threshold≈0.9`. SMAA sized to `w*dpr, h*dpr`.
- [ ] **Step 2:** In `Engine` constructor, after lights, store
  `this.composer = createComposer(renderer, scene, camera, {w,h})`.
- [ ] **Step 3:** In `frame()`, replace `this.renderer.render(...)` with
  `this.composer.render(dt)`.
- [ ] **Step 4:** In `resize()`, after renderer resize, call
  `resizeComposer(this.composer, w, h)` and `this.camera.updateProjectionMatrix()`.
- [ ] **Step 5:** In `turnaround.ts`, build a composer via `createComposer` and make
  `draw()` call `composer.render(0)`; resize handler resizes it too.
- [ ] **Step 6:** `npm run build` (tsc) — expect PASS. Smoke render via Playwright
  (`/` then Start, and `/turnaround.html`) — expect a canvas, no console errors.
- [ ] **Step 7: Commit** `feat(rishon3d): Tier 1 post-processing (GTAO + bloom + SMAA)`.

### Task 3: Subtle sky-matched fog

**Files:**
- Modify: `rishon3d/src/core/Engine.ts:31-32`

**Interfaces:**
- Consumes: `DAY.fogColor`, `DAY.fogDensity` (Task 1).

- [ ] **Step 1:** Replace `this.scene.fog = null;` with
  `this.scene.fog = new THREE.FogExp2(DAY.fogColor, DAY.fogDensity);`
- [ ] **Step 2:** `npm run build` — expect PASS; screenshot a wide/aerial view
  (`#view=` dev mode) to confirm far layers separate while the street stays vivid.
  Tune `DAY.fogDensity` down if street level muddies.
- [ ] **Step 3: Commit** `feat(rishon3d): Tier 1 subtle depth fog`.

### Task 4: Character contact shadow + self-shadow

**Files:**
- Create: `rishon3d/src/world/contactShadow.ts`
- Modify: `rishon3d/src/entities/Humanoid.ts:45-59,148-205` (receiveShadow + disc)
- Test: `rishon3d/test/contactShadow.test.ts`

**Interfaces:**
- Produces: `contactShadowTexture(size?): THREE.DataTexture` (pure-data, testable) and
  `makeContactShadow(radius: number): THREE.Mesh` (exported for Tier 3 prop reuse).

- [ ] **Step 1: Failing test** for the pure-data texture:

```ts
import { describe, it, expect } from "vitest";
import { contactShadowTexture } from "../src/world/contactShadow";
describe("contactShadowTexture", () => {
  it("is opaque-ish at center and transparent at the edge", () => {
    const tex = contactShadowTexture(16);
    const d = tex.image.data as Uint8Array;
    const px = (x: number, y: number) => d[(y * 16 + x) * 4 + 3]; // alpha
    expect(px(8, 8)).toBeGreaterThan(px(0, 0));
    expect(px(0, 0)).toBe(0);
  });
});
```

- [ ] **Step 2:** Run it, expect FAIL (module missing).
- [ ] **Step 3:** Implement `contactShadow.ts`: build a `size×size` RGBA `DataTexture`,
  alpha = smooth radial falloff (1 at center → 0 at radius), RGB black; and
  `makeContactShadow(radius)` returning a `PlaneGeometry` rotated flat at `y=0.02` with a
  `MeshBasicMaterial({ map, transparent:true, depthWrite:false })`, `renderOrder` low.
- [ ] **Step 4:** Run test, expect PASS.
- [ ] **Step 5:** In `Humanoid.ts`: set `receiveShadow = true` alongside each existing
  `castShadow = true` on form meshes (limb mesh/cap, torso, panels, head, hair, backpack
  body/handle/straps); at the end of `makeHumanoid`, `group.add(makeContactShadow(0.7))`.
- [ ] **Step 6:** `npx vitest run` (all) + `npm run build` — expect PASS.
- [ ] **Step 7: Commit** `feat(rishon3d): Tier 1 character contact + self shadow`.

### Task 5: Verify look + tune

**Files:** none (verification + small constant tuning only).

- [ ] **Step 1:** Run full `npx vitest run` — expect all green.
- [ ] **Step 2:** Run `npm run build` — expect clean tsc + vite build.
- [ ] **Step 3:** Dev server + Playwright: capture `#char` preview and the gameplay
  street view; compare side by side to `assets/design-examples/v1-day-restaurant-exterior.png`.
- [ ] **Step 4:** Tune `DAY` exposure/fill and bloom threshold against the screenshots
  until grounded + glowing + bright (log final values in the spec's decision section).
- [ ] **Step 5:** Run the Playwright smoke test (`npm run test:smoke`) — expect PASS, no
  console errors.
- [ ] **Step 6: Commit** any tuning as `chore(rishon3d): Tier 1 grade tuning`.

## Self-Review

- Spec coverage: re-grade (T1), composer/GTAO/bloom/SMAA (T2), fog (T3), contact +
  self shadow (T4), verification + tuning (T5). All Tier 1 acceptance items covered.
- Placeholders: none — concrete values and code in each step.
- Type consistency: `createComposer`/`resizeComposer`/`contactShadowTexture`/
  `makeContactShadow` names used consistently across tasks. `DAY.fogColor`/`fogDensity`
  produced in T1, consumed in T3.
