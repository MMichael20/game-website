import * as THREE from "three";
import type { ObjectResult, Vec2, Seat, Box, Rect } from "./types";

export interface Transform { x: number; z: number; rot: number } // rot: degrees in {0,90,180,270}

/** Rotate a point in the xz-plane about the origin by `deg`, matching three.js R_y. */
export function rotateXZ(x: number, z: number, deg: number): Vec2 {
  const t = (deg * Math.PI) / 180;
  const c = Math.cos(t), s = Math.sin(t);
  return { x: x * c + z * s, z: -x * s + z * c };
}

const isSeat = (a: Vec2 | Seat): a is Seat => "faceYaw" in a;
const swap = (deg: number) => deg === 90 || deg === 270;

/** Apply a placement transform to every facet of an object result. */
export function applyTransform(result: ObjectResult, t: Transform): ObjectResult {
  const rad = (t.rot * Math.PI) / 180;

  const group = new THREE.Group();
  group.position.set(t.x, 0, t.z);
  group.rotation.y = rad;
  group.add(result.mesh);

  const colliders: Box[] | undefined = result.colliders?.map((b) => {
    const c = rotateXZ(b.x, b.z, t.rot);
    return {
      x: c.x + t.x, y: b.y, z: c.z + t.z,
      hx: swap(t.rot) ? b.hz : b.hx, hy: b.hy, hz: swap(t.rot) ? b.hx : b.hz,
    };
  });

  const obstacles: Rect[] | undefined = result.obstacles?.map((r) => {
    const c = rotateXZ(r.x, r.z, t.rot);
    return { x: c.x + t.x, z: c.z + t.z, w: swap(t.rot) ? r.d : r.w, d: swap(t.rot) ? r.w : r.d };
  });

  let anchors: Record<string, Vec2 | Seat> | undefined;
  if (result.anchors) {
    anchors = {};
    for (const [name, a] of Object.entries(result.anchors)) {
      const c = rotateXZ(a.x, a.z, t.rot);
      anchors[name] = isSeat(a)
        ? { x: c.x + t.x, z: c.z + t.z, faceYaw: a.faceYaw + rad }
        : { x: c.x + t.x, z: c.z + t.z };
    }
  }

  return { mesh: group, colliders, obstacles, anchors, pois: result.pois };
}
