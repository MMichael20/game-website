# Player House Modern-Villa Reskin Implementation Plan

> **For agentic workers:** This plan is executed INLINE in-session (the exterior is
> one tightly-coupled geometry unit — see spec build-method decision). Steps use
> checkbox (`- [ ]`) syntax. PROJECT GATE OVERRIDES TDD: there are NO tests; the
> only verification is `npx tsc --noEmit` (per task) and `npx vite build` (final).
> No dev server, no screenshots — the user reviews in-game.

**Goal:** Reskin the hero `playerHouse` exterior to the modern-villa concept
(`assets/design-examples/player-house-modern-villa-concept-v1.png`).

**Architecture:** All changes live in `src/world/catalog/playerHouse.ts` plus a small
named color group added to `src/world/palette.ts`. Footprint constants `W/D/GAR_W`
stay fixed so the `suburbMap.ts` mirror, fences, driveway, and spawn anchors remain
valid. Interior, colliders, anchors, POIs, and yard are kept; only `makeShell`,
`makeGarage`, `makeRoof` change and a new `makeTerrace` is added.

**Tech Stack:** TypeScript, Three.js BufferGeometry voxel helpers (`tintedBox`,
`tintGeo`, `cylinderY`, `mergeTinted`, `tintedMesh`), Rapier colliders.

## Global Constraints

- LOCAL space: centered x=z=0, base y=0, FRONT faces +z, ~1u = 1m.
- Determinism: NO `Math.random` / `Date.now` / `new Date()` — only `mulberry32(seed)` / index.
- Rotation 90° increments; collider/obstacle AABBs axis-aligned.
- Derive ALL child placement from named dimension constants — no magic offsets.
- Facet contract: mesh + colliders + obstacles + anchors + pois from one `build()`.
- Keep `W=26`, `D=20`, `GAR_W=11` (mirrored by `suburbMap.ts`). Garage on local `-x`.
- Keep the walk-in door gap + lintel + door colliders EXACTLY (spawn/interior depend on it).
- Gate: `npx tsc --noEmit` clean + `npx vite build` succeeds.

---

### Task 1: Add villa palette colors

**Files:**
- Modify: `src/world/palette.ts` (inside the `PALETTE` object, after the `// exterior facade + deck` group)

**Interfaces:**
- Produces: `PALETTE.villaStucco`, `villaStuccoWarm`, `villaStone`, `villaWood`,
  `villaRoof`, `villaSoffit`, `villaDeck`, `villaPergola`, `villaRail` (all `number` hex).

- [ ] **Step 1: Add the named colors**

```ts
  // modern-villa hero house (player-house-modern-villa-concept-v1)
  villaStucco: 0xe9ddc7,    // warm cream stucco (main upper walls)
  villaStuccoWarm: 0xd9c39a, // deeper tan stucco accent
  villaStone: 0xbfb3a0,     // beige stacked-stone veneer (entry pillar, base, chimney)
  villaWood: 0x7c4a25,      // warm vertical wood-slat cladding
  villaRoof: 0x2a2c30,      // dark charcoal shed roof
  villaSoffit: 0x4a4d52,    // lighter grey eave underside
  villaDeck: 0xd7d2c6,      // pale terrace floor stone
  villaPergola: 0x6a3f20,   // pergola louver wood (a touch darker than villaWood)
  villaRail: 0x23262b,      // near-black thin metal terrace rail
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean (no errors).

- [ ] **Step 3: Commit**

```bash
git add src/world/palette.ts
git commit -m "feat(palette): modern-villa hero house color group"
```

---

### Task 2: Reskin `makeShell` facade (materials + double-height glass bay)

**Files:**
- Modify: `src/world/catalog/playerHouse.ts` — the `BODY_CHOICES`/`ROOF_CHOICES`
  block (lines ~72-76) and `makeShell()` (lines ~119-239).

**Interfaces:**
- Consumes: `W, D, FLOOR_H, FLOORS, T, totalH, DOOR_W, DOOR_H, segW`, `addWindow`,
  `PALETTE.villa*`, `winFrame`, `glass`, `glassDark`, `shopGlow`, `facadeDoor`, `TRIM`.
- Produces: `makeShell()` returns `{ parts, colliders }` — colliders UNCHANGED.

- [ ] **Step 1: Replace seeded body/roof color with fixed villa colors**

Replace the `BODY_CHOICES` / `ROOF_CHOICES` / `bodyColor` / `roofColor` lines with:

```ts
    // Hero villa uses a FIXED designed palette (no seeded body/roof color) so it
    // reliably matches the concept. `seed` still drives incidental variation only.
    const bodyColor = PALETTE.villaStucco;   // main stucco walls
    const roofColor = PALETTE.villaRoof;     // dark charcoal shed roof
    const STONE = PALETTE.villaStone;        // stacked-stone veneer
    const WOOD = PALETTE.villaWood;          // vertical wood-slat cladding
```

(`rng` stays declared; if `rng` becomes unused TypeScript will not error since
`noUnusedLocals` — verify in Step 4; if it errors, keep one `rng()` use or prefix `_`.)

- [ ] **Step 2: In `makeShell`, after the solid walls, add material accents on the front**

After the existing front-wall segments + lintel, add: a stacked-stone base course
along the full front ground floor, a full-height stone ENTRY PILLAR on the left
return (between the door and the left segment), and a vertical wood-slat accent
panel on the right segment. Derive all x from `segW`, `DOOR_W`, `W`:

```ts
      // Stacked-stone base course along the front ground floor.
      parts.push(tintedBox(W, FLOOR_H * 0.5, 0.12, 0, FLOOR_H * 0.25, D / 2 + 0.06, STONE));
      // Full-height stone entry pillar just left of the door gap.
      const pillarW = 1.4;
      const pillarCX = -(DOOR_W / 2 + pillarW / 2);
      parts.push(tintedBox(pillarW, totalH, 0.5, pillarCX, totalH / 2, D / 2 + 0.1, STONE));
      // Vertical wood-slat accent panel on the right front segment (battens).
      const slatPanelW = segW * 0.8;
      const slatPanelCX = DOOR_W / 2 + segW / 2;
      const battenN = 7;
      for (let b = 0; b < battenN; b++) {
        const bx = slatPanelCX - slatPanelW / 2 + slatPanelW * (b + 0.5) / battenN;
        parts.push(tintedBox(slatPanelW / battenN - 0.04, totalH * 0.9, 0.1, bx, totalH * 0.45, D / 2 + 0.08, WOOD));
      }
```

- [ ] **Step 3: Replace the front window stack with a double-height glass bay**

Remove the three `addWindow(parts, "+z", …)` front-window calls AND the old balcony
block (the `balW/balD/balY/balZ` rail section). Add a centered-right glazed bay
spanning both storeys over a warm interior backing, divided by mullions. Derive from
`FLOOR_H`/`totalH`/`segW`:

```ts
      // DOUBLE-HEIGHT GLASS BAY on the front-right: warm interior backing + dark
      // mullion grid + glass, spanning both storeys. Centered on the right segment.
      const bayCX = DOOR_W / 2 + segW / 2;
      const bayW = segW * 0.92, bayH = totalH * 0.86, bayCY = bayH / 2 + 0.3;
      const bayZ = D / 2;
      parts.push(tintedBox(bayW + 0.2, bayH + 0.2, 0.06, bayCX, bayCY, bayZ + 0.04, PALETTE.shopGlow)); // lit interior
      parts.push(tintedBox(bayW, bayH, 0.05, bayCX, bayCY, bayZ + 0.09, PALETTE.glassDark));            // glass
      // Mullion grid: 3 verticals + 3 horizontals.
      for (let m = 1; m < 4; m++) {
        const mx = bayCX - bayW / 2 + bayW * m / 4;
        parts.push(tintedBox(0.07, bayH, 0.05, mx, bayCY, bayZ + 0.12, PALETTE.winFrame));
      }
      for (let m = 1; m < 4; m++) {
        const my = (bayCY - bayH / 2) + bayH * m / 4;
        parts.push(tintedBox(bayW, 0.07, 0.05, bayCX, my, bayZ + 0.12, PALETTE.winFrame));
      }
      // Bay outer frame.
      parts.push(tintedBox(bayW + 0.16, bayH + 0.16, 0.04, bayCX, bayCY, bayZ + 0.07, PALETTE.winFrame));
```

Keep the left ground-floor window flanking the door (it sits over the stone base).
Replace its single call so it remains on the left only:

```ts
      const winW = 1.2, winH = 1.3;
      const row1Y = FLOOR_H * 0.55;
      const row2Y = FLOOR_H + FLOOR_H * 0.55;
      const frontOff = DOOR_W / 2 + segW / 2;
      addWindow(parts, "+z", -frontOff, row1Y, winW, winH, PALETTE.glass); // left of door, ground
      addWindow(parts, "+z", -frontOff, row2Y, winW, winH, PALETTE.glassDark); // left, upper
```

Keep the existing right (+x), back (-z), and left (-x) window loops UNCHANGED.

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean. (If `rng`/`mulberry32` now unused and it errors, keep `const rng = mulberry32(...)` and ensure at least one `rng()` call remains in `makeFrontYard`/elsewhere, or it is already used — verify by reading the error.)

- [ ] **Step 5: Commit**

```bash
git add src/world/catalog/playerHouse.ts
git commit -m "feat(player-house): villa facade — stone pillar, wood slats, glass bay"
```

---

### Task 3: Modern single-bay garage door

**Files:**
- Modify: `src/world/catalog/playerHouse.ts` — `makeGarage()` door block (lines ~263-285).

**Interfaces:**
- Consumes: `GAR_W, GAR_H, garCX, garCZ, T, frontZ`, `PALETTE.rollDoor`, `villaWood`, `glassDark`, `TRIM`.
- Produces: `makeGarage()` returns `{ parts, colliders }` — colliders UNCHANGED.

- [ ] **Step 1: Replace the 3-bay door loop with one wide sectional door + wood-slat surround**

Replace the BAYS loop, mullion loop, and door-surround line with:

```ts
      // ONE wide modern sectional door: horizontal slats + a thin top window band,
      // framed by vertical wood-slat cladding on the surround.
      const slatCount = 6;
      const doorAreaH = GAR_H - 0.4;
      const slatH = doorAreaH / slatCount;
      const doorFaceZ = frontZ + 0.05;
      const doorW = GAR_W - 0.5;
      for (let s = 0; s < slatCount; s++) {
        const cy = 0.2 + slatH * (s + 0.5);
        // Top slat reads as a window band (glassDark); the rest are charcoal panels.
        const col = s === slatCount - 1 ? PALETTE.glassDark : PALETTE.rollDoor;
        parts.push(tintedBox(doorW, slatH - 0.04, 0.06, garCX, cy, doorFaceZ, col));
      }
      // Vertical wood-slat cladding on the surround (left + right returns of the door).
      const surroundW = (GAR_W - doorW) / 2;
      for (const sx of [-1, 1] as const) {
        const cx = garCX + sx * (doorW / 2 + surroundW / 2);
        const battenN = 4;
        for (let b = 0; b < battenN; b++) {
          const bx = cx - surroundW / 2 + surroundW * (b + 0.5) / battenN;
          parts.push(tintedBox(surroundW / battenN - 0.03, GAR_H, 0.09, bx, GAR_H / 2, doorFaceZ, PALETTE.villaWood));
        }
      }
      // Door head trim.
      parts.push(tintedBox(GAR_W + 0.1, 0.12, 0.1, garCX, doorAreaH + 0.2, doorFaceZ, TRIM));
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/world/catalog/playerHouse.ts
git commit -m "feat(player-house): modern single-bay garage door + wood-slat surround"
```

---

### Task 4: Asymmetric shed roofs + stone chimney

**Files:**
- Modify: `src/world/catalog/playerHouse.ts` — `makeRoof()` (lines ~301-379).

**Interfaces:**
- Consumes: `W, D, T, totalH, GAR_W, GAR_D, garCX, garCZ, GAR_H`, `PALETTE.villaRoof`, `villaSoffit`, `villaStone`, `bodyColor`.
- Produces: `makeRoof()` returns `{ parts }`.

- [ ] **Step 1: Replace the gable/dormer/chimney body with two stepped mono-pitch slabs**

Replace the entire main-block roof section (fascia band, back slope, front slope,
ridge cap, gable triangles, chimney, dormers) — KEEP the garage shed-roof block at
the end — with:

```ts
      const eave = 0.45;                 // deep overhang
      const slabThick = 0.24;
      // Split the footprint front/back into a HIGHER slab (back, -z, over entry/glass
      // bay) and a LOWER slab (front, +z) — staggered modern shed silhouette.
      const splitZ = 0;                  // ridge line along x at mid-depth
      // HIGH slab covers z in [-D/2, splitZ], rises toward -z.
      {
        const apexHi = 1.6, runHi = D / 2 + eave;
        const ang = Math.atan2(apexHi, runHi);
        const len = Math.sqrt(runHi * runHi + apexHi * apexHi);
        const g = new THREE.BoxGeometry(W + eave * 2, slabThick, len);
        g.rotateX(-ang);
        g.translate(0, totalH + 0.1 + apexHi / 2, -(D / 2 + eave) / 2 + eave / 2);
        parts.push(tintGeo(g, roofColor));
        // soffit underside
        const s = new THREE.BoxGeometry(W + eave * 2, 0.06, len);
        s.rotateX(-ang);
        s.translate(0, totalH + 0.04 + apexHi / 2, -(D / 2 + eave) / 2 + eave / 2);
        parts.push(tintGeo(s, PALETTE.villaSoffit));
      }
      // LOW slab covers z in [splitZ, D/2], a shallower mono-pitch falling toward +z,
      // its top edge a step below the HIGH slab's ridge.
      {
        const apexLo = 0.9, runLo = D / 2 + eave;
        const ang = Math.atan2(apexLo, runLo);
        const len = Math.sqrt(runLo * runLo + apexLo * apexLo);
        const g = new THREE.BoxGeometry(W * 0.62 + eave * 2, slabThick, len);
        g.rotateX(ang);
        g.translate(W * 0.19, totalH - 0.2 + apexLo / 2, (D / 2 + eave) / 2 - eave / 2);
        parts.push(tintGeo(g, roofColor));
        const s = new THREE.BoxGeometry(W * 0.62 + eave * 2, 0.06, len);
        s.rotateX(ang);
        s.translate(W * 0.19, totalH - 0.26 + apexLo / 2, (D / 2 + eave) / 2 - eave / 2);
        parts.push(tintGeo(s, PALETTE.villaSoffit));
      }
      // Parapet-ish fascia band capping the wall top where the slabs meet.
      parts.push(tintedBox(W + eave * 2, 0.16, 0.2, 0, totalH + 0.08, splitZ, PALETTE.villaSoffit));

      // Stacked-stone CHIMNEY on the right (+x, toward the back), through the high slab.
      const chX = W * 0.32, chZ = -D * 0.18;
      const chBottom = totalH - 0.3, chTop = totalH + 2.4;
      const chH = chTop - chBottom;
      parts.push(tintedBox(0.8, chH, 0.8, chX, chBottom + chH / 2, chZ, PALETTE.villaStone));
      parts.push(tintedBox(0.94, 0.16, 0.94, chX, chTop + 0.08, chZ, PALETTE.villaSoffit));
```

- [ ] **Step 2: Recolor the garage shed roof**

The garage shed slab already uses `roofColor` (now `villaRoof`) — no change needed.
Confirm the garage fascia band uses `fascia`; recolor it to `PALETTE.villaSoffit`:

```ts
      parts.push(tintedBox(GAR_W + garEave * 2, 0.12, GAR_D + garEave * 2, garCX, GAR_H + 0.06, garCZ, PALETTE.villaSoffit));
```

(Remove the now-unused `const fascia = 0xece7da;` if TypeScript flags it; otherwise
leave it.)

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add src/world/catalog/playerHouse.ts
git commit -m "feat(player-house): asymmetric shed roofs + stacked-stone chimney"
```

---

### Task 5: New upper terrace + pergola

**Files:**
- Modify: `src/world/catalog/playerHouse.ts` — add `makeTerrace()` and include it in `ASSEMBLE`.

**Interfaces:**
- Consumes: `W, D, FLOOR_H, T`, `PALETTE.villaDeck`, `villaRail`, `villaPergola`, `villaWood`.
- Produces: `makeTerrace(): Piece` returning `{ parts }` (NO colliders — head-height, not walkable).

- [ ] **Step 1: Add `makeTerrace` before `// ── ASSEMBLE ──`**

```ts
    // ════════════════════════════════════════════════════════════════════════
    // makeTerrace — upper front-right terrace + wood pergola (visual; no collider)
    // ════════════════════════════════════════════════════════════════════════
    function makeTerrace(): Piece {
      const parts: THREE.BufferGeometry[] = [];
      const deckW = W * 0.34, deckD = 2.6;
      const deckCX = W / 2 - deckW / 2 - 0.4;          // hug the right (+x) side
      const deckY = FLOOR_H;                            // 2nd-floor level
      const deckZ = D / 2 + deckD / 2;                  // projects forward of the façade
      // Deck floor.
      parts.push(tintedBox(deckW, 0.16, deckD, deckCX, deckY + 0.08, deckZ, PALETTE.villaDeck));
      // Two slim support posts down to the ground (believable overhang).
      for (const sx of [-1, 1] as const) {
        const px = deckCX + sx * (deckW / 2 - 0.2);
        parts.push(tintedBox(0.18, deckY, 0.18, px, deckY / 2, deckZ + deckD / 2 - 0.2, PALETTE.villaWood));
      }
      // Near-black metal rail: front + two sides (vertical balusters implied by a slim bar).
      const railH = 0.55, railY = deckY + 0.16 + railH / 2;
      parts.push(tintedBox(deckW, railH, 0.06, deckCX, railY, deckZ + deckD / 2, PALETTE.villaRail));
      parts.push(tintedBox(0.06, railH, deckD, deckCX - deckW / 2, railY, deckZ, PALETTE.villaRail));
      parts.push(tintedBox(0.06, railH, deckD, deckCX + deckW / 2, railY, deckZ, PALETTE.villaRail));
      // Baluster ticks along the front rail.
      const balN = 8;
      for (let b = 0; b < balN; b++) {
        const bx = deckCX - deckW / 2 + deckW * (b + 0.5) / balN;
        parts.push(tintedBox(0.04, railH, 0.04, bx, railY, deckZ + deckD / 2, PALETTE.villaRail));
      }
      // PERGOLA over the right end: 2 posts + horizontal louvers.
      const pergY = deckY + 0.16;
      const pergH = 2.2, pergW = deckW * 0.5, pergCX = deckCX + deckW / 2 - pergW / 2;
      for (const sx of [-1, 1] as const) {
        const px = pergCX + sx * (pergW / 2 - 0.1);
        parts.push(tintedBox(0.12, pergH, 0.12, px, pergY + pergH / 2, deckZ - deckD / 2 + 0.3, PALETTE.villaPergola));
        parts.push(tintedBox(0.12, pergH, 0.12, px, pergY + pergH / 2, deckZ + deckD / 2 - 0.3, PALETTE.villaPergola));
      }
      // Louvers (horizontal slats across the top).
      const louvN = 6;
      for (let l = 0; l < louvN; l++) {
        const lz = deckZ - deckD / 2 + 0.3 + (deckD - 0.6) * l / (louvN - 1);
        parts.push(tintedBox(pergW, 0.08, 0.16, pergCX, pergY + pergH, lz, PALETTE.villaPergola));
      }
      // One potted plant on the deck.
      const potX = deckCX - deckW / 2 + 0.5, potZ = deckZ + deckD / 2 - 0.5;
      parts.push(tintedBox(0.34, 0.34, 0.34, potX, deckY + 0.16 + 0.17, potZ, 0xb5642f));
      parts.push(tintedBox(0.3, 0.36, 0.3, potX, deckY + 0.16 + 0.52, potZ, 0x3f8f3a));
      return { parts };
    }
```

- [ ] **Step 2: Include the terrace in the assemble block**

In `// ── ASSEMBLE ──`, add `const terrace = makeTerrace();` and spread
`...terrace.parts` into `allParts`:

```ts
    const shell = makeShell();
    const garage = makeGarage();
    const roof = makeRoof();
    const interior = makeInterior();
    const yard = makePorchAndYard();
    const front = makeFrontYard();
    const terrace = makeTerrace();

    const allParts: THREE.BufferGeometry[] = [
      ...shell.parts, ...garage.parts, ...roof.parts, ...interior.parts,
      ...yard.parts, ...front.parts, ...terrace.parts,
    ];
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add src/world/catalog/playerHouse.ts
git commit -m "feat(player-house): upper terrace + wood pergola"
```

---

### Task 6: Final gate — full build

**Files:** none (verification only).

- [ ] **Step 1: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 2: Production build**

Run: `npx vite build`
Expected: build succeeds (exit 0).

- [ ] **Step 3: Hand back the branch**

Summarize: built / assumed / remains / gate results. Do NOT merge or deploy
(this is already master per the user's standing instruction; just stop and let the
user look in-game).

## Self-Review

- **Spec coverage:** palette (T1), facade materials + glass bay (T2), garage door
  (T3), shed roofs + chimney (T4), terrace + pergola (T5), gate (T6). Interior/yard
  kept (no task — intentional). Footprint constants untouched. All spec sections covered.
- **Placeholder scan:** every code step shows real code; no TBD/TODO.
- **Type consistency:** `makeTerrace(): Piece` matches the `Piece` interface used by
  the other sub-builders; `terrace.parts` spread matches `Piece.parts: THREE.BufferGeometry[]`.
  `PALETTE.villa*` names match Task 1 verbatim.
