// src/world/catalog/stores.ts
//
// Composite store catalog objects: phoneRepairShop and restaurant.
//
// LOCAL-SPACE conventions (same as all catalog objects):
//   - centered on x=z=0, base at y=0.
//   - FRONT faces +z (storefront is at z = +d/2).
//   - ~1 unit = 1 metre.
//
// NO Math.random / Date.now — fully deterministic.

import * as THREE from "three";
import { defineObject } from "../system/registry";
import { buildObject } from "../system/registry";
import { applyTransform } from "../system/transform";
import type { ObjectResult, Box, Rect, Vec2, Seat, PoiSpec } from "../system/types";
import { tintedBox, cylinderY, mergeTinted, tintedMesh, DECAL_GAP } from "../objects/voxel";
import { makePhone, PHONE_SCREENS } from "../objects/phone";
import { makeCakeMesh } from "../objects/cake";
import { makeCupcakeMesh } from "../objects/cupcake";
import { makePottedPlantMesh } from "../objects/pottedPlant";
import { makeWallLampMesh } from "../objects/wallLamp";
import { makePlanterMesh } from "../objects/planter";
import { makeAwning } from "../objects/awning";
import { makeGlassPaneMaterial, makeGlassPanel } from "../objects/glass";
import { makeTextSignMesh } from "../objects/textSign";
import { SPONGE, FROSTING, GLAZE, PETAL } from "../objects/objectPalette";
import { PALETTE } from "../palette";

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Compose multiple ObjectResults into one group-based ObjectResult.
 * Anchors and pois must be set directly on the result after composition
 * (they are already in composite-local coords).
 */
function compose(parts: ObjectResult[]): ObjectResult {
  const group = new THREE.Group();
  const colliders: Box[] = [];
  const obstacles: Rect[] = [];
  const anchors: Record<string, Vec2 | Seat> = {};
  const pois: PoiSpec[] = [];

  for (const p of parts) {
    group.add(p.mesh);
    if (p.colliders) colliders.push(...p.colliders);
    if (p.obstacles) obstacles.push(...p.obstacles);
    if (p.anchors) {
      for (const [k, v] of Object.entries(p.anchors)) anchors[k] = v;
    }
    if (p.pois) pois.push(...p.pois);
  }

  return { mesh: group, colliders, obstacles, anchors, pois };
}

// ---------------------------------------------------------------------------
// phoneRepairShop
// ---------------------------------------------------------------------------
//
// A small repair shop: shell + glass storefront + wide service counter near the
// back + wall display shelves along the back wall + phones on the counter.
//
// Params: w=18 (width), d=14 (depth), h=6 (height). All in metres.

interface PhoneShopParams {
  w: number;
  d: number;
  h: number;
}

defineObject("phoneRepairShop", {
  params: { w: 18, d: 14, h: 6 } as PhoneShopParams,
  build(p: PhoneShopParams) {
    const { w, d, h } = p;
    const ACCENT = PALETTE.awningBlue;     // the shop's blue theme
    const parts: ObjectResult[] = [];
    const anchors: Record<string, Vec2 | Seat> = {};

    // ── Building shell + tiled floor ─────────────────────────────────────────
    const shell = buildObject("buildingShell", { w, d, h });
    parts.push(applyTransform(shell, { x: 0, z: 0, rot: 0 }));
    parts.push({ mesh: makeTiledFloor(w, d) });

    // ── Storefront (blue awning + blue sign, glass facade at z = +d/2) ───────
    const front = buildObject("storefront", {
      w, h, d,
      signText: "Phone Repair",
      awningColor: ACCENT,
      signColor: PALETTE.signCool,
      fullGlass: true,
    });
    parts.push(applyTransform(front, { x: 0, z: d / 2, rot: 0 }));

    // Interior reference frame (composite-local). +z = open glass storefront;
    // the back wall is at -d/2. Every fitting derives from these.
    const T = 0.3;             // shell wall thickness (= buildingShell WALL_T)
    const xi = w / 2 - T;      // interior wall x
    const backZ = -d / 2 + T;  // inner face of the back wall

    // ── BACK WALL: the "wall of phones" (two big backlit displays) ───────────
    const wallZ = backZ + 0.3;
    const wallLen = w * 0.32;
    pushFitting(parts, anchors, makePhoneWallDisplay(-w * 0.26, wallZ, wallLen, ACCENT));
    pushFitting(parts, anchors, makePhoneWallDisplay(w * 0.26, wallZ, wallLen, ACCENT));

    // Staff door on the back wall, centred between the two displays.
    const backDoor = tintedMesh(tintedBox(1.1, 2.2, 0.06, 0, 1.1, backZ + 0.02, PALETTE.facadeDoor));
    parts.push({ mesh: backDoor });

    // Interior title sign high on the back wall (blue board).
    const titleW = Math.min(6, w * 0.4);
    const title = makeTextSignMesh({ text: "Phone Repair", w: titleW, h: 1.0, boardColor: PALETTE.signCool, glow: 0.9 });
    title.position.set(0, h - 2.4, backZ + 0.05);
    parts.push({ mesh: title });

    // Wall clock on the back wall, to one side of the title.
    const clock = makeWallClock();
    clock.position.set(-w * 0.34, h - 2.4, backZ + 0.06);
    parts.push({ mesh: clock });

    // ── LEFT WALL: technician repair bench (back) + accessory pegboard (front) ─
    const leftX = -xi + 0.35;
    pushFitting(parts, anchors, makeRepairBench(leftX, -d * 0.16, d * 0.34, Math.PI / 2));
    pushFitting(parts, anchors, makeAccessoryWall(leftX, d * 0.22, d * 0.28, Math.PI / 2));

    // ── FRONT-LEFT: the main service / repair counter (customers on the +z side) ─
    const counterLen = Math.min(6, w * 0.32);
    const counterX = -w * 0.2;
    const counterZ = -d * 0.06;
    pushFitting(parts, anchors, makeRepairCounter(counterX, counterZ, counterLen));
    anchors.counter = { x: counterX, z: counterZ + 0.7 } as Vec2;            // customer side
    anchors.staff = { x: counterX, z: counterZ - 0.7, faceYaw: 0 } as Seat;  // behind the counter

    // ── SHOWROOM: a derived grid of glass display islands (centre / right) ───
    const islandCols = [w * 0.1, w * 0.3];
    const islandRows = [-d * 0.12, d * 0.16];
    for (const ix of islandCols) {
      for (const iz of islandRows) {
        pushFitting(parts, anchors, makeDisplayIsland(ix, iz));
      }
    }

    // ── RIGHT WALL: glowing digital price/ad screens + framed tech posters ───
    const wallFaceX = w / 2 - T / 2;
    const screenHues = [0x2f7fb0, 0x3aa35a, 0xc94f8a];
    screenHues.forEach((hue, i) => {
      const scr = makeWallScreen(1.2, 0.8, hue);
      scr.position.set(wallFaceX - 0.03, 3.0, -d * 0.2 + i * (d * 0.22));
      scr.rotation.y = -Math.PI / 2;   // face -x into the room
      parts.push({ mesh: scr });
    });

    // ── FRONT-RIGHT: a customer waiting area ─────────────────────────────────
    const wait = makeWaitingArea(w * 0.28, d * 0.3, "wait");
    parts.push({ mesh: wait.mesh, obstacles: wait.obstacles });
    Object.assign(anchors, wait.seats);

    // ── Indoor plants flanking the entrance ──────────────────────────────────
    for (const px of [-xi + 1.0, xi - 1.0]) {
      const plant = makePottedPlantMesh({ height: 1.0 });
      plant.position.set(px, FLOOR_TOP, d / 2 - 1.6);
      parts.push({ mesh: plant, obstacles: [{ x: px, z: d / 2 - 1.6, w: 0.7, d: 0.7 }] });
    }

    // ── Dressing: cool-white pendants over the showroom, wall lamps, beams, mat ─
    const ceilY = h - T;
    const pendDrop = Math.max(1.4, ceilY - 4.2);
    for (const [lx, lz] of [[w * 0.1, -d * 0.12], [w * 0.3, d * 0.16], [counterX, counterZ]] as [number, number][]) {
      const pend = makePendantLamp(pendDrop, PALETTE.steelDark);
      pend.position.set(lx, ceilY, lz);
      parts.push({ mesh: pend });
    }
    for (const lz of [backZ + 4, 0, d / 2 - 4]) {
      const left = makeWallLampMesh();
      left.position.set(-xi, 3.4, lz);
      left.rotation.y = Math.PI / 2;
      parts.push({ mesh: left });
      const right = makeWallLampMesh();
      right.position.set(xi, 3.4, lz);
      right.rotation.y = -Math.PI / 2;
      parts.push({ mesh: right });
    }
    for (const bz of [d / 2 - 2.0, d / 2 - 8.0, backZ + 3.0]) {
      if (bz < backZ) continue;
      const beam = tintedMesh(tintedBox(2 * xi, 0.18, 0.28, 0, ceilY - 0.12, bz, PALETTE.trimBrown));
      parts.push({ mesh: beam });
    }
    const mat = tintedMesh(mergeTinted([
      tintedBox(2.6, 0.04, 1.4, 0, FLOOR_TOP + 0.09, d / 2 - 1.9, PALETTE.signCool),
      tintedBox(2.2, 0.03, 1.0, 0, FLOOR_TOP + 0.12, d / 2 - 1.9, PALETTE.awningStripe),
    ]));
    parts.push({ mesh: mat });

    // ── EXTERIOR: pavement, clad facade (blue), side windows (blue), roof, stoop ─
    pushFitting(parts, anchors, makePavement(w, d));
    pushFitting(parts, anchors, makeExteriorFacade(w, d, h, ACCENT));
    pushFitting(parts, anchors, makeSideWindows(w, d, h, ACCENT));
    pushFitting(parts, anchors, makeRooftopUnit(w, d, h));
    pushFitting(parts, anchors, makeSideDownspouts(w, d, h));
    pushFitting(parts, anchors, makeEntryStoop(w, d / 2));

    // Glowing lanterns on the front wall flanking the entrance.
    for (const sgn of [-1, 1]) {
      const lamp = makeWallLampMesh();
      lamp.position.set(sgn * (w / 2 - 0.5), 3.2, d / 2 - 0.1);
      parts.push({ mesh: lamp });
    }

    // A "Phone Repair" sign on the left side wall near the front (faces -x).
    const sideSign = makeTextSignMesh({ text: "Phone Repair", w: Math.min(3.4, d * 0.22), h: 0.6, boardColor: PALETTE.signCool, glow: 0.8 });
    sideSign.position.set(-w / 2 - 0.16, h - 1.8, d / 2 - 1.6);
    sideSign.rotation.y = -Math.PI / 2;
    parts.push({ mesh: sideSign });

    // ── EXTERIOR BACK: roll-up door + service door + utilities + dumpster + crates ─
    const backOut = -d / 2 - 0.05;
    const rollParts: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 8; i++) {
      rollParts.push(tintedBox(3.2, 0.34, 0.06, 0, 0.3 + i * 0.36, 0, i % 2 ? PALETTE.rollDoor : PALETTE.steelDark));
    }
    const roll = tintedMesh(mergeTinted(rollParts));
    roll.position.set(0, 0, backOut);
    parts.push({ mesh: roll });

    const svcDoor = tintedMesh(tintedBox(1.0, 2.2, 0.06, -w / 2 + 2.0, 1.1, backOut, PALETTE.facadeDoor));
    parts.push({ mesh: svcDoor });

    pushFitting(parts, anchors, makeBackUtilities(w, d, h));

    const dumpX = w / 2 - 2.5;
    const dumpZ = -d / 2 - 1.2;
    const dump = tintedMesh(mergeTinted([
      tintedBox(1.7, 1.2, 1.1, 0, 0.6, 0, PALETTE.dumpster),
      tintedBox(1.76, 0.12, 1.16, 0, 1.26, 0, PALETTE.steelDark),
    ]));
    dump.position.set(dumpX, 0, dumpZ);
    parts.push({
      mesh: dump,
      colliders: [solidBox(dumpX, 0.6, dumpZ, 1.7, 1.2, 1.1)],
      obstacles: [{ x: dumpX, z: dumpZ, w: 1.8, d: 1.2 }],
    });

    for (const [crx, crz, cs] of [
      [w / 2 - 4.5, -d / 2 - 1.0, 0.8],
      [w / 2 - 4.2, -d / 2 - 1.9, 0.6],
    ] as [number, number, number][]) {
      const crate = tintedMesh(tintedBox(cs, cs, cs, 0, cs / 2, 0, PALETTE.benchWood));
      crate.position.set(crx, 0, crz);
      parts.push({
        mesh: crate,
        colliders: [solidBox(crx, cs / 2, crz, cs, cs, cs)],
        obstacles: [{ x: crx, z: crz, w: cs, d: cs }],
      });
    }

    // Yellow safety bollards flanking the roll-up loading door.
    for (const bx of [-2.1, 2.1]) {
      const bz = -d / 2 - 0.5;
      const bollard = tintedMesh(mergeTinted([
        tintedBox(0.24, 0.9, 0.24, 0, 0.45, 0, PALETTE.yellowLine),
        tintedBox(0.26, 0.12, 0.26, 0, 0.78, 0, PALETTE.steelDark),
      ]));
      bollard.position.set(bx, 0, bz);
      parts.push({
        mesh: bollard,
        colliders: [solidBox(bx, 0.45, bz, 0.24, 0.9, 0.24)],
        obstacles: [{ x: bx, z: bz, w: 0.3, d: 0.3 }],
      });
    }

    // ── Compose ──────────────────────────────────────────────────────────────
    const result = compose(parts);
    result.anchors = {
      door: { x: 0, z: d / 2 } as Vec2,
      ...anchors,
    };
    result.pois = [
      { kind: "phoneShop", label: "Phone Repair", radius: 4.5, anchor: "door" },
    ];

    return result;
  },
});

// ---------------------------------------------------------------------------
// restaurant
// ---------------------------------------------------------------------------
//
// A small eatery: shell + storefront + counter near the back + two indoor
// patio-style tables with chairs in the front half.
//
// Params: w=12, d=10, h=7, variant="bakery".

interface RestaurantParams {
  w: number;
  d: number;
  h: number;
  variant: string;
}

// Table + chair dimensions — the SINGLE SOURCE for BOTH the geometry below AND the
// chair placement around the table. CHAIR_DIST is DERIVED from these, so a chair
// can never overlap the table (CLAUDE.md pitfall #3): the seat-front-to-table-edge
// clearance is exactly CHAIR_GAP, no matter how the sizes change.
const TABLE_TOP = 1.4;     // square tabletop side (m)
const TABLE_LEG = 0.14;    // leg thickness
const CHAIR_DEPTH = 0.56;  // seat depth (= width); the dimension that faces the table
const CHAIR_GAP = 0.1;     // clearance between the seat front and the table edge
/** How far a chair's CENTRE sits from the table centre. Derived, never eyeballed. */
const CHAIR_DIST = TABLE_TOP / 2 + CHAIR_DEPTH / 2 + CHAIR_GAP;

// Floor-tile constants. The shell floor slab is WALL_T thick (buildings.ts), so
// its top sits at y = SHELL_FLOOR_TOP; tiles rest just above it on a DECAL_GAP.
const SHELL_FLOOR_TOP = 0.3;  // = buildingShell WALL_T
const TILE_TARGET = 1.4;      // desired tile size (m) — actual size is derived to fit
const TILE_H = 0.05;          // tile slab thickness
const TILE_GROUT = 0.06;      // gap between tiles; the pale shell floor shows as grout

/**
 * A checkerboard tiled floor sized to the interior, returned as one merged mesh
 * at the composite's local origin. Tile count/size is DERIVED from the interior
 * footprint (CLAUDE.md pitfall #3) so the pattern always fills wall-to-wall.
 */
function makeTiledFloor(w: number, d: number): THREE.Object3D {
  const inset = SHELL_FLOOR_TOP;          // keep tiles inside the walls (= WALL_T)
  const innerW = w - inset * 2;
  const innerD = d - inset * 2;
  const cols = Math.max(1, Math.round(innerW / TILE_TARGET));
  const rows = Math.max(1, Math.round(innerD / TILE_TARGET));
  const tw = innerW / cols;
  const td = innerD / rows;
  const y = SHELL_FLOOR_TOP + DECAL_GAP + TILE_H / 2;
  const x0 = -innerW / 2 + tw / 2;
  const z0 = -innerD / 2 + td / 2;

  const parts: THREE.BufferGeometry[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const hex = (r + c) % 2 === 0 ? PALETTE.tileCream : PALETTE.tileTerracotta;
      parts.push(
        tintedBox(tw - TILE_GROUT, TILE_H, td - TILE_GROUT, x0 + c * tw, y, z0 + r * td, hex),
      );
    }
  }
  return tintedMesh(mergeTinted(parts));
}

/** Simple inline voxel table (top + 4 legs), local origin at center/base. */
function makeInlineTable(): THREE.Object3D {
  const parts: THREE.BufferGeometry[] = [];
  const legOff = TABLE_TOP / 2 - TABLE_LEG; // legs inset from the edge
  parts.push(tintedBox(TABLE_TOP, 0.16, TABLE_TOP, 0, 0.96, 0, PALETTE.benchWood));
  for (const sx of [-legOff, legOff]) {
    for (const sz of [-legOff, legOff]) {
      parts.push(tintedBox(TABLE_LEG, 0.96, TABLE_LEG, sx, 0.48, sz, PALETTE.benchWood));
    }
  }
  return tintedMesh(mergeTinted(parts));
}

/** Simple inline voxel chair, local origin at center/base, FRONT (open side) = +z. */
function makeInlineChair(): THREE.Object3D {
  const half = CHAIR_DEPTH / 2;
  const seat = tintedBox(CHAIR_DEPTH, 0.13, CHAIR_DEPTH, 0, 0.55, 0, PALETTE.benchWood);
  // Backrest on the -z side (away from the table when the chair faces it).
  const back = tintedBox(CHAIR_DEPTH, 0.62, 0.13, 0, 0.86, -(half - 0.06), PALETTE.benchWood);
  const legParts: THREE.BufferGeometry[] = [seat, back];
  const legOff = half - 0.05;
  for (const sx of [-legOff, legOff]) {
    for (const sz of [-legOff, legOff]) {
      legParts.push(tintedBox(0.1, 0.55, 0.1, sx, 0.275, sz, PALETTE.benchWood));
    }
  }
  return tintedMesh(mergeTinted(legParts));
}

// ───────────────────────────────────────────────────────────────────────────
// Bakery interior fittings ("Cake House" reference)
// ───────────────────────────────────────────────────────────────────────────
// Each fitting returns its own facets (mesh + colliders + obstacles + seats) so
// the composite can aggregate them and the engine transforms them on placement.
// All footprints/colliders are DERIVED from the fitting's real size (pitfall #3).

interface Fitting {
  mesh: THREE.Object3D;
  colliders?: Box[];
  obstacles?: Rect[];
  seats?: Record<string, Seat>;
}

/** Axis-aligned solid collider from a centre + full sizes. */
function solidBox(x: number, y: number, z: number, bw: number, bh: number, bd: number): Box {
  return { x, y, z, hx: bw / 2, hy: bh / 2, hz: bd / 2 };
}

// A rotating set of cake looks so a filled display reads as a varied bakery.
const CAKE_LOOKS = [
  { spongeColor: SPONGE.chocolate, frostingColor: FROSTING.chocolate },
  { spongeColor: SPONGE.vanilla,   frostingColor: FROSTING.pink },
  { spongeColor: SPONGE.redVelvet, frostingColor: FROSTING.cream },
  { spongeColor: SPONGE.matcha,    frostingColor: FROSTING.mint },
  { spongeColor: SPONGE.vanilla,   frostingColor: FROSTING.lemon },
] as const;

/**
 * Glass-fronted display case: a dark-wood base cabinet, a row of cakes on the
 * counter top, and a translucent glass cabinet over them. Solid collider so the
 * player can't walk through it. Runs along +z by default; pass `horizontal` to
 * run it along +x instead (for the L-shaped corner case). The geometry is always
 * built along z, then rotated 90° so the collider/obstacle extents just swap.
 */
function makeDisplayCase(cx: number, cz: number, len: number, horizontal = false): Fitting {
  const group = new THREE.Group();
  group.position.set(cx, 0, cz);
  if (horizontal) group.rotation.y = -Math.PI / 2; // local +z -> world +x

  const WIDTH = 0.9;   // x footprint
  const BASE_H = 0.92; // cabinet height (= counter top)
  const CASE_H = 0.6;  // glass cabinet height above the counter

  group.add(tintedMesh(mergeTinted([
    tintedBox(WIDTH, BASE_H, len, 0, BASE_H / 2, 0, PALETTE.caseWood),
    tintedBox(WIDTH + 0.06, 0.06, len + 0.06, 0, BASE_H + 0.03, 0, PALETTE.caseWoodTop),
  ])));

  // Cakes on the counter top (count derived from length — packed for a full case).
  const n = Math.max(1, Math.floor(len / 0.6));
  const step = len / n;
  for (let i = 0; i < n; i++) {
    const cake = makeCakeMesh({ ...CAKE_LOOKS[i % CAKE_LOOKS.length], slice: i % 3 === 0 });
    cake.position.set(0, BASE_H + 0.04, -len / 2 + step * (i + 0.5));
    group.add(cake);
  }

  // Translucent glass cabinet over the cakes (5 thin panes share one material).
  const glassMat = makeGlassPaneMaterial({ w: 1, h: 1, opacity: 0.2 });
  const cy = BASE_H + 0.04 + CASE_H / 2;
  const pane = (pw: number, ph: number, pd: number, x: number, y: number, z: number) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(pw, ph, pd), glassMat);
    m.position.set(x, y, z);
    group.add(m);
  };
  pane(WIDTH, 0.03, len, 0, BASE_H + 0.04 + CASE_H, 0);   // top
  pane(0.03, CASE_H, len, WIDTH / 2, cy, 0);              // +x (customer side)
  pane(0.03, CASE_H, len, -WIDTH / 2, cy, 0);             // -x (staff side)
  pane(WIDTH, CASE_H, 0.03, 0, cy, len / 2);              // +z end
  pane(WIDTH, CASE_H, 0.03, 0, cy, -len / 2);             // -z end

  const totalH = BASE_H + 0.04 + CASE_H;
  // When horizontal the footprint runs along x, so swap the planar extents.
  const fw = horizontal ? len : WIDTH;   // x extent
  const fd = horizontal ? WIDTH : len;   // z extent
  return {
    mesh: group,
    colliders: [solidBox(cx, totalH / 2, cz, fw, totalH, fd)],
    obstacles: [{ x: cx, z: cz, w: fw + 0.2, d: fd + 0.2 }],
  };
}

/** Wall display shelf stocked with cakes, against the back wall, facing +z. */
function makeCakeShelf(cx: number, cz: number): Fitting {
  const group = new THREE.Group();
  group.position.set(cx, 0, cz);

  const SW = 1.8;   // shelf width (x)
  const SD = 0.45;  // shelf depth (z)
  const levels = [0.65, 1.25, 1.85];

  const parts: THREE.BufferGeometry[] = [
    tintedBox(SW, 2.3, 0.08, 0, 1.25, -SD / 2, PALETTE.caseWood), // back panel
  ];
  for (const ly of levels) parts.push(tintedBox(SW, 0.07, SD, 0, ly, 0, PALETTE.caseWoodTop));
  for (const sx of [-SW / 2 + 0.04, SW / 2 - 0.04]) {
    parts.push(tintedBox(0.08, 2.3, SD, sx, 1.25, 0, PALETTE.caseWood));
  }
  group.add(tintedMesh(mergeTinted(parts)));

  // Stock each level (counts derived from width): cakes below, cupcakes on top.
  const GLAZES = [GLAZE.pink, GLAZE.chocolate, GLAZE.white, GLAZE.caramel];
  let idx = 0;
  for (let lvl = 0; lvl < levels.length; lvl++) {
    const ly = levels[lvl];
    if (lvl === levels.length - 1) {
      const per = Math.max(3, Math.floor(SW / 0.34));
      for (let i = 0; i < per; i++) {
        const cup = makeCupcakeMesh({ frostingColor: GLAZES[idx++ % GLAZES.length], cherry: i % 2 === 0 });
        cup.position.set(-SW / 2 + (SW / per) * (i + 0.5), ly + 0.035, 0.04);
        group.add(cup);
      }
    } else {
      const per = Math.max(2, Math.floor(SW / 0.5));
      for (let i = 0; i < per; i++) {
        const cake = makeCakeMesh({ ...CAKE_LOOKS[idx++ % CAKE_LOOKS.length], cherry: false });
        cake.scale.setScalar(0.78);
        cake.position.set(-SW / 2 + (SW / per) * (i + 0.5), ly + 0.035, 0.02);
        group.add(cake);
      }
    }
  }

  return {
    mesh: group,
    colliders: [solidBox(cx, 1.15, cz, SW, 2.3, SD)],
    obstacles: [{ x: cx, z: cz, w: SW + 0.1, d: SD + 0.1 }],
  };
}

/** Stainless kitchen run against the back wall (facing +z): counter, oven, fridge, hood. */
function makeKitchen(cx: number, cz: number, len: number): Fitting {
  const group = new THREE.Group();
  group.position.set(cx, 0, cz);

  const KD = 0.75;      // depth (z)
  const fridgeW = 1.0;

  // Tall stainless wire shelving rack at the +x end (counter-balancing the fridge).
  const rackW = 1.2;
  const rackH = 2.0;
  const rackX = len / 2 - rackW / 2;
  const rackLevels = [0.5, 1.0, 1.5, 1.95];

  const parts: THREE.BufferGeometry[] = [
    tintedBox(len, 0.9, KD, 0, 0.45, 0, PALETTE.steel),                     // base run
    tintedBox(len + 0.04, 0.06, KD + 0.04, 0, 0.93, 0, PALETTE.steelLight), // worktop
    tintedBox(len * 0.3, 0.7, 0.04, 0, 0.45, KD / 2 + 0.02, PALETTE.steelDark), // oven front
    // tall fridge at the -x end
    tintedBox(fridgeW, 2.0, KD, -len / 2 + fridgeW / 2, 1.0, 0, PALETTE.steel),
    tintedBox(0.05, 1.5, 0.04, -len / 2 + fridgeW / 2 + 0.28, 1.0, KD / 2 + 0.02, PALETTE.steelDark),
    // extractor hood over the centre
    tintedBox(len * 0.34, 0.5, KD * 0.8, 0, 1.95, -0.04, PALETTE.steelDark),
    // microwave on the worktop (between oven and rack)
    tintedBox(0.6, 0.36, 0.42, len * 0.22, 0.96 + 0.18, 0, PALETTE.steelDark),
    tintedBox(0.4, 0.26, 0.02, len * 0.22, 0.96 + 0.18, 0.22, PALETTE.steelLight), // its window
  ];
  // Wire shelving rack: four corner uprights + shelf slabs + a couple of trays.
  for (const ux of [rackX - rackW / 2 + 0.05, rackX + rackW / 2 - 0.05]) {
    for (const uz of [-KD / 2 + 0.05, KD / 2 - 0.05]) {
      parts.push(tintedBox(0.06, rackH, 0.06, ux, rackH / 2, uz, PALETTE.steelDark));
    }
  }
  for (const ly of rackLevels) {
    parts.push(tintedBox(rackW, 0.04, KD - 0.04, rackX, ly, 0, PALETTE.steelLight));
  }
  // Sheet-pans / trays stacked on two of the levels.
  parts.push(tintedBox(rackW - 0.2, 0.05, KD - 0.2, rackX, rackLevels[1] + 0.06, 0, PALETTE.steel));
  parts.push(tintedBox(rackW - 0.3, 0.05, KD - 0.3, rackX, rackLevels[2] + 0.06, 0.04, PALETTE.steel));
  group.add(tintedMesh(mergeTinted(parts)));

  return {
    mesh: group,
    colliders: [
      solidBox(cx, 0.45, cz, len, 0.9, KD),
      solidBox(cx - len / 2 + fridgeW / 2, 1.0, cz, fridgeW, 2.0, KD),
      solidBox(cx + rackX, rackH / 2, cz, rackW, rackH, KD),
    ],
    obstacles: [{ x: cx, z: cz, w: len + 0.1, d: KD + 0.1 }],
  };
}

/**
 * Long communal dining table running along +z with a red banquette bench on each
 * long side. Seats (derived from length) face the table. Benches are NOT in the
 * obstacle footprint (seating, per the kits Rule 3).
 */
function makeCommunalTable(cx: number, cz: number, len: number, key: string): Fitting {
  const group = new THREE.Group();
  group.position.set(cx, 0, cz);

  const TOP_W = 1.1;                 // tabletop width (x)
  const benchX = TOP_W / 2 + 0.5;    // bench centre offset from table centre

  group.add(tintedMesh(mergeTinted([
    tintedBox(TOP_W, 0.14, len, 0, 0.95, 0, PALETTE.benchWood),                // top
    tintedBox(TOP_W * 0.7, 0.88, 0.12, 0, 0.44, -len / 2 + 0.35, PALETTE.caseWood), // end trestle
    tintedBox(TOP_W * 0.7, 0.88, 0.12, 0, 0.44,  len / 2 - 0.35, PALETTE.caseWood),
  ])));

  for (const bx of [-benchX, benchX]) {
    const bench = tintedMesh(mergeTinted([
      tintedBox(0.42, 0.46, len, 0, 0.24, 0, PALETTE.caseWood),   // bench base
      tintedBox(0.44, 0.12, len, 0, 0.48, 0, PALETTE.benchRed),   // red cushion
      tintedBox(0.44, 0.5, 0.12, 0, 0.73, -len / 2 + 0.06, PALETTE.benchRed), // low backrest (one end)
    ]));
    bench.position.set(bx, 0, 0);
    group.add(bench);
  }

  // Seats along each bench, facing the table (yaw convention: +π/2 faces +x).
  const seats: Record<string, Seat> = {};
  const nSeats = Math.max(2, Math.floor(len / 0.85));
  const step = len / nSeats;
  let s = 0;
  for (const [bx, yaw] of [[-benchX, Math.PI / 2], [benchX, -Math.PI / 2]] as const) {
    for (let i = 0; i < nSeats; i++) {
      seats[`${key}_${s++}`] = { x: cx + bx, z: cz - len / 2 + step * (i + 0.5), faceYaw: yaw };
    }
  }

  return {
    mesh: group,
    obstacles: [{ x: cx, z: cz, w: TOP_W + 0.1, d: len + 0.1 }],
    seats,
  };
}

/** Push a Fitting's facets onto the composite parts list (already composite-local). */
function pushFitting(parts: ObjectResult[], anchors: Record<string, Vec2 | Seat>, f: Fitting): void {
  parts.push({ mesh: f.mesh, colliders: f.colliders, obstacles: f.obstacles });
  if (f.seats) for (const [k, v] of Object.entries(f.seats)) anchors[k] = v;
}

// The interior floor slab top (buildingShell WALL_T) — the deck is flush with it,
// so stepping up from the street onto the deck and into the shop is seamless.
const FLOOR_TOP = 0.3;

// A warm point light for a lantern. Shadows OFF and a short range keep many of
// them cheap (this project favours content over heavy lighting — kept modest).
function lanternLight(intensity = 6, distance = 11): THREE.PointLight {
  const l = new THREE.PointLight(0xffce7a, intensity, distance, 2);
  l.castShadow = false;
  return l;
}

// A small self-lit "bulb" so a lantern visibly glows even in daylight.
function glowBulb(r = 0.12): THREE.Mesh {
  return new THREE.Mesh(
    new THREE.SphereGeometry(r, 8, 6),
    new THREE.MeshStandardMaterial({ color: 0xffe7b0, emissive: 0xffce6a, emissiveIntensity: 1.7 }),
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Interior dressing (pendants, menu board, pictures, coffee bar) — decorative or
// mounted on existing surfaces, so they add richness without disturbing the
// tightly-packed furniture layout.
// ───────────────────────────────────────────────────────────────────────────

/** A hanging pendant lamp: a cord from the ceiling to a shade with a glowing bulb
 *  and a modest point light. Origin is the ceiling attach point; hangs by `drop`.
 *  `shadeColor` defaults to the warm red shade (restaurant); pass a cooler hue for
 *  a tech-shop pendant. */
function makePendantLamp(drop: number, shadeColor: number = PALETTE.awningRed): THREE.Object3D {
  const g = new THREE.Group();
  g.add(tintedMesh(mergeTinted([
    tintedBox(0.04, drop, 0.04, 0, -drop / 2, 0, PALETTE.lampPole),     // cord
    tintedBox(0.5, 0.28, 0.5, 0, -drop - 0.14, 0, shadeColor),         // shade
    tintedBox(0.42, 0.05, 0.42, 0, -drop - 0.29, 0, PALETTE.lantern),   // shade rim
  ])));
  const bulb = glowBulb(0.1);
  bulb.position.set(0, -drop - 0.3, 0);
  g.add(bulb);
  const light = lanternLight(5, 9);
  light.position.set(0, -drop - 0.42, 0);
  g.add(light);
  return g;
}

/** A wall menu chalkboard: wood frame + dark board + light menu lines + a small
 *  cake-slice icon. Built facing +z (rotate on placement). */
function makeMenuBoard(bw: number, bh: number): THREE.Object3D {
  const parts: THREE.BufferGeometry[] = [
    tintedBox(bw + 0.12, bh + 0.12, 0.05, 0, 0, 0, PALETTE.caseWood),   // frame
    tintedBox(bw, bh, 0.04, 0, 0, 0.02, 0x223027),                     // dark board
  ];
  for (let i = 0; i < 4; i++) {
    const ly = bh / 2 - 0.32 - i * 0.32;
    parts.push(tintedBox(bw * (i === 0 ? 0.55 : 0.74), 0.05, 0.02, -bw * 0.05, ly, 0.05, 0xf3efe6));
  }
  // cake-slice icon top-left (sponge + frosting)
  parts.push(tintedBox(0.22, 0.16, 0.02, -bw / 2 + 0.24, bh / 2 - 0.22, 0.06, SPONGE.vanilla));
  parts.push(tintedBox(0.22, 0.06, 0.02, -bw / 2 + 0.24, bh / 2 - 0.11, 0.06, FROSTING.pink));
  return tintedMesh(mergeTinted(parts));
}

/** A small framed picture (wood frame + colored print). Built facing +z. */
function makeFramedPicture(fw: number, fh: number, hue: number): THREE.Object3D {
  return tintedMesh(mergeTinted([
    tintedBox(fw + 0.08, fh + 0.08, 0.04, 0, 0, 0, PALETTE.caseWood),
    tintedBox(fw, fh, 0.03, 0, 0, 0.02, hue),
  ]));
}

/** An espresso machine (body, top, group head, portafilter). Origin at its base,
 *  front faces +z. Sits on a counter top. */
function makeEspressoMachine(): THREE.Object3D {
  const parts: THREE.BufferGeometry[] = [
    tintedBox(0.5, 0.4, 0.4, 0, 0.2, 0, PALETTE.steel),            // body
    tintedBox(0.52, 0.1, 0.42, 0, 0.45, 0, PALETTE.steelDark),     // top
    tintedBox(0.36, 0.06, 0.05, 0, 0.16, 0.22, PALETTE.steelDark), // group head
    tintedBox(0.08, 0.12, 0.08, 0, 0.07, 0.27, PALETTE.lampPole),  // portafilter handle
  ];
  return tintedMesh(mergeTinted(parts));
}

/** A small freestanding coffee bar: a wood counter with an espresso machine and a
 *  cup stack on top. Solid collider. Front faces +z. */
function makeCoffeeCounter(cx: number, cz: number): Fitting {
  const g = new THREE.Group();
  g.position.set(cx, 0, cz);
  const CW = 1.6, CD = 0.7, CH = 0.9;
  g.add(tintedMesh(mergeTinted([
    tintedBox(CW, CH, CD, 0, CH / 2, 0, PALETTE.caseWood),
    tintedBox(CW + 0.06, 0.06, CD + 0.06, 0, CH + 0.03, 0, PALETTE.caseWoodTop),
  ])));
  const esp = makeEspressoMachine();
  esp.position.set(-0.2, CH + 0.06, 0);
  g.add(esp);
  g.add(tintedMesh(mergeTinted([
    tintedBox(0.1, 0.1, 0.1, 0.5, CH + 0.11, 0.06, PALETTE.frame),
    tintedBox(0.1, 0.1, 0.1, 0.5, CH + 0.22, 0.06, PALETTE.frame),
  ])));
  return {
    mesh: g,
    colliders: [solidBox(cx, CH / 2, cz, CW, CH, CD)],
    obstacles: [{ x: cx, z: cz, w: CW + 0.1, d: CD + 0.1 }],
  };
}

/** Downspouts on the two side walls (front + back of each), proud of the cladding. */
function makeSideDownspouts(w: number, d: number, h: number): Fitting {
  const faceX = w / 2 + SHELL_WALL_T / 2;
  const parts: THREE.BufferGeometry[] = [];
  const top = h - 1.6;
  const y0 = 0.2;
  const hgt = top - y0;
  for (const sgn of [-1, 1]) {
    for (const z of [-(d / 2 - 2.5), d / 2 - 2.5]) {
      const px = sgn * (faceX + 0.14);
      parts.push(cylinderY(0.1, hgt, px, y0 + hgt / 2, z, PALETTE.rollDoor, 10));
      parts.push(tintedBox(0.24, 0.2, 0.24, px, 0.11, z, PALETTE.rollDoor)); // shoe at the base
      for (let by = 0.9; by < top; by += 1.6) {
        parts.push(tintedBox(0.26, 0.05, 0.14, px, by, z, PALETTE.steelDark)); // brackets
      }
    }
  }
  return { mesh: tintedMesh(mergeTinted(parts)) };
}

/** A glass-door drinks fridge stocked with bottles. Built facing +z; pass `yaw` to
 *  turn it against a wall. Solid collider (footprint swapped when turned 90°). */
function makeDrinksFridge(cx: number, cz: number, yaw: number): Fitting {
  const g = new THREE.Group();
  g.position.set(cx, 0, cz);
  g.rotation.y = yaw;
  const W = 1.2, H = 2.0, D = 0.6;
  const parts: THREE.BufferGeometry[] = [
    tintedBox(W, H, D, 0, H / 2, 0, PALETTE.steel),               // cabinet
    tintedBox(W - 0.08, 0.12, D, 0, H - 0.06, 0, PALETTE.steelDark), // top
  ];
  const hues = [0xd0402f, 0x2f7fb0, 0x3aa35a, 0xe0a24a, 0xc98ab0];
  const rows = [0.5, 1.0, 1.5];
  for (let r = 0; r < rows.length; r++) {
    for (let i = 0; i < 5; i++) {
      parts.push(tintedBox(0.12, 0.3, 0.12, -W / 2 + 0.22 + i * 0.2, rows[r], 0.04, hues[(i + r) % hues.length]));
    }
  }
  g.add(tintedMesh(mergeTinted(parts)));
  const glass = makeGlassPanel({ w: W - 0.18, h: H - 0.3, divisions: 1, opacity: 0.32 });
  glass.position.set(0, 0.16, D / 2 + 0.02);
  g.add(glass);
  const horiz = Math.abs(Math.sin(yaw)) > 0.5;
  const fw = horiz ? D : W, fd = horiz ? W : D;
  return {
    mesh: g,
    colliders: [solidBox(cx, H / 2, cz, fw, H, fd)],
    obstacles: [{ x: cx, z: cz, w: fw + 0.1, d: fd + 0.1 }],
  };
}

/** A simple square wall clock (frame, face, two hands). Built facing +z. */
function makeWallClock(): THREE.Object3D {
  return tintedMesh(mergeTinted([
    tintedBox(0.7, 0.7, 0.06, 0, 0, 0, PALETTE.caseWood),  // frame
    tintedBox(0.56, 0.56, 0.04, 0, 0, 0.03, 0xf3efe6),     // face
    tintedBox(0.04, 0.22, 0.02, 0, 0.06, 0.06, 0x231f25), // minute hand
    tintedBox(0.18, 0.04, 0.02, 0.05, 0, 0.06, 0x231f25), // hour hand
  ]));
}

/**
 * Pavement apron framing the building: a sidewalk slab with a curb border, a
 * touch proud of the grass. Sized to the footprint + a margin (derived).
 */
function makePavement(w: number, d: number): Fitting {
  const pad = 2.0;
  const pw = w + pad * 2;
  const pd = d + pad * 2;
  const slab = tintedMesh(mergeTinted([
    tintedBox(pw + 0.4, 0.06, pd + 0.4, 0, 0.03, 0, PALETTE.curb),      // curb border
    tintedBox(pw, 0.08, pd, 0, 0.05, 0, PALETTE.sidewalk),             // pavement
  ]));
  slab.receiveShadow = true;
  return { mesh: slab };
}

/**
 * Raised STONE elevation the building sits on (matching the reference): a stone
 * plinth/podium whose top is flush with the interior floor, a stone curb lip,
 * three descending stone steps at the entrance, flower planter boxes flanking the
 * door, and a glowing lantern on a short stone post at each front corner. No
 * wooden railing. All sizes derive from FLOOR_TOP and the building width.
 */
function makeFrontElevation(w: number, d: number): Fitting {
  const group = new THREE.Group();
  const colliders: Box[] = [];

  const padDepth = 2.0;          // how far the podium reaches in front of the glass
  const padW = w + 0.6;
  const frontZ = d / 2;
  const padOuter = frontZ + padDepth;
  const padCz = frontZ + padDepth / 2;

  // Stone podium: a solid plinth (top flush with FLOOR_TOP) with a slightly proud
  // curb lip around the top edge so it reads as a stone elevation, not a flat slab.
  const podiumParts: THREE.BufferGeometry[] = [
    tintedBox(padW, FLOOR_TOP, padDepth, 0, FLOOR_TOP / 2, padCz, PALETTE.stoneBase),
    tintedBox(padW + 0.2, 0.06, padDepth + 0.2, 0, FLOOR_TOP + 0.03, padCz, PALETTE.curb), // top curb lip
  ];
  group.add(tintedMesh(mergeTinted(podiumParts)));
  colliders.push(solidBox(0, FLOOR_TOP / 2, padCz, padW, FLOOR_TOP, padDepth));

  // Three stone steps descending from the podium edge to the street.
  const stairW = Math.min(w * 0.55, 6);
  const td = 0.3;
  const rise = FLOOR_TOP / 3;
  const stepParts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 3; i++) {
    const top = rise * (i + 1);                 // i=2 is tallest, nearest the podium
    const cz = padOuter + (2 - i) * td + td / 2;
    stepParts.push(tintedBox(stairW, top, td, 0, top / 2, cz, PALETTE.stoneBase));
    stepParts.push(tintedBox(stairW + 0.12, 0.04, td, 0, top, cz, PALETTE.curb)); // step nosing
    colliders.push(solidBox(0, top / 2, cz, stairW, top, td));
  }
  group.add(tintedMesh(mergeTinted(stepParts)));

  // Flower planter boxes on the podium, flanking the entrance (clear of the door
  // gap and the descending stairs), echoing the reference's front planters.
  for (const sgn of [-1, 1]) {
    const planter = makePlanterMesh({
      w: Math.min(3.2, w * 0.28), d: 0.6, withFlowers: true,
      flowerColor: sgn < 0 ? PETAL[0] : PETAL[2],
    });
    const px = sgn * (stairW / 2 + Math.min(3.2, w * 0.28) / 2 + 0.4);
    planter.position.set(px, FLOOR_TOP, frontZ + 0.5);
    group.add(planter);
    colliders.push(solidBox(px, FLOOR_TOP + 0.25, frontZ + 0.5, Math.min(3.2, w * 0.28), 0.5, 0.6));
  }

  // A glowing lantern on a short stone post at each front corner of the podium.
  for (const sx of [-padW / 2 + 0.25, padW / 2 - 0.25]) {
    const postH = 1.0;
    const postTopY = FLOOR_TOP + postH;
    const lantern = new THREE.Group();
    lantern.add(tintedMesh(mergeTinted([
      tintedBox(0.22, postH, 0.22, 0, FLOOR_TOP + postH / 2, 0, PALETTE.stoneBase), // stone post
      tintedBox(0.18, 0.2, 0.18, 0, postTopY + 0.1, 0, PALETTE.lantern),            // lamp housing
    ])));
    const bulb = glowBulb(0.08);
    bulb.position.set(0, postTopY + 0.1, 0);
    lantern.add(bulb);
    const light = lanternLight(7, 12);
    light.position.set(0, postTopY + 0.1, 0);
    lantern.add(light);
    lantern.position.set(sx, 0, padOuter - 0.2);
    group.add(lantern);
    colliders.push(solidBox(sx, FLOOR_TOP + postH / 2, padOuter - 0.2, 0.22, postH, 0.22));
  }

  return { mesh: group, colliders };
}

/**
 * A grey boxy HVAC unit on the parapet roof (louvered face, fan grille on top,
 * small feet), like the reference's rooftop unit — visible from the SIDE and over
 * the open front. Decorative: it sits on the roof out of reach, so no collider.
 */
function makeRooftopUnit(w: number, d: number, h: number): Fitting {
  const uw = Math.min(3.0, w * 0.22);
  const ud = Math.min(2.4, d * 0.18);
  const uh = 1.1;
  const baseY = h + 0.14;     // rests on the roof cap (cap top ≈ h + 0.12)
  const cx = -w * 0.12;       // a touch left of centre
  const cz = -d * 0.18;       // toward the back, as in the reference

  const parts: THREE.BufferGeometry[] = [
    tintedBox(uw, uh, ud, cx, baseY + uh / 2, cz, PALETTE.steel),                       // body
    tintedBox(uw + 0.12, 0.1, ud + 0.12, cx, baseY + uh + 0.05, cz, PALETTE.steelDark), // top cap
    cylinderY(Math.min(uw, ud) * 0.3, 0.06, cx, baseY + uh + 0.12, cz, PALETTE.steelDark, 12), // fan grille
  ];
  // Louver slats on the front (+z) face.
  for (let i = 0; i < 4; i++) {
    parts.push(tintedBox(uw * 0.8, 0.06, 0.02, cx, baseY + 0.25 + i * 0.18, cz + ud / 2 + 0.01, PALETTE.steelLight));
  }
  // Four small feet.
  for (const fx of [cx - uw / 2 + 0.2, cx + uw / 2 - 0.2]) {
    for (const fz of [cz - ud / 2 + 0.2, cz + ud / 2 - 0.2]) {
      parts.push(tintedBox(0.16, 0.14, 0.16, fx, baseY + 0.07, fz, PALETTE.steelDark));
    }
  }

  // A smaller condenser box beside the main unit.
  const cw = uw * 0.5;
  const c2x = cx + uw / 2 + cw / 2 + 0.4;
  parts.push(tintedBox(cw, 0.7, ud * 0.7, c2x, baseY + 0.35, cz, PALETTE.steel));
  parts.push(cylinderY(cw * 0.28, 0.05, c2x, baseY + 0.72, cz, PALETTE.steelDark, 12)); // its fan

  // A capped vent pipe and a low roof hatch toward the back.
  parts.push(cylinderY(0.12, 1.0, w * 0.22, baseY + 0.5, -d * 0.3, PALETTE.steelDark, 10));
  parts.push(tintedBox(0.34, 0.06, 0.34, w * 0.22, baseY + 1.03, -d * 0.3, PALETTE.steelLight)); // pipe cap
  parts.push(tintedBox(1.2, 0.22, 0.9, -w * 0.28, baseY + 0.11, d * 0.18, PALETTE.trimBrown));   // hatch curb
  parts.push(tintedBox(1.1, 0.06, 0.8, -w * 0.28, baseY + 0.25, d * 0.18, PALETTE.steelDark));   // hatch lid

  return { mesh: tintedMesh(mergeTinted(parts)) };
}

// Shell wall thickness (= buildingShell WALL_T). The exterior cladding MUST mount
// PROUD of the shell's OUTER face (xo + T/2); mounting it on the wall centre buries
// it inside the pale shell and the building reads as a plain grey box.
const SHELL_WALL_T = 0.3;

// Shared vertical band layout for the exterior walls, derived from height so the
// facade bands and the window bays line up on every wall.
function facadeBands(h: number) {
  const baseTop = 0.7;                          // stone base course top
  const sill = 1.1;                             // window sill
  const winH = Math.min(3.4, h * 0.45);         // window height
  const winTop = sill + winH;
  const beltH = 0.26;
  const beltCY = winTop + 0.2;                  // brown belt course just above the windows
  const fasciaH = Math.min(1.4, h * 0.2);
  const fasciaCY = h - 0.1 - fasciaH / 2;       // red fascia band under the roof cap
  const pilBottom = baseTop;
  const pilTop = fasciaCY - fasciaH / 2;        // pilasters run base -> fascia underside
  return { baseTop, sill, winH, winTop, beltH, beltCY, fasciaH, fasciaCY, pilBottom, pilTop };
}

/**
 * Exterior cladding so the shell isn't a plain grey box: tan wall panels on the
 * two sides + back mounted PROUD of the shell, a stone base course + string
 * course, a brown belt course above the windows, a red fascia band under the
 * roof, back-wall pilaster strips, brown corner pilasters, and a capped cornice
 * roof. All derived from w/d/h via facadeBands().
 */
function makeExteriorFacade(w: number, d: number, h: number, accent: number = PALETTE.awningRed): Fitting {
  const xo = w / 2;
  const zo = d / 2;
  const T = SHELL_WALL_T;
  const faceX = xo + T / 2;     // shell outer face (sides)
  const faceZ = zo + T / 2;     // shell outer face (back)
  const CLAD = 0.1;
  const B = facadeBands(h);
  const parts: THREE.BufferGeometry[] = [];

  // ── Two side walls (±x): tan body + stone base + string + belt + red fascia ──
  for (const sgn of [-1, 1]) {
    const x0 = sgn * (faceX + CLAD / 2);   // tan body plane
    const xb = sgn * (faceX + CLAD);       // bands a touch further out (relief)
    parts.push(tintedBox(CLAD, h, d, x0, h / 2, 0, PALETTE.houseBody));                        // tan body
    parts.push(tintedBox(CLAD * 1.6, B.baseTop, d, xb, B.baseTop / 2, 0, PALETTE.stoneBase));  // stone base
    parts.push(tintedBox(CLAD * 1.8, 0.12, d, xb, B.baseTop + 0.06, 0, PALETTE.trimBrown));    // string course
    parts.push(tintedBox(CLAD * 1.8, B.beltH, d, xb, B.beltCY, 0, PALETTE.trimBrown));         // belt course
    parts.push(tintedBox(CLAD * 2.0, B.fasciaH, d, xb, B.fasciaCY, 0, accent));               // accent fascia
  }

  // ── Back wall (−z): the same band stack ──
  parts.push(tintedBox(w, h, CLAD, 0, h / 2, -(faceZ + CLAD / 2), PALETTE.houseBody));
  parts.push(tintedBox(w, B.baseTop, CLAD * 1.6, 0, B.baseTop / 2, -(faceZ + CLAD), PALETTE.stoneBase));
  parts.push(tintedBox(w, 0.12, CLAD * 1.8, 0, B.baseTop + 0.06, -(faceZ + CLAD), PALETTE.trimBrown));
  parts.push(tintedBox(w, B.beltH, CLAD * 1.8, 0, B.beltCY, -(faceZ + CLAD), PALETTE.trimBrown));
  parts.push(tintedBox(w, B.fasciaH, CLAD * 2.0, 0, B.fasciaCY, -(faceZ + CLAD), accent));

  // Back-wall vertical pilaster strips at the quarter points (clear of the centre
  // roll-up door and the side service door).
  const pilH = B.pilTop - B.pilBottom;
  const pilCY = (B.pilTop + B.pilBottom) / 2;
  for (const px of [-w * 0.3, w * 0.3]) {
    parts.push(tintedBox(0.4, pilH, CLAD * 2.2, px, pilCY, -(faceZ + CLAD), PALETTE.trimBrown));
  }

  // Corner pilasters (brown), full height, proud on both faces.
  const pil = 0.5;
  for (const cx of [-xo, xo]) {
    for (const cz of [-zo, zo]) {
      parts.push(tintedBox(pil, h, pil, cx + Math.sign(cx) * (T / 2), h / 2, cz + Math.sign(cz) * (T / 2), PALETTE.trimBrown));
    }
  }

  // Flat roof cap + a deeper cornice lip + parapet around the edge.
  parts.push(tintedBox(w + 0.5, 0.16, d + 0.5, 0, h + 0.08, 0, PALETTE.roofCap));
  const par = 0.28;
  for (const sgn of [-1, 1]) {
    parts.push(tintedBox(w + 0.5, par, 0.16, 0, h + 0.16 + par / 2, sgn * (zo + 0.2), PALETTE.trimBrown));
    parts.push(tintedBox(0.16, par, d + 0.5, sgn * (xo + 0.2), h + 0.16 + par / 2, 0, PALETTE.trimBrown));
  }

  return { mesh: tintedMesh(mergeTinted(parts)) };
}

/**
 * The full SIDE elevation from the reference, down each side wall: tall awning'd
 * windows with planters beneath, brown pilaster strips between every bay (running
 * base -> fascia), a row of small clerestory accent windows on the upper wall, and
 * a lantern on each pilaster. Heights come from facadeBands() so everything lines
 * up with the cladding bands. Mounted PROUD of the now-proud cladding. Returns
 * planter footprints as obstacles.
 */
function makeSideWindows(w: number, d: number, h: number, accent: number = PALETTE.awningRed): Fitting {
  const group = new THREE.Group();
  const obstacles: Rect[] = [];
  const xo = w / 2;
  const faceX = xo + SHELL_WALL_T / 2;
  const B = facadeBands(h);
  const winW = 1.7;
  const span = d - 3;
  const n = Math.max(2, Math.floor(span / 3));
  const step = span / n;

  // Mounting planes, all just outside the proud cladding (body ≈ faceX + 0.1).
  const glassX = faceX + 0.22;
  const awnX = faceX + 0.2;
  const planterX = faceX + 0.5;
  const pilX = faceX + 0.16;
  const lampX = faceX + 0.16;

  // Upper clerestory band (between the belt course and the red fascia).
  const clereBot = B.beltCY + B.beltH / 2 + 0.25;
  const clereTop = B.fasciaCY - B.fasciaH / 2 - 0.2;
  const clereH = clereTop - clereBot;

  const pilH = B.pilTop - B.pilBottom;
  const pilCY = (B.pilTop + B.pilBottom) / 2;

  for (const sgn of [-1, 1]) {                 // left / right wall
    const yaw = (sgn * Math.PI) / 2;           // window/awning face outward (±x)
    const trim: THREE.BufferGeometry[] = [];   // merged brown pilaster strips

    for (let i = 0; i < n; i++) {
      const z = -span / 2 + step * (i + 0.5);

      // Tall main window with a mullion grid, awning above, planter below.
      const glass = makeGlassPanel({ w: winW, h: B.winH, divisions: 2, opacity: 0.5 });
      glass.position.set(sgn * glassX, B.sill, z);
      glass.rotation.y = yaw;
      group.add(glass);

      const awn = tintedMesh(makeAwning({ w: winW + 0.3, colorA: accent, colorB: PALETTE.awningStripe, depth: 0.8 }));
      awn.position.set(sgn * awnX, B.sill + B.winH, z);
      awn.rotation.y = yaw;
      group.add(awn);

      const planter = makePlanterMesh({ w: winW, d: 0.5, withFlowers: true, flowerColor: i % 2 ? PETAL[2] : PETAL[0] });
      planter.position.set(sgn * planterX, 0, z);
      planter.rotation.y = yaw;
      group.add(planter);
      obstacles.push({ x: sgn * planterX, z, w: 0.6, d: winW });

      // Small clerestory accent window high on the wall, above this bay.
      if (clereH > 0.4) {
        const clere = makeGlassPanel({ w: 1.0, h: clereH, divisions: 1, opacity: 0.5 });
        clere.position.set(sgn * glassX, clereBot, z);
        clere.rotation.y = yaw;
        group.add(clere);
      }
    }

    // Vertical pilaster strips at every bay boundary (base -> fascia underside).
    for (let i = 0; i <= n; i++) {
      const pz = -span / 2 + step * i;
      trim.push(tintedBox(0.12, pilH, 0.36, sgn * pilX, pilCY, pz, PALETTE.trimBrown));
    }
    group.add(tintedMesh(mergeTinted(trim)));

    // A lantern on each pilaster (glow only — a row of real lights would be too many).
    for (let i = 0; i <= n; i++) {
      const lamp = makeWallLampMesh({ emitLight: false });
      lamp.position.set(sgn * lampX, B.sill + B.winH * 0.55, -span / 2 + step * i);
      lamp.rotation.y = yaw;
      group.add(lamp);
    }
  }

  return { mesh: group, obstacles };
}

/**
 * Back-of-house utilities on the rear wall: two drainpipes (with brackets + a
 * shoe at the bottom), an electrical conduit running up to a panel + meter beside
 * the service door, and a couple of louvered wall vents. Outward face is -z.
 */
function makeBackUtilities(w: number, d: number, h: number): Fitting {
  const group = new THREE.Group();
  const zWall = -d / 2;
  const pipeZ = zWall - 0.18;     // pipe centre, proud of the clad back wall
  const topY = h - 0.5;
  const parts: THREE.BufferGeometry[] = [];

  // Two fat drainpipes down the back wall (brackets every ~1.4m + a bottom shoe).
  for (const px of [-w / 2 + 1.0, w / 2 - 1.2]) {
    const r = 0.09;
    const y0 = 0.18;
    const hgt = topY - y0;
    parts.push(cylinderY(r, hgt, px, y0 + hgt / 2, pipeZ, PALETTE.rollDoor, 10));
    parts.push(tintedBox(r * 2.2, 0.22, r * 2.2, px, 0.11, pipeZ - 0.03, PALETTE.rollDoor)); // shoe
    for (let by = 0.6; by <= topY; by += 1.4) {
      parts.push(tintedBox(r * 2 + 0.08, 0.05, 0.12, px, by, (zWall + pipeZ) / 2, PALETTE.steelDark));
    }
  }

  // Electrical conduit rising to the panel near the service door.
  const condX = -w / 2 + 3.2;
  const panelY = 1.7;
  parts.push(cylinderY(0.04, panelY - 0.15, condX, (panelY - 0.15) / 2 + 0.15, zWall - 0.14, PALETTE.steelDark, 8));
  group.add(tintedMesh(mergeTinted(parts)));

  // Panel + meter (separate mesh; outward face = -z).
  const panel = tintedMesh(mergeTinted([
    tintedBox(0.5, 0.7, 0.16, 0, 0, 0, PALETTE.steel),
    tintedBox(0.4, 0.56, 0.04, 0, 0, -0.1, PALETTE.steelDark),       // panel door
    tintedBox(0.18, 0.22, 0.16, 0.34, -0.2, -0.04, PALETTE.steelLight), // meter beside
  ]));
  panel.position.set(condX, panelY, zWall - 0.16);
  group.add(panel);

  // Louvered wall vents high on the back wall.
  for (const vx of [-w / 4, w / 4]) {
    const vent = tintedMesh(mergeTinted([
      tintedBox(0.7, 0.5, 0.08, 0, 0, 0, PALETTE.steelDark),
      tintedBox(0.6, 0.06, 0.1, 0, 0.12, -0.05, PALETTE.steelLight),
      tintedBox(0.6, 0.06, 0.1, 0, 0.0, -0.05, PALETTE.steelLight),
      tintedBox(0.6, 0.06, 0.1, 0, -0.12, -0.05, PALETTE.steelLight),
    ]));
    vent.position.set(vx, h - 1.4, zWall - 0.1);
    group.add(vent);
  }

  return { mesh: group };
}

// ───────────────────────────────────────────────────────────────────────────
// Phone-shop interior fittings ("Phone Repair" reference)
// ───────────────────────────────────────────────────────────────────────────
// Same Fitting contract as the bakery fittings: each returns its own facets so
// the composite aggregates them and the engine transforms them on placement. All
// footprints/colliders are DERIVED from real sizes (CLAUDE.md pitfall #3).

// A rotating stock of phone body colours for varied displays.
const PHONE_BODIES = [0x20262e, 0x2b3550, 0x3a2740, 0x24303a, 0x402a2a];
// A cool screen-blue used for backlit panels / glow strips (reads "lit" in day).
const PANEL_GLOW = 0xbfe3ff;

/** Swap a wall unit's planar extents when it is turned 90° to line a side wall. */
function wallFootprint(yaw: number, len: number, depth: number): { fw: number; fd: number } {
  const horiz = Math.abs(Math.sin(yaw)) > 0.5;
  return { fw: horiz ? depth : len, fd: horiz ? len : depth };
}

/**
 * Backlit wall display against a wall (built facing +z; pass `yaw` to line a side
 * wall): a dark backboard with an accent valance, three lit glass shelves each
 * with a glow strip, and a DERIVED grid of phones standing on the shelves. This
 * is the "wall of phones" from the reference. Solid collider.
 */
function makePhoneWallDisplay(cx: number, cz: number, len: number, accent: number, yaw = 0): Fitting {
  const group = new THREE.Group();
  group.position.set(cx, 0, cz);
  group.rotation.y = yaw;

  const baseY = 0.5;       // panel starts above a low kick
  const H = 2.2;           // panel height
  const T = 0.12;          // backboard thickness (z)
  const SHELF_D = 0.3;     // how far shelves jut out (+z)
  const levels = [baseY + 0.45, baseY + 1.15, baseY + 1.7];

  const parts: THREE.BufferGeometry[] = [
    tintedBox(len, H, T, 0, baseY + H / 2, 0, PALETTE.steelDark),               // backboard
    tintedBox(len + 0.1, 0.22, T + 0.06, 0, baseY + H - 0.11, 0.02, accent),    // accent valance
  ];
  for (const ly of levels) {
    parts.push(tintedBox(len - 0.1, 0.05, SHELF_D, 0, ly, SHELF_D / 2, PALETTE.steelLight)); // glass shelf
    parts.push(tintedBox(len - 0.16, 0.04, 0.02, 0, ly - 0.06, 0.04, PANEL_GLOW));            // under-shelf glow
  }
  // DERIVED grid of phones standing on the shelves (count packs the width).
  const cols = Math.max(2, Math.floor(len / 0.5));
  let k = 0;
  for (const ly of levels) {
    for (let i = 0; i < cols; i++) {
      const px = -len / 2 + (len / cols) * (i + 0.5);
      const geo = makePhone({
        width: 0.32, height: 0.56,
        screenColor: PHONE_SCREENS[k % PHONE_SCREENS.length],
        bodyColor: PHONE_BODIES[k % PHONE_BODIES.length],
      });
      geo.translate(px, ly + 0.02, 0.06); // stand on the shelf, near the board
      parts.push(geo);
      k++;
    }
  }
  group.add(tintedMesh(mergeTinted(parts)));

  const { fw, fd } = wallFootprint(yaw, len, 0.45);
  return {
    mesh: group,
    colliders: [solidBox(cx, baseY + H / 2, cz, fw, H, fd)],
    obstacles: [{ x: cx, z: cz, w: fw + 0.1, d: fd + 0.1 }],
  };
}

/**
 * An accessory pegboard against a wall (built facing +z; `yaw` to line a side
 * wall): a light pegboard hung with a DERIVED grid of small colour-boxed
 * accessories (cases/chargers/cables), over a low shelf of boxed stock. The low
 * shelf is the only solid part (pegboard is high on the wall).
 */
function makeAccessoryWall(cx: number, cz: number, len: number, yaw = 0): Fitting {
  const group = new THREE.Group();
  group.position.set(cx, 0, cz);
  group.rotation.y = yaw;

  const shelfY = 0.9;       // low stock shelf height
  const pegY0 = 1.15;       // pegboard bottom
  const pegH = 1.25;        // pegboard height
  const parts: THREE.BufferGeometry[] = [
    tintedBox(len, pegH, 0.05, 0, pegY0 + pegH / 2, 0, 0xcdb98f),          // pegboard
    tintedBox(len, 0.06, 0.34, 0, shelfY, 0.14, PALETTE.caseWoodTop),       // low shelf
    tintedBox(len, 0.85, 0.08, 0, shelfY / 2 + 0.05, -0.13, PALETTE.caseWood), // shelf base panel
  ];
  // Hanging accessories: a derived grid of small bright boxes on the pegboard.
  const accHues = [0xe0524a, 0x2f7fb0, 0x3aa35a, 0xf2c14e, 0xc98ab0, 0xf3efe6];
  const acols = Math.max(3, Math.floor(len / 0.42));
  const arows = 3;
  let a = 0;
  for (let r = 0; r < arows; r++) {
    for (let i = 0; i < acols; i++) {
      const px = -len / 2 + (len / acols) * (i + 0.5);
      const py = pegY0 + 0.24 + r * ((pegH - 0.4) / (arows - 1));
      parts.push(tintedBox(0.16, 0.2, 0.05, px, py, 0.04, accHues[a % accHues.length]));
      a++;
    }
  }
  // Boxed stock on the low shelf (derived count).
  const boxes = Math.max(3, Math.floor(len / 0.5));
  for (let i = 0; i < boxes; i++) {
    const px = -len / 2 + (len / boxes) * (i + 0.5);
    parts.push(tintedBox(0.3, 0.22, 0.26, px, shelfY + 0.14, 0.06, accHues[(i + 2) % accHues.length]));
  }
  group.add(tintedMesh(mergeTinted(parts)));

  const { fw, fd } = wallFootprint(yaw, len, 0.34);
  return {
    mesh: group,
    colliders: [solidBox(cx, shelfY / 2, cz, fw, shelfY, fd)],
    obstacles: [{ x: cx, z: cz, w: fw + 0.1, d: fd + 0.1 }],
  };
}

/**
 * A free-standing showroom island: a dark-wood cabinet, a top lip, a translucent
 * glass vitrine, and a DERIVED row of phones on little stands under the glass.
 * Solid collider. Viewable all around (centre-floor furniture).
 */
function makeDisplayIsland(cx: number, cz: number): Fitting {
  const group = new THREE.Group();
  group.position.set(cx, 0, cz);

  const IW = 1.6, ID = 0.9, BASE_H = 0.85, CASE_H = 0.32;
  group.add(tintedMesh(mergeTinted([
    tintedBox(IW, BASE_H, ID, 0, BASE_H / 2, 0, PALETTE.caseWood),
    tintedBox(IW + 0.06, 0.06, ID + 0.06, 0, BASE_H + 0.03, 0, PALETTE.caseWoodTop),
  ])));

  // Phones on little stands on the cabinet top (count derived from width).
  const n = Math.max(2, Math.floor(IW / 0.5));
  const phoneParts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < n; i++) {
    const px = -IW / 2 + (IW / n) * (i + 0.5);
    phoneParts.push(tintedBox(0.16, 0.08, 0.12, px, BASE_H + 0.1, 0, PALETTE.steelDark)); // stand
    const geo = makePhone({
      width: 0.34, height: 0.5,
      screenColor: PHONE_SCREENS[i % PHONE_SCREENS.length],
      bodyColor: PHONE_BODIES[i % PHONE_BODIES.length],
    });
    geo.translate(px, BASE_H + 0.14, 0);
    phoneParts.push(geo);
  }
  group.add(tintedMesh(mergeTinted(phoneParts)));

  // Translucent glass vitrine over the phones (5 thin panes share one material).
  const glassMat = makeGlassPaneMaterial({ w: 1, h: 1, opacity: 0.18 });
  const cy = BASE_H + 0.06 + CASE_H / 2;
  const pane = (pw: number, ph: number, pd: number, x: number, y: number, z: number) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(pw, ph, pd), glassMat);
    m.position.set(x, y, z);
    group.add(m);
  };
  pane(IW, 0.03, ID, 0, BASE_H + 0.06 + CASE_H, 0);
  pane(0.03, CASE_H, ID, IW / 2, cy, 0);
  pane(0.03, CASE_H, ID, -IW / 2, cy, 0);
  pane(IW, CASE_H, 0.03, 0, cy, ID / 2);
  pane(IW, CASE_H, 0.03, 0, cy, -ID / 2);

  return {
    mesh: group,
    colliders: [solidBox(cx, BASE_H / 2, cz, IW, BASE_H, ID)],
    obstacles: [{ x: cx, z: cz, w: IW + 0.2, d: ID + 0.2 }],
  };
}

/**
 * The main service / repair counter (built facing +z, customer on the +z side):
 * wood body + top lip, a register, a parts organiser behind, an anglepoise repair
 * lamp, two phones lying flat on the top, and a low glass divider along the
 * customer edge. Solid collider.
 */
function makeRepairCounter(cx: number, cz: number, len: number): Fitting {
  const group = new THREE.Group();
  group.position.set(cx, 0, cz);

  const CH = 0.92, CD = 0.7;
  const parts: THREE.BufferGeometry[] = [
    tintedBox(len, CH, CD, 0, CH / 2, 0, PALETTE.caseWood),
    tintedBox(len + 0.04, 0.06, CD + 0.04, 0, CH + 0.03, 0, PALETTE.caseWoodTop),
    // parts organiser on the staff side (-z), a small drawer cabinet
    tintedBox(0.9, 0.5, 0.28, -len / 2 + 0.7, CH + 0.25, -CD / 2 - 0.12, PALETTE.steel),
  ];
  // drawer fronts on the organiser
  for (let i = 0; i < 3; i++) {
    parts.push(tintedBox(0.8, 0.12, 0.02, -len / 2 + 0.7, CH + 0.08 + i * 0.16, -CD / 2 - 0.27, PALETTE.steelDark));
  }
  // two phones lying flat on the counter top (screen up, near the customer edge)
  for (const px of [len * 0.18, len * 0.32]) {
    const geo = makePhone({ width: 0.3, height: 0.56, screenColor: PHONE_SCREENS[2] });
    geo.rotateX(-Math.PI / 2);             // lay it flat, screen up
    geo.translate(px, CH + 0.05, 0.12);
    parts.push(geo);
  }
  group.add(tintedMesh(mergeTinted(parts)));

  // Register on top, one end.
  const register = tintedMesh(mergeTinted([
    tintedBox(0.42, 0.28, 0.42, 0, CH + 0.2, 0, PALETTE.steelDark),
    tintedBox(0.36, 0.22, 0.04, 0, CH + 0.36, 0.2, PALETTE.steelLight), // screen
  ]));
  register.position.set(len / 2 - 0.5, 0, -0.05);
  group.add(register);

  // Anglepoise repair lamp at the other end (base, arm, head).
  const lamp = tintedMesh(mergeTinted([
    cylinderY(0.1, 0.05, 0, CH + 0.05, 0, PALETTE.steelDark, 12),      // base
    tintedBox(0.04, 0.5, 0.04, 0, CH + 0.3, 0, PALETTE.steel),          // lower arm
    tintedBox(0.04, 0.04, 0.4, 0, CH + 0.54, 0.18, PALETTE.steel),      // upper arm
    tintedBox(0.16, 0.1, 0.16, 0, CH + 0.52, 0.36, PALETTE.steelDark),  // head
  ]));
  lamp.position.set(-len / 2 + 0.7, 0, 0.18);
  group.add(lamp);

  // Low glass divider along the customer edge (+z).
  const divider = makeGlassPanel({ w: len * 0.86, h: 0.4, divisions: 2, opacity: 0.3 });
  divider.position.set(0, CH, CD / 2 + 0.02);
  group.add(divider);

  return {
    mesh: group,
    colliders: [solidBox(cx, CH / 2, cz, len, CH, CD)],
    obstacles: [{ x: cx, z: cz, w: len + 0.1, d: CD + 0.1 }],
  };
}

/**
 * A technician workbench against a wall (built facing +z): steel base + worktop, a
 * tool pegboard above it, parts bins, a magnifier lamp, a part-disassembled phone,
 * and a soldering iron. Solid collider on the base.
 */
function makeRepairBench(cx: number, cz: number, len: number, yaw = 0): Fitting {
  const group = new THREE.Group();
  group.position.set(cx, 0, cz);
  group.rotation.y = yaw;

  const BH = 0.9, BD = 0.6;
  const parts: THREE.BufferGeometry[] = [
    tintedBox(len, BH, BD, 0, BH / 2, 0, PALETTE.steel),
    tintedBox(len + 0.04, 0.06, BD + 0.04, 0, BH + 0.03, 0, PALETTE.steelLight),
    // tool pegboard above the bench, against the wall side (-z)
    tintedBox(len, 0.9, 0.05, 0, BH + 0.9, -BD / 2 + 0.05, PALETTE.steelDark),
  ];
  // Hanging tools on the pegboard (thin boxes: screwdrivers, pliers, spudgers).
  const toolHues = [0xf2c14e, 0xe0524a, 0xb9bdc4, 0x2f7fb0];
  const tcols = Math.max(4, Math.floor(len / 0.4));
  for (let i = 0; i < tcols; i++) {
    const px = -len / 2 + (len / tcols) * (i + 0.5);
    const th = 0.18 + (i % 3) * 0.06;
    parts.push(tintedBox(0.04, th, 0.03, px, BH + 0.9 + 0.1, -BD / 2 + 0.08, PALETTE.lampPole)); // shaft
    parts.push(tintedBox(0.07, 0.07, 0.03, px, BH + 0.9 + 0.1 - th / 2, -BD / 2 + 0.08, toolHues[i % toolHues.length])); // handle
  }
  // Three parts bins on the worktop.
  const binHues = [0xe0524a, 0xf2c14e, 0x2f7fb0];
  for (let i = 0; i < 3; i++) {
    const px = len / 2 - 0.4 - i * 0.34;
    parts.push(tintedBox(0.28, 0.16, 0.26, px, BH + 0.14, -0.1, binHues[i]));
  }
  // A part-disassembled phone laid out on the worktop (body + detached screen + chips).
  const dx = -len / 2 + 1.0;
  const body = makePhone({ width: 0.34, height: 0.6, screenColor: 0x10151b });
  body.rotateX(-Math.PI / 2);
  body.translate(dx, BH + 0.05, 0.08);
  parts.push(body);
  parts.push(tintedBox(0.3, 0.02, 0.5, dx + 0.42, BH + 0.07, 0.08, PALETTE.glassDark)); // detached screen
  parts.push(tintedBox(0.06, 0.03, 0.06, dx + 0.1, BH + 0.07, -0.16, PALETTE.steelDark)); // tiny chip
  parts.push(tintedBox(0.05, 0.03, 0.05, dx - 0.05, BH + 0.07, -0.1, PALETTE.steelDark)); // tiny chip
  group.add(tintedMesh(mergeTinted(parts)));

  // Magnifier lamp (base + arm + round head) at the left end.
  const mag = tintedMesh(mergeTinted([
    cylinderY(0.1, 0.05, 0, BH + 0.05, 0, PALETTE.steelDark, 12),
    tintedBox(0.04, 0.55, 0.04, 0, BH + 0.32, 0, PALETTE.steel),
    tintedBox(0.04, 0.04, 0.36, 0, BH + 0.58, 0.16, PALETTE.steel),
    cylinderY(0.16, 0.04, 0, BH + 0.58, 0.34, PALETTE.glassDark, 14), // round lens head
  ]));
  mag.position.set(-len / 2 + 0.5, 0, 0.16);
  group.add(mag);

  // Soldering iron on a little stand.
  const solder = tintedMesh(mergeTinted([
    tintedBox(0.14, 0.04, 0.1, 0, BH + 0.08, 0, PALETTE.steelDark),   // stand
    cylinderY(0.03, 0.22, 0, BH + 0.2, 0, PALETTE.benchRed, 8),       // handle
    cylinderY(0.012, 0.12, 0, BH + 0.36, 0, PALETTE.steelLight, 6),   // tip
  ]));
  solder.position.set(len / 2 - 1.3, 0, -0.05);
  group.add(solder);

  const { fw, fd } = wallFootprint(yaw, len, BD);
  return {
    mesh: group,
    colliders: [solidBox(cx, BH / 2, cz, fw, BH, fd)],
    obstacles: [{ x: cx, z: cz, w: fw + 0.1, d: fd + 0.1 }],
  };
}

/**
 * A small customer waiting area: a low table (with a phone + magazine on top) and
 * two chairs facing each other across it. Chairs are seating (returned as seats,
 * NOT obstacles per the kits Rule 3); the table is the obstacle.
 */
function makeWaitingArea(cx: number, cz: number, key: string): { mesh: THREE.Object3D; obstacles: Rect[]; seats: Record<string, Seat> } {
  const group = new THREE.Group();
  group.position.set(cx, 0, cz);

  // Low coffee table.
  const TW = 0.9, TD = 0.6, TH = 0.45;
  group.add(tintedMesh(mergeTinted([
    tintedBox(TW, 0.08, TD, 0, TH, 0, PALETTE.benchWood),
    tintedBox(TW - 0.12, 0.04, TD - 0.12, 0, TH + 0.06, 0, 0xe6dcc6),        // magazine
    ...[(() => { const g = makePhone({ width: 0.26, height: 0.46, screenColor: PHONE_SCREENS[0] }); g.rotateX(-Math.PI / 2); g.translate(0.22, TH + 0.1, 0); return g; })()],
    tintedBox(0.1, TH, 0.1, -TW / 2 + 0.12, TH / 2, -TD / 2 + 0.12, PALETTE.benchWood), // a leg
    tintedBox(0.1, TH, 0.1, TW / 2 - 0.12, TH / 2, -TD / 2 + 0.12, PALETTE.benchWood),
    tintedBox(0.1, TH, 0.1, -TW / 2 + 0.12, TH / 2, TD / 2 - 0.12, PALETTE.benchWood),
    tintedBox(0.1, TH, 0.1, TW / 2 - 0.12, TH / 2, TD / 2 - 0.12, PALETTE.benchWood),
  ])));

  // Two chairs facing each other across the table (along x). Chair front (open
  // side) is +z; rotate so each faces the table centre.
  const chairDist = TD / 2 + CHAIR_DEPTH / 2 + 0.35;
  const seats: Record<string, Seat> = {};
  const layout: [number, number, number][] = [
    [0, -chairDist, 0],            // far side, faces +z toward table
    [0, chairDist, Math.PI],       // near side, faces -z toward table
  ];
  let s = 0;
  for (const [dx, dz, faceYaw] of layout) {
    const c = new THREE.Group();
    c.position.set(dx, 0, dz);
    c.rotation.y = faceYaw;
    c.add(makeInlineChair());
    group.add(c);
    seats[`${key}_${s++}`] = { x: cx + dx, z: cz + dz, faceYaw } as Seat;
  }

  return {
    mesh: group,
    obstacles: [{ x: cx, z: cz, w: TW + 0.1, d: TD + 0.1 }],
    seats,
  };
}

/** A glowing flat wall screen (digital price / ad board): frame + bright face + a
 *  darker phone silhouette. Built facing +z (rotate on placement). */
function makeWallScreen(sw: number, sh: number, hue: number): THREE.Object3D {
  return tintedMesh(mergeTinted([
    tintedBox(sw + 0.08, sh + 0.08, 0.05, 0, 0, 0, PALETTE.lampPole),   // frame
    tintedBox(sw, sh, 0.03, 0, 0, 0.02, hue),                          // bright face
    tintedBox(sw * 0.26, sh * 0.5, 0.02, 0, 0, 0.05, 0x20262e),         // phone silhouette
    tintedBox(sw * 0.2, sh * 0.4, 0.01, 0, 0, 0.06, PANEL_GLOW),        // its screen
  ]));
}

/**
 * A shallow 2-step entry stoop at a flat (street-level) storefront door: the top
 * step is flush with the interior floor (FLOOR_TOP) and the steps descend toward
 * the street (+z). Width derived to span the door gap. Solid colliders per step.
 */
function makeEntryStoop(w: number, frontZ: number): Fitting {
  const colliders: Box[] = [];
  const parts: THREE.BufferGeometry[] = [];
  const stoopW = Math.min(w * 0.5, 5);
  const td = 0.34;               // step tread depth
  const rise = FLOOR_TOP / 2;    // two risers from the floor to the apron
  for (let i = 0; i < 2; i++) {
    const top = FLOOR_TOP - i * rise;            // i=0 flush with floor, i=1 lower
    const cz = frontZ + td / 2 + i * td;         // step out toward the street
    parts.push(tintedBox(stoopW, top, td, 0, top / 2, cz, PALETTE.stoneBase));
    parts.push(tintedBox(stoopW + 0.1, 0.04, td, 0, top, cz, PALETTE.curb));  // nosing
    colliders.push(solidBox(0, top / 2, cz, stoopW, top, td));
  }
  return { mesh: tintedMesh(mergeTinted(parts)), colliders };
}

defineObject("restaurant", {
  params: { w: 12, d: 10, h: 7, variant: "bakery" } as RestaurantParams,
  build(p: RestaurantParams) {
    const { w, d, h } = p;
    const parts: ObjectResult[] = [];

    // ── Building shell ───────────────────────────────────────────────────────
    const shell = buildObject("buildingShell", { w, d, h });
    parts.push(applyTransform(shell, { x: 0, z: 0, rot: 0 }));

    // ── Tiled floor (checkerboard, sized to the interior) ────────────────────
    parts.push({ mesh: makeTiledFloor(w, d) });

    // ── Storefront ───────────────────────────────────────────────────────────
    const front = buildObject("storefront", {
      w,
      h,
      d,
      signText: "Cake House",
      awningColor: PALETTE.awningRed,
      fullGlass: true,
    });
    parts.push(applyTransform(front, { x: 0, z: d / 2, rot: 0 }));

    // Interior reference frame (composite-local). Front (+z) is the open glass
    // storefront; the back wall is at -d/2. Every fitting derives from these.
    const T = 0.3;            // shell wall thickness (= buildingShell WALL_T)
    const xi = w / 2 - T;     // interior wall x
    const backZ = -d / 2 + T; // inner face of the back wall
    const anchors: Record<string, Vec2 | Seat> = {};

    // ── BACK WALL: cake shelves (left) + stainless kitchen (centre/right) ────
    const shelfZ = backZ + 0.25;
    pushFitting(parts, anchors, makeCakeShelf(-xi + 1.1, shelfZ));
    pushFitting(parts, anchors, makeCakeShelf(-xi + 3.1, shelfZ));
    const kitchenLen = Math.min(8, xi);          // fits the centre/right back wall
    const kitchenX = xi - kitchenLen / 2 - 0.6;  // hug the right back corner
    pushFitting(parts, anchors, makeKitchen(kitchenX, backZ + 0.4, kitchenLen));

    // Staff door on the back wall, between the shelves and the kitchen.
    const backDoor = tintedMesh(tintedBox(1.1, 2.2, 0.06, -xi + 5.6, 1.1, backZ + 0.02, PALETTE.facadeDoor));
    parts.push({ mesh: backDoor });

    // ── Interior title sign, high on the back wall ───────────────────────────
    const titleW = Math.min(6, w * 0.45);
    const titleH = 1.0;
    const title = makeTextSignMesh({ text: "Cake House", w: titleW, h: titleH, boardColor: PALETTE.awningRed, glow: 0.9 });
    title.position.set(0, h - 2.6, backZ + 0.05);
    parts.push({ mesh: title });

    // ── LEFT: L-shaped glass bakery display case (the service counter) ────────
    // A long leg along the left wall (+z) plus a short return leg along +x at the
    // front, wrapping the corner like the reference's angled case.
    const caseLen = Math.min(8, d * 0.5);
    const caseX = -xi + 1.7;
    const caseZ = caseLen / 2 - d * 0.18;   // sits in the front-left, derived from depth
    pushFitting(parts, anchors, makeDisplayCase(caseX, caseZ, caseLen));
    const caseFrontZ = caseZ + caseLen / 2;
    const returnLen = Math.min(4, w * 0.22);
    const CASE_WIDTH = 0.9;                  // = makeDisplayCase WIDTH
    const returnX = caseX + returnLen / 2 + CASE_WIDTH / 2;
    const returnZ = caseFrontZ - CASE_WIDTH / 2;
    pushFitting(parts, anchors, makeDisplayCase(returnX, returnZ, returnLen, true));
    // Register sitting ON TOP of the L-case (the case has a glass cabinet over the
    // cakes, so the register rides above it at ~1.6 rather than clipping inside).
    const register = tintedMesh(mergeTinted([
      tintedBox(0.4, 0.28, 0.4, 0, 1.1, 0, PALETTE.steelDark),
      tintedBox(0.34, 0.22, 0.04, 0, 1.26, 0.18, PALETTE.steelLight),
    ]));
    register.position.set(returnX, 0.62, returnZ);
    parts.push({ mesh: register });
    anchors.counter = { x: caseX + 1.0, z: caseZ } as Vec2;
    anchors.staff = { x: caseX - 0.8, z: caseZ, faceYaw: Math.PI / 2 } as Seat;

    // ── RIGHT: communal dining tables in rows, with a plant on each ──────────
    const tableLen = 4.0;
    const colXs = [xi - 2.2, xi - 6.4];        // two columns hugging the right
    const rowZs = [d / 2 - 5.0, d / 2 - 10.5]; // two rows, front to mid
    let tnum = 0;
    for (const tx of colXs) {
      for (const tz of rowZs) {
        pushFitting(parts, anchors, makeCommunalTable(tx, tz, tableLen, `seat${tnum++}`));
        const plant = makePottedPlantMesh({ height: 0.5, bloom: false });
        plant.scale.setScalar(0.7);
        plant.position.set(tx, 1.02, tz);
        parts.push({ mesh: plant });
      }
    }

    // ── FRONT-CENTRE: a couple of small café tables, a cake on each ──────────
    const cafeZ = d / 2 - 3.2;
    const cafeChairs: [number, number, number][] = [
      [0, -CHAIR_DIST, 0],
      [0, CHAIR_DIST, Math.PI],
      [-CHAIR_DIST, 0, Math.PI / 2],
      [CHAIR_DIST, 0, -Math.PI / 2],
    ];
    for (const cxs of [-2.2, 1.0]) {
      const tableGroup = new THREE.Group();
      tableGroup.position.set(cxs, 0, cafeZ);
      tableGroup.add(makeInlineTable());
      for (const [cdx, cdz, cfaceYaw] of cafeChairs) {
        const chairGroup = new THREE.Group();
        chairGroup.position.set(cdx, 0, cdz);
        chairGroup.rotation.y = cfaceYaw;
        chairGroup.add(makeInlineChair());
        tableGroup.add(chairGroup);
        anchors[`cafe${tnum++}`] = { x: cxs + cdx, z: cafeZ + cdz, faceYaw: cfaceYaw } as Seat;
      }
      const cake = makeCakeMesh({ ...CAKE_LOOKS[tnum % CAKE_LOOKS.length] });
      cake.position.set(0, 1.04, 0);
      tableGroup.add(cake);
      parts.push({ mesh: tableGroup, obstacles: [{ x: cxs, z: cafeZ, w: TABLE_TOP + 0.1, d: TABLE_TOP + 0.1 }] });
    }

    // ── Interior wall lamps along the left + right walls ─────────────────────
    for (const lz of [backZ + 4, 0, d / 2 - 4]) {
      const left = makeWallLampMesh();
      left.position.set(-xi, 3.4, lz);
      left.rotation.y = Math.PI / 2;   // arm points +x into the room
      parts.push({ mesh: left });
      const right = makeWallLampMesh();
      right.position.set(xi, 3.4, lz);
      right.rotation.y = -Math.PI / 2; // arm points -x into the room
      parts.push({ mesh: right });
    }

    // ── Indoor plants flanking the entrance ──────────────────────────────────
    for (const px of [-xi + 1.0, xi - 1.0]) {
      const plant = makePottedPlantMesh({ height: 1.0 });
      plant.position.set(px, FLOOR_TOP, d / 2 - 1.6);
      parts.push({ mesh: plant, obstacles: [{ x: px, z: d / 2 - 1.6, w: 0.7, d: 0.7 }] });
    }

    // ── INTERIOR DRESSING: pendants, menu board, pictures, bunting, mat, coffee ─
    const ceilY = h - T;
    const pendDrop = Math.max(1.6, ceilY - 4.4);
    for (const [lx, lz] of [[-2.2, cafeZ], [xi - 4.3, d / 2 - 5.0], [xi - 4.3, d / 2 - 10.5]] as [number, number][]) {
      const pend = makePendantLamp(pendDrop);
      pend.position.set(lx, ceilY, lz);
      parts.push({ mesh: pend });
    }

    // Wall inner faces (the shell walls are T thick, centred on ±w/2).
    const wallFaceX = w / 2 - T / 2;

    // Menu chalkboard on the left wall above the display case (faces +x), flush.
    const menu = makeMenuBoard(Math.min(2.6, d * 0.18), 1.5);
    menu.position.set(-wallFaceX + 0.03, 2.9, caseZ);
    menu.rotation.y = Math.PI / 2;
    parts.push({ mesh: menu });

    // Framed pictures along the right wall (face -x), flush to the wall.
    const picHues = [0x6aa9c9, 0xe0a24a, 0x84b06a];
    picHues.forEach((hue, i) => {
      const pic = makeFramedPicture(0.9, 0.7, hue);
      pic.position.set(wallFaceX - 0.03, 3.1, d / 2 - 4.5 - i * 3.0);
      pic.rotation.y = -Math.PI / 2;
      parts.push({ mesh: pic });
    });

    // Pennant bunting strung high across the front interior.
    const buntY = h - 1.8;
    const buntZ = d / 2 - 2.0;
    const buntParts: THREE.BufferGeometry[] = [
      tintedBox(2 * xi - 1.6, 0.03, 0.03, 0, buntY + 0.18, buntZ, PALETTE.lampPole), // cord
    ];
    const flags = Math.max(6, Math.round((2 * xi - 1.6) / 0.6));
    for (let i = 0; i < flags; i++) {
      const fx = -xi + 0.8 + ((2 * xi - 1.6) / (flags - 1)) * i;
      buntParts.push(tintedBox(0.26, 0.3, 0.02, fx, buntY, buntZ, i % 2 ? PALETTE.awningRed : PALETTE.awningStripe));
    }
    parts.push({ mesh: tintedMesh(mergeTinted(buntParts)) });

    // Welcome mat at the entrance — clearly above the tiled floor, two stacked
    // layers with a real gap so they don't z-fight.
    const mat = tintedMesh(mergeTinted([
      tintedBox(2.6, 0.04, 1.4, 0, FLOOR_TOP + 0.09, d / 2 - 1.9, PALETTE.benchRed),
      tintedBox(2.2, 0.03, 1.0, 0, FLOOR_TOP + 0.12, d / 2 - 1.9, PALETTE.awningStripe),
    ]));
    parts.push({ mesh: mat });

    // Freestanding coffee bar between the display case and the café tables.
    pushFitting(parts, anchors, makeCoffeeCounter(-xi + 5.8, caseZ + caseLen / 2 + 2.8));

    // Glass drinks fridge against the right wall, in the gap behind the seating.
    pushFitting(parts, anchors, makeDrinksFridge(xi - 0.3, -d / 2 + 6.0, -Math.PI / 2));

    // Wall clock on the back wall, above the kitchen run.
    const clock = makeWallClock();
    clock.position.set(3.0, 4.6, backZ + 0.06);
    parts.push({ mesh: clock });

    // Ceiling beams across the interior (clear of the pendant drop points).
    for (const bz of [d / 2 - 2.0, d / 2 - 8.0, backZ + 4.0]) {
      const beam = tintedMesh(tintedBox(2 * xi, 0.18, 0.28, 0, ceilY - 0.12, bz, PALETTE.trimBrown));
      parts.push({ mesh: beam });
    }

    // A hanging planter in the front-right corner.
    const hang = new THREE.Group();
    hang.position.set(xi - 1.8, ceilY, d / 2 - 3.0);
    hang.add(tintedMesh(mergeTinted([
      tintedBox(0.03, 1.5, 0.03, 0, -0.75, 0, PALETTE.lampPole),     // cord
      tintedBox(0.42, 0.32, 0.42, 0, -1.66, 0, PALETTE.caseWood),    // pot
      tintedBox(0.52, 0.26, 0.52, 0, -1.42, 0, PALETTE.leaf),        // foliage
      tintedBox(0.3, 0.2, 0.3, 0.18, -1.28, 0.1, PALETTE.leafDeep),  // foliage tuft
    ])));
    parts.push({ mesh: hang });

    // ── EXTERIOR: pavement apron, clad facade, stone elevation, windows, roof ──
    pushFitting(parts, anchors, makePavement(w, d));
    pushFitting(parts, anchors, makeExteriorFacade(w, d, h));
    pushFitting(parts, anchors, makeFrontElevation(w, d));
    pushFitting(parts, anchors, makeSideWindows(w, d, h));
    pushFitting(parts, anchors, makeRooftopUnit(w, d, h));
    pushFitting(parts, anchors, makeSideDownspouts(w, d, h));

    // A small "Cake House" sign on the left side wall near the front corner
    // (echoes the SIDE view in the reference). Faces outward (-x).
    const sideSign = makeTextSignMesh({ text: "Cake House", w: Math.min(3.2, d * 0.18), h: 0.6, boardColor: PALETTE.awningRed, glow: 0.8 });
    sideSign.position.set(-w / 2 - 0.16, h - 1.9, d / 2 - 1.6);
    sideSign.rotation.y = -Math.PI / 2;   // board faces -x (outward on the left wall)
    parts.push({ mesh: sideSign });

    // Glowing lanterns on the front wall flanking the entrance.
    for (const sgn of [-1, 1]) {
      const lamp = makeWallLampMesh();   // the lamp carries its own glow + light
      lamp.position.set(sgn * (w / 2 - 0.5), 3.2, d / 2 - 0.1);
      parts.push({ mesh: lamp });
    }

    // ── EXTERIOR BACK: roll-up loading door + service door + dumpster + crates ─
    const backOut = -d / 2 - 0.05;
    const rollParts: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 8; i++) {
      rollParts.push(tintedBox(3.2, 0.34, 0.06, 0, 0.3 + i * 0.36, 0, i % 2 ? PALETTE.rollDoor : PALETTE.steelDark));
    }
    const roll = tintedMesh(mergeTinted(rollParts));
    roll.position.set(0, 0, backOut);
    parts.push({ mesh: roll });

    const svcDoor = tintedMesh(tintedBox(1.0, 2.2, 0.06, -w / 2 + 2.0, 1.1, backOut, PALETTE.facadeDoor));
    parts.push({ mesh: svcDoor });

    // Drainpipes, electrical conduit/panel, and vents on the back wall.
    pushFitting(parts, anchors, makeBackUtilities(w, d, h));

    const dumpX = w / 2 - 2.5;
    const dumpZ = -d / 2 - 1.2;
    const dump = tintedMesh(mergeTinted([
      tintedBox(1.7, 1.2, 1.1, 0, 0.6, 0, PALETTE.dumpster),
      tintedBox(1.76, 0.12, 1.16, 0, 1.26, 0, PALETTE.steelDark),
    ]));
    dump.position.set(dumpX, 0, dumpZ);
    parts.push({
      mesh: dump,
      colliders: [solidBox(dumpX, 0.6, dumpZ, 1.7, 1.2, 1.1)],
      obstacles: [{ x: dumpX, z: dumpZ, w: 1.8, d: 1.2 }],
    });

    for (const [crx, crz, cs] of [
      [w / 2 - 4.5, -d / 2 - 1.0, 0.8],
      [w / 2 - 4.2, -d / 2 - 1.9, 0.6],
      [w / 2 - 5.6, -d / 2 - 1.1, 0.7],   // extra crate (matches the BACK view's stack)
    ] as [number, number, number][]) {
      const crate = tintedMesh(tintedBox(cs, cs, cs, 0, cs / 2, 0, PALETTE.benchWood));
      crate.position.set(crx, 0, crz);
      parts.push({
        mesh: crate,
        colliders: [solidBox(crx, cs / 2, crz, cs, cs, cs)],
        obstacles: [{ x: crx, z: crz, w: cs, d: cs }],
      });
    }

    // Yellow safety bollards flanking the roll-up loading door (BACK view).
    for (const bx of [-2.1, 2.1]) {
      const bz = -d / 2 - 0.5;
      const bollard = tintedMesh(mergeTinted([
        tintedBox(0.24, 0.9, 0.24, 0, 0.45, 0, PALETTE.yellowLine),
        tintedBox(0.26, 0.12, 0.26, 0, 0.78, 0, PALETTE.steelDark), // dark band near the top
      ]));
      bollard.position.set(bx, 0, bz);
      parts.push({
        mesh: bollard,
        colliders: [solidBox(bx, 0.45, bz, 0.24, 0.9, 0.24)],
        obstacles: [{ x: bx, z: bz, w: 0.3, d: 0.3 }],
      });
    }

    // Hand-truck / dolly leaning against the back wall by the crates.
    const dollyX = w / 2 - 6.8;
    const dollyZ = -d / 2 - 0.45;
    const dolly = tintedMesh(mergeTinted([
      tintedBox(0.7, 0.06, 0.5, 0, 0.05, 0.25, PALETTE.steelDark),   // toe plate (out from wall)
      tintedBox(0.06, 1.4, 0.06, -0.3, 0.7, 0, PALETTE.steel),       // left rail
      tintedBox(0.06, 1.4, 0.06, 0.3, 0.7, 0, PALETTE.steel),        // right rail
      tintedBox(0.66, 0.06, 0.06, 0, 1.35, 0, PALETTE.steel),        // top crossbar / handle
      tintedBox(0.66, 0.06, 0.06, 0, 0.8, 0, PALETTE.steel),         // mid crossbar
      cylinderY(0.18, 0.08, -0.3, 0.18, 0.18, PALETTE.lampPole, 12), // left wheel
      cylinderY(0.18, 0.08, 0.3, 0.18, 0.18, PALETTE.lampPole, 12),  // right wheel
    ]));
    dolly.position.set(dollyX, 0, dollyZ);
    dolly.rotation.x = -0.18;   // leaning back against the wall
    parts.push({
      mesh: dolly,
      obstacles: [{ x: dollyX, z: dollyZ, w: 0.8, d: 0.6 }],
    });

    // ── Compose ──────────────────────────────────────────────────────────────
    const result = compose(parts);

    result.anchors = {
      door: { x: 0, z: d / 2 } as Vec2,
      ...anchors,
    };

    result.pois = [
      { kind: "restaurant", label: "Cake House", radius: 4.5, anchor: "door" },
    ];

    return result;
  },
});
