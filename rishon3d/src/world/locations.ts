// rishon3d/src/world/locations.ts
//
// The LOCATION REGISTRY: one data table describing every named place in the
// world (its identity, minimap marker and interaction zones). It is the single
// place a future location is added — drop a `LocationDef` in `LOCATIONS` and the
// minimap markers (`minimapEntries()`) and the proximity interactions
// (`locationPois()` -> `nearestPoi`/`poiPrompt`) pick it up; obstacle
// aggregation can also hook the registry (see obstacles.ts).
//
// Coordinates are NOT re-typed here. Per rishon3d rule 2 ("one source of truth
// for placement") every position is sourced from the named anchors in
// `districtPois.ts`; this module only composes those anchors into per-location
// definitions and projects them into the flat `Poi[]` the minimap + interaction
// system consume.
//
// IMPORT-CYCLE NOTE: the dependency runs ONE WAY — `locations` imports
// `districtPois` (anchors + the `Poi`/`PoiKind`/`Vec2` types); `districtPois`
// does NOT import `locations`. That asymmetry is deliberate. `districtPois.POIS`
// is kept as the literal placement source of truth, and `locationPois()` is a
// derived projection that DEEP-EQUALS it (pinned by `locations.test.ts`), so the
// registry feeds live consumers without districtPois ever depending back on this
// module. A two-way pairing (`districtPois.POIS = locationPois()`) was rejected:
// because districtPois's anchors are declared below where it would import this
// module, initialising `locations` mid-`districtPois`-init reads still-undefined
// anchors (verified: it throws). Keeping the edge one-way also preserves the
// older cycle-break — `rishonMap.ts` must not import either module (it mirrors
// HOUSE coords as literals) so `rishonMap -> districtPois -> roads -> rishonMap`
// never forms. No THREE, no RNG -> unit-testable.

import {
  type Poi,
  type PoiKind,
  type Vec2,
  RESTAURANT_DOOR,
  BAKERY_DOOR,
  PHONE_SHOP_DOOR,
  TAXI_WAIT,
  PARK_CENTER,
  PICKUP_STAND,
  HOUSE_DOOR,
} from "./districtPois";
import { type Rect } from "../game/wander";

// Broad category for a place; drives future per-type behaviour (NPC budgets,
// default minimap styling) without each location restating it.
export type LocationType =
  | "home" | "restaurant" | "cafe" | "shop" | "office" | "park" | "taxi" | "transit";

// One proximity-interaction footprint of a location. `center`/`r` define the
// approach circle the player must be inside; `kind` is the POI kind the
// projection emits (so existing `poiPrompt`/minimap colouring keep working);
// `prompt` is a human label for the zone.
export interface InteractionZone {
  center: Vec2;
  r: number;
  prompt: string;
  kind: PoiKind;
}

// A named place in the world. `zones` is non-empty and `zones[0]` is the
// primary interaction (the one projected to the location's POI id/label).
export interface LocationDef {
  id: string;
  name: string;
  type: LocationType;
  minimap: { glyph: string; color: string };
  zones: InteractionZone[]; // >=1; first is the primary
  count?: number;           // NPC budget for this location (future use)
  // Solid footprints this location contributes to PATRON_OBSTACLES (planters,
  // stands, closed shells...). The CURRENT locations declare none — their solid
  // bodies/props are still owned by the *PropObstacles() exports in the
  // builder files (obstacles.ts spreads those). This is an ADDITIVE hook so a
  // FUTURE location added purely as a LocationDef can carry its own footprints.
  obstacles?: Rect[];
}

// The registry. Each entry's primary zone reproduces exactly one of the current
// POIS entries; the anchors come straight from districtPois so there is no drift.
export const LOCATIONS: LocationDef[] = [
  {
    id: "restaurant", name: "Restaurant", type: "restaurant",
    minimap: { glyph: "R", color: "#e0524a" },
    zones: [{ center: RESTAURANT_DOOR, r: 4.5, prompt: "Restaurant", kind: "restaurant" }],
  },
  {
    id: "bakery", name: "Bakery", type: "cafe",
    minimap: { glyph: "B", color: "#f3a6c0" },
    zones: [{ center: BAKERY_DOOR, r: 4.5, prompt: "Bakery", kind: "bakery" }],
  },
  {
    id: "phoneShop", name: "Phone Shop", type: "shop",
    minimap: { glyph: "P", color: "#3aa0ff" },
    zones: [{ center: PHONE_SHOP_DOOR, r: 4.5, prompt: "Phone Shop", kind: "phoneShop" }],
  },
  {
    id: "taxi", name: "Taxi Stand", type: "taxi",
    minimap: { glyph: "T", color: "#f2c14e" },
    zones: [{ center: TAXI_WAIT, r: 4.5, prompt: "Taxi Stand", kind: "taxi" }],
  },
  {
    id: "park", name: "Pocket Park", type: "park",
    minimap: { glyph: "G", color: "#5cc24a" },
    zones: [{ center: PARK_CENTER, r: 6, prompt: "Pocket Park", kind: "park" }],
  },
  {
    id: "pickup", name: "Pickup", type: "transit",
    minimap: { glyph: "S", color: "#ffd98a" },
    zones: [{ center: PICKUP_STAND, r: 3.5, prompt: "Pickup", kind: "pickup" }],
  },
  {
    id: "house", name: "Home", type: "home",
    minimap: { glyph: "H", color: "#f4c542" },
    zones: [{ center: HOUSE_DOOR, r: 4, prompt: "Home", kind: "house" }],
  },
];

// Project the registry to the flat POI table the minimap + interactions consume.
// Each location contributes its PRIMARY zone (zones[0]) as one Poi, carrying the
// location id/name + minimap glyph/color. This deep-equals the pre-refactor
// districtPois.POIS (same kind/id/label/x/z/r/glyph/color, same order).
export function locationPois(): Poi[] {
  return LOCATIONS.map((loc): Poi => {
    const z0 = loc.zones[0];
    return {
      kind: z0.kind,
      id: loc.id,
      label: loc.name,
      x: z0.center.x,
      z: z0.center.z,
      r: z0.r,
      glyph: loc.minimap.glyph,
      color: loc.minimap.color,
    };
  });
}

// One minimap marker per location, anchored at its primary zone center.
export function minimapEntries(): { x: number; z: number; glyph: string; color: string }[] {
  return LOCATIONS.map((loc) => ({
    x: loc.zones[0].center.x,
    z: loc.zones[0].center.z,
    glyph: loc.minimap.glyph,
    color: loc.minimap.color,
  }));
}

// Every solid footprint the registry contributes to NPC obstacle collision.
// EMPTY today (the current locations declare no `obstacles` — their solids live
// in the builders' *PropObstacles() exports), so spreading this into
// PATRON_OBSTACLES is a no-op until a future location carries its own. The hook
// keeps "add a location" a single data entry without the obstacles.ts wiring
// needing to learn about it.
export function allLocationObstacles(): Rect[] {
  return LOCATIONS.flatMap((loc) => loc.obstacles ?? []);
}
