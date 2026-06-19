// rishon3d/src/world/storefront.ts
//
// Data-driven storefront detail kit. Composes the reusable object-library parts
// (glass panels, awning, sign band, wall lamps, planters) with bare-box
// architecture (body wall, base trim, roof trim) into a single THREE.Group, and
// returns the building-footprint as Rect[] obstacles for NPC collision.
//
// Convention:
//   - The Group is built around the spec's world coords (x, frontZ).
//   - Opaque architecture parts are merged per material-role into a few meshes.
//   - Glass panels are added as child Groups (transparent — can't merge with opaque).
//   - No Math.random / Date.now. Fully deterministic.
//   - Caller is responsible for adding the object to the scene and feeding
//     obstacles into the location's *PropObstacles().

import * as THREE from 'three'
import { tintedBox, mergeTinted, tintedMesh } from './objects/voxel'
import { makeGlassPanel, GLASS_PRESETS }       from './objects/glass'
import { makeAwning }                           from './objects/awning'
import { makeSignLitMesh }                      from './objects/signBand'
import { makeWallLampMesh }                     from './objects/wallLamp'
import { makePlanterMesh }                      from './objects/planter'
import { rectAround, type Rect }               from '../game/wander'
import { PALETTE }                              from './palette'

// ─── Public interface ─────────────────────────────────────────────────────────

export interface StorefrontSpec {
  /** Front face center – world X */
  x: number
  /** Front face center – world Z (faces –Z, i.e. storefront is at this Z) */
  frontZ: number
  /** Facade width in metres */
  w: number
  /** Facade height in metres */
  h: number
  /** Currently decorative (no text render) — drives sign presence when set */
  signText?: string
  /** Awning accent color; omit = no awning */
  awningColor?: number
  /** Which glass preset to use for the windows (default 'storefront') */
  glassStyle?: 'storefront' | 'office' | 'house'
  /** Where the door sits along the facade (default 'center') */
  doorSide?: 'center' | 'left' | 'right'
  /** Add wall lamps flanking the door */
  lamps?: boolean
  /** Add window planters at the base */
  planters?: boolean
  /** Add interior-peek silhouette behind the windows */
  interiorPeek?: boolean
}

export function makeStorefront(
  spec: StorefrontSpec
): { object: THREE.Group; obstacles: Rect[] } {
  const {
    x, frontZ, w, h,
    awningColor,
    glassStyle    = 'storefront',
    doorSide      = 'center',
    lamps         = false,
    planters      = false,
    interiorPeek  = false,
    signText,
  } = spec

  // Body depth: a shallow slab (storefront is ~0.6m deep)
  const depth = 0.6
  // The back of the building sits depth behind the front face
  const bodyCX = x
  const bodyCZ = frontZ - depth / 2   // body center Z (front face at frontZ)

  const group = new THREE.Group()

  // ─── Opaque architecture: merged into one mesh ──────────────────────────────

  const archParts: THREE.BufferGeometry[] = []

  // Body wall — full facade width/height, shallow depth
  // Built with front face sitting at frontZ (body extends in -Z direction)
  archParts.push(tintedBox(w, h, depth, bodyCX, h / 2, bodyCZ, PALETTE.houseBody))

  // Base trim: a darker horizontal band at ground level
  const baseTrimH = 0.25
  archParts.push(tintedBox(w + 0.05, baseTrimH, depth + 0.04, x, baseTrimH / 2, bodyCZ, PALETTE.cornice))

  // Roof parapet trim: a thicker cap on top
  const roofTrimH = 0.4
  archParts.push(tintedBox(w + 0.05, roofTrimH, depth + 0.04, x, h + roofTrimH / 2, bodyCZ, PALETTE.cornice))

  // Door frame (opaque surround; the glass door panel is added as a Group below)
  const doorW      = 1.4
  const doorH      = 2.5
  const doorFrameT = 0.14
  // Clamp offset so the door frame stays inside the facade body (margin 0.05m)
  const doorFrameHalfWidth = doorW / 2 + doorFrameT
  const maxOffset = Math.max(0, w / 2 - doorFrameHalfWidth - 0.05)
  const rawOffset = w * 0.28
  const clampedOffset = Math.min(rawOffset, maxOffset)
  const doorX      = doorSide === 'left'  ? x - clampedOffset
                   : doorSide === 'right' ? x + clampedOffset
                   : x
  const doorZ = frontZ + 0.05  // slightly proud of the body

  // Top lintel
  archParts.push(tintedBox(doorW + doorFrameT * 2, doorFrameT, doorFrameT,
    doorX, doorH + doorFrameT / 2, doorZ, PALETTE.facadeDoor))
  // Left jamb
  archParts.push(tintedBox(doorFrameT, doorH + doorFrameT, doorFrameT,
    doorX - (doorW / 2 + doorFrameT / 2), doorH / 2, doorZ, PALETTE.facadeDoor))
  // Right jamb
  archParts.push(tintedBox(doorFrameT, doorH + doorFrameT, doorFrameT,
    doorX + (doorW / 2 + doorFrameT / 2), doorH / 2, doorZ, PALETTE.facadeDoor))

  // Window zone: two windows, one each side of the door
  const winPreset   = GLASS_PRESETS[glassStyle]
  const winW        = Math.min(winPreset.w, (w - doorW - 0.8) / 2)
  const winH        = Math.min(winPreset.h, h - 1.2)
  const winY        = 0.6   // sill height
  const winSideOff  = doorW / 2 + 0.2 + winW / 2
  const winL        = doorX - winSideOff
  const winR        = doorX + winSideOff
  const winZ        = frontZ + 0.05

  // Window frame surrounds (opaque)
  const winFrameT = 0.1
  for (const wx of [winL, winR]) {
    // Top
    archParts.push(tintedBox(winW + winFrameT * 2, winFrameT, winFrameT,
      wx, winY + winH + winFrameT / 2, winZ, PALETTE.frame))
    // Bottom sill
    archParts.push(tintedBox(winW + winFrameT * 2, winFrameT, winFrameT * 2,
      wx, winY - winFrameT / 2, winZ, PALETTE.frame))
    // Left
    archParts.push(tintedBox(winFrameT, winH + winFrameT, winFrameT,
      wx - (winW / 2 + winFrameT / 2), winY + winH / 2, winZ, PALETTE.frame))
    // Right
    archParts.push(tintedBox(winFrameT, winH + winFrameT, winFrameT,
      wx + (winW / 2 + winFrameT / 2), winY + winH / 2, winZ, PALETTE.frame))
  }

  // Merge all opaque architecture
  const archMesh = tintedMesh(mergeTinted(archParts))
  group.add(archMesh)

  // ─── Sign band (opaque Group with emissive face) ────────────────────────────

  if (signText !== undefined) {
    // Show sign band only when signText is provided
    const signH   = 0.55
    const signW   = w * 0.80
    const signBand = makeSignLitMesh({ w: signW, h: signH, color: PALETTE.signWarm })
    // Mount at top of facade just below parapet
    signBand.position.set(x, h - signH - 0.1, frontZ + 0.08)
    group.add(signBand)
  }

  // ─── Glass door (transparent Group) ─────────────────────────────────────────

  const doorPanel = makeGlassPanel({
    ...GLASS_PRESETS.door,
    w: doorW,
    h: doorH,
  })
  doorPanel.position.set(doorX, 0, doorZ + 0.02)
  group.add(doorPanel)

  // ─── Window glass panels (transparent Groups) ────────────────────────────────

  for (const wx of [winL, winR]) {
    const winPanel = makeGlassPanel({
      ...winPreset,
      w: winW,
      h: winH,
      silhouette: interiorPeek,
    })
    winPanel.position.set(wx, winY, winZ + 0.02)
    group.add(winPanel)
  }

  // ─── Optional awning ─────────────────────────────────────────────────────────

  if (awningColor !== undefined) {
    const awningGeo  = makeAwning({
      w:      w * 0.85,
      depth:  1.0,
      colorA: awningColor,
      colorB: 0xf5f3ee,   // white stripe
      stripes: 8,
    })
    const awningMesh = tintedMesh(awningGeo)
    // Mount at top of the window zone
    awningMesh.position.set(x, winY + winH + 0.05, frontZ + 0.04)
    group.add(awningMesh)
  }

  // ─── Optional wall lamps ──────────────────────────────────────────────────────

  if (lamps) {
    const lampMountY = doorH * 0.75
    const lampOffset = doorW / 2 + 0.5

    for (const side of [-1, 1]) {
      const lampMesh = makeWallLampMesh()
      lampMesh.position.set(doorX + side * lampOffset, lampMountY, frontZ + 0.06)
      group.add(lampMesh)
    }
  }

  // ─── Optional planters ────────────────────────────────────────────────────────

  if (planters) {
    const planterW = Math.min(1.2, winW * 0.85)

    for (const wx of [winL, winR]) {
      const planterMesh = makePlanterMesh({ w: planterW, d: 0.4, withFlowers: true })
      planterMesh.position.set(wx, 0, frontZ + 0.28)
      group.add(planterMesh)
    }
  }

  // ─── Obstacles: building footprint only (excludes door gap) ──────────────────
  //
  // Rule 3: the returned Rect covers the facade body so NPCs walk around the
  // building. The door opening itself is NOT blocked (so a patron can walk in).

  const obstacles: Rect[] = [
    rectAround(bodyCX, bodyCZ, w, depth, 0.2),
  ]

  return { object: group, obstacles }
}
