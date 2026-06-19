import { describe, it, expect } from "vitest";
import * as THREE from "three";
import { makeUmbrella, makeUmbrellaMesh } from "../src/world/objects/umbrella";
import { PALETTE } from "../src/world/palette";

// Does the merged geometry contain at least one vertex of the given hex color?
function hasColor(geo: THREE.BufferGeometry, hex: number): boolean {
  const target = new THREE.Color(hex);
  const col = geo.getAttribute("color");
  for (let i = 0; i < col.count; i++) {
    if (
      Math.abs(col.getX(i) - target.r) < 1e-3 &&
      Math.abs(col.getY(i) - target.g) < 1e-3 &&
      Math.abs(col.getZ(i) - target.b) < 1e-3
    ) {
      return true;
    }
  }
  return false;
}

describe("umbrella object", () => {
  it("builds a vertex-colored geometry with real geometry", () => {
    const g = makeUmbrella();
    expect(g.getAttribute("color")).toBeTruthy();
    expect(g.getAttribute("position").count).toBeGreaterThan(0);
  });

  it("more ribs yield more vertices than fewer ribs", () => {
    const few = makeUmbrella({ ribs: 6 });
    const many = makeUmbrella({ ribs: 12 });
    expect(many.getAttribute("position").count).toBeGreaterThan(
      few.getAttribute("position").count,
    );
  });

  it("canopy spans about 2*radius wide", () => {
    const radius = 1.6;
    const g = makeUmbrella({ radius });
    g.computeBoundingBox();
    const size = new THREE.Vector3();
    g.boundingBox!.getSize(size);
    const width = Math.max(size.x, size.z);
    // panels overlap a touch + valance scallops, so allow a generous tolerance.
    expect(width).toBeGreaterThan(2 * radius - 0.4);
    expect(width).toBeLessThan(2 * radius + 0.6);
  });

  it("peaks near the configured height", () => {
    const height = 2.7;
    const g = makeUmbrella({ height });
    g.computeBoundingBox();
    // finial/spike sits a little above the canopy peak; stay within tolerance.
    expect(g.boundingBox!.max.y).toBeGreaterThan(height - 0.1);
    expect(g.boundingBox!.max.y).toBeLessThan(height + 0.5);
  });

  it("alternating panels contain both stripe colors", () => {
    const g = makeUmbrella();
    expect(hasColor(g, PALETTE.awningRed)).toBe(true);
    expect(hasColor(g, PALETTE.awningStripe)).toBe(true);
  });

  it("exposes a ready mesh with the shared material", () => {
    const m = makeUmbrellaMesh();
    expect(m).toBeInstanceOf(THREE.Mesh);
    expect((m.material as THREE.MeshStandardMaterial).vertexColors).toBe(true);
  });
});
