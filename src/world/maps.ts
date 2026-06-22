// The map registry: every self-contained world the game can switch between.
// World.load(desc) builds one; Game's portals switch between them with a fade.
import type { MapDescriptor } from "./system/types";
import { MAP, PLAYER_SPAWN, CAR_SPAWN, CAR_SPAWN_YAW, GROUND_SIZE } from "./map";
import { AIRPORT } from "./airportMap";

// The city. Its one portal is the Terminal-3 entrance in the SE hero cell (16,16);
// stand at its door (which faces the junction, i.e. its open front is at -z of the
// cell) and press E to fly out to the airport landside curb.
const CITY: MapDescriptor = {
  id: "city",
  map: MAP,
  spawn: PLAYER_SPAWN,
  groundSize: GROUND_SIZE,
  hasCar: true,
  carSpawn: CAR_SPAWN,
  carSpawnYaw: CAR_SPAWN_YAW,
  portals: [
    { x: 16, z: 8, r: 5, prompt: "Press E to enter the airport", to: "airport", toSpawn: { x: 0, z: -98 } },
  ],
};

export const MAPS: Record<string, MapDescriptor> = { city: CITY, airport: AIRPORT };
