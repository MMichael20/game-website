import { describe, it, expect } from "vitest";
import * as THREE from "three";
import { makeIceCream } from "../src/world/objects/iceCream";
import { makeDrinkCup } from "../src/world/objects/drinkCup";

function bbox(g: THREE.BufferGeometry): THREE.Box3 {
  g.computeBoundingBox();
  return g.boundingBox!;
}

describe("iceCream", () => {
  it("builds a vertex-colored geometry with positions", () => {
    const g = makeIceCream();
    expect(g.getAttribute("color")).toBeTruthy();
    expect(g.getAttribute("position").count).toBeGreaterThan(0);
  });

  it("adds vertices for each extra scoop", () => {
    const one = makeIceCream({ flavors: [0xff0000], cherry: false, drip: false });
    const three = makeIceCream({
      flavors: [0xff0000, 0x00ff00, 0x0000ff],
      cherry: false,
      drip: false,
    });
    expect(three.getAttribute("position").count).toBeGreaterThan(
      one.getAttribute("position").count,
    );
  });

  it("has fewer vertices without a cherry", () => {
    const withCherry = makeIceCream({ cherry: true });
    const noCherry = makeIceCream({ cherry: false });
    expect(noCherry.getAttribute("position").count).toBeLessThan(
      withCherry.getAttribute("position").count,
    );
  });

  it("is taller than it is wide", () => {
    const b = bbox(makeIceCream());
    const size = b.getSize(new THREE.Vector3());
    expect(size.y).toBeGreaterThan(size.x);
    expect(size.y).toBeGreaterThan(size.z);
  });
});

describe("drinkCup", () => {
  it("returns geometry with the straw extending above the cup", () => {
    const g = makeDrinkCup();
    expect(g.getAttribute("position").count).toBeGreaterThan(0);
    const b = bbox(g);
    // Cup body + lid is roughly 0.43u; the straw should push the top well above it.
    expect(b.max.y).toBeGreaterThan(0.55);
  });
});
