// rishon3d/test/humanoid.test.ts
import { describe, it, expect } from "vitest";
import * as THREE from "three";
import { makeHumanoid, animateWalk, hairColorFor, HAIR_COLORS } from "../src/entities/Humanoid";

const palette = { skin: 0xf0c9a0, shirt: 0x2e6fb0, pants: 0x274060 };

function meshCount(o: THREE.Object3D): number {
  let n = 0;
  o.traverse((c) => { if ((c as THREE.Mesh).isMesh) n++; });
  return n;
}

describe("makeHumanoid", () => {
  it("builds a blocky head (box geometry), not a sphere", () => {
    const { group } = makeHumanoid(palette);
    const head = group.getObjectByName("head") as THREE.Mesh;
    expect(head).toBeTruthy();
    expect(head.geometry.type).toBe("BoxGeometry");
  });
  it("includes a backpack on the character", () => {
    const { group } = makeHumanoid(palette);
    expect(group.getObjectByName("backpack")).toBeTruthy();
  });
  it("gives the head a face (eyes + mouth) and spiky hair as children", () => {
    const { group } = makeHumanoid(palette);
    const head = group.getObjectByName("head") as THREE.Mesh;
    expect(group.getObjectByName("hair")).toBeTruthy();
    // base head + 2 ears + 2 eyes + mouth + hair = several meshes
    expect(meshCount(head)).toBeGreaterThanOrEqual(6);
  });
  it("dresses the torso as a jacket over a white shirt", () => {
    const { group } = makeHumanoid(palette);
    expect(group.getObjectByName("torso")).toBeTruthy();
    expect(group.getObjectByName("shirt")).toBeTruthy();
  });
  it("structures the backpack with a body, pocket and two straps", () => {
    const { group } = makeHumanoid(palette);
    const pack = group.getObjectByName("backpack") as THREE.Object3D;
    expect(meshCount(pack)).toBeGreaterThanOrEqual(4);
  });
  it("derives a deterministic hair color when none is supplied, but honors an explicit one", () => {
    expect(HAIR_COLORS).toContain(hairColorFor(palette));
    expect(hairColorFor(palette)).toBe(hairColorFor(palette));
    expect(hairColorFor({ ...palette, hair: 0x123456 })).toBe(0x123456);
  });
  it("exposes swinging limbs via animateWalk", () => {
    const { limbs } = makeHumanoid(palette);
    animateWalk(limbs, Math.PI / 2, 0.6);
    expect(limbs.leftLeg.rotation.x).not.toBe(0);
    expect(limbs.rightLeg.rotation.x).toBeCloseTo(-limbs.leftLeg.rotation.x, 6);
  });
});
