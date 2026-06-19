// rishon3d/src/world/kits.ts
//
// Reusable prop-group kit factories. Each kit composes existing building blocks
// (objects/, props.ts, etc.) and returns:
//   object    — a THREE.Object3D (Group or Mesh) ready to add to a scene
//   obstacles — Rect[] for NPC collision (EXCLUDES seating per Rule 3)
//   seats     — optional seat footprints for seating kits
//
// Rules:
//  - Seating kits return `seats` but do NOT include chairs/benches in `obstacles`
//  - makeCrosswalkKit returns EMPTY obstacles (flat paint)
//  - All geometry is deterministic — no Math.random()
//  - Kits do NOT mutate global state

import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { Rect } from "../game/wander";
import { rectAround } from "../game/wander";
import { makePlanterMesh } from "./objects/planter";
import { makeTrafficLightMesh } from "./objects/trafficLight";
import { makeStopSignMesh } from "./objects/stopSign";
import { makeBikeRackMesh } from "./objects/bikeRack";
import { makeFountainMesh } from "./objects/fountain";
import { makeKioskMesh } from "./objects/kiosk";
import { makeUmbrellaMesh } from "./objects/umbrella";
import { makeBenchMesh } from "./props";
import { makeCarBody } from "../entities/carMesh";
import { tintedBox, mergeTinted, tintedMesh } from "./objects/voxel";
import { PALETTE } from "./palette";

export interface KitResult {
  object: THREE.Object3D;
  obstacles: Rect[];
  seats?: { x: number; z: number; faceYaw: number }[];
}

// ============================================================
// Internal geometry helpers (self-contained, no getGeometry cache)
// ============================================================

function tableGeo(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  // Tabletop
  parts.push(tintedBox(1.4, 0.16, 1.4, 0, 0.96, 0, PALETTE.benchWood));
  // Four legs
  for (const sx of [-0.58, 0.58]) {
    for (const sz of [-0.58, 0.58]) {
      parts.push(tintedBox(0.14, 0.96, 0.14, sx, 0.48, sz, PALETTE.benchWood));
    }
  }
  return mergeTinted(parts);
}

function chairGeo(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const seat = new THREE.BoxGeometry(0.56, 0.13, 0.56);
  seat.translate(0, 0.55, 0);
  const back = new THREE.BoxGeometry(0.56, 0.62, 0.13);
  back.translate(0, 0.86, -0.22);
  parts.push(seat, back);
  for (const sx of [-0.23, 0.23]) {
    for (const sz of [-0.23, 0.23]) {
      const leg = new THREE.BoxGeometry(0.1, 0.55, 0.1);
      leg.translate(sx, 0.275, sz);
      parts.push(leg);
    }
  }
  return mergeGeometries(parts);
}

function trashcanGeo(): THREE.BufferGeometry {
  const body = new THREE.BoxGeometry(0.5, 0.8, 0.5);
  body.translate(0, 0.4, 0);
  const lid = new THREE.BoxGeometry(0.58, 0.12, 0.58);
  lid.translate(0, 0.85, 0);
  return mergeGeometries([body, lid]);
}

function streetLampGeo(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  parts.push(tintedBox(0.08, 3.0, 0.08, 0, 1.5, 0, PALETTE.lampPole));
  parts.push(tintedBox(0.34, 0.34, 0.34, 0, 3.1, 0, PALETTE.lantern));
  return mergeTinted(parts);
}

function picnicTableGeo(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  // Tabletop
  parts.push(tintedBox(1.8, 0.12, 0.7, 0, 0.82, 0, PALETTE.benchWood));
  // Two trestle legs (X-cross on each end)
  for (const ex of [-0.75, 0.75]) {
    parts.push(tintedBox(0.1, 0.82, 0.7, ex, 0.41, 0, PALETTE.benchWood));
  }
  // Attached benches (lower, on each side)
  for (const bz of [-0.7, 0.7]) {
    parts.push(tintedBox(1.8, 0.1, 0.4, 0, 0.5, bz, 0x8B6914));
  }
  return mergeTinted(parts);
}

function shelfUnit(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  // Back panel
  parts.push(tintedBox(1.6, 1.8, 0.1, 0, 0.9, -0.2, 0x888888));
  // Three shelves
  for (let i = 0; i < 3; i++) {
    parts.push(tintedBox(1.6, 0.06, 0.4, 0, 0.3 + i * 0.6, 0, 0xaaaaaa));
  }
  // Side panels
  for (const sx of [-0.8, 0.8]) {
    parts.push(tintedBox(0.06, 1.8, 0.4, sx, 0.9, 0, 0x888888));
  }
  return mergeTinted(parts);
}

function counterGeo(w: number): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  // Counter body
  parts.push(tintedBox(w, 0.85, 0.55, 0, 0.425, 0, 0xdde0e4));
  // Counter top slab
  parts.push(tintedBox(w + 0.04, 0.06, 0.59, 0, 0.88, 0, 0xc8cdd4));
  return mergeTinted(parts);
}

// ============================================================
// Kit exports
// ============================================================

/**
 * makePatioSet — table + 4 chairs + optional umbrella.
 * Chairs and table are NOT in obstacles (seating target).
 * Returns seats for each chair position.
 */
export function makePatioSet(cfg: {
  x: number;
  z: number;
  umbrella?: boolean;
}): KitResult {
  const { x, z } = cfg;
  const withUmbrella = cfg.umbrella ?? true;
  const group = new THREE.Group();
  group.position.set(x, 0, z);

  // Table
  const table = tintedMesh(tableGeo());
  group.add(table);

  // Chair offsets: N/S/E/W at 0.85m from center
  const CHAIR_DIST = 0.9;
  const chairOffsets: [number, number, number][] = [
    [0, -CHAIR_DIST, 0],            // north (facing south, yaw = 0)
    [0, CHAIR_DIST, Math.PI],       // south (facing north)
    [-CHAIR_DIST, 0, Math.PI / 2],  // west (facing east)
    [CHAIR_DIST, 0, -Math.PI / 2],  // east (facing west)
  ];

  for (const [dx, dz, rotY] of chairOffsets) {
    const chair = new THREE.Mesh(
      chairGeo(),
      new THREE.MeshStandardMaterial({ color: PALETTE.benchWood }),
    );
    chair.position.set(dx, 0, dz);
    chair.rotation.y = rotY;
    group.add(chair);
  }

  // Umbrella
  if (withUmbrella) {
    const umbrella = makeUmbrellaMesh();
    group.add(umbrella);
  }

  // Seats: chair world positions
  const seats = chairOffsets.map(([dx, dz, rotY]) => ({
    x: x + dx,
    z: z + dz,
    faceYaw: rotY,
  }));

  // No obstacles (seating excluded per Rule 3)
  return { object: group, obstacles: [], seats };
}

/**
 * makePlanterRow — N planters spaced along x or z axis.
 */
export function makePlanterRow(cfg: {
  x: number;
  z: number;
  count: number;
  dx: number;
  axis?: "x" | "z";
}): KitResult {
  const { x, z, count, dx } = cfg;
  const axis = cfg.axis ?? "x";
  const group = new THREE.Group();
  const obstacles: Rect[] = [];

  for (let i = 0; i < count; i++) {
    const px = axis === "x" ? x + i * dx : x;
    const pz = axis === "z" ? z + i * dx : z;
    const planter = makePlanterMesh();
    planter.position.set(px, 0, pz);
    group.add(planter);
    obstacles.push(rectAround(px, pz, 1.2, 0.45, 0.1));
  }

  return { object: group, obstacles };
}

/**
 * makeBenchBinLamp — a bench (seat), a trashcan bin, and a street lamp.
 * Bench is a seat (not an obstacle); bin and lamp are obstacles.
 */
export function makeBenchBinLamp(cfg: {
  x: number;
  z: number;
  faceYaw?: number;
}): KitResult {
  const { x, z } = cfg;
  const faceYaw = cfg.faceYaw ?? 0;
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.rotation.y = faceYaw;

  // Bench at origin (local)
  const bench = makeBenchMesh(0, 0, 0);
  group.add(bench);

  // Bin at +1.4m along local x
  const bin = new THREE.Mesh(
    trashcanGeo(),
    new THREE.MeshStandardMaterial({ color: PALETTE.trashCan }),
  );
  bin.position.set(1.4, 0, 0);
  group.add(bin);

  // Lamp at -1.4m along local x
  const lamp = tintedMesh(streetLampGeo());
  lamp.position.set(-1.4, 0, 0);
  group.add(lamp);

  // Seat: bench center in world space (rough — bench faces local +z)
  const cos = Math.cos(faceYaw);
  const sin = Math.sin(faceYaw);
  const seats = [{ x, z, faceYaw }];

  // Obstacles: bin + lamp (NOT the bench)
  const binWorld = { x: x + cos * 1.4, z: z - sin * 1.4 };
  const lampWorld = { x: x - cos * 1.4, z: z + sin * 1.4 };
  const obstacles: Rect[] = [
    rectAround(binWorld.x, binWorld.z, 0.5, 0.5, 0.1),
    rectAround(lampWorld.x, lampWorld.z, 0.2, 0.2, 0.1),
  ];

  return { object: group, obstacles, seats };
}

/**
 * makeTaxiKit — a yellow taxi car with a waiting-zone obstacle.
 */
export function makeTaxiKit(cfg: { x: number; z: number }): KitResult {
  const { x, z } = cfg;
  const group = new THREE.Group();

  const car = makeCarBody({ bodyColor: 0xf5c518, withWheels: true, variant: "taxi" });
  car.position.set(x, 0.55, z);
  car.rotation.y = Math.PI / 2;
  group.add(car);

  // Car footprint obstacle (~4m long, ~2m wide)
  const obstacles: Rect[] = [rectAround(x, z, 2.0, 4.0, 0.2)];

  return { object: group, obstacles };
}

/**
 * makeCrosswalkKit — flat painted stripes. NO obstacles (pedestrians walk here).
 */
export function makeCrosswalkKit(cfg: {
  x: number;
  z: number;
  axis: "x" | "z";
  width: number;
  bands?: number;
}): KitResult {
  const { x, z, axis, width } = cfg;
  const bands = cfg.bands ?? 7;
  const bandW = 0.45;
  const roadW = 6.0;

  const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < bands; i++) {
    const offset = -width / 2 + (i + 0.5) * (width / bands);
    if (axis === "x") {
      const b = new THREE.BoxGeometry(bandW, 0.02, roadW);
      b.translate(x + offset, 0.13, z);
      parts.push(b);
    } else {
      const b = new THREE.BoxGeometry(roadW, 0.02, bandW);
      b.translate(x, 0.13, z + offset);
      parts.push(b);
    }
  }

  const mat = new THREE.MeshStandardMaterial({ color: PALETTE.crosswalk ?? 0xffffff });
  const mesh = new THREE.Mesh(mergeGeometries(parts), mat);
  mesh.receiveShadow = true;

  return { object: mesh, obstacles: [] };
}

/**
 * makeTrafficLightKit — traffic light pole + housing at world position.
 */
export function makeTrafficLightKit(cfg: {
  x: number;
  z: number;
  faceYaw?: number;
}): KitResult {
  const { x, z } = cfg;
  const faceYaw = cfg.faceYaw ?? 0;

  const group = makeTrafficLightMesh();
  group.position.set(x, 0, z);
  group.rotation.y = faceYaw;

  const obstacles: Rect[] = [rectAround(x, z, 0.22, 0.22, 0.1)];

  return { object: group, obstacles };
}

/**
 * makeStopSignKit — stop sign pole at world position.
 */
export function makeStopSignKit(cfg: {
  x: number;
  z: number;
  faceYaw?: number;
}): KitResult {
  const { x, z } = cfg;
  const faceYaw = cfg.faceYaw ?? 0;

  const mesh = makeStopSignMesh();
  mesh.position.set(x, 0, z);
  mesh.rotation.y = faceYaw;

  const obstacles: Rect[] = [rectAround(x, z, 0.2, 0.2, 0.1)];

  return { object: mesh, obstacles };
}

/**
 * makePicnicKit — picnic table with two bench seats on each long side.
 * Table body may be an obstacle; bench seats are returned as seat targets.
 */
export function makePicnicKit(cfg: { x: number; z: number }): KitResult {
  const { x, z } = cfg;
  const group = new THREE.Group();

  const picnicTable = new THREE.Mesh(
    picnicTableGeo(),
    new THREE.MeshStandardMaterial({ vertexColors: true }),
  );
  picnicTable.position.set(x, 0, z);
  group.add(picnicTable);

  // Seat positions: 2 per long side (z ±0.7m), offset along x (±0.5m)
  const BENCH_Z = 0.7;
  const seats: { x: number; z: number; faceYaw: number }[] = [
    { x: x - 0.5, z: z - BENCH_Z, faceYaw: 0 },
    { x: x + 0.5, z: z - BENCH_Z, faceYaw: 0 },
    { x: x - 0.5, z: z + BENCH_Z, faceYaw: Math.PI },
    { x: x + 0.5, z: z + BENCH_Z, faceYaw: Math.PI },
  ];

  // Obstacle: table body only (not bench seats)
  const obstacles: Rect[] = [rectAround(x, z, 1.8, 0.7, 0.1)];

  return { object: group, obstacles, seats };
}

/**
 * makeFountainKit — fountain at world position, with collision footprint.
 */
export function makeFountainKit(cfg: { x: number; z: number; r?: number }): KitResult {
  const { x, z } = cfg;
  const r = cfg.r ?? 1.1;

  const mesh = makeFountainMesh({ r });
  mesh.position.set(x, 0, z);

  const obstacles: Rect[] = [rectAround(x, z, r * 2, r * 2, 0.2)];

  return { object: mesh, obstacles };
}

/**
 * makeOfficePlaza — paving slab + planters around edges + bike rack + kiosk.
 */
export function makeOfficePlaza(cfg: {
  x: number;
  z: number;
  w: number;
  d: number;
}): KitResult {
  const { x, z, w, d } = cfg;
  const group = new THREE.Group();
  const obstacles: Rect[] = [];

  // Paving slab
  const paving = new THREE.Mesh(
    new THREE.BoxGeometry(w, 0.1, d),
    new THREE.MeshStandardMaterial({ color: 0xc8ccd4 }),
  );
  paving.position.set(x, 0.05, z);
  paving.receiveShadow = true;
  group.add(paving);

  // Planters: corners and mid-edges
  const planterPositions: [number, number][] = [
    [x - w / 2 + 1.0, z - d / 2 + 0.5],
    [x + w / 2 - 1.0, z - d / 2 + 0.5],
    [x - w / 2 + 1.0, z + d / 2 - 0.5],
    [x + w / 2 - 1.0, z + d / 2 - 0.5],
  ];
  for (const [px, pz] of planterPositions) {
    const p = makePlanterMesh();
    p.position.set(px, 0, pz);
    group.add(p);
    obstacles.push(rectAround(px, pz, 1.2, 0.45, 0.1));
  }

  // Bike rack at front-center
  const rackX = x;
  const rackZ = z - d / 2 + 1.0;
  const rack = makeBikeRackMesh();
  rack.position.set(rackX, 0, rackZ);
  group.add(rack);
  obstacles.push(rectAround(rackX, rackZ, 2.2, 0.55, 0.15));

  // Kiosk at back-center
  const kioskX = x;
  const kioskZ = z + d / 2 - 1.5;
  const kiosk = makeKioskMesh();
  kiosk.position.set(kioskX, 0, kioskZ);
  group.add(kiosk);
  obstacles.push(rectAround(kioskX, kioskZ, 2.4, 1.6, 0.2));

  return { object: group, obstacles };
}

/**
 * makeBikeRackKit — bike rack with collision footprint.
 */
export function makeBikeRackKit(cfg: { x: number; z: number }): KitResult {
  const { x, z } = cfg;

  const mesh = makeBikeRackMesh();
  mesh.position.set(x, 0, z);

  const obstacles: Rect[] = [rectAround(x, z, 2.2, 0.55, 0.15)];

  return { object: mesh, obstacles };
}

/**
 * makeDisplayShelf — a wall-mounted shelf unit for displaying items.
 */
export function makeDisplayShelf(cfg: {
  x: number;
  z: number;
  faceYaw?: number;
  items?: string;
}): KitResult {
  const { x, z } = cfg;
  const faceYaw = cfg.faceYaw ?? 0;

  const mesh = tintedMesh(shelfUnit());
  mesh.position.set(x, 0, z);
  mesh.rotation.y = faceYaw;

  // Shelf is typically wall-mounted — obstacle for its depth footprint
  const obstacles: Rect[] = [rectAround(x, z, 1.6, 0.4, 0.1)];

  return { object: mesh, obstacles };
}

/**
 * makeCounterKit — a service counter of given width.
 */
export function makeCounterKit(cfg: {
  x: number;
  z: number;
  w: number;
  faceYaw?: number;
}): KitResult {
  const { x, z, w } = cfg;
  const faceYaw = cfg.faceYaw ?? 0;

  const mesh = tintedMesh(counterGeo(w));
  mesh.position.set(x, 0, z);
  mesh.rotation.y = faceYaw;

  const obstacles: Rect[] = [rectAround(x, z, w, 0.55, 0.1)];

  return { object: mesh, obstacles };
}
