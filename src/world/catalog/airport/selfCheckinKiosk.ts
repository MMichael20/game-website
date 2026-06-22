// src/world/catalog/airport/selfCheckinKiosk.ts
//
// "selfCheckinKiosk" — a row of self-service check-in pedestals, each with an
// angled glowing-blue touchscreen. FRONT (screen faces) +z. base y=0. ~1u=1m.
// Deterministic.

import * as THREE from "three";
import { defineObject } from "../../system/registry";
import { tintedBox, mergeTinted, tintedMesh } from "../../objects/voxel";
import { PALETTE } from "../../palette";
import type { ObjectResult, Box, Rect } from "../../system/types";

function solidBox(x: number, y: number, z: number, bw: number, bh: number, bd: number): Box {
  return { x, y, z, hx: bw / 2, hy: bh / 2, hz: bd / 2 };
}

const BODY  = 0xe8e6e0;   // white/grey kiosk body
const TRIM  = PALETTE.steel;
const BASE  = 0xc8c5c0;

function kioskScreenTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 128; c.height = 160;
  const x = c.getContext("2d")!;
  x.fillStyle = "#0a1e3a"; x.fillRect(0, 0, 128, 160);
  x.fillStyle = "#3ca8e8"; x.font = "bold 16px monospace";
  x.fillText("SELF", 14, 30); x.fillText("CHECK-IN", 14, 50);
  x.fillStyle = "#78c8f0"; x.font = "11px monospace";
  x.fillText("Scan passport", 14, 78);
  x.fillStyle = "#50c860"; x.fillRect(14, 92, 100, 26);
  x.fillStyle = "#06243f"; x.font = "bold 13px monospace";
  x.fillText("START", 42, 110);
  x.fillStyle = "#9fe0ff"; x.font = "10px monospace";
  x.fillText("Touch to begin", 18, 138);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

interface KioskParams { count: number }

defineObject("selfCheckinKiosk", {
  params: { count: 1 } as KioskParams,
  build(p: KioskParams): ObjectResult {
    const { count } = p;
    const bodyW = 0.6, bodyH = 1.15, bodyD = 0.45;
    const gap = 0.7;
    const pitch = bodyW + gap;
    const totalW = count * pitch - gap;
    const x0 = -totalW / 2 + bodyW / 2;

    const parts: THREE.BufferGeometry[] = [];
    const group = new THREE.Group();
    const colliders: Box[] = [];
    const obstacles: Rect[] = [];

    for (let i = 0; i < count; i++) {
      const cx = x0 + i * pitch;
      // Base plinth
      parts.push(tintedBox(bodyW + 0.16, 0.1, bodyD + 0.16, cx, 0.05, 0, BASE));
      // Pedestal body
      parts.push(tintedBox(bodyW, bodyH, bodyD, cx, 0.1 + bodyH / 2, 0, BODY));
      // Trim accent stripe
      parts.push(tintedBox(bodyW + 0.02, 0.08, bodyD + 0.02, cx, 0.1 + bodyH * 0.5, 0, TRIM));
      // Angled head block holding the screen
      const headY = 0.1 + bodyH + 0.18;
      parts.push(tintedBox(bodyW, 0.4, bodyD + 0.1, cx, headY, 0.03, BODY));
      // Boarding-pass slot
      parts.push(tintedBox(bodyW * 0.5, 0.04, 0.06, cx, 0.1 + bodyH * 0.7, bodyD / 2, 0x2a2d32));

      // Glowing blue screen, tilted toward the user
      const screenMat = new THREE.MeshStandardMaterial({
        map: kioskScreenTexture(),
        emissive: 0xffffff,
        emissiveMap: kioskScreenTexture(),
        emissiveIntensity: 1.0,
        roughness: 0.3,
      });
      const screen = new THREE.Mesh(new THREE.PlaneGeometry(bodyW - 0.08, 0.36), screenMat);
      screen.position.set(cx, headY, bodyD / 2 + 0.08);
      screen.rotation.x = -0.35;
      group.add(screen);

      colliders.push(solidBox(cx, 0.1 + bodyH / 2, 0, bodyW + 0.16, bodyH + 0.2, bodyD + 0.16));
      obstacles.push({ x: cx, z: 0, w: bodyW + 0.4, d: bodyD + 0.6 });
    }

    const opaque = tintedMesh(mergeTinted(parts));
    opaque.castShadow = true;
    group.add(opaque);

    return { mesh: group, colliders, obstacles };
  },
});
