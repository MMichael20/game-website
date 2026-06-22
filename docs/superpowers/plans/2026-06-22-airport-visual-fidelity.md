# Airport Visual-Fidelity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Re-dress the existing Ben Gurion airport map so it matches the five design references — deep-blue glazed roof, white curb canopy + amber signage, Ben-Gurion-style cylindrical tower, red/yellow/blue/green block accents, ceiling-hung amber boards, numbered check-in, self-service kiosks, blue queue belts, rainbow color-totem columns, wayfinding, red/blue seating, warm duty-free, colorful luggage props, dense greenery, and a busier apron. No NPCs.

**Architecture:** Pure registry+manifest+engine work. Each object is one `defineObject(kind,{params,build})` returning all facets `{mesh,colliders?,obstacles?,anchors?,pois?}`; placement is data in `airportMap.ts`. Extend existing airport catalog objects in place and add a small set of new prop objects, then re-dress the map.

**Tech Stack:** TypeScript, Three.js, Rapier. Voxel helpers in `src/world/objects/voxel.ts` (`tintedBox`, `cylinderY`, `cone`, `disc`, `mergeTinted`, `tintedMesh`, `DECAL_GAP`), `glass.ts` (`makeGlassPanel`), `textSign.ts` (`makeTextSignMesh`), `palette.ts` (`PALETTE`), `rng.ts` (`mulberry32`).

## Global Constraints

- **No screenshots, no dev server, no `npm run dev`/`vite`.** (CLAUDE.md PITFALL 1)
- **No tests written or run.** Per-task + final gate is ONLY `npx tsc --noEmit`; the final whole-branch gate adds `npx vite build`. (CLAUDE.md PITFALL 2)
- **Work on master.** No worktree/branch (user standing rule).
- **Determinism:** no `Math.random`/`Date.now`/argless `new Date()` in builders. Use `mulberry32(seed)` from `world/rng.ts` for any variation; cycle palettes by index where possible. (CLAUDE.md)
- **Derive child placement from real part dimensions, never magic numbers.** (CLAUDE.md PITFALL 3)
- **Local space:** centered x=z=0, base y=0, FRONT faces +z, ~1u=1m. Return facets in local space; the engine transforms on placement. Rotation only in {0,90,180,270}.
- **Transparent meshes (glass) cannot be vertex-merged** — keep them as separate meshes added to the group (see `glass.ts`).
- New objects MUST be imported in `src/world/catalog/index.ts`.
- Color language (hex) to reuse across tasks:
  - Block-accent mosaic: red `0xd23b2e`, yellow `0xf2c12e`, blue `0x2b6fb5`, green `0x2e9e4f`, orange `0xe8772e`, purple `0x7a3fb0`.
  - Blue glazed roof glass: tint `0x2c5aa0` (deep `0x1f3a6b`), opacity ~0.5.
  - Amber signage/FIDS text: `#f0b020`; sign board background `0x15171a`.
  - Red duty-free sign: `0xcc2222`; warm wood shelf `0xb07a3a`.
  - Seating red `0xc0392b`, seating blue `0x2c5aa0`.
  - Queue belt blue `0x2b6fb5`; chrome post `PALETTE.steelLight`.
  - Luggage palette: `[0xc0392b,0x2b6fb5,0x2e9e4f,0xf2c12e,0x7a3fb0,0xe8772e]`.
  - Glossy floor tile cream `0xe2ddd2`, grout `0xcfcabc`.

---

## File Structure

- Modify `src/world/catalog/airport/terminalHall.ts` — blue sawtooth roof, front glass curtain wall + door bays, color-block fascia band, colored column accents.
- Modify `src/world/catalog/airport/controlTower.ts` — slender cylindrical shaft + overhanging bulged glass cab + antenna cluster.
- Modify `src/world/catalog/airport/curbCanopy.ts` — white roof + hung amber sign panels.
- Modify `src/world/catalog/airport/flightBoard.ts` — `hung` variant: ceiling-drop supports, amber rows, colored status cells.
- Modify `src/world/catalog/airport/checkInIsland.ts` — numbered backlit lightboxes (colored pairs) + brighter desk monitors.
- Modify `src/world/catalog/airport/airportSeating.ts` — alternating red/blue cushions param.
- Modify `src/world/catalog/airport/dutyFreeShop.ts` — warm wood shelving option + brighter red sign band.
- Create `src/world/catalog/airport/selfCheckinKiosk.ts` — `selfCheckinKiosk`.
- Create `src/world/catalog/airport/queueLane.ts` — `queueLane` (chrome posts + blue belts, snaking).
- Create `src/world/catalog/airport/wayfindingSign.ts` — `wayfindingSign`.
- Create `src/world/catalog/airport/luggagePile.ts` — `luggagePile` and `baggageTrolley`.
- Create `src/world/catalog/airport/hedgeRow.ts` — `hedgeRow`.
- Create `src/world/catalog/airport/floodlightMast.ts` — `floodlightMast`.
- Create `src/world/catalog/airport/apronContainers.ts` — `apronContainers`.
- Create `src/world/catalog/airport/cubeCloud.ts` — `cubeCloud`.
- Modify `src/world/catalog/index.ts` — import the 7 new files.
- Modify `src/world/airportMap.ts` — re-dress landside, interior, apron; add clouds.

Each task ends by running `npx tsc --noEmit` (expected: clean) and committing.

---

### Task 1: Terminal hall — blue glazed roof, glass front, color band, column accents

**Files:** Modify `src/world/catalog/airport/terminalHall.ts`

**Interfaces:**
- Consumes: `tintedBox`, `mergeTinted`, `tintedMesh`, `DECAL_GAP` (voxel.ts); `makeGlassPanel` (glass.ts); `makeTextSignMesh` (textSign.ts); `PALETTE`.
- Produces: `defineObject("terminalHall", {params:{w,d,h,rearGap},build})` with the SAME anchors (`concourseGap` at `{0,-d/2}`, `door` at `{0,d/2}`) and the existing wall/column colliders. Adds new params with defaults: `roofRidge` (number, extra ridge height above `h`, default `8`), `roofSteps` (int, default `5`).

**Requirements:**
1. Keep the existing floor, side glass bays, back wall + doorway, interior column row, ceiling beams, colliders, and anchors.
2. **Replace the flat roof + skylight strips** with a **stepped sawtooth blue glazed roof**: starting at the front (+z) low edge and rising in `roofSteps` steps toward the rear ridge (height `h + roofRidge`). Each step is a panel of deep-blue glass via `makeGlassPanel({tint:0x2c5aa0, opacity:0.5, frameColor:PALETTE.steelLight, divisions})` laid as a near-horizontal slab (rotate the panel flat: `rotation.x = -Math.PI/2`) sitting on a thin opaque white mullion frame box. The stepped parapet should read as a serrated silhouette from the side. Derive each step's z-span and y from `d`, `roofSteps`, `roofRidge` (no magic numbers).
3. **Front glass curtain wall:** replace the open front (currently only 1.2m corner returns) with a full-width **dark-tinted glass curtain wall** across +z, leaving a centered ~`rearGap`-wide entrance of **sliding glass door bays** (`makeGlassPanel({door:true})`). Keep corner returns. Do NOT add a collider across the doorway (player must walk in); keep slim colliders only at the solid glass segments flanking the doors.
4. **Color-block mosaic band:** along the top of the front+side fascia (just under the roof edge), lay a 2–3-block-tall mosaic of `tintedBox` cubes cycling red/yellow/blue/green/orange (use the Global Constraints accent hexes), deterministic by index. This is the signature stripe — make it prominent on the +z front.
5. **Colored column accents:** on each side structural column and the interior column row, add small accent tiles (`tintedBox`, ~0.3m) in blue/red/yellow at ~mid-height, cycling by index.
6. Keep "DEPARTURES" + airport name signs; reposition if needed so they sit on the new front band.

- [ ] Step 1: Implement the changes above, deriving all positions from `w/d/h/rearGap/roofRidge/roofSteps`.
- [ ] Step 2: Run `npx tsc --noEmit` — expected clean.
- [ ] Step 3: Commit: `feat(airport): terminal blue glazed roof + glass front + color band`.

---

### Task 2: Control tower — cylindrical shaft + bulged cab + antenna cluster

**Files:** Modify `src/world/catalog/airport/controlTower.ts`

**Interfaces:**
- Consumes: `tintedBox`, `cylinderY`, `disc`, `mergeTinted`, `tintedMesh`, `PALETTE`.
- Produces: `defineObject("controlTower",{params:{h},build})` returning `{mesh,colliders,obstacles}` (same shape as now). Keep the red emissive beacon + transparent glass cab as separate meshes.

**Requirements (reshape to Ben Gurion silhouette):**
1. **Slender, near-constant cylindrical shaft** (light grey `CONCRETE`), radius ~`2.0` constant (not heavily tapered), from y=0 to `shaftTopY = h*0.78`. A few subtle shade bands are fine.
2. **Overhanging bulged cab** near the top: a glass cab whose radius (~`3.6`) is clearly LARGER than the shaft — it overhangs. Add a white structural **collar ring** (`disc`/short cylinder, radius ~`3.8`) directly beneath the cab. Keep the cab as a separate transparent dark-glass mesh (`color 0x5a6b7a`, opacity ~0.4).
3. **Cab roof** flat disc cap on top of the cab.
4. **Antenna cluster:** replace the single mast with **4–6 thin masts** of varying heights clustered on the cab roof, plus 1–2 small cross spars; keep the red emissive beacon on the tallest.
5. Keep base equipment room + base equipment boxes (can simplify). Keep gallery railing posts around the cab.
6. Collider: a single box approximating the shaft (`baseR*2` wide, height `h`). Obstacle footprint around the base.

- [ ] Step 1: Implement.
- [ ] Step 2: `npx tsc --noEmit` — clean.
- [ ] Step 3: Commit: `feat(airport): cylindrical control tower with bulged cab + antennas`.

---

### Task 3: Curb canopy — white roof + hung amber signs

**Files:** Modify `src/world/catalog/airport/curbCanopy.ts`

**Interfaces:**
- Consumes: same imports as now; `makeTextSignMesh`.
- Produces: `defineObject("curbCanopy",{params:{w,d,label},build})` (unchanged signature) returning `{mesh,colliders,obstacles}`.

**Requirements:**
1. **Recolor the roof slab and rear fascia to white** (`0xf2f0ea`); keep a thin steel edge trim. The canopy must read white, not grey concrete.
2. **Hang amber sign panels under the canopy:** below the soffit, every ~20m, add a small dark board (`0x15171a`) carrying an **amber** `makeTextSignMesh({text:label,textColor:"#f0b020",boardColor:0x15171a,glow:0.9})` facing +z (traffic side). Keep the existing blue fascia label sign OR replace with amber — prefer amber to match refs.
3. Keep columns, curb, lane markings, ceiling coffer, obstacles, colliders.

- [ ] Step 1: Implement.
- [ ] Step 2: `npx tsc --noEmit` — clean.
- [ ] Step 3: Commit: `feat(airport): white curb canopy with hung amber signage`.

---

### Task 4: Flight board — ceiling-hung amber variant with status cells

**Files:** Modify `src/world/catalog/airport/flightBoard.ts`

**Interfaces:**
- Consumes: same imports.
- Produces: `defineObject("flightBoard",{params:{w,h,rows,hung},build})`. New bool param `hung` (default `false`). When `hung:true`, the board hangs from drop-rods ABOVE (base y=0 is the ceiling attach point; board hangs below it).

**Requirements:**
1. Keep the existing CanvasTexture FIDS face but **recolor the row text to amber** (`#f0b020` for time/dest), keep status colors, and **add a colored status CELL block** at each row's right end (small filled rect in red/green/blue/white per status) so the board reads colorful like the refs.
2. `hung:true`: instead of a mount post below, draw **two thin drop-rods from y=0 down** to the board top, and place the board hanging beneath (board top near y=0, body extends downward). `hung:false` keeps current behavior.
3. No colliders (mounted high).

- [ ] Step 1: Implement.
- [ ] Step 2: `npx tsc --noEmit` — clean.
- [ ] Step 3: Commit: `feat(airport): ceiling-hung amber flight board with status cells`.

---

### Task 5: Check-in island — numbered lightboxes + brighter monitors

**Files:** Modify `src/world/catalog/airport/checkInIsland.ts`

**Interfaces:**
- Consumes: same imports; `makeTextSignMesh`.
- Produces: `defineObject("checkInIsland",{params:{len,desks,startNo},build})`. New param `startNo` (int, default `1`) — the first desk number; desks are numbered `startNo..startNo+desks-1`.

**Requirements:**
1. On the overhead sign bar, **replace/augment the CHECK-IN sign with per-desk NUMBERED backlit lightboxes**: one small box per desk showing its two-digit number ("01".."26"), each a `makeTextSignMesh({text:NN, w~deskW*0.6, h~0.5, boardColor: cycle blue/green/red by pair, textColor:"#ffffff", glow:0.95})`, positioned above its desk facing +z. Color pattern: pairs cycle blue `0x2b6fb5`, green `0x2e9e4f`, red `0xc0392b`.
2. Keep desks, scales, belts, queue stanchions, colliders, obstacles.
3. Keep desk monitors but bump screen emissive intensity slightly (~1.1) so they glow.

- [ ] Step 1: Implement.
- [ ] Step 2: `npx tsc --noEmit` — clean.
- [ ] Step 3: Commit: `feat(airport): numbered check-in lightboxes + glowing monitors`.

---

### Task 6: Airport seating — alternating red/blue

**Files:** Modify `src/world/catalog/airport/airportSeating.ts`

**Interfaces:**
- Produces: `defineObject("airportSeating",{params:{seats,back,scheme},build})`. New param `scheme` (`"navy"|"redblue"`, default `"redblue"`). `redblue` alternates seat cushion + backrest colors red `0xc0392b` / blue `0x2c5aa0` per seat index; `navy` keeps current colors.

**Requirements:** Cushion, backrest, and trim colors come from `scheme`; everything else (beam, legs, arms, anchors, obstacle) unchanged.

- [ ] Step 1: Implement.
- [ ] Step 2: `npx tsc --noEmit` — clean.
- [ ] Step 3: Commit: `feat(airport): red/blue gang seating scheme`.

---

### Task 7: Duty-free — warm wood shelving + brighter red sign

**Files:** Modify `src/world/catalog/airport/dutyFreeShop.ts`

**Interfaces:**
- Produces: `defineObject("dutyFreeShop",{params:{w,d,name,accent,warm},build})`. New bool `warm` (default `false`). When `warm:true`, gondola bodies use warm wood `0xb07a3a`, shelves `0x8a5a2b`, and the sign band uses red `0xcc2222` regardless of `accent`, with `glow:1.0`.

**Requirements:** Keep all geometry; only swap shelf/body colors and sign color when `warm`. Products keep their colorful palette.

- [ ] Step 1: Implement.
- [ ] Step 2: `npx tsc --noEmit` — clean.
- [ ] Step 3: Commit: `feat(airport): warm duty-free shelving variant`.

---

### Task 8: New prop — self-service check-in kiosk

**Files:** Create `src/world/catalog/airport/selfCheckinKiosk.ts`

**Interfaces:**
- Produces: `defineObject("selfCheckinKiosk",{params:{count},build})` → `{mesh,colliders,obstacles}`. `count` (int, default 1) kiosks in a row spaced by body width + 0.6m gap, centered on origin, facing +z.

**Requirements:** Each kiosk: a slim pedestal body (`~0.5w x 1.1h x 0.4d`, grey/white `0xe8e6e0`) with an **angled glowing-blue screen** near the top — a `PlaneGeometry` with an emissive blue CanvasTexture (reuse the monitor-screen approach from checkInIsland: blue UI, emissiveIntensity ~1.0), tilted ~20deg toward the user. Small base plinth. Per-kiosk collider + obstacle. Derive row spacing from body width.

- [ ] Step 1: Implement + import in `index.ts`.
- [ ] Step 2: `npx tsc --noEmit` — clean.
- [ ] Step 3: Commit: `feat(airport): self-service check-in kiosk`.

---

### Task 9: New prop — queue lane (blue belts)

**Files:** Create `src/world/catalog/airport/queueLane.ts`

**Interfaces:**
- Produces: `defineObject("queueLane",{params:{w,d,rows},build})` → `{mesh,obstacles}`. Builds a snaking belt-barrier field over a `w`×`d` footprint with `rows` (int, default 3) parallel belt runs.

**Requirements:** Chrome posts (`cylinderY`, `PALETTE.steelLight`, ~1.0m) on a grid; **blue belt segments** (`tintedBox`, color `0x2b6fb5`, ~0.04 thick) connecting posts along each row, forming a switchback. Top caps on posts. Derive post spacing from `w`,`rows`. No solid collider (passable); add a soft obstacle rect over the footprint.

- [ ] Step 1: Implement + import in `index.ts`.
- [ ] Step 2: `npx tsc --noEmit` — clean.
- [ ] Step 3: Commit: `feat(airport): blue queue-belt lane`.

---

### Task 10: New prop — wayfinding sign

**Files:** Create `src/world/catalog/airport/wayfindingSign.ts`

**Interfaces:**
- Produces: `defineObject("wayfindingSign",{params:{text,style,w},build})` → `{mesh}`. `style`: `"amber"|"blue"|"dark"` (default `"amber"`); `text` (default `"GATES"`); `w` (default 3).

**Requirements:** A ceiling-hung directional sign: two short drop-rods from y=0, a horizontal board hanging below carrying `makeTextSignMesh` — amber `boardColor:0xf2b81e, textColor:"#101010"`; blue `boardColor:0x1f4f8a, textColor:"#ffffff"`; dark `boardColor:0x15171a, textColor:"#f0b020"`. Add a simple painted **arrow** block (`tintedBox` chevron) beside the text. No collider.

- [ ] Step 1: Implement + import in `index.ts`.
- [ ] Step 2: `npx tsc --noEmit` — clean.
- [ ] Step 3: Commit: `feat(airport): overhead wayfinding sign`.

---

### Task 11: New props — luggage pile + baggage trolley

**Files:** Create `src/world/catalog/airport/luggagePile.ts`

**Interfaces:**
- Produces TWO objects in one file: `defineObject("luggagePile",{params:{count,seed},build})` and `defineObject("baggageTrolley",{params:{bags,seed},build})`, each `{mesh,obstacles}`.

**Requirements:**
- `luggagePile`: `count` (default 6) suitcase cubes (rounded box ~`0.4×0.55×0.25`, plus a small handle bar on top) clustered deterministically (`mulberry32(seed)` for jitter+rotation), colors cycling the luggage palette. Soft obstacle over the cluster.
- `baggageTrolley`: a grey cart frame (two uprights + a handle bar + a low platform on small wheels via `cylinderY`) loaded with 3–4 stacked bags from the luggage palette. Obstacle over footprint.
- Default `seed` constants (e.g. `0xba9` ) so placements are deterministic; map can pass different seeds per placement for variety.

- [ ] Step 1: Implement + import in `index.ts`.
- [ ] Step 2: `npx tsc --noEmit` — clean.
- [ ] Step 3: Commit: `feat(airport): luggage pile + baggage trolley props`.

---

### Task 12: New props — hedge row + floodlight mast

**Files:** Create `src/world/catalog/airport/hedgeRow.ts` and `src/world/catalog/airport/floodlightMast.ts`

**Interfaces:**
- `defineObject("hedgeRow",{params:{len,h},build})` → `{mesh,colliders,obstacles}`.
- `defineObject("floodlightMast",{params:{h},build})` → `{mesh,colliders,obstacles}`.

**Requirements:**
- `hedgeRow`: a continuous clipped green hedge (`tintedBox` body `PALETTE.hedge` with a 2-tone cube top texture by alternating `leaf`/`leafDeep`) of length `len` (default 8), height `h` (default 1.0), depth ~0.8, on a thin `planterStone` rim. Low collider + obstacle.
- `floodlightMast`: a tall pole (`cylinderY`, `PALETTE.lampPole`, height `h` default 16) with a top **light array** — a small angled box holding 4–6 emissive lamp cubes (`0xffe9b0`, emissive via a separate MeshStandardMaterial OR bright tint). Slim collider at base; obstacle.

- [ ] Step 1: Implement both + import in `index.ts`.
- [ ] Step 2: `npx tsc --noEmit` — clean.
- [ ] Step 3: Commit: `feat(airport): hedge row + floodlight mast props`.

---

### Task 13: New props — apron containers + cube cloud

**Files:** Create `src/world/catalog/airport/apronContainers.ts` and `src/world/catalog/airport/cubeCloud.ts`

**Interfaces:**
- `defineObject("apronContainers",{params:{w,d,seed},build})` → `{mesh,colliders,obstacles}`.
- `defineObject("cubeCloud",{params:{size,seed},build})` → `{mesh}` (no colliders/obstacles).

**Requirements:**
- `apronContainers`: a cargo corner — a deterministic cluster of **stacked colorful container/box cubes** (`~2×2×2` to `2×2×4`) in red/blue/white over a `w`×`d` footprint, 1–2 high, via `mulberry32(seed)`; a couple read as box-truck bodies (add a small grey cab box). Colliders on the big stacks; obstacle over footprint.
- `cubeCloud`: a pure-white (`0xffffff`) stepped cluster of boxes forming a puffy flat-bottomed cloud, scaled by `size` (default 6), deterministic via `mulberry32(seed)`. Mesh only — it's placed high in the sky in the map. No facets that affect gameplay.

- [ ] Step 1: Implement both + import in `index.ts`.
- [ ] Step 2: `npx tsc --noEmit` — clean.
- [ ] Step 3: Commit: `feat(airport): apron containers + cube cloud props`.

---

### Task 14: Map re-dress — assemble everything in airportMap.ts

**Files:** Modify `src/world/airportMap.ts` (and confirm `src/world/catalog/index.ts` has all 7 new imports).

**Interfaces:**
- Consumes every object above. The `terminalHall` placement keeps `rot:180` (front faces south curb). Respect axis convention in the file header (+z airside/north, -z landside/south).

**Requirements:**
1. **Terminal:** pass new params (`roofRidge`, `roofSteps`) so the blue roof ridges toward airside (the roof rises toward +z rear). Verify the color band faces the curb.
2. **Landside (south):** recolor canopy white (now automatic), hang amber `wayfindingSign`s ("ARRIVALS"/"DEPARTURES"/"TAXI") under/near the canopy; add a `baggageTrolley` + `luggagePile` at the curb; add a city `car`/taxi-style vehicle if a suitable kind exists (else `apronVehicle`); line the forecourt edges with `hedgeRow`s; add `floodlightMast`s at the forecourt corners.
3. **Interior (terminal hall footprint):** switch the two entrance `flightBoard`s to `hung:true` and enlarge; number the four `checkInIsland`s via `startNo` (1,5,9,13...); add `selfCheckinKiosk` clusters between check-in and security; add `queueLane`s in front of check-in; add `wayfindingSign`s ("SECURITY", "GATES") near the concourse doorway; set `airportSeating` to `redblue`; set the hall duty-free shops to `warm:true`; scatter `luggagePile`s + `baggageTrolley`s; add indoor planters (existing `planter`/`palmTree`).
4. **Apron (north):** add an `apronContainers` cargo corner off to one side; add `floodlightMast`s along the apron edge (replace/supplement the plain `lamp`s); keep jets/jet-bridges/GSE.
5. **Sky:** add ~6 `cubeCloud` placements at high y. NOTE: placements use x/z/rot only — for a y offset, the cloud must be authored to sit high by `size`, OR add cloud cluster at large size; if the engine has no y in Placement, place clouds as tall thin props OR skip y. CHECK `Placement`/engine: it has no y. So author `cubeCloud` to build its cloud at a high local y (e.g. center at y≈40) so placing it puts it in the sky. Pass that as part of the object (a `y`/`alt` param), not the placement.
6. Keep `SPAWN`, `groundSize`, `portals`, `hasCar:false` unchanged.

**Decision to honor:** `cubeCloud` gets an `alt` param (default ~42) for its sky height, since `Placement` has no y. Log if you change this.

- [ ] Step 1: Re-dress the map per above.
- [ ] Step 2: `npx tsc --noEmit` — clean.
- [ ] Step 3: Commit: `feat(airport): re-dress map to match design references`.

---

### Task 15: Final verification gate

**Files:** none (gate only)

- [ ] Step 1: `npx tsc --noEmit` — expected: clean (no errors).
- [ ] Step 2: `npx vite build` — expected: build succeeds.
- [ ] Step 3: If both pass, commit any remaining changes and hand back on master for in-game review. Do NOT merge/deploy.

---

## Self-Review notes

- Spec coverage: items 1–17 map to Tasks 1 (roof/glass/band/columns), 2 (tower), 3 (white canopy+amber), 4 (hung amber boards+status cells), 5 (numbered desks+monitors), 6 (red/blue seating), 7 (warm duty-free), 8 (kiosk), 9 (queue belts), 10 (wayfinding), 11 (luggage/trolley), 12 (hedges/floodlights), 13 (containers/clouds), 14 (assembly incl. glossy-floor tint via terminalHall floor color + greenery + apron). Glossy floor (item 13 of spec) is approximated by floor tile color only (logged decision) — handled inside Task 1's retained floor; bump tile color to `0xe2ddd2` there.
- Determinism: all variation via `mulberry32(seed)` or index cycling — no RNG/time.
- Tasks 1–13 are independent (separate files) → safe to parallelize. Task 14 depends on all. Task 15 is the final gate.
- No tests (project rule); gate is tsc + vite build.
