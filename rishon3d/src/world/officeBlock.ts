// rishon3d/src/world/officeBlock.ts
//
// The HI-TECH OFFICE BLOCK (Task 12): a tall blue-glass tower fronting the east
// cross street, set back EAST of it. The ground floor is a WALK-IN LOBBY (an open
// glass atrium, open on the WEST front — the same "enterable = open shell"
// pattern as the restaurant, per spec decision D5: no portal / scene-swap). The
// floors above are a SOLID tower mass clad in tiled office curtain-wall glass.
//
// Built FROM THE KITS / OBJECTS (rule 1 — no bare cubes for recognizable items):
//   - tower curtain wall: tiled `makeGlassPanel(GLASS_PRESETS.office)` over a solid
//     structural core (the core IS architecture, so a bare tinted box is fine).
//   - lobby reception desk: `makeCounterKit`; a digital sign / `makeKioskMesh`;
//     a waiting bench cluster.
//   - plaza out front: `makeOfficePlaza` (paving + planters + bike rack + kiosk)
//     plus an extra `makeBikeRackKit`.
//
// All coordinates DERIVE from the OFFICE_* anchors in districtPois (rule 2). The
// lobby's structural shell is named "officeBuilding" so the >=N building-mesh
// invariant holds. Deterministic (fixed layout, no RNG — rule 5); merges to a
// handful of vertex-colored meshes plus the kit Groups + the shared glass panes.
//
// The collider (lobby = open-front shell, tower = solid box above) lives in
// restaurantColliders.officeColliders(); the plaza prop footprints come from
// officePropObstacles() below (aggregated by obstacles.ts).

import * as THREE from "three";
import { tintedBox, mergeTinted, tintedMesh } from "./objects/voxel";
import { makeGlassPanel, GLASS_PRESETS } from "./objects/glass";
import { makeCounterKit, makeOfficePlaza, makeBikeRackKit } from "./kits";
import { makeKioskMesh } from "./objects/kiosk";
import { makeBenchMesh } from "./props";
import { OFFICE_BLUE } from "./objects/objectPalette";
import {
  OFFICE, OFFICE_LOBBY_H, OFFICE_DOOR, OFFICE_DESK, OFFICE_PLAZA, OFFICE_SEATS,
} from "./districtPois";
import { type Rect } from "../game/wander";

const O = OFFICE;
const WEST = O.x - O.w / 2;    // street-facing (open) front face
const EAST = O.x + O.w / 2;    // solid back face
const NORTH = O.z - O.d / 2;
const SOUTH = O.z + O.d / 2;
const LOBBY_H = OFFICE_LOBBY_H; // ground-floor walk-in clear height
const T = 0.3;                  // wall / slab thickness
// The east third is a SOLID structural CORE that rises full height (it IS the
// tower's collision mass — see restaurantColliders.officeColliders). The walk-in
// lobby occupies the WEST/center, in front of the core. Keep this in sync with
// OFFICE_CORE_D in restaurantColliders.ts so the visible back wall (= core west
// face) matches where the player is actually stopped.
const CORE_D = 5.0;                 // depth (along x) of the solid tower core
const CORE_WEST = EAST - CORE_D;    // 146: lobby's effective back / core front face

const C = {
  core:      0x6f7d8c,  // structural tower core (cool grey-blue)
  spandrel:  0x4a5663,  // floor-band spandrel between glazing courses
  lobbyWall: 0xdfe6ec,  // light lobby walls
  lobbyFloor:0xc6cdd3,
  ceiling:   0xd6dde2,
  desk:      0xe6ecf2,
  parapet:   0x3a4350,
  podium:    0xb7c0cb,  // ground-floor podium band under the glass tower
};

// ─── tower curtain wall: tile office glass panels up each elevation ───────────
// We clad the four faces (above the lobby) with `makeGlassPanel` tiles. The panes
// are transparent (separate meshes) over a SOLID core box, so the tower reads as a
// glazed mass without exposing the inside. Shared pane material keeps draw calls
// bounded (D8).
function cladFace(
  group: THREE.Group,
  axis: "x" | "z",
  faceCoord: number,     // the world coord of the face plane on the cladding axis
  spanCenter: number,    // center of the face along the tiling axis
  spanLen: number,       // length of the face along the tiling axis
  yaw: number,           // panel yaw so the pane faces outward
): void {
  const PANEL_W = 2.4;   // GLASS_PRESETS.office.w
  const towerH = O.h - LOBBY_H;
  const cols = Math.max(1, Math.round(spanLen / PANEL_W));
  const colW = spanLen / cols;
  const ROWS_H = 2.4;    // GLASS_PRESETS.office.h
  const rows = Math.max(1, Math.round(towerH / ROWS_H));
  const rowH = towerH / rows;
  for (let r = 0; r < rows; r++) {
    const y0 = LOBBY_H + r * rowH;
    for (let c = 0; c < cols; c++) {
      const off = -spanLen / 2 + (c + 0.5) * colW;
      const panel = makeGlassPanel({ ...GLASS_PRESETS.office, w: colW * 0.96, h: rowH * 0.96 });
      panel.rotation.y = yaw;
      // panel base is at y=0 locally, grows +y → lift to the course base.
      if (axis === "x") panel.position.set(faceCoord, y0 + rowH * 0.02, spanCenter + off);
      else panel.position.set(spanCenter + off, y0 + rowH * 0.02, faceCoord);
      group.add(panel);
    }
  }
}

export function makeOfficeBlock(): THREE.Object3D {
  const group = new THREE.Group();
  group.name = "officeBlock";

  // ── 1. LOBBY shell (ground floor walk-in atrium, open WEST front) ───────────
  // The walk-in lobby occupies the WEST/center of the footprint, in FRONT of the
  // solid tower core (east third). Floor + ceiling span the lobby; the lobby's
  // back wall is the core's west face (CORE_WEST), so where the player is stopped
  // matches the visible wall. North/south walls + two front corner returns flank
  // the open west entrance — matching officeColliders() (open center, walk-in).
  const FRONT_RETURN_D = 2.0; // depth of the closed corner returns along z
  const lobbyLen = CORE_WEST - WEST;     // x-extent of the lobby
  const lobbyMidX = (WEST + CORE_WEST) / 2;
  const lobby: THREE.BufferGeometry[] = [];
  lobby.push(tintedBox(lobbyLen - 0.2, 0.12, O.d - 0.2, lobbyMidX, 0.07, O.z, C.lobbyFloor));      // floor
  lobby.push(tintedBox(lobbyLen, T, O.d, lobbyMidX, LOBBY_H - T / 2, O.z, C.ceiling));              // ceiling
  lobby.push(tintedBox(T, LOBBY_H, O.d, CORE_WEST - T / 2, LOBBY_H / 2, O.z, C.lobbyWall));         // back wall (= core front)
  lobby.push(tintedBox(lobbyLen, LOBBY_H, T, lobbyMidX, LOBBY_H / 2, NORTH + T / 2, C.lobbyWall));  // north wall
  lobby.push(tintedBox(lobbyLen, LOBBY_H, T, lobbyMidX, LOBBY_H / 2, SOUTH - T / 2, C.lobbyWall));  // south wall
  // front corner returns on the open west face (closed corners, open center)
  lobby.push(tintedBox(T, LOBBY_H, FRONT_RETURN_D, WEST + T / 2, LOBBY_H / 2, NORTH + FRONT_RETURN_D / 2, C.lobbyWall));
  lobby.push(tintedBox(T, LOBBY_H, FRONT_RETURN_D, WEST + T / 2, LOBBY_H / 2, SOUTH - FRONT_RETURN_D / 2, C.lobbyWall));
  // podium band wrapping the top of the lobby (visually seats the glass tower).
  lobby.push(tintedBox(O.w + 0.4, 0.6, O.d + 0.4, O.x, LOBBY_H + 0.3, O.z, C.podium));
  const lobbyMesh = tintedMesh(mergeTinted(lobby));
  lobbyMesh.name = "officeBuilding"; // keeps the >=N building-mesh invariant
  group.add(lobbyMesh);

  // Open-front glass: a wide glazed atrium wall flanking the entrance on the west
  // face (two big panels on either side of the door lane — recognizable glazing
  // via the layered glass object, not a flat box).
  const doorLaneW = 3.2;
  const winW = (O.d - doorLaneW) / 2 - 0.4;
  for (const sz of [NORTH + FRONT_RETURN_D + winW / 2 + 0.2, SOUTH - FRONT_RETURN_D - winW / 2 - 0.2]) {
    const panel = makeGlassPanel({ ...GLASS_PRESETS.office, w: winW, h: LOBBY_H - 0.8 });
    panel.rotation.y = -Math.PI / 2; // face west (-x)
    panel.position.set(WEST + 0.16, 0.2, sz);
    group.add(panel);
  }

  // ── 2. SOLID TOWER core + curtain wall above the lobby ──────────────────────
  // The structural core is a solid box (architecture — bare box OK). The EAST
  // third rises FULL HEIGHT from the ground (the lobby's back is its west face);
  // above the lobby roof the core widens to the full footprint as the tower mass,
  // so the glazing has something opaque to sit on (you never see through it).
  const towerH = O.h - LOBBY_H;
  const core = tintedMesh(
    mergeTinted([
      // full-height east core (ground → parapet) — the collision mass
      tintedBox(CORE_D, O.h, O.d - 0.4, (CORE_WEST + EAST) / 2, O.h / 2, O.z, C.core),
      // tower mass over the full footprint, above the lobby roof
      tintedBox(O.w - 0.6, towerH, O.d - 0.6, O.x, LOBBY_H + towerH / 2, O.z, C.core),
      // floor-band spandrels (a few horizontal courses for vertical rhythm)
      ...spandrelBands(),
      // parapet cap
      tintedBox(O.w + 0.3, 0.7, O.d + 0.3, O.x, O.h + 0.35, O.z, C.parapet),
    ]),
  );
  core.name = "officeTower";
  group.add(core);

  // curtain-wall glass on all four elevations
  cladFace(group, "x", WEST - 0.12, O.z, O.d, -Math.PI / 2); // west
  cladFace(group, "x", EAST + 0.12, O.z, O.d, Math.PI / 2);  // east
  cladFace(group, "z", NORTH - 0.12, O.x, O.w, Math.PI);     // north
  cladFace(group, "z", SOUTH + 0.12, O.x, O.w, 0);           // south

  // rooftop kit: a couple of plant boxes + a comms mast so the top isn't bare.
  const roof: THREE.BufferGeometry[] = [];
  roof.push(tintedBox(2.0, 0.6, 2.0, O.x - 4, O.h + 1.0, O.z - 4, C.parapet));
  roof.push(tintedBox(2.0, 0.6, 2.0, O.x + 4, O.h + 1.0, O.z + 4, C.parapet));
  roof.push(tintedBox(0.2, 3.0, 0.2, O.x + 5, O.h + 2.2, O.z - 5, 0x9aa3ad)); // mast
  group.add(tintedMesh(mergeTinted(roof)));

  // ── 3. LOBBY furnishing (reception desk, seating, digital sign / kiosk) ─────
  // Reception desk via the shared counter kit, at OFFICE_DESK. NOT an obstacle
  // (it's a patron dwell/order target per rule 3).
  const desk = makeCounterKit({ x: OFFICE_DESK.x, z: OFFICE_DESK.z, w: 5.0 });
  desk.object.name = "officeReception";
  group.add(desk.object);

  // a sleek reception backwall logo band (emissive accent — geometry, not lighting)
  const logo = new THREE.Mesh(
    new THREE.BoxGeometry(4.0, 1.0, 0.08),
    new THREE.MeshStandardMaterial({ color: OFFICE_BLUE, emissive: OFFICE_BLUE, emissiveIntensity: 0.4 }),
  );
  logo.position.set(O.x, LOBBY_H - 1.4, EAST - 0.3);
  logo.name = "officeLogo";
  group.add(logo);

  // waiting seating cluster (benches) on the south side, facing the desk. The
  // bench is a SEAT target (excluded from obstacles, rule 3).
  for (const s of OFFICE_SEATS) {
    group.add(makeBenchMesh(s.x, s.z, Math.PI)); // back to the south wall, seat faces north (-z)
  }
  // a low coffee-table-ish slab between the benches and the desk (lobby detail)
  group.add(tintedMesh(tintedBox(1.2, 0.4, 0.7, O.x - 2.5, 0.2, O.z + O.d * 0.12, C.desk)));

  // an interior digital sign / info kiosk near the entrance (reusable kiosk object)
  const lobbyKiosk = makeKioskMesh();
  lobbyKiosk.position.set(O.x - O.w * 0.32, 0, O.z - O.d * 0.18);
  lobbyKiosk.rotation.y = -Math.PI / 2; // faces the entrance lane (west)
  lobbyKiosk.name = "officeInfoKiosk";
  group.add(lobbyKiosk);

  // dark threshold mat at the doorway (interior detail)
  group.add(tintedMesh(tintedBox(1.4, 0.05, 2.4, WEST + 1.0, 0.1, OFFICE_DOOR.z, 0x2a3038)));

  // ── 4. PLAZA out front (kit: paving + planters + bike rack + kiosk) ─────────
  // Centered on OFFICE_PLAZA, on the street (west) side of the lobby. The plaza
  // kit's prop footprints are re-derived in officePropObstacles() below.
  const plaza = makeOfficePlaza({ x: OFFICE_PLAZA.x, z: OFFICE_PLAZA.z, w: PLAZA_W, d: PLAZA_D });
  plaza.object.name = "officePlaza";
  group.add(plaza.object);

  // an extra standalone bike rack to the south of the plaza (more "office life").
  const extraRack = makeBikeRackKit({ x: EXTRA_RACK.x, z: EXTRA_RACK.z });
  extraRack.object.name = "officeBikeRack";
  group.add(extraRack.object);

  return group;
}

// Floor-band spandrels: thin opaque horizontal courses on each tower elevation,
// so the glazing reads as stacked floors. Built around the core footprint.
function spandrelBands(): THREE.BufferGeometry[] {
  const out: THREE.BufferGeometry[] = [];
  const towerH = O.h - LOBBY_H;
  const floors = Math.max(2, Math.round(towerH / 3.2));
  const floorH = towerH / floors;
  for (let f = 1; f < floors; f++) {
    const y = LOBBY_H + f * floorH;
    out.push(tintedBox(O.w + 0.06, 0.25, O.d + 0.06, O.x, y, O.z, C.spandrel));
  }
  return out;
}

// ─── plaza placement constants (single source for mesh + obstacle footprints) ──
const PLAZA_W = 8;
const PLAZA_D = 7;
const EXTRA_RACK = { x: OFFICE_PLAZA.x, z: OFFICE_PLAZA.z + PLAZA_D / 2 + 1.5 };

// Footprints of the chunky plaza props NPCs must not walk through. Re-derived
// from the SAME kit calls as the meshes (so they can't drift), per rule 3.
// EXCLUDES the lobby interior (reception desk, benches, info kiosk, threshold) —
// those are dwell / sit / enter targets; blocking them would trap patrons.
// Consumed by world/obstacles.ts.
export function officePropObstacles(): Rect[] {
  const out: Rect[] = [];
  // plaza kit: planters + bike rack + kiosk (its obstacles, in world space)
  out.push(...makeOfficePlaza({ x: OFFICE_PLAZA.x, z: OFFICE_PLAZA.z, w: PLAZA_W, d: PLAZA_D }).obstacles);
  // the extra standalone bike rack
  out.push(...makeBikeRackKit({ x: EXTRA_RACK.x, z: EXTRA_RACK.z }).obstacles);
  return out;
}
