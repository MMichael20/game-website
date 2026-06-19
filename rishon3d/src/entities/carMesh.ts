// rishon3d/src/entities/carMesh.ts
import * as THREE from "three";

export type CarVariant = "sedan" | "hatch" | "van" | "taxi";
export interface CarBodyOpts {
  bodyColor: number;
  withWheels?: boolean;
  variant?: CarVariant;
}

// Shared blocky toy-car visual, built from many small boxes so it reads as a
// real multi-part vehicle rather than two stacked boxes. The body is centered
// at the group origin (y=0) to match Car's chassis convention; kinematic cars
// offset the group to y=0.5. FORWARD = +z, headlights at +z, taillights at -z.
//
// Envelope is held inside ~1.8 (x) x ~3.6 (z) so the cuboid(0.9,0.3,1.8)
// chassis collider in Car.ts still lines up. withWheels:true keeps the four
// wheels near y=-0.2 at the original corners so kinematic cars sit right.
export function makeCarBody(opts: CarBodyOpts): THREE.Group {
  const g = new THREE.Group();
  const variant: CarVariant = opts.variant ?? "sedan";

  // ---- shared materials -------------------------------------------------
  const paint = new THREE.MeshStandardMaterial({ color: opts.bodyColor, metalness: 0.1, roughness: 0.6 });
  const paintDark = new THREE.MeshStandardMaterial({ color: shade(opts.bodyColor, 0.78), metalness: 0.1, roughness: 0.65 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x1b2530, metalness: 0.2, roughness: 0.25 });
  const trim = new THREE.MeshStandardMaterial({ color: 0x16181d, metalness: 0.2, roughness: 0.85 });
  const chrome = new THREE.MeshStandardMaterial({ color: 0xb8bcc4, metalness: 0.8, roughness: 0.35 });
  const headlight = new THREE.MeshStandardMaterial({ color: 0xfff2c0, emissive: 0xffe08a, emissiveIntensity: 0.6 });
  const taillight = new THREE.MeshStandardMaterial({ color: 0xff5a48, emissive: 0xff2d1a, emissiveIntensity: 0.7 });
  const plate = new THREE.MeshStandardMaterial({ color: 0xeae6d8, emissive: 0x33312a, emissiveIntensity: 0.15, roughness: 0.8 });

  // ---- variant proportions ---------------------------------------------
  // cabinLen: greenhouse length (z). cabinH: roof height. rearLen: how far the
  // tail/trunk extends behind the cabin. roofY: top-of-roof height.
  let cabinLen = 1.7;
  let cabinH = 0.5;
  let rearTrunkLen = 0.9; // lower trunk/hatch deck behind cabin
  let roofY = 0.82;
  if (variant === "van") {
    cabinLen = 2.4;
    cabinH = 0.95;
    rearTrunkLen = 0.35;
    roofY = 1.05;
  } else if (variant === "hatch") {
    cabinLen = 1.55;
    cabinH = 0.52;
    rearTrunkLen = 0.45; // short rear
    roofY = 0.82;
  }

  const cabinZ = variant === "hatch" ? -0.35 : -0.25; // greenhouse center, pushed back a touch

  // =======================================================================
  // LOWER BODY  (main hull + lower hood/trunk decks so the cabin sits between)
  // =======================================================================
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.78, 0.5, 3.5), paint);
  body.position.y = 0; body.castShadow = true; body.receiveShadow = true;
  g.add(body);

  // Hood: a slightly lower deck at the front (+z) so the windshield can rise off it.
  const hood = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.12, 0.95), paint);
  hood.position.set(0, 0.28, 1.2); hood.castShadow = true;
  g.add(hood);

  // Trunk / hatch: lower deck at the rear (-z). For 'hatch' it's short & stubby.
  const trunk = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.12, rearTrunkLen), paint);
  trunk.position.set(0, 0.28, -(cabinLen / 2) - rearTrunkLen / 2 + cabinZ + 0.05);
  trunk.castShadow = true;
  g.add(trunk);

  // Side rub strip + door seams (dark inset boxes) on each flank.
  for (const x of [-0.9, 0.9]) {
    const rub = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.1, 2.9), trim);
    rub.position.set(x, -0.02, 0); g.add(rub);

    // two door-seam lines per side
    for (const z of [0.35, -0.55]) {
      const seam = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.42, 0.04), trim);
      seam.position.set(x, 0.05, z); g.add(seam);
    }
  }

  // Rocker skirt under the doors (dark).
  const skirt = new THREE.Mesh(new THREE.BoxGeometry(1.84, 0.16, 3.3), trim);
  skirt.position.y = -0.26; g.add(skirt);

  // =======================================================================
  // CABIN GREENHOUSE  (narrower than body; pillars + sloped glass)
  // =======================================================================
  const cabinW = 1.46;
  const cabinBaseY = 0.3;             // where the greenhouse glass starts
  const cabinTopY = roofY - 0.08;     // where the roof cap sits

  // Glass core (sits just inside the pillars). Slightly narrower than cabin.
  const glassCore = new THREE.Mesh(new THREE.BoxGeometry(cabinW - 0.06, cabinH, cabinLen - 0.1), glass);
  glassCore.position.set(0, cabinBaseY + cabinH / 2, cabinZ);
  glassCore.castShadow = true;
  g.add(glassCore);

  // Roof cap (body color, sits on the greenhouse).
  const roof = new THREE.Mesh(new THREE.BoxGeometry(cabinW, 0.14, cabinLen - 0.2), paint);
  roof.position.set(0, cabinTopY, cabinZ);
  roof.castShadow = true;
  g.add(roof);

  // Sloped WINDSHIELD: a thin glass slab raked forward off the hood.
  const windshield = new THREE.Mesh(new THREE.BoxGeometry(cabinW - 0.04, 0.62, 0.08), glass);
  windshield.position.set(0, cabinBaseY + cabinH / 2 + 0.02, cabinZ + cabinLen / 2 - 0.02);
  windshield.rotation.x = -0.42; // rake the top backward
  windshield.castShadow = true;
  g.add(windshield);

  // Sloped REAR window.
  const rearGlass = new THREE.Mesh(new THREE.BoxGeometry(cabinW - 0.06, 0.5, 0.07), glass);
  rearGlass.position.set(0, cabinBaseY + cabinH / 2 + 0.02, cabinZ - cabinLen / 2 + 0.02);
  rearGlass.rotation.x = variant === "hatch" ? 0.7 : 0.42;
  rearGlass.castShadow = true;
  g.add(rearGlass);

  // A / B / C pillars: thin body-color posts at the corners of the greenhouse.
  const pillarFrontZ = cabinZ + cabinLen / 2 - 0.06;
  const pillarRearZ = cabinZ - cabinLen / 2 + 0.06;
  const pillarMidZ = cabinZ - 0.02;
  for (const x of [-(cabinW / 2 - 0.02), cabinW / 2 - 0.02]) {
    // A-pillar (raked)
    const a = new THREE.Mesh(new THREE.BoxGeometry(0.07, cabinH + 0.08, 0.08), paint);
    a.position.set(x, cabinBaseY + cabinH / 2, pillarFrontZ);
    a.rotation.x = -0.42;
    g.add(a);
    // B-pillar (vertical, between doors)
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.06, cabinH, 0.07), paintDark);
    b.position.set(x, cabinBaseY + cabinH / 2, pillarMidZ);
    g.add(b);
    // C-pillar (rear, raked)
    const c = new THREE.Mesh(new THREE.BoxGeometry(0.07, cabinH + 0.06, 0.08), paint);
    c.position.set(x, cabinBaseY + cabinH / 2, pillarRearZ);
    c.rotation.x = variant === "hatch" ? 0.7 : 0.42;
    g.add(c);
  }

  // =======================================================================
  // FRONT END  (grille, bumper, headlights, plate)
  // =======================================================================
  const frontZ = 1.74;
  // Front bumper (dark trim, full width, low).
  const frontBumper = new THREE.Mesh(new THREE.BoxGeometry(1.78, 0.22, 0.16), trim);
  frontBumper.position.set(0, -0.16, frontZ + 0.02); g.add(frontBumper);

  // Grille (dark, centered, with a chrome strip).
  const grille = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.22, 0.06), trim);
  grille.position.set(0, 0.06, frontZ + 0.02); g.add(grille);
  const grilleBar = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.04, 0.07), chrome);
  grilleBar.position.set(0, 0.12, frontZ + 0.03); g.add(grilleBar);

  // Headlights (warm emissive) flanking the grille.
  for (const x of [-0.62, 0.62]) {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.18, 0.07), headlight);
    hl.position.set(x, 0.08, frontZ + 0.02); g.add(hl);
  }
  // Front license plate (small light box).
  const frontPlate = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.12, 0.04), plate);
  frontPlate.position.set(0, -0.13, frontZ + 0.06); g.add(frontPlate);

  // =======================================================================
  // REAR END  (bumper, taillights, plate)
  // =======================================================================
  const rearZ = -1.74;
  const rearBumper = new THREE.Mesh(new THREE.BoxGeometry(1.78, 0.22, 0.16), trim);
  rearBumper.position.set(0, -0.16, rearZ - 0.02); g.add(rearBumper);

  for (const x of [-0.62, 0.62]) {
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.2, 0.07), taillight);
    tl.position.set(x, 0.08, rearZ - 0.02); g.add(tl);
  }
  const rearPlate = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.12, 0.04), plate);
  rearPlate.position.set(0, -0.13, rearZ - 0.06); g.add(rearPlate);

  // =======================================================================
  // MIRRORS  (two side mirrors on stalks near the front pillars)
  // =======================================================================
  for (const x of [-1, 1]) {
    const stalk = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.04, 0.04), trim);
    stalk.position.set(x * 0.92, 0.3, pillarFrontZ - 0.02); g.add(stalk);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, 0.16), paint);
    cap.position.set(x * 1.0, 0.31, pillarFrontZ - 0.02); g.add(cap);
  }

  // =======================================================================
  // TAXI roof sign (only for taxi variant)
  // =======================================================================
  if (variant === "taxi") {
    const sign = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.16, 0.22),
      new THREE.MeshStandardMaterial({ color: 0x222222, emissive: 0xffcc33, emissiveIntensity: 0.6 }),
    );
    sign.position.set(0, cabinTopY + 0.14, cabinZ + 0.1);
    sign.castShadow = true;
    g.add(sign);
  }

  // =======================================================================
  // WHEELS  (cylinders + lighter hubcaps + wheel-arch trim)
  // =======================================================================
  if (opts.withWheels) {
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x111114, metalness: 0, roughness: 0.95 });
    const hubMat = new THREE.MeshStandardMaterial({ color: 0xc9ccd2, metalness: 0.7, roughness: 0.4 });
    const positions: [number, number][] = [[-0.9, 1.2], [0.9, 1.2], [-0.9, -1.2], [0.9, -1.2]];
    for (const [x, z] of positions) {
      // Each wheel is its own sub-group (one direct child of g) so callers that
      // count g.children still see exactly +4 for the four wheels, while the
      // tire / hubcap / arch meshes are all reachable via traverse().
      const wheel = new THREE.Group();
      wheel.position.set(x, -0.2, z);

      const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.3, 16), tireMat);
      tire.rotation.z = Math.PI / 2;
      tire.castShadow = true; wheel.add(tire);

      // Lighter hubcap on the OUTER face so wheels aren't plain black pucks.
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.06, 12), hubMat);
      hub.rotation.z = Math.PI / 2;
      hub.position.x = Math.sign(x) * 0.16; wheel.add(hub);

      // Subtle wheel-arch trim above each wheel (kept inside the wheel group so
      // each loop iteration adds exactly ONE direct child to g).
      const arch = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.18, 0.74), trim);
      arch.position.set(Math.sign(x) * -0.02, 0.38, 0); wheel.add(arch);

      g.add(wheel);
    }
  }

  return g;
}

// Darken a hex color toward black by a factor in [0,1] (1 = unchanged).
function shade(color: number, f: number): number {
  const r = Math.round(((color >> 16) & 0xff) * f);
  const gr = Math.round(((color >> 8) & 0xff) * f);
  const b = Math.round((color & 0xff) * f);
  return (r << 16) | (gr << 8) | b;
}
