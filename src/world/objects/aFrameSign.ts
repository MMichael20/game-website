// rishon3d/src/world/objects/aFrameSign.ts
//
// A reusable voxel "A-frame sandwich board" — the sidewalk sign a phone-repair
// shop wheels out front. Two leaning boards form an inverted V (an "A"), with a
// glowing phone icon + pale text bars on the front (+z) board to read "REPAIRS".
// Per the repo rule: real props are reusable objects, never bare cubes.
// Convention: base at y=0, grows +y, centered on x=z=0, FRONT faces +z, ~1u=1m.

import * as THREE from "three";
import { tintedBox, mergeTinted, tintedMesh } from "./voxel";
import { PALETTE } from "../palette";

export interface AFrameSignConfig {
  boardColor?: number;
}

// Board geometry. Each board is built centered, then translated up so its BASE
// sits at y=0, so a Group rotation about X hinges it at the ground.
const BOARD_W = 0.7;    // board width  (x)
const BOARD_H = 0.9;    // board height (along the board, before leaning)
const BOARD_T = 0.05;   // board thickness (z, in board-local space)
const LEAN = 0.18;      // radians each board tilts off vertical (the A's spread)

const FRAME = 0x20262e;   // dark frame edge / phone body
const SCREEN = 0x6fc0ff;  // glowing phone screen
const TEXT = 0xf3efe6;    // pale "text line" bars

// Build ONE board as a vertex-colored mesh, already raised so its base is at the
// group origin (y=0). It is then dropped into a Group and rotated about X to lean.
// `withDecals` adds the frame edge + phone icon + text bars onto the +z face
// (only the front board carries them).
function makeBoard(boardColor: number, withDecals: boolean): THREE.Mesh {
  const parts: THREE.BufferGeometry[] = [];
  const front = BOARD_T / 2; // +z face of the board, in board-local space

  // The board itself, base at y=0, centered on x and the board's own z.
  parts.push(tintedBox(BOARD_W, BOARD_H, BOARD_T, 0, BOARD_H / 2, 0, boardColor));

  if (withDecals) {
    // Dark frame edge: four thin slabs hugging the border of the +z face,
    // standing slightly proud (z just past `front`) so they read crisply.
    const fz = front + 0.012;
    const edge = 0.05;             // frame bar thickness
    const inset = 0.02;            // pull the border in from the raw edge
    const innerW = BOARD_W - 2 * inset;
    const innerH = BOARD_H - 2 * inset;
    // top + bottom horizontal bars
    parts.push(tintedBox(innerW, edge, 0.02, 0, BOARD_H - inset - edge / 2, fz, FRAME));
    parts.push(tintedBox(innerW, edge, 0.02, 0, inset + edge / 2, fz, FRAME));
    // left + right vertical bars
    parts.push(tintedBox(edge, innerH, 0.02, -(innerW / 2 - edge / 2), BOARD_H / 2, fz, FRAME));
    parts.push(tintedBox(edge, innerH, 0.02, innerW / 2 - edge / 2, BOARD_H / 2, fz, FRAME));

    // Glowing phone icon, centered horizontally, in the upper-middle of the board.
    const iconW = 0.22;
    const iconH = 0.34;
    const iconY = BOARD_H * 0.62;  // sit it above the text bars
    // slate phone body
    parts.push(tintedBox(iconW, iconH, 0.03, 0, iconY, fz, FRAME));
    // bright screen inset on the icon's +z face, slightly proud so it shows
    parts.push(tintedBox(iconW * 0.78, iconH * 0.8, 0.02, 0, iconY, fz + 0.022, SCREEN));

    // Two pale "text line" bars below the icon (suggest "REPAIRS").
    const barW = 0.4;
    const barH = 0.045;
    parts.push(tintedBox(barW, barH, 0.02, 0, BOARD_H * 0.34, fz, TEXT));
    parts.push(tintedBox(barW * 0.78, barH, 0.02, 0, BOARD_H * 0.25, fz, TEXT));
  }

  return tintedMesh(mergeTinted(parts));
}

export function makeAFrameSign(cfg: AFrameSignConfig = {}): THREE.Object3D {
  const boardColor = cfg.boardColor ?? PALETTE.awningBlue;
  const root = new THREE.Group();

  // Each board hinges at its base (y=0) and leans by LEAN radians. The front
  // board faces +z and tilts back (rotation.x = +LEAN, top swings toward -z); the
  // back board mirrors it (rotation.x = -LEAN). A board of height H leaned by `a`
  // about its base reaches its top at y = H*cos(a) and its base sweeps outward.
  // To make the two tops MEET over the center and bases SPLAY out, we slide each
  // board group outward along z so that, after leaning, the top edges converge.
  //
  // After a rotation about X by `a`, a board point at local (0, H, 0) lands at
  // (0, H*cos a, -H*sin a) for +a. So a board leaning by +LEAN has its top pushed
  // to z = -H*sin(LEAN); to bring both tops to z=0 we offset the group by
  // +H*sin(LEAN) on z. That same offset leaves the base out at z = +H*sin(LEAN),
  // giving the splayed feet of the A.
  const topShift = BOARD_H * Math.sin(LEAN);  // ~0.16 m: offset to converge tops

  // Front board: faces +z, leans back. Group sits forward so its top meets center.
  const frontBoard = makeBoard(boardColor, true);
  const frontGroup = new THREE.Group();
  frontGroup.add(frontBoard);
  frontGroup.rotation.x = LEAN;
  frontGroup.position.z = topShift;
  root.add(frontGroup);

  // Back board: mirror — leans the opposite way, its base splays to -z.
  const backBoard = makeBoard(boardColor, false);
  const backGroup = new THREE.Group();
  backGroup.add(backBoard);
  backGroup.rotation.x = -LEAN;
  backGroup.position.z = -topShift;
  root.add(backGroup);

  // Hinge / strap joining the two boards at the very apex. The tops meet near
  // y = H*cos(LEAN); drop a thin dark box straddling z=0 just under that apex.
  const apexY = BOARD_H * Math.cos(LEAN);
  const strap = tintedMesh(tintedBox(BOARD_W * 0.6, 0.05, 0.16, 0, apexY - 0.04, 0, FRAME));
  root.add(strap);

  return root;
}
