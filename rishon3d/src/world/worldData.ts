import { CORE_MAP, type RishonMap } from "./rishonMap";
import { filterPropsOffRoads } from "./roadClear";

// V1 COMPACT MAP. The world is just the restaurant-block slice (built by
// world/restaurantStreet.ts around (95,95)) plus the player house. There is no
// procedural city, no satellite districts, no arterials, no airport/rail. This
// assembler simply returns the compact CORE_MAP (keeping props clear of the one
// decorative street for the off-road contract). Export names assembleMap /
// RISHON_MAP are preserved so main.ts / World / Minimap keep resolving.
export function assembleMap(): RishonMap {
  return {
    ...CORE_MAP,
    props: filterPropsOffRoads(CORE_MAP.props, CORE_MAP.roads, 1.5),
  };
}

export const RISHON_MAP: RishonMap = assembleMap();
