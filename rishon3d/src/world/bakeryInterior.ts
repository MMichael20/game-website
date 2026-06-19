// rishon3d/src/world/bakeryInterior.ts
//
// The west promenade shell turned into a walk-in bakery-cafe: a hollow furnished
// interior (glass pastry case stocked with cakes/cupcakes/donuts, a back wall of
// cake shelves, an ice-cream/drinks counter, a couple of cafe tables) built in
// world space at the BAKERY footprint so the player can walk straight in. The
// dessert props all come from the reusable object library.

import * as THREE from "three";
import { tintedBox, mergeTinted, tintedMesh } from "./objects/voxel";
import { makeCakeMesh } from "./objects/cake";
import { makeCupcakeMesh } from "./objects/cupcake";
import { makeDonutMesh } from "./objects/donut";
import { makeIceCreamMesh, ICE_CREAM_PRESETS } from "./objects/iceCream";
import { makeDrinkCupMesh, DRINK_PRESETS } from "./objects/drinkCup";
import { PALETTE } from "./palette";
import { FROSTING, SPONGE, GLAZE } from "./objects/objectPalette";
import { BAKERY, shopFront, SHOP_Z } from "./districtPois";

const MD = BAKERY;
const FRONT = shopFront(MD.d);     // +Z storefront plane
const BACK = SHOP_Z - MD.d / 2;    // -Z back wall plane
const LX = MD.x - MD.w / 2;
const RX = MD.x + MD.w / 2;
const H = MD.h;
const T = 0.3;

const C = {
  wall: 0xf6e3c8, floor: 0xe7d3b0, floorTile: 0xd8bf95, ceiling: 0xf3ecdd,
  counter: 0xb5743a, counterTop: 0xe9dcc0, shelf: 0xc79a66, board: PALETTE.signWarm,
};

export function makeBakeryInterior(): THREE.Object3D {
  const group = new THREE.Group();
  group.name = "bakeryInterior";

  const shell: THREE.BufferGeometry[] = [];
  shell.push(tintedBox(MD.w - 0.2, 0.12, MD.d - 0.2, MD.x, 0.07, SHOP_Z, C.floor));
  for (const tz of [SHOP_Z - 2, SHOP_Z, SHOP_Z + 2]) {
    shell.push(tintedBox(MD.w - 0.4, 0.13, 0.18, MD.x, 0.075, tz, C.floorTile));
  }
  shell.push(tintedBox(MD.w, T, MD.d, MD.x, H - T / 2, SHOP_Z, C.ceiling));        // ceiling
  shell.push(tintedBox(MD.w, H, T, MD.x, H / 2, BACK + T / 2, C.wall));            // back wall
  shell.push(tintedBox(T, H, MD.d, LX + T / 2, H / 2, SHOP_Z, C.wall));            // left wall
  shell.push(tintedBox(T, H, MD.d, RX - T / 2, H / 2, SHOP_Z, C.wall));            // right wall
  shell.push(tintedBox(1.0, H, T, LX + 0.5, H / 2, FRONT - T / 2, C.wall));        // front-left return
  shell.push(tintedBox(1.0, H, T, RX - 0.5, H / 2, FRONT - T / 2, C.wall));        // front-right return
  shell.push(tintedBox(MD.w - 2.0, H - 2.6, T, MD.x, 2.6 + (H - 2.6) / 2, FRONT - T / 2, C.wall)); // header
  const shellMesh = tintedMesh(mergeTinted(shell));
  shellMesh.name = "restaurantBuilding"; // keeps the >=3 building-mesh invariant
  group.add(shellMesh);

  // --- pastry display counter (front-left), with a glass case ---
  const furn: THREE.BufferGeometry[] = [];
  const counterZ = SHOP_Z + 1.2;
  furn.push(tintedBox(4.6, 1.0, 0.8, MD.x - 0.3, 0.5, counterZ, C.counter));        // case body
  furn.push(tintedBox(4.8, 0.12, 0.92, MD.x - 0.3, 1.06, counterZ, C.counterTop));  // case top rail
  // back wall cake shelves (against the wall) + a SEPARATE ice-cream/drinks
  // counter pulled forward into the room, so the tall cones never intersect the
  // shelf cakes behind them (was: counter flush with shelves -> cake-in-icecream).
  const backCounterZ = BACK + 1.5;
  for (const sy of [1.6, 2.6, 3.5]) furn.push(tintedBox(MD.w - 1.2, 0.12, 0.5, MD.x, sy, BACK + 0.4, C.shelf));
  furn.push(tintedBox(4.8, 0.95, 0.6, MD.x, 0.48, backCounterZ, C.counter));        // back counter
  furn.push(tintedBox(5.0, 0.12, 0.72, MD.x, 1.0, backCounterZ, C.counterTop));
  group.add(tintedMesh(mergeTinted(furn)));

  // glass over the pastry case
  const glass = new THREE.Mesh(
    new THREE.BoxGeometry(4.5, 0.7, 0.78),
    new THREE.MeshStandardMaterial({ color: PALETTE.storefront, transparent: true, opacity: 0.2, roughness: 0.3 }),
  );
  glass.position.set(MD.x - 0.3, 1.45, counterZ);
  group.add(glass);

  // --- desserts: in the case, on the shelves, on cafe tables ---
  const add = (m: THREE.Mesh, x: number, y: number, z: number) => { m.position.set(x, y, z); m.castShadow = true; group.add(m); };
  // inside the pastry case (y on the case top, under glass)
  const caseY = 1.12;
  add(makeCakeMesh({ frostingColor: FROSTING.pink, tiers: 2 }), MD.x - 2.0, caseY, counterZ);
  add(makeCakeMesh({ spongeColor: SPONGE.chocolate, frostingColor: FROSTING.chocolate, slice: true }), MD.x - 1.1, caseY, counterZ);
  add(makeDonutMesh({ glazeColor: GLAZE.pink }), MD.x - 0.4, caseY, counterZ + 0.1);
  add(makeCupcakeMesh({ frostingColor: FROSTING.mint }), MD.x + 0.2, caseY, counterZ - 0.1);
  add(makeCupcakeMesh({ frostingColor: FROSTING.lemon }), MD.x + 0.7, caseY, counterZ + 0.1);
  add(makeDonutMesh({ glazeColor: GLAZE.chocolate }), MD.x + 1.4, caseY, counterZ);
  // cakes on the back shelves (2 tiers max so they fit under the shelf above)
  add(makeCakeMesh({ frostingColor: FROSTING.cream, tiers: 2 }), MD.x - 1.6, 1.72, BACK + 0.5);
  add(makeCakeMesh({ frostingColor: FROSTING.pink, tiers: 2 }), MD.x + 1.6, 1.72, BACK + 0.5);
  add(makeCupcakeMesh(), MD.x - 0.4, 2.72, BACK + 0.5);
  add(makeCupcakeMesh({ frostingColor: FROSTING.lemon }), MD.x + 0.4, 2.72, BACK + 0.5);
  // ice creams + drinks on the back counter (pulled forward, clear of the shelves)
  add(makeIceCreamMesh(ICE_CREAM_PRESETS.classic), MD.x - 1.8, 1.05, backCounterZ);
  add(makeIceCreamMesh(ICE_CREAM_PRESETS.mintChoc), MD.x - 1.1, 1.05, backCounterZ);
  add(makeDrinkCupMesh(DRINK_PRESETS.berry), MD.x + 1.1, 1.05, backCounterZ);
  add(makeDrinkCupMesh(DRINK_PRESETS.orange), MD.x + 1.7, 1.05, backCounterZ);

  // --- a small cafe table near the entrance with a cake + cupcakes ---
  const tableX = MD.x + 1.4, tableZ = SHOP_Z + 2.4;
  const table: THREE.BufferGeometry[] = [];
  table.push(tintedBox(1.1, 0.1, 1.1, 0, 0.92, 0, C.counterTop));
  table.push(tintedBox(0.16, 0.85, 0.16, 0, 0.46, 0, C.counter));
  table.push(tintedBox(0.5, 0.1, 0.5, 0, 0.06, 0, C.counter));
  const tableMesh = tintedMesh(mergeTinted(table));
  tableMesh.position.set(tableX, 0, tableZ);
  group.add(tableMesh);
  add(makeCakeMesh({ frostingColor: FROSTING.mint, tiers: 2, slice: true }), tableX, 0.97, tableZ);
  add(makeDrinkCupMesh(DRINK_PRESETS.cola), tableX + 0.35, 0.97, tableZ + 0.3);

  // --- doorway frame + menu board ---
  const doorX = MD.x - MD.w * 0.26;
  const fr: THREE.BufferGeometry[] = [];
  fr.push(tintedBox(0.18, 2.4, 0.2, doorX - 0.9, 1.2, FRONT, PALETTE.frame));
  fr.push(tintedBox(0.18, 2.4, 0.2, doorX + 0.9, 1.2, FRONT, PALETTE.frame));
  fr.push(tintedBox(1.98, 0.2, 0.2, doorX, 2.4, FRONT, PALETTE.frame));
  group.add(tintedMesh(mergeTinted(fr)));

  const boardLit = new THREE.Mesh(
    new THREE.BoxGeometry(3.4, 0.9, 0.06),
    new THREE.MeshStandardMaterial({ color: PALETTE.signLit, emissive: PALETTE.signLit, emissiveIntensity: 0.5 }),
  );
  boardLit.position.set(MD.x, 4.4, BACK + 0.24);
  group.add(boardLit);

  group.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) m.castShadow = true; });
  return group;
}
