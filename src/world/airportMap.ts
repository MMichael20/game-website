// Ben Gurion ("Natbag") airport — the second world. Placeholder layout: replaced
// with the full terminal/concourse/gates/apron build in Task 6. Axis convention:
// +z = airside (north), -z = landside (south); the player enters at the south curb.
import type { MapDescriptor } from "./system/types";

const AIRPORT_GROUND = 260;

export const AIRPORT: MapDescriptor = {
  id: "airport",
  map: [
    { kind: "ground", params: { size: AIRPORT_GROUND } },
  ],
  spawn: { x: 0, z: -104 },
  groundSize: AIRPORT_GROUND,
  hasCar: false,
  portals: [
    { x: 0, z: -110, r: 5, prompt: "Press E to return to the city", to: "city", toSpawn: { x: 16, z: 8 } },
  ],
};
