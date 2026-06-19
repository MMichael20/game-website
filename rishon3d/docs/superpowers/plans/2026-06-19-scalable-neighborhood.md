# Scalable Neighborhood (V2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to
> implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build reusable, data-driven kits (glass, storefront, prop-groups, surface-fill, location
registry, NPC behavior types, road/signal wiring, minimap-from-registry) and assemble a fuller
Roblox-style neighborhood (hero restaurant district + cafe, retrofit phone shop, real park, NEW
hi-tech office block) from them.

**Architecture:** Systems-first. Each kit is built on `objects/voxel.ts` primitives, vertex-color
baked, merged to few draw calls; recognizable items are `objects/*` modules registered in
`OBJECT_LIBRARY`; every kit that places chunky props returns its NPC `obstacles: Rect[]` alongside the
mesh. A new `world/locations.ts` `LocationDef[]` registry becomes the source; `POIS` is a derived
projection so existing consumers/tests keep working. The world grows to `ground.size=160`,
`center=(108,104)`.

**Tech Stack:** Three.js 0.169, Rapier (`@dimforge/rapier3d-compat`), Vite, TypeScript, Vitest (unit),
Playwright (smoke). Run from `rishon3d/`.

Spec: `docs/superpowers/specs/2026-06-19-scalable-neighborhood-design.md`. Worktree
`worktree-3d-spike`. **Do NOT merge/deploy.**

## Global Constraints (copied from CLAUDE.md + spec — apply to EVERY task)

- **Reusable objects, not bare cubes** (rule 1): recognizable items are `make<Thing>(cfg):
  THREE.BufferGeometry` + `make<Thing>Mesh` in `src/world/objects/`, built from `objects/voxel.ts`
  primitives, presets in `objectPalette.ts`, registered in `objects/index.ts` `OBJECT_LIBRARY`.
  Convention: base at y=0, grows +y, centered on x=z=0, ~1u=1m. Bare boxes only for architecture
  (walls/floors/counters/shelves/slabs).
- **One source of truth for coordinates** (rule 2): all location/door/counter/seat coords live in
  `world/districtPois.ts`; geometry/colliders/obstacles/NPC routes/minimap DERIVE from them — never
  hand-retype. (`rishonMap.ts` must NOT import `districtPois` — keep its mirrored literals to avoid the
  `rishonMap→districtPois→roads→rishonMap` import cycle.)
- **Register chunky prop footprints** (rule 3): `rectAround(cx,cz,w,d,margin)` in the same file that
  places the mesh, aggregated into `obstacles.PATRON_OBSTACLES`. EXCLUDE seating + open-shell interiors
  (they are dwell/enter targets). A patron dwell target must never lie inside an obstacle.
- **Props don't intersect** (rule 4): real spacing; tall items clear shelves above.
- **Determinism** (rule 5): NO `Math.random`/`Date.now`/argless `new Date()` in world/object/route
  builders. Seed via `world/rng.ts` `mulberry32`, or id-hash. Tests assert byte/bound identity.
- **Do NOT touch lighting / sky** (rule 6): no `core/sky.ts`, no post-processing. Emissive sign/lens
  accents are allowed. Fidelity comes from geometry/textures/props.
- **Draw-call discipline:** merge same-material geo via `mergeTinted`/`mergeGeometries`; use
  `InstancedProps.makeInstanced` for repeats; cache shared geo/materials via `assets.getGeometry/
  getMaterial`. Transparent panes need their own shared material (can't vertex-merge with opaque).
- **Gate (before any "done" claim):** `npx tsc --noEmit` clean · `npx vitest run` all green ·
  `npx vite build` · `npx playwright test` smoke = exactly **2 canvases** + **ZERO** console errors.
- Dev camera: `#view=x,z[,height][,dist]`; object catalog: `#objects`.

---

## Phase 1 — Leaf objects (purely additive; gate stays green)

### Task 1: Layered glass object

**Files:**
- Create: `src/world/objects/glass.ts`
- Modify: `src/world/objects/index.ts` (barrel + `OBJECT_LIBRARY`), `src/world/objects/objectPalette.ts`
  (add `GLASS` color set)
- Test: `test/glass.test.ts`

**Interfaces:**
- Consumes: `objects/voxel.ts` `{tintGeo, tintedBox, mergeTinted, voxelMaterial, tintedMesh}`;
  `assets.getMaterial`.
- Produces:
  ```ts
  export interface GlassConfig {
    w: number; h: number;            // pane size (m)
    tint?: number;                   // pane color (default GLASS.pane)
    frameColor?: number;             // default GLASS.frame
    divisions?: number;              // vertical mullions (0 = none)
    door?: boolean;                  // adds a handle + center split
    handle?: boolean;                // force handle on/off (default = door)
    silhouette?: boolean;            // dim interior plane behind pane
    opacity?: number;                // default 0.55
  }
  export function makeGlassFrame(cfg: GlassConfig): THREE.BufferGeometry  // opaque: frame+mullions+handle, merged
  export function makeGlassPaneMaterial(cfg: GlassConfig): THREE.Material  // shared via assets.getMaterial keyed by tint+opacity
  export function makeGlassPanel(cfg: GlassConfig): THREE.Group            // ≤3 meshes: frame(opaque) + pane(transparent) + optional silhouette
  export const GLASS_PRESETS: Record<'storefront'|'office'|'house'|'door', GlassConfig>
  ```
  Panel layout: pane centered at x=z=0, base y=0, grows +y; frame box outline ~0.12 thick; highlight =
  a thin brighter strip baked into the frame geo near the top; silhouette plane at z=-0.05 behind pane.

- [ ] **Step 1: Write the failing test** (`test/glass.test.ts`)

```ts
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
```

- [ ] **Step 2: Run test to verify it fails** — `npx vitest run test/glass.test.ts` → FAIL (module missing).
- [ ] **Step 3: Implement `glass.ts`** following the `objects/umbrella.ts` structure (config + DEFAULTS +
  presets + merged geo). Frame = `tintedBox` bars (left/right/top/bottom + `divisions` vertical bars +
  a thin highlight bar near top); optional handle = small `tintedBox`. Pane mesh uses
  `makeGlassPaneMaterial` (`new THREE.MeshStandardMaterial({ color, transparent:true, opacity,
  roughness:.1, metalness:0 })` cached via `assets.getMaterial('glass:'+tint+':'+opacity, …)`).
  Silhouette = a `PlaneGeometry` with a dim standard material. Add `GLASS` colors to `objectPalette.ts`
  (`pane`, `frame`, `highlight`, `silhouette`).
- [ ] **Step 4: Register** in `objects/index.ts` barrel + an `OBJECT_LIBRARY` entry `{name:'glass',
  variants:[{label:'storefront',geo:()=>makeGlassFrame(GLASS_PRESETS.storefront)}, …]}`.
- [ ] **Step 5: Run** `npx vitest run test/glass.test.ts` → PASS. Then `npx tsc --noEmit` clean.
- [ ] **Step 6: Commit** — `git add -A && git commit -m "feat(rishon3d): layered glass object kit"`

### Task 2: Street/sign/lamp/awning atoms as objects

**Files:**
- Create: `src/world/objects/trafficLight.ts`, `src/world/objects/stopSign.ts`,
  `src/world/objects/bikeRack.ts`, `src/world/objects/fountain.ts`, `src/world/objects/kiosk.ts`,
  `src/world/objects/awning.ts`, `src/world/objects/signBand.ts`, `src/world/objects/wallLamp.ts`,
  `src/world/objects/planter.ts`
- Modify: `src/world/objects/index.ts`, `src/world/objects/objectPalette.ts`
- Test: `test/streetObjects.test.ts`

**Interfaces (each follows `make<Thing>(cfg):BufferGeometry` + `make<Thing>Mesh`):**
```ts
export function makeTrafficLight(cfg?:{poleH?:number,housing?:number}):THREE.BufferGeometry  // pole + 3-lens housing
export function makeTrafficLightMesh(cfg?):THREE.Group  // frame geo + 3 emissive lens meshes (red/amber/green), lenses named 'lens-red'|'lens-amber'|'lens-green'
export function makeStopSign(cfg?:{poleH?:number}):THREE.BufferGeometry  // pole + octagon plate (red) + white rim
export function makeBikeRack(cfg?:{loops?:number,w?:number}):THREE.BufferGeometry
export function makeFountain(cfg?:{r?:number,tiers?:number}):THREE.BufferGeometry  // basin + center column + water disc
export function makeKiosk(cfg?:{w?:number}):THREE.BufferGeometry  // small modern stall
export function makeAwning(cfg:{w:number,depth?:number,colorA:number,colorB:number,stripes?:number}):THREE.BufferGeometry
export function makeSignBand(cfg:{w:number,h?:number,color?:number}):THREE.BufferGeometry  // + a makeSignLit mesh accent helper
export function makeWallLamp(cfg?:{}):THREE.BufferGeometry
export function makePlanter(cfg?:{w?:number,d?:number,withFlowers?:boolean,flowerColor?:number}):THREE.BufferGeometry  // trough+soil+optional flowers (reuse makeFlower)
```

- [ ] **Step 1: Write the failing test** (`test/streetObjects.test.ts`) — for each builder assert geo
  non-empty, has `color` attribute, deterministic across two calls; for `makeTrafficLightMesh` assert a
  Group with 3 lens meshes named `lens-red/amber/green` that are emissive. Example:

```ts
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
```

- [ ] **Step 2: Verify fail** — `npx vitest run test/streetObjects.test.ts`.
- [ ] **Step 3: Implement** each module on `voxel.ts` primitives (octagon = `cylinderY` seg=8; fountain
  basin = `cylinderY` + `disc` water; awning = striped `tintedBox` slats like existing `awningStripes`
  but parameterized; planter reuses `makeFlower`). Add color presets to `objectPalette.ts`
  (`SIGN`, `OFFICE_BLUE`, `AWNING`, `LAMP`, `TRAFFIC`).
- [ ] **Step 4: Register** all in `objects/index.ts` barrel + `OBJECT_LIBRARY`.
- [ ] **Step 5: Run** `npx vitest run test/streetObjects.test.ts` → PASS; `npx tsc --noEmit` clean.
- [ ] **Step 6: Commit** — `feat(rishon3d): street/sign/lamp/awning/fountain/kiosk objects`

---

## Phase 2 — Storefront detail kit

### Task 3: `world/storefront.ts`

**Files:**
- Create: `src/world/storefront.ts`
- Test: `test/storefront.test.ts`

**Interfaces:**
- Consumes: `objects/glass.ts`, `objects/awning.ts`, `objects/signBand.ts`, `objects/wallLamp.ts`,
  `objects/planter.ts`, `voxel.ts`, `wander.rectAround`, `Rect`.
- Produces:
  ```ts
  export interface StorefrontSpec {
    x: number; frontZ: number;        // front face center (world coords from districtPois)
    w: number; h: number;             // facade width/height
    signText?: string;                // currently decorative (no text render) — drives sign presence
    awningColor?: number;             // omit = no awning
    glassStyle?: 'storefront'|'office'|'house';
    doorSide?: 'center'|'left'|'right';
    lamps?: boolean; planters?: boolean; interiorPeek?: boolean;
  }
  export function makeStorefront(spec: StorefrontSpec): { object: THREE.Group; obstacles: Rect[] }
  ```
  Builds: body wall (bare box — architecture), base trim, roof trim, sign band + lit accent, door
  frame + glass door (`makeGlassPanel({door:true})`), window frames + large glass panes
  (`makeGlassPanel`), optional awning over the windows, optional wall lamps flanking the door, optional
  window planters at the base, optional interior-peek silhouette. `obstacles` = the facade footprint
  via `rectAround(x, frontZ - w*0…, w, depth, 0.2)` (the building body only — NOT the open door).

- [ ] **Step 1: Write failing test** (`test/storefront.test.ts`):

```ts
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
})
```

- [ ] **Step 2: Verify fail.** **Step 3: Implement** `makeStorefront` (merge opaque parts per material
  role into a few meshes; add glass panels as child groups). **Step 4: Run → PASS.** **Step 5:** `tsc`.
- [ ] **Step 6: Commit** — `feat(rishon3d): data-driven storefront detail kit`

---

## Phase 3 — Prop-group kits

### Task 4: `world/kits.ts` (group factories returning {object, obstacles})

**Files:**
- Create: `src/world/kits.ts`
- Test: `test/kits.test.ts`

**Interfaces:** each kit `(cfg) => { object: THREE.Object3D; obstacles: Rect[]; seats?: {x:number,z:number,faceYaw:number}[] }`
```ts
export function makePatioSet(cfg:{x:number,z:number,umbrella?:boolean}): KitResult        // table+4 chairs+umbrella; seats with faceYaw; chairs/table excluded from obstacles
export function makePlanterRow(cfg:{x:number,z:number,count:number,dx:number,axis?:'x'|'z'}): KitResult
export function makeBenchBinLamp(cfg:{x:number,z:number,faceYaw?:number}): KitResult       // bench(seat) + bin + lamp; bench seat excluded from obstacles
export function makeTaxiKit(cfg:{x:number,z:number}): KitResult
export function makeCrosswalkKit(cfg:{x:number,z:number,axis:'x'|'z',width:number,bands?:number}): KitResult  // mesh only, no obstacles
export function makeTrafficLightKit(cfg:{x:number,z:number,faceYaw?:number}): KitResult
export function makeStopSignKit(cfg:{x:number,z:number,faceYaw?:number}): KitResult
export function makePicnicKit(cfg:{x:number,z:number}): KitResult                          // picnic table + benches (seats)
export function makeFountainKit(cfg:{x:number,z:number,r?:number}): KitResult
export function makeOfficePlaza(cfg:{x:number,z:number,w:number,d:number}): KitResult       // paving + planters + bike rack + kiosk
export function makeBikeRackKit(cfg:{x:number,z:number}): KitResult
export function makeDisplayShelf(cfg:{x:number,z:number,faceYaw?:number,items?:string}): KitResult
export function makeCounterKit(cfg:{x:number,z:number,w:number,faceYaw?:number}): KitResult
export interface KitResult { object: THREE.Object3D; obstacles: Rect[]; seats?: {x:number,z:number,faceYaw:number}[] }
```

- [ ] **Step 1: Write failing test** — for each kit: `object` defined, `obstacles` is an array;
  seating kits expose `seats` with finite coords; `makeCrosswalkKit` has empty obstacles; chunky kits
  (planter row, taxi, fountain, bike rack, traffic light, stop sign) have ≥1 obstacle; seat/bench/patio
  chair coords are NOT inside their own returned obstacles. Determinism: same cfg → identical
  `Box3.setFromObject` bounds. (Write ~12 small `it()` blocks.)
- [ ] **Step 2: Verify fail.** **Step 3: Implement** composing Phase-1/2 objects; repeated sub-props via
  `makeInstanced`; obstacles via `rectAround`, EXCLUDING seats. **Step 4: PASS.** **Step 5:** `tsc`.
- [ ] **Step 6: Commit** — `feat(rishon3d): reusable prop-group kits`

---

## Phase 4 — Surface fill

### Task 5: `world/surfaceFill.ts`

**Files:** Create `src/world/surfaceFill.ts`; Test `test/surfaceFill.test.ts`.

**Interfaces:**
```ts
import { Rect } from './roadClear'      // {minX,maxX,minZ,maxZ}
export interface FillRegion { minX:number; maxX:number; minZ:number; maxZ:number }
export function fillSurface(region: FillRegion, kind: 'grass'|'plaza', seed: number, avoid?: Rect[]):
  { object: THREE.Object3D; obstacles: Rect[] }
// grass: deterministic scatter of flowers/bushes/small trees (via makeInstanced) avoiding `avoid` rects.
// plaza: paver tiles (merged) + a few planters/bins. Returns obstacle rects ONLY for chunky props (trees/planters/bins), NOT flowers/tiles.
```

- [ ] **Step 1: Write failing test** — `fillSurface` returns object + obstacles; deterministic for a
  fixed seed (identical scatter placements across two calls — assert by comparing `Box3` bounds and
  obstacle arrays); scattered chunky props do not fall inside `avoid` rects (pass one `avoid` rect and
  assert no obstacle overlaps it using `rectsOverlap`); empty region → no throw.
- [ ] **Step 2: Verify fail.** **Step 3: Implement** with `mulberry32(seed)` for placement; reject
  candidates overlapping `avoid` via `roadClear.rectsOverlap`. **Step 4: PASS.** **Step 5:** `tsc`.
- [ ] **Step 6: Commit** — `feat(rishon3d): deterministic surface-fill system`

---

## Phase 5 — Location registry

### Task 6: `world/locations.ts` + derive `POIS` from it

**Files:**
- Create: `src/world/locations.ts`
- Modify: `src/world/districtPois.ts` (re-export `POIS` as a projection of `LOCATIONS`),
  `src/world/obstacles.ts` (aggregate `allLocationObstacles()`)
- Test: `test/locations.test.ts`; keep `test/interactions.test.ts`, `test/obstacles.test.ts`,
  `test/minimapMath.test.ts` green.

**Interfaces:**
```ts
export type LocationType = 'home'|'restaurant'|'cafe'|'shop'|'office'|'park'|'taxi'|'transit'
export interface InteractionZone { center: Vec2; r: number; prompt: string; kind: PoiKind }
export interface LocationDef {
  id: string; name: string; type: LocationType;
  minimap: { glyph: string; color: string };
  zones: InteractionZone[];          // ≥1; first is the primary
  count?: number;                    // NPC budget for this location
}
export const LOCATIONS: LocationDef[]
export function locationPois(): Poi[]            // flatMap zones -> Poi (kind,id,label,x,z,r,glyph,color)
export function minimapEntries(): { x:number;z:number;glyph:string;color:string }[]
```
`districtPois.POIS` becomes `export const POIS = locationPois()` — **must deep-equal the current 7-entry
POIS** so `interactions.test`/`Minimap` stay green. (Verify by snapshotting the current POIS first.)

- [ ] **Step 1:** Capture current POIS: run a throwaway `node`/vitest log of `POIS` to record exact
  entries. **Write failing test** (`test/locations.test.ts`): `LOCATIONS` non-empty; every `LocationDef`
  has ≥1 zone; `locationPois()` deep-equals the recorded current `POIS` array (order-independent by id);
  `minimapEntries()` has one per location.
- [ ] **Step 2: Verify fail.** **Step 3: Implement** `locations.ts` referencing `districtPois`
  anchors/POI data; rewrite `districtPois.POIS = locationPois()`; ensure no import cycle (`locations.ts`
  imports `districtPois`, not vice-versa — move the `Poi`/`PoiKind` types if needed to break cycles).
- [ ] **Step 4:** `npx vitest run test/locations.test.ts test/interactions.test.ts test/obstacles.test.ts
  test/minimapMath.test.ts` → all PASS. **Step 5:** `tsc`.
- [ ] **Step 6: Commit** — `feat(rishon3d): location registry; POIS derived from it`

---

## Phase 6 — NPC behavior types

### Task 7: behavior-type routes + per-seat sit yaw

**Files:**
- Modify: `src/game/patronRoutine.ts` (new route builders), `src/game/itinerary.ts` (new ACTIVITIES),
  `src/entities/Patron.ts` (per-seat `faceYaw`), `src/world/districtPois.ts` (add `faceYaw` to seat data
  where needed)
- Test: extend `test/patronRoutine.test.ts`, `test/itinerary.test.ts` additively; keep them green.

**Interfaces:**
```ts
// patronRoutine.ts — new closed-loop route builders (mirror dineInRoute):
export function parkLoopRoute(): Waypoint[]
export function cafeRoute(side?: number): Waypoint[]
export function officeLobbyRoute(side?: number): Waypoint[]
export function sidewalkLoopRoute(p1: Vec2, p2: Vec2): Waypoint[]
export function workerStationRoute(post: Vec2, faceYaw: number): Waypoint[]   // stand/dwell at a counter
// Waypoint gains optional faceYaw:
export interface Waypoint { to: Vec2; state: PatronState; dwell: number; faceYaw?: number }
```
`Patron.poseSitting` uses `wp.faceYaw ?? (legacy CX heuristic)`.

- [ ] **Step 1: Write failing tests** (additive): each new route builder returns a non-empty closed
  loop with finite coords; a route with a `faceYaw` waypoint preserves it; a patron stepped through a
  `workerStationRoute` reaches and dwells at the post; `parkBenchIdle` waypoint poses at its `faceYaw`.
  Add to `itinerary.test.ts`: new ACTIVITIES names are in the allowed set; determinism preserved.
- [ ] **Step 2: Verify fail.** **Step 3: Implement** route builders + `faceYaw` plumbing + add
  `parkWalk`, `officeVisit`, `cafeVisit` ACTIVITIES. **Step 4:** `npx vitest run test/patronRoutine.test.ts
  test/itinerary.test.ts` → PASS. **Step 5:** `tsc`.
- [ ] **Step 6: Commit** — `feat(rishon3d): NPC behavior-type routes + per-seat sit facing`

---

## Phase 7 — Map expansion & framing (cross-cutting)

### Task 8: Grow the world; add new anchors; populate roads

**Files:**
- Modify: `src/world/districtPois.ts` (OFFICE_*, CAFE_*, expanded PARK_*, EAST_CROSS street consts,
  intersection points), `src/world/rishonMap.ts` (`CORE_MAP.ground = {size:160, center:{x:108,z:104}}`;
  add cross-street `RoadDef`s + new building footprints (office tower, cafe) as data; update mirrored
  literals), `src/world/worldData.ts` (no logic change; verify assembleMap)
- Test: update `test/worldData.test.ts` (`size<=180`), `test/rishonMap.test.ts` (new roads/buildings),
  keep `validateMap` green.

**Pinned values:** `ground.center=(108,104)`, `ground.size=160` → bounds x∈[28,188], z∈[24,184].
East cross street: vertical `RoadDef {id:'east-cross', x:128, z:112, length:40, horizontal:false}`.
Office tower footprint ~`{x:142, z:100, w:18, d:16, h:22}`. Cafe ~`{x:62, z:SHOP_Z, w:12, d:9}` (west of
bakery, extends the hero district). All exact coords as new `districtPois` consts; `rishonMap` mirrors.

- [ ] **Step 1:** Update `test/worldData.test.ts` size bound to `<=180`; add `test/rishonMap.test.ts`
  expectations for the office + cafe building ids and the `east-cross` road. Run → FAIL.
- [ ] **Step 2: Implement** the anchor + map data changes. Keep `validateMap` invariants (exactly one
  isHouse; in-bounds; unique ids; npc spawns not in a building). **Step 3:** `npx vitest run
  test/worldData.test.ts test/rishonMap.test.ts test/roadClear.test.ts` → PASS. **Step 4:** `tsc`.
- [ ] **Step 5: Commit** — `feat(rishon3d): grow world to 160 + office/cafe/east-cross map data`

---

## Phase 8 — Content assembled from the kits

> Each task in this phase adds geometry + colliders + obstacles + a `LocationDef`, then runs the gate.
> `restaurantStreet.test.ts` numeric bounds/counts are updated deliberately (keep the semantic asserts).

### Task 9: Hero restaurant district — widen restaurant + add cafe + rich patio

**Files:** Modify `src/world/restaurantStreet.ts` (use `makeStorefront` for the restaurant front + new
cafe; patio via `makePatioSet`/`makePlanterRow`), `src/world/restaurantColliders.ts` (cafe shell +
updated infill), `src/world/restaurantInterior.ts` (widen) + new `src/world/cafeInterior.ts`,
`src/world/locations.ts` (cafe LocationDef), `src/world/districtPois.ts` (cafe anchors/seats).
Test: update `test/restaurantStreet.test.ts` bounds/counts; keep ≥3 `restaurantBuilding`, 1 `awnings`,
1 `pickupStand`, ≥3 instanced, determinism, `RESTAURANT==={x:95,z:103}`, SE placement; keep
`obstacles.test.ts` + `restaurantColliders.test.ts` green.

- [ ] Steps: (1) update `restaurantStreet.test.ts` numeric asserts to the new content + add a cafe
  building-mesh assert; run→FAIL. (2) implement cafe (storefront kit + interior shell) + retrofit
  restaurant front glass to `makeGlassPanel` + patio via kits, register cafe obstacles + collider +
  LocationDef + anchors. (3) `npx vitest run` (full) → PASS. (4) `tsc` + `vite build`. (5) Commit
  `feat(rishon3d): hero restaurant district — cafe + kit-built patio`.

### Task 10: Retrofit phone/tech shop onto the kit

**Files:** Modify `src/world/secondaryLocations.ts` (`makePhoneShop` → `makeStorefront` + `makeCounterKit`
+ `makeDisplayShelf`, glass via `makeGlassPanel`). Keep named meshes `phoneShop*` for any pinned asserts;
keep `secondaryPropObstacles()` correct. Test: keep `obstacles.test.ts` green; add a small assert that
the shop still produces a `*Building` mesh.

- [ ] Steps: (1) failing test for shop building mesh + obstacle reachability of `PHONE_SHOP_COUNTER`.
  (2) implement retrofit. (3) `vitest run` PASS. (4) `tsc`+`vite build`. (5) Commit
  `feat(rishon3d): retrofit phone shop onto storefront/glass/counter kits`.

### Task 11: Real park

**Files:** Modify `src/world/secondaryLocations.ts` `makePocketPark` → `makeRealPark` (path loop,
`makeFountainKit`, `makePicnicKit`, `makeBenchBinLamp` ×N, trees via `fillSurface('grass')`); update
`districtPois` PARK_* (path waypoints, bench seats w/ faceYaw); `locations.ts` park zones.
Test: keep `obstacles.test.ts` (PARK_BENCH reachable, bench seats on benches) green; add park-loop
waypoint test.

- [ ] Steps: (1) failing tests (park loop route non-empty; bench seat reachable + faceYaw set). (2)
  implement. (3) `vitest run` PASS. (4) `tsc`+`vite build`. (5) Commit `feat(rishon3d): real park —
  path loop, fountain, picnic, NPC loop`.

### Task 12: Hi-tech office block (NEW)

**Files:** Create `src/world/officeBlock.ts` (`makeOfficeBlock(): THREE.Object3D` — blue-glass tower via
`makeGlassPanel({glassStyle:'office'})` curtain wall + walk-in lobby shell + reception `makeCounterKit` +
seating + `makeKiosk`; `makeOfficePlaza` out front + `makeBikeRackKit`), `officeInterior.ts` (lobby).
Modify `restaurantColliders.ts` (office shell + tower solid above lobby), `World.ts` (add
`makeOfficeBlock()` + colliders), `obstacles.ts` (office obstacles), `locations.ts` (office LocationDef),
`districtPois.ts` (OFFICE_* anchors/zones). Test: `test/officeBlock.test.ts` (tower mesh present, lobby
shell open front, plaza obstacles, office counter reachable).

- [ ] Steps: (1) failing `officeBlock.test.ts` + obstacle reachability for `OFFICE_LOBBY`/`OFFICE_DESK`.
  (2) implement tower+lobby+plaza+kiosks+bike racks; wire collider (lobby = `shellWalls`, tower above =
  solid), obstacles, LocationDef, anchors. (3) `vitest run` PASS. (4) `tsc`+`vite build`. (5) Commit
  `feat(rishon3d): hi-tech office block — glass tower, lobby, plaza, kiosks`.

### Task 13: Surface-fill every empty region

**Files:** Modify `World.ts`/`restaurantStreet.ts` to call `fillSurface` on the remaining bare grass +
plaza gaps (yards, between locations, north verge), passing `roadRects` + building footprints as `avoid`.
Test: keep `worldData.test.ts` "every building off every road" + `obstacles.test.ts` green.

- [ ] Steps: (1) (no new pinned test; rely on existing) — add an assert that filled obstacles don't clip
  any dwell target (extend obstacles.test if cheap). (2) implement fills. (3) `vitest run` PASS. (4)
  `tsc`+`vite build`. (5) Commit `feat(rishon3d): surface-fill empty grass/plaza`.

---

## Phase 9 — Roads, intersections, signals

### Task 14: Wire `makeRoadNetwork` + place lights/signs

**Files:** Modify `src/world/World.ts` (call `makeRoadNetwork(map.roads)` for the new roads; keep
`makeRestaurantStreet`'s hero promenade), place `makeTrafficLightKit`/`makeStopSignKit` at
`roadIntersections(map.roads)` output; create `src/game/trafficSignal.ts` (a small `Agent` cycling lens
emissive on a fixed period). Modify `obstacles.ts` (light/sign footprints), `Game.ts` (register signal
Agents in EntityManager). Test: `test/trafficSignal.test.ts` (deterministic phase cycle: given elapsed
time → expected light index); keep `roads.test.ts` green (don't change its constants).

- [ ] Steps: (1) failing `trafficSignal.test.ts` (pure cycle fn `signalPhase(t, period)→'red'|'green'|
  'amber'`). (2) implement cycle fn + Agent that sets lens material emissiveIntensity; wire network +
  placements + obstacles. (3) `vitest run` PASS. (4) `tsc`+`vite build`+`playwright test` (still 2
  canvases, 0 errors). (5) Commit `feat(rishon3d): wired road network + traffic lights + stop signs`.

---

## Phase 10 — Minimap from registry

### Task 15: Drive minimap markers from the registry

**Files:** Modify `src/ui/Minimap.ts` (`drawPois` → iterate `locations.minimapEntries()`; import
`ROAD_W` instead of literal 6; keep base ground/roads/buildings from `map`, now richer; keep `- center`
translation). Test: keep `minimapMath.test.ts` green; add a tiny test that `minimapEntries()` covers all
location types.

- [ ] Steps: (1) failing test (`minimapEntries` includes office/cafe/park/home/restaurant/shop/taxi).
  (2) implement. (3) `vitest run` PASS. (4) `tsc`+`vite build`+`playwright test`. (5) Commit
  `feat(rishon3d): minimap markers driven by location registry`.

---

## Phase 11 — NPC population wiring

### Task 16: Spawn behavior-typed NPCs from the registry; add workers

**Files:** Modify `src/entities/Patron.ts` `spawnPatrons` (iterate `LOCATIONS × count` and behavior
types instead of flat `PATRON_COUNT`), `src/game/Game.ts` (add worker Agents at counters; office/park
walkers; keep cull tuning — raise `cullDistance` if needed for the bigger map). Test: keep
`itinerary.test.ts`/`patronRoutine.test.ts`/`obstacles.test.ts` green; smoke must stay clean.

- [ ] Steps: (1) (mostly integration — guard with a unit test that `spawnPatrons` returns >0 patrons and
  all itineraries are finite/looping). (2) implement registry-driven spawning + workers. (3) `vitest run`
  PASS. (4) `tsc`+`vite build`+`playwright test` (2 canvases, 0 errors). (5) Commit
  `feat(rishon3d): registry-driven NPC population + worker behaviors`.

---

## Phase 12 — Verify & hand back

### Task 17: Full gate + visual confirmation + adversarial review

- [ ] **Step 1:** `npx tsc --noEmit` → zero errors (capture output).
- [ ] **Step 2:** `npx vitest run` → all green (capture summary count).
- [ ] **Step 3:** `npx vite build` → succeeds.
- [ ] **Step 4:** `npx playwright test` → exactly 2 canvases, ZERO console errors after Start.
- [ ] **Step 5:** Manual: `npx vite dev` (background) + playwright navigate, click Start, screenshot each
  tier (`#view` over restaurant district / park / office block / an intersection); confirm reads like a
  finished neighborhood. Save screenshots.
- [ ] **Step 6:** Adversarial review workflow over the full diff (correctness/coupling/determinism/draw
  calls/obstacle-trap regressions). Fix findings.
- [ ] **Step 7:** Update `README.md` (world description is stale — describes the deleted big city).
- [ ] **Step 8:** Hand back the finished branch with a summary (built / assumed / remains / test results).
  **Do NOT merge/deploy.**

---

## Self-Review (coverage)

- Spec S1 glass → Task 1. S2 storefront → Task 3. S3 prop-groups → Task 4. S4 surface-fill → Task 5.
  S5 location registry → Task 6. S6 NPC types → Tasks 7, 16. S7 roads/signals → Tasks 8, 14. S8 minimap
  → Task 15.
- Content: hero district/cafe → 9; phone retrofit → 10; real park → 11; office block → 12; surface fill
  applied → 13.
- Map framing (D3) → Task 8. restaurantStreet test handling (D4) → Task 9. Office walk-in (D5) → Task 12.
  Road kit vs hero street (D6) → Tasks 8/14. Traffic light Agent (D7) → Task 14. Glass meshes (D8) →
  Task 1. POIS projection (D9) → Task 6. Import cycle (D10) → Tasks 6/8. Workers (D11) → Tasks 7/16.
  Retrofit scope (D12) → Tasks 9/10.
- Gate (every task ends with `tsc`/`vitest`; integration tasks add `vite build`+`playwright`); final
  verification → Task 17.
