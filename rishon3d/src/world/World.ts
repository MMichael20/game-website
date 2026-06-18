import * as THREE from "three";
import { Physics, RAPIER } from "../core/Physics";
import { makeBuilding, makeGround } from "./builders";
import { treeInstances, bushInstances, makeStreetLight } from "./props";
import type { RishonMap } from "./rishonMap";
import { makeRoadNetwork } from "./roads";

export class World {
  constructor(scene: THREE.Scene, physics: Physics, public readonly map: RishonMap) {
    scene.add(makeGround(map));
    scene.add(makeRoadNetwork(map.roads));

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

    scene.add(treeInstances(map.props));
    scene.add(bushInstances(map.props));

    let lightBudget = 6;
    for (const p of map.props) {
      if (p.kind !== "streetlight") continue;
      const sl = makeStreetLight(p);
      scene.add(sl);
      if (lightBudget-- > 0) {
        const glow = new THREE.PointLight(0xffb24d, 8, 16, 2);
        glow.position.set(p.x, 3.4, p.z);
        scene.add(glow);
      }
    }
  }

  get npcSpawns() { return this.map.npcSpawns; }
  get carSpawn() { return this.map.carSpawn; }
  get playerSpawn() { return this.map.playerSpawn; }
}
