// rishon3d/src/world/locations.ts
//
// The LOCATION REGISTRY: the SINGLE SOURCE of every named place in the world
// (its identity, minimap marker and interaction zones). It is the single place a
// future location is added — drop a `LocationDef` in `LOCATIONS` and the minimap
// markers (`minimapEntries()`), the proximity interactions (`locationPois()` ->
// `nearestPoi`/`poiPrompt`) and the flat POI table (`POIS`) all pick it up;
// obstacle aggregation can also hook the registry (see obstacles.ts).
//
// This module also OWNS the `Poi`/`PoiKind` types and the derived `POIS` table:
// there is no longer a parallel `POIS` literal in `districtPois.ts`. `POIS` is
// `locationPois()`, a projection of `LOCATIONS`, so the registry is the one data
// table consumers read.
//
// Coordinates are NOT re-typed here. Per rishon3d rule 2 ("one source of truth
// for placement") every position is sourced from the named anchors in
// `districtPois.ts`; this module only composes those anchors into per-location
// definitions and projects them into the flat `Poi[]` the minimap + interaction
// system consume.
//
// IMPORT-CYCLE NOTE: the dependency runs ONE WAY — `locations` imports
// `districtPois` VALUES (the coordinate anchors) + its `Vec2` type; `districtPois`
// does NOT import any `locations` VALUE — in fact, after dropping the duplicate
// POIS literal, districtPois needs no `Poi`/`PoiKind` import at all. (Were it to
// need those TYPES it could `import type` them from here — type-only imports are
// erased at runtime, so they form NO init cycle even though `locations` imports
// districtPois values.)
// That asymmetry is deliberate: districtPois's anchors are declared in the middle
// of its module body, so a runtime back-edge would initialise `locations`
// mid-`districtPois`-init and read still-undefined anchors (verified: it throws).
// Keeping the edge one-way also preserves the older cycle-break — `rishonMap.ts`
// must not import either module (it mirrors HOUSE coords as literals) so
// `rishonMap -> districtPois -> roads -> rishonMap` never forms. No THREE, no RNG
// -> unit-testable.

import {
  type Vec2,
  RESTAURANT_DOOR,
  BAKERY_DOOR,
  CAFE_DOOR,
  PHONE_SHOP_DOOR,
  TAXI_WAIT,
  PARK_CENTER,
  PICKUP_STAND,
  HOUSE_DOOR,
  OFFICE_DOOR,
} from "./districtPois";
import { type Rect } from "../game/wander";

// --- POI types (owned here; the registry is their single source) --------------
// A named gameplay anchor's kind. Drives interaction prompts + minimap colouring.
export type PoiKind =
  | "restaurant" | "bakery" | "cafe" | "counter" | "phoneShop" | "office" | "taxi" | "park" | "pickup" | "crosswalk" | "house";

// The flat POI record consumed by the minimap legend + the interaction prompts.
// All in world space; `r` is the interaction/approach radius.
export interface Poi {
  kind: PoiKind;
  id: string;
  label: string;
  x: number;
  z: number;
  r: number;
  /** one-letter glyph drawn on the minimap marker */
  glyph: string;
  /** minimap marker color */
  color: string;
}

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

// The registry — the SINGLE SOURCE for every place. Each entry's primary zone
// projects to exactly one `Poi`; the anchors come straight from districtPois so
// there is no drift and no parallel literal to keep in sync.
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
    id: "cafe", name: "Cafe", type: "cafe",
    minimap: { glyph: "C", color: "#caa46a" },
    zones: [{ center: CAFE_DOOR, r: 4.5, prompt: "Cafe", kind: "cafe" }],
  },
  {
    id: "phoneShop", name: "Phone Shop", type: "shop",
    minimap: { glyph: "P", color: "#3aa0ff" },
    zones: [{ center: PHONE_SHOP_DOOR, r: 4.5, prompt: "Phone Shop", kind: "phoneShop" }],
  },
  {
    id: "office", name: "Hi-Tech Office", type: "office",
    minimap: { glyph: "O", color: "#4aa3d0" },
    zones: [{ center: OFFICE_DOOR, r: 4.5, prompt: "Hi-Tech Office", kind: "office" }],
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
// location id/name + minimap glyph/color (same kind/id/label/x/z/r/glyph/color,
// same registry order).
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

// The flat POI table consumers read. This IS the single source: it is the
// registry projection, not a hand-typed parallel literal. (districtPois no longer
// declares its own POIS.) locations -> districtPois is one-way at runtime, so
// owning POIS here forms no init cycle.
export const POIS: Poi[] = locationPois();

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
