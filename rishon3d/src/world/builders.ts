import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { BuildingDef, RishonMap } from "./rishonMap";
import { makeWindowTexture } from "./windows";
import { DAY } from "../core/sky";
import { PALETTE } from "./palette";

// One shared base window texture; cloned per building so each can tile its
// windows at a believable size via texture.repeat.
let WINDOW_TEX: THREE.DataTexture | null = null;
function windowTexture(): THREE.DataTexture {
  if (!WINDOW_TEX) WINDOW_TEX = makeWindowTexture();
  return WINDOW_TEX;
}

// Deterministic per-building awning choice from a hash of its id.
export function awningStyle(id: string): { show: boolean; color: number } {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  const show = (h % 100) < 45;
  const color = (h & 1) ? PALETTE.awningRed : PALETTE.awningBlue;
  return { show, color };
}

// Vertical color/white stripe texture (cached per color).
const STRIPE_TEX = new Map<number, THREE.DataTexture>();
function stripeTexture(color: number): THREE.DataTexture {
  let t = STRIPE_TEX.get(color);
  if (t) return t;
  const cols = 8;
  const c = new THREE.Color(color);
  const data = new Uint8Array(cols * 1 * 4);
  for (let i = 0; i < cols; i++) {
    const o = i * 4;
    const stripe = i % 2 === 0;
    const col = stripe ? c : new THREE.Color(PALETTE.awningStripe);
    data[o] = Math.round(col.r * 255);
    data[o + 1] = Math.round(col.g * 255);
    data[o + 2] = Math.round(col.b * 255);
    data[o + 3] = 255;
  }
  t = new THREE.DataTexture(data, cols, 1, THREE.RGBAFormat);
  t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter;
  t.needsUpdate = true;
  STRIPE_TEX.set(color, t);
  return t;
}

// All shop awnings merged into ONE mesh per stripe color (not one mesh per
// building), so the whole city's awnings cost two draw calls + two shared
// textures. The slope is baked into each slab's geometry so they can merge.
export function makeAwnings(buildings: BuildingDef[]): THREE.Object3D {
  const group = new THREE.Group();
  const byColor = new Map<number, THREE.BufferGeometry[]>();
  for (const def of buildings) {
    if (def.isHouse) continue;
    const a = awningStyle(def.id);
    if (!a.show) continue;
    const w = Math.min(def.width * 0.92, 8);
    const g = new THREE.BoxGeometry(w, 0.18, 1.4);
    g.rotateX(-0.32); // slope down toward the street (baked so slabs can merge)
    const y = Math.min(2.7, def.height - 0.6);
    g.translate(def.x, y, def.z + def.depth / 2 + 0.6);
    const list = byColor.get(a.color) ?? [];
    list.push(g);
    byColor.set(a.color, list);
  }
  for (const [color, geos] of byColor) {
    const mat = new THREE.MeshStandardMaterial({ map: stripeTexture(color) });
    const mesh = new THREE.Mesh(mergeGeometries(geos), mat);
    mesh.castShadow = true;
    group.add(mesh);
  }
  return group;
}

export function makeGround(map: RishonMap): THREE.Mesh {
  const geo = new THREE.PlaneGeometry(map.ground.size, map.ground.size);
  const mat = new THREE.MeshStandardMaterial({ color: PALETTE.grass });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.receiveShadow = true;
  return mesh;
}


export function makeBuilding(def: BuildingDef): THREE.Object3D {
  if (def.isHouse) {
    const group = new THREE.Group();
    group.position.set(def.x, 0, def.z);

    // body color comes from the map (palette-driven)
    const bodyGeo = new THREE.BoxGeometry(def.width, def.height, def.depth);
    const bodyMat = new THREE.MeshStandardMaterial({ color: def.color });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = def.height / 2;
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    // terracotta-red pitched roof (cone approximation)
    const roofRadius = Math.max(def.width, def.depth) * 0.72;
    const roofHeight = def.height * 0.6;
    const roofGeo = new THREE.ConeGeometry(roofRadius, roofHeight, 4);
    const roofMat = new THREE.MeshStandardMaterial({ color: PALETTE.houseRoof });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.y = def.height + roofHeight / 2;
    roof.rotation.y = Math.PI / 4; // align flat faces with walls
    roof.castShadow = true;
    group.add(roof);

    return group;
  }

  const geo = new THREE.BoxGeometry(def.width, def.height, def.depth);
  const tex = windowTexture().clone();
  tex.needsUpdate = true;
  tex.repeat.set(Math.max(1, Math.round(def.width / 6)), Math.max(2, Math.round(def.height / 5)));
  const mat = new THREE.MeshStandardMaterial({
    color: def.color,
    emissive: DAY.windowEmissive,
    emissiveMap: tex,
    emissiveIntensity: DAY.windowEmissiveIntensity,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(def.x, def.height / 2, def.z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}
