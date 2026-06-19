// rishon3d/test/carMesh-detail.test.ts
import { describe, it, expect } from "vitest";
import * as THREE from "three";
import { makeCarBody } from "../src/entities/carMesh";

function countMeshes(g: THREE.Object3D): number {
  let n = 0;
  g.traverse((o) => { if ((o as THREE.Mesh).isMesh) n++; });
  return n;
}

function countCylinders(g: THREE.Object3D): number {
  let n = 0;
  g.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh && (m.geometry as THREE.CylinderGeometry)?.type === "CylinderGeometry") n++;
  });
  return n;
}

describe("makeCarBody (detailed)", () => {
  it("returns a THREE.Group", () => {
    expect(makeCarBody({ bodyColor: 0xc0392b })).toBeInstanceOf(THREE.Group);
  });

  it("is built from many parts (a detailed sedan with wheels has >= 12 meshes)", () => {
    const sedan = makeCarBody({ bodyColor: 0xc0392b, withWheels: true });
    expect(countMeshes(sedan)).toBeGreaterThanOrEqual(12);
  });

  it("adds at least 4 cylinder (wheel-ish) meshes when withWheels is true", () => {
    const plain = makeCarBody({ bodyColor: 0x2980b9 });
    const wheeled = makeCarBody({ bodyColor: 0x2980b9, withWheels: true });
    expect(countCylinders(wheeled) - countCylinders(plain)).toBeGreaterThanOrEqual(4);
  });

  it("a taxi variant adds at least one more mesh than a sedan", () => {
    const sedan = makeCarBody({ bodyColor: 0xefc94c, variant: "sedan" });
    const taxi = makeCarBody({ bodyColor: 0xefc94c, variant: "taxi" });
    expect(countMeshes(taxi)).toBeGreaterThan(countMeshes(sedan));
  });

  it("preserves the overall envelope (~+/-1.1 in x, ~+/-2.0 in z)", () => {
    const box = new THREE.Box3().setFromObject(makeCarBody({ bodyColor: 0xc0392b, withWheels: true }));
    expect(box.min.x).toBeGreaterThanOrEqual(-1.1);
    expect(box.max.x).toBeLessThanOrEqual(1.1);
    expect(box.min.z).toBeGreaterThanOrEqual(-2.0);
    expect(box.max.z).toBeLessThanOrEqual(2.0);
  });
});
