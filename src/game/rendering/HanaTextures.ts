// src/game/rendering/HanaTextures.ts
// Generates Hana area textures: decorations and NPCs

type Ctx = CanvasRenderingContext2D;

function px(ctx: Ctx, x: number, y: number, color: string): void {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, 1, 1);
}

function rect(ctx: Ctx, x: number, y: number, w: number, h: number, color: string): void {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

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

// ── Decorations ─────────────────────────────────────────────────────────

function generateWaterfallDeco(scene: Phaser.Scene): void {
  const c = scene.textures.createCanvas('deco-waterfall', 64, 96);
  if (!c) return;
  const ctx = c.context;

  // Gray cliff face (y=0-40)
  rect(ctx, 0, 0, 64, 40, '#808080');
  rect(ctx, 0, 0, 16, 40, '#707070');
  rect(ctx, 48, 0, 16, 40, '#707070');
  rect(ctx, 20, 5, 8, 12, '#6a6a6a');
  rect(ctx, 36, 10, 10, 8, '#6a6a6a');
  rect(ctx, 8, 20, 6, 10, '#6a6a6a');
  rect(ctx, 50, 22, 7, 9, '#6a6a6a');

  // Waterfall opening in cliff
  rect(ctx, 24, 0, 16, 40, '#5588aa');

  // Cascading water (y=20-80) — vertical blue stripes with white highlights
  for (let y = 20; y < 80; y++) {
    for (let x = 22; x < 42; x++) {
      const stripe = (x - 22) % 4;
      if (stripe === 0) {
        ctx.fillStyle = '#aad4f0';
      } else if (stripe === 1) {
        ctx.fillStyle = '#5599cc';
      } else if (stripe === 2) {
        ctx.fillStyle = '#4488bb';
      } else {
        ctx.fillStyle = '#88bbdd';
      }
      ctx.fillRect(x, y, 1, 1);
    }
    // White highlight lines every 6px
    if ((y - 20) % 6 === 0) {
      rect(ctx, 24, y, 2, 2, '#ddeeff');
      rect(ctx, 30, y + 2, 2, 2, '#ddeeff');
      rect(ctx, 36, y + 1, 2, 2, '#ddeeff');
    }
  }

  // Side cliff walls alongside water
  rect(ctx, 0, 20, 22, 60, '#707070');
  rect(ctx, 42, 20, 22, 60, '#707070');
  rect(ctx, 4, 30, 8, 20, '#6a6a6a');
  rect(ctx, 52, 35, 6, 18, '#6a6a6a');

  // Foam pool at bottom (y=70-96)
  rect(ctx, 0, 70, 64, 26, '#5599cc');
  // Foam bubbles
  for (let i = 0; i < 12; i++) {
    const fx = 4 + i * 5;
    const fy = 74 + (i % 3) * 5;
    circle(ctx, fx, fy, 2, '#ddeeff');
  }
  rect(ctx, 20, 72, 24, 4, '#bbddff');
  rect(ctx, 22, 76, 20, 3, '#cceeff');

  c.refresh();
}

function generateBambooStalk(scene: Phaser.Scene): void {
  const c = scene.textures.createCanvas('deco-bamboo-stalk', 16, 64);
  if (!c) return;
  const ctx = c.context;

  // Background transparent (canvas default)
  // Main bamboo stalk — dark green rect
  rect(ctx, 4, 0, 8, 64, '#4a7c2e');

  // Segment lines every 10px (darker)
  for (let y = 10; y < 64; y += 10) {
    rect(ctx, 4, y, 8, 1, darken('#4a7c2e', 0.35));
    rect(ctx, 4, y + 1, 8, 1, lighten('#4a7c2e', 0.15));
  }

  // Segment shading — lighter left edge, darker right edge
  for (let y = 0; y < 64; y++) {
    px(ctx, 4, y, lighten('#4a7c2e', 0.2));
    px(ctx, 11, y, darken('#4a7c2e', 0.25));
  }

  // Small leaf tufts at top
  rect(ctx, 0, 4, 6, 2, '#5a9c3e');
  rect(ctx, 10, 8, 6, 2, '#5a9c3e');
  rect(ctx, 1, 10, 4, 2, '#4a7c2e');
  rect(ctx, 11, 2, 4, 2, '#4a7c2e');

  c.refresh();
}

function generateVolcanicRock(scene: Phaser.Scene): void {
  const c = scene.textures.createCanvas('deco-volcanic-rock', 32, 32);
  if (!c) return;
  const ctx = c.context;

  // Irregular rock shape using overlapping dark circles/rects
  circle(ctx, 16, 18, 12, '#3a3a3a');
  circle(ctx, 12, 16, 9, '#2e2e2e');
  circle(ctx, 20, 15, 8, '#333333');
  circle(ctx, 16, 12, 7, '#404040');

  // Texture variation
  rect(ctx, 8, 14, 5, 4, '#2a2a2a');
  rect(ctx, 20, 18, 4, 3, '#444444');
  rect(ctx, 14, 10, 6, 3, '#484848');
  circle(ctx, 10, 20, 3, '#252525');
  circle(ctx, 22, 12, 3, '#555555');
  circle(ctx, 18, 22, 2, '#2a2a2a');

  // Highlight edge
  for (let i = 0; i < 5; i++) {
    px(ctx, 10 + i, 8, '#555555');
  }

  c.refresh();
}

function generateHanaSign(scene: Phaser.Scene): void {
  const c = scene.textures.createCanvas('deco-hana-sign', 32, 32);
  if (!c) return;
  const ctx = c.context;

  // Brown wooden post
  rect(ctx, 14, 16, 4, 16, '#6b4e35');
  rect(ctx, 15, 16, 2, 16, darken('#6b4e35', 0.15));

  // Sign board — cream/light wood
  rect(ctx, 4, 4, 24, 14, '#c8a96e');
  rect(ctx, 4, 4, 24, 1, darken('#c8a96e', 0.2));
  rect(ctx, 4, 17, 24, 1, darken('#c8a96e', 0.2));
  rect(ctx, 4, 4, 1, 14, darken('#c8a96e', 0.2));
  rect(ctx, 27, 4, 1, 14, darken('#c8a96e', 0.2));

  // Sign board inner — slightly lighter
  rect(ctx, 6, 6, 20, 10, '#d4b878');

  // Wood grain lines on sign
  rect(ctx, 6, 8, 20, 1, darken('#d4b878', 0.1));
  rect(ctx, 6, 11, 20, 1, darken('#d4b878', 0.1));
  rect(ctx, 6, 14, 20, 1, darken('#d4b878', 0.1));

  // Post grain
  rect(ctx, 14, 18, 4, 1, darken('#6b4e35', 0.1));
  rect(ctx, 14, 22, 4, 1, darken('#6b4e35', 0.1));
  rect(ctx, 14, 26, 4, 1, darken('#6b4e35', 0.1));

  c.refresh();
}

function generateMossyRock(scene: Phaser.Scene): void {
  const c = scene.textures.createCanvas('deco-mossy-rock', 32, 32);
  if (!c) return;
  const ctx = c.context;

  // Gray rock base
  circle(ctx, 16, 18, 12, '#888888');
  circle(ctx, 13, 16, 9, '#808080');
  circle(ctx, 19, 15, 8, '#858585');
  circle(ctx, 16, 13, 7, '#909090');

  // Shading
  circle(ctx, 12, 20, 4, '#767676');
  rect(ctx, 9, 15, 4, 4, '#787878');

  // Green moss patches — small green circles on top/sides
  circle(ctx, 14, 10, 3, '#5a8c3e');
  circle(ctx, 20, 11, 2, '#4a7c2e');
  circle(ctx, 10, 14, 2, '#5a8c3e');
  circle(ctx, 18, 8, 2, '#4a7c2e');
  circle(ctx, 22, 14, 2, '#5a8c3e');
  px(ctx, 16, 9, '#6aa04e');
  px(ctx, 12, 12, '#6aa04e');

  c.refresh();
}

function generateDriftwoodHana(scene: Phaser.Scene): void {
  const c = scene.textures.createCanvas('deco-driftwood-hana', 48, 16);
  if (!c) return;
  const ctx = c.context;

  // Weathered brown wood piece — light brown base
  rect(ctx, 0, 4, 48, 8, '#b8956a');
  rect(ctx, 2, 3, 44, 10, '#b8956a');
  rect(ctx, 4, 2, 40, 12, '#c4a278');

  // Rounded ends
  rect(ctx, 0, 5, 2, 6, '#a07850');
  rect(ctx, 46, 5, 2, 6, '#a07850');

  // Darker grain lines (horizontal)
  rect(ctx, 4, 5, 40, 1, darken('#c4a278', 0.15));
  rect(ctx, 4, 7, 40, 1, darken('#c4a278', 0.12));
  rect(ctx, 4, 9, 40, 1, darken('#c4a278', 0.18));
  rect(ctx, 4, 11, 40, 1, darken('#c4a278', 0.10));

  // Lighter highlight on top edge
  rect(ctx, 4, 3, 40, 1, lighten('#c4a278', 0.2));

  // Knot detail
  circle(ctx, 16, 8, 2, darken('#c4a278', 0.25));
  circle(ctx, 34, 7, 2, darken('#c4a278', 0.2));

  c.refresh();
}

// ── NPCs ─────────────────────────────────────────────────────────────────

function generateHanaNPCs(scene: Phaser.Scene): void {
  // npc-hiker — Khaki pants, green top, hiking hat
  {
    const c = scene.textures.createCanvas('npc-hiker', 48, 48);
    if (!c) return;
    const ctx = c.context;

    const skin = '#f5deb3';
    const hair = '#6b3a1f';
    const top = '#4a7c2e';
    const pants = '#c2b280';
    const shoes = '#5c3d1e';

    // Shadow
    rect(ctx, 14, 42, 20, 4, 'rgba(0,0,0,0.15)');

    // Shoes
    rect(ctx, 17, 39, 5, 2, shoes);
    rect(ctx, 26, 39, 5, 2, shoes);

    // Legs / pants
    rect(ctx, 15, 35, 8, 4, pants);
    rect(ctx, 25, 35, 8, 4, pants);

    // Body / top
    rect(ctx, 14, 19, 20, 16, top);

    // Arms
    rect(ctx, 10, 24, 4, 10, top);
    rect(ctx, 34, 24, 4, 10, top);

    // Hands
    rect(ctx, 10, 34, 3, 2, skin);
    rect(ctx, 35, 34, 3, 2, skin);

    // Head
    rect(ctx, 19, 7, 10, 11, skin);
    rect(ctx, 18, 8, 12, 9, skin);

    // Hair
    rect(ctx, 18, 5, 12, 4, hair);
    rect(ctx, 19, 4, 10, 2, hair);
    px(ctx, 18, 9, hair);
    px(ctx, 29, 9, hair);

    // Eyes
    rect(ctx, 19, 12, 3, 3, '#fff');
    rect(ctx, 26, 12, 3, 3, '#fff');
    px(ctx, 20, 12, '#334');
    px(ctx, 21, 12, '#334');
    px(ctx, 27, 12, '#334');
    px(ctx, 28, 12, '#334');

    // Mouth
    rect(ctx, 22, 16, 4, 1, '#c88');

    // Hiking hat — brown rect above head
    rect(ctx, 17, 2, 14, 3, '#8b6340');
    rect(ctx, 15, 4, 18, 2, '#8b6340');

    c.refresh();
  }

  // npc-trail-guide — Ranger outfit: brown pants, khaki top, badge
  {
    const c = scene.textures.createCanvas('npc-trail-guide', 48, 48);
    if (!c) return;
    const ctx = c.context;

    const skin = '#f5deb3';
    const hair = '#2a1a0a';
    const top = '#c2b280';
    const pants = '#6b4e35';
    const shoes = '#3a2510';

    // Shadow
    rect(ctx, 14, 42, 20, 4, 'rgba(0,0,0,0.15)');

    // Shoes
    rect(ctx, 17, 39, 5, 2, shoes);
    rect(ctx, 26, 39, 5, 2, shoes);

    // Legs / pants
    rect(ctx, 15, 35, 8, 4, pants);
    rect(ctx, 25, 35, 8, 4, pants);

    // Body / top
    rect(ctx, 14, 19, 20, 16, top);

    // Arms
    rect(ctx, 10, 24, 4, 10, top);
    rect(ctx, 34, 24, 4, 10, top);

    // Hands
    rect(ctx, 10, 34, 3, 2, skin);
    rect(ctx, 35, 34, 3, 2, skin);

    // Head
    rect(ctx, 19, 7, 10, 11, skin);
    rect(ctx, 18, 8, 12, 9, skin);

    // Hair
    rect(ctx, 18, 5, 12, 4, hair);
    rect(ctx, 19, 4, 10, 2, hair);
    px(ctx, 18, 9, hair);
    px(ctx, 29, 9, hair);

    // Eyes
    rect(ctx, 19, 12, 3, 3, '#fff');
    rect(ctx, 26, 12, 3, 3, '#fff');
    px(ctx, 20, 12, '#334');
    px(ctx, 21, 12, '#334');
    px(ctx, 27, 12, '#334');
    px(ctx, 28, 12, '#334');

    // Mouth
    rect(ctx, 22, 16, 4, 1, '#c88');

    // Badge — small yellow rect on chest
    rect(ctx, 20, 22, 4, 3, '#f5c518');
    rect(ctx, 21, 23, 2, 1, '#c8a000');

    c.refresh();
  }

  // npc-geologist — Blue top, gray pants, clipboard detail
  {
    const c = scene.textures.createCanvas('npc-geologist', 48, 48);
    if (!c) return;
    const ctx = c.context;

    const skin = '#f5deb3';
    const hair = '#6b3a1f';
    const top = '#4682b4';
    const pants = '#808080';
    const shoes = '#443322';

    // Shadow
    rect(ctx, 14, 42, 20, 4, 'rgba(0,0,0,0.15)');

    // Shoes
    rect(ctx, 17, 39, 5, 2, shoes);
    rect(ctx, 26, 39, 5, 2, shoes);

    // Legs / pants
    rect(ctx, 15, 35, 8, 4, pants);
    rect(ctx, 25, 35, 8, 4, pants);

    // Body / top
    rect(ctx, 14, 19, 20, 16, top);

    // Arms
    rect(ctx, 10, 24, 4, 10, top);
    rect(ctx, 34, 24, 4, 10, top);

    // Hands
    rect(ctx, 10, 34, 3, 2, skin);
    rect(ctx, 35, 34, 3, 2, skin);

    // Clipboard — white rect in right hand area
    rect(ctx, 34, 26, 5, 6, '#f0f0f0');
    rect(ctx, 35, 27, 3, 4, '#e0e0e0');
    rect(ctx, 35, 27, 3, 1, '#aaaaaa');

    // Head
    rect(ctx, 19, 7, 10, 11, skin);
    rect(ctx, 18, 8, 12, 9, skin);

    // Hair
    rect(ctx, 18, 5, 12, 4, hair);
    rect(ctx, 19, 4, 10, 2, hair);
    px(ctx, 18, 9, hair);
    px(ctx, 29, 9, hair);

    // Eyes
    rect(ctx, 19, 12, 3, 3, '#fff');
    rect(ctx, 26, 12, 3, 3, '#fff');
    px(ctx, 20, 12, '#334');
    px(ctx, 21, 12, '#334');
    px(ctx, 27, 12, '#334');
    px(ctx, 28, 12, '#334');

    // Mouth
    rect(ctx, 22, 16, 4, 1, '#c88');

    c.refresh();
  }
}

// ── Main export ──────────────────────────────────────────────────────────

export function generateHanaTextures(scene: Phaser.Scene): void {
  generateWaterfallDeco(scene);
  generateBambooStalk(scene);
  generateVolcanicRock(scene);
  generateHanaSign(scene);
  generateMossyRock(scene);
  generateDriftwoodHana(scene);
  generateHanaNPCs(scene);
}
