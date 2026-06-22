# Task 1 Report: `highway` catalog object

## What was created

- `src/world/catalog/highway.ts` — new file registering the `"highway"` kind via `defineObject`.
- `src/world/catalog/index.ts` — added `import "./highway";` after `import "./plaza";`.

## Assumption verification

All assumptions from the plan were confirmed correct. No substitutions were required.

### `tintedBox`, `mergeTinted`, `tintedMesh` (src/world/objects/voxel.ts)
- `tintedBox(w, h, d, x, y, z, hex)` — CONFIRMED. Returns `THREE.BufferGeometry`.
- `mergeTinted(parts: THREE.BufferGeometry[])` — CONFIRMED. Returns merged `THREE.BufferGeometry`.
- `tintedMesh(geo: THREE.BufferGeometry)` — CONFIRMED. Returns `THREE.Mesh`.

### `makeAsphaltTexture` and `GRAIN_M` (src/world/roads.ts)
- `makeAsphaltTexture()` — CONFIRMED. Returns `THREE.DataTexture`.
- `GRAIN_M` — CONFIRMED. Exported as `export const GRAIN_M = 2.5`.

### `makeInstanced` and `Placement` (src/world/InstancedProps.ts)
- `makeInstanced(geometry, material, placements, baseY)` — CONFIRMED. Returns `THREE.InstancedMesh`.
- `Placement` — CONFIRMED. Interface `{ x: number; z: number; rotationY?: number; scale?: number }`.

### `Box` and `Rect` types (src/world/system/types.ts)
- `Box` — CONFIRMED. `{ x, y, z, hx, hy, hz }` (center + half-extents, as used in the code).
- `Rect` — CONFIRMED. `{ x, z, w, d }` (center + full size, as used in the code).

### PALETTE keys (src/world/palette.ts)
All five keys referenced by the plan exist:
- `PALETTE.asphalt` — CONFIRMED (0x3a3a42).
- `PALETTE.curb` — CONFIRMED (0xd8d6cf).
- `PALETTE.parkGrass` — CONFIRMED (0x5fa83f).
- `PALETTE.steelDark` — CONFIRMED (0x868c93).
- `PALETTE.laneLine` — CONFIRMED (0xf3ecd0).

No key substitutions were needed.

## tsc result

`npx tsc --noEmit` — clean, no output, exit 0.

## Commit

Hash: `0b2d1ba`
Message: `feat(world): add highway catalog object`
Files: `src/world/catalog/highway.ts`, `src/world/catalog/index.ts`
