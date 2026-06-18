import { describe, it, expect } from "vitest";
import {
  laneDashes, sidewalkRects, ROAD_W, curbRects, CURB_W,
  isCoreArterial, doubleYellowRects, crosswalkRects,
  sidewalkTilePattern, paverTilePattern, asphaltNoisePattern, PAVER_CELLS, YELLOW_LINE_W,
  hashId, roadIntersections, stopLineRects, STOP_LINE_CLEAR, STOP_LINE_W,
  arrowKindFor, arrowPattern, laneArrows, ARROW_PX,
  hasParkingBays, parkingBayRects,
} from "../src/world/roads";
import { PALETTE } from "../src/world/palette";
import type { RoadDef } from "../src/world/rishonMap";

const hRoad: RoadDef = { id: "h", x: 0, z: 10, length: 40, horizontal: true };
const vRoad: RoadDef = { id: "v", x: -5, z: 0, length: 40, horizontal: false };
const mainH: RoadDef = { id: "main-h", x: 0, z: 0, length: 120, horizontal: true };
const crossV: RoadDef = { id: "cross-v", x: 0, z: 0, length: 120, horizontal: false };

// The two core arterials cross at the origin → exactly one intersection.
const coreNet: RoadDef[] = [mainH, crossV];

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

describe("paverTilePattern", () => {
  const dim = PAVER_CELLS * 16;
  it("produces an opaque RGBA super-tile of cells*cellPx per side", () => {
    const data = paverTilePattern(PAVER_CELLS, 16);
    expect(data.length).toBe(dim * dim * 4);
    for (let i = 3; i < data.length; i += 4) expect(data[i]).toBe(255);
  });
  it("keeps the top-left grout grid (corner texel is grout)", () => {
    const data = paverTilePattern(PAVER_CELLS, 16, 2);
    const groutR = (PALETTE.sidewalkGrout >> 16) & 0xff;
    expect(data[0]).toBe(groutR);
  });
  it("varies paver tone across cells (not one flat slab)", () => {
    const data = paverTilePattern(PAVER_CELLS, 16, 2);
    // sample the center texel of each cell; collect distinct red values.
    const reds = new Set<number>();
    for (let cy = 0; cy < PAVER_CELLS; cy++) {
      for (let cx = 0; cx < PAVER_CELLS; cx++) {
        const x = cx * 16 + 8, y = cy * 16 + 8;
        reds.add(data[(y * dim + x) * 4]);
      }
    }
    expect(reds.size).toBeGreaterThan(1); // tone jitter present
  });
  it("is deterministic", () => {
    expect(Array.from(paverTilePattern(PAVER_CELLS, 16)))
      .toEqual(Array.from(paverTilePattern(PAVER_CELLS, 16)));
  });
});

describe("asphaltNoisePattern", () => {
  it("produces an opaque RGBA tile and is deterministic", () => {
    const a = asphaltNoisePattern(16);
    expect(a.length).toBe(16 * 16 * 4);
    for (let i = 3; i < a.length; i += 4) expect(a[i]).toBe(255);
    expect(Array.from(asphaltNoisePattern(16))).toEqual(Array.from(a));
  });
  it("carries brightness variation across texels (not one flat color)", () => {
    const a = asphaltNoisePattern(16);
    const reds = new Set<number>();
    for (let i = 0; i < a.length; i += 4) reds.add(a[i]);
    expect(reds.size).toBeGreaterThan(1);
  });
});

describe("hashId", () => {
  it("is deterministic and unsigned 32-bit", () => {
    const a = hashId("main-h");
    expect(a).toBe(hashId("main-h"));
    expect(Number.isInteger(a)).toBe(true);
    expect(a).toBeGreaterThanOrEqual(0);
    expect(a).toBeLessThanOrEqual(0xffffffff);
  });
  it("distinguishes different ids", () => {
    expect(hashId("main-h")).not.toBe(hashId("cross-v"));
    expect(hashId("north-rh-0")).not.toBe(hashId("north-rh-1"));
  });
});

describe("roadIntersections", () => {
  it("finds the single core crossing at the origin", () => {
    const it = roadIntersections(coreNet);
    expect(it.length).toBe(1);
    expect(it[0].x).toBeCloseTo(0, 6);
    expect(it[0].z).toBeCloseTo(0, 6);
  });

  it("finds every horizontal/vertical crossing within span and dedups", () => {
    const grid: RoadDef[] = [
      { id: "h0", x: 0, z: -10, length: 40, horizontal: true },
      { id: "h1", x: 0, z: 10, length: 40, horizontal: true },
      { id: "v0", x: -10, z: 0, length: 40, horizontal: false },
      { id: "v1", x: 10, z: 0, length: 40, horizontal: false },
    ];
    const its = roadIntersections(grid);
    expect(its.length).toBe(4); // 2 h x 2 v
    // dedup: duplicate roads at the same spot don't add crossings
    const dup = roadIntersections([...grid, { ...grid[0], id: "h0b" }]);
    expect(dup.length).toBe(4);
  });

  it("ignores roads that do not overlap", () => {
    const far: RoadDef[] = [
      { id: "h", x: 0, z: 0, length: 10, horizontal: true },     // x in [-5,5]
      { id: "v", x: 50, z: 0, length: 10, horizontal: false },   // x = 50, off the road
    ];
    expect(roadIntersections(far)).toEqual([]);
  });

  it("is deterministic", () => {
    expect(roadIntersections(coreNet)).toEqual(roadIntersections(coreNet));
  });
});

describe("stopLineRects", () => {
  const its = roadIntersections(coreNet);

  it("emits two bars (one per side) for a road through one intersection", () => {
    const r = stopLineRects(mainH, its);
    expect(r.length).toBe(2);
  });

  it("places bars just outside the crosswalk on each approach", () => {
    const r = stopLineRects(mainH, its);
    const xs = r.map((s) => s.x).sort((a, b) => a - b);
    expect(xs[0]).toBeCloseTo(-STOP_LINE_CLEAR, 6);
    expect(xs[1]).toBeCloseTo(STOP_LINE_CLEAR, 6);
    expect(STOP_LINE_CLEAR).toBeGreaterThan(ROAD_W / 2);
    // bar is a thin half-width bar across the running lane
    for (const s of r) {
      expect(s.w).toBeCloseTo(STOP_LINE_W, 6);
      expect(s.d).toBeCloseTo(ROAD_W / 2, 6);
    }
  });

  it("orients bars across a vertical core road", () => {
    const r = stopLineRects(crossV, its);
    const zs = r.map((s) => s.z).sort((a, b) => a - b);
    expect(zs[0]).toBeCloseTo(-STOP_LINE_CLEAR, 6);
    expect(zs[1]).toBeCloseTo(STOP_LINE_CLEAR, 6);
    for (const s of r) {
      expect(s.d).toBeCloseTo(STOP_LINE_W, 6);
      expect(s.w).toBeCloseTo(ROAD_W / 2, 6);
    }
  });

  it("emits nothing for a road that misses every intersection", () => {
    expect(stopLineRects(hRoad, its)).toEqual([]); // z=10 ≠ any crossing
  });

  it("is deterministic", () => {
    expect(stopLineRects(mainH, its)).toEqual(stopLineRects(mainH, its));
  });
});

describe("arrowKindFor", () => {
  it("returns a valid arrow kind", () => {
    for (let i = 0; i < 10; i++) {
      expect(["straight", "left", "right"]).toContain(arrowKindFor("main-h", i));
    }
  });
  it("is deterministic per (road, approach)", () => {
    expect(arrowKindFor("main-h", 0)).toBe(arrowKindFor("main-h", 0));
    expect(arrowKindFor("cross-v", 3)).toBe(arrowKindFor("cross-v", 3));
  });
  it("varies across approaches / roads (not all identical)", () => {
    const kinds = new Set<string>();
    for (let i = 0; i < 8; i++) kinds.add(arrowKindFor("main-h", i));
    for (let i = 0; i < 8; i++) kinds.add(arrowKindFor("cross-v", i));
    expect(kinds.size).toBeGreaterThan(1);
  });
});

describe("arrowPattern", () => {
  it("produces RGBA pixels of the requested size", () => {
    const data = arrowPattern("straight", ARROW_PX);
    expect(data.length).toBe(ARROW_PX * ARROW_PX * 4);
  });
  it("paints opaque white ink and leaves transparent background", () => {
    const data = arrowPattern("straight");
    const inkR = (PALETTE.laneLine >> 16) & 0xff;
    let ink = 0, clear = 0;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] === 255) { ink++; expect(data[i]).toBe(inkR); }
      else if (data[i + 3] === 0) clear++;
    }
    expect(ink).toBeGreaterThan(0);
    expect(clear).toBeGreaterThan(0);
  });
  it("turn arrows differ from the straight glyph", () => {
    const s = Array.from(arrowPattern("straight"));
    const l = Array.from(arrowPattern("left"));
    const r = Array.from(arrowPattern("right"));
    expect(l).not.toEqual(s);
    expect(r).not.toEqual(s);
    expect(l).not.toEqual(r); // left/right are mirror-ish, not identical
  });
  it("is deterministic", () => {
    expect(Array.from(arrowPattern("left"))).toEqual(Array.from(arrowPattern("left")));
  });
});

describe("laneArrows", () => {
  const its = roadIntersections(coreNet);

  it("paints arrows on long core roads, one per approach", () => {
    const a = laneArrows(mainH, its);
    expect(a.length).toBe(2); // both approaches to the single junction
    for (const p of a) {
      // arrow sits in a running lane (offset from the centerline by ROAD_W/4)
      expect(Math.abs(p.z - mainH.z)).toBeCloseTo(ROAD_W / 4, 6);
      expect(Math.abs(p.x)).toBeGreaterThan(ROAD_W / 2); // set back from the junction
      expect(["straight", "left", "right"]).toContain(p.kind);
    }
    // one approach on each side of the junction
    expect(a.some((p) => p.x > 0)).toBe(true);
    expect(a.some((p) => p.x < 0)).toBe(true);
  });

  it("gates short roads out (only wider/core roads get arrows)", () => {
    const shortNet: RoadDef[] = [
      { id: "sh", x: 0, z: 0, length: 30, horizontal: true },
      { id: "sv", x: 0, z: 0, length: 30, horizontal: false },
    ];
    const sits = roadIntersections(shortNet);
    expect(laneArrows(shortNet[0], sits)).toEqual([]);
    // but a long road still qualifies
    expect(laneArrows(mainH, its).length).toBeGreaterThan(0);
  });

  it("is deterministic", () => {
    expect(laneArrows(mainH, its)).toEqual(laneArrows(mainH, its));
  });
});

describe("hasParkingBays / parkingBayRects", () => {
  it("never marks the core arterials", () => {
    expect(hasParkingBays(mainH)).toBe(false);
    expect(hasParkingBays(crossV)).toBe(false);
    expect(parkingBayRects(mainH)).toEqual([]);
  });

  it("gates a deterministic subset of non-core roads (hash % 3 === 0)", () => {
    const sample: RoadDef[] = Array.from({ length: 30 }, (_, i) => ({
      id: `north-rh-${i}`, x: 0, z: i, length: 60, horizontal: true,
    }));
    const gated = sample.filter(hasParkingBays);
    expect(gated.length).toBeGreaterThan(0);
    expect(gated.length).toBeLessThan(sample.length); // a subset, not all
    for (const r of sample) expect(hasParkingBays(r)).toBe(hashId(r.id) % 3 === 0);
  });

  it("emits bay rects on both edges of a qualifying road", () => {
    // find a qualifying id deterministically
    const road = { id: "north-rh-0", x: 0, z: 0, length: 60, horizontal: true } as RoadDef;
    if (!hasParkingBays(road)) return; // skip if this id happens not to qualify
    const rects = parkingBayRects(road);
    expect(rects.length).toBeGreaterThan(0);
    const zs = rects.map((b) => b.z);
    expect(zs.some((z) => z > 0)).toBe(true);
    expect(zs.some((z) => z < 0)).toBe(true);
    // all bays sit inside the asphalt, near the curb
    for (const b of rects) expect(Math.abs(b.z)).toBeLessThanOrEqual(ROAD_W / 2 + 1e-6);
  });

  it("is deterministic", () => {
    const road = { id: "east-rv-3", x: 5, z: 0, length: 60, horizontal: false } as RoadDef;
    expect(parkingBayRects(road)).toEqual(parkingBayRects(road));
  });
});
