import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import { makeStorefront } from '../src/world/storefront'
describe('storefront kit', () => {
  const base = { x: 0, frontZ: 0, w: 8, h: 5, glassStyle: 'storefront' as const }
  it('returns a Group plus a non-empty obstacle footprint', () => {
    const { object, obstacles } = makeStorefront({ ...base, signText: 'CAFE', awningColor: 0xcc3333, lamps: true, planters: true })
    expect(object.type).toBe('Group'); expect(object.children.length).toBeGreaterThan(0)
    expect(obstacles.length).toBeGreaterThanOrEqual(1)
    expect(obstacles[0].maxX).toBeGreaterThan(obstacles[0].minX)
  })
  it('awning is optional', () => {
    const withA = makeStorefront({ ...base, awningColor: 0x3366cc })
    const noA = makeStorefront({ ...base })
    expect(withA.object.children.length).toBeGreaterThan(noA.object.children.length)
  })
  it('is deterministic (same spec => identical bounds)', () => {
    const box = (s:any) => { const b = new THREE.Box3().setFromObject(makeStorefront(s).object); return [b.min.toArray(), b.max.toArray()] }
    expect(box({ ...base, lamps: true })).toEqual(box({ ...base, lamps: true }))
  })
  it('signText drives sign presence', () => {
    const withSign = makeStorefront({ ...base, signText: 'CAFE' }).object.children.length
    const noSign = makeStorefront({ ...base }).object.children.length
    expect(withSign).toBeGreaterThan(noSign)
  })
})
