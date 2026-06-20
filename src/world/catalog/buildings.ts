// src/world/catalog/buildings.ts
//
// Catalog objects for architectural shells and storefronts.
//
// buildingShell — a hollow walk-in box (open front) with colliders.
// storefront    — a glass facade panel placed at the shell's front plane.
//
// LOCAL-SPACE conventions:
//   - centered on x=z=0, base at y=0.
//   - FRONT faces +z.
//   - ~1 unit = 1 metre.
//
// NO Math.random / Date.now — fully deterministic.

import * as THREE from "three";
import { defineObject } from "../system/registry";
import { tintedBox, mergeTinted, tintedMesh } from "../objects/voxel";
import { makeGlassPanel } from "../objects/glass";
import { makeAwning } from "../objects/awning";
import { makeTextSignMesh } from "../objects/textSign";
import { PALETTE } from "../palette";

// ─── buildingShell ────────────────────────────────────────────────────────────
//
// A hollow rectangular box open at the front (z = +d/2). Floor, ceiling, back
// wall and two side walls are merged into a single tinted mesh. Colliders cover
// the closed surfaces plus two short front "return" flanks so the open centre
// doorway stays walk-through while the corners still block the player.

const WALL_T = 0.3;    // wall / floor / ceiling thickness (m)
const RETURN_W = 1.0;  // width of front-corner return walls

interface ShellParams {
  w: number;
  d: number;
  h: number;
}

defineObject("buildingShell", {
  params: { w: 8, d: 8, h: 6 } as ShellParams,
  build(p: ShellParams) {
    const { w, d, h } = p;
    const T = WALL_T;

    // Interior wall color: pale warm white.
    const wallColor = 0xf0ede6;

    // ── Geometry (merged) ──────────────────────────────────────────────────
    const parts: THREE.BufferGeometry[] = [];

    // Floor: thin slab at y≈T/2.
    parts.push(tintedBox(w, T, d, 0, T / 2, 0, wallColor));

    // Ceiling: thin slab at y = h - T/2.
    parts.push(tintedBox(w, T, d, 0, h - T / 2, 0, wallColor));

    // Back wall at z = -d/2 (fully closed).
    parts.push(tintedBox(w, h, T, 0, h / 2, -d / 2, wallColor));

    // Left side wall at x = -w/2.
    parts.push(tintedBox(T, h, d, -w / 2, h / 2, 0, wallColor));

    // Right side wall at x = +w/2.
    parts.push(tintedBox(T, h, d, w / 2, h / 2, 0, wallColor));

    // Front face is OPEN — no mesh wall placed here.

    const mesh = tintedMesh(mergeTinted(parts));

    // ── Colliders (center + half-extents) ─────────────────────────────────
    const hh = h / 2; // half height
    const colliders = [
      // Floor
      { x: 0,       y: T / 2,       z: 0,         hx: w / 2,      hy: T / 2,      hz: d / 2 },
      // Ceiling
      { x: 0,       y: h - T / 2,   z: 0,         hx: w / 2,      hy: T / 2,      hz: d / 2 },
      // Back wall
      { x: 0,       y: hh,          z: -d / 2,    hx: w / 2,      hy: hh,         hz: T / 2 },
      // Left wall
      { x: -w / 2,  y: hh,          z: 0,         hx: T / 2,      hy: hh,         hz: d / 2 },
      // Right wall
      { x: w / 2,   y: hh,          z: 0,         hx: T / 2,      hy: hh,         hz: d / 2 },
      // Front return — left corner (from left edge inward by RETURN_W).
      {
        x: -w / 2 + RETURN_W / 2,
        y: hh,
        z: d / 2,
        hx: RETURN_W / 2,
        hy: hh,
        hz: T / 2,
      },
      // Front return — right corner.
      {
        x: w / 2 - RETURN_W / 2,
        y: hh,
        z: d / 2,
        hx: RETURN_W / 2,
        hy: hh,
        hz: T / 2,
      },
    ];

    return { mesh, colliders };
  },
});

// ─── storefront ───────────────────────────────────────────────────────────────
//
// A glass shopfront facade placed at the shell's front plane (local z = +d/2).
// The facade is built in its own local space (z=0 = the facade plane) and should
// be positioned at z = d/2 by the scene author when pairing with a buildingShell.
//
// Structure (bottom to top):
//   baseTrim  — a thin slab at the ground (matches curb color).
//   glass area — full-width glass panels from baseTrim top to header underside.
//                A centered door gap (~1.4 m wide) gets a door panel.
//                Slim vertical mullion boxes divide the remaining panels.
//   header    — solid colored strip carrying the lit sign band.
//   awning    — mounted at the header underside, protrudes +z.
//   signBand  — attached to the header face.
//
// Returns { mesh: THREE.Group }.  Collision comes from the shell.

const HEADER_FRAC = 0.35;   // header as a fraction of h (capped at 1.4 m)
const BASE_TRIM_H = 0.18;   // height of the base trim slab
const DOOR_GAP_W  = 2.4;    // door opening width (wide double-door entrance)
const INSET       = 0.05;   // small inset at each side
const MULLION_T   = 0.08;   // slim vertical mullion box half-width (full = 2×)

interface StorefrontParams {
  w: number;
  h: number;
  d: number;
  signText: string;
  awningColor: number;
  fullGlass: boolean;
  signColor: number;   // header sign board color (warm red by default)
}

defineObject("storefront", {
  params: {
    w: 8,
    h: 6,
    d: 8,
    signText: "SHOP",
    awningColor: PALETTE.awningBlue,
    fullGlass: true,
    signColor: PALETTE.awningRed,
  } as StorefrontParams,
  build(p: StorefrontParams) {
    const { w, h } = p;

    const group = new THREE.Group();

    // ── Dimensions ────────────────────────────────────────────────────────
    const headerH   = Math.min(1.4, h * HEADER_FRAC);
    const glassBaseY = BASE_TRIM_H;              // where glass starts
    const glassTopY  = h - headerH;              // where glass ends (= header bottom)
    const glassH     = glassTopY - glassBaseY;

    // usable width after insets on each side.
    const usableW    = w - INSET * 2;

    // ── Opaque parts (merged) ─────────────────────────────────────────────
    const opaqueParts: THREE.BufferGeometry[] = [];

    // Header strip (full width, houseBody color).
    opaqueParts.push(
      tintedBox(w, headerH, 0.25, 0, h - headerH / 2, 0, PALETTE.houseBody),
    );

    // Base trim (full width, curb color).
    opaqueParts.push(
      tintedBox(w, BASE_TRIM_H, 0.2, 0, BASE_TRIM_H / 2, 0, PALETTE.curb),
    );

    // Vertical mullions between glass panels.
    // Layout: left panel | door gap | right panel, with mullions at boundaries.
    // Door gap is centered.
    const doorLeft  = -DOOR_GAP_W / 2;
    const doorRight =  DOOR_GAP_W / 2;

    // Left panel boundary x values: from -usableW/2 to doorLeft.
    // Right panel boundary x values: from doorRight to +usableW/2.

    // Center mullions flanking the door gap.
    opaqueParts.push(
      tintedBox(MULLION_T * 2, glassH, 0.1, doorLeft - MULLION_T, glassBaseY + glassH / 2, 0, PALETTE.frame),
    );
    opaqueParts.push(
      tintedBox(MULLION_T * 2, glassH, 0.1, doorRight + MULLION_T, glassBaseY + glassH / 2, 0, PALETTE.frame),
    );

    // Outer mullions at facade edges.
    opaqueParts.push(
      tintedBox(MULLION_T * 2, glassH, 0.1, -usableW / 2 - INSET, glassBaseY + glassH / 2, 0, PALETTE.frame),
    );
    opaqueParts.push(
      tintedBox(MULLION_T * 2, glassH, 0.1, usableW / 2 + INSET, glassBaseY + glassH / 2, 0, PALETTE.frame),
    );

    const opaqueMesh = tintedMesh(mergeTinted(opaqueParts));
    group.add(opaqueMesh);

    // ── Glass panels (transparent — added as Group children) ──────────────
    // Left panel (from -usableW/2 to doorLeft).
    const leftPanelW  = Math.max(0.1, doorLeft - (-usableW / 2) - MULLION_T * 2);
    const leftPanelCX = (-usableW / 2 + doorLeft) / 2;

    const leftPanel = makeGlassPanel({ w: leftPanelW, h: glassH });
    leftPanel.position.set(leftPanelCX, glassBaseY, 0);
    group.add(leftPanel);

    // Right panel (from doorRight to +usableW/2).
    const rightPanelW  = Math.max(0.1, usableW / 2 - doorRight - MULLION_T * 2);
    const rightPanelCX = (doorRight + usableW / 2) / 2;

    const rightPanel = makeGlassPanel({ w: rightPanelW, h: glassH });
    rightPanel.position.set(rightPanelCX, glassBaseY, 0);
    group.add(rightPanel);

    // Door panel (centered, door=true adds handle + center seam).
    const doorPanel = makeGlassPanel({ w: DOOR_GAP_W, h: glassH, door: true });
    doorPanel.position.set(0, glassBaseY, 0);
    group.add(doorPanel);

    // ── Awning (mounted at header underside, protrudes +z) ────────────────
    const awningGeo = makeAwning({
      w,
      colorA: p.awningColor,
      colorB: PALETTE.awningStripe,
      depth: 1.1,
    });
    const awningMesh = tintedMesh(awningGeo);
    // Awning convention: mounting edge at y=0 → translate up to header base.
    awningMesh.position.set(0, glassTopY, 0);
    group.add(awningMesh);

    // ── Lit sign band on the header face (shows the real shop name) ─────────
    if (p.signText) {
      const signH = Math.min(0.7, headerH * 0.75);
      const signGroup = makeTextSignMesh({
        text: p.signText,
        w: w * 0.8,
        h: signH,
        boardColor: p.signColor ?? PALETTE.awningRed,
      });
      // Sign convention: back face at z=0, grows +z, base at y=0.
      // Place it centered on the header, flush with the header face (+z side).
      signGroup.position.set(0, h - headerH + (headerH - signH) / 2, 0.13);
      group.add(signGroup);
    }

    return { mesh: group };
  },
});
