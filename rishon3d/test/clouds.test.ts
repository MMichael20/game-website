// rishon3d/test/clouds.test.ts
import { describe, it, expect } from "vitest";
import * as THREE from "three";
import { cloudPlacements, makeClouds } from "../src/world/clouds";

describe("cloudPlacements", () => {
  it("is deterministic for a given seed", () => {
    const a = cloudPlacements(7, 10, 120, 70);
    const b = cloudPlacements(7, 10, 120, 70);
    expect(a).toEqual(b);
  });
  it("places the requested count high above the ground within the spread", () => {
    const p = cloudPlacements(7, 12, 120, 70);
    expect(p.length).toBe(12);
    for (const c of p) {
      expect(Math.abs(c.x)).toBeLessThanOrEqual(120);
      expect(Math.abs(c.z)).toBeLessThanOrEqual(120);
      expect(c.y).toBeGreaterThan(40);
      expect(c.scale).toBeGreaterThan(0);
    }
  });
});

describe("makeClouds", () => {
  it("returns one instanced mesh with an instance per cloud", () => {
    const obj = makeClouds(7, 9) as THREE.InstancedMesh;
    expect(obj.isInstancedMesh).toBe(true);
    expect(obj.count).toBe(9);
  });
});
