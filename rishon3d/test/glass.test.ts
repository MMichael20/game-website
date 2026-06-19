import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import { makeGlassFrame, makeGlassPanel, GLASS_PRESETS } from '../src/world/objects/glass'

describe('glass', () => {
  it('frame geometry is non-empty, vertex-colored, and merged to one buffer', () => {
    const g = makeGlassFrame({ w: 3, h: 2.4, divisions: 2 })
    expect(g.getAttribute('position').count).toBeGreaterThan(0)
    expect(g.getAttribute('color')).toBeTruthy()
  })
  it('panel is a Group with a transparent pane mesh', () => {
    const panel = makeGlassPanel({ w: 3, h: 2.4, silhouette: true })
    expect(panel.type).toBe('Group')
    const meshes = panel.children.filter((c): c is THREE.Mesh => (c as THREE.Mesh).isMesh)
    expect(meshes.length).toBeGreaterThanOrEqual(2)
    const transparent = meshes.find(m => (m.material as THREE.Material).transparent)
    expect(transparent).toBeTruthy()
  })
  it('more divisions => more frame geometry (mullions add bars)', () => {
    const a = makeGlassFrame({ w: 4, h: 2.4, divisions: 0 }).getAttribute('position').count
    const b = makeGlassFrame({ w: 4, h: 2.4, divisions: 3 }).getAttribute('position').count
    expect(b).toBeGreaterThan(a)
  })
  it('door preset adds a handle', () => {
    const noHandle = makeGlassFrame({ w: 1.2, h: 2.4, handle: false }).getAttribute('position').count
    const withHandle = makeGlassFrame({ ...GLASS_PRESETS.door }).getAttribute('position').count
    expect(withHandle).toBeGreaterThan(noHandle)
  })
  it('is deterministic across calls', () => {
    const a = makeGlassFrame(GLASS_PRESETS.storefront).getAttribute('position').array
    const b = makeGlassFrame(GLASS_PRESETS.storefront).getAttribute('position').array
    expect(Array.from(a)).toEqual(Array.from(b))
  })
})
