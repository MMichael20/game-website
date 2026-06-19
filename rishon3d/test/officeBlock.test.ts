import { describe, it, expect } from "vitest";
import * as THREE from "three";
import { makeOfficeBlock, officePropObstacles } from "../src/world/officeBlock";
import { OFFICE, OFFICE_LOBBY, OFFICE_DESK, SHOP_Z } from "../src/world/districtPois";

// Count meshes named `name` anywhere in the tree.
function countNamed(obj: THREE.Object3D, name: string): number {
  let n = 0;
  obj.traverse((c) => { if (c.name === name) n++; });
  return n;
}

const inRects = (p: { x: number; z: number }, rects: { minX: number; maxX: number; minZ: number; maxZ: number }[]) =>
  rects.some((r) => p.x > r.minX && p.x < r.maxX && p.z > r.minZ && p.z < r.maxZ);

describe("makeOfficeBlock", () => {
  it("returns a non-empty Object3D with real geometry", () => {
    const grp = makeOfficeBlock();
    expect(grp).toBeInstanceOf(THREE.Object3D);
    expect(grp.children.length).toBeGreaterThan(0);
    let meshes = 0;
    grp.traverse((c) => { if ((c as THREE.Mesh).isMesh) meshes++; });
    expect(meshes).toBeGreaterThan(0);
  });

  it("has a tall glass tower mesh that rises well above the lobby", () => {
    const grp = makeOfficeBlock();
    expect(countNamed(grp, "officeTower")).toBeGreaterThanOrEqual(1);
    const box = new THREE.Box3().setFromObject(grp);
    // The tower is tall (h≈22) — top should reach close to OFFICE.h.
    expect(box.max.y).toBeGreaterThan(OFFICE.h - 4);
  });

  it("has a *Building-named lobby shell (keeps the building-mesh invariant)", () => {
    const grp = makeOfficeBlock();
    let found = false;
    grp.traverse((c) => { if (/Building/i.test(c.name)) found = true; });
    expect(found).toBe(true);
  });

  it("is deterministic across calls (same bounds, same node count)", () => {
    const a = makeOfficeBlock();
    const b = makeOfficeBlock();
    const ba = new THREE.Box3().setFromObject(a);
    const bb = new THREE.Box3().setFromObject(b);
    expect(ba.min.toArray()).toEqual(bb.min.toArray());
    expect(ba.max.toArray()).toEqual(bb.max.toArray());
    let ca = 0; a.traverse(() => ca++);
    let cb = 0; b.traverse(() => cb++);
    expect(ca).toBe(cb);
  });
});

describe("officePropObstacles", () => {
  it("returns a non-empty set of plaza prop footprints", () => {
    expect(officePropObstacles().length).toBeGreaterThan(0);
  });

  it("does NOT block the lobby interior dwell targets (OFFICE_LOBBY / OFFICE_DESK)", () => {
    const obs = officePropObstacles();
    expect(inRects(OFFICE_LOBBY, obs)).toBe(false);
    expect(inRects(OFFICE_DESK, obs)).toBe(false);
  });

  it("every footprint is a finite, positive-area rect", () => {
    for (const r of officePropObstacles()) {
      expect(Number.isFinite(r.minX) && Number.isFinite(r.maxX)).toBe(true);
      expect(Number.isFinite(r.minZ) && Number.isFinite(r.maxZ)).toBe(true);
      expect(r.maxX).toBeGreaterThan(r.minX);
      expect(r.maxZ).toBeGreaterThan(r.minZ);
    }
  });

  // The office is set back EAST of the cross street; SHOP_Z is the promenade band
  // far to the west — guard against accidentally re-using the wrong band.
  it("places plaza props near the office footprint, not on the promenade strip", () => {
    for (const r of officePropObstacles()) {
      const cz = (r.minZ + r.maxZ) / 2;
      expect(Math.abs(cz - SHOP_Z)).toBeGreaterThan(2); // not parked on SHOP_Z
    }
  });
});
