import * as THREE from "three";
import { Physics, RAPIER } from "../core/Physics";
import { makeBuilding, makeGround, makeRoad } from "./builders";
import type { RishonMap } from "./rishonMap";

export class World {
  constructor(scene: THREE.Scene, physics: Physics, public readonly map: RishonMap) {
    scene.add(makeGround(map));
    for (const r of map.roads) scene.add(makeRoad(r));

    // ground collider (thin fixed cuboid at y=0)
    const half = map.ground.size / 2;
    const groundBody = physics.world.createRigidBody(RAPIER.RigidBodyDesc.fixed());
    physics.world.createCollider(
      RAPIER.ColliderDesc.cuboid(half, 0.1, half).setTranslation(0, -0.1, 0),
      groundBody,
    );

    for (const b of map.buildings) {
      scene.add(makeBuilding(b));
      const body = physics.world.createRigidBody(
        RAPIER.RigidBodyDesc.fixed().setTranslation(b.x, b.height / 2, b.z),
      );
      physics.world.createCollider(
        RAPIER.ColliderDesc.cuboid(b.width / 2, b.height / 2, b.depth / 2),
        body,
      );
    }
  }

  get npcSpawns() { return this.map.npcSpawns; }
  get carSpawn() { return this.map.carSpawn; }
  get playerSpawn() { return this.map.playerSpawn; }
}
