// rishon3d/src/world/objects/fountain.ts
//
// A simple public fountain: a wide shallow basin at ground level, a central
// column rising from the basin, and a flat water disc inside the basin.
//
// Convention: base at y=0, grows +y, centered x=z=0. ~1u = 1m.

import * as THREE from 'three'
import { cylinderY, disc, mergeTinted, tintedMesh, tintedBox } from './voxel'
import { WATER } from './objectPalette'

const STONE = 0xb8a898    // light sandstone
const STONE_DARK = 0x9a8878

export interface FountainConfig {
  /** Outer basin radius in metres (default 1.1). */
  r?: number
  /** Number of tiers above the basin (default 1). */
  tiers?: number
}

export function makeFountain(cfg: FountainConfig = {}): THREE.BufferGeometry {
  const r     = cfg.r     ?? 1.1
  const tiers = cfg.tiers ?? 1

  const parts: THREE.BufferGeometry[] = []

  // Basin: wide flat ring — outer disc then a slightly smaller inner recess
  const basinH = 0.22
  parts.push(cylinderY(r,       basinH, 0, basinH / 2, 0, STONE,      20))
  // Inner basin wall (cutout effect — darker ring on top)
  parts.push(cylinderY(r - 0.12, 0.06, 0, basinH + 0.03, 0, STONE_DARK, 20))

  // Water disc inside the basin
  parts.push(disc(r * 0.78, 0.04, 0, basinH - 0.04, 0, WATER, 20))

  // Central column rising from basin center
  const colR  = 0.12
  const colH  = 0.55 + (tiers - 1) * 0.35
  parts.push(cylinderY(colR, colH, 0, basinH + colH / 2, 0, STONE, 10))

  // Additional tiers: each tier is a smaller disc + short column
  for (let t = 1; t <= tiers - 1; t++) {
    const tierY = basinH + 0.55 + (t - 1) * 0.35
    const tierR = r * (0.55 - t * 0.12)
    const tierH = 0.10
    parts.push(disc(Math.max(0.15, tierR), tierH, 0, tierY, 0, STONE, 16))
    // Smaller water disc in upper tier
    parts.push(disc(Math.max(0.10, tierR * 0.7), 0.03, 0, tierY + tierH * 0.4, 0, WATER, 16))
    // Upper column
    const upColH = 0.35
    parts.push(cylinderY(colR * 0.8, upColH, 0, tierY + tierH + upColH / 2, 0, STONE, 8))
  }

  // Capstone on top of the column
  const capY = basinH + colH
  parts.push(disc(colR * 1.5, 0.07, 0, capY + 0.035, 0, STONE, 10))
  parts.push(tintedBox(0.08, 0.12, 0.08, 0, capY + 0.07 + 0.06, 0, STONE_DARK))

  return mergeTinted(parts)
}

export function makeFountainMesh(cfg: FountainConfig = {}): THREE.Mesh {
  return tintedMesh(makeFountain(cfg))
}
