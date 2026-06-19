// rishon3d/test/flower.test.ts
import { describe, it, expect } from "vitest";
import * as THREE from "three";
import { makeFlower, makeFlowerMesh, FLOWER_PRESETS } from "../src/world/objects/flower";
import { makePottedPlant } from "../src/world/objects/pottedPlant";

function vertexCount(geo: THREE.BufferGeometry): number {
  return geo.getAttribute("position").count;
}

describe("makeFlower", () => {
  it("returns a merged, vertex-colored geometry with real positions", () => {
    const g = makeFlower();
    expect(g.attributes.color).toBeDefined();
    expect(vertexCount(g)).toBeGreaterThan(0);
  });

  it("more petals produce more vertices", () => {
    const few = vertexCount(makeFlower({ petalCount: 4 }));
    const many = vertexCount(makeFlower({ petalCount: 9 }));
    expect(many).toBeGreaterThan(few);
  });

  it("different petal colors produce different first-vertex colors", () => {
    const red = makeFlower({ petalColor: 0xff0000 });
    const blue = makeFlower({ petalColor: 0x0000ff });
    const ar = red.attributes.color as { getX(i: number): number };
    const ab = blue.attributes.color as { getX(i: number): number };
    // Stem comes first and is identical; somewhere the petal colors must differ,
    // so compare the whole color buffers rather than only vertex 0.
    const rArr = (red.attributes.color as { array: ArrayLike<number> }).array;
    const bArr = (blue.attributes.color as { array: ArrayLike<number> }).array;
    let differs = false;
    for (let i = 0; i < rArr.length; i++) {
      if (rArr[i] !== bArr[i]) { differs = true; break; }
    }
    expect(differs).toBe(true);
    // sanity: first-vertex accessors are usable
    expect(typeof ar.getX(0)).toBe("number");
    expect(typeof ab.getX(0)).toBe("number");
  });

  it("base sits near y=0 and top near the configured height", () => {
    const h = 0.5;
    const g = makeFlower({ height: h });
    g.computeBoundingBox();
    const bb = g.boundingBox!;
    expect(bb.min.y).toBeGreaterThanOrEqual(-0.05);
    expect(bb.min.y).toBeLessThan(0.05);
    expect(Math.abs(bb.max.y - h)).toBeLessThan(0.1);
  });

  it("ships a handful of color presets and builds a mesh", () => {
    expect(FLOWER_PRESETS.length).toBeGreaterThanOrEqual(4);
    const mesh = makeFlowerMesh(FLOWER_PRESETS[1]);
    expect(mesh.geometry.attributes.position.count).toBeGreaterThan(0);
  });
});

describe("makePottedPlant", () => {
  it("with bloom has more vertices than without", () => {
    const withBloom = vertexCount(makePottedPlant({ bloom: true }));
    const without = vertexCount(makePottedPlant({ bloom: false }));
    expect(withBloom).toBeGreaterThan(without);
  });

  it("base sits near y=0 and top near the configured height", () => {
    const h = 0.8;
    const g = makePottedPlant({ height: h });
    g.computeBoundingBox();
    const bb = g.boundingBox!;
    expect(bb.min.y).toBeGreaterThanOrEqual(-0.05);
    expect(bb.min.y).toBeLessThan(0.05);
    expect(Math.abs(bb.max.y - h)).toBeLessThan(0.2);
  });
});
