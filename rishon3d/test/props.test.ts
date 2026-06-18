import { describe, it, expect } from "vitest";
import * as THREE from "three";
import { treeSpecies, treeInstances, benchInstances } from "../src/world/props";
import type { PropDef } from "../src/world/rishonMap";

describe("treeSpecies", () => {
  it("is deterministic and partitions into two species", () => {
    const kinds = new Set([0, 1, 2, 3, 4, 5].map(treeSpecies));
    expect(kinds.has(0)).toBe(true);
    expect(kinds.has(1)).toBe(true);
    expect(treeSpecies(2)).toBe(treeSpecies(2));
    for (const i of [0, 1, 2, 3]) expect([0, 1]).toContain(treeSpecies(i));
  });
});

describe("treeInstances", () => {
  it("returns a group containing a trunk plus foliage instanced meshes", () => {
    const props: PropDef[] = [
      { id: "t1", kind: "tree", x: 0, z: 0 },
      { id: "t2", kind: "tree", x: 4, z: 0 },
      { id: "b1", kind: "bush", x: 8, z: 0 },
    ];
    const grp = treeInstances(props) as THREE.Group;
    const meshes = grp.children.filter((c) => (c as THREE.InstancedMesh).isInstancedMesh);
    // trunk (2) + at least one foliage species
    expect(meshes.length).toBeGreaterThanOrEqual(2);
    const total = meshes.reduce((n, m) => n + (m as THREE.InstancedMesh).count, 0);
    // 2 trunks + 2 foliage instances spread across species
    expect(total).toBe(4);
  });
});

describe("benchInstances", () => {
  it("creates one instance per bench prop", () => {
    const props: PropDef[] = [
      { id: "x1", kind: "bench", x: 1, z: 1 },
      { id: "x2", kind: "bench", x: 2, z: 2 },
      { id: "t", kind: "tree", x: 0, z: 0 },
    ];
    const mesh = benchInstances(props) as THREE.InstancedMesh;
    expect(mesh.count).toBe(2);
  });
});
