# Houses District (West Suburb) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Add a western residential suburb — ~12 seeded placeholder houses plus one highly detailed walk-in hero "player house" with attached garage and front/back yards.

**Architecture:** New catalog objects (`fence`, `parkedCar`, `mailbox`, `house`, `playerHouse`) registered via `catalog/index.ts`, following the established `defineObject` + merged-vertex-color-mesh pattern. A new `src/world/suburbMap.ts` (mirroring `airportMap.ts`) returns the suburb's placements; `map.ts` adds a west avenue and `...suburbPlacements(...)`.

**Tech Stack:** TypeScript, Three.js, Rapier. Helpers: `objects/voxel.ts` (`tintedBox`, `cylinderY`, `cone`, `mergeTinted`, `tintedMesh`), `system/registry.ts` (`defineObject`), `world/rng.ts` (`mulberry32`), `palette.ts`, layout helpers (`lot`, `row`, `grid`).

## Global Constraints

- LOCAL space for every object: centered x=z=0, base y=0, FRONT faces +z, ~1u=1m. Engine applies position/rotation on placement.
- Determinism: NO `Math.random` / `Date.now` / argless `new Date()`. Seed via `mulberry32(seed >>> 0)` from `src/world/rng.ts`.
- Rotations only in {0, 90, 180, 270}.
- PITFALL 3: child placement derived from real part dimensions, never hand-typed magic offsets.
- Facet contract: return ONE `ObjectResult` carrying `mesh` + (optional) `colliders` (Box: center+half-extents) + `obstacles` (Rect: center+full w,d) + `anchors` + `pois`.
- **GATE (PITFALL 1 & 2): the ONLY verification is `npx tsc --noEmit` clean, plus `npx vite build` once at the end. NO tests, NO dev server, NO screenshots, NO test runner.**
- Work on `master` (no worktree/branch) — project standing rule.
- Colors from `PALETTE`; reuse existing keys (e.g. `houseBody`, `houseRoof`, `trunk`, `curb`, `sidewalk`, `winFrame`, `glass`, `stoneBase`). Add new palette keys only if needed, in `palette.ts`.

---

### Task 1: Supporting props — `fence`, `parkedCar`, `mailbox`

**Files:**
- Create: `src/world/catalog/fence.ts`
- Create: `src/world/catalog/parkedCar.ts`
- Create: `src/world/catalog/mailbox.ts`
- Modify: `src/world/catalog/index.ts` (add three side-effect imports)

**Interfaces — Produces:**
- `defineObject("fence", { params: { length:number, gate:boolean, color:number }, build })` → `mesh` + `colliders` (thin boxes along x, omitted across the gate gap) + `obstacles`. Picket fence runs along **x**, pickets face +z; height ~1.0m.
- `defineObject("parkedCar", { params: { color:number }, build })` → `mesh` + `collider` (full body box) + `obstacle`. Car ~4.2 long (x) × 1.8 wide (z) × 1.5 tall; FRONT (+z) is the car's side. Body + cabin + 4 wheels + windscreen + headlights/taillights.
- `defineObject("mailbox", { params: {}, build })` → `mesh` + small `obstacle`. Post (~1.0 tall) + box + raised flag.

- [ ] **Step 1: `fence.ts`** — Build along x. Constants: `POST_H=1.0`, `PICKET_H=0.85`, `POST_W=0.12`, `RAIL_T=0.06`, `pitch=0.28`. Loop pickets across `length` centered on x=0 (`count = round(length/pitch)`); skip pickets whose center falls inside a centered gate gap of width `1.4` when `gate`. Two horizontal rails (top/bottom) as `tintedBox(length, RAIL_T, RAIL_T,...)`, also split around the gate gap (two segments). Posts every ~`length/4`. Color param defaults to `0xece7da` (off-white). Merge to one mesh. Colliders: one thin box per solid rail span (`hy=POST_H/2`, `hz=0.08`); none across the gap. Obstacle: `{x:0,z:0,w:length,d:0.3}` (or two rects around the gap).

- [ ] **Step 2: `parkedCar.ts`** — Deterministic, color from param (default `0x3366aa`). Parts (all `tintedBox`, wheels `cylinderY` rotated — use a flat box wheel `tintedBox(0.7,0.7,0.3,...)` in dark `0x1a1a1e` to stay axis-aligned/cheap): lower body `4.2(x)×0.7×1.7(z)` at y≈0.7; cabin `2.4×0.7×1.5` at y≈1.45; windscreen/sides as `glass`-tinted thin boxes; 4 wheels at the four corners (y≈0.4); headlights (`0xfff4e0`) front pair, taillights (`0xe0524a`) rear pair. Mesh merged. Collider: `{x:0,y:0.75,z:0,hx:2.1,hy:0.75,hz:0.9}`. Obstacle `{x:0,z:0,w:4.2,d:1.8}`.

- [ ] **Step 3: `mailbox.ts`** — Post `tintedBox(0.1,1.0,0.1,0,0.5,0,0x6b4226)`; box body `tintedBox(0.45,0.3,0.22,0,1.05,0,0x9aa0a6)`; rounded front via a small `tintedBox`; red flag `tintedBox(0.04,0.18,0.16,0.24,1.12,0,0xe0524a)`. Merge. Obstacle `{x:0,z:0,w:0.5,d:0.3}`. No collider (small).

- [ ] **Step 4: Register** — add to `src/world/catalog/index.ts`:
```ts
import "./fence";
import "./parkedCar";
import "./mailbox";
```

- [ ] **Step 5: Verify** — `npx tsc --noEmit`. Expected: clean (no errors).

- [ ] **Step 6: Commit**
```bash
git add src/world/catalog/fence.ts src/world/catalog/parkedCar.ts src/world/catalog/mailbox.ts src/world/catalog/index.ts
git commit -m "feat(houses): fence, parkedCar, mailbox props"
```

---

### Task 2: Seeded placeholder `house`

**Files:**
- Create: `src/world/catalog/house.ts`
- Modify: `src/world/catalog/index.ts` (add `import "./house";`)
- Reference (read for pattern): `src/world/catalog/fillerBuilding.ts` (windows/`colsFor`, plinth, merged mesh, collider+obstacle).

**Interfaces — Produces:**
- `defineObject("house", { params: { w, d, stories, storyH, bodyColor?, roofColor?, roofStyle?, garage, porch, seed }, build })` → `mesh` (merged) + one `collider` covering full footprint (incl. garage) + one `obstacle`. Solid, NON-walk-in.

- [ ] **Step 1: Skeleton + params + seed.** Defaults `{ w:8, d:9, stories:2, storyH:2.7, garage:false, porch:false, seed:1 }`. `const rng = mulberry32(p.seed>>>0)`. Residential body palette `const BODY=[0xf3d29a,0xe6b89c,0x9ac06a,0x84b06a,0xe9c46a,0xc98ab0,0xeaded0]`; roof palette `const ROOF=[0xc0392b,0x8a5230,0x4f6b7a,0x5a5a64,0x7a5230]`. `bodyColor = p.bodyColor ?? BODY[Math.floor(rng()*BODY.length)]`; `roofColor` likewise. `roofStyle = p.roofStyle ?? (rng()<0.5?"gable":"hip")`.

- [ ] **Step 2: Body + plinth + windows + door.** Body `tintedBox(w,totalH,d,0,totalH/2,0,bodyColor)` with `totalH=stories*storyH`. Plinth `tintedBox(w+0.1,0.4,d+0.1,0,0.2,0,stoneBase)`. Windows: reuse fillerBuilding's approach inline — for faces `["+z","+x","-x"]`, `cols=max(2,round(span/2.6))`, rows=`stories`, each window = frame box + glass box + sill, proud of the wall by ~0.06. Front door: `tintedBox(1.1, 2.1, 0.12, 0, 1.05, d/2+0.04, 0x4a3b2e)` centered, with a `0x33373d` frame; small stoop slab `tintedBox(1.6,0.15,0.6,0,0.075,d/2+0.3,curb)`.

- [ ] **Step 3: Roof.** `gable`: two sloped slabs forming a ridge along x. Implement with `tintedBox` slabs rotated via building geometry then translate — simplest deterministic approach: build each slope as a thin box `tintedBox(w+0.5, 0.18, slantLen, 0, ...)`, rotate ±pitch about x by constructing with `new THREE.BoxGeometry` + `.rotateX(±angle)` + `.translate(...)` then `tintGeo`. Ridge height `~1.6`. Gable-end triangles via two flat `tintedBox` thin wedges or a `cone`/extruded triangle approximation (a small `tintedBox` gable infill is acceptable). `hip`: a 4-sided pyramid using `cone(r, 0.05, height, 0, totalH+h/2, 0, roofColor, 4)` sized to cover the footprint (rotate 45° so the square aligns), OR four sloped slabs. Add a fascia band `tintedBox(w+0.4,0.18,d+0.4,0,totalH+0.09,0,0xece7da)`. Chimney `tintedBox(0.6,1.2, 0.6, w*0.3, totalH+1.0, -d*0.2, 0x8a5230)` on a seeded side.

- [ ] **Step 4: Optional porch + garage.** `porch`: posts `tintedBox(0.12,2.2,0.12,...)` at front corners offset +z, a flat porch roof slab. `garage`: a bay on +x or -x side (seeded): box `tintedBox(garageW,storyH,garageD,...)` flush front, with an up-and-over **door** = stacked horizontal slat boxes (`rollDoor` color) on the +z face. Derive garage dims from house (`garageW=3.2`, `garageD=min(d, 6)`), positioned so its +x/-x face meets the house wall (derive x offset from `w/2 + garageW/2`).

- [ ] **Step 5: Facets.** Merge all parts → one `tintedMesh`. Footprint width incl. garage = `w + (garage? garageW : 0)`; compute a combined collider+obstacle (or two collider boxes: house + garage). Return `{ mesh, colliders:[...], obstacles:[...] }`.

- [ ] **Step 6: Register + verify + commit.**
```bash
# add import "./house"; to index.ts
npx tsc --noEmit   # expect clean
git add src/world/catalog/house.ts src/world/catalog/index.ts
git commit -m "feat(houses): seeded placeholder house object"
```

---

### Task 3: Hero `playerHouse`

**Files:**
- Create: `src/world/catalog/playerHouse.ts`
- Modify: `src/world/catalog/index.ts` (add `import "./playerHouse";`)
- Reference: `src/world/catalog/buildings.ts` (`buildingShell` walk-in collider pattern: closed walls + front returns + open door gap), `fillerBuilding.ts` (windows), `stores.ts` (furniture/interior idioms).

**Interfaces — Produces:**
- `defineObject("playerHouse", { params: { seed }, build })` → `mesh` (Group) + `colliders` (perimeter walls with door gaps, garage, 2nd-floor slab, stairs, major furniture, fence, shed) + `obstacles` + `anchors:{door,driveway}` + `pois:[{kind:"home",label:"Home",radius:3,anchor:"door"}]`.

Declare ALL dimensions once at top of `build()` and derive everything from them:
```ts
const W=12, D=11, FLOOR_H=3, FLOORS=2, T=0.3;       // main block
const totalH=FLOORS*FLOOR_H;
const GAR_W=6, GAR_D=7, GAR_H=3;                     // garage wing (left, -x)
const DOOR_W=1.4;                                    // walk-in front door gap
```

- [ ] **Step 1: `makeShell()`** — main block walk-in box (buildingShell pattern). Floor slab, back wall, two side walls, second-floor slab at y=FLOOR_H, roof underside ceiling. FRONT (+z) wall: solid EXCEPT a centered `DOOR_W` door gap (build as left+right wall segments + lintel above, leaving the gap). Punch windows (frame+glass+sill) on all four exterior faces, both storeys. Returns `{ parts, colliders }` where colliders are: floor, back, sides, 2nd-floor slab, two front-return segments flanking the door (`hx=(W-DOOR_W)/4` each), and a lintel. Door gap stays walk-through.

- [ ] **Step 2: `makeGarage()`** — wing on -x, flush front. Walls (floor, back, outer -x wall, roof), shared wall with house omitted. +z face: an up-and-over **garage door** = ~6 stacked horizontal slat boxes (`rollDoor` color) filling `GAR_W × (GAR_H-0.3)`, slightly proud. Place a `parkedCar` mesh NOT here (placed via map as a separate placement on the driveway) — but DO leave the bay open/walk-in. Returns `{ parts, colliders }`. Derive garage center x = `-(W/2 + GAR_W/2)`.

- [ ] **Step 3: `makeRoof()`** — gable over the main block (ridge along x at apex `~1.8` above `totalH`): two sloped slabs (`BoxGeometry`+`.rotateX`+`.translate`+`tintGeo`, `houseRoof` color), gable-end infill triangles (front/back), fascia/gutter band around the eave, a brick **chimney** box, and 1–2 **dormers** on the +z slope (small box + tiny gable + window). Garage gets a lower **shed roof** (single slab sloped). Returns `{ parts }` (roof is non-walk; no new colliders beyond the ceiling already in shell).

- [ ] **Step 4: `makeInterior()`** — furniture as merged tinted boxes, derived from room extents. Ground floor: sofa (base+back+arms, `benchRed`), armchair, coffee table, rug (thin slab on floor), wall TV (dark slab on back wall); kitchen run along one side wall (counter `caseWood`+`caseWoodTop`, upper cabinets, fridge `steel`, stove `steelDark`, sink). **Staircase**: ~8 stacked `tintedBox` steps rising from floor to the 2nd-floor slab along the back wall (each step `rise=FLOOR_H/9`, `run=0.3`), with a collider ramp/steps so the player can ascend. Second floor: bed (frame+mattress+pillow), nightstand, wardrobe, a tub box (bathroom). Returns `{ parts, colliders }` (colliders for stairs + big furniture only).

- [ ] **Step 5: `makeFrontYard()` + `makeBackYard()`** — Yards are placed mostly as separate map placements (fence/tree/planter/mailbox/parkedCar), BUT the porch + path + patio + BBQ + pool + shed that are tightly bound to the house are built here as parts. Porch: posts + flat roof over the front door, porch light (`lantern`). Path: paved slabs `entryPad` from door toward +z. Back: patio slab, BBQ (box+lid+grill bars), garden table+chairs, small shed (closed box + door + roof, with collider), tiny pool (recessed `0x3a8fb0` slab + `curb` coping rim). Returns `{ parts, colliders, obstacles }`.

- [ ] **Step 6: Assemble + facets.** In `build()`: gather all parts from the helpers, `group.add(tintedMesh(mergeTinted(allParts)))`. Concatenate all colliders + obstacles. `anchors = { door:{x:0,z:D/2}, driveway:{x:-(W/2+GAR_W/2), z:D/2+4} }`. `pois=[{kind:"home",label:"Home",radius:3,anchor:"door"}]`. Return the full `ObjectResult`.

- [ ] **Step 7: Register + verify + commit.**
```bash
# add import "./playerHouse"; to index.ts
npx tsc --noEmit   # expect clean
git add src/world/catalog/playerHouse.ts src/world/catalog/index.ts
git commit -m "feat(houses): detailed walk-in player house with garage + yards"
```

---

### Task 4: Wire the suburb into the map

**Files:**
- Create: `src/world/suburbMap.ts`
- Modify: `src/world/map.ts` (add west avenue + `...suburbPlacements(...)`)
- Reference: `src/world/airportMap.ts` (pattern for an offset placements helper), `src/world/layout/*` (`lot`, `row`, `grid`).

**Interfaces:**
- Consumes: `house`, `playerHouse`, `fence`, `parkedCar`, `mailbox`, `tree`, `planter`, `lamp`, `road`, `airportRoad` objects; layout helpers.
- Produces: `export function suburbPlacements(ox:number, oz:number): Placement[]`.

- [ ] **Step 1: `suburbMap.ts` streets.** Centered at (ox,oz). One E–W avenue at z=oz (`road` segments along x spanning the suburb width ~90m), two cross-streets at `x=ox-20` and `x=ox+20` (`road`, rot 90). Lamps lining the avenue (`row("lamp",...)`).

- [ ] **Step 2: Hero lot.** Place `playerHouse` on a prominent corner — e.g. `{ kind:"playerHouse", x: ox+18, z: oz+16, rot: 180 }` (rot 180 so its +z front faces toward the avenue at lower z). Add its yard placements around it: `fence` segments forming the lot perimeter (with a gate facing the path), 2 `tree`, `planter`s, a `mailbox` at the curb, a `parkedCar` on the driveway. Derive all offsets from the house footprint (W=12,D=11,GAR_W=6) — no overlaps.

- [ ] **Step 3: Placeholder houses.** ~12 `house` placements lining both sides of the avenue and cross-streets, set back from the road, facing it (north-side houses rot 180, south-side rot 0). Vary `seed` per house (e.g. `seed: 300+i*7`) and pass occasional `garage:true`/`porch:true`. Use `row()`/explicit placements with a consistent lot pitch (~16m) so they don't overlap. A few `tree`/`fence` props between lots.

- [ ] **Step 4: Connect to city in `map.ts`.** After the airport block, before `...filledBlocks`, add: a west `airportRoad` bridging the city west edge to the suburb (`{ kind:"airportRoad", x:-110, z:0, rot:0, params:{ length:90, width:22, lanes:4 } }` — confirm rot so the road runs along x/east-west; airportRoad default runs along its length axis, check `airportRoad.ts`), lamp rows along it, then `...suburbPlacements(-205, 0)`. Import `suburbPlacements` at top of `map.ts`. Ensure GROUND_SIZE (820) still covers x≈-250 (half=410 → ok).

- [ ] **Step 5: Verify + commit.**
```bash
npx tsc --noEmit   # expect clean
git add src/world/suburbMap.ts src/world/map.ts
git commit -m "feat(houses): west suburb streets + lots wired into the map"
```

---

### Task 5: Final build gate

**Files:** none (verification only).

- [ ] **Step 1:** `npx tsc --noEmit` — expect clean.
- [ ] **Step 2:** `npx vite build` — expect success (no throw; bundle written).
- [ ] **Step 3:** If both pass, report done and hand back. Do NOT run the dev server or screenshot (PITFALL 1). Do NOT run tests (PITFALL 2).

---

## Self-Review

- **Spec coverage:** west location + avenue (Task 4) ✓; seeded placeholder houses (Task 2) ✓; hero walk-in house w/ garage, interior, roof detail, yards (Task 3) ✓; fence/parkedCar/mailbox props (Task 1) ✓; map helper mirroring airportMap (Task 4) ✓; determinism/gate constraints (Global Constraints) ✓; home POI (Task 3 Step 6) ✓.
- **Placeholders:** none — each task has concrete dims, colors, and facet contracts. Voxel build code is specified by dimension math + part lists rather than full literal geometry, consistent with how the existing catalog files are structured; the builder reads the referenced files for the exact idiom.
- **Type consistency:** object kinds (`fence`,`parkedCar`,`mailbox`,`house`,`playerHouse`) and `suburbPlacements(ox,oz)` are referenced identically across tasks. Facets match `ObjectResult` (`mesh`/`colliders`/`obstacles`/`anchors`/`pois`).
- **Open item to verify during build:** `airportRoad`'s length/rotation axis (read `airportRoad.ts` in Task 4 before placing) so the west avenue runs east–west, not north–south.
