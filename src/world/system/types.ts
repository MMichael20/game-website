import type * as THREE from "three";

export interface Vec2 { x: number; z: number }
/** Axis-aligned collider box (Rapier cuboid): center (x,y,z), half-extents (hx,hy,hz). */
export interface Box { x: number; y: number; z: number; hx: number; hy: number; hz: number }
/** NPC-avoid footprint rect: center (x,z), full size (w,d). */
export interface Rect { x: number; z: number; w: number; d: number }
/** A named seat: a point plus the yaw an NPC faces when sitting. */
export interface Seat extends Vec2 { faceYaw: number }
/** A point-of-interest tied to one of the object's anchors by name. */
export interface PoiSpec { kind: string; label: string; radius: number; anchor: string }

/** Everything an object knows about itself, in LOCAL space (centered on origin). */
export interface ObjectResult {
  mesh: THREE.Object3D;
  colliders?: Box[];
  obstacles?: Rect[];
  anchors?: Record<string, Vec2 | Seat>;
  pois?: PoiSpec[];
}

/** A registered object type: default params + a pure builder. */
export interface ObjectDef<P extends object> {
  params: P;
  build(p: P): ObjectResult;
}

/** One placed instance in the map manifest. rot is degrees in {0,90,180,270}. */
export interface Placement {
  kind: string;
  x?: number;
  z?: number;
  rot?: number;
  params?: Record<string, unknown>;
}

/** A proximity trigger on a map: stand within r of (x,z), press E, and the world
 *  switches to map `to`, dropping the player at `toSpawn`. */
export interface Portal {
  x: number;
  z: number;
  r: number;
  prompt: string;
  to: string;
  toSpawn: Vec2;
}

/** A self-contained world: its manifest, spawn, portals and (optional) car. */
export interface MapDescriptor {
  id: string;
  map: Placement[];
  spawn: Vec2;
  groundSize: number;
  portals: Portal[];
  hasCar?: boolean;
  carSpawn?: Vec2;
  carSpawnYaw?: number;
}
