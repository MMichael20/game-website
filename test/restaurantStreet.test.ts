// rishon3d/test/restaurantStreet.test.ts
import { describe, it, expect } from "vitest";
import * as THREE from "three";
import { makeRestaurantStreet, RESTAURANT } from "../src/world/restaurantStreet";

// Count meshes named `name` anywhere in the tree.
function countNamed(obj: THREE.Object3D, name: string): number {
  let n = 0;
  obj.traverse((c) => { if (c.name === name) n++; });
  return n;
}

describe("makeRestaurantStreet", () => {
  it("returns a non-empty Object3D", () => {
    const grp = makeRestaurantStreet();
    expect(grp).toBeInstanceOf(THREE.Object3D);
    expect(grp.children.length).toBeGreaterThan(0);
    // some real renderable geometry exists (not just empty groups)
    let meshes = 0;
    grp.traverse((c) => { if ((c as THREE.Mesh).isMesh) meshes++; });
    expect(meshes).toBeGreaterThan(0);
  });

  it("has at least 3 restaurant building meshes", () => {
    const grp = makeRestaurantStreet();
    // SEMANTIC invariant (kept): >=3 building shells. With the HERO cafe added
    // (its walk-in shell is named restaurantBuilding too, like the bakery), the
    // real count is now 4 — assert >=4 so the cafe shell's presence is guarded.
    expect(countNamed(grp, "restaurantBuilding")).toBeGreaterThanOrEqual(4);
  });

  it("includes outdoor seating, awnings and a pickup stand", () => {
    const grp = makeRestaurantStreet();
    expect(countNamed(grp, "awnings")).toBe(1);
    expect(countNamed(grp, "pickupStand")).toBe(1);
    // instanced seating (tables + chairs + umbrellas) is present
    let instanced = 0;
    grp.traverse((c) => { if ((c as THREE.InstancedMesh).isInstancedMesh) instanced++; });
    expect(instanced).toBeGreaterThanOrEqual(3);
  });

  it("anchors the pickup marker within bounds and in the SE region", () => {
    expect(Math.abs(RESTAURANT.x)).toBeLessThanOrEqual(138);
    expect(Math.abs(RESTAURANT.z)).toBeLessThanOrEqual(138);
    expect(RESTAURANT.x).toBeGreaterThan(40);
    expect(RESTAURANT.z).toBeGreaterThan(40);
  });

  it("keeps all geometry within +/-138 and clear of the E/S district footprints", () => {
    const grp = makeRestaurantStreet();
    const box = new THREE.Box3().setFromObject(grp);
    // OUTER framing invariant (kept): everything stays within +/-138.
    expect(box.min.x).toBeGreaterThanOrEqual(-138);
    expect(box.max.x).toBeLessThanOrEqual(138);
    expect(box.min.z).toBeGreaterThanOrEqual(-138);
    expect(box.max.z).toBeLessThanOrEqual(138);
    // SE corner: clear of the E district (z in [-30,30]) and S district (x in [-30,30]).
    expect(box.min.x).toBeGreaterThan(30); // clear of S district x-band
    expect(box.min.z).toBeGreaterThan(30); // clear of E district z-band
    // RE-DERIVED tight bounds (D4): the cafe (x=62, w=12) + its west-shifted flank
    // box (x=48) now set the west edge at x=44; the patio/park/house set the rest.
    // Pinned to the ACTUAL new output (read from the builder) with a small margin
    // so this catches an unintended footprint/placement shift, not float jitter.
    expect(box.min.x).toBeCloseTo(44, 1);     // west edge: flank box left face
    expect(box.max.x).toBeCloseTo(124.5, 1);  // east edge: phone shop storefront right window (Task 10 retrofit)
    expect(box.min.z).toBeCloseTo(74, 1);     // north edge: skyline backdrop row
    expect(box.max.z).toBeCloseTo(132, 1);    // south edge: park / house lot
  });

  it("is deterministic across calls (same geometry, same anchor)", () => {
    const a = makeRestaurantStreet();
    const b = makeRestaurantStreet();
    const ba = new THREE.Box3().setFromObject(a);
    const bb = new THREE.Box3().setFromObject(b);
    expect(ba.min.toArray()).toEqual(bb.min.toArray());
    expect(ba.max.toArray()).toEqual(bb.max.toArray());
    let ca = 0; a.traverse(() => ca++);
    let cb = 0; b.traverse(() => cb++);
    expect(ca).toBe(cb);
    expect(RESTAURANT).toEqual({ x: 95, z: 103 });
  });
});
