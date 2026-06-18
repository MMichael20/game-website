import * as THREE from "three";
import type { PropDef } from "./rishonMap";
import { getGeometry, getMaterial } from "./assets";
import { makeInstanced, type Placement } from "./InstancedProps";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { PALETTE } from "./palette";

// --- shared geometries (vertical offset baked in so one transform places the prop) ---
function trunkGeo(): THREE.BufferGeometry {
  return getGeometry("trunk", () => {
    const g = new THREE.BoxGeometry(0.5, 1.4, 0.5);
    g.translate(0, 0.7, 0);
    return g;
  });
}

// Conifer: a stepped pyramid of green cubes (wide bottom, narrow top).
export function coniferCanopyBoxes(): { y: number; s: number }[] {
  return [
    { y: 1.7, s: 2.2 },
    { y: 2.5, s: 1.6 },
    { y: 3.2, s: 1.0 },
  ];
}
function foliageGeo(): THREE.BufferGeometry {
  return getGeometry("foliageVoxel", () => {
    const boxes = coniferCanopyBoxes().map(({ y, s }) => {
      const b = new THREE.BoxGeometry(s, 0.9, s);
      b.translate(0, y, 0);
      return b;
    });
    return mergeGeometries(boxes);
  });
}

// Deciduous: a chunky cluster of cubes. Tuples are [x, y, z, size].
export function deciduousCanopyBoxes(): [number, number, number, number][] {
  return [
    [0, 2.3, 0, 2.0],
    [1.0, 2.5, 0.3, 1.2],
    [-0.9, 2.4, -0.4, 1.3],
    [0.2, 3.1, -0.2, 1.4],
    [-0.3, 2.0, 0.8, 1.1],
  ];
}
function deciduousGeo(): THREE.BufferGeometry {
  return getGeometry("foliageDecidVoxel", () => {
    const boxes = deciduousCanopyBoxes().map(([x, y, z, s]) => {
      const b = new THREE.BoxGeometry(s, s, s);
      b.translate(x, y, z);
      return b;
    });
    return mergeGeometries(boxes);
  });
}
function bushGeo(): THREE.BufferGeometry {
  return getGeometry("bushVoxel", () => {
    const specs: [number, number, number, number][] = [
      [0, 0.45, 0, 0.9],
      [0.5, 0.4, 0.2, 0.6],
      [-0.45, 0.4, -0.2, 0.6],
    ];
    const boxes = specs.map(([x, y, z, s]) => {
      const b = new THREE.BoxGeometry(s, s, s);
      b.translate(x, y, z);
      return b;
    });
    return mergeGeometries(boxes);
  });
}
const trunkMat = () => getMaterial("trunkMat", () => new THREE.MeshStandardMaterial({ color: PALETTE.trunk }));
const foliageMat = () => getMaterial("foliageMat", () => new THREE.MeshStandardMaterial({ color: PALETTE.leaf }));
const deciduousMat = () => getMaterial("foliageDecidMat", () => new THREE.MeshStandardMaterial({ color: PALETTE.leafDeep }));
const bushMat = () => getMaterial("bushMat", () => new THREE.MeshStandardMaterial({ color: PALETTE.bush }));

function benchGeo(): THREE.BufferGeometry {
  return getGeometry("bench", () => {
    const seat = new THREE.BoxGeometry(1.6, 0.12, 0.5); seat.translate(0, 0.5, 0);
    const back = new THREE.BoxGeometry(1.6, 0.5, 0.1); back.translate(0, 0.78, -0.2);
    const legL = new THREE.BoxGeometry(0.12, 0.5, 0.5); legL.translate(-0.7, 0.25, 0);
    const legR = new THREE.BoxGeometry(0.12, 0.5, 0.5); legR.translate(0.7, 0.25, 0);
    return mergeGeometries([seat, back, legL, legR]);
  });
}
const benchMat = () => getMaterial("benchMat", () => new THREE.MeshStandardMaterial({ color: PALETTE.benchWood }));

function placementsFor(props: PropDef[], kind: PropDef["kind"]): Placement[] {
  return props
    .filter((p) => p.kind === kind)
    .map((p, i) => ({ x: p.x, z: p.z, rotationY: (i * 2.39996) % (Math.PI * 2), scale: 0.85 + ((i * 7) % 5) * 0.08 }));
}

// Deterministic species per tree: 0 = conifer (cone), 1 = deciduous (round).
export function treeSpecies(index: number): number {
  return index % 2;
}

export function treeInstances(props: PropDef[]): THREE.Object3D {
  const group = new THREE.Group();
  const pl = placementsFor(props, "tree");
  if (pl.length === 0) return group;
  group.add(makeInstanced(trunkGeo(), trunkMat(), pl, 0));
  const conifer = pl.filter((_, i) => treeSpecies(i) === 0);
  const decid = pl.filter((_, i) => treeSpecies(i) === 1);
  if (conifer.length) group.add(makeInstanced(foliageGeo(), foliageMat(), conifer, 0));
  if (decid.length) group.add(makeInstanced(deciduousGeo(), deciduousMat(), decid, 0));
  return group;
}

export function bushInstances(props: PropDef[]): THREE.Object3D {
  const pl = placementsFor(props, "bush");
  return makeInstanced(bushGeo(), bushMat(), pl, 0);
}

export function benchInstances(props: PropDef[]): THREE.Object3D {
  const pl = placementsFor(props, "bench");
  return makeInstanced(benchGeo(), benchMat(), pl, 0);
}

export function makeStreetLight(def: PropDef): THREE.Object3D {
  const g = new THREE.Group();
  g.position.set(def.x, 0, def.z);
  const pole = new THREE.Mesh(
    getGeometry("slPole", () => new THREE.CylinderGeometry(0.08, 0.1, 3.4, 8)),
    getMaterial("slPoleMat", () => new THREE.MeshStandardMaterial({ color: PALETTE.lampPole })),
  );
  pole.position.y = 1.7; pole.castShadow = true;
  const lamp = new THREE.Mesh(
    getGeometry("slLamp", () => new THREE.BoxGeometry(0.5, 0.5, 0.5)),
    getMaterial("slLampMat", () => new THREE.MeshStandardMaterial({ color: PALETTE.lantern, emissive: PALETTE.lanternGlow, emissiveIntensity: 1.4 })),
  );
  lamp.position.y = 3.4;
  g.add(pole, lamp);
  return g;
}
