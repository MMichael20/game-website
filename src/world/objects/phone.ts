// rishon3d/src/world/objects/phone.ts
//
// A reusable voxel smartphone for the phone shop (and anywhere a phone is needed).
// Per the repo rule: real items are reusable objects, never bare cubes. Config
// recolors the body + screen; PHONE_SCREENS gives a stock of display colors.
// Convention: base at y=0, grows +y (stands upright), centered on x=z=0, ~1u=1m.

import * as THREE from "three";
import { tintedBox, mergeTinted, tintedMesh } from "./voxel";

export interface PhoneConfig {
  bodyColor?: number;
  screenColor?: number;
  detailColor?: number;
  width?: number;
  height?: number;
}

// A stock of bright screen colors for a shelf of display phones.
export const PHONE_SCREENS = [0x6fc0ff, 0x7ee787, 0xffd24a, 0xff7b9c, 0xb98cff, 0xf3efe6];

export function makePhone(cfg: PhoneConfig = {}): THREE.BufferGeometry {
  const body = cfg.bodyColor ?? 0x20262e;       // dark slate frame
  const screen = cfg.screenColor ?? 0x6fc0ff;   // glowing screen
  const detail = cfg.detailColor ?? 0x10151b;   // speaker / button / camera
  const w = cfg.width ?? 0.42;
  const h = cfg.height ?? 0.84;
  const d = 0.07;
  const parts: THREE.BufferGeometry[] = [];
  // frame body
  parts.push(tintedBox(w, h, d, 0, h / 2, 0, body));
  // glowing screen inset on the +z face
  parts.push(tintedBox(w * 0.82, h * 0.8, 0.02, 0, h / 2, d / 2 + 0.006, screen));
  // earpiece slot near the top + a round-ish home button near the bottom
  parts.push(tintedBox(w * 0.34, 0.035, 0.012, 0, h * 0.93, d / 2 + 0.02, detail));
  parts.push(tintedBox(0.07, 0.07, 0.012, 0, h * 0.07, d / 2 + 0.02, detail));
  // camera bump on the back, top corner
  parts.push(tintedBox(0.09, 0.09, 0.025, -w * 0.25, h * 0.9, -d / 2 - 0.012, detail));
  return mergeTinted(parts);
}

export function makePhoneMesh(cfg?: PhoneConfig): THREE.Mesh {
  return tintedMesh(makePhone(cfg));
}
