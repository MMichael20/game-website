// rishon3d/test/facade.test.ts
import { describe, it, expect } from "vitest";
import * as THREE from "three";
import {
  facadePattern,
  facadeSize,
  gridFromDef,
  makeFacadeTexture,
  facadeCacheKey,
  facadeCacheSize,
} from "../src/world/facade";
import { PALETTE } from "../src/world/palette";

// Helper: read the RGB of pixel (x,y) from a row-major (bottom-up) RGBA buffer.
function px(data: Uint8Array, w: number, x: number, y: number): [number, number, number] {
  const o = (y * w + x) * 4;
  return [data[o], data[o + 1], data[o + 2]];
}
function rgbOf(hex: number): [number, number, number] {
  const c = new THREE.Color(hex);
  return [Math.round(c.r * 255), Math.round(c.g * 255), Math.round(c.b * 255)];
}
function near(a: [number, number, number], b: [number, number, number], tol = 2): boolean {
  return Math.abs(a[0] - b[0]) <= tol && Math.abs(a[1] - b[1]) <= tol && Math.abs(a[2] - b[2]) <= tol;
}

describe("facadeSize / facadePattern dimensions", () => {
  it("produces RGBA data sized cols*cell wide by floors*cell tall", () => {
    const cols = 4, floors = 5;
    const { w, h } = facadeSize(cols, floors);
    const d = facadePattern(cols, floors, 1, { color: 0x808080 });
    expect(d.length).toBe(w * h * 4);
  });

  it("clamps tiny grids so storefront + cornice always fit (>=2 floors)", () => {
    // a 1-floor request is clamped up to 2 floors of data internally
    const d = facadePattern(1, 1, 1);
    const min = facadeSize(1, 2);
    expect(d.length).toBe(min.w * min.h * 4);
  });
});

describe("facadePattern determinism", () => {
  it("returns identical bytes for the same seed + args", () => {
    const a = facadePattern(4, 5, 42, { color: 0x6aa9c9 });
    const b = facadePattern(4, 5, 42, { color: 0x6aa9c9 });
    expect(Array.from(a)).toEqual(Array.from(b));
  });

  it("differs across seeds (panel glass mix varies)", () => {
    const a = facadePattern(5, 6, 1, { color: 0x808080 });
    const b = facadePattern(5, 6, 2, { color: 0x808080 });
    expect(Array.from(a)).not.toEqual(Array.from(b));
  });
});

describe("facadePattern layout (orientation: row 0 = bottom)", () => {
  const cols = 4, floors = 5, cell = 6;
  const { w, h } = facadeSize(cols, floors, cell);
  const data = facadePattern(cols, floors, 7, { color: 0x808080, cell });

  it("places the storefront band at the BOTTOM (row 0) of the facade", () => {
    // sample across the lower-middle of the bottom floor: bright storefront glass
    // should dominate the band (slim mullions split it but glass is the majority).
    const y = Math.floor(cell * 0.4);
    let storefrontHits = 0;
    for (let x = 0; x < w; x++) if (near(px(data, w, x, y), rgbOf(PALETTE.storefront), 4)) storefrontHits++;
    expect(storefrontHits).toBeGreaterThan(w * 0.5);
  });

  it("places the cornice trim band at the TOP (last floor) of the facade", () => {
    const y = h - Math.ceil(cell * 0.5); // inside the top floor
    let corniceHits = 0;
    for (let x = 0; x < w; x++) if (near(px(data, w, x, y), rgbOf(PALETTE.cornice), 3)) corniceHits++;
    // the cornice spans the whole width
    expect(corniceHits).toBeGreaterThan(w * 0.8);
  });

  it("does NOT put storefront glass anywhere in the top floor", () => {
    const y = h - 1;
    let storefrontHits = 0;
    for (let x = 0; x < w; x++) if (near(px(data, w, x, y), rgbOf(PALETTE.storefront), 2)) storefrontHits++;
    expect(storefrontHits).toBe(0);
  });

  it("has a window grid in the body floors with both glass and frame pixels", () => {
    // middle body floor (between storefront row 0 and cornice top)
    const bodyRow = 2;
    const y = bodyRow * cell + Math.floor(cell / 2);
    let glass = 0, frame = 0;
    for (let x = 0; x < w; x++) {
      const p = px(data, w, x, y);
      if (near(p, rgbOf(PALETTE.glass), 3) || near(p, rgbOf(PALETTE.glassDark), 3)) glass++;
      if (near(p, rgbOf(PALETTE.frame), 3)) frame++;
    }
    expect(glass).toBeGreaterThan(0); // visible glass panels
    expect(frame).toBeGreaterThan(0); // visible mullions between them
    // sane ratio: glass dominates the row but frame is clearly present
    expect(glass).toBeGreaterThan(frame);
  });
});

describe("storefront opt-out", () => {
  it("omits the storefront band when storefront:false (plain tower base)", () => {
    const cols = 4, floors = 5, cell = 6;
    const { w } = facadeSize(cols, floors, cell);
    const data = facadePattern(cols, floors, 7, { color: 0x808080, cell, storefront: false });
    const y = Math.floor(cell * 0.4);
    let storefrontHits = 0;
    for (let x = 0; x < w; x++) if (near(px(data, w, x, y), rgbOf(PALETTE.storefront), 2)) storefrontHits++;
    expect(storefrontHits).toBe(0);
  });
});

describe("gridFromDef", () => {
  it("derives more columns for wider buildings and more floors for taller ones", () => {
    const small = gridFromDef(8, 10);
    const big = gridFromDef(20, 30);
    expect(big.cols).toBeGreaterThan(small.cols);
    expect(big.floors).toBeGreaterThan(small.floors);
    // always at least body + storefront + cornice
    expect(small.floors).toBeGreaterThanOrEqual(3);
    expect(small.cols).toBeGreaterThanOrEqual(2);
  });
});

describe("makeFacadeTexture + cache", () => {
  it("returns a NearestFilter DataTexture mapped 1:1 (no flip, clamped)", () => {
    const tex = makeFacadeTexture(4, 6, { color: 0x6aa9c9 });
    expect(tex.isDataTexture).toBe(true);
    expect(tex.magFilter).toBe(THREE.NearestFilter);
    expect(tex.minFilter).toBe(THREE.NearestFilter);
    expect(tex.flipY).toBe(false); // row 0 -> v=0 (bottom) so storefront stays at base
    expect(tex.wrapT).toBe(THREE.ClampToEdgeWrapping);
    expect(tex.image.width).toBe(facadeSize(4, 6).w);
    expect(tex.image.height).toBe(facadeSize(4, 6).h);
  });

  it("collapses similar buildings to one cached texture (returns same instance)", () => {
    const a = makeFacadeTexture(4, 6, { color: 0x6aa9c9, storefront: true });
    const b = makeFacadeTexture(4, 6, { color: 0x6aa9c9, storefront: true });
    expect(a).toBe(b);
  });

  it("buckets nearby floor counts to the same cache key", () => {
    expect(facadeCacheKey(4, 9, 0x808080, true)).toBe(facadeCacheKey(4, 10, 0x808080, true));
  });

  it("separates storefront vs non-storefront facades by key", () => {
    expect(facadeCacheKey(4, 6, 0x808080, true)).not.toBe(facadeCacheKey(4, 6, 0x808080, false));
  });

  it("keeps the cache small across many buildings (quantized key)", () => {
    const before = facadeCacheSize();
    for (let i = 0; i < 40; i++) {
      makeFacadeTexture(3 + (i % 3), 6 + (i % 4), { color: 0x6aa9c9 });
    }
    // far fewer textures than buildings
    expect(facadeCacheSize() - before).toBeLessThan(12);
  });
});
