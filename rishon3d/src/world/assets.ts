import * as THREE from "three";

// Process-wide cache of shared geometries and materials. Keeps the GPU
// allocation count at O(distinct kinds) instead of O(objects), which is the
// main scaling lever as the world fills with props and agents.
const geometries = new Map<string, THREE.BufferGeometry>();
const materials = new Map<string, THREE.Material>();

export function getGeometry(key: string, make: () => THREE.BufferGeometry): THREE.BufferGeometry {
  let g = geometries.get(key);
  if (!g) { g = make(); geometries.set(key, g); }
  return g;
}

export function getMaterial(key: string, make: () => THREE.Material): THREE.Material {
  let m = materials.get(key);
  if (!m) { m = make(); materials.set(key, m); }
  return m;
}

export function disposeAssets(): void {
  for (const g of geometries.values()) g.dispose();
  for (const m of materials.values()) m.dispose();
  geometries.clear();
  materials.clear();
}

export function assetCounts(): { geometries: number; materials: number } {
  return { geometries: geometries.size, materials: materials.size };
}
