// src/world/catalog/stores.ts
//
// Composite store catalog objects: phoneRepairShop and restaurant.
//
// LOCAL-SPACE conventions (same as all catalog objects):
//   - centered on x=z=0, base at y=0.
//   - FRONT faces +z (storefront is at z = +d/2).
//   - ~1 unit = 1 metre.
//
// NO Math.random / Date.now — fully deterministic.

import * as THREE from "three";
import { defineObject } from "../system/registry";
import { buildObject } from "../system/registry";
import { applyTransform } from "../system/transform";
import type { ObjectResult, Box, Rect, Vec2, Seat, PoiSpec } from "../system/types";
import { tintedBox, mergeTinted, tintedMesh } from "../objects/voxel";
import { makePhone, PHONE_SCREENS } from "../objects/phone";
import { makeCounterKit, makeDisplayShelf } from "../kits";
import { PALETTE } from "../palette";
import type { Rect as WanderRect } from "../../game/wander";

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Convert a kit Rect (minX/maxX/minZ/maxZ) to a system Rect (x,z,w,d).
 * This bridges kits.ts (which uses game/wander.Rect) to the catalog system
 * (which uses system/types.Rect).
 */
function kitRectToSystemRect(r: WanderRect): Rect {
  return {
    x: (r.minX + r.maxX) / 2,
    z: (r.minZ + r.maxZ) / 2,
    w: r.maxX - r.minX,
    d: r.maxZ - r.minZ,
  };
}

/**
 * Wrap a kit object + obstacles into a minimal ObjectResult (in local space)
 * so applyTransform can offset/rotate it within a composite.
 * Kit geometry is already placed at the x/z the kit was built at, so we
 * pass x:0, z:0, rot:0 when the kit was created at origin (x:0, z:0).
 */
function kitToResult(kit: { object: THREE.Object3D; obstacles: WanderRect[] }): ObjectResult {
  return {
    mesh: kit.object,
    obstacles: kit.obstacles.map(kitRectToSystemRect),
  };
}

/**
 * Compose multiple ObjectResults into one group-based ObjectResult.
 * Anchors and pois must be set directly on the result after composition
 * (they are already in composite-local coords).
 */
function compose(parts: ObjectResult[]): ObjectResult {
  const group = new THREE.Group();
  const colliders: Box[] = [];
  const obstacles: Rect[] = [];
  const anchors: Record<string, Vec2 | Seat> = {};
  const pois: PoiSpec[] = [];

  for (const p of parts) {
    group.add(p.mesh);
    if (p.colliders) colliders.push(...p.colliders);
    if (p.obstacles) obstacles.push(...p.obstacles);
    if (p.anchors) {
      for (const [k, v] of Object.entries(p.anchors)) anchors[k] = v;
    }
    if (p.pois) pois.push(...p.pois);
  }

  return { mesh: group, colliders, obstacles, anchors, pois };
}

// ---------------------------------------------------------------------------
// phoneRepairShop
// ---------------------------------------------------------------------------
//
// A small repair shop: shell + glass storefront + wide service counter near the
// back + wall display shelves along the back wall + phones on the counter.
//
// Params: w=18 (width), d=14 (depth), h=6 (height). All in metres.

interface PhoneShopParams {
  w: number;
  d: number;
  h: number;
}

defineObject("phoneRepairShop", {
  params: { w: 18, d: 14, h: 6 } as PhoneShopParams,
  build(p: PhoneShopParams) {
    const { w, d, h } = p;
    const parts: ObjectResult[] = [];

    // ── Building shell (colliders for floor/ceiling/walls) ──────────────────
    const shell = buildObject("buildingShell", { w, d, h });
    parts.push(applyTransform(shell, { x: 0, z: 0, rot: 0 }));

    // ── Storefront (glass facade at the front face, z = +d/2) ───────────────
    // The storefront build() produces geometry in its own local space (z=0 = facade).
    // applyTransform offsets its mesh to z = d/2 inside our composite.
    const front = buildObject("storefront", {
      w,
      h,
      d,
      signText: "Phone Repair",
      awningColor: PALETTE.awningBlue,
      fullGlass: true,
    });
    parts.push(applyTransform(front, { x: 0, z: d / 2, rot: 0 }));

    // ── Service counter near the back (counter body centered on x=0) ─────────
    // Counter width = 8m, placed at z = -d/2 + 2.0 (2m from back wall).
    const counterW = 8;
    const counterZ = -d / 2 + 2.0;
    const counterKit = makeCounterKit({ x: 0, z: 0, w: counterW });
    parts.push(applyTransform(kitToResult(counterKit), { x: 0, z: counterZ, rot: 0 }));

    // ── Wall display shelves along the back wall ─────────────────────────────
    // Three shelf units spread across the back wall, 0.4m in from z = -d/2.
    // Each shelfUnit is ~1.6m wide; place three of them at x = -4, 0, +4.
    const shelfZ = -d / 2 + 0.4;
    for (const sx of [-4, 0, 4]) {
      const shelf = makeDisplayShelf({ x: 0, z: 0 });
      parts.push(applyTransform(kitToResult(shelf), { x: sx, z: shelfZ, rot: 0 }));
    }

    // ── Phone display on the counter top ────────────────────────────────────
    // Merge 4 phone geometries into one vertex-colored mesh, sitting atop the counter.
    // Counter top is at y ≈ 0.88 (from counterGeo). Phones are ~0.84m tall (default),
    // so we scale them down to 0.2h (height). Place them spaced along the counter.
    const phoneParts: THREE.BufferGeometry[] = [];
    const phoneW = 0.18;
    const phoneH = 0.25;
    const phonePositions: [number, number, number, number][] = [
      [-2.4, 0, phoneW, phoneH],
      [-0.8, 0, phoneW, phoneH],
      [0.8, 0, phoneW, phoneH],
      [2.4, 0, phoneW, phoneH],
    ];
    for (let i = 0; i < phonePositions.length; i++) {
      const [px, , pw, ph] = phonePositions[i];
      const screenColor = PHONE_SCREENS[i % PHONE_SCREENS.length];
      const geo = makePhone({ width: pw, height: ph, screenColor });
      // Translate each phone to its x offset and sit on counter top (y=0.88)
      geo.translate(px, 0.88, 0);
      phoneParts.push(geo);
    }
    const phoneMesh = tintedMesh(mergeTinted(phoneParts));
    // The phone mesh is in a local group at z=counterZ
    const phoneGroup = new THREE.Group();
    phoneGroup.position.set(0, 0, counterZ);
    phoneGroup.add(phoneMesh);
    parts.push({ mesh: phoneGroup });

    // ── Compose all parts ────────────────────────────────────────────────────
    const result = compose(parts);

    // ── Anchors (composite-local coords, already correct — no double-offset) ─
    result.anchors = {
      door:    { x: 0, z: d / 2 } as Vec2,
      counter: { x: 0, z: counterZ } as Vec2,
      staff:   { x: 0, z: -d / 2 + 1.2, faceYaw: 0 } as Seat,
    };

    // ── POIs ─────────────────────────────────────────────────────────────────
    result.pois = [
      { kind: "phoneShop", label: "Phone Repair", radius: 4.5, anchor: "door" },
    ];

    return result;
  },
});

// ---------------------------------------------------------------------------
// restaurant
// ---------------------------------------------------------------------------
//
// A small eatery: shell + storefront + counter near the back + two indoor
// patio-style tables with chairs in the front half.
//
// Params: w=12, d=10, h=7, variant="bakery".

interface RestaurantParams {
  w: number;
  d: number;
  h: number;
  variant: string;
}

/** Simple inline voxel table (top + 4 legs), local origin at center/base. */
function makeInlineTable(): THREE.Object3D {
  const parts: THREE.BufferGeometry[] = [];
  // Tabletop
  parts.push(tintedBox(1.4, 0.16, 1.4, 0, 0.96, 0, PALETTE.benchWood));
  // Four legs
  for (const sx of [-0.58, 0.58]) {
    for (const sz of [-0.58, 0.58]) {
      parts.push(tintedBox(0.14, 0.96, 0.14, sx, 0.48, sz, PALETTE.benchWood));
    }
  }
  return tintedMesh(mergeTinted(parts));
}

/** Simple inline voxel chair, local origin at center/base. */
function makeInlineChair(): THREE.Object3D {
  const seat = tintedBox(0.56, 0.13, 0.56, 0, 0.55, 0, PALETTE.benchWood);
  const back = tintedBox(0.56, 0.62, 0.13, 0, 0.86, -0.22, PALETTE.benchWood);
  const legParts: THREE.BufferGeometry[] = [seat, back];
  for (const sx of [-0.23, 0.23]) {
    for (const sz of [-0.23, 0.23]) {
      legParts.push(tintedBox(0.1, 0.55, 0.1, sx, 0.275, sz, PALETTE.benchWood));
    }
  }
  return tintedMesh(mergeTinted(legParts));
}

defineObject("restaurant", {
  params: { w: 12, d: 10, h: 7, variant: "bakery" } as RestaurantParams,
  build(p: RestaurantParams) {
    const { w, d, h } = p;
    const parts: ObjectResult[] = [];

    // ── Building shell ───────────────────────────────────────────────────────
    const shell = buildObject("buildingShell", { w, d, h });
    parts.push(applyTransform(shell, { x: 0, z: 0, rot: 0 }));

    // ── Storefront ───────────────────────────────────────────────────────────
    const front = buildObject("storefront", {
      w,
      h,
      d,
      signText: "Restaurant",
      awningColor: PALETTE.awningRed,
      fullGlass: true,
    });
    parts.push(applyTransform(front, { x: 0, z: d / 2, rot: 0 }));

    // ── Service counter near the back ────────────────────────────────────────
    const counterW = 5;
    const counterZ = -d / 2 + 1.8;
    const counterKit = makeCounterKit({ x: 0, z: 0, w: counterW });
    parts.push(applyTransform(kitToResult(counterKit), { x: 0, z: counterZ, rot: 0 }));

    // ── Two indoor tables with chairs in the front half ──────────────────────
    // Table positions: front half of interior, z ≈ +2m from center, x = ±2.6
    const tablePositions: [number, number][] = [
      [-2.6, 2.0],
      [ 2.6, 2.0],
    ];

    const CHAIR_DIST = 0.95;
    // [dx, dz, faceYaw] — yaw faces TOWARD the table center
    const chairLayout: [number, number, number][] = [
      [0,           -CHAIR_DIST,  0],            // north chair, faces south (toward table)
      [0,            CHAIR_DIST,  Math.PI],       // south chair, faces north
      [-CHAIR_DIST,  0,           Math.PI / 2],   // west chair, faces east
      [ CHAIR_DIST,  0,          -Math.PI / 2],   // east chair, faces west
    ];

    // Collect seat anchors
    const anchors: Record<string, Vec2 | Seat> = {};
    let seatIdx = 0;

    for (const [tx, tz] of tablePositions) {
      // Table mesh
      const tableGroup = new THREE.Group();
      tableGroup.position.set(tx, 0, tz);
      const tableMesh = makeInlineTable();
      tableGroup.add(tableMesh);

      // Chair meshes
      for (const [cdx, cdz, cfaceYaw] of chairLayout) {
        const chairGroup = new THREE.Group();
        chairGroup.position.set(cdx, 0, cdz);
        chairGroup.rotation.y = cfaceYaw;
        chairGroup.add(makeInlineChair());
        tableGroup.add(chairGroup);

        // Seat anchor in composite-local coords
        const seatKey = `seat${seatIdx++}`;
        anchors[seatKey] = {
          x: tx + cdx,
          z: tz + cdz,
          faceYaw: cfaceYaw,
        } as Seat;
      }

      parts.push({ mesh: tableGroup });
    }

    // ── Compose ──────────────────────────────────────────────────────────────
    const result = compose(parts);

    // ── Anchors (composite-local) ────────────────────────────────────────────
    result.anchors = {
      door:    { x: 0, z: d / 2 } as Vec2,
      counter: { x: 0, z: counterZ } as Vec2,
      ...anchors,
    };

    // ── POIs ─────────────────────────────────────────────────────────────────
    result.pois = [
      { kind: "restaurant", label: "Restaurant", radius: 4.5, anchor: "door" },
    ];

    return result;
  },
});
