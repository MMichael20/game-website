import * as THREE from "three";
import { Physics, RAPIER } from "../core/Physics";
import { makeClouds } from "./clouds";
import { registerCatalog } from "./catalog";
import { buildWorld, type ResolvedPoi } from "./system/engine";
import { MAP, PLAYER_SPAWN, CAR_SPAWN, CAR_SPAWN_YAW, GROUND_SIZE } from "./map";

// New world: the whole scene comes from the manifest + engine. core/ runtime,
// player, camera, physics and sky are unchanged. Old hand-builders are retired.
export class World {
  readonly pois: ResolvedPoi[];
  readonly groundSize = GROUND_SIZE;
  readonly groundCenter = { x: 0, z: 0 };

  constructor(scene: THREE.Scene, physics: Physics) {
    registerCatalog();
    const built = buildWorld(MAP);
    scene.add(built.group);

    // The world is fully static after build: compute world matrices once, then
    // stop per-frame matrix recomputation across every static mesh. Entities
    // (player, car, NPCs, clouds) are separate objects and are unaffected.
    built.group.updateMatrixWorld(true);
    built.group.traverse((obj) => {
      obj.matrixAutoUpdate = false;
      obj.matrixWorldAutoUpdate = false;
    });

    const clouds = makeClouds();
    scene.add(clouds);

    for (const c of built.colliders) {
      const body = physics.world.createRigidBody(
        RAPIER.RigidBodyDesc.fixed().setTranslation(c.x, c.y, c.z),
      );
      physics.world.createCollider(RAPIER.ColliderDesc.cuboid(c.hx, c.hy, c.hz), body);
    }
    this.pois = built.pois;
  }

  get playerSpawn() { return PLAYER_SPAWN; }
  get carSpawn() { return CAR_SPAWN; }
  get carSpawnYaw() { return CAR_SPAWN_YAW; }
}
