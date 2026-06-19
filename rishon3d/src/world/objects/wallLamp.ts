// rishon3d/src/world/objects/wallLamp.ts
//
// A wall-mounted bracket lamp: a short horizontal arm sticking out from the
// wall, a downward-facing cone shade, and a tiny bulb disc at the bottom.
//
// Convention: base at y=0 (wall-bracket back-plate), grows +y / arm extends
// in +z. Callers translate the mesh to mount height themselves. ~1u = 1m.

import * as THREE from 'three'
import { tintedBox, cone, disc, mergeTinted, tintedMesh } from './voxel'
import { LAMP } from './objectPalette'

export interface WallLampConfig {
  /** Arm length in metres (default 0.38). */
  armLen?: number
  /** Unused — kept for API compat. Callers should translate to mount height. */
  mountY?: number
}

export function makeWallLamp(cfg: WallLampConfig = {}): THREE.BufferGeometry {
  const armLen = cfg.armLen ?? 0.38

  // All geometry is built with y=0 at the wall bracket origin.
  const parts: THREE.BufferGeometry[] = []

  // Bracket base plate on the wall (centred at y=0.10, so base touches y=0)
  parts.push(tintedBox(0.08, 0.20, 0.06, 0, 0.10, 0.03, LAMP.bracket))

  // Horizontal arm at bracket mid-height
  const armH = 0.05
  parts.push(tintedBox(armLen, armH, armH, armLen / 2, 0.10, 0, LAMP.bracket))

  // Vertical drop from arm end down to shade
  const dropH = 0.14
  parts.push(tintedBox(0.03, dropH, 0.03, armLen, 0.10 - dropH / 2, 0, LAMP.bracket))

  // Shade: downward-pointing cone
  const shadeBase = 0.14
  const shadeH    = 0.18
  const shadeY    = 0.10 - dropH - shadeH
  parts.push(cone(shadeBase, 0.04, shadeH, armLen, shadeY + shadeH / 2, 0, LAMP.shade, 10))

  // Bulb: small bright disc at the very bottom of the shade
  parts.push(disc(0.05, 0.03, armLen, shadeY, 0, LAMP.bulb, 8))

  return mergeTinted(parts)
}

export function makeWallLampMesh(cfg: WallLampConfig = {}): THREE.Mesh {
  return tintedMesh(makeWallLamp(cfg))
}
