import * as THREE from "three";
import type { PropDef } from "./rishonMap";
import { mulberry32 } from "./rng";
import { getGeometry, getMaterial } from "./assets";

export const PARK = { x: -58, z: 58, size: 34 };

// Deterministic trees + benches scattered within the park footprint.
export function parkProps(seed = 5150): PropDef[] {
  const rng = mulberry32(seed);
  const out: PropDef[] = [];
  const half = PARK.size / 2 - 3; // keep a margin inside the edge
  for (let i = 0; i < 18; i++) {
    const x = PARK.x + (rng() * 2 - 1) * half;
    const z = PARK.z + (rng() * 2 - 1) * half;
    out.push({ id: `park-t-${i}`, kind: "tree", x, z });
  }
  for (let i = 0; i < 6; i++) {
    const x = PARK.x + (rng() * 2 - 1) * half;
    const z = PARK.z + (rng() * 2 - 1) * half;
    out.push({ id: `park-b-${i}`, kind: "bench", x, z });
  }
  return out;
}

export function makeParkGround(): THREE.Object3D {
  const g = new THREE.Group();
  const grass = new THREE.Mesh(
    getGeometry(`parkGrass-${PARK.size}`, () => new THREE.PlaneGeometry(PARK.size, PARK.size)),
    getMaterial("parkGrassMat", () => new THREE.MeshStandardMaterial({ color: 0x4a7a3a })),
  );
  grass.rotation.x = -Math.PI / 2;
  grass.position.set(PARK.x, 0.03, PARK.z);
  grass.receiveShadow = true;
  g.add(grass);
  const path = new THREE.Mesh(
    getGeometry(`parkPath-${PARK.size}`, () => new THREE.PlaneGeometry(PARK.size, 3)),
    getMaterial("parkPathMat", () => new THREE.MeshStandardMaterial({ color: 0xb8a888 })),
  );
  path.rotation.x = -Math.PI / 2;
  path.position.set(PARK.x, 0.04, PARK.z);
  path.receiveShadow = true;
  g.add(path);
  return g;
}
