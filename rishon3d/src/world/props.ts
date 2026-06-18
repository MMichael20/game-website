import * as THREE from "three";
import type { PropDef } from "./rishonMap";

export function makeTree(def: PropDef): THREE.Object3D {
  const g = new THREE.Group();
  g.position.set(def.x, 0, def.z);
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.24, 1.4, 8),
    new THREE.MeshStandardMaterial({ color: 0x6b4a2b }),
  );
  trunk.position.y = 0.7; trunk.castShadow = true;
  const foliage = new THREE.Mesh(
    new THREE.ConeGeometry(1.1, 2.2, 9),
    new THREE.MeshStandardMaterial({ color: 0x3f7d3a }),
  );
  foliage.position.y = 2.2; foliage.castShadow = true;
  g.add(trunk, foliage);
  return g;
}

export function makeStreetLight(def: PropDef): THREE.Object3D {
  const g = new THREE.Group();
  g.position.set(def.x, 0, def.z);
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.1, 3.4, 8),
    new THREE.MeshStandardMaterial({ color: 0x2b2b30 }),
  );
  pole.position.y = 1.7; pole.castShadow = true;
  const lamp = new THREE.Mesh(
    new THREE.BoxGeometry(0.4, 0.18, 0.4),
    new THREE.MeshStandardMaterial({ color: 0xffd98a, emissive: 0xffb24d, emissiveIntensity: 1.2 }),
  );
  lamp.position.y = 3.5;
  g.add(pole, lamp);
  return g;
}
