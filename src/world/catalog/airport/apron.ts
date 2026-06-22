// src/world/catalog/airport/apron.ts
//
// A large concrete aircraft parking pad with painted stand markings.
// Visual only — no collider (ground plane handles walkability).
// LOCAL space: centered x=z=0, base y=0, front +z.

import * as THREE from "three";
import { defineObject } from "../../system/registry";
import {
  tintedBox, mergeTinted, tintedMesh, DECAL_GAP,
} from "../../objects/voxel";
import { makeTextSignMesh } from "../../objects/textSign";
import { PALETTE } from "../../palette";
import type { ObjectResult } from "../../system/types";

interface ApronParams {
  w: number;
  d: number;
  stand: string;
}

defineObject("apron", {
  params: { w: 60, d: 50, stand: "B7" } as ApronParams,
  build(p: ApronParams): ObjectResult {
    const { w, d } = p;
    const slabY = DECAL_GAP;          // just above ground
    const markY = slabY + DECAL_GAP;  // markings proud of slab

    const parts: THREE.BufferGeometry[] = [];

    // ── Concrete slab ─────────────────────────────────────────────────────
    const CONCRETE = 0xc2bfb6;
    parts.push(tintedBox(w, 0.06, d, 0, slabY, 0, CONCRETE));

    // ── Subtle expansion-joint grid ───────────────────────────────────────
    const JOINT = 0xb0ada4;
    const jRows = Math.floor(d / 10);
    const jCols = Math.floor(w / 10);
    for (let r = 1; r < jRows; r++) {
      const jz = -d / 2 + r * (d / jRows);
      parts.push(tintedBox(w, 0.04, 0.12, 0, markY - DECAL_GAP * 0.5, jz, JOINT));
    }
    for (let c = 1; c < jCols; c++) {
      const jx = -w / 2 + c * (w / jCols);
      parts.push(tintedBox(0.12, 0.04, d, jx, markY - DECAL_GAP * 0.5, 0, JOINT));
    }

    // ── Lead-in centreline (dashed yellow, along z from front to stop bar) ─
    const lineCol = PALETTE.yellowLine;
    const dashLen = 2.4;
    const dashGap = 1.6;
    const nDashes = Math.floor(d * 0.7 / (dashLen + dashGap));
    const leadStartZ = -d * 0.1;   // start near front
    for (let i = 0; i < nDashes; i++) {
      const dz = leadStartZ - i * (dashLen + dashGap) - dashLen / 2;
      parts.push(tintedBox(0.25, 0.04, dashLen, 0, markY, dz, lineCol));
    }
    // Solid centreline extension at the very front (entry)
    parts.push(tintedBox(0.25, 0.04, d * 0.12, 0, markY, -d / 2 + d * 0.06, lineCol));

    // ── Turn guidance arc — approx with short angled segments ────────────
    const arcR = d * 0.18;
    const arcSegs = 6;
    const arcStartAngle = Math.PI;     // from straight-ahead
    const arcEndAngle   = Math.PI * 1.45;
    for (let s = 0; s < arcSegs; s++) {
      const a0 = arcStartAngle + (s / arcSegs) * (arcEndAngle - arcStartAngle);
      const a1 = arcStartAngle + ((s + 1) / arcSegs) * (arcEndAngle - arcStartAngle);
      const mx = (Math.cos(a0) + Math.cos(a1)) / 2 * arcR * 0.7;
      const mz = (Math.sin(a0) + Math.sin(a1)) / 2 * arcR - d * 0.22;
      const ang = Math.atan2(Math.sin(a1) - Math.sin(a0), Math.cos(a1) - Math.cos(a0));
      const segLen = arcR * (arcEndAngle - arcStartAngle) / arcSegs + 0.05;
      const arcGeo = new THREE.BoxGeometry(0.22, 0.04, segLen);
      arcGeo.applyMatrix4(new THREE.Matrix4().makeRotationY(ang));
      arcGeo.translate(mx, markY, mz);
      const col = new THREE.Color(lineCol);
      const n = arcGeo.attributes.position.count;
      const colors = new Float32Array(n * 3);
      for (let j = 0; j < n; j++) { colors[j*3]=col.r; colors[j*3+1]=col.g; colors[j*3+2]=col.b; }
      arcGeo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
      parts.push(arcGeo);
    }

    // ── Stop bar (solid yellow line across the pad, near mid) ─────────────
    const stopZ = d * 0.05;
    parts.push(tintedBox(w * 0.55, 0.05, 0.4, 0, markY, stopZ, lineCol));

    // ── Side safety boundary lines ─────────────────────────────────────────
    const edgeOff = w / 2 - 1.5;
    const WHITE   = PALETTE.laneLine;
    parts.push(tintedBox(0.3, 0.04, d - 2, -edgeOff, markY, 0, WHITE));
    parts.push(tintedBox(0.3, 0.04, d - 2,  edgeOff, markY, 0, WHITE));
    // Front/rear edge bars
    parts.push(tintedBox(w - 2, 0.04, 0.3, 0, markY, -d / 2 + 1, WHITE));
    parts.push(tintedBox(w - 2, 0.04, 0.3, 0, markY,  d / 2 - 1, WHITE));

    // ── Nose-wheel centreline touchdown box (two flanking bars) ──────────
    parts.push(tintedBox(3.0, 0.04, 0.3, -0.8, markY, stopZ - 1.0, WHITE));
    parts.push(tintedBox(3.0, 0.04, 0.3,  0.8, markY, stopZ - 1.0, WHITE));

    // ── Build merged mesh ─────────────────────────────────────────────────
    const apronMesh = tintedMesh(mergeTinted(parts));
    apronMesh.receiveShadow = true;

    const group = new THREE.Group();
    group.add(apronMesh);

    // ── Stand number decal (flat canvas sign on the slab) ─────────────────
    {
      const standSign = makeTextSignMesh({
        text:       p.stand,
        w:          2.8,
        h:          1.2,
        boardColor: 0xc2bfb6,
        textColor:  "#f2c14e",
        glow:       0.0,
      });
      standSign.rotation.x = -Math.PI / 2;  // lie flat on the apron
      standSign.position.set(0, markY + 0.01, stopZ + 3.5);
      group.add(standSign);
    }

    // No colliders / obstacles (flat ground surface)
    return { mesh: group };
  },
});
