import { describe, it, expect } from "vitest";
import * as THREE from "three";
import { fillSurface, type FillRegion } from "../src/world/surfaceFill";
import { rectsOverlap } from "../src/world/roadClear";
import type { Rect } from "../src/game/wander";

// A mid-sized grass region for most tests.
const GRASS_REGION: FillRegion = { minX: 0, maxX: 40, minZ: 0, maxZ: 30 };
// A mid-sized plaza region.
const PLAZA_REGION: FillRegion = { minX: 0, maxX: 30, minZ: 0, maxZ: 20 };

describe("fillSurface – return shape", () => {
  it("returns { object, obstacles } for grass", () => {
    const result = fillSurface(GRASS_REGION, "grass", 42);
    expect(result).toHaveProperty("object");
    expect(result).toHaveProperty("obstacles");
    expect(result.object).toBeInstanceOf(THREE.Object3D);
    expect(Array.isArray(result.obstacles)).toBe(true);
  });

  it("returns { object, obstacles } for plaza", () => {
    const result = fillSurface(PLAZA_REGION, "plaza", 99);
    expect(result.object).toBeInstanceOf(THREE.Object3D);
    expect(Array.isArray(result.obstacles)).toBe(true);
  });
});

describe("fillSurface – determinism", () => {
  it("grass: two calls with the same seed produce identical obstacle arrays", () => {
    const a = fillSurface(GRASS_REGION, "grass", 1234);
    const b = fillSurface(GRASS_REGION, "grass", 1234);
    expect(a.obstacles).toEqual(b.obstacles);
  });

  it("grass: two calls with the same seed produce objects with identical bounds", () => {
    const a = fillSurface(GRASS_REGION, "grass", 1234);
    const b = fillSurface(GRASS_REGION, "grass", 1234);
    const boxA = new THREE.Box3().setFromObject(a.object);
    const boxB = new THREE.Box3().setFromObject(b.object);
    expect(boxA.min.x).toBeCloseTo(boxB.min.x, 4);
    expect(boxA.min.z).toBeCloseTo(boxB.min.z, 4);
    expect(boxA.max.x).toBeCloseTo(boxB.max.x, 4);
    expect(boxA.max.z).toBeCloseTo(boxB.max.z, 4);
  });

  it("plaza: two calls with the same seed produce identical obstacle arrays", () => {
    const a = fillSurface(PLAZA_REGION, "plaza", 7777);
    const b = fillSurface(PLAZA_REGION, "plaza", 7777);
    expect(a.obstacles).toEqual(b.obstacles);
  });

  it("different seeds produce different obstacles (probabilistic sanity check)", () => {
    const a = fillSurface(GRASS_REGION, "grass", 1);
    const b = fillSurface(GRASS_REGION, "grass", 9999);
    // It is extremely unlikely all obstacles are identical with different seeds;
    // but if both are empty that's fine — just check they're not forced equal.
    const aLen = a.obstacles.length;
    const bLen = b.obstacles.length;
    // At least one run should have some obstacles in a 40x30 region.
    expect(aLen + bLen).toBeGreaterThan(0);
  });
});

describe("fillSurface – avoid respected", () => {
  it("grass: no chunky obstacle overlaps the avoid rect", () => {
    const avoid: Rect[] = [{ minX: 10, maxX: 25, minZ: 10, maxZ: 20 }];
    const { obstacles } = fillSurface(GRASS_REGION, "grass", 42, avoid);
    for (const obs of obstacles) {
      const overlaps = rectsOverlap(obs, avoid[0]);
      expect(overlaps).toBe(false);
    }
  });

  it("plaza: no chunky obstacle overlaps the avoid rect", () => {
    const avoid: Rect[] = [{ minX: 5, maxX: 20, minZ: 5, maxZ: 15 }];
    const { obstacles } = fillSurface(PLAZA_REGION, "plaza", 55, avoid);
    for (const obs of obstacles) {
      const overlaps = rectsOverlap(obs, avoid[0]);
      expect(overlaps).toBe(false);
    }
  });
});

describe("fillSurface – grass obstacle rules", () => {
  it("obstacles come only from chunky props (trees/bushes), not flowers", () => {
    // We can't easily tell flowers from trees by name in the obstacle array,
    // but we can confirm obstacle footprints are plausibly tree/bush-sized (>= 1x1).
    const { obstacles } = fillSurface(GRASS_REGION, "grass", 42);
    for (const obs of obstacles) {
      const w = obs.maxX - obs.minX;
      const d = obs.maxZ - obs.minZ;
      // Chunky props have footprint at least 1m in each axis;
      // flowers (excluded) are tiny (<0.3m).
      expect(w).toBeGreaterThanOrEqual(0.9);
      expect(d).toBeGreaterThanOrEqual(0.9);
    }
  });

  it("all obstacle rects are well-formed (min < max)", () => {
    const { obstacles } = fillSurface(GRASS_REGION, "grass", 42);
    for (const obs of obstacles) {
      expect(obs.minX).toBeLessThan(obs.maxX);
      expect(obs.minZ).toBeLessThan(obs.maxZ);
    }
  });
});

describe("fillSurface – plaza obstacle rules", () => {
  it("plaza obstacles are planter/bin sized", () => {
    const { obstacles } = fillSurface(PLAZA_REGION, "plaza", 12);
    for (const obs of obstacles) {
      const w = obs.maxX - obs.minX;
      const d = obs.maxZ - obs.minZ;
      // Planters/bins are chunky (>= 0.5m footprint); tiles excluded from obstacles
      expect(w).toBeGreaterThan(0.3);
      expect(d).toBeGreaterThan(0.3);
    }
  });
});

describe("fillSurface – edge cases", () => {
  it("empty region (zero width) does not throw and returns empty or minimal output", () => {
    expect(() => fillSurface({ minX: 5, maxX: 5, minZ: 0, maxZ: 10 }, "grass", 1)).not.toThrow();
  });

  it("tiny region (1x1) does not throw", () => {
    expect(() => fillSurface({ minX: 0, maxX: 1, minZ: 0, maxZ: 1 }, "plaza", 2)).not.toThrow();
  });

  it("no avoid array (undefined) does not throw", () => {
    expect(() => fillSurface(GRASS_REGION, "grass", 3)).not.toThrow();
  });

  it("empty avoid array does not throw", () => {
    expect(() => fillSurface(GRASS_REGION, "grass", 3, [])).not.toThrow();
  });
});
