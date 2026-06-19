import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

// Roblox/voxel "City Traveler" avatar, built to the reference turnaround + notes:
// a full rounded curly block-hair mop on a cube head, a blue open jacket over a
// wide white tee with two brown backpack straps set wide on the chest, a brown
// backpack (rear box + pocket + top grab-handle), skin cuffs/hands, navy legs and
// chunky black shoes, and a simple smiling face of dark rectangles on the front.
export interface HumanoidPalette { skin: number; shirt: number; pants: number; hair?: number }
export interface HumanoidLimbs {
  leftLeg: THREE.Object3D; rightLeg: THREE.Object3D;
  leftArm: THREE.Object3D; rightArm: THREE.Object3D;
}
export interface Humanoid { group: THREE.Group; limbs: HumanoidLimbs }

const WHITE_TEE = 0xf2f0ea;
const SHOE_BLACK = 0x161616;
const PACK = 0x8a5a32;
const PACK_DARK = 0x5f3d22;
const INK = 0x231f25;

// Natural hair colors; when a palette omits `hair`, one is picked deterministically
// from the other colors so a crowd of NPCs varies without callers supplying it.
export const HAIR_COLORS = [
  0x2a1c12, 0x14110f, 0x6b4a2a, 0xb07b3a, 0xd9b24a, 0x8a8a90,
];
export function hairColorFor(palette: HumanoidPalette): number {
  if (palette.hair !== undefined) return palette.hair;
  return HAIR_COLORS[(palette.shirt ^ palette.pants) % HAIR_COLORS.length];
}

function darken(hex: number, f: number): number {
  return new THREE.Color(hex).multiplyScalar(f).getHex();
}

// A limb is a pivot at the joint with the limb mesh hanging below, so rotation.x
// swings the free end. An optional `cap` (hand / shoe) sits at the end and swings
// with the limb; shoes are deeper so a toe pokes forward.
function limb(
  width: number, height: number, depth: number, color: number, jointY: number, x: number,
  cap?: { color: number; height: number; depth?: number },
): THREE.Group {
  const pivot = new THREE.Group();
  pivot.position.set(x, jointY, 0);
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, depth),
    new THREE.MeshStandardMaterial({ color }),
  );
  mesh.position.y = -height / 2; mesh.castShadow = true;
  pivot.add(mesh);
  if (cap) {
    const d = cap.depth ?? depth * 1.12;
    const capMesh = new THREE.Mesh(
      new THREE.BoxGeometry(width * 1.08, cap.height, d),
      new THREE.MeshStandardMaterial({ color: cap.color }),
    );
    capMesh.position.set(0, -height + cap.height / 2, cap.depth ? (cap.depth - depth) / 2 : 0);
    capMesh.castShadow = true;
    pivot.add(capMesh);
  }
  return pivot;
}

// Deterministic 0..1 hash so curl sizes vary across the mop but stay identical
// for every NPC (no RNG -> stable crowds and tests).
function hash01(x: number, z: number): number {
  const n = Math.sin(x * 91.7 + z * 47.3) * 43758.5453;
  return n - Math.floor(n);
}

// Full rounded "curly" voxel mop: a bumpy dome of small cubes over the crown plus
// a skirt down the sides and back, leaving the face clear. Per-cube size jitter
// makes the surface read as curls rather than a smooth cap. Merged to one
// geometry; sits on top of the cube head.
function hairGeometry(): THREE.BufferGeometry {
  const cubes: THREE.BufferGeometry[] = [];
  const add = (w: number, h: number, d: number, x: number, y: number, z: number) => {
    const g = new THREE.BoxGeometry(w, h, d); g.translate(x, y, z); cubes.push(g);
  };
  // Solid base shell so no scalp ever shows through the curls: a crown cap, a
  // back slab (nape to crown), and two side slabs, all overlapping so there is no
  // seam. Only the front face is left open.
  add(0.50, 0.22, 0.50, 0, 0.24, 0);                                      // crown cap
  add(0.50, 0.44, 0.16, 0, 0.02, -0.24);                                  // back of head
  for (const sx of [-0.25, 0.25]) add(0.14, 0.40, 0.42, sx, 0.04, -0.04); // temples / sides

  // Bumpy curl cubes over the shell for a curly, lifted texture. Gaps between
  // these are fine now -- the shell behind them fills any scalp.
  const cols = [-0.26, -0.13, 0, 0.13, 0.26];
  for (const x of cols) for (const z of cols) {
    const j = hash01(x, z), k = hash01(z, x);
    const y = 0.36 - 0.8 * (x * x + z * z);
    const s = 0.14 + 0.07 * j;
    add(s, 0.16 + 0.06 * j, s, x + (k - 0.5) * 0.05, y + (k - 0.5) * 0.04, z + (j - 0.5) * 0.05);
  }
  // A few taller crown pops for a rounded, lifted top (not a flat helmet).
  add(0.16, 0.16, 0.16, -0.06, 0.48, 0.0);
  add(0.15, 0.15, 0.15, 0.08, 0.47, -0.05);
  add(0.14, 0.14, 0.14, 0.0, 0.49, 0.08);
  // Lower curls hanging over the temples and nape (front row skipped: face open).
  for (const x of cols) for (const z of cols) {
    if (Math.max(Math.abs(x), Math.abs(z)) < 0.26) continue;
    if (z > 0.13) continue;
    const j = hash01(x + 5.1, z - 3.7);
    add(0.15 + 0.04 * j, 0.22 + 0.07 * j, 0.15 + 0.04 * j, x * 1.04, 0.06 - 0.03 * j, z * 1.04);
  }
  return mergeGeometries(cubes);
}

// Eyes + an upturned smile, tiny dark rectangles on the head's +Z front face only.
// The smile is a centre bar plus two raised corner pixels so it reads friendly,
// not the flat neutral line of the previous build.
function addFace(head: THREE.Mesh): void {
  const ink = new THREE.MeshStandardMaterial({ color: INK });
  const fz = 0.225;
  for (const ex of [-0.1, 0.1]) {
    const eye = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.08, 0.02), ink);
    eye.position.set(ex, 0.04, fz); head.add(eye);
  }
  const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.035, 0.02), ink);
  mouth.position.set(0, -0.14, fz); head.add(mouth);
  for (const cx of [-0.075, 0.075]) {
    const corner = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.035, 0.02), ink);
    corner.position.set(cx, -0.115, fz); head.add(corner);
  }
}

// Brown backpack: a rear box, a back pocket, a top grab-handle, and two front
// shoulder straps set wide so the white tee reads between them. One named group.
function makeBackpack(): THREE.Group {
  const pack = new THREE.Group();
  pack.name = "backpack";
  const brown = new THREE.MeshStandardMaterial({ color: PACK });
  const dark = new THREE.MeshStandardMaterial({ color: PACK_DARK });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.62, 0.26), brown);
  body.position.set(0, 1.16, -0.3); body.castShadow = true; pack.add(body);
  const pocket = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.2, 0.06), dark);
  pocket.position.set(0, 1.04, -0.44); pack.add(pocket);
  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.06, 0.07), brown);
  handle.position.set(0, 1.5, -0.34); handle.castShadow = true; pack.add(handle);
  for (const sx of [-0.2, 0.2]) {
    const strap = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.56, 0.06), brown);
    strap.position.set(sx, 1.17, 0.17); strap.castShadow = true; pack.add(strap);
  }
  return pack;
}

export function makeHumanoid(palette: HumanoidPalette): Humanoid {
  const group = new THREE.Group();
  const jacket = palette.shirt;
  const jacketDark = darken(jacket, 0.62);

  // Torso: a blue jacket box, darker side panels, two darker lapel strips, and a
  // thin white front shirt box down the centre.
  const torso = new THREE.Mesh(
    new THREE.BoxGeometry(0.52, 0.72, 0.32),
    new THREE.MeshStandardMaterial({ color: jacket }),
  );
  torso.name = "torso"; torso.position.y = 1.15; torso.castShadow = true;
  group.add(torso);
  const darkMat = new THREE.MeshStandardMaterial({ color: jacketDark });
  for (const sx of [-0.265, 0.265]) {
    const panel = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.72, 0.34), darkMat);
    panel.position.set(sx, 1.15, 0); panel.castShadow = true; group.add(panel);
  }
  // Open-jacket edges: thin dark strips flanking a wide white tee, so the front
  // reads as "blue jacket open over a white shirt" rather than a busy stripe.
  for (const lx of [-0.15, 0.15]) {
    const lapel = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.62, 0.04), darkMat);
    lapel.position.set(lx, 1.16, 0.164); group.add(lapel);
  }
  const shirt = new THREE.Mesh(
    new THREE.BoxGeometry(0.26, 0.6, 0.04),
    new THREE.MeshStandardMaterial({ color: WHITE_TEE }),
  );
  shirt.name = "shirt"; shirt.position.set(0, 1.15, 0.161); group.add(shirt);

  // Head + ears + face + spiky hair.
  const head = new THREE.Mesh(
    new THREE.BoxGeometry(0.44, 0.44, 0.44),
    new THREE.MeshStandardMaterial({ color: palette.skin }),
  );
  head.name = "head"; head.position.y = 1.78; head.castShadow = true;
  for (const sx of [-0.23, 0.23]) {
    const ear = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.11, 0.12), new THREE.MeshStandardMaterial({ color: palette.skin }));
    ear.position.set(sx, -0.02, 0.02); head.add(ear);
  }
  addFace(head);
  const hair = new THREE.Mesh(hairGeometry(), new THREE.MeshStandardMaterial({ color: hairColorFor(palette) }));
  hair.name = "hair"; hair.castShadow = true; head.add(hair);
  group.add(head);

  // Backpack (rear box + pocket + two front straps).
  group.add(makeBackpack());

  // Navy legs with chunky black shoes; blue jacket sleeves with skin hands.
  const shoe = { color: SHOE_BLACK, height: 0.16, depth: 0.34 };
  const leftLeg = limb(0.2, 0.92, 0.22, palette.pants, 0.92, -0.13, shoe);
  const rightLeg = limb(0.2, 0.92, 0.22, palette.pants, 0.92, 0.13, shoe);
  const hand = { color: palette.skin, height: 0.16 };
  const leftArm = limb(0.18, 0.66, 0.2, jacket, 1.46, -0.35, hand);
  const rightArm = limb(0.18, 0.66, 0.2, jacket, 1.46, 0.35, hand);
  group.add(leftLeg, rightLeg, leftArm, rightArm);

  return { group, limbs: { leftLeg, rightLeg, leftArm, rightArm } };
}

export function animateWalk(limbs: HumanoidLimbs, phase: number, intensity: number): void {
  const s = Math.sin(phase) * intensity;
  limbs.leftLeg.rotation.x = s;
  limbs.rightLeg.rotation.x = -s;
  limbs.leftArm.rotation.x = -s * 0.8;
  limbs.rightArm.rotation.x = s * 0.8;
}
