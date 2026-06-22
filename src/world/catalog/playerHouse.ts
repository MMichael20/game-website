// src/world/catalog/playerHouse.ts
//
// playerHouse — THE HERO object: the player's home. A large WALK-IN composite:
//   - two-storey main block, OPEN at the front door (walk-through gap)
//   - attached garage wing on the LEFT (-x), walk-in bay
//   - pitched gable roof with chimney + dormers; shed roof over the garage
//   - fully furnished interior (living room, kitchen, staircase, bedroom, bath)
//   - porch + entry path; back-yard pieces bound to the house (patio, BBQ,
//     garden table+chairs, tool shed, small pool)
//
// LOCAL space: centered x=z=0, base y=0, FRONT faces +z, ~1u=1m.
// The engine applies position/rotation on placement.
//
// DETERMINISM: NO Math.random / Date.now / new Date(). All variation via
// mulberry32(seed). Every child/furniture position is DERIVED from the named
// dimension constants declared once at the top of build() — no magic offsets.

import * as THREE from "three";
import { defineObject } from "../system/registry";
import { tintedBox, tintGeo, cylinderY, mergeTinted, tintedMesh } from "../objects/voxel";
import type { Box, Rect, Vec2, Seat, PoiSpec } from "../system/types";
import { PALETTE } from "../palette";
import { mulberry32 } from "../rng";

// A helper bundle returned by every sub-builder.
interface Piece {
  parts: THREE.BufferGeometry[];
  colliders?: Box[];
  obstacles?: Rect[];
}

interface PlayerHouseParams {
  seed: number;
}

defineObject("playerHouse", {
  params: { seed: 1 } as PlayerHouseParams,

  build(p: PlayerHouseParams) {
    const rng = mulberry32((p.seed >>> 0) || 1);

    // ── DIMENSIONS (declared once; everything derives from these) ────────────
    const W = 12;            // main block width (x)
    const D = 11;            // main block depth (z)
    const FLOOR_H = 3;       // per-storey height
    const FLOORS = 2;
    const T = 0.3;           // wall / slab thickness
    const totalH = FLOORS * FLOOR_H;

    const GAR_W = 6;         // garage wing width (x) on the LEFT (-x)
    const GAR_D = 7;         // garage depth (z)
    const GAR_H = 3;         // garage height
    const garCX = -(W / 2 + GAR_W / 2);   // garage center x (shares house left wall)
    // Garage front flush with house front (+z). Its center z so that front = D/2.
    const garCZ = D / 2 - GAR_D / 2;

    const DOOR_W = 1.6;      // walk-in front door gap (centered on +z)
    const DOOR_H = 2.3;      // door / doorway opening height

    // Staircase geometry — shared by makeShell (the 2nd-floor stairwell hole)
    // and makeInterior (the actual steps) so the hole and the steps line up.
    const STAIR_W = 1.2;                         // stair / opening width
    const STAIR_STEPS = 9;
    const STAIR_RUN = 0.30;                       // tread depth (z) per step
    const STAIR_CX = -W / 2 + T + STAIR_W / 2 + 0.1;  // hugs the left wall
    const STAIR_Z0 = -D / 2 + T;                  // first step at the inner back wall
    const STAIR_LEN = STAIR_RUN * STAIR_STEPS;    // total run length in z

    const PROUD = 0.06;      // window proudness off wall face

    // Exterior body colors (seeded, subtle).
    const BODY_CHOICES = [PALETTE.houseBody, 0xeaded0, 0xe6c79a, 0xe9c46a];
    const ROOF_CHOICES = [PALETTE.houseRoof, 0x8a5230, 0x4f6b7a, 0x7a5230];
    const bodyColor = BODY_CHOICES[Math.floor(rng() * BODY_CHOICES.length)];
    const roofColor = ROOF_CHOICES[Math.floor(rng() * ROOF_CHOICES.length)];
    const WALL_IN = 0xf0ede6;   // interior wall / floor color
    const TRIM = 0x33373d;      // dark window/door frame

    // ── small local window helper (frame + glass + sill, proud of the face) ──
    function addWindow(
      parts: THREE.BufferGeometry[],
      face: "+z" | "-z" | "+x" | "-x",
      off: number,    // horizontal offset along the wall
      cy: number,     // vertical center
      ww: number,     // window width
      wh: number,     // window height
      glassHex: number,
    ): void {
      const fw = ww + 0.12, fh = wh + 0.12;
      const sy = cy - wh / 2 - 0.05;
      if (face === "+z" || face === "-z") {
        const sign = face === "+z" ? 1 : -1;
        const zb = (sign * D) / 2;
        const zf = zb + sign * PROUD;
        const zg = zb + sign * PROUD * 1.4;
        const zm = zb + sign * PROUD * 1.7;
        parts.push(tintedBox(fw, fh, 0.05, off, cy, zf, PALETTE.winFrame));
        parts.push(tintedBox(ww, wh, 0.05, off, cy, zg, glassHex));
        parts.push(tintedBox(fw + 0.06, 0.08, 0.12, off, sy, zf, PALETTE.sillStone));
        parts.push(tintedBox(0.06, wh, 0.05, off, cy, zm, PALETTE.winFrame));
        parts.push(tintedBox(ww, 0.06, 0.05, off, cy, zm, PALETTE.winFrame));
      } else {
        const sign = face === "+x" ? 1 : -1;
        const xb = (sign * W) / 2;
        const xf = xb + sign * PROUD;
        const xg = xb + sign * PROUD * 1.4;
        const xm = xb + sign * PROUD * 1.7;
        parts.push(tintedBox(0.05, fh, fw, xf, cy, off, PALETTE.winFrame));
        parts.push(tintedBox(0.05, wh, ww, xg, cy, off, glassHex));
        parts.push(tintedBox(0.12, 0.08, fw + 0.06, xf, sy, off, PALETTE.sillStone));
        parts.push(tintedBox(0.05, wh, 0.06, xm, cy, off, PALETTE.winFrame));
        parts.push(tintedBox(0.05, 0.06, ww, xm, cy, off, PALETTE.winFrame));
      }
    }

    // ════════════════════════════════════════════════════════════════════════
    // makeShell — the two-storey walk-in main box
    // ════════════════════════════════════════════════════════════════════════
    function makeShell(): Piece {
      const parts: THREE.BufferGeometry[] = [];
      const colliders: Box[] = [];

      // Slabs: ground floor, second floor, flat ceiling (roof underside).
      parts.push(tintedBox(W, T, D, 0, T / 2, 0, PALETTE.tileCream));         // ground
      parts.push(tintedBox(W, T, D, 0, FLOOR_H, 0, WALL_IN));                 // 2nd floor
      parts.push(tintedBox(W, T, D, 0, totalH - T / 2, 0, WALL_IN));          // ceiling

      // Stone plinth around the base (exterior).
      parts.push(tintedBox(W + 0.2, 0.4, D + 0.2, 0, 0.2, 0, PALETTE.stoneBase));

      // Solid walls: back (-z), left (-x), right (+x). Exterior body color.
      parts.push(tintedBox(W, totalH, T, 0, totalH / 2, -D / 2, bodyColor));   // back
      parts.push(tintedBox(T, totalH, D, -W / 2, totalH / 2, 0, bodyColor));   // left
      parts.push(tintedBox(T, totalH, D, W / 2, totalH / 2, 0, bodyColor));    // right

      // FRONT (+z) wall: solid except a centered DOOR_W × DOOR_H gap.
      // Left segment | door gap | right segment, plus a lintel above the door.
      const segW = (W - DOOR_W) / 2;
      const lSegCX = -(DOOR_W / 2 + segW / 2);
      const rSegCX = DOOR_W / 2 + segW / 2;
      parts.push(tintedBox(segW, totalH, T, lSegCX, totalH / 2, D / 2, bodyColor));
      parts.push(tintedBox(segW, totalH, T, rSegCX, totalH / 2, D / 2, bodyColor));
      // Lintel above the doorway (from DOOR_H up to totalH).
      const lintelH = totalH - DOOR_H;
      parts.push(tintedBox(DOOR_W, lintelH, T, 0, DOOR_H + lintelH / 2, D / 2, bodyColor));

      // Visual front door slab (walk-through — NO collider across the gap).
      const dzf = D / 2 - 0.02;
      parts.push(tintedBox(DOOR_W - 0.1, DOOR_H - 0.05, 0.1, 0, (DOOR_H - 0.05) / 2, dzf, PALETTE.facadeDoor));
      // Door frame jambs + head.
      parts.push(tintedBox(0.1, DOOR_H, 0.12, -DOOR_W / 2, DOOR_H / 2, D / 2 + 0.02, TRIM));
      parts.push(tintedBox(0.1, DOOR_H, 0.12, DOOR_W / 2, DOOR_H / 2, D / 2 + 0.02, TRIM));
      parts.push(tintedBox(DOOR_W + 0.2, 0.12, 0.12, 0, DOOR_H + 0.06, D / 2 + 0.02, TRIM));
      // Door knob.
      parts.push(tintedBox(0.1, 0.1, 0.08, DOOR_W / 2 - 0.35, DOOR_H * 0.45, dzf + 0.06, 0xd9c089));

      // Windows: both storeys, exterior faces. Derive rows from floor heights.
      const winW = 1.2, winH = 1.3;
      const row1Y = FLOOR_H * 0.55;
      const row2Y = FLOOR_H + FLOOR_H * 0.55;
      // Front (+z): flank the door on the ground floor; full pair upstairs.
      const frontOff = DOOR_W / 2 + segW / 2;
      addWindow(parts, "+z", -frontOff, row1Y, winW, winH, PALETTE.glass);
      addWindow(parts, "+z", frontOff, row1Y, winW, winH, PALETTE.glassDark);
      addWindow(parts, "+z", -frontOff, row2Y, winW, winH, PALETTE.glassDark);
      addWindow(parts, "+z", frontOff, row2Y, winW, winH, PALETTE.glass);
      addWindow(parts, "+z", 0, row2Y, winW, winH, PALETTE.glass); // over the porch/balcony
      // Right (+x) face: both storeys, two columns.
      for (const oz of [-D * 0.25, D * 0.25]) {
        addWindow(parts, "+x", oz, row1Y, winW, winH, PALETTE.glass);
        addWindow(parts, "+x", oz, row2Y, winW, winH, PALETTE.glassDark);
      }
      // Back (-z) face: two columns, both storeys.
      for (const ox of [-W * 0.25, W * 0.25]) {
        addWindow(parts, "-z", ox, row1Y, winW, winH, PALETTE.glassDark);
        addWindow(parts, "-z", ox, row2Y, winW, winH, PALETTE.glass);
      }
      // Left (-x) face is shared with the garage low down; only upstairs windows.
      for (const oz of [-D * 0.25, D * 0.25]) {
        addWindow(parts, "-x", oz, row2Y, winW, winH, PALETTE.glass);
      }

      // Small upstairs balcony over the porch (+z), at the 2nd-floor level.
      const balW = DOOR_W + 1.6, balD = 1.2;
      const balY = FLOOR_H;
      const balZ = D / 2 + balD / 2;
      parts.push(tintedBox(balW, 0.15, balD, 0, balY + 0.075, balZ, PALETTE.deckPlankA));
      // Balcony rail (front + two sides).
      const railH = 0.5;
      parts.push(tintedBox(balW, railH, 0.08, 0, balY + 0.15 + railH / 2, balZ + balD / 2, PALETTE.balconyRail));
      parts.push(tintedBox(0.08, railH, balD, -balW / 2, balY + 0.15 + railH / 2, balZ, PALETTE.balconyRail));
      parts.push(tintedBox(0.08, railH, balD, balW / 2, balY + 0.15 + railH / 2, balZ, PALETTE.balconyRail));

      // ── COLLIDERS (buildingShell style) ──
      const hh = totalH / 2;
      colliders.push(
        { x: 0, y: T / 2, z: 0, hx: W / 2, hy: T / 2, hz: D / 2 },                  // ground floor
        { x: 0, y: FLOOR_H, z: 0, hx: W / 2, hy: T / 2, hz: D / 2 },                // 2nd floor (see stair hole note below)
        { x: 0, y: totalH - T / 2, z: 0, hx: W / 2, hy: T / 2, hz: D / 2 },         // ceiling
        { x: 0, y: hh, z: -D / 2, hx: W / 2, hy: hh, hz: T / 2 },                   // back wall
        { x: -W / 2, y: hh, z: 0, hx: T / 2, hy: hh, hz: D / 2 },                   // left wall
        { x: W / 2, y: hh, z: 0, hx: T / 2, hy: hh, hz: D / 2 },                    // right wall
        // Front return flanks (each side of the door gap).
        { x: lSegCX, y: hh, z: D / 2, hx: segW / 2, hy: hh, hz: T / 2 },
        { x: rSegCX, y: hh, z: D / 2, hx: segW / 2, hy: hh, hz: T / 2 },
      );
      // NOTE on the 2nd-floor slab: a full slab collider would seal the
      // stairwell. Instead we cut a rectangular HOLE in the slab collider that
      // lines up with the actual stairs (STAIR_CX / STAIR_Z0 / STAIR_LEN from
      // the top of build()), so the player can walk up and emerge onto the
      // upper floor. The slab is emitted as a front strip + a back-left strip +
      // a back-right strip surrounding that hole.
      colliders.splice(1, 1); // drop the full 2nd-floor slab pushed above
      const HOLE_MARGIN = 0.3;
      const holeX0 = STAIR_CX - STAIR_W / 2 - HOLE_MARGIN;
      const holeX1 = STAIR_CX + STAIR_W / 2 + HOLE_MARGIN;
      const holeZ1 = STAIR_Z0 + STAIR_LEN + HOLE_MARGIN; // a bit past the top step
      // Front strip: full width, z from holeZ1..D/2.
      const frontStripD = D / 2 - holeZ1;
      colliders.push({
        x: 0, y: FLOOR_H, z: (holeZ1 + D / 2) / 2,
        hx: W / 2, hy: T / 2, hz: frontStripD / 2,
      });
      // Back region (z from -D/2..holeZ1) split left & right of the hole.
      const backRegionD = holeZ1 - (-D / 2);
      const backRegionCZ = (-D / 2 + holeZ1) / 2;
      const leftStripW = holeX0 - (-W / 2);
      const rightStripW = W / 2 - holeX1;
      colliders.push({
        x: (-W / 2 + holeX0) / 2, y: FLOOR_H, z: backRegionCZ,
        hx: leftStripW / 2, hy: T / 2, hz: backRegionD / 2,
      });
      colliders.push({
        x: (holeX1 + W / 2) / 2, y: FLOOR_H, z: backRegionCZ,
        hx: rightStripW / 2, hy: T / 2, hz: backRegionD / 2,
      });

      return { parts, colliders };
    }

    // ════════════════════════════════════════════════════════════════════════
    // makeGarage — wing on -x, flush front, walk-in bay
    // ════════════════════════════════════════════════════════════════════════
    function makeGarage(): Piece {
      const parts: THREE.BufferGeometry[] = [];
      const colliders: Box[] = [];

      const frontZ = garCZ + GAR_D / 2;   // = D/2 (flush)
      const backZ = garCZ - GAR_D / 2;
      const outerX = garCX - GAR_W / 2;   // -x outer wall

      // Floor + flat roof slab.
      parts.push(tintedBox(GAR_W, T, GAR_D, garCX, T / 2, garCZ, PALETTE.curb));
      parts.push(tintedBox(GAR_W, T, GAR_D, garCX, GAR_H - T / 2, garCZ, WALL_IN));
      // Back wall (-z).
      parts.push(tintedBox(GAR_W, GAR_H, T, garCX, GAR_H / 2, backZ, bodyColor));
      // Outer -x wall.
      parts.push(tintedBox(T, GAR_H, GAR_D, outerX, GAR_H / 2, garCZ, bodyColor));
      // (Shared +x wall omitted — it is the house's left wall.)

      // Up-and-over garage door on +z: stacked horizontal slats.
      const slatCount = 6;
      const doorAreaH = GAR_H - 0.4;
      const slatH = doorAreaH / slatCount;
      const doorFaceZ = frontZ + 0.05;
      for (let s = 0; s < slatCount; s++) {
        const cy = 0.2 + slatH * (s + 0.5);
        parts.push(tintedBox(GAR_W - 0.2, slatH - 0.03, 0.06, garCX, cy, doorFaceZ, PALETTE.rollDoor));
      }
      // Door surround frame.
      parts.push(tintedBox(GAR_W + 0.1, 0.12, 0.1, garCX, doorAreaH + 0.2, doorFaceZ, TRIM));

      // Colliders: floor, back, outer wall, roof. Front bay left open (walk-in).
      colliders.push(
        { x: garCX, y: T / 2, z: garCZ, hx: GAR_W / 2, hy: T / 2, hz: GAR_D / 2 },
        { x: garCX, y: GAR_H - T / 2, z: garCZ, hx: GAR_W / 2, hy: T / 2, hz: GAR_D / 2 },
        { x: garCX, y: GAR_H / 2, z: backZ, hx: GAR_W / 2, hy: GAR_H / 2, hz: T / 2 },
        { x: outerX, y: GAR_H / 2, z: garCZ, hx: T / 2, hy: GAR_H / 2, hz: GAR_D / 2 },
      );

      return { parts, colliders };
    }

    // ════════════════════════════════════════════════════════════════════════
    // makeRoof — pitched gable over the main block + shed roof over the garage
    // ════════════════════════════════════════════════════════════════════════
    function makeRoof(): Piece {
      const parts: THREE.BufferGeometry[] = [];
      const eave = 0.3;
      const apex = 1.8;             // ridge height above totalH
      const fascia = 0xece7da;

      // Fascia / gutter band around the eaves.
      parts.push(tintedBox(W + eave * 2, 0.18, D + eave * 2, 0, totalH + 0.09, 0, fascia));

      // Gable ridge runs ALONG x. Two sloped slabs front/back meeting at ridge.
      const halfSpan = D / 2 + eave;                  // eave-to-ridge horizontal run
      const angle = Math.atan2(apex, halfSpan);
      const slantLen = Math.sqrt(halfSpan * halfSpan + apex * apex);
      const slabThick = 0.22;
      const slabW = W + eave * 2;
      const ridgeY = totalH + apex;
      const cyMid = totalH + apex / 2;
      // Back slope (-z).
      {
        const g = new THREE.BoxGeometry(slabW, slabThick, slantLen);
        g.rotateX(-angle);
        g.translate(0, cyMid, -halfSpan / 2);
        parts.push(tintGeo(g, roofColor));
      }
      // Front slope (+z).
      {
        const g = new THREE.BoxGeometry(slabW, slabThick, slantLen);
        g.rotateX(angle);
        g.translate(0, cyMid, halfSpan / 2);
        parts.push(tintGeo(g, roofColor));
      }
      // Ridge cap.
      parts.push(tintedBox(slabW, 0.14, 0.18, 0, ridgeY + 0.05, 0, roofColor));

      // Gable-end triangles (front +z / back -z) filled with a thin wedge.
      const gableH = apex + slabThick / 2;
      parts.push(tintedBox(W, gableH, 0.15, 0, totalH + gableH / 2, D / 2 + 0.075, bodyColor));
      parts.push(tintedBox(W, gableH, 0.15, 0, totalH + gableH / 2, -D / 2 - 0.075, bodyColor));

      // Chimney emerges THROUGH the back slope (derive from ridge height).
      const chX = W * 0.3;
      const chZ = -D * 0.22;
      const chBottom = totalH - 0.3;
      const chTop = ridgeY + 0.5;
      const chH = chTop - chBottom;
      parts.push(tintedBox(0.7, chH, 0.7, chX, chBottom + chH / 2, chZ, 0x8a5230));
      parts.push(tintedBox(0.82, 0.14, 0.82, chX, chTop + 0.07, chZ, PALETTE.stoneBase));

      // Two DORMERS on the +z slope (small box + tiny gable + glass window).
      // Place them on the front slope at ~mid-slope height.
      const dormY = totalH + apex * 0.45;        // vertical center of dormer body
      const dormZ = D * 0.22;                     // out on the front slope
      const dormW = 1.4, dormBodyH = 1.0, dormDepth = 1.0;
      for (const dx of [-W * 0.25, W * 0.25]) {
        parts.push(tintedBox(dormW, dormBodyH, dormDepth, dx, dormY, dormZ, bodyColor));
        // Tiny gable roof on the dormer.
        parts.push(tintedBox(dormW + 0.15, 0.12, dormDepth + 0.15, dx, dormY + dormBodyH / 2 + 0.06, dormZ, roofColor));
        // Glass window on the dormer front (+z).
        parts.push(tintedBox(dormW * 0.6, dormBodyH * 0.55, 0.05, dx, dormY, dormZ + dormDepth / 2 + 0.04, PALETTE.glass));
        parts.push(tintedBox(dormW * 0.6 + 0.1, dormBodyH * 0.55 + 0.1, 0.04, dx, dormY, dormZ + dormDepth / 2 + 0.02, PALETTE.winFrame));
      }

      // GARAGE shed roof: a single mono-pitch slab over GAR_W × GAR_D.
      const garEave = 0.25;
      const garSlope = 0.6;                       // rise across the depth
      const garHalfSpan = GAR_D / 2 + garEave;
      const garAngle = Math.atan2(garSlope, garHalfSpan * 2);
      const garSlabLen = Math.sqrt((GAR_D + garEave * 2) * (GAR_D + garEave * 2) + garSlope * garSlope);
      {
        const g = new THREE.BoxGeometry(GAR_W + garEave * 2, 0.18, garSlabLen);
        g.rotateX(garAngle);   // slopes down toward +z (front)
        g.translate(garCX, GAR_H + garSlope / 2 + 0.09, garCZ);
        parts.push(tintGeo(g, roofColor));
      }
      // Garage fascia band.
      parts.push(tintedBox(GAR_W + garEave * 2, 0.12, GAR_D + garEave * 2, garCX, GAR_H + 0.06, garCZ, fascia));

      return { parts };
    }

    // ════════════════════════════════════════════════════════════════════════
    // makeInterior — furnished, derived from room extents
    // ════════════════════════════════════════════════════════════════════════
    function makeInterior(): Piece {
      const parts: THREE.BufferGeometry[] = [];
      const colliders: Box[] = [];

      // Interior usable extents (inside the walls).
      const inX = W / 2 - T;       // interior right/left bound
      const inZ = D / 2 - T;       // interior front/back bound
      const floorY = T;            // top of ground floor slab

      // Split footprint: KITCHEN along the right (+x) wall band; LIVING the rest.
      const KITCHEN_BAND = 3.0;                     // depth of kitchen band off +x wall
      const kitchenWallX = inX;                     // kitchen runs along +x wall
      const livingMaxX = inX - KITCHEN_BAND;        // living area right bound

      // ── STAIRCASE along the back wall (-z), against the LEFT region ──
      // STAIR_STEPS steps rising to FLOOR_H, tread STAIR_RUN, width STAIR_W.
      // Ascends +z. Geometry derives from the shared STAIR_* constants so the
      // 2nd-floor stairwell hole (makeShell) lines up with these steps.
      const rise = FLOOR_H / STAIR_STEPS;
      for (let s = 0; s < STAIR_STEPS; s++) {
        const topY = rise * (s + 1);
        const stepCZ = STAIR_Z0 + STAIR_RUN * (s + 0.5);
        // Step tread block from floor up to its top (so it reads as solid stairs).
        parts.push(tintedBox(STAIR_W, topY, STAIR_RUN, STAIR_CX, topY / 2, stepCZ, PALETTE.benchWood));
        // Collider per step (full block to its tread top → walkable ramp).
        colliders.push({ x: STAIR_CX, y: topY / 2, z: stepCZ, hx: STAIR_W / 2, hy: topY / 2, hz: STAIR_RUN / 2 });
      }
      // Stair side stringer (visual).
      parts.push(tintedBox(0.08, FLOOR_H, STAIR_LEN, STAIR_CX - STAIR_W / 2, FLOOR_H / 2, STAIR_Z0 + STAIR_LEN / 2, 0x5a3c22));

      // ── LIVING ROOM (front-left area) ──
      // Coordinates derive from the living region rectangle. livCX is the REAL
      // geometric center of the living region (between the -x interior wall and
      // the kitchen band), NOT a hand-typed constant.
      const livCX = (livingMaxX + (-inX)) / 2;              // = (2.7 + -5.7)/2 = -1.5
      const livFrontZ = inZ - 0.4;                          // near the front
      // The centered front-door gap is at x in [-DOOR_W/2, +DOOR_W/2] with an
      // entry corridor x in [-1.0, 1.0] that MUST stay clear of furniture
      // colliders near the door (z within ~2.5m of the +z door). So we bias the
      // sofa cluster off the derived center toward the left wall: enough that the
      // sofa's right edge clears x=-1.0, while its left edge stays clear of the
      // back-left staircase (x in [-5.6, -4.4]) and the -x interior wall (-inX).
      const sofaW = 2.4, sofaD = 0.9, sofaSeatH = 0.45, sofaBackH = 0.9, armW = 0.22;
      // sofaCX so the right edge sits at x=-1.4 (clears the [-1.0,1.0] corridor):
      const sofaCX = livCX - 1.1;                           // = -2.6 → x-extent [-3.8, -1.4]
      // Rug on the floor (under the sofa cluster, biased with it).
      parts.push(tintedBox(3.6, 0.04, 2.6, sofaCX, floorY + 0.02, livFrontZ - 1.2, 0xb5402f));

      const sofaCZ = livFrontZ - sofaD / 2;
      const sofaBaseY = floorY;
      // base
      parts.push(tintedBox(sofaW, sofaSeatH, sofaD, sofaCX, sofaBaseY + sofaSeatH / 2, sofaCZ, PALETTE.benchRed));
      // backrest (along +z side of the sofa, since sofa faces -z).
      parts.push(tintedBox(sofaW, sofaBackH, 0.22, sofaCX, sofaBaseY + sofaBackH / 2, sofaCZ + sofaD / 2 - 0.11, 0x9c3528));
      // arms
      parts.push(tintedBox(armW, sofaSeatH + 0.2, sofaD, sofaCX - sofaW / 2 + armW / 2, sofaBaseY + (sofaSeatH + 0.2) / 2, sofaCZ, 0x9c3528));
      parts.push(tintedBox(armW, sofaSeatH + 0.2, sofaD, sofaCX + sofaW / 2 - armW / 2, sofaBaseY + (sofaSeatH + 0.2) / 2, sofaCZ, 0x9c3528));
      colliders.push({ x: sofaCX, y: sofaBaseY + sofaBackH / 2, z: sofaCZ, hx: sofaW / 2, hy: sofaBackH / 2, hz: sofaD / 2 });

      // Coffee table (top + 4 legs) in front of the sofa (toward -z).
      const ctW = 1.2, ctD = 0.6, ctTopH = 0.08, ctLegH = 0.4;
      const ctCX = sofaCX;
      const ctCZ = sofaCZ - sofaD / 2 - 0.7;
      parts.push(tintedBox(ctW, ctTopH, ctD, ctCX, floorY + ctLegH + ctTopH / 2, ctCZ, PALETTE.caseWoodTop));
      for (const lx of [-1, 1]) for (const lz of [-1, 1]) {
        parts.push(tintedBox(0.08, ctLegH, 0.08, ctCX + lx * (ctW / 2 - 0.1), floorY + ctLegH / 2, ctCZ + lz * (ctD / 2 - 0.1), PALETTE.caseWood));
      }

      // Armchair beside the sofa, on the OUTSIDE (toward the -x wall, away from
      // the central entry corridor at x=0). Placing it at sofaCX + ... would land
      // it on the entry axis and trap the player at the door; we mirror it left.
      const acX = sofaCX - sofaW / 2 - 0.8;                 // = -4.6 → x-extent [-5.05, -4.15]
      const acZ = sofaCZ;
      parts.push(tintedBox(0.9, sofaSeatH, 0.9, acX, floorY + sofaSeatH / 2, acZ, PALETTE.benchRed));
      parts.push(tintedBox(0.9, sofaBackH, 0.2, acX, floorY + sofaBackH / 2, acZ + 0.35, 0x9c3528));
      colliders.push({ x: acX, y: floorY + sofaSeatH / 2, z: acZ, hx: 0.45, hy: sofaSeatH / 2, hz: 0.45 });

      // Wall-mounted TV (dark slab on the back wall -z), facing +z toward sofa.
      const tvY = 1.5;
      parts.push(tintedBox(1.8, 1.0, 0.08, sofaCX, tvY, -D / 2 + T + 0.05, 0x14171c));
      parts.push(tintedBox(1.9, 1.1, 0.04, sofaCX, tvY, -D / 2 + T + 0.02, 0x2b2f33));
      // TV stand / media unit below.
      parts.push(tintedBox(2.0, 0.5, 0.45, sofaCX, floorY + 0.25, -D / 2 + T + 0.25, PALETTE.caseWood));

      // Bookshelf against the back wall, to the right of the TV.
      const bsX = sofaCX + 2.6;
      const bsZ = -D / 2 + T + 0.25;
      const bsW = 1.2, bsH = 2.0, bsD = 0.4;
      parts.push(tintedBox(bsW, bsH, bsD, bsX, floorY + bsH / 2, bsZ, PALETTE.caseWood));
      for (let sh = 1; sh < 4; sh++) {
        parts.push(tintedBox(bsW - 0.08, 0.05, bsD - 0.05, bsX, floorY + (bsH / 4) * sh, bsZ, PALETTE.caseWoodTop));
      }
      // A few colored "books" on the shelves.
      const bookCols = [0xc0392b, 0x2980b9, 0xe9c46a, 0x57b04a];
      for (let sh = 0; sh < 3; sh++) {
        for (let b = 0; b < 4; b++) {
          parts.push(tintedBox(0.12, 0.32, 0.22, bsX - bsW / 2 + 0.2 + b * 0.22, floorY + (bsH / 4) * (sh + 1) + 0.2, bsZ, bookCols[(sh + b) % bookCols.length]));
        }
      }
      colliders.push({ x: bsX, y: floorY + bsH / 2, z: bsZ, hx: bsW / 2, hy: bsH / 2, hz: bsD / 2 });

      // ── KITCHEN along the +x wall ──
      // Counter run hugging the +x wall, spanning a portion of the depth.
      const cntDepth = 0.7;
      const cntCX = kitchenWallX - cntDepth / 2;
      const cntH = 0.9;
      const cntZ0 = -inZ + 0.3;
      const cntZ1 = inZ - 3.0;                  // leave the front open
      const cntLen = cntZ1 - cntZ0;
      const cntCZ = (cntZ0 + cntZ1) / 2;
      // Counter body + top lip.
      parts.push(tintedBox(cntDepth, cntH, cntLen, cntCX, floorY + cntH / 2, cntCZ, PALETTE.caseWood));
      parts.push(tintedBox(cntDepth + 0.06, 0.06, cntLen, cntCX, floorY + cntH + 0.03, cntCZ, PALETTE.caseWoodTop));
      colliders.push({ x: cntCX, y: floorY + cntH / 2, z: cntCZ, hx: cntDepth / 2, hy: cntH / 2, hz: cntLen / 2 });

      // Upper cabinets above the counter.
      parts.push(tintedBox(0.4, 0.7, cntLen, kitchenWallX - 0.2, floorY + 1.8, cntCZ, PALETTE.caseWoodTop));

      // Sink basin inset on the counter top.
      parts.push(tintedBox(0.5, 0.06, 0.4, cntCX, floorY + cntH - 0.03, cntCZ - cntLen * 0.2, PALETTE.steelLight));
      // Faucet.
      parts.push(cylinderY(0.03, 0.3, cntCX + 0.15, floorY + cntH + 0.15, cntCZ - cntLen * 0.2 + 0.15, PALETTE.steel));

      // Stove with 4 hob dots, set into the counter run.
      const stoveCZ = cntCZ + cntLen * 0.2;
      parts.push(tintedBox(cntDepth, cntH, 0.7, cntCX, floorY + cntH / 2, stoveCZ, PALETTE.steelDark));
      for (const ax of [-0.16, 0.16]) for (const az of [-0.16, 0.16]) {
        parts.push(cylinderY(0.08, 0.03, cntCX + ax, floorY + cntH + 0.02, stoveCZ + az, 0x1c1f22));
      }

      // Fridge (steel) at the back end of the kitchen. Derive its center z so its
      // BACK face sits flush against the inner back wall (z = -inZ), not through
      // it: fridgeCZ = -inZ + halfDepth (so the whole box is INSIDE the room).
      const fridgeY = 1.0;                         // half-height
      const fridgeDepth = 0.8;
      const fridgeHalfDepth = fridgeDepth / 2;     // = 0.4
      const fridgeCZ = -inZ + fridgeHalfDepth;     // = -5.2 + 0.4 = -4.8 (back face at -5.2)
      parts.push(tintedBox(0.8, fridgeY * 2, fridgeDepth, kitchenWallX - 0.4, fridgeY, fridgeCZ, PALETTE.steel));
      parts.push(tintedBox(0.05, 1.4, 0.05, kitchenWallX - 0.8, fridgeY, fridgeCZ + 0.25, PALETTE.steelDark)); // handle
      colliders.push({ x: kitchenWallX - 0.4, y: fridgeY, z: fridgeCZ, hx: 0.4, hy: fridgeY, hz: fridgeHalfDepth });

      // Kitchen table + 2 chairs (in the kitchen's open center).
      const ktX = kitchenWallX - 1.8;
      const ktZ = inZ - 1.6;
      const ktW = 1.0, ktD = 0.8, ktTopH = 0.07, ktLegH = 0.74;
      parts.push(tintedBox(ktW, ktTopH, ktD, ktX, floorY + ktLegH + ktTopH / 2, ktZ, PALETTE.caseWoodTop));
      for (const lx of [-1, 1]) for (const lz of [-1, 1]) {
        parts.push(tintedBox(0.07, ktLegH, 0.07, ktX + lx * (ktW / 2 - 0.08), floorY + ktLegH / 2, ktZ + lz * (ktD / 2 - 0.08), PALETTE.caseWood));
      }

      // ════════════ SECOND FLOOR ════════════
      const f2 = FLOOR_H + T;        // top of 2nd-floor slab (standing height)
      const in2X = W / 2 - T, in2Z = D / 2 - T;

      // BEDROOM (front-right region of 2nd floor).
      const bedCX = in2X - 1.6;
      const bedCZ = in2Z - 1.6;
      const bedW = 1.8, bedL = 2.2, frameH = 0.3, mattH = 0.25;
      // Bed frame.
      parts.push(tintedBox(bedW, frameH, bedL, bedCX, f2 + frameH / 2, bedCZ, PALETTE.caseWood));
      // Mattress.
      parts.push(tintedBox(bedW - 0.1, mattH, bedL - 0.1, bedCX, f2 + frameH + mattH / 2, bedCZ, 0xf3efe6));
      // Pillow (at the -z headboard end).
      parts.push(tintedBox(bedW - 0.4, 0.12, 0.5, bedCX, f2 + frameH + mattH + 0.06, bedCZ - bedL / 2 + 0.4, 0xe0524a));
      // Headboard.
      parts.push(tintedBox(bedW, 0.7, 0.1, bedCX, f2 + 0.35, bedCZ - bedL / 2, PALETTE.caseWoodTop));
      colliders.push({ x: bedCX, y: f2 + frameH / 2, z: bedCZ, hx: bedW / 2, hy: (frameH + mattH) / 2, hz: bedL / 2 });

      // Nightstand beside the bed.
      const nsX = bedCX - bedW / 2 - 0.4;
      parts.push(tintedBox(0.5, 0.5, 0.5, nsX, f2 + 0.25, bedCZ - bedL / 2 + 0.4, PALETTE.caseWood));

      // Wardrobe against the back wall (-z) upstairs.
      const wbX = in2X - 1.0;
      const wbZ = -in2Z + 0.5;
      const wbW = 1.6, wbH = 2.2, wbD = 0.6;
      parts.push(tintedBox(wbW, wbH, wbD, wbX, f2 + wbH / 2, wbZ, PALETTE.caseWoodTop));
      // Wardrobe doors seam + handles.
      parts.push(tintedBox(0.04, wbH - 0.2, 0.02, wbX, f2 + wbH / 2, wbZ + wbD / 2 + 0.01, 0x3a2a1a));
      colliders.push({ x: wbX, y: f2 + wbH / 2, z: wbZ, hx: wbW / 2, hy: wbH / 2, hz: wbD / 2 });

      // BATHROOM suggestion (back-left region upstairs): a tub + a sink.
      const tubX = -in2X + 1.2;
      const tubZ = -in2Z + 1.0;
      parts.push(tintedBox(1.7, 0.5, 0.8, tubX, f2 + 0.25, tubZ, PALETTE.steelLight));
      // Tub inner water/basin.
      parts.push(tintedBox(1.5, 0.1, 0.6, tubX, f2 + 0.42, tubZ, 0xbfe9f2));
      colliders.push({ x: tubX, y: f2 + 0.25, z: tubZ, hx: 0.85, hy: 0.25, hz: 0.4 });
      // Bathroom sink + pedestal.
      const bsinkX = -in2X + 0.4;
      const bsinkZ = tubZ + 1.5;
      parts.push(cylinderY(0.12, 0.8, bsinkX, f2 + 0.4, bsinkZ, PALETTE.steelLight));
      parts.push(tintedBox(0.5, 0.12, 0.4, bsinkX, f2 + 0.82, bsinkZ, PALETTE.steelLight));

      return { parts, colliders };
    }

    // ════════════════════════════════════════════════════════════════════════
    // makePorchAndYard — house-bound exterior pieces
    // ════════════════════════════════════════════════════════════════════════
    function makePorchAndYard(): Piece {
      const parts: THREE.BufferGeometry[] = [];
      const colliders: Box[] = [];
      const obstacles: Rect[] = [];

      // ── PORCH over the front door ──
      const porchDepth = 1.6;
      const porchW = DOOR_W + 2.0;
      const postH = FLOOR_H - 0.1;
      const postZ = D / 2 + porchDepth - 0.15;
      const postOffX = porchW / 2 - 0.2;
      parts.push(tintedBox(0.16, postH, 0.16, -postOffX, postH / 2, postZ, 0x7a5230));
      parts.push(tintedBox(0.16, postH, 0.16, postOffX, postH / 2, postZ, 0x7a5230));
      // Flat porch roof slab.
      parts.push(tintedBox(porchW, 0.16, porchDepth, 0, postH + 0.08, D / 2 + porchDepth / 2, PALETTE.deckPlankB));
      // Porch light (emissive-ish lantern box) under the roof, beside the door.
      parts.push(tintedBox(0.2, 0.3, 0.2, DOOR_W / 2 + 0.5, DOOR_H - 0.1, D / 2 + 0.15, PALETTE.lantern));

      // Entry pad / path of slabs from the door out +z.
      const padW = DOOR_W + 0.6;
      for (let i = 0; i < 4; i++) {
        const pz = D / 2 + 0.4 + i * 0.9;
        parts.push(tintedBox(padW, 0.06, 0.8, 0, 0.03, pz, PALETTE.entryPad));
      }

      // ── BACK YARD pieces (behind -z) ──
      // Patio slab behind the house.
      const patioD = 4.0;
      const patioZ = -D / 2 - patioD / 2 - 0.2;
      parts.push(tintedBox(W * 0.7, 0.06, patioD, 0, 0.03, patioZ, PALETTE.curb));

      // BBQ (body + lid + grill bars) on the patio, to one side.
      const bbqX = -W * 0.22;
      const bbqZ = -D / 2 - 1.0;
      const bbqBodyH = 0.8;
      parts.push(tintedBox(0.7, bbqBodyH, 0.5, bbqX, bbqBodyH / 2, bbqZ, 0x2b2f33));
      parts.push(tintedBox(0.74, 0.18, 0.54, bbqX, bbqBodyH + 0.09, bbqZ, 0x14171c)); // lid
      for (let g = 0; g < 4; g++) {
        parts.push(tintedBox(0.6, 0.02, 0.03, bbqX, bbqBodyH - 0.02, bbqZ - 0.18 + g * 0.12, PALETTE.steel));
      }
      // BBQ legs.
      for (const lx of [-1, 1]) for (const lz of [-1, 1]) {
        parts.push(tintedBox(0.05, 0.4, 0.05, bbqX + lx * 0.3, 0.2, bbqZ + lz * 0.2, 0x1c1f22));
      }
      colliders.push({ x: bbqX, y: bbqBodyH / 2, z: bbqZ, hx: 0.37, hy: bbqBodyH / 2, hz: 0.27 });

      // GARDEN TABLE + 4 chairs (derive chair positions from table half-extents).
      const gtX = W * 0.18;
      const gtZ = -D / 2 - 2.2;
      const gtR = 0.7;                  // round table radius
      const gtTopH = 0.08, gtLegH = 0.72;
      const gtHalf = gtR;               // table footprint half-extent
      parts.push(cylinderY(gtR, gtTopH, gtX, gtLegH + gtTopH / 2, gtZ, PALETTE.deckPlankA, 16));
      parts.push(cylinderY(0.08, gtLegH, gtX, gtLegH / 2, gtZ, PALETTE.caseWood));
      // Chairs: derive distance = tableHalf + chairHalf + GAP.
      const chairHalf = 0.25, GAP = 0.18;
      const chairDist = gtHalf + chairHalf + GAP;
      const chairSeatH = 0.45;
      const chairDirs: Array<[number, number]> = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      for (const [dx, dz] of chairDirs) {
        const cxp = gtX + dx * chairDist;
        const czp = gtZ + dz * chairDist;
        parts.push(tintedBox(chairHalf * 2, 0.06, chairHalf * 2, cxp, chairSeatH, czp, PALETTE.benchWood));
        // backrest on the side away from the table.
        parts.push(tintedBox(chairHalf * 2, 0.4, 0.05, cxp + dx * chairHalf, chairSeatH + 0.2, czp + dz * chairHalf, PALETTE.benchWood));
        for (const lx of [-1, 1]) for (const lz of [-1, 1]) {
          parts.push(tintedBox(0.04, chairSeatH, 0.04, cxp + lx * (chairHalf - 0.04), chairSeatH / 2, czp + lz * (chairHalf - 0.04), PALETTE.caseWood));
        }
      }

      // TOOL SHED (closed box + door + mono-pitch roof) at a back corner.
      const shedW = 2.2, shedD = 2.0, shedH = 2.2;
      const shedX = -W / 2 + shedW / 2;
      const shedZ = -D / 2 - patioD - shedD / 2 + 0.5;
      // Closed box (4 walls + roof underside via a solid block, simplest).
      parts.push(tintedBox(shedW, shedH, shedD, shedX, shedH / 2, shedZ, 0x9c6a39));
      // Door on +z face.
      parts.push(tintedBox(0.9, 1.9, 0.06, shedX, 0.95, shedZ + shedD / 2 + 0.03, PALETTE.facadeDoor));
      // Mono-pitch roof slab.
      {
        const g = new THREE.BoxGeometry(shedW + 0.3, 0.14, shedD + 0.3);
        g.rotateX(Math.atan2(0.4, shedD));
        g.translate(shedX, shedH + 0.2, shedZ);
        parts.push(tintGeo(g, roofColor));
      }
      colliders.push({ x: shedX, y: shedH / 2, z: shedZ, hx: shedW / 2, hy: shedH / 2, hz: shedD / 2 });
      obstacles.push({ x: shedX, z: shedZ, w: shedW, d: shedD });

      // POOL (recessed water slab ringed by a curb coping rim) on the back yard.
      const poolW = 3.4, poolD = 2.4;
      const poolX = W * 0.2;
      const poolZ = -D / 2 - patioD - 1.0;
      const rim = 0.3;
      // Coping rim (a frame of 4 curb bars around the water).
      parts.push(tintedBox(poolW + rim * 2, 0.12, rim, poolX, 0.06, poolZ - poolD / 2 - rim / 2, PALETTE.curb));
      parts.push(tintedBox(poolW + rim * 2, 0.12, rim, poolX, 0.06, poolZ + poolD / 2 + rim / 2, PALETTE.curb));
      parts.push(tintedBox(rim, 0.12, poolD, poolX - poolW / 2 - rim / 2, 0.06, poolZ, PALETTE.curb));
      parts.push(tintedBox(rim, 0.12, poolD, poolX + poolW / 2 + rim / 2, 0.06, poolZ, PALETTE.curb));
      // Shallow water slab (slightly recessed look — thin, just above ground).
      parts.push(tintedBox(poolW, 0.08, poolD, poolX, 0.04, poolZ, 0x3a8fb0));

      return { parts, colliders, obstacles };
    }

    // ── ASSEMBLE ──────────────────────────────────────────────────────────────
    const shell = makeShell();
    const garage = makeGarage();
    const roof = makeRoof();
    const interior = makeInterior();
    const yard = makePorchAndYard();

    const allParts: THREE.BufferGeometry[] = [
      ...shell.parts, ...garage.parts, ...roof.parts, ...interior.parts, ...yard.parts,
    ];
    const group = new THREE.Group();
    const merged = tintedMesh(mergeTinted(allParts));
    merged.castShadow = true;
    merged.receiveShadow = true;
    group.add(merged);

    const colliders: Box[] = [
      ...(shell.colliders ?? []),
      ...(garage.colliders ?? []),
      ...(interior.colliders ?? []),
      ...(yard.colliders ?? []),
    ];

    // Obstacles: house footprint + garage footprint + shed (from yard) for NPC avoidance.
    const obstacles: Rect[] = [
      { x: 0, z: 0, w: W, d: D },
      { x: garCX, z: garCZ, w: GAR_W, d: GAR_D },
      ...(yard.obstacles ?? []),
    ];

    const anchors: Record<string, Vec2 | Seat> = {
      door: { x: 0, z: D / 2 },
      driveway: { x: garCX, z: D / 2 + 4 },
    };

    const pois: PoiSpec[] = [
      { kind: "home", label: "Home", radius: 3, anchor: "door" },
    ];

    return { mesh: group, colliders, obstacles, anchors, pois };
  },
});
