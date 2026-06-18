// rishon3d/src/entities/carMesh.ts
import * as THREE from "three";

export interface CarBodyOpts { bodyColor: number; withWheels?: boolean }

// Shared blocky toy-car visual. Body box is centered at the group origin (y=0)
// to match Car's chassis convention; kinematic cars offset the group to y=0.5.
// Flat matte paint (metalness 0), dark-glass greenhouse, roof cap, headlights.
export function makeCarBody(opts: CarBodyOpts): THREE.Group {
  const g = new THREE.Group();
  const paint = new THREE.MeshStandardMaterial({ color: opts.bodyColor, metalness: 0, roughness: 0.85 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x222b38, metalness: 0, roughness: 0.4 });
  const trim = new THREE.MeshStandardMaterial({ color: 0x16181d, metalness: 0, roughness: 0.9 });
  const light = new THREE.MeshStandardMaterial({ color: 0xfff2c0, emissive: 0xffe08a, emissiveIntensity: 0.5 });

  const body = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.5, 3.6), paint);
  body.position.y = 0; body.castShadow = true; g.add(body);

  const skirt = new THREE.Mesh(new THREE.BoxGeometry(1.86, 0.2, 3.66), trim);
  skirt.position.y = -0.2; g.add(skirt);

  const glassBox = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.46, 1.9), glass);
  glassBox.position.set(0, 0.48, -0.2); glassBox.castShadow = true; g.add(glassBox);

  const roof = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.16, 1.7), paint);
  roof.position.set(0, 0.79, -0.2); roof.castShadow = true; g.add(roof);

  for (const x of [-0.6, 0.6]) {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.18, 0.08), light);
    hl.position.set(x, 0.05, 1.82); g.add(hl);
  }

  if (opts.withWheels) {
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111114, metalness: 0, roughness: 0.9 });
    const positions: [number, number][] = [[-0.9, 1.2], [0.9, 1.2], [-0.9, -1.2], [0.9, -1.2]];
    for (const [x, z] of positions) {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.3, 14), wheelMat);
      w.rotation.z = Math.PI / 2;
      w.position.set(x, -0.2, z); w.castShadow = true; g.add(w);
    }
  }
  return g;
}
