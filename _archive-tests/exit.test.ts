import { describe, it, expect } from "vitest";
import { safeExitPosition } from "../src/game/exit";
import type { Rect } from "../src/game/wander";

describe("safeExitPosition", () => {
  it("drops beside the car when nothing blocks", () => {
    const p = safeExitPosition({ x: 0, z: 0 }, [], 140);
    expect(Math.hypot(p.x - 0, p.z - 0)).toBeGreaterThan(0); // moved off the car
    expect(Math.abs(p.x)).toBeLessThanOrEqual(140);
    expect(Math.abs(p.z)).toBeLessThanOrEqual(140);
  });

  it("avoids a building rect overlapping the default offset", () => {
    // Block the +x side; expect a different, clear side.
    const rects: Rect[] = [{ minX: 1, maxX: 4, minZ: -2, maxZ: 2 }];
    const p = safeExitPosition({ x: 0, z: 0 }, rects, 140);
    const inBlocked = p.x >= 1 && p.x <= 4 && p.z >= -2 && p.z <= 2;
    expect(inBlocked).toBe(false);
  });

  it("falls back to the car position when fully boxed in", () => {
    const rects: Rect[] = [{ minX: -5, maxX: 5, minZ: -5, maxZ: 5 }];
    const p = safeExitPosition({ x: 0, z: 0 }, rects, 140);
    expect(p).toEqual({ x: 0, z: 0 });
  });
});
