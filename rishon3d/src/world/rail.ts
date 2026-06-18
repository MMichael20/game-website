// rishon3d/src/world/rail.ts
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { PALETTE } from "./palette";

// Evenly spaced, center-symmetric pillar z-positions along a deck of `length`.
export function pillarZs(length: number, spacing: number): number[] {
  const count = Math.max(2, Math.floor(length / spacing));
  const span = count * spacing;
  const start = -span / 2;
  const out: number[] = [];
  for (let i = 0; i <= count; i++) out.push(start + i * spacing);
  return out;
}

// Static elevated rail: a deck on concrete pillars, plus two thin rails on top.
// Placed along x = ±130 (clear of districts at ±125), running along z. No collider.
export function makeRail(opts: { x?: number; length?: number; height?: number; spacing?: number } = {}): THREE.Object3D {
  const x = opts.x ?? 130;
  const length = opts.length ?? 260;
  const height = opts.height ?? 11;
  const spacing = opts.spacing ?? 20;
  const group = new THREE.Group();
  group.position.set(x, 0, 0);

  const concrete = new THREE.MeshStandardMaterial({ color: PALETTE.railConcrete });
  const deckMat = new THREE.MeshStandardMaterial({ color: PALETTE.railDeck });

  // Deck.
  const deck = new THREE.Mesh(new THREE.BoxGeometry(4, 1, length), deckMat);
  deck.position.set(0, height, 0);
  deck.castShadow = true; deck.receiveShadow = true;
  group.add(deck);

  // Two thin rails on top.
  const railGeos: THREE.BufferGeometry[] = [];
  for (const rx of [-1.1, 1.1]) {
    const g = new THREE.BoxGeometry(0.25, 0.3, length);
    g.translate(rx, height + 0.65, 0);
    railGeos.push(g);
  }
  const rails = new THREE.Mesh(mergeGeometries(railGeos), concrete);
  group.add(rails);

  // Pillars merged into one mesh.
  const pillarGeos: THREE.BufferGeometry[] = [];
  for (const z of pillarZs(length, spacing)) {
    const g = new THREE.BoxGeometry(1.6, height, 1.6);
    g.translate(0, height / 2, z);
    pillarGeos.push(g);
  }
  const pillars = new THREE.Mesh(mergeGeometries(pillarGeos), concrete);
  pillars.castShadow = true; pillars.receiveShadow = true;
  group.add(pillars);

  return group;
}
