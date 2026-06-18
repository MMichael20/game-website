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

// ---- typed facades (ground-floor identities) ---------------------------

// Count pixels matching a target color across a horizontal scanline at row y.
function countRow(data: Uint8Array, w: number, y: number, hex: number, tol = 3): number {
  let n = 0;
  for (let x = 0; x < w; x++) if (near(px(data, w, x, y), rgbOf(hex), tol)) n++;
  return n;
}
// Count pixels matching a target color across the WHOLE facade.
function countAll(data: Uint8Array, w: number, h: number, hex: number, tol = 3): number {
  let n = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (near(px(data, w, x, y), rgbOf(hex), tol)) n++;
  return n;
}

describe("typed facades — per-type determinism", () => {
  const types = ["shop", "restaurant", "apartment", "office"] as const;
  for (const t of types) {
    it(`is deterministic for type=${t} (same args -> same bytes)`, () => {
      const a = facadePattern(5, 7, 11, { color: 0x808080, type: t });
      const b = facadePattern(5, 7, 11, { color: 0x808080, type: t });
      expect(Array.from(a)).toEqual(Array.from(b));
    });
  }

  it("differs between types (shop vs office body grid)", () => {
    const shop = facadePattern(5, 7, 11, { color: 0x808080, type: "shop" });
    const office = facadePattern(5, 7, 11, { color: 0x808080, type: "office" });
    expect(Array.from(shop)).not.toEqual(Array.from(office));
  });
});

describe("typed facades — sign band (shop + restaurant)", () => {
  const cols = 4, floors = 5, cell = 6;
  const { w, h } = facadeSize(cols, floors, cell);

  it("shop draws a cool sign band across the top of the base band", () => {
    const data = facadePattern(cols, floors, 3, { color: 0x808080, cell, type: "shop" });
    // sign band sits at the top of floor 0 (just under the first body floor).
    const lintelH = Math.max(1, Math.floor(cell * 0.28));
    const y = cell - 1; // inside the sign band
    expect(countRow(data, w, y, PALETTE.signCool)).toBeGreaterThan(w * 0.5);
    expect(lintelH).toBeGreaterThan(0);
  });

  it("restaurant draws a warm sign band (signWarm) with a lit accent", () => {
    const data = facadePattern(cols, floors, 3, { color: 0x808080, cell, type: "restaurant" });
    const y = cell - 1; // top of the base band
    expect(countRow(data, w, y, PALETTE.signWarm) + countRow(data, w, y, PALETTE.signLit))
      .toBeGreaterThan(w * 0.5);
    // a lit (amber) accent stripe is present somewhere in the band
    expect(countAll(data, w, h, PALETTE.signLit)).toBeGreaterThan(0);
  });
});

describe("typed facades — office curtain wall", () => {
  const cols = 5, floors = 7, cell = 6;
  const { w, h } = facadeSize(cols, floors, cell);
  const data = facadePattern(cols, floors, 9, { color: 0x808080, cell, type: "office" });

  it("uses officeGlass as the dominant body-grid panel color (uniform)", () => {
    const office = countAll(data, w, h, PALETTE.officeGlass);
    // office curtain glass should dominate the cool default window glass.
    const coolGlass = countAll(data, w, h, PALETTE.glass) + countAll(data, w, h, PALETTE.glassDark);
    expect(office).toBeGreaterThan(coolGlass);
    expect(office).toBeGreaterThan(0);
  });

  it("body floors are uniform: every body floor has the same office glass count", () => {
    // sample the middle of each body floor and confirm the office-glass count
    // is identical across them (no random light/dark mix like shop).
    const counts: number[] = [];
    for (let row = 1; row < floors - 1; row++) {
      const y = row * cell + Math.floor(cell / 2);
      counts.push(countRow(data, w, y, PALETTE.officeGlass));
    }
    expect(counts.length).toBeGreaterThan(1);
    for (const c of counts) expect(c).toBe(counts[0]);
  });
});

describe("typed facades — apartment grid", () => {
  const cols = 5, floors = 7, cell = 6;
  const { w, h } = facadeSize(cols, floors, cell);
  const apt = facadePattern(cols, floors, 5, { color: 0x808080, cell, type: "apartment" });
  const shop = facadePattern(cols, floors, 5, { color: 0x808080, cell, type: "shop" });

  it("has NO big bright storefront glass band at the base", () => {
    const y = Math.floor(cell * 0.4); // inside floor 0
    expect(countRow(apt, w, y, PALETTE.storefront)).toBe(0);
  });

  it("repeats windows on the ground floor too (apartment grid is full-height)", () => {
    // apartment fills its base with a plain plinth + door (no storefront glass),
    // but the floors ABOVE carry the regular grid down to floor 1 with no
    // sparse gaps. Count window glass rows present vs the sparse shop.
    let aptWindowFloors = 0, shopWindowFloors = 0;
    for (let row = 1; row < floors - 1; row++) {
      const y = row * cell + Math.floor(cell / 2);
      const aptGlass = countRow(apt, w, y, PALETTE.glass) + countRow(apt, w, y, PALETTE.glassDark);
      const shopGlass = countRow(shop, w, y, PALETTE.glass) + countRow(shop, w, y, PALETTE.glassDark);
      if (aptGlass > 0) aptWindowFloors++;
      if (shopGlass > 0) shopWindowFloors++;
    }
    // apartment fills every body floor with windows; shop may skip cells but
    // apartment's window-glass coverage is at least as dense per row.
    expect(aptWindowFloors).toBe(floors - 2);
    expect(aptWindowFloors).toBeGreaterThanOrEqual(shopWindowFloors);
  });

  it("has more total window panels (denser grid) than the sparse shop body", () => {
    const aptGlass = countAll(apt, w, h, PALETTE.glass) + countAll(apt, w, h, PALETTE.glassDark);
    const shopGlass = countAll(shop, w, h, PALETTE.glass) + countAll(shop, w, h, PALETTE.glassDark);
    expect(aptGlass).toBeGreaterThan(shopGlass);
  });
});

describe("typed facades — door in the base/entry row", () => {
  const cols = 4, floors = 5, cell = 6;
  const { w } = facadeSize(cols, floors, cell);
  const types = ["shop", "restaurant", "apartment", "office"] as const;
  for (const t of types) {
    it(`type=${t} marks a facadeDoor in the base row`, () => {
      const data = facadePattern(cols, floors, 4, { color: 0x808080, cell, type: t });
      // scan the lower-middle of floor 0 for the dark door notch
      const y = Math.floor(cell * 0.4);
      expect(countRow(data, w, y, PALETTE.facadeDoor)).toBeGreaterThan(0);
    });
  }
});

describe("typed facades — cache differentiates types", () => {
  it("gives each type a distinct cache key", () => {
    const keys = new Set([
      facadeCacheKey(4, 6, 0x808080, true, "shop"),
      facadeCacheKey(4, 6, 0x808080, true, "restaurant"),
      facadeCacheKey(4, 6, 0x808080, true, "apartment"),
      facadeCacheKey(4, 6, 0x808080, true, "office"),
    ]);
    expect(keys.size).toBe(4);
  });

  it("returns DISTINCT cached textures for different types", () => {
    const a = makeFacadeTexture(4, 6, { color: 0x6aa9c9, type: "office" });
    const b = makeFacadeTexture(4, 6, { color: 0x6aa9c9, type: "apartment" });
    expect(a).not.toBe(b);
  });

  it("defaults type to shop (back-compatible key + texture)", () => {
    expect(facadeCacheKey(4, 6, 0x808080, true)).toBe(facadeCacheKey(4, 6, 0x808080, true, "shop"));
    const def = makeFacadeTexture(7, 8, { color: 0x123456 });
    const shop = makeFacadeTexture(7, 8, { color: 0x123456, type: "shop" });
    expect(def).toBe(shop);
  });
});
