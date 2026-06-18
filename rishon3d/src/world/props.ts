import * as THREE from "three";
import type { PropDef } from "./rishonMap";
import { getGeometry, getMaterial } from "./assets";
import { makeInstanced, type Placement } from "./InstancedProps";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { PALETTE } from "./palette";

// --- shared geometries (vertical offset baked in so one transform places the prop) ---
function trunkGeo(): THREE.BufferGeometry {
  return getGeometry("trunk", () => {
    const g = new THREE.BoxGeometry(0.5, 1.4, 0.5);
    g.translate(0, 0.7, 0);
    return g;
  });
}

// Conifer: a stepped pyramid of green cubes (wide bottom, narrow top).
export function coniferCanopyBoxes(): { y: number; s: number }[] {
  return [
    { y: 1.7, s: 2.2 },
    { y: 2.5, s: 1.6 },
    { y: 3.2, s: 1.0 },
  ];
}
// Two-tone green ramp by height: deep green low/inner, bright green high/outer,
// so a canopy reads as a lit crown over a shaded base instead of a flat blob.
function greenRamp(y: number, minY: number, maxY: number): number {
  const t = maxY > minY ? (y - minY) / (maxY - minY) : 1;
  return new THREE.Color(PALETTE.leafDeep).lerp(new THREE.Color(PALETTE.leaf), 0.2 + 0.8 * t).getHex();
}

function foliageGeo(): THREE.BufferGeometry {
  return getGeometry("foliageVoxel", () => {
    const boxes = coniferCanopyBoxes();
    const ys = boxes.map((b) => b.y);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    return mergeGeometries(boxes.map(({ y, s }) => tintedBox(s, 0.9, s, 0, y, 0, greenRamp(y, minY, maxY))));
  });
}

// Deciduous: a chunky cluster of cubes. Tuples are [x, y, z, size].
// Enlarged + raised to read as the bold, lush canopies in the target art
// (design-example-city-walk / park-plaza): one big core cube wrapped by fat
// lobes so the silhouette is a chunky bright-green blob, not a thin bush.
export function deciduousCanopyBoxes(): [number, number, number, number][] {
  return [
    [0, 2.9, 0, 2.8],
    [1.4, 3.0, 0.4, 1.7],
    [-1.3, 2.9, -0.5, 1.8],
    [0.3, 3.9, -0.3, 1.9],
    [-0.4, 2.4, 1.1, 1.5],
    [0.6, 2.4, -1.1, 1.5],
  ];
}
function deciduousGeo(): THREE.BufferGeometry {
  return getGeometry("foliageDecidVoxel", () => {
    const boxes = deciduousCanopyBoxes();
    const ys = boxes.map((b) => b[1]);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    return mergeGeometries(boxes.map(([x, y, z, s]) => tintedBox(s, s, s, x, y, z, greenRamp(y, minY, maxY))));
  });
}
function bushGeo(): THREE.BufferGeometry {
  return getGeometry("bushVoxel", () => {
    const specs: [number, number, number, number][] = [
      [0, 0.45, 0, 0.9],
      [0.5, 0.4, 0.2, 0.6],
      [-0.45, 0.4, -0.2, 0.6],
    ];
    const boxes = specs.map(([x, y, z, s]) => {
      const b = new THREE.BoxGeometry(s, s, s);
      b.translate(x, y, z);
      return b;
    });
    return mergeGeometries(boxes);
  });
}
const trunkMat = () => getMaterial("trunkMat", () => new THREE.MeshStandardMaterial({ color: PALETTE.trunk }));
const bushMat = () => getMaterial("bushMat", () => new THREE.MeshStandardMaterial({ color: PALETTE.bush }));

function benchGeo(): THREE.BufferGeometry {
  return getGeometry("bench", () => {
    const seat = new THREE.BoxGeometry(1.6, 0.12, 0.5); seat.translate(0, 0.5, 0);
    const back = new THREE.BoxGeometry(1.6, 0.5, 0.1); back.translate(0, 0.78, -0.2);
    const legL = new THREE.BoxGeometry(0.12, 0.5, 0.5); legL.translate(-0.7, 0.25, 0);
    const legR = new THREE.BoxGeometry(0.12, 0.5, 0.5); legR.translate(0.7, 0.25, 0);
    return mergeGeometries([seat, back, legL, legR]);
  });
}
const benchMat = () => getMaterial("benchMat", () => new THREE.MeshStandardMaterial({ color: PALETTE.benchWood }));

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
const vertexColorMat = (key: string) =>
  getMaterial(key, () => new THREE.MeshStandardMaterial({ vertexColors: true }));

// --- flowerbed: a low green base with a few bright dot-tops. The base is a
// single green box (one draw call); the blossom dots merge into one vertex-
// colored geometry (a second draw call) so the bed is 2 draw calls total. ---
function flowerBaseGeo(): THREE.BufferGeometry {
  return getGeometry("flowerBase", () => {
    const g = new THREE.BoxGeometry(1.3, 0.3, 1.3);
    g.translate(0, 0.15, 0);
    return g;
  });
}
// Blossom dot positions and their bright colors (deterministic, fixed layout).
// A denser scatter so the bed reads as many individual flowers, not a few dots.
export function flowerDots(): { x: number; z: number; hex: number }[] {
  return [
    { x: -0.4, z: -0.4, hex: PALETTE.flowerYellow },
    { x: 0.05, z: -0.42, hex: PALETTE.flowerRed },
    { x: 0.42, z: -0.3, hex: PALETTE.flowerWhite },
    { x: -0.42, z: 0.05, hex: PALETTE.flowerRed },
    { x: 0, z: 0, hex: PALETTE.flowerYellow },
    { x: 0.4, z: 0.1, hex: PALETTE.flowerYellow },
    { x: -0.3, z: 0.4, hex: PALETTE.flowerWhite },
    { x: 0.3, z: 0.42, hex: PALETTE.flowerRed },
  ];
}
function flowerDotsGeo(): THREE.BufferGeometry {
  return getGeometry("flowerDots", () =>
    mergeGeometries(flowerDots().map((d) => tintedBox(0.34, 0.34, 0.34, d.x, 0.45, d.z, d.hex))),
  );
}
const flowerBaseMat = () => getMaterial("flowerBaseMat", () => new THREE.MeshStandardMaterial({ color: PALETTE.flowerStem }));

// --- trashcan: a small dark-green bin (single box, one draw call). ---
function trashcanGeo(): THREE.BufferGeometry {
  return getGeometry("trashcan", () => {
    const body = new THREE.BoxGeometry(0.5, 0.8, 0.5); body.translate(0, 0.4, 0);
    const lid = new THREE.BoxGeometry(0.58, 0.12, 0.58); lid.translate(0, 0.85, 0);
    return mergeGeometries([body, lid]);
  });
}
const trashcanMat = () => getMaterial("trashcanMat", () => new THREE.MeshStandardMaterial({ color: PALETTE.trashCan }));

// --- planter: a stone rim box with a clipped hedge top. Stone + hedge merge
// into one vertex-colored geometry (one draw call). ---
function planterGeo(): THREE.BufferGeometry {
  return getGeometry("planter", () => {
    const parts: THREE.BufferGeometry[] = [
      tintedBox(1.5, 0.5, 1.5, 0, 0.25, 0, PALETTE.planterStone), // stone rim base
      tintedBox(1.2, 0.55, 1.2, 0, 0.72, 0, PALETTE.hedge),       // clipped hedge top
    ];
    // bright blossoms poking above the hedge so the planter reads as flowering.
    const blossoms: [number, number, number][] = [
      [-0.35, -0.35, PALETTE.flowerRed],
      [0.35, -0.3, PALETTE.flowerYellow],
      [-0.3, 0.35, PALETTE.flowerWhite],
      [0.35, 0.35, PALETTE.flowerYellow],
      [0, 0, PALETTE.flowerRed],
    ];
    for (const [bx, bz, hex] of blossoms) parts.push(tintedBox(0.22, 0.24, 0.22, bx, 1.02, bz, hex));
    return mergeGeometries(parts);
  });
}

export function flowerbedInstances(props: PropDef[]): THREE.Object3D {
  const group = new THREE.Group();
  const pl = placementsFor(props, "flowerbed");
  if (pl.length === 0) return group;
  group.add(makeInstanced(flowerBaseGeo(), flowerBaseMat(), pl, 0));
  group.add(makeInstanced(flowerDotsGeo(), vertexColorMat("flowerDotsMat"), pl, 0));
  return group;
}

export function trashcanInstances(props: PropDef[]): THREE.Object3D {
  const pl = placementsFor(props, "trashcan");
  return makeInstanced(trashcanGeo(), trashcanMat(), pl, 0);
}

export function planterInstances(props: PropDef[]): THREE.Object3D {
  const pl = placementsFor(props, "planter");
  return makeInstanced(planterGeo(), vertexColorMat("planterMat"), pl, 0);
}

function placementsFor(props: PropDef[], kind: PropDef["kind"]): Placement[] {
  return props
    .filter((p) => p.kind === kind)
    .map((p, i) => ({ x: p.x, z: p.z, rotationY: (i * 2.39996) % (Math.PI * 2), scale: 0.85 + ((i * 7) % 5) * 0.08 }));
}

// Deterministic species per tree: 0 = conifer (cone), 1 = deciduous (round).
export function treeSpecies(index: number): number {
  return index % 2;
}

export function treeInstances(props: PropDef[]): THREE.Object3D {
  const group = new THREE.Group();
  const pl = placementsFor(props, "tree");
  if (pl.length === 0) return group;
  group.add(makeInstanced(trunkGeo(), trunkMat(), pl, 0));
  const conifer = pl.filter((_, i) => treeSpecies(i) === 0);
  const decid = pl.filter((_, i) => treeSpecies(i) === 1);
  if (conifer.length) group.add(makeInstanced(foliageGeo(), vertexColorMat("foliageVCMat"), conifer, 0));
  if (decid.length) group.add(makeInstanced(deciduousGeo(), vertexColorMat("foliageVCMat"), decid, 0));
  return group;
}

export function bushInstances(props: PropDef[]): THREE.Object3D {
  const pl = placementsFor(props, "bush");
  return makeInstanced(bushGeo(), bushMat(), pl, 0);
}

export function benchInstances(props: PropDef[]): THREE.Object3D {
  const pl = placementsFor(props, "bench");
  return makeInstanced(benchGeo(), benchMat(), pl, 0);
}

export function makeStreetLight(def: PropDef): THREE.Object3D {
  const g = new THREE.Group();
  g.position.set(def.x, 0, def.z);
  const pole = new THREE.Mesh(
    getGeometry("slPole", () => new THREE.CylinderGeometry(0.06, 0.08, 3.0, 8)),
    getMaterial("slPoleMat", () => new THREE.MeshStandardMaterial({ color: PALETTE.lampPole })),
  );
  pole.position.y = 1.5; pole.castShadow = true;
  const lamp = new THREE.Mesh(
    getGeometry("slLamp", () => new THREE.BoxGeometry(0.34, 0.34, 0.34)),
    getMaterial("slLampMat", () => new THREE.MeshStandardMaterial({ color: PALETTE.lantern, emissive: PALETTE.lanternGlow, emissiveIntensity: 1.4 })),
  );
  lamp.position.y = 3.0;
  g.add(pole, lamp);
  return g;
}
