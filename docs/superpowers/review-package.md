# Review package: rishon3d stabilize + expand

## Commits
e189c82 docs(rishon3d): note districts, traffic, and wildlife
4d89e37 feat(rishon3d): populate city with NPCs, animals, and traffic via EntityManager
c2cc90d feat(rishon3d): pure population + traffic-route planner
152b4eb feat(rishon3d): kinematic NPC traffic car
5541055 feat(rishon3d): pure path-following math for traffic
b6582b8 feat(rishon3d): wandering cat/dog animal entity
12048ea feat(rishon3d): instanced trees/bushes + cached prop materials
b9fe849 feat(rishon3d): assemble multi-district city map
48b861a feat(rishon3d): procedural district block generator
8a3ea96 feat(rishon3d): district spec type + bush prop kind
2c7880a feat(rishon3d): seeded mulberry32 RNG
c741db9 feat(rishon3d): entity manager with distance culling
b468341 feat(rishon3d): InstancedMesh builder for static props
067aa2b feat(rishon3d): shared geometry/material asset cache
c5f16b2 refactor(rishon3d): fixed-timestep physics accumulator for stability

## Diffstat
 rishon3d/README.md                   | 24 ++++++++--
 rishon3d/src/core/Physics.ts         | 11 ++++-
 rishon3d/src/core/timestep.ts        | 26 +++++++++++
 rishon3d/src/entities/Animal.ts      | 91 ++++++++++++++++++++++++++++++++++++
 rishon3d/src/entities/NpcCar.ts      | 42 +++++++++++++++++
 rishon3d/src/game/EntityManager.ts   | 37 +++++++++++++++
 rishon3d/src/game/Game.ts            | 32 ++++++++++---
 rishon3d/src/game/culling.ts         |  5 ++
 rishon3d/src/game/pathFollow.ts      | 49 +++++++++++++++++++
 rishon3d/src/game/populate.ts        | 62 ++++++++++++++++++++++++
 rishon3d/src/main.ts                 | 21 +++++++--
 rishon3d/src/world/InstancedProps.ts | 38 +++++++++++++++
 rishon3d/src/world/World.ts          | 21 +++++----
 rishon3d/src/world/assets.ts         | 30 ++++++++++++
 rishon3d/src/world/cityGen.ts        | 62 ++++++++++++++++++++++++
 rishon3d/src/world/districts.ts      | 15 ++++++
 rishon3d/src/world/props.ts          | 70 +++++++++++++++++++--------
 rishon3d/src/world/rishonMap.ts      |  6 +--
 rishon3d/src/world/rng.ts            | 13 ++++++
 rishon3d/src/world/worldData.ts      | 53 +++++++++++++++++++++
 rishon3d/test/assets.test.ts         | 29 ++++++++++++
 rishon3d/test/cityGen.test.ts        | 56 ++++++++++++++++++++++
 rishon3d/test/culling.test.ts        | 13 ++++++
 rishon3d/test/instancedProps.test.ts | 31 ++++++++++++
 rishon3d/test/pathFollow.test.ts     | 44 +++++++++++++++++
 rishon3d/test/populate.test.ts       | 37 +++++++++++++++
 rishon3d/test/rishonMap.test.ts      |  2 +-
 rishon3d/test/rng.test.ts            | 22 +++++++++
 rishon3d/test/timestep.test.ts       | 26 +++++++++++
 rishon3d/test/worldData.test.ts      | 37 +++++++++++++++
 30 files changed, 958 insertions(+), 47 deletions(-)

## Full diff
```diff
diff --git a/rishon3d/README.md b/rishon3d/README.md
index 5e0cba2..10bd246 100644
--- a/rishon3d/README.md
+++ b/rishon3d/README.md
@@ -1,25 +1,43 @@
 # Rishon 3D (spike)
 
-A small browser 3D vertical slice: walk, enter a car, drive around a few blocks of
-Rishon LeZion. Built to evaluate a 3D direction for the game. Throwaway-able.
+A small browser 3D vertical slice: walk, enter a car, drive around a procedurally
+generated city inspired by Rishon LeZion. Built to evaluate a 3D direction for the
+game. Throwaway-able.
+
+## What is in the world
+
+- **Multiple districts**: a hand-authored downtown core plus four procedural satellite
+  districts (north, east, south, west), each with its own building palette, height
+  range, and density. Arterial roads connect them to the core.
+- **NPC traffic**: kinematic cars loop around each district on rectangular routes.
+  They are purely decorative (no physics collision) but make the city feel alive.
+- **Wildlife**: cats and dogs wander the streets using the same wander logic as the
+  pedestrian NPCs, just at smaller scale and speed.
+- **Instanced props**: trees and bushes across all districts are rendered in a single
+  draw call each via InstancedMesh, keeping draw-call count flat as the city grows.
 
 ## Run
     cd rishon3d
     npm install
     npm run dev
     # open the printed localhost URL, click Start
 
 ## Controls
 - WASD / Arrows: move (on foot or driving)
+- Mouse: orbit camera (click canvas to capture pointer)
+- Scroll: zoom
 - E: enter / exit the car (stand near it)
 - Space: brake (in car)
 - Esc: pause
 
 ## Test
     npm test           # vitest unit tests (pure logic)
     npm run build      # tsc --noEmit + vite build
     npm run test:smoke # playwright boot/render smoke test
 
 ## Stack
 Three.js (rendering) + Rapier (physics, @dimforge/rapier3d-compat) + Vite + TypeScript.
-World geometry is procedural primitives; the map is data-driven in `src/world/rishonMap.ts`.
+World geometry is procedural primitives. The map is assembled in `src/world/worldData.ts`
+from a hand-authored core (`src/world/rishonMap.ts`) and procedural district data
+(`src/world/cityGen.ts`). All pure logic (timestep, culling, path-following, population
+planning) is three.js-free and covered by vitest unit tests.
diff --git a/rishon3d/src/core/Physics.ts b/rishon3d/src/core/Physics.ts
index a6a03cb..7f6fe35 100644
--- a/rishon3d/src/core/Physics.ts
+++ b/rishon3d/src/core/Physics.ts
@@ -1,21 +1,28 @@
 import RAPIER from "@dimforge/rapier3d-compat";
+import { accumulateSteps } from "./timestep";
 
 export { RAPIER };
 
+const FIXED_STEP = 1 / 60;
+const MAX_SUBSTEPS = 5;
+
 export class Physics {
   readonly world: RAPIER.World;
   private static ready = false;
+  private carry = 0;
 
   static async init(): Promise<void> {
     if (!Physics.ready) { await RAPIER.init(); Physics.ready = true; }
   }
 
   constructor() {
     this.world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
+    this.world.timestep = FIXED_STEP;
   }
 
   step(dt: number): void {
-    this.world.timestep = Math.min(dt, 1 / 30);
-    this.world.step();
+    const { steps, remainder } = accumulateSteps(this.carry, dt, FIXED_STEP, MAX_SUBSTEPS);
+    this.carry = remainder;
+    for (let i = 0; i < steps; i++) this.world.step();
   }
 }
diff --git a/rishon3d/src/core/timestep.ts b/rishon3d/src/core/timestep.ts
new file mode 100644
index 0000000..063fbfe
--- /dev/null
+++ b/rishon3d/src/core/timestep.ts
@@ -0,0 +1,26 @@
+// Pure fixed-timestep accumulator. Splits a variable frame delta into a whole
+// number of fixed substeps plus a carried remainder, clamped to avoid the
+// "spiral of death" when the frame delta is huge (e.g. after a tab is backgrounded).
+export interface StepPlan {
+  steps: number;
+  remainder: number;
+}
+
+export function accumulateSteps(
+  carry: number,
+  dt: number,
+  fixedStep: number,
+  maxSteps: number,
+): StepPlan {
+  let acc = carry + dt;
+  let steps = 0;
+  while (acc >= fixedStep && steps < maxSteps) {
+    acc -= fixedStep;
+    steps += 1;
+  }
+  // If we hit the clamp, drop excess backlog so we don't keep a huge remainder.
+  if (steps >= maxSteps && acc >= fixedStep) {
+    acc = acc % fixedStep;
+  }
+  return { steps, remainder: acc };
+}
diff --git a/rishon3d/src/entities/Animal.ts b/rishon3d/src/entities/Animal.ts
new file mode 100644
index 0000000..0cda228
--- /dev/null
+++ b/rishon3d/src/entities/Animal.ts
@@ -0,0 +1,91 @@
+import * as THREE from "three";
+import type { Agent } from "../game/EntityManager";
+import type { Vec2 } from "../world/rishonMap";
+import { getGeometry, getMaterial } from "../world/assets";
+import { moveToward, reachedTarget, clampToBounds, pickTarget, pointInRects, type Rect } from "../game/wander";
+
+export type AnimalKind = "cat" | "dog";
+
+interface AnimalOpts { bounds: number; rects: Rect[] }
+
+const STYLE: Record<AnimalKind, { color: number; scale: number; speed: number; radius: number }> = {
+  cat: { color: 0x8a8a8a, scale: 0.5, speed: 1.1, radius: 7 },
+  dog: { color: 0x9c6b3f, scale: 0.75, speed: 1.6, radius: 10 },
+};
+
+// Low-poly quadruped: body + head + 4 legs + tail, all from cached boxes.
+// Reuses the same wander logic as pedestrians, with smaller radius/speed.
+export class Animal implements Agent {
+  readonly object = new THREE.Group();
+  private legs: THREE.Object3D[] = [];
+  private pos: Vec2;
+  private target: Vec2;
+  private phase = 0;
+  private pause = 0;
+  private readonly speed: number;
+  private readonly radius: number;
+
+  constructor(scene: THREE.Scene, private origin: Vec2, kind: AnimalKind, private opts: AnimalOpts) {
+    const s = STYLE[kind];
+    this.speed = s.speed;
+    this.radius = s.radius;
+    const mat = getMaterial(`animal-${kind}`, () => new THREE.MeshStandardMaterial({ color: s.color }));
+
+    const body = new THREE.Mesh(getGeometry("animalBody", () => new THREE.BoxGeometry(0.4, 0.4, 0.9)), mat);
+    body.position.y = 0.55; body.castShadow = true;
+    const head = new THREE.Mesh(getGeometry("animalHead", () => new THREE.BoxGeometry(0.34, 0.34, 0.34)), mat);
+    head.position.set(0, 0.7, 0.6); head.castShadow = true;
+    const tail = new THREE.Mesh(getGeometry("animalTail", () => new THREE.BoxGeometry(0.1, 0.1, 0.4)), mat);
+    tail.position.set(0, 0.65, -0.6);
+    this.object.add(body, head, tail);
+
+    const legGeo = getGeometry("animalLeg", () => {
+      const g = new THREE.BoxGeometry(0.12, 0.45, 0.12);
+      g.translate(0, -0.225, 0); // pivot at hip
+      return g;
+    });
+    for (const [lx, lz] of [[-0.13, 0.3], [0.13, 0.3], [-0.13, -0.3], [0.13, -0.3]] as const) {
+      const leg = new THREE.Mesh(legGeo, mat);
+      leg.position.set(lx, 0.45, lz); leg.castShadow = true;
+      this.object.add(leg);
+      this.legs.push(leg);
+    }
+
+    this.object.scale.setScalar(s.scale);
+    this.pos = { x: origin.x, z: origin.z };
+    this.object.position.set(origin.x, 0, origin.z);
+    this.target = this.newTarget();
+    scene.add(this.object);
+  }
+
+  private newTarget(): Vec2 {
+    for (let i = 0; i < 12; i++) {
+      const t = clampToBounds(pickTarget(this.origin, this.radius, Math.random(), Math.random()), this.opts.bounds);
+      if (!pointInRects(t, this.opts.rects)) return t;
+    }
+    return { x: this.origin.x, z: this.origin.z };
+  }
+
+  private swingLegs(intensity: number): void {
+    const s = Math.sin(this.phase) * intensity;
+    this.legs[0].rotation.x = s; this.legs[3].rotation.x = s;
+    this.legs[1].rotation.x = -s; this.legs[2].rotation.x = -s;
+  }
+
+  update(dt: number): void {
+    if (this.pause > 0) { this.pause -= dt; this.swingLegs(0); return; }
+    const step = this.speed * dt;
+    const next = clampToBounds(moveToward(this.pos, this.target, step), this.opts.bounds);
+    if (pointInRects(next, this.opts.rects)) { this.target = this.newTarget(); this.swingLegs(0); return; }
+    const dx = next.x - this.pos.x, dz = next.z - this.pos.z;
+    if (dx !== 0 || dz !== 0) this.object.rotation.y = Math.atan2(dx, dz);
+    this.pos = next;
+    this.phase += step * 8;
+    this.swingLegs(0.6);
+    this.object.position.set(this.pos.x, 0, this.pos.z);
+    if (reachedTarget(this.pos, this.target, 0.5)) {
+      this.pause = 0.5 + Math.random() * 1.0;
+      this.target = this.newTarget();
+    }
+  }
+}
diff --git a/rishon3d/src/entities/NpcCar.ts b/rishon3d/src/entities/NpcCar.ts
new file mode 100644
index 0000000..bb22b83
--- /dev/null
+++ b/rishon3d/src/entities/NpcCar.ts
@@ -0,0 +1,42 @@
+import * as THREE from "three";
+import type { Agent } from "../game/EntityManager";
+import type { Vec2 } from "../world/rishonMap";
+import { advanceAlong, type FollowState } from "../game/pathFollow";
+import { getGeometry, getMaterial } from "../world/assets";
+
+const CAR_Y = 0.5;
+
+// Decorative kinematic traffic: follows a closed route of road-lane waypoints.
+// Not a physics vehicle (cheap and stable at population scale); does not
+// collide with the player.
+export class NpcCar implements Agent {
+  readonly object = new THREE.Group();
+  private state: FollowState;
+  private readonly speed: number;
+
+  constructor(scene: THREE.Scene, private route: Vec2[], color: number, speed = 7) {
+    this.speed = speed;
+    const body = new THREE.Mesh(
+      getGeometry("npcCarBody", () => new THREE.BoxGeometry(1.7, 0.6, 3.4)),
+      getMaterial(`npcCarMat-${color}`, () => new THREE.MeshStandardMaterial({ color, metalness: 0.3, roughness: 0.6 })),
+    );
+    body.position.y = CAR_Y; body.castShadow = true;
+    const cabin = new THREE.Mesh(
+      getGeometry("npcCarCabin", () => new THREE.BoxGeometry(1.4, 0.5, 1.6)),
+      getMaterial("npcCarCabinMat", () => new THREE.MeshStandardMaterial({ color: 0x222831 })),
+    );
+    cabin.position.set(0, CAR_Y + 0.5, -0.2);
+    this.object.add(body, cabin);
+
+    const start = route[0] ?? { x: 0, z: 0 };
+    this.object.position.set(start.x, 0, start.z);
+    this.state = { pos: { x: start.x, z: start.z }, heading: 0, waypoint: 1 };
+    scene.add(this.object);
+  }
+
+  update(dt: number): void {
+    this.state = advanceAlong(this.route, this.state, this.speed, dt, 1.5, 2.5);
+    this.object.position.set(this.state.pos.x, 0, this.state.pos.z);
+    this.object.rotation.y = this.state.heading;
+  }
+}
diff --git a/rishon3d/src/game/EntityManager.ts b/rishon3d/src/game/EntityManager.ts
new file mode 100644
index 0000000..a311d6f
--- /dev/null
+++ b/rishon3d/src/game/EntityManager.ts
@@ -0,0 +1,37 @@
+import * as THREE from "three";
+import type { Tickable } from "../core/Engine";
+import { inRange } from "./culling";
+
+// An agent is anything with a scene object and per-frame update (NPC people,
+// animals, traffic). The manager owns the population and applies a simple
+// distance LOD: agents beyond cullDistance are hidden and skip their update.
+export interface Agent extends Tickable {
+  readonly object: THREE.Object3D;
+}
+
+export class EntityManager implements Tickable {
+  private agents: Agent[] = [];
+
+  constructor(
+    private getCameraPos: () => THREE.Vector3,
+    private cullDistance = 130,
+  ) {}
+
+  add(agent: Agent): void {
+    this.agents.push(agent);
+  }
+
+  get count(): number {
+    return this.agents.length;
+  }
+
+  update(dt: number): void {
+    const cam = this.getCameraPos();
+    for (const a of this.agents) {
+      const p = a.object.position;
+      const visible = inRange(p.x - cam.x, p.z - cam.z, this.cullDistance);
+      a.object.visible = visible;
+      if (visible) a.update(dt);
+    }
+  }
+}
diff --git a/rishon3d/src/game/Game.ts b/rishon3d/src/game/Game.ts
index c4668d3..529694c 100644
--- a/rishon3d/src/game/Game.ts
+++ b/rishon3d/src/game/Game.ts
@@ -1,30 +1,34 @@
 import * as THREE from "three";
 import type { Tickable } from "../core/Engine";
 import { FollowCamera } from "../core/FollowCamera";
 import type { Input } from "../core/Input";
 import type { Physics } from "../core/Physics";
 import { Character } from "../entities/Character";
 import { Car } from "../entities/Car";
 import { Npc } from "../entities/Npc";
+import { Animal } from "../entities/Animal";
+import { NpcCar } from "../entities/NpcCar";
 import type { World } from "../world/World";
 import { nextMode, canEnter, type Mode } from "./InteractionSystem";
 import { buildingRects } from "./wander";
+import { EntityManager } from "./EntityManager";
+import { planPopulations } from "./populate";
 import type { Hud } from "../ui/Hud";
 
 const ENTER_RADIUS = 3.5;
 
 export class Game implements Tickable {
   private character: Character;
   private car: Car;
   private mode: Mode = "onFoot";
-  private npcs: Npc[] = [];
+  private entities: EntityManager;
 
   constructor(
     scene: THREE.Scene,
     physics: Physics,
     private input: Input,
     world: World,
     private follow: FollowCamera,
     camera: THREE.Camera,
     private hud: Hud,
   ) {
@@ -33,55 +37,71 @@ export class Game implements Tickable {
     const rects = buildingRects(world.map.buildings, 1.5);
     const bounds = world.map.ground.size / 2 - 2;
     const palettes = [
       { skin: 0xe8b98a, shirt: 0x9b59b6, pants: 0x40313f },
       { skin: 0xf0c9a0, shirt: 0x27ae60, pants: 0x1e5c3a },
       { skin: 0xd9a066, shirt: 0xe67e22, pants: 0x7a431a },
       { skin: 0xf2d2b6, shirt: 0x2980b9, pants: 0x1f3f57 },
       { skin: 0xe8b98a, shirt: 0xc0392b, pants: 0x5a1f1a },
       { skin: 0xf0c9a0, shirt: 0xf1c40f, pants: 0x6b5a12 },
     ];
+    this.entities = new EntityManager(() => camera.position, 140);
+
+    // Hand-authored downtown NPCs (kept for character).
     world.npcSpawns.forEach((s, i) => {
-      this.npcs.push(new Npc(scene, s, palettes[i % palettes.length], { bounds, rects }));
+      this.entities.add(new Npc(scene, s, palettes[i % palettes.length], { bounds, rects }));
+    });
+
+    // Procedurally placed life across the whole city.
+    const pop = planPopulations(world.map, 1234, { pedestrians: 28, cats: 8, dogs: 8 });
+    pop.pedestrians.forEach((s, i) => {
+      this.entities.add(new Npc(scene, s, palettes[i % palettes.length], { bounds, rects }));
+    });
+    pop.cats.forEach((s) => this.entities.add(new Animal(scene, s, "cat", { bounds, rects })));
+    pop.dogs.forEach((s) => this.entities.add(new Animal(scene, s, "dog", { bounds, rects })));
+
+    const carColors = [0x2980b9, 0xf1c40f, 0x27ae60, 0xe67e22, 0x8e44ad, 0xecf0f1];
+    pop.carRoutes.forEach((route, i) => {
+      this.entities.add(new NpcCar(scene, route, carColors[i % carColors.length], 6 + (i % 3)));
     });
     this.car.enabled = false;
     this.character.enabled = true;
-    this.follow.setTarget(this.character.object, new THREE.Vector3(0, 6, 9));
+    this.follow.setTarget(this.character.object, 10, 1.6);
   }
 
   update(dt: number): void {
     const ePressed = this.input.justPressed("KeyE");
     const pPos = { x: this.character.position.x, z: this.character.position.z };
     const cPos = { x: this.car.position.x, z: this.car.position.z };
     const newMode = nextMode(this.mode, ePressed, pPos, cPos, ENTER_RADIUS);
 
     if (newMode !== this.mode) {
       this.mode = newMode;
       if (this.mode === "driving") {
         this.character.enabled = false;
         this.character.object.visible = false;
         this.car.enabled = true;
-        this.follow.setTarget(this.car.object, new THREE.Vector3(0, 5, 9));
+        this.follow.setTarget(this.car.object, 11, 1.4);
       } else {
         this.car.enabled = false;
         this.character.setPosition(this.car.position.x + 2.5, this.car.position.z);
         this.character.object.visible = true;
         this.character.enabled = true;
-        this.follow.setTarget(this.character.object, new THREE.Vector3(0, 6, 9));
+        this.follow.setTarget(this.character.object, 10, 1.6);
       }
     }
 
     // prompt
     if (this.mode === "onFoot" && canEnter("onFoot", pPos, cPos, ENTER_RADIUS)) {
       this.hud.setPrompt("Press E to drive");
     } else if (this.mode === "driving") {
       this.hud.setPrompt("Press E to exit");
     } else {
       this.hud.setPrompt(null);
     }
 
     this.character.update(dt);
     this.car.update(dt);
-    for (const n of this.npcs) n.update(dt);
+    this.entities.update(dt);
     this.input.endFrame();
   }
 }
diff --git a/rishon3d/src/game/culling.ts b/rishon3d/src/game/culling.ts
new file mode 100644
index 0000000..9beb5b7
--- /dev/null
+++ b/rishon3d/src/game/culling.ts
@@ -0,0 +1,5 @@
+// Squared-distance range check (no sqrt). Used to skip updating/rendering
+// agents far from the camera.
+export function inRange(dx: number, dz: number, radius: number): boolean {
+  return dx * dx + dz * dz <= radius * radius;
+}
diff --git a/rishon3d/src/game/pathFollow.ts b/rishon3d/src/game/pathFollow.ts
new file mode 100644
index 0000000..26ceff4
--- /dev/null
+++ b/rishon3d/src/game/pathFollow.ts
@@ -0,0 +1,49 @@
+import type { Vec2 } from "../world/rishonMap";
+
+// Rotate `current` toward `target` by at most `maxDelta`, taking the short way
+// around the circle (handles the +/-PI seam).
+export function turnToward(current: number, target: number, maxDelta: number): number {
+  let diff = target - current;
+  while (diff > Math.PI) diff -= Math.PI * 2;
+  while (diff < -Math.PI) diff += Math.PI * 2;
+  if (Math.abs(diff) <= maxDelta) return target;
+  return current + Math.sign(diff) * maxDelta;
+}
+
+export interface FollowState {
+  pos: Vec2;
+  heading: number;
+  waypoint: number;
+}
+
+// Kinematic route follower. Eases heading toward the active waypoint, steps
+// forward by speed*dt, and advances (looping) when within arriveRadius.
+export function advanceAlong(
+  route: Vec2[],
+  state: FollowState,
+  speed: number,
+  dt: number,
+  arriveRadius: number,
+  turnRate: number,
+): FollowState {
+  if (route.length === 0) return state;
+
+  let waypoint = state.waypoint % route.length;
+  const target = route[waypoint];
+  const dx = target.x - state.pos.x;
+  const dz = target.z - state.pos.z;
+  const dist = Math.hypot(dx, dz);
+
+  if (dist <= arriveRadius) {
+    waypoint = (waypoint + 1) % route.length;
+  }
+
+  const desiredHeading = Math.atan2(dx, dz);
+  const heading = turnToward(state.heading, desiredHeading, turnRate * dt);
+  const step = speed * dt;
+  const pos = {
+    x: state.pos.x + Math.sin(heading) * step,
+    z: state.pos.z + Math.cos(heading) * step,
+  };
+  return { pos, heading, waypoint };
+}
diff --git a/rishon3d/src/game/populate.ts b/rishon3d/src/game/populate.ts
new file mode 100644
index 0000000..cf6f3d0
--- /dev/null
+++ b/rishon3d/src/game/populate.ts
@@ -0,0 +1,62 @@
+import type { RishonMap, Vec2, RoadDef } from "../world/rishonMap";
+import { mulberry32 } from "../world/rng";
+import { DISTRICTS } from "../world/worldData";
+
+export interface PopulationBudget {
+  pedestrians: number;
+  cats: number;
+  dogs: number;
+}
+
+export interface Populations {
+  pedestrians: Vec2[];
+  cats: Vec2[];
+  dogs: Vec2[];
+  carRoutes: Vec2[][];
+}
+
+// Sample a point on a road, offset slightly to a side lane.
+function pointOnRoad(road: RoadDef, t: number, laneOffset: number): Vec2 {
+  if (road.horizontal) {
+    return { x: road.x - road.length / 2 + t * road.length, z: road.z + laneOffset };
+  }
+  return { x: road.x + laneOffset, z: road.z - road.length / 2 + t * road.length };
+}
+
+function sampleOnRoads(roads: RoadDef[], count: number, rng: () => number): Vec2[] {
+  const out: Vec2[] = [];
+  if (roads.length === 0) return out;
+  for (let i = 0; i < count; i++) {
+    const road = roads[Math.floor(rng() * roads.length)];
+    const lane = (rng() < 0.5 ? -1 : 1) * (1.5 + rng() * 1.0);
+    out.push(pointOnRoad(road, rng(), lane));
+  }
+  return out;
+}
+
+// A clockwise rectangular loop around a district center, on the arterial ring.
+function districtLoop(center: Vec2, half: number): Vec2[] {
+  return [
+    { x: center.x - half, z: center.z - half },
+    { x: center.x + half, z: center.z - half },
+    { x: center.x + half, z: center.z + half },
+    { x: center.x - half, z: center.z + half },
+  ];
+}
+
+export function planPopulations(map: RishonMap, seed: number, budget: PopulationBudget): Populations {
+  const rng = mulberry32(seed);
+  const roads = map.roads;
+
+  const pedestrians = sampleOnRoads(roads, budget.pedestrians, rng);
+  const cats = sampleOnRoads(roads, budget.cats, rng);
+  const dogs = sampleOnRoads(roads, budget.dogs, rng);
+
+  // One traffic loop per district, plus a big loop around downtown.
+  const carRoutes: Vec2[][] = [
+    districtLoop({ x: 0, z: 0 }, 50),
+    ...DISTRICTS.map((d) => districtLoop(d.center, d.size / 2 - 4)),
+  ];
+
+  return { pedestrians, cats, dogs, carRoutes };
+}
diff --git a/rishon3d/src/main.ts b/rishon3d/src/main.ts
index c9bf048..98415e3 100644
--- a/rishon3d/src/main.ts
+++ b/rishon3d/src/main.ts
@@ -1,16 +1,17 @@
 import { Engine } from "./core/Engine";
 import { Input } from "./core/Input";
 import { Physics } from "./core/Physics";
 import { FollowCamera } from "./core/FollowCamera";
 import { World } from "./world/World";
-import { RISHON_MAP, validateMap } from "./world/rishonMap";
+import { validateMap } from "./world/rishonMap";
+import { RISHON_MAP } from "./world/worldData";
 import { Game } from "./game/Game";
 import { Menu } from "./ui/Menu";
 import { Hud } from "./ui/Hud";
 
 async function boot() {
   const container = document.getElementById("app")!;
   const errors = validateMap(RISHON_MAP);
   if (errors.length) console.error("map invalid", errors);
 
   await Physics.init();
@@ -20,27 +21,41 @@ async function boot() {
   const follow = new FollowCamera(engine.camera);
   const input = new Input();
   const hud = new Hud(container);
   const game = new Game(engine.scene, physics, input, world, follow, engine.camera, hud);
 
   // step physics before game logic each frame
   engine.add({ update: (dt) => physics.step(dt) });
   engine.add(game);
   engine.add(follow);
 
-  hud.setHint("WASD / Arrows move - Space brake - E enter/exit - Esc pause");
+  hud.setHint("WASD / Arrows move - Mouse look - Scroll zoom - Space brake - E enter/exit - Esc pause");
+
+  // GTA-style camera: capture the pointer so mouse movement orbits the camera.
+  const canvas = engine.renderer.domElement;
+  const lockPointer = () => {
+    const p = canvas.requestPointerLock?.() as unknown as Promise<void> | undefined;
+    if (p && typeof p.catch === "function") p.catch(() => {}); // ignore lock rejections (e.g. headless)
+  };
 
   const menu = new Menu(container);
   let started = false;
-  const begin = () => { menu.hide(); engine.start(); started = true; };
+  const begin = () => { menu.hide(); engine.start(); started = true; lockPointer(); };
   menu.onStart(begin);
   menu.showTitle();
 
+  // Re-acquire pointer lock if the user clicks back into the canvas while playing.
+  canvas.addEventListener("click", () => { if (started) lockPointer(); });
+  window.addEventListener("mousemove", (e) => {
+    if (document.pointerLockElement === canvas) follow.addOrbit(e.movementX, e.movementY);
+  });
+  window.addEventListener("wheel", (e) => { if (started) follow.zoom(e.deltaY); }, { passive: true });
+
   window.addEventListener("keydown", (e) => {
     if (e.code === "Escape" && started) {
       if (engine["running"] ?? true) { input.clear(); engine.stop(); menu.showPause(); }
     }
   });
   window.addEventListener("blur", () => input.clear());
 }
 
 boot();
diff --git a/rishon3d/src/world/InstancedProps.ts b/rishon3d/src/world/InstancedProps.ts
new file mode 100644
index 0000000..3c890b0
--- /dev/null
+++ b/rishon3d/src/world/InstancedProps.ts
@@ -0,0 +1,38 @@
+import * as THREE from "three";
+
+export interface Placement {
+  x: number;
+  z: number;
+  rotationY?: number;
+  scale?: number;
+}
+
+const UP = new THREE.Vector3(0, 1, 0);
+
+// Renders many identical static props (trees, bushes, poles) in a single draw
+// call. Bake vertical offsets into the source geometry (geometry.translate) so
+// one transform per instance places the whole prop on the ground plane.
+export function makeInstanced(
+  geometry: THREE.BufferGeometry,
+  material: THREE.Material,
+  placements: Placement[],
+  baseY: number,
+): THREE.InstancedMesh {
+  const mesh = new THREE.InstancedMesh(geometry, material, placements.length);
+  const matrix = new THREE.Matrix4();
+  const quat = new THREE.Quaternion();
+  const scale = new THREE.Vector3();
+  const pos = new THREE.Vector3();
+  placements.forEach((p, i) => {
+    quat.setFromAxisAngle(UP, p.rotationY ?? 0);
+    const s = p.scale ?? 1;
+    scale.set(s, s, s);
+    pos.set(p.x, baseY, p.z);
+    matrix.compose(pos, quat, scale);
+    mesh.setMatrixAt(i, matrix);
+  });
+  mesh.instanceMatrix.needsUpdate = true;
+  mesh.castShadow = true;
+  mesh.receiveShadow = true;
+  return mesh;
+}
diff --git a/rishon3d/src/world/World.ts b/rishon3d/src/world/World.ts
index 77d123b..13c3645 100644
--- a/rishon3d/src/world/World.ts
+++ b/rishon3d/src/world/World.ts
@@ -1,14 +1,14 @@
 import * as THREE from "three";
 import { Physics, RAPIER } from "../core/Physics";
 import { makeBuilding, makeGround, makeRoad } from "./builders";
-import { makeTree, makeStreetLight } from "./props";
+import { treeInstances, bushInstances, makeStreetLight } from "./props";
 import type { RishonMap } from "./rishonMap";
 
 export class World {
   constructor(scene: THREE.Scene, physics: Physics, public readonly map: RishonMap) {
     scene.add(makeGround(map));
     for (const r of map.roads) scene.add(makeRoad(r));
 
     // ground collider (thin fixed cuboid at y=0)
     const half = map.ground.size / 2;
     const groundBody = physics.world.createRigidBody(RAPIER.RigidBodyDesc.fixed());
@@ -21,29 +21,30 @@ export class World {
       scene.add(makeBuilding(b));
       const body = physics.world.createRigidBody(
         RAPIER.RigidBodyDesc.fixed().setTranslation(b.x, b.height / 2, b.z),
       );
       physics.world.createCollider(
         RAPIER.ColliderDesc.cuboid(b.width / 2, b.height / 2, b.depth / 2),
         body,
       );
     }
 
+    scene.add(treeInstances(map.props));
+    scene.add(bushInstances(map.props));
+
     let lightBudget = 6;
     for (const p of map.props) {
-      if (p.kind === "tree") scene.add(makeTree(p));
-      else {
-        const sl = makeStreetLight(p);
-        scene.add(sl);
-        if (lightBudget-- > 0) {
-          const glow = new THREE.PointLight(0xffb24d, 8, 16, 2);
-          glow.position.set(p.x, 3.4, p.z);
-          scene.add(glow);
-        }
+      if (p.kind !== "streetlight") continue;
+      const sl = makeStreetLight(p);
+      scene.add(sl);
+      if (lightBudget-- > 0) {
+        const glow = new THREE.PointLight(0xffb24d, 8, 16, 2);
+        glow.position.set(p.x, 3.4, p.z);
+        scene.add(glow);
       }
     }
   }
 
   get npcSpawns() { return this.map.npcSpawns; }
   get carSpawn() { return this.map.carSpawn; }
   get playerSpawn() { return this.map.playerSpawn; }
 }
diff --git a/rishon3d/src/world/assets.ts b/rishon3d/src/world/assets.ts
new file mode 100644
index 0000000..cb9a6f0
--- /dev/null
+++ b/rishon3d/src/world/assets.ts
@@ -0,0 +1,30 @@
+import * as THREE from "three";
+
+// Process-wide cache of shared geometries and materials. Keeps the GPU
+// allocation count at O(distinct kinds) instead of O(objects), which is the
+// main scaling lever as the world fills with props and agents.
+const geometries = new Map<string, THREE.BufferGeometry>();
+const materials = new Map<string, THREE.Material>();
+
+export function getGeometry(key: string, make: () => THREE.BufferGeometry): THREE.BufferGeometry {
+  let g = geometries.get(key);
+  if (!g) { g = make(); geometries.set(key, g); }
+  return g;
+}
+
+export function getMaterial(key: string, make: () => THREE.Material): THREE.Material {
+  let m = materials.get(key);
+  if (!m) { m = make(); materials.set(key, m); }
+  return m;
+}
+
+export function disposeAssets(): void {
+  for (const g of geometries.values()) g.dispose();
+  for (const m of materials.values()) m.dispose();
+  geometries.clear();
+  materials.clear();
+}
+
+export function assetCounts(): { geometries: number; materials: number } {
+  return { geometries: geometries.size, materials: materials.size };
+}
diff --git a/rishon3d/src/world/cityGen.ts b/rishon3d/src/world/cityGen.ts
new file mode 100644
index 0000000..98206ae
--- /dev/null
+++ b/rishon3d/src/world/cityGen.ts
@@ -0,0 +1,62 @@
+import type { BuildingDef, RoadDef, PropDef } from "./rishonMap";
+import type { DistrictSpec } from "./districts";
+import { mulberry32 } from "./rng";
+
+export const ROAD_WIDTH = 6;
+
+export interface DistrictResult {
+  buildings: BuildingDef[];
+  roads: RoadDef[];
+  props: PropDef[];
+}
+
+// Lays a uniform street grid over the district and drops a building into the
+// centre of each cell, sized to leave a clear road corridor on all sides.
+// Deterministic given spec.seed.
+export function generateDistrict(spec: DistrictSpec): DistrictResult {
+  const rng = mulberry32(spec.seed);
+  const half = spec.size / 2;
+  const cell = spec.size / spec.blocks;
+  const buildings: BuildingDef[] = [];
+  const roads: RoadDef[] = [];
+  const props: PropDef[] = [];
+
+  for (let i = 0; i <= spec.blocks; i++) {
+    const offset = -half + i * cell;
+    roads.push({ id: `${spec.id}-rh-${i}`, x: spec.center.x, z: spec.center.z + offset, length: spec.size, horizontal: true });
+    roads.push({ id: `${spec.id}-rv-${i}`, x: spec.center.x + offset, z: spec.center.z, length: spec.size, horizontal: false });
+  }
+
+  // Largest centered footprint that still leaves a full road corridor + 1u margin.
+  const maxFootprint = cell - ROAD_WIDTH - 2;
+
+  for (let gx = 0; gx < spec.blocks; gx++) {
+    for (let gz = 0; gz < spec.blocks; gz++) {
+      // Consume rng in a fixed order regardless of branches so layout is stable.
+      const place = rng();
+      const rw = rng();
+      const rd = rng();
+      const rh = rng();
+      const rc = rng();
+      const rtree = rng();
+      if (place > spec.density || maxFootprint < 3) continue;
+
+      const cx = spec.center.x - half + (gx + 0.5) * cell;
+      const cz = spec.center.z - half + (gz + 0.5) * cell;
+      const w = 3 + rw * Math.min(maxFootprint - 3, 7);
+      const d = 3 + rd * Math.min(maxFootprint - 3, 7);
+      const h = spec.minHeight + rh * (spec.maxHeight - spec.minHeight);
+      const color = spec.palette[Math.floor(rc * spec.palette.length)] ?? spec.palette[0];
+      buildings.push({ id: `${spec.id}-b-${gx}-${gz}`, x: cx, z: cz, width: w, depth: d, height: h, color });
+
+      if (rtree < 0.5) {
+        // Tuck a bush/tree against the building, still clear of the corridor.
+        const kind = rtree < 0.25 ? "tree" : "bush";
+        const ox = (w / 2) + 0.8;
+        props.push({ id: `${spec.id}-p-${gx}-${gz}`, kind, x: cx - ox, z: cz });
+      }
+    }
+  }
+
+  return { buildings, roads, props };
+}
diff --git a/rishon3d/src/world/districts.ts b/rishon3d/src/world/districts.ts
new file mode 100644
index 0000000..1e12027
--- /dev/null
+++ b/rishon3d/src/world/districts.ts
@@ -0,0 +1,15 @@
+import type { Vec2 } from "./rishonMap";
+
+// A district is a square region with a uniform street grid and a building style.
+// The procedural generator (cityGen) turns a spec into buildings/roads/props.
+export interface DistrictSpec {
+  id: string;
+  center: Vec2;
+  size: number;        // side length of the square footprint, world units
+  blocks: number;      // grid divisions per side (blocks x blocks cells)
+  seed: number;
+  palette: number[];   // candidate building colors
+  minHeight: number;
+  maxHeight: number;
+  density: number;     // 0..1 probability a cell receives a building
+}
diff --git a/rishon3d/src/world/props.ts b/rishon3d/src/world/props.ts
index 331181b..3793b3e 100644
--- a/rishon3d/src/world/props.ts
+++ b/rishon3d/src/world/props.ts
@@ -1,36 +1,68 @@
 import * as THREE from "three";
 import type { PropDef } from "./rishonMap";
+import { getGeometry, getMaterial } from "./assets";
+import { makeInstanced, type Placement } from "./InstancedProps";
 
-export function makeTree(def: PropDef): THREE.Object3D {
-  const g = new THREE.Group();
-  g.position.set(def.x, 0, def.z);
-  const trunk = new THREE.Mesh(
-    new THREE.CylinderGeometry(0.18, 0.24, 1.4, 8),
-    new THREE.MeshStandardMaterial({ color: 0x6b4a2b }),
-  );
-  trunk.position.y = 0.7; trunk.castShadow = true;
-  const foliage = new THREE.Mesh(
-    new THREE.ConeGeometry(1.1, 2.2, 9),
-    new THREE.MeshStandardMaterial({ color: 0x3f7d3a }),
-  );
-  foliage.position.y = 2.2; foliage.castShadow = true;
-  g.add(trunk, foliage);
-  return g;
+// --- shared geometries (vertical offset baked in so one transform places the prop) ---
+function trunkGeo(): THREE.BufferGeometry {
+  return getGeometry("trunk", () => {
+    const g = new THREE.CylinderGeometry(0.18, 0.24, 1.4, 8);
+    g.translate(0, 0.7, 0);
+    return g;
+  });
+}
+function foliageGeo(): THREE.BufferGeometry {
+  return getGeometry("foliage", () => {
+    const g = new THREE.ConeGeometry(1.1, 2.2, 9);
+    g.translate(0, 2.2, 0);
+    return g;
+  });
+}
+function bushGeo(): THREE.BufferGeometry {
+  return getGeometry("bush", () => {
+    const g = new THREE.SphereGeometry(0.7, 8, 6);
+    g.scale(1, 0.7, 1);
+    g.translate(0, 0.5, 0);
+    return g;
+  });
+}
+const trunkMat = () => getMaterial("trunkMat", () => new THREE.MeshStandardMaterial({ color: 0x6b4a2b }));
+const foliageMat = () => getMaterial("foliageMat", () => new THREE.MeshStandardMaterial({ color: 0x3f7d3a }));
+const bushMat = () => getMaterial("bushMat", () => new THREE.MeshStandardMaterial({ color: 0x4f8c46 }));
+
+function placementsFor(props: PropDef[], kind: PropDef["kind"]): Placement[] {
+  return props
+    .filter((p) => p.kind === kind)
+    .map((p, i) => ({ x: p.x, z: p.z, rotationY: (i * 2.39996) % (Math.PI * 2), scale: 0.85 + ((i * 7) % 5) * 0.08 }));
+}
+
+export function treeInstances(props: PropDef[]): THREE.Object3D {
+  const group = new THREE.Group();
+  const pl = placementsFor(props, "tree");
+  if (pl.length === 0) return group;
+  group.add(makeInstanced(trunkGeo(), trunkMat(), pl, 0));
+  group.add(makeInstanced(foliageGeo(), foliageMat(), pl, 0));
+  return group;
+}
+
+export function bushInstances(props: PropDef[]): THREE.Object3D {
+  const pl = placementsFor(props, "bush");
+  return makeInstanced(bushGeo(), bushMat(), pl, 0);
 }
 
 export function makeStreetLight(def: PropDef): THREE.Object3D {
   const g = new THREE.Group();
   g.position.set(def.x, 0, def.z);
   const pole = new THREE.Mesh(
-    new THREE.CylinderGeometry(0.08, 0.1, 3.4, 8),
-    new THREE.MeshStandardMaterial({ color: 0x2b2b30 }),
+    getGeometry("slPole", () => new THREE.CylinderGeometry(0.08, 0.1, 3.4, 8)),
+    getMaterial("slPoleMat", () => new THREE.MeshStandardMaterial({ color: 0x2b2b30 })),
   );
   pole.position.y = 1.7; pole.castShadow = true;
   const lamp = new THREE.Mesh(
-    new THREE.BoxGeometry(0.4, 0.18, 0.4),
-    new THREE.MeshStandardMaterial({ color: 0xffd98a, emissive: 0xffb24d, emissiveIntensity: 1.2 }),
+    getGeometry("slLamp", () => new THREE.BoxGeometry(0.4, 0.18, 0.4)),
+    getMaterial("slLampMat", () => new THREE.MeshStandardMaterial({ color: 0xffd98a, emissive: 0xffb24d, emissiveIntensity: 1.2 })),
   );
   lamp.position.y = 3.5;
   g.add(pole, lamp);
   return g;
 }
diff --git a/rishon3d/src/world/rishonMap.ts b/rishon3d/src/world/rishonMap.ts
index b97dd2c..3f4dd68 100644
--- a/rishon3d/src/world/rishonMap.ts
+++ b/rishon3d/src/world/rishonMap.ts
@@ -3,35 +3,35 @@ export interface Vec2 { x: number; z: number }
 export interface BuildingDef {
   id: string; x: number; z: number;
   width: number; depth: number; height: number;
   color: number; isHouse?: boolean;
 }
 
 export interface RoadDef {
   id: string; x: number; z: number; length: number; horizontal: boolean;
 }
 
-export type PropKind = "tree" | "streetlight";
+export type PropKind = "tree" | "streetlight" | "bush";
 export interface PropDef { id: string; kind: PropKind; x: number; z: number }
 
 export interface RishonMap {
   ground: { size: number };
   buildings: BuildingDef[];
   roads: RoadDef[];
   npcSpawns: Vec2[];
   carSpawn: Vec2;
   playerSpawn: Vec2;
   props: PropDef[];
 }
 
-export const RISHON_MAP: RishonMap = {
-  ground: { size: 120 },
+export const CORE_MAP: RishonMap = {
+  ground: { size: 280 },
   roads: [
     { id: "main-h", x: 0, z: 0, length: 120, horizontal: true },
     { id: "cross-v", x: 0, z: 0, length: 120, horizontal: false },
   ],
   buildings: [
     { id: "house", x: 14, z: 14, width: 8, depth: 8, height: 5, color: 0xd98c5f, isHouse: true },
     { id: "b1", x: -18, z: 12, width: 10, depth: 10, height: 12, color: 0x8d99ae },
     { id: "b2", x: -16, z: -16, width: 12, depth: 8, height: 16, color: 0x6d7a91 },
     { id: "b3", x: 18, z: -14, width: 9, depth: 11, height: 9, color: 0xa3b0c2 },
     { id: "b4", x: 34, z: 8, width: 8, depth: 8, height: 20, color: 0x7c8aa0 },
diff --git a/rishon3d/src/world/rng.ts b/rishon3d/src/world/rng.ts
new file mode 100644
index 0000000..fb5b384
--- /dev/null
+++ b/rishon3d/src/world/rng.ts
@@ -0,0 +1,13 @@
+// mulberry32: small, fast, deterministic PRNG. Returns a function that yields
+// successive floats in [0, 1). Used so procedural generation is reproducible
+// and unit-testable (no Math.random in pure modules).
+export function mulberry32(seed: number): () => number {
+  let a = seed >>> 0;
+  return function () {
+    a |= 0;
+    a = (a + 0x6d2b79f5) | 0;
+    let t = Math.imul(a ^ (a >>> 15), 1 | a);
+    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
+    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
+  };
+}
diff --git a/rishon3d/src/world/worldData.ts b/rishon3d/src/world/worldData.ts
new file mode 100644
index 0000000..f7706f7
--- /dev/null
+++ b/rishon3d/src/world/worldData.ts
@@ -0,0 +1,53 @@
+import { CORE_MAP, type RishonMap, type RoadDef } from "./rishonMap";
+import type { DistrictSpec } from "./districts";
+import { generateDistrict } from "./cityGen";
+
+// Four satellite districts arranged around the hand-authored downtown core.
+// Centers/sizes chosen to sit inside the 280-unit ground with margin and not
+// overlap the core (which spans roughly +/-40 around the origin).
+export const DISTRICTS: DistrictSpec[] = [
+  { id: "north", center: { x: 0, z: -95 }, size: 60, blocks: 4, seed: 101,
+    palette: [0x9aa7b8, 0x7c8aa0, 0x6d7a91], minHeight: 8, maxHeight: 22, density: 0.85 },
+  { id: "east", center: { x: 95, z: 0 }, size: 60, blocks: 4, seed: 202,
+    palette: [0xb0a08a, 0xc2b29a, 0x99876b], minHeight: 6, maxHeight: 16, density: 0.8 },
+  { id: "south", center: { x: 0, z: 95 }, size: 60, blocks: 5, seed: 303,
+    palette: [0x99a6ba, 0x828fa6, 0x90a0b5], minHeight: 7, maxHeight: 14, density: 0.75 },
+  { id: "west", center: { x: -95, z: 0 }, size: 60, blocks: 4, seed: 404,
+    palette: [0xa3b0c2, 0x8d99ae, 0x7c8aa0], minHeight: 10, maxHeight: 24, density: 0.85 },
+];
+
+// Wide arterial roads from the origin out to each district center so the
+// player can drive between downtown and the satellites.
+function arterials(): RoadDef[] {
+  return [
+    { id: "art-n", x: 0, z: -55, length: 90, horizontal: false },
+    { id: "art-e", x: 55, z: 0, length: 90, horizontal: true },
+    { id: "art-s", x: 0, z: 55, length: 90, horizontal: false },
+    { id: "art-w", x: -55, z: 0, length: 90, horizontal: true },
+  ];
+}
+
+export function assembleMap(): RishonMap {
+  const buildings = [...CORE_MAP.buildings];
+  const roads = [...CORE_MAP.roads, ...arterials()];
+  const props = [...CORE_MAP.props];
+
+  for (const spec of DISTRICTS) {
+    const r = generateDistrict(spec);
+    buildings.push(...r.buildings);
+    roads.push(...r.roads);
+    props.push(...r.props);
+  }
+
+  return {
+    ground: CORE_MAP.ground,
+    buildings,
+    roads,
+    props,
+    npcSpawns: CORE_MAP.npcSpawns,
+    carSpawn: CORE_MAP.carSpawn,
+    playerSpawn: CORE_MAP.playerSpawn,
+  };
+}
+
+export const RISHON_MAP: RishonMap = assembleMap();
diff --git a/rishon3d/test/assets.test.ts b/rishon3d/test/assets.test.ts
new file mode 100644
index 0000000..1c016b0
--- /dev/null
+++ b/rishon3d/test/assets.test.ts
@@ -0,0 +1,29 @@
+import { describe, it, expect, beforeEach } from "vitest";
+import * as THREE from "three";
+import { getGeometry, getMaterial, disposeAssets, assetCounts } from "../src/world/assets";
+
+describe("asset cache", () => {
+  beforeEach(() => disposeAssets());
+
+  it("memoizes geometry by key", () => {
+    let calls = 0;
+    const a = getGeometry("box", () => { calls++; return new THREE.BoxGeometry(1, 1, 1); });
+    const b = getGeometry("box", () => { calls++; return new THREE.BoxGeometry(1, 1, 1); });
+    expect(a).toBe(b);
+    expect(calls).toBe(1);
+  });
+
+  it("distinct keys produce distinct instances", () => {
+    const a = getGeometry("g1", () => new THREE.BoxGeometry(1, 1, 1));
+    const b = getGeometry("g2", () => new THREE.BoxGeometry(2, 2, 2));
+    expect(a).not.toBe(b);
+    expect(assetCounts().geometries).toBe(2);
+  });
+
+  it("memoizes materials and disposeAssets clears the cache", () => {
+    getMaterial("red", () => new THREE.MeshStandardMaterial({ color: 0xff0000 }));
+    expect(assetCounts().materials).toBe(1);
+    disposeAssets();
+    expect(assetCounts()).toEqual({ geometries: 0, materials: 0 });
+  });
+});
diff --git a/rishon3d/test/cityGen.test.ts b/rishon3d/test/cityGen.test.ts
new file mode 100644
index 0000000..bce1335
--- /dev/null
+++ b/rishon3d/test/cityGen.test.ts
@@ -0,0 +1,56 @@
+import { describe, it, expect } from "vitest";
+import { generateDistrict, ROAD_WIDTH } from "../src/world/cityGen";
+import type { DistrictSpec } from "../src/world/districts";
+
+const spec: DistrictSpec = {
+  id: "d1", center: { x: 100, z: 0 }, size: 60, blocks: 4, seed: 9,
+  palette: [0x808080, 0x909090], minHeight: 6, maxHeight: 18, density: 1,
+};
+
+describe("generateDistrict", () => {
+  it("is deterministic for a seed", () => {
+    const a = generateDistrict(spec);
+    const b = generateDistrict(spec);
+    expect(a.buildings.length).toBe(b.buildings.length);
+    expect(a.buildings.map((x) => x.id)).toEqual(b.buildings.map((x) => x.id));
+  });
+
+  it("emits a grid of roads (blocks+1 lines each axis)", () => {
+    const r = generateDistrict(spec);
+    const horiz = r.roads.filter((x) => x.horizontal).length;
+    const vert = r.roads.filter((x) => !x.horizontal).length;
+    expect(horiz).toBe(spec.blocks + 1);
+    expect(vert).toBe(spec.blocks + 1);
+  });
+
+  it("gives every building a unique id", () => {
+    const ids = generateDistrict(spec).buildings.map((b) => b.id);
+    expect(new Set(ids).size).toBe(ids.length);
+  });
+
+  it("keeps building footprints out of the road corridors", () => {
+    const r = generateDistrict(spec);
+    const half = spec.size / 2;
+    const cell = spec.size / spec.blocks;
+    const clearance = ROAD_WIDTH / 2;
+    for (const b of r.buildings) {
+      // local coords within the district
+      const lx = b.x - spec.center.x;
+      const lz = b.z - spec.center.z;
+      // distance from the nearest grid line on each axis must exceed half-footprint + clearance
+      const nearestLineX = Math.round((lx + half) / cell) * cell - half;
+      const nearestLineZ = Math.round((lz + half) / cell) * cell - half;
+      expect(Math.abs(lx - nearestLineX)).toBeGreaterThanOrEqual(b.width / 2 + clearance - 1e-6);
+      expect(Math.abs(lz - nearestLineZ)).toBeGreaterThanOrEqual(b.depth / 2 + clearance - 1e-6);
+    }
+  });
+
+  it("keeps everything inside the district footprint", () => {
+    const r = generateDistrict(spec);
+    const half = spec.size / 2;
+    for (const b of r.buildings) {
+      expect(Math.abs(b.x - spec.center.x)).toBeLessThanOrEqual(half);
+      expect(Math.abs(b.z - spec.center.z)).toBeLessThanOrEqual(half);
+    }
+  });
+});
diff --git a/rishon3d/test/culling.test.ts b/rishon3d/test/culling.test.ts
new file mode 100644
index 0000000..dff17fe
--- /dev/null
+++ b/rishon3d/test/culling.test.ts
@@ -0,0 +1,13 @@
+import { describe, it, expect } from "vitest";
+import { inRange } from "../src/game/culling";
+
+describe("inRange", () => {
+  it("true when within radius", () => {
+    expect(inRange(3, 4, 5)).toBe(true);   // dist 5 == radius
+    expect(inRange(1, 1, 5)).toBe(true);
+  });
+  it("false when outside radius", () => {
+    expect(inRange(10, 0, 5)).toBe(false);
+    expect(inRange(4, 4, 5)).toBe(false);  // dist ~5.66
+  });
+});
diff --git a/rishon3d/test/instancedProps.test.ts b/rishon3d/test/instancedProps.test.ts
new file mode 100644
index 0000000..55e09a2
--- /dev/null
+++ b/rishon3d/test/instancedProps.test.ts
@@ -0,0 +1,31 @@
+import { describe, it, expect } from "vitest";
+import * as THREE from "three";
+import { makeInstanced, type Placement } from "../src/world/InstancedProps";
+
+describe("makeInstanced", () => {
+  it("creates one InstancedMesh sized to the placement count", () => {
+    const geo = new THREE.BoxGeometry(1, 1, 1);
+    const mat = new THREE.MeshStandardMaterial();
+    const placements: Placement[] = [{ x: 1, z: 2 }, { x: -3, z: 4 }, { x: 0, z: 0 }];
+    const mesh = makeInstanced(geo, mat, placements, 0.5);
+    expect(mesh).toBeInstanceOf(THREE.InstancedMesh);
+    expect(mesh.count).toBe(3);
+  });
+
+  it("positions instances at their placement coordinates and baseY", () => {
+    const geo = new THREE.BoxGeometry(1, 1, 1);
+    const mat = new THREE.MeshStandardMaterial();
+    const mesh = makeInstanced(geo, mat, [{ x: 5, z: -7 }], 1.5);
+    const m = new THREE.Matrix4();
+    mesh.getMatrixAt(0, m);
+    const pos = new THREE.Vector3().setFromMatrixPosition(m);
+    expect(pos.x).toBeCloseTo(5, 5);
+    expect(pos.y).toBeCloseTo(1.5, 5);
+    expect(pos.z).toBeCloseTo(-7, 5);
+  });
+
+  it("handles an empty placement list", () => {
+    const mesh = makeInstanced(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial(), [], 0);
+    expect(mesh.count).toBe(0);
+  });
+});
diff --git a/rishon3d/test/pathFollow.test.ts b/rishon3d/test/pathFollow.test.ts
new file mode 100644
index 0000000..a3cc819
--- /dev/null
+++ b/rishon3d/test/pathFollow.test.ts
@@ -0,0 +1,44 @@
+import { describe, it, expect } from "vitest";
+import { turnToward, advanceAlong, type FollowState } from "../src/game/pathFollow";
+
+describe("turnToward", () => {
+  it("snaps when within maxDelta", () => {
+    expect(turnToward(0, 0.05, 0.1)).toBeCloseTo(0.05, 6);
+  });
+  it("steps toward the target by maxDelta", () => {
+    expect(turnToward(0, 1, 0.1)).toBeCloseTo(0.1, 6);
+  });
+  it("turns the short way across the +/-PI seam", () => {
+    // from 3.0 rad to -3.0 rad: short way is +,  crossing PI
+    const next = turnToward(3.0, -3.0, 0.1);
+    expect(next).toBeGreaterThan(3.0); // moved forward past PI, not back toward 0
+  });
+});
+
+describe("advanceAlong", () => {
+  const route = [{ x: 0, z: 0 }, { x: 0, z: 10 }, { x: 10, z: 10 }];
+
+  it("moves the position toward the active waypoint", () => {
+    const s0: FollowState = { pos: { x: 0, z: 0 }, heading: 0, waypoint: 1 };
+    const s1 = advanceAlong(route, s0, 5, 0.1, 0.5, 10);
+    expect(s1.pos.z).toBeGreaterThan(0);  // moved toward (0,10)
+    expect(s1.pos.z).toBeLessThan(10);
+  });
+
+  it("advances to the next waypoint on arrival", () => {
+    const s0: FollowState = { pos: { x: 0, z: 9.8 }, heading: 0, waypoint: 1 };
+    const s1 = advanceAlong(route, s0, 5, 0.1, 0.5, 10);
+    expect(s1.waypoint).toBe(2);
+  });
+
+  it("wraps the waypoint index at the end of the route", () => {
+    const s0: FollowState = { pos: { x: 10, z: 10 }, heading: 0, waypoint: 2 };
+    const s1 = advanceAlong(route, s0, 5, 0.1, 0.5, 10);
+    expect(s1.waypoint).toBe(0);
+  });
+
+  it("returns the state unchanged for an empty route", () => {
+    const s0: FollowState = { pos: { x: 1, z: 1 }, heading: 0.5, waypoint: 0 };
+    expect(advanceAlong([], s0, 5, 0.1, 0.5, 10)).toEqual(s0);
+  });
+});
diff --git a/rishon3d/test/populate.test.ts b/rishon3d/test/populate.test.ts
new file mode 100644
index 0000000..507fc16
--- /dev/null
+++ b/rishon3d/test/populate.test.ts
@@ -0,0 +1,37 @@
+import { describe, it, expect } from "vitest";
+import { planPopulations, type PopulationBudget } from "../src/game/populate";
+import { assembleMap } from "../src/world/worldData";
+
+const map = assembleMap();
+const budget: PopulationBudget = { pedestrians: 20, cats: 6, dogs: 6 };
+
+describe("planPopulations", () => {
+  it("respects the budget caps", () => {
+    const p = planPopulations(map, 5, budget);
+    expect(p.pedestrians.length).toBeLessThanOrEqual(20);
+    expect(p.cats.length).toBeLessThanOrEqual(6);
+    expect(p.dogs.length).toBeLessThanOrEqual(6);
+  });
+
+  it("is deterministic for a seed", () => {
+    const a = planPopulations(map, 5, budget);
+    const b = planPopulations(map, 5, budget);
+    expect(a.pedestrians).toEqual(b.pedestrians);
+    expect(a.carRoutes.length).toBe(b.carRoutes.length);
+  });
+
+  it("keeps spawned agents within ground bounds", () => {
+    const half = map.ground.size / 2;
+    const all = planPopulations(map, 5, budget);
+    for (const v of [...all.pedestrians, ...all.cats, ...all.dogs]) {
+      expect(Math.abs(v.x)).toBeLessThanOrEqual(half);
+      expect(Math.abs(v.z)).toBeLessThanOrEqual(half);
+    }
+  });
+
+  it("produces at least one car route with multiple waypoints", () => {
+    const p = planPopulations(map, 5, budget);
+    expect(p.carRoutes.length).toBeGreaterThan(0);
+    expect(p.carRoutes[0].length).toBeGreaterThanOrEqual(4);
+  });
+});
diff --git a/rishon3d/test/rishonMap.test.ts b/rishon3d/test/rishonMap.test.ts
index daef02f..5bebbf3 100644
--- a/rishon3d/test/rishonMap.test.ts
+++ b/rishon3d/test/rishonMap.test.ts
@@ -1,12 +1,12 @@
 import { describe, it, expect } from "vitest";
-import { RISHON_MAP, validateMap } from "../src/world/rishonMap";
+import { CORE_MAP as RISHON_MAP, validateMap } from "../src/world/rishonMap";
 
 describe("RISHON_MAP", () => {
   it("is valid", () => {
     expect(validateMap(RISHON_MAP)).toEqual([]);
   });
   it("has unique building ids", () => {
     const ids = RISHON_MAP.buildings.map((b) => b.id);
     expect(new Set(ids).size).toBe(ids.length);
   });
   it("has exactly one house", () => {
diff --git a/rishon3d/test/rng.test.ts b/rishon3d/test/rng.test.ts
new file mode 100644
index 0000000..43538a2
--- /dev/null
+++ b/rishon3d/test/rng.test.ts
@@ -0,0 +1,22 @@
+import { describe, it, expect } from "vitest";
+import { mulberry32 } from "../src/world/rng";
+
+describe("mulberry32", () => {
+  it("is deterministic for a given seed", () => {
+    const a = mulberry32(42);
+    const b = mulberry32(42);
+    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
+  });
+  it("different seeds diverge", () => {
+    const a = mulberry32(1), b = mulberry32(2);
+    expect(a()).not.toBe(b());
+  });
+  it("stays within [0, 1)", () => {
+    const r = mulberry32(7);
+    for (let i = 0; i < 100; i++) {
+      const v = r();
+      expect(v).toBeGreaterThanOrEqual(0);
+      expect(v).toBeLessThan(1);
+    }
+  });
+});
diff --git a/rishon3d/test/timestep.test.ts b/rishon3d/test/timestep.test.ts
new file mode 100644
index 0000000..a492306
--- /dev/null
+++ b/rishon3d/test/timestep.test.ts
@@ -0,0 +1,26 @@
+import { describe, it, expect } from "vitest";
+import { accumulateSteps } from "../src/core/timestep";
+
+describe("accumulateSteps", () => {
+  const STEP = 1 / 60;
+  it("returns whole steps and carries remainder", () => {
+    const r = accumulateSteps(0, STEP * 2.5, STEP, 5);
+    expect(r.steps).toBe(2);
+    expect(r.remainder).toBeCloseTo(STEP * 0.5, 6);
+  });
+  it("accumulates carry across calls", () => {
+    const r = accumulateSteps(STEP * 0.8, STEP * 0.5, STEP, 5);
+    expect(r.steps).toBe(1);
+    expect(r.remainder).toBeCloseTo(STEP * 0.3, 6);
+  });
+  it("clamps to maxSteps to avoid spiral of death", () => {
+    const r = accumulateSteps(0, STEP * 100, STEP, 5);
+    expect(r.steps).toBe(5);
+    expect(r.remainder).toBeLessThan(STEP);
+  });
+  it("takes no step when under the threshold", () => {
+    const r = accumulateSteps(0, STEP * 0.4, STEP, 5);
+    expect(r.steps).toBe(0);
+    expect(r.remainder).toBeCloseTo(STEP * 0.4, 6);
+  });
+});
diff --git a/rishon3d/test/worldData.test.ts b/rishon3d/test/worldData.test.ts
new file mode 100644
index 0000000..b8f7181
--- /dev/null
+++ b/rishon3d/test/worldData.test.ts
@@ -0,0 +1,37 @@
+import { describe, it, expect } from "vitest";
+import { assembleMap, DISTRICTS } from "../src/world/worldData";
+import { validateMap } from "../src/world/rishonMap";
+
+describe("assembleMap", () => {
+  const map = assembleMap();
+
+  it("validates cleanly (one house, spawns in bounds, no spawn in a building)", () => {
+    expect(validateMap(map)).toEqual([]);
+  });
+
+  it("has exactly one house (only the core district)", () => {
+    expect(map.buildings.filter((b) => b.isHouse).length).toBe(1);
+  });
+
+  it("adds district buildings on top of the core", () => {
+    // core has 8 buildings; districts add many more
+    expect(map.buildings.length).toBeGreaterThan(20);
+  });
+
+  it("gives every building a unique id across districts", () => {
+    const ids = map.buildings.map((b) => b.id);
+    expect(new Set(ids).size).toBe(ids.length);
+  });
+
+  it("keeps all buildings within the (larger) ground bounds", () => {
+    const half = map.ground.size / 2;
+    for (const b of map.buildings) {
+      expect(Math.abs(b.x) + b.width / 2).toBeLessThanOrEqual(half);
+      expect(Math.abs(b.z) + b.depth / 2).toBeLessThanOrEqual(half);
+    }
+  });
+
+  it("declares at least three districts", () => {
+    expect(DISTRICTS.length).toBeGreaterThanOrEqual(3);
+  });
+});
```
