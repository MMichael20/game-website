import { describe, it, expect } from "vitest";
import {
  laneDashes, sidewalkRects, ROAD_W, curbRects, CURB_W,
  isCoreArterial, doubleYellowRects, crosswalkRects,
  sidewalkTilePattern, YELLOW_LINE_W,
} from "../src/world/roads";
import { PALETTE } from "../src/world/palette";
import type { RoadDef } from "../src/world/rishonMap";

const hRoad: RoadDef = { id: "h", x: 0, z: 10, length: 40, horizontal: true };
const vRoad: RoadDef = { id: "v", x: -5, z: 0, length: 40, horizontal: false };
const mainH: RoadDef = { id: "main-h", x: 0, z: 0, length: 120, horizontal: true };
const crossV: RoadDef = { id: "cross-v", x: 0, z: 0, length: 120, horizontal: false };

describe("laneDashes", () => {
  it("emits evenly spaced dashes along a horizontal road's x axis", () => {
    const d = laneDashes(hRoad);
    expect(d.length).toBeGreaterThan(0);
    for (const p of d) expect(p.z).toBeCloseTo(hRoad.z, 6); // stays on the road centerline
    expect(d.every((p) => p.rotationY === Math.PI / 2)).toBe(true);
  });

  it("emits dashes along a vertical road's z axis", () => {
    const d = laneDashes(vRoad);
    for (const p of d) expect(p.x).toBeCloseTo(vRoad.x, 6);
    expect(d.every((p) => p.rotationY === 0)).toBe(true);
  });

  it("is symmetric about the road center", () => {
    const xs = laneDashes(hRoad).map((p) => p.x);
    const sum = xs.reduce((a, b) => a + b, 0);
    expect(sum / xs.length).toBeCloseTo(hRoad.x, 6);
  });

  it("emits no dashes on the core arterials (they get double-yellow instead)", () => {
    expect(laneDashes(mainH)).toEqual([]);
    expect(laneDashes(crossV)).toEqual([]);
  });
});

describe("sidewalkRects", () => {
  it("flanks a horizontal road on both z sides at half-road + half-sidewalk", () => {
    const r = sidewalkRects(hRoad);
    expect(r.length).toBe(2);
    const offs = r.map((s) => s.z - hRoad.z).sort((a, b) => a - b);
    expect(offs[0]).toBeCloseTo(-offs[1], 6);
    expect(Math.abs(offs[0])).toBeGreaterThan(ROAD_W / 2);
    for (const s of r) expect(s.w).toBeCloseTo(hRoad.length, 6);
  });

  it("flanks a vertical road on both x sides", () => {
    const r = sidewalkRects(vRoad);
    const offs = r.map((s) => s.x - vRoad.x).sort((a, b) => a - b);
    expect(offs[0]).toBeCloseTo(-offs[1], 6);
    for (const s of r) expect(s.d).toBeCloseTo(vRoad.length, 6);
  });
});

describe("curbRects", () => {
  it("runs a thin strip just outside each asphalt edge of a horizontal road", () => {
    const r = curbRects(hRoad);
    expect(r.length).toBe(2);
    const offs = r.map((c) => c.z - hRoad.z).sort((a, b) => a - b);
    expect(offs[0]).toBeCloseTo(-offs[1], 6);
    expect(Math.abs(offs[0])).toBeGreaterThan(ROAD_W / 2);
    for (const c of r) {
      expect(c.w).toBeCloseTo(hRoad.length, 6); // spans the road length
      expect(c.d).toBeCloseTo(CURB_W, 6);       // thin across
    }
  });
  it("runs along x for a vertical road", () => {
    const r = curbRects(vRoad);
    const offs = r.map((c) => c.x - vRoad.x).sort((a, b) => a - b);
    expect(offs[0]).toBeCloseTo(-offs[1], 6);
    for (const c of r) expect(c.d).toBeCloseTo(vRoad.length, 6);
  });
});

describe("isCoreArterial", () => {
  it("is true only for the two named core roads", () => {
    expect(isCoreArterial(mainH)).toBe(true);
    expect(isCoreArterial(crossV)).toBe(true);
    expect(isCoreArterial(hRoad)).toBe(false);
    expect(isCoreArterial(vRoad)).toBe(false);
  });
});

describe("doubleYellowRects", () => {
  it("returns two thin stripes only for the core arterials", () => {
    expect(doubleYellowRects(hRoad)).toEqual([]);
    expect(doubleYellowRects(vRoad)).toEqual([]);
    expect(doubleYellowRects(mainH).length).toBe(2);
    expect(doubleYellowRects(crossV).length).toBe(2);
  });

  it("straddles the centerline of a horizontal core road, spanning its length", () => {
    const r = doubleYellowRects(mainH);
    const offs = r.map((y) => y.z - mainH.z).sort((a, b) => a - b);
    expect(offs[0]).toBeCloseTo(-offs[1], 6); // symmetric about the centerline
    expect(offs[0]).toBeLessThan(0);
    for (const y of r) {
      expect(y.w).toBeCloseTo(mainH.length, 6); // runs the full length
      expect(y.d).toBeCloseTo(YELLOW_LINE_W, 6); // thin across
    }
  });

  it("straddles along x and runs the length for a vertical core road", () => {
    const r = doubleYellowRects(crossV);
    const offs = r.map((y) => y.x - crossV.x).sort((a, b) => a - b);
    expect(offs[0]).toBeCloseTo(-offs[1], 6);
    for (const y of r) {
      expect(y.d).toBeCloseTo(crossV.length, 6);
      expect(y.w).toBeCloseTo(YELLOW_LINE_W, 6);
    }
  });

  it("is deterministic", () => {
    expect(doubleYellowRects(mainH)).toEqual(doubleYellowRects(mainH));
  });
});

describe("crosswalkRects", () => {
  it("returns bands only for the core arterials at the intersection", () => {
    expect(crosswalkRects(hRoad)).toEqual([]);
    expect(crosswalkRects(vRoad)).toEqual([]);
    expect(crosswalkRects(mainH).length).toBeGreaterThan(0);
  });

  it("emits the same count on both core roads and is deterministic", () => {
    const a = crosswalkRects(mainH);
    const b = crosswalkRects(crossV);
    expect(a.length).toBe(b.length);
    expect(crosswalkRects(mainH)).toEqual(a); // stable across calls
  });

  it("places bands symmetrically on both approaches, each spanning the road width", () => {
    const r = crosswalkRects(mainH);
    // horizontal road → bands march along x, span full width along z (d == ROAD_W)
    for (const c of r) {
      expect(c.d).toBeCloseTo(ROAD_W, 6);
      expect(c.z).toBeCloseTo(mainH.z, 6); // centered on the road
    }
    const xs = r.map((c) => c.x - mainH.x);
    expect(xs.some((x) => x > 0)).toBe(true);
    expect(xs.some((x) => x < 0)).toBe(true);
    // symmetric: sum of offsets cancels
    expect(xs.reduce((s, x) => s + x, 0)).toBeCloseTo(0, 6);
    // bands clear the intersection square (|offset| beyond the crossing half-width)
    for (const x of xs) expect(Math.abs(x)).toBeGreaterThan(ROAD_W / 2);
  });

  it("orients bands across the road for a vertical core road", () => {
    const r = crosswalkRects(crossV);
    for (const c of r) {
      expect(c.w).toBeCloseTo(ROAD_W, 6); // span full width along x
      expect(c.x).toBeCloseTo(crossV.x, 6);
    }
  });
});

describe("sidewalkTilePattern", () => {
  it("produces RGBA pixels for the requested tile size", () => {
    const px = 16;
    const data = sidewalkTilePattern(px);
    expect(data.length).toBe(px * px * 4);
    for (let i = 3; i < data.length; i += 4) expect(data[i]).toBe(255); // opaque
  });

  it("contains both slab and grout pixels", () => {
    const data = sidewalkTilePattern(16, 2);
    const slabR = (PALETTE.sidewalk >> 16) & 0xff;
    const groutR = (PALETTE.sidewalkGrout >> 16) & 0xff;
    let slab = 0, grout = 0;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i] === slabR) slab++;
      else if (data[i] === groutR) grout++;
    }
    expect(slab).toBeGreaterThan(0);
    expect(grout).toBeGreaterThan(0);
    // slab body dominates; grout is just the edge lines
    expect(slab).toBeGreaterThan(grout);
  });

  it("draws grout along the top and left edges so a tiled grid stays seamless", () => {
    const px = 16, grout = 2;
    const data = sidewalkTilePattern(px, grout);
    const groutR = (PALETTE.sidewalkGrout >> 16) & 0xff;
    // top-left corner texel is grout
    expect(data[0]).toBe(groutR);
    // an interior texel (well away from the two grout edges) is slab
    const cx = px - 1, cy = px - 1; // bottom-right corner, far from x<grout / y<grout
    const o = (cy * px + cx) * 4;
    expect(data[o]).toBe((PALETTE.sidewalk >> 16) & 0xff);
  });

  it("is deterministic (same args → identical bytes)", () => {
    expect(Array.from(sidewalkTilePattern(16, 2)))
      .toEqual(Array.from(sidewalkTilePattern(16, 2)));
  });
});
