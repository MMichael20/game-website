// rishon3d/src/world/restaurantStreet.ts
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { makeInstanced, type Placement } from "./InstancedProps";
import { PALETTE } from "./palette";
import { makeSidewalkTexture, PAVER_SUPER_M } from "./roads";

// A short, lively restaurant promenade in the open SE corner of the map. Center
// ~(95,95) is clear of both the E district (z in [-30,30]) and the S district
// (x in [-30,30]). Self-contained, deterministic (fixed layout, no rng), and
// merged/instanced so the whole landmark stays at a handful of draw calls. The
// builder returns a Group anchored at the origin with world-space geometry, so
// the World can add it directly.

// Promenade center + footprint (the paved plaza the restaurants line).
const CX = 95; // promenade center x
const CZ = 95; // promenade center z
const PROM_W = 44; // span along x (the row of restaurants)
const PROM_D = 22; // depth along z (storefronts -> seating -> street edge)

// Restaurants sit along the north edge (lower z); seating + the street run
// south of them (higher z) so the awnings face the open promenade.
const SHOP_Z = CZ - 6; // building front line
const SEAT_Z = CZ + 2; // outdoor seating band
const ANCHOR_Z = CZ + 8; // pickup marker / menu stand band

// Three bespoke restaurants spaced evenly along the promenade. Each entry fixes
// the box footprint/height and which warm awning color it wears so the row
// reads as a deterministic mix (red / blue / red).
const RESTAURANTS: { x: number; w: number; d: number; h: number; awning: number }[] = [
  { x: CX - 15, w: 8, d: 8, h: 6, awning: PALETTE.awningRed },
  { x: CX, w: 9, d: 8, h: 9, awning: PALETTE.awningBlue },
  { x: CX + 15, w: 8, d: 8, h: 7, awning: PALETTE.awningRed },
];

// Gameplay anchor: the delivery/pickup marker stand position, in the SE region.
export const RESTAURANT = { x: CX, z: ANCHOR_Z };

// --- vertex-color helper: tint a box's vertices so several colors merge into
// one geometry (one draw call) instead of one material per color. Mirrors the
// helper in props.ts. ---
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
// via vertex colors, so several awnings (any color) merge into ONE mesh. Width
// `w` along x, sloping down toward the promenade (+Z). Built in world space.
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
    // sloped top slab (baked rotation so all slabs merge into one mesh).
    const slab = new THREE.BoxGeometry(colW, 0.18, 1.8);
    slab.rotateX(-0.34); // slope down toward the street
    slab.translate(cxw, y, z);
    tint(slab, hex);
    // hanging front valance: a short vertical striped flap at the slab's low edge,
    // the detail that makes a flat awning read as a real fabric canopy.
    const valance = new THREE.BoxGeometry(colW, 0.36, 0.08);
    valance.translate(cxw, y - 0.42, z + 0.85);
    tint(valance, hex);
  }
  return out;
}

// One restaurant box's solid voxel parts (body + sign band + parapet rim),
// merged into a single vertex-colored geometry per restaurant. The warm
// storefront, door and awning are emitted separately (different materials).
function restaurantSolids(r: typeof RESTAURANTS[number]): THREE.BufferGeometry[] {
  const hd = r.d / 2;
  const front = SHOP_Z + hd; // +Z face (toward the promenade)
  const out: THREE.BufferGeometry[] = [];

  // body: a warm sandy box, sitting on the ground.
  out.push(tintedBox(r.w, r.h, r.d, r.x, r.h / 2, SHOP_Z, PALETTE.houseBody));

  // sign band: a warm strip across the upper storefront, just proud of the wall.
  const bandY = r.h - 1.1;
  out.push(tintedBox(r.w * 0.9, 0.9, 0.2, r.x, bandY, front + 0.1, PALETTE.signWarm));

  // parapet rim: a thin cornice box capping the flat roof.
  out.push(tintedBox(r.w, 0.5, r.d, r.x, r.h + 0.25, SHOP_Z, PALETTE.cornice));

  return out;
}

// The glowing sign text/dot on the sign band (lit accent), one per restaurant.
function restaurantSignLit(r: typeof RESTAURANTS[number]): THREE.BufferGeometry {
  const hd = r.d / 2;
  const front = SHOP_Z + hd;
  const g = new THREE.BoxGeometry(r.w * 0.55, 0.4, 0.12);
  g.translate(r.x, r.h - 1.1, front + 0.22);
  return g;
}

// The bright ground-floor storefront glass panel, one per restaurant.
function restaurantStorefront(r: typeof RESTAURANTS[number]): THREE.BufferGeometry {
  const hd = r.d / 2;
  const front = SHOP_Z + hd;
  const g = new THREE.BoxGeometry(r.w * 0.78, 2.4, 0.1);
  g.translate(r.x, 1.5, front + 0.06);
  return g;
}

// The dark entrance door, one per restaurant (offset to one side of the glass).
function restaurantDoor(r: typeof RESTAURANTS[number]): THREE.BufferGeometry {
  const hd = r.d / 2;
  const front = SHOP_Z + hd;
  const g = new THREE.BoxGeometry(1.2, 2.4, 0.14);
  g.translate(r.x + r.w * 0.28, 1.2, front + 0.08);
  return g;
}

// --- outdoor seating: a square table on four legs + chairs on four legs. Built
// once as shared geometry and instanced across the seating band. ---
function tableGeo(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const top = new THREE.BoxGeometry(1.1, 0.12, 1.1); top.translate(0, 0.9, 0);
  parts.push(top);
  for (const sx of [-0.45, 0.45]) for (const sz of [-0.45, 0.45]) {
    const leg = new THREE.BoxGeometry(0.1, 0.9, 0.1); leg.translate(sx, 0.45, sz);
    parts.push(leg);
  }
  return mergeGeometries(parts);
}
function chairGeo(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const seat = new THREE.BoxGeometry(0.5, 0.1, 0.5); seat.translate(0, 0.5, 0);
  const back = new THREE.BoxGeometry(0.5, 0.5, 0.1); back.translate(0, 0.74, -0.2);
  parts.push(seat, back);
  for (const sx of [-0.2, 0.2]) for (const sz of [-0.2, 0.2]) {
    const leg = new THREE.BoxGeometry(0.08, 0.5, 0.08); leg.translate(sx, 0.25, sz);
    parts.push(leg);
  }
  return mergeGeometries(parts);
}
// Umbrella: a slim pole topped by a stepped red/white striped parasol canopy.
// Stripes are baked as vertex colors so every umbrella shares one geometry +
// one vertexColors material (still a single instanced draw).
function umbrellaGeo(): THREE.BufferGeometry {
  const tint = (g: THREE.BufferGeometry, hex: number) => {
    const c = new THREE.Color(hex);
    const n = g.attributes.position.count;
    const colors = new Float32Array(n * 3);
    for (let v = 0; v < n; v++) { colors[v * 3] = c.r; colors[v * 3 + 1] = c.g; colors[v * 3 + 2] = c.b; }
    g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return g;
  };
  const parts: THREE.BufferGeometry[] = [];
  const pole = new THREE.BoxGeometry(0.12, 2.4, 0.12); pole.translate(0, 1.2, 0);
  parts.push(tint(pole, PALETTE.benchWood));
  // stepped pyramid: shrinking square rings, alternating canopy color / white,
  // so it reads as a sloped striped parasol rather than a flat slab.
  const rings: [number, number, number][] = [
    [2.4, 2.30, PALETTE.awningRed],
    [1.85, 2.40, PALETTE.awningStripe],
    [1.3, 2.50, PALETTE.awningRed],
    [0.75, 2.60, PALETTE.awningStripe],
  ];
  for (const [s, ry, hex] of rings) {
    const ring = new THREE.BoxGeometry(s, 0.12, s); ring.translate(0, ry, 0);
    parts.push(tint(ring, hex));
  }
  const finial = new THREE.BoxGeometry(0.16, 0.2, 0.16); finial.translate(0, 2.72, 0);
  parts.push(tint(finial, PALETTE.awningRed));
  return mergeGeometries(parts);
}

// A long wooden planter box packed with a green hedge and bright blossoms — the
// foreground detail that lines the reference patio. Wood rim + green fill +
// blossom cubes all merge into one vertex-colored geometry (one instanced draw).
function planterBoxGeo(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  parts.push(tintedBox(1.8, 0.5, 0.7, 0, 0.25, 0, PALETTE.benchWood)); // wooden box body
  parts.push(tintedBox(1.62, 0.28, 0.54, 0, 0.55, 0, PALETTE.hedge));  // green fill, inset
  // a scatter of blossoms poking above the hedge (fixed, deterministic layout).
  const blossoms: [number, number, number][] = [
    [-0.62, 0.02, PALETTE.flowerRed],
    [-0.24, -0.08, PALETTE.flowerYellow],
    [0.12, 0.08, PALETTE.flowerWhite],
    [0.48, -0.04, PALETTE.flowerYellow],
    [0.66, 0.1, PALETTE.flowerRed],
  ];
  for (const [bx, bz, hex] of blossoms) {
    parts.push(tintedBox(0.16, 0.2, 0.16, bx, 0.74, bz, hex));
  }
  return mergeGeometries(parts);
}

// Planter placements: a row along the street-facing edge of the promenade and a
// row at the storefront bases, skipping the central pickup stand. Deterministic.
function planterPlacements(): Placement[] {
  const out: Placement[] = [];
  // street-edge row (in front of the seating, toward the open promenade)
  for (let i = 0; i < 7; i++) {
    const x = CX - 18 + i * 6;
    if (Math.abs(x - CX) < 2) continue; // leave the pickup stand clear
    out.push({ x, z: CZ + 9.2 });
  }
  // storefront-base row (planters hugging the building fronts)
  for (const r of RESTAURANTS) {
    out.push({ x: r.x - r.w * 0.3, z: SHOP_Z + r.d / 2 + 1.4 });
    out.push({ x: r.x + r.w * 0.3, z: SHOP_Z + r.d / 2 + 1.4 });
  }
  return out;
}

// Fixed seating cluster centers along the promenade (between the buildings and
// the street). One cluster roughly per restaurant, plus a couple between them.
function seatClusters(): { x: number; z: number }[] {
  const out: { x: number; z: number }[] = [];
  for (let i = 0; i < 5; i++) {
    const x = CX - 16 + i * 8;
    const z = SEAT_Z + (i % 2 === 0 ? 0 : 2.4);
    out.push({ x, z });
  }
  return out;
}

// Chair offsets around a table (deterministic four-around layout).
const CHAIR_OFFSETS: [number, number][] = [
  [0.85, 0], [-0.85, 0], [0, 0.85], [0, -0.85],
];

export function makeRestaurantStreet(): THREE.Object3D {
  const group = new THREE.Group();
  group.name = "restaurantStreet";

  // --- promenade slab: a paved plaza textured with the shared paver super-tile
  // so it reads as laid stones (matching the sidewalks), tiled to plaza size. ---
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

  // --- restaurant buildings: each restaurant's solid voxel parts merge into
  // one vertex-colored mesh; the warm glass / door / sign-lit / awning use
  // their own shared materials and merge across all three restaurants. So the
  // whole row is ~5 draw calls regardless of restaurant count. Each restaurant
  // box is its OWN named mesh so the tests can count >=3 building meshes. ---
  const storefronts: THREE.BufferGeometry[] = [];
  const doors: THREE.BufferGeometry[] = [];
  const signLits: THREE.BufferGeometry[] = [];
  const awnings: THREE.BufferGeometry[] = [];
  for (const r of RESTAURANTS) {
    const box = new THREE.Mesh(
      mergeGeometries(restaurantSolids(r)),
      new THREE.MeshStandardMaterial({ vertexColors: true }),
    );
    box.castShadow = true;
    box.receiveShadow = true;
    box.name = "restaurantBuilding";
    group.add(box);

    storefronts.push(restaurantStorefront(r));
    doors.push(restaurantDoor(r));
    signLits.push(restaurantSignLit(r));
    awnings.push(...awningStripes(r.x, r.h - 2.0, SHOP_Z + r.d / 2 + 0.7, r.w * 0.92, r.awning));
  }

  const glass = new THREE.Mesh(
    mergeGeometries(storefronts),
    new THREE.MeshStandardMaterial({ color: PALETTE.storefront, emissive: PALETTE.signLit, emissiveIntensity: 0.25 }),
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

  // --- outdoor seating: tables + chairs + umbrellas instanced across the
  // seating clusters (three instanced meshes total). ---
  const clusters = seatClusters();
  const tablePl: Placement[] = clusters.map((c) => ({ x: c.x, z: c.z }));
  const umbrellaPl: Placement[] = clusters.map((c) => ({ x: c.x, z: c.z }));
  const chairPl: Placement[] = [];
  clusters.forEach((c, ci) => {
    CHAIR_OFFSETS.forEach(([dx, dz], oi) => {
      // face each chair toward its table center (deterministic rotation).
      const rotationY = (oi * Math.PI) / 2;
      chairPl.push({ x: c.x + dx, z: c.z + dz, rotationY, scale: 1 - (ci % 2) * 0.04 });
    });
  });
  group.add(makeInstanced(tableGeo(), new THREE.MeshStandardMaterial({ color: PALETTE.benchWood }), tablePl, 0));
  group.add(makeInstanced(chairGeo(), new THREE.MeshStandardMaterial({ color: PALETTE.benchWood }), chairPl, 0));
  group.add(makeInstanced(umbrellaGeo(), new THREE.MeshStandardMaterial({ vertexColors: true }), umbrellaPl, 0));

  // flower planters lining the patio (one vertex-colored instanced draw).
  group.add(makeInstanced(planterBoxGeo(), new THREE.MeshStandardMaterial({ vertexColors: true }), planterPlacements(), 0));

  // --- menu board + delivery/pickup marker: a small bespoke stand at the
  // RESTAURANT anchor. A post holds a warm-signed board (the menu); a lit cap
  // marks it as the pickup point. Built as one small group. ---
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
