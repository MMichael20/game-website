// rishon3d/src/world/dessertCart.ts
//
// A little dessert vendor cart on the promenade that shows off the object
// library in-scene: a wooden cart with a glass display case of cakes, cupcakes
// and donuts, ice creams and drinks on top, a striped canopy and a sign. Built
// in world space at a promenade spot so the World can add it directly.

import * as THREE from "three";
import { tintedBox, mergeTinted, tintedMesh } from "./objects/voxel";
import { makeCakeMesh } from "./objects/cake";
import { makeCupcakeMesh } from "./objects/cupcake";
import { makeDonutMesh } from "./objects/donut";
import { makeIceCreamMesh, ICE_CREAM_PRESETS } from "./objects/iceCream";
import { makeDrinkCupMesh, DRINK_PRESETS } from "./objects/drinkCup";
import { makeUmbrellaMesh } from "./objects/umbrella";
import { PALETTE } from "./palette";
import { FROSTING, SPONGE, GLAZE } from "./objects/objectPalette";
import { CX, ANCHOR_Z } from "./districtPois";

export function makeDessertCart(pos = { x: CX - 6, z: ANCHOR_Z + 1.5 }): THREE.Object3D {
  const g = new THREE.Group();
  g.name = "dessertCart";
  g.position.set(pos.x, 0, pos.z);

  // --- cart structure (wooden body + counter top + skirt), one merged mesh ---
  const struct: THREE.BufferGeometry[] = [];
  struct.push(tintedBox(2.8, 1.0, 1.2, 0, 0.6, 0, PALETTE.benchWood));   // body
  struct.push(tintedBox(2.64, 0.22, 1.24, 0, 0.2, 0, 0x6b4a2a));        // base skirt
  struct.push(tintedBox(3.0, 0.16, 1.4, 0, 1.12, 0, 0xcdb98c));         // counter top
  // front panel trim stripes
  for (let i = 0; i < 5; i++) {
    struct.push(tintedBox(0.5, 0.8, 0.04, -1.1 + i * 0.55, 0.6, 0.62, i % 2 ? PALETTE.awningStripe : PALETTE.awningRed));
  }
  g.add(tintedMesh(mergeTinted(struct)));

  // --- wheels ---
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x2b2b30 });
  const spokeMat = new THREE.MeshStandardMaterial({ color: 0xcdb98c });
  for (const wx of [-1.05, 1.05]) for (const wz of [-0.66, 0.66]) {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.14, 16), wheelMat);
    w.rotation.z = Math.PI / 2; w.position.set(wx, 0.36, wz); w.castShadow = true; g.add(w);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.16, 10), spokeMat);
    hub.rotation.z = Math.PI / 2; hub.position.set(wx, 0.36, wz); g.add(hub);
  }

  // --- desserts under a glass case on the counter (y = 1.2) ---
  const counterY = 1.2;
  const place = (m: THREE.Mesh, x: number, z = 0) => { m.position.set(x, counterY, z); g.add(m); };
  place(makeCakeMesh({ frostingColor: FROSTING.pink, tiers: 2 }), -1.05, -0.1);
  place(makeCupcakeMesh({ frostingColor: FROSTING.mint }), -0.5, 0.15);
  place(makeDonutMesh({ glazeColor: GLAZE.chocolate }), -0.1, -0.15);
  place(makeCupcakeMesh({ frostingColor: FROSTING.lemon }), 0.25, 0.15);
  place(makeCakeMesh({ spongeColor: SPONGE.chocolate, frostingColor: FROSTING.chocolate, slice: true }), 0.9, -0.1);

  // glass display case
  const glass = new THREE.Mesh(
    new THREE.BoxGeometry(2.7, 0.62, 1.05),
    new THREE.MeshStandardMaterial({ color: PALETTE.storefront, transparent: true, opacity: 0.22, roughness: 0.3 }),
  );
  glass.position.set(0, counterY + 0.31, 0);
  g.add(glass);

  // --- ice creams + drinks displayed on TOP of the case (y = 1.55) ---
  const topY = 1.55;
  const onTop = (m: THREE.Mesh, x: number, z = 0) => { m.position.set(x, topY, z); g.add(m); };
  onTop(makeIceCreamMesh(ICE_CREAM_PRESETS.neapolitan), -0.7, 0);
  onTop(makeDrinkCupMesh({ ...DRINK_PRESETS.berry }), -0.1, 0.1);
  onTop(makeDrinkCupMesh({ ...DRINK_PRESETS.orange }), 0.35, -0.1);

  // --- striped canopy on two posts over the cart ---
  for (const px of [-1.2, 1.2]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.6, 8), new THREE.MeshStandardMaterial({ color: PALETTE.lampPole }));
    post.position.set(px, 2.0, -0.5); g.add(post);
  }
  const canopy = makeUmbrellaMesh({ ribs: 8, radius: 1.9, height: 1.2, colorA: PALETTE.awningRed });
  canopy.position.set(0, 1.7, -0.2);
  g.add(canopy);

  // --- sign board ---
  const sign = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.5, 0.1), new THREE.MeshStandardMaterial({ color: PALETTE.signWarm }));
  sign.position.set(0, 2.7, -0.55); sign.castShadow = true; g.add(sign);
  const signLit = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 0.26, 0.06),
    new THREE.MeshStandardMaterial({ color: PALETTE.signLit, emissive: PALETTE.signLit, emissiveIntensity: 0.6 }),
  );
  signLit.position.set(0, 2.7, -0.49); g.add(signLit);

  g.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) m.castShadow = true; });
  return g;
}
