# Interior props + character animation

**Date:** 2026-06-21
**Status:** approved direction ("add stuff inside", "phone-look + better walk + running");
finished in autonomous mode (`auto`).

Two independent work items in one session.

## A. More interior props (Cake House) — `src/world/catalog/stores.ts`

Adds decorative interior detail with near-zero collision risk (decorative or mounted on
existing surfaces; interior obstacle overlaps don't trigger the engine's placement warning):

- **Pendant ceiling lamps** over the café + communal seating (cord + shade + glow bulb +
  a modest point light each). A few, kept cheap.
- **Menu chalkboard** on the left wall above the display case (dark board, frame, light
  menu lines, a small cake-slice icon), facing into the room.
- **Framed pictures** along the right wall (a few small framed panels).
- **Pennant bunting** strung high across the front interior (alternating red/white).
- **Welcome mat** on the floor at the entrance.
- **Espresso machine + cups** on the L-case return-leg counter (a coffee bar; sits on the
  existing counter, no new collider).

## B. Character animation — `Humanoid.ts`, `Character.ts`, `Game.ts`, `main.ts`

1. **Phone-look pose.** When the phone UI opens, the character raises the right arm to hold
   a phone prop up to their face and tilts the head down to look at it; reverts on close.
   Because gameplay (and `Character.update`) freezes while the phone is open, the pose is set
   imperatively on open and cleared on close — it holds for the frozen frames.
   - `Humanoid` exposes `head` and a hidden `phone` prop (small dark slab in the right hand).
   - New `setPhonePose(limbs, on)` raises right (and slightly left) arm, tilts head, shows
     the phone; off hides it and lets the walk/idle animation reset the limbs.
2. **Better walking.** Larger, opposed arm swing, and a subtle vertical step-bob applied to
   the visual model (not the physics body) while moving.
3. **Running.** Hold Shift to run: higher move speed and a faster, higher-amplitude gait.
   A HUD chip documents it.

## Verification gate

`npx tsc --noEmit` clean + `npx vite build` succeeds. No dev server / screenshots / tests
(CLAUDE.md). User looks in-game.

## Assumptions & Decisions

- Interior props → chose **decorative / surface-mounted items only** (pendants, board,
  pictures, bunting, mat, espresso) over new floor furniture — avoids overlap with the
  existing tightly-packed layout and keeps it visually clean.
- Coffee station → chose **espresso machine on the existing L-counter** rather than a new
  freestanding counter — zero collision risk, reads as a coffee bar.
- Phone pose timing → chose **imperative set-on-open / clear-on-close** (driven from
  `Game`) because the game loop freezes while the phone is open, so a per-frame animation
  would not run.
- Running key → chose **Shift** (Left or Right) — conventional; `Input` already passes raw
  key codes.
- Step-bob → applied to the **visual `object` only**, not the kinematic body — avoids
  fighting the character controller / ground snap.
- A few pendant **point lights** are acceptable despite the project's "content over
  lighting" lean — they are decorative interior accents, kept low-intensity and few.
- Isolation → **build on master, no worktree** (user's standing rule).
- Execution → **direct implementation, not multi-subagent** — interdependent edits across a
  small set of files sharing the `Humanoid`/`Character`/`Game` seam.
