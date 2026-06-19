# Rishon3D — Call a taxi

**Date:** 2026-06-18 · Branch: worktree-3d-spike · Mode: autonomous-builder (`auto`), iteration IT7.

## Goal
Let the on-foot player **press T to call a taxi**. A yellow taxi drives to the player,
prompts to ride, then drives them to the town center and drops them off — a complete
"hail a ride" loop.

## Behaviour (state machine)

Phases: `idle → toPickup → waiting → toDropoff → idle`.
- **idle**: no taxi. On-foot + press **T** → spawn taxi at a road point, go **toPickup**.
- **toPickup**: taxi drives to the player's current position; HUD "Taxi arriving…". On arrival
  → **waiting**.
- **waiting**: taxi parked by the player; HUD "Press E to ride". Press **E** while near →
  hide character, camera follows taxi, go **toDropoff**.
- **toDropoff**: taxi drives to the town-center dropoff (≈ player spawn); HUD "Riding…". On
  arrival → drop the player beside the taxi (reusing `safeExitPosition`), camera back to the
  character, taxi hidden, → **idle**.

## Architecture

### Unit 1 — `src/game/taxi.ts` (new, pure)
- `type TaxiPhase = "idle" | "toPickup" | "waiting" | "toDropoff"`.
- `type TaxiEvent = "call" | "arrivedPickup" | "ride" | "arrivedDropoff"`.
- `nextTaxiPhase(phase, event): TaxiPhase` — the transition table above (unknown combos
  return the phase unchanged). **Unit-tested.**
- `stepToward(pos: Vec2, heading: number, target: Vec2, speed: number, dt: number, turnRate: number): { pos: Vec2; heading: number; arrived: boolean }`
  — eases heading toward target (`turnToward`), steps forward `speed*dt`, `arrived` when
  within an arrive radius. **Unit-tested** (approaches target; arrives; heading eases).

### Unit 2 — `src/entities/Taxi.ts` (new)
- A yellow car mesh (body + cabin, like `NpcCar`) at ground level. `object`, internal
  `pos`/`heading`. Methods: `spawnAt(p: Vec2)`, `setVisible(v)`, `driveTo(target: Vec2, dt): boolean`
  (moves via `stepToward`, syncs the mesh, returns `arrived`), `get position`. Decorative —
  no physics collider. Not unit-tested (Three.js).

### Unit 3 — `src/game/Game.ts` (edit) + `src/main.ts`
- Hold a `Taxi`, a `taxiPhase`, and the pickup/dropoff points. Each frame:
  - Read `input.justPressed("KeyT")` and `"KeyE"`.
  - Drive the phase machine with `nextTaxiPhase` on the right events (T when on-foot+idle;
    arrival booleans from `taxi.driveTo`; E when waiting+near taxi).
  - On entering **toDropoff**: hide/disable character, `follow.setTarget(taxi.object, …)`.
    On **arrivedDropoff**: `safeExitPosition` beside the taxi, re-show/enable character,
    `follow.setTarget(character.object, …)`, hide taxi.
  - **Gating:** while the taxi ride is active (`toDropoff`) or while E is consumed for the
    taxi, do NOT run the own-car enter/exit (`nextMode`) logic — so T-rides and own-car
    driving never conflict. The existing `InteractionSystem`/`nextMode` behavior is otherwise
    unchanged.
  - HUD prompts per phase (above), without clobbering the existing "Press E to drive/exit"
    prompts when no taxi is active.
- The taxi spawn point and dropoff are fixed road-aligned points near downtown.

## Invariants / testing
- World/physics untouched; taxi is kinematic + decorative (no collider) so it never blocks
  the drivable car.
- Determinism not affected (no RNG; taxi spawn/dropoff are fixed points).
- Tests: `taxi.test.ts` — `nextTaxiPhase` full table + `stepToward` (approach/arrive/heading).
  Existing suites stay green. `build` + `smoke` green. Browser check: press **T**, screenshot
  the taxi en route.

## Decisions (autonomous log)
- D1 Taxi as a Game-managed entity (not via `EntityManager`) — its target is dynamic
  (player, then dropoff), unlike the fixed-route `NpcCar`.
- D2 Reuse `turnToward` (pathFollow) + `safeExitPosition` (exit) rather than new geometry/AI
  — consistent and already tested.
- D3 Ride E-handling gated before own-car `nextMode` so the two ride modes never conflict;
  `InteractionSystem` itself is not modified.
- D4 Dropoff = town center (≈ player spawn) — a single, predictable destination keeps the
  feature legible; a destination picker is out of scope (YAGNI).
- D5 Taxi has no physics collider (decorative kinematic) — matches `NpcCar`, keeps the
  drivable car's handling unchanged.
