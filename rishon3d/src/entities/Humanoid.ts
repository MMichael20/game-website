import * as THREE from "three";

export interface HumanoidPalette { skin: number; shirt: number; pants: number }
export interface HumanoidLimbs {
  leftLeg: THREE.Object3D; rightLeg: THREE.Object3D;
  leftArm: THREE.Object3D; rightArm: THREE.Object3D;
}
export interface Humanoid { group: THREE.Group; limbs: HumanoidLimbs }

function limb(width: number, height: number, depth: number, color: number, jointY: number, x: number): THREE.Group {
  // pivot group at the joint; mesh hangs below the pivot so rotation.x swings the free end
  const pivot = new THREE.Group();
  pivot.position.set(x, jointY, 0);
  const mat = new THREE.MeshStandardMaterial({ color });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), mat);
  mesh.position.y = -height / 2;
  mesh.castShadow = true;
  pivot.add(mesh);
  return pivot;
}

export function makeHumanoid(palette: HumanoidPalette): Humanoid {
  const group = new THREE.Group();

  const torso = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.7, 0.28),
    new THREE.MeshStandardMaterial({ color: palette.shirt }),
  );
  torso.position.y = 1.15; torso.castShadow = true;
  group.add(torso);

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 14, 14),
    new THREE.MeshStandardMaterial({ color: palette.skin }),
  );
  head.position.y = 1.72; head.castShadow = true;
  group.add(head);

  // legs hinge at hip (y ~0.9), length 0.9 -> feet near 0
  const leftLeg = limb(0.2, 0.9, 0.22, palette.pants, 0.9, -0.14);
  const rightLeg = limb(0.2, 0.9, 0.22, palette.pants, 0.9, 0.14);
  // arms hinge at shoulder (y ~1.45), length 0.65
  const leftArm = limb(0.16, 0.65, 0.18, palette.shirt, 1.45, -0.33);
  const rightArm = limb(0.16, 0.65, 0.18, palette.shirt, 1.45, 0.33);
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
