import * as THREE from "three";

export interface HumanoidPalette { skin: number; shirt: number; pants: number; hair?: number }
export interface HumanoidLimbs {
  leftLeg: THREE.Object3D; rightLeg: THREE.Object3D;
  leftArm: THREE.Object3D; rightArm: THREE.Object3D;
}
export interface Humanoid { group: THREE.Group; limbs: HumanoidLimbs }

// A small set of natural hair colors. When a palette omits `hair`, one is picked
// deterministically from the other colors so a crowd of NPCs varies without the
// callers having to supply a hair color.
export const HAIR_COLORS = [
  0x2a1c12, // dark brown
  0x14110f, // near-black
  0x6b4a2a, // chestnut
  0xb07b3a, // sandy
  0xd9b24a, // blonde
  0x8a8a90, // grey
];

export function hairColorFor(palette: HumanoidPalette): number {
  if (palette.hair !== undefined) return palette.hair;
  return HAIR_COLORS[(palette.shirt ^ palette.pants) % HAIR_COLORS.length];
}

// A limb is a pivot group at the joint with the limb mesh hanging below, so
// rotation.x swings the free end. An optional `cap` block (hand / shoe) is added
// at the free end and swings with the limb.
function limb(
  width: number, height: number, depth: number, color: number, jointY: number, x: number,
  cap?: { color: number; height: number; depth?: number },
): THREE.Group {
  const pivot = new THREE.Group();
  pivot.position.set(x, jointY, 0);
  const mat = new THREE.MeshStandardMaterial({ color });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), mat);
  mesh.position.y = -height / 2;
  mesh.castShadow = true;
  pivot.add(mesh);
  if (cap) {
    const d = cap.depth ?? depth * 1.12;
    const capMesh = new THREE.Mesh(
      new THREE.BoxGeometry(width * 1.06, cap.height, d),
      new THREE.MeshStandardMaterial({ color: cap.color }),
    );
    // sit at the free end; shoes (deeper) nudge forward so a toe pokes out
    capMesh.position.set(0, -height + cap.height / 2, cap.depth ? (cap.depth - depth) / 2 : 0);
    capMesh.castShadow = true;
    pivot.add(capMesh);
  }
  return pivot;
}

// Eyes + mouth drawn as small dark blocks proud of the head's +Z front face.
function addFace(head: THREE.Mesh): void {
  const ink = new THREE.MeshStandardMaterial({ color: 0x231f25 });
  const fz = 0.225; // just proud of the head front (head half-depth = 0.22)
  for (const ex of [-0.1, 0.1]) {
    const eye = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 0.02), ink);
    eye.position.set(ex, 0.04, fz);
    head.add(eye);
  }
  const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.035, 0.02), ink);
  mouth.position.set(0, -0.13, fz);
  head.add(mouth);
}

// A tousled voxel hairdo: a slab on the crown, a front fringe overhanging the
// brow, and a few spiky tufts. All children of the head so it turns with it.
function addHair(head: THREE.Mesh, color: number): void {
  const mat = new THREE.MeshStandardMaterial({ color });
  const crown = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.16, 0.5), mat);
  crown.position.y = 0.25; crown.castShadow = true;
  head.add(crown);
  const fringe = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 0.12), mat);
  fringe.position.set(0, 0.17, 0.22); fringe.castShadow = true;
  head.add(fringe);
  const tufts: [number, number, number][] = [
    [-0.16, 0.35, -0.08], [0.15, 0.36, 0.04], [0.0, 0.37, -0.16], [-0.05, 0.34, 0.15],
  ];
  for (const [tx, ty, tz] of tufts) {
    const tuft = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.14), mat);
    tuft.position.set(tx, ty, tz); tuft.castShadow = true;
    head.add(tuft);
  }
}

// A structured backpack: a body on the back, a front pocket, and two shoulder
// straps crossing the front of the torso. Returned as one named group.
function makeBackpack(): THREE.Group {
  const pack = new THREE.Group();
  pack.name = "backpack";
  pack.position.set(0, 1.16, 0);
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x8a6b4a });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.56, 0.2), bodyMat);
  body.position.z = -0.27; body.castShadow = true;
  pack.add(body);
  const pocketMat = new THREE.MeshStandardMaterial({ color: 0x6f5238 });
  const pocket = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.26, 0.08), pocketMat);
  pocket.position.set(0, -0.08, -0.39); pocket.castShadow = true;
  pack.add(pocket);
  const strapMat = new THREE.MeshStandardMaterial({ color: 0x4a3526 });
  for (const sx of [-0.16, 0.16]) {
    const strap = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.52, 0.06), strapMat);
    strap.position.set(sx, 0.04, 0.16); // proud of the torso front (depth/2 = 0.15)
    strap.castShadow = true;
    pack.add(strap);
  }
  return pack;
}

export function makeHumanoid(palette: HumanoidPalette): Humanoid {
  const group = new THREE.Group();

  const torso = new THREE.Mesh(
    new THREE.BoxGeometry(0.55, 0.72, 0.3),
    new THREE.MeshStandardMaterial({ color: palette.shirt }),
  );
  torso.name = "torso";
  torso.position.y = 1.15; torso.castShadow = true;
  group.add(torso);

  // Blocky cube head (Roblox-ish, slightly oversized), with a face + hair.
  const head = new THREE.Mesh(
    new THREE.BoxGeometry(0.44, 0.44, 0.44),
    new THREE.MeshStandardMaterial({ color: palette.skin }),
  );
  head.name = "head";
  head.position.y = 1.78; head.castShadow = true;
  addFace(head);
  addHair(head, hairColorFor(palette));
  group.add(head);

  // Structured backpack (body + pocket + shoulder straps).
  group.add(makeBackpack());

  // legs hinge at hip (y ~0.9), length 0.9 -> feet near 0; dark shoes at the feet
  const shoe = { color: 0x2b2a31, height: 0.14, depth: 0.32 };
  const leftLeg = limb(0.2, 0.9, 0.22, palette.pants, 0.9, -0.14, shoe);
  const rightLeg = limb(0.2, 0.9, 0.22, palette.pants, 0.9, 0.14, shoe);
  // arms hinge at shoulder (y ~1.45), length 0.65; skin-colored hands at the ends
  const hand = { color: palette.skin, height: 0.14 };
  const leftArm = limb(0.16, 0.65, 0.18, palette.shirt, 1.45, -0.35, hand);
  const rightArm = limb(0.16, 0.65, 0.18, palette.shirt, 1.45, 0.35, hand);
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
