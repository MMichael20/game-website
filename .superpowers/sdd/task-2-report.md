# Task 2 Report: `buildingRow` catalog object

## What was created

- **New file:** `src/world/catalog/buildingRow.ts` — registers the `"buildingRow"` kind via `defineObject`. Produces a row of N freestanding backdrop buildings spaced along +x with a configurable gap between them. Each unit's center x is derived from the running sum of `(width + gap)` — no magic offsets (PITFALL 3). Reuses `"fillerBuilding"` via `buildObject` + `applyTransform`. Deterministic via `mulberry32`.
- **Modified file:** `src/world/catalog/index.ts` — appended `import "./buildingRow";` after `import "./highway";`.

## Assumptions verified against real source

| Assumption | Verified? | Notes |
|---|---|---|
| `compose()` shape in terraceRow | YES | Exact match — takes `ObjectResult[]`, returns `{ mesh: THREE.Group, colliders, obstacles }` |
| `applyTransform` / `buildObject` usage | YES | Same import paths: `../system/registry` and `../system/transform` |
| `fillerBuilding` param names | YES | Confirmed: `w, d, stories, storyH, bodyColor, style, ground, awningColor, roofUnit, faces, seed` |
| `Axis` type values | YES | `"+z" \| "-z" \| "+x" \| "-x"` — defined locally in `fillerBuilding.ts` |
| `ground` accepts `"plain" \| "storefront"` | YES (with note) | Also accepts `"none"` in real fillerBuilding; the plan only uses `"plain"` and `"storefront"`, which are valid subsets |
| `DISTRICT_PALETTES` exported from `palette.ts` | YES | Exported as `Record<string, number[]>` |
| District keys in `DISTRICT_PALETTES` | YES | Keys: `north`, `east`, `south`, `west`. "north" IS a valid key — default district param left as `"north"` (no adjustment needed) |
| `PALETTE.awningRed` exists | YES | `0xc0392b` |
| `PALETTE.awningBlue` exists | YES | `0x2980b9` |
| `ObjectResult`, `Box`, `Rect` in `system/types.ts` | YES | All three interfaces confirmed present |

## TypeScript typecheck result

```
npx tsc --noEmit
```

**Output:** (empty — no errors, exit 0). Clean.

## Commit

Commit hash: `6187035`
Message: `feat(world): add buildingRow catalog object`
Files: `src/world/catalog/buildingRow.ts` (new), `src/world/catalog/index.ts` (modified)
