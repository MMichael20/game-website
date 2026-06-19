import * as THREE from "three";
import { Physics, RAPIER } from "../core/Physics";
import { makeBuilding, makeGround, makeAwnings } from "./builders";
import { treeInstances, bushInstances, makeStreetLight, benchInstances, flowerbedInstances, trashcanInstances, planterInstances } from "./props";
import type { RishonMap } from "./rishonMap";
import { makeRoadNetwork } from "./roads";
import { planParkedCars, parkedCarInstances } from "./parkedCars";
import { makeParkGround } from "./park";
import { makeClouds } from "./clouds";
import { makeRail } from "./rail";
import { makeStreetFurniture } from "./streetFurniture";
import { makeAirport } from "./airport";
import { makeRestaurantStreet } from "./restaurantStreet";
import { restaurantColliders } from "./restaurantColliders";

export class World {
  constructor(scene: THREE.Scene, physics: Physics, public readonly map: RishonMap) {
    scene.add(makeGround(map));
    scene.add(makeParkGround());
    scene.add(makeRoadNetwork(map.roads));
    scene.add(makeClouds());
    scene.add(makeRail());
    scene.add(makeAirport());
    scene.add(makeRestaurantStreet());

    // Restaurant-district collision: walk-in shell walls (open front), solid
    // closed restaurants + infill buildings. Lets the player enter the open
    // restaurant / phone shop through the doorway without phasing through walls.
    for (const c of restaurantColliders()) {
      const body = physics.world.createRigidBody(
        RAPIER.RigidBodyDesc.fixed().setTranslation(c.x, c.y, c.z),
      );
      physics.world.createCollider(RAPIER.ColliderDesc.cuboid(c.hx, c.hy, c.hz), body);
    }

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

    scene.add(makeAwnings(map.buildings));
    scene.add(treeInstances(map.props));
    scene.add(bushInstances(map.props));
    scene.add(benchInstances(map.props));
    scene.add(flowerbedInstances(map.props));
    scene.add(trashcanInstances(map.props));
    scene.add(planterInstances(map.props));
    scene.add(makeStreetFurniture(map));
    scene.add(parkedCarInstances(planParkedCars(map, 4242, 40)));

    let lightBudget = 12;
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
