import * as THREE from "three";
import { Physics, RAPIER } from "../core/Physics";
import { makeClouds } from "./clouds";
import { registerCatalog } from "./catalog";
import { buildWorld, type ResolvedPoi } from "./system/engine";
import { MAPS } from "./maps";
import { cachedAssetSets } from "./assets";
import { mergeStaticChunks, type DetailChunk } from "./chunkMerge";
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
  // The whole static world shares ONE fixed rigid body; each collider is attached
  // to it with its own translation. Static bodies aren't simulated, so collapsing
  // N bodies to 1 (+ N colliders) cuts body bookkeeping/memory with no behaviour
  // change. Removing the body on unload() drops all its colliders with it.
  private staticBody: RAPIER.RigidBody | null = null;
  // Merged small-prop chunks, distance-culled each frame via cullDetails().
  private detailChunks: DetailChunk[] = [];
  private static readonly DETAIL_CULL_DIST = 160;
  private _carSpawn: Vec2 = { x: 0, z: 0 };
  private _carSpawnYaw = 0;

  constructor(private scene: THREE.Scene, private physics: Physics) {
    registerCatalog();
    this.scene.add(makeClouds()); // global sky, not per-map
    this.load(MAPS.city);
  }

  load(desc: MapDescriptor): void {
    const built = buildWorld(desc.map);

    // Collapse all shared-voxel-material meshes into a few per-cell chunk meshes
    // (one draw call per cell instead of per object). Returns the small-prop
    // "detail" chunks so we can distance-cull them in cullDetails().
    this.detailChunks = mergeStaticChunks(built.group);

    // The world is fully static after build: compute world matrices once, then
    // stop per-frame matrix recomputation across every static mesh.
    built.group.updateMatrixWorld(true);
    built.group.traverse((obj) => {
      obj.matrixAutoUpdate = false;
      obj.matrixWorldAutoUpdate = false;
    });
    this.scene.add(built.group);
    this.group = built.group;

    if (built.colliders.length) {
      const body = this.physics.world.createRigidBody(RAPIER.RigidBodyDesc.fixed());
      for (const c of built.colliders) {
        this.physics.world.createCollider(
          RAPIER.ColliderDesc.cuboid(c.hx, c.hy, c.hz).setTranslation(c.x, c.y, c.z),
          body,
        );
      }
      this.staticBody = body;
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
    if (this.staticBody) {
      this.physics.world.removeRigidBody(this.staticBody); // drops its colliders too
      this.staticBody = null;
    }
    this.detailChunks = []; // meshes are inside `group`, disposed above
  }

  // Hide merged small-prop chunks beyond DETAIL_CULL_DIST of the camera (squared
  // compare, padded by the chunk radius so a cell only vanishes once fully past the
  // limit). Frustum culling already handles off-screen chunks; this drops far ones.
  cullDetails(camX: number, camZ: number): void {
    const d = World.DETAIL_CULL_DIST;
    for (const c of this.detailChunks) {
      const lim = d + c.r;
      const dx = c.cx - camX, dz = c.cz - camZ;
      c.mesh.visible = dx * dx + dz * dz <= lim * lim;
    }
  }

  get playerSpawn() { return this.spawn; }
  get carSpawn() { return this._carSpawn; }
  get carSpawnYaw() { return this._carSpawnYaw; }
}
