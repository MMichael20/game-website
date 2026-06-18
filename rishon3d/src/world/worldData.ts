import { CORE_MAP, type RishonMap, type RoadDef, type PropDef } from "./rishonMap";
import type { DistrictSpec } from "./districts";
import { generateDistrict } from "./cityGen";

// Four satellite districts arranged around the hand-authored downtown core.
// Centers/sizes chosen to sit inside the 280-unit ground with margin and not
// overlap the core (which spans roughly +/-40 around the origin).
export const DISTRICTS: DistrictSpec[] = [
  { id: "north", center: { x: 0, z: -95 }, size: 60, blocks: 4, seed: 101,
    palette: [0x9aa7b8, 0x7c8aa0, 0x6d7a91], minHeight: 8, maxHeight: 22, density: 0.85 },
  { id: "east", center: { x: 95, z: 0 }, size: 60, blocks: 4, seed: 202,
    palette: [0xb0a08a, 0xc2b29a, 0x99876b], minHeight: 6, maxHeight: 16, density: 0.8 },
  { id: "south", center: { x: 0, z: 95 }, size: 60, blocks: 5, seed: 303,
    palette: [0x99a6ba, 0x828fa6, 0x90a0b5], minHeight: 7, maxHeight: 14, density: 0.75 },
  { id: "west", center: { x: -95, z: 0 }, size: 60, blocks: 4, seed: 404,
    palette: [0xa3b0c2, 0x8d99ae, 0x7c8aa0], minHeight: 10, maxHeight: 24, density: 0.85 },
];

// Wide arterial roads from the origin out to each district center so the
// player can drive between downtown and the satellites.
function arterials(): RoadDef[] {
  return [
    { id: "art-n", x: 0, z: -55, length: 90, horizontal: false },
    { id: "art-e", x: 55, z: 0, length: 90, horizontal: true },
    { id: "art-s", x: 0, z: 55, length: 90, horizontal: false },
    { id: "art-w", x: -55, z: 0, length: 90, horizontal: true },
  ];
}

// Tree-line the arterials so the drives between districts feel alive.
function roadsideTrees(): PropDef[] {
  const out: PropDef[] = [];
  const spacing = 8;
  const flank = 5;
  for (const a of arterials()) {
    const n = Math.floor(a.length / spacing);
    for (let i = 0; i <= n; i++) {
      const t = -a.length / 2 + i * spacing;
      if (a.horizontal) {
        out.push({ id: `rt-${a.id}-${i}-a`, kind: "tree", x: a.x + t, z: a.z - flank });
        out.push({ id: `rt-${a.id}-${i}-b`, kind: "tree", x: a.x + t, z: a.z + flank });
      } else {
        out.push({ id: `rt-${a.id}-${i}-a`, kind: "tree", x: a.x - flank, z: a.z + t });
        out.push({ id: `rt-${a.id}-${i}-b`, kind: "tree", x: a.x + flank, z: a.z + t });
      }
    }
  }
  return out;
}

export function assembleMap(): RishonMap {
  const buildings = [...CORE_MAP.buildings];
  const roads = [...CORE_MAP.roads, ...arterials()];
  const props = [...CORE_MAP.props];
  props.push(...roadsideTrees());

  for (const spec of DISTRICTS) {
    const r = generateDistrict(spec);
    buildings.push(...r.buildings);
    roads.push(...r.roads);
    props.push(...r.props);
  }

  return {
    ground: CORE_MAP.ground,
    buildings,
    roads,
    props,
    npcSpawns: CORE_MAP.npcSpawns,
    carSpawn: CORE_MAP.carSpawn,
    playerSpawn: CORE_MAP.playerSpawn,
  };
}

export const RISHON_MAP: RishonMap = assembleMap();
