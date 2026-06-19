// rishon3d/test/clouds.test.ts
import { describe, it, expect } from "vitest";
import * as THREE from "three";
import { cloudPlacements, makeClouds } from "../src/world/clouds";

describe("cloudPlacements", () => {
  it("is deterministic for a given seed", () => {
    const a = cloudPlacements(7, 16, 120, 34);
    const b = cloudPlacements(7, 16, 120, 34);
    expect(a).toEqual(b);
  });
  it("places the requested count within the spread, in a low in-frame band", () => {
    const p = cloudPlacements(7, 16, 120, 34);
    expect(p.length).toBe(16);
    for (const c of p) {
      expect(Math.abs(c.x)).toBeLessThanOrEqual(120);
      expect(Math.abs(c.z)).toBeLessThanOrEqual(120);
      // height 34 +/- 10 jitter: low band above the skyline, well below the
      // old out-of-frame y~75, but still clear of the tallest buildings.
      expect(c.y).toBeGreaterThanOrEqual(24);
      expect(c.y).toBeLessThanOrEqual(44);
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
  it("defaults to a denser band (16 clouds) low enough to read in frame", () => {
    const obj = makeClouds() as THREE.InstancedMesh;
    expect(obj.count).toBe(16);
    const m = new THREE.Matrix4();
    const pos = new THREE.Vector3();
    for (let i = 0; i < obj.count; i++) {
      obj.getMatrixAt(i, m);
      pos.setFromMatrixPosition(m);
      expect(pos.y).toBeLessThanOrEqual(44); // clouds sit low, not at y~75
    }
  });
});
