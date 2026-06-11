# V2 Foundation + Airport Slice — Design Spec

**Date:** 2026-06-11
**Status:** Approved direction (clean-room v2, polish-first, minimal content)
**Supersedes:** all v1 plans for new content

## Vision

V2 of the couples game, built clean from scratch. The deliverable of this first slice is **the foundation** — a small set of systems built properly, plus just enough content to prove every system end-to-end. Less content, much higher quality. Everything after this slice (Maui, more minigames, Budapest remake) should become cheap to add because the base is good.

**Working title:** Mahalo.

## Core Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Strategy | Clean-room v2 in this repo, fresh `src/` | Half-in/half-out died once already (`v2-rebuild` branch). V1 archived via git tag `v1-final`. |
| Engine | Phaser 3 + Vite + TypeScript (strict) | Proven stack, existing knowledge, working Render deploy. |
| Art | Real pixel-art asset packs (CC0/free) | V1's all-procedural Canvas art is why quality drifted. Real tiles, real character animations. |
| Resolution | 640x360 virtual, `Scale.FIT`, `pixelArt: true`, integer-friendly zoom | Crisp pixels on every screen size including phones. |
| Tile size | 16x16, rendered at 2-3x zoom | Standard for available asset packs; chunky readable characters. |
| Input | Mobile-first: tap-to-move + keyboard | Partner plays on a phone. Touch is not an afterthought. |
| Persistence | localStorage, versioned with migrations | Carry the corruption-guard lesson from v1. |
| Audio | Carry over v1 procedural music/SFX engines behind a thin interface | The one good self-contained v1 subsystem. Supplement with CC0 SFX. |
| Hosting | Render static site (existing setup) | No change. |

## What "polish" means (quality bar)

These are hard rules for every scene that ships:

1. **No primitives as world props.** Every visible thing is a real sprite, a particle effect, or deliberate UI.
2. **Nothing is static.** Every scene has ambient motion: NPC idle loops, environmental animation, parallax, light.
3. **Every interaction has feedback.** Sound + motion (tween/shake/particle) on every tap, pickup, success, failure.
4. **Characters are animated.** 4-direction walk + idle minimum, from a real sprite sheet.
5. **60fps on a mid-range phone.** Measured, not assumed.
6. **Touch works as well as keyboard.** Every screen verified on a phone-sized viewport.

## Architecture

### Repo transition

- Tag current master `v1-final` (v1 stays fully recoverable; nothing deleted from history).
- Remove v1 `src/` from master; build v2 in a fresh `src/`. Keep `docs/` history.
- `package.json`, `vite.config.ts`, `tsconfig.json` rebuilt minimal-clean. Keep `npm run check` (typecheck + build) and the global crash overlay concept from v1.

### Project structure

```
src/
├── main.ts                     — Phaser config, system bootstrapping
├── core/
│   ├── BaseScene.ts            — fade in/out, typed transition helper, shutdown hygiene
│   ├── transitions.ts          — startScene<T>() typed payload wrapper
│   ├── SaveSystem.ts           — versioned localStorage, migrations, corruption guard
│   ├── InputSystem.ts          — keyboard + tap-to-move + virtual buttons, one API
│   ├── feel.ts                 — game-feel kit: tween presets, shake, flash, hit-stop, particles
│   └── debug.ts                — dev-only scene-jump menu, FPS meter, crash overlay
├── dialogue/
│   ├── DialogueSystem.ts       — portraits, typewriter text, choices, queue
│   └── scripts/                — dialogue content as data files
├── audio/                      — v1 engines ported as-is behind AudioFacade.ts
├── assets/
│   ├── manifest.ts             — single typed registry of every asset key + file
│   ├── tiles/  sprites/  audio/  photos/
│   └── ATTRIBUTION.md          — license + source for every pack used
├── world/
│   ├── maps/                   — Tiled JSON exports
│   ├── Player.ts  Partner.ts  NPC.ts
│   └── Checkpoint.ts           — memory-card trigger zones
├── ui/
│   ├── MemoryCard.ts           — photo + message overlay
│   ├── hud.ts                  — minimal HUD
│   └── styles/
├── scenes/
│   ├── BootScene.ts            — manifest-driven loading + progress bar
│   ├── TitleScene.ts
│   ├── AirportScene.ts
│   ├── minigames/CheckinGauntletScene.ts
│   └── FlightScene.ts
└── data/
    └── memories.json           — checkpoint content (photo, message, date)
```

### Foundation systems (the real deliverable)

**Scene framework.** `BaseScene` provides fade transitions, a typed `goTo(SceneKey, payload)` (rebuilt from v1's `startScene()` idea), and registered-cleanup shutdown so tweens/timers never leak across scenes.

**Asset pipeline.** One typed manifest maps asset keys to files; BootScene loads from it with a progress bar. A missing key fails loudly in dev. `ATTRIBUTION.md` is mandatory — no asset enters the repo without its license recorded. Curation rule: all packs must share a palette family; anything that visually clashes is rejected or recolored.

**Dialogue system.** Portrait + name + typewriter text box, advance on tap/key, optional 2-3 choice branches, scriptable sequences from data files. This is the biggest narrative unlock v1 never had.

**Save system.** Versioned schema with explicit migrations, JSON-parse corruption guard with user-visible recovery toast (v1 lesson, rebuilt clean). Stores: chapter progress, minigame best scores, seen memories, settings.

**Input system.** One API consumed by all scenes: keyboard (WASD/arrows + E/Escape) and touch (tap-to-move with path preview pulse, on-screen interact button when near a trigger). Pathfinding via simple A* on the walk grid (v1's min-heap lesson applies).

**Game-feel kit.** Small helpers used everywhere: `shake()`, `flash()`, `pop()` (scale-bounce tween), `floatText()`, particle presets (sparkle, dust, confetti). Minigames and UI must use these instead of bespoke one-offs.

**Audio.** V1's `ProceduralMusicEngine` / `SFXEngine` / `AmbientSoundEngine` ported unchanged behind a thin `AudioFacade` (play/stop music by mood, one-shot SFX by name). Mobile resume-after-suspend fix carries over.

## Content slice

Minimal content, each piece existing to prove systems end-to-end:

### 1. Title screen
Animated: parallax sky, drifting clouds, subtle logo motion, music. New Game / Continue (Continue only when a save exists). Proves: boot, assets, save detection, audio, feel kit.

### 2. Airport chapter (Ben Gurion)
One compact terminal map (Tiled, ~40x25 tiles) dense with life: travelers with idle/walk loops, departure board with flipping rows, luggage carts, announcements (ambient audio). The couple walks in together (Partner follows). One **memory checkpoint** (photo + message at the departures hall — proves MemoryCard + memories.json). A short **dialogue beat** at the entrance (proves DialogueSystem). Interactable check-in desk starts the minigame.

### 3. Check-in gauntlet (the one minigame)
Four micro-stages, 20-40 seconds each, score carried across:
1. **Pack the suitcase** — drag items into a suitcase grid, stay under the weight limit, beat the clock.
2. **Passport control** — pick your partner's real passport photo from a grid of decoys (personal-touch gag), then a stamp-timing bar.
3. **Security belt** — tap when items align in the scanner window; escalating speed.
4. **Gate dash** — short side-scrolling run dodging luggage carts, make the gate before final call.

Total score → 1-3 stars, saved per save-slot. Replayable from the check-in desk. Proves: input, feel kit, save scores, minigame scene pattern.

### 4. Flight cutscene
Window-seat framing, multi-layer parallax clouds, day fading to sunset over the ocean, one dialogue exchange between the couple, skippable. Ends on "Maui — to be continued" card → back to title (chapter marked complete). Proves: cutscene pattern, dialogue, transitions.

## Data model

```jsonc
// localStorage "mahalo-save-v2"
{
  "version": 2,
  "chapter": "airport",            // "airport" | "flight-done"
  "minigameStars": { "checkin": 2 },
  "seenMemories": ["departures-hall"],
  "settings": { "musicVolume": 0.8, "sfxVolume": 1.0 }
}
```

`memories.json` keeps v1's good idea: positions live in the Tiled object layer, content lives in JSON keyed by id.

## Testing & verification

- `npm run check` green at every commit (tsc strict + vite build).
- Pure logic (save migrations, score math, suitcase weight, A*) gets unit tests (Vitest).
- Each shipped scene verified against the six quality-bar rules, including a phone-sized viewport pass.

## Explicitly out of scope (v2.1+)

Maui map and arrival, turtle rescue, surf lesson, avatar customizer (two fixed, well-made sprites for the couple instead), Budapest remake, any port of remaining v1 scenes.

## Build order (high level)

1. Repo reset + skeleton (boot, BaseScene, manifest, check pipeline, debug tools)
2. Asset curation (the chosen packs, attribution, palette check)
3. Core systems (save, input, feel kit, dialogue, audio facade)
4. Title screen
5. Airport map + ambient life + memory checkpoint + dialogue beat
6. Check-in gauntlet
7. Flight cutscene + chapter completion loop
