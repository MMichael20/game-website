// src/game/rendering/BudapestWorldProps.ts
// Procedural generator for Budapest world props — Phase 1 of the pixel-art
// refactor. Replaces the ~55 programmer-art primitives (add.rectangle /
// add.circle used as trees, houses, rails, shelters, landmarks) with
// pre-rendered pixel-art textures registered during BootScene.
//
// Invariants (see design spec §3):
//  - Per-asset failure isolation: each sub-generator has its own
//    `const c = ...; if (!c) return;` guard. Siblings run independently.
//  - All procedural variation uses seededRandom(…) — never Math.random() —
//    so boot reproduces the same artwork.
//  - Scrolling strip assets (road, rails, wire, danube) are tile-friendly:
//    the first pixel column must read consistently against wrap-around.
//  - Palette co-located here, NOT split out to palette.ts (design §5.2).
//
// Key typing: scenes import BP_PROP_KEYS and address textures through
// semantic names. Typos become tsc errors rather than runtime green boxes.

import { px, rect, circle, darken, lighten, seededRandom, Ctx } from './pixelHelpers';

// ══════════════════════════════════════════════════════════════════════════
// Palette (co-located per design §5.2)
// ══════════════════════════════════════════════════════════════════════════

export const BP_WORLD_PROPS_PALETTE = {
  // Sky / atmosphere
  nightSky:     '#1a2238',
  duskSky:      '#5a6a8a',
  daySky:       '#a8c4d8',

  // Stucco / masonry / stone
  creamWarm:    '#E8CFA8',
  creamLight:   '#F2DEBE',
  creamShadow:  '#C4A888',
  stone:        '#B0A89A',
  stoneLight:   '#C8C0B2',
  stoneShadow:  '#807A6E',

  // Roof / tile
  tileRed:      '#A85534',
  tileRedDark:  '#7A3A22',

  // Road / asphalt
  asphaltDark:  '#3E3E46',
  asphaltMid:   '#4A4A52',
  asphaltLight: '#585862',
  yellowRail:   '#C8B020',
  yellowRailHi: '#E6CE3C',

  // Iron / metal
  ironDark:     '#2A2A32',
  ironMid:      '#484850',
  ironLight:    '#6E6E78',

  // Rail / ties
  railSteel:    '#7A7A82',
  railSteelHi:  '#A2A2A8',
  tieBrown:     '#5A3F28',
  tieBrownDark: '#3E2C1C',

  // Tree
  treeTrunk:    '#5A3A1A',
  treeTrunkHi:  '#7A5230',
  treeCanopy:   '#3A8A2A',
  treeCanopyMid:'#4FA038',
  treeCanopyHi: '#6AB450',
  treeShadow:   '#2A5E1E',

  // BKV yellow
  bkvYellow:    '#F2C024',
  bkvYellowHi:  '#F6D860',
  bkvBlack:     '#1A1A20',

  // Tram — CAF Urbos yellow body
  tramYellow:   '#E8B418',
  tramYellowHi: '#F7D43C',
  tramYellowSh: '#A8820C',
  tramRedAccent:'#C83830',
  tramWindow:   '#7CBFD6',
  tramWindowHi: '#A8DEED',

  // Water / river
  danubeDeep:   '#1F4A68',
  danubeMid:    '#2F6A86',
  danubeLight:  '#4D8AA4',
  danubeHi:     '#7BB0C4',

  // Pest facade colors
  pestWarmPink: '#D7A69A',
  pestOchre:    '#C89466',
  pestCream:    '#D9C4A0',
  pestWindow:   '#F0D890',
  pestShutterGreen: '#4E7A52',
  pestAwningRed:'#A62E24',
} as const;

const P = BP_WORLD_PROPS_PALETTE;

// ══════════════════════════════════════════════════════════════════════════
// Typed key constants — single source of truth, imported by scenes
// ══════════════════════════════════════════════════════════════════════════

export const BP_PROP_KEYS = {
  roadSurface:          'bp-road-surface',
  roadDash:             'bp-road-dash',
  streetTree:           'bp-street-tree',
  countrysideHouse:     'bp-countryside-house',
  bridgeRailingPost:    'bp-bridge-railing-post',
  arrivalBuilding:      'bp-arrival-building',
  tramShelter:          'bp-tram-shelter',
  tramSignPole:         'bp-tram-sign-pole',
  tramRailNear:         'bp-tram-rail-near',
  tramRailFar:          'bp-tram-rail-far',
  tramWire:             'bp-tram-wire',
  tramSide:             'bp-tram-side',
  tramDepartureBoard:   'bp-tram-departure-board',
  landmarkParliament:   'bp-tram-landmark-parliament',
  landmarkBasilica:     'bp-tram-landmark-basilica',
  tramDanubeStrip:      'bp-tram-danube-strip',
} as const;

// ══════════════════════════════════════════════════════════════════════════
// Per-asset seeds — reproducible procedural variation
// ══════════════════════════════════════════════════════════════════════════

const SEED = {
  roadSurface:       8101,
  roadDash:          8102,
  streetTree:        8103,
  countrysideHouse:  8104,
  bridgeRailingPost: 8105,
  arrivalBuilding:   8106,
  tramShelter:       8107,
  tramSignPole:      8108,
  tramRailNear:      8109,
  tramRailFar:       8110,
  tramWire:          8111,
  tramSide:          8112,
  tramDepartureBoard:8113,
  landmarkParliament:8114,
  landmarkBasilica:  8115,
  tramDanubeStrip:   8116,
} as const;

// ══════════════════════════════════════════════════════════════════════════
// Sub-generators — each independent, each `if (!c) return`
// ══════════════════════════════════════════════════════════════════════════

// 1. Road surface — 256×96 tile-friendly asphalt
function generateRoadSurface(scene: Phaser.Scene): void {
  const c = scene.textures.createCanvas(BP_PROP_KEYS.roadSurface, 256, 96);
  if (!c) return;
  const ctx = c.context;
  const rng = seededRandom(SEED.roadSurface);

  // Base asphalt fill
  rect(ctx, 0, 0, 256, 96, P.asphaltMid);

  // Horizontal band shading: top darker (sun-baked), bottom lighter (worn)
  rect(ctx, 0, 0,  256, 2, darken(P.asphaltMid, 0.05));
  rect(ctx, 0, 94, 256, 2, lighten(P.asphaltMid, 0.03));

  // Subtle 4px dithering. Alternate columns on even rows keeps seams clean.
  // Use x % 256 so wrap-around matches (first column = last column + 1).
  for (let y = 0; y < 96; y += 2) {
    for (let x = 0; x < 256; x += 4) {
      const ox = ((y / 2) % 2 === 0) ? 0 : 2;
      if (rng() < 0.35) {
        px(ctx, (x + ox) % 256, y, darken(P.asphaltMid, 0.08));
      }
      if (rng() < 0.25) {
        px(ctx, (x + ox + 1) % 256, y + 1, P.asphaltLight);
      }
    }
  }

  // Scattered grit — seeded so edge columns repeat identically on tile wrap
  for (let i = 0; i < 380; i++) {
    const x = Math.floor(rng() * 256);
    const y = Math.floor(rng() * 96);
    const r = rng();
    if (r < 0.45)      px(ctx, x, y, P.asphaltDark);
    else if (r < 0.75) px(ctx, x, y, P.asphaltLight);
    else               px(ctx, x, y, darken(P.asphaltMid, 0.12));
  }

  // Hairline crack wisps — confined to mid-band, never crossing edges
  for (let i = 0; i < 6; i++) {
    const sx = 20 + Math.floor(rng() * 216);
    const sy = 20 + Math.floor(rng() * 56);
    const len = 3 + Math.floor(rng() * 4);
    for (let j = 0; j < len; j++) {
      px(ctx, sx + j, sy + (j % 2), darken(P.asphaltMid, 0.2));
    }
  }

  c.refresh();
}

// 2. Road dash — 64×8 yellow center-line segment
function generateRoadDash(scene: Phaser.Scene): void {
  const c = scene.textures.createCanvas(BP_PROP_KEYS.roadDash, 64, 8);
  if (!c) return;
  const ctx = c.context;

  // Primary yellow fill
  rect(ctx, 0, 2, 64, 4, P.yellowRail);
  // Highlight along top edge
  rect(ctx, 0, 2, 64, 1, P.yellowRailHi);
  // Soft shadow along bottom edge
  rect(ctx, 0, 5, 64, 1, darken(P.yellowRail, 0.25));

  // 1px tapered ends for paint-stroke feel
  px(ctx, 0, 2, darken(P.yellowRail, 0.25));
  px(ctx, 0, 5, darken(P.yellowRail, 0.4));
  px(ctx, 63, 2, darken(P.yellowRail, 0.25));
  px(ctx, 63, 5, darken(P.yellowRail, 0.4));

  c.refresh();
}

// 3. Street tree — 48×88 plane tree with dithered canopy
function generateStreetTree(scene: Phaser.Scene): void {
  const c = scene.textures.createCanvas(BP_PROP_KEYS.streetTree, 48, 88);
  if (!c) return;
  const ctx = c.context;
  const rng = seededRandom(SEED.streetTree);

  // Ground shadow stub — elliptical blob at base
  rect(ctx, 18, 85, 12, 3, 'rgba(0,0,0,0.28)');
  rect(ctx, 16, 86, 16, 2, 'rgba(0,0,0,0.18)');

  // Trunk — ~6px wide, centered, slight taper
  const trunkX = 21;
  rect(ctx, trunkX, 46, 6, 40, P.treeTrunk);
  // Trunk highlight on left edge
  rect(ctx, trunkX, 46, 1, 40, P.treeTrunkHi);
  // Trunk shadow on right edge
  rect(ctx, trunkX + 5, 46, 1, 40, darken(P.treeTrunk, 0.3));
  // Bark ticks for texture
  for (let i = 0; i < 8; i++) {
    const ty = 48 + Math.floor(rng() * 36);
    px(ctx, trunkX + 1 + Math.floor(rng() * 4), ty, darken(P.treeTrunk, 0.25));
  }

  // Canopy: 3-tone dithering, slight asymmetry — leans right by 2px
  const cx = 24;
  const cy = 28;
  const rMain = 20;

  // Dark underside / shadow base
  circle(ctx, cx + 1, cy + 4, rMain - 2, P.treeShadow);
  // Mid-tone core, offset left for asymmetry
  circle(ctx, cx - 1, cy + 1, rMain - 3, P.treeCanopy);
  // Brighter mid-layer
  circle(ctx, cx, cy - 1, rMain - 6, P.treeCanopyMid);
  // Highlight splotch, upper-left (sun from left)
  circle(ctx, cx - 4, cy - 5, rMain - 11, P.treeCanopyHi);

  // Dithered speckle — 2-tone scatter within canopy radius for pixel-art feel
  for (let i = 0; i < 120; i++) {
    const dx = Math.floor((rng() - 0.5) * rMain * 2);
    const dy = Math.floor((rng() - 0.5) * rMain * 2);
    if (dx * dx + dy * dy > (rMain - 1) * (rMain - 1)) continue;
    const r = rng();
    const tone =
      r < 0.35 ? P.treeShadow :
      r < 0.70 ? P.treeCanopy :
      r < 0.90 ? P.treeCanopyMid :
                 P.treeCanopyHi;
    px(ctx, cx + dx, cy + dy, tone);
  }

  // A few outer-edge leaf nubs for organic silhouette
  for (let i = 0; i < 10; i++) {
    const ang = rng() * Math.PI * 2;
    const rOut = rMain - 1 + Math.floor(rng() * 3);
    const ex = cx + Math.round(Math.cos(ang) * rOut);
    const ey = cy + Math.round(Math.sin(ang) * rOut);
    if (ex >= 0 && ex < 48 && ey >= 0 && ey < 48) {
      px(ctx, ex, ey, P.treeCanopy);
    }
  }

  c.refresh();
}

// 4. Countryside house — 96×80 stucco + red-tile roof
function generateCountrysideHouse(scene: Phaser.Scene): void {
  const c = scene.textures.createCanvas(BP_PROP_KEYS.countrysideHouse, 96, 80);
  if (!c) return;
  const ctx = c.context;
  const rng = seededRandom(SEED.countrysideHouse);

  // Ground-contact shadow
  rect(ctx, 14, 77, 68, 3, 'rgba(0,0,0,0.22)');

  // Body / stucco wall
  const bodyX = 14;
  const bodyY = 30;
  const bodyW = 68;
  const bodyH = 48;
  rect(ctx, bodyX, bodyY, bodyW, bodyH, P.creamWarm);
  // Top edge highlight
  rect(ctx, bodyX, bodyY, bodyW, 1, P.creamLight);
  // Left edge sunlit
  rect(ctx, bodyX, bodyY, 1, bodyH, P.creamLight);
  // Right edge shade
  rect(ctx, bodyX + bodyW - 1, bodyY, 1, bodyH, P.creamShadow);
  // Bottom edge grounding
  rect(ctx, bodyX, bodyY + bodyH - 2, bodyW, 2, P.creamShadow);

  // Stucco dithering — scattered warm/cool pixels
  for (let i = 0; i < 80; i++) {
    const x = bodyX + 1 + Math.floor(rng() * (bodyW - 2));
    const y = bodyY + 1 + Math.floor(rng() * (bodyH - 3));
    px(ctx, x, y, rng() > 0.5 ? P.creamLight : P.creamShadow);
  }

  // Pitched roof — red clay, triangle via horizontal rows
  const roofTopY = 10;
  const roofBaseY = 32;
  const roofBaseW = bodyW + 6;
  const roofBaseX = bodyX - 3;
  for (let y = roofTopY; y <= roofBaseY; y++) {
    const prog = (y - roofTopY) / (roofBaseY - roofTopY);
    const rowW = Math.round(prog * roofBaseW);
    const rowX = roofBaseX + Math.round((roofBaseW - rowW) / 2);
    const color = y < roofTopY + 3 ? P.tileRedDark : P.tileRed;
    rect(ctx, rowX, y, rowW, 1, color);
  }
  // Roof tile striping (horizontal darker rows every 4px)
  for (let y = roofTopY + 4; y <= roofBaseY; y += 4) {
    const prog = (y - roofTopY) / (roofBaseY - roofTopY);
    const rowW = Math.round(prog * roofBaseW);
    const rowX = roofBaseX + Math.round((roofBaseW - rowW) / 2);
    rect(ctx, rowX, y, rowW, 1, P.tileRedDark);
  }
  // Roof eave shadow on body top
  rect(ctx, bodyX, bodyY, bodyW, 1, P.tileRedDark);

  // Chimney — 6×10 block on right side of roof
  const chX = 62;
  const chY = 14;
  rect(ctx, chX, chY, 6, 12, P.tileRedDark);
  rect(ctx, chX, chY, 6, 1, darken(P.tileRedDark, 0.3));
  rect(ctx, chX, chY, 1, 12, lighten(P.tileRedDark, 0.15));
  // Chimney puff — 1px wisp
  px(ctx, chX + 3, chY - 2, '#D8D0C2');
  px(ctx, chX + 4, chY - 3, '#E4DEC8');
  px(ctx, chX + 3, chY - 4, '#ECE6D2');

  // Window with shutters — centered lower-left
  const winX = 26;
  const winY = 46;
  const winW = 14;
  const winH = 16;
  // Window frame
  rect(ctx, winX - 1, winY - 1, winW + 2, winH + 2, P.tileRedDark);
  // Glass pane
  rect(ctx, winX, winY, winW, winH, P.pestWindow);
  // Cross mullions
  rect(ctx, winX + winW / 2 - 1, winY, 1, winH, P.creamShadow);
  rect(ctx, winX, winY + winH / 2 - 1, winW, 1, P.creamShadow);
  // Shutters — green, on either side
  rect(ctx, winX - 5, winY - 1, 4, winH + 2, P.pestShutterGreen);
  rect(ctx, winX - 5, winY - 1, 1, winH + 2, darken(P.pestShutterGreen, 0.3));
  rect(ctx, winX + winW + 1, winY - 1, 4, winH + 2, P.pestShutterGreen);
  rect(ctx, winX + winW + 4, winY - 1, 1, winH + 2, darken(P.pestShutterGreen, 0.3));
  // Shutter slats
  for (let y = winY; y < winY + winH; y += 3) {
    rect(ctx, winX - 5, y, 4, 1, darken(P.pestShutterGreen, 0.2));
    rect(ctx, winX + winW + 1, y, 4, 1, darken(P.pestShutterGreen, 0.2));
  }

  // Door — small cream-dark rectangle on right side
  rect(ctx, 54, 58, 10, 20, '#6A4B30');
  rect(ctx, 54, 58, 10, 1, darken('#6A4B30', 0.3));
  rect(ctx, 54, 58, 1, 20, lighten('#6A4B30', 0.15));
  px(ctx, 62, 68, P.bkvYellow); // door knob

  c.refresh();
}

// 5. Bridge railing post — 16×48 iron post with riveted cap
function generateBridgeRailingPost(scene: Phaser.Scene): void {
  const c = scene.textures.createCanvas(BP_PROP_KEYS.bridgeRailingPost, 16, 48);
  if (!c) return;
  const ctx = c.context;

  // Base — wide footing
  rect(ctx, 3, 44, 10, 4, P.ironDark);
  rect(ctx, 3, 44, 10, 1, P.ironMid);

  // Main shaft — 4px wide, centered
  rect(ctx, 6, 8, 4, 36, P.ironMid);
  // Left edge sunlit
  rect(ctx, 6, 8, 1, 36, P.ironLight);
  // Right edge dark
  rect(ctx, 9, 8, 1, 36, P.ironDark);

  // Cap — wider riveted top
  rect(ctx, 4, 4, 8, 4, P.ironDark);
  rect(ctx, 4, 4, 8, 1, P.ironLight);
  // Rivets on cap
  px(ctx, 5, 6, P.ironLight);
  px(ctx, 10, 6, P.ironLight);

  // Decorative ball finial
  rect(ctx, 6, 1, 4, 3, P.ironMid);
  rect(ctx, 7, 0, 2, 1, P.ironMid);
  px(ctx, 7, 1, P.ironLight);

  // Mid-shaft decorative ring
  rect(ctx, 5, 22, 6, 2, P.ironDark);
  rect(ctx, 5, 22, 6, 1, P.ironLight);

  c.refresh();
}

// 6. Arrival building — 96×120 Pest tenement, 3 stories
function generateArrivalBuilding(scene: Phaser.Scene): void {
  const c = scene.textures.createCanvas(BP_PROP_KEYS.arrivalBuilding, 96, 120);
  if (!c) return;
  const ctx = c.context;
  const rng = seededRandom(SEED.arrivalBuilding);

  // Ground contact shadow
  rect(ctx, 6, 117, 84, 3, 'rgba(0,0,0,0.25)');

  // Facade body
  const fx = 6;
  const fy = 8;
  const fw = 84;
  const fh = 108;
  rect(ctx, fx, fy, fw, fh, P.pestOchre);
  // Left sunlit edge
  rect(ctx, fx, fy, 1, fh, lighten(P.pestOchre, 0.15));
  // Right shade edge
  rect(ctx, fx + fw - 2, fy, 2, fh, darken(P.pestOchre, 0.2));
  // Top cornice
  rect(ctx, fx - 1, fy - 2, fw + 2, 2, P.creamShadow);
  rect(ctx, fx - 1, fy - 3, fw + 2, 1, P.creamLight);

  // Stucco texture dither
  for (let i = 0; i < 120; i++) {
    const x = fx + 1 + Math.floor(rng() * (fw - 2));
    const y = fy + 1 + Math.floor(rng() * (fh - 2));
    px(ctx, x, y, rng() > 0.5 ? lighten(P.pestOchre, 0.08) : darken(P.pestOchre, 0.08));
  }

  // Window rows: 3 floors × 4 windows each; ornate arched tops
  const winCols = 4;
  const winRows = 3;
  const winW = 12;
  const winH = 20;
  const gapX = (fw - winCols * winW) / (winCols + 1);
  const floorStartY = fy + 10;
  const floorGap = 28;

  for (let row = 0; row < winRows; row++) {
    const wy = floorStartY + row * floorGap;
    // Horizontal floor band
    rect(ctx, fx, wy + winH + 2, fw, 1, darken(P.pestOchre, 0.22));
    rect(ctx, fx, wy + winH + 3, fw, 1, lighten(P.pestOchre, 0.1));

    for (let col = 0; col < winCols; col++) {
      const wx = fx + Math.round(gapX * (col + 1) + col * winW);
      // Ornate sill below
      rect(ctx, wx - 1, wy + winH, winW + 2, 1, P.creamLight);
      rect(ctx, wx - 2, wy + winH + 1, winW + 4, 1, P.creamShadow);
      // Lintel above (arched effect via 1px step)
      rect(ctx, wx - 1, wy - 1, winW + 2, 1, P.creamLight);
      rect(ctx, wx, wy - 2, winW, 1, P.creamLight);
      // Window frame
      rect(ctx, wx, wy, winW, winH, P.bkvBlack);
      // Glass
      rect(ctx, wx + 1, wy + 1, winW - 2, winH - 2, P.tramWindow);
      // Mullion cross
      rect(ctx, wx + winW / 2 - 1, wy + 1, 1, winH - 2, P.bkvBlack);
      rect(ctx, wx + 1, wy + winH / 2 - 1, winW - 2, 1, P.bkvBlack);
      // Glass shine
      px(ctx, wx + 2, wy + 2, P.tramWindowHi);
      px(ctx, wx + 3, wy + 2, P.tramWindowHi);
    }
  }

  // Ground-floor shop awning — horizontal striped red
  const awY = fy + fh - 18;
  rect(ctx, fx + 4, awY, fw - 8, 8, P.pestAwningRed);
  rect(ctx, fx + 4, awY, fw - 8, 1, lighten(P.pestAwningRed, 0.2));
  for (let sx = fx + 4; sx < fx + fw - 8; sx += 6) {
    rect(ctx, sx, awY, 3, 8, darken(P.pestAwningRed, 0.15));
  }
  // Awning scallop underside
  for (let sx = fx + 4; sx < fx + fw - 4; sx += 8) {
    rect(ctx, sx, awY + 8, 4, 2, P.pestAwningRed);
    rect(ctx, sx + 1, awY + 10, 2, 1, darken(P.pestAwningRed, 0.25));
  }

  // Shop doorway
  rect(ctx, fx + fw / 2 - 8, fy + fh - 10, 16, 10, P.bkvBlack);
  rect(ctx, fx + fw / 2 - 7, fy + fh - 9, 14, 8, darken(P.ironMid, 0.2));

  c.refresh();
}

// 7. Tram shelter — 120×64 glass panel with iron pillars
function generateTramShelter(scene: Phaser.Scene): void {
  const c = scene.textures.createCanvas(BP_PROP_KEYS.tramShelter, 120, 64);
  if (!c) return;
  const ctx = c.context;

  // Ground shadow
  rect(ctx, 6, 61, 108, 3, 'rgba(0,0,0,0.22)');

  // Sloped roof — slight left-to-right slope
  for (let x = 0; x < 120; x++) {
    const yTop = 2 + Math.floor(x / 40);
    rect(ctx, x, yTop, 1, 6, P.ironDark);
    px(ctx, x, yTop, P.ironMid);
  }
  // Roof facia underline
  rect(ctx, 0, 8, 120, 2, P.ironMid);
  rect(ctx, 0, 10, 120, 1, darken(P.ironMid, 0.3));

  // Iron pillars — left and right
  rect(ctx, 4, 10, 4, 48, P.ironMid);
  rect(ctx, 4, 10, 1, 48, P.ironLight);
  rect(ctx, 7, 10, 1, 48, P.ironDark);
  rect(ctx, 112, 10, 4, 48, P.ironMid);
  rect(ctx, 112, 10, 1, 48, P.ironLight);
  rect(ctx, 115, 10, 1, 48, P.ironDark);

  // Pillar base plates
  rect(ctx, 2, 57, 8, 4, P.ironDark);
  rect(ctx, 110, 57, 8, 4, P.ironDark);

  // Back glass panel — translucent effect via cool blue tint
  rect(ctx, 8, 14, 104, 38, darken(P.tramWindow, 0.15));
  // Glass tint dither
  for (let y = 14; y < 52; y += 2) {
    for (let x = 8; x < 112; x += 4) {
      px(ctx, x + (y % 4 === 0 ? 0 : 2), y, P.tramWindow);
    }
  }
  // Horizontal glass pane divider
  rect(ctx, 8, 32, 104, 1, P.ironMid);
  // Vertical mullions at thirds
  rect(ctx, 43, 14, 1, 38, P.ironMid);
  rect(ctx, 78, 14, 1, 38, P.ironMid);
  // Top-left corner highlight
  rect(ctx, 8, 14, 20, 1, P.tramWindowHi);
  rect(ctx, 8, 14, 1, 10, P.tramWindowHi);

  // Bench silhouette — centered at bottom
  rect(ctx, 24, 46, 72, 6, P.treeTrunk);
  rect(ctx, 24, 46, 72, 1, P.treeTrunkHi);
  rect(ctx, 24, 51, 72, 1, darken(P.treeTrunk, 0.3));
  // Bench legs
  rect(ctx, 28, 52, 3, 8, P.ironMid);
  rect(ctx, 89, 52, 3, 8, P.ironMid);

  c.refresh();
}

// 8. Tram sign pole — 16×72 BKV yellow circular sign
function generateTramSignPole(scene: Phaser.Scene): void {
  const c = scene.textures.createCanvas(BP_PROP_KEYS.tramSignPole, 16, 72);
  if (!c) return;
  const ctx = c.context;

  // Ground shadow
  rect(ctx, 6, 69, 4, 3, 'rgba(0,0,0,0.3)');

  // Pole — thin iron, centered
  rect(ctx, 7, 20, 2, 50, P.ironMid);
  rect(ctx, 7, 20, 1, 50, P.ironLight);
  rect(ctx, 8, 20, 1, 50, P.ironDark);

  // Pole base flange
  rect(ctx, 5, 68, 6, 2, P.ironDark);

  // Sign — circular yellow BKV disk (14px diameter, centered)
  const cx = 8;
  const cy = 12;
  circle(ctx, cx, cy, 7, P.bkvBlack); // black outline ring
  circle(ctx, cx, cy, 6, P.bkvYellow);
  // Inner highlight crescent
  for (let dy = -5; dy <= 5; dy++) {
    for (let dx = -5; dx <= 5; dx++) {
      if (dx * dx + dy * dy <= 25 && dy < 0 && dx < 0) {
        if ((dx + dy) % 2 === 0) px(ctx, cx + dx, cy + dy, P.bkvYellowHi);
      }
    }
  }

  // "H" lettering centered on sign (tram stop icon — compact 3×5)
  rect(ctx, cx - 2, cy - 2, 1, 5, P.bkvBlack);
  rect(ctx, cx + 1, cy - 2, 1, 5, P.bkvBlack);
  rect(ctx, cx - 2, cy, 4, 1, P.bkvBlack);

  // Mounting bracket — short horizontal arm joining sign to pole
  rect(ctx, 7, 18, 2, 2, P.ironDark);

  c.refresh();
}

// 9. Tram rail near — 256×12 near rail with ties, tile-friendly
function generateTramRailNear(scene: Phaser.Scene): void {
  const c = scene.textures.createCanvas(BP_PROP_KEYS.tramRailNear, 256, 12);
  if (!c) return;
  const ctx = c.context;

  // Ballast / background gravel band
  rect(ctx, 0, 0, 256, 12, darken(P.stone, 0.2));
  // Gravel dither — seeded, tileable on 16px cadence
  const rng = seededRandom(SEED.tramRailNear);
  for (let i = 0; i < 200; i++) {
    const x = Math.floor(rng() * 256);
    const y = Math.floor(rng() * 12);
    px(ctx, x, y, rng() > 0.5 ? P.stone : darken(P.stone, 0.35));
  }

  // Wooden ties — every 16px, 4×10 rect
  for (let x = 0; x < 256; x += 16) {
    rect(ctx, x, 1, 4, 10, P.tieBrown);
    rect(ctx, x, 1, 4, 1, lighten(P.tieBrown, 0.12));
    rect(ctx, x, 10, 4, 1, P.tieBrownDark);
    // Nail dots
    px(ctx, x + 1, 3, P.ironDark);
    px(ctx, x + 1, 8, P.ironDark);
  }

  // Steel rails — two horizontal bands
  rect(ctx, 0, 3, 256, 2, P.railSteel);
  rect(ctx, 0, 3, 256, 1, P.railSteelHi);
  rect(ctx, 0, 8, 256, 2, P.railSteel);
  rect(ctx, 0, 8, 256, 1, P.railSteelHi);

  c.refresh();
}

// 10. Tram rail far — 256×6 compressed-perspective far rail, tile-friendly
function generateTramRailFar(scene: Phaser.Scene): void {
  const c = scene.textures.createCanvas(BP_PROP_KEYS.tramRailFar, 256, 6);
  if (!c) return;
  const ctx = c.context;

  // Ballast base
  rect(ctx, 0, 0, 256, 6, darken(P.stone, 0.25));
  const rng = seededRandom(SEED.tramRailFar);
  // Lighter dithering (atmospheric perspective)
  for (let i = 0; i < 80; i++) {
    const x = Math.floor(rng() * 256);
    const y = Math.floor(rng() * 6);
    px(ctx, x, y, rng() > 0.5 ? P.stone : lighten(P.stone, 0.1));
  }

  // Ties — thinner, every 8px
  for (let x = 0; x < 256; x += 8) {
    rect(ctx, x, 1, 3, 4, darken(P.tieBrown, 0.1));
  }

  // Rails — single 1px line each, dimmer
  rect(ctx, 0, 1, 256, 1, P.railSteel);
  rect(ctx, 0, 4, 256, 1, P.railSteel);

  c.refresh();
}

// 11. Tram wire — 256×4 overhead catenary, tile-friendly
function generateTramWire(scene: Phaser.Scene): void {
  const c = scene.textures.createCanvas(BP_PROP_KEYS.tramWire, 256, 4);
  if (!c) return;
  const ctx = c.context;
  const rng = seededRandom(SEED.tramWire);

  // Transparent background (canvas defaults to transparent)
  // Main catenary line
  rect(ctx, 0, 1, 256, 1, P.ironDark);
  // Faint shadow dither beneath
  for (let x = 0; x < 256; x += 2) {
    if (rng() < 0.4) px(ctx, x, 2, 'rgba(0,0,0,0.35)');
  }
  // Occasional tension insulator 1px highlight
  for (let x = 32; x < 256; x += 64) {
    px(ctx, x, 0, P.ironMid);
    px(ctx, x, 1, P.ironLight);
  }

  c.refresh();
}

// 12. Tram side — 160×72 CAF Urbos yellow tram body
function generateTramSide(scene: Phaser.Scene): void {
  const c = scene.textures.createCanvas(BP_PROP_KEYS.tramSide, 160, 72);
  if (!c) return;
  const ctx = c.context;

  // Ground shadow
  rect(ctx, 10, 69, 140, 3, 'rgba(0,0,0,0.25)');

  // Main body
  const bx = 6;
  const by = 12;
  const bw = 148;
  const bh = 48;
  rect(ctx, bx, by, bw, bh, P.tramYellow);
  // Top highlight
  rect(ctx, bx, by, bw, 2, P.tramYellowHi);
  rect(ctx, bx, by, bw, 1, lighten(P.tramYellowHi, 0.2));
  // Bottom shadow
  rect(ctx, bx, by + bh - 3, bw, 3, P.tramYellowSh);
  // Left / right end curves — chop corners
  rect(ctx, bx, by, 3, 2, P.tramYellowSh);
  rect(ctx, bx, by + bh - 2, 3, 2, P.tramYellowSh);
  rect(ctx, bx + bw - 3, by, 3, 2, P.tramYellowSh);
  rect(ctx, bx + bw - 3, by + bh - 2, 3, 2, P.tramYellowSh);

  // Red accent stripe — horizontal, mid-body
  rect(ctx, bx, by + 32, bw, 2, P.tramRedAccent);
  rect(ctx, bx, by + 32, bw, 1, lighten(P.tramRedAccent, 0.2));

  // 3 large windows
  const winY = by + 10;
  const winH = 18;
  const winW = 36;
  const winCount = 3;
  const totalWinW = winCount * winW;
  const winStartX = bx + Math.round((bw - totalWinW - (winCount - 1) * 8) / 2);
  for (let i = 0; i < winCount; i++) {
    const wx = winStartX + i * (winW + 8);
    // Frame
    rect(ctx, wx - 1, winY - 1, winW + 2, winH + 2, P.bkvBlack);
    // Glass
    rect(ctx, wx, winY, winW, winH, P.tramWindow);
    // Shine
    rect(ctx, wx + 2, winY + 1, 6, winH - 2, P.tramWindowHi);
    rect(ctx, wx + 2, winY + 1, 6, 1, lighten(P.tramWindowHi, 0.2));
    // Horizontal middle divider
    rect(ctx, wx, winY + winH / 2 - 1, winW, 1, P.bkvBlack);
  }

  // Front driver window (smaller, at front/right end)
  rect(ctx, bx + bw - 14, by + 6, 10, 14, P.bkvBlack);
  rect(ctx, bx + bw - 13, by + 7, 8, 12, P.tramWindow);
  rect(ctx, bx + bw - 12, by + 8, 2, 6, P.tramWindowHi);

  // Door — dark vertical slot between windows 1 & 2
  const door1X = winStartX + winW + 1;
  rect(ctx, door1X, by + 2, 5, bh - 4, darken(P.tramYellow, 0.4));
  rect(ctx, door1X, by + 2, 1, bh - 4, P.bkvBlack);
  rect(ctx, door1X + 4, by + 2, 1, bh - 4, P.bkvBlack);
  rect(ctx, door1X + 2, by + 18, 1, 4, P.tramWindow);

  // Headlight — circular at right end
  circle(ctx, bx + bw - 4, by + 28, 3, P.bkvYellowHi);
  circle(ctx, bx + bw - 4, by + 28, 2, '#FFFAD8');

  // Wheel bogies — two large wheels underneath
  const wh1X = bx + 24;
  const wh2X = bx + bw - 28;
  circle(ctx, wh1X, by + bh + 4, 5, P.bkvBlack);
  circle(ctx, wh1X, by + bh + 4, 3, P.ironMid);
  circle(ctx, wh1X, by + bh + 4, 1, P.ironLight);
  circle(ctx, wh2X, by + bh + 4, 5, P.bkvBlack);
  circle(ctx, wh2X, by + bh + 4, 3, P.ironMid);
  circle(ctx, wh2X, by + bh + 4, 1, P.ironLight);

  // Pantograph — rooftop arm
  rect(ctx, bx + 60, by - 6, 30, 1, P.ironDark);
  rect(ctx, bx + 62, by - 10, 2, 5, P.ironDark);
  rect(ctx, bx + 86, by - 10, 2, 5, P.ironDark);
  rect(ctx, bx + 64, by - 11, 22, 1, P.ironMid);

  // Route number badge — "4/6" style small black square on front
  rect(ctx, bx + bw - 26, by + 4, 10, 6, P.bkvBlack);
  rect(ctx, bx + bw - 25, by + 5, 8, 4, P.bkvYellow);
  // "4" — very compact
  px(ctx, bx + bw - 24, by + 6, P.bkvBlack);
  px(ctx, bx + bw - 24, by + 7, P.bkvBlack);
  px(ctx, bx + bw - 23, by + 7, P.bkvBlack);
  px(ctx, bx + bw - 22, by + 6, P.bkvBlack);
  px(ctx, bx + bw - 22, by + 7, P.bkvBlack);
  px(ctx, bx + bw - 22, by + 8, P.bkvBlack);

  c.refresh();
}

// 13. Tram departure board — 160×96 BKV yellow/black signage (center blank)
function generateTramDepartureBoard(scene: Phaser.Scene): void {
  const c = scene.textures.createCanvas(BP_PROP_KEYS.tramDepartureBoard, 160, 96);
  if (!c) return;
  const ctx = c.context;

  // Outer black bezel
  rect(ctx, 0, 0, 160, 96, P.bkvBlack);
  // Inner yellow frame
  rect(ctx, 3, 3, 154, 90, P.bkvYellow);
  // Inner black face
  rect(ctx, 6, 18, 148, 72, P.bkvBlack);

  // Yellow header band
  rect(ctx, 6, 6, 148, 12, P.bkvYellow);
  rect(ctx, 6, 6, 148, 1, P.bkvYellowHi);
  rect(ctx, 6, 17, 148, 1, darken(P.bkvYellow, 0.3));

  // "DEPARTURES" header lettering — compact pixel-font blocks
  const letters = 'DEPARTURES';
  const charW = 8;
  const charH = 7;
  const startX = Math.round((160 - letters.length * charW) / 2);
  const startY = 9;
  drawPixelText(ctx, letters, startX, startY, charW, charH, P.bkvBlack);

  // Center face stays blank — destination text rendered as Phaser Text on top.
  // Add faint horizontal row guidelines to imply rows of entries.
  for (let y = 30; y < 84; y += 14) {
    rect(ctx, 10, y, 140, 1, darken(P.bkvYellow, 0.6));
  }

  // Corner rivets (bolt heads)
  const rivets = [[5, 5], [152, 5], [5, 88], [152, 88]];
  for (const [rx, ry] of rivets) {
    px(ctx, rx, ry, P.bkvBlack);
    px(ctx, rx + 1, ry, darken(P.bkvYellow, 0.3));
    px(ctx, rx, ry + 1, darken(P.bkvYellow, 0.3));
  }

  // Small BKV logo strip in bottom-right corner of yellow frame
  rect(ctx, 130, 89, 22, 3, P.bkvBlack);

  c.refresh();
}

// Minimal pixel-font drawer — caps only, compact 5×7 glyphs inside 8×7 cells.
// Used exclusively for the DEPARTURES header; everything else goes through
// Phaser.Text overlays.
function drawPixelText(ctx: Ctx, text: string, x: number, y: number, cellW: number, cellH: number, color: string): void {
  const glyphs: Record<string, string[]> = {
    D: ['11110', '10001', '10001', '10001', '10001', '10001', '11110'],
    E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
    P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
    A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
    R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
    T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
    U: ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
    S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
  };
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const glyph = glyphs[ch];
    if (!glyph) continue;
    for (let row = 0; row < Math.min(cellH, glyph.length); row++) {
      const bits = glyph[row];
      for (let col = 0; col < bits.length; col++) {
        if (bits[col] === '1') {
          px(ctx, x + i * cellW + col, y + row, color);
        }
      }
    }
  }
}

// 14. Landmark Parliament — 240×120 silhouette with Gothic Revival spires
function generateLandmarkParliament(scene: Phaser.Scene): void {
  const c = scene.textures.createCanvas(BP_PROP_KEYS.landmarkParliament, 240, 120);
  if (!c) return;
  const ctx = c.context;

  // Soft sky gradient background (bottom warm, top cool)
  for (let y = 0; y < 120; y++) {
    const t = y / 120;
    const r = Math.round(0x5a + (0xf0 - 0x5a) * t * 0.5);
    const g = Math.round(0x6a + (0xc8 - 0x6a) * t * 0.5);
    const b = Math.round(0x8a + (0x90 - 0x8a) * t * 0.3);
    rect(ctx, 0, y, 240, 1, `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`);
  }

  // Water / embankment horizontal dark band
  rect(ctx, 0, 108, 240, 12, darken(P.danubeDeep, 0.15));

  const silhouette = darken('#2a2a3a', 0.1);
  const silhouetteHi = '#4a4a5e';

  // Main horizontal body (the long parliament facade)
  rect(ctx, 20, 70, 200, 40, silhouette);
  // Top cornice ridge
  rect(ctx, 20, 68, 200, 2, silhouetteHi);

  // Dome — central large (neo-Gothic style, tall)
  const domeCx = 120;
  const domeBaseY = 70;
  // Square dome base
  rect(ctx, domeCx - 20, domeBaseY - 12, 40, 14, silhouette);
  rect(ctx, domeCx - 20, domeBaseY - 12, 40, 1, silhouetteHi);
  // Dome body (rounded)
  circle(ctx, domeCx, domeBaseY - 22, 16, silhouette);
  rect(ctx, domeCx - 16, domeBaseY - 22, 32, 12, silhouette);
  // Dome top ring
  for (let dy = 0; dy < 12; dy++) {
    const w = 32 - dy * 2;
    rect(ctx, domeCx - w / 2, domeBaseY - 36 - dy, w, 1, dy === 0 ? silhouetteHi : silhouette);
  }
  // Central spire — tall thin
  rect(ctx, domeCx - 2, domeBaseY - 60, 4, 12, silhouette);
  rect(ctx, domeCx - 1, domeBaseY - 66, 2, 6, silhouette);
  px(ctx, domeCx, domeBaseY - 68, silhouetteHi);

  // Flanking mini-spires
  const miniSpires = [60, 84, 156, 180];
  for (const sx of miniSpires) {
    rect(ctx, sx - 3, 60, 6, 10, silhouette);
    rect(ctx, sx - 2, 52, 4, 10, silhouette);
    rect(ctx, sx - 1, 46, 2, 8, silhouette);
    px(ctx, sx, 45, silhouetteHi);
  }

  // Facade arches — repeated 1px dark grooves along body
  for (let x = 28; x < 220; x += 8) {
    rect(ctx, x, 80, 1, 24, darken(silhouette, 0.3));
    // Arch-top dot
    px(ctx, x + 3, 78, silhouetteHi);
  }

  // Window glows — warm yellow dots across body (lit windows)
  const rng = seededRandom(SEED.landmarkParliament);
  for (let i = 0; i < 60; i++) {
    const wx = 24 + Math.floor(rng() * 192);
    const wy = 76 + Math.floor(rng() * 28);
    if (rng() < 0.7) {
      px(ctx, wx, wy, P.pestWindow);
    }
  }

  // Dome windows — ring of lit windows around dome base
  for (let i = 0; i < 8; i++) {
    const ang = (i / 8) * Math.PI - Math.PI;
    const rx = Math.round(Math.cos(ang) * 14);
    if (rx >= -14 && rx <= 14) {
      px(ctx, domeCx + rx, domeBaseY - 14, P.pestWindow);
    }
  }

  // Water reflection — stripes below, dimmer inverted silhouette hint
  for (let x = 24; x < 220; x += 2) {
    if (rng() < 0.5) px(ctx, x, 110 + Math.floor(rng() * 6), darken(silhouette, 0.2));
  }

  c.refresh();
}

// 15. Landmark Basilica — 200×140 St. Stephen's dome silhouette (taller)
function generateLandmarkBasilica(scene: Phaser.Scene): void {
  const c = scene.textures.createCanvas(BP_PROP_KEYS.landmarkBasilica, 200, 140);
  if (!c) return;
  const ctx = c.context;

  // Sky gradient — slightly warmer than parliament (evening)
  for (let y = 0; y < 140; y++) {
    const t = y / 140;
    const r = Math.round(0x6a + (0xf0 - 0x6a) * t * 0.55);
    const g = Math.round(0x5a + (0xc0 - 0x5a) * t * 0.5);
    const b = Math.round(0x7a + (0x88 - 0x7a) * t * 0.3);
    rect(ctx, 0, y, 200, 1, `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`);
  }

  const silhouette = darken('#2c2a3a', 0.1);
  const silhouetteHi = '#50485e';

  // Main facade body — shorter but wider
  rect(ctx, 30, 92, 140, 40, silhouette);
  rect(ctx, 30, 90, 140, 2, silhouetteHi);

  // Two flanking towers (neo-Renaissance twin bell towers)
  // Left tower
  rect(ctx, 34, 60, 22, 32, silhouette);
  rect(ctx, 34, 60, 22, 1, silhouetteHi);
  // Tower roof pyramid
  for (let dy = 0; dy < 10; dy++) {
    const w = 20 - dy * 2;
    rect(ctx, 45 - w / 2, 50 + dy, w, 1, silhouette);
  }
  px(ctx, 45, 48, silhouetteHi);
  // Bell window
  rect(ctx, 40, 72, 10, 14, darken(silhouette, 0.3));
  px(ctx, 44, 78, P.pestWindow);

  // Right tower — mirror
  rect(ctx, 144, 60, 22, 32, silhouette);
  rect(ctx, 144, 60, 22, 1, silhouetteHi);
  for (let dy = 0; dy < 10; dy++) {
    const w = 20 - dy * 2;
    rect(ctx, 155 - w / 2, 50 + dy, w, 1, silhouette);
  }
  px(ctx, 155, 48, silhouetteHi);
  rect(ctx, 150, 72, 10, 14, darken(silhouette, 0.3));
  px(ctx, 154, 78, P.pestWindow);

  // Central neo-Renaissance dome — THE basilica dome (taller than parliament)
  const domeCx = 100;
  const domeBaseY = 92;
  // Drum / drum-base
  rect(ctx, domeCx - 22, domeBaseY - 16, 44, 18, silhouette);
  rect(ctx, domeCx - 22, domeBaseY - 16, 44, 1, silhouetteHi);
  // Pillars on drum
  for (let i = 0; i < 5; i++) {
    rect(ctx, domeCx - 22 + i * 10 + 2, domeBaseY - 14, 1, 14, darken(silhouette, 0.3));
  }
  // Dome body — rounded hemisphere
  for (let dy = 0; dy < 20; dy++) {
    const prog = dy / 20;
    const w = Math.round(40 * Math.cos(prog * Math.PI * 0.5));
    rect(ctx, domeCx - w / 2, domeBaseY - 16 - dy - 1, w, 1, silhouette);
  }
  // Dome highlight (light from left)
  for (let dy = 2; dy < 18; dy += 2) {
    const prog = dy / 20;
    const w = Math.round(40 * Math.cos(prog * Math.PI * 0.5));
    px(ctx, domeCx - w / 2 + 2, domeBaseY - 16 - dy, silhouetteHi);
  }
  // Cupola / lantern
  rect(ctx, domeCx - 4, domeBaseY - 40, 8, 8, silhouette);
  rect(ctx, domeCx - 3, domeBaseY - 44, 6, 4, silhouette);
  rect(ctx, domeCx - 1, domeBaseY - 50, 2, 6, silhouette);
  // Cross finial
  px(ctx, domeCx, domeBaseY - 52, silhouetteHi);
  px(ctx, domeCx, domeBaseY - 53, silhouetteHi);
  px(ctx, domeCx, domeBaseY - 54, silhouetteHi);
  px(ctx, domeCx - 1, domeBaseY - 53, silhouetteHi);
  px(ctx, domeCx + 1, domeBaseY - 53, silhouetteHi);

  // Facade window rows
  const rng = seededRandom(SEED.landmarkBasilica);
  for (let i = 0; i < 50; i++) {
    const wx = 34 + Math.floor(rng() * 132);
    const wy = 98 + Math.floor(rng() * 28);
    if (rng() < 0.65) {
      px(ctx, wx, wy, P.pestWindow);
    }
  }

  // Main entrance — arched doorway
  rect(ctx, domeCx - 8, 118, 16, 14, darken(silhouette, 0.3));
  rect(ctx, domeCx - 6, 116, 12, 2, darken(silhouette, 0.3));
  px(ctx, domeCx, 124, P.pestWindow);

  // Water reflection strip at bottom
  rect(ctx, 0, 130, 200, 10, darken(P.danubeDeep, 0.2));
  for (let x = 30; x < 170; x += 2) {
    if (rng() < 0.5) px(ctx, x, 132 + Math.floor(rng() * 6), darken(silhouette, 0.2));
  }

  c.refresh();
}

// 16. Danube strip — 320×80 horizontal river band, tile-friendly
function generateTramDanubeStrip(scene: Phaser.Scene): void {
  const c = scene.textures.createCanvas(BP_PROP_KEYS.tramDanubeStrip, 320, 80);
  if (!c) return;
  const ctx = c.context;
  const rng = seededRandom(SEED.tramDanubeStrip);

  // Vertical gradient — deep at bottom, light at top (surface)
  for (let y = 0; y < 80; y++) {
    const t = y / 80;
    let color: string;
    if (t < 0.15)      color = P.danubeHi;
    else if (t < 0.35) color = P.danubeLight;
    else if (t < 0.65) color = P.danubeMid;
    else                color = P.danubeDeep;
    rect(ctx, 0, y, 320, 1, color);
  }

  // Soft horizontal banding for each tone transition
  rect(ctx, 0, 12, 320, 1, lighten(P.danubeHi, 0.1));
  rect(ctx, 0, 28, 320, 1, P.danubeLight);
  rect(ctx, 0, 52, 320, 1, darken(P.danubeMid, 0.15));

  // Ripple dither — varies by depth band. Must be tile-friendly: seed the
  // whole strip in one pass so x=0 and x=319 read consistent.
  for (let y = 0; y < 80; y += 2) {
    const depthT = y / 80;
    const density = depthT < 0.3 ? 0.35 : depthT < 0.6 ? 0.22 : 0.12;
    const hi = depthT < 0.3 ? P.danubeHi : depthT < 0.6 ? P.danubeLight : P.danubeMid;
    const lo = depthT < 0.3 ? P.danubeLight : depthT < 0.6 ? P.danubeMid : P.danubeDeep;
    for (let x = 0; x < 320; x += 4) {
      const ox = ((y / 2) % 2 === 0) ? 0 : 2;
      if (rng() < density) {
        px(ctx, (x + ox) % 320, y, hi);
      }
      if (rng() < density * 0.7) {
        px(ctx, (x + ox + 1) % 320, y + 1, lo);
      }
    }
  }

  // Surface highlights — short horizontal sparkles near top
  for (let i = 0; i < 40; i++) {
    const sx = Math.floor(rng() * 316);
    const sy = 2 + Math.floor(rng() * 18);
    const len = 2 + Math.floor(rng() * 3);
    for (let j = 0; j < len; j++) {
      px(ctx, (sx + j) % 320, sy, lighten(P.danubeHi, 0.2));
    }
  }

  // Very faint reflected light columns — vertical streaks near top band
  for (let i = 0; i < 4; i++) {
    const colX = 30 + Math.floor(rng() * 260);
    for (let y = 0; y < 18; y++) {
      if (rng() < 0.4) px(ctx, colX, y, lighten(P.danubeHi, 0.15));
    }
  }

  c.refresh();
}

// ══════════════════════════════════════════════════════════════════════════
// Master generator — invoked by PixelArtGenerator's chunked scheduler
// ══════════════════════════════════════════════════════════════════════════

export function generateBudapestWorldProps(scene: Phaser.Scene): void {
  generateRoadSurface(scene);
  generateRoadDash(scene);
  generateStreetTree(scene);
  generateCountrysideHouse(scene);
  generateBridgeRailingPost(scene);
  generateArrivalBuilding(scene);
  generateTramShelter(scene);
  generateTramSignPole(scene);
  generateTramRailNear(scene);
  generateTramRailFar(scene);
  generateTramWire(scene);
  generateTramSide(scene);
  generateTramDepartureBoard(scene);
  generateLandmarkParliament(scene);
  generateLandmarkBasilica(scene);
  generateTramDanubeStrip(scene);
}
