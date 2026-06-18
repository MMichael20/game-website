import { describe, it, expect } from "vitest";
import { generateDistrict, ROAD_WIDTH } from "../src/world/cityGen";
import type { DistrictSpec } from "../src/world/districts";

const spec: DistrictSpec = {
  id: "d1", center: { x: 100, z: 0 }, size: 60, blocks: 4, seed: 9,
  palette: [0x808080, 0x909090], minHeight: 6, maxHeight: 18, density: 1,
};

describe("generateDistrict", () => {
  it("is deterministic for a seed", () => {
    const a = generateDistrict(spec);
    const b = generateDistrict(spec);
    expect(a.buildings.length).toBe(b.buildings.length);
    expect(a.buildings.map((x) => x.id)).toEqual(b.buildings.map((x) => x.id));
  });

  it("emits a grid of roads (blocks+1 lines each axis)", () => {
    const r = generateDistrict(spec);
    const horiz = r.roads.filter((x) => x.horizontal).length;
    const vert = r.roads.filter((x) => !x.horizontal).length;
    expect(horiz).toBe(spec.blocks + 1);
    expect(vert).toBe(spec.blocks + 1);
  });

  it("gives every building a unique id", () => {
    const ids = generateDistrict(spec).buildings.map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("keeps building footprints out of the road corridors", () => {
    const r = generateDistrict(spec);
    const half = spec.size / 2;
    const cell = spec.size / spec.blocks;
    const clearance = ROAD_WIDTH / 2;
    for (const b of r.buildings) {
      // local coords within the district
      const lx = b.x - spec.center.x;
      const lz = b.z - spec.center.z;
      // distance from the nearest grid line on each axis must exceed half-footprint + clearance
      const nearestLineX = Math.round((lx + half) / cell) * cell - half;
      const nearestLineZ = Math.round((lz + half) / cell) * cell - half;
      expect(Math.abs(lx - nearestLineX)).toBeGreaterThanOrEqual(b.width / 2 + clearance - 1e-6);
      expect(Math.abs(lz - nearestLineZ)).toBeGreaterThanOrEqual(b.depth / 2 + clearance - 1e-6);
    }
  });

  it("keeps everything inside the district footprint", () => {
    const r = generateDistrict(spec);
    const half = spec.size / 2;
    for (const b of r.buildings) {
      expect(Math.abs(b.x - spec.center.x)).toBeLessThanOrEqual(half);
      expect(Math.abs(b.z - spec.center.z)).toBeLessThanOrEqual(half);
    }
  });

  it("still produces a deterministic prop set after the bench draw", () => {
    const a = generateDistrict(spec).props.map((p) => p.id);
    const b = generateDistrict(spec).props.map((p) => p.id);
    expect(a).toEqual(b);
  });

  it("can place benches as a prop kind", () => {
    // density 1 spec fills every cell; with the bench probability some appear.
    const dense = generateDistrict({ ...spec, seed: 5 });
    const kinds = new Set(dense.props.map((p) => p.kind));
    expect([...kinds].every((k) => ["tree", "bush", "bench"].includes(k))).toBe(true);
    expect(kinds.has("bench")).toBe(true);
  });
});
