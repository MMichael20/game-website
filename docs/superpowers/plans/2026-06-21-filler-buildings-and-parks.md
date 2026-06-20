# Filler Buildings & Parks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add decorative filler buildings (mid-rise masonry blocks + tall glass skyline towers) and a park composite, then place them so the city reads as a continuous street matching the voxel-city reference art.

**Architecture:** Three new catalog objects following the registry contract (`defineObject(kind, { params, build })`, local space, deterministic). `fillerBuilding` is a solid block with baked opaque-voxel facade detail. `fountain` wraps the existing `makeFountain()` helper as a placeable kind. `park` is a composite that composes existing `tree`/`bench`/`lamp`/`flower`/`fountain` kinds via `buildObject` + `applyTransform`. Finally `map.ts` places them clear of the road and spawns.

**Tech Stack:** TypeScript, Three.js, the project's `src/world` registry/manifest/engine, voxel helpers (`tintedBox`, `mergeTinted`, `tintedMesh`, `cylinderY`, etc.).

## Global Constraints

- Local space: centered x=z=0, base y=0, FRONT faces +z, ~1u = 1m. (CLAUDE.md)
- Deterministic only: NO `Math.random()` / `Date.now()` / argless `new Date()`. Use `mulberry32(seed)` from `src/world/rng.ts` for cosmetic variation only. (CLAUDE.md)
- Derive every child/detail position from real dimensions — NO hand-typed magic offsets. (CLAUDE.md PITFALL 3)
- Rotation only in {0, 90, 180, 270} degrees. (CLAUDE.md)
- NO tests written or run; NO dev server; NO screenshots. The ONLY verification is `npx tsc --noEmit` then `npx vite build`. (CLAUDE.md PITFALLS 1 & 2)
- Reuse existing objects/helpers; one `build()` returns all facets `{ mesh, colliders?, obstacles? }`. (CLAUDE.md facet contract)
- Colors come from `PALETTE` / `BUILDING_COLORS` in `src/world/palette.ts`.

---

### Task 1: `fountain` catalog kind

**Files:**
- Modify: `src/world/catalog/primitives.ts` (append a new `defineObject("fountain", …)`)

**Interfaces:**
- Consumes: `makeFountain({ r, tiers })` from `src/world/objects/fountain.ts` (returns a merged `THREE.BufferGeometry`); `tintedMesh` from `src/world/objects/voxel`.
- Produces: catalog kind `"fountain"`, params `{ r: number; tiers: number }` (defaults `r:1.4, tiers:2`), returning `{ mesh, colliders:[box], obstacles:[rect] }`.

- [ ] **Step 1: Add the import** — at the top of `primitives.ts`, add `import { makeFountain } from "../objects/fountain";`.

- [ ] **Step 2: Append the definition** at the end of the file:

```ts
// ---------------------------------------------------------------------------
// fountain — placeable wrapper around the makeFountain() helper
// ---------------------------------------------------------------------------

defineObject("fountain", {
  params: { r: 1.4, tiers: 2 },
  build(p: { r: number; tiers: number }) {
    const mesh = tintedMesh(makeFountain({ r: p.r, tiers: p.tiers }));
    mesh.castShadow = true;
    // Basin is ~0.22m tall; collider is a low box covering the basin footprint.
    const basinH = 0.22;
    return {
      mesh,
      colliders: [{ x: 0, y: basinH / 2, z: 0, hx: p.r, hy: basinH / 2, hz: p.r }],
      obstacles: [{ x: 0, z: 0, w: p.r * 2, d: p.r * 2 }],
    };
  },
});
```

- [ ] **Step 3: Verify** — `npx tsc --noEmit`. Expected: no new errors.

- [ ] **Step 4: Commit** — `git add src/world/catalog/primitives.ts && git commit -m "feat(world): register fountain as a placeable catalog kind"`

---

### Task 2: `fillerBuilding` catalog object

**Files:**
- Create: `src/world/catalog/fillerBuilding.ts`
- Modify: `src/world/catalog/index.ts` (add `import "./fillerBuilding";`)

**Interfaces:**
- Consumes: `defineObject` from `../system/registry`; `tintedBox, mergeTinted, tintedMesh` from `../objects/voxel`; `makeAwning` from `../objects/awning`; `PALETTE, BUILDING_COLORS` from `../palette`; `mulberry32` from `../rng`.
- Produces: catalog kind `"fillerBuilding"` with params:
  `{ w:number; d:number; stories:number; storyH:number; bodyColor:number; style:"masonry"|"glassTower"; ground:"plain"|"storefront"|"none"; awningColor:number; roofUnit:boolean; seed:number }`
  defaults `{ w:10, d:9, stories:3, storyH:3.0, bodyColor:BUILDING_COLORS[0], style:"masonry", ground:"plain", awningColor:PALETTE.awningBlue, roofUnit:true, seed:1 }`.
  Returns `{ mesh, colliders:[oneSolidBox], obstacles:[oneRect] }`.

- [ ] **Step 1: Create the file** with this content. All window/detail positions are computed from dimensions (PITFALL 3); windows are opaque merged boxes.

```ts
// src/world/catalog/fillerBuilding.ts
//
// A decorative multi-story block with NO walk-in interior — pure backdrop for
// the streetwall / skyline. Facade windows are baked opaque vertex-colored
// boxes (cheap; flat stylized look). Two styles:
//   "masonry"   — warm body, punched windows + cornice, optional ground awning.
//   "glassTower"— cool body, uniform curtain-wall grid, flat parapet.
//
// LOCAL space: centered x=z=0, base y=0, FRONT +z, ~1u=1m. Deterministic.

import * as THREE from "three";
import { defineObject } from "../system/registry";
import { tintedBox, mergeTinted, tintedMesh } from "../objects/voxel";
import { makeAwning } from "../objects/awning";
import { PALETTE, BUILDING_COLORS } from "../palette";
import { mulberry32 } from "../rng";

interface FillerParams {
  w: number;
  d: number;
  stories: number;
  storyH: number;
  bodyColor: number;
  style: "masonry" | "glassTower";
  ground: "plain" | "storefront" | "none";
  awningColor: number;
  roofUnit: boolean;
  seed: number;
}

const WIN_PER_M = 1 / 2.2;   // ~one window column per 2.2 m of facade
const WALL_PROUD = 0.06;     // how far frames/windows sit proud of the wall

// Build a window grid onto one face. `axis` picks the facade plane:
//   "+z"/"-z" → window plane at z=±d/2, spanning x; "+x"/"-x" → at x=±w/2, spanning z.
function addWindows(
  parts: THREE.BufferGeometry[],
  opts: {
    axis: "+z" | "-z" | "+x" | "-x";
    spanW: number;      // facade width to fill (x for ±z faces, z for ±x faces)
    w: number; d: number;
    yStart: number; yEnd: number; rows: number;
    glassA: number; glassB: number; frame: number;
    bigCells: boolean;  // glassTower → larger cells, thinner frame
  },
) {
  const { axis, spanW, w, d, yStart, yEnd, rows } = opts;
  const cols = Math.max(2, Math.round(spanW * WIN_PER_M));
  const cellW = spanW / cols;
  const winW = cellW * (opts.bigCells ? 0.82 : 0.62);
  const rowH = (yEnd - yStart) / rows;
  const winH = rowH * (opts.bigCells ? 0.78 : 0.58);
  const framePad = opts.bigCells ? 0.05 : 0.08;

  for (let r = 0; r < rows; r++) {
    const cy = yStart + rowH * (r + 0.5);
    for (let c = 0; c < cols; c++) {
      const off = -spanW / 2 + cellW * (c + 0.5);
      const glass = (r + c) % 2 === 0 ? opts.glassA : opts.glassB;
      // frame (slightly bigger, proud), then glass (inset a hair more)
      const fw = winW + framePad;
      const fh = winH + framePad;
      if (axis === "+z" || axis === "-z") {
        const zf = axis === "+z" ? d / 2 + WALL_PROUD : -d / 2 - WALL_PROUD;
        const zg = axis === "+z" ? d / 2 + WALL_PROUD * 1.4 : -d / 2 - WALL_PROUD * 1.4;
        parts.push(tintedBox(fw, fh, 0.05, off, cy, zf, opts.frame));
        parts.push(tintedBox(winW, winH, 0.05, off, cy, zg, glass));
      } else {
        const xf = axis === "+x" ? w / 2 + WALL_PROUD : -w / 2 - WALL_PROUD;
        const xg = axis === "+x" ? w / 2 + WALL_PROUD * 1.4 : -w / 2 - WALL_PROUD * 1.4;
        parts.push(tintedBox(0.05, fh, fw, xf, cy, off, opts.frame));
        parts.push(tintedBox(0.05, winH, winW, xg, cy, off, glass));
      }
    }
  }
}

defineObject("fillerBuilding", {
  params: {
    w: 10, d: 9, stories: 3, storyH: 3.0,
    bodyColor: BUILDING_COLORS[0], style: "masonry",
    ground: "plain", awningColor: PALETTE.awningBlue,
    roofUnit: true, seed: 1,
  } as FillerParams,
  build(p: FillerParams) {
    const { w, d, stories, storyH } = p;
    const totalH = stories * storyH;
    const rng = mulberry32(p.seed >>> 0);
    const isTower = p.style === "glassTower";

    const opaque: THREE.BufferGeometry[] = [];

    // Body
    opaque.push(tintedBox(w, totalH, d, 0, totalH / 2, 0, p.bodyColor));

    // Base plinth (proud band at the bottom)
    const plinthH = 0.5;
    opaque.push(tintedBox(w + 0.12, plinthH, d + 0.12, 0, plinthH / 2, 0, PALETTE.stoneBase));

    // Window band vertical extent: skip the ground floor when it has its own
    // storefront treatment, otherwise windows cover all floors.
    const groundIsShop = p.ground === "storefront" && !isTower;
    const winYStart = groundIsShop ? storyH + 0.3 : plinthH + 0.4;
    const winYEnd = totalH - 0.4;
    const winRows = groundIsShop ? stories - 1 : stories;

    const glassA = isTower ? PALETTE.officeGlass : PALETTE.glass;
    const glassB = isTower ? PALETTE.glassDark : PALETTE.glassDark;
    const frame = PALETTE.frame;
    const bigCells = isTower;

    if (winRows > 0) {
      for (const axis of ["+z", "+x", "-x"] as const) {
        addWindows(opaque, {
          axis, spanW: axis === "+z" ? w : d, w, d,
          yStart: winYStart, yEnd: winYEnd, rows: winRows,
          glassA, glassB, frame, bigCells,
        });
      }
    }

    // Top: cornice (masonry) or flat parapet (tower)
    if (isTower) {
      opaque.push(tintedBox(w + 0.1, 0.4, d + 0.1, 0, totalH + 0.2, 0, PALETTE.roofCap));
    } else {
      opaque.push(tintedBox(w + 0.3, 0.4, d + 0.3, 0, totalH + 0.05, 0, PALETTE.cornice));
    }
    // Flat roof slab
    opaque.push(tintedBox(w, 0.2, d, 0, totalH + 0.1, 0, PALETTE.roofCap));

    // Rooftop unit (small box for silhouette), placed off-center deterministically.
    if (p.roofUnit) {
      const ux = (rng() - 0.5) * (w * 0.4);
      const uz = (rng() - 0.5) * (d * 0.4);
      opaque.push(tintedBox(w * 0.28, 0.9, d * 0.28, ux, totalH + 0.65, uz, PALETTE.steelDark));
    }

    const group = new THREE.Group();
    group.add(tintedMesh(mergeTinted(opaque)));
    (group.children[0] as THREE.Mesh).castShadow = true;
    (group.children[0] as THREE.Mesh).receiveShadow = true;

    // Ground-floor storefront band + awning (masonry only).
    if (groundIsShop) {
      const bandH = storyH * 0.7;
      const bandParts: THREE.BufferGeometry[] = [];
      // recessed dark glass band across the front
      bandParts.push(tintedBox(w - 0.6, bandH, 0.1, 0, plinthH + bandH / 2, d / 2 + 0.02, PALETTE.glassDark));
      // base trim under it
      bandParts.push(tintedBox(w - 0.4, 0.25, 0.16, 0, plinthH + 0.12, d / 2 + 0.04, PALETTE.curb));
      group.add(tintedMesh(mergeTinted(bandParts)));
      // striped awning at the band top, protruding +z
      const awning = tintedMesh(
        makeAwning({ w: w - 0.6, colorA: p.awningColor, colorB: PALETTE.awningStripe, depth: 1.0 }),
      );
      awning.position.set(0, plinthH + bandH, d / 2 + 0.05);
      awning.castShadow = true;
      group.add(awning);
    }

    return {
      mesh: group,
      colliders: [{ x: 0, y: totalH / 2, z: 0, hx: w / 2, hy: totalH / 2, hz: d / 2 }],
      obstacles: [{ x: 0, z: 0, w, d }],
    };
  },
});
```

- [ ] **Step 2: Register the module** — in `src/world/catalog/index.ts`, add `import "./fillerBuilding";` after the existing imports, and note it in the side-effect list.

- [ ] **Step 3: Verify** — `npx tsc --noEmit`. Expected: no errors.

- [ ] **Step 4: Commit** — `git add src/world/catalog/fillerBuilding.ts src/world/catalog/index.ts && git commit -m "feat(world): add fillerBuilding (masonry + glassTower backdrop blocks)"`

---

### Task 3: `park` composite object

**Files:**
- Create: `src/world/catalog/park.ts`
- Modify: `src/world/catalog/index.ts` (add `import "./park";`)

**Interfaces:**
- Consumes: `defineObject, buildObject` from `../system/registry`; `applyTransform` from `../system/transform`; `tintedBox, mergeTinted, tintedMesh` from `../objects/voxel`; `PALETTE` from `../palette`; `mulberry32` from `../rng`; types `ObjectResult, Box, Rect` from `../system/types`. Reuses catalog kinds `"tree"`, `"bench"`, `"lamp"`, `"flower"`, `"fountain"` (Task 1).
- Produces: catalog kind `"park"`, params `{ w:number; d:number; fountain:boolean; seed:number }` defaults `{ w:26, d:20, fountain:true, seed:1 }`. Returns aggregated `{ mesh, colliders, obstacles }`.

- [ ] **Step 1: Create the file.** Use a local `compose()` (mirroring `stores.ts`) to merge child `ObjectResult`s; derive bed rects from `w`/`d`.

```ts
// src/world/catalog/park.ts
//
// A paved plaza with a 2×2 grid of stone-bordered grass beds, a central
// fountain, perimeter lamps, path benches, and trees/flowers in the beds.
// Composed from existing catalog kinds via buildObject + applyTransform.
//
// LOCAL space: centered x=z=0, base y=0, ~1u=1m. Deterministic.

import * as THREE from "three";
import { defineObject, buildObject } from "../system/registry";
import { applyTransform } from "../system/transform";
import { tintedBox, mergeTinted, tintedMesh } from "../objects/voxel";
import { PALETTE } from "../palette";
import { mulberry32 } from "../rng";
import type { ObjectResult, Box, Rect } from "../system/types";

function compose(parts: ObjectResult[]): ObjectResult {
  const group = new THREE.Group();
  const colliders: Box[] = [];
  const obstacles: Rect[] = [];
  for (const p of parts) {
    group.add(p.mesh);
    if (p.colliders) colliders.push(...p.colliders);
    if (p.obstacles) obstacles.push(...p.obstacles);
  }
  return { mesh: group, colliders, obstacles };
}

interface ParkParams {
  w: number;
  d: number;
  fountain: boolean;
  seed: number;
}

const FLOWER_COLORS = ["red", "yellow", "white"] as const;

defineObject("park", {
  params: { w: 26, d: 20, fountain: true, seed: 1 } as ParkParams,
  build(p: ParkParams) {
    const { w, d } = p;
    const rng = mulberry32(p.seed >>> 0);
    const parts: ObjectResult[] = [];

    // Paved plaza floor (thin slab over the grass).
    const floor: ObjectResult = {
      mesh: tintedMesh(tintedBox(w, 0.06, d, 0, 0.03, 0, PALETTE.sidewalk)),
    };
    (floor.mesh as THREE.Mesh).receiveShadow = true;
    parts.push(floor);

    // Bed grid geometry. Central cross-path of PATH wide; perimeter margin MARGIN.
    const PATH = 3.0;
    const MARGIN = 1.6;
    const bedW = (w - PATH - MARGIN * 2) / 2;
    const bedD = (d - PATH - MARGIN * 2) / 2;
    const bedCX = (PATH / 2 + bedW / 2);
    const bedCZ = (PATH / 2 + bedD / 2);

    for (const sx of [-1, 1] as const) {
      for (const sz of [-1, 1] as const) {
        const cx = sx * bedCX;
        const cz = sz * bedCZ;
        // Stone rim + inset grass top, built as one merged mesh per bed.
        const rimH = 0.32;
        const bedParts = [
          tintedBox(bedW, rimH, bedD, cx, rimH / 2, cz, PALETTE.stoneBase),
          tintedBox(bedW - 0.5, 0.12, bedD - 0.5, cx, rimH + 0.04, cz, PALETTE.parkGrass),
        ];
        const bedMesh = tintedMesh(mergeTinted(bedParts));
        bedMesh.receiveShadow = true;
        parts.push({
          mesh: bedMesh,
          colliders: [{ x: cx, y: rimH / 2, z: cz, hx: bedW / 2, hy: rimH / 2, hz: bedD / 2 }],
          obstacles: [{ x: cx, z: cz, w: bedW, d: bedD }],
        });
        // One tree near the bed's outer corner.
        const tree = buildObject("tree", {});
        parts.push(applyTransform(tree, { x: cx + sx * bedW * 0.22, z: cz + sz * bedD * 0.22, rot: 0 }));
        // A few flowers in the bed (color chosen by rng; positions derived).
        for (let i = 0; i < 3; i++) {
          const fx = cx + (i - 1) * (bedW * 0.22);
          const fz = cz - sz * bedD * 0.18;
          const color = FLOWER_COLORS[Math.floor(rng() * FLOWER_COLORS.length)];
          const flower = buildObject("flower", { color, height: 0.34 });
          const placed = applyTransform(flower, { x: fx, z: fz, rot: 0 });
          // lift flowers onto the grass top
          placed.mesh.position.y += 0.36;
          parts.push(placed);
        }
      }
    }

    // Central fountain.
    if (p.fountain) {
      const fountain = buildObject("fountain", { r: 1.4, tiers: 2 });
      parts.push(applyTransform(fountain, { x: 0, z: 0, rot: 0 }));
    }

    // Perimeter lamps at the four corners (inside the margin).
    const lampX = w / 2 - 0.8;
    const lampZ = d / 2 - 0.8;
    for (const sx of [-1, 1] as const) {
      for (const sz of [-1, 1] as const) {
        const lamp = buildObject("lamp", {});
        parts.push(applyTransform(lamp, { x: sx * lampX, z: sz * lampZ, rot: 0 }));
      }
    }

    // Benches flanking the central vertical path, facing outward along z.
    for (const sz of [-1, 1] as const) {
      const bench = buildObject("bench", {});
      parts.push(applyTransform(bench, { x: 0, z: sz * (PATH / 2 + 0.4), rot: sz === 1 ? 0 : 180 }));
    }

    return compose(parts);
  },
});
```

- [ ] **Step 2: Register the module** — in `src/world/catalog/index.ts`, add `import "./park";`.

- [ ] **Step 3: Verify** — `npx tsc --noEmit`. Expected: no errors. (Confirms `ObjectResult/Box/Rect` import paths and `applyTransform`/`buildObject` signatures are correct.)

- [ ] **Step 4: Commit** — `git add src/world/catalog/park.ts src/world/catalog/index.ts && git commit -m "feat(world): add park composite (beds, fountain, trees, benches, lamps)"`

---

### Task 4: Place fillers, towers & a park in the map

**Files:**
- Modify: `src/world/map.ts`

**Interfaces:**
- Consumes: catalog kinds `"fillerBuilding"`, `"park"` and existing `lot()` / raw placements. Existing footprints (from map.ts comments): phone shop x∈[-23,-1] front z=-9; restaurant x∈[5,27] front z≈-12; road z∈[-5,1]; spawns (0,8)/(12,10); ground 220×220.
- Produces: extra `Placement` entries appended to `MAP`.

- [ ] **Step 1: Append placements** to the `MAP` array (before the closing `];`). Coordinates keep a clear corridor around the road and both spawns; the park sits to the south-west, well left of spawn.

```ts
  // ── Filler backdrop ──────────────────────────────────────────────────────
  // North streetwall: masonry blocks flanking the two real stores, on the
  // building line (front face +z ≈ z=-9), so the street reads as continuous.
  { kind: "fillerBuilding", x: -34, z: -16, params: { w: 12, d: 10, stories: 3, bodyColor: 0xe07a5f, ground: "storefront", awningColor: 0xc0392b, seed: 11 } },
  { kind: "fillerBuilding", x: -47, z: -16, params: { w: 11, d: 10, stories: 4, bodyColor: 0xe9c46a, seed: 12 } },
  { kind: "fillerBuilding", x: 39, z: -17, params: { w: 12, d: 11, stories: 3, bodyColor: 0x84b06a, ground: "storefront", awningColor: 0x2980b9, seed: 13 } },
  { kind: "fillerBuilding", x: 52, z: -17, params: { w: 11, d: 11, stories: 4, bodyColor: 0xc98ab0, seed: 14 } },

  // Skyline towers: tall cool glass blocks set well back as a backdrop.
  { kind: "fillerBuilding", x: -30, z: -44, params: { w: 14, d: 14, stories: 7, style: "glassTower", bodyColor: 0x6aa9c9, roofUnit: false, seed: 21 } },
  { kind: "fillerBuilding", x: 0, z: -48, params: { w: 16, d: 16, stories: 8, style: "glassTower", bodyColor: 0x7fb5d6, roofUnit: false, seed: 22 } },
  { kind: "fillerBuilding", x: 32, z: -44, params: { w: 14, d: 14, stories: 6, style: "glassTower", bodyColor: 0x9ac6e0, roofUnit: false, seed: 23 } },

  // South streetwall: a couple of blocks across the road, facing -z (rot 180),
  // set back behind the spawn corridor.
  { kind: "fillerBuilding", x: -50, z: 26, rot: 180, params: { w: 12, d: 10, stories: 3, bodyColor: 0xf2c14e, seed: 31 } },
  { kind: "fillerBuilding", x: 45, z: 26, rot: 180, params: { w: 12, d: 10, stories: 4, bodyColor: 0xd96c5f, ground: "storefront", awningColor: 0xc0392b, seed: 32 } },

  // Park plaza: south-west, clear of the (0,8)/(12,10) spawn corridor.
  { kind: "park", x: -30, z: 18, params: { w: 26, d: 20, fountain: true, seed: 5 } },
```

- [ ] **Step 2: Verify** — `npx tsc --noEmit`. Expected: no errors.

- [ ] **Step 3: Commit** — `git add src/world/map.ts && git commit -m "feat(world): place filler streetwall, skyline towers & a park plaza"`

---

### Task 5: Final gate

- [ ] **Step 1:** `npx tsc --noEmit` — expect clean.
- [ ] **Step 2:** `npx vite build` — expect a successful build (no errors).
- [ ] **Step 3:** Report results; hand back the branch for the user to look in-game.

## Self-Review

- **Spec coverage:** filler masonry blocks (Task 2 `style:"masonry"`), glass skyline towers (Task 2 `style:"glassTower"`, placed Task 4), park with beds/fountain/trees/benches/lamps/flowers (Tasks 1+3), continuous streetwall + skyline + park placement clear of spawns (Task 4), verification gate (Task 5). All spec sections map to a task.
- **Placeholder scan:** every code step contains complete code; no TBD/TODO. Verification steps use tsc/build (not unit tests) per the no-tests constraint.
- **Type consistency:** `fountain` params `{r,tiers}` consistent across Task 1 (def) and Task 3 (use). `fillerBuilding` param names consistent between Task 2 (def) and Task 4 (placements). `compose()`/`ObjectResult`/`Box`/`Rect` usage matches the stores.ts pattern and `system/types`. `applyTransform`/`buildObject` import paths verified against the registry/transform modules.
