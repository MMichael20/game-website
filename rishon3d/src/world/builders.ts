import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { BuildingDef, RishonMap } from "./rishonMap";
import { makeWindowTexture } from "./windows";
import { gridFromDef, makeFacadeTexture } from "./facade";
import { DAY } from "../core/sky";
import { PALETTE } from "./palette";

// One shared base window texture; kept for the subtle emissive "lit windows"
// accent layered on top of the new albedo facade (a few panels glow).
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

  // Procedural ALBEDO facade: a readable window grid + ground-floor storefront
  // + top cornice, mapped 1:1 across the box height so the storefront lands at
  // the base. Cached by quantized key so the city collapses to a few textures.
  const { cols, floors } = gridFromDef(def.width, def.height);
  const facadeTex = makeFacadeTexture(cols, floors, { color: def.color, storefront: true });

  // Side material: the facade map, lightly tinted by the body color so each
  // building keeps its palette identity while sharing a cached texture. A subtle
  // emissive accent (the old lit-window map, tiled) makes a few panels glow.
  const emissiveTex = windowTexture().clone();
  emissiveTex.needsUpdate = true;
  emissiveTex.repeat.set(Math.max(1, cols), Math.max(2, floors - 2));
  const facadeMat = new THREE.MeshStandardMaterial({
    map: facadeTex,
    color: new THREE.Color(def.color).lerp(new THREE.Color(0xffffff), 0.45), // gentle tint over the albedo grid
    emissive: DAY.windowEmissive,
    emissiveMap: emissiveTex,
    emissiveIntensity: DAY.windowEmissiveIntensity * 0.6, // subtle, daytime
  });
  const roofMat = new THREE.MeshStandardMaterial({ color: PALETTE.roofCap });
  const bodyMat = new THREE.MeshStandardMaterial({ color: def.color });

  // BoxGeometry material index order: 0=+X, 1=-X, 2=+Y(top), 3=-Y(bottom),
  // 4=+Z, 5=-Z. Facade on the 4 sides, roof cap on top, body on bottom.
  const mats: THREE.Material[] = [facadeMat, facadeMat, roofMat, bodyMat, facadeMat, facadeMat];

  const mesh = new THREE.Mesh(geo, mats);
  mesh.position.set(def.x, def.height / 2, def.z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}
