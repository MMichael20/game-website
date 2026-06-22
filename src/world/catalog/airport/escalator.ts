// src/world/catalog/airport/escalator.ts
//
// "escalator" — a decorative escalator bank treated as a solid inclined ramp.
// Ascending toward -z (top at z=-run, bottom at z=0), rises from y=0 to y=rise.
// LOCAL space: centered x=0, base y=0, FRONT faces +z (bottom of escalator).
// ~1u = 1m. Fully deterministic.

import * as THREE from "three";
import { defineObject } from "../../system/registry";
import {
  tintedBox, disc, mergeTinted, tintedMesh,
} from "../../objects/voxel";
import { PALETTE } from "../../palette";
import type { ObjectResult, Box, Rect } from "../../system/types";

function solidBox(x: number, y: number, z: number, bw: number, bh: number, bd: number): Box {
  return { x, y, z, hx: bw / 2, hy: bh / 2, hz: bd / 2 };
}

// Colors
const STEP_SILVER   = 0xb8bcc0;  // metallic step tread
const STEP_EDGE     = 0x888c90;  // step riser / edge
const BALUSTRADE    = 0xd8d5ce;  // glass balustrade panel (opaque tint)
const HANDRAIL_COL  = 0x333333;  // dark moving handrail cap
const NEWEL_COL     = PALETTE.steel;
const COMB_COL      = 0x999999;  // comb plate at ends
const SKIRT_COLOR   = 0x9a9ea2;  // side skirt panel between balustrade and step
const TRUSS_COLOR   = 0x7a7e82;  // structural truss under stairs
const FLOOR_SLAB    = 0xe0ddd8;  // landing floor plates at top + bottom
const LANDING_EDGE  = 0x2980b9;  // blue accent on landing nosing

interface EscalatorParams {
  rise: number;
  run: number;
}

defineObject("escalator", {
  params: { rise: 4, run: 7 } as EscalatorParams,
  build(p: EscalatorParams): ObjectResult {
    const { rise, run } = p;

    const parts: THREE.BufferGeometry[] = [];
    const colliders: Box[] = [];
    const obstacles: Rect[] = [];
    const group = new THREE.Group();

    // ── Geometry derivations ───────────────────────────────────────────────
    const escW       = 1.6;   // total width of one escalator unit
    const stepDepth  = 0.38;  // horizontal run per step
    const stepHeight = 0.22;  // vertical rise per step
    const nSteps     = Math.round(run / stepDepth);

    // Incline angle
    const inclineAngle = Math.atan2(rise, run);  // angle above horizontal

    // ── Landing floors at bottom (z=0) and top (z=-run) ───────────────────
    const landingD = 0.9;
    const landingH = 0.12;
    parts.push(tintedBox(escW + 0.6, landingH, landingD, 0, landingH / 2, landingD / 2, FLOOR_SLAB));
    parts.push(tintedBox(escW + 0.6, 0.06, landingD, 0, landingH + 0.03, landingD / 2, LANDING_EDGE));
    parts.push(tintedBox(escW + 0.6, landingH, landingD, 0, rise + landingH / 2, -run - landingD / 2, FLOOR_SLAB));
    parts.push(tintedBox(escW + 0.6, 0.06, landingD, 0, rise + landingH + 0.03, -run - landingD / 2, LANDING_EDGE));

    // ── Structural truss (the inclined box running under the steps) ────────
    const trussH  = 0.45;
    const trussLen = Math.sqrt(run * run + rise * rise);
    const trussGeo = new THREE.BoxGeometry(escW, trussH, trussLen);
    trussGeo.rotateX(-inclineAngle);
    // Center of truss sits at the mid-slope point
    trussGeo.translate(0, rise / 2 - Math.sin(inclineAngle) * trussH / 2, -run / 2);
    {
      const col = TRUSS_COLOR;
      const cr = ((col >> 16) & 0xff) / 255;
      const cg = ((col >> 8) & 0xff) / 255;
      const cb = (col & 0xff) / 255;
      const positions = trussGeo.attributes.position;
      const colors: number[] = [];
      for (let v = 0; v < positions.count; v++) { colors.push(cr, cg, cb); }
      trussGeo.setAttribute("color", new THREE.BufferAttribute(new Float32Array(colors), 3));
    }
    parts.push(trussGeo);

    // ── Steps ──────────────────────────────────────────────────────────────
    // Each step: a horizontal tread + a vertical riser
    const TREAD_T  = 0.05;   // tread thickness
    const RISER_T  = 0.04;   // riser thickness
    const STEP_W   = escW - 0.12;  // step clear width (inset from side skirt)

    for (let si = 0; si < nSteps; si++) {
      const stepX = 0;
      // Steps ascend toward -z; step si starts at z = -si*stepDepth, y = si*stepHeight
      const stepZ  = -si * stepDepth - stepDepth / 2;
      const stepY  = si * stepHeight + stepHeight / 2;

      // Tread (horizontal)
      parts.push(tintedBox(STEP_W, TREAD_T, stepDepth, stepX, stepY + TREAD_T / 2, stepZ, STEP_SILVER));
      // Tread front edge groove (darker line)
      parts.push(tintedBox(STEP_W, 0.03, 0.04, stepX, stepY + TREAD_T, stepZ + stepDepth / 2 - 0.02, 0x555555));
      // Riser (vertical face)
      parts.push(tintedBox(STEP_W, stepHeight, RISER_T, stepX, stepY - stepHeight / 2 + TREAD_T, stepZ + stepDepth / 2 + RISER_T / 2, STEP_EDGE));
    }

    // ── Side skirt panels (angled panels along each side of the steps) ────
    const skirtT    = 0.08;
    const skirtLen  = Math.sqrt(run * run + rise * rise) + 0.3;
    const halfW     = escW / 2;

    for (const side of [-1, 1]) {
      const sx = side * (halfW + skirtT / 2);
      const skirtGeo = new THREE.BoxGeometry(skirtT, skirtT * 1.5, skirtLen);
      skirtGeo.rotateX(-inclineAngle);
      skirtGeo.translate(sx, rise / 2, -run / 2);
      const col = SKIRT_COLOR;
      const cr = ((col >> 16) & 0xff) / 255;
      const cg = ((col >> 8) & 0xff) / 255;
      const cb = (col & 0xff) / 255;
      const positions = skirtGeo.attributes.position;
      const colors: number[] = [];
      for (let v = 0; v < positions.count; v++) { colors.push(cr, cg, cb); }
      skirtGeo.setAttribute("color", new THREE.BufferAttribute(new Float32Array(colors), 3));
      parts.push(skirtGeo);

      // ── Balustrade panel (angled, above the skirt) ──────────────────────
      const baluH    = 1.0;  // balustrade height above step nose level
      const baluGeo  = new THREE.BoxGeometry(0.06, baluH, skirtLen * 0.98);
      baluGeo.rotateX(-inclineAngle);
      baluGeo.translate(sx, rise / 2 + baluH * 0.5 * Math.cos(inclineAngle), -run / 2);
      const bc = BALUSTRADE;
      const br = ((bc >> 16) & 0xff) / 255;
      const bg = ((bc >> 8) & 0xff) / 255;
      const bb = (bc & 0xff) / 255;
      const bpos = baluGeo.attributes.position;
      const bcolors: number[] = [];
      for (let v = 0; v < bpos.count; v++) { bcolors.push(br, bg, bb); }
      baluGeo.setAttribute("color", new THREE.BufferAttribute(new Float32Array(bcolors), 3));
      parts.push(baluGeo);

      // ── Handrail cap on top of balustrade ──────────────────────────────
      const hrH     = 0.12;
      const hrGeo   = new THREE.BoxGeometry(0.12, hrH, skirtLen + 0.1);
      hrGeo.rotateX(-inclineAngle);
      hrGeo.translate(sx, rise / 2 + baluH * Math.cos(inclineAngle) + hrH * 0.5, -run / 2);
      const hc = HANDRAIL_COL;
      const hr2 = ((hc >> 16) & 0xff) / 255;
      const hg  = ((hc >> 8) & 0xff) / 255;
      const hb  = (hc & 0xff) / 255;
      const hpos = hrGeo.attributes.position;
      const hcolors: number[] = [];
      for (let v = 0; v < hpos.count; v++) { hcolors.push(hr2, hg, hb); }
      hrGeo.setAttribute("color", new THREE.BufferAttribute(new Float32Array(hcolors), 3));
      parts.push(hrGeo);
    }

    // ── Newel posts at bottom and top ─────────────────────────────────────
    const newelH   = 1.4;
    const newelBase = 0.14;
    // Bottom posts (z=0, y=0)
    for (const sx of [-halfW - 0.04, halfW + 0.04]) {
      parts.push(tintedBox(newelBase, newelH, newelBase, sx, newelH / 2, 0.1, NEWEL_COL));
      parts.push(disc(newelBase, 0.1, sx, newelH, 0.1, NEWEL_COL, 8));
    }
    // Top posts (z=-run, y=rise)
    for (const sx of [-halfW - 0.04, halfW + 0.04]) {
      parts.push(tintedBox(newelBase, newelH, newelBase, sx, rise + newelH / 2, -run - 0.1, NEWEL_COL));
      parts.push(disc(newelBase, 0.1, sx, rise + newelH, -run - 0.1, NEWEL_COL, 8));
    }

    // ── Comb plates at each end ────────────────────────────────────────────
    const combH = 0.08;
    const combD = 0.25;
    parts.push(tintedBox(escW, combH, combD, 0, combH / 2, combD / 2 + 0.01, COMB_COL));           // bottom
    parts.push(tintedBox(escW, combH, combD, 0, rise + combH / 2, -run - combD / 2 - 0.01, COMB_COL));  // top

    // ── Colliders (stacked axis-aligned boxes climbing the incline) ────────
    // Divide the run into 4 stacked boxes that approximate the inclined mass
    const COL_SEGS = 4;
    for (let ci = 0; ci < COL_SEGS; ci++) {
      const t0 = ci / COL_SEGS;
      const t1 = (ci + 1) / COL_SEGS;
      const segZ0  = -t0 * run;
      const segZ1  = -t1 * run;
      const segY0  = t0 * rise;
      const segY1  = t1 * rise;
      const segW   = run / COL_SEGS;
      const segH   = segY1 - segY0;
      const midZ   = (segZ0 + segZ1) / 2;
      const midY   = (segY0 + segY1) / 2;
      // Make each collider full height up to segment ceiling (so player can't clip under)
      colliders.push(solidBox(0, midY / 2 + segH / 4, midZ, escW + 0.4, midY + segH, segW + 0.1));
    }

    // ── Obstacle for the footprint ─────────────────────────────────────────
    obstacles.push({ x: 0, z: -run / 2, w: escW + 0.6, d: run + landingD * 2 });

    // ── Merge opaque geometry ─────────────────────────────────────────────
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
