// rishon3d/src/world/residential.ts
//
// Ground dressing for the SOUTH (player) side of the block so it reads as a
// finished neighborhood instead of empty grass: a frontage sidewalk linking the
// house -> park -> crosswalk, a crosswalk approach path, chunky border planters,
// low hedges (lot dividers + south boundary), scattered trees/bushes, and a small
// green corner east of the phone shop. Deterministic, merged, anchored to the
// shared districtPois coordinates.

import * as THREE from "three";
import { tintedBox, mergeTinted, voxelMaterial } from "./objects/voxel";
import { makeFlower } from "./objects/flower";
import { PALETTE } from "./palette";
import { makeSidewalkTexture, PAVER_SUPER_M } from "./roads";
import { treeInstances, bushInstances, benchInstances } from "./props";
import type { PropDef } from "./rishonMap";
import { CROSSWALK, PARK_CENTER } from "./districtPois";
import { rectAround, type Rect } from "../game/wander";

// Footprints of the residential dressing NPCs must not walk through (border
// planters, hedges, trees, the corner bench). Kept beside the placements below.
// -> world/obstacles.ts
export function residentialPropObstacles(): Rect[] {
  const out: Rect[] = [];
  for (const x of [64, 70, 100, 106]) out.push(rectAround(x, 119.2, 2.4, 1.0, 0.2)); // border planters
  out.push(rectAround(84, 130, 44, 0.9, 0.2));   // south boundary hedge run
  out.push(rectAround(88.5, 120, 3, 0.9, 0.2));  // lot-divider hedge
  for (const [tx, tz] of [[63, 124], [104, 126], [112, 120], [118, 98]] as [number, number][]) {
    out.push(rectAround(tx, tz, 1.6, 1.6, 0.2)); // trees
  }
  out.push(rectAround(116, 100, 1.6, 0.6, 0.2)); // east-corner bench
  return out;
}

function paverSlab(w: number, d: number, x: number, z: number): THREE.Mesh {
  const tex = makeSidewalkTexture();
  tex.repeat.set(Math.max(1, Math.round(w / PAVER_SUPER_M)), Math.max(1, Math.round(d / PAVER_SUPER_M)));
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(w, 0.12, d),
    new THREE.MeshStandardMaterial({ map: tex }),
  );
  m.position.set(x, 0.07, z);
  m.receiveShadow = true;
  return m;
}

// A chunky low hedge run (wood trough + dense green leaf cubes) along x.
function hedgeRow(parts: THREE.BufferGeometry[], x0: number, x1: number, z: number): void {
  const len = x1 - x0;
  parts.push(tintedBox(len, 0.5, 0.9, (x0 + x1) / 2, 0.25, z, PALETTE.benchWood)); // trough
  for (let x = x0 + 0.5; x <= x1 - 0.5; x += 0.9) {
    parts.push(tintedBox(0.85, 0.7, 0.8, x, 0.7, z, ((x * 7) | 0) % 2 ? PALETTE.hedge : PALETTE.leafDeep));
  }
}

// A chunky wooden flower planter (trough + soil + dense leaves + blooms).
function borderPlanter(parts: THREE.BufferGeometry[], x: number, z: number): void {
  parts.push(tintedBox(2.4, 0.7, 1.0, x, 0.35, z, PALETTE.benchWood));
  parts.push(tintedBox(2.45, 0.14, 1.05, x, 0.7, z, 0x6b4a2a));
  parts.push(tintedBox(2.1, 0.2, 0.78, x, 0.66, z, 0x3a2a1c));
  for (const dx of [-0.8, -0.3, 0.2, 0.7]) {
    parts.push(tintedBox(0.5, 0.42, 0.5, x + dx, 0.92, z, PALETTE.hedge));
  }
  const blooms: [number, number][] = [[-0.7, PALETTE.flowerRed], [-0.2, PALETTE.flowerWhite], [0.3, PALETTE.flowerYellow], [0.75, PALETTE.flowerRed]];
  for (const [dx, hex] of blooms) {
    const f = makeFlower({ petalColor: hex, height: 0.36, petalCount: 5 });
    f.translate(x + dx, 0.86, z);
    parts.push(f);
  }
}

export function makeResidentialGrounds(): THREE.Object3D {
  const g = new THREE.Group();
  g.name = "residentialGrounds";

  // --- paved frontage: a sidewalk running E-W in front of the house + park,
  // plus a short approach connecting it up to the crosswalk. ---
  g.add(paverSlab(50, 2.8, 84, 117.6));                 // neighborhood frontage walk
  g.add(paverSlab(3.0, 6.0, CROSSWALK.x, 114.0));       // crosswalk approach
  g.add(paverSlab(2.6, 4.0, PARK_CENTER.x, 117.0));     // park entrance link

  // --- merged greenery + planters + hedges ---
  const parts: THREE.BufferGeometry[] = [];
  // south boundary hedge behind the lots
  hedgeRow(parts, 62, 106, 130);
  // lot divider hedge between the house lot (west) and the park (east)
  hedgeRow(parts, 87, 90, 120); // short divider (built along x; thin run)
  // border planters along the frontage walk
  for (const x of [64, 70, 100, 106]) borderPlanter(parts, x, 119.2);
  const mesh = new THREE.Mesh(mergeTinted(parts), voxelMaterial());
  mesh.castShadow = true; mesh.receiveShadow = true;
  mesh.name = "residentialDressing";
  g.add(mesh);

  // --- trees + bushes filling the grass (reuse the city prop instancers) ---
  const trees: PropDef[] = [
    { id: "rg-t1", kind: "tree", x: 63, z: 124 },
    { id: "rg-t2", kind: "tree", x: 104, z: 126 },
    { id: "rg-t3", kind: "tree", x: 112, z: 120 },
    { id: "rg-t4", kind: "tree", x: 118, z: 98 },   // green corner east of the phone shop
  ];
  g.add(treeInstances(trees));
  const bushes: PropDef[] = [
    { id: "rg-b1", kind: "bush", x: 67, z: 121 }, { id: "rg-b2", kind: "bush", x: 80, z: 130 },
    { id: "rg-b3", kind: "bush", x: 99, z: 125 }, { id: "rg-b4", kind: "bush", x: 116, z: 95 },
    { id: "rg-b5", kind: "bush", x: 120, z: 104 },
  ];
  g.add(bushInstances(bushes));
  // a bench in the green corner east of the phone shop
  g.add(benchInstances([{ id: "rg-bn", kind: "bench", x: 116, z: 100 }]));

  return g;
}
