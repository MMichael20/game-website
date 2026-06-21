# Filler Building Detail + Dark-Glass Tower — Implementation Plan

Spec: `docs/superpowers/specs/2026-06-21-filler-building-detail-design.md`
Branch: master (user requires master-only; no worktree — logged decision).

**Goal:** Enrich `fillerBuilding` facade detail and add a `darkGlass` curtain-wall
style matching the reference art, then place a few in the map.

## Constraints (CLAUDE.md)
- Local space, deterministic (`mulberry32` only), every detail derived from dims.
- Rotation in {0,90,180,270}. One merged vertex-colored mesh; footprint unchanged.
- Verify with `npx tsc --noEmit` + `npx vite build` ONLY. No tests/dev server/screenshots.

---

### Task 1: Palette — dark-glass + facade-detail tones
**File:** `src/world/palette.ts` (append to `PALETTE`)
- Add: `glassReflect` (bright cyan reflection), `darkGlassA` (dark teal base),
  `darkGlassB` (deeper shaded), `darkMullion` (slim dark pier), `spandrel`
  (inter-floor band, warm grey), `pierStone` (masonry pilaster), `tankMetal`
  (rooftop water tank), `acUnit` (rooftop AC), `ventPipe` (vent).
- Verify: `npx tsc --noEmit`. Commit.

### Task 2: fillerBuilding — sills, reflective panes, style union
**File:** `src/world/catalog/fillerBuilding.ts`
- Extend `style` union with `"darkGlass"`; add `isGlass` (tower or darkGlass) and
  `isDark` flags. Pick `glassA/glassB`: darkGlass → `darkGlassA/darkGlassB`.
- In `addWindows`: add a thin **sill** slab under each window (derived from winW/winH),
  and for glass styles override a deterministic ~1/5 of panes with `glassReflect`
  (use a passed `reflect` color + `seed`-seeded check via row/col).
- Verify: `npx tsc --noEmit`. Commit.

### Task 3: fillerBuilding — pilaster piers + spandrel bands + rooftop cluster
**File:** `src/world/catalog/fillerBuilding.ts`
- `addPiers(parts, {axis, spanW, w, d, yStart, yEnd, color})`: vertical slim boxes
  on the column boundaries (cols derived same as windows), proud of the wall.
- `addSpandrels`: a thin proud band at each inter-story line across +z/+x/-x.
- Replace single rooftop box with a derived cluster: water tank (cylinder via
  tintedBox proxy), AC box, vent — positions from `rng`, gated by `roofUnit`.
- Taller parapet for `isGlass`.
- Verify: `npx tsc --noEmit`. Commit.

### Task 4: Map — place dark-glass towers
**File:** `src/world/map.ts`
- Re-theme skyline: make the center tower `style:"darkGlass"`; add 1 darkGlass tower
  set further back; convert one south-wall block to a darkGlass mid-rise.
- Keep clear of road (z∈[-5,1]) and spawns ((0,8)/(12,10)).
- Verify: `npx tsc --noEmit`. Commit.

### Task 5: Final gate
- `npx tsc --noEmit` clean; `npx vite build` succeeds. Commit any report. Hand back.

## Self-Review
- Spec coverage: darkGlass style (T2), shared detail sills/reflect/piers/spandrels/
  rooftop (T2,T3), palette (T1), placement (T4), gate (T5). All mapped.
- Determinism: only `mulberry32(seed)`; derived offsets; no magic child placement.
