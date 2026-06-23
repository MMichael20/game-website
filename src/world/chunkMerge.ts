// Static-geometry chunking for the live voxel world.
//
// Every object that uses the SHARED voxel material (see objects/voxel.ts) is a
// vertex-colored opaque mesh with no texture — which means they can all be merged
// into a handful of big geometries without losing anything. This walks the built
// world group and collapses those meshes into ONE mesh per spatial cell:
//
//   - "caster" cells   (meshes with castShadow=true — buildings, hero props):
//                       left always-visible, frustum-culled only.
//   - "detail" cells   (castShadow=false — small props): returned to the caller so
//                       it can distance-cull them (small far props add a draw call
//                       for near-zero on-screen value).
//
// Non-voxel meshes (transparent glass, textured roads, signs) are NOT touched —
// different materials can't merge and need their own draw/sort.
//
// Determinism: pure geometry math, no rng/time. Runs once per map load.

import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { voxelMaterial } from "./objects/voxel";
import { cachedAssetSets } from "./assets";

const CELL = 48; // metres per spatial chunk

export interface DetailChunk { mesh: THREE.Mesh; cx: number; cz: number; r: number }

interface Bucket { geos: THREE.BufferGeometry[]; sx: number; sz: number; n: number }

// Clone a mesh's geometry into world space, normalized so every bucket merges with
// identical attributes: non-indexed, exactly {position, normal, color}. The voxel
// material is untextured, so uv (and anything else) is dropped.
function prepGeometry(m: THREE.Mesh): THREE.BufferGeometry {
  const src = m.geometry;
  const g = src.index ? src.toNonIndexed() : src.clone();
  for (const name of Object.keys(g.attributes)) {
    if (name !== "position" && name !== "normal" && name !== "color") g.deleteAttribute(name);
  }
  if (!g.attributes.normal) g.computeVertexNormals();
  if (!g.attributes.color) {
    const count = g.attributes.position.count;
    g.setAttribute("color", new THREE.BufferAttribute(new Float32Array(count * 3).fill(1), 3));
  }
  g.applyMatrix4(m.matrixWorld); // bake world transform (position + normals)
  return g;
}

/**
 * Merge all shared-voxel-material meshes in `root` into per-cell chunk meshes.
 * Mutates `root`: removes the originals and adds a "merged-chunks" group.
 * Returns the detail chunks (small props) for distance culling by the caller.
 */
export function mergeStaticChunks(root: THREE.Object3D): DetailChunk[] {
  root.updateMatrixWorld(true);
  const voxelMat = voxelMaterial();
  const cached = cachedAssetSets();

  const leaves: THREE.Mesh[] = [];
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh && m.geometry && m.material === voxelMat) leaves.push(m);
  });
  if (leaves.length === 0) return [];

  const casterCells = new Map<string, Bucket>();
  const detailCells = new Map<string, Bucket>();
  const wp = new THREE.Vector3();
  const inv = 1 / CELL;

  for (const m of leaves) {
    m.getWorldPosition(wp);
    const key = `${Math.floor(wp.x * inv)},${Math.floor(wp.z * inv)}`;
    const cells = m.castShadow ? casterCells : detailCells;
    let b = cells.get(key);
    if (!b) { b = { geos: [], sx: 0, sz: 0, n: 0 }; cells.set(key, b); }
    b.geos.push(prepGeometry(m));
    b.sx += wp.x; b.sz += wp.z; b.n++;
    m.removeFromParent();
    if (!cached.geometries.has(m.geometry)) m.geometry.dispose();
  }

  const chunkGroup = new THREE.Group();
  chunkGroup.name = "merged-chunks";
  root.add(chunkGroup);

  const makeChunk = (b: Bucket, caster: boolean): THREE.Mesh | null => {
    const merged = mergeGeometries(b.geos, false);
    for (const g of b.geos) g.dispose();
    if (!merged) { console.warn("[chunkMerge] bucket merge failed — skipped"); return null; }
    const mesh = new THREE.Mesh(merged, voxelMat);
    mesh.castShadow = caster;
    mesh.receiveShadow = true;
    chunkGroup.add(mesh);
    return mesh;
  };

  for (const b of casterCells.values()) makeChunk(b, true);

  const detailChunks: DetailChunk[] = [];
  for (const b of detailCells.values()) {
    const mesh = makeChunk(b, false);
    if (!mesh) continue;
    mesh.geometry.computeBoundingSphere();
    const r = mesh.geometry.boundingSphere?.radius ?? CELL;
    detailChunks.push({ mesh, cx: b.sx / b.n, cz: b.sz / b.n, r });
  }
  return detailChunks;
}
