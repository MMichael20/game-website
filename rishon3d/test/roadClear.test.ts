import { describe, it, expect } from "vitest";
import { roadRects, filterPropsOffRoads, rectsOverlap, filterBuildingsOffRoads } from "../src/world/roadClear";
import type { RoadDef, PropDef, BuildingDef } from "../src/world/rishonMap";

const vRoad: RoadDef = { id: "v", x: 0, z: 0, length: 120, horizontal: false };
const hRoad: RoadDef = { id: "h", x: 0, z: 0, length: 120, horizontal: true };

describe("roadRects", () => {
  it("vertical road: narrow in x (half-width+margin), long in z", () => {
    const [r] = roadRects([vRoad], 1.5); // ROAD_W/2 + 1.5 = 4.5
    expect(r.minX).toBeCloseTo(-4.5, 6);
    expect(r.maxX).toBeCloseTo(4.5, 6);
    expect(r.minZ).toBeCloseTo(-60, 6);
    expect(r.maxZ).toBeCloseTo(60, 6);
  });
  it("horizontal road: long in x, narrow in z", () => {
    const [r] = roadRects([hRoad], 1.5);
    expect(r.maxX).toBeCloseTo(60, 6);
    expect(r.maxZ).toBeCloseTo(4.5, 6);
  });
});

describe("filterPropsOffRoads", () => {
  const props: PropDef[] = [
    { id: "on", kind: "tree", x: 0, z: 30 },    // on the vertical road -> removed
    { id: "off", kind: "tree", x: 5, z: 30 },   // x=5 > 4.5 -> kept
    { id: "lamp", kind: "streetlight", x: 0, z: 30 }, // exempt -> kept
  ];
  it("removes vegetation on a road but keeps off-road and streetlights", () => {
    const out = filterPropsOffRoads(props, [vRoad], 1.5).map((p) => p.id);
    expect(out).toContain("off");
    expect(out).toContain("lamp");
    expect(out).not.toContain("on");
  });
  it("is deterministic / pure", () => {
    const a = filterPropsOffRoads(props, [vRoad], 1.5);
    const b = filterPropsOffRoads(props, [vRoad], 1.5);
    expect(a).toEqual(b);
  });
});

describe("rectsOverlap", () => {
  it("detects overlap and separation", () => {
    expect(rectsOverlap({ minX: 0, maxX: 2, minZ: 0, maxZ: 2 }, { minX: 1, maxX: 3, minZ: 1, maxZ: 3 })).toBe(true);
    expect(rectsOverlap({ minX: 0, maxX: 2, minZ: 0, maxZ: 2 }, { minX: 5, maxX: 6, minZ: 5, maxZ: 6 })).toBe(false);
  });
});

describe("filterBuildingsOffRoads", () => {
  // vRoad corridor: x in [-3.5, 3.5] at margin 0.5
  const onRoad: BuildingDef = { id: "on", x: 0, z: 20, width: 8, depth: 8, height: 10, color: 0x888888 };
  const offRoad: BuildingDef = { id: "off", x: 40, z: 20, width: 8, depth: 8, height: 10, color: 0x888888 };
  it("removes a building overlapping a road, keeps one clear of it", () => {
    const out = filterBuildingsOffRoads([onRoad, offRoad], [vRoad], 0.5, 0).map((b) => b.id);
    expect(out).toEqual(["off"]);
  });
});
