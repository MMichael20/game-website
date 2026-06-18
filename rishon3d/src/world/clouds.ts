// rishon3d/src/world/clouds.ts
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { mulberry32 } from "./rng";
import { PALETTE } from "./palette";

export interface CloudPlacement { x: number; y: number; z: number; scale: number }

// Deterministic chunky-cloud positions high above the city.
export function cloudPlacements(seed: number, count: number, spread: number, height: number): CloudPlacement[] {
  const rng = mulberry32(seed);
  const out: CloudPlacement[] = [];
  for (let i = 0; i < count; i++) {
    const x = (rng() * 2 - 1) * spread;
    const z = (rng() * 2 - 1) * spread;
    const y = height + (rng() * 2 - 1) * 10;
    const scale = 0.8 + rng() * 1.8;
    out.push({ x, y, z, scale });
  }
  return out;
}

// One cloud = several overlapping white boxes merged into a single geometry.
function cloudGeo(): THREE.BufferGeometry {
  const specs: [number, number, number, number, number, number][] = [
    // w, h, d, x, y, z
    [8, 3, 5, 0, 0, 0],
    [5, 2.6, 4, 4, -0.3, 1],
    [6, 2.8, 5, -3.5, 0.2, -0.5],
    [4.5, 2.4, 4, 1.5, 1.0, -1.2],
  ];
  const boxes = specs.map(([w, h, d, x, y, z]) => {
    const g = new THREE.BoxGeometry(w, h, d);
    g.translate(x, y, z);
    return g;
  });
  return mergeGeometries(boxes);
}

// Flat, always-bright white clouds (unlit), instanced for one draw call.
export function makeClouds(seed = 7, count = 10): THREE.Object3D {
  const geo = cloudGeo();
  const mat = new THREE.MeshBasicMaterial({ color: PALETTE.cloud });
  const placements = cloudPlacements(seed, count, 130, 75);
  const mesh = new THREE.InstancedMesh(geo, mat, placements.length);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const s = new THREE.Vector3();
  const p = new THREE.Vector3();
  placements.forEach((c, i) => {
    s.set(c.scale, c.scale, c.scale);
    p.set(c.x, c.y, c.z);
    m.compose(p, q, s);
    mesh.setMatrixAt(i, m);
  });
  mesh.instanceMatrix.needsUpdate = true;
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  return mesh;
}
