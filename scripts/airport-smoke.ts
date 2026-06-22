// Headless smoke test: build every airport placement and report which one throws.
// Stubs the 2D canvas the text/board builders use (no DOM in Node). NOT a game run.
const ctxStub: any = new Proxy(
  { measureText: (t: string) => ({ width: (t?.length ?? 0) * 8 }) },
  {
    get(target, prop) {
      if (prop in target) return (target as any)[prop];
      return () => undefined; // any drawing call is a no-op
    },
    set() { return true; },
  },
);
const canvasStub: any = { width: 256, height: 256, getContext: () => ctxStub, style: {} };
(globalThis as any).document = { createElement: () => canvasStub };

import { registerCatalog } from "../src/world/catalog";
import { buildObject } from "../src/world/system/registry";
import { applyTransform } from "../src/world/system/transform";
import type { Placement } from "../src/world/system/types";
import { AIRPORT } from "../src/world/airportMap";
import { MAP } from "../src/world/map";

registerCatalog();

let failures = 0;
function check(label: string, placements: Placement[]): void {
  placements.forEach((p, i) => {
    try {
      const built = buildObject(p.kind, p.params);
      applyTransform(built, { x: p.x ?? 0, z: p.z ?? 0, rot: p.rot ?? 0 });
    } catch (e) {
      failures++;
      console.error(`THROW [${label}] @${i} kind="${p.kind}" params=${JSON.stringify(p.params)}:`, (e as Error).message);
      console.error((e as Error).stack?.split("\n").slice(0, 4).join("\n"));
    }
  });
}
check("airport", AIRPORT.map);
check("city", MAP);
console.log(failures === 0 ? "ALL OK" : `${failures} placement(s) threw`);
