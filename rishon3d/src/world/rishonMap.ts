import { PALETTE } from "./palette";

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
  // `center` frames the playable block so the ground plane, ground collider and
  // minimap can sit over the compact V1 slice (anchored near (95,104)) instead of
  // the world origin. Defaults to the origin when omitted.
  ground: { size: number; center?: Vec2 };
  buildings: BuildingDef[];
  roads: RoadDef[];
  npcSpawns: Vec2[];
  carSpawn: Vec2;
  playerSpawn: Vec2;
  props: PropDef[];
}

// V1 COMPACT MAP — the entire playable world is the restaurant-block slice built
// by world/restaurantStreet.ts around (CX=95, CZ=95). This map carries only the
// data layer that survives: the framing ground, the single isHouse building (the
// rich house geometry + collider come from playerHouse.ts / restaurantColliders,
// NOT World's makeBuilding loop — World skips isHouse), one decorative street
// RoadDef for the minimap + off-road prop filter, and the player/car spawns.
//
// House coords mirror world/districtPois.ts HOUSE / HOUSE_SPAWN / DRIVEWAY as
// literals to avoid an import cycle (rishonMap -> districtPois -> roads ->
// rishonMap). Keep these in sync with districtPois.
//
// The east cross street + office/cafe footprints are ALSO declared in
// districtPois (EAST_CROSS / OFFICE / CAFE). Per the same cycle rule, the road
// below is a LITERAL mirror of districtPois.EAST_CROSS — never an import. The
// office/cafe FOOTPRINTS deliberately stay out of CORE_MAP.buildings: World
// renders every non-house data building as a generic box (with a box collider),
// so the real office (Task 12) + cafe (Task 9) geometry must come from their own
// builders, not the box path. Only the one isHouse building lives here.
export const CORE_MAP: RishonMap = {
  // Grown from 100 -> 160 and re-centered east to (108,104) so the office tower
  // (x≈142) and cafe (x≈62) footprints fit inside the framed bounds
  // x∈[28,188], z∈[24,184]. Mirrors districtPois OFFICE / CAFE / EAST_CROSS.
  ground: { size: 160, center: { x: 108, z: 104 } },
  roads: [
    // The visible 3D road is drawn by restaurantStreet.makeStreetBlock(); these
    // RoadDefs only feed the minimap and the off-road prop filter.
    { id: "hero-street", x: 95, z: 109, length: 60, horizontal: true },
    // East cross street — mirrors districtPois.EAST_CROSS (literal, no import).
    { id: "east-cross", x: 128, z: 112, length: 40, horizontal: false },
  ],
  buildings: [
    // The player house (data only): satisfies validateMap's exactly-one-house and
    // the minimap footprint. Rendered richly by playerHouse.ts; World skips isHouse.
    { id: "house", x: 74, z: 124, width: 12, depth: 9, height: 5, color: PALETTE.houseBody, isHouse: true },
  ],
  // Kept clear of the house footprint and in-bounds; not used for population in V1
  // (Game spawns scripted patrons), but present for the data contract.
  npcSpawns: [
    { x: 90, z: 99 }, { x: 100, z: 99 }, { x: 95, z: 101 },
  ],
  carSpawn: { x: 86, z: 123 },   // the house driveway (drivable car waits here)
  // HOUSE_SPAWN (districtPois): in front of the house (NOT inside its collider),
  // offset east so the follow-camera clears the house. Faces the street.
  playerSpawn: { x: 84, z: 116 },
  props: [],
};

export function validateMap(map: RishonMap): string[] {
  const errors: string[] = [];
  const ids = map.buildings.map((b) => b.id);
  if (new Set(ids).size !== ids.length) errors.push("duplicate building ids");
  if (map.buildings.filter((b) => b.isHouse).length !== 1) errors.push("must have exactly one house");
  const half = map.ground.size / 2;
  const c = map.ground.center ?? { x: 0, z: 0 };
  const inBounds = (p: Vec2) => Math.abs(p.x - c.x) <= half && Math.abs(p.z - c.z) <= half;
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
