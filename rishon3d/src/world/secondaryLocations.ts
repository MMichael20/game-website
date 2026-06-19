// rishon3d/src/world/secondaryLocations.ts
//
// The three secondary destinations that round out the restaurant block into a
// small playable slice: a walk-in phone / convenience shop, a pocket park, and
// a taxi pickup. Each is self-contained, deterministic and anchored to the
// shared district coordinates in districtPois.ts. Geometry merges into a few
// vertex-colored meshes; greenery/bench/bin reuse the city prop instancers so
// the park matches the rest of the world.

import * as THREE from "three";
import { PALETTE } from "./palette";
import { mergeTinted, tintedMesh, tintedBox } from "./objects/voxel";
import { makeFlower } from "./objects/flower";
import { makePhone, PHONE_SCREENS } from "./objects/phone";
import { makeSidewalkTexture, PAVER_SUPER_M } from "./roads";
import { makeCarBody } from "../entities/carMesh";
import { treeInstances, benchInstances, makeBenchMesh, trashcanInstances, makeStreetLight } from "./props";
import {
  PHONE_SHOP, PHONE_SHOP_DOOR, PHONE_SHOP_COUNTER, shopFront, SHOP_Z,
  PARK_CENTER, PARK_BENCH, TAXI_CAR, TAXI_WAIT,
} from "./districtPois";
import type { PropDef } from "./rishonMap";
import { rectAround, type Rect } from "../game/wander";
import { makeStorefront } from "./storefront";
import { makeCounterKit, makeDisplayShelf } from "./kits";

// Footprints of the pocket-park props NPCs must not walk through (trees, the
// side bench, bin, lamp, planters). PARK_BENCH is EXCLUDED — patrons sit there.
// Kept next to makePocketPark's placements so they stay in sync. -> obstacles.ts
export function secondaryPropObstacles(): Rect[] {
  const { x: cx, z: cz } = PARK_CENTER;
  const out: Rect[] = [];
  for (const [tx, tz] of [[cx - 3.8, cz + 3.4], [cx + 3.8, cz + 3.8], [cx + 0.2, cz + 4.2]] as [number, number][]) {
    out.push(rectAround(tx, tz, 1.6, 1.6, 0.2)); // trees
  }
  out.push(rectAround(cx - 4.0, cz - 0.5, 1.6, 0.6, 0.2)); // side bench (not PARK_BENCH)
  out.push(rectAround(cx + 4.8, cz - 2.2, 0.7, 0.7, 0.15)); // bin
  out.push(rectAround(cx - 4.8, cz - 2.2, 0.5, 0.5, 0.15)); // lamp
  for (let i = 0; i < 4; i++) out.push(rectAround(cx - 4.5 + i * 3, cz - 5.0, 2.5, 0.9, 0.2)); // planters
  return out;
}

const vcMat = () => new THREE.MeshStandardMaterial({ vertexColors: true });

// =============================================================================
// PHONE / CONVENIENCE SHOP — a walk-in tech shop retrofitted onto the reusable
// storefront kit (facade + door + glass + sign + awning), counter kit, and
// display-shelf kit. The phone display objects (makePhone) stay as the real
// reusable objects per repo Rule 1. The hollow interior shell (floor/ceiling/
// walls) is named "phoneShopBuilding" so the >=N building-mesh invariant holds.
//
// OBSTACLE NOTE: the shell collider (shellWalls) in restaurantColliders.ts gates
// entry; the storefront body obstacle returned by makeStorefront is intentionally
// discarded so the counter/door targets stay reachable (Rule 3).
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
    wall: 0xdfe6ec, floor: 0xc6cdd3, ceiling: 0xd6dde2,
    register: 0x2a2a30,
  };

  // --- interior hollow shell (floor + ceiling + back + two side walls) ---------
  // NOTE: the FRONT face is supplied by makeStorefront below (body wall, door,
  // glass, sign, awning). The interior shell intentionally leaves the front open —
  // no doubling / z-fighting with the storefront facade.
  const shell: THREE.BufferGeometry[] = [];
  shell.push(tintedBox(S.w - 0.2, 0.12, S.d - 0.2, S.x, 0.07, SHOP_Z, C.floor));  // floor
  shell.push(tintedBox(S.w, T, S.d, S.x, H - T / 2, SHOP_Z, C.ceiling));           // ceiling
  shell.push(tintedBox(S.w, H, T, S.x, H / 2, BACK + T / 2, C.wall));              // back wall
  shell.push(tintedBox(T, H, S.d, LX + T / 2, H / 2, SHOP_Z, C.wall));             // left wall
  shell.push(tintedBox(T, H, S.d, RX - T / 2, H / 2, SHOP_Z, C.wall));             // right wall
  const shellMesh = tintedMesh(mergeTinted(shell));
  shellMesh.name = "phoneShopBuilding"; // keeps the >=N building-mesh invariant
  shellMesh.castShadow = true;
  shellMesh.receiveShadow = true;
  group.add(shellMesh);

  // --- storefront facade (reusable kit: body wall + door frame + glass + awning + sign) ---
  // Obstacles from makeStorefront are intentionally discarded — the walk-in shell
  // collider (restaurantColliders shellWalls) is the entry gate; a body obstacle
  // here would trap the door/counter targets (Rule 3).
  const { object: storefrontObj } = makeStorefront({
    x: S.x,
    frontZ: FRONT,
    w: S.w,
    h: H,
    signText: "PHONES",
    awningColor: PALETTE.awningBlue,
    glassStyle: "storefront",
    doorSide: PHONE_SHOP_DOOR.x > S.x ? "right" : "left",
    lamps: true,
    planters: false,
    interiorPeek: true,
  });
  storefrontObj.name = "phoneShopStorefront";
  group.add(storefrontObj);

  // --- service counter (reusable kit) at PHONE_SHOP_COUNTER --------------------
  // NOT registered as an obstacle (it is a patron ORDER target per Rule 3).
  const counter = makeCounterKit({ x: PHONE_SHOP_COUNTER.x, z: PHONE_SHOP_COUNTER.z, w: 5.0 });
  counter.object.name = "phoneShopCounter";
  group.add(counter.object);

  // --- back wall display shelves (reusable kit) ---------------------------------
  // Three shelf units across the back wall, face south (+z). NOT in obstacles
  // (interior furniture; the shell collider prevents NPC entry from outside).
  const shelfZ = BACK + 0.25; // ~0.25m from the back wall
  for (let i = 0; i < 3; i++) {
    const sx = S.x - 2.4 + i * 2.4;
    const shelf = makeDisplayShelf({ x: sx, z: shelfZ, faceYaw: 0 });
    shelf.object.name = `phoneShopShelf${i}`;
    group.add(shelf.object);
  }

  // --- left wall display shelves -----------------------------------------------
  // Two shelf units on the left (west) wall, face east (-x → yaw = -π/2).
  for (let i = 0; i < 2; i++) {
    const sz = SHOP_Z - 1.8 + i * 2.2;
    const shelf = makeDisplayShelf({ x: LX + 0.45, z: sz, faceYaw: -Math.PI / 2 });
    shelf.object.name = `phoneShopSideShelf${i}`;
    group.add(shelf.object);
  }

  // --- register (boxy till — genuinely a boxy rectangle, not a recognizable item) ---
  const registerGeo = mergeTinted([
    tintedBox(0.5, 0.42, 0.4, 0, 0.21, 0, C.register),         // body
    tintedBox(0.42, 0.26, 0.05, 0, 0.42, 0.22, 0x9aa0a6),      // screen
  ]);
  const registerMesh = tintedMesh(registerGeo);
  registerMesh.position.set(PHONE_SHOP_COUNTER.x + 2.0, 0.88, PHONE_SHOP_COUNTER.z);
  registerMesh.name = "phoneShopRegister";
  group.add(registerMesh);

  // --- display PHONES: real reusable phone objects on back shelves + counter ----
  // Repo Rule 1: phones are recognizable items → use makePhone, not bare cubes.
  const phoneGeos: THREE.BufferGeometry[] = [];
  let pc = 0;
  // Back shelf display: 5 phones × 3 shelf levels (offset y to sit on shelf tops)
  for (const sy of [0.36, 0.96, 1.56]) {                       // shelf-unit shelf heights (approx)
    for (let k = 0; k < 5; k++) {
      const x = S.x - (S.w - 2.6) / 2 + k * ((S.w - 2.6) / 4);
      const ph = makePhone({ screenColor: PHONE_SCREENS[pc++ % PHONE_SCREENS.length] });
      ph.translate(x, sy + 0.12, BACK + 0.55);
      phoneGeos.push(ph);
    }
  }
  // A few phones lying on the counter top
  for (const dx of [-1.9, -1.1, -0.3, 0.5]) {
    const ph = makePhone({ screenColor: PHONE_SCREENS[pc++ % PHONE_SCREENS.length] });
    ph.rotateX(-Math.PI / 2);
    ph.translate(PHONE_SHOP_COUNTER.x + dx, 0.88 + 0.06, PHONE_SHOP_COUNTER.z);
    phoneGeos.push(ph);
  }
  const phonesMesh = tintedMesh(mergeTinted(phoneGeos));
  phonesMesh.name = "phoneShopPhones";
  group.add(phonesMesh);

  return group;
}

// =============================================================================
// POCKET PARK — a small grassy plaza on the PLAYER (south) side of the street,
// just below the crosswalk: a grass pad with a crossing paver path, two trees, a
// bench, a bin, planters and a lamp. The street is to the NORTH (lower z), so the
// street-facing dressing (path, planter border, lamp, bench) hugs the north edge
// and the trees sit at the back (south).
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

  // a paver path crossing the park toward the street (north edge), so it reads as
  // the walked route from the crosswalk into the park.
  const paver = makeSidewalkTexture();
  paver.repeat.set(1, Math.max(1, Math.round(D / PAVER_SUPER_M)));
  const path = new THREE.Mesh(
    new THREE.BoxGeometry(2.4, 0.12, D),
    new THREE.MeshStandardMaterial({ map: paver }),
  );
  path.position.set(cx, 0.07, cz);
  path.receiveShadow = true;
  group.add(path);

  // a small central plaza pad so the park reads as a designed gathering spot.
  const plazaTex = makeSidewalkTexture();
  plazaTex.repeat.set(3, 3);
  const plaza = new THREE.Mesh(
    new THREE.BoxGeometry(5.5, 0.13, 5.0),
    new THREE.MeshStandardMaterial({ map: plazaTex }),
  );
  plaza.position.set(cx, 0.08, cz);
  plaza.receiveShadow = true;
  group.add(plaza);

  // greenery + furniture reuse the city prop instancers (matched style). Trees at
  // the back (south); benches + bin + lamp toward the street-facing north edge.
  const trees: PropDef[] = [
    { id: "pk-t1", kind: "tree", x: cx - 3.8, z: cz + 3.4 },
    { id: "pk-t2", kind: "tree", x: cx + 3.8, z: cz + 3.8 },
    { id: "pk-t3", kind: "tree", x: cx + 0.2, z: cz + 4.2 },
  ];
  group.add(treeInstances(trees));
  // the main bench sits at PARK_BENCH, rotated to FACE the plaza/street (north) so
  // the seated idler (yaw=PI) sits the right way round, not into the backrest.
  group.add(makeBenchMesh(PARK_BENCH.x, PARK_BENCH.z, Math.PI));
  group.add(benchInstances([{ id: "pk-b2", kind: "bench", x: cx - 4.0, z: cz - 0.5 }]));
  group.add(trashcanInstances([{ id: "pk-tc", kind: "trashcan", x: cx + 4.8, z: cz - 2.2 }]));
  group.add(makeStreetLight({ id: "pk-l", kind: "streetlight", x: cx - 4.8, z: cz - 2.2 }));

  // chunky flower planters bordering the street-facing (north) edge, with real
  // voxel blooms (merged via mergeTinted so the non-indexed flowers combine).
  const planters: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 4; i++) {
    const px = cx - 4.5 + i * 3;
    const pz = cz - 5.0;
    planters.push(tintedBox(2.5, 0.62, 0.9, px, 0.31, pz, PALETTE.benchWood));
    planters.push(tintedBox(2.2, 0.18, 0.66, px, 0.62, pz, 0x3a2a1c));
    for (const dx of [-0.7, -0.2, 0.3, 0.75]) {
      planters.push(tintedBox(0.46, 0.4, 0.46, px + dx, 0.78, pz, PALETTE.hedge));
    }
    const bloom: [number, number][] = [[-0.7, PALETTE.flowerRed], [-0.1, PALETTE.flowerWhite], [0.45, PALETTE.flowerYellow]];
    for (const [dx, hex] of bloom) {
      const f = makeFlower({ petalColor: hex, height: 0.34, petalCount: 5 });
      f.translate(px + dx, 0.74, pz);
      planters.push(f);
    }
  }
  group.add(new THREE.Mesh(mergeTinted(planters), vcMat()));

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
