// rishon3d/test/builders.test.ts
import { describe, it, expect } from "vitest";
import * as THREE from "three";
import { awningStyle, makeAwnings, makeBuilding } from "../src/world/builders";
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

describe("makeBuilding", () => {
  const def: BuildingDef = { id: "b1", x: -18, z: 12, width: 12, depth: 10, height: 16, color: 0x6aa9c9 };

  it("returns a mesh with a 6-material array: facade sides, roof cap top, body bottom", () => {
    const mesh = makeBuilding(def) as THREE.Mesh;
    expect(mesh.isMesh).toBe(true);
    expect(Array.isArray(mesh.material)).toBe(true);
    const mats = mesh.material as THREE.MeshStandardMaterial[];
    // BoxGeometry order: 0=+X,1=-X,2=+Y top,3=-Y bottom,4=+Z,5=-Z
    expect(mats.length).toBe(6);
    // the 4 side faces carry the facade albedo map
    for (const idx of [0, 1, 4, 5]) expect(mats[idx].map).toBeTruthy();
    // top is the plain roof cap (no facade window map)
    expect(mats[2].map).toBeNull();
    expect(mats[2].color.getHex()).toBe(PALETTE.roofCap);
    // bottom is plain body color
    expect(mats[3].map).toBeNull();
    expect(mats[3].color.getHex()).toBe(def.color);
  });

  it("positions the building so its base sits on the ground", () => {
    const mesh = makeBuilding(def) as THREE.Mesh;
    expect(mesh.position.y).toBeCloseTo(def.height / 2);
    expect(mesh.position.x).toBe(def.x);
    expect(mesh.position.z).toBe(def.z);
  });

  it("keeps houses as a group (pitched roof), not a 6-material box", () => {
    const house: BuildingDef = { id: "house", x: 0, z: 0, width: 8, depth: 8, height: 5, color: PALETTE.houseBody, isHouse: true };
    const obj = makeBuilding(house);
    expect((obj as THREE.Group).isGroup).toBe(true);
  });
});
