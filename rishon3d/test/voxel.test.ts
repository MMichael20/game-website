import { describe, it, expect } from "vitest";
import {
  tintedBox, lowPolyBall, cone, cylinderY, mergeTinted, ringAngles,
} from "../src/world/objects/voxel";

describe("voxel primitives", () => {
  it("tints a box with per-vertex colors", () => {
    const g = tintedBox(1, 2, 3, 0, 1, 0, 0xff0000);
    const col = g.getAttribute("color");
    expect(col).toBeTruthy();
    expect(col!.count).toBe(g.getAttribute("position").count);
    // red channel of first vertex is 1
    expect(col!.getX(0)).toBeCloseTo(1, 5);
  });

  it("places primitives at the requested center", () => {
    const g = lowPolyBall(0.5, 2, 3, 4, 0x00ff00);
    g.computeBoundingBox();
    const c = g.boundingBox!.getCenter(new (g.boundingBox!.min.constructor as any)());
    expect(c.x).toBeCloseTo(2, 3);
    expect(c.y).toBeCloseTo(3, 3);
    expect(c.z).toBeCloseTo(4, 3);
  });

  it("merges many parts into one geometry that keeps colors", () => {
    const merged = mergeTinted([
      tintedBox(1, 1, 1, 0, 0, 0, 0x111111),
      cone(0.5, 0, 1, 1, 0, 0, 0x222222),
      cylinderY(0.3, 1, -1, 0, 0, 0x333333),
    ]);
    expect(merged.getAttribute("color")).toBeTruthy();
    expect(merged.getAttribute("position").count).toBeGreaterThan(0);
  });

  it("ringAngles spreads count points around the circle", () => {
    const a = ringAngles(4);
    expect(a).toHaveLength(4);
    expect(a[0]).toBeCloseTo(0, 5);
    expect(a[1]).toBeCloseTo(Math.PI / 2, 5);
  });
});
