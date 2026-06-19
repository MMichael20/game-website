// rishon3d/src/world/restaurantInterior.ts
//
// The open restaurant: the middle promenade box turned into a hollow, walk-in
// shell with a furnished interior (ordering counter, register, menu board,
// kitchen/prep, indoor tables + chairs, a booth, wall shelves, tableware, food,
// a trash bin and potted plants). Built in world space at the MAIN_RESTAURANT
// footprint so the player can walk straight in through the storefront doorway.
//
// Everything merges into a handful of vertex-colored meshes (one structural
// "restaurantBuilding" shell, one furniture mesh, one tableware/props mesh) plus
// a small emissive menu panel, keeping the whole interior at ~4 draw calls.
// Deterministic (fixed layout, no RNG).

import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { PALETTE } from "./palette";
import { MAIN_RESTAURANT, shopFront, SHOP_Z, INDOOR_TABLES, INDOOR_CHAIR_DX } from "./districtPois";

const MD = MAIN_RESTAURANT;
const FRONT = shopFront(MD.d);        // +Z storefront plane (93)
const BACK = SHOP_Z - MD.d / 2;       // -Z back wall plane (85)
const LX = MD.x - MD.w / 2;           // left wall plane (90.5)
const RX = MD.x + MD.w / 2;           // right wall plane (99.5)
const H = MD.h;                       // 9
const T = 0.3;                        // wall thickness

// Interior palette (warm, distinct from the sandy exterior so the room reads).
const C = {
  wall: PALETTE.houseBody,   // warm sand, matches the closed restaurants' exterior
  floor: 0xcdb89a,
  floorTile: 0xb8a079,
  ceiling: 0xe8dcc4,
  counter: 0xa9692f,
  counterTop: 0xcdb98c,
  steel: 0x9aa0a6,
  steelDark: 0x6f757a,
  register: 0x2a2a30,
  board: PALETTE.signWarm,
  wood: 0x8a5a32,
  woodDark: 0x5f3d22,
  cushion: 0xb23b3b,
  shelf: 0xb98a5a,
  plate: 0xf3efe6,
  cupRed: 0xd94f4f,
  cupBlue: 0x4f7fd9,
  tray: 0x7a5230,
  foodY: 0xf2c14e,
  foodG: 0x6db24a,
  foodBrown: 0x9c6b3a,
  soil: 0x3a2a1c,
  leaf: PALETTE.hedge,
  trash: PALETTE.trashCan,
};

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

// A simple four-legged chair with a back, facing +z by default (back on -z).
function chair(x: number, z: number, faceYaw: number, into: THREE.BufferGeometry[]): void {
  const parts: THREE.BufferGeometry[] = [];
  parts.push(tinted(0.5, 0.12, 0.5, 0, 0.5, 0, C.wood));      // seat
  parts.push(tinted(0.5, 0.55, 0.12, 0, 0.8, -0.22, C.cushion)); // back
  for (const sx of [-0.2, 0.2]) for (const sz of [-0.2, 0.2]) {
    parts.push(tinted(0.09, 0.5, 0.09, sx, 0.25, sz, C.woodDark)); // legs
  }
  const merged = mergeGeometries(parts);
  merged.rotateY(faceYaw);
  merged.translate(x, 0, z);
  into.push(merged);
}

// A small square indoor table with a top + center pillar + foot.
function indoorTable(x: number, z: number, into: THREE.BufferGeometry[]): void {
  into.push(tinted(1.2, 0.12, 1.2, x, 0.92, z, C.counterTop)); // top
  into.push(tinted(0.18, 0.8, 0.18, x, 0.46, z, C.woodDark));  // pillar
  into.push(tinted(0.6, 0.1, 0.6, x, 0.06, z, C.woodDark));    // foot
}

export function makeRestaurantInterior(): THREE.Object3D {
  const group = new THREE.Group();
  group.name = "restaurantInterior";

  const shell: THREE.BufferGeometry[] = [];
  const furniture: THREE.BufferGeometry[] = [];
  const props: THREE.BufferGeometry[] = [];

  // --- structural shell: floor, ceiling, back + side walls, front corners +
  // header (the storefront glass/doorway fills the open front) ----------------
  shell.push(tinted(MD.w - 0.2, 0.12, MD.d - 0.2, MD.x, 0.07, SHOP_Z, C.floor)); // floor slab
  // a few darker floor tile bands for a tiled read
  for (const tz of [SHOP_Z - 2, SHOP_Z, SHOP_Z + 2]) {
    shell.push(tinted(MD.w - 0.4, 0.13, 0.18, MD.x, 0.075, tz, C.floorTile));
  }
  shell.push(tinted(MD.w, T, MD.d, MD.x, H - T / 2, SHOP_Z, C.ceiling));        // ceiling
  shell.push(tinted(MD.w, H, T, MD.x, H / 2, BACK + T / 2, C.wall));            // back wall
  shell.push(tinted(T, H, MD.d, LX + T / 2, H / 2, SHOP_Z, C.wall));           // left wall
  shell.push(tinted(T, H, MD.d, RX - T / 2, H / 2, SHOP_Z, C.wall));           // right wall
  // front: corner returns flanking the storefront, plus a header beam above it.
  shell.push(tinted(1.0, H, T, LX + 0.5, H / 2, FRONT - T / 2, C.wall));        // left corner
  shell.push(tinted(1.0, H, T, RX - 0.5, H / 2, FRONT - T / 2, C.wall));        // right corner
  shell.push(tinted(MD.w - 2.0, H - 3.0, T, MD.x, 3.0 + (H - 3.0) / 2, FRONT - T / 2, C.wall)); // header

  // --- ordering counter: a long wooden counter with a stone-grey top, a staff
  // pass-through gap on the +x side near the door ----------------------------
  const counterZ = SHOP_Z - 1.6;
  furniture.push(tinted(6.0, 1.05, 0.7, MD.x - 0.6, 0.525, counterZ, C.counter));   // body
  furniture.push(tinted(6.3, 0.12, 0.85, MD.x - 0.6, 1.1, counterZ, C.counterTop)); // top
  // --- kitchen / prep: a steel back counter + overhead shelf + hood ----------
  furniture.push(tinted(5.6, 1.0, 0.55, MD.x - 0.4, 0.5, BACK + 0.6, C.steel));     // prep counter
  furniture.push(tinted(5.0, 0.4, 0.5, MD.x - 0.4, 3.0, BACK + 0.5, C.steelDark));  // overhead shelf
  furniture.push(tinted(2.2, 0.7, 0.5, MD.x + 1.4, 2.0, BACK + 0.5, C.steelDark));  // range hood

  // --- indoor dining: two tables with chairs (south, near the entrance). Built
  // from the shared INDOOR_TABLES / INDOOR_CHAIR_DX so a chair is ALWAYS under
  // every NPC seat (INDOOR_TABLE_SEATS / INDOOR_DINER_SEATS derive from these). ---
  const tables: [number, number][] = INDOOR_TABLES.map((t) => [t.x, t.z]);
  for (const [tx, tz] of tables) {
    indoorTable(tx, tz, furniture);
    chair(tx - INDOOR_CHAIR_DX, tz, Math.PI / 2, furniture);
    chair(tx + INDOOR_CHAIR_DX, tz, -Math.PI / 2, furniture);
  }

  // --- booth bench along the left wall + its table ---------------------------
  furniture.push(tinted(0.7, 0.5, 3.2, LX + 0.65, 0.25, SHOP_Z, C.wood));        // bench seat
  furniture.push(tinted(0.5, 1.1, 3.2, LX + 0.45, 0.85, SHOP_Z, C.cushion));     // bench back
  furniture.push(tinted(1.1, 0.12, 0.9, LX + 1.6, 0.78, SHOP_Z, C.counterTop));  // booth table
  furniture.push(tinted(0.15, 0.7, 0.15, LX + 1.6, 0.4, SHOP_Z, C.woodDark));    // booth table leg

  // --- wall shelves along the right wall -------------------------------------
  for (const sy of [1.4, 2.3, 3.2]) {
    furniture.push(tinted(0.45, 0.1, 3.0, RX - 0.45, sy, SHOP_Z, C.shelf));
  }

  // === small props (tableware, food, register, plants, bin) =================
  // register on the counter
  props.push(tinted(0.5, 0.42, 0.4, MD.x + 1.6, 1.37, counterZ, C.register));
  props.push(tinted(0.42, 0.26, 0.05, MD.x + 1.6, 1.5, counterZ + 0.22, C.steel)); // register screen
  // trays + plates + cups along the counter top
  let i = 0;
  for (const dx of [-2.6, -1.9, -1.2, 0.0, 0.7]) {
    const tx = MD.x - 0.6 + dx;
    props.push(tinted(0.5, 0.06, 0.36, tx, 1.19, counterZ + 0.08, C.tray));
    props.push(tinted(0.3, 0.05, 0.3, tx, 1.24, counterZ + 0.08, C.plate));
    if (i % 2 === 0) props.push(tinted(0.16, 0.22, 0.16, tx + 0.12, 1.33, counterZ - 0.12, i % 4 === 0 ? C.cupRed : C.cupBlue));
    i++;
  }
  // food blocks on the prep counter
  for (const dx of [-2.0, -1.0, 0.2, 1.2]) {
    props.push(tinted(0.35, 0.18, 0.35, MD.x - 0.4 + dx, 1.1, BACK + 0.6, dx < 0 ? C.foodY : C.foodG));
  }
  // tableware on the indoor + booth tables
  for (const [tx, tz] of [...tables, [LX + 1.6, SHOP_Z] as [number, number]]) {
    props.push(tinted(0.34, 0.05, 0.34, tx - 0.2, 1.0, tz, C.plate));
    props.push(tinted(0.16, 0.2, 0.16, tx + 0.22, 1.08, tz - 0.12, C.cupRed));
    props.push(tinted(0.12, 0.16, 0.12, tx + 0.05, 1.06, tz + 0.2, C.foodBrown)); // condiment
  }
  // cups + plates stacked on the wall shelves
  for (const sy of [1.4, 2.3]) for (const dz of [-1.0, -0.2, 0.6, 1.3]) {
    props.push(tinted(0.18, 0.2, 0.18, RX - 0.45, sy + 0.15, SHOP_Z + dz, dz < 0 ? C.cupBlue : C.cupRed));
  }
  // trash bin near the entrance
  props.push(tinted(0.5, 0.85, 0.5, RX - 0.8, 0.45, FRONT - 1.0, C.steelDark));
  props.push(tinted(0.56, 0.1, 0.56, RX - 0.8, 0.9, FRONT - 1.0, C.steel)); // lid
  // potted plants in the two front corners
  for (const px of [LX + 0.7, RX - 1.7]) {
    props.push(tinted(0.5, 0.5, 0.5, px, 0.25, FRONT - 0.9, C.woodDark)); // pot
    props.push(tinted(0.42, 0.18, 0.42, px, 0.55, FRONT - 0.9, C.soil));  // soil
    props.push(tinted(0.7, 0.7, 0.7, px, 1.05, FRONT - 0.9, C.leaf));     // foliage
    props.push(tinted(0.5, 0.5, 0.5, px, 1.6, FRONT - 0.9, C.leaf));      // foliage top
  }

  // open doorway frame at the entrance (signals "walk in here") ---------------
  const doorX = MD.x + MD.w * 0.28;
  const frameMat = new THREE.MeshStandardMaterial({ color: PALETTE.frame });
  const fr: THREE.BufferGeometry[] = [];
  fr.push(tinted(0.18, 2.6, 0.2, doorX - 0.9, 1.3, FRONT, PALETTE.frame)); // left jamb
  fr.push(tinted(0.18, 2.6, 0.2, doorX + 0.9, 1.3, FRONT, PALETTE.frame)); // right jamb
  fr.push(tinted(1.98, 0.2, 0.2, doorX, 2.6, FRONT, PALETTE.frame));       // lintel
  const frame = new THREE.Mesh(mergeGeometries(fr), frameMat);
  frame.name = "doorFrame";
  group.add(frame);
  // a dark threshold mat on the floor at the doorway
  const matMesh = new THREE.Mesh(
    tinted(2.0, 0.05, 1.2, doorX, 0.1, FRONT - 0.7, 0x2a2620),
    new THREE.MeshStandardMaterial({ vertexColors: true }),
  );
  group.add(matMesh);

  // === assemble merged meshes ===============================================
  const vcMat = () => new THREE.MeshStandardMaterial({ vertexColors: true });

  const shellMesh = new THREE.Mesh(mergeGeometries(shell), vcMat());
  shellMesh.name = "restaurantBuilding"; // keeps the >=3 building-mesh invariant
  shellMesh.castShadow = true;
  shellMesh.receiveShadow = true;
  group.add(shellMesh);

  const furnitureMesh = new THREE.Mesh(mergeGeometries(furniture), vcMat());
  furnitureMesh.name = "interiorFurniture";
  furnitureMesh.castShadow = true;
  furnitureMesh.receiveShadow = true;
  group.add(furnitureMesh);

  const propsMesh = new THREE.Mesh(mergeGeometries(props), vcMat());
  propsMesh.name = "interiorProps";
  propsMesh.castShadow = true;
  group.add(propsMesh);

  // emissive menu board on the back wall above the counter
  const boardBase = new THREE.Mesh(
    tinted(4.6, 1.5, 0.12, MD.x - 0.4, 4.2, BACK + 0.16, C.board),
    vcMat(),
  );
  boardBase.name = "menuBoardBase";
  group.add(boardBase);
  const boardLit = new THREE.Mesh(
    new THREE.BoxGeometry(4.2, 1.1, 0.06),
    new THREE.MeshStandardMaterial({ color: PALETTE.signLit, emissive: PALETTE.signLit, emissiveIntensity: 0.5 }),
  );
  boardLit.position.set(MD.x - 0.4, 4.2, BACK + 0.24);
  boardLit.name = "menuBoardLit";
  group.add(boardLit);

  return group;
}
