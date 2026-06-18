import * as THREE from "three";
import type { Vec2 } from "../world/rishonMap";

export class Npc {
  readonly object = new THREE.Group();

  constructor(scene: THREE.Scene, spawn: Vec2, color: number) {
    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.35, 0.8, 4, 8),
      new THREE.MeshStandardMaterial({ color }),
    );
    body.position.y = 0.9;
    body.castShadow = true;
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.28, 12, 12),
      new THREE.MeshStandardMaterial({ color: 0xf0c9a0 }),
    );
    head.position.y = 1.7;
    head.castShadow = true;
    this.object.add(body, head);
    this.object.position.set(spawn.x, 0, spawn.z);
    scene.add(this.object);
  }
}
