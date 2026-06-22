// src/world/catalog/airport/airliner.ts
//
// A detailed narrow-body airliner parked on the apron (A320/737-class).
// AXIS CONVENTION: nose points toward +X (long axis = X).
// Wingspan along Z.  Base y=0 (gear wheels on the ground).
// Approximate size: ~42 m long (x), ~38 m wingspan (z), ~9 m tall.
//
// Livery is zoned like a real flag-carrier: white upper fuselage, a curved
// colored belly (partial-cylinder shell), a slim gold cheatline pinstripe at
// the belly waterline, and a colored fin carrying a white Star of David.

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

// A cylinder/cone lying along the X axis (its circular cross-section in the YZ
// plane). rPlusX is the radius at the +x end, rMinusX at the −x end — so a nose
// cone is tubeX(tipR, baseR, …). `open` drops the end caps (for shells that butt
// against another part). Returns a baked, vertex-colored geometry.
function tubeX(
  rPlusX: number, rMinusX: number, len: number,
  cx: number, cy: number, cz: number, hex: number,
  seg = 16, open = true,
): THREE.BufferGeometry {
  const g = new THREE.CylinderGeometry(rPlusX, rMinusX, len, seg, 1, open);
  g.rotateZ(-Math.PI / 2);   // axis Y → X; the +y (radiusTop) end lands at +x
  g.translate(cx, cy, cz);
  return tintGeo(g, hex);
}

// A wheel (tire) standing on the ground at (x,z), its disc faces along Z.
function wheel(
  x: number, z: number, r: number, thick: number,
  tire: number, hub: number,
): THREE.BufferGeometry[] {
  const out: THREE.BufferGeometry[] = [];
  const tireGeo = new THREE.CylinderGeometry(r, r, thick, 14);
  tireGeo.rotateX(Math.PI / 2);     // axis Y → Z
  tireGeo.translate(x, r, z);
  out.push(tintGeo(tireGeo, tire));
  // bright hub cap on the outboard face
  const hubGeo = new THREE.CylinderGeometry(r * 0.42, r * 0.42, thick * 0.4, 10);
  hubGeo.rotateX(Math.PI / 2);
  hubGeo.translate(x, r, z + (z >= 0 ? thick * 0.45 : -thick * 0.45));
  out.push(tintGeo(hubGeo, hub));
  return out;
}

// A Star-of-David hexagram: two overlapping equilateral triangular prisms whose
// flat faces lie in the X-Y plane (pointing toward ±z). Returns both prisms.
function hexagram(
  cx: number, cy: number, planeZ: number, R: number, thick: number, hex: number,
): THREE.BufferGeometry[] {
  const out: THREE.BufferGeometry[] = [];
  for (const flip of [0, Math.PI]) {
    const g = new THREE.CylinderGeometry(R, R, thick, 3);  // triangular prism
    g.rotateX(Math.PI / 2);          // triangular caps now face ±z
    g.rotateZ(flip + Math.PI / 2);   // upright triangle; flip=π gives the mirror
    g.translate(cx, cy, planeZ);
    out.push(tintGeo(g, hex));
  }
  return out;
}

// Colors
const COCKPIT_GLASS = 0x141d30;  // dark windscreen / flight-deck glass
const WINDOW_DARK   = 0x1c2c44;  // cabin windows
const ANTIGLARE     = 0x12151b;  // matte black anti-glare strip over the nose
const NACELLE_COL   = PALETTE.steelLight;
const NACELLE_SHADE = PALETTE.steel;
const FAN_DARK      = 0x14171c;  // dark fan face inside the intake
const SPINNER_COL   = PALETTE.steelDark;
const INTAKE_LIP    = 0x2a2f36;
const GEAR_DARK     = PALETTE.steelDark;
const TIRE_DARK     = 0x202227;
const HUB_LIGHT     = PALETTE.steelLight;
const EXHAUST       = 0x5c5f63;
const EXHAUST_PLUG  = 0x303338;
const CHEAT_GOLD    = 0xe8c84a;  // slim cheatline pinstripe
const APU_DARK      = 0x33373d;
const NAV_GREEN     = 0x2ecc40;  // starboard (+z) wingtip
const NAV_RED       = 0xe0524a;  // port (−z) wingtip
const BEACON_RED    = 0xff3b30;  // anti-collision beacon

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
    const EMBLEM = p.livery;   // white Star of David on the colored fin

    // ── Geometry constants ────────────────────────────────────────────────
    const fusLen   = 36;   // total fuselage tube length along X
    const fusR     = 2.0;  // fuselage radius
    const fusY     = fusR + 1.0; // centerline height (gear raises it)
    const fusHalfX = fusLen / 2; // 18 m each side from origin

    // ── FUSELAGE — main white tube along X (capped) ───────────────────────
    parts.push(tubeX(fusR, fusR, fusLen, 0, fusY, 0, p.livery, 24, false));

    // ── Curved colored BELLY — a partial-cylinder shell hugging the bottom ─
    // Wraps the lower ~144° of the tube so it reads as a rounded painted belly,
    // not a flat slab. Centered on the underside (θ=π/2 in the rotated frame).
    {
      const arc = Math.PI * 0.82;
      const belly = new THREE.CylinderGeometry(
        fusR + 0.03, fusR + 0.03, fusLen - 1.2, 24, 1, true,
        Math.PI / 2 - arc / 2, arc,
      );
      belly.rotateZ(-Math.PI / 2);
      belly.translate(0, fusY, 0);
      parts.push(tintGeo(belly, p.belly));
    }

    // ── Slim gold cheatline pinstripe at the belly waterline (both sides) ──
    const cheatY = fusY - fusR * 0.62;
    for (const side of [-1, 1]) {
      parts.push(tintedBox(fusLen - 4, 0.16, 0.1,
        0, cheatY, side * (fusR + DECAL_GAP), CHEAT_GOLD));
    }

    // ── NOSE — clean tapered shoulder + smooth rounded cap (blunt) ────────
    // A gentle taper off the fuselage into a smooth rounded dome. A UV sphere
    // (not an icosphere) keeps it clean and axis-aligned — no lumpy facets.
    const noseFrustum = 3.4;          // straight tapered shoulder
    const noseCapR    = 1.35;         // rounded cap radius (= frustum tip radius)
    const noseLen     = noseFrustum + noseCapR * 1.25;   // cap is stretched 1.25× in x
    const capX        = fusHalfX + noseFrustum;
    parts.push(tubeX(noseCapR, fusR, noseFrustum, fusHalfX + noseFrustum / 2, fusY, 0, p.livery, 22));
    {
      const cap = new THREE.SphereGeometry(noseCapR, 20, 14);
      cap.scale(1.25, 1.0, 1.0);      // gentle ogive stretch — smooth dome, no droop
      cap.translate(capX, fusY, 0);
      parts.push(tintGeo(cap, p.livery));
    }
    // matte-black anti-glare strip over the crown
    parts.push(tintedBox(3.4, 0.14, 1.2, fusHalfX + 1.5, fusY + 1.6, 0, ANTIGLARE));

    // ── TAIL CONE — upswept, tapering to the APU (−x) ─────────────────────
    const tailLen = 7.5;
    const tailTipX = -fusHalfX - tailLen;
    parts.push(tubeX(fusR * 0.85, 0.35, tailLen, -fusHalfX - tailLen / 2, fusY + 0.6, 0, p.livery, 18));
    parts.push(cylinderY(0.3, 0.4, tailTipX, fusY + 0.6, 0, APU_DARK, 10)); // APU exhaust nub

    // ── COCKPIT — segmented flight-deck windows (angled panes, not a slab) ─
    // Small dark panes wrap each nose flank with white pillars between them, so
    // it reads as a real cockpit rather than one flat mirror. Each pane is
    // rotated about its OWN center (mesh transform) to follow the nose curve.
    {
      const wy = fusY + 0.75;
      const panes = [
        { x: fusHalfX + 1.25, r: 1.55, w: 0.5,  toe: 0.50 },  // forward (most angled)
        { x: fusHalfX + 0.55, r: 1.78, w: 0.55, toe: 0.32 },  // mid-forward
        { x: fusHalfX - 0.20, r: 1.94, w: 0.55, toe: 0.16 },  // mid
        { x: fusHalfX - 0.95, r: 1.98, w: 0.50, toe: 0.04 },  // side window
      ];
      for (const side of [-1, 1]) {
        for (const pane of panes) {
          const g = new THREE.BoxGeometry(pane.w, 0.58, 0.16);
          const m = new THREE.Mesh(g, undefined!);
          m.position.set(pane.x, wy, side * (pane.r + DECAL_GAP));
          m.rotation.y = -side * pane.toe;
          m.updateMatrixWorld(true);
          parts.push(tintGeo(g.clone().applyMatrix4(m.matrixWorld), COCKPIT_GLASS));
        }
      }
    }

    // ── Passenger window strip — small dark windows each side ─────────────
    const winCount  = 30;
    const winStartX = fusHalfX - 2.5;
    const winEndX   = -fusHalfX + 5.0;
    const winStep   = (winStartX - winEndX) / (winCount - 1);
    const winY      = fusY + 0.5;
    const winOffZ   = fusR + DECAL_GAP;
    for (let i = 0; i < winCount; i++) {
      const wx = winStartX - i * winStep;
      parts.push(tintedBox(0.34, 0.46, 0.2, wx, winY, -winOffZ, WINDOW_DARK));
      parts.push(tintedBox(0.34, 0.46, 0.2, wx, winY,  winOffZ, WINDOW_DARK));
    }

    // ── Passenger DOORS — white panel + dark seam, masking the window strip ─
    const doorXs = [fusHalfX - 3.5, -fusHalfX + 7.5];
    for (const dx of doorXs) {
      for (const side of [-1, 1]) {
        const zf = side * (fusR + DECAL_GAP);
        parts.push(tintedBox(0.95, 1.95, 0.08, dx, fusY + 0.05, zf, GEAR_DARK));      // seam
        parts.push(tintedBox(0.72, 1.7, 0.1, dx, fusY + 0.05, zf + side * 0.03, p.livery)); // panel
      }
    }

    // ── WINGS — swept, tapered, with upturned winglets ────────────────────
    const wingY     = fusY - fusR * 0.5;
    const wingThick = 0.55;
    const wingChord = 5.2;
    const wingSpan  = 16.5;
    const wingSweep = 0.22;  // radians aft sweep

    for (const side of [-1, 1]) {
      // main wing panel
      const wingGeo = new THREE.BoxGeometry(wingChord * 0.7, wingThick, wingSpan);
      wingGeo.translate(-1.5, wingY, side * (fusR + wingSpan / 2));
      const wingMesh = new THREE.Mesh(wingGeo, undefined!);
      wingMesh.rotation.y = side * wingSweep;
      wingMesh.updateMatrixWorld(true);
      parts.push(tintGeo(wingGeo.clone().applyMatrix4(wingMesh.matrixWorld), p.livery));

      // wing root fillet (thicker fairing at the fuselage)
      parts.push(tintedBox(wingChord, wingThick * 1.6, fusR * 1.2,
        -1.5, wingY, side * fusR * 0.8, p.livery));

      // dark flap/aileron seam along the trailing (−x) edge
      const flapGeo = new THREE.BoxGeometry(0.35, wingThick * 0.5, wingSpan * 0.82);
      flapGeo.translate(-1.5 - wingChord * 0.32, wingY + wingThick * 0.3,
        side * (fusR + wingSpan / 2));
      const flapMesh = new THREE.Mesh(flapGeo, undefined!);
      flapMesh.rotation.y = side * wingSweep;
      flapMesh.updateMatrixWorld(true);
      parts.push(tintGeo(flapGeo.clone().applyMatrix4(flapMesh.matrixWorld), NACELLE_SHADE));

      // upturned winglet at the tip
      const wgGeo = new THREE.BoxGeometry(wingChord * 0.42, 2.1, 0.22);
      wgGeo.translate(-1.5 - wingChord * 0.12, wingY + 1.0,
        side * (fusR + wingSpan + 0.1));
      const wgMesh = new THREE.Mesh(wgGeo, undefined!);
      wgMesh.rotation.y = side * wingSweep;
      wgMesh.updateMatrixWorld(true);
      parts.push(tintGeo(wgGeo.clone().applyMatrix4(wgMesh.matrixWorld), p.livery));
      // colored winglet cap (branding)
      const wgCap = new THREE.BoxGeometry(wingChord * 0.42, 0.5, 0.24);
      wgCap.translate(-1.5 - wingChord * 0.12, wingY + 1.95,
        side * (fusR + wingSpan + 0.1));
      const wgCapMesh = new THREE.Mesh(wgCap, undefined!);
      wgCapMesh.rotation.y = side * wingSweep;
      wgCapMesh.updateMatrixWorld(true);
      parts.push(tintGeo(wgCap.clone().applyMatrix4(wgCapMesh.matrixWorld), p.tail));

      // wingtip navigation light (green starboard / red port)
      parts.push(tintedBox(0.3, 0.3, 0.3,
        -1.5 - wingChord * 0.2, wingY + 0.2, side * (fusR + wingSpan + 0.4),
        side > 0 ? NAV_GREEN : NAV_RED));
    }

    // ── ENGINE NACELLES — high-bypass turbofans under the wings ───────────
    const engZ    = 9.0;
    const engX    = 2.5;
    const engY    = wingY - 2.2;
    const engLen  = 5.8;
    const engR    = 1.2;
    const engXCtr = -engX;
    const intakeX = engXCtr + engLen / 2;

    for (const side of [-1, 1]) {
      const ez = side * engZ;
      // nacelle body
      parts.push(tubeX(engR, engR * 0.92, engLen, engXCtr, engY, ez, NACELLE_COL, 16));
      // intake lip ring (slightly larger, darker)
      parts.push(tubeX(engR + 0.12, engR, 0.5, intakeX + 0.1, engY, ez, INTAKE_LIP, 16));
      // dark fan face set just inside the intake
      parts.push(tubeX(engR * 0.85, engR * 0.85, 0.2, intakeX - 0.15, engY, ez, FAN_DARK, 16, false));
      // spinner cone at the hub, tip forward
      parts.push(tubeX(0.04, 0.3, 0.7, intakeX + 0.25, engY, ez, SPINNER_COL, 12));
      // exhaust nozzle + plug at the rear
      parts.push(tubeX(engR * 0.6, engR * 0.8, 0.9, engXCtr - engLen / 2 - 0.25, engY, ez, EXHAUST, 14));
      parts.push(tubeX(0.45, 0.2, 0.6, engXCtr - engLen / 2 - 0.6, engY, ez, EXHAUST_PLUG, 12));
      // pylon connecting wing to engine
      parts.push(tintedBox(engLen * 0.7, 1.7, 0.45, engXCtr, (wingY + engY) / 2, ez, NACELLE_SHADE));
    }

    // ── VERTICAL TAIL FIN — swept, colored, two-section silhouette ─────────
    const finBaseX = -fusHalfX + 4.0;
    const finH     = 8.5;
    const finChord = 7.0;
    const finBaseY = fusY + fusR * 0.7;
    const finZ     = 0.32;

    // lower (wide) section
    parts.push(tintedBox(finChord, finH * 0.55, finZ * 2,
      finBaseX - finChord * 0.18, finBaseY + finH * 0.275, 0, p.tail));
    // upper (narrow, swept-back) section
    parts.push(tintedBox(finChord * 0.62, finH * 0.5, finZ * 2,
      finBaseX - finChord * 0.34, finBaseY + finH * 0.72, 0, p.tail));
    // slanted leading edge wedge → reads as aft sweep
    {
      const le = new THREE.BoxGeometry(0.9, finH * 1.02, finZ * 1.9);
      le.translate(finBaseX + finChord * 0.18, finBaseY + finH * 0.5, 0);
      const leMesh = new THREE.Mesh(le, undefined!);
      leMesh.rotation.z = 0.34;   // lean the leading edge backward
      leMesh.position.set(0, 0, 0);
      leMesh.updateMatrixWorld(true);
      parts.push(tintGeo(le.clone().applyMatrix4(leMesh.matrixWorld), p.tail));
    }
    // rounded tip cap
    parts.push(tintedBox(2.6, 0.9, finZ * 1.8,
      finBaseX - finChord * 0.34, finBaseY + finH + 0.1, 0, p.tail));

    // ── White Star of David on each fin face ──────────────────────────────
    const starX = finBaseX - finChord * 0.18;
    const starY = finBaseY + finH * 0.5;
    for (const side of [-1, 1]) {
      parts.push(...hexagram(starX, starY, side * (finZ + DECAL_GAP), 1.5, 0.12, EMBLEM));
    }

    // ── HORIZONTAL STABILIZERS ────────────────────────────────────────────
    const stabX     = -fusHalfX + 3.0;
    const stabY     = fusY + fusR * 0.3;
    const stabSpan  = 8.0;
    const stabH     = 0.34;
    const stabChord = 4.0;
    for (const side of [-1, 1]) {
      parts.push(tintedBox(stabChord, stabH, stabSpan,
        stabX, stabY, side * (fusR + stabSpan / 2), p.tail));
      parts.push(tintedBox(stabChord * 0.5, stabH * 0.8, 0.8,
        stabX, stabY, side * (fusR + stabSpan + 0.2), p.tail));
    }

    // ── Belly fairing under the wing box (wing-to-body fairing) ───────────
    parts.push(tintedBox(wingChord * 2.4, fusR * 1.1, fusR * 2.0,
      -1.5, fusY - fusR * 0.85, 0, p.belly));

    // ── Anti-collision beacon on the spine, above the wing ────────────────
    parts.push(tintedBox(0.3, 0.3, 0.3, -1.5, fusY + fusR + 0.2, 0, BEACON_RED));
    // white tail nav light at the fin tip
    parts.push(tintedBox(0.26, 0.26, 0.26, tailTipX + 0.2, fusY + 0.6, 0, 0xf4f6f8));

    // ── LANDING GEAR ──────────────────────────────────────────────────────
    const strutH    = fusY - fusR;     // belly clearance
    const wheelR    = 0.55;
    const wheelTh   = 0.45;
    const noseGearX = fusHalfX - 5.0;

    // nose gear: strut + paired wheels
    parts.push(cylinderY(0.15, strutH, noseGearX, strutH / 2, 0, GEAR_DARK));
    for (const side of [-1, 1]) {
      parts.push(...wheel(noseGearX, side * wheelTh * 0.7, wheelR, wheelTh, TIRE_DARK, HUB_LIGHT));
    }

    // main gear: two bogies under the wing root, four wheels each
    const mainGearX = -2.5;
    for (const side of [-1, 1]) {
      const mgZ = side * (fusR + 1.0);
      parts.push(cylinderY(0.22, strutH * 0.9, mainGearX, strutH * 0.45, mgZ, GEAR_DARK));
      parts.push(tintedBox(2.6, 0.25, 0.25, mainGearX, wheelR * 1.6, mgZ, GEAR_DARK));
      for (const fx of [-0.8, 0.8]) {
        for (const fside of [-1, 1]) {
          parts.push(...wheel(mainGearX + fx, mgZ + fside * 0.5, wheelR, wheelTh, TIRE_DARK, HUB_LIGHT));
        }
      }
    }

    // ── Build merged mesh ─────────────────────────────────────────────────
    const mainMesh = tintedMesh(mergeTinted(parts));
    mainMesh.castShadow = true;
    mainMesh.receiveShadow = true;
    group.add(mainMesh);

    // ── Registration text decal near the rear fuselage (right side) ───────
    {
      const regSign = makeTextSignMesh({
        text: p.reg,
        w: 3.0,
        h: 0.55,
        boardColor: p.belly,
        textColor: "#ffffff",
        glow: 0.0,
      });
      regSign.rotation.y = Math.PI / 2;   // face +z side
      regSign.position.set(-fusHalfX + 6, fusY - 0.35, fusR + DECAL_GAP + 0.01);
      group.add(regSign);
    }

    // ── Colliders & obstacles ─────────────────────────────────────────────
    const totalLen = fusLen + noseLen + tailLen;   // nose + tail cones included
    const bodyCX   = (noseLen - tailLen) / 2;       // asymmetric nose/tail offset
    const colliders = [
      solidBox(bodyCX, fusY, 0, totalLen, fusR * 2.1, fusR * 2.1),
    ];
    const wingspanFull = (fusR + wingSpan + 1.5) * 2;  // ~40 m
    const obstacles = [
      { x: 0, z: 0, w: totalLen, d: wingspanFull },
    ];

    return { mesh: group, colliders, obstacles };
  },
});
