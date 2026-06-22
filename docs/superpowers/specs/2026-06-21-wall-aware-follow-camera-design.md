# Wall-aware follow camera — design

**Date:** 2026-06-21
**Status:** approved (wall-aware pull-in chosen by user); built in autonomous mode.

## Goal

The third-person orbit camera must never sit on the far side of a wall, ceiling, or
solid prop from the player. When you walk into a shop the camera pulls in close enough
to stay inside the room; outside it behaves exactly as today. No notion of "which store
am I in" — the behaviour is purely geometric and works everywhere (interiors and driving
past buildings alike).

## Current behaviour (the bug)

`src/core/FollowCamera.ts` orbits at a fixed `distance` (8 on foot, 14 driving) with **no
awareness of geometry**. Stores are `buildingShell` composites with floor/wall/ceiling
colliders and an open glass storefront you walk through. Inside a ~12x10m shop the camera
at distance 8 lands outside or through the walls, showing the exterior.

All wall/ceiling/furniture colliders already exist in Rapier as fixed bodies
(`World.ts` creates them from the manifest). The player capsule (`Character`) and car
cuboid (`Car`) are also Rapier bodies.

## Approach: wall-aware pull-in (GTA-style camera collision)

Each frame, after computing the desired camera position from yaw/pitch/distance:

1. Cast a ray from the **look-at point** (the player's head, `target.y + lookHeight`)
   toward the desired camera position.
2. If a solid collider is hit before the desired position, place the camera just short of
   the hit (`hitDistance - SKIN`, floored at `MIN_DIST`); otherwise use the full distance.
3. `lookAt` the head as today.

### What it casts against

All of the world's fixed colliders — walls, ceiling, counters, display cases. They are
already in Rapier; no tagging and no per-store data. Consequence (accepted): the camera
also pulls in when a solid prop (a counter) comes between you and it. This is standard
GTA-style behaviour and keeps the implementation simple.

### How it casts

Rapier `world.castRay(ray, maxToi, solid=true, …, filterExcludeRigidBody)` (v0.14). The
ray excludes the **active target's rigid body** (the player capsule on foot, the car when
driving) so the camera does not immediately self-hit. `RayColliderHit.timeOfImpact` with a
unit-length `dir` is the hit distance.

### Distances & smoothing

- `MIN_DIST` lowered to ~0.6 so tight interiors can pull the camera right up behind you.
- `MAX_DIST` unchanged.
- `SKIN` ~0.3 keeps the near plane off the wall surface.
- Asymmetric smoothing: **snap inward** instantly when a wall appears (so nothing clips
  through), **ease outward** with the existing frame-rate-independent lerp when it clears.

### Pure-math seam

The clamp ("hit toi -> clamped camera distance") lives as a pure function in
`src/core/cameraMath.ts` (matching the existing pure/testable pattern). `FollowCamera`
does the Rapier cast and the THREE vector work; the arithmetic is pure. No tests added now
(project rule: tests paused).

## Components touched

- `src/core/cameraMath.ts` — new pure `clampCameraDistance(hitToi, desiredDist, skin, minDist)`.
- `src/core/FollowCamera.ts` — ray cast + clamp + lower `MIN_DIST` + snap-in/ease-out;
  `setTarget` gains an optional `excludeBody`.
- `src/entities/Character.ts`, `src/entities/Car.ts` — expose a public `body` getter so the
  active target's rigid body can be excluded from the cast.
- `src/game/Game.ts` — pass the active body to `setTarget` on each mode switch.
- `src/main.ts` — construct `FollowCamera` with `physics`.

## Out of scope

Room detection, mode switching, minimap/HUD changes, first-person mode.

## Assumptions & Decisions

- Camera behaviour → chose **wall-aware pull-in** — user selected it over hard room
  containment; general, no per-room data, handles doorway transitions naturally.
- Cast targets → chose **all fixed colliders (incl. furniture)** not walls-only — they are
  already in Rapier; tagging walls would add complexity for little gain; matches "just
  build" simplicity.
- Cast method → chose **Rapier `castRay`** over pure AABB iteration over the collider list
  — physics already holds every collider, robust against arbitrary geometry, no per-frame
  iteration of the full box list.
- Self-hit avoidance → chose **`filterExcludeRigidBody` on the active target** + public
  `body` getters on `Character`/`Car`, over starting the ray outside the capsule — exact
  and simple.
- Smoothing → chose **snap-in / ease-out** over symmetric lerp — symmetric lerp briefly
  shows geometry through the wall on sudden appearance.
- Isolation → chose **build on master, no worktree** — overrides the autonomous-builder
  worktree step because the user's standing project rule is "work on master only".
- Execution → chose **direct implementation, not multi-subagent** — the change is small and
  tightly coupled across 6 files (a shared `setTarget` signature + cast wiring); splitting
  risks integration breakage. Deviates from subagent-driven-development for reliability.
