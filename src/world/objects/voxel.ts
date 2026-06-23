// rishon3d/src/world/objects/voxel.ts
//
// Shared low-level builders for the reusable object library. Every object is
// assembled from these primitives with a color baked into each part's vertices,
// then merged into ONE BufferGeometry so a whole object is a single draw call and
// is instanceable. Keeping all objects on the same primitives keeps the
// voxel-daytime look consistent and makes objects trivially recolorable per-config.

import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { getMaterial } from "../assets";

// Minimum safe gap for a decal / accent slab sitting proud of its parent face.
// 0.01 m was too close → z-fighting. 0.04 m keeps surfaces visually flush yet
// gives the depth buffer enough separation to stay clean.
export const DECAL_GAP = 0.04;

// Bake a single color into every vertex of a geometry (so many colors survive a
// merge into one vertex-colored mesh). Returns the same geometry for chaining.
export function tintGeo(geo: THREE.BufferGeometry, hex: number): THREE.BufferGeometry {
  const c = new THREE.Color(hex);
  const n = geo.attributes.position.count;
  const colors = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b; }
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  return geo;
}

// A vertex-colored box centered at (x,y,z).
export function tintedBox(
  w: number, h: number, d: number, x: number, y: number, z: number, hex: number,
): THREE.BufferGeometry {
  const b = new THREE.BoxGeometry(w, h, d);
  b.translate(x, y, z);
  return tintGeo(b, hex);
}

// A chunky low-poly ball (icosahedron) for organic blobs: ice-cream scoops,
// cherries, flower centers, berries. detail 0 = 20 faces (very faceted), 1 = 80.
export function lowPolyBall(
  r: number, x: number, y: number, z: number, hex: number, detail = 0,
): THREE.BufferGeometry {
  const g = new THREE.IcosahedronGeometry(r, detail);
  g.translate(x, y, z);
  return tintGeo(g, hex);
}

// A low-poly cone / frustum standing on +y: cone tips, ice-cream cones, umbrella
// canopies, hats. rTop = 0 -> a point. seg controls how faceted it reads.
export function cone(
  rBottom: number, rTop: number, h: number, x: number, y: number, z: number, hex: number, seg = 8,
): THREE.BufferGeometry {
  const g = new THREE.CylinderGeometry(rTop, rBottom, h, seg);
  g.translate(x, y, z);
  return tintGeo(g, hex);
}

// A vertical cylinder: posts, cups, cake tiers, drink cups.
export function cylinderY(
  r: number, h: number, x: number, y: number, z: number, hex: number, seg = 12,
): THREE.BufferGeometry {
  const g = new THREE.CylinderGeometry(r, r, h, seg);
  g.translate(x, y, z);
  return tintGeo(g, hex);
}

// A flat disc (plates, lids, glaze rings, table tops): a very short cylinder.
export function disc(
  r: number, h: number, x: number, y: number, z: number, hex: number, seg = 16,
): THREE.BufferGeometry {
  return cylinderY(r, h, x, y, z, hex, seg);
}

// Merge an array of pre-tinted geometries into one. Disposes the parts.
// Primitives differ in indexing (BoxGeometry is indexed, IcosahedronGeometry is
// not), and mergeGeometries() refuses to mix the two — so normalize every part
// to non-indexed first. Vertex color/position/normal attributes survive.
export function mergeTinted(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const flat = parts.map((p) => {
    const f = p.index ? p.toNonIndexed() : p;
    if (f !== p) p.dispose();
    return f;
  });
  const merged = mergeGeometries(flat, false);
  for (const f of flat) f.dispose();
  if (!merged) throw new Error("mergeTinted: no geometry to merge");
  return merged;
}

// The shared material every object mesh uses (reads the baked vertex colors).
// ONE cached instance for the whole world: color lives in the vertices, so every
// voxel object can render with the same material — hundreds of identical
// allocations collapse to one. Routed through the assets cache so World.unload()
// (which disposes only non-cached resources) never frees it out from under the
// next map. Nothing mutates this material per-mesh, so sharing is safe.
export function voxelMaterial(): THREE.MeshStandardMaterial {
  return getMaterial(
    "voxel",
    () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0.0 }),
  ) as THREE.MeshStandardMaterial;
}

// Props whose largest dimension is under this add a shadow-map draw for near-zero
// visible shadow, so tintedMesh leaves them out of the shadow pass by default.
// Hero props (trees, lamps, benches…) re-assert mesh.castShadow = true themselves.
const SHADOW_MIN_SIZE = 1.0;

// Wrap a merged object geometry in a ready-to-add mesh with the shared material.
// castShadow is derived from the merged geometry's footprint (PITFALL 3 spirit):
// sub-1m props stay out of the shadow pass; callers that want a small prop to cast
// can still set mesh.castShadow = true afterwards.
export function tintedMesh(geo: THREE.BufferGeometry): THREE.Mesh {
  const m = new THREE.Mesh(geo, voxelMaterial());
  geo.computeBoundingBox();
  const bb = geo.boundingBox;
  m.castShadow = !!bb &&
    Math.max(bb.max.x - bb.min.x, bb.max.y - bb.min.y, bb.max.z - bb.min.z) >= SHADOW_MIN_SIZE;
  m.receiveShadow = true;
  return m;
}

// Evenly spaced angles around a circle (petals, ribs, scallops). Deterministic.
export function ringAngles(count: number, phase = 0): number[] {
  const out: number[] = [];
  for (let i = 0; i < count; i++) out.push(phase + (i / count) * Math.PI * 2);
  return out;
}
