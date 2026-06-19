// rishon3d/src/world/surfaceFill.ts
//
// Deterministic surface-fill system. Given a rectangular region and a fill kind,
// scatters the appropriate props across it while respecting an optional list of
// avoid rects. Uses mulberry32(seed) for all randomness so output is reproducible
// and unit-testable with no Math.random / Date.now calls.
//
// grass — flowers (no obstacle), bushes and trees (obstacle rects returned).
// plaza — merged paver tiles (no obstacle) + planters and bins (obstacle rects returned).
//
// The function returns { object, obstacles }. It does NOT add itself to any scene.

import * as THREE from "three";
import { mulberry32 } from "./rng";
import { rectsOverlap } from "./roadClear";
import { rectAround, type Rect } from "../game/wander";
import { makeFlower } from "./objects/flower";
import { makePlanter } from "./objects/planter";
import { tintedBox, mergeTinted, voxelMaterial } from "./objects/voxel";
import { makeInstanced, type Placement } from "./InstancedProps";
import { treeInstances, bushInstances } from "./props";
import { makeSidewalkTexture, PAVER_SUPER_M } from "./roads";
import { PALETTE } from "./palette";
import type { PropDef } from "./rishonMap";

export interface FillRegion {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

// Footprint sizes for chunky props used in obstacle generation.
const TREE_HALF   = 0.8;   // half-size of a tree footprint (1.6 x 1.6 box)
const BUSH_HALF   = 0.55;  // half-size of a bush footprint
const PLANTER_HALF_W = 0.75; // makePlanter default w=1.2 / 2 + margin
const PLANTER_HALF_D = 0.35; // makePlanter default d=0.45 / 2 + margin
const BIN_HALF    = 0.35;  // trashcan footprint half-size

// --- helpers ---

function regionWidth(r: FillRegion): number  { return r.maxX - r.minX; }
function regionDepth(r: FillRegion): number  { return r.maxZ - r.minZ; }
function regionArea(r: FillRegion): number   { return regionWidth(r) * regionDepth(r); }

/** Pick a random x within the region using the supplied PRNG. */
function randX(r: FillRegion, rng: () => number): number {
  return r.minX + rng() * regionWidth(r);
}
/** Pick a random z within the region using the supplied PRNG. */
function randZ(r: FillRegion, rng: () => number): number {
  return r.minZ + rng() * regionDepth(r);
}

/** True if the candidate rect overlaps any of the avoid rects. */
function isBlocked(candidate: Rect, avoid: Rect[]): boolean {
  return avoid.some((a) => rectsOverlap(candidate, a));
}

// ---- paver tile slab for plaza fill ----
function paverTilesMerged(region: FillRegion): THREE.Mesh {
  const w = regionWidth(region);
  const d = regionDepth(region);
  const cx = (region.minX + region.maxX) / 2;
  const cz = (region.minZ + region.maxZ) / 2;
  const tex = makeSidewalkTexture();
  tex.repeat.set(
    Math.max(1, Math.round(w / PAVER_SUPER_M)),
    Math.max(1, Math.round(d / PAVER_SUPER_M)),
  );
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(w, 0.1, d),
    new THREE.MeshStandardMaterial({ map: tex }),
  );
  mesh.position.set(cx, 0.05, cz);
  mesh.receiveShadow = true;
  mesh.name = "surfacePavers";
  return mesh;
}

// ---- bin (trashcan) geometry built inline to avoid a props import cycle ----
function binGeo(): THREE.BufferGeometry {
  const body = new THREE.BoxGeometry(0.5, 0.8, 0.5);
  body.translate(0, 0.4, 0);
  const lid = new THREE.BoxGeometry(0.58, 0.12, 0.58);
  lid.translate(0, 0.85, 0);
  // merge with tintedBox so both parts carry vertex colors
  const parts = [
    tintedBox(0.5, 0.8, 0.5, 0, 0.4, 0, PALETTE.trashCan),
    tintedBox(0.58, 0.12, 0.58, 0, 0.85, 0, PALETTE.trashCan),
  ];
  body.dispose();
  lid.dispose();
  return mergeTinted(parts);
}

// ---- grass fill ----

function fillGrass(
  region: FillRegion,
  rng: () => number,
  avoid: Rect[],
): { object: THREE.Object3D; obstacles: Rect[] } {
  const group = new THREE.Group();
  group.name = "surfaceGrass";
  const obstacles: Rect[] = [];

  const area = regionArea(region);
  if (area <= 0) return { object: group, obstacles };

  // ---- flowers (no obstacles) — scattered individually, merged into one mesh ----
  const flowerCount = Math.max(0, Math.floor(area / 30));  // ~1 per 30 sq-m
  const flowerParts: THREE.BufferGeometry[] = [];

  for (let i = 0; i < flowerCount; i++) {
    const x = randX(region, rng);
    const z = randZ(region, rng);
    const petalIdx = Math.floor(rng() * 5);
    const PETAL_COLORS = [0xe05050, 0xe8d040, 0xe06090, 0xf0f0f0, 0x9060d0];
    const f = makeFlower({ petalColor: PETAL_COLORS[petalIdx], height: 0.35 + rng() * 0.25 });
    f.translate(x, 0, z);
    flowerParts.push(f);
  }

  if (flowerParts.length > 0) {
    const flowerMesh = new THREE.Mesh(mergeTinted(flowerParts), voxelMaterial());
    flowerMesh.castShadow = true;
    flowerMesh.name = "surfaceFlowers";
    group.add(flowerMesh);
  }

  // ---- bushes (obstacle) ----
  const bushCount = Math.max(0, Math.floor(area / 80));
  const bushProps: PropDef[] = [];

  for (let i = 0; i < bushCount; i++) {
    const x = randX(region, rng);
    const z = randZ(region, rng);
    const footprint = rectAround(x, z, BUSH_HALF * 2, BUSH_HALF * 2, 0.1);
    if (isBlocked(footprint, avoid) || isBlocked(footprint, obstacles)) continue;
    bushProps.push({ id: `sf-bush-${i}`, kind: "bush", x, z });
    obstacles.push(footprint);
  }

  if (bushProps.length > 0) {
    group.add(bushInstances(bushProps));
  }

  // ---- trees (obstacle) ----
  const treeCount = Math.max(0, Math.floor(area / 150));
  const treeProps: PropDef[] = [];

  for (let i = 0; i < treeCount; i++) {
    const x = randX(region, rng);
    const z = randZ(region, rng);
    const footprint = rectAround(x, z, TREE_HALF * 2, TREE_HALF * 2, 0.2);
    if (isBlocked(footprint, avoid) || isBlocked(footprint, obstacles)) continue;
    treeProps.push({ id: `sf-tree-${i}`, kind: "tree", x, z });
    obstacles.push(footprint);
  }

  if (treeProps.length > 0) {
    group.add(treeInstances(treeProps));
  }

  return { object: group, obstacles };
}

// ---- plaza fill ----

function fillPlaza(
  region: FillRegion,
  rng: () => number,
  avoid: Rect[],
): { object: THREE.Object3D; obstacles: Rect[] } {
  const group = new THREE.Group();
  group.name = "surfacePlaza";
  const obstacles: Rect[] = [];

  const area = regionArea(region);
  if (area <= 0) return { object: group, obstacles };

  // ---- paver tile slab (no obstacle) ----
  group.add(paverTilesMerged(region));

  // ---- planters (obstacle) ----
  const planterCount = Math.max(0, Math.floor(area / 60));
  const planterParts: THREE.BufferGeometry[] = [];

  for (let i = 0; i < planterCount; i++) {
    const x = randX(region, rng);
    const z = randZ(region, rng);
    const footprint = rectAround(x, z, PLANTER_HALF_W * 2, PLANTER_HALF_D * 2, 0.15);
    if (isBlocked(footprint, avoid) || isBlocked(footprint, obstacles)) continue;
    const geo = makePlanter({ withFlowers: true });
    geo.translate(x, 0, z);
    planterParts.push(geo);
    obstacles.push(footprint);
  }

  if (planterParts.length > 0) {
    const planterMesh = new THREE.Mesh(mergeTinted(planterParts), voxelMaterial());
    planterMesh.castShadow = true;
    planterMesh.name = "surfacePlanters";
    group.add(planterMesh);
  }

  // ---- bins (obstacle) ----
  const binCount = Math.max(0, Math.floor(area / 90));
  const binPlacements: Placement[] = [];

  for (let i = 0; i < binCount; i++) {
    const x = randX(region, rng);
    const z = randZ(region, rng);
    const footprint = rectAround(x, z, BIN_HALF * 2, BIN_HALF * 2, 0.1);
    if (isBlocked(footprint, avoid) || isBlocked(footprint, obstacles)) continue;
    binPlacements.push({ x, z, rotationY: rng() * Math.PI * 2 });
    obstacles.push(footprint);
  }

  if (binPlacements.length > 0) {
    const binMesh = makeInstanced(
      binGeo(),
      new THREE.MeshStandardMaterial({ vertexColors: true }),
      binPlacements,
      0,
    );
    binMesh.name = "surfaceBins";
    group.add(binMesh);
  }

  return { object: group, obstacles };
}

// ---- public API ----

/**
 * Deterministically scatter surface detail over `region`.
 *
 * @param region   Axis-aligned bounding rect of the area to fill.
 * @param kind     "grass" — flowers + bushes + trees.
 *                 "plaza" — paver tiles + planters + bins.
 * @param seed     Seed for the mulberry32 PRNG; same seed → same output.
 * @param avoid    Optional list of rects that chunky props must not overlap.
 *                 Flowers and paver tiles are exempt (they are not obstacles).
 * @returns        { object } ready to add to a scene; { obstacles } footprint
 *                 rects for chunky props only (not flowers or pavers).
 */
export function fillSurface(
  region: FillRegion,
  kind: "grass" | "plaza",
  seed: number,
  avoid?: Rect[],
): { object: THREE.Object3D; obstacles: Rect[] } {
  const rng = mulberry32(seed);
  const safeAvoid = avoid ?? [];
  if (kind === "grass") return fillGrass(region, rng, safeAvoid);
  return fillPlaza(region, rng, safeAvoid);
}
