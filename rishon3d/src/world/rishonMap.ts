import { BUILDING_COLORS, PALETTE } from "./palette";

export interface Vec2 { x: number; z: number }

export interface BuildingDef {
  id: string; x: number; z: number;
  width: number; depth: number; height: number;
  color: number; isHouse?: boolean;
}

export interface RoadDef {
  id: string; x: number; z: number; length: number; horizontal: boolean;
}

export type PropKind =
  | "tree" | "streetlight" | "bush" | "bench"
  | "flowerbed" | "trashcan" | "planter";
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

// Seeded street furniture along the two core arterial sidewalks (main-h, cross-v).
// Props live on the sidewalk band a hair beyond the off-road filter (5.5u from the
// centerline > ROAD_W/2 + 1.5 = 4.5), so flowerbeds/trashcans/planters survive the
// filterPropsOffRoads pass and line the walked street with color and greenery.
function coreFurniture(seed = 73101): PropDef[] {
  const out: PropDef[] = [];
  const flank = 5.5;       // offset from the arterial centerline onto the sidewalk
  const spacing = 9;       // stations along each arterial
  const span = 54;         // reach along the arterial (core arterials are length 120)
  // kind picked per station from a fixed cycle so the street reads varied but stable.
  const cycle: PropKind[] = ["flowerbed", "trashcan", "planter", "flowerbed", "bench", "flowerbed"];
  let n = 0;
  for (const axis of ["h", "v"] as const) {
    for (let t = -span; t <= span; t += spacing) {
      for (const side of [-1, 1] as const) {
        // jitter the station kind deterministically so both sides differ.
        const pick = (Math.floor(seed / 7) + n * 3 + (side > 0 ? 2 : 0)) % cycle.length;
        const kind = cycle[pick];
        const a = flank * side + ((n % 2) - 0.5) * 0.4; // slight sidewalk-depth wobble
        if (axis === "h") {
          out.push({ id: `cf-h-${n}-${side}`, kind, x: t, z: a });
        } else {
          out.push({ id: `cf-v-${n}-${side}`, kind, x: a, z: t });
        }
        n++;
      }
    }
  }
  // A few extra lamps for night density, paired across the arterials.
  const lampStations = [-36, -18, 18, 36];
  lampStations.forEach((t, i) => {
    out.push({ id: `cf-lh-${i}`, kind: "streetlight", x: t, z: flank });
    out.push({ id: `cf-lv-${i}`, kind: "streetlight", x: flank, z: t });
  });
  return out;
}

export const CORE_MAP: RishonMap = {
  ground: { size: 280 },
  roads: [
    { id: "main-h", x: 0, z: 0, length: 120, horizontal: true },
    { id: "cross-v", x: 0, z: 0, length: 120, horizontal: false },
  ],
  buildings: [
    { id: "house", x: 14, z: 14, width: 8, depth: 8, height: 5, color: PALETTE.houseBody, isHouse: true },
    { id: "b1", x: -18, z: 12, width: 10, depth: 10, height: 12, color: BUILDING_COLORS[0] },
    { id: "b2", x: -16, z: -16, width: 12, depth: 8, height: 16, color: BUILDING_COLORS[3] },
    { id: "b3", x: 18, z: -14, width: 9, depth: 11, height: 9, color: BUILDING_COLORS[1] },
    { id: "b4", x: 34, z: 8, width: 8, depth: 8, height: 20, color: BUILDING_COLORS[3] },
    { id: "b5", x: -38, z: -12, width: 14, depth: 10, height: 7, color: BUILDING_COLORS[2] },
    { id: "b6", x: 12, z: 36, width: 10, depth: 9, height: 14, color: BUILDING_COLORS[5] },
    { id: "b7", x: -14, z: -36, width: 11, depth: 11, height: 10, color: BUILDING_COLORS[4] },
  ],
  npcSpawns: [
    { x: 8, z: 6 }, { x: -6, z: 4 }, { x: 4, z: -10 },
    { x: -12, z: -4 }, { x: 12, z: 6 }, { x: -2, z: 16 },
  ],
  carSpawn: { x: 6, z: 14 },
  playerSpawn: { x: 0, z: 4 },
  props: [
    { id: "t1", kind: "tree", x: 10, z: -4 }, { id: "t2", kind: "tree", x: -10, z: 2 },
    { id: "t3", kind: "tree", x: 24, z: -2 }, { id: "t4", kind: "tree", x: -26, z: 10 },
    { id: "t5", kind: "tree", x: 2, z: 22 }, { id: "t6", kind: "tree", x: -2, z: -22 },
    { id: "t7", kind: "tree", x: 22, z: 20 }, { id: "t8", kind: "tree", x: -22, z: -22 },
    { id: "l1", kind: "streetlight", x: 4, z: -8 }, { id: "l2", kind: "streetlight", x: -4, z: 8 },
    { id: "l3", kind: "streetlight", x: 4, z: 20 }, { id: "l4", kind: "streetlight", x: -4, z: -20 },
    { id: "l5", kind: "streetlight", x: 20, z: -4 }, { id: "l6", kind: "streetlight", x: -20, z: 4 },
    { id: "bench-c1", kind: "bench", x: 6, z: -6 }, { id: "bench-c2", kind: "bench", x: -6, z: 6 },
    { id: "bench-c3", kind: "bench", x: 16, z: 2 },
    { id: "t9", kind: "tree", x: -16, z: 6 }, { id: "t10", kind: "tree", x: 16, z: -6 },
    { id: "t11", kind: "tree", x: 0, z: 30 }, { id: "t12", kind: "tree", x: 0, z: -30 },
    ...coreFurniture(),
  ],
};

export function validateMap(map: RishonMap): string[] {
  const errors: string[] = [];
  const ids = map.buildings.map((b) => b.id);
  if (new Set(ids).size !== ids.length) errors.push("duplicate building ids");
  if (map.buildings.filter((b) => b.isHouse).length !== 1) errors.push("must have exactly one house");
  const half = map.ground.size / 2;
  const inBounds = (p: Vec2) => Math.abs(p.x) <= half && Math.abs(p.z) <= half;
  if (!inBounds(map.carSpawn)) errors.push("carSpawn out of bounds");
  if (!inBounds(map.playerSpawn)) errors.push("playerSpawn out of bounds");
  map.npcSpawns.forEach((s, i) => { if (!inBounds(s)) errors.push(`npcSpawn ${i} out of bounds`); });
  map.props.forEach((p) => { if (!inBounds(p)) errors.push(`prop ${p.id} out of bounds`); });
  const SPAWN_MARGIN = 2.0;
  map.npcSpawns.forEach((s, i) => {
    for (const b of map.buildings) {
      const minX = b.x - b.width / 2 - SPAWN_MARGIN;
      const maxX = b.x + b.width / 2 + SPAWN_MARGIN;
      const minZ = b.z - b.depth / 2 - SPAWN_MARGIN;
      const maxZ = b.z + b.depth / 2 + SPAWN_MARGIN;
      if (s.x >= minX && s.x <= maxX && s.z >= minZ && s.z <= maxZ) {
        errors.push(`npcSpawn ${i} inside building ${b.id}`);
        break;
      }
    }
  });
  return errors;
}
