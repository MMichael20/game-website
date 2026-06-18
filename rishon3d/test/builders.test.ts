// rishon3d/test/builders.test.ts
import { describe, it, expect } from "vitest";
import * as THREE from "three";
import { awningStyle, makeAwnings } from "../src/world/builders";
import { PALETTE } from "../src/world/palette";
import type { BuildingDef } from "../src/world/rishonMap";

describe("awningStyle", () => {
  it("is deterministic for a given building id", () => {
    expect(awningStyle("b3")).toEqual(awningStyle("b3"));
  });
  it("chooses red or blue when shown", () => {
    for (const id of ["b1", "b2", "b3", "b4", "b5", "north-b-0-1"]) {
      const a = awningStyle(id);
      if (a.show) expect([PALETTE.awningRed, PALETTE.awningBlue]).toContain(a.color);
    }
  });
  it("shows awnings on a meaningful fraction of buildings", () => {
    const ids = Array.from({ length: 200 }, (_, i) => `b-${i}`);
    const shown = ids.filter((id) => awningStyle(id).show).length;
    expect(shown).toBeGreaterThan(40);
    expect(shown).toBeLessThan(160);
  });
});

describe("makeAwnings", () => {
  const buildings: BuildingDef[] = Array.from({ length: 40 }, (_, i) => ({
    id: `b-${i}`, x: i * 10 - 200, z: 0, width: 8, depth: 8, height: 10, color: 0x888888,
  }));

  it("merges all awnings into at most one mesh per stripe color (not one per building)", () => {
    const grp = makeAwnings(buildings) as THREE.Group;
    const meshes = grp.children.filter((c) => (c as THREE.Mesh).isMesh);
    const shown = buildings.filter((b) => awningStyle(b.id).show).length;
    expect(shown).toBeGreaterThan(2); // the test set actually produces awnings
    expect(meshes.length).toBeGreaterThanOrEqual(1);
    expect(meshes.length).toBeLessThanOrEqual(2); // one merged mesh per color
  });

  it("skips houses", () => {
    const houses: BuildingDef[] = [{ id: "house", x: 0, z: 0, width: 8, depth: 8, height: 5, color: 0x111111, isHouse: true }];
    const grp = makeAwnings(houses) as THREE.Group;
    expect(grp.children.length).toBe(0);
  });
});
