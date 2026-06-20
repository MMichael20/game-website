import * as THREE from "three";
import type { Placement, Box, Rect, Vec2, Seat, ObjectResult } from "./types";
import { buildObject } from "./registry";
import { applyTransform } from "./transform";

export interface ResolvedPoi { kind: string; label: string; radius: number; x: number; z: number }
export interface BuiltWorld {
  group: THREE.Group;
  colliders: Box[];
  obstacles: Rect[];
  anchors: Record<string, Vec2 | Seat>;
  pois: ResolvedPoi[];
}

// One placement's axis-aligned footprint in the xz-plane, from its colliders +
// obstacles. Ground-level slabs (center y <= 0, e.g. the ground plane) are skipped
// so they don't "overlap" everything.
interface Footprint { label: string; minX: number; maxX: number; minZ: number; maxZ: number }
function footprintOf(placed: ObjectResult, label: string): Footprint | null {
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity, any = false;
  const add = (x: number, z: number, hx: number, hz: number) => {
    any = true;
    minX = Math.min(minX, x - hx); maxX = Math.max(maxX, x + hx);
    minZ = Math.min(minZ, z - hz); maxZ = Math.max(maxZ, z + hz);
  };
  for (const c of placed.colliders ?? []) { if (c.y <= 0) continue; add(c.x, c.z, c.hx, c.hz); }
  for (const r of placed.obstacles ?? []) add(r.x, r.z, r.w / 2, r.d / 2);
  return any ? { label, minX, maxX, minZ, maxZ } : null;
}
function fpOverlap(a: Footprint, b: Footprint): boolean {
  const e = 1e-3; // ignore exact edge-touching
  return a.minX < b.maxX - e && a.maxX > b.minX + e && a.minZ < b.maxZ - e && a.maxZ > b.minZ + e;
}

/** Walk the manifest: build each object, transform it, aggregate every facet. */
export function buildWorld(manifest: Placement[]): BuiltWorld {
  const group = new THREE.Group();
  group.name = "world";
  const colliders: Box[] = [];
  const obstacles: Rect[] = [];
  const anchors: Record<string, Vec2 | Seat> = {};
  const pois: ResolvedPoi[] = [];
  const footprints: Footprint[] = [];

  manifest.forEach((p, i) => {
    const built = buildObject(p.kind, p.params);
    const placed = applyTransform(built, { x: p.x ?? 0, z: p.z ?? 0, rot: p.rot ?? 0 });
    group.add(placed.mesh);
    if (placed.colliders) colliders.push(...placed.colliders);
    if (placed.obstacles) obstacles.push(...placed.obstacles);
    if (placed.anchors) {
      for (const [name, a] of Object.entries(placed.anchors)) anchors[`${p.kind}.${i}.${name}`] = a;
    }
    if (built.pois && placed.anchors) {
      for (const poi of built.pois) {
        const a = placed.anchors[poi.anchor];
        if (a) pois.push({ kind: poi.kind, label: poi.label, radius: poi.radius, x: a.x, z: a.z });
      }
    }
    const fp = footprintOf(placed, `${p.kind}#${i}`);
    if (fp) footprints.push(fp);
  });

  // Authoring guard (CLAUDE.md pitfall #3): two PLACEMENTS whose footprints overlap
  // is almost always a manifest mistake (a prop buried in a building, etc.). Warn
  // loudly in the console so it is caught the moment it is placed — no test needed.
  for (let i = 0; i < footprints.length; i++) {
    for (let j = i + 1; j < footprints.length; j++) {
      if (fpOverlap(footprints[i], footprints[j])) {
        console.warn(
          `[world] footprint overlap: ${footprints[i].label} <-> ${footprints[j].label}` +
          ` — check their placement in map.ts`,
        );
      }
    }
  }

  return { group, colliders, obstacles, anchors, pois };
}
