# Ben Gurion Airport — second map + map-switching — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a fully detailed Ben Gurion airport as a second map, reachable by pressing E at a detailed terminal-entrance building in the city, with a fade-to-black map transition and a matching exit back.

**Architecture:** Make the build-once `World` reloadable (load/unload group + Rapier bodies); add a DOM fade overlay and a transition state machine in `Game` triggered by per-map "portals"; author ~19 new deterministic catalog objects under `catalog/airport/`; assemble `airportMap.ts`; place the entrance in the city.

**Tech Stack:** TypeScript, Three.js, Rapier (`@dimforge/rapier3d`), Vite. The world is data: `defineObject` builders return faceted `ObjectResult`s; `buildWorld(manifest)` aggregates them.

## Global Constraints (verbatim, apply to EVERY task)

- **No dev server, no `npm run dev`/`vite`, no browser, no screenshots.** The user runs and looks.
- **No tests** written or run. The ONLY check is `npx tsc --noEmit` (one-shot typecheck). The final gate additionally runs `npx vite build`. Nothing else.
- **Work on master only** — no worktree/branch.
- Builders are **deterministic**: no `Math.random` / `Date.now` / argless `new Date()`. Seed via `import { mulberry32 } from "../../rng.ts"` for variation.
- **Rotation in {0, 90, 180, 270} degrees only.** Colliders/obstacles stay axis-aligned.
- **Derive child placement from real dimensions** — never hand-typed offsets (CLAUDE.md pitfall #3).
- Local-space convention for every object: centered x=z=0, base y=0, **front faces +z**, ~1u = 1m.
- Commit after each task (on master). End commit messages with the Co-Authored-By line the harness mandates.

---

## Shared authoring reference (read before any catalog task)

`defineObject` / facet pipeline:

```ts
// src/world/system/registry.ts
export function defineObject<P extends object>(kind: string, def: { params: P; build(p: P): ObjectResult }): void
export function buildObject(kind: string, params?: Record<string, unknown>): ObjectResult

// src/world/system/types.ts
interface ObjectResult { mesh: THREE.Object3D; colliders?: Box[]; obstacles?: Rect[]; anchors?: Record<string, Vec2 | Seat>; pois?: PoiSpec[] }
interface Box { x: number; y: number; z: number; hx: number; hy: number; hz: number }  // center + half-extents (Rapier cuboid)
interface Rect { x: number; z: number; w: number; d: number }                          // NPC-avoid footprint
interface Vec2 { x: number; z: number }
interface Seat { x: number; z: number; faceYaw: number }
interface PoiSpec { kind: string; label: string; radius: number; anchor: string }
interface Placement { kind: string; x?: number; z?: number; rot?: number; params?: Record<string, unknown> }
```

Geometry helpers (`src/world/objects/voxel.ts`) — every part bakes a hex color into its vertices; merge to ONE geometry per mesh:

```ts
tintedBox(w,h,d, x,y,z, hex): BufferGeometry
cylinderY(r,h, x,y,z, hex, seg=12): BufferGeometry
cone(rBottom,rTop,h, x,y,z, hex, seg=8): BufferGeometry        // rTop=0 → point
disc(r,h, x,y,z, hex, seg=16): BufferGeometry
lowPolyBall(r, x,y,z, hex, detail=0): BufferGeometry
mergeTinted(parts: BufferGeometry[]): BufferGeometry           // disposes parts
tintedMesh(geo: BufferGeometry): THREE.Mesh                    // wraps in shared vertexColors material, casts+receives shadow
ringAngles(count, phase=0): number[]
export const DECAL_GAP = 0.04                                  // proud-of-surface offset to avoid z-fighting
```

Other reusable builders:

```ts
// src/world/objects/glass.ts
makeGlassPanel({ w, h, divisions?, opacity?, door? }): THREE.Object3D     // transparent pane(s), front +z
makeGlassPaneMaterial({ w, h, opacity }): THREE.Material
// src/world/objects/textSign.ts  — canvas-rendered glowing text board, back face z=0 grows +z, base y=0
makeTextSignMesh({ text, w, h?, boardColor?, textColor?, glow? }): THREE.Group
```

Colors live in `src/world/palette.ts` (`PALETTE.*`: e.g. `sidewalk, curb, steel, steelLight, steelDark, glass, signCool, awningBlue, awningRed, yellowLine, lampPole, lantern, facadeDoor, houseBody, stoneBase, trimBrown`). Reuse these; add new named colors to `palette.ts` only if needed.

**Composite pattern** (see `src/world/catalog/stores.ts` for the canonical example): build sub-parts as `{ mesh, colliders?, obstacles?, anchors? }`, push into a parts list, `compose(parts)` merges into one group result. `solidBox(x,y,z, w,h,d)` returns a `Box` from center+full-sizes (`hx=w/2`...). Helper to copy into the file that needs it:

```ts
function solidBox(x:number,y:number,z:number,bw:number,bh:number,bd:number){ return { x,y,z, hx:bw/2, hy:bh/2, hz:bd/2 }; }
```

Each new catalog file ends by being imported (side-effect) from `src/world/catalog/index.ts`.

---

## Task 1: Map-switching runtime (engine, overlay, transition, boot)

This is the load-bearing change. Do it first and verify the build before any content. It must compile and leave the existing city playable (entering nothing yet).

**Files:**
- Modify: `src/world/system/types.ts` — add `MapDescriptor`, `Portal`.
- Create: `src/world/maps.ts` — `MAPS` registry (city now; airport added in Task 6).
- Modify: `src/world/World.ts` — make reloadable (`load`/`unload`, body tracking, getters).
- Create: `src/ui/FadeOverlay.ts` — full-screen black div with `setOpacity`.
- Modify: `src/game/Game.ts` — transition state machine + portal prompts; accept `FadeOverlay`.
- Modify: `src/main.ts` — construct `FadeOverlay`, pass to `Game`.

**Interfaces produced** (later tasks rely on these exact names):
- `interface Portal { x:number; z:number; r:number; prompt:string; to:string; toSpawn:Vec2 }`
- `interface MapDescriptor { id:string; map:Placement[]; spawn:Vec2; groundSize:number; portals:Portal[]; hasCar?:boolean; carSpawn?:Vec2; carSpawnYaw?:number }`
- `MAPS: Record<string, MapDescriptor>` in `src/world/maps.ts`.
- `World.load(desc:MapDescriptor): void`, `World.unload(): void`, getters `spawn`, `portals`, `currentId`, `groundSize`, `groundCenter`.

- [ ] **Step 1: Add types.** In `src/world/system/types.ts` append:

```ts
export interface Portal { x: number; z: number; r: number; prompt: string; to: string; toSpawn: Vec2 }
export interface MapDescriptor {
  id: string;
  map: Placement[];
  spawn: Vec2;
  groundSize: number;
  portals: Portal[];
  hasCar?: boolean;
  carSpawn?: Vec2;
  carSpawnYaw?: number;
}
```

- [ ] **Step 2: Maps registry.** Create `src/world/maps.ts`:

```ts
import type { MapDescriptor } from "./system/types";
import { MAP, PLAYER_SPAWN, CAR_SPAWN, CAR_SPAWN_YAW, GROUND_SIZE } from "./map";

// Entry portal to the airport: stand at the Terminal-3 door in the SE hero cell.
// (Coords confirmed in Task 7 when the entrance building is placed.)
const CITY: MapDescriptor = {
  id: "city",
  map: MAP,
  spawn: PLAYER_SPAWN,
  groundSize: GROUND_SIZE,
  hasCar: true,
  carSpawn: CAR_SPAWN,
  carSpawnYaw: CAR_SPAWN_YAW,
  portals: [
    { x: 16, z: 24, r: 4.5, prompt: "Press E to enter the airport", to: "airport", toSpawn: { x: 0, z: -104 } },
  ],
};

export const MAPS: Record<string, MapDescriptor> = { city: CITY };
```

- [ ] **Step 3: Reloadable World.** Replace `src/world/World.ts` with:

```ts
import * as THREE from "three";
import { Physics, RAPIER } from "../core/Physics";
import { makeClouds } from "./clouds";
import { registerCatalog } from "./catalog";
import { buildWorld, type ResolvedPoi } from "./system/engine";
import { MAPS } from "./maps";
import type { MapDescriptor, Portal, Vec2 } from "./system/types";

// The world is now reloadable: load() builds a manifest and tracks everything it
// creates so unload() can tear it down for a map switch. Sky/clouds are global
// (created once) and survive across maps.
export class World {
  pois: ResolvedPoi[] = [];
  portals: Portal[] = [];
  spawn: Vec2 = { x: 0, z: 0 };
  groundSize = 140;
  readonly groundCenter = { x: 0, z: 0 };
  currentId = "";

  private group: THREE.Group | null = null;
  private bodies: RAPIER.RigidBody[] = [];
  private _carSpawn: Vec2 = { x: 0, z: 0 };
  private _carSpawnYaw = 0;

  constructor(private scene: THREE.Scene, private physics: Physics) {
    registerCatalog();
    scene.add(makeClouds()); // global sky, not per-map
    this.load(MAPS.city);
  }

  load(desc: MapDescriptor): void {
    const built = buildWorld(desc.map);
    built.group.updateMatrixWorld(true);
    built.group.traverse((obj) => { obj.matrixAutoUpdate = false; obj.matrixWorldAutoUpdate = false; });
    this.scene.add(built.group);
    this.group = built.group;

    for (const c of built.colliders) {
      const body = this.physics.world.createRigidBody(
        RAPIER.RigidBodyDesc.fixed().setTranslation(c.x, c.y, c.z),
      );
      this.physics.world.createCollider(RAPIER.ColliderDesc.cuboid(c.hx, c.hy, c.hz), body);
      this.bodies.push(body);
    }

    this.pois = built.pois;
    this.portals = desc.portals;
    this.spawn = desc.spawn;
    this.groundSize = desc.groundSize;
    this.currentId = desc.id;
    this._carSpawn = desc.carSpawn ?? this.spawn;
    this._carSpawnYaw = desc.carSpawnYaw ?? 0;
  }

  unload(): void {
    if (this.group) {
      this.scene.remove(this.group);
      this.group.traverse((obj) => {
        const m = obj as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
        const mat = m.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
        else if (mat) mat.dispose();
      });
      this.group = null;
    }
    for (const b of this.bodies) this.physics.world.removeRigidBody(b);
    this.bodies = [];
  }

  get playerSpawn() { return this.spawn; }
  get carSpawn() { return this._carSpawn; }
  get carSpawnYaw() { return this._carSpawnYaw; }
}
```

- [ ] **Step 4: Fade overlay.** Create `src/ui/FadeOverlay.ts`:

```ts
let injected = false;
function injectStyle() {
  if (injected) return; injected = true;
  const s = document.createElement("style");
  s.textContent = `.r3d-fade{position:fixed;inset:0;background:#000;opacity:0;pointer-events:none;z-index:60;transition:none;}`;
  document.head.appendChild(s);
}

/** A full-screen black layer. Game ramps opacity 0..1 from frame dt. */
export class FadeOverlay {
  private el: HTMLDivElement;
  constructor(container: HTMLElement) {
    injectStyle();
    this.el = document.createElement("div");
    this.el.className = "r3d-fade";
    container.appendChild(this.el);
  }
  setOpacity(a: number): void { this.el.style.opacity = String(Math.max(0, Math.min(1, a))); }
}
```

- [ ] **Step 5: Game transition + portals.** In `src/game/Game.ts`:
  - Add import: `import type { FadeOverlay } from "../ui/FadeOverlay";` and `import { MAPS } from "../world/maps";` and `import type { Portal } from "../world/system/types";`.
  - Add `private fade: FadeOverlay` as a constructor parameter (append it to the end of the parameter list).
  - Add fields:

```ts
private transition: "idle" | "out" | "in" = "idle";
private tT = 0;
private pendingPortal: Portal | null = null;
private static readonly FADE = 0.45; // seconds each half
```

  - At the very top of `update(dt)`, before the phone branch, handle the transition:

```ts
if (this.transition !== "idle") {
  this.tT += dt;
  const k = Math.min(1, this.tT / Game.FADE);
  if (this.transition === "out") {
    this.fade.setOpacity(k);
    if (k >= 1 && this.pendingPortal) { this.doSwap(this.pendingPortal); this.transition = "in"; this.tT = 0; }
  } else { // "in"
    this.fade.setOpacity(1 - k);
    if (k >= 1) { this.fade.setOpacity(0); this.transition = "idle"; this.pendingPortal = null; }
  }
  this.input.endFrame();
  return;
}
```

  - Add portal detection in the on-foot section (after `ePressed`/`pPos` are computed, before the car logic). Use `this.world` — store the `World` instance: change the constructor to keep `private world: World` (it currently takes `world` un-stored; capture it).

```ts
// --- Map portals (enter/leave a sub-world) ---
let nearPortal: Portal | null = null;
if (this.mode === "onFoot") {
  for (const p of this.world.portals) {
    if (Math.hypot(pPos.x - p.x, pPos.z - p.z) <= p.r) { nearPortal = p; break; }
  }
  if (nearPortal && ePressed) {
    this.transition = "out"; this.tT = 0; this.pendingPortal = nearPortal;
    this.input.endFrame();
    return;
  }
}
```

  - In the HUD prompt chain, add `nearPortal` as the highest-priority on-foot prompt: `if (this.mode === "onFoot" && nearPortal) this.hud.setPrompt(nearPortal.prompt); else if (...existing...)`.
  - Add the swap method:

```ts
private doSwap(portal: Portal): void {
  const target = MAPS[portal.to];
  this.world.unload();
  this.world.load(target);
  // Player to the destination spawn.
  this.character.enabled = true;
  this.character.object.visible = true;
  this.character.setPosition(portal.toSpawn.x, portal.toSpawn.z);
  // Car: only the city has a drivable car. Park + hide it elsewhere; restore on return.
  if (target.hasCar) {
    this.car.teleportTo(target.carSpawn!.x, target.carSpawn!.z, target.carSpawnYaw ?? 0);
    this.car.object.visible = true;
  } else {
    this.car.enabled = false;
    this.car.object.visible = false;
    this.car.teleportTo(99999, 99999, 0);
  }
  this.mode = "onFoot";
  // Re-aim + snap the follow camera while the screen is black.
  this.follow.setTarget(this.character.object, 8, 1.6, this.character.rigidBody);
}
```

  - Confirm `Character.setPosition`, `Car.teleportTo`, `FollowCamera.setTarget` signatures exist (they do — used already in this file / Game ctor). If `setPosition` does not also move the Rapier body, use the same mechanism the ctor uses for spawn.

- [ ] **Step 6: Wire boot.** In `src/main.ts`:
  - `import { FadeOverlay } from "./ui/FadeOverlay";`
  - After `const hud = new Hud(container);` add `const fade = new FadeOverlay(container);`
  - Append `fade` as the final argument to `new Game(...)`.

- [ ] **Step 7: Typecheck.** Run: `npx tsc --noEmit` — Expected: no errors. Fix any signature mismatches (e.g. confirm `Car.teleportTo` arity, `Character.setPosition`).

- [ ] **Step 8: Commit.**

```bash
git add src/world/system/types.ts src/world/maps.ts src/world/World.ts src/ui/FadeOverlay.ts src/game/Game.ts src/main.ts
git commit -m "feat(world): reloadable world + fade map-switching + portals"
```

---

## Tasks 2–5: Airport catalog objects

All objects live under `src/world/catalog/airport/` (new folder), each its own
file, each ending with no export needed (side-effect `defineObject`). After
creating a file, add `import "./airport/<file>";` to `src/world/catalog/index.ts`.

**Worked example** (the bar for detail + faceting — a `controlTower`):

```ts
// src/world/catalog/airport/controlTower.ts
import * as THREE from "three";
import { defineObject } from "../../system/registry";
import { tintedBox, cylinderY, mergeTinted, tintedMesh } from "../../objects/voxel";
import { makeGlassPanel } from "../../objects/glass";
import { PALETTE } from "../../palette";

function solidBox(x:number,y:number,z:number,bw:number,bh:number,bd:number){ return { x,y,z, hx:bw/2, hy:bh/2, hz:bd/2 }; }

defineObject("controlTower", {
  params: { h: 34 } as { h: number },
  build(p) {
    const { h } = p;
    const shaftR = 2.2, cabH = 4.5, cabR = 4.0;
    const cabBase = h - cabH;
    const g = new THREE.Group();
    g.add(tintedMesh(mergeTinted([
      cylinderY(shaftR, cabBase, 0, cabBase / 2, 0, PALETTE.steelLight, 16),     // shaft
      cylinderY(shaftR + 0.4, 0.6, 0, 0.3, 0, PALETTE.curb, 16),                 // base flare
      cylinderY(cabR + 0.5, 0.5, 0, cabBase + 0.25, 0, PALETTE.steelDark, 16),   // cab floor ring
      cylinderY(cabR, cabH, 0, cabBase + cabH / 2, 0, PALETTE.steel, 16),        // cab body (behind glass)
      cylinderY(0.18, 5, 0, h + 2.5, 0, PALETTE.steelDark, 8),                   // antenna mast
    ])));
    // Glass band around the cab (canted look approximated by a tall ring of panes).
    const cab = new THREE.Mesh(
      new THREE.CylinderGeometry(cabR + 0.05, cabR + 0.05, cabH * 0.7, 16, 1, true),
      makeGlassPanel({ w: 1, h: 1 }).children?.[0] ? (makeGlassPanel({ w: 1, h: 1 }) as any).material : undefined,
    );
    // Simpler + safe: use a translucent material directly.
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x9fd8ff, transparent: true, opacity: 0.35, roughness: 0.2 });
    const glass = new THREE.Mesh(new THREE.CylinderGeometry(cabR + 0.06, cabR + 0.06, cabH * 0.66, 16, 1, true), glassMat);
    glass.position.set(0, cabBase + cabH * 0.55, 0);
    g.add(glass);
    return {
      mesh: g,
      colliders: [solidBox(0, cabBase / 2, 0, shaftR * 2, cabBase, shaftR * 2)],
      obstacles: [{ x: 0, z: 0, w: shaftR * 2 + 1, d: shaftR * 2 + 1 }],
    };
  },
});
```

(Use `makeGlassPanel` for flat glazing where possible; the inline translucent
material above is the pattern when a curved/cylindrical pane is wanted.)

Each object task below = create the file, follow the worked example's structure,
keep it deterministic, expose colliders for solid mass and obstacles for
footprints, then `import` it in `catalog/index.ts` and run `npx tsc --noEmit`.
Group the work as four parallelizable batches; commit per batch.

### Task 2 (batch A — terminal & interior fittings)

**Files:** create `terminalHall.ts`, `checkInIsland.ts`, `flightBoard.ts`, `securityLane.ts`, `airportSeating.ts` under `src/world/catalog/airport/`.

- **`terminalHall`** — params `{ w=120, d=50, h=14, rearGap=16 }`. A large hall:
  floor slab; back (north, −z... NOTE front=+z so the *entrance* you walk in is
  +z; the concourse opening is the −z/back wall) — build it as a shell open on
  the **+z front** (entrance) with a centered **doorway gap of `rearGap`** in the
  **−z back wall** (split the back wall into two segments left/right of the gap).
  Tall glass curtain walls on the two long sides (use `makeGlassPanel` bays
  between structural columns spaced ~8m), a row of square columns down the
  interior, a roof slab with 2–3 skylight strips (lighter tinted boxes), and a
  ring of `tintedBox` ceiling beams. Colliders: floor, two side walls, the two
  back-wall segments, and short front returns (mirror `buildingShell`). Expose a
  `concourseGap` anchor at the back doorway center. This is the hero — make it
  read grand and clean.
- **`checkInIsland`** — params `{ len=10, desks=4 }`. A long counter (`len`) with
  `desks` monitor+scale stations on top, a low stub bag-belt along the front, a
  backlit `makeTextSignMesh` zone sign ("Check-in A / Departures") above, and a
  row of belt-barrier stanchions (short posts + thin ribbon boxes) ~1.5m in front
  forming a switchback queue. Solid collider for the counter; obstacle for the
  whole footprint. Front faces +z (passenger side).
- **`flightBoard`** — params `{ w=6, h=3, rows=8 }`. Canvas-rendered FIDS table
  (reuse the `textSign` canvas approach but draw a grid: columns TIME |
  DESTINATION | GATE | STATUS; rows of plausible flights — e.g. "08:40 LONDON
  LHR B7 Boarding", "09:15 NEW YORK JFK C2 On time", "09:30 PARIS CDG A4
  Delayed", "10:05 BERLIN BER B3 Gate Closed", "10:20 BANGKOK BKK C9 On time",
  ...). Dark board, amber/green/red status text, glowing emissive face. On a thin
  wall-mount frame; no collider (mounted high). Front +z.
- **`securityLane`** — params `{ lanes=3 }`. Per lane: an X-ray machine (box +
  tunnel mouth + small screen), a roller conveyor (slats), a walk-through metal
  detector arch (two posts + lintel), a tray cart. A low divider rail between
  lanes. Colliders for the machines + arch posts; a walk-through gap at the arch.
- **`airportSeating`** — params `{ seats=6, back=true }`. The classic linked beam
  seat row: a steel beam on legs, `seats` seat pads + low backrests, armrests
  between. Front +z. Expose seat anchors `seat_0..` with `faceYaw=0`. No solid
  collider (seating); obstacle footprint only.

After the five files + index imports: `npx tsc --noEmit`, then commit `feat(airport): terminal hall + check-in + FIDS + security + seating`.

### Task 3 (batch B — gates, baggage, bridges, retail)

**Files:** `gateLounge.ts`, `baggageCarousel.ts`, `jetBridge.ts`, `dutyFreeShop.ts`, `dutyFreeRotunda.ts`, `escalator.ts`.

- **`gateLounge`** — params `{ w=18, d=14, gate="B7", route="TLV → JFK" }`. A gate
  desk/podium (counter + monitor + a `makeTextSignMesh` "Gate B7" + a second sign
  with the route), a boarding-pass scanner stand, and 3–4 rows of `airportSeating`
  (compose by `buildObject("airportSeating", …)` + `applyTransform`) facing +z
  (toward the window/apron). Expose `boardingDoor` anchor at the +z edge center.
  Colliders for the desk; obstacles for seating rows.
- **`baggageCarousel`** — params `{ rx=6, rz=3 }`. An oval reclaim unit: a sloped
  stainless belt ring (approximate with an elliptical ring of angled `tintedBox`
  slats using `ringAngles`), a central raised hub, a few suitcase boxes
  (varied colors) riding the belt, and an overhead `makeTextSignMesh` ("Belt 3 —
  flight LY008"). Solid collider on the hub; obstacle for the oval footprint.
- **`jetBridge`** — params `{ len=14 }`. Telescoping boarding bridge: a rotunda
  drum at the terminal end (+z... build it running along +x so it can bridge gate
  to plane; document the axis in a comment), 2–3 nested rectangular tunnel boxes
  of decreasing width with window strips, support legs, and a cab at the far end.
  Colliders for the tunnel (walk-through is fine — it's above-ground; just give it
  an obstacle footprint).
- **`dutyFreeShop`** — params `{ w=10, d=8, name="Duty Free", accent }`. Reuse the
  storefront look: a glass front (`makeGlassPanel`), a lit `makeTextSignMesh` sign
  band, interior shelving (rows of small product boxes in varied colors), a
  counter. Compose around a `buildObject("buildingShell", {w,d,h:5})`. Front +z.
- **`dutyFreeRotunda`** — params `{ r=14 }`. The iconic round duty-free: a ring of
  shop bays (reuse `dutyFreeShop` or simple counters arranged with `ringAngles`),
  a central fountain (`buildObject("fountain", …)` or `grandFountain`), a circular
  floor medallion, and a ring of columns. Obstacles around the ring; open center.
- **`escalator`** — params `{ rise=4, run=7 }`. A decorative escalator bank: an
  inclined ramp of step boxes, two side balustrades with a darker moving-handrail
  cap, newel posts. Static — solid collider along the incline (treat as a ramp
  block) so the player walks around it. Front +z (ascending toward −z/up).

`npx tsc --noEmit`, then commit `feat(airport): gates + baggage + jet bridge + duty-free + escalator`.

### Task 4 (batch C — airside: aircraft, vehicles, pavement, tower)

**Files:** `airliner.ts`, `controlTower.ts` (use the worked example), `apronVehicle.ts`, `apron.ts`, `runway.ts`.

- **`airliner`** — params `{ livery=0xffffff, belly=0x1f4fa0, tail=0x1f4fa0, reg="4X-EKA" }`.
  Detailed narrow-body parked jet, built along **+x = nose direction** (document
  axis): a long fuselage tube (`cylinderY` rotated, or a stack of `tintedBox` /
  use a cylinder with rotation set on the mesh; keep the merged geometry but you
  may rotate a sub-group), a nose cone + cockpit windscreen (dark boxes), two
  swept wings (flat tapered boxes angled back) at mid-belly, two underwing engine
  nacelles (cylinders), a vertical tail fin + two horizontal stabilizers, a
  passenger-window strip (a long row of small dark boxes via a loop), a blue belly
  cheatline, blue tail with a light Star-of-David hint (two overlapped thin
  triangleish boxes or a small emissive decal), and tricycle landing gear (nose
  gear + two main gears: short cylinders + wheel discs). One big AABB collider for
  the fuselage + an obstacle covering the wingspan so NPCs/the player don't walk
  through it. This is the airside hero — make it big (length ~38m, wingspan ~34m)
  and detailed.
- **`controlTower`** — as the worked example (you may enrich it: gallery railing,
  beacon light, equipment boxes at the base).
- **`apronVehicle`** — params `{ variant: "tug"|"fuel"|"stairs"|"pushback"|"catering" }`.
  One builder, switch on `variant`: `tug` = small tractor + 2–3 baggage carts
  (boxes on wheels) coupled in a train; `fuel` = bowser tank truck; `stairs` =
  mobile passenger staircase (a flight of steps on a wheeled frame); `pushback` =
  low flat tug; `catering` = box truck with a scissor-lift body. Wheels are dark
  `cylinderY` discs. Solid collider sized to the body; obstacle footprint.
- **`apron`** — params `{ w=60, d=50, stand="B7" }`. A large concrete pad
  (`PALETTE.sidewalk`/grey), painted aircraft-stand markings: a long lead-in line,
  a turn bar, a stop bar, and a `makeTextSignMesh`-free painted stand number
  (use thin colored boxes for the lines; for the number, a small `flightBoard`-
  style canvas decal is acceptable but optional). No collider (flat); decorative.
- **`runway`** — params `{ length=180, taxiway=false }`. A long tarmac strip
  (asphalt) with a dashed white centerline (loop of boxes), threshold "piano key"
  bars at each end, and white edge lines; `taxiway:true` switches to a yellow
  centerline + edge lights (small emissive boxes). Built running along **+x**
  (long axis); place rotated in the map. No collider (flat).

`npx tsc --noEmit`, then commit `feat(airport): airliner + tower + GSE vehicles + apron + runway`.

### Task 5 (batch D — landside Israeli identity)

**Files:** `airportMonument.ts`, `palmTree.ts`, `curbCanopy.ts`.

- **`airportMonument`** — params `{}`. A stone plinth with two `makeTextSignMesh`
  boards ("Ben Gurion Airport" and a second board for Hebrew text
  "נמל התעופה בן-גוריון"), flanked by two tall **flag poles** each flying an
  approximated Israeli flag: a white field `tintedBox` with two horizontal blue
  stripes and a small blue hexagram hint (two overlapped thin blue boxes forming a
  star, or a single emissive decal). Pole = tall thin cylinder + finial. Solid
  collider on the plinth + poles; obstacle footprint.
- **`palmTree`** — params `{ h=7 }`. A date palm: a ringed tapering trunk
  (stacked slightly-offset short `cylinderY` segments in browns), a crown of
  6–9 fronds (long thin tapered boxes angled down via `ringAngles`), and a few
  date clusters (small `lowPolyBall`s). Slim solid collider on the trunk; small
  obstacle.
- **`curbCanopy`** — params `{ w=60, d=10 }`. The departures/arrivals drop-off
  canopy: a row of columns supporting a flat roof slab with a fascia carrying a
  `makeTextSignMesh` ("Departures" / "Arrivals"), a curb edge, and lane markings
  underneath. Colliders on the columns; obstacle for the columns only (roof is
  overhead, walk-through).

`npx tsc --noEmit`, then commit `feat(airport): landside monument + palms + curb canopy`.

---

## Task 6: Airport map assembly

**Files:** Create `src/world/airportMap.ts`; Modify `src/world/maps.ts` (register airport); Modify `src/world/catalog/index.ts` (ensure all airport imports present).

**Interfaces consumed:** all catalog kinds from Tasks 2–5; `MapDescriptor`, `Portal` from Task 1.

- [ ] **Step 1:** Author `src/world/airportMap.ts` exporting
  `AIRPORT: MapDescriptor`. Ground ~260×260. Lay out the bands from the spec
  (+z = airside north, −z = landside south), deriving positions so footprints do
  not overlap (the engine warns on overlap — keep the console clean):
  - `{ kind:"ground", params:{ size:260 } }`, big `pavement` slabs for terminal +
    apron + landside, plus grass/`tree`/`palmTree` borders.
  - Landside (z ≈ −120…−80): `airportMonument` at the entrance, `palmTree` rows,
    `curbCanopy` over the curb, parked `apronVehicle`/box taxis, `lamp`s, `bench`s.
  - Terminal (centered ~z=−52): `terminalHall` (w≈120,d≈50,h≈14); inside it rows
    of `checkInIsland`, a wall of `flightBoard`s, the `dutyFreeRotunda` centered,
    `dutyFreeShop`s + cafes along the sides, `airportSeating` clusters, an
    `escalator`, and `securityLane`s at the back doorway.
  - Concourse (z ≈ −25…+20): seating, `dutyFreeShop`s, `baggageCarousel`s,
    `flightBoard`s.
  - Gates (z ≈ +20…+55): a row of `gateLounge`s with `jetBridge`s reaching +z.
  - Airside (z ≈ +55…+130): parked `airliner`s on `apron` stands, `apronVehicle`s,
    the `controlTower` to one side, `runway` + `taxiway` across the far north.
  - `spawn` at the landside curb (≈ `{x:0,z:-104}`, matching the city portal's
    `toSpawn`), `hasCar:false`, and one `portal` back to the city near the
    monument: `{ x:0, z:-110, r:5, prompt:"Press E to return to the city",
    to:"city", toSpawn:{ x:16, z:24 } }` (matching the city entrance door).
- [ ] **Step 2:** In `src/world/maps.ts`, `import { AIRPORT } from "./airportMap";`
  and add `airport: AIRPORT` to `MAPS`.
- [ ] **Step 3:** `npx tsc --noEmit` — Expected: clean. Then start a mental
  footprint check; the build (Task 8) surfaces overlap warnings only at runtime,
  which the user will see — keep margins generous.
- [ ] **Step 4:** Commit `feat(airport): assemble the Ben Gurion airport map`.

---

## Task 7: City terminal entrance

**Files:** Modify `src/world/map.ts`; verify `src/world/maps.ts` city portal coords match.

- [ ] **Step 1:** In `src/world/map.ts`, add the SE inner hero cell `(16,16)`:
  remove nothing (that cell is currently filled only by `blockWalls` since it's
  not in `HERO_CELLS`) — add it to `HERO_CELLS` so the block wall is skipped, then
  place the entrance. Add a placement for the entrance building (use
  `terminalHall` with an entrance-scale size, e.g. `{ w:24, d:18, h:9 }`, front to
  the main road), plus dressing: `airportMonument` sign out front, `lamp`s,
  `palmTree`s, `planter`s — all within the cell, footprints clear of the
  surrounding block walls. Front faces the road (toward −z, i.e. `rot:180`, so the
  open entrance faces the junction — confirm against the cell geometry).
- [ ] **Step 2:** Ensure the city portal in `maps.ts` (`{ x, z }`) sits just in
  front of that entrance door (within `r`), and its `toSpawn` matches the airport
  landside spawn. Adjust the literal coords so the player standing at the door is
  within `r`.
- [ ] **Step 3:** `npx tsc --noEmit` — Expected: clean.
- [ ] **Step 4:** Commit `feat(world): place Terminal-3 airport entrance in the city`.

---

## Task 8: Final verification gate

**Files:** none (verification only).

- [ ] **Step 1:** `npx tsc --noEmit` — Expected: no output (clean).
- [ ] **Step 2:** `npx vite build` — Expected: "✓ built in …", no errors.
- [ ] **Step 3:** Report results (tsc clean + build success). Do NOT run the dev
  server or screenshot. Hand the branch (master) back to the user to look in-game.

---

## Self-review (spec coverage)

- Map-switching runtime → Task 1 (reloadable World, fade, portals, boot). ✓
- Fade-to-black transition → Task 1 (FadeOverlay + Game state machine). ✓
- On-foot-only airport, car parked/restored → Task 1 `doSwap`. ✓
- All 19 catalog objects → Tasks 2–5 (terminalHall, checkInIsland, flightBoard,
  securityLane, airportSeating, gateLounge, baggageCarousel, jetBridge,
  dutyFreeShop, dutyFreeRotunda, escalator, airliner, controlTower, apronVehicle,
  apron, runway, airportMonument, palmTree, curbCanopy). ✓
- Airport map layout (landside/terminal/concourse/gates/airside) → Task 6. ✓
- City entrance + entry portal → Task 7. ✓
- Determinism / 90° rotation / derive-from-dimensions → Global Constraints +
  per-object specs. ✓
- Verification gate (tsc + vite build, no tests/dev-server) → Task 8. ✓

No NPC crowds (deferred, per spec). Single playable level (per spec). Branding =
EL AL / Israeli motifs (per object specs).
```
