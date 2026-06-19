import { describe, it, expect } from "vitest";
import * as THREE from "three";
import { makeCake } from "../src/world/objects/cake";
import { makeCupcake } from "../src/world/objects/cupcake";
import { makeDonut } from "../src/world/objects/donut";

function bbox(g: THREE.BufferGeometry): THREE.Box3 {
  g.computeBoundingBox();
  return g.boundingBox!;
}

describe("cake", () => {
  it("builds a vertex-colored geometry with positions", () => {
    const g = makeCake();
    expect(g.getAttribute("color")).toBeTruthy();
    expect(g.getAttribute("position").count).toBeGreaterThan(0);
  });

  it("adds vertices for more tiers", () => {
    const one = makeCake({ tiers: 1 });
    const three = makeCake({ tiers: 3 });
    expect(three.getAttribute("position").count).toBeGreaterThan(
      one.getAttribute("position").count,
    );
  });

  it("has fewer vertices without a cherry", () => {
    const withCherry = makeCake({ cherry: true });
    const noCherry = makeCake({ cherry: false });
    expect(noCherry.getAttribute("position").count).toBeLessThan(
      withCherry.getAttribute("position").count,
    );
  });
});

describe("cupcake", () => {
  it("builds a vertex-colored geometry with positions", () => {
    const g = makeCupcake();
    expect(g.getAttribute("color")).toBeTruthy();
    expect(g.getAttribute("position").count).toBeGreaterThan(0);
  });

  it("has its frosting top above the base", () => {
    const b = bbox(makeCupcake());
    expect(b.max.y).toBeGreaterThan(0);
  });
});

describe("donut", () => {
  it("builds a vertex-colored geometry with positions", () => {
    const g = makeDonut();
    expect(g.getAttribute("color")).toBeTruthy();
    expect(g.getAttribute("position").count).toBeGreaterThan(0);
  });

  it("is a flat ring: wider than it is tall", () => {
    const b = bbox(makeDonut());
    const size = b.getSize(new THREE.Vector3());
    expect(size.y).toBeLessThan(size.x);
    expect(size.y).toBeLessThan(size.z);
  });
});
