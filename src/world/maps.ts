// The map registry: every self-contained world the game can switch between.
// World.load(desc) builds one; Game's portals switch between them with a fade.
import type { MapDescriptor } from "./system/types";
import { MAP, PLAYER_SPAWN, CAR_SPAWN, CAR_SPAWN_YAW, GROUND_SIZE } from "./map";
import { AIRPORT } from "./airportMap";

// The city. Drive the eastbound expressway out to the Terminal-3 building on the
// east edge (door at x~108,z=0), park, and press E to fly to the airport landside.
const CITY: MapDescriptor = {
  id: "city",
  map: MAP,
  spawn: PLAYER_SPAWN,
  groundSize: GROUND_SIZE,
  hasCar: true,
  carSpawn: CAR_SPAWN,
  carSpawnYaw: CAR_SPAWN_YAW,
  portals: [
    { x: 108, z: 0, r: 5, prompt: "Press E to enter the airport", to: "airport", toSpawn: { x: 0, z: -98 } },
  ],
};

export const MAPS: Record<string, MapDescriptor> = { city: CITY, airport: AIRPORT };
