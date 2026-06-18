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

// Gameplay anchor: the world position of the station platform (on the city-
// facing side of the deck, so the player walks up to it from the city). The
// platform sits a few units inboard (-x) of the deck at x=130, at z=0.
export const RAIL_STATION = { x: 130 - 5, z: 0 } as const;

// Station layout constants (local to the rail group at x = deck x). The
// platform runs along z beside the deck on the -x (city) side. Kept as
// module consts so makeStation() and the tests agree on the silhouette.
const STATION_Z_LEN = 24; // platform length along z
const STATION_W = 6; // platform width across x
const STATION_X = -5; // platform center, inboard of the deck (deck is at local x=0)

// Build the station cluster (platform, roof canopy on posts, stairs, train)
// in the rail group's local space. `height` is the deck height; the platform
// rides a few units below the deck so it reads as a boarding level beside the
// rail. Everything is merged per-material to keep draw calls flat.
function makeStation(height: number): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const platformY = height - 3; // boarding level, just under the deck
  const halfLen = STATION_Z_LEN / 2;
  const halfW = STATION_W / 2;
  // platform center x: between the deck edge and the city, on the -x side.
  const px = STATION_X;
  // edge of the platform nearest the deck (used to butt it against the rail).
  const platformInnerX = px + halfW; // closer to the deck (toward +x)

  const concrete = new THREE.MeshStandardMaterial({ color: PALETTE.railConcrete });
  const deckMat = new THREE.MeshStandardMaterial({ color: PALETTE.railDeck });

  // ---- platform deck + its support wall down to the ground -----------------
  const platGeos: THREE.BufferGeometry[] = [];
  // the walkable slab
  const slab = new THREE.BoxGeometry(STATION_W, 0.8, STATION_Z_LEN);
  slab.translate(px, platformY, 0);
  platGeos.push(slab);
  // a solid support wall under the slab so it does not float
  const wallH = platformY - 0.4;
  const wall = new THREE.BoxGeometry(STATION_W - 1.2, wallH, STATION_Z_LEN - 1.2);
  wall.translate(px, wallH / 2, 0);
  platGeos.push(wall);
  // a low edge curb on the deck-facing side so it reads as a platform edge
  const curb = new THREE.BoxGeometry(0.5, 0.5, STATION_Z_LEN);
  curb.translate(platformInnerX - 0.25, platformY + 0.65, 0);
  platGeos.push(curb);
  const platform = new THREE.Mesh(mergeGeometries(platGeos), deckMat);
  platform.castShadow = true; platform.receiveShadow = true;
  platform.name = "station-platform";
  out.push(platform);

  // ---- roof canopy on posts over the platform ------------------------------
  const canopyGeos: THREE.BufferGeometry[] = [];
  const postH = 4.0;
  const roofY = platformY + 0.4 + postH;
  // four corner posts
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const post = new THREE.BoxGeometry(0.4, postH, 0.4);
      post.translate(px + sx * (halfW - 0.6), platformY + 0.4 + postH / 2, sz * (halfLen - 1.2));
      canopyGeos.push(post);
    }
  }
  // flat roof slab over the posts (slightly overhanging the platform)
  const roof = new THREE.BoxGeometry(STATION_W + 1.0, 0.5, STATION_Z_LEN + 1.0);
  roof.translate(px, roofY + 0.25, 0);
  canopyGeos.push(roof);
  const canopy = new THREE.Mesh(mergeGeometries(canopyGeos), concrete);
  canopy.castShadow = true; canopy.receiveShadow = true;
  canopy.name = "station-canopy";
  out.push(canopy);

  // ---- stairs: a stepped block from the platform down to the ground ---------
  // Steps march down on the -x (city) side at the +z end of the platform so
  // the player can reach the boarding level from the street. Merged into one
  // mesh; each step is a box whose top sits at the step height.
  const stairGeos: THREE.BufferGeometry[] = [];
  const steps = 6;
  const stepRise = platformY / steps;
  const stepRun = 0.9;
  const stairW = 3.2;
  const stairOuterX = px - halfW; // city-facing edge of the platform
  const stairZ = halfLen - stairW / 2; // hug the +z end of the platform
  for (let i = 0; i < steps; i++) {
    const topY = platformY - i * stepRise; // top step flush with platform, marching down
    const h = topY; // each step is a solid block to the ground
    const stepX = stairOuterX - (i + 0.5) * stepRun; // each step extends further from the platform
    const g = new THREE.BoxGeometry(stepRun, h, stairW);
    g.translate(stepX, h / 2, stairZ);
    stairGeos.push(g);
  }
  const stairs = new THREE.Mesh(mergeGeometries(stairGeos), concrete);
  stairs.castShadow = true; stairs.receiveShadow = true;
  stairs.name = "station-stairs";
  out.push(stairs);

  // ---- train: a blocky car parked on the deck at the station ---------------
  // Sits on the deck (local x=0) spanning the station length, with a window
  // band using PALETTE.glass. Body + roof merge into one mesh; the windows are
  // a second mesh so they pick up the cool glass color.
  const trainLen = STATION_Z_LEN - 2;
  const trainHalf = trainLen / 2;
  const trainY = height + 0.5; // riding on the deck top (deck top ~ height + 0.5)
  const bodyGeos: THREE.BufferGeometry[] = [];
  // main body
  const carBody = new THREE.BoxGeometry(3.4, 2.6, trainLen);
  carBody.translate(0, trainY + 1.3, 0);
  bodyGeos.push(carBody);
  // a slightly inset roof cap so the silhouette has a shoulder
  const carRoof = new THREE.BoxGeometry(3.0, 0.5, trainLen - 0.4);
  carRoof.translate(0, trainY + 2.85, 0);
  bodyGeos.push(carRoof);
  const train = new THREE.Mesh(mergeGeometries(bodyGeos), deckMat);
  train.castShadow = true; train.receiveShadow = true;
  train.name = "station-train";
  out.push(train);

  // window band: a row of glass panels on both long sides of the car.
  const winGeos: THREE.BufferGeometry[] = [];
  const wins = 5;
  const winGap = trainLen / wins;
  for (let i = 0; i < wins; i++) {
    const wz = -trainHalf + winGap * (i + 0.5);
    for (const sx of [-1, 1]) {
      const w = new THREE.BoxGeometry(0.2, 1.0, winGap * 0.66);
      w.translate(sx * 1.75, trainY + 1.6, wz);
      winGeos.push(w);
    }
  }
  const windows = new THREE.Mesh(mergeGeometries(winGeos), new THREE.MeshStandardMaterial({ color: PALETTE.glass }));
  windows.castShadow = true;
  windows.name = "station-train-windows";
  out.push(windows);

  return out;
}

// Static elevated rail: a deck on concrete pillars, plus two thin rails on top.
// Placed along x = ±130 (clear of districts at ±125), running along z. No collider.
// At z=0 it carries a readable STATION (platform + roof canopy + stairs + a
// parked train car) so the east corridor reads as a transit destination.
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

  // Station at z=0 (deck half-length used so the train/canopy stay on the deck).
  for (const part of makeStation(height)) group.add(part);

  return group;
}
