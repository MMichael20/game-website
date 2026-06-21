# Terrace Row (Connected Streetwall) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `terraceRow` composite that places `fillerBuilding` units edge-to-edge into one continuous streetwall, then replace the scattered map fillers with terrace rows.

**Architecture:** New catalog composite `terraceRow` composes existing `fillerBuilding` units via `buildObject` + `applyTransform`, deriving each unit's x from the running sum of widths (no magic offsets). A small `faces` option on `fillerBuilding` lets interior units render front-only (party walls). Map placements swap in the rows.

**Tech Stack:** TypeScript, Three.js, the `src/world` registry/manifest/engine, voxel helpers.

## Global Constraints
- Local space: centered x=z=0, base y=0, FRONT +z, ~1u=1m. (CLAUDE.md)
- Deterministic only: `mulberry32(seed)` from `src/world/rng.ts`; NO `Math.random()`/`Date.now()`. (CLAUDE.md)
- Derive every child position from real dimensions — NO magic offsets. (CLAUDE.md PITFALL 3)
- Rotation only in {0,90,180,270}. (CLAUDE.md)
- NO tests / dev server / screenshots. ONLY verification: `npx tsc --noEmit` then `npx vite build`. (CLAUDE.md PITFALLS 1 & 2)
- Work on master, no worktree (user requires master-only).
- Colors from `PALETTE` / `DISTRICT_PALETTES` in `src/world/palette.ts`.

---

### Task 1: `faces` option on `fillerBuilding`

**Files:**
- Modify: `src/world/catalog/fillerBuilding.ts`

**Interfaces:**
- Produces: `fillerBuilding` accepts optional `faces?: Axis[]` (default `["+z","+x","-x"]`). Windows, piers, and spandrels iterate `p.faces`. Backward compatible.

- [ ] **Step 1:** Add `faces: Axis[];` to the `FillerParams` interface (after `seed`).

- [ ] **Step 2:** Add a default to the `params` object: `faces: ["+z", "+x", "-x"] as Axis[],`.

- [ ] **Step 3:** Replace the hardcoded facade list. Change:
```ts
    const faces: Axis[] = ["+z", "+x", "-x"];
```
to:
```ts
    const faces: Axis[] = p.faces;
```

- [ ] **Step 4:** Make spandrels respect `faces`. Change the `addSpandrels` signature and body to accept `faces` and only push bands for included faces:
```ts
function addSpandrels(
  parts: THREE.BufferGeometry[],
  opts: { w: number; d: number; yStart: number; rowH: number; rows: number; color: number; faces: Axis[] },
) {
  const { w, d, yStart, rowH, rows, faces } = opts;
  const proud = WALL_PROUD;
  for (let r = 1; r < rows; r++) {
    const y = yStart + rowH * r;
    if (faces.includes("+z")) parts.push(tintedBox(w + 0.04, 0.16, 0.06, 0, y, d / 2 + proud, opts.color));
    if (faces.includes("+x")) parts.push(tintedBox(0.06, 0.16, d + 0.04, w / 2 + proud, y, 0, opts.color));
    if (faces.includes("-x")) parts.push(tintedBox(0.06, 0.16, d + 0.04, -w / 2 - proud, y, 0, opts.color));
  }
}
```
And update the call site:
```ts
        addSpandrels(opaque, { w, d, yStart: winYStart, rowH, rows: winRows, color: PALETTE.spandrel, faces });
```

- [ ] **Step 5: Verify** — `npx tsc --noEmit`. Expected: no errors.

- [ ] **Step 6: Commit** — `git add src/world/catalog/fillerBuilding.ts && git commit -m "feat(world): add faces option to fillerBuilding (party-wall facades)"`

---

### Task 2: `terraceRow` composite

**Files:**
- Create: `src/world/catalog/terraceRow.ts`
- Modify: `src/world/catalog/index.ts` (add `import "./terraceRow";`)

**Interfaces:**
- Consumes: `defineObject, buildObject` from `../system/registry`; `applyTransform` from `../system/transform`; `DISTRICT_PALETTES, PALETTE` from `../palette`; `mulberry32` from `../rng`; types `ObjectResult, Box, Rect` from `../system/types`; reuses kind `"fillerBuilding"`.
- Produces: kind `"terraceRow"`, params `{ units:number; unitSpecs?:UnitSpec[]; d:number; storyH:number; district:string; anchor:"center"|"left"|"right"; seed:number }`, defaults `{ units:5, d:11, storyH:3.0, district:"east", anchor:"center", seed:1 }`. Returns `{ mesh, colliders, obstacles }`.

- [ ] **Step 1: Create the file** with this content:
```ts
// src/world/catalog/terraceRow.ts
//
// A continuous streetwall: N fillerBuilding units butted edge-to-edge sharing
// party walls. Each unit's x is derived from the running sum of prior widths
// (no magic offsets). Units share one depth so front/back lines are flush.
// Interior units render front-only; the two ends add their exposed outer side.
//
// LOCAL space: origin set by `anchor` (center/left/right edge), base y=0,
// FRONT +z, ~1u=1m. Deterministic.

import * as THREE from "three";
import { defineObject, buildObject } from "../system/registry";
import { applyTransform } from "../system/transform";
import { DISTRICT_PALETTES, PALETTE } from "../palette";
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

interface UnitSpec {
  w: number;
  stories: number;
  bodyColor: number;
  style: "masonry" | "glassTower" | "darkGlass";
  ground: "plain" | "storefront" | "none";
  awningColor: number;
}

interface TerraceParams {
  units: number;
  unitSpecs?: UnitSpec[];
  d: number;
  storyH: number;
  district: string;
  anchor: "center" | "left" | "right";
  seed: number;
}

const AWNINGS = [PALETTE.awningRed, PALETTE.awningBlue, 0x2e8b57, 0xc97b30, 0x7a4ea0];

// Derive a varied unit deterministically from the rng + district palette.
function genUnit(rng: () => number, palette: number[]): UnitSpec {
  const w = 9 + Math.floor(rng() * 6);            // 9..14
  const stories = 3 + Math.floor(rng() * 4);      // 3..6
  const bodyColor = palette[Math.floor(rng() * palette.length)];
  const style = rng() < 1 / 7 ? "glassTower" : "masonry";
  const isShop = style === "masonry" && rng() < 0.7;
  return {
    w, stories, bodyColor, style,
    ground: isShop ? "storefront" : "plain",
    awningColor: AWNINGS[Math.floor(rng() * AWNINGS.length)],
  };
}

defineObject("terraceRow", {
  params: { units: 5, d: 11, storyH: 3.0, district: "east", anchor: "center", seed: 1 } as TerraceParams,
  build(p: TerraceParams) {
    const rng = mulberry32(p.seed >>> 0);
    const palette = DISTRICT_PALETTES[p.district] ?? DISTRICT_PALETTES.east;

    const specs: UnitSpec[] = p.unitSpecs ?? Array.from({ length: p.units }, () => genUnit(rng, palette));
    const totalW = specs.reduce((s, u) => s + u.w, 0);

    // Origin offset: where the row's left edge sits relative to local x=0.
    const leftEdge = p.anchor === "center" ? -totalW / 2 : p.anchor === "left" ? 0 : -totalW;

    const parts: ObjectResult[] = [];
    let cursor = leftEdge;
    specs.forEach((u, i) => {
      const cx = cursor + u.w / 2;
      cursor += u.w;
      const isFirst = i === 0;
      const isLast = i === specs.length - 1;
      const faces =
        specs.length === 1 ? ["+z", "+x", "-x"]
        : isFirst ? ["+z", "-x"]
        : isLast ? ["+z", "+x"]
        : ["+z"];
      const unit = buildObject("fillerBuilding", {
        w: u.w, d: p.d, stories: u.stories, storyH: p.storyH,
        bodyColor: u.bodyColor, style: u.style, ground: u.ground,
        awningColor: u.awningColor, roofUnit: true, faces, seed: p.seed + i + 1,
      });
      parts.push(applyTransform(unit, { x: cx, z: 0, rot: 0 }));
    });

    return compose(parts);
  },
});
```

- [ ] **Step 2: Register** — in `src/world/catalog/index.ts`, add `import "./terraceRow";` after the existing catalog imports.

- [ ] **Step 3: Verify** — `npx tsc --noEmit`. Expected: no errors. (Confirms `ObjectResult/Box/Rect` paths, `buildObject`/`applyTransform` signatures, and that `fillerBuilding` accepts `faces`.)

- [ ] **Step 4: Commit** — `git add src/world/catalog/terraceRow.ts src/world/catalog/index.ts && git commit -m "feat(world): add terraceRow composite (connected streetwall)"`

---

### Task 3: Replace map fillers with terrace rows

**Files:**
- Modify: `src/world/map.ts`

**Interfaces:**
- Consumes: kind `"terraceRow"`. Existing footprints: phone shop `x∈[-23,-1]` front z≈-9; restaurant `x∈[5,27]` front z≈-12; road z∈[-5,1]; spawns (0,8)/(12,10); park x=-30,z=18; dark-glass skyline towers at z<-44.

- [ ] **Step 1:** Replace the 4 north filler lines (the `// North streetwall` block's `fillerBuilding` entries) with two flanking rows:
```ts
  // North streetwall: two connected terrace rows flanking the real stores,
  // aligned to the building line (~z=-16). Left row's right edge butts left of
  // the phone shop (x=-23); right row's left edge butts right of the restaurant (x=27).
  { kind: "terraceRow", x: -25, z: -16, params: { units: 5, d: 11, district: "south", anchor: "right", seed: 41 } },
  { kind: "terraceRow", x: 29, z: -16, params: { units: 5, d: 11, district: "east", anchor: "left", seed: 42 } },
```

- [ ] **Step 2:** Replace the south streetwall block (the 2 south `fillerBuilding` lines plus the standalone dark-glass mid-rise added earlier) with one wide south row:
```ts
  // South streetwall: one long connected row across the street, fronts facing
  // the road (rot 180), set back at z=30 — clear of spawns and the park.
  { kind: "terraceRow", x: 6, z: 30, rot: 180, params: { units: 7, d: 11, district: "west", anchor: "center", seed: 43 } },
```

- [ ] **Step 3: Verify** — `npx tsc --noEmit`. Expected: no errors.

- [ ] **Step 4: Commit** — `git add src/world/map.ts && git commit -m "feat(world): replace scattered fillers with connected terrace rows"`

---

### Task 4: Final gate

- [ ] **Step 1:** `npx tsc --noEmit` — expect clean.
- [ ] **Step 2:** `npx vite build` — expect success (pre-existing chunk-size warning only).
- [ ] **Step 3:** Hand back for the user to look in-game.

## Self-Review

- **Spec coverage:** terraceRow composite + generative variety + anchor + party-wall faces (Tasks 1-2); `faces` on fillerBuilding (Task 1); north flanking rows + south row, keep park & skyline (Task 3); gate (Task 4). All spec sections mapped.
- **Placeholder scan:** every code step is complete; verification uses tsc/build per no-tests rule.
- **Type consistency:** `UnitSpec`/`TerraceParams` field names consistent across Task 2; `faces` param name matches Task 1's `fillerBuilding` addition; `style`/`ground` literal unions match `fillerBuilding`. `compose()`/`ObjectResult`/`Box`/`Rect` mirror `park.ts`.
