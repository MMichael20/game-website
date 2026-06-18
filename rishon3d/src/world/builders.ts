import * as THREE from "three";
import type { BuildingDef, RishonMap } from "./rishonMap";
import { makeWindowTexture } from "./windows";
import { DUSK } from "../core/sky";

// One shared base window texture; cloned per building so each can tile its
// windows at a believable size via texture.repeat.
let WINDOW_TEX: THREE.DataTexture | null = null;
function windowTexture(): THREE.DataTexture {
  if (!WINDOW_TEX) WINDOW_TEX = makeWindowTexture();
  return WINDOW_TEX;
}

export function makeGround(map: RishonMap): THREE.Mesh {
  const geo = new THREE.PlaneGeometry(map.ground.size, map.ground.size);
  const mat = new THREE.MeshStandardMaterial({ color: 0x5a7d4f });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.receiveShadow = true;
  return mesh;
}


export function makeBuilding(def: BuildingDef): THREE.Object3D {
  if (def.isHouse) {
    const group = new THREE.Group();
    group.position.set(def.x, 0, def.z);

    // warm cream-colored body
    const bodyGeo = new THREE.BoxGeometry(def.width, def.height, def.depth);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xf0c98a });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = def.height / 2;
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    // terracotta-red pitched roof (cone approximation)
    const roofRadius = Math.max(def.width, def.depth) * 0.72;
    const roofHeight = def.height * 0.6;
    const roofGeo = new THREE.ConeGeometry(roofRadius, roofHeight, 4);
    const roofMat = new THREE.MeshStandardMaterial({ color: 0xb03a2e });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.y = def.height + roofHeight / 2;
    roof.rotation.y = Math.PI / 4; // align flat faces with walls
    roof.castShadow = true;
    group.add(roof);

    return group;
  }

  const geo = new THREE.BoxGeometry(def.width, def.height, def.depth);
  const tex = windowTexture().clone();
  tex.needsUpdate = true;
  tex.repeat.set(Math.max(1, Math.round(def.width / 3)), Math.max(1, Math.round(def.height / 3)));
  const mat = new THREE.MeshStandardMaterial({
    color: def.color,
    emissive: DUSK.windowEmissive,
    emissiveMap: tex,
    emissiveIntensity: DUSK.windowEmissiveIntensity,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(def.x, def.height / 2, def.z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}
