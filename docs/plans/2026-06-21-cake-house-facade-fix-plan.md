# Cake House facade fix — plan

Spec: `docs/superpowers/specs/2026-06-21-cake-house-facade-fix-design.md`
All edits in `src/world/catalog/stores.ts`.

## Steps

1. **`makeExteriorFacade` rewrite** — introduce `T = 0.3` and `FACE = xo + T/2` / `zo + T/2`;
   mount body, stone base + string course, belt/cornice course, red fascia band PROUD of
   FACE on both sides + back; add evenly-spaced back-wall pilaster strips; deepen the roof
   cornice. Return the same `{ mesh }`.

2. **`makeSideWindows` rewrite** — taller windows + transom; pilaster strips between bays
   (base→fascia); a clerestory accent-window row on the upper band; re-offset
   glass/awning/planter/lantern to clear the proud cladding; update planter obstacles.

3. **Verify** — `npx tsc --noEmit` + `npx vite build`. No dev server / screenshots / tests.
