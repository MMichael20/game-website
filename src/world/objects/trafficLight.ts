// rishon3d/src/world/objects/trafficLight.ts
//
// A street traffic-light: a vertical pole with a housing box on top containing
// 3 lens discs (red / amber / green). makeTrafficLight() returns a merged
// vertex-colored BufferGeometry (pole + housing frame). makeTrafficLightMesh()
// returns a THREE.Group with the frame mesh plus 3 individually named emissive
// lens meshes so callers can animate the active lens.
//
// Convention: base at y=0, grows +y, centered x=z=0. ~1u = 1m.

import * as THREE from 'three'
import { tintedBox, cylinderY, mergeTinted, tintedMesh } from './voxel'
import { TRAFFIC } from './objectPalette'

export interface TrafficLightConfig {
  /** Pole height in metres (default 3.0). */
  poleH?: number
  /** Housing half-width in metres (default 0.22). */
  housing?: number
}

const DEFAULTS = { poleH: 3.0, housing: 0.22 }

/** Pole + housing frame geometry (no lens discs – those are separate emissive meshes). */
export function makeTrafficLight(cfg: TrafficLightConfig = {}): THREE.BufferGeometry {
  const poleH   = cfg.poleH   ?? DEFAULTS.poleH
  const hw      = cfg.housing ?? DEFAULTS.housing    // half-width of housing

  const parts: THREE.BufferGeometry[] = []

  // Pole: slim round post
  parts.push(cylinderY(0.055, poleH, 0, poleH / 2, 0, TRAFFIC.pole, 8))

  // Mounting arm: a short horizontal box connecting pole top to housing
  const armLen = 0.18
  parts.push(tintedBox(armLen, 0.06, 0.06, armLen / 2, poleH - 0.06, 0, TRAFFIC.pole))

  // Housing box: centered on pole top
  const housingH = hw * 3.2          // tall enough for 3 evenly spaced lenses
  const housingY = poleH + housingH / 2 - 0.05
  parts.push(tintedBox(hw * 2, housingH, hw * 1.4, armLen, housingY, 0, TRAFFIC.housing))

  // Visor lips above each lens opening (3 small overhanging shelves)
  const lensStep = housingH / 3
  for (let i = 0; i < 3; i++) {
    const lensY = housingY + housingH / 2 - lensStep * (i + 0.5)
    parts.push(tintedBox(hw * 2.1, 0.04, 0.12, armLen, lensY + lensStep * 0.5 - 0.04, hw * 0.7 + 0.06, TRAFFIC.housing))
  }

  return mergeTinted(parts)
}

/** Returns a THREE.Group: frame mesh + 3 emissive lens children named 'lens-red', 'lens-amber', 'lens-green'. */
export function makeTrafficLightMesh(cfg: TrafficLightConfig = {}): THREE.Group {
  const poleH   = cfg.poleH   ?? DEFAULTS.poleH
  const hw      = cfg.housing ?? DEFAULTS.housing
  const armLen  = 0.18
  const housingH = hw * 3.2
  const housingY = poleH + housingH / 2 - 0.05

  const group = new THREE.Group()

  // Frame mesh (vertex-colored, opaque)
  group.add(tintedMesh(makeTrafficLight(cfg)))

  // 3 emissive lens discs
  const lensR = hw * 0.35
  const lensZ = hw * 0.7 + 0.01   // just in front of housing face
  const lensStep = housingH / 3

  const lensSpecs: Array<{ name: string; color: number; emissive: number }> = [
    { name: 'lens-red',   color: TRAFFIC.red,   emissive: TRAFFIC.red   },
    { name: 'lens-amber', color: TRAFFIC.amber, emissive: TRAFFIC.amber },
    { name: 'lens-green', color: TRAFFIC.green, emissive: TRAFFIC.green },
  ]

  for (let i = 0; i < 3; i++) {
    const { name, color, emissive } = lensSpecs[i]
    const lensY = housingY + housingH / 2 - lensStep * (i + 0.5)
    const geo = new THREE.CylinderGeometry(lensR, lensR, 0.04, 12)
    geo.rotateX(Math.PI / 2)   // face forward (-z → +z front)
    const mat = new THREE.MeshStandardMaterial({ color, emissive, emissiveIntensity: 0.8 })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.name = name
    mesh.position.set(armLen, lensY, lensZ)
    group.add(mesh)
  }

  return group
}
