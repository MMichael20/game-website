import * as THREE from "three";
import { Physics, RAPIER } from "../core/Physics";
import { makeClouds } from "./clouds";
import { registerCatalog } from "./catalog";
import { buildWorld, type ResolvedPoi } from "./system/engine";
import { MAPS } from "./maps";
import { cachedAssetSets } from "./assets";
import type { MapDescriptor, Portal, Vec2 } from "./system/types";

// The world is now RELOADABLE: load() builds a manifest and tracks every mesh +
// rigid body it creates so unload() can tear it down for a map switch. Sky/clouds
// are global (created once) and survive across maps. Entities (player, car, NPCs)
// are separate objects owned by Game and are unaffected by load/unload.
export class World {
  pois: ResolvedPoi[] = [];
  portals: Portal[] = [];
  spawn: Vec2 = { x: 0, z: 0 };
  groundSize = 140;
  readonly groundCenter = { x: 0, z: 0 };
  currentId = "";

  private group: THREE.Group | null = null;
  private bodies: RAPIER.RigidBody[] = [];
  private _carSpawn: Vec2 = { x: 0, z: 0 };
  private _carSpawnYaw = 0;

  constructor(private scene: THREE.Scene, private physics: Physics) {
    registerCatalog();
    this.scene.add(makeClouds()); // global sky, not per-map
    this.load(MAPS.city);
  }

  load(desc: MapDescriptor): void {
    const built = buildWorld(desc.map);

    // The world is fully static after build: compute world matrices once, then
    // stop per-frame matrix recomputation across every static mesh.
    built.group.updateMatrixWorld(true);
    built.group.traverse((obj) => {
      obj.matrixAutoUpdate = false;
      obj.matrixWorldAutoUpdate = false;
    });
    this.scene.add(built.group);
    this.group = built.group;

    for (const c of built.colliders) {
      const body = this.physics.world.createRigidBody(
        RAPIER.RigidBodyDesc.fixed().setTranslation(c.x, c.y, c.z),
      );
      this.physics.world.createCollider(RAPIER.ColliderDesc.cuboid(c.hx, c.hy, c.hz), body);
      this.bodies.push(body);
    }

    this.pois = built.pois;
    this.portals = desc.portals;
    this.spawn = desc.spawn;
    this.groundSize = desc.groundSize;
    this.currentId = desc.id;
    this._carSpawn = desc.carSpawn ?? this.spawn;
    this._carSpawnYaw = desc.carSpawnYaw ?? 0;
  }

  unload(): void {
    if (this.group) {
      this.scene.remove(this.group);
      // Dispose ONLY the fresh per-build resources. Geometries/materials owned by
      // the process-wide cache (assets.ts — shared glass/prop materials, reused
      // across maps) must survive; disposing them would corrupt the cache and
      // break rendering on the next load.
      const cached = cachedAssetSets();
      this.group.traverse((obj) => {
        const m = obj as THREE.Mesh;
        if (m.geometry && !cached.geometries.has(m.geometry)) m.geometry.dispose();
        const mat = m.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(mat)) mat.forEach((x) => { if (!cached.materials.has(x)) x.dispose(); });
        else if (mat && !cached.materials.has(mat)) mat.dispose();
      });
      this.group = null;
    }
    for (const b of this.bodies) this.physics.world.removeRigidBody(b);
    this.bodies = [];
  }

  get playerSpawn() { return this.spawn; }
  get carSpawn() { return this._carSpawn; }
  get carSpawnYaw() { return this._carSpawnYaw; }
}
