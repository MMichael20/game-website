import { describe, it, expect } from "vitest";
import * as THREE from "three";
import { makeInstanced, type Placement } from "../src/world/InstancedProps";

describe("makeInstanced", () => {
  it("creates one InstancedMesh sized to the placement count", () => {
    const geo = new THREE.BoxGeometry(1, 1, 1);
    const mat = new THREE.MeshStandardMaterial();
    const placements: Placement[] = [{ x: 1, z: 2 }, { x: -3, z: 4 }, { x: 0, z: 0 }];
    const mesh = makeInstanced(geo, mat, placements, 0.5);
    expect(mesh).toBeInstanceOf(THREE.InstancedMesh);
    expect(mesh.count).toBe(3);
  });

  it("positions instances at their placement coordinates and baseY", () => {
    const geo = new THREE.BoxGeometry(1, 1, 1);
    const mat = new THREE.MeshStandardMaterial();
    const mesh = makeInstanced(geo, mat, [{ x: 5, z: -7 }], 1.5);
    const m = new THREE.Matrix4();
    mesh.getMatrixAt(0, m);
    const pos = new THREE.Vector3().setFromMatrixPosition(m);
    expect(pos.x).toBeCloseTo(5, 5);
    expect(pos.y).toBeCloseTo(1.5, 5);
    expect(pos.z).toBeCloseTo(-7, 5);
  });

  it("handles an empty placement list", () => {
    const mesh = makeInstanced(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial(), [], 0);
    expect(mesh.count).toBe(0);
  });
});
