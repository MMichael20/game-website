// rishon3d/test/airport.test.ts
import { describe, it, expect } from "vitest";
import * as THREE from "three";
import { makeAirport, AIRPORT, AIRPORT_PICKUP } from "../src/world/airport";

// Count every Mesh / InstancedMesh under an object (the landmark merges + instances).
function meshCount(obj: THREE.Object3D): number {
  let n = 0;
  obj.traverse((o) => { if ((o as THREE.Mesh).isMesh) n++; });
  return n;
}
function childCount(obj: THREE.Object3D): number {
  let n = 0;
  obj.traverse(() => n++);
  return n;
}

describe("makeAirport", () => {
  it("returns a non-empty Object3D with real meshes", () => {
    const a = makeAirport();
    expect(a).toBeInstanceOf(THREE.Object3D);
    expect(meshCount(a)).toBeGreaterThan(4); // ground, terminal, glass, frame, parapet, canopy, posts, sign, tower, cab, carts
  });

  it("is positioned at the terminal anchor", () => {
    const a = makeAirport();
    expect(a.position.x).toBeCloseTo(AIRPORT.x, 6);
    expect(a.position.z).toBeCloseTo(AIRPORT.z, 6);
  });

  it("is deterministic across calls (same mesh + child count)", () => {
    const a = makeAirport();
    const b = makeAirport();
    expect(meshCount(a)).toBe(meshCount(b));
    expect(childCount(a)).toBe(childCount(b));
  });
});

describe("airport anchors", () => {
  it("keeps AIRPORT within ground bounds and in the NE region", () => {
    expect(Math.abs(AIRPORT.x)).toBeLessThanOrEqual(138);
    expect(Math.abs(AIRPORT.z)).toBeLessThanOrEqual(138);
    expect(AIRPORT.x).toBeGreaterThan(40); // east of center
    expect(AIRPORT.z).toBeLessThan(-40);   // north of center
  });

  it("keeps AIRPORT_PICKUP within ground bounds and in the NE region", () => {
    expect(Math.abs(AIRPORT_PICKUP.x)).toBeLessThanOrEqual(138);
    expect(Math.abs(AIRPORT_PICKUP.z)).toBeLessThanOrEqual(138);
    expect(AIRPORT_PICKUP.x).toBeGreaterThan(40);
    expect(AIRPORT_PICKUP.z).toBeLessThan(-40);
  });

  it("places the pickup curb south of (toward the city from) the terminal", () => {
    // The drop-off apron extends toward +Z (the city at z~-90), so the pickup
    // lane sits at a greater z than the terminal center.
    expect(AIRPORT_PICKUP.z).toBeGreaterThan(AIRPORT.z);
  });
});
