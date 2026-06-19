import { describe, it, expect } from "vitest";
import * as THREE from "three";
import {
  treeSpecies, treeInstances, benchInstances, coniferCanopyBoxes, deciduousCanopyBoxes,
  flowerbedInstances, trashcanInstances, planterInstances, flowerDots,
} from "../src/world/props";
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

describe("voxel canopies", () => {
  it("conifer canopy is a stack that narrows toward the top", () => {
    const layers = coniferCanopyBoxes();
    expect(layers.length).toBeGreaterThanOrEqual(3);
    for (let i = 1; i < layers.length; i++) {
      expect(layers[i].y).toBeGreaterThan(layers[i - 1].y); // higher
      expect(layers[i].s).toBeLessThan(layers[i - 1].s);    // narrower
    }
  });
  it("deciduous canopy is a multi-cube cluster", () => {
    expect(deciduousCanopyBoxes().length).toBeGreaterThanOrEqual(4);
  });
  it("deciduous canopy is enlarged/chunky (a fat core cube)", () => {
    const sizes = deciduousCanopyBoxes().map(([, , , s]) => s);
    expect(Math.max(...sizes)).toBeGreaterThanOrEqual(2.5); // bold lush silhouette
  });
});

const FURNITURE: PropDef[] = [
  { id: "f1", kind: "flowerbed", x: 0, z: 0 },
  { id: "f2", kind: "flowerbed", x: 4, z: 0 },
  { id: "tc1", kind: "trashcan", x: 8, z: 0 },
  { id: "pl1", kind: "planter", x: 12, z: 0 },
  { id: "pl2", kind: "planter", x: 16, z: 0 },
  { id: "t", kind: "tree", x: 20, z: 0 },
  { id: "b", kind: "bench", x: 24, z: 0 },
];

function instancedMeshes(o: THREE.Object3D): THREE.InstancedMesh[] {
  const out: THREE.InstancedMesh[] = [];
  o.traverse((c) => { if ((c as THREE.InstancedMesh).isInstancedMesh) out.push(c as THREE.InstancedMesh); });
  return out;
}

describe("flowerbedInstances", () => {
  it("filters to flowerbed props only and builds base + dot meshes", () => {
    const o = flowerbedInstances(FURNITURE);
    const meshes = instancedMeshes(o);
    // base mesh + dot mesh, each with one instance per flowerbed prop (2)
    expect(meshes.length).toBe(2);
    for (const m of meshes) expect(m.count).toBe(2);
  });
  it("dot geometry is non-empty merged geometry with vertex colors", () => {
    const meshes = instancedMeshes(flowerbedInstances(FURNITURE));
    const dots = meshes[1];
    expect(dots.geometry.attributes.position.count).toBeGreaterThan(0);
    expect(dots.geometry.attributes.color).toBeTruthy();
  });
  it("uses several distinct blossom colors", () => {
    const hexes = new Set(flowerDots().map((d) => d.hex));
    expect(hexes.size).toBeGreaterThanOrEqual(3);
  });
  it("returns an empty group when there are no flowerbeds", () => {
    expect(instancedMeshes(flowerbedInstances([{ id: "t", kind: "tree", x: 0, z: 0 }])).length).toBe(0);
  });
});

describe("trashcanInstances", () => {
  it("creates one instance per trashcan prop", () => {
    const mesh = trashcanInstances(FURNITURE) as THREE.InstancedMesh;
    expect(mesh.count).toBe(1);
    expect(mesh.geometry.attributes.position.count).toBeGreaterThan(0);
  });
});

describe("planterInstances", () => {
  it("creates one instance per planter prop with a merged stone+hedge geometry", () => {
    const mesh = planterInstances(FURNITURE) as THREE.InstancedMesh;
    expect(mesh.count).toBe(2);
    expect(mesh.geometry.attributes.position.count).toBeGreaterThan(0);
    expect(mesh.geometry.attributes.color).toBeTruthy(); // two-tone via vertex colors
  });
});

describe("furniture determinism", () => {
  it("rebuilds identical instance transforms for the same props", () => {
    const a = planterInstances(FURNITURE) as THREE.InstancedMesh;
    const b = planterInstances(FURNITURE) as THREE.InstancedMesh;
    expect(Array.from(a.instanceMatrix.array)).toEqual(Array.from(b.instanceMatrix.array));
  });
});
