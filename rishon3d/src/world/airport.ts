// rishon3d/src/world/airport.ts
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { getGeometry, getMaterial } from "./assets";
import { makeInstanced, type Placement } from "./InstancedProps";
import { PALETTE } from "./palette";

// AIRPORT — a recognizable destination in the open NE corner. The terminal is a
// wide low slab with a glass curtain-wall front facing SOUTH toward the city
// (+Z here, since the city sits at z~-90 and the terminal at z~-105), a drop-off
// canopy on posts over the front curb, a blocky "AIRPORT" sign band, a paved
// drop-off apron with a marked pickup lane, a slim control tower beside the
// terminal, and a few instanced luggage carts. Deterministic + merged/instanced
// so the whole landmark stays at a handful of draw calls. All geometry is kept
// within +/-138 and clear of the E district (z>-40) and N district (x<35).

// Terminal center (gameplay anchor — the airport's world position).
export const AIRPORT = { x: 95, z: -105 } as const;
// Drop-off curb (gameplay anchor — where the car pickup lane sits, south front).
// World z = AIRPORT.z + laneZ (local) = -105 + 20.5.
export const AIRPORT_PICKUP = { x: 95, z: -84.5 } as const;

// Terminal footprint (local, centered on AIRPORT).
const T_W = 50; // width (x)
const T_D = 18; // depth (z)
const T_H = 9;  // height
const FRONT = T_D / 2; // +Z face is the south front toward the city

// --- vertex-color helper: tint a box's vertices so several colors merge into
// one geometry (one draw call) instead of one material per color. Mirrors the
// helper in props.ts so the airport composes from a couple of merged meshes. ---
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

// 5x3 block-letter font on a column grid. Each glyph is 3 columns wide with a
// 1-column gap; a filled cell becomes a small tinted cube so "AIRPORT" reads as
// chunky voxel letters merged into one mesh. Rows are top-to-bottom.
const GLYPHS: Record<string, string[]> = {
  A: ["111", "101", "111", "101", "101"],
  I: ["111", "010", "010", "010", "111"],
  R: ["110", "101", "110", "101", "101"],
  P: ["111", "101", "111", "100", "100"],
  O: ["111", "101", "101", "101", "111"],
  T: ["111", "010", "010", "010", "010"],
};

// Build the merged "AIRPORT" sign geometry: a backing panel plus lit block
// letters, both vertex-colored, centered on the terminal front at sign height.
function signGeo(): THREE.BufferGeometry {
  return getGeometry("airportSign", () => {
    const text = "AIRPORT";
    const cell = 0.5;           // per-cell cube size
    const glyphCols = 3;        // columns per glyph
    const gap = 1;              // blank columns between glyphs
    const cols = text.length * glyphCols + (text.length - 1) * gap;
    const rows = 5;
    const w = cols * cell;
    const h = rows * cell;
    const x0 = -w / 2 + cell / 2; // leftmost cell center
    const y0 = h / 2 - cell / 2;  // topmost cell center (rows go down)

    const parts: THREE.BufferGeometry[] = [];
    // Backing panel (sign band) — a flat cool box just behind the letters.
    parts.push(tintedBox(w + 1.2, h + 0.8, 0.2, 0, 0, FRONT + 0.5, PALETTE.signCool));

    // Lit block letters, proud of the panel.
    let col = 0;
    for (const ch of text) {
      const rowsPat = GLYPHS[ch];
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < glyphCols; c++) {
          if (rowsPat[r][c] !== "1") continue;
          const lx = x0 + (col + c) * cell;
          const ly = y0 - r * cell;
          parts.push(tintedBox(cell * 0.86, cell * 0.86, 0.22, lx, ly, FRONT + 0.7, PALETTE.signLit));
        }
      }
      col += glyphCols + gap;
    }
    return mergeGeometries(parts);
  });
}

// Luggage cart geometry: a low flat platform on a stub frame with a stacked
// "bags" block, baked at origin so one instance transform places it. Merged so
// each cart is a single instanced draw.
function luggageCartGeo(): THREE.BufferGeometry {
  return getGeometry("airportCart", () =>
    mergeGeometries([
      tintedBox(1.6, 0.18, 0.9, 0, 0.35, 0, PALETTE.railDeck),  // platform deck
      tintedBox(0.14, 0.35, 0.14, -0.7, 0.18, 0.38, PALETTE.lampPole), // 4 stub legs
      tintedBox(0.14, 0.35, 0.14, 0.7, 0.18, 0.38, PALETTE.lampPole),
      tintedBox(0.14, 0.35, 0.14, -0.7, 0.18, -0.38, PALETTE.lampPole),
      tintedBox(0.14, 0.35, 0.14, 0.7, 0.18, -0.38, PALETTE.lampPole),
      tintedBox(0.1, 0.9, 0.1, -0.75, 0.9, 0, PALETTE.lampPole),  // push handle
      tintedBox(0.9, 0.5, 0.6, 0.2, 0.7, 0, PALETTE.awningBlue),  // stacked bag
      tintedBox(0.6, 0.35, 0.45, 0.2, 1.12, 0, PALETTE.awningRed), // smaller bag on top
    ]),
  );
}

export function makeAirport(): THREE.Object3D {
  const group = new THREE.Group();
  group.position.set(AIRPORT.x, 0, AIRPORT.z);

  const concreteMat = () => getMaterial("airportConcrete", () => new THREE.MeshStandardMaterial({ color: PALETTE.railConcrete }));
  const glassMat = () => getMaterial("airportGlass", () => new THREE.MeshStandardMaterial({ color: PALETTE.officeGlass }));

  // ---- DROP-OFF APRON: a paved slab in front of (south of) the terminal, with
  // a sidewalk curb strip and a marked pickup lane (crosswalk + yellow line).
  // All flat slabs at ground level merge into one vertex-colored mesh. ---------
  const apronDepth = 26;          // reaches from the terminal front toward the city
  const apronZ0 = FRONT;          // starts at the terminal front face
  const apronCenterZ = apronZ0 + apronDepth / 2;
  const ground: THREE.BufferGeometry[] = [];
  ground.push(tintedBox(T_W + 8, 0.1, apronDepth, 0, 0.05, apronCenterZ, PALETTE.asphalt)); // asphalt apron
  ground.push(tintedBox(T_W + 8, 0.16, 2.0, 0, 0.08, apronZ0 + 1.2, PALETTE.sidewalk));     // curb strip at the front
  // Pickup lane: a band of crosswalk paint with a yellow stop line, ~13m out
  // (this is where AIRPORT_PICKUP sits in world coords: z = -105 + 13 = -92).
  const laneZ = apronZ0 + 11.5;
  ground.push(tintedBox(T_W - 10, 0.14, 2.4, 0, 0.07, laneZ, PALETTE.crosswalk));   // pickup pad
  ground.push(tintedBox(T_W - 10, 0.16, 0.4, 0, 0.09, laneZ - 1.4, PALETTE.yellowLine)); // stop line
  group.add(new THREE.Mesh(mergeGeometries(ground), vertexColorMat("airportGroundMat")));

  // ---- TERMINAL: a wide low slab. The four walls are concrete; a glass
  // curtain-wall band runs along the south front; a cornice parapet rims the
  // flat roof. Concrete shell + parapet merge; the glass band is its own mesh. -
  const shell = new THREE.Mesh(new THREE.BoxGeometry(T_W, T_H, T_D), concreteMat());
  shell.position.y = T_H / 2;
  shell.castShadow = true; shell.receiveShadow = true;
  group.add(shell);

  // Glass curtain-wall band on the south front (+Z face), proud of the wall,
  // with frame mullions splitting it into bays — both merged per material.
  const glassY = T_H * 0.55;
  const glassH = T_H * 0.6;
  const glassBand = new THREE.Mesh(
    mergeGeometries([(() => { const g = new THREE.BoxGeometry(T_W - 4, glassH, 0.3); g.translate(0, glassY, FRONT + 0.16); return g; })()]),
    glassMat(),
  );
  glassBand.castShadow = true;
  group.add(glassBand);

  // Frame mullions: thin vertical bars + a top/bottom rail over the glass band.
  const mullions: THREE.BufferGeometry[] = [];
  const bays = 12;
  const bandW = T_W - 4;
  for (let i = 0; i <= bays; i++) {
    const mx = -bandW / 2 + (i / bays) * bandW;
    mullions.push((() => { const g = new THREE.BoxGeometry(0.22, glassH, 0.36); g.translate(mx, glassY, FRONT + 0.18); return g; })());
  }
  mullions.push((() => { const g = new THREE.BoxGeometry(bandW, 0.3, 0.36); g.translate(0, glassY + glassH / 2, FRONT + 0.18); return g; })()); // top rail
  mullions.push((() => { const g = new THREE.BoxGeometry(bandW, 0.3, 0.36); g.translate(0, glassY - glassH / 2, FRONT + 0.18); return g; })()); // bottom rail
  const frame = new THREE.Mesh(mergeGeometries(mullions), getMaterial("airportFrame", () => new THREE.MeshStandardMaterial({ color: PALETTE.frame })));
  group.add(frame);

  // Cornice parapet: a slim rim around the flat roof (four merged boxes).
  const hw = T_W / 2, hd = T_D / 2;
  const pH = 0.7, pT = 0.5, pY = T_H + pH / 2;
  const rims: THREE.BufferGeometry[] = [];
  const pushRim = (w: number, d: number, x: number, z: number) => {
    const g = new THREE.BoxGeometry(w, pH, d); g.translate(x, pY, z); rims.push(g);
  };
  pushRim(T_W, pT, 0, +hd - pT / 2);
  pushRim(T_W, pT, 0, -hd + pT / 2);
  pushRim(pT, T_D - 2 * pT, +hw - pT / 2, 0);
  pushRim(pT, T_D - 2 * pT, -hw + pT / 2, 0);
  const parapet = new THREE.Mesh(mergeGeometries(rims), getMaterial("airportCornice", () => new THREE.MeshStandardMaterial({ color: PALETTE.cornice })));
  parapet.castShadow = true;
  group.add(parapet);

  // ---- DROP-OFF CANOPY: a flat roof slab on slim posts over the front curb,
  // cantilevered out over the apron. Roof slab is its own mesh; the posts merge.
  const canopyZ = FRONT + 4.5;        // canopy center out over the curb
  const canopyW = T_W - 6;
  const canopyD = 9;
  const canopyY = T_H * 0.78;         // a touch below the parapet
  const canopy = new THREE.Mesh(new THREE.BoxGeometry(canopyW, 0.4, canopyD), getMaterial("airportCanopy", () => new THREE.MeshStandardMaterial({ color: PALETTE.roofCap })));
  canopy.position.set(0, canopyY, canopyZ);
  canopy.castShadow = true;
  group.add(canopy);

  const posts: THREE.BufferGeometry[] = [];
  const postZ = canopyZ + canopyD / 2 - 0.8; // posts at the outer canopy edge
  for (const px of [-canopyW / 2 + 1, -canopyW / 6, canopyW / 6, canopyW / 2 - 1]) {
    const g = new THREE.BoxGeometry(0.45, canopyY, 0.45);
    g.translate(px, canopyY / 2, postZ);
    posts.push(g);
  }
  const postMesh = new THREE.Mesh(mergeGeometries(posts), concreteMat());
  postMesh.castShadow = true;
  group.add(postMesh);

  // ---- AIRPORT SIGN: block letters on a cool panel, mounted high on the front
  // facade, centered and readable from a distance. ----------------------------
  const sign = new THREE.Mesh(signGeo(), vertexColorMat("airportSignMat"));
  sign.position.y = T_H + 1.4; // above the parapet, on the front
  sign.castShadow = true;
  group.add(sign);

  // ---- CONTROL TOWER: a tall slim shaft with a glass cab and a roof cap, set
  // behind/beside the terminal at local (+25, -13) => world (120, -118). Shaft
  // + roof cap are concrete (merged); the cab is glass. ------------------------
  const towerX = 25, towerZ = -13;
  const towerShaftH = 18;
  const cabH = 4;
  const towerParts: THREE.BufferGeometry[] = [];
  towerParts.push((() => { const g = new THREE.BoxGeometry(6, towerShaftH, 6); g.translate(towerX, towerShaftH / 2, towerZ); return g; })()); // shaft
  towerParts.push((() => { const g = new THREE.BoxGeometry(7.4, 0.5, 7.4); g.translate(towerX, towerShaftH + cabH + 0.25, towerZ); return g; })()); // roof cap over cab
  const towerShaft = new THREE.Mesh(mergeGeometries(towerParts), concreteMat());
  towerShaft.castShadow = true; towerShaft.receiveShadow = true;
  group.add(towerShaft);

  const cab = new THREE.Mesh(new THREE.BoxGeometry(7, cabH, 7), glassMat());
  cab.position.set(towerX, towerShaftH + cabH / 2, towerZ);
  cab.castShadow = true;
  group.add(cab);

  // ---- LUGGAGE CARTS: a few instanced carts lined up near the terminal front,
  // a single instanced draw. Deterministic fixed layout (no RNG). -------------
  const cartPlacements: Placement[] = [];
  const cartZ = FRONT + 3.2;
  for (let i = 0; i < 5; i++) {
    cartPlacements.push({
      x: -16 + i * 8,            // evenly spread across the front
      z: cartZ + (i % 2) * 1.4,  // alternate a row offset so they don't look gridded
      rotationY: ((i * 1.3) % 2) * 0.18 - 0.09, // slight deterministic yaw
    });
  }
  const carts = makeInstanced(luggageCartGeo(), vertexColorMat("airportCartMat"), cartPlacements, 0);
  group.add(carts);

  return group;
}
