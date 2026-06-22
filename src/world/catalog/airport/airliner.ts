// src/world/catalog/airport/airliner.ts
//
// A detailed narrow-body airliner parked on the apron.
// AXIS CONVENTION: nose points toward +X (long axis = X).
// Wingspan along Z.  Base y=0 (gear wheels on the ground).
// Approximate size: ~38 m long (x), ~34 m wingspan (z), ~8 m tall.

import * as THREE from "three";
import { defineObject } from "../../system/registry";
import {
  tintedBox, cylinderY,
  mergeTinted, tintedMesh, tintGeo, DECAL_GAP,
} from "../../objects/voxel";
import { makeTextSignMesh } from "../../objects/textSign";
import { PALETTE } from "../../palette";
import type { ObjectResult } from "../../system/types";

interface AirlinerParams {
  livery: number;
  belly: number;
  tail: number;
  reg: string;
}

function solidBox(
  x: number, y: number, z: number,
  bw: number, bh: number, bd: number,
) {
  return { x, y, z, hx: bw / 2, hy: bh / 2, hz: bd / 2 };
}

// Colors
const COCKPIT_DARK  = 0x1a2035;  // windscreen
const WINDOW_DARK   = 0x1c2c44;  // cabin windows
const NACELLE_COL   = PALETTE.steel;
const INTAKE_DARK   = 0x22272e;
const GEAR_DARK     = PALETTE.steelDark;
const EXHAUST       = 0x5c5f63;
const STAR_GOLD     = 0xe8c84a;

defineObject("airliner", {
  params: {
    livery: 0xffffff,
    belly:  0x1f4fa0,
    tail:   0x1f4fa0,
    reg:    "4X-EKA",
  } as AirlinerParams,
  build(p: AirlinerParams): ObjectResult {
    const parts: THREE.BufferGeometry[] = [];
    const group = new THREE.Group();

    // ── Geometry constants ────────────────────────────────────────────────
    const fusLen   = 36;   // total fuselage length along X
    const fusR     = 2.0;  // fuselage radius
    const fusY     = fusR + 1.0; // centerline height (gear raises it)
    const fusHalfX = fusLen / 2; // 18 m each side from origin

    // ── FUSELAGE — main tube along X ──────────────────────────────────────
    // Merge approach: build a CylinderGeometry on Y, rotate to X in a Mesh.
    {
      const fusCyl = new THREE.CylinderGeometry(fusR, fusR, fusLen, 20);
      fusCyl.translate(0, fusY, 0);
      const fusM = new THREE.Mesh(fusCyl, undefined!);
      fusM.rotation.z = Math.PI / 2;
      fusM.updateMatrixWorld(true);
      const fusGeo = fusCyl.clone().applyMatrix4(fusM.matrixWorld);
      parts.push(tintGeo(fusGeo, p.livery));
    }

    // ── Belly cheatline (blue stripe along lower fuselage) ───────────────
    // A long box spanning the full length, sitting at the belly equator
    const cheatH = fusR * 0.65;
    const cheatY = fusY - fusR * 0.5;
    parts.push(tintedBox(fusLen - 2, cheatH, fusR * 2.1 + DECAL_GAP,
      0, cheatY, 0, p.belly));

    // ── Nose cone (+x) — tapered cone, tip toward +x ─────────────────────
    {
      const noseCone = new THREE.CylinderGeometry(0, fusR, 6, 16);
      noseCone.translate(0, fusY, 0);
      const noseMesh = new THREE.Mesh(noseCone, undefined!);
      noseMesh.rotation.z = -Math.PI / 2;
      noseMesh.position.set(fusHalfX + 3, 0, 0);
      noseMesh.updateMatrixWorld(true);
      const noseGeo = noseCone.clone().applyMatrix4(noseMesh.matrixWorld);
      parts.push(tintGeo(noseGeo, p.livery));
    }

    // ── Tail cone (-x) — tapered toward -x ───────────────────────────────
    {
      const tailCone = new THREE.CylinderGeometry(0, fusR * 0.85, 7, 14);
      tailCone.translate(0, fusY + 0.5, 0);
      const tailMesh = new THREE.Mesh(tailCone, undefined!);
      tailMesh.rotation.z = Math.PI / 2;
      tailMesh.position.set(-fusHalfX - 3.5, 0, 0);
      tailMesh.updateMatrixWorld(true);
      const tailGeo = tailCone.clone().applyMatrix4(tailMesh.matrixWorld);
      parts.push(tintGeo(tailGeo, p.livery));
    }

    // ── Cockpit windscreen (dark boxes at nose, angled) ───────────────────
    // Four dark angled panels approximating the Boeing-style windscreen
    const wscY = fusY + 0.8;
    const wscX = fusHalfX + 1.5;
    parts.push(tintedBox(2.2, 1.1, 0.3,  wscX - 1.0, wscY + 0.0, -0.9, COCKPIT_DARK));
    parts.push(tintedBox(2.2, 1.1, 0.3,  wscX - 1.0, wscY + 0.0,  0.9, COCKPIT_DARK));
    parts.push(tintedBox(1.6, 0.7, 0.3,  wscX,       wscY - 0.3,  0.0, COCKPIT_DARK));

    // ── Passenger window strip — row of small dark windows each side ──────
    const winCount  = 28;
    const winStartX = fusHalfX - 2.0;   // rear-most window x
    const winEndX   = fusHalfX - 28.0;  // front-most window x (exclude nose)
    const winStep   = (winStartX - winEndX) / (winCount - 1);
    const winY      = fusY + 0.6;
    const winW      = 0.38;
    const winH      = 0.52;
    const winD      = 0.22;
    const winOffZ   = fusR + DECAL_GAP;

    for (let i = 0; i < winCount; i++) {
      const wx = winStartX - i * winStep;
      // left (−z) side
      parts.push(tintedBox(winW, winH, winD, wx, winY, -winOffZ, WINDOW_DARK));
      // right (+z) side
      parts.push(tintedBox(winW, winH, winD, wx, winY,  winOffZ, WINDOW_DARK));
    }

    // ── WINGS — swept back, tapered flat boxes ─────────────────────────────
    // Each wing is 17 m semi-span. Built as a mesh with small rotation.
    const wingY      = fusY - fusR * 0.5;
    const wingThick  = 0.55;
    const wingChord  = 5.0;   // chord at root
    const wingSpan   = 16.5;
    const wingSweep  = 0.22;  // radians aft sweep

    for (const side of [-1, 1]) {
      // Wing box
      const wingGeo = new THREE.BoxGeometry(wingChord * 0.7, wingThick, wingSpan);
      wingGeo.translate(0, wingY, 0);
      const wingMesh = new THREE.Mesh(wingGeo, undefined!);
      // offset to side + slight aft sweep by rotating in XZ plane
      wingMesh.rotation.y = side * wingSweep;
      wingMesh.position.set(-1.5, 0, side * (fusR + wingSpan / 2));
      wingMesh.updateMatrixWorld(true);
      const wGeo = wingGeo.clone().applyMatrix4(wingMesh.matrixWorld);
      parts.push(tintGeo(wGeo, p.livery));

      // Wing root fillet (thicker box at fuselage)
      parts.push(tintedBox(wingChord, wingThick * 1.6, fusR * 1.2,
        -1.5, wingY, side * fusR * 0.8, p.livery));

      // Wing tip
      const tipGeo = new THREE.BoxGeometry(wingChord * 0.25, wingThick * 0.4, 1.2);
      tipGeo.translate(-1.5, wingY, side * (fusR + wingSpan + 0.4));
      const tipMesh = new THREE.Mesh(tipGeo, undefined!);
      tipMesh.rotation.y = side * (wingSweep + 0.1);
      tipMesh.updateMatrixWorld(true);
      const tipG = tipGeo.clone().applyMatrix4(tipMesh.matrixWorld);
      parts.push(tintGeo(tipG, p.livery));
    }

    // ── ENGINE NACELLES — two, mounted under the wings ────────────────────
    // Each engine: outer nacelle cylinder + intake dark ring + exhaust
    const engZ    = 9.5;    // semi-span position
    const engX    = 2.5;    // forward of wing root
    const engY    = wingY - 2.2;
    const engLen  = 5.8;
    const engR    = 1.15;
    const engXCtr = -engX;

    for (const side of [-1, 1]) {
      const ez = side * engZ;
      // Nacelle body
      {
        const nacGeo = new THREE.CylinderGeometry(engR, engR * 0.9, engLen, 14);
        nacGeo.translate(0, engY, 0);
        const nacMesh = new THREE.Mesh(nacGeo, undefined!);
        nacMesh.rotation.z = Math.PI / 2;
        nacMesh.position.set(engXCtr, 0, ez);
        nacMesh.updateMatrixWorld(true);
        const nGeo = nacGeo.clone().applyMatrix4(nacMesh.matrixWorld);
        parts.push(tintGeo(nGeo, NACELLE_COL));
      }
      // Intake lip (dark disc at front +x end)
      {
        const intakeGeo = new THREE.CylinderGeometry(engR + 0.12, engR, 0.5, 14);
        intakeGeo.translate(0, engY, 0);
        const iMesh = new THREE.Mesh(intakeGeo, undefined!);
        iMesh.rotation.z = Math.PI / 2;
        iMesh.position.set(engXCtr + engLen / 2 + 0.1, 0, ez);
        iMesh.updateMatrixWorld(true);
        const iGeo = intakeGeo.clone().applyMatrix4(iMesh.matrixWorld);
        parts.push(tintGeo(iGeo, INTAKE_DARK));
      }
      // Exhaust nozzle (-x end)
      {
        const exGeo = new THREE.CylinderGeometry(engR * 0.65, engR * 0.8, 0.8, 14);
        exGeo.translate(0, engY, 0);
        const eMesh = new THREE.Mesh(exGeo, undefined!);
        eMesh.rotation.z = Math.PI / 2;
        eMesh.position.set(engXCtr - engLen / 2 - 0.2, 0, ez);
        eMesh.updateMatrixWorld(true);
        const eGeo = exGeo.clone().applyMatrix4(eMesh.matrixWorld);
        parts.push(tintGeo(eGeo, EXHAUST));
      }
      // Pylon connecting wing to engine
      parts.push(tintedBox(engLen * 0.7, 1.6, 0.45, engXCtr, (wingY + engY) / 2, ez, NACELLE_COL));
    }

    // ── VERTICAL TAIL FIN ─────────────────────────────────────────────────
    const finBaseX   = -fusHalfX + 4.0;
    const finH       = 8.5;
    const finChord   = 7.0;
    const finBaseY   = fusY + fusR * 0.7;

    // Main fin body (box, tapers via a swept mesh)
    parts.push(tintedBox(finChord, finH, 0.7,
      finBaseX - finChord * 0.3, finBaseY + finH / 2, 0, p.tail));
    // Fin leading edge (thicker box at front)
    parts.push(tintedBox(1.0, finH * 0.9, 0.55,
      finBaseX + finChord * 0.1, finBaseY + finH * 0.5, 0, p.tail));
    // Fin tip (small box)
    parts.push(tintedBox(2.5, 0.9, 0.5,
      finBaseX - finChord * 0.05, finBaseY + finH + 0.2, 0, p.tail));

    // ── Star-of-David hint on the tail fin (EL AL vibe) ───────────────────
    // Two overlapping thin boxes — one 0°, one 60° — centered on fin
    const starX = finBaseX - finChord * 0.2;
    const starY = finBaseY + finH * 0.55;
    const starR = 1.4;
    for (const side of [-1, 1]) {
      // horizontal bar
      parts.push(tintedBox(starR * 2, starR * 0.55, 0.12 + DECAL_GAP,
        starX, starY, side * 0.38 + DECAL_GAP, STAR_GOLD));
      // angled bar 1 (≈60°)
      const starBarGeo = new THREE.BoxGeometry(starR * 2, starR * 0.55, 0.12);
      starBarGeo.rotateZ(Math.PI / 3);
      starBarGeo.translate(starX, starY, side * 0.38 + DECAL_GAP * 2);
      parts.push(tintGeo(starBarGeo, STAR_GOLD));
      // angled bar 2 (≈-60°)
      const starBarGeo2 = new THREE.BoxGeometry(starR * 2, starR * 0.55, 0.12);
      starBarGeo2.rotateZ(-Math.PI / 3);
      starBarGeo2.translate(starX, starY, side * 0.38 + DECAL_GAP * 3);
      parts.push(tintGeo(starBarGeo2, STAR_GOLD));
    }

    // ── HORIZONTAL STABILIZERS ────────────────────────────────────────────
    const stabX    = -fusHalfX + 3.0;
    const stabY    = fusY + fusR * 0.3;
    const stabSpan = 8.0;
    const stabH    = 0.32;
    const stabChord = 3.8;

    for (const side of [-1, 1]) {
      parts.push(tintedBox(stabChord, stabH, stabSpan,
        stabX, stabY, side * (fusR + stabSpan / 2), p.tail));
      // small tip
      parts.push(tintedBox(stabChord * 0.5, stabH * 0.8, 0.8,
        stabX, stabY, side * (fusR + stabSpan + 0.2), p.tail));
    }

    // ── LANDING GEAR ──────────────────────────────────────────────────────
    // Nose gear: under the nose section
    const gearTopY   = fusY - fusR;
    const strutH     = gearTopY;    // strut goes from ground up to fuselage belly
    const wheelR     = 0.55;
    const wheelThick = 0.45;
    const noseGearX  = fusHalfX - 5.0;

    // Nose strut
    parts.push(cylinderY(0.15, strutH, noseGearX, strutH / 2, 0, GEAR_DARK));
    // Nose wheels (pair side by side)
    for (const side of [-1, 1]) {
      const nwGeo = new THREE.CylinderGeometry(wheelR, wheelR, wheelThick, 14);
      nwGeo.translate(0, wheelR, 0);
      const nwMesh = new THREE.Mesh(nwGeo, undefined!);
      nwMesh.rotation.x = Math.PI / 2;
      nwMesh.position.set(noseGearX, 0, side * (wheelThick * 0.7));
      nwMesh.updateMatrixWorld(true);
      const nwG = nwGeo.clone().applyMatrix4(nwMesh.matrixWorld);
      parts.push(tintGeo(nwG, PALETTE.lampPole));
    }

    // Main gear (two bogies, under wing root)
    const mainGearX = -2.5;
    for (const side of [-1, 1]) {
      const mgZ = side * (fusR + 1.0);
      // strut
      parts.push(cylinderY(0.22, strutH * 0.9, mainGearX, strutH * 0.45, mgZ, GEAR_DARK));
      // bogie beam
      parts.push(tintedBox(2.5, 0.25, 0.25, mainGearX, wheelR * 1.6, mgZ, GEAR_DARK));
      // four wheels (2 fore, 2 aft) per main bogie
      for (const fx of [-0.8, 0.8]) {
        for (const fside of [-1, 1]) {
          const wGeo = new THREE.CylinderGeometry(wheelR, wheelR, wheelThick, 14);
          wGeo.translate(0, wheelR, 0);
          const wMesh = new THREE.Mesh(wGeo, undefined!);
          wMesh.rotation.x = Math.PI / 2;
          wMesh.position.set(mainGearX + fx, 0, mgZ + fside * 0.5);
          wMesh.updateMatrixWorld(true);
          const wG = wGeo.clone().applyMatrix4(wMesh.matrixWorld);
          parts.push(tintGeo(wG, PALETTE.lampPole));
        }
      }
    }

    // ── Build merged mesh ─────────────────────────────────────────────────
    const mainMesh = tintedMesh(mergeTinted(parts));
    mainMesh.castShadow = true;
    mainMesh.receiveShadow = true;
    group.add(mainMesh);

    // ── Registration text decal (small canvas sign near rear fuselage) ────
    {
      const regSign = makeTextSignMesh({
        text: p.reg,
        w: 3.0,
        h: 0.55,
        boardColor: p.belly,
        textColor: "#ffffff",
        glow: 0.0,
      });
      // Position: right side of rear fuselage, slightly above belly line
      regSign.rotation.y = Math.PI / 2;   // face +z side
      regSign.position.set(-fusHalfX + 6, fusY - 0.4, fusR + DECAL_GAP + 0.01);
      group.add(regSign);
    }

    // ── Colliders & obstacles ─────────────────────────────────────────────
    // ONE big AABB covering the fuselage body
    const totalLen = fusLen + 12;   // including nose + tail cones
    const bodyCX   = (3 - 3.5) / 2; // small offset from asymmetric nose/tail lengths

    const colliders = [
      solidBox(bodyCX, fusY, 0, totalLen, fusR * 2.1, fusR * 2.1),
    ];

    // Obstacle: footprint covering the full wingspan (so nothing walks under)
    const wingspanFull = (fusR + wingSpan + 1.5) * 2;  // ~38 m
    const obstacles = [
      { x: 0, z: 0, w: totalLen, d: wingspanFull },
    ];

    return { mesh: group, colliders, obstacles };
  },
});
