import { describe, it, expect, beforeEach } from "vitest";
import * as THREE from "three";
import { getGeometry, getMaterial, disposeAssets, assetCounts } from "../src/world/assets";

describe("asset cache", () => {
  beforeEach(() => disposeAssets());

  it("memoizes geometry by key", () => {
    let calls = 0;
    const a = getGeometry("box", () => { calls++; return new THREE.BoxGeometry(1, 1, 1); });
    const b = getGeometry("box", () => { calls++; return new THREE.BoxGeometry(1, 1, 1); });
    expect(a).toBe(b);
    expect(calls).toBe(1);
  });

  it("distinct keys produce distinct instances", () => {
    const a = getGeometry("g1", () => new THREE.BoxGeometry(1, 1, 1));
    const b = getGeometry("g2", () => new THREE.BoxGeometry(2, 2, 2));
    expect(a).not.toBe(b);
    expect(assetCounts().geometries).toBe(2);
  });

  it("memoizes materials and disposeAssets clears the cache", () => {
    getMaterial("red", () => new THREE.MeshStandardMaterial({ color: 0xff0000 }));
    expect(assetCounts().materials).toBe(1);
    disposeAssets();
    expect(assetCounts()).toEqual({ geometries: 0, materials: 0 });
  });
});
