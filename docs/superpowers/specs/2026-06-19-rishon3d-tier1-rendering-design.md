# Rishon3D — Tier 1 rendering fidelity (design spec)

Date: 2026-06-19
Branch: worktree-3d-spike (isolated worktree; master untouched)
Mode: autonomous-builder (auto). Clarifying questions self-answered; see Assumptions & Decisions.

## Goal

Close the largest perceptual gap between the rishon3d render and the City-Craft
reference (`assets/design-examples/v1-day-restaurant-exterior.png` /
`current-vibe-restaurant-street-v1.png`). Tier 1 is the "20% that buys 80%": global
lighting + grounding + glow, with no geometry/texture rework. This is the highest
impact-per-effort slice from the fidelity audit
(`workflows/.../rishon3d-fidelity-gap`).

Tier 1 only. Tiers 2-4 (texturing, prop richness, facade architecture) are out of
scope for this spec and will be planned separately.

## What "good" looks like (acceptance)

Compared against the current `char-preview.png` / `w2-intersection.png` framing, after
Tier 1 the scene should visibly gain:

1. Soft ambient-occlusion contact shading in corners, under awnings, around window
   frames, and where props/characters meet the ground — nothing floats.
2. A glowing warm halo on emissive lamps, traffic lenses, and lit signs (not flat
   bright paint).
3. Clearer directional sun shadows with more form, under a bright sunny sky that still
   matches the reference (NOT a dim orange evening).
4. Subtle far-distance atmospheric separation so wide/aerial views read in layers
   instead of one flat green sheet.
5. Crisp anti-aliased edges (no regression from turning on post-processing).

Verification is visual (Playwright screenshots at the `#char` preview and the gameplay
street view) plus green `tsc`, `vitest`, and the Playwright smoke test.

## Scope of change (files)

- `rishon3d/src/core/sky.ts` — `DAY` constants (re-grade) + new `fog*` fields.
- `rishon3d/src/core/Engine.ts` — EffectComposer pipeline, shadow bias, fog wiring.
- `rishon3d/src/core/postfx.ts` (NEW) — shared `createComposer(renderer, scene, camera)`
  so the game and the dev turnaround render through one pipeline (no divergence).
- `rishon3d/src/turnaround.ts` — render through the shared composer.
- `rishon3d/src/entities/Humanoid.ts` — contact-shadow disc + `receiveShadow`.
- `rishon3d/src/world/contactShadow.ts` (NEW) — reusable radial-alpha contact-shadow
  mesh helper (also usable by Tier 3 props later).
- `rishon3d/test/sky.test.ts` — update the "midday" assertion to the new intent.
- New unit test for the pure-data contact-shadow texture helper.

## Architecture

### Lighting re-grade (`sky.ts` DAY)
Pure constant edits, consumed unchanged by Engine. Move from "flat bright midday" to
"bright sunny afternoon with readable form": lower the sun for longer soft shadows,
warm the key slightly, and cut the flat hemisphere/ambient fill *enough that AO and
shadows read* — but keep the scene bright to match the reference. Exact values are
starting points to be tuned against screenshots (see Decisions).

### Post-processing pipeline (`postfx.ts` + `Engine.ts`)
`EffectComposer` with, in order:
`RenderPass → GTAOPass → UnrealBloomPass → OutputPass → SMAAPass`.
- GTAOPass: ambient-occlusion grounding (the single biggest win). Multiply blend,
  moderate radius.
- UnrealBloomPass: high luminance threshold so only emissive lanterns/lenses/signs
  bloom — not lit walls or sky.
- OutputPass: applies tone mapping (keep `NeutralToneMapping`) + sRGB; required as the
  HDR→display step when compositing.
- SMAAPass: re-adds anti-aliasing, because the composer's render targets bypass the
  renderer's `antialias:true` (which only MSAAs the default framebuffer).
`Engine.frame()` calls `composer.render(dt)`; `Engine.resize()` calls
`composer.setSize(...)`. The turnaround calls `composer.render(0)` once.

### Fog (`Engine.ts` + `sky.ts`)
`scene.fog = new THREE.FogExp2(DAY.fogColor, DAY.fogDensity)` with a low density and a
sky-matched (light blue) color, tuned so only the far skyline desaturates while the
playable street stays vivid.

### Contact shadow (`contactShadow.ts` + `Humanoid.ts`)
A small horizontal plane with a radial-gradient alpha texture (built once, shared) on a
transparent, depth-write-off `MeshBasicMaterial`, parented under the humanoid group at
`y≈0.02`. Decorative (no cast/receive). Humanoid form meshes also get
`receiveShadow=true` for free self-shadowing. The texture helper is pure-data and unit
tested; the mesh helper is exported for Tier 3 prop reuse.

## Risks / mitigations
- **Perf (mobile):** three/examples is one fullscreen draw per pass. Prototype here (no
  deps); validate frame budget later on a real device; consider capping `pixelRatio`
  and/or porting to pmndrs `postprocessing` if heavy. Out of scope to fully solve in
  Tier 1, but keep `pixelRatio ≤ 2`.
- **Art drift — bloom blowout:** keep the luminance threshold just below emissive
  brightness; bump lantern `emissiveIntensity` rather than lowering the global
  threshold if lanterns don't cross.
- **Art drift — too dark/orange:** match the bright reference, tune exposure as the
  last step; validate against a fixed camera, not the editor.
- **Tone mapper:** keep `NeutralToneMapping` (ACES was intentionally removed for
  desaturation). Do any future contrast/saturation in a dedicated grade pass.
- **Divergence:** centralize the pipeline in `postfx.ts` so the turnaround can't drift
  back to the flat look.

## Assumptions & Decisions (auto mode log)

- Post-processing library → chose **three/examples passes** (EffectComposer, GTAOPass,
  UnrealBloomPass, OutputPass, SMAAPass) — all already present in `node_modules`, zero
  new dependencies. Port to pmndrs `postprocessing` only if perf demands it later.
- Isolation → chose to **work on the existing `worktree-3d-spike` branch** in this
  worktree rather than cutting a new sub-branch — the worktree already isolates master,
  and the spike is the natural home for this work. Tier 1 lands as its own commit(s).
- Art direction → chose to **match the bright sunny reference, not a deep golden hour**,
  despite the menu copy saying "golden hour". The user explicitly pointed at the bright
  sunny restaurant frame as the target. So the grade is a *modest* supporting shift and
  GTAO + bloom do the heavy lifting. (Menu copy is out of scope; flag for later.)
- Starting grade values (to be tuned against screenshots): `sunElevationDeg 58→40`,
  `sunColor 0xfff4e0→0xfff1d6`, `sunIntensity 2.1→2.3`, `hemiIntensity 1.15→0.75`,
  `ambientIntensity 0.45→0.28`, `exposure 1.0→1.03`. Fill is reduced (so AO reads) but
  not halved (so the scene stays bright). `hemiSky/hemiGround/ambientColor` unchanged.
- `sky.test.ts` "midday" assertion → **rewrite to the new intent** (sun lowered into
  afternoon for form: `>= 30 && <= 50`) rather than delete. Legitimate intent change.
- Contact shadows → chose **humanoid (player + NPCs) only** for Tier 1. Static props
  already `cast/receiveShadow` and get GTAO grounding, so per-prop discs are deferred to
  Tier 3 (YAGNI). The helper is exported now so Tier 3 can adopt it.
- Color space → **leave `outputColorSpace` as the three r152+ default (sRGB)** for Tier
  1; the explicit colorSpace pass belongs with Tier 2 textures. OutputPass handles the
  HDR→sRGB conversion in the composite.
- Fog color → chose **sky-matched light blue, very low density** (not the audit's warm
  `0xd9c3a8`, which suited a golden hour) to fit the bright reference. Tune low; dial
  toward zero if it muddies street level.
- Verification → chose **Playwright screenshots via the existing dev server** (`#char`
  fixed-camera preview + gameplay street view) compared to the reference, plus
  `tsc/vitest/smoke`. No pixel-diff baseline (the look is being changed on purpose).
