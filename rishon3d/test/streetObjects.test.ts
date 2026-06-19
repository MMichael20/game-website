import { describe, it, expect } from 'vitest'
import { makeTrafficLight, makeTrafficLightMesh, makeStopSign, makePlanter, makeAwning } from '../src/world/objects'
const nonEmptyDet = (f:()=>any) => { const a=f().getAttribute('position').array; const b=f().getAttribute('position').array; expect(a.length).toBeGreaterThan(0); expect(Array.from(a)).toEqual(Array.from(b)) }
describe('street objects', () => {
  it('traffic light geo non-empty & deterministic', () => nonEmptyDet(() => makeTrafficLight()))
  it('traffic light mesh has 3 named emissive lenses', () => {
    const g = makeTrafficLightMesh(); const lenses = ['lens-red','lens-amber','lens-green'].map(n => g.getObjectByName(n))
    expect(lenses.every(Boolean)).toBe(true)
  })
  it('stop sign / planter / awning geo non-empty & deterministic', () => {
    nonEmptyDet(() => makeStopSign()); nonEmptyDet(() => makePlanter({withFlowers:true}))
    nonEmptyDet(() => makeAwning({w:6,colorA:0xcc3333,colorB:0xffffff,stripes:6}))
  })
})
