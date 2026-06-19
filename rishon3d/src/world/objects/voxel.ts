// rishon3d/src/world/objects/voxel.ts
//
// Shared low-level builders for the reusable object library. Every object is
// assembled from these primitives with a color baked into each part's vertices,
// then merged into ONE BufferGeometry so a whole object is a single draw call and
// is instanceable. Keeping all objects on the same primitives keeps the
// voxel-daytime look consistent and makes objects trivially recolorable per-config.

import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

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
export function mergeTinted(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const merged = mergeGeometries(parts, false);
  for (const p of parts) p.dispose();
  if (!merged) throw new Error("mergeTinted: no geometry to merge");
  return merged;
}

// The shared material every object mesh uses (reads the baked vertex colors).
export function voxelMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0.0 });
}

// Wrap a merged object geometry in a ready-to-add mesh with the shared material.
export function tintedMesh(geo: THREE.BufferGeometry): THREE.Mesh {
  const m = new THREE.Mesh(geo, voxelMaterial());
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

// Evenly spaced angles around a circle (petals, ribs, scallops). Deterministic.
export function ringAngles(count: number, phase = 0): number[] {
  const out: number[] = [];
  for (let i = 0; i < count; i++) out.push(phase + (i / count) * Math.PI * 2);
  return out;
}
