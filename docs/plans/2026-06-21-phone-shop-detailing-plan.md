# Phone Repair Shop Detailing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring `phoneRepairShop` up to the restaurant's richness and scale — a blue-themed, street-level phone showroom with a fully clad exterior, a wall of phones, display islands, a repair counter + bench, dressing, and an enlarged map footprint.

**Architecture:** Pure registry/manifest/engine authoring. Expand `phoneRepairShop.build()` in `src/world/catalog/stores.ts`, reusing the restaurant's exterior helpers (generalized with an optional `accent` color, red default → restaurant unchanged) and adding phone-themed interior fittings. Add one reusable object (`aFrameSign`). Enlarge + re-furnish the lot in `src/world/map.ts`.

**Tech Stack:** TypeScript, three.js, the project's voxel helpers (`tintedBox`, `mergeTinted`, `tintedMesh`, `cylinderY`), `defineObject`/`buildObject`/`applyTransform`.

## Global Constraints

- NO Math.random / Date.now / argless `new Date()` in builders — fully deterministic.
- Build at LOCAL origin: centered x=z=0, base y=0, FRONT faces +z, ~1u = 1m.
- Derive every child placement from real sizes — never magic offsets (pitfall #3).
- Rotation only in 90° increments at placement.
- **Verification = `npx tsc --noEmit` ONLY.** No tests, no `vite build`, no dev server, no screenshots (CLAUDE.md PITFALLS 1 & 2). This replaces the usual TDD cycle.
- Restaurant output must stay unchanged: all generalized helpers keep red defaults.

---

### Task 1: A-frame sandwich sign object + catalog registration

**Files:**
- Create: `src/world/objects/aFrameSign.ts`
- Modify: `src/world/catalog/primitives.ts` (add `defineObject("aFrameSign", …)`)

**Interfaces:**
- Produces: `makeAFrameSign(cfg?: { boardColor?: number }): THREE.Object3D` — a
  sandwich board, base y=0, front +z, footprint ~0.9×0.7m.
- Produces: catalog kind `"aFrameSign"` placeable as a `lot()` prop.

- [ ] **Step 1:** Create `aFrameSign.ts` exporting `makeAFrameSign`: two angled
  boards (rotate about the top hinge by ±0.18 rad), a dark frame, a glowing phone
  icon (slate body + bright screen) and two pale "text" bars on the +z board. Use
  `tintedBox`/`mergeTinted`/`tintedMesh`. Boards lean into an inverted-V.
- [ ] **Step 2:** In `primitives.ts`, `import { makeAFrameSign }` and
  `defineObject("aFrameSign", { params: {}, build() { const mesh = makeAFrameSign();
  mesh.castShadow = true; return { mesh, obstacles: [{ x:0, z:0, w:0.9, d:0.7 }] }; } })`.
- [ ] **Step 3:** `npx tsc --noEmit` → clean.
- [ ] **Step 4:** Commit: `feat(world): add A-frame sandwich sign object + catalog`.

---

### Task 2: Theme the storefront sign + generalize exterior helpers

**Files:**
- Modify: `src/world/catalog/buildings.ts` (storefront `signColor` param)
- Modify: `src/world/catalog/stores.ts` (`makeExteriorFacade`, `makeSideWindows` accent)

**Interfaces:**
- Produces: `storefront` params gain `signColor?: number` (default `PALETTE.awningRed`),
  passed to `makeTextSignMesh({ … boardColor: p.signColor ?? PALETTE.awningRed })`.
- Produces: `makeExteriorFacade(w,d,h, accent: number = PALETTE.awningRed)` — the red
  fascia bands use `accent`.
- Produces: `makeSideWindows(w,d,h, accent: number = PALETTE.awningRed)` — the side
  awnings' `colorA` uses `accent`.

- [ ] **Step 1:** `buildings.ts`: add `signColor?: number` to `StorefrontParams` and
  default in `params`; replace the hard-coded `boardColor: PALETTE.awningRed` in the
  header sign with `p.signColor ?? PALETTE.awningRed`.
- [ ] **Step 2:** `stores.ts`: change `makeExteriorFacade(w,d,h)` signature to accept
  `accent = PALETTE.awningRed`; replace each `PALETTE.awningRed` fascia usage with
  `accent` (side fascia, back fascia). Leave brown/stone/body as-is.
- [ ] **Step 3:** `stores.ts`: change `makeSideWindows(w,d,h)` to accept
  `accent = PALETTE.awningRed`; pass `colorA: accent` to `makeAwning`.
- [ ] **Step 4:** `npx tsc --noEmit` → clean. (Restaurant calls omit `accent`, so red.)
- [ ] **Step 5:** Commit: `refactor(world): themeable accent on storefront sign + facades`.

---

### Task 3: Phone-store interior fittings

**Files:**
- Modify: `src/world/catalog/stores.ts` (add fitting factories near the bakery ones)

**Interfaces (all return the existing `Fitting` shape `{ mesh, colliders?, obstacles?, seats? }`):**
- `makePhoneWallDisplay(cx, cz, len: number, accent: number): Fitting` — backlit wall
  panel + derived grid of phones; solid collider `len × ~0.3 × 0.4`.
- `makeAccessoryWall(cx, cz, len: number): Fitting` — pegboard of hanging accessory
  boxes + a low boxed-stock shelf; solid collider.
- `makeDisplayIsland(cx, cz: number): Fitting` — wood base + glass top + a derived row
  of phones on stands; solid collider ~1.6×0.9.
- `makeRepairCounter(cx, cz, len: number): Fitting` — wood counter + top lip + register
  + parts organizer + repair lamp + phones + low glass divider; solid collider.
- `makeRepairBench(cx, cz, len: number): Fitting` — steel bench + tool pegboard + parts
  bins + magnifier lamp + disassembled phone + soldering iron; solid collider.
- `makeWaitingArea(cx, cz: number): { mesh, obstacles, seats }` — 2 chairs (reuse
  `makeInlineChair`) + low table; chairs are seats, table is the obstacle.
- `makeWallScreen(w, h, hue: number): THREE.Object3D` — glowing flat board, front +z.

- [ ] **Step 1:** Add `makePhoneWallDisplay`. Panel: `tintedBox(len, 2.2, 0.12)` back
  board in `PALETTE.steelDark`, an accent valance strip, and a glow strip under each
  of 2 shelf levels. Phones: `cols = Math.max(2, Math.floor(len/0.55))`, two rows at
  derived y; each `makePhone({ width:0.34, height:0.6, screenColor: PHONE_SCREENS[i%…] })`
  mounted flat against +z. Collider `solidBox(cx, 1.1, cz, len, 2.2, 0.4)`.
- [ ] **Step 2:** Add `makeAccessoryWall`. Pegboard `tintedBox(len, 1.6, 0.06)` in a
  light hue at y≈1.7; hanging accessories: derived count of small `tintedBox` boxes in
  rotating hues; a low shelf `tintedBox(len, 0.06, 0.34)` at y≈0.9 with boxed stock.
  Collider for the low shelf only.
- [ ] **Step 3:** Add `makeDisplayIsland`. Base `tintedBox(1.6, 0.9, 0.9, …, caseWood)`
  + top lip + `makeGlassPanel`-style glass top box (reuse the display-case glass idea:
  thin translucent slab). Row of `n = Math.max(2, floor(1.6/0.5))` phones on small
  stands. Collider `solidBox(cx, 0.45, cz, 1.6, 0.9, 0.9)`.
- [ ] **Step 4:** Add `makeRepairCounter`. Body `tintedBox(len, 0.92, 0.7, caseWood)`
  + top lip; register (reuse the restaurant's register box pattern); a parts-organizer
  `tintedBox` grid; an anglepoise lamp (pole + arm + head via `cylinderY`/`tintedBox`);
  2 phones on top; a low glass divider `makeGlassPanel({ w:len*0.9, h:0.4 })` along the
  customer edge. Collider `solidBox(cx, 0.46, cz, len, 0.92, 0.7)`. Return derived
  `counter`/`staff` seats via the caller (or expose via `seats`).
- [ ] **Step 5:** Add `makeRepairBench`. Steel base `tintedBox(len, 0.9, 0.6, steel)` +
  worktop; pegboard `tintedBox(len, 0.9, 0.05)` at y≈1.6 with tool silhouettes (small
  boxes); 3 parts bins; magnifier lamp; a disassembled phone (body + detached screen +
  tiny part boxes); a soldering iron (`cylinderY` handle + tip). Collider for the base.
- [ ] **Step 6:** Add `makeWaitingArea`: a low table `tintedBox(0.9,0.5,0.6, benchWood)`
  with a phone/magazine on top + two `makeInlineChair` groups facing it; obstacles =
  table only; seats = the two chairs (derived world positions).
- [ ] **Step 7:** Add `makeWallScreen`: frame box + emissive-ish bright face + a darker
  phone silhouette; front +z.
- [ ] **Step 8:** `npx tsc --noEmit` → clean.
- [ ] **Step 9:** Commit: `feat(world): phone-store interior fittings`.

---

### Task 4: Entry stoop helper

**Files:**
- Modify: `src/world/catalog/stores.ts`

**Interfaces:**
- `makeEntryStoop(w: number, frontZ: number): Fitting` — a shallow 2-step stoop at the
  door, top flush with `FLOOR_TOP`, width derived from the door gap (~`DOOR_GAP_W`+2),
  in front of `frontZ`. Solid colliders per step.

- [ ] **Step 1:** Add `makeEntryStoop`. `rise = FLOOR_TOP/2`, two steps stepping down
  from `frontZ` toward the street, each `tintedBox(stoopW, top, td, …, stoneBase)` + a
  `curb` nosing; colliders `solidBox` per step. `stoopW = Math.min(w*0.5, 5)`.
- [ ] **Step 2:** `npx tsc --noEmit` → clean.
- [ ] **Step 3:** Commit: `feat(world): shallow entry stoop helper for flat storefronts`.

---

### Task 5: Rewrite `phoneRepairShop.build()`

**Files:**
- Modify: `src/world/catalog/stores.ts` (replace the existing `phoneRepairShop` block)

**Interfaces:**
- Consumes: Tasks 2–4 helpers, `makeTiledFloor`, `makePavement`, `makeExteriorFacade`,
  `makeSideWindows`, `makeRooftopUnit`, `makeSideDownspouts`, `makeBackUtilities`,
  `makePendantLamp`, `makeWallClock`, `makeFramedPicture`, `makeWallLampMesh`,
  `makePottedPlantMesh`, `makeTextSignMesh`, `makeInlineChair`.
- Produces: a richer `phoneRepairShop` with default `params { w:18, d:14, h:6 }` kept,
  but authored to scale with any `w/d/h`; anchors `door/counter/staff` + waiting seats;
  POI `{ kind:"phoneShop", label:"Phone Repair", radius:4.5, anchor:"door" }`.

- [ ] **Step 1:** Shell + `makeTiledFloor(w,d)` + themed `storefront`
  (`signText:"Phone Repair"`, `awningColor: PALETTE.awningBlue`, `signColor:
  PALETTE.signCool`, `fullGlass:true`) at `z=d/2`.
- [ ] **Step 2:** Interior frame (`T=0.3`, `xi=w/2-T`, `backZ=-d/2+T`). BACK WALL: 2–3
  `makePhoneWallDisplay(accent=awningBlue)` across the back (count/positions derived
  from `w`), an interior "Phone Repair" `makeTextSignMesh` (blue board) high on the
  back wall, and a `makeWallClock`.
- [ ] **Step 3:** LEFT wall: `makeRepairBench` run + `makeAccessoryWall`. RIGHT wall:
  `makeWallScreen`s + framed tech posters (`makeFramedPicture`).
- [ ] **Step 4:** FRONT-LEFT: `makeRepairCounter` (set `counter`/`staff` anchors from
  it). SHOWROOM CENTRE/RIGHT: a derived grid (2×2) of `makeDisplayIsland`. FRONT-RIGHT:
  `makeWaitingArea` (add its seats to anchors). Indoor plants flanking the entrance.
- [ ] **Step 5:** Dressing: cool-white `makePendantLamp`s over the showroom (derived
  positions clear of islands), interior wall lamps along both walls, ceiling beams, a
  welcome mat at the door.
- [ ] **Step 6:** EXTERIOR: `makePavement`, `makeExteriorFacade(accent=awningBlue)`,
  `makeSideWindows(accent=awningBlue)`, `makeRooftopUnit`, `makeSideDownspouts`,
  `makeEntryStoop(w, d/2)`, front wall lanterns flanking the door, a side "Phone Repair"
  sign on the left wall.
- [ ] **Step 7:** BACK ALLEY: `makeBackUtilities` + roll-up door + service door +
  dumpster + crates + bollards (reuse the restaurant's inline pattern; all with
  colliders/obstacles).
- [ ] **Step 8:** Compose; set `result.anchors` (door/counter/staff/waiting seats) and
  `result.pois`.
- [ ] **Step 9:** `npx tsc --noEmit` → clean.
- [ ] **Step 10:** Commit: `feat(world): author phoneRepairShop as a fully detailed showroom`.

---

### Task 6: Enlarge + re-furnish the phone-shop lot

**Files:**
- Modify: `src/world/map.ts`

**Interfaces:**
- Consumes: catalog kinds `phoneRepairShop`, `lamp`, `bench`, `planter`, `tree`,
  `aFrameSign`.

- [ ] **Step 1:** Change the phone-shop `lot()` to
  `buildingParams: { w: 22, d: 16, h: 7 }`, grid `{ originX:-12, originZ:-17, cellW:8,
  cellD:8 }` (front face world z = -17 + 8 = -9). Update the footprint comment block.
- [ ] **Step 2:** Give the lot props (lot-local, `+z` = toward street, clear of the
  centred entry stoop/door): `{kind:"lamp", x:-10, z:9}`, `{kind:"lamp", x:10, z:9}`,
  `{kind:"bench", x:-9, z:9}`, `{kind:"aFrameSign", x:6, z:9}`,
  `{kind:"planter", x:9, z:9}`, `{kind:"tree", x:-12, z:-9}`, `{kind:"tree", x:12, z:-9}`.
- [ ] **Step 3:** Remove the now-redundant loose street props (the raw `lamp/bench/
  flower/planter` lines at `z=-7`) that the lot frontage replaces; keep only props that
  remain clear of the enlarged apron, or relocate them into the gap between the stores.
- [ ] **Step 4:** `npx tsc --noEmit` → clean.
- [ ] **Step 5:** Commit: `feat(world): enlarge + furnish the phone-shop lot frontage`.

---

## Self-Review

- **Spec coverage:** exterior theming (T2), flat front + stoop (T4), interior fittings
  (T3), full composition (T5), aFrameSign (T1), enlargement + frontage (T6) — every
  spec section maps to a task.
- **Placeholders:** none — each task names exact files, factory signatures, and derived
  counts. (Per-voxel code is authored at implementation; signatures + derivations are
  fixed here.)
- **Type consistency:** all fittings return the existing `Fitting` shape; `accent`
  params default to `PALETTE.awningRed`; `signColor` defaults to `PALETTE.awningRed`.
- **No-tests adaptation:** every task's verification is `npx tsc --noEmit`, per PITFALL 2.
