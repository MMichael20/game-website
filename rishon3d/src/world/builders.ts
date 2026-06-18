import * as THREE from "three";
import type { BuildingDef, RishonMap, RoadDef } from "./rishonMap";

export function makeGround(map: RishonMap): THREE.Mesh {
  const geo = new THREE.PlaneGeometry(map.ground.size, map.ground.size);
  const mat = new THREE.MeshStandardMaterial({ color: 0x5a7d4f });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.receiveShadow = true;
  return mesh;
}

export function makeRoad(def: RoadDef): THREE.Mesh {
  const w = def.horizontal ? def.length : 6;
  const d = def.horizontal ? 6 : def.length;
  const geo = new THREE.PlaneGeometry(w, d);
  const mat = new THREE.MeshStandardMaterial({ color: 0x3a3a40 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(def.x, 0.02, def.z);
  mesh.receiveShadow = true;
  return mesh;
}

export function makeBuilding(def: BuildingDef): THREE.Mesh {
  const geo = new THREE.BoxGeometry(def.width, def.height, def.depth);
  const mat = new THREE.MeshStandardMaterial({ color: def.color });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(def.x, def.height / 2, def.z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}
