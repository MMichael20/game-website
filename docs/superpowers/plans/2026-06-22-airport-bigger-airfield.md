# Airport bigger airfield — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand the Ben Gurion airport's airside into a large, realistic, fully-fenced airfield with many outdoor aircraft parking stands, a satellite concourse, remote + cargo aprons, a taxiway network, and dual runways.

**Architecture:** Pure registry/manifest/engine work. Add 4 new catalog objects (`perimeterFence`, `hangar`, `windsock`, `concoursePier`), then rewrite the manifest `src/world/airportMap.ts` to place a much bigger airside, and bump both ground sizes (standalone + city embed) so the airfield fits the ground plane.

**Tech Stack:** TypeScript, Three.js, the project's voxel helpers (`objects/voxel`, `objects/glass`, `objects/textSign`), the `defineObject` registry.

## Global Constraints (verbatim from CLAUDE.md / spec)

- **NO dev server, NO screenshots, NO tests.** The ONLY verification is `npx tsc --noEmit` (clean) and `npx vite build` (succeeds). Each task's "verify" step means: run `npx tsc --noEmit` and confirm zero errors. The final task also runs `npx vite build`.
- **Determinism:** no `Math.random` / `Date.now` / argless `new Date()` in builders; seed via `world/rng.ts` if randomness is needed.
- **Rotation** is 90° increments only ({0,90,180,270}).
- **Derive child placement from real dimensions**, never magic offsets that overlap.
- Build every object at LOCAL origin: centred x=z=0, base y=0, FRONT faces +z, ~1u = 1m. Return ALL facets from one `build()`: `{ mesh, colliders?, obstacles?, anchors?, pois? }`.
- Commit after each task. End commit messages with the Co-Authored-By trailer.

## Object facet helpers (available, used by existing airport objects)

From `../../objects/voxel`: `tintedBox(w,h,d,x,y,z,hex)`, `cylinderY(r,h,x,y,z,hex,seg?)`, `cone(rBottom,rTop,h,x,y,z,hex,seg?)`, `disc(r,h,x,y,z,hex,seg?)`, `tintGeo(geo,hex)`, `mergeTinted(geos)`, `tintedMesh(geo)`, `DECAL_GAP`.
From `../../objects/textSign`: `makeTextSignMesh({text,w,h,boardColor,textColor,glow})`.
From `../../objects/glass`: `makeGlassPanel({w,h,divisions,opacity,tint,frameColor})`, `makeGlassPaneMaterial({w,h,tint,opacity})`.
From `../../palette`: `PALETTE` (`.steel`, `.steelLight`, `.steelDark`, `.asphalt`, `.yellowLine`, `.laneLine`, `.lanternGlow`, `.curb`).
Types from `../../system/types`: `ObjectResult`, `Box`, `Rect`, `Vec2`.
`Box = { x,y,z, hx,hy,hz }` (half-extents). `Rect = { x,z,w,d }` (full sizes).

Local `solidBox(x,y,z,bw,bh,bd): Box` = `{ x,y,z, hx:bw/2, hy:bh/2, hz:bd/2 }` (copy into each file).

---

### Task 1: `perimeterFence` object

**Files:**
- Create: `src/world/catalog/airport/perimeterFence.ts`
- Modify: `src/world/catalog/index.ts` (add `import "./airport/perimeterFence";`)

**Interfaces:**
- Produces kind `"perimeterFence"`, params `{ length: number; h?: number; gateGap?: number }` (defaults `length:60, h:3, gateGap:0`).

**Build contract:** A run of security fence built along +X, centred at origin, base y=0.
- Posts: grey steel posts (`tintedBox(0.16, h, 0.16, ...)`, color `PALETTE.steel`) every ~4 m along x across `length`, derived: `nPosts = Math.max(2, Math.round(length/4))`.
- Mesh infill: a thin translucent-looking chain-link panel per bay — use a darker grey thin box `tintedBox(bayLen-0.1, h-0.4, 0.04, midX, (h-0.4)/2+0.2, 0, 0x8a9099)` plus 2 horizontal rails (top/bottom) `tintedBox(length, 0.06, 0.08, 0, y, 0, PALETTE.steelLight)`.
- Barbed top: 3 angled thin rails near the top (`tintedBox(length, 0.04, 0.05, 0, h-0.1+i*0.06, ±0.06, 0x6f757d)`).
- If `gateGap>0`, leave a centred gap of that width (skip posts/infill where `|x| < gateGap/2`) and split the collider into two runs.
- Collider: thin wall along the whole length: `solidBox(0, h/2, 0, length, h, 0.3)` (or two runs if gateGap). Returns `{ mesh, colliders }`. No obstacles needed (it's a wall).

- [ ] Step 1: Write `perimeterFence.ts` per the contract above (deterministic, derived spacing).
- [ ] Step 2: Add the import line to `catalog/index.ts`.
- [ ] Step 3: Verify — `npx tsc --noEmit` is clean.
- [ ] Step 4: Commit `feat(airport): perimeterFence object`.

---

### Task 2: `hangar` object

**Files:**
- Create: `src/world/catalog/airport/hangar.ts`
- Modify: `src/world/catalog/index.ts` (add import).

**Interfaces:**
- Produces kind `"hangar"`, params `{ w?: number; d?: number; h?: number; name?: string }` (defaults `w:80, d:60, h:28, name:"EL AL MAINTENANCE"`).

**Build contract:** A big maintenance hangar, front (+z) open door facing the apron.
- Shell: pale metal walls (`0xd8dce0`). Back wall (`-z`), two side walls (`±x`), built as `tintedBox` slabs (thickness `WALL_T=0.6`), full height `h`. Front face (+z) is left mostly OPEN as the door: build only a tall header beam across the top `tintedBox(w, h*0.18, WALL_T, 0, h-h*0.09, hD, frame)` and two narrow door jambs at the sides.
- Door opening fill: a recessed dark panel `tintedBox(w*0.86, h*0.8, 0.2, 0, h*0.4, hD-0.4, 0x20242a)` (reads as the shadowed interior / closed door) — set back so a jet could be "inside".
- Roof: a low ridge roof — two sloped slabs OR a simple stepped barrel: 5 stacked `tintedBox` bands narrowing toward the top, or a flat roof deck `tintedBox(w, 0.5, d, 0, h, 0, 0xc2c6cc)` plus a shallow ridge box. Keep it a closed ceiling (no sky through it).
- Signage: `makeTextSignMesh` with `name` on the front header, centred.
- Colliders: back wall + two side walls + the two front jambs + header (leave the central door gap clear): one `Box` each. Returns `{ mesh, colliders }`.

- [ ] Step 1: Write `hangar.ts`.
- [ ] Step 2: Add import to `catalog/index.ts`.
- [ ] Step 3: Verify `npx tsc --noEmit` clean.
- [ ] Step 4: Commit `feat(airport): hangar object`.

---

### Task 3: `windsock` object

**Files:**
- Create: `src/world/catalog/airport/windsock.ts`
- Modify: `src/world/catalog/index.ts` (add import).

**Interfaces:**
- Produces kind `"windsock"`, params `{ h?: number }` (default `h:8`).

**Build contract:** A pole with a striped cone.
- Pole: `cylinderY(0.12, h, 0, h/2, 0, PALETTE.steel, 8)` + a base plate `tintedBox(1.2,0.1,1.2,0,0.05,0,PALETTE.steel)`.
- Pivot frame ring near the top: small `disc`/`cylinderY` ring at `y=h`.
- Cone: 5 stacked tapering bands along +x (cone hangs horizontal), alternating orange `0xe8731f` / white `0xf2f2f2`, each a `cone(rBig,rSmall,len,x,h,0,col)` stepping outward from the pole top — derived from band index. Total cone length ~4 m.
- Collider: thin pole `solidBox(0, h/2, 0, 0.4, h, 0.4)`. Returns `{ mesh, colliders }`.

- [ ] Step 1: Write `windsock.ts`.
- [ ] Step 2: Add import to `catalog/index.ts`.
- [ ] Step 3: Verify `npx tsc --noEmit` clean.
- [ ] Step 4: Commit `feat(airport): windsock object`.

---

### Task 4: `concoursePier` object

**Files:**
- Create: `src/world/catalog/airport/concoursePier.ts`
- Modify: `src/world/catalog/index.ts` (add import).

**Interfaces:**
- Produces kind `"concoursePier"`, params `{ len?: number; w?: number; h?: number }` (defaults `len:120, w:18, h:9`). Runs along +Z (long axis = Z), centred at origin.

**Build contract:** A sealed, glass-walled finger concourse (a smaller sibling of `terminalHall`).
- Floor slab `tintedBox(w, 0.2, len, 0, 0.1, 0, 0xe2ddd2)`.
- Long side walls (±x): a low solid sill + glazed curtain wall. Build a steel column every ~9 m along z (`COL_BAY`), with thin opaque mullion boxes, plus a transparent glazing pane per bay using `makeGlassPanel` (or a tinted thin box if simpler). Provide a `0.5` m sill at the base.
- End caps (±z): solid walls `tintedBox(w, h, WALL_T, 0, h/2, ±len/2, WALL_COLOR)`.
- Closed roof: a ceiling deck `tintedBox(w, 0.3, len, 0, h, 0, 0xf2eee8)` + a shallow blue ridge box on top `tintedBox(w*0.6, 0.6, len, 0, h+0.5, 0, 0x2f63b0)` so it reads closed (no sky inside) and matches the terminal's blue roof.
- Gate signage: `makeTextSignMesh` "GATES C" / "GATES D" style boards mounted on the long side fascia at intervals (derive z positions from len).
- Colliders: both long side walls (full length thin Box) + both end caps. Returns `{ mesh, colliders, anchors: { eastDoor:{x:w/2,z:0}, westDoor:{x:-w/2,z:0} } }`.

- [ ] Step 1: Write `concoursePier.ts`.
- [ ] Step 2: Add import to `catalog/index.ts`.
- [ ] Step 3: Verify `npx tsc --noEmit` clean.
- [ ] Step 4: Commit `feat(airport): concoursePier object`.

---

### Task 5: Rewrite `airportMap.ts` — the big airfield

**Files:**
- Modify: `src/world/airportMap.ts` (replace the airside; keep landside/terminal/concourse; bump `GROUND`).

**Consumes:** all existing airport kinds + the 4 new kinds from Tasks 1-4.

**Keep unchanged (landside + terminal + concourse):** everything from the top of `map` through the concourse seating block (the entries from `ground` down to the GATES section). Only the GATES/AIRSIDE/runway/cloud blocks are replaced/extended. Bump `const GROUND = 360` → `820`.

**Coordinate plan (airport-local; +z north).** Use named constants; derive aircraft/stand positions from a shared stand pitch. Place, north-to-south on the airside:

1. **Wide contact apron** — replace the 4-stand row. Define `const FRONT_STANDS_X = [-234,-182,-130,-78,-26,26,78,130,182,234]` (10 stands, 52 m pitch). For each x: an `apron` (`w:48,d:44,stand:"A"+n`) at `z:70`, a `gateLounge` at `z:30`, a `jetBridge` at `z:46` (rot 90), and an `airliner` at `z:76` (rot 90, nose-in) with a varied livery from a 6-entry livery table cycled by index. Add an east-west apron taxilane: `runway` `taxiway:true length:520` at `z:104`.
2. **Satellite concourse** — `concoursePier` at `x:0, z:175, rot:0, params:{len:120,w:18,h:9}`. Ring 6 stands around it: 3 along the east side (`x:+34`, z ∈ {130,175,220}, airliner rot 270 nose-in west) and 3 along the west side (`x:-34`, same z, rot 90). Each with an `apron` under it. A connector taxiway (`runway taxiway:true`) on x=0 linking the front taxilane to the satellite.
3. **Remote apron (east)** — 4 marked stands at `x:300`, z ∈ {40,90,140,190}; each `apron` + `airliner` (rot 90) + `apronVehicle` stairs + a `baggageCartTrain`. An `apronContainers` block nearby.
4. **Cargo / maintenance (west)** — 2 `hangar` at `x:-300, z:{60,150}` (rot 180 so doors face south toward apron, or rot 0 facing north — choose so the open door faces the apron interior). 2 freighter `airliner` (grey/white livery) on `apron` pads in front of the hangars. `apronContainers` + `apronVehicle` tug.
5. **Taxiway network** — parallel taxiway (`runway taxiway:true length:560`) at `z:250`; two connector taxiways along z at `x:±120` linking apron→parallel taxiway→runways.
6. **Dual runways** — `runway` (taxiway:false) `length:520` at `z:295`; `runway` `length:480` at `z:340`. A parallel taxiway between them already covered by (5).
7. **Field furniture** — keep `controlTower` but relocate to `x:180, z:150` (overlooking the apron); floodlight masts ringing the apron at the corners (x ∈ {-260,-130,0,130,260}, z:120 and z:230); `windsock` at `x:-200,z:300` and `x:240,z:330`.
8. **Perimeter fence ring** — four `perimeterFence` runs forming a rectangle around the whole airfield. With airfield extent roughly x ∈ [-360,360], z ∈ [-20,375]: south edge omitted/short near landside (leave the terminal approach open), so ring the N/E/W and a partial S airside boundary:
   - North: `perimeterFence` at `z:375, rot:0, params:{length:720}`.
   - East: at `x:360, z:178, rot:90, params:{length:790}`.
   - West: at `x:-360, z:178, rot:90, params:{length:790}`.
   - South airside boundary (behind the terminal, leaving a gate gap for the building): two runs flanking the terminal, e.g. `x:-200,z:-18,rot:0,length:300` and `x:200,z:-18,rot:0,length:300` — derive so they don't cross the terminal footprint (terminal spans x ∈ [-110,110]).
9. **Clouds** — keep / spread the `cubeCloud` entries wider to match the new extent.

Keep `airportPlacements` (filters `ground`) and the `AIRPORT` descriptor (spawn/portal) unchanged except `GROUND`.

- [ ] Step 1: Edit `airportMap.ts`: bump `GROUND` to 820; replace the GATES→runway→clouds blocks with zones 1-9 above, using named constants and derived positions.
- [ ] Step 2: Verify `npx tsc --noEmit` clean.
- [ ] Step 3: Commit `feat(airport): much bigger realistic airfield (wide apron, satellite, remote/cargo, dual runways, fence)`.

---

### Task 6: Bump city ground + final verify

**Files:**
- Modify: `src/world/map.ts` (`export const GROUND_SIZE = 820` → `1500`).

**Reason:** the airport is embedded into the city at `airportPlacements(0, 260)`; the airfield now reaches city z ≈ 655, beyond the old ±410 ground. 1500 → ±750 covers it.

- [ ] Step 1: Edit `map.ts` GROUND_SIZE to 1500.
- [ ] Step 2: Verify `npx tsc --noEmit` clean.
- [ ] Step 3: Final gate — `npx vite build` succeeds.
- [ ] Step 4: Commit `feat(airport): grow city ground to fit the embedded airfield`.

---

## Self-Review

- **Spec coverage:** wide apron (zone 1) = "extend airplanes out"; all aircraft on aprons (zones 1-4) = "airplanes outside only"; aprons/stands = "park station like a real airport"; piers/satellite/remote/cargo/taxiways/dual-runways = "research real structure"; perimeter fence (zone 8) = "close the airport"; ground bumps + 720 m-wide field = "way bigger". All covered.
- **Placeholder scan:** every task names exact files, params, and concrete coordinate constants. No TBDs.
- **Type consistency:** new kinds `perimeterFence`/`hangar`/`windsock`/`concoursePier` are defined in Tasks 1-4 and only consumed in Task 5. Param names match between definition and map usage.
