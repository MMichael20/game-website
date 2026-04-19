# Budapest "No More Rectangles" + Transport Overhaul — Design

**Status:** Final (post-review, revisions applied)
**Date:** 2026-04-19
**Branch:** master (v2-rebuild is abandoned)

---

## 1. Core Problem

Budapest and airport scenes ship ~55 programmer-art primitives (`add.rectangle` / `add.circle` used as world props — trees, buildings, tram shelters, rails, bridge railings, nighttime facades, thermal-bath pillars, tarmac stripes, airport runway dashes). These sit alongside genuinely polished pre-rendered assets (`bp-bus-building-pastel-*`, `budapest-skyline`, `bp-couple-bus`, `bp-bus-countryside`). The inconsistency — hero sprite next to flat colored rectangle — is what reads to the player as "childish," not the pixel-art style itself.

Separately, `BudapestTransportScene` is a modal destination-picker inside a gray backdrop. It does not earn its existence as a scene and wastes the inter-district travel moment.

Goal:
1. Replace all ~55 world-prop primitives with pre-rendered textures produced by the existing `PixelArtGenerator` pipeline.
2. Rewrite `BudapestTransportScene` as a 15-second parallax tram journey with diegetic departure-board destination selection.

Zero gameplay-logic changes. Zero save-format changes beyond the `returnScene` contract widening. Zero top-level new util files. Stay on master.

---

## 2. Chosen Approach — Phased β

Three commits, each independently shippable and revertible.

- **Phase 1 (flagship):** BusRide polish + Transport rewrite + caller migration + generator registration.
- **Phase 2:** DanubeCruise + ThermalBath + RuinBar.
- **Phase 3:** AirbnbShower + BudapestOverworld water tiles + AirportInterior.

Phase 1 crystallizes the recipe (palette, dithering, tileSprite usage, shutdown cleanup, typed key constants) on the most-seen scene chain. Phase 2/3 are mechanical swaps after Phase 1 lands.

Rejected alternatives: **α big-bang** (one monster PR, late palette-drift discovery), **γ runtime prop factory** (abstraction without payback at 55 assets, first-frame cache stutter, breaks boot-chunking guarantee), **δ texture atlas** (breaks no-static-assets philosophy, requires external tooling).

---

## 3. Hard Constraints (Invariants)

1. **Texture keys registered before any scene uses them.** All generators run in `BootScene` via `generateAllTexturesChunked` one-per-rAF. Missing keys render as green quads.
2. **Per-asset failure isolation.** Each generator uses `if (!c) return` within its own function; sibling generators in the same module run independently (commit `d5ba9fe` scar).
3. **Existing caller contracts survive.** `BudapestOverworldScene` and `JewishQuarterScene` both call `BudapestTransportScene` with `{ returnX, returnY }`. The new contract adds `returnScene`; both callers are migrated in the same Phase 1 commit.
4. **UI / letterbox / overlay / particle / full-screen-tint primitives are NOT touched.** The brief distinguishes world props (replace) from screen-effect primitives (keep). ~55 primitive calls are in scope; the remaining ~59 UI/effect primitive calls are deliberately untouched.
5. **Scene array/tween structure preserved.** Scenes loop over `trees[]`, `houses[]`, `railings[]` and bulk-tween them. Replacements are "one `Image` per logical prop" (not `TileSprite` or composite) except for the explicit scrolling-strip assets enumerated in §5.3.
6. **Depth bands unchanged.** 0–10 world background, 20–35 interactive, 40+ UI/letterbox, negatives for far background.
7. **Scroll factor defaults to 1 for world props.** Don't special-case.

---

## 4. Transport Scene Design

### 4.1 Scene identity

`BudapestTransportScene` is a **framed transient cutscene**, not a save target. The player sprite is NOT rendered (it's a fully framed cutscene like `BudapestBusRideScene`). It runs for exactly `PHASE_DURATIONS_MS` total, then launches the target scene with a typed payload. It does NOT call `saveCurrentScene()` — the calling scene already persisted state before launching, and the target scene persists its own entry state.

### 4.2 Destination routing table

Destinations are computed per-mount from `sceneData.returnScene`. "Jewish Quarter" is filtered out when the player is already in JewishQuarterScene (prevents self-loop).

| Button label | Target scene | Payload | Visible when |
|---|---|---|---|
| Go Back | `sceneData.returnScene` | `{ returnFromInterior: true, returnX, returnY }` | always |
| Jewish Quarter | `JewishQuarterScene` | `{ returnFromInterior: true }` | `returnScene !== 'JewishQuarterScene'` |
| Budapest Eye | `BudapestOverworldScene` | `{ returnFromInterior: true, returnX: 27*32+16, returnY: 21*32+16 }` | always |
| Airport (Go Home) | `AirplaneCutscene` | `{ destination: 'home' }` | always |

**The legacy "City Center" button is removed.** Its semantics collided with "Go Back" (both routed to Overworld with caller's `returnX/Y`). "Go Back" subsumes it cleanly.

### 4.3 Phase breakdown

```ts
export const PHASE_DURATIONS_MS = {
  T1_DEPARTURE: 2000,
  T2_PEST_STREETS: 4000,
  T3_LANDMARK: 4000,
  T4_CROSSING: 3000,
  T5_FADE_OUT: 2000,
} as const;
// Total: 15000ms (15s)
```

- **T1 Departure (0–2s):** tram stop scrolls off-right; parallax layers begin scrolling; departure-board overlay fades out; letterbox in; no dialogue.
- **T2 Pest Streets (2–6s):** mid-ground pastel buildings (reuse `bp-bus-building-pastel-1..4`), foreground street trees (`bp-street-tree`), street lamps (`bp-street-lamp`), overhead wires (`bp-tram-wire` tileSprite). Dialogue beat 1.
- **T3 Landmark (6–10s):** destination-specific hero silhouette — `bp-landmark-parliament` for Budapest Eye, `bp-landmark-ststephens` for Jewish Quarter, `bp-landmark-gellert-hill` for Airport transition. One beat-defining parallax moment. Dialogue beat 2 (couple reaction).
- **T4 Crossing (10–13s):** tram crosses Danube span — `bp-tram-danube-strip` tileSprite glimpse; couple leans together via existing `addLeanTogether` helper from `cutsceneHelpers.ts`.
- **T5 Fade-out (13–15s):** `this.cameras.main.fadeOut(2000, 0, 0, 0)`; on `CAMERA_FADE_OUT_COMPLETE`, `startScene(this, target, payload)`.

**Arrival-beat decision:** we **skip** the arrival beat. T5 is a camera fade-to-black, not a "tram pulls into destination stop" beat. Each destination scene owns its own arrival framing (matching the `AirplaneCutscene` pattern). A shared `bp-tram-stop-generic` with text-overlay signage would read exactly like the childish primitives we're removing; per-destination stop variants are asset bloat. Fade-out is cleaner, cheaper, and hands off correctly.

### 4.4 Scene-contract interface

Add to `src/game/scenes/sceneData.ts` `SceneDataMap`:

```ts
BudapestTransportScene: {
  returnX: number;
  returnY: number;
  returnScene: 'BudapestOverworldScene' | 'JewishQuarterScene';
};
```

Both existing callers (`BudapestOverworldScene.ts`, `JewishQuarterScene.ts`) add `returnScene` in the Phase 1 commit. Missing/unknown `returnScene` validated in `init()` and throws loud — the global crash overlay (commit `eeb71fc`) surfaces it. No silent default.

### 4.5 Shutdown cleanup pattern

```ts
export class BudapestTransportScene extends Phaser.Scene {
  private phaseTimers: Phaser.Time.TimerEvent[] = [];
  private activeTweens: Phaser.Tweens.Tween[] = [];
  private activeAnims: AnimationSet[] = [];

  // ... during scene construction, every this.time.delayedCall,
  // every this.tweens.add, and every AnimationSet instance is
  // pushed onto the appropriate array at creation time.

  shutdown() {
    this.phaseTimers.forEach(t => t.remove(false));
    this.activeTweens.forEach(t => t.stop());
    this.activeAnims.forEach(a => a.kill());
    this.phaseTimers.length = 0;
    this.activeTweens.length = 0;
    this.activeAnims.length = 0;
  }
}
```

Single teardown site; no ad-hoc cleanup in phase callbacks.

---

## 5. Final Design

### 5.1 Architecture overview

`PixelArtGenerator` pre-renders all 54 new textures into the Phaser texture cache during `BootScene` via `generateAllTexturesChunked` (one generator per rAF tick, existing pattern). Each generator module exports a typed `*_KEYS` constant; scenes import keys from that const, so typos become TypeScript compile errors rather than runtime green-boxes. `BudapestTransportScene` is rewritten as a cutscene composing `tileSprite`-scrolled parallax strips plus one-shot landmark silhouettes, framed by a diegetic departure-board overlay.

### 5.2 Components

**New files:**

- `src/game/rendering/BudapestWorldProps.ts` — generator module for new Budapest world-prop textures. Exports `BP_PROP_KEYS` (typed const mapping semantic names → texture keys) and `BP_WORLD_PROPS_PALETTE` (color constants for this module only; co-located to avoid split-brain with existing per-domain palettes).

**Modified files:**

- `src/game/rendering/PixelArtGenerator.ts` — register new generator modules in `generateAllTexturesChunked`.
- `src/game/rendering/AirportTextures.ts` — extend with Phase 3 tarmac/runway/taxiway/grass-horizon/terminal-window assets.
- `src/game/scenes/sceneData.ts` — add `BudapestTransportScene` entry to `SceneDataMap`.
- `src/game/scenes/budapest/BudapestBusRideScene.ts` — swap 8 world-prop primitive calls for `add.image` / `add.tileSprite` using typed keys. Add seeded `±12px` x-jitter on tree/railing/arrival-building loops.
- `src/game/scenes/budapest/BudapestTransportScene.ts` — full rewrite per §4.
- `src/game/scenes/budapest/BudapestOverworldScene.ts` — pass `returnScene: 'BudapestOverworldScene'` in transport call; swap 4 water-edge primitives (Phase 3).
- `src/game/scenes/budapest/JewishQuarterScene.ts` — pass `returnScene: 'JewishQuarterScene'` in transport call.
- `src/game/scenes/budapest/DanubeCruiseScene.ts` — swap 12 primitive calls (Phase 2).
- `src/game/scenes/budapest/ThermalBathScene.ts` — swap 8 primitive calls (Phase 2).
- `src/game/scenes/budapest/RuinBarScene.ts` — swap 1 dance-floor light (Phase 2).
- `src/game/scenes/budapest/AirbnbShowerScene.ts` — swap 15 primitive calls (Phase 3).
- `src/game/scenes/airport/AirportInteriorScene.ts` — swap 8 tarmac/runway primitives (Phase 3).

**Explicitly NOT created (per review):**

- ~~`src/game/rendering/palette.ts`~~ — split-brain with existing per-domain palettes. Use co-located `BP_WORLD_PROPS_PALETTE` in `BudapestWorldProps.ts`.
- ~~`src/game/util/requireTexture.ts`~~ — redundant with typed key constants. Typed `*_KEYS` catches typos at compile time.
- No `suppressSceneSave` registry flag. Replaced with design rule: *transient/cutscene scene files must never call `saveCurrentScene`*.

### 5.3 Asset list — 54 new texture keys

**Phase 1 — 16 keys** (BusRide world props + Transport scene):

| Key | Dimensions | Render mode | Purpose |
|---|---|---|---|
| `bp-road-surface` | 256×96 | tileSprite | Asphalt road surface, tiled horizontally |
| `bp-road-dash` | 64×8 | image (× many) | Yellow center-line dash segment |
| `bp-street-tree` | 48×88 | image (× many) | Plane tree, warm canopy with dithered shading |
| `bp-countryside-house` | 96×80 | image (× many) | Rural stucco house with red-tile roof + window |
| `bp-bridge-railing-post` | 16×48 | image (× many) | Iron post, riveted cap |
| `bp-arrival-building` | 96×120 | image (× many) | Pest tenement, 3 stories, shop awning |
| `bp-tram-shelter` | 120×64 | image | Glass-panel shelter with pillared roof + bench |
| `bp-tram-sign-pole` | 16×72 | image | Yellow circular sign on iron pole |
| `bp-tram-rail-near` | 256×12 | tileSprite | Near rail strip, visible ties |
| `bp-tram-rail-far` | 256×6 | tileSprite | Far rail strip, compressed perspective |
| `bp-tram-wire` | 256×4 | tileSprite | Overhead catenary line |
| `bp-tram-side` | 160×72 | image | Yellow CAF Urbos tram car side-view |
| `bp-tram-departure-board` | 160×96 | image (overlay) | BKV-style yellow/black signage; destination text rendered as Phaser Text on top |
| `bp-tram-landmark-parliament` | 240×120 | image | Parliament dome silhouette, backlit |
| `bp-tram-landmark-basilica` | 200×140 | image | St. Stephen's Basilica dome silhouette |
| `bp-tram-danube-strip` | 320×80 | tileSprite | Horizontal river band with ripple dither |

**Phase 2 — 12 keys** (DanubeCruise + ThermalBath + RuinBar):

| Key | Dimensions | Render mode |
|---|---|---|
| `bp-dock-structure` | 240×96 | image |
| `bp-night-building` | 88×112 | image |
| `bp-night-building-windows` | 88×112 | image (composited over night-building) |
| `bp-pixel-building-day` | 96×120 | image |
| `bp-pixel-building-windows` | 96×120 | image (composited) |
| `bp-castle-hill` | 320×160 | image |
| `bp-castle-glow` | 320×160 | image (additive blend) |
| `bp-thermal-arch-pillar` | 48×120 | image |
| `bp-thermal-arch-span` | 120×40 | image |
| `bp-thermal-pool-surface` | 320×160 | image |
| `bp-thermal-tile-border` | 32×32 | tileSprite |
| `bp-ruinbar-dance-light` | 64×64 | image (color tween, not frames) |

**Phase 3 — 17 keys** (AirbnbShower + Overworld water tiles + AirportInterior):

| Key | Dimensions | Render mode |
|---|---|---|
| `bp-shower-floor-tile` | 32×32 | tileSprite |
| `bp-shower-drain` | 16×16 | image |
| `bp-shower-rail` | 80×8 | image |
| `bp-shower-head` | 24×40 | image |
| `bp-shower-knob` | 16×16 | image |
| `bp-shower-mirror` | 64×80 | image |
| `bp-shower-fixture-base` | 32×24 | image |
| `bp-water-current` | 48×16 | image |
| `bp-water-edge-tile-a` | 32×32 | tileSprite |
| `bp-water-edge-tile-b` | 32×32 | tileSprite |
| `ap-tarmac-surface` | 512×320 | tileSprite |
| `ap-tarmac-gradient` | 256×64 | tileSprite |
| `ap-grass-horizon` | 256×48 | tileSprite |
| `ap-runway-dash` | 96×16 | image (× many) |
| `ap-taxiway-line-yellow` | 256×4 | tileSprite |
| `ap-taxiway-line-dashed` | 128×4 | tileSprite |
| `ap-airport-signage` | 64×40 | image |

**Total: 45 keys in Phase 1–3 (16 + 12 + 17).** All scrolling strips ≤512px wide to stay under the mobile canvas 2048-downsize threshold with headroom. The previously-proposed `bp-tram-stop-generic` was dropped when the arrival beat was removed (§4.3).

### 5.4 Data flow

1. `BootScene.create()` invokes `generateAllTexturesChunked(scene, progressCallback)` from `PixelArtGenerator.ts`. The module registry now includes `registerBudapestWorldProps(scene, queue)` and the extended `AirportTextures` entries.
2. Each generator pushes a canvas into `scene.textures` keyed by the value in its module's exported `*_KEYS` const. Per-asset failure isolation: one generator's `if (!c) return` does not affect siblings.
3. Scenes import keys, not strings:

   ```ts
   import { BP_PROP_KEYS } from '../../rendering/BudapestWorldProps';
   this.add.image(x, y, BP_PROP_KEYS.streetTree);
   ```

   A typo on either side is a TypeScript compile error. This collapses the two-sided typo surface (generator-side + scene-side) into one-sided.
4. Scrolling strip assets use `tileSprite`, tweened via `tilePositionX`:

   ```ts
   const road = this.add.tileSprite(0, 520, SCREEN_W, 96, BP_PROP_KEYS.roadSurface).setOrigin(0, 0);
   this.tweens.add({ targets: road, tilePositionX: 2048, duration: 15000, ease: 'Linear' });
   ```

   Non-scrolling props (buildings, landmarks, shelters, tram cars) use `add.image`.
5. `BudapestTransportScene` reads `this.sceneData.returnScene` in `init()`, builds the filtered destination list, renders `bp-tram-departure-board` with destination labels as Phaser text children, waits for player input, then runs the 5-phase tween sequence (§4.3) and fades to the target scene via `startScene(this, target, payload)`.

### 5.5 Error handling

- **Per-asset failure isolation:** every generator function uses `const c = scene.textures.createCanvas(key, w, h); if (!c) return;` within its own function. Sibling generators in the same module run independently. A single broken generator does not poison boot.
- **Compile-time typo detection:** typed `BP_PROP_KEYS`, `AP_TEXTURE_KEYS` constants are the single source of truth. Typos in either the generator or consumer become `tsc` errors caught by `npm run check`.
- **Transport scene contract:** `returnScene` validated in `init()`; throws loud on missing/unknown. Global crash overlay (commit `eeb71fc`) surfaces the error.
- **Save-system isolation:** `BudapestTransportScene` does not call `saveCurrentScene`. Design rule: transient/cutscene scene files never call it. No registry flag, no suppression mechanism — just don't call it.
- **Boot budget:** per-rAF chunking already exists; do NOT pre-split generators speculatively. Rule: *if `generateAllTexturesChunked` logs a tick >25ms for a specific generator during manual boot testing, split that one generator*.
- **Missing texture at runtime:** Phaser's default green-box rendering is the fallback; DevTools console surfaces the Phaser `TextureManager` warning.

### 5.6 Testing strategy

1. **`npm run check`** — `tsc --noEmit && vite build`. Must pass clean after each phase commit. Catches typed-key typos, `SceneDataMap` mismatches, `returnScene` payload errors.
2. **`MapValidator`** — unaffected by this change (validates overworld terrain/walkability, not props). Continues to run as today in dev.
3. **Manual per-scene walkthrough** — after each phase lands:
   - Phase 1: trigger `BudapestBusRideScene`, watch all 5 phases, verify trees/houses/railings/arrival-buildings are images not rectangles. Then trigger `BudapestTransportScene` from both `BudapestOverworldScene` and `JewishQuarterScene`; verify "Go Back" returns to correct overworld; verify "Jewish Quarter" button is hidden when already in JewishQuarter; verify 15s journey plays cleanly.
   - Phase 2: DanubeCruise + ThermalBath + RuinBar — walk through each, scan for rectangles, verify atmosphere consistency.
   - Phase 3: AirbnbShower + Overworld water edges + AirportInterior — same.
4. **DevTools console** — grep for `TEXTURE` warnings and "missing frame" errors; zero expected.
5. **Save/load test** — save in `BudapestOverworldScene`, enter transport scene, pick destination, reach destination, reload page, verify save restores to Overworld (not Transport — Transport is not a save target).
6. **Generator timing** — during manual boot, watch console for `generateAllTexturesChunked` per-tick logs. If any single generator logs >25ms, split that specific generator; do not pre-split.

### 5.7 File structure

```
src/
  game/
    rendering/
      PixelArtGenerator.ts                          [modified — register new generators]
      BudapestTextures.ts                           [unchanged]
      BudapestWorldProps.ts                         [NEW — generator + BP_PROP_KEYS + BP_WORLD_PROPS_PALETTE]
      AirportTextures.ts                            [modified — extend with Phase 3 assets + AP_TEXTURE_KEYS export]
      pixelHelpers.ts                               [unchanged]
    scenes/
      sceneData.ts                                  [modified — SceneDataMap entry for BudapestTransportScene]
      BootScene.ts                                  [unchanged (registry auto-iterates)]
      budapest/
        BudapestBusRideScene.ts                     [modified Phase 1 — typed keys + jitter]
        BudapestTransportScene.ts                   [REWRITTEN Phase 1]
        BudapestOverworldScene.ts                   [modified Phase 1 (returnScene) + Phase 3 (water tiles)]
        JewishQuarterScene.ts                       [modified Phase 1 — returnScene]
        DanubeCruiseScene.ts                        [modified Phase 2]
        ThermalBathScene.ts                         [modified Phase 2]
        RuinBarScene.ts                             [modified Phase 2]
        AirbnbShowerScene.ts                        [modified Phase 3]
      airport/
        AirportInteriorScene.ts                     [modified Phase 3]
```

No new directories. No new top-level util files.

### 5.8 Rollout sequencing

- **Phase 1 commit — `feat: pixel-art pass 1 + parallax tram journey`**

  Atomic: `BudapestWorldProps.ts` (16 generators + `BP_PROP_KEYS` + `BP_WORLD_PROPS_PALETTE`), `PixelArtGenerator.ts` registry entry, `sceneData.ts` `SceneDataMap` update, `BudapestBusRideScene.ts` primitive swap + seeded jitter, `BudapestTransportScene.ts` full rewrite, `BudapestOverworldScene.ts` + `JewishQuarterScene.ts` caller migration (adding `returnScene`).

- **Phase 2 commit — `feat: pixel-art pass 2 (cruise + thermal + ruinbar)`**

  Extend `BudapestWorldProps.ts` with 12 Phase-2 generator functions and `BP_PROP_KEYS` entries. Swap primitives in `DanubeCruiseScene.ts`, `ThermalBathScene.ts`, `RuinBarScene.ts`.

- **Phase 3 commit — `feat: pixel-art pass 3 (shower + water + airport)`**

  Extend `BudapestWorldProps.ts` (shower + water-edge generators) and `AirportTextures.ts` (tarmac/runway/taxiway/horizon/signage generators + `AP_TEXTURE_KEYS`). Swap primitives in `AirbnbShowerScene.ts`, `BudapestOverworldScene.ts` (water tiles), `AirportInteriorScene.ts`.

Each phase compiles, passes `npm run check`, and ships independently.

---

## 6. Resolved Decisions

**Five resolved open questions** (reviewer's call):

1. **Motion polish scope** — asset-only this pass. Motion curves / wheel flip / idle bob are a separate follow-up.
2. **Tram duration** — 15s committed (`PHASE_DURATIONS_MS` sums to 15000).
3. **Destination-select UX** — diegetic departure-board overlay; `bp-tram-departure-board` added to Phase 1; player sprite explicitly not rendered during the cutscene.
4. **`returnScene` contract widening** — accepted. Both existing callers migrate in the Phase 1 commit. Future callers get TS errors if they forget.
5. **Phase 1 scope** — full Phase 1 (BusRide + Transport + callers + generators) in one commit. 16-key recipe crystallizes better than 8.

**Eight major-issue fixes applied:**

- **M1** — `suppressSceneSave` registry flag deleted. Replaced with design rule: *transient/cutscene scene files must never call `saveCurrentScene`*. `BudapestTransportScene` does not call it.
- **M2** — Destination routing encoded as explicit table in §4.2. Legacy "City Center" button removed (semantics collided with "Go Back"). "Jewish Quarter" button filtered when `returnScene === 'JewishQuarterScene'`.
- **M3** — `requireTexture.ts` deleted from the file list. Replaced with typed `*_KEYS` constants exported from generator modules (`BP_PROP_KEYS`, `AP_TEXTURE_KEYS`).
- **M4** — No speculative generator splitting. Rule: split only if boot-tick logs >25ms for a specific generator.
- **M5** — No top-level `palette.ts`. `BP_WORLD_PROPS_PALETTE` co-located inside `BudapestWorldProps.ts`, matching per-domain-palette convention.
- **M6** — Diegetic departure-board overlay committed. `bp-tram-departure-board` added to Phase 1 asset list. Player sprite not rendered during transport scene.
- **M7** — All scrolling strip assets cut to tile-friendly widths (≤512px) and rendered via `tileSprite` with `tilePositionX` tweens. See §5.3 render-mode column.
- **M8** — `phaseTimers`, `activeTweens`, `activeAnims` named arrays + unified `shutdown()` teardown pattern (§4.5).

**Minor note:** arrival beat dropped in favor of T5 camera fade-to-black. `bp-tram-stop-generic` removed from asset list. Destinations own their arrival framing (matches `AirplaneCutscene` pattern).

---

## 7. Rollback

Each phase is a single commit, independently revertible via `git revert <sha>`.

- **Phase 1 revert:** restores the modal-style `BudapestTransportScene`, unwinds the `returnScene` caller migrations, drops the 16 Phase 1 textures, removes the Phase 1 registry entry. Save format is not affected (`returnScene` is a scene-data field, not persisted state). **Dependency:** if Phase 2 or Phase 3 have landed, they must be reverted first (they reference `BP_PROP_KEYS` entries). Rollback order: Phase 3 → 2 → 1.
- **Phase 2 revert:** independent. Drops 12 Phase 2 textures, restores primitive calls in DanubeCruise/ThermalBath/RuinBar. No save-format or scene-contract impact.
- **Phase 3 revert:** independent. Drops 17 Phase 3 textures, restores primitives in AirbnbShower/Overworld-water/AirportInterior. No save-format impact.

Playtest signal for "design is wrong":

- **Phase 1:** 15s tram feels padded; departure-board UX reads as obstructive; dialogue beats land flat. Revert or tune.
- **Phase 2/3:** per-asset visual regressions. Pre-revert, individual assets are independently swappable by reintroducing the single primitive call site — full-phase revert is last resort.
