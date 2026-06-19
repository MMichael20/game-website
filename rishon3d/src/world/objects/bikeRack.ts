// rishon3d/src/world/objects/bikeRack.ts
//
// A bike rack: a row of arch-shaped loops. Each loop has two vertical side posts
// and a horizontal top bar, forming a classic inverted-U bike parking rack.
//
// Convention: base at y=0, grows +y, centered x=z=0. ~1u = 1m.

import * as THREE from 'three'
import { tintedBox, cylinderY, mergeTinted, tintedMesh } from './voxel'

const RACK_COLOR  = 0x5a6a7a   // galvanised steel grey
const LOOP_W      = 0.55       // inner width of each loop
const POST_H      = 0.85       // height of vertical post
const POST_R      = 0.025      // radius of round post
const TOP_H       = 0.06       // diameter of top bar box
const LOOP_PITCH  = 0.70       // centre-to-centre spacing

export interface BikeRackConfig {
  /** Number of U-loops (default 3). */
  loops?: number
  /** Total width of the rack in metres (overrides loops if provided). */
  w?: number
}

export function makeBikeRack(cfg: BikeRackConfig = {}): THREE.BufferGeometry {
  const loops = cfg.loops ?? (cfg.w ? Math.max(1, Math.round(cfg.w / LOOP_PITCH)) : 3)
  const totalW = (loops - 1) * LOOP_PITCH
  const parts: THREE.BufferGeometry[] = []

  for (let i = 0; i < loops; i++) {
    const cx = -totalW / 2 + i * LOOP_PITCH

    // Left post
    parts.push(cylinderY(POST_R, POST_H, cx - LOOP_W / 2, POST_H / 2, 0, RACK_COLOR, 8))
    // Right post
    parts.push(cylinderY(POST_R, POST_H, cx + LOOP_W / 2, POST_H / 2, 0, RACK_COLOR, 8))
    // Top bar (horizontal, spans across the two posts)
    parts.push(tintedBox(LOOP_W + POST_R * 2, TOP_H, TOP_H, cx, POST_H + TOP_H / 2, 0, RACK_COLOR))
  }

  // Ground rail along the front connecting all loops (stops tipping)
  parts.push(tintedBox(totalW + LOOP_W + POST_R * 2, 0.035, 0.035, 0, 0.02, 0, RACK_COLOR))

  return mergeTinted(parts)
}

export function makeBikeRackMesh(cfg: BikeRackConfig = {}): THREE.Mesh {
  return tintedMesh(makeBikeRack(cfg))
}
