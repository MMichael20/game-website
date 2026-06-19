# Rishon3D — Bloom postprocessing (dusk glow)

**Date:** 2026-06-18 · Branch: worktree-3d-spike · Mode: autonomous-builder (`auto`), iteration IT5.

## Goal

Add a subtle bloom/glow postprocessing pass so the dusk scene's bright elements — lit
windows, streetlight lamps, the low sun, the horizon — glow softly. This is the single
biggest remaining "atmosphere" lever for the golden-hour look.

## Architecture

### Unit 1 — `src/core/Engine.ts` (edit): EffectComposer + UnrealBloomPass

Switch the render path from `renderer.render(scene, camera)` to an `EffectComposer`
pipeline (the standard three.js bloom example chain):

- `EffectComposer(renderer)` with:
  - `RenderPass(scene, camera)`
  - `UnrealBloomPass(new THREE.Vector2(w, h), strength, radius, threshold)` — params tuned
    for a tasteful dusk glow (only bright things bloom): threshold ~0.55, strength ~0.6,
    radius ~0.5 (final values tuned by screenshot).
  - `OutputPass()` — applies tone mapping (reads `renderer.toneMapping`/exposure) + sRGB.
- Keep `renderer.toneMapping = ACESFilmicToneMapping` and `toneMappingExposure` (OutputPass
  consumes them; do NOT double-apply — RenderPass renders linear, OutputPass tonemaps).
- `frame()` calls `this.composer.render()` instead of `renderer.render`.
- `resize()` calls `this.composer.setSize(w, h)` (and updates the bloom pass resolution)
  alongside the existing `renderer.setSize`.
- Store the composer (and bloom pass) as private fields; create after the renderer + sky +
  lights are set up.

No other files change. Engine has no unit test (WebGL) — verified by `tsc`/`vite build` +
Playwright smoke (must still boot + render a WebGL canvas with no console errors) + a
screenshot showing the glow.

## Error handling / invariants

- The composer uses the same WebGL context as the renderer; no new context.
- Pixel ratio: set composer pixel ratio to match `renderer.getPixelRatio()` so bloom
  resolution tracks the canvas.
- Bloom is purely visual; no gameplay/physics/test behavior changes.

## Testing

- `npm run build` (tsc + vite) clean.
- `npm run test` unchanged-green (no logic touched).
- `npm run test:smoke` green (2 canvases + WebGL context, no console errors).
- Screenshot confirms windows/streetlights/sun glow without washing out the scene.

## Assumptions & Decisions (autonomous log)

- D1 Bloom tech → `UnrealBloomPass` via `EffectComposer` (ships with three@0.169) — the
  standard, well-supported selective-bloom approach.
- D2 Pass order → `RenderPass → UnrealBloomPass → OutputPass`, with tone mapping at
  `OutputPass` — the documented three.js pipeline; avoids double tone-mapping.
- D3 Params → start threshold 0.55 / strength 0.6 / radius 0.5, then screenshot-tune so only
  genuinely bright elements bloom (no global haze).
- D4 Performance → one full-screen bloom at device pixel ratio (capped at 2 already) is cheap
  enough for this scene; no resolution downscaling needed.
