import * as THREE from "three";
import { Physics, RAPIER } from "../core/Physics";
import { makeBuilding, makeGround } from "./builders";
import type { RishonMap } from "./rishonMap";
import { makeClouds } from "./clouds";
import { makeRestaurantStreet } from "./restaurantStreet";
import { restaurantColliders } from "./restaurantColliders";

// V1 COMPACT WORLD. The whole scene is the restaurant-block slice
// (makeRestaurantStreet: strip + patio + phone shop + taxi + pocket park + player
// house) sitting on a small framing ground. No procedural city, roads network,
// rail, airport, downtown park or street-furniture grid — those were deleted for
// the compact V1. The data-layer `map` carries only the framing ground, the one
// isHouse building (data only — geometry comes from playerHouse.ts) and the spawns.
export class World {
  constructor(scene: THREE.Scene, physics: Physics, public readonly map: RishonMap) {
    const center = map.ground.center ?? { x: 0, z: 0 };

    scene.add(makeGround(map));

    // keep the bright box-clouds the user likes, floated over the compact block.
    const clouds = makeClouds();
    clouds.position.set(center.x, 0, center.z);
    scene.add(clouds);

    scene.add(makeRestaurantStreet());

    // District collision: walk-in shells (open storefront), solid closed
    // restaurants + skyline infill + the player house.
    for (const c of restaurantColliders()) {
      const body = physics.world.createRigidBody(
        RAPIER.RigidBodyDesc.fixed().setTranslation(c.x, c.y, c.z),
      );
      physics.world.createCollider(RAPIER.ColliderDesc.cuboid(c.hx, c.hy, c.hz), body);
    }

    // ground collider (thin fixed cuboid at y=0), centered under the block.
    const half = map.ground.size / 2;
    const groundBody = physics.world.createRigidBody(RAPIER.RigidBodyDesc.fixed());
    physics.world.createCollider(
      RAPIER.ColliderDesc.cuboid(half, 0.1, half).setTranslation(center.x, -0.1, center.z),
      groundBody,
    );

    // Data-layer buildings (just the house in V1). Skip isHouse: the rich house
    // mesh + its collider come from playerHouse.ts / restaurantColliders, so we
    // don't double it with the generic box-building path. The loop stays for any
    // future non-house data building.
    for (const b of map.buildings) {
      if (b.isHouse) continue;
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
