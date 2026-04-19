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

  // Phase 2 — DanubeCruise + ThermalBath + RuinBar world props
  dockStructure:        'bp-dock-structure',
  nightBuilding:        'bp-night-building',
  nightBuildingWindows: 'bp-night-building-windows',
  pixelBuildingDay:     'bp-pixel-building-day',
  pixelBuildingWindows: 'bp-pixel-building-windows',
  castleHill:           'bp-castle-hill',
  castleGlow:           'bp-castle-glow',
  thermalArchPillar:    'bp-thermal-arch-pillar',
  thermalArchSpan:      'bp-thermal-arch-span',
  thermalPoolSurface:   'bp-thermal-pool-surface',
  thermalTileBorder:    'bp-thermal-tile-border',
  ruinbarDanceLight:    'bp-ruinbar-dance-light',
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

  // Phase 2 seeds
  dockStructure:        8201,
  nightBuilding:        8202,
  nightBuildingWindows: 8203,
  pixelBuildingDay:     8204,
  pixelBuildingWindows: 8205,
  castleHill:           8206,
  castleGlow:           8207,
  thermalArchPillar:    8208,
  thermalArchSpan:      8209,
  thermalPoolSurface:   8210,
  thermalTileBorder:    8211,
  ruinbarDanceLight:    8212,
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
// Phase 2 sub-generators — DanubeCruise + ThermalBath + RuinBar props
// ══════════════════════════════════════════════════════════════════════════

// 17. Dock structure — 240×96 wooden pier with bollards + waterline shading
function generateDockStructure(scene: Phaser.Scene): void {
  const c = scene.textures.createCanvas(BP_PROP_KEYS.dockStructure, 240, 96);
  if (!c) return;
  const ctx = c.context;
  const rng = seededRandom(SEED.dockStructure);

  // Palette for this asset (dock wood, not in main palette const)
  const plankLight = '#8A6940';
  const plankMid   = '#6A4A28';
  const plankDark  = '#4A3018';
  const plankDeep  = '#2E1C0E';

  // Ground / water-line shadow band beneath the dock
  rect(ctx, 0, 82, 240, 4, 'rgba(0,0,0,0.28)');
  rect(ctx, 0, 86, 240, 2, 'rgba(10,20,40,0.22)');

  // Dock surface — top deck slab
  const deckY = 16;
  const deckH = 22;
  rect(ctx, 4, deckY, 232, deckH, plankMid);
  // Top highlight (sunlit plank tops)
  rect(ctx, 4, deckY, 232, 2, plankLight);
  rect(ctx, 4, deckY, 232, 1, lighten(plankLight, 0.12));
  // Bottom shadow of deck
  rect(ctx, 4, deckY + deckH - 2, 232, 2, plankDark);

  // Plank seams — vertical lines every 24px with slight jitter
  for (let x = 20; x < 236; x += 24) {
    const jx = x + (rng() < 0.5 ? 0 : 1);
    rect(ctx, jx, deckY, 1, deckH, plankDark);
    px(ctx, jx, deckY, plankDeep);
  }
  // Knot specks on planks
  for (let i = 0; i < 14; i++) {
    const kx = 8 + Math.floor(rng() * 222);
    const ky = deckY + 4 + Math.floor(rng() * (deckH - 8));
    px(ctx, kx, ky, plankDark);
    px(ctx, kx + 1, ky, plankDeep);
  }

  // Substructure crossbeams beneath deck
  const beamY = deckY + deckH;
  rect(ctx, 4, beamY, 232, 3, plankDark);
  rect(ctx, 4, beamY, 232, 1, plankMid);
  rect(ctx, 4, beamY + 2, 232, 1, plankDeep);

  // Pilings (4 tall posts plunging into water)
  const pilings = [20, 80, 160, 220];
  for (const px1 of pilings) {
    rect(ctx, px1, beamY + 3, 8, 40, plankDark);
    rect(ctx, px1, beamY + 3, 1, 40, plankMid);
    rect(ctx, px1 + 7, beamY + 3, 1, 40, plankDeep);
    // Piling cap bolt
    px(ctx, px1 + 3, beamY + 6, P.ironDark);
    px(ctx, px1 + 4, beamY + 6, P.ironLight);
    // Water-line foam / dither at base
    rect(ctx, px1 - 2, beamY + 38, 12, 2, 'rgba(190,210,220,0.35)');
    px(ctx, px1 - 1, beamY + 40, 'rgba(190,210,220,0.25)');
    px(ctx, px1 + 8, beamY + 40, 'rgba(190,210,220,0.25)');
  }

  // Iron bollards (mooring posts on the deck) — two, between pilings
  const bollards = [50, 190];
  for (const bx of bollards) {
    // Base plate
    rect(ctx, bx - 5, deckY - 2, 10, 3, P.ironDark);
    // Stem
    rect(ctx, bx - 3, deckY - 8, 6, 6, P.ironMid);
    rect(ctx, bx - 3, deckY - 8, 1, 6, P.ironLight);
    rect(ctx, bx + 2, deckY - 8, 1, 6, P.ironDark);
    // Cap (bulb)
    rect(ctx, bx - 4, deckY - 11, 8, 3, P.ironDark);
    rect(ctx, bx - 4, deckY - 11, 8, 1, P.ironMid);
    rect(ctx, bx - 2, deckY - 12, 4, 1, P.ironMid);
    px(ctx, bx - 1, deckY - 13, P.ironLight);
  }

  // Rope coil near first bollard — simple brown oval
  rect(ctx, 42, deckY - 3, 10, 3, P.treeTrunk);
  rect(ctx, 42, deckY - 3, 10, 1, P.treeTrunkHi);
  px(ctx, 46, deckY - 2, darken(P.treeTrunk, 0.2));

  // Waterline shading at bottom edge
  for (let x = 0; x < 240; x += 2) {
    if (rng() < 0.5) px(ctx, x, 92, 'rgba(120,150,170,0.35)');
    if (rng() < 0.3) px(ctx, x + 1, 94, 'rgba(160,180,200,0.28)');
  }

  c.refresh();
}

// 18. Night building — 88×112 tenement silhouette, windows applied as overlay
function generateNightBuilding(scene: Phaser.Scene): void {
  const c = scene.textures.createCanvas(BP_PROP_KEYS.nightBuilding, 88, 112);
  if (!c) return;
  const ctx = c.context;
  const rng = seededRandom(SEED.nightBuilding);

  // Dark blue-gray night facade tones
  const facade      = '#242838';
  const facadeHi    = '#343A4E';
  const facadeShade = '#161A28';

  // Ground-contact shadow
  rect(ctx, 2, 109, 84, 3, 'rgba(0,0,0,0.35)');

  // Main body
  const bx = 2;
  const by = 4;
  const bw = 84;
  const bh = 106;
  rect(ctx, bx, by, bw, bh, facade);
  // Left sunlit edge (faint moonlight from left)
  rect(ctx, bx, by, 1, bh, facadeHi);
  // Right shade edge
  rect(ctx, bx + bw - 2, by, 2, bh, facadeShade);
  // Top cornice
  rect(ctx, bx - 1, by - 2, bw + 2, 2, facadeHi);
  rect(ctx, bx - 1, by - 3, bw + 2, 1, facadeShade);

  // Subtle stucco dither
  for (let i = 0; i < 140; i++) {
    const x = bx + 1 + Math.floor(rng() * (bw - 2));
    const y = by + 1 + Math.floor(rng() * (bh - 3));
    px(ctx, x, y, rng() > 0.5 ? facadeHi : facadeShade);
  }

  // Floor dividers (horizontal darker lines) — 4 floors
  for (let i = 1; i < 4; i++) {
    const y = by + Math.round((bh / 4) * i);
    rect(ctx, bx, y, bw, 1, facadeShade);
    rect(ctx, bx, y + 1, bw, 1, facadeHi);
  }

  // Roof parapet line + chimney stubs (silhouetted)
  rect(ctx, bx, by, bw, 2, facadeShade);
  rect(ctx, bx + 14, by - 4, 6, 4, facadeShade);
  rect(ctx, bx + 56, by - 3, 5, 3, facadeShade);

  // Ground-floor doorway silhouette (darker block)
  rect(ctx, bx + bw / 2 - 7, by + bh - 14, 14, 14, facadeShade);
  rect(ctx, bx + bw / 2 - 6, by + bh - 13, 12, 12, darken(facadeShade, 0.3));

  c.refresh();
}

// 19. Night building windows overlay — 88×112 transparent, warm lit cells
function generateNightBuildingWindows(scene: Phaser.Scene): void {
  const c = scene.textures.createCanvas(BP_PROP_KEYS.nightBuildingWindows, 88, 112);
  if (!c) return;
  const ctx = c.context;
  const rng = seededRandom(SEED.nightBuildingWindows);

  const lit      = '#FFDD77';
  const litDim   = darken('#FFDD77', 0.25);
  const litDark  = darken('#FFDD77', 0.5);
  const frame    = '#0D0F18';

  // Window grid — 3 cols × 3 rows in the upper 3 floors (ground floor has door)
  const cols = 3;
  const rows = 3;
  const winW = 14;
  const winH = 14;
  const fx = 4;
  const fw = 80;
  const gapX = (fw - cols * winW) / (cols + 1);
  const floorTop = 10;
  const floorGap = 26;

  for (let row = 0; row < rows; row++) {
    const wy = floorTop + row * floorGap;
    for (let col = 0; col < cols; col++) {
      const wx = fx + Math.round(gapX * (col + 1) + col * winW);
      // Frame border
      rect(ctx, wx - 1, wy - 1, winW + 2, winH + 2, frame);
      // Decide if this window is lit — ~65%
      const isLit = rng() < 0.65;
      if (isLit) {
        // Base warm glow
        rect(ctx, wx, wy, winW, winH, lit);
        // Inner shadow for depth
        rect(ctx, wx + 1, wy + winH - 2, winW - 2, 1, litDim);
        rect(ctx, wx + winW - 2, wy + 1, 1, winH - 2, litDim);
        // Subtle curtain / silhouette hint
        if (rng() < 0.45) {
          rect(ctx, wx + 1, wy + 1, Math.max(2, Math.floor(rng() * 6)), winH - 2, litDark);
        }
        // Mullions
        rect(ctx, wx + winW / 2 - 1, wy, 1, winH, frame);
        rect(ctx, wx, wy + winH / 2 - 1, winW, 1, frame);
        // Glow spill — 1px halo above/below
        px(ctx, wx + winW / 2, wy - 2, 'rgba(255,221,119,0.35)');
        px(ctx, wx + winW / 2 - 1, wy - 2, 'rgba(255,221,119,0.25)');
      } else {
        // Dark unlit pane
        rect(ctx, wx, wy, winW, winH, '#0A0C14');
        // Mullions still visible
        rect(ctx, wx + winW / 2 - 1, wy, 1, winH, frame);
        rect(ctx, wx, wy + winH / 2 - 1, winW, 1, frame);
        // Faint reflection highlight
        px(ctx, wx + 2, wy + 2, '#1A1E30');
      }
    }
  }

  c.refresh();
}

// 20. Pixel building day — 96×120 pastel Pest facade with ornate cornice
function generatePixelBuildingDay(scene: Phaser.Scene): void {
  const c = scene.textures.createCanvas(BP_PROP_KEYS.pixelBuildingDay, 96, 120);
  if (!c) return;
  const ctx = c.context;
  const rng = seededRandom(SEED.pixelBuildingDay);

  // Pastel palette — riverside Pest cream/peach/sage
  const bodyBase = P.pestCream;       // cream
  const bodyHi   = lighten(P.pestCream, 0.1);
  const bodyLo   = darken(P.pestCream, 0.12);
  const accent   = '#B9D4B2';         // sage accent
  const corniceLight = '#F4E8CF';

  // Ground-contact shadow
  rect(ctx, 6, 117, 84, 3, 'rgba(0,0,0,0.25)');

  // Facade body
  const bx = 6;
  const by = 8;
  const bw = 84;
  const bh = 110;
  rect(ctx, bx, by, bw, bh, bodyBase);
  // Left sunlit edge
  rect(ctx, bx, by, 1, bh, bodyHi);
  // Right shade edge
  rect(ctx, bx + bw - 2, by, 2, bh, bodyLo);
  // Bottom ground-line shading
  rect(ctx, bx, by + bh - 3, bw, 3, bodyLo);

  // Stucco dither
  for (let i = 0; i < 140; i++) {
    const x = bx + 1 + Math.floor(rng() * (bw - 2));
    const y = by + 1 + Math.floor(rng() * (bh - 4));
    px(ctx, x, y, rng() > 0.5 ? bodyHi : bodyLo);
  }

  // Ornate top cornice — 3-tier decorative band
  rect(ctx, bx - 2, by - 4, bw + 4, 2, corniceLight);
  rect(ctx, bx - 1, by - 2, bw + 2, 1, bodyLo);
  rect(ctx, bx - 3, by - 6, bw + 6, 2, bodyHi);
  rect(ctx, bx - 3, by - 7, bw + 6, 1, corniceLight);
  // Dentil teeth along cornice
  for (let x = bx - 2; x < bx + bw + 2; x += 4) {
    rect(ctx, x, by - 4, 2, 1, bodyLo);
  }

  // 3 floor divisions — decorative bands
  const floorCount = 3;
  const floorH = Math.floor((bh - 20) / floorCount);
  for (let f = 1; f <= floorCount; f++) {
    const fy = by + 4 + f * floorH;
    rect(ctx, bx, fy, bw, 1, bodyLo);
    rect(ctx, bx, fy + 1, bw, 1, bodyHi);
    // Small sage accent dots on band
    for (let x = bx + 8; x < bx + bw - 8; x += 14) {
      px(ctx, x, fy, accent);
    }
  }

  // Ground-floor entrance — arched doorway, taller than windows
  const doorX = bx + bw / 2 - 8;
  const doorY = by + bh - 20;
  rect(ctx, doorX, doorY, 16, 18, darken('#6A4B30', 0.1));
  rect(ctx, doorX, doorY, 16, 1, darken('#6A4B30', 0.4));
  rect(ctx, doorX + 1, doorY - 1, 14, 1, corniceLight);
  // Door panel detail
  rect(ctx, doorX + 2, doorY + 3, 5, 12, '#8A6A40');
  rect(ctx, doorX + 9, doorY + 3, 5, 12, '#8A6A40');
  px(ctx, doorX + 13, doorY + 9, P.bkvYellow);

  c.refresh();
}

// 21. Pixel building windows overlay — 96×120 transparent window grid
function generatePixelBuildingWindows(scene: Phaser.Scene): void {
  const c = scene.textures.createCanvas(BP_PROP_KEYS.pixelBuildingWindows, 96, 120);
  if (!c) return;
  const ctx = c.context;
  const rng = seededRandom(SEED.pixelBuildingWindows);

  const glass    = P.tramWindow;
  const glassHi  = P.tramWindowHi;
  const frame    = P.bkvBlack;
  const sill     = '#D8C8A4';

  // Window grid — 3 cols × 3 floors (ground floor has door)
  const cols = 3;
  const rows = 3;
  const winW = 14;
  const winH = 20;
  const fx = 6;
  const fw = 84;
  const gapX = (fw - cols * winW) / (cols + 1);
  const floorTop = 14;
  const floorGap = 28;

  for (let row = 0; row < rows; row++) {
    const wy = floorTop + row * floorGap;
    for (let col = 0; col < cols; col++) {
      const wx = fx + Math.round(gapX * (col + 1) + col * winW);
      // Sill
      rect(ctx, wx - 2, wy + winH, winW + 4, 2, sill);
      rect(ctx, wx - 3, wy + winH + 2, winW + 6, 1, darken(sill, 0.25));
      // Lintel above
      rect(ctx, wx - 1, wy - 2, winW + 2, 1, sill);
      rect(ctx, wx - 2, wy - 3, winW + 4, 1, lighten(sill, 0.1));
      // Frame
      rect(ctx, wx - 1, wy - 1, winW + 2, winH + 2, frame);
      // Glass
      rect(ctx, wx, wy, winW, winH, glass);
      // Mullions
      rect(ctx, wx + winW / 2 - 1, wy, 1, winH, frame);
      rect(ctx, wx, wy + winH / 2 - 1, winW, 1, frame);
      // Shine — top-left quadrant
      rect(ctx, wx + 1, wy + 1, 3, winH / 2 - 2, glassHi);
      px(ctx, wx + 2, wy + 2, lighten(glassHi, 0.2));
      // Occasional curtain hint
      if (rng() < 0.3) {
        rect(ctx, wx + winW - 3, wy + 1, 2, winH - 2, darken(glass, 0.3));
      }
    }
  }

  c.refresh();
}

// 22. Castle hill — 320×160 Buda Castle silhouette on stepped hillside
function generateCastleHill(scene: Phaser.Scene): void {
  const c = scene.textures.createCanvas(BP_PROP_KEYS.castleHill, 320, 160);
  if (!c) return;
  const ctx = c.context;
  const rng = seededRandom(SEED.castleHill);

  const hillBase    = '#283040';
  const hillHi      = '#3A4458';
  const hillLo      = '#181E2C';
  const castleBody  = '#2E3548';
  const castleHiC   = '#4A5468';
  const castleLoC   = '#1A1F2E';

  // Hillside — sloped base profile, rising right-to-left toward castle peak
  for (let x = 0; x < 320; x++) {
    // Parabolic hill — peak at x=180
    const dx = (x - 180) / 160;
    const peak = 62 - Math.round(Math.max(0, (1 - dx * dx)) * 52);
    rect(ctx, x, peak, 1, 160 - peak, hillBase);
    // Top rim highlight
    px(ctx, x, peak, hillHi);
    px(ctx, x, peak - 1, 'rgba(74,84,104,0.4)');
  }

  // Hill texture dither — tree / rock dots
  for (let i = 0; i < 450; i++) {
    const x = Math.floor(rng() * 320);
    const yMin = 80 + Math.floor(rng() * 70);
    const r = rng();
    if (r < 0.5) px(ctx, x, yMin, hillLo);
    else if (r < 0.85) px(ctx, x, yMin, hillHi);
    else px(ctx, x, yMin, darken(hillBase, 0.2));
  }

  // Tiny tree dots along the ridge
  for (let x = 20; x < 300; x += 6) {
    const dx = (x - 180) / 160;
    const peak = 62 - Math.round(Math.max(0, (1 - dx * dx)) * 52);
    if (rng() < 0.7) {
      rect(ctx, x, peak - 3, 2, 3, hillLo);
      px(ctx, x, peak - 4, darken(hillLo, 0.2));
    }
  }

  // ── Castle complex — stepped medieval profile atop hill ──
  // Main block base (long horizontal palace)
  const baseY = 32;
  rect(ctx, 112, baseY, 136, 28, castleBody);
  rect(ctx, 112, baseY, 136, 1, castleHiC);
  rect(ctx, 112, baseY + 27, 136, 1, castleLoC);

  // Stepped right wing (lower)
  rect(ctx, 230, baseY + 8, 34, 20, castleBody);
  rect(ctx, 230, baseY + 8, 34, 1, castleHiC);

  // Stepped left wing
  rect(ctx, 96, baseY + 6, 22, 22, castleBody);
  rect(ctx, 96, baseY + 6, 22, 1, castleHiC);

  // Central dome drum
  const domeCx = 180;
  rect(ctx, domeCx - 18, baseY - 10, 36, 12, castleBody);
  rect(ctx, domeCx - 18, baseY - 10, 36, 1, castleHiC);

  // Dome hemisphere
  for (let dy = 0; dy < 14; dy++) {
    const prog = dy / 14;
    const w = Math.round(32 * Math.cos(prog * Math.PI * 0.5));
    rect(ctx, domeCx - w / 2, baseY - 10 - dy - 1, w, 1, castleBody);
  }
  // Dome highlight strip (sun from left)
  for (let dy = 2; dy < 12; dy += 2) {
    const prog = dy / 14;
    const w = Math.round(32 * Math.cos(prog * Math.PI * 0.5));
    px(ctx, domeCx - w / 2 + 2, baseY - 10 - dy, castleHiC);
  }
  // Cupola on dome
  rect(ctx, domeCx - 3, baseY - 28, 6, 4, castleBody);
  rect(ctx, domeCx - 1, baseY - 34, 2, 6, castleBody);
  px(ctx, domeCx, baseY - 36, castleHiC);

  // Turret — right side of main block (tall thin)
  const turretX = 220;
  rect(ctx, turretX - 4, baseY - 18, 8, 22, castleBody);
  rect(ctx, turretX - 4, baseY - 18, 1, 22, castleHiC);
  rect(ctx, turretX + 3, baseY - 18, 1, 22, castleLoC);
  // Turret conical roof
  rect(ctx, turretX - 5, baseY - 20, 10, 2, castleLoC);
  for (let dy = 0; dy < 7; dy++) {
    const w = 8 - dy;
    rect(ctx, turretX - Math.floor(w / 2), baseY - 20 - dy - 1, w, 1, castleLoC);
  }
  px(ctx, turretX, baseY - 28, castleHiC);

  // Secondary shorter turret — left
  const tur2X = 128;
  rect(ctx, tur2X - 3, baseY - 12, 6, 16, castleBody);
  rect(ctx, tur2X - 3, baseY - 12, 1, 16, castleHiC);
  // Flat crenellation cap
  for (let i = 0; i < 3; i++) {
    rect(ctx, tur2X - 3 + i * 2, baseY - 14, 1, 2, castleBody);
  }

  // Crenellations along main roof
  for (let x = 112; x < 248; x += 6) {
    rect(ctx, x, baseY - 2, 3, 2, castleBody);
  }

  // Window arch grooves on facade
  for (let x = 120; x < 244; x += 8) {
    rect(ctx, x, baseY + 10, 1, 14, castleLoC);
    px(ctx, x + 3, baseY + 8, castleHiC);
  }

  // Faint lit window specks (warm evening glow hint)
  for (let i = 0; i < 20; i++) {
    const wx = 116 + Math.floor(rng() * 130);
    const wy = baseY + 14 + Math.floor(rng() * 10);
    if (rng() < 0.55) px(ctx, wx, wy, '#F6D48A');
  }

  c.refresh();
}

// 23. Castle glow — 320×160 warm uplight, matches castleHill dims (additive)
function generateCastleGlow(scene: Phaser.Scene): void {
  const c = scene.textures.createCanvas(BP_PROP_KEYS.castleGlow, 320, 160);
  if (!c) return;
  const ctx = c.context;

  // Radial-ish warm uplight centered under the castle dome (x=180, y=45 from top).
  // Do a soft alpha falloff via nested rectangles + dither.
  const glowCx = 180;
  const glowCy = 48;
  const maxR = 150;

  // Dither a warm #FFCC88 outward with decaying alpha.
  // We draw via pixel-scan, sampling alpha from radial distance.
  const rng = seededRandom(SEED.castleGlow);
  for (let y = 0; y < 160; y++) {
    for (let x = 0; x < 320; x++) {
      const dx = x - glowCx;
      const dy = y - glowCy;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d > maxR) continue;
      // Falloff curve: stronger near center, soft at edges.
      const t = 1 - d / maxR;
      const a = t * t * 0.55;
      // Dither: draw only a fraction of pixels at this alpha strength to avoid
      // a solid gradient block. Density scales with t.
      if (rng() < t * 0.7) {
        px(ctx, x, y, `rgba(255,204,136,${a.toFixed(3)})`);
      }
    }
  }

  // Bright core — small concentrated dither under the dome
  for (let dy = -14; dy <= 14; dy++) {
    for (let dx = -22; dx <= 22; dx++) {
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d > 22) continue;
      if (rng() < 0.45) {
        const a = (1 - d / 22) * 0.35;
        px(ctx, glowCx + dx, glowCy + dy, `rgba(255,230,170,${a.toFixed(3)})`);
      }
    }
  }

  // Uplight beams — vertical faint streaks projecting upward from rooftops
  for (let i = 0; i < 6; i++) {
    const bx = 130 + Math.floor(rng() * 100);
    for (let y = 20; y < 60; y++) {
      if (rng() < 0.5) {
        const a = ((60 - y) / 60) * 0.25;
        px(ctx, bx, y, `rgba(255,214,150,${a.toFixed(3)})`);
      }
    }
  }

  c.refresh();
}

// 24. Thermal arch pillar — 48×120 marble column with capital + base
function generateThermalArchPillar(scene: Phaser.Scene): void {
  const c = scene.textures.createCanvas(BP_PROP_KEYS.thermalArchPillar, 48, 120);
  if (!c) return;
  const ctx = c.context;
  const rng = seededRandom(SEED.thermalArchPillar);

  const marble    = '#E8DFC6';
  const marbleHi  = '#F4ECDA';
  const marbleLo  = '#B8AC90';
  const marbleShade = '#90846C';
  const veinColor = '#A89A7E';

  // Ground-contact shadow
  rect(ctx, 4, 117, 40, 3, 'rgba(0,0,0,0.3)');

  // Base plinth — wide footing
  rect(ctx, 4, 108, 40, 8, marbleLo);
  rect(ctx, 4, 108, 40, 1, marble);
  rect(ctx, 4, 115, 40, 1, marbleShade);
  // Base step
  rect(ctx, 6, 104, 36, 4, marble);
  rect(ctx, 6, 104, 36, 1, marbleHi);
  rect(ctx, 6, 107, 36, 1, marbleLo);

  // Shaft — 22px wide, centered, with slight taper cues via vertical shading
  const shaftX = 13;
  const shaftW = 22;
  const shaftTop = 16;
  const shaftBot = 104;
  rect(ctx, shaftX, shaftTop, shaftW, shaftBot - shaftTop, marble);
  // Left sunlit edge
  rect(ctx, shaftX, shaftTop, 1, shaftBot - shaftTop, marbleHi);
  rect(ctx, shaftX + 1, shaftTop, 1, shaftBot - shaftTop, lighten(marble, 0.05));
  // Right shade edge
  rect(ctx, shaftX + shaftW - 2, shaftTop, 1, shaftBot - shaftTop, marbleLo);
  rect(ctx, shaftX + shaftW - 1, shaftTop, 1, shaftBot - shaftTop, marbleShade);

  // Vertical dithering — marble veining feel
  for (let y = shaftTop + 2; y < shaftBot - 2; y += 2) {
    for (let x = shaftX + 2; x < shaftX + shaftW - 2; x += 3) {
      if (rng() < 0.18) px(ctx, x, y, marbleHi);
      if (rng() < 0.12) px(ctx, x + 1, y, marbleLo);
    }
  }
  // A few longer vein streaks
  for (let i = 0; i < 5; i++) {
    const vx = shaftX + 3 + Math.floor(rng() * (shaftW - 6));
    const vy = shaftTop + 4 + Math.floor(rng() * (shaftBot - shaftTop - 16));
    const len = 6 + Math.floor(rng() * 8);
    for (let j = 0; j < len; j++) {
      px(ctx, vx + (j % 2), vy + j, veinColor);
    }
  }

  // Fluting — 3 vertical grooves down the shaft
  for (let i = 1; i < 4; i++) {
    const gx = shaftX + Math.round((shaftW / 4) * i);
    for (let y = shaftTop + 4; y < shaftBot - 4; y += 2) {
      px(ctx, gx, y, marbleLo);
    }
  }

  // Capital — flared top (Doric-ish)
  rect(ctx, 8, 12, 32, 4, marble);
  rect(ctx, 8, 12, 32, 1, marbleHi);
  rect(ctx, 8, 15, 32, 1, marbleLo);
  rect(ctx, 6, 8, 36, 4, marbleLo);
  rect(ctx, 6, 8, 36, 1, marble);
  rect(ctx, 6, 11, 36, 1, marbleShade);
  // Echinus curve (small ovolo)
  rect(ctx, 10, 4, 28, 4, marble);
  rect(ctx, 10, 4, 28, 1, marbleHi);
  rect(ctx, 10, 7, 28, 1, marbleLo);
  // Abacus (flat top slab)
  rect(ctx, 8, 0, 32, 4, marbleHi);
  rect(ctx, 8, 0, 32, 1, lighten(marbleHi, 0.15));
  rect(ctx, 8, 3, 32, 1, marbleLo);

  c.refresh();
}

// 25. Thermal arch span — 120×40 arch connecting two pillars, keystone center
function generateThermalArchSpan(scene: Phaser.Scene): void {
  const c = scene.textures.createCanvas(BP_PROP_KEYS.thermalArchSpan, 120, 40);
  if (!c) return;
  const ctx = c.context;

  const marble    = '#E8DFC6';
  const marbleHi  = '#F4ECDA';
  const marbleLo  = '#B8AC90';
  const marbleShade = '#90846C';

  // Draw half-ellipse arch curve, filled with marble block.
  // The span is 120 wide × 40 tall; arch curves from (0,38) up to (60,2) and back.
  const cx = 60;
  const radX = 58;
  const radY = 36;

  for (let x = 0; x < 120; x++) {
    const dx = (x - cx) / radX;
    if (Math.abs(dx) > 1) continue;
    const yTop = Math.round(radY * (1 - Math.sqrt(1 - dx * dx)));
    rect(ctx, x, yTop, 1, 40 - yTop, marble);
    // Inner (underside) edge darker
    px(ctx, x, yTop, marbleHi);
    px(ctx, x, yTop + 1, lighten(marble, 0.05));
  }

  // Block seam lines — voussoirs (arch stones) radiating from center
  const stones = 9;
  for (let i = 0; i < stones; i++) {
    const ang = Math.PI - (i / (stones - 1)) * Math.PI;
    const sx = Math.round(cx + Math.cos(ang) * radX);
    const syTop = Math.round(radY - Math.sin(ang) * radY);
    // Draw a short radial groove from arch underside inward (downward toward outer edge)
    for (let j = 0; j < 6; j++) {
      const px1 = Math.round(cx + Math.cos(ang) * (radX + j));
      const py1 = Math.round(radY - Math.sin(ang) * (radY + j));
      if (px1 >= 0 && px1 < 120 && py1 >= 0 && py1 < 40) {
        px(ctx, px1, py1, marbleLo);
      }
    }
    // Inner edge notch
    px(ctx, sx, syTop + 1, marbleShade);
  }

  // Keystone — larger wedge at apex
  rect(ctx, cx - 5, 0, 10, 8, marbleLo);
  rect(ctx, cx - 4, 0, 8, 7, marble);
  rect(ctx, cx - 4, 0, 8, 1, marbleHi);
  rect(ctx, cx - 5, 7, 10, 1, marbleShade);
  // Keystone ornament — small circular boss
  px(ctx, cx, 3, marbleLo);
  px(ctx, cx - 1, 3, marbleLo);
  px(ctx, cx + 1, 3, marbleLo);
  px(ctx, cx, 2, marbleHi);

  // Springline shadow — where arch meets pillars
  rect(ctx, 0, 36, 10, 4, marbleShade);
  rect(ctx, 110, 36, 10, 4, marbleShade);

  c.refresh();
}

// 26. Thermal pool surface — 320×160 turquoise with steam dither + wave rows
function generateThermalPoolSurface(scene: Phaser.Scene): void {
  const c = scene.textures.createCanvas(BP_PROP_KEYS.thermalPoolSurface, 320, 160);
  if (!c) return;
  const ctx = c.context;
  const rng = seededRandom(SEED.thermalPoolSurface);

  const aquaDeep  = '#1A5A6A';
  const aquaMid   = '#2A8A9A';
  const aquaLight = '#3FB0C0';
  const aquaHi    = '#78D4DE';
  const aquaSteam = '#B8E8EE';

  // Vertical gradient — deep at bottom, bright at top (steam-catching surface)
  for (let y = 0; y < 160; y++) {
    const t = y / 160;
    let color: string;
    if (t < 0.15)      color = aquaHi;
    else if (t < 0.4)  color = aquaLight;
    else if (t < 0.75) color = aquaMid;
    else                color = aquaDeep;
    rect(ctx, 0, y, 320, 1, color);
  }

  // Soft band transitions
  rect(ctx, 0, 24, 320, 1, lighten(aquaHi, 0.12));
  rect(ctx, 0, 64, 320, 1, aquaLight);
  rect(ctx, 0, 120, 320, 1, darken(aquaMid, 0.15));

  // Wave pattern — subtle horizontal sine ripple rows every 8px
  for (let y = 4; y < 160; y += 8) {
    const bandT = y / 160;
    const waveC = bandT < 0.3 ? aquaHi : bandT < 0.7 ? aquaLight : aquaMid;
    for (let x = 0; x < 320; x += 4) {
      const phase = Math.sin((x / 320) * Math.PI * 6 + y * 0.3);
      const offset = Math.round(phase * 1.5);
      px(ctx, x, y + offset, waveC);
      if (rng() < 0.4) px(ctx, x + 2, y + offset + 1, darken(waveC, 0.1));
    }
  }

  // Ripple dither — density decreases with depth
  for (let y = 0; y < 160; y += 2) {
    const depthT = y / 160;
    const density = depthT < 0.3 ? 0.32 : depthT < 0.6 ? 0.22 : 0.12;
    const hi = depthT < 0.3 ? aquaHi : depthT < 0.6 ? aquaLight : aquaMid;
    const lo = depthT < 0.3 ? aquaLight : depthT < 0.6 ? aquaMid : aquaDeep;
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

  // Steam-highlight dither rows — scattered bright dots along top third
  for (let i = 0; i < 90; i++) {
    const sx = Math.floor(rng() * 320);
    const sy = Math.floor(rng() * 50);
    const len = 1 + Math.floor(rng() * 3);
    for (let j = 0; j < len; j++) {
      px(ctx, sx + j, sy, aquaSteam);
    }
  }

  // Reflected-light vertical streaks (caustic columns)
  for (let i = 0; i < 5; i++) {
    const colX = 30 + Math.floor(rng() * 260);
    for (let y = 0; y < 80; y++) {
      if (rng() < 0.4) px(ctx, colX, y, lighten(aquaHi, 0.18));
      if (rng() < 0.25) px(ctx, colX + 1, y, aquaHi);
    }
  }

  c.refresh();
}

// 27. Thermal tile border — 32×32 seamless geometric mosaic
function generateThermalTileBorder(scene: Phaser.Scene): void {
  const c = scene.textures.createCanvas(BP_PROP_KEYS.thermalTileBorder, 32, 32);
  if (!c) return;
  const ctx = c.context;

  // Mosaic palette
  const baseA = '#D8C8A0';   // cream
  const baseB = '#4A8090';   // teal
  const baseC = '#A62E24';   // deep red accent
  const grout = '#3A2E20';

  // Grout background
  rect(ctx, 0, 0, 32, 32, grout);

  // 8×8 tile grid — 4×4 tiles per 32×32 asset.
  // Alternate colors in a pattern that tiles seamlessly on all 4 edges.
  // Pattern key (x and y in tile-coords 0..3):
  //   corner tiles (all 4 corners) → baseA for vertical-axis symmetry on wrap
  //   edge midpoints → baseB
  //   center ring → baseC
  // Use a deterministic formula so seams match.
  for (let ty = 0; ty < 4; ty++) {
    for (let tx = 0; tx < 4; tx++) {
      const x = tx * 8;
      const y = ty * 8;
      // Modular pattern — matches on wrap (tx=0 and tx=4 would be identical)
      const kx = tx % 4;
      const ky = ty % 4;
      let color = baseA;
      // Diamond-in-grid: center 2x2 is baseC, surrounding ring is baseB, corners baseA
      if ((kx === 1 || kx === 2) && (ky === 1 || ky === 2)) color = baseC;
      else if (kx === 0 && ky === 0) color = baseA;
      else if (kx === 3 && ky === 0) color = baseA;
      else if (kx === 0 && ky === 3) color = baseA;
      else if (kx === 3 && ky === 3) color = baseA;
      else color = baseB;

      // Tile body — 6×6 with 1px grout gap on all sides
      rect(ctx, x + 1, y + 1, 6, 6, color);
      // Top highlight
      rect(ctx, x + 1, y + 1, 6, 1, lighten(color, 0.15));
      // Bottom shade
      rect(ctx, x + 1, y + 6, 6, 1, darken(color, 0.2));
      // Left sunlit
      rect(ctx, x + 1, y + 1, 1, 6, lighten(color, 0.08));
      // Right shade
      rect(ctx, x + 6, y + 1, 1, 6, darken(color, 0.12));

      // Central dot accent for diamond-pattern visual anchor
      if (color === baseC) {
        px(ctx, x + 3, y + 3, lighten(baseC, 0.25));
        px(ctx, x + 4, y + 4, lighten(baseC, 0.25));
      }
    }
  }

  c.refresh();
}

// 28. Ruinbar dance light — 64×64 white radial gradient (tinted at runtime)
function generateRuinbarDanceLight(scene: Phaser.Scene): void {
  const c = scene.textures.createCanvas(BP_PROP_KEYS.ruinbarDanceLight, 64, 64);
  if (!c) return;
  const ctx = c.context;
  const rng = seededRandom(SEED.ruinbarDanceLight);

  // Neutral white — caller applies setTint(0xFF77AA / 0x77DDFF / 0xCC88FF)
  const cx = 32;
  const cy = 32;
  const maxR = 32;

  // Radial falloff from center, dithered for pixel-art feel.
  for (let y = 0; y < 64; y++) {
    for (let x = 0; x < 64; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d > maxR) continue;
      const t = 1 - d / maxR;
      // Quadratic falloff — bright core, soft edge
      const a = t * t * 0.95;
      // Dither density scales with t to keep edge soft rather than banded
      if (rng() < 0.4 + t * 0.5) {
        px(ctx, x, y, `rgba(255,255,255,${a.toFixed(3)})`);
      }
    }
  }

  // Bright solid core — small central disk for punch
  for (let dy = -6; dy <= 6; dy++) {
    for (let dx = -6; dx <= 6; dx++) {
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d > 6) continue;
      const a = (1 - d / 6) * 0.7;
      px(ctx, cx + dx, cy + dy, `rgba(255,255,255,${a.toFixed(3)})`);
    }
  }

  c.refresh();
}

// ══════════════════════════════════════════════════════════════════════════
// Master generator — invoked by PixelArtGenerator's chunked scheduler
// ══════════════════════════════════════════════════════════════════════════

export function generateBudapestWorldProps(scene: Phaser.Scene): void {
  // Phase 1
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

  // Phase 2
  generateDockStructure(scene);
  generateNightBuilding(scene);
  generateNightBuildingWindows(scene);
  generatePixelBuildingDay(scene);
  generatePixelBuildingWindows(scene);
  generateCastleHill(scene);
  generateCastleGlow(scene);
  generateThermalArchPillar(scene);
  generateThermalArchSpan(scene);
  generateThermalPoolSurface(scene);
  generateThermalTileBorder(scene);
  generateRuinbarDanceLight(scene);
}
