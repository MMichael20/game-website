# Progress: FPS performance optimization (2026-06-21)

Branch: master (user requires master-only; no worktree)
Plan: docs/plans/2026-06-21-fps-performance-optimization.md
Base commit: 8cf55da

Gate per task: npx tsc --noEmit (NO tests, NO dev server, NO screenshots).
Final gate: npx tsc --noEmit + npx vite build.

- Task 1 (perf HUD): complete (commit b93bd15, tsc clean). NOTE: also swept user's pre-existing uncommitted WIP for Game.ts/main.ts into this commit; user approved "all goes to main".
- Task 2 (humanoid resource sharing): complete (commit 00f8516, tsc clean, review clean; phone mat kept per-instance, hair geom cached once)
- Task 3 (car resource sharing): complete (commit 5850f94, tsc clean, review clean; mat values preserved, variant dims => distinct keys)
- Task 4 (character per-frame alloc): complete (commit 0de9226, tsc clean; reuse tmpRight/tmpMove/UP)
- Task 5 (final gate): complete. npx tsc --noEmit clean; npx vite build succeeds (built in ~1.7s; pre-existing >500kB chunk warning only). Cross-cutting invariant verified: only the per-instance humanoid phone material is runtime-mutated; no shared resource mutated/disposed per-instance.

DONE (round 1). Commits: b93bd15 (perf HUD), 00f8516 (humanoid sharing), 5850f94 (car sharing), 0de9226 (character alloc). All on master. Not merged/deployed (already on master per user). User's unrelated WIP entangled into commits per user approval.

## Round 2 (user: still drops to 40; wants 60 cap + more opt)
Diagnostic from user's F3 HUD at the drop: draws 300-900 (moderate), tris <1M (LOW) => GPU FILL-RATE bound, not geometry/draw bound. User approved trading sharpness (pixelRatio 2->1.5).
- 5c33f9e: ~60fps soft cap (Engine MIN_FRAME) + sun shadow updates throttled to every other rendered frame (autoUpdate=false). tsc clean.
- 5fa69e3: pixelRatio cap 2->1.5 (biggest fill-rate win). tsc clean.
NEXT CANDIDATE LEVERS (fill-bound): remove logarithmicDepthBuffer (defeats early-Z; big fill win BUT z-fighting risk - needs user OK), merge static world geometry by material to cut 300-900 draws (also halves shadow-pass draws). Awaiting user test of current state.

## City-vibe expansion (2026-06-22)
Plan: docs/plans/2026-06-22-city-vibe-expansion-plan.md
Spec: docs/superpowers/specs/2026-06-22-city-vibe-expansion-design.md
Base commit: d9a54be
Branch: master (user requires master-only; no worktree). Auto mode (`auto all`).
Gate per task: npx tsc --noEmit. Final: tsc + npx vite build.

- Task 1 (highway object): complete (commit 0b2d1ba, tsc clean). All assumptions verified, no adaptation needed.
- Task 2 (buildingRow object): complete (commit 6187035, tsc clean). DISTRICT_PALETTES.north exists; mirrors terraceRow + gap.
- Task 3 (static-world freeze in World.ts): complete (commit f777236, tsc clean). matrixAutoUpdate + matrixWorldAutoUpdate=false; clouds excluded.
- Task 4 (map restructure): complete (commit 2e97f7d, tsc clean). ground 280, grid half=2 len260, 12 buildingRows (outer N/S/E/W), towers removed, highway z=-128 gantry on. Core untouched.
- Task 5 (final gate): complete. tsc clean; vite build OK (3.45s; only pre-existing >500kB chunk warning).
- Final whole-branch review (opus, d9a54be..HEAD): APPROVED. No Critical/Important. Minor nit only: highway `seed` param unused (API symmetry — left as-is).

DONE (city-vibe). Commits on master: 0b2d1ba, 6187035, f777236, 2e97f7d (+ doc commits). Not merged/deployed (already on master per user). NEXT PHASE (deferred, not started): very detailed airport + "press E to enter" map/scene switching that loads the airport map.
