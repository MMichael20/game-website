// src/world/catalog/index.ts
//
// Importing this module registers every catalog object (side-effect imports).
import "./primitives";
import "./buildings";
import "./stores";
import "./fillerBuilding";
import "./terraceRow";
import "./park";
import "./cityGrid";
import "./trafficLight";
import "./pavement";
import "./kioskCart";
import "./grandFountain";
import "./plaza";

/** Call once at startup to guarantee the catalog modules have been evaluated. */
export function registerCatalog(): void { /* imports above run the defineObject calls */ }
