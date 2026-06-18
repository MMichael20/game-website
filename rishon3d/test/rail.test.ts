// rishon3d/test/rail.test.ts
import { describe, it, expect } from "vitest";
import * as THREE from "three";
import { pillarZs, makeRail, RAIL_STATION } from "../src/world/rail";

describe("pillarZs", () => {
  it("spaces pillars symmetrically along the deck", () => {
    const zs = pillarZs(260, 20);
    expect(zs.length).toBeGreaterThan(5);
    const sum = zs.reduce((a, b) => a + b, 0);
    expect(sum / zs.length).toBeCloseTo(0, 6); // centered on 0
    for (const z of zs) expect(Math.abs(z)).toBeLessThanOrEqual(130);
  });
});

// collect the names of every named mesh in the rail group (the station parts).
function meshNames(obj: THREE.Object3D): Set<string> {
  const names = new Set<string>();
  obj.traverse((o) => { if (o.name) names.add(o.name); });
  return names;
}

describe("makeRail", () => {
  it("returns an object placed clear of the districts (|x| > 125)", () => {
    const rail = makeRail();
    expect(Math.abs(rail.position.x)).toBeGreaterThan(125);
    expect(rail.children.length).toBeGreaterThanOrEqual(2); // deck + pillars (+rails)
  });

  it("carries a readable station: platform, canopy, stairs and a train", () => {
    const names = meshNames(makeRail());
    expect(names.has("station-platform")).toBe(true);
    expect(names.has("station-canopy")).toBe(true);
    expect(names.has("station-stairs")).toBe(true);
    expect(names.has("station-train")).toBe(true);
    expect(names.has("station-train-windows")).toBe(true);
  });

  it("keeps every station mesh within the ground bounds (|coord| <= 138)", () => {
    const rail = makeRail();
    rail.updateMatrixWorld(true);
    const box = new THREE.Box3();
    rail.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh || !mesh.geometry) return;
      box.expandByObject(mesh);
    });
    expect(Math.abs(box.min.x)).toBeLessThanOrEqual(138);
    expect(Math.abs(box.max.x)).toBeLessThanOrEqual(138);
    expect(Math.abs(box.min.z)).toBeLessThanOrEqual(138);
    expect(Math.abs(box.max.z)).toBeLessThanOrEqual(138);
  });
});

describe("RAIL_STATION anchor", () => {
  it("is within ground bounds and on the city-facing side of the rail", () => {
    expect(Math.abs(RAIL_STATION.x)).toBeLessThanOrEqual(138);
    expect(Math.abs(RAIL_STATION.z)).toBeLessThanOrEqual(138);
    // inboard of the deck (x=130) so the player reaches it from the city.
    expect(RAIL_STATION.x).toBeLessThan(130);
    expect(RAIL_STATION.z).toBe(0); // station sits at the corridor center
  });
});

describe("determinism", () => {
  it("produces the same pillar layout across calls", () => {
    expect(pillarZs(260, 20)).toEqual(pillarZs(260, 20));
  });

  it("produces the same station mesh set across calls", () => {
    expect([...meshNames(makeRail())].sort()).toEqual([...meshNames(makeRail())].sort());
  });
});
