import * as THREE from "three";
import type { RoadDef } from "./rishonMap";
import { getGeometry, getMaterial } from "./assets";
import { makeInstanced, type Placement } from "./InstancedProps";

export const ROAD_W = 6;
const SIDEWALK_W = 1.6;
const DASH_LEN = 2;
const DASH_GAP = 2;

export interface Rect { x: number; z: number; w: number; d: number }

// Dashed center line. Dashes run along the road's long axis, centered on it.
export function laneDashes(road: RoadDef): Placement[] {
  const period = DASH_LEN + DASH_GAP;
  const count = Math.max(0, Math.floor(road.length / period));
  const span = count * period;
  const start = -span / 2 + period / 2;
  const out: Placement[] = [];
  for (let i = 0; i < count; i++) {
    const t = start + i * period;
    if (road.horizontal) {
      out.push({ x: road.x + t, z: road.z, rotationY: Math.PI / 2 });
    } else {
      out.push({ x: road.x, z: road.z + t, rotationY: 0 });
    }
  }
  return out;
}

// Two concrete strips flanking the asphalt.
export function sidewalkRects(road: RoadDef): Rect[] {
  const off = ROAD_W / 2 + SIDEWALK_W / 2;
  if (road.horizontal) {
    return [
      { x: road.x, z: road.z - off, w: road.length, d: SIDEWALK_W },
      { x: road.x, z: road.z + off, w: road.length, d: SIDEWALK_W },
    ];
  }
  return [
    { x: road.x - off, z: road.z, w: SIDEWALK_W, d: road.length },
    { x: road.x + off, z: road.z, w: SIDEWALK_W, d: road.length },
  ];
}

export function makeRoadNetwork(roads: RoadDef[]): THREE.Group {
  const group = new THREE.Group();
  const asphalt = getMaterial("asphalt", () => new THREE.MeshStandardMaterial({ color: 0x33333a }));
  const concrete = getMaterial("concrete", () => new THREE.MeshStandardMaterial({ color: 0x8c8a86 }));

  for (const r of roads) {
    const w = r.horizontal ? r.length : ROAD_W;
    const d = r.horizontal ? ROAD_W : r.length;
    const surf = new THREE.Mesh(getGeometry(`road-${w}x${d}`, () => new THREE.PlaneGeometry(w, d)), asphalt);
    surf.rotation.x = -Math.PI / 2;
    surf.position.set(r.x, 0.02, r.z);
    surf.receiveShadow = true;
    group.add(surf);

    for (const s of sidewalkRects(r)) {
      const sw = new THREE.Mesh(getGeometry(`sidewalk-${s.w}x${s.d}`, () => new THREE.PlaneGeometry(s.w, s.d)), concrete);
      sw.rotation.x = -Math.PI / 2;
      sw.position.set(s.x, 0.015, s.z); // just below the asphalt to avoid z-fight at edges
      sw.receiveShadow = true;
      group.add(sw);
    }
  }

  // All center-line dashes in a single instanced draw.
  const dashes = roads.flatMap(laneDashes);
  if (dashes.length) {
    const dashGeo = getGeometry("laneDash", () => {
      const g = new THREE.PlaneGeometry(0.18, DASH_LEN);
      g.rotateX(-Math.PI / 2); // lie flat; long axis along +z
      return g;
    });
    const dashMat = getMaterial("laneDashMat", () => new THREE.MeshStandardMaterial({ color: 0xf2e9c0 }));
    const mesh = makeInstanced(dashGeo, dashMat, dashes, 0.03); // above asphalt
    mesh.castShadow = false;
    group.add(mesh);
  }
  return group;
}
