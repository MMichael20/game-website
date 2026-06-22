// The map registry: every self-contained world the game can switch between.
// World.load(desc) builds one; Game's portals switch between them with a fade.
import type { MapDescriptor } from "./system/types";
import { MAP, PLAYER_SPAWN, CAR_SPAWN, CAR_SPAWN_YAW, GROUND_SIZE } from "./map";
import { AIRPORT } from "./airportMap";

// The city — now with the full Ben Gurion airport merged in to the north. Drive
// the x=0 expressway straight out of the city to the terminal; no portal, no fade.
const CITY: MapDescriptor = {
  id: "city",
  map: MAP,
  spawn: PLAYER_SPAWN,
  groundSize: GROUND_SIZE,
  hasCar: true,
  carSpawn: CAR_SPAWN,
  carSpawnYaw: CAR_SPAWN_YAW,
  portals: [],
};

// AIRPORT kept registered for standalone testing, but the city no longer portals
// to it — the airport content is embedded directly in the city map.
export const MAPS: Record<string, MapDescriptor> = { city: CITY, airport: AIRPORT };
