import * as THREE from "three";
import { mulberry32 } from "./rng";

// Deterministic grid of windows: a warm-lit subset glows, the rest are dark.
// Pure pixel data (no canvas/DOM) so it is unit-testable under node.
export function windowPattern(cols: number, rows: number, seed: number): Uint8Array<ArrayBuffer> {
  const rng = mulberry32(seed);
  const data = new Uint8Array(new ArrayBuffer(cols * rows * 4));
  for (let i = 0; i < cols * rows; i++) {
    const o = i * 4;
    if (rng() < 0.45) {
      data[o] = 255; data[o + 1] = 210; data[o + 2] = 130; data[o + 3] = 255;
    } else {
      data[o] = 12; data[o + 1] = 12; data[o + 2] = 16; data[o + 3] = 255;
    }
  }
  return data;
}

export function makeWindowTexture(cols = 8, rows = 8, seed = 1337): THREE.DataTexture {
  const pixels = windowPattern(cols, rows, seed);
  const tex = new THREE.DataTexture(pixels, cols, rows, THREE.RGBAFormat);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.needsUpdate = true;
  return tex;
}
