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
import "./highway";
import "./buildingRow";

// Airport (second world) objects.
import "./airport/terminalHall";
import "./airport/checkInIsland";
import "./airport/flightBoard";
import "./airport/securityLane";
import "./airport/airportSeating";
import "./airport/gateLounge";
import "./airport/baggageCarousel";
import "./airport/jetBridge";
import "./airport/dutyFreeShop";
import "./airport/dutyFreeRotunda";
import "./airport/escalator";
import "./airport/airliner";
import "./airport/controlTower";
import "./airport/apronVehicle";
import "./airport/apron";
import "./airport/runway";
import "./airport/airportMonument";
import "./airport/palmTree";
import "./airport/curbCanopy";
// Airport visual-fidelity props (2026-06-22).
import "./airport/selfCheckinKiosk";
import "./airport/queueLane";
import "./airport/wayfindingSign";
import "./airport/luggage";
import "./airport/airportGreenery";
import "./airport/floodlightMast";
import "./airport/apronProps";
import "./airport/cubeCloud";
import "./airport/airportExtras";
import "./airport/airportRoad";

// Residential suburb props.
import "./fence";
import "./parkedCar";
import "./mailbox";

/** Call once at startup to guarantee the catalog modules have been evaluated. */
export function registerCatalog(): void { /* imports above run the defineObject calls */ }
