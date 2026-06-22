# Phone animation + character polish

**Date:** 2026-06-21
**Status:** autonomous mode (`/autonomous-builder`).

## Goal

Polish the character animation, focused on the phone interaction. Today the phone-look is
an instant static pose set on open/close; and because the game loop freezes while the phone
UI is up (`Game.update` early-returns), nothing can animate over frames. Make the phone
raise/lower a smooth, ticked animation, add small life to it, and polish idle + gait.

## Design

Files: `src/entities/Humanoid.ts`, `src/entities/Character.ts`, `src/game/Game.ts`.

1. **Ticked phone animation.** Character holds a `phoneAnim` (0..1) eased toward a
   `phoneTarget` (set 1 on open, 0 on close). A new `Character.tickPhone(dt)` advances it
   and applies a *blended* pose every frame. `Game.update` calls `tickPhone(dt)` at the very
   top — BEFORE the phone-open early-return — so the raise plays while the UI is up and the
   lower plays after it closes.
   - `Humanoid.applyPhonePose(limbs, t, sway)` blends neutral→phone pose by a smoothstep of
     `t`: right hand raises the phone to the face, left hand comes up, head tilts down. A
     subtle `sway` adds a "looking/scrolling" micro-motion, and the phone screen's emissive
     ramps up with `t`.
2. **Idle breathing.** `Humanoid.animateIdle(limbs, t)` gives a gentle arm/head sway when
   standing still (driven by an always-advancing idle clock), so the character isn't frozen
   stiff.
3. **Smooth gait transition.** The walk/run amplitude is eased (a `gait` value) instead of
   snapping between 0.6 and 0.95 when Shift toggles or when starting/stopping.

While `phoneAnim > 0.01` the phone pose owns the limbs, so the walk/idle animation is
skipped (no fighting).

## Verification

`npx tsc --noEmit` clean + `npx vite build` succeeds. No dev server / screenshots / tests.

## Assumptions & Decisions

- Raise plays with the UI already open (not a pre-open delay) → simpler, and the character
  is behind/around the overlay; the motion still reads.
- `tickPhone` runs every frame from `Game` (both frozen and normal branches) so open/close
  both animate; the walk/idle path is skipped while the phone pose is active.
- Idle/phone micro-motions are subtle and cheap (sine sway), matching the project's
  content-over-effects lean.
- Build on master, no worktree (user's standing rule); implement directly (one tight
  Humanoid/Character/Game seam).
