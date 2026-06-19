// rishon3d/src/world/restaurantStreet.ts
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { makeInstanced, type Placement } from "./InstancedProps";
import { PALETTE, BUILDING_COLORS } from "./palette";
import { makeSidewalkTexture, makeAsphaltTexture, PAVER_SUPER_M, GRAIN_M } from "./roads";
import { makeStreetLight, treeInstances, trashcanInstances } from "./props";
import { makeBuilding } from "./builders";
import { makeCarBody } from "../entities/carMesh";
import { makeHumanoid, type HumanoidPalette } from "../entities/Humanoid";
import type { PropDef, BuildingDef } from "./rishonMap";
import { makeRestaurantInterior } from "./restaurantInterior";
import { makeBakeryInterior } from "./bakeryInterior";
import { makePhoneShop, makePocketPark, makeTaxiPickup } from "./secondaryLocations";
import { makePlayerHouse } from "./playerHouse";
import { makeUmbrella } from "./objects/umbrella";
import { makeFlower } from "./objects/flower";
import { mergeTinted } from "./objects/voxel";
import { makeDessertCart } from "./dessertCart";
import {
  CX, CZ, PROM_W, PROM_D, SHOP_Z, SEAT_Z, ROAD_Z, STREET_LEN, FAR_WALK_D, ROAD_W,
  RESTAURANTS, seatClusters, CHAIR_OFFSETS, PICKUP_STAND, shopFront, type RestaurantSpec,
} from "./districtPois";

// A short, lively restaurant promenade in the open SE corner of the map. The
// block now reads as a small playable slice: an enterable open restaurant with a
// furnished interior, a walk-in phone shop, a taxi pickup and a pocket park, all
// fronting a paved plaza + street. Self-contained, deterministic (fixed layout,
// no rng), merged/instanced so the whole landmark stays at a handful of draw
// calls. The builder returns a Group anchored at the origin with world-space
// geometry, so the World can add it directly.

// Gameplay anchor: the delivery/pickup marker stand position, in the SE region.
export const RESTAURANT = { x: PICKUP_STAND.x, z: PICKUP_STAND.z };

// --- vertex-color helper: tint a box's vertices so several colors merge into
// one geometry (one draw call) instead of one material per color. ---
function tintedBox(w: number, h: number, d: number, x: number, y: number, z: number, hex: number): THREE.BufferGeometry {
  const b = new THREE.BoxGeometry(w, h, d);
  b.translate(x, y, z);
  const c = new THREE.Color(hex);
  const n = b.attributes.position.count;
  const colors = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b; }
  b.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  return b;
}

// Striped awning slab: a sloped box whose top alternates color / white columns
// via vertex colors, so several awnings (any color) merge into ONE mesh.
function awningStripes(x: number, y: number, z: number, w: number, color: number): THREE.BufferGeometry[] {
  const cols = 6;
  const colW = w / cols;
  const out: THREE.BufferGeometry[] = [];
  const tint = (g: THREE.BufferGeometry, hex: number) => {
    const c = new THREE.Color(hex);
    const n = g.attributes.position.count;
    const colors = new Float32Array(n * 3);
    for (let v = 0; v < n; v++) { colors[v * 3] = c.r; colors[v * 3 + 1] = c.g; colors[v * 3 + 2] = c.b; }
    g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    out.push(g);
  };
  for (let i = 0; i < cols; i++) {
    const hex = i % 2 === 0 ? color : PALETTE.awningStripe;
    const cxw = x - w / 2 + colW * (i + 0.5);
    const slab = new THREE.BoxGeometry(colW, 0.26, 2.1);
    slab.rotateX(-0.34);
    slab.translate(cxw, y, z);
    tint(slab, hex);
    const valance = new THREE.BoxGeometry(colW, 0.5, 0.1);
    valance.translate(cxw, y - 0.5, z + 1.0);
    tint(valance, hex);
  }
  return out;
}

// Sign band + parapet rim trim for a restaurant box (warm strip + flat-roof cap).
function restaurantTrim(r: RestaurantSpec): THREE.BufferGeometry[] {
  const front = shopFront(r.d);
  const bandY = r.h - 1.1;
  return [
    tintedBox(r.w * 0.9, 0.9, 0.2, r.x, bandY, front + 0.1, PALETTE.signWarm), // sign band
    tintedBox(r.w, 0.5, r.d, r.x, r.h + 0.25, SHOP_Z, PALETTE.cornice),         // parapet rim
  ];
}

// The solid body box of a (closed) restaurant.
function restaurantBody(r: RestaurantSpec): THREE.BufferGeometry {
  return tintedBox(r.w, r.h, r.d, r.x, r.h / 2, SHOP_Z, PALETTE.houseBody);
}

function restaurantSignLit(r: RestaurantSpec): THREE.BufferGeometry {
  const front = shopFront(r.d);
  const g = new THREE.BoxGeometry(r.w * 0.55, 0.4, 0.12);
  g.translate(r.x, r.h - 1.1, front + 0.22);
  return g;
}

function restaurantStorefront(r: RestaurantSpec): THREE.BufferGeometry {
  const front = shopFront(r.d);
  const g = new THREE.BoxGeometry(r.w * 0.78, 2.4, 0.1);
  g.translate(r.x, 1.5, front + 0.06);
  return g;
}

function restaurantInteriorPanel(r: RestaurantSpec): THREE.BufferGeometry {
  const front = shopFront(r.d);
  const g = new THREE.BoxGeometry(r.w * 0.74, 2.2, 0.04);
  g.translate(r.x, 1.45, front + 0.035);
  return g;
}

function restaurantStorefrontFrame(r: RestaurantSpec): THREE.BufferGeometry[] {
  const front = shopFront(r.d);
  const z = front + 0.13;
  const gw = r.w * 0.82, gh = 2.6, t = 0.16;
  const out: THREE.BufferGeometry[] = [];
  const mk = (w: number, h: number, x: number, y: number) => {
    const g = new THREE.BoxGeometry(w, h, 0.12);
    g.translate(x, y, z);
    out.push(g);
  };
  mk(t, gh, r.x - gw / 2, 1.5);
  mk(t, gh, r.x + gw / 2, 1.5);
  mk(gw + t, t, r.x, 1.5 + gh / 2);
  mk(gw + t, t, r.x, 1.5 - gh / 2);
  return out;
}

function restaurantDoor(r: RestaurantSpec): THREE.BufferGeometry {
  const front = shopFront(r.d);
  const g = new THREE.BoxGeometry(1.2, 2.4, 0.14);
  g.translate(r.x + r.w * 0.28, 1.2, front + 0.08);
  return g;
}

// --- outdoor seating geometries (chunky NPC-scale table, chair, umbrella) -----
function tableGeo(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  parts.push(tintedBox(1.4, 0.16, 1.4, 0, 0.96, 0, PALETTE.benchWood));
  for (const sx of [-0.58, 0.58]) for (const sz of [-0.58, 0.58]) {
    parts.push(tintedBox(0.14, 0.96, 0.14, sx, 0.48, sz, PALETTE.benchWood));
  }
  parts.push(tintedBox(0.4, 0.06, 0.4, -0.28, 1.07, 0.12, 0xf3efe6));
  parts.push(tintedBox(0.18, 0.26, 0.18, 0.3, 1.17, -0.18, 0xd94f4f));
  parts.push(tintedBox(0.14, 0.2, 0.14, 0.08, 1.14, 0.28, 0xf2c14e));
  return mergeGeometries(parts);
}
function chairGeo(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const seat = new THREE.BoxGeometry(0.56, 0.13, 0.56); seat.translate(0, 0.55, 0);
  const back = new THREE.BoxGeometry(0.56, 0.62, 0.13); back.translate(0, 0.86, -0.22);
  parts.push(seat, back);
  for (const sx of [-0.23, 0.23]) for (const sz of [-0.23, 0.23]) {
    const leg = new THREE.BoxGeometry(0.1, 0.55, 0.1); leg.translate(sx, 0.275, sz);
    parts.push(leg);
  }
  return mergeGeometries(parts);
}
// A CHUNKY, player-scale wooden flower planter (wooden box, dark soil, dense
// green leaf clumps) topped with real multi-part flowers from the object
// library; merges to one instanced draw.
function planterBoxGeo(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const soilY = 0.66;
  parts.push(tintedBox(2.0, 0.72, 0.92, 0, 0.36, 0, PALETTE.benchWood));
  parts.push(tintedBox(2.04, 0.14, 0.96, 0, 0.72, 0, 0x6b4a2a));
  parts.push(tintedBox(1.8, 0.2, 0.74, 0, soilY, 0, 0x3a2a1c));
  const clumps: [number, number][] = [[-0.72, 0], [-0.32, 0.14], [0.06, -0.12], [0.46, 0.12], [0.8, -0.04]];
  for (const [cx, cz] of clumps) parts.push(tintedBox(0.5, 0.42, 0.5, cx, 0.92, cz, PALETTE.hedge));
  const blooms: [number, number, number, number][] = [
    [-0.62, -0.12, PALETTE.flowerRed, 0.34],
    [-0.22, 0.12, PALETTE.flowerWhite, 0.46],
    [0.16, -0.14, PALETTE.flowerYellow, 0.36],
    [0.54, 0.1, PALETTE.flowerRed, 0.44],
    [0.84, -0.06, PALETTE.flowerYellow, 0.32],
  ];
  for (const [bx, bz, hex, h] of blooms) {
    const f = makeFlower({ petalColor: hex, height: h, petalCount: 5 });
    f.translate(bx, 0.84, bz);
    parts.push(f);
  }
  return mergeTinted(parts);
}

// Planter placements: a row along the street-facing edge of the promenade and a
// row at the storefront bases, skipping the central entrance lane.
function planterPlacements(): Placement[] {
  const out: Placement[] = [];
  for (let i = 0; i < 7; i++) {
    const x = CX - 18 + i * 6;
    if (Math.abs(x - CX) < 4) continue; // leave the entrance / pickup lane clear
    out.push({ x, z: CZ + 9.2 });
  }
  for (const r of RESTAURANTS) {
    out.push({ x: r.x - r.w * 0.3, z: shopFront(r.d) + 1.4 });
    out.push({ x: r.x + r.w * 0.3, z: shopFront(r.d) + 1.4 });
  }
  return out;
}

// The street the promenade fronts onto: an E-W asphalt road, curbs, double
// yellow, a crosswalk aligned with the entrance lane, and a far sidewalk.
function makeStreetBlock(): THREE.Object3D {
  const g = new THREE.Group();
  g.name = "street";

  const atex = makeAsphaltTexture();
  atex.repeat.set(Math.max(1, Math.round(STREET_LEN / GRAIN_M)), Math.max(1, Math.round(ROAD_W / GRAIN_M)));
  const road = new THREE.Mesh(new THREE.BoxGeometry(STREET_LEN, 0.12, ROAD_W), new THREE.MeshStandardMaterial({ map: atex }));
  road.position.set(CX, 0.06, ROAD_Z);
  road.receiveShadow = true;
  g.add(road);

  for (const s of [-1, 1]) {
    const curb = new THREE.Mesh(new THREE.BoxGeometry(STREET_LEN, 0.16, 0.3), new THREE.MeshStandardMaterial({ color: PALETTE.curb }));
    curb.position.set(CX, 0.08, ROAD_Z + s * (ROAD_W / 2 + 0.15));
    curb.receiveShadow = true;
    g.add(curb);
  }

  const ylMat = new THREE.MeshStandardMaterial({ color: PALETTE.yellowLine });
  for (const s of [-1, 1]) {
    const yl = new THREE.Mesh(new THREE.BoxGeometry(STREET_LEN, 0.02, 0.16), ylMat);
    yl.position.set(CX, 0.13, ROAD_Z + s * 0.17);
    g.add(yl);
  }

  const bandMat = new THREE.MeshStandardMaterial({ color: PALETTE.crosswalk });
  const bands: THREE.BufferGeometry[] = [];
  for (let i = -3; i <= 3; i++) {
    const b = new THREE.BoxGeometry(0.45, 0.02, ROAD_W - 0.2);
    b.translate(CX + i * 0.85, 0.13, ROAD_Z);
    bands.push(b);
  }
  g.add(new THREE.Mesh(mergeGeometries(bands), bandMat));

  const paver = makeSidewalkTexture();
  paver.repeat.set(Math.max(1, Math.round(STREET_LEN / PAVER_SUPER_M)), Math.max(1, Math.round(FAR_WALK_D / PAVER_SUPER_M)));
  const farWalk = new THREE.Mesh(new THREE.BoxGeometry(STREET_LEN, 0.12, FAR_WALK_D), new THREE.MeshStandardMaterial({ map: paver }));
  farWalk.position.set(CX, 0.06, ROAD_Z + ROAD_W / 2 + 0.3 + FAR_WALK_D / 2);
  farWalk.receiveShadow = true;
  g.add(farWalk);

  return g;
}

// Near-curb parked car spots (shared with the patron obstacle set so NPCs don't
// walk through them). The taxi fills the gap east of the crosswalk.
const PARKED_CAR_Z = ROAD_Z - ROAD_W / 2 + 1.0;
export const PARKED_CAR_SPOTS: { x: number; z: number }[] = [
  { x: CX - 22, z: PARKED_CAR_Z },
  { x: CX - 13, z: PARKED_CAR_Z },
  { x: CX + 20, z: PARKED_CAR_Z },
];

function makeParkedCars(): THREE.Object3D {
  const g = new THREE.Group();
  const colors = [0xd94f4f, 0x4f7fd9, 0xc9c9c9];
  PARKED_CAR_SPOTS.forEach((spot, i) => {
    const car = makeCarBody({ bodyColor: colors[i % colors.length], withWheels: true });
    car.position.set(spot.x, 0.55, spot.z);
    car.rotation.y = Math.PI / 2;
    g.add(car);
  });
  return g;
}

// Infill buildings dressing the NORTH side of the block (a west flank + a taller
// background skyline row). Lifted to a shared const so the collider builder gives
// every infill box a solid footprint.
export interface InfillFootprint extends BuildingDef { rotY: number; }

// V1: the SOUTH side of the road is now the residential lot (player house + pocket
// park), so the old far-retail row (rfar-*) is gone. What remains is the NORTH-side
// dressing: a west closure box and a taller background row that reads as the distant
// city skyline behind the restaurant strip (matching the concept art).
export const INFILL_FOOTPRINTS: InfillFootprint[] = [
  // west flank (the east end is the phone shop)
  { id: "rflank-0", x: CX - 27, z: SHOP_Z, width: 8, depth: 8, height: 10, color: BUILDING_COLORS[2], rotY: 0 },
  // taller background row (skyline backdrop)
  { id: "rbg-0", x: CX - 14, z: SHOP_Z - 11, width: 10, depth: 8, height: 16, color: BUILDING_COLORS[3], rotY: 0 },
  { id: "rbg-1", x: CX + 2, z: SHOP_Z - 11, width: 9, depth: 8, height: 20, color: BUILDING_COLORS[3], rotY: 0 },
  { id: "rbg-2", x: CX + 16, z: SHOP_Z - 11, width: 10, depth: 8, height: 14, color: BUILDING_COLORS[7], rotY: 0 },
];

function makeInfillBuildings(): THREE.Object3D {
  const g = new THREE.Group();
  for (const f of INFILL_FOOTPRINTS) {
    const bld = makeBuilding(f);
    bld.rotation.y = f.rotY;
    g.add(bld);
  }
  return g;
}

// Static seated diners + standing pedestrians that make the patio feel occupied
// (scripted NPCs add the movement on top of this baseline).
const PATIO_PALETTES: HumanoidPalette[] = [
  { skin: 0xf0c9a0, shirt: 0xc0392b, pants: 0x274060 },
  { skin: 0xc98a5a, shirt: 0x2e8b57, pants: 0x2a2a30 },
  { skin: 0xe0b48a, shirt: 0x2980b9, pants: 0x303848 },
  { skin: 0xf0c9a0, shirt: 0xe0b23a, pants: 0x444450 },
];

function makePatioPeople(): THREE.Object3D {
  const g = new THREE.Group();
  const clusters = seatClusters();
  const castAll = (o: THREE.Object3D) => o.traverse((c) => {
    const m = c as THREE.Mesh; if (m.isMesh) m.castShadow = true;
  });

  // seated diners on the -x chair of two outer clusters, facing the table (+x).
  [0, clusters.length - 1].forEach((ci, i) => {
    const c = clusters[ci];
    const { group, limbs } = makeHumanoid(PATIO_PALETTES[i % PATIO_PALETTES.length]);
    group.position.set(c.x - 0.95, -0.4, c.z);
    group.rotation.y = Math.PI / 2;
    limbs.leftLeg.rotation.x = -1.5; limbs.rightLeg.rotation.x = -1.5;
    limbs.leftArm.rotation.x = -0.6; limbs.rightArm.rotation.x = -0.6;
    castAll(group);
    g.add(group);
  });

  const peds: [number, number, number, number][] = [
    [CX - 13, SEAT_Z + 1.5, Math.PI, 1],
    [CX + 12, SHOP_Z + 7, -0.8, 3],
  ];
  for (const [x, z, yaw, pi] of peds) {
    const { group } = makeHumanoid(PATIO_PALETTES[pi % PATIO_PALETTES.length]);
    group.position.set(x, 0, z);
    group.rotation.y = yaw;
    castAll(group);
    g.add(group);
  }
  return g;
}

export function makeRestaurantStreet(): THREE.Object3D {
  const group = new THREE.Group();
  group.name = "restaurantStreet";

  group.add(makeInfillBuildings());
  group.add(makeStreetBlock());
  group.add(makeParkedCars());

  // secondary locations + the player house (V1 location #1, south residential lot)
  group.add(makePhoneShop());
  group.add(makePocketPark());
  group.add(makeTaxiPickup());
  group.add(makePlayerHouse());

  group.add(trashcanInstances([
    { id: "rtc-1", kind: "trashcan", x: CX - 4, z: ROAD_Z - ROAD_W / 2 - 1.2 },
    { id: "rtc-2", kind: "trashcan", x: CX + 24, z: SEAT_Z },
  ]));

  group.add(makePatioPeople());
  group.add(makeDessertCart());

  // --- promenade slab ---
  const paver = makeSidewalkTexture();
  paver.repeat.set(
    Math.max(1, Math.round(PROM_W / PAVER_SUPER_M)),
    Math.max(1, Math.round(PROM_D / PAVER_SUPER_M)),
  );
  const promBase = new THREE.Mesh(
    new THREE.BoxGeometry(PROM_W, 0.12, PROM_D),
    new THREE.MeshStandardMaterial({ map: paver }),
  );
  promBase.position.set(CX, 0.06, CZ);
  promBase.receiveShadow = true;
  group.add(promBase);

  // --- restaurant buildings: the open one becomes a furnished walk-in shell;
  // the other two stay closed bodies. Glass / frame / sign-lit / awning merge
  // across all three; the closed pair add a warm interior panel + a door. ---
  const storefronts: THREE.BufferGeometry[] = [];
  const doors: THREE.BufferGeometry[] = [];
  const signLits: THREE.BufferGeometry[] = [];
  const awnings: THREE.BufferGeometry[] = [];
  const interiors: THREE.BufferGeometry[] = [];
  const frames: THREE.BufferGeometry[] = [];
  for (const r of RESTAURANTS) {
    if (r.open) {
      // furnished walk-in interior (restaurant or bakery; its structural shell
      // is named "...Building")
      group.add(r.bakery ? makeBakeryInterior() : makeRestaurantInterior());
      const trim = new THREE.Mesh(mergeGeometries(restaurantTrim(r)), new THREE.MeshStandardMaterial({ vertexColors: true }));
      trim.castShadow = true; trim.receiveShadow = true; trim.name = "restaurantTrim";
      group.add(trim);
    } else {
      const box = new THREE.Mesh(
        mergeGeometries([restaurantBody(r), ...restaurantTrim(r)]),
        new THREE.MeshStandardMaterial({ vertexColors: true }),
      );
      box.castShadow = true; box.receiveShadow = true; box.name = "restaurantBuilding";
      group.add(box);
      doors.push(restaurantDoor(r));
      interiors.push(restaurantInteriorPanel(r));
    }
    storefronts.push(restaurantStorefront(r));
    signLits.push(restaurantSignLit(r));
    frames.push(...restaurantStorefrontFrame(r));
    awnings.push(...awningStripes(r.x, r.h - 2.0, shopFront(r.d) + 0.7, r.w * 0.92, r.awning));
  }

  // warm-lit interior panels behind the closed restaurants' glass.
  const interior = new THREE.Mesh(
    mergeGeometries(interiors),
    new THREE.MeshStandardMaterial({ color: 0xf3c97a, emissive: 0xf0b85a, emissiveIntensity: 0.6 }),
  );
  interior.name = "interior";
  group.add(interior);

  const frame = new THREE.Mesh(
    mergeGeometries(frames),
    new THREE.MeshStandardMaterial({ color: PALETTE.frame }),
  );
  frame.castShadow = true;
  frame.name = "storefrontFrame";
  group.add(frame);

  const glass = new THREE.Mesh(
    mergeGeometries(storefronts),
    new THREE.MeshStandardMaterial({
      color: PALETTE.storefront, emissive: PALETTE.signLit, emissiveIntensity: 0.15,
      transparent: true, opacity: 0.62,
    }),
  );
  glass.name = "storefrontGlass";
  group.add(glass);

  const door = new THREE.Mesh(
    mergeGeometries(doors),
    new THREE.MeshStandardMaterial({ color: PALETTE.facadeDoor }),
  );
  door.name = "doors";
  group.add(door);

  const signLit = new THREE.Mesh(
    mergeGeometries(signLits),
    new THREE.MeshStandardMaterial({ color: PALETTE.signLit, emissive: PALETTE.signLit, emissiveIntensity: 0.6 }),
  );
  signLit.name = "signLit";
  group.add(signLit);

  const awning = new THREE.Mesh(
    mergeGeometries(awnings),
    new THREE.MeshStandardMaterial({ vertexColors: true }),
  );
  awning.castShadow = true;
  awning.name = "awnings";
  group.add(awning);

  // --- outdoor seating: tables + chairs + umbrellas instanced across clusters ---
  const clusters = seatClusters();
  const tablePl: Placement[] = clusters.map((c) => ({ x: c.x, z: c.z }));
  const umbrellaPl: Placement[] = clusters.map((c) => ({ x: c.x, z: c.z }));
  const chairPl: Placement[] = [];
  clusters.forEach((c, ci) => {
    CHAIR_OFFSETS.forEach(([dx, dz], oi) => {
      const rotationY = (oi * Math.PI) / 2;
      chairPl.push({ x: c.x + dx, z: c.z + dz, rotationY, scale: 1 - (ci % 2) * 0.04 });
    });
  });
  group.add(makeInstanced(tableGeo(), new THREE.MeshStandardMaterial({ vertexColors: true }), tablePl, 0));
  group.add(makeInstanced(chairGeo(), new THREE.MeshStandardMaterial({ color: PALETTE.benchWood }), chairPl, 0));
  group.add(makeInstanced(makeUmbrella(), new THREE.MeshStandardMaterial({ vertexColors: true }), umbrellaPl, 0));

  group.add(makeInstanced(planterBoxGeo(), new THREE.MeshStandardMaterial({ vertexColors: true }), planterPlacements(), 0));

  const lamps: PropDef[] = [
    { id: "rl-1", kind: "streetlight", x: CX - 21, z: CZ + 9 },
    { id: "rl-2", kind: "streetlight", x: CX - 7, z: CZ + 10 },
    { id: "rl-3", kind: "streetlight", x: CX + 7, z: CZ + 10 },
    { id: "rl-4", kind: "streetlight", x: CX + 21, z: CZ + 9 },
  ];
  for (const l of lamps) group.add(makeStreetLight(l));

  group.add(treeInstances([
    { id: "rt-2", kind: "tree", x: CX + 24, z: CZ + 6 },
  ]));

  // --- menu board + delivery/pickup marker stand at the RESTAURANT anchor ---
  const stand = new THREE.Group();
  stand.position.set(RESTAURANT.x, 0, RESTAURANT.z);
  const post = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 1.8, 0.22),
    new THREE.MeshStandardMaterial({ color: PALETTE.lampPole }),
  );
  post.position.y = 0.9;
  post.castShadow = true;
  stand.add(post);
  const board = new THREE.Mesh(
    new THREE.BoxGeometry(1.4, 1.0, 0.12),
    new THREE.MeshStandardMaterial({ color: PALETTE.signWarm }),
  );
  board.position.y = 1.9;
  board.castShadow = true;
  stand.add(board);
  const marker = new THREE.Mesh(
    new THREE.BoxGeometry(0.6, 0.6, 0.6),
    new THREE.MeshStandardMaterial({ color: PALETTE.signLit, emissive: PALETTE.signLit, emissiveIntensity: 0.8 }),
  );
  marker.position.y = 2.7;
  stand.add(marker);
  stand.name = "pickupStand";
  group.add(stand);

  return group;
}
