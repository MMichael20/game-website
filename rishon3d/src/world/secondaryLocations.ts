// rishon3d/src/world/secondaryLocations.ts
//
// The three secondary destinations that round out the restaurant block into a
// small playable slice: a walk-in phone / convenience shop, a pocket park, and
// a taxi pickup. Each is self-contained, deterministic and anchored to the
// shared district coordinates in districtPois.ts. Geometry merges into a few
// vertex-colored meshes; greenery/bench/bin reuse the city prop instancers so
// the park matches the rest of the world.

import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { PALETTE } from "./palette";
import { makeSidewalkTexture, PAVER_SUPER_M } from "./roads";
import { makeCarBody } from "../entities/carMesh";
import { treeInstances, benchInstances, trashcanInstances, makeStreetLight } from "./props";
import {
  PHONE_SHOP, PHONE_SHOP_DOOR, shopFront, SHOP_Z,
  PARK_CENTER, TAXI_CAR, TAXI_WAIT,
} from "./districtPois";
import type { PropDef } from "./rishonMap";

function tinted(w: number, h: number, d: number, x: number, y: number, z: number, hex: number): THREE.BufferGeometry {
  const b = new THREE.BoxGeometry(w, h, d);
  b.translate(x, y, z);
  const c = new THREE.Color(hex);
  const n = b.attributes.position.count;
  const colors = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b; }
  b.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  return b;
}
const vcMat = () => new THREE.MeshStandardMaterial({ vertexColors: true });

// =============================================================================
// PHONE / CONVENIENCE SHOP — a small walk-in storefront with a sign, glass
// front + doorway, a service counter, a register, and wall display shelves
// stocked with colorful phone/accessory boxes.
// =============================================================================
export function makePhoneShop(): THREE.Object3D {
  const group = new THREE.Group();
  group.name = "phoneShop";

  const S = PHONE_SHOP;
  const FRONT = shopFront(S.d);
  const BACK = SHOP_Z - S.d / 2;
  const LX = S.x - S.w / 2, RX = S.x + S.w / 2;
  const H = S.h, T = 0.3;
  const C = {
    wall: 0xdfe6ec, trim: 0x2f7fb0, floor: 0xc6cdd3, ceiling: 0xd6dde2,
    counter: 0x2f7fb0, counterTop: 0xdfe6ec, register: 0x2a2a30, shelf: 0xb9c2c9,
  };
  const shell: THREE.BufferGeometry[] = [];
  shell.push(tinted(S.w - 0.2, 0.12, S.d - 0.2, S.x, 0.07, SHOP_Z, C.floor));
  shell.push(tinted(S.w, T, S.d, S.x, H - T / 2, SHOP_Z, C.ceiling));
  shell.push(tinted(S.w, H, T, S.x, H / 2, BACK + T / 2, C.wall));
  shell.push(tinted(T, H, S.d, LX + T / 2, H / 2, SHOP_Z, C.wall));
  shell.push(tinted(T, H, S.d, RX - T / 2, H / 2, SHOP_Z, C.wall));
  shell.push(tinted(1.0, H, T, LX + 0.5, H / 2, FRONT - T / 2, C.wall));   // front corners
  shell.push(tinted(1.0, H, T, RX - 0.5, H / 2, FRONT - T / 2, C.wall));
  shell.push(tinted(S.w - 2.0, H - 3.0, T, S.x, 3.0 + (H - 3.0) / 2, FRONT - T / 2, C.wall)); // header
  const shellMesh = new THREE.Mesh(mergeGeometries(shell), vcMat());
  shellMesh.name = "phoneShopBuilding";
  shellMesh.castShadow = true; shellMesh.receiveShadow = true;
  group.add(shellMesh);

  // parapet rim cap
  const rim = new THREE.Mesh(tinted(S.w, 0.5, S.d, S.x, H + 0.25, SHOP_Z, PALETTE.cornice), vcMat());
  rim.castShadow = true; group.add(rim);

  // furniture: service counter + display shelves
  const furn: THREE.BufferGeometry[] = [];
  const counterZ = SHOP_Z - 1.4;
  furn.push(tinted(5.0, 1.05, 0.7, S.x - 1.0, 0.525, counterZ, C.counter));
  furn.push(tinted(5.3, 0.12, 0.85, S.x - 1.0, 1.1, counterZ, C.counterTop));
  for (const sy of [1.5, 2.4, 3.3]) {                     // back wall display shelves
    furn.push(tinted(S.w - 1.0, 0.12, 0.5, S.x, sy, BACK + 0.4, C.shelf));
  }
  for (const sy of [1.5, 2.4]) {                          // left wall display shelves
    furn.push(tinted(0.5, 0.12, S.d - 1.6, LX + 0.45, sy, SHOP_Z, C.shelf));
  }
  const furnMesh = new THREE.Mesh(mergeGeometries(furn), vcMat());
  furnMesh.name = "phoneShopFurniture";
  furnMesh.castShadow = true; group.add(furnMesh);

  // props: register + a grid of colorful phone/accessory boxes on the shelves
  const props: THREE.BufferGeometry[] = [];
  props.push(tinted(0.5, 0.42, 0.4, S.x + 1.0, 1.37, counterZ, C.register));
  const boxColors = [0xe0524a, 0x4f7fd9, 0x6db24a, 0xf2c14e, 0xc98ab0, 0x2a2a30];
  let n = 0;
  for (const sy of [1.5, 2.4, 3.3]) {                      // phones on back shelves
    for (let k = 0; k < 7; k++) {
      const x = S.x - (S.w - 2.0) / 2 + k * ((S.w - 2.0) / 6);
      props.push(tinted(0.28, 0.4, 0.06, x, sy + 0.28, BACK + 0.5, boxColors[n++ % boxColors.length]));
    }
  }
  for (const sy of [1.5, 2.4]) {                            // accessories on left shelf
    for (let k = 0; k < 4; k++) {
      const z = SHOP_Z - (S.d - 2.2) / 2 + k * ((S.d - 2.2) / 3);
      props.push(tinted(0.06, 0.36, 0.26, LX + 0.5, sy + 0.26, z, boxColors[n++ % boxColors.length]));
    }
  }
  // a few display phones on the counter top
  for (const dx of [-1.8, -1.0, -0.2, 0.6]) {
    props.push(tinted(0.24, 0.04, 0.42, S.x - 1.0 + dx, 1.18, counterZ, boxColors[n++ % boxColors.length]));
  }
  const propsMesh = new THREE.Mesh(mergeGeometries(props), vcMat());
  propsMesh.name = "phoneShopProps"; group.add(propsMesh);

  // storefront glass (transparent so the stocked interior reads from the plaza)
  const glass = new THREE.Mesh(
    tinted(S.w * 0.74, 2.6, 0.1, S.x, 1.6, FRONT + 0.05, PALETTE.storefront),
    new THREE.MeshStandardMaterial({ color: PALETTE.storefront, transparent: true, opacity: 0.5 }),
  );
  glass.name = "phoneShopGlass"; group.add(glass);

  // doorway frame on the +x side
  const doorX = PHONE_SHOP_DOOR.x;
  const fr: THREE.BufferGeometry[] = [];
  fr.push(tinted(0.18, 2.6, 0.2, doorX - 0.9, 1.3, FRONT, PALETTE.frame));
  fr.push(tinted(0.18, 2.6, 0.2, doorX + 0.9, 1.3, FRONT, PALETTE.frame));
  fr.push(tinted(1.98, 0.2, 0.2, doorX, 2.6, FRONT, PALETTE.frame));
  group.add(new THREE.Mesh(mergeGeometries(fr), vcMat()));

  // sign band + lit accent above the storefront
  const sign = new THREE.Mesh(tinted(S.w * 0.9, 0.9, 0.2, S.x, H - 1.0, FRONT + 0.12, PALETTE.signCool), vcMat());
  sign.name = "phoneShopSign"; group.add(sign);
  const signLit = new THREE.Mesh(
    new THREE.BoxGeometry(S.w * 0.5, 0.42, 0.1),
    new THREE.MeshStandardMaterial({ color: PALETTE.signLit, emissive: PALETTE.signLit, emissiveIntensity: 0.6 }),
  );
  signLit.position.set(S.x, H - 1.0, FRONT + 0.24);
  group.add(signLit);

  return group;
}

// =============================================================================
// POCKET PARK — a small grassy plaza at the west end of the block: a grass pad
// with a crossing paver path, two trees, a bench, a bin, planters and a lamp.
// =============================================================================
export function makePocketPark(): THREE.Object3D {
  const group = new THREE.Group();
  group.name = "pocketPark";
  const { x: cx, z: cz } = PARK_CENTER;
  const W = 12, D = 11;

  // grass pad
  const grass = new THREE.Mesh(
    new THREE.BoxGeometry(W, 0.1, D),
    new THREE.MeshStandardMaterial({ color: PALETTE.parkGrass }),
  );
  grass.position.set(cx, 0.05, cz);
  grass.receiveShadow = true;
  group.add(grass);

  // a paver path crossing the park (so it reads as walkable)
  const paver = makeSidewalkTexture();
  paver.repeat.set(Math.max(1, Math.round(W / PAVER_SUPER_M)), 1);
  const path = new THREE.Mesh(
    new THREE.BoxGeometry(W, 0.12, 2.2),
    new THREE.MeshStandardMaterial({ map: paver }),
  );
  path.position.set(cx, 0.07, cz + 1.5);
  path.receiveShadow = true;
  group.add(path);

  // greenery + furniture reuse the city prop instancers (matched style)
  const trees: PropDef[] = [
    { id: "pk-t1", kind: "tree", x: cx - 3.5, z: cz - 2.5 },
    { id: "pk-t2", kind: "tree", x: cx + 3.5, z: cz - 2.0 },
  ];
  group.add(treeInstances(trees));
  group.add(benchInstances([{ id: "pk-b1", kind: "bench", x: cx, z: cz + 3.0 }]));
  group.add(trashcanInstances([{ id: "pk-tc", kind: "trashcan", x: cx + 4.5, z: cz + 3.2 }]));
  group.add(makeStreetLight({ id: "pk-l", kind: "streetlight", x: cx - 4.6, z: cz + 3.0 }));

  // low planter borders along the street-facing edge
  const planters: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 4; i++) {
    const x = cx - 4.5 + i * 3;
    planters.push(tinted(2.4, 0.5, 0.7, x, 0.25, cz + 5.0, PALETTE.benchWood));
    planters.push(tinted(2.0, 0.4, 0.5, x, 0.6, cz + 5.0, PALETTE.hedge));
  }
  group.add(new THREE.Mesh(mergeGeometries(planters), vcMat()));

  return group;
}

// =============================================================================
// TAXI PICKUP — a parked cab on the near curb, a pickup sign on a post, a
// painted waiting marker on the ground and a "TAXI" roof box.
// =============================================================================
export function makeTaxiPickup(): THREE.Object3D {
  const group = new THREE.Group();
  group.name = "taxiPickup";

  // parked yellow cab, length running along x (parallel to the curb)
  const cab = makeCarBody({ bodyColor: 0xf2c14e, withWheels: true });
  cab.position.set(TAXI_CAR.x, 0.55, TAXI_CAR.z);
  cab.rotation.y = Math.PI / 2;
  group.add(cab);
  // checker + "TAXI" roof sign
  const roof = new THREE.Mesh(
    new THREE.BoxGeometry(1.1, 0.34, 0.5),
    new THREE.MeshStandardMaterial({ color: 0x1a1a1a }),
  );
  roof.position.set(TAXI_CAR.x, 1.55, TAXI_CAR.z);
  roof.name = "taxiRoofSign";
  group.add(roof);
  const roofLit = new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 0.2, 0.1),
    new THREE.MeshStandardMaterial({ color: PALETTE.signLit, emissive: PALETTE.signLit, emissiveIntensity: 0.7 }),
  );
  roofLit.position.set(TAXI_CAR.x, 1.55, TAXI_CAR.z + 0.26);
  group.add(roofLit);

  // pickup sign post on the patio side
  const post = new THREE.Mesh(
    new THREE.BoxGeometry(0.16, 2.4, 0.16),
    new THREE.MeshStandardMaterial({ color: PALETTE.lampPole }),
  );
  post.position.set(TAXI_WAIT.x, 1.2, TAXI_WAIT.z);
  post.castShadow = true;
  group.add(post);
  const sign = new THREE.Mesh(
    new THREE.BoxGeometry(1.3, 0.7, 0.12),
    new THREE.MeshStandardMaterial({ color: PALETTE.signWarm }),
  );
  sign.position.set(TAXI_WAIT.x, 2.4, TAXI_WAIT.z);
  sign.castShadow = true;
  sign.name = "taxiSign";
  group.add(sign);
  const signGlyph = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 0.34, 0.06),
    new THREE.MeshStandardMaterial({ color: PALETTE.signLit, emissive: PALETTE.signLit, emissiveIntensity: 0.6 }),
  );
  signGlyph.position.set(TAXI_WAIT.x, 2.4, TAXI_WAIT.z + 0.1);
  group.add(signGlyph);

  // painted waiting marker on the ground
  const marker = new THREE.Mesh(
    new THREE.BoxGeometry(1.6, 0.04, 1.6),
    new THREE.MeshStandardMaterial({ color: PALETTE.signLit }),
  );
  marker.position.set(TAXI_WAIT.x, 0.13, TAXI_WAIT.z);
  group.add(marker);

  return group;
}
