// rishon3d/src/world/objects/glass.ts
//
// Layered glass panel object: a storefront / window / door with a vertex-colored
// opaque frame (merged to one geometry) plus a separate transparent pane mesh
// (shared material via assets cache), and an optional dim silhouette plane.
//
// Why split into meshes? transparent materials CANNOT be vertex-merged with opaque
// parts — Three.js sorting requires them to stay on separate geometry/material pairs.
//
// API:
//   makeGlassFrame(cfg)        → merged opaque BufferGeometry (frame+mullions+handle)
//   makeGlassPaneMaterial(cfg) → cached transparent MeshStandardMaterial
//   makeGlassPanel(cfg)        → THREE.Group: ≤3 meshes (frame + pane + silhouette?)
//   GLASS_PRESETS              → named configs for storefront, office, house, door
//
// Convention: base at y=0, grows +y, centered on x=z=0. ~1u = 1m.

import * as THREE from 'three'
import { tintedBox, mergeTinted, tintedMesh } from './voxel'
import { getMaterial } from '../assets'
import { GLASS } from './objectPalette'

// ─── Config ──────────────────────────────────────────────────────────────────

export interface GlassConfig {
  w: number           // pane width (m)
  h: number           // pane height (m)
  tint?: number       // pane color (default GLASS.pane)
  frameColor?: number // frame/mullion color (default GLASS.frame)
  divisions?: number  // number of vertical mullions (0 = none)
  door?: boolean      // true → adds a handle + center split vertical bar
  handle?: boolean    // override handle on/off (defaults to `door` value)
  silhouette?: boolean // add a dim interior plane behind the pane
  opacity?: number    // pane transparency (default 0.55)
}

const FRAME_T = 0.12    // frame bar thickness
const HIGHLIGHT_H = 0.06 // height of the baked highlight strip near top
const HANDLE_W = 0.04
const HANDLE_H = 0.28
const HANDLE_D = 0.08
const HANDLE_OFFSET_X = 0.18  // distance from panel center toward edge
const HANDLE_Y = 1.05          // center height of the grip
const MULLION_T = 0.06         // mullion bar cross-section

// ─── Frame geometry (opaque, vertex-colored, merged) ─────────────────────────

export function makeGlassFrame(cfg: GlassConfig): THREE.BufferGeometry {
  const frameColor = cfg.frameColor ?? GLASS.frame
  const divisions  = cfg.divisions  ?? 0
  const door       = cfg.door       ?? false
  const handle     = cfg.handle     ?? door
  const { w, h }   = cfg

  const parts: THREE.BufferGeometry[] = []

  const hw = w / 2
  const hh = h / 2

  // Bottom rail
  parts.push(tintedBox(w, FRAME_T, FRAME_T, 0, FRAME_T / 2, 0, frameColor))

  // Top rail
  parts.push(tintedBox(w, FRAME_T, FRAME_T, 0, h - FRAME_T / 2, 0, frameColor))

  // Left stile
  parts.push(tintedBox(FRAME_T, h, FRAME_T, -hw + FRAME_T / 2, hh, 0, frameColor))

  // Right stile
  parts.push(tintedBox(FRAME_T, h, FRAME_T, hw - FRAME_T / 2, hh, 0, frameColor))

  // Highlight strip: baked bright bar just inside the top rail
  const innerW = w - FRAME_T * 2
  const highlightY = h - FRAME_T - HIGHLIGHT_H / 2
  parts.push(tintedBox(innerW, HIGHLIGHT_H, FRAME_T * 0.5, 0, highlightY, 0, GLASS.highlight))

  // Vertical mullions
  if (door) {
    // Always a center seam bar for door
    parts.push(tintedBox(MULLION_T, h - FRAME_T * 2, FRAME_T, 0, hh, 0, frameColor))
    // Additional divisions on both sides of center
    if (divisions > 0) {
      const spacing = (hw - FRAME_T) / (divisions + 1)
      for (let i = 1; i <= divisions; i++) {
        parts.push(tintedBox(MULLION_T, h - FRAME_T * 2, FRAME_T, -i * spacing, hh, 0, frameColor))
        parts.push(tintedBox(MULLION_T, h - FRAME_T * 2, FRAME_T, i * spacing, hh, 0, frameColor))
      }
    }
  } else if (divisions > 0) {
    for (let i = 1; i <= divisions; i++) {
      const x = -innerW / 2 + (innerW / (divisions + 1)) * i
      parts.push(tintedBox(MULLION_T, h - FRAME_T * 2, FRAME_T, x, hh, 0, frameColor))
    }
  }

  // Door handle
  if (handle) {
    const hx = Math.max(0.05, hw * 0.5 - HANDLE_OFFSET_X)
    // Backplate
    parts.push(tintedBox(HANDLE_W * 2, HANDLE_H + 0.06, HANDLE_D * 0.5, hx, HANDLE_Y, HANDLE_D / 2, frameColor))
    // Grip bar
    parts.push(tintedBox(HANDLE_W, HANDLE_H, HANDLE_D, hx, HANDLE_Y, HANDLE_D, GLASS.handleColor))
  }

  return mergeTinted(parts)
}

// ─── Pane material (transparent, shared/cached) ───────────────────────────────

export function makeGlassPaneMaterial(cfg: GlassConfig): THREE.Material {
  const tint    = cfg.tint    ?? GLASS.pane
  const opacity = cfg.opacity ?? 0.55
  const key = `glass:${tint.toString(16)}:${opacity}`
  return getMaterial(key, () =>
    new THREE.MeshStandardMaterial({
      color:       tint,
      transparent: true,
      opacity,
      roughness:   0.1,
      metalness:   0.0,
      side:        THREE.DoubleSide,
      depthWrite:  false,
    })
  )
}

// ─── Panel Group (frame + pane + optional silhouette) ────────────────────────

export function makeGlassPanel(cfg: GlassConfig): THREE.Group {
  const { w, h, silhouette = false } = cfg
  const group = new THREE.Group()

  // 1. Opaque frame mesh
  const frameMesh = tintedMesh(makeGlassFrame(cfg))
  group.add(frameMesh)

  // 2. Transparent pane mesh
  const innerW = w - FRAME_T * 2
  const innerH = h - FRAME_T * 2
  const paneGeo = new THREE.PlaneGeometry(innerW, innerH)
  const paneMat = makeGlassPaneMaterial(cfg)
  const paneMesh = new THREE.Mesh(paneGeo, paneMat)
  // Centered at h/2 so the inner pane spans FRAME_T..h-FRAME_T vertically
  paneMesh.position.set(0, h / 2, 0)
  group.add(paneMesh)

  // 3. Dim silhouette plane at z=-0.05 behind the pane
  if (silhouette) {
    const silGeo = new THREE.PlaneGeometry(innerW, innerH)
    const silKey = `glass:silhouette:${GLASS.silhouette.toString(16)}`
    const silMat = getMaterial(silKey, () =>
      new THREE.MeshStandardMaterial({
        color:       GLASS.silhouette,
        transparent: true,
        opacity:     0.18,
        roughness:   0.9,
        metalness:   0.0,
        side:        THREE.FrontSide,
        depthWrite:  false,
      })
    )
    const silMesh = new THREE.Mesh(silGeo, silMat)
    silMesh.position.set(0, h / 2, -0.05)
    group.add(silMesh)
  }

  return group
}

// ─── Presets ─────────────────────────────────────────────────────────────────

export const GLASS_PRESETS: Record<'storefront' | 'office' | 'house' | 'door', GlassConfig> = {
  storefront: { w: 3.0, h: 2.8, divisions: 2, tint: GLASS.pane,   frameColor: GLASS.frame,  opacity: 0.50 },
  office:     { w: 2.4, h: 2.4, divisions: 1, tint: GLASS.paneOffice, frameColor: GLASS.frameOffice, opacity: 0.45 },
  house:      { w: 1.2, h: 1.4, divisions: 1, tint: GLASS.pane,   frameColor: 0xdce8f0,     opacity: 0.60, silhouette: true },
  door:       { w: 1.2, h: 2.4, door: true,   tint: GLASS.pane,   frameColor: GLASS.frame,  opacity: 0.55 },
}
