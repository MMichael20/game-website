// src/game/rendering/PixelArtGenerator.ts
// Generates all game textures as pixel art using Canvas 2D

import { generateAirportTextures } from './AirportTextures';
import { generateMauiTextures } from './MauiTextures';

type Ctx = CanvasRenderingContext2D;

// ── helpers ──────────────────────────────────────────────────────────────

function px(ctx: Ctx, x: number, y: number, color: string): void {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, 1, 1);
}

function rect(ctx: Ctx, x: number, y: number, w: number, h: number, color: string): void {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

// Draw a filled circle (pixel-perfect)
function circle(ctx: Ctx, cx: number, cy: number, r: number, color: string): void {
  ctx.fillStyle = color;
  for (let y = -r; y <= r; y++) {
    for (let x = -r; x <= r; x++) {
      if (x * x + y * y <= r * r) {
        ctx.fillRect(cx + x, cy + y, 1, 1);
      }
    }
  }
}

function darken(hex: string, amount = 0.2): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const f = 1 - amount;
  return `#${Math.round(r * f).toString(16).padStart(2, '0')}${Math.round(g * f).toString(16).padStart(2, '0')}${Math.round(b * f).toString(16).padStart(2, '0')}`;
}

function lighten(hex: string, amount = 0.2): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const f = amount;
  return `#${Math.min(255, Math.round(r + (255 - r) * f)).toString(16).padStart(2, '0')}${Math.min(255, Math.round(g + (255 - g) * f)).toString(16).padStart(2, '0')}${Math.min(255, Math.round(b + (255 - b) * f)).toString(16).padStart(2, '0')}`;
}

// Seeded random for deterministic patterns
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return s / 2147483647;
  };
}

// ── terrain ──────────────────────────────────────────────────────────────

function drawTerrainTile(ctx: Ctx, offsetX: number, type: 'grass' | 'dirt' | 'stone' | 'darkgrass'): void {
  const colors: Record<string, { base: string; mid: string; detail: string; accent: string; highlight: string }> = {
    grass:     { base: '#4a7c4f', mid: '#448048', detail: '#3d6b42', accent: '#5a9c5f', highlight: '#6ab86f' },
    dirt:      { base: '#c4a265', mid: '#b8975c', detail: '#a88b52', accent: '#d4b87a', highlight: '#dcc48a' },
    stone:     { base: '#8a8a8a', mid: '#808080', detail: '#6e6e6e', accent: '#9e9e9e', highlight: '#aaaaaa' },
    darkgrass: { base: '#3a6b3f', mid: '#356538', detail: '#2d5832', accent: '#4a8b4f', highlight: '#5a9b5f' },
  };
  const c = colors[type];
  const rng = seededRandom(offsetX * 17 + type.length * 31);

  // Base fill
  rect(ctx, offsetX, 0, 32, 32, c.base);

  // Dithered mid-tone pattern for depth
  for (let y = 0; y < 32; y += 2) {
    for (let x = (y % 4 === 0 ? 0 : 1); x < 32; x += 4) {
      px(ctx, offsetX + x, y, c.mid);
    }
  }

  // Scatter detail pixels
  for (let i = 0; i < 30; i++) {
    const x = Math.floor(rng() * 32);
    const y = Math.floor(rng() * 32);
    const r = rng();
    px(ctx, offsetX + x, y, r > 0.6 ? c.detail : r > 0.3 ? c.accent : c.highlight);
  }

  // Type-specific details
  if (type === 'grass' || type === 'darkgrass') {
    // Grass tufts (2-3 pixel tall blades)
    for (let i = 0; i < 8; i++) {
      const x = Math.floor(rng() * 30) + 1;
      const y = Math.floor(rng() * 26) + 4;
      px(ctx, offsetX + x, y, c.accent);
      px(ctx, offsetX + x, y - 1, c.highlight);
      if (rng() > 0.5) px(ctx, offsetX + x, y - 2, lighten(c.highlight, 0.1));
      // Second blade offset
      if (rng() > 0.4) {
        px(ctx, offsetX + x + 1, y, c.accent);
        px(ctx, offsetX + x + 1, y - 1, c.highlight);
      }
    }
    // Tiny flowers scattered on grass
    if (type === 'grass') {
      for (let i = 0; i < 2; i++) {
        const fx = Math.floor(rng() * 28) + 2;
        const fy = Math.floor(rng() * 28) + 2;
        const fcolors = ['#ffaacc', '#ffffaa', '#aaccff'];
        px(ctx, offsetX + fx, fy, fcolors[Math.floor(rng() * 3)]);
      }
    }
  } else if (type === 'dirt') {
    // Pebbles (small 2-3px clusters)
    for (let i = 0; i < 5; i++) {
      const x = Math.floor(rng() * 28) + 2;
      const y = Math.floor(rng() * 28) + 2;
      px(ctx, offsetX + x, y, '#9a8255');
      px(ctx, offsetX + x + 1, y, '#b09a65');
      if (rng() > 0.5) px(ctx, offsetX + x, y + 1, '#a89060');
    }
    // Subtle footprint-like marks
    if (rng() > 0.5) {
      const fx = Math.floor(rng() * 20) + 6;
      const fy = Math.floor(rng() * 20) + 6;
      px(ctx, offsetX + fx, fy, c.detail);
      px(ctx, offsetX + fx + 1, fy + 2, c.detail);
    }
  } else if (type === 'stone') {
    // Brick/tile grid lines
    for (let y = 0; y < 32; y += 8) {
      rect(ctx, offsetX, y, 32, 1, c.detail);
    }
    for (let x = 0; x < 32; x += 8) {
      rect(ctx, offsetX + x, 0, 1, 32, c.detail);
    }
    // Cracks
    for (let i = 0; i < 2; i++) {
      const x = Math.floor(rng() * 20) + 6;
      const y = Math.floor(rng() * 20) + 6;
      for (let j = 0; j < 5; j++) {
        px(ctx, offsetX + x + j, y + (j % 3 === 0 ? 1 : 0), '#5e5e5e');
      }
    }
    // Highlight on edges
    for (let x = 1; x < 32; x += 8) {
      rect(ctx, offsetX + x, 1, 6, 1, c.highlight);
    }
  }
}

export function generateTerrain(scene: Phaser.Scene): void {
  const canvas = scene.textures.createCanvas('terrain', 128, 32);
  if (!canvas) return;
  const ctx = canvas.context;
  drawTerrainTile(ctx, 0, 'grass');
  drawTerrainTile(ctx, 32, 'dirt');
  drawTerrainTile(ctx, 64, 'stone');
  drawTerrainTile(ctx, 96, 'darkgrass');
  canvas.refresh();

  // Register frames for tile rendering
  const texture = scene.textures.get('terrain');
  texture.add(0, 0, 0, 0, 32, 32);   // Grass
  texture.add(1, 0, 32, 0, 32, 32);  // Dirt
  texture.add(2, 0, 64, 0, 32, 32);  // Stone
  texture.add(3, 0, 96, 0, 32, 32);  // DarkGrass
}

// ── interior terrain ─────────────────────────────────────────────────

function drawWoodFloor(ctx: Ctx, offsetX: number): void {
  const rng = seededRandom(offsetX * 23 + 7);
  rect(ctx, offsetX, 0, 32, 32, '#b8864e');
  for (let y = 0; y < 32; y += 8) {
    rect(ctx, offsetX, y, 32, 1, '#a07040');
  }
  for (let i = 0; i < 12; i++) {
    const y = Math.floor(rng() * 32);
    const x = Math.floor(rng() * 20);
    const len = Math.floor(rng() * 10) + 3;
    for (let j = 0; j < len; j++) {
      px(ctx, offsetX + x + j, y, rng() > 0.5 ? '#a87844' : '#c89860');
    }
  }
  for (let i = 0; i < 2; i++) {
    const kx = Math.floor(rng() * 28) + 2;
    const ky = Math.floor(rng() * 28) + 2;
    px(ctx, offsetX + kx, ky, '#8a6030');
    px(ctx, offsetX + kx + 1, ky, '#8a6030');
  }
}

function drawCarpet(ctx: Ctx, offsetX: number): void {
  const rng = seededRandom(offsetX * 31 + 13);
  rect(ctx, offsetX, 0, 32, 32, '#7a8fa8');
  for (let i = 0; i < 40; i++) {
    const x = Math.floor(rng() * 32);
    const y = Math.floor(rng() * 32);
    px(ctx, offsetX + x, y, rng() > 0.5 ? '#7085a0' : '#8498b0');
  }
  for (let y = 0; y < 32; y += 4) {
    for (let x = (y % 8 === 0 ? 0 : 2); x < 32; x += 4) {
      px(ctx, offsetX + x, y, '#6878908a');
    }
  }
}

function drawCarpetBeige(ctx: Ctx, offsetX: number): void {
  const rng = seededRandom(offsetX * 33 + 17);
  rect(ctx, offsetX, 0, 32, 32, '#c8b090');
  for (let i = 0; i < 40; i++) {
    const x = Math.floor(rng() * 32);
    const y = Math.floor(rng() * 32);
    px(ctx, offsetX + x, y, rng() > 0.5 ? '#c0a888' : '#d0b898');
  }
  for (let y = 0; y < 32; y += 4) {
    for (let x = (y % 8 === 0 ? 0 : 2); x < 32; x += 4) {
      px(ctx, offsetX + x, y, '#b8a0808a');
    }
  }
}

function drawTileFloor(ctx: Ctx, offsetX: number): void {
  const rng = seededRandom(offsetX * 37 + 19);
  for (let ty = 0; ty < 4; ty++) {
    for (let tx = 0; tx < 4; tx++) {
      const light = (tx + ty) % 2 === 0;
      rect(ctx, offsetX + tx * 8, ty * 8, 8, 8, light ? '#e8e8e8' : '#d0d0d0');
    }
  }
  for (let i = 0; i < 4; i++) {
    rect(ctx, offsetX, i * 8, 32, 1, '#bbb');
    rect(ctx, offsetX + i * 8, 0, 1, 32, '#bbb');
  }
  for (let i = 0; i < 8; i++) {
    const x = Math.floor(rng() * 32);
    const y = Math.floor(rng() * 32);
    px(ctx, offsetX + x, y, '#c8c8c8');
  }
}

function drawInteriorWall(ctx: Ctx, offsetX: number): void {
  const rng = seededRandom(offsetX * 41 + 23);
  rect(ctx, offsetX, 0, 32, 30, '#e8dcc8');
  for (let i = 0; i < 20; i++) {
    const x = Math.floor(rng() * 32);
    const y = Math.floor(rng() * 28);
    px(ctx, offsetX + x, y, rng() > 0.5 ? '#e0d4c0' : '#f0e4d0');
  }
  rect(ctx, offsetX, 30, 32, 2, '#8a7a6a');
  rect(ctx, offsetX, 29, 32, 1, '#a09080');
}

function drawDoorFrame(ctx: Ctx, offsetX: number): void {
  rect(ctx, offsetX, 0, 32, 32, '#b8864e');
  rect(ctx, offsetX, 0, 4, 32, '#6a4a2a');
  rect(ctx, offsetX + 1, 0, 2, 32, '#7a5a3a');
  rect(ctx, offsetX + 28, 0, 4, 32, '#6a4a2a');
  rect(ctx, offsetX + 29, 0, 2, 32, '#7a5a3a');
  rect(ctx, offsetX, 0, 32, 4, '#6a4a2a');
  rect(ctx, offsetX, 1, 32, 2, '#7a5a3a');
}

export function generateInteriorTerrain(scene: Phaser.Scene): void {
  const canvas = scene.textures.createCanvas('interior-terrain', 192, 32);
  if (!canvas) return;
  const ctx = canvas.context;
  drawWoodFloor(ctx, 0);
  drawCarpet(ctx, 32);
  drawTileFloor(ctx, 64);
  drawInteriorWall(ctx, 96);
  drawDoorFrame(ctx, 128);
  drawCarpetBeige(ctx, 160);
  canvas.refresh();

  const texture = scene.textures.get('interior-terrain');
  texture.add(0, 0, 0, 0, 32, 32);
  texture.add(1, 0, 32, 0, 32, 32);
  texture.add(2, 0, 64, 0, 32, 32);
  texture.add(3, 0, 96, 0, 32, 32);
  texture.add(4, 0, 128, 0, 32, 32);
  texture.add(5, 0, 160, 0, 32, 32);
}

// ── interior furniture ───────────────────────────────────────────────

function drawBed(ctx: Ctx): void {
  rect(ctx, 2, 4, 28, 26, '#6a4a2a');
  rect(ctx, 3, 5, 26, 24, '#7a5a3a');
  rect(ctx, 4, 8, 24, 18, '#f0e8e0');
  rect(ctx, 6, 6, 20, 5, '#ffffff');
  rect(ctx, 7, 7, 18, 3, '#f8f0e8');
  rect(ctx, 4, 14, 24, 12, '#6688aa');
  rect(ctx, 5, 15, 22, 10, '#7798bb');
  rect(ctx, 4, 14, 24, 1, '#5578aa');
  rect(ctx, 8, 18, 16, 1, '#88aacc');
  rect(ctx, 8, 22, 16, 1, '#88aacc');
}

function drawCouch(ctx: Ctx): void {
  rect(ctx, 2, 12, 28, 14, '#8b6f5e');
  rect(ctx, 3, 13, 26, 12, '#9b7f6e');
  rect(ctx, 2, 4, 28, 10, '#7a5f4e');
  rect(ctx, 3, 5, 26, 8, '#8b6f5e');
  rect(ctx, 0, 8, 4, 18, '#7a5f4e');
  rect(ctx, 28, 8, 4, 18, '#7a5f4e');
  rect(ctx, 15, 13, 1, 12, '#7a5f4e');
  rect(ctx, 5, 14, 8, 2, '#a88f7e');
  rect(ctx, 18, 14, 8, 2, '#a88f7e');
}

function drawInteriorTable(ctx: Ctx): void {
  rect(ctx, 4, 6, 24, 20, '#a08050');
  rect(ctx, 5, 7, 22, 18, '#b09060');
  rect(ctx, 5, 7, 22, 1, '#c0a070');
  rect(ctx, 4, 6, 2, 2, '#806030');
  rect(ctx, 26, 6, 2, 2, '#806030');
  rect(ctx, 4, 24, 2, 2, '#806030');
  rect(ctx, 26, 24, 2, 2, '#806030');
}

function drawStove(ctx: Ctx): void {
  rect(ctx, 2, 2, 28, 28, '#3a3a3a');
  rect(ctx, 3, 3, 26, 26, '#4a4a4a');
  circle(ctx, 10, 10, 4, '#2a2a2a');
  circle(ctx, 22, 10, 4, '#2a2a2a');
  circle(ctx, 10, 22, 4, '#2a2a2a');
  circle(ctx, 22, 22, 4, '#2a2a2a');
  for (const [bx, by] of [[10,10],[22,10],[10,22],[22,22]]) {
    rect(ctx, bx - 3, by, 6, 1, '#555');
    rect(ctx, bx, by - 3, 1, 6, '#555');
  }
  rect(ctx, 6, 28, 3, 2, '#666');
  rect(ctx, 14, 28, 3, 2, '#666');
  rect(ctx, 22, 28, 3, 2, '#666');
}

function drawSink(ctx: Ctx): void {
  rect(ctx, 2, 4, 28, 24, '#c0c0c0');
  rect(ctx, 3, 5, 26, 22, '#d0d0d0');
  rect(ctx, 7, 8, 18, 14, '#a0a0a0');
  rect(ctx, 8, 9, 16, 12, '#b0b0b8');
  rect(ctx, 14, 4, 4, 6, '#888');
  rect(ctx, 13, 3, 6, 2, '#999');
  px(ctx, 16, 16, '#777');
  px(ctx, 15, 16, '#777');
  px(ctx, 12, 12, '#c8d8e8');
  px(ctx, 18, 14, '#c8d8e8');
}

function drawToilet(ctx: Ctx): void {
  rect(ctx, 8, 2, 16, 10, '#f0f0f0');
  rect(ctx, 9, 3, 14, 8, '#e8e8e8');
  rect(ctx, 22, 5, 4, 2, '#ccc');
  rect(ctx, 6, 10, 20, 16, '#f8f8f8');
  rect(ctx, 7, 11, 18, 14, '#f0f0f0');
  rect(ctx, 8, 12, 16, 12, '#e0e0e0');
  rect(ctx, 10, 14, 12, 8, '#e8e8e8');
  rect(ctx, 11, 15, 10, 6, '#d0d8e0');
}

function drawDesk(ctx: Ctx): void {
  rect(ctx, 2, 6, 28, 20, '#8a7050');
  rect(ctx, 3, 7, 26, 18, '#9a8060');
  rect(ctx, 3, 7, 26, 1, '#aa9070');
  rect(ctx, 10, 2, 12, 9, '#333');
  rect(ctx, 11, 3, 10, 7, '#4488cc');
  rect(ctx, 14, 11, 4, 2, '#444');
  rect(ctx, 8, 16, 16, 4, '#555');
  rect(ctx, 9, 17, 14, 2, '#666');
  rect(ctx, 2, 24, 2, 4, '#705030');
  rect(ctx, 28, 24, 2, 4, '#705030');
}

function drawBookshelf(ctx: Ctx): void {
  rect(ctx, 2, 2, 28, 28, '#6a4a2a');
  rect(ctx, 3, 3, 26, 26, '#7a5a3a');
  for (let sy = 3; sy < 28; sy += 8) {
    rect(ctx, 3, sy, 26, 1, '#5a3a1a');
  }
  const rng = seededRandom(42);
  const bookColors = ['#cc4444', '#4444cc', '#44aa44', '#ccaa44', '#aa44cc', '#44aaaa', '#cc8844', '#8844cc', '#44cc88'];
  let ci = 0;
  for (let shelf = 0; shelf < 3; shelf++) {
    const sy = 4 + shelf * 8;
    let bx = 4;
    while (bx < 27) {
      const bw = 2 + Math.floor(rng() * 3);
      if (bx + bw > 28) break;
      rect(ctx, bx, sy, bw, 7, bookColors[ci % bookColors.length]);
      rect(ctx, bx, sy, 1, 7, lighten(bookColors[ci % bookColors.length], 0.2));
      bx += bw + 1;
      ci++;
    }
  }
}

export function generateInteriorFurniture(scene: Phaser.Scene): void {
  const drawFns: Record<string, (ctx: Ctx) => void> = {
    bed: drawBed,
    couch: drawCouch,
    table: drawInteriorTable,
    stove: drawStove,
    sink: drawSink,
    toilet: drawToilet,
    desk: drawDesk,
    bookshelf: drawBookshelf,
  };

  for (const [name, draw] of Object.entries(drawFns)) {
    const canvas = scene.textures.createCanvas(`interior-${name}`, 32, 32);
    if (!canvas) continue;
    draw(canvas.context);
    canvas.refresh();
  }
}

// ── characters ───────────────────────────────────────────────────────────

type HairStyle = 'short' | 'medium' | 'long' | 'spiky' | 'curly' | 'ponytail' | 'bun' | 'slick';

interface OutfitStyle {
  shirt: string;
  pants: string;
  shoes: string;
  hair: string;
  maleHair?: string;
  skin: string;
  accent: string;
  hairStyle: HairStyle;
  maleHairStyle?: HairStyle;
  accessory?: (ctx: Ctx, ox: number, oy: number, dir: number, isMale: boolean) => void;
}

// Draws a single character frame at (fx, fy) within a 64x64 cell.
// direction: 0=down, 1=left, 2=right, 3=up
// frame: 0=stand, 1=walk-left, 2=walk-right
// isMale: false=female (player/"Hadar"), true=male (partner/"Michael")
function drawCharFrame(
  ctx: Ctx, fx: number, fy: number,
  direction: number, frame: number,
  outfit: OutfitStyle,
  isMale: boolean,
): void {
  const ox = fx * 64;
  const oy = fy * 64;

  // Walk bobbing (increased for 64px)
  const bob = frame === 0 ? 0 : (frame === 1 ? -3 : 3);
  const legSpread = frame === 0 ? 0 : (frame === 1 ? 3 : -3);

  const skin = outfit.skin;
  const skinShadow = darken(skin, 0.15);
  const skinHighlight = lighten(skin, 0.1);

  // ── Shadow on ground ──
  const shadowW = isMale ? 24 : 20;
  const shadowX = ox + (64 - shadowW) / 2;
  rect(ctx, shadowX, oy + 58, shadowW, 4, 'rgba(0,0,0,0.15)');

  // ── Head (16x14, rounded) ──
  const headX = ox + 24;
  const headBaseY = isMale ? 4 : 5;
  const headY = oy + headBaseY + (bob > 0 ? 1 : 0);

  // Head base (rounded corners)
  rect(ctx, headX + 1, headY, 14, 14, skin);
  rect(ctx, headX, headY + 1, 16, 12, skin);
  // Forehead highlight
  rect(ctx, headX + 4, headY + 1, 8, 2, skinHighlight);
  // Chin/jaw shadow
  const jawW = isMale ? 14 : 10;
  const jawOff = isMale ? 1 : 3;
  rect(ctx, headX + jawOff, headY + 13, jawW, 1, skinShadow);
  // Male wider jaw shadow
  if (isMale) {
    rect(ctx, headX + 1, headY + 11, 14, 2, darken(skin, 0.05));
  }

  // Ears
  if (direction === 0 || direction === 3) {
    rect(ctx, headX - 1, headY + 5, 1, 3, skin);
    rect(ctx, headX + 16, headY + 5, 1, 3, skin);
    px(ctx, headX - 1, headY + 7, skinShadow);
    px(ctx, headX + 16, headY + 7, skinShadow);
  } else if (direction === 1) {
    rect(ctx, headX - 1, headY + 5, 1, 3, skin);
    px(ctx, headX - 1, headY + 7, skinShadow);
  } else {
    rect(ctx, headX + 16, headY + 5, 1, 3, skin);
    px(ctx, headX + 16, headY + 7, skinShadow);
  }

  // ── Hair ──
  const hairStyle = isMale ? (outfit.maleHairStyle ?? outfit.hairStyle) : outfit.hairStyle;
  const hairColor = isMale ? (outfit.maleHair ?? outfit.hair) : outfit.hair;
  drawHair64(ctx, headX, headY, direction, hairColor, hairStyle);

  // ── Face ──
  if (direction === 0) {
    // Front face — eyes
    rect(ctx, headX + 2, headY + 6, 4, 3, '#fff');
    rect(ctx, headX + 10, headY + 6, 4, 3, '#fff');
    // Pupils
    const pupilColor = isMale ? '#2266cc' : '#334';
    rect(ctx, headX + 4, headY + 7, 2, 2, pupilColor);
    rect(ctx, headX + 12, headY + 7, 2, 2, pupilColor);
    // Eye shine
    px(ctx, headX + 5, headY + 7, '#fff');
    px(ctx, headX + 13, headY + 7, '#fff');
    // Eyebrows
    if (isMale) {
      rect(ctx, headX + 2, headY + 5, 4, 1, darken(hairColor, 0.3));
      rect(ctx, headX + 10, headY + 5, 4, 1, darken(hairColor, 0.3));
    } else {
      rect(ctx, headX + 3, headY + 5, 3, 1, darken(outfit.hair, 0.2));
      rect(ctx, headX + 10, headY + 5, 3, 1, darken(outfit.hair, 0.2));
    }
    // Blush (female only)
    if (!isMale) {
      rect(ctx, headX + 1, headY + 9, 2, 1, '#f0a0a0');
      rect(ctx, headX + 13, headY + 9, 2, 1, '#f0a0a0');
    }
    // Mouth
    rect(ctx, headX + 6, headY + 11, 4, 1, '#d88');
  } else if (direction === 3) {
    // Back of head — hair covers it
  } else {
    // Side view
    const eyeX = direction === 2 ? headX + 10 : headX + 3;
    rect(ctx, eyeX, headY + 6, 4, 3, '#fff');
    rect(ctx, direction === 2 ? eyeX + 2 : eyeX, headY + 7, 2, 2, isMale ? '#2266cc' : '#334');
    // Eyebrow
    if (isMale) {
      rect(ctx, eyeX, headY + 5, 4, 1, darken(hairColor, 0.3));
    } else {
      rect(ctx, eyeX + 1, headY + 5, 3, 1, darken(outfit.hair, 0.2));
    }
    // Side blush (female only)
    if (!isMale) {
      const blushX = direction === 2 ? headX + 14 : headX + 1;
      px(ctx, blushX, headY + 9, '#f0a0a0');
    }
    // Side mouth
    const mouthX = direction === 2 ? headX + 13 : headX + 3;
    px(ctx, mouthX, headY + 11, '#d88');
  }

  // ── Neck ──
  const neckW = isMale ? 10 : 4;
  const neckX = ox + (64 - neckW) / 2;
  const neckY = headY + 14;
  rect(ctx, neckX, neckY, neckW, 3, skin);

  // ── Body / Shirt ──
  const shirtDark = darken(outfit.shirt, 0.15);
  const shirtLight = lighten(outfit.shirt, 0.15);

  let bodyX: number, bodyW: number;
  const bodyY = neckY + 3;

  if (isMale) {
    // Male: muscular V-taper — wide shoulders to narrow waist
    bodyW = 30;
    bodyX = ox + 17;
    // Shoulders + chest (wide)
    rect(ctx, bodyX, bodyY, 30, 5, outfit.shirt);
    // Mid torso taper
    rect(ctx, bodyX + 1, bodyY + 5, 28, 4, outfit.shirt);
    // Narrow waist
    rect(ctx, bodyX + 3, bodyY + 9, 24, 4, outfit.shirt);
    // Edge shading — shoulders
    rect(ctx, bodyX, bodyY, 2, 5, shirtDark);
    rect(ctx, bodyX + 28, bodyY, 2, 5, shirtDark);
    // Edge shading — mid
    rect(ctx, bodyX + 1, bodyY + 5, 2, 4, shirtDark);
    rect(ctx, bodyX + 27, bodyY + 5, 2, 4, shirtDark);
    // Edge shading — waist
    rect(ctx, bodyX + 3, bodyY + 9, 2, 4, shirtDark);
    rect(ctx, bodyX + 25, bodyY + 9, 2, 4, shirtDark);
    // Pec highlight (wider for muscle definition)
    rect(ctx, bodyX + 8, bodyY + 1, 6, 4, shirtLight);
    rect(ctx, bodyX + 16, bodyY + 1, 6, 4, shirtLight);
    // Collar
    rect(ctx, bodyX + 10, bodyY, 10, 2, outfit.accent);
    // Belt
    rect(ctx, bodyX + 3, bodyY + 12, 24, 1, darken(outfit.pants, 0.1));
  } else {
    // Female: slim shoulders (14px), narrow waist (10px), wider hips (20px)
    bodyX = ox + 25;
    bodyW = 14;
    // Upper torso / shoulders (narrower, slimmer)
    rect(ctx, bodyX, bodyY, 14, 4, outfit.shirt);
    // Taper to waist
    rect(ctx, bodyX + 1, bodyY + 4, 12, 2, outfit.shirt);
    rect(ctx, bodyX + 2, bodyY + 6, 10, 1, outfit.shirt);
    // Narrow waist
    rect(ctx, bodyX + 2, bodyY + 7, 10, 2, outfit.shirt);
    // Hip flair
    rect(ctx, bodyX, bodyY + 9, 14, 2, outfit.shirt);
    rect(ctx, bodyX - 3, bodyY + 11, 20, 2, outfit.shirt);
    // Shading — left edge
    rect(ctx, bodyX, bodyY, 1, 4, shirtDark);
    rect(ctx, bodyX + 1, bodyY + 4, 1, 2, shirtDark);
    rect(ctx, bodyX + 2, bodyY + 6, 1, 1, shirtDark);
    rect(ctx, bodyX + 2, bodyY + 7, 1, 2, shirtDark);
    rect(ctx, bodyX, bodyY + 9, 1, 2, shirtDark);
    rect(ctx, bodyX - 3, bodyY + 11, 1, 2, shirtDark);
    // Shading — right edge
    rect(ctx, bodyX + 13, bodyY, 1, 4, shirtDark);
    rect(ctx, bodyX + 12, bodyY + 4, 1, 2, shirtDark);
    rect(ctx, bodyX + 11, bodyY + 6, 1, 1, shirtDark);
    rect(ctx, bodyX + 11, bodyY + 7, 1, 2, shirtDark);
    rect(ctx, bodyX + 13, bodyY + 9, 1, 2, shirtDark);
    rect(ctx, bodyX + 16, bodyY + 11, 1, 2, shirtDark);
    // Chest highlight
    rect(ctx, bodyX + 5, bodyY + 1, 4, 3, shirtLight);
    // Collar
    rect(ctx, bodyX + 4, bodyY, 6, 2, outfit.accent);
    // Belt
    rect(ctx, bodyX - 3, bodyY + 12, 20, 1, darken(outfit.pants, 0.1));
    bodyW = 20; // use hip width for arm/leg placement
    bodyX = ox + 22; // adjust for hip-relative positioning
  }

  // ── Arms ──
  const armY = bodyY + 1;
  const sleeveColor = outfit.shirt;
  const sleeveDark = shirtDark;
  const armLen = isMale ? 7 : 6;

  const armW = isMale ? 5 : 4;

  if (direction === 1 || direction === 2) {
    // Side — one arm
    const armX = direction === 2 ? (isMale ? ox + 46 : ox + 39) : (isMale ? ox + 14 : ox + 21);
    const armSwing = frame === 1 ? -3 : (frame === 2 ? 3 : 0);
    rect(ctx, armX, armY + armSwing, armW, armLen, sleeveColor);
    rect(ctx, armX, armY + armSwing, 1, armLen, sleeveDark);
    rect(ctx, armX, armY + armLen + armSwing, armW, 5, skin);
    px(ctx, armX, armY + armLen + 4 + armSwing, skinShadow);
  } else {
    // Front/back — both arms
    const lSwing = frame === 1 ? 3 : (frame === 2 ? -3 : 0);
    const rSwing = frame === 1 ? -3 : (frame === 2 ? 3 : 0);
    const lArmX = isMale ? ox + 12 : ox + 21;
    const rArmX = isMale ? ox + 48 : ox + 39;
    // Left arm
    rect(ctx, lArmX, armY + lSwing, armW, armLen, sleeveColor);
    rect(ctx, lArmX, armY + lSwing, 1, armLen, sleeveDark);
    rect(ctx, lArmX, armY + armLen + lSwing, armW, 5, skin);
    px(ctx, lArmX, armY + armLen + 4 + lSwing, skinShadow);
    // Right arm
    rect(ctx, rArmX, armY + rSwing, armW, armLen, sleeveColor);
    rect(ctx, rArmX + (armW - 1), armY + rSwing, 1, armLen, sleeveDark);
    rect(ctx, rArmX, armY + armLen + rSwing, armW, 5, skin);
    px(ctx, rArmX + (armW - 1), armY + armLen + 4 + rSwing, skinShadow);
  }

  // ── Legs / Pants ──
  const legY = bodyY + 13;
  const pantsColor = outfit.pants;
  const pantsDark = darken(pantsColor, 0.15);
  const legW = isMale ? 7 : 5;

  // Left leg
  rect(ctx, ox + (isMale ? 23 : 25) + legSpread, legY, legW, 10, pantsColor);
  rect(ctx, ox + (isMale ? 23 : 25) + legSpread, legY, 1, 10, pantsDark);
  // Right leg
  rect(ctx, ox + 34 - legSpread, legY, legW, 10, pantsColor);
  rect(ctx, ox + 34 - legSpread, legY, 1, 10, pantsDark);

  // ── Shoes ──
  const shoeY = legY + 10;
  const shoeDark = darken(outfit.shoes, 0.2);
  const shoeW = isMale ? 9 : 6;
  rect(ctx, ox + (isMale ? 22 : 24) + legSpread, shoeY, shoeW, 3, outfit.shoes);
  rect(ctx, ox + (isMale ? 22 : 24) + legSpread, shoeY, shoeW, 1, lighten(outfit.shoes, 0.1));
  rect(ctx, ox + 34 - legSpread, shoeY, shoeW, 3, outfit.shoes);
  rect(ctx, ox + 34 - legSpread, shoeY + 2, shoeW, 1, shoeDark);

  // ── Outfit-specific accessory ──
  if (outfit.accessory) {
    outfit.accessory(ctx, ox, oy + (bob > 0 ? 1 : 0), direction, isMale);
  }
}

function drawHair64(
  ctx: Ctx, headX: number, headY: number, direction: number,
  color: string, style: HairStyle,
): void {
  const dark = darken(color, 0.2);
  const light = lighten(color, 0.15);

  switch (style) {
    case 'short':
      // Close-cropped top + sides
      rect(ctx, headX, headY - 3, 16, 5, color);
      rect(ctx, headX + 3, headY - 4, 10, 2, color);
      rect(ctx, headX + 4, headY - 3, 8, 3, light);
      if (direction === 0 || direction === 3) {
        rect(ctx, headX - 1, headY + 1, 2, 3, color);
        rect(ctx, headX + 15, headY + 1, 2, 3, color);
      }
      break;

    case 'medium':
      // Ear-length hair
      rect(ctx, headX - 1, headY - 4, 18, 6, color);
      rect(ctx, headX, headY - 4, 16, 4, light);
      if (direction === 0) {
        rect(ctx, headX - 1, headY + 1, 3, 8, color);
        rect(ctx, headX + 14, headY + 1, 3, 8, color);
        // Bangs
        rect(ctx, headX + 1, headY + 1, 5, 2, color);
        rect(ctx, headX + 10, headY + 1, 5, 2, color);
      } else if (direction === 3) {
        rect(ctx, headX - 1, headY - 4, 18, 16, color);
        rect(ctx, headX, headY - 1, 16, 11, dark);
      } else {
        // Side view — hair behind head (opposite side from eyes)
        const side = direction === 1 ? 15 : -2;
        rect(ctx, headX + side, headY, 3, 9, color);
        rect(ctx, headX + (direction === 1 ? 14 : 0), headY, 2, 5, color);
      }
      break;

    case 'long':
      // Very long hair reaching hip level — clearly feminine
      rect(ctx, headX - 2, headY - 4, 20, 6, color);
      rect(ctx, headX, headY - 4, 16, 4, light);
      if (direction === 0) {
        // Side curtains reaching far down
        rect(ctx, headX - 3, headY + 1, 3, 16, color);
        rect(ctx, headX + 16, headY + 1, 3, 16, color);
        rect(ctx, headX - 4, headY + 10, 3, 12, color);
        rect(ctx, headX + 17, headY + 10, 3, 12, color);
        // Wispy ends
        rect(ctx, headX - 4, headY + 20, 2, 4, dark);
        rect(ctx, headX + 18, headY + 20, 2, 4, dark);
        // Bangs
        rect(ctx, headX + 1, headY + 1, 4, 2, color);
        rect(ctx, headX + 11, headY + 1, 4, 2, color);
      } else if (direction === 3) {
        // Full back hair curtain
        rect(ctx, headX - 3, headY - 4, 22, 20, color);
        rect(ctx, headX, headY, 16, 12, dark);
        rect(ctx, headX - 4, headY + 12, 24, 12, color);
        rect(ctx, headX - 3, headY + 22, 22, 3, dark);
      } else {
        // Side view — long curtain behind head (opposite side from eyes)
        const side = direction === 1 ? 16 : -3;
        rect(ctx, headX + side, headY, 3, 18, color);
        rect(ctx, headX + (direction === 1 ? 17 : -4), headY + 8, 3, 14, color);
        rect(ctx, headX + (direction === 1 ? 14 : 0), headY, 2, 4, color);
        // Wispy end
        rect(ctx, headX + (direction === 1 ? 17 : -4), headY + 20, 2, 4, dark);
      }
      break;

    case 'spiky':
      rect(ctx, headX, headY - 3, 16, 4, color);
      rect(ctx, headX + 4, headY - 4, 8, 2, color);
      // 5 spikes (bigger for 64px)
      rect(ctx, headX + 1, headY - 6, 2, 2, color);
      rect(ctx, headX + 4, headY - 8, 3, 3, color);
      px(ctx, headX + 5, headY - 7, light);
      rect(ctx, headX + 8, headY - 7, 3, 2, color);
      px(ctx, headX + 9, headY - 6, light);
      rect(ctx, headX + 12, headY - 6, 3, 2, color);
      px(ctx, headX + 13, headY - 5, light);
      if (direction !== 3) {
        rect(ctx, headX + 1, headY, 4, 2, color);
      }
      break;

    case 'curly':
      // Fluffy curly mass
      rect(ctx, headX - 3, headY - 4, 22, 8, color);
      rect(ctx, headX - 4, headY - 3, 24, 6, color);
      // Top bumps
      rect(ctx, headX, headY - 6, 4, 2, color);
      rect(ctx, headX + 5, headY - 7, 4, 2, color);
      rect(ctx, headX + 10, headY - 6, 4, 2, color);
      // Curly texture highlights
      px(ctx, headX, headY - 3, light);
      px(ctx, headX + 7, headY - 4, light);
      px(ctx, headX + 14, headY - 3, light);
      px(ctx, headX + 4, headY, light);
      px(ctx, headX + 11, headY, light);
      if (direction === 0) {
        rect(ctx, headX - 3, headY + 3, 3, 6, color);
        rect(ctx, headX + 16, headY + 3, 3, 6, color);
      } else if (direction === 3) {
        rect(ctx, headX - 3, headY - 3, 22, 12, color);
        px(ctx, headX + 4, headY + 3, dark);
        px(ctx, headX + 9, headY + 4, dark);
        px(ctx, headX + 14, headY + 2, dark);
      }
      break;

    case 'ponytail':
      rect(ctx, headX, headY - 4, 16, 5, color);
      rect(ctx, headX + 3, headY - 4, 10, 4, light);
      if (direction === 0) {
        rect(ctx, headX + 1, headY, 4, 2, color); // bangs
        rect(ctx, headX + 11, headY, 4, 2, color);
      } else if (direction === 3) {
        // Ponytail hanging down back
        rect(ctx, headX + 5, headY - 1, 6, 4, color);
        rect(ctx, headX + 5, headY + 3, 5, 16, color);
        rect(ctx, headX + 5, headY + 17, 6, 4, color);
        px(ctx, headX + 7, headY + 7, dark);
        px(ctx, headX + 7, headY + 12, dark);
      } else {
        // Side ponytail visible
        const tailX = direction === 1 ? headX + 10 : headX + 3;
        rect(ctx, tailX, headY + 3, 4, 14, color);
        px(ctx, tailX + 1, headY + 13, dark);
      }
      break;

    case 'bun':
      rect(ctx, headX, headY - 3, 16, 4, color);
      rect(ctx, headX + 3, headY - 3, 10, 3, light);
      // Bun on top
      rect(ctx, headX + 4, headY - 8, 8, 5, color);
      rect(ctx, headX + 5, headY - 9, 6, 2, color);
      px(ctx, headX + 7, headY - 7, light);
      px(ctx, headX + 8, headY - 7, light);
      if (direction === 0) {
        rect(ctx, headX + 4, headY, 8, 2, color); // bangs
      } else if (direction === 3) {
        rect(ctx, headX, headY - 3, 16, 7, color);
        rect(ctx, headX + 1, headY, 14, 4, dark);
      }
      break;

    case 'slick':
      // Slicked back
      rect(ctx, headX, headY - 4, 16, 5, color);
      rect(ctx, headX + 3, headY - 4, 10, 3, light);
      rect(ctx, headX - 1, headY, 3, 4, color);
      rect(ctx, headX + 14, headY, 3, 4, color);
      if (direction === 3) {
        rect(ctx, headX, headY - 3, 16, 8, color);
        rect(ctx, headX + 4, headY, 8, 4, dark);
      }
      break;
  }
}

const OUTFIT_STYLES: OutfitStyle[] = [
  // Purple jacket, long black hair, red bandana
  {
    shirt: '#6644aa', pants: '#444466', shoes: '#443322', hair: '#0a0a0a', maleHair: '#d4a832', skin: '#f5d0a9',
    accent: '#dd6666', hairStyle: 'long', maleHairStyle: 'short',
    accessory: (ctx, ox, oy, dir, isMale) => {
      if (!isMale) {
        // Red bandana tied around forehead
        const bandana = '#cc2222';
        const bandanaLight = '#dd4444';
        if (dir === 0) {
          rect(ctx, ox + 23, oy + 4, 18, 3, bandana);
          rect(ctx, ox + 25, oy + 4, 14, 1, bandanaLight);
          // Knot on the right side
          rect(ctx, ox + 40, oy + 4, 4, 2, bandana);
          rect(ctx, ox + 43, oy + 5, 3, 3, bandana);
          px(ctx, ox + 44, oy + 7, bandanaLight);
        } else if (dir === 3) {
          rect(ctx, ox + 23, oy + 4, 18, 3, bandana);
          rect(ctx, ox + 25, oy + 4, 14, 1, bandanaLight);
        } else if (dir === 2) {
          rect(ctx, ox + 24, oy + 4, 16, 3, bandana);
          // Knot visible on right-facing
          rect(ctx, ox + 39, oy + 4, 4, 2, bandana);
          rect(ctx, ox + 42, oy + 5, 3, 3, bandana);
          px(ctx, ox + 43, oy + 7, bandanaLight);
        } else {
          rect(ctx, ox + 24, oy + 4, 16, 3, bandana);
          px(ctx, ox + 25, oy + 4, bandanaLight);
        }
      } else {
        // Scarf for male
        if (dir === 0) {
          rect(ctx, ox + 25, oy + 22, 14, 4, '#dd6666');
          rect(ctx, ox + 37, oy + 26, 4, 8, '#dd6666');
          rect(ctx, ox + 37, oy + 34, 4, 1, '#bb4444');
        } else if (dir === 1 || dir === 2) {
          rect(ctx, ox + 26, oy + 22, 12, 4, '#dd6666');
        }
      }
    },
  },
  // Summer Breeze — sundress + flower crown / tee + sunglasses
  {
    shirt: '#7ec8d9', pants: '#7ec8d9', shoes: '#d4a574', hair: '#0a0a0a', maleHair: '#d4a832', skin: '#f5d0a9',
    accent: '#ffffff', hairStyle: 'long', maleHairStyle: 'short',
    accessory: (ctx, ox, oy, dir, isMale) => {
      if (!isMale) {
        // Larger flower crown on long hair
        const hy = oy + 2;
        if (dir === 0) {
          rect(ctx, ox + 22, hy, 20, 3, '#66aa66');
          rect(ctx, ox + 23, hy - 1, 18, 2, '#559955');
          // Flowers — larger, more visible
          rect(ctx, ox + 24, hy - 2, 2, 2, '#ff6688');
          px(ctx, ox + 25, hy - 3, '#ff8899');
          rect(ctx, ox + 28, hy - 2, 2, 2, '#ffcc44');
          px(ctx, ox + 29, hy - 3, '#ffdd66');
          rect(ctx, ox + 32, hy - 2, 2, 2, '#ff88bb');
          px(ctx, ox + 33, hy - 3, '#ff99cc');
          rect(ctx, ox + 36, hy - 2, 2, 2, '#88bbff');
          px(ctx, ox + 37, hy - 3, '#99ccff');
          // Leaves between flowers
          px(ctx, ox + 27, hy - 1, '#77cc77');
          px(ctx, ox + 31, hy - 1, '#77cc77');
          px(ctx, ox + 35, hy - 1, '#77cc77');
        } else if (dir === 3) {
          rect(ctx, ox + 22, hy, 20, 3, '#66aa66');
          rect(ctx, ox + 23, hy - 1, 18, 2, '#559955');
          rect(ctx, ox + 26, hy - 2, 2, 2, '#ff6688');
          rect(ctx, ox + 31, hy - 2, 2, 2, '#ffcc44');
          rect(ctx, ox + 36, hy - 2, 2, 2, '#ff88bb');
        } else {
          rect(ctx, ox + 23, hy, 18, 3, '#66aa66');
          rect(ctx, ox + 24, hy - 1, 16, 2, '#559955');
          const fx = dir === 2 ? ox + 36 : ox + 24;
          rect(ctx, fx, hy - 2, 2, 2, '#ff6688');
          px(ctx, fx + 1, hy - 3, '#ff8899');
          rect(ctx, ox + 30, hy - 2, 2, 2, '#ffcc44');
          px(ctx, ox + 31, hy - 3, '#ffdd66');
        }
      } else {
        // Sunglasses
        const gy = oy + 10;
        if (dir === 0) {
          rect(ctx, ox + 25, gy, 5, 3, '#222');
          rect(ctx, ox + 34, gy, 5, 3, '#222');
          rect(ctx, ox + 30, gy + 1, 4, 1, '#222');
          px(ctx, ox + 27, gy, '#555');
          px(ctx, ox + 36, gy, '#555');
        } else if (dir === 1 || dir === 2) {
          const gx = dir === 2 ? ox + 33 : ox + 26;
          rect(ctx, gx, gy, 5, 3, '#222');
          px(ctx, gx + 2, gy, '#555');
        }
      }
    },
  },
  // Cozy Autumn — sweater + beret on long hair / hoodie + beanie
  {
    shirt: '#e8d5b7', pants: '#664433', shoes: '#553322', hair: '#0a0a0a', maleHair: '#d4a832', skin: '#f5d0a9',
    accent: '#c4a880', hairStyle: 'long', maleHairStyle: 'short',
    accessory: (ctx, ox, oy, dir, isMale) => {
      if (!isMale) {
        // Beret sitting on long hair — positioned higher/tilted
        if (dir === 0) {
          rect(ctx, ox + 21, oy - 1, 16, 4, '#cc4455');
          rect(ctx, ox + 23, oy - 3, 12, 3, '#cc4455');
          rect(ctx, ox + 26, oy - 5, 6, 3, '#cc4455');
          px(ctx, ox + 28, oy - 5, '#dd5566');
          px(ctx, ox + 29, oy - 5, '#dd5566');
          // Brim detail
          rect(ctx, ox + 21, oy + 2, 16, 1, '#bb3344');
        } else if (dir === 3) {
          rect(ctx, ox + 21, oy - 1, 16, 4, '#cc4455');
          rect(ctx, ox + 23, oy - 3, 12, 3, '#cc4455');
          rect(ctx, ox + 26, oy - 4, 6, 2, '#cc4455');
        } else {
          // Side views — beret tilted slightly
          const bx = dir === 2 ? ox + 25 : ox + 21;
          rect(ctx, bx, oy - 1, 14, 4, '#cc4455');
          rect(ctx, bx + 2, oy - 3, 10, 3, '#cc4455');
          rect(ctx, bx + 4, oy - 5, 6, 3, '#cc4455');
          px(ctx, bx + 6, oy - 5, '#dd5566');
        }
      } else {
        // Beanie
        const by = oy + 1;
        if (dir === 0 || dir === 3) {
          rect(ctx, ox + 22, by - 4, 20, 6, '#2d5a27');
          rect(ctx, ox + 24, by - 6, 16, 3, '#2d5a27');
          rect(ctx, ox + 22, by + 1, 20, 2, '#234a1e');
          px(ctx, ox + 31, by - 6, '#3a7a33');
        } else {
          rect(ctx, ox + 23, by - 4, 18, 6, '#2d5a27');
          rect(ctx, ox + 25, by - 6, 14, 3, '#2d5a27');
          rect(ctx, ox + 23, by + 1, 18, 2, '#234a1e');
        }
      }
    },
  },
  // Sporty — crop top + wide headband / jersey + wristband
  {
    shirt: '#ff6b9d', pants: '#222233', shoes: '#ffffff', hair: '#0a0a0a', maleHair: '#d4a832', skin: '#f5d0a9',
    accent: '#ff4577', hairStyle: 'long', maleHairStyle: 'short',
    accessory: (ctx, ox, oy, dir, isMale) => {
      if (!isMale) {
        // Wide sporty headband with stripe detail
        const hy = oy + 3;
        const band = '#ff4577';
        const bandLight = '#ff6b9d';
        const stripe = '#ffffff';
        if (dir === 0) {
          rect(ctx, ox + 22, hy, 20, 4, band);
          rect(ctx, ox + 23, hy, 18, 1, bandLight);
          // White stripe through center
          rect(ctx, ox + 23, hy + 2, 18, 1, stripe);
        } else if (dir === 3) {
          rect(ctx, ox + 22, hy, 20, 4, band);
          rect(ctx, ox + 23, hy, 18, 1, bandLight);
          rect(ctx, ox + 23, hy + 2, 18, 1, stripe);
        } else {
          rect(ctx, ox + 23, hy, 18, 4, band);
          rect(ctx, ox + 24, hy, 16, 1, bandLight);
          rect(ctx, ox + 24, hy + 2, 16, 1, stripe);
        }
      } else {
        // Wristband (on right arm, visible in front/side views)
        if (dir === 0) {
          rect(ctx, ox + 48, oy + 27, 5, 2, '#ff4444');
          rect(ctx, ox + 48, oy + 27, 5, 1, '#ff6666');
        } else if (dir === 2) {
          rect(ctx, ox + 46, oy + 27, 5, 2, '#ff4444');
          rect(ctx, ox + 46, oy + 27, 5, 1, '#ff6666');
        } else if (dir === 1) {
          rect(ctx, ox + 14, oy + 27, 5, 2, '#ff4444');
          rect(ctx, ox + 14, oy + 27, 5, 1, '#ff6666');
        }
      }
    },
  },
  // Night Out — red top + gold hair clip & necklace / black shirt + watch
  {
    shirt: '#cc2244', pants: '#1a1a2e', shoes: '#1a1a2e', hair: '#0a0a0a', maleHair: '#d4a832', skin: '#f5d0a9',
    accent: '#aa1133', hairStyle: 'long', maleHairStyle: 'short',
    accessory: (ctx, ox, oy, dir, isMale) => {
      if (!isMale) {
        // Gold hair clip in hair
        const gold = '#ffcc44';
        const goldDark = '#ddaa22';
        if (dir === 0) {
          // Hair clip on right side
          rect(ctx, ox + 38, oy + 5, 3, 2, gold);
          px(ctx, ox + 39, oy + 5, goldDark);
          px(ctx, ox + 39, oy + 7, gold);
        } else if (dir === 2) {
          // Hair clip visible on right-facing
          rect(ctx, ox + 37, oy + 5, 3, 2, gold);
          px(ctx, ox + 38, oy + 7, gold);
        } else if (dir === 1) {
          // Hair clip on left-facing (mirrored)
          rect(ctx, ox + 24, oy + 5, 3, 2, gold);
          px(ctx, ox + 25, oy + 7, gold);
        }
        // Necklace with pendant (all views)
        if (dir === 0) {
          px(ctx, ox + 28, oy + 21, '#ddaa44');
          px(ctx, ox + 29, oy + 22, '#ddaa44');
          px(ctx, ox + 30, oy + 23, '#ddaa44');
          px(ctx, ox + 31, oy + 23, '#ddaa44');
          px(ctx, ox + 32, oy + 23, '#ddaa44');
          px(ctx, ox + 33, oy + 22, '#ddaa44');
          px(ctx, ox + 34, oy + 21, '#ddaa44');
          rect(ctx, ox + 30, oy + 24, 2, 2, '#ffcc44');
          px(ctx, ox + 31, oy + 25, '#eebb33');
        } else if (dir === 1 || dir === 2) {
          const nx = dir === 2 ? ox + 33 : ox + 28;
          px(ctx, nx, oy + 21, '#ddaa44');
          px(ctx, nx + (dir === 2 ? 1 : -1), oy + 22, '#ddaa44');
        }
      } else {
        // Watch on left wrist
        if (dir === 0) {
          rect(ctx, ox + 12, oy + 28, 5, 3, '#444');
          rect(ctx, ox + 13, oy + 29, 3, 1, '#88ccff');
        } else if (dir === 1) {
          rect(ctx, ox + 14, oy + 28, 5, 3, '#444');
          rect(ctx, ox + 15, oy + 29, 3, 1, '#88ccff');
        }
      }
    },
  },
];

export function generateCharacterOutfits(scene: Phaser.Scene): void {
  for (let c = 0; c < 2; c++) {
    const prefix = c === 0 ? 'player' : 'partner';
    const isMale = c === 1;

    for (let o = 0; o < OUTFIT_STYLES.length; o++) {
      const key = `${prefix}-outfit-${o}`;
      const canvas = scene.textures.createCanvas(key, 192, 256);
      if (!canvas) continue;
      const ctx = canvas.context;

      const outfit: OutfitStyle = OUTFIT_STYLES[o];

      // 4 rows (directions: down, left, right, up) × 3 cols (frames)
      for (let dir = 0; dir < 4; dir++) {
        for (let frame = 0; frame < 3; frame++) {
          drawCharFrame(ctx, frame, dir, dir, frame, outfit, isMale);
        }
      }
      canvas.refresh();

      // Register spritesheet frames (3 cols × 4 rows, 64×64 each)
      const texture = scene.textures.get(key);
      for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 3; col++) {
          texture.add(row * 3 + col, 0, col * 64, row * 64, 64, 64);
        }
      }
    }
  }
}

// ── NPC ──────────────────────────────────────────────────────────────────

function drawNPCVariant(ctx: Ctx, opts: {
  robe: string; hat: string; sash: string; skin: string;
  hatStyle?: 'wizard' | 'cap' | 'headband' | 'apron-hat';
}): void {
  const robe = opts.robe;
  const robeDark = darken(robe, 0.2);
  const robeLight = lighten(robe, 0.2);
  const skin = opts.skin;
  const sash = opts.sash;
  const sashLight = lighten(sash, 0.15);
  const hat = opts.hat;
  const hatStyle = opts.hatStyle ?? 'wizard';

  // Shadow
  rect(ctx, 16, 43, 16, 3, 'rgba(0,0,0,0.15)');

  // Robe body (wider, flowing)
  rect(ctx, 14, 21, 20, 16, robe);
  rect(ctx, 14, 21, 2, 16, robeDark);
  rect(ctx, 32, 21, 2, 16, robeDark);
  rect(ctx, 17, 21, 14, 2, robeLight);
  // Robe bottom flare
  rect(ctx, 12, 34, 24, 5, robe);
  rect(ctx, 12, 34, 2, 5, robeDark);

  // Belt/sash
  rect(ctx, 14, 29, 20, 2, sash);
  px(ctx, 23, 29, sashLight);
  px(ctx, 24, 29, sashLight);

  // Arms in robe
  rect(ctx, 10, 24, 4, 10, robe);
  rect(ctx, 34, 24, 4, 10, robe);
  // Hands
  rect(ctx, 10, 34, 3, 2, skin);
  rect(ctx, 35, 34, 3, 2, skin);

  // Head (rounder)
  rect(ctx, 19, 7, 10, 11, skin);
  rect(ctx, 18, 8, 12, 9, skin);
  rect(ctx, 20, 8, 8, 2, lighten(skin, 0.1));

  // Hat styles
  if (hatStyle === 'wizard') {
    rect(ctx, 16, 4, 16, 5, hat);
    rect(ctx, 17, 1, 14, 4, hat);
    rect(ctx, 19, -1, 10, 3, lighten(hat, 0.1));
    rect(ctx, 20, -3, 8, 2, lighten(hat, 0.1));
    rect(ctx, 22, -4, 4, 2, lighten(hat, 0.1));
    rect(ctx, 16, 7, 16, 2, sash);
    px(ctx, 23, 7, sashLight);
    px(ctx, 24, 7, sashLight);
    px(ctx, 23, 2, '#ffdd44');
    px(ctx, 24, 2, '#ffdd44');
    px(ctx, 23, 1, '#ffdd44');
  } else if (hatStyle === 'cap') {
    // Baseball cap style
    rect(ctx, 16, 3, 16, 6, hat);
    rect(ctx, 17, 2, 14, 3, hat);
    rect(ctx, 14, 7, 6, 2, hat); // brim
    rect(ctx, 16, 3, 16, 1, lighten(hat, 0.15));
  } else if (hatStyle === 'headband') {
    // Sport headband
    rect(ctx, 16, 5, 16, 3, hat);
    rect(ctx, 16, 5, 16, 1, lighten(hat, 0.2));
  } else if (hatStyle === 'apron-hat') {
    // Wide brimmed hat / chef-like
    rect(ctx, 14, 2, 20, 6, hat);
    rect(ctx, 16, 0, 16, 3, hat);
    rect(ctx, 14, 2, 20, 1, lighten(hat, 0.15));
    rect(ctx, 18, 0, 12, 1, lighten(hat, 0.15));
  }

  // Eyes
  rect(ctx, 19, 12, 3, 3, '#fff');
  rect(ctx, 26, 12, 3, 3, '#fff');
  px(ctx, 20, 12, '#334');
  px(ctx, 21, 12, '#334');
  px(ctx, 27, 12, '#334');
  px(ctx, 28, 12, '#334');

  // Smile
  rect(ctx, 22, 16, 4, 1, '#c88');

  // Shoes
  rect(ctx, 17, 39, 5, 2, '#443322');
  rect(ctx, 26, 39, 5, 2, '#443322');
}

export function generateNPCs(scene: Phaser.Scene): void {
  const variants = [
    { key: 'npc-default', robe: '#5544aa', hat: '#443388', sash: '#cc9944', skin: '#d4a574', hatStyle: 'wizard' as const },
    { key: 'npc-villager', robe: '#448844', hat: '#336633', sash: '#cc9944', skin: '#d4a574', hatStyle: 'cap' as const },
    { key: 'npc-jogger', robe: '#4477cc', hat: '#ff4444', sash: '#ffffff', skin: '#e8c090', hatStyle: 'headband' as const },
    { key: 'npc-reader', robe: '#996644', hat: '#885533', sash: '#ddaa66', skin: '#d4a574', hatStyle: 'wizard' as const },
    { key: 'npc-shopkeeper', robe: '#cc6644', hat: '#eeeeee', sash: '#ffffff', skin: '#e8c090', hatStyle: 'apron-hat' as const },
  ];

  variants.forEach(v => {
    const canvas = scene.textures.createCanvas(v.key, 48, 48);
    if (!canvas) return;
    drawNPCVariant(canvas.context, { robe: v.robe, hat: v.hat, sash: v.sash, skin: v.skin, hatStyle: v.hatStyle });
    canvas.refresh();
  });
}

// ── buildings ────────────────────────────────────────────────────────────

function drawRestaurant(ctx: Ctx): void {
  // Main wall with brick pattern
  rect(ctx, 8, 30, 80, 58, '#cc8855');
  // Brick rows
  for (let y = 32; y < 88; y += 4) {
    const offset = (y % 8 === 0) ? 0 : 4;
    for (let x = 8 + offset; x < 88; x += 8) {
      rect(ctx, x, y, 7, 3, lighten('#cc8855', 0.05));
      rect(ctx, x, y, 7, 1, lighten('#cc8855', 0.08));
    }
  }

  // Roof — layered shingles
  for (let i = 0; i < 14; i++) {
    const shade = i % 3 === 0 ? '#993322' : (i % 3 === 1 ? '#aa3322' : '#883020');
    rect(ctx, 4 + i, 16 + i, 88 - i * 2, 1, shade);
  }
  // Roof ridge highlight
  rect(ctx, 4, 16, 88, 1, '#bb4433');

  // Chimney
  rect(ctx, 70, 8, 8, 10, '#884433');
  rect(ctx, 70, 8, 8, 1, '#995544');
  // Smoke
  px(ctx, 73, 5, '#cccccc');
  px(ctx, 74, 3, '#bbbbbb');
  px(ctx, 72, 1, '#aaaaaa');

  // Door with frame
  rect(ctx, 36, 54, 24, 34, '#553311');
  rect(ctx, 36, 54, 24, 2, '#664422');
  rect(ctx, 38, 56, 20, 30, '#664422');
  rect(ctx, 38, 56, 20, 1, '#775533');
  // Door panels
  rect(ctx, 40, 58, 7, 12, '#553311');
  rect(ctx, 49, 58, 7, 12, '#553311');
  // Doorknob
  rect(ctx, 54, 72, 2, 2, '#ccaa44');
  px(ctx, 55, 72, '#ddbb55');
  // Welcome mat
  rect(ctx, 38, 86, 20, 2, '#aa6644');

  // Windows with curtains
  for (const wx of [14, 62]) {
    // Window frame
    rect(ctx, wx - 1, 39, 16, 16, '#554433');
    // Glass
    rect(ctx, wx, 40, 14, 14, '#88ccff');
    // Cross bar
    rect(ctx, wx + 6, 40, 2, 14, '#554433');
    rect(ctx, wx, 46, 14, 2, '#554433');
    // Warm interior glow
    rect(ctx, wx + 1, 41, 5, 5, '#ffeeaa');
    rect(ctx, wx + 8, 41, 5, 5, '#ffeeaa');
    rect(ctx, wx + 2, 42, 3, 3, '#fff8cc');
    rect(ctx, wx + 9, 42, 3, 3, '#fff8cc');
    // Curtain hints
    rect(ctx, wx, 40, 2, 14, '#cc4444');
    rect(ctx, wx + 12, 40, 2, 14, '#cc4444');
    // Window sill
    rect(ctx, wx - 1, 54, 16, 2, '#665544');
    // Flower box
    rect(ctx, wx, 56, 14, 3, '#664422');
    px(ctx, wx + 2, 55, '#ff6688');
    px(ctx, wx + 6, 55, '#ffaa44');
    px(ctx, wx + 10, 55, '#ff88bb');
    px(ctx, wx + 4, 54, '#44aa44');
    px(ctx, wx + 8, 54, '#44aa44');
  }

  // Sign with better text
  rect(ctx, 28, 20, 40, 10, '#ffeedd');
  rect(ctx, 28, 20, 40, 1, '#ddccbb');
  rect(ctx, 28, 29, 40, 1, '#aa8866');
  // Border
  rect(ctx, 28, 20, 1, 10, '#aa8866');
  rect(ctx, 67, 20, 1, 10, '#aa8866');
  // Sign hangers
  rect(ctx, 32, 18, 1, 3, '#666');
  rect(ctx, 63, 18, 1, 3, '#666');

  // Pixel text "CAFE"
  const cafePixels = [
    // C
    [32, 23], [32, 24], [32, 25], [32, 26], [33, 23], [34, 23], [33, 26], [34, 26],
    // A
    [37, 24], [37, 25], [37, 26], [38, 23], [39, 23], [40, 24], [40, 25], [40, 26], [38, 25], [39, 25],
    // F
    [43, 23], [43, 24], [43, 25], [43, 26], [44, 23], [45, 23], [44, 25],
    // E
    [48, 23], [48, 24], [48, 25], [48, 26], [49, 23], [50, 23], [49, 25], [50, 25], [49, 26], [50, 26],
  ];
  cafePixels.forEach(([x, y]) => px(ctx, x, y, '#884422'));

  // Awning with 3D depth
  for (let x = 8; x < 88; x += 8) {
    rect(ctx, x, 30, 4, 4, '#cc3333');
    rect(ctx, x + 4, 30, 4, 4, '#ffffff');
  }
  rect(ctx, 8, 34, 80, 1, darken('#cc3333', 0.3));

  // Lanterns by door
  rect(ctx, 32, 50, 3, 5, '#cc9944');
  rect(ctx, 33, 49, 1, 1, '#444');
  px(ctx, 33, 52, '#ffdd66');
  rect(ctx, 61, 50, 3, 5, '#cc9944');
  rect(ctx, 62, 49, 1, 1, '#444');
  px(ctx, 62, 52, '#ffdd66');
}

function drawParkEntrance(ctx: Ctx): void {
  // Sky hint at top
  rect(ctx, 0, 0, 96, 12, '#c8e8c0');

  // Ground with grass texture
  rect(ctx, 0, 64, 96, 32, '#5a8a4f');
  for (let x = 0; x < 96; x += 3) {
    px(ctx, x, 66, '#4a7a3f');
    px(ctx, x + 1, 70, '#6a9a5f');
  }

  // Winding path
  rect(ctx, 32, 56, 32, 40, '#c4a265');
  rect(ctx, 34, 58, 28, 38, '#d4b87a');
  // Path texture
  for (let y = 58; y < 96; y += 4) {
    for (let x = 36; x < 60; x += 5) {
      px(ctx, x, y, '#bfa060');
    }
  }

  // Arch posts (stone)
  rect(ctx, 22, 14, 10, 52, '#8B7355');
  rect(ctx, 64, 14, 10, 52, '#8B7355');
  // Stone texture
  for (let y = 16; y < 64; y += 6) {
    rect(ctx, 22, y, 10, 1, '#7a6345');
    rect(ctx, 64, y, 10, 1, '#7a6345');
  }
  // Post caps
  rect(ctx, 21, 12, 12, 3, '#a09070');
  rect(ctx, 63, 12, 12, 3, '#a09070');
  rect(ctx, 21, 12, 12, 1, '#b0a080');
  rect(ctx, 63, 12, 12, 1, '#b0a080');

  // Arch top (iron wrought look)
  for (let i = 0; i < 6; i++) {
    rect(ctx, 28 + i * 2, 8 + i, 40 - i * 4, 2, '#5a4a3a');
  }
  // Arch decorative curl
  rect(ctx, 44, 6, 8, 2, '#5a4a3a');
  rect(ctx, 46, 4, 4, 2, '#5a4a3a');
  px(ctx, 47, 3, '#6a5a4a');
  px(ctx, 48, 3, '#6a5a4a');

  // "PARK" sign on arch
  rect(ctx, 36, 10, 24, 6, '#44774a');
  rect(ctx, 36, 10, 24, 1, '#55885a');
  // Border
  rect(ctx, 36, 10, 1, 6, '#336638');
  rect(ctx, 59, 10, 1, 6, '#336638');

  // Trees (fuller, multi-layered)
  // Left tree
  rect(ctx, 6, 34, 5, 28, '#6B4226');
  rect(ctx, 7, 34, 2, 28, '#7B5236');
  circle(ctx, 8, 28, 8, '#2d6b2f');
  circle(ctx, 8, 22, 6, '#3a8a3f');
  circle(ctx, 8, 18, 4, '#4aaa4f');
  px(ctx, 6, 16, '#5abb5f');
  px(ctx, 10, 22, '#5abb5f');
  px(ctx, 4, 26, '#226622');

  // Right tree
  rect(ctx, 83, 34, 5, 28, '#6B4226');
  rect(ctx, 84, 34, 2, 28, '#7B5236');
  circle(ctx, 86, 28, 8, '#2d6b2f');
  circle(ctx, 86, 22, 6, '#3a8a3f');
  circle(ctx, 86, 18, 4, '#4aaa4f');
  px(ctx, 84, 16, '#5abb5f');
  px(ctx, 88, 22, '#5abb5f');

  // Fence with picket tops
  for (let x = 0; x < 22; x += 5) {
    rect(ctx, x + 1, 52, 3, 14, '#8B7355');
    // Picket top (pointed)
    px(ctx, x + 2, 51, '#9B8365');
    rect(ctx, x + 1, 52, 3, 1, '#9B8365');
  }
  rect(ctx, 0, 56, 22, 2, '#a08060');
  rect(ctx, 0, 62, 22, 2, '#a08060');

  for (let x = 74; x < 96; x += 5) {
    rect(ctx, x + 1, 52, 3, 14, '#8B7355');
    px(ctx, x + 2, 51, '#9B8365');
    rect(ctx, x + 1, 52, 3, 1, '#9B8365');
  }
  rect(ctx, 74, 56, 22, 2, '#a08060');
  rect(ctx, 74, 62, 22, 2, '#a08060');

  // Flowers along path (bigger, varied)
  const flowerColors = ['#ff6688', '#ffaa44', '#ff44aa', '#ffff44', '#88aaff'];
  for (let i = 0; i < 5; i++) {
    const fx = 26 + i * 2;
    px(ctx, fx, 64, '#338833'); // stem
    px(ctx, fx, 63, flowerColors[i]);
    px(ctx, fx - 1, 63, lighten(flowerColors[i], 0.2));

    px(ctx, 68 + i * 2, 66, '#338833');
    px(ctx, 68 + i * 2, 65, flowerColors[(i + 2) % 5]);
  }

  // Butterfly near arch
  px(ctx, 42, 20, '#ff8844');
  px(ctx, 44, 20, '#ff8844');
  px(ctx, 43, 21, '#553322');
}

function drawCinema(ctx: Ctx): void {
  // Main wall — art deco style
  rect(ctx, 4, 24, 88, 68, '#3a3a5a');
  // Subtle vertical stripes for art deco
  for (let x = 8; x < 88; x += 6) {
    rect(ctx, x, 26, 1, 64, '#343454');
  }
  // Top trim
  rect(ctx, 4, 24, 88, 2, '#4a4a6a');
  rect(ctx, 4, 24, 88, 1, '#5a5a7a');

  // Marquee — deeper, more lights
  rect(ctx, 6, 10, 84, 16, '#cc2244');
  rect(ctx, 6, 10, 84, 2, '#dd3355');
  rect(ctx, 6, 24, 84, 2, '#aa1133');
  // Marquee lights (alternating colors for chase effect)
  for (let x = 8; x < 88; x += 3) {
    const bulbColor = x % 6 < 3 ? '#ffff88' : '#ffffcc';
    px(ctx, x, 12, bulbColor);
    px(ctx, x, 24, bulbColor);
  }
  // Side lights
  for (let y = 12; y < 24; y += 3) {
    px(ctx, 7, y, '#ffff88');
    px(ctx, 88, y, '#ffff88');
  }

  // "CINEMA" pixel text (more detailed)
  const cineText = [
    // C
    [20, 15], [20, 16], [20, 17], [20, 18], [21, 15], [22, 15], [21, 18], [22, 18],
    // I
    [25, 15], [25, 16], [25, 17], [25, 18],
    // N
    [28, 15], [28, 16], [28, 17], [28, 18], [29, 16], [30, 17], [31, 15], [31, 16], [31, 17], [31, 18],
    // E
    [34, 15], [34, 16], [34, 17], [34, 18], [35, 15], [36, 15], [35, 17], [35, 18], [36, 18],
    // M
    [39, 15], [39, 16], [39, 17], [39, 18], [40, 16], [41, 17], [42, 16], [43, 15], [43, 16], [43, 17], [43, 18],
    // A
    [46, 16], [46, 17], [46, 18], [47, 15], [48, 15], [49, 16], [49, 17], [49, 18], [47, 17], [48, 17],
  ];
  cineText.forEach(([x, y]) => px(ctx, x, y, '#ffddaa'));

  // Ticket booth
  rect(ctx, 34, 54, 28, 38, '#443355');
  rect(ctx, 34, 54, 28, 2, '#554466');
  // Ticket window
  rect(ctx, 38, 58, 20, 14, '#88aacc');
  rect(ctx, 38, 58, 20, 1, '#6688aa');
  // Window reflection
  rect(ctx, 40, 60, 6, 4, '#aaccee');
  // Counter
  rect(ctx, 36, 72, 24, 2, '#665577');
  // Door
  rect(ctx, 40, 76, 16, 16, '#332244');
  rect(ctx, 40, 76, 16, 1, '#443355');

  // Movie posters (with more detail)
  for (const [px_, posterColor] of [[10, '#445566'], [68, '#554455']] as const) {
    rect(ctx, px_, 32, 18, 26, '#222244');
    rect(ctx, px_ + 1, 33, 16, 24, posterColor);
    // Poster scene
    rect(ctx, px_ + 3, 36, 12, 10, lighten(posterColor, 0.2));
    // Poster title bar
    rect(ctx, px_ + 3, 48, 12, 3, darken(posterColor, 0.2));
    rect(ctx, px_ + 4, 52, 10, 2, darken(posterColor, 0.15));
    // Rating stars
    for (let s = 0; s < 3; s++) {
      px(ctx, px_ + 5 + s * 3, 55, '#ffcc44');
    }
  }

  // Decorative stars on facade
  const starPos = [[15, 28], [48, 8], [80, 28], [30, 44], [66, 44]];
  starPos.forEach(([sx, sy]) => {
    px(ctx, sx, sy, '#ffff44');
    px(ctx, sx - 1, sy, '#ffdd22');
    px(ctx, sx + 1, sy, '#ffdd22');
    px(ctx, sx, sy - 1, '#ffdd22');
    px(ctx, sx, sy + 1, '#ffdd22');
  });

  // Red carpet
  rect(ctx, 42, 88, 12, 4, '#cc2244');
  rect(ctx, 42, 88, 12, 1, '#dd3355');

  // Rope barriers
  rect(ctx, 36, 84, 2, 8, '#ccaa44');
  rect(ctx, 58, 84, 2, 8, '#ccaa44');
  rect(ctx, 36, 84, 2, 1, '#ddbb55');
  rect(ctx, 58, 84, 2, 1, '#ddbb55');
  // Rope
  for (let x = 38; x < 58; x += 2) {
    px(ctx, x, 87, '#cc4444');
  }
}

function drawMichaelsHouse(ctx: Ctx): void {
  rect(ctx, 8, 30, 80, 50, '#d4b896');
  rect(ctx, 10, 32, 76, 46, '#e0c8a8');
  rect(ctx, 4, 18, 88, 14, '#8b4513');
  rect(ctx, 8, 14, 80, 8, '#a0522d');
  rect(ctx, 16, 10, 64, 6, '#8b4513');
  rect(ctx, 20, 9, 56, 2, '#703010');
  for (let y = 14; y < 32; y += 4) {
    for (let x = 4 + ((y % 8 === 0) ? 0 : 4); x < 92; x += 8) {
      rect(ctx, x, y, 7, 1, '#7a3a10');
    }
  }
  rect(ctx, 38, 56, 20, 24, '#6a4a2a');
  rect(ctx, 40, 58, 16, 20, '#7a5a3a');
  circle(ctx, 52, 68, 2, '#ccaa44');
  rect(ctx, 36, 54, 24, 2, '#5a3a1a');
  for (const wx of [16, 66]) {
    rect(ctx, wx, 42, 16, 16, '#88bbdd');
    rect(ctx, wx + 1, 43, 14, 14, '#aaddff');
    rect(ctx, wx + 7, 43, 2, 14, '#e0c8a8');
    rect(ctx, wx + 1, 49, 14, 2, '#e0c8a8');
    rect(ctx, wx - 1, 58, 18, 2, '#c0a080');
  }
  rect(ctx, 70, 4, 10, 16, '#8a7a6a');
  rect(ctx, 69, 2, 12, 4, '#9a8a7a');
  rect(ctx, 34, 50, 28, 5, '#4a6a8a');
  rect(ctx, 35, 51, 26, 3, '#5a7a9a');
  rect(ctx, 6, 80, 84, 4, 'rgba(0,0,0,0.1)');
  rect(ctx, 34, 80, 28, 4, '#aaa');
}

export function generateBuildings(scene: Phaser.Scene): void {
  const builders: Record<string, (ctx: Ctx) => void> = {
    restaurant: drawRestaurant,
    'park-entrance': drawParkEntrance,
    cinema: drawCinema,
    'michaels-house': drawMichaelsHouse,
  };

  for (const [name, draw] of Object.entries(builders)) {
    const canvas = scene.textures.createCanvas(`building-${name}`, 96, 96);
    if (!canvas) continue;
    draw(canvas.context);
    canvas.refresh();
  }
}

// ── decorations ──────────────────────────────────────────────────────────

function drawTree(ctx: Ctx): void {
  // Trunk with bark texture
  rect(ctx, 13, 17, 6, 13, '#6B4226');
  rect(ctx, 14, 17, 2, 13, '#7B5236');
  rect(ctx, 13, 17, 1, 13, '#5a3620');
  // Bark lines
  px(ctx, 14, 20, '#5a3620');
  px(ctx, 16, 24, '#5a3620');
  px(ctx, 15, 27, '#5a3620');
  // Roots
  px(ctx, 12, 29, '#6B4226');
  px(ctx, 19, 29, '#6B4226');

  // Canopy — layered circles for organic shape
  circle(ctx, 16, 12, 8, '#2d7b2f');
  circle(ctx, 12, 10, 5, '#358535');
  circle(ctx, 20, 10, 5, '#358535');
  circle(ctx, 16, 6, 5, '#3a9a3f');
  circle(ctx, 13, 8, 3, '#4aaa4f');
  circle(ctx, 19, 7, 3, '#4aaa4f');

  // Leaf highlights
  px(ctx, 14, 3, '#5abb5f');
  px(ctx, 18, 5, '#5abb5f');
  px(ctx, 10, 9, '#5abb5f');
  px(ctx, 22, 8, '#5abb5f');
  px(ctx, 16, 7, '#6acc6f');

  // Shadow spots in canopy
  px(ctx, 11, 13, '#226622');
  px(ctx, 17, 11, '#226622');
  px(ctx, 20, 14, '#226622');

  // Ground shadow
  rect(ctx, 10, 30, 12, 1, 'rgba(0,0,0,0.1)');
}

function drawBench(ctx: Ctx): void {
  // Shadow
  rect(ctx, 6, 26, 22, 2, 'rgba(0,0,0,0.1)');

  // Legs (front visible, 3D perspective)
  rect(ctx, 5, 18, 2, 8, '#554422');
  rect(ctx, 25, 18, 2, 8, '#554422');
  rect(ctx, 5, 18, 2, 1, '#665533');
  rect(ctx, 25, 18, 2, 1, '#665533');
  // Back legs
  rect(ctx, 7, 10, 2, 16, '#554422');
  rect(ctx, 23, 10, 2, 16, '#554422');

  // Seat planks (3 planks)
  for (let i = 0; i < 3; i++) {
    rect(ctx, 4, 16 + i * 2, 24, 2, i === 0 ? '#a07a20' : '#8B6914');
    rect(ctx, 4, 16 + i * 2, 24, 1, lighten('#8B6914', 0.1));
  }

  // Back rest planks (2 planks)
  for (let i = 0; i < 2; i++) {
    rect(ctx, 7, 10 + i * 3, 18, 2, '#7B5914');
    rect(ctx, 7, 10 + i * 3, 18, 1, '#8B6914');
  }

  // Arm rests
  rect(ctx, 4, 13, 3, 5, '#6B5414');
  rect(ctx, 25, 13, 3, 5, '#6B5414');
  rect(ctx, 4, 13, 3, 1, '#7B6424');
}

function drawLamp(ctx: Ctx): void {
  // Glow circle (subtle)
  circle(ctx, 16, 6, 6, 'rgba(255,238,136,0.15)');
  circle(ctx, 16, 6, 4, 'rgba(255,238,136,0.2)');

  // Post
  rect(ctx, 15, 10, 2, 18, '#555555');
  rect(ctx, 15, 10, 1, 18, '#666666');

  // Base (wider, ornate)
  rect(ctx, 11, 28, 10, 2, '#444444');
  rect(ctx, 12, 27, 8, 1, '#555555');
  rect(ctx, 13, 26, 6, 1, '#555555');
  rect(ctx, 11, 28, 10, 1, '#4a4a4a');

  // Lamp arm
  rect(ctx, 13, 9, 6, 1, '#555555');

  // Lamp head (lantern shape)
  rect(ctx, 12, 3, 8, 7, '#776633');
  rect(ctx, 12, 3, 8, 1, '#887744');
  rect(ctx, 12, 9, 8, 1, '#665522');
  // Cap
  rect(ctx, 13, 2, 6, 1, '#887744');
  px(ctx, 15, 1, '#887744');
  px(ctx, 16, 1, '#887744');
  // Glass/light
  rect(ctx, 13, 4, 6, 5, '#ffee88');
  rect(ctx, 14, 5, 4, 3, '#ffffaa');
  // Flame
  px(ctx, 15, 6, '#ffcc44');
  px(ctx, 16, 6, '#ffcc44');
  px(ctx, 15, 5, '#ffffff');
}

function drawFence(ctx: Ctx): void {
  // Horizontal rails with highlight
  rect(ctx, 0, 12, 32, 2, '#8B7355');
  rect(ctx, 0, 12, 32, 1, '#9B8365');
  rect(ctx, 0, 22, 32, 2, '#8B7355');
  rect(ctx, 0, 22, 32, 1, '#9B8365');

  // Vertical pickets (with pointed tops)
  for (let x = 1; x < 32; x += 5) {
    rect(ctx, x, 8, 3, 18, '#7B6345');
    // Pointed top
    px(ctx, x + 1, 7, '#8B7355');
    rect(ctx, x, 8, 3, 1, '#9B8365');
    // Wood grain
    px(ctx, x + 1, 14, '#6B5335');
    px(ctx, x + 1, 19, '#6B5335');
  }
}

function drawFlower(ctx: Ctx): void {
  // Stem with curve
  rect(ctx, 15, 16, 2, 12, '#338833');
  px(ctx, 14, 18, '#338833');
  // Leaves (more detailed)
  rect(ctx, 11, 20, 4, 2, '#44aa44');
  px(ctx, 11, 20, '#55bb55');
  rect(ctx, 17, 22, 4, 2, '#44aa44');
  px(ctx, 20, 22, '#55bb55');
  // Leaf veins
  px(ctx, 12, 21, '#338833');
  px(ctx, 19, 23, '#338833');

  // Petals (5-petal flower)
  const pc = '#ff6688';
  const pl = '#ff88aa';
  // Top petal
  rect(ctx, 14, 8, 4, 3, pc);
  rect(ctx, 15, 7, 2, 1, pl);
  // Left petal
  rect(ctx, 11, 11, 3, 4, pc);
  px(ctx, 11, 11, pl);
  // Right petal
  rect(ctx, 18, 11, 3, 4, pc);
  px(ctx, 20, 11, pl);
  // Bottom-left
  rect(ctx, 12, 15, 3, 3, pc);
  // Bottom-right
  rect(ctx, 17, 15, 3, 3, pc);

  // Center (pistil)
  rect(ctx, 14, 12, 4, 4, '#ffcc44');
  rect(ctx, 15, 13, 2, 2, '#ffdd66');
  // Pollen dots
  px(ctx, 14, 12, '#ffaa22');
  px(ctx, 17, 14, '#ffaa22');
}

function drawFountain(ctx: Ctx): void {
  // Base pool (wider, stone)
  rect(ctx, 2, 24, 28, 6, '#778899');
  rect(ctx, 1, 26, 30, 3, '#667788');
  rect(ctx, 2, 24, 28, 1, '#8899aa');
  // Pool inner (water)
  rect(ctx, 4, 25, 24, 4, '#6699bb');
  rect(ctx, 5, 26, 22, 2, '#88bbdd');
  // Water shimmer
  px(ctx, 8, 26, '#aaddff');
  px(ctx, 14, 27, '#aaddff');
  px(ctx, 20, 26, '#aaddff');

  // Center pillar (ornate)
  rect(ctx, 14, 12, 4, 14, '#aaaaaa');
  rect(ctx, 14, 12, 1, 14, '#bbbbbb');
  rect(ctx, 17, 12, 1, 14, '#999999');
  // Pillar rings
  rect(ctx, 13, 16, 6, 1, '#bbbbbb');
  rect(ctx, 13, 20, 6, 1, '#bbbbbb');

  // Top bowl
  rect(ctx, 9, 10, 14, 3, '#999999');
  rect(ctx, 9, 10, 14, 1, '#aaaaaa');
  rect(ctx, 10, 11, 12, 1, '#88bbdd'); // water in bowl

  // Water spray (animated-looking)
  // Central jet
  px(ctx, 15, 6, '#88ccff');
  px(ctx, 16, 6, '#88ccff');
  px(ctx, 15, 4, '#aaddff');
  px(ctx, 16, 4, '#aaddff');
  px(ctx, 15, 2, '#cceeff');
  px(ctx, 16, 2, '#cceeff');
  // Splash droplets
  px(ctx, 13, 5, '#88ccff');
  px(ctx, 18, 5, '#88ccff');
  px(ctx, 12, 7, '#aaddff');
  px(ctx, 19, 7, '#aaddff');
  px(ctx, 11, 9, '#88ccff');
  px(ctx, 20, 9, '#88ccff');
  // Falling water streams
  px(ctx, 13, 8, '#99ccee');
  px(ctx, 18, 8, '#99ccee');
  px(ctx, 14, 9, '#aaddff');
  px(ctx, 17, 9, '#aaddff');
}

function drawBush(ctx: Ctx): void {
  // Ground shadow
  rect(ctx, 6, 26, 20, 2, 'rgba(0,0,0,0.1)');

  // Bush body — layered circles for organic shape
  circle(ctx, 16, 18, 9, '#2d7b2f');
  circle(ctx, 10, 17, 6, '#358535');
  circle(ctx, 22, 17, 6, '#358535');
  circle(ctx, 16, 14, 6, '#3a9a3f');
  circle(ctx, 12, 16, 4, '#4aaa4f');
  circle(ctx, 20, 15, 4, '#4aaa4f');

  // Leaf highlights
  px(ctx, 14, 10, '#5abb5f');
  px(ctx, 18, 12, '#5abb5f');
  px(ctx, 8, 17, '#5abb5f');
  px(ctx, 24, 16, '#5abb5f');

  // Shadow spots
  px(ctx, 11, 20, '#226622');
  px(ctx, 19, 19, '#226622');

  // Small berries
  px(ctx, 10, 15, '#cc3344');
  px(ctx, 21, 17, '#cc3344');
  px(ctx, 15, 13, '#cc3344');
}

function drawRock(ctx: Ctx): void {
  // Shadow
  rect(ctx, 8, 26, 18, 2, 'rgba(0,0,0,0.1)');

  // Main rock shape
  rect(ctx, 8, 16, 16, 10, '#888888');
  rect(ctx, 10, 14, 12, 12, '#999999');
  rect(ctx, 9, 15, 14, 11, '#8a8a8a');

  // Top rounded
  rect(ctx, 11, 13, 10, 2, '#999999');

  // Highlight (top-left)
  rect(ctx, 11, 14, 6, 2, '#aaaaaa');
  px(ctx, 12, 15, '#bbbbbb');

  // Shadow (bottom-right)
  rect(ctx, 18, 20, 4, 4, '#777777');
  rect(ctx, 8, 24, 16, 2, '#777777');

  // Texture cracks
  px(ctx, 14, 18, '#666666');
  px(ctx, 15, 19, '#666666');
  px(ctx, 12, 21, '#777777');

  // Moss detail
  px(ctx, 10, 15, '#5a8a4f');
  px(ctx, 11, 16, '#5a8a4f');
  px(ctx, 9, 16, '#4a7a3f');
}

function drawCafeTable(ctx: Ctx): void {
  // Umbrella canopy
  rect(ctx, 4, 2, 24, 3, '#cc4444');
  rect(ctx, 2, 4, 28, 2, '#cc4444');
  rect(ctx, 4, 2, 24, 1, '#dd5555');
  // Umbrella stripes
  rect(ctx, 10, 2, 4, 4, '#ffffff');
  rect(ctx, 18, 2, 4, 4, '#ffffff');

  // Pole
  rect(ctx, 15, 6, 2, 10, '#888888');
  rect(ctx, 15, 6, 1, 10, '#999999');

  // Table top
  rect(ctx, 8, 16, 16, 2, '#8B6914');
  rect(ctx, 8, 16, 16, 1, '#9B7924');

  // Table legs
  rect(ctx, 10, 18, 2, 8, '#6B5414');
  rect(ctx, 20, 18, 2, 8, '#6B5414');

  // Chair (left)
  rect(ctx, 3, 18, 4, 6, '#554422');
  rect(ctx, 3, 14, 4, 4, '#665533');
  rect(ctx, 3, 14, 4, 1, '#776644');

  // Chair (right)
  rect(ctx, 25, 18, 4, 6, '#554422');
  rect(ctx, 25, 14, 4, 4, '#665533');
  rect(ctx, 25, 14, 4, 1, '#776644');

  // Shadow
  rect(ctx, 6, 26, 20, 2, 'rgba(0,0,0,0.08)');
}

function drawStreetSign(ctx: Ctx): void {
  // Post
  rect(ctx, 15, 10, 2, 18, '#555555');
  rect(ctx, 15, 10, 1, 18, '#666666');

  // Base
  rect(ctx, 12, 28, 8, 2, '#444444');
  rect(ctx, 13, 27, 6, 1, '#555555');

  // Sign board (arrow shape pointing right)
  rect(ctx, 8, 4, 18, 6, '#44774a');
  rect(ctx, 26, 5, 2, 4, '#44774a');
  px(ctx, 27, 6, '#44774a');
  px(ctx, 27, 7, '#44774a');
  // Top highlight
  rect(ctx, 8, 4, 18, 1, '#55885a');
  // Border
  rect(ctx, 8, 4, 1, 6, '#336638');
  rect(ctx, 8, 9, 18, 1, '#336638');

  // Text dots (representing text)
  for (let x = 11; x < 24; x += 2) {
    px(ctx, x, 6, '#ffffff');
    px(ctx, x, 7, '#dddddd');
  }
}

function drawGardenBed(ctx: Ctx): void {
  // Planter box
  rect(ctx, 4, 16, 24, 10, '#8B6914');
  rect(ctx, 4, 16, 24, 2, '#9B7924');
  rect(ctx, 4, 24, 24, 2, '#6B4904');
  // Side shading
  rect(ctx, 4, 16, 2, 10, '#7B5904');
  rect(ctx, 26, 16, 2, 10, '#7B5904');

  // Soil
  rect(ctx, 6, 14, 20, 4, '#664422');
  rect(ctx, 6, 14, 20, 1, '#775533');

  // Flowers (varied colors)
  const colors = ['#ff6688', '#ffcc44', '#ff88bb', '#88aaff', '#ff9944'];
  for (let i = 0; i < 5; i++) {
    const fx = 8 + i * 4;
    // Stem
    rect(ctx, fx, 10, 1, 4, '#338833');
    // Flower head
    rect(ctx, fx - 1, 8, 3, 2, colors[i]);
    px(ctx, fx, 7, lighten(colors[i], 0.3));
    // Leaf
    if (i % 2 === 0) px(ctx, fx + 1, 12, '#44aa44');
  }

  // Foliage base
  rect(ctx, 6, 13, 20, 2, '#44aa44');
  px(ctx, 8, 12, '#55bb55');
  px(ctx, 16, 12, '#55bb55');
  px(ctx, 22, 12, '#55bb55');

  // Shadow
  rect(ctx, 6, 26, 20, 2, 'rgba(0,0,0,0.08)');
}

export function generateDecorations(scene: Phaser.Scene): void {
  const drawFns: Record<string, (ctx: Ctx) => void> = {
    tree: drawTree,
    bench: drawBench,
    lamp: drawLamp,
    fence: drawFence,
    flower: drawFlower,
    fountain: drawFountain,
    bush: drawBush,
    rock: drawRock,
    cafeTable: drawCafeTable,
    streetSign: drawStreetSign,
    gardenBed: drawGardenBed,
  };

  for (const [name, draw] of Object.entries(drawFns)) {
    const canvas = scene.textures.createCanvas(`deco-${name}`, 32, 32);
    if (!canvas) continue;
    draw(canvas.context);
    canvas.refresh();
  }
}

// ── catch mini-game ──────────────────────────────────────────────────────

function drawPetal(ctx: Ctx): void {
  // Cherry blossom petal (more detailed)
  ctx.fillStyle = '#ffaabb';
  ctx.beginPath();
  ctx.ellipse(16, 13, 9, 6, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ff8899';
  ctx.beginPath();
  ctx.ellipse(15, 16, 7, 4, 0.3, 0, Math.PI * 2);
  ctx.fill();
  // Inner gradient
  ctx.fillStyle = '#ffccdd';
  ctx.beginPath();
  ctx.ellipse(15, 12, 4, 3, -0.2, 0, Math.PI * 2);
  ctx.fill();
  // Vein
  px(ctx, 12, 13, '#ee7799');
  px(ctx, 14, 14, '#ee7799');
  px(ctx, 16, 15, '#ee7799');
  // Highlight
  px(ctx, 13, 10, '#ffddee');
  px(ctx, 14, 9, '#fff0f5');
}

function drawLeaf(ctx: Ctx): void {
  // Leaf shape (more detailed)
  ctx.fillStyle = '#55aa55';
  ctx.beginPath();
  ctx.ellipse(16, 15, 11, 7, 0.4, 0, Math.PI * 2);
  ctx.fill();
  // Darker edge
  ctx.fillStyle = '#449944';
  ctx.beginPath();
  ctx.ellipse(17, 17, 9, 5, 0.4, 0, Math.PI * 2);
  ctx.fill();
  // Inner lighter area
  ctx.fillStyle = '#66bb66';
  ctx.beginPath();
  ctx.ellipse(14, 13, 6, 3, 0.3, 0, Math.PI * 2);
  ctx.fill();
  // Central vein
  for (let i = 0; i < 8; i++) {
    px(ctx, 10 + i * 2, 14 + Math.round(Math.sin(i * 0.5) * 1), '#44884a');
  }
  // Side veins
  px(ctx, 12, 12, '#44884a');
  px(ctx, 16, 12, '#44884a');
  px(ctx, 14, 17, '#44884a');
  px(ctx, 18, 16, '#44884a');
  // Highlight
  px(ctx, 12, 11, '#77cc77');
  px(ctx, 22, 13, '#77cc77');
}

function drawButterfly(ctx: Ctx): void {
  // Body (segmented)
  rect(ctx, 15, 11, 2, 10, '#553322');
  px(ctx, 15, 11, '#664433');
  px(ctx, 16, 11, '#664433');

  // Left upper wing
  rect(ctx, 6, 9, 9, 7, '#ff7744');
  rect(ctx, 4, 11, 4, 5, '#ff6633');
  rect(ctx, 8, 10, 5, 5, '#ffaa66');
  // Wing pattern
  rect(ctx, 7, 11, 3, 3, '#ffcc88');
  px(ctx, 9, 12, '#ffffff');
  px(ctx, 5, 13, '#222');

  // Right upper wing
  rect(ctx, 17, 9, 9, 7, '#ff7744');
  rect(ctx, 24, 11, 4, 5, '#ff6633');
  rect(ctx, 19, 10, 5, 5, '#ffaa66');
  rect(ctx, 22, 11, 3, 3, '#ffcc88');
  px(ctx, 22, 12, '#ffffff');
  px(ctx, 26, 13, '#222');

  // Lower wings (smaller)
  rect(ctx, 8, 16, 7, 5, '#ff9955');
  rect(ctx, 17, 16, 7, 5, '#ff9955');
  rect(ctx, 9, 17, 4, 3, '#ffbb77');
  rect(ctx, 19, 17, 4, 3, '#ffbb77');

  // Wing edges
  px(ctx, 6, 9, '#dd5522');
  px(ctx, 25, 9, '#dd5522');

  // Antennae (curved)
  px(ctx, 14, 10, '#553322');
  px(ctx, 13, 9, '#553322');
  px(ctx, 12, 8, '#553322');
  px(ctx, 11, 7, '#664433');
  px(ctx, 17, 10, '#553322');
  px(ctx, 18, 9, '#553322');
  px(ctx, 19, 8, '#553322');
  px(ctx, 20, 7, '#664433');
}

export function generateCatchItems(scene: Phaser.Scene): void {
  const drawFns: Record<string, (ctx: Ctx) => void> = {
    petal: drawPetal,
    leaf: drawLeaf,
    butterfly: drawButterfly,
  };

  for (const [name, draw] of Object.entries(drawFns)) {
    const canvas = scene.textures.createCanvas(`catch-${name}`, 32, 32);
    if (!canvas) continue;
    draw(canvas.context);
    canvas.refresh();
  }

  // Basket (more detailed wicker)
  const basket = scene.textures.createCanvas('catch-basket', 64, 32);
  if (basket) {
    const ctx = basket.context;

    // Basket shape (tapered)
    rect(ctx, 10, 8, 44, 22, '#8B5A2B');
    rect(ctx, 8, 12, 48, 16, '#8B5A2B');

    // Weave pattern (alternating horizontal/vertical)
    for (let y = 10; y < 28; y += 3) {
      for (let x = 10; x < 52; x += 4) {
        const isOffset = Math.floor(y / 3) % 2 === 0;
        rect(ctx, x + (isOffset ? 2 : 0), y, 3, 2, '#7B4A1B');
      }
    }

    // Lighter weave highlights
    for (let y = 11; y < 28; y += 6) {
      for (let x = 12; x < 50; x += 8) {
        rect(ctx, x, y, 2, 1, '#9B6A3B');
      }
    }

    // Rim (thick, highlighted)
    rect(ctx, 6, 6, 52, 4, '#9B6A3B');
    rect(ctx, 6, 6, 52, 1, '#b08040');
    rect(ctx, 7, 7, 50, 1, '#a07030');

    // Inner shadow
    rect(ctx, 12, 10, 40, 2, '#6B3A1B');

    // Handle
    rect(ctx, 26, 2, 12, 4, '#8B5A2B');
    rect(ctx, 24, 4, 4, 4, '#8B5A2B');
    rect(ctx, 36, 4, 4, 4, '#8B5A2B');
    rect(ctx, 26, 2, 12, 1, '#9B6A3B');

    // Bottom shadow
    rect(ctx, 10, 28, 44, 2, '#6B3A1B');

    basket.refresh();
  }
}

// ── match mini-game ──────────────────────────────────────────────────────

export function generateMatchCards(scene: Phaser.Scene): void {
  // Card back (richer design)
  const back = scene.textures.createCanvas('card-back', 64, 80);
  if (back) {
    const ctx = back.context;
    // Outer border
    rect(ctx, 0, 0, 64, 80, '#5b3e7a');
    // Card body
    rect(ctx, 2, 2, 60, 76, '#6b4e8a');
    // Inner border
    rect(ctx, 4, 4, 56, 72, '#7b5ea7');
    // Decorative frame
    rect(ctx, 6, 6, 52, 68, '#6b4e8a');

    // Diamond grid pattern
    for (let y = 10; y < 70; y += 6) {
      for (let x = 10; x < 54; x += 6) {
        px(ctx, x + 2, y, '#8b6ec7');
        px(ctx, x, y + 2, '#8b6ec7');
        px(ctx, x + 4, y + 2, '#8b6ec7');
        px(ctx, x + 2, y + 4, '#8b6ec7');
      }
    }

    // Center ornament
    rect(ctx, 26, 34, 12, 12, '#d4a574');
    rect(ctx, 28, 36, 8, 8, '#e4b584');
    rect(ctx, 30, 38, 4, 4, '#f4c594');
    // Corner ornaments
    for (const [cx, cy] of [[10, 10], [50, 10], [10, 66], [50, 66]]) {
      rect(ctx, cx, cy, 4, 4, '#9b7ec7');
      px(ctx, cx + 1, cy + 1, '#ab8ed7');
    }

    // Question mark (pixel art)
    rect(ctx, 29, 36, 6, 1, '#fff');
    rect(ctx, 34, 37, 2, 2, '#fff');
    rect(ctx, 32, 39, 3, 1, '#fff');
    rect(ctx, 31, 40, 2, 2, '#fff');
    px(ctx, 31, 43, '#fff');

    back.refresh();
  }

  // Match icons — detailed pixel art versions
  const iconDrawers: Array<(ctx: Ctx) => void> = [
    // Popcorn
    (ctx) => {
      rect(ctx, 0, 0, 64, 80, '#fdf6e3');
      // Box (tapered)
      ctx.fillStyle = '#cc3333';
      ctx.beginPath();
      ctx.moveTo(16, 40); ctx.lineTo(20, 70); ctx.lineTo(44, 70); ctx.lineTo(48, 40);
      ctx.fill();
      // Stripes
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(22, 40); ctx.lineTo(24, 70); ctx.lineTo(27, 70); ctx.lineTo(25, 40);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(30, 40); ctx.lineTo(31, 70); ctx.lineTo(34, 70); ctx.lineTo(33, 40);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(38, 40); ctx.lineTo(38, 70); ctx.lineTo(41, 70); ctx.lineTo(41, 40);
      ctx.fill();
      // Box top rim
      rect(ctx, 15, 38, 34, 3, '#dd4444');
      // Popcorn kernels (fluffy clusters)
      const kernels = [[22, 28], [28, 24], [34, 22], [40, 26], [26, 32], [34, 30], [20, 34], [38, 34], [30, 18], [32, 28]];
      kernels.forEach(([kx, ky]) => {
        circle(ctx, kx, ky, 4, '#fff8dc');
        circle(ctx, kx - 1, ky - 1, 2, '#fffaed');
        px(ctx, kx, ky, '#f0dca0');
      });
    },
    // Clapperboard
    (ctx) => {
      rect(ctx, 0, 0, 64, 80, '#fdf6e3');
      // Board body
      rect(ctx, 10, 36, 44, 28, '#222');
      rect(ctx, 12, 38, 40, 24, '#333');
      // Clapper top (angled)
      rect(ctx, 10, 22, 44, 16, '#222');
      // Diagonal stripes on clapper
      for (let x = 10; x < 54; x += 8) {
        const isWhite = ((x - 10) / 8) % 2 === 0;
        ctx.fillStyle = isWhite ? '#fff' : '#222';
        ctx.beginPath();
        ctx.moveTo(x, 22); ctx.lineTo(x + 8, 22);
        ctx.lineTo(x + 5, 36); ctx.lineTo(x - 3, 36);
        ctx.fill();
      }
      // Hinge
      rect(ctx, 8, 34, 48, 3, '#444');
      circle(ctx, 10, 35, 2, '#666');
      // Text lines on board
      rect(ctx, 16, 42, 22, 2, '#555');
      rect(ctx, 16, 48, 32, 2, '#555');
      rect(ctx, 16, 54, 18, 2, '#555');
      // "SCENE" label
      rect(ctx, 16, 39, 14, 2, '#888');
    },
    // Ticket
    (ctx) => {
      rect(ctx, 0, 0, 64, 80, '#fdf6e3');
      // Ticket body with perforated edge
      rect(ctx, 6, 22, 52, 36, '#ff7744');
      rect(ctx, 6, 22, 52, 2, '#ff9966');
      // Perforated line
      for (let y = 24; y < 56; y += 3) {
        px(ctx, 42, y, '#fdf6e3');
      }
      // Stub section
      rect(ctx, 42, 22, 16, 36, '#ff8855');
      // Star emblem
      const sx = 22, sy = 34;
      rect(ctx, sx, sy, 8, 8, '#ffdd44');
      px(ctx, sx + 3, sy - 2, '#ffdd44');
      px(ctx, sx + 4, sy - 2, '#ffdd44');
      px(ctx, sx - 2, sy + 3, '#ffdd44');
      px(ctx, sx - 2, sy + 4, '#ffdd44');
      px(ctx, sx + 9, sy + 3, '#ffdd44');
      px(ctx, sx + 9, sy + 4, '#ffdd44');
      px(ctx, sx + 3, sy + 9, '#ffdd44');
      px(ctx, sx + 4, sy + 9, '#ffdd44');
      rect(ctx, sx + 2, sy + 2, 4, 4, '#ffee66');
      // "ADMIT ONE" text area
      rect(ctx, 12, 24, 24, 4, '#ffffcc');
      rect(ctx, 14, 48, 20, 3, '#ffffcc');
      // Stub number
      rect(ctx, 44, 30, 10, 3, '#ffffcc');
    },
    // Camera/Projector
    (ctx) => {
      rect(ctx, 0, 0, 64, 80, '#fdf6e3');
      // Camera body
      rect(ctx, 12, 32, 34, 26, '#444');
      rect(ctx, 12, 32, 34, 2, '#555');
      rect(ctx, 12, 56, 34, 2, '#333');
      // Grip/texture
      rect(ctx, 14, 34, 2, 22, '#3a3a3a');
      // Lens housing
      circle(ctx, 30, 44, 10, '#333');
      circle(ctx, 30, 44, 8, '#444');
      circle(ctx, 30, 44, 6, '#222');
      circle(ctx, 30, 44, 4, '#88aacc');
      circle(ctx, 30, 44, 2, '#aaccee');
      px(ctx, 29, 42, '#cceeff');
      // Flash
      rect(ctx, 14, 28, 8, 6, '#666');
      rect(ctx, 15, 29, 6, 4, '#aaa');
      rect(ctx, 16, 30, 4, 2, '#ffee88');
      // Viewfinder
      rect(ctx, 36, 28, 8, 5, '#555');
      rect(ctx, 37, 29, 6, 3, '#334');
      // Strap loop
      rect(ctx, 44, 38, 4, 2, '#888');
    },
    // Star
    (ctx) => {
      rect(ctx, 0, 0, 64, 80, '#fdf6e3');
      // 5-pointed star (drawn with triangles)
      ctx.fillStyle = '#ffcc00';
      ctx.beginPath();
      const cx = 32, cy = 40, outerR = 20, innerR = 8;
      for (let i = 0; i < 5; i++) {
        const outerAngle = (i * 72 - 90) * Math.PI / 180;
        const innerAngle = ((i * 72 + 36) - 90) * Math.PI / 180;
        if (i === 0) ctx.moveTo(cx + Math.cos(outerAngle) * outerR, cy + Math.sin(outerAngle) * outerR);
        else ctx.lineTo(cx + Math.cos(outerAngle) * outerR, cy + Math.sin(outerAngle) * outerR);
        ctx.lineTo(cx + Math.cos(innerAngle) * innerR, cy + Math.sin(innerAngle) * innerR);
      }
      ctx.closePath();
      ctx.fill();
      // Highlight
      ctx.fillStyle = '#ffdd44';
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const outerAngle = (i * 72 - 90) * Math.PI / 180;
        const innerAngle = ((i * 72 + 36) - 90) * Math.PI / 180;
        if (i === 0) ctx.moveTo(cx + Math.cos(outerAngle) * (outerR - 4), cy + Math.sin(outerAngle) * (outerR - 4));
        else ctx.lineTo(cx + Math.cos(outerAngle) * (outerR - 4), cy + Math.sin(outerAngle) * (outerR - 4));
        ctx.lineTo(cx + Math.cos(innerAngle) * (innerR - 2), cy + Math.sin(innerAngle) * (innerR - 2));
      }
      ctx.closePath();
      ctx.fill();
      // Sparkle
      px(ctx, 32, 36, '#ffffff');
      px(ctx, 30, 38, '#ffffaa');
      // Small sparkles around
      px(ctx, 14, 24, '#ffee88');
      px(ctx, 50, 28, '#ffee88');
      px(ctx, 18, 58, '#ffee88');
      px(ctx, 48, 56, '#ffee88');
    },
    // Theater masks
    (ctx) => {
      rect(ctx, 0, 0, 64, 80, '#fdf6e3');

      // Comedy mask (front, warm)
      // Face shape
      circle(ctx, 22, 38, 14, '#ffdd88');
      rect(ctx, 10, 38, 24, 14, '#ffdd88');
      // Forehead highlight
      rect(ctx, 16, 26, 12, 3, '#ffee99');
      // Eyes (happy, arched)
      rect(ctx, 14, 34, 5, 3, '#222');
      rect(ctx, 23, 34, 5, 3, '#222');
      px(ctx, 15, 34, '#fff');
      px(ctx, 24, 34, '#fff');
      // Eyebrows (raised)
      rect(ctx, 14, 32, 5, 1, '#cc9933');
      rect(ctx, 23, 32, 5, 1, '#cc9933');
      // Smile (wide)
      rect(ctx, 16, 44, 12, 3, '#cc4444');
      rect(ctx, 14, 42, 2, 2, '#cc4444');
      rect(ctx, 26, 42, 2, 2, '#cc4444');
      rect(ctx, 17, 45, 10, 1, '#aa2222');
      // Cheeks
      circle(ctx, 13, 42, 2, '#ffaa88');
      circle(ctx, 29, 42, 2, '#ffaa88');

      // Tragedy mask (behind, offset, cool)
      circle(ctx, 42, 40, 13, '#aabbcc');
      rect(ctx, 31, 40, 22, 12, '#aabbcc');
      rect(ctx, 36, 28, 12, 3, '#bbccdd');
      // Eyes (sad, downward)
      rect(ctx, 36, 36, 4, 3, '#334');
      rect(ctx, 44, 36, 4, 3, '#334');
      // Sad eyebrows
      rect(ctx, 35, 34, 2, 1, '#778899');
      rect(ctx, 37, 33, 3, 1, '#778899');
      rect(ctx, 47, 34, 2, 1, '#778899');
      rect(ctx, 44, 33, 3, 1, '#778899');
      // Frown
      rect(ctx, 38, 48, 8, 2, '#556677');
      rect(ctx, 36, 50, 2, 2, '#556677');
      rect(ctx, 46, 50, 2, 2, '#556677');

      // Ribbons connecting masks
      px(ctx, 28, 26, '#cc4444');
      px(ctx, 30, 25, '#cc4444');
      px(ctx, 32, 26, '#4466cc');
      px(ctx, 34, 25, '#4466cc');
    },
  ];

  iconDrawers.forEach((draw, i) => {
    const canvas = scene.textures.createCanvas(`match-icon-${i}`, 64, 80);
    if (!canvas) return;
    draw(canvas.context);
    canvas.refresh();
  });
}

// ── sky (procedural) ─────────────────────────────────────────────────────

export function generateSky(scene: Phaser.Scene): void {
  const canvas = scene.textures.createCanvas('sky', 1, 256);
  if (!canvas) return;
  const ctx = canvas.context;
  const grad = ctx.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, '#87CEEB');
  grad.addColorStop(0.6, '#B0D8F0');
  grad.addColorStop(1, '#E8F4FF');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1, 256);
  canvas.refresh();
}

// ── master generator ─────────────────────────────────────────────────────

export function generateAllTextures(scene: Phaser.Scene): void {
  generateTerrain(scene);
  generateInteriorTerrain(scene);
  generateInteriorFurniture(scene);
  generateCharacterOutfits(scene);
  generateNPCs(scene);
  generateBuildings(scene);
  generateDecorations(scene);
  generateCatchItems(scene);
  generateMatchCards(scene);
  generateSky(scene);
  generateAirportTextures(scene);
  generateMauiTextures(scene);
}
