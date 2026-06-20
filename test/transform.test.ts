import { describe, it, expect } from "vitest";
import * as THREE from "three";
import { rotateXZ, applyTransform } from "../src/world/system/transform";
import type { ObjectResult } from "../src/world/system/types";

describe("rotateXZ", () => {
  it("matches a three.js R_y rotation for 90-degree steps", () => {
    for (const deg of [0, 90, 180, 270]) {
      const obj = new THREE.Object3D();
      obj.rotation.y = (deg * Math.PI) / 180;
      obj.updateMatrixWorld(true);
      const p = new THREE.Vector3(2, 0, 5).applyMatrix4(obj.matrixWorld);
      const r = rotateXZ(2, 5, deg);
      expect(r.x).toBeCloseTo(p.x, 6);
      expect(r.z).toBeCloseTo(p.z, 6);
    }
  });
});

describe("applyTransform", () => {
  it("moves the mesh and the collider/anchor together", () => {
    const result: ObjectResult = {
      mesh: new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1)),
      colliders: [{ x: 1, y: 0.5, z: 0, hx: 0.5, hy: 0.5, hz: 0.5 }],
      anchors: { door: { x: 0, z: 2 } },
    };
    const out = applyTransform(result, { x: 10, z: 20, rot: 90 });
    expect(out.anchors!.door.x).toBeCloseTo(12, 6);
    expect(out.anchors!.door.z).toBeCloseTo(20, 6);
    expect(out.colliders![0].x).toBeCloseTo(10, 6);
    expect(out.colliders![0].z).toBeCloseTo(19, 6);
  });

  it("swaps box/rect extents for 90 and 270", () => {
    const result: ObjectResult = {
      mesh: new THREE.Object3D(),
      colliders: [{ x: 0, y: 1, z: 0, hx: 3, hy: 1, hz: 0.5 }],
      obstacles: [{ x: 0, z: 0, w: 6, d: 1 }],
    };
    const out = applyTransform(result, { x: 0, z: 0, rot: 90 });
    expect(out.colliders![0].hx).toBeCloseTo(0.5, 6);
    expect(out.colliders![0].hz).toBeCloseTo(3, 6);
    expect(out.obstacles![0].w).toBeCloseTo(1, 6);
    expect(out.obstacles![0].d).toBeCloseTo(6, 6);
  });
});
