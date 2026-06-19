// rishon3d/src/world/objects/signBand.ts
//
// A flat sign band (fascia) for mounting above a storefront: a simple colored
// rectangular board. makeSignBand() is the merged vertex-colored geometry.
// makeSignLitMesh() returns a THREE.Group with the board mesh plus a separate
// emissive surface plane on the face for a backlit / neon look.
//
// Convention: back face at z=0, grows toward +z, centered x=0, base at y=0.
// ~1u = 1m.

import * as THREE from 'three'
import { tintedBox, mergeTinted, tintedMesh } from './voxel'

export interface SignBandConfig {
  /** Width of the sign board in metres (required). */
  w: number
  /** Height of the sign board in metres (default 0.55). */
  h?: number
  /** Sign board color (default 0x1a2030 — dark navy). */
  color?: number
}

export function makeSignBand(cfg: SignBandConfig): THREE.BufferGeometry {
  const { w }    = cfg
  const h        = cfg.h     ?? 0.55
  const color    = cfg.color ?? 0x1a2030
  const d        = 0.14      // depth / thickness of the sign box

  const parts: THREE.BufferGeometry[] = []

  // Main board
  parts.push(tintedBox(w, h, d, 0, h / 2, d / 2, color))

  // Light border trim (bright inner frame strip)
  const trimInset = 0.04
  // Top strip
  parts.push(tintedBox(w - trimInset * 2, 0.025, 0.02, 0, h - trimInset, d + 0.01, 0xffffff))
  // Bottom strip
  parts.push(tintedBox(w - trimInset * 2, 0.025, 0.02, 0, trimInset, d + 0.01, 0xffffff))

  return mergeTinted(parts)
}

export function makeSignBandMesh(cfg: SignBandConfig): THREE.Mesh {
  return tintedMesh(makeSignBand(cfg))
}

/**
 * A THREE.Group with:
 *  1. The opaque board mesh (vertex-colored)
 *  2. A separate emissive plane on the sign face for a backlit look
 */
export function makeSignLitMesh(cfg: SignBandConfig): THREE.Group {
  const { w }    = cfg
  const h        = cfg.h     ?? 0.55
  const color    = cfg.color ?? 0x1a2030
  const d        = 0.14

  const group = new THREE.Group()

  // Board mesh
  group.add(tintedMesh(makeSignBand(cfg)))

  // Emissive face plane
  const panelGeo = new THREE.PlaneGeometry(w - 0.08, h - 0.08)
  const panelMat = new THREE.MeshStandardMaterial({
    color,
    emissive: new THREE.Color(color),
    emissiveIntensity: 0.6,
  })
  const panelMesh = new THREE.Mesh(panelGeo, panelMat)
  panelMesh.name = 'sign-face'
  panelMesh.position.set(0, h / 2, d + 0.012)
  group.add(panelMesh)

  return group
}
