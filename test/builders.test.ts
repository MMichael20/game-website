// rishon3d/test/builders.test.ts
import { describe, it, expect } from "vitest";
import * as THREE from "three";
import { awningStyle, facadeTypeFor, makeAwnings, makeBuilding } from "../src/world/builders";
import { PALETTE } from "../src/world/palette";
import type { BuildingDef } from "../src/world/rishonMap";

// Helper: the body box is the single 6-material child of a building group.
function bodyOf(obj: THREE.Object3D): THREE.Mesh {
  const body = obj.children.find(
    (c) => (c as THREE.Mesh).isMesh && Array.isArray((c as THREE.Mesh).material),
  ) as THREE.Mesh;
  expect(body).toBeTruthy();
  return body;
}
function childNamed(obj: THREE.Object3D, name: string): THREE.Mesh | undefined {
  return obj.children.find((c) => c.name === name) as THREE.Mesh | undefined;
}

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
  // short/wide buildings so they read as shop/restaurant (awning-biased types).
  const buildings: BuildingDef[] = Array.from({ length: 40 }, (_, i) => ({
    id: `b-${i}`, x: i * 10 - 200, z: 0, width: 8, depth: 8, height: 7, color: 0x888888,
  }));

  it("merges all awnings into at most one mesh per stripe color (not one per building)", () => {
    const grp = makeAwnings(buildings) as THREE.Group;
    const meshes = grp.children.filter((c) => (c as THREE.Mesh).isMesh);
    // count via the same type-biased awningStyle makeAwnings uses
    const shown = buildings.filter((b) => awningStyle(b.id, facadeTypeFor(b)).show).length;
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

describe("facadeTypeFor", () => {
  it("is deterministic for a given building id", () => {
    const def: BuildingDef = { id: "b4", x: 0, z: 0, width: 8, depth: 8, height: 20, color: 0x6aa9c9 };
    expect(facadeTypeFor(def)).toBe(facadeTypeFor(def));
  });

  it("returns one of the four facade identities", () => {
    const types = new Set<string>();
    for (let i = 0; i < 60; i++) {
      const t = facadeTypeFor({ id: `b-${i}`, x: 0, z: 0, width: 9, depth: 9, height: 6 + (i % 24), color: 0x888888 });
      types.add(t);
    }
    for (const t of types) expect(["shop", "restaurant", "apartment", "office"]).toContain(t);
  });

  it("buckets tall buildings as office/apartment", () => {
    for (const id of ["b4", "tower", "north-b-2", "x9", "z3"]) {
      const t = facadeTypeFor({ id, x: 0, z: 0, width: 8, depth: 8, height: 22, color: 0x888888 });
      expect(["office", "apartment"]).toContain(t);
    }
  });

  it("buckets short/wide buildings as shop/restaurant", () => {
    for (const id of ["b5", "b3", "market", "shopfront", "q1"]) {
      const t = facadeTypeFor({ id, x: 0, z: 0, width: 14, depth: 10, height: 7, color: 0x888888 });
      expect(["shop", "restaurant"]).toContain(t);
    }
  });
});

describe("makeBuilding", () => {
  const def: BuildingDef = { id: "b1", x: -18, z: 12, width: 12, depth: 10, height: 16, color: 0x6aa9c9 };

  it("returns a group whose body box has a 6-material array: facade sides, roof cap top, body bottom", () => {
    const grp = makeBuilding(def) as THREE.Group;
    expect(grp.isGroup).toBe(true);
    const body = bodyOf(grp);
    expect(body.isMesh).toBe(true);
    const mats = body.material as THREE.MeshStandardMaterial[];
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

  it("positions the group at the footprint and the body so its base sits on the ground", () => {
    const grp = makeBuilding(def) as THREE.Group;
    expect(grp.position.x).toBe(def.x);
    expect(grp.position.z).toBe(def.z);
    expect(grp.position.y).toBe(0);
    expect(bodyOf(grp).position.y).toBeCloseTo(def.height / 2);
  });

  it("adds a parapet rim and a door panel for non-house buildings", () => {
    const grp = makeBuilding(def) as THREE.Group;
    const parapet = childNamed(grp, "parapet");
    const door = childNamed(grp, "door");
    expect(parapet).toBeTruthy();
    expect(door).toBeTruthy();
    // parapet sits at the roof top, door is a dark facadeDoor panel
    expect((parapet!.material as THREE.MeshStandardMaterial).color.getHex()).toBe(PALETTE.cornice);
    expect((door!.material as THREE.MeshStandardMaterial).color.getHex()).toBe(PALETTE.facadeDoor);
    // entry pad slab on the ground in front of the door
    expect(childNamed(grp, "entryPad")).toBeTruthy();
  });

  it("adds balcony geometry for apartment-type buildings (and not for others)", () => {
    // find a tall id that hashes to apartment, and one that hashes to office.
    const apt = Array.from({ length: 200 }, (_, i) => `apt-${i}`)
      .find((id) => facadeTypeFor({ id, x: 0, z: 0, width: 10, depth: 10, height: 22, color: 0x888 }) === "apartment");
    const off = Array.from({ length: 200 }, (_, i) => `off-${i}`)
      .find((id) => facadeTypeFor({ id, x: 0, z: 0, width: 10, depth: 10, height: 22, color: 0x888 }) === "office");
    expect(apt).toBeTruthy();
    expect(off).toBeTruthy();

    const aptGrp = makeBuilding({ id: apt!, x: 0, z: 0, width: 10, depth: 10, height: 22, color: 0x888 }) as THREE.Group;
    const offGrp = makeBuilding({ id: off!, x: 0, z: 0, width: 10, depth: 10, height: 22, color: 0x888 }) as THREE.Group;
    const balcMat = childNamed(aptGrp, "balconies");
    expect(balcMat).toBeTruthy();
    expect((balcMat!.material as THREE.MeshStandardMaterial).color.getHex()).toBe(PALETTE.balconyRail);
    expect(childNamed(offGrp, "balconies")).toBeUndefined();
  });

  it("keeps houses as a group (pitched roof), not a building with a parapet", () => {
    const house: BuildingDef = { id: "house", x: 0, z: 0, width: 8, depth: 8, height: 5, color: PALETTE.houseBody, isHouse: true };
    const obj = makeBuilding(house);
    expect((obj as THREE.Group).isGroup).toBe(true);
    // house path is unchanged: no parapet / door / entry pad extras
    expect(childNamed(obj, "parapet")).toBeUndefined();
    expect(childNamed(obj, "door")).toBeUndefined();
  });
});
