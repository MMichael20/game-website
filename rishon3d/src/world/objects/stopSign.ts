// rishon3d/src/world/objects/stopSign.ts
//
// A STOP sign: slim round pole + white octagon backing rim + red octagon plate.
// seg=8 on cylinderY gives the octagonal prism shape. Everything is merged into
// a single vertex-colored BufferGeometry.
//
// Convention: base at y=0, grows +y, centered x=z=0. ~1u = 1m.

import * as THREE from 'three'
import { cylinderY, mergeTinted, tintedMesh, tintGeo } from './voxel'
import { SIGN, TRAFFIC } from './objectPalette'

export interface StopSignConfig {
  /** Pole height in metres (default 2.4). */
  poleH?: number
}

export function makeStopSign(cfg: StopSignConfig = {}): THREE.BufferGeometry {
  const poleH = cfg.poleH ?? 2.4
  const r     = 0.28     // octagon plate radius
  const h     = 0.05     // plate thickness

  const parts: THREE.BufferGeometry[] = []

  // Pole: slim post
  parts.push(cylinderY(0.04, poleH, 0, poleH / 2, 0, TRAFFIC.pole, 8))

  // White rim: slightly larger octagon just behind the red plate
  parts.push(cylinderY(r * 1.05, h * 0.6, 0, poleH + h / 2, -0.01, 0xffffff, 8))

  // Red octagon plate
  parts.push(cylinderY(r, h, 0, poleH + h / 2, 0, SIGN.red, 8))

  // White STOP text approximation: 3 thin horizontal bars across the face
  const barW = r * 1.1
  const barH = 0.03
  const barD = 0.015
  const textZ = h * 0.6
  for (let i = 0; i < 3; i++) {
    const barGeo = new THREE.BoxGeometry(barW * (i === 1 ? 0.55 : 0.72), barH, barD)
    barGeo.translate(0, poleH + h / 2 + (i - 1) * 0.09, textZ)
    parts.push(tintGeo(barGeo, SIGN.white))
  }

  return mergeTinted(parts)
}

export function makeStopSignMesh(cfg: StopSignConfig = {}): THREE.Mesh {
  return tintedMesh(makeStopSign(cfg))
}
