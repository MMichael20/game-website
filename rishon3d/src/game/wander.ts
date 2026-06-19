import type { Vec2, BuildingDef } from "../world/rishonMap";

export interface Rect { minX: number; maxX: number; minZ: number; maxZ: number }

// A centered footprint rect with an optional keep-clear margin. Shared by every
// obstacle/prop builder so NPC collision footprints are defined the same way.
export function rectAround(cx: number, cz: number, w: number, d: number, margin = 0): Rect {
  return {
    minX: cx - w / 2 - margin, maxX: cx + w / 2 + margin,
    minZ: cz - d / 2 - margin, maxZ: cz + d / 2 + margin,
  };
}

export function moveToward(pos: Vec2, target: Vec2, maxStep: number): Vec2 {
  const dx = target.x - pos.x;
  const dz = target.z - pos.z;
  const dist = Math.hypot(dx, dz);
  if (dist <= maxStep || dist === 0) return { x: target.x, z: target.z };
  const k = maxStep / dist;
  return { x: pos.x + dx * k, z: pos.z + dz * k };
}

export function reachedTarget(pos: Vec2, target: Vec2, threshold: number): boolean {
  return Math.hypot(target.x - pos.x, target.z - pos.z) <= threshold;
}

export function clampToBounds(pos: Vec2, half: number): Vec2 {
  return {
    x: Math.max(-half, Math.min(half, pos.x)),
    z: Math.max(-half, Math.min(half, pos.z)),
  };
}

export function pickTarget(origin: Vec2, radius: number, rngAngle01: number, rngDist01: number): Vec2 {
  const angle = rngAngle01 * Math.PI * 2;
  const dist = Math.sqrt(rngDist01) * radius;
  return { x: origin.x + Math.cos(angle) * dist, z: origin.z + Math.sin(angle) * dist };
}

export function buildingRects(buildings: BuildingDef[], margin: number): Rect[] {
  return buildings.map((b) => ({
    minX: b.x - b.width / 2 - margin,
    maxX: b.x + b.width / 2 + margin,
    minZ: b.z - b.depth / 2 - margin,
    maxZ: b.z + b.depth / 2 + margin,
  }));
}

export function pointInRects(p: Vec2, rects: Rect[]): boolean {
  return rects.some((r) => p.x >= r.minX && p.x <= r.maxX && p.z >= r.minZ && p.z <= r.maxZ);
}
