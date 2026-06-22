// src/world/SkyTraffic.ts
//
// Ambient air traffic: a few airliners flying slow, banked circuits high above
// the world so the sky isn't empty. Each plane is a LIGHTWEIGHT low-poly model
// (built here, not the heavy parked-jet catalog mesh) — at cruise distance the
// fine detail is invisible, so this keeps the tri/texture cost near zero.
//
// Built as a Tickable: added to the Engine's tick list and to the scene
// directly (NOT the per-map world group), so the flights persist across the
// city↔airport map switch and keep moving every frame regardless of where the
// player is. No colliders, no shadows — pure background dressing.

import * as THREE from "three";
import type { Tickable } from "../core/Engine";
import { tintedBox, tintGeo, mergeTinted, tintedMesh } from "./objects/voxel";

const NACELLE = 0xb9bdc4;  // grey engine
const GLASS   = 0x141d30;  // cockpit hint

// A cylinder/cone lying along X (cross-section in YZ). rPlusX = radius at +x end.
function tube(
  rPlusX: number, rMinusX: number, len: number,
  cx: number, cy: number, cz: number, hex: number, seg = 8,
): THREE.BufferGeometry {
  const g = new THREE.CylinderGeometry(rPlusX, rMinusX, len, seg);
  g.rotateZ(-Math.PI / 2);
  g.translate(cx, cy, cz);
  return tintGeo(g, hex);
}

// A minimal airliner: nose +x, wingspan along Z, centered on the origin. ~150
// tris vs a few thousand for the parked-jet model.
function makeSkyPlane(livery: number, belly: number, tail: number): THREE.Mesh {
  const parts: THREE.BufferGeometry[] = [];
  const L = 30, r = 1.7, half = L / 2;

  // fuselage tube + nose + tail cones (8-sided — cheap, still rounded)
  parts.push(tube(r, r, L, 0, 0, 0, livery, 8));
  parts.push(tube(0.25, r, 6, half + 3, 0, 0, livery, 8));        // nose
  parts.push(tube(0.2, r * 0.8, 6, -half - 3, 0.4, 0, livery, 8)); // upswept tail
  // colored belly stripe
  parts.push(tintedBox(L * 0.82, r * 0.7, r * 1.9, 0, -r * 0.5, 0, belly));
  // cockpit hint
  parts.push(tintedBox(2.2, 0.9, r * 1.5, half + 0.5, r * 0.4, 0, GLASS));

  // wings + a single engine each
  const span = 15, chord = 4;
  for (const side of [-1, 1]) {
    parts.push(tintedBox(chord, 0.4, span, -1, -r * 0.3, side * (r + span / 2), livery));
    parts.push(tube(0.85, 0.78, 3.4, 0.6, -r * 0.85, side * 6.0, NACELLE, 8));
  }

  // vertical fin + horizontal stabilizers (colored)
  parts.push(tintedBox(4.2, 6.0, 0.5, -half + 1.0, r + 2.6, 0, tail));
  for (const side of [-1, 1]) {
    parts.push(tintedBox(3.0, 0.32, 6.0, -half + 1.5, r * 0.3, side * (r + 3.0), tail));
  }

  const mesh = tintedMesh(mergeTinted(parts));
  return mesh;
}

interface FlightDef {
  livery: number; belly: number; tail: number;
  radius: number;   // orbit radius (m)
  height: number;   // cruise altitude (m)
  spin: number;     // angular speed (rad/s); sign = orbit direction
  phase: number;    // starting angle (rad) so the planes are spread out
  cx: number; cz: number;  // orbit center
}

export class SkyTraffic implements Tickable {
  readonly group = new THREE.Group();
  private orbits: { pivot: THREE.Group; spin: number }[] = [];

  constructor() {
    // High and far so they read as distant cruisers (small apparent size), but
    // spun fast enough (linear speed ~18-25 m/s) that their OWN motion across
    // the sky is clearly visible, not just parallax from the player moving.
    const flights: FlightDef[] = [
      { livery: 0xffffff, belly: 0x0038b8, tail: 0x0038b8, radius: 760, height: 420, spin:  0.028, phase: 0.0, cx: 0,  cz: 150 },
      { livery: 0xf2f2f2, belly: 0xb5402f, tail: 0xb5402f, radius: 980, height: 520, spin: -0.020, phase: 2.3, cx: 0,  cz: 200 },
      { livery: 0xffffff, belly: 0x1f7a4d, tail: 0x1f7a4d, radius: 620, height: 360, spin:  0.034, phase: 4.1, cx: 40, cz: 260 },
    ];

    for (const f of flights) {
      const pivot = new THREE.Group();        // spins about its Y axis = the orbit
      pivot.position.set(f.cx, 0, f.cz);
      pivot.rotation.y = f.phase;

      const carrier = new THREE.Group();      // holds the plane out at orbit radius
      carrier.position.set(f.radius, f.height, 0);

      const banker = new THREE.Group();       // rolls the plane into the turn
      banker.rotation.z = f.spin > 0 ? 0.13 : -0.13;

      const mesh = makeSkyPlane(f.livery, f.belly, f.tail);
      // Point the nose along the direction of travel (the orbit tangent). For a
      // +Y pivot spin the plane at +x local moves toward −z, so nose → −z.
      mesh.rotation.y = f.spin > 0 ? Math.PI / 2 : -Math.PI / 2;
      mesh.scale.setScalar(0.9);
      mesh.castShadow = false;
      mesh.receiveShadow = false;

      banker.add(mesh);
      carrier.add(banker);
      pivot.add(carrier);
      this.group.add(pivot);
      this.orbits.push({ pivot, spin: f.spin });
    }
  }

  update(dt: number): void {
    for (const o of this.orbits) o.pivot.rotation.y += o.spin * dt;
  }
}
