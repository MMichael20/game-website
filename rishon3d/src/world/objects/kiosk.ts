// rishon3d/src/world/objects/kiosk.ts
//
// A small modern street kiosk / newsstand stall: a boxy body with a flat roof
// overhang, a service counter along the front, and a recessed back wall.
//
// Convention: base at y=0, grows +y, centered x=z=0. ~1u = 1m.

import * as THREE from 'three'
import { tintedBox, mergeTinted, tintedMesh } from './voxel'
import { OFFICE_BLUE } from './objectPalette'

const WALL_COLOR   = 0xdde0e4    // light off-white walls
const ROOF_COLOR   = 0x3a3a3a    // dark roof
const COUNTER_CLR  = 0xc8cdd4    // slightly darker counter top
const ACCENT_COLOR = OFFICE_BLUE // accent stripe

export interface KioskConfig {
  /** Width of the kiosk in metres (default 2.4). */
  w?: number
}

export function makeKiosk(cfg: KioskConfig = {}): THREE.BufferGeometry {
  const w = cfg.w ?? 2.4
  const d = 1.6       // depth
  const h = 2.2       // wall height
  const roofOverhang = 0.25

  const parts: THREE.BufferGeometry[] = []

  // Main body box
  parts.push(tintedBox(w, h, d, 0, h / 2, 0, WALL_COLOR))

  // Accent stripe just below the roof
  parts.push(tintedBox(w, 0.15, d + 0.01, 0, h - 0.15, 0, ACCENT_COLOR))

  // Roof slab with overhang on front
  const roofH = 0.12
  parts.push(tintedBox(w + roofOverhang * 2, roofH, d + roofOverhang * 2, 0, h + roofH / 2, 0, ROOF_COLOR))

  // Counter bar along the front face
  const counterH = 0.85
  const counterD = 0.35
  parts.push(tintedBox(w - 0.1, counterH, counterD, 0, counterH / 2, d / 2 + counterD / 2, COUNTER_CLR))
  // Counter top slab
  parts.push(tintedBox(w - 0.08, 0.06, counterD + 0.04, 0, counterH + 0.03, d / 2 + counterD / 2, WALL_COLOR))

  // Service opening (recessed dark inset above the counter on front face)
  const openingW = w * 0.55
  const openingH = h - counterH - 0.22
  parts.push(tintedBox(openingW, openingH, 0.06, 0, counterH + openingH / 2 + 0.06, d / 2 - 0.01, 0x1a2030))

  return mergeTinted(parts)
}

export function makeKioskMesh(cfg: KioskConfig = {}): THREE.Mesh {
  return tintedMesh(makeKiosk(cfg))
}
