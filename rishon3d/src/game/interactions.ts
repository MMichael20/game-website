// rishon3d/src/game/interactions.ts
//
// Proximity interactions for the restaurant-district POIs. Pure logic (no THREE)
// so it is unit-testable: given the player position it reports which location
// they are standing at, and the HUD prompt to show there. Game.update() drives
// the on-foot prompt cascade from this.

import { type Poi, locationPois } from "../world/locations";

export interface Vec2 { x: number; z: number }

// The POI table the proximity system runs against: the location-registry
// projection, so the registry is the single source feeding interactions. Built
// once at module load.
const POIS: readonly Poi[] = locationPois();

// The POI whose interaction radius currently contains the player, nearest first
// (so overlapping zones resolve to the closest). null when not at any location.
export function nearestPoi(pos: Vec2, pois: readonly Poi[] = POIS): Poi | null {
  let best: Poi | null = null;
  let bestD = Infinity;
  for (const p of pois) {
    const d = Math.hypot(pos.x - p.x, pos.z - p.z);
    if (d <= p.r && d < bestD) { best = p; bestD = d; }
  }
  return best;
}

// The HUD prompt shown when the player is standing at a POI (prototype-level).
export function poiPrompt(poi: Poi): string {
  switch (poi.kind) {
    case "restaurant": return "Walk in to the restaurant";
    case "bakery": return "Walk in to the bakery";
    case "phoneShop": return "Walk in to the phone shop";
    case "taxi": return "Taxi pickup point";
    case "park": return "Pocket park";
    case "pickup": return "Delivery / pickup point";
    case "house": return "Your home";
    default: return poi.label;
  }
}
