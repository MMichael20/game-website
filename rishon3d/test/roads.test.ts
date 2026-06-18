import { describe, it, expect } from "vitest";
import { laneDashes, sidewalkRects, ROAD_W } from "../src/world/roads";
import type { RoadDef } from "../src/world/rishonMap";

const hRoad: RoadDef = { id: "h", x: 0, z: 10, length: 40, horizontal: true };
const vRoad: RoadDef = { id: "v", x: -5, z: 0, length: 40, horizontal: false };

describe("laneDashes", () => {
  it("emits evenly spaced dashes along a horizontal road's x axis", () => {
    const d = laneDashes(hRoad);
    expect(d.length).toBeGreaterThan(0);
    for (const p of d) expect(p.z).toBeCloseTo(hRoad.z, 6); // stays on the road centerline
    expect(d.every((p) => p.rotationY === Math.PI / 2)).toBe(true);
  });

  it("emits dashes along a vertical road's z axis", () => {
    const d = laneDashes(vRoad);
    for (const p of d) expect(p.x).toBeCloseTo(vRoad.x, 6);
    expect(d.every((p) => p.rotationY === 0)).toBe(true);
  });

  it("is symmetric about the road center", () => {
    const xs = laneDashes(hRoad).map((p) => p.x);
    const sum = xs.reduce((a, b) => a + b, 0);
    expect(sum / xs.length).toBeCloseTo(hRoad.x, 6);
  });
});

describe("sidewalkRects", () => {
  it("flanks a horizontal road on both z sides at half-road + half-sidewalk", () => {
    const r = sidewalkRects(hRoad);
    expect(r.length).toBe(2);
    const offs = r.map((s) => s.z - hRoad.z).sort((a, b) => a - b);
    expect(offs[0]).toBeCloseTo(-offs[1], 6);
    expect(Math.abs(offs[0])).toBeGreaterThan(ROAD_W / 2);
    for (const s of r) expect(s.w).toBeCloseTo(hRoad.length, 6);
  });

  it("flanks a vertical road on both x sides", () => {
    const r = sidewalkRects(vRoad);
    const offs = r.map((s) => s.x - vRoad.x).sort((a, b) => a - b);
    expect(offs[0]).toBeCloseTo(-offs[1], 6);
    for (const s of r) expect(s.d).toBeCloseTo(vRoad.length, 6);
  });
});
