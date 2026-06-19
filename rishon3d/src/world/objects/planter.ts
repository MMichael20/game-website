// rishon3d/src/world/objects/planter.ts
//
// A rectangular street planter trough: box walls + a base, filled with dark
// soil, and optional flowers (reuses makeFlower from flower.ts).
//
// Convention: base at y=0, grows +y, centered x=z=0. ~1u = 1m.

import * as THREE from 'three'
import { tintedBox, mergeTinted, tintedMesh } from './voxel'
import { POT_TERRACOTTA, POT_SOIL, PETAL } from './objectPalette'
import { makeFlower } from './flower'

export interface PlanterConfig {
  /** Planter trough width in metres (default 1.2). */
  w?: number
  /** Planter trough depth (front-to-back) in metres (default 0.45). */
  d?: number
  /** Whether to add small flowers (default false). */
  withFlowers?: boolean
  /** Petal color for flowers if withFlowers=true (default PETAL[2]). */
  flowerColor?: number
}

const WALL_T   = 0.07    // trough wall thickness
const TROUGH_H = 0.38    // outer trough height

export function makePlanter(cfg: PlanterConfig = {}): THREE.BufferGeometry {
  const w            = cfg.w           ?? 1.2
  const d            = cfg.d           ?? 0.45
  const withFlowers  = cfg.withFlowers ?? false
  const flowerColor  = cfg.flowerColor ?? PETAL[2]

  const parts: THREE.BufferGeometry[] = []

  // --- Trough walls (4 sides) and base ---
  // Front wall
  parts.push(tintedBox(w, TROUGH_H, WALL_T, 0, TROUGH_H / 2, d / 2 - WALL_T / 2, POT_TERRACOTTA))
  // Back wall
  parts.push(tintedBox(w, TROUGH_H, WALL_T, 0, TROUGH_H / 2, -(d / 2 - WALL_T / 2), POT_TERRACOTTA))
  // Left wall
  parts.push(tintedBox(WALL_T, TROUGH_H, d, -w / 2 + WALL_T / 2, TROUGH_H / 2, 0, POT_TERRACOTTA))
  // Right wall
  parts.push(tintedBox(WALL_T, TROUGH_H, d, w / 2 - WALL_T / 2, TROUGH_H / 2, 0, POT_TERRACOTTA))
  // Base slab
  parts.push(tintedBox(w, WALL_T, d, 0, WALL_T / 2, 0, POT_TERRACOTTA))

  // Soil surface: flat disc/box inside the trough
  const innerW = w - WALL_T * 2
  const innerD = d - WALL_T * 2
  parts.push(tintedBox(innerW, 0.04, innerD, 0, TROUGH_H - 0.04, 0, POT_SOIL))

  // Optional flowers spaced along the trough
  if (withFlowers) {
    const flowerCount = Math.max(2, Math.round(w / 0.35))
    const spacing     = innerW / (flowerCount + 1)

    for (let i = 0; i < flowerCount; i++) {
      const fx = -innerW / 2 + spacing * (i + 1)
      // Alternate x-offset slightly for natural look (deterministic, no random)
      const fz = (i % 2 === 0 ? 0.04 : -0.04)

      const flowerGeo = makeFlower({ height: 0.28, petalColor: flowerColor })
      flowerGeo.translate(fx, TROUGH_H, fz)
      parts.push(flowerGeo)
    }
  }

  return mergeTinted(parts)
}

export function makePlanterMesh(cfg: PlanterConfig = {}): THREE.Mesh {
  return tintedMesh(makePlanter(cfg))
}
