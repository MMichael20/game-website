import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { RishonMap } from "./rishonMap";
import { type Placement, makeInstanced } from "./InstancedProps";
import { ROAD_W } from "./roads";
import { buildingRects, pointInRects } from "../game/wander";
import { mulberry32 } from "./rng";
import { getGeometry, getMaterial } from "./assets";

const OFFSET = ROAD_W / 2 + 1.2; // park just off the driving lane
const SPACING = 14;

// Deterministic positions for decorative cars parked along the roadsides,
// skipping spots inside buildings or out of bounds.
export function planParkedCars(map: RishonMap, seed: number, max: number): Placement[] {
  const rng = mulberry32(seed);
  const rects = buildingRects(map.buildings, 0.5);
  const half = map.ground.size / 2 - 2;
  const out: Placement[] = [];
  for (const r of map.roads) {
    if (out.length >= max) break;
    const n = Math.floor(r.length / SPACING);
    for (let i = 1; i < n && out.length < max; i++) {
      const t = -r.length / 2 + i * SPACING;
      const side = rng() < 0.5 ? 1 : -1;
      const place = rng() < 0.5; // sparse: ~half the slots
      if (!place) continue;
      const x = r.horizontal ? r.x + t : r.x + side * OFFSET;
      const z = r.horizontal ? r.z + side * OFFSET : r.z + t;
      if (Math.abs(x) > half || Math.abs(z) > half) continue;
      if (pointInRects({ x, z }, rects)) continue;
      out.push({ x, z, rotationY: r.horizontal ? Math.PI / 2 : 0, scale: 1 });
    }
  }
  return out;
}

function parkedCarGeo(): THREE.BufferGeometry {
  return getGeometry("parkedCar", () => {
    const body = new THREE.BoxGeometry(1.8, 0.5, 3.6); body.translate(0, 0.5, 0);
    const glass = new THREE.BoxGeometry(1.5, 0.46, 1.9); glass.translate(0, 0.98, -0.2);
    const roof = new THREE.BoxGeometry(1.6, 0.16, 1.7); roof.translate(0, 1.29, -0.2);
    return mergeGeometries([body, glass, roof]);
  });
}
const parkedCarMat = () => getMaterial("parkedCarMat", () => new THREE.MeshStandardMaterial({ color: 0x8b94a3, metalness: 0, roughness: 0.85 }));

export function parkedCarInstances(placements: Placement[]): THREE.Object3D {
  return makeInstanced(parkedCarGeo(), parkedCarMat(), placements, 0);
}
