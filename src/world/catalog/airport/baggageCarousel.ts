// src/world/catalog/airport/baggageCarousel.ts
//
// "baggageCarousel" — an oval baggage-reclaim belt with slanted slats, hub, suitcases, and sign.
// LOCAL space: centered x=z=0, base y=0. ~1u = 1m. Fully deterministic.

import * as THREE from "three";
import { defineObject } from "../../system/registry";
import {
  tintedBox, cylinderY, disc, mergeTinted, tintedMesh,
} from "../../objects/voxel";
import { makeTextSignMesh } from "../../objects/textSign";
import { PALETTE } from "../../palette";
import { mulberry32 } from "../../rng";
import type { ObjectResult, Box, Rect } from "../../system/types";

function solidBox(x: number, y: number, z: number, bw: number, bh: number, bd: number): Box {
  return { x, y, z, hx: bw / 2, hy: bh / 2, hz: bd / 2 };
}

// Suitcase color palette
const LUGGAGE_COLORS = [
  0xc0392b, // red
  0x2980b9, // blue
  0x27ae60, // green
  0xf39c12, // orange/yellow
  0x8e44ad, // purple
  0x2c3e50, // navy
  0x7f8c8d, // grey
  0xe74c3c, // bright red
  0x16a085, // teal
  0xd35400, // burnt orange
];

const BELT_COLOR    = 0xb0b4b8;  // stainless steel belt
const BELT_EDGE     = 0x888c90;  // darker edge slat
const SKIRT_COLOR   = 0x9a9fa4;  // brushed steel skirt panel
const HUB_COLOR     = 0xd0d4d8;  // raised central hub
const HUB_STRIPE    = 0xf2c14e;  // yellow caution stripe on hub edge
const POST_COLOR    = PALETTE.lampPole;
const FLOOR_STRIP   = 0xe0dcd4;  // light floor around carousel

interface BaggageCarouselParams {
  rx: number;
  rz: number;
}

defineObject("baggageCarousel", {
  params: { rx: 6, rz: 3 } as BaggageCarouselParams,
  build(p: BaggageCarouselParams): ObjectResult {
    const { rx, rz } = p;
    const rng = mulberry32(0x4ba99c01);

    const parts: THREE.BufferGeometry[] = [];
    const colliders: Box[] = [];
    const obstacles: Rect[] = [];
    const group = new THREE.Group();

    // ── Floor surround (pale ring around the carousel) ─────────────────────
    const floorT = 0.08;
    // We lay a rectangular floor patch; the carousel sits on it
    parts.push(tintedBox(rx * 2 + 3.0, floorT, rz * 2 + 3.0, 0, floorT / 2, 0, FLOOR_STRIP));

    // ── Skirt base (oval approximated by 28 box slabs standing upright) ──────
    const SLAT_COUNT = 28;
    const beltH     = 0.55;   // height of the belt slat
    const beltY     = 0.65;   // vertical centre of belt
    const slatW     = 0.42;   // tangential width of each slat
    const slatD     = 0.10;   // slat thickness
    const skirtH    = 0.62;   // skirt panel below belt
    const skirtT    = 0.08;

    for (let i = 0; i < SLAT_COUNT; i++) {
      const a = (i / SLAT_COUNT) * Math.PI * 2;
      const cx = rx * Math.cos(a);
      const cz = rz * Math.sin(a);

      // Tangent angle to orient slat panels along the belt
      const ta = Math.atan2(-rz * Math.cos(a), rx * -Math.sin(a));

      // Skirt panel (below belt) — rotated, tinted manually
      {
        const g = new THREE.BoxGeometry(slatW * 1.1, skirtH, skirtT);
        g.rotateY(ta);
        g.translate(cx, skirtH / 2, cz);
        // tint all vertices
        const colors: number[] = [];
        const r_ = ((SKIRT_COLOR >> 16) & 0xff) / 255;
        const g_ = ((SKIRT_COLOR >> 8) & 0xff) / 255;
        const b_ = (SKIRT_COLOR & 0xff) / 255;
        const positions = g.attributes.position;
        for (let v = 0; v < positions.count; v++) { colors.push(r_, g_, b_); }
        g.setAttribute("color", new THREE.BufferAttribute(new Float32Array(colors), 3));
        parts.push(g);
      }

      // Belt slat (sloped: inner edge higher than outer edge — classic carousel tilt)
      // Build as a box, rotate X slightly (tilt outward), rotate Y along tangent
      const tiltAngle = 0.26; // ~15 degrees inward tilt
      {
        const g = new THREE.BoxGeometry(slatW, beltH, slatD);
        g.rotateX(-tiltAngle);
        g.rotateY(ta);
        g.translate(cx, beltY, cz);
        const r_ = ((BELT_COLOR >> 16) & 0xff) / 255;
        const g_ = ((BELT_COLOR >> 8) & 0xff) / 255;
        const b_ = (BELT_COLOR & 0xff) / 255;
        const positions = g.attributes.position;
        const colors: number[] = [];
        for (let v = 0; v < positions.count; v++) { colors.push(r_, g_, b_); }
        g.setAttribute("color", new THREE.BufferAttribute(new Float32Array(colors), 3));
        parts.push(g);
      }

      // Edge highlight slat (slightly darker, outer edge cap)
      {
        const g = new THREE.BoxGeometry(slatW, 0.06, slatD + 0.02);
        g.rotateY(ta);
        const outerX = cx * 1.08;
        const outerZ = cz * 1.08;
        g.translate(outerX, beltY + 0.22, outerZ);
        const r_ = ((BELT_EDGE >> 16) & 0xff) / 255;
        const g_ = ((BELT_EDGE >> 8) & 0xff) / 255;
        const b_ = (BELT_EDGE & 0xff) / 255;
        const positions = g.attributes.position;
        const colors: number[] = [];
        for (let v = 0; v < positions.count; v++) { colors.push(r_, g_, b_); }
        g.setAttribute("color", new THREE.BufferAttribute(new Float32Array(colors), 3));
        parts.push(g);
      }
    }

    // ── Central raised hub platform ────────────────────────────────────────
    const hubRx    = rx * 0.62;
    const hubRz    = rz * 0.62;
    const hubH     = 0.55;
    // Approximate hub with a disc (we use radius ~ geometric mean)
    const hubR     = Math.sqrt(hubRx * hubRz);
    parts.push(disc(hubR, hubH, 0, hubH / 2, 0, HUB_COLOR, 24));
    // Caution stripe ring
    parts.push(disc(hubR + 0.06, 0.06, 0, hubH + 0.03, 0, HUB_STRIPE, 24));
    parts.push(disc(hubR - 0.05, 0.04, 0, hubH + 0.02, 0, 0x222222, 24)); // inner dark ring
    // Hub top surface (lighter)
    parts.push(disc(hubR - 0.1, 0.04, 0, hubH + 0.04, 0, 0xe8e8e8, 24));

    // Collider on central hub
    colliders.push(solidBox(0, hubH / 2, 0, hubRx * 2, hubH, hubRz * 2));

    // ── Suitcases riding the belt ─────────────────────────────────────────
    const CASE_COUNT = 9;
    for (let ci = 0; ci < CASE_COUNT; ci++) {
      const a = (ci / CASE_COUNT) * Math.PI * 2;
      const cx = rx * Math.cos(a);
      const cz = rz * Math.sin(a);
      const col = LUGGAGE_COLORS[ci % LUGGAGE_COLORS.length];

      // Vary case sizes deterministically
      const cW = 0.44 + rng() * 0.22;
      const cH = 0.62 + rng() * 0.28;
      const cD = 0.22 + rng() * 0.14;
      const yaw = a + 0.3 + rng() * 0.4; // slight yaw variation

      // Build case geometry rotated to follow belt curve
      const mainCase = new THREE.BoxGeometry(cW, cH, cD);
      mainCase.rotateY(yaw);
      mainCase.translate(cx, beltY + beltH * 0.5 + cH / 2, cz);
      const r_ = ((col >> 16) & 0xff) / 255;
      const g_ = ((col >> 8) & 0xff) / 255;
      const b_ = (col & 0xff) / 255;
      {
        const positions = mainCase.attributes.position;
        const colors: number[] = [];
        for (let v = 0; v < positions.count; v++) { colors.push(r_, g_, b_); }
        mainCase.setAttribute("color", new THREE.BufferAttribute(new Float32Array(colors), 3));
      }
      parts.push(mainCase);

      // Case detail: darker handle strip
      const stripY = beltY + beltH * 0.5 + cH - 0.1;
      const handleCol = 0x222222;
      const hr = ((handleCol >> 16) & 0xff) / 255;
      const hg = ((handleCol >> 8) & 0xff) / 255;
      const hb = (handleCol & 0xff) / 255;
      const handleGeo = new THREE.BoxGeometry(cW * 0.35, 0.07, cD + 0.02);
      handleGeo.rotateY(yaw);
      handleGeo.translate(cx, stripY, cz);
      {
        const positions = handleGeo.attributes.position;
        const colors: number[] = [];
        for (let v = 0; v < positions.count; v++) { colors.push(hr, hg, hb); }
        handleGeo.setAttribute("color", new THREE.BufferAttribute(new Float32Array(colors), 3));
      }
      parts.push(handleGeo);

      // Wheel dots (two small discs per case, bottom)
      const wCol = 0x111111;
      const wr = ((wCol >> 16) & 0xff) / 255;
      const wg = ((wCol >> 8) & 0xff) / 255;
      const wb = (wCol & 0xff) / 255;
      for (const side of [-1, 1]) {
        const wheelGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.04, 8);
        wheelGeo.rotateZ(Math.PI / 2);
        wheelGeo.rotateY(yaw);
        wheelGeo.translate(cx + Math.cos(yaw + Math.PI / 2) * side * (cW * 0.35),
          beltY + beltH * 0.5 + 0.05, cz + Math.sin(yaw + Math.PI / 2) * side * (cW * 0.35));
        const positions = wheelGeo.attributes.position;
        const colors: number[] = [];
        for (let v = 0; v < positions.count; v++) { colors.push(wr, wg, wb); }
        wheelGeo.setAttribute("color", new THREE.BufferAttribute(new Float32Array(colors), 3));
        parts.push(wheelGeo);
      }
    }

    // ── Sign posts + overhead sign ─────────────────────────────────────────
    const signZ = -(rz + 1.6);
    const signPostH = 2.6;
    const signPostX = 1.2;
    // Two posts
    parts.push(cylinderY(0.06, signPostH, -signPostX, signPostH / 2, signZ, POST_COLOR));
    parts.push(cylinderY(0.06, signPostH, signPostX, signPostH / 2, signZ, POST_COLOR));
    // Crossbar
    parts.push(tintedBox(signPostX * 2 + 0.4, 0.1, 0.1, 0, signPostH - 0.05, signZ, POST_COLOR));

    const beltSign = makeTextSignMesh({
      text: "Belt 3  -  LY008",
      w: 2.8,
      h: 0.5,
      boardColor: 0x1a3a6a,
      textColor: "#ffffff",
      glow: 0.6,
    });
    beltSign.position.set(-1.4, signPostH - 0.25, signZ + 0.06);
    group.add(beltSign);

    // ── Oval footprint obstacle ────────────────────────────────────────────
    obstacles.push({ x: 0, z: 0, w: rx * 2 + 1.0, d: rz * 2 + 1.0 });

    // ── Merge all tinted geometry ──────────────────────────────────────────
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
