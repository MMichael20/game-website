export interface Vec2 { x: number; z: number }

export interface BuildingDef {
  id: string; x: number; z: number;
  width: number; depth: number; height: number;
  color: number; isHouse?: boolean;
}

export interface RoadDef {
  id: string; x: number; z: number; length: number; horizontal: boolean;
}

export type PropKind = "tree" | "streetlight" | "bush" | "bench";
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

export const CORE_MAP: RishonMap = {
  ground: { size: 280 },
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
    { id: "b5", x: -34, z: -6, width: 14, depth: 10, height: 7, color: 0x99a6ba },
    { id: "b6", x: 6, z: 36, width: 10, depth: 9, height: 14, color: 0x828fa6 },
    { id: "b7", x: -8, z: -36, width: 11, depth: 11, height: 10, color: 0x90a0b5 },
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
