import * as THREE from "three";
import type { Placement, Box, Rect, Vec2, Seat } from "./types";
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

/** Walk the manifest: build each object, transform it, aggregate every facet. */
export function buildWorld(manifest: Placement[]): BuiltWorld {
  const group = new THREE.Group();
  group.name = "world";
  const colliders: Box[] = [];
  const obstacles: Rect[] = [];
  const anchors: Record<string, Vec2 | Seat> = {};
  const pois: ResolvedPoi[] = [];

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
  });

  return { group, colliders, obstacles, anchors, pois };
}
