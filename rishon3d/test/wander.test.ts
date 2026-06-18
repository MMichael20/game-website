import { describe, it, expect } from "vitest";
import {
  moveToward, reachedTarget, clampToBounds, pickTarget, buildingRects, pointInRects,
} from "../src/game/wander";
import type { BuildingDef } from "../src/world/rishonMap";

describe("wander", () => {
  it("moveToward steps toward without overshooting", () => {
    const p = moveToward({ x: 0, z: 0 }, { x: 10, z: 0 }, 3);
    expect(p.x).toBeCloseTo(3); expect(p.z).toBeCloseTo(0);
    const q = moveToward({ x: 0, z: 0 }, { x: 2, z: 0 }, 5);
    expect(q.x).toBeCloseTo(2); expect(q.z).toBeCloseTo(0); // clamped to target
  });
  it("reachedTarget respects threshold", () => {
    expect(reachedTarget({ x: 0, z: 0 }, { x: 0.3, z: 0 }, 0.5)).toBe(true);
    expect(reachedTarget({ x: 0, z: 0 }, { x: 2, z: 0 }, 0.5)).toBe(false);
  });
  it("clampToBounds keeps point inside square", () => {
    expect(clampToBounds({ x: 100, z: -100 }, 60)).toEqual({ x: 60, z: -60 });
  });
  it("pickTarget lands within radius of origin", () => {
    const o = { x: 5, z: 5 };
    for (const [a, d] of [[0, 1], [0.25, 0.5], [0.5, 0], [0.75, 1]] as const) {
      const t = pickTarget(o, 10, a, d);
      const dist = Math.hypot(t.x - o.x, t.z - o.z);
      expect(dist).toBeLessThanOrEqual(10 + 1e-9);
    }
  });
  it("buildingRects + pointInRects detect footprints with margin", () => {
    const b: BuildingDef[] = [{ id: "x", x: 0, z: 0, width: 10, depth: 10, height: 5, color: 0 }];
    const rects = buildingRects(b, 1);
    expect(pointInRects({ x: 0, z: 0 }, rects)).toBe(true);   // center
    expect(pointInRects({ x: 5.5, z: 0 }, rects)).toBe(true);  // within margin (half=5 + 1)
    expect(pointInRects({ x: 7, z: 0 }, rects)).toBe(false);   // outside
  });
});
