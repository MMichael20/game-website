// rishon3d/src/world/staticPeople.ts
//
// Guaranteed static residents that keep every V1 location visibly staffed/used
// even in a still frame (the scripted Patron loops add movement on top): a
// restaurant cashier + diners, a bakery counter hand, a phone-shop worker + a
// browsing customer, a taxi-curb waiter, pocket-park idlers, patio diners and a
// couple of sidewalk pedestrians. Deterministic, posed, merged-shadow humanoids
// anchored to the shared districtPois coordinates.

import * as THREE from "three";
import { makeHumanoid, type HumanoidPalette } from "../entities/Humanoid";
import {
  RESTAURANT_STAFF, BAKERY_STAFF, PHONE_SHOP_STAFF, PHONE_SHOP_INSIDE,
  TAXI_WAIT, PARK_BENCH, PARK_CENTER, INDOOR_DINER_SEATS, seatClusters,
} from "./districtPois";

const SIT_DROP = 0.4, LEG_SIT = -1.5, ARM_SIT = -0.6;

const P: HumanoidPalette[] = [
  { skin: 0xf0c9a0, shirt: 0xc0392b, pants: 0x274060 },
  { skin: 0xc98a5a, shirt: 0x2e8b57, pants: 0x2a2a30 },
  { skin: 0xe0b48a, shirt: 0x2980b9, pants: 0x303848 },
  { skin: 0xf0c9a0, shirt: 0xe0b23a, pants: 0x444450 },
  { skin: 0xd9a066, shirt: 0x8e44ad, pants: 0x222630 },
  { skin: 0xf2d2b6, shirt: 0x16a085, pants: 0x2b2b33 },
];
// staff wear distinct aprons/uniforms so the "worker" reads as staff.
const STAFF: HumanoidPalette[] = [
  { skin: 0xe0b48a, shirt: 0x2f7fb0, pants: 0x20242b }, // phone-shop blue
  { skin: 0xf0c9a0, shirt: 0xd9533b, pants: 0x2a2a30 }, // restaurant red
  { skin: 0xc98a5a, shirt: 0xe8e6df, pants: 0x6b4a2a }, // bakery white apron
];

function castAll(o: THREE.Object3D): void {
  o.traverse((c) => { const m = c as THREE.Mesh; if (m.isMesh) m.castShadow = true; });
}

function stander(palette: HumanoidPalette, x: number, z: number, yaw: number): THREE.Object3D {
  const { group } = makeHumanoid(palette);
  group.position.set(x, 0, z);
  group.rotation.y = yaw;
  castAll(group);
  return group;
}

function sitter(palette: HumanoidPalette, x: number, z: number, yaw: number): THREE.Object3D {
  const { group, limbs } = makeHumanoid(palette);
  group.position.set(x, -SIT_DROP, z);
  group.rotation.y = yaw;
  limbs.leftLeg.rotation.x = LEG_SIT; limbs.rightLeg.rotation.x = LEG_SIT;
  limbs.leftArm.rotation.x = ARM_SIT; limbs.rightArm.rotation.x = ARM_SIT;
  castAll(group);
  return group;
}

export function makeStaticPeople(): THREE.Object3D {
  const g = new THREE.Group();
  g.name = "staticPeople";

  // --- staff at their posts (yaw 0 faces +z, toward the customers/storefront) ---
  g.add(stander(STAFF[1], RESTAURANT_STAFF.x, RESTAURANT_STAFF.z, 0));   // restaurant cashier
  g.add(stander(STAFF[2], BAKERY_STAFF.x, BAKERY_STAFF.z, 0));           // bakery counter hand
  g.add(stander(STAFF[0], PHONE_SHOP_STAFF.x, PHONE_SHOP_STAFF.z, 0));   // phone-shop worker
  // a customer browsing inside the phone shop
  g.add(stander(P[4], PHONE_SHOP_INSIDE.x + 0.6, PHONE_SHOP_INSIDE.z + 0.4, Math.PI));

  // --- taxi-curb waiter (stands at the waiting marker, facing the road/cab) ---
  g.add(stander(P[3], TAXI_WAIT.x + 0.6, TAXI_WAIT.z + 0.3, Math.PI));

  // --- pocket-park idlers: one on the bench, one strolling the plaza ---
  g.add(sitter(P[5], PARK_BENCH.x, PARK_BENCH.z, Math.PI));              // bench, facing the street
  g.add(stander(P[2], PARK_CENTER.x - 3.0, PARK_CENTER.z + 0.5, 0.6));

  // --- indoor diners seated at the restaurant tables (inner chairs) ---
  INDOOR_DINER_SEATS.forEach((s, i) => g.add(sitter(P[i % P.length], s.x, s.z, s.faceYaw)));

  // --- a couple of patio diners at outer clusters (face the table center) ---
  const cl = seatClusters();
  g.add(sitter(P[0], cl[0].x - 0.95, cl[0].z, Math.PI / 2));
  g.add(sitter(P[2], cl[cl.length - 1].x + 0.95, cl[cl.length - 1].z, -Math.PI / 2));

  return g;
}
