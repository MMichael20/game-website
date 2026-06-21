// src/world/catalog/pavement.ts
//
// A flat paver-stone slab for paving plazas / city blocks, using the SAME paver
// texture as the road sidewalks so the stone reads consistently. Visual only — no
// collider (walkable; the `ground` object owns the floor). Its y is baked into the
// geometry (~0.012) so it sits just above the grass ground (y=0) but below the road
// asphalt (y=0.02), letting the road markings stay visible on top.

import * as THREE from "three";
import { defineObject } from "../system/registry";
import { makeSidewalkTexture, PAVER_SUPER_M } from "../roads";

interface PavementParams { w: number; d: number }

defineObject("pavement", {
  params: { w: 112, d: 112 } as PavementParams,
  build(p: PavementParams) {
    const geo = new THREE.PlaneGeometry(p.w, p.d);
    geo.rotateX(-Math.PI / 2);
    geo.translate(0, 0.012, 0);
    const tex = makeSidewalkTexture();
    tex.repeat.set(
      Math.max(1, Math.round(p.w / PAVER_SUPER_M)),
      Math.max(1, Math.round(p.d / PAVER_SUPER_M)),
    );
    tex.needsUpdate = true;
    const mat = new THREE.MeshStandardMaterial({ map: tex });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.receiveShadow = true;
    return { mesh };
  },
});
