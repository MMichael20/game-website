# Wall-aware follow camera — implementation plan

Spec: `docs/superpowers/specs/2026-06-21-wall-aware-follow-camera-design.md`

## Steps

1. **Pure clamp helper** — `src/core/cameraMath.ts`
   - Add `clampCameraDistance(hitToi: number | null, desiredDist: number, skin: number, minDist: number): number`.
   - `null` -> `desiredDist`; else `clamp(hitToi - skin, minDist, desiredDist)`.

2. **Expose rigid bodies** — `src/entities/Character.ts`, `src/entities/Car.ts`
   - Add `get body(): RAPIER.RigidBody { return this.body }` — rename private field or
     return via a getter without name clash (use `getBody()` if a getter clashes with the
     private `body` field; here add a public accessor `rigidBody`).

3. **Camera collision** — `src/core/FollowCamera.ts`
   - Import `Physics`/`RAPIER` and the pure helper.
   - Constructor takes `physics: Physics`.
   - `setTarget(obj, distance, lookHeight, excludeBody?)` stores the exclude body.
   - Lower `MIN_DIST` to 0.6; add `SKIN = 0.3`.
   - In `update`: compute `head` (look-at point) and `desired`; build a unit `dir` and
     `maxDist`; `castRay` excluding the body; `clampCameraDistance`; snap-in / ease-out.

4. **Wire the active body** — `src/game/Game.ts`
   - Pass `this.character.rigidBody` / `this.car.rigidBody` to each `setTarget` call.

5. **Construct with physics** — `src/main.ts`
   - `new FollowCamera(engine.camera, physics)`.

## Verification gate (project rule)

- `npx tsc --noEmit` clean.
- `npx vite build` succeeds.
- No dev server, no screenshots, no tests (CLAUDE.md pitfalls 1 & 2). User looks in-game.
