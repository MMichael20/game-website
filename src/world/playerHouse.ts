// rishon3d/src/world/playerHouse.ts
//
// The Player House — V1 location #1, the spawn / home base. A small residential
// lot on the SOUTH side of the street (across the central crosswalk from the
// restaurant strip), matching the concept art: a cream bungalow with a brown
// flat roof, two big blue windows with light frames flanking a door, window
// planter boxes with flowers, a porch step + front path, a mailbox, a low wood
// fence, a grass yard and a driveway slab (the drivable car parks here).
//
// Self-contained + deterministic (fixed layout, no rng). All geometry is in world
// space (anchored to HOUSE / MAILBOX / DRIVEWAY from districtPois) and merged into
// a couple of vertex-colored meshes, so the World can add it directly and the whole
// home stays at a handful of draw calls. The solid collider for the body comes from
// restaurantColliders.ts (this file is geometry only).

import * as THREE from "three";
import { tintedBox, mergeTinted, voxelMaterial } from "./objects/voxel";
import { makeFlower } from "./objects/flower";
import { PALETTE } from "./palette";
import { makeSidewalkTexture, PAVER_SUPER_M } from "./roads";
import { HOUSE, HOUSE_FRONT, MAILBOX, DRIVEWAY } from "./districtPois";

const C = {
  body: PALETTE.houseBody,     // cream / warm yellow walls
  roof: 0x5a3d24,              // dark-brown flat-roof cap + trim
  window: 0x4f8fc0,            // bright blue glass
  frame: PALETTE.frame,        // light grey sills / window frames
  door: PALETTE.facadeDoor,    // dark-brown door
  knob: PALETTE.signLit,       // little brass knob
  wood: PALETTE.benchWood,     // planter boxes + fence
  soil: 0x3a2a1c,
  hedge: PALETTE.hedge,
  step: PALETTE.entryPad,      // concrete porch step
  mailbox: 0xdfe6ec,
  flag: PALETTE.flowerRed,
  yard: PALETTE.parkGrass,
  drive: 0xb4afa4,             // concrete driveway slab
} as const;

// A window: light frame panel + blue glass + a sill, plus a planter box with
// flowers below it. Centered on (cx, y) on the front (-z) face at plane fz.
function windowWithBox(parts: THREE.BufferGeometry[], cx: number, y: number, fz: number): void {
  parts.push(tintedBox(2.4, 2.0, 0.12, cx, y, fz + 0.04, C.frame));   // frame panel (recessed)
  parts.push(tintedBox(2.0, 1.6, 0.1, cx, y, fz - 0.02, C.window));   // blue glass (proud)
  parts.push(tintedBox(2.6, 0.18, 0.4, cx, y - 1.15, fz - 0.12, C.frame)); // sill
  // planter box hung under the sill
  const py = y - 1.55;
  parts.push(tintedBox(2.2, 0.5, 0.5, cx, py, fz - 0.28, C.wood));
  parts.push(tintedBox(1.9, 0.18, 0.34, cx, py + 0.2, fz - 0.28, C.soil));
  const blooms: [number, number][] = [[-0.7, PALETTE.flowerRed], [0, PALETTE.flowerWhite], [0.7, PALETTE.flowerYellow]];
  for (const [dx, hex] of blooms) {
    const f = makeFlower({ petalColor: hex, height: 0.34, petalCount: 5 });
    f.translate(cx + dx, py + 0.28, fz - 0.28);
    parts.push(f);
  }
}

export function makePlayerHouse(): THREE.Object3D {
  const group = new THREE.Group();
  group.name = "playerHouse";

  const { x: hx, z: hz, w, d, h } = HOUSE;
  const front = HOUSE_FRONT;     // north (street-facing) wall plane, low z
  const fz = front - 0.07;       // plane just proud of the front wall for features

  // --- grass yard pad under the lot (separate solid mesh) ---
  const yard = new THREE.Mesh(
    new THREE.BoxGeometry(22, 0.12, 15),
    new THREE.MeshStandardMaterial({ color: C.yard }),
  );
  yard.position.set(hx + 4, 0.05, hz + 0.5);
  yard.receiveShadow = true;
  group.add(yard);

  // --- paver front path + porch step + driveway (one textured-ish slab group) ---
  const paver = makeSidewalkTexture();
  paver.repeat.set(1, Math.max(1, Math.round(6 / PAVER_SUPER_M)));
  const path = new THREE.Mesh(
    new THREE.BoxGeometry(2.4, 0.13, 6.5),
    new THREE.MeshStandardMaterial({ map: paver }),
  );
  path.position.set(hx, 0.07, front - 3.0);   // runs from the door north toward the street walk
  path.receiveShadow = true;
  group.add(path);

  const drivePaver = makeSidewalkTexture();
  drivePaver.repeat.set(2, 3);
  const driveway = new THREE.Mesh(
    new THREE.BoxGeometry(5.2, 0.13, 7.5),
    new THREE.MeshStandardMaterial({ color: C.drive }),
  );
  driveway.position.set(DRIVEWAY.x, 0.07, DRIVEWAY.z - 1.0);
  driveway.receiveShadow = true;
  group.add(driveway);

  // --- everything else merges into ONE vertex-colored mesh ---
  const parts: THREE.BufferGeometry[] = [];

  // body + flat roof cap (slight overhang) + a low parapet lip on the front edge
  parts.push(tintedBox(w, h, d, hx, h / 2, hz, C.body));
  parts.push(tintedBox(w + 0.8, 0.5, d + 0.8, hx, h + 0.25, hz, C.roof));
  parts.push(tintedBox(w + 0.8, 0.28, 0.34, hx, h + 0.62, front - 0.3, C.roof));
  // a small chimney for silhouette
  parts.push(tintedBox(0.8, 1.2, 0.8, hx + w / 2 - 1.6, h + 1.0, hz - 1.2, C.roof));

  // door + frame + knob (centered on the front)
  parts.push(tintedBox(1.7, 3.1, 0.12, hx, 1.55, fz + 0.05, C.frame)); // frame surround (recessed)
  parts.push(tintedBox(1.3, 2.8, 0.14, hx, 1.4, fz - 0.04, C.door));   // door slab (proud)
  parts.push(tintedBox(0.16, 0.16, 0.16, hx + 0.45, 1.4, fz - 0.12, C.knob));
  // concrete porch step at the door base
  parts.push(tintedBox(2.6, 0.3, 1.3, hx, 0.15, front - 0.65, C.step));

  // two big windows flanking the door
  windowWithBox(parts, hx - 3.4, 2.7, fz);
  windowWithBox(parts, hx + 3.4, 2.7, fz);

  // a low wood picket fence along the west + front-west edge of the yard
  const fenceY = 0.55;
  const railW = 0.12;
  // west run (along z), in front of the house's west side
  for (let z = front - 5; z <= hz + 5; z += 1.1) {
    parts.push(tintedBox(railW, 1.1, railW, hx - w / 2 - 3.5, fenceY, z, C.wood)); // posts
  }
  parts.push(tintedBox(railW, 0.16, 11, hx - w / 2 - 3.5, fenceY + 0.2, front + 1.0, C.wood)); // top rail
  parts.push(tintedBox(railW, 0.16, 11, hx - w / 2 - 3.5, fenceY - 0.2, front + 1.0, C.wood)); // low rail

  // a couple of clipped hedges hugging the front corners
  parts.push(tintedBox(2.2, 0.9, 1.0, hx - w / 2 + 0.4, 0.5, front - 0.8, C.hedge));
  parts.push(tintedBox(1.6, 0.8, 1.0, hx + w / 2 - 0.6, 0.45, front - 0.8, C.hedge));

  // mailbox at the path: post + box + raised red flag
  parts.push(tintedBox(0.16, 1.1, 0.16, MAILBOX.x, 0.55, MAILBOX.z, C.wood));
  parts.push(tintedBox(0.5, 0.42, 0.8, MAILBOX.x, 1.25, MAILBOX.z, C.mailbox));
  parts.push(tintedBox(0.1, 0.34, 0.06, MAILBOX.x + 0.3, 1.45, MAILBOX.z, C.flag));

  const mesh = new THREE.Mesh(mergeTinted(parts), voxelMaterial());
  mesh.name = "playerHouseShell";
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);

  return group;
}
