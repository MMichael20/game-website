# Rishon 3D Spike — Design Spec

**Date:** 2026-06-18
**Status:** Auto-mode (autonomous-builder). Spec self-answered; decisions logged below.
**Topic:** A small drivable/walkable 3D vertical slice of Rishon LeZion, in the browser, to evaluate whether a full 3D ("GTA-vibe") rebuild of the game is worth pursuing.

## 1. Purpose & Success Criteria

The current game is a 2D Phaser pixel-art travel adventure. The user wants to evaluate a 3D, open-world, drive-and-walk direction ("GTA6 vibe"), engine-swap acceptable, **must run in the browser (frontend-only)**.

Rather than commit to a months-long rebuild, this spike builds ONE tiny slice to *feel* the result on a real screen and judge the graphics ceiling. Content is near-zero; the value is **foundations** that future content slots into.

**Success = a browser page where you can:**
1. See a small 3D block of Rishon near "the house" (third-person camera, depth, lighting, shadows).
2. Walk a character around; collide with buildings.
3. Approach a car, press E to enter, drive it with real car feel, press E to exit.
4. See 2-3 static NPCs standing in the world.
5. Start from a title menu; pause with Esc.
6. It builds clean (`tsc` + `vite build`) and a headless smoke test confirms it boots without console errors and renders a canvas.

**Explicit non-goals (YAGNI for the spike):** photoreal graphics, NPC AI, traffic, missions/story, audio, save system, large map, mobile/touch controls, multiplayer, the existing 2D game's content.

## 2. Stack Decision (research-backed)

**Chosen: vanilla TypeScript + Vite + Three.js + Rapier (`@dimforge/rapier3d-compat`).**

Research (2026): Babylon.js is the batteries-included pick for very large worlds, but **Three.js** has the largest ecosystem and — decisively for a spike — *official, proven building blocks for our two exact needs*:
- Official Three.js + Rapier **raycast vehicle** example (real car feel).
- Well-trodden Rapier **character controllers** (`KinematicCharacterController`) and patterns.

**Rapier** is the modern WASM physics standard and ships BOTH a vehicle controller and a character controller, so walk + drive come from one well-supported library. Using the `-compat` build avoids Vite top-level-await/WASM config friction.

Vanilla TS (not React/R3F) keeps the game loop explicit and matches the repo's existing toolchain. R3F can be adopted later if desired.

## 3. Scope — The Slice

- **World:** flat ground plane; a simple road grid (a few streets); ~6-10 low-poly box buildings of varied heights; one distinct "the house" landmark; a couple of trees/props. All **procedural primitives** (BoxGeometry + simple materials), no downloaded art. Soft directional light + ambient + sky + fog for depth.
- **Character:** capsule-based kinematic controller, third-person follow camera, WASD/arrows to move, collides with buildings and stays on ground.
- **Car:** one low-poly car body + 4 wheels, Rapier `DynamicRayCastVehicleController` (raycast suspension), WASD/arrows to drive, Space to brake. Third-person follow camera while driving.
- **Walk ⇄ Drive:** proximity prompt near the car ("Press E"); E enters (hide/freeze character, camera + input switch to car); E near a stopped car exits (character reappears beside car, control returns).
- **NPCs:** 2-3 static low-poly humanoid figures placed in the world. No movement, no AI.
- **UI:** title screen with Start button; in-game HUD hint line ("WASD move, E enter/exit"); pause overlay on Esc (Resume). Minimal DOM-overlay UI.

## 4. Architecture & Foundations

Self-contained sub-project so the **live game is never touched**: new folder `rishon3d/` with its own `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`. Root Phaser game and `render.yaml` are untouched.

```
rishon3d/
  index.html
  package.json            # three, @dimforge/rapier3d-compat; dev: typescript, vite, vitest
  vite.config.ts
  tsconfig.json
  src/
    main.ts               # bootstrap: create Engine, load world, start loop
    core/
      Engine.ts           # renderer, scene, camera, clock, resize, render loop, system tick
      Physics.ts          # Rapier world init (async WASM), step, debug helpers
      Input.ts            # keyboard state (pressed/justPressed), key mapping
      FollowCamera.ts     # third-person follow + smoothing; retargetable (char <-> car)
    entities/
      Character.ts        # kinematic capsule controller, movement, ground/collision
      Car.ts              # raycast vehicle: body, wheels, drive/steer/brake, sync meshes
      Npc.ts              # static low-poly figure
    world/
      World.ts            # assembles ground, roads, buildings, props, npcs from data
      rishonMap.ts        # DATA: building boxes, roads, spawn points, house, npc spots
      builders.ts         # mesh/collider factory helpers (box building, road, ground)
    game/
      Game.ts             # owns Character + Car, enter/exit state machine, camera target
      InteractionSystem.ts# proximity detection + "Press E" prompt logic (pure-ish)
    ui/
      Menu.ts             # title + pause overlays (DOM)
      Hud.ts              # hint line + interaction prompt (DOM)
  test/
    rishonMap.test.ts     # map data invariants (unique ids, valid coords, spawn present)
    interaction.test.ts   # proximity/enter-exit state logic (pure)
    input.test.ts         # justPressed edge transitions
```

**Design principles:**
- **Data-driven world:** adding streets/buildings later = editing `rishonMap.ts`, not engine code.
- **Retargetable camera + input ownership in `Game`:** enter/exit just swaps the camera target and which entity reads input. The walk⇄drive seam is the one stateful bit; it lives in `Game`/`InteractionSystem` and is unit-tested as pure logic where possible.
- **Testable seams:** rendering/physics are hard to unit-test, so pure logic (map validation, interaction proximity + enter/exit transitions, input edge detection) is extracted into pure functions and unit-tested with vitest. The renderer/physics integration is verified by a headless Playwright smoke test (boots, canvas present, no console errors, Start works).

## 5. Verification Strategy

Evidence required before claiming done:
1. `npm run build` in `rishon3d/` passes (`tsc --noEmit && vite build`).
2. `npm test` (vitest) passes for the pure-logic units.
3. Headless smoke test: serve the build, load the page, click Start, assert a `<canvas>` is present and `0` console errors after a short settle. (Playwright.)

No faked green. If verification fails after honest debugging, STOP and report (auto-mode critical stop).

## 6. Assumptions & Decisions (auto-mode log)

- Approval HARD-GATE → **skipped per auto mode**; self-answered and proceeding.
- Engine → chose **Three.js + Rapier** over Babylon — because official proven vehicle + character building blocks and largest ecosystem suit a de-risking spike better than Babylon's heavier all-in-one.
- Framework → chose **vanilla TS** (not R3F/React) — because explicit game loop, matches repo toolchain, less magic for a foundation.
- Rapier build → chose **`@dimforge/rapier3d-compat`** — because it avoids Vite top-level-await/WASM config friction.
- Physics from day one → chose **real Rapier physics now** (not throwaway arcade movement) — because the user asked for solid foundations that survive into the full rebuild.
- Project location → chose **self-contained `rishon3d/` sub-project with its own package.json** — because Three vs Phaser deps shouldn't mix, and the live game must stay untouched.
- Isolation order → chose **create worktree first, then write spec/plan/code on the branch** (deviating from the usual "commit spec to main first") — because `master` auto-deploys to Render; nothing experimental should land there.
- Map fidelity → chose **abstract low-poly block, not geographically accurate Rishon** — because the spike tests the *feel*, and real geometry is content for later.
- Art → chose **procedural primitives, no downloaded assets** — because fastest path to a feelable result; asset packs (e.g. Kenney) are a later upgrade.
- NPCs → chose **static figures, no AI** — because near-zero content per the brief.
- Controls → chose **desktop keyboard only**; touch controls noted as later work — because spike is judged on the user's machine first.
- Testing → chose **vitest for pure logic + Playwright headless smoke for the integrated app** — because rendering/physics can't be meaningfully unit-tested, but boot/render/no-errors is real evidence.

## 7. What Remains After the Spike (not in scope, for later decision)

If the feel is good: geographically real Rishon, asset packs / better models, NPC AI + traffic, audio, more districts, porting the story/places, mobile controls, day/night, performance budget for a larger world. Each its own spec → plan → build cycle.
