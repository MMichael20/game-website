import * as THREE from "three";

export interface Placement {
  x: number;
  z: number;
  rotationY?: number;
  scale?: number;
}

const UP = new THREE.Vector3(0, 1, 0);

// Renders many identical static props (trees, bushes, poles) in a single draw
// call. Bake vertical offsets into the source geometry (geometry.translate) so
// one transform per instance places the whole prop on the ground plane.
export function makeInstanced(
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  placements: Placement[],
  baseY: number,
): THREE.InstancedMesh {
  const mesh = new THREE.InstancedMesh(geometry, material, placements.length);
  const matrix = new THREE.Matrix4();
  const quat = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  const pos = new THREE.Vector3();
  placements.forEach((p, i) => {
    quat.setFromAxisAngle(UP, p.rotationY ?? 0);
    const s = p.scale ?? 1;
    scale.set(s, s, s);
    pos.set(p.x, baseY, p.z);
    matrix.compose(pos, quat, scale);
    mesh.setMatrixAt(i, matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}
