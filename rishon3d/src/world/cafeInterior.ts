// rishon3d/src/world/cafeInterior.ts
//
// The CAFE: a small walk-in shell WEST of the bakery, built from the SHARED kit
// systems (Tasks 1-8). Its hollow structural shell follows the same pattern as
// bakeryInterior (a "restaurantBuilding"-named shell so the >=3 building-mesh
// invariant holds), the service counter is a `makeCounterKit`, the two indoor
// tables + chairs derive from the CAFE_TABLES / CAFE_CHAIR_DX single source (so a
// chair is always under every NPC seat), and the storefront glass is a layered
// `makeGlassPanel`. Coffee + pastries come from the reusable object library.
//
// Deterministic (fixed layout, no RNG); merges to a handful of vertex-colored
// meshes plus the kit Groups. Anchored in world space at the CAFE footprint so
// the player walks straight in through the open storefront.

import * as THREE from "three";
import { tintedBox, mergeTinted, tintedMesh } from "./objects/voxel";
import { makeCounterKit } from "./kits";
import { makeCakeMesh } from "./objects/cake";
import { makeCupcakeMesh } from "./objects/cupcake";
import { makeDrinkCupMesh, DRINK_PRESETS } from "./objects/drinkCup";
import { PALETTE } from "./palette";
import { FROSTING } from "./objects/objectPalette";
import {
  CAFE, CAFE_COUNTER, CAFE_DOOR, CAFE_TABLES, CAFE_CHAIR_DX, shopFront, SHOP_Z,
} from "./districtPois";

const MD = CAFE;
const FRONT = shopFront(MD.d);     // +Z storefront plane
const BACK = SHOP_Z - MD.d / 2;    // -Z back wall plane
const LX = MD.x - MD.w / 2;
const RX = MD.x + MD.w / 2;
const H = MD.h;
const T = 0.3;

const C = {
  wall: 0xefe1cf, floor: 0xddc9a6, floorTile: 0xcab088, ceiling: 0xf1ead9,
  counterTop: 0xe6d7ba, woodDark: 0x5f3d22, wood: 0x8a5a32, cushion: 0x4f7f6a,
  shelf: 0xc79a66,
};

// A small four-legged cafe chair (back on -z by default; rotated per seat).
function chair(x: number, z: number, faceYaw: number, into: THREE.BufferGeometry[]): void {
  const parts: THREE.BufferGeometry[] = [];
  parts.push(tintedBox(0.5, 0.12, 0.5, 0, 0.5, 0, C.wood));        // seat
  parts.push(tintedBox(0.5, 0.55, 0.12, 0, 0.8, -0.22, C.cushion)); // back
  for (const sx of [-0.2, 0.2]) for (const sz of [-0.2, 0.2]) {
    parts.push(tintedBox(0.09, 0.5, 0.09, sx, 0.25, sz, C.woodDark)); // legs
  }
  const merged = mergeTinted(parts);
  merged.rotateY(faceYaw);
  merged.translate(x, 0, z);
  into.push(merged);
}

// A small round-ish cafe table (top + pillar + foot).
function cafeTable(x: number, z: number, into: THREE.BufferGeometry[]): void {
  into.push(tintedBox(1.0, 0.1, 1.0, x, 0.92, z, C.counterTop)); // top
  into.push(tintedBox(0.16, 0.85, 0.16, x, 0.46, z, C.woodDark)); // pillar
  into.push(tintedBox(0.5, 0.1, 0.5, x, 0.06, z, C.woodDark));    // foot
}

export function makeCafeInterior(): THREE.Object3D {
  const group = new THREE.Group();
  group.name = "cafeInterior";

  // --- structural shell (hollow, open front center) ---------------------------
  const shell: THREE.BufferGeometry[] = [];
  shell.push(tintedBox(MD.w - 0.2, 0.12, MD.d - 0.2, MD.x, 0.07, SHOP_Z, C.floor)); // floor slab
  for (const tz of [SHOP_Z - 2, SHOP_Z, SHOP_Z + 2]) {
    shell.push(tintedBox(MD.w - 0.4, 0.13, 0.18, MD.x, 0.075, tz, C.floorTile));     // floor tile bands
  }
  shell.push(tintedBox(MD.w, T, MD.d, MD.x, H - T / 2, SHOP_Z, C.ceiling));          // ceiling
  shell.push(tintedBox(MD.w, H, T, MD.x, H / 2, BACK + T / 2, C.wall));              // back wall
  shell.push(tintedBox(T, H, MD.d, LX + T / 2, H / 2, SHOP_Z, C.wall));              // left wall
  shell.push(tintedBox(T, H, MD.d, RX - T / 2, H / 2, SHOP_Z, C.wall));              // right wall
  // NOTE: the FRONT face (returns + header) is supplied by the makeStorefront kit
  // facade in restaurantStreet (its body wall + sign/awning/glass), so the interior
  // shell intentionally leaves the front open here — no doubled, z-fighting header.
  const shellMesh = tintedMesh(mergeTinted(shell));
  shellMesh.name = "restaurantBuilding"; // keeps the >=3 building-mesh invariant
  shellMesh.castShadow = true;
  shellMesh.receiveShadow = true;
  group.add(shellMesh);

  // --- service counter (from the shared kit) at CAFE_COUNTER ------------------
  const counter = makeCounterKit({ x: CAFE_COUNTER.x, z: CAFE_COUNTER.z, w: 5.0 });
  group.add(counter.object);

  // --- back wall display shelves + a small espresso machine on the counter ----
  const back: THREE.BufferGeometry[] = [];
  for (const sy of [1.6, 2.5]) back.push(tintedBox(MD.w - 1.4, 0.12, 0.5, MD.x, sy, BACK + 0.35, C.shelf));
  back.push(tintedBox(0.7, 0.55, 0.45, CAFE_COUNTER.x + 1.4, 0.88 + 0.275, CAFE_COUNTER.z, 0x9aa0a6)); // espresso machine body
  back.push(tintedBox(0.55, 0.2, 0.3, CAFE_COUNTER.x + 1.4, 0.88 + 0.55 + 0.1, CAFE_COUNTER.z, 0x6f757a)); // top
  group.add(tintedMesh(mergeTinted(back)));

  // --- indoor tables + chairs (derived from the single source) ----------------
  const furniture: THREE.BufferGeometry[] = [];
  for (const t of CAFE_TABLES) {
    cafeTable(t.x, t.z, furniture);
    const outer = t.x < MD.x ? t.x - CAFE_CHAIR_DX : t.x + CAFE_CHAIR_DX;
    const inner = t.x < MD.x ? t.x + CAFE_CHAIR_DX : t.x - CAFE_CHAIR_DX;
    chair(outer, t.z, t.x < MD.x ? Math.PI / 2 : -Math.PI / 2, furniture);
    chair(inner, t.z, t.x < MD.x ? -Math.PI / 2 : Math.PI / 2, furniture);
  }
  const furnMesh = tintedMesh(mergeTinted(furniture));
  furnMesh.name = "cafeFurniture";
  furnMesh.castShadow = true;
  furnMesh.receiveShadow = true;
  group.add(furnMesh);

  // --- coffee + pastries (reusable object library) ----------------------------
  const add = (m: THREE.Mesh, x: number, y: number, z: number) => {
    m.position.set(x, y, z); m.castShadow = true; group.add(m);
  };
  const counterTopY = 0.88;
  // drinks lined along the counter top
  add(makeDrinkCupMesh(DRINK_PRESETS.cola), CAFE_COUNTER.x - 1.6, counterTopY, CAFE_COUNTER.z + 0.1);
  add(makeDrinkCupMesh(DRINK_PRESETS.orange), CAFE_COUNTER.x - 0.9, counterTopY, CAFE_COUNTER.z - 0.1);
  add(makeCupcakeMesh({ frostingColor: FROSTING.mint }), CAFE_COUNTER.x - 0.1, counterTopY, CAFE_COUNTER.z + 0.1);
  add(makeCupcakeMesh({ frostingColor: FROSTING.lemon }), CAFE_COUNTER.x + 0.5, counterTopY, CAFE_COUNTER.z - 0.1);
  // pastries on the back shelves
  add(makeCakeMesh({ frostingColor: FROSTING.pink, tiers: 2 }), MD.x - 1.4, 1.72, BACK + 0.45);
  add(makeCupcakeMesh(), MD.x + 1.2, 1.72, BACK + 0.45);
  add(makeCupcakeMesh({ frostingColor: FROSTING.lemon }), MD.x + 1.8, 1.72, BACK + 0.45);
  // a coffee + cupcake on each cafe table
  for (const t of CAFE_TABLES) {
    add(makeDrinkCupMesh(DRINK_PRESETS.water), t.x + 0.18, 0.97, t.z + 0.18);
    add(makeCupcakeMesh({ frostingColor: FROSTING.pink }), t.x - 0.2, 0.97, t.z - 0.15);
  }

  // NOTE: the front face — storefront glass, glass door, sign band and awning —
  // is built by the makeStorefront kit in restaurantStreet (the cafe's facade),
  // so the interior does NOT duplicate glass / a doorframe on the front plane.

  // a dark threshold mat on the floor at the doorway (interior detail)
  group.add(tintedMesh(tintedBox(2.0, 0.05, 1.2, CAFE_DOOR.x, 0.1, FRONT - 0.7, 0x2a2620)));

  // --- emissive menu board on the back wall above the counter ------------------
  const boardLit = new THREE.Mesh(
    new THREE.BoxGeometry(3.2, 0.9, 0.06),
    new THREE.MeshStandardMaterial({ color: PALETTE.signLit, emissive: PALETTE.signLit, emissiveIntensity: 0.5 }),
  );
  boardLit.position.set(MD.x, 4.0, BACK + 0.24);
  boardLit.name = "cafeMenuLit";
  group.add(boardLit);

  return group;
}
