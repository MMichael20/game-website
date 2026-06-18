import * as THREE from "three";
import type { PropDef } from "./rishonMap";
import { getGeometry, getMaterial } from "./assets";
import { makeInstanced, type Placement } from "./InstancedProps";

// --- shared geometries (vertical offset baked in so one transform places the prop) ---
function trunkGeo(): THREE.BufferGeometry {
  return getGeometry("trunk", () => {
    const g = new THREE.CylinderGeometry(0.18, 0.24, 1.4, 8);
    g.translate(0, 0.7, 0);
    return g;
  });
}
function foliageGeo(): THREE.BufferGeometry {
  return getGeometry("foliage", () => {
    const g = new THREE.ConeGeometry(1.1, 2.2, 9);
    g.translate(0, 2.2, 0);
    return g;
  });
}
function bushGeo(): THREE.BufferGeometry {
  return getGeometry("bush", () => {
    const g = new THREE.SphereGeometry(0.7, 8, 6);
    g.scale(1, 0.7, 1);
    g.translate(0, 0.5, 0);
    return g;
  });
}
const trunkMat = () => getMaterial("trunkMat", () => new THREE.MeshStandardMaterial({ color: 0x6b4a2b }));
const foliageMat = () => getMaterial("foliageMat", () => new THREE.MeshStandardMaterial({ color: 0x3f7d3a }));
const bushMat = () => getMaterial("bushMat", () => new THREE.MeshStandardMaterial({ color: 0x4f8c46 }));

function placementsFor(props: PropDef[], kind: PropDef["kind"]): Placement[] {
  return props
    .filter((p) => p.kind === kind)
    .map((p, i) => ({ x: p.x, z: p.z, rotationY: (i * 2.39996) % (Math.PI * 2), scale: 0.85 + ((i * 7) % 5) * 0.08 }));
}

export function treeInstances(props: PropDef[]): THREE.Object3D {
  const group = new THREE.Group();
  const pl = placementsFor(props, "tree");
  if (pl.length === 0) return group;
  group.add(makeInstanced(trunkGeo(), trunkMat(), pl, 0));
  group.add(makeInstanced(foliageGeo(), foliageMat(), pl, 0));
  return group;
}

export function bushInstances(props: PropDef[]): THREE.Object3D {
  const pl = placementsFor(props, "bush");
  return makeInstanced(bushGeo(), bushMat(), pl, 0);
}

export function makeStreetLight(def: PropDef): THREE.Object3D {
  const g = new THREE.Group();
  g.position.set(def.x, 0, def.z);
  const pole = new THREE.Mesh(
    getGeometry("slPole", () => new THREE.CylinderGeometry(0.08, 0.1, 3.4, 8)),
    getMaterial("slPoleMat", () => new THREE.MeshStandardMaterial({ color: 0x2b2b30 })),
  );
  pole.position.y = 1.7; pole.castShadow = true;
  const lamp = new THREE.Mesh(
    getGeometry("slLamp", () => new THREE.BoxGeometry(0.4, 0.18, 0.4)),
    getMaterial("slLampMat", () => new THREE.MeshStandardMaterial({ color: 0xffd98a, emissive: 0xffb24d, emissiveIntensity: 1.2 })),
  );
  lamp.position.y = 3.5;
  g.add(pole, lamp);
  return g;
}
