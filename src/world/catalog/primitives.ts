// src/world/catalog/primitives.ts
//
// Core catalog primitives: ground, road, tree, flower, lamp, planter, bench.
// Each is defined in LOCAL space — centered on x=z=0, base at y=0, canonical
// front faces +z, ~1 unit = 1 metre. The engine applies position/rotation after.
//
// NO Math.random / Date.now — fully deterministic.

import * as THREE from "three";
import { defineObject } from "../system/registry";
import { tintedBox, mergeTinted, tintedMesh } from "../objects/voxel";
import { makeFlower } from "../objects/flower";
import { makeAFrameSign } from "../objects/aFrameSign";
import { makeAsphaltTexture, ROAD_W, GRAIN_M } from "../roads";
import { PALETTE } from "../palette";
import { PETAL } from "../objects/objectPalette";

// ---------------------------------------------------------------------------
// ground
// ---------------------------------------------------------------------------

defineObject("ground", {
  params: { size: 220 },
  build(p: { size: number }) {
    const geo = new THREE.PlaneGeometry(p.size, p.size);
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshStandardMaterial({ color: PALETTE.parkGrass });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.receiveShadow = true;
    return {
      mesh,
      colliders: [{ x: 0, y: -0.1, z: 0, hx: p.size / 2, hy: 0.1, hz: p.size / 2 }],
    };
  },
});

// ---------------------------------------------------------------------------
// road
// ---------------------------------------------------------------------------

defineObject("road", {
  params: { length: 60 },
  build(p: { length: number }) {
    const group = new THREE.Group();

    // Asphalt slab running along X.
    const slabH = 0.12;
    const slabGeo = new THREE.BoxGeometry(p.length, slabH, ROAD_W);
    const tex = makeAsphaltTexture();
    tex.repeat.set(
      Math.max(1, Math.round(p.length / GRAIN_M)),
      Math.max(1, Math.round(ROAD_W / GRAIN_M)),
    );
    const slabMat = new THREE.MeshStandardMaterial({ map: tex });
    const slab = new THREE.Mesh(slabGeo, slabMat);
    slab.position.set(0, slabH / 2, 0);
    slab.receiveShadow = true;
    group.add(slab);

    // Curbs: thin raised strips at each edge along Z.
    const curbH = 0.16;
    const curbW = 0.22;
    const curbZOff = ROAD_W / 2 + 0.15;
    const curbMat = new THREE.MeshStandardMaterial({ color: PALETTE.curb });
    for (const sign of [-1, 1] as const) {
      const cGeo = new THREE.BoxGeometry(p.length, curbH, curbW);
      const cMesh = new THREE.Mesh(cGeo, curbMat);
      cMesh.position.set(0, curbH / 2, sign * curbZOff);
      cMesh.receiveShadow = true;
      group.add(cMesh);
    }

    // Double-yellow center line: two thin flat boxes straddling z=0.
    const lineH = 0.01;
    const lineW = 0.12;
    const lineZOff = 0.17;
    const lineMat = new THREE.MeshStandardMaterial({ color: PALETTE.yellowLine });
    for (const sign of [-1, 1] as const) {
      const lGeo = new THREE.BoxGeometry(p.length, lineH, lineW);
      const lMesh = new THREE.Mesh(lGeo, lineMat);
      lMesh.position.set(0, slabH + 0.005, sign * lineZOff);
      group.add(lMesh);
    }

    return { mesh: group };
  },
});

// ---------------------------------------------------------------------------
// tree
// ---------------------------------------------------------------------------

defineObject("tree", {
  params: {},
  build(_p: Record<string, never>) {
    const parts = [
      // trunk
      tintedBox(0.32, 1.0, 0.32, 0, 0.5, 0, PALETTE.trunk),
      // lower canopy
      tintedBox(1.2, 0.7, 1.2, 0, 1.55, 0, PALETTE.leaf),
      // mid canopy
      tintedBox(0.9, 0.65, 0.9, 0, 2.1, 0, PALETTE.leaf),
      // top canopy
      tintedBox(0.55, 0.55, 0.55, 0, 2.6, 0, PALETTE.leafDeep),
    ];
    const mesh = tintedMesh(mergeTinted(parts));
    mesh.castShadow = true;
    return {
      mesh,
      obstacles: [{ x: 0, z: 0, w: 1.4, d: 1.4 }],
    };
  },
});

// ---------------------------------------------------------------------------
// flower
// ---------------------------------------------------------------------------

const FLOWER_COLOR_MAP: Record<string, number> = {
  red: PETAL[0],
  yellow: PETAL[1],
  white: PETAL[3],
};

defineObject("flower", {
  params: { color: "red", height: 0.34 },
  build(p: { color: string; height: number }) {
    const petalColor = FLOWER_COLOR_MAP[p.color] ?? PETAL[0];
    const geo = makeFlower({ petalColor, height: p.height });
    const mesh = tintedMesh(geo);
    return { mesh };
  },
});

// ---------------------------------------------------------------------------
// lamp
// ---------------------------------------------------------------------------

defineObject("lamp", {
  params: {},
  build(_p: Record<string, never>) {
    const parts = [
      // pole
      tintedBox(0.16, 2.6, 0.16, 0, 1.3, 0, PALETTE.lampPole),
      // lamp head body
      tintedBox(0.44, 0.22, 0.34, 0, 2.72, 0, PALETTE.lampPole),
      // warm glow panel (emissive-like warm color baked in)
      tintedBox(0.36, 0.12, 0.26, 0, 2.72, 0, PALETTE.lantern),
    ];
    const mesh = tintedMesh(mergeTinted(parts));
    mesh.castShadow = true;
    return {
      mesh,
      obstacles: [{ x: 0, z: 0, w: 0.5, d: 0.5 }],
    };
  },
});

// ---------------------------------------------------------------------------
// planter
// ---------------------------------------------------------------------------

defineObject("planter", {
  params: {},
  build(_p: Record<string, never>) {
    // Box base (wood-toned) + soil top layer.
    const baseParts = [
      tintedBox(2.2, 0.52, 0.9, 0, 0.26, 0, PALETTE.benchWood),
      // soil layer on top
      tintedBox(2.0, 0.12, 0.7, 0, 0.56, 0, 0x3a2a1c),
    ];
    const baseMesh = tintedMesh(mergeTinted(baseParts));

    // Three flowers standing on top of the soil.
    const flowerConfigs: Array<{ x: number; color: string }> = [
      { x: -0.65, color: "red" },
      { x: 0,     color: "yellow" },
      { x: 0.65,  color: "white" },
    ];
    const group = new THREE.Group();
    group.add(baseMesh);
    const soilTop = 0.62;
    for (const fc of flowerConfigs) {
      const geo = makeFlower({ petalColor: FLOWER_COLOR_MAP[fc.color] ?? PETAL[0], height: 0.32 });
      const fm = tintedMesh(geo);
      fm.position.set(fc.x, soilTop, 0);
      group.add(fm);
    }

    return {
      mesh: group,
      obstacles: [{ x: 0, z: 0, w: 2.4, d: 1.1 }],
    };
  },
});

// ---------------------------------------------------------------------------
// bench
// ---------------------------------------------------------------------------

defineObject("bench", {
  params: {},
  build(_p: Record<string, never>) {
    // Seat slab + two end supports (legs).
    const parts = [
      // seat slab
      tintedBox(1.8, 0.1, 0.46, 0, 0.46, 0, PALETTE.benchWood),
      // left support
      tintedBox(0.14, 0.46, 0.46, -0.76, 0.23, 0, PALETTE.curb),
      // right support
      tintedBox(0.14, 0.46, 0.46, 0.76, 0.23, 0, PALETTE.curb),
      // backrest
      tintedBox(1.8, 0.28, 0.08, 0, 0.76, -0.2, PALETTE.benchWood),
    ];
    const mesh = tintedMesh(mergeTinted(parts));
    mesh.castShadow = true;
    return {
      mesh,
      obstacles: [{ x: 0, z: 0, w: 1.8, d: 0.6 }],
    };
  },
});

// ---------------------------------------------------------------------------
// aFrameSign
// ---------------------------------------------------------------------------

defineObject("aFrameSign", {
  params: {},
  build(_p: Record<string, never>) {
    const mesh = makeAFrameSign();
    mesh.castShadow = true;
    return { mesh, obstacles: [{ x: 0, z: 0, w: 0.9, d: 0.7 }] };
  },
});
