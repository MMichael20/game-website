// rishon3d/src/world/objects/awning.ts
//
// A striped shop awning. `stripes` slats are laid side-by-side along the width,
// alternating colorA / colorB. Each slat is slightly tilted forward to give the
// awning its characteristic droop. Returns a merged vertex-colored BufferGeometry.
//
// Convention: mounting edge at y=0, protrudes in +z direction, centered on x=0.
// ~1u = 1m.

import * as THREE from 'three'
import { mergeTinted, tintGeo, tintedMesh } from './voxel'

export interface AwningConfig {
  /** Total width along the storefront in metres (required). */
  w: number
  /** How far the awning protrudes from the wall in metres (default 1.1). */
  depth?: number
  /** First stripe color. */
  colorA: number
  /** Second (alternating) stripe color. */
  colorB: number
  /** Number of vertical slats (default 8). */
  stripes?: number
}

export function makeAwning(cfg: AwningConfig): THREE.BufferGeometry {
  const { w, colorA, colorB } = cfg
  const depth   = cfg.depth   ?? 1.1
  const stripes = cfg.stripes ?? 8

  const colW    = w / stripes
  const slatH   = 0.24      // thickness of each horizontal slat
  const tiltRad = 0.18      // forward droop in radians

  const parts: THREE.BufferGeometry[] = []

  for (let i = 0; i < stripes; i++) {
    const color = i % 2 === 0 ? colorA : colorB
    const cx    = -w / 2 + colW * (i + 0.5)

    const b = new THREE.BoxGeometry(colW, slatH, depth)
    b.rotateX(-tiltRad)               // tilt forward (droop)
    b.translate(cx, -slatH / 2, (depth / 2) * Math.cos(tiltRad))
    parts.push(tintGeo(b, color))
  }

  // Top mounting batten (flat, no tilt) to close the gap at the wall
  const batten = new THREE.BoxGeometry(w, 0.06, 0.08)
  batten.translate(0, 0, 0.04)
  parts.push(tintGeo(batten, colorA))

  return mergeTinted(parts)
}

export function makeAwningMesh(cfg: AwningConfig): THREE.Mesh {
  return tintedMesh(makeAwning(cfg))
}
