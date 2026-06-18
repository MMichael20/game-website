// rishon3d/test/humanoid.test.ts
import { describe, it, expect } from "vitest";
import * as THREE from "three";
import { makeHumanoid, animateWalk } from "../src/entities/Humanoid";

const palette = { skin: 0xf0c9a0, shirt: 0x2e6fb0, pants: 0x274060 };

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
  it("exposes swinging limbs via animateWalk", () => {
    const { limbs } = makeHumanoid(palette);
    animateWalk(limbs, Math.PI / 2, 0.6);
    expect(limbs.leftLeg.rotation.x).not.toBe(0);
    expect(limbs.rightLeg.rotation.x).toBeCloseTo(-limbs.leftLeg.rotation.x, 6);
  });
});
