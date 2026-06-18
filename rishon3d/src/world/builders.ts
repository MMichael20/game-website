import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { BuildingDef, RishonMap } from "./rishonMap";
import { makeWindowTexture } from "./windows";
import { gridFromDef, makeFacadeTexture, type FacadeType } from "./facade";
import { DAY } from "../core/sky";
import { PALETTE } from "./palette";

// Deterministic 32-bit hash of a building id (FNV-1a), matching the seed style
// used elsewhere (roads.hashId). No Math.random/Date.now so the city is stable.
function hashId(id: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

// Deterministic ground-floor IDENTITY for a building, from a hash of its id and
// a size heuristic. The facade texture (facade.ts) paints the matching base, so
// the same type must be passed there AND used to add type geometry here:
//   - tall towers (height > 16) read as office / apartment (curtain wall or a
//     regular window grid),
//   - mid-rise read as apartment / office,
//   - short/wide (height < 10) read as street-level shop / restaurant.
// Within each band the id hash picks between the two candidates so a street
// mixes identities but every building is reproducible.
export function facadeTypeFor(def: BuildingDef): FacadeType {
  const h = hashId(def.id);
  const flip = (h & 1) === 0;
  if (def.height > 16) return flip ? "office" : "apartment";
  if (def.height >= 10) return flip ? "apartment" : "office";
  return flip ? "shop" : "restaurant";
}

// One shared base window texture; kept for the subtle emissive "lit windows"
// accent layered on top of the new albedo facade (a few panels glow).
let WINDOW_TEX: THREE.DataTexture | null = null;
function windowTexture(): THREE.DataTexture {
  if (!WINDOW_TEX) WINDOW_TEX = makeWindowTexture();
  return WINDOW_TEX;
}

// Deterministic per-building awning choice from a hash of its id. Awnings read
// as a STREET-LEVEL retail signal, so they are biased by facade type: shop /
// restaurant get them often, office / apartment rarely. `type` is optional so
// the legacy `awningStyle(id)` call (and tests) keep the unbiased ~45% base
// rate; makeAwnings passes the building's type to apply the bias.
export function awningStyle(id: string, type?: FacadeType): { show: boolean; color: number } {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  // per-type show threshold (out of 100): retail high, residential/office low.
  let threshold = 45; // default / unknown type — unchanged base rate
  if (type === "shop" || type === "restaurant") threshold = 78;
  else if (type === "office" || type === "apartment") threshold = 12;
  const show = (h % 100) < threshold;
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
    const a = awningStyle(def.id, facadeTypeFor(def));
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

  // Ground-floor IDENTITY drives both the painted facade base and the extra
  // geometry below (parapet / door / entry pad / balconies), so a street reads
  // as a mix of shops, restaurants, offices and apartment blocks.
  const type = facadeTypeFor(def);

  const geo = new THREE.BoxGeometry(def.width, def.height, def.depth);

  // Procedural ALBEDO facade: a readable window grid + ground-floor storefront
  // + top cornice, mapped 1:1 across the box height so the storefront lands at
  // the base. Cached by quantized key (now incl. type) so the city still
  // collapses to a few textures.
  const { cols, floors } = gridFromDef(def.width, def.height);
  const facadeTex = makeFacadeTexture(cols, floors, { color: def.color, storefront: true, type });

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

  const body = new THREE.Mesh(geo, mats);
  body.position.y = def.height / 2; // base sits on the ground (group is at y=0)
  body.castShadow = true;
  body.receiveShadow = true;

  // Wrap the body + type geometry in a Group anchored at the footprint so the
  // door/parapet/balconies stay in building-local space. The Group is still a
  // single Object3D the World adds, and the heavy parts (body + a couple of
  // merged extra meshes) keep draw calls flat.
  const group = new THREE.Group();
  group.position.set(def.x, 0, def.z);
  group.add(body);

  const hw = def.width / 2;
  const hd = def.depth / 2;
  const front = hd; // +Z is the painted storefront face (mats index 4)

  // ---- parapet / roof cap: a thin raised rim around the roof top -----------
  // ALL non-house buildings get a parapet so the flat roof no longer reads as a
  // blank cap. Four slim cornice-colored boxes are merged into one mesh.
  const parapetH = 0.6;
  const parapetT = 0.4; // wall thickness of the rim
  const roofY = def.height + parapetH / 2;
  const rims: THREE.BufferGeometry[] = [];
  const pushRim = (w: number, d: number, x: number, z: number) => {
    const g = new THREE.BoxGeometry(w, parapetH, d);
    g.translate(x, roofY, z);
    rims.push(g);
  };
  pushRim(def.width, parapetT, 0, +hd - parapetT / 2); // +Z edge
  pushRim(def.width, parapetT, 0, -hd + parapetT / 2); // -Z edge
  pushRim(parapetT, def.depth - 2 * parapetT, +hw - parapetT / 2, 0); // +X edge
  pushRim(parapetT, def.depth - 2 * parapetT, -hw + parapetT / 2, 0); // -X edge
  const parapet = new THREE.Mesh(mergeGeometries(rims), new THREE.MeshStandardMaterial({ color: PALETTE.cornice }));
  parapet.castShadow = true;
  parapet.receiveShadow = true;
  parapet.name = "parapet";
  group.add(parapet);

  // ---- door + entry pad at the street-facing (+Z) base ---------------------
  // The painted facade already draws a centered facadeDoor notch in the bottom
  // band; this adds a thin physical door panel proud of the wall plus a small
  // concrete pad on the ground in front so the entrance reads in 3D and lines
  // up with the texture.
  const doorH = Math.min(2.6, def.height * 0.35);
  const doorW = Math.min(2.0, def.width * 0.5);
  const doorGeo = new THREE.BoxGeometry(doorW, doorH, 0.12);
  doorGeo.translate(0, doorH / 2, front + 0.06); // centered on +Z, just proud of the wall
  const door = new THREE.Mesh(doorGeo, new THREE.MeshStandardMaterial({ color: PALETTE.facadeDoor }));
  door.castShadow = true;
  door.name = "door";
  group.add(door);

  const padDepth = 1.4;
  const padGeo = new THREE.BoxGeometry(doorW + 1.2, 0.12, padDepth);
  padGeo.translate(0, 0.06, front + padDepth / 2); // flat slab on the ground in front of the door
  const pad = new THREE.Mesh(padGeo, new THREE.MeshStandardMaterial({ color: PALETTE.entryPad }));
  pad.receiveShadow = true;
  pad.name = "entryPad";
  group.add(pad);

  // ---- balconies (apartment only): small rails protruding on the +Z face ---
  // A few balconyRail boxes on upper floors give the apartment block its
  // characteristic stacked-balcony silhouette. Merged into one mesh; placement
  // is deterministic from the building height (one per ~2 upper floors).
  if (type === "apartment") {
    const floorH = def.height / Math.max(2, floors);
    const balW = Math.min(def.width * 0.6, 3.2);
    const balDepth = 0.5;
    const balH = 0.5;
    const balconies: THREE.BufferGeometry[] = [];
    // start above the ground floor; one balcony every other floor up to the top.
    for (let fl = 1; fl < floors - 1; fl += 2) {
      const y = fl * floorH + floorH * 0.35;
      const g = new THREE.BoxGeometry(balW, balH, balDepth);
      g.translate(0, y + balH / 2, front + balDepth / 2);
      balconies.push(g);
    }
    if (balconies.length > 0) {
      const bal = new THREE.Mesh(
        mergeGeometries(balconies),
        new THREE.MeshStandardMaterial({ color: PALETTE.balconyRail }),
      );
      bal.castShadow = true;
      bal.name = "balconies";
      group.add(bal);
    }
  }

  return group;
}
