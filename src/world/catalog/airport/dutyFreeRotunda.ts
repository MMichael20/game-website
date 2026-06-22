// src/world/catalog/airport/dutyFreeRotunda.ts
//
// "dutyFreeRotunda" — a circular duty-free hall with ring-of-shop bays and a central fountain.
// LOCAL space: centered x=z=0, base y=0. ~1u = 1m. Fully deterministic.

import * as THREE from "three";
import { defineObject } from "../../system/registry";
import { buildObject } from "../../system/registry";
import { applyTransform } from "../../system/transform";
import {
  tintedBox, cylinderY, disc, ringAngles, mergeTinted, tintedMesh,
} from "../../objects/voxel";
import { makeTextSignMesh } from "../../objects/textSign";
import { PALETTE } from "../../palette";
import { mulberry32 } from "../../rng";
import type { ObjectResult, Box, Rect } from "../../system/types";

// Shop counter accent colors for the 8 bays
const BAY_ACCENTS = [
  0x2980b9, 0xc0392b, 0x27ae60, 0xe67e22,
  0x8e44ad, 0x16a085, 0xd35400, 0x1a5fa0,
];

// Product colors for shelving
const PRODUCT_COLORS = [
  0xc0392b, 0x2980b9, 0x27ae60, 0xf39c12, 0x8e44ad,
  0x16a085, 0xe67e22, 0xf1c40f, 0x2c3e50, 0xd35400,
];

const FLOOR_OUTER   = 0xe8e4dc;  // outer ring floor
const COLUMN_COLOR  = PALETTE.steelLight;
const COUNTER_BODY  = 0xf0ede6;
const BACKWALL_COL  = 0xfafaf8;
const SHELF_COL     = 0xe8e5de;
const STONE_COL     = 0xcab697;

interface DutyFreeRotundaParams {
  r: number;
}

defineObject("dutyFreeRotunda", {
  params: { r: 14 } as DutyFreeRotundaParams,
  build(p: DutyFreeRotundaParams): ObjectResult {
    const { r } = p;
    const rng = mulberry32(0xc10cba77);

    const parts: THREE.BufferGeometry[] = [];
    const colliders: Box[] = [];
    const obstacles: Rect[] = [];
    const group = new THREE.Group();

    const floorT = 0.12;

    // ── Floor: concentric disc rings forming a medallion ─────────────────
    // Outer walkway ring
    parts.push(disc(r + 2.0, floorT, 0, floorT / 2, 0, FLOOR_OUTER, 48));
    // Decorative tile rings
    const TILE_RINGS = [
      { r: r - 0.5, col: 0xd0c8b8 },  // outer medallion ring
      { r: r - 1.5, col: 0x2980b9 },  // accent ring
      { r: r - 2.0, col: 0xd0c8b8 },
      { r: r - 3.5, col: 0xf2c14e },  // gold ring
      { r: r - 4.0, col: 0xd0c8b8 },
    ];
    for (const ring of TILE_RINGS) {
      parts.push(disc(ring.r, floorT + 0.008, 0, floorT / 2, 0, ring.col, 48));
    }
    // Central floor medallion (light cream)
    parts.push(disc(r - 4.5, floorT + 0.01, 0, floorT / 2, 0, 0xf8f4ec, 48));

    // ── Ring of columns at radius r ─────────────────────────────────────
    const COL_COUNT = 12;
    const colH = 5.2;
    const colR = 0.3;
    for (const a of ringAngles(COL_COUNT)) {
      const cx = Math.cos(a) * r;
      const cz = Math.sin(a) * r;
      parts.push(cylinderY(colR, colH, cx, colH / 2, cz, COLUMN_COLOR, 10));
      // Column base plinth
      parts.push(tintedBox(colR * 3, 0.22, colR * 3, cx, 0.11, cz, STONE_COL));
      // Column capital (wider flat disc at top)
      parts.push(disc(colR * 1.8, 0.18, cx, colH + 0.09, cz, STONE_COL, 10));
    }

    // ── Ring beam connecting column tops ────────────────────────────────
    // Approximate with many short tintedBox segments
    const BEAM_SEGS = 36;
    for (let bi = 0; bi < BEAM_SEGS; bi++) {
      const a1 = (bi / BEAM_SEGS) * Math.PI * 2;
      const a2 = ((bi + 1) / BEAM_SEGS) * Math.PI * 2;
      const cx = Math.cos((a1 + a2) / 2) * r;
      const cz = Math.sin((a1 + a2) / 2) * r;
      const tangAngle = Math.atan2(-Math.sin((a1 + a2) / 2), Math.cos((a1 + a2) / 2));
      const segLen = 2 * r * Math.sin(Math.PI / BEAM_SEGS) + 0.05;
      const g = new THREE.BoxGeometry(segLen, 0.4, 0.45);
      g.rotateY(tangAngle);
      g.translate(cx, colH + 0.3, cz);
      const col = 0xc8c4bc;
      const cr = ((col >> 16) & 0xff) / 255;
      const cg = ((col >> 8) & 0xff) / 255;
      const cb = (col & 0xff) / 255;
      const positions = g.attributes.position;
      const colors: number[] = [];
      for (let v = 0; v < positions.count; v++) { colors.push(cr, cg, cb); }
      g.setAttribute("color", new THREE.BufferAttribute(new Float32Array(colors), 3));
      parts.push(g);
    }

    // ── 8 shop bays around the ring, facing inward (toward center) ────────
    const BAY_COUNT = 8;
    const bayAngles = ringAngles(BAY_COUNT);
    const bayW = 3.8;       // tangential bay width
    const backWallD = 0.25; // depth of back wall panel
    const counterW = bayW - 0.6;
    const counterH = 1.05;
    const counterD = 0.7;
    const counterDist = r - 1.0;  // from center to front face of counter

    for (let bi = 0; bi < BAY_COUNT; bi++) {
      const a = bayAngles[bi];
      const accent = BAY_ACCENTS[bi % BAY_ACCENTS.length];

      // Inward direction (toward center): unit vector
      const inX = -Math.cos(a);
      const inZ = -Math.sin(a);

      // Back wall position (at radius r, facing inward)
      const bwX = Math.cos(a) * (r - backWallD / 2);
      const bwZ = Math.sin(a) * (r - backWallD / 2);
      const bwAngle = Math.atan2(inZ, inX); // yaw to face inward

      // Back wall panel
      const bwGeo = new THREE.BoxGeometry(bayW, 3.5, backWallD);
      bwGeo.rotateY(-bwAngle + Math.PI / 2);
      bwGeo.translate(bwX, 1.75, bwZ);
      {
        const col = BACKWALL_COL;
        const cr = ((col >> 16) & 0xff) / 255;
        const cg = ((col >> 8) & 0xff) / 255;
        const cb = (col & 0xff) / 255;
        const pos = bwGeo.attributes.position;
        const colors: number[] = [];
        for (let v = 0; v < pos.count; v++) { colors.push(cr, cg, cb); }
        bwGeo.setAttribute("color", new THREE.BufferAttribute(new Float32Array(colors), 3));
      }
      parts.push(bwGeo);

      // Shelving on back wall (3 shelf boards)
      for (let si = 0; si < 3; si++) {
        const sy = 0.7 + si * 0.82;
        const sx = Math.cos(a) * (r - backWallD - 0.04);
        const sz = Math.sin(a) * (r - backWallD - 0.04);
        const shelfGeo = new THREE.BoxGeometry(bayW - 0.3, 0.05, 0.35);
        shelfGeo.rotateY(-bwAngle + Math.PI / 2);
        shelfGeo.translate(sx, sy, sz);
        const col = SHELF_COL;
        const cr = ((col >> 16) & 0xff) / 255;
        const cg = ((col >> 8) & 0xff) / 255;
        const cb = (col & 0xff) / 255;
        const pos = shelfGeo.attributes.position;
        const colors: number[] = [];
        for (let v = 0; v < pos.count; v++) { colors.push(cr, cg, cb); }
        shelfGeo.setAttribute("color", new THREE.BufferAttribute(new Float32Array(colors), 3));
        parts.push(shelfGeo);

        // Products on shelf
        const nProds = 5;
        for (let pi = 0; pi < nProds; pi++) {
          const prodH = 0.11 + rng() * 0.14;
          const prodW = 0.07 + rng() * 0.05;
          const col2 = PRODUCT_COLORS[Math.floor(rng() * PRODUCT_COLORS.length)];
          const offset = -bayW / 2 + 0.25 + pi * ((bayW - 0.4) / nProds);
          // Offset along tangent direction
          const tangX = Math.cos(a + Math.PI / 2);
          const tangZ = Math.sin(a + Math.PI / 2);
          const px = sx + tangX * offset;
          const pz = sz + tangZ * offset;
          parts.push(tintedBox(prodW, prodH, prodW, px, sy + 0.025 + prodH / 2, pz, col2));
        }
      }

      // Counter at inward face
      const ccX = Math.cos(a) * counterDist;
      const ccZ = Math.sin(a) * counterDist;
      const counterGeo = new THREE.BoxGeometry(counterW, counterH, counterD);
      counterGeo.rotateY(-bwAngle + Math.PI / 2);
      counterGeo.translate(ccX, counterH / 2, ccZ);
      {
        const col = COUNTER_BODY;
        const cr = ((col >> 16) & 0xff) / 255;
        const cg = ((col >> 8) & 0xff) / 255;
        const cb = (col & 0xff) / 255;
        const pos = counterGeo.attributes.position;
        const colors: number[] = [];
        for (let v = 0; v < pos.count; v++) { colors.push(cr, cg, cb); }
        counterGeo.setAttribute("color", new THREE.BufferAttribute(new Float32Array(colors), 3));
      }
      parts.push(counterGeo);

      // Counter top
      const ctopGeo = new THREE.BoxGeometry(counterW + 0.08, 0.07, counterD + 0.08);
      ctopGeo.rotateY(-bwAngle + Math.PI / 2);
      ctopGeo.translate(ccX, counterH + 0.035, ccZ);
      {
        const col = 0xf0ede6;
        const cr = ((col >> 16) & 0xff) / 255;
        const cg = ((col >> 8) & 0xff) / 255;
        const cb = (col & 0xff) / 255;
        const pos = ctopGeo.attributes.position;
        const colors: number[] = [];
        for (let v = 0; v < pos.count; v++) { colors.push(cr, cg, cb); }
        ctopGeo.setAttribute("color", new THREE.BufferAttribute(new Float32Array(colors), 3));
      }
      parts.push(ctopGeo);

      // Accent fascia strip on counter front
      const fasciaGeo = new THREE.BoxGeometry(counterW, 0.18, 0.04);
      fasciaGeo.rotateY(-bwAngle + Math.PI / 2);
      const fasciaInX = ccX + inX * (counterD / 2 + 0.025);
      const fasciaInZ = ccZ + inZ * (counterD / 2 + 0.025);
      fasciaGeo.translate(fasciaInX, counterH * 0.4, fasciaInZ);
      {
        const col = accent;
        const cr = ((col >> 16) & 0xff) / 255;
        const cg = ((col >> 8) & 0xff) / 255;
        const cb = (col & 0xff) / 255;
        const pos = fasciaGeo.attributes.position;
        const colors: number[] = [];
        for (let v = 0; v < pos.count; v++) { colors.push(cr, cg, cb); }
        fasciaGeo.setAttribute("color", new THREE.BufferAttribute(new Float32Array(colors), 3));
      }
      parts.push(fasciaGeo);

      // Bay sign overhead
      const signX = Math.cos(a) * (r - 1.5);
      const signZ = Math.sin(a) * (r - 1.5);
      const baySign = makeTextSignMesh({
        text: `Bay ${bi + 1}`,
        w: 1.8,
        h: 0.42,
        boardColor: accent,
        textColor: "#ffffff",
        glow: 0.7,
      });
      // Position above the counter, facing inward
      baySign.position.set(signX - inX * 0.1, counterH + 1.05, signZ - inZ * 0.1);
      baySign.rotation.y = -bwAngle + Math.PI / 2 + Math.PI;
      group.add(baySign);

      // Bay obstacle
      const obsR = r - 0.5;
      const obsX = Math.cos(a) * obsR;
      const obsZ = Math.sin(a) * obsR;
      obstacles.push({ x: obsX, z: obsZ, w: bayW, d: counterD + backWallD + 1.0 });
    }

    // ── Central fountain (use buildObject("fountain") or inline) ─────────
    // Use the registered "fountain" object
    const fountainResult = buildObject("fountain", { r: 2.2, tiers: 2 });
    const fountainXformed = applyTransform(fountainResult, { x: 0, z: 0, rot: 0 });
    group.add(fountainXformed.mesh);
    if (fountainXformed.colliders) colliders.push(...fountainXformed.colliders);
    if (fountainXformed.obstacles) obstacles.push(...fountainXformed.obstacles);

    // Fountain surround (a ring of darker tile around the fountain base)
    parts.push(disc(3.5, 0.06, 0, floorT + 0.005, 0, 0xd0c8b8, 32));
    parts.push(disc(2.8, 0.06, 0, floorT + 0.006, 0, 0x2980b9, 32));

    // ── Ceiling dome suggestion (flat disc at top of columns) ────────────
    parts.push(disc(r - 0.2, 0.3, 0, colH + 0.6, 0, 0xe8e4de, 48));
    // Skylight ring (lighter disc in center)
    parts.push(disc(r * 0.4, 0.1, 0, colH + 0.65, 0, 0xd8eefa, 32));

    // ── Merge all opaque geometry ─────────────────────────────────────────
    const mainMesh = tintedMesh(mergeTinted(parts));
    mainMesh.castShadow = true;
    mainMesh.receiveShadow = true;
    group.add(mainMesh);

    return {
      mesh: group,
      colliders,
      obstacles,
    };
  },
});
